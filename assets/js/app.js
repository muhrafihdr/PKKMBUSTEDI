/* ==========================================================================
   PKKMB USTEDI — Polling App
   ========================================================================== */
(function () {
  'use strict';

  var CFG = window.PKKMB_CONFIG || {};
  var API_URL = (CFG.API_URL || '').trim();
  var DEMO = !API_URL;
  var DEMO_KEY = 'pkkmb_usted_votes_v1';
  var VOTED_KEY = 'pkkmb_usted_voted_v1';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------------- state */
  var state = {
    sumber: '',
    sosmed: '',
    submitting: false,
    timer: null,
    lastTotal: 0
  };

  /* ============================================================ UTILITIES */

  function toast(msg, type) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'toast is-show' + (type ? ' is-' + type : '');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.className = 'toast'; }, 3800);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(d) {
    try {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) { return ''; }
  }

  /* JSONP — cara paling aman & bebas CORS untuk bicara dengan Apps Script */
  function jsonp(params, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = 'pkkmbCb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      var script = document.createElement('script');
      var done = false;

      var timer = setTimeout(function () { fail(new Error('Waktu koneksi habis')); }, timeoutMs || 20000);

      function cleanup() {
        clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      function fail(err) {
        if (done) return;
        done = true; cleanup(); reject(err);
      }

      window[cb] = function (data) {
        if (done) return;
        done = true; cleanup(); resolve(data);
      };

      var qs = new URLSearchParams();
      Object.keys(params).forEach(function (k) {
        if (params[k] !== undefined && params[k] !== null) qs.set(k, params[k]);
      });
      qs.set('callback', cb);

      script.src = API_URL + (API_URL.indexOf('?') === -1 ? '?' : '&') + qs.toString();
      script.async = true;
      script.onerror = function () { fail(new Error('Gagal menghubungi server')); };
      document.body.appendChild(script);
    });
  }

  /* Fallback tulis data tanpa perlu baca respons (kalau JSONP diblokir) */
  function postNoCors(payload) {
    if (DEMO) return Promise.resolve();
    return fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).catch(function () { /* diabaikan */ });
  }

  /* ======================================================== DEMO STORAGE */

  function demoRead() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); } catch (e) { return []; }
  }
  function demoWrite(rows) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(rows)); } catch (e) {}
  }
  function demoSeed() {
    var rows = demoRead();
    if (rows.length) return rows;
    var seed = ['Media Sosial', 'Teman / Sahabat', 'Dosen / Guru', 'Mitra Kampus / Sekolah',
      'Saudara / Keluarga', 'Alumni USTEDI', 'Website Resmi USTEDI', 'Grup WhatsApp / Broadcast',
      'Pameran / Event Pendidikan', 'Brosur / Spanduk / Baliho', 'Instansi / Tempat Kerja', 'Lainnya'];
    var weights = [34, 21, 9, 8, 7, 5, 4, 3, 3, 2, 2, 2];
    var plat = ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'X / Twitter', 'WhatsApp'];
    var pW = [40, 30, 12, 10, 4, 4];
    var now = Date.now();
    for (var i = 0; i < seed.length; i++) {
      for (var j = 0; j < weights[i]; j++) {
        rows.push({
          timestamp: new Date(now - (i * 40 + j) * 60000).toISOString(),
          sumber: seed[i],
          detail: seed[i] === 'Media Sosial' ? plat[j % plat.length] : ''
        });
      }
    }
    demoWrite(rows);
    return rows;
  }
  function demoAggregate() {
    var rows = demoRead();
    return buildResult(rows, rows.length);
  }

  /* ========================================================== AGGREGATION */

  function buildResult(rows, total) {
    var counts = {}, detailCounts = {};
    rows.forEach(function (r) {
      var s = r.sumber || r.Sumber || '';
      if (s) counts[s] = (counts[s] || 0) + 1;
      var d = r.detail || r.Detail || '';
      if (d && s === 'Media Sosial') detailCounts[d] = (detailCounts[d] || 0) + 1;
    });

    // pastikan semua opsi tetap tampil walau 0
    (CFG.POLL_OPTIONS || []).forEach(function (o) {
      if (!(o.value in counts)) counts[o.value] = 0;
    });

    var results = Object.keys(counts).map(function (k) {
      return { label: k, count: counts[k], percent: total ? (counts[k] / total) * 100 : 0 };
    }).sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); });

    var sub = Object.keys(detailCounts).map(function (k) {
      return { label: k, count: detailCounts[k], percent: 0 };
    }).sort(function (a, b) { return b.count - a.count; });
    var subTotal = sub.reduce(function (a, b) { return a + b.count; }, 0);
    sub.forEach(function (s) { s.percent = subTotal ? (s.count / subTotal) * 100 : 0; });

    return { ok: true, total: total, results: results, subresults: sub, demo: DEMO };
  }

  /* =============================================================== RENDER */

  function renderOptions() {
    var wrap = $('#options');
    var html = (CFG.POLL_OPTIONS || []).map(function (o) {
      return '' +
        '<label class="opt-item" data-value="' + esc(o.value) + '">' +
          '<input type="radio" name="sumber" value="' + esc(o.value) + '" />' +
          '<span class="emoji">' + (o.emoji || '•') + '</span>' +
          '<span class="txt">' + esc(o.value) + '</span>' +
          '<span class="tick"></span>' +
        '</label>';
    }).join('');
    wrap.innerHTML = html;

    wrap.addEventListener('click', function (e) {
      var item = e.target.closest('.opt-item');
      if (!item) return;
      selectSumber(item.getAttribute('data-value'));
    });
  }

  function renderChips() {
    var wrap = $('#sosmedChips');
    wrap.innerHTML = (CFG.SOSMED_OPTIONS || []).map(function (v) {
      return '<button type="button" class="chip" data-value="' + esc(v) + '">' + esc(v) + '</button>';
    }).join('');

    wrap.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var val = chip.getAttribute('data-value');
      state.sosmed = (state.sosmed === val) ? '' : val;
      $$('.chip', wrap).forEach(function (c) {
        c.classList.toggle('is-active', c.getAttribute('data-value') === state.sosmed);
      });
    });
  }

  function selectSumber(value) {
    state.sumber = value;
    $$('.opt-item').forEach(function (el) {
      var on = el.getAttribute('data-value') === value;
      el.classList.toggle('is-active', on);
      var input = $('input', el);
      if (input) input.checked = on;
    });

    var sosmed = $('#sosmedField');
    var lainnya = $('#lainnyaField');
    sosmed.className = 'field' + (value === 'Media Sosial' ? ' field--show' : ' field--hidden');
    lainnya.className = 'field' + (value === 'Lainnya' ? ' field--show' : ' field--hidden');
    if (value !== 'Lainnya') $('#lainnya').value = '';

    clearError('sumber');
  }

  function renderBars(container, list, total) {
    var max = list.reduce(function (a, b) { return Math.max(a, b.count); }, 0) || 1;
    container.innerHTML = list.map(function (r, i) {
      var isTop = i === 0 && r.count > 0;
      var w = Math.max(r.count ? 3 : 0, (r.count / max) * 100);
      return '' +
        '<div class="bar' + (isTop ? ' bar--top' : '') + '">' +
          '<div class="bar__top">' +
            '<span class="bar__label"><span>' + esc(r.label) + '</span></span>' +
            '<span class="bar__val">' + r.count + '<small>' + r.percent.toFixed(1) + '%</small></span>' +
          '</div>' +
          '<div class="bar__track"><div class="bar__fill" data-w="' + w + '"></div></div>' +
        '</div>';
    }).join('');

    requestAnimationFrame(function () {
      $$('.bar__fill', container).forEach(function (f) {
        f.style.width = f.getAttribute('data-w') + '%';
      });
    });
  }

  function applyResult(data) {
    var total = data.total || 0;
    var results = data.results || [];

    state.lastTotal = total;
    animateNumber($('#heroTotal'), total);
    animateNumber($('#resultTotal'), total);
    $('#heroOptions').textContent = (CFG.POLL_OPTIONS || []).length;
    var stamp = 'baru saja';
    $('#heroUpdated').textContent = stamp;
    $('#resultUpdated').textContent = 'diperbarui ' + fmtTime(new Date());

    renderBars($('#bars'), results, total);
    $('#resultEmpty').hidden = total > 0;

    var sub = data.subresults || [];
    if (sub.length) {
      $('#subresult').hidden = false;
      renderBars($('#subBars'), sub, total);
    } else {
      $('#subresult').hidden = true;
    }
  }

  function animateNumber(el, to) {
    if (!el) return;
    var from = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
    if (from === to) { el.textContent = to.toLocaleString('id-ID'); return; }
    var steps = 18, i = 0;
    var t = setInterval(function () {
      i++;
      var v = Math.round(from + (to - from) * (i / steps));
      el.textContent = v.toLocaleString('id-ID');
      if (i >= steps) { clearInterval(t); el.textContent = to.toLocaleString('id-ID'); }
    }, 22);
  }

  /* ================================================================ ERRORS */

  function setError(name, msg) {
    var el = $('[data-err="' + name + '"]');
    if (el) { el.textContent = msg; el.closest('.field').classList.add('has-error'); }
  }
  function clearError(name) {
    var el = $('[data-err="' + name + '"]');
    if (el) { el.textContent = ''; el.closest('.field').classList.remove('has-error'); }
  }
  function clearAllErrors() {
    ['nama', 'asal', 'status', 'sumber'].forEach(clearError);
  }

  /* ================================================================ SUBMIT */

  function validate() {
    clearAllErrors();
    var ok = true;
    var nama = $('#nama').value.trim();
    var asal = $('#asal').value.trim();
    var status = $('#status').value;

    if (nama.length < 2) { setError('nama', 'Nama minimal 2 karakter.'); ok = false; }
    if (asal.length < 2) { setError('asal', 'Asal sekolah/instansi wajib diisi.'); ok = false; }
    if (!status) { setError('status', 'Pilih status kamu dulu ya.'); ok = false; }
    if (!state.sumber) { setError('sumber', 'Pilih satu sumber informasi.'); ok = false; }
    if (!$('#izin').checked) { toast('Centang persetujuan dulu ya 🙏', 'error'); ok = false; }

    if (!ok) {
      var first = $('.field.has-error');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return ok;
  }

  function payload() {
    var detail = '';
    if (state.sumber === 'Media Sosial') detail = state.sosmed;
    else if (state.sumber === 'Lainnya') detail = $('#lainnya').value.trim();

    return {
      action: 'submit',
      nama: $('#nama').value.trim(),
      asal: $('#asal').value.trim(),
      status: $('#status').value,
      sumber: state.sumber,
      detail: detail,
      halaman: location.href,
      ua: navigator.userAgent
    };
  }

  function onSubmit(e) {
    e.preventDefault();
    if (state.submitting) return;
    if (!validate()) return;

    var data = payload();
    state.submitting = true;
    var btn = $('#submitBtn');
    btn.disabled = true;
    btn.textContent = 'Mengirim…';

    var finish = function (res) {
      state.submitting = false;
      btn.disabled = false;
      btn.textContent = 'Kirim Jawaban';
      if (res && res.error) { toast(res.error, 'error'); return; }

      try { localStorage.setItem(VOTED_KEY, new Date().toISOString()); } catch (err) {}

      $('#successName').textContent = data.nama.split(' ')[0] || 'Sobat';
      $('#pollForm').hidden = true;
      $('#successCard').hidden = false;
      $('#successCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(DEMO ? 'Tersimpan di mode demo (belum ke Spreadsheet)' : 'Jawabanmu berhasil terkirim! 🎉', DEMO ? '' : 'ok');

      if (res && res.results) applyResult(res);
      else loadResults(true);
    };

    if (DEMO) {
      var rows = demoRead();
      rows.push({ timestamp: new Date().toISOString(), nama: data.nama, asal: data.asal, status: data.status, sumber: data.sumber, detail: data.detail });
      demoWrite(rows);
      setTimeout(function () { finish(demoAggregate()); }, 500);
      return;
    }

    jsonp(data, 20000)
      .then(function (res) {
        if (res && res.ok) return finish(res);
        // respons tak terduga -> pastikan data tetap terkirim
        return postNoCors(data).then(function () { finish({ ok: true }); });
      })
      .catch(function () {
        // JSONP diblokir? kirim lewat POST mode no-cors
        postNoCors(data).then(function () {
          toast('Jawaban terkirim. Hasil mungkin butuh beberapa detik untuk muncul.', 'ok');
          finish({ ok: true });
        });
      });
  }

  /* ================================================================ LOAD */

  function loadResults(silent) {
    if (DEMO) { demoSeed(); applyResult(demoAggregate()); return Promise.resolve(); }

    var btn = $('#refreshBtn');
    if (btn) btn.classList.add('spin');

    return jsonp({ action: 'results' }, 20000)
      .then(function (res) {
        if (res && res.ok) applyResult(res);
        else if (!silent) toast('Gagal memuat hasil polling.', 'error');
      })
      .catch(function () {
        if (!silent) toast('Tidak bisa terhubung ke server. Cek API_URL.', 'error');
      })
      .then(function () { if (btn) btn.classList.remove('spin'); });
  }

  /* ================================================================ INIT */

  function init() {
    renderOptions();
    renderChips();

    $('#pollForm').addEventListener('submit', onSubmit);
    $('#refreshBtn').addEventListener('click', function () { loadResults(false); });

    $('#againBtn').addEventListener('click', function () {
      $('#successCard').hidden = true;
      $('#pollForm').hidden = false;
      $('#pollForm').reset();
      state.sumber = ''; state.sosmed = '';
      $$('.opt-item').forEach(function (el) { el.classList.remove('is-active'); });
      $$('.chip').forEach(function (c) { c.classList.remove('is-active'); });
      $('#sosmedField').className = 'field field--hidden';
      $('#lainnyaField').className = 'field field--hidden';
      clearAllErrors();
      $('#polling').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('#shareBtn').addEventListener('click', function () {
      var text = (CFG.SHARE_TEXT || 'Isi polling PKKMB USTEDI!') + ' ' + location.href;
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });

    // validasi live
    ['nama', 'asal', 'status'].forEach(function (id) {
      $('#' + id).addEventListener('input', function () { clearError(id); });
      $('#' + id).addEventListener('change', function () { clearError(id); });
    });

    // banner mode demo
    if (DEMO) {
      var b = document.createElement('div');
      b.className = 'demo-banner';
      b.innerHTML = '⚠️ <strong>Mode Demo</strong> — belum terhubung ke Google Spreadsheet, ' +
        'angka di bawah hanyalah <em>data contoh</em>. Isi <code>API_URL</code> di ' +
        '<code>assets/js/config.js</code> (lihat README.md).';
      document.body.insertBefore(b, document.body.firstChild);

      var nav = $('#nav');
      var syncNav = function () { nav.style.top = b.offsetHeight + 'px'; };
      syncNav();
      window.addEventListener('resize', syncNav);
    }

    // tahun copyright otomatis
    var yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // navbar
    var nav = $('#nav');
    var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 30); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // hasil pertama + auto refresh
    loadResults(true);
    var sec = parseInt(CFG.REFRESH_INTERVAL, 10) || 15;
    $('#refreshSec').textContent = sec;
    state.timer = setInterval(function () {
      if (!document.hidden) loadResults(true);
    }, sec * 1000);

    // refresh saat tab kembali aktif
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) loadResults(true);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
