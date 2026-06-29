import { SEOKeywordData, SEOCompetitorData, SEOData } from './types';

const DATAFORSEO_API_BASE = 'https://api.dataforseo.com';

async function dataforseoFetch(endpoint: string, body: unknown) {
  const apiKey = process.env.DATAFORSEO_API_KEY!;
  const response = await fetch(`${DATAFORSEO_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export interface SERPResult {
  keyword: string;
  target_url: string | null;
  own_rank: number | null;
  top_domains: { domain: string; rank: number }[];
  // AIO（Google AI Overview）調査
  aio_present: boolean; // AI Overviewが表示されたか
  aio_own_cited: boolean; // AI Overviewの引用元に自社ドメインが含まれるか
  aio_references: string[]; // AI Overviewの引用元ドメイン一覧
}

export function normalizeDomain(input: string): string {
  return input
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

// 1キーワード分のSERPレスポンスを解析する。organic順位とAI Overviewを同時に読む。
function parseSerpResponse(
  keyword: { keyword: string; target_url: string | null },
  data: { tasks?: { result?: { items?: Record<string, unknown>[] }[] }[] },
  normalizedOwn: string
): SERPResult {
  let ownRank: number | null = null;
  const topDomains: { domain: string; rank: number }[] = [];
  let aioPresent = false;
  let aioOwnCited = false;
  const aioReferences: string[] = [];

  const task = data.tasks?.[0];
  for (const result of task?.result || []) {
    for (const item of result.items || []) {
      if (item.type === 'organic') {
        const rank = item.rank_absolute as number;
        const domain = normalizeDomain((item.domain as string) || '');
        if (ownRank === null && domain === normalizedOwn) {
          ownRank = rank;
        }
        if (rank <= 20) {
          topDomains.push({ domain, rank });
        }
      } else if (item.type === 'ai_overview') {
        // AI Overviewが表示された。引用元ドメインを抽出し、自社が含まれるか判定する。
        aioPresent = true;
        const references = (item.references as { domain?: string }[] | undefined) || [];
        for (const ref of references) {
          const domain = normalizeDomain(ref.domain || '');
          if (!domain) continue;
          if (!aioReferences.includes(domain)) {
            aioReferences.push(domain);
          }
          if (domain === normalizedOwn) {
            aioOwnCited = true;
          }
        }
      }
    }
  }

  return {
    keyword: keyword.keyword,
    target_url: keyword.target_url,
    own_rank: ownRank,
    top_domains: topDomains,
    aio_present: aioPresent,
    aio_own_cited: aioOwnCited,
    aio_references: aioReferences,
  };
}

export async function fetchKeywordRanks(
  keywords: { keyword: string; target_url: string | null }[],
  ownDomain: string
): Promise<SERPResult[]> {
  const normalizedOwn = normalizeDomain(ownDomain);
  if (keywords.length === 0) return [];

  // live/advanced は1リクエストにつき1キーワードのみ（複数送ると2件目以降がエラーになる）。
  // そのためキーワードごとに並列でコールする。load_async_ai_overview でAI Overview本文・引用元も同時取得。
  return Promise.all(
    keywords.map(async (kw) => {
      const task = {
        keyword: kw.keyword,
        location_code: 1009564,
        language_code: 'ja',
        device: 'desktop',
        depth: 100,
        load_async_ai_overview: true,
      };
      try {
        const data = await dataforseoFetch('/v3/serp/google/organic/live/advanced', [task]);
        return parseSerpResponse(kw, data, normalizedOwn);
      } catch (error) {
        // 1キーワードの失敗は致命的ではない。空の結果で続行する。
        console.error(`SERP取得失敗（${kw.keyword}）:`, error);
        return {
          keyword: kw.keyword,
          target_url: kw.target_url,
          own_rank: null,
          top_domains: [],
          aio_present: false,
          aio_own_cited: false,
          aio_references: [],
        };
      }
    })
  );
}

export function extractKeywordData(serpResults: SERPResult[]): SEOKeywordData[] {
  return serpResults.map((r) => ({
    keyword: r.keyword,
    current_rank: r.own_rank,
    previous_rank: null,
    url: r.target_url || '',
    aio_present: r.aio_present,
    aio_own_cited: r.aio_own_cited,
    aio_references: r.aio_references,
  }));
}

function buildThreatComment(
  keyword: string | null,
  currentRank: number | null,
  previousRank: number | null,
  rankChange: number | null
): string {
  if (currentRank === null) {
    return '今月は上位20位以内に見当たらず';
  }
  if (previousRank === null || rankChange === null) {
    return `${keyword ?? ''}で現在${currentRank}位`;
  }
  if (rankChange > 0 && currentRank <= 10) {
    return `${keyword ?? ''}で${currentRank}位に上昇中（先月比+${rankChange}）`;
  }
  if (rankChange > 0 && currentRank <= 20) {
    return `${keyword ?? ''}で${currentRank}位まで接近中`;
  }
  if (rankChange === 0) {
    return `${keyword ?? ''}で${currentRank}位で安定`;
  }
  return `${keyword ?? ''}で${currentRank}位（先月比${rankChange}）`;
}

export function extractCompetitorRanks(
  knownCompetitors: string[],
  serpResults: SERPResult[],
  previousCompetitors: SEOCompetitorData[] = []
): SEOCompetitorData[] {
  const previousMap = new Map<string, SEOCompetitorData>();
  for (const p of previousCompetitors) {
    previousMap.set(normalizeDomain(p.domain), p);
  }

  return knownCompetitors.map((rawDomain) => {
    const domain = normalizeDomain(rawDomain);

    let bestRank: number | null = null;
    let bestKeyword: string | null = null;
    const keywordsFound: string[] = [];

    for (const serp of serpResults) {
      const hit = serp.top_domains.find((d) => d.domain === domain);
      if (!hit) continue;
      keywordsFound.push(serp.keyword);
      if (bestRank === null || hit.rank < bestRank) {
        bestRank = hit.rank;
        bestKeyword = serp.keyword;
      }
    }

    const prev = previousMap.get(domain);
    const previousRank = prev?.current_rank ?? null;

    let rankChange: number | null = null;
    if (bestRank !== null && previousRank !== null) {
      rankChange = previousRank - bestRank;
    }

    let trend: SEOCompetitorData['trend'];
    if (bestRank === null) {
      trend = 'データなし';
    } else if (rankChange === null) {
      trend = 'データなし';
    } else if (rankChange > 0) {
      trend = '上昇';
    } else if (rankChange < 0) {
      trend = '下降';
    } else {
      trend = '変化なし';
    }

    return {
      domain,
      current_rank: bestRank,
      previous_rank: previousRank,
      rank_change: rankChange,
      trend,
      keywords_found: keywordsFound,
      threat_comment: buildThreatComment(bestKeyword, bestRank, previousRank, rankChange),
    };
  });
}

export async function fetchSEOData(
  domain: string,
  keywords: { keyword: string; target_url: string | null }[],
  knownCompetitors: string[],
  previousCompetitors: SEOCompetitorData[] = []
): Promise<SEOData> {
  const serpResults = await fetchKeywordRanks(keywords, domain);
  return {
    keywords: extractKeywordData(serpResults),
    competitors: extractCompetitorRanks(knownCompetitors, serpResults, previousCompetitors),
  };
}
