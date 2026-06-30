export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// 一括登録1件分。keywords は対検索ワードの配列（任意）
interface ImportRow {
  company_name: string;
  contact_name: string;
  email: string;
  domain: string;
  ga4_property_id: string;
  ga4_conversion_event?: string | null;
  industry?: string | null;
  busy_season?: string | null;
  service_description?: string | null;
  cv_goal_monthly?: number | null;
  maintenance_start_date?: string | null;
  keywords?: string[];
}

// ドメイン比較用の正規化（プロトコル・www・末尾スラッシュを除去して小文字化）
function normalizeDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

const REQUIRED_KEYS: (keyof ImportRow)[] = [
  'company_name',
  'contact_name',
  'email',
  'domain',
  'ga4_property_id',
];

// CSV一括登録。重複（ドメインまたはメール一致）はスキップする。
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const rows = (body?.customers ?? []) as ImportRow[];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: '登録対象の行がありません。' }, { status: 400 });
  }

  // 既存顧客のドメイン・メールを取得して重複判定の土台にする
  const { data: existing, error: fetchError } = await supabase
    .from('customers')
    .select('domain, email');
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const seenDomains = new Set<string>();
  const seenEmails = new Set<string>();
  for (const c of existing || []) {
    if (c.domain) seenDomains.add(normalizeDomain(c.domain));
    if (c.email) seenEmails.add(c.email.trim().toLowerCase());
  }

  const inserted: string[] = [];
  const skipped: { label: string; reason: string }[] = [];
  const failed: { label: string; error: string }[] = [];

  for (const row of rows) {
    const label = row.company_name?.trim() || '(会社名なし)';

    // 必須項目チェック（サーバー側の最終ガード）
    const missing = REQUIRED_KEYS.filter((k) => !String(row[k] ?? '').trim());
    if (missing.length > 0) {
      failed.push({ label, error: `必須項目が未入力です: ${missing.join('・')}` });
      continue;
    }

    const domainKey = normalizeDomain(row.domain);
    const emailKey = row.email.trim().toLowerCase();

    // 既存・バッチ内いずれかと重複していればスキップ
    if (seenDomains.has(domainKey)) {
      skipped.push({ label, reason: `ドメイン重複（${row.domain}）` });
      continue;
    }
    if (seenEmails.has(emailKey)) {
      skipped.push({ label, reason: `メール重複（${row.email}）` });
      continue;
    }

    const customer = {
      company_name: row.company_name.trim(),
      contact_name: row.contact_name.trim(),
      email: row.email.trim(),
      domain: row.domain.trim(),
      ga4_property_id: row.ga4_property_id.trim(),
      ga4_conversion_event: row.ga4_conversion_event?.trim() || 'contact',
      industry: row.industry?.trim() || null,
      busy_season: row.busy_season?.trim() || null,
      service_description: row.service_description?.trim() || null,
      cv_goal_monthly:
        row.cv_goal_monthly === null || row.cv_goal_monthly === undefined
          ? null
          : Number(row.cv_goal_monthly),
      maintenance_start_date: row.maintenance_start_date?.trim() || null,
    };

    const { data: created, error: insertError } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();

    if (insertError || !created) {
      failed.push({ label, error: insertError?.message || '登録に失敗しました。' });
      continue;
    }

    // 対検索ワード（あれば）を保存
    const keywords = (row.keywords || []).map((k) => k.trim()).filter(Boolean);
    if (keywords.length > 0) {
      const { error: kwError } = await supabase.from('customer_keywords').insert(
        keywords.map((keyword) => ({
          customer_id: created.id,
          keyword,
          target_url: null,
        }))
      );
      if (kwError) {
        // 顧客本体は登録済み。キーワード保存失敗はログのみで続行
        console.error(`キーワード保存に失敗（${label}）:`, kwError.message);
      }
    }

    // 同一バッチ内の後続行との重複も防ぐ
    seenDomains.add(domainKey);
    seenEmails.add(emailKey);
    inserted.push(label);
  }

  return NextResponse.json({
    inserted: inserted.length,
    skipped,
    failed,
  });
}
