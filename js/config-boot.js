/** 在 config.local.js 之后执行，校验云端配置是否有效 */
(function () {
  var c = window.APP_CONFIG;
  if (
    !c.DEMO_MODE &&
    (c.CREATE_LEAD_URL.indexOf('YOUR_PROJECT') >= 0 ||
      c.SUPABASE_ANON_KEY.indexOf('YOUR_ANON') >= 0)
  ) {
    console.warn('[志勇防水] Supabase 未配置完整，已回退 DEMO_MODE');
    c.DEMO_MODE = true;
  }
})();
