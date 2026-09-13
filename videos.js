(function () {
    'use strict';

    var MAX_TOPIC = 3000, MAX_PHOTOS = 4, MAX_VIDEOS = 3;
    var _niches = [], _price = 70, _parallel = 2, _items = [], _loaded = false;
    var _keepDays = 7, _open = {};
    var _voices = [], _channels = [], _voiceName = '', _brandCh = 0;
    var _topic = '', _niche = '', _url = '', _photos = [], _videos = [],
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

    function nicheField() {
        var rows = '';
        if (_pick) {
            var q = (_niche || '').trim().toLowerCase();
            var list = _niches.filter(function (n) { return !q || n.indexOf(q) >= 0; }).slice(0, 40);
            rows = '<div class="vd-nlist">' + (list.length ? list.map(function (n) {
                return '<button type="button" class="vd-nrow" data-va="niche" data-v="' + esc(n) + '">' +
                    esc(n) + '</button>';
            }).join('') : '<div class="vd-nempty">' + esc(T('Ничего не найдено')) + '</div>') + '</div>';
        }
        return '<div class="vd-f">' +
            '<div class="vd-lbl">' + esc(T('Ниша')) + '</div>' +
            '<div class="vd-hint">' + esc(T('Задаёт подачу, музыку и темп ролика')) + '</div>' +
            '<input class="vd-inp" id="vd-niche" type="text" autocomplete="off" value="' + esc(_niche) +
            '" placeholder="' + esc(T('Начни вводить нишу')) + '">' + rows + '</div>';
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
        return '<div class="vd-f">' +
            '<div class="vd-lbl">' + esc(T('Свои материалы')) + '</div>' +
            '<div class="vd-hint">' + esc(T('До 4 фотографий и 3 видео, файл до 60 МБ. Если материалы есть, кадры ролика собираются из них. Файлы удаляются вместе с роликом, а неиспользованные — в течение суток.')) + '</div>' +
            '<div class="vd-phs">' + thumbs + add + '</div></div>';
    }

    function voiceField() {
        var cells = [{ name: '', label: T('Авто'), note: T('подбор по теме') }].concat(_voices);
        return '<div class="vd-f">' +
            '<div class="vd-lbl">' + esc(T('Голос')) + '</div>' +
            '<div class="vd-hint">' + esc(T('Диктор, который прочитает сценарий. При автоподборе голос выбирается под тему ролика.')) + '</div>' +
            '<div class="vd-vlist">' + cells.map(function (v) {
                return '<button type="button" class="vd-vrow' + (_voiceName === v.name ? ' on' : '') +
                    '" data-va="vname" data-v="' + esc(v.name) + '"><b>' + esc(v.label) + '</b>' +
                    '<em>' + esc(v.note || '') + '</em></button>';
            }).join('') + '</div></div>';
    }

    function endingField() {
        if (!_channels.length) {
            return '<div class="vd-f">' +
                '<div class="vd-lbl">' + esc(T('Концовка')) + '</div>' +
                '<div class="vd-hint">' + esc(T('Канал не подключён: финал будет нейтральным — без призыва подписаться и без упоминания площадок.')) + '</div></div>';
        }
        var cells = [{ id: 0, title: T('Нейтральная'), note: T('без упоминания канала') }].concat(
            _channels.map(function (c) {
                return { id: c.id, title: c.title || ('@' + c.username),
                         note: c.username ? ('@' + c.username) : T('подпись канала в финале') };
            }));
        return '<div class="vd-f">' +
            '<div class="vd-lbl">' + esc(T('Концовка')) + '</div>' +
            '<div class="vd-hint">' + esc(T('С каналом в финале появится его аватар и название, а диктор позовёт в канал. Без канала финал зовёт к самому предмету ролика.')) + '</div>' +
            '<div class="vd-vlist">' + cells.map(function (c) {
                return '<button type="button" class="vd-vrow' + (_brandCh === c.id ? ' on' : '') +
                    '" data-va="brand" data-v="' + c.id + '"><b>' + esc(c.title) + '</b>' +
                    '<em>' + esc(c.note) + '</em></button>';
            }).join('') + '</div></div>';
    }

    function form() {
        var left = MAX_TOPIC - (_topic || '').length;
        var go = _busy
            ? '<button type="button" class="vd-go" disabled><span class="cp-spin sm"></span>' +
              esc(T('Запускаю сборку')) + '</button>'
            : '<button type="button" class="vd-go" data-va="build"><i class="ti ti-movie"></i>' +
              esc(T('Собрать креатив')) + '<span class="pm-btn-price">' + fa(_price, 13) + '</span></button>';
        return '<div class="vd-card">' +
            '<div class="vd-f">' +
            '<div class="vd-lbl">' + esc(T('Тема ролика')) + '</div>' +
            '<div class="vd-hint">' + esc(T('Опиши, о чём ролик. Можно вставить свой текст — он станет основой сценария.')) + '</div>' +
            '<textarea class="vd-ta" id="vd-topic" rows="5" autocomplete="off" maxlength="' + MAX_TOPIC + '" placeholder="' +
            esc(T('Например: как выбрать робот-пылесос для квартиры с животными')) + '">' + esc(_topic) + '</textarea>' +
            '<div class="vd-cnt">' + esc(T('Осталось символов')) + ': ' + left + '</div></div>' +
            nicheField() +
            '<div class="vd-f">' +
            '<div class="vd-lbl">' + esc(T('Ссылка на товар')) + '</div>' +
            '<div class="vd-hint">' + esc(T('Для Wildberries кадры берутся из карточки товара. Ozon и AliExpress закрыты защитой — для них загрузи свои фотографии.')) + '</div>' +
            '<input class="vd-inp" id="vd-url" type="url" inputmode="url" autocomplete="off" value="' +
            esc(_url) + '" placeholder="https://www.wildberries.ru/catalog/...">' + '</div>' +
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

    function render() {
        var host = document.getElementById('videos-screen');
        if (!host) return;
        var focus = document.activeElement;
        var fid = focus && focus.id && /^vd-(topic|niche|url)$/.test(focus.id) ? focus.id : '';
        var pos = fid ? focus.selectionStart : 0;
        host.innerHTML = head() + '<div class="vd-body">' + form() +
            '<div class="vd-sec">' + esc(T('Мои ролики')) + '</div>' + list() + '</div>';
        if (fid) {
            var el = document.getElementById(fid);
            if (el) {
                el.focus();
                try { el.setSelectionRange(pos, pos); } catch (e) {}
            }
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
            _niche = el.value;
            _pick = true;
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
        if (a === 'niche') {
            _niche = b.getAttribute('data-v') || '';
            _pick = false;
            haptic();
            render();
            return;
        }
        if (a === 'vname') { _voiceName = b.getAttribute('data-v') || ''; haptic(); render(); return; }
        if (a === 'brand') { _brandCh = +(b.getAttribute('data-v') || 0); haptic(); render(); return; }
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
            voice_name: _voiceName, channel_id: _brandCh || null,
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
