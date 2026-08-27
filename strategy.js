(function () {
    'use strict';

    var _state = null;
    var _pollTimer = null;
    var _genTimer = null;
    var _channels = null;
    var _iv = {};
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
        if (_docTimer) { clearTimeout(_docTimer); _docTimer = null; }
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
        renderShowcase();
    }

    function renderCenter(icon, msg) {
        setView('<div class="stg-center"><div class="big">' + icon + '</div><div class="m">' + esc(msg) + '</div></div>');
    }


    function forge(n) {
        return (typeof window.forgeAmount === 'function') ? window.forgeAmount(n, 13) : num(n);
    }
    function accessUntilText() {
        var iso = _state && _state.access_until;
        if (!iso) return '';
        try {
            var lang = (typeof window.getLang === 'function' ? window.getLang() : 'ru') || 'ru';
            return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'long' });
        } catch (e) { return String(iso).slice(0, 10); }
    }
    function accessChip() {
        if (!_state || _state.access !== 'full') return '';
        if (_state.access_source === 'tester') return '<div class="stg-fchips"><span class="stg-fchip g"><i class="ti ti-circle-check"></i> ' + esc(T('Доступ открыт')) + '</span><span class="stg-fchip">' + esc(T('тестировщик')) + '</span></div>';
        var until = accessUntilText();
        return '<div class="stg-fchips"><span class="stg-fchip g"><i class="ti ti-circle-check"></i> ' + esc(T('Доступ открыт')) + (until ? ' · ' + esc(T('до')) + ' ' + esc(until) : '') + '</span></div>';
    }
    function renderShowcase() {
        var prices = (_state && _state.prices) || {};
        var nprice = prices.new || 3990, rprice = prices.renewal || 1990;
        if (_state && _state.access === 'expired') {
            setView(
                '<div class="stg-flag"><div class="glow"></div>' +
                '<div class="inner"><span class="stg-ribbon">' + esc(T('Личный стратег')) + '</span>' +
                '<div class="stg-fhead"><div class="stg-fic">' + STG_ICON + '</div>' +
                '<div><div class="stg-fname">' + esc(T('Срок ведения истёк')) + '</div>' +
                '<div class="stg-fsub">' + esc(T('Стратегия и прогресс сохранены — продление откроет их с той же точки')) + '</div></div></div>' +
                '<div class="stg-fprice"><b>' + forge(rprice) + '</b><span>' + esc(T('ещё 30 дней ведения: разборы недели, гайды и чат')) + '</span></div>' +
                '<button class="stg-fcta" data-act="renew"><i class="ti ti-refresh"></i> ' + esc(T('Продлить ведение')) + ' · ' + forge(rprice) + '</button>' +
                '</div></div>');
            return;
        }
        var locked = !_state || _state.access !== 'full';
        var rows = [
            ['Ниша и точка старта.', 'Есть канал — стратег оценит его по реальным данным и скажет, что усилить. Нет канала — подберёт 3 ниши на пересечении твоего интереса, спроса рекламодателей и невысокой конкуренции'],
            ['Контент-план на весь месяц.', 'Рубрики по дням и частота записываются в контент-план; все недели месяца собираются по сетке стратегии. Стратег каждую неделю правит сетку по факту'],
            ['Креативы под ленты рекомендаций.', 'Из каждого поста — вертикальный ролик 9:16 под площадку: VK Клипы, Дзен Ролики, YouTube Shorts, TikTok, Instagram Reels. Сценарий с хуком, стоковые кадры, голос диктора, музыка, текст на экране, финал с каналом — готовый файл через 5 минут плюс описание со ссылкой отслеживания — под каждый пост месяца. Для Дзена — ещё посты и статьи под ленту; ссылка на канал в профиле, публикации самодостаточные, без «продолжение в Telegram». Съёмка и монтаж не нужны'],
            ['Трафик под твой регион.', 'Площадки ранжируются по отдаче в твоей стране: где публикация без ограничений, где через VPN или обходы — с пометкой, но без запретов. Платный перелив с расчётом «бюджет → подписчики» по CPM ниши, доноры из Радара, ссылка отслеживания на каждый источник: видно, что дало приток, а что нет'],
            ['Все модели заработка.', 'Реклама в канале, перелив трафика, партнёрки, свой продукт. По каждой: с какого размера канала включать, сколько это даёт в месяц в твоей нише и что подготовить заранее'],
            ['Месяц ведения за руку.', 'Каждую неделю стратег сам сверяет план с фактом по данным твоего канала: что сработало, где отстаёшь, что делать дальше. Плюс чат — задавай вопросы в любой момент'],
        ];
        var what = rows.map(function (r) {
            return '<div class="stg-fw"><span class="tick">✓</span><span><b>' + esc(T(r[0])) + '</b> ' + esc(T(r[1])) + '</span></div>';
        }).join('');
        var price = locked
            ? '<div class="stg-fprice"><b>' + forge(nprice) + '</b><span>' + esc(T('разово')) + '</span></div>' +
              '<div class="stg-fpnote">' + esc(T('Продление —')) + ' ' + forge(rprice) + ' ' + esc(T('в месяц')) + '</div>'
            : accessChip();
        var inProgress = !locked && _state && _state.status === 'interview';
        var cta = locked
            ? '<button class="stg-fcta" data-act="buy"><i class="ti ti-bolt"></i> ' + esc(T('Открыть доступ')) + ' · ' + forge(nprice) + '</button>'
            : (inProgress
                ? '<button class="stg-fcta" data-act="continue"><i class="ti ti-message-circle"></i> ' + esc(T('Продолжить разговор со стратегом')) + '</button>' +
                  '<div class="stg-fnote">' + esc(T('Разговор начат — ответы сохранены. Начать заново можно внутри.')) + '</div>'
                : '<button class="stg-fcta" data-act="start"><i class="ti ti-message-circle"></i> ' + esc(T('Поговорить со стратегом')) + '</button>' +
                  '<div class="stg-fnote">' + esc(T('≈ 5 минут разговора — сетка недели и первая неделя появятся в контент-плане')) + '</div>');
        setView(
            '<div class="stg-flag"><div class="glow"></div>' +
            '<div class="inner"><span class="stg-ribbon">' + esc(T('Личный стратег')) + '</span>' +
            '<div class="stg-fhead"><div class="stg-fic">' + STG_ICON + '</div>' +
            '<div><div class="stg-fname">' + esc(T('AI-стратегия канала')) + '</div>' +
            '<div class="stg-fsub">' + esc(T('персональный план роста, наполнения и заработка')) + '</div></div></div>' +
            '<div class="stg-fwhat">' + what + '</div>' +
            price + cta + '</div></div>');
    }

    function num(n) {
        try { return Number(n || 0).toLocaleString('ru-RU'); } catch (e) { return String(n); }
    }

    function doPurchase(btn, renewal) {
        var prices = (_state && _state.prices) || {};
        var price = renewal ? (prices.renewal || 1990) : (prices.new || 3990);
        var bal = prices.balance || 0;
        haptic('light');
        if (bal < price) {
            var lack = esc(T('Нужно')) + ' ' + forge(price) + ', ' + esc(T('на балансе')) + ' ' + forge(bal) + '. ' +
                esc(T('Пополнить баланс — раздел')) + ' <a href="#" class="as-go" data-go="openForgeSheet">' + esc(T('Forge и покупки')) + '</a>.';
            if (typeof window.alertDialogHtml === 'function') window.alertDialogHtml(T('Недостаточно средств'), lack);
            else toast(T('Недостаточно средств'));
            return;
        }
        var title = renewal ? T('Продлить ведение') : T('Открыть AI-стратегию');
        var body = esc(renewal
            ? T('Ещё 30 дней ведения: сверки, гайды и чат.')
            : T('Доступ на 30 дней: разговор со стратегом, сетка недели в плане, первая неделя, задачи и сверки.')) +
            '<br>' + esc(T('Стоимость')) + ' ' + forge(price) + '<br>' + esc(T('На балансе')) + ' ' + forge(bal) + ' → ' + forge(bal - price);
        var ask = (typeof window.confirmDialogHtml === 'function') ? window.confirmDialogHtml(title, body, T('Списать и открыть')) : Promise.resolve(true);
        Promise.resolve(ask).then(function (ok) {
            if (!ok) return;
            purchaseNow(btn, renewal);
        });
    }
    function purchaseNow(btn, renewal) {
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


    var _talk = null, _talkSel = null, _talkBusy = false, _talkDraft = '';

    var _chosen = null;
    function channelLine() {
        var c = _chosen || (_state && _state.channel) || null;
        if (!c) return '';
        return c.username ? '@' + c.username : (c.title || '');
    }
    function startWith(chId) {
        renderCenter('<div class="stg-spin"></div>', T('Секунду...'));
        apiRequest('/api/v1/strategy/start', { method: 'POST', body: JSON.stringify({ channel_id: chId }) }).then(function (r) {
            if (!r || !r.ok) { toast(T('Доступ к стратегии не открыт.')); renderShowcase(); return; }
            _started = true;
            openTalk();
        }).catch(function () { toast(T('Не удалось начать. Попробуй ещё раз')); renderShowcase(); });
    }
    function startFlow() {
        haptic('medium');
        renderCenter('<div class="stg-spin"></div>', T('Секунду...'));
        apiRequest('/api/v1/channels/active').then(function (d) {
            _channels = (d && d.channels) || [];
            _chosen = null;
            if (!_channels.length) { startWith(null); return; }
            var activeId = (d && d.active_channel_id) || _channels[0].id;
            var byId = function (id) { return _channels.filter(function (c) { return c.id === id; })[0] || null; };
            if (_channels.length === 1 || typeof window.showBottomSheet !== 'function') {
                _chosen = byId(activeId);
                startWith(activeId);
                return;
            }
            renderShowcase();
            window.showBottomSheet({
                title: T('Для какого канала строим стратегию?'),
                subtitle: T('Ниша, сетка недели, посты и сверки — только этого канала'),
                items: _channels.map(function (c) {
                    return { id: c.id, title: c.title || (c.username ? '@' + c.username : T('Канал')),
                             subtitle: c.username ? '@' + c.username : '', has_avatar: c.has_avatar, is_private: c.is_private };
                }),
                activeId: activeId,
                onSelect: function (id) { _chosen = byId(id); startWith(id); }
            });
        }).catch(function () { toast(T('Не удалось начать. Попробуй ещё раз')); renderShowcase(); });
    }

    function talkHead() {
        var line = channelLine();
        return '<div class="stg-head"><button class="stg-back" data-act="close"><i class="ti ti-arrow-left"></i></button><div><div class="t">' + esc(T('Стратег')) + '</div>' +
            (line ? '<div class="s">' + esc(T('Канал')) + ' · ' + esc(line) + '</div>' : '') + '</div></div>';
    }
    function openTalk() {
        setView('<div class="stg-center"><div class="big"><div class="stg-spin"></div></div><div class="m">' + esc(T('Смотрю данные канала...')) + '</div></div>', talkHead());
        apiRequest('/api/v1/strategy/talk').then(function (d) {
            if (!d || !d.ok) { if (!d || d.error !== 'locked') toast(trErrText(d)); renderShowcase(); return; }
            _talk = d; _talkSel = null;
            renderTalk();
        }).catch(function () { toast(T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.')); renderShowcase(); });
    }
    function talkBubble(role, html) {
        return '<div class="stg-tmsg ' + (role === 'user' ? 'u' : 'a') + '">' + (role === 'user' ? '' : '<span class="stg-tav"><i class="ti ti-target-arrow"></i></span>') + '<div class="b">' + html + '</div></div>';
    }
    function renderTalk() {
        var d = _talk || {}, k = d.known, q = d.question, p = d.progress || {};
        var html = '<div class="stg-talk">';
        if (k) {
            html += talkBubble('a', '<b>' + esc(k.title || T('Что я уже знаю о канале')) + '</b><div>' + esc(k.text || '') + '</div>' +
                ((k.chips || []).length ? '<div class="stg-tchips">' + k.chips.map(function (c) {
                    return '<span class="stg-tchip"><small>' + esc(T(c.label)) + '</small>' + esc(c.value) + '</span>';
                }).join('') + '</div>' : ''));
        } else if (!d.has_channel) {
            html += talkBubble('a', esc(T('Канал ещё не подключён — начнём с подбора ниши: интерес, спрос рекламодателей и конкуренция.')));
        }
        (d.messages || []).forEach(function (m) { html += talkBubble(m.role === 'user' ? 'user' : 'a', esc(m.text || '')); });
        if (q) {
            var multi = !!q.multi;
            var sel = _talkSel || (multi ? [] : '');
            var chips = (q.options || []).map(function (o) {
                var on = multi ? (sel.indexOf(o) >= 0) : (sel === o);
                return '<span class="stg-ch' + (on ? ' on' : '') + '" data-tchip="' + esc(o) + '">' + esc(T(o)) + '</span>';
            }).join('');
            html += talkBubble('a', '<div class="stg-tq">' + esc(T(q.text)) + '</div>' +
                '<div class="stg-tprog">' + esc(T('вопрос')) + ' ' + (p.i || 1) + ' ' + esc(T('из')) + ' ~' + (p.n || 6) + '</div>' +
                '<div class="stg-chips" style="margin-top:8px;">' + chips + '</div>' +
                (q.allow_text ? '<input class="stg-inp" id="stg-talk-inp" maxlength="500" placeholder="' + esc(T('Своими словами')) + '">' +
                    (q.hint ? '<div class="stg-inhint">' + esc(T(q.hint)) + '</div>' : '') : '') +
                '<button class="stg-next" data-act="tnext"' + (_talkBusy ? ' disabled' : '') + '>' + esc(_talkBusy ? T('Секунду...') : T('Дальше')) + '</button>');
        } else if (d.done) {
            html += talkBubble('a', '<div class="stg-tq">' + esc(T('Мне всё ясно. Собираю стратегию: сетка недели и первая неделя появятся в контент-плане, трафик и заработок — разделами.')) + '</div>' +
                '<button class="stg-next" data-act="tbuild"><i class="ti ti-sparkles"></i> ' + esc(T('Собрать стратегию')) + '</button>' +
                '<div class="stg-fnote">' + esc(T('Обычно 2–4 минуты. Можно закрыть — стратегия соберётся сама')) + '</div>');
        }
        html += '</div>';
        var host = setView(html, talkHead());
        var draftInp = document.getElementById('stg-talk-inp');
        if (draftInp && _talkDraft) draftInp.value = _talkDraft;
        host.scrollTop = host.scrollHeight;
        var inp = document.getElementById('stg-talk-inp');
        if (inp && (q.options || []).length <= 1) inp.focus();
    }
    function talkChip(elm) {
        if (!_talk || !_talk.question) return;
        haptic('light');
        var v = elm.getAttribute('data-tchip');
        if (_talk.question.multi) {
            var cur = Array.isArray(_talkSel) ? _talkSel.slice() : [];
            var i = cur.indexOf(v);
            if (i >= 0) cur.splice(i, 1); else cur.push(v);
            _talkSel = cur;
            elm.classList.toggle('on');
        } else {
            _talkSel = v;
            var box = elm.parentElement;
            box.querySelectorAll('.stg-ch').forEach(function (c) { c.classList.remove('on'); });
            elm.classList.add('on');
        }
    }
    function talkNext() {
        if (_talkBusy || !_talk || !_talk.question) return;
        var q = _talk.question;
        var inp = document.getElementById('stg-talk-inp');
        var text = inp ? inp.value.trim() : '';
        var val = _talkSel;
        var empty = q.multi ? !(Array.isArray(val) && val.length) : !val;
        if (empty && !text) { toast(q.allow_text ? T('Выбери вариант или напиши своими словами') : T('Выбери вариант')); return; }
        haptic('medium');
        _talkBusy = true;
        _talkDraft = text;
        renderTalk();
        apiRequest('/api/v1/strategy/talk', { method: 'POST', body: JSON.stringify({ key: q.key, value: val, text: text }) }).then(function (d) {
            _talkBusy = false;
            if (!d || !d.ok) { toast(trErrText(d) || T('Не удалось сохранить')); renderTalk(); return; }
            _talk = d; _talkSel = null; _talkDraft = '';
            renderTalk();
        }).catch(function () { _talkBusy = false; toast(T('Не удалось сохранить')); renderTalk(); });
    }
    function talkBuild(btn) {
        haptic('medium');
        if (btn) btn.disabled = true;
        renderCenter('<div class="stg-spin"></div>', T('Секунду...'));
        apiRequest('/api/v1/strategy/generate', { method: 'POST' }).then(function (r) {
            if (r && r.ok) { renderGenerating(); startPoll(); }
            else { toast(T('Не удалось запустить генерацию')); renderTalk(); }
        }).catch(function () { toast(T('Не удалось запустить генерацию')); renderTalk(); });
    }
    window.__stgTalkForCheck = function (state) { _talk = state; _talkSel = null; _talkBusy = false; ensureScreen(); renderTalk(); };

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
        var secs = _state.doc.sections || [];
        var w1 = secs.filter(function (x) { return x.key === 'week1' && (x.steps || []).length; });
        (w1.length ? w1 : secs).forEach(function (sec) {
            (sec.steps || []).forEach(function (s) {
                if (s.checkable === false) return;
                total++;
                if (prog[s.key]) done++;
            });
        });
        return { total: total, done: done, pct: total ? Math.round(done / total * 100) : 0 };
    }

    function ringHtml(t) {
        return '<div class="stg-ring" style="background:conic-gradient(#5DCAA5 0 ' + t.pct + '%, rgba(255,255,255,0.08) ' + t.pct + '% 100%)"><span>' + t.done + '/' + t.total + '</span></div>';
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

    var _taskOpen = {};
    function taskStruct(s) {
        if (s.do && s.do.length) {
            return { do: s.do.slice(), why: s.why || '', avoid: s.avoid || '' };
        }
        var t = String(s.body || '').trim();
        if (!t) return { do: [], why: '', avoid: '' };
        var marks = [];
        [['do', /(?:Что делать|Сделай|What to do)\s*:\s*/g],
         ['why', /(?:Зачем|Почему|Why)\s*:\s*/g],
         ['avoid', /(?:Чего избегать|Не делай|Избегай|Avoid|What to avoid)\s*:\s*/g]].forEach(function (m) {
            var x;
            while ((x = m[1].exec(t))) marks.push({ k: m[0], i: x.index, e: x.index + x[0].length });
        });
        if (!marks.length) return { do: t, why: '', avoid: '' };
        marks.sort(function (a, b) { return a.i - b.i; });
        var out = { do: '', why: '', avoid: '' };
        marks.forEach(function (m, j) {
            var end = j + 1 < marks.length ? marks[j + 1].i : t.length;
            var seg = t.slice(m.e, end).trim();
            if (seg && !out[m.k]) out[m.k] = seg.charAt(0).toUpperCase() + seg.slice(1);
        });
        var head = t.slice(0, marks[0].i).trim();
        if (head) out.do = (head + (out.do ? ' ' + out.do : ''));
        return out;
    }
    function taskSub(st) {
        var d = Array.isArray(st.do) ? st.do.join(' · ') : String(st.do || '');
        return d || String(st.why || '');
    }
    function taskCard(s) {
        var done = !!(_state.progress || {})[s.key];
        var open = !!_taskOpen[s.key];
        var st = taskStruct(s);
        var mark = (s.checkable === false)
            ? '<span class="stg-dot"></span>'
            : '<span class="stg-cb' + (done ? ' done' : '') + '" data-act="cb" data-key="' + esc(s.key) + '"></span>';
        var min = s.minutes ? '<span class="stg-tkmin">◔ ' + s.minutes + ' ' + esc(T('мин')) + '</span>' : '';
        var row = '<div class="row">' + mark +
            '<span class="t"><b>' + esc(fixDays(s.title)) + '</b>' +
            (open ? '' : '<em>' + esc(fixDays(taskSub(st))) + '</em>') + '</span>' + min +
            '<i class="ti ti-chevron-' + (open ? 'up' : 'down') + ' chev"></i></div>';
        var body = '';
        if (open) {
            var kv = '';
            if (Array.isArray(st.do) && st.do.length) {
                kv += '<div class="k do"><i>1</i>' + esc(T('Сделай')) + '</div><ul>' +
                    st.do.map(function (x) { return '<li>' + esc(fixDays(x)) + '</li>'; }).join('') + '</ul>';
            } else if (st.do) {
                kv += '<div class="k do"><i>1</i>' + esc(T('Сделай')) + '</div><p>' + termWrap(fixDays(st.do)) + '</p>';
            }
            if (st.why) kv += '<div class="k why"><i>?</i>' + esc(T('Зачем')) + '</div><p>' + termWrap(fixDays(st.why)) + '</p>';
            if (st.avoid) kv += '<div class="k no"><i>✕</i>' + esc(T('Не делай')) + '</div><p>' + termWrap(fixDays(st.avoid)) + '</p>';
            if (s.ready) {
                kv += '<div class="k rdy"><i>✓</i>' + esc(T('Готовый текст — скопируй и вставь')) + '</div>' +
                    '<div class="stg-tkready">' + esc(s.ready) + '</div>';
            }
            var acts = '';
            if (s.ready) {
                acts += '<button class="stg-tkbtn pri" data-act="tkcopy" data-key="' + esc(s.key) + '">' + esc(T('Скопировать текст')) + '</button>';
            }
            if (s.link === 'market') {
                acts += '<button class="stg-tkbtn' + (s.ready ? '' : ' pri') + '" data-act="tkradar">' + esc(T('Открыть Радар')) + '</button>';
            } else if (s.link === 'traffic') {
                acts += '<button class="stg-tkbtn' + (s.ready ? '' : ' pri') + '" data-act="trmod">' + esc(T('Открыть модуль')) + '</button>';
            }
            if (s.has_guide && _state.access === 'full') {
                acts += '<button class="stg-tkbtn' + (s.ready || s.link ? '' : ' pri') + '" data-act="how" data-key="' + esc(s.key) + '">' + esc(T('Пошаговый план')) + '</button>';
            }
            acts += '<button class="stg-tkbtn" data-act="ask" data-t="' + esc(s.title || '') + '">' + esc(T('Спросить стратега')) + '</button>';
            body = '<div class="stg-tkv">' + kv + '<div class="acts">' + acts + '</div></div>';
        }
        return '<div class="stg-tk' + (open ? ' open' : '') + (done && s.checkable !== false ? ' on' : '') +
            '" data-act="tkopen" data-key="' + esc(s.key) + '">' + row + body + '</div>';
    }
    function stepHtml(s) {
        return taskCard(s) + '<div class="stg-gslot" data-slot="' + esc(s.key) + '"></div>';
    }
    function secTotals(key) {
        var sec = docSection(key) || {};
        var prog = _state.progress || {};
        var total = 0, done = 0;
        (sec.steps || []).forEach(function (s) {
            if (s.checkable === false) return;
            total++;
            if (prog[s.key]) done++;
        });
        return { total: total, done: done };
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

    function docSection(key) {
        var doc = (_state && _state.doc) || {};
        return ((doc.sections || []).filter(function (x) { return x.key === key; })[0]) || null;
    }
    function fmtDate(iso) {
        if (!iso) return '';
        try {
            var lang = (typeof window.getLang === 'function' ? window.getLang() : 'ru') || 'ru';
            return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'long' });
        } catch (e) { return String(iso).slice(0, 10); }
    }
    function gridMonday() {
        var ap = (_state && _state.apply) || null;
        if (!ap || !ap.from) return null;
        var iso = String(ap.from).slice(0, 10);
        if (ap.mode === 'partial' && _state.plan && _state.plan.week_start) {
            iso = String(_state.plan.week_start).slice(0, 10);
        }
        var d = new Date(iso + 'T12:00:00');
        return isNaN(d.getTime()) ? null : d;
    }
    function weekGridHtml() {
        var sec = docSection('content') || {};
        var grid = sec.grid || [];
        if (!grid.length) return '';
        var byDay = {};
        grid.forEach(function (g) { byDay[g.day_index] = g; });
        var monday = gridMonday();
        var cells = TR_DAYS.map(function (d, i) {
            var g = byDay[i];
            var dt = '';
            if (monday) dt = '<i>' + new Date(monday.getTime() + i * 86400000).getDate() + '</i>';
            return '<div class="stg-wd' + (g ? ' on' : '') + '"><span class="d">' + esc(T(d)) + dt + '</span>' +
                '<span class="r' + (g ? '' : ' off') + '">' + (g ? esc(g.rubric) : '—') + '</span></div>';
        }).join('');
        var per = sec.per_week || grid.length;
        var start = monday ? '<b>' + esc(T('с {date}').replace('{date}', fmtDate(monday.toISOString().slice(0, 10) + 'T12:00:00'))) + '</b> · ' : '';
        return '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-circle-check"></i></span> ' + esc(T('Стратегия применена к контент-плану')) + '</div>' +
            '<div class="stg-note" style="margin-top:8px;">' + start + esc(T('постов в неделю:')) + ' <b>' + per + '</b> · ' + esc(T('дни и рубрики выбрал стратег')) + '</div>' +
            '<div class="stg-week">' + cells + '</div></div>';
    }
    function applyTail(ap) {
        if (!ap) return '';
        if (ap.autopilot === 'enabled') return ' ' + esc(T('Следующие недели автопилот соберёт сам — посты будут ждать утверждения.'));
        if (ap.autopilot === 'stopped') return ' ' + esc(T('Автопилот у канала выключен тобой — следующие недели собирай кнопкой «Собрать неделю» в контент-плане.'));
        return '';
    }
    function firstWeekHtml() {
        var p = _state && _state.plan;
        var ap = (_state && _state.apply) || null;
        var own = ap && p && ap.plan_id && p.id === ap.plan_id;
        var when = ap && ap.from ? fmtDate(ap.from + 'T12:00:00') : '';
        var inner;
        if (!_state || !_state.channel_id) {
            inner = '<div class="stg-note">' + esc(T('Канал не подключён: сетка недели записана, первая неделя соберётся, когда подключишь канал.')) + '</div>';
        } else if (ap && ap.mode === 'next_week') {
            inner = '<div class="stg-note">' + esc(T('Текущая неделя идёт по твоему плану и не изменена. С понедельника, {when}, недели собираются по сетке стратегии.').replace('{when}', when)) + applyTail(ap) + '</div>';
        } else if (!p || (ap && ap.plan_id && !own)) {
            inner = '<div class="stg-note">' + esc(T('Первая неделя собирается по сетке стратегии — появится в контент-плане через несколько минут.')) + '</div>';
        } else if (p.status === 'generating' || (p.with_text < p.posts)) {
            inner = '<div class="stg-trwait"><span class="stg-spin sm"></span>' + esc(T('Собираю первую неделю')) + ' · ' + p.with_text + ' / ' + p.posts + '</div>';
        } else {
            var lead = '';
            if (ap && ap.mode === 'partial') lead = esc(T('Остаток недели с {when} собран по сетке стратегии.').replace('{when}', when)) + ' ';
            else if (ap && ap.mode === 'week') lead = esc(T('Неделя с понедельника, {when}, собрана по сетке стратегии.').replace('{when}', when)) + ' ';
            inner = '<div class="stg-note">' + lead + '<b>' + p.posts + '</b> ' + esc(T('постов с датами и временем ждут утверждения в контент-плане')) + (p.published ? ' · ' + esc(T('вышло')) + ' ' + p.published : '') + applyTail(ap) + '</div>';
        }
        return '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-calendar-event"></i></span> ' + esc(T('Первая неделя')) + '</div>' +
            '<div style="margin-top:8px;">' + inner + '</div>' +
            (_state && _state.channel_id ? '<button class="stg-trbtn wide" data-act="trplan">' + esc(T('Открыть контент-план')) + '</button>' : '') + '</div>';
    }
    function tasksHtml() {
        var sec = docSection('week1');
        if (!sec || !(sec.steps || []).length) return '';
        var days = sec.days || [];
        var t = docTotals();
        var ap = _state && _state.apply;
        var start = null;
        if (ap && ap.at) {
            var sd = new Date(String(ap.at).slice(0, 10) + 'T12:00:00');
            if (!isNaN(sd.getTime())) start = sd;
        }
        var known = days.filter(function (d) { return d !== null && d !== undefined; });
        var minDay = known.length ? Math.min.apply(null, known) : 0;
        var groups = [], byKey = {};
        sec.steps.forEach(function (s, i) {
            var d = (days[i] !== null && days[i] !== undefined) ? days[i] : null;
            var date = (start && d !== null) ? new Date(start.getTime() + (d - minDay) * 86400000) : null;
            var gk = date ? date.toISOString().slice(0, 10) : 'd' + (d === null ? 'x' + i : d);
            if (!byKey[gk]) { byKey[gk] = { key: gk, date: date, day: d, items: [] }; groups.push(byKey[gk]); }
            byKey[gk].items.push(s);
        });
        var tn = new Date(); tn.setHours(12, 0, 0, 0);
        var todayKey = tn.toISOString().slice(0, 10);
        var prog = _state.progress || {};
        var rows = groups.map(function (g) {
            var allDone = g.items.every(function (s) { return s.checkable === false || prog[s.key]; });
            var gk = g.date ? g.key : '';
            var cls = '', chip = '';
            if (allDone && g.items.some(function (s) { return s.checkable !== false; })) cls = ' done';
            else if (gk && gk === todayKey) { cls = ' today'; chip = '<span class="now">' + esc(T('Сегодня')) + '</span>'; }
            else if (gk && gk < todayKey) { cls = ' past'; chip = '<span class="move">' + esc(T('не сделано → сегодня')) + '</span>'; }
            var cap = '';
            if (g.date) {
                var iso = gk + 'T12:00:00';
                cap = '<div class="stg-dcap"><b>' + esc(fmtWeekday(iso)) + '</b><span>' + esc(fmtDate(iso)) + '</span>' + chip + '</div>';
            } else if (g.day !== null && TR_DAYS[g.day]) {
                cap = '<div class="stg-dcap"><b>' + esc(T(TR_DAYS[g.day])) + '</b></div>';
            }
            return '<div class="stg-tday' + cls + '" data-day-group="' + gk + '">' + cap +
                g.items.map(stepHtml).join('') + '</div>';
        }).join('');
        var range, counted = 0;
        if (start && groups.length && groups[0].date && groups[groups.length - 1].date) {
            range = esc(T('идут от старта стратегии')) + ' · ' +
                esc(fmtDate(groups[0].key + 'T12:00:00')) + ' — ' +
                esc(fmtDate(groups[groups.length - 1].key + 'T12:00:00'));
        } else {
            range = t.done + ' ' + T('из') + ' ' + t.total + ' ' + T('шагов выполнено');
            counted = 1;
        }
        return '<div class="stg-sec" data-sec="week1"><div class="stg-dochead">' + ringHtml(t) +
            '<div class="t"><b>' + esc(T('Задачи первой недели')) + '</b><span id="stg-doc-sub" data-count="' + counted + '">' + range + '</span></div></div>' +
            '<div class="stg-tl">' + rows + '</div></div>';
    }
    function fmtWeekday(iso) {
        if (!iso) return '';
        try {
            var lang = (typeof window.getLang === 'function' ? window.getLang() : 'ru') || 'ru';
            return new Date(iso).toLocaleDateString(lang, { weekday: 'long' });
        } catch (e) { return ''; }
    }
    function fmtTime(iso) {
        if (!iso) return '';
        try {
            var lang = (typeof window.getLang === 'function' ? window.getLang() : 'ru') || 'ru';
            return new Date(iso).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return ''; }
    }
    function reviewCardHtml() {
        var iso = _state && _state.next_review_at;
        var week = (_state && _state.week) || 1;
        var head = week <= 4
            ? T('Сверка {n} из 4').replace('{n}', week)
            : T('Сверка {n}').replace('{n}', week);
        var line = iso
            ? T('каждую неделю, день — {weekday}. Следующая — {date}, {time}').replace('{weekday}', fmtWeekday(iso)).replace('{date}', fmtDate(iso)).replace('{time}', fmtTime(iso))
            : T('дата появится после сборки стратегии');
        return '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-clock"></i></span> ' + esc(T('Месяц ведения')) + '</div>' +
            '<div class="stg-note" style="margin-top:8px;"><b>' + esc(head) + '</b> — ' + esc(line) + '. ' + esc(T('Стратег сверит план с фактом и предложит правки сетки.')) + '</div></div>';
    }
    var DOC_ORDER = ['niche', 'audience', 'monetize', 'offer', 'metrics'];
    function accSecHtml(key) {
        var doc = (_state && _state.doc) || {};
        var sec = docSection(key);
        if (!sec) return '';
        var hasContent = (sec.intro && sec.intro.trim()) || (sec.steps && sec.steps.length) ||
            (sec.chart && sec.chart.bars && sec.chart.bars.length);
        if (!hasContent) return '';
        var open = !!_secOpen[key];
        var st = secTotals(key);
        var cnt = st.total
            ? '<span class="stg-acc-cnt' + (st.done === st.total ? ' all' : '') + '" data-cnt="' + esc(key) + '">' + st.done + ' / ' + st.total + '</span>'
            : '';
        var head = '<div class="stg-acc-head" data-act="secacc" data-sec="' + esc(key) + '">' +
            '<span class="tile">' + (SEC_ICON[sec.key] || '<i class="ti ti-pin"></i>') + '</span>' +
            '<b>' + esc(T(sec.title || sec.key)) + '</b>' + cnt +
            '<i class="ti ti-chevron-' + (open ? 'up' : 'down') + '"></i></div>';
        var inner = '';
        if (open) {
            if (sec.key === 'niche' && sec.chosen && sec.chosen !== (doc.niche || '')) {
                inner += '<div class="stg-tip" style="margin-top:10px;"><b>' + esc(T('Рекомендация стратега:')) + '</b> ' + esc(sec.chosen) + '</div>';
            }
            if (sec.intro && sec.intro.trim()) inner += bodyHtml(fixDays(sec.intro), true);
            inner += chartHtml(sec.chart);
            if (sec.steps && sec.steps.length) inner += '<div style="margin-top:6px;">' + sec.steps.map(stepHtml).join('') + '</div>';
        }
        return '<div class="stg-sec stg-acc' + (open ? ' open' : '') + '" data-sec="' + esc(sec.key) + '">' + head +
            (inner ? '<div class="stg-acc-body">' + inner + '</div>' : '') + '</div>';
    }
    function findStep(key) {
        var secs = (_state && _state.doc && _state.doc.sections) || [];
        for (var i = 0; i < secs.length; i++) {
            var st = secs[i].steps || [];
            for (var j = 0; j < st.length; j++) {
                if (st[j].key === key) return st[j];
            }
        }
        return null;
    }
    function renderDoc() {
        normalizeDoc(_state);
        var doc = _state.doc || {};
        var iv = _state.interview || {};
        var week = _state.week || 1;
        var html = '<div class="stg-sec stg-dochead-sec"><div class="stg-dochead"><div class="stg-fic" style="width:44px;height:44px;">' + STG_ICON + '</div>' +
            '<div class="t"><b>' + esc(T('Стратегия:')) + ' «' + esc(doc.niche || '—') + '»</b>' +
            '<span>' + (channelLine() ? esc(channelLine()) + ' · ' : '') + esc(T('неделя')) + ' ' + week + (week <= 4 ? ' ' + esc(T('из')) + ' 4' : '') + (iv.audience_geo ? ' · ' + esc(T(iv.audience_geo)) : '') + '</span></div></div></div>';
        html += weekGridHtml();
        html += firstWeekHtml();
        html += tasksHtml();
        html += reviewCardHtml();
        html += trafficCard();
        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-message-circle"></i></span> ' + esc(T('Спросить стратега')) + '</div>' +
            '<div class="stg-note" style="margin-top:8px;">' + esc(T('Разделы плана ниже — ниша, аудитория, заработок, оффер, метрики — и чат в конце.')) + '</div>' +
            '<button class="stg-trbtn wide" data-act="jump" data-to="chat">' + esc(T('Задать вопрос')) + '</button></div>';
        DOC_ORDER.forEach(function (key) { html += accSecHtml(key); });
        html += reviewHtml();
        html += '<div data-sec="chat">' + chatHtml() + '</div>';
        html += '<button class="stg-prev" data-act="restart" style="margin-top:14px;">' + esc(T('Начать новую стратегию')) + '</button>';
        var host0 = document.getElementById('strategy-screen');
        var keepScroll = (host0 && host0.querySelector('.stg-dochead-sec')) ? host0.scrollTop : null;
        var chatDraftEl = document.getElementById('stg-chat-inp');
        var chatDraft = chatDraftEl ? chatDraftEl.value : '';
        var host = setView(html);
        if (keepScroll !== null) host.scrollTop = keepScroll;
        if (chatDraft) {
            var ndr = document.getElementById('stg-chat-inp');
            if (ndr) ndr.value = chatDraft;
        }
        unclampSmall(host);
        var chatBox = document.getElementById('stg-chat-msgs');
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        docPoll();
    }
    var _docTimer = null;
    function docPoll() {
        if (_docTimer) clearTimeout(_docTimer);
        var p = _state && _state.plan;
        var tb = _state && _state.traffic_brief;
        var busy = (p && (p.status === 'generating' || p.with_text < p.posts)) || (tb && tb.building);
        _docTimer = setTimeout(function () {
            _docTimer = null;
            var host = document.getElementById('strategy-screen');
            if (!host || host.style.display === 'none') return;
            if (_trOpen) { docPoll(); return; }
            var ae = document.activeElement;
            if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && host.contains(ae)) { docPoll(); return; }
            apiRequest('/api/v1/strategy').then(function (d) {
                if (!(d && d.ok && d.status === 'active' && _state && _state.doc && !_trOpen)) { docPoll(); return; }
                var changed = JSON.stringify(d.doc) !== JSON.stringify(_state.doc) ||
                    JSON.stringify(d.plan) !== JSON.stringify(_state.plan) ||
                    JSON.stringify(d.traffic_brief) !== JSON.stringify(_state.traffic_brief) ||
                    JSON.stringify(d.reviews || []) !== JSON.stringify(_state.reviews || []) ||
                    d.next_review_at !== _state.next_review_at || d.week !== _state.week;
                if (changed) {
                    d.progress = Object.assign({}, d.progress || {}, _state.progress || {});
                    _state = d;
                    renderDoc();
                } else docPoll();
            }).catch(function () { docPoll(); });
        }, busy ? 20000 : 60000);
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


    var _rvOpen = {};
    var _secOpen = {};
    function tx(o, tplKey, paramsKey, textKey) {
        if (!o) return '';
        var tpl = o[tplKey];
        if (!tpl) return String(o[textKey] || '');
        var s = T(tpl), params = o[paramsKey] || {};
        Object.keys(params).forEach(function (k) {
            var v = String(params[k]).split(', ').map(function (part) { return T(part); }).join(', ');
            s = s.split('{' + k + '}').join(v);
        });
        return s;
    }
    function rvKpi(k) {
        var d = '';
        if (k.delta !== null && k.delta !== undefined) d = '<i class="' + (k.delta > 0 ? 'up' : (k.delta < 0 ? 'down' : 'flat')) + '">' + (k.delta > 0 ? '+' : '') + k.delta + '</i>';
        else if (k.of) d = '<i class="flat">' + esc(T('из')) + ' ' + k.of + '</i>';
        return '<div class="stg-rv-kpi"><div class="v">' + esc(String(k.value)) + d + '</div><div class="l">' + esc(T(k.label)) + '</div></div>';
    }
    function rvGoal(g) {
        if (!g || !g.target) return '';
        var pct = Math.max(0, Math.min(100, Math.round((g.subscribers || 0) / g.target * 100)));
        var f = g.pace_week !== null && g.pace_week !== undefined && g.weeks_lo
            ? T('При темпе {pace}/нед — {lo}–{hi} недель до цели').replace('{pace}', (g.pace_week > 0 ? '+' : '') + g.pace_week).replace('{lo}', g.weeks_lo).replace('{hi}', g.weeks_hi)
            : (g.pace_week !== null && g.pace_week !== undefined ? T('Темп {pace}/нед — при нём цель не приближается').replace('{pace}', g.pace_week)
               : T('Прогноз темпа — со сверки 2: одна неделя не даёт честной оценки'));
        return '<div class="stg-rv-goal"><div class="g"><span>' + esc(T('Цель: {n} подписчиков').replace('{n}', g.target)) + '</span><span><b>' + esc(String(g.subscribers)) + '</b> / ' + esc(String(g.target)) + '</span></div>' +
            '<div class="bar"><i style="width:' + pct + '%"></i></div><div class="f">' + esc(f) + '</div></div>';
    }
    function rvTask(t, week) {
        var done = !!((_state.progress || {})[t.key]);
        var link = t.link === 'plan' ? 'trplan' : (t.link === 'traffic' ? 'trmod' : (t.link === 'market' ? 'market' : ''));
        var ttl = tx(t, 'tpl', 'params', 'title'), sub = tx(t, 'sub_tpl', 'sub_params', 'sub');
        return '<div class="stg-rv-task' + (done ? ' done' : '') + '"><span class="stg-cb' + (done ? ' done' : '') + '" data-act="cb" data-key="' + esc(t.key) + '"></span>' +
            '<span class="t"><b>' + esc(ttl) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
            (t.minutes ? '<span class="pill">' + t.minutes + ' ' + esc(T('мин')) + '</span>' : '') +
            (link ? '<button class="stg-rv-go" data-act="' + link + '"><i class="ti ti-arrow-right"></i></button>' : '') + '</div>';
    }
    function rvCard(r, open) {
        var when = r.period && r.period.to ? fmtDate(r.period.to) : '';
        var from = r.period && r.period.from ? fmtDate(r.period.from) : '';
        var headline = r.headline_tpl ? tx(r.headline_tpl, 'tpl', 'params', 'text') : (r.headline || '');
        var head = '<div class="stg-eyebrow"><span class="tile"><i class="ti ti-trending-up"></i></span> ' + esc(T('Сверка {n}').replace('{n}', r.week || 1)) + (when ? ' · ' + esc(when) : '') + '</div>';
        if (!open) return '<div class="stg-sec stg-rv-past" data-act="rvopen" data-week="' + (r.week || 1) + '">' + head + '<div class="stg-note" style="margin-top:6px;">' + esc(headline) + '</div></div>';
        var html = '<div class="stg-sec stg-rv hero">' + head +
            '<div class="stg-rv-title">' + esc(headline) + '</div>' +
            (from && when ? '<div class="stg-rv-sub">' + esc(from) + ' → ' + esc(when) + '</div>' : '') +
            '<div class="stg-rv-kpis">' + (r.kpis || []).map(rvKpi).join('') + '</div>' + rvGoal(r.goal) +
            '<div class="stg-rv-rows">' + (r.rows || []).map(function (x) { return '<div class="stg-rv-row"><span class="dot ' + esc(x.tone || 'mut') + '"></span><span>' + esc(tx(x, 'tpl', 'params', 'text')) + '</span></div>'; }).join('') + '</div></div>';
        if ((r.learned || []).length || r.next_focus) {
            html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile">2</span> ' + esc(T('Что понял стратег')) + '</div><div class="stg-rv-rows">' +
                (r.learned || []).map(function (x) { return '<div class="stg-rv-row"><span class="dot ind"></span><span>' + esc(x.text) + '</span></div>'; }).join('') +
                (r.next_focus ? '<div class="stg-rv-row"><span class="dot ind"></span><span><b>' + esc(T('Фокус недели:')) + '</b> ' + esc(r.next_focus) + '</span></div>' : '') + '</div></div>';
        }
        var ch = r.changes || [];
        html += '<div class="stg-sec"><div class="stg-eyebrow ok"><span class="tile">3</span> ' + esc(T('Что меняю')) + '</div>' +
            (ch.length ? '<div class="stg-rv-chg">' + ch.map(function (c) {
                var ic = c.icon === 'up' ? '↑' : (c.icon === 'down' ? '−' : (c.icon === 'clock' ? '<i class="ti ti-clock"></i>' : '₽'));
                var ct = tx(c, 'tpl', 'params', 'title'), cs = tx(c, 'sub_tpl', 'sub_params', 'sub');
                return '<div class="stg-rv-ch"><span class="ico ' + esc(c.icon || '') + '">' + ic + '</span><span><b>' + esc(ct) + '</b>' + (cs ? '<small>' + esc(cs) + '</small>' : '') + '</span></div>';
            }).join('') + '</div>' + (ch.some(function (c) { return c.applied; }) ? '<div class="stg-rv-auto">' + esc(T('Применено автоматически: сетка канала переписана, следующая неделя соберётся по ней. Идущая неделя не тронута.')) + '</div>' : '')
            : '<div class="stg-note" style="margin-top:8px;">' + esc(T('Сетка без изменений: данных для решений пока мало — рубрики и часы оцениваются от 3 постов.')) + '</div>') + '</div>';
        var tasks = r.tasks || [];
        html += '<div class="stg-sec"><div class="stg-eyebrow act"><span class="tile">4</span> ' + esc(T('Что сделать тебе')) + '</div>' +
            (tasks.length ? '<div style="margin-top:6px;">' + tasks.map(function (t) { return rvTask(t, r.week); }).join('') + '</div>'
            : '<div class="stg-note" style="margin-top:8px;">' + esc(T('На эту неделю задач нет — всё идёт по плану.')) + '</div>') + '</div>';
        return html;
    }
    function reviewHtml() {
        var revs = (_state.reviews || []).filter(function (r) { return r && (r.v === 2 || r.summary); });
        if (!revs.length) {
            return '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-trending-up"></i></span> ' + esc(T('Сверка')) + '</div>' +
                '<div class="stg-note" style="margin-top:9px;">' + esc(T('Первую сверку стратег сделает ровно через неделю после старта: что произошло, что он понял, что меняет в сетке и что сделать тебе.')) + '</div></div>';
        }
        var html = '';
        revs.forEach(function (r, i) {
            if (r.v !== 2) return;
            var open = i === 0 || !!_rvOpen[r.week];
            html += rvCard(r, open);
        });
        return html;
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


    function guideBlock(g, key) {
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
            '<button class="stg-ask" data-act="ask" data-t="' + esc(g.title || '') + '"><i class="ti ti-message-circle"></i> ' + esc(T('Спроси стратега об этом шаге')) + '</button>' +
            (key ? '<button class="stg-ask" data-act="how" data-key="' + esc(key) + '"><i class="ti ti-chevron-up"></i> ' + esc(T('Свернуть план')) + '</button>' : '') + '</div>';
    }

    function openGuide(btn) {
        var key = btn.getAttribute('data-key');
        var slot = document.querySelector('#strategy-screen [data-slot="' + key + '"]');
        if (!slot) return;
        haptic('light');
        if (slot.innerHTML) { slot.innerHTML = ''; return; }
        if (_guides[key]) { slot.innerHTML = guideBlock(_guides[key], key); return; }
        slot.innerHTML = '<div class="stg-guide"><div class="stg-gstep"><span class="n"><span class="stg-spin" style="width:12px;height:12px;border-width:2px;"></span></span><span>' + esc(T('Стратег пишет подробный гайд под твою ситуацию...')) + '</span></div></div>';
        apiRequest('/api/v1/strategy/guide', { method: 'POST', body: JSON.stringify({ key: key }) })
            .then(function (r) {
                if (r && r.ok && r.guide) {
                    _guides[key] = r.guide;
                    slot.innerHTML = guideBlock(r.guide, key);
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
        var row = cb.closest ? cb.closest('.stg-tk') : null;
        if (row) row.classList.toggle('on', done);
        if (!_state.progress) _state.progress = {};
        _state.progress[key] = done;
        var t = docTotals();
        var ring = document.querySelector('#strategy-screen .stg-ring');
        if (ring) {
            ring.style.background = 'conic-gradient(#5DCAA5 0 ' + t.pct + '%, rgba(255,255,255,0.08) ' + t.pct + '% 100%)';
            ring.querySelector('span').textContent = t.done + '/' + t.total;
        }
        var sub = document.getElementById('stg-doc-sub');
        if (sub && sub.getAttribute('data-count') === '1') {
            sub.textContent = t.done + ' ' + T('из') + ' ' + t.total + ' ' + T('шагов выполнено');
        }
        var dayEl = cb.closest ? cb.closest('.stg-tday') : null;
        if (dayEl) {
            var cbs = dayEl.querySelectorAll('.stg-cb');
            var all = cbs.length && Array.prototype.every.call(cbs, function (x) { return x.classList.contains('done'); });
            var gk = dayEl.getAttribute('data-day-group') || '';
            var tn2 = new Date(); tn2.setHours(12, 0, 0, 0);
            var tk2 = tn2.toISOString().slice(0, 10);
            var isDate = /^\d{4}-/.test(gk);
            dayEl.classList.toggle('done', !!all);
            dayEl.classList.toggle('today', !all && isDate && gk === tk2);
            dayEl.classList.toggle('past', !all && isDate && gk < tk2);
            var mv = dayEl.querySelector('.stg-dcap .move');
            if (mv) mv.style.display = (!all && isDate && gk < tk2) ? '' : 'none';
            var nw = dayEl.querySelector('.stg-dcap .now');
            if (nw) nw.style.display = (!all && isDate && gk === tk2) ? '' : 'none';
        }
        var secKey = (key.indexOf(':') > 0) ? key.split(':')[0] : '';
        var cnt = secKey ? document.querySelector('#strategy-screen .stg-acc-cnt[data-cnt="' + secKey + '"]') : null;
        if (cnt) {
            var st = secTotals(secKey);
            cnt.textContent = st.done + ' / ' + st.total;
            cnt.classList.toggle('all', st.total > 0 && st.done === st.total);
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

    var _tr = null, _trTimer = null, _trChan = null, _trOpen = false, _trBusy = {};
    var TR_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    var TR_GEO = { ru: 'Россия', by: 'Беларусь', kz: 'Казахстан', uz: 'Узбекистан', kg: 'Кыргызстан', tj: 'Таджикистан', az: 'Азербайджан', ua: 'Украина' };

    function trForge(n) {
        return (typeof window.forgeAmount === 'function') ? window.forgeAmount(n, 12) : num(n);
    }
    function trPct(x) {
        var s = String(x == null ? '' : x);
        return ((typeof window.getLang === 'function' ? window.getLang() : 'ru') === 'en') ? s : s.replace('.', ',');
    }
    function trafficCard() {
        var tb = (_state && _state.traffic_brief) || null;
        var line;
        if (tb && tb.building) {
            line = '<span class="stg-trwait"><span class="stg-spin sm"></span>' + esc(T('Собираю ролики из постов недели')) + ' · ' + tb.ready + ' / ' + tb.posts + '</span>';
        } else if (tb && tb.posts) {
            line = esc(T('Готовые ролики из постов недели:')) + ' <b>' + tb.ready + ' / ' + tb.posts + '</b> · ' +
                esc(T('платный перелив с расчётом, доноры из Радара, ссылки отслеживания.'));
        } else {
            line = esc(T('Ролики для площадок из постов недели, платный перелив с расчётом, доноры из Радара, ссылки отслеживания.'));
        }
        return '<div class="stg-sec stg-trcard" data-act="traffic"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-rocket"></i></span> ' + esc(T('Трафик — двигатель роста')) + '</div>' +
            '<div class="stg-note" style="margin-top:9px;">' + line + '</div>' +
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
        if (e === 'unclear') return (d && d.message) || T('Не понял. Выбери вариант или напиши словами — например: «выйти на 30 тыс. ₽ в месяц с рекламы».');
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
        var NOTE = { ok: T('без ограничений'), vpn: T('через VPN'), upload_limited: T('публикация — обходами'), blocked: T('недоступна в регионе') };
        (pl.use || []).forEach(function (p) {
            var link = lk.platforms && lk.platforms[p.key];
            var url = link ? (link.invite_link || link.click_url || '') : '';
            var sub = p.text ? T('ролики, посты и статьи · ссылка на канал — в профиле') : (NOTE[p.note] || '');
            html += '<div class="stg-trrow"><div class="tx"><b>' + esc(p.name) + (p.note && p.note !== 'ok' ? ' <span class="stg-trnote">' + esc(NOTE[p.note] || '') + '</span>' : '') + '</b>' +
                (link ? '<em><span class="stg-trlink" data-act="trcopy" data-text="' + esc(url) + '">' + esc(url.replace(/^https?:\/\//, '')) + '</span> · +' + num(link.joined || 0) + ' ' + esc(T('вступили')) +
                    (link.clicks ? ' · ' + num(link.clicks) + ' ' + esc(T('переходов')) : '') + '</em>'
                    : '<em>' + esc(sub) + (sub ? ' · ' : '') + esc(T('ссылка для описания ещё не создана')) + '</em>') + '</div>' +
                (link ? '' : '<button class="stg-trbtn" data-act="trplink" data-key="' + esc(p.key) + '"' + (ch.connected ? '' : ' disabled') + '>' + esc(T('Создать ссылку')) + '</button>') + '</div>';
        });
        if (!ch.connected) html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('Ссылки создаёт бот — подключи его к каналу в настройках канала.')) + '</div>';
        html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('Ссылка площадки ставится в описание ролика: сверка увидит, сколько подписчиков дала каждая площадка.')) + ' ' +
            esc(T('Это обычная телеграм-ссылка (t.me): люди видят знакомый домен, а площадки не считают её сторонним редиректом.')) + '</div></div>';

        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-movie"></i></span> ' + esc(T('Конвейер креативов из постов недели')) +
            (cv.per_week ? '<span class="stg-trchip">' + num(cv.ready || 0) + ' / ' + num(cv.per_week) + '</span>' : '') + '</div>' +
            '<div class="stg-note" style="margin-top:8px;">' + esc(T('Каждый пост недели → ролик 9:16 с озвучкой и музыкой: хук, тезисы, число, призыв в канал. Готовый файл примерно через 5 минут.')) + '</div>';
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
            if (pick && (pick.invite_link || pick.click_url)) lines.push(pick.invite_link || pick.click_url);
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
            ? window.confirmDialogHtml(T('Подбор доноров'), esc(T('Спишется')) + ' ' + forge(price) + '. ' + esc(T('На балансе')) + ' ' + forge(bal) + '.', T('Списать и подобрать'))
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
        if (act === 'trplan') { haptic('light'); _trOpen = false; var planChan = (_state && _state.channel_id) || _trChan || null; closeStrategy(); if (typeof window.__openContentPlan === 'function') window.__openContentPlan(planChan); return true; }
        if (act === 'trlinks') { haptic('light'); _trOpen = false; closeStrategy(); if (typeof window.__openPlacements === 'function') window.__openPlacements(); return true; }
        return false;
    }
    window.__stgTrafficForCheck = function (data, channelId) { _tr = data; _trChan = channelId || null; ensureScreen(); renderTraffic(); };
    window.__stgShowcaseForCheck = function (state) { _state = state; ensureScreen(); renderShowcase(); };
    window.__stgStartForCheck = function (state) { _state = state; ensureScreen(); startFlow(); };
    window.__stgRouteForCheck = function (data) { ensureScreen(); route(data); };
    window.__stgDocForCheck = function (state) { _state = state; ensureScreen(); renderDoc(); };

    function onScreenClick(ev) {
        var t = ev.target;
        var actEl = t.closest ? t.closest('[data-act]') : null;
        if (t.closest && t.closest('.stg-term')) { toggleTerm(t.closest('.stg-term')); return; }
        if (!actEl) return;
        var act = actEl.getAttribute('data-act');
        if (trAction(act, actEl)) return;
        if (act === 'close') { haptic('light'); closeStrategy(); return; }
        if (act === 'start') { startFlow(); return; }
        if (act === 'continue') { haptic('light'); _started = true; openTalk(); return; }
        if (act === 'buy') { doPurchase(actEl, false); return; }
        if (act === 'renew') { doPurchase(actEl, true); return; }
        if (act === 'tnext') { talkNext(); return; }
        if (act === 'tbuild') { talkBuild(actEl); return; }
        if (act === 'regen') { regen(actEl); return; }
        if (act === 'restart') { restartFlow(actEl); return; }
        if (act === 'jump') {
            var to = actEl.getAttribute('data-to');
            var tgt = document.querySelector('#strategy-screen [data-sec="' + to + '"]');
            if (tgt) { haptic('light'); tgt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            return;
        }
        if (act === 'cb') { toggleStep(actEl); return; }
        if (act === 'tkcopy') {
            var cps = findStep(actEl.getAttribute('data-key'));
            if (cps && cps.ready) trCopy(cps.ready, T('Текст скопирован'));
            return;
        }
        if (act === 'tkradar') {
            haptic('light');
            closeStrategy();
            if (typeof window.__openRadar === 'function') window.__openRadar();
            return;
        }
        if (act === 'tkopen') {
            if (t.closest && t.closest('.stg-tkv')) return;
            haptic('light');
            var tkk = actEl.getAttribute('data-key');
            _taskOpen[tkk] = !_taskOpen[tkk];
            if (!_taskOpen[tkk]) {
                var gsl = document.querySelector('#strategy-screen [data-slot="' + tkk + '"]');
                if (gsl) gsl.innerHTML = '';
            }
            var tks = findStep(tkk);
            if (tks) actEl.outerHTML = taskCard(tks); else renderDoc();
            return;
        }
        if (act === 'rvopen') { haptic('light'); var wk = parseInt(actEl.getAttribute('data-week'), 10); _rvOpen[wk] = !_rvOpen[wk]; renderDoc(); return; }
        if (act === 'secacc') {
            haptic('light');
            var sk = actEl.getAttribute('data-sec');
            _secOpen[sk] = !_secOpen[sk];
            var accEl = actEl.closest ? actEl.closest('.stg-acc') : null;
            var accHtml = accSecHtml(sk);
            if (accEl && accHtml) accEl.outerHTML = accHtml; else renderDoc();
            return;
        }
        if (act === 'trmod') { haptic('light'); openTraffic(); return; }
        if (act === 'market') { haptic('light'); closeStrategy(); if (typeof window.__openMarket === 'function') window.__openMarket(); return; }
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
                if (inp.scrollIntoView) inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
    }

    document.addEventListener('click', function (ev) {
        var host = document.getElementById('strategy-screen');
        if (!host || host.style.display === 'none') return;
        var chip = ev.target.closest ? ev.target.closest('.stg-ch[data-tchip]') : null;
        if (chip && host.contains(chip)) talkChip(chip);
    });

    document.addEventListener('keydown', function (ev) {
        if (ev.isComposing) return;
        if (ev.key === 'Enter' && ev.target && ev.target.id === 'stg-chat-inp') sendChat();
        if (ev.key === 'Enter' && ev.target && ev.target.id === 'stg-talk-inp') talkNext();
    });
})();
