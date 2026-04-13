import Anthropic from '@anthropic-ai/sdk';
import { ClaudeReportResponse, GA4Data, SEOData, Service, CustomerPage } from './types';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `あなたは株式会社花のやのWebマーケティング担当アシスタントです。
保守契約中のクライアントへ送る月次レポートを生成してください。

【絶対ルール】
- 文体は必ず「です・ます調（敬体）」に統一する。「だ・である調」は絶対に使わない。
- 助詞を省略しない。
- 専門用語を使わない（セッション→訪問者数、PV→ページ閲覧数、直帰率→すぐ離脱した割合）
- 専門用語を使う場合は括弧で補足。数値の変化には意味の解釈を1文添える。
- 提案には期待効果と優先度を追加。
- 末尾のCTAは丁寧な依頼文に変える。
- 文章はカジュアルな表現は使わず、ビジネス文書として適切な言い回しに置き換える。
- 結論を最初に書く
- 数字には必ず「次の予測」または「放置コスト」をセットで書く
- 競合が伸びている場合は「このまま放置すると〇〇になります」という危機感のある表現を使う
- 金額・費用は一切書かない
- 中小企業の社長が45秒で読めるボリュームにする
- 先月と同じサービスを提案する場合は切り口を変えて表現する

【レポートで使用するデータ】
以下のGA4データを基にレポートを作成する。コンバージョン数には言及しないこと。
- 訪問者数（sessions）：サイトへの訪問回数
- アクティブユーザー数（active_users）：実際にサイトを利用した人数
- 新規ユーザー数（new_users）：初めてサイトに訪れた人数
- ページ閲覧数（page_views）：閲覧されたページの総数
- 直帰率（bounce_rate）：1ページだけ見てすぐ離脱した割合
- 平均滞在時間（avg_session_duration）：1回の訪問あたりの平均滞在秒数
- エンゲージメントセッション数（engaged_sessions）：10秒以上滞在 or 2ページ以上閲覧した訪問数
- イベント数（event_count）：ボタンクリック・スクロールなどの操作回数
- 流入経路（channels）：検索・直接・SNS等の割合
- 端末（devices）：PC・スマホ・タブレットの割合

【アラートレベルの判定基準】
レベル1（通常）：一部の指標が改善余地あり。個別提案を出す。
レベル2（要注意）：複数の指標が悪化傾向。提案は出すが冒頭に現状の深刻さを一言添える。
レベル3（深刻）：アクセス全体が大幅に低迷し、改善の兆しがない。提案より相談誘導を優先する。
  → L3の判定条件：訪問者数が前月比30%以上減少 かつ 直帰率が60%以上 かつ 主要KWが全て20位以下

【サービス提案のルール】
- サービスマスタのトリガー条件に該当するものを全て提案する
- ただし exclude_services に含まれるものは除外する
- 優先度順に並べる
- L3の場合は提案を出さず、相談誘導文のみ出力する
- 先月提案したサービス（last_month_services）と同じものは切り口を変えて表現する

【出力フォーマット】
必ず以下のJSON形式で出力してください。JSON以外のテキストは出力しないでください。
{
  "alert_level": 1,
  "subject_suffix": "訪問者数+12%",
  "summary": "...",
  "good_points": ["...", "..."],
  "concern_points": ["...", "..."],
  "proposals": [
    {
      "service_id": "content_rewrite",
      "display_name": "コンテンツ改善",
      "body": "..."
    }
  ],
  "alert_message": null
}

※ L3の場合は proposals を空配列にし、alert_message に相談誘導文を入れる`;

interface GenerateReportInput {
  company: {
    name: string;
    contact: string;
    domain: string;
    industry: string | null;
    service_description: string | null;
    busy_season: string | null;
    cv_goal_monthly: number | null;
    maintenance_months: number;
    pages: CustomerPage[];
  };
  this_month: string;
  memo: string | null;
  exclude_services: string[];
  last_month_services: string[];
  services_master: Service[];
  ga4: GA4Data;
  seo: SEOData;
}

export async function generateReport(input: GenerateReportInput): Promise<ClaudeReportResponse> {
  const userPrompt = JSON.stringify(input, null, 2);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  const rawText = content.text.trim();

  // JSONパース（コードブロックで囲まれている場合も対応）
  let jsonText = rawText;
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  const parsed: ClaudeReportResponse = JSON.parse(jsonText);
  return parsed;
}

export async function regenerateSection(
  currentReport: ClaudeReportResponse,
  section: string,
  input: GenerateReportInput
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `以下のレポートの「${section}」セクションだけを再生成してください。
他のセクションは変更しないでください。再生成したセクションの内容のみを返してください。

現在のレポート:
${JSON.stringify(currentReport, null, 2)}

元データ:
${JSON.stringify(input, null, 2)}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  return content.text.trim();
}
