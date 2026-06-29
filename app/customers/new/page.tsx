'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerForm from '@/components/customers/CustomerForm';
import KeywordList from '@/components/customers/KeywordList';
import { PageShell, PageHeader, Card, linkAction, btnPrimary } from '@/components/ui/kit';
import { Customer } from '@/lib/types';

const FORM_ID = 'new-customer-form';

export default function NewCustomerPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // 対検索ワード（AIO調査・検索順位追跡の対象）。登録時にまとめて入力できる
  const [keywords, setKeywords] = useState<{ keyword: string; target_url: string }[]>([]);

  const handleSave = async (data: Partial<Customer>) => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, keywords }),
      });

      if (res.ok) {
        const customer = await res.json();
        router.push(`/customers/${customer.id}`);
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error || '保存できませんでした。入力内容をご確認ください。');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="顧客管理"
        title="顧客の新規登録"
        right={
          <Link href="/dashboard" className={linkAction}>
            ← ダッシュボード
          </Link>
        }
      />
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
        >
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          {error}
        </div>
      )}
      <div className="space-y-5">
        <Card className="p-6 sm:p-8">
          {/* 保存ボタンはキーワード入力の後（ページ最下部）に置くため hideSubmit */}
          <CustomerForm onSave={handleSave} formId={FORM_ID} hideSubmit />
        </Card>
        <Card className="p-6 sm:p-8">
          <KeywordList keywords={keywords} onChange={setKeywords} />
        </Card>
        <div className="flex justify-end">
          <button type="submit" form={FORM_ID} disabled={saving} className={btnPrimary}>
            {saving ? '保存中…' : '登録する'}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
