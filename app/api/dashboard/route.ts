export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getReportTargetMonth } from '@/lib/utils';

export async function GET() {
  const supabase = createServiceClient();

  const now = new Date();
  // レポート対象月 = 前月（4月なら3月度）
  const currentYearMonth = getReportTargetMonth(now);
  // その前月（反応確認用）
  const [y, m] = currentYearMonth.split('-').map(Number);
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const lastYearMonth = `${prevY}-${String(prevM).padStart(2, '0')}`;

  // アクティブ顧客取得
  const { data: customers } = await supabase
    .from('customers')
    .select('id, company_name')
    .eq('is_active', true)
    .order('company_name');

  if (!customers || customers.length === 0) {
    return NextResponse.json({ customers: [], unrecordedCount: 0 });
  }

  const customerIds = customers.map((c) => c.id);

  // 今月のレポート取得
  const { data: currentReports } = await supabase
    .from('reports')
    .select('id, customer_id, status, alert_level, sent_at')
    .eq('year_month', currentYearMonth)
    .in('customer_id', customerIds);

  // 先月のレポート（反応確認用）
  const { data: lastReports } = await supabase
    .from('reports')
    .select('customer_id, replied_at, converted_at')
    .eq('year_month', lastYearMonth)
    .in('customer_id', customerIds);

  // 今月のメモ
  const { data: memos } = await supabase
    .from('monthly_memos')
    .select('customer_id')
    .eq('year_month', currentYearMonth)
    .in('customer_id', customerIds);

  const reportMap = new Map((currentReports || []).map((r) => [r.customer_id, r]));
  const lastReportMap = new Map((lastReports || []).map((r) => [r.customer_id, r]));
  const memoSet = new Set((memos || []).map((m) => m.customer_id));

  // 先月送信済みで反応未記録のカウント
  let unrecordedCount = 0;
  if (now.getDate() >= 15) {
    for (const lr of lastReports || []) {
      if (!lr.replied_at && !lr.converted_at) {
        unrecordedCount++;
      }
    }
  }

  const result = customers.map((c) => {
    const report = reportMap.get(c.id);
    const lastReport = lastReportMap.get(c.id);
    return {
      id: c.id,
      company_name: c.company_name,
      alert_level: report?.alert_level || 0,
      report_id: report?.id || null,
      status: report?.status || null,
      sent_at: report?.sent_at || null,
      has_memo: memoSet.has(c.id),
      last_month_replied: !!lastReport?.replied_at,
      last_month_converted: !!lastReport?.converted_at,
    };
  });

  return NextResponse.json({ customers: result, unrecordedCount });
}
