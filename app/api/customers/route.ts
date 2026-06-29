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

// 顧客新規作成（対検索ワードも同時登録）
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  // keywords は customers テーブルに無い列なので分離してから挿入する
  const { keywords, ...customer } = body as {
    keywords?: { keyword: string; target_url?: string }[];
  } & Record<string, unknown>;

  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 登録時に入力された対検索ワード（AIO調査・順位追跡の対象）を保存
  if (Array.isArray(keywords)) {
    const rows = keywords
      .filter((k) => k.keyword?.trim())
      .map((k) => ({
        customer_id: data.id,
        keyword: k.keyword.trim(),
        target_url: k.target_url?.trim() || null,
      }));
    if (rows.length > 0) {
      const { error: kwError } = await supabase.from('customer_keywords').insert(rows);
      // 顧客本体は作成済み。キーワード保存失敗は致命的ではないがログに残す
      if (kwError) {
        console.error('顧客作成後のキーワード保存に失敗:', kwError.message);
      }
    }
  }

  return NextResponse.json(data, { status: 201 });
}
