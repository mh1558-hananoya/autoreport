'use client';

import { inputClass } from '@/components/ui/kit';

interface Proposal {
  service_id: string;
  display_name: string;
  body: string;
}

interface ProposalListProps {
  proposals: Proposal[];
  onChange: (proposals: Proposal[]) => void;
}

export default function ProposalList({ proposals, onChange }: ProposalListProps) {
  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...proposals];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  const moveDown = (index: number) => {
    if (index === proposals.length - 1) return;
    const updated = [...proposals];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(proposals.filter((_, i) => i !== index));
  };

  const updateBody = (index: number, body: string) => {
    const updated = [...proposals];
    updated[index] = { ...updated[index], body };
    onChange(updated);
  };

  const iconBtn =
    'flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted">提言</label>
      {proposals.map((p, i) => (
        <div key={`${p.service_id}-${i}`} className="space-y-2 rounded-lg border border-border bg-surface-muted/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              <span className="tabular text-faint">{i + 1}.</span> {p.display_name}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className={iconBtn} aria-label="上へ">
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveDown(i)}
                disabled={i === proposals.length - 1}
                className={iconBtn}
                aria-label="下へ"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-1 text-xs font-medium text-muted transition-colors hover:text-accent"
              >
                削除
              </button>
            </div>
          </div>
          <textarea className={inputClass} rows={2} value={p.body} onChange={(e) => updateBody(i, e.target.value)} />
        </div>
      ))}
      {proposals.length === 0 && <p className="text-sm text-faint">提案なし</p>}
    </div>
  );
}
