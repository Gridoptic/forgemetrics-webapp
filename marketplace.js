(function () {
    'use strict';

    var _screen = null;
    var _closed = false;
    var _channelId = null;
    var _side = 'market';
    var _view = 'cards';
    var _feed = null;
    var _base = null;
    var _feedState = 'idle';
    var _baseState = 'idle';
    var _my = null;
    var _channels = [];
    var _myListings = [];
    var _bookmarks = {};
    var _faqTab = 'terms';

    var COVERS = [
        'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#5DCAA5,#10b981)',
        'linear-gradient(135deg,#F0997B,#ec4899)', 'linear-gradient(135deg,#3b82f6,#06b6d4)',
        'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#8b5cf6,#ec4899)'
    ];
    var COLORS = ['#818cf8', '#5DCAA5', '#F0997B', '#ec4899', '#3b82f6', '#f59e0b', '#a78bfa', '#34d399'];
    var EMOJIS = ['🧬', '🔥', '💪', '🧠', '⚡', '🚀', '💎', '🎯', '📈', '🌿', '❤️', '✨', '🏆', '🎮', '📚', '🌟', '💰', '📊', '👑', '🌈'];
    var STICKERS = ['🐸', '🦊', '🐼', '🚀', '🌙', '🔥', '🎁', '👾', '🦄', '⚽', '🍩', '🎬'];
    var FONTS = [['normal', 'Обычный', 'font-weight:600;'], ['bold', 'Жирный', 'font-weight:800;'], ['wide', 'Широкий', 'font-weight:700;letter-spacing:0.5px;'], ['mono', 'Моно', 'font-family:monospace;font-weight:600;']];
    var FX_MOVE = [['none', 'Без'], ['levit', 'Левитация'], ['pscale', 'Пульс'], ['sway', '3D-наклон'], ['glitch', 'Глитч']];
    var FX_OVER = [['none', 'Без'], ['holo', 'Голограмма'], ['liquid', 'Жидкое золото'], ['rgb', 'RGB-сдвиг']];
    var FX_GLOW = [['none', 'Без'], ['neon', 'Неон'], ['prism', 'Призма'], ['breath', 'Дыхание'], ['aurora', 'Аврора']];
    var FX_ORBIT = [['none', 'Без'], ['comet', 'Комета'], ['atom', 'Атом']];
    var GR = '#5DCAA5', AM = '#f59e0b', RD = '#ef4444';

    var TERMS = [
        ['Подписчики', 'Сколько людей в канале. Само по себе мало значит — каналов с накрученными подписчиками полно. Главное — охват.', '—'],
        ['Охват', 'Сколько человек реально видят один пост. Главное число при оценке: рекламу видит охват, а не все подписчики.', '—'],
        ['Просмотры', 'Счётчик показов поста. Близко к охвату, но один человек может дать несколько просмотров.', '—'],
        ['ER · вовлечённость', 'Насколько живая аудитория: реакции и комментарии к охвату. Низкий ER при больших цифрах — повод насторожиться.', '(реакции+комменты)/охват×100'],
        ['CPM · цена за 1000 показов', 'Сколько стоит донести рекламу до 1000 человек. Главная метрика для сравнения цен — сравнивай CPM, а не голую сумму.', 'цена/охват×1000'],
        ['CPV · цена за показ', 'То же, что CPM, но за один показ. Удобно для грубой прикидки.', 'цена/охват'],
        ['Охват к подписчикам', 'Какая доля подписчиков видит посты. Здоровый канал — заметная доля. 100к подписчиков и 1к охват — тревожный знак.', 'охват/подписчики×100'],
        ['Накрутка', 'Искусственные подписчики или просмотры. Признаки: много подписчиков + крошечный охват, скачки просмотров, нет живых комментариев.', '—'],
        ['ROI · окупаемость', 'Для рекламодателя: вернулась ли реклама прибылью. Считается ПОСЛЕ кампании — заранее никто не гарантирует.', '(доход−расход)/расход×100'],
        ['Маркировка · erid', 'По закону РФ интернет-реклама маркируется и регистрируется в ОРД. На бирже это поле зашито в карточку.', '—']
    ];
    var TIPS = [
        'Смотри на охват и ER, а не на число подписчиков — подписчиков легко накрутить.',
        'Сравнивай цену через CPM (за 1000 показов), а не по абсолютной сумме. Дорогой канал может быть выгоднее дешёвого.',
        'Проверяй охват к подписчикам. Большой канал с крошечным охватом — выброшенные деньги.',
        'Начни с одного небольшого теста. Зашло — масштабируй, нет — потерял мало.',
        'Подбирай канал под свою нишу. Релевантная аудитория важнее размера канала.',
        'Беги от каналов с подозрительными скачками просмотров и без комментариев — почти всегда накрутка.'
    ];

    var _ss = null;
    var _sfmts = null;

    function _esc(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function _num(n) {
        if (n == null || isNaN(n)) return '—';
        return Number(n).toLocaleString('ru-RU');
    }
    function _haptic(kind) {
        try {
            if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) {
                if (kind === 'success' || kind === 'error' || kind === 'warning') tg.HapticFeedback.notificationOccurred(kind);
                else tg.HapticFeedback.impactOccurred(kind || 'light');
            }
        } catch (e) {}
    }
    function apiGet(path) { return apiRequest(path); }
    function apiPost(path, body) {
        var opts = { method: 'POST' };
        if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers = { 'Content-Type': 'application/json' }; }
        return apiRequest(path, opts);
    }
    function apiPatch(path, body) {
        var opts = { method: 'PATCH' };
        if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers = { 'Content-Type': 'application/json' }; }
        return apiRequest(path, opts);
    }
    function apiDelete(path) { return apiRequest(path, { method: 'DELETE' }); }

    function _reachRate(l) {
        if (!l.subscribers || !l.avg_views) return null;
        return Math.round(l.avg_views / l.subscribers * 100);
    }
    function _cpm(l) {
        var p = _firstPrice(l);
        if (!p || !l.avg_views) return null;
        return Math.round(p / l.avg_views * 1000);
    }
    function _firstPrice(l) {
        if (l.formats && l.formats.length) {
            for (var i = 0; i < l.formats.length; i++) if (l.formats[i].price) return l.formats[i].price;
        }
        return null;
    }
    function _coverBg(l) {
        if ((l.cover_type === 'img' || l.cover_type === 'gif') && l.cover_url) return "url('" + l.cover_url + "')";
        if (l.cover_gradient) return l.cover_gradient;
        var idx = (Math.abs(_hash(l.username || '')) % COVERS.length);
        return COVERS[idx];
    }
    function _hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return h; }
    function _accent(l) { return l.accent_color || '#818cf8'; }
    function _isTop(l) {
        if (l.is_vip || l.is_top) return true;
        if (l.top_until && new Date(l.top_until) > new Date()) return true;
        return false;
    }
    function _isBoost(l) { return !!(l.boost_until && new Date(l.boost_until) > new Date()); }
    function _attach(l, zone) {
        var a = l.emoji_attachments_json || l.emoji_attachments || {};
        var v = a[zone];
        if (!v) return zone === 'avatar' || zone === 'cover' ? '' : [];
        return v;
    }

    function ensureScreen() {
        var stale = document.getElementById('mkt-screen');
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
        var el = document.createElement('div');
        el.id = 'mkt-screen';
        var appRoot = document.getElementById('app') || document.body;
        appRoot.appendChild(el);
        _screen = el;
        return el;
    }

    function open(channelId) {
        _closed = false;
        _channelId = channelId || _channelId;
        ensureScreen();
        if (typeof tg !== 'undefined' && tg && tg.BackButton) {
            tg.BackButton.offClick(close);
            tg.BackButton.onClick(close);
            tg.BackButton.show();
        }
        _side = 'market'; _view = 'cards';
        renderShell();
        loadBookmarks();
        loadFeed();
    }
    function close() {
        _closed = true;
        if (typeof tg !== 'undefined' && tg && tg.BackButton) {
            tg.BackButton.offClick(close);
            tg.BackButton.hide();
        }
        var el = document.getElementById('mkt-screen');
        if (el && el.parentNode) el.parentNode.removeChild(el);
        _screen = null;
    }

    function loadFeed() {
        _feedState = 'loading';
        renderBody();
        apiGet('/api/v1/marketplace/listings').then(function (r) {
            _feed = (r && r.listings) ? r.listings : (Array.isArray(r) ? r : []);
            _feedState = 'ready';
            if (_side === 'market') renderBody();
        }).catch(function () {
            _feed = [];
            _feedState = 'error';
            if (_side === 'market') renderBody();
        });
    }
    function loadBase() {
        _baseState = 'loading';
        renderBody();
        apiGet('/api/v1/marketplace/base').then(function (r) {
            _base = (r && r.channels) ? r.channels : (Array.isArray(r) ? r : []);
            _baseState = 'ready';
            if (_side === 'base') renderBody();
        }).catch(function () {
            _base = [];
            _baseState = 'error';
            if (_side === 'base') renderBody();
        });
    }
    function loadMy() {
        return apiGet('/api/v1/marketplace/my').then(function (r) {
            _my = r || null;
            return r;
        }).catch(function () { _my = null; return null; });
    }
    function loadBookmarks() {
        apiGet('/api/v1/marketplace/bookmarks').then(function (r) {
            var arr = (r && r.bookmarks) ? r.bookmarks : [];
            _bookmarks = {};
            arr.forEach(function (b) { _bookmarks[b.username] = true; });
            updateBmCount();
            if (_side === 'market' || _side === 'base') renderBody();
        }).catch(function () {});
    }

    function renderShell() {
        _screen.innerHTML =
            '<div class="mkt-head"><div class="mkt-head-ic"><i class="ti ti-building-store"></i></div>' +
            '<div style="flex:1;"><h1>Площадка ForgeMetrics</h1><p>Биржа рекламы в Telegram-каналах</p></div>' +
            '<button class="mkt-iconbtn" id="mkt-bmBtn"><i class="ti ti-star"></i> <span id="mkt-bmCount">0</span></button></div>' +
            '<div class="mkt-sides-row"><div class="mkt-sides">' +
            '<button class="mkt-side mkt-on" data-side="market"><i class="ti ti-building-store"></i> Площадка</button>' +
            '<button class="mkt-side" data-side="base"><i class="ti ti-database"></i> База</button>' +
            '<button class="mkt-side" data-side="studio"><i class="ti ti-palette"></i> Оформить</button>' +
            '</div><button class="mkt-faqbtn" id="mkt-faqOpen"><i class="ti ti-help-circle"></i> Справка</button></div>' +
            '<div id="mkt-sidenote" class="mkt-sidenote"></div>' +
            '<div class="mkt-toolbar" id="mkt-toolbar">' +
            '<div class="mkt-search"><i class="ti ti-search"></i> Поиск по теме…</div>' +
            '<button class="mkt-promobtn" id="mkt-promoOpen"><i class="ti ti-rocket"></i> Продвинуть</button>' +
            '<div class="mkt-viewtog"><button class="mkt-vt mkt-on" data-view="cards"><i class="ti ti-layout-grid"></i> Карточки</button>' +
            '<button class="mkt-vt" data-view="list"><i class="ti ti-list"></i> Список</button></div></div>' +
            '<div id="mkt-body"></div>' +
            '<div class="mkt-mbg" id="mkt-modalBg"><div class="mkt-modal" id="mkt-modalContent"></div></div>' +
            '<div class="mkt-mbg" id="mkt-promoBg"><div class="mkt-modal" id="mkt-promoContent"></div></div>' +
            '<div class="mkt-mbg" id="mkt-faqBg"><div class="mkt-modal" id="mkt-faqContent"></div></div>' +
            '<div class="mkt-mbg" id="mkt-bmBg"><div class="mkt-modal" style="max-width:420px;"><div style="padding:16px;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><div style="font-size:15px;font-weight:600;"><i class="ti ti-star" style="color:var(--mkt-am);"></i> Избранное</div>' +
            '<button class="mkt-mclose" style="position:static;" id="mkt-bmClose"><i class="ti ti-x"></i></button></div><div id="mkt-bmList"></div></div></div></div>';

        bindShell();
        setSide('market');
    }

    function bindShell() {
        _screen.querySelectorAll('.mkt-side').forEach(function (b) {
            b.addEventListener('click', function () { setSide(b.getAttribute('data-side'), b); });
        });
        _screen.querySelectorAll('.mkt-vt').forEach(function (b) {
            b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
        });
        byId('mkt-faqOpen').addEventListener('click', openFaq);
        byId('mkt-promoOpen').addEventListener('click', openPromo);
        byId('mkt-bmBtn').addEventListener('click', openBm);
        byId('mkt-bmClose').addEventListener('click', function () { hide('mkt-bmBg'); });
        ['mkt-modalBg', 'mkt-promoBg', 'mkt-faqBg', 'mkt-bmBg'].forEach(function (id) {
            byId(id).addEventListener('click', function (e) { if (e.target === this) this.classList.remove('mkt-show'); });
        });
    }
    function byId(id) { return document.getElementById(id); }
    function hide(id) { var e = byId(id); if (e) e.classList.remove('mkt-show'); }
    function show(id) { var e = byId(id); if (e) e.classList.add('mkt-show'); }

    function setSide(s, el) {
        _side = s;
        _screen.querySelectorAll('.mkt-side').forEach(function (b) { b.classList.toggle('mkt-on', b.getAttribute('data-side') === s); });
        var studio = (s === 'studio');
        byId('mkt-toolbar').style.display = studio ? 'none' : '';
        var note = byId('mkt-sidenote');
        if (studio) { note.style.display = 'none'; }
        else {
            note.style.display = '';
            if (s === 'market') { note.className = 'mkt-sidenote'; note.style.cssText = 'color:var(--mkt-gr);background:var(--mkt-gr-bg);border:0.5px solid var(--mkt-gr-bd);font-size:11px;line-height:1.45;border-radius:10px;padding:9px 11px;margin-bottom:12px;'; note.innerHTML = '<i class="ti ti-info-circle"></i> Оформленные карточки от владельцев. Цена названа, метрики проверены ботом.'; }
            else { note.style.cssText = 'color:var(--mkt-pu4);background:var(--mkt-pu-bg);border:0.5px solid var(--mkt-pu-bd);font-size:11px;line-height:1.45;border-radius:10px;padding:9px 11px;margin-bottom:12px;'; note.innerHTML = '<i class="ti ti-info-circle"></i> Спарсенная база каналов (TGStat). Без оформления — цена это оценка бота, контакт пишешь сам.'; }
        }
        if (s === 'base' && _base === null && _baseState === 'idle') loadBase();
        if (studio) { mountStudio(); } else { renderBody(); }
    }
    function setView(v) {
        _view = v;
        _screen.querySelectorAll('.mkt-vt').forEach(function (b) { b.classList.toggle('mkt-on', b.getAttribute('data-view') === v); });
        renderBody();
    }

    function emptyState(icon, title, sub) {
        return '<div style="text-align:center;padding:48px 16px;color:var(--mkt-tx2);"><i class="ti ' + icon + '" style="font-size:40px;opacity:0.3;"></i>' +
            '<div style="font-size:14px;font-weight:600;margin-top:12px;color:var(--mkt-tx);">' + _esc(title) + '</div>' +
            '<div style="font-size:12px;margin-top:6px;line-height:1.5;max-width:300px;margin-left:auto;margin-right:auto;">' + _esc(sub) + '</div></div>';
    }
    function loadingState() {
        return '<div style="text-align:center;padding:48px 16px;color:var(--mkt-tx2);"><i class="ti ti-loader-2" style="font-size:32px;opacity:0.5;"></i><div style="font-size:12px;margin-top:12px;">Загружаю…</div></div>';
    }

    function renderBody() {
        var body = byId('mkt-body');
        if (!body) return;
        if (_side === 'market') {
            if (_feedState === 'loading') { body.innerHTML = loadingState(); return; }
            if (_feedState === 'error') { body.innerHTML = emptyState('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и попробуй ещё раз.'); return; }
            if (!_feed || !_feed.length) { body.innerHTML = emptyState('ti-building-store', 'Пока пусто', 'Здесь появятся оформленные карточки каналов. Оформи свой канал во вкладке «Оформить».'); return; }
            body.innerHTML = '<div class="mkt-disc">Площадка — оформленные карточки от владельцев. Совпадение и справедливая цена — оценки бота.</div>' +
                (_view === 'cards' ? '<div class="mkt-grid mkt-cards">' + _feed.map(cardFull).join('') + '</div>' : '<div class="mkt-list">' + _feed.map(listRow).join('') + '</div>');
            bindFeed();
            return;
        }
        if (_side === 'base') {
            if (_baseState === 'loading') { body.innerHTML = loadingState(); return; }
            if (_baseState === 'error') { body.innerHTML = emptyState('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и попробуй ещё раз.'); return; }
            if (!_base || !_base.length) { body.innerHTML = emptyState('ti-database-off', 'База наполняется', 'Скоро здесь будут спарсенные каналы по твоей нише.'); return; }
            body.innerHTML = (_view === 'cards' ? '<div class="mkt-grid mkt-cards">' + _base.map(baseCard).join('') + '</div>' : '<div class="mkt-list">' + _base.map(listRow).join('') + '</div>');
            bindFeed();
            return;
        }
    }

    function badgeHtml(b) {
        var m = { match: ['mkt-b-match', 'ti-target-arrow', 'В точку'], live: ['mkt-b-live', 'ti-plant-2', 'Живой'], safe: ['mkt-b-safe', 'ti-shield-check', 'Безопасный'], big: ['mkt-b-big', 'ti-crown', 'Крупный'], risk: ['mkt-b-risk', 'ti-alert-triangle', 'Риск'] };
        var x = m[b];
        return x ? '<span class="mkt-badge ' + x[0] + '"><i class="ti ' + x[1] + '"></i>' + x[2] + '</span>' : '';
    }
    function badgesOf(l) {
        if (l.badges && l.badges.length) return l.badges.map(badgeHtml).join('');
        var out = [];
        var rr = _reachRate(l);
        if (rr != null && rr >= 10) out.push(badgeHtml('live'));
        if (l.subscribers && l.subscribers >= 100000) out.push(badgeHtml('big'));
        return out.join('');
    }
    function spark(views, col) {
        var arr = [], i;
        for (i = 0; i < 8; i++) arr.push(0.7 + Math.sin(i * 1.1) * 0.15 + i * 0.02);
        var w = 54, h = 18, mx = Math.max.apply(null, arr), mn = Math.min.apply(null, arr);
        var pts = arr.map(function (v, i) { return (i / 7 * w).toFixed(1) + ',' + (h - ((v - mn) / ((mx - mn) || 1)) * (h - 3) - 1.5).toFixed(1); }).join(' ');
        return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    function mstrip(l) {
        var out = [];
        if (l.er != null) out.push('<span class="mkt-mpill"><i class="ti ti-bolt"></i>ER <b>' + l.er + '%</b></span>');
        var cpm = _cpm(l);
        if (cpm != null) out.push('<span class="mkt-mpill"><i class="ti ti-coin"></i>CPM <b>' + cpm + '₽</b></span>');
        var rr = _reachRate(l);
        if (rr != null) out.push('<span class="mkt-mpill' + (rr < 10 ? ' mkt-warn' : '') + '"><i class="ti ti-users"></i>охват/подп <b>' + rr + '%</b></span>');
        return out.length ? '<div class="mkt-mstrip">' + out.join('') + '</div>' : '';
    }
    function avBox(letter, accent) {
        return '<div class="mkt-av-stage"><div class="mkt-av" style="border-color:' + accent + '">' + _esc(letter) + '</div></div>';
    }
    function priceFrom(l) {
        var p = _firstPrice(l);
        return p ? _num(p) + ' ₽' : 'по запросу';
    }

    function cardFull(l) {
        var top = _isTop(l), boost = _isBoost(l) && !top;
        var accent = top ? '#f5bf4f' : _accent(l);
        var star = _bookmarks[l.username] ? ' mkt-on' : '';
        var cls = 'mkt-card' + (top ? ' mkt-prem' : '') + (boost ? ' mkt-boost' : '');
        var tag = top ? '<div class="mkt-cover-tag mkt-tag-prem"><i class="ti ti-rocket"></i>Топ месяца</div>'
            : (boost ? '<div class="mkt-cover-tag mkt-tag-boost"><i class="ti ti-bolt"></i>Поднято</div>' : '<div class="mkt-cover-tag mkt-tag-sale"><i class="ti ti-circle-check-filled"></i>на продаже</div>');
        var coverEm = _attach(l, 'cover') ? '<div class="mkt-cover-em"><span>' + _attach(l, 'cover') + '</span></div>' : '';
        var bodyAtt = (_attach(l, 'body') || []).length ? '<div class="mkt-cattach">' + (_attach(l, 'body')).map(function (e) { return '<span>' + e + '</span>'; }).join('') + '</div>' : '';
        var glass = top;
        var t = l.title || l.username || '?';
        return '<div class="' + cls + '" data-u="' + _esc(l.username) + '">' +
            '<div class="mkt-cover"><div class="mkt-cover-bg mkt-cover-breathe" style="background:' + _coverBg(l) + ';background-size:cover;background-position:center;"></div><div class="mkt-cover-scrim"></div>' + tag + coverEm +
            '<button class="mkt-star' + star + '" data-bm="' + _esc(l.username) + '"><i class="ti ti-star' + (star ? '-filled' : '') + '"></i></button></div>' +
            '<div class="mkt-cbody"><div class="mkt-crow"><div class="mkt-cavbox">' + avBox(t.charAt(0), accent) + '</div>' +
            '<div class="mkt-namebox"><div class="mkt-cname-row"><span class="mkt-cname">' + _esc(t) + '</span><i class="ti ti-rosette-discount-check-filled mkt-seal"></i></div>' +
            '<div class="mkt-cmeta">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div>' + bodyAtt + '</div></div>' +
            '<div class="mkt-badges">' + badgesOf(l) + '</div>' +
            (l.custom_text ? '<div class="mkt-desc">' + _esc(l.custom_text) + '</div>' : '') +
            '<div class="mkt-metrics"><div><div class="mkt-m-lbl">Цена от</div><div class="mkt-m-price" style="color:' + accent + '">' + priceFrom(l) + '</div></div>' +
            '<div><div class="mkt-m-lbl"><i class="ti ti-eye"></i>Охват</div><div class="mkt-m-val">~' + _num(l.avg_views) + '</div></div>' +
            '<div class="mkt-spark"><div class="mkt-m-lbl">Просмотры</div>' + spark(l.avg_views, accent) + '</div></div>' + mstrip(l) +
            '<div class="mkt-acts"><button class="mkt-btn ' + (glass ? 'mkt-btn-glass' : 'mkt-btn-g') + '" data-act="expand" data-u="' + _esc(l.username) + '"><i class="ti ti-arrow-up-right"></i>Развернуть</button>' +
            '<button class="mkt-btn ' + (glass ? 'mkt-btn-glass-gold' : 'mkt-btn-p') + '" data-act="write" data-u="' + _esc(l.username) + '"><i class="ti ti-brand-telegram"></i>Написать</button></div>' +
            '</div></div>';
    }

    function baseCard(l) {
        var accent = _accent(l);
        var star = _bookmarks[l.username] ? ' mkt-on' : '';
        var t = l.title || l.username || '?';
        var rr = _reachRate(l);
        return '<div class="mkt-bcard" data-u="' + _esc(l.username) + '"><div class="mkt-brow"><div class="mkt-bav" style="background:linear-gradient(135deg,' + accent + ',' + accent + '99);">' + _esc(t.charAt(0)) + '</div>' +
            '<div style="flex:1;min-width:0;"><div class="mkt-bname">' + _esc(t) + '</div><div class="mkt-bmeta">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div></div>' +
            '<button class="mkt-star" style="position:static;background:rgba(255,255,255,0.05);' + (star ? 'color:var(--mkt-am);' : '') + '" data-bm="' + _esc(l.username) + '"><i class="ti ti-star' + (star ? '-filled' : '') + '"></i></button></div>' +
            '<div class="mkt-badges">' + badgesOf(l) + '</div>' +
            (rr != null ? '<div class="mkt-mstrip">' + (l.er != null ? '<span class="mkt-mpill"><i class="ti ti-bolt"></i>ER <b>' + l.er + '%</b></span>' : '') + '<span class="mkt-mpill' + (rr < 10 ? ' mkt-warn' : '') + '"><i class="ti ti-users"></i>охват/подп <b>' + rr + '%</b></span></div>' : '') +
            '<div class="mkt-bmetrics"><div><div class="mkt-m-lbl">Оценка цены</div><div class="mkt-m-val" style="font-size:12px;">' + _esc(l.price_estimate || 'по запросу') + '</div></div>' +
            '<div><div class="mkt-m-lbl"><i class="ti ti-eye"></i>Охват</div><div class="mkt-m-val">~' + _num(l.avg_views) + '</div></div><div class="mkt-spark">' + spark(l.avg_views, GR) + '</div></div>' +
            '<div class="mkt-acts"><button class="mkt-btn mkt-btn-p" data-act="write" data-u="' + _esc(l.username) + '"><i class="ti ti-brand-telegram"></i>Написать</button></div></div>';
    }

    function listRow(l) {
        var mkt = (_side === 'market');
        var top = mkt && _isTop(l);
        var star = _bookmarks[l.username] ? ' mkt-on' : '';
        var t = l.title || l.username || '?';
        var price = priceFrom(l);
        var le = mkt && (_attach(l, 'list') || []).length ? '<span class="mkt-lemoji">' + (_attach(l, 'list')).join('') + '</span>' : '';
        var premIc = top ? '<i class="ti ti-rocket mkt-lprem-ic"></i>' : '';
        var col = GR;
        return '<div class="mkt-lrow' + (top ? ' mkt-prem' : '') + '" data-u="' + _esc(l.username) + '"><div class="mkt-lhead" data-act="row" data-u="' + _esc(l.username) + '">' +
            '<span class="mkt-ldot" style="background:' + col + '"></span><div class="mkt-lmain"><div class="mkt-lname-row">' + premIc + '<span class="mkt-lname">' + _esc(t) + '</span>' + le + '</div>' +
            '<div class="mkt-lsub"><span>@' + _esc(l.username) + '</span><span class="mkt-lreach"><i class="ti ti-eye" style="font-size:11px;"></i> ' + _num(l.avg_views) + '</span>' + (l.er != null ? '<span class="mkt-ler">ER ' + l.er + '%</span>' : '') + '</div></div>' +
            '<span class="mkt-lprice">' + price + '</span><i class="ti ti-chevron-down mkt-lchev"></i></div>' +
            '<div class="mkt-lexp"><div class="mkt-lexp-in"><div class="mkt-badges" style="margin-top:10px;">' + badgesOf(l) + '</div>' +
            '<div class="mkt-acts" style="margin-top:11px;">' + (mkt ? '<button class="mkt-btn mkt-btn-p" data-act="expand" data-u="' + _esc(l.username) + '"><i class="ti ti-arrow-up-right"></i>Развернуть</button>' : '<button class="mkt-btn mkt-btn-p" data-act="write" data-u="' + _esc(l.username) + '"><i class="ti ti-brand-telegram"></i>Написать</button>') +
            '<button class="mkt-btn mkt-btn-g" data-bm="' + _esc(l.username) + '"><i class="ti ti-star' + (star ? '-filled' : '') + '"></i>' + (star ? 'В избранном' : 'В закладки') + '</button></div></div></div></div>';
    }

    function bindFeed() {
        var body = byId('mkt-body');
        body.querySelectorAll('[data-bm]').forEach(function (b) {
            b.addEventListener('click', function (e) { e.stopPropagation(); toggleBm(b.getAttribute('data-bm')); });
        });
        body.querySelectorAll('[data-act]').forEach(function (b) {
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                var act = b.getAttribute('data-act'), u = b.getAttribute('data-u');
                if (act === 'expand') openListing(u);
                else if (act === 'write') openTelegramUser(u);
                else if (act === 'row') toggleRow(u);
            });
        });
    }
    function findListing(u) {
        var all = (_feed || []).concat(_base || []);
        for (var i = 0; i < all.length; i++) if (all[i].username === u) return all[i];
        return null;
    }
    function toggleRow(u) {
        var rows = _screen.querySelectorAll('.mkt-lrow');
        rows.forEach(function (r) { if (r.getAttribute('data-u') !== u) r.classList.remove('mkt-open'); });
        var row = _screen.querySelector('.mkt-lrow[data-u="' + (window.CSS && CSS.escape ? CSS.escape(u) : u) + '"]');
        if (row) row.classList.toggle('mkt-open');
    }
    function openTelegramUser(u) {
        var url = 'https://t.me/' + u;
        try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) { tg.openTelegramLink(url); return; } } catch (e) {}
        window.open(url, '_blank');
    }

    function openListing(u) {
        var l = findListing(u);
        if (!l) return;
        var accent = _accent(l);
        var fmts = (l.formats || []).map(function (f) {
            var unit = (f.unit && f.unit !== 'RUB') ? (' ' + f.unit) : '';
            return '<div class="mkt-fmt-row"><span>' + _esc(f.label || f.format) + '</span><span class="mkt-fmt-price">' + _num(f.price) + ' ₽' + unit + '</span></div>';
        }).join('');
        var cpm = _cpm(l), cpmMkt = l.cpm_market || null;
        var calc = '';
        if (cpm != null) {
            var over = cpmMkt != null && cpm > cpmMkt;
            calc = '<div class="mkt-calc"><div class="mkt-calc-t"><i class="ti ti-calculator"></i> Разбор цены (только тебе)</div>' +
                '<div class="mkt-calc-line"><span>Цена за 1000 показов (CPM)</span><span>' + cpm + ' ₽</span></div>' +
                (cpmMkt != null ? '<div class="mkt-calc-line"><span>Средняя по нише</span><span>' + cpmMkt + ' ₽</span></div>' : '') +
                (cpmMkt != null ? (over ? '<div class="mkt-calc-line mkt-hi"><span>Переплата к рынку</span><span>+' + Math.round((cpm / cpmMkt - 1) * 100) + '%</span></div>' : '<div class="mkt-calc-line mkt-lo"><span>Выгода к рынку</span><span>−' + Math.round((1 - cpm / cpmMkt) * 100) + '%</span></div>') : '') +
                '<div style="font-size:10.5px;color:var(--mkt-tx3);margin-top:8px;line-height:1.4;">При охвате ~' + _num(l.avg_views) + ' ты платишь ' + cpm + '₽ за 1000 показов.</div></div>';
        }
        var fair = (l.fair_lo && l.fair_hi) ? '<div class="mkt-fair"><i class="ti ti-scale"></i> Справедливая вилка бота: <b>' + _num(l.fair_lo) + '–' + _num(l.fair_hi) + ' ₽</b>.</div>' : '';
        byId('mkt-modalContent').innerHTML = '<button class="mkt-mclose" data-close="mkt-modalBg"><i class="ti ti-x"></i></button>' +
            '<div class="mkt-mcover" style="background:' + _coverBg(l) + ';background-size:cover;background-position:center;"><div class="mkt-cover-scrim"></div>' +
            '<div style="padding:14px;position:relative;z-index:2;"><div style="font-size:18px;font-weight:700;color:#fff;">' + _esc(l.title || l.username) + '</div><div style="font-size:11px;color:rgba(255,255,255,0.85);">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div></div></div>' +
            '<div class="mkt-mbody"><div class="mkt-badges" style="margin-bottom:10px;">' + badgesOf(l) + '</div>' + mstrip(l) +
            (l.custom_text ? '<div class="mkt-author" style="margin-top:12px;">' + _esc(l.custom_text) + '</div>' : '') +
            (fmts ? '<div style="font-size:12px;font-weight:600;margin:12px 0 8px;">Форматы и цены:</div>' + fmts : '') + fair + calc +
            (l.slots_note ? '<div style="font-size:11.5px;color:var(--mkt-gr);margin-top:10px;"><i class="ti ti-calendar-check"></i> ' + _esc(l.slots_note) + '</div>' : '') +
            '<div class="mkt-acts" style="margin-top:14px;"><button class="mkt-btn mkt-btn-g" data-bm="' + _esc(l.username) + '"><i class="ti ti-star"></i>В закладки</button>' +
            '<button class="mkt-btn mkt-btn-p" data-act="write" data-u="' + _esc(l.username) + '"><i class="ti ti-brand-telegram"></i>Написать владельцу</button></div></div>';
        byId('mkt-modalContent').querySelector('[data-close]').addEventListener('click', function () { hide('mkt-modalBg'); });
        byId('mkt-modalContent').querySelectorAll('[data-bm]').forEach(function (b) { b.addEventListener('click', function () { toggleBm(b.getAttribute('data-bm')); }); });
        byId('mkt-modalContent').querySelectorAll('[data-act="write"]').forEach(function (b) { b.addEventListener('click', function () { openTelegramUser(b.getAttribute('data-u')); }); });
        show('mkt-modalBg');
    }

    function openPromo() {
        byId('mkt-promoContent').innerHTML = '<button class="mkt-mclose" data-close><i class="ti ti-x"></i></button>' +
            '<div class="mkt-mbody"><div style="font-size:17px;font-weight:700;letter-spacing:-0.3px;margin-bottom:4px;"><i class="ti ti-rocket" style="color:var(--mkt-gold);"></i> Продвинуть карточку</div>' +
            '<div style="font-size:11.5px;color:var(--mkt-tx2);line-height:1.5;margin-bottom:14px;">Продвижение поднимает карточку в умной сортировке топа. Выше в топе — больше рекламодателей видят. Топ всегда смешанный, не «всё выкуплено».</div>' +
            '<div class="mkt-promo-opt"><div class="mkt-po-top"><div class="mkt-po-name"><i class="ti ti-bolt" style="color:var(--mkt-pu4);"></i> Поднятие 24 часа</div><div class="mkt-po-price">490 ₽</div></div><div class="mkt-po-li"><i class="ti ti-arrow-up"></i> В умную сортировку топа на 24 часа.</div><div class="mkt-po-li"><i class="ti ti-minus"></i> Без визуальных эффектов.</div><button class="mkt-po-buy mkt-g1" data-buy="24">Поднять на 24ч</button></div>' +
            '<div class="mkt-promo-opt"><div class="mkt-po-top"><div class="mkt-po-name"><i class="ti ti-bolt" style="color:var(--mkt-pu4);"></i> Поднятие 48 часов</div><div class="mkt-po-price">1 390 ₽</div></div><div class="mkt-po-li"><i class="ti ti-arrow-up"></i> То же, на 48 часов.</div><div class="mkt-po-li"><i class="ti ti-minus"></i> Без визуальных эффектов.</div><button class="mkt-po-buy mkt-g1" data-buy="48">Поднять на 48ч</button></div>' +
            '<div class="mkt-limit-note"><i class="ti ti-info-circle"></i> Лимит: поднятия 24ч и 48ч <b>вместе не больше 3 раз за 30 дней</b> (комбинируются).</div>' +
            '<div class="mkt-promo-opt mkt-gold"><div class="mkt-po-top"><div class="mkt-po-name"><i class="ti ti-rocket" style="color:var(--mkt-gold);"></i> Продвижение 30 дней<span style="font-size:9px;font-weight:700;color:#231600;background:linear-gradient(135deg,#f5bf4f,#d4a017);padding:2px 7px;border-radius:99px;">ТОП</span></div><div class="mkt-po-price mkt-gold">29 990 ₽</div></div>' +
            '<div class="mkt-po-li mkt-gold"><i class="ti ti-arrow-up"></i> Умная сортировка топа с <b>приоритетом</b> — 30 дней, максимум показов.</div>' +
            '<div class="mkt-po-li mkt-gold"><i class="ti ti-sparkles"></i> Эксклюзивное дорогое оформление: золотое свечение карточки, эффекты <b>Свечение</b> и <b>Орбита</b>, стеклянные кнопки, премиум-фон.</div>' +
            '<div class="mkt-po-li mkt-gold"><i class="ti ti-circle-check"></i> Не входит в лимит 3 поднятий.</div>' +
            '<button class="mkt-po-buy mkt-gold" data-buy="top">Оформить продвижение 30 дней</button></div>' +
            '<div style="font-size:10.5px;color:var(--mkt-tx3);line-height:1.5;margin-top:6px;text-align:center;">Оплата за место в ленте и оформление. Сделка с рекламодателем — напрямую в Telegram.</div></div>';
        byId('mkt-promoContent').querySelector('[data-close]').addEventListener('click', function () { hide('mkt-promoBg'); });
        byId('mkt-promoContent').querySelectorAll('[data-buy]').forEach(function (b) { b.addEventListener('click', function () { _haptic('light'); alert('Оплата продвижения (' + b.getAttribute('data-buy') + ') — подключим биллинг.'); }); });
        show('mkt-promoBg');
    }

    function openFaq() { renderFaq(); show('mkt-faqBg'); }
    function renderFaq() {
        var body;
        if (_faqTab === 'terms') {
            body = TERMS.map(function (t) { return '<div class="mkt-term"><div class="mkt-term-h">' + _esc(t[0]) + (t[2] !== '—' ? '<span class="mkt-f">' + _esc(t[2]) + '</span>' : '') + '</div><div class="mkt-term-d">' + _esc(t[1]) + '</div></div>'; }).join('') +
                '<div class="mkt-tg-note"><i class="ti ti-info-circle"></i> Ориентиры «хорошо / плохо» по конкретным цифрам по нише подтянем из TGStat.</div>';
        } else {
            body = TIPS.map(function (t) { return '<div class="mkt-tip"><i class="ti ti-circle-check"></i><span>' + _esc(t) + '</span></div>'; }).join('');
        }
        byId('mkt-faqContent').innerHTML = '<button class="mkt-mclose" data-close><i class="ti ti-x"></i></button>' +
            '<div class="mkt-mbody"><div style="font-size:17px;font-weight:700;letter-spacing:-0.3px;margin-bottom:4px;"><i class="ti ti-help-circle" style="color:var(--mkt-pu4);"></i> Справка — простыми словами</div>' +
            '<div style="font-size:11.5px;color:var(--mkt-tx2);line-height:1.5;margin-bottom:14px;">Для тех, кто далёк от рекламы. Что значат цифры и как не слить деньги.</div>' +
            '<div class="mkt-faq-tabs"><button class="mkt-faq-tab' + (_faqTab === 'terms' ? ' mkt-on' : '') + '" data-tab="terms">Метрики</button><button class="mkt-faq-tab' + (_faqTab === 'tips' ? ' mkt-on' : '') + '" data-tab="tips">Как рекламироваться</button></div>' + body + '</div>';
        byId('mkt-faqContent').querySelector('[data-close]').addEventListener('click', function () { hide('mkt-faqBg'); });
        byId('mkt-faqContent').querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { _faqTab = b.getAttribute('data-tab'); renderFaq(); }); });
    }

    function toggleBm(u) {
        if (!u) return;
        _haptic('light');
        if (_bookmarks[u]) {
            delete _bookmarks[u];
            apiDelete('/api/v1/marketplace/bookmarks/' + encodeURIComponent(u)).catch(function () {});
        } else {
            _bookmarks[u] = true;
            apiPost('/api/v1/marketplace/bookmarks', { username: u, source: _side === 'base' ? 'base' : 'market' }).catch(function () {});
        }
        updateBmCount();
        if (_side === 'market' || _side === 'base') renderBody();
    }
    function updateBmCount() {
        var n = Object.keys(_bookmarks).length;
        var c = byId('mkt-bmCount'); if (c) c.textContent = n;
        var b = byId('mkt-bmBtn'); if (b) b.classList.toggle('mkt-has', n > 0);
    }
    function openBm() {
        var keys = Object.keys(_bookmarks);
        byId('mkt-bmList').innerHTML = keys.length ? keys.map(function (u) {
            var l = findListing(u) || { username: u, title: u };
            return '<div style="display:flex;align-items:center;gap:10px;padding:11px 12px;background:var(--mkt-card2);border:0.5px solid var(--mkt-bd);border-radius:10px;margin-bottom:7px;"><span class="mkt-ldot" style="background:var(--mkt-gr)"></span>' +
                '<div style="flex:1;"><div style="font-size:13px;font-weight:600;">' + _esc(l.title || u) + '</div><div class="mkt-lsub">@' + _esc(u) + '</div></div>' +
                '<button data-del="' + _esc(u) + '" style="width:30px;height:30px;border-radius:8px;border:0.5px solid rgba(239,68,68,0.25);background:transparent;color:var(--mkt-rd);cursor:pointer;"><i class="ti ti-trash"></i></button></div>';
        }).join('') : '<div style="text-align:center;padding:30px;color:var(--mkt-tx2);font-size:12.5px;"><i class="ti ti-star" style="font-size:32px;opacity:0.3;"></i><div style="margin-top:8px;">Пусто. Жми ★ на карточках.</div></div>';
        byId('mkt-bmList').querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { toggleBm(b.getAttribute('data-del')); openBm(); }); });
        show('mkt-bmBg');
    }

    function defaultState() {
        return {
            cover: 1, covType: 'grad', avatar: 'tg', avEmoji: '🧬', color: '#5DCAA5', font: 'bold',
            move: 'levit', over: 'none', glow: 'none', orbit: 'none', atomColor: '#5DCAA5',
            glowCard: false, glass: false, tgZone: 'cover', tgTab: 'emoji',
            att: { avatar: '', cover: '', body: [], list: [] }, listingId: null, channelId: _channelId
        };
    }
    function defaultFmts() {
        return [
            { on: true, format: 'feed_native', n: 'Размещение в ленте', p: 5500, u: '₽' },
            { on: false, format: 'pinned', n: 'Закреплённое', p: 8000, u: '₽' },
            { on: false, format: 'stories', n: 'В сторис', p: 18, u: '₽/1000' },
            { on: false, format: 'circle', n: 'В кружке', p: 3000, u: '₽' }
        ];
    }

    function loadChannels() {
        return apiGet('/api/v1/channels').then(function (r) {
            var arr = (r && r.channels) ? r.channels : [];
            _channels = arr.filter(function (c) { return c.username; });
            return _channels;
        }).catch(function () { _channels = []; return []; });
    }
    function loadMyListings() {
        return apiGet('/api/v1/marketplace/my').then(function (r) {
            _myListings = (r && r.listings) ? r.listings : [];
            return _myListings;
        }).catch(function () { _myListings = []; return []; });
    }
    function _channelById(id) {
        for (var i = 0; i < _channels.length; i++) if (_channels[i].id === id) return _channels[i];
        return null;
    }
    function _listingForChannel(chId) {
        var ch = _channelById(chId);
        if (!ch || !ch.username) return null;
        for (var j = 0; j < _myListings.length; j++) {
            var u = _myListings[j].username;
            if (u && u.toLowerCase() === ch.username.toLowerCase()) return _myListings[j];
        }
        return null;
    }
    function channelSelectorHtml() {
        var opts = _channels.map(function (c) {
            var mark = _listingForChannel(c.id) ? ' ✓' : '';
            return '<option value="' + c.id + '"' + (c.id === _ss.channelId ? ' selected' : '') + '>@' + _esc(c.username) + (c.title ? ' — ' + _esc(c.title) : '') + mark + '</option>';
        }).join('');
        var listing = _listingForChannel(_ss.channelId);
        var note = listing ? ('Редактируешь карточку · статус: ' + _esc(listing.status_human || listing.status || '—')) : 'Новое размещение для этого канала';
        return '<div class="mkt-chsel" style="margin-bottom:14px;"><span class="mkt-lbl">Канал для размещения</span>' +
            '<select id="mkt-chSel" class="mkt-inp" style="width:100%;">' + opts + '</select>' +
            '<div style="font-size:11px;color:var(--mkt-tx2);margin-top:6px;">' + note + '</div></div>';
    }
    function selectChannel(chId) {
        _ss = defaultState();
        _sfmts = defaultFmts();
        _ss.channelId = chId;
        var listing = _listingForChannel(chId);
        if (listing) hydrateStudio(listing);
        _ss.channelId = chId;
        renderStudio();
    }
    function mountStudio() {
        byId('mkt-body').innerHTML = '<div style="text-align:center;padding:48px 16px;color:var(--mkt-tx2);"><i class="ti ti-loader-2" style="font-size:28px;opacity:0.5;"></i><div style="font-size:12px;margin-top:10px;">Загружаю студию…</div></div>';
        Promise.all([loadChannels(), loadMyListings()]).then(function () {
            if (!_channels.length) {
                byId('mkt-body').innerHTML = emptyState('ti-plus', 'Нет подходящих каналов', 'Чтобы выставить канал на Площадку, у него должен быть публичный @username. Добавь или настрой канал в приложении.');
                return;
            }
            var def = null;
            for (var i = 0; i < _channels.length; i++) {
                if (_listingForChannel(_channels[i].id)) { def = _channels[i].id; break; }
            }
            if (def == null) def = _channels[0].id;
            selectChannel(def);
        });
    }
    function hydrateStudio(l) {
        _ss.listingId = l.id;
        if (l.accent_color) _ss.color = l.accent_color;
        if (l.cover_gradient) { var gi = COVERS.indexOf(l.cover_gradient); if (gi >= 0) _ss.cover = gi; }
        var fx = l.effects_json || {};
        ['move', 'over', 'glow', 'orbit'].forEach(function (k) { if (fx[k]) _ss[k] = fx[k]; });
        if (fx.atomColor) _ss.atomColor = fx.atomColor;
        _ss.glowCard = !!fx.glowCard; _ss.glass = !!fx.glass || !!l.glass_buttons;
        if (l.title_style) _ss.font = l.title_style;
        var att = l.emoji_attachments_json || {};
        ['avatar', 'cover', 'body', 'list'].forEach(function (z) { if (att[z] != null) _ss.att[z] = att[z]; });
        if (l.formats && l.formats.length) {
            _sfmts.forEach(function (f) { f.on = false; });
            l.formats.forEach(function (rf) {
                var found = false;
                _sfmts.forEach(function (f) { if (f.format === rf.format) { f.on = true; f.p = rf.price; found = true; } });
                if (!found) _sfmts.push({ on: true, format: rf.format, n: rf.label || rf.format, p: rf.price, u: rf.unit && rf.unit !== 'RUB' ? rf.unit : '₽' });
            });
        }
        _ss._desc = l.custom_text || '';
        _ss._tags = (l.tags_json || []).join(', ');
        _ss._slots = l.slots_note || '';
    }

    function renderStudio() {
        var ss = _ss;
        byId('mkt-body').innerHTML =
            '<div class="mkt-studio"><div class="mkt-col-tools">' + channelSelectorHtml() +
            acc('cover', 'ti-photo', 'Обложка', 'Фон шапки карточки', true,
                '<div class="mkt-minitabs"><button class="mkt-minitab mkt-on" data-cv="grad">Градиент</button><button class="mkt-minitab" data-cv="img">Картинка</button><button class="mkt-minitab" data-cv="gif">GIF</button></div>' +
                '<div id="mkt-covGrad" class="mkt-covers"></div>') +
            acc('av', 'ti-user-circle', 'Аватар', 'Иконка канала', false,
                '<div class="mkt-minitabs"><button class="mkt-minitab mkt-on" data-av="tg">Telegram</button><button class="mkt-minitab" data-av="emoji">Эмодзи</button><button class="mkt-minitab" data-av="img">Фото</button></div>' +
                '<div id="mkt-avInfo" style="font-size:11px;color:var(--mkt-tx2);padding:8px 0;line-height:1.4;">Реальный аватар канала из Telegram.</div><div id="mkt-avEmoji" class="mkt-emo-grid mkt-hidden"></div>') +
            acc('fx', 'ti-sparkles', 'Эффекты', 'Сочетаются по слоям', false,
                fxGroup('Движение', 'ti-arrows-move', 'mkt-fxMove', false) +
                fxGroup('Поверхность', 'ti-stack-2', 'mkt-fxOver', false) +
                fxGroup('Свечение', 'ti-flare', 'mkt-fxGlow', true) +
                fxGroup('Орбита', 'ti-orbit', 'mkt-fxOrbit', true) +
                '<div id="mkt-atomInline" class="mkt-hidden" style="margin-top:9px;padding:10px;background:rgba(93,202,165,0.07);border:0.5px solid rgba(93,202,165,0.2);border-radius:10px;"><span class="mkt-lbl" style="color:var(--mkt-gr);"><i class="ti ti-atom"></i> Цвет электронов</span><div class="mkt-swatches" id="mkt-atomColors"></div></div>' +
                fxGroup('Оформление карточки', 'ti-diamond', 'mkt-fxCard', true) +
                '<div style="font-size:10px;color:var(--mkt-tx3);margin-top:4px;line-height:1.45;"><i class="ti ti-info-circle"></i> Движение и Поверхность — бесплатно всем. <span style="color:var(--mkt-gold);">Свечение, Орбита и Оформление карточки можно посмотреть, но применятся только с продвижением на 30 дней (29 990₽).</span></div>') +
            acc('style', 'ti-droplet', 'Стиль', 'Цвет и шрифт', false,
                '<span class="mkt-lbl">Акцентный цвет (цена + кнопка)</span><div class="mkt-swatches" id="mkt-colorPick"></div><span class="mkt-lbl" style="margin-top:12px;">Шрифт заголовка</span><div class="mkt-fonts" id="mkt-fontPick"></div>') +
            acc('desc', 'ti-message', 'Описание и теги', 'Текст карточки', false,
                '<span class="mkt-lbl">Описание</span><textarea class="mkt-inp" rows="3" id="mkt-sDesc" maxlength="160">' + _esc(ss._desc || '') + '</textarea>' +
                '<span class="mkt-lbl" style="margin-top:8px;">Теги (через запятую)</span><input class="mkt-inp" type="text" id="mkt-sTags" value="' + _esc(ss._tags || '') + '" maxlength="60">') +
            acc('fmt', 'ti-coin', 'Форматы и цены', 'Свою цену задаёшь сам', true,
                '<div id="mkt-fmtEditor"></div><div class="mkt-hint mkt-hint-pu"><i class="ti ti-bulb"></i> Бот оценит цену по метрикам канала (ориентир подтянем из TGStat). Цену ставишь любую.</div>' +
                '<span class="mkt-lbl" style="margin-top:12px;"><i class="ti ti-calendar"></i> Свободные слоты</span><input class="mkt-inp" type="text" id="mkt-sSlots" value="' + _esc(ss._slots || '') + '">', 'mkt-gr') +
            '<button class="mkt-savebtn" id="mkt-saveBtn"><i class="ti ti-rocket"></i> ' + (ss.listingId ? 'Сохранить карточку' : 'Опубликовать на Площадке') + '</button>' +
            '<div class="mkt-savenote">После публикации канал пройдёт AI-проверку по смыслу. Эффекты 29 990 применятся только при активном продвижении.</div>' +
            '</div><div class="mkt-col-prev">' +
            '<div class="mkt-prev-lbl mkt-first"><i class="ti ti-eye" style="color:var(--mkt-gr);"></i> Карточка</div><div id="mkt-sPreview"></div>' +
            '<div class="mkt-prev-lbl"><i class="ti ti-list" style="color:var(--mkt-pu4);"></i> Как в списке</div><div id="mkt-sPreviewList"></div>' +
            '<div style="font-size:10.5px;color:var(--mkt-tx3);margin-top:12px;line-height:1.5;text-align:center;">Меняй настройки слева — оба вида обновляются вживую.</div></div></div>';
        bindStudio();
        initStudioControls();
        studioPreview();
    }

    function acc(id, icon, title, sub, openIt, inner, icCls) {
        return '<div class="mkt-acc' + (openIt ? ' mkt-open' : '') + '" id="mkt-acc-' + id + '"><div class="mkt-acc-head" data-acc="' + id + '">' +
            '<div class="mkt-acc-ic"' + (icCls ? ' style="background:var(--mkt-gr-bg);color:var(--mkt-gr);"' : '') + '><i class="ti ' + icon + '"></i></div>' +
            '<div class="mkt-acc-title">' + title + '<div class="mkt-acc-sub">' + sub + '</div></div><i class="ti ti-chevron-down mkt-acc-chev"></i></div>' +
            '<div class="mkt-acc-body"><div class="mkt-acc-in">' + inner + '</div></div></div>';
    }
    function fxGroup(title, icon, gid, promo) {
        return '<div class="mkt-fx-grp"><div class="mkt-fx-grp-t"><i class="ti ' + icon + '"></i> ' + title +
            (promo ? '<span class="mkt-pbadge"><i class="ti ti-rocket" style="font-size:9px;"></i> 29 990</span>' : '') + '</div><div class="mkt-chips" id="' + gid + '"></div></div>';
    }

    function bindStudio() {
        var sc = _screen;
        sc.querySelectorAll('[data-acc]').forEach(function (h) { h.addEventListener('click', function () { accToggle(h.getAttribute('data-acc')); }); });
        sc.querySelectorAll('[data-cv]').forEach(function (b) { b.addEventListener('click', function () { covTab(b.getAttribute('data-cv')); }); });
        sc.querySelectorAll('[data-av]').forEach(function (b) { b.addEventListener('click', function () { avTab(b.getAttribute('data-av')); }); });
        byId('mkt-sDesc').addEventListener('input', studioPreview);
        byId('mkt-sTags').addEventListener('input', studioPreview);
        byId('mkt-sSlots').addEventListener('input', studioPreview);
        var chSel = byId('mkt-chSel'); if (chSel) chSel.addEventListener('change', function () { selectChannel(+this.value); });
        byId('mkt-saveBtn').addEventListener('click', saveStudio);
    }
    function accToggle(id) {
        var el = byId('mkt-acc-' + id), o = el.classList.contains('mkt-open');
        _screen.querySelectorAll('.mkt-acc.mkt-open').forEach(function (a) { a.classList.remove('mkt-open'); });
        if (!o) el.classList.add('mkt-open');
    }

    function chipRow(arr, cur, kind, promo) {
        return arr.map(function (a) {
            var on = a[0] === cur;
            return '<button class="mkt-chip' + (on ? (promo ? ' mkt-gon' : ' mkt-on') : '') + '" data-fx="' + kind + '" data-v="' + a[0] + '">' + _esc(a[1]) + (promo && a[0] !== 'none' ? '<i class="ti ti-rocket mkt-lk"></i>' : '') + '</button>';
        }).join('');
    }
    function cardFxRow() {
        return '<button class="mkt-chip' + (_ss.glowCard ? ' mkt-gon' : '') + '" data-fxc="glow">Золотое свечение<i class="ti ti-rocket mkt-lk"></i></button>' +
            '<button class="mkt-chip' + (_ss.glass ? ' mkt-gon' : '') + '" data-fxc="glass">Стеклянные кнопки<i class="ti ti-rocket mkt-lk"></i></button>';
    }
    function initStudioControls() {
        var ss = _ss;
        byId('mkt-covGrad').innerHTML = COVERS.map(function (g, i) { return '<div class="mkt-cv' + (i === ss.cover ? ' mkt-on' : '') + '" style="background:' + g + '" data-cover="' + i + '"></div>'; }).join('');
        byId('mkt-colorPick').innerHTML = COLORS.map(function (c) { return '<div class="mkt-sw' + (c === ss.color ? ' mkt-on' : '') + '" style="background:' + c + '" data-color="' + c + '"></div>'; }).join('');
        byId('mkt-atomColors').innerHTML = COLORS.map(function (c) { return '<div class="mkt-sw' + (c === ss.atomColor ? ' mkt-on' : '') + '" style="background:' + c + '" data-atom="' + c + '"></div>'; }).join('');
        byId('mkt-avEmoji').innerHTML = EMOJIS.map(function (e) { return '<button class="mkt-emo' + (e === ss.avEmoji ? ' mkt-on' : '') + '" data-avemoji="' + e + '">' + e + '</button>'; }).join('');
        byId('mkt-fontPick').innerHTML = FONTS.map(function (f) { return '<button class="mkt-fbtn' + (f[0] === ss.font ? ' mkt-on' : '') + '" style="' + f[2] + '" data-font="' + f[0] + '">' + f[1] + '</button>'; }).join('');
        byId('mkt-fxMove').innerHTML = chipRow(FX_MOVE, ss.move, 'move', false);
        byId('mkt-fxOver').innerHTML = chipRow(FX_OVER, ss.over, 'over', false);
        byId('mkt-fxGlow').innerHTML = chipRow(FX_GLOW, ss.glow, 'glow', true);
        byId('mkt-fxOrbit').innerHTML = chipRow(FX_ORBIT, ss.orbit, 'orbit', true);
        byId('mkt-fxCard').innerHTML = cardFxRow();
        byId('mkt-atomInline').classList.toggle('mkt-hidden', ss.orbit !== 'atom');
        renderFmtEd();
        bindStudioControls();
    }
    function bindStudioControls() {
        var sc = _screen;
        sc.querySelectorAll('[data-cover]').forEach(function (b) { b.addEventListener('click', function () { _ss.cover = +b.getAttribute('data-cover'); initStudioControls(); studioPreview(); }); });
        sc.querySelectorAll('[data-color]').forEach(function (b) { b.addEventListener('click', function () { _ss.color = b.getAttribute('data-color'); initStudioControls(); studioPreview(); }); });
        sc.querySelectorAll('[data-atom]').forEach(function (b) { b.addEventListener('click', function () { _ss.atomColor = b.getAttribute('data-atom'); initStudioControls(); studioPreview(); }); });
        sc.querySelectorAll('[data-avemoji]').forEach(function (b) { b.addEventListener('click', function () { _ss.avEmoji = b.getAttribute('data-avemoji'); initStudioControls(); studioPreview(); }); });
        sc.querySelectorAll('[data-font]').forEach(function (b) { b.addEventListener('click', function () { _ss.font = b.getAttribute('data-font'); initStudioControls(); studioPreview(); }); });
        sc.querySelectorAll('[data-fx]').forEach(function (b) { b.addEventListener('click', function () { _ss[b.getAttribute('data-fx')] = b.getAttribute('data-v'); initStudioControls(); studioPreview(); }); });
        sc.querySelectorAll('[data-fxc]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-fxc'); _ss[k === 'glow' ? 'glowCard' : 'glass'] = !_ss[k === 'glow' ? 'glowCard' : 'glass']; initStudioControls(); studioPreview(); }); });
        sc.querySelectorAll('[data-tgadd]').forEach(function (b) { b.addEventListener('click', function () { addAttach(b.getAttribute('data-tgadd')); }); });
        sc.querySelectorAll('[data-fmt]').forEach(function (b) { b.addEventListener('click', function () { var i = +b.getAttribute('data-fmt'); _sfmts[i].on = !_sfmts[i].on; renderFmtEd(); studioPreview(); }); });
        sc.querySelectorAll('[data-price]').forEach(function (inp) { inp.addEventListener('change', function () { var i = +inp.getAttribute('data-price'); var n = parseInt(String(inp.value).replace(/\D/g, ''), 10); _sfmts[i].p = isNaN(n) ? 0 : n; renderFmtEd(); studioPreview(); }); });
    }
    function renderTg() {
        var stk = _ss.tgTab === 'stk';
        byId('mkt-tgEmoji').classList.toggle('mkt-hidden', stk);
        byId('mkt-tgStk').classList.toggle('mkt-hidden', !stk);
        byId('mkt-tgEmoji').innerHTML = EMOJIS.map(function (e) { return '<button class="mkt-emo' + (_ss.tgTab === 'prem' ? ' mkt-prem' : '') + '" data-tgadd="' + e + '">' + e + '</button>'; }).join('');
        byId('mkt-tgStk').innerHTML = STICKERS.map(function (s) { return '<button class="mkt-stk" data-tgadd="' + s + '">' + s + '</button>'; }).join('');
        _screen.querySelectorAll('[data-tgadd]').forEach(function (b) { b.addEventListener('click', function () { addAttach(b.getAttribute('data-tgadd')); }); });
    }
    function covTab(t) {
        _ss.covType = t;
        _screen.querySelectorAll('[data-cv]').forEach(function (x) { x.classList.toggle('mkt-on', x.getAttribute('data-cv') === t); });
        byId('mkt-covGrad').classList.toggle('mkt-hidden', t !== 'grad');
        studioPreview();
    }
    function avTab(t) {
        _ss.avatar = t;
        _screen.querySelectorAll('[data-av]').forEach(function (x) { x.classList.toggle('mkt-on', x.getAttribute('data-av') === t); });
        byId('mkt-avInfo').classList.toggle('mkt-hidden', t !== 'tg');
        byId('mkt-avEmoji').classList.toggle('mkt-hidden', t !== 'emoji');
        studioPreview();
    }
    function tgZone(z) { _ss.tgZone = z; _screen.querySelectorAll('[data-tz]').forEach(function (x) { x.classList.toggle('mkt-on', x.getAttribute('data-tz') === z); }); }
    function tgTab(t) { _ss.tgTab = t; _screen.querySelectorAll('[data-tt]').forEach(function (x) { x.classList.toggle('mkt-on', x.getAttribute('data-tt') === t); }); renderTg(); }
    function addAttach(e) {
        var z = _ss.tgZone;
        if (z === 'avatar' || z === 'cover') { _ss.att[z] = (_ss.att[z] === e ? '' : e); }
        else { var arr = _ss.att[z]; var i = arr.indexOf(e); if (i >= 0) arr.splice(i, 1); else if (arr.length < 4) arr.push(e); }
        studioPreview();
    }
    function renderFmtEd() {
        byId('mkt-fmtEditor').innerHTML = _sfmts.map(function (f, i) {
            return '<div class="mkt-fmt-edit"><button class="mkt-fmt-chk" style="background:' + (f.on ? 'var(--mkt-gr)' : 'rgba(255,255,255,0.1)') + '" data-fmt="' + i + '">' + (f.on ? '<i class="ti ti-check"></i>' : '') + '</button>' +
                '<span class="mkt-fmt-nm" style="color:' + (f.on ? 'var(--mkt-tx)' : 'var(--mkt-tx3)') + '">' + _esc(f.n) + '</span>' +
                (f.on ? '<input class="mkt-price-inp" value="' + f.p + '" data-price="' + i + '" inputmode="numeric"><span class="mkt-price-unit">' + f.u + '</span>' : '<span style="font-size:11px;color:var(--mkt-tx3);">выкл</span>') + '</div>';
        }).join('');
        bindStudioControls();
    }

    function fontStyle(f) { var m = { normal: 'font-weight:600;', bold: 'font-weight:800;', wide: 'font-weight:700;letter-spacing:0.5px;', mono: 'font-family:monospace;font-weight:600;' }; return m[f] || m.normal; }
    function buildAvatar(accent) {
        var ss = _ss;
        var move = ss.move !== 'none' ? (' mkt-mv-' + ss.move) : '';
        var over = ss.over !== 'none' ? (' mkt-ov-' + ss.over) : '';
        var glow = (ss.glow !== 'none' && ss.glow !== 'aurora') ? (' mkt-gl-' + ss.glow) : '';
        var content = ss.avatar === 'emoji' ? ss.avEmoji : (ss.avatar === 'img' || ss.avatar === 'gif' ? '<i class="ti ti-photo" style="font-size:18px;color:#fff;"></i>' : 'B');
        var aurora = (ss.glow === 'aurora') ? '<div class="mkt-aurora-wrap"></div>' : '';
        var orbit = '';
        if (ss.orbit === 'comet') orbit = '<div class="mkt-orbit-comet"></div>';
        if (ss.orbit === 'atom') { var c = ss.atomColor, d = 'position:absolute;top:50%;left:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:' + c + ';box-shadow:0 0 7px ' + c + ';z-index:6;'; orbit = '<div style="' + d + 'animation:mkt-atomA 1.6s linear infinite;"></div><div style="' + d + 'animation:mkt-atomB 1.6s linear infinite;"></div><div style="' + d + 'animation:mkt-atomC 1.6s linear infinite;"></div>'; }
        var badge = ss.att.avatar ? '<span class="mkt-av-badge">' + ss.att.avatar + '</span>' : '';
        return '<div class="mkt-av-stage">' + aurora + '<div class="mkt-av' + move + over + glow + '" style="border-color:' + (ss.glowCard ? '#f5bf4f' : accent) + ';' + (ss.avatar === 'emoji' ? 'font-size:22px;' : '') + '">' + content + '</div>' + orbit + badge + '</div>';
    }
    function studioPreview() {
        var ss = _ss;
        var desc = byId('mkt-sDesc') ? byId('mkt-sDesc').value : '';
        var slots = byId('mkt-sSlots') ? byId('mkt-sSlots').value : '';
        var tags = (byId('mkt-sTags') ? byId('mkt-sTags').value : '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
        var accent = ss.color, cover = COVERS[ss.cover];
        var act = _sfmts.filter(function (f) { return f.on; });
        var minP = act.length ? Math.min.apply(null, act.map(function (f) { return f.p; })) : 0;
        var priceTxt = act.length ? 'от ' + _num(minP) + ' ₽' : '—';
        var premCard = ss.glowCard, glass = ss.glass;
        var coverEm = ss.att.cover ? '<div class="mkt-cover-em"><span>' + ss.att.cover + '</span></div>' : '';
        var bodyAtt = ss.att.body.length ? '<div class="mkt-cattach">' + ss.att.body.map(function (e) { return '<span>' + e + '</span>'; }).join('') + '</div>' : '';
        var expandStyle = glass ? 'background:linear-gradient(135deg,rgba(245,191,79,0.55),rgba(212,160,23,0.4));backdrop-filter:blur(16px) saturate(1.6);-webkit-backdrop-filter:blur(16px) saturate(1.6);border:1px solid rgba(245,191,79,0.55);color:#231600;' : 'background:linear-gradient(135deg,' + accent + ',' + accent + 'cc);color:#fff;box-shadow:var(--mkt-sh-pu);';
        byId('mkt-sPreview').innerHTML = '<div class="mkt-card' + (premCard ? ' mkt-prem' : '') + '" style="max-width:340px;">' +
            '<div class="mkt-cover"><div class="mkt-cover-bg mkt-cover-breathe" style="background:' + cover + '"></div><div class="mkt-cover-scrim"></div>' + coverEm +
            (premCard ? '<div class="mkt-cover-tag mkt-tag-prem"><i class="ti ti-rocket"></i>Топ месяца</div>' : '<div class="mkt-cover-tag mkt-tag-sale"><i class="ti ti-circle-check-filled"></i>на продаже</div>') +
            '<button class="mkt-star"><i class="ti ti-star"></i></button></div>' +
            '<div class="mkt-cbody"><div class="mkt-crow"><div class="mkt-cavbox">' + buildAvatar(accent) + '</div>' +
            '<div class="mkt-namebox"><div class="mkt-cname-row"><span class="mkt-cname" style="' + fontStyle(ss.font) + '">Твой канал</span><i class="ti ti-rosette-discount-check-filled mkt-seal"></i></div><div class="mkt-cmeta">@your_channel</div>' + bodyAtt + '</div></div>' +
            '<div class="mkt-badges"><span class="mkt-badge mkt-b-live"><i class="ti ti-plant-2"></i>Живой</span><span class="mkt-badge mkt-b-safe"><i class="ti ti-shield-check"></i>Безопасный</span></div>' +
            (desc ? '<div class="mkt-desc">' + _esc(desc) + '</div>' : '') +
            (tags.length ? '<div class="mkt-tags">' + tags.map(function (t) { return '<span class="mkt-tagchip">#' + _esc(t) + '</span>'; }).join('') + '</div>' : '') +
            '<div class="mkt-metrics"><div><div class="mkt-m-lbl">Цена от</div><div class="mkt-m-price" style="color:' + (premCard ? '#f5bf4f' : accent) + '">' + priceTxt + '</div></div>' +
            '<div><div class="mkt-m-lbl"><i class="ti ti-eye"></i>Охват</div><div class="mkt-m-val">~1 450</div></div><div class="mkt-spark">' + spark(1450, premCard ? '#f5bf4f' : GR) + '</div></div>' +
            (slots ? '<div class="mkt-fitline"><span style="font-size:10.5px;color:var(--mkt-gr);"><i class="ti ti-calendar-check"></i> ' + _esc(slots) + '</span></div>' : '') +
            '<div class="mkt-acts"><button class="mkt-btn ' + (glass ? 'mkt-btn-glass' : 'mkt-btn-g') + '"><i class="ti ti-arrow-up-right"></i>Развернуть</button>' +
            '<button class="mkt-btn" style="' + expandStyle + '"><i class="ti ti-brand-telegram"></i>Написать</button></div></div></div>';

        var le = ss.att.list.length ? '<span class="mkt-lemoji">' + ss.att.list.join('') + '</span>' : '';
        var premIc = premCard ? '<i class="ti ti-rocket mkt-lprem-ic"></i>' : '';
        byId('mkt-sPreviewList').innerHTML = '<div class="mkt-lrow' + (premCard ? ' mkt-prem' : '') + '"><div class="mkt-lhead">' +
            '<span class="mkt-ldot" style="background:' + GR + '"></span><div class="mkt-lmain"><div class="mkt-lname-row">' + premIc + '<span class="mkt-lname" style="' + fontStyle(ss.font) + '">Твой канал</span>' + le + '</div>' +
            '<div class="mkt-lsub"><span>@your_channel</span><span class="mkt-lreach"><i class="ti ti-eye" style="font-size:11px;"></i> 1 450</span></div></div>' +
            '<span class="mkt-lprice">' + priceTxt + '</span><i class="ti ti-chevron-down mkt-lchev"></i></div></div>';
    }

    function collectFormats() {
        return _sfmts.filter(function (f) { return f.on; }).map(function (f) { return { format: f.format, price: f.p, unit: 'RUB' }; });
    }
    function studioPayload() {
        var ss = _ss;
        return {
            formats: collectFormats(),
            slots_note: byId('mkt-sSlots').value || null,
            custom_text: byId('mkt-sDesc').value || null,
            accent_color: ss.color,
            cover_type: ss.covType,
            cover_gradient: ss.covType === 'grad' ? COVERS[ss.cover] : null,
            avatar_type: ss.avatar,
            avatar_emoji: ss.avatar === 'emoji' ? ss.avEmoji : null,
            title_style: ss.font,
            tags_json: (byId('mkt-sTags').value || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
            effects_json: { move: ss.move, over: ss.over, glow: ss.glow, orbit: ss.orbit, atomColor: ss.atomColor, glowCard: ss.glowCard, glass: ss.glass },
            emoji_attachments_json: ss.att
        };
    }
    function saveStudio() {
        var btn = byId('mkt-saveBtn');
        btn.disabled = true;
        var body = studioPayload();
        var wasCreate = !_ss.listingId;
        var p;
        if (_ss.listingId) {
            p = apiPatch('/api/v1/marketplace/listings/' + _ss.listingId, body);
        } else {
            if (!_ss.channelId) { btn.disabled = false; alert('Сначала выбери канал для размещения.'); return; }
            body.channel_id = _ss.channelId;
            p = apiPost('/api/v1/marketplace/listings', body);
        }
        p.then(function (r) {
            _haptic('success');
            if (r && r.listing_id) {
                _ss.listingId = r.listing_id;
                if (wasCreate) { var _ch = _channelById(_ss.channelId); _myListings.push({ id: r.listing_id, username: _ch ? _ch.username : null, status: 'pending', status_human: 'На модерации' }); }
            }
            btn.innerHTML = '<i class="ti ti-check"></i> Сохранено';
            setTimeout(function () { btn.innerHTML = '<i class="ti ti-rocket"></i> Сохранить карточку'; btn.disabled = false; }, 1600);
        }).catch(function (e) {
            _haptic('error');
            btn.disabled = false;
            alert('Не удалось сохранить: ' + (e && e.message ? e.message : 'ошибка'));
        });
    }

    window.__openMarketplace = open;
})();