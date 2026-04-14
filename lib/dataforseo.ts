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
}

export function normalizeDomain(input: string): string {
  return input
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

export async function fetchKeywordRanks(
  keywords: { keyword: string; target_url: string | null }[],
  ownDomain: string
): Promise<SERPResult[]> {
  const normalizedOwn = normalizeDomain(ownDomain);
  const results: SERPResult[] = [];

  if (keywords.length === 0) return results;

  const tasks = keywords.map((kw) => ({
    keyword: kw.keyword,
    location_code: 1009564,
    language_code: 'ja',
    device: 'desktop',
    depth: 100,
  }));

  const data = await dataforseoFetch('/v3/serp/google/organic/live/advanced', tasks);

  if (data.tasks) {
    for (let i = 0; i < data.tasks.length; i++) {
      const task = data.tasks[i];
      const keyword = keywords[i];
      let ownRank: number | null = null;
      const topDomains: { domain: string; rank: number }[] = [];

      if (task.result) {
        for (const result of task.result) {
          if (!result.items) continue;
          for (const item of result.items) {
            if (item.type !== 'organic') continue;
            const rank = item.rank_absolute;
            const domain = normalizeDomain(item.domain || '');
            if (ownRank === null && domain === normalizedOwn) {
              ownRank = rank;
            }
            if (rank <= 20) {
              topDomains.push({ domain, rank });
            }
          }
        }
      }

      results.push({
        keyword: keyword.keyword,
        target_url: keyword.target_url,
        own_rank: ownRank,
        top_domains: topDomains,
      });
    }
  }

  return results;
}

export function extractKeywordData(serpResults: SERPResult[]): SEOKeywordData[] {
  return serpResults.map((r) => ({
    keyword: r.keyword,
    current_rank: r.own_rank,
    previous_rank: null,
    url: r.target_url || '',
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
