(function () {
  var cfg = window.APP_CONFIG;
  var form = document.getElementById('leadForm');
  var submitBtn = document.getElementById('submitBtn');

  document.getElementById('brandName').textContent = cfg.BRAND_NAME;
  document.getElementById('topPhone').textContent = cfg.BOSS_PHONE;
  document.getElementById('topCall').href = 'tel:' + cfg.BOSS_PHONE;
  document.title = cfg.BRAND_NAME + ' · 预约上门查勘';

  if (window.DemoStore.isEnabled()) {
    document.getElementById('demoRibbon').classList.remove('hidden');
  }

  window.PROBLEM_TYPE_OPTIONS.forEach(function (opt) {
    var el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.value;
    document.getElementById('problemType').appendChild(el);
  });

  window.URGENCY_OPTIONS.forEach(function (opt) {
    var el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    document.getElementById('urgency').appendChild(el);
  });

  function getDeviceFingerprint() {
    try {
      var str = navigator.userAgent + navigator.platform + screen.width + 'x' + screen.height;
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    } catch (e) {
      return 'fp_' + Math.random().toString(36).substr(2, 9);
    }
  }

  function cooldownMs() {
    return cfg.SUBMIT_COOLDOWN_MS || 60 * 1000;
  }

  function cooldownMessage(remainMs) {
    var sec = Math.ceil(remainMs / 1000);
    if (sec >= 60) return '提交过于频繁，请' + Math.ceil(sec / 60) + '分钟后再试';
    return '提交过于频繁，请' + sec + '秒后再试（可补充说明后重新提交）';
  }

  function checkFrequencyLimit() {
    var key = 'fs_last_submit_' + getDeviceFingerprint();
    var last = parseInt(localStorage.getItem(key) || '0', 10);
    var elapsed = Date.now() - last;
    var limit = cooldownMs();
    if (last > 0 && elapsed < limit) {
      return { allowed: false, message: cooldownMessage(limit - elapsed) };
    }
    return { allowed: true };
  }

  function markSubmitted() {
    localStorage.setItem('fs_last_submit_' + getDeviceFingerprint(), String(Date.now()));
  }

  function updateProgress() {
    var count = 0;
    if (/^1[3-9]\d{9}$/.test(form.phone.value.trim())) count++;
    if (form.location.value.trim()) count++;
    if (form.problemType.value) count++;
    if (form.description.value.trim()) count++;
    var bar = document.querySelector('.progress-bar');
    var num = document.getElementById('progressNum');
    if (bar) bar.style.width = (count / 4 * 100) + '%';
    if (num) num.textContent = count;
  }

  ['phone', 'location', 'problemType', 'description'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateProgress);
      el.addEventListener('change', updateProgress);
    }
  });

  function setErr(field, msg) {
    var el = document.querySelector('[data-err="' + field + '"]');
    if (el) el.textContent = msg || '';
  }

  function clearErrs() {
    document.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }

  function validate() {
    clearErrs();
    var ok = true;
    var data = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      location: form.location.value.trim(),
      problem_type: form.problemType.value,
      urgency: form.urgency.value.trim(),
      description: form.description.value.trim(),
    };

    if (!/^1[3-9]\d{9}$/.test(data.phone)) {
      setErr('phone', '请填写正确的11位手机号码');
      ok = false;
    }
    if (!data.location) {
      setErr('location', '请填写所在位置');
      ok = false;
    }
    if (!data.problem_type) {
      setErr('problemType', '请选择问题类型');
      ok = false;
    }
    if (!data.description) {
      setErr('description', '请描述现场情况');
      ok = false;
    }
    if (!document.getElementById('agree').checked) {
      setErr('agree', '请阅读并勾选同意条款');
      ok = false;
    }

    return ok ? data : null;
  }

  function getSource() {
    return new URLSearchParams(location.search).get('from') || 'direct';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    var freq = checkFrequencyLimit();
    if (!freq.allowed) {
      toast(freq.message);
      return;
    }

    var data = validate();
    if (!data) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中…';

    try {
      var leadNo;
      var payload = {
        name: data.name,
        phone: data.phone,
        location: data.location,
        problem_type: data.problem_type,
        urgency: data.urgency,
        description: data.description,
        source: getSource(),
      };

      if (window.DemoStore.isEnabled()) {
        var lead = window.DemoStore.createLead(payload);
        leadNo = lead.lead_no;
        markSubmitted();
      } else {
        var res = await fetch(cfg.CREATE_LEAD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || '提交失败');
        leadNo = json.lead_no;
        markSubmitted();
      }

      var q = 'lead_no=' + encodeURIComponent(leadNo);
      if (data.urgency) q += '&urgency=' + encodeURIComponent(data.urgency);
      location.href = 'success.html?' + q;
    } catch (err) {
      toast(err.message || '网络异常，请稍后重试');
      submitBtn.disabled = false;
      submitBtn.textContent = '提交预约';
    }
  });
})();
