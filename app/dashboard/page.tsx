'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { getReportTargetMonth, formatMonthLabel } from '@/lib/utils';
import CustomerTable from '@/components/dashboard/CustomerTable';
import AlertBanner from '@/components/dashboard/AlertBanner';

interface DashboardCustomer {
  id: string;
  company_name: string;
  alert_level: number;
  report_id: string | null;
  status: string | null;
  sent_at: string | null;
  has_memo: boolean;
  last_month_replied: boolean;
  last_month_converted: boolean;
}

// ヘッダー右の統計チップ。数値は等幅数字で桁を揃える。
function StatChip({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <span
        className={`tabular text-lg font-semibold leading-none ${accent ? 'text-accent' : 'text-foreground'}`}
      >
        {value}
      </span>
      <span className="mt-1 text-[11px] font-medium text-muted">{label}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="border-b border-border bg-surface-muted/60 px-4 py-3">
        <div className="skeleton h-3 w-24" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border/70 px-4 py-4 last:border-0">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-5 w-9" />
          <div className="skeleton h-6 w-24 rounded-full" />
          <div className="skeleton ml-auto h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<DashboardCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [unrecordedCount, setUnrecordedCount] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers || []);
          setUnrecordedCount(data.unrecordedCount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [status]);

  const now = new Date();
  const targetYearMonth = getReportTargetMonth(now);
  const currentMonth = formatMonthLabel(targetYearMonth);
  const showBanner = now.getDate() >= 15;

  const isLoading = status === 'loading' || loading;
  const sentCount = customers.filter((c) => c.status === 'sent').length;
  const l3Count = customers.filter((c) => c.alert_level === 3).length;

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-faint">月次レポート</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {currentMonth} 管理
            </h1>
          </div>
          {!isLoading && (
            <div className="flex items-center gap-6 rounded-xl border border-border bg-surface px-5 py-2.5 shadow-card">
              <StatChip label="全顧客" value={customers.length} />
              <span className="h-8 w-px bg-border" aria-hidden />
              <StatChip label="送信済み" value={sentCount} />
              <span className="h-8 w-px bg-border" aria-hidden />
              <StatChip label="L3 アラート" value={l3Count} accent={l3Count > 0} />
            </div>
          )}
        </header>

        {showBanner && !isLoading && <AlertBanner unrecoredCount={unrecordedCount} />}

        {isLoading ? <DashboardSkeleton /> : <CustomerTable customers={customers} />}
      </main>
    </>
  );
}
