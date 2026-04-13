export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// 顧客一覧取得
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('company_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// 顧客新規作成
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('customers')
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
