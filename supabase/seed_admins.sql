-- 部署后在 Supabase SQL Editor 执行
-- 默认密码均为 changeme123，登录后请尽快在库中更新 password_hash
-- 生成新 hash：node -e "console.log(require('bcryptjs').hashSync('你的密码', 10))"

INSERT INTO admin_users (username, password_hash, display_name) VALUES
  ('admin1', '$2b$10$nUeLUeppYbNJ5v6VmEi0MueaBLswB3AtFSAgo.p/OoY/Sya/bycu.', '志勇师傅'),
  ('admin2', '$2b$10$nUeLUeppYbNJ5v6VmEi0MueaBLswB3AtFSAgo.p/OoY/Sya/bycu.', '副手')
ON CONFLICT (username) DO NOTHING;

-- changeme123 的 bcrypt hash（bcryptjs, rounds=10）
