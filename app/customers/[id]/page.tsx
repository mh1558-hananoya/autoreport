'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import CustomerForm from '@/components/customers/CustomerForm';
import KeywordList from '@/components/customers/KeywordList';
import MonthlyMemoForm from '@/components/customers/MonthlyMemoForm';
import { Customer, CustomerKeyword, CustomerCompetitor, CustomerPage, Service } from '@/lib/types';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [keywords, setKeywords] = useState<{ keyword: string; target_url: string }[]>([]);
  const [competitors, setCompetitors] = useState<{ competitor_domain: string }[]>([]);
  const [pages, setPages] = useState<{ url: string; purpose: string; description: string; cv_contribution: number | null }[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [memo, setMemo] = useState<{ memo: string; exclude_services: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    async function load() {
      try {
        const [custRes, svcRes, memoRes] = await Promise.all([
          fetch(`/api/customers/${id}`),
          fetch('/api/services'),
          fetch(`/api/customers/${id}/memo?yearMonth=${yearMonth}`),
        ]);

        if (custRes.ok) {
          const data = await custRes.json();
          setCustomer(data.customer);
          setKeywords(
            (data.keywords as CustomerKeyword[]).map((k) => ({
              keyword: k.keyword,
              target_url: k.target_url || '',
            }))
          );
          setCompetitors(
            (data.competitors as CustomerCompetitor[]).map((c) => ({
              competitor_domain: c.competitor_domain,
            }))
          );
          setPages(
            (data.pages as CustomerPage[]).map((p) => ({
              url: p.url,
              purpose: p.purpose,
              description: p.description || '',
              cv_contribution: p.cv_contribution,
            }))
          );
        }

        if (svcRes.ok) {
          setServices(await svcRes.json());
        }

        if (memoRes.ok) {
          const memoData = await memoRes.json();
          if (memoData) setMemo(memoData);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, yearMonth]);

  const handleSave = async (data: Partial<Customer>) => {
    await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer: data, keywords, competitors, pages }),
    });
    router.refresh();
  };

  const addCompetitor = (domain: string) => {
    if (competitors.length >= 3) return;
    setCompetitors([...competitors, { competitor_domain: domain }]);
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const addPage = () => {
    setPages([...pages, { url: '', purpose: '集客', description: '', cv_contribution: null }]);
  };

  const updatePage = (index: number, field: string, value: string | number | null) => {
    const updated = [...pages];
    updated[index] = { ...updated[index], [field]: value };
    setPages(updated);
  };

  const removePage = (index: number) => {
    setPages(pages.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-gray-400 py-20">読み込み中...</div>
        </main>
      </>
    );
  }

  if (!customer) {
    return (
      <>
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-gray-400 py-20">顧客が見つかりません</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{customer.company_name}</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                if (!confirm(`${customer.company_name} を削除しますか？\n（レポート履歴は保持されます）`)) return;
                const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
                if (res.ok) router.push('/dashboard');
              }}
              className="text-sm text-gray-400 hover:text-red-600"
            >
              削除
            </button>
            <a
              href={`/customers/${id}/history`}
              className="text-sm text-accent hover:underline"
          >
              送信履歴 →
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <CustomerForm customer={customer} onSave={handleSave} />
        </div>

        {/* 競合ドメイン */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">
            競合ドメイン（最大3つ）
          </h3>
          <div className="space-y-2 mb-4">
            {competitors.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
                <span className="text-sm flex-1">{c.competitor_domain}</span>
                <button onClick={() => removeCompetitor(i)} className="text-red-400 hover:text-red-600 text-sm">
                  削除
                </button>
              </div>
            ))}
          </div>
          {competitors.length < 3 && (
            <div className="flex gap-2">
              <input
                id="new-competitor"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="competitor.co.jp"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    addCompetitor(input.value);
                    input.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('new-competitor') as HTMLInputElement;
                  addCompetitor(input.value);
                  input.value = '';
                }}
                className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700"
              >
                追加
              </button>
            </div>
          )}
        </div>

        {/* 主要ページ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">
            主要ページ一覧
          </h3>
          <div className="space-y-3 mb-4">
            {pages.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="col-span-4 border border-gray-300 rounded px-2 py-1.5 text-sm"
                  placeholder="URL（例：/price/）"
                  value={p.url}
                  onChange={(e) => updatePage(i, 'url', e.target.value)}
                />
                <select
                  className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm"
                  value={p.purpose}
                  onChange={(e) => updatePage(i, 'purpose', e.target.value)}
                >
                  <option value="集客">集客</option>
                  <option value="CV">CV</option>
                  <option value="ブランド">ブランド</option>
                  <option value="採用">採用</option>
                </select>
                <input
                  className="col-span-3 border border-gray-300 rounded px-2 py-1.5 text-sm"
                  placeholder="説明"
                  value={p.description}
                  onChange={(e) => updatePage(i, 'description', e.target.value)}
                />
                <input
                  type="number"
                  className="col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm"
                  placeholder="CV貢献%"
                  value={p.cv_contribution ?? ''}
                  onChange={(e) => updatePage(i, 'cv_contribution', e.target.value ? Number(e.target.value) : null)}
                />
                <button onClick={() => removePage(i)} className="col-span-1 text-red-400 hover:text-red-600 text-sm">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addPage} className="text-sm text-accent hover:underline">
            + ページを追加
          </button>
        </div>

        {/* キーワード */}
        <div className="bg-white rounded-lg shadow p-6">
          <KeywordList keywords={keywords} onChange={setKeywords} />
        </div>

        {/* 月次補足メモ */}
        <div className="bg-white rounded-lg shadow p-6">
          <MonthlyMemoForm
            customerId={id}
            yearMonth={yearMonth}
            initialMemo={memo?.memo}
            initialExcludeServices={memo?.exclude_services}
            services={services}
          />
        </div>
      </main>
    </>
  );
}
