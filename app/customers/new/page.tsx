'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import CustomerForm from '@/components/customers/CustomerForm';
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
      setError(body?.error || '保存に失敗しました。入力内容を確認してください。');
    }
  };

  return (
    <>
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold mb-6">顧客新規登録</h1>
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-sm rounded-md p-3 mb-4">
            {error}
          </div>
        )}
        <div className="bg-white rounded-lg shadow p-6">
          <CustomerForm onSave={handleSave} />
        </div>
      </main>
    </>
  );
}
