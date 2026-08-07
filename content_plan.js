(function () {
    'use strict';

    var _state = null;
    var _pollTimer = null, _genTimer = null;
    var _channels = null;
    var _chId = null;
    var _goal = 'engagement';
    var _days = null;
    var _selDay = 0;
    var _dayBusy = {};
    var _batchTimer = null;
    var _ap = null;
    var _rubrics = [];
    var _review = null;
    var _cal = null;
    var _rubBusy = false;
    var _avg = 1;
    var _spread = 'live';
    var _apBusy = false;

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }
    function wallet() { return (_state && _state.wallet) || {}; }
    function forgeTag(n) {
        if (typeof window.forgeAmount === 'function') return window.forgeAmount(n, 12);
        return esc(String(n)) + ' Forge';
    }
    function plural3(n, one, few, many) {
        var a = n % 10, b = n % 100;
        if (a === 1 && b !== 11) return one;
        if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
        return many;
    }
    function esc(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} }
    function toast(m) { try { if (typeof showToast === 'function') return showToast(m); } catch (e) {} try { if (typeof alertDialog === 'function') alertDialog(m); } catch (e) {} }

    var WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    var WD_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    var MIN_POSTS = 3;
    var MAX_PER_DAY = 10;
    var MAX_WEEK = 70;
    var GOALS = [
        ['growth', 'Рост подписчиков'], ['engagement', 'Вовлечённость'],
        ['sales', 'Продажи'], ['warmup', 'Прогрев к запуску'], ['retention', 'Удержание'],
    ];
    // на каких форматах держится каждая цель — по ним ставится полоса и считается конфликт
    var GOAL_MAP = { growth: 'Рост подписчиков', engagement: 'Вовлечённость', sales: 'Продажи', warmup: 'Прогрев к запуску', retention: 'Удержание' };
    var GOAL_ICON = { growth: 'ti-users-plus', engagement: 'ti-heart-handshake', sales: 'ti-building-store',
        warmup: 'ti-flame', retention: 'ti-anchor' };
    var FMT = {
        news: ['Новость', 'ti-news'], analysis: ['Разбор', 'ti-microscope'], case: ['Кейс', 'ti-trophy'],
        listicle: ['Подборка', 'ti-list-check'], offer: ['Продающий', 'ti-building-store'],
        poll: ['Опрос', 'ti-chart-bar'], story: ['История', 'ti-book'], engagement: ['Вопрос читателям', 'ti-message-circle'],
    };
    var FMT_SHORT = {
        news: 'Новость', analysis: 'Разбор', case: 'Кейс', listicle: 'Подборка',
        offer: 'Продажи', poll: 'Опрос', story: 'История', engagement: 'Вопрос',
    };
    var SG = {
        niche: '<path d="M10.2 3.5H5.4a1.9 1.9 0 0 0-1.9 1.9v4.4h.9a2.1 2.1 0 0 1 0 4.2h-.9v4.6a1.9 1.9 0 0 0 1.9 1.9h4.4v-1.1a2.1 2.1 0 0 1 4.2 0v1.1h4.6a1.9 1.9 0 0 0 1.9-1.9v-4.4h-1.1a2.1 2.1 0 0 1 0-4.2h1.1V5.4a1.9 1.9 0 0 0-1.9-1.9h-4.4v.9a2.1 2.1 0 0 1-4.2 0z"/>',
        audience: '<circle cx="12" cy="9" r="3.2"/><path d="M6.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="4" cy="8.5" r="1.6"/><path d="M1.6 15a3.4 3.4 0 0 1 3.2-3"/><circle cx="20" cy="8.5" r="1.6"/><path d="M22.4 15a3.4 3.4 0 0 0-3.2-3"/>',
        rubrics: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v4M16 3v4"/><rect x="6" y="12" width="3.4" height="2.6" rx=".8" fill="currentColor" stroke="none"/><rect x="10.3" y="12" width="3.4" height="2.6" rx=".8" fill="currentColor" stroke="none" opacity=".45"/><rect x="14.6" y="12" width="3.4" height="2.6" rx=".8" fill="currentColor" stroke="none"/><rect x="6" y="16" width="3.4" height="2.6" rx=".8" fill="currentColor" stroke="none" opacity=".45"/><rect x="10.3" y="16" width="3.4" height="2.6" rx=".8" fill="currentColor" stroke="none"/>',
        freq: '<path d="M4 20V11M9.33 20V7M14.67 20V13M20 20V9"/><path d="M2.5 20h19"/><circle cx="9.33" cy="4.2" r="1.4" fill="currentColor" stroke="none"/>',
        organic: '<circle cx="5" cy="12" r="2.6"/><circle cx="18" cy="5.5" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="M7.4 10.8 15.6 6.7M7.4 13.2l8.2 4.1"/>',
        paid: '<path d="M3 10.5v3.2a1.5 1.5 0 0 0 1.5 1.5H6l5.5 3.8V5.5L6 9.3H4.5A1.5 1.5 0 0 0 3 10.8z"/><path d="M6 15.4v3.1a1.4 1.4 0 0 0 2.8 0v-1.2"/><path d="M15.5 9.6a4 4 0 0 1 0 4.9M18.4 7.2a7.6 7.6 0 0 1 0 9.7"/>',
        money: '<circle cx="8.6" cy="9" r="5.6"/><path d="M8.6 6.2v5.6M10.3 7.3a2.6 2.6 0 0 0-3.4.5c-.5.8-.1 1.6 1.1 1.9 1.4.3 1.9 1 1.5 1.9a2.6 2.6 0 0 1-3.4.4"/><path d="M3.6 15.4a5.6 5.6 0 0 0 8.6 2.4"/><path d="M14.6 21 21 14.6M21 14.6h-4.3M21 14.6v4.3"/>',
        tasks: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M7.6 8.4l1.5 1.5 2.6-2.8"/><path d="M13.6 8.6h3.4"/><path d="M7.6 13.7l1.5 1.5 2.6-2.8"/><path d="M13.6 13.9h3.4"/><path d="M7.4 18.4h4.2" opacity=".5"/>',
    };
    var SG_LIST = [
        ['niche', 'Ниша и точка входа'], ['audience', 'Портрет аудитории'],
        ['rubrics', 'Рубрики по дням'], ['freq', 'Частота публикаций'],
        ['organic', 'Бесплатный трафик'], ['paid', 'Платный трафик'],
        ['money', 'Монетизация'], ['tasks', 'Задачи первой недели'],
    ];

    function sgIcon(key) {
        return '<svg class="sg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
            (SG[key] || '') + '</svg>';
    }

    function strategyParts() {
        return '<div class="cp-sg">' + SG_LIST.map(function (it) {
            return '<span class="cp-sg-i">' + sgIcon(it[0]) +
                '<span>' + esc(T(it[1])) + '</span></span>';
        }).join('') + '</div>';
    }

    var AP_LEVELS = [
        ['manual', 'Ручной', 'пост за постом'],
        ['batch', 'Пакетом', 'собирает сам'],
        ['auto', 'Автономно', 'сам публикует'],
    ];
    var GEN_TEXTS = [
        'Смотрю ритм и тему канала...',
        'Подбираю форматы под цель недели...',
        'Развожу идеи, чтобы не повторяться...',
        'Складываю неделю в единый сюжет...',
    ];

    function ensureScreen() {
        var host = document.getElementById('content-plan-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'content-plan-screen';
            host.className = 'cp-screen';
            (document.getElementById('app') || document.body).appendChild(host);
            host.addEventListener('click', onClick);
            host.addEventListener('input', onInput);
            host.addEventListener('change', onChange);
        }
        host.style.display = 'flex';
        document.documentElement.classList.add('cs-modal-open');
        document.body.classList.add('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.onClick(close); tg.BackButton.show(); } } catch (e) {}
        return host;
    }
    function close() {
        stopTimers();
        if (_batchTimer) { clearInterval(_batchTimer); _batchTimer = null; }
        var host = document.getElementById('content-plan-screen');
        if (host) host.style.display = 'none';
        document.documentElement.classList.remove('cs-modal-open');
        document.body.classList.remove('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.hide(); } } catch (e) {}
    }
    function stopTimers() {
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
        if (_genTimer) { clearInterval(_genTimer); _genTimer = null; }
    }
    function headHtml() {
        return '<div class="cp-head"><button class="cp-back" data-act="close"><i class="ti ti-arrow-left"></i></button>' +
            '<div class="t">' + esc(T('Контент-план на неделю')) + '</div></div>';
    }
    var _lastView = null;

    function fillAvatars(host) {
        if (typeof window.loadChannelAvatar !== 'function') return;
        host.querySelectorAll('[data-chav]').forEach(function (el) {
            var id = parseInt(el.getAttribute('data-chav'), 10);
            var ch = (_channels || []).filter(function (c) { return c.id === id; })[0];
            if (id && (!ch || ch.has_avatar !== false)) window.loadChannelAvatar(id, el);
        });
    }

    function setView(html, view) {
        var host = ensureScreen();
        stopTimers();
        var keep = view && view === _lastView;
        var pos = keep ? host.scrollTop : 0;
        host.innerHTML = headHtml() + html;
        host.scrollTop = pos;
        _lastView = view || null;
        fillAvatars(host);
        return host;
    }
    function renderCenter(icon, msg, sub) {
        setView('<div class="cp-center"><div class="big">' + icon + '</div><div class="m">' + esc(msg) + '</div>' +
            (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>');
    }

    window.__cpSetAp = function (ap) { _ap = ap; };
    window.__cpSetRubrics = function (r) { _rubrics = r || []; };
    window.__cpSetReview = function (r) { _review = r || null; };
    window.__cpSetCal = function (c) { _cal = c || null; };

    window.__cpRenderForCheck = function (st, chans) {
        ensureScreen();
        _state = st;
        _days = null;
        syncDays(st);
        if (chans) _channels = chans;
        if (st && st.posts) renderWeek(); else renderBrief();
    };
    window.__cpDays = function () { return days().slice(); };

    window.__openContentPlan = function () {
        ensureScreen();
        renderCenter('<div class="cp-spin"></div>', T('Секунду...'));
        loadAutopilot();
        apiRequest('/api/v1/content-plan' + (_chId ? ('?channel_id=' + _chId) : '')).then(route).catch(function () {
            renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.'));
        });
    };

    function rerender() {
        if (_state && _state.posts && _state.posts.length) renderWeek(); else renderBrief();
    }

    function syncDays(d) {
        if (_days || !d || !d.days || d.days.length !== 7) return;
        _days = d.days.map(function (x) {
            if (x && typeof x === 'object') return { n: +x.n || 0, pins: (x.pins || []).slice() };
            return { n: x === 'off' ? 0 : 1, pins: (x && x !== 'auto' && x !== 'off') ? [x] : [] };
        });
        var live = _days.filter(function (x) { return x.n > 0; });
        _avg = live.length
            ? Math.max(1, Math.min(MAX_PER_DAY, Math.round(totalPosts() / live.length)))
            : 1;
    }

    function route(d) {
        if (!d || !d.ok) { renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.')); return; }
        _state = d;
        syncDays(d);
        if (d.status === 'generating') { renderGenerating(); startPoll(); return; }
        if (d.status === 'ready' || d.status === 'scheduled' || d.status === 'done') { renderWeek(); return; }
        if (_channels === null) {
            apiRequest('/api/v1/channels/active').then(function (cd) {
                _channels = (cd && cd.channels) ? cd.channels.filter(function (c) { return c.username; }) : [];
                if (_chId == null && cd && cd.active_channel_id) _chId = cd.active_channel_id;
                if (_chId == null && _channels.length) _chId = _channels[0].id;
                renderBrief();
                // первый запрос ушёл без канала — состояние надо уточнить по выбранному
                if (_chId) {
                    apiRequest('/api/v1/content-plan?channel_id=' + _chId)
                        .then(function (d2) {
                            if (!d2 || !d2.ok) return;
                            _state = d2;
                            syncDays(d2);
                            if (d2.posts && d2.posts.length) renderWeek(); else renderBrief();
                        })
                        .catch(function () {});
                    loadAutopilot();
                    loadRubrics();
                    loadReview(false);
                    loadCalendar();
                }
            }).catch(function () { _channels = []; renderBrief(); });
        } else { renderBrief(); }
    }

    function secHead(title, note) {
        return '<div class="cp-lbl">' + esc(T(title)) + '</div>' +
            (note ? '<div class="cp-note">' + esc(T(note)) + '</div>' : '');
    }

    function chip(name, val, cur, label) {
        return '<button class="cp-chip' + (val === cur ? ' on' : '') + '" data-chip="' + name + '" data-v="' + esc(val) + '">' + esc(T(label)) + '</button>';
    }

    function days() {
        if (!_days || _days.length !== 7) {
            _days = [];
            for (var i = 0; i < 7; i++) _days.push({ n: 1, pins: [] });
        }
        return _days;
    }
    function dayN(i) { return Math.max(0, Math.min(MAX_PER_DAY, +(days()[i] || {}).n || 0)); }
    function dayPins(i) { return ((days()[i] || {}).pins || []).slice(); }
    function totalPosts() {
        return days().reduce(function (s, d) { return s + Math.max(0, +d.n || 0); }, 0);
    }
    function activeDays() {
        return days().reduce(function (a, d, i) { if ((+d.n || 0) > 0) a.push(i); return a; }, []);
    }
    function rubTitle(key) {
        for (var i = 0; i < _rubrics.length; i++) if (_rubrics[i].key === key) return _rubrics[i].title;
        return key;
    }
    function liveRubrics() {
        return _rubrics.filter(function (r) { return !r.disabled; });
    }
    function setDayN(i, n) {
        n = Math.max(0, Math.min(MAX_PER_DAY, n));
        var d = days().slice();
        if (n === 0 && totalPosts() - dayN(i) < MIN_POSTS) {
            toast(T('В неделе не может быть меньше трёх постов'));
            return false;
        }
        if (n > dayN(i) && totalPosts() - dayN(i) + n > MAX_WEEK) {
            toast(T('Больше семидесяти постов в неделю не собирается'));
            return false;
        }
        d[i] = { n: n, pins: dayPins(i).slice(0, n) };
        _days = d;
        return true;
    }
    function spreadPosts(avg, mode) {
        var pattern = mode === 'even' ? [0, 0, 0, 0, 0, 0, 0]
            : (mode === 'waves' ? [-1, 1, -1, 2, -1, 0, 0] : [1, -1, 0, 1, -1, 0, 0]);
        var d = [];
        for (var i = 0; i < 7; i++) {
            var n = Math.max(0, Math.min(MAX_PER_DAY, avg + (avg > 1 ? pattern[i] : 0)));
            d.push({ n: n, pins: dayPins(i).slice(0, n) });
        }
        _days = d;
        if (totalPosts() < MIN_POSTS) { _days[0].n = MIN_POSTS; }
    }

    function histDays() {
        var h = _cal && _cal.history;
        return (h && h.ready && (h.days || []).length === 7) ? h.days : null;
    }
    function dayViews(i) {
        var h = histDays();
        return h ? (h[i].views || 0) : 0;
    }
    function busyOf(i) {
        return ((_cal && _cal.busy) || []).filter(function (b) { return b.day === i; });
    }
    function bestHours() { return (_cal && _cal.hours) || []; }

    function weekCells(frozen) {
        var hist = histDays();
        var max = 0, best = -1;
        if (hist) {
            hist.forEach(function (d, i) {
                if ((d.views || 0) > max) { max = d.views || 0; best = i; }
            });
        }
        var busy = {};
        ((_cal && _cal.busy) || []).forEach(function (b) { busy[b.day] = true; });
        return days().map(function (d, i) {
            var n = Math.max(0, +d.n || 0);
            var pins = (d.pins || []).filter(function (p) { return !!p; }).length;
            var cls = 'cp-dcol';
            if (!n) cls += ' off';
            else if (pins) cls += ' pinned';
            if (busy[i]) cls += ' ad';
            if (hist && i === best && max > 0) cls += ' best';
            var col = '';
            if (hist) {
                var v = hist[i].views || 0;
                var pct = (max && v) ? Math.max(8, Math.round(v / max * 100)) : 0;
                col = '<span class="cp-hist">' + (pct ? '<i style="height:' + pct + '%"></i>' : '') +
                    '</span><span class="cp-hval">' + (v ? esc(numShort(v)) : '') + '</span>';
            }
            return '<div class="' + cls + '"' +
                (frozen ? '' : ' data-act="pickday" data-day="' + i + '"') + '>' + col +
                '<span class="cp-plan"><b>' + (n || '—') + '</b>' +
                '<em>' + esc(T(WD[i])) + '</em></span></div>';
        }).join('');
    }

    function histNote() {
        var h = _cal && _cal.history;
        if (!h || h.ready || readiness().reason === 'paused') return '';
        var have = h.total || 0, need = h.need || 12;
        var tail = (!have && h.archive)
            ? T('Канал давно не публиковал — старые замеры для расчёта не годятся.')
            : T('Столбики появятся, когда наберётся достаточно.');
        return '<div class="cp-hnote"><i class="ti ti-chart-bar-off"></i><span>' +
            esc(T('Постов с замерами за полгода') + ': ' + have + ' ' + T('из') + ' ' +
                need + '. ' + tail) + '</span></div>';
    }

    function tipBlock() {
        var t = _cal && _cal.tip;
        if (!t || readiness().reason === 'paused') return '';
        return '<div class="cp-tip"><i class="ti ti-bulb"></i><span>' +
            '<b>' + esc(T(WD_FULL[t.strong])) + '</b> — ' + esc(T('сильный день канала') + ': ') +
            '<b>' + esc(numShort(t.strong_views)) + '</b> ' +
            esc(T('против') + ' ' + numShort(t.weak_views) + ' (' + T(WD[t.weak]) + '). ' +
                T('Постов там меньше') + ': ' + t.strong_n + ' ' + T('против') + ' ' + t.weak_n + '.') +
            '<button class="cp-tipgo" data-act="tipmove">' +
            esc(T('Перенести') + ' ' + t.move + ' ' +
                T(plural3(t.move, 'пост', 'поста', 'постов')) + ': ' +
                T(WD[t.weak]) + ' → ' + T(WD[t.strong])) + '</button></span></div>';
    }

    function adNote() {
        var deals = ((_cal && _cal.busy) || []).filter(function (b) { return b.kind === 'deal'; });
        if (!deals.length) return '';
        var d = deals[0];
        return ' ' + esc(T('Оплаченная реклама') + ': ' + T(WD[d.day]) + ' ' + d.at +
            (deals.length > 1 ? ' +' + (deals.length - 1) : '') + ' — ' +
            T('свои посты обойдут это время.'));
    }

    function goalWord() {
        var g = T(GOAL_MAP[_goal] || _goal);
        var lang = (typeof window.getLang === 'function') ? window.getLang() : 'ru';
        return lang === 'ru' ? g.toLowerCase() : g;
    }


    function weekBar() {
        var total = totalPosts();
        var w = wallet();
        var price = (w.price_day || 10) * total;
        var bal = w.balance;
        var postsWord = plural3(total, 'пост', 'поста', 'постов');
        var head = total + ' ' + T(postsWord) + ' ' + T('на неделе.');
        if (w.is_tester) {
            return '<div class="cp-hbar ok"><i class="ti ti-check"></i><span>' +
                esc(head) + '</span></div>';
        }
        var tail = ' <b class="cp-hprice">' + forgeTag(price) + '</b>.';
        if (bal != null && price > 0) {
            if (bal < price) {
                return '<div class="cp-hbar stop"><i class="ti ti-wallet"></i><span>' +
                    esc(head) + tail + ' ' + esc(T('На балансе')) + ' ' + forgeTag(bal) + ' — ' +
                    esc(T('не хватает.') + ' ' + T('Убавь постов или пополни баланс.')) +
                    '</span></div>';
            }
            var weeks = Math.floor(bal / price);
            tail += ' ' + esc(T('На балансе')) + ' ' + forgeTag(bal) + ' — ' +
                esc(T('хватит на') + ' ' + weeks + ' ' +
                    T(plural3(weeks, 'неделю', 'недели', 'недель')) + '.');
        }
        return '<div class="cp-hbar ok"><i class="ti ti-check"></i><span>' +
            esc(head) + tail + adNote() + '</span></div>';
    }

    function rhythmBlock() {
        var marks = [1, 3, 5, 7, 10];
        var pct = Math.round((_avg - 1) / 9 * 100);
        var seg = [['even', 'Ровно', '3 · 3 · 3'], ['live', 'Живой', '2 · 4 · 3'],
                   ['waves', 'Волнами', '1 · 5 · 2']].map(function (s) {
            return '<button class="cp-sg' + (_spread === s[0] ? ' on' : '') +
                '" data-spread="' + s[0] + '"><b>' + esc(T(s[1])) + '</b>' +
                '<span>' + esc(s[2]) + '</span></button>';
        }).join('');
        return '<div class="cp-sec">' + secHead('Постов в день',
                'Сколько выходит в среднем. Точное число по дням система разложит сама — ' +
                'любой день можно поправить вручную.') +
            '<div class="cp-slider">' +
            '<div class="cp-srow"><span>' + esc(T('в среднем в день')) + '</span><b>' + _avg + '</b></div>' +
            '<input class="cp-range" type="range" min="1" max="10" step="1" value="' + _avg +
            '" data-act="avg" aria-label="' + esc(T('Постов в день')) + '">' +
            '<div class="cp-ticks">' + marks.map(function (m) {
                return '<span' + (m === _avg ? ' class="on"' : '') + '>' + m + '</span>';
            }).join('') + '</div></div>' +
            '<div class="cp-lbl" style="margin-top:14px">' + esc(T('Разброс')) + '</div>' +
            '<div class="cp-seg">' + seg + '</div></div>';
    }

    function reviewEntry() {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid || !_review) return '';
        var r = _review;
        if (!r.ready) {
            var pct = Math.min(100, Math.round((r.posts || 0) / (r.need || 20) * 100));
            return '<button class="cp-rev" data-act="review">' +
                '<div class="cp-rev-h"><i class="ti ti-chart-dots"></i>' +
                '<span><b>' + esc(T('Разбор канала')) + '</b>' +
                '<em>' + esc(T('готовим') + ': ' + (r.posts || 0) + ' ' + T('из') + ' ' +
                    (r.need || 20) + ' ' + T('постов с замерами')) + '</em></span>' +
                '<i class="ti ti-chevron-right"></i></div>' +
                '<div class="cp-rev-bar"><span style="width:' + pct + '%"></span></div></button>';
        }
        var v = r.views || {};
        var tone = r.mood === 'drop' ? ' drop' : (r.mood === 'rise' ? ' rise' : '');
        var num = (v.change_pct != null)
            ? ((v.change_pct > 0 ? '+' : '') + v.change_pct + '%')
            : (r.median_views ? numShort(r.median_views) : '—');
        return '<button class="cp-rev' + tone + '" data-act="review">' +
            '<div class="cp-rev-h"><i class="ti ti-chart-dots"></i>' +
            '<span><b>' + esc(T(r.head || 'Разбор канала')) + '</b>' +
            '<em>' + esc(T('по') + ' ' + (r.posts || 0) + ' ' +
                T(plural3(r.posts || 0, 'посту', 'постам', 'постам')) + ' · ' +
                T('что менять')) + '</em></span>' +
            '<span class="cp-rev-n">' + esc(num) + '</span>' +
            '<i class="ti ti-chevron-right"></i></div></button>';
    }

    function reviewSpark(series) {
        if (!series || series.length < 3) return '';
        var vals = series.map(function (x) { return x.views; });
        var max = Math.max.apply(null, vals) || 1;
        var min = Math.min.apply(null, vals);
        var span = Math.max(1, max - min);
        var w = 300, h = 54;
        var pts = vals.map(function (val, i) {
            var x = Math.round(i / Math.max(1, vals.length - 1) * w);
            var y = Math.round(h - 6 - (val - min) / span * (h - 14));
            return x + ',' + y;
        });
        var last = pts[pts.length - 1].split(',');
        return '<svg class="cp-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
            '<polyline points="' + pts.join(' ') + '" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3.2" fill="currentColor"/></svg>';
    }

    function revSide(d, cls, name) {
        return '<div class="cp-cbox ' + cls + '"><div class="cp-cbh">' + esc(T(name)) + '</div>' +
            '<div class="cp-cbv">' + esc(numShort(d.views || 0)) + '</div>' +
            '<div class="cp-cbs">' + esc(T('просмотров к посту')) + '</div>' +
            '<div class="cp-cbl">' +
            '<div>' + esc(T('длина')) + ' <b>' + (d.chars || 0) + '</b></div>' +
            '<div>' + esc(T('абзацев')) + ' <b>' + (d.paragraphs || 0) + '</b></div>' +
            '<div>' + esc(T('эмодзи')) + ' <b>' + (d.emoji != null ? d.emoji : 0) + '</b></div>' +
            (d.hour_from != null ? '<div>' + esc(T('выход')) + ' <b>' +
                (d.hour_from < 10 ? '0' : '') + d.hour_from + ':00–' +
                (d.hour_to < 10 ? '0' : '') + d.hour_to + ':00</b></div>' : '') +
            '</div></div>';
    }

    function renderReview() {
        var r = _review;
        if (!r) { renderCenter('<div class="cp-spin"></div>', T('Считаю...')); return; }
        var back = '<button class="cp-allbtn" data-act="revback">' +
            '<i class="ti ti-arrow-left"></i> ' + esc(T('К плану недели')) + '</button>';

        if (!r.ready) {
            var pct = Math.min(100, Math.round((r.posts || 0) / (r.need || 20) * 100));
            setView('<div class="cp-sec">' + secHead('Разбор готовится',
                    'Считать «что работает» на нескольких постах бессмысленно — ' +
                    'любое совпадение выглядит закономерностью. Ниже видно, чего ждём.') +
                '<div class="cp-steps">' +
                '<div class="cp-step done"><span class="n">✓</span><span>' +
                esc(T('Архив канала разобран') + ' — ' + (r.analyzed || 0) + ' ' +
                    T(plural3(r.analyzed || 0, 'пост', 'поста', 'постов'))) + '</span></div>' +
                '<div class="cp-step done"><span class="n">✓</span><span>' +
                esc(T('Замеры просмотров включены') + ' — ' + (r.measured || 0) + ' ' +
                    T(plural3(r.measured || 0, 'пост', 'поста', 'постов'))) + '</span></div>' +
                '<div class="cp-step"><span class="n">3</span><span>' +
                esc(T('Нужно') + ' ' + (r.need || 20) + ' ' +
                    T('постов с текстом и просмотрами — тогда есть что сравнивать')) +
                '</span></div></div>' +
                '<div class="cp-prog"><div class="cp-ptrack"><span style="width:' + pct + '%"></span></div>' +
                '<div class="cp-plab"><span>' + esc((r.posts || 0) + ' ' + T('из') + ' ' +
                    (r.need || 20)) + '</span></div></div></div>' + back, 'review');
            return;
        }

        var v = r.views || {}, m = r.members || {};
        var tone = r.mood === 'drop' ? ' drop' : (r.mood === 'rise' ? ' rise' : '');
        var chg = (v.change_pct != null) ? ((v.change_pct > 0 ? '+' : '') + v.change_pct + '%') : '—';
        var kpi = '<div class="cp-kpis">' +
            '<div class="cp-kpi"><div class="v' +
            (v.change_pct != null && v.change_pct < 0 ? ' bad' : (v.change_pct > 0 ? ' good' : '')) +
            '">' + esc(chg) + '</div><div class="k">' + esc(T('просмотров к посту')) + '</div></div>' +
            '<div class="cp-kpi"><div class="v' + ((m.left || 0) > (m.joined || 0) ? ' bad' : '') +
            '">' + (m.left || 0) + '</div><div class="k">' +
            esc(T('отписались за') + ' ' + (r.window_days || 21) + ' ' + T('дней')) + '</div></div>' +
            '<div class="cp-kpi"><div class="v">' + (m.joined || 0) + '</div><div class="k">' +
            esc(T('новых подписчиков')) + '</div></div></div>';

        var spark = (v.series && v.series.length > 2)
            ? '<div class="cp-sparkbox"><div class="cp-sph"><b>' + esc(T('Просмотры к посту')) +
              '</b><span>' + esc((v.before ? numShort(v.before) + ' → ' : '') +
                (v.recent ? numShort(v.recent) : '')) + '</span></div>' + reviewSpark(v.series) + '</div>'
            : '';

        var shifts = (r.shifts || []).length
            ? '<div class="cp-cause"><div class="cp-cause-h"><i class="ti ti-alert-triangle"></i>' +
              esc(T('Что изменилось за это время')) + '</div>' +
              r.shifts.map(function (x) {
                  return '<div class="cp-crow"><span class="lb">' + esc(T(x.what)) + '</span>' +
                      '<span class="was">' + esc(T('было') + ' ' + x.was) + '</span>' +
                      '<span class="now">' + esc(T('стало') + ' ' + x.now) + '</span></div>';
              }).join('') + '</div>'
            : '';

        var acts = (r.actions || []).length
            ? '<div class="cp-lbl" style="margin-top:15px">' + esc(T('Что предлагаю сделать')) + '</div>' +
              '<div class="cp-acts">' + r.actions.map(function (a) {
                  var ic = { ruler: 'ti-ruler-2', clock: 'ti-clock', hook: 'ti-hook',
                             layers: 'ti-stack-2' }[a.icon] || 'ti-bulb';
                  return '<div class="cp-actc"><i class="ti ' + ic + '"></i>' +
                      '<span class="tx"><b>' + esc(a.title) + '</b>' +
                      '<em>' + esc(a.why) + '</em></span></div>';
              }).join('') + '</div>'
            : '';

        var base = '<div class="cp-revbase"><i class="ti ti-info-circle"></i><span>' +
            esc(T('Основано на') + ' ' + (r.posts || 0) + ' ' +
                T(plural3(r.posts || 0, 'посте', 'постах', 'постах')) + '. ' +
                T('Сравниваются твои сильные посты со слабыми — не с чужими каналами.')) +
            '</span></div>';

        setView('<div class="cp-verdict' + tone + '">' +
            '<div class="cp-veye">' + esc(T('Разбор за') + ' ' + (r.window_days || 21) + ' ' +
                T('дней')) + '</div>' +
            '<h2>' + esc(T(r.head || '')) + '</h2>' + kpi + spark + shifts + '</div>' +
            '<div class="cp-sec">' + secHead('Твои сильные против слабых',
                'Сравниваются верхние и нижние двадцать процентов постов канала.') +
            '<div class="cp-cmp">' + revSide(r.top || {}, 'top', 'верхние 20%') +
            revSide(r.low || {}, 'low', 'нижние 20%') + '</div>' + acts + base + '</div>' + back,
            'review');
    }

    function loadReview(open) {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid) return;
        apiRequest('/api/v1/content-plan/review?channel_id=' + cid)
            .then(function (r) {
                if (!r || !r.ok) return;
                _review = r.review;
                if (open) renderReview(); else rerender();
            })
            .catch(function () { if (open) toast(T('Не удалось собрать разбор')); });
    }

    function rubricsBlock() {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid) return '';
        if (!_rubrics.length) {
            return '<div class="cp-sec">' + secHead('Рубрики канала',
                    'Из чего собирается неделя.') +
                '<div class="cp-rubwait"><div class="cp-spin sm"></div><span>' +
                esc(T('Определяю рубрики по постам канала...')) + '</span></div></div>';
        }
        var own = _rubrics.filter(function (r) { return r.source !== 'suggest'; });
        var src = own[0] && own[0].source;
        var badge = src === 'base'
            ? '<div class="cp-rsrc base"><i class="ti ti-info-circle"></i>' +
              esc(T('канал новый — базовый набор, обновится по мере постов')) + '</div>'
            : '<div class="cp-rsrc"><i class="ti ti-eye"></i>' +
              esc(T('определены по постам канала')) + '</div>';

        var max = 0;
        own.forEach(function (r) { if ((r.avg_views || 0) > max) max = r.avg_views || 0; });

        var groups = [
            ['a', 'ti-file-text', 'пишется само',
             function (r) { return r.source !== 'suggest' && !r.needs_fact; }],
            ['z', 'ti-camera', 'нужны твои две строки',
             function (r) { return r.source !== 'suggest' && r.needs_fact; }],
            ['n', 'ti-sparkles', 'можно попробовать',
             function (r) { return r.source === 'suggest'; }],
        ];
        var body = '';
        groups.forEach(function (g) {
            var items = _rubrics.filter(g[3]);
            if (!items.length) return;
            body += '<div class="cp-rgh ' + g[0] + '"><i class="ti ' + g[1] + '"></i>' +
                '<span>' + esc(T(g[2])) + '</span><i class="ln"></i></div>' +
                '<div class="cp-rubs">' + items.map(function (r) {
                    var tip = g[0] === 'n';
                    var cnt = r.post_count ? (' · ' + r.post_count + ' ' +
                        T(plural3(r.post_count, 'пост', 'поста', 'постов'))) : '';
                    var pct = (max && r.avg_views) ? Math.max(6, Math.round(r.avg_views / max * 100)) : 0;
                    var strong = (max && r.avg_views === max) ? ' top' : '';
                    return '<button class="cp-rub ' + g[0] + strong +
                        (r.disabled && !tip ? ' off' : '') +
                        '" data-act="rubtoggle" data-v="' + esc(r.key) + '">' +
                        '<i class="ti ' + g[1] + '"></i>' +
                        '<span class="tx"><b>' + esc(r.title) + '</b>' +
                        '<em>' + esc((r.off_reason || r.about || '') + (tip ? '' : cnt)) + '</em>' +
                        (pct ? '<span class="cp-strip"><i style="width:' + pct + '%"></i></span>' : '') +
                        '</span>' +
                        (tip ? '<span class="cp-plus"><i class="ti ti-plus"></i></span>'
                             : (r.avg_views ? '<span class="pw"><i class="ti ti-eye"></i>' +
                                    esc(numShort(r.avg_views)) + '</span>' : '')) +
                        (r.source === 'user' ? '<i class="ti ti-x rm" data-act="rubdel" data-v="' +
                            esc(r.key) + '"></i>' : '') + '</button>';
                }).join('') + '</div>';
        });
        var hasTips = _rubrics.some(function (r) { return r.source === 'suggest'; });
        return '<div class="cp-sec">' + secHead('Рубрики канала',
                'Из чего собирается неделя. Цифра — средние просмотры рубрики.') +
            badge + body +
            (hasTips ? '<div class="cp-dshint">' +
                esc(T('Предложены под нишу канала. Пока не включишь — в неделю не попадут.')) +
                '</div>' : '') +
            '<button class="cp-radd" data-act="rubadd"><i class="ti ti-plus"></i>' +
            esc(T('Своя рубрика')) + '</button></div>';
    }

    function readiness() {
        var st = _state || {};
        var rid = st.readiness_channel_id;
        if (_chId && rid && rid !== _chId) return {};
        if (_chId == null && _channels === null) return {};
        return st.readiness || {};
    }

    function heroWeek() {
        var rdy = readiness();
        if (rdy.reason === 'paused') {
            return '<div class="cp-hero frozen">' +
                '<div class="cp-hero-eye">' + esc(T('План недоступен')) + '</div>' +
                '<h2>' + esc(T('Канал приостановлен')) + '</h2>' +
                '<p>' + esc(T('Подключено больше каналов, чем допускает тариф. ' +
                    'Публикация не проходит.')) + '</p>' +
                '<div class="cp-hero-week">' + weekCells(true) + '</div>' +
                '<div class="cp-frznote"><i class="ti ti-player-pause"></i><span>' +
                esc(T('Сними паузу в настройках канала или выбери другой — ' +
                    'тогда неделя соберётся.')) +
                '</span></div>' +
                '<button class="cp-ready-b" data-act="openstyle">' +
                '<i class="ti ti-settings"></i> ' + esc(T('Открыть настройки канала')) +
                '</button></div>';
        }
        var total = totalPosts();
        return '<div class="cp-hero">' +
            '<div class="cp-hero-eye">' + esc(T('План на неделю') + ' · ' + total + ' ' +
                T(plural3(total, 'пост', 'поста', 'постов'))) + '</div>' +
            '<h2>' + esc(T('Неделя под') + ' ' + goalWord()) + '</h2>' +
            '<p>' + esc(T('Нажми на день, чтобы изменить число постов или закрепить рубрику.')) + '</p>' +
            '<div class="cp-hero-week">' + weekCells(false) + '</div>' +
            histNote() + tipBlock() + weekBar() + '</div>';
    }

    function setPin(i, k, key) {
        var d = days().slice();
        var pins = dayPins(i);
        while (pins.length <= k) pins.push('');
        pins[k] = key || '';
        while (pins.length && !pins[pins.length - 1]) pins.pop();
        d[i] = { n: dayN(i), pins: pins };
        _days = d;
    }

    function rubOf(key) {
        for (var i = 0; i < _rubrics.length; i++) if (_rubrics[i].key === key) return _rubrics[i];
        return null;
    }

    function daySlots(i) {
        var got = ((_cal && _cal.slots) || {})[String(i)] || [];
        var n = dayN(i), pins = dayPins(i), out = [];
        for (var k = 0; k < n; k++) {
            var g = got[k] || {};
            out.push({
                seq: k, at: g.at || null, views: g.views,
                key: (pins[k] || null) || (g.rubric || null),
                pinned: !!pins[k]
            });
        }
        return out;
    }

    function slotRow(sl) {
        var r = sl.key ? rubOf(sl.key) : null;
        var cls = 'cp-slot' + (r ? (r.needs_fact ? ' fact' : '') : ' auto');
        var title = r ? r.title : (sl.key ? sl.key : T('Рубрику подберёт система'));
        var sub = r ? (r.needs_fact ? T('спрошу пару строк за день до выхода') : (r.about || ''))
                    : T('под сюжет недели');
        var power = (sl.views != null && sl.views > 0) ? sl.views
            : ((r && r.avg_views) ? r.avg_views : 0);
        return '<button class="' + cls + '" data-slot="' + sl.seq + '">' +
            '<span class="tm">' + esc(sl.at || '—') + '</span>' +
            '<span class="tx"><b>' + esc(title) + '</b>' +
            (sub ? '<em>' + esc(sub) + '</em>' : '') + '</span>' +
            (power ? '<span class="pw">' + esc(numShort(power)) + '</span>' : '') +
            '<i class="ti ti-chevron-right ch"></i></button>';
    }

    function adRow(b) {
        return '<div class="cp-slot ad"><span class="tm">' + esc(b.at) + '</span>' +
            '<span class="tx"><b>' + esc(T(b.kind === 'deal' ? 'Оплаченная реклама'
                                                            : 'Пост в очереди')) + '</b>' +
            '<em>' + esc(T('время занято')) + '</em></span>' +
            '<i class="ti ' + (b.kind === 'deal' ? 'ti-ad-2' : 'ti-clock') + ' ch"></i></div>';
    }

    function daySheetBody(i) {
        var n = dayN(i);
        if (!n) {
            return '<div class="cp-dsnote">' + esc(T('В этот день ничего не выйдет.')) + '</div>' +
                '<div class="cp-addrow"><button class="cp-add" data-dayn="1">' +
                '<i class="ti ti-plus"></i>' + esc(T('Вернуть день')) + '</button></div>';
        }
        var rows = daySlots(i).map(function (sl) {
            return { at: sl.at || '99:99', html: slotRow(sl) };
        });
        busyOf(i).forEach(function (b) { rows.push({ at: b.at, html: adRow(b) }); });
        rows.sort(function (a, b) { return a.at < b.at ? -1 : (a.at > b.at ? 1 : 0); });

        var addOff = n >= MAX_PER_DAY;
        return '<div class="cp-slots">' + rows.map(function (r) { return r.html; }).join('') + '</div>' +
            '<div class="cp-addrow">' +
            '<button class="cp-add"' + (addOff ? ' disabled' : ' data-dayn="' + (n + 1) + '"') + '>' +
            '<i class="ti ti-plus"></i>' + esc(T('Ещё пост')) + '</button>' +
            '<button class="cp-add warn" data-dayn="0">' + esc(T('Убрать день')) + '</button></div>' +
            '<div class="cp-dshint">' +
            esc(T('Нажми на пост, чтобы сменить рубрику. Между постами не меньше двух часов — ' +
                  'иначе они съедают охват друг друга.')) + '</div>';
    }

    function slotSheetBody(i, k) {
        var cur = dayPins(i)[k] || '';
        var live = liveRubrics();
        var rows = live.map(function (r) {
            var on = cur === r.key;
            return '<button class="cp-dsr wide' + (on ? ' on' : '') + (r.needs_fact ? ' fact' : '') +
                '" data-setpin="' + esc(r.key) + '">' +
                '<i class="ti ' + (r.needs_fact ? 'ti-camera' : 'ti-file-text') + '"></i>' +
                '<span class="tx"><b>' + esc(r.title) + '</b>' +
                '<em>' + esc(r.needs_fact ? T('спрошу пару строк за день до выхода')
                                          : (r.about || '')) + '</em></span>' +
                (r.avg_views ? '<span class="pw">' + esc(numShort(r.avg_views)) + '</span>' : '') +
                (on ? '<i class="ti ti-check ck"></i>' : '') + '</button>';
        }).join('');
        return '<button class="cp-dsr wide' + (cur ? '' : ' on') + '" data-setpin="">' +
            '<i class="ti ti-wand"></i><span class="tx"><b>' +
            esc(T('Рубрику подберёт система')) + '</b>' +
            '<em>' + esc(T('под сюжет недели')) + '</em></span>' +
            (cur ? '' : '<i class="ti ti-check ck"></i>') + '</button>' +
            '<div class="cp-dssep"></div>' +
            (live.length ? rows
                : '<div class="cp-dsnote">' + esc(T('Рубрики ещё не определены.')) + '</div>');
    }

    function pickDay(i) {
        haptic('light');
        var host = document.getElementById('cp-daybox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-daybox';
        host.className = 'cp-dsov';
        var slot = null;
        var draw = function () {
            var views = dayViews(i);
            var hours = bestHours();
            var head, sub, body;
            if (slot === null) {
                var hd = (histDays() || [])[i] || {};
                head = '<div class="cp-dsh2"><b>' + esc(T(WD_FULL[i])) + '</b>' +
                    (views ? '<span>' + esc(numShort(views) + ' ' + T('просмотров') + ' · ' +
                        T('по') + ' ' + hd.posts + ' ' +
                        T(plural3(hd.posts, 'посту', 'постам', 'постам'))) + '</span>' : '') +
                    '</div>';
                sub = hours.length
                    ? '<div class="cp-dss">' + esc(T('Лучшие часы канала') + ': ' +
                        hours.map(function (h) { return (h < 10 ? '0' : '') + h + ':00'; })
                            .join(', ')) + '</div>'
                    : '';
                body = daySheetBody(i);
            } else {
                head = '<div class="cp-dsh2"><b>' + esc(T('Рубрика поста')) + '</b></div>';
                sub = '<div class="cp-dss">' + esc(T(WD_FULL[i]) + ' · ' + T('пост') + ' ' +
                    (slot + 1)) + '</div>';
                body = slotSheetBody(i, slot);
            }
            host.innerHTML = '<div class="cp-dsheet">' +
                '<div class="cp-dsgrab"></div>' + head + sub + body + '</div>';
        };
        draw();
        document.body.appendChild(host);
        requestAnimationFrame(function () { host.classList.add('vis'); });

        host.addEventListener('click', function (e) {
            var t = e.target;
            var cnt = t.closest ? t.closest('[data-dayn]') : null;
            if (cnt) {
                if (setDayN(i, +cnt.getAttribute('data-dayn'))) {
                    haptic('light'); slot = null; draw(); renderBrief(); loadCalendar();
                }
                return;
            }
            var sl = t.closest ? t.closest('[data-slot]') : null;
            if (sl) { haptic('light'); slot = +sl.getAttribute('data-slot'); draw(); return; }
            var sp = t.closest ? t.closest('[data-setpin]') : null;
            if (sp && slot !== null) {
                setPin(i, slot, sp.getAttribute('data-setpin'));
                haptic('light'); slot = null; draw(); renderBrief();
                return;
            }
            if (e.target === host) host.remove();
        });
    }

    function askAd(id) {
        var p = post(id);
        if (!p) return;
        haptic('light');
        var host = document.getElementById('cp-daybox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-daybox';
        host.className = 'cp-dsov';
        host.innerHTML = '<div class="cp-dsheet">' +
            '<div class="cp-dsgrab"></div>' +
            '<div class="cp-dsh">' + esc(T('Разметка рекламы')) + '</div>' +
            '<div class="cp-dss">' +
            esc(T('Рекламный пост выходит с пометкой — это требование закона.')) + '</div>' +
            '<button class="cp-dsr wide' + (p.is_ad ? '' : ' on') + '" data-adv="off">' +
            '<i class="ti ti-ad-off"></i><span class="tx"><b>' + esc(T('Обычный пост')) + '</b>' +
            '<em>' + esc(T('выйдет как есть')) + '</em></span></button>' +
            '<button class="cp-dsr wide' + (p.is_ad ? ' on' : '') + '" data-adv="on">' +
            '<i class="ti ti-ad-2"></i><span class="tx"><b>' + esc(T('Рекламный пост')) + '</b>' +
            '<em>' + esc(T('в конце добавится «Реклама» и данные ниже')) + '</em></span></button>' +
            '<div class="cp-dssep"></div>' +
            '<input class="cp-inp" id="cp-ad-who" maxlength="80" placeholder="' +
            esc(T('Рекламодатель, если нужно указать')) + '" value="' + esc(p.ad_advertiser || '') + '">' +
            '<input class="cp-inp" id="cp-ad-erid" maxlength="60" placeholder="' +
            esc(T('erid, если получен')) + '" value="' + esc(p.ad_erid || '') + '">' +
            '<div class="cp-dsnote">' +
            esc(T('erid выдаёт рекламодатель или оператор рекламных данных. ' +
                  'Без него пометка всё равно ставится.')) + '</div>' +
            '<button class="cp-go" id="cp-ad-save" style="margin-top:14px">' +
            esc(T('Сохранить')) + '</button></div>';
        document.body.appendChild(host);
        requestAnimationFrame(function () { host.classList.add('vis'); });
        var isAd = !!p.is_ad;
        host.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-adv]') : null;
            if (b) {
                isAd = b.getAttribute('data-adv') === 'on';
                host.querySelectorAll('[data-adv]').forEach(function (x) {
                    x.classList.toggle('on', (x.getAttribute('data-adv') === 'on') === isAd);
                });
                haptic('light');
                return;
            }
            if (e.target.closest && e.target.closest('#cp-ad-save')) {
                var who = (host.querySelector('#cp-ad-who').value || '').trim();
                var erid = (host.querySelector('#cp-ad-erid').value || '').trim();
                host.remove();
                apiRequest('/api/v1/content-plan/ad-mark', {
                    method: 'POST',
                    body: JSON.stringify({ post_id: id, is_ad: isAd,
                                           advertiser: who, erid: erid })
                }).then(function (r) {
                    if (r && r.ok) {
                        p.is_ad = isAd; p.ad_advertiser = who; p.ad_erid = erid;
                        renderWeek();
                        toast(T(isAd ? 'Пост помечен как рекламный' : 'Пометка снята'));
                    } else toast(T('Не удалось сохранить'));
                }).catch(function () { toast(T('Не удалось сохранить')); });
                return;
            }
            if (e.target === host) host.remove();
        });
    }

    function askRubric() {
        haptic('light');
        var host = document.getElementById('cp-daybox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-daybox';
        host.className = 'cp-dsov';
        host.innerHTML = '<div class="cp-dsheet">' +
            '<div class="cp-dsgrab"></div>' +
            '<div class="cp-dsh">' + esc(T('Своя рубрика')) + '</div>' +
            '<div class="cp-dss">' + esc(T('Как она называется и что в ней выходит')) + '</div>' +
            '<input class="cp-inp" id="cp-rub-title" maxlength="40" placeholder="' +
            esc(T('Название, 2-3 слова')) + '">' +
            '<input class="cp-inp" id="cp-rub-about" maxlength="90" placeholder="' +
            esc(T('Что содержит такой пост')) + '">' +
            '<button class="cp-dsr wide" id="cp-rub-fact"><i class="ti ti-camera"></i>' +
            '<span class="tx"><b>' + esc(T('Нужны мои факты')) + '</b>' +
            '<em>' + esc(T('пост о том, что произошло со мной')) + '</em></span></button>' +
            '<button class="cp-go" id="cp-rub-save" style="margin-top:14px">' +
            esc(T('Добавить рубрику')) + '</button></div>';
        document.body.appendChild(host);
        requestAnimationFrame(function () { host.classList.add('vis'); });
        var fact = false;
        host.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('#cp-rub-fact')) {
                fact = !fact;
                host.querySelector('#cp-rub-fact').classList.toggle('on', fact);
                haptic('light');
                return;
            }
            if (e.target.closest && e.target.closest('#cp-rub-save')) {
                var title = (host.querySelector('#cp-rub-title').value || '').trim();
                if (!title) { toast(T('Введи название рубрики')); return; }
                rubApi('add', { title: title, needs_fact: fact,
                                about: (host.querySelector('#cp-rub-about').value || '').trim() });
                host.remove();
                return;
            }
            if (e.target === host) host.remove();
        });
    }

    function rubApi(op, extra) {
        if (!_chId || _rubBusy) return;
        _rubBusy = true;
        var body = { channel_id: _chId };
        for (var k in (extra || {})) body[k] = extra[k];
        apiRequest('/api/v1/content-plan/rubrics/' + op,
                   { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                _rubBusy = false;
                if (r && r.ok && r.rubrics) { _rubrics = r.rubrics; rerender(); }
                else if (r && r.error === 'too_many') toast(T('Больше шестнадцати рубрик не бывает'));
                else if (r && r.error) toast(T('Не удалось изменить рубрики'));
            })
            .catch(function () { _rubBusy = false; toast(T('Не удалось изменить рубрики')); });
    }

    function loadCalendar() {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid) return;
        apiRequest('/api/v1/content-plan/calendar?channel_id=' + cid)
            .then(function (r) {
                if (!r || !r.ok) return;
                if ((_chId || (_state && _state.channel_id)) !== r.channel_id) return;
                _cal = r;
                rerender();
            }).catch(function () {});
    }

    function loadRubrics() {
        if (!_chId) return;
        var cid = _chId;
        apiRequest('/api/v1/content-plan/rubrics?channel_id=' + cid)
            .then(function (r) {
                if (!r || !r.ok || cid !== _chId) return;
                if (r.rubrics && r.rubrics.length) { _rubrics = r.rubrics; rerender(); return; }
                apiRequest('/api/v1/content-plan/rubrics/build',
                           { method: 'POST', body: JSON.stringify({ channel_id: cid }) })
                    .then(function (b) {
                        if (b && b.ok && b.rubrics && cid === _chId) { _rubrics = b.rubrics; rerender(); }
                    }).catch(function () {});
            }).catch(function () {});
    }

    function renderBrief() {
        if (!_ap && _chId) setTimeout(loadAutopilot, 0);
        var chanBlock;
        if (!_channels || !_channels.length) {
            chanBlock = '<div class="cp-hint">' + esc(T('Канал не подключён — план соберётся в нейтральном стиле. Подключи канал, чтобы писать точно в его стиле.')) + '</div>';
        } else if (_channels.length === 1) {
            var c = _channels[0]; _chId = c.id;
            chanBlock = '<div class="cp-onechan"><div class="av" data-chav="' + c.id + '">' +
                esc((c.title || c.username || '?').charAt(0).toUpperCase()) + '</div>' +
                '<div class="nm"><b>' + esc(c.title || ('@' + c.username)) + '</b><span>@' + esc(c.username) + '</span></div></div>';
        } else {
            // список кнопок нежизнеспособен на сетке: до пятидесяти каналов на тарифе
            var cur = _channels.filter(function (c) { return c.id === _chId; })[0] || _channels[0];
            _chId = cur.id;
            var styleNote = cur.voice_status === 'done' ? 'стиль настроен' : 'стиль не настроен';
            chanBlock = '<button class="cp-chanpick" data-act="pickchan">' +
                '<span class="av" data-chav="' + cur.id + '">' +
                esc((cur.title || cur.username || '?').charAt(0).toUpperCase()) + '</span>' +
                '<span class="nm"><b>' + esc(cur.title || ('@' + cur.username)) + '</b>' +
                '<span>@' + esc(cur.username || '') + ' · ' + esc(T(styleNote)) + '</span></span>' +
                '<span class="sw">' + esc(T('сменить')) + '</span>' +
                '<i class="ti ti-chevron-down"></i></button>';
        }
        var goals = GOALS.map(function (g) {
            return '<button class="cp-goal' + (g[0] === _goal ? ' on' : '') + '" data-chip="goal" data-v="' + g[0] + '">' +
                '<i class="ti ' + (GOAL_ICON[g[0]] || 'ti-target') + '"></i>' +
                '<span>' + esc(T(g[1])) + '</span></button>';
        }).join('');
        var rdy = readiness();
        var blocked = rdy.blocked === true;
        var w = wallet();
        var weekPrice = (w.price_day || 10) * totalPosts();
        var priceTag = w.is_tester ? '' :
            '<span class="cp-gopx">' + forgeTag(weekPrice) + '</span>';
        var lowNote = (!w.is_tester && w.balance != null && w.balance < weekPrice)
            ? '<div class="cp-hint low">' + esc(T('Не хватает Forge: нужно ' + weekPrice +
                ', на балансе ' + (w.balance || 0) + '. Пополни в кабинете.')) + '</div>'
            : '<div class="cp-gonote">' + esc(T('Списывается при сборке · тексты можно переписать')) + '</div>';
        setView(
            heroWeek() +

            '<div class="cp-sec">' + secHead('Канал',
                'Для какого канала собираем неделю. Посты будут написаны в его манере.') +
            chanBlock + '</div>' + readinessBlock() +
            '<div class="cp-sec">' + secHead('Цель недели',
                'Под неё подбираются темы и виды постов: одна цель — один сюжет на всю неделю.') +
            '<div class="cp-goals">' + goals + '</div></div>' +
            rubricsBlock() + rhythmBlock() +

            '<button class="cp-go' + (blocked ? ' off' : '') + '"' +
            (blocked ? ' disabled' : ' data-act="generate"') + '><i class="ti ti-sparkles"></i> ' +
            esc(T('Собрать план недели')) + (blocked ? '' : priceTag) + '</button>' +
            (blocked ? '' : lowNote) +
            apPanel() + reviewEntry() + strategyBlock(), 'brief');
    }

    function doGenerate(btn) {
        if (btn) btn.disabled = true;
        haptic('medium');
        if (_batchTimer) { clearInterval(_batchTimer); _batchTimer = null; }
        var tz = 0;
        try { tz = -(new Date().getTimezoneOffset()); } catch (e) {}
        var body = { channel_id: _chId, goal: _goal, days: days(), tz_offset_minutes: tz };
        apiRequest('/api/v1/content-plan/generate', { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                if (r && r.ok) { renderGenerating(); startPoll(); }
                else if (r && r.error) { if (btn) btn.disabled = false; toast(cap(r)); }
                else { if (btn) btn.disabled = false; toast(T('Не удалось запустить сборку')); }
            })
            .catch(function () { if (btn) btn.disabled = false; toast(T('Не удалось запустить сборку')); });
    }
    function cap(r) {
        if (r && r.detail && r.detail.message) return r.detail.message;
        return T('Лимит на сегодня исчерпан — попробуй позже.');
    }

    function renderGenerating() {
        setView('<div class="cp-center"><div class="cp-genic"><i class="ti ti-calendar-week"></i></div>' +
            '<div class="cp-spin"></div>' +
            '<div class="m" id="cp-gen-text">' + esc(T(GEN_TEXTS[0])) + '</div>' +
            '<div class="s">' + esc(T('Обычно 15–30 секунд. Можно закрыть — план соберётся сам.')) + '</div></div>');
        var i = 0;
        _genTimer = setInterval(function () {
            var el = document.getElementById('cp-gen-text');
            if (!el) return;
            if (i < GEN_TEXTS.length - 1) { i++; el.textContent = T(GEN_TEXTS[i]); }
        }, 5000);
    }
    function startPoll() {
        if (_pollTimer) clearInterval(_pollTimer);
        var ticks = 0;
        _pollTimer = setInterval(function () {
            ticks++;
            if (ticks === 20) { var el = document.getElementById('cp-gen-text'); if (el) el.textContent = T('Ещё чуть-чуть...'); }
            apiRequest('/api/v1/content-plan').then(function (d) {
                if (!d || !d.ok) return;
                if (d.status === 'ready' || d.status === 'scheduled' || d.status === 'done') { _state = d; stopTimers(); renderWeek(); }
                else if (d.status === 'error') { _state = d; stopTimers(); renderError(); }
            }).catch(function () {});
        }, 2500);
    }
    function renderError() {
        setView('<div class="cp-center"><div class="big">⚠️</div>' +
            '<div class="m">' + esc(T('Сборка не удалась — такое бывает. Попробуй ещё раз.')) + '</div>' +
            '<button class="cp-go" style="max-width:280px;" data-act="regen">' + esc(T('Собрать заново')) + '</button></div>');
    }

    function numShort(n) {
        n = +n || 0;
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
        return String(n);
    }

    function hoursWord(n) { return plural3(n, 'час', 'часа', 'часов'); }

    function fmtInfo(f) {
        for (var i = 0; i < _rubrics.length; i++) {
            if (_rubrics[i].key === f) {
                return [_rubrics[i].title, _rubrics[i].needs_fact ? 'ti-camera' : 'ti-file-text'];
            }
        }
        return FMT[f] || ['Пост', 'ti-file-text'];
    }
    function statusOf(p) {
        var ps = p.publish_status;
        if (ps === 'published') return [T('Опубликован'), 'pub'];
        if (ps === 'queued') return [T('Запланирован') + (p.slot_hm ? ' ' + p.slot_hm : ''), 'q'];
        if (ps === 'failed' || ps === 'needs_check') return [T('Не отправлен'), 'fail'];
        if (p.status === 'approved') return [T('Утверждён'), 'ok'];
        if (p.text) return [T('Черновик готов'), 'draft'];
        return [T('Идея'), 'idea'];
    }
    function dateLabel(iso) {
        if (!iso) return '';
        try {
            var lang = (window.getLang ? window.getLang() : 'ru') || 'ru';
            return new Date(iso + 'T00:00:00').toLocaleDateString(lang, { day: 'numeric', month: 'long' });
        } catch (e) { return ''; }
    }

    function posts() { return (_state.posts || []).slice().sort(function (a, b) { return (a.day_index || 0) - (b.day_index || 0); }); }

    function renderWeek() {
        var ps = posts();
        var n = ps.length;
        if (_selDay == null || !ps.some(function (p) { return p.day_index === _selDay; })) _selDay = ps.length ? ps[0].day_index : 0;
        var appr = ps.filter(function (p) { return p.status === 'approved'; }).length;
        var pct = n ? Math.round(appr / n * 100) : 0;
        var haveText = ps.filter(function (p) { return p.text; }).length;

        var header = '<div class="cp-wkhead">' +
            '<div class="cp-ring" style="--p:' + pct + '"><i>' + appr + '/' + n + '</i></div>' +
            '<div class="cp-hitem"><div class="k">' + esc(T('цель недели')) + '</div><div class="v">' + esc(T(GOAL_MAP[_state.goal] || _state.goal || '')) + '</div></div>' +
            '<div class="cp-saved"><i class="ti ti-calendar-week"></i> ' +
            esc(n + ' ' + T(plural3(n, 'пост', 'поста', 'постов')) + ' ' + T('в неделе')) +
            '</div></div>';

        var allBtn = haveText < n
            ? '<button class="cp-allbtn" data-act="genall"><i class="ti ti-wand"></i> ' + esc(T('Написать все тексты')) + '</button>'
            : '';

        var apprText = ps.filter(function (p) { return p.status === 'approved' && p.text; }).length;
        var scheduled = _state.status === 'scheduled' || ps.some(function (p) { return p.publish_status === 'queued'; });
        var schedBtn = '';
        if (scheduled) {
            schedBtn = '<button class="cp-allbtn sched" data-act="unschedule"><i class="ti ti-calendar-off"></i> ' + esc(T('Снять неделю с очереди')) + '</button>';
        } else if (apprText > 0) {
            schedBtn = '<button class="cp-allbtn sched" data-act="schedule"><i class="ti ti-calendar-up"></i> ' + esc(T('Запланировать выход в канал')) + '</button>';
        }

        var ribbon = '<div class="cp-ribbon">' + ps.map(function (p) { return ribbonCard(p); }).join('') + '</div>';

        var foot = scheduled
            ? esc(T('Посты выйдут в канал сами в указанное время. Любой ещё не вышедший можно снять с очереди.'))
            : esc(T('Слоты времени — рекомендация; точное время подтянется по данным канала. Утверди посты и запланируй выход.'));
        setView(header + apPanel() + rubricsBlock() + allBtn + schedBtn + ribbon + detailPanel() +
            reviewEntry() + insightsBlock() + strategyBlock() +
            '<div class="cp-foot">' + foot + '</div>', 'week');
    }

    function loadAutopilot() {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid) return;
        apiRequest('/api/v1/content-plan/autopilot?channel_id=' + cid)
            .then(function (r) {
                if (r && r.ok) {
                    _ap = r.autopilot;
                    if (_state && _state.posts && _state.posts.length) renderWeek();
                    else renderBrief();
                }
            })
            .catch(function () {});
    }

    function apSave(body, done) {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid || _apBusy) return;
        _apBusy = true;
        body.channel_id = cid;
        apiRequest('/api/v1/content-plan/autopilot', { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                _apBusy = false;
                if (r && r.ok) {
                    _ap = r.autopilot;
                    if (_state && _state.posts && _state.posts.length) renderWeek(); else renderBrief();
                    if (done) done(true);
                }
                else if (r && r.error === 'not_earned') {
                    toast(T('Ступень откроется после ' + r.need + ' недель без правок. Сейчас: ' + r.weeks_clean));
                    if (done) done(false);
                } else { toast(T('Не удалось изменить настройки')); if (done) done(false); }
            })
            .catch(function () { _apBusy = false; toast(T('Не удалось изменить настройки')); });
    }

    function askPause() {
        haptic('light');
        var host = document.getElementById('cp-capbox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-capbox';
        host.className = 'cp-capbox';
        var opts = [1, 2, 4, 8].map(function (w) {
            return '<button class="cp-capopt" data-pausew="' + w + '">' + w + ' ' +
                esc(T(plural3(w, 'неделя', 'недели', 'недель'))) + '</button>';
        }).join('');
        host.innerHTML = '<div class="cp-capin"><div class="cp-caph">' +
            esc(T('Пауза на отпуск')) + '</div>' +
            '<div class="cp-caps">' + esc(T('Сборка не запустится указанный срок. ' +
                'Ступень и накопленные недели без правок сохраняются.')) + '</div>' +
            '<div class="cp-capopts">' + opts + '</div>' +
            '<button class="cp-capclose">' + esc(T('Закрыть')) + '</button></div>';
        (document.getElementById('content-plan-screen') || document.body).appendChild(host);
        host.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-pausew]') : null;
            if (b) {
                haptic('light');
                apSave({ pause_weeks: +b.getAttribute('data-pausew') });
                host.remove();
                return;
            }
            if (e.target === host || (e.target.closest && e.target.closest('.cp-capclose'))) host.remove();
        });
    }

    function askCap() {
        var cur = (_ap && _ap.weekly_forge_cap) || 100;
        var w = wallet();
        var week = (w.price_day || 10) * totalPosts();
        var opts = [100, 300, 700, 1500];
        if (opts.indexOf(cur) < 0) opts.push(cur);
        opts.sort(function (a, b) { return a - b; });
        var html = opts.map(function (v) {
            var thin = week > 0 && v < week;
            return '<button class="cp-capopt' + (v === cur ? ' on' : '') + (thin ? ' thin' : '') +
                '" data-capv="' + v + '">' + v + ' Forge' +
                (thin ? '<span>' + esc(T('меньше недели')) + '</span>' : '') + '</button>';
        }).join('');
        var warn = (week > 0 && cur < week)
            ? '<div class="cp-capwarn">' + esc(T('Неделя по текущим настройкам стоит') + ' ' +
                week + ' Forge — ' + T('при этом потолке автопилот остановится, не собрав её.')) +
              '</div>'
            : '';
        var host = document.getElementById('cp-capbox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-capbox';
        host.className = 'cp-capbox';
        host.innerHTML = '<div class="cp-capin"><div class="cp-caph">' +
            esc(T('Потолок расхода в неделю')) + '</div>' +
            '<div class="cp-caps">' + esc(T('Автопилот остановится, когда достигнет этой суммы.')) +
            '</div>' + warn + '<div class="cp-capopts">' + html + '</div>' +
            '<button class="cp-capclose">' + esc(T('Закрыть')) + '</button></div>';
        (document.getElementById('content-plan-screen') || document.body).appendChild(host);
        host.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-capv]') : null;
            if (b) {
                haptic('light');
                apSave({ weekly_forge_cap: +b.getAttribute('data-capv') });
                host.remove();
                return;
            }
            if (e.target === host || (e.target.closest && e.target.closest('.cp-capclose'))) host.remove();
        });
    }

    function pickChannel() {
        haptic('light');
        if (!_channels || _channels.length < 2) return;
        if (typeof window.showBottomSheet !== 'function') return;
        window.showBottomSheet({
            title: T('Канал для контент-плана'),
            subtitle: T('Посты будут написаны в манере выбранного канала'),
            activeId: _chId,
            items: _channels.map(function (c) {
                return {
                    id: c.id,
                    title: c.title || ('@' + c.username),
                    subtitle: (c.voice_status === 'done')
                        ? (c.voice_preview || T('стиль настроен'))
                        : T('стиль не настроен'),
                    subtitle_warn: c.voice_status !== 'done',
                    has_avatar: c.has_avatar,
                    is_private: c.is_private,
                    paused: !!c.is_paused,
                };
            }),
            onSelect: function (id) {
                _chId = +id;
                _ap = null;
                _rubrics = [];
                _review = null;
                _cal = null;
                _days = null;
                renderBrief();
                loadAutopilot();
                loadRubrics();
                loadReview(false);
                loadCalendar();
                apiRequest('/api/v1/content-plan?channel_id=' + _chId)
                    .then(function (d) {
                        if (!d || !d.ok) return;
                        _state = d;
                        syncDays(d);
                        if (d.posts && d.posts.length) renderWeek(); else renderBrief();
                    })
                    .catch(function () {});
            },
        });
    }

    function apStop() {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid || _apBusy) return;
        _apBusy = true;
        haptic('medium');
        apiRequest('/api/v1/content-plan/autopilot/stop', {
            method: 'POST', body: JSON.stringify({ channel_id: cid })
        }).then(function (r) {
            _apBusy = false;
            if (r && r.ok) { toast(T('Автопилот остановлен')); loadAutopilot(); }
            else toast(T('Не удалось остановить'));
        }).catch(function () { _apBusy = false; toast(T('Не удалось остановить')); });
    }

    function apPanel() {
        if (!_ap) return '';
        var lvl = _ap.level || 'manual';
        var on = lvl !== 'manual';
        var cls = on ? ' on' : '';

        var head = '<div class="cp-ap-top">' +
            '<span class="cp-ap-ic"><i class="ti ti-robot"></i></span>' +
            '<span class="cp-ap-tx"><b>' + esc(T('Автопилот')) + '</b><span>' +
            esc(T(apSubtitle())) + '</span></span>' +
            '<button class="cp-tgl' + (on ? '' : ' off') + '" data-act="aptoggle"></button></div>';

        var stepsNote = '<div class="cp-note ap">' + esc(T(
            'Ступени открываются по очереди: сначала неделя собирается по кнопке, ' +
            'потом сама, и только затем публикуется без подтверждения. ' +
            'Каждая следующая — после двух недель, где тексты не пришлось переписывать.'
        )) + '</div>';

        var steps = '<div class="cp-ap-steps">' + AP_LEVELS.map(function (L) {
            var idx = AP_LEVELS.map(function (x) { return x[0]; }).indexOf(L[0]);
            var cur = AP_LEVELS.map(function (x) { return x[0]; }).indexOf(lvl);
            var k = idx < cur ? ' done' : (idx === cur ? ' now' : '');
            var sub = L[2];
            if (idx === cur + 1) {
                sub = (_ap.weeks_clean || 0) + ' ' + T('из') + ' ' + (_ap.weeks_to_promote || 2) + ' ' + T('недель');
            }
            return '<button class="cp-ap-step' + k + '" data-act="aplevel" data-v="' + L[0] + '">' +
                '<b>' + esc(T(L[1])) + '</b>' + esc(T(sub)) + '</button>';
        }).join('') + '</div>';

        var body = '';
        if (on) {
            body += '<div class="cp-ap-does">' +
                doLine('Формирует неделю по воскресеньям') +
                doLine(lvl === 'auto' ? 'Ставит посты в очередь без подтверждения'
                                      : 'Оставляет посты на твоё утверждение') +
                doLine('Учитывает отклик и перестраивает форматы') + '</div>';
        }

        var cap = _ap.weekly_forge_cap || 100;
        var spent = _ap.spent_this_week || 0;
        body += '<div class="cp-ap-row"><span>' + esc(T('Потолок расхода в неделю')) + '</span>' +
            '<b>' + (typeof window.forgeAmount === 'function' ? window.forgeAmount(spent, 12) : spent) +
            ' ' + esc(T('из')) + ' ' + cap + '</b>' +
            '<button class="cp-ap-mini" data-act="apcap">' + esc(T('изменить')) + '</button></div>';

        if (lvl === 'auto') {
            body += '<div class="cp-ap-row"><span>' + esc(T('Окно отмены после сборки')) + '</span>' +
                '<b>' + (_ap.veto_hours || 6) + ' ' + esc(T(hoursWord(_ap.veto_hours || 6))) + '</b></div>';
        }

        if (_ap.paused_until) {
            var till = '';
            try {
                var lg = (window.getLang ? window.getLang() : 'ru') || 'ru';
                till = new Date(_ap.paused_until).toLocaleDateString(lg, { day: 'numeric', month: 'long' });
            } catch (e) {}
            body += '<div class="cp-ap-pause"><i class="ti ti-beach"></i><span>' +
                esc(T('Пауза до') + ' ' + till + ' — ' +
                    T('ступень и недели без правок сохранены.')) + '</span>' +
                '<button class="cp-ap-mini" data-act="apresume">' + esc(T('вернуть')) + '</button></div>';
        }
        if (_ap.stopped_reason) {
            body += '<div class="cp-ap-stopped"><i class="ti ti-alert-triangle"></i>' +
                esc(T('Остановлен: ') + _ap.stopped_reason) + '</div>';
        }
        if (on) {
            if (!_ap.paused_until) {
                body += '<button class="cp-ap-mini wide" data-act="appause">' +
                    '<i class="ti ti-beach"></i> ' + esc(T('Пауза на отпуск')) + '</button>';
            }
            body += '<button class="cp-ap-stop" data-act="apstop">' +
                '<i class="ti ti-player-stop"></i> ' + esc(T('Остановить автопилот')) + '</button>';
        }

        return '<div class="cp-ap' + cls + '">' + head +
            '<div class="cp-ap-body">' + steps + stepsNote + body + '</div></div>';
    }

    function doLine(txt) {
        return '<div class="cp-ap-do"><i class="ti ti-check"></i><span>' + esc(T(txt)) + '</span></div>';
    }

    function apSubtitle() {
        if (!_ap) return '';
        if (_ap.stopped_reason) return 'Остановлен';
        if (_ap.level === 'auto') return 'Ведёт канал сам';
        if (_ap.level === 'batch') return 'Собирает неделю, ждёт утверждения';
        var need = (_ap.weeks_to_promote || 2) - (_ap.weeks_clean || 0);
        return need > 0 ? ('Откроется после ' + need + ' ' + plural3(need, 'недели', 'недель', 'недель') + ' без правок')
                        : 'Можно включить';
    }


    function readinessBlock() {
        var r = readiness();
        if (r.ready !== false || r.reason === 'no_channel') return '';

        if (r.reason === 'paused') {
            return '<div class="cp-ready stop"><div class="cp-ready-h">' +
                '<span class="cp-ready-ic st"><i class="ti ti-player-pause"></i></span>' +
                '<span><b>' + esc(T('Канал приостановлен')) + '</b>' +
                '<span>' + esc(r.title || '') + '</span></span></div>' +
                '<div class="cp-ready-w st">' + esc(T('Подключено больше каналов, чем допускает ' +
                'тариф, — канал приостановлен. Публикация в него не проходит, ' +
                'поэтому сборка недели недоступна.')) + '</div>' +
                '<div class="cp-ready-way">' +
                '<div class="cp-ready-wt">' + esc(T('Сними паузу в настройках канала, ' +
                'выбери другой канал выше или перейди на тариф с бо́льшим числом каналов.')) + '</div>' +
                '<button class="cp-ready-b" data-act="openstyle">' +
                '<i class="ti ti-settings"></i> ' + esc(T('Открыть настройки канала')) +
                '</button></div></div>';
        }

        var why = {
            no_text: 'В канале нет постов с текстом — по ним определяется манера письма.',
            no_posts: 'В канале пока нет публикаций, а по ним определяется манера письма.',
            collecting: 'Стиль ещё собирается — это занимает несколько минут.',
            no_style: 'Манера письма канала не определена.',
        }[r.reason] || 'Манера письма канала не определена.';

        if (r.reason === 'collecting') {
            return '<div class="cp-ready wait"><div class="cp-ready-h">' +
                '<span class="cp-ready-ic"><i class="ti ti-hourglass"></i></span>' +
                '<span><b>' + esc(T('Стиль собирается')) + '</b>' +
                '<span>' + esc(r.title || '') + '</span></span></div>' +
                '<div class="cp-ready-w">' + esc(T(why)) + '</div></div>';
        }

        var sub = (r.subscribers ? (r.subscribers + ' ' +
            T(plural3(r.subscribers, 'подписчик', 'подписчика', 'подписчиков'))) : T('подписчиков пока нет'));

        var strat = (_state && _state.strategy) || {};
        var stratBtn = strat.has ? '' :
            '<div class="cp-ready-way pk">' +
            '<div class="cp-ready-wh"><span class="ic pk"><i class="ti ti-target-arrow"></i></span>' +
            '<span><b>' + esc(T('Определить нишу и план ведения')) + '</b>' +
            '<span>' + esc(T('AI-стратегия')) + '</span></span></div>' +
            '<div class="cp-ready-wt">' + esc(T('Если тематика ещё не определена: стратегия подберёт ' +
                'нишу с оценкой спроса и конкуренции, опишет аудиторию и разложит рубрики по дням. ' +
                'Контент-план дальше исполняет этот план.')) + '</div>' +
            strategyParts() +
            '<button class="cp-ready-b pk" data-act="openstrategy">' +
            '<i class="ti ti-sparkles"></i> ' + esc(T('Открыть AI-стратегию')) + '</button></div>';

        return '<div class="cp-ready"><div class="cp-ready-h">' +
            '<span class="cp-ready-ic"><i class="ti ti-eye-off"></i></span>' +
            '<span><b>' + esc(T('Недостаточно данных для анализа')) + '</b>' +
            '<span>' + esc((r.title || '') + ' · ' + sub) + '</span></span></div>' +
            '<div class="cp-ready-w">' + esc(T(why)) +
            ' ' + esc(T('Материал без такой опоры выйдет обобщённым.')) + '</div>' +

            '<div class="cp-ready-way">' +
            '<div class="cp-ready-wh"><span class="ic"><i class="ti ti-edit"></i></span>' +
            '<span><b>' + esc(T('Задать манеру письма')) + '</b>' +
            '<span>' + esc(T('около минуты')) + '</span></span></div>' +
            '<div class="cp-ready-wt">' + esc(T('Вставь 3–5 постов, на которые хочешь ориентироваться — ' +
                'свои или чужие. Этого достаточно, чтобы определить манеру и придерживаться её.')) + '</div>' +
            '<button class="cp-ready-b" data-act="openstyle">' +
            '<i class="ti ti-edit"></i> ' + esc(T('Загрузить образцы')) + '</button></div>' +

            stratBtn + '</div>';
    }

    function strategyBlock() {
        var st = (_state && _state.strategy) || {};

        if (st.following) {
            var f = st.following;
            var parts = [];
            if (f.niche) parts.push(T('ниша') + ': ' + f.niche);
            if (f.rubrics) parts.push(f.rubrics + ' ' + T(plural3(f.rubrics, 'рубрика', 'рубрики', 'рубрик')));
            return '<div class="cp-str follow"><div class="cp-str-h">' +
                '<span class="cp-str-ic"><i class="ti ti-target-arrow"></i></span>' +
                '<span><b>' + esc(T('Неделя собирается по стратегии')) + '</b>' +
                '<span>' + esc(parts.join(' · ')) + '</span></span></div></div>';
        }

        if (st.offer) {
            var o = st.offer;
            return '<div class="cp-str offer">' +
                '<div class="cp-str-h"><span class="cp-str-ic pk"><i class="ti ti-target-arrow"></i></span>' +
                '<span><b>' + esc(T('Посты выходят, аудитория стоит')) + '</b>' +
                '<span>' + esc(T('AI-стратегия')) + ' · ' + o.price + ' ₽</span></span></div>' +
                '<div class="cp-str-w">' +
                esc(T('За ' + o.weeks + ' ' + plural3(o.weeks, 'неделю', 'недели', 'недель') +
                      ' опубликовано ' + o.published + ' ' + plural3(o.published, 'пост', 'поста', 'постов') +
                      ', пришло ' + o.joined + ', ушло ' + o.left + '. Контент выходит регулярно — ' +
                      'значит дело не в нём, а в том, что канал никто не находит.')) +
                '</div><div class="cp-str-w dim">' +
                esc(T('Стратегия разбирает, откуда брать аудиторию. Контент-план дальше ' +
                      'исполняет её план.')) +
                '</div>' + strategyParts() +
                '<button class="cp-str-b" data-act="openstrategy">' +
                '<i class="ti ti-sparkles"></i> ' + esc(T('Открыть AI-стратегию')) + '</button></div>';
        }
        return '';
    }

    function insightsBlock() {
        var ins = (_state && _state.insights) || {};
        var fm = ins.formats || [], hs = ins.hours || [];
        if (!fm.length && !hs.length) {
            if (!ins.published_total) return '';
            return '<div class="cp-ins"><div class="cp-ins-h"><i class="ti ti-chart-dots"></i>' +
                esc(T('Накопленные данные')) + '</div><div class="cp-ins-empty">' +
                esc(T('Опубликовано постов: ' + ins.published_total +
                      '. Отклик собирается двое суток после выхода — выводы появятся, ' +
                      'когда наберётся хотя бы по два поста одного формата.')) + '</div></div>';
        }

        var body = '';
        if (fm.length) {
            var max = Math.max.apply(null, fm.map(function (f) { return f.reactions_avg || 0; })) || 1;
            body += '<div class="cp-ins-t">' + esc(T('Отклик по форматам')) +
                '<span>' + esc(T('реакций на пост')) + '</span></div>' +
                '<div class="cp-bars">' + fm.map(function (f) {
                    var fi = fmtInfo(f.fmt);
                    var pct = Math.max(4, Math.round((f.reactions_avg || 0) / max * 100));
                    var weak = (f.reactions_avg || 0) * 3 < max;
                    return '<div class="cp-bar"><span class="n">' + esc(T(fi[0])) + '</span>' +
                        '<span class="t"><span class="f' + (weak ? ' weak' : '') + '" style="width:' + pct + '%"></span></span>' +
                        '<span class="v">' + (f.reactions_avg || 0) + '</span></div>';
                }).join('') + '</div>';
        }
        if (hs.length) {
            var top = hs.slice(0, 2).map(function (h) {
                return '<div class="cp-hcell"><div class="k">' + esc(T('окно')) + '</div>' +
                    '<div class="v">' + (h.hour < 10 ? '0' : '') + h.hour + ':00</div>' +
                    '<div class="d">' + h.posts + ' ' + esc(T(plural3(h.posts, 'пост', 'поста', 'постов'))) +
                    ' · ' + esc(T('в среднем')) + ' ' + h.views_avg + '</div></div>';
            }).join('');
            body += '<div class="cp-ins-t">' + esc(T('Когда читают')) +
                '<span>' + esc(T('просмотров за сутки')) + '</span></div>' +
                '<div class="cp-hgrid">' + top + '</div>';
        }
        var since = ins.since ? ' · ' + esc(T('с')) + ' ' + esc(dateLabel(ins.since)) : '';
        return '<div class="cp-ins"><div class="cp-ins-h"><i class="ti ti-chart-dots"></i>' +
            esc(T('Накопленные данные')) + '<em>' + (ins.published_total || 0) + ' ' +
            esc(T(plural3(ins.published_total || 0, 'пост', 'поста', 'постов'))) + since + '</em></div>' +
            '<div class="cp-note in">' + esc(T('Замеры вышедших постов: на что аудитория ' +
            'откликается и когда читает. По ним подбираются форматы и время.')) + '</div>' +
            body + '</div>';
    }


    function ribbonCard(p) {
        var fi = fmtInfo(p.format);
        var st = statusOf(p);
        var wd = WD[(p.day_index || 0) % 7];
        var conf = (p.slot_conf === 'high') ? ['по данным канала', 'hi'] : ['гипотеза · уточним', 'lo'];
        var slot = p.slot_hm
            ? '<div class="cp-slot"><span class="tm"><i class="ti ti-clock"></i>' + esc(p.slot_hm) + '</span>' +
              '<span class="cp-conf ' + conf[1] + '">' + esc(T(conf[0])) + '</span></div>'
            : '';
        var ad = p.is_ad
            ? '<span class="cp-adm"><i class="ti ti-ad-2"></i>' + esc(T('реклама')) + '</span>'
            : '';
        var views = (p.views != null && p.views > 0)
            ? '<span class="cp-views"><i class="ti ti-eye"></i>' + esc(numShort(p.views)) + '</span>'
            : '';
        return '<div class="cp-day s-' + st[1] + (p.day_index === _selDay ? ' sel' : '') + '" data-act="selday" data-day="' + p.day_index + '">' +
            '<div class="cp-dhead"><span class="d">' + esc(T(wd)) + '</span><span class="dt">' + esc(dateLabel(p.date_iso)) + '</span></div>' +
            '<span class="cp-fmt"><i class="ti ' + fi[1] + '"></i>' + esc(T(fi[0])) + '</span>' + ad +
            '<div class="cp-dtitle">' + esc(p.title || '') + '</div>' + slot +
            '<div class="cp-dstat"><span class="sd"></span>' + esc(T(st[0])) + views + '</div></div>';
    }

    function detailPanel() {
        var ps = posts();
        var p = ps.filter(function (x) { return x.day_index === _selDay; })[0];
        if (!p) return '';
        var fi = fmtInfo(p.format);
        var wd = WD[(p.day_index || 0) % 7];
        var conf = (p.slot_conf === 'high') ? ['по данным канала', 'hi'] : ['гипотеза · уточним', 'lo'];
        var slot = p.slot_hm ? '<div class="cp-dslot2"><i class="ti ti-clock"></i>' + esc(p.slot_hm) +
            ' <span class="cp-conf ' + conf[1] + '">' + esc(T(conf[0])) + '</span></div>' : '';
        var adRow = '<button class="cp-adrow' + (p.is_ad ? ' on' : '') +
            '" data-act="admark" data-id="' + p.id + '">' +
            '<i class="ti ' + (p.is_ad ? 'ti-ad-2' : 'ti-ad-off') + '"></i>' +
            '<span class="tx"><b>' + esc(T(p.is_ad ? 'Рекламный пост' : 'Обычный пост')) + '</b>' +
            '<em>' + esc(p.is_ad
                ? (p.ad_erid ? (T('пометка и erid добавятся при выходе') + ' · ' + p.ad_erid)
                             : T('пометка добавится при выходе · нажми, чтобы указать erid'))
                : T('нажми, если это размещение рекламодателя')) + '</em></span></button>';

        var body;
        var pubc = '<button class="cp-act" data-act="copy" data-id="' + p.id + '"><i class="ti ti-copy"></i> ' + esc(T('Скопировать')) + '</button>';
        if (_dayBusy[p.id]) {
            body = '<div class="cp-dload"><div class="cp-spin sm"></div>' + esc(T('Пишу текст...')) + '</div>';
        } else if (p.publish_status === 'published') {
            body = '<div class="cp-dtext2">' + esc(p.text) + '</div><div class="cp-dacts">' +
                (p.published_url ? '<button class="cp-act ok" data-act="openpost" data-url="' + esc(p.published_url) + '"><i class="ti ti-external-link"></i> ' + esc(T('Открыть в канале')) + '</button>' : '') +
                '<button class="cp-act" data-act="rollback" data-id="' + p.id + '"><i class="ti ti-trash"></i> ' + esc(T('Удалить из канала')) + '</button>' + pubc + '</div>' +
                '<div class="cp-note">' + esc(T('Опубликовано. Удалить из канала ботом можно 48 часов.')) + '</div>';
        } else if (p.publish_status === 'queued') {
            body = '<div class="cp-dtext2">' + esc(p.text) + '</div><div class="cp-dacts">' +
                '<button class="cp-act" data-act="canceld" data-id="' + p.id + '"><i class="ti ti-calendar-off"></i> ' + esc(T('Снять с очереди')) + '</button>' + pubc + '</div>' +
                '<div class="cp-note">' + esc(T('Выйдет в канал автоматически в указанное время.')) + '</div>';
        } else if (p.publish_status === 'failed' || p.publish_status === 'needs_check') {
            body = '<div class="cp-dtext2">' + esc(p.text) + '</div><div class="cp-dacts">' +
                '<button class="cp-act ok" data-act="approve" data-id="' + p.id + '"><i class="ti ti-circle-check"></i> ' + esc(T('Утвердить')) + '</button>' + pubc + '</div>' +
                '<div class="cp-note fail">' + esc(T('Пост не отправлен. Проверь права бота и запланируй заново.')) + '</div>';
        } else if (p.text) {
            body = '<div class="cp-dtext2">' + esc(p.text) + '</div>' +
                '<div class="cp-dacts">' +
                '<button class="cp-act ' + (p.status === 'approved' ? 'okon' : 'ok') + '" data-act="approve" data-id="' + p.id + '">' +
                '<i class="ti ti-' + (p.status === 'approved' ? 'circle-check-filled' : 'circle-check') + '"></i> ' +
                esc(T(p.status === 'approved' ? 'Утверждён' : 'Утвердить')) + '</button>' +
                '<button class="cp-act" data-act="variant" data-id="' + p.id + '"><i class="ti ti-refresh"></i> ' + esc(T('Ещё вариант')) + '</button>' + pubc + '</div>';
        } else {
            body = (p.angle ? '<div class="cp-dangle2">' + esc(p.angle) + '</div>' : '') +
                '<button class="cp-act gen wide" data-act="genday" data-id="' + p.id + '"><i class="ti ti-wand"></i> ' + esc(T('Написать текст')) + '</button>';
        }
        return '<div class="cp-detail">' +
            '<div class="cp-dtop2"><span class="d2">' + esc(T(wd)) + '</span><span class="dt2">' + esc(dateLabel(p.date_iso)) + '</span>' +
            '<span class="cp-fmt"><i class="ti ' + fi[1] + '"></i>' + esc(T(fi[0])) + '</span></div>' +
            slot + '<div class="cp-dtitle2">' + esc(p.title || '') + '</div>' + adRow + body + '</div>';
    }

    function post(id) { return (_state && _state.posts || []).filter(function (p) { return p.id === id; })[0]; }

    function genDay(id, isVariant) {
        var p = post(id);
        if (!p || _dayBusy[id]) return;
        _dayBusy[id] = true;
        _selDay = p.day_index;
        renderWeek();
        haptic('light');
        apiRequest('/api/v1/content-plan/generate-day', { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) {
                _dayBusy[id] = false;
                if (r && r.ok) {
                    p.text = r.text; p.status = r.status || 'draft'; p.model_used = r.model_used;
                    if (isVariant) toast(T('Готов новый вариант'));
                    refreshState();
                } else { toast(cap(r)); renderWeek(); }
            })
            .catch(function () { _dayBusy[id] = false; toast(T('Не удалось написать текст')); renderWeek(); });
    }

    function genAll() {
        var pending = (_state.posts || []).filter(function (p) { return !p.text; });
        if (!pending.length) return;
        haptic('medium');
        pending.forEach(function (p) { _dayBusy[p.id] = true; });
        renderWeek();
        apiRequest('/api/v1/content-plan/generate-all', { method: 'POST', body: '{}' })
            .then(function (r) {
                if (r && r.ok) { toast(T('Пишу всю неделю — карточки будут заполняться')); startBatchPoll(); }
                else {
                    pending.forEach(function (p) { _dayBusy[p.id] = false; });
                    if (r && r.gate === 'pro') toast(T('Вся неделя разом — на платном тарифе. Пока пиши тексты по одному.'));
                    else toast(cap(r));
                    renderWeek();
                }
            })
            .catch(function () { pending.forEach(function (p) { _dayBusy[p.id] = false; }); toast(T('Не удалось запустить генерацию')); renderWeek(); });
    }

    function startBatchPoll() {
        if (_batchTimer) clearInterval(_batchTimer);
        var prevN = (_state.posts || []).filter(function (p) { return p.text; }).length;
        var ticks = 0;
        _batchTimer = setInterval(function () {
            ticks++;
            apiRequest('/api/v1/content-plan').then(function (d) {
                if (!d || !d.ok) return;
                _state = d;
                var withText = (d.posts || []).filter(function (p) { return p.text; });
                withText.forEach(function (p) { _dayBusy[p.id] = false; });
                var pending = (d.posts || []).filter(function (p) { return !p.text; }).length;
                if (withText.length !== prevN || !pending) { prevN = withText.length; renderWeek(); }
                if (!pending || ticks > 80) {
                    clearInterval(_batchTimer); _batchTimer = null;
                    for (var k in _dayBusy) _dayBusy[k] = false;
                    renderWeek();
                }
            }).catch(function () {});
        }, 3000);
    }

    function approve(id) {
        var p = post(id);
        if (!p) return;
        haptic('light');
        var was = p.status;
        p.status = (p.status === 'approved') ? (p.text ? 'draft' : 'idea') : 'approved';
        renderWeek();
        apiRequest('/api/v1/content-plan/approve', { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) { if (!r || !r.ok) { p.status = was; renderWeek(); } else { p.status = r.status; } })
            .catch(function () { p.status = was; renderWeek(); toast(T('Не удалось сохранить')); });
    }

    function copyDay(id) {
        var p = post(id);
        if (!p || !p.text) return;
        haptic('medium');
        var run = (typeof copyText === 'function') ? copyText(p.text) : Promise.reject();
        Promise.resolve(run).then(function () { toast(T('Текст скопирован')); }).catch(function () {});
    }

    function refreshState() {
        apiRequest('/api/v1/content-plan').then(function (d) { if (d && d.ok) { _state = d; renderWeek(); } }).catch(function () {});
    }

    function onInput(ev) {
        var r = ev.target;
        if (!r || r.getAttribute('data-act') !== 'avg') return;
        _avg = Math.max(1, Math.min(MAX_PER_DAY, +r.value || 1));
        var row = r.parentElement && r.parentElement.querySelector('.cp-srow b');
        if (row) row.textContent = _avg;
    }

    function onChange(ev) {
        var r = ev.target;
        if (!r || r.getAttribute('data-act') !== 'avg') return;
        _avg = Math.max(1, Math.min(MAX_PER_DAY, +r.value || 1));
        spreadPosts(_avg, _spread);
        haptic('light');
        renderBrief();
    }

    function onClick(ev) {
        var t = ev.target;
        var chip = t.closest ? t.closest('[data-chip]') : null;
        if (chip) {
            var name = chip.getAttribute('data-chip'), v = chip.getAttribute('data-v');
            if (name === 'goal') _goal = v;
            var wrap = chip.parentElement;
            wrap.querySelectorAll('[data-chip]').forEach(function (b) { b.classList.toggle('on', b === chip); });
            haptic('light');
            renderBrief();
            return;
        }
        var spread = t.closest ? t.closest('[data-spread]') : null;
        if (spread) {
            _spread = spread.getAttribute('data-spread');
            spreadPosts(_avg, _spread);
            haptic('light');
            renderBrief();
            return;
        }
        var chan = t.closest ? t.closest('[data-chan]') : null;
        if (chan) {
            _chId = +chan.getAttribute('data-chan');
            var box = chan.parentElement;
            box.querySelectorAll('[data-chan]').forEach(function (b) { b.classList.toggle('on', b === chan); });
            haptic('light');
            loadAutopilot();
            return;
        }
        var actEl = t.closest ? t.closest('[data-act]') : null;
        if (!actEl) return;
        var act = actEl.getAttribute('data-act');
        var id = actEl.getAttribute('data-id');
        if (act === 'close') { haptic('light'); close(); return; }
        if (act === 'aptoggle') {
            haptic('medium');
            if (!_ap) return;
            if (_ap.level !== 'manual') { apStop(); return; }
            if (!_ap.can_promote) {
                var need = (_ap.weeks_to_promote || 2) - (_ap.weeks_clean || 0);
                toast(T('Автопилот откроется после ' + need + ' ' +
                        plural3(need, 'недели', 'недель', 'недель') + ' без правок'));
                return;
            }
            apSave({ level: 'batch' });
            return;
        }
        if (act === 'aplevel') {
            haptic('light');
            apSave({ level: actEl.getAttribute('data-v') });
            return;
        }
        if (act === 'apstop') { apStop(); return; }
        if (act === 'pickchan') { pickChannel(); return; }
        if (act === 'pickday') { pickDay(+actEl.getAttribute('data-day')); return; }
        if (act === 'tipmove') {
            var tp = _cal && _cal.tip;
            if (!tp) return;
            haptic('light');
            var mv = Math.min(tp.move, Math.max(0, dayN(tp.weak) - 1),
                              MAX_PER_DAY - dayN(tp.strong));
            if (mv < 1) { toast(T('Переносить нечего')); return; }
            var dd = days().slice();
            var leftN = dayN(tp.weak) - mv;
            dd[tp.weak] = { n: leftN, pins: dayPins(tp.weak).slice(0, leftN) };
            dd[tp.strong] = { n: dayN(tp.strong) + mv, pins: dayPins(tp.strong) };
            _days = dd;
            _cal.tip = null;
            renderBrief();
            loadCalendar();
            return;
        }
        if (act === 'rubtoggle') {
            haptic('light');
            var rk = actEl.getAttribute('data-v');
            var cur = _rubrics.filter(function (r) { return r.key === rk; })[0];
            if (!cur) return;
            rubApi('toggle', { key: rk, disabled: !cur.disabled });
            return;
        }
        if (act === 'rubdel') {
            haptic('medium');
            rubApi('remove', { key: actEl.getAttribute('data-v') });
            return;
        }
        if (act === 'rubadd') { askRubric(); return; }
        if (act === 'review') {
            haptic('light');
            if (_review) renderReview();
            else { renderCenter('<div class="cp-spin"></div>', T('Считаю...')); loadReview(true); }
            return;
        }
        if (act === 'revback') { haptic('light'); rerender(); return; }
        if (act === 'admark') { askAd(+actEl.getAttribute('data-id')); return; }
        if (act === 'openstyle') {
            haptic('medium');
            var cid = _chId;
            close();
            try {
                if (cid && typeof window.__openChannelSettings === 'function') {
                    window.__openChannelSettings(cid);
                }
            } catch (e) {}
            return;
        }
        if (act === 'openstrategy') {
            haptic('medium');
            close();
            try {
                if (typeof window.__openStrategy === 'function') window.__openStrategy();
                else if (typeof openStrategy === 'function') openStrategy();
            } catch (e) {}
            return;
        }
        if (act === 'apcap') { askCap(); return; }
        if (act === 'apresume') { haptic('light'); apSave({ pause_weeks: 0 }); return; }
        if (act === 'appause') { askPause(); return; }
        if (act === 'generate') { doGenerate(actEl); return; }
        if (act === 'regen') { renderBrief(); return; }
        if (act === 'selday') {
            _selDay = +actEl.getAttribute('data-day'); renderWeek(); haptic('light'); return;
        }
        if (act === 'genday') { genDay(+id, false); return; }
        if (act === 'variant') { genDay(+id, true); return; }
        if (act === 'genall') { genAll(); return; }
        if (act === 'approve') { approve(+id); return; }
        if (act === 'copy') { copyDay(+id); return; }
        if (act === 'schedule') { doSchedule(); return; }
        if (act === 'unschedule') { doUnschedule(); return; }
        if (act === 'canceld') { cancelDay(+id); return; }
        if (act === 'rollback') { rollbackDay(+id); return; }
        if (act === 'openpost') {
            var url = actEl.getAttribute('data-url');
            haptic('light');
            try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) return tg.openTelegramLink(url); } catch (e) {}
            try { window.open(url, '_blank'); } catch (e) {}
            return;
        }
    }

    function doSchedule() {
        if (!_state.can_post) {
            toast(T('Добавь @ForgeMetricsBot администратором канала с правом публикации — тогда посты смогут выходить сами.'));
            return;
        }
        haptic('medium');
        apiRequest('/api/v1/content-plan/schedule', { method: 'POST', body: '{}' })
            .then(function (r) {
                if (r && r.ok) { toast(T('Неделя запланирована — посты выйдут в канал сами')); refreshState(); }
                else if (r && r.error === 'no_bot_rights') toast(T('Добавь @ForgeMetricsBot администратором канала с правом публикации — тогда посты смогут выходить сами.'));
                else if (r && r.error === 'nothing_approved') toast(T('Сначала утверди хотя бы один пост.'));
                else toast(T('Не удалось запланировать'));
            })
            .catch(function () { toast(T('Не удалось запланировать')); });
    }
    function doUnschedule() {
        haptic('medium');
        apiRequest('/api/v1/content-plan/unschedule', { method: 'POST', body: '{}' })
            .then(function (r) { if (r && r.ok) { toast(T('Неделя снята с очереди')); refreshState(); } else toast(T('Не удалось снять с очереди')); })
            .catch(function () { toast(T('Не удалось снять с очереди')); });
    }
    function cancelDay(id) {
        haptic('light');
        apiRequest('/api/v1/content-plan/cancel-day', { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) { if (r && r.ok) { toast(T('Пост снят с очереди')); refreshState(); } else toast(T('Не удалось снять с очереди')); })
            .catch(function () { toast(T('Не удалось снять с очереди')); });
    }
    function rollbackDay(id) {
        haptic('medium');
        apiRequest('/api/v1/content-plan/rollback-day', { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) {
                if (r && r.ok) { toast(T('Пост удалён из канала')); refreshState(); }
                else if (r && r.error === 'too_late') toast(T('Прошло больше 48 часов — бот уже не может удалить пост.'));
                else toast(T('Не удалось удалить из канала'));
            })
            .catch(function () { toast(T('Не удалось удалить из канала')); });
    }
})();
