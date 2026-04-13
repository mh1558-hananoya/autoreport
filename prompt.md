# 花のや 月次レポート自動化ツール 要件定義書

## 0. プロジェクト概要

### ゴール
保守契約中の顧客に月次レポートを自動生成・送信することで、**継続的な関係構築と新たな受注を生み出す**仕組みを構築する。

### 背景
- 花のや（株式会社花のや）が保守契約中の顧客へ月1回のレポートを届ける
- 現状は手作業のため、スケールが困難
- レポートを「情報提供」ではなく「次の受注への導線」として設計する
- レポートは「数字の説明」ではなく「ビジネスへの影響と次の行動」まで踏み込む内容にする

### ユーザー
| ユーザー | 役割 |
|---|---|
| 管理者 | レポート確認・編集・送信を行う |
| 保守契約中の顧客 | メールでレポートを受け取るだけ（ツールは触らない） |

---

## 1. システム構成

### アーキテクチャ
```
GA4 Data API v1（アクセス数・流入元・CV数）
DataForSEO API（検索順位変動・競合ドメイン動向）
        ↓
    Next.js 14（バックエンド・管理画面）
        ↓
    Claude API claude-sonnet-4-20250514（レポート文章生成）
        ↓
    管理画面で管理者が確認・編集
        ↓
    SendGrid（メール送信）→ 顧客へ
```

### 技術スタック
| 役割 | 技術 | 備考 |
|---|---|---|
| フレームワーク | Next.js 14 (App Router) | フロント・バックエンド統合 |
| DB | Supabase (PostgreSQL) | 顧客情報・レポート保存 |
| 認証 | NextAuth.js | Google OAuth（管理者のみ） |
| GA4データ取得 | Google Analytics Data API v1 | サービスアカウント認証 |
| SEOデータ取得 | DataForSEO API | キーワード順位・競合分析 |
| AI生成 | Claude API（Sonnet） | レポート文章生成 |
| メール送信 | SendGrid | 月50通以内（無料枠で対応） |
| ホスティング | Vercel | 月次バッチはVercel Cron Jobs |

---

## 2. データベース設計

### テーブル一覧

#### `customers`（顧客マスタ）
```sql
id                    UUID PRIMARY KEY
company_name          TEXT NOT NULL
contact_name          TEXT NOT NULL
email                 TEXT NOT NULL
domain                TEXT NOT NULL
ga4_property_id       TEXT NOT NULL
ga4_conversion_event  TEXT DEFAULT 'contact'  -- コンバージョンイベント名（顧客ごとに異なる）
industry              TEXT                     -- 業種（例：外壁塗装、採用コンサル）
service_description   TEXT                     -- 提供サービスの概要
busy_season           TEXT                     -- 繁忙期（例：3〜5月）
cv_goal_monthly       INTEGER                  -- 月間CV目標件数
maintenance_start_date DATE                    -- 保守開始日（深刻度判定に使用）
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

#### `customer_keywords`（監視キーワード）
```sql
id            UUID PRIMARY KEY
customer_id   UUID REFERENCES customers(id)
keyword       TEXT NOT NULL
target_url    TEXT
created_at    TIMESTAMP
```

#### `customer_competitors`（競合ドメイン）
```sql
id                UUID PRIMARY KEY
customer_id       UUID REFERENCES customers(id)
competitor_domain TEXT NOT NULL       -- 最大3つ
created_at        TIMESTAMP
```

#### `customer_pages`（主要ページ情報）
```sql
id              UUID PRIMARY KEY
customer_id     UUID REFERENCES customers(id)
url             TEXT NOT NULL
purpose         TEXT NOT NULL         -- 集客/CV/ブランド/採用
description     TEXT
cv_contribution INTEGER               -- このページ経由のCV割合（%）
created_at      TIMESTAMP
```

#### `services`（花のやサービスマスタ）
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL         -- サービス名
display_name    TEXT NOT NULL         -- レポート上の表示名
trigger_rules   TEXT NOT NULL         -- トリガー条件（自然言語。Claudeに渡す）
priority        INTEGER NOT NULL      -- 優先度（数値が小さいほど高優先）
is_active       BOOLEAN DEFAULT true  -- 花のやが一時的にオフにできる
created_at      TIMESTAMP
```

