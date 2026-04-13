'use client';

import { useState } from 'react';

interface SectionEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRegenerate?: () => Promise<void>;
  multiline?: boolean;
}

export default function SectionEditor({ label, value, onChange, onRegenerate, multiline }: SectionEditorProps) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        {onRegenerate && (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs text-accent hover:underline disabled:opacity-50"
          >
            {regenerating ? '再生成中...' : 'このセクションだけ再生成'}
          </button>
        )}
      </div>
      {multiline ? (
        <textarea
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
