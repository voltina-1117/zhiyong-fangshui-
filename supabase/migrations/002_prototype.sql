-- 雏形对齐：leads 表增加 problem_type
-- 在已有 001_init.sql 部署后执行

ALTER TABLE leads ADD COLUMN IF NOT EXISTS problem_type text;

COMMENT ON COLUMN leads.problem_type IS '客户选择的大致问题类型';

-- 历史数据可为空；新提交由 create-lead 强制必填
