(function () {
    'use strict';

    var _channels = null, _chId = null, _emoji = 'few', _length = 'same', _improve = true;
    var _tone = 'channel', _strip = true, _caption = false, _model = null, _limits = null;
    var _lastOriginal = '', _lastResult = '', _lastHooks = [], _lastMeta = null, _busy = false, _tab = 'res';
    var _ctx = null;
    var _avCache = {};

    var TONE_ROWS = [
        ['channel', 'Как в канале', 'Интонация и манера твоих постов: читатель не отличит от родного контента'],
        ['expert', 'Экспертно', 'Сдержанно и по делу: факты, цифры, выводы, без эмоций и кликбейта'],
        ['provocative', 'Провокационно', 'Дерзкий заход и спорный тезис: выжимает реакции и комментарии'],
        ['selling', 'Продажно', 'Выгода читателя с первых строк, аргументы и чёткий призыв в конце']
    ];
    function toneRows() {
        return '<div class="rw-tone" data-seg="tone">' + TONE_ROWS.map(function (o) {
            return '<button type="button" class="rw-tone-row' + (_tone === o[0] ? ' on' : '') + '" data-tone="' + o[0] + '">' +
                '<span class="rd"></span><span class="tx"><b>' + esc(T(o[1])) + '</b><em>' + esc(T(o[2])) + '</em></span></button>';
        }).join('') + '</div>';
    }

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} }
    function toast(m) { try { if (typeof showToast === 'function') return showToast(m); } catch (e) {} try { if (typeof alertDialog === 'function') alertDialog(m); } catch (e) {} }
    function num(n) { try { return new Intl.NumberFormat('ru-RU').format(n); } catch (e) { return String(n); } }

    function ensureScreen() {
        var host = document.getElementById('rewrite-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'rewrite-screen'; host.className = 'rw-screen';
            (document.getElementById('app') || document.body).appendChild(host);
            host.addEventListener('click', onClick);
            host.addEventListener('input', onInput);
        }
        host.style.display = 'flex';
        document.documentElement.classList.add('cs-modal-open');
        document.body.classList.add('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.onClick(close); tg.BackButton.show(); } } catch (e) {}
        return host;
    }
    function close() {
        var host = document.getElementById('rewrite-screen');
        if (host) host.style.display = 'none';
        document.documentElement.classList.remove('cs-modal-open');
        document.body.classList.remove('cs-modal-open');
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.hide(); } } catch (e) {}
    }
    function head() {
        var bal = (_limits && _limits.balance != null)
            ? '<div class="rw-bal" id="rw-bal">' + esc(T('Баланс')) + ': ' + fa(_limits.balance) + '</div>'
            : '';
        return '<div class="rw-head"><button class="rw-back" data-act="close"><i class="ti ti-arrow-left"></i></button>' +
            '<div class="t">' + esc(T('Рерайт чужого поста')) + '</div>' + bal + '</div>';
    }
    function setView(html) { var h = ensureScreen(); h.innerHTML = head() + html; h.scrollTop = 0; return h; }

    function curModel() {
        if (_limits && !_limits.can_choose_model) return _limits.default_model || 'premium';
        return _model || (_limits && _limits.default_model) || 'premium';
    }
    function price() {
        if (!_limits) return null;
        return curModel() === 'premium' ? _limits.price_rewrite_premium : _limits.price_rewrite_standard;
    }
    function priceChip() {
        var p = price();
        return p != null ? ' <span class="price">' + fa(p, 14) + '</span>' : '';
    }

    window.__rwRenderForCheck = function (meta, ctx) {
        ensureScreen();
        _lastMeta = meta; _lastResult = meta.text || ''; _lastOriginal = meta.original || ''; _lastHooks = meta.hooks || []; _tab = 'res';
        _ctx = ctx || null;
        if (!document.getElementById('rw-result')) {
            var h = document.getElementById('rewrite-screen');
            h.insertAdjacentHTML('beforeend', '<div id="rw-result"></div>');
        }
        renderResult();
    };
    window.__openRewrite = function () {
        setView('<div class="rw-center"><div class="rw-spin"></div><div class="m">' + esc(T('Секунду...')) + '</div></div>');
        var chP = apiRequest('/api/v1/channels/active').catch(function () { return null; });
        var limP = apiRequest('/api/v1/post/limits').catch(function () { return null; });
        Promise.all([chP, limP]).then(function (rr) {
            var d = rr[0];
            _channels = (d && d.channels) ? d.channels.filter(function (c) { return c.username; }) : [];
            if (_chId == null && d && d.active_channel_id) _chId = d.active_channel_id;
            if (_chId == null && _channels.length) _chId = _channels[0].id;
            _limits = rr[1] || null;
            renderForm();
        });
    };

    function curChannel() {
        for (var i = 0; i < (_channels || []).length; i++) if (_channels[i].id === _chId) return _channels[i];
        return null;
    }
    function chAv(c) {
        var t = (c && (c.title || c.username)) || '?';
        return esc(String(t).charAt(0).toUpperCase());
    }
    function avAttr(c) {
        return (c && c.has_avatar && c.id != null) ? ' data-rwav="' + c.id + '"' : '';
    }
    function rwLoadAvatars(scope) {
        var root = scope || document.getElementById('rewrite-screen');
        if (!root || !root.querySelectorAll) return;
        var base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';
        var initData = '';
        try { if (typeof state !== 'undefined' && state && state.initData) initData = state.initData; } catch (e) {}
        function fill(id, url) {
            var host = document.getElementById('rewrite-screen');
            if (!host) return;
            host.querySelectorAll('[data-rwav="' + id + '"]').forEach(function (n) {
                n.innerHTML = '<img src="' + url + '" alt="">';
            });
        }
        function attempt(id, tries) {
            _avCache[id] = 'pending';
            fetch(base + '/api/v1/channels/' + id + '/avatar', { headers: { 'X-Telegram-Init-Data': initData } })
                .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
                .then(function (b) { var url = URL.createObjectURL(b); _avCache[id] = url; fill(id, url); })
                .catch(function () {
                    if (tries < 3) setTimeout(function () { attempt(id, tries + 1); }, 1500 * (tries + 1));
                    else _avCache[id] = 'x';
                });
        }
        root.querySelectorAll('[data-rwav]').forEach(function (node) {
            var id = node.getAttribute('data-rwav');
            if (!id) return;
            var v = _avCache[id];
            if (v) { if (v !== 'x' && v !== 'pending') fill(id, v); return; }
            attempt(id, 0);
        });
    }

    function chHead(c) {
        return '<div class="av"' + avAttr(c) + '>' + (c ? chAv(c) : '<i class="ti ti-broadcast"></i>') + '</div>' +
            '<div class="nm"><b>' + esc(c ? (c.title || ('@' + c.username)) : T('Без канала — нейтральный стиль')) + '</b>' +
            '<span>' + esc(c ? ('@' + c.username) : T('подключи канал, чтобы писать в его стиле')) + '</span></div>';
    }
    function chOpt(ch) {
        var sel = ch.id === _chId;
        return '<button type="button" class="rw-chopt' + (sel ? ' sel' : '') + '" data-chid="' + ch.id + '">' +
            '<div class="av"' + avAttr(ch) + '>' + chAv(ch) + '</div><div class="nm"><b>' + esc(ch.title || ('@' + ch.username)) + '</b>' +
            '<span>@' + esc(ch.username) + '</span></div>' +
            '<i class="ti ti-check ck"></i></button>';
    }
    function chOptNone() {
        var sel = _chId == null;
        return '<button type="button" class="rw-chopt' + (sel ? ' sel' : '') + '" data-chid="0">' +
            '<div class="av"><i class="ti ti-ban"></i></div><div class="nm"><b>' + esc(T('Без канала — нейтральный стиль')) + '</b>' +
            '<span>' + esc(T('чистый нейтральный текст')) + '</span></div>' +
            '<i class="ti ti-check ck"></i></button>';
    }

    function seg(name, val, opts, extra) {
        return '<div class="rw-seg' + (extra || '') + '" data-seg="' + name + '">' + opts.map(function (o) {
            return '<button data-v="' + o[0] + '" class="' + (val === o[0] ? 'on' : '') + '">' + esc(T(o[1])) +
                (o[2] ? '<small>' + (o[3] === 'html' ? o[2] : esc(o[2])) + '</small>' : '') + '</button>';
        }).join('') + '</div>';
    }

    function fa(n, s) {
        if (typeof window.forgeAmount === 'function') return window.forgeAmount(n, s || 12);
        return esc(num(n)) + ' Forge';
    }

    function modelBlock() {
        if (!_limits || !_limits.can_choose_model) return '';
        var pp = _limits.price_rewrite_premium, ps = _limits.price_rewrite_standard;
        return '<div class="rw-lbl">' + esc(T('Модель')) + '</div>' +
            seg('model', curModel(), [
                ['premium', 'Премиум', esc(T('точнее')) + ' · ' + fa(pp, 11), 'html'],
                ['standard', 'Стандарт', esc(T('быстрее')) + ' · ' + fa(ps, 11), 'html'],
            ]);
    }

    function tgl(act, on, title, sub, dis) {
        return '<div class="rw-tgl' + (on ? ' on' : '') + (dis ? ' dis' : '') + '" data-act="' + act + '"><div class="sw"></div>' +
            '<div class="tx"><b>' + esc(T(title)) + '</b><span>' + esc(T(sub)) + '</span></div></div>';
    }

    function renderForm() {
        var c = curChannel();
        var chBlock = _channels && _channels.length
            ? '<div class="rw-chdd"><button type="button" class="rw-ch" data-act="chtoggle" id="rw-chhead">' + chHead(c) +
              '<i class="ti ti-chevron-down chev"></i></button>' +
              '<div class="rw-chlist" id="rw-chlist">' +
              _channels.map(function (ch) { return chOpt(ch); }).join('') +
              chOptNone() + '</div></div>'
            : '<div class="rw-hint">' + esc(T('Канал не подключён — перепишу в чистом нейтральном стиле. Подключи канал в приложении, чтобы писать точно в его стиле.')) + '</div>';

        setView(
            '<div class="rw-sec"><div class="rw-eyebrow"><span class="tile"><i class="ti ti-clipboard-text"></i></span> ' + esc(T('Исходный пост')) + '</div>' +
            '<textarea class="rw-ta" id="rw-input" maxlength="8000" placeholder="' + esc(T('Вставь текст чужого поста или ссылку t.me/канал/123 — я сам вытащу пост')) + '"></textarea>' +
            '<div class="rw-tafoot"><div class="rw-link-note" id="rw-linknote"><i class="ti ti-link"></i> ' + esc(T('Похоже на ссылку — вытащу текст поста сам при переписывании')) + '</div>' +
            '<div class="rw-count" id="rw-count">0 / 8 000</div></div>' +
            '<div class="rw-hint">' + esc(T('Факты сохраню, слова и подача будут оригинальные — не копия, бан за плагиат не грозит.')) + '</div></div>' +

            '<div class="rw-sec"><div class="rw-eyebrow"><span class="tile"><i class="ti ti-adjustments"></i></span> ' + esc(T('Подача')) + '</div>' +
            '<div class="rw-lbl">' + esc(T('В стиле канала')) + '</div>' + chBlock +
            '<div class="rw-lbl">' + esc(T('Эмодзи')) + '</div>' + seg('emoji', _emoji, [['none', 'Без'], ['few', 'Умеренно'], ['many', 'Живо']]) +
            '<div class="rw-lbl">' + esc(T('Длина')) + '</div>' + seg('length', _length, [['shorter', 'Короче'], ['same', 'Так же'], ['longer', 'Длиннее']], _caption ? ' dis' : '') +
            '<div class="rw-disnote" id="rw-lennote" style="display:' + (_caption ? 'block' : 'none') + ';">' + esc(T('Выключено: длину задаёт «Уложиться в подпись к фото»')) + '</div>' +
            '<div class="rw-lbl">' + esc(T('Тон')) + '</div>' + toneRows() +
            modelBlock() +
            tgl('improve', _improve, 'Усилить пост', 'цепляющий хук, без воды, призыв в конце, формат под Telegram — версия соберёт не хуже') +
            tgl('strip', _strip, 'Вычистить чужие ссылки и @упоминания', 'чужие каналы, приглашения и призывы из оригинала не попадут в твой пост') +
            tgl('caption', _caption, 'Уложиться в подпись к фото', 'не длиннее 1 024 символов — влезет под картинку без обрезания') +
            '</div>' +

            '<button class="rw-go" data-act="go">' + esc(T('Переписать в моём стиле')) + priceChip() + '</button>' +
            '<div class="rw-gonote">' + esc(T('Спишется при переписывании · при сбое вернём автоматически')) + '</div>' +
            '<div id="rw-result"></div>');
        rwLoadAvatars();
    }

    function onInput(ev) {
        if (ev.target && ev.target.id === 'rw-input') {
            var v = ev.target.value || '';
            var note = document.getElementById('rw-linknote');
            var looksLink = /t\.me\/[^\s]+/.test(v) && v.trim().length < 200;
            if (note) note.classList.toggle('on', looksLink);
            var cnt = document.getElementById('rw-count');
            if (cnt) cnt.textContent = num(v.length) + ' / 8 000';
        }
    }

    function setBalance(b) {
        if (_limits && b != null) {
            _limits.balance = b;
            var el = document.getElementById('rw-bal');
            if (el) el.innerHTML = esc(T('Баланс')) + ': ' + fa(b);
        }
    }

    function go(variant) {
        if (_busy) return;
        var inp = document.getElementById('rw-input');
        var val = inp ? (inp.value || '').trim() : (variant ? _lastOriginal : '');
        if (!variant && val.length < 20 && !/t\.me\//.test(val)) { toast(T('Вставь текст поста (хотя бы пару предложений) или ссылку t.me')); return; }
        _busy = true; haptic('medium');
        var isLink = /^https?:\/\/t\.me\/\S+$/.test(val) || (/t\.me\//.test(val) && val.length < 200);
        var body = {
            channel_id: _chId, use_channel_style: !!curChannel(),
            emoji: _emoji, length_mode: _length, improve: _improve, variant: !!variant,
            tone: _tone, strip_mentions: _strip, caption_limit: _caption,
        };
        if (_limits && _limits.can_choose_model) body.model = curModel();
        if (variant) { body.original_text = _lastOriginal; }
        else if (isLink) { body.url = val; }
        else { body.original_text = val; }

        var res = document.getElementById('rw-result');
        var goBtn = document.querySelector('#rewrite-screen [data-act="go"]');
        if (goBtn) goBtn.disabled = true;
        if (res) res.innerHTML = '<div class="rw-sec"><div class="rw-center" style="padding:26px 10px;"><div class="rw-spin"></div><div class="m">' + esc(T('Переписываю в стиле твоего канала...')) + '</div></div></div>';

        apiRequest('/api/v1/post/rewrite', { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                _busy = false; if (goBtn) goBtn.disabled = false;
                if (!r || !r.text) { if (res) res.innerHTML = ''; toast((r && r.detail) || T('Не получилось переписать — попробуй ещё раз')); return; }
                _lastOriginal = r.original || _lastOriginal || val;
                _lastResult = r.text; _tab = 'res';
                _lastHooks = r.hooks || [];
                _lastMeta = r;
                _ctx = { currentPostId: r.post_id || null, media: null, mediaBusy: '', placeInfo: null, placed: null, onPlaced: renderResult };
                setBalance(r.balance);
                renderResult();
                if (_ctx.currentPostId && r.channel && window.FMPostTools) window.FMPostTools.loadPlaceInfo(_ctx);
            })
            .catch(function (e) {
                _busy = false; if (goBtn) goBtn.disabled = false;
                if (res) res.innerHTML = '';
                var msg = (e && e.message) ? e.message : T('Не получилось переписать — попробуй ещё раз');
                toast(msg);
            });
    }

    function renderResult() {
        var res = document.getElementById('rw-result');
        if (!res) return;
        var r = _lastMeta || {};
        var body = _tab === 'orig' ? _lastOriginal : _lastResult;
        var badges = '';
        if (r.originality != null) {
            badges += '<span class="rw-badge ok"><i class="ti ti-checks"></i> ' + esc(T('Оригинальность')) + ' ' + r.originality + '%</span>';
        }
        if (r.chars != null) {
            badges += '<span class="rw-badge mut">' + num(r.chars) + ' ' + esc(T('символов')) +
                (_caption || r.chars <= 1024 ? ' · ' + esc(T(r.chars <= 1024 ? 'влезет под фото' : 'не влезет под фото')) : '') + '</span>';
        }
        var hooks = '';
        if (_lastHooks && _lastHooks.length) {
            hooks = '<div class="rw-lbl" style="margin-top:12px;">' + esc(T('Хуки на сплит-тест')) + ' · ' + esc(T('идут вместе с результатом')) + '</div>' +
                '<div class="rw-hooks">' + _lastHooks.map(function (h, i) {
                    return '<div class="rw-hook" data-act="hookcopy" data-i="' + i + '"><span>' + esc(h) + '</span><i class="ti ti-copy"></i></div>';
                }).join('') + '</div>';
        }
        res.innerHTML =
            '<div class="rw-sec"><div class="rw-eyebrow"><span class="tile"><i class="ti ti-sparkles"></i></span> ' +
            esc(T('Твоя версия')) + (r.channel ? ' · ' + esc('@' + r.channel.username) : '') + '</div>' +
            (badges ? '<div class="rw-badges">' + badges + '</div>' : '') +
            '<div class="rw-restabs"><button class="' + (_tab === 'res' ? 'on' : '') + '" data-tab="res">' + esc(T('Результат')) + '</button>' +
            '<button class="' + (_tab === 'orig' ? 'on' : '') + '" data-tab="orig">' + esc(T('Оригинал')) + '</button></div>' +
            '<div class="rw-out' + (_tab === 'orig' ? ' orig' : '') + '" id="rw-out">' + esc(body) + '</div>' +
            hooks +
            (_ctx && _ctx.currentPostId ? '<div class="rw-lbl" style="margin-top:12px;">' + esc(T('Обложка')) + '</div><div id="rw-cover"></div>' : '') +
            '<div class="rw-lbl" style="margin-top:12px;">' + esc(T('Что сделать с постом')) + '</div>' +
            '<div class="rs-acts">' +
            actRow('copy', 'ti-copy', 'Скопировать', T('Текст в буфер обмена — для ручной публикации'), '', false, '') +
            actRow('toplan', 'ti-calendar-plus', 'В контент-план', planHint(), 'g' + (_ctx && _ctx.placed ? ' done' : ''), actLocked(), '') +
            actRow('pubnow', 'ti-send', 'Опубликовать сейчас', sendHint(), 'w', actLocked(), '') +
            actRow('more', 'ti-refresh', 'Ещё вариант', T('Переписать заново, другая подача'), '', false, price() != null ? fa(price()) : '') +
            '</div>' +
            (r.model_used ? '<div class="rw-modelnote">' + esc(T('Модель')) + ': ' + esc(r.model_used) + (r.style_applied ? ' · ' + esc(T('в стиле канала')) : '') + '</div>' : '') +
            '</div>';
        var cov = document.getElementById('rw-cover');
        if (cov && window.FMPostTools) { window.FMPostTools.coverRender(cov, _ctx); window.FMPostTools.coverBind(cov, _ctx); }
        try { res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }

    function actLocked() {
        var r = _lastMeta || {};
        return !(r.channel && _ctx && _ctx.currentPostId);
    }
    function actRow(act, icon, title, hint, cls, locked, val) {
        return '<button class="rs-row' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (locked ? ' data-locked="true"' : '') + '>' +
            '<span class="ic"><i class="ti ' + icon + '"></i></span>' +
            '<span class="tx"><b>' + esc(T(title)) + '</b><em>' + esc(hint) + '</em></span>' +
            (val ? '<span class="val">' + val + '</span>' : '') +
            '<i class="ti ti-chevron-right ch"></i></button>';
    }
    function planHint() {
        var p = _ctx && _ctx.placed;
        if (p && window.FMPostTools) {
            return T('В плане:') + ' ' + window.FMPostTools.dateLabel(p.date_iso, true) + ' ' + p.hm + ' · ' + T(p.queued ? 'выйдет сам' : 'черновик');
        }
        return T('Выбрать день и время — пост встанет в неделю и выйдет сам');
    }
    function sendHint() {
        var r = _lastMeta || {};
        var where = r.channel && r.channel.username ? '@' + r.channel.username : T('подключённый канал');
        return T('Бот выложит в') + ' ' + where + ' ' + T('в течение минуты. Перед отправкой спросит подтверждение');
    }

    function onClick(ev) {
        var t = ev.target;
        var segBtn = t.closest ? t.closest('.rw-seg button') : null;
        if (segBtn) {
            var box = segBtn.parentElement, name = box.getAttribute('data-seg'), v = segBtn.getAttribute('data-v');
            if (name === 'length' && box.classList.contains('dis')) return;
            if (name === 'emoji') _emoji = v;
            else if (name === 'length') _length = v;
            else if (name === 'model') { _model = v; var goB = document.querySelector('#rewrite-screen .rw-go'); if (goB) goB.innerHTML = esc(T('Переписать в моём стиле')) + priceChip(); }
            box.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === segBtn); });
            haptic('light'); return;
        }
        var toneBtn = t.closest ? t.closest('[data-tone]') : null;
        if (toneBtn) {
            _tone = toneBtn.getAttribute('data-tone');
            toneBtn.parentElement.querySelectorAll('.rw-tone-row').forEach(function (b) { b.classList.toggle('on', b === toneBtn); });
            haptic('light'); return;
        }
        var opt = t.closest ? t.closest('.rw-chopt') : null;
        if (opt) {
            var cid = +opt.getAttribute('data-chid');
            _chId = cid > 0 ? cid : null;
            haptic('light');
            var hd = document.getElementById('rw-chhead');
            if (hd) { hd.innerHTML = chHead(curChannel()) + '<i class="ti ti-chevron-down chev"></i>'; rwLoadAvatars(hd); }
            var list = document.getElementById('rw-chlist');
            if (list) {
                list.querySelectorAll('.rw-chopt').forEach(function (o) {
                    o.classList.toggle('sel', +o.getAttribute('data-chid') === (cid || 0) || (cid === 0 && o.getAttribute('data-chid') === '0'));
                });
                var dd = list.closest('.rw-chdd');
                if (dd) dd.classList.remove('open');
            }
            return;
        }
        var tab = t.closest ? t.closest('[data-tab]') : null;
        if (tab) { _tab = tab.getAttribute('data-tab'); haptic('light'); renderResult(); return; }
        var actEl = t.closest ? t.closest('[data-act]') : null;
        if (!actEl) return;
        var act = actEl.getAttribute('data-act');
        if (act === 'close') { haptic('light'); close(); return; }
        if (act === 'chtoggle') { var dd2 = actEl.closest('.rw-chdd'); if (dd2) dd2.classList.toggle('open'); haptic('light'); return; }
        if (act === 'improve') { _improve = !_improve; actEl.classList.toggle('on', _improve); haptic('light'); return; }
        if (act === 'strip') { _strip = !_strip; actEl.classList.toggle('on', _strip); haptic('light'); return; }
        if (act === 'caption') {
            _caption = !_caption;
            actEl.classList.toggle('on', _caption);
            var lenSeg = document.querySelector('#rewrite-screen .rw-seg[data-seg="length"]');
            if (lenSeg) lenSeg.classList.toggle('dis', _caption);
            var ln = document.getElementById('rw-lennote');
            if (ln) ln.style.display = _caption ? 'block' : 'none';
            haptic('light'); return;
        }
        if (act === 'go') { go(false); return; }
        if (act === 'more') { go(true); return; }
        if (act === 'toplan') {
            if (actLocked()) { toast(T('Сначала подключи канал — публиковать некуда')); return; }
            if (_ctx.placed && window.FMPostTools) { toast(T('Пост уже в плане:') + ' ' + window.FMPostTools.dateLabel(_ctx.placed.date_iso, true) + ' ' + _ctx.placed.hm); return; }
            if (window.FMPostTools) window.FMPostTools.planSheet(_ctx);
            return;
        }
        if (act === 'pubnow') {
            if (actLocked()) { toast(T('Сначала подключи канал — публиковать некуда')); return; }
            if (window.FMPostTools) window.FMPostTools.publishNow(_ctx);
            return;
        }
        if (act === 'hookcopy') {
            var hi = parseInt(actEl.getAttribute('data-i'), 10);
            var hv = _lastHooks[hi];
            if (!hv) return;
            haptic('medium');
            var hr = (typeof copyText === 'function') ? copyText(hv) : Promise.reject();
            Promise.resolve(hr).then(function () { toast(T('Хук скопирован')); }).catch(function () {});
            return;
        }
        if (act === 'copy') {
            haptic('medium');
            var run = (typeof copyText === 'function') ? copyText(_tab === 'orig' ? _lastOriginal : _lastResult) : Promise.reject();
            Promise.resolve(run).then(function () { toast(T('Текст скопирован')); }).catch(function () {});
            return;
        }
    }
})();
