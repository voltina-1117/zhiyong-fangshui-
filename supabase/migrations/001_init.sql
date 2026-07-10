-- 意向单表
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_no text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  location text NOT NULL,
  urgency text NOT NULL,
  priority int NOT NULL DEFAULT 3,
  description text NOT NULL,
  source text NOT NULL DEFAULT 'direct',
  status text NOT NULL DEFAULT '意向待联系',
  survey_note text,
  solution text,
  quote_amount numeric(10,2),
  final_amount numeric(10,2),
  payment_status text DEFAULT 'unpaid',
  paid_at timestamptz,
  last_operator text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_priority_created ON leads (priority ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone_created ON leads (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);

-- 管理员（2人）
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 登录会话
CREATE TABLE IF NOT EXISTS admin_sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 当日序号（意向单号）
CREATE TABLE IF NOT EXISTS lead_daily_seq (
  day date PRIMARY KEY,
  seq int NOT NULL DEFAULT 0
);

-- RLS：禁止 anon 直接读写业务表（仅 Edge Function 用 service_role）
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_daily_seq ENABLE ROW LEVEL SECURITY;

-- 无公开 policy = 客户端 anon 无法直连

-- 初始管理员请在部署后执行 supabase/seed_admins.sql（密码勿提交 git）

CREATE OR REPLACE FUNCTION touch_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated ON leads;
CREATE TRIGGER trg_leads_updated
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION touch_leads_updated_at();
