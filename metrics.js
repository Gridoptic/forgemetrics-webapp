/* Метрики канала — объективный дашборд (подписчики, охват, ER, тренд, регулярность,
   лучшие посты, спарклайн просмотров). Данные из fetch_channel_analytics + ad_health. */
(function () {
    'use strict';

    var _channels = null, _chId = null, _busy = false;

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
        var host = document.getElementById('metrics-screen');
        if (host) host.style.display = 'none';
        document.documentElement.classList.remove('cs-modal-open');
        document.body.classList.remove('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.hide(); } } catch (e) {}
    }
    function head() {
        return '<div class="mx-head"><button class="mx-back" data-act="close"><i class="ti ti-arrow-left"></i></button>' +
            '<div class="t">' + esc(T('Метрики канала')) + '</div></div>';
    }
    function setView(html) { var h = ensureScreen(); h.innerHTML = head() + html; h.scrollTop = 0; return h; }
    function center(icon, msg, sub) {
        setView('<div class="mx-center"><div class="big">' + icon + '</div><div class="m">' + esc(msg) + '</div>' +
            (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>');
    }

    window.__openChannelMetrics = function () {
        ensureScreen();
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
        if (!_channels || !_channels.length || _chId == null) {
            center('📊', T('Подключи публичный канал, чтобы видеть его метрики.'));
            return;
        }
        _busy = true;
        center('<div class="mx-spin"></div>', T('Считаю метрики канала...'), T('Обычно несколько секунд.'));
        apiRequest('/api/v1/channels/' + _chId + '/metrics').then(function (d) {
            _busy = false;
            if (!d || !d.ok) {
                if (d && d.private) center('🔒', T('Метрики доступны только для публичных каналов (с @именем).'));
                else center('⚠️', T('Не удалось собрать метрики. Проверь, что канал публичный и попробуй ещё раз.'));
                return;
            }
            render(d);
        }).catch(function () { _busy = false; center('⚠️', T('Не удалось собрать метрики. Попробуй ещё раз.')); });
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

    function spark(arr) {
        if (!arr || arr.length < 2) return '';
        var w = 300, h = 46, max = Math.max.apply(null, arr), min = Math.min.apply(null, arr);
        var rng = (max - min) || 1;
        var step = w / (arr.length - 1);
        var pts = arr.map(function (v, i) { return (i * step).toFixed(1) + ',' + (h - ((v - min) / rng) * (h - 6) - 3).toFixed(1); });
        var last = pts[pts.length - 1].split(',');
        return '<svg class="mx-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
            '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#818cf8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
            '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="#818cf8"/></svg>';
    }

    function tile(label, value, sub, accent) {
        return '<div class="mx-tile' + (accent ? ' ' + accent : '') + '"><div class="v">' + value + '</div>' +
            '<div class="l">' + esc(T(label)) + '</div>' + (sub ? '<div class="sb">' + esc(sub) + '</div>' : '') + '</div>';
    }

    function render(d) {
        var hc = HEALTH[d.health_class] || ['Метрики собираются', '', 'x'];
        var trendTxt = '', trendCls = '';
        if (d.trend_direction === 'growing') { trendTxt = T('Просмотры растут') + (d.trend_percent ? ' +' + Math.abs(d.trend_percent) + '%' : ''); trendCls = 'up'; }
        else if (d.trend_direction === 'declining') { trendTxt = T('Просмотры снижаются') + (d.trend_percent ? ' −' + Math.abs(d.trend_percent) + '%' : ''); trendCls = 'down'; }
        else if (d.trend_direction === 'stable') { trendTxt = T('Просмотры стабильны'); trendCls = 'flat'; }

        var erSub = d.er_anomaly ? T('это просмотры / подписчики, не реакции') : '';

        var tiles =
            tile('Подписчики', num(d.subscribers)) +
            tile('Средние просмотры', num(d.avg_views)) +
            tile('Охват', d.reach_percent != null ? d.reach_percent + '%' : '—', T('медиана просмотров к подписчикам')) +
            tile('Медиана просмотров', num(d.views_median)) +
            tile('ER', d.er_percent != null ? d.er_percent + '%' : '—', erSub, d.er_anomaly ? 'warn' : '') +
            tile('Постов в неделю', d.posts_per_week != null ? String(d.posts_per_week) : '—', d.regularity === 'regular' ? T('регулярно') : (d.regularity === 'irregular' ? T('нерегулярно') : ''));

        var best = (d.best_posts || []).filter(function (p) { return p.views; }).map(function (p) {
            return '<div class="mx-best"><div class="bv">' + num(p.views) + ' <span>' + esc(T('просмотров')) + '</span></div>' +
                '<div class="bt">' + esc(p.text || '') + (p.text && p.text.length >= 160 ? '…' : '') + '</div></div>';
        }).join('');

        setView(
            '<div class="mx-ch"><div class="nm">' + esc(d.title || ('@' + d.username)) + '</div>' +
            '<div class="un">@' + esc(d.username) + (d.niche ? ' · ' + esc(d.niche) : '') + '</div></div>' + chans() +

            '<div class="mx-health ' + hc[2] + '"><div class="dot"></div><div class="ht"><b>' + esc(T(hc[0])) + '</b>' +
            (hc[1] ? '<span>' + esc(T(hc[1])) + (d.health_score != null ? ' · ' + d.health_score + '/100' : '') + '</span>' : '') + '</div></div>' +

            '<div class="mx-grid">' + tiles + '</div>' +

            (trendTxt ? '<div class="mx-trend ' + trendCls + '"><i class="ti ti-' + (trendCls === 'up' ? 'trending-up' : (trendCls === 'down' ? 'trending-down' : 'minus')) + '"></i> ' + esc(trendTxt) + '</div>' : '') +
            (d.spark && d.spark.length > 1 ? '<div class="mx-sparkwrap"><div class="mx-lbl">' + esc(T('Просмотры последних постов')) + '</div>' + spark(d.spark) + '</div>' : '') +

            (best ? '<div class="mx-sec"><div class="mx-lbl">' + esc(T('Лучшие посты')) + '</div>' + best + '</div>' : ''));
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
