import sgMail from '@sendgrid/mail';
import { ClaudeReportResponse } from './types';

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'm.hanaoka@hanano-ya.jp';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || '花岡正和（株式会社花のや）';

function isSendGridConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

function initSendGrid() {
  if (isSendGridConfigured()) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }
}

export function buildEmailSubject(
  companyName: string,
  month: string,
  subjectSuffix: string
): string {
  const m = parseInt(month.split('-')[1], 10);
  return `【花のや】${companyName}様サイト ${m}月度レポート｜${subjectSuffix}`;
}

export function buildEmailBody(
  contactName: string,
  month: string,
  report: ClaudeReportResponse,
  ga4Summary: { sessions: number; sessionsDiff: number; pageViews: number; pageViewsDiff: number; bounceRate: number }
): { html: string; text: string } {
  const m = parseInt(month.split('-')[1], 10);

  const sessionSign = ga4Summary.sessionsDiff >= 0 ? '+' : '';
  const pvSign = ga4Summary.pageViewsDiff >= 0 ? '+' : '';

  let proposalSection = '';
  if (report.alert_level === 3 && report.alert_message) {
    proposalSection = report.alert_message;
  } else {
    proposalSection = report.proposals
      .map((p, i) => `${i + 1}. ${p.display_name}\n${p.body}`)
      .join('\n\n');
  }

  const text = `${contactName}様

お世話になっております。花のやの花岡です。
${m}月度のサイトレポートをお届けします。

━━━━━━━━━━━━━━━━
今月のサマリー
━━━━━━━━━━━━━━━━

訪問者数：${ga4Summary.sessions.toLocaleString()}人（先月比 ${sessionSign}${ga4Summary.sessionsDiff}%）
ページ閲覧数：${ga4Summary.pageViews.toLocaleString()}回（先月比 ${pvSign}${ga4Summary.pageViewsDiff}%）
直帰率：${Math.round(ga4Summary.bounceRate * 100)}%

${report.summary}

━━━━━━━━━━━━━━━━
今月の動き
━━━━━━━━━━━━━━━━

【良かった点】
${report.good_points.map((p) => `・${p}`).join('\n')}

【気になる点】
${report.concern_points.map((p) => `・${p}`).join('\n')}

━━━━━━━━━━━━━━━━
ご提案
━━━━━━━━━━━━━━━━

${proposalSection}

━━━━━━━━━━━━━━━━

▶ ご興味のある項目があればこのメールに返信してください。

ご不明点があればいつでもご連絡ください。
引き続きよろしくお願いいたします。

株式会社花のや｜花岡正和
TEL 052-211-9898
https://www.hanano-ya.jp/`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
<p>${contactName}様</p>
<p>お世話になっております。花のやの花岡です。<br>${m}月度のサイトレポートをお届けします。</p>

<div style="background: #f8f8f8; border-left: 4px solid #d2151a; padding: 16px; margin: 24px 0;">
<h3 style="margin: 0 0 12px; color: #d2151a;">📊 今月のサマリー</h3>
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 4px 0;">訪問者数</td><td style="text-align: right; font-weight: bold;">${ga4Summary.sessions.toLocaleString()}人（${sessionSign}${ga4Summary.sessionsDiff}%）</td></tr>
<tr><td style="padding: 4px 0;">ページ閲覧数</td><td style="text-align: right; font-weight: bold;">${ga4Summary.pageViews.toLocaleString()}回（${pvSign}${ga4Summary.pageViewsDiff}%）</td></tr>
<tr><td style="padding: 4px 0;">直帰率</td><td style="text-align: right; font-weight: bold;">${Math.round(ga4Summary.bounceRate * 100)}%</td></tr>
</table>
<p style="margin: 12px 0 0;">${report.summary}</p>
</div>

<div style="margin: 24px 0;">
<h3 style="color: #d2151a;">📈 今月の動き</h3>
<h4>良かった点</h4>
<ul>${report.good_points.map((p) => `<li>${p}</li>`).join('')}</ul>
<h4>気になる点</h4>
<ul>${report.concern_points.map((p) => `<li style="color: #c33;">${p}</li>`).join('')}</ul>
</div>

<div style="background: #fff9f0; border: 1px solid #e8d5b7; padding: 16px; margin: 24px 0; border-radius: 4px;">
<h3 style="color: #d2151a;">💡 ご提案</h3>
${
  report.alert_level === 3 && report.alert_message
    ? `<p style="font-weight: bold;">${report.alert_message}</p>`
    : report.proposals
        .map(
          (p, i) =>
            `<div style="margin-bottom: 16px;"><strong>${i + 1}. ${p.display_name}</strong><p style="margin: 4px 0 0;">${p.body}</p></div>`
        )
        .join('')
}
</div>

<div style="background: #d2151a; color: white; padding: 12px 20px; border-radius: 4px; text-align: center; margin: 24px 0;">
▶ ご興味のある項目があればこのメールに返信してください。
</div>

<hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
<p style="font-size: 13px; color: #666;">
ご不明点があればいつでもご連絡ください。<br>
引き続きよろしくお願いいたします。<br><br>
株式会社花のや｜花岡正和<br>
TEL 052-211-9898<br>
https://www.hanano-ya.jp/
</p>
</body>
</html>`;

  return { html, text };
}

export async function sendReportEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  if (!isSendGridConfigured()) {
    console.log('[SendGrid未設定] メール送信をスキップしました');
    console.log(`  宛先: ${to}`);
    console.log(`  件名: ${subject}`);
    console.log(`  本文(text): ${text.slice(0, 200)}...`);
    return;
  }

  initSendGrid();
  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    html,
    text,
  });
}

export async function sendReminderEmail(
  adminEmail: string,
  customerNames: string[]
): Promise<void> {
  const subject = '【花のや】補足メモ未入力の顧客があります';
  const text = `以下の顧客の今月の補足メモが未入力です。\nレポート生成前に入力をお願いします。\n\n${customerNames.map((n) => `・${n}`).join('\n')}\n\n管理画面: ${process.env.NEXTAUTH_URL}/dashboard`;
  const html = `<p>以下の顧客の今月の補足メモが未入力です。<br>レポート生成前に入力をお願いします。</p><ul>${customerNames.map((n) => `<li>${n}</li>`).join('')}</ul><p><a href="${process.env.NEXTAUTH_URL}/dashboard">管理画面を開く</a></p>`;

  if (!isSendGridConfigured()) {
    console.log('[SendGrid未設定] リマインドメール送信をスキップしました');
    console.log(`  宛先: ${adminEmail}`);
    console.log(`  ��入力顧客: ${customerNames.join(', ')}`);
    return;
  }

  initSendGrid();
  await sgMail.send({
    to: adminEmail,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    html,
    text,
  });
}
