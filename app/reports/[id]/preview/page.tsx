'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EmailPreview from '@/components/reports/EmailPreview';
import { PageShell, PageHeader, PageState, Card, btnPrimary, btnSecondary } from '@/components/ui/kit';
import { Report, Customer } from '@/lib/types';

export default function ReportPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/reports/${id}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);

        // 顧客情報も取得
        const custRes = await fetch(`/api/customers/${data.customer_id}`);
        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomer(custData.customer);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSend = async () => {
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json().catch(() => null);
        setSendError(data?.error || '送信できませんでした。時間をおいて再度お試しください。');
        setShowConfirm(false);
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <PageState message="読み込み中…" />;
  }

  if (!report || !customer) {
    return <PageState message="レポートが見つかりません" />;
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={customer.company_name}
        title="メールプレビュー"
        right={<span className="tabular text-sm text-muted">{customer.email}</span>}
      />

      {sendError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
        >
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          {sendError}
        </div>
      )}

      <Card className="p-6">
        <EmailPreview
          subject={report.subject || ''}
          bodyHtml={report.body_html || ''}
          email={customer.email}
        />
      </Card>

      <div className="mt-6 flex justify-between">
        <button onClick={() => router.push(`/reports/${id}/edit`)} className={btnSecondary}>
          ← 編集に戻る
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={report.status === 'sent'}
          className={btnPrimary}
        >
          {report.status === 'sent' ? '送信済み' : '送信する'}
        </button>
      </div>

      {/* 送信確認ダイアログ */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card-hover">
            <h2 id="confirm-title" className="text-lg font-bold tracking-tight text-foreground">
              送信の確認
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {customer.company_name}（<span className="tabular">{customer.email}</span>）へレポートを送信します。よろしいですか？
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className={btnSecondary}>
                キャンセル
              </button>
              <button onClick={handleSend} disabled={sending} className={btnPrimary}>
                {sending ? '送信中…' : '送信する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