#### サービスマスタ 初期データ
| priority | name | display_name | trigger_rules |
|---|---|---|---|
| 1 | content_rewrite | コンテンツ改善 | 特定ページの順位下落・直帰率が高い・流入はあるのにCVしない |
| 2 | content_add | コンテンツ追加 | 狙えるキーワードがあるのに対応ページが存在しない・流入元が偏っている |
| 3 | seo | SEO強化 | 全体的に順位が低迷・競合に主要KWで抜かれた・新規流入が減少傾向・流入がほぼない |
| 4 | lp | LP改善 | 流入はあるのにCV数が目標未達・直帰率が高い |
| 5 | google_ads | Google広告 | 競合が同KWで広告出稿・繁忙期前で即効性が必要・流入もCVも少なく短期改善が必要 |
| 6 | sns_ads | SNS広告 | 検索流入は安定しているが認知拡大が必要・BtoC繁忙期前 |
| 7 | recruit | 採用サイト強化 | 採用関連KWの順位低下・採用ページへの流入が少ない |

#### `monthly_memos`（月次補足メモ）
```sql
id              UUID PRIMARY KEY
customer_id     UUID REFERENCES customers(id)
year_month      TEXT NOT NULL         -- 例: "2026-04"
memo            TEXT                  -- 今月の施策・変更点
exclude_services TEXT[]               -- 今月提案しないサービスID（管理者が手動除外）
created_at      TIMESTAMP
```

#### `reports`（レポート）
```sql
id              UUID PRIMARY KEY
customer_id     UUID REFERENCES customers(id)
year_month      TEXT NOT NULL
status          TEXT NOT NULL         -- draft / ready / sent
alert_level     INTEGER DEFAULT 1     -- 1:通常 / 2:要注意 / 3:深刻
subject         TEXT
body_html       TEXT
body_text       TEXT
ga4_data        JSONB
seo_data        JSONB
proposed_services TEXT[]              -- 今月提案したサービスID一覧
claude_raw      TEXT                  -- Claude生レスポンス保全用
replied_at      TIMESTAMP
converted_at    TIMESTAMP
sent_at         TIMESTAMP
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

---

## 3. 画面設計

### 画面一覧
1. 顧客一覧（ダッシュボード）
2. 顧客詳細・設定
3. レポート下書き・編集
4. メールプレビュー・送信
5. 送信履歴

---
### 色
強調色:#d2151a
その他は白、黒、グレー

### 3-1. 顧客一覧（ダッシュボード）

**URL:** `/dashboard`

**目的:** 今月のレポート進捗・アラートレベル・アップセル反応を一目で把握する

**表示項目:**
```
顧客名 | アラート | 今月ステータス     | 補足メモ  | 先月の反応  | 操作
A社   | -       | ✅ 送信済み（4/1） | -        | 返信あり💬  | [履歴]
B社   | ⚠️ L2  | ✏️ 下書きあり     | ⚠️未入力  | -          | [編集]
C社   | 🔴 L3  | ✏️ 下書きあり     | -        | -          | [編集]
D社   | -       | 🔴 未着手         | ⚠️未入力  | 受注🎉      | [生成開始]
E��   | -       | ❌ エラー         | -        | -          | [再実行]
```

**アラートレベルの表示：**
- L2（要注意）：⚠️ オレンジバッジ
- L3（深刻）：🔴 レッドバッジ＋行全体をハイライト
- L3の顧客は一覧の上部に自動的に浮上する

**月15日以降の追加表示：**
- 「先月送信分で返信・受注を未記録の顧客」がいる場合、ダッシュボード上部にバナーを表示
- 例：「💬 先月のレポートで未記録の反応が3件あります → 確認する」

---

### 3-2. 顧客詳細・設定

**URL:** `/customers/[id]`

#### ステップ1: 基本情報（初回登録・必須）
- 会社名 / 担当者名 / 送信先メールアドレス
- 対象ドメイン / GA4プロパティID / GA4コンバージョンイベント名（デフォルト: `contact`）

→ ここまで入力すれば一旦保存可能

#### ステップ2: ビジネス文脈（後から追加可・推奨）★刺さるレポートに必要
- 業種・提供サービスの概要
- 繁忙期・閑散期
- 月間CV目標件数
- 主要ページ一覧（URL + ページ目的 + CV貢献度%）
- 競合ドメイン（最大3つ）

#### ステップ3: 監視キーワード（後から追加可・必須）
- キーワード + 対応ページURL

#### セクション4: 今月の補足情報（毎月更新）★重要
- 今月の施策・変更点メモ（テキストエリア）
- 今月提案しないサービス（チェックボックスで除外）
  - 例：「先月Google広告を提案済みなので今月は除外」

#### 補足メモのリマインダー
- 毎月25日に管理者へリマインドメールを自動送信
- 未入力の顧客リストを本文に記載

---

### 3-3. レポート下書き・編集

**URL:** `/reports/[id]/edit`

**L3（深刻）の場合：** 編集画面の上部に赤いアラートバナーを表示
- 「この顧客のサイトは深刻な状況です。提言欄は自動的に『お電話でご説明』に設定されています。送信前に管理者の判断を確認してください。」

**レイアウト:**
```
左ペイン: 生データ参照        右ペイン: 編集エリア
- GA4サマリー                [ 件名                ]
- 順位変動リスト             ──────────────────────
- 競合動向                   [ サマリー            ]
- 前回レポートの提言          [ 良かった点          ]
- 今月の提案サービス一覧      [ 気になる点          ]
                             [ 提言①              ]
                             [ 提言②（あれば）     ]
                             [ 提言③（あれば）     ]
