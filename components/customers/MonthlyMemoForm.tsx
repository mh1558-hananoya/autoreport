'use client';

import { useState, useEffect } from 'react';
import { Service } from '@/lib/types';

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
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">
        セクション4: 今月の補足情報（{yearMonth}）
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            今月の施策・変更点メモ
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            rows={3}
            placeholder="例：料金ページを全面改修した"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2">
            今月提案しないサービス
          </label>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeServices.includes(s.name)}
                  onChange={() => toggleService(s.name)}
                  className="rounded"
                />
                {s.display_name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? '保存中...' : '補足メモを保存'}
          </button>
          {saved && <span className="text-green-600 text-sm">保存しました</span>}
        </div>
      </div>
    </section>
  );
}
