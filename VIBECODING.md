# Vibecoding 开发指南

> 需求基线：[docs/00-前期需求确认.md](./docs/00-前期需求确认.md)  
> 业务：**抖音留资 → 意向单 → 查勘报价 → 维修 → 平台付款**

---

## 状态

| 项 | 状态 |
|----|------|
| 需求 | ✅ 已调整为意向单 + 平台付款模式 |
| 第一期 | 留资 + 管理全流程 + 收款人工确认 |
| 第二期 | 微信/支付宝支付 API |
| 代码 | ⏳ 未开始 |

---

## 第一期实现顺序（待开写）

1. Supabase `leads` 表 + Storage + RLS  
2. Edge Functions：`create-lead`、`admin-api`  
3. `index.html` 留资页（抖音适配）+ `success.html`  
4. `admin.html` 状态机 + 报价 + 确认收款  
5. Server酱 + Vercel 部署  
6. 抖音链接挂测  

确认需求无误后说 **「按 00 文档写代码」**。
