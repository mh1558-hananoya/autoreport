'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReportEditor from '@/components/reports/ReportEditor';
import { PageShell, PageState, Card, btnPrimary, btnSecondary } from '@/components/ui/kit';
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
    return <PageState message="読み込み中…" width="max-w-7xl" />;
  }

  if (!report || !claude) {
    return <PageState message="レポートが見つかりません" width="max-w-7xl" />;
  }

  const ga4 = report.ga4_data as GA4Data | null;
  const seo = report.seo_data as SEOData | null;

  return (
    <PageShell width="max-w-7xl">
      {/* L3 アラートバナー */}
      {claude.alert_level === 3 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <p className="text-sm font-medium leading-relaxed text-accent">
            この顧客のサイトは深刻な状況です。提言欄は自動的に「お電話でご説明」に設定されています。送信前に管理者の判断を確認してください。
          </p>
        </div>
      )}

      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">レポート</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">レポート編集</h1>
        </div>
        <button onClick={handleRegenerateAll} disabled={regenerating} className={btnSecondary}>
          {regenerating ? '再生成中…' : '全体を再生成'}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 左ペイン：生データ */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">GA4 サマリー</h3>
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
                <p className="text-sm text-faint">データなし</p>
              )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">検索パフォーマンス（Search Console）</h3>
            {seo?.gsc ? (
              <div className="space-y-2 text-sm">
                <div className="tabular grid grid-cols-2 gap-2 rounded-lg bg-surface-muted/60 p-3 text-xs">
                  <p>クリック数: {seo.gsc.totals.clicks.toLocaleString()}</p>
                  <p>表示回数: {seo.gsc.totals.impressions.toLocaleString()}</p>
                  <p>CTR: {seo.gsc.totals.ctr}%</p>
                  <p>平均順位: {seo.gsc.totals.position}位</p>
                </div>
                <p className="mt-2 text-xs text-muted">主要キーワード（上位20）:</p>
                {seo.gsc.keywords.slice(0, 20).map((kw, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="mr-2 flex-1 truncate">{kw.keyword}</span>
                    <span className="tabular whitespace-nowrap text-muted">{kw.position}位 / {kw.clicks}クリック</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-faint">データなし</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">競合動向</h3>
            {seo?.competitors && seo.competitors.length > 0 ? (
              <div className="space-y-2">
                {seo.competitors.map((c, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-foreground">{c.domain}</p>
                    <p className="text-xs text-muted">{c.threat_comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-faint">データなし</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">今月の提案サービス</h3>
            {claude.proposals.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {claude.proposals.map((p, i) => (
                  <li key={i}>・{p.display_name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">
                {claude.alert_level === 3 ? 'L3: 相談誘導' : '提案なし'}
              </p>
            )}
          </Card>
        </div>

        {/* 右ペイン：編集 */}
        <Card className="p-6">
          <ReportEditor
            report={claude}
            subject={subject}
            onSubjectChange={setSubject}
            onChange={setClaude}
            onRegenerateSection={handleRegenerateSection}
          />

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={handleSave} disabled={saving} className={btnSecondary}>
              {saving ? '保存中…' : '保存'}
            </button>
            <button onClick={handleSave} disabled={saving} className={btnPrimary}>
              プレビューへ進む
            </button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
