'use client';

import Link from 'next/link';

interface AlertBannerProps {
  unrecoredCount: number;
}

export default function AlertBanner({ unrecoredCount }: AlertBannerProps) {
  if (unrecoredCount === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
      <p className="text-sm text-yellow-800">
        💬 先月のレポートで未記録の反応が{unrecoredCount}件あります →{' '}
        <Link href="/dashboard?filter=unrecorded" className="underline font-medium">
          確認する
        </Link>
      </p>
    </div>
  );
}
