-- 花のや 月次レポート自動化ツール DBスキーマ

-- 顧客マスタ
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  domain TEXT NOT NULL,
  ga4_property_id TEXT NOT NULL,
  ga4_conversion_event TEXT DEFAULT 'contact',
  industry TEXT,
  service_description TEXT,
  busy_season TEXT,
  cv_goal_monthly INTEGER,
  maintenance_start_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 監視キーワード
CREATE TABLE customer_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  target_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 競合ドメイン
CREATE TABLE customer_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  competitor_domain TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 主要ページ情報
CREATE TABLE customer_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  purpose TEXT NOT NULL,
  description TEXT,
  cv_contribution INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 花のやサービスマスタ
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  trigger_rules TEXT NOT NULL,
  priority INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- サービスマスタ初期データ
INSERT INTO services (name, display_name, trigger_rules, priority) VALUES
  ('content_rewrite', 'コンテンツ改善', '特定ページの順位下落・直帰率が高い・流入はあるのにCVしない', 1),
  ('content_add', 'コンテンツ追加', '狙えるキーワードがあるのに対応ページが存在しない・流入元が偏っている', 2),
  ('seo', 'SEO強化', '全体的に順位が低迷・競合に主要KWで抜かれた・新規流入が減少傾向・流入がほぼない', 3),
  ('lp', 'LP改善', '流入はあるのにCV数が目標未達・直帰率が高い', 4),
  ('google_ads', 'Google広告', '競合が同KWで広告出稿・繁忙期前で即効性が必要・流入もCVも少なく短期改善が必要', 5),
  ('sns_ads', 'SNS広告', '検索流入は安定しているが認知拡大が必要・BtoC繁忙期前', 6),
  ('recruit', '採用サイト強化', '採用関連KWの順位低下・採用ページへの流入が少ない', 7);

-- 月次補足メモ
CREATE TABLE monthly_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  memo TEXT,
  exclude_services TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, year_month)
);

-- レポート
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  alert_level INTEGER DEFAULT 1,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  ga4_data JSONB,
  seo_data JSONB,
  proposed_services TEXT[],
  claude_raw TEXT,
  replied_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, year_month)
);

-- インデックス
CREATE INDEX idx_customer_keywords_customer ON customer_keywords(customer_id);
CREATE INDEX idx_customer_competitors_customer ON customer_competitors(customer_id);
CREATE INDEX idx_customer_pages_customer ON customer_pages(customer_id);
CREATE INDEX idx_monthly_memos_customer_month ON monthly_memos(customer_id, year_month);
CREATE INDEX idx_reports_customer_month ON reports(customer_id, year_month);
CREATE INDEX idx_reports_status ON reports(status);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
