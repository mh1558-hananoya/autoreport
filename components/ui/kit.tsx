'use client';

import Navigation from '@/components/Navigation';

/*
 * 共通UIキット — 管理画面全体でデザイントークン（globals.css / tailwind.config.ts）を
 * 一貫して使うためのプリミティブ。新規依存は追加せず、Tailwind v3 のクラスのみで構成。
 */

// 入力・ラベル・ボタンの共通クラス
export const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';

export const labelClass = 'mb-1.5 block text-xs font-medium text-muted';

export const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-card transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

export const btnSecondary =
  'inline-flex items-center justify-center rounded-lg border border-border-strong bg-surface px-5 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-surface-muted active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhost =
  'inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors duration-150 hover:bg-surface-muted hover:text-foreground disabled:opacity-40';

export const linkAction =
  'font-medium text-accent underline-offset-4 transition-colors duration-200 hover:text-accent-hover hover:underline';

// カード（境界線＋warm影。AIっぽい border+shadow の二重盛りは避け、控えめに）
export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface shadow-card ${className}`}>
      {children}
    </div>
  );
}

// カード内のセクション見出し
export function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-4 border-b border-border pb-2.5">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{children}</h3>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

// ページ共通シェル（ナビ＋中央寄せメイン）
export function PageShell({
  children,
  width = 'max-w-4xl',
}: {
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <>
      <Navigation />
      <main className={`mx-auto ${width} px-4 pb-16 pt-8 sm:px-6 lg:px-8`}>{children}</main>
    </>
  );
}

// ローディング／空・不在の状態表示
export function PageState({
  message,
  width = 'max-w-4xl',
}: {
  message: string;
  width?: string;
}) {
  return (
    <PageShell width={width}>
      <div className="flex items-center justify-center py-24 text-sm text-muted">{message}</div>
    </PageShell>
  );
}

// 戻る導線つきのページ見出し
export function PageHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-widest text-faint">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      {right && <div className="flex items-center gap-4">{right}</div>}
    </header>
  );
}
