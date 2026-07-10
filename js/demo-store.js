/**
 * 本地预览模式：数据存浏览器 localStorage
 */
window.DemoStore = (function () {
  var KEY = 'fs_demo_leads';
  var SEQ_KEY = 'fs_demo_seq';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (_) { return []; }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function nextNo() {
    var d = new Date();
    var day = d.getFullYear() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    var seqMap = JSON.parse(localStorage.getItem(SEQ_KEY) || '{}');
    seqMap[day] = (seqMap[day] || 0) + 1;
    localStorage.setItem(SEQ_KEY, JSON.stringify(seqMap));
    return 'YX' + day + '-' + String(seqMap[day]).padStart(3, '0');
  }

  function priorityOf(urgency, problemType) {
    return window.computeLeadPriority(urgency || '', problemType);
  }

  return {
    isEnabled: function () {
      return window.APP_CONFIG && window.APP_CONFIG.DEMO_MODE === true;
    },

    createLead: function (payload) {
      var list = load();
      var cooldown = (window.APP_CONFIG && window.APP_CONFIG.SUBMIT_COOLDOWN_MS) || 60 * 1000;
      var since = Date.now() - cooldown;
      var dup = list.some(function (l) {
        return l.phone === payload.phone && new Date(l.created_at).getTime() > since;
      });
      if (dup) throw new Error('提交过于频繁，请1分钟后再试（可补充说明后重新提交）');

      var lead = {
        id: 'demo-' + Date.now(),
        lead_no: nextNo(),
        name: payload.name || '',
        phone: payload.phone,
        location: payload.location,
        problem_type: payload.problem_type,
        urgency: payload.urgency || '',
        priority: priorityOf(payload.urgency, payload.problem_type),
        description: payload.description,
        source: payload.source || 'demo',
        status: '意向待联系',
        survey_note: '',
        solution: '',
        quote_amount: null,
        final_amount: null,
        payment_status: 'unpaid',
        last_operator: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.unshift(lead);
      save(list);
      return lead;
    },

    listLeads: function () {
      return load().sort(function (a, b) {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    },

    getLead: function (id) {
      return load().find(function (l) { return l.id === id; }) || null;
    },

    updateLead: function (id, patch, operator) {
      var list = load();
      var i = list.findIndex(function (l) { return l.id === id; });
      if (i < 0) throw new Error('记录不存在');
      Object.assign(list[i], patch, {
        last_operator: operator || list[i].last_operator,
        updated_at: new Date().toISOString(),
      });
      if (patch.status === '已完成') {
        list[i].payment_status = 'paid';
        list[i].paid_at = new Date().toISOString();
      }
      save(list);
      return list[i];
    },

    seedIfEmpty: function () {
      if (load().length) return;
      this.createLead({
        name: '王女士',
        phone: '13800138001',
        location: '朝阳区望京西园',
        problem_type: '卫生间/厨房漏水',
        urgency: '紧急（需尽快处理）',
        description: '卫生间顶滴水，楼下已来找过两次',
        source: 'douyin',
      });
      var b = this.createLead({
        name: '李先生',
        phone: '13900139002',
        location: '海淀区清河街道',
        problem_type: '外墙/窗户渗雨',
        urgency: '较急（希望这几天看）',
        description: '外墙窗户渗雨，墙面起皮',
        source: 'douyin',
      });
      this.updateLead(b.id, { status: '已联系' }, '志勇师傅');
    },
  };
})();
