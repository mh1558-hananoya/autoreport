import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { buildEmailBody } from '@/lib/sendgrid';
import { ClaudeReportResponse, GA4Data } from '@/lib/types';

type RouteContext = { params: Promise<{ id: string }> };

// レポート取得
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// レポート更新
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createServiceClient();
  const body = await request.json();

  // claude_raw が更新された場合、body_html/body_text を再構築
  if (body.claude_raw && body.subject) {
    const { data: report } = await supabase
      .from('reports')
      .select('customer_id, ga4_data, year_month')
      .eq('id', id)
      .single();

    if (report) {
      const { data: customer } = await supabase
        .from('customers')
        .select('contact_name')
        .eq('id', report.customer_id)
        .single();

      if (customer) {
        const claudeData: ClaudeReportResponse = JSON.parse(body.claude_raw);
        const ga4 = report.ga4_data as GA4Data;

        const { html, text } = buildEmailBody(
          customer.contact_name,
          report.year_month,
          claudeData,
          {
            sessions: ga4?.sessions?.current || 0,
            sessionsDiff: ga4?.sessions?.diff_pct || 0,
            pageViews: ga4?.page_views?.current || 0,
            pageViewsDiff: ga4?.page_views?.diff_pct || 0,
            bounceRate: ga4?.bounce_rate?.current || 0,
          }
        );

        body.body_html = html;
        body.body_text = text;
      }
    }
  }

  const { error } = await supabase.from('reports').update(body).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
