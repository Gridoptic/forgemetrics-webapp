/* Метрики канала — премиум-дашборд с живым авто-обновлением (без ручного рефреша).
   Плитки-иконки, площадной график просмотров с градиентом и свечением, тренд.
   Данные из fetch_channel_analytics + ad_health (бэкенд кэширует ~60с). */
(function () {
    'use strict';

    var _channels = null, _chId = null, _liveTimer = null, _first = true, _lastSig = '';

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} }
    function num(n) {
        if (n == null || isNaN(n)) return '—';
        n = Number(n);
        if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0).replace('.0', '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.0', '') + 'K';
        return String(Math.round(n));
    }
    function fmtVal(v, fmt) {
        if (fmt === 'pct') return Math.round(v) + '%';
        if (fmt === 'plain') return String(Math.round(v));
        return num(v);
    }

    function ensureScreen() {
        var host = document.getElementById('metrics-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'metrics-screen'; host.className = 'mx-screen';
            (document.getElementById('app') || document.body).appendChild(host);
            host.addEventListener('click', onClick);
        }
        host.style.display = 'flex';
        document.documentElement.classList.add('cs-modal-open');
        document.body.classList.add('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.onClick(close); tg.BackButton.show(); } } catch (e) {}
        return host;
    }
    function close() {
        stopLive();
        var host = document.getElementById('metrics-screen');
        if (host) host.style.display = 'none';
        document.documentElement.classList.remove('cs-modal-open');
        document.body.classList.remove('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.hide(); } } catch (e) {}
    }
    function stopLive() { if (_liveTimer) { clearInterval(_liveTimer); _liveTimer = null; } }
    function head() {
        return '<div class="mx-head"><button class="mx-back" data-act="close"><i class="ti ti-arrow-left"></i></button>' +
            '<div class="t">' + esc(T('Метрики канала')) + '</div><span class="mx-live"><span class="d"></span>' + esc(T('Вживую')) + '</span></div>';
    }
    function setView(html) { var h = ensureScreen(); h.innerHTML = head() + html; h.scrollTop = 0; return h; }
    function center(icon, msg, sub) {
        stopLive();
        setView('<div class="mx-center"><div class="big">' + icon + '</div><div class="m">' + esc(msg) + '</div>' +
            (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>');
    }

    window.__openChannelMetrics = function () {
        ensureScreen();
        _first = true; _lastSig = '';
        center('<div class="mx-spin"></div>', T('Загружаю метрики...'));
        if (_channels === null) {
            apiRequest('/api/v1/channels/active').then(function (d) {
                _channels = (d && d.channels) ? d.channels.filter(function (c) { return c.username; }) : [];
                if (_chId == null && d && d.active_channel_id) _chId = d.active_channel_id;
                if (_chId == null && _channels.length) _chId = _channels[0].id;
                load();
            }).catch(function () { _channels = []; load(); });
        } else { load(); }
    };

    function load() {
        stopLive();
        if (!_channels || !_channels.length || _chId == null) {
            center('📊', T('Подключи публичный канал, чтобы видеть его метрики.'));
            return;
        }
        _first = true; _lastSig = '';
        center('<div class="mx-spin"></div>', T('Считаю метрики канала...'), T('Обычно несколько секунд.'));
        fetchAndRender(true);
    }

    function fetchAndRender(showErr) {
        apiRequest('/api/v1/channels/' + _chId + '/metrics').then(function (d) {
            if (!d || !d.ok) {
                if (!showErr) return;   // на живом обновлении молча оставляем прежнее
                if (d && d.private) center('🔒', T('Метрики доступны только для публичных каналов (с @именем).'));
                else center('⚠️', T('Не удалось собрать метрики. Проверь, что канал публичный и попробуй ещё раз.'));
                return;
            }
            var sig = JSON.stringify([d.subscribers, d.avg_views, d.views_median, d.reach_percent, d.er_percent, d.posts_per_week, d.trend_percent, d.health_score, d.spark, (d.best_posts || []).map(function (p) { return p.views; })]);
            if (sig !== _lastSig) { _lastSig = sig; render(d); }
            startLive();
        }).catch(function () { if (showErr) center('⚠️', T('Не удалось собрать метрики. Попробуй ещё раз.')); });
    }

    function startLive() {
        if (_liveTimer) return;
        _liveTimer = setInterval(function () {
            var host = document.getElementById('metrics-screen');
            if (!host || host.style.display === 'none') { stopLive(); return; }
            if (document.hidden) return;
            fetchAndRender(false);
        }, 20000);
    }

    var HEALTH = {
        green: ['Живой канал', 'охват в норме', 'g'],
        amber: ['Средний охват', 'ниже нормы', 'a'],
        red: ['Слабый охват', 'проверь канал', 'r'],
    };

    function chans() {
        if (!_channels || _channels.length < 2) return '';
        return '<div class="mx-chans">' + _channels.map(function (c) {
            return '<button class="mx-chan' + (c.id === _chId ? ' on' : '') + '" data-chan="' + c.id + '">' + esc(c.title || ('@' + c.username)) + '</button>';
        }).join('') + '</div>';
    }

    function chart(arr) {
        if (!arr || arr.length < 2) return '';
        var W = 340, H = 120, top = 14, bot = 10;
        var max = Math.max.apply(null, arr), min = Math.min.apply(null, arr), rng = (max - min) || 1;
        var n = arr.length, sx = W / (n - 1);
        var xs = [], ys = [];
        for (var k = 0; k < n; k++) { xs.push(k * sx); ys.push(top + (1 - (arr[k] - min) / rng) * (H - top - bot)); }
        var d = 'M' + xs[0].toFixed(1) + ',' + ys[0].toFixed(1);
        for (var i = 0; i < n - 1; i++) {
            var x0 = i > 0 ? xs[i - 1] : xs[i], y0 = i > 0 ? ys[i - 1] : ys[i];
            var x1 = xs[i], y1 = ys[i], x2 = xs[i + 1], y2 = ys[i + 1];
            var x3 = i + 2 < n ? xs[i + 2] : x2, y3 = i + 2 < n ? ys[i + 2] : y2;
            var c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6;
            var c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6;
            d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1);
        }
        var area = d + ' L' + W.toFixed(1) + ',' + H + ' L0,' + H + ' Z';
        var lx = xs[n - 1], ly = ys[n - 1];
        return '<svg class="mx-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
            '<defs><linearGradient id="mxfill" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#8f98fb" stop-opacity="0.40"/>' +
            '<stop offset="0.65" stop-color="#8f98fb" stop-opacity="0.07"/>' +
            '<stop offset="1" stop-color="#8f98fb" stop-opacity="0"/></linearGradient></defs>' +
            '<path d="' + area + '" fill="url(#mxfill)"/>' +
            '<path d="' + d + '" fill="none" stroke="#a2a9ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
            '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="9" fill="#8f98fb" opacity="0.15"/>' +
            '<circle class="mx-endpoint" cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3.6" fill="#0a0d18" stroke="#a2a9ff" stroke-width="2.5" vector-effect="non-scaling-stroke"/>' +
            '</svg>';
    }

    function tile(icon, accent, label, value, sub, target, fmt) {
        var v = (target != null)
            ? '<div class="v" data-target="' + target + '" data-fmt="' + (fmt || 'num') + '">' + value + '</div>'
            : '<div class="v">' + value + '</div>';
        return '<div class="mx-tile ' + accent + '"><div class="ic"><i class="ti ' + icon + '"></i></div>' +
            v + '<div class="l">' + esc(T(label)) + '</div>' + (sub ? '<div class="sb">' + esc(sub) + '</div>' : '') + '</div>';
    }

    function render(d) {
        var hc = HEALTH[d.health_class] || ['Метрики собираются', '', 'x'];
        var trendTxt = '', trendCls = 'flat', trendIco = 'minus';
        if (d.trend_direction === 'growing') { trendTxt = '+' + Math.abs(d.trend_percent || 0) + '%'; trendCls = 'up'; trendIco = 'trending-up'; }
        else if (d.trend_direction === 'declining') { trendTxt = '−' + Math.abs(d.trend_percent || 0) + '%'; trendCls = 'down'; trendIco = 'trending-down'; }
        else if (d.trend_direction === 'stable') { trendTxt = T('стабильно'); trendCls = 'flat'; trendIco = 'minus'; }

        var erSub = d.er_anomaly ? T('это просмотры / подписчики, не реакции') : '';

        var chartCard = (d.spark && d.spark.length > 1)
            ? '<div class="mx-chartcard"><div class="mx-charttop"><div class="mx-lbl">' + esc(T('Динамика просмотров')) + '</div>' +
              (trendTxt ? '<span class="mx-tpill ' + trendCls + '"><i class="ti ti-' + trendIco + '"></i>' + esc(trendTxt) + '</span>' : '') + '</div>' +
              chart(d.spark) + '<div class="mx-chartfoot">' + esc(T('Просмотры последних постов')) + '</div></div>'
            : '';

        var tiles =
            tile('ti-users', 'i', 'Подписчики', num(d.subscribers), '', d.subscribers, 'num') +
            tile('ti-eye', 'i', 'Средние просмотры', num(d.avg_views), '', d.avg_views, 'num') +
            tile('ti-broadcast', 'g', 'Охват', d.reach_percent != null ? d.reach_percent + '%' : '—', T('медиана просмотров к подписчикам'), d.reach_percent, 'pct') +
            tile('ti-chart-dots-3', 'v', 'Медиана просмотров', num(d.views_median), '', d.views_median, 'num') +
            tile('ti-flame', d.er_anomaly ? 'w' : 'g', 'ER', d.er_percent != null ? d.er_percent + '%' : '—', erSub, d.er_percent, 'pct') +
            tile('ti-calendar-stats', 'i', 'Постов в неделю', d.posts_per_week != null ? String(d.posts_per_week) : '—', d.regularity === 'regular' ? T('регулярно') : (d.regularity === 'irregular' ? T('нерегулярно') : ''), (d.posts_per_week != null ? d.posts_per_week : null), 'plain');

        var best = (d.best_posts || []).filter(function (p) { return p.views; }).map(function (p, i) {
            return '<div class="mx-best"><div class="rk">' + (i + 1) + '</div><div class="bx"><div class="bv">' + num(p.views) + ' <span>' + esc(T('просмотров')) + '</span></div>' +
                '<div class="bt">' + esc(p.text || '') + (p.text && p.text.length >= 160 ? '…' : '') + '</div></div></div>';
        }).join('');

        setView(
            '<div class="mx-ch"><div class="av">' + esc((d.title || d.username || '?').charAt(0).toUpperCase()) + '</div>' +
            '<div class="nm"><b>' + esc(d.title || ('@' + d.username)) + '</b><span>@' + esc(d.username) + (d.niche ? ' · ' + esc(d.niche) : '') + '</span></div></div>' + chans() +

            '<div class="mx-health ' + hc[2] + '"><div class="ring"><div class="dot"></div></div><div class="ht"><b>' + esc(T(hc[0])) + '</b>' +
            (hc[1] ? '<span>' + esc(T(hc[1])) + (d.health_score != null ? ' · ' + d.health_score + '/100' : '') + '</span>' : '') + '</div>' +
            (d.health_score != null ? '<div class="score">' + d.health_score + '</div>' : '') + '</div>' +

            chartCard +
            '<div class="mx-grid">' + tiles + '</div>' +
            (best ? '<div class="mx-sec"><div class="mx-lbl">' + esc(T('Лучшие посты')) + '</div>' + best + '</div>' : ''));

        if (_first) { _first = false; countUp(document.getElementById('metrics-screen')); }
    }

    function countUp(root) {
        if (!root) return;
        var raf = window.requestAnimationFrame || function (cb) { return setTimeout(function () { cb(Date.now()); }, 16); };
        root.querySelectorAll('[data-target]').forEach(function (el) {
            var target = parseFloat(el.getAttribute('data-target'));
            if (isNaN(target)) return;
            var fmt = el.getAttribute('data-fmt') || 'num', dur = 700, t0 = null;
            (function frame(ts) {
                if (t0 == null) t0 = ts;
                var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
                el.textContent = fmtVal(target * e, fmt);
                if (p < 1) raf(frame); else el.textContent = fmtVal(target, fmt);
            })(0);
        });
    }

    function onClick(ev) {
        var t = ev.target;
        var chan = t.closest ? t.closest('[data-chan]') : null;
        if (chan) { _chId = +chan.getAttribute('data-chan'); haptic('light'); load(); return; }
        var actEl = t.closest ? t.closest('[data-act]') : null;
        if (!actEl) return;
        if (actEl.getAttribute('data-act') === 'close') { haptic('light'); close(); }
    }
})();
