# 志勇防水 · 公开链接上线指南

目标：**客户和管理员通过 HTTPS 公开链接，读写同一份云端数据**（不再用 localStorage）。

```
客户手机（抖音链接）          管理员手机（admin 链接）
        │                              │
        └──────────┬───────────────────┘
                   ▼
            Supabase 云数据库
         + Edge Functions（API）
                   ▲
            Vercel 托管静态页
```

预计耗时：**约 1～2 小时**（首次注册账号）。

---

## 第一步：Supabase 建库（约 20 分钟）

1. 打开 https://supabase.com 注册并 **New Project**
2. 进入 **SQL Editor** → New query
3. 粘贴并执行 [`supabase/deploy.sql`](./supabase/deploy.sql) 全部内容
4. 记下 **Project Settings → API** 里的：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon` `public` key（可放前端，不是秘密）

---

## 第二步：部署 Edge Functions（约 30 分钟）

### 方式 A：Supabase 网页（无需 CLI）

1. **Project Settings → Edge Functions → Secrets**，添加：

   | 名称 | 值 |
   |------|-----|
   | `SUPABASE_URL` | 你的 Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → `service_role`（**勿公开**） |
   | `SERVER_CHAN_KEY_1` | 志勇师傅的 Server酱 SendKey（可选，先留空也能测留资） |
   | `SERVER_CHAN_KEY_2` | 副手的 SendKey（可选） |
   | `ADMIN_BASE_URL` | 先填 `https://临时.vercel.app/admin.html`，Vercel 部署后再改 |

2. **Edge Functions** 分别创建并粘贴代码：
   - `create-lead` ← [`supabase/functions/create-lead/index.ts`](./supabase/functions/create-lead/index.ts)
   - `admin-api` ← [`supabase/functions/admin-api/index.ts`](./supabase/functions/admin-api/index.ts)

3. 两个函数均设为 **Verify JWT = OFF**（用 service_role 在函数内操作）

### 方式 B：Supabase CLI（熟悉命令行时）

```bash
npm i -g supabase
supabase login
supabase link --project-ref 你的项目ID
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
supabase functions deploy create-lead --no-verify-jwt
supabase functions deploy admin-api --no-verify-jwt
```

---

## 第三步：前端切到云端模式（约 5 分钟）

```bash
copy js\config.local.js.example js\config.local.js
```

编辑 `js/config.local.js`：

```javascript
window.__APP_CONFIG_OVERRIDE__ = {
  DEMO_MODE: false,
  SUPABASE_URL: 'https://你的项目.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...你的anon公钥',
  CREATE_LEAD_URL: 'https://你的项目.supabase.co/functions/v1/create-lead',
  ADMIN_API_URL: 'https://你的项目.supabase.co/functions/v1/admin-api',
};
```

本地验证：用 **Live Server 或任意静态服务器** 打开（不要双击 file://），提交一条 → 再开 admin 登录，应能看到同一条。

> `config.local.js` 已在 `.gitignore`，不会误提交。

---

## 第四步：Vercel 公开链接（约 15 分钟）

1. 打开 https://vercel.com ，用 GitHub 导入本项目（或 `vercel` CLI 部署）
2. 部署完成后得到：`https://你的项目.vercel.app`
3. **把 `config.local.js` 的内容合并进仓库** 有两种做法：
   - **推荐**：部署前把 `config.local.js` 里的 Supabase 地址写进 `js/config.js` 并设 `DEMO_MODE: false`（anon key 本来就会暴露在前端）
   - 或：把 `config.local.js` 一并上传（仅 anon key，仍安全）
4. 回 Supabase Secrets 更新 `ADMIN_BASE_URL` 为：  
   `https://你的项目.vercel.app/admin.html`

### 对外链接

| 用途 | 链接 |
|------|------|
| 抖音客户留资 | `https://你的项目.vercel.app/?from=douyin` |
| 管理员工作台 | `https://你的项目.vercel.app/admin.html`（勿公开到抖音） |

默认账号：`admin1` / `admin2`，密码 `changeme123` — **上线后立即改密码**（见 [`supabase/seed_admins.sql`](./supabase/seed_admins.sql) 注释）。

---

## 第五步：验收（5 分钟）

1. 手机打开客户链接，提交一条意向单
2. 另一台手机（或电脑）打开 admin，登录后 **必须看到刚提交的单**
3. 若配置了 Server酱，两人微信应收推送
4. 页顶 **不再显示黄色「预览模式」** 条

---

## 常见问题

**Q：客户提交了，管理员看不到？**  
- 检查 `DEMO_MODE` 是否为 `false`  
- 检查 Edge Functions 是否部署成功（Supabase → Edge Functions → Logs）  
- 客户和管理员必须都走 **HTTPS 公开链接**，不能一个用 localStorage 演示、一个用云端

**Q：能否不用 Vercel？**  
- 可以，任何 HTTPS 静态托管均可（Cloudflare Pages、Netlify、自己的 Nginx）

**Q：数据存在哪？**  
- Supabase PostgreSQL（悉尼/新加坡等区域可在建项目时选离中国近的）

---

详细手机配置见 [SETUP.md](./SETUP.md)。
