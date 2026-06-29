'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerForm from '@/components/customers/CustomerForm';
import { PageShell, PageHeader, Card, linkAction } from '@/components/ui/kit';
import { Customer } from '@/lib/types';

export default function NewCustomerPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSave = async (data: Partial<Customer>) => {
    setError('');
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const customer = await res.json();
      router.push(`/customers/${customer.id}`);
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error || '保存できませんでした。入力内容をご確認ください。');
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
      <Card className="p-6 sm:p-8">
        <CustomerForm onSave={handleSave} />
      </Card>
    </PageShell>
  );
}
