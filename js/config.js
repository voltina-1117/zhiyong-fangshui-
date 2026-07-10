/**
 * 站点配置（会随 Vercel 一起部署，所有人共用）
 * 本地若需离线演示：新建 js/config.local.js 设 DEMO_MODE: true
 */
window.APP_CONFIG = {
  DEMO_MODE: false,

  BRAND_NAME: '志勇防水',
  BOSS_PHONE: '13022222222',

  SUPABASE_URL: 'https://xfziiwiokbcebumshklq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_q8avNsPdMg0e5ScOURUqnQ_TPa1mFEV',
  CREATE_LEAD_URL: 'https://xfziiwiokbcebumshklq.supabase.co/functions/v1/create-lead',
  ADMIN_API_URL: 'https://xfziiwiokbcebumshklq.supabase.co/functions/v1/admin-api',

  /** 同一手机号/设备提交间隔（毫秒） */
  SUBMIT_COOLDOWN_MS: 60 * 1000,
};

window.PROBLEM_TYPE_OPTIONS = [
  { value: '卫生间/厨房漏水', defaultPriority: 2 },
  { value: '屋面/顶层漏水', defaultPriority: 2 },
  { value: '外墙/窗户渗雨', defaultPriority: 2 },
  { value: '地下室/潮湿发霉', defaultPriority: 2 },
  { value: '楼下投诉/邻里纠纷', defaultPriority: 1 },
  { value: '不确定，需先看现场', defaultPriority: 3 },
];

window.URGENCY_OPTIONS = [
  { value: '紧急（需尽快处理）', label: '紧急 — 需尽快处理', priority: 1 },
  { value: '较急（希望这几天看）', label: '较急 — 希望这几天看', priority: 2 },
  { value: '一般（可预约时间）', label: '一般 — 可预约时间', priority: 3 },
];

window.LEAD_STATUSES = [
  '意向待联系', '已联系', '已预约查勘', '已查勘', '方案已报价',
  '维修中', '待平台付款', '已完成', '已取消',
];

window.STATUS_TABS = ['全部', '意向待联系', '已联系', '已预约查勘', '维修中', '待平台付款'];

window.DEMO_ADMINS = {
  admin1: { password: 'changeme123', display_name: '志勇师傅' },
  admin2: { password: 'changeme123', display_name: '副手' },
};

window.computeLeadPriority = function (urgency, problemType) {
  if (urgency) {
    var u = window.URGENCY_OPTIONS.find(function (o) { return o.value === urgency; });
    if (u) return u.priority;
  }
  var p = window.PROBLEM_TYPE_OPTIONS.find(function (o) { return o.value === problemType; });
  return p ? p.defaultPriority : 3;
};
