'use client';

import { SEOKeywordData } from '@/lib/types';
import { Card } from '@/components/ui/kit';

/*
 * AI Overview（AIO）調査結果パネル — 社内向けの調査インテル。
 * 対検索ワードごとに「AI Overviewが出るか」「自社が引用されているか」を表示し、
 * 未引用のキーワード＝LLMO（AI引用最適化）の提案機会として可視化する。
 */

interface AioPanelProps {
  keywords: SEOKeywordData[];
}

type AioStatus = 'cited' | 'opportunity' | 'none';

function statusOf(kw: SEOKeywordData): AioStatus {
  if (!kw.aio_present) return 'none';
  return kw.aio_own_cited ? 'cited' : 'opportunity';
}

const BADGE: Record<AioStatus, { label: string; className: string }> = {
  cited: {
    label: '引用あり',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  opportunity: {
    label: '未引用（機会）',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  none: {
    label: '表示なし',
    className: 'border-border bg-surface-muted text-faint',
  },
};

export default function AioPanel({ keywords }: AioPanelProps) {
  // aio_present が一度も定義されていない＝AIO対応前に生成された古いレポート
  const hasAioData = keywords.some((k) => k.aio_present !== undefined);

  return (
    <Card className="p-5">
      <h3 className="mb-1 text-sm font-semibold tracking-tight text-foreground">
        AI Overview 調査（AIO / LLMO）
      </h3>

      {!hasAioData ? (
        <p className="mt-2 text-sm text-faint">
          このレポートにはAIO調査データがありません。「全体を再生成」で取得できます。
        </p>
      ) : keywords.length === 0 ? (
        <p className="mt-2 text-sm text-faint">対検索ワードが未登録です。</p>
      ) : (
        <>
          <AioSummary keywords={keywords} />
          <div className="mt-3 space-y-1.5">
            {keywords.map((kw, i) => {
              const status = statusOf(kw);
              const badge = BADGE[status];
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate text-foreground">{kw.keyword}</span>
                  {status === 'opportunity' && kw.aio_references && kw.aio_references.length > 0 && (
                    <span className="tabular shrink-0 text-xs text-faint">
                      引用元{kw.aio_references.length}件
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            「未引用（機会）」はAI検索に要約は出るのに自社が引用されていないキーワードです。FAQ・比較記事などの整備でAIに引用されやすくできる、LLMO提案の好機です。
          </p>
        </>
      )}
    </Card>
  );
}

function AioSummary({ keywords }: { keywords: SEOKeywordData[] }) {
  const present = keywords.filter((k) => k.aio_present).length;
  const cited = keywords.filter((k) => k.aio_present && k.aio_own_cited).length;
  const opportunity = present - cited;

  return (
    <div className="tabular grid grid-cols-3 gap-2 rounded-lg bg-surface-muted/60 p-3 text-center text-xs">
      <div>
        <p className="text-base font-semibold text-foreground">{present}</p>
        <p className="mt-0.5 text-muted">AI表示</p>
      </div>
      <div>
        <p className="text-base font-semibold text-emerald-700">{cited}</p>
        <p className="mt-0.5 text-muted">自社引用</p>
      </div>
      <div>
        <p className="text-base font-semibold text-amber-700">{opportunity}</p>
        <p className="mt-0.5 text-muted">未引用（機会）</p>
      </div>
    </div>
  );
}
