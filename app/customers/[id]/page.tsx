'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerForm from '@/components/customers/CustomerForm';
import KeywordList from '@/components/customers/KeywordList';
import MonthlyMemoForm from '@/components/customers/MonthlyMemoForm';
import {
  PageShell,
  PageHeader,
  PageState,
  Card,
  SectionTitle,
  inputClass,
  btnPrimary,
  btnSecondary,
  linkAction,
} from '@/components/ui/kit';
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
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState(false);

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
    setSavingCustomer(true);
    setSavedCustomer(false);
    try {
      await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: data, keywords, competitors, pages }),
      });
      setSavedCustomer(true);
      setTimeout(() => setSavedCustomer(false), 2500);
      router.refresh();
    } finally {
      setSavingCustomer(false);
    }
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
    return <PageState message="読み込み中…" />;
  }

  if (!customer) {
    return <PageState message="顧客が見つかりません" />;
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="顧客管理"
        title={customer.company_name}
        right={
          <>
            <Link href={`/customers/${id}/history`} className={linkAction}>
              送信履歴 →
            </Link>
            <button
              onClick={async () => {
                if (
                  !confirm(
                    `${customer.company_name} を削除しますか？\n一覧から外れますが、過去のレポート履歴は保持されます。`
                  )
                )
                  return;
                setDeleting(true);
                setDeleteError('');
                try {
                  const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
                  if (res.ok) {
                    router.push('/dashboard');
                  } else {
                    const body = await res.json().catch(() => null);
                    setDeleteError(body?.error || '削除できませんでした。時間をおいて再度お試しください。');
                    setDeleting(false);
                  }
                } catch {
                  setDeleteError('通信に失敗しました。ネットワークをご確認ください。');
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent transition-colors duration-200 hover:bg-accent-soft disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
              {deleting ? '削除中…' : '顧客を削除'}
            </button>
          </>
        }
      />

      {deleteError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
        >
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          {deleteError}
        </div>
      )}

      <div className="space-y-6">
        <Card className="p-6 sm:p-8">
          <CustomerForm customer={customer} onSave={handleSave} formId="customer-detail-form" hideSubmit />
        </Card>

        {/* 競合ドメイン */}
        <Card className="p-6">
          <SectionTitle
            hint={
              <>
                実際のビジネス競合のドメインを入力してください。
                <br />
                登録したドメインの検索順位変動を毎月レポートでお知らせします。（最大3つ）
              </>
            }
          >
            競合ドメイン（最大3つ）
          </SectionTitle>
          {competitors.length > 0 && (
            <div className="mb-4 space-y-2">
              {competitors.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/50 px-3 py-2"
                >
                  <span className="flex-1 text-sm text-foreground">{c.competitor_domain}</span>
                  <button
                    onClick={() => removeCompetitor(i)}
                    className="text-xs font-medium text-muted transition-colors hover:text-accent"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
          {competitors.length < 3 && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="new-competitor"
                className={inputClass}
                placeholder="例：competitor.co.jp（httpなし・ドメインのみ）"
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
                className={`${btnSecondary} shrink-0`}
              >
                追加
              </button>
            </div>
          )}
        </Card>

        {/* 主要ページ */}
        <Card className="p-6">
          <SectionTitle>主要ページ一覧</SectionTitle>
          {pages.length > 0 && (
            <div className="mb-4 space-y-2">
              {pages.map((p, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-2">
                  <input
                    className={`${inputClass} col-span-4`}
                    placeholder="例：/price/（パスのみ）"
                    value={p.url}
                    onChange={(e) => updatePage(i, 'url', e.target.value)}
                  />
                  <select
                    className={`${inputClass} col-span-2`}
                    value={p.purpose}
                    onChange={(e) => updatePage(i, 'purpose', e.target.value)}
                  >
                    <option value="集客">集客</option>
                    <option value="CV">CV</option>
                    <option value="ブランド">ブランド</option>
                    <option value="採用">採用</option>
                  </select>
                  <input
                    className={`${inputClass} col-span-3`}
                    placeholder="例：料金ページ"
                    value={p.description}
                    onChange={(e) => updatePage(i, 'description', e.target.value)}
                  />
                  <input
                    type="number"
                    className={`${inputClass} tabular col-span-2`}
                    placeholder="CV貢献%"
                    value={p.cv_contribution ?? ''}
                    onChange={(e) => updatePage(i, 'cv_contribution', e.target.value ? Number(e.target.value) : null)}
                  />
                  <button
                    onClick={() => removePage(i)}
                    className="col-span-1 text-muted transition-colors hover:text-accent"
                    aria-label="削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={addPage} className={linkAction}>
            ＋ ページを追加
          </button>
        </Card>

        {/* キーワード */}
        <Card className="p-6">
          <KeywordList keywords={keywords} onChange={setKeywords} />
        </Card>

        {/* 月次補足メモ */}
        <Card className="p-6">
          <MonthlyMemoForm
            customerId={id}
            yearMonth={yearMonth}
            initialMemo={memo?.memo}
            initialExcludeServices={memo?.exclude_services}
            services={services}
          />
        </Card>

        {/* ページ最下部の保存バー：基本情報・競合・主要ページ・監視キーワードをまとめて保存 */}
        <div className="flex items-center justify-end gap-4 border-t border-border pt-6">
          {savedCustomer && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              保存しました
            </span>
          )}
          <span className="text-xs text-faint">
            基本情報・競合・主要ページ・監視キーワードを保存します（補足メモは上のボタンで保存）
          </span>
          <button
            type="submit"
            form="customer-detail-form"
            disabled={savingCustomer}
            className={btnPrimary}
          >
            {savingCustomer ? '保存中…' : '顧客情報を保存'}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
