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
              if (item.type === 'organic' && item.domain === domain) {
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

export async function fetchCompetitorAnalysis(
  domain: string,
  knownCompetitors: string[]
): Promise<SEOCompetitorData[]> {
  const data = await dataforseoFetch('/v3/dataforseo_labs/google/competitors_domain/live', [
    {
      target: domain,
      language_code: 'ja',
      location_code: 1009564,
      limit: 10,
    },
  ]);

  const competitors: SEOCompetitorData[] = [];

  if (data.tasks?.[0]?.result?.[0]?.items) {
    const items = data.tasks[0].result[0].items;

    for (const item of items) {
      const competitorDomain = item.domain;
      // 登録済みの競合ドメインか、上位の競合のみ含める
      if (
        knownCompetitors.includes(competitorDomain) ||
        competitors.length < 3
      ) {
        competitors.push({
          domain: competitorDomain,
          trend: item.avg_position < 10 ? '上昇' : '横ばい',
          rank_change: `${item.intersections || 0}keywords overlap`,
          keywords_overlap: [],
          threat_comment: `${competitorDomain}が${item.intersections || 0}個の重複キーワードで競合中`,
        });
      }
    }
  }

  return competitors;
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
