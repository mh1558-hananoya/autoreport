# autoreport — 花のや 月次レポート自動化ツール

保守契約中の顧客向けに、月次のサイト分析レポートを自動生成・編集・メール送信する社内向けNext.jsアプリです。対象月は常に「前月」（例：4月に開くと3月度レポート）。

## 技術スタック

- **Next.js 15**（App Router）+ TypeScript + Tailwind CSS
- **Supabase**（PostgreSQL）— データ保存
- **GA4 Data API v1** — アクセス解析データ取得
- **DataForSEO API** — キーワード順位・競合分析
- **Claude API（Sonnet）** — レポート文章の生成
- **SendGrid** — メール送信
- **NextAuth.js** — 社内共有パスワード認証（Credentials方式）

## セットアップ

```bash
npm install
cp .env.local.example .env.local   # 各APIキー・認証情報を記入
npm run dev                        # http://localhost:3000
```

### 主な環境変数（`.env.local`）

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase接続 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | GA4・Search Console用サービスアカウント鍵 |
| `DATAFORSEO_API_KEY` | DataForSEO認証（Base64） |
| `ANTHROPIC_API_KEY` | Claude API |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` / `SENDGRID_FROM_NAME` | メール送信 |
| `APP_PASSWORD` | 社内共有ログインパスワード |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | NextAuth |
| `CRON_SECRET` | Vercel Cronの認可 |

> ⚠️ 認証情報ファイル（`autoreport-*.json` 等）は `.gitignore` 済み。コミットしないこと。

## 設計上の重要な方針

- **コンバージョン（CV）には言及しない**：フォーム営業ノイズが多く、問い合わせ数＝見込み客数ではないため。GA4から確実に取れる指標（訪問者数・PV・直帰率・端末・流入経路・滞在時間等）のみ使用。
- **ですます調を徹底**：Claudeプロンプトで敬体を強制。
- **アラート判定**：訪問者数前月比30%以上減 + 直帰率60%以上 + 主要KW全て20位以下 で L3。

## バッチ処理（Vercel Cron）

`vercel.json` で定義：

- 月次レポート生成：毎月1日 21:00（`/api/cron/monthly`）
- 補足メモ未入力リマインド：毎月24日 21:00（`/api/cron/reminder`）

## ディレクトリ

- `app/` — 画面・APIルート
- `components/` — UIコンポーネント（`components/ui/kit.tsx` が共通UIキット）
- `lib/` — 外部API連携（`ga4` / `gsc` / `dataforseo` / `claude` / `sendgrid` / `supabase`）
- `supabase/` — スキーマ・初期データ
- `prompt.md` — 要件定義書
