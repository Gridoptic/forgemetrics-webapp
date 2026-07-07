/* Слой-драйвер для poster_render.html (байт-в-байт копия poster_mockup.html).
   Макет НЕ трогаем: его скрипт глобальный, поэтому кормим реальными данными снаружи.
   Подключается и приложением (в iframe), и сервером (add_script_tag).
   Экспорт: __fmxPosterInit(data, api), __fmxPosterState(), __fmxPosterApply(state),
            __fmxPosterRenderMode(), __fmxPosterRender(data, state, api, opts). */
(function () {
  'use strict';
  var API = '';
  function abs(u) { if (!u) return u; if (/^(https?:|blob:|data:)/.test(u)) return u; return API + u; }
  function el(id) { return document.getElementById(id); }
  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }

  function initials(title, username) {
    var s = (title || username || '?').trim();
    var p = s.split(/\s+/).filter(Boolean);
    return ((p.length >= 2 ? p[0].charAt(0) + p[1].charAt(0) : s.slice(0, 2)) || '?').toUpperCase();
  }
  function placeholderAvatar(ini) {
    var c = document.createElement('canvas'); c.width = 300; c.height = 300;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 300, 300);
    g.addColorStop(0, '#16324a'); g.addColorStop(0.55, '#0e1e30'); g.addColorStop(1, '#0a2a22');
    x.fillStyle = g; x.fillRect(0, 0, 300, 300);
    x.fillStyle = '#e8e8ed'; x.font = '700 110px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ini, 150, 165);
    return c.toDataURL();
  }

  /* график макета (алгоритм 1:1 с макетом; данные — реальные) */
  function drawChart(series, days) {
    var chart = el('chart');
    var data = (series || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (data.length < 2) { if (chart) chart.classList.add('hide'); return false; }
    var W = 452, H = 88, min = Math.min.apply(null, data), max = Math.max.apply(null, data);
    var range = max - min, denom = (data.length - 1) || 1;
    var pts = data.map(function (v, i) { return [i * W / denom, range ? 6 + (H - 12) * (1 - (v - min) / range) : 48]; });
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i], cx = (p0[0] + p1[0]) / 2;
      d += ' C' + cx + ',' + p0[1] + ' ' + cx + ',' + p1[1] + ' ' + p1[0] + ',' + p1[1];
    }
    if (el('line')) el('line').setAttribute('d', d);
    if (el('area')) el('area').setAttribute('d', d + ' L' + W + ',96 L0,96 Z');
    var last = pts[pts.length - 1];
    ['dot', 'dotHalo'].forEach(function (id) { var e = el(id); if (e) { e.setAttribute('cx', last[0]); e.setAttribute('cy', last[1]); } });
    var pct = data[0] ? Math.round((data[data.length - 1] - data[0]) / data[0] * 100) : 0;
    if (el('chartPct')) el('chartPct').textContent = (pct >= 0 ? '▲ +' : '▼ ') + pct + '%';
    var ct = document.querySelector('#chart .ct span'); if (ct) ct.textContent = 'Просмотры · ' + (days || data.length) + ' дн.';
    var cxs = document.querySelectorAll('#chart .cx span');
    if (cxs.length >= 2) { cxs[0].textContent = data[0].toLocaleString('ru-RU'); cxs[1].textContent = data[data.length - 1].toLocaleString('ru-RU'); }
    if (chart) chart.classList.remove('hide');
    return true;
  }

  /* значение метрики или null (нет реальных данных — ячейку скрываем, фейк не рисуем) */
  function metricValue(key, d) {
    if (key === 'subs') return d.subscribers ? fmt(d.subscribers) : null;
    if (key === 'reach') return d.avg_views ? '~' + fmt(d.avg_views) : null;
    if (key === 'er') return (d.er != null && isFinite(d.er)) ? (Math.round(d.er * 10) / 10) + '%' : null;
    if (key === 'cpm') return (d.min_price && d.avg_views) ? fmt(d.min_price * 1000 / d.avg_views) + ' ₽' : null;
    if (key === 'err') return (d.avg_views && d.subscribers) ? Math.round(d.avg_views / d.subscribers * 100) + '%' : null;
    if (key === 'grow') return (d.grow != null && isFinite(d.grow)) ? (d.grow >= 0 ? '+' : '') + fmt(d.grow) : null;
    if (key === 'freq') return (d.freq != null && isFinite(d.freq)) ? (Math.round(d.freq * 10) / 10) + '/нед' : null;
    if (key === 'mv') return (d.mv != null && isFinite(d.mv)) ? (d.mv >= 1000 ? fmt(d.mv / 1000) + ' К' : fmt(d.mv)) : null;
    return null;
  }
  var METRIC_KEYS = ['subs', 'reach', 'er', 'cpm', 'err', 'grow', 'freq', 'mv'];
  var _uname = '';
  /* renderQrs макета зашивает подпись «@bh_nlmt» жёстко — переименовываем QR канала после отрисовки */
  function relabelQr(mode) {
    if (!_uname) return;
    var spans = document.querySelectorAll('#qrs .qrt span');
    if ((mode === 'channel' || mode === 'both') && spans[0]) spans[0].textContent = '@' + _uname;
  }
  function renderQrsSafe(mode) { if (typeof window.renderQrs === 'function') { window.renderQrs(mode); relabelQr(mode); } }

  window.__fmxPosterInit = function (data, api) {
    if (api != null) API = api;
    data = data || {};
    var titleTxt = data.title || data.username || 'Канал';
    if (el('titEl')) el('titEl').textContent = titleTxt;
    // username — текстовый узел перед nicheSep внутри .meta (макет не трогаем)
    var meta = document.querySelector('.meta');
    if (meta && meta.firstChild) meta.firstChild.nodeValue = data.username ? '@' + String(data.username).replace(/^@/, '') : '';
    // ниша: кнопка всегда кликабельна (как в макете); нет ниши — пустой разделитель (без висячей точки)
    var hasNiche = !!(data.niche && String(data.niche).trim());
    if (el('nicheEl')) { el('nicheEl').textContent = data.niche || ''; el('nicheEl').classList.remove('hide'); }
    if (el('nicheSep')) { el('nicheSep').textContent = hasNiche ? ' · ' : ''; el('nicheSep').classList.remove('hide'); }
    var nchip = el('nicheChip'); if (nchip) { nchip.classList.add('on'); nchip.style.opacity = ''; nchip.style.pointerEvents = ''; nchip.title = ''; }
    // аватар — РЕАЛЬНЫЙ канала; нет — плейсхолдер с инициалами
    var avImg = el('avImg');
    if (avImg) {
      var src = data.avatar_url ? abs(data.avatar_url) : placeholderAvatar(initials(data.title, data.username));
      if (avImg.getAttribute('data-src') !== src) { avImg.setAttribute('data-src', src); avImg.src = src; }
    }
    // метрики: реальные значения; без данных — прячем ячейку и чип (фейк не рисуем)
    METRIC_KEYS.forEach(function (key) {
      var cell = document.querySelector('.mcell[data-m="' + key + '"]');
      var chip = document.querySelector('#mChips .chip[data-m="' + key + '"]');
      var val = metricValue(key, data);
      // все 8 метрик эталона: чипы всегда кликабельны; нет данных — значение «—»
      // (загорится реальным числом само, когда наполнится База каналов)
      if (cell) { var v = cell.querySelector('.v'); if (v) v.textContent = (val != null ? val : '—'); }
      if (chip) { chip.style.display = ''; chip.style.opacity = ''; chip.style.pointerEvents = ''; chip.title = ''; }
    });
    // цена
    if (el('prInp')) { el('prInp').value = data.min_price || 0; try { el('prInp').dispatchEvent(new Event('input')); } catch (e) {} }
    // QR-ссылки (глобальные var макета) + перерисовка текущего режима
    _uname = (data.username || '').replace(/^@/, '');
    if (_uname) window.QR_CHANNEL_URL = 'https://t.me/' + _uname;
    if (data.id) window.QR_CARD_URL = 'https://t.me/ForgeMetricsBot?startapp=card_' + data.id;
    var qrOn = document.querySelector('#qrChips .chip.on');
    renderQrsSafe(qrOn ? qrOn.getAttribute('data-qr') : 'both');
    // держим подпись QR канала верной и когда пользователь сам переключает режим в панели
    var qc = el('qrChips');
    if (qc && !qc.__fmxRelabel) { qc.__fmxRelabel = 1; qc.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.chip') : null; if (b) setTimeout(function () { relabelQr(b.getAttribute('data-qr')); }, 0); }); }
    // график
    if (data.chart && data.chart.series) drawChart(data.chart.series, data.chart.days);
    else if (el('chart')) el('chart').classList.add('hide');
    if (typeof window.relayout === 'function') window.relayout();
  };

  /* ——— применить цвет к элементу (1:1 с applyColor макета) ——— */
  function applyColorTo(kind, hex) {
    var C = window.COLORS || {};
    function darken(h, k) { var c = window.hex2rgb(h); return window.rgb2hex(Math.round(c[0] * (1 - k)), Math.round(c[1] * (1 - k)), Math.round(c[2] * (1 - k))); }
    function lighten(h, k) { var c = window.hex2rgb(h); return window.rgb2hex(Math.round(c[0] + (255 - c[0]) * k), Math.round(c[1] + (255 - c[1]) * k), Math.round(c[2] + (255 - c[2]) * k)); }
    if (kind === 'tit') { if (el('titEl')) el('titEl').style.color = hex; C.tit = hex; }
    else if (kind === 'niche') { if (el('nicheEl')) el('nicheEl').style.color = hex; C.niche = hex; }
    else if (kind === 'pr') { var pb = el('prBox'); if (pb) { pb.style.background = 'linear-gradient(135deg,' + hex + ',' + darken(hex, 0.22) + ')'; pb.style.boxShadow = '0 12px 30px ' + hex + '59'; } C.pr = hex; }
    else if (kind === 'chart') {
      if (el('gl1')) el('gl1').setAttribute('stop-color', darken(hex, 0.15));
      if (el('gl2')) el('gl2').setAttribute('stop-color', lighten(hex, 0.25));
      if (el('ga1')) el('ga1').setAttribute('stop-color', hex);
      if (el('dot')) el('dot').setAttribute('fill', lighten(hex, 0.25));
      if (el('dotHalo')) el('dotHalo').setAttribute('fill', lighten(hex, 0.25));
      if (el('chartPct')) el('chartPct').style.color = hex;
      C.chart = hex;
    } else if (kind.indexOf('cell:') === 0) {
      var m = kind.slice(5), cell = document.querySelector('.mcell[data-m="' + m + '"]');
      if (cell) { cell.dataset.hex = hex; var v = cell.querySelector('.v'); if (v) v.style.color = hex; }
    }
  }

  function bgName() { var m = (document.getElementById('poster').className || '').match(/bg-(\S+)/); return m ? m[1] : 'blur'; }

  /* ——— стикеры из коллекции бота (url) + эмодзи ——— */
  var _lot = null;
  function _loadScript(u) { return new Promise(function (r, j) { var sc = document.createElement('script'); sc.src = u; sc.onload = r; sc.onerror = j; document.head.appendChild(sc); }); }
  function _loadLottie() {
    if (_lot) return _lot;
    _lot = Promise.all([
      (typeof pako !== 'undefined') ? Promise.resolve() : _loadScript('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js'),
      (typeof lottie !== 'undefined') ? Promise.resolve() : _loadScript('https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js')
    ]);
    return _lot;
  }
  function _stickerMedia(glyph, it, opts) {
    opts = opts || {};
    var url = abs(it.url), kind = it.kind || 'webp';
    if (kind === 'webm') {
      var v = document.createElement('video'); v.muted = true; v.loop = true; v.autoplay = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;'; v.src = url;
      v.addEventListener('loadeddata', function () { if (opts.static) { try { v.pause(); v.currentTime = 0.1; } catch (e) {} } });
      if (v.play) v.play().catch(function () {}); glyph.appendChild(v);
    } else if (kind === 'tgs') {
      _loadLottie().then(function () {
        return fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
          var json = JSON.parse(pako.inflate(new Uint8Array(buf), { to: 'string' }));
          var anim = lottie.loadAnimation({ container: glyph, renderer: 'svg', loop: !opts.static, autoplay: !opts.static, animationData: json });
          if (opts.static) anim.goToAndStop(0, true);
        });
      }).catch(function () {});
    } else {
      var img = document.createElement('img'); img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;'; img.src = url; glyph.appendChild(img);
    }
  }
  function _spawnSticker(it, opts) {
    var poster = el('poster');
    var mode = it.mode || 'm-top';
    var MODES = window.MODES || [['m-top', 'Поверх'], ['m-blend', 'Слияние'], ['m-bg', 'Задний фон']];
    var s = document.createElement('div');
    s.className = 'stk ' + mode;
    s.dataset.rot = it.rot || 0; s.dataset.size = it.size || 52; s.dataset.mode = mode;
    if (it.url) { s.dataset.url = it.url; s.dataset.kind = it.kind || 'webp'; }
    s.innerHTML = '<span class="glyph"' + (it.url ? ' style="width:100%;height:100%;display:block;"' : '') + '></span>' +
      '<div class="frame"><div class="hnd h-rot">⟳</div><div class="hnd h-res">⤡</div><div class="hnd h-del">✕</div>' +
      '<div class="modes">' + MODES.map(function (m) { return '<div class="mdot' + (m[0] === mode ? ' on' : '') + '" data-mode="' + m[0] + '" title="' + m[1] + '"></div>'; }).join('') + '</div></div>';
    var glyph = s.querySelector('.glyph');
    if (it.url) _stickerMedia(glyph, it, opts); else glyph.textContent = it.glyph || '';
    // позиция: новый формат left/top(px) ИЛИ старый x/y(центр 0..1) — иначе стикеры падали в угол
    var px = parseInt(s.dataset.size, 10) || 52;
    var left = (it.left != null) ? it.left : (it.x != null ? it.x * 540 - px / 2 : 200);
    var top = (it.top != null) ? it.top : (it.y != null ? it.y * 675 - px / 2 : 260);
    s.style.left = left + 'px'; s.style.top = top + 'px';
    s.style.transform = 'rotate(' + (it.rot || 0) + 'deg)';
    poster.appendChild(s);
    if (typeof window.applySize === 'function') window.applySize(s);
    if (typeof window.bindStk === 'function') window.bindStk(s);
    return s;
  }

  /* режим редактора в приложении: адаптив под телефон, переименование, стикер-пак из бота */
  window.__fmxPosterEditorMode = function (opts) {
    opts = opts || {};
    if (!el('fmx-ed-style')) {
      var st = document.createElement('style'); st.id = 'fmx-ed-style';
      // панель во всю ширину под постером + крупнее контролы (после масштабирования iframe остаются читаемыми)
      // постер вплотную к верху окна, редактор почти вплотную к постеру;
      // размеры контролов панели задаёт __fmxPosterPanelScale (нативный размер на экране)
      st.textContent = 'body{padding:6px 8px 26px !important;gap:8px !important;align-items:center !important;justify-content:flex-start !important;}' +
        '.poster{box-shadow:0 12px 40px rgba(0,0,0,0.5) !important;}' +
        '.panel{width:540px !important;max-width:540px;margin-top:0 !important;}';
      document.head.appendChild(st);
    }
    var h2 = document.querySelector('.panel h2'); if (h2) h2.textContent = 'Редактор макета';
    // кнопка «Сбросить настройки» прямо под постером
    if (opts.defaultState && !el('fmx-ed-reset')) {
      var poster = el('poster');
      var rb = document.createElement('button');
      rb.id = 'fmx-ed-reset'; rb.type = 'button';
      rb.innerHTML = '↺ Сбросить настройки';
      rb.style.cssText = 'display:block;width:540px;max-width:540px;margin:0 auto;padding:12px;border-radius:12px;background:#141828;border:1px solid rgba(255,255,255,0.14);color:#c9cede;font-weight:600;cursor:pointer;font-family:inherit;';
      rb.addEventListener('click', function () { window.__fmxPosterReset(opts.defaultState); });
      if (poster && poster.parentNode) poster.parentNode.insertBefore(rb, poster.nextSibling);
    }
    // стикер-пак пользователя (до 30 из бота) — добавляем чипы в блок стикеров макета
    if (opts.stickers && opts.stickers.length && !el('fmx-ed-pack')) {
      var box = el('eChips');
      if (box) {
        var pack = document.createElement('div'); pack.id = 'fmx-ed-pack'; pack.className = 'chips';
        pack.style.cssText = 'margin-top:8px;';
        opts.stickers.slice(0, 30).forEach(function (s2) {
          var b = document.createElement('button'); b.className = 'chip'; b.style.cssText = 'width:52px;height:52px;padding:4px;';
          var mediaGlyph = document.createElement('span'); mediaGlyph.style.cssText = 'width:100%;height:100%;display:block;';
          _stickerMedia(mediaGlyph, s2, {}); b.appendChild(mediaGlyph);
          b.addEventListener('click', function () {
            // разные позиции как у эмодзи в макете — чтобы стикеры не стакались в углу
            var it = { url: s2.url, kind: s2.kind, mode: 'm-top', size: 96, rot: 0,
              left: 120 + Math.floor(Math.random() * 240), top: 150 + Math.floor(Math.random() * 200) };
            var stk = _spawnSticker(it, {});
            if (typeof window.selectStk === 'function') window.selectStk(stk);
          });
          pack.appendChild(b);
        });
        box.parentNode.insertBefore(pack, box.nextSibling);
      }
    }
  };

  window.__fmxPosterState = function () {
    var poster = el('poster');
    var st = {};
    st.bg = bgName();
    st.niche = !(el('nicheEl') && el('nicheEl').classList.contains('hide'));
    st.chart = !(el('chart') && el('chart').classList.contains('hide'));
    st.price = { on: !(el('prBox') && el('prBox').classList.contains('hide')), val: el('prInp') ? parseInt(el('prInp').value, 10) || 0 : 0 };
    var qrOn = document.querySelector('#qrChips .chip.on'); st.qr = qrOn ? qrOn.getAttribute('data-qr') : 'both';
    st.hook = el('hookInp') ? el('hookInp').value : '';
    // метрики: видимые (не hide и есть данные)
    st.metrics = {};
    METRIC_KEYS.forEach(function (k) { var c = document.querySelector('.mcell[data-m="' + k + '"]'); if (c && !c.getAttribute('data-noval')) st.metrics[k] = !c.classList.contains('hide'); });
    // порядок блоков (ORD макета)
    st.order = (window.ORD || []).map(function (o) { return o.key; });
    // цвета
    var C = window.COLORS || {};
    st.colors = { tit: C.tit, niche: C.niche, pr: C.pr, chart: C.chart, cells: {} };
    METRIC_KEYS.forEach(function (k) { var c = document.querySelector('.mcell[data-m="' + k + '"]'); if (c && c.dataset.hex) st.colors.cells[k] = c.dataset.hex; });
    // стикеры (эмодзи или из коллекции бота — url)
    st.stickers = [];
    poster.querySelectorAll('.stk').forEach(function (s) {
      var it = {
        mode: s.dataset.mode || 'm-top',
        size: parseInt(s.dataset.size, 10) || 52,
        rot: parseInt(s.dataset.rot, 10) || 0,
        left: parseFloat(s.style.left) || 0,
        top: parseFloat(s.style.top) || 0
      };
      if (s.dataset.url) { it.url = s.dataset.url; it.kind = s.dataset.kind || 'webp'; }
      else { var glyph = s.querySelector('.glyph'); it.glyph = glyph ? glyph.textContent : ''; }
      st.stickers.push(it);
    });
    return st;
  };

  function chipToggle(container, dataAttr, val, on) {
    var b = document.querySelector(container + ' [' + dataAttr + '="' + val + '"]');
    if (b) b.classList.toggle('on', !!on);
    return b;
  }

  window.__fmxPosterApply = function (state) {
    if (!state) return;
    var poster = el('poster');
    // фон
    if (state.bg) {
      var name = (typeof state.bg === 'object') ? 'photo' : state.bg;
      poster.className = poster.className.replace(/\bbg-\S+/g, '').replace(/\s+/g, ' ').trim() + ' bg-' + name;
      document.querySelectorAll('#bgChips .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-bg') === state.bg); });
      if (typeof state.bg === 'object' && state.bg.url) {
        var img = el('bgImg'), vid = el('bgVid');
        if (state.bg.kind === 'video') { if (vid) { vid.src = abs(state.bg.url); vid.classList.add('act'); if (img) img.classList.remove('act'); if (vid.play) vid.play().catch(function () {}); } }
        else { if (img) { img.src = abs(state.bg.url); img.classList.add('act'); } if (vid) vid.classList.remove('act'); }
      }
    }
    // ниша: показываем по состоянию (разделитель пуст, когда ниши нет — висячей точки не будет)
    var showN = state.niche !== false;
    if (el('nicheEl')) el('nicheEl').classList.toggle('hide', !showN);
    if (el('nicheSep')) el('nicheSep').classList.toggle('hide', !showN);
    var nch = el('nicheChip'); if (nch) nch.classList.toggle('on', showN);
    // график
    if (el('chart') && state.chart != null) el('chart').classList.toggle('hide', !state.chart);
    var cch = el('chartChip'); if (cch) cch.classList.toggle('on', state.chart !== false);
    // метрики
    if (state.metrics) METRIC_KEYS.forEach(function (k) {
      if (!(k in state.metrics)) return;
      var cell = document.querySelector('.mcell[data-m="' + k + '"]');
      if (cell) cell.classList.toggle('hide', !state.metrics[k]);
      var chip = document.querySelector('#mChips .chip[data-m="' + k + '"]'); if (chip) chip.classList.toggle('on', !!state.metrics[k]);
    });
    // цена
    if (state.price) {
      if (el('prBox')) el('prBox').classList.toggle('hide', !state.price.on);
      var pch = el('prChip'); if (pch) pch.classList.toggle('on', !!state.price.on);
      if (el('prInp') && state.price.val != null) { el('prInp').value = state.price.val; try { el('prInp').dispatchEvent(new Event('input')); } catch (e) {} }
    }
    // QR
    if (state.qr) { document.querySelectorAll('#qrChips .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-qr') === state.qr); }); renderQrsSafe(state.qr); }
    // текст
    if (state.hook != null) { if (el('hookInp')) el('hookInp').value = state.hook; if (el('hookText')) el('hookText').textContent = state.hook.trim() ? state.hook : (window.DEFAULT_HOOK || el('hookText').textContent); }
    // порядок блоков
    if (state.order && window.ORD) {
      window.ORD.sort(function (a, b) { return state.order.indexOf(a.key) - state.order.indexOf(b.key); });
      if (typeof window.renderOrd === 'function') window.renderOrd();
    }
    // цвета
    if (state.colors) {
      ['tit', 'niche', 'pr', 'chart'].forEach(function (k) { if (state.colors[k]) applyColorTo(k, state.colors[k]); });
      if (state.colors.cells) Object.keys(state.colors.cells).forEach(function (k) { applyColorTo('cell:' + k, state.colors.cells[k]); });
    }
    // стикеры — воссоздаём как это делает eChips макета, с bindStk/applySize/setMode (глобальные)
    poster.querySelectorAll('.stk').forEach(function (s) { s.remove(); });
    (state.stickers || []).forEach(function (it) { if (it && typeof it === 'object') { try { _spawnSticker(it); } catch (e) {} } });
    if (typeof window.relayout === 'function') window.relayout();
  };

  /* сброс всех настроек постера к дефолту (кнопка под постером) */
  window.__fmxPosterReset = function (defaultState) {
    // кастомные цвета палитры — к дефолтам макета
    if (el('titEl')) el('titEl').style.color = '';
    if (el('nicheEl')) el('nicheEl').style.color = '';
    document.querySelectorAll('.mcell .v').forEach(function (v) { v.style.color = ''; });
    var pb = el('prBox'); if (pb) { pb.style.background = ''; pb.style.boxShadow = ''; }
    if (el('gl1')) el('gl1').setAttribute('stop-color', '#3fae88');
    if (el('gl2')) el('gl2').setAttribute('stop-color', '#7be3c0');
    if (el('ga1')) el('ga1').setAttribute('stop-color', '#5DCAA5');
    if (el('dot')) el('dot').setAttribute('fill', '#7be3c0');
    if (el('dotHalo')) el('dotHalo').setAttribute('fill', '#7be3c0');
    if (el('chartPct')) el('chartPct').style.color = '';
    document.querySelectorAll('.mcell').forEach(function (c) { delete c.dataset.hex; });
    window.COLORS = { tit: '#e8e8ed', niche: '#5DCAA5', pr: '#5DCAA5', chart: '#5DCAA5' };
    window.__fmxPosterApply(defaultState || {});
  };

  /* контролы панели — в НАТИВНОМ размере на экране: iframe масштабируется на k,
     поэтому логические размеры = целевой/к (постер остаётся своим, панель читаемой) */
  window.__fmxPosterPanelScale = function (k) {
    k = (k && k > 0.05) ? k : 1;
    var st = el('fmx-ed-scale');
    if (!st) { st = document.createElement('style'); st.id = 'fmx-ed-scale'; document.head.appendChild(st); }
    function px(v) { return (v / k).toFixed(1) + 'px'; }
    st.textContent =
      '.panel h2{font-size:' + px(16) + ' !important;}' +
      '.panel .sub{font-size:' + px(11.5) + ' !important;}' +
      '.lbl{font-size:' + px(10.5) + ' !important;margin:' + px(14) + ' 0 ' + px(8) + ' !important;}' +
      '.chips{gap:' + px(7) + ' !important;}' +
      '.chip{font-size:' + px(13) + ' !important;padding:' + px(8) + ' ' + px(11) + ' !important;border-radius:' + px(11) + ' !important;}' +
      '.chip.emoji{font-size:' + px(19) + ' !important;padding:' + px(6) + ' ' + px(10) + ' !important;}' +
      'select,input[type=text],input[type=number]{font-size:' + px(14) + ' !important;padding:' + px(11) + ' ' + px(12) + ' !important;border-radius:' + px(11) + ' !important;}' +
      '.ordrow{font-size:' + px(13) + ' !important;padding:' + px(8) + ' ' + px(11) + ' !important;}' +
      '.ordbtn{width:' + px(28) + ' !important;height:' + px(28) + ' !important;font-size:' + px(13) + ' !important;}' +
      '.drop{font-size:' + px(11.5) + ' !important;padding:' + px(13) + ' !important;}' +
      '.genbtn{font-size:' + px(13) + ' !important;padding:' + px(12) + ' !important;}' +
      '.note,.gentip{font-size:' + px(11) + ' !important;}' +
      '#fmx-ed-pack .chip{width:' + px(52) + ' !important;height:' + px(52) + ' !important;padding:' + px(4) + ' !important;}' +
      '#fmx-ed-reset{font-size:' + px(13.5) + ' !important;padding:' + px(12) + ' !important;border-radius:' + px(12) + ' !important;margin:' + px(2) + ' auto ' + px(2) + ' !important;}';
  };

  /* режим рендера: прячем пульт и палитру, ставим постер в угол, сигналим готовность */
  window.__fmxPosterRenderMode = function () {
    var st = document.createElement('style');
    st.textContent = '.panel,.picker{display:none !important;} body{padding:0 !important;margin:0 !important;display:block !important;background:#0a0d18 !important;} .poster{box-shadow:none !important;} .stk .frame{display:none !important;}';
    document.head.appendChild(st);
    // снять выделение стикеров (рамки не должны попасть в PNG)
    document.querySelectorAll('.stk.sel').forEach(function (s) { s.classList.remove('sel'); });
  };

  /* серверная точка входа: данные + состояние + режим рендера + сигнал готовности */
  window.__fmxPosterRender = function (data, state, api, opts) {
    opts = opts || {};
    try {
      window.__fmxPosterInit(data, api);
      if (state) window.__fmxPosterApply(state);
      if (opts.render) window.__fmxPosterRenderMode();
    } catch (e) { if (window.console) console.error('poster render glue error', e); }
    var poster = el('poster');
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var imgs = [];
    if (el('avImg')) imgs.push(el('avImg'));
    if (el('bgImg') && el('bgImg').classList.contains('act')) imgs.push(el('bgImg'));
    var waits = imgs.map(function (im) { return new Promise(function (res) { if (im.complete) return res(); im.onload = res; im.onerror = res; setTimeout(res, 5000); }); });
    Promise.all([Promise.resolve(fontsReady).catch(function () {})].concat(waits)).then(function () {
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (typeof window.relayout === 'function') { try { window.relayout(); } catch (e) {} } poster.classList.add('ready'); }); });
    });
    setTimeout(function () { poster.classList.add('ready'); }, 9000);
  };
})();
