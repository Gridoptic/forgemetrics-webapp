(function () {
    'use strict';

    var _state = null;
    var _pollTimer = null, _genTimer = null;
    var _channels = null;
    var _chId = null;
    var _goal = 'engagement';
    var _model = 'premium';
    var _building = false;
    var _days = null;
    var _selDay = 0;
    var _dayBusy = {};
    var _batchTimer = null;
    var _ap = null;
    var _rubrics = [];
    var _review = null;
    var _topicCleared = {};
    var _cal = null;
    var _rubChanged = false;
    var _apBusy = false;

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }
    function wallet() { return (_state && _state.wallet) || {}; }
    function priceDay() {
        var w = wallet();
        return _model === 'standard' ? (w.price_day_std || 5) : (w.price_day || 10);
    }
    function canEdit() { return !_state || _state.can_edit !== false; }
    function priceResearch() { return wallet().price_research || 20; }
    var VIEW_ACTS = { close: 1, wkday: 1, revback: 1, review: 1, tipsmore: 1, copy: 1, goalinfo: 1 };
    function denyEdit() {
        haptic('light');
        toast(T('Создатель канала не выдал тебе право менять контент-план'));
    }
    function forgeTag(n, s) {
        if (typeof window.forgeAmount === 'function') return window.forgeAmount(n, s || 12);
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
    function toast(m, icon) { try { if (typeof showToast === 'function') return showToast(m, icon); } catch (e) {} try { if (typeof alertDialog === 'function') alertDialog(m); } catch (e) {} }

    var WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    var WD_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    var MIN_POSTS = 3;
    var MAX_PER_DAY = 10;
    var MAX_WEEK = 70;
    var GOALS = [
        ['growth', 'Рост подписчиков', 'Посты на репост и сохранение — приток новой аудитории'],
        ['engagement', 'Вовлечённость', 'Реакции, комментарии, обсуждение под постами'],
        ['sales', 'Продажи', 'Подводка к офферу: клики, заявки, покупки'],
        ['warmup', 'Прогрев к запуску', 'Серия перед анонсом: доверие и ожидание оффера'],
        ['retention', 'Удержание', 'Регулярная ценность — аудитория остаётся и возвращается'],
    ];
    // на каких форматах держится каждая цель — по ним ставится полоса и считается конфликт
    var GOAL_MAP = { growth: 'Рост подписчиков', engagement: 'Вовлечённость', sales: 'Продажи', warmup: 'Прогрев к запуску', retention: 'Удержание' };
    var GOAL_ICON = { growth: 'ti-users-plus', engagement: 'ti-heart-handshake', sales: 'ti-building-store',
        warmup: 'ti-flame', retention: 'ti-anchor' };
    var FMT = {
        news: ['Новость', 'ti-news'], analysis: ['Разбор', 'ti-microscope'], case: ['Кейс', 'ti-trophy'],
        listicle: ['Подборка', 'ti-list-check'], offer: ['Продающий', 'ti-building-store'],
        poll: ['Опрос', 'ti-chart-bar'], story: ['История', 'ti-book'], engagement: ['Вопрос читателям', 'ti-message-circle'],
        own: ['Свой пост', 'ti-pencil'],
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

    var _open = false;
    function ensureScreen() {
        var host = document.getElementById('content-plan-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'content-plan-screen';
            host.className = 'cp-screen';
            (document.getElementById('app') || document.body).appendChild(host);
            host.addEventListener('click', onClick);
            host.addEventListener('change', function (e) {
                var t = e.target;
                if (t && t.hasAttribute && t.hasAttribute('data-slot-topic')) {
                    setSlotTopic(+t.getAttribute('data-di'), +t.getAttribute('data-dk'), t.value);
                }
            });
        }
        if (!_open) return host;
        host.style.display = 'flex';
        document.documentElement.classList.add('cs-modal-open');
        document.body.classList.add('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.onClick(close); tg.BackButton.show(); } } catch (e) {}
        return host;
    }
    function close() {
        _open = false;
        stopTimers();
        if (_batchTimer) { clearInterval(_batchTimer); _batchTimer = null; }
        var day = document.getElementById('cp-daybox');
        if (day) day.remove();
        var cap = document.getElementById('cp-capbox');
        if (cap) cap.remove();
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
    var _wantView = null;

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
        cpFadeH(host);
        return host;
    }

    function cpFadeH(scope) {
        Array.prototype.slice.call(
            (scope || document).querySelectorAll('.cp-ribbon')).forEach(function (el2) {
            if (el2.__cpFade) return;
            el2.__cpFade = 1;
            function upd() {
                var canScroll = el2.scrollWidth - el2.clientWidth > 2;
                var more = el2.scrollWidth - el2.clientWidth - el2.scrollLeft > 2;
                var less = el2.scrollLeft > 2;
                var m = more && less ? 'linear-gradient(90deg,transparent,#000 22px,#000 calc(100% - 26px),transparent)'
                    : (more ? 'linear-gradient(90deg,#000 calc(100% - 26px),transparent)'
                        : (less ? 'linear-gradient(90deg,transparent,#000 22px)' : ''));
                el2.style.webkitMaskImage = m;
                el2.style.maskImage = m;
                el2.style.cursor = canScroll ? 'grab' : '';
            }
            var _dx = 0, _dl = 0, _drag = false, _moved = false;
            el2.addEventListener('pointerdown', function (e) {
                if (e.pointerType !== 'mouse' || e.button !== 0) return;
                if (el2.scrollWidth - el2.clientWidth <= 2) return;
                _drag = true; _moved = false; _dx = e.clientX; _dl = el2.scrollLeft;
            });
            el2.addEventListener('pointermove', function (e) {
                if (!_drag) return;
                var dx = e.clientX - _dx;
                if (!_moved && Math.abs(dx) > 6) {
                    _moved = true;
                    try { el2.setPointerCapture(e.pointerId); } catch (e2) {}
                }
                if (_moved) { el2.scrollLeft = _dl - dx; el2.style.cursor = 'grabbing'; }
            });
            function _dragEnd() {
                if (_drag) {
                    _drag = false;
                    upd();
                    setTimeout(function () { _moved = false; }, 80);
                }
            }
            el2.addEventListener('pointerup', _dragEnd);
            el2.addEventListener('pointercancel', _dragEnd);
            el2.addEventListener('click', function (e) {
                if (_moved) { e.stopPropagation(); e.preventDefault(); }
            }, true);
            el2.addEventListener('wheel', function (e) {
                if (el2.scrollWidth - el2.clientWidth <= 2) return;
                var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (!d) return;
                var atStart = el2.scrollLeft <= 0;
                var atEnd = el2.scrollLeft >= el2.scrollWidth - el2.clientWidth - 1;
                if ((d < 0 && atStart) || (d > 0 && atEnd)) return;
                e.preventDefault();
                el2.scrollLeft += d;
            }, { passive: false });
            el2.addEventListener('scroll', upd, { passive: true });
            upd();
        });
    }
    function renderCenter(icon, msg, sub) {
        setView('<div class="cp-center"><div class="big">' + icon + '</div><div class="m">' + esc(msg) + '</div>' +
            (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>');
    }

    window.__cpSetAp = function (ap) { _ap = ap; };
    window.__cpSetRubrics = function (r) { _rubrics = r || []; };
    window.__cpSetReview = function (r) { _review = r || null; };
    window.__cpSetCover = function (c) { _cover = c || null; };
    window.__cpAskCoverStyle = function () { askCoverStyle(); };
    window.__cpSetCal = function (c) {
        _cal = c || null;
        if (_dayDraw && document.getElementById('cp-daybox')) _dayDraw();
    };

    window.__cpRenderForCheck = function (st, chans) {
        _open = true;
        ensureScreen();
        _days = null;
        if (chans) _channels = chans;
        route(st);
    };
    window.__cpDays = function () { return days().slice(); };
    window.__cpLiveTick = function (st) {
        if (!(st && st.ok && _open)) return;
        _state = st;
        pushBalance(st);
        syncDays(st);
        if (cpBusy()) return;
        rerender();
    };

    window.__openContentPlan = function () {
        _open = true;
        _wantView = null;
        _state = null;
        _modelTouched = false;
        _rubChanged = false;
        if (!_batchTimer) _dayBusy = {};
        ensureScreen();
        renderCenter('<div class="cp-spin"></div>', T('Секунду...'));
        var go = function () {
            loadAutopilot();
            apiRequest('/api/v1/content-plan' + (_chId ? ('?channel_id=' + _chId) : '')).then(route).catch(function () {
                renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.'));
            });
        };
        if (_chId == null) {
            apiRequest('/api/v1/channels/active').then(function (cd) {
                _channels = (cd && cd.channels) || [];
                if (cd && cd.active_channel_id) _chId = cd.active_channel_id;
                else if (_channels.length) _chId = _channels[0].id;
                go();
            }).catch(function () { if (_channels === null) _channels = []; go(); });
        } else go();
    };

    function cpBusy() {
        try {
            if (document.getElementById('cp-daybox') || document.getElementById('cp-capbox')) return true;
            var a = document.activeElement;
            if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return true;
        } catch (e) {}
        return false;
    }

    var _bootT = null;
    var _rrT = null;
    var _autoFreq = false;
    var _goalAuto = false;
    var _goalTouched = false;
    var _modelTouched = false;
    var _sgOpen = false;
    function daysIsDefault() {
        var d = days();
        for (var i = 0; i < 7; i++) {
            var x = d[i] || {};
            if ((x.n || 0) !== 1) return false;
            if ((x.pins || []).length || (x.times || []).length ||
                (x.topics || []).length) return false;
        }
        return true;
    }
    function rerender() {
        if (!_open || _pollTimer || _bootT || !_state) return;
        if (_rrT) return;
        _rrT = setTimeout(function () {
            _rrT = null;
            if (!_open || _pollTimer || _bootT || !_state) return;
            if (_wantView === 'brief') { renderBrief(); return; }
            if ((_state.posts && _state.posts.length) || _state.manual) renderWeek(); else renderBrief();
        }, 120);
    }

    function pushBalance(d) {
        var w = d && d.wallet;
        if (w && w.balance != null && typeof window.setForgeBalance === 'function') {
            window.setForgeBalance(w.balance);
        }
    }

    function syncDays(d) {
        pushBalance(d);
        if (d && d.goal && String(d.goal).split('+').every(function (x) { return GOAL_MAP[x]; })) {
            _goal = d.goal;
        }
        if (!_modelTouched) {
            _model = (d && d.model_choice === 'standard' && (d.posts || []).length)
                ? 'standard' : 'premium';
        }
        if (!d || !d.days || d.days.length !== 7) return;
        if (_days && (_daysDirty || _daysTimer)) return;
        _days = d.days.map(function (x) {
            if (x && typeof x === 'object') {
                return { n: +x.n || 0, pins: (x.pins || []).slice(),
                         times: (x.times || []).slice(),
                         topics: (x.topics || []).slice() };
            }
            return { n: x === 'off' ? 0 : 1,
                     pins: (x && x !== 'auto' && x !== 'off') ? [x] : [],
                     times: [], topics: [] };
        });
    }

    function route(d) {
        if (!d || !d.ok) { renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.')); return; }
        _state = d;
        syncDays(d);
        if (_chId == null) {
            _chId = d.readiness_channel_id || d.channel_id ||
                ((_channels || [])[0] || {}).id || null;
        }
        if (d.status === 'generating') {
            if (_chId) {
                if (!_rubrics.length) loadRubrics();
                if (!_ap) loadAutopilot();
                if (!_cal) loadCalendar();
            }
            _building = true; renderGenerating(); startPoll(); return;
        }
        if ((d.status === 'ready' || d.status === 'scheduled' || d.status === 'done')
                && ((d.posts || []).length || d.manual)) {
            if (_channels === null) {
                apiRequest('/api/v1/channels/active').then(function (cd) {
                    _channels = (cd && cd.channels) || [];
                    if (_chId == null && cd && cd.active_channel_id) _chId = cd.active_channel_id;
                    if (!_building) renderWeek();
                }).catch(function () {});
            }
            if (_chId) {
                if (!_rubrics.length) loadRubrics();
                if (!_ap) loadAutopilot();
                if (!_cover) loadCover();
                if (!_cal) loadCalendar();
                loadReview(false);
            }
            var bps = d.posts || [];
            var bwt = bps.filter(function (p) { return p.text; }).length;
            if (d.batch_running && bwt < bps.length) {
                _building = true;
                renderGenerating();
                startPoll();
                return;
            }
            var bootStart = Date.now();
            var bootDone = function () {
                if (_bootT) { clearInterval(_bootT); _bootT = null; }
                renderWeek();
                if (d.batch_running) startBatchPoll();
            };
            if (_chId && (!_cal || !_rubrics.length || !_ap)) {
                _bootT = setInterval(function () {
                    if ((_cal && _rubrics.length && _ap) || Date.now() - bootStart > 700) bootDone();
                }, 90);
            } else bootDone();
            return;
        }
        if (_channels === null) {
            apiRequest('/api/v1/channels/active').then(function (cd) {
                _channels = (cd && cd.channels) || [];
                if (_chId == null && cd && cd.active_channel_id) _chId = cd.active_channel_id;
                if (_chId == null && _channels.length) _chId = _channels[0].id;
                renderBrief();
                if (_chId) {
                    apiRequest('/api/v1/content-plan?channel_id=' + _chId)
                        .then(function (d2) {
                            if (!d2 || !d2.ok) return;
                            _state = d2;
                            syncDays(d2);
                            if ((d2.posts && d2.posts.length) || d2.manual) renderWeek(); else renderBrief();
                        })
                        .catch(function () {});
                    loadAutopilot();
                    loadRubrics();
                    loadReview(false);
                    loadCalendar();
                    loadCover();
                }
            }).catch(function () { _channels = []; renderBrief(); });
            return;
        }
        if (_chId) {
            if (!_rubrics.length) loadRubrics();
            if (!_ap) loadAutopilot();
            if (!_cal) loadCalendar();
            loadReview(false);
        }
        renderBrief();
    }

    function secHead(title, note) {
        return '<div class="cp-lbl">' + esc(T(title)) + '</div>' +
            (note ? '<div class="cp-note">' + esc(T(note)) + '</div>' : '');
    }

    function days() {
        if (!_days || _days.length !== 7) {
            var stub = [];
            for (var i = 0; i < 7; i++) stub.push({ n: 1, pins: [], times: [], topics: [] });
            return stub;
        }
        return _days;
    }
    function dayN(i) { return Math.max(0, Math.min(MAX_PER_DAY, +(days()[i] || {}).n || 0)); }
    function dayPins(i) { return ((days()[i] || {}).pins || []).slice(); }
    function dayTopics(i) { return ((days()[i] || {}).topics || []).slice(); }
    function setSlotTopic(i, k, v) {
        var d = days().slice();
        var x = d[i] || { n: 1, pins: [], times: [] };
        var tp = (x.topics || []).slice();
        while (tp.length <= k) tp.push('');
        tp[k] = String(v || '').slice(0, 200);
        while (tp.length && !tp[tp.length - 1]) tp.pop();
        d[i] = { n: x.n, pins: x.pins || [], times: x.times || [], topics: tp };
        _days = d;
        saveDaysSoon();
    }
    function totalPosts() {
        return days().reduce(function (s, d) { return s + Math.max(0, +d.n || 0); }, 0);
    }
    function activeDays() {
        return days().reduce(function (a, d, i) { if ((+d.n || 0) > 0) a.push(i); return a; }, []);
    }
    function applyFreqGrid(rn) {
        rn = Math.max(3, Math.min(7, +rn || 3));
        var hist = histDays();
        var pat;
        if (hist && hist.some(function (d) { return (d.views || 0) > 0; })) {
            pat = [0, 1, 2, 3, 4, 5, 6].sort(function (a, b) {
                return (hist[b].views || 0) - (hist[a].views || 0) || a - b;
            }).slice(0, rn);
        } else {
            var base = { 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 3, 4],
                         6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] }[rn];
            var sh = isoWeek(new Date()) % 7;
            pat = base.map(function (d) { return (d + sh) % 7; });
        }
        var fd = days().slice();
        for (var fi = 0; fi < 7; fi++) {
            var fn = pat.indexOf(fi) >= 0 ? 1 : 0;
            fd[fi] = { n: fn, pins: dayPins(fi).slice(0, fn), times: dayTimes(fi).slice(0, fn),
                       topics: dayTopics(fi).slice(0, fn) };
        }
        _days = fd;
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
        d[i] = { n: n, pins: dayPins(i).slice(0, n), times: dayTimes(i).slice(0, n),
                 topics: dayTopics(i).slice(0, n) };
        _days = d;
        return true;
    }
    function numExact(n) {
        n = Math.round(+n || 0);
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function histAvg() {
        var h = histAny();
        if (!h) return 0;
        var s = 0, n = 0;
        h.forEach(function (d) { if (d.views > 0) { s += d.views; n++; } });
        return n ? s / n : 0;
    }
    function qbHead() {
        var h = _cal && _cal.history;
        if (!h || !h.ready || !h.since) return '';
        var mm = function (iso) {
            var p = String(iso).split('-');
            return p[1] + '.' + String(p[0]).slice(2);
        };
        var span;
        if (h.window_days === 0) span = T('за всё время');
        else if (h.window_days === 365) span = T('за год');
        else span = mm(h.since) === mm(h.until) ? mm(h.since) : (mm(h.since) + '—' + mm(h.until));
        return '<div class="cp-qhead"><span class="l"><i></i>' +
            esc(T('охват по дням') + ' · ' + h.total + ' ' +
                T(plural3(h.total, 'пост', 'поста', 'постов'))) + '</span>' +
            '<span class="r">Ø ' + esc(numExact(histAvg())) + ' · ' + esc(span) + '</span></div>';
    }

    function qbNote() {
        var h = _cal && _cal.history;
        if (!h || !h.ready || h.window_days !== 0) return '';
        return '<div class="cp-qnote"><i class="ti ti-info-circle"></i><span>' +
            esc(T('История охватывает периоды с разной частотой выхода. Посты моложе 3 дней не входят в средние — они ещё набирают просмотры.')) +
            '</span></div>';
    }

    function histDays() {
        var h = _cal && _cal.history;
        return (h && h.ready && (h.days || []).length === 7) ? h.days : null;
    }
    function histAny() {
        var h = _cal && _cal.history;
        return (h && (h.days || []).length === 7 && (h.total || 0) > 0) ? h.days : null;
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
        var avg = histAvg();
        var busy = {};
        ((_cal && _cal.busy) || []).forEach(function (b) { busy[b.day] = true; });
        var byDay = null;
        if (frozen === true) {
            byDay = {};
            ((_state && _state.posts) || []).forEach(function (p) {
                (byDay[p.day_index] = byDay[p.day_index] || []).push(p);
            });
        }
        var cols = days().map(function (d, i) {
            var n = Math.max(0, +d.n || 0);
            var pins = (d.pins || []).filter(function (p) { return !!p; }).length;
            var stat = '';
            if (byDay) {
                var dps = byDay[i] || [];
                n = dps.length;
                if (n) {
                    var pub = dps.filter(function (p) { return p.publish_status === 'published'; }).length;
                    var q = dps.some(function (p) {
                        return p.publish_status === 'queued' || p.publish_status === 'publishing';
                    });
                    if (pub === n) stat = ' d-sent';
                    else if (pub > 0) stat = ' d-part';
                    else if (q) stat = ' d-q';
                }
            }
            var cls = 'cp-qcol' + stat;
            if (!n) cls += ' off';
            else if (!byDay && pins) cls += ' pinned';
            if (busy[i]) cls += ' ad';
            if (hist && i === best && max > 0) cls += ' best';
            var mid = '';
            if (hist) {
                var v = hist[i].views || 0;
                var vs = v ? numExact(v) : '—';
                var dl = '—';
                var dcls = 'dn';
                if (v && avg) {
                    var dp = Math.round((v - avg) / avg * 100);
                    dcls = dp >= 0 ? 'up' : 'dn';
                    dl = (dp >= 0 ? '▲' : '▼') + Math.abs(dp) + '%';
                }
                var w = (max && v) ? Math.max(6, Math.round(v / max * 100)) : 0;
                mid = '<span class="cp-qv' + (vs.length > 5 ? ' sm' : '') + '">' + esc(vs) + '</span>' +
                    '<span class="cp-qd ' + dcls + '">' + dl + '</span>' +
                    '<span class="cp-qbar">' + (w ? '<i style="width:' + w + '%"></i>' : '') + '</span>';
            }
            var act = '';
            if (frozen !== 'dead') {
                act = frozen ? ' data-act="wkday" data-day="' + i + '"'
                             : ' data-act="pickday" data-day="' + i + '"';
            }
            return '<div class="' + cls + '"' + act + '>' +
                '<span class="cp-qwd">' + esc(T(WD[i])) + '</span>' + mid +
                '<span class="cp-qn">' + (stat ? '<i class="qdot"></i>' : '') +
                '<b>' + (n || '—') + '</b></span></div>';
        }).join('');
        return qbHead() + '<div class="cp-qb' + (hist ? '' : ' nohist') + '">' + cols + '</div>' + qbNote();
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
            '<b>' + esc(numExact(t.strong_views)) + '</b> ' +
            esc(T('против') + ' ' + numExact(t.weak_views) + ' (' + T(WD[t.weak]) + '). ' +
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
        var g = goalTitle(_goal);
        var lang = (typeof window.getLang === 'function') ? window.getLang() : 'ru';
        return lang === 'ru' ? g.toLowerCase() : g;
    }


    function weekBar() {
        var total = totalPosts();
        var w = wallet();
        var price = priceDay() * total;
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

    function reviewEntry() {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid || !_review) return '';
        var r = _review;
        var need = r.need || 30;
        var have = r.posts || 0;
        var v = r.views || {};
        var inProgress = !r.ready || v.change_pct == null;
        var goRow = '<span class="cp-rv2-go">' + esc(T('Открыть разбор канала')) +
            ' <i class="ti ti-arrow-right"></i></span>';
        if (inProgress) {
            var pct = Math.min(1, need ? have / need : 0);
            var C = 194.8;
            var left = Math.max(1, need - have);
            var big = r.median_views
                ? '<span class="cp-rv2-big"><b>' + esc(numShort(r.median_views)) + '</b><span>' +
                  esc(T('охват Ø')) + '</span></span>'
                : '';
            return '<button class="cp-rv2" data-act="review">' +
                '<span class="cp-rv2-row">' +
                '<span class="cp-rv2-ring"><svg width="74" height="74" viewBox="0 0 74 74">' +
                '<circle cx="37" cy="37" r="31" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="6"/>' +
                '<circle cx="37" cy="37" r="31" fill="none" stroke="url(#cpRvG)" stroke-width="6" ' +
                'stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' +
                Math.round(C * (1 - pct) * 10) / 10 + '" transform="rotate(-90 37 37)"/>' +
                '<defs><linearGradient id="cpRvG" x1="0" y1="0" x2="1" y2="1">' +
                '<stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#818cf8"/>' +
                '</linearGradient></defs></svg>' +
                '<span class="in"><b>' + have + '/' + need + '</b><span>' + esc(T('замеров')) + '</span></span></span>' +
                '<span class="cp-rv2-tx"><b>' +
                esc(T(pct >= 0.5 ? 'Вердикт почти готов' : 'Собираю замеры')) + '</b>' +
                '<em>' + esc(T('Ещё %1 — и покажу, что менять в контенте.').replace('%1',
                    left + ' ' + T(plural3(left, 'замеренный пост', 'замеренных поста', 'замеренных постов')))) +
                '</em></span>' + big + '</span>' + goRow + '</button>';
        }
        var tone = r.mood === 'drop' ? ' drop' : (r.mood === 'rise' ? ' rise' : '');
        var num = (v.change_pct > 0 ? '+' : '') + v.change_pct + '%';
        return '<button class="cp-rv2" data-act="review">' +
            '<span class="cp-rv2-verd' + tone + '">' +
            '<i class="vi ti ti-' + (r.mood === 'drop' ? 'trending-down' : (r.mood === 'rise' ? 'trending-up' : 'chart-dots')) + '"></i>' +
            '<span class="tx"><b>' + esc(T(r.head || 'Разбор канала')) + '</b>' +
            '<em>' + esc(T('по') + ' ' + (r.posts || 0) + ' ' +
                T(plural3(r.posts || 0, 'посту', 'постам', 'постам')) + ' · ' +
                T('что менять — внутри')) + '</em></span>' +
            '<span class="pc">' + esc(num) + '</span></span>' + goRow + '</button>';
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
        var back = '<button class="cp-allbtn back" data-act="revback">' +
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
                  var ic = { ruler: 'ti-ruler-2', clock: 'ti-clock', hook: 'ti-quote',
                             layers: 'ti-stack-2' }[a.icon] || 'ti-bulb';
                  return '<div class="cp-actc"><i class="ti ' + ic + '"></i>' +
                      '<span class="tx"><b>' + esc(a.title) + '</b>' +
                      '<em>' + esc(a.why) + '</em></span></div>';
              }).join('') + '</div>'
            : '';

        var base = '<div class="cp-revbase"><i class="ti ti-info-circle"></i><span>' +
            esc(T('Основано на') + ' ' + (r.posts || 0) + ' ' +
                T(plural3(r.posts || 0, 'посте', 'постах', 'постах')) + '. ' +
                T('Сравниваются твои сильные посты со слабыми — не с чужими каналами.') + ' ' +
                T('Посты моложе 3 дней в сравнение не входят — они ещё набирают просмотры.')) +
            '</span></div>';

        var spanName = (r.span_days === 90) ? T('за 90 дней')
            : (r.span_days === 365) ? T('за год') : T('всё время канала');
        var chips = '<div class="cp-lchips"><span class="cp-lchip on">' +
            esc(T('зрелые посты · старше 3 дней')) + '</span>' +
            '<span class="cp-lchip">' + esc(T('выборка:') + ' ' + spanName) + '</span></div>';

        setView('<div class="cp-verdict' + tone + '">' +
            '<div class="cp-veye">' + esc(T('Разбор за') + ' ' + (r.window_days || 21) + ' ' +
                T('дней')) + '</div>' +
            '<h2>' + esc(T(r.head || '')) + '</h2>' + kpi + spark + shifts + '</div>' +
            '<div class="cp-sec">' + secHead('Твои сильные против слабых',
                'Сравниваются верхние и нижние двадцать процентов постов канала.') +
            chips +
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
                '<p>' + esc(T('Канал на паузе — публикация не проходит.')) + '</p>' +
                '<div class="cp-hero-week">' + weekCells('dead') + '</div>' +
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

    function dayTimes(i) { return ((days()[i] || {}).times || []).slice(); }

    function setTime(i, k, at) {
        var d = days().slice();
        var t = dayTimes(i);
        while (t.length <= k) t.push('');
        t[k] = at || '';
        while (t.length && !t[t.length - 1]) t.pop();
        d[i] = { n: dayN(i), pins: dayPins(i), times: t, topics: dayTopics(i) };
        _days = d;
    }

    function dropSlot(i, k) {
        var n = dayN(i);
        if (n <= 0) return false;
        if (totalPosts() - 1 < MIN_POSTS) {
            toast(T('В неделе не может быть меньше трёх постов'));
            return false;
        }
        var pins = dayPins(i), t = dayTimes(i), tp = dayTopics(i), d = days().slice();
        if (k < pins.length) pins.splice(k, 1);
        if (k < t.length) t.splice(k, 1);
        if (k < tp.length) tp.splice(k, 1);
        d[i] = { n: n - 1, pins: pins, times: t, topics: tp };
        _days = d;
        shiftCleared(i, k, n - 1);
        return true;
    }

    function shiftCleared(i, k, n) {
        var out = {};
        Object.keys(_topicCleared).forEach(function (key) {
            var parts = key.split('_');
            var di = +parts[0], dk = +parts[1];
            if (di !== i) { out[key] = 1; return; }
            if (dk === k) return;
            var nk = dk > k ? dk - 1 : dk;
            if (nk < n) out[di + '_' + nk] = 1;
        });
        _topicCleared = out;
    }

    function setPin(i, k, key) {
        var d = days().slice();
        var pins = dayPins(i);
        while (pins.length <= k) pins.push('');
        pins[k] = key || '';
        while (pins.length && !pins[pins.length - 1]) pins.pop();
        d[i] = { n: dayN(i), pins: pins, times: dayTimes(i), topics: dayTopics(i) };
        _days = d;
    }

    function rubOf(key) {
        for (var i = 0; i < _rubrics.length; i++) if (_rubrics[i].key === key) return _rubrics[i];
        return null;
    }

    function daySlots(i) {
        var got = ((_cal && _cal.slots) || {})[String(i)] || [];
        var soon = ((_cal && _cal.preview) || {})[String(i)] || [];
        var n = dayN(i), pins = dayPins(i), out = [];
        var byPlan = got.length === n;
        for (var k = 0; k < n; k++) {
            var g = got[k] || {};
            var s = byPlan ? g : (soon[k] || g || {});
            var at = byPlan ? g.at : ((soon[k] || {}).at || g.at || null);
            out.push({
                seq: k, at: at || null, views: g.views, manual: !!(dayTimes(i)[k]),
                conf: s.conf || 'low',
                key: (pins[k] || null) || (g.rubric || null),
                pinned: !!pins[k]
            });
        }
        return out;
    }

    function slotRow(i, sl) {
        var r = sl.key ? rubOf(sl.key) : null;
        var cls = 'cp-slot' + (r ? (r.needs_fact ? ' fact' : '') : ' auto');
        var title = r ? r.title : (sl.key ? sl.key : T('Рубрика — из включённых'));
        var _tpc = dayTopics(i)[sl.seq] || '';
        var sub = _tpc ? ('📌 ' + _tpc)
            : r ? (r.needs_fact ? T('спрошу пару строк за день до выхода') : (r.about || ''))
                    : T('распределится при сборке');
        var power = (sl.views != null && sl.views > 0) ? sl.views
            : ((r && r.avg_views) ? r.avg_views : 0);
        return '<div class="cp-slotrow"><button class="' + cls + '" data-slot="' + sl.seq + '">' +
            '<span class="tm tmb' + (sl.manual ? ' man' : '') + '">' + esc(sl.at || '—') +
            '<i class="ti ti-pencil"></i></span>' +
            '<span class="tx"><b>' + esc(title) + '</b>' +
            (sub ? '<em>' + esc(sub) + '</em>' : '') + '</span>' +
            (power ? '<span class="pw">' + esc(numExact(power)) + '</span>' : '') +
            '<i class="ti ti-chevron-right ch"></i></button>' +
            '<button class="cp-slotx" data-drop="' + sl.seq + '" aria-label="' +
            esc(T('Убрать пост')) + '"><i class="ti ti-x"></i></button></div>';
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
            return { at: sl.at || '99:99', html: slotRow(i, sl) };
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

    function timePicker(i, k) {
        var cur = dayTimes(i)[k] || '';
        var hours = '';
        for (var h = 8; h <= 22; h++) {
            var hh = (h < 10 ? '0' : '') + h;
            hours += '<button class="cp-th' + (cur.slice(0, 2) === hh ? ' on' : '') +
                '" data-hour="' + hh + '">' + hh + '</button>';
        }
        var mins = ['00', '15', '30', '45'].map(function (m) {
            return '<button class="cp-tm' + (cur.slice(3) === m ? ' on' : '') +
                '" data-min="' + m + '">:' + m + '</button>';
        }).join('');
        return '<div class="cp-dss">' + esc(T('Время выхода')) + '</div>' +
            '<button class="cp-dsr wide' + (cur ? '' : ' on') + '" data-hour="">' +
            '<i class="ti ti-wand"></i><span class="tx"><b>' +
            esc(T('Время подберёт система')) + '</b>' +
            '<em>' + esc(T('по лучшим часам канала')) + '</em></span>' +
            (cur ? '' : '<i class="ti ti-check ck"></i>') + '</button>' +
            '<div class="cp-tgrid">' + hours + '</div>' +
            '<div class="cp-trow">' + mins + '</div>' +
            '<div class="cp-dssep"></div>';
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
                (r.avg_views ? '<span class="pw"><i class="ti ti-eye"></i>' +
                    esc(numExact(r.avg_views)) + '</span>' : '') +
                (on ? '<i class="ti ti-check ck"></i>' : '') + '</button>';
        }).join('');
        var off = _rubrics.filter(function (r) { return r.disabled; }).length;
        var curTopic = dayTopics(i)[k] || '';
        return timePicker(i, k) +
            '<div class="cp-dss">' + esc(T('Своя тема поста')) + '</div>' +
            '<input class="cp-topic-in" data-slot-topic maxlength="200" ' +
            'placeholder="' + esc(T('Например: «Магний глицинат — когда работает». Пусто — тему придумает сборка')) + '" ' +
            'value="' + esc(curTopic) + '" data-di="' + i + '" data-dk="' + k + '">' +
            (curTopic ? '<div class="cp-dshint">' +
                esc(T('Пост этого дня выйдет ровно на эту тему.')) + '</div>' : '') +
            '<div class="cp-dssep"></div>' +
            '<div class="cp-dss">' + esc(T('Рубрика')) + '</div>' +
            '<button class="cp-dsr wide' + (cur ? '' : ' on') + '" data-setpin="">' +
            '<i class="ti ti-wand"></i><span class="tx"><b>' +
            esc(T('Рубрика — из включённых')) + '</b>' +
            '<em>' + esc(T('распределится при сборке')) + '</em></span>' +
            (cur ? '' : '<i class="ti ti-check ck"></i>') + '</button>' +
            '<div class="cp-dssep"></div>' +
            (live.length ? rows
                : '<div class="cp-dsnote">' + esc(T('Рубрики ещё не определены.')) + '</div>') +
            (off ? '<div class="cp-dshint">' +
                esc(T('Ещё') + ' ' + off + ' ' +
                    T(plural3(off, 'рубрика выключена', 'рубрики выключены', 'рубрик выключено')) +
                    '. ' + T('Включить их можно в блоке «Рубрики канала» под календарём.')) +
                '</div>' : '');
    }

    function pickDay(i) {
        haptic('light');
        var host = document.getElementById('cp-daybox');
        if (host) { _dayDraw = null; host.remove(); }
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
                    (views ? '<span>' + esc(numExact(views) + ' ' + T('просмотров') + ' · ' +
                        T('по') + ' ' + hd.posts + ' ' +
                        T(plural3(hd.posts, 'посту', 'постам', 'постам'))) + '</span>' : '') +
                    '</div>';
                var _hl = hoursHintLine();
                sub = _hl ? '<div class="cp-dss">' + esc(_hl) + '</div>' : '';
                body = daySheetBody(i);
            } else {
                head = '<div class="cp-dsh2"><b>' + esc(T('Рубрика поста')) + '</b></div>';
                sub = '<div class="cp-dss">' + esc(T(WD_FULL[i]) + ' · ' + T('пост') + ' ' +
                    (slot + 1) + '. ' + T('Рубрика задаёт тип поста, а тему система подберёт ' +
                        'под сюжет недели. Цифра — сколько такие посты обычно набирают.')) +
                    '</div>';
                body = slotSheetBody(i, slot);
            }
            host.innerHTML = '<div class="cp-dsheet">' +
                '<div class="cp-dsgrab"></div>' + head + sub + body + '</div>';
        };
        draw();
        _dayDraw = draw;
        document.body.appendChild(host);
        requestAnimationFrame(function () { host.classList.add('vis'); });

        host.addEventListener('click', function (e) {
            var t = e.target;
            var cnt = t.closest ? t.closest('[data-dayn]') : null;
            if (cnt) {
                if (setDayN(i, +cnt.getAttribute('data-dayn'))) {
                    haptic('light'); slot = null; draw(); renderBrief();
                    loadCalendarSoon(); saveDaysSoon();
                }
                return;
            }
            var rm = t.closest ? t.closest('[data-drop]') : null;
            if (rm) {
                if (dropSlot(i, +rm.getAttribute('data-drop'))) {
                    haptic('medium'); slot = null; draw(); renderBrief();
                    loadCalendarSoon(); saveDaysSoon();
                }
                return;
            }
            var sl = t.closest ? t.closest('[data-slot]') : null;
            if (sl) { haptic('light'); slot = +sl.getAttribute('data-slot'); draw(); return; }
            var hb = t.closest ? t.closest('[data-hour]') : null;
            if (hb && slot !== null) {
                var hv = hb.getAttribute('data-hour');
                if (!hv) setTime(i, slot, '');
                else setTime(i, slot, hv + ':' + ((dayTimes(i)[slot] || '').slice(3) || '00'));
                haptic('light'); draw(); renderBrief(); loadCalendarSoon(); saveDaysSoon();
                return;
            }
            var mb = t.closest ? t.closest('[data-min]') : null;
            if (mb && slot !== null) {
                var base = (dayTimes(i)[slot] || '').slice(0, 2) ||
                    ((daySlots(i)[slot] || {}).at || '12:00').slice(0, 2);
                setTime(i, slot, base + ':' + mb.getAttribute('data-min'));
                haptic('light'); draw(); renderBrief(); loadCalendarSoon(); saveDaysSoon();
                return;
            }
            var sp = t.closest ? t.closest('[data-setpin]') : null;
            if (sp && slot !== null) {
                setPin(i, slot, sp.getAttribute('data-setpin'));
                haptic('light'); slot = null; draw(); renderBrief(); saveDaysSoon();
                return;
            }
            if (e.target === host) { _dayDraw = null; host.remove(); }
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

    function deviceTz() {
        try { return -(new Date().getTimezoneOffset()); } catch (e) { return null; }
    }

    var _calTimer = null;
    var _daysTimer = null;
    var _daysDirty = false;
    var _varTimer = null;

    function saveDaysSoon() {
        _daysDirty = true;
        if (_daysTimer) clearTimeout(_daysTimer);
        _daysTimer = setTimeout(function () {
            _daysTimer = null;
            var cid = _chId || (_state && _state.channel_id);
            apiRequest('/api/v1/content-plan/days', {
                method: 'POST',
                body: JSON.stringify({ channel_id: cid, days: days(), goal: _goal })
            }).then(function (r) {
                if (r && r.ok && !_daysTimer) _daysDirty = false;
            }).catch(function () {});
        }, 600);
    }

    var _dayDraw = null;
    var _cover = null;

    function loadCalendarSoon() {
        if (_calTimer) clearTimeout(_calTimer);
        _calTimer = setTimeout(function () { _calTimer = null; loadCalendar(); }, 450);
    }

    function loadCalendar() {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid) return;
        var tz = deviceTz();
        var shape = days().map(function (d) { return Math.max(0, +d.n || 0); }).join(',');
        apiRequest('/api/v1/content-plan/calendar?channel_id=' + cid + '&n=' + shape +
                   (tz == null ? '' : '&tz=' + tz))
            .then(function (r) {
                if (!r || !r.ok) return;
                if ((_chId || (_state && _state.channel_id)) !== r.channel_id) return;
                _cal = r;
                if (_dayDraw && document.getElementById('cp-daybox')) _dayDraw();
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

    function thesisSplit(title) {
        var words = title.split(' ');
        if (words.length < 4) return [title, '', ''];
        var m = null, re = /[:,\u2014\u2013-]\s+/g, mm;
        while ((mm = re.exec(title)) !== null) m = mm;
        if (m) {
            var head = title.slice(0, m.index + 1).replace(/\s+$/, '');
            var tail = title.slice(m.index + m[0].length).trim();
            var tw = tail.split(' ');
            if (tw.length >= 2 && tw.length <= 8) return [head, tail, ''];
        }
        var cut = Math.max(2, words.length - 3);
        return [words.slice(0, cut).join(' '), words.slice(cut).join(' '), ''];
    }

    function goalTitle(g) {
        return String(g || '').split('+').map(function (x) {
            return T(GOAL_MAP[x] || x);
        }).filter(Boolean).join(' + ');
    }

    function weekDaySheet(i) {
        var host = document.getElementById('cp-daybox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-daybox';
        host.className = 'cp-dsov' + (canEdit() ? '' : ' cp-vonly');
        var timeFor = null;
        var dayPosts = function () {
            return ((_state && _state.posts) || []).filter(function (p) {
                return p.day_index === i;
            }).sort(function (a, b) { return (a.slot_hm || '').localeCompare(b.slot_hm || ''); });
        };
        var draw = function () {
            var ps = dayPosts();
            var body;
            if (timeFor !== null) {
                var tp = post(timeFor) || {};
                var cur = tp.slot_hm || '';
                var hours = '';
                for (var h = 8; h <= 22; h++) {
                    var hh = (h < 10 ? '0' : '') + h;
                    hours += '<button class="cp-th' + (cur.slice(0, 2) === hh ? ' on' : '') +
                        '" data-whour="' + hh + '">' + hh + '</button>';
                }
                var mins = ['00', '15', '30', '45'].map(function (m) {
                    return '<button class="cp-tm' + (cur.slice(3) === m ? ' on' : '') +
                        '" data-wmin="' + m + '">:' + m + '</button>';
                }).join('');
                body = '<div class="cp-dss">' + esc(T('Время выхода')) + ' · ' +
                    esc((tp.title || '').slice(0, 40)) + '</div>' +
                    '<div class="cp-tgrid">' + hours + '</div>' +
                    '<div class="cp-trow">' + mins + '</div>' +
                    '<button class="cp-dsr wide" data-wback="1"><i class="ti ti-arrow-left"></i>' +
                    '<span class="tx"><b>' + esc(T('Назад к дню')) + '</b></span></button>';
            } else {
                var rows = ps.map(function (p) {
                    var st = statusOf(p);
                    var fixed = p.publish_status === 'published' ||
                        p.publish_status === 'publishing' || p.publish_status === 'queued';
                    return '<div class="cp-slotrow">' +
                        '<button class="cp-slot" data-goto="' + p.id + '">' +
                        (fixed
                            ? '<span class="tm">' + esc(p.slot_hm || '—') + '</span>'
                            : '<span class="tm man tmb" data-wtime="' + p.id + '">' +
                              esc(p.slot_hm || '—') + '<i class="ti ti-pencil"></i></span>') +
                        '<span class="tx"><b>' + esc((p.title || '').slice(0, 60)) + '</b>' +
                        '<em>' + esc(T(st[0])) + '</em></span>' +
                        '<i class="ti ti-chevron-right ch"></i></button>' +
                        (fixed
                            ? '<span class="cp-slotx lk"><i class="ti ti-lock"></i></span>'
                            : '<button class="cp-slotx" data-wdel="' + p.id + '" aria-label="' +
                              esc(T('Убрать пост')) + '"><i class="ti ti-x"></i></button>') +
                        '</div>';
                }).join('') || '<div class="cp-dsnote">' + esc(T('В этом дне постов нет.')) + '</div>';
                var full = ps.length >= MAX_PER_DAY;
                var _hl2 = hoursHintLine();
                body = (_hl2
                    ? '<div class="cp-dss">' + esc(_hl2) + '</div>'
                    : '<div class="cp-dss">' + esc(T('Нажми на время, чтобы изменить его. Пост откроется в ленте по нажатию.')) + '</div>') +
                    '<div class="cp-slots">' + rows + '</div>' +
                    '<div class="cp-addcol">' +
                    '<button class="cp-add2"' + (full ? ' disabled' : ' data-wadd="1"') + '>' +
                    '<i class="ti ti-sparkles"></i><span class="tx"><b>' + esc(T('Пост от ИИ')) + '</b>' +
                    '<em>' + esc(T('Тема сразу, текст и обложка следом.')) + '</em></span>' +
                    '<span class="pr">' + forgeTag(priceDay()) + '</span></button>' +
                    '<button class="cp-add2 own"' + (full ? ' disabled' : ' data-wown="1"') + '>' +
                    '<i class="ti ti-pencil"></i><span class="tx"><b>' + esc(T('Свой пост')) + '</b>' +
                    '<em>' + esc(ownDayNote(i)) + '</em></span>' +
                    '<span class="pr">' + forgeTag(0) + '</span></button></div>' +
                    (full ? '<div class="cp-dshint">' + esc(T('В этом дне уже максимум постов.')) + '</div>' : '');
            }
            var hd = (histDays() || [])[i] || {};
            var views = dayViews(i);
            host.innerHTML = '<div class="cp-dsheet"><div class="cp-dsgrab"></div>' +
                '<div class="cp-dsh2"><b>' + esc(T(WD_FULL[i])) + '</b>' +
                (views ? '<span>' + esc(numExact(views) + ' ' + T('просмотров') + ' · ' +
                    T('по') + ' ' + hd.posts + ' ' +
                    T(plural3(hd.posts, 'посту', 'постам', 'постам'))) + '</span>' : '') +
                '</div>' + body + '</div>';
        };
        draw();
        document.body.appendChild(host);
        requestAnimationFrame(function () { host.classList.add('vis'); });
        var sendTime = function (hm) {
            var pid = timeFor;
            apiRequest('/api/v1/content-plan/post-time',
                       { method: 'POST', body: JSON.stringify({ post_id: pid, hm: hm }) })
                .then(function (r) {
                    if (r && r.ok) {
                        var p = post(pid);
                        if (p) p.slot_hm = r.slot_hm;
                        haptic('light');
                        timeFor = null;
                        draw();
                        renderWeek();
                    } else if (r && r.error === 'already_out') {
                        toast(T('Пост уже в очереди — сначала сними неделю с выхода'));
                    } else toast(T('Не удалось изменить время'));
                })
                .catch(function () { toast(T('Не удалось изменить время')); });
        };
        host.addEventListener('click', function (e) {
            var t = e.target;
            if (!canEdit() && t.closest &&
                t.closest('[data-wtime],[data-whour],[data-wmin],[data-wdel],[data-wadd],[data-wown]')) {
                denyEdit();
                return;
            }
            var wt = t.closest ? t.closest('[data-wtime]') : null;
            if (wt) {
                haptic('light');
                timeFor = +wt.getAttribute('data-wtime');
                draw();
                return;
            }
            if (t.closest && t.closest('[data-wback]')) {
                timeFor = null;
                draw();
                return;
            }
            var wh = t.closest ? t.closest('[data-whour]') : null;
            if (wh && timeFor !== null) {
                var tp2 = post(timeFor) || {};
                sendTime(wh.getAttribute('data-whour') + ':' + ((tp2.slot_hm || '12:00').slice(3) || '00'));
                return;
            }
            var wm = t.closest ? t.closest('[data-wmin]') : null;
            if (wm && timeFor !== null) {
                var tp3 = post(timeFor) || {};
                sendTime(((tp3.slot_hm || '12:00').slice(0, 2)) + ':' + wm.getAttribute('data-wmin'));
                return;
            }
            var del = t.closest ? t.closest('[data-wdel]') : null;
            if (del) {
                haptic('medium');
                var did = +del.getAttribute('data-wdel');
                apiRequest('/api/v1/content-plan/delete-post',
                           { method: 'POST', body: JSON.stringify({ post_id: did }) })
                    .then(function (r) {
                        if (r && r.ok) {
                            _state.posts = (_state.posts || []).filter(function (p) {
                                return p.id !== did;
                            });
                            draw();
                            renderWeek();
                        } else toast(T('Этот пост уже в очереди — сначала сними неделю с выхода'));
                    })
                    .catch(function () { toast(T('Не удалось удалить пост')); });
                return;
            }
            if (t.closest && t.closest('[data-wown]')) {
                haptic('light');
                host.remove();
                openOwnSheet(i);
                return;
            }
            if (t.closest && t.closest('[data-wadd]')) {
                haptic('medium');
                host.remove();
                toast(T('Придумываю тему...'));
                apiRequest('/api/v1/content-plan/add-post',
                           { method: 'POST',
                             body: JSON.stringify({ channel_id: _chId, day_index: i }) })
                    .then(function (r) {
                        if (r && r.ok) {
                            toast(T('Добавлено:') + ' ' + (r.title || ''));
                            refreshState();
                            startBatchPoll();
                        } else if (r && r.error === 'day_full') {
                            toast(T('В этом дне уже максимум постов'));
                        } else toast(T('Не удалось добавить пост'));
                    })
                    .catch(function () { toast(T('Не удалось добавить пост')); });
                return;
            }
            var go = t.closest ? t.closest('[data-goto]') : null;
            if (go && !(t.closest && t.closest('[data-wdel]'))) {
                _selDay = i;
                host.remove();
                renderWeek();
                requestAnimationFrame(function () {
                    var el = document.querySelector('.cp-day.sel');
                    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth',
                        block: 'nearest', inline: 'center' });
                });
                return;
            }
            if (e.target === host) host.remove();
        });
    }


    var WD_IN = ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'];
    var OWN_LIMITS = { 'image/jpeg': 8, 'image/png': 8, 'image/webp': 8, 'image/gif': 12, 'video/mp4': 40, 'video/quicktime': 40 };
    var _own = null;
    var _ownWeekBusy = false;

    function ownDate(i) { return ((_state && _state.week_dates) || [])[i] || ''; }
    function ownIsToday(i) { return !!(_state && _state.today_index === i); }
    function ownDayNote(i) {
        var when = T('Выйдет') + ' ' + T(WD_IN[i]) +
            (ownIsToday(i) ? ' — ' + T('сегодня') : (ownDate(i) ? ', ' + dateLabel(ownDate(i)) : '')) + '. ';
        return when + T('Текст, время выхода и вложение (фото, GIF или видео) задаёшь сам.');
    }
    function ownChanNow() {
        var shift = (tzMin() != null) ? (tzMin() - deviceTz()) : 0;
        var d = new Date(Date.now() + shift * 60000);
        return [d.getHours(), d.getMinutes()];
    }
    function ownDefaultHm(i) {
        if (!ownIsToday(i)) return '12:00';
        var now = ownChanNow();
        var mins = now[0] * 60 + now[1] + 20;
        mins = Math.ceil(mins / 15) * 15;
        if (mins < 8 * 60) mins = 8 * 60;
        if (mins > 22 * 60 + 45) return '';
        var h = Math.floor(mins / 60), m = mins % 60;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }
    function ownPast(i, hm) {
        if (!ownIsToday(i) || !hm) return false;
        var now = ownChanNow();
        return (+hm.slice(0, 2)) * 60 + (+hm.slice(3)) <= now[0] * 60 + now[1] + 1;
    }

    function doOwnWeek() {
        if (_ownWeekBusy || !_chId) return;
        _ownWeekBusy = true;
        haptic('medium');
        apiRequest('/api/v1/content-plan/week/manual',
                   { method: 'POST',
                     body: JSON.stringify({ channel_id: _chId, lang: (window.getLang ? window.getLang() : 'ru') || 'ru',
                                            goal: _goal || 'engagement' }) })
            .then(function (r) {
                _ownWeekBusy = false;
                if (r && r.ok) {
                    toast(T('Неделя создана — нажми на день, чтобы добавить пост'));
                    refreshState();
                } else if (r && r.error === 'has_plan') refreshState();
                else if (r && r.error === 'no_content_perm') denyEdit();
                else toast(T('Не удалось создать неделю'));
            })
            .catch(function () { _ownWeekBusy = false; toast(T('Не удалось создать неделю')); });
    }

    function ownErr(code) {
        var M = {
            past_time: 'Это время уже прошло — выбери позже.',
            day_full: 'В этом дне уже максимум постов',
            too_long: 'Длиннее 4096 знаков Telegram не примет — сократи.',
            no_bot_rights: 'Добавь @ForgeMetricsBot администратором канала с правом публикации — тогда посты смогут выходить сами.',
            paused: 'Канал на паузе — публикация не проходит.',
            no_plan: 'Неделя не найдена — открой контент-план заново',
            empty: 'Пустой текст не сохраняю',
            no_content_perm: 'Создатель канала не выдал тебе право менять контент-план',
            already_out: 'Пост уже в очереди — сначала сними его с очереди',
            upload: 'Файл не загрузился — пост сохранён черновиком без вложения.',
        };
        return T(M[code] || 'Не удалось сохранить пост');
    }

    function ownCoverFor(id) {
        if (_mediaBusy[id]) return;
        haptic('light');
        _mediaBusy[id] = T('Обложка в стиле канала');
        rerender();
        apiRequest('/api/v1/content-plan/own-cover', { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) {
                delete _mediaBusy[id];
                if (r && r.ok) {
                    var pp = post(id);
                    if (pp) { pp.media_kind = 'photo'; pp.media_url = r.url; }
                    toast(T('Обложка готова'));
                    refreshState();
                } else { toast(r && r.error === 'no_text' ? T('Сначала вставь текст — фраза на обложку берётся из него') : cap(r)); rerender(); }
            })
            .catch(function (err) { delete _mediaBusy[id]; toast(apiErrText(err, 'Не удалось нарисовать обложку')); rerender(); });
    }

    function openOwnSheet(i) {
        var old = document.getElementById('cp-daybox');
        if (old) old.remove();
        var host = document.createElement('div');
        host.id = 'cp-daybox';
        host.className = 'cp-dsov';
        var def = ownDefaultHm(i);
        _own = { day: i, text: '', hm: def, file: null, fileUrl: '', fileKind: '', postId: null,
                 coverUrl: '', busy: '', timeOpen: !def };
        var canQueue = !!(_state && _state.can_post);
        var sub = (ownIsToday(i) ? T('сегодня') : T(WD_FULL[i])) +
            (ownDate(i) ? ', ' + dateLabel(ownDate(i)) : '');
        host.innerHTML = '<div class="cp-dsheet own"><div class="cp-dsgrab"></div>' +
            '<div class="cp-dsh2"><b>' + esc(T('Свой пост')) + '</b><span class="mut">' + esc(sub) + '</span></div>' +
            '<div class="cp-own-lab">' + esc(T('Текст поста')) + '</div>' +
            '<textarea class="cp-own-ta" id="cp-own-ta" maxlength="4096" placeholder="' +
            esc(T('Вставь текст поста — он уйдёт в канал как написан')) + '"></textarea>' +
            '<div class="cp-own-cnt" id="cp-own-cnt"></div>' +
            '<div class="cp-own-lab">' + esc(T('Вложение')) + '</div>' +
            '<div id="cp-own-media"></div>' +
            '<div class="cp-own-lab">' + esc(T('Время выхода')) + '</div>' +
            '<div id="cp-own-time"></div>' +
            '<div class="cp-own-cta" id="cp-own-cta"></div></div>';
        var q = function (sel) { return host.querySelector(sel); };
        var drawCnt = function () {
            var el = q('#cp-own-cnt');
            if (!el) return;
            var n = _own.text.length;
            var hasMedia = !!(_own.file || _own.coverUrl);
            var over = hasMedia && n > 1024;
            el.className = 'cp-own-cnt' + (over ? ' warn' : '');
            el.innerHTML = '<span>' + esc(over
                ? T('Длиннее 1024 знаков — вложение уйдёт отдельным сообщением, текст следом.')
                : T('Текст уйдёт как есть, без разметки.')) + '</span>' +
                '<span>' + n + ' / ' + (hasMedia ? 1024 : 4096) + '</span>';
        };
        var drawMedia = function () {
            var el = q('#cp-own-media');
            if (!el) return;
            var lim = T('Фото до 8 МБ, GIF до 12 МБ, видео до 40 МБ');
            if (_own.busy && _own.busy.media) {
                el.innerHTML = '<div class="cp-own-row"><span class="cp-own-thumb"><div class="cp-spin sm"></div></span>' +
                    '<span class="tx"><b>' + esc(_own.busy.media) + '</b></span></div>';
                return;
            }
            if (_own.coverUrl || _own.file) {
                var isVid = _own.fileKind === 'video';
                var thumb = _own.coverUrl
                    ? '<img src="' + esc(_own.coverUrl) + '" alt="">'
                    : (isVid ? '<i class="ti ti-player-play"></i>' : '<img src="' + esc(_own.fileUrl) + '" alt="">');
                var name = _own.coverUrl ? T('Обложка в стиле канала')
                    : (_own.file.name || '') ;
                var kind = _own.coverUrl ? T('фраза из текста, палитра канала')
                    : (_own.fileKind === 'animation' ? 'GIF' : (isVid ? T('видео') : T('фото'))) +
                      ' · ' + (_own.file.size / 1048576).toFixed(1) + ' ' + T('МБ');
                el.innerHTML = '<div class="cp-own-row"><span class="cp-own-thumb">' + thumb + '</span>' +
                    '<span class="tx"><b>' + esc(name) + '</b><em>' + esc(kind) + '</em></span>' +
                    '<button class="act" data-oact="clear" type="button">' + esc(T('Убрать')) + '</button></div>' +
                    '<div class="cp-own-acts">' +
                    '<button class="cp-mrepl" data-oact="file" type="button"><i class="ti ti-upload"></i>' + esc(T('Заменить файлом')) + '</button>' +
                    '<button class="cp-mrepl" data-oact="cover" type="button"><i class="ti ti-photo"></i>' +
                    esc(T(_own.coverUrl ? 'Другая обложка' : 'Обложка в стиле канала')) + ' ' + forgeTag(coverPrice('cover_own')) + '</button></div>';
                return;
            }
            el.innerHTML = '<div class="cp-addcol" style="margin-top:0">' +
                '<button class="cp-add2" data-oact="file" type="button"><i class="ti ti-upload"></i><span class="tx"><b>' +
                esc(T('Файл с устройства')) + '</b><em>' + esc(lim) + '</em></span><span class="pr">' + forgeTag(0) + '</span></button>' +
                '<button class="cp-add2" data-oact="cover" type="button"><i class="ti ti-photo"></i><span class="tx"><b>' +
                esc(T('Обложка в стиле канала')) + '</b><em>' + esc(T('Если своей картинки нет: фраза из текста, палитра канала')) +
                '</em></span><span class="pr">' + forgeTag(coverPrice('cover_own')) + '</span></button></div>';
        };
        var drawTime = function () {
            var el = q('#cp-own-time');
            if (!el) return;
            var now = ownIsToday(i) ? ownChanNow() : null;
            var hm = _own.hm;
            var sub2 = (ownIsToday(i) ? T('Сегодня') : T(WD_FULL[i])) + ' · ' + T('время канала') + ' (' + tzLabel() + ')';
            var html = '<button class="cp-own-row" data-oact="time" type="button"><span class="ic"><i class="ti ti-clock"></i></span>' +
                '<span class="tx"><b>' + esc(hm || T('выбери время')) + '</b><em>' + esc(sub2) + '</em></span>' +
                '<span class="act">' + esc(T(_own.timeOpen ? 'Свернуть' : 'Изменить')) + '</span></button>';
            if (_own.timeOpen) {
                var hours = '';
                for (var h = 8; h <= 22; h++) {
                    var hh = (h < 10 ? '0' : '') + h;
                    var off = now && (h * 60 + 45 <= now[0] * 60 + now[1] + 1);
                    hours += '<button type="button" class="cp-th' + ((hm || '').slice(0, 2) === hh ? ' on' : '') + (off ? ' off' : '') +
                        '" data-ohour="' + hh + '">' + hh + '</button>';
                }
                var mins = ['00', '15', '30', '45'].map(function (m) {
                    var offm = now && hm && ((+hm.slice(0, 2)) * 60 + (+m) <= now[0] * 60 + now[1] + 1);
                    return '<button type="button" class="cp-tm' + ((hm || '').slice(3) === m ? ' on' : '') + (offm ? ' off' : '') +
                        '" data-omin="' + m + '">:' + m + '</button>';
                }).join('');
                html += '<div class="cp-tgrid">' + hours + '</div><div class="cp-trow">' + mins + '</div>';
                if (!hm) html += '<div class="cp-own-note">' + esc(T('На сегодня время вышло — выбери другой день.')) + '</div>';
            }
            el.innerHTML = html;
        };
        var drawCta = function () {
            var el = q('#cp-own-cta');
            if (!el) return;
            var ready = !!_own.text.trim() && !!_own.hm && !ownPast(i, _own.hm) && !_own.busy;
            var label = _own.busy ? (_own.busy.text || '') :
                (canQueue ? T('Запланировать на') + ' ' + _own.hm : T('Сохранить в план'));
            var note = canQueue
                ? T('Пост встанет в очередь недели и выйдет сам. До выхода его можно править или снять.')
                : T('Бот не подключён к каналу с правом публикации — пост сохранится в план без автовыхода.');
            el.innerHTML = '<button type="button" class="cp-go' + (canQueue ? ' grn' : '') + '" data-oact="save"' +
                (ready ? '' : ' disabled') + '>' + (_own.busy ? '<div class="cp-spin sm"></div> ' : '<i class="ti ti-' + (canQueue ? 'calendar-up' : 'device-floppy') + '"></i> ') +
                esc(label) + '</button><div class="cp-own-note">' + esc(note) + '</div>';
        };
        var setBusy = function (text, media) {
            _own.busy = text ? { text: text, media: media || '' } : '';
            drawMedia(); drawCta();
        };
        var upsert = function (queue) {
            return apiRequest('/api/v1/content-plan/own-post',
                              { method: 'POST',
                                body: JSON.stringify({ channel_id: _chId, post_id: _own.postId, day_index: i,
                                                       text: _own.text.trim(), hm: _own.hm, queue: !!queue }) })
                .then(function (r) {
                    if (!r || !r.ok) throw new Error((r && r.error) || 'save');
                    _own.postId = r.post_id;
                    return r;
                });
        };
        var upload = function (pid, f) {
            var fd = new FormData();
            fd.append('post_id', pid);
            fd.append('file', f);
            return apiRequest('/api/v1/content-plan/media', { method: 'POST', body: fd })
                .then(function (r) { if (!r || !r.ok) throw new Error('upload'); return r; });
        };
        var pick = function () {
            var inp = document.getElementById('cp-own-file');
            if (!inp) {
                inp = document.createElement('input');
                inp.type = 'file';
                inp.id = 'cp-own-file';
                inp.accept = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime';
                inp.style.display = 'none';
                document.body.appendChild(inp);
            }
            inp.onchange = function () {
                var f = inp.files && inp.files[0];
                inp.value = '';
                if (!f || !_own) return;
                var lim = OWN_LIMITS[f.type];
                if (!lim) { toast(T('Такой формат не подойдёт: нужна картинка, GIF или видео')); return; }
                var mb = f.size / 1048576;
                if (mb > lim) { toast(T('Файл') + ' ' + mb.toFixed(1) + ' ' + T('МБ — это больше предела в') + ' ' + lim + ' ' + T('МБ')); return; }
                _own.file = f;
                _own.fileKind = f.type === 'image/gif' ? 'animation' : (f.type.indexOf('video/') === 0 ? 'video' : 'photo');
                try { _own.fileUrl = URL.createObjectURL(f); } catch (e) { _own.fileUrl = ''; }
                _own.coverUrl = '';
                haptic('light');
                drawMedia(); drawCnt();
            };
            inp.click();
        };
        var makeCover = function () {
            if (!_own.text.trim()) { toast(T('Сначала вставь текст — фраза на обложку берётся из него')); return; }
            if (!_own.hm) { toast(T('Сначала выбери время выхода')); return; }
            setBusy(T('Рисую обложку...'), T('Рисую обложку...'));
            upsert(false)
                .then(function () {
                    return apiRequest('/api/v1/content-plan/own-cover', { method: 'POST', body: JSON.stringify({ post_id: _own.postId }) });
                })
                .then(function (r) {
                    if (!r || !r.ok) { setBusy(''); toast(cap(r)); return; }
                    _own.coverUrl = r.url; _own.file = null; _own.fileUrl = ''; _own.fileKind = '';
                    haptic('light');
                    setBusy(''); drawCnt();
                })
                .catch(function (err) { setBusy(''); toast(err && err.message && ownErr(err.message) !== T('Не удалось сохранить пост') ? ownErr(err.message) : apiErrText(err, 'Не удалось нарисовать обложку')); });
        };
        var clearMedia = function () {
            _own.file = null; _own.fileUrl = ''; _own.fileKind = '';
            if (_own.coverUrl && _own.postId) {
                _own.coverUrl = '';
                apiRequest('/api/v1/content-plan/media/clear', { method: 'POST', body: JSON.stringify({ post_id: _own.postId }) }).catch(function () {});
            }
            _own.coverUrl = '';
            drawMedia(); drawCnt();
        };
        var save = function () {
            if (_own.busy) return;
            haptic('medium');
            setBusy(T('Сохраняю...'));
            var hm = _own.hm;
            upsert(false)
                .then(function (r) {
                    if (!_own.file) return r;
                    setBusy(T('Загружаю файл...'), T('Загружаю файл...'));
                    return upload(_own.postId, _own.file);
                })
                .then(function () {
                    if (!canQueue) return { queued: false };
                    setBusy(T('Ставлю в очередь...'));
                    return upsert(true);
                })
                .then(function (r) {
                    host.remove(); _own = null;
                    toast(r && r.queued ? T('Пост запланирован на') + ' ' + hm : T('Пост сохранён в план'));
                    refreshState();
                })
                .catch(function (err) {
                    var code = (err && err.message) || '';
                    if (code === 'upload' && _own.postId) {
                        host.remove(); _own = null;
                        toast(ownErr('upload'));
                        refreshState();
                        return;
                    }
                    setBusy('');
                    toast(ownErr(code));
                });
        };
        host.addEventListener('click', function (e) {
            var t = e.target;
            var a = t.closest ? t.closest('[data-oact]') : null;
            if (a) {
                var oa = a.getAttribute('data-oact');
                if (oa === 'file') { pick(); return; }
                if (oa === 'cover') { makeCover(); return; }
                if (oa === 'clear') { haptic('light'); clearMedia(); return; }
                if (oa === 'time') { _own.timeOpen = !_own.timeOpen; drawTime(); return; }
                if (oa === 'save') { save(); return; }
                return;
            }
            var oh = t.closest ? t.closest('[data-ohour]') : null;
            if (oh) {
                _own.hm = oh.getAttribute('data-ohour') + ':' + ((_own.hm || '12:00').slice(3) || '00');
                if (ownPast(i, _own.hm)) {
                    var pickm = ['00', '15', '30', '45'].filter(function (m) { return !ownPast(i, _own.hm.slice(0, 2) + ':' + m); })[0];
                    if (pickm) _own.hm = _own.hm.slice(0, 2) + ':' + pickm;
                }
                haptic('light'); drawTime(); drawCta();
                return;
            }
            var om = t.closest ? t.closest('[data-omin]') : null;
            if (om) {
                _own.hm = ((_own.hm || '12:00').slice(0, 2)) + ':' + om.getAttribute('data-omin');
                haptic('light'); drawTime(); drawCta();
                return;
            }
            if (t === host) {
                var had = _own && _own.postId;
                host.remove(); _own = null;
                if (had) refreshState();
            }
        });
        host.addEventListener('input', function (e) {
            if (e.target && e.target.id === 'cp-own-ta') {
                _own.text = e.target.value || '';
                drawCnt(); drawCta();
            }
        });
        drawCnt(); drawMedia(); drawTime(); drawCta();
        document.body.appendChild(host);
        requestAnimationFrame(function () { host.classList.add('vis'); });
    }

    function buildChanBlock() {
        if (!_channels || !_channels.length) {
            return '<div class="cp-hint">' + esc(T('Канал не подключён — план соберётся в нейтральном стиле. Подключи канал, чтобы писать точно в его стиле.')) + '</div>';
        }
        if (_channels.length === 1) {
            var c = _channels[0]; _chId = c.id;
            return '<div class="cp-onechan"><div class="av" data-chav="' + c.id + '">' +
                esc((c.title || c.username || '?').charAt(0).toUpperCase()) + '</div>' +
                '<div class="nm"><b>' + esc(chanName(c)) + '</b><span>' +
                esc(chanSub(c)) + '</span></div></div>';
        }
        var cur = _channels.filter(function (c) { return c.id === _chId; })[0] || _channels[0];
        _chId = cur.id;
        var styleNote = cur.voice_status === 'done' ? 'стиль настроен' : 'стиль не настроен';
        return '<button class="cp-chanpick" data-act="pickchan">' +
            '<span class="av" data-chav="' + cur.id + '">' +
            esc((cur.title || cur.username || '?').charAt(0).toUpperCase()) + '</span>' +
            '<span class="nm"><b>' + esc(chanName(cur)) + '</b>' +
            '<span>' + esc(chanSub(cur) + ' · ' + T(styleNote)) + '</span></span>' +
            '<span class="sw">' + esc(T('сменить')) + '</span>' +
            '<i class="ti ti-chevron-down"></i></button>';
    }

    function chanName(c) {
        return c.title || (c.username ? '@' + c.username : T('Приватный канал'));
    }

    function chanSub(c) {
        return c.username ? '@' + c.username : T('приватный канал');
    }

    var GOAL_INFO = {
        growth: {
            posts: 'Неделя работает на пересылку и сохранение. Два поста собираю так, чтобы их хотелось отправить другу: разобранный миф, сравнение, которое переворачивает привычное, ошибка, которую делают почти все в твоей нише. Ещё один пишу для человека, который видит канал впервые, — чтобы он понял, зачем подписываться, не читая ничего до этого.',
            time: 'Часы беру из замеров канала. Пока замеров нет — обычные часы ниши.',
            when: 'Когда идёт трафик со стороны — реклама, взаимопиар, упоминания — и новых людей надо удержать первым же постом. Постоянные читатели неделю потерпят: для них это повтор пройденного.',
        },
        engagement: {
            posts: 'Посты заканчиваются не выводом, а вопросом, на который есть что ответить из своего опыта — не «а вы как думаете?», а конкретно. Один пост занимает позицию в споре, который в твоей аудитории идёт давно. Тон располагает возразить.',
            time: 'День, 11:00–16:00: в это время отвечают, а не только читают.',
            when: 'Когда под постами тихо и нужны комментарии и реакции — например, перед продажей рекламы. Учти: занятая позиция вызовет несогласие части аудитории. Если канал не готов к спорам в комментариях, это не та неделя.',
        },
        sales: {
            posts: 'Продаёт один пост, ближе к концу недели. До него — снятие возражений: дорого, не сработает, сделаю не так. Первый пост недели не продаёт вообще — он зарабатывает право продать позже. Цен, скидок и «только до пятницы» я не придумываю: если оффер в канале не описан, пост зовёт написать тебе в личные сообщения.',
            time: 'Вечер, 17:00–22:00: покупают после работы.',
            when: 'Когда есть что продавать и это описано в канале. Если продукта нет — неделя пройдёт впустую, лучше взять другую цель.',
        },
        warmup: {
            posts: 'Неделя идёт к событию, которого ещё не было. Каждый пост поднимает цену проблемы, которую твой запуск решит; последний обрывается на «продолжение на следующей неделе». Ничего не продаётся — только готовится почва.',
            time: 'Вечер, 17:00–22:00.',
            when: 'За неделю до запуска, анонса или открытия продаж. Если запуска потом не будет, аудитория запомнит обман — не бери эту цель «на всякий случай».',
        },
        retention: {
            posts: 'Один пост возвращается к теме, которую канал уже поднимал, — с тем, что изменилось с тех пор. Один — для тех, кто уже сделал по совету канала первый шаг: что дальше. Азы не повторяю: постоянный читатель их знает.',
            time: 'День, 11:00–16:00.',
            when: 'Когда отписок больше, чем подписок, или посты перестали дочитывать. Это неделя для своих; новичку часть постов будет непонятна — и это нормально.',
        },
    };
    var _goalInfo = null;
    function goalChips() {
        var goalSel = (_goal || 'engagement').split('+');
        var rec = goalRec();
        return GOALS.map(function (g) {
            var mb = (rec && g[0] === 'retention')
                ? '<span class="cp-rbdg dn">' + esc(T('рекомендация по замерам')) + '</span>' : '';
            var open = _goalInfo === g[0];
            var inf = GOAL_INFO[g[0]];
            return '<button class="cp-goal' + (goalSel.indexOf(g[0]) >= 0 ? ' on' : '') +
                (open ? ' qopen' : '') + '" data-chip="goal" data-v="' + g[0] + '">' +
                '<i class="ti ' + (GOAL_ICON[g[0]] || 'ti-target') + '"></i>' +
                '<span class="tx"><b>' + esc(T(g[1])) + mb + '</b>' +
                '<em>' + esc(T(g[2])) + '</em></span>' +
                '<span class="cp-goalq" data-act="goalinfo" data-v="' + g[0] + '" role="button" tabindex="0" aria-label="' +
                esc(T('Подробнее о цели')) + '">?</span></button>' +
                (open && inf
                    ? '<div class="cp-goalinfo">' +
                      '<div><b>' + esc(T('В постах')) + '</b>' + esc(T(inf.posts)) + '</div>' +
                      '<div><b>' + esc(T('Время')) + '</b>' + esc(T(inf.time)) + '</div>' +
                      '<div><b>' + esc(T('Когда выбирать')) + '</b>' + esc(T(inf.when)) + '</div>' +
                      (goalSel.length > 1
                        ? '<div class="two">' + esc(T('Выбраны две цели: посты недели делятся между ними, ' +
                            'а не тянут обе сразу.')) + '</div>' : '') +
                      '</div>'
                    : '');
        }).join('');
    }

    function goalRec() {
        var L = _state && _state.learning;
        if (!L || !L.ready) return null;
        var left = (L.members || {}).left || 0;
        return left > 0 ? { left: left } : null;
    }

    function goalRecNote() {
        var rec = goalRec();
        if (!rec) return '';
        return '<div class="cp-bfoot"><i class="ti ti-anchor"></i><span>−' + rec.left + ' ' +
            esc(T(plural3(rec.left, 'подписчик', 'подписчика', 'подписчиков')) + ' ' +
                T(_goalAuto
                    ? 'за неделю — по замерам выставлена цель «Удержание». Сменить можно нажатием.'
                    : 'за неделю — по замерам рекомендована цель «Удержание». Цель не переключается сама — выбор за тобой.')) +
            '</span></div>';
    }

    function hoursHintLine() {
        var H = _state && _state.learning && _state.learning.hours;
        if (H && (H.windows || []).length) {
            var ws = (H.windows || []).slice(0, 2).map(lrnWin).join(' · ');
            return T(H.mode === 'measured' ? 'Окна недели по замерам' : 'Окна недели на пробу') + ': ' + ws;
        }
        var bh = bestHours();
        if (!bh.length) return '';
        return T('Лучшие часы канала') + ': ' +
            bh.map(function (h) { return (h < 10 ? '0' : '') + h + ':00'; }).join(', ');
    }
    function lrnWin(w) {
        var p2 = function (h) { return (h < 10 ? '0' : '') + h; };
        return p2(w[0]) + ':00–' + p2(w[1]) + ':00';
    }

    function tzMin() {
        if (_state && _state.tz_min != null) return _state.tz_min;
        if (_cal && _cal.tz_min != null) return _cal.tz_min;
        return null;
    }

    function tzLabel() {
        var m = tzMin();
        if (m == null) return '';
        var s = m < 0 ? '−' : '+', a = Math.abs(m);
        var h = Math.floor(a / 60), mm = a % 60;
        return 'UTC' + s + h + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '');
    }

    function tzFootNote() {
        var l = tzLabel();
        return l ? esc(T('Время — по каналу') + ' (' + l + '). ') : '';
    }

    function slotHint(hm) {
        var tz = tzMin();
        if (tz == null || !hm) return '';
        var d = -new Date().getTimezoneOffset() - tz;
        if (Math.abs(d) < 30) return '';
        var p = String(hm).split(':');
        if (p.length < 2) return '';
        var raw = (+p[0]) * 60 + (+p[1]) + d;
        var mins = ((raw % 1440) + 1440) % 1440;
        var h = Math.floor(mins / 60), m2 = mins % 60;
        return ' · ' + T('у тебя') + ' ' + (h < 10 ? '0' : '') + h + ':' + (m2 < 10 ? '0' : '') + m2;
    }

    function lrnRow(iconCls, icon, title, why, pillCls, pill, extra) {
        return '<div class="cp-lrow">' +
            '<div class="cp-lrh"><span class="cp-lric ' + iconCls + '"><i class="ti ' + icon + '"></i></span>' +
            '<b>' + title + '</b>' +
            '<span class="cp-lpill ' + pillCls + '">' + esc(T(pill)) + '</span></div>' +
            '<div class="cp-lwhy">' + why + '</div>' + (extra || '') + '</div>';
    }

    function learningBlock(readOnly) {
        var L = _state && _state.learning;
        if (!L || !L.ready) return '';
        var rows = '';
        var f = L.freq;
        if (f && f.recommended) {
            var why = esc(T('Темп') + ' ' + f.tested + ' ' + T('в неделю совпал со спадом:'));
            var left = (L.members || {}).left || 0;
            if (left) why += ' −' + left + ' ' + esc(T(plural3(left, 'подписчик', 'подписчика', 'подписчиков')));
            if (L.change_pct != null && L.change_pct < 0) {
                why += (left ? ', ' : ' ') + L.change_pct + '% ' + esc(T('охвата на пост'));
            }
            why += '. ' + esc(T('Прежний темп') + ' ' + f.previous + ' ' + T('— застой канала.') + ' ' +
                T('Расчётная середина:') + ' ' + f.recommended + '.');
            var btn = (!readOnly && canEdit())
                ? (totalPosts() === f.recommended
                    ? '<div class="cp-lapplied"><i class="ti ti-check"></i> ' + esc(T('Применено к сетке недели')) + '</div>'
                    : '<button class="cp-lapply" data-act="applyfreq" data-n="' + f.recommended + '">' +
                      esc(T('Применить к сетке недели')) + '</button>')
                : '';
            if (!daysUneven()) {
                why += ' ' + esc(T('Дни для сокращённой недели ротируются от недели к неделе, ' +
                    'пока замеры не выделят сильные.'));
            }
            rows += lrnRow('amb', 'ti-stack-2',
                esc(f.recommended + ' ' + T(plural3(f.recommended, 'пост', 'поста', 'постов')) + ' ' +
                    T('в неделю вместо') + ' ' + Math.round(f.tested)),
                why, 'amb', 'рекомендация', btn);
        }
        var D = L.days;
        if (D && D.spread_pct != null) {
            var dPair = (D.best && D.worst)
                ? T('Лучший') + ' ' + T(WD[D.best.day]) + ' ' + numExact(D.best.views) + ' ' +
                  T('против худшего') + ' ' + T(WD[D.worst.day]) + ' ' + numExact(D.worst.views) +
                  ' — ' + T('разница') + ' ' + D.spread_pct + '%'
                : T('Разброс между днями') + ' ' + D.spread_pct + '%';
            if (D.verdict === 'strong') {
                rows += lrnRow('teal', 'ti-calendar-check',
                    esc(T('Сильные дни — по замерам')),
                    esc(dPair + '. ' + T('Раскладка недели учитывает сильные дни.')),
                    'teal', 'замер');
            } else if (D.verdict === 'even') {
                rows += lrnRow('vio', 'ti-calendar-stats',
                    esc(T('Дни одинаковы — повторный замер')),
                    esc(dPair + ' (' + T('замерено') + ' ' + D.covered + ' ' +
                        T(plural3(D.covered, 'день', 'дня', 'дней')) + '). ' +
                        T('Сильных дней нет — неделя снова раскладывается по всем дням.')),
                    'vio', 'проба');
            } else {
                rows += lrnRow('vio', 'ti-calendar-stats',
                    esc(T('Дни — продолжаю замер')),
                    esc(dPair + ' — ' + T('разница есть, но для вывода мало: порог 50%.') + ' ' +
                        T('Раскладка остаётся по всем дням.')),
                    'vio', 'проба');
            }
        }
        var H = L.hours || {};
        if ((H.windows || []).length) {
            var w1 = lrnWin(H.windows[0]);
            var w2 = H.windows[1] ? lrnWin(H.windows[1]) : '';
            if (H.mode === 'probe') {
                rows += lrnRow('vio', 'ti-clock',
                    esc(T(w2 ? 'Два окна времени — на пробу' : 'Окно времени — на пробу')),
                    esc(T('Замеров по часам пока мало — сравнить окна не по чему. Новая неделя разложит посты по окнам') +
                        ' ' + w1 + (w2 ? ' ' + T('и') + ' ' + w2 : '') + ' — ' +
                        T('к следующей неделе появится замер.')),
                    'vio', 'проба');
            } else {
                rows += lrnRow('teal', 'ti-clock',
                    esc(T('Окно времени — по замерам')),
                    esc(T('Лучший отклик у постов, вышедших в') + ' ' + w1 +
                        (w2 ? ' ' + T('и') + ' ' + w2 : '') + '. ' +
                        T('Расписание недели ставит посты в эти окна.')),
                    'teal', 'замер');
            }
        }
        if (L.length && L.length.chars) {
            rows += lrnRow('teal', 'ti-ruler-2',
                esc(T('Длина — около') + ' ' + numExact(L.length.chars) + ' ' + T('знаков')),
                esc(T('Медиана сильных зрелых постов канала. Передаётся в задание каждому посту недели.')),
                'teal', 'замер');
        }
        var OPN = { question: 'вопрос', number: 'цифра', quote: 'цитата', short: 'короткая фраза' };
        if (L.opener && OPN[L.opener.kind]) {
            rows += lrnRow('teal', 'ti-quote',
                esc(T('Первая строка —') + ' ' + T(OPN[L.opener.kind])),
                esc(T('Так начинались сильные посты канала. Правило передаётся в задание генерации.')),
                'teal', 'замер');
        }
        if (!rows) return '';
        var wkNo = L.week_no || 1;
        var head = (wkNo === 1)
            ? T('Неделя 1 — калибровка завершена')
            : T('Неделя') + ' ' + wkNo + ' — ' + T('замеры собраны');
        return '<div class="cp-lrn">' +
            '<div class="cp-lrn-h"><span class="cp-lrn-ic"><i class="ti ti-sparkles"></i></span>' +
            '<b>' + esc(head) + '</b>' +
            '<em>' + esc(L.measured + ' ' + T(plural3(L.measured, 'пост', 'поста', 'постов'))) + '</em></div>' +
            '<div class="cp-lrn-sub">' +
            esc(T('Каждый пост замерен на 1, 12, 24 и 48 часах после выхода. Выводы ниже включены в новую сборку.')) +
            '</div>' + rows +
            '<div class="cp-lrn-f"><i class="ti ti-bolt"></i><span>' +
            esc(T('Частота → сетка недели · окна → расписание публикаций · длина и первая строка → задание постов.')) +
            '</span></div></div>';
    }

    var GSEC_LS = 'fm_cp_gsec_v1';
    function gsecSt() { try { return JSON.parse(localStorage.getItem(GSEC_LS) || '{}'); } catch (e) { return {}; } }
    function gSec(id, ico, title, sum, body, defOpen, grn, plain) {
        if (!body) return '';
        var st = gsecSt();
        var open = (id in st) ? !!st[id] : !!defOpen;
        return '<div class="cpg-sec' + (open ? ' open' : '') + (plain ? ' plain' : '') + '" data-gsec="' + id + '">' +
            '<div class="cpg-h" data-act="gsec" data-v="' + id + '">' +
            '<i class="cpg-ic' + (grn ? ' gr' : '') + ' ti ti-' + ico + '"></i>' +
            '<b>' + esc(T(title)) + '</b>' +
            '<span class="cpg-sum">' + sum + '</span>' +
            '<i class="cpg-ch ti ti-chevron-down"></i></div>' +
            '<div class="cpg-b"><div class="cpg-bi">' + body + '</div></div></div>';
    }
    function isoWeek(d) {
        var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        var dn = (t.getUTCDay() + 6) % 7;
        t.setUTCDate(t.getUTCDate() - dn + 3);
        var f = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
        return 1 + Math.round(((t - f) / 86400000 - 3 + ((f.getUTCDay() + 6) % 7)) / 7);
    }
    var _cpwDay = null;
    function rubRecentOnce(r) {
        if (!r || (r.post_count || 0) > 1 || !r.last_at) return false;
        var age = Date.now() - Date.parse(r.last_at);
        return age >= 0 && age < 90 * 86400000;
    }
    function cpwSugTitles() {
        return cpwCandidates().filter(function (r) { return !rubRecentOnce(r); })
            .map(function (r) { return r.title; });
    }
    function cpwCandidates() {
        var live = (_rubrics || []).filter(function (r) {
            return r.title && !r.disabled && !r.needs_fact && !rubRecentOnce(r);
        });
        live.sort(function (a, b) { return (b.avg_views || 0) - (a.avg_views || 0); });
        var sug = (_rubrics || []).filter(function (r) {
            return r.title && r.disabled && r.source === 'suggest';
        });
        var once = (_rubrics || []).filter(function (r) {
            return r.title && !r.disabled && !r.needs_fact && rubRecentOnce(r);
        });
        return live.concat(sug, once);
    }
    function rubByTitle(t) {
        return (_rubrics || []).filter(function (r) { return r.title === t; })[0] || null;
    }
    function cpwReason(r, brief) {
        if (!r) return T('тема будет из включённых рубрик');
        if (rubRecentOnce(r)) return T('уже выходила') + ' ' + dateLabel(String(r.last_at).slice(0, 10));
        if ((r.post_count || 0) >= 3 && (r.avg_views || 0) > 0) {
            var top = 0;
            (_rubrics || []).forEach(function (x) {
                if (!x.disabled && (x.post_count || 0) >= 3 && (x.avg_views || 0) > top) top = x.avg_views;
            });
            return (r.avg_views === top ? T('сильная рубрика') : T('рубрика канала')) +
                (brief ? '' : ' · ' + T('типичный охват') + ' ' + numExact(r.avg_views));
        }
        if (r.source === 'user') return T('твоя рубрика');
        if (r.source === 'suggest') return T('предложение под нишу');
        if (!(r.post_count || 0)) return T('стартовая рубрика');
        return T('рубрика канала') + ' · ' + r.post_count + ' ' +
            T(plural3(r.post_count, 'пост', 'поста', 'постов'));
    }
    function cpwWhy(i, k) {
        var tp = dayTopics(i)[k] || '';
        if (tp) {
            var r = rubByTitle(tp);
            return r ? { t: cpwReason(r, true), own: r.source === 'user' }
                     : { t: T('твоя тема'), own: true };
        }
        var pin = dayPins(i)[k] || '';
        if (pin) return { t: cpwReason(rubByTitle(rubTitle(pin)), true), own: false };
        return null;
    }
    function daysUneven() {
        var hist = histDays();
        if (!hist) return false;
        var mx = 0, mn = Infinity;
        hist.forEach(function (d) {
            if (d.views > 0) { if (d.views > mx) mx = d.views; if (d.views < mn) mn = d.views; }
        });
        return mx > 0 && mn < Infinity && mx >= mn * 1.5;
    }
    function cpwRecDays() {
        var hist = histDays();
        if (!hist || !daysUneven()) return {};
        var idx = [0, 1, 2, 3, 4, 5, 6].sort(function (a, b) {
            return (hist[b].views || 0) - (hist[a].views || 0);
        });
        var lim = Math.max(3, days().filter(function (d) { return d.n > 0; }).length);
        var out = {};
        idx.slice(0, lim).forEach(function (i) { if ((hist[i].views || 0) > 0) out[i] = 1; });
        return out;
    }
    function noChannelData() {
        return !histDays();
    }
    function edBubble() {
        var L = _state && _state.learning;
        var names = [];
        days().forEach(function (d, i) { if (d.n) names.push(T(WD[i])); });
        var t = totalPosts();
        if (noChannelData()) {
            var hstat = (_cal && _cal.history) || {};
            var hd0 = histAny();
            var why0, measuredWeek = false;
            if (hd0) {
                var mx0 = 0, mn0 = Infinity, bi0 = -1, wi0 = -1;
                hd0.forEach(function (d, i) {
                    if (d.views > 0) {
                        if (d.views > mx0) { mx0 = d.views; bi0 = i; }
                        if (d.views < mn0) { mn0 = d.views; wi0 = i; }
                    }
                });
                var spread0 = (mx0 > 0 && mn0 < Infinity)
                    ? Math.round((mx0 / mn0 - 1) * 100) : null;
                measuredWeek = spread0 != null;
                why0 = T('Разведочные замеры прошли: лучший день') + ' ' + T(WD[bi0]) + ' ' +
                    numExact(mx0) + ', ' + T('худший') + ' ' + T(WD[wi0]) + ' ' + numExact(mn0) +
                    ' — ' + T('разница') + ' ' + spread0 + '%. ' +
                    T(spread0 < 10 ? 'Дни практически одинаковы.'
                                   : 'Сильным день считается от 50% отрыва — пока не дотягивает.');
            } else if (hstat.total || hstat.archive) {
                why0 = T('Свежих замеров у канала мало — сильные дни по ним не определить.');
            } else {
                why0 = T('У канала пока нет вышедших постов — сравнивать не с чем, ' +
                    'сильные дни и часы определить не по чему.');
            }
            var full0 = t === 7 && days().every(function (d) { return (d.n || 0) === 1; });
            var plan0 = full0
                ? T(measuredWeek
                    ? 'Повторяю разведочную неделю: по посту в каждый день — сильный день ' +
                      'должен подтвердиться заметным отрывом.'
                    : 'Предлагаю разведочную неделю: по посту в каждый день — за неделю ' +
                      'станет видно, какие дни и часы у канала сильные.')
                : T('Сейчас %1 — %2. Точнее всего разведочная неделя: по посту в каждый день.')
                    .replace('%1', t + ' ' + T(plural3(t, 'пост', 'поста', 'постов')))
                    .replace('%2', names.join(', '));
            var hasTp0 = days().some(function (d) { return (d.topics || []).some(Boolean); });
            var real0 = (_rubrics || []).some(function (r) { return (r.post_count || 0) > 0; });
            var tp0 = !hasTp0 ? '' : ' ' +
                T(real0 ? 'Темы — из рубрик канала.' : 'Темы взял из базовых рубрик.');
            return '<div class="cpw-ed"><i class="av ti ti-calendar"></i><div class="bub">' +
                esc(why0 + ' ' + plan0 + tp0) +
                '<div class="sub">' + esc(T('Меняй дни, темы и время как считаешь нужным. ' +
                    'После первой недели подстрою расстановку по замерам канала.')) + '</div>' +
                '</div></div>';
        }
        var parts = [];
        parts.push(T('Я уже расставил неделю:') + ' ' +
            t + ' ' + T(plural3(t, 'пост', 'поста', 'постов')) +
            (names.length && names.length <= 5 ? ' — ' + names.join(', ') : ''));
        var hist = histDays();
        if (_autoFreq && hist && daysUneven()) {
            var mx = 0;
            hist.forEach(function (d) { if ((d.views || 0) > mx) mx = d.views || 0; });
            var avg = histAvg();
            if (avg > 0 && mx > avg) {
                parts.push(T('в эти дни охват до +%1% к среднему')
                    .replace('%1', Math.round((mx / avg - 1) * 100)));
            }
        }
        var H = L && L.hours;
        if (H && (H.windows || []).length) {
            parts.push(T('время — по окнам') + ' ' +
                H.windows.slice(0, 2).map(lrnWin).join(' ' + T('и') + ' '));
        }
        var hasTopics = days().some(function (d) { return (d.topics || []).some(Boolean); });
        if (hasTopics) parts.push(T('темы подобрал под нишу'));
        return '<div class="cpw-ed"><i class="av ti ti-calendar"></i><div class="bub">' +
            esc(parts.join(', ')) + '.' +
            '<div class="sub">' + esc(T('Всё можно поменять: нажми на день, тему или время. Настройка бесплатна.')) + '</div>' +
            '</div></div>';
    }
    function cpwStrip() {
        var hist = histAny();
        var rec = cpwRecDays();
        if (_cpwDay == null) {
            _cpwDay = 0;
            for (var q = 0; q < 7; q++) if (dayN(q) > 0) { _cpwDay = q; break; }
        }
        return '<div class="cpw-strip">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) {
            var v = hist ? (hist[i].views || 0) : 0;
            return '<div class="cpw-d' + (rec[i] ? ' rec' : '') + (i === _cpwDay ? ' on' : '') +
                (dayN(i) > 0 ? ' has' : '') + '" data-act="cpwd" data-v="' + i + '">' +
                '<div class="d">' + esc(T(WD[i])) + '</div>' +
                (v ? '<div class="v">' + numExact(v) + '</div>' : '<div class="v">—</div>') +
                '<div class="dot"></div></div>';
        }).join('') + '</div>';
    }
    function cpwSlotTime(i, k) {
        var mine = dayTimes(i)[k] || '';
        if (mine) return { at: mine, mine: true, conf: 'manual' };
        var sl = daySlots(i)[k] || {};
        return { at: sl.at || '', mine: false, conf: sl.conf || 'low' };
    }
    function confLabel(conf) {
        if (conf === 'measured') return T('по замерам канала');
        if (conf === 'probe') return T('проба окна');
        if (conf === 'high') return T('по данным канала');
        return T('время по нише');
    }
    function cpwFocus() {
        var i = _cpwDay || 0;
        var hist = histAny();
        var ready = !!histDays();
        var rec = cpwRecDays();
        var v = hist ? (hist[i].views || 0) : 0;
        var np = hist ? (hist[i].posts || 0) : 0;
        var avg = histAvg();
        var pct = (ready && daysUneven() && v && avg) ? Math.round((v / avg - 1) * 100) : null;
        var n = dayN(i);
        var topics = dayTopics(i);
        var rows = '';
        for (var k = 0; k < n; k++) {
            var why = cpwWhy(i, k);
            var tp = topics[k] || '';
            var tm = cpwSlotTime(i, k);
            rows += '<div class="cpw-slot" data-act="cpwslot" data-v="' + i + '" data-k="' + k + '">' +
                '<span class="tm' + (tm.mine ? ' custom' : '') + '">' +
                esc(tm.at || '--:--') + '</span>' +
                '<span class="tx">' + (tp ? esc(tp)
                    : '<em>' + esc(T('выбрать тему')) + '</em>') +
                (why ? '<span class="why' + (why.own ? ' own' : '') + '">' + esc(why.t) + '</span>' : '') +
                '</span>' +
                (canEdit() ? '<button class="cpw-x" data-act="cpwdrop" data-v="' + i +
                    '" data-k="' + k + '" aria-label="' + esc(T('Убрать пост')) + '">' +
                    '<i class="ti ti-x"></i></button>' : '') +
                '<i class="ti ti-chevron-right ar"></i></div>';
        }
        if (!n) {
            rows = '<div class="cpw-off">' +
                esc(T('В этот день ничего не выходит.') + ' ' +
                    T('Добавь пост, если хочешь занять день.')) + '</div>';
        }
        return '<div class="cpw-focus">' +
            '<div class="fh"><span class="fd">' + esc(T(WD_FULL[i])) + '</span>' +
            (rec[i] && pct != null
                ? '<span class="fr">' + esc(T('сильный день') + ' · +' + pct + '%') + '</span>'
                : (pct != null ? '<span class="fr mut">' + esc((pct >= 0 ? '+' : '') + pct + '% ' + T('к среднему')) + '</span>' : '')) +
            (v ? '<span class="fv">' + esc(T('охват дня') + ' ' + numExact(v) +
                (ready ? '' : ' · ' + np + ' ' + T(plural3(np, 'пост', 'поста', 'постов')))) + '</span>' : '') +
            '</div>' + rows +
            (canEdit() ? '<button class="cpw-add" data-act="cpwadd" data-v="' + i + '">+ ' +
                esc(T('Пост в этот день')) + '</button>' : '') +
            '</div>';
    }

    function goalSum() {
        return esc(goalTitle(_goal) + (_goalAuto ? ' · ' + T('по замерам') : ''));
    }
    function lrnSum() {
        var L = _state && _state.learning;
        if (!L || !L.ready) return esc(T('собирается'));
        var H = L.hours;
        if (H && (H.windows || []).length) {
            return esc(T('окна') + ' ' + H.windows.slice(0, 2).map(lrnWin).join(' · '));
        }
        return esc(T('готова'));
    }
    function insSum() {
        var ins = (_state && _state.insights) || {};
        var n = ins.published_total || 0;
        return n ? esc(n + ' ' + T(plural3(n, 'пост', 'поста', 'постов'))) : '';
    }
    function revSum() {
        var r = _review;
        if (!r) return '';
        if (!r.ready) return esc((r.posts || 0) + ' ' + T('из') + ' ' + (r.need || 20));
        var v = r.views || {};
        return esc(v.change_pct != null ? ((v.change_pct > 0 ? '+' : '') + v.change_pct + '%')
            : (r.median_views ? numShort(r.median_views) : ''));
    }
    function statsSum() {
        return revSum() || insSum();
    }
    function statsBlock() {
        var ins = insightsBlock();
        var measured = _review && ((_review.posts || 0) > 0 || _review.ready);
        var rev = measured ? reviewEntry() : '';
        if (!rev && !ins) return '';
        return rev + ins;
    }
    function apSum() {
        if (!_ap) return '';
        return esc(T((_ap.level || 'manual') !== 'manual' ? 'включён' : 'выключен'));
    }
    function whoChip() {
        var b = _state && _state.built_by;
        if (!b || !b.name || (myTgId() && +b.id === myTgId())) return '';
        return '<span class="cpg-chip"><i class="ti ti-users"></i> ' + esc(T('собрал') + ' ' + b.name) + '</span>';
    }
    function apChip() {
        if (!_ap) return '';
        var on = (_ap.level || 'manual') !== 'manual';
        return '<span class="cpg-chip' + (on ? ' g' : ' y') + '">' +
            esc(T('автопилот') + ' ' + T(on ? 'вкл' : 'выкл')) + '</span>';
    }
    function gHeroBase(title, chips) {
        var cc = (_channels || []).filter(function (c) { return c.id === _chId; })[0];
        return '<div class="cpg-glow"></div><div class="cpg-hero">' +
            '<div class="hk">' + esc(T('Неделя') + ' ' + isoWeek(new Date())) +
            (cc ? ' · ' + esc(chanName(cc)) : '') + '</div>' +
            '<div class="ht">' + esc(T(title)) + '</div>' +
            '<div class="hs">' + chips + '</div></div>';
    }
    function gHero() {
        var total = totalPosts();
        var chips = '<span class="cpg-chip g">' + esc(total + ' ' + T(plural3(total, 'пост', 'поста', 'постов'))) + '</span>' +
            '<span class="cpg-chip">' + esc(goalTitle(_goal)) + '</span>' +
            '<span class="cpg-chip">' + esc(T(_model === 'standard' ? 'Стандарт' : 'Премиум')) + '</span>' + apChip();
        return gHeroBase('Сборка недели', chips);
    }
    function chanSec() {
        return '<div class="cpg-chan">' + buildChanBlock() + '</div>';
    }
    function ohvSum() {
        var h = _cal && _cal.history;
        if (!h || !h.ready) return '';
        return esc('Ø ' + numExact(histAvg()) + ' · ' + (h.total || 0) + ' ' +
            T(plural3(h.total || 0, 'пост', 'поста', 'постов')) +
            (h.since ? ' · ' + T('с') + ' ' + dateLabel(h.since) : ''));
    }
    function prefillTopics() {
        if (!canEdit() || _cpwSheet) return;
        if (!_state || !_state.days || !_days) return;
        var sugs = cpwSugTitles();
        if (!sugs.length) return;
        var used = {};
        days().forEach(function (d) {
            (d.topics || []).forEach(function (t) { if (t) used[t] = 1; });
        });
        if (Object.keys(used).length) return;
        var free = sugs.filter(function (t) { return !used[t]; });
        if (!free.length) return;
        var d = days().slice();
        var changed = false, fi = 0;
        for (var i = 0; i < 7 && fi < free.length; i++) {
            var x = d[i] || {};
            var n = x.n || 0;
            for (var k = 0; k < n && fi < free.length; k++) {
                if (((x.topics || [])[k] || '')) continue;
                if (_topicCleared[i + '_' + k]) continue;
                var arr = (x.topics || []).slice();
                while (arr.length <= k) arr.push('');
                arr[k] = free[fi++];
                x = { n: x.n, pins: x.pins || [], times: x.times || [], topics: arr };
                d[i] = x;
                changed = true;
            }
        }
        if (changed) _days = d;
    }
    var _cpwSheet = null;
    function cpwCommitSlot() {
        if (!_cpwSheet || !_cpwSheet.fresh) return true;
        if (!setDayN(_cpwSheet.day, dayN(_cpwSheet.day) + 1)) {
            _cpwSheet = null;
            renderBrief();
            return false;
        }
        _cpwSheet.fresh = false;
        loadCalendarSoon();
        return true;
    }
    function cpwUsedTopics(exDay, exSlot) {
        var used = {};
        days().forEach(function (d, di) {
            (d.topics || []).forEach(function (t, k) {
                if (t && !(di === exDay && k === exSlot)) used[t] = 1;
            });
        });
        return used;
    }
    function cpwSheetHtml() {
        if (!_cpwSheet) return '';
        var i = _cpwSheet.day, k = _cpwSheet.slot;
        var fresh = !!_cpwSheet.fresh;
        var used = cpwUsedTopics(i, k);
        var cur = fresh ? '' : (dayTopics(i)[k] || '');
        var sugs = cpwCandidates().filter(function (r) { return !used[r.title]; }).slice(0, 8);
        return '<div class="cpw-sw" data-act="cpwx"><div class="cpw-sheet">' +
            '<div class="sh">' + esc(T(WD_FULL[i]) + ' · ' +
                T(fresh ? 'новый пост' : 'тема поста')) + '</div>' +
            sugs.map(function (r) {
                var isCur = r.title === cur;
                return '<button class="cpw-pick' + (r.source === 'user' ? ' own' : '') +
                    (rubRecentOnce(r) ? ' old' : '') +
                    '" data-act="cpwpick" data-v="' + esc(r.title) + '">' +
                    '<span class="tx">' + esc(r.title) +
                    '<em>' + esc(cpwReason(r)) + '</em>' +
                    (r.about ? '<span class="ab">' + esc(r.about) + '</span>' : '') + '</span>' +
                    '<i class="ti ti-' + (isCur ? 'check' : 'arrow-right') + ' go"></i></button>';
            }).join('') +
            '<button class="cpw-pick auto" data-act="cpwpick" data-v="">' +
            '<span class="tx">' + esc(T('Пусть тему придумает сборка')) +
            '<em>' + esc(T('под сюжет недели и сильные рубрики')) + '</em></span>' +
            (cur ? '' : '<i class="ti ti-check go"></i>') + '</button>' +
            '<div class="cpw-own"><input id="cpw-ti" maxlength="200" value="' +
            esc(rubByTitle(cur) ? '' : cur) + '" ' +
            'placeholder="' + esc(T('Своя тема поста')) + '...">' +
            '<button data-act="cpwown"><i class="ti ti-check"></i></button></div>' +
            (fresh
                ? '<div class="cpw-fresh">' +
                  esc(T('Пост появится в неделе, когда выберешь тему. Время и правки — после этого.')) +
                  '</div>'
                : cpwTimeBlock(i, k) +
                  '<button class="cpw-drop" data-act="cpwdrop" data-v="' + i + '" data-k="' + k + '">' +
                  '<i class="ti ti-trash"></i> ' + esc(T('Убрать этот пост')) + '</button>') +
            '<button class="cpw-close" data-act="cpwx">' +
            esc(T(fresh ? 'Отмена' : 'Закрыть')) + '</button>' +
            '</div></div>';
    }
    function cpwTimeBlock(i, k) {
        var tm = cpwSlotTime(i, k);
        var cur = dayTimes(i)[k] || '';
        var hours = '';
        for (var h = 8; h <= 22; h++) {
            var hh = (h < 10 ? '0' : '') + h;
            hours += '<button class="cpw-th' + (cur.slice(0, 2) === hh ? ' on' : '') +
                '" data-act="cpwhour" data-v="' + hh + '">' + hh + '</button>';
        }
        var mins = ['00', '15', '30', '45'].map(function (m) {
            return '<button class="cpw-tm' + (cur.slice(3) === m ? ' on' : '') +
                '" data-act="cpwmin" data-v="' + m + '">:' + m + '</button>';
        }).join('');
        return '<div class="cpw-time">' +
            '<div class="th">' + esc(T('Время выхода')) +
            '<span class="' + (tm.mine ? 'own' : (tm.conf === 'low' ? 'lo' : 'rec')) + '">' +
            esc(tm.at || '--:--') +
            (tm.mine ? '' : ' · ' + esc(confLabel(tm.conf))) + '</span></div>' +
            (cur ? '<button class="cpw-tauto" data-act="cpwhour" data-v="">' +
                esc(T('Вернуть время, которое подберёт система')) + '</button>' : '') +
            '<div class="cpw-tg">' + hours + '</div>' +
            '<div class="cpw-tr">' + mins + '</div></div>';
    }

    function strategyWrap() {
        var h = strategyBlock();
        if (!h) return '';
        try { if (localStorage.getItem('fm_cp_strhide') === '1') return ''; } catch (e) {}
        return '<div class="cpg-strwrap">' + h +
            '<button class="cpg-strhide" data-act="strhide" aria-label="' + esc(T('Скрыть')) + '"><i class="ti ti-x"></i></button></div>';
    }
    function archRow() {
        if (!(_state && _state.posts && _state.posts.length)) return '';
        return '<button class="cpg-arch" data-act="gotoarch"><i class="ti ti-archive"></i> ' +
            esc(T('Посты недели (архив)')) + '</button>';
    }

    function renderBrief() {
        if (!_ap && _chId) setTimeout(loadAutopilot, 0);
        var chanBlock = buildChanBlock();
        var goals = goalChips();
        var rdy = readiness();
        var _lfB = _state && _state.learning;
        var _recB = _lfB && _lfB.ready && _lfB.freq && _lfB.freq.recommended;
        _autoFreq = false;
        if (_recB && !noChannelData() && daysUneven() && canEdit() &&
                rdy.reason !== 'paused' && daysIsDefault() && totalPosts() !== _recB) {
            applyFreqGrid(_recB);
            var _sugs = cpwSugTitles();
            if (_sugs.length) {
                var _fd2 = days().slice();
                var _si = 0;
                for (var _fi2 = 0; _fi2 < 7 && _si < _sugs.length; _fi2++) {
                    if ((_fd2[_fi2] || {}).n > 0) {
                        _fd2[_fi2] = { n: _fd2[_fi2].n, pins: _fd2[_fi2].pins || [],
                            times: _fd2[_fi2].times || [], topics: [_sugs[_si++]] };
                    }
                }
                _days = _fd2;
            }
            _autoFreq = true;
        } else if (_recB && totalPosts() === _recB) {
            _autoFreq = true;
        }
        prefillTopics();
        var _recGoal = (_lfB && _lfB.ready && _lfB.members &&
            (_lfB.members.left || 0) > 0) ? 'retention' : null;
        _goalAuto = false;
        if (_recGoal && canEdit() && !_goalTouched && _goal !== _recGoal &&
                !(_state && _state.goal)) {
            _goal = _recGoal;
            _goalAuto = true;
        } else if (_recGoal && _goal === _recGoal) {
            _goalAuto = true;
        }
        var blocked = rdy.blocked === true;
        var w = wallet();
        var rebuildFee = (!w.is_tester && w.next_build_paid && w.reskeleton_price) ? w.reskeleton_price : 0;
        var weekPrice = priceDay() * totalPosts() + rebuildFee;
        var priceTag = w.is_tester ? '' :
            '<span class="cp-gopx">' + forgeTag(weekPrice, 14) + '</span>';
        var lowNote;
        if (w.is_tester) {
            lowNote = '<div class="cp-gonote">' + esc(T('Тестовый доступ — Forge не списываются')) + '</div>';
        } else {
            lowNote = priceBreak(weekPrice, rebuildFee);
            if (w.balance != null && w.balance < weekPrice) {
                lowNote += '<div class="cp-hint low">' + esc(T('Не хватает: нужно')) + ' ' + forgeTag(weekPrice) +
                    ', ' + esc(T('на балансе')) + ' ' + forgeTag(w.balance || 0) + '. ' + esc(T('Пополни в кабинете.')) + '</div>';
            }
        }
        if (rdy.reason === 'paused') { setView(heroWeek(), 'brief'); return; }
        var goalsBody = '<div class="cp-goals">' + goals + '</div>' + goalRecNote();
        var modelBody = '<div class="cp-msel">' + modelOpt('premium') + modelOpt('standard') + '</div>' +
            '<div class="cp-hint"><i class="ti ti-file-search" style="vertical-align:-2px;margin-right:3px;"></i>' +
            esc(T('Если в посте есть факты или статистика, к нему можно добавить ссылки на проверенные исследования — кнопка появится на его карточке.')) +
            ' ' + forgeTag(priceResearch()) + ' ' + esc(T('за пост')) + '.</div>';
        var ccur = (_channels || []).filter(function (c) { return c.id === _chId; })[0];
        var rdyBlock = readinessBlock();
        setView(
            chanSec() + (rdyBlock ? rdyBlock + gHero() : gHero() + rdyBlock) +
            edBubble() + cpwStrip() + cpwFocus() +
            gSec('goal', 'target', 'Цель недели', goalSum(), goalsBody, false) +
            gSec('lrn', 'sparkles', 'Калибровка', lrnSum(), learningBlock(), false) +
            gSec('rev', 'chart-bar', 'Статистика', statsSum(), statsBlock(), false, true) +
            gSec('ap', 'plane', 'Автопилот', apSum(), apPanel(), false) +
            gSec('model', 'diamond', 'Модель текстов',
                esc(T(_model === 'standard' ? 'Стандарт' : 'Премиум') + ' · ' + priceDay()), modelBody, false) +
            strategyWrap() + archRow() + cpwSheetHtml() +
            (blocked ? '' : lowNote) +
            '<div class="cpg-cta' + (rdyBlock ? ' flow' : '') + '"><button class="cp-go' +
            (blocked ? ' off' : '') + '"' +
            (blocked ? ' disabled' : ' data-act="generate"') + '><i class="ti ti-sparkles"></i> ' +
            esc(T('Собрать неделю')) + (blocked ? '' : priceTag) + '</button>' +
            ((blocked || !_chId || !canEdit()) ? '' :
                '<button class="cp-go sec" data-act="ownweek"><i class="ti ti-pencil"></i> ' +
                esc(T('Наполнить своими постами')) + (w.is_tester ? '' : '<span class="cp-gopx">' + forgeTag(0, 14) + '</span>') + '</button>') +
            '</div>', 'brief');
    }

    function priceBreak(total, fee) {
        var n = totalPosts(), per = priceDay(), base = per * n;
        var rows = '<div class="cp-pbr"><span>' +
            esc(n + ' ' + T(plural3(n, 'пост', 'поста', 'постов')) + ' × ' + per) +
            '</span><b>' + esc(String(base)) + '</b></div>';
        if (fee) {
            rows += '<div class="cp-pbr"><span>' +
                esc(T('вторая сборка за сутки')) + '</span><b>+' + esc(String(fee)) + '</b></div>';
        }
        rows += '<div class="cp-pbr sum"><span>' + esc(T('итого')) + '</span><b>' +
            forgeTag(total) + '</b></div>';
        var note = T('Тексты списываются по мере написания — каждый можно переписать.');
        if (fee) {
            var left = feeLeft();
            note = T('Первая сборка за сутки — без доплаты. Эта вторая, потому что неделя уже собиралась.') +
                (left ? ' ' + T('Доплата снимется через') + ' ' + left + '.' : '');
        }
        return '<div class="cp-pbreak">' + rows + '</div>' +
            '<div class="cp-gonote">' + esc(note) + '</div>';
    }

    function feeLeft() {
        var iso = wallet().reskeleton_until;
        if (!iso) return '';
        var ms = Date.parse(iso) - Date.now();
        if (!(ms > 0)) return '';
        var mins = Math.round(ms / 60000);
        if (mins < 60) return mins + ' ' + T(plural3(mins, 'минуту', 'минуты', 'минут'));
        var h = Math.floor(mins / 60), m = mins % 60;
        return h + ' ' + T(plural3(h, 'час', 'часа', 'часов')) +
            (m ? ' ' + m + ' ' + T(plural3(m, 'минуту', 'минуты', 'минут')) : '');
    }

    function modelOpt(m) {
        var w = wallet();
        var prem = m === 'premium';
        var price = prem ? (w.price_day || 10) : (w.price_day_std || 5);
        return '<button class="cp-mopt' + (_model === m ? ' on' : '') +
            '" data-act="mchoice" data-m="' + m + '">' +
            '<i class="ti ti-' + (prem ? 'diamond' : 'edit') + '"></i>' +
            '<span><b>' + esc(T(prem ? 'Премиум' : 'Стандарт')) + '</b>' +
            '<em>' + esc(T(prem ? 'Точнее, глубже' : 'Быстрее, легче')) + '</em></span>' +
            '<span class="cp-mpx">' + forgeTag(price) + '<u>' + esc(T('за пост')) + '</u></span></button>';
    }

    var _genBusy = false;
    function doGenerate(btn) {
        if (_genBusy) return;
        _wantView = null;
        _genBusy = true;
        if (btn) btn.disabled = true;
        haptic('medium');
        if (_batchTimer) { clearInterval(_batchTimer); _batchTimer = null; }
        var tz = deviceTz();
        var body = { channel_id: _chId, goal: _goal, days: days(), tz_offset_minutes: tz,
                     model: _model };
        apiRequest('/api/v1/content-plan/generate', { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                _genBusy = false;
                if (r && r.ok) {
                    _rubChanged = false;
                    _days = null;
                    _cal = null;
                    _building = true;
                    renderGenerating();
                    startPoll();
                }
                else if (r && r.error) { if (btn) btn.disabled = false; toast(cap(r)); }
                else { if (btn) btn.disabled = false; toast(T('Не удалось запустить сборку')); }
            })
            .catch(function (err) { _genBusy = false; if (btn) btn.disabled = false; toast(apiErrText(err, 'Не удалось запустить сборку')); });
    }
    function cap(r) {
        if (r && r.detail && r.detail.message) return r.detail.message;
        return T('Не получилось — попробуй ещё раз.');
    }
    function apiErrText(err, fb) {
        try {
            var s = String((err && err.message) || '');
            var body = s.slice(s.indexOf(': ') + 2);
            var d = JSON.parse(body);
            var t = d && (typeof d.detail === 'string' ? d.detail
                : (d.detail && d.detail.message));
            if (t) return t;
        } catch (e) {}
        return T(fb);
    }

    function myTgId() {
        try { return +(((window.Telegram || {}).WebApp || {}).initDataUnsafe || {}).user.id || 0; }
        catch (e) { return 0; }
    }
    function builtByLine(prefix) {
        var b = _state && _state.built_by;
        if (!b || !b.name || (myTgId() && +b.id === myTgId())) return '';
        var when = '';
        if (b.at) {
            try {
                var dt = new Date(b.at);
                when = ' · ' + T('с') + ' ' + (dt.getHours() < 10 ? '0' : '') + dt.getHours() + ':' +
                    (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes();
            } catch (e) {}
        }
        return T(prefix) + ' ' + b.name + when;
    }
    function renderGenerating() {
        var who = builtByLine('Неделю собирает');
        setView('<div class="cp-center"><div class="cp-genic"><i class="ti ti-calendar-week"></i></div>' +
            '<div class="cp-spin"></div>' +
            '<div class="m" id="cp-gen-text">' + esc(T(GEN_TEXTS[0])) + '</div>' +
            (who ? '<div class="cp-genwho"><i class="ti ti-users"></i>' + esc(who) + '</div>' : '') +
            '<div class="s">' + esc(T('Обычно пара минут. Можно закрыть — план соберётся сам.')) + '</div></div>');
        var i = 0;
        _genTimer = setInterval(function () {
            var el = document.getElementById('cp-gen-text');
            if (!el) return;
            if (i < GEN_TEXTS.length - 1) { i++; el.textContent = T(GEN_TEXTS[i]); }
        }, 5000);
    }
    function genProgressLine(d) {
        var ps = (d && d.posts) || [];
        if (!ps.length) return null;
        var withText = ps.filter(function (p) { return p.text; }).length;
        if (withText < ps.length) {
            return T('Пишу тексты') + ' · ' + withText + ' ' + T('из') + ' ' + ps.length;
        }
        return T('Рисую обложки...');
    }
    function startPoll() {
        if (_pollTimer) clearInterval(_pollTimer);
        var ticks = 0;
        _pollTimer = setInterval(function () {
            ticks++;
            if (ticks > 400) {
                stopTimers();
                if (_building) {
                    _building = false;
                    if (_state && _state.posts && (_lastView === 'week' || _lastView === 'brief' || !_lastView)) renderWeek();
                }
                return;
            }
            var pcid = _chId || (_state && _state.channel_id);
            apiRequest('/api/v1/content-plan' + (pcid ? '?channel_id=' + pcid : '')).then(function (d) {
                if (!d || !d.ok) return;
                if (d.status === 'ready' || d.status === 'scheduled' || d.status === 'done') {
                    _state = d;
                    syncDays(d);
                    var ps = d.posts || [];
                    var withText = ps.filter(function (p) { return p.text; }).length;
                    if (_building && d.batch_running && document.getElementById('cp-gen-text')) {
                        if (_genTimer) { clearInterval(_genTimer); _genTimer = null; }
                        var el = document.getElementById('cp-gen-text');
                        var line = genProgressLine(d);
                        if (el && line) el.textContent = line;
                        return;
                    }
                    _building = false;
                    stopTimers();
                    if (!_cal) loadCalendar();
                    if (!_rubrics.length) loadRubrics();
                    if (_lastView === 'week' || _lastView === 'brief' || !_lastView) renderWeek();
                    if (d.batch_running && withText < ps.length) startBatchPoll();
                }
                else if (d.status === 'error') { _state = d; _building = false; stopTimers(); renderError(); }
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
        if (ps === 'rolled_back') return [T('Удалён из канала'), 'fail'];
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

    function posts() {
        return (_state.posts || []).slice().sort(function (a, b) {
            var da = a.date_iso || '', db = b.date_iso || '';
            if (da !== db) return da < db ? -1 : 1;
            return ((a.day_index || 0) - (b.day_index || 0)) || ((a.slot_hm || '') < (b.slot_hm || '') ? -1 : 1);
        });
    }

    var _archOpen = false;

    function renderWeek() {
        var ps = posts();
        var n = ps.length;
        if (_selDay == null || !ps.some(function (p) { return p.day_index === _selDay; })) _selDay = ps.length ? ps[0].day_index : 0;
        var appr = ps.filter(function (p) { return p.status === 'approved'; }).length;
        var pct = n ? Math.round(appr / n * 100) : 0;
        var haveText = ps.filter(function (p) { return p.text; }).length;

        var chanBlock = buildChanBlock();
        var weekCal = '<div class="cp-hero wk"><div class="cp-hero-week">' + weekCells(true) +
            '</div></div>';
        var header = '<div class="cp-wkhead">' +
            '<div class="cp-ring" style="--p:' + pct + '"><i>' + appr + '/' + n + '</i></div>' +
            '<div class="cp-hitem"><div class="k">' + esc(T('цель недели')) + '</div><div class="v">' + esc(goalTitle(_state.goal)) + '</div></div>' +
            '<div class="cp-saved"><i class="ti ti-calendar-week"></i> ' +
            esc(n + ' ' + T(plural3(n, 'пост', 'поста', 'постов')) + ' ' + T('в неделе')) +
            '</div></div>';
        var allPub = n > 0 &&
            ps.every(function (p) { return p.publish_status === 'published' || p.publish_status === 'rolled_back'; }) &&
            ps.some(function (p) { return p.publish_status === 'published'; });
        var doneBanner = allPub
            ? '<div class="cp-doneban"><i class="ti ti-circle-check"></i>' +
              '<span><b>' + esc(T('Неделя вышла полностью')) + '</b>' +
              '<em>' + esc(T('Все посты в канале. Собери следующую неделю — прошлая уйдёт в архив.')) + '</em></span></div>'
            : '';
        var goalChanged = _goal && _state.goal && _goal !== _state.goal;
        var goalsSec = '<div class="cp-sec">' + secHead('Цель недели',
            'Эта неделя собрана под цель выше. Новая цель применится при следующей сборке.') +
            '<div class="cp-goals">' + goalChips() + '</div>' + goalRecNote() +
            (goalChanged
                ? (allPub
                    ? '<div class="cp-note">' + esc(T('Изменения применятся при сборке следующей недели.')) + '</div>'
                    : '<button class="cp-allbtn rgn" data-act="regen"><i class="ti ti-refresh"></i> ' +
                      esc(T('Пересобрать неделю под новую цель')) + '</button>' +
                      '<div class="cp-note">' + esc(T('Откроется сборка: текущая неделя будет заменена, вышедшие посты останутся в канале.')) + '</div>')
                : '') + '</div>';

        var allBtn = haveText < n
            ? '<div class="cp-note" style="margin:0 2px 8px;">' +
              esc(T('Без текста осталось') + ' ' + (n - haveText) + ' ' +
                  T(plural3(n - haveText, 'пост', 'поста', 'постов')) + ' — ' +
                  T('запись была прервана. Допишу по нажатию; списываются только недописанные.')) + '</div>' +
              '<button class="cp-allbtn" data-act="genall"><i class="ti ti-wand"></i> ' + esc(T('Написать все тексты')) + '</button>'
            : '';

        var apprText = ps.filter(function (p) { return p.status === 'approved' && p.text; }).length;
        var scheduled = _state.status === 'scheduled' || ps.some(function (p) { return p.publish_status === 'queued'; });
        var schedBtn = '';
        if (scheduled) {
            schedBtn = '<button class="cp-allbtn sched" data-act="unschedule"><i class="ti ti-calendar-off"></i> ' + esc(T('Снять неделю с очереди')) + '</button>';
        } else if (apprText > 0) {
            schedBtn = '<button class="cp-allbtn sched" data-act="schedule"><i class="ti ti-calendar-up"></i> ' + esc(T('Запланировать выход в канал')) + '</button>';
        }

        var ribbon = n
            ? '<div class="cp-ribbon">' + ps.map(function (p) { return ribbonCard(p); }).join('') + '</div>'
            : '<div class="cp-note cp-emptywk">' + esc(T('Постов пока нет. Нажми на день в ленте выше и выбери «Свой пост» или «Пост от ИИ».')) + '</div>';

        var foot = scheduled
            ? esc(T('Посты выйдут в канал сами в указанное время. Любой ещё не вышедший можно снять с очереди.'))
            : esc(T('Слоты времени — рекомендация; точное время подтянется по данным канала. Утверди посты и запланируй выход.'));
        var oldRb = document.querySelector('#content-plan-screen .cp-ribbon');
        var keepScroll = oldRb ? oldRb.scrollLeft : 0;
        var viewBan = canEdit() ? '' :
            '<div class="cp-hbar stop"><i class="ti ti-eye"></i><span>' +
            esc(T('Режим просмотра — права на изменения выдаёт создатель канала.')) +
            '</span></div>';
        if (!_ap && _chId) setTimeout(loadAutopilot, 0);
        var ohvBody = weekCal + histNote();
        if (allPub) {
            var archBody = header + ribbon + detailPanel();
            var pubN = ps.filter(function (p) { return p.publish_status === 'published'; }).length;
            setView(viewBan + chanSec() +
                gHeroBase('Неделя вышла',
                    '<span class="cpg-chip g">' + esc(pubN + ' ' + T(plural3(pubN, 'пост', 'поста', 'постов')) +
                        ' · ' + T(pubN < n ? 'в канале' : 'все в канале')) + '</span>' +
                    '<span class="cpg-chip">' + esc(goalTitle(_state.goal)) + '</span>' + apChip()) +
                gSec('ohv', 'chart-bar', 'Охват по дням', ohvSum(), ohvBody, true) +
                gSec('lrn', 'sparkles', 'Калибровка', lrnSum(), learningBlock(true), false) +
                gSec('goal', 'target', 'Цель недели', goalSum(), goalsSec, false) +
                gSec('rev', 'chart-bar', 'Статистика', statsSum(), statsBlock(), false, true) +
                gSec('ap', 'plane', 'Автопилот', apSum(), apPanel(), false) +
                gSec('arch', 'archive', 'Посты недели (архив)',
                    esc(pubN + ' ' + T(plural3(pubN, 'пост', 'поста', 'постов'))), archBody, false) +
                strategyWrap() +
                '<div class="cp-foot" style="margin:10px 2px 0;">' + tzFootNote() +
                esc(T('Вышедшие посты остаются в канале. Сборка следующей недели заменит план, не тронув канал.')) +
                '</div>' +
                '<div class="cpg-cta"><button class="cp-go" data-act="regen"><i class="ti ti-sparkles"></i> ' +
                esc(T('Собрать неделю')) + '</button></div>', 'week');
        } else {
            var resetBtn = canEdit()
                ? '<button class="cp-allbtn arch" data-act="weekreset"><i class="ti ti-trash"></i> ' +
                  esc(T('Сбросить неделю')) + '</button>'
                : '';
            var actBtns = '<div class="cp-foot" style="margin:10px 2px 0;">' + tzFootNote() + foot +
                (resetBtn ? ' ' + esc(T('Сброс удалит план и невышедшие посты — вышедшие останутся в канале.')) : '') +
                '</div><div class="cpg-cta">' + allBtn + schedBtn + resetBtn + '</div>';
            setView(viewBan + chanSec() +
                gHeroBase('Неделя в работе',
                    '<span class="cpg-chip g">' + esc(appr + '/' + n + ' ' + T('утверждено')) + '</span>' +
                    '<span class="cpg-chip">' + esc(goalTitle(_state.goal)) + '</span>' +
                    (scheduled ? '<span class="cpg-chip g">' + esc(T('в очереди')) + '</span>' : '') +
                    whoChip() + apChip()) +
                gSec('posts', 'layout-list', 'Посты недели',
                    esc(appr + '/' + n + ' ' + T('утверждено')),
                    ohvBody + header + ribbon + detailPanel(), true) +
                gSec('goal', 'target', 'Цель недели', goalSum(), goalsSec, false) +
                gSec('rev', 'chart-bar', 'Статистика', statsSum(), statsBlock(), false, true) +
                gSec('ap', 'plane', 'Автопилот', apSum(), apPanel(), false) +
                strategyWrap() + actBtns, 'week');
        }
        var scrEl = document.getElementById('content-plan-screen');
        if (scrEl) scrEl.classList.toggle('cp-vonly', !canEdit());
        if (keepScroll) {
            var newRb = document.querySelector('#content-plan-screen .cp-ribbon');
            if (newRb) newRb.scrollLeft = keepScroll;
        }
    }

    function loadAutopilot() {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid) return;
        apiRequest('/api/v1/content-plan/autopilot?channel_id=' + cid)
            .then(function (r) {
                if (r && r.ok) {
                    _ap = r.autopilot;
                    rerender();
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
        var week = priceDay() * totalPosts();
        var opts = [100, 300, 700, 1500];
        if (opts.indexOf(cur) < 0) opts.push(cur);
        opts.sort(function (a, b) { return a - b; });
        var html = opts.map(function (v) {
            var thin = week > 0 && v < week;
            return '<button class="cp-capopt' + (v === cur ? ' on' : '') + (thin ? ' thin' : '') +
                '" data-capv="' + v + '">' + forgeTag(v) +
                (thin ? '<span>' + esc(T('меньше недели')) + '</span>' : '') + '</button>';
        }).join('');
        var warn = (week > 0 && cur < week)
            ? '<div class="cp-capwarn">' + esc(T('Неделя по текущим настройкам стоит')) + ' ' +
                forgeTag(week) + ' — ' + esc(T('при этом потолке автопилот остановится, не собрав её.')) +
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
                    title: chanName(c),
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
                _cover = null;
                _days = null;
                _daysDirty = false;
                _goal = 'engagement';
                _goalTouched = false;
                _modelTouched = false;
                _model = 'premium';
                _topicCleared = {};
                _cpwDay = null;
                _cpwSheet = null;
                _sgOpen = false;
                _state = null;
                renderBrief();
                loadAutopilot();
                loadRubrics();
                loadReview(false);
                loadCalendar();
                loadCover();
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
            '<span class="cp-ap-ic"><i class="ti ti-plane"></i></span>' +
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
        body += '<div class="cp-ap-row"><span>' + esc(T('Расход автопилота за неделю')) + '</span>' +
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
                '<div class="cp-ready-w st">' + esc(T('Канал на паузе — публикация в него ' +
                'не проходит, поэтому сборка недели недоступна.')) + '</div>' +
                '<div class="cp-ready-way">' +
                '<div class="cp-ready-wt">' + esc(T('Сними паузу в настройках канала ' +
                'или выбери другой канал выше.')) + '</div>' +
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
            '<div class="cp-sgwrap' + (_sgOpen ? ' open' : '') + '">' +
            '<button class="cp-sgtog" data-act="sgtog">' +
            esc(T(_sgOpen ? 'Свернуть' : 'Что стратегия разберёт')) +
            '<i class="ti ti-chevron-' + (_sgOpen ? 'up' : 'down') + '"></i></button>' +
            (_sgOpen ? strategyParts() : '') + '</div>' +
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
                '<span>' + esc(T('AI-стратегия')) + ' · ' + forgeTag(o.price) + '</span></span></div>' +
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
                esc(T('Замеры вышедших постов')) + '</div><div class="cp-ins-empty">' +
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
            var hsReady = hs.filter(function (h) { return (h.posts || 0) >= 2; });
            var hsPend = hs.filter(function (h) { return (h.posts || 0) < 2; })
                .sort(function (a, b) { return a.hour - b.hour; });
            var hRange = function (h) {
                var p2 = function (x) { return (x < 10 ? '0' : '') + x; };
                return p2(h) + ':00–' + p2((h + 1) % 24) + ':00';
            };
            var top = hsReady.slice(0, 2).map(function (h) {
                return '<div class="cp-hcell"><div class="k">' + esc(T('окно')) + '</div>' +
                    '<div class="v">' + hRange(h.hour) + '</div>' +
                    '<div class="d">' + h.posts + ' ' + esc(T(plural3(h.posts, 'пост', 'поста', 'постов'))) +
                    ' · ' + esc(T('в среднем')) + ' ' + h.views_avg + '</div></div>';
            }).join('');
            var pend = hsPend.length
                ? '<div class="cp-note in" style="margin-top:7px;">' +
                  esc(T('Окно появляется от 2 постов в один час. Пока по одному посту в часах:') + ' ' +
                      hsPend.map(function (h) { return hRange(h.hour); }).join(' · ')) +
                  '</div>'
                : '';
            body += '<div class="cp-ins-t">' + esc(T('Когда читают')) +
                '<span>' + esc(T('просмотров за сутки')) + '</span></div>' +
                (top ? '<div class="cp-hgrid">' + top + '</div>' : '') + pend +
                '<div class="cp-note in" style="margin-top:7px;">' +
                esc(T('Это замеры уже вышедших постов, а не расписание. Время следующей недели выбирает сборка.')) + '</div>';
        }
        var since = ins.since ? ' · ' + esc(T('с')) + ' ' + esc(dateLabel(ins.since)) : '';
        return '<div class="cp-ins"><div class="cp-ins-h"><i class="ti ti-chart-dots"></i>' +
            esc(T('Замеры вышедших постов')) + '<em>' + (ins.published_total || 0) + ' ' +
            esc(T(plural3(ins.published_total || 0, 'пост', 'поста', 'постов'))) + since + '</em></div>' +
            '<div class="cp-note in">' + esc(T('На что аудитория откликается и когда читает. ' +
            'По этим замерам подбираются форматы и время.')) + '</div>' +
            body + '</div>';
    }


    function ribbonCard(p) {
        var fi = fmtInfo(p.format);
        var st = statusOf(p);
        var wd = WD[(p.day_index || 0) % 7];
        var conf = p.is_own ? ['своё время', 'hi']
            : (p.slot_conf === 'measured') ? ['по замерам канала', 'hi']
            : (p.slot_conf === 'probe') ? ['проба окна', 'hi']
            : (p.slot_conf === 'high') ? ['по данным канала', 'hi'] : ['время по нише', 'lo'];
        var slot = p.slot_hm
            ? '<div class="cp-slot"><span class="tm"><i class="ti ti-clock"></i>' + esc(p.slot_hm + slotHint(p.slot_hm)) + '</span>' +
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

    var _mediaBusy = {};
    var _editing = {};

    function editBlock(p) {
        return '<div class="cp-editbox">' +
            '<textarea class="cp-edit" id="cp-edit-' + p.id + '" maxlength="4096">' +
            esc(p.text || '') + '</textarea>' +
            '<div class="cp-editrow">' +
            '<button class="cp-act" data-act="editcancel" data-id="' + p.id + '">' +
            esc(T('Отмена')) + '</button>' +
            '<button class="cp-act gen" data-act="editsave" data-id="' + p.id + '">' +
            '<i class="ti ti-check"></i> ' + esc(T('Сохранить текст')) + '</button>' +
            '</div></div>';
    }

    var _editSaveBusy = {};
    function saveEdit(id) {
        var ta = document.getElementById('cp-edit-' + id);
        if (!ta || _editSaveBusy[id]) return;
        var body = (ta.value || '').trim();
        if (!body) { toast(T('Пустой текст не сохраняю')); return; }
        _editSaveBusy[id] = true;
        apiRequest('/api/v1/content-plan/edit-post',
                   { method: 'POST', body: JSON.stringify({ post_id: id, text: body }) })
            .then(function (r) {
                _editSaveBusy[id] = false;
                if (r && r.ok) {
                    var p = post(id);
                    if (p) { p.text = r.text; p.status = 'draft'; }
                    delete _editing[id];
                    haptic('light');
                    toast(T('Текст сохранён'));
                    renderWeek();
                } else if (r && r.error === 'too_long') {
                    toast(T('Длиннее 4096 знаков Telegram не примет — сократи.'));
                } else toast(T('Не удалось сохранить текст'));
            })
            .catch(function () { _editSaveBusy[id] = false; toast(T('Не удалось сохранить текст')); });
    }

    var LAY_RU = { thesis: 'тезис', num: 'число', vs: 'сравнение', list: 'подборка',
                   ask: 'вопрос' };
    var COVER_PRICE = { cover_variant: 1, cover_phrase: 2, cover_own: 5 };

    function coverPrice(op) {
        var w = wallet();
        return (w.prices && w.prices[op]) || COVER_PRICE[op] || 1;
    }

    var LAY_INFO = [
        ['auto', 'ti-sparkles', 'На выбор системы', 'по признакам в тексте поста'],
        ['thesis', 'ti-quote', 'Тезис', 'главная мысль крупно'],
        ['num', 'ti-number-123', 'Число', 'цифра, ради которой читают'],
        ['vs', 'ti-arrows-left-right', 'Сравнение', 'два средства бок о бок'],
        ['list', 'ti-list-numbers', 'Список', 'три пункта из подборки'],
        ['ask', 'ti-help-circle', 'Вопрос', 'заход на обсуждение'],
    ];
    var LAY_WHY = {
        num: 'в тексте нет числа с единицей измерения',
        vs: 'в заголовке нет двух коротких названий через «против»',
        list: 'в тексте нет трёх пунктов списком',
        ask: 'нет заголовка',
    };

    function askLayout(id) {
        haptic('light');
        var host = document.getElementById('cp-daybox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-daybox';
        host.className = 'cp-dsov';
        host.innerHTML = '<div class="cp-dsheet"><div class="cp-dsgrab"></div>' +
            '<div class="cp-dsh2"><b>' + esc(T('Композиция обложки')) + '</b></div>' +
            '<div class="cp-dss"><div class="cp-spin sm"></div></div></div>';
        document.body.appendChild(host);
        requestAnimationFrame(function () { host.classList.add('vis'); });

        apiRequest('/api/v1/content-plan/cover/options?post_id=' + id)
            .then(function (r) {
                if (!r || !r.ok) { host.remove(); toast(T('Не удалось открыть выбор')); return; }
                var rows = LAY_INFO.map(function (l) {
                    var can = l[0] === 'auto' || r.available[l[0]];
                    var on = (r.current || 'auto') === l[0];
                    return '<button class="cp-dsr wide' + (on ? ' on' : '') +
                        (can ? '' : ' mut') + '"' + (can ? ' data-clay="' + l[0] + '"' : '') +
                        '><i class="ti ' + l[1] + '"></i><span class="tx"><b>' +
                        esc(T(l[2])) + '</b><em>' +
                        esc(can ? T(l[3]) : T(LAY_WHY[l[0]] || '')) + '</em></span>' +
                        (on ? '<i class="ti ti-check ck"></i>' : '') + '</button>';
                }).join('');
                host.innerHTML = '<div class="cp-dsheet"><div class="cp-dsgrab"></div>' +
                    '<div class="cp-dsh2"><b>' + esc(T('Композиция обложки')) + '</b></div>' +
                    '<div class="cp-dss">' +
                    esc(T('Недоступные не подходят этому тексту — под ними написано почему.')) +
                    '</div>' + rows +
                    '<div class="cp-dshint">' +
                    (r.has_cover
                        ? esc(T('Смена композиции перерисует обложку —')) + ' ' + forgeTag(coverPrice('cover_variant')) + '.'
                        : esc(T('Первая обложка поста рисуется бесплатно.'))) +
                    '</div></div>';
            })
            .catch(function () { host.remove(); toast(T('Не удалось открыть выбор')); });

        host.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-clay]') : null;
            if (b) {
                var lay = b.getAttribute('data-clay');
                host.remove();
                applyLayout(id, lay);
                return;
            }
            if (e.target === host) host.remove();
        });
    }

    function applyLayout(id, layout) {
        if (_mediaBusy[id]) return;
        _mediaBusy[id] = T('Рисую вариант...');
        rerender();
        apiRequest('/api/v1/content-plan/cover/layout',
                   { method: 'POST', body: JSON.stringify({ post_id: id, layout: layout }) })
            .then(function (r) {
                delete _mediaBusy[id];
                if (r && r.ok) {
                    var p = post(id);
                    if (p) { p.media_kind = 'photo'; p.media_url = r.url; p.cover_layout = r.layout; }
                    haptic('light');
                } else if (r && r.error === 'not_available') {
                    toast(T('Эта композиция не подходит тексту поста'));
                } else if (r && r.error === 'not_cover_mode') {
                    toast(T('У поста своя картинка — обложка не рисуется'));
                } else {
                    toast(T('Обложка не обновилась'));
                }
                rerender();
            })
            .catch(function () {
                delete _mediaBusy[id];
                toast(T('Обложка не обновилась'));
                rerender();
            });
    }

    function regenCover(id, what) {
        if (_mediaBusy[id]) return;
        _mediaBusy[id] = what === 'phrase' ? T('Подбираю фразу...') : T('Рисую вариант...');
        rerender();
        apiRequest('/api/v1/content-plan/cover/regen',
                   { method: 'POST', body: JSON.stringify({ post_id: id, what: what }) })
            .then(function (r) {
                delete _mediaBusy[id];
                if (r && r.ok) {
                    var p = post(id);
                    if (p) { p.media_kind = 'photo'; p.media_url = r.url; p.cover_layout = r.layout; }
                    haptic('light');
                    refreshState();
                } else if (r && r.error === 'no_phrase') {
                    toast(T('Не удалось выбрать фразу — попробуй ещё раз'));
                } else if (r && r.error === 'not_cover_mode') {
                    toast(T('У поста своя картинка — обложка не рисуется'));
                } else {
                    toast(T('Обложка не обновилась'));
                }
                rerender();
            })
            .catch(function () {
                delete _mediaBusy[id];
                toast(T('Обложка не обновилась'));
                rerender();
            });
    }


    var COVER_PAL = [
        ['auto', 'mix', '#818cf8', '#34d399', 'Микс'],
        ['indigo', '#0a0d18', '#818cf8', '#c084fc', 'Индиго'],
        ['cobalt', '#070c1a', '#6366f1', '#38bdf8', 'Кобальт'],
        ['steel', '#0b1016', '#60a5fa', '#5eead4', 'Сталь'],
        ['ice', '#06121c', '#38bdf8', '#67e8f9', 'Лёд'],
        ['ocean', '#05131a', '#22d3ee', '#818cf8', 'Океан'],
        ['turquo', '#06141a', '#2dd4bf', '#7dd3fc', 'Бирюза'],
        ['emerald', '#06120f', '#34d399', '#a3e635', 'Изумруд'],
        ['pine', '#08150f', '#4ade80', '#22d3ee', 'Хвоя'],
        ['lime', '#0d1206', '#a3e635', '#fde047', 'Лайм'],
        ['khaki', '#0f1109', '#bef264', '#a8a29e', 'Хаки'],
        ['sand', '#14110a', '#eab308', '#d6d3d1', 'Песок'],
        ['amber', '#140f06', '#fbbf24', '#fb923c', 'Янтарь'],
        ['copper', '#150e09', '#f59e0b', '#fcd34d', 'Медь'],
        ['terra', '#160d09', '#f97316', '#facc15', 'Терракота'],
        ['sunset', '#1a0c08', '#fb7185', '#fbbf24', 'Закат'],
        ['blood', '#150707', '#ef4444', '#f97316', 'Кармин'],
        ['cherry', '#16090c', '#f43f5e', '#fb923c', 'Вишня'],
        ['rose', '#170a12', '#fb7185', '#f0abfc', 'Малина'],
        ['fuchsia', '#150a14', '#e879f9', '#f0abfc', 'Фуксия'],
        ['plum', '#140a16', '#c084fc', '#f472b6', 'Слива'],
        ['violet', '#100a1a', '#a78bfa', '#f472b6', 'Пурпур'],
        ['night', '#080a12', '#a5b4fc', '#7dd3fc', 'Ночь'],
        ['graphite', '#101114', '#cbd5e1', '#94a3b8', 'Графит'],
        ['ink', '#0c0c0d', '#e5e5e7', '#a1a1aa', 'Тушь'],
        ['mint', '#071614', '#2dd4bf', '#86efac', 'Мята'],
        ['olive', '#111206', '#d9f99d', '#fde047', 'Олива'],
        ['coral', '#180b09', '#fb923c', '#fda4af', 'Коралл'],
        ['azure', '#050f1c', '#3b82f6', '#a5b4fc', 'Лазурь'],
        ['jade', '#04130f', '#10b981', '#5eead4', 'Нефрит'],
        ['wine', '#12070c', '#e11d48', '#c084fc', 'Бордо']
    ];
    var SHAPE_GROUP_TITLES = {
        neutral: 'Универсальные', med: 'Медицина и здоровье', travel: 'Путешествия',
        auto: 'Авто и мастерские', food: 'Еда и рестораны', fin: 'Финансы и крипта',
        sport: 'Спорт', beauty: 'Красота и мода', tech: 'IT и технологии',
        edu: 'Образование', psy: 'Психология', estate: 'Недвижимость', kids: 'Дети',
        music: 'Музыка', games: 'Игры', law: 'Право', mkt: 'Маркетинг',
        vlog: 'Влоги и медиа', fun: 'Юмор'
    };

    function shapeGroups() {
        var groups = [];
        var nicheKey = _cover && _cover.niche_key;
        var sets = window.__shapeSets || {};
        if (nicheKey && sets[nicheKey]) {
            groups.push([nicheKey, sets[nicheKey]]);
        }
        groups.push(['neutral', window.__neutralShapes || []]);
        Object.keys(sets).forEach(function (k) {
            if (k !== nicheKey) groups.push([k, sets[k]]);
        });
        return groups;
    }
    var COVER_SIGN = [['full', 'Аватар и имя'], ['name', 'Только имя'], ['none', 'Без подписи']];

    function loadCover() {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid) return;
        apiRequest('/api/v1/content-plan/cover-style?channel_id=' + cid)
            .then(function (r) { if (r && r.ok) { _cover = r; rerender(); } })
            .catch(function () {});
    }

    function saveCover(patch) {
        var cid = _chId || (_state && _state.channel_id);
        if (!cid) { toast(T('Сначала выбери канал')); return; }
        _cover = _cover || {};
        var before = { mode: _cover.mode, palette: _cover.palette,
                       shape: _cover.shape, sign: _cover.sign };
        Object.keys(patch).forEach(function (k) { _cover[k] = patch[k]; });
        var body = { channel_id: cid };
        Object.keys(patch).forEach(function (k) { body[k] = patch[k]; });
        apiRequest('/api/v1/content-plan/cover-style',
                   { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                if (r && r.ok) {
                    _cover.mode = r.mode; _cover.palette = r.palette;
                    _cover.shape = r.shape; _cover.sign = r.sign;
                    rerender();
                    if (r.redrawn) {
                        toast(T('Обновляю обложки постов...'));
                        setTimeout(refreshState, 1800);
                    }
                } else {
                    _cover = before;
                    toast(T('Не удалось сохранить стиль'));
                    rerender();
                }
            })
            .catch(function () {
                _cover = before;
                toast(T('Не удалось сохранить стиль'));
                rerender();
            });
    }

    var _shapeGrpOpen = null;

    function savePostCover(postId, patch, done) {
        var body = { post_id: postId };
        Object.keys(patch).forEach(function (k) { body[k] = patch[k]; });
        apiRequest('/api/v1/content-plan/post-cover-style',
                   { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                if (r && r.ok) {
                    var p = post(postId);
                    if (p) {
                        p.cover_palette = r.cover_palette;
                        p.cover_shape = r.cover_shape;
                        if (r.url) p.media_url = r.url;
                    }
                    if (_lastView === 'week') renderWeek();
                    if (done) done(r);
                } else {
                    toast(T('Не удалось сохранить стиль'));
                }
            })
            .catch(function () { toast(T('Не удалось сохранить стиль')); });
    }

    function askCoverStyle(postId) {
        haptic('light');
        var host = document.getElementById('cp-daybox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-daybox';
        host.className = 'cp-dsov';
        var p0 = postId ? post(postId) : null;
        if (postId && !p0) return;
        var base = _cover || {};
        var c = p0
            ? { mode: base.mode, sign: base.sign, variant: base.variant,
                niche_key: base.niche_key,
                palette: p0.cover_palette || base.palette,
                shape: p0.cover_shape || base.shape }
            : base;
        _shapeGrpOpen = (c.niche_key && (window.__shapeSets || {})[c.niche_key])
            ? c.niche_key : 'neutral';
        var previewSpec = function () {
            var p = p0 || ((_state && _state.posts) || []).filter(function (x) { return x.title; })[0];
            var ch = (_channels || []).filter(function (x) { return x.id === _chId; })[0];
            var title = (p && p.title) || 'Заголовок поста появится здесь';
            var parts = thesisSplit(title);
            return {
                pal: c.palette || 'indigo',
                shape: c.shape || 'auto',
                sign: c.sign || 'full',
                variant: c.variant || 1,
                lay: 'thesis', seed: 7,
                name: ch ? chanSub(ch).replace(/^приватный канал$/, (ch.title || '')) : '',
                avatar: (function () {
                    var u = (ch && ch.avatar_url) || '';
                    if (u && u.charAt(0) === '/' && typeof API_BASE_URL === 'string') {
                        u = API_BASE_URL + u;
                    }
                    return u;
                })(),
                item: parts
            };
        };

        var draw = function () {
            var pal = COVER_PAL.map(function (p) {
                var bg = p[1] === 'mix'
                    ? 'linear-gradient(135deg,#171226,#06120f 55%,#140f06)'
                    : p[1];
                return '<button class="cp-pal' + (c.palette === p[0] ? ' on' : '') +
                    '" data-cpal="' + p[0] + '" style="background:' + bg + '" title="' +
                    esc(T(p[4])) + '"><i style="background:' + p[2] + '"></i>' +
                    '<i style="background:' + p[3] + '"></i></button>';
            }).join('');
            var shp = [['auto', 'На выбор системы'], ['none', 'Без орнамента']].map(function (x) {
                return '<button class="cp-chip' + (c.shape === x[0] ? ' on' : '') +
                    '" data-cshape="' + x[0] + '">' + esc(T(x[1])) + '</button>';
            }).join('');
            var canPrev = typeof window.__shapePreview === 'function';
            var grps = canPrev ? shapeGroups().map(function (g) {
                var open = _shapeGrpOpen === g[0];
                var tiles = '';
                if (open) {
                    tiles = '<div class="cp-shgrid">' + g[1].map(function (k) {
                        return '<button class="cp-shp' + (c.shape === k ? ' on' : '') +
                            '" data-cshape="' + k + '">' +
                            window.__shapePreview(k, c.palette) + '</button>';
                    }).join('') + '</div>';
                }
                return '<div class="cp-shgrp">' +
                    '<button class="cp-shgh" data-cgrp="' + g[0] + '">' +
                    esc(T(SHAPE_GROUP_TITLES[g[0]] || g[0])) +
                    '<i class="ti ti-chevron-' + (open ? 'up' : 'down') + '"></i></button>' +
                    tiles + '</div>';
            }).join('') : '';
            var sgn = COVER_SIGN.map(function (x) {
                return '<button class="cp-chip' + (c.sign === x[0] ? ' on' : '') +
                    '" data-csign="' + x[0] + '">' + esc(T(x[1])) + '</button>';
            }).join('');
            var prev = (typeof window.__coverSvg === 'function')
                ? '<div class="cp-cprev">' + window.__coverSvg(previewSpec()) + '</div>' +
                  '<div class="cp-shauto">' +
                  esc((c.palette === 'auto' || (c.shape || 'auto') === 'auto')
                      ? T('Микс: у каждого поста свои цвета и орнамент, здесь показан один из вариантов.')
                      : T('Выбранный орнамент стоит одинаково на всех обложках — ровно как здесь.')) +
                  '</div>'
                : '';
            var oldSheet = host.querySelector('.cp-dsheet');
            var keepTop = oldSheet ? oldSheet.scrollTop : 0;
            var tail;
            if (p0) {
                tail = ((p0.cover_palette || p0.cover_shape)
                        ? '<button class="cp-dmix" data-creset="1"><i class="ti ti-restore"></i> ' +
                          esc(T('Вернуть стиль канала')) + '</button>'
                        : '') +
                    '<button class="cp-dmix" data-callch="1"><i class="ti ti-color-swatch"></i> ' +
                    esc(T('Стиль всех обложек')) + '</button>' +
                    '<div class="cp-dshint">' +
                    esc(T('Применится только к этому посту, остальные не изменятся.')) +
                    '</div>';
            } else {
                tail = '<div class="cp-clbl">' + esc(T('Подпись канала')) + '</div>' +
                    '<div class="cp-chips">' + sgn + '</div>' +
                    '<button class="cp-dsave" data-csave="1"><i class="ti ti-lock"></i> ' +
                    esc(T('Сохранить стиль навсегда')) + '</button>' +
                    '<button class="cp-dmix" data-cmix="1"><i class="ti ti-arrows-shuffle"></i> ' +
                    esc(T('Микс — у каждого поста свой стиль')) + '</button>' +
                    '<div class="cp-dshint">' +
                    esc(T('Сохранённый стиль применяется ко всем новым постам и автопилоту. Пока не сохранишь — действует микс.')) +
                    '</div>';
            }
            host.innerHTML = '<div class="cp-dsheet">' +
                '<div class="cp-dsgrab"></div>' +
                '<div class="cp-dsh2"><b>' + esc(T(p0 ? 'Стиль этой картинки' : 'Стиль обложек')) + '</b></div>' +
                '<div class="cp-dss">' +
                esc(T(p0 ? 'Меняется только картинка этого поста'
                         : 'Применится к обложкам постов канала')) + '</div>' + prev +
                (!p0 && ((c.shape || 'auto') !== 'auto' && c.shape !== 'none')
                    ? '<div class="cp-clbl">' + esc(T('Вид орнамента')) + '</div>' +
                      '<div class="cp-vstep">' +
                      '<button class="cp-vbtn" data-cvar="-1"><i class="ti ti-minus"></i></button>' +
                      '<span class="cp-vnum">' + Math.max(1, Math.min(12, c.variant || 1)) + ' / 12</span>' +
                      '<button class="cp-vbtn" data-cvar="1"><i class="ti ti-plus"></i></button>' +
                      '<span class="cp-vhint">' + esc(T('листай, глядя на превью')) + '</span>' +
                      '</div>'
                    : '') +
                '<div class="cp-clbl">' + esc(T('Палитра')) + '</div>' +
                '<div class="cp-pals">' + pal + '</div>' +
                '<div class="cp-clbl">' + esc(T('Орнамент')) + '</div>' +
                '<div class="cp-chips">' + shp + '</div>' + grps + tail + '</div>';
            var newSheet = host.querySelector('.cp-dsheet');
            if (newSheet && keepTop) newSheet.scrollTop = keepTop;
        };
        draw();
        document.body.appendChild(host);
        requestAnimationFrame(function () { host.classList.add('vis'); });
        host.addEventListener('click', function (e) {
            var t = e.target;
            var p = t.closest ? t.closest('[data-cpal]') : null;
            if (p) { c.palette = p.getAttribute('data-cpal'); draw(); haptic('light');
                     if (p0) savePostCover(postId, { palette: c.palette }, function () { p0 = post(postId) || p0; draw(); });
                     else saveCover({ palette: c.palette });
                     return; }
            var gr = t.closest ? t.closest('[data-cgrp]') : null;
            if (gr) {
                var gk = gr.getAttribute('data-cgrp');
                _shapeGrpOpen = (_shapeGrpOpen === gk) ? null : gk;
                draw();
                haptic('light');
                return;
            }
            var sh = t.closest ? t.closest('[data-cshape]') : null;
            if (sh) { c.shape = sh.getAttribute('data-cshape'); draw(); haptic('light');
                      if (p0) savePostCover(postId, { shape: c.shape }, function () { p0 = post(postId) || p0; draw(); });
                      else saveCover({ shape: c.shape });
                      return; }
            if (p0 && t.closest && t.closest('[data-callch]')) {
                haptic('light');
                host.remove();
                askCoverStyle();
                return;
            }
            if (p0 && t.closest && t.closest('[data-creset]')) {
                haptic('medium');
                savePostCover(postId, { reset: true }, function () {
                    p0 = post(postId) || p0;
                    c.palette = (_cover || {}).palette;
                    c.shape = (_cover || {}).shape;
                    draw();
                });
                return;
            }
            if (t.closest && t.closest('[data-csave]')) {
                haptic('medium');
                saveCover({ mode: (_cover && _cover.mode) === 'cover' ? 'cover' : 'cover_auto',
                            palette: c.palette, shape: c.shape,
                            sign: c.sign, variant: c.variant });
                toast(T('Стиль сохранён — применяю к обложкам'));
                host.remove();
                return;
            }
            if (t.closest && t.closest('[data-cmix]')) {
                haptic('medium');
                c.palette = 'auto'; c.shape = 'auto';
                saveCover({ palette: 'auto', shape: 'auto', sign: c.sign });
                toast(T('Микс включён — каждый пост будет свой'));
                host.remove();
                return;
            }
            var vb = t.closest ? t.closest('[data-cvar]') : null;
            if (vb) {
                var nv = Math.max(1, Math.min(12, (c.variant || 1) + (+vb.getAttribute('data-cvar'))));
                if (nv !== (c.variant || 1)) {
                    c.variant = nv; draw(); haptic('light');

                }
                return;
            }
            var sg = t.closest ? t.closest('[data-csign]') : null;
            if (sg) { c.sign = sg.getAttribute('data-csign'); draw(); haptic('light');
                      saveCover({ sign: c.sign }); return; }
            if (e.target === host) host.remove();
        });
    }


    function mediaBlock(p) {
        if (p.publish_status === 'published') return '';
        if (_mediaBusy[p.id]) {
            return '<div class="cp-media load"><div class="cp-mfile">' +
                esc(_mediaBusy[p.id]) + '</div><div class="cp-mbar"><i></i></div>' +
                '<div class="cp-mhint">' + esc(T('Загружаю...')) + '</div></div>';
        }
        if (p.media_url) {
            var isVideo = p.media_kind === 'video';
            var isCover = (p.media_url || '').indexOf('/covers/') >= 0;
            var label = isCover ? (T('обложка') + (p.cover_layout ? ' · ' + T(LAY_RU[p.cover_layout] || '') : ''))
                : (p.media_kind === 'animation' ? T('гифка') : (isVideo ? T('видео') : T('картинка')));
            var body = isVideo
                ? '<div class="cp-mfilebg"><i class="ti ti-player-play"></i></div>'
                : '<img src="' + esc(p.media_url) + '" alt="">';
            var warn = (p.text && p.text.length > 1024)
                ? '<div class="cp-mwarn"><i class="ti ti-alert-triangle"></i><span>' +
                  esc(T(isVideo
                      ? 'Текст длиннее 1024 знаков — видео уйдёт отдельным сообщением перед постом.'
                      : 'Текст длиннее 1024 знаков — картинка станет превью над полным текстом.')) +
                  '</span></div>' +
                  (p.is_own ? '' :
                  '<button class="cp-mrepl" data-act="shrink" data-id="' + p.id + '">' +
                  '<i class="ti ti-arrows-minimize"></i>' +
                  esc(T('Ужать текст до подписи')) + ' ' + forgeTag(2) + '</button>')
                : '';
            var row = isCover
                ? '<div class="cp-mrow">' +
                  '<button class="cp-mrepl" data-act="coverregen" data-id="' + p.id +
                  '" data-what="variant"><i class="ti ti-refresh"></i>' +
                  esc(T('Другой вариант')) + ' ' + forgeTag(coverPrice('cover_variant')) + '</button>' +
                  '<button class="cp-mrepl" data-act="coverregen" data-id="' + p.id +
                  '" data-what="phrase"><i class="ti ti-quote"></i>' +
                  esc(T('Другая фраза')) + ' ' + forgeTag(coverPrice('cover_phrase')) + '</button>' +
                  '</div>' +
                  '<div class="cp-mrow">' +
                  '<button class="cp-mrepl" data-act="coverlay" data-id="' + p.id +
                  '"><i class="ti ti-layout-grid"></i>' + esc(T('Композиция')) + '</button>' +
                  '<button class="cp-mrepl" data-act="coverstyle" data-id="' + p.id +
                  '"><i class="ti ti-palette"></i>' +
                  esc(T('Стиль')) + '</button></div>'
                : '<button class="cp-mrepl" data-act="mediapick" data-id="' + p.id + '">' +
                  esc(T('Заменить файл')) + '</button>';
            if (p.is_own) row = ownMediaRow(p, isCover);
            return '<div class="cp-media"><div class="cp-mthumb">' + body +
                '<button class="cp-mx" data-act="mediaclear" data-id="' + p.id + '">' +
                '<i class="ti ti-x"></i></button></div>' +
                '<div class="cp-mfoot">' + esc(label) + '</div>' + warn + row + '</div>';
        }
        if (p.is_own) return '<div class="cp-media">' + ownMediaRow(p, false) + '</div>';
        return '<button class="cp-madd" data-act="mediamode" data-id="' + p.id + '">' +
            '<i class="ti ti-photo-plus"></i>' + esc(T('Добавить картинку')) + '</button>';
    }
    function ownMediaRow(p, isCover) {
        return '<div class="cp-mrow">' +
            '<button class="cp-mrepl" data-act="mediapick" data-id="' + p.id + '"><i class="ti ti-upload"></i>' +
            esc(T(p.media_url ? 'Заменить файлом' : 'Файл с устройства')) + '</button>' +
            '<button class="cp-mrepl" data-act="owncover" data-id="' + p.id + '"><i class="ti ti-photo"></i>' +
            esc(T(isCover ? 'Другая обложка' : 'Обложка в стиле канала')) + ' ' + forgeTag(coverPrice('cover_own')) + '</button>' +
            '</div>';
    }

    function pickFile(id) {
        var inp = document.getElementById('cp-file');
        if (!inp) {
            inp = document.createElement('input');
            inp.type = 'file';
            inp.id = 'cp-file';
            inp.accept = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime';
            inp.style.display = 'none';
            document.body.appendChild(inp);
        }
        inp.onchange = function () {
            var f = inp.files && inp.files[0];
            inp.value = '';
            if (f) sendFile(id, f);
        };
        inp.click();
    }

    function sendFile(id, file) {
        var mb = (file.size / 1048576);
        var limits = { 'image/gif': 12, 'video/mp4': 40, 'video/quicktime': 40 };
        var lim = limits[file.type] || 8;
        if (mb > lim) {
            toast(T('Файл') + ' ' + mb.toFixed(1) + ' ' + T('МБ — это больше предела в') +
                ' ' + lim + ' ' + T('МБ'));
            return;
        }
        _mediaBusy[id] = file.name + ' · ' + mb.toFixed(1) + ' ' + T('МБ');
        rerender();
        var fd = new FormData();
        fd.append('post_id', id);
        fd.append('file', file);
        apiRequest('/api/v1/content-plan/media', { method: 'POST', body: fd })
            .then(function (r) {
                delete _mediaBusy[id];
                if (r && r.ok) {
                    var p = post(id);
                    if (p) { p.media_kind = r.kind; p.media_url = r.url; }
                    haptic('light');
                    rerender();
                } else if (r && r.error === 'too_big') {
                    toast(T('Файл больше предела в') + ' ' + r.limit_mb + ' ' + T('МБ'));
                    rerender();
                } else if (r && r.error === 'bad_type') {
                    toast(T('Такой формат не подойдёт: нужна картинка, GIF или видео'));
                    rerender();
                } else {
                    toast(T('Файл не загрузился'));
                    rerender();
                }
            })
            .catch(function () {
                delete _mediaBusy[id];
                toast(T('Файл не загрузился'));
                rerender();
            });
    }

    function clearMedia(id) {
        apiRequest('/api/v1/content-plan/media/clear',
                   { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) {
                if (r && r.ok) {
                    var p = post(id);
                    if (p) { p.media_kind = null; p.media_url = null; }
                    haptic('medium');
                    rerender();
                } else toast(T('Не удалось снять файл'));
            })
            .catch(function () { toast(T('Не удалось снять файл')); });
    }

    function askMedia(id) {
        haptic('light');
        var host = document.getElementById('cp-daybox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-daybox';
        host.className = 'cp-dsov';
        var p = post(id) || {};
        var mode = (_cover && _cover.mode) || 'none';
        var opts = [
            ['none', 'ti-minus', 'Без картинки', 'уйдёт только текст'],
            ['own', 'ti-upload', 'Своя картинка, GIF или видео', 'загрузить файл с телефона'],
            ['cover', 'ti-photo', 'Обложка — композицию выберу сам', 'тезис, число, сравнение...'],
            ['cover_auto', 'ti-sparkles', 'Обложка — композицию выберет система',
             'по признакам в тексте поста'],
        ];
        host.innerHTML = '<div class="cp-dsheet">' +
            '<div class="cp-dsgrab"></div>' +
            '<div class="cp-dsh2"><b>' + esc(T('Картинка поста')) + '</b></div>' +
            '<div class="cp-dss">' + esc((p.slot_hm || '') + ' · ' +
                (p.title || '').slice(0, 46)) + '</div>' +
            opts.map(function (o) {
                return '<button class="cp-dsr wide' + (mode === o[0] ? ' on' : '') +
                    '" data-mmode="' + o[0] + '"><i class="ti ' + o[1] + '"></i>' +
                    '<span class="tx"><b>' + esc(T(o[2])) + '</b>' +
                    '<em>' + esc(T(o[3])) + '</em></span>' +
                    (mode === o[0] ? '<i class="ti ti-check ck"></i>' : '') + '</button>';
            }).join('') +
            ((mode === 'cover' || mode === 'cover_auto')
                ? '<button class="cp-dsr wide" data-mstyle="1"><i class="ti ti-palette"></i>' +
                  '<span class="tx"><b>' + esc(T('Стиль этой картинки')) + '</b>' +
                  '<em>' + esc(T('палитра и орнамент — только для этого поста')) + '</em></span>' +
                  '<i class="ti ti-chevron-right ck"></i></button>' +
                  '<button class="cp-dsr wide" data-mstyleall="1"><i class="ti ti-color-swatch"></i>' +
                  '<span class="tx"><b>' + esc(T('Стиль всех обложек')) + '</b>' +
                  '<em>' + esc(T('один стиль или микс — сразу для всего канала')) + '</em></span>' +
                  '<i class="ti ti-chevron-right ck"></i></button>'
                : '') +
            '<div class="cp-dshint">' +
            esc(T('Режим запоминается для канала. У отдельного поста его всегда можно поменять здесь же.')) +
            '</div></div>';
        document.body.appendChild(host);
        requestAnimationFrame(function () { host.classList.add('vis'); });
        host.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('[data-mstyleall]')) {
                host.remove();
                askCoverStyle();
                return;
            }
            if (e.target.closest && e.target.closest('[data-mstyle]')) {
                host.remove();
                askCoverStyle(id);
                return;
            }
            var b = e.target.closest ? e.target.closest('[data-mmode]') : null;
            if (b) {
                var m = b.getAttribute('data-mmode');
                host.remove();
                saveCover({ mode: m });
                if (m === 'own') pickFile(id);
                return;
            }
            if (e.target === host) host.remove();
        });
    }

    function detailPanel() {
        var ps = posts();
        var p = ps.filter(function (x) { return x.day_index === _selDay; })[0];
        if (!p) return '';
        var fi = fmtInfo(p.format);
        var wd = WD[(p.day_index || 0) % 7];
        var conf = p.is_own ? ['своё время', 'hi']
            : (p.slot_conf === 'measured') ? ['по замерам канала', 'hi']
            : (p.slot_conf === 'probe') ? ['проба окна', 'hi']
            : (p.slot_conf === 'high') ? ['по данным канала', 'hi'] : ['время по нише', 'lo'];
        var slot = p.slot_hm ? '<div class="cp-dslot2"><i class="ti ti-clock"></i>' + esc(p.slot_hm + slotHint(p.slot_hm)) +
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
        if (_editing[p.id] && p.text) {
            body = editBlock(p);
        } else if (_dayBusy[p.id]) {
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
        } else if (p.publish_status === 'needs_check') {
            body = '<div class="cp-dtext2">' + esc(p.text) + '</div><div class="cp-dacts">' +
                '<button class="cp-act" data-act="canceld" data-id="' + p.id + '"><i class="ti ti-calendar-off"></i> ' + esc(T('Снять с очереди')) + '</button>' + pubc + '</div>' +
                '<div class="cp-note fail">' + esc(T('Публикация остановлена: текст задел ограничения площадки. Сними пост с очереди, поправь формулировки и запланируй заново.')) + '</div>';
        } else if (p.publish_status === 'failed') {
            body = '<div class="cp-dtext2">' + esc(p.text) + '</div><div class="cp-dacts">' +
                '<button class="cp-act ok" data-act="approve" data-id="' + p.id + '"><i class="ti ti-circle-check"></i> ' + esc(T('Утвердить')) + '</button>' + pubc + '</div>' +
                '<div class="cp-note fail">' + esc(T('Пост не отправлен. Проверь права бота и запланируй заново.')) + '</div>';
        } else if (p.text) {
            var queueBtn = (_state && _state.status === 'scheduled' && p.status === 'approved')
                ? '<button class="cp-act ok" data-act="queue1" data-id="' + p.id + '"><i class="ti ti-calendar-plus"></i> ' +
                  esc(T('Вернуть в очередь')) + '</button>'
                : '';
            var nowBtn = (p.status === 'approved' && _state && _state.can_post !== false)
                ? '<button class="cp-act ok" data-act="pubnow" data-id="' + p.id + '"><i class="ti ti-send"></i> ' +
                  esc(T('Выпустить сейчас')) + '</button>'
                : '';
            var resBtn = p.research_links
                ? '<button class="cp-act" data-act="resdel" data-id="' + p.id + '"><i class="ti ti-file-search"></i> ' +
                  esc(T('Убрать исследования')) + '</button>'
                : '<button class="cp-act" data-act="resadd" data-id="' + p.id + '"><i class="ti ti-file-search"></i> ' +
                  esc(T('Исследования')) + ' ' + forgeTag(priceResearch()) + '</button>';
            body = '<div class="cp-dtext2">' + esc(p.text) + '</div>' +
                '<div class="cp-dacts">' +
                '<button class="cp-act ' + (p.status === 'approved' ? 'okon' : 'ok') + '" data-act="approve" data-id="' + p.id + '">' +
                '<i class="ti ti-' + (p.status === 'approved' ? 'circle-check-filled' : 'circle-check') + '"></i> ' +
                esc(T(p.status === 'approved' ? 'Утверждён' : 'Утвердить')) + '</button>' +
                nowBtn + queueBtn +
                (p.is_own ? '' :
                '<button class="cp-act" data-act="variant" data-id="' + p.id + '"><i class="ti ti-refresh"></i> ' + esc(T('Ещё вариант')) + ' ' +
                forgeTag(priceDay()) + '</button>' +
                resBtn) +
                '<button class="cp-act" data-act="editpost" data-id="' + p.id + '"><i class="ti ti-pencil"></i> ' + esc(T('Править')) + '</button>' + pubc + '</div>';
        } else {
            body = (p.angle ? '<div class="cp-dangle2">' + esc(p.angle) + '</div>' : '') +
                '<button class="cp-act gen wide" data-act="genday" data-id="' + p.id + '"><i class="ti ti-wand"></i> ' + esc(T('Написать текст')) + '</button>' + factNote(p);
        }
        return '<div class="cp-detail">' +
            '<div class="cp-dtop2"><span class="d2">' + esc(T(wd)) + '</span><span class="dt2">' + esc(dateLabel(p.date_iso)) + '</span>' +
            '<span class="cp-fmt"><i class="ti ' + fi[1] + '"></i>' + esc(T(fi[0])) + '</span></div>' +
            slot + '<div class="cp-dtitle2">' + esc(p.title || '') + '</div>' +
            mediaBlock(p) + adRow + body + '</div>';
    }

    function factNote(p) {
        var r = _rubrics.filter(function (x) { return x.key === p.format; })[0];
        if (!r || !r.needs_fact || p.text) return '';
        return '<div class="cp-hint" style="margin-top:8px">' +
            esc(T('Эта рубрика пишется по твоей фактуре: бот спросит пару строк за день до выхода, текст появится после ответа.')) +
            '</div>';
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
            .catch(function (err) { _dayBusy[id] = false; toast(apiErrText(err, 'Не удалось написать текст')); renderWeek(); });
    }

    var _genAllBusy = false;
    function genAll() {
        var pending = (_state.posts || []).filter(function (p) { return !p.text; });
        if (!pending.length || _genAllBusy || _batchTimer) return;
        _genAllBusy = true;
        haptic('medium');
        pending.forEach(function (p) { _dayBusy[p.id] = true; });
        renderWeek();
        apiRequest('/api/v1/content-plan/generate-all',
                   { method: 'POST', body: JSON.stringify({ channel_id: _chId || (_state && _state.channel_id) }) })
            .then(function (r) {
                _genAllBusy = false;
                if (r && r.ok) { toast(T('Пишу всю неделю — карточки будут заполняться')); startBatchPoll(); }
                else {
                    pending.forEach(function (p) { _dayBusy[p.id] = false; });
                    toast(cap(r));
                    renderWeek();
                }
            })
            .catch(function () { pending.forEach(function (p) { _dayBusy[p.id] = false; }); toast(T('Не удалось запустить генерацию')); renderWeek(); });
    }

    function startBatchPoll() {
        if (_batchTimer) clearInterval(_batchTimer);
        var prevN = (_state.posts || []).filter(function (p) { return p.text; }).length;
        var ticks = 0, quiet = 0;
        var canDraw = function () {
            return _open && _lastView === 'week'
                && !Object.keys(_editing).some(function (k) { return _editing[k]; })
                && (!window.FMLive || window.FMLive.idleMs() > 6000);
        };
        _batchTimer = setInterval(function () {
            ticks++;
            var pcid = _chId || (_state && _state.channel_id);
            apiRequest('/api/v1/content-plan' + (pcid ? '?channel_id=' + pcid : '')).then(function (d) {
                if (!d || !d.ok) return;
                _state = d;
                pushBalance(d);
                var withText = (d.posts || []).filter(function (p) { return p.text; });
                withText.forEach(function (p) { _dayBusy[p.id] = false; });
                var pending = (d.posts || []).filter(function (p) { return !p.text; }).length;
                var grew = withText.length !== prevN;
                quiet = grew ? 0 : quiet + 1;
                prevN = withText.length;
                if ((grew || !pending) && canDraw()) renderWeek();
                var stalled = !d.batch_running && !grew && quiet > 3;
                if (!pending || ticks > 80 || stalled) {
                    clearInterval(_batchTimer); _batchTimer = null;
                    for (var k in _dayBusy) _dayBusy[k] = false;
                    if (pending && stalled) {
                        toast(T('Часть текстов не написалась — открой пост и попробуй ещё раз'));
                    }
                    if (canDraw()) renderWeek();
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
        var pcid = _chId || (_state && _state.channel_id);
        apiRequest('/api/v1/content-plan' + (pcid ? '?channel_id=' + pcid : ''))
            .then(function (d) {
                if (d && d.ok && _open) {
                    _state = d; pushBalance(d);
                    syncDays(d);
                    if (_chId) loadRubrics();
                    if (cpBusy()) return;
                    var sy = window.scrollY; rerender(); window.scrollTo(0, sy);
                }
            })
            .catch(function () {});
    }

    if (window.FMLive) window.FMLive.register('content-plan', 60000, function () {
        if (!_open || _building || _pollTimer || cpBusy()) return false;
        refreshState();
        return true;
    });

    function onClick(ev) {
        var t = ev.target;
        if (!canEdit()) {
            var gEl = t.closest ? t.closest('[data-act],[data-chip]') : null;
            if (gEl) {
                var gAct = gEl.getAttribute('data-act');
                if (!gAct || !VIEW_ACTS[gAct]) { denyEdit(); return; }
            }
        }
        var gq = t.closest ? t.closest('[data-act="goalinfo"]') : null;
        if (gq) {
            haptic('light');
            var _gqv = gq.getAttribute('data-v');
            _goalInfo = (_goalInfo === _gqv) ? null : _gqv;
            if (_lastView === 'week') renderWeek(); else renderBrief();
            return;
        }
        var chip = t.closest ? t.closest('[data-chip]') : null;
        if (chip) {
            var name = chip.getAttribute('data-chip'), v = chip.getAttribute('data-v');
            if (name === 'goal') {
                _goalTouched = true;
                var parts = (_goal || 'engagement').split('+').filter(Boolean);
                var at = parts.indexOf(v);
                if (at >= 0) {
                    if (parts.length > 1) parts.splice(at, 1);
                } else {
                    parts.push(v);
                    if (parts.length > 2) parts.shift();
                }
                _goal = parts.join('+');
                saveDaysSoon();
            }
            var wrap = chip.closest('.cp-goals') || chip.parentElement;
            var sel = (_goal || '').split('+');
            wrap.querySelectorAll('[data-chip]').forEach(function (b) {
                if (name === 'goal') b.classList.toggle('on', sel.indexOf(b.getAttribute('data-v')) >= 0);
                else b.classList.toggle('on', b === chip);
            });
            haptic('light');
            if (_lastView === 'week') renderWeek(); else renderBrief();
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
            dd[tp.weak] = { n: leftN, pins: dayPins(tp.weak).slice(0, leftN),
                            times: dayTimes(tp.weak).slice(0, leftN) };
            dd[tp.strong] = { n: dayN(tp.strong) + mv, pins: dayPins(tp.strong),
                              times: dayTimes(tp.strong).slice() };
            _days = dd;
            _cal.tip = null;
            renderBrief();
            loadCalendarSoon();
            saveDaysSoon();
            return;
        }
        if (act === 'archtoggle') {
            haptic('light');
            _archOpen = !_archOpen;
            renderWeek();
            return;
        }
        if (act === 'applyfreq') {
            haptic('medium');
            applyFreqGrid(+actEl.getAttribute('data-n'));
            renderBrief();
            loadCalendarSoon();
            saveDaysSoon();
            toast(T('Сетка недели обновлена'));
            return;
        }
        if (act === 'review') {
            haptic('light');
            if (_review) renderReview();
            else { renderCenter('<div class="cp-spin"></div>', T('Считаю...')); loadReview(true); }
            return;
        }
        if (act === 'revback') { haptic('light'); rerender(); return; }
        if (act === 'admark') { askAd(+actEl.getAttribute('data-id')); return; }
        if (act === 'mediamode') { askMedia(+actEl.getAttribute('data-id')); return; }
        if (act === 'mediapick') { haptic('light'); pickFile(+actEl.getAttribute('data-id')); return; }
        if (act === 'ownweek') { doOwnWeek(); return; }
        if (act === 'owncover') { ownCoverFor(+actEl.getAttribute('data-id')); return; }
        if (act === 'mediaclear') { clearMedia(+actEl.getAttribute('data-id')); return; }
        if (act === 'coverstyle') { askCoverStyle(+actEl.getAttribute('data-id') || null); return; }
        if (act === 'editpost') {
            haptic('light');
            _editing[+actEl.getAttribute('data-id')] = true;
            renderWeek();
            return;
        }
        if (act === 'editcancel') {
            delete _editing[+actEl.getAttribute('data-id')];
            renderWeek();
            return;
        }
        if (act === 'editsave') { saveEdit(+actEl.getAttribute('data-id')); return; }
        if (act === 'shrink') {
            var sid = +actEl.getAttribute('data-id');
            if (_mediaBusy[sid]) return;
            haptic('medium');
            _mediaBusy[sid] = T('Ужимаю текст...');
            rerender();
            apiRequest('/api/v1/content-plan/shrink-post',
                       { method: 'POST', body: JSON.stringify({ post_id: sid }) })
                .then(function (r) {
                    delete _mediaBusy[sid];
                    if (r && r.ok) {
                        var p = post(sid);
                        if (p) { p.text = r.text; p.status = 'draft'; }
                        toast(T('Готово:') + ' ' + r.chars + ' ' + T('знаков — выйдет одним сообщением'));
                    } else if (r && r.error === 'already_fits') {
                        toast(T('Текст уже помещается в подпись'));
                    } else {
                        toast(T('Не удалось ужать — попробуй ещё раз'));
                    }
                    rerender();
                })
                .catch(function () {
                    delete _mediaBusy[sid];
                    toast(T('Не удалось ужать — попробуй ещё раз'));
                    rerender();
                });
            return;
        }
        if (act === 'coverlay') { askLayout(+actEl.getAttribute('data-id')); return; }
        if (act === 'coverregen') {
            haptic('medium');
            regenCover(+actEl.getAttribute('data-id'), actEl.getAttribute('data-what'));
            return;
        }
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
        if (act === 'mchoice') {
            var mv = actEl.getAttribute('data-m') === 'standard' ? 'standard' : 'premium';
            _modelTouched = true;
            if (mv !== _model) { _model = mv; haptic('light'); renderBrief(); }
            return;
        }
        if (act === 'sgtog') { haptic('light'); _sgOpen = !_sgOpen; renderBrief(); return; }
        if (act === 'generate') { doGenerate(actEl); return; }
        if (act === 'cpwd') {
            haptic('light');
            _cpwDay = +actEl.getAttribute('data-v');
            renderBrief();
            return;
        }
        if (act === 'cpwslot') {
            haptic('light');
            _cpwSheet = { day: +actEl.getAttribute('data-v'), slot: +actEl.getAttribute('data-k') };
            renderBrief();
            return;
        }
        if (act === 'cpwadd') {
            haptic('light');
            var _ai = +actEl.getAttribute('data-v');
            if (dayN(_ai) >= MAX_PER_DAY) {
                toast(T('В одном дне не больше десяти постов'));
                return;
            }
            if (totalPosts() + 1 > MAX_WEEK) {
                toast(T('Больше семидесяти постов в неделю не собирается'));
                return;
            }
            _cpwSheet = { day: _ai, slot: dayN(_ai), fresh: true };
            renderBrief();
            return;
        }
        if (act === 'cpwdrop') {
            haptic('medium');
            var _di = +actEl.getAttribute('data-v'), _dk = +actEl.getAttribute('data-k');
            if (dropSlot(_di, _dk)) {
                _cpwSheet = null;
                saveDaysSoon();
                loadCalendarSoon();
                renderBrief();
            }
            return;
        }
        if (act === 'cpwhour') {
            haptic('light');
            var _hv = actEl.getAttribute('data-v') || '';
            if (_cpwSheet) {
                if (!_hv) setTime(_cpwSheet.day, _cpwSheet.slot, '');
                else setTime(_cpwSheet.day, _cpwSheet.slot,
                    _hv + ':' + ((dayTimes(_cpwSheet.day)[_cpwSheet.slot] || '').slice(3) || '00'));
                saveDaysSoon();
                loadCalendarSoon();
                renderBrief();
            }
            return;
        }
        if (act === 'cpwmin') {
            haptic('light');
            if (_cpwSheet) {
                var _bd = _cpwSheet.day, _bk = _cpwSheet.slot;
                var _base = (dayTimes(_bd)[_bk] || '').slice(0, 2) ||
                    (cpwSlotTime(_bd, _bk).at || '12:00').slice(0, 2);
                setTime(_bd, _bk, _base + ':' + actEl.getAttribute('data-v'));
                saveDaysSoon();
                loadCalendarSoon();
                renderBrief();
            }
            return;
        }
        if (act === 'cpwpick') {
            haptic('light');
            var _pv = actEl.getAttribute('data-v') || '';
            if (!cpwCommitSlot()) return;
            if (!_pv) _topicCleared[_cpwSheet.day + '_' + _cpwSheet.slot] = 1;
            setSlotTopic(_cpwSheet.day, _cpwSheet.slot, _pv);
            _cpwSheet = null;
            renderBrief();
            return;
        }
        if (act === 'cpwown') {
            var _ti = document.getElementById('cpw-ti');
            var _tv = (_ti && _ti.value || '').trim();
            haptic('light');
            if (!_tv && _cpwSheet && _cpwSheet.fresh) { _cpwSheet = null; renderBrief(); return; }
            if (!cpwCommitSlot()) return;
            if (!_tv) _topicCleared[_cpwSheet.day + '_' + _cpwSheet.slot] = 1;
            setSlotTopic(_cpwSheet.day, _cpwSheet.slot, _tv);
            _cpwSheet = null;
            renderBrief();
            return;
        }
        if (act === 'cpwx') {
            if (t.closest && t.closest('.cpw-sheet') && !t.closest('.cpw-close')) return;
            _cpwSheet = null;
            renderBrief();
            return;
        }
        if (act === 'gsec') {
            var gwrap = actEl.closest('.cpg-sec');
            if (gwrap) {
                gwrap.classList.toggle('open');
                var gst = gsecSt();
                gst[actEl.getAttribute('data-v')] = gwrap.classList.contains('open') ? 1 : 0;
                try { localStorage.setItem(GSEC_LS, JSON.stringify(gst)); } catch (e) {}
            }
            return;
        }
        if (act === 'strhide') {
            try { localStorage.setItem('fm_cp_strhide', '1'); } catch (e) {}
            haptic('light');
            renderBrief();
            return;
        }
        if (act === 'gotoarch') {
            haptic('light');
            _archOpen = true;
            _wantView = null;
            renderWeek();
            return;
        }
        if (act === 'regen') {
            haptic('light');
            _wantView = 'brief';
            renderBrief();
            var _host = ensureScreen();
            if (_host) _host.scrollTop = 0;
            return;
        }
        if (act === 'wkday') {
            haptic('light');
            weekDaySheet(+actEl.getAttribute('data-day'));
            return;
        }
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
        if (act === 'weekreset') { doWeekReset(); return; }
        if (act === 'canceld') { cancelDay(+id); return; }
        if (act === 'queue1') { queueDay(+id); return; }
        if (act === 'pubnow') { publishNow(+id); return; }
        if (act === 'resadd') { researchAdd(+id); return; }
        if (act === 'resdel') { researchRemove(+id); return; }
        if (act === 'rollback') { rollbackDay(+id); return; }
        if (act === 'openpost') {
            var url = actEl.getAttribute('data-url');
            haptic('light');
            try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) return tg.openTelegramLink(url); } catch (e) {}
            try { window.open(url, '_blank'); } catch (e) {}
            return;
        }
    }

    var _schedBusy = false;
    function doSchedule() {
        if (_schedBusy) return;
        if (!_state.can_post) {
            toast(T('Добавь @ForgeMetricsBot администратором канала с правом публикации — тогда посты смогут выходить сами.'));
            return;
        }
        _schedBusy = true;
        haptic('medium');
        apiRequest('/api/v1/content-plan/schedule',
                   { method: 'POST', body: JSON.stringify({ channel_id: _chId || (_state && _state.channel_id) }) })
            .then(function (r) {
                _schedBusy = false;
                if (r && r.ok) { toast(T('Неделя запланирована — посты выйдут в канал сами')); refreshState(); }
                else if (r && r.error === 'no_bot_rights') toast(T('Добавь @ForgeMetricsBot администратором канала с правом публикации — тогда посты смогут выходить сами.'));
                else if (r && r.error === 'nothing_approved') toast(T('Сначала утверди хотя бы один пост.'));
                else toast(T('Не удалось запланировать'));
            })
            .catch(function () { _schedBusy = false; toast(T('Не удалось запланировать')); });
    }
    function doUnschedule() {
        if (_schedBusy) return;
        _schedBusy = true;
        haptic('medium');
        apiRequest('/api/v1/content-plan/unschedule',
                   { method: 'POST', body: JSON.stringify({ channel_id: _chId || (_state && _state.channel_id) }) })
            .then(function (r) {
                _schedBusy = false;
                if (r && r.ok) { toast(T('Неделя снята с очереди')); refreshState(); }
                else toast(T('Не удалось снять с очереди'));
            })
            .catch(function () { _schedBusy = false; toast(T('Не удалось снять с очереди')); });
    }
    function doWeekReset() {
        if (_schedBusy) return;
        haptic('medium');
        confirmDialog('Сбросить неделю?\n\nПлан и невышедшие посты будут удалены. ' +
            'Вышедшее в канале останется на месте. После сброса можно собрать неделю заново.',
            'Сбросить').then(function (ok) {
            if (!ok) return;
            _schedBusy = true;
            apiRequest('/api/v1/content-plan/reset',
                       { method: 'POST', body: JSON.stringify({ channel_id: _chId || (_state && _state.channel_id) }) })
                .then(function (r) {
                    _schedBusy = false;
                    if (r && r.ok) {
                        _days = null; _cal = null; _review = null;
                        toast(T('Неделя сброшена'));
                        window.__openContentPlan();
                    } else toast(T('Не удалось сбросить неделю'));
                })
                .catch(function () { _schedBusy = false; toast(T('Не удалось сбросить неделю')); });
        });
    }
    function queueDay(id) {
        haptic('light');
        apiRequest('/api/v1/content-plan/queue-day', { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) {
                if (r && r.ok) { toast(T('Пост вернулся в очередь')); refreshState(); }
                else if (r && r.error === 'no_bot_rights') toast(T('Добавь @ForgeMetricsBot администратором канала с правом публикации — тогда посты смогут выходить сами.'));
                else toast(T('Не удалось вернуть пост в очередь'));
            })
            .catch(function () { toast(T('Не удалось вернуть пост в очередь')); });
    }
    function publishNow(id) {
        haptic('medium');
        confirmDialog('Выпустить пост в канал сейчас?\n\nОн уйдёт в канал в течение минуты, не дожидаясь своего времени.',
            'Выпустить').then(function (ok) {
            if (!ok) return;
            apiRequest('/api/v1/content-plan/publish-now', { method: 'POST', body: JSON.stringify({ post_id: id }) })
                .then(function (r) {
                    if (r && r.ok) { toast(T('Пост отправляется в канал')); refreshState(); }
                    else if (r && r.error === 'not_approved') toast(T('Сначала утверди пост'));
                    else if (r && r.error === 'no_bot_rights') toast(T('Добавь @ForgeMetricsBot администратором канала с правом публикации — тогда посты смогут выходить сами.'));
                    else if (r && r.error === 'paused') toast(T('Канал на паузе — публикация не проходит.'));
                    else toast(T('Не удалось выпустить пост'));
                })
                .catch(function () { toast(T('Не удалось выпустить пост')); });
        });
    }
    function cancelDay(id) {
        haptic('light');
        apiRequest('/api/v1/content-plan/cancel-day', { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) { if (r && r.ok) { toast(T('Пост снят с очереди')); refreshState(); } else toast(T('Не удалось снять с очереди')); })
            .catch(function () { toast(T('Не удалось снять с очереди')); });
    }
    var _resBusy = {};
    function researchAdd(id) {
        if (_resBusy[id]) return;
        _resBusy[id] = true;
        haptic('light');
        toast(T('Ищу и проверяю исследования — обычно около минуты'));
        apiRequest('/api/v1/content-plan/research-add', { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) {
                delete _resBusy[id];
                if (r && r.ok && r.links) {
                    var p = post(id);
                    if (p) { p.text = r.text; p.research_links = true; }
                    toast(T('Ссылки на исследования добавлены'));
                    refreshState();
                } else if (r && r.ok) {
                    toast(T('Подтверждённых работ не нашлось — пост остался без ссылок. Вернули 15 из 20: удержан сбор за поиск и сверку источников.'));
                    refreshState();
                } else if (r && r.error === 'already_out') {
                    toast(T('Пост уже в очереди — сначала сними неделю с выхода'));
                } else toast(cap(r));
            })
            .catch(function (err) {
                delete _resBusy[id];
                toast(apiErrText(err, 'Не удалось добавить исследования'));
            });
    }
    function researchRemove(id) {
        haptic('light');
        apiRequest('/api/v1/content-plan/research-remove', { method: 'POST', body: JSON.stringify({ post_id: id }) })
            .then(function (r) {
                if (r && r.ok) {
                    var p = post(id);
                    if (p) { p.text = r.text; p.research_links = false; }
                    toast(T('Ссылки на исследования убраны'));
                    refreshState();
                } else toast(T('Не удалось убрать ссылки'));
            })
            .catch(function () { toast(T('Не удалось убрать ссылки')); });
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
