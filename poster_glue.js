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

  /* === свой фон: серверный url + режим кадрирования (пан/зум) === */
  var _customBg = null;               // {url, kind} — ЗАГРУЖЕННЫЙ на сервер файл своего фона
  var _bgpan = { x: 0, y: 0, s: 1 };  // сдвиг (px в системе постера 540x675) и масштаб своей картинки
  var _bgUploadPending = null;        // промис текущей загрузки файла на сервер (ждём при закрытии/отправке)
  var _bgUploadError = null;          // текст ошибки загрузки своего фона (слишком большой и т.п.)
  var _bgCrop = false;                // включён режим кадрирования фона
  function _isPhotoBg() { var p = el('poster'); return !!(p && /\bbg-photo\b/.test(p.className)); }
  /* Режим кадрирования: поверх постера — прозрачный слой-захват (#fmx-bg-catch). Он ловит
     перетаскивание/щипок/колесо в ЛЮБОМ месте постера, а блоки под ним не мешают и ничего не
     сбрасывают. Вход/выход — кнопкой «Кадрировать фон»/«Готово». Так удобно двигать перекрытый фон. */
  function _setBgCrop(on) {
    on = !!on && _isPhotoBg();
    _bgCrop = on;
    var poster = el('poster'); if (poster) poster.classList.toggle('fmx-bgsel', on);
    var c = el('fmx-bg-catch'); if (c) c.style.display = on ? 'block' : 'none';
    var h = el('fmx-bg-hint'); if (h) h.style.display = on ? 'block' : 'none';
    var btn = el('fmx-ed-bgcrop'); if (btn) { btn.innerHTML = on ? '✓ Готово' : '⤢ Кадрировать фон'; btn.classList.toggle('on', on); }
    if (on && typeof window.selectStk === 'function') { try { window.selectStk(null); } catch (e) {} }
    // прячем ползунок студии на время кадрирования: двигают фон, а не листают. Только КЛАСС на
    // скроллбар — overflow НЕ трогаем, скролл остаётся рабочим (в т.ч. после «Готово»).
    try {
      var host = window.frameElement;
      var box = host && host.closest ? host.closest('.fmx-psScroll') : null;
      if (box) box.classList.toggle('fmx-cropbar', on);
    } catch (e) {}
  }
  function _updateBgCropBtn() {
    var btn = el('fmx-ed-bgcrop'); if (btn) btn.style.display = _isPhotoBg() ? 'block' : 'none';
    if (!_isPhotoBg() && _bgCrop) _setBgCrop(false);  // ушли с фото-фона — режим выключаем
  }
  function _bgEls() { var a = [], i = el('bgImg'), v = el('bgVid'); if (i) a.push(i); if (v) a.push(v); return a; }
  function _clampBgpan() {
    var s = Math.max(1, Math.min(+_bgpan.s || 1, 4)); _bgpan.s = s;
    var mx = (s - 1) * 270, my = (s - 1) * 337.5;   // не даём краям картинки вылезти за постер (нет слепых зон)
    _bgpan.x = Math.max(-mx, Math.min(+_bgpan.x || 0, mx));
    _bgpan.y = Math.max(-my, Math.min(+_bgpan.y || 0, my));
  }
  function _applyBgpan() {
    _clampBgpan();
    var photo = _isPhotoBg();
    _updateBgCropBtn();
    var t = 'translate(' + _bgpan.x + 'px,' + _bgpan.y + 'px) scale(' + _bgpan.s + ')';
    _bgEls().forEach(function (e) {
      if (photo) { e.style.transformOrigin = 'center center'; e.style.transform = t; }
      else { e.style.transform = ''; }  // пресетам возвращаем родной CSS (у блюра свой scale)
    });
  }

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
    var spans = document.querySelectorAll('#qrs .qrt span');
    var chIdx = (mode === 'both' || mode === 'channel') ? 0 : -1;
    var cardIdx = (mode === 'both') ? 1 : (mode === 'card' ? 0 : -1);
    if (_uname && chIdx >= 0 && spans[chIdx]) spans[chIdx].textContent = '@' + _uname;
    // @-ник, а не «Карточка»: вне Telegram сразу понятно, что это Telegram, ник вбивается руками,
    // и постер попутно рекламирует площадку. Смысл действия даёт «Забронировать ↓» над QR
    if (cardIdx >= 0 && spans[cardIdx]) spans[cardIdx].textContent = '@ForgeMetricsBot';
  }
  function renderQrsSafe(mode) { if (typeof window.renderQrs === 'function') { window.renderQrs(mode); relabelQr(mode); } }

  window.__fmxPosterInit = function (data, api) {
    if (api != null) API = api;
    data = data || {};
    // QR: подпись не должна быть шире самого QR (иначе белый блок растягивается — было видно на @ForgeMetricsBot)
    if (!el('fmx-qr-fix')) {
      var qs = document.createElement('style'); qs.id = 'fmx-qr-fix';
      // блоки QR одинаковой ширины (по QR ~80px), подпись мельче — чтобы «@ForgeMetricsBot» влезал целиком и блок не растягивался
      qs.textContent = '#qrs .qrt{width:92px !important;box-sizing:border-box !important;}' +
        '#qrs .qrt span{max-width:86px !important;font-size:7px !important;letter-spacing:0.1px !important;}';
      document.head.appendChild(qs);
    }
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
  var _anims = [];  // реестр движущихся элементов для покадрового видео-рендера: {kind:'video',el} | {kind:'lottie',anim}
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
      _anims.push({ kind: 'video', el: v });  // для покадрового видео-рендера
    } else if (kind === 'tgs') {
      _loadLottie().then(function () {
        return fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
          var json = JSON.parse(pako.inflate(new Uint8Array(buf), { to: 'string' }));
          var anim = lottie.loadAnimation({ container: glyph, renderer: 'svg', loop: !opts.static, autoplay: !opts.static, animationData: json });
          if (opts.static) anim.goToAndStop(0, true);
          _anims.push({ kind: 'lottie', anim: anim });  // для покадрового видео-рендера
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
      // min-height:0 + align-content:flex-start убирают распирание flex-строк (иначе огромные
      // пустоты между блоками из-за 100vh); размеры контролов задаёт __fmxPosterPanelScale
      st.textContent = '*{-webkit-tap-highlight-color:transparent !important;}button:focus,.chip:focus{outline:none !important;}' +
        'body{padding:6px 8px 26px !important;gap:10px !important;min-height:0 !important;' +
        'align-items:center !important;align-content:flex-start !important;justify-content:flex-start !important;}' +
        '.poster{box-shadow:0 12px 40px rgba(0,0,0,0.5) !important;}' +
        '.panel{width:540px !important;max-width:540px;margin-top:0 !important;}' +
        /* подсветка выделенного фона: рамка + затемнение подсказки, чтобы было понятно, что фон двигается */
        '.poster.fmx-bgsel::after{content:"";position:absolute;inset:0;border-radius:28px;pointer-events:none;z-index:8;' +
        'box-shadow:inset 0 0 0 2px rgba(93,202,165,0.95), 0 0 0 3px rgba(93,202,165,0.3);}' +
        '#fmx-bg-hint{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,13,24,0.92);' +
        'border:1px solid rgba(93,202,165,0.5);color:#5DCAA5;font-size:11px;font-weight:600;padding:6px 13px;border-radius:999px;' +
        'z-index:9;pointer-events:none;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 20px rgba(0,0,0,0.5);}';
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
    // свой фон: загрузка на сервер + пан/зум жестами
    _setupCustomBg();
  };

  window.__fmxPosterState = function () {
    var poster = el('poster');
    var st = {};
    var _bn = bgName();
    if (_bn === 'photo') {
      // свой фон: сохраняем ОБЪЕКТ с серверным url (иначе бэкенд не поймёт "photo" и откатит на blur)
      st.bg = (_customBg && _customBg.url) ? { url: _customBg.url, kind: _customBg.kind || 'img' } : 'blur';
      if (typeof st.bg === 'object') st.bgpan = { x: Math.round(_bgpan.x), y: Math.round(_bgpan.y), s: +(+_bgpan.s).toFixed(3) };
    } else {
      st.bg = _bn;
    }
    st.niche = !(el('nicheEl') && el('nicheEl').classList.contains('hide'));
    st.chart = !(el('chart') && el('chart').classList.contains('hide'));
    st.price = {
      on: !(el('prBox') && el('prBox').classList.contains('hide')),
      val: el('prInp') ? parseInt(el('prInp').value, 10) || 0 : 0,
      fmt: el('prFmtInp') ? String(el('prFmtInp').value || '').trim().slice(0, 40) : ''  // формат размещения (необязательно)
    };
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
    _anims = [];  // пересобираем реестр движущихся элементов (видео-фон + анимо-стикеры) для видео-рендера
    // фон
    if (state.bg) {
      var name = (typeof state.bg === 'object') ? 'photo' : state.bg;
      poster.className = poster.className.replace(/\bbg-\S+/g, '').replace(/\s+/g, ' ').trim() + ' bg-' + name;
      document.querySelectorAll('#bgChips .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-bg') === state.bg); });
      if (typeof state.bg === 'object' && state.bg.url) {
        _customBg = { url: state.bg.url, kind: state.bg.kind || 'img' };
        _bgpan = (state.bgpan && typeof state.bgpan === 'object')
          ? { x: +state.bgpan.x || 0, y: +state.bgpan.y || 0, s: +state.bgpan.s || 1 }
          : { x: 0, y: 0, s: 1 };
        var img = el('bgImg'), vid = el('bgVid');
        if (state.bg.kind === 'video') { if (vid) { vid.src = abs(state.bg.url); vid.classList.add('act'); if (img) img.classList.remove('act'); if (vid.play) vid.play().catch(function () {}); _anims.push({ kind: 'video', el: vid }); } }
        else { if (img) { img.src = abs(state.bg.url); img.classList.add('act'); } if (vid) vid.classList.remove('act'); }
      }
    }
    _applyBgpan();
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
      // формат размещения — после цены: prInp может скрыть подпись, prFmtInp задаёт её текст
      if (el('prFmtInp')) { el('prFmtInp').value = state.price.fmt || ''; try { el('prFmtInp').dispatchEvent(new Event('input')); } catch (e) {} }
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
    _customBg = null; _bgpan = { x: 0, y: 0, s: 1 };  // свой фон и пан/зум — к дефолту
    _setBgCrop(false);
    window.__fmxPosterApply(defaultState || {});
  };

  /* загрузка своего фона на сервер (иначе картинка живёт лишь в браузере и в чат уходит blur).
     Загрузчик даёт приложение через window.__fmxPosterUploader(file) -> Promise<{url, kind}>. */
  function _uploadCustomBg(f) {
    if (!f || typeof window.__fmxPosterUploader !== 'function') return null;
    var drop = el('drop'), orig = drop ? drop.innerHTML : '';
    if (drop) drop.textContent = 'Загружаю фон на сервер…';
    _bgUploadError = null;                              // новый выбор — прошлую ошибку сбрасываем
    var p = Promise.resolve(window.__fmxPosterUploader(f)).then(function (res) {
      if (res && res.url) { _customBg = { url: res.url, kind: res.kind || 'img' }; _bgUploadError = null; }
      else { _customBg = null; _bgUploadError = 'Не удалось загрузить фон'; }
      if (drop) drop.textContent = (res && res.url) ? 'Фон загружен ✓ — нажмите, чтобы заменить' : 'Не удалось загрузить фон';
      return res;
    }).catch(function (e) {
      _customBg = null;
      // текст с сервера («Файл больше 120 МБ») — чтобы объяснить пользователю, что пошло не так
      _bgUploadError = (e && e.message) ? String(e.message) : 'Не удалось загрузить фон';
      if (drop) { drop.textContent = 'Не удалось загрузить фон — попробуйте ещё раз'; setTimeout(function () { if (drop) drop.innerHTML = orig; }, 2600); }
      throw e;
    });
    _bgUploadPending = p;
    return p;
  }
  window.__fmxPosterBgPending = function () { return _bgUploadPending; };
  /* Пользователь выбрал свой фон, но на сервер он не загрузился (обычно слишком большой).
     Возвращаем текст ошибки — чтобы не отправлять молча постер с дефолтным фоном. */
  window.__fmxPosterBgError = function () {
    return (bgName() === 'photo' && !(_customBg && _customBg.url)) ? (_bgUploadError || 'Фон не загрузился') : null;
  };

  /* обёртка выбора своего фона (setOwnBg макета) + создание кнопки кадрирования и слоя-захвата.
     Вызывается из editorMode. */
  function _setupCustomBg() {
    // подсказка про лимит размера прямо в области выбора: иначе непонятно, почему тяжёлый файл
    // в конструкторе играет (локальное превью), а в постер не попадает (на сервер не влез)
    var drop0 = el('drop');
    if (drop0 && drop0.innerHTML.indexOf('до 64 МБ') < 0) {
      drop0.innerHTML += '<br><span style="opacity:.65;font-size:11px;">Файл до 64 МБ · для видео берётся первый отрезок 20 сек</span>';
    }
    if (!window.__fmxBgWrapped && typeof window.setOwnBg === 'function') {
      window.__fmxBgWrapped = true;
      var origSet = window.setOwnBg;
      window.setOwnBg = function (f) {
        // большой файл отклоняем СРАЗУ при выборе — не показываем превью, которое всё равно
        // не уйдёт в постер (на сервер не влезет). 64 МБ — синхронно с бэкендом.
        if (f && f.size > 64 * 1024 * 1024) {
          var msg = 'Файл ' + Math.round(f.size / 1048576) + ' МБ — это больше 64 МБ. Возьми полегче';
          var d = el('drop');
          if (d) { var o = d.innerHTML; d.textContent = msg; setTimeout(function () { if (d) d.innerHTML = o; }, 3200); }
          // и заметный всплывающий тост поверх студии — текст в области легко пропустить
          try { if (typeof window.__fmxPosterNotify === 'function') window.__fmxPosterNotify(msg); } catch (e) {}
          return;                                          // ни превью, ни загрузки
        }
        try { origSet(f); } catch (e) {}                 // мгновенное локальное превью (blob) — как в макете
        _bgpan = { x: 0, y: 0, s: 1 };                    // свежая картинка — без сдвига
        _updateBgCropBtn();                               // показать кнопку «Кадрировать фон»
        _applyBgpan();
        // кадрирование НЕ включаем автоматически: его слой перекрывает постер и мешает листать
        // студию. Пользователь сам жмёт «Кадрировать фон», когда хочет подвинуть фон.
        _uploadCustomBg(f);                                // грузим на сервер
      };
    }
    // кнопка режима кадрирования — прямо под постером, над «Сбросить настройки» (центрирована, тап-зона ≥40px)
    if (!el('fmx-ed-bgcrop')) {
      var anchor = el('fmx-ed-reset') || el('drop');
      if (anchor && anchor.parentNode) {
        var b = document.createElement('button'); b.id = 'fmx-ed-bgcrop'; b.type = 'button';
        b.innerHTML = '⤢ Кадрировать фон';
        b.style.cssText = 'display:none;width:540px;max-width:540px;margin:0 auto 2px;padding:12px;border-radius:12px;background:#141828;border:1px solid rgba(93,202,165,0.45);color:#5DCAA5;font-weight:600;cursor:pointer;font-family:inherit;';
        b.addEventListener('click', function () { _setBgCrop(!_bgCrop); });
        anchor.parentNode.insertBefore(b, anchor);  // над кнопкой сброса (или перед дропом как запасной вариант)
      }
    }
    _ensureBgOverlay();
    var chips = el('bgChips');
    if (chips && !chips.__fmxHook) { chips.__fmxHook = true; chips.addEventListener('click', function () { setTimeout(_applyBgpan, 0); }); }
    _updateBgCropBtn();
  }

  /* прозрачный слой-захват поверх постера + подсказка. Слой активен только в режиме кадрирования:
     ловит перетаскивание/щипок/колесо в любом месте, а блоки под ним ничего не перехватывают. */
  function _ensureBgOverlay() {
    var poster = el('poster'); if (!poster) return;
    if (!el('fmx-bg-hint')) {
      var h = document.createElement('div'); h.id = 'fmx-bg-hint';
      h.textContent = 'Перетащите или масштабируйте фон';
      h.style.display = 'none'; poster.appendChild(h);
    }
    if (el('fmx-bg-catch')) return;
    var c = document.createElement('div'); c.id = 'fmx-bg-catch';
    c.style.cssText = 'position:absolute;inset:0;z-index:7;display:none;touch-action:none;cursor:move;';
    poster.appendChild(c);
    var ptrs = {}, startPan = null, downXY = null, pinch = null;
    function ids() { return Object.keys(ptrs); }
    c.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var list = ids();
      if (list.length === 1) { startPan = { x: _bgpan.x, y: _bgpan.y }; downXY = { x: e.clientX, y: e.clientY }; pinch = null; }
      else if (list.length === 2) {
        var a = ptrs[list[0]], b = ptrs[list[1]];
        pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: _bgpan.s, x0: _bgpan.x, y0: _bgpan.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      }
      try { c.setPointerCapture(e.pointerId); } catch (_) {}
    });
    c.addEventListener('pointermove', function (e) {
      if (!(e.pointerId in ptrs)) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var list = ids();
      if (list.length >= 2 && pinch) {
        var a = ptrs[list[0]], b = ptrs[list[1]];
        _bgpan.s = pinch.s0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0);
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        _bgpan.x = pinch.x0 + (mx - pinch.mx); _bgpan.y = pinch.y0 + (my - pinch.my);
        _applyBgpan(); e.preventDefault();
      } else if (list.length === 1 && startPan && downXY) {
        _bgpan.x = startPan.x + (e.clientX - downXY.x); _bgpan.y = startPan.y + (e.clientY - downXY.y);
        _applyBgpan(); e.preventDefault();
      }
    });
    function end(e) {
      if (!(e.pointerId in ptrs)) return;
      delete ptrs[e.pointerId];
      try { c.releasePointerCapture(e.pointerId); } catch (_) {}
      var list = ids();
      if (list.length < 2) pinch = null;
      if (list.length === 1) { startPan = { x: _bgpan.x, y: _bgpan.y }; downXY = { x: ptrs[list[0]].x, y: ptrs[list[0]].y }; }
      else if (list.length === 0) { startPan = null; downXY = null; }
    }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', function (e) { e.preventDefault(); _bgpan.s = _bgpan.s * Math.exp(-e.deltaY * 0.0015); _applyBgpan(); }, { passive: false });
    c.addEventListener('dblclick', function (e) { e.preventDefault(); _bgpan = { x: 0, y: 0, s: 1 }; _applyBgpan(); });  // двойной тап — сброс кадрирования
  }

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
      '#fmx-ed-reset{font-size:' + px(13.5) + ' !important;padding:' + px(12) + ' !important;border-radius:' + px(12) + ' !important;margin:' + px(2) + ' auto ' + px(2) + ' !important;}' +
      '#fmx-ed-bgcrop{font-size:' + px(13.5) + ' !important;padding:' + px(12) + ' !important;border-radius:' + px(12) + ' !important;margin:' + px(2) + ' auto ' + px(2) + ' !important;}' +
      /* палитра цвета: она живёт внутри масштабированного iframe и ужималась вместе с постером.
         Компенсируем — на экране получается нативный размер, квадрат и ползунок нормально ловятся пальцем */
      '.picker{width:' + px(252) + ' !important;padding:' + px(14) + ' !important;border-radius:' + px(14) + ' !important;}' +
      '.pkhead{margin-bottom:' + px(10) + ' !important;}' +
      '.picker .pt{font-size:' + px(12) + ' !important;}' +
      '.pkx{font-size:' + px(13) + ' !important;padding:' + px(2) + ' ' + px(7) + ' !important;border-radius:' + px(7) + ' !important;}' +
      '.picker .sv{height:' + px(130) + ' !important;border-radius:' + px(10) + ' !important;}' +
      '.picker .svdot{width:' + px(14) + ' !important;height:' + px(14) + ' !important;}' +
      '.picker .cap{font-size:' + px(9) + ' !important;}' +
      '.picker .hue{height:' + px(14) + ' !important;margin-top:' + px(10) + ' !important;border-radius:' + px(8) + ' !important;}' +
      '.picker .hue::-webkit-slider-thumb{width:' + px(18) + ' !important;height:' + px(18) + ' !important;}' +
      '.picker .crow{gap:' + px(6) + ' !important;margin-top:' + px(10) + ' !important;}' +
      '.picker .crow input{font-size:' + px(12.5) + ' !important;padding:' + px(8) + ' ' + px(2) + ' !important;border-radius:' + px(9) + ' !important;}' +
      '.picker .preset{margin-top:' + px(10) + ' !important;gap:' + px(6) + ' !important;}' +
      '.picker .pd{width:' + px(22) + ' !important;height:' + px(22) + ' !important;border-radius:' + px(7) + ' !important;}';
  };

  /* режим рендера: прячем пульт и палитру, ставим постер в угол, сигналим готовность */
  window.__fmxPosterRenderMode = function () {
    var st = document.createElement('style');
    st.textContent = '.panel,.picker{display:none !important;} body{padding:0 !important;margin:0 !important;display:block !important;background:#0a0d18 !important;} .poster{box-shadow:none !important;} .stk .frame{display:none !important;}' +
      '#fmx-bg-catch,#fmx-bg-hint,#fmx-ed-bgcrop{display:none !important;} .poster.fmx-bgsel::after{display:none !important;}';
    document.head.appendChild(st);
    // снять выделение стикеров и рамку кадрирования (не должны попасть в PNG)
    document.querySelectorAll('.stk.sel').forEach(function (s) { s.classList.remove('sel'); });
    var p = el('poster'); if (p) p.classList.remove('fmx-bgsel');
  };

  /* стабилизация текста в ВИДЕО: блоки метрик и график делаем НЕПРОЗРАЧНЫМИ — иначе движущийся фон
     просвечивает сквозь стекло и края букв «кипят»/дрожат кадр-к-кадру. В PNG стекло сохраняется
     (там движения нет). Живой фон остаётся в шапке, промежутках и стикерах. */
  window.__fmxPosterVideoMode = function () {
    var st = document.createElement('style');
    st.textContent = '.mcell,.chart{background-color:rgba(12,15,26,0.99) !important;' +
      'backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}';
    document.head.appendChild(st);
  };

  /* видео-рендер: ждём готовности всех движущихся элементов (видео загрузилось, Lottie построился) */
  window.__fmxPosterAnimsReady = function () {
    return Promise.all(_anims.map(function (a) {
      return new Promise(function (res) {
        var done = false, fin = function () { if (done) return; done = true; res(); };
        if (a.kind === 'video') {
          if (a.el.readyState >= 2) return fin();
          a.el.addEventListener('loadeddata', fin, { once: true });
        } else if (a.kind === 'lottie' && a.anim) {
          if (a.anim.isLoaded) return fin();
          try { a.anim.addEventListener('DOMLoaded', fin); } catch (e) {}
        }
        setTimeout(fin, 5000);  // страховка — не зависаем на битом стикере
      });
    }));
  };

  /* видео-рендер: длительность самого длинного движущегося элемента (сек) — чтобы ролик был длиной с контент.
     Вызывать ПОСЛЕ __fmxPosterAnimsReady (иначе duration видео ещё неизвестна). 0 — анимаций нет. */
  window.__fmxPosterMaxDuration = function () {
    var d = 0;
    _anims.forEach(function (a) {
      if (a.kind === 'video' && a.el && isFinite(a.el.duration) && a.el.duration > 0) d = Math.max(d, a.el.duration);
      else if (a.kind === 'lottie' && a.anim) { try { var ld = a.anim.getDuration(false); if (ld > 0) d = Math.max(d, ld); } catch (e) {} }
    });
    return d;
  };

  /* видео-рендер: детерминированно перематываем ВСЕ движущиеся элементы на время t (мс) и ждём кадр.
     Без этого ролик пришлось бы писать в реальном времени с плавающим FPS. */
  window.__fmxPosterSeek = function (t_ms) {
    var waits = [];
    _anims.forEach(function (a) {
      if (a.kind === 'video') {
        var v = a.el, d = (v.duration && isFinite(v.duration) && v.duration > 0) ? v.duration : 3;
        try { v.pause(); } catch (e) {}
        var tt = (t_ms / 1000) % d;
        waits.push(new Promise(function (res) {
          var done = false, fin = function () { if (done) return; done = true; res(); };
          v.addEventListener('seeked', fin, { once: true });
          setTimeout(fin, 400);
          try { v.currentTime = tt; } catch (e) { fin(); }
        }));
      } else if (a.kind === 'lottie' && a.anim) {
        try {
          var tf = a.anim.totalFrames || 1, fr = a.anim.frameRate || 30;
          a.anim.goToAndStop(((t_ms / 1000) * fr) % tf, true);
        } catch (e) {}
      }
    });
    return Promise.all(waits).then(function () {
      return new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); });
    });
  };

  /* серверная точка входа: данные + состояние + режим рендера + сигнал готовности */
  window.__fmxPosterRender = function (data, state, api, opts) {
    opts = opts || {};
    try {
      window.__fmxPosterInit(data, api);
      if (state) window.__fmxPosterApply(state);
      if (opts.video) { window.__fmxPosterRenderMode(); window.__fmxPosterVideoMode(); }
      else if (opts.render) window.__fmxPosterRenderMode();
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
