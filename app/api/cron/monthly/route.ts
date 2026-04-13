import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchGA4Data } from '@/lib/ga4';
import { fetchSEOData } from '@/lib/dataforseo';
import { generateReport } from '@/lib/claude';
import { buildEmailSubject, buildEmailBody, sendReminderEmail } from '@/lib/sendgrid';
import { Customer, Service, CustomerKeyword, CustomerCompetitor, CustomerPage, MonthlyMemo, Report } from '@/lib/types';
export async function GET(request: NextRequest) {
  // Cron secret認証
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // 対象月（前月）を算出
  const now = new Date();
  const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const yearMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  // アクティブ顧客取得
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('is_active', true);

  if (!customers || customers.length === 0) {
    return NextResponse.json({ message: 'No active customers' });
  }

  // サービスマスタ取得
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('priority');

  const results = { success: 0, error: 0, l3Count: 0, errors: [] as string[] };

  for (const customer of customers as Customer[]) {
    try {
      // 関連データ取得
      const [keywordsRes, competitorsRes, pagesRes, memoRes, lastReportRes] = await Promise.all([
        supabase.from('customer_keywords').select('*').eq('customer_id', customer.id),
        supabase.from('customer_competitors').select('*').eq('customer_id', customer.id),
        supabase.from('customer_pages').select('*').eq('customer_id', customer.id),
        supabase.from('monthly_memos').select('*').eq('customer_id', customer.id).eq('year_month', yearMonth).maybeSingle(),
        supabase.from('reports').select('proposed_services').eq('customer_id', customer.id)
          .eq('year_month', targetMonth === 1
            ? `${targetYear - 1}-12`
            : `${targetYear}-${String(targetMonth - 1).padStart(2, '0')}`)
          .maybeSingle(),
      ]);

      const keywords = (keywordsRes.data || []) as CustomerKeyword[];
      const competitors = (competitorsRes.data || []) as CustomerCompetitor[];
      const pages = (pagesRes.data || []) as CustomerPage[];
      const memo = memoRes.data as MonthlyMemo | null;
      const lastReport = lastReportRes.data as Pick<Report, 'proposed_services'> | null;

      // GA4データ取得（3回リトライ）
      let ga4Data;
      for (let i = 0; i < 3; i++) {
        try {
          ga4Data = await fetchGA4Data(customer.ga4_property_id, customer.ga4_conversion_event, targetYear, targetMonth);
          break;
        } catch (e) {
          if (i === 2) throw e;
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
        }
      }

      // SEOデータ取得（3回リトライ）
      let seoData;
      for (let i = 0; i < 3; i++) {
        try {
          seoData = await fetchSEOData(
            customer.domain,
            keywords.map((k) => ({ keyword: k.keyword, target_url: k.target_url })),
            competitors.map((c) => c.competitor_domain)
          );
          break;
        } catch (e) {
          if (i === 2) throw e;
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
        }
      }

      if (!ga4Data || !seoData) throw new Error('Data fetch failed');

      // 保守期間計算
      let maintenanceMonths = 0;
      if (customer.maintenance_start_date) {
        const start = new Date(customer.maintenance_start_date);
        const target = new Date(targetYear, targetMonth - 1, 1);
        maintenanceMonths = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
      }

      // Claude API でレポート生成（最大3回）
      const claudeInput = {
        company: {
          name: customer.company_name,
          contact: customer.contact_name,
          domain: customer.domain,
          industry: customer.industry,
          service_description: customer.service_description,
          busy_season: customer.busy_season,
          cv_goal_monthly: customer.cv_goal_monthly,
          maintenance_months: maintenanceMonths,
          pages,
        },
        this_month: yearMonth,
        memo: memo?.memo || null,
        exclude_services: memo?.exclude_services || [],
        last_month_services: lastReport?.proposed_services || [],
        services_master: (services || []) as Service[],
        ga4: ga4Data,
        seo: seoData,
      };

      let claudeResponse;
      let claudeRaw = '';
      for (let i = 0; i < 3; i++) {
        try {
          claudeResponse = await generateReport(claudeInput);
          break;
        } catch (e) {
          claudeRaw = e instanceof Error ? e.message : String(e);
          if (i === 2) throw new Error(`Claude generation failed: ${claudeRaw}`);
        }
      }

      if (!claudeResponse) throw new Error('Claude response empty');

      // メール生成
      const subject = buildEmailSubject(customer.company_name, yearMonth, claudeResponse.subject_suffix);
      const { html, text } = buildEmailBody(customer.contact_name, yearMonth, claudeResponse, {
        sessions: ga4Data.sessions.current,
        sessionsDiff: ga4Data.sessions.diff_pct,
        pageViews: ga4Data.page_views.current,
        pageViewsDiff: ga4Data.page_views.diff_pct,
        bounceRate: ga4Data.bounce_rate.current,
      });

      // 保存
      await supabase.from('reports').upsert({
        customer_id: customer.id,
        year_month: yearMonth,
        status: 'draft',
        alert_level: claudeResponse.alert_level,
        subject,
        body_html: html,
        body_text: text,
        ga4_data: ga4Data,
        seo_data: seoData,
        proposed_services: claudeResponse.proposals.map((p) => p.service_id),
        claude_raw: JSON.stringify(claudeResponse),
      }, { onConflict: 'customer_id,year_month' });

      results.success++;
      if (claudeResponse.alert_level === 3) results.l3Count++;
    } catch (error) {
      results.error++;
      results.errors.push(`${customer.company_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      await supabase.from('reports').upsert({
        customer_id: customer.id,
        year_month: yearMonth,
        status: 'error',
      }, { onConflict: 'customer_id,year_month' });
    }
  }

  // 管理者へ完了通知
  const notificationText = `${yearMonth}月度レポート生成が完了しました。\n\n成功: ${results.success}社\nL3アラート: ${results.l3Count}社\nエラー: ${results.error}社\n${results.errors.length > 0 ? '\nエラー詳細:\n' + results.errors.join('\n') : ''}`;
  try {
    await sendReminderEmail(process.env.SENDGRID_FROM_EMAIL || '', [notificationText]);
  } catch (e) {
    console.error('Notification email failed:', e);
  }

  return NextResponse.json(results);
}
