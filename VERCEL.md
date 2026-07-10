# 志勇防水 · 3 步拿到公开链接

Supabase 云端已就绪。还差 **Vercel 部署**，别人才能用链接打开（不限于你这台电脑）。

---

## 当前状态

| 项目 | 状态 |
|------|------|
| Supabase 数据库 + 两个函数 | ✅ 已完成 |
| `js/config.js` 云端配置 | ✅ 已写入（会随网站一起发布） |
| 公开 HTTPS 链接 | ❌ **还需 Vercel** |

---

## 第一步：代码推到 GitHub（约 10 分钟）

仓库地址：**https://github.com/voltina-1117/zhiyong-fangshui-**

本地已执行：`git init`、首次提交、`remote` 已指向上述仓库。  
若网页仍显示 empty，在本机终端执行一次：

```powershell
cd "C:\Users\zwpd\Desktop\防水"
git push -u origin main
```

（首次 push 会弹出 GitHub 登录；连不上 github.com 时可开 VPN 或换手机热点）

### 若尚未初始化（其他电脑）

1. 打开 https://github.com/new 新建仓库，名如 `zhiyong-fangshui`，**不要**勾选 README
2. 在本项目文件夹打开终端，执行：

```powershell
cd "C:\Users\zwpd\Desktop\防水"
git init
git add .
git commit -m "志勇防水 H5 上线"
git branch -M main
git remote add origin https://github.com/voltina-1117/zhiyong-fangshui-.git
git push -u origin main
```

---

## 第二步：Vercel 部署（约 5 分钟）

1. 打开 https://vercel.com ，用 **GitHub 登录**
2. **Add New → Project**
3. 选中刚推送的 `zhiyong-fangshui` 仓库 → **Import**
4. Framework 选 **Other**（纯静态 HTML，不用改构建命令）
5. 点 **Deploy**，等 1～2 分钟

完成后得到地址，例如：

```
https://zhiyong-fangshui.vercel.app
```

---

## 第三步：发给大家的链接

| 用途 | 链接 |
|------|------|
| **抖音 / 客户留资** | `https://你的域名.vercel.app/?from=douyin` |
| **志勇师傅 / 副手管理** | `https://你的域名.vercel.app/admin.html` |

任何人用手机打开客户链接提交 → 管理员打开 admin 登录 → **看到的是同一份云端数据**。

---

## 部署后可选：Server酱 管理页链接

Supabase → Edge Functions → **Secrets** 添加：

```
ADMIN_BASE_URL = https://你的域名.vercel.app/admin.html
```

（微信推送以后配 SendKey 时用）

---

## 不想用 GitHub？

Vercel 网页也支持 **Vercel CLI** 直接上传文件夹，或把 zip 导入。最简单仍是 GitHub + Vercel 一键导入。

---

## 说明

- **`sb_publishable_...` 可以写在 config.js 里**，本来就是给浏览器用的公钥，不是秘密
- **不要**把 `service_role` 密钥写进前端
- 管理密码 `changeme123` 上线后尽快在 Supabase 里改掉
