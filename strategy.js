/* AI-стратегия канала — фронтенд по утверждённому макету (14.07).
   Экраны: витрина -> интервью (5 шагов) -> генерация -> живой документ
   (график площадок, шаги-галочки, ленивые гайды, термины) -> разбор недели -> чат.
   Доступ: полный у админа/купивших; остальным витрина с бронью (до биллинга). */
(function () {
    'use strict';

    var _state = null;          // последний ответ GET /strategy
    var _pollTimer = null;
    var _genTimer = null;
    var _channels = null;       // список каналов юзера (для шага 1)
    var _iv = {};               // ответы интервью
    var _ivStep = 0;
    var _started = false;       // строка strategies создана
    var _guides = {};           // step_key -> guide json (кэш на клиенте)

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }

    function esc(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');   // единый стандарт экранирования во всех модулях
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

    var MAP_SVG = '<svg width="30" height="30" viewBox="0 0 44 44" fill="none">' +
        '<rect x="5" y="10" width="34" height="26" rx="6" stroke="#8b8ff8" stroke-width="2" fill="rgba(129,140,248,0.09)"/>' +
        '<path d="M16.5 10v26M27.5 10v26" stroke="rgba(139,143,248,0.3)" stroke-width="1.4"/>' +
        '<path d="M10.5 29.5c5.5-8 9.5 3.5 14.5-3.5 3-4.2 5.5-6 8.5-7.5" stroke="#8b5cf6" stroke-width="2.3" stroke-linecap="round" stroke-dasharray="0.6 4.6"/>' +
        '<circle cx="10.5" cy="29.5" r="2.7" fill="#8b8ff8"/><circle cx="10.5" cy="29.5" r="4.6" stroke="rgba(139,143,248,0.4)" stroke-width="1.2"/>' +
        '<path d="M34 8.5c2.5 0 4.5 1.9 4.5 4.3 0 3.2-4.5 7.4-4.5 7.4s-4.5-4.2-4.5-7.4c0-2.4 2-4.3 4.5-4.3z" fill="#5DCAA5"/>' +
        '<circle cx="34" cy="12.9" r="1.7" fill="#06231a"/></svg>';

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

    // ==================== каркас экрана ====================

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
    }

    function headHtml() {
        return '<div class="stg-head"><button class="stg-back" data-act="close">' +
            '<i class="ti ti-arrow-left"></i></button><div class="t">' + T('AI-стратегия') + '</div></div>';
    }

    function setView(html) {
        var host = ensureScreen();
        stopTimers();
        host.innerHTML = headHtml() + html;
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
        // старые документы без флага checkable: метрики и варианты ниши — справочные пункты
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

    // ==================== 1. Витрина ====================

    function renderShowcase() {
        var locked = !_state || _state.access !== 'full';
        var rows = [
            ['Ниша под твои интересы.', 'Стратег расспросит, чем ты горишь и сколько времени готов тратить, и предложит 3 ниши, где сходятся твой интерес, спрос рекламодателей и невысокая конкуренция. Уже есть канал — оценит его по реальным постам и скажет, что усилить'],
            ['Контент-план + первые 10 постов.', 'Не «пиши о пользе», а готовые рубрики по дням недели, сколько постить и почему именно столько, и 10 первых постов готовыми текстами: открыл, вставил, опубликовал'],
            ['Трафик под твою страну.', 'Бесплатные и платные способы с гайдами до уровня «скачай вот это приложение, смонтируй ролик по этой формуле, выложи в это время». С правилами каждой площадки — как расти и не улететь в бан'],
            ['Все модели заработка.', 'Реклама в канале, перелив трафика, партнёрки, свой продукт. По каждой: с какого размера канала включать, сколько это даёт в месяц в твоей нише и что подготовить заранее'],
            ['4 недели ведения за руку.', 'Каждую неделю стратег сам сверяет план с фактом по данным твоего канала: что сработало, где отстаёшь, что делать дальше. Плюс чат — задавай вопросы в любой момент'],
        ];
        var what = rows.map(function (r) {
            return '<div class="stg-fw"><span class="tick">✓</span><span><b>' + esc(T(r[0])) + '</b> ' + esc(T(r[1])) + '</span></div>';
        }).join('');
        var cta = locked
            ? '<button class="stg-fcta" data-act="book"><i class="ti ti-bookmark"></i> ' + esc(T('Забронировать место')) + '</button>' +
              '<div class="stg-fnote">' + esc(T('Бронь бесплатная. Забронировавшие получают доступ первыми и фиксируют цену 2 490 ₽ на запуске')) + '</div>'
            : '<button class="stg-fcta" data-act="start">' + esc(T('Построить мою стратегию')) + '</button>' +
              '<div class="stg-fnote">' + esc(T('≈ 5 минут интервью — и полный план у тебя на руках')) + '</div>';
        setView(
            '<div class="stg-flag"><div class="glow"></div>' +
            '<span class="stg-ribbon">' + esc(T('Личный стратег')) + '</span>' +
            '<div class="inner"><div class="stg-fhead"><div class="stg-fic">' + MAP_SVG + '</div>' +
            '<div><div class="stg-fname">' + esc(T('AI-стратегия канала')) + '</div>' +
            '<div class="stg-fsub">' + esc(T('персональный план роста, наполнения и заработка')) + '</div></div></div>' +
            '<div class="stg-fwhat">' + what + '</div>' +
            '<div class="stg-fprice"><b>2 490 ₽</b><span>' + esc(T('разово · продление ведения — 990 ₽/мес')) + '</span></div>' +
            cta + '</div></div>');
        if (locked) markBooked();
    }

    function markBooked() {
        apiRequest('/api/v1/user/tariffs').then(function (d) {
            var booked = (d && d.booked_extras) || [];
            if (booked.indexOf('ai_strategy') >= 0) setBookedCta();
        }).catch(function () {});
    }

    function setBookedCta() {
        var btn = document.querySelector('#strategy-screen [data-act="book"]');
        if (btn) {
            btn.classList.add('booked');
            btn.removeAttribute('data-act');   // повторные POST /book-extra исключены
            btn.innerHTML = '<i class="ti ti-circle-check"></i> ' + esc(T('Забронировано · уведомим при запуске'));
        }
    }

    function doBook(btn) {
        haptic('medium');
        btn.disabled = true;
        apiRequest('/api/v1/user/book-extra', { method: 'POST', body: JSON.stringify({ key: 'ai_strategy' }) })
            .then(function (r) {
                btn.disabled = false;
                if (r && r.ok && r.booked) {
                    haptic('medium');
                    setBookedCta();
                    toast(T('Бронь оформлена — пришлём уведомление при запуске'));
                } else {
                    toast(T('Не удалось забронировать — попробуй ещё раз'));
                }
            })
            .catch(function () { btn.disabled = false; toast(T('Не удалось забронировать — попробуй ещё раз')); });
    }

    // ==================== 2. Интервью ====================

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
            (_ivStep > 0 ? '<button class="stg-prev" data-act="prev">← ' + esc(T('Назад')) + '</button>' : '') +
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
        // валидация: нужен хотя бы один ответ (или свой вариант)
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

    // ==================== 3. Генерация ====================

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
        setView('<div class="stg-center"><div class="stg-fic" style="width:64px;height:64px;border-radius:18px;">' + MAP_SVG + '</div>' +
            '<div class="stg-spin"></div>' +
            '<div class="m" id="stg-gen-text">' + esc(T(GEN_TEXTS[0])) + '</div>' +
            '<div class="m" style="font-size:11px;color:#565b73;">' + esc(T('Обычно это занимает 2–4 минуты. Можно закрыть — стратегия соберётся сама')) + '</div></div>');
        var i = 0;
        _genTimer = setInterval(function () {
            var el = document.getElementById('stg-gen-text');
            if (!el) return;
            if (i < GEN_TEXTS.length - 1) {
                i++;
                el.textContent = T(GEN_TEXTS[i]);   // доходим до последней фразы и останавливаемся
            }
        }, 26000);
    }

    function startPoll() {
        if (_pollTimer) clearInterval(_pollTimer);
        var ticks = 0;
        _pollTimer = setInterval(function () {
            ticks++;
            if (ticks === 60) {   // ~6 минут: честно меняем обещание
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

    // ==================== 4. Документ ====================

    function docTotals() {
        var total = 0, done = 0;
        var prog = _state.progress || {};
        (_state.doc.sections || []).forEach(function (sec) {
            (sec.steps || []).forEach(function (s) {
                if (s.checkable === false) return;   // метрики/варианты ниши — не задачи
                total++;
                if (prog[s.key]) done++;
            });
        });
        return { total: total, done: done, pct: total ? Math.round(done / total * 100) : 0 };
    }

    function ringHtml(t) {
        return '<div class="stg-ring" style="background:conic-gradient(#5DCAA5 0 ' + t.pct + '%, rgba(255,255,255,0.08) ' + t.pct + '% 100%)"><span>' + t.pct + '%</span></div>';
    }

    // termWrap: экранирует текст и оборачивает первые вхождения терминов (до 3 на блок)
    function _isWordChar(ch) { return ch != null && /[0-9A-Za-z\u00C0-\u024F\u0400-\u04FF]/.test(ch); }

    function termWrap(text) {
        var terms = (_state && _state.doc && _state.doc.terms) || {};
        var plain = String(text || '');
        var low = plain.toLowerCase();
        var found = [];
        for (var k in terms) {
            if (!terms.hasOwnProperty(k) || k.length < 2 || k.length > 34) continue;
            var idx = low.indexOf(k.toLowerCase());
            // совпадение только по границам слова (не внутри другого слова)
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
        // справочные пункты (метрики, варианты ниши) — без чекбокса; точка-маркер вместо него
        var mark = (s.checkable === false)
            ? '<span class="stg-dot"></span>'
            : '<span class="stg-cb' + (done ? ' done' : '') + '" data-act="cb" data-key="' + esc(s.key) + '"></span>';
        return '<div class="stg-step" data-step="' + esc(s.key) + '">' + mark +
            '<div class="t"><b>' + esc(fixDays(s.title)) + '</b>' + (s.body ? bodyHtml(fixDays(s.body)) : '') + '</div>' + how +
            '</div><div class="stg-gslot" data-slot="' + esc(s.key) + '"></div>';
    }

    // стоимость в метке — коротко: до первой запятой/скобки, максимум ~26 символов
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

        (doc.sections || []).forEach(function (sec) {
            var hasContent = (sec.intro && sec.intro.trim()) || (sec.steps && sec.steps.length) ||
                (sec.chart && sec.chart.bars && sec.chart.bars.length) || (sec.posts && sec.posts.length);
            if (!hasContent) return;
            var inner = '<div class="stg-eyebrow"><span class="tile">' + (SEC_ICON[sec.key] || '<i class="ti ti-pin"></i>') + '</span> ' + esc(T(sec.title || sec.key)) + '</div>';
            if (sec.key === 'niche' && sec.chosen && sec.chosen !== (doc.niche || '')) {
                inner += '<div class="stg-tip" style="margin-top:10px;"><b>' + esc(T('Рекомендация стратега:')) + '</b> ' + esc(sec.chosen) + '</div>';
            }
            if (sec.intro && sec.intro.trim()) {
                inner += bodyHtml(fixDays(sec.intro), true);   // длинные intro сворачиваются как тела шагов
            }
            inner += chartHtml(sec.chart);
            if (sec.steps && sec.steps.length) {
                inner += '<div style="margin-top:6px;">' + sec.steps.map(stepHtml).join('') + '</div>';
            }
            inner += postsHtml(sec.posts);
            html += '<div class="stg-sec" data-sec="' + esc(sec.key) + '">' + inner + '</div>';
        });

        html += reviewHtml();
        html += chatHtml();
        html += '<button class="stg-prev" data-act="restart" style="margin-top:14px;">' +
            esc(T('Начать новую стратегию')) + '</button>';
        var host = setView(html);
        unclampSmall(host);
        var chatBox = document.getElementById('stg-chat-msgs');
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    }

    // свёртка честная: если за окном прячется меньше полутора строк — показываем всё
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

    // ==================== 5. Разбор недели ====================

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

    // ==================== 6. Чат ====================

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
        var typing = box.lastElementChild;   // ссылка на СВОЙ пузырь (id больше не путается)
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

    // ==================== гайды и клики ====================

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
        // повторный тап по тому же слову — закрыть
        var nxt = elm.nextElementSibling;
        if (nxt && nxt.classList && nxt.classList.contains('stg-tip')) { nxt.remove(); return; }
        // подсказка раскрывается ПРЯМО ПОД словом, в месте тапа
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

    function onScreenClick(ev) {
        var t = ev.target;
        var actEl = t.closest ? t.closest('[data-act]') : null;
        if (t.closest && t.closest('.stg-term')) { toggleTerm(t.closest('.stg-term')); return; }
        if (!actEl) return;
        var act = actEl.getAttribute('data-act');
        if (act === 'close') { haptic('light'); closeStrategy(); return; }
        if (act === 'start') { startFlow(); return; }
        if (act === 'book') { doBook(actEl); return; }
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

    // чипы интервью — делегирование отдельно (динамический data-chip)
    document.addEventListener('click', function (ev) {
        var host = document.getElementById('strategy-screen');
        if (!host || host.style.display === 'none') return;
        var chip = ev.target.closest ? ev.target.closest('.stg-ch') : null;
        if (chip && host.contains(chip)) chipTap(chip);
    });

    // Enter в чате
    document.addEventListener('keydown', function (ev) {
        if (ev.isComposing) return;   // Enter подтверждения IME (CJK) не отправляет вопрос
        if (ev.key === 'Enter' && ev.target && ev.target.id === 'stg-chat-inp') sendChat();
    });
})();
