import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const yearMonth = request.nextUrl.searchParams.get('yearMonth');
  if (!yearMonth) {
    return NextResponse.json({ error: 'Missing yearMonth' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('monthly_memos')
    .select('*')
    .eq('customer_id', id)
    .eq('year_month', yearMonth)
    .maybeSingle();

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { yearMonth, memo, excludeServices } = await request.json();

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('monthly_memos')
    .upsert(
      {
        customer_id: id,
        year_month: yearMonth,
        memo,
        exclude_services: excludeServices,
      },
      { onConflict: 'customer_id,year_month' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
