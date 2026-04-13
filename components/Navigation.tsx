'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname.startsWith(path) ? 'text-accent font-semibold' : 'text-gray-600 hover:text-gray-900';

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-bold text-accent">
              花のや
            </Link>
            <div className="flex gap-6 text-sm">
              <Link href="/dashboard" className={isActive('/dashboard')}>
                ダッシュボード
              </Link>
              <Link href="/customers/new" className={isActive('/customers/new')}>
                顧客登録
              </Link>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ログアウト
          </button>
        </div>
      </div>
    </nav>
  );
}
