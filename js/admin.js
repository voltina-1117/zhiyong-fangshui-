(function () {
  var cfg = window.APP_CONFIG;
  var TOKEN_KEY = 'admin_token';
  var USER_KEY = 'admin_user';
  var POLL_MS = 30000;

  var token = localStorage.getItem(TOKEN_KEY);
  var currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (_) {}

  var leads = [];
  var activeTab = '全部';
  var currentLead = null;
  var pollTimer = null;
  var knownIds = new Set();

  var loginView = document.getElementById('loginView');
  var appView = document.getElementById('appView');
  var listView = document.getElementById('listView');
  var detailView = document.getElementById('detailView');

  if (window.DemoStore.isEnabled()) {
    document.getElementById('demoRibbon').classList.remove('hidden');
    window.DemoStore.seedIfEmpty();
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ============ 新增：CSRF令牌管理 ============
  var CSRF_TOKEN_KEY = 'admin_csrf_token';
  function getCSRFToken() {
    var token = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (!token) {
      token = 'csrf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    }
    return token;
  }
  // 初始化CSRF令牌
  getCSRFToken();

  function priText(p) {
    if (p === 1) return '紧急';
    if (p === 2) return '较急';
    return '一般';
  }

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return (d.getMonth() + 1) + '-' + d.getDate() + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function maskPhone(p) {
    return p ? p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
  }

  async function api(action, payload) {
    if (window.DemoStore.isEnabled()) {
      return demoApi(action, payload);
    }
    var res = await fetch(cfg.ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
        'X-CSRF-Token': getCSRFToken(),  // 新增：CSRF令牌
      },
      body: JSON.stringify(Object.assign({ action: action, token: token }, payload || {})),
    });
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || '请求失败');
    return json;
  }

  function demoApi(action, payload) {
    payload = payload || {};
    if (action === 'login') {
      var u = window.DEMO_ADMINS[payload.username];
      if (!u || u.password !== payload.password) throw new Error('用户名或密码错误');
      token = 'demo-' + payload.username;
      currentUser = { username: payload.username, display_name: u.display_name };
      return Promise.resolve({ token: token, user: currentUser });
    }
    if (!token || !currentUser) throw new Error('请先登录');

    if (action === 'list') return Promise.resolve({ leads: window.DemoStore.listLeads() });
    if (action === 'detail') {
      var lead = window.DemoStore.getLead(payload.id);
      if (!lead) throw new Error('记录不存在');
      return Promise.resolve({ lead: lead });
    }
    if (action === 'updateStatus') {
      window.DemoStore.updateLead(payload.id, { status: payload.status }, currentUser.display_name);
      return Promise.resolve({ ok: true });
    }
    if (action === 'updateExtra') {
      window.DemoStore.updateLead(payload.id, {
        survey_note: payload.survey_note,
        solution: payload.solution,
        quote_amount: payload.quote_amount ? Number(payload.quote_amount) : null,
        final_amount: payload.final_amount ? Number(payload.final_amount) : null,
      }, currentUser.display_name);
      return Promise.resolve({ ok: true });
    }
    throw new Error('未知操作');
  }

  function renderTabs() {
    var tabs = document.getElementById('statusTabs');
    tabs.innerHTML = '';
    window.STATUS_TABS.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-chip' + (tab === activeTab ? ' active' : '');
      btn.textContent = tab;
      btn.onclick = function () {
        activeTab = tab;
        renderTabs();
        renderList();
      };
      tabs.appendChild(btn);
    });
  }

  function filtered() {
    if (activeTab === '全部') return leads;
    return leads.filter(function (l) { return l.status === activeTab; });
  }

  function renderList() {
    var list = document.getElementById('leadList');
    var empty = document.getElementById('emptyMsg');
    var items = filtered();
    list.innerHTML = '';
    if (!items.length) { show(empty); return; }
    hide(empty);

    items.forEach(function (lead) {
      var el = document.createElement('div');
      el.className = 'order-item p' + lead.priority;
      el.innerHTML =
        '<div class="item-head">' +
          '<span class="item-no">' + esc(lead.lead_no) + '</span>' +
          '<span class="item-priority p' + lead.priority + '">' + priText(lead.priority) + '</span>' +
        '</div>' +
        '<div class="item-title">' + esc(lead.name || '未留名') + ' · ' + maskPhone(lead.phone) + '</div>' +
        '<div class="item-meta">' + esc(lead.problem_type || '—') + ' · ' + esc(lead.location) + '</div>' +
        '<div class="item-meta">' + fmtTime(lead.created_at) + (lead.last_operator ? ' · ' + esc(lead.last_operator) : '') + '</div>' +
        '<div class="item-desc">' + esc(lead.description) + '</div>' +
        '<span class="item-status">' + esc(lead.status) + '</span>';
      el.onclick = function () { openDetail(lead.id); };
      list.appendChild(el);
    });
  }

  async function loadLeads(notify) {
    var json = await api('list');
    var next = json.leads || [];
    if (notify && knownIds.size) {
      var fresh = next.filter(function (l) { return !knownIds.has(l.id); });
      if (fresh.length) beep();
    }
    knownIds = new Set(next.map(function (l) { return l.id; }));
    leads = next;
    renderList();
    if (currentLead) {
      var u = leads.find(function (l) { return l.id === currentLead.id; });
      if (u) { currentLead = u; renderDetail(); }
    }
  }

  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 660;
      g.gain.value = 0.12;
      o.start();
      setTimeout(function () { o.stop(); ctx.close(); }, 180);
    } catch (_) {}
  }

  async function openDetail(id) {
    var json = await api('detail', { id: id });
    currentLead = json.lead;
    hide(listView);
    show(detailView);
    renderDetail();
  }

  function infoRow(k, v) {
    return '<div class="info-row"><span class="k">' + k + '</span><span class="v">' + esc(v) + '</span></div>';
  }

  function nextActions(status) {
    var m = {
      '意向待联系': [{ s: '已联系', l: '标记已联系', main: true }, { s: '已取消', l: '取消', warn: true }],
      '已联系': [{ s: '已预约查勘', l: '已预约查勘', main: true }, { s: '已取消', l: '取消', warn: true }],
      '已预约查勘': [{ s: '已查勘', l: '已完成查勘', main: true }],
      '已查勘': [{ s: '方案已报价', l: '方案已报价', main: true }],
      '方案已报价': [{ s: '维修中', l: '开始维修', main: true }, { s: '已取消', l: '取消', warn: true }],
      '维修中': [{ s: '待平台付款', l: '维修完成', main: true }],
      '待平台付款': [{ s: '已完成', l: '确认已收款', main: true, pay: true }],
    };
    return m[status] || [];
  }

  function renderDetail() {
    var L = currentLead;
    if (!L) return;
    var box = document.getElementById('detailContent');
    var acts = nextActions(L.status);

    box.innerHTML =
      '<div class="panel-block">' +
        '<h2>' + esc(L.lead_no) + ' · ' + priText(L.priority) + '</h2>' +
        infoRow('联系人', L.name || '未留名') +
        infoRow('电话', L.phone) +
        infoRow('位置', L.location) +
        infoRow('问题类型', L.problem_type || '—') +
        infoRow('紧急程度', L.urgency || '未指定') +
        infoRow('描述', L.description) +
        infoRow('来源', L.source) +
        infoRow('状态', L.status) +
        infoRow('经办人', L.last_operator || '—') +
        infoRow('提交时间', fmtTime(L.created_at)) +
        '<a class="dial-btn" href="tel:' + L.phone + '">拨打 ' + L.phone + '</a>' +
      '</div>' +
      '<div class="panel-block">' +
        '<h2>查勘与报价</h2>' +
        '<div class="form-group"><label>查勘记录</label><textarea id="surveyNote" rows="2">' + esc(L.survey_note || '') + '</textarea></div>' +
        '<div class="form-group"><label>维修方案</label><textarea id="solution" rows="2">' + esc(L.solution || '') + '</textarea></div>' +
        '<div class="form-group"><label>报价（元）</label><input id="quoteAmount" type="number" inputmode="decimal" value="' + (L.quote_amount || '') + '"></div>' +
        '<div class="form-group"><label>应收（元）</label><input id="finalAmount" type="number" inputmode="decimal" value="' + (L.final_amount || L.quote_amount || '') + '"></div>' +
        '<button type="button" class="btn-primary" id="saveExtraBtn">保存</button>' +
      '</div>' +
      '<div class="panel-block">' +
        '<h2>状态流转</h2><div class="action-row" id="actionRow"></div>' +
      '</div>';

    document.getElementById('saveExtraBtn').onclick = saveExtra;
    var row = document.getElementById('actionRow');
    acts.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'action-btn' + (a.main ? ' main' : '') + (a.warn ? ' warn' : '');
      b.textContent = a.l;
      b.onclick = function () { setStatus(a.s, a.pay); };
      row.appendChild(b);
    });
  }

  async function saveExtra() {
    try {
      await api('updateExtra', {
        id: currentLead.id,
        survey_note: document.getElementById('surveyNote').value.trim(),
        solution: document.getElementById('solution').value.trim(),
        quote_amount: document.getElementById('quoteAmount').value,
        final_amount: document.getElementById('finalAmount').value,
      });
      toast('已保存');
      await loadLeads(false);
    } catch (e) { toast(e.message); }
  }

  async function setStatus(status, confirmPay) {
    if (confirmPay && !confirm('确认该笔款项已通过平台收取？')) return;
    try {
      await api('updateStatus', { id: currentLead.id, status: status });
      toast('状态已更新');
      await loadLeads(false);
    } catch (e) { toast(e.message); }
  }

  function startPoll() {
    stopPoll();
    pollTimer = setInterval(function () {
      if (!document.hidden) loadLeads(true).catch(function () {});
    }, POLL_MS);
  }

  function stopPoll() {
    if (pollTimer) clearInterval(pollTimer);
  }

  async function showApp() {
    hide(loginView);
    show(appView);
    document.getElementById('userBadge').textContent = currentUser.display_name;
    renderTabs();
    await loadLeads(false);
    startPoll();
    var leadNo = new URLSearchParams(location.search).get('lead_no');
    if (leadNo) {
      var found = leads.find(function (l) { return l.lead_no === leadNo; });
      if (found) await openDetail(found.id);
    }
  }

  document.getElementById('loginBtn').onclick = async function () {
    document.getElementById('loginErr').textContent = '';
    try {
      var json = await api('login', {
        username: document.getElementById('loginUser').value.trim(),
        password: document.getElementById('loginPass').value,
      });
      token = json.token;
      currentUser = json.user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      await showApp();
    } catch (e) {
      document.getElementById('loginErr').textContent = e.message;
    }
  };

  document.getElementById('logoutBtn').onclick = function () {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    token = null; currentUser = null;
    stopPoll();
    hide(appView); hide(detailView);
    show(listView); show(loginView);
  };

  document.getElementById('refreshBtn').onclick = function () {
    loadLeads(false).then(function () { toast('已刷新'); }).catch(function (e) { toast(e.message); });
  };

  document.getElementById('backBtn').onclick = function () {
    currentLead = null;
    hide(detailView);
    show(listView);
    history.replaceState({}, '', 'admin.html');
  };

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && token) loadLeads(true).catch(function () {});
  });

  if (token && currentUser) showApp();
  else show(loginView);
})();
