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

export async function fetchKeywordRankings(
  keywords: { keyword: string; target_url: string | null }[],
  domain: string
): Promise<SEOKeywordData[]> {
  const normalizedDomain = normalizeDomain(domain);
  const results: SEOKeywordData[] = [];

  // バッチで処理（DataForSEO は配列で送信可能）
  const tasks = keywords.map((kw) => ({
    keyword: kw.keyword,
    location_code: 1009564, // 日本
    language_code: 'ja',
    device: 'desktop',
    depth: 100,
  }));

  const data = await dataforseoFetch('/v3/serp/google/organic/live/advanced', tasks);

  if (data.tasks) {
    for (let i = 0; i < data.tasks.length; i++) {
      const task = data.tasks[i];
      const keyword = keywords[i];
      let currentRank: number | null = null;

      if (task.result) {
        for (const result of task.result) {
          if (result.items) {
            for (const item of result.items) {
              if (item.type === 'organic' && normalizeDomain(item.domain) === normalizedDomain) {
                currentRank = item.rank_absolute;
                break;
              }
            }
          }
        }
      }

      results.push({
        keyword: keyword.keyword,
        current_rank: currentRank,
        previous_rank: null, // 前月のデータは前回レポートから取得
        url: keyword.target_url || '',
      });
    }
  }

  return results;
}

function normalizeDomain(input: string): string {
  return input
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

// 大手・汎用ドメインは競合として無意味なので除外
const GENERIC_DOMAINS = new Set([
  'youtube.com', 'google.com', 'google.co.jp', 'yahoo.co.jp',
  'amazon.co.jp', 'amazon.com', 'wikipedia.org', 'facebook.com',
  'twitter.com', 'x.com', 'instagram.com', 'tiktok.com',
  'note.com', 'ameblo.jp', 'hatena.ne.jp', 'hatenablog.com',
  'livedoor.jp', 'fc2.com', 'rakuten.co.jp', 'kakaku.com',
  'tabelog.com', 'hotpepper.jp', 'suumo.jp', 'indeed.com',
  'linkedin.com', 'pinterest.com', 'reddit.com',
]);

export async function fetchCompetitorAnalysis(
  domain: string,
  knownCompetitors: string[]
): Promise<SEOCompetitorData[]> {
  const normalizedKnown = knownCompetitors.map(normalizeDomain);
  const normalizedTarget = normalizeDomain(domain);

  const data = await dataforseoFetch('/v3/dataforseo_labs/google/competitors_domain/live', [
    {
      target: normalizedTarget,
      language_name: 'Japanese',
      location_name: 'Japan',
      limit: 30,
    },
  ]);

  const competitors: SEOCompetitorData[] = [];
  const autoCompetitors: SEOCompetitorData[] = [];

  if (data.tasks?.[0]?.result?.[0]?.items) {
    const items = data.tasks[0].result[0].items;

    for (const item of items) {
      const competitorDomain = item.domain;
      const normalizedCompetitor = normalizeDomain(competitorDomain);
      // 自ドメインは除外
      if (normalizedCompetitor === normalizedTarget) continue;

      const entry: SEOCompetitorData = {
        domain: competitorDomain,
        trend: item.avg_position < 10 ? '上昇' : '横ばい',
        rank_change: `${item.intersections || 0}keywords overlap`,
        keywords_overlap: [],
        threat_comment: `${competitorDomain}が${item.intersections || 0}個の重複キーワードで競合中`,
      };

      // 登録済み競合は優先的に含める
      if (normalizedKnown.includes(normalizedCompetitor)) {
        competitors.push(entry);
      } else if (!GENERIC_DOMAINS.has(normalizedCompetitor) && autoCompetitors.length < 3) {
        autoCompetitors.push(entry);
      }
    }
  }

  // API結果に含まれなかった登録済み競合も追加
  const foundKnown = new Set(competitors.map((c) => normalizeDomain(c.domain)));
  for (const known of knownCompetitors) {
    if (!foundKnown.has(normalizeDomain(known))) {
      competitors.push({
        domain: normalizeDomain(known),
        trend: '横ばい',
        rank_change: 'データ不足',
        keywords_overlap: [],
        threat_comment: `${normalizeDomain(known)}（登録済み競合・詳細データ取得不可）`,
      });
    }
  }

  // 登録済み競合 + 自動検出（合計最大5つ）
  const remaining = Math.max(0, 3 - competitors.length);
  return [...competitors, ...autoCompetitors.slice(0, remaining)];
}

export async function fetchSEOData(
  domain: string,
  keywords: { keyword: string; target_url: string | null }[],
  knownCompetitors: string[]
): Promise<SEOData> {
  const [keywordData, competitorData] = await Promise.all([
    fetchKeywordRankings(keywords, domain),
    fetchCompetitorAnalysis(domain, knownCompetitors),
  ]);

  return {
    keywords: keywordData,
    competitors: competitorData,
  };
}
