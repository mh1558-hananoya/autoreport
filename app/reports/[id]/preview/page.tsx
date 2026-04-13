'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import EmailPreview from '@/components/reports/EmailPreview';
import { Report, Customer } from '@/lib/types';

export default function ReportPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        alert(`送信エラー: ${data.error}`);
      }
    } finally {
      setSending(false);
      setShowConfirm(false);
    }
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

  if (!report || !customer) {
    return (
      <>
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center text-gray-400 py-20">レポートが見つかりません</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">メールプレビュー</h1>
          <span className="text-sm text-gray-500">{customer.company_name}</span>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <EmailPreview
            subject={report.subject || ''}
            bodyHtml={report.body_html || ''}
            email={customer.email}
          />
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => router.push(`/reports/${id}/edit`)}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            ← 編集に戻る
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={report.status === 'sent'}
            className="px-6 py-2 bg-accent text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {report.status === 'sent' ? '送信済み' : '送信する'}
          </button>
        </div>

        {/* 送信確認ダイアログ */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-bold mb-2">送信確認</h2>
              <p className="text-sm text-gray-600 mb-4">
                {customer.company_name}（{customer.email}）へレポートを送信します。よろしいですか？
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? '送信中...' : '送信する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