```

**機能:**
- セクションごとに個別編集可能
- 提言セクションは提案サービス数に応じて動的に増減
- [このセクションだけ再生成] ボタン
- [全体を再生成] ボタン
- 変更箇所のハイライト表示
- 提言セクション：管理者が提案を削除・並び替え可能
- [保存] → ステータスを `ready` に変更
- [プレビューへ進む] → 3-4へ

**重要:** この画面に送信ボタンは置かない

---

### 3-4. メールプレビュー・送信

**URL:** `/reports/[id]/preview`

- 件名プレビュー
- HTML形式でのメール表示
- 送信先メールアドレス確認
- [← 編集に戻る] / [送信する]（確認ダイアログあり）

**禁止事項:** 一括送信ボタンは初期実装に含めない

---

### 3-5. 送信履歴

**URL:** `/customers/[id]/history`

```
2026年4月 | 送信日：4/1 | 提案：SEO・LP改善 | 反応：- | [内容確認] [返信あり] [受注]
2026年3月 | 送信日：3/3 | 提案：コンテンツ改善 | 反応：返信💬 | [内容確認]
```

- [返信あり] → replied_at を記録
- [受注] → converted_at を記録
- 過去レポートを見ながら [今月の補足メモを入力] → 3-2のセクション4へ直接ジャンプ

---

## 4. メール設計

### 件名フォーマット
```
【花のや】{会社名}様サイト {月}度レポート｜{主要指標の変動}
例：【花のや】株式会社○○様サイト 4月度レポート｜訪問者数+12%
```

### 本文構成

```
{担当者名}様

お世話になっております。株式会社花のやです。
{月}度のサイトレポートをお届けします。

━━━━━━━━━━━━━━━━
📊 今月のサマリー
━━━━━━━━━━━━━━━━

訪問者数：{数値}人（先月比 {増減}）
問い合わせ数：{数値}件（先月比 {増減}）
検索順位：{主要KWの状況}

━━━━━━━━━━━━━━━━
📈 今月の動き
━━━━━━━━━━━━━━━━

【良かった点】
・{数字＋ビジネスへの影響まで踏み込んだコメント}

【気になる点】
・{数字＋放置した場合のリスクまで踏み込んだコメント}
・{競合情報：「このまま放置すると○ヶ月以内に〇位以内に入られる可能性」}

━━━━━━━━━━━━━━━━
💡 ご提案
━━━━━━━━━━━━━━━━

【L1・L2の場合：個別提案を列挙】
①{サービス名}
{具体的な改善内容と期待効果}

②{サービス名}（複数該当する場合）
{具体的な改善内容と期待効果}

【L3の場合：相談誘導】
現在のサイトの状況について、一度お電話でご説明させてください。
改善の方向性を一緒に考えさせていただければと思います。

