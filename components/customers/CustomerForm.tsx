'use client';

import { useState } from 'react';
import { Customer } from '@/lib/types';
import { inputClass, labelClass, btnPrimary, SectionTitle } from '@/components/ui/kit';

interface CustomerFormProps {
  customer?: Partial<Customer>;
  onSave: (data: Partial<Customer>) => Promise<void>;
  // 保存ボタンをフォーム外（ページ最下部など）に出したい場合に使う
  formId?: string;
  hideSubmit?: boolean;
}

export default function CustomerForm({ customer, onSave, formId, hideSubmit }: CustomerFormProps) {
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

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-9">
      {/* ステップ1: 基本情報 */}
      <section>
        <SectionTitle>ステップ1: 基本情報（必須）</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>会社名 *</label>
            <input
              required
              className={inputClass}
              placeholder="例：株式会社サンプル"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>担当者名 *</label>
            <input
              required
              className={inputClass}
              placeholder="例：山田太郎"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>メールアドレス *</label>
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
            <label className={labelClass}>対象ドメイン *</label>
            <input
              required
              className={inputClass}
              placeholder="例：example.co.jp（httpなし・ドメインのみ）"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>GA4 プロパティID *</label>
            <input
              required
              className={inputClass}
              placeholder="例：123456789（数字のみ）"
              value={form.ga4_property_id}
              onChange={(e) => setForm({ ...form, ga4_property_id: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>GA4 コンバージョンイベント名</label>
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
        <SectionTitle>ステップ2: ビジネス文脈（推奨）</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>業種</label>
            <input
              className={inputClass}
              placeholder="例：外壁塗装"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>繁忙期</label>
            <input
              className={inputClass}
              placeholder="例：3〜5月"
              value={form.busy_season}
              onChange={(e) => setForm({ ...form, busy_season: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>提供サービスの概要</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="例：住宅・商業施設の外壁塗装・屋根塗装"
              value={form.service_description}
              onChange={(e) => setForm({ ...form, service_description: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>月間CV目標件数</label>
            <input
              type="number"
              className={inputClass}
              placeholder="例：10"
              value={form.cv_goal_monthly}
              onChange={(e) => setForm({ ...form, cv_goal_monthly: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>保守開始日</label>
            <input
              type="date"
              className={inputClass}
              value={form.maintenance_start_date}
              onChange={(e) => setForm({ ...form, maintenance_start_date: e.target.value })}
            />
          </div>
        </div>
      </section>

      {!hideSubmit && (
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      )}
    </form>
  );
}
