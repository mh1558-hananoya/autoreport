'use client';

interface StatusBadgeProps {
  status: string;
  sentAt?: string | null;
}

// ドット＋ラベル式バッジ。emoji を使わず、色相は warm 系の意味色に統一。
const STYLES: Record<string, { dot: string; box: string; label: string }> = {
  sent: { dot: 'bg-emerald-500', box: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10', label: '送信済み' },
  draft: { dot: 'bg-amber-500', box: 'bg-amber-50 text-amber-700 ring-amber-600/10', label: '下書きあり' },
  error: { dot: 'bg-accent', box: 'bg-accent-soft text-accent ring-accent/10', label: 'エラー' },
  none: { dot: 'bg-faint', box: 'bg-surface-muted text-muted ring-black/5', label: '未着手' },
};

export default function StatusBadge({ status, sentAt }: StatusBadgeProps) {
  const key = status === 'ready' ? 'draft' : status in STYLES ? status : 'none';
  const s = STYLES[key];
  const dateLabel =
    key === 'sent' && sentAt
      ? `（${new Date(sentAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}）`
      : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.box}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
      {dateLabel && <span className="tabular text-[11px] opacity-70">{dateLabel}</span>}
    </span>
  );
}
