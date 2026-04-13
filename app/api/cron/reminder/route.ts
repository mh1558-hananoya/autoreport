import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReminderEmail } from '@/lib/sendgrid';
import { Customer } from '@/lib/types';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // 来月分の年月を算出
  const now = new Date();
  const nextMonth = now.getMonth() + 2; // 0-indexed + 1
  const nextYear = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
  const yearMonth = `${nextYear}-${String(nextMonth > 12 ? 1 : nextMonth).padStart(2, '0')}`;

  // アクティブ顧客を取得
  const { data: customers } = await supabase
    .from('customers')
    .select('id, company_name')
    .eq('is_active', true);

  if (!customers || customers.length === 0) {
    return NextResponse.json({ message: 'No active customers' });
  }

  // 補足メモ入力済みをチェック
  const { data: memos } = await supabase
    .from('monthly_memos')
    .select('customer_id')
    .eq('year_month', yearMonth);

  const memoCustomerIds = new Set((memos || []).map((m) => m.customer_id));
  const missingCustomers = (customers as Pick<Customer, 'id' | 'company_name'>[]).filter(
    (c) => !memoCustomerIds.has(c.id)
  );

  if (missingCustomers.length === 0) {
    return NextResponse.json({ message: 'All memos are filled' });
  }

  // リマインドメール送信
  const adminEmail = process.env.SENDGRID_FROM_EMAIL!;
  await sendReminderEmail(
    adminEmail,
    missingCustomers.map((c) => c.company_name)
  );

  return NextResponse.json({
    sent: true,
    missingCount: missingCustomers.length,
    customers: missingCustomers.map((c) => c.company_name),
  });
}
