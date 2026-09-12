(function () {
    'use strict';

    var MAX_TOPIC = 3000, MAX_PHOTOS = 4;
    var _niches = [], _price = 70, _cap = 7, _items = [], _loaded = false;
    var _topic = '', _niche = '', _url = '', _voice = '', _photos = [], _busy = false, _pick = false;

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
        }).join('');
        var add = _photos.length < MAX_PHOTOS
            ? '<button type="button" class="vd-ph-add" data-va="photo"><i class="ti ti-camera-plus"></i>' +
              '<span>' + esc(T('Добавить')) + '</span></button>'
            : '';
        return '<div class="vd-f">' +
            '<div class="vd-lbl">' + esc(T('Фото')) + '</div>' +
            '<div class="vd-hint">' + esc(T('До 4 файлов, JPG или PNG. Если фото есть, кадры ролика берутся из них, а не из фотобанка.')) + '</div>' +
            '<div class="vd-phs">' + thumbs + add + '</div></div>';
    }

    function voiceField() {
        var rows = [['', T('Авто')], ['male', T('Мужской')], ['female', T('Женский')]];
        return '<div class="vd-f">' +
            '<div class="vd-lbl">' + esc(T('Голос')) + '</div>' +
            '<div class="vd-seg">' + rows.map(function (o) {
                return '<button type="button" class="vd-sg' + (_voice === o[0] ? ' on' : '') +
                    '" data-va="voice" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>';
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
            '<textarea class="vd-ta" id="vd-topic" rows="5" maxlength="' + MAX_TOPIC + '" placeholder="' +
            esc(T('Например: как выбрать робот-пылесос для квартиры с животными')) + '">' + esc(_topic) + '</textarea>' +
            '<div class="vd-cnt">' + esc(T('Осталось символов')) + ': ' + left + '</div></div>' +
            nicheField() +
            '<div class="vd-f">' +
            '<div class="vd-lbl">' + esc(T('Ссылка на товар')) + '</div>' +
            '<div class="vd-hint">' + esc(T('Для Wildberries кадры берутся из карточки товара. Ozon и AliExpress закрыты защитой — для них загрузи свои фотографии.')) + '</div>' +
            '<input class="vd-inp" id="vd-url" type="url" inputmode="url" autocomplete="off" value="' +
            esc(_url) + '" placeholder="https://www.wildberries.ru/catalog/...">' + '</div>' +
            photosField() + voiceField() +
            '<div class="vd-note">' + esc(T('Ролик 9:16 со сценарием, кадрами, озвучкой и музыкой. Готовый файл примерно через 5 минут.')) +
            ' ' + esc(T('Лимит в сутки')) + ': ' + _cap + '.</div>' + go + '</div>';
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

    function card(c) {
        var title = (c.title || (c.brief && c.brief.topic) || T('Ролик')).slice(0, 120);
        var src = (c.source_kind === 'brief') ? T('По теме') : T('Из поста');
        var dur = c.duration_s ? Math.round(c.duration_s) + ' ' + T('с') : '';
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
                '"><i class="ti ti-copy"></i> ' + esc(T('Описание для ролика')) + '</button></div>' +
                ((typeof rsCrvCredits === 'function') ? rsCrvCredits(c) : '');
        }
        return '<div class="vd-item"><div class="vd-item-h"><b>' + esc(title) + '</b>' +
            '<span class="vd-tag">' + esc(src) + '</span></div>' + body + '</div>';
    }

    function list() {
        if (!_loaded) return '<div class="vd-load"><div class="cp-spin sm"></div></div>';
        if (!_items.length) {
            return '<div class="vd-empty">' + esc(T('Роликов пока нет. Опиши тему и собери первый.')) + '</div>';
        }
        return '<div class="vd-list">' + _items.map(card).join('') + '</div>';
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
        if (a === 'voice') { _voice = b.getAttribute('data-v') || ''; haptic(); render(); return; }
        if (a === 'photo') { pickPhoto(); return; }
        if (a === 'unphoto') {
            _photos.splice(+b.getAttribute('data-i'), 1);
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
    }

    function pickPhoto() {
        var inp = document.getElementById('vd-file');
        if (!inp) {
            inp = document.createElement('input');
            inp.type = 'file';
            inp.id = 'vd-file';
            inp.accept = 'image/jpeg,image/png,image/webp';
            inp.style.display = 'none';
            document.body.appendChild(inp);
        }
        inp.onchange = function () {
            var f = inp.files && inp.files[0];
            inp.value = '';
            if (!f) return;
            if (f.size > 8 * 1048576) { toast(T('Файл больше 8 МБ'), 'alert-triangle'); return; }
            var fd = new FormData();
            fd.append('file', f);
            fd.append('slot', String(_photos.length));
            toast(T('Загружаю фото'), 'loader');
            apiRequest('/api/v1/creative/brief/photo', { method: 'POST', body: fd })
                .then(function (r) {
                    if (r && r.ok) {
                        _photos.push({ path: r.path, url: r.url });
                        haptic();
                        render();
                    } else toast((r && r.message) || T('Фото не загрузилось'), 'alert-triangle');
                })
                .catch(function () { toast(T('Фото не загрузилось'), 'alert-triangle'); });
        };
        inp.click();
    }

    function build() {
        if (_busy) return;
        var topic = (_topic || '').trim();
        if (topic.length < 12) { toast(T('Опиши тему ролика: минимум одно предложение.'), 'alert-triangle'); return; }
        _busy = true;
        haptic('medium');
        render();
        var body = {
            topic: topic, niche: (_niche || '').trim(), product_url: (_url || '').trim(),
            photos: _photos.map(function (p) { return p.path; }), voice: _voice,
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

    function refreshBalance() {
        try { if (typeof refreshDashboardSilent === 'function') refreshDashboardSilent(); } catch (e) {}
    }

    function load(silent) {
        return apiRequest('/api/v1/creative/mine?limit=30')
            .then(function (r) {
                if (!r || !r.ok) return;
                _items = r.items || [];
                if (r.price) _price = r.price;
                if (r.daily_cap) _cap = r.daily_cap;
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