━━━━━━━━━━━━━━━━

ご関心をお持ちいただいた項目がございましたら、このメールにご返信ください。
詳しいご説明のご用意は、いつでも対応可能です。

ご不明点があればいつでもご連絡ください。
引き続きよろしくお願いいたします。

株式会社花のや
〒460-0008 
名古屋市中区栄2-14-5 山本屋本店栄ビル7階
TEL 052-211-9898
https://www.hanano-ya.jp/
```

### メール設計の原則
- 専門用語を使わない（セッション→訪問者数）
- 結論をサマリーに先出し（ゴールファースト設計）
- 数字には「次の予測」または「放置コスト」を必ずセットで書く
- 競合情報は「このまま放置すると〇〇になる」という危機感の文脈で表現
- 提言に金額・別途ご相談は記載しない
- CTAは「返信してください」のみ（最小アクション）

---

## 5. Claude APIプロンプト設計

### システムプロンプト
```
あなたは株式会社花のやのWebマーケティング担当アシスタントです。
保守契約中のクライアントへ送る月次レポートを生成してください。

【絶対ルール】
- 専門用語を使わない（セッション→訪問者数、CVR→問い合わせ率）
- 結論を最初に書く
- 数字には必ず「次の予測」または「放置コスト」をセットで書く
- 競合が伸びている場合は「このまま放置すると〇〇になる」という危機感のある表現を使う
- 金額・費用は一切書かない
- 中小企業の社長が30秒で読めるボリュームにする
- 先月と同じサービスを提案する場合は切り口を変えて表現する

【アラートレベルの判定基準】
レベル1（通常）：一部の指標が改善余地あり。個別提案を出す。
レベル2（要注意）：複数の指標が悪化傾向。提案は出すが冒頭に現状の深刻さを一言添える。
レベル3（深刻）：流入もCVも順位も全て低迷、かつ改善の兆しがない。提案より相談誘導を優先する。
  → L3の判定条件：訪問者数が目標の50%未満 かつ CV数が0〜1件 かつ 主要KWが全て20位以下

