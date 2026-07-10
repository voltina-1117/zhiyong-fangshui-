# 志勇防水 · 意向单管理系统（雏形）

抖音渠道客户留资，内部双人跟进，维修款项经平台结算。

## 本地预览（股东演示）

用浏览器直接打开（建议 F12 切换手机模式，宽度 375px）：

| 页面 | 文件 | 说明 |
|------|------|------|
| 客户留资 | [index.html](./index.html) | 必填：手机、位置、**问题类型**、描述 |
| 提交成功 | [success.html](./success.html) | 提交后跳转，展示单号 |
| 管理端 | [admin.html](./admin.html) | 账号 `admin1` 或 `admin2`，密码 `changeme123` |

- 默认 `DEMO_MODE: true`：数据只在**本机浏览器** localStorage，适合演示  
- 顶部黄条「预览模式」表示尚未接云端  

## 公开链接上线（客户与管理员共享数据）

**不能靠双击 HTML 接单。** 要挂抖音、多人看同一份单，按 **[DEPLOY.md](./DEPLOY.md)** 部署 Supabase + Vercel（约 1～2 小时）：

1. Supabase 执行 `supabase/deploy.sql`  
2. 部署 Edge Functions `create-lead`、`admin-api`  
3. 复制 `js/config.local.js.example` → `config.local.js`，设 `DEMO_MODE: false`  
4. Vercel 部署得到 `https://xxx.vercel.app`  

客户链：`https://你的域名/?from=douyin`  
管理链：`https://你的域名/admin.html`（勿公开到抖音）

## 文档

- 需求规格（V1.1 雏形）：[docs/00-软件需求规格说明书.md](./docs/00-软件需求规格说明书.md)
- 文档索引：[docs/README.md](./docs/README.md)
- 部署说明：[DEPLOY.md](./DEPLOY.md)（公开链接 + 云端数据库）
- 手机配置：[SETUP.md](./SETUP.md)

## 技术栈

H5 + Supabase + Vercel + Server酱（雏形阶段仅本地 HTML/JS 预览）
