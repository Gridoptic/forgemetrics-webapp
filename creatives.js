(function () {
    'use strict';

    var T = function (s) { return (typeof window.t === 'function') ? window.t(s) : s; };
    var PREMIUM_PRICE = 200;
    var MAX_PLATFORMS = 3;
    var POLL_MS = 15000;

    var _open = false;
    var _view = 'list';
    var _items = null;
    var _loading = false;
    var _pollTimer = null;
    var _channels = null;
    var _chId = null;
    var _source = '';
    var _platforms = null;
    var _tier = 'base';
    var _gender = 'male';
    var _busy = false;

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
    function basePrice() {
        try {
            var p = (typeof state !== 'undefined' && state && state.dashboard && state.dashboard.forge_prices) || null;
            if (Array.isArray(p)) {
                for (var i = 0; i < p.length; i++) if (p[i] && p[i].key === 'creative_build' && p[i].price) return p[i].price;
            }
        } catch (e) {}
        return 70;
    }
    function price() { return _tier === 'premium' ? PREMIUM_PRICE : basePrice(); }
    function fmtDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
    }
    function kindName(k) {
        return ({ product: T('товар'), channel: T('канал'), post: T('пост'), site: T('сайт'), topic: T('тема') })[k] || '';
    }
    function platName(k) {
        return ({ telegram: 'Telegram', vk: T('VK Клипы'), shorts: 'YouTube Shorts', dzen: T('Дзен'),
            tiktok: 'TikTok, Reels', plain: T('просто ролик') })[k] || k;
    }
    function plats() {
        return [
            ['telegram', 'Telegram', 'ti-brand-telegram', T('канал в кадре, ссылка в закрепе')],
            ['vk', T('VK Клипы'), 'ti-brand-vk', T('товар: ссылка в описании')],
            ['shorts', 'YouTube Shorts', 'ti-brand-youtube', T('товар: закреплённый комментарий')],
            ['dzen', T('Дзен'), 'ti-letter-d', T('товар: ссылка в описании')],
            ['tiktok', 'TikTok, Reels', 'ti-brand-tiktok', T('товар: ссылка в профиле')],
            ['plain', T('Просто ролик'), 'ti-movie', T('без призыва')],
        ];
    }
    function hasChannels() { return !!(_channels && _channels.length); }
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
            host.addEventListener('input', onInput);
        }
        if (!_open) return host;
        host.style.display = 'flex';
        document.documentElement.classList.add('cs-modal-open');
        document.body.classList.add('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(onBack); tg.BackButton.onClick(onBack); tg.BackButton.show(); } } catch (e) {}
        return host;
    }
    function onBack() {
        if (_view === 'form') showList();
        else close();
    }
    function close() {
        _open = false;
        stopPoll();
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
        if (!_open || !hasActive()) return;
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
        if (c.status === 'ready' && (c.url || c.in_telegram)) {
            var out = '';
            out += '<button class="cp-act" data-act="send" data-id="' + c.id + '"><i class="ti ti-brand-telegram"></i><span>' + esc(T('Отправить в Telegram')) + '</span></button>';
            if (c.url) out += '<button class="cp-act ok" data-act="open" data-url="' + esc(c.url) + '"><i class="ti ti-download"></i><span>' + esc(T('Скачать MP4')) + '</span></button>';
            out += '<button class="cp-act" data-act="variant" data-id="' + c.id + '"><i class="ti ti-refresh"></i><span>' + esc(T('Другой вариант')) + '</span> ' + fa(basePrice(), 12) + '</button>';
            out += '<button class="cp-act crv-del" data-act="del" data-id="' + c.id + '"><i class="ti ti-trash"></i><span>' + esc(T('Удалить')) + '</span></button>';
            out += '<button class="cp-act" data-act="desc" data-id="' + c.id + '"><i class="ti ti-copy"></i><span>' + esc(T('Текст для описания')) + '</span></button>';
            return out;
        }
        var del = '<button class="cp-act crv-del" data-act="del" data-id="' + c.id + '"><i class="ti ti-trash"></i><span>' + esc(T('Удалить')) + '</span></button>';
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
                esc(T('Роликов пока нет. Собери первый — по ссылке на товар, канал, пост или по теме.')) + '</div></div>';
        }
        return '<div class="crv-list">' + _items.map(itemHtml).join('') + '</div>';
    }
    function renderList() {
        _view = 'list';
        setView(headHtml(T('Креативы'), 'close') +
            '<div class="crv-sub">' + esc(T('Готовые ролики и сборка новых')) + '</div>' +
            '<button class="cp-act gen wide" data-act="new"><i class="ti ti-plus"></i> ' + esc(T('Новый ролик')) + '</button>' +
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
    function loadChannels() {
        return apiRequest('/api/v1/channels/active').then(function (cd) {
            _channels = (cd && cd.channels) || [];
            if (_chId == null && cd && cd.active_channel_id) _chId = cd.active_channel_id;
            if (_chId == null && _channels.length) _chId = _channels[0].id;
            if (_platforms === null) _platforms = _channels.length ? ['telegram'] : [];
        }).catch(function () {
            if (_channels === null) _channels = [];
            if (_platforms === null) _platforms = [];
        });
    }

    function tilesHtml() {
        return plats().map(function (p) {
            var off = p[0] === 'telegram' && !hasChannels();
            var sub = off ? T('Подключи канал к боту') : p[3];
            var on = _platforms.indexOf(p[0]) >= 0;
            return '<button class="crv-tile' + (on ? ' on' : '') + (off ? ' off' : '') + '" data-act="plat" data-plat="' + p[0] + '">' +
                '<i class="ti ' + p[2] + '"></i><b>' + esc(p[1]) + '</b><em>' + esc(sub) + '</em></button>';
        }).join('');
    }
    function chansHtml() {
        if (!(_channels && _channels.length > 1 && _platforms.indexOf('telegram') >= 0)) return '';
        return '<div class="crv-lbl">' + esc(T('Канал для ролика')) + '</div><div class="cp-chips">' +
            _channels.map(function (ch) {
                return '<button class="cp-chip' + (ch.id === _chId ? ' on' : '') + '" data-act="chan" data-id="' + ch.id + '">' +
                    esc(ch.title || ('@' + (ch.username || ch.id))) + '</button>';
            }).join('') + '</div>';
    }
    function tiersHtml() {
        return '<button class="crv-tier' + (_tier === 'base' ? ' on' : '') + '" data-act="tier" data-tier="base"><span class="rd"></span>' +
            '<span class="tx"><b>' + esc(T('Базовый')) + '</b><em>' + esc(T('диктор, живой сток, фото карточки')) + '</em></span>' +
            '<span class="pr">' + fa(basePrice(), 14) + '</span></button>' +
            '<button class="crv-tier' + (_tier === 'premium' ? ' on' : '') + '" data-act="tier" data-tier="premium"><span class="rd"></span>' +
            '<span class="tx"><b>' + esc(T('Премиум')) + '</b><em>' + esc(T('живой нейроголос и кадры по сценарию')) + '</em></span>' +
            '<span class="pr">' + fa(PREMIUM_PRICE, 14) + '</span></button>';
    }
    function goLabel() {
        return '<i class="ti ti-movie"></i> ' + esc(T('Собрать ролик за')) + ' ' + fa(price(), 14);
    }
    function renderForm() {
        _view = 'form';
        if (_platforms === null) _platforms = hasChannels() ? ['telegram'] : [];
        setView(headHtml(T('Новый ролик'), 'back') +
            '<div class="crv-sec"><div class="crv-lbl">' + esc(T('Что рекламируем')) + '</div>' +
            '<textarea class="cp-inp crv-ta" id="crv-src" rows="2" maxlength="500" placeholder="' +
            esc(T('Ссылка на товар, канал или пост — либо тема своими словами')) + '">' + esc(_source) + '</textarea>' +
            '<div class="cp-note">' + esc(T('Wildberries, Ozon, AliExpress, t.me/канал, t.me/канал/пост, сайт или просто текст')) + '</div>' +
            '<button class="crv-link" data-act="upload"><i class="ti ti-photo-plus"></i>' + esc(T('Добавить свои фото или видео')) + '</button></div>' +
            '<div class="crv-sec"><div class="crv-lbl">' + esc(T('Под какие площадки нужны ролики')) + '</div>' +
            '<div class="crv-grid" id="crv-plats">' + tilesHtml() + '</div>' +
            '<div class="crv-chans" id="crv-chans">' + chansHtml() + '</div></div>' +
            '<div class="crv-sec"><div class="crv-lbl">' + esc(T('Бюджет')) + '</div>' +
            '<div class="crv-tiers" id="crv-tiers">' + tiersHtml() + '</div>' +
            '<div class="crv-seg" id="crv-seg">' +
            '<button class="' + (_gender === 'male' ? 'on' : '') + '" data-act="gender" data-gender="male"><span>' + esc(T('Мужской голос')) + '</span></button>' +
            '<button class="' + (_gender === 'female' ? 'on' : '') + '" data-act="gender" data-gender="female"><span>' + esc(T('Женский голос')) + '</span></button></div>' +
            '<button class="cp-act gen wide crv-go" id="crv-go" data-act="compose"' + (_busy ? ' disabled' : '') + '>' + goLabel() + '</button>' +
            '<div class="cp-note">' + esc(T('Ролик придёт в чат с ботом и появится в списке. Сборка занимает 5–8 минут.')) + '</div></div>');
    }
    function syncPlats() {
        var g = document.getElementById('crv-plats');
        if (g) g.innerHTML = tilesHtml();
        var c = document.getElementById('crv-chans');
        if (c) c.innerHTML = chansHtml();
    }
    function syncTier() {
        var t = document.getElementById('crv-tiers');
        if (t) t.innerHTML = tiersHtml();
        var s = document.getElementById('crv-seg');
        if (s) Array.prototype.forEach.call(s.querySelectorAll('[data-gender]'), function (b) {
            b.classList.toggle('on', b.getAttribute('data-gender') === _gender);
        });
        var go = document.getElementById('crv-go');
        if (go && !_busy) go.innerHTML = goLabel();
    }
    function togglePlat(key) {
        if (key === 'telegram' && !hasChannels()) { toast(T('Сначала подключи канал к боту'), 'alert-triangle'); return; }
        var i = _platforms.indexOf(key);
        if (i >= 0) _platforms.splice(i, 1);
        else if (_platforms.length >= MAX_PLATFORMS) { toast(T('Не более трёх площадок за одну сборку'), 'alert-triangle'); return; }
        else _platforms.push(key);
        haptic('light');
        syncPlats();
    }

    var ERR = {
        source_empty: 'Вставь ссылку или опиши тему',
        source_short: 'Опиши тему подробнее',
        source_unsupported: 'Ozon и AliExpress подключим позже, пока Wildberries',
        source_private: 'Закрытая ссылка Telegram не читается — вставь публичную',
        source_unreadable: 'Не удалось прочитать источник — опиши тему словами',
        channel_required: 'Для Telegram подключи канал к боту',
        product_not_found: 'Товар не найден',
        product_limit: 'Лимит проверок товаров на сегодня исчерпан',
        premium_soon: 'Премиум подключим в ближайшем обновлении',
    };
    function composeErr(r) {
        if (r && r.error === 'daily_limit' && r.message) return r.message;
        if (r && r.error && ERR[r.error]) return T(ERR[r.error]);
        return T('Не удалось начать сборку');
    }
    function setBusy(on) {
        _busy = on;
        var go = document.getElementById('crv-go');
        if (!go) return;
        go.disabled = on;
        go.innerHTML = on ? '<span class="crv-spin sm"></span> ' + esc(T('Запускаю сборку...')) : goLabel();
    }
    function compose() {
        if (_busy) return;
        var src = (_source || '').trim();
        if (!src) { toast(T(ERR.source_empty), 'alert-triangle'); return; }
        if (!_platforms.length) { toast(T('Выбери хотя бы одну площадку'), 'alert-triangle'); return; }
        haptic('medium');
        setBusy(true);
        var body = { source: src.slice(0, 500), platforms: _platforms.slice(0, MAX_PLATFORMS), tier: _tier, gender: _gender, lang: lang() };
        if (_platforms.indexOf('telegram') >= 0 && _chId) body.channel_id = _chId;
        apiRequest('/api/v1/creative/compose', { method: 'POST', body: JSON.stringify(body), timeoutMs: 90000 })
            .then(function (r) {
                setBusy(false);
                if (!_open) return;
                if (r && r.ok && r.creative) {
                    var c = r.creative;
                    c.source_kind = c.source_kind || r.kind || null;
                    c.platforms = c.platforms && c.platforms.length ? c.platforms : body.platforms.slice();
                    c.tier = c.tier || _tier;
                    if (_items === null) _items = [];
                    _items = [c].concat(_items.filter(function (x) { return x.id !== c.id; }));
                    _source = '';
                    showList();
                    toast(T('Сборка началась'), 'movie');
                    load(true);
                } else toast(composeErr(r), 'alert-triangle');
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
                    var src = (_items || []).filter(function (x) { return x.id === cid; })[0];
                    var c = r.creative;
                    if (src) {
                        c.source_kind = c.source_kind || src.source_kind;
                        c.platforms = c.platforms && c.platforms.length ? c.platforms : (src.platforms || []);
                        c.tier = c.tier || src.tier;
                    }
                    if (_items === null) _items = [];
                    _items = [c].concat(_items.filter(function (x) { return x.id !== c.id; }));
                    toast(r.already ? T('Этот ролик уже собирается') : T('Собираю другой вариант'), 'movie');
                    redrawList();
                    schedulePoll();
                    load(true);
                } else toast(composeErr(r), 'alert-triangle');
            })
            .catch(function (err) { toast(apiErrText(err, T('Не удалось начать сборку')), 'alert-triangle'); });
    }
    function descLines(c) {
        var lines = [];
        if (c.cta_text) lines.push(c.cta_text);
        if (c.credits && c.credits.length) lines.push(T('Видео') + ': Pexels — ' + c.credits.join(', '));
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

    function onInput(e) {
        var t = e.target;
        if (t && t.id === 'crv-src') _source = t.value || '';
    }
    function onClick(e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
        if (!el) return;
        var act = el.getAttribute('data-act');
        if (act === 'close') { close(); return; }
        if (act === 'back') { haptic('light'); showList(); return; }
        if (act === 'new') {
            haptic('light');
            if (_channels === null) loadChannels().then(function () { if (_open) renderForm(); });
            else renderForm();
            return;
        }
        if (act === 'open') { haptic('light'); openUrl(el.getAttribute('data-url')); return; }
        if (act === 'send') { send(+el.getAttribute('data-id')); return; }
        if (act === 'variant') { variant(+el.getAttribute('data-id')); return; }
        if (act === 'desc') { description(+el.getAttribute('data-id')); return; }
        if (act === 'del') { remove(+el.getAttribute('data-id')); return; }
        if (act === 'upload') { toast(T('Скоро: загрузка своих файлов'), 'photo-plus'); return; }
        if (act === 'plat') { togglePlat(el.getAttribute('data-plat')); return; }
        if (act === 'chan') { _chId = +el.getAttribute('data-id'); haptic('light'); syncPlats(); return; }
        if (act === 'tier') { _tier = el.getAttribute('data-tier') === 'premium' ? 'premium' : 'base'; haptic('light'); syncTier(); return; }
        if (act === 'gender') { _gender = el.getAttribute('data-gender') === 'female' ? 'female' : 'male'; haptic('light'); syncTier(); return; }
        if (act === 'compose') { compose(); return; }
    }

    window.__openCreatives = function () {
        _open = true;
        _busy = false;
        ensureScreen();
        renderList();
        load(false);
        if (_channels === null) loadChannels();
    };
})();
