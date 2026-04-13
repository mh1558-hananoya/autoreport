import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { fetchGA4Data } from '@/lib/ga4';
import { fetchSEOData } from '@/lib/dataforseo';
import { fetchGSCData } from '@/lib/gsc';
import { generateReport } from '@/lib/claude';
import { buildEmailSubject, buildEmailBody } from '@/lib/sendgrid';
import { Customer, Service, CustomerKeyword, CustomerCompetitor, CustomerPage, MonthlyMemo, Report } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { customerId, yearMonth } = await request.json();

    if (!customerId || !yearMonth) {
      return NextResponse.json({ error: 'Missing customerId or yearMonth' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const [year, month] = yearMonth.split('-').map(Number);

    // 顧客情報取得
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
    if (custErr || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    const cust = customer as Customer;

    // 関連データを並行取得
    const [keywordsRes, competitorsRes, pagesRes, servicesRes, memoRes, lastReportRes] =
      await Promise.all([
        supabase.from('customer_keywords').select('*').eq('customer_id', customerId),
        supabase.from('customer_competitors').select('*').eq('customer_id', customerId),
        supabase.from('customer_pages').select('*').eq('customer_id', customerId),
        supabase.from('services').select('*').eq('is_active', true).order('priority'),
        supabase
          .from('monthly_memos')
          .select('*')
          .eq('customer_id', customerId)
          .eq('year_month', yearMonth)
          .maybeSingle(),
        // 前月レポート
        supabase
          .from('reports')
          .select('proposed_services')
          .eq('customer_id', customerId)
          .eq(
            'year_month',
            month === 1
              ? `${year - 1}-12`
              : `${year}-${String(month - 1).padStart(2, '0')}`
          )
          .maybeSingle(),
      ]);

    const keywords = (keywordsRes.data || []) as CustomerKeyword[];
    const competitors = (competitorsRes.data || []) as CustomerCompetitor[];
    const pages = (pagesRes.data || []) as CustomerPage[];
    const services = (servicesRes.data || []) as Service[];
    const memo = memoRes.data as MonthlyMemo | null;
    const lastReport = lastReportRes.data as Pick<Report, 'proposed_services'> | null;

    // GA4データ取得
    let ga4Data;
    try {
      ga4Data = await fetchGA4Data(cust.ga4_property_id, cust.ga4_conversion_event, year, month);
    } catch (error) {
      console.error('GA4 fetch failed:', error);
      // レポートにエラーステータスを設定
      await supabase.from('reports').upsert({
        customer_id: customerId,
        year_month: yearMonth,
        status: 'error',
        ga4_data: null,
      }, { onConflict: 'customer_id,year_month' });
      return NextResponse.json({ error: 'GA4 data fetch failed' }, { status: 500 });
    }

    // SEOデータ取得
    let seoData;
    try {
      seoData = await fetchSEOData(
        cust.domain,
        keywords.map((k) => ({ keyword: k.keyword, target_url: k.target_url })),
        competitors.map((c) => c.competitor_domain)
      );
    } catch (error) {
      console.error('SEO fetch failed:', error);
      // DataForSEO失敗は致命的ではない、空データで続行
      seoData = { keywords: [], competitors: [] };
    }

    // Search Console データ取得
    try {
      // domainが既にURLの場合はそのまま使い、ドメインのみの場合はhttps://を付与
      const rawDomain = cust.domain.replace(/\/+$/, '');
      const siteUrl = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`;
      const gscData = await fetchGSCData(siteUrl, year, month);
      seoData.gsc = gscData;
    } catch (error) {
      console.error('GSC fetch failed:', error);
      // GSC失敗も致命的ではない
    }

    // 保守期間（月数）を計算
    let maintenanceMonths = 0;
    if (cust.maintenance_start_date) {
      const start = new Date(cust.maintenance_start_date);
      const now = new Date(year, month - 1, 1);
      maintenanceMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    }

    // Claude APIでレポート生成（最大3回試行）
    const claudeInput = {
      company: {
        name: cust.company_name,
        contact: cust.contact_name,
        domain: cust.domain,
        industry: cust.industry,
        service_description: cust.service_description,
        busy_season: cust.busy_season,
        cv_goal_monthly: cust.cv_goal_monthly,
        maintenance_months: maintenanceMonths,
        pages,
      },
      this_month: yearMonth,
      memo: memo?.memo || null,
      exclude_services: memo?.exclude_services || [],
      last_month_services: lastReport?.proposed_services || [],
      services_master: services,
      ga4: ga4Data,
      seo: seoData,
    };

    let claudeResponse;
    let claudeRaw = '';
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        claudeResponse = await generateReport(claudeInput);
        break;
      } catch (error) {
        attempts++;
        console.error(`Claude API attempt ${attempts} failed:`, error);
        if (error instanceof Error) {
          claudeRaw = error.message;
        }
        if (attempts >= maxAttempts) {
          await supabase.from('reports').upsert({
            customer_id: customerId,
            year_month: yearMonth,
            status: 'error',
            ga4_data: ga4Data,
            seo_data: seoData,
            claude_raw: claudeRaw,
          }, { onConflict: 'customer_id,year_month' });
          return NextResponse.json({ error: 'Report generation failed after retries' }, { status: 500 });
        }
      }
    }

    if (!claudeResponse) {
      return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
    }

    // メール件名・本文生成
    const subject = buildEmailSubject(cust.company_name, yearMonth, claudeResponse.subject_suffix);
    const { html, text } = buildEmailBody(
      cust.contact_name,
      yearMonth,
      claudeResponse,
      ga4Data,
      seoData.gsc?.keywords
    );

    // レポート保存
    const { data: report, error: saveErr } = await supabase
      .from('reports')
      .upsert(
        {
          customer_id: customerId,
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
        },
        { onConflict: 'customer_id,year_month' }
      )
      .select()
      .single();

    if (saveErr) {
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    return NextResponse.json({ report, claude: claudeResponse });
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
