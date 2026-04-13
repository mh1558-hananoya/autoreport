import { google } from 'googleapis';
import { GA4Data } from './types';

function getAnalyticsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  return google.analyticsdata({ version: 'v1beta', auth });
}

function getDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

function calcDiffPct(current: number, previous: number): number {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
}

export async function fetchGA4Data(
  propertyId: string,
  _conversionEvent: string,
  targetYear: number,
  targetMonth: number
): Promise<GA4Data> {
  const client = getAnalyticsClient();
  const property = `properties/${propertyId}`;

  const current = getDateRange(targetYear, targetMonth);
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
  const previous = getDateRange(prevYear, prevMonth);
  const lastYear = getDateRange(targetYear - 1, targetMonth);

  // 全指標を並行取得
  const [currentMetrics, previousMetrics, lastYearMetrics, currentDevices, currentChannels, previousChannels] =
    await Promise.all([
      fetchMetrics(client, property, current.startDate, current.endDate),
      fetchMetrics(client, property, previous.startDate, previous.endDate),
      fetchMetrics(client, property, lastYear.startDate, lastYear.endDate),
      fetchDevices(client, property, current.startDate, current.endDate),
      fetchChannels(client, property, current.startDate, current.endDate),
      fetchChannels(client, property, previous.startDate, previous.endDate),
    ]);

  void previousChannels; // 将来の比較用に取得だけしておく

  return {
    sessions: {
      current: currentMetrics.sessions,
      previous: previousMetrics.sessions,
      diff_pct: calcDiffPct(currentMetrics.sessions, previousMetrics.sessions),
    },
    active_users: {
      current: currentMetrics.activeUsers,
      previous: previousMetrics.activeUsers,
      diff_pct: calcDiffPct(currentMetrics.activeUsers, previousMetrics.activeUsers),
    },
    new_users: {
      current: currentMetrics.newUsers,
      previous: previousMetrics.newUsers,
      diff_pct: calcDiffPct(currentMetrics.newUsers, previousMetrics.newUsers),
    },
    page_views: {
      current: currentMetrics.pageViews,
      previous: previousMetrics.pageViews,
      diff_pct: calcDiffPct(currentMetrics.pageViews, previousMetrics.pageViews),
    },
    bounce_rate: {
      current: currentMetrics.bounceRate,
      previous: previousMetrics.bounceRate,
    },
    avg_session_duration: {
      current: currentMetrics.avgSessionDuration,
      previous: previousMetrics.avgSessionDuration,
    },
    engaged_sessions: {
      current: currentMetrics.engagedSessions,
      previous: previousMetrics.engagedSessions,
    },
    event_count: {
      current: currentMetrics.eventCount,
      previous: previousMetrics.eventCount,
    },
    channels: currentChannels,
    devices: currentDevices,
    same_period_last_year: {
      sessions: lastYearMetrics.sessions,
    },
  };
}

interface MetricsResult {
  sessions: number;
  activeUsers: number;
  newUsers: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  engagedSessions: number;
  eventCount: number;
}

async function fetchMetrics(
  client: ReturnType<typeof google.analyticsdata>,
  property: string,
  startDate: string,
  endDate: string
): Promise<MetricsResult> {
  const response = await client.properties.runReport({
    property,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'engagedSessions' },
        { name: 'eventCount' },
      ],
    },
  });

  const values = response.data.rows?.[0]?.metricValues || [];
  return {
    sessions: parseInt(values[0]?.value || '0', 10),
    activeUsers: parseInt(values[1]?.value || '0', 10),
    newUsers: parseInt(values[2]?.value || '0', 10),
    pageViews: parseInt(values[3]?.value || '0', 10),
    bounceRate: Math.round(parseFloat(values[4]?.value || '0') * 100) / 100,
    avgSessionDuration: Math.round(parseFloat(values[5]?.value || '0')),
    engagedSessions: parseInt(values[6]?.value || '0', 10),
    eventCount: parseInt(values[7]?.value || '0', 10),
  };
}

async function fetchChannels(
  client: ReturnType<typeof google.analyticsdata>,
  property: string,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const response = await client.properties.runReport({
    property,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'sessions' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    },
  });

  const rows = response.data.rows || [];
  let total = 0;
  const channels: Record<string, number> = {};

  for (const row of rows) {
    const channel = row.dimensionValues?.[0]?.value || 'unknown';
    const count = parseInt(row.metricValues?.[0]?.value || '0', 10);
    channels[channel] = count;
    total += count;
  }

  // パーセンテージに変換
  const result: Record<string, number> = {};
  for (const [ch, val] of Object.entries(channels)) {
    result[ch] = Math.round((val / (total || 1)) * 100);
  }
  return result;
}

async function fetchDevices(
  client: ReturnType<typeof google.analyticsdata>,
  property: string,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const response = await client.properties.runReport({
    property,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'sessions' }],
      dimensions: [{ name: 'deviceCategory' }],
    },
  });

  const rows = response.data.rows || [];
  let total = 0;
  const devices: Record<string, number> = {};

  for (const row of rows) {
    const device = row.dimensionValues?.[0]?.value || 'unknown';
    const count = parseInt(row.metricValues?.[0]?.value || '0', 10);
    devices[device] = count;
    total += count;
  }

  const result: Record<string, number> = {};
  for (const [d, val] of Object.entries(devices)) {
    result[d] = Math.round((val / (total || 1)) * 100);
  }
  return result;
}
