import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendReportEmail } from '@/lib/sendgrid';
import { Report, Customer } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // レポート取得
    const { data: report, error: reportErr } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const r = report as Report;

    if (r.status === 'sent') {
      return NextResponse.json({ error: 'Report already sent' }, { status: 400 });
    }

    if (!r.subject || !r.body_html || !r.body_text) {
      return NextResponse.json({ error: 'Report content is incomplete' }, { status: 400 });
    }

    // 顧客メールアドレス取得
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('email')
      .eq('id', r.customer_id)
      .single();

    if (custErr || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const cust = customer as Pick<Customer, 'email'>;

    // メール送信
    await sendReportEmail(cust.email, r.subject, r.body_html, r.body_text);

    // ステータス更新
    await supabase
      .from('reports')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', reportId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 }
    );
  }
}
