'use client';

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

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-gray-500">提言</label>
      {proposals.map((p, i) => (
        <div key={`${p.service_id}-${i}`} className="border border-gray-200 rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {i + 1}. {p.display_name}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveUp(i)}
                disabled={i === 0}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveDown(i)}
                disabled={i === proposals.length - 1}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                削除
              </button>
            </div>
          </div>
          <textarea
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            rows={2}
            value={p.body}
            onChange={(e) => updateBody(i, e.target.value)}
          />
        </div>
      ))}
      {proposals.length === 0 && (
        <p className="text-sm text-gray-400">提案なし</p>
      )}
    </div>
  );
}
