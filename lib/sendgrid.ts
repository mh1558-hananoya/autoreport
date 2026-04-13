import sgMail from '@sendgrid/mail';
import { ClaudeReportResponse, GA4Data, GSCKeywordData } from './types';

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
  ga4: GA4Data,
  gscKeywords?: GSCKeywordData[]
): { html: string; text: string } {
  const [yearStr, monthStr] = month.split('-');
  const m = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  const s = ga4.sessions;
  const pv = ga4.page_views;
  const sessionSign = s.diff_pct >= 0 ? '+' : '';
  const pvSign = pv.diff_pct >= 0 ? '+' : '';
  const nuSign = ga4.new_users.diff_pct >= 0 ? '+' : '';

  let proposalSection = '';
  if (report.alert_level === 3 && report.alert_message) {
    proposalSection = report.alert_message;
  } else {
    proposalSection = report.proposals
      .map((p, i) => `${i + 1}. ${p.display_name}\n${p.body}`)
      .join('\n\n');
  }

  // 詳細データセクション（テキスト版）
  const detailText = `━━━━━━━━━━━━━━━━
【${year}年${m}月 アクセス解析】
━━━━━━━━━━━━━━━━

訪問者数: ${s.current.toLocaleString()} (前月比 ${sessionSign}${s.diff_pct}%)
ページ閲覧数: ${pv.current.toLocaleString()} (前月比 ${pvSign}${pv.diff_pct}%)
アクティブユーザー: ${ga4.active_users.current.toLocaleString()}
新規ユーザー: ${ga4.new_users.current.toLocaleString()} (前月比 ${nuSign}${ga4.new_users.diff_pct}%)
直帰率: ${Math.round(ga4.bounce_rate.current * 100)}%
平均滞在時間: ${ga4.avg_session_duration.current}秒
前年同月訪問者数: ${ga4.same_period_last_year.sessions.toLocaleString()}${gscKeywords && gscKeywords.length > 0 ? `

━━━━━━━━━━━━━━━━
【検索されているキーワード】
━━━━━━━━━━━━━━━━

${gscKeywords.slice(0, 10).map((kw) => `${kw.keyword}　${kw.position}位 / ${kw.clicks}クリック`).join('\n')}` : ''}`;

  const text = `${contactName}様

お世話になっております。花のやの花岡です。
${m}月度のサイトレポートをお届けします。

━━━━━━━━━━━━━━━━
📊 今月のサマリー
━━━━━━━━━━━━━━━━

訪問者数：${s.current.toLocaleString()}人（先月比 ${sessionSign}${s.diff_pct}%）
ページ閲覧数：${pv.current.toLocaleString()}回（先月比 ${pvSign}${pv.diff_pct}%）
直帰率：${Math.round(ga4.bounce_rate.current * 100)}%

${report.summary}

━━━━━━━━━━━━━━━━
📈 今月の動き
━━━━━━━━━━━━━━━━

【良かった点】
${report.good_points.map((p) => `・${p}`).join('\n')}

【気になる点】
${report.concern_points.map((p) => `・${p}`).join('\n')}

━━━━━━━━━━━━━━━━
💡 ご提案
━━━━━━━━━━━━━━━━

${proposalSection}

━━━━━━━━━━━━━━━━

ご関心をお持ちいただいた項目がございましたら、ぜひこのメールにご返信ください。
詳しいご説明やお見積りのご用意も、いつでも対応可能です。

${detailText}

━━━━━━━━━━━━━━━━

まずはお気軽にご相談ください。
一緒に貴社の成果につながる一手を考えてまいります。
引き続きどうぞよろしくお願い申し上げます。

株式会社花のや
〒460-0008 名古屋市中区栄2-14-5 山本屋本店栄ビル7階
TEL 052-211-9898
https://www.hanano-ya.jp/`;

  // 詳細データセクション（HTML版）
  const detailHtml = `
<div style="background: #f5f5f5; padding: 16px; margin: 24px 0; border-radius: 4px; font-size: 13px;">
<h3 style="margin: 0 0 12px; color: #555; font-size: 14px;">📋 ${year}年${m}月 アクセス解析</h3>
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 3px 0; color: #666;">訪問者数</td><td style="text-align: right;">${s.current.toLocaleString()} (${sessionSign}${s.diff_pct}%)</td></tr>
<tr><td style="padding: 3px 0; color: #666;">ページ閲覧数</td><td style="text-align: right;">${pv.current.toLocaleString()} (${pvSign}${pv.diff_pct}%)</td></tr>
<tr><td style="padding: 3px 0; color: #666;">アクティブユーザー</td><td style="text-align: right;">${ga4.active_users.current.toLocaleString()}</td></tr>
<tr><td style="padding: 3px 0; color: #666;">新規ユーザー</td><td style="text-align: right;">${ga4.new_users.current.toLocaleString()} (${nuSign}${ga4.new_users.diff_pct}%)</td></tr>
<tr><td style="padding: 3px 0; color: #666;">直帰率</td><td style="text-align: right;">${Math.round(ga4.bounce_rate.current * 100)}%</td></tr>
<tr><td style="padding: 3px 0; color: #666;">平均滞在時間</td><td style="text-align: right;">${ga4.avg_session_duration.current}秒</td></tr>
<tr><td style="padding: 3px 0; color: #666;">前年同月訪問者数</td><td style="text-align: right;">${ga4.same_period_last_year.sessions.toLocaleString()}</td></tr>
</table>
</div>${gscKeywords && gscKeywords.length > 0 ? `
<div style="background: #f5f5f5; padding: 16px; margin: 24px 0; border-radius: 4px; font-size: 13px;">
<h3 style="margin: 0 0 12px; color: #555; font-size: 14px;">🔍 検索されているキーワード</h3>
<table style="width: 100%; border-collapse: collapse;">
<tr style="border-bottom: 1px solid #ddd;"><td style="padding: 4px 0; color: #999; font-size: 11px;">キーワード</td><td style="text-align: right; color: #999; font-size: 11px;">順位</td><td style="text-align: right; color: #999; font-size: 11px;">クリック</td></tr>
${gscKeywords.slice(0, 10).map((kw) => `<tr><td style="padding: 3px 0;">${kw.keyword}</td><td style="text-align: right;">${kw.position}位</td><td style="text-align: right;">${kw.clicks}</td></tr>`).join('')}
</table>
</div>` : ''}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Hiragino Sans', 'Meiryo', sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
<p>${contactName}様</p>
<p>お世話になっております。花のやの花岡です。<br>${m}月度のサイトレポートをお届けします。</p>

<div style="background: #f8f8f8; border-left: 4px solid #d2151a; padding: 16px; margin: 24px 0;">
<h3 style="margin: 0 0 12px; color: #d2151a;">📊 今月のサマリー</h3>
<table style="width: 100%; border-collapse: collapse;">
<tr><td style="padding: 4px 0;">訪問者数</td><td style="text-align: right; font-weight: bold;">${s.current.toLocaleString()}人（${sessionSign}${s.diff_pct}%）</td></tr>
<tr><td style="padding: 4px 0;">ページ閲覧数</td><td style="text-align: right; font-weight: bold;">${pv.current.toLocaleString()}回（${pvSign}${pv.diff_pct}%）</td></tr>
<tr><td style="padding: 4px 0;">直帰率</td><td style="text-align: right; font-weight: bold;">${Math.round(ga4.bounce_rate.current * 100)}%</td></tr>
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

${detailHtml}

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
