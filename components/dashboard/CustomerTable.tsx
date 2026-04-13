'use client';

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
    return <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white">L3</span>;
  }
  if (level === 2) {
    return <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-orange-500 text-white">L2</span>;
  }
  return <span className="text-gray-300">-</span>;
}

function ReactionBadge({ replied, converted }: { replied: boolean; converted: boolean }) {
  if (converted) return <span className="text-sm">受注🎉</span>;
  if (replied) return <span className="text-sm">返信あり💬</span>;
  return <span className="text-gray-300 text-sm">-</span>;
}

export default function CustomerTable({ customers }: CustomerTableProps) {
  // L3を上部に浮上
  const sorted = [...customers].sort((a, b) => {
    if (a.alert_level === 3 && b.alert_level !== 3) return -1;
    if (b.alert_level === 3 && a.alert_level !== 3) return 1;
    return a.company_name.localeCompare(b.company_name);
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">顧客名</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">アラート</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">今月ステータス</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">補足メモ</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">先月の反応</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((c) => (
            <tr key={c.id} className={c.alert_level === 3 ? 'bg-red-50' : ''}>
              <td className="px-4 py-3 text-sm font-medium">
                <Link href={`/customers/${c.id}`} className="hover:text-accent">
                  {c.company_name}
                </Link>
              </td>
              <td className="px-4 py-3"><AlertBadge level={c.alert_level} /></td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status || 'none'} sentAt={c.sent_at} />
              </td>
              <td className="px-4 py-3 text-sm">
                {c.has_memo ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-orange-500 text-xs">⚠️ 未入力</span>
                )}
              </td>
              <td className="px-4 py-3">
                <ReactionBadge replied={c.last_month_replied} converted={c.last_month_converted} />
              </td>
              <td className="px-4 py-3 text-sm">
                {c.status === 'sent' ? (
                  <Link href={`/customers/${c.id}/history`} className="text-accent hover:underline">
                    履歴
                  </Link>
                ) : c.report_id && (c.status === 'draft' || c.status === 'ready') ? (
                  <Link href={`/reports/${c.report_id}/edit`} className="text-accent hover:underline">
                    編集
                  </Link>
                ) : c.status === 'error' ? (
                  <button
                    onClick={() => {
                      fetch('/api/reports/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          customerId: c.id,
                          yearMonth: getReportTargetMonth(),
                        }),
                      }).then(() => window.location.reload());
                    }}
                    className="text-accent hover:underline"
                  >
                    再実行
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      fetch('/api/reports/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          customerId: c.id,
                          yearMonth: getReportTargetMonth(),
                        }),
                      }).then(() => window.location.reload());
                    }}
                    className="text-accent hover:underline"
                  >
                    生成開始
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          顧客が登録されていません
        </div>
      )}
    </div>
  );
}
