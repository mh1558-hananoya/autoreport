'use client';

import { useState } from 'react';
import { Customer } from '@/lib/types';

interface CustomerFormProps {
  customer?: Partial<Customer>;
  onSave: (data: Partial<Customer>) => Promise<void>;
}

export default function CustomerForm({ customer, onSave }: CustomerFormProps) {
  const [form, setForm] = useState({
    company_name: customer?.company_name || '',
    contact_name: customer?.contact_name || '',
    email: customer?.email || '',
    domain: customer?.domain || '',
    ga4_property_id: customer?.ga4_property_id || '',
    ga4_conversion_event: customer?.ga4_conversion_event || 'contact',
    industry: customer?.industry || '',
    service_description: customer?.service_description || '',
    busy_season: customer?.busy_season || '',
    cv_goal_monthly: customer?.cv_goal_monthly || '',
    maintenance_start_date: customer?.maintenance_start_date || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        cv_goal_monthly: form.cv_goal_monthly ? Number(form.cv_goal_monthly) : null,
        maintenance_start_date: form.maintenance_start_date || null,
        industry: form.industry || null,
        service_description: form.service_description || null,
        busy_season: form.busy_season || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ステップ1: 基本情報 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">
          ステップ1: 基本情報（必須）
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">会社名 *</label>
            <input
              required
              className={inputClass}
              placeholder="例：株式会社サンプル"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">担当者名 *</label>
            <input
              required
              className={inputClass}
              placeholder="例：山田太郎"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">メールアドレス *</label>
            <input
              required
              type="email"
              className={inputClass}
              placeholder="例：yamada@example.co.jp"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">対象ドメイン *</label>
            <input
              required
              className={inputClass}
              placeholder="例：example.co.jp（httpなし・ドメインのみ）"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">GA4 プロパティID *</label>
            <input
              required
              className={inputClass}
              placeholder="例：123456789（数字のみ）"
              value={form.ga4_property_id}
              onChange={(e) => setForm({ ...form, ga4_property_id: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">GA4 コンバージョンイベント名</label>
            <input
              className={inputClass}
              placeholder="例：contact（未入力ならcontact）"
              value={form.ga4_conversion_event}
              onChange={(e) => setForm({ ...form, ga4_conversion_event: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* ステップ2: ビジネス文脈 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">
          ステップ2: ビジネス文脈（推奨）
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">業種</label>
            <input
              className={inputClass}
              placeholder="例：外壁塗装"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">繁忙期</label>
            <input
              className={inputClass}
              placeholder="例：3〜5月"
              value={form.busy_season}
              onChange={(e) => setForm({ ...form, busy_season: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">提供サービスの概要</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="例：住宅・商業施設の外壁塗装・屋根塗装"
              value={form.service_description}
              onChange={(e) => setForm({ ...form, service_description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">月間CV目標件数</label>
            <input
              type="number"
              className={inputClass}
              placeholder="例：10"
              value={form.cv_goal_monthly}
              onChange={(e) => setForm({ ...form, cv_goal_monthly: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">保守開始日</label>
            <input
              type="date"
              className={inputClass}
              value={form.maintenance_start_date}
              onChange={(e) => setForm({ ...form, maintenance_start_date: e.target.value })}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-accent text-white px-6 py-2 rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
