'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

// useSearchParams() を使うため、Suspense 境界の内側に切り出す（プリレンダー時のCSRバイルアウト回避）
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await signIn('credentials', {
      password,
      redirect: false,
      callbackUrl,
    });
    if (res?.ok) {
      router.push(callbackUrl);
    } else {
      setError('パスワードが違います。');
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4">
      {/* 背景：warm 色相の控えめなラジアルグロー（フラットさを回避） */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(200,22,28,0.06), transparent 70%)',
        }}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-card">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
            花
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground">花のや</h1>
          <p className="mt-1 text-sm text-muted">月次レポート管理システム</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="社内共有パスワードを入力"
            />
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white shadow-card transition-all duration-200 hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {submitting ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-faint">株式会社花のや 社内システム</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
