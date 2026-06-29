'use client';

import Link from 'next/link';

interface AlertBannerProps {
  unrecoredCount: number;
}

export default function AlertBanner({ unrecoredCount }: AlertBannerProps) {
  if (unrecoredCount === 0) return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
      </span>
      <p className="text-sm text-amber-900">
        先月のレポートで未記録の反応が
        <span className="tabular font-semibold"> {unrecoredCount} </span>
        件あります。
      </p>
      <Link
        href="/dashboard?filter=unrecorded"
        className="ml-auto shrink-0 text-sm font-semibold text-amber-800 underline-offset-4 transition-colors duration-200 hover:text-amber-900 hover:underline"
      >
        確認する →
      </Link>
    </div>
  );
}
