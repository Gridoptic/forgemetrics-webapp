/* Рерайт чужого поста 2.0 — вставь текст или ссылку t.me, выбери канал (адаптируется под стиль),
   эмодзи и длину, «Усилить» — получи свою версию. «Ещё вариант» — другой заход. */
(function () {
    'use strict';

    var _channels = null, _chId = null, _emoji = 'few', _length = 'same', _improve = true;
    var _lastOriginal = '', _lastResult = '', _busy = false, _tab = 'res';
    var _avCache = {};   // id канала -> objectURL картинки ('x' = аватарки нет/не загрузилась)

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} }
    function toast(m) { try { if (typeof showToast === 'function') return showToast(m); } catch (e) {} try { if (typeof alertDialog === 'function') alertDialog(m); } catch (e) {} }

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
        return '<div class="rw-head"><button class="rw-back" data-act="close"><i class="ti ti-arrow-left"></i></button>' +
            '<div class="t">' + esc(T('Рерайт чужого поста')) + '</div></div>';
    }
    function setView(html) { var h = ensureScreen(); h.innerHTML = head() + html; h.scrollTop = 0; return h; }

    window.__openRewrite = function () {
        setView('<div class="rw-center"><div class="rw-spin"></div><div class="m">' + esc(T('Секунду...')) + '</div></div>');
        apiRequest('/api/v1/channels/active').then(function (d) {
            _channels = (d && d.channels) ? d.channels.filter(function (c) { return c.username; }) : [];
            if (_chId == null && d && d.active_channel_id) _chId = d.active_channel_id;
            if (_chId == null && _channels.length) _chId = _channels[0].id;
            renderForm();
        }).catch(function () { _channels = []; renderForm(); });
    };

    function curChannel() {
        for (var i = 0; i < (_channels || []).length; i++) if (_channels[i].id === _chId) return _channels[i];
        return null;
    }
    function chAv(c) {
        // буква-заглушка; реальная аватарка подгружается rwLoadAvatars() поверх — как в основном приложении
        var t = (c && (c.title || c.username)) || '?';
        return esc(String(t).charAt(0).toUpperCase());
    }
    function avAttr(c) {
        // помечаем контейнер .av для отложенной подгрузки картинки (эндпоинт /channels/{id}/avatar)
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
                    // серия повторов — на случай задержки Telegram сразу после подключения; остаёмся 'pending', чтобы не дёргать параллельно
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
            '<span>' + esc(c ? ('@' + c.username) : T('подключи канал, чтобы писать в его голосе')) + '</span></div>';
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

    function seg(name, val, opts) {
        return '<div class="rw-seg" data-seg="' + name + '">' + opts.map(function (o) {
            return '<button data-v="' + o[0] + '" class="' + (val === o[0] ? 'on' : '') + '">' + esc(T(o[1])) + '</button>';
        }).join('') + '</div>';
    }

    function renderForm() {
        var c = curChannel();
        var chBlock = _channels && _channels.length
            ? '<div class="rw-chdd"><button type="button" class="rw-ch" data-act="chtoggle" id="rw-chhead">' + chHead(c) +
              '<i class="ti ti-chevron-down chev"></i></button>' +
              '<div class="rw-chlist" id="rw-chlist">' +
              _channels.map(function (ch) { return chOpt(ch); }).join('') +
              chOptNone() + '</div></div>'
            : '<div class="rw-hint">' + esc(T('Канал не подключён — перепишу в чистом нейтральном стиле. Подключи канал в приложении, чтобы писать точно в его голосе.')) + '</div>';

        setView(
            '<div class="rw-sec"><div class="rw-eyebrow"><span class="tile"><i class="ti ti-clipboard-text"></i></span> ' + esc(T('Чужой пост')) + '</div>' +
            '<textarea class="rw-ta" id="rw-input" placeholder="' + esc(T('Вставь текст чужого поста или ссылку t.me/канал/123 — я сам вытащу пост')) + '"></textarea>' +
            '<div class="rw-link-note" id="rw-linknote"><i class="ti ti-link"></i> ' + esc(T('Похоже на ссылку — вытащу текст поста сам при переписывании')) + '</div>' +
            '<div class="rw-hint">' + esc(T('Факты сохраню, слова и подача будут оригинальные — не копия, бан за плагиат не грозит.')) + '</div></div>' +

            '<div class="rw-sec"><div class="rw-eyebrow"><span class="tile"><i class="ti ti-adjustments"></i></span> ' + esc(T('Настройка')) + '</div>' +
            '<div class="rw-lbl">' + esc(T('В стиле канала')) + '</div>' + chBlock +
            '<div class="rw-lbl">' + esc(T('Эмодзи')) + '</div>' + seg('emoji', _emoji, [['none', 'Без'], ['few', 'Умеренно'], ['many', 'Живо']]) +
            '<div class="rw-lbl">' + esc(T('Длина')) + '</div>' + seg('length', _length, [['shorter', 'Короче'], ['same', 'Так же'], ['longer', 'Длиннее']]) +
            '<div class="rw-tgl' + (_improve ? ' on' : '') + '" data-act="improve"><div class="sw"></div><div class="tx"><b>' + esc(T('Усилить пост')) + '</b><span>' + esc(T('цепляющий хук, без воды, призыв в конце, формат под Telegram — версия соберёт не хуже')) + '</span></div></div>' +
            '</div>' +

            '<button class="rw-go" data-act="go">' + esc(T('Переписать в моём стиле')) + '</button>' +
            '<div id="rw-result"></div>');
        rwLoadAvatars();
    }

    function onInput(ev) {
        if (ev.target && ev.target.id === 'rw-input') {
            var v = ev.target.value || '';
            var note = document.getElementById('rw-linknote');
            var looksLink = /t\.me\/[^\s]+/.test(v) && v.trim().length < 200;
            if (note) note.classList.toggle('on', looksLink);
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
        };
        if (variant) { body.original_text = _lastOriginal; }
        else if (isLink) { body.url = val; }
        else { body.original_text = val; }

        var res = document.getElementById('rw-result');
        var goBtn = document.querySelector('#rewrite-screen [data-act="go"]');
        if (goBtn) goBtn.disabled = true;
        if (res) res.innerHTML = '<div class="rw-sec"><div class="rw-center" style="padding:26px 10px;"><div class="rw-spin"></div><div class="m">' + esc(T('Переписываю в голосе твоего канала...')) + '</div></div></div>';

        apiRequest('/api/v1/post/rewrite', { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                _busy = false; if (goBtn) goBtn.disabled = false;
                if (!r || !r.text) { if (res) res.innerHTML = ''; toast((r && r.detail) || T('Не получилось переписать — попробуй ещё раз')); return; }
                _lastOriginal = r.original || _lastOriginal || val;
                _lastResult = r.text; _tab = 'res';
                renderResult(r);
            })
            .catch(function (e) {
                _busy = false; if (goBtn) goBtn.disabled = false;
                if (res) res.innerHTML = '';
                var msg = (e && e.message) ? e.message : T('Не получилось переписать — попробуй ещё раз');
                toast(msg);
            });
    }

    function renderResult(r) {
        var res = document.getElementById('rw-result');
        if (!res) return;
        var body = _tab === 'orig' ? _lastOriginal : _lastResult;
        res.innerHTML =
            '<div class="rw-sec"><div class="rw-eyebrow"><span class="tile"><i class="ti ti-sparkles"></i></span> ' +
            esc(T('Твоя версия')) + (r && r.channel ? ' · ' + esc('@' + r.channel.username) : '') + '</div>' +
            '<div class="rw-restabs"><button class="' + (_tab === 'res' ? 'on' : '') + '" data-tab="res">' + esc(T('Результат')) + '</button>' +
            '<button class="' + (_tab === 'orig' ? 'on' : '') + '" data-tab="orig">' + esc(T('Оригинал')) + '</button></div>' +
            '<div class="rw-out' + (_tab === 'orig' ? ' orig' : '') + '" id="rw-out">' + esc(body) + '</div>' +
            '<div class="rw-actions">' +
            '<button class="rw-act copy" data-act="copy"><i class="ti ti-copy"></i> ' + esc(T('Скопировать')) + '</button>' +
            '<button class="rw-act more" data-act="more"><i class="ti ti-refresh"></i> ' + esc(T('Ещё вариант')) + '</button></div>' +
            (r && r.model_used ? '<div class="rw-modelnote">' + esc(T('Модель')) + ': ' + esc(r.model_used) + (r.style_applied ? ' · ' + esc(T('в стиле канала')) : '') + '</div>' : '') +
            '</div>';
        res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function onClick(ev) {
        var t = ev.target;
        var segBtn = t.closest ? t.closest('.rw-seg button') : null;
        if (segBtn) {
            var box = segBtn.parentElement, name = box.getAttribute('data-seg'), v = segBtn.getAttribute('data-v');
            if (name === 'emoji') _emoji = v; else if (name === 'length') _length = v;
            box.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === segBtn); });
            haptic('light'); return;
        }
        var opt = t.closest ? t.closest('.rw-chopt') : null;
        if (opt) {
            var cid = +opt.getAttribute('data-chid');
            _chId = cid > 0 ? cid : null;              // 0 = «Без канала»
            haptic('light');
            // обновляем НА МЕСТЕ (не перерисовываем форму — иначе стирается введённый текст)
            var head = document.getElementById('rw-chhead');
            if (head) { head.innerHTML = chHead(curChannel()) + '<i class="ti ti-chevron-down chev"></i>'; rwLoadAvatars(head); }
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
        if (tab) { _tab = tab.getAttribute('data-tab'); haptic('light'); renderResult({ channel: curChannel() ? { username: curChannel().username } : null, model_used: null }); return; }
        var actEl = t.closest ? t.closest('[data-act]') : null;
        if (!actEl) return;
        var act = actEl.getAttribute('data-act');
        if (act === 'close') { haptic('light'); close(); return; }
        if (act === 'chtoggle') { var dd = actEl.closest('.rw-chdd'); if (dd) dd.classList.toggle('open'); haptic('light'); return; }
        if (act === 'improve') { _improve = !_improve; actEl.classList.toggle('on', _improve); haptic('light'); return; }
        if (act === 'go') { go(false); return; }
        if (act === 'more') { go(true); return; }
        if (act === 'copy') {
            haptic('medium');
            var run = (typeof copyText === 'function') ? copyText(_tab === 'orig' ? _lastOriginal : _lastResult) : Promise.reject();
            Promise.resolve(run).then(function () { toast(T('Текст скопирован')); }).catch(function () {});
            return;
        }
    }
})();
