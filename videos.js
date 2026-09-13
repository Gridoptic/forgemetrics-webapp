(function () {
    'use strict';

    var MAX_TOPIC = 3000, MAX_PHOTOS = 4, MAX_VIDEOS = 3;
    var _niches = [], _price = 70, _parallel = 2, _items = [], _loaded = false;
    var _keepDays = 7, _open = {};
    var _voices = [], _channels = [], _voiceNames = [], _brandOn = false, _brandCh = 0;
    var _topic = '', _niche = '', _nq = '', _url = '', _photos = [], _videos = [],
        _busy = false, _pick = false;

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function haptic(k) {
        try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {}
    }
    function toast(m, i) { try { if (typeof showToast === 'function') showToast(m, i || 'movie'); } catch (e) {} }
    function fa(n, size) {
        if (typeof forgeAmount === 'function') return forgeAmount(n, size || 12);
        return String(n);
    }

    function ensureScreen() {
        var host = document.getElementById('videos-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'videos-screen';
            host.className = 'vd-screen';
            (document.getElementById('app') || document.body).appendChild(host);
            host.addEventListener('click', onClick);
            host.addEventListener('input', onInput);
        }
        host.style.display = 'flex';
        document.documentElement.classList.add('cs-modal-open');
        document.body.classList.add('cs-modal-open');
        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(close);
                tg.BackButton.onClick(close);
                tg.BackButton.show();
            }
        } catch (e) {}
        return host;
    }

    function close() {
        var host = document.getElementById('videos-screen');
        if (host) host.style.display = 'none';
        stopSample();
        document.documentElement.classList.remove('cs-modal-open');
        document.body.classList.remove('cs-modal-open');
        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(close);
                tg.BackButton.hide();
            }
        } catch (e) {}
    }

    function visible() {
        var h = document.getElementById('videos-screen');
        return !!(h && h.style.display !== 'none' && h.offsetParent !== null);
    }

    function head() {
        return '<div class="vd-head">' +
            '<button class="vd-back" type="button" data-va="close"><i class="ti ti-arrow-left"></i></button>' +
            '<div class="vd-title">' + esc(T('Креативы')) + '</div>' +
            '</div>';
    }

    function secTitle(text, extra) {
        return '<div class="cs-section-title">' + esc(text) + (extra || '') + '</div>';
    }

    function secHint(text) {
        return '<div class="cs-section-hint">' + esc(text) + '</div>';
    }

    function topicField() {
        var left = MAX_TOPIC - (_topic || '').length;
        return '<div class="vd-f">' + secTitle(T('Тема ролика')) +
            secHint(T('Опиши, о чём ролик. Можно вставить свой текст — он станет основой сценария.')) +
            '<div class="vd-box"><textarea class="vd-ta" id="vd-topic" rows="5" autocomplete="off" maxlength="' +
            MAX_TOPIC + '" placeholder="' +
            esc(T('Например: как выбрать робот-пылесос для квартиры с животными')) + '">' + esc(_topic) + '</textarea>' +
            '<div class="vd-cnt">' + esc(T('Осталось символов')) + ': ' + left + '</div></div></div>';
    }

    function nicheField() {
        var head = '<button type="button" class="cs-toggle-row vd-row" data-va="nopen">' +
            '<div class="cs-toggle-icon-wrap"><i class="ti ti-category-2" style="color: #818cf8;"></i></div>' +
            '<div class="cs-toggle-info"><div class="cs-toggle-title-row">' +
            '<span class="cs-toggle-title">' + esc(T('Ниша ролика')) + '</span></div>' +
            '<div class="cs-toggle-sub">' + esc(T('Задаёт подачу, музыку и темп ролика')) + '</div></div>' +
            '<span class="cs-tz-val">' + esc(_niche || T('по теме')) + '</span>' +
            '<i class="ti ti-chevron-' + (_pick ? 'up' : 'right') + ' cs-tz-ch"></i></button>';
        if (!_pick) return '<div class="vd-f">' + secTitle(T('Ниша')) + head + '</div>';
        var q = (_nq || '').trim().toLowerCase();
        var list = _niches.filter(function (n) { return !q || n.indexOf(q) >= 0; }).slice(0, 40);
        var rows = [{ v: '', label: T('По теме ролика'), note: T('ниша определится сама') }].concat(
            list.map(function (n) { return { v: n, label: n, note: '' }; }));
        var body = '<div class="vd-box vd-search"><i class="ti ti-search"></i>' +
            '<input class="vd-inp" id="vd-niche" type="text" autocomplete="off" value="' + esc(_nq) +
            '" placeholder="' + esc(T('Найти нишу')) + '"></div>' +
            '<div class="vd-nlist">' + (rows.length ? rows.map(function (r) {
                return '<div class="cs-vrow' + (_niche === r.v ? ' on' : '') +
                    '" data-va="niche" data-v="' + esc(r.v) + '">' +
                    '<span class="cs-vnm"><b>' + esc(r.label) + '</b>' +
                    (r.note ? '<span>' + esc(r.note) + '</span>' : '') + '</span>' +
                    '<span class="cs-vchk"><i class="ti ti-check"></i></span></div>';
            }).join('') : '<div class="vd-nempty">' + esc(T('Ничего не найдено')) + '</div>') + '</div>';
        return '<div class="vd-f">' + secTitle(T('Ниша')) + head + body + '</div>';
    }

    function urlField() {
        return '<div class="vd-f">' + secTitle(T('Ссылка на товар')) +
            secHint(T('Для Wildberries кадры берутся из карточки товара. Ozon и AliExpress закрыты защитой — для них загрузи свои фотографии.')) +
            '<div class="vd-box"><input class="vd-inp" id="vd-url" type="url" inputmode="url" autocomplete="off" value="' +
            esc(_url) + '" placeholder="https://www.wildberries.ru/catalog/..."></div></div>';
    }

    function photosField() {
        var thumbs = _photos.map(function (p, i) {
            return '<div class="vd-ph"><img src="' + esc(p.url) + '" alt="">' +
                '<button type="button" class="vd-ph-x" data-va="unphoto" data-i="' + i +
                '"><i class="ti ti-x"></i></button></div>';
        }).join('') + _videos.map(function (v, i) {
            return '<div class="vd-ph vid"><video src="' + esc(v.url) + '" muted playsinline preload="metadata"></video>' +
                '<span class="vd-ph-t">' + esc(String(v.duration || '') + ' ' + T('с')) + '</span>' +
                '<button type="button" class="vd-ph-x" data-va="unvideo" data-i="' + i +
                '"><i class="ti ti-x"></i></button></div>';
        }).join('');
        var add = (_photos.length < MAX_PHOTOS || _videos.length < MAX_VIDEOS)
            ? '<button type="button" class="vd-ph-add" data-va="photo"><i class="ti ti-camera-plus"></i>' +
              '<span>' + esc(T('Добавить')) + '</span></button>'
            : '';
        return '<div class="vd-f">' + secTitle(T('Свои материалы')) +
            secHint(T('До 4 фотографий и 3 видео, файл до 60 МБ. Если материалы есть, кадры ролика собираются из них. Файлы удаляются вместе с роликом, а неиспользованные — в течение суток.')) +
            '<div class="vd-phs">' + thumbs + add + '</div></div>';
    }

    function voiceSum() {
        return _voiceNames.length ? (T('выбрано ') + _voiceNames.length) : T('по теме ролика');
    }

    function voiceCol(gender, label) {
        var rows = _voices.filter(function (v) { return v.gender === gender; }).map(function (v) {
            return '<div class="cs-vrow' + (_voiceNames.indexOf(v.name) >= 0 ? ' on' : '') +
                '" data-va="vname" data-v="' + esc(v.name) + '">' +
                '<button class="cs-vplay" type="button" data-va="vplay" data-src="' + esc(v.sample_url || '') +
                '" aria-label="' + esc(T('Пример голоса')) + '"><i class="ti ti-player-play-filled"></i></button>' +
                '<span class="cs-vnm"><b>' + esc(v.label) + '</b><span>' + esc(v.note || '') + '</span></span>' +
                '<span class="cs-vchk"><i class="ti ti-check"></i></span></div>';
        }).join('');
        return '<div class="cs-vcol"><div class="cs-vcolh"><s>' + esc(label) + '</s>' +
            '<u data-va="vall" data-v="' + gender + '">' + esc(T('все')) + '</u></div>' + rows + '</div>';
    }

    function voiceField() {
        if (!_voices.length) return '';
        return '<div class="vd-f" id="vd-voice-sec">' +
            secTitle(T('Озвучка'), ' <span class="cs-vsum" id="vd-vsum">' + esc(voiceSum()) + '</span>') +
            '<div class="cs-vcols">' + voiceCol('male', T('Мужские')) + voiceCol('female', T('Женские')) + '</div>' +
            '<div class="cs-vfoot">' + esc(T('Отмеченные голоса читают ролики по очереди, без повтора подряд. Если не отмечено ничего — голос подбирается по теме ролика.')) +
            '</div></div>';
    }

    function brandChannel() {
        for (var i = 0; i < _channels.length; i++) {
            if (_channels[i].id === _brandCh) return _channels[i];
        }
        return null;
    }

    function endingField() {
        if (!_channels.length) {
            return '<div class="vd-f">' + secTitle(T('Концовка')) +
                secHint(T('Канал не подключён: финал будет нейтральным — без призыва подписаться и без упоминания площадок.')) +
                '</div>';
        }
        var ch = brandChannel();
        var row = '<div class="cs-toggle-row" data-va="brandtog">' +
            '<div class="cs-toggle-icon-wrap"><i class="ti ti-video" style="color: ' +
            (_brandOn ? '#5DCAA5' : 'rgba(255,255,255,0.4)') + ';"></i></div>' +
            '<div class="cs-toggle-info"><div class="cs-toggle-title-row">' +
            '<span class="cs-toggle-title">' + esc(T('Подпись канала в финале')) + '</span></div>' +
            '<div class="cs-toggle-sub">' + esc(_brandOn
                ? T('Включена — аватар и название канала в финале ролика')
                : T('Выключена — финал зовёт к предмету ролика, без упоминания канала')) + '</div></div>' +
            '<button class="cs-toggle-switch' + (_brandOn ? ' on' : '') +
            '" type="button"><span class="cs-toggle-knob"></span></button></div>';
        var pick = '';
        if (_brandOn) {
            var title = ch ? (ch.title || ('@' + ch.username)) : T('Выбери канал');
            var sub = ch ? (ch.username ? '@' + ch.username : T('нажми, чтобы сменить канал')) : T('нажми, чтобы выбрать');
            pick = '<button class="pw-chansel" type="button" data-va="chpick" style="margin:8px 0 0;">' +
                '<div class="pw-chav" id="vd-chav">' + esc((title || 'K').trim().charAt(0).toUpperCase()) + '</div>' +
                '<div class="pw-chinfo"><div class="pw-chn"><span class="pw-chn-t">' + esc(title) + '</span>' +
                (_channels.length > 1 ? '<span class="pw-badge">' + esc(T('в финале')) + '</span>' : '') + '</div>' +
                '<div class="pw-chnb">' + esc(sub) + '</div></div>' +
                '<div class="pw-chchev"><i class="ti ti-chevron-down"></i></div></button>';
        }
        return '<div class="vd-f">' + secTitle(T('Концовка')) + row + pick + '</div>';
    }

    function form() {
        var go = _busy
            ? '<button type="button" class="vd-go" disabled><span class="cp-spin sm"></span>' +
              esc(T('Запускаю сборку')) + '</button>'
            : '<button type="button" class="vd-go" data-va="build"><i class="ti ti-movie"></i>' +
              esc(T('Собрать креатив')) + '<span class="pm-btn-price">' + fa(_price, 13) + '</span></button>';
        return '<div class="vd-card">' +
            topicField() + nicheField() + urlField() +
            photosField() + voiceField() + endingField() +
            '<div class="vd-note">' + esc(T('Ролик 9:16 со сценарием, кадрами, озвучкой и музыкой. Готовый файл примерно через 5 минут.')) +
            ' ' + esc(T('Одновременно собираются два ролика, число роликов в сутки не ограничено.')) +
            '</div>' + go + '</div>';
    }

    function statusRow(c) {
        if (c.status === 'queued' || c.status === 'generating') {
            return '<div class="cp-crv-wait"><div class="cp-spin sm"></div><span>' +
                esc(T('Собираю ролик: сценарий, кадры, озвучка, монтаж. Можно уйти с экрана.')) + '</span></div>';
        }
        if (c.status === 'error') {
            return '<div class="cp-note fail">' +
                esc(T('Ролик не собрался — Forge вернулись на баланс, попробуй ещё раз.')) + '</div>';
        }
        return '';
    }

    var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    function keepLeft(c) {
        if (!c.expires_at) return '';
        var d = new Date(c.expires_at);
        if (isNaN(d.getTime())) return '';
        var left = Math.ceil((d - Date.now()) / 86400000);
        if (left <= 0) return T('последний день хранения');
        return T('хранение до') + ' ' + d.getDate() + ' ' + T(MONTHS_GEN[d.getMonth()]);
    }

    function plural(n, one, few, many) {
        var a = Math.abs(n) % 100, b = a % 10;
        if (a > 10 && a < 20) return many;
        if (b > 1 && b < 5) return few;
        if (b === 1) return one;
        return many;
    }

    function card(c) {
        var title = (c.title || (c.brief && c.brief.topic) || T('Ролик')).slice(0, 120);
        var src = (c.source_kind === 'brief') ? T('По теме') : T('Из поста');
        var dur = c.duration_s ? Math.round(c.duration_s) + ' ' + T('с') : '';
        var live = c.status === 'queued' || c.status === 'generating';
        var open = !!_open[c.id] || live;
        var thumb = (c.preview_url && c.status === 'ready')
            ? '<span class="vd-thumb"><img src="' + esc(c.preview_url) + '" alt=""></span>'
            : '<span class="vd-thumb ph"><i class="ti ti-' + (live ? 'loader-2' : (c.status === 'error' ? 'alert-triangle' : 'movie')) + '"></i></span>';
        var gone = c.status === 'ready' && !c.url;
        var meta = [src, dur, (gone ? T('файла нет') : (c.status === 'ready' ? keepLeft(c) : ''))]
            .filter(Boolean).join(' · ');
        var head = '<button type="button" class="vd-row" data-va="toggle" data-id="' + c.id + '">' +
            thumb + '<span class="vd-row-tx"><b>' + esc(title) + '</b><em>' + esc(meta) + '</em></span>' +
            '<i class="ti ti-chevron-' + (open ? 'up' : 'down') + ' vd-row-ch"></i></button>';
        if (!open) return '<div class="vd-item">' + head + '</div>';

        var body = statusRow(c);
        if (c.status === 'ready' && c.url) {
            body = '<button class="cp-crv-prev" type="button" data-va="open" data-url="' + esc(c.url) + '">' +
                (c.preview_url ? '<img src="' + esc(c.preview_url) + '" alt="">' : '') +
                '<span class="cp-crv-play"><i class="ti ti-player-play-filled"></i></span>' +
                (dur ? '<span class="cp-crv-dur">' + esc(dur) + '</span>' : '') + '</button>' +
                '<div class="cp-crv-acts">' +
                '<button class="cp-act ok" type="button" data-va="open" data-url="' + esc(c.url) +
                '"><i class="ti ti-download"></i> ' + esc(T('Скачать MP4')) + '</button>' +
                '<button class="cp-act" type="button" data-va="send" data-id="' + c.id +
                '"><i class="ti ti-brand-telegram"></i> ' + esc(T('Отправить в Telegram')) + '</button>' +
                '<button class="cp-act" type="button" data-va="variant" data-id="' + c.id +
                '"><i class="ti ti-refresh"></i> ' + esc(T('Другой вариант')) +
                '<span class="pm-btn-price">' + fa(_price, 12) + '</span></button>' +
                '<button class="cp-act" type="button" data-va="desc" data-id="' + c.id +
                '"><i class="ti ti-copy"></i> ' + esc(T('Описание для ролика')) + '</button>' +
                '<button class="cp-act vd-del" type="button" data-va="del" data-id="' + c.id +
                '"><i class="ti ti-trash"></i> ' + esc(T('Удалить')) + '</button></div>' +
                ((typeof rsCrvCredits === 'function') ? rsCrvCredits(c) : '');
        } else if (c.status === 'error') {
            body += '<div class="cp-crv-acts"><button class="cp-act vd-del" type="button" data-va="del" data-id="' +
                c.id + '"><i class="ti ti-trash"></i> ' + esc(T('Удалить')) + '</button></div>';
        } else if (c.status === 'ready') {
            body = '<div class="vd-gone">' +
                esc(c.in_telegram
                    ? T('Файл снят с наших серверов по сроку хранения. Ролик остался в чате с ботом — пришлём повторно.')
                    : T('Файл снят с наших серверов по сроку хранения. Собери другой вариант этого ролика.')) +
                '</div><div class="cp-crv-acts">' +
                (c.in_telegram ? '<button class="cp-act" type="button" data-va="send" data-id="' + c.id +
                    '"><i class="ti ti-brand-telegram"></i> ' + esc(T('Отправить в Telegram')) + '</button>' : '') +
                '<button class="cp-act" type="button" data-va="variant" data-id="' + c.id +
                '"><i class="ti ti-refresh"></i> ' + esc(T('Другой вариант')) +
                '<span class="pm-btn-price">' + fa(_price, 12) + '</span></button>' +
                '<button class="cp-act vd-del" type="button" data-va="del" data-id="' + c.id +
                '"><i class="ti ti-trash"></i> ' + esc(T('Удалить')) + '</button></div>';
        }
        return '<div class="vd-item open">' + head + body + '</div>';
    }

    function list() {
        if (!_loaded) return '<div class="vd-load"><div class="cp-spin sm"></div></div>';
        if (!_items.length) {
            return '<div class="vd-empty">' + esc(T('Роликов пока нет. Опиши тему и собери первый.')) + '</div>';
        }
        return '<div class="vd-keep">' + esc(T('Срок хранения готового ролика —') + ' ' + _keepDays + ' ' +
            plural(_keepDays, T('день'), T('дня'), T('дней')) +
            T('. Скачай файл или отправь его в Telegram, чтобы оставить у себя.')) +
            '</div><div class="vd-list">' + _items.map(card).join('') + '</div>';
    }

    var _sample = null, _sampleBtn = null;

    function stopSample() {
        if (_sample) {
            try { _sample.pause(); } catch (e) {}
            _sample = null;
        }
        if (_sampleBtn) {
            _sampleBtn.innerHTML = '<i class="ti ti-player-play-filled"></i>';
            _sampleBtn.classList.remove('act');
            _sampleBtn = null;
        }
    }

    function playSample(btn) {
        if (_sampleBtn === btn) { stopSample(); return; }
        stopSample();
        var src = btn.getAttribute('data-src') || '';
        if (!src) { toast(T('Пример голоса недоступен'), 'alert-triangle'); return; }
        var a = new Audio(src);
        _sample = a;
        _sampleBtn = btn;
        btn.innerHTML = '<i class="ti ti-player-stop-filled"></i>';
        btn.classList.add('act');
        a.onended = stopSample;
        a.onerror = function () { stopSample(); toast(T('Пример голоса не открылся'), 'alert-triangle'); };
        haptic();
        var p = a.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function () { stopSample(); toast(T('Пример голоса не открылся'), 'alert-triangle'); });
        }
    }

    function markVoice(el, on) {
        var row = el.classList.contains('cs-vrow') ? el : el.closest('.cs-vrow');
        if (!row) return;
        var name = row.getAttribute('data-v');
        var want = (on === null || on === undefined) ? !row.classList.contains('on') : on;
        row.classList.toggle('on', want);
        var i = _voiceNames.indexOf(name);
        if (want && i < 0) _voiceNames.push(name);
        if (!want && i >= 0) _voiceNames.splice(i, 1);
        var sum = document.getElementById('vd-vsum');
        if (sum) sum.textContent = voiceSum();
        haptic();
    }

    function pickChannel() {
        haptic();
        if (typeof window.showBottomSheet !== 'function') return;
        window.showBottomSheet({
            title: T('Какой канал показать в финале?'),
            subtitle: T('Аватар, название и адрес канала в последнем кадре ролика'),
            items: _channels.map(function (c) {
                return { id: c.id, title: c.title || ('@' + c.username),
                         subtitle: c.username ? '@' + c.username : '',
                         has_avatar: c.has_avatar, is_private: c.is_private };
            }),
            activeId: _brandCh,
            onSelect: function (id) { _brandCh = +id; _brandOn = true; render(); }
        });
    }

    function render() {
        var host = document.getElementById('videos-screen');
        if (!host) return;
        var focus = document.activeElement;
        var fid = focus && focus.id && /^vd-(topic|niche|url)$/.test(focus.id) ? focus.id : '';
        var pos = fid ? focus.selectionStart : 0;
        stopSample();
        host.innerHTML = head() + '<div class="vd-body">' + form() +
            '<div class="vd-sec">' + esc(T('Мои ролики')) + '</div>' + list() + '</div>';
        if (fid) {
            var el = document.getElementById(fid);
            if (el) {
                el.focus();
                try { el.setSelectionRange(pos, pos); } catch (e) {}
            }
        }
        var ch = brandChannel(), av = document.getElementById('vd-chav');
        if (ch && ch.has_avatar && av && typeof window.loadChannelAvatar === 'function') {
            window.loadChannelAvatar(ch.id, av);
        }
    }

    function onInput(e) {
        var el = e.target;
        if (!el || !el.id) return;
        if (el.id === 'vd-topic') {
            _topic = el.value.slice(0, MAX_TOPIC);
            var cnt = document.querySelector('.vd-cnt');
            if (cnt) cnt.textContent = T('Осталось символов') + ': ' + (MAX_TOPIC - _topic.length);
            return;
        }
        if (el.id === 'vd-url') { _url = el.value.trim(); return; }
        if (el.id === 'vd-niche') {
            _nq = el.value;
            render();
        }
    }

    function onClick(e) {
        var b = e.target.closest ? e.target.closest('[data-va]') : null;
        if (!b) {
            if (_pick && !(e.target.id === 'vd-niche')) { _pick = false; render(); }
            return;
        }
        var a = b.getAttribute('data-va');
        if (a === 'close') { haptic(); close(); return; }
        if (a === 'nopen') { _pick = !_pick; _nq = ''; haptic(); render(); return; }
        if (a === 'niche') {
            _niche = b.getAttribute('data-v') || '';
            _pick = false;
            _nq = '';
            haptic();
            render();
            return;
        }
        if (a === 'vplay') {
            e.stopPropagation();
            playSample(b);
            return;
        }
        if (a === 'vname') { markVoice(b, null); return; }
        if (a === 'vall') {
            e.stopPropagation();
            var col = b.parentNode.parentNode;
            [].slice.call(col.querySelectorAll('.cs-vrow')).forEach(function (r, i, all) {
                markVoice(r, !all.every(function (x) { return x.classList.contains('on'); }));
            });
            return;
        }
        if (a === 'brandtog') {
            _brandOn = !_brandOn;
            if (_brandOn && !brandChannel()) {
                var act = null;
                try { act = window.__fmActiveChannelId || null; } catch (e2) { act = null; }
                var byAct = _channels.filter(function (c) { return c.id === act; })[0];
                _brandCh = (byAct || _channels[0]).id;
            }
            haptic();
            render();
            return;
        }
        if (a === 'chpick') { pickChannel(); return; }
        if (a === 'photo') { pickPhoto(); return; }
        if (a === 'unphoto') {
            _photos.splice(+b.getAttribute('data-i'), 1);
            haptic();
            render();
            return;
        }
        if (a === 'unvideo') {
            _videos.splice(+b.getAttribute('data-i'), 1);
            haptic();
            render();
            return;
        }
        if (a === 'build') { build(); return; }
        if (a === 'open') {
            if (typeof rsCrvOpen === 'function') rsCrvOpen(b.getAttribute('data-url'));
            return;
        }
        if (a === 'send') {
            if (typeof rsCrvSend === 'function') rsCrvSend(+b.getAttribute('data-id'));
            return;
        }
        if (a === 'desc') {
            if (typeof rsCrvDesc === 'function') rsCrvDesc(+b.getAttribute('data-id'));
            return;
        }
        if (a === 'variant') { variant(+b.getAttribute('data-id')); return; }
        if (a === 'toggle') {
            var tid = +b.getAttribute('data-id');
            _open[tid] = !_open[tid];
            haptic();
            render();
            return;
        }
        if (a === 'del') { removeOne(+b.getAttribute('data-id')); return; }
    }

    function pickPhoto() {
        var inp = document.getElementById('vd-file');
        if (!inp) {
            inp = document.createElement('input');
            inp.type = 'file';
            inp.id = 'vd-file';
            inp.style.display = 'none';
            document.body.appendChild(inp);
        }
        inp.accept = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm';
        inp.onchange = function () {
            var f = inp.files && inp.files[0];
            inp.value = '';
            if (!f) return;
            var isVideo = /^video\//.test(f.type || '');
            if (isVideo && _videos.length >= MAX_VIDEOS) { toast(T('Больше трёх видео не нужно'), 'alert-triangle'); return; }
            if (!isVideo && _photos.length >= MAX_PHOTOS) { toast(T('Больше четырёх фотографий не нужно'), 'alert-triangle'); return; }
            var limit = isVideo ? 60 : 8;
            if (f.size > limit * 1048576) {
                toast(T('Файл больше') + ' ' + limit + ' ' + T('МБ'), 'alert-triangle');
                return;
            }
            var fd = new FormData();
            fd.append('file', f);
            fd.append('slot', String(isVideo ? _videos.length : _photos.length));
            toast(isVideo ? T('Загружаю видео') : T('Загружаю фото'), 'loader');
            apiRequest('/api/v1/creative/brief/' + (isVideo ? 'video' : 'photo'), { method: 'POST', body: fd })
                .then(function (r) {
                    if (r && r.ok) {
                        if (isVideo) _videos.push({ path: r.path, url: r.url, duration: r.duration });
                        else _photos.push({ path: r.path, url: r.url });
                        haptic();
                        render();
                    } else toast((r && r.message) || T('Файл не загрузился'), 'alert-triangle');
                })
                .catch(function () { toast(T('Файл не загрузился'), 'alert-triangle'); });
        };
        inp.click();
    }

    function build() {
        if (_busy) return;
        if (_parallel < 1) _parallel = 2;
        var topic = (_topic || '').trim();
        if (topic.length < 12) { toast(T('Опиши тему ролика: минимум одно предложение.'), 'alert-triangle'); return; }
        _busy = true;
        haptic('medium');
        render();
        var body = {
            topic: topic, niche: (_niche || '').trim(), product_url: (_url || '').trim(),
            photos: _photos.map(function (p) { return p.path; }),
            videos: _videos.map(function (v) { return v.path; }),
            voice_names: _voiceNames, channel_id: (_brandOn && _brandCh) ? _brandCh : null,
            lang: (window.__fmLang || 'ru')
        };
        apiRequest('/api/v1/creative/brief', { method: 'POST', body: JSON.stringify(body) })
            .then(function (r) {
                _busy = false;
                if (r && r.ok && r.creative) {
                    _items.unshift(r.creative);
                    toast(T('Собираю ролик'), 'movie');
                    render();
                    refreshBalance();
                } else {
                    toast((r && r.message) || T('Сборка не запустилась'), 'alert-triangle');
                    render();
                }
            })
            .catch(function (e) {
                _busy = false;
                toast((typeof apiFailText === 'function') ? apiFailText(e) : T('Сборка не запустилась'), 'alert-triangle');
                render();
            });
    }

    function variant(cid) {
        haptic('medium');
        apiRequest('/api/v1/creative/variant', { method: 'POST', body: JSON.stringify({ id: cid }) })
            .then(function (r) {
                if (r && r.ok && r.creative) {
                    if (!r.already) _items.unshift(r.creative);
                    toast(T('Собираю другой вариант'), 'movie');
                    render();
                    refreshBalance();
                } else toast((r && r.message) || T('Сборка не запустилась'), 'alert-triangle');
            })
            .catch(function () { toast(T('Сборка не запустилась'), 'alert-triangle'); });
    }

    function removeOne(cid) {
        var item = null;
        for (var i = 0; i < _items.length; i++) if (_items[i].id === cid) item = _items[i];
        var name = (item && (item.title || (item.brief && item.brief.topic))) || T('Ролик');
        var ask = (typeof confirmDialogHtml === 'function')
            ? confirmDialogHtml(T('Удалить ролик?'),
                '<div style="font-size:13px;line-height:1.5;">' + esc(name) + '<br><span style="color:#8d93a8;">' +
                esc(T('Файл сразу удалится с наших серверов и восстановить его будет нельзя.')) + '</span></div>',
                T('Удалить'))
            : Promise.resolve(true);
        Promise.resolve(ask).then(function (ok) {
            if (!ok) return;
            apiRequest('/api/v1/creative/' + cid, { method: 'DELETE' })
                .then(function (r) {
                    if (r && r.ok) {
                        _items = _items.filter(function (x) { return x.id !== cid; });
                        delete _open[cid];
                        haptic('medium');
                        toast(T('Ролик удалён'), 'trash');
                        render();
                    } else toast((r && r.message) || T('Не удалось удалить ролик'), 'alert-triangle');
                })
                .catch(function () { toast(T('Не удалось удалить ролик'), 'alert-triangle'); });
        });
    }

    function refreshBalance() {
        try { if (typeof refreshDashboardSilent === 'function') refreshDashboardSilent(); } catch (e) {}
    }

    function load(silent) {
        return apiRequest('/api/v1/creative/mine?limit=30')
            .then(function (r) {
                if (!r || !r.ok) return;
                _items = r.items || [];
                if (r.price) _price = r.price;
                if (r.parallel) _parallel = r.parallel;
                if (r.keep_days) _keepDays = r.keep_days;
                if (r.voices) _voices = r.voices;
                if (r.channels) _channels = r.channels;
                if (r.niches && r.niches.length) _niches = r.niches;
                _loaded = true;
                render();
            })
            .catch(function () {
                _loaded = true;
                if (!silent) render();
            });
    }

    if (window.FMLive) {
        window.FMLive.register('videos', 20000, function () {
            if (!visible() || !_loaded) return false;
            var live = _items.some(function (c) { return c.status === 'queued' || c.status === 'generating'; });
            if (!live) return false;
            load(true);
            return true;
        });
    }

    window.__openVideos = function () {
        ensureScreen();
        render();
        load(false);
    };
})();
