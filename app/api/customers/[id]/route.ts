import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

// 顧客詳細取得
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createServiceClient();

  const [customerRes, keywordsRes, competitorsRes, pagesRes] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('customer_keywords').select('*').eq('customer_id', id),
    supabase.from('customer_competitors').select('*').eq('customer_id', id),
    supabase.from('customer_pages').select('*').eq('customer_id', id),
  ]);

  if (customerRes.error) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json({
    customer: customerRes.data,
    keywords: keywordsRes.data || [],
    competitors: competitorsRes.data || [],
    pages: pagesRes.data || [],
  });
}

// 顧客更新
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createServiceClient();
  const body = await request.json();

  const { customer, keywords, competitors, pages } = body;

  if (customer) {
    const { error } = await supabase.from('customers').update(customer).eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (keywords) {
    await supabase.from('customer_keywords').delete().eq('customer_id', id);
    if (keywords.length > 0) {
      await supabase.from('customer_keywords').insert(
        keywords.map((k: { keyword: string; target_url?: string }) => ({
          customer_id: id,
          keyword: k.keyword,
          target_url: k.target_url || null,
        }))
      );
    }
  }

  if (competitors) {
    await supabase.from('customer_competitors').delete().eq('customer_id', id);
    if (competitors.length > 0) {
      await supabase.from('customer_competitors').insert(
        competitors.map((c: { competitor_domain: string }) => ({
          customer_id: id,
          competitor_domain: c.competitor_domain,
        }))
      );
    }
  }

  if (pages) {
    await supabase.from('customer_pages').delete().eq('customer_id', id);
    if (pages.length > 0) {
      await supabase.from('customer_pages').insert(
        pages.map((p: { url: string; purpose: string; description?: string; cv_contribution?: number }) => ({
          customer_id: id,
          url: p.url,
          purpose: p.purpose,
          description: p.description || null,
          cv_contribution: p.cv_contribution || null,
        }))
      );
    }
  }

  return NextResponse.json({ success: true });
}

// 顧客削除（論理削除）
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createServiceClient();

  const { error } = await supabase.from('customers').update({ is_active: false }).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
