(function () {
    'use strict';

    var _state = null;
    var _pollTimer = null;
    var _genTimer = null;
    var _channels = null;
    var _iv = {};
    var _ivStep = 0;
    var _started = false;
    var _guides = {};

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }

    function esc(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function haptic(kind) {
        try {
            if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred(kind || 'light');
            }
        } catch (e) {}
    }

    function toast(msg) {
        try { if (typeof showToast === 'function') return showToast(msg); } catch (e) {}
        try { if (typeof alertDialog === 'function') return alertDialog(msg); } catch (e) {}
    }

    var STG_ICON = '<i class="ti ti-target-arrow" style="font-size:23px;color:#34d399;"></i>';

    var DAYS_EN = {
        monday: 'Понедельник', tuesday: 'Вторник', wednesday: 'Среда', thursday: 'Четверг',
        friday: 'Пятница', saturday: 'Суббота', sunday: 'Воскресенье',
        mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг',
        fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье' };

    function fixDays(text) {
        return String(text == null ? '' : text).replace(
            /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g,
            function (m) { var r = DAYS_EN[m.toLowerCase()]; return r ? T(r) : m; });
    }

    var SEC_ICON = {
        niche: '<i class="ti ti-target"></i>', audience: '<i class="ti ti-users"></i>',
        content: '<i class="ti ti-list-details"></i>', traffic_free: '<i class="ti ti-rocket"></i>',
        traffic_paid: '<i class="ti ti-speakerphone"></i>', monetize: '<i class="ti ti-coin"></i>',
        offer: '<i class="ti ti-building-store"></i>', metrics: '<i class="ti ti-chart-bar"></i>',
        week1: '<i class="ti ti-checklist"></i>' };
    var DIFF = { easy: { c: '#5DCAA5', l: 'Просто' }, medium: { c: '#f5bf4f', l: 'Средне' }, hard: { c: '#ef8080', l: 'Сложно' } };


    function ensureScreen() {
        var host = document.getElementById('strategy-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'strategy-screen';
            host.className = 'stg-screen';
            (document.getElementById('app') || document.body).appendChild(host);
            host.addEventListener('click', onScreenClick);
        }
        host.style.display = 'flex';
        document.documentElement.classList.add('cs-modal-open');
        document.body.classList.add('cs-modal-open');
        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(closeStrategy);
                tg.BackButton.onClick(closeStrategy);
                tg.BackButton.show();
            }
        } catch (e) {}
        return host;
    }

    function closeStrategy() {
        stopTimers();
        var host = document.getElementById('strategy-screen');
        if (host) host.style.display = 'none';
        document.documentElement.classList.remove('cs-modal-open');
        document.body.classList.remove('cs-modal-open');
        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(closeStrategy);
                tg.BackButton.hide();
            }
        } catch (e) {}
    }

    function stopTimers() {
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
        if (_genTimer) { clearInterval(_genTimer); _genTimer = null; }
        if (_trTimer) { clearTimeout(_trTimer); _trTimer = null; }
    }

    function headHtml() {
        return '<div class="stg-head"><button class="stg-back" data-act="close">' +
            '<i class="ti ti-arrow-left"></i></button><div class="t">' + T('AI-стратегия') + '</div></div>';
    }

    function setView(html, head) {
        var host = ensureScreen();
        stopTimers();
        _trOpen = !!head;
        host.innerHTML = (head || headHtml()) + html;
        host.scrollTop = 0;
        return host;
    }

    window.__openStrategy = function () {
        ensureScreen();
        renderCenter('<div class="stg-spin"></div>', T('Загружаю стратегию...'));
        load();
    };

    function load() {
        apiRequest('/api/v1/strategy').then(route).catch(function () {
            renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.'));
        });
    }

    function normalizeDoc(d) {
        var doc = d && d.doc;
        if (!doc || !doc.sections) return;
        doc.sections.forEach(function (sec) {
            if (sec.key === 'metrics' || sec.key === 'niche') {
                (sec.steps || []).forEach(function (st) { st.checkable = false; st.has_guide = false; });
            }
        });
    }

    function route(d) {
        if (!d || !d.ok) { renderCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.')); return; }
        _state = d;
        if (d.access === 'expired') { renderShowcase(); return; }
        if (d.status === 'generating') { renderGenerating(); startPoll(); return; }
        if (d.status === 'active') { renderDoc(); return; }
        if (d.status === 'error') { renderGenError(); return; }
        if (d.status === 'interview') {
            _started = true; _iv = d.interview || {};
            if (_channels === null) {
                apiRequest('/api/v1/channels/active').then(function (cd) {
                    _channels = (cd && cd.channels) || [];
                    startInterview(true);
                }).catch(function () { _channels = []; startInterview(true); });
            } else { startInterview(true); }
            return;
        }
        renderShowcase();
    }

    function renderCenter(icon, msg) {
        setView('<div class="stg-center"><div class="big">' + icon + '</div><div class="m">' + esc(msg) + '</div></div>');
    }


    function renderShowcase() {
        if (_state && _state.access === 'expired') {
            var rprice = ((_state.prices || {}).renewal) || 1990;
            setView(
                '<div class="stg-flag"><div class="glow"></div>' +
                '<div class="inner"><span class="stg-ribbon">' + esc(T('Личный стратег')) + '</span>' +
                '<div class="stg-fhead"><div class="stg-fic">' + STG_ICON + '</div>' +
                '<div><div class="stg-fname">' + esc(T('Срок ведения истёк')) + '</div>' +
                '<div class="stg-fsub">' + esc(T('Стратегия и прогресс сохранены — продление откроет их с той же точки')) + '</div></div></div>' +
                '<div class="stg-fprice"><b>' + num(rprice) + ' Forge</b><span>' + esc(T('ещё 30 дней ведения: разборы недели, гайды и чат')) + '</span></div>' +
                '<button class="stg-fcta" data-act="renew"><i class="ti ti-refresh"></i> ' + esc(T('Продлить ведение')) + ' — ' + num(rprice) + ' Forge</button>' +
                '</div></div>');
            return;
        }
        var locked = !_state || _state.access !== 'full';
        var rows = [
            ['Ниша под твои интересы.', 'Стратег расспросит, чем ты горишь и сколько времени готов тратить, и предложит 3 ниши, где сходятся твой интерес, спрос рекламодателей и невысокая конкуренция. Уже есть канал — оценит его по реальным постам и скажет, что усилить'],
            ['Контент-план + первые 10 постов.', 'Не «пиши о пользе», а готовые рубрики по дням недели, сколько постить и почему именно столько, и 10 первых постов готовыми текстами: открыл, вставил, опубликовал'],
            ['Трафик под твою страну.', 'Бесплатные и платные способы с гайдами до уровня «скачай вот это приложение, смонтируй ролик по этой формуле, выложи в это время». С правилами каждой площадки — как расти и не улететь в бан'],
            ['Все модели заработка.', 'Реклама в канале, перелив трафика, партнёрки, свой продукт. По каждой: с какого размера канала включать, сколько это даёт в месяц в твоей нише и что подготовить заранее'],
            ['Месяц ведения за руку.', 'Каждую неделю стратег сам сверяет план с фактом по данным твоего канала: что сработало, где отстаёшь, что делать дальше. Плюс чат — задавай вопросы в любой момент'],
        ];
        var what = rows.map(function (r) {
            return '<div class="stg-fw"><span class="tick">✓</span><span><b>' + esc(T(r[0])) + '</b> ' + esc(T(r[1])) + '</span></div>';
        }).join('');
        var nprice = ((_state && _state.prices) || {}).new || 3990;
        var rprice2 = ((_state && _state.prices) || {}).renewal || 1990;
        var cta = locked
            ? '<button class="stg-fcta" data-act="buy"><i class="ti ti-bolt"></i> ' + esc(T('Открыть доступ')) + ' — ' + num(nprice) + ' Forge</button>' +
              '<div class="stg-fnote">' + esc(T('Спишется с баланса Forge — без кассы. План и месяц ведения откроются сразу.')) + '</div>'
            : '<button class="stg-fcta" data-act="start">' + esc(T('Построить мою стратегию')) + '</button>' +
              '<div class="stg-fnote">' + esc(T('≈ 5 минут интервью — и полный план у тебя на руках')) + '</div>';
        setView(
            '<div class="stg-flag"><div class="glow"></div>' +
            '<div class="inner"><span class="stg-ribbon">' + esc(T('Личный стратег')) + '</span>' +
            '<div class="stg-fhead"><div class="stg-fic">' + STG_ICON + '</div>' +
            '<div><div class="stg-fname">' + esc(T('AI-стратегия канала')) + '</div>' +
            '<div class="stg-fsub">' + esc(T('персональный план роста, наполнения и заработка')) + '</div></div></div>' +
            '<div class="stg-fwhat">' + what + '</div>' +
            '<div class="stg-fprice"><b>' + num(nprice) + ' Forge</b><span>' + esc(T('разово · продление ведения —')) + ' ' + num(rprice2) + ' Forge</span></div>' +
            cta + '</div></div>');
    }

    function num(n) {
        try { return Number(n || 0).toLocaleString('ru-RU'); } catch (e) { return String(n); }
    }

    function doPurchase(btn, renewal) {
        haptic('medium');
        btn.disabled = true;
        var old = btn.innerHTML;
        btn.textContent = T('Оформляю…');
        apiRequest('/api/v1/strategy/purchase', { method: 'POST', body: JSON.stringify({ renewal: !!renewal }) })
            .then(function (r) {
                if (r && r.ok) {
                    haptic('medium');
                    toast(T('Доступ открыт — стратег готов к работе'));
                    load();
                    return;
                }
                btn.disabled = false; btn.innerHTML = old;
                uiAlertStg((r && r.message) || T('Не удалось оформить — попробуй ещё раз'));
            })
            .catch(function () { btn.disabled = false; btn.innerHTML = old; toast(T('Не удалось оформить — попробуй ещё раз')); });
    }

    function uiAlertStg(msg) {
        if (typeof alertDialog === 'function') { alertDialog(msg); return; }
        toast(msg);
    }


    var STEPS = [
        { key: 'start', icon: '<i class="ti ti-target"></i>', head: 'Знакомство со стратегом', q: 'С чего начинаем?',
          note: 'Пять коротких вопросов — и стратег соберёт план лично под тебя: нишу, контент, трафик и заработок.',
          type: 'single', field: 'start_mode',
          options: ['Уже есть канал — строим на его базе', 'Начинаю с нуля — подбери мне нишу'] },
        { key: 'interests', icon: '<i class="ti ti-flame"></i>', head: 'Знакомство со стратегом', q: 'Чем тебе интересно заниматься?',
          note: 'Это самый важный вопрос из всех. Канал, который ведёшь через силу, умирает за месяц — поэтому ниша ищется на пересечении твоих интересов и того, за что платят рекламодатели. Выбери всё, что откликается:',
          type: 'multi', field: 'interests',
          options: ['Спорт и ЗОЖ', 'Финансы и инвестиции', 'Технологии и ИИ', 'Игры', 'Кино и сериалы', 'Психология', 'Авто', 'Кулинария', 'Путешествия', 'Мода и стиль', 'Бизнес и карьера', 'Юмор и развлечения'],
          custom: 'Свой вариант — напиши, чем горишь', customField: 'custom_interest' },
        { key: 'geo', icon: '<i class="ti ti-world"></i>', head: 'Страна и аудитория', q: 'Где живёт твоя аудитория?',
          note: 'От региона зависит всё: какие площадки работают, сколько стоит подписчик и какие рекламодатели платят.',
          type: 'single', field: 'audience_geo',
          options: ['Россия и СНГ', 'Европа', 'США и Канада', 'Латинская Америка', 'Ближний Восток', 'Юго-Восточная Азия', 'Индия', 'Весь мир'],
          custom: 'Твоя страна — для точных советов по площадкам и ценам', customField: 'country' },
        { key: 'resources', icon: '<i class="ti ti-clock"></i>', head: 'Время и бюджет', q: 'Сколько готов вкладывать?',
          note: 'Честный ответ важнее красивого: план под 3 часа в неделю и план под 15 — это два разных плана.',
          type: 'double',
          groups: [
              { sub: 'Время в неделю', field: 'time_per_week', options: ['До 3 часов', '3–7 часов', '7–15 часов', '15+ часов'] },
              { sub: 'Бюджет на продвижение', field: 'budget', options: ['Без бюджета', 'До 3 000 ₽/мес', '3–10 тыс ₽/мес', 'Больше 10 тыс ₽/мес'] },
          ] },
        { key: 'goal', icon: '<i class="ti ti-coin"></i>', head: 'Цель', q: 'Что для тебя главное?',
          note: 'Цель определяет монетизацию: под каждую соберётся своя лестница заработка.',
          type: 'single', field: 'goal',
          options: ['Зарабатывать на рекламе в канале', 'Продавать перелив трафика', 'Продавать свой продукт или услуги', 'Личный бренд и экспертность', 'Пока не знаю — подскажи'],
          custom: 'Или своими словами', customField: 'custom_goal' },
    ];

    function startFlow() {
        haptic('medium');
        renderCenter('<div class="stg-spin"></div>', T('Секунду...'));
        apiRequest('/api/v1/channels/active').then(function (d) {
            _channels = (d && d.channels) || [];
            startInterview(false);
        }).catch(function () { _channels = []; startInterview(false); });
    }

    function startInterview(resume) {
        _ivStep = 0;
        if (resume) {
            for (var i = 0; i < STEPS.length; i++) {
                var st = STEPS[i];
                var f = st.field || (st.groups && st.groups[0].field);
                if (_iv[f] == null) { _ivStep = i; break; }
                _ivStep = Math.min(i + 1, STEPS.length - 1);
            }
        }
        renderStep();
    }

    function renderStep() {
        var st = STEPS[_ivStep];
        var pct = Math.round(((_ivStep + 1) / STEPS.length) * 100);
        var body = '';
        if (st.type === 'double') {
            st.groups.forEach(function (g) {
                body += '<div class="stg-sub">' + esc(T(g.sub)) + '</div><div class="stg-chips" data-group="' + g.field + '">' +
                    g.options.map(function (o) {
                        var on = _iv[g.field] === o ? ' on' : '';
                        return '<span class="stg-ch' + on + '" data-chip="' + esc(o) + '" data-field="' + g.field + '">' + esc(T(o)) + '</span>';
                    }).join('') + '</div>';
            });
        } else {
            var opts = st.options.slice();
            body = '<div class="stg-chips" data-group="' + st.field + '">' + opts.map(function (o) {
                var cur = _iv[st.field];
                var on = (st.type === 'multi' ? (Array.isArray(cur) && cur.indexOf(o) >= 0) : cur === o) ? ' on' : '';
                return '<span class="stg-ch' + on + '" data-chip="' + esc(o) + '" data-field="' + st.field + '">' + esc(T(o)) + '</span>';
            }).join('') + '</div>';
            if (st.custom) {
                body += '<input class="stg-inp" id="stg-custom" placeholder="' + esc(T(st.custom)) + '" value="' + esc(_iv[st.customField] || '') + '" maxlength="120">';
            }
        }
        var last = _ivStep === STEPS.length - 1;
        var nextLabel = last ? T('Готово — строим стратегию')
            : T('Дальше') + ' → ' + T(STEPS[_ivStep + 1].head);
        setView(
            '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile">' + st.icon + '</span> ' + esc(T(st.head)) + '</div>' +
            '<div class="stg-prog"><i style="width:' + pct + '%"></i></div>' +
            '<div class="stg-q">' + esc(T(st.q)) + '</div>' +
            '<div class="stg-note" style="margin:-2px 0 10px;">' + esc(T(st.note)) + '</div>' +
            body +
            '<button class="stg-next" data-act="next">' + esc(nextLabel) + '</button>' +
            (_ivStep > 0 ? '<button class="stg-prev" data-act="prev"><i class="ti ti-arrow-left"></i>' + esc(T('Назад')) + '</button>' : '') +
            '</div>');
    }

    function chipTap(elm) {
        haptic('light');
        var st = STEPS[_ivStep];
        var field = elm.getAttribute('data-field');
        var val = elm.getAttribute('data-chip');
        var multi = st.type === 'multi';
        if (multi) {
            var cur = Array.isArray(_iv[field]) ? _iv[field].slice() : [];
            var i = cur.indexOf(val);
            if (i >= 0) cur.splice(i, 1); else cur.push(val);
            _iv[field] = cur;
            elm.classList.toggle('on');
        } else {
            _iv[field] = val;
            var box = elm.parentElement;
            box.querySelectorAll('.stg-ch').forEach(function (c) { c.classList.remove('on'); });
            elm.classList.add('on');
        }
    }

    function stepNext() {
        var st = STEPS[_ivStep];
        var custom = document.getElementById('stg-custom');
        if (custom && st.customField) _iv[st.customField] = custom.value.trim();
        if (st.type === 'double') {
            for (var i = 0; i < st.groups.length; i++) {
                if (!_iv[st.groups[i].field]) { toast(T('Выбери вариант в каждой группе')); return; }
            }
        } else if (st.type === 'multi') {
            if ((!Array.isArray(_iv[st.field]) || !_iv[st.field].length) && !_iv[st.customField]) {
                toast(T('Выбери хотя бы один вариант')); return;
            }
        } else if (!_iv[st.field] && !(st.customField && _iv[st.customField])) {
            toast(T('Выбери вариант')); return;
        }
        haptic('medium');
        if (st.key === 'start') {
            _iv.has_channel = _iv.start_mode === st.options[0];
            if (_iv.has_channel && (!_channels || !_channels.length)) {
                toast(T('Канал не подключён — начнём с подбора ниши'));
                _iv.has_channel = false;
                _iv.start_mode = st.options[1];
            }
            if (!_started) { createStrategy(); return; }
        }
        saveAndAdvance();
    }

    function createStrategy() {
        var chId = null;
        if (_iv.has_channel && _channels && _channels.length) {
            chId = (_iv.channel_id != null) ? _iv.channel_id : _channels[0].id;
        }
        apiRequest('/api/v1/strategy/start', { method: 'POST', body: JSON.stringify({ channel_id: chId }) })
            .then(function (r) {
                if (!r || !r.ok) { toast(T('Функция откроется после оплаты — она уже близко')); return; }
                _started = true;
                saveAndAdvance();
            })
            .catch(function () { toast(T('Не удалось начать. Попробуй ещё раз')); });
    }

    function saveAndAdvance() {
        var last = _ivStep === STEPS.length - 1;
        var payload = { answers: _iv };
        var req = apiRequest('/api/v1/strategy/interview', { method: 'POST', body: JSON.stringify(payload) });
        if (!last) {
            req.catch(function () {});
            _ivStep++;
            renderStep();
            return;
        }
        renderCenter('<div class="stg-spin"></div>', T('Секунду...'));
        req.then(function () {
            return apiRequest('/api/v1/strategy/generate', { method: 'POST' });
        }).then(function (r) {
            if (r && r.ok) { renderGenerating(); startPoll(); }
            else { toast(T('Не удалось запустить генерацию')); renderStep(); }
        }).catch(function () { toast(T('Не удалось запустить генерацию')); renderStep(); });
    }


    var GEN_TEXTS = [
        'Изучаю твои ответы и данные канала...',
        'Подбираю нишу: интерес × спрос × конкуренция...',
        'Считаю площадки твоего региона...',
        'Собираю контент-план и пишу первые посты...',
        'Строю план трафика: бесплатный и платный...',
        'Собираю лестницу монетизации...',
        'Финальная сборка документа...',
    ];

    function renderGenerating() {
        setView('<div class="stg-center"><div class="stg-fic" style="width:64px;height:64px;border-radius:18px;">' + STG_ICON + '</div>' +
            '<div class="stg-spin"></div>' +
            '<div class="m" id="stg-gen-text">' + esc(T(GEN_TEXTS[0])) + '</div>' +
            '<div class="m" style="font-size:11px;color:#565b73;">' + esc(T('Обычно это занимает 2–4 минуты. Можно закрыть — стратегия соберётся сама')) + '</div></div>');
        var i = 0;
        _genTimer = setInterval(function () {
            var el = document.getElementById('stg-gen-text');
            if (!el) return;
            if (i < GEN_TEXTS.length - 1) {
                i++;
                el.textContent = T(GEN_TEXTS[i]);
            }
        }, 26000);
    }

    function startPoll() {
        if (_pollTimer) clearInterval(_pollTimer);
        var ticks = 0;
        _pollTimer = setInterval(function () {
            ticks++;
            if (ticks === 60) {
                var el = document.getElementById('stg-gen-text');
                if (el) el.textContent = T('Собираю особенно тщательно — ещё чуть-чуть...');
            }
            apiRequest('/api/v1/strategy').then(function (d) {
                if (!d || !d.ok) return;
                if (d.status === 'active') { _state = d; stopTimers(); renderDoc(); }
                else if (d.status === 'error') { _state = d; stopTimers(); renderGenError(); }
            }).catch(function () {});
        }, 6000);
    }

    function renderGenError() {
        setView('<div class="stg-center"><div class="big">⚠️</div>' +
            '<div class="m">' + esc(T('Генерация не удалась — такое бывает. Нажми, и стратег попробует ещё раз: ответы интервью сохранены.')) + '</div>' +
            '<button class="stg-next" style="max-width:280px;" data-act="regen">' + esc(T('Попробовать ещё раз')) + '</button>' +
            '<button class="stg-prev" data-act="restart">' + esc(T('Начать новую стратегию')) + '</button></div>');
    }

    function regen(btn) {
        haptic('medium');
        if (btn) btn.disabled = true;
        apiRequest('/api/v1/strategy/generate', { method: 'POST' })
            .then(function (r) {
                if (r && r.ok) { renderGenerating(); startPoll(); }
                else { if (btn) btn.disabled = false; toast(T('Не удалось запустить генерацию')); }
            })
            .catch(function () { if (btn) btn.disabled = false; toast(T('Не удалось запустить генерацию')); });
    }


    function docTotals() {
        var total = 0, done = 0;
        var prog = _state.progress || {};
        (_state.doc.sections || []).forEach(function (sec) {
            (sec.steps || []).forEach(function (s) {
                if (s.checkable === false) return;
                total++;
                if (prog[s.key]) done++;
            });
        });
        return { total: total, done: done, pct: total ? Math.round(done / total * 100) : 0 };
    }

    function ringHtml(t) {
        return '<div class="stg-ring" style="background:conic-gradient(#5DCAA5 0 ' + t.pct + '%, rgba(255,255,255,0.08) ' + t.pct + '% 100%)"><span>' + t.pct + '%</span></div>';
    }

    function _isWordChar(ch) { return ch != null && /[0-9A-Za-z\u00C0-\u024F\u0400-\u04FF]/.test(ch); }

    function termWrap(text) {
        var terms = (_state && _state.doc && _state.doc.terms) || {};
        var plain = String(text || '');
        var low = plain.toLowerCase();
        var found = [];
        for (var k in terms) {
            if (!terms.hasOwnProperty(k) || k.length < 2 || k.length > 34) continue;
            var idx = low.indexOf(k.toLowerCase());
            if (idx >= 0 && !_isWordChar(plain[idx - 1]) && !_isWordChar(plain[idx + k.length])) {
                found.push({ i: idx, len: k.length, key: k });
            }
        }
        found.sort(function (a, b) { return a.i - b.i; });
        var picked = [], end = -1;
        for (var j = 0; j < found.length && picked.length < 3; j++) {
            if (found[j].i >= end) { picked.push(found[j]); end = found[j].i + found[j].len; }
        }
        if (!picked.length) return esc(plain);
        var out = '', pos = 0;
        picked.forEach(function (m) {
            out += esc(plain.slice(pos, m.i));
            out += '<span class="stg-term" data-term="' + esc(m.key) + '">' + esc(plain.substr(m.i, m.len)) + '</span>';
            pos = m.i + m.len;
        });
        return out + esc(plain.slice(pos));
    }

    function bodyHtml(text, asNote) {
        var t = String(text || '');
        var long = t.length > (asNote ? 600 : 480);
        var cls = asNote ? 'stg-body stg-note' : 'stg-body';
        var wrap = asNote ? 'div' : 'span';
        return '<' + wrap + ' class="' + cls + (long ? ' clamp' : '') + '" style="margin-top:9px;">' + termWrap(t) + '</' + wrap + '>' +
            (long ? '<span class="stg-more" data-act="more">' + esc(T('развернуть')) + '</span>' : '');
    }

    function stepHtml(s) {
        var done = (_state.progress || {})[s.key];
        var how = (s.has_guide && _state.access === 'full')
            ? '<button class="stg-how" data-act="how" data-key="' + esc(s.key) + '">' + esc(T('Как сделать')) + '</button>' : '';
        var mark = (s.checkable === false)
            ? '<span class="stg-dot"></span>'
            : '<span class="stg-cb' + (done ? ' done' : '') + '" data-act="cb" data-key="' + esc(s.key) + '"></span>';
        return '<div class="stg-step" data-step="' + esc(s.key) + '">' + mark +
            '<div class="t"><b>' + esc(fixDays(s.title)) + '</b>' + (s.body ? bodyHtml(fixDays(s.body)) : '') + '</div>' + how +
            '</div><div class="stg-gslot" data-slot="' + esc(s.key) + '"></div>';
    }

    function shortCost(c) {
        var t = String(c == null ? '' : c).trim();
        if (!t || t === '—' || t === '-') return '';
        t = t.split(/[(,;]/)[0].trim().replace(/[·—-]\s*$/, '').trim();
        if (t.length > 26) t = t.slice(0, 25).replace(/\s+\S*$/, '') + '…';
        return t;
    }

    function _pct(v) { var x = parseInt(v, 10); return isNaN(x) ? 0 : Math.max(0, Math.min(100, x)); }

    function chartHtml(chart) {
        if (!chart || !chart.bars || !chart.bars.length) return '';
        var bars = chart.bars.filter(function (b) { return _pct(b.pct) > 0; });
        if (!bars.length) return '';
        var max = 1;
        bars.forEach(function (b) { if (_pct(b.pct) > max) max = _pct(b.pct); });
        var rows = bars.slice().sort(function (a, b) { return _pct(b.pct) - _pct(a.pct); }).map(function (b) {
            var d = DIFF[b.difficulty] || DIFF.medium;
            var w = Math.max(8, Math.round(_pct(b.pct) / max * 88));
            var cost = shortCost(b.cost);
            return '<div class="stg-bar-row"><div class="stg-bar-l"><b>' + esc(b.name) + '</b>' +
                '<span class="stg-dif"><i style="background:' + d.c + '"></i>' + esc(T(d.l)) + (cost ? ' · ' + esc(cost) : '') + '</span></div>' +
                '<div class="stg-bar-tr"><div class="stg-bar-f" style="width:' + w + '%"></div><span class="stg-bar-v">' + _pct(b.pct) + '%</span></div></div>';
        }).join('');
        var advice = chart.advice
            ? '<div class="stg-note" style="margin-top:10px;"><b>' + esc(T('Совет стратега:')) + '</b> ' + termWrap(fixDays(chart.advice)) + '</div>' : '';
        return rows + advice;
    }

    function postsHtml(posts) {
        if (!posts || !posts.length) return '';
        var rows = posts.map(function (p, i) {
            return '<div class="stg-post" data-post="' + i + '">' +
                '<div class="h" data-act="post" data-i="' + i + '"><b>' + esc(p.title || (T('Пост') + ' ' + (i + 1))) + '</b>' +
                '<button class="stg-copy" data-act="copy" data-i="' + i + '">' + esc(T('Скопировать')) + '</button></div>' +
                '<div class="b">' + esc(p.text || '') + '</div></div>';
        }).join('');
        return '<div class="stg-sub" style="margin-top:14px;">' + esc(T('Первые 10 постов — готовы к публикации')) + '</div>' + rows;
    }

    function renderDoc() {
        normalizeDoc(_state);
        var doc = _state.doc || {};
        var t = docTotals();
        var iv = _state.interview || {};
        var week = _state.week || 1;
        var sub = t.done + ' ' + T('из') + ' ' + t.total + ' ' + T('шагов выполнено') +
            ' · ' + T('неделя') + ' ' + week + (week <= 4 ? ' ' + T('из') + ' 4' : '') +
            (iv.audience_geo ? ' · ' + esc(T(iv.audience_geo)) : '');
        var html =
            '<div class="stg-sec"><div class="stg-dochead">' + ringHtml(t) +
            '<div class="t"><b>' + esc(T('Стратегия:')) + ' «' + esc(doc.niche || '—') + '»</b>' +
            '<span id="stg-doc-sub">' + sub + '</span></div>' +
            '<button class="stg-jump" data-act="jump" data-to="week1">' + esc(T('Начни с задач первой недели')) + ' →</button></div>';

        var trInserted = false;
        (doc.sections || []).forEach(function (sec) {
            if (sec.key === 'traffic_free') { html += trafficCard(); trInserted = true; return; }
            if (sec.key === 'traffic_paid') return;
            var hasContent = (sec.intro && sec.intro.trim()) || (sec.steps && sec.steps.length) ||
                (sec.chart && sec.chart.bars && sec.chart.bars.length) || (sec.posts && sec.posts.length);
            if (!hasContent) return;
            var inner = '<div class="stg-eyebrow"><span class="tile">' + (SEC_ICON[sec.key] || '<i class="ti ti-pin"></i>') + '</span> ' + esc(T(sec.title || sec.key)) + '</div>';
            if (sec.key === 'niche' && sec.chosen && sec.chosen !== (doc.niche || '')) {
                inner += '<div class="stg-tip" style="margin-top:10px;"><b>' + esc(T('Рекомендация стратега:')) + '</b> ' + esc(sec.chosen) + '</div>';
            }
            if (sec.intro && sec.intro.trim()) {
                inner += bodyHtml(fixDays(sec.intro), true);
            }
            inner += chartHtml(sec.chart);
            if (sec.steps && sec.steps.length) {
                inner += '<div style="margin-top:6px;">' + sec.steps.map(stepHtml).join('') + '</div>';
            }
            inner += postsHtml(sec.posts);
            html += '<div class="stg-sec" data-sec="' + esc(sec.key) + '">' + inner + '</div>';
        });

        if (!trInserted) html += trafficCard();
        html += reviewHtml();
        html += chatHtml();
        html += '<button class="stg-prev" data-act="restart" style="margin-top:14px;">' +
            esc(T('Начать новую стратегию')) + '</button>';
        var host = setView(html);
        unclampSmall(host);
        var chatBox = document.getElementById('stg-chat-msgs');
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    }

    function unclampSmall(host) {
        try {
            host.querySelectorAll('.stg-body.clamp').forEach(function (b) {
                if (b.scrollHeight - b.clientHeight < 28) {
                    b.classList.remove('clamp');
                    var m = b.parentElement.querySelector('.stg-more');
                    if (m) m.remove();
                }
            });
        } catch (e) {}
    }


    function reviewHtml() {
        var revs = _state.reviews || [];
        if (!revs.length) {
            return '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-trending-up"></i></span> ' + esc(T('Разбор недели')) + '</div>' +
                '<div class="stg-note" style="margin-top:9px;">' + esc(T('Первый разбор стратег сделает через неделю: сверит план с фактическими цифрами канала — что сработало, где отстаёшь и что делать дальше.')) + '</div></div>';
        }
        var r = revs[0];
        var inner = '<div class="stg-eyebrow"><span class="tile"><i class="ti ti-trending-up"></i></span> ' + esc(T('Неделя')) + ' ' + (r.week || 1) + ' · ' + esc(T('разбор от стратега')) + '</div>';
        if (r.summary) inner += '<div class="stg-note" style="margin-top:9px;">' + esc(fixDays(r.summary)) + '</div>';
        (r.wins || []).forEach(function (w) {
            inner += '<div class="stg-verd"><span class="ic" style="color:#5DCAA5"><i class="ti ti-circle-check"></i></span><span><b>' + esc(T('Сработало:')) + '</b> ' + esc(fixDays(w.title ? w.title + '. ' : '')) + esc(fixDays(w.body || '')) + '</span></div>';
        });
        (r.lags || []).forEach(function (w) {
            inner += '<div class="stg-verd"><span class="ic" style="color:#f5bf4f"><i class="ti ti-alert-triangle"></i></span><span><b>' + esc(T('Отстаём:')) + '</b> ' + esc(fixDays(w.title ? w.title + '. ' : '')) + esc(fixDays(w.body || '')) + '</span></div>';
        });
        if (r.task) {
            inner += '<div class="stg-task"><b>' + esc(T('Задача недели')) + ' ' + ((r.week || 1) + 1) + ':</b> ' + esc(fixDays(r.task.title ? r.task.title + '. ' : '')) + esc(fixDays(r.task.body || '')) + '</div>';
        }
        return '<div class="stg-sec">' + inner + '</div>';
    }


    function chatHtml() {
        var msgs = _state.messages || [];
        var rows = msgs.map(function (m) {
            return '<div class="stg-msg ' + (m.role === 'user' ? 'u' : 'a') + '">' + esc(m.text) + '</div>';
        }).join('');
        var used = (_state.chat && _state.chat.used) || 0;
        var quota = (_state.chat && _state.chat.quota) || 30;
        return '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-message-circle"></i></span> ' + esc(T('Вопрос стратегу')) + '</div>' +
            '<div id="stg-chat-msgs" style="max-height:300px;overflow-y:auto;">' + rows + '</div>' +
            '<div class="stg-chatrow"><input class="stg-inp" id="stg-chat-inp" maxlength="1000" placeholder="' + esc(T('Спроси о своём канале, нише или шаге плана')) + '">' +
            '<button class="stg-send" data-act="send"><i class="ti ti-send"></i></button></div>' +
            '<div class="stg-quota" id="stg-quota">' + esc(T('Осталось')) + ' ' + Math.max(0, quota - used) + ' ' + esc(T('из')) + ' ' + quota + ' ' + esc(T('вопросов на этой неделе')) + '</div></div>';
    }

    var _chatBusy = false;

    function sendChat() {
        if (_chatBusy) return;
        var inp = document.getElementById('stg-chat-inp');
        var box = document.getElementById('stg-chat-msgs');
        var btn = document.querySelector('#strategy-screen [data-act="send"]');
        if (!inp || !box) return;
        var q = inp.value.trim();
        if (!q) return;
        _chatBusy = true;
        haptic('medium');
        inp.value = '';
        if (btn) btn.disabled = true;
        box.insertAdjacentHTML('beforeend', '<div class="stg-msg u">' + esc(q) + '</div>');
        box.insertAdjacentHTML('beforeend', '<div class="stg-msg a stg-typing">…</div>');
        var typing = box.lastElementChild;
        box.scrollTop = box.scrollHeight;
        function done() { _chatBusy = false; if (btn) btn.disabled = false; }
        apiRequest('/api/v1/strategy/chat', { method: 'POST', body: JSON.stringify({ text: q }) })
            .then(function (r) {
                done();
                if (r && r.ok && r.answer) {
                    typing.classList.remove('stg-typing');
                    typing.textContent = r.answer;
                    if (_state.chat) {
                        _state.chat.used = (_state.chat.used || 0) + 1;
                        var qEl = document.getElementById('stg-quota');
                        if (qEl) qEl.textContent = T('Осталось') + ' ' + Math.max(0, (_state.chat.quota || 30) - _state.chat.used) + ' ' + T('из') + ' ' + (_state.chat.quota || 30) + ' ' + T('вопросов на этой неделе');
                    }
                } else if (r && r.error === 'quota') {
                    typing.classList.remove('stg-typing');
                    typing.textContent = T('Лимит вопросов на этой неделе исчерпан — квота обновится в начале следующей.');
                } else {
                    typing.classList.remove('stg-typing');
                    typing.textContent = T('Стратег не ответил — попробуй ещё раз.');
                }
                box.scrollTop = box.scrollHeight;
            })
            .catch(function () {
                done();
                typing.classList.remove('stg-typing');
                typing.textContent = T('Стратег не ответил — попробуй ещё раз.');
            });
    }

    function restartFlow(btn) {
        haptic('light');
        if (!btn.getAttribute('data-armed')) {
            btn.setAttribute('data-armed', '1');
            btn.style.color = '#f5bf4f';
            btn.textContent = T('Точно начать заново? Текущий план уйдёт в архив — нажми ещё раз');
            setTimeout(function () {
                if (btn && btn.getAttribute('data-armed')) {
                    btn.removeAttribute('data-armed');
                    btn.style.color = '';
                    btn.textContent = T('Начать новую стратегию');
                }
            }, 5000);
            return;
        }
        haptic('medium');
        apiRequest('/api/v1/strategy/restart', { method: 'POST' })
            .then(function (r) {
                if (r && r.ok) {
                    _guides = {}; _iv = {}; _started = false; _state = null;
                    window.__openStrategy();
                } else {
                    toast(T('Не удалось начать. Попробуй ещё раз'));
                }
            })
            .catch(function () { toast(T('Не удалось начать. Попробуй ещё раз')); });
    }


    function guideBlock(g) {
        var steps = (g.steps || []).map(function (s, i) {
            var num = parseInt(s.n, 10); if (isNaN(num)) num = i + 1;
            return '<div class="stg-gstep"><span class="n">' + num + '</span><span>' + esc(fixDays(s.text || '')) + '</span></div>';
        }).join('');
        var warns = (g.warnings || []).map(function (w) {
            return '<div class="stg-gwarn"><span><i class="ti ti-alert-triangle"></i></span><span>' + esc(w) + '</span></div>';
        }).join('');
        var tools = (g.tools || []).map(function (tl) {
            return '<div class="stg-gstep"><span class="n"><i class="ti ti-tool"></i></span><span><b>' + esc(tl.name || '') + '</b>' +
                (tl.where ? ' — ' + esc(tl.where) : '') + (tl.for ? ' (' + esc(tl.for) + ')' : '') + '</span></div>';
        }).join('');
        return '<div class="stg-guide"><h4>' + esc(g.title || T('Пошагово')) + '</h4>' + steps + tools + warns +
            '<button class="stg-ask" data-act="ask" data-t="' + esc(g.title || '') + '"><i class="ti ti-message-circle"></i> ' + esc(T('Спроси стратега об этом шаге')) + '</button></div>';
    }

    function openGuide(btn) {
        var key = btn.getAttribute('data-key');
        var slot = document.querySelector('#strategy-screen [data-slot="' + key + '"]');
        if (!slot) return;
        haptic('light');
        if (slot.innerHTML) { slot.innerHTML = ''; return; }
        if (_guides[key]) { slot.innerHTML = guideBlock(_guides[key]); return; }
        slot.innerHTML = '<div class="stg-guide"><div class="stg-gstep"><span class="n"><span class="stg-spin" style="width:12px;height:12px;border-width:2px;"></span></span><span>' + esc(T('Стратег пишет подробный гайд под твою ситуацию...')) + '</span></div></div>';
        apiRequest('/api/v1/strategy/guide', { method: 'POST', body: JSON.stringify({ key: key }) })
            .then(function (r) {
                if (r && r.ok && r.guide) {
                    _guides[key] = r.guide;
                    slot.innerHTML = guideBlock(r.guide);
                } else {
                    slot.innerHTML = '';
                    toast(T('Гайд не собрался — попробуй ещё раз'));
                }
            })
            .catch(function () { slot.innerHTML = ''; toast(T('Гайд не собрался — попробуй ещё раз')); });
    }

    function toggleStep(cb) {
        var key = cb.getAttribute('data-key');
        var done = !cb.classList.contains('done');
        haptic('light');
        cb.classList.toggle('done', done);
        if (!_state.progress) _state.progress = {};
        _state.progress[key] = done;
        var t = docTotals();
        var ring = document.querySelector('#strategy-screen .stg-ring');
        if (ring) {
            ring.style.background = 'conic-gradient(#5DCAA5 0 ' + t.pct + '%, rgba(255,255,255,0.08) ' + t.pct + '% 100%)';
            ring.querySelector('span').textContent = t.pct + '%';
        }
        var sub = document.getElementById('stg-doc-sub');
        if (sub) {
            var week = _state.week || 1;
            var iv = _state.interview || {};
            sub.textContent = t.done + ' ' + T('из') + ' ' + t.total + ' ' + T('шагов выполнено') +
                ' · ' + T('неделя') + ' ' + week + (week <= 4 ? ' ' + T('из') + ' 4' : '') +
                (iv.audience_geo ? ' · ' + T(iv.audience_geo) : '');
        }
        apiRequest('/api/v1/strategy/step', { method: 'POST', body: JSON.stringify({ key: key, done: done }) }).catch(function () {});
    }

    function toggleTerm(elm) {
        var key = elm.getAttribute('data-term');
        var terms = (_state && _state.doc && _state.doc.terms) || {};
        var def = terms[key];
        if (!def) return;
        haptic('light');
        var nxt = elm.nextElementSibling;
        if (nxt && nxt.classList && nxt.classList.contains('stg-tip')) { nxt.remove(); return; }
        var sec = elm.closest('.stg-sec');
        if (sec) sec.querySelectorAll('.stg-tip[data-tip-for]').forEach(function (t) { t.remove(); });
        var body = elm.closest('.stg-body');
        if (body && body.classList.contains('clamp')) {
            body.classList.remove('clamp');
            var m = body.parentElement.querySelector('.stg-more');
            if (m) m.remove();
        }
        var tip = document.createElement('span');
        tip.className = 'stg-tip';
        tip.style.display = 'block';
        tip.setAttribute('data-tip-for', key);
        tip.innerHTML = '<b>' + esc(key) + '</b> — ' + esc(def);
        elm.insertAdjacentElement('afterend', tip);
    }

    function copyPost(i) {
        var doc = _state.doc || {};
        var posts = null;
        (doc.sections || []).forEach(function (s) { if (s.posts && s.posts.length) posts = s.posts; });
        if (!posts || !posts[i]) return;
        haptic('medium');
        var p = posts[i];
        var run = (typeof copyText === 'function') ? copyText(p.text || '') : Promise.reject();
        Promise.resolve(run).then(function () { toast(T('Текст поста скопирован')); }).catch(function () {});
    }

    var _tr = null, _trTimer = null, _trChan = null, _trOpen = false, _trBusy = {};
    var TR_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    var TR_GEO = { ru: 'Россия', by: 'Беларусь', kz: 'Казахстан', uz: 'Узбекистан', kg: 'Кыргызстан', tj: 'Таджикистан', az: 'Азербайджан', ua: 'Украина' };

    function trForge(n) {
        return (typeof window.forgeAmount === 'function') ? window.forgeAmount(n, 12) : ('⚡ ' + num(n));
    }
    function trPct(x) {
        var s = String(x == null ? '' : x);
        return ((typeof window.getLang === 'function' ? window.getLang() : 'ru') === 'en') ? s : s.replace('.', ',');
    }
    function trafficCard() {
        return '<div class="stg-sec stg-trcard" data-act="traffic"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-rocket"></i></span> ' + esc(T('Трафик — двигатель роста')) + '</div>' +
            '<div class="stg-note" style="margin-top:9px;">' + esc(T('Креативы для площадок из постов недели, платный перелив с расчётом по CPM ниши, доноры из Радара, ссылки отслеживания и сверка — что дало приток.')) + '</div>' +
            '<div class="stg-trgo">' + esc(T('Открыть модуль')) + ' <i class="ti ti-chevron-right"></i></div></div>';
    }
    function trHead() {
        return '<div class="stg-head"><button class="stg-back" data-act="trback"><i class="ti ti-arrow-left"></i></button><div class="t">' + esc(T('Трафик')) + '</div></div>';
    }
    function trCenter(icon, msg) {
        setView('<div class="stg-center"><div class="big">' + icon + '</div><div class="m">' + esc(msg) + '</div></div>', trHead());
    }
    function openTraffic() {
        _trChan = (_state && _state.channel_id) || _trChan || null;
        trCenter('<div class="stg-spin"></div>', T('Загружаю модуль трафика...'));
        loadTraffic(false);
    }
    function trErrText(d) {
        var e = d && d.error;
        if (e === 'no_channel') return T('Подключи канал — модуль трафика работает с его данными.');
        if (e === 'locked') return T('Доступ к стратегии не открыт.');
        if (e === 'no_strategy') return T('Сначала открой стратегию.');
        return (d && d.message) || T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.');
    }
    function loadTraffic(silent) {
        var q = _trChan ? '?channel_id=' + _trChan : '';
        return apiRequest('/api/v1/strategy/traffic' + q).then(function (d) {
            if (!_trOpen) return;
            if (!d || !d.ok) { if (!silent) trCenter('⚠️', trErrText(d)); return; }
            _tr = d;
            if (d.channel) _trChan = d.channel.id;
            renderTraffic();
        }).catch(function () {
            if (!silent && _trOpen) trCenter('⚠️', T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.'));
        });
    }
    function trLive() {
        if (!_tr) return false;
        var posts = (_tr.conveyor && _tr.conveyor.posts) || [];
        var building = posts.some(function (p) { return p.creative && (p.creative.status === 'queued' || p.creative.status === 'generating'); });
        var picking = _tr.donors && (_tr.donors.status === 'running' || _tr.donors.status === 'analyzing');
        return building || !!picking;
    }
    function trPoll() {
        if (_trTimer) clearTimeout(_trTimer);
        if (!_trOpen || !trLive()) return;
        _trTimer = setTimeout(function () {
            _trTimer = null;
            if (!_trOpen) return;
            loadTraffic(true).then(trPoll);
        }, 15000);
    }
    function renderTraffic() {
        var d = _tr || {}, ch = d.channel || {}, g = d.goal || {}, pl = d.platforms || {}, cv = d.conveyor || {},
            pd = d.paid || {}, dn = d.donors || {}, lk = d.links || {}, rv = d.review || {};
        var growth = (g.growth_30d === null || g.growth_30d === undefined) ? null : g.growth_30d;
        var html = '<div class="stg-trchan"><b>' + esc(ch.title || ('@' + (ch.username || ''))) + '</b>' + (ch.username ? '<span>@' + esc(ch.username) + '</span>' : '') + '</div>';

        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-target-arrow"></i></span> ' + esc(T('Цель')) + '</div>' +
            '<div class="stg-trbig"><span class="v">+' + num(g.target_add || 0) + '</span><span class="u">' + esc(T('подписчиков за 30 дней')) + '</span>' +
            '<button class="stg-tredit" data-act="trgoal" aria-label="' + esc(T('Изменить цель')) + '"><i class="ti ti-pencil"></i></button></div>' +
            '<div id="stg-trgoal-form" class="stg-trform" style="display:none;"><input class="stg-inp stg-trinp" id="stg-trgoal-inp" type="number" inputmode="numeric" min="10" value="' + (g.target_add || 0) + '">' +
            '<button class="stg-trbtn pri" data-act="trgoalsave">' + esc(T('Сохранить')) + '</button></div>' +
            '<div class="stg-trkv"><span>' + esc(T('Сейчас')) + '</span><b>' + num(ch.subscribers || 0) + '</b>' +
            '<span>' + esc(T('Прирост за месяц')) + '</span><b>' + (growth === null ? esc(T('не измерен')) : ((growth > 0 ? '+' : '') + num(growth))) + '</b></div>' +
            (g.is_default ? '<div class="stg-note" style="margin-top:8px;">' + esc(T('Цель по умолчанию — +10% за месяц. Поставь свою.')) + '</div>' : '') +
            '<div class="stg-note" style="margin-top:6px;">' + esc(T('Постами это не сделать — нужен приток: креативы на площадках и платный перелив.')) + '</div></div>';

        var geoName = pl.geo ? (TR_GEO[pl.geo] ? T(TR_GEO[pl.geo]) : String(pl.geo).toUpperCase()) : T('страна не определена');
        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-player-play"></i></span> ' + esc(T('УБТ · площадки')) + ' · ' + esc(geoName) + '</div>';
        (pl.use || []).forEach(function (p) {
            var link = lk.platforms && lk.platforms[p.key];
            var url = link ? (link.click_url || link.invite_link || '') : '';
            html += '<div class="stg-trrow"><div class="tx"><b>' + esc(p.name) + '</b>' +
                (link ? '<em><span class="stg-trlink" data-act="trcopy" data-text="' + esc(url) + '">' + esc(url.replace(/^https?:\/\//, '')) + '</span> · +' + num(link.joined || 0) + ' ' + esc(T('вступили')) +
                    ((link.clicks !== null && link.clicks !== undefined) ? ' · ' + num(link.clicks) + ' ' + esc(T('переходов')) : '') + '</em>'
                    : '<em>' + esc(T('Ссылка для описания ролика ещё не создана')) + '</em>') + '</div>' +
                (link ? '' : '<button class="stg-trbtn" data-act="trplink" data-key="' + esc(p.key) + '"' + (ch.connected ? '' : ' disabled') + '>' + esc(T('Создать ссылку')) + '</button>') + '</div>';
        });
        if (pl.excluded && pl.excluded.length) html += '<div class="stg-note" style="margin-top:8px;">' + esc(pl.excluded.map(function (p) { return p.name; }).join(', ')) + ' — ' + esc(T('только под VPN, из плана исключены.')) + '</div>';
        if (!ch.connected) html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('Ссылки создаёт бот — подключи его к каналу в настройках канала.')) + '</div>';
        html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('Ссылка площадки ставится в описание ролика: сверка увидит, сколько подписчиков дала каждая площадка.')) + '</div></div>';

        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-movie"></i></span> ' + esc(T('Конвейер креативов из постов недели')) +
            (cv.per_week ? '<span class="stg-trchip">' + num(cv.ready || 0) + ' / ' + num(cv.per_week) + '</span>' : '') + '</div>' +
            '<div class="stg-note" style="margin-top:8px;">' + esc(T('Каждый пост недели → ролик 9:16 с озвучкой и музыкой: хук, тезисы, число, призыв в канал. Готовый файл через 3–4 минуты.')) + '</div>';
        if (!cv.has_plan) {
            html += '<div class="stg-note" style="margin-top:8px;">' + esc(T('Недели в контент-плане нет — собери её, и посты появятся здесь.')) + '</div>' +
                '<button class="stg-trbtn wide" data-act="trplan">' + esc(T('Открыть контент-план')) + '</button>';
        } else if (!(cv.posts || []).length) {
            html += '<div class="stg-note" style="margin-top:8px;">' + esc(T('В неделе пока нет постов с текстом.')) + '</div>';
        } else {
            (cv.posts || []).forEach(function (p) {
                var c = p.creative, right = '';
                if (_trBusy[p.id] || (c && (c.status === 'queued' || c.status === 'generating'))) {
                    right = '<span class="stg-trwait"><span class="stg-spin sm"></span>' + esc(T('Собираю')) + '</span>';
                } else if (c && c.status === 'ready' && c.url) {
                    right = '<button class="stg-trbtn ok" data-act="tropen" data-url="' + esc(c.url) + '"><i class="ti ti-download"></i> MP4</button>' +
                        '<button class="stg-trbtn" data-act="trdesc" data-id="' + c.id + '" aria-label="' + esc(T('Описание для ролика')) + '"><i class="ti ti-copy"></i></button>';
                } else if (c && c.status === 'error') {
                    right = '<button class="stg-trbtn" data-act="trbuild" data-id="' + p.id + '">' + esc(T('Собрать заново')) + '</button>';
                } else {
                    right = '<button class="stg-trbtn pri" data-act="trbuild" data-id="' + p.id + '">' + esc(T('Собрать креатив')) + '</button>';
                }
                html += '<div class="stg-trrow"><div class="day">' + esc(T(TR_DAYS[p.day_index] || '')) + '</div><div class="tx"><b>' + esc(p.title || p.rubric || '') + '</b>' +
                    (p.published ? '<em>' + esc(T('пост вышел')) + '</em>' : '') + '</div><div class="acts">' + right + '</div></div>';
            });
        }
        html += '</div>';

        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-coin"></i></span> ' + esc(T('Платный перелив')) + '</div>' +
            '<div class="stg-trform" style="margin-top:8px;"><label class="stg-trlab" for="stg-trbudget-inp">' + esc(T('Бюджет, ₽')) + '</label>' +
            '<input class="stg-inp stg-trinp" id="stg-trbudget-inp" type="number" inputmode="numeric" min="0" step="500" value="' + (pd.budget || 0) + '">' +
            '<button class="stg-trbtn" data-act="trbudget">' + esc(T('Пересчитать')) + '</button></div>' +
            '<div class="stg-trbig"><span class="v">≈ ' + num(pd.est_lo || 0) + '–' + num(pd.est_hi || 0) + '</span><span class="u">' + esc(T('подписчиков за')) + ' ' + num(pd.budget || 0) + ' ₽</span></div>' +
            '<div class="stg-trkv"><span>' + esc(T('CPM ниши')) + '</span><b>' + num(pd.cpm_lo || 0) + '–' + num(pd.cpm_hi || 0) + ' ₽</b>' +
            '<span>' + esc(T('Цена подписчика')) + '</span><b>' + num(pd.cpf_lo || 0) + '–' + num(pd.cpf_hi || 0) + ' ₽</b>' +
            '<span>' + esc(T('Конверсия')) + '</span><b>' + trPct(pd.conv_lo) + '–' + trPct(pd.conv_hi) + '% · ' + esc(pd.conv_source === 'deals' ? T('по замерам сделок') : T('норма рынка')) + '</b>' +
            (pd.placements ? '<span>' + esc(T('Размещений')) + '</span><b>≈ ' + num(pd.placements) + ' · ' + esc(T('медиана цены доноров')) + ' ' + num(pd.donor_median_price) + ' ₽</b>' : '') + '</div>' +
            '<div class="stg-note" style="margin-top:8px;">' + esc(T('Расчёт: бюджет ÷ цена подписчика. Цена подписчика = CPM ниши ÷ 1000 ÷ конверсия из охвата в подписку.')) + '</div></div>';

        var picking = dn.status === 'running' || dn.status === 'analyzing';
        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-radar"></i></span> ' + esc(T('Доноры из Радара')) + '</div>';
        if (picking) {
            html += '<div class="stg-trwait" style="margin-top:8px;"><span class="stg-spin sm"></span>' + esc(T('Подбираю каналы под нишу — 1–2 минуты')) + '</div>';
        } else if (dn.picks && dn.picks.length) {
            dn.picks.forEach(function (p) {
                html += '<div class="stg-trrow"><div class="tx"><b>@' + esc(p.username || '') + '</b><em>' + num(p.subscribers || 0) + ' ' + esc(T('подп.')) +
                    (p.er ? ' · ER ' + trPct(p.er) + '%' : (p.err ? ' · ERR ' + Math.round(p.err) + '%' : '')) +
                    (p.price ? ' · ' + num(p.price) + ' ₽' : '') + (p.cpm ? ' · CPM ' + num(p.cpm) : '') + '</em></div>' +
                    (p.match ? '<span class="stg-trchip">' + p.match + '%</span>' : '') + '</div>';
            });
            if (dn.total > dn.picks.length) html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('Ещё')) + ' ' + num(dn.total - dn.picks.length) + ' ' + esc(T('в отчёте подбора')) + '</div>';
        } else if (dn.status === 'empty') {
            html += '<div class="stg-note" style="margin-top:8px;">' + esc(T('В прошлый раз подходящих каналов не нашлось — Радар пополняется, попробуй снова.')) + '</div>';
        } else {
            html += '<div class="stg-note" style="margin-top:8px;">' + esc(T('Подбор смотрит каналы твоей ниши в Радаре: живые, без накрутки и рекламного шума, с ценой и CPM.')) + '</div>';
        }
        if (!picking) html += '<button class="stg-trbtn wide" data-act="trpick">' + esc(dn.picks && dn.picks.length ? T('Подобрать заново') : T('Подобрать доноров')) + ' · ' + trForge(dn.price || 0) + '</button>';
        html += '</div>';

        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-link"></i></span> ' + esc(T('Ссылки на размещения')) + '</div>';
        if (lk.placements && lk.placements.length) {
            lk.placements.forEach(function (r) {
                var v = r.verdict || 'no_est';
                var vt = v === 'ok' ? T('по расчёту') : v === 'below' ? T('ниже расчёта') : v === 'low' ? T('сильно ниже') : v === 'wait' ? T('ждём') : T('без расчёта');
                html += '<div class="stg-trrow"><div class="tx"><b>' + esc(r.seller ? '@' + r.seller : (r.name || '')) + '</b><em>' + (r.price ? num(r.price) + ' ₽ · ' : '') +
                    '+' + num(r.joined || 0) + ' ' + esc(T('вступили')) +
                    ((r.est_joined !== null && r.est_joined !== undefined) ? ' · ' + esc(T('расчёт')) + ' ' + num(r.est_joined) : '') +
                    (r.cpf ? ' · ' + num(r.cpf) + ' ₽/' + esc(T('подп.')) : '') + '</em></div><span class="stg-trverd ' + esc(v) + '">' + esc(vt) + '</span></div>';
            });
        } else {
            html += '<div class="stg-note" style="margin-top:8px;">' + esc(T('На каждое размещение — своя ссылка: сколько пришло, сколько осталось через 48 часов и цена подписчика по факту.')) + '</div>';
        }
        html += '<button class="stg-trbtn wide" data-act="trlinks">' + esc(T('Ссылки отслеживания')) + '</button></div>';

        var total = (rv.platform_joined || 0) + (rv.placement_joined || 0);
        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-chart-bar"></i></span> ' + esc(T('Сверка: что дало приток')) + '</div>';
        if (rv.has_data) {
            html += '<div class="stg-trkv" style="margin-top:8px;"><span>' + esc(T('Площадки')) + '</span><b>+' + num(rv.platform_joined || 0) + '</b>' +
                '<span>' + esc(T('Размещения')) + '</span><b>+' + num(rv.placement_joined || 0) + '</b>' +
                '<span>' + esc(T('Итого по ссылкам')) + '</span><b>+' + num(total) + ' ' + esc(T('из')) + ' ' + num(g.target_add || 0) + '</b></div>';
        } else {
            html += '<div class="stg-note" style="margin-top:8px;">' + esc(T('Сверка появится, когда по ссылкам площадок и размещений пойдут переходы.')) + '</div>';
        }
        html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('Стратег сверяет расчёт с фактом раз в неделю и перераспределяет бюджет и задачи.')) + '</div></div>';

        setView(html, trHead());
        trPoll();
    }
    function trSave(body) {
        body.channel_id = _trChan;
        if (body.target_add !== undefined && !(body.target_add > 0)) { toast(T('Укажи число')); return; }
        if (body.budget !== undefined && !(body.budget >= 0)) { toast(T('Укажи число')); return; }
        apiRequest('/api/v1/strategy/traffic', { method: 'POST', body: JSON.stringify(body) }).then(function (r) {
            if (r && r.ok) { haptic('light'); toast(T('Сохранено')); loadTraffic(true); }
            else toast(trErrText(r));
        }).catch(function () { toast(T('Не удалось сохранить')); });
    }
    function trBuild(pid) {
        if (_trBusy[pid]) return;
        _trBusy[pid] = true;
        haptic('medium');
        renderTraffic();
        var lang = (typeof window.getLang === 'function' ? window.getLang() : 'ru') || 'ru';
        apiRequest('/api/v1/creative/build', { method: 'POST', body: JSON.stringify({ post_id: pid, lang: lang }) }).then(function (r) {
            delete _trBusy[pid];
            if (r && r.ok) { toast(T('Собираю ролик — сообщу, когда будет готов')); loadTraffic(true).then(trPoll); }
            else { toast((r && (r.message || r.error)) || T('Не удалось запустить сборку')); renderTraffic(); }
        }).catch(function (err) { delete _trBusy[pid]; toast((err && err.message) || T('Не удалось запустить сборку')); renderTraffic(); });
    }
    function trOpenUrl(u) {
        try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) window.Telegram.WebApp.openLink(u);
            else window.open(u, '_blank');
        } catch (e) { window.open(u, '_blank'); }
    }
    function trCopy(text, doneMsg) {
        var run = (typeof copyText === 'function') ? copyText(text) : Promise.reject();
        Promise.resolve(run).then(function () { haptic('light'); toast(doneMsg || T('Ссылка скопирована')); }).catch(function () { toast(text); });
    }
    function trDescription(cid) {
        apiRequest('/api/v1/creative/' + cid).then(function (r) {
            var c = r && r.creative;
            if (!c) { toast(T('Не удалось получить описание')); return; }
            var lines = [];
            if (c.cta_text) lines.push(c.cta_text);
            var pls = (_tr && _tr.links && _tr.links.platforms) || {};
            var pick = pls.shorts || pls.dzen || pls.vk || pls.tiktok || pls.reels;
            var ch = (_tr && _tr.channel) || {};
            if (pick && (pick.click_url || pick.invite_link)) lines.push(pick.click_url || pick.invite_link);
            else if (ch.username) lines.push('https://t.me/' + ch.username);
            if (c.credits && c.credits.length) lines.push(T('Видео') + ': Pexels — ' + c.credits.join(', '));
            if (c.music_credit) lines.push(T('Музыка') + ': ' + c.music_credit);
            trCopy(lines.join('\n'), T('Описание скопировано'));
        }).catch(function () { toast(T('Не удалось получить описание')); });
    }
    function trPlatformLink(key, btn) {
        if (btn) btn.disabled = true;
        haptic('medium');
        apiRequest('/api/v1/strategy/traffic/platform-link', { method: 'POST', body: JSON.stringify({ channel_id: _trChan, key: key }) }).then(function (r) {
            if (r && r.ok) { toast(T('Ссылка создана')); loadTraffic(true); }
            else { toast((r && (r.message || r.error)) || T('Не удалось создать ссылку')); if (btn) btn.disabled = false; }
        }).catch(function () { toast(T('Не удалось создать ссылку')); if (btn) btn.disabled = false; });
    }
    function trPick(btn) {
        var price = (_tr && _tr.donors && _tr.donors.price) || 0;
        var bal = (_tr && _tr.balance) || 0;
        var ask = (typeof confirmDialog === 'function')
            ? confirmDialog(T('Подбор доноров') + '\n' + T('Спишется') + ' ⚡' + num(price) + '. ' + T('На балансе') + ' ⚡' + num(bal) + '.', T('Списать и подобрать'))
            : Promise.resolve(true);
        Promise.resolve(ask).then(function (ok) {
            if (!ok) return;
            if (btn) btn.disabled = true;
            haptic('medium');
            apiRequest('/api/v1/adpick/start', { method: 'POST', body: JSON.stringify({ channel_id: _trChan }) }).then(function (r) {
                if (r && r.ok) { toast(T('Подбираю каналы — 1–2 минуты')); loadTraffic(true).then(trPoll); }
                else { toast((r && (r.message || r.error)) || T('Не удалось запустить подбор')); if (btn) btn.disabled = false; }
            }).catch(function (err) { toast((err && err.message) || T('Не удалось запустить подбор')); if (btn) btn.disabled = false; });
        });
    }
    function trAction(act, el) {
        if (act === 'traffic') { haptic('light'); openTraffic(); return true; }
        if (act === 'trback') {
            haptic('light');
            _trOpen = false;
            if (_state && _state.status === 'active' && _state.doc) renderDoc(); else load();
            return true;
        }
        if (act === 'trgoal') {
            var f = document.getElementById('stg-trgoal-form');
            if (f) {
                var show = f.style.display === 'none';
                f.style.display = show ? 'flex' : 'none';
                var inp = document.getElementById('stg-trgoal-inp');
                if (show && inp) inp.focus();
            }
            return true;
        }
        if (act === 'trgoalsave') { trSave({ target_add: parseInt((document.getElementById('stg-trgoal-inp') || {}).value, 10) }); return true; }
        if (act === 'trbudget') { trSave({ budget: parseInt((document.getElementById('stg-trbudget-inp') || {}).value, 10) }); return true; }
        if (act === 'trbuild') { trBuild(parseInt(el.getAttribute('data-id'), 10)); return true; }
        if (act === 'tropen') { haptic('light'); trOpenUrl(el.getAttribute('data-url')); return true; }
        if (act === 'trdesc') { trDescription(parseInt(el.getAttribute('data-id'), 10)); return true; }
        if (act === 'trplink') { trPlatformLink(el.getAttribute('data-key'), el); return true; }
        if (act === 'trcopy') { trCopy(el.getAttribute('data-text') || ''); return true; }
        if (act === 'trpick') { trPick(el); return true; }
        if (act === 'trplan') { haptic('light'); _trOpen = false; closeStrategy(); if (typeof window.__openContentPlan === 'function') window.__openContentPlan(); return true; }
        if (act === 'trlinks') { haptic('light'); _trOpen = false; closeStrategy(); if (typeof window.__openPlacements === 'function') window.__openPlacements(); return true; }
        return false;
    }
    window.__stgTrafficForCheck = function (data, channelId) { _tr = data; _trChan = channelId || null; ensureScreen(); renderTraffic(); };

    function onScreenClick(ev) {
        var t = ev.target;
        var actEl = t.closest ? t.closest('[data-act]') : null;
        if (t.closest && t.closest('.stg-term')) { toggleTerm(t.closest('.stg-term')); return; }
        if (!actEl) return;
        var act = actEl.getAttribute('data-act');
        if (trAction(act, actEl)) return;
        if (act === 'close') { haptic('light'); closeStrategy(); return; }
        if (act === 'start') { startFlow(); return; }
        if (act === 'buy') { doPurchase(actEl, false); return; }
        if (act === 'renew') { doPurchase(actEl, true); return; }
        if (act === 'next') { stepNext(); return; }
        if (act === 'prev') { haptic('light'); _ivStep = Math.max(0, _ivStep - 1); renderStep(); return; }
        if (act === 'regen') { regen(actEl); return; }
        if (act === 'restart') { restartFlow(actEl); return; }
        if (act === 'jump') {
            var to = actEl.getAttribute('data-to');
            var tgt = document.querySelector('#strategy-screen [data-sec="' + to + '"]');
            if (tgt) { haptic('light'); tgt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            return;
        }
        if (act === 'cb') { toggleStep(actEl); return; }
        if (act === 'how') { openGuide(actEl); return; }
        if (act === 'more') {
            var b = actEl.parentElement.querySelector('.stg-body');
            if (b) b.classList.remove('clamp');
            actEl.remove();
            return;
        }
        if (act === 'send') { sendChat(); return; }
        if (act === 'ask') {
            var inp = document.getElementById('stg-chat-inp');
            if (inp) {
                inp.value = T('Вопрос по шагу') + ' «' + (actEl.getAttribute('data-t') || '') + '»: ';
                inp.focus();
                inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        if (act === 'copy') { ev.stopPropagation(); copyPost(parseInt(actEl.getAttribute('data-i'), 10)); return; }
        if (act === 'post') {
            var row = actEl.closest('.stg-post');
            if (row) { haptic('light'); row.classList.toggle('open'); }
            return;
        }
    }

    document.addEventListener('click', function (ev) {
        var host = document.getElementById('strategy-screen');
        if (!host || host.style.display === 'none') return;
        var chip = ev.target.closest ? ev.target.closest('.stg-ch') : null;
        if (chip && host.contains(chip)) chipTap(chip);
    });

    document.addEventListener('keydown', function (ev) {
        if (ev.isComposing) return;
        if (ev.key === 'Enter' && ev.target && ev.target.id === 'stg-chat-inp') sendChat();
    });
})();
