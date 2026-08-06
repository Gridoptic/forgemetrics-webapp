(function () {
    'use strict';

    var _state = null;
    var _pollTimer = null, _genTimer = null;
    var _channels = null;
    var _chId = null;
    var _goal = 'engagement';
    var _freq = 7;
    var _selDay = 0;
    var _dayBusy = {};
    var _batchTimer = null;
    var _ap = null;
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
    var GOALS = [
        ['growth', 'Рост подписчиков'], ['engagement', 'Вовлечённость'],
        ['sales', 'Продажи'], ['warmup', 'Прогрев к запуску'], ['retention', 'Удержание'],
    ];
    // на каких форматах держится каждая цель — по ним ставится полоса и считается конфликт
    var GOAL_KEY_FMT = {
        growth: ['analysis', 'listicle', 'case'],
        engagement: ['poll', 'engagement', 'story'],
        sales: ['offer', 'case'],
        warmup: ['story', 'analysis', 'offer'],
        retention: ['analysis', 'story', 'engagement'],
    };
    var GOAL_MAP = { growth: 'Рост подписчиков', engagement: 'Вовлечённость', sales: 'Продажи', warmup: 'Прогрев к запуску', retention: 'Удержание' };
    var GOAL_ICON = { growth: 'ti-users-plus', engagement: 'ti-heart-handshake', sales: 'ti-building-store',
        warmup: 'ti-flame', retention: 'ti-anchor' };
    var FREQ_NOTE = { 3: 'через день', 5: 'будни', 7: 'каждый день' };
    var FMT = {
        news: ['Новость', 'ti-news'], analysis: ['Разбор', 'ti-microscope'], case: ['Кейс', 'ti-trophy'],
        listicle: ['Подборка', 'ti-list-check'], offer: ['Продающий', 'ti-building-store'],
        poll: ['Опрос', 'ti-chart-bar'], story: ['История', 'ti-book'], engagement: ['Вопрос читателям', 'ti-message-circle'],
    };
    var FMT_ABOUT = {
        news: 'Что произошло в нише и почему это важно',
        analysis: 'Почему что-то работает или перестало',
        case: 'Результат по шагам, с цифрами',
        listicle: 'Несколько приёмов или ошибок списком',
        offer: 'Подводит читателя к твоему товару',
        poll: 'Вопрос с вариантами — собирает мнения',
        story: 'Личный опыт от первого лица',
        engagement: 'Открытый вопрос — вызывает обсуждение',
    };
    var GOAL_WHY = {
        growth: 'ими делятся с другими',
        engagement: 'на них отвечают',
        sales: 'они доводят до покупки',
        warmup: 'они готовят к дате',
        retention: 'ради них остаются',
    };
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

    function setView(html, view) {
        var host = ensureScreen();
        stopTimers();
        var keep = view && view === _lastView;
        var pos = keep ? host.scrollTop : 0;
        host.innerHTML = headHtml() + html;
        host.scrollTop = pos;
        _lastView = view || null;
        return host;
    }
    function renderCenter(icon, msg, sub) {
        setView('<div class="cp-center"><div class="big">' + icon + '</div><div class="m">' + esc(msg) + '</div>' +
            (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>');
    }

    window.__cpSetAp = function (ap) { _ap = ap; };

    window.__cpRenderForCheck = function (st, chans) {
        ensureScreen();
        _state = st;
        if (chans) _channels = chans;
        if (st && st.posts) renderWeek(); else renderBrief();
    };

    window.__openContentPlan = function () {
        ensureScreen();
        renderCenter('<div class="cp-spin"></div>', T('Секунду...'));
        loadAutopilot();
        apiRequest('/api/v1/content-plan').then(route).catch(function () {
            renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.'));
        });
    };

    function route(d) {
        if (!d || !d.ok) { renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.')); return; }
        _state = d;
        if (d.status === 'generating') { renderGenerating(); startPoll(); return; }
        if (d.status === 'ready' || d.status === 'scheduled' || d.status === 'done') { renderWeek(); return; }
                if (_channels === null) {
            apiRequest('/api/v1/channels/active').then(function (cd) {
                _channels = (cd && cd.channels) ? cd.channels.filter(function (c) { return c.username; }) : [];
                if (_chId == null && cd && cd.active_channel_id) _chId = cd.active_channel_id;
                if (_chId == null && _channels.length) _chId = _channels[0].id;
                renderBrief();
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
    // из каких форматов система обычно собирает неделю под выбранную цель
    function weekPreview(goal, freq) {
        var key = (GOAL_KEY_FMT[goal] || []).slice();
        var rest = Object.keys(FMT).filter(function (k) { return key.indexOf(k) < 0; });
        var blocked = (_ap && _ap.blocked_manual ? _ap.blocked_manual : [])
            .concat(_ap && _ap.blocked_auto ? _ap.blocked_auto : []);
        var pool = key.concat(rest).filter(function (k) { return blocked.indexOf(k) < 0; });
        if (!pool.length) pool = Object.keys(FMT);

        var days = [];
        var used = {};
        for (var i = 0; i < 7; i++) {
            days.push(null);
        }
        // раскладываем по неделе равномерно: 3 — через день, 5 — будни, 7 — подряд
        var slots = freq >= 7 ? [0, 1, 2, 3, 4, 5, 6]
            : (freq === 5 ? [0, 1, 2, 3, 4] : [0, 2, 4]);
        slots.forEach(function (d, i) {
            var k = pool[i % pool.length];
            if (used[k] && pool.length > slots.length) k = pool[(i + 1) % pool.length];
            used[k] = true;
            days[d] = k;
        });
        return days;
    }

    function heroWeek() {
        var goal = _goal;
        var days = weekPreview(goal, _freq);
        var cells = days.map(function (k, i) {
            if (!k) {
                return '<div class="cp-hd off"><span class="d">' + esc(T(WD[i])) + '</span>' +
                    '<span class="f">' + esc(T('пауза')) + '</span></div>';
            }
            var fi = FMT[k];
            return '<div class="cp-hd"><i class="ti ' + fi[1] + '"></i>' +
                '<span class="d">' + esc(T(WD[i])) + '</span>' +
                '<span class="f">' + esc(T(fi[0])) + '</span></div>';
        }).join('');

        var title = T('Неделя, собранная под') + ' ' +
            (GOAL_MAP[goal] || goal).toLowerCase();
        return '<div class="cp-hero">' +
            '<div class="cp-hero-eye">' + esc(T('План на неделю')) + '</div>' +
            '<h2>' + esc(title) + '</h2>' +
            '<p>' + esc(T('Сюжет недели, тексты и время выхода. Останется утвердить.')) + '</p>' +
            '<div class="cp-hero-week">' + cells + '</div>' +
            '<div class="cp-hero-note">' + esc(T('Точные темы и часы подберутся при сборке')) +
            '</div></div>';
    }

    function renderBrief() {
        if (!_ap && _chId) setTimeout(loadAutopilot, 0);
        var chanBlock;
        if (!_channels || !_channels.length) {
            chanBlock = '<div class="cp-hint">' + esc(T('Канал не подключён — план соберётся в нейтральном стиле. Подключи канал, чтобы писать точно в его стиле.')) + '</div>';
        } else if (_channels.length === 1) {
            var c = _channels[0]; _chId = c.id;
            chanBlock = '<div class="cp-onechan"><div class="av">' + esc((c.title || c.username || '?').charAt(0).toUpperCase()) + '</div>' +
                '<div class="nm"><b>' + esc(c.title || ('@' + c.username)) + '</b><span>@' + esc(c.username) + '</span></div></div>';
        } else {
            // список кнопок нежизнеспособен на сетке: до пятидесяти каналов на тарифе
            var cur = _channels.filter(function (c) { return c.id === _chId; })[0] || _channels[0];
            _chId = cur.id;
            var styleNote = cur.voice_status === 'done' ? 'стиль настроен' : 'стиль не настроен';
            chanBlock = '<button class="cp-chanpick" data-act="pickchan">' +
                '<span class="av">' + esc((cur.title || cur.username || '?').charAt(0).toUpperCase()) + '</span>' +
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
        var freqs = [3, 5, 7].map(function (v) {
            return '<button class="cp-freq' + (v === _freq ? ' on' : '') + '" data-chip="freq" data-v="' + v + '">' +
                '<b>' + v + '</b><span>' + esc(T(FREQ_NOTE[v])) + '</span></button>';
        }).join('');
        var w = wallet();
        var weekPrice = (w.price_day || 10) * _freq;
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
            chanBlock + '</div>' +
            '<div class="cp-sec">' + secHead('Цель недели',
                'Под неё подбираются темы и виды постов: одна цель — один сюжет на всю неделю.') +
            '<div class="cp-goals">' + goals + '</div></div>' +
            apFormats() +
            '<div class="cp-sec">' + secHead('Постов в неделю',
                'Сколько дней займут посты. Не чаще привычного ритма канала — чтобы не спамить аудиторию.') +
            '<div class="cp-freqs">' + freqs + '</div></div>' +

            '<button class="cp-go" data-act="generate"><i class="ti ti-sparkles"></i> ' +
            esc(T('Собрать план недели')) + priceTag + '</button>' + lowNote +
            apPanel() + strategyBlock(), 'brief');
    }

    function doGenerate(btn) {
        if (btn) btn.disabled = true;
        haptic('medium');
        if (_batchTimer) { clearInterval(_batchTimer); _batchTimer = null; }
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

    function fmtInfo(f) { return FMT[f] || ['Пост', 'ti-file-text']; }
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
    function savedHours(n) { return Math.max(1, Math.round(n * 0.5)); }

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
            '<div class="cp-saved"><i class="ti ti-clock-hour-4"></i> ' + esc(T('сэкономлено')) + ' ~' + savedHours(n) + ' ' + esc(T(hoursWord(savedHours(n)))) + '</div></div>';

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
        setView(header + apPanel() + apFormats() + allBtn + schedBtn + ribbon + detailPanel() +
            insightsBlock() + strategyBlock() + '<div class="cp-foot">' + foot + '</div>', 'week');
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

    function askCap() {
        var cur = (_ap && _ap.weekly_forge_cap) || 100;
        var opts = [70, 100, 150, 300];
        var html = opts.map(function (v) {
            return '<button class="cp-capopt' + (v === cur ? ' on' : '') + '" data-capv="' + v + '">' +
                v + ' Forge</button>';
        }).join('');
        var host = document.getElementById('cp-capbox');
        if (host) host.remove();
        host = document.createElement('div');
        host.id = 'cp-capbox';
        host.className = 'cp-capbox';
        host.innerHTML = '<div class="cp-capin"><div class="cp-caph">' +
            esc(T('Потолок расхода в неделю')) + '</div>' +
            '<div class="cp-caps">' + esc(T('Автопилот остановится, когда достигнет этой суммы.')) +
            '</div><div class="cp-capopts">' + html + '</div>' +
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
                renderBrief();
                loadAutopilot();
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

        if (_ap.stopped_reason) {
            body += '<div class="cp-ap-stopped"><i class="ti ti-alert-triangle"></i>' +
                esc(T('Остановлен: ') + _ap.stopped_reason) + '</div>';
        }
        if (on) {
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

    function apFormats() {
        if (!_ap) return '';
        var man = _ap.blocked_manual || [], auto = _ap.blocked_auto || [];
        // пока неделя не собрана, опорной считается цель, выбранная прямо сейчас
        var built = !!(_state && _state.posts && _state.posts.length);
        var goal = built ? ((_state && _state.goal) || _goal) : _goal;
        var keyFmts = GOAL_KEY_FMT[goal] || [];
        var keys = Object.keys(FMT);
        var cells = keys.map(function (k) {
            var fi = FMT[k];
            var offMan = man.indexOf(k) >= 0, offAuto = auto.indexOf(k) >= 0;
            var c = offMan ? ' off' : (offAuto ? ' auto' : '');
            if (keyFmts.indexOf(k) >= 0 && !offMan && !offAuto) c += ' rail';
            return '<button class="cp-fm' + c + '" data-act="apfmt" data-v="' + k + '">' +
                '<i class="ti ' + fi[1] + '"></i>' +
                '<span class="tx"><b>' + esc(T(fi[0])) + '</b>' +
                '<em>' + esc(T(FMT_ABOUT[k] || '')) + '</em></span>' +
                ((offMan || offAuto) ? '<i class="ti ti-x x"></i>' : '') + '</button>';
        }).join('');

        var note = '';
        var lost = keyFmts.filter(function (k) {
            return man.indexOf(k) >= 0 || auto.indexOf(k) >= 0;
        });
        if (lost.length) {
            var names = lost.map(function (k) { return T((FMT[k] || [k])[0]).toLowerCase(); });
            note += '<div class="cp-warn"><i class="ti ti-alert-triangle"></i><span>' +
                esc(T('Для цели «' + (GOAL_MAP[goal] || goal) + '» отключено: ') + names.join(', ') +
                    T('. Именно эти посты работают на неё — ' + (GOAL_WHY[goal] || '') +
                      '. Неделя выйдет слабее задуманного.')) +
                ' <b data-act="fmtback" data-v="' + lost.join(',') + '">' +
                esc(T(lost.length > 1 ? 'Вернуть все' : 'Вернуть')) + '</b></span></div>';
        }
        if (auto.length) {
            note += '<div class="cp-fm-note">' + esc(T('Отклик втрое ниже лучшего формата, поэтому исключены системой: ')) +
                auto.map(function (k) { return T((FMT[k] || [k])[0]); }).join(', ') + '</div>';
        }
        return '<div class="cp-sec">' + secHead('Разрешённые форматы',
                'Виды постов, из которых собирается неделя. Отмеченные полосой держат выбранную ' +
                'цель. Нажми на любой, чтобы запретить или вернуть.') +
            '<div class="cp-fmts">' + cells + '</div>' + note + '</div>';
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
                esc(T('Стратегия разбирает, откуда брать аудиторию: бесплатный и платный трафик, ' +
                      'ниша, монетизация. Контент-план дальше исполняет её план.')) +
                '</div>' +
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

    function hoursWord(n) {
        var m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return 'час';
        if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'часа';
        return 'часов';
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
        return '<div class="cp-day s-' + st[1] + (p.day_index === _selDay ? ' sel' : '') + '" data-act="selday" data-day="' + p.day_index + '">' +
            '<div class="cp-dhead"><span class="d">' + esc(T(wd)) + '</span><span class="dt">' + esc(dateLabel(p.date_iso)) + '</span></div>' +
            '<span class="cp-fmt"><i class="ti ' + fi[1] + '"></i>' + esc(T(fi[0])) + '</span>' +
            '<div class="cp-dtitle">' + esc(p.title || '') + '</div>' + slot +
            '<div class="cp-dstat"><span class="sd"></span>' + esc(T(st[0])) + '</div></div>';
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
            slot + '<div class="cp-dtitle2">' + esc(p.title || '') + '</div>' + body + '</div>';
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

    function onClick(ev) {
        var t = ev.target;
        var chip = t.closest ? t.closest('[data-chip]') : null;
        if (chip) {
            var name = chip.getAttribute('data-chip'), v = chip.getAttribute('data-v');
            if (name === 'goal') _goal = v; else if (name === 'freq') _freq = +v;
            var wrap = chip.parentElement;
            wrap.querySelectorAll('[data-chip]').forEach(function (b) { b.classList.toggle('on', b === chip); });
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
        if (act === 'fmtback') {
            haptic('light');
            var back = (actEl.getAttribute('data-v') || '').split(',');
            var keep = (_ap && _ap.blocked_manual ? _ap.blocked_manual : []).filter(function (k) {
                return back.indexOf(k) < 0;
            });
            apSave({ blocked_formats: keep });
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
        if (act === 'apfmt') {
            haptic('light');
            var k = actEl.getAttribute('data-v');
            var man = (_ap && _ap.blocked_manual ? _ap.blocked_manual.slice() : []);
            var i = man.indexOf(k);
            if (i >= 0) man.splice(i, 1); else man.push(k);
            apSave({ blocked_formats: man });
            return;
        }
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
