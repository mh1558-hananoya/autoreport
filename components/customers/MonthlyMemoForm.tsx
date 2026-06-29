'use client';

import { useState, useEffect } from 'react';
import { Service } from '@/lib/types';
import { inputClass, labelClass, btnPrimary, SectionTitle } from '@/components/ui/kit';

interface MonthlyMemoFormProps {
  customerId: string;
  yearMonth: string;
  initialMemo?: string;
  initialExcludeServices?: string[];
  services: Service[];
}

export default function MonthlyMemoForm({
  customerId,
  yearMonth,
  initialMemo,
  initialExcludeServices,
  services,
}: MonthlyMemoFormProps) {
  const [memo, setMemo] = useState(initialMemo || '');
  const [excludeServices, setExcludeServices] = useState<string[]>(initialExcludeServices || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMemo(initialMemo || '');
    setExcludeServices(initialExcludeServices || []);
  }, [initialMemo, initialExcludeServices]);

  const toggleService = (serviceId: string) => {
    setExcludeServices((prev) =>
      prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/customers/${customerId}/memo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth, memo, excludeServices }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="memo">
      <SectionTitle>セクション4: 今月の補足情報（{yearMonth}）</SectionTitle>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>今月の施策・変更点メモ</label>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="例：料金ページを全面改修した"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>今月提案しないサービス</label>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => {
              const checked = excludeServices.includes(s.name);
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors duration-150 ${
                    checked
                      ? 'border-accent/40 bg-accent-soft text-accent'
                      : 'border-border bg-surface text-muted hover:bg-surface-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleService(s.name)}
                    className="accent-accent"
                  />
                  {s.display_name}
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving ? '保存中…' : '補足メモを保存'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              保存しました
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
