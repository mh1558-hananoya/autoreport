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

  // sc-domain: or https:// format
  const site = siteUrl.startsWith('http') ? siteUrl : `sc-domain:${siteUrl}`;

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
