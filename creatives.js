(function () {
    'use strict';

    var T = function (s) { return (typeof window.t === 'function') ? window.t(s) : s; };
    var POLL_MS = 15000;
    var WAIT_MS = 1400;

    var _open = false;
    var _view = 'list';
    var _items = null;
    var _loading = false;
    var _pollTimer = null;
    var _waitTimer = null;
    var A = fresh();

    function fresh() {
        return { id: null, step: null, chips: [], channel: null, history: [], busy: false, gender: 'male',
                 tier: 'base', sub: null, waitTexts: null };
    }
    function esc(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} }
    function toast(m, icon) { try { if (typeof window.showToast === 'function') window.showToast(m, icon); } catch (e) {} }
    function fa(n, s) { return (typeof window.forgeAmount === 'function') ? window.forgeAmount(n, s || 14) : String(n); }
    function lang() { try { return (typeof window.getLang === 'function' && window.getLang()) || 'ru'; } catch (e) { return 'ru'; } }
    function apiErrText(err, fb) {
        try {
            var s = String((err && err.message) || '');
            var body = s.slice(s.indexOf(': ') + 2);
            var d = JSON.parse(body);
            var t = d && (typeof d.detail === 'string' ? d.detail : (d.detail && d.detail.message));
            if (t) return t;
        } catch (e) {}
        return fb;
    }
    function priceOf(key, fb) {
        try {
            var p = (typeof state !== 'undefined' && state && state.dashboard && state.dashboard.forge_prices) || null;
            if (Array.isArray(p)) {
                for (var i = 0; i < p.length; i++) if (p[i] && p[i].key === key && p[i].price) return p[i].price;
            }
        } catch (e) {}
        return fb;
    }
    function basePrice() { return priceOf('creative_build', 70); }
    function premiumPrice() { return priceOf('creative_premium', 200); }
    function planPrice() { return priceOf('creative_plan', 5); }
    function editPrice() { return priceOf('creative_plan_edit', 5); }
    function fmtDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
    }
    function kindName(k) {
        return ({ product: T('товар'), channel: T('канал'), betting: T('ставки'), dating: T('знакомства'), nutra: T('нутра'),
            finance: T('финансы'), apps: T('приложение'), edu: T('курс'), services: T('услуга'), other: T('оффер'),
            post: T('пост'), site: T('сайт'), topic: T('тема') })[k] || '';
    }
    function platName(k) { var p = window.FM_PLATFORMS && window.FM_PLATFORMS[k]; return p ? p.n : k; }
    function platIcon(k) { return (typeof window.fmPlatIcon === 'function') ? window.fmPlatIcon(k) : ''; }
    function openUrl(u) {
        if (!u) return;
        try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) window.Telegram.WebApp.openLink(u);
            else window.open(u, '_blank');
        } catch (e) { window.open(u, '_blank'); }
    }

    function ensureScreen() {
        var host = document.getElementById('creatives-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'creatives-screen';
            host.className = 'crv-screen';
            (document.getElementById('app') || document.body).appendChild(host);
            host.addEventListener('click', onClick);
            host.addEventListener('keydown', onKey);
        }
        if (!_open) return host;
        host.style.display = 'flex';
        document.documentElement.classList.add('cs-modal-open');
        document.body.classList.add('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(onBack); tg.BackButton.onClick(onBack); tg.BackButton.show(); } } catch (e) {}
        return host;
    }
    function onBack() {
        if (_view === 'assist') assistBack();
        else close();
    }
    function close() {
        _open = false;
        stopPoll();
        stopWait();
        var host = document.getElementById('creatives-screen');
        if (host) host.style.display = 'none';
        document.documentElement.classList.remove('cs-modal-open');
        document.body.classList.remove('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(onBack); tg.BackButton.hide(); } } catch (e) {}
    }
    function stopPoll() {
        if (_pollTimer) { clearTimeout(_pollTimer); _pollTimer = null; }
    }
    function hasActive() {
        return (_items || []).some(function (c) { return c.status === 'queued' || c.status === 'generating'; });
    }
    function schedulePoll() {
        stopPoll();
        if (!_open || _view !== 'list' || !hasActive()) return;
        _pollTimer = setTimeout(function () {
            _pollTimer = null;
            if (!_open) return;
            load(true);
        }, POLL_MS);
    }
    function headHtml(title, backAct) {
        return '<div class="crv-head"><button class="crv-back" data-act="' + backAct + '"><i class="ti ti-arrow-left"></i></button>' +
            '<div class="t">' + esc(title) + '</div></div>';
    }
    function setView(html) {
        var host = ensureScreen();
        host.innerHTML = html;
        host.scrollTop = 0;
        return host;
    }

    function statusHtml(c) {
        if (c.status === 'ready') return '<span class="crv-st ok"><i class="ti ti-check"></i>' + esc(T('готов')) + '</span>';
        if (c.status !== 'queued' && c.status !== 'generating') return '<span class="crv-st err"><i class="ti ti-alert-triangle"></i>' + esc(T('ошибка')) + '</span>';
        return '<span class="crv-st q"><span class="crv-spin sm"></span>' + esc(T('собирается')) + '</span>';
    }
    function previewHtml(c) {
        var img = c.preview_url ? '<img src="' + esc(c.preview_url) + '" alt="">' : '<i class="ti ti-movie"></i>';
        if (c.status === 'ready' && c.url) {
            var dur = c.duration_s ? Math.round(c.duration_s) + ' ' + T('с') : '';
            return '<button class="crv-prev" data-act="open" data-url="' + esc(c.url) + '">' + img +
                '<span class="crv-play"><i class="ti ti-player-play-filled"></i></span>' +
                (dur ? '<span class="crv-dur">' + esc(dur) + '</span>' : '') + '</button>';
        }
        return '<div class="crv-prev ph">' + img + '</div>';
    }
    function actsHtml(c) {
        var del = '<button class="cp-act crv-del" data-act="del" data-id="' + c.id + '"><i class="ti ti-trash"></i><span>' + esc(T('Удалить')) + '</span></button>';
        if (c.status === 'ready' && (c.url || c.in_telegram)) {
            var out = '';
            out += '<button class="cp-act" data-act="send" data-id="' + c.id + '"><i class="ti ti-brand-telegram"></i><span>' + esc(T('Отправить в Telegram')) + '</span></button>';
            if (c.url) out += '<button class="cp-act ok" data-act="open" data-url="' + esc(c.url) + '"><i class="ti ti-download"></i><span>' + esc(T('Скачать MP4')) + '</span></button>';
            out += '<button class="cp-act" data-act="variant" data-id="' + c.id + '"><i class="ti ti-refresh"></i><span>' + esc(T('Другой вариант')) + '</span> ' + fa(basePrice(), 12) + '</button>';
            out += del;
            out += '<button class="cp-act" data-act="desc" data-id="' + c.id + '"><i class="ti ti-copy"></i><span>' + esc(T('Текст для описания')) + '</span></button>';
            return out;
        }
        if (c.status === 'ready') return '<div class="cp-note">' + esc(T('Файл ролика недоступен')) + '</div>' + del;
        if (c.status !== 'queued' && c.status !== 'generating') return '<div class="cp-note fail">' + esc(T('Ролик не собрался — списание за сборку возвращено. Собери новый.')) + '</div>' + del;
        return '<div class="cp-note">' + esc(T('Сценарий, кадры, озвучка, монтаж. Обычно 5–8 минут — можно уйти с экрана, ролик придёт в чат с ботом.')) + '</div>';
    }
    function itemHtml(c) {
        var meta = [kindName(c.source_kind), (c.platforms || []).map(platName).join(', '), fmtDate(c.created_at)]
            .filter(function (x) { return !!x; }).join(' · ');
        var title = c.title || (T('Ролик №') + c.id);
        return '<div class="crv-item" data-cid="' + c.id + '">' +
            '<div class="crv-top"><div class="crv-title">' + esc(title) + '</div>' + statusHtml(c) + '</div>' +
            (meta ? '<div class="crv-meta">' + esc(meta) + '</div>' : '') +
            '<div class="crv-card">' + previewHtml(c) + '<div class="crv-acts">' + actsHtml(c) + '</div></div></div>';
    }
    function listBodyHtml() {
        if (_items === null) return '<div class="crv-center"><div class="crv-spin"></div><div class="m">' + esc(T('Загружаю ролики...')) + '</div></div>';
        if (!_items.length) {
            return '<div class="crv-empty"><i class="ti ti-movie"></i><div>' +
                esc(T('Роликов пока нет. Нажми «Новый ролик» — ассистент задаст несколько вопросов и соберёт план.')) + '</div></div>';
        }
        return '<div class="crv-list">' + _items.map(itemHtml).join('') + '</div>';
    }
    function renderList() {
        _view = 'list';
        stopWait();
        var draft = savedDraftId();
        setView(headHtml(T('Креативы'), 'close') +
            '<div class="crv-sub">' + esc(T('Готовые ролики и сборка новых')) + '</div>' +
            '<button class="cp-act gen wide" data-act="new"><i class="ti ti-plus"></i> ' + esc(T('Новый ролик')) + '</button>' +
            (draft ? '<button class="cp-act crv-ghost wide" data-act="resume" data-id="' + draft + '"><i class="ti ti-player-play"></i> ' + esc(T('Продолжить незаконченный ролик')) + '</button>' : '') +
            '<div class="crv-lbl">' + esc(T('Мои ролики')) + '</div>' +
            '<div id="crv-list">' + listBodyHtml() + '</div>');
    }
    function redrawList() {
        var el = document.getElementById('crv-list');
        if (el && _view === 'list') el.innerHTML = listBodyHtml();
    }
    function showList() {
        renderList();
        schedulePoll();
    }
    function load(silent) {
        if (_loading) return;
        _loading = true;
        apiRequest('/api/v1/creative/mine?limit=30')
            .then(function (r) {
                _loading = false;
                if (r && r.ok) _items = r.creatives || [];
                else if (_items === null) _items = [];
                redrawList();
                schedulePoll();
            })
            .catch(function () {
                _loading = false;
                if (_items === null) { _items = []; redrawList(); }
                if (!silent) toast(T('Не удалось загрузить ролики'), 'alert-triangle');
                schedulePoll();
            });
    }

    function errMap() {
        return {
        no_channel: T('Подключи канал на главном экране — ролик поведёт на него'),
        assist_limit: T('Лимит диалогов на сегодня исчерпан'),
        answer_empty: T('Выбери вариант или напиши ответ'),
        answer_invalid: T('Выбери один из вариантов'),
        answer_unexpected: T('Шаг уже пройден — вернись по чипу сверху'),
        forbidden_phrase: T('Так сформулировать нельзя: без обещаний результата, выигрыша и дохода'),
        source_unsupported: T('Пока читаются карточки Wildberries. Ozon подключим следующим'),
        source_link_required: T('Вставь ссылку на карточку товара'),
        source_unreadable: T('Не удалось прочитать ссылку'),
        product_not_found: T('Товар не найден. Проверь ссылку или артикул'),
        product_limit: T('Лимит проверок товаров на сегодня исчерпан'),
        platform_invalid: T('Выбери хотя бы одну площадку'),
        cta_invalid: T('Такой финал недоступен'),
        cta_offscreen: T('Финал показывает цель в кадре — укажи, что должно быть на экране'),
        promo_invalid: T('Промокод: до 20 букв и цифр'),
        name_required: T('Укажи название, которое показать в финале'),
        revision_limit: T('Правок больше нет — собери ролик или начни заново'),
        assist_unavailable: T('Помощник временно недоступен. Повтори через минуту'),
        plan_invalid: T('План не сформирован — вернись на шаг назад'),
        geo_required: T('Укажи страну показа'),
        blocked: T('Ролик по этому источнику собрать нельзя'),
        premium_soon: T('Премиум подключим в ближайшем обновлении'),
        not_found: T('Черновик не найден — начни заново'),
        };
    }
    function errText(r, fb) {
        if (r && r.error === 'daily_limit' && r.message) return r.message;
        var m = errMap();
        if (r && r.error && m[r.error]) return m[r.error];
        return fb;
    }

    var ORB = '<div class="thinking-orb"><div class="thinking-orb-inner"></div><div class="thinking-orb-pulse"></div></div>';
    var SPARK = '<div class="question-bubble-icon"><i class="ti ti-sparkles"></i></div>';
    function stopWait() {
        if (_waitTimer) { clearInterval(_waitTimer); _waitTimer = null; }
    }
    function renderWait(texts) {
        _view = 'assist';
        stopWait();
        setView(headHtml(T('Новый ролик'), 'back') + chipsHtml() +
            '<div class="crv-center crv-wait">' + ORB + '<div class="thinking-text crv-think" id="crv-think">' + esc(texts[0]) + '</div></div>');
        var i = 0;
        _waitTimer = setInterval(function () {
            i = (i + 1) % texts.length;
            var el = document.getElementById('crv-think');
            if (!el) { stopWait(); return; }
            el.style.opacity = '0';
            setTimeout(function () { var e2 = document.getElementById('crv-think'); if (e2) { e2.textContent = texts[i]; e2.style.opacity = '1'; } }, 200);
        }, 1800);
    }
    function chipsHtml() {
        var chips = A.chips || [];
        if (!chips.length) return '';
        return '<div class="crv-chips">' + chips.map(function (c) {
            var inHist = A.history.some(function (h) { return h.step && h.step.type === 'question' && h.step.key === c.key; }) || c.key === 'vertical';
            return '<button class="crv-chip' + (inHist ? '' : ' plain') + '" data-act="chip" data-key="' + esc(c.key) + '">' + esc(c.label) + '</button>';
        }).join('') + '</div>';
    }
    function bubble(title, hint, rawHint) {
        return '<div class="question-bubble">' + SPARK + '<div class="question-text">' + esc(title) +
            (hint ? '<small class="crv-hint">' + esc(hint) + '</small>' : (rawHint ? '<small class="crv-hint">' + rawHint + '</small>' : '')) + '</div></div>';
    }
    function optionsHtml(opts, act, extra) {
        return '<div class="question-options">' + opts.map(function (o) {
            var v = (o && typeof o === 'object') ? o.value : o;
            var l = (o && typeof o === 'object') ? o.label : o;
            var h = (o && typeof o === 'object' && o.hint) ? '<small>' + esc(o.hint) + '</small>' : '';
            return '<button class="question-option" data-act="' + act + '" data-val="' + esc(v) + '"' + (extra || '') + '>' +
                '<span class="question-option-text">' + esc(l) + h + '</span><i class="ti ti-arrow-right"></i></button>';
        }).join('') + '</div>';
    }
    function customHtml(placeholder, act, maxlen, sep) {
        return (sep ? '<div class="question-separator"><span>' + esc(T('или своими словами')) + '</span></div>' : '') +
            '<div class="question-custom crv-custom"><input class="question-custom-input" id="crv-in" maxlength="' + (maxlen || 200) + '" placeholder="' + esc(placeholder || T('Напиши ответ')) + '">' +
            '<button class="cp-act gen crv-send" data-act="' + act + '"><i class="ti ti-send"></i></button></div>';
    }
    function renderStep() {
        _view = 'assist';
        stopWait();
        var s = A.step;
        if (!s) { showList(); return; }
        var h = headHtml(s.type === 'plan' ? T('План ролика') : T('Новый ролик'), 'back') + chipsHtml();
        if (s.type === 'vertical') {
            h += bubble(T('Что будем рекламировать?')) + optionsHtml(s.options, 'vertical');
        } else if (s.type === 'question') {
            var opts = (s.options || []).slice();
            if (s.last) opts.unshift({ value: s.last, label: T('Как в прошлый раз') + ': ' + s.last });
            h += bubble(s.title, s.hint);
            if (opts.length) h += optionsHtml(opts, 'answer');
            if (s.input || s.allow_text !== false) h += customHtml(s.placeholder || (s.input === 'link' ? T('Вставь ссылку') : T('Напиши ответ')), 'answer-custom', s.input === 'link' ? 500 : 200, !!opts.length && !s.input);
        } else if (s.type === 'platforms') {
            var sel = A.sub && A.sub.plats ? A.sub.plats : null;
            if (!sel) { sel = (s.last && s.last.length ? s.last.slice() : (s.preselect || []).slice()); A.sub = { plats: sel }; }
            h += bubble(T('Где будет показываться ролик?'), T('Можно несколько — один ролик под все отмеченные')) +
                '<div class="crv-grid">' + (s.keys || []).map(function (k) {
                    var off = s.off && s.off[k];
                    var on = sel.indexOf(k) >= 0;
                    return '<button class="crv-tile' + (on ? ' on' : '') + (off ? ' off' : '') + '" data-act="plat" data-plat="' + esc(k) + '"' + (off ? ' data-off="' + esc(off) + '"' : '') + '>' +
                        '<span class="crv-ck"><i class="ti ti-check"></i></span>' + platIcon(k) + '<span class="tx"><b>' + esc(platName(k)) + '</b>' + (off ? '<em>' + esc(T(off)) + '</em>' : '') + '</span></button>';
                }).join('') + '</div>' +
                '<button class="cp-act gen wide crv-go" data-act="plats-go"' + (sel.length ? '' : ' disabled') + '>' +
                (s.then_plan ? esc(T('План ролика')) + ' · ' + fa(planPrice(), 14) : esc(T('Далее')) + ' <i class="ti ti-arrow-right"></i>') + '</button>';
        } else if (s.type === 'cta') {
            var labels = s.labels || {};
            var subs = { article: s.article ? (T('Артикул') + ' ' + s.article) : '', channel: s.channel || '', domain: s.name || '' };
            h += bubble(T('Чем закончить ролик?'), '', esc(T('Цель показывается в кадре на финальной карточке. Дальше — план ролика за')) + ' ' + fa(planPrice(), 12)) +
                optionsHtml((s.kinds || []).map(function (k) { return { value: k, label: T(labels[k] || k), hint: subs[k] || '' }; }), 'cta');
        } else if (s.type === 'ctaval') {
            h += bubble(s.title, s.hint) + customHtml(s.placeholder, 'cta-val', s.max || 80, false);
        } else if (s.type === 'blocked') {
            var acts = { pick_operator: T('Другой оператор'), other_country: T('Другая страна'), other_offer: T('Другой оффер'),
                retry_answer: T('Ответить иначе'), retry_cta: T('Другой финал'), enter_operator: T('Указать оператора') };
            h += '<div class="crv-block"><b>' + esc(T('Этот вариант не подходит')) + '</b>' + esc(s.text) + '</div>' +
                (s.actions || []).map(function (a, i) {
                    return '<button class="cp-act ' + (i ? 'crv-ghost' : 'gen') + ' wide" data-act="blk" data-key="' + esc(a) + '">' + esc(acts[a] || a) + '</button>';
                }).join('');
        } else if (s.type === 'plan') {
            h += planHtml(s);
        } else if (s.type === 'editing') {
            h += bubble(T('Что изменить в плане?'), '', esc(T('Одна правка')) + ' — ' + fa(editPrice(), 12) + '. ' + esc(T('Осталось')) + ': ' + (A.editsLeft || 0)) +
                '<textarea class="cp-inp crv-ta" id="crv-rev" rows="3" maxlength="300" placeholder="' + esc(T('Например: короче, упор на цену, без сцены про сборку')) + '"></textarea>' +
                '<button class="cp-act gen wide crv-go" data-act="apply-edit">' + esc(T('Применить')) + ' · ' + fa(editPrice(), 14) + '</button>';
        }
        setView(h);
        var inp = document.getElementById('crv-in');
        if (inp && s.type === 'ctaval') inp.focus();
    }
    function planHtml(s) {
        var p = s.plan || {};
        var scenes = (p.scenes || []).map(function (sc, i) {
            return '<li><i>' + (i + 1) + '</i><span>' + esc(sc.screen || sc.voice || '') + '</span>' + (sc.frame ? '<span class="fr">' + esc(sc.frame) + '</span>' : '') + '</li>';
        }).join('');
        var notes = (p.notes || []).join(' · ');
        var left = s.edits_left != null ? s.edits_left : 0;
        A.editsLeft = left;
        var music = ({ calm: T('спокойно'), upbeat: T('бодро'), drive: T('энергично') })[p.music] || '';
        return '<div class="crv-plan">' +
            '<div class="pt"><b>' + esc(p.title || '') + '</b><span>≈' + esc(p.duration_s || 28) + ' ' + esc(T('с')) + '</span></div>' +
            (p.audience ? '<div class="row"><div class="k">' + esc(T('Для кого')) + '</div><div class="v">' + esc(p.audience) + '</div></div>' : '') +
            '<div class="row"><div class="k">0–2 ' + esc(T('с')) + '</div><div class="v">' + esc((p.hook || {}).screen || '') + '<em>' + esc((p.hook || {}).voice || '') + '</em></div></div>' +
            '<div class="row"><div class="k">' + esc(T('Сцены')) + '</div><div class="v"><ol>' + scenes + '</ol></div></div>' +
            '<div class="row"><div class="k">' + esc(T('Финал')) + '</div><div class="v">' + esc((p.final || {}).screen || '') + '<em>' + esc((p.final || {}).voice || '') + '</em></div></div>' +
            (music ? '<div class="row"><div class="k">' + esc(T('Музыка')) + '</div><div class="v">' + esc(music) + '</div></div>' : '') +
            (notes ? '<div class="notes">' + esc(notes) + '</div>' : '') +
            (s.notice ? '<div class="crv-block sm">' + esc(s.notice) + '</div>' : '') + '</div>' +
            (left > 0 ? '<button class="cp-act crv-ghost wide" data-act="edit">' + esc(T('Поправить план')) + ' · ' + fa(editPrice(), 13) + ' <span class="crv-dim">· ' + esc(T('осталось')) + ' ' + left + '</span></button>'
                : '<div class="cp-note crv-centered">' + esc(T('Правок больше нет — собери ролик или начни заново')) + '</div>') +
            '<div class="crv-sec"><div class="crv-lbl">' + esc(T('Голос')) + '</div>' +
            '<div class="crv-seg" id="crv-seg"><button class="' + (A.gender === 'male' ? 'on' : '') + '" data-act="gender" data-gender="male"><span>' + esc(T('Мужской')) + '</span></button>' +
            '<button class="' + (A.gender === 'female' ? 'on' : '') + '" data-act="gender" data-gender="female"><span>' + esc(T('Женский')) + '</span></button></div>' +
            '<div class="crv-lbl">' + esc(T('Бюджет')) + '</div><div class="crv-tiers" id="crv-tiers">' + tiersHtml() + '</div>' +
            '<button class="cp-act gen wide crv-go" id="crv-go" data-act="build"' + (A.busy ? ' disabled' : '') + '><i class="ti ti-movie"></i> ' + esc(T('Собрать ролик за')) + ' ' + fa(basePrice(), 14) + '</button>' +
            '<div class="cp-note">' + esc(T('Ролик придёт в чат с ботом и появится в списке. Сборка занимает 5–8 минут.')) + '</div></div>';
    }
    function tiersHtml() {
        return '<button class="crv-tier' + (A.tier === 'base' ? ' on' : '') + '" data-act="tier" data-tier="base"><span class="rd"></span>' +
            '<span class="tx"><b>' + esc(T('Базовый')) + '</b><em>' + esc(T('диктор, живой сток, фото карточки')) + '</em></span>' +
            '<span class="pr">' + fa(basePrice(), 14) + '</span></button>' +
            '<button class="crv-tier dis" data-act="tier" data-tier="premium"><span class="rd"></span>' +
            '<span class="tx"><b>' + esc(T('Премиум')) + '</b><em>' + esc(T('живой нейроголос и кадры по сценарию · в ближайшем обновлении')) + '</em></span>' +
            '<span class="pr">' + fa(premiumPrice(), 14) + '</span></button>';
    }

    function pushHistory() {
        if (!A.step || A.step.type === 'blocked' || A.step.type === 'ctaval' || A.step.type === 'editing') return;
        A.history.push({ step: A.step, chips: A.chips.slice(), sub: A.sub ? JSON.parse(JSON.stringify(A.sub)) : null });
        if (A.history.length > 40) A.history.shift();
    }
    function assistBack() {
        if (A.busy) return;
        haptic('light');
        if (A.step && A.step.type === 'editing') { A.step = A.planStep; renderStep(); return; }
        if (A.step && A.step.type === 'ctaval') { A.step = A.ctaStep; renderStep(); return; }
        if (!A.history.length) { showList(); return; }
        var prev = A.history.pop();
        A.step = prev.step; A.chips = prev.chips; A.sub = prev.sub;
        renderStep();
    }
    function waitTexts(kind) {
        if (kind === 'plan') return [T('Собираю план ролика...'), T('Подбираю хук...'), T('Проверяю правила площадок...')];
        if (kind === 'link') return [T('Читаю карточку...'), T('Смотрю фото и характеристики...')];
        if (kind === 'channel') return [T('Читаю канал...'), T('Смотрю посты...')];
        if (kind === 'edit') return [T('Применяю правку...'), T('Пересобираю план...')];
        return [T('Секунду...')];
    }
    function call(patch, wait) {
        if (A.busy) return;
        A.busy = true;
        var body = { lang: lang() };
        if (A.id) body.id = A.id;
        for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) body[k] = patch[k];
        var prevStep = A.step, prevChips = A.chips, prevSub = A.sub;
        if (wait) renderWait(waitTexts(wait));
        apiRequest('/api/v1/creative/assist', { method: 'POST', body: JSON.stringify(body), timeoutMs: 90000 })
            .then(function (r) {
                A.busy = false;
                if (!_open) return;
                if (!r || !r.ok) {
                    A.step = prevStep; A.chips = prevChips; A.sub = prevSub;
                    if (r && r.error === 'not_found') { saveDraftId(null); A = fresh(); showList(); }
                    else renderStep();
                    toast(errText(r, T('Не удалось продолжить')), 'alert-triangle');
                    return;
                }
                if (prevStep) { A.step = prevStep; A.chips = prevChips; A.sub = prevSub; pushHistory(); }
                if (r.id) { A.id = r.id; saveDraftId(r.id); }
                A.channel = r.channel || null;
                A.chips = r.chips || [];
                A.step = r.step;
                A.sub = null;
                if (r.step && r.step.type === 'cta') A.ctaStep = r.step;
                if (r.step && r.step.type === 'plan') A.planStep = r.step;
                renderStep();
            })
            .catch(function (err) {
                A.busy = false;
                if (!_open) return;
                A.step = prevStep; A.chips = prevChips; A.sub = prevSub;
                renderStep();
                toast(apiErrText(err, T('Не удалось продолжить')), 'alert-triangle');
            });
    }
    function draftKey() { return 'crv_draft'; }
    function saveDraftId(id) { try { if (id) localStorage.setItem(draftKey(), JSON.stringify({ id: id, ts: Date.now() })); else localStorage.removeItem(draftKey()); } catch (e) {} }
    function savedDraftId() {
        try {
            var d = JSON.parse(localStorage.getItem(draftKey()) || 'null');
            if (d && d.id && Date.now() - d.ts < 20 * 3600 * 1000) return d.id;
        } catch (e) {}
        return null;
    }
    function startAssist() {
        A = fresh();
        _view = 'assist';
        call({}, 'x');
    }
    function resumeAssist(id) {
        A = fresh();
        A.id = id;
        _view = 'assist';
        call({}, 'x');
    }
    function answer(val) {
        var s = A.step;
        if (!s || s.type !== 'question') return;
        var v = String(val || '').trim();
        if (!v) { toast(errMap().answer_empty, 'alert-triangle'); return; }
        haptic('light');
        var kind = s.input === 'link' ? 'link' : 'x';
        call({ answer: { key: s.key, value: v.slice(0, s.input === 'link' ? 500 : 200) } }, kind);
    }
    function chip(key) {
        if (key === 'vertical') { startAssist(); return; }
        for (var i = A.history.length - 1; i >= 0; i--) {
            var h = A.history[i];
            if (h.step && h.step.type === 'question' && h.step.key === key) {
                A.history = A.history.slice(0, i);
                A.step = h.step; A.chips = h.chips; A.sub = h.sub;
                haptic('light');
                renderStep();
                return;
            }
        }
    }
    function setBusy(on) {
        A.busy = on;
        var go = document.getElementById('crv-go');
        if (!go) return;
        go.disabled = on;
        if (on) go.innerHTML = '<span class="crv-spin sm"></span> ' + esc(T('Запускаю сборку...'));
    }
    function build() {
        if (A.busy || !A.id) return;
        haptic('medium');
        setBusy(true);
        apiRequest('/api/v1/creative/compose', { method: 'POST', body: JSON.stringify({ id: A.id, tier: A.tier, gender: A.gender }), timeoutMs: 90000 })
            .then(function (r) {
                setBusy(false);
                if (!_open) return;
                if (r && r.ok && r.creative) {
                    var c = r.creative;
                    if (_items === null) _items = [];
                    _items = [c].concat(_items.filter(function (x) { return x.id !== c.id; }));
                    saveDraftId(null);
                    A = fresh();
                    showList();
                    toast(T('Сборка началась'), 'movie');
                    load(true);
                } else toast(errText(r, T('Не удалось начать сборку')), 'alert-triangle');
            })
            .catch(function (err) {
                setBusy(false);
                toast(apiErrText(err, T('Не удалось начать сборку')), 'alert-triangle');
            });
    }
    function send(cid) {
        haptic('light');
        toast(T('Отправляю ролик в чат с ботом — придёт через минуту'), 'brand-telegram');
        apiRequest('/api/v1/creative/' + cid + '/send', { method: 'POST' })
            .then(function (r) { if (!r || !r.ok) toast(T('Не удалось отправить ролик'), 'alert-triangle'); })
            .catch(function () { toast(T('Не удалось отправить ролик'), 'alert-triangle'); });
    }
    function remove(id) {
        var go = function () {
            apiRequest('/api/v1/creative/' + id, { method: 'DELETE' }).then(function (r) {
                if (!r || !r.ok) { toast(T(r && r.error === 'in_progress' ? 'Ролик ещё собирается — удалить можно после' : 'Не удалось удалить ролик'), 'alert-triangle'); return; }
                _items = (_items || []).filter(function (c) { return c.id !== id; });
                renderList();
                toast(T('Ролик удалён'), 'trash');
            }).catch(function () { toast(T('Не удалось удалить ролик'), 'alert-triangle'); });
        };
        if (window.confirmDialog) {
            var p = window.confirmDialog(T('Удалить ролик? Файл и запись исчезнут без возврата.'), T('Удалить'));
            if (p && p.then) { p.then(function (ok) { if (ok) go(); }); return; }
        }
        go();
    }
    function variant(cid) {
        haptic('medium');
        apiRequest('/api/v1/creative/variant', { method: 'POST', body: JSON.stringify({ id: cid }) })
            .then(function (r) {
                if (r && r.ok && r.creative) {
                    var c = r.creative;
                    if (_items === null) _items = [];
                    _items = [c].concat(_items.filter(function (x) { return x.id !== c.id; }));
                    toast(r.already ? T('Этот ролик уже собирается') : T('Собираю другой вариант'), 'movie');
                    redrawList();
                    schedulePoll();
                    load(true);
                } else toast(errText(r, T('Не удалось начать сборку')), 'alert-triangle');
            })
            .catch(function (err) { toast(apiErrText(err, T('Не удалось начать сборку')), 'alert-triangle'); });
    }
    function descLines(c) {
        var lines = [];
        if (c.cta_text) lines.push(c.cta_text);
        if (c.credits && c.credits.length) lines.push(T('Видео') + ': ' + c.credits.join(', '));
        if (c.music_credit) lines.push(T('Музыка') + ': ' + c.music_credit);
        return lines;
    }
    function copyDesc(text) {
        var run = (typeof copyText === 'function') ? copyText(text) : Promise.reject();
        Promise.resolve(run).then(function () { toast(T('Описание скопировано'), 'copy'); }).catch(function () { toast(text); });
    }
    function description(cid) {
        var c = (_items || []).filter(function (x) { return x.id === cid; })[0];
        var lines = c ? descLines(c) : [];
        if (lines.length) { copyDesc(lines.join('\n')); return; }
        apiRequest('/api/v1/creative/' + cid)
            .then(function (r) {
                var d = r && r.creative;
                var l = d ? descLines(d) : [];
                if (!l.length) { toast(T('Описание для этого ролика не сформировано'), 'alert-triangle'); return; }
                copyDesc(l.join('\n'));
            })
            .catch(function () { toast(T('Не удалось получить описание'), 'alert-triangle'); });
    }

    function onKey(e) {
        if (e.key !== 'Enter' || !e.target || e.target.id !== 'crv-in') return;
        e.preventDefault();
        var s = A.step;
        if (!s) return;
        if (s.type === 'question') answer(e.target.value);
        else if (s.type === 'ctaval') ctaVal(e.target.value);
    }
    function ctaVal(v) {
        var s = A.step;
        if (!s || s.type !== 'ctaval') return;
        v = String(v || '').trim();
        if (!v) { toast(T('Введи текст'), 'alert-triangle'); return; }
        haptic('light');
        A.step = A.ctaStep;
        call({ cta: { kind: s.kind, text: v.slice(0, s.max || 80) } }, 'plan');
    }
    function onClick(e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
        if (!el) return;
        var act = el.getAttribute('data-act');
        if (act === 'close') { close(); return; }
        if (act === 'back') { onBack(); return; }
        if (act === 'new') { haptic('light'); saveDraftId(null); startAssist(); return; }
        if (act === 'resume') { haptic('light'); resumeAssist(+el.getAttribute('data-id')); return; }
        if (act === 'open') { haptic('light'); openUrl(el.getAttribute('data-url')); return; }
        if (act === 'send') { send(+el.getAttribute('data-id')); return; }
        if (act === 'variant') { variant(+el.getAttribute('data-id')); return; }
        if (act === 'desc') { description(+el.getAttribute('data-id')); return; }
        if (act === 'del') { remove(+el.getAttribute('data-id')); return; }
        if (act === 'chip') { chip(el.getAttribute('data-key')); return; }
        if (act === 'vertical') { haptic('light'); call({ vertical: el.getAttribute('data-val') }, el.getAttribute('data-val') === 'channel' ? 'channel' : 'x'); return; }
        if (act === 'answer') { answer(el.getAttribute('data-val')); return; }
        if (act === 'answer-custom') { var inp = document.getElementById('crv-in'); answer(inp ? inp.value : ''); return; }
        if (act === 'plat') {
            if (el.getAttribute('data-off')) { toast(platName(el.getAttribute('data-plat')) + ': ' + T(el.getAttribute('data-off')), 'alert-triangle'); return; }
            var k = el.getAttribute('data-plat');
            var sel = (A.sub && A.sub.plats) || [];
            var i = sel.indexOf(k);
            if (i >= 0) sel.splice(i, 1); else sel.push(k);
            A.sub = { plats: sel };
            haptic('light');
            renderStep();
            return;
        }
        if (act === 'plats-go') {
            var plats = (A.sub && A.sub.plats) || [];
            if (!plats.length) { toast(errMap().platform_invalid, 'alert-triangle'); return; }
            haptic('light');
            call({ platforms: plats }, 'x');
            return;
        }
        if (act === 'cta') {
            var kind = el.getAttribute('data-val');
            var needName = kind === 'domain' && !(A.step && A.step.name);
            if (kind === 'promo' || kind === 'custom' || needName) {
                haptic('light');
                A.ctaStep = A.step;
                A.step = kind === 'promo'
                    ? { type: 'ctaval', kind: kind, title: T('Какой промокод?'), hint: T('Он появится на финальной карточке крупно и останется до конца ролика'), placeholder: T('Например: START100'), max: 20 }
                    : (needName
                        ? { type: 'ctaval', kind: kind, title: T('Какое название показать в финале?'), hint: T('Бренд, сайт или имя мастера — до 40 символов'), placeholder: T('Например: Ремонт-Сервис, remont.ru'), max: 40 }
                        : { type: 'ctaval', kind: kind, title: T('Что должно быть на финальной карточке?'), hint: T('До 80 символов, покажем дословно'), placeholder: T('Например: Забирай бонус на сайте'), max: 80 });
                renderStep();
                return;
            }
            haptic('light');
            call({ cta: { kind: kind } }, 'plan');
            return;
        }
        if (act === 'cta-val') { var inp2 = document.getElementById('crv-in'); ctaVal(inp2 ? inp2.value : ''); return; }
        if (act === 'blk') {
            var key = el.getAttribute('data-key');
            haptic('light');
            var want = { pick_operator: 'operator', enter_operator: 'operator', other_country: 'geo', other_offer: 'product', retry_answer: null, retry_cta: null }[key];
            if (key === 'retry_cta') { A.step = A.ctaStep; renderStep(); return; }
            for (var j = A.history.length - 1; j >= 0; j--) {
                var hh = A.history[j];
                if (hh.step && hh.step.type === 'question' && (want ? hh.step.key === want : true)) {
                    A.history = A.history.slice(0, j);
                    A.step = hh.step; A.chips = hh.chips; A.sub = hh.sub;
                    renderStep();
                    return;
                }
            }
            assistBack();
            return;
        }
        if (act === 'gender') { A.gender = el.getAttribute('data-gender') === 'female' ? 'female' : 'male'; haptic('light'); renderStep(); return; }
        if (act === 'tier') {
            if (el.getAttribute('data-tier') === 'premium') { toast(errMap().premium_soon, 'info-circle'); return; }
            A.tier = 'base'; haptic('light'); renderStep(); return;
        }
        if (act === 'edit') { haptic('light'); A.planStep = A.step; A.step = { type: 'editing' }; renderStep(); return; }
        if (act === 'apply-edit') {
            var ta = document.getElementById('crv-rev');
            var text = ta ? ta.value.trim() : '';
            if (!text) { toast(T('Напиши, что изменить'), 'alert-triangle'); return; }
            haptic('medium');
            A.step = A.planStep;
            call({ revision: text.slice(0, 300) }, 'edit');
            return;
        }
        if (act === 'build') { build(); return; }
    }

    window.__openCreatives = function () {
        _open = true;
        ensureScreen();
        if (_view === 'assist' && A.step && A.id) { renderStep(); return; }
        renderList();
        load(false);
    };
})();
