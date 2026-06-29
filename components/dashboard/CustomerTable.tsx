'use client';

import { useState } from 'react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';
import { getReportTargetMonth } from '@/lib/utils';

interface CustomerRow {
  id: string;
  company_name: string;
  alert_level: number;
  report_id: string | null;
  status: string | null;
  sent_at: string | null;
  has_memo: boolean;
  last_month_replied: boolean;
  last_month_converted: boolean;
}

interface CustomerTableProps {
  customers: CustomerRow[];
}

function AlertBadge({ level }: { level: number }) {
  if (level === 3) {
    return (
      <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs font-bold tracking-wide text-white">
        L3
      </span>
    );
  }
  if (level === 2) {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold tracking-wide text-white">
        L2
      </span>
    );
  }
  return <span className="text-faint">—</span>;
}

function ReactionBadge({ replied, converted }: { replied: boolean; converted: boolean }) {
  if (converted)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        受注
      </span>
    );
  if (replied)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
        返信あり
      </span>
    );
  return <span className="text-faint">—</span>;
}

export default function CustomerTable({ customers }: CustomerTableProps) {
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const handleGenerate = async (customerId: string) => {
    setGeneratingIds((prev) => new Set(prev).add(customerId));
    try {
      await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          yearMonth: getReportTargetMonth(),
        }),
      });
      window.location.reload();
    } catch {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(customerId);
        return next;
      });
    }
  };

  // L3を上部に浮上
  const sorted = [...customers].sort((a, b) => {
    if (a.alert_level === 3 && b.alert_level !== 3) return -1;
    if (b.alert_level === 3 && a.alert_level !== 3) return 1;
    return a.company_name.localeCompare(b.company_name);
  });

  // 操作セルの共通アクションリンク/ボタン
  const actionClass =
    'font-medium text-accent underline-offset-4 transition-colors duration-200 hover:text-accent-hover hover:underline';

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-faint">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">顧客がまだ登録されていません</p>
        <p className="mt-1 text-sm text-muted">最初の保守契約顧客を登録すると、ここに月次レポートの進捗が並びます。</p>
        <Link
          href="/customers/new"
          className="mt-5 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-card transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
        >
          顧客を登録する
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-border bg-surface-muted/60">
            {['顧客名', 'アラート', '今月ステータス', '補足メモ', '先月の反応', '操作'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const isL3 = c.alert_level === 3;
            return (
              <tr
                key={c.id}
                className={`group border-b border-border/70 transition-colors duration-150 last:border-0 hover:bg-surface-muted/50 ${
                  isL3 ? 'bg-accent-soft/50' : ''
                }`}
              >
                <td className="relative px-4 py-3.5 text-sm font-medium">
                  {isL3 && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" aria-hidden />}
                  <Link
                    href={`/customers/${c.id}`}
                    className="text-foreground underline-offset-4 transition-colors duration-200 group-hover:text-accent hover:underline"
                  >
                    {c.company_name}
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <AlertBadge level={c.alert_level} />
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={c.status || 'none'} sentAt={c.sent_at} />
                </td>
                <td className="px-4 py-3.5 text-sm">
                  {c.has_memo ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      入力済み
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                      未入力
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <ReactionBadge replied={c.last_month_replied} converted={c.last_month_converted} />
                </td>
                <td className="px-4 py-3.5 text-sm">
                  {c.status === 'sent' ? (
                    <Link href={`/customers/${c.id}/history`} className={actionClass}>
                      履歴
                    </Link>
                  ) : c.report_id && (c.status === 'draft' || c.status === 'ready') ? (
                    <Link href={`/reports/${c.report_id}/edit`} className={actionClass}>
                      編集
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleGenerate(c.id)}
                      disabled={generatingIds.has(c.id)}
                      className={`${actionClass} disabled:cursor-wait disabled:opacity-50`}
                    >
                      {generatingIds.has(c.id)
                        ? '生成中…'
                        : c.status === 'error'
                          ? '再実行'
                          : '生成開始'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
