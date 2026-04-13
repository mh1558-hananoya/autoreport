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

  if (status === 'loading' || loading) {
    return (
      <>
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-400 py-20">読み込み中...</div>
        </main>
      </>
    );
  }

  const now = new Date();
  const targetYearMonth = getReportTargetMonth(now);
  const currentMonth = formatMonthLabel(targetYearMonth);
  const showBanner = now.getDate() >= 15;

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{currentMonth} レポート管理</h1>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>全{customers.length}社</span>
            <span>送信済み {customers.filter((c) => c.status === 'sent').length}社</span>
            <span className="text-red-600">
              L3 {customers.filter((c) => c.alert_level === 3).length}社
            </span>
          </div>
        </div>

        {showBanner && <AlertBanner unrecoredCount={unrecordedCount} />}

        <CustomerTable customers={customers} />
      </main>
    </>
  );
}
