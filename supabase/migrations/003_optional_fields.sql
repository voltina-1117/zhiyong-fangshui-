-- 已执行 001 的旧库：姓名、紧急程度改为可选（与雏形表单一致）
ALTER TABLE leads ALTER COLUMN name SET DEFAULT '';
ALTER TABLE leads ALTER COLUMN urgency SET DEFAULT '';
