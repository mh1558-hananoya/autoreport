'use client';

import { useState } from 'react';
import { inputClass } from '@/components/ui/kit';

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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted">{label}</label>
        {onRegenerate && (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs font-medium text-accent underline-offset-4 transition-colors hover:text-accent-hover hover:underline disabled:opacity-50"
          >
            {regenerating ? '再生成中…' : 'このセクションだけ再生成'}
          </button>
        )}
      </div>
      {multiline ? (
        <textarea className={inputClass} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
