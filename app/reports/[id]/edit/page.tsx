'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ReportEditor from '@/components/reports/ReportEditor';
import { Report, ClaudeReportResponse, GA4Data, SEOData } from '@/lib/types';

export default function ReportEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [claude, setClaude] = useState<ClaudeReportResponse | null>(null);
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/reports/${id}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        setSubject(data.subject || '');
        if (data.claude_raw) {
          try {
            setClaude(JSON.parse(data.claude_raw));
          } catch {
            // claude_raw がパースできない場合
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSave = async () => {
    if (!claude || !report) return;
    setSaving(true);
    try {
      await fetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          claude_raw: JSON.stringify(claude),
          proposed_services: claude.proposals.map((p) => p.service_id),
          alert_level: claude.alert_level,
          status: 'ready',
        }),
      });
      router.push(`/reports/${id}/preview`);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!report) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: report.customer_id,
          yearMonth: report.year_month,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setClaude(data.claude);
        setSubject(data.report.subject);
        setReport(data.report);
      }
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateSection = async () => {
    await handleRegenerateAll();
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-400 py-20">読み込み中...</div>
        </main>
      </>
    );
  }

  if (!report || !claude) {
    return (
      <>
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-400 py-20">レポートが見つかりません</div>
        </main>
      </>
    );
  }

  const ga4 = report.ga4_data as GA4Data | null;
  const seo = report.seo_data as SEOData | null;

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* L3 アラートバナー */}
        {claude.alert_level === 3 && (
          <div className="bg-red-50 border border-red-300 rounded-md p-4 mb-6">
            <p className="text-sm text-red-800 font-medium">
              この顧客のサイトは深刻な状況です。提言欄は自動的に「お電話でご説明」に設定されています。送信前に管理者の判断を確認してください。
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">レポート編集</h1>
          <div className="flex gap-3">
            <button
              onClick={handleRegenerateAll}
              disabled={regenerating}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {regenerating ? '再生成中...' : '全体を再生成'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 左ペイン：生データ */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">GA4 サマリー</h3>
              {ga4 ? (
                <div className="space-y-1 text-sm">
                  <p>訪問者数: {ga4.sessions.current.toLocaleString()} (前月比 {ga4.sessions.diff_pct > 0 ? '+' : ''}{ga4.sessions.diff_pct}%)</p>
                  <p>ページ閲覧数: {ga4.page_views?.current?.toLocaleString() || '-'} (前月比 {(ga4.page_views?.diff_pct || 0) > 0 ? '+' : ''}{ga4.page_views?.diff_pct || 0}%)</p>
                  <p>アクティブユーザー: {ga4.active_users?.current?.toLocaleString() || '-'}</p>
                  <p>新規ユーザー: {ga4.new_users?.current?.toLocaleString() || '-'} (前月比 {(ga4.new_users?.diff_pct || 0) > 0 ? '+' : ''}{ga4.new_users?.diff_pct || 0}%)</p>
                  <p>直帰率: {Math.round((ga4.bounce_rate?.current || 0) * 100)}%</p>
                  <p>平均滞在時間: {ga4.avg_session_duration?.current || 0}秒</p>
                  <p>前年同月訪問者数: {ga4.same_period_last_year.sessions.toLocaleString()}</p>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">流入経路:</p>
                    {Object.entries(ga4.channels).map(([ch, pct]) => (
                      <p key={ch} className="text-xs ml-2">{ch}: {pct}%</p>
                    ))}
                  </div>
                  {ga4.devices && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">端末:</p>
                      {Object.entries(ga4.devices).map(([d, pct]) => (
                        <p key={d} className="text-xs ml-2">{d}: {pct}%</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">データなし</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">検索パフォーマンス（Search Console）</h3>
              {seo?.gsc ? (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded p-2">
                    <p>クリック数: {seo.gsc.totals.clicks.toLocaleString()}</p>
                    <p>表示回数: {seo.gsc.totals.impressions.toLocaleString()}</p>
                    <p>CTR: {seo.gsc.totals.ctr}%</p>
                    <p>平均順位: {seo.gsc.totals.position}位</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">主要キーワード（上位20）:</p>
                  {seo.gsc.keywords.slice(0, 20).map((kw, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="truncate flex-1 mr-2">{kw.keyword}</span>
                      <span className="text-gray-500 whitespace-nowrap">{kw.position}位 / {kw.clicks}クリック</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">データなし</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">競合動向</h3>
              {seo?.competitors && seo.competitors.length > 0 ? (
                <div className="space-y-2">
                  {seo.competitors.map((c, i) => (
                    <div key={i} className="text-sm">
                      <p className="font-medium">{c.domain}</p>
                      <p className="text-xs text-gray-500">{c.threat_comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">データなし</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">今月の提案サービス</h3>
              {claude.proposals.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {claude.proposals.map((p, i) => (
                    <li key={i}>・{p.display_name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">
                  {claude.alert_level === 3 ? 'L3: 相談誘導' : '提案なし'}
                </p>
              )}
            </div>
          </div>

          {/* 右ペイン：編集 */}
          <div className="bg-white rounded-lg shadow p-6">
            <ReportEditor
              report={claude}
              subject={subject}
              onSubjectChange={setSubject}
              onChange={setClaude}
              onRegenerateSection={handleRegenerateSection}
            />

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-accent text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                プレビューへ進む
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