【サービス提案のルール】
- サービスマスタのトリガー条件に該当するものを全て提案する
- ただし exclude_services に含まれるものは除外する
- 優先度順に並べる
- L3の場合は提案を出さず、相談誘導文のみ出力する
- 先月提案したサービス（last_month_services）と同じものは切り口を変えて表現する
```

### ユーザープロンプト（データを渡す構造）
```json
{
  "company": {
    "name": "株式会社○○",
    "contact": "△△様",
    "domain": "example.co.jp",
    "industry": "外壁塗装業",
    "service_description": "住宅・商業施設の外壁塗装・屋根塗装",
    "busy_season": "4〜6月・9〜11月",
    "cv_goal_monthly": 10,
    "maintenance_months": 18,
    "pages": [
      {"url": "/", "purpose": "集客", "cv_contribution": 10},
      {"url": "/price/", "purpose": "CV", "cv_contribution": 40},
      {"url": "/contact/", "purpose": "CV", "cv_contribution": 50}
    ]
  },
  "this_month": "2026-04",
  "memo": "料金ページを全面改修した",
  "exclude_services": [],
  "last_month_services": ["seo"],
  "services_master": [
    {"id": "content_rewrite", "display_name": "コンテンツ改善", "priority": 1, "trigger_rules": "特定ページの順位下落・直帰率高い・流入はあるのにCVしない"},
    {"id": "content_add", "display_name": "コンテンツ追加", "priority": 2, "trigger_rules": "狙えるKWがあるのに対応ページが存在しない"},
    {"id": "seo", "display_name": "SEO強化", "priority": 3, "trigger_rules": "全体的に順位低迷・競合に主要KWで抜かれた・流入がほぼない"},
    {"id": "lp", "display_name": "LP改善", "priority": 4, "trigger_rules": "流入はあるのにCV数が目標未達"},
    {"id": "google_ads", "display_name": "Google広告", "priority": 5, "trigger_rules": "競合が広告出稿・繁忙期前で即効性が必要・流入もCVも少ない"},
    {"id": "sns_ads", "display_name": "SNS広告", "priority": 6, "trigger_rules": "認知拡大が必要・BtoC繁忙期前"},
    {"id": "recruit", "display_name": "採用サイト強化", "priority": 7, "trigger_rules": "採用KWの順位低下・採用ページ流入減"}
  ],
  "ga4": {
    "sessions": {"current": 1240, "previous": 1107, "diff_pct": 12},
    "conversions": {"current": 8, "previous": 6, "diff": 2},
    "channels": {"organic": 65, "direct": 20, "referral": 15},
    "same_period_last_year": {"sessions": 1148}
  },
  "seo": {
    "keywords": [
      {"keyword": "○○ 名古屋", "current_rank": 5, "previous_rank": 8, "url": "/service/"},
      {"keyword": "○○ 料金", "current_rank": 18, "previous_rank": 15, "url": "/price/"}
    ],
    "competitors": [
      {
        "domain": "competitor-a.co.jp",
        "trend": "上昇",
        "rank_change": "+5positions",
        "keywords_overlap": ["○○ 料金"],
        "threat_comment": "○○料金キーワードで急上昇中"
      }
    ]
  }
}
```

### 出力フォーマット
```json
{
  "alert_level": 1,
  "subject_suffix": "訪問者数+12%",
  "summary": "...",
  "good_points": ["数字＋ビジネス影響のコメント", "..."],
  "concern_points": ["数字＋放置コストのコメント", "..."],
  "proposals": [
    {
      "service_id": "content_rewrite",
      "display_name": "コンテンツ改善",
      "body": "「○○ 料金」ページの見出しと料金表を整理するだけで順位が戻る可能性があります。放置すると競合に抜かれるリスクがあります。"
    },
    {
      "service_id": "lp",
      "display_name": "LP改善",
      "body": "..."
    }
  ],
  "alert_message": null
}
```

※ L3の場合は `proposals` を空配列にし、`alert_message` に相談誘導文を入れる

---

## 6. バッチ処理設計

### 実行タイミング
- 毎月1日 AM 6:00 に自動実行（Vercel Cron Jobs）
- データ取得対象は**前月1日〜末日**

### 処理フロー
```
1. customers テーブルから is_active=true の全顧客取得
2. services テーブルから is_active=true の全サービス取得
3. 各顧客に対して：
   a. GA4 APIからデータ取得（前月 vs 前々月・前年同月）
   b. DataForSEO APIから順位データ取得
   c. DataForSEO APIから競合ドメイン分析取得
   d. 前月の proposed_services を reports から取得
   e. 当月の monthly_memos から exclude_services を取得
   f. 取得データを reports テーブルに保存
   g. Claude API へ全データ渡してレポート生成
   h. JSON パース（失敗時は最大2回再試行・claude_raw に保存）
   i. alert_level を reports テーブルに保存
   j. ステータスを draft → ready に更新
4. エラー顧客はステータスを error に設定
5. 完了通知を管理者へ送信（生成完了N社・L3アラートN社・エラーN社）

【毎月25日の追加バッチ】
- 補足メモ未入力の顧客リストを集計
- 管理者へリマインドメールを送信
```

### エラーハンドリング
- 各APIコール失敗時：3回リトライ（指数バックオフ）
- リトライ後も失敗：ステータスを `error` に設定
- Claude APIのJSONパースエラー：最大2回再生成、失敗時は `claude_raw` に保存して `error` に設定

---

## 7. GA4 API 設定

### 認証方式
- サービスアカウントJSONキーを環境変数に設定
- 全保守顧客のGA4プロパティに閲覧者として追加済み

### 取得データ
```javascript
metrics: ['sessions', 'conversions', 'newUsers', 'bounceRate']
dimensions: ['sessionDefaultChannelGroup']
dateRanges: [
  { 前月1日〜末日 },
  { 前々月1日〜末日 },
  { 前年同月1日〜末日 }
]
// コンバージョンイベント名は customers.ga4_conversion_event を使用
```

---

## 8. DataForSEO API 設定

### 認証
`DATAFORSEO_API_KEY=base64(login:password)`

### 取得データ①：キーワード順位
```
エンドポイント: /v3/serp/google/organic/live/advanced
パラメータ: keyword / location_code: 1009564（日本）/ language_code: ja / device: desktop
```

### 取得データ②：競合ドメイン分析
```
エンドポイント: /v3/dataforseo_labs/google/competitors_domain/live
パラメータ: target（顧客ドメイン）/ language_code: ja / location_code: 1009564
```

---

## 9. 環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_SERVICE_ACCOUNT_JSON=
DATAFORSEO_API_KEY=
ANTHROPIC_API_KEY=
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=m.hanaoka@hanano-ya.jp
SENDGRID_FROM_NAME=花岡正和（株式会社花のや）
CRON_SECRET=
```

