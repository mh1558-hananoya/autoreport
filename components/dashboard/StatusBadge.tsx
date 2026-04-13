'use client';

interface StatusBadgeProps {
  status: string;
  sentAt?: string | null;
}

export default function StatusBadge({ status, sentAt }: StatusBadgeProps) {
  switch (status) {
    case 'sent':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          ✅ 送信済み{sentAt ? `（${new Date(sentAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}）` : ''}
        </span>
      );
    case 'ready':
    case 'draft':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          ✏️ 下書きあり
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          ❌ エラー
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          🔴 未着手
        </span>
      );
  }
}
