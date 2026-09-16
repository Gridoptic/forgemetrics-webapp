(function () {
    'use strict';

    var SG = function (s) { return (typeof window.t === 'function') ? window.t(s) : s; };

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
        monday: SG('Понедельник'), tuesday: SG('Вторник'), wednesday: SG('Среда'), thursday: SG('Четверг'),
        friday: SG('Пятница'), saturday: SG('Суббота'), sunday: SG('Воскресенье'),
        mon: SG('Понедельник'), tue: SG('Вторник'), wed: SG('Среда'), thu: SG('Четверг'),
        fri: SG('Пятница'), sat: SG('Суббота'), sun: SG('Воскресенье') };

    function fixDays(text) {
        return String(text == null ? '' : text).replace(
            /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g,
            function (m) { var r = DAYS_EN[m.toLowerCase()]; return r ? T(r) : m; });
    }

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
                '<div class="stg-fpnote" style="margin-top:12px;">' + esc(T('ещё 30 дней ведения: разборы недели, гайды и чат')) + '</div>' +
                '<button class="stg-fcta" data-act="renew"><i class="ti ti-refresh"></i>' + esc(T('Продлить ведение')) + '<span class="pm-btn-price">' + forge(rprice) + '</span></button>' +
                '</div></div>');
            return;
        }
        var locked = !_state || _state.access !== 'full';
        var rows = [
            [SG('Ниша и точка старта.'), SG('Есть канал — стратег оценит его по реальным данным и скажет, что усилить. Нет канала или он пустой — разберёт выбранную тобой тему или подберёт нишу под твой опыт: размер лидеров, доля растущих каналов, темп публикаций и чем выделиться — по каналам каталога ForgeMetrics')],
            [SG('Контент-план на весь месяц.'), SG('Рубрики по дням и частота записываются в контент-план; все недели месяца собираются по сетке стратегии. Стратег каждую неделю правит сетку по факту')],
            [SG('Креативы под ленты рекомендаций.'), SG('Из каждого поста — вертикальный ролик 9:16 под площадку: VK Клипы, Дзен Ролики, YouTube Shorts, TikTok, Instagram Reels. Сценарий с хуком, стоковые кадры, голос диктора, музыка, текст на экране, финал с каналом — готовый файл через 5 минут плюс описание к ролику — под каждый пост месяца. Для Дзена — ещё посты и статьи под ленту; ссылка на канал в профиле, публикации самодостаточные, без «продолжение в Telegram». Съёмка и монтаж не нужны')],
            [SG('Площадки без догадок.'), SG('Дзен, VK Клипы, YouTube Shorts и TikTok: готовое оформление профиля, прогрев нового аккаунта, сколько и когда публиковать, из-за чего площадка режет показы — по правилам самих площадок. Плюс рост внутри Telegram и закупка рекламы, если есть бюджет')],
            [SG('Все модели заработка.'), SG('Реклама в канале, партнёрские программы под нишу, перелив трафика, свой продукт. По каждой: с какого размера канала включать, какие условия у программ и что подготовить заранее')],
            [SG('Месяц ведения за руку.'), SG('Каждую неделю стратег сам сверяет план с фактом по данным твоего канала: что сработало, где отстаёшь, что делать дальше. Плюс чат — задавай вопросы в любой момент')],
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
            ? '<button class="stg-fcta" data-act="buy">' + esc(T('Открыть доступ')) + '<span class="pm-btn-price">' + forge(nprice) + '</span></button>'
            : (inProgress
                ? '<button class="stg-fcta" data-act="continue"><i class="ti ti-message-circle"></i> ' + esc(T('Продолжить разговор со стратегом')) + '</button>' +
                  '<div class="stg-fnote">' + esc(T('Разговор начат — ответы сохранены. Начать заново можно внутри.')) + '</div>'
                : '<button class="stg-fcta" data-act="start"><i class="ti ti-message-circle"></i> ' + esc(T('Поговорить со стратегом')) + '</button>' +
                  '<div class="stg-fnote">' + esc(T('≈ 10 минут разговора — сетка недели и первая неделя появятся в контент-плане')) + '</div>');
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
            if (!r || !r.ok) {
                toast((r && r.message) || T('Доступ к стратегии не открыт.'));
                if (r && (r.error === 'channel_has_strategy' || r.error === 'not_owner')) load();
                else renderShowcase();
                return;
            }
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
            html += talkBubble('a', esc(T('Канал ещё не подключён — начнём с темы, опыта и цели. Вопросов около двадцати: чем точнее ответы, тем точнее стратегия.')));
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
                '<div class="stg-fnote">' + esc(T('Обычно 5–8 минут. Можно закрыть — стратегия соберётся сама')) + '</div>');
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
        SG('Изучаю твои ответы и данные канала...'),
        SG('Сверяю нишу с каналами каталога: лидеры, рост, темп публикаций...'),
        SG('Определяю, чем выделиться, и портрет читателя...'),
        SG('Собираю рубрики и оформление канала...'),
        SG('Готовлю площадки: профиль, прогрев, ритм публикаций...'),
        SG('Подбираю партнёрские программы и лестницу дохода...'),
        SG('Расписываю первую неделю по дням...'),
    ];

    function renderGenerating() {
        setView('<div class="stg-center"><div class="stg-fic" style="width:64px;height:64px;border-radius:18px;">' + STG_ICON + '</div>' +
            '<div class="stg-spin"></div>' +
            '<div class="m" id="stg-gen-text">' + esc(T(GEN_TEXTS[0])) + '</div>' +
            '<div class="m" style="font-size:11px;color:#565b73;">' + esc(T('Обычно это занимает 5–8 минут. Можно закрыть — стратегия соберётся сама')) + '</div></div>');
        var i = 0;
        _genTimer = setInterval(function () {
            var el = document.getElementById('stg-gen-text');
            if (!el) return;
            if (i < GEN_TEXTS.length - 1) {
                i++;
                el.textContent = T(GEN_TEXTS[i]);
            }
        }, 55000);
    }

    function startPoll() {
        if (_pollTimer) clearInterval(_pollTimer);
        var ticks = 0;
        _pollTimer = setInterval(function () {
            ticks++;
            if (ticks === 90) {
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
    function latestReview() {
        var revs = (_state && _state.reviews || []).filter(function (r) { return r && r.v === 2 && r.week >= 1; });
        if (!revs.length) return null;
        return revs.reduce(function (a, b) { return (b.week || 0) > (a.week || 0) ? b : a; });
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
    var _tab = 'today', _curKey = null, _plat = null, _optOpen = false, _readyOpen = {};
    var TABS = [
        ['today', SG('Сегодня'), 'ti-clock-hour-4'],
        ['plan', SG('План'), 'ti-list-details'],
        ['plat', SG('Площадки'), 'ti-device-mobile'],
        ['money', SG('Доход'), 'ti-coin'],
        ['chat', SG('Чат'), 'ti-message-circle']
    ];
    var DAY_FULL = [SG('понедельник'), SG('вторник'), SG('среда'), SG('четверг'), SG('пятница'), SG('суббота'), SG('воскресенье')];
    var VERDICT = { now: SG('сейчас'), later: SG('позже'), skip: SG('не сейчас') };
    var SUM_ICON = { niche: 'ti-target', reader: 'ti-user', growth: 'ti-trending-up', money: 'ti-coin' };
    var SUM_LABEL = { niche: SG('Ниша'), reader: SG('Читатель'), growth: SG('Рост'), money: SG('Доход') };
    var CHAT_SUG = [SG('Что написать в первом посте?'), SG('С какой площадки начать?'), SG('Когда подключать первую партнёрку?')];

    function prog() { return (_state && _state.progress) || {}; }

    function weekTasks() {
        var last = latestReview();
        if (last && ('auto_closed' in last) && (last.tasks || []).length) {
            return { week: (last.week || 0) + 1, items: last.tasks.map(function (t) {
                return { key: t.key, title: tx(t, 'tpl', 'params', 'title'), sub: tx(t, 'sub_tpl', 'sub_params', 'sub'),
                         minutes: t.minutes, link: t.link || '', day: null, do: [], guide: false };
            }) };
        }
        var sec = docSection('week1') || {};
        var days = sec.days || [];
        var items = (sec.steps || []).map(function (s, i) {
            var d = days[i];
            return { key: s.key, title: s.title, do: s.do || [], why: s.why || '', mistake: s.mistake || '',
                     minutes: s.minutes, ready: s.ready || '', link: s.link || '', guide: !!s.has_guide,
                     day: (d === null || d === undefined) ? null : d };
        });
        items.sort(function (a, b) { return (a.day === null ? 9 : a.day) - (b.day === null ? 9 : b.day); });
        return { week: 1, items: items };
    }

    function currentTask(w) {
        var p = prog();
        var cur = w.items.filter(function (x) { return x.key === _curKey; })[0];
        return cur || w.items.filter(function (x) { return !p[x.key]; })[0] || null;
    }

    function platFromTitle(t) {
        var s = String(t || '').toLowerCase();
        if (s.indexOf('дзен') >= 0) return 'dzen';
        if (s.indexOf('tiktok') >= 0) return 'tiktok';
        if (s.indexOf('youtube') >= 0 || s.indexOf('shorts') >= 0) return 'shorts';
        if (s.indexOf('vk') >= 0 || s.indexOf('вк') >= 0) return 'vk';
        return '';
    }

    function linkBtn(it, pri) {
        var c = 'stg-btn' + (pri ? ' pri' : '');
        if (it.link === 'platforms') return '<button class="' + c + '" data-act="tab" data-tab="plat" data-plat="' + esc(platFromTitle(it.title)) + '">' + esc(T('Открыть площадку')) + '</button>';
        if (it.link === 'market') return '<button class="' + c + '" data-act="tkradar">' + esc(T('Открыть Радар')) + '</button>';
        if (it.link === 'traffic' && _state.channel_id) return '<button class="' + c + '" data-act="trmod">' + esc(T('Открыть «Трафик»')) + '</button>';
        if (it.link === 'plan' && _state.channel_id) return '<button class="' + c + '" data-act="trplan">' + esc(T('Открыть контент-план')) + '</button>';
        return '';
    }

    function roNote() {
        return '<div class="stg-sec stg-ro"><div class="stg-eb">' + esc(T('Только просмотр')) + '</div>' +
            '<div class="stg-txt">' + esc(T('Стратегию канала ведёт владелец и доверенный администратор. Тебе доступны план, задачи, сверки и модуль «Трафик».')) + '</div></div>';
    }

    function nowCard(it) {
        var isDone = !!prog()[it.key];
        var eb = [T('Сейчас')];
        if (it.day !== null) eb.push(T(DAY_FULL[it.day]));
        if (it.minutes) eb.push(it.minutes + ' ' + T('мин'));
        var html = '<div class="stg-sec stg-now"><div class="stg-eb">' + esc(eb.join(' · ')) + '</div>' +
            '<div class="stg-h1' + (isDone ? ' done' : '') + '">' + esc(fixDays(it.title)) + '</div>';
        if (it.sub) html += '<div class="stg-txt">' + esc(it.sub) + '</div>';
        if (it.do.length) html += '<ol class="stg-steps">' + it.do.map(function (x) { return '<li>' + esc(fixDays(x)) + '</li>'; }).join('') + '</ol>';
        if (it.ready) {
            var open = !!_readyOpen[it.key];
            html += '<div class="stg-ready"><div class="k">' + esc(T('Готовый текст')) + '</div><div class="v' + (open ? ' full' : '') + '">' + esc(it.ready) + '</div>' +
                (open ? '' : '<button class="stg-more" data-act="rmore" data-key="' + esc(it.key) + '">' + esc(T('Показать полностью')) + '</button>') + '</div>';
        }
        if (it.why) html += '<div class="stg-why">' + esc(fixDays(it.why)) + '</div>';
        if (it.mistake) html += '<div class="stg-trap"><i class="ti ti-alert-triangle"></i><span>' + esc(fixDays(it.mistake)) + '</span></div>';
        var acts = '';
        if (it.ready) acts += '<button class="stg-btn pri" data-act="tkcopy" data-key="' + esc(it.key) + '">' + esc(T('Скопировать текст')) + '</button>';
        acts += linkBtn(it, !it.ready);
        if (canManage()) acts += '<button class="stg-btn ok" data-act="tkdone" data-key="' + esc(it.key) + '">' + esc(isDone ? T('Вернуть в работу') : T('Готово')) + '</button>';
        if (acts) html += '<div class="stg-acts">' + acts + '</div>';
        var lnks = '';
        if (it.guide && _state.access === 'full' && canManage()) lnks += '<button class="stg-lnk" data-act="how" data-key="' + esc(it.key) + '"><i class="ti ti-list-numbers"></i>' + esc(T('Пошаговый план')) + '</button>';
        if (canManage()) lnks += '<button class="stg-lnk" data-act="ask" data-t="' + esc(it.title) + '"><i class="ti ti-message-circle"></i>' + esc(T('Спросить стратега')) + '</button>';
        if (lnks) html += '<div class="stg-lnks">' + lnks + '</div>';
        return html + '<div class="stg-gslot" data-slot="' + esc(it.key) + '"></div></div>';
    }

    function allDoneCard() {
        var iso = _state.next_review_at;
        return '<div class="stg-sec stg-now"><div class="stg-eb">' + esc(T('Все задачи недели выполнены')) + '</div><div class="stg-txt">' +
            esc(iso ? T('Следующие задачи стратег поставит на сверке — {weekday}, {date}.').replace('{weekday}', fmtWeekday(iso)).replace('{date}', fmtDate(iso))
                : T('Следующие задачи стратег поставит на сверке.')) + '</div></div>';
    }

    function doneRow(ok, html) {
        return '<div class="stg-done"><i class="ti ' + (ok ? 'ti-circle-check ok' : 'ti-clock wait') + '"></i><span>' + html + '</span></div>';
    }

    function doneCard() {
        var sec = docSection('content') || {};
        var per = sec.per_week || (sec.grid || []).length;
        var head = '<div class="stg-sec"><div class="stg-eb">' + esc(T('Стратег уже сделал')) + '</div>';
        var rows = '';
        if (!_state.channel_id) {
            rows += doneRow(true, '<b>' + esc(T('Сетка недели')) + '</b> ' + esc(T('готова, постов в неделю:')) + ' ' + per);
            rows += doneRow(true, '<b>' + esc(T('Описание, закреп и профили площадок')) + '</b> ' + esc(T('— готовые тексты в задачах недели')));
            rows += doneRow(false, '<b>' + esc(T('Посты, стиль канала и ролики')) + '</b> ' + esc(T('начнут собираться, когда привяжешь канал к стратегии')));
            return head + rows + (canManage() ? '<button class="stg-btn pri wide" data-act="attach">' + esc(T('Привязать канал')) + '</button>' : '') + '</div>';
        }
        var ap = _state.apply, p = _state.plan, tb = _state.traffic_brief;
        rows += ap ? doneRow(true, '<b>' + esc(T('Рубрики и сетка недели')) + '</b> ' + esc(T('записаны в контент-план, постов в неделю:')) + ' ' + per)
            : doneRow(false, '<b>' + esc(T('Рубрики и сетка недели')) + '</b> ' + esc(T('записываются в контент-план')));
        if (ap && ap.mode === 'next_week' && ap.from) {
            rows += doneRow(true, esc(T('Текущая неделя идёт по твоему плану и не изменена. С понедельника, {when}, недели собираются по сетке стратегии.').replace('{when}', fmtDate(ap.from + 'T12:00:00'))));
        } else if (p && (p.status === 'generating' || p.with_text < p.posts)) {
            rows += doneRow(false, '<b>' + esc(T('Посты недели')) + '</b> ' + esc(T('собираются')) + ' · ' + p.with_text + ' / ' + p.posts);
        } else if (p && p.posts) {
            rows += doneRow(true, '<b>' + esc(T('Посты недели')) + '</b> ' + esc(T('ждут утверждения в контент-плане')) + ' · ' + p.posts +
                (p.published ? ' · ' + esc(T('вышло')) + ' ' + p.published : ''));
        }
        if (ap && ap.voice_set) rows += doneRow(true, '<b>' + esc(T('Стиль канала')) + '</b> ' + esc(T('настроен — посты пишутся в нём')));
        if (tb && tb.building) rows += doneRow(false, '<b>' + esc(T('Ролики из постов')) + '</b> ' + esc(T('собираются')) + ' · ' + tb.ready + ' / ' + tb.posts);
        else if (tb && tb.posts) rows += doneRow(tb.ready >= tb.posts, '<b>' + esc(T('Ролики из постов')) + '</b> ' + esc(T('готово {a} из {b}').replace('{a}', tb.ready).replace('{b}', tb.posts)));
        if (ap && ap.autopilot === 'enabled') rows += doneRow(true, '<b>' + esc(T('Автопилот')) + '</b> ' + esc(T('соберёт следующие недели сам — посты будут ждать утверждения')));
        var iso = _state.next_review_at;
        if (iso) rows += doneRow(true, '<b>' + esc(T('Сверка')) + '</b> — ' + esc(fmtWeekday(iso)) + ', ' + esc(fmtDate(iso)) + ', ' + esc(fmtTime(iso)));
        return head + rows + '<button class="stg-btn wide" data-act="trplan">' + esc(T('Открыть контент-план')) + '</button></div>';
    }

    function paneToday() {
        var w = weekTasks(), p = prog(), html = '';
        if (!canManage()) html += roNote();
        if (!w.items.length) {
            html += '<div class="stg-sec"><div class="stg-txt">' + esc(T('На эту неделю задач нет — всё идёт по плану.')) + '</div></div>';
        } else {
            var done = w.items.filter(function (x) { return p[x.key]; }).length;
            html += '<div class="stg-top"><span class="dot"></span>' + esc(w.week === 1 ? T('Первая неделя') : T('Неделя {n}').replace('{n}', w.week)) +
                ' · ' + esc(T('сделано {a} из {b}').replace('{a}', done).replace('{b}', w.items.length)) + '</div>';
            var cur = currentTask(w);
            html += cur ? nowCard(cur) : allDoneCard();
            var rest = w.items.filter(function (x) { return !cur || x.key !== cur.key; });
            if (rest.length) {
                html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Дальше на этой неделе')) + '</div>' + rest.map(function (x) {
                    return '<div class="stg-row' + (p[x.key] ? ' done' : '') + '" data-act="tkpick" data-key="' + esc(x.key) + '">' +
                        '<span class="stg-day">' + (x.day !== null ? esc(T(TR_DAYS[x.day])) : '<i class="ti ti-point"></i>') + '</span>' +
                        '<span class="tx">' + esc(fixDays(x.title)) + '</span>' +
                        (p[x.key] ? '<i class="ti ti-check stg-rowok"></i>' : (x.minutes ? '<span class="stg-pill">' + x.minutes + ' ' + esc(T('мин')) + '</span>' : '')) +
                        '</div>';
                }).join('') + '</div>';
            }
        }
        html += doneCard();
        var last = latestReview();
        if (last) {
            var hl = last.headline_tpl ? tx(last.headline_tpl, 'tpl', 'params', 'text') : (last.headline || '');
            html += '<div class="stg-sec stg-go" data-act="tab" data-tab="plan" data-to="reviews"><div class="stg-eb">' + esc(T('Сверка {n}').replace('{n}', last.week)) + '</div>' +
                '<div class="stg-txt">' + esc(hl) + '</div><div class="stg-golink">' + esc(T('Открыть сверку')) + ' <i class="ti ti-chevron-right"></i></div></div>';
        }
        return html;
    }

    function num1(v) { return String(v).replace('.', ','); }

    function shortNum(n) {
        n = Number(n || 0);
        if (n >= 1e6) return num1(Math.round(n / 1e5) / 10) + ' ' + T('млн');
        if (n >= 1e4) return Math.round(n / 1e3) + ' ' + T('тыс.');
        return num(n);
    }

    function statBox(v, l) {
        return '<div class="stg-stat"><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + '</div></div>';
    }

    function marketStats(d) {
        if (!d) return '';
        var cells = statBox(num(d.channels), T('каналов темы в каталоге'));
        if (d.leader_subscribers) cells += statBox(shortNum(d.leader_subscribers), T('подписчиков у лидера'));
        if (d.growing_share_pct !== null && d.growing_share_pct !== undefined) cells += statBox(d.growing_share_pct + '%', T('каналов растут за 30 дней'));
        if (d.median_posts_per_week) cells += statBox(num1(d.median_posts_per_week), T('постов в неделю у типичного канала'));
        return '<div class="stg-stats">' + cells + '</div><div class="stg-src">' + esc(T('По каналам каталога ForgeMetrics от 1 000 подписчиков')) + '</div>';
    }

    function weekGridHtml() {
        var sec = docSection('content') || {};
        var grid = sec.grid || [];
        if (!grid.length) return '';
        var byDay = {};
        grid.forEach(function (g) { byDay[g.day_index] = g; });
        var cells = TR_DAYS.map(function (d, i) {
            var g = byDay[i];
            return '<div class="stg-wd' + (g ? ' on' : '') + '"><span class="d">' + esc(T(d)) + '</span>' +
                '<span class="r' + (g ? '' : ' off') + '">' + (g ? esc(g.rubric) : '—') + '</span></div>';
        }).join('');
        return '<div class="stg-sec"><div class="stg-eb">' + esc(T('Сетка недели')) + ' · ' + esc(T('постов в неделю:')) + ' ' + (sec.per_week || grid.length) + '</div>' +
            '<div class="stg-week">' + cells + '</div>' +
            (_state.channel_id ? '<button class="stg-btn wide" data-act="trplan">' + esc(T('Открыть контент-план')) + '</button>' : '') + '</div>';
    }

    function panePlan() {
        var doc = _state.doc || {}, html = '';
        var sm = (docSection('summary') || {}).lines || [];
        if (sm.length) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Стратегия в четырёх строках')) + '</div><div class="stg-sum">' + sm.map(function (l) {
                return '<i class="ti ' + (SUM_ICON[l.k] || 'ti-point') + '"></i><div><b>' + esc(T(SUM_LABEL[l.k] || '')) + '</b>' + esc(l.text) + '</div>';
            }).join('') + '</div></div>';
        }
        var n = docSection('niche') || {};
        html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Ниша')) + (n.mode === 'choose' ? ' · ' + esc(T('выбрал стратег')) : '') + '</div>' +
            '<div class="stg-nname">' + esc(n.chosen || doc.niche || '') + '</div>' +
            (n.angle ? '<div class="stg-angle">' + esc(n.angle) + '</div>' : '') + marketStats(n.data) +
            (n.intro ? '<div class="stg-txt">' + esc(n.intro) + '</div>' : '') +
            (doc.metric_note ? '<div class="stg-txt mut">' + esc(doc.metric_note) + '</div>' : '');
        if ((n.risks || []).length) {
            html += '<div class="stg-sub">' + esc(T('Риски и что с ними делать')) + '</div>' + n.risks.map(function (r) {
                return '<div class="stg-item"><b>' + esc(r.risk) + '</b>' + esc(r.handle) + '</div>';
            }).join('');
        }
        var others = (n.options || []).filter(function (o) { return o.name !== n.chosen; });
        if (others.length) {
            html += '<button class="stg-lnk" data-act="optmore"><i class="ti ti-chevron-' + (_optOpen ? 'up' : 'down') + '"></i>' + esc(T('Другие варианты ниши')) + ' · ' + others.length + '</button>';
            if (_optOpen) {
                html += others.map(function (o) {
                    return '<div class="stg-opt"><b>' + esc(o.name) + '</b>' + (o.why_you ? '<p>' + esc(o.why_you) + '</p>' : '') +
                        (o.market ? '<p>' + esc(o.market) + '</p>' : '') + (o.angle ? '<p>' + esc(o.angle) + '</p>' : '') + '</div>';
                }).join('');
            }
        }
        html += '</div>';
        var a = docSection('audience') || {};
        if (a.intro) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Читатель')) + '</div><div class="stg-txt">' + esc(a.intro) + '</div>' +
                (a.hooks || []).map(function (h) { return '<div class="stg-hook">' + esc(h) + '</div>'; }).join('') + '</div>';
        }
        html += weekGridHtml();
        if (doc.budget_plan) html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Бюджет')) + '</div><div class="stg-txt">' + esc(doc.budget_plan) + '</div></div>';
        var ms = (docSection('milestones') || {}).steps || [];
        if (ms.length) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Дальше')) + '</div><div class="stg-mss">' + ms.map(function (m) {
                return '<div class="stg-ms">' + (m.when ? '<div class="w">' + esc(m.when) + '</div>' : '') + '<b>' + esc(m.title) + '</b>' +
                    (m.body ? '<p>' + esc(m.body) + '</p>' : '') + '</div>';
            }).join('') + '</div></div>';
        }
        html += '<div data-sec="reviews">' + reviewHtml() + '</div>';
        if (canManage()) html += '<button class="stg-prev" data-act="restart">' + esc(T('Начать новую стратегию')) + '</button>';
        return html;
    }

    function copyRow(label, text, k, f) {
        return '<div class="stg-copyrow"><div class="tx"><small>' + esc(label) + '</small>' + esc(text) + '</div>' +
            '<button class="stg-cp" data-act="pfcopy" data-k="' + esc(k) + '" data-f="' + f + '">' + esc(T('Копировать')) + '</button></div>';
    }

    function platItems() { return (docSection('platforms') || {}).items || []; }

    function panePlat() {
        var sec = docSection('platforms') || {}, items = platItems(), p = prog(), html = '';
        if (!items.length) return '<div class="stg-sec"><div class="stg-txt">' + esc(T('Площадки появятся после новой сборки стратегии.')) + '</div></div>';
        if (!items.some(function (x) { return x.key === _plat; })) _plat = items[0].key;
        html += '<div class="stg-chips">' + items.map(function (x) {
            return '<button class="stg-ch' + (x.key === _plat ? ' on' : '') + '" data-act="plat" data-k="' + esc(x.key) + '"><i class="stg-vd ' + esc(x.verdict) + '"></i>' + esc(x.name) + '</button>';
        }).join('') + '</div>';
        var it = items.filter(function (x) { return x.key === _plat; })[0];
        html += '<div class="stg-sec"><div class="stg-pf"><span class="n">' + esc(it.name) + '</span><span class="stg-verd ' + esc(it.verdict) + '">' + esc(T(VERDICT[it.verdict] || '')) + '</span></div>' +
            (it.why ? '<div class="stg-txt">' + esc(it.why) + '</div>' : '') + '</div>';
        var pf = it.profile || {};
        if (pf.name || pf.bio) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Профиль — скопируй и вставь')) + '</div>' +
                (pf.name ? copyRow(T('Название'), pf.name, it.key, 'name') : '') + (pf.bio ? copyRow(T('Описание'), pf.bio, it.key, 'bio') : '') +
                (pf.link ? '<div class="stg-small">' + esc(pf.link) + '</div>' : '') + '</div>';
        }
        if ((it.warmup || []).length) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Прогрев и первые шаги')) + '</div>' + it.warmup.map(function (w) {
                var on = !!(w.key && p[w.key]);
                var act = (w.key && canManage()) ? ' data-act="warm" data-key="' + esc(w.key) + '"' : '';
                return '<div class="stg-chk' + (on ? ' on' : '') + '"' + act + '><span class="stg-box">' + (on ? '<i class="ti ti-check"></i>' : '') + '</span>' +
                    '<span class="tx">' + (w.when ? '<small>' + esc(w.when) + '</small>' : '') + esc(w.text) + '</span></div>';
            }).join('') + '</div>';
        }
        var r = it.rhythm || {};
        if (r.per_week || r.when) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Ритм публикаций')) + '</div><div class="stg-rh">' +
                (r.per_week ? '<span class="v">' + r.per_week + '</span><span class="l">' + esc(T('роликов в неделю')) + (r.when ? ' · ' + esc(r.when) : '') + '</span>'
                    : '<span class="l">' + esc(r.when) + '</span>') + '</div>' + (r.note ? '<div class="stg-txt">' + esc(r.note) + '</div>' : '') + '</div>';
        }
        if ((it.nuances || []).length) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Что важно знать')) + '</div>' + it.nuances.map(function (x) {
                return '<div class="stg-nu"><i class="ti ti-info-circle"></i><span>' + esc(x) + '</span></div>';
            }).join('') + '</div>';
        }
        if (it.expect) html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Чего ждать в первые недели')) + '</div><div class="stg-txt">' + esc(it.expect) + '</div></div>';
        if (_state.channel_id) html += '<button class="stg-btn pri wide" data-act="trmod">' + esc(T('Готовые ролики — модуль «Трафик»')) + '</button>';
        if ((sec.telegram || []).length) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Рост внутри Telegram')) + '</div>' + sec.telegram.map(function (x) {
                return '<div class="stg-item"><b>' + esc(x.title) + '</b>' + esc(x.body) + '</div>';
            }).join('') + '</div>';
        }
        if (sec.paid && (sec.paid.steps || []).length) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Закупка рекламы')) + '</div>' + sec.paid.steps.map(function (x) {
                return '<div class="stg-item"><b>' + esc(x.title) + '</b>' + esc(x.body) + '</div>';
            }).join('') + '<button class="stg-btn wide" data-act="tkradar">' + esc(T('Открыть Радар')) + '</button></div>';
        }
        return html;
    }

    function paneMoney() {
        var m = docSection('money') || {}, html = '';
        var subs = (_state.channel && _state.channel.subscribers) || 0;
        var lad = m.ladder || [], here = 0;
        lad.forEach(function (x, i) { if (subs >= (x.from || 0)) here = i; });
        if (lad.length) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Лестница дохода')) + '</div><div class="stg-lad">' + lad.map(function (x, i) {
                var w = x.from ? T('от {n} подписчиков').replace('{n}', num(x.from)) : T('с нуля');
                return '<div class="stg-st' + (i === here ? ' here' : '') + '"><div class="w">' + esc(w) + (i === here ? '<span class="tag">' + esc(T('ты здесь')) + '</span>' : '') + '</div>' +
                    '<b>' + esc(x.title) + '</b>' + (x.body ? '<p>' + esc(x.body) + '</p>' : '') + '</div>';
            }).join('') + '</div></div>';
        }
        if ((m.partners || []).length) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Партнёрские программы под нишу')) + '</div>' + m.partners.map(function (x) {
                return '<div class="stg-pt"><div class="top"><b>' + esc(x.name) + '</b></div>' + (x.requires ? '<div class="req">' + esc(x.requires) + '</div>' : '') +
                    (x.fit ? '<p>' + esc(x.fit) + '</p>' : '') +
                    '<details><summary>' + esc(T('Как подключить и встроить в канал')) + '</summary>' + (x.how ? '<p>' + esc(x.how) + '</p>' : '') +
                    (x.content ? '<p>' + esc(x.content) + '</p>' : '') + '</details></div>';
            }).join('') + '</div>';
        }
        if (m.offer && m.offer.body) {
            html += '<div class="stg-sec"><div class="stg-eb">' + esc(T('Оффер на Площадке')) + '</div><div class="stg-ready"><div class="k">' + esc(T('Готовый текст')) + '</div>' +
                '<div class="v full">' + esc(m.offer.body) + '</div></div><div class="stg-acts"><button class="stg-btn pri" data-act="offcopy">' + esc(T('Скопировать текст')) + '</button>' +
                '<button class="stg-btn" data-act="market">' + esc(T('Открыть Площадку')) + '</button></div></div>';
        }
        if (m.marking) html += '<div class="stg-small stg-mark">' + esc(m.marking) + '</div>';
        return html || '<div class="stg-sec"><div class="stg-txt">' + esc(T('План дохода появится после новой сборки стратегии.')) + '</div></div>';
    }

    function paneChat() {
        var sug = canManage() ? '<div class="stg-chips">' + CHAT_SUG.map(function (q) {
            return '<button class="stg-ch" data-act="sug" data-q="' + esc(T(q)) + '">' + esc(T(q)) + '</button>';
        }).join('') + '</div>' : '';
        return sug + chatHtml();
    }

    function legacyHtml() {
        return '<div class="stg-sec stg-now"><div class="stg-eb">' + esc(T('Стратегия в прежнем формате')) + '</div>' +
            '<div class="stg-txt">' + esc(T('Эта стратегия собрана до обновления стратега. План по дням, площадки с готовыми профилями и партнёрские программы под нишу появятся после новой сборки: разговор со стратегом займёт около 10 минут.')) + '</div>' +
            (canManage() ? '<button class="stg-btn pri wide" data-act="restart">' + esc(T('Начать новую стратегию')) + '</button>' : '') + '</div>';
    }

    function docHead() {
        var week = _state.week || 1;
        var line = channelLine() || T('канал не привязан');
        return '<div class="stg-head"><button class="stg-back" data-act="close" aria-label="' + esc(T('Назад')) + '"><i class="ti ti-arrow-left"></i></button>' +
            '<div style="min-width:0"><div class="t">' + esc(T('AI-стратегия')) + '</div><div class="s">' + esc(line) + ' · ' + esc(T('неделя')) + ' ' + week +
            (week <= 4 ? ' ' + esc(T('из')) + ' 4' : '') + '</div></div></div>';
    }

    function tabsHtml() {
        return '<div class="stg-tabs" role="tablist">' + TABS.map(function (t) {
            var on = _tab === t[0];
            return '<button class="stg-tab' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-act="tab" data-tab="' + t[0] + '">' +
                '<i class="ti ' + t[2] + '"></i><span>' + esc(T(t[1])) + '</span></button>';
        }).join('') + '</div>';
    }

    function paneHtml() {
        return ({ today: paneToday, plan: panePlan, plat: panePlat, money: paneMoney, chat: paneChat }[_tab] || paneToday)();
    }

    function renderDoc() {
        var doc = (_state && _state.doc) || {};
        var host0 = document.getElementById('strategy-screen');
        var keepScroll = (host0 && host0.querySelector('.stg-tabs')) ? host0.scrollTop : null;
        var draftEl = document.getElementById('stg-chat-inp');
        var draft = draftEl ? draftEl.value : '';
        if (doc.v !== 3) {
            setView(legacyHtml(), docHead());
            return;
        }
        var host = setView(tabsHtml() + '<div class="stg-pane">' + paneHtml() + '</div>', docHead());
        if (keepScroll !== null) host.scrollTop = keepScroll;
        else if (_tab === 'chat') host.scrollTop = host.scrollHeight;
        if (draft) {
            var nd = document.getElementById('stg-chat-inp');
            if (nd) nd.value = draft;
        }
        docPoll();
    }

    function rerenderPane(toTop) {
        var host = document.getElementById('strategy-screen');
        var pane = host && host.querySelector('.stg-pane');
        if (!pane) { renderDoc(); return; }
        pane.innerHTML = paneHtml();
        var tabs = host.querySelector('.stg-tabs');
        if (toTop && tabs) host.scrollTop = Math.min(host.scrollTop, tabs.offsetTop);
    }

    function switchTab(tab, to) {
        _tab = tab;
        var host = document.getElementById('strategy-screen');
        if (!host || !host.querySelector('.stg-tabs')) { renderDoc(); return; }
        host.querySelectorAll('.stg-tab').forEach(function (b) {
            var on = b.getAttribute('data-tab') === tab;
            b.classList.toggle('on', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        rerenderPane(true);
        if (tab === 'chat') { host.scrollTop = host.scrollHeight; return; }
        var target = to ? host.querySelector('[data-sec="' + to + '"]') : null;
        if (target) host.scrollTop = Math.max(0, target.offsetTop - host.querySelector('.stg-tabs').offsetHeight - 8);
    }

    function setProgress(key, done) {
        if (!_state.progress) _state.progress = {};
        _state.progress[key] = done;
        apiRequest('/api/v1/strategy/step', { method: 'POST', body: JSON.stringify({ key: key, done: done }) }).catch(function () {});
    }

    function attachFlow() {
        haptic('light');
        apiRequest('/api/v1/channels/active').then(function (d) {
            var chans = (d && d.channels) || [];
            if (!chans.length) {
                toast(T('Сначала подключи канал — затем вернись и привяжи его к стратегии'));
                closeStrategy();
                if (typeof openChannels === 'function') openChannels();
                return;
            }
            var go = function (id) {
                apiRequest('/api/v1/strategy/attach', { method: 'POST', body: JSON.stringify({ channel_id: id }) }).then(function (r) {
                    if (r && r.ok) { haptic('medium'); toast(T('Канал привязан — стратег записывает сетку недели и собирает посты')); load(); }
                    else toast((r && r.message) || T('Не удалось привязать канал'));
                }).catch(function () { toast(T('Не удалось привязать канал')); });
            };
            if (typeof window.showBottomSheet !== 'function') { go(chans[0].id); return; }
            window.showBottomSheet({
                title: T('Какой канал привязать к стратегии?'),
                subtitle: T('Сетка недели, посты, стиль и сверки — для этого канала'),
                items: chans.map(function (c) {
                    return { id: c.id, title: c.title || (c.username ? '@' + c.username : T('Канал')),
                             subtitle: c.username ? '@' + c.username : '', has_avatar: c.has_avatar, is_private: c.is_private };
                }),
                activeId: d.active_channel_id || chans[0].id,
                onSelect: go
            });
        }).catch(function () { toast(T('Не удалось загрузить. Проверь соединение и попробуй ещё раз.')); });
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

    var _rvOpen = {};
    function canManage() { return !_state || _state.can_manage !== false; }
    function denyManage() { toast(T('Стратегию канала ведёт владелец и доверенный администратор — тебе доступен просмотр')); }
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
            : '<div class="stg-note" style="margin-top:8px;">' + esc(r.no_changes_reason ? tx(r.no_changes_reason, 'tpl', 'params', 'text') : T('Сетка без изменений: данных для решений пока мало — рубрики и часы оцениваются от 3 постов.')) + '</div>') + '</div>';
        var auto = r.auto_closed || [];
        if (auto.length) {
            html += '<div class="stg-sec"><div class="stg-eyebrow ok"><span class="tile"><i class="ti ti-circle-check"></i></span> ' + esc(T('Закрыл за тебя')) + '</div>' +
                '<div class="stg-rv-rows">' + auto.map(function (a) { return '<div class="stg-rv-row"><span class="dot ok"></span><span>' + esc(tx(a, 'tpl', 'params', 'text')) + '</span></div>'; }).join('') + '</div></div>';
        }
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
        var quota = (_state.chat && _state.chat.quota) || 100;
        var tail = canManage()
            ? '<div class="stg-chatrow"><input class="stg-inp" id="stg-chat-inp" maxlength="1000" placeholder="' + esc(T('Спроси о своём канале, нише или шаге плана')) + '">' +
              '<button class="stg-send" data-act="send" aria-label="' + esc(T('Отправить')) + '"><i class="ti ti-send"></i></button></div>' +
              '<div class="stg-quota" id="stg-quota">' + esc(T('Осталось')) + ' ' + Math.max(0, quota - used) + ' ' + esc(T('из')) + ' ' + quota + ' ' + esc(T('вопросов на этой неделе')) + '</div>'
            : '<div class="stg-note" style="margin-top:8px;">' + esc(T('Вопросы стратегу задаёт тот, кто ведёт стратегию канала.')) + '</div>';
        return '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-message-circle"></i></span> ' + esc(T('Вопрос стратегу')) + '</div>' +
            '<div id="stg-chat-msgs">' + rows + '</div>' + tail + '</div>';
    }

    var _chatBusy = false;

    function chatBottom() {
        var host = document.getElementById('strategy-screen');
        if (host) host.scrollTop = host.scrollHeight;
    }

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
        chatBottom();
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
                        if (qEl) qEl.textContent = T('Осталось') + ' ' + Math.max(0, (_state.chat.quota || 100) - _state.chat.used) + ' ' + T('из') + ' ' + (_state.chat.quota || 100) + ' ' + T('вопросов на этой неделе');
                    }
                } else if (r && r.error === 'quota') {
                    typing.classList.remove('stg-typing');
                    typing.textContent = T('Лимит вопросов на этой неделе исчерпан — квота обновится в начале следующей.');
                } else {
                    typing.classList.remove('stg-typing');
                    typing.textContent = T('Стратег не ответил — попробуй ещё раз.');
                }
                chatBottom();
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

    var _tr = null, _trTimer = null, _trChan = null, _trOpen = false, _trBusy = {};
    var TR_DAYS = [SG('Пн'), SG('Вт'), SG('Ср'), SG('Чт'), SG('Пт'), SG('Сб'), SG('Вс')];

    function trForge(n) {
        return (typeof window.forgeAmount === 'function') ? window.forgeAmount(n, 12) : num(n);
    }
    function trPct(x) {
        var s = String(x == null ? '' : x);
        return ((typeof window.getLang === 'function' ? window.getLang() : 'ru') === 'en') ? s : s.replace('.', ',');
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
        if (e === 'no_channel') return T(SG('Подключи канал — модуль трафика работает с его данными.'));
        if (e === 'unclear') return (d && d.message) || T('Не понял. Выбери вариант или напиши словами — например: «выйти на 30 тыс. ₽ в месяц с рекламы».');
        if (e === 'locked') return T(SG('Доступ к стратегии не открыт.'));
        if (e === 'no_strategy') return T(SG('Сначала открой стратегию.'));
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
            dn = d.donors || {}, lk = d.links || {}, rv = d.review || {};
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

        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-player-play"></i></span> ' + esc(T('Площадки коротких роликов')) + '</div>';
        (pl.use || []).forEach(function (p) {
            var link = lk.platforms && lk.platforms[p.key];
            var url = link ? (link.invite_link || link.click_url || '') : '';
            var sub = p.text ? T('ролики, посты и статьи · ссылка на канал — в профиле') : '';
            html += '<div class="stg-trrow"><div class="tx"><b>' + esc(p.name) + '</b>' +
                (link ? '<em><span class="stg-trlink" data-act="trcopy" data-text="' + esc(url) + '">' + esc(url.replace(/^https?:\/\//, '')) + '</span> · +' + num(link.joined || 0) + ' ' + esc(T('вступили')) +
                    (link.clicks ? ' · ' + num(link.clicks) + ' ' + esc(T('переходов')) : '') + '</em>'
                    : '<em>' + esc(sub) + (sub ? ' · ' : '') + esc(T('ссылка отслеживания не создана')) + '</em>') + '</div>' +
                (link ? '' : '<button class="stg-trbtn" data-act="trplink" data-key="' + esc(p.key) + '"' + (ch.connected ? '' : ' disabled') + '>' + esc(T('Создать ссылку')) + '</button>') + '</div>';
        });
        if (!ch.connected) html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('Ссылки создаёт бот — подключи его к каналу в настройках канала.')) + '</div>';
        html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('По желанию: ссылка отслеживания в профиле площадки покажет, сколько подписчиков она приводит. Обычная ссылка на канал тоже работает.')) + '</div></div>';

        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-movie"></i></span> ' + esc(T('Конвейер креативов из постов недели')) +
            (cv.per_week ? '<span class="stg-trchip">' + num(cv.ready || 0) + ' / ' + num(cv.per_week) + '</span>' : '') + '</div>' +
            '<div class="stg-note" style="margin-top:8px;">' + esc(T('Каждый пост недели → ролик 9:16 с озвучкой и музыкой: хук, тезисы, число, призыв в канал. Готовый файл примерно через 5 минут.')) + '</div>' +
            '<div class="stg-note" style="margin-top:8px;">' + esc(T('Голоса дикторов настраиваются в разделе')) +
            ' \u00ab<span data-act="trvoicecab" style="color:#818cf8;font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:2px;">' + esc(T('Мои каналы')) + '</span>\u00bb.</div>';
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

        var picking = dn.status === 'running' || dn.status === 'analyzing';
        html += '<div class="stg-sec"><div class="stg-eyebrow"><span class="tile"><i class="ti ti-radar"></i></span> ' + esc(T('Доноры из Радара')) + '</div>';
        if (picking) {
            html += '<div class="stg-trwait" style="margin-top:8px;"><span class="stg-spin sm"></span>' + esc(T('Подбираю каналы под нишу — 1–2 минуты')) + '</div>';
        } else if (dn.picks && dn.picks.length) {
            dn.picks.forEach(function (p) {
                html += '<div class="stg-trrow"><div class="tx"><b>@' + esc(p.username || '') + '</b><em>' + num(p.subscribers || 0) + ' ' + esc(T('подп.')) +
                    (p.er ? ' · ER ' + trPct(p.er) + '%' : (p.err ? ' · ERR ' + Math.round(p.err) + '%' : '')) + '</em></div>' +
                    (p.match ? '<span class="stg-trchip">' + p.match + '%</span>' : '') + '</div>';
            });
            if (dn.total > dn.picks.length) html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('Ещё')) + ' ' + num(dn.total - dn.picks.length) + ' ' + esc(T('в отчёте подбора')) + '</div>';
        } else if (dn.status === 'empty') {
            html += '<div class="stg-note" style="margin-top:8px;">' + esc(T('В прошлый раз подходящих каналов не нашлось — Радар пополняется, попробуй снова.')) + '</div>';
        } else {
            html += '<div class="stg-note" style="margin-top:8px;">' + esc(T('Подбор смотрит каналы твоей ниши в Радаре: активные, с ровными просмотрами и низкой долей рекламы.')) + '</div>';
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
        html += '<div class="stg-note" style="margin-top:6px;">' + esc(T('Стратег сверяет расчёт с фактом раз в неделю и обновляет задачи.')) + '</div></div>';

        setView(html, trHead());
        trPoll();
    }
    function trSave(body) {
        body.channel_id = _trChan;
        if (body.target_add !== undefined && !(body.target_add > 0)) { toast(T('Укажи число')); return; }
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
            if (!c || !c.description) { toast(T('Не удалось получить описание')); return; }
            trCopy(c.description, T('Описание скопировано'));
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
        if (act === 'trvoicecab') {
            haptic('light');
            var vcid = _trChan || (_state && _state.channel_id) || null;
            if (vcid && window.__openChannelSettings) { window.__csFocusVoices = true; window.__openChannelSettings(vcid); }
            return true;
        }
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

    var MANAGE_ACTS = {
        cb: 1, warm: 1, tkdone: 1, how: 1, send: 1, ask: 1, sug: 1, attach: 1, restart: 1, regen: 1, tnext: 1, tbuild: 1,
        start: 1, continue: 1, buy: 1, renew: 1, trbuild: 1, trplink: 1, trpick: 1, trgoal: 1, trgoalsave: 1,
    };

    function fillChat(text) {
        var inp = document.getElementById('stg-chat-inp');
        if (!inp) return;
        inp.value = text;
        inp.focus();
        var host = document.getElementById('strategy-screen');
        if (host) host.scrollTop = host.scrollHeight;
    }

    function onScreenClick(ev) {
        var t = ev.target;
        var actEl = t.closest ? t.closest('[data-act]') : null;
        if (!actEl) return;
        var act = actEl.getAttribute('data-act');
        var key = actEl.getAttribute('data-key');
        if (MANAGE_ACTS[act] && !canManage()) { denyManage(); return; }
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
        if (act === 'tab') {
            haptic('light');
            var pl = actEl.getAttribute('data-plat');
            if (pl) _plat = pl;
            switchTab(actEl.getAttribute('data-tab'), actEl.getAttribute('data-to'));
            return;
        }
        if (act === 'tkpick') { haptic('light'); _curKey = key; rerenderPane(true); return; }
        if (act === 'tkdone') {
            var nowDone = !prog()[key];
            setProgress(key, nowDone);
            haptic(nowDone ? 'medium' : 'light');
            if (nowDone && _curKey === key) _curKey = null;
            if (!nowDone) _curKey = key;
            rerenderPane(true);
            return;
        }
        if (act === 'cb' || act === 'warm') { haptic('light'); setProgress(key, !prog()[key]); rerenderPane(false); return; }
        if (act === 'rmore') { _readyOpen[key] = true; rerenderPane(false); return; }
        if (act === 'tkcopy') {
            var cps = findStep(key);
            if (cps && cps.ready) trCopy(cps.ready, T('Текст скопирован'));
            return;
        }
        if (act === 'offcopy') {
            var off = (docSection('money') || {}).offer;
            if (off && off.body) trCopy(off.body, T('Текст скопирован'));
            return;
        }
        if (act === 'pfcopy') {
            var pit = platItems().filter(function (x) { return x.key === actEl.getAttribute('data-k'); })[0];
            var val = pit && pit.profile ? pit.profile[actEl.getAttribute('data-f')] : '';
            if (val) trCopy(val, T('Текст скопирован'));
            return;
        }
        if (act === 'plat') { haptic('light'); _plat = actEl.getAttribute('data-k'); rerenderPane(false); return; }
        if (act === 'optmore') { haptic('light'); _optOpen = !_optOpen; rerenderPane(false); return; }
        if (act === 'attach') { attachFlow(); return; }
        if (act === 'sug') { haptic('light'); fillChat(actEl.getAttribute('data-q') || ''); return; }
        if (act === 'ask') {
            haptic('light');
            switchTab('chat');
            fillChat(T('Вопрос по шагу') + ' «' + (actEl.getAttribute('data-t') || '') + '»: ');
            return;
        }
        if (act === 'tkradar') {
            haptic('light');
            closeStrategy();
            if (typeof window.__openRadar === 'function') window.__openRadar();
            return;
        }
        if (act === 'rvopen') { haptic('light'); var wk = parseInt(actEl.getAttribute('data-week'), 10); _rvOpen[wk] = !_rvOpen[wk]; rerenderPane(false); return; }
        if (act === 'trmod') { haptic('light'); openTraffic(); return; }
        if (act === 'market') { haptic('light'); closeStrategy(); if (typeof window.__openMarket === 'function') window.__openMarket(); return; }
        if (act === 'how') { openGuide(actEl); return; }
        if (act === 'send') { sendChat(); return; }
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
