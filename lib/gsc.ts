import { google } from 'googleapis';
import { GSCData, GSCKeywordData, GSCPageData } from './types';

function getSearchConsoleClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  return google.searchconsole({ version: 'v1', auth });
}

function getDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

// ホスト名を正規化して比較できるようにする（プロトコル・www・末尾スラッシュ・sc-domain: を除去）
function normalizeHost(value: string): string {
  return value
    .trim()
    .replace(/^sc-domain:/i, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

/**
 * 顧客ドメインに一致する「実際にGSCへ登録済みのプロパティURL」を解決する。
 * GSCは登録プロパティと完全一致した siteUrl でしかクエリできないため、
 * www有無・末尾スラッシュ・URLプレフィックス型/ドメインプロパティ型の差異を吸収する。
 */
async function resolveSiteUrl(
  client: ReturnType<typeof google.searchconsole>,
  domainOrUrl: string
): Promise<string> {
  const target = normalizeHost(domainOrUrl);
  const res = await client.sites.list();
  const usable = (res.data.siteEntry || []).filter(
    (e) => e.siteUrl && e.permissionLevel && e.permissionLevel !== 'siteUnverifiedUser'
  );

  const matches = usable.filter((e) => normalizeHost(e.siteUrl!) === target);
  if (matches.length === 0) {
    const available = usable.map((e) => e.siteUrl).join(', ') || '（アクセス可能なサイトなし）';
    throw new Error(
      `Search Consoleに「${domainOrUrl}」に一致するプロパティが見つかりません。` +
        `サービスアカウントにプロパティを共有してください。現在アクセス可能: ${available}`
    );
  }

  // ドメインプロパティ（sc-domain:）が最も網羅的なので優先。次に登録順。
  matches.sort((a, b) => {
    const aDom = a.siteUrl!.toLowerCase().startsWith('sc-domain:') ? 0 : 1;
    const bDom = b.siteUrl!.toLowerCase().startsWith('sc-domain:') ? 0 : 1;
    return aDom - bDom;
  });
  return matches[0].siteUrl!;
}

export async function fetchGSCData(
  siteUrl: string,
  targetYear: number,
  targetMonth: number
): Promise<GSCData> {
  const client = getSearchConsoleClient();

  const current = getDateRange(targetYear, targetMonth);
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
  const previous = getDateRange(prevYear, prevMonth);

  // 登録済みプロパティのうち、ドメインに一致するものを自動解決（www有無・末尾スラッシュ差を吸収）
  const site = await resolveSiteUrl(client, siteUrl);

  const [keywordsData, pagesData, totalsData, prevTotalsData] = await Promise.all([
    fetchKeywords(client, site, current.startDate, current.endDate),
    fetchPages(client, site, current.startDate, current.endDate),
    fetchTotals(client, site, current.startDate, current.endDate),
    fetchTotals(client, site, previous.startDate, previous.endDate),
  ]);

  return {
    keywords: keywordsData,
    pages: pagesData,
    totals: totalsData,
    previous_totals: prevTotalsData,
  };
}

async function fetchKeywords(
  client: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCKeywordData[]> {
  const response = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 50,
      dataState: 'final',
    },
  });

  return (response.data.rows || []).map((row) => ({
    keyword: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: Math.round((row.ctr || 0) * 1000) / 10, // パーセント表記（小数1桁）
    position: Math.round((row.position || 0) * 10) / 10,
  }));
}

async function fetchPages(
  client: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCPageData[]> {
  const response = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 20,
      dataState: 'final',
    },
  });

  return (response.data.rows || []).map((row) => ({
    page: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    position: Math.round((row.position || 0) * 10) / 10,
  }));
}

async function fetchTotals(
  client: ReturnType<typeof google.searchconsole>,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<{ clicks: number; impressions: number; ctr: number; position: number }> {
  const response = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dataState: 'final',
    },
  });

  const row = response.data.rows?.[0];
  return {
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: Math.round((row?.ctr || 0) * 1000) / 10,
    position: Math.round((row?.position || 0) * 10) / 10,
  };
}
