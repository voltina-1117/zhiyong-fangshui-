-- ============================================================
-- 志勇防水 · 一键建库（Supabase SQL Editor 粘贴执行）
-- 执行顺序：本文件 → 再部署 Edge Functions → 再改 config.local.js
-- ============================================================

-- 意向单
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_no text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL,
  location text NOT NULL,
  problem_type text NOT NULL,
  urgency text NOT NULL DEFAULT '',
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

-- 管理员
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_daily_seq (
  day date PRIMARY KEY,
  seq int NOT NULL DEFAULT 0
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_daily_seq ENABLE ROW LEVEL SECURITY;

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

-- 若从旧版 001 升级，补 problem_type
ALTER TABLE leads ADD COLUMN IF NOT EXISTS problem_type text;
UPDATE leads SET problem_type = '不确定，需先看现场' WHERE problem_type IS NULL;
ALTER TABLE leads ALTER COLUMN problem_type SET NOT NULL;

-- 管理员（默认密码 changeme123，上线后务必修改）
INSERT INTO admin_users (username, password_hash, display_name) VALUES
  ('admin1', '$2b$10$nUeLUeppYbNJ5v6VmEi0MueaBLswB3AtFSAgo.p/OoY/Sya/bycu.', '志勇师傅'),
  ('admin2', '$2b$10$nUeLUeppYbNJ5v6VmEi0MueaBLswB3AtFSAgo.p/OoY/Sya/bycu.', '副手')
ON CONFLICT (username) DO UPDATE SET display_name = EXCLUDED.display_name;
