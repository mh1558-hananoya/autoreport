'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageShell, PageHeader, PageState, Card, linkAction } from '@/components/ui/kit';
import { Report, Customer } from '@/lib/types';

export default function HistoryPage() {
  const params = useParams();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [custRes, reportsRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch(`/api/customers/${id}/reports`),
      ]);
      if (custRes.ok) {
        const data = await custRes.json();
        setCustomer(data.customer);
      }
      if (reportsRes.ok) {
        setReports(await reportsRes.json());
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const markReplied = async (reportId: string) => {
    await fetch(`/api/reports/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replied_at: new Date().toISOString() }),
    });
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, replied_at: new Date().toISOString() } : r))
    );
  };

  const markConverted = async (reportId: string) => {
    await fetch(`/api/reports/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ converted_at: new Date().toISOString() }),
    });
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, converted_at: new Date().toISOString() } : r))
    );
  };

  if (loading) {
    return <PageState message="読み込み中…" />;
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={customer?.company_name || ''}
        title="送信履歴"
        right={
          <Link href={`/customers/${id}`} className={linkAction}>
            ← 顧客詳細に戻る
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-border bg-surface-muted/60">
              {['月度', '送信日', '提案', '反応', '操作'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const [y, m] = r.year_month.split('-');
              return (
                <tr
                  key={r.id}
                  className="border-b border-border/70 transition-colors duration-150 last:border-0 hover:bg-surface-muted/50"
                >
                  <td className="tabular px-4 py-3.5 text-sm text-foreground">
                    {y}年{parseInt(m)}月
                  </td>
                  <td className="tabular px-4 py-3.5 text-sm text-muted">
                    {r.sent_at
                      ? new Date(r.sent_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-foreground">
                    {r.proposed_services?.join('・') || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    {r.converted_at ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                        受注
                      </span>
                    ) : r.replied_at ? (
                      <span className="inline-flex items-center gap-1.5 text-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
                        返信あり
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <div className="flex items-center gap-3">
                      <Link href={`/reports/${r.id}/preview`} className={linkAction}>
                        プレビュー
                      </Link>
                      <Link
                        href={`/reports/${r.id}/edit`}
                        className="font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                      >
                        編集
                      </Link>
                      {r.status === 'sent' && !r.replied_at && (
                        <button
                          onClick={() => markReplied(r.id)}
                          className="font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline"
                        >
                          返信あり
                        </button>
                      )}
                      {r.status === 'sent' && !r.converted_at && (
                        <button
                          onClick={() => markConverted(r.id)}
                          className="font-medium text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
                        >
                          受注
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {reports.length === 0 && (
          <div className="py-14 text-center text-sm text-muted">送信履歴がありません</div>
        )}
      </Card>

      {reports.length > 0 && (
        <div className="mt-4 text-right">
          <Link href={`/customers/${id}#memo`} className={linkAction}>
            今月の補足メモを入力 →
          </Link>
        </div>
      )}
    </PageShell>
  );
}
