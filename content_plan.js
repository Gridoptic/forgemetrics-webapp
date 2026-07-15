/* Контент-план на неделю — MVP «Ассистент» (флагман, утверждён 15.07.2026).
   Экраны: бриф (канал → цель → частота) → сборка (поллинг) → лента недели → карточка дня.
   ИИ придумывает сюжет недели и идеи; тексты пишутся лениво по кнопке. Без автопостинга (фаза 1). */
(function () {
    'use strict';

    var _state = null;          // последний ответ GET /content-plan
    var _pollTimer = null, _genTimer = null;
    var _channels = null;       // список каналов юзера
    var _chId = null;           // выбранный канал брифа
    var _goal = 'engagement';
    var _freq = 7;
    var _open = {};             // day_index -> раскрыта ли карточка
    var _dayBusy = {};          // post_id -> идёт генерация текста

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }
    function esc(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} }
    function toast(m) { try { if (typeof showToast === 'function') return showToast(m); } catch (e) {} try { if (typeof alertDialog === 'function') alertDialog(m); } catch (e) {} }

    var WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    var GOALS = [
        ['growth', 'Рост подписчиков'], ['engagement', 'Вовлечённость'],
        ['sales', 'Продажи / офферы'], ['warmup', 'Прогрев к запуску'], ['retention', 'Удержание'],
    ];
    var GOAL_MAP = { growth: 'Рост подписчиков', engagement: 'Вовлечённость', sales: 'Продажи / офферы', warmup: 'Прогрев к запуску', retention: 'Удержание' };
    var FMT = {
        news: ['Новость', 'ti-news'], analysis: ['Разбор', 'ti-microscope'], case: ['Кейс', 'ti-trophy'],
        listicle: ['Подборка', 'ti-list-check'], offer: ['Оффер', 'ti-building-store'],
        poll: ['Опрос', 'ti-chart-bar'], story: ['История', 'ti-book'], engagement: ['Вовлечение', 'ti-message-circle'],
    };
    var GEN_TEXTS = [
        'Смотрю ритм и тему канала...',
        'Подбираю форматы под цель недели...',
        'Развожу идеи, чтобы не повторяться...',
        'Складываю неделю в единый сюжет...',
    ];

    // ==================== каркас ====================
    function ensureScreen() {
        var host = document.getElementById('content-plan-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'content-plan-screen';
            host.className = 'cp-screen';
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
        stopTimers();
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
    function setView(html) {
        var host = ensureScreen();
        stopTimers();
        host.innerHTML = headHtml() + html;
        host.scrollTop = 0;
        return host;
    }
    function renderCenter(icon, msg, sub) {
        setView('<div class="cp-center"><div class="big">' + icon + '</div><div class="m">' + esc(msg) + '</div>' +
            (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>');
    }

    window.__openContentPlan = function () {
        ensureScreen();
        renderCenter('<div class="cp-spin"></div>', T('Секунду...'));
        apiRequest('/api/v1/content-plan').then(route).catch(function () {
            renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.'));
        });
    };

    function route(d) {
        if (!d || !d.ok) { renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.')); return; }
        _state = d;
        if (d.status === 'generating') { renderGenerating(); startPoll(); return; }
        if (d.status === 'ready' || d.status === 'scheduled' || d.status === 'done') { renderWeek(); return; }
        if (d.status === 'error') { renderError(); return; }
        // none → бриф (сначала грузим каналы)
        if (_channels === null) {
            apiRequest('/api/v1/channels/active').then(function (cd) {
                _channels = (cd && cd.channels) ? cd.channels.filter(function (c) { return c.username; }) : [];
                if (_chId == null && cd && cd.active_channel_id) _chId = cd.active_channel_id;
                if (_chId == null && _channels.length) _chId = _channels[0].id;
                renderBrief();
            }).catch(function () { _channels = []; renderBrief(); });
        } else { renderBrief(); }
    }

    // ==================== 1. Бриф ====================
    function chip(name, val, cur, label) {
        return '<button class="cp-chip' + (val === cur ? ' on' : '') + '" data-chip="' + name + '" data-v="' + esc(val) + '">' + esc(T(label)) + '</button>';
    }
    function renderBrief() {
        var chanBlock;
        if (!_channels || !_channels.length) {
            chanBlock = '<div class="cp-hint">' + esc(T('Канал не подключён — план соберётся в нейтральном стиле. Подключи канал, чтобы писать точно в его голосе.')) + '</div>';
        } else if (_channels.length === 1) {
            var c = _channels[0]; _chId = c.id;
            chanBlock = '<div class="cp-onechan"><div class="av">' + esc((c.title || c.username || '?').charAt(0).toUpperCase()) + '</div>' +
                '<div class="nm"><b>' + esc(c.title || ('@' + c.username)) + '</b><span>@' + esc(c.username) + '</span></div></div>';
        } else {
            chanBlock = '<div class="cp-chans">' + _channels.map(function (c) {
                return '<button class="cp-chan' + (c.id === _chId ? ' on' : '') + '" data-chan="' + c.id + '">' +
                    '<span class="av">' + esc((c.title || c.username || '?').charAt(0).toUpperCase()) + '</span>' +
                    '<span class="nm">' + esc(c.title || ('@' + c.username)) + '</span></button>';
            }).join('') + '</div>';
        }
        var goals = GOALS.map(function (g) { return chip('goal', g[0], _goal, g[1]); }).join('');
        var freqs = [3, 5, 7].map(function (n) {
            return '<button class="cp-chip' + (n === _freq ? ' on' : '') + '" data-chip="freq" data-v="' + n + '">' + n + '</button>';
        }).join('');
        setView(
            '<div class="cp-intro"><div class="cp-introic"><i class="ti ti-calendar-week"></i></div>' +
            '<div class="cp-introt">' + esc(T('Редакция канала под ключ')) + '</div>' +
            '<div class="cp-intros">' + esc(T('ИИ придумает сюжет недели и напишет посты в стиле твоего канала. Дальше — только утвердить.')) + '</div></div>' +

            '<div class="cp-sec"><div class="cp-lbl">' + esc(T('Канал')) + '</div>' + chanBlock + '</div>' +
            '<div class="cp-sec"><div class="cp-lbl">' + esc(T('Цель недели')) + '</div><div class="cp-chipwrap">' + goals + '</div></div>' +
            '<div class="cp-sec"><div class="cp-lbl">' + esc(T('Постов в неделю')) + '</div><div class="cp-chipwrap">' + freqs + '</div>' +
            '<div class="cp-hint">' + esc(T('Не чаще привычного ритма канала — чтобы не спамить аудиторию.')) + '</div></div>' +

            '<button class="cp-go" data-act="generate">' + esc(T('Собрать план недели')) + '</button>');
    }

    function doGenerate(btn) {
        if (btn) btn.disabled = true;
        haptic('medium');
        var tz = 0;
        try { tz = -(new Date().getTimezoneOffset()); } catch (e) {}
        var body = { channel_id: _chId, goal: _goal, frequency: _freq, tz_offset_minutes: tz };
        apiRequest('/api/v1/content-plan/generate', { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                if (r && r.ok) { renderGenerating(); startPoll(); }
                else if (r && r.error) { if (btn) btn.disabled = false; toast(cap(r)); }
                else { if (btn) btn.disabled = false; toast(T('Не удалось запустить сборку')); }
            })
            .catch(function () { if (btn) btn.disabled = false; toast(T('Не удалось запустить сборку')); });
    }
    function cap(r) {
        // ответ потолка стоимости приходит как {detail:{...}} или {error}
        if (r && r.detail && r.detail.message) return r.detail.message;
        return T('Лимит на сегодня исчерпан — попробуй позже.');
    }

    // ==================== 2. Сборка ====================
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

    // ==================== 3. Лента недели ====================
    function fmtInfo(f) { return FMT[f] || ['Пост', 'ti-file-text']; }
    function statusLabel(p) {
        if (p.status === 'approved') return ['Утверждён', 'ok'];
        if (p.text) return ['Черновик готов', 'draft'];
        return ['Идея', 'idea'];
    }
    function renderWeek() {
        var posts = (_state.posts || []).slice().sort(function (a, b) { return (a.day_index || 0) - (b.day_index || 0); });
        var n = posts.length;
        var appr = posts.filter(function (p) { return p.status === 'approved'; }).length;
        var pct = n ? Math.round(appr / n * 100) : 0;
        var haveText = posts.filter(function (p) { return p.text; }).length;

        var header = '<div class="cp-wkhead">' +
            '<div class="cp-ring" style="--p:' + pct + '"><i>' + appr + '/' + n + '</i></div>' +
            '<div class="cp-wkmeta"><div class="cp-wkgoal">' + esc(T(GOAL_MAP[_state.goal] || _state.goal || '')) + '</div>' +
            (_state.arc ? '<div class="cp-wkarc">' + esc(_state.arc) + '</div>' : '') + '</div></div>';

        var allBtn = haveText < n
            ? '<button class="cp-allbtn" data-act="genall"><i class="ti ti-wand"></i> ' + esc(T('Написать все тексты')) + '</button>'
            : '';

        var cards = posts.map(function (p) { return dayCard(p); }).join('');

        setView(header + allBtn + '<div class="cp-days">' + cards + '</div>' +
            '<div class="cp-foot">' + esc(T('Автовыкладка в умное время — на следующем этапе. Пока: утверди и опубликуй вручную (кнопка «Скопировать»).')) + '</div>');
    }

    function dayCard(p) {
        var fi = fmtInfo(p.format);
        var st = statusLabel(p);
        var open = !!_open[p.day_index];
        var wd = WD[(p.day_index || 0) % 7];
        var busy = !!_dayBusy[p.id];

        var inner = '';
        if (open) {
            if (busy) {
                inner = '<div class="cp-dbody"><div class="cp-dload"><div class="cp-spin sm"></div>' + esc(T('Пишу текст...')) + '</div></div>';
            } else if (p.text) {
                inner = '<div class="cp-dbody"><div class="cp-dtext">' + esc(p.text) + '</div>' +
                    '<div class="cp-dacts">' +
                    '<button class="cp-act ' + (p.status === 'approved' ? 'okon' : 'ok') + '" data-act="approve" data-id="' + p.id + '">' +
                    '<i class="ti ti-' + (p.status === 'approved' ? 'circle-check-filled' : 'circle-check') + '"></i> ' +
                    esc(T(p.status === 'approved' ? 'Утверждён' : 'Утвердить')) + '</button>' +
                    '<button class="cp-act" data-act="variant" data-id="' + p.id + '"><i class="ti ti-refresh"></i> ' + esc(T('Ещё вариант')) + '</button>' +
                    '<button class="cp-act" data-act="copy" data-id="' + p.id + '"><i class="ti ti-copy"></i> ' + esc(T('Скопировать')) + '</button>' +
                    '</div></div>';
            } else {
                inner = '<div class="cp-dbody">' +
                    (p.angle ? '<div class="cp-dangle">' + esc(p.angle) + '</div>' : '') +
                    '<button class="cp-act wide" data-act="genday" data-id="' + p.id + '"><i class="ti ti-wand"></i> ' + esc(T('Написать текст')) + '</button></div>';
            }
        }

        return '<div class="cp-day' + (open ? ' open' : '') + ' s-' + st[1] + '" data-day="' + p.day_index + '">' +
            '<button class="cp-dtop" data-act="toggle" data-day="' + p.day_index + '">' +
            '<span class="cp-dw">' + esc(wd) + '</span>' +
            '<span class="cp-dmid"><span class="cp-dfmt"><i class="ti ' + fi[1] + '"></i>' + esc(T(fi[0])) + '</span>' +
            '<span class="cp-dtitle">' + esc(p.title || '') + '</span></span>' +
            '<span class="cp-dstat"><span class="sd"></span>' + esc(T(st[0])) + '</span>' +
            '<i class="ti ti-chevron-down cp-chev"></i></button>' + inner + '</div>';
    }

    // ==================== действия ====================
    function post(id) { return (_state && _state.posts || []).filter(function (p) { return p.id === id; })[0]; }

    function genDay(id, isVariant) {
        var p = post(id);
        if (!p || _dayBusy[id]) return;
        _dayBusy[id] = true;
        _open[p.day_index] = true;
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
        var pending = (_state.posts || []).filter(function (p) { return !p.text && !_dayBusy[p.id]; });
        if (!pending.length) return;
        var i = 0;
        function step() {
            if (i >= pending.length) { refreshState(); return; }
            var p = pending[i]; i++;
            _dayBusy[p.id] = true; renderWeek();
            apiRequest('/api/v1/content-plan/generate-day', { method: 'POST', body: JSON.stringify({ post_id: p.id }) })
                .then(function (r) {
                    _dayBusy[p.id] = false;
                    if (r && r.ok) { p.text = r.text; p.status = r.status || 'draft'; p.model_used = r.model_used; renderWeek(); step(); }
                    else { toast(cap(r)); renderWeek(); }   // потолок/ошибка — останавливаемся
                })
                .catch(function () { _dayBusy[p.id] = false; toast(T('Не удалось написать текст')); renderWeek(); });
        }
        haptic('medium');
        step();
    }

    function approve(id) {
        var p = post(id);
        if (!p) return;
        haptic('light');
        // оптимистично
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

    function onClick(ev) {
        var t = ev.target;
        var chip = t.closest ? t.closest('[data-chip]') : null;
        if (chip) {
            var name = chip.getAttribute('data-chip'), v = chip.getAttribute('data-v');
            if (name === 'goal') _goal = v; else if (name === 'freq') _freq = +v;
            var wrap = chip.parentElement;
            wrap.querySelectorAll('[data-chip]').forEach(function (b) { b.classList.toggle('on', b === chip); });
            haptic('light'); return;
        }
        var chan = t.closest ? t.closest('[data-chan]') : null;
        if (chan) {
            _chId = +chan.getAttribute('data-chan');
            var box = chan.parentElement;
            box.querySelectorAll('[data-chan]').forEach(function (b) { b.classList.toggle('on', b === chan); });
            haptic('light'); return;
        }
        var actEl = t.closest ? t.closest('[data-act]') : null;
        if (!actEl) return;
        var act = actEl.getAttribute('data-act');
        var id = actEl.getAttribute('data-id');
        if (act === 'close') { haptic('light'); close(); return; }
        if (act === 'generate') { doGenerate(actEl); return; }
        if (act === 'regen') { renderBrief(); return; }
        if (act === 'toggle') {
            var di = +actEl.getAttribute('data-day');
            _open[di] = !_open[di]; renderWeek(); haptic('light'); return;
        }
        if (act === 'genday') { genDay(+id, false); return; }
        if (act === 'variant') { genDay(+id, true); return; }
        if (act === 'genall') { genAll(); return; }
        if (act === 'approve') { approve(+id); return; }
        if (act === 'copy') { copyDay(+id); return; }
    }
})();
