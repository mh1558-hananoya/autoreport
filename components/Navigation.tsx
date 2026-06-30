'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'ダッシュボード' },
    { href: '/customers/new', label: '顧客登録' },
    { href: '/customers/import', label: 'CSV一括登録' },
  ];

  return (
    <nav
      className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md"
      aria-label="メインナビゲーション"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-9">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-sm bg-accent" aria-hidden />
            <span className="text-base font-bold tracking-tight text-foreground">花のや</span>
            <span className="hidden text-xs font-medium text-faint sm:inline">レポート管理</span>
          </Link>
          <div className="flex gap-1 text-sm">
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative rounded-md px-3 py-1.5 font-medium transition-colors duration-200 ${
                    active
                      ? 'text-accent'
                      : 'text-muted hover:bg-surface-muted hover:text-foreground'
                  }`}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-200 hover:bg-surface-muted hover:text-foreground"
        >
          ログアウト
        </button>
      </div>
    </nav>
  );
}
