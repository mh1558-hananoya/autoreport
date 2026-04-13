'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
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
    return (
      <>
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-gray-400 py-20">読み込み中...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">
            {customer?.company_name || ''} - 送信履歴
          </h1>
          <Link href={`/customers/${id}`} className="text-sm text-accent hover:underline">
            ← 顧客詳細に戻る
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">月度</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">送信日</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">提案</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">反応</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((r) => {
                const [y, m] = r.year_month.split('-');
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm">{y}年{parseInt(m)}月</td>
                    <td className="px-4 py-3 text-sm">
                      {r.sent_at
                        ? new Date(r.sent_at).toLocaleDateString('ja-JP', {
                            month: 'numeric',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {r.proposed_services?.join('・') || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {r.converted_at ? (
                        <span className="text-green-600">受注🎉</span>
                      ) : r.replied_at ? (
                        <span>返信💬</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm flex gap-2">
                      <Link
                        href={`/reports/${r.id}/edit`}
                        className="text-accent hover:underline"
                      >
                        内容確認
                      </Link>
                      {r.status === 'sent' && !r.replied_at && (
                        <button
                          onClick={() => markReplied(r.id)}
                          className="text-blue-600 hover:underline"
                        >
                          返信あり
                        </button>
                      )}
                      {r.status === 'sent' && !r.converted_at && (
                        <button
                          onClick={() => markConverted(r.id)}
                          className="text-green-600 hover:underline"
                        >
                          受注
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {reports.length === 0 && (
            <div className="text-center py-12 text-gray-400">送信履歴がありません</div>
          )}
        </div>

        {reports.length > 0 && (
          <div className="mt-4 text-right">
            <Link href={`/customers/${id}#memo`} className="text-sm text-accent hover:underline">
              今月の補足メモを入力 →
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