---

## 10. ディレクトリ構成

```
/
├── app/
│   ├── dashboard/page.tsx
│   ├── customers/
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── history/page.tsx
│   │   └── new/page.tsx
│   ├── reports/
│   │   └── [id]/
│   │       ├── edit/page.tsx
│   │       └── preview/page.tsx
│   └── api/
│       ├── cron/
│       │   ├── monthly/route.ts
│       │   └── reminder/route.ts
│       ├── reports/
│       │   ├── generate/route.ts
│       │   └── send/route.ts
│       ├── ga4/route.ts
│       └── dataforseo/route.ts
├── components/
│   ├── dashboard/
│   │   ├── CustomerTable.tsx
│   │   ├── StatusBadge.tsx
│   │   └── AlertBanner.tsx
│   ├── customers/
│   │   ├── CustomerForm.tsx
│   │   ├── KeywordList.tsx
│   │   └── MonthlyMemoForm.tsx
│   └── reports/
│       ├── ReportEditor.tsx
│       ├── SectionEditor.tsx
│       ├── ProposalList.tsx
│       └── EmailPreview.tsx
├── lib/
│   ├── supabase.ts
│   ├── ga4.ts
│   ├── dataforseo.ts
│   ├── claude.ts
│   └── sendgrid.ts
└── vercel.json
```

---

## 11. vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly",
      "schedule": "0 21 1 * *"
    },
    {
      "path": "/api/cron/reminder",
      "schedule": "0 21 24 * *"
    }
  ]
}
```

※ monthly：毎月1日 AM6:00 JST（UTC前日21:00）、対象は前月データ
※ reminder：毎月25日 AM6:00 JST（UTC前日21:00）

---

## 12. 開発フェーズ

### Phase 1（1週間）：動くプロトタイプ
- [ ] Supabaseセットアップ・スキーマ作成（servicesテーブル含む）
- [ ] GA4データ取得（前月・前々月・前年同月の3期間）
- [ ] DataForSEO順位・競合取得
- [ ] Claude生成（アラートレベル判定・複数提案・刺さる文体）
- [ ] SendGridメール送信
- CLIで1社分が動けばOK

### Phase 2（1週間）：プロンプト精度改善
- [ ] アラートレベル判定の精度チェック
- [ ] 複数提案の並び順・文体の調整
- [ ] 競合の危機感表現の調整
- [ ] 「刺さる」コメントの品質確認（業種・繁忙期・目標件数が効いているか）

### Phase 3（1週間）：管理画面
- [ ] 顧客一覧（アラートレベル表示・反応記録バナー）
- [ ] 顧客詳細・設定（ビジネス文脈入力欄追加）
- [ ] レポート編集（複数提案の並び替え・削除対応）
- [ ] メールプレビュー・送信
- [ ] 送信履歴（返信・受注記録）

### Phase 4（3日）：バッチ・仕上げ
- [ ] Vercel Cron Jobs設定（月次・リマインド）
- [ ] エラーハンドリング全体
- [ ] 本番環境デプロイ

---

## 13. 制約・注意事項

### やらないこと（初期実装）
- 一括送信ボタン
- 顧客へのダッシュボード提供
- 自動送信
- キーワード自動抽出

### コスト試算（50社規模）
| コスト項目 | 月額目安 |
|---|---|
| DataForSEO（順位＋競合×50社） | 約$5〜10（750〜1,500円） |
| Claude API（50レポート生成） | 約$3〜6（450〜900円） |
| SendGrid | 無料枠内 |
| Vercel | 無料枠内 |
| **合計** | **約1,200〜2,400円/月** |

### GA4権限
全保守契約顧客の閲覧権限取得済み。新規顧客追加時は花のやのサービスアカウントを閲覧者として追加する運用とする。