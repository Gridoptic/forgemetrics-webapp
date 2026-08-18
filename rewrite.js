(function () {
    'use strict';

    var _channels = null, _chId = null, _emoji = 'few', _length = 'same', _improve = true;
    var _tone = 'channel', _strip = true, _caption = false, _model = null, _limits = null;
    var _lastOriginal = '', _lastResult = '', _lastHooks = [], _lastMeta = null, _busy = false, _tab = 'res';
    var _avCache = {};

    var TONE_OPTS = [['channel', 'Как в канале'], ['expert', 'Экспертно'], ['provocative', 'Провокационно'], ['selling', 'Продажно']];
    var TONE_HINTS = {
        channel: 'Как в канале — интонация и манера твоих постов: читатель не отличит от родного контента.',
        expert: 'Экспертно — сдержанно и по делу: факты, цифры, выводы, без эмоций и кликбейта.',
        provocative: 'Провокационно — дерзкий заход и спорный тезис: выжимает реакции и комментарии.',
        selling: 'Продажно — выгода читателя с первых строк, аргументы и чёткий призыв в конце.'
    };

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
            ? '<div class="rw-bal" id="rw-bal">' + esc(T('Баланс')) + ': <b>' + num(_limits.balance) + '</b> Forge</div>'
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
        return p != null ? ' <span class="price">' + num(p) + ' Forge</span>' : '';
    }

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
                (o[2] ? '<small>' + esc(o[2]) + '</small>' : '') + '</button>';
        }).join('') + '</div>';
    }

    function modelBlock() {
        if (!_limits || !_limits.can_choose_model) return '';
        var pp = _limits.price_rewrite_premium, ps = _limits.price_rewrite_standard;
        return '<div class="rw-lbl">' + esc(T('Модель')) + '</div>' +
            seg('model', curModel(), [
                ['premium', 'Премиум', T('точнее') + ' · ' + num(pp) + ' Forge'],
                ['standard', 'Стандарт', T('быстрее') + ' · ' + num(ps) + ' Forge'],
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
            '<div class="rw-lbl">' + esc(T('Тон')) + '</div>' + seg('tone', _tone, TONE_OPTS) +
            '<div class="rw-seghint" id="rw-tonehint">' + esc(T(TONE_HINTS[_tone])) + '</div>' +
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
            if (el) el.innerHTML = esc(T('Баланс')) + ': <b>' + num(b) + '</b> Forge';
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
                setBalance(r.balance);
                renderResult();
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
            '<div class="rw-actions">' +
            '<button class="rw-act copy" data-act="copy"><i class="ti ti-copy"></i> ' + esc(T('Скопировать')) + '</button>' +
            '<button class="rw-act more" data-act="more"><i class="ti ti-refresh"></i> ' + esc(T('Ещё вариант')) + (price() != null ? ' <span class="p">· ' + num(price()) + ' Forge</span>' : '') + '</button></div>' +
            '<button class="rw-planbtn" data-act="toplan"><i class="ti ti-calendar-plus"></i> ' + esc(T('В контент-план')) + '</button>' +
            (r.model_used ? '<div class="rw-modelnote">' + esc(T('Модель')) + ': ' + esc(r.model_used) + (r.style_applied ? ' · ' + esc(T('в стиле канала')) : '') + '</div>' : '') +
            '</div>';
        try { res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }

    function toPlan() {
        if (_busy || !_lastResult) return;
        _busy = true; haptic('medium');
        apiRequest('/api/v1/content_plan/add-post', {
            method: 'POST',
            body: JSON.stringify({ channel_id: _chId, day_index: -1, ready_text: _lastResult })
        }).then(function (r) {
            _busy = false;
            if (r && r.ok) { toast(T('Пост добавлен в контент-план')); return; }
            var err = r && r.error;
            if (err === 'no_plan') toast(T('Сначала собери контент-план недели'));
            else if (err === 'day_full') toast(T('В плане этой недели нет свободных мест'));
            else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
        }).catch(function () { _busy = false; toast(T('Не удалось. Повтори попытку.')); });
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
            else if (name === 'tone') {
                _tone = v;
                var th = document.getElementById('rw-tonehint');
                if (th) th.textContent = T(TONE_HINTS[v] || '');
            }
            box.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === segBtn); });
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
        if (act === 'toplan') { toPlan(); return; }
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
