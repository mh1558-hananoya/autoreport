'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseCsv } from '@/lib/csv';
import { PageShell, PageHeader, Card, btnPrimary, btnSecondary, linkAction } from '@/components/ui/kit';

// CSVのヘッダ名 → 顧客フィールドの対応。列の順序は問わずヘッダ名で照合する。
const COLUMNS = [
  { header: '会社名', key: 'company_name', required: true },
  { header: '担当者名', key: 'contact_name', required: true },
  { header: 'メールアドレス', key: 'email', required: true },
  { header: '対象ドメイン', key: 'domain', required: true },
  { header: 'GA4プロパティID', key: 'ga4_property_id', required: true },
  { header: 'GA4コンバージョンイベント', key: 'ga4_conversion_event', required: false },
  { header: '業種', key: 'industry', required: false },
  { header: '繁忙期', key: 'busy_season', required: false },
  { header: '提供サービス概要', key: 'service_description', required: false },
  { header: '月間CV目標', key: 'cv_goal_monthly', required: false },
  { header: '保守開始日', key: 'maintenance_start_date', required: false },
  { header: '監視キーワード', key: 'keywords', required: false },
] as const;

type FieldKey = (typeof COLUMNS)[number]['key'];

interface ParsedRow {
  rowNum: number; // CSV上の行番号（ヘッダを除いた1始まり）
  values: Record<FieldKey, string>;
  keywords: string[];
  errors: string[];
}

interface ImportResult {
  inserted: number;
  skipped: { label: string; reason: string }[];
  failed: { label: string; error: string }[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// CSVテキストをParsedRow[]へ。ヘッダ照合・必須/形式バリデーションまで行う。
function mapAndValidate(text: string): { rows: ParsedRow[]; headerError: string | null } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], headerError: 'CSVが空です。' };

  const headers = table[0].map((h) => h.trim());
  const indexOf: Partial<Record<FieldKey, number>> = {};
  for (const col of COLUMNS) {
    const idx = headers.indexOf(col.header);
    if (idx >= 0) indexOf[col.key] = idx;
  }

  // 必須ヘッダの欠落チェック
  const missingHeaders = COLUMNS.filter((c) => c.required && indexOf[c.key] === undefined).map(
    (c) => c.header
  );
  if (missingHeaders.length > 0) {
    return { rows: [], headerError: `必須の列が見つかりません: ${missingHeaders.join('、')}` };
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const get = (key: FieldKey) => {
      const idx = indexOf[key];
      return idx === undefined ? '' : (cells[idx] ?? '').trim();
    };

    const values = {} as Record<FieldKey, string>;
    for (const col of COLUMNS) values[col.key] = get(col.key);

    const errors: string[] = [];
    for (const col of COLUMNS) {
      if (col.required && !values[col.key]) errors.push(`${col.header}が未入力`);
    }
    if (values.email && !EMAIL_RE.test(values.email)) errors.push('メール形式が不正');
    if (values.cv_goal_monthly && !/^\d+$/.test(values.cv_goal_monthly)) {
      errors.push('月間CV目標は数値で入力');
    }
    if (values.maintenance_start_date && !DATE_RE.test(values.maintenance_start_date)) {
      errors.push('保守開始日はYYYY-MM-DD形式');
    }

    // 監視キーワードは ; ； 、 のいずれかで区切る
    const keywords = values.keywords
      ? values.keywords.split(/[;；、]/).map((k) => k.trim()).filter(Boolean)
      : [];

    rows.push({ rowNum: i, values, keywords, errors });
  }

  return { rows, headerError: null };
}

