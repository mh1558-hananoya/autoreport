export interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  domain: string;
  ga4_property_id: string;
  ga4_conversion_event: string;
  industry: string | null;
  service_description: string | null;
  busy_season: string | null;
  cv_goal_monthly: number | null;
  maintenance_start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerKeyword {
  id: string;
  customer_id: string;
  keyword: string;
  target_url: string | null;
  created_at: string;
}

export interface CustomerCompetitor {
  id: string;
  customer_id: string;
  competitor_domain: string;
  created_at: string;
}

export interface CustomerPage {
  id: string;
  customer_id: string;
  url: string;
  purpose: string;
  description: string | null;
  cv_contribution: number | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  display_name: string;
  trigger_rules: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface MonthlyMemo {
  id: string;
  customer_id: string;
  year_month: string;
  memo: string | null;
  exclude_services: string[] | null;
  created_at: string;
}

export interface Report {
  id: string;
  customer_id: string;
  year_month: string;
  status: 'draft' | 'ready' | 'sent' | 'error';
  alert_level: number;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  ga4_data: GA4Data | null;
  seo_data: SEOData | null;
  proposed_services: string[] | null;
  claude_raw: string | null;
  replied_at: string | null;
  converted_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// GA4 data structures
export interface GA4Data {
  sessions: { current: number; previous: number; diff_pct: number };
  active_users: { current: number; previous: number; diff_pct: number };
  new_users: { current: number; previous: number; diff_pct: number };
  page_views: { current: number; previous: number; diff_pct: number };
  bounce_rate: { current: number; previous: number };
  avg_session_duration: { current: number; previous: number };
  engaged_sessions: { current: number; previous: number };
  event_count: { current: number; previous: number };
  channels: Record<string, number>;
  devices: Record<string, number>;
  same_period_last_year: { sessions: number };
}

// SEO data structures
export interface SEOKeywordData {
  keyword: string;
  current_rank: number | null;
  previous_rank: number | null;
  url: string;
}

export interface SEOCompetitorData {
  domain: string;
  trend: string;
  rank_change: string;
  keywords_overlap: string[];
  threat_comment: string;
}

export interface SEOData {
  keywords: SEOKeywordData[];
  competitors: SEOCompetitorData[];
}

// Claude API response
export interface ClaudeReportResponse {
  alert_level: number;
  subject_suffix: string;
  summary: string;
  good_points: string[];
  concern_points: string[];
  proposals: {
    service_id: string;
    display_name: string;
    body: string;
  }[];
  alert_message: string | null;
}

// Dashboard view
export interface CustomerDashboardRow {
  id: string;
  company_name: string;
  alert_level: number;
  status: string;
  has_memo: boolean;
  last_month_replied: boolean;
  last_month_converted: boolean;
  report_id: string | null;
  sent_at: string | null;
}