// テンプレCSVを生成（Excelで文字化けしないようBOM付き）
function downloadTemplate() {
  const header = COLUMNS.map((c) => c.header).join(',');
  const example =
    '株式会社サンプル,山田太郎,yamada@example.co.jp,example.co.jp,123456789,contact,外壁塗装,3〜5月,住宅の外壁塗装,10,2026-04-01,外壁塗装 名古屋;屋根塗装 愛知';
  const blob = new Blob(['﻿' + header + '\n' + example + '\n'], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '顧客一括登録テンプレート.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportCustomersPage() {
  const router = useRouter();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [submitError, setSubmitError] = useState('');

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setResult(null);
    setSubmitError('');
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const { rows: parsed, headerError: hErr } = mapAndValidate(text);
    setHeaderError(hErr);
    setRows(parsed);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const customers = validRows.map((r) => ({
        company_name: r.values.company_name,
        contact_name: r.values.contact_name,
        email: r.values.email,
        domain: r.values.domain,
        ga4_property_id: r.values.ga4_property_id,
        ga4_conversion_event: r.values.ga4_conversion_event || null,
        industry: r.values.industry || null,
        busy_season: r.values.busy_season || null,
        service_description: r.values.service_description || null,
        cv_goal_monthly: r.values.cv_goal_monthly ? Number(r.values.cv_goal_monthly) : null,
        maintenance_start_date: r.values.maintenance_start_date || null,
        keywords: r.keywords,
      }));

      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers }),
      });
      if (res.ok) {
        setResult(await res.json());
      } else {
        const body = await res.json().catch(() => null);
        setSubmitError(body?.error || '一括登録に失敗しました。');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="顧客管理"
        title="顧客のCSV一括登録"
        right={
          <Link href="/dashboard" className={linkAction}>
            ← ダッシュボード
          </Link>
        }
      />

      {/* 手順・テンプレ */}
      <Card className="mb-5 p-6">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">使い方</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
          <li>テンプレートをダウンロードし、1行＝1顧客で入力します。</li>
          <li>
            <strong className="text-foreground">会社名・担当者名・メールアドレス・対象ドメイン・GA4プロパティID</strong>{' '}
            は必須です。
          </li>
          <li>監視キーワードは「;」（セミコロン）区切りで複数指定できます。</li>
          <li>既存顧客とドメインまたはメールが重複する行は自動でスキップされます。</li>
        </ol>
        <div className="mt-4">
          <button onClick={downloadTemplate} className={btnSecondary}>
            テンプレート（CSV）をダウンロード
          </button>
        </div>
      </Card>

      {/* ファイル選択 */}
      <Card className="mb-5 p-6">
        <label className="mb-1.5 block text-xs font-medium text-muted">CSVファイルを選択</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-accent-hover"
        />
        {fileName && <p className="mt-2 text-xs text-faint">読み込み: {fileName}</p>}
        {headerError && (
          <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            {headerError}
          </p>
        )}
      </Card>

      {/* プレビュー */}
      {rows.length > 0 && !result && (
        <Card className="mb-5 p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              プレビュー（{rows.length}行）
            </h2>
            <p className="text-xs text-muted">
              登録可能 <span className="font-semibold text-foreground">{validRows.length}</span> 件
              {invalidCount > 0 && (
                <>
                  {' / '}エラー <span className="font-semibold text-accent">{invalidCount}</span> 件
                </>
              )}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-xs text-muted">
                  <th className="px-2 py-2">行</th>
                  <th className="px-2 py-2">会社名</th>
                  <th className="px-2 py-2">メール</th>
                  <th className="px-2 py-2">ドメイン</th>
                  <th className="px-2 py-2">KW数</th>
                  <th className="px-2 py-2">状態</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNum} className="border-b border-border/70 last:border-0">
                    <td className="px-2 py-2 tabular text-faint">{r.rowNum}</td>
                    <td className="px-2 py-2 text-foreground">{r.values.company_name || '—'}</td>
                    <td className="px-2 py-2 text-muted">{r.values.email || '—'}</td>
                    <td className="px-2 py-2 text-muted">{r.values.domain || '—'}</td>
                    <td className="px-2 py-2 tabular text-muted">{r.keywords.length}</td>
                    <td className="px-2 py-2">
                      {r.errors.length === 0 ? (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                          OK
                        </span>
                      ) : (
                        <span className="text-xs text-accent">{r.errors.join('・')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {submitError && (
            <p role="alert" className="mt-4 flex items-center gap-1.5 text-sm text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              {submitError}
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting || validRows.length === 0}
              className={btnPrimary}
            >
              {submitting ? '登録中…' : `${validRows.length}件を登録する`}
            </button>
          </div>
        </Card>
      )}

      {/* 結果 */}
      {result && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">登録結果</h2>
          <p className="mt-2 text-sm text-muted">
            登録 <span className="font-semibold text-emerald-700">{result.inserted}</span> 件 / スキップ{' '}
            <span className="font-semibold text-amber-700">{result.skipped.length}</span> 件 / 失敗{' '}
            <span className="font-semibold text-accent">{result.failed.length}</span> 件
          </p>

          {result.skipped.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted">スキップ（重複）:</p>
              <ul className="mt-1 space-y-0.5 text-xs text-faint">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    {s.label} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.failed.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-accent">失敗:</p>
              <ul className="mt-1 space-y-0.5 text-xs text-accent">
                {result.failed.map((f, i) => (
                  <li key={i}>
                    {f.label} — {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => {
                setRows([]);
                setResult(null);
                setFileName('');
              }}
              className={btnSecondary}
            >
              続けて別のCSVを読み込む
            </button>
            <button onClick={() => router.push('/dashboard')} className={btnPrimary}>
              ダッシュボードへ
            </button>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
