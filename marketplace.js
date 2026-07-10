(function () {
    'use strict';

    /* ===================== state ===================== */
    var MEDIA_MAX_BYTES = 64 * 1024 * 1024;   // единый лимит загрузки (совпадает с бэкендом)
    var _root = null, _opened = false;
    var _mainTab = 'market';
    var _subTab = 'buy';
    var _view = 'cards';
    var _sort = 'match';
    var _feed = null, _catalog = null, _feedState = 'idle', _catState = 'idle';
    /* поиск, сортировка, фильтры и пагинация ленты «Купить» (считает бэкенд) */
    var _q = '', _sortBuy = 'smart', _fPriceMin = null, _fPriceMax = null, _fSubsMin = null, _fAud = null;
    /* аудитория канала: пол основной ЦА (male|female|mixed) — ось «тема × пол» */
    function _audText(a) { return a === 'male' ? 'Мужская' : a === 'female' ? 'Женская' : a === 'mixed' ? 'Смешанная' : ''; }
    function _audColor(a) { return a === 'male' ? '#5b9dff' : a === 'female' ? '#ff6fae' : '#9aa0b5'; }
    function _audIcon(a) { return a === 'male' ? 'ti-gender-male' : a === 'female' ? 'ti-gender-female' : 'ti-users-group'; }
    function _audChip(l) {
        var a = l && l.audience; var t = _audText(a); if (!t) return '';
        var c = _audColor(a);
        return '<span class="fmx-aud" style="color:' + c + ';border-color:' + c + '55;background:' + c + '1a;"><i class="ti ' + _audIcon(a) + '"></i>' + t + '</span>';
    }
    var _feedTotal = 0, _feedOffset = 0, _FEED_PAGE = 30;
    var _deepCard = (function () { try { var sp = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.start_param; var m = sp && /^card_(\d+)$/.exec(sp); return m ? parseInt(m[1], 10) : null; } catch (e) { return null; } })();
    if (_deepCard) {
        /* пришли по ссылке на карточку: сами открываем Площадку, карточка развернётся после загрузки ленты */
        var _deepTry = 0;
        var _deepT = setInterval(function () {
            _deepTry++;
            if (document.body && document.readyState !== 'loading') {
                clearInterval(_deepT);
                setTimeout(function () { try { window.__openMarketplace(); setTimeout(function () { setMainTab('market'); }, 200); } catch (e) {} }, 350);
            } else if (_deepTry > 20) { clearInterval(_deepT); }
        }, 300);
    }
    var _reqs = null, _reqState = 'idle';
    var _pulse = null, _pulseTs = 0;
    var _channels = [], _myListings = [], _bookmarks = {};
    var _chLoaded = false, _chLoading = false, _nicheSel = null;
    var _faqTab = 'rules';
    var _ss = null, _sfmts = null, _secCreate = 'cover';
    var _stickers = null;  // коллекция стикеров юзера
    function onTap(node, fn) {
        var t = 0;
        node.addEventListener('touchend', function (e) { t = Date.now(); e.preventDefault(); fn(e); }, { passive: false });
        node.addEventListener('click', function (e) { if (Date.now() - t < 600) return; fn(e); });
    }

    var COVERS = [
        'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#5DCAA5,#10b981)',
        'linear-gradient(135deg,#F0997B,#ec4899)', 'linear-gradient(135deg,#3b82f6,#06b6d4)',
        'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#8b5cf6,#ec4899)'
    ];
    var COVER_NAMES = ['Фиолет', 'Изумруд', 'Закат', 'Океан', 'Огонь', 'Магента'];
    var COLORS = ['#818cf8', '#3b82f6', '#22d3ee', '#5DCAA5', '#a3e635', '#facc15', '#f59e0b', '#F0997B', '#ef4444', '#ec4899', '#a78bfa', '#f5bf4f'];
    var EMOJIS = ['🧬', '🔥', '💪', '🧠', '⚡', '🚀', '💎', '🎯', '📈', '🌿', '❤️', '✨', '🏆', '🎮', '📚', '🌟', '💰', '📊', '👑', '🌈'];
    var FONTS = [['normal', 'Обычный'], ['bold', 'Жирный'], ['wide', 'Широкий'], ['mono', 'Моно']];
    var FX_MOVE = [['none', 'Без'], ['levit', 'Левитация'], ['pscale', 'Пульс'], ['sway', 'Покачивание'], ['glitch', 'Сдвиг'], ['bounce', 'Прыжок']];
    var FX_OVER = [['none', 'Без'], ['holo', 'Голограмма'], ['liquid', 'Жидкое золото'], ['rgb', 'Глитч'], ['chroma', 'Хрома'], ['vhs', 'VHS'], ['slice', 'Распад'], ['warp', 'Искажение'], ['shred', 'Помехи'], ['blocks', 'Блоки']];
    var FX_GLOW = [['none', 'Без'], ['neon', 'Неон'], ['prism', 'Призма'], ['breath', 'Дыхание'], ['gold', 'Золото'], ['aurora', 'Аврора']];
    var FX_ORBIT = [['none', 'Без'], ['comet', 'Комета'], ['atom', 'Атом'], ['orbitals', 'Орбитали'], ['sphere', 'Сфера']];
    var FX_GLASS = [['none', 'Без'], ['frost', 'Матовое'], ['tint', 'Цветное'], ['dark', 'Дымка']];
    var FX_VIP = { glow: ['aurora'], orbit: ['comet', 'atom', 'orbitals', 'sphere'], glass: ['frost', 'tint', 'dark'] };
    var GR = '#5DCAA5';

    var TERMS = [
        ['Подписчики', 'Сколько всего людей подписано на канал. Само по себе число почти ничего не говорит: подписчиков легко накрутить или закупить. Смотри его только в паре с охватом — важно не сколько подписано, а сколько реально читают.'],
        ['Средний охват поста', 'Сколько человек в среднем видят один пост. Это главное число при закупке рекламы: твоё объявление увидит именно охват, а не все подписчики. По нему считается реальная цена контакта.'],
        ['ER · вовлечённость', 'Engagement Rate — доля читателей, которые реагируют: лайки, репосты, комментарии, голоса — по отношению к охвату. Показывает, живая ли аудитория. Высокий охват при низком ER — тревожный сигнал: людей «пригнали», но им не интересно.'],
        ['ERR · охват к базе', 'Engagement Rate by Reach — какая доля подписчиков реально видит посты (охват ÷ подписчики). У здорового канала это заметная доля. 100 000 подписчиков и 1 000 охвата — почти наверняка накрученная база.'],
        ['CPM · цена за 1000 показов', 'Сколько стоит донести рекламу до 1000 человек (цена ÷ охват × 1000). Главный инструмент сравнения: дорогой на вид канал с большим охватом может выйти дешевле маленького. Сравнивай каналы по CPM, а не по сумме размещения.'],
        ['Прирост за 30 дней', 'Насколько выросло или упало число подписчиков за месяц. Плавный органический рост — признак живого канала. Резкий скачок вверх — часто закупка или накрутка подписчиков; после неё охват обычно проседает.'],
        ['Частота постов', 'Сколько публикаций выходит в неделю. Слишком редко — аудитория отвыкает и хуже реагирует; слишком часто — твоя реклама быстро тонет в потоке. Влияет на то, как долго пост держится вверху ленты у читателя.'],
        ['Просмотры в месяц', 'Суммарные просмотры всех постов за месяц — общий «трафик» канала. Помогает прикинуть масштаб: сколько всего показов даёт канал за пределами одного поста.'],
        ['Накрутка', 'Искусственные подписчики или просмотры. Признаки: большая база при крошечном охвате, резкие скачки просмотров без причины, отсутствие живых комментариев, ER близкий к нулю. Индикатор здоровья канала подсвечивает такие каналы красным.'],
        ['Маркировка · erid', 'В некоторых странах интернет-реклама подлежит обязательной маркировке (в России — токен erid). Поле erid в оффере опциональное — заполняй для сделок, где маркировка обязательна. Ответственность за неё несут стороны сделки.']
    ];
    var RULES = [
        ['Запрещено полностью', 'Наркотики и их пропаганда; оружие и взрывчатка; порнография; терроризм, экстремизм и символика запрещённых организаций; призывы к суициду и селф-харму; шок-контент — кровь, увечья, жестокость к людям и животным; торговля людьми, документами и краденым.'],
        ['Финансы и «схемы»', 'Пирамиды, скам-проекты, «бинарные опционы» и обещания гарантированного дохода — блокировка. Азартные игры — только лицензированные операторы с предупреждением о рисках. Кредитные продукты — только с полными и честными условиями.'],
        ['Здоровье и «чудо-средства»', 'Обещания вылечить болезни, «минус 20 кг за неделю» и псевдомедицина запрещены. Медицина, лекарства и добавки — только с корректными оговорками и без гарантий результата.'],
        ['Алкоголь, табак, вейпы', 'Реклама алкоголя, табака, вейпов и жидкостей для них на Площадке не размещается — в любом виде, включая «обзоры» с промокодами.'],
        ['Картинки, GIF и видео', 'Без чужих брендов, логотипов и персонажей — это чужая интеллектуальная собственность. Без реальных людей без их согласия, включая дипфейки. Без строб-вспышек чаще 3 раз в секунду. Дети в рекламе — только когда это оправдано самим товаром.'],
        ['Эмодзи и стикеры', 'Стикер или эмодзи с запрещённой символикой, наркотиками или 18+ — то же нарушение, что и картинка. Комбинации эмодзи, маскирующие запрещённые товары, тоже считаются нарушением.'],
        ['18+ и серая зона', 'Эротика 18+ — только в отдельном разделе с подтверждением возраста. Лицензируемые ниши — азартные игры, финансы, крипта — проверяются строже и дольше.'],
        ['Маркировка рекламы', 'В некоторых странах интернет-реклама подлежит обязательной маркировке (например, в России — токен erid). Это ответственность сторон сделки. Поле erid в оффере — опциональное: заполняй, если работаешь с аудиторией, где маркировка обязательна.'],
        ['Ответственность', 'За контент оффера отвечает тот, кто его разместил — это фиксируется при публикации. Также запрещено всё, что запрещено законами страны, на аудиторию которой направлена реклама. Нарушение — снятие оффера, повторное или грубое — бан. Пожаловаться на любой оффер можно в один тап.']
    ];
    var TIPS = [
        'Смотри на охват и ER, а не на число подписчиков.',
        'Сравнивай цену через CPM — дорогой канал может быть выгоднее дешёвого.',
        'Проверяй охват к подписчикам: большой канал с крошечным охватом — деньги на ветер.',
        'Начни с одного небольшого размещения: сработало — масштабируй, нет — потери минимальны.',
        'Подбирай канал под свою нишу: релевантность важнее размера.'
    ];

    /* ===================== helpers ===================== */
    function _esc(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function _short(n) {
        if (n == null) return '—';
        if (n >= 1000000) return (Math.round(n / 100000) / 10 + '').replace('.', ',') + 'М';
        if (n >= 1000) return (Math.round(n / 100) / 10 + '').replace('.', ',') + 'К';
        return String(n);
    }
    function _num(n) { if (n == null || isNaN(n)) return '—'; return Number(n).toLocaleString('ru-RU'); }
    /* Системные alert/confirm и tg.showAlert/showConfirm ломают клавиатуру вебвью
       на Telegram Desktop — поэтому все уведомления строго внутри DOM. */
    function uiAlert(msg) {
        var t = el('fmx-toastEl');
        if (!t) { t = document.createElement('div'); t.id = 'fmx-toastEl'; t.className = 'fmx-toast'; document.body.appendChild(t); }
        t.innerHTML = '<i class="ti ti-alert-circle" style="color:#ef4444;"></i> ' + _esc(String(msg));
        t.classList.add('on', 'err');
        clearTimeout(t._tm);
        t._tm = setTimeout(function () { t.classList.remove('on', 'err'); }, 3600);
    }
    function uiConfirm(msg, cb) {
        var old = el('fmx-cfmBg'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'fmx-cfmBg'; bg.className = 'fmx-cfm';
        bg.innerHTML = '<div class="fmx-cfm-box"><div class="fmx-cfm-t">' + _esc(String(msg)) + '</div>' +
            '<div class="fmx-cfm-r"><button class="fmx-btn" data-no>Отмена</button><button class="fmx-btn" data-yes style="background:#818cf8;color:#fff;border-color:transparent;">Да</button></div></div>';
        document.body.appendChild(bg);
        function done() { bg.remove(); }
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        bg.querySelector('[data-no]').addEventListener('click', done);
        bg.querySelector('[data-yes]').addEventListener('click', function () { done(); cb(); });
    }
    function _haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) { if (k === 'success' || k === 'error' || k === 'warning') tg.HapticFeedback.notificationOccurred(k); else tg.HapticFeedback.impactOccurred(k || 'light'); } } catch (e) {} }
    function apiGet(p) { return apiRequest(p); }
    function apiPost(p, b) { var o = { method: 'POST' }; if (b !== undefined) { o.body = JSON.stringify(b); o.headers = { 'Content-Type': 'application/json' }; } return apiRequest(p, o); }
    function apiPatch(p, b) { var o = { method: 'PATCH' }; if (b !== undefined) { o.body = JSON.stringify(b); o.headers = { 'Content-Type': 'application/json' }; } return apiRequest(p, o); }
    function apiDelete(p) { return apiRequest(p, { method: 'DELETE' }); }
    function el(id) { return document.getElementById(id); }
    function qsa(scope, sel) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
    function _hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return h; }
    function _firstPrice(l) { if (l.formats && l.formats.length) { for (var i = 0; i < l.formats.length; i++) if (l.formats[i].price) return l.formats[i].price; } return null; }
    function _reachRate(l) { if (!l.subscribers || !l.avg_views) return null; return Math.round(l.avg_views / l.subscribers * 100); }
    function _cpm(l) { var p = _firstPrice(l); if (!p || !l.avg_views) return null; return Math.round(p / l.avg_views * 1000); }
    var _nicheMap = null;  // словарь канонов с бэка; работает и без него (запасные основы)
    function loadNicheMap() {
        if (_nicheMap !== null) return;
        _nicheMap = {};
        apiGet('/api/v1/marketplace/niche_map').then(function (r) {
            if (r && r.ok && r.map) _nicheMap = r.map;
        }).catch(function () {});
    }
    function _canonSet(text) {
        var norm = String(text || '').toLowerCase().replace(/ё/g, 'е').trim();
        var toks = norm.match(/[a-zа-я0-9+]+/g) || [];
        var out = {};
        var map = _nicheMap || {};
        for (var canon in map) {
            var roots = map[canon];
            for (var i = 0; i < roots.length; i++) {
                var r = roots[i];
                if (r.indexOf(' ') >= 0) { if (norm.indexOf(r) >= 0) { out[canon] = 1; break; } }
                else if (r.length <= 3) { if (toks.indexOf(r) >= 0) { out[canon] = 1; break; } }
                else if (toks.some(function (t) { return t.indexOf(r) === 0; })) { out[canon] = 1; break; }
            }
        }
        toks.forEach(function (t) { if (t.length >= 4) out['~' + t.slice(0, 6)] = 1; });
        return out;
    }
    function nichesMatch(a, b) {
        if (!a || !b) return false;
        var sa = _canonSet(a), sb = _canonSet(b);
        for (var k in sa) if (sb[k]) return true;
        return false;
    }
    function _myNichesStr() {
        var parts = [];
        (_channels || []).forEach(function (c) { if (c.niche) parts.push(String(c.niche)); });
        return parts.join(', ');
    }
    function _nicheMatch(l) {
        if (!l || !l.niche) return false;
        return nichesMatch(_myNichesStr(), l.niche);
    }
    function _applySort(arr) {
        if (_sort === 'match') return arr.slice().sort(function (a, b) { return (_nicheMatch(b) ? 1 : 0) - (_nicheMatch(a) ? 1 : 0); });
        if (_sort === 'niche' && _nicheSel) return arr.filter(function (l) { return l.niche && nichesMatch(_nicheSel, l.niche); });
        return arr;
    }
    function _hlInfo(l) {
        var m = { green: ['#5DCAA5', 'Здоровый'], amber: ['#f59e0b', 'Средний'], yellow: ['#f59e0b', 'Средний'], red: ['#ef4444', 'Риск'] };
        var cls = l.health_class && m[l.health_class] ? (l.health_class === 'yellow' ? 'amber' : l.health_class) : null;
        if (!cls) { var rr = _reachRate(l); if (rr != null) cls = rr >= 10 ? 'green' : (rr >= 3 ? 'amber' : 'red'); }
        if (!cls) return { cls: 'none', color: '#565b73', word: 'Нет данных' };
        return { cls: cls, color: m[cls][0], word: m[cls][1] };
    }
    function trafficLight(l, mini) {
        var h = _hlInfo(l);
        var dots = ['red', 'amber', 'green'].map(function (c) {
            return '<i class="' + c + (h.cls === c ? ' on' : '') + '"></i>';
        }).join('');
        if (mini) return '<span class="fmx-tl fmx-tlm" title="Здоровье канала: ' + h.word + '">' + dots + '</span>';
        return '<span class="fmx-tl">' + dots + '<b style="color:' + h.color + ';">' + h.word + '</b></span>';
    }
    function _healthColor(l) { var m = { green: '#5DCAA5', amber: '#f59e0b', yellow: '#f59e0b', red: '#ef4444' }; if (l.health_class && m[l.health_class]) return m[l.health_class]; var rr = _reachRate(l); if (rr == null) return '#565b73'; if (rr >= 10) return '#5DCAA5'; if (rr >= 3) return '#f59e0b'; return '#ef4444'; }
    function mediaAbs(u) { if (!u) return u; if (/^(https?:|blob:|data:)/.test(u)) return u; var b = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : ''; return b + u; }
    function _posStyle(a) { if (!a || typeof a !== 'object') return 'object-position:center;'; return 'object-position:' + (a.x != null ? a.x : 50) + '% ' + (a.y != null ? a.y : 50) + '%;transform:scale(' + (a.s || 1) + ');transform-origin:' + (a.x != null ? a.x : 50) + '% ' + (a.y != null ? a.y : 50) + '%;'; }
    function _coverBg(l) { if (l.cover_type && l.cover_type !== 'grad' && l.cover_url) return "url('" + mediaAbs(l.cover_url) + "')"; if (l.cover_gradient) return l.cover_gradient; return COVERS[Math.abs(_hash(l.username || '')) % COVERS.length]; }
    function _accent(l) { return l.accent_color || '#818cf8'; }
    function _isTop(l) { if (l.is_vip || l.is_top) return true; if (l.top_until && new Date(l.top_until) > new Date()) return true; return false; }
    function _isMod() { try { return !!(tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id === 1263501641); } catch (e) { return false; } }
    function _isBoost(l) { return !!(l.boost_until && new Date(l.boost_until) > new Date()); }
    function _priceFrom(l) { var p = _firstPrice(l); return p ? _num(p) + ' ₽' : 'по запросу'; }

    /* ===================== styles ===================== */
    function injectStyles() {
        if (el('fmx-style')) return;
        var s = document.createElement('style');
        s.id = 'fmx-style';
        s.textContent = [
            '#fmx-screen{position:fixed;inset:0;z-index:9000;display:none;flex-direction:column;background:#0a0d18;background-image:radial-gradient(900px 520px at 85% -12%,rgba(99,102,241,0.13),transparent 60%),radial-gradient(700px 520px at -12% 22%,rgba(93,202,165,0.07),transparent 55%);color:#e8e8ed;font-family:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;overflow:hidden;}',
            '#fmx-screen.fmx-show{display:flex;}',
            '#fmx-screen *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}',
            '#fmx-screen .ti{line-height:1;}',
            '.fmx-head{display:flex;align-items:center;gap:9px;padding:14px 14px 12px;flex-shrink:0;min-width:0;max-width:640px;margin:0 auto;width:100%;}',
            '.fmx-hic{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;box-shadow:0 5px 16px rgba(99,102,241,0.5);flex-shrink:0;}',
            '.fmx-head h1{margin:0;font-size:16px;font-weight:700;}',
            '.fmx-head p{margin:1px 0 0;font-size:11px;color:#8990a8;}',
            '.fmx-ibtn{width:34px;height:34px;border-radius:9px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;}',
            '@keyframes fmxPulse{0%,100%{box-shadow:0 0 0 0 rgba(129,140,248,0.55);}50%{box-shadow:0 0 0 6px rgba(129,140,248,0);}}',
            '.fmx-ibtn.fmx-pulse{animation:fmxPulse 1.5s ease-out infinite;color:#818cf8;border-color:rgba(129,140,248,0.6);}',
            '.fmx-ibtn.fmx-has{color:#f59e0b;border-color:rgba(245,158,11,0.3);}',
            '.fmx-bmc{position:absolute;top:-5px;right:-5px;background:#6366f1;color:#fff;font-size:9px;font-weight:700;min-width:15px;height:15px;border-radius:99px;display:flex;align-items:center;justify-content:center;padding:0 3px;}',
            '.fmx-pillbar{position:relative;display:flex;margin:0 16px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:4px;flex-shrink:0;}',
            '.fmx-pill{position:absolute;top:4px;left:4px;height:calc(100% - 8px);border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);transition:transform 380ms cubic-bezier(.2,.85,.25,1),width 380ms cubic-bezier(.2,.85,.25,1);box-shadow:0 4px 14px rgba(99,102,241,0.4);z-index:0;}',
            '.fmx-pb{flex:1;position:relative;z-index:1;border:none;background:transparent;color:#8990a8;padding:10px 3px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:color 260ms;white-space:nowrap;min-width:0;overflow:hidden;}',
            '.fmx-pb.on{color:#fff;}',
            /* видимый ползунок справа: если у пользователя не работает колёсико, он зажмёт и опустит.
               scrollbar-gutter:stable резервирует под него место — контент не прыгает и ползунок не мигает */
            '.fmx-scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.28) transparent;scrollbar-gutter:stable;}',
            '.fmx-scroll::-webkit-scrollbar{width:9px;}',
            '.fmx-scroll::-webkit-scrollbar-track{background:transparent;}',
            '.fmx-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.28);border-radius:6px;border:2px solid transparent;background-clip:padding-box;}',
            '.fmx-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.42);background-clip:padding-box;}',
            '.fmx-pad{padding:14px 16px 28px;max-width:640px;margin:0 auto;width:100%;min-width:0;}',
            '@keyframes fmxFade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}',
            '.fmx-fade{animation:fmxFade 320ms cubic-bezier(.2,.8,.2,1);}',
            '.fmx-note{font-size:11.5px;line-height:1.5;color:#8990a8;background:rgba(99,102,241,0.07);border:0.5px solid rgba(99,102,241,0.22);border-radius:10px;padding:10px 12px;margin-bottom:14px;display:flex;gap:7px;align-items:flex-start;}',
            '.fmx-note i{color:#818cf8;flex-shrink:0;margin-top:1px;}',
            '.fmx-note.fmx-gr{background:rgba(93,202,165,0.08);border-color:rgba(93,202,165,0.25);}.fmx-note.fmx-gr i{color:#5DCAA5;}',
            '.fmx-sortbar{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px;}',
            '.fmx-seg{flex-shrink:0;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;border-radius:99px;padding:8px 13px;font-size:11.5px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all 160ms;}',
            '.fmx-seg.on{background:rgba(99,102,241,0.14);color:#818cf8;border-color:rgba(99,102,241,0.3);}',
            '.fmx-search{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:9px 11px;margin-bottom:14px;}',
            '.fmx-search input{flex:1;background:transparent;border:none;outline:none;color:#e8e8ed;font-size:13px;font-family:inherit;}',
            '.fmx-search i{color:#565b73;}',
            '.fmx-toprow{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:10px;}',
            '.fmx-vtog{display:flex;gap:3px;background:rgba(255,255,255,0.04);padding:3px;border-radius:9px;}',
            '.fmx-vt{border:none;background:transparent;color:#8990a8;border-radius:7px;padding:7px 10px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all 150ms;}',
            '.fmx-vt.on{background:rgba(99,102,241,0.14);color:#818cf8;}',
            '.fmx-promo{border:0.5px solid rgba(245,191,79,0.4);background:rgba(245,191,79,0.1);color:#f5bf4f;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;}',
            '.fmx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,350px));gap:12px;justify-content:center;}',
            '.fmx-empty{text-align:center;padding:54px 20px;color:#8990a8;}',
            '.fmx-empty .ti{font-size:40px;opacity:0.3;}',
            '.fmx-empty h3{margin:14px 0 5px;font-size:15px;font-weight:700;color:#e8e8ed;}',
            '.fmx-empty p{margin:0;font-size:12.5px;line-height:1.5;max-width:300px;margin-left:auto;margin-right:auto;}',
            '.fmx-load{text-align:center;padding:54px;color:#8990a8;}',
            '.fmx-cwrap{width:100%;position:relative;overflow:visible;}',
            ".fmx-cwrap>.fmx-card,.fmx-zw>*{font-family:'Inter',-apple-system,'Segoe UI',Roboto,sans-serif;}",
            '.fmx-met .v,.fmx-lprice{font-variant-numeric:tabular-nums;}',
            '.fmx-cwrap>.fmx-card{width:350px;transform-origin:top left;}',
            '.fmx-zw{width:100%;position:relative;}',
            '.fmx-zw>*{width:350px;max-width:none;transform-origin:top left;box-sizing:border-box;}',
            '.fmx-card{position:relative;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;transition:border-color 200ms,transform 200ms;}',
            '.fmx-card:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px);}',
            '.fmx-card.fmx-prem{border-color:transparent;box-shadow:0 0 0 1.5px rgba(245,191,79,0.65),0 0 24px rgba(245,191,79,0.35),0 0 60px rgba(245,191,79,0.15);}',
            '.fmx-cov{height:84px;position:relative;overflow:hidden;z-index:1;}',
            /* долгое нажатие на обложке/аватаре открывало системное меню «сохранить изображение»
               с полным адресом файла. Скриншот всё равно возможен — это не защита, а вид:
               карточка не должна вести себя как обычная веб-страница */
            '.fmx-cov,.fmx-cov *,.fmx-av,.fmx-av *,.fmx-avw,.fmx-avw *{-webkit-touch-callout:none;-webkit-user-drag:none;user-drag:none;user-select:none;-webkit-user-select:none;}',
            '.fmx-cov img,.fmx-av img,.fmx-avw img{pointer-events:none;}',
            '.fmx-cov-bg{position:absolute;inset:0;background-size:cover;background-position:center;}',
            '.fmx-cov-bg::before{content:"";position:absolute;inset:-20%;background:radial-gradient(120% 130% at 22% 8%,rgba(255,255,255,0.4),transparent 55%);animation:fmxBreathe 7s ease-in-out infinite;}',
            '@keyframes fmxBreathe{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(8%,6%) scale(1.12);}}',
            '.fmx-tag{position:absolute;top:9px;left:9px;font-size:9px;font-weight:700;padding:4px 8px;border-radius:6px;background:rgba(10,13,24,0.5);color:#5DCAA5;backdrop-filter:blur(5px);z-index:7;display:flex;align-items:center;gap:4px;}',
            '.fmx-tag.gold{background:linear-gradient(135deg,#fde68a,#f5bf4f);color:#2a1c00;}',
            '.fmx-star{position:absolute;bottom:9px;right:9px;width:30px;height:30px;border-radius:8px;background:rgba(10,13,24,0.45);border:none;color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);z-index:2;}',
            '.fmx-star.on{color:#f59e0b;}',
            '.fmx-cb{padding:13px;position:relative;z-index:3;}',
            '.fmx-crow{display:flex;align-items:center;gap:10px;margin-top:-32px;margin-bottom:11px;position:relative;z-index:2;}',
            '.fmx-av{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;border:2.5px solid #0d1019;flex-shrink:0;}',
            '.fmx-nm{font-size:14px;font-weight:700;display:flex;align-items:center;gap:5px;padding-top:20px;}',
            '.fmx-seal{color:#818cf8;font-size:14px;}',
            '.fmx-meta{font-size:10.5px;color:#8990a8;margin-top:2px;}',
            '.fmx-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}',
            '.fmx-aud{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px;border:0.5px solid;white-space:nowrap;line-height:1.5;}',
            '.fmx-aud i{font-size:12px;}',
            '.fmx-covbdg{position:absolute;left:9px;bottom:8px;right:46px;display:flex;gap:5px;flex-wrap:wrap;z-index:7;}',
            '.fmx-covbdg .fmx-bdg,.fmx-covbdg .fmx-tl{background:rgba(10,13,24,0.55);border-color:rgba(255,255,255,0.14);}',
            '.fmx-bfree{position:absolute;z-index:6;background:rgba(10,13,24,0.55);border:0.5px solid rgba(255,255,255,0.14);}',
            '.fmx-bslot{position:absolute;border:1.5px dashed rgba(255,255,255,0.4);border-radius:10px;background:rgba(255,255,255,0.05);z-index:8;pointer-events:none;display:flex;align-items:center;justify-content:center;}',
            '.fmx-bslot i{font-style:normal;font-size:9px;color:#8990a8;letter-spacing:0.3px;}',
            '.fmx-bslot.hot{border-color:#5DCAA5;background:rgba(93,202,165,0.14);}',
            '.fmx-bslot.hot i{color:#5DCAA5;}',
            '.fmx-bdg{font-size:10px;font-weight:600;padding:4px 8px;border-radius:7px;display:inline-flex;align-items:center;gap:4px;}',
            '.fmx-bdg i{font-size:11px;}',
            '.fmx-bgd-card{display:flex;gap:11px;align-items:flex-start;background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:12px 13px;margin-bottom:9px;}',
            '.fmx-bgd-badge{flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:flex-start;max-width:150px;}',
            '.fmx-bgd-txt{flex:1;min-width:0;}',
            '.fmx-bgd-title{font-size:13px;font-weight:700;color:#e8e8ed;margin-bottom:4px;}',
            '.fmx-bgd-desc{font-size:12px;color:#a9aec0;line-height:1.5;}',
            '.fmx-bgd-desc .fmx-hp{margin:5px 0 0;text-indent:12px;}',
            '.fmx-bgd-badge .fmx-bdg{font-size:11px;padding:5px 10px;font-weight:700;}',
            '.fmx-bgd-badge .fmx-bdg i{font-size:14px;}',
            '.fmx-bgd-health{flex-direction:column;align-items:stretch;gap:0;}',
            '.fmx-tlrow{display:flex;gap:10px;align-items:center;margin-top:8px;}',
            '.fmx-tlcell{flex-shrink:0;}',
            '.fmx-bgd-health .fmx-tl{width:112px;box-sizing:border-box;justify-content:flex-start;padding:5px 10px;white-space:nowrap;}',
            '.fmx-bgd-health .fmx-tl i{width:8px;height:8px;}',
            '.fmx-bgd-health .fmx-tl b{font-size:10px;}',
            '.fmx-tldesc{flex:1;min-width:0;font-size:12px;color:#a9aec0;line-height:1.4;}',
            '.fmx-b-live{background:rgba(93,202,165,0.13);color:#5DCAA5;}',
            '.fmx-b-safe{background:rgba(99,102,241,0.13);color:#818cf8;}',
            '.fmx-b-big{background:rgba(245,158,11,0.13);color:#f59e0b;}',
            '.fmx-b-match{background:rgba(139,92,246,0.16);color:#a78bfa;}',
            '.fmx-desc{font-size:12px;color:#b9bdcf;line-height:1.45;margin-bottom:11px;}',
            '.fmx-met{display:flex;align-items:flex-start;justify-content:space-between;gap:0;padding:11px 0;border-top:0.5px solid rgba(255,255,255,0.08);flex-wrap:nowrap;min-width:0;}',
            '.fmx-met>div+div{border-left:1px solid rgba(255,255,255,0.08);padding-left:7px;margin-left:7px;}',
            '.fmx-met>.fmx-sp{margin-left:auto !important;border-left:1px solid rgba(255,255,255,0.08);padding-left:7px;}',
            '.fmx-met .l{font-size:8.5px;color:#565b73;text-transform:uppercase;letter-spacing:0.2px;display:flex;align-items:center;gap:3px;margin-bottom:3px;white-space:nowrap;}',
            '.fmx-met .v{font-size:13.5px;font-weight:700;white-space:nowrap;}',
            '.fmx-met .pr{color:#5DCAA5;}',
            '.fmx-sp{margin-left:auto;display:flex;flex-direction:column;align-items:flex-start;}',
            '.fmx-sp svg{display:block;margin-top:-1px;}',
            '.fmx-acts{display:flex;gap:7px;margin-top:11px;flex-wrap:wrap;}',
            '.fmx-btn{flex:1;border-radius:10px;padding:10px 6px;font-size:11.5px;font-weight:600;cursor:pointer;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;display:flex;align-items:center;justify-content:center;gap:4px;transition:all 150ms;white-space:nowrap;}',
            '.fmx-btn-p{border:none;color:#fff;}',
            '.fmx-scard{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:13px;transition:border-color 200ms;}',
            '.fmx-scard:hover{border-color:rgba(255,255,255,0.14);}',
            '.fmx-srow{display:flex;align-items:center;gap:11px;}',
            '.fmx-sav{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0;}',
            '.fmx-lrow{display:flex;align-items:center;gap:11px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:11px;padding:11px 13px;cursor:pointer;transition:border-color 160ms;}',
            '.fmx-lrow:hover{border-color:rgba(255,255,255,0.14);}',
            '.fmx-ldot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}',
            '.fmx-lname{font-size:13px;font-weight:600;}',
            '.fmx-lsub{font-size:10.5px;color:#8990a8;}',
            '.fmx-lprice{margin-left:auto;font-size:13px;font-weight:700;color:#5DCAA5;}',
            '.fmx-hero{display:flex;align-items:flex-start;justify-content:center;padding:4px 0 18px;min-width:0;}.fmx-hero>.fmx-card{min-width:0;}',
            '.fmx-chsel{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:11px;padding:4px 4px 4px 13px;margin-bottom:6px;}',
            '.fmx-chsel i.lead{color:#818cf8;font-size:16px;}',
            '.fmx-chsel select{flex:1;background:transparent;border:none;color:#e8e8ed;font-size:13px;font-family:inherit;outline:none;padding:9px 4px;appearance:none;cursor:pointer;}',
            '.fmx-chnote{font-size:11px;color:#8990a8;margin:0 0 16px 4px;}',
            '.fmx-panes{position:relative;transition:height 360ms cubic-bezier(.2,.8,.2,1);}',
            '.fmx-pane{position:absolute;top:0;left:0;width:100%;opacity:0;transform:translateY(12px) scale(.99);transition:opacity 320ms,transform 360ms cubic-bezier(.2,.8,.2,1);pointer-events:none;}',
            '.fmx-pane.on{opacity:1;transform:none;pointer-events:auto;}',
            '.fmx-lbl{font-size:11px;color:#8990a8;text-transform:uppercase;letter-spacing:0.4px;margin:0 0 9px;font-weight:600;display:block;}',
            '.fmx-mtabs{display:flex;gap:6px;margin-bottom:14px;}',
            '.fmx-mt{flex:1;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;border-radius:9px;padding:9px;font-size:11.5px;cursor:pointer;transition:all 160ms;display:flex;align-items:center;justify-content:center;gap:5px;}',
            '.fmx-mt.on{background:rgba(99,102,241,0.13);color:#818cf8;border-color:rgba(99,102,241,0.28);}',
            '.fmx-grads{display:flex;gap:9px;flex-wrap:wrap;}',
            '.fmx-gd{width:36px;height:36px;border-radius:50%;cursor:pointer;position:relative;border:2px solid transparent;transition:transform 140ms;}',
            '.fmx-gd:hover{transform:scale(1.06);}',
            '.fmx-gd.on{border-color:rgba(255,255,255,0.95);}',
            '.fmx-gd.on::after{content:"\\2713";position:absolute;right:-5px;top:-5px;width:16px;height:16px;border-radius:50%;background:#fff;color:#0a0d18;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.45);}',
            '.fmx-dots{display:flex;gap:10px;flex-wrap:wrap;}',
            '.fmx-dot{width:34px;height:34px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform 140ms;}',
            '.fmx-dot:hover{transform:scale(1.1);}',
            '.fmx-dot.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,0.3);}',
            '.fmx-emg{display:grid;grid-template-columns:repeat(auto-fill,minmax(36px,1fr));gap:6px;margin-top:6px;}',
            '.fmx-em{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(255,255,255,0.04);border:1px solid transparent;border-radius:9px;cursor:pointer;transition:all 140ms;}',
            '.fmx-em.on{border-color:#6366f1;background:rgba(99,102,241,0.15);}',
            '.fmx-inp{width:100%;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;font-size:13px;color:#e8e8ed;font-family:inherit;outline:none;transition:border-color 160ms;}',
            '.fmx-inp:focus{border-color:rgba(99,102,241,0.28);}',
            'textarea.fmx-inp{resize:none;min-height:74px;}',
            '.fmx-mt2{margin-top:14px;}',
            '.fmx-row2{display:flex;gap:8px;flex-wrap:wrap;}.fmx-row2>*{flex:1;min-width:0;}',
            '.fmx-sel{width:100%;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:11px;font-size:12.5px;color:#e8e8ed;font-family:inherit;outline:none;appearance:none;cursor:pointer;}',
            '.fmx-chk{display:flex;align-items:center;gap:11px;padding:11px;border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:9px;cursor:pointer;transition:all 150ms;}',
            '.fmx-chk.on{background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.28);}',
            '.fmx-box{width:20px;height:20px;border-radius:6px;border:1.5px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;transition:all 150ms;}',
            '.fmx-chk.on .fmx-box{background:#6366f1;border-color:#6366f1;}',
            '.fmx-pinp{width:96px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px;font-size:12px;color:#e8e8ed;text-align:right;outline:none;}',
            '.fmx-tog{display:flex;align-items:center;gap:10px;padding:11px;border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:9px;cursor:pointer;}',
            '.fmx-sw{width:38px;height:22px;border-radius:99px;background:rgba(255,255,255,0.12);position:relative;transition:background 180ms;flex-shrink:0;}',
            '.fmx-sw i{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left 180ms;}',
            '.fmx-tog.on .fmx-sw{background:#5DCAA5;}.fmx-tog.on .fmx-sw i{left:18px;}',
            '.fmx-save{width:100%;border:none;background:linear-gradient(135deg,#5DCAA5,#34d399);color:#04342c;border-radius:14px;padding:15px;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 8px 22px rgba(93,202,165,0.35);display:flex;align-items:center;justify-content:center;gap:7px;transition:transform 140ms;}',
            '.fmx-save:active{transform:scale(0.98);}.fmx-save:disabled{opacity:0.6;}',
            '.fmx-savenote{font-size:10.5px;color:#565b73;line-height:1.5;text-align:center;margin-top:10px;}',
            '.fmx-mbg{position:fixed;inset:0;z-index:9100;background:rgba(5,7,14,0.72);backdrop-filter:blur(4px);display:none;align-items:flex-end;justify-content:center;}',
            '.fmx-mbg.fmx-show{display:flex;}',
            '@media(min-width:640px){.fmx-mbg{align-items:center;}}',
            '.fmx-modal{width:100%;max-width:480px;max-height:88vh;background:#11141f;border:0.5px solid rgba(255,255,255,0.1);border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;animation:fmxUp 320ms cubic-bezier(.2,.8,.2,1);}',
            '@media(min-width:640px){.fmx-modal{border-radius:20px;}}',
            '@keyframes fmxUp{from{transform:translateY(40px);opacity:0;}to{transform:none;opacity:1;}}',
            '.fmx-mhead{display:flex;align-items:flex-start;gap:10px;padding:18px 18px 12px;flex-shrink:0;border-bottom:0.5px solid rgba(255,255,255,0.06);}',
            '.fmx-mhead h2{margin:0;font-size:16px;font-weight:700;flex:1;display:flex;align-items:center;gap:7px;}',
            '.fmx-mhead p{margin:3px 0 0;font-size:11.5px;color:#8990a8;line-height:1.5;}',
            '.fmx-mclose{width:30px;height:30px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;font-size:16px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;}',
            '.fmx-mbody{padding:16px 18px 22px;overflow-y:auto;-webkit-overflow-scrolling:touch;}',
            '.fmx-ftabs{display:flex;gap:6px;margin-bottom:14px;}',
            '.fmx-ft{flex:1;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;border-radius:9px;padding:9px;font-size:12px;cursor:pointer;transition:all 150ms;}',
            '.fmx-ft.on{background:rgba(99,102,241,0.13);color:#818cf8;border-color:rgba(99,102,241,0.28);}',
            '.fmx-term{padding:11px 0;border-bottom:0.5px solid rgba(255,255,255,0.06);}',
            '.fmx-term h4{margin:0 0 4px;font-size:13px;font-weight:700;}',
            '.fmx-term p{margin:0;font-size:12px;color:#8990a8;line-height:1.5;}',
            '.fmx-tip{display:flex;gap:9px;align-items:flex-start;padding:9px 0;font-size:12.5px;color:#cdd0de;line-height:1.5;}',
            '.fmx-tip i{color:#5DCAA5;flex-shrink:0;margin-top:2px;}',
            '.fmx-po{border:0.5px solid rgba(255,255,255,0.1);border-radius:13px;padding:14px;margin-bottom:11px;}',
            '.fmx-po.gold{border-color:rgba(245,191,79,0.45);background:radial-gradient(130% 90% at 50% -10%,rgba(245,191,79,0.08),transparent 60%);}',
            '.fmx-po-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}',
            '.fmx-po-nm{font-size:14px;font-weight:700;display:flex;align-items:center;gap:7px;}',
            '.fmx-po-pr{font-size:15px;font-weight:700;}',
            '.fmx-po-pr.gold{color:#f5bf4f;}',
            '.fmx-po-li{font-size:12px;color:#a9aec0;line-height:1.5;display:flex;gap:7px;align-items:flex-start;margin-bottom:6px;}',
            '.fmx-po-li i{flex-shrink:0;margin-top:2px;color:#818cf8;}',
            '.fmx-po-li.gold i{color:#f5bf4f;}',
            '.fmx-po-buy{width:100%;margin-top:10px;border:none;border-radius:10px;padding:12px;font-size:12.5px;font-weight:700;cursor:pointer;color:#fff;background:rgba(99,102,241,0.85);}',
            '.fmx-po-buy.gold{background:linear-gradient(135deg,#f5bf4f,#d4a017);color:#231600;}',
            '.fmx-limit{font-size:11px;color:#f5bf4f;background:rgba(245,191,79,0.08);border:0.5px solid rgba(245,191,79,0.25);border-radius:9px;padding:9px 11px;margin-bottom:11px;display:flex;gap:7px;align-items:flex-start;line-height:1.5;}',
            '.fmx-limit i{flex-shrink:0;margin-top:1px;}',
            '.fmx-toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%) translateY(20px);background:rgba(20,24,40,0.96);border:0.5px solid rgba(93,202,165,0.3);color:#5DCAA5;padding:13px 20px;border-radius:12px;font-size:13px;font-weight:600;opacity:0;transition:all 300ms;backdrop-filter:blur(10px);z-index:100030;display:flex;align-items:center;gap:8px;pointer-events:none;}',
            '.fmx-toast.on{opacity:1;transform:translateX(-50%) translateY(0);}',
            '.fmx-fxg{margin-top:10px;}',
            '.fmx-fxl{font-size:10px;color:#8990a8;margin-bottom:6px;display:flex;align-items:center;gap:5px;}',
            '.fmx-fxl.vipc{color:#f5bf4f;}',
            '.fmx-fxw{display:flex;gap:6px;flex-wrap:wrap;}',
            '.fmx-fx{border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;border-radius:99px;padding:7px 11px;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 150ms;font-family:inherit;}',
            '.fmx-fx.on{background:rgba(99,102,241,0.14);color:#818cf8;border-color:rgba(99,102,241,0.3);}',
            '.fmx-fx.vip{border-color:rgba(245,191,79,0.3);color:#b9964d;}',
            '.fmx-fx.vip.on{background:rgba(245,191,79,0.12);color:#f5bf4f;border-color:rgba(245,191,79,0.5);}',
            '.fmx-fx .ti-lock{font-size:10px;}',
            '.fmx-avw{position:relative;width:46px;height:46px;flex-shrink:0;}',
            '.fmx-avw .fmx-av{position:relative;z-index:2;}',
            '.fmx-avhalo{position:absolute;inset:-5px;border-radius:17px;z-index:1;pointer-events:none;}',
            '.fmx-avover{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:3;}',
            '.fmx-avorb{position:absolute;inset:-9px;border-radius:50%;pointer-events:none;z-index:4;}',
            '.fx-m-levit{animation:fmxLevit 3.4s ease-in-out infinite;}',
            '@keyframes fmxLevit{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}',
            '.fx-m-pscale{animation:fmxPulseA 2.4s ease-in-out infinite;}',
            '@keyframes fmxPulseA{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}',
            '.fx-m-sway{animation:fmxSway 3.6s ease-in-out infinite;}',
            '@keyframes fmxSway{0%,100%{transform:rotate(-4deg);}50%{transform:rotate(4deg);}}',
            '.fx-m-glitch{animation:fmxGlitch 2.8s steps(1) infinite;}',
            '@keyframes fmxGlitch{0%,86%,100%{transform:translate(0,0) skewX(0);}88%{transform:translate(-2px,1px) skewX(3deg);}90%{transform:translate(2px,-1px) skewX(-2deg);}92%{transform:translate(-1px,-2px);}94%{transform:translate(1.5px,1px) skewX(2deg);}96%{transform:translate(0,0);}}',
            '.fx-g-neon{box-shadow:0 0 12px var(--fxa),0 0 24px var(--fxa);animation:fmxGlowP 2.6s ease-in-out infinite;}',
            '@keyframes fmxGlowP{0%,100%{opacity:.35;}50%{opacity:.85;}}',
            '.fx-g-prism{background:conic-gradient(#ff5f6d,#ffc371,#47e891,#4facfe,#b06ab3,#ff5f6d);-webkit-mask:radial-gradient(farthest-side,transparent 60%,#000 64%);mask:radial-gradient(farthest-side,transparent 60%,#000 64%);animation:fmxSpin 3.4s linear infinite;opacity:.95;}',
            '.fx-g-breath{box-shadow:0 0 18px 5px rgba(255,255,255,0.5);animation:fmxBreathH 3.4s ease-in-out infinite;}',
            '@keyframes fmxBreathH{0%,100%{transform:scale(0.94);opacity:.3;}50%{transform:scale(1.14);opacity:.8;}}',
            '.fx-g-gold{box-shadow:0 0 12px rgba(245,191,79,.85),0 0 26px rgba(245,191,79,.5);animation:fmxGoldF 2.8s steps(1) infinite;}',
            '@keyframes fmxGoldF{0%,100%{opacity:.55;}18%{opacity:.85;}34%{opacity:.6;}52%{opacity:.95;}68%{opacity:.7;}84%{opacity:.9;}}',
            '.fx-g-aurora{background:conic-gradient(from 180deg,#0fd07f,#17b3a3,#3b82f6,#8b5cf6,#10b981,#0fd07f);filter:blur(9px);animation:fmxSpin 11s linear infinite;}',
            '.fx-g-aurora::after{content:"";position:absolute;inset:0;border-radius:inherit;animation:fmxAur 5.5s ease-in-out infinite;background:inherit;filter:blur(4px);}',
            '@keyframes fmxAur{0%,100%{opacity:.15;}50%{opacity:.7;}}',
            '@keyframes fmxSpin{to{transform:rotate(360deg);}}',
            '.fx-o-holo::after{content:"";position:absolute;top:-30%;bottom:-30%;left:-70%;width:45%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.65),transparent);transform:skewX(-18deg);animation:fmxSweep 2.8s ease-in-out infinite;}',
            '@keyframes fmxSweep{70%,100%{transform:translateX(340%) skewX(-18deg);}}',
            '.fx-o-liquid{background:linear-gradient(125deg,rgba(245,191,79,.12),rgba(255,224,130,.28),rgba(212,160,23,.12));}',
            '.fx-o-liquid::after{content:"";position:absolute;top:-30%;bottom:-30%;left:-70%;width:50%;background:linear-gradient(105deg,transparent,rgba(255,224,130,.75),transparent);transform:skewX(-18deg);animation:fmxSweep 3.4s ease-in-out infinite;}',
            '.fx-o-rgb::before{content:"";position:absolute;inset:0;background:rgba(0,255,240,0.55);mix-blend-mode:screen;clip-path:inset(18% 0 64% 0);animation:fmxGlA 2.4s steps(1) infinite;opacity:0;}',
            '.fx-o-rgb::after{content:"";position:absolute;inset:0;background:rgba(255,0,170,0.55);mix-blend-mode:screen;clip-path:inset(58% 0 22% 0);animation:fmxGlB 2.4s steps(1) infinite;opacity:0;}',
            '@keyframes fmxGlA{0%,80%,100%{opacity:0;transform:translateX(0);clip-path:inset(18% 0 64% 0);}82%{opacity:1;transform:translateX(-3px);}86%{opacity:1;transform:translateX(2px);clip-path:inset(34% 0 46% 0);}90%{opacity:.8;transform:translateX(-1.5px);clip-path:inset(8% 0 76% 0);}94%{opacity:0;}}',
            '@keyframes fmxGlB{0%,80%,100%{opacity:0;transform:translateX(0);clip-path:inset(58% 0 22% 0);}83%{opacity:1;transform:translateX(3px);}87%{opacity:1;transform:translateX(-2px);clip-path:inset(72% 0 10% 0);}91%{opacity:.8;transform:translateX(1.5px);clip-path:inset(48% 0 36% 0);}95%{opacity:0;}}',
            '.fx-o-chroma::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,0,80,0.5),transparent 45%);mix-blend-mode:screen;animation:fmxChrA 2.6s ease-in-out infinite;}',
            '.fx-o-chroma::after{content:"";position:absolute;inset:0;background:linear-gradient(270deg,rgba(0,180,255,0.5),transparent 45%);mix-blend-mode:screen;animation:fmxChrB 2.6s ease-in-out infinite;}',
            '@keyframes fmxChrA{0%,100%{transform:translateX(-1px);opacity:.45;}50%{transform:translateX(-3.5px);opacity:.95;}}',
            '@keyframes fmxChrB{0%,100%{transform:translateX(1px);opacity:.45;}50%{transform:translateX(3.5px);opacity:.95;}}',
            '.fx-o-vhs{background:repeating-linear-gradient(0deg,rgba(255,255,255,0.07) 0 1px,transparent 1px 3px);box-shadow:inset 1.5px 0 0 rgba(0,255,240,0.35),inset -1.5px 0 0 rgba(255,0,170,0.35);}',
            '.fx-o-vhs::after{content:"";position:absolute;left:0;right:0;height:9px;top:-25%;background:linear-gradient(180deg,transparent,rgba(255,255,255,0.18),transparent);animation:fmxVhs 3.4s linear infinite;}',
            '@keyframes fmxVhs{to{transform:translateY(70px);}}',
            '.fx-orb-comet{animation:fmxSpin 3.2s linear infinite;}',
            '.fx-orb-comet::before{content:"";position:absolute;top:-2px;left:50%;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:var(--fxe,#fff);box-shadow:0 0 6px var(--fxe,#fff),0 0 16px var(--fxe,#f5bf4f);}',
            '.fx-orb-atom{border:1px solid rgba(255,255,255,.13);animation:fmxSpin 4.2s linear infinite;}',
            '.fx-orb-atom::before{content:"";position:absolute;top:-3px;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--fxe);box-shadow:0 0 7px var(--fxe);}',
            '.fx-orb-atom::after{content:"";position:absolute;bottom:-3px;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--fxe);box-shadow:0 0 7px var(--fxe);}',
            '.fx-orb-atom.r2{border-color:transparent;animation-direction:reverse;animation-duration:6s;}',
            '.fx-orb-o1{inset:-6px;animation:fmxSpin 3s linear infinite;}',
            '.fx-orb-o1::before{content:"";position:absolute;top:-2.5px;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--fxe);box-shadow:0 0 7px var(--fxe);}',
            '.fx-orb-o2{inset:-11px;border:1px dashed rgba(255,255,255,.10);animation:fmxSpin 4.6s linear infinite reverse;}',
            '.fx-orb-o2::before{content:"";position:absolute;top:-2.5px;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--fxe);box-shadow:0 0 7px var(--fxe);}',
            '.fx-orb-o3{inset:-16px;animation:fmxSpin 6.4s linear infinite;}',
            '.fx-orb-o3::before{content:"";position:absolute;top:-2.5px;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--fxe);box-shadow:0 0 7px var(--fxe);}',
            '.fx-c-warp{animation:fmxWarp 3.2s ease-in-out infinite;}',
            '@keyframes fmxWarp{0%,100%{border-radius:13px;transform:skewX(0deg) scale(1,1);}20%{border-radius:15px 11px 16px 12px;transform:skewX(2.5deg) scale(0.985,1.01);}45%{border-radius:11px 16px 12px 17px;transform:skewX(-2.5deg) scale(1.01,0.985);}70%{border-radius:16px 12px 15px 11px;transform:skewX(1.5deg) scale(0.99,1);}}',
            '.fx-c-slice{animation:fmxSliceC 2.6s steps(1) infinite;}',
            '@keyframes fmxSliceC{0%,74%,100%{clip-path:none;transform:translateX(0);}76%{clip-path:polygon(0 0,100% 0,100% 34%,94% 34%,94% 46%,100% 46%,100% 100%,0 100%,0 62%,7% 62%,7% 50%,0 50%);transform:translateX(1.5px);}80%{clip-path:polygon(0 0,100% 0,100% 18%,92% 18%,92% 30%,100% 30%,100% 100%,0 100%,0 80%,9% 80%,9% 66%,0 66%);transform:translateX(-2px);}84%{clip-path:none;transform:translateX(1px);}88%{clip-path:polygon(0 0,100% 0,100% 55%,90% 55%,90% 70%,100% 70%,100% 100%,0 100%,0 40%,8% 40%,8% 26%,0 26%);transform:translateX(-1px);}92%{clip-path:none;transform:translateX(0);}}',
            '.fx-c-slice::before{content:"";position:absolute;inset:0;background:inherit;border-radius:inherit;clip-path:inset(30% 0 52% 0);animation:fmxSliceB 2.6s steps(1) infinite;opacity:0;}',
            '@keyframes fmxSliceB{0%,74%,100%{opacity:0;transform:translateX(0);}77%{opacity:1;transform:translateX(-4px);}83%{opacity:1;transform:translateX(4px);clip-path:inset(56% 0 28% 0);}89%{opacity:0;}}',
            '.fx-c-shred::before{content:"";position:absolute;inset:0;background:inherit;border-radius:inherit;-webkit-mask:repeating-linear-gradient(0deg,#000 0 1.5px,transparent 1.5px 8px);mask:repeating-linear-gradient(0deg,#000 0 1.5px,transparent 1.5px 8px);filter:hue-rotate(80deg) saturate(2.2) brightness(1.3);opacity:.9;animation:fmxShredA 1.5s steps(3) infinite;}',
            '.fx-c-shred::after{content:"";position:absolute;inset:0;background:inherit;border-radius:inherit;-webkit-mask:repeating-linear-gradient(0deg,transparent 0 4.5px,#000 4.5px 6px,transparent 6px 10px);mask:repeating-linear-gradient(0deg,transparent 0 4.5px,#000 4.5px 6px,transparent 6px 10px);filter:hue-rotate(-80deg) saturate(2.2) brightness(1.3);opacity:.9;animation:fmxShredB 1.5s steps(3) infinite;}',
            '@keyframes fmxShredA{0%,100%{transform:translateX(-2.5px);}33%{transform:translateX(3px);}66%{transform:translateX(-1px);}}',
            '@keyframes fmxShredB{0%,100%{transform:translateX(2.5px);}33%{transform:translateX(-3px);}66%{transform:translateX(1.5px);}}',
            '.fx-c-blocks{animation:fmxBlkC 2.4s steps(1) infinite;}',
            '.fx-c-blocks::before{content:"";position:absolute;inset:0;background:inherit;clip-path:inset(12% 55% 52% 10%);filter:brightness(1.4) contrast(1.15);box-shadow:0 0 0 1px rgba(255,255,255,0.4) inset;animation:fmxBlkA 2.4s steps(1) infinite;opacity:0;}',
            '.fx-c-blocks::after{content:"";position:absolute;inset:0;background:inherit;clip-path:inset(55% 14% 10% 48%);filter:brightness(0.7) contrast(1.2);box-shadow:0 0 0 1px rgba(0,0,0,0.4) inset;animation:fmxBlkB 2.4s steps(1) infinite;opacity:0;}',
            '@keyframes fmxBlkC{0%,58%,100%{transform:translate(0,0);}60%{transform:translate(-2px,1px);}68%{transform:translate(2px,-1px);}76%{transform:translate(-1px,0);}84%{transform:translate(0,0);}}',
            '@keyframes fmxBlkA{0%,58%,100%{opacity:0;transform:translate(0,0);}60%{opacity:1;transform:translate(6px,-4px);}68%{opacity:1;transform:translate(-5px,3px);clip-path:inset(28% 36% 38% 28%);}76%{opacity:1;transform:translate(3px,1px);clip-path:inset(8% 62% 62% 6%);}84%{opacity:0;}}',
            '@keyframes fmxBlkB{0%,58%,100%{opacity:0;transform:translate(0,0);}62%{opacity:1;transform:translate(-6px,4px);}70%{opacity:1;transform:translate(5px,-3px);clip-path:inset(64% 8% 6% 56%);}78%{opacity:1;transform:translate(-3px,-1px);clip-path:inset(46% 30% 22% 34%);}86%{opacity:0;}}',
            '.fx-orb-sph{inset:0;}',
            '.fx-orb-sph i{position:absolute;inset:0;display:block;}',
            '.fx-orb-sph .sp2{transform:rotate(62deg);}',
            '.fx-orb-sph .sp3{transform:rotate(-62deg);}',
            '.fx-orb-sph i::before{content:"";position:absolute;top:50%;left:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:var(--fxe);box-shadow:0 0 7px var(--fxe),0 0 15px var(--fxe);animation:fmxSph 3s linear infinite;}',
            '.fx-orb-sph .sp2::before{animation-duration:3.9s;animation-delay:-1.2s;width:5px;height:5px;margin:-2.5px;}',
            '.fx-orb-sph .sp3::before{animation-duration:4.7s;animation-delay:-2.3s;width:5px;height:5px;margin:-2.5px;}',
            '@keyframes fmxSph{0%{transform:translate(27px,0) scale(1.1);opacity:1;}12.5%{transform:translate(19px,7px) scale(1.25);opacity:1;}25%{transform:translate(0,10px) scale(1.3);opacity:1;}37.5%{transform:translate(-19px,7px) scale(1.1);opacity:.95;}50%{transform:translate(-27px,0) scale(0.85);opacity:.7;}62.5%{transform:translate(-19px,-7px) scale(0.55);opacity:.4;}75%{transform:translate(0,-10px) scale(0.5);opacity:.35;}87.5%{transform:translate(19px,-7px) scale(0.75);opacity:.6;}100%{transform:translate(27px,0) scale(1.1);opacity:1;}}',
            '.fmx-chrow.dis{opacity:.55;}',
            '.fmx-lav{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;}',
            '.fmx-lav-fx{width:34px;height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}',
            '.fmx-lav-fx .fmx-avw{transform:scale(0.74);}',
            '.fmx-lchev{transition:transform 200ms;color:#565b73;flex-shrink:0;font-size:15px;}',
            '.fmx-li.on .fmx-lchev{transform:rotate(180deg);}',
            '.fmx-li.on>.fmx-lrow{border-color:rgba(99,102,241,0.35);}',
            '.fmx-lbox{margin-top:8px;}',
            '.fmx-chdd{position:relative;margin-bottom:6px;}',
            '.fmx-chbtn{width:100%;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:11px;padding:11px 13px;color:#e8e8ed;font-size:13px;font-family:inherit;cursor:pointer;text-align:left;}',
            '.fmx-chbtn i.lead{color:#818cf8;font-size:16px;flex-shrink:0;}',
            '.fmx-chbtn .chev{margin-left:auto;color:#8990a8;transition:transform 200ms;flex-shrink:0;}',
            '.fmx-chdd.on .chev{transform:rotate(180deg);}',
            '.fmx-chlist{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#141828;border:0.5px solid rgba(255,255,255,0.1);border-radius:13px;box-shadow:0 14px 34px rgba(0,0,0,0.55);z-index:60;display:none;max-height:264px;overflow-y:auto;}',
            '.fmx-chdd.on .fmx-chlist{display:block;}',
            '.fmx-chrow{display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer;transition:background 130ms;}',
            '.fmx-chrow:hover{background:rgba(255,255,255,0.05);}',
            '.fmx-chrow.sel{background:rgba(99,102,241,0.12);}',
            '.fmx-chav{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;}',
            '.fmx-chtt{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-chuu{font-size:10.5px;color:#8990a8;}',
            '.fmx-upl{border:0.5px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);color:#e8e8ed;border-radius:10px;padding:10px 13px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:border-color 150ms;}',
            '.fmx-upl:hover{border-color:rgba(255,255,255,0.25);}',
            '.fmx-upl.sec{color:#8990a8;}',
            '.fmx-uplrow{display:flex;gap:7px;flex-wrap:wrap;}',
            '#fmx-cropBox{position:relative;width:100%;background:#0a0d18;border-radius:12px;overflow:hidden;touch-action:none;cursor:grab;border:0.5px solid rgba(255,255,255,0.1);}',
            '#fmx-cropBox:active{cursor:grabbing;}',
            '.fmx-zoomrow{display:flex;align-items:center;gap:10px;margin-top:12px;}',
            '.fmx-zoomrow input{flex:1;accent-color:#818cf8;}',
            '.fmx-safeT,.fmx-safeB{position:absolute;left:0;right:0;background:rgba(5,7,14,0.6);pointer-events:none;transition:height 60ms linear,top 60ms linear;}',
            '.fmx-safeT{top:0;}',
            '.fmx-safeF{position:absolute;left:0;right:0;border-top:1.5px dashed rgba(255,255,255,0.75);border-bottom:1.5px dashed rgba(255,255,255,0.75);pointer-events:none;transition:top 60ms linear;}',
            '.fmx-safeF span{position:absolute;right:0;top:0;font-size:9px;background:rgba(10,13,24,0.75);padding:2px 7px;border-radius:0 0 0 7px;color:#e8e8ed;}',
            '.fmx-safeR{position:absolute;inset:0;border-radius:28%;border:1.5px dashed rgba(255,255,255,0.75);box-shadow:0 0 0 999px rgba(5,7,14,0.6);pointer-events:none;}',
            '.fmx-dot-rb{border-radius:50%;border:2px solid rgba(255,255,255,0.85);background:conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);}',
            '.fmx-cbg{position:absolute;inset:0;z-index:0;overflow:hidden;border-radius:inherit;}',
            '.fmx-cbg-s{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,13,24,0.35),rgba(10,13,24,0.86) 72%);}',
            '.fmx-fchips{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;}',
            '.fmx-fchips span{font-size:9.5px;color:#8990a8;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.07);padding:3px 8px;border-radius:6px;}',
            '.fmx-met2{display:flex;align-items:center;gap:8px;font-size:10px;color:#8990a8;margin-top:8px;flex-wrap:wrap;}',
            '.fmx-met2 b{color:#565b73;font-weight:600;margin-right:2px;}',
            '.fmx-met2 i{width:3px;height:3px;border-radius:50%;background:#3a3f55;flex-shrink:0;}',
            '.fmx-lsp{flex-shrink:0;display:flex;align-items:center;}',
            '.fmx-lmet{font-size:10px;color:#8990a8;margin-top:3px;display:flex;align-items:center;gap:3px 6px;flex-wrap:wrap;line-height:1.45;}',
            '.fmx-lmet b{color:#c9cbe0;font-weight:600;}',
            '.fmx-lmet s{width:3px;height:3px;border-radius:50%;background:#3a3f55;text-decoration:none;flex-shrink:0;display:inline-block;}',
            '.fmx-lright{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;}',
            '.fmx-li.prem>.fmx-lrow{border-color:transparent;box-shadow:0 0 0 1.5px rgba(245,191,79,0.6),0 0 18px rgba(245,191,79,0.3);}',
            '.fmx-chk .fmx-box i{opacity:0;transition:opacity 130ms;}',
            '.fmx-chk.on .fmx-box i{opacity:1;}',
            '.fmx-huerow{display:none;align-items:center;gap:10px;margin-top:10px;}',
            '.fmx-huerow input{flex:1;-webkit-appearance:none;appearance:none;height:10px;border-radius:99px;background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);outline:none;border:0.5px solid rgba(255,255,255,0.15);}',
            '.fmx-huerow input::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;border-radius:50%;background:#fff;border:2.5px solid rgba(10,13,24,0.85);box-shadow:0 2px 7px rgba(0,0,0,0.45);cursor:pointer;}',
            '.fmx-hueprev{width:24px;height:24px;border-radius:50%;flex-shrink:0;border:2px solid rgba(255,255,255,0.85);}',
            '.fmx-req{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px 13px;}',
            '.fmx-req.mine{border-color:rgba(129,140,248,0.35);}',
            '.fmx-reqh{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;}',
            '.fmx-reqn{font-size:10px;font-weight:700;color:#818cf8;background:rgba(129,140,248,0.12);padding:3px 9px;border-radius:7px;}',
            '.fmx-reqf{font-size:10px;color:#8990a8;background:rgba(255,255,255,0.05);padding:3px 9px;border-radius:7px;}',
            '.fmx-reqb{margin-left:auto;font-size:12px;font-weight:700;color:#5DCAA5;}',
            '.fmx-reqt{font-size:12.5px;line-height:1.55;color:#c9cbe0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;}',
            '.fmx-reqft{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:11px;padding-top:10px;border-top:0.5px solid rgba(255,255,255,0.06);font-size:10px;color:#565b73;}',
            '.fmx-reqft>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-reqft .fmx-btn{flex:0 0 auto;width:auto;}',
            '.fmx-reqb.na{color:#565b73;font-weight:500;}',
            'textarea.fmx-inp{resize:vertical;min-height:84px;font-family:inherit;line-height:1.5;}',
            '.fmx-toast.err{border-color:rgba(239,68,68,0.4);color:#f87171;}',
            '.fmx-cfm{position:fixed;inset:0;z-index:100005;background:rgba(5,7,14,0.6);display:flex;align-items:center;justify-content:center;padding:24px;}',
            '.fmx-cfm-box{background:#141826;border:0.5px solid rgba(255,255,255,0.12);border-radius:16px;padding:18px;max-width:320px;width:100%;box-shadow:0 18px 50px rgba(0,0,0,0.5);}',
            '.fmx-cfm-t{font-size:13px;line-height:1.55;color:#e8e8ed;margin-bottom:14px;}',
            '.fmx-cfm-r{display:flex;gap:8px;}',
            /* палитра «Свой цвет»: HSV-квадрат/спектр + HEX + RGB (перенос из макета постера) */
            '.fmx-cp-sv{position:relative;width:100%;height:140px;border-radius:10px;overflow:hidden;cursor:crosshair;touch-action:none;}',
            '.fmx-cp-sv canvas{width:100%;height:100%;display:block;}',
            '.fmx-cp-dot{position:absolute;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px rgba(0,0,0,0.6);transform:translate(-50%,-50%);pointer-events:none;}',
            '.fmx-cp-hue{width:100%;margin-top:10px;-webkit-appearance:none;appearance:none;height:13px;border-radius:8px;background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);outline:none;border:0.5px solid rgba(255,255,255,0.15);}',
            '.fmx-cp-hue::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;border:2.5px solid rgba(10,13,24,0.85);box-shadow:0 2px 7px rgba(0,0,0,0.45);cursor:pointer;}',
            '.fmx-cp-row{display:flex;gap:6px;margin-top:10px;align-items:flex-end;}',
            '.fmx-cp-fld{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0;}',
            '.fmx-cp-fld.hexf{flex:1.6;}',
            '.fmx-cp-cap{font-size:9px;letter-spacing:0.8px;color:#8990a8;text-transform:uppercase;font-weight:600;text-align:center;}',
            '.fmx-cp-fld input{width:100%;background:#0f1322;border:0.5px solid rgba(255,255,255,0.12);color:#e8e8ed;font-size:12.5px;padding:9px 2px;border-radius:10px;text-align:center;outline:none;font-family:inherit;-moz-appearance:textfield;appearance:textfield;}',
            '.fmx-cp-fld input::-webkit-outer-spin-button,.fmx-cp-fld input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}',
            '.fmx-cp-fld input:focus{border-color:rgba(93,202,165,0.5);}',
            '.fmx-cp-presets{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px;}',
            '.fmx-cp-pd{width:30px;height:30px;border-radius:9px;cursor:pointer;border:1.5px solid rgba(255,255,255,0.18);padding:0;}',
            '#fmx-buysort .fmx-seg{min-height:40px;}',
            /* панели сортировок листаются пальцем — полосу прокрутки не показываем */
            '.fmx-sortbar{scrollbar-width:none;-ms-overflow-style:none;}',
            '.fmx-sortbar::-webkit-scrollbar{display:none;}',
            /* панель «Купить» с кнопкой «Фильтры»: на ПК мышкой горизонтально не прокрутить — показываем аккуратный тонкий скроллбар, чтобы долистать до фильтров */
            '#fmx-buysort{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.24) transparent;padding-bottom:5px;}',
            '#fmx-buysort::-webkit-scrollbar{display:block;height:6px;}',
            '#fmx-buysort::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.2);border-radius:6px;}',
            '#fmx-buysort::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.34);}',
            '#fmx-buysort::-webkit-scrollbar-track{background:transparent;}',
            /* пульт промо-постера */
            '.fmx-ps{width:100%;max-width:580px;max-height:92vh;overflow-y:auto;background:#0b0e18;border:0.5px solid rgba(255,255,255,0.12);border-bottom:none;border-radius:18px 18px 0 0;padding:14px 14px 22px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.28) transparent;scrollbar-gutter:stable;}',
            '.fmx-ps::-webkit-scrollbar{width:9px;}',
            '.fmx-ps::-webkit-scrollbar-track{background:transparent;}',
            '.fmx-ps::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.28);border-radius:6px;border:2px solid transparent;background-clip:padding-box;}',
            '.fmx-ps-scroll{scrollbar-width:none;-ms-overflow-style:none;}',
            '.fmx-ps-scroll::-webkit-scrollbar{display:none;}',
            '.fmx-ps .fmx-fx{min-height:40px;}',
            '.fmx-tl{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.09);padding:4px 9px;border-radius:8px;vertical-align:middle;}',
            '.fmx-tl i{width:7px;height:7px;border-radius:50%;background:#262b40;flex-shrink:0;}',
            '.fmx-tl i.red.on{background:#ef4444;box-shadow:0 0 7px rgba(239,68,68,0.8);}',
            '.fmx-tl i.amber.on{background:#f59e0b;box-shadow:0 0 7px rgba(245,158,11,0.8);}',
            '.fmx-tl i.green.on{background:#5DCAA5;box-shadow:0 0 7px rgba(93,202,165,0.8);}',
            '.fmx-tl b{font-size:9.5px;font-weight:700;margin-left:2px;}',
            '.fmx-tlm{background:transparent;border:none;padding:0 2px 0 0;gap:3px;flex-shrink:0;}',
            '.fmx-stk{position:absolute;z-index:2;pointer-events:none;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.35));}',
            '.fmx-stkGrab{position:absolute;z-index:9;cursor:grab;touch-action:none;}',
            '.fmx-stkGrab:active{cursor:grabbing;}',
            '.fmx-stkGrab.sel{outline:1.5px dashed rgba(129,140,248,0.9);outline-offset:3px;}',
            '.fmx-stkh{position:absolute;width:15px;height:15px;border-radius:50%;background:#818cf8;border:2px solid #0b0e18;box-shadow:0 1px 4px rgba(0,0,0,0.5);pointer-events:auto;z-index:9;}',
            '.fmx-stkh.rot{top:-23px;left:50%;margin-left:-8px;cursor:grab;}',
            '.fmx-stkh.rsz{right:-9px;bottom:-9px;cursor:nwse-resize;border-radius:4px;}',
            '.fmx-stkh.del{right:-9px;top:-9px;display:flex;align-items:center;justify-content:center;background:#ef4444;color:#fff;font-size:9px;cursor:pointer;}',
            '.fmx-stk.m-top{z-index:5;}',
            '.fmx-stk.m-blend{z-index:5;opacity:0.55;}',
            /* управление стикером на карточке 1 в 1 с макетом постера: рамка и ручки видны по тапу, режим — три точки под рамкой */
            '.fmx-stkGrab .fmx-stkh{display:none;}',
            '.fmx-stkGrab.sel .fmx-stkh{display:flex;align-items:center;justify-content:center;}',
            '.fmx-stkmodes{position:absolute;bottom:-38px;left:50%;transform:translateX(-50%);display:none;gap:4px;pointer-events:auto;}',
            '.fmx-stkGrab.sel .fmx-stkmodes{display:flex;}',
            '.fmx-stkmd{width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:none;border:none;padding:0;}',
            '.fmx-stkmd i{width:16px;height:16px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.35);background:#0d1120;}',
            '.fmx-stkmd.on i{border-color:#5DCAA5;background:rgba(93,202,165,0.35);}',
            '.fmx-stkModeLabel{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,13,24,0.85);border:0.5px solid rgba(93,202,165,0.4);color:#5DCAA5;font-size:11px;font-weight:600;padding:5px 12px;border-radius:999px;z-index:9;opacity:0;transition:opacity 0.2s;pointer-events:none;white-space:nowrap;}',
            '.fmx-stkModeLabel.show{opacity:1;}',
            '.fmx-stkgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:7px;max-width:100%;}',
            '.fmx-stkcell{min-width:0;}',
            '.fmx-stkcell{position:relative;aspect-ratio:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:11px;padding:5px;cursor:pointer;transition:border-color 150ms;}',
            '.fmx-stkcell.on{border-color:#818cf8;box-shadow:0 0 0 1px #818cf8;}',
            '.fmx-stkcell img,.fmx-stkcell video{width:100%;height:100%;object-fit:contain;pointer-events:none;}',
            '.fmx-stkdel{position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;background:#1a1f30;border:1px solid rgba(255,255,255,0.18);color:#8990a8;font-size:11px;line-height:1;cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;}',
            '.fmx-stkcell:hover .fmx-stkdel{display:flex;}',
            '.fmx-stk-tgs{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#818cf8;font-size:22px;}',
            '.fmx-stk-anim{position:absolute;bottom:3px;left:0;right:0;text-align:center;font-size:8px;color:#f59e0b;}',
            '.fmx-stkrow{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:11px;color:#8990a8;}',
            '.fmx-stkrow span{width:52px;flex-shrink:0;}',
            '.fmx-stkrow input{flex:1;}',
            '.fmx-pday{font-size:11.5px;color:#c9cbe0;background:rgba(245,158,11,0.07);border:0.5px solid rgba(245,158,11,0.2);border-radius:11px;padding:10px 12px;margin-bottom:14px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;}',
            '.fmx-pday b{color:#f59e0b;}',
            '.fmx-thead{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;}',
            '.fmx-tlive{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;color:#22c55e;background:rgba(34,197,94,0.1);border:0.5px solid rgba(34,197,94,0.28);border-radius:20px;padding:4px 9px 4px 8px;}',
            '.fmx-tdot{width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,0.6);animation:fmxTpulse 1.8s infinite;}',
            '@keyframes fmxTpulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,0.5);}70%{box-shadow:0 0 0 6px rgba(34,197,94,0);}100%{box-shadow:0 0 0 0 rgba(34,197,94,0);}}',
            '.fmx-tstamp{font-size:10.5px;color:#565b73;margin-left:auto;display:inline-flex;align-items:center;gap:4px;}',
            '.fmx-tstrip{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:6px;}',
            '.fmx-tcell{background:linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015));border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:10px 11px;min-width:0;}',
            '.fmx-tcl{font-size:8.5px;font-weight:700;color:#8990a8;text-transform:uppercase;letter-spacing:0.3px;line-height:1.25;min-height:22px;}',
            '.fmx-tcv{font-size:18px;font-weight:800;color:#fff;margin-top:3px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-tcv small{font-size:11px;font-weight:700;color:#8990a8;}',
            '.fmx-tvol{font-size:10.5px;color:#8990a8;display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:2px 0 6px;}',
            '.fmx-tvol b{color:#c9cbe0;font-weight:700;font-variant-numeric:tabular-nums;}',
            '.fmx-tvol i{font-size:12px;}',
            '.fmx-psec{font-size:11px;font-weight:700;color:#8990a8;text-transform:uppercase;letter-spacing:0.4px;margin:18px 0 9px;display:flex;align-items:center;gap:6px;}',
            '.fmx-pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}',
            '.fmx-ptile{border:0.5px solid;border-radius:13px;padding:11px 12px;background:rgba(255,255,255,0.018);min-width:0;}',
            '.fmx-pthead{display:flex;align-items:center;gap:6px;min-width:0;}',
            '.fmx-ptdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}',
            '.fmx-ptn{font-size:11px;font-weight:700;color:#e8e8ed;text-transform:capitalize;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;}',
            '.fmx-ptv{font-size:16px;font-weight:800;color:#fff;margin:6px 0 4px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-ptu{font-size:10px;font-weight:700;color:#8990a8;}',
            '.fmx-pbar{height:3px;border-radius:3px;background:rgba(255,255,255,0.07);overflow:hidden;margin:0 0 7px;}',
            '.fmx-pbarf{height:100%;border-radius:3px;}',
            '.fmx-ptmeta{display:flex;flex-wrap:wrap;gap:4px 8px;font-size:9.5px;color:#8990a8;font-variant-numeric:tabular-nums;}',
            '.fmx-pts{font-size:9.5px;color:#8990a8;}',
            '.fmx-bmrow{position:relative;margin-bottom:9px;cursor:pointer;}',
            '.fmx-bmrow.frz .fmx-zw{filter:grayscale(1);opacity:0.5;pointer-events:none;}',
            '.fmx-frzTag{position:absolute;top:8px;right:36px;font-size:9px;font-weight:700;color:#8fb6ff;background:rgba(99,140,255,0.14);border:0.5px solid rgba(99,140,255,0.3);padding:3px 7px;border-radius:6px;display:flex;align-items:center;gap:4px;z-index:3;}',
            '.fmx-bmdel{position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:8px;background:rgba(10,13,24,0.6);border:0.5px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;z-index:3;transition:all 140ms;}',
            '.fmx-bmdel.arm{background:#ef4444;border-color:#ef4444;color:#fff;transform:scale(1.12);}',
            '.fmx-b-deal{color:#f59e0b;background:rgba(245,158,11,0.1);}',
            '.fmx-dealline{font-size:11px;color:#8990a8;margin-top:10px;display:flex;align-items:center;gap:6px;justify-content:center;}',
            '.fmx-revs{margin-top:12px;padding:11px 12px;background:rgba(245,158,11,0.05);border:0.5px solid rgba(245,158,11,0.15);border-radius:11px;}',
            '.fmx-revs-t{font-size:11px;font-weight:700;color:#e8e8ed;margin-bottom:7px;display:flex;align-items:center;gap:5px;}',
            '.fmx-rev{display:flex;flex-direction:column;gap:2px;padding:7px 0;border-top:0.5px solid rgba(255,255,255,0.05);}',
            '.fmx-rev:first-of-type{border-top:none;padding-top:0;}',
            '.fmx-rev-s{color:#f59e0b;font-size:11px;letter-spacing:1px;}',
            '.fmx-rev-x{font-size:11.5px;color:#c9cbe0;line-height:1.5;overflow-wrap:anywhere;}',
            '.fmx-rev-a{font-size:9.5px;color:#565b73;}',
            '.fmx-dealtgl{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#c9cbe0;margin-top:12px;cursor:pointer;}',
            '.fmx-dealtgl input{accent-color:#818cf8;width:15px;height:15px;}',
            '.fmx-pend{margin-top:12px;padding:11px 12px;background:rgba(245,158,11,0.06);border:0.5px solid rgba(245,158,11,0.2);border-radius:12px;}',
            '.fmx-pend-t{font-size:11px;font-weight:700;color:#e8e8ed;margin-bottom:8px;display:flex;align-items:center;gap:6px;}',
            '.fmx-pend-r{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;font-size:11px;color:#8990a8;border-top:0.5px solid rgba(255,255,255,0.05);}',
            '.fmx-pend-r:first-of-type{border-top:none;}',
            '.fmx-tlm i{width:6px;height:6px;}',
            '.fmx-leads{margin-top:11px;padding:10px 11px;background:rgba(129,140,248,0.06);border:0.5px solid rgba(129,140,248,0.18);border-radius:11px;}',
            '.fmx-leads-t{font-size:10px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:0.3px;display:flex;align-items:center;gap:5px;margin-bottom:8px;}',
            '.fmx-lead{display:flex;flex-direction:column;gap:1px;padding:7px 0;border-top:0.5px solid rgba(255,255,255,0.05);text-decoration:none;}',
            '.fmx-lead:first-of-type{border-top:none;padding-top:0;}',
            '.fmx-lead b{font-size:12px;color:#e8e8ed;font-weight:600;}',
            '.fmx-lead span{font-size:10px;color:#8990a8;}',
            '.fmx-acc{background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;margin-bottom:9px;overflow:hidden;}',
            '.fmx-acc.open{border-color:rgba(99,102,241,0.3);}',
            '.fmx-acch{display:flex;align-items:center;gap:11px;padding:12px 13px;cursor:pointer;user-select:none;}',
            '.fmx-accic{width:30px;height:30px;border-radius:9px;background:rgba(129,140,248,0.12);display:flex;align-items:center;justify-content:center;color:#818cf8;font-size:15px;flex-shrink:0;}',
            '.fmx-acct{font-size:13px;font-weight:600;letter-spacing:-0.2px;}',
            '.fmx-accv{font-size:10.5px;color:#8990a8;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-accc{color:#565b73;font-size:17px;transition:transform 240ms;flex-shrink:0;}',
            '.fmx-acc.open .fmx-accc{transform:rotate(180deg);}',
            '.fmx-accb{max-height:0;overflow:hidden;transition:max-height 320ms ease;}',
            '.fmx-acc.open .fmx-accb{max-height:1400px;}',
            '.fmx-acci{padding:2px 13px 15px;}',
            '#fmx-mini{position:absolute;left:0;right:0;top:60px;z-index:45;padding:6px 14px;transform:translateY(-16px);opacity:0;visibility:hidden;transition:transform 240ms cubic-bezier(.2,.8,.2,1),opacity 200ms,visibility 240ms;pointer-events:none;}',
            '#fmx-mini.on{transform:translateY(0);opacity:1;visibility:visible;}',
            '#fmx-mini .in{max-width:640px;margin:0 auto;background:rgba(13,16,28,0.92);backdrop-filter:blur(10px);border:0.5px solid rgba(255,255,255,0.12);border-radius:13px;padding:6px 11px;display:flex;align-items:center;gap:9px;box-shadow:0 10px 28px rgba(0,0,0,0.5);pointer-events:auto;cursor:pointer;}',
            '#fmx-mini .mini-cov{width:40px;height:26px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;}',
            '#fmx-mini .mini-av{transform:scale(0.7);margin:-8px -7px;flex-shrink:0;}',
            '.fmx-entq{font-size:13px;color:#8990a8;margin-bottom:12px;}',
            '.fmx-ent{display:flex;align-items:center;gap:14px;padding:16px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:16px;cursor:pointer;margin-bottom:11px;transition:border-color 160ms,transform 160ms;}',
            '.fmx-ent:active{transform:scale(0.99);}',
            '.fmx-ent:hover{border-color:rgba(255,255,255,0.14);}',
            '.fmx-entic{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:25px;color:#fff;flex-shrink:0;}',
            '.fmx-entn{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
            '.fmx-enttag{font-size:9.5px;font-weight:600;padding:2px 8px;border-radius:99px;}',
            '.fmx-entd{font-size:11.5px;color:#8990a8;line-height:1.4;margin-top:4px;}'
        ].join('');
        document.head.appendChild(s);
    }

    /* ===================== shell ===================== */
    function ensureRoot() {
        if (_root) return;
        injectStyles();
        var d = document.createElement('div');
        d.id = 'fmx-screen';
        d.innerHTML =
            '<div class="fmx-head"><button class="fmx-ibtn" id="fmx-back" title="Назад" style="margin-right:2px;"><i class="ti ti-arrow-left"></i></button>' +
            '<div style="flex:1;min-width:0;overflow:hidden;"><h1 id="fmx-htitle" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Рынок рекламы</h1><p id="fmx-hsub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none;"></p></div>' +
            '<button class="fmx-ibtn" id="fmx-faq" title="Справка"><i class="ti ti-help"></i></button>' +
            '<button class="fmx-ibtn" id="fmx-bhelp" style="margin-left:7px;" title="Что значат бейджи"><i class="ti ti-rosette-discount-check"></i></button>' +
            '<button class="fmx-ibtn" id="fmx-bm" style="margin-left:7px;"><i class="ti ti-star"></i><span class="fmx-bmc" id="fmx-bmc" style="display:none;">0</span></button></div>' +
            '<div id="fmx-mini"><div class="in" id="fmx-miniIn"></div></div>' +
            '<div class="fmx-scroll" id="fmx-scrollEl"><div class="fmx-pad" id="fmx-main"></div></div>';
        document.body.appendChild(d);
        _root = d;
        el('fmx-faq').addEventListener('click', openFaq);
        el('fmx-bhelp').addEventListener('click', openBadgeGuide);
        el('fmx-bm').addEventListener('click', openBookmarks);
        // подсказки пульсируют, пока человек не откроет их хотя бы раз (запоминаем в localStorage)
        _pulseHint('fmx-faq', 'fmx_seen_faq');
        _pulseHint('fmx-bhelp', 'fmx_seen_badges');
        // стрелка «назад»: с под-раздела (Площадка/База/Пульс) — на главный экран; с главного — закрыть приложение
        el('fmx-back').addEventListener('click', function () { _haptic('light'); if (_mainTab !== 'enter') setMainTab('enter'); else close(); });
        document.addEventListener('click', function (e) { var dd = el('fmx-chdd'); if (dd && dd.classList.contains('on') && !dd.contains(e.target)) dd.classList.remove('on'); });
        el('fmx-scrollEl').addEventListener('scroll', checkMini, { passive: true });
        el('fmx-mini').addEventListener('click', function () { _haptic('light'); el('fmx-scrollEl').scrollTo({ top: 0, behavior: 'smooth' }); });
        buildModals();
        window.addEventListener('resize', function () { if (el('fmx-subtabs')) movePill('fmx-subtabs', 'fmx-subpill'); if (el('fmx-pult')) movePill('fmx-pult', 'fmx-pultpill'); if (el('fmx-panes')) sizePanes(); });
    }

    var _prevOverflow = null;
    function lockPage() {
        if (_prevOverflow !== null) return;
        _prevOverflow = [document.documentElement.style.overflow || '', document.body.style.overflow || ''];
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }
    function unlockPage() {
        if (_prevOverflow === null) return;
        document.documentElement.style.overflow = _prevOverflow[0];
        document.body.style.overflow = _prevOverflow[1];
        _prevOverflow = null;
    }
    function open(channelId) {
        ensureRoot();
        _opened = true;
        _root.classList.add('fmx-show');
        lockPage();
        loadBookmarks();
        setMainTab('enter', true);
    }
    function close() { if (_root) _root.classList.remove('fmx-show'); _opened = false; unlockPage(); }

    function movePill(barId, pillId) {
        var bar = el(barId); if (!bar) return;
        var pill = el(pillId), b = bar.querySelector('.fmx-pb.on');
        if (!pill || !b) return;
        pill.style.width = b.offsetWidth + 'px';
        pill.style.transform = 'translateX(' + (b.offsetLeft - 4) + 'px)';
    }

    function setMainTab(t, force) {
        if (!force && t === _mainTab) return;
        _mainTab = t;
        // стрелка «назад» видна всегда (на главном экране закрывает приложение, глубже — ведёт назад)
        var ti = el('fmx-htitle'), su = el('fmx-hsub');
        if (ti && su) {
            if (t === 'catalog') { ti.textContent = 'База каналов'; su.textContent = 'Все каналы, собранные ботом'; su.style.display = ''; }
            else if (t === 'market') { ti.textContent = 'Площадка'; su.textContent = 'ForgeMetrics · живые заявки'; su.style.display = ''; }
            else if (t === 'pulse') { ti.textContent = 'Рыночный терминал'; su.textContent = 'Медианы CPM по нишам'; su.style.display = ''; }
            else { ti.textContent = 'Рынок рекламы'; su.textContent = ''; su.style.display = 'none'; }
        }
        var host = el('fmx-main');
        host.classList.remove('fmx-fade'); void host.offsetWidth; host.classList.add('fmx-fade');
        if (t === 'catalog') renderCatalog();
        else if (t === 'market') renderMarket();
        else if (t === 'pulse') renderPulse();
        else renderEnter();
        checkMini();
    }

    /* ===================== render: enter ===================== */
    function loadPulse(cb) {
        if (_pulse && Date.now() - _pulseTs < 300000) { if (cb) cb(); return; }
        apiGet('/api/v1/marketplace/pulse').then(function (r) {
            if (r && r.ok) { _pulse = r; _pulseTs = Date.now(); }
            if (cb) cb();
        }).catch(function () { if (cb) cb(); });
    }
    function _heatColor(v, min, max) {
        if (v == null || max <= min) return 'rgba(255,255,255,0.05)';
        var t = (v - min) / (max - min);  /* 0 = дёшево (зелёный), 1 = дорого (красный) */
        var hue = 145 - t * 145;
        return 'hsla(' + Math.round(hue) + ',65%,45%,0.16)';
    }
    function _heatBorder(v, min, max) {
        if (v == null || max <= min) return 'rgba(255,255,255,0.08)';
        var t = (v - min) / (max - min);
        return 'hsla(' + Math.round(145 - t * 145) + ',65%,55%,0.45)';
    }
    function _pmedian(arr) {
        var a = arr.filter(function (v) { return v != null; }).sort(function (x, y) { return x - y; });
        if (!a.length) return null;
        var m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    }
    function pulseTiles(items, kindLabel) {
        var cpms = items.map(function (x) { return x.median_cpm; }).filter(function (v) { return v != null; });
        var mn = cpms.length ? Math.min.apply(null, cpms) : 0, mx = cpms.length ? Math.max.apply(null, cpms) : 1;
        return '<div class="fmx-pgrid">' + items.map(function (x) {
            var has = x.median_cpm != null;
            var col = _heatBorder(x.median_cpm, mn, mx);
            /* полоса «выгодности»: полнее и зеленее = дешевле медианы (лучше покупателю) */
            var gauge = has ? (mx > mn ? Math.round((mx - x.median_cpm) / (mx - mn) * 100) : 100) : 0;
            var meta = [];
            if (x.median_price) meta.push('<span>от ' + _num(x.median_price) + ' ₽</span>');
            if (x.median_er != null && has) meta.push('<span>ER ' + x.median_er + '%</span>');
            meta.push('<span>' + x.count + ' ' + kindLabel + '</span>');
            return '<div class="fmx-ptile" style="border-color:' + col + ';">' +
                '<div class="fmx-pthead"><span class="fmx-ptdot" style="background:' + (has ? col : 'rgba(255,255,255,0.15)') + ';"></span><span class="fmx-ptn">' + _esc(x.niche) + '</span></div>' +
                '<div class="fmx-ptv">' + (has ? _num(x.median_cpm) + ' <span class="fmx-ptu">₽ · CPM</span>' : (x.median_er != null ? x.median_er + ' <span class="fmx-ptu">% · ER</span>' : '<span class="fmx-ptu">нет данных</span>')) + '</div>' +
                (has ? '<div class="fmx-pbar"><div class="fmx-pbarf" style="width:' + gauge + '%;background:' + col + ';"></div></div>' : '') +
                '<div class="fmx-ptmeta">' + meta.join('') + '</div>' +
                '</div>';
        }).join('') + '</div>';
    }
    function _termHead() {
        var ago = '';
        if (_pulse.generated_at) {
            var gm = Math.round((Date.now() - Date.parse(_pulse.generated_at)) / 60000);
            if (isNaN(gm) || gm < 0) gm = 0;
            ago = gm <= 0 ? 'обновлено только что' : 'обновлено ' + gm + ' мин назад';
        }
        var allC = [], niches = {};
        (_pulse.market || []).concat(_pulse.base || []).forEach(function (x) {
            if (x.median_cpm != null) allC.push(x.median_cpm);
            if (x.niche) niches[String(x.niche).toLowerCase()] = 1;
        });
        var medCpm = _pmedian(allC), nCount = Object.keys(niches).length;
        var t = _pulse.today || {}, todayTotal = (t.listings || 0) + (t.requests || 0) + (t.contacts || 0);
        var h = '<div class="fmx-thead"><span class="fmx-tlive"><span class="fmx-tdot"></span>live</span>' +
            (ago ? '<span class="fmx-tstamp"><i class="ti ti-refresh"></i>' + ago + '</span>' : '') + '</div>';
        h += '<div class="fmx-tstrip">' +
            '<div class="fmx-tcell"><div class="fmx-tcl">Медиана CPM</div><div class="fmx-tcv">' + (medCpm != null ? _num(medCpm) + ' <small>₽</small>' : '—') + '</div></div>' +
            '<div class="fmx-tcell"><div class="fmx-tcl">Ниш в анализе</div><div class="fmx-tcv">' + (nCount || '—') + '</div></div>' +
            '<div class="fmx-tcell"><div class="fmx-tcl">Событий сегодня</div><div class="fmx-tcv">' + (todayTotal || '—') + '</div></div>' +
            '</div>';
        var vol = [];
        if (_pulse.market_total) vol.push('<i class="ti ti-building-store" style="color:#5DCAA5;"></i> Площадка · <b>' + _num(_pulse.market_total) + '</b> ' + _plural(_pulse.market_total, 'оффер', 'оффера', 'офферов'));
        if (_pulse.base_total) vol.push('<i class="ti ti-database" style="color:#818cf8;"></i> База · <b>' + _num(_pulse.base_total) + '</b> ' + _plural(_pulse.base_total, 'канал', 'канала', 'каналов'));
        if (vol.length) h += '<div class="fmx-tvol">' + vol.join('<span style="color:#3a3f52;">|</span>') + '</div>';
        return h;
    }
    var _pulseHide = false;
    function todayLine() {
        if (_pulseHide) return '';
        if (!_pulse) return '';
        var t = _pulse.today || {};
        var total = (t.listings || 0) + (t.requests || 0) + (t.contacts || 0);
        if (!total) return '';
        var bits = [];
        if (t.listings) bits.push('<b>' + t.listings + '</b> ' + _plural(t.listings, 'новый оффер', 'новых оффера', 'новых офферов'));
        if (t.requests) bits.push('<b>' + t.requests + '</b> ' + _plural(t.requests, 'заявка', 'заявки', 'заявок'));
        if (t.contacts) bits.push('<b>' + t.contacts + '</b> ' + _plural(t.contacts, 'отклик', 'отклика', 'откликов'));
        return '<div class="fmx-pday" style="position:relative;padding-right:30px;"><i class="ti ti-flame" style="color:#f59e0b;"></i> Сегодня на Площадке: ' + bits.join(' · ') + '<button data-phide style="position:absolute;top:50%;right:7px;transform:translateY(-50%);width:20px;height:20px;border-radius:6px;background:transparent;border:none;color:#8990a8;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;"><i class="ti ti-x"></i></button></div>';
    }
    function renderPulse() {
        var host = el('fmx-main');
        host.innerHTML = loadHtml();
        loadPulse(function () {
            if (_mainTab !== 'pulse') return;
            if (!_pulse) { host.innerHTML = emptyHtml('ti-cloud-off', 'Терминал недоступен', 'Не удалось загрузить данные — попробуй позже.'); return; }
            var hasData = (_pulse.market && _pulse.market.length) || (_pulse.base && _pulse.base.length);
            if (!hasData) { host.innerHTML = _termHead() + emptyHtml('ti-chart-candle', 'Рынок набирает обороты', 'Как только на Площадке и в Базе появятся каналы с нишами, здесь отобразятся цены, CPM и ликвидность по нишам.'); return; }
            var html = _termHead();
            if (_pulse.market && _pulse.market.length) {
                html += '<div class="fmx-psec"><i class="ti ti-building-store" style="color:#5DCAA5;"></i> Площадка · точные данные</div>' + pulseTiles(_pulse.market, 'карт.');
            }
            if (_pulse.base && _pulse.base.length) {
                html += '<div class="fmx-psec"><i class="ti ti-database" style="color:#818cf8;"></i> База каналов · публичная статистика</div>' + pulseTiles(_pulse.base, 'кан.');
            }
            html += '<div style="font-size:10px;color:#565b73;line-height:1.65;margin-top:16px;">Показаны медианы по нишам. <b style="color:#8990a8;">Зелёные</b> — CPM ниже медианы (выгоднее покупателю), <b style="color:#8990a8;">красные</b> — выше. Площадка — точные данные наших карточек, База — публичная статистика каналов. Обновление раз в 5 минут. Тренды и история цен появятся с накоплением данных.</div>';
            host.innerHTML = html;
        });
    }
    function renderEnter() {
        var host = el('fmx-main');
        host.innerHTML =
            '<div class="fmx-entq">Выбери, где искать:</div>' +
            '<div class="fmx-ent" data-go="catalog"><div class="fmx-entic" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);"><i class="ti ti-database"></i></div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-entn">База каналов <span class="fmx-enttag" style="background:rgba(99,102,241,0.18);color:#818cf8;">весь Telegram</span></div>' +
            '<div class="fmx-entd">Все каналы, собранные ботом. Находишь подходящий канал — пишешь владельцу сам.</div></div>' +
            '<i class="ti ti-chevron-right" style="color:#565b73;font-size:20px;"></i></div>' +
            '<div class="fmx-ent" data-go="market"><div class="fmx-entic" style="background:linear-gradient(135deg,#5DCAA5,#10b981);"><i class="ti ti-building-store"></i></div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-entn">Площадка ForgeMetrics <span class="fmx-enttag" style="background:rgba(93,202,165,0.18);color:#5DCAA5;">живые заявки</span></div>' +
            '<div class="fmx-entd">Каналы выставили рекламу сами: цена названа, офферы оформлены. Или выстави свой канал.</div></div>' +
            '<i class="ti ti-chevron-right" style="color:#565b73;font-size:20px;"></i></div>' +
            '<div class="fmx-ent" data-go="pulse"><div class="fmx-entic" style="background:linear-gradient(135deg,#f59e0b,#ef4444);"><i class="ti ti-chart-candle"></i></div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-entn">Рыночный терминал <span class="fmx-enttag" style="background:rgba(245,158,11,0.18);color:#f59e0b;">live</span></div>' +
            '<div class="fmx-entd">Медианный CPM, цены и активность по нишам — весь рынок на одном экране.</div></div>' +
            '<i class="ti ti-chevron-right" style="color:#565b73;"></i></div>' +
            '<div class="fmx-note" style="margin-top:6px;"><i class="ti ti-info-circle"></i> <span><b style="color:#e8e8ed;">База</b> — справочник всех каналов, пишешь им сам. <b style="color:#e8e8ed;">Площадка ForgeMetrics</b> — те, кто готов к сделке, и место оформить оффер своего канала.</span></div>';
        qsa(host, '.fmx-ent').forEach(function (c) { c.addEventListener('click', function () { _haptic('light'); setMainTab(c.getAttribute('data-go')); }); });
    }

    /* ===================== loaders ===================== */
    function feedQuery() {
        var p = ['limit=' + _FEED_PAGE, 'offset=' + _feedOffset];
        if (_q) p.push('q=' + encodeURIComponent(_q));
        if (_sortBuy && _sortBuy !== 'smart') p.push('sort=' + _sortBuy);
        if (_fPriceMin != null) p.push('price_min=' + _fPriceMin);
        if (_fPriceMax != null) p.push('price_max=' + _fPriceMax);
        if (_fSubsMin != null) p.push('subs_min=' + _fSubsMin);
        if (_fAud) p.push('audience=' + _fAud);
        return '/api/v1/marketplace/listings?' + p.join('&');
    }
    var _feedReq = 0, _feedMore = false;
    function loadFeed(more) {
        if (!more) _feedOffset = 0;
        var rid = ++_feedReq;
        _feedState = 'loading';
        _feedMore = !!more;
        if (!more) paintBuyBody();
        apiGet(feedQuery()).then(function (r) {
            if (rid !== _feedReq) return; /* устаревший ответ: фильтры уже сменились */
            var items = (r && r.listings) ? r.listings : [];
            if (more && _feed) {
                var seen = {};
                _feed.forEach(function (x) { seen[x.id] = 1; });
                var fresh = items.filter(function (x) { return !seen[x.id]; });
                _feed = _feed.concat(fresh);
                _feedTotal = (r && typeof r.total === 'number') ? r.total : _feed.length;
                /* страница из одних дублей/пустая = лента исчерпана: гасим кнопку, чтобы не кликалась вечно */
                if (!fresh.length) _feedTotal = _feed.length;
            } else {
                _feed = items;
                _feedTotal = (r && typeof r.total === 'number') ? r.total : _feed.length;
            }
            _feedState = 'ready';
            if (_deepCard) {
                var did = _deepCard; _deepCard = null;
                var dl = _feed.filter(function (x) { return x.id === did; })[0];
                if (dl) setTimeout(function () { openListing(dl.username); }, 250);
                else apiGet('/api/v1/marketplace/listings?id=' + did).then(function (rr) {
                    var one = rr && rr.listings && rr.listings[0];
                    if (!one) return;
                    if (!_feed.some(function (x) { return x.id === one.id; })) {
                        _feed.unshift(one);
                        if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody();
                    }
                    setTimeout(function () { openListing(one.username); }, 250);
                }).catch(function () {});
            }
            if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody();
        }).catch(function () {
            if (rid !== _feedReq) return;
            if (more) {
                /* продолжение не пришло: лента остаётся, страница откатывается, кнопка возвращается */
                _feedOffset = Math.max(0, _feedOffset - _FEED_PAGE);
                _feedState = 'ready';
                toast('Не удалось загрузить продолжение — попробуй ещё раз');
                if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody();
                return;
            }
            _feedState = 'error';
            if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody();
        });
    }
    function loadCatalog() {
        _catState = 'loading';
        apiGet('/api/v1/marketplace/base').then(function (r) {
            _catalog = (r && r.channels) ? r.channels : []; _catState = 'ready';
            if (_mainTab === 'catalog') renderCatalog();
        }).catch(function () { _catState = 'error'; if (_mainTab === 'catalog') renderCatalog(); });
    }
    function loadChannels() { return apiGet('/api/v1/channels').then(function (r) { _channels = (r && r.channels) ? r.channels : []; return _channels; }).catch(function () { _channels = []; return []; }); }
    function loadMyListings() { return apiGet('/api/v1/marketplace/my').then(function (r) { _myListings = (r && r.listings) ? r.listings : []; return _myListings; }).catch(function () { _myListings = []; return []; }); }
    function loadBookmarks() { apiGet('/api/v1/marketplace/bookmarks').then(function (r) { _bookmarks = {}; ((r && r.bookmarks) ? r.bookmarks : []).forEach(function (b) { _bookmarks[b.username || b] = true; }); updateBmCount(); }).catch(function () {}); }

    function updateBmCount() {
        var n = Object.keys(_bookmarks).length, c = el('fmx-bmc'), b = el('fmx-bm');
        if (c) { c.textContent = n; c.style.display = n > 0 ? 'flex' : 'none'; }
        if (b) b.classList.toggle('fmx-has', n > 0);
    }

    /* ===================== render: catalog ===================== */
    function renderCatalog() {
        var host = el('fmx-main');
        if (_catalog == null && _catState === 'idle') loadCatalog();
        var bar = sortBarHtml() + searchHtml('Поиск канала по теме…') + '<div class="fmx-toprow" style="justify-content:flex-end;">' + vtogHtml() + '</div>';
        var body;
        if (_catState === 'loading') body = loadHtml();
        else if (_catState === 'error') body = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и попробуй ещё раз.');
        else if (!_catalog || !_catalog.length) body = emptyHtml('ti-list-search', 'База скоро наполнится', 'Здесь будет общая база каналов со всего Telegram — ищи по нише и договаривайся с владельцами напрямую.');
        else body = (_view === 'cards' ? '<div class="fmx-grid">' + _catalog.map(simpleCard).join('') + '</div>' : '<div style="display:flex;flex-direction:column;gap:8px;">' + _catalog.map(function (x) { return zw(listItem(x, false, true)); }).join('') + '</div>');
        host.innerHTML = '<div class="fmx-note fmx-gr"><i class="ti ti-world-search"></i> Каналы со всего Telegram. Находи площадки под свою нишу и договаривайся с владельцами напрямую — сделки проходят между вами.</div>' + bar + body;
        bindSort(); bindView(); bindCards(); if (_view === 'list') bindList(host);
    }

    /* ===================== render: market ===================== */
    function renderMarket() {
        var host = el('fmx-main');
        host.innerHTML =
            '<div class="fmx-pillbar" id="fmx-subtabs" style="margin:0 0 16px;"><span class="fmx-pill" id="fmx-subpill"></span>' +
            '<button class="fmx-pb" data-st="buy"><i class="ti ti-shopping-bag"></i> Купить</button>' +
            '<button class="fmx-pb" data-st="sell"><i class="ti ti-speakerphone"></i> Продать</button>' +
            '<button class="fmx-pb" data-st="create"><i class="ti ti-sparkles"></i> Создать</button></div>' +
            '<div id="fmx-sub"></div>';
        qsa(host, '#fmx-subtabs .fmx-pb').forEach(function (b) { b.addEventListener('click', function () { setSubTab(b.getAttribute('data-st')); }); });
        setSubTab(_subTab, true);
    }
    function setSubTab(t, force) {
        _subTab = t;
        var bar = el('fmx-subtabs');
        qsa(bar, '.fmx-pb').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-st') === t); });
        movePill('fmx-subtabs', 'fmx-subpill');
        var sub = el('fmx-sub');
        sub.classList.remove('fmx-fade'); void sub.offsetWidth; sub.classList.add('fmx-fade');
        if (t === 'buy') renderBuy();
        else if (t === 'sell') renderSell();
        else renderCreate();
        checkMini();
    }

    function _buyFiltersCount() { return (_fPriceMin != null ? 1 : 0) + (_fPriceMax != null ? 1 : 0) + (_fSubsMin != null ? 1 : 0) + (_fAud ? 1 : 0); }
    function buySortRowHtml() {
        var opts = [['smart', 'Умная'], ['price_asc', 'Цена ↑'], ['price_desc', 'Цена ↓'], ['reach', 'Охват'], ['cpm', 'CPM'], ['fresh', 'Свежие']];
        var nf = _buyFiltersCount();
        return '<div class="fmx-sortbar" id="fmx-buysort" style="display:flex;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;">' +
            opts.map(function (o) { return '<button class="fmx-seg' + (_sortBuy === o[0] ? ' on' : '') + '" data-bsort="' + o[0] + '" style="flex:0 0 auto;">' + o[1] + '</button>'; }).join('') +
            '<button class="fmx-seg' + (nf ? ' on' : '') + '" id="fmx-bfilters" style="flex:0 0 auto;"><i class="ti ti-adjustments-horizontal"></i> Фильтры' + (nf ? ' · ' + nf : '') + '</button></div>';
    }
    function _refreshFilterChip() {
        var bf = el('fmx-bfilters'); if (!bf) return;
        var nf = _buyFiltersCount();
        bf.classList.toggle('on', nf > 0);
        bf.innerHTML = '<i class="ti ti-adjustments-horizontal"></i> Фильтры' + (nf ? ' · ' + nf : '');
    }
    var _qTimer = null;
    function bindBuyControls() {
        var sub = el('fmx-sub'); if (!sub) return;
        var si = sub.querySelector('.fmx-search input');
        if (si) {
            si.value = _q;
            si.addEventListener('input', function () {
                var v = si.value;
                clearTimeout(_qTimer);
                _qTimer = setTimeout(function () { _q = v.trim(); loadFeed(false); }, 350);
            });
        }
        qsa(sub, '[data-bsort]').forEach(function (b) {
            b.addEventListener('click', function () {
                var v = b.getAttribute('data-bsort');
                if (v === _sortBuy) return;
                _sortBuy = v; _haptic('light');
                qsa(el('fmx-buysort'), '[data-bsort]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-bsort') === v); });
                loadFeed(false);
            });
        });
        var bf = el('fmx-bfilters');
        if (bf) bf.addEventListener('click', openBuyFilters);
    }
    function openBuyFilters() {
        var old = el('fmx-bfBg'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'fmx-bfBg'; bg.className = 'fmx-cfm';
        bg.innerHTML = '<div class="fmx-cfm-box"><div class="fmx-cfm-t" style="margin-bottom:10px;"><i class="ti ti-adjustments-horizontal" style="color:#818cf8;"></i> Фильтры ленты</div>' +
            '<span class="fmx-lbl">Цена размещения, ₽</span>' +
            '<div style="display:flex;gap:8px;"><input class="fmx-inp" id="fmx-bf-pmin" type="number" min="0" inputmode="numeric" placeholder="от" value="' + (_fPriceMin != null ? _fPriceMin : '') + '">' +
            '<input class="fmx-inp" id="fmx-bf-pmax" type="number" min="0" inputmode="numeric" placeholder="до" value="' + (_fPriceMax != null ? _fPriceMax : '') + '"></div>' +
            '<span class="fmx-lbl fmx-mt2">Подписчики, от</span>' +
            '<input class="fmx-inp" id="fmx-bf-smin" type="number" min="0" inputmode="numeric" placeholder="например, 10000" value="' + (_fSubsMin != null ? _fSubsMin : '') + '">' +
            '<span class="fmx-lbl fmx-mt2">Аудитория</span>' +
            '<div class="fmx-fxw" id="fmx-bf-aud">' +
            [['', 'Все'], ['female', 'Женская'], ['male', 'Мужская'], ['mixed', 'Смешанная']].map(function (o) {
                return '<button class="fmx-fx' + ((_fAud || '') === o[0] ? ' on' : '') + '" data-aud="' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div>' +
            '<div class="fmx-cfm-r" style="margin-top:14px;"><button class="fmx-btn" data-reset>Сбросить</button><button class="fmx-btn" data-apply style="background:#5DCAA5;color:#0a0d18;border-color:transparent;">Применить</button></div></div>';
        document.body.appendChild(bg);
        function done() { bg.remove(); }
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        qsa(bg, '#fmx-bf-aud [data-aud]').forEach(function (b) {
            b.addEventListener('click', function () { qsa(bg, '#fmx-bf-aud [data-aud]').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); });
        });
        function val(id) { var n = el(id); var v = n && n.value !== '' ? parseInt(n.value, 10) : null; return (v == null || isNaN(v) || v < 0) ? null : Math.min(v, 100000000); }
        bg.querySelector('[data-apply]').addEventListener('click', function () {
            _fPriceMin = val('fmx-bf-pmin'); _fPriceMax = val('fmx-bf-pmax'); _fSubsMin = val('fmx-bf-smin');
            if (_fPriceMin != null && _fPriceMax != null && _fPriceMin > _fPriceMax) { var t = _fPriceMin; _fPriceMin = _fPriceMax; _fPriceMax = t; }
            var au = bg.querySelector('#fmx-bf-aud [data-aud].on');
            _fAud = (au && au.getAttribute('data-aud')) ? au.getAttribute('data-aud') : null;
            done(); _haptic('light'); _refreshFilterChip(); loadFeed(false);
        });
        bg.querySelector('[data-reset]').addEventListener('click', function () {
            _fPriceMin = _fPriceMax = _fSubsMin = null; _fAud = null;
            done(); _refreshFilterChip(); loadFeed(false);
        });
    }
    function _applyBuyFilter(arr) {
        if (_sort === 'niche' && _nicheSel) return arr.filter(function (l) { return l.niche && nichesMatch(_nicheSel, l.niche); });
        /* «Под мою нишу» пересортировывает только умную выдачу — явную серверную сортировку не перебиваем */
        if (_sort === 'match' && _sortBuy === 'smart') return arr.slice().sort(function (a, b) { return (_nicheMatch(b) ? 1 : 0) - (_nicheMatch(a) ? 1 : 0); });
        return arr;
    }
    function paintBuyBody() {
        var host = el('fmx-buyBody');
        if (!host) { if (_mainTab === 'market' && _subTab === 'buy') renderBuy(); return; }
        var body;
        var hasFilters = !!_q || _buyFiltersCount() > 0;
        var left = _feed ? Math.max(0, _feedTotal - _feed.length) : 0;
        var nicheOn = _sort === 'niche' && _nicheSel;
        /* догрузка «Показать ещё»: список остаётся на экране, крутится только кнопка */
        var loadingMore = _feedState === 'loading' && _feedMore && _feed && _feed.length;
        var moreBtn = '';
        if (loadingMore) moreBtn = '<button class="fmx-btn" id="fmx-more" disabled style="width:100%;margin-top:12px;min-height:40px;"><i class="ti ti-loader-2"></i> Загружаю…</button>';
        /* при клиентском фильтре ниши серверный остаток не обещает совпадений — кнопка без числа */
        else if (left > 0) moreBtn = '<button class="fmx-btn" id="fmx-more" style="width:100%;margin-top:12px;min-height:40px;"><i class="ti ti-chevron-down"></i> ' + (nicheOn ? 'Показать ещё — искать нишу дальше' : 'Показать ещё (' + left + ')') + '</button>';
        if (_feedState === 'loading' && !loadingMore) body = loadHtml();
        else if (_feedState === 'error') body = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и попробуй ещё раз.');
        else if (!_feed || !_feed.length) body = hasFilters
            ? emptyHtml('ti-search-off', 'Ничего не найдено', 'Смягчи запрос или сбрось фильтры — и офферы вернутся.')
            : emptyHtml('ti-building-store', 'Пока пусто', 'Здесь появятся оформленные офферы каналов от наших пользователей. Размести первый оффер во вкладке «Создать».');
        else {
            var feed = _applyBuyFilter(_feed);
            if (!feed.length) body = emptyHtml('ti-filter-off', 'По фильтру пусто', 'В выбранной нише пока нет карточек. Попробуй «Все каналы» — или догрузи ленту дальше.') + moreBtn;
            else body = (_view === 'cards' ? '<div class="fmx-grid">' + feed.map(fullCard).join('') + '</div>' : '<div style="display:flex;flex-direction:column;gap:8px;">' + feed.map(function (x) { return zw(listItem(x)); }).join('') + '</div>') + moreBtn;
        }
        host.innerHTML = body;
        bindCards(host); if (_view === 'list') bindList(host);
        var more = el('fmx-more');
        if (more) more.addEventListener('click', function () {
            more.disabled = true; more.innerHTML = '<i class="ti ti-loader-2"></i> Загружаю…';
            _feedOffset += _FEED_PAGE;
            loadFeed(true);
        });
    }
    function renderBuy() {
        var sub = el('fmx-sub'); if (!sub) return;
        if (!_chLoaded && !_chLoading) {
            _chLoading = true;
            /* каналы влияют только на бейджи карточек — перерисовываем тело, не трогая поиск */
            loadChannels().then(function () { _chLoaded = true; _chLoading = false; if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody(); }).catch(function () { _chLoading = false; _chLoaded = true; });
        }
        sub.innerHTML = '<div class="fmx-note fmx-gr"><i class="ti ti-building-store"></i> Здесь каналы продают рекламу. Смотри метрики, сравнивай цены и пиши владельцу — сделка напрямую, без комиссии.</div>' +
            '<div id="fmx-todayLine">' + todayLine() + '</div>' +
            searchHtml('Поиск по названию или @каналу…') +
            sortBarHtml() + buySortRowHtml() + topRowHtml() +
            '<div id="fmx-buyBody"></div>';
        bindSort(); bindView(); bindBuyControls();
        if (_feed == null && _feedState === 'idle') loadFeed(); else paintBuyBody();
        /* сводка дня обновляется точечно — полный перерендер убил бы фокус в поиске */
        if (!_pulse) loadPulse(function () { var tl = el('fmx-todayLine'); if (tl && _pulse) tl.innerHTML = todayLine(); });
    }

    var REQ_FMT = { any: 'Любой формат', feed_native: 'В ленте', post_24h: 'На 24 часа', pinned: 'Закреплённый пост', stories: 'В сторис', circle: 'В кружке' };
    function loadRequests() {
        _reqState = 'loading';
        apiGet('/api/v1/marketplace/requests').then(function (r) {
            _reqs = (r && r.requests) ? r.requests : []; _reqState = 'ready';
            if (_mainTab === 'market' && _subTab === 'sell') renderSell();
        }).catch(function () { _reqState = 'error'; if (_mainTab === 'market' && _subTab === 'sell') renderSell(); });
    }
    function _ago(iso) {
        if (!iso) return '';
        var m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
        if (m < 60) return m + ' мин назад';
        var h = Math.round(m / 60); if (h < 24) return h + ' ч назад';
        var d = Math.round(h / 24); return d + ' дн назад';
    }
    function _plural(n, a, b, c) { var m = n % 100; if (m >= 11 && m <= 14) return c; m = n % 10; if (m === 1) return a; if (m >= 2 && m <= 4) return b; return c; }
    function reqCard(r) {
        var head = [];
        if (r.niche) head.push('<span class="fmx-reqn">' + _esc(r.niche) + '</span>');
        head.push('<span class="fmx-reqf">' + (REQ_FMT[r.format] || REQ_FMT.any) + '</span>');
        var cts = r.contacts ? ' · <span style="color:#f59e0b;">🔥 ' + r.contacts + ' ' + _plural(r.contacts, 'отклик', 'отклика', 'откликов') + '</span>' : '';
        var leads = '';
        if (r.mine && r.leads && r.leads.length) {
            leads = '<div class="fmx-leads"><div class="fmx-leads-t"><i class="ti ti-users-group"></i> Заинтересовались:</div>' +
                r.leads.map(function (ld) {
                    return '<a class="fmx-lead" href="https://t.me/' + _esc(ld.username) + '" target="_blank"><b>' + _esc(ld.title || '@' + ld.username) + '</b><span>@' + _esc(ld.username) + (ld.subscribers ? ' · ' + _short(ld.subscribers) + ' подп' : '') + '</span></a>';
                }).join('') + '</div>';
        }
        return '<div class="fmx-req' + (r.mine ? ' mine' : '') + '">' +
            '<div class="fmx-reqh">' + head.join('') + '<span class="fmx-reqb' + (r.budget ? '' : ' na') + '">' + (r.budget ? 'до ' + _num(r.budget) + ' ₽' : 'бюджет не указан') + '</span></div>' +
            '<div class="fmx-reqt">' + _esc(r.text) + '</div>' + leads +
            '<div class="fmx-reqft"><span>' + _ago(r.created_at) + (r.mine ? ' · твоя заявка' : '') + cts + '</span>' +
            (r.mine
                ? '<button class="fmx-btn" data-rclose="' + r.id + '" style="padding:7px 12px;"><i class="ti ti-x"></i>Закрыть</button>'
                : '<span style="display:flex;gap:6px;align-items:center;"><button class="fmx-btn" data-rrep="' + r.id + '" title="Пожаловаться" style="padding:7px 9px;"><i class="ti ti-flag"></i></button><button class="fmx-btn fmx-btn-p" data-rwrite="' + _esc(r.contact_username) + '" data-rid="' + r.id + '" style="padding:7px 14px;background:#818cf8;color:#fff;"><i class="ti ti-brand-telegram"></i>Написать</button></span>') +
            '</div></div>';
    }
    function renderSell() {
        var sub = el('fmx-sub'); if (!sub) return;
        if (_reqs == null && _reqState === 'idle') loadRequests();
        var body;
        if (_reqState === 'loading') body = loadHtml();
        else if (_reqState === 'error') body = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и попробуй ещё раз.');
        else if (!_reqs || !_reqs.length) body = emptyHtml('ti-speakerphone', 'Заявок пока нет', 'Размести заявку — владельцы подходящих каналов напишут сами.');
        else body = '<div style="display:flex;flex-direction:column;gap:9px;">' + _reqs.map(function (r) { return zw(reqCard(r)); }).join('') + '</div>';
        sub.innerHTML = '<div class="fmx-note"><i class="ti ti-speakerphone"></i> Заявки рекламодателей: «ищу каналы под задачу, бюджет такой-то». Твой канал подходит — откликайся первым. Сам покупаешь рекламу — размести свою заявку.</div>' +
            '<div style="display:flex;gap:8px;margin:0 0 14px;"><button class="fmx-save" id="fmx-newreq" style="margin:0;flex:1;"><i class="ti ti-plus"></i> Разместить заявку</button>' +
            '<button class="fmx-btn" id="fmx-nbell" title="Уведомления о заявках в нишах" style="flex:0 0 auto;padding:0 15px;"><i class="ti ti-bell"></i></button></div>' + body;
        scaleCards(sub);
        el('fmx-newreq').addEventListener('click', openReqForm);
        el('fmx-nbell').addEventListener('click', openNicheSubs);
        qsa(sub, '[data-rrep]').forEach(function (b) { b.addEventListener('click', function () { openComplaint({ request_id: +b.getAttribute('data-rrep') }); }); });
        qsa(sub, '[data-rwrite]').forEach(function (b) {
            b.addEventListener('click', function () {
                var rid = b.getAttribute('data-rid');
                if (rid) apiPost('/api/v1/marketplace/requests/' + rid + '/contact', {}).then(function (r) {
                    if (r && r.ok && typeof r.contacts === 'number' && _reqs) {
                        var it = _reqs.filter(function (x) { return String(x.id) === String(rid); })[0];
                        if (it && it.contacts !== r.contacts) { it.contacts = r.contacts; renderSell(); }
                    }
                }).catch(function () {});
                openTg(b.getAttribute('data-rwrite'));
            });
        });
        qsa(sub, '[data-rclose]').forEach(function (b) {
            b.addEventListener('click', function () {
                uiConfirm('Закрыть заявку? Она исчезнет из ленты.', function () {
                    apiPost('/api/v1/marketplace/requests/' + b.getAttribute('data-rclose') + '/close', {}).then(function (r) {
                        if (r && r.ok === false) { uiAlert(r.error || 'Не удалось закрыть'); return; }
                        toast('Заявка закрыта'); _reqs = null; _reqState = 'idle'; renderSell();
                    }).catch(function () { uiAlert('Не удалось закрыть — попробуй ещё раз.'); });
                });
            });
        });
    }
    function openNichePick(niches) {
        var old = el('fmx-npBg'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'fmx-npBg'; bg.className = 'fmx-cfm';
        bg.innerHTML = '<div class="fmx-cfm-box"><div class="fmx-cfm-t" style="margin-bottom:10px;"><i class="ti ti-filter" style="color:#818cf8;"></i> Какая ниша интересует?</div>' +
            '<div class="fmx-fxw" style="max-height:46vh;overflow-y:auto;">' + niches.map(function (n) { return '<button class="fmx-fx" data-np="' + _esc(n) + '">' + _esc(n) + '</button>'; }).join('') + '</div>' +
            '<div class="fmx-cfm-r" style="margin-top:12px;"><button class="fmx-btn" data-no>Отмена</button></div></div>';
        document.body.appendChild(bg);
        function done() { bg.remove(); }
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        bg.querySelector('[data-no]').addEventListener('click', done);
        qsa(bg, '[data-np]').forEach(function (b) {
            b.addEventListener('click', function () {
                _nicheSel = String(b.getAttribute('data-np')).toLowerCase().trim();
                _sort = 'niche'; done(); _haptic('light');
                if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy();
            });
        });
    }
    var REP_REASONS = [['scam', 'Скам / обман'], ['fake_metrics', 'Накрутка метрик'], ['illegal', 'Запрещённый контент'], ['other', 'Другое']];
    function openComplaint(target) { /* target: {listing_id} | {request_id} */
        var chips = REP_REASONS.map(function (r, i) { return '<button class="fmx-fx' + (i === 0 ? ' on' : '') + '" data-rr="' + r[0] + '">' + r[1] + '</button>'; }).join('');
        el('fmx-repBody').innerHTML =
            '<span class="fmx-lbl">Причина</span><div class="fmx-fxw" id="fmx-rep-r">' + chips + '</div>' +
            '<span class="fmx-lbl fmx-mt2">Комментарий <span style="color:#565b73;text-transform:none;">(для «Другое» — обязателен)</span></span>' +
            '<textarea class="fmx-inp" id="fmx-rep-c" rows="3" maxlength="300" placeholder="Опиши проблему. Чем конкретнее — тем быстрее разберём."></textarea>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:8px;">Жалобы анонимны для владельца. Несколько жалоб от разных людей скрывают цель до ручной проверки.</div>' +
            '<button class="fmx-save" id="fmx-rep-send" style="margin-top:14px;"><i class="ti ti-flag"></i> Отправить жалобу</button>';
        var sel = { v: 'scam' };
        qsa(el('fmx-rep-r'), '[data-rr]').forEach(function (b) { b.addEventListener('click', function () { sel.v = b.getAttribute('data-rr'); qsa(el('fmx-rep-r'), '.fmx-fx').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); }); });
        el('fmx-rep-send').addEventListener('click', function () {
            var btn = this; btn.disabled = true;
            var body = { reason: sel.v, comment: el('fmx-rep-c').value };
            if (target.listing_id) body.listing_id = target.listing_id; else body.request_id = target.request_id;
            apiPost('/api/v1/marketplace/complaints', body).then(function (r) {
                btn.disabled = false;
                if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось отправить'); return; }
                _haptic('success'); hideModal('fmx-repBg');
                toast(r && r.hidden ? 'Скрыто до проверки. Спасибо.' : 'Жалоба отправлена — проверим');
                if (r && r.hidden) {
                    if (target.listing_id) { _feed = null; _feedState = 'idle'; if (_subTab === 'buy') renderBuy(); }
                    else { _reqs = null; _reqState = 'idle'; if (_subTab === 'sell') renderSell(); }
                }
            }).catch(function () { btn.disabled = false; uiAlert('Не удалось отправить — попробуй ещё раз.'); });
        });
        showModal('fmx-repBg');
    }
    var _nsubs = null;
    function renderNsBody() {
        var box = el('fmx-nsBody'); if (!box) return;
        var chips = (_nsubs && _nsubs.length)
            ? '<div class="fmx-fxw" style="margin-bottom:4px;">' + _nsubs.map(function (n) {
                return '<span class="fmx-fx on" style="display:inline-flex;align-items:center;gap:6px;">' + _esc(n) + '<i class="ti ti-x" data-nsdel="' + _esc(n) + '" style="cursor:pointer;font-size:11px;"></i></span>';
            }).join('') + '</div>'
            : '<div style="font-size:11px;color:#8990a8;line-height:1.6;margin-bottom:4px;">Подписок пока нет. Ниша твоего оффера подписывается автоматически при публикации.</div>';
        box.innerHTML = chips +
            '<span class="fmx-lbl fmx-mt2">Добавить нишу</span>' +
            '<div style="display:flex;gap:8px;"><input class="fmx-inp" id="fmx-ns-inp" maxlength="64" placeholder="например, Криптовалюты" style="flex:1;">' +
            '<button class="fmx-btn" id="fmx-ns-add" style="flex:0 0 auto;padding:0 16px;background:#818cf8;color:#fff;border-color:transparent;"><i class="ti ti-plus"></i></button></div>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:10px;">Ниша сравнивается с той, что указал рекламодатель в заявке. Уведомления приходят от @ForgeMetricsBot.</div>';
        var addFn = function () {
            var v = el('fmx-ns-inp').value.trim();
            if (!v) return;
            apiPost('/api/v1/marketplace/niche_subs', { niche: v, on: true }).then(function (r) {
                if (r && r.ok === false) { uiAlert(r.error || 'Не удалось'); return; }
                var lv = v.toLowerCase();
                if (_nsubs.indexOf(lv) < 0) _nsubs.push(lv);
                _nsubs.sort(); _haptic('success'); renderNsBody();
            }).catch(function () { uiAlert('Не удалось — попробуй ещё раз.'); });
        };
        el('fmx-ns-add').addEventListener('click', addFn);
        el('fmx-ns-inp').addEventListener('keydown', function (e) { if (e.key === 'Enter') addFn(); });
        qsa(box, '[data-nsdel]').forEach(function (x) {
            x.addEventListener('click', function () {
                var n = x.getAttribute('data-nsdel');
                apiPost('/api/v1/marketplace/niche_subs', { niche: n, on: false }).then(function () {
                    _nsubs = _nsubs.filter(function (v) { return v !== n; });
                    _haptic('light'); renderNsBody();
                }).catch(function () {});
            });
        });
    }
    function openNicheSubs() {
        el('fmx-nsBody').innerHTML = loadHtml();
        showModal('fmx-nsBg');
        apiGet('/api/v1/marketplace/niche_subs').then(function (r) {
            _nsubs = (r && r.niches) ? r.niches : [];
            renderNsBody();
        }).catch(function () { _nsubs = []; renderNsBody(); });
    }
    function renderDealBox(l) {
        var box = el('fmx-dealBox'); if (!box) return;
        apiGet('/api/v1/marketplace/deals/state?listing_id=' + l.id).then(function (r) {
            if (!r || !r.ok) return;
            if (r.state === 'pending') {
                box.innerHTML = '<div class="fmx-dealline"><i class="ti ti-hourglass"></i> Сделка отмечена — ждём подтверждения владельца.</div>';
            } else if (r.state === 'confirmed') {
                box.innerHTML = '<button class="fmx-btn" id="fmx-dealRev" style="width:100%;margin-top:10px;color:#f59e0b;border-color:rgba(245,158,11,0.35);"><i class="ti ti-star"></i> Оставить отзыв о сделке</button>';
                el('fmx-dealRev').addEventListener('click', function () { hideModal('fmx-listBg'); openReviewForm(r.deal_id); });
            } else if (r.state === 'reviewed') {
                box.innerHTML = '<div class="fmx-dealline" style="color:#5DCAA5;"><i class="ti ti-circle-check"></i> Сделка подтверждена, отзыв оставлен. Спасибо.</div>';
            } else {
                box.innerHTML = '<button class="fmx-btn" id="fmx-dealGo" style="width:100%;margin-top:10px;color:#5DCAA5;border-color:rgba(93,202,165,0.35);"><i class="ti ti-heart-handshake"></i> Мы провели сделку</button>';
                el('fmx-dealGo').addEventListener('click', function () {
                    uiConfirm('Отмечай только реальную сделку: владелец получит запрос на подтверждение, и после него ты сможешь оставить отзыв.', function () {
                        apiPost('/api/v1/marketplace/deals', { listing_id: l.id }).then(function (rr) {
                            if (rr && rr.ok === false) { _haptic('error'); uiAlert(rr.error || 'Не удалось'); return; }
                            _haptic('success'); toast('Отправлено владельцу на подтверждение');
                            renderDealBox(l);
                        }).catch(function () { uiAlert('Не удалось — попробуй ещё раз.'); });
                    });
                });
            }
        }).catch(function () {});
    }
    function renderReviews(l) {
        var box = el('fmx-lsRev'); if (!box) return;
        apiGet('/api/v1/marketplace/listings/' + l.id + '/reviews').then(function (r) {
            if (!r || !r.ok || !r.reviews || !r.reviews.length) return;
            box.innerHTML = '<div class="fmx-revs"><div class="fmx-revs-t"><i class="ti ti-star-filled" style="color:#f59e0b;"></i> ' + (l.rating_avg || '') + ' · ' + l.reviews_count + ' ' + _plural(l.reviews_count, 'отзыв', 'отзыва', 'отзывов') + '</div>' +
                r.reviews.map(function (rv) {
                    var stars = '★★★★★'.slice(0, rv.rating) + '☆☆☆☆☆'.slice(0, 5 - rv.rating);
                    return '<div class="fmx-rev"><span class="fmx-rev-s">' + stars + '</span>' + (rv.text ? '<span class="fmx-rev-x">' + _esc(rv.text) + '</span>' : '') + '<span class="fmx-rev-a">' + _ago(rv.created_at) + '</span></div>';
                }).join('') + '</div>';
        }).catch(function () {});
    }
    function openReviewForm(dealId) {
        var sel = { v: 0 };   // без предвыбора — иначе рейтинги завышаются автоматически на 5★
        el('fmx-revBody').innerHTML =
            '<span class="fmx-lbl">Оценка</span><div class="fmx-fxw" id="fmx-rev-r">' +
            [1, 2, 3, 4, 5].map(function (n) { return '<button class="fmx-fx" data-rv="' + n + '" style="font-size:15px;padding:8px 12px;">' + '★'.repeat(n) + '</button>'; }).join('') + '</div>' +
            '<span class="fmx-lbl fmx-mt2">Пара слов (необязательно)</span><textarea class="fmx-inp" id="fmx-rev-t" rows="3" maxlength="300" placeholder="Как прошла сделка? Вышел ли пост вовремя, честные ли охваты."></textarea>' +
            '<button class="fmx-save" id="fmx-rev-send" style="margin-top:14px;opacity:0.5;" disabled><i class="ti ti-send"></i> Поставь оценку</button>';
        qsa(el('fmx-rev-r'), '[data-rv]').forEach(function (b) { b.addEventListener('click', function () { sel.v = +b.getAttribute('data-rv'); qsa(el('fmx-rev-r'), '.fmx-fx').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); var sb = el('fmx-rev-send'); if (sb) { sb.disabled = false; sb.style.opacity = '1'; sb.innerHTML = '<i class="ti ti-send"></i> Отправить отзыв'; } }); });
        el('fmx-rev-send').addEventListener('click', function () {
            var btn = this; if (!sel.v) return; btn.disabled = true;
            apiPost('/api/v1/marketplace/deals/' + dealId + '/review', { rating: sel.v, text: el('fmx-rev-t').value }).then(function (r) {
                btn.disabled = false;
                if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось'); return; }
                _haptic('success'); hideModal('fmx-revBg'); toast('Отзыв отправлен. Спасибо.');
                _feed = null; _feedState = 'idle';
            }).catch(function () { btn.disabled = false; uiAlert('Не удалось — попробуй ещё раз.'); });
        });
        showModal('fmx-revBg');
    }
    function openReqForm() {
        var uname = '';
        try { uname = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.username) || ''; } catch (e) {}
        var fchips = Object.keys(REQ_FMT).map(function (k) { return '<button class="fmx-fx' + (k === 'any' ? ' on' : '') + '" data-rf="' + k + '">' + REQ_FMT[k] + '</button>'; }).join('');
        el('fmx-reqBody').innerHTML =
            '<span class="fmx-lbl">Ниша каналов</span><input class="fmx-inp" id="fmx-rq-niche" maxlength="64" placeholder="например, Биохакинг">' +
            '<span class="fmx-lbl fmx-mt2">Бюджет, ₽ (необязательно)</span><input class="fmx-inp" id="fmx-rq-budget" type="number" min="0" step="500" placeholder="например, 15000">' +
            '<span class="fmx-lbl fmx-mt2">Формат размещения</span><div class="fmx-fxw" id="fmx-rq-fmt">' + fchips + '</div>' +
            '<span class="fmx-lbl fmx-mt2">Что рекламируем и требования</span><textarea class="fmx-inp" id="fmx-rq-text" rows="4" maxlength="500" placeholder="Продукт, гео аудитории, пожелания к каналам. Минимум 20 символов."></textarea>' +
            '<span class="fmx-lbl fmx-mt2">Контакт для связи</span><div class="fmx-chbtn" style="cursor:text;"><span style="color:#8990a8;">@</span><input class="fmx-inp" id="fmx-rq-contact" style="border:none;background:transparent;padding:0 0 0 4px;flex:1;" maxlength="64" value="' + _esc(uname) + '" placeholder="username"></div>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:8px;">Заявка видна всем владельцам каналов — они напишут на указанный контакт. Максимум 3 активных заявки. Правила площадки действуют и здесь.</div>' +
            '<button class="fmx-save" id="fmx-rq-send" style="margin-top:14px;"><i class="ti ti-send"></i> Опубликовать заявку</button>';
        var fsel = { v: 'any' };
        qsa(el('fmx-rq-fmt'), '[data-rf]').forEach(function (b) { b.addEventListener('click', function () { fsel.v = b.getAttribute('data-rf'); qsa(el('fmx-rq-fmt'), '.fmx-fx').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); }); });
        el('fmx-rq-send').addEventListener('click', function () {
            var txtEl = el('fmx-rq-text'), cEl = el('fmx-rq-contact');
            var bad = null;
            if (txtEl.value.trim().length < 20) bad = txtEl;
            else if (!cEl.value.trim()) bad = cEl;
            qsa(el('fmx-reqBody'), '.fmx-inp').forEach(function (i) { i.style.borderColor = ''; });
            var hint = el('fmx-rq-hint'); if (hint) hint.remove();
            if (bad) {
                _haptic('error');
                bad.style.borderColor = '#ef4444';
                bad.insertAdjacentHTML('afterend', '<div id="fmx-rq-hint" style="font-size:10.5px;color:#ef4444;margin-top:5px;">' + (bad === txtEl ? 'Опиши задачу подробнее — минимум 20 символов.' : 'Укажи @username — сюда будут писать владельцы каналов.') + '</div>');
                bad.focus();
                return;
            }
            var btn = this; btn.disabled = true;
            apiPost('/api/v1/marketplace/requests', {
                contact_username: el('fmx-rq-contact').value,
                niche: el('fmx-rq-niche').value,
                budget: +el('fmx-rq-budget').value || null,
                format: fsel.v,
                text: el('fmx-rq-text').value
            }).then(function (r) {
                btn.disabled = false;
                if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось опубликовать'); return; }
                _haptic('success'); hideModal('fmx-reqBg'); toast('Заявка размещена');
                _reqs = null; _reqState = 'idle'; renderSell();
            }).catch(function () { btn.disabled = false; uiAlert('Не удалось опубликовать — попробуй ещё раз.'); });
        });
        showModal('fmx-reqBg');
    }

    /* ===================== render: constructor ===================== */
    function renderCreate() {
        var sub = el('fmx-sub'); if (!sub) return;
        sub.innerHTML = '<div class="fmx-load"><i class="ti ti-loader-2"></i><div style="font-size:12px;margin-top:10px;">Загружаю конструктор…</div></div>';
        Promise.all([loadChannels(), loadMyListings()]).then(function () {
            var pubs = _channels.filter(function (c) { return c.username; });
            if (!pubs.length) { sub.innerHTML = emptyHtml('ti-plus', 'Нет подходящих каналов', 'Чтобы выставить канал на Площадку, у него должен быть публичный @username. Добавь или настрой канал в приложении.'); return; }
            var def = null;
            for (var i = 0; i < pubs.length; i++) if (listingForChannel(pubs[i].id)) { def = pubs[i].id; break; }
            if (def == null) def = pubs[0].id;
            selectChannel(def);
        });
    }
    function channelById(id) { for (var i = 0; i < _channels.length; i++) if (_channels[i].id === id) return _channels[i]; return null; }
    function listingForChannel(id) { var ch = channelById(id); if (!ch || !ch.username) return null; for (var j = 0; j < _myListings.length; j++) { var u = _myListings[j].username; if (u && u.toLowerCase() === ch.username.toLowerCase()) return _myListings[j]; } return null; }

    function defaultState() {
        return { cover: 1, covType: 'grad', avatar: 'tg', avEmoji: '🧬', color: '#5DCAA5', font: 'bold',
            move: 'levit', over: 'none', glow: 'none', orbit: 'none', atomColor: '#5DCAA5', glowCard: false, glass: 'none',
            coverGrad: null, att: { avatar: '', cover: '', body: [], list: [] }, _media: {}, _desc: '', _tags: '', _slots: '', _title: null, listingId: null, channelId: null };
    }
    function defaultFmts() {
        return [
            { on: true, format: 'feed_native', n: 'В ленте', p: 5500 },
            { on: false, format: 'pinned', n: 'Закреплённый пост', p: 8000 },
            { on: false, format: 'stories', n: 'В сторис', p: 3000 },
            { on: false, format: 'circle', n: 'В кружке', p: 3000 }
        ];
    }
    function hydrate(l) {
        _ss.listingId = l.id;
        _ss._status = l.status || null;
        _ss.sticker = l.sticker_json || l.sticker || null;
        _ss.showDeals = l.show_deals !== false;
        if (l.accent_color) _ss.color = l.accent_color;
        if (l.cover_gradient) { var gi = COVERS.indexOf(l.cover_gradient); if (gi >= 0) { _ss.cover = gi; _ss.coverGrad = null; } else _ss.coverGrad = l.cover_gradient; }
        if (l.cover_type) _ss.covType = (l.cover_type === 'gif') ? 'img' : l.cover_type;
        var fx = l.effects_json || {};
        ['move', 'over', 'glow', 'orbit'].forEach(function (k) { if (fx[k]) _ss[k] = fx[k]; });
        _ss.glowCard = !!fx.glowCard;
        _ss.glass = (fx.glass === true) ? 'frost' : (typeof fx.glass === 'string' ? fx.glass : 'none');
        if (fx.atomColor) _ss.atomColor = fx.atomColor;
        _ss.starPos = fx.starPos || 'cover';
        _ss.topTag = fx.topTag || 'on';
        _ss.badgeFree = fx.badgeFree || null;
        if (l.title_style) _ss.font = l.title_style;
        if (l.avatar_type) _ss.avatar = l.avatar_type;
        if (l.avatar_emoji) _ss.avEmoji = l.avatar_emoji;
        if (l.formats && l.formats.length) {
            _sfmts.forEach(function (f) { f.on = false; });
            l.formats.forEach(function (rf) {
                var found = false;
                _sfmts.forEach(function (f) { if (f.format === rf.format) { f.on = true; f.p = rf.price; found = true; } });
                if (!found) _sfmts.push({ on: true, format: rf.format, n: rf.label || rf.format, p: rf.price });
            });
        }
        _ss._desc = l.custom_text || '';
        if (l.emoji_attachments_json) { var _at = l.emoji_attachments_json; ['cover', 'avatar', 'cardbg'].forEach(function (k) { if (_at[k] && typeof _at[k] === 'object') _ss.att[k] = _at[k]; }); }
        ['cover', 'avatar', 'cardbg'].forEach(function (k) {
            var a = (typeof _ss.att[k] === 'object' && _ss.att[k]) ? _ss.att[k] : null;
            var srvUrl = (k === 'cover') ? l.cover_url : (k === 'avatar' ? l.avatar_url : (a && a.url));
            if (a && a.url) srvUrl = a.url;
            if (!srvUrl) return;
            if (!a) { a = { x: 50, y: 50, s: 1 }; _ss.att[k] = a; }
            if (!a.url) a.url = srvUrl;
            var kk = a.kind || (/\.mp4($|\?)/.test(srvUrl) ? 'video' : (/\.gif($|\?)/.test(srvUrl) ? 'gif' : 'img'));
            _ss._media[k] = { url: mediaAbs(srvUrl), kind: kk, name: a.name || 'файл на сервере' };
        });
        _ss._tags = (l.tags_json || []).join(', ');
        _ss._slots = l.slots_note || '';
    }
    function selectChannel(id) {
        _ss = defaultState(); _sfmts = defaultFmts(); _ss.sticker = null; _ss.showDeals = true; _ss.channelId = id;
        var l = listingForChannel(id); if (l) hydrate(l);
        _ss.channelId = id; _secCreate = 'cover';
        paintCreate();
    }
    function curChannel() { return channelById(_ss.channelId) || { title: 'Твой канал', username: 'your_channel', subscribers: null }; }

    function paintCreate() {
        var sub = el('fmx-sub'); if (!sub) return;
        var existing = listingForChannel(_ss.channelId);
        var cur = channelById(_ss.channelId);
        var rows = _channels.map(function (c) {
            var pub = !!c.username;
            return '<div class="fmx-chrow' + (c.id === _ss.channelId ? ' sel' : '') + (pub ? '' : ' dis') + '" data-cid="' + c.id + '" data-pub="' + (pub ? 1 : 0) + '"><div class="fmx-chav"' + (pub ? '' : ' style="background:rgba(255,255,255,0.08);color:#8990a8;"') + '>' + (c.avatar_url ? '<img src="' + mediaAbs(c.avatar_url) + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">' : _esc((c.title || c.username || '?').charAt(0))) + '</div><div style="flex:1;min-width:0;"><div class="fmx-chtt">' + _esc(c.title || (pub ? '@' + c.username : 'Канал')) + '</div><div class="fmx-chuu">' + (pub ? '@' + _esc(c.username) : 'приватный — нужен публичный @username') + '</div></div>' + (pub ? (listingForChannel(c.id) ? '<i class="ti ti-circle-check-filled" style="color:#5DCAA5;flex-shrink:0;"></i>' : '') : '<i class="ti ti-lock" style="color:#565b73;flex-shrink:0;"></i>') + '</div>';
        }).join('');
        sub.innerHTML =
            '<div class="fmx-hero" id="fmx-hero"></div>' +
            '<div style="font-size:10px;color:#565b73;text-align:center;margin:-12px 0 10px;"><i class="ti ti-hand-click"></i> Нажми на часть оффера, чтобы изменить его</div>' +
            '<button class="fmx-btn" id="fmx-resetAll" style="width:100%;margin:0 0 12px;color:#8990a8;"><i class="ti ti-restore"></i> Сброс настроек</button>' +
            '<div id="fmx-hlist" style="margin:-4px 0 16px;"></div>' +
            '<div class="fmx-chdd" id="fmx-chdd"><button class="fmx-chbtn" id="fmx-chbtn" type="button"><i class="ti ti-broadcast lead"></i><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(cur ? ('@' + cur.username + (cur.title ? ' · ' + cur.title : '')) : 'Выбери канал') + '</span><i class="ti ti-chevron-down chev"></i></button><div class="fmx-chlist">' + rows + '</div></div>' +
            (function () {
                if (!existing) return '<div class="fmx-chnote">Новое размещение для этого канала</div>';
                var ms = existing.moderation_status || '';
                if (existing.status === 'rejected') return '<div class="fmx-chnote" style="color:#ef8080;border:0.5px solid rgba(239,68,68,0.3);border-radius:10px;padding:9px 12px;">Оффер отклонён' + (existing.reject_reason ? ': ' + _esc(existing.reject_reason) : '') + '<br>Исправь и нажми «Сохранить оффер» — он уйдёт на повторную проверку.</div>';
                if (existing.status === 'pending' && (ms === 'needs_review' || ms === 'complaints_hold')) return '<div class="fmx-chnote" style="color:#f5bf4f;border:0.5px solid rgba(245,191,79,0.3);border-radius:10px;padding:9px 12px;">Оффер на ручной проверке — это не блокировка' + (existing.reject_reason ? '. ' + _esc(existing.reject_reason) : '') + '<br>Проверим и опубликуем — обычно до суток.</div>';
                return '<div class="fmx-chnote">Редактируешь оффер · статус:' + _esc(existing.status_human || existing.status || '—') + '</div>';
            })() +
            accSec('cover', 'ti-photo', 'Обложка', paneCover()) +
            accSec('avatar', 'ti-user-circle', 'Аватар', paneAvatar()) +
            accSec('fx', 'ti-sparkles', 'Эффекты и анимация', paneFx()) +
            accSec('sticker', 'ti-sticker', 'Стикер', '<div id="fmx-stkBody">' + loadHtml() + '</div>') +
            accSec('style', 'ti-palette', 'Стиль', paneStyleMin()) +
            accSec('price', 'ti-cash', 'Форматы и цены', panePrice()) +
            accSec('text', 'ti-text-caption', 'Текст', paneText()) +
            '<button class="fmx-save" id="fmx-save" style="margin-top:18px;"><i class="ti ti-rocket"></i> ' + (_ss.listingId ? 'Сохранить оффер' : 'Опубликовать на Площадке') + '</button>' +
            (_ss.listingId ? '<div style="display:flex;gap:8px;margin-top:10px;">' +
                '<button class="fmx-btn" id="fmx-lpause">' + (_ss._status === 'paused' ? '<i class="ti ti-player-play"></i>Возобновить' : '<i class="ti ti-snowflake"></i>Заморозить') + '</button>' +
                '<button class="fmx-btn" id="fmx-ldel" style="color:#ef4444;border-color:rgba(239,68,68,0.3);"><i class="ti ti-trash"></i>Удалить</button></div>' +
                '<button class="fmx-btn" id="fmx-brag" style="width:100%;margin-top:8px;border-color:rgba(245,191,79,0.45);color:#f5bf4f;"><i class="ti ti-photo-star"></i> Промо-постер для рекламы канала</button>' +
                '<button class="fmx-btn" id="fmx-lstats" style="width:100%;margin-top:8px;"><i class="ti ti-chart-bar"></i> Статистика оффера за неделю</button>' : '') +
            '<label class="fmx-dealtgl"><input type="checkbox" id="fmx-showdeals"' + (_ss.showDeals !== false ? ' checked' : '') + '> Показывать сделки и рейтинг на оффере</label>' +
            (_ss.listingId ? '<div id="fmx-dealsPend"></div>' : '') +
            '<div class="fmx-savenote">После публикации оффер пройдёт проверку по смыслу. Опции с замком применяются при активном продвижении на 30 дней.</div>';
        var dd = el('fmx-chdd');
        el('fmx-chbtn').addEventListener('click', function (e) { e.stopPropagation(); dd.classList.toggle('on'); });
        qsa(dd, '.fmx-chrow').forEach(function (r) { r.addEventListener('click', function () { if (r.getAttribute('data-pub') !== '1') { toast('Нужен публичный @username — включи его в настройках канала в Telegram'); return; } dd.classList.remove('on'); _haptic('light'); selectChannel(+r.getAttribute('data-cid')); }); });
        qsa(sub, '.fmx-acc .fmx-acch').forEach(function (h) { h.addEventListener('click', function () { var id = h.parentNode.getAttribute('data-ac'); openAcc(_secCreate === id ? null : id, false); }); });
        el('fmx-save').addEventListener('click', saveStudio);
        var ra = el('fmx-resetAll');
        if (ra) ra.addEventListener('click', function () {
            uiConfirm('Сбросить все настройки оформления к стандартным? На Площадке изменения появятся после сохранения оффера.', function () {
                var keepCh = _ss.channelId, keepId = _ss.listingId, keepSt = _ss._status;
                _ss = defaultState(); _sfmts = defaultFmts();
                _ss.channelId = keepCh; _ss.listingId = keepId; _ss._status = keepSt;
                _ss.sticker = null; _ss.showDeals = true;
                _haptic('success'); toast('Настройки сброшены к стандартным');
                paintCreate();
            });
        });
        loadStickerPane();
        var sdT = el('fmx-showdeals');
        if (sdT) sdT.addEventListener('change', function () { _ss.showDeals = sdT.checked; renderHero(); });
        if (_ss.listingId) loadPendingDeals();
        var brag = el('fmx-brag');
        if (brag) brag.addEventListener('click', function () { _haptic('light'); openPosterStudio(); });
        var lstats = el('fmx-lstats');
        if (lstats) lstats.addEventListener('click', function () { _haptic('light'); openListingStats(_ss.listingId); });
        var lp = el('fmx-lpause');
        if (lp) lp.addEventListener('click', function () {
            var act = _ss._status === 'paused' ? 'resume' : 'pause';
            lp.disabled = true;
            apiPost('/api/v1/marketplace/listings/' + _ss.listingId + '/' + act, {}).then(function (r) {
                lp.disabled = false;
                if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось'); return; }
                _haptic('success');
                _ss._status = act === 'pause' ? 'paused' : 'published';
                for (var i = 0; i < _myListings.length; i++) if (_myListings[i].id === _ss.listingId) { _myListings[i].status = _ss._status; _myListings[i].status_human = _ss._status === 'paused' ? 'Заморожена' : 'Опубликовано'; }
                toast(act === 'pause' ? 'Оффер заморожен — с Площадки убран, вернёшь в любой момент' : 'Оффер снова на Площадке');
                _feed = null; _feedState = 'idle';
                selectChannel(_ss.channelId);
            }).catch(function () { lp.disabled = false; uiAlert('Не удалось — попробуй ещё раз.'); });
        });
        var ld = el('fmx-ldel');
        if (ld) ld.addEventListener('click', function () {
            uiConfirm('Удалить оффер с Площадки навсегда? Оформление и продвижение не сохранятся.', function () {
                ld.disabled = true;
                apiRequest('/api/v1/marketplace/listings/' + _ss.listingId, { method: 'DELETE' }).then(function (r) {
                    ld.disabled = false;
                    if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось удалить'); return; }
                    _haptic('success'); toast('Оффер удалён');
                    var delId = _ss.listingId;
                    _myListings = _myListings.filter(function (x) { return x.id !== delId; });
                    _ss.listingId = null; _ss._status = null;
                    _feed = null; _feedState = 'idle';
                    selectChannel(_ss.channelId);
                }).catch(function () { ld.disabled = false; uiAlert('Не удалось — попробуй ещё раз.'); });
            });
        });
        bindCover(); bindStyle(); bindPrice(); bindText();
        renderHero();
        openAcc(_secCreate || 'cover', false);
    }
    function checkMini() {
        var m = el('fmx-mini'); if (!m) return;
        var show = false;
        if (_mainTab === 'market' && _subTab === 'create') {
            var h = el('fmx-hero'), sc = el('fmx-scrollEl');
            if (h && sc && h.offsetHeight > 0) show = sc.scrollTop > (h.offsetTop + h.offsetHeight - 6);
        }
        m.classList.toggle('on', show);
    }
    function renderMini(accent, title, priceTxt) {
        var box = el('fmx-miniIn'); if (!box) return;
        box.innerHTML = '<div class="mini-av">' + avatarInner(accent) + '</div>' +
            '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(title) + '</div><div style="font-size:10px;color:' + accent + ';font-weight:700;">от ' + priceTxt + '</div></div>' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:10.5px;color:#8990a8;flex-shrink:0;">Наверх <i class="ti ti-arrow-up" style="font-size:13px;"></i></span>';
        checkMini();
    }
    function accSec(id, icon, title, body) {
        return '<div class="fmx-acc" data-ac="' + id + '"><div class="fmx-acch"><div class="fmx-accic"><i class="ti ' + icon + '"></i></div><div style="flex:1;min-width:0;"><div class="fmx-acct">' + title + '</div><div class="fmx-accv" id="fmx-accv-' + id + '"></div></div><i class="ti ti-chevron-down fmx-accc"></i></div><div class="fmx-accb"><div class="fmx-acci">' + body + '</div></div></div>';
    }
    function openAcc(id, scroll) {
        _secCreate = id;
        qsa(el('fmx-main'), '.fmx-acc').forEach(function (a) { a.classList.toggle('open', a.getAttribute('data-ac') === id); });
        updateAccSummaries();
        if (id && scroll) { var a = qsa(el('fmx-main'), '.fmx-acc').filter(function (x) { return x.getAttribute('data-ac') === id; })[0]; if (a && a.scrollIntoView) setTimeout(function () { a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); }
    }
    function updateAccSummaries() {
        var m = {
            cover: _ss.covType === 'grad' ? (_ss.coverGrad ? 'Свой градиент' : (COVER_NAMES[_ss.cover] || 'Градиент')) : ((_ss._media && _ss._media.cover && _ss._media.cover.name) || 'Свой файл'),
            avatar: _ss.avatar === 'tg' ? 'Из Telegram' : (_ss.avatar === 'emoji' ? 'Эмодзи ' + _ss.avEmoji : ((_ss._media && _ss._media.avatar && _ss._media.avatar.name) || 'Своё фото')),
            fx: (function () { var n = ['move', 'over', 'glow', 'orbit'].filter(function (k) { return _ss[k] !== 'none'; }).length; if (_ss.glass !== 'none') n++; if (_ss.glowCard) n++; return n ? n + ' актив.' : 'Выключены'; })(),
            style: (FONTS.filter(function (f) { return f[0] === _ss.font; })[0] || ['', 'Обычный'])[1] + ' · <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + _ss.color + ';vertical-align:-1px;"></span>',
            price: (function () { var on = _sfmts.filter(function (f) { return f.on; }); if (!on.length) return 'Не выбраны'; return on.length + ' форм. · от ' + _num(Math.min.apply(null, on.map(function (f) { return f.p; }))) + ' ₽'; })(),
            text: (_ss._desc ? 'Описание готово' : 'Заголовок и описание')
        };
        Object.keys(m).forEach(function (k) { var e = el('fmx-accv-' + k); if (e) e.innerHTML = m[k]; });
    }

    function setCreateSec(sc, force) {
        _secCreate = sc;
        qsa(el('fmx-pult'), '.fmx-pb').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-sc') === sc); });
        movePill('fmx-pult', 'fmx-pultpill');
        qsa(el('fmx-panes'), '.fmx-pane').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-sc') === sc); });
        sizePanes();
    }
    function sizePanes() { var p = el('fmx-panes'); if (!p) return; var a = p.querySelector('.fmx-pane.on'); if (a) p.style.height = a.offsetHeight + 'px'; }

    function mediaBoxHtml(target, hint) {
        var m = _ss._media && _ss._media[target];
        var row = m
            ? '<div class="fmx-note fmx-gr" style="margin-bottom:9px;"><i class="ti ' + (m.kind === 'video' ? 'ti-video' : 'ti-photo-check') + '"></i> ' + _esc(m.name || 'файл выбран') + '</div>' +
              '<div class="fmx-uplrow"><button class="fmx-upl" data-mp="' + target + '"><i class="ti ti-refresh"></i> Заменить</button>' +
              '<button class="fmx-upl sec" data-me="' + target + '"><i class="ti ti-crop"></i> Кадрирование</button>' +
              '<button class="fmx-upl sec" data-md="' + target + '"><i class="ti ti-trash"></i></button></div>'
            : '<button class="fmx-upl" data-mp="' + target + '"><i class="ti ti-cloud-upload"></i> Выбрать файл</button>';
        return row + '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:8px;">' + hint + '</div>';
    }
    function bindMediaBox(scope) {
        qsa(scope, '[data-mp]').forEach(function (b) { b.addEventListener('click', function () { pickMedia(b.getAttribute('data-mp')); }); });
        qsa(scope, '[data-me]').forEach(function (b) { b.addEventListener('click', function () { editMedia(b.getAttribute('data-me')); }); });
        qsa(scope, '[data-md]').forEach(function (b) { b.addEventListener('click', function () { delMedia(b.getAttribute('data-md')); }); });
    }
    function paneCover() {
        var seg = '<div class="fmx-mtabs" id="fmx-covtype">' +
            '<button class="fmx-mt' + (_ss.covType === 'grad' ? ' on' : '') + '" data-ct="grad"><i class="ti ti-color-swatch"></i> Градиент</button>' +
            '<button class="fmx-mt' + (_ss.covType !== 'grad' ? ' on' : '') + '" data-ct="img"><i class="ti ti-cloud-upload"></i> Загрузить</button></div>';
        var custom = !!_ss.coverGrad;
        var grads = '<div id="fmx-gradbox" style="' + (_ss.covType === 'grad' ? '' : 'display:none;') + '"><span class="fmx-lbl">Фон обложки</span><div class="fmx-grads" id="fmx-grads">' +
            COVERS.map(function (g, i) { return '<div class="fmx-gd' + (!custom && i === _ss.cover ? ' on' : '') + '" data-g="' + i + '" style="background:' + g + '" title="' + COVER_NAMES[i] + '"></div>'; }).join('') +
            '<div class="fmx-gd fmx-dot-rb' + (custom ? ' on' : '') + '" data-grb="1" title="Свой градиент"></div></div>' +
            '<div class="fmx-huerow" id="fmx-grads-hue" style="' + (custom ? '' : 'display:none;') + '"><input type="range" min="0" max="359" step="1" value="200"><div class="fmx-hueprev" style="background:' + (_ss.coverGrad || COVERS[0]) + ';"></div></div></div>';
        var upl = '<div id="fmx-uplbox" style="' + (_ss.covType === 'grad' ? 'display:none;' : '') + '">' +
            mediaBoxHtml('cover', 'Картинка, GIF или видео до 30 секунд, до 64 МБ. Лучше всего смотрится от 1600×800 — подгонишь кадрированием. Что нельзя использовать — в Справке, раздел «Правила».') + '</div>';
        return seg + grads + upl;
    }
    function bindCover() {
        qsa(el('fmx-covtype'), 'button').forEach(function (b) { b.addEventListener('click', function () { _ss.covType = b.getAttribute('data-ct'); qsa(el('fmx-covtype'), 'button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); var gb = el('fmx-gradbox'), ub = el('fmx-uplbox'); if (gb) gb.style.display = _ss.covType === 'grad' ? '' : 'none'; if (ub) ub.style.display = _ss.covType === 'grad' ? 'none' : ''; renderHero(); sizePanes(); }); });
        var gr = el('fmx-grads'), ghue = el('fmx-grads-hue'), gsl = ghue ? ghue.querySelector('input') : null, gprev = ghue ? ghue.querySelector('.fmx-hueprev') : null;
        function gradOf(h) { return 'linear-gradient(135deg,' + hslHex(h) + ',' + hslHex((h + 55) % 360) + ')'; }
        qsa(gr, '[data-g]').forEach(function (g) { g.addEventListener('click', function () { _ss.cover = +g.getAttribute('data-g'); _ss.coverGrad = null; if (ghue) ghue.style.display = 'none'; qsa(gr, '.fmx-gd').forEach(function (x) { x.classList.remove('on'); }); g.classList.add('on'); renderHero(); }); });
        var grb = gr ? gr.querySelector('[data-grb]') : null;
        if (grb) grb.addEventListener('click', function () { if (!ghue) return; var open = ghue.style.display !== 'none'; ghue.style.display = open ? 'none' : 'flex'; if (!open && gsl) { _ss.coverGrad = gradOf(+gsl.value); qsa(gr, '.fmx-gd').forEach(function (x) { x.classList.remove('on'); }); grb.classList.add('on'); if (gprev) gprev.style.background = _ss.coverGrad; renderHero(); } });
        if (gsl) gsl.addEventListener('input', function () { _ss.coverGrad = gradOf(+this.value); if (gprev) gprev.style.background = _ss.coverGrad; qsa(gr, '.fmx-gd').forEach(function (x) { x.classList.remove('on'); }); if (grb) grb.classList.add('on'); renderHero(); });
        bindMediaBox(qsa(el('fmx-main'), '[data-ac="cover"]')[0]);
    }

    function paneAvatar() {
        return '<div class="fmx-mtabs" id="fmx-avtype">' +
            '<button class="fmx-mt' + (_ss.avatar === 'tg' ? ' on' : '') + '" data-av="tg"><i class="ti ti-brand-telegram"></i> Канал</button>' +
            '<button class="fmx-mt' + (_ss.avatar === 'emoji' ? ' on' : '') + '" data-av="emoji"><i class="ti ti-mood-smile"></i> Эмодзи</button>' +
            '<button class="fmx-mt' + (_ss.avatar === 'img' ? ' on' : '') + '" data-av="img"><i class="ti ti-photo"></i> Фото</button></div>' +
            '<div id="fmx-avemoji" style="' + (_ss.avatar === 'emoji' ? '' : 'display:none;') + '"><div class="fmx-emg">' + EMOJIS.map(function (e) { return '<div class="fmx-em' + (e === _ss.avEmoji ? ' on' : '') + '" data-e="' + e + '">' + e + '</div>'; }).join('') + '</div></div>' +
            '<div id="fmx-avnote" class="fmx-note" style="margin-top:10px;' + (_ss.avatar === 'tg' ? '' : 'display:none;') + '"><i class="ti ti-info-circle"></i> Используется реальный аватар канала из Telegram.</div>' +
            '<div id="fmx-avbox" style="margin-top:10px;' + (_ss.avatar === 'img' ? '' : 'display:none;') + '">' + mediaBoxHtml('avatar', 'Фото или GIF, до 64 МБ. Лучше всего от 400×400 — подгонишь кадрированием. Правила — в Справке.') + '</div>';
    }
    function paneFx() {
        return fxChips('move', FX_MOVE, 'Движение') +
            fxChips('over', FX_OVER, 'Поверхность') +
            fxChips('glow', FX_GLOW, 'Свечение') +
            fxChips('orbit', FX_ORBIT, 'Орбита') +
            atomRow() +
            fxChips('glass', FX_GLASS, 'Стеклянные кнопки') +
            '<div class="fmx-tog' + (_ss.glowCard ? ' on' : '') + '" id="fmx-glowcard" style="margin-top:12px;"><div class="fmx-sw"><i></i></div><span style="font-size:12.5px;">Золотое свечение оффера <i class="ti ti-lock" style="font-size:10px;color:#f5bf4f;"></i></span></div>' +
            '<div style="margin-top:10px;">' +
            '<div style="font-size:10.5px;color:#8990a8;margin-bottom:6px;">Тег «Топ месяца» в шапке</div>' +
            '<div style="display:flex;gap:6px;" data-fxg="topTag">' +
            '<button class="fmx-fx' + (_ss.topTag === 'on' ? ' on' : '') + '" data-v="on">Видна</button>' +
            '<button class="fmx-fx' + (_ss.topTag === 'ghost' ? ' on' : '') + '" data-v="ghost">Прозрачная</button>' +
            '<button class="fmx-fx' + (_ss.topTag === 'off' ? ' on' : '') + '" data-v="off">Скрыта</button>' +
            '</div></div>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:6px;"><i class="ti ti-info-circle"></i> Движение, Поверхность и Свечение — бесплатно. <span style="color:#f5bf4f;">Опции с замком можно примерить в предпросмотре — применяются при активном продвижении на 30 дней (29 990 ₽).</span></div>' +
            (_isMod() ? '<button class="fmx-btn" id="fmx-modboost" style="width:100%;margin-top:10px;border-color:rgba(245,191,79,0.5);color:#f5bf4f;"><i class="ti ti-crown"></i> Мод-режим: включить Топ на 30 дней</button>' : '');
    }
    function paneStyleMin() {
        return '<span class="fmx-lbl">Акцент — цена и кнопка</span>' + colorPick('fmx-colors', _ss.color) +
            '<span class="fmx-lbl fmx-mt2">Шрифт заголовка</span><div class="fmx-mtabs" id="fmx-font">' +
            FONTS.map(function (f) { return '<button class="fmx-mt' + (f[0] === _ss.font ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
            '<span class="fmx-lbl fmx-mt2" style="color:#f5bf4f;">Фон оффера <i class="ti ti-lock" style="font-size:10px;"></i></span>' +
            '<div id="fmx-bodybox">' + mediaBoxHtml('cardbg', 'Картинка, GIF или видео внутри оффера, где цифры и кнопки — эксклюзив продвижения на 30 дней. Подложка под цифрами затемняется автоматически, читаемость не страдает.') + '</div>';
    }
    function hslHex(h) {
        var s = 0.85, l = 0.62, c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
        function q(v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }
        return '#' + q(r) + q(g) + q(b);
    }
    /* ===== цветовая математика (перенос из макета постера, 1 в 1) ===== */
    function hsv2rgb(h, s, v) {
        var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
        return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }
    function rgb2hsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
        if (d) {
            if (mx === r) h = 60 * (((g - b) / d) % 6);
            else if (mx === g) h = 60 * ((b - r) / d + 2);
            else h = 60 * ((r - g) / d + 4);
        }
        if (h < 0) h += 360;
        return [h, mx ? d / mx : 0, mx];
    }
    function rgb2hex(r, g, b) {
        return '#' + [r, g, b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
    }
    function hex2rgb(hx) {
        var m = /^#?([0-9a-f]{6})$/i.exec(String(hx || '').trim());
        if (!m) return null;
        var n = parseInt(m[1], 16);
        return [n >> 16, (n >> 8) & 255, n & 255];
    }
    function hsl2rgb(h, s, l) {
        s /= 100; l /= 100;
        var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
        return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }
    function colorPick(idBase, cur, sz) {
        var st = sz ? 'width:' + sz + 'px;height:' + sz + 'px;' : '';
        var custom = COLORS.indexOf(cur) < 0;
        return '<div class="fmx-dots" id="' + idBase + '" data-cur="' + _esc(cur) + '">' +
            COLORS.map(function (c) { return '<div class="fmx-dot' + (c === cur ? ' on' : '') + '" data-cv="' + c + '" style="background:' + c + ';' + st + '"></div>'; }).join('') +
            '<div class="fmx-dot fmx-dot-rb' + (custom ? ' on' : '') + '" data-rb="1" style="' + st + (custom ? 'box-shadow:0 0 0 2px ' + cur + ';' : '') + '" title="Свой цвет"></div></div>';
    }
    function bindColorPick(idBase, set) {
        var box = el(idBase); if (!box) return;
        var rb = box.querySelector('[data-rb]');
        function mark(v) {
            var preset = COLORS.indexOf(v) >= 0;
            qsa(box, '.fmx-dot').forEach(function (d) { d.classList.toggle('on', d.getAttribute('data-cv') === v || (d === rb && !preset)); });
            if (rb) rb.style.boxShadow = preset ? '' : '0 0 0 2px ' + v;
            box.setAttribute('data-cur', v);
        }
        qsa(box, '[data-cv]').forEach(function (d) { d.addEventListener('click', function () { var v = d.getAttribute('data-cv'); set(v); mark(v); renderHero(); }); });
        if (rb) rb.addEventListener('click', function () {
            openColorStudio(box.getAttribute('data-cur') || '#5DCAA5', function (hex) { set(hex); mark(hex); renderHero(); });
        });
    }
    /* «Свой цвет»: HSV-квадрат/спектр + hue + HEX + RGB — общий компонент для акцента и орбиты */
    function openColorStudio(cur, onPick) {
        var old = el('fmx-cpBg'); if (old) old.remove();
        /* ss — насыщенность спектра (полоска), отдельно от s: иначе полоска дёргается при перетаскивании точки */
        var st = { h: 160, s: 0.6, v: 0.8, mode: 'sv', px: 0.5, py: 0.5, ss: 1 };
        var c0 = hex2rgb(cur);
        if (c0) { var hv = rgb2hsv(c0[0], c0[1], c0[2]); st.h = hv[0]; st.s = hv[1]; st.v = hv[2]; }
        var bg = document.createElement('div');
        bg.id = 'fmx-cpBg'; bg.className = 'fmx-cfm';
        bg.innerHTML = '<div class="fmx-cfm-box">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;">' +
            '<div style="font-size:13px;font-weight:700;">Свой цвет</div>' +
            '<div style="display:flex;gap:6px;" id="fmx-cp-modes">' +
            '<button class="fmx-fx on" data-cpm="sv">Квадрат</button>' +
            '<button class="fmx-fx" data-cpm="spec">Спектр</button></div></div>' +
            '<div class="fmx-cp-sv" id="fmx-cp-sv"><canvas id="fmx-cp-cv" width="280" height="140"></canvas><div class="fmx-cp-dot" id="fmx-cp-dot"></div></div>' +
            '<div class="fmx-cp-cap" id="fmx-cp-huecap" style="text-align:left;margin:10px 0 3px;">Оттенок</div>' +
            '<input type="range" class="fmx-cp-hue" id="fmx-cp-hue" min="0" max="359" step="1" style="margin-top:0;">' +
            '<div class="fmx-cp-row">' +
            '<div class="fmx-cp-fld hexf"><span class="fmx-cp-cap">HEX</span><input type="text" id="fmx-cp-hex" maxlength="7" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
            '<div class="fmx-cp-fld"><span class="fmx-cp-cap">R</span><input type="number" id="fmx-cp-r" min="0" max="255" inputmode="numeric"></div>' +
            '<div class="fmx-cp-fld"><span class="fmx-cp-cap">G</span><input type="number" id="fmx-cp-g" min="0" max="255" inputmode="numeric"></div>' +
            '<div class="fmx-cp-fld"><span class="fmx-cp-cap">B</span><input type="number" id="fmx-cp-b" min="0" max="255" inputmode="numeric"></div></div>' +
            '<div class="fmx-cp-presets">' + COLORS.map(function (c) { return '<button class="fmx-cp-pd" data-cpp="' + c + '" style="background:' + c + ';" title="' + c + '"></button>'; }).join('') + '</div>' +
            '<button class="fmx-save" id="fmx-cp-done" style="margin-top:14px;"><i class="ti ti-check"></i> Готово</button></div>';
        document.body.appendChild(bg);
        var cv = el('fmx-cp-cv'), cx = cv.getContext('2d'), dot = el('fmx-cp-dot'), hue = el('fmx-cp-hue'), svb = el('fmx-cp-sv');
        /* спектр: цвет = позиция точки (тон по X, светлота по Y) + насыщенность с полоски */
        function specApply() {
            var c = hsl2rgb(st.px * 360, Math.round(st.ss * 100), 92 - st.py * 84);
            var h = rgb2hsv(c[0], c[1], c[2]);
            st.h = h[0]; st.s = h[1]; st.v = h[2];
        }
        /* обратный пересчёт: цвет -> позиция точки и насыщенность полоски */
        function specFromRgb(r, g, b) {
            var rr = r / 255, gg = g / 255, bb = b / 255;
            var mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), d = mx - mn, h = 0;
            if (d) {
                if (mx === rr) h = 60 * (((gg - bb) / d) % 6);
                else if (mx === gg) h = 60 * ((bb - rr) / d + 2);
                else h = 60 * ((rr - gg) / d + 4);
            }
            if (h < 0) h += 360;
            var l = (mx + mn) / 2, den = 1 - Math.abs(2 * l - 1);
            st.px = h / 360;
            st.py = Math.max(0, Math.min(1, (92 - l * 100) / 84));
            st.ss = den ? Math.max(0, Math.min(1, d / den)) : 0;
        }
        function draw() {
            if (st.mode === 'spec') {
                var sat = Math.round(st.ss * 100);
                for (var x = 0; x < cv.width; x++) {
                    var hh = x / cv.width * 360;
                    var g = cx.createLinearGradient(0, 0, 0, cv.height);
                    g.addColorStop(0, 'hsl(' + hh + ',' + sat + '%,92%)');
                    g.addColorStop(0.5, 'hsl(' + hh + ',' + sat + '%,50%)');
                    g.addColorStop(1, 'hsl(' + hh + ',' + sat + '%,8%)');
                    cx.fillStyle = g; cx.fillRect(x, 0, 1, cv.height);
                }
                return;
            }
            var base = hsv2rgb(st.h, 1, 1);
            var g1 = cx.createLinearGradient(0, 0, cv.width, 0);
            g1.addColorStop(0, '#fff'); g1.addColorStop(1, 'rgb(' + base.join(',') + ')');
            cx.fillStyle = g1; cx.fillRect(0, 0, cv.width, cv.height);
            var g2 = cx.createLinearGradient(0, 0, 0, cv.height);
            g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, '#000');
            cx.fillStyle = g2; cx.fillRect(0, 0, cv.width, cv.height);
        }
        var live = false; /* первый sync — только отрисовка: цвет не меняем, пока пользователь не тронул палитру */
        function sync(keepHex) {
            var c = hsv2rgb(st.h, st.s, st.v), hex = rgb2hex(c[0], c[1], c[2]);
            if (!keepHex) el('fmx-cp-hex').value = hex;
            el('fmx-cp-r').value = c[0]; el('fmx-cp-g').value = c[1]; el('fmx-cp-b').value = c[2];
            if (st.mode === 'spec') {
                dot.style.left = (st.px * 100) + '%'; dot.style.top = (st.py * 100) + '%';
                hue.value = Math.round(st.ss * 100);
                /* полоска насыщенности красится в текущий тон: серый -> выбранный цвет */
                var hh2 = Math.round(st.px * 360);
                hue.style.background = 'linear-gradient(90deg,hsl(' + hh2 + ',0%,62%),hsl(' + hh2 + ',100%,50%))';
            } else {
                dot.style.left = (st.s * 100) + '%'; dot.style.top = ((1 - st.v) * 100) + '%';
                hue.value = Math.round(st.h);
                hue.style.background = '';
            }
            dot.style.background = hex;
            if (live) onPick(hex);
        }
        function setMode(m) {
            st.mode = m;
            /* точка спектра — из текущего цвета, иначе она прыгала в центр и цвет уезжал */
            if (m === 'spec') { var cc = hsv2rgb(st.h, st.s, st.v); specFromRgb(cc[0], cc[1], cc[2]); }
            qsa(el('fmx-cp-modes'), '.fmx-fx').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-cpm') === m); });
            hue.max = m === 'spec' ? 100 : 359;
            var hc = el('fmx-cp-huecap'); if (hc) hc.textContent = m === 'spec' ? 'Насыщенность' : 'Оттенок';
            draw(); sync();
        }
        qsa(el('fmx-cp-modes'), '[data-cpm]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-cpm')); }); });
        function svPoint(e) {
            var t = e.touches ? e.touches[0] : e;
            var r = svb.getBoundingClientRect();
            var fx = Math.max(0, Math.min(1, (t.clientX - r.left) / r.width));
            var fy = Math.max(0, Math.min(1, (t.clientY - r.top) / r.height));
            if (st.mode === 'spec') {
                st.px = fx; st.py = fy;
                specApply(); sync();
            } else { st.s = fx; st.v = 1 - fy; sync(); }
        }
        function svStart(e) {
            e.preventDefault();
            svPoint(e);
            var mv = function (ev) { ev.preventDefault(); svPoint(ev); };
            var up = function () {
                document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
                document.removeEventListener('touchmove', mv); document.removeEventListener('touchend', up);
            };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
            document.addEventListener('touchmove', mv, { passive: false }); document.addEventListener('touchend', up);
        }
        svb.addEventListener('mousedown', svStart);
        svb.addEventListener('touchstart', svStart, { passive: false });
        hue.addEventListener('input', function () {
            if (st.mode === 'spec') { st.ss = Math.max(0, Math.min(1, (+this.value) / 100)); specApply(); draw(); }
            else { st.h = +this.value; draw(); }
            sync();
        });
        el('fmx-cp-hex').addEventListener('input', function () {
            var c = hex2rgb(this.value); if (!c) return;
            var hv2 = rgb2hsv(c[0], c[1], c[2]);
            st.h = hv2[0]; st.s = hv2[1]; st.v = hv2[2];
            if (st.mode === 'spec') specFromRgb(c[0], c[1], c[2]);
            draw(); sync(true);
        });
        ['r', 'g', 'b'].forEach(function (k) {
            el('fmx-cp-' + k).addEventListener('input', function () {
                var r = Math.max(0, Math.min(255, parseInt(el('fmx-cp-r').value, 10) || 0));
                var g = Math.max(0, Math.min(255, parseInt(el('fmx-cp-g').value, 10) || 0));
                var b = Math.max(0, Math.min(255, parseInt(el('fmx-cp-b').value, 10) || 0));
                var hv3 = rgb2hsv(r, g, b);
                st.h = hv3[0]; st.s = hv3[1]; st.v = hv3[2];
                if (st.mode === 'spec') specFromRgb(r, g, b);
                el('fmx-cp-hex').value = rgb2hex(r, g, b);
                draw(); sync(true);
            });
        });
        qsa(bg, '[data-cpp]').forEach(function (p) {
            p.addEventListener('click', function () {
                var c = hex2rgb(p.getAttribute('data-cpp')); if (!c) return;
                var hv4 = rgb2hsv(c[0], c[1], c[2]);
                st.h = hv4[0]; st.s = hv4[1]; st.v = hv4[2];
                if (st.mode === 'spec') specFromRgb(c[0], c[1], c[2]);
                draw(); sync(); _haptic('light');
            });
        });
        function done() { bg.remove(); }
        el('fmx-cp-done').addEventListener('click', done);
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        draw(); sync(); live = true;
    }
    function isVipFx(key, v) { return !!(FX_VIP[key] && FX_VIP[key].indexOf(v) >= 0); }
    function fxChips(key, arr, label) {
        return '<div class="fmx-fxg"><div class="fmx-fxl">' + label + '</div><div class="fmx-fxw" data-fxg="' + key + '">' +
            arr.map(function (o) { var vip = isVipFx(key, o[0]); return '<button class="fmx-fx' + (o[0] === _ss[key] ? ' on' : '') + (vip ? ' vip' : '') + '" data-v="' + o[0] + '">' + (vip ? '<i class="ti ti-lock"></i>' : '') + o[1] + '</button>'; }).join('') +
            '</div></div>';
    }
    function atomRow() {
        return '<div id="fmx-atomrow" class="fmx-fxg" style="' + (_ss.orbit !== 'none' ? '' : 'display:none;') + '"><div class="fmx-fxl vipc"><i class="ti ti-atom"></i> Цвет орбиты</div>' +
            colorPick('fmx-atomc', _ss.atomColor, 26) + '</div>';
    }
    function bindStyle() {
        bindColorPick('fmx-colors', function (v) { _ss.color = v; });
        qsa(el('fmx-avtype'), 'button').forEach(function (b) { b.addEventListener('click', function () { _ss.avatar = b.getAttribute('data-av'); qsa(el('fmx-avtype'), 'button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); el('fmx-avemoji').style.display = _ss.avatar === 'emoji' ? 'block' : 'none'; el('fmx-avnote').style.display = _ss.avatar === 'tg' ? 'flex' : 'none'; el('fmx-avbox').style.display = _ss.avatar === 'img' ? 'block' : 'none'; renderHero(); sizePanes(); }); });
        qsa(el('fmx-avemoji'), '.fmx-em').forEach(function (e) { e.addEventListener('click', function () { _ss.avEmoji = e.getAttribute('data-e'); qsa(el('fmx-avemoji'), '.fmx-em').forEach(function (x) { x.classList.remove('on'); }); e.classList.add('on'); renderHero(); }); });
        qsa(el('fmx-font'), 'button').forEach(function (b) { b.addEventListener('click', function () { _ss.font = b.getAttribute('data-f'); qsa(el('fmx-font'), 'button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); renderHero(); }); });
        qsa(el('fmx-main'), '[data-fxg]').forEach(function (g) { var key = g.getAttribute('data-fxg'); qsa(g, '.fmx-fx').forEach(function (b) { b.addEventListener('click', function () { _ss[key] = b.getAttribute('data-v'); qsa(g, '.fmx-fx').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); if (key === 'orbit') { var ar = el('fmx-atomrow'); if (ar) ar.style.display = _ss.orbit !== 'none' ? 'block' : 'none'; } renderHero(); sizePanes(); }); }); });
        bindColorPick('fmx-atomc', function (v) { _ss.atomColor = v; });
        el('fmx-glowcard').addEventListener('click', function () { _ss.glowCard = !_ss.glowCard; this.classList.toggle('on'); renderHero(); });
        var mb = el('fmx-modboost');
        if (mb) mb.addEventListener('click', function () {
            var base = listingForChannel(_ss.channelId);
            if (!base) { toast('Сначала сохрани оффер — топ включается для опубликованного'); return; }
            mb.disabled = true;
            apiPost('/api/v1/marketplace/mod/boost', { listing_id: base.id }).then(function (r) {
                if (r && r.ok) {
                    toast('Топ месяца включён на 30 дней');
                    loadMyListings().then(function () { renderHero(); });
                } else { toast((r && r.error) || 'Не удалось'); }
                mb.disabled = false;
            }).catch(function () { toast('Сервер не ответил: проверь, что бэкенд-файлы залиты и forgemetrics-api перезапущен'); mb.disabled = false; });
        });
        bindMediaBox(qsa(el('fmx-main'), '[data-ac="avatar"]')[0]);
        bindMediaBox(qsa(el('fmx-main'), '[data-ac="style"]')[0]);
    }

    function fmtRows() {
        return _sfmts.map(function (f, i) {
            return '<div class="fmx-chk' + (f.on ? ' on' : '') + '" data-fi="' + i + '"><div class="fmx-box"><i class="ti ti-check"></i></div><span style="font-size:12.5px;flex:1;">' + _esc(f.n) + '</span>' +
                (f.on ? '<input class="fmx-pinp" type="number" data-pi="' + i + '" value="' + f.p + '" step="100"><span style="font-size:11px;color:#8990a8;margin-left:5px;">₽</span>' : '<span style="font-size:11px;color:#565b73;">выкл</span>') + '</div>';
        }).join('');
    }
    function panePrice() {
        var note = '<div class="fmx-note" style="margin-top:4px;"><i class="ti ti-bulb"></i> Цену задаёшь сам. Ориентируйся на CPM и охват канала — так рекламодателю проще сравнить. Включённые форматы видны в оффере.</div>';
        var slots = '<span class="fmx-lbl fmx-mt2"><i class="ti ti-calendar"></i> Свободные слоты</span><input class="fmx-inp" id="fmx-slots" value="' + _esc(_ss._slots || '') + '" placeholder="напр. 2 слота в неделю">';
        return '<span class="fmx-lbl">Что продаёшь и почём</span><div id="fmx-fmts">' + fmtRows() + '</div>' + note + slots;
    }
    function bindFmtRows() {
        qsa(el('fmx-fmts'), '.fmx-chk').forEach(function (c) { c.addEventListener('click', function (ev) { if (ev.target && ev.target.classList && ev.target.classList.contains('fmx-pinp')) return; var i = +c.getAttribute('data-fi'); _sfmts[i].on = !_sfmts[i].on; _haptic('light'); el('fmx-fmts').innerHTML = fmtRows(); bindFmtRows(); renderHero(); }); });
        qsa(el('fmx-fmts'), '[data-pi]').forEach(function (inp) { inp.addEventListener('click', function (e) { e.stopPropagation(); }); inp.addEventListener('input', function () { _sfmts[+inp.getAttribute('data-pi')].p = Math.max(0, Math.min(100000000, +inp.value || 0)); renderHero(); }); });
    }
    function bindPrice() {
        bindFmtRows();
        el('fmx-slots').addEventListener('input', function () { _ss._slots = this.value; });
    }

    function paneText() {
        var c = curChannel();
        return '<span class="fmx-lbl">Заголовок</span><input class="fmx-inp" id="fmx-title" value="' + _esc(_ss._title != null ? _ss._title : (c.title || '')) + '" maxlength="60">' +
            '<span class="fmx-lbl fmx-mt2">О канале (видно при «Развернуть»)</span><textarea class="fmx-inp" id="fmx-desc" maxlength="200" placeholder="Чем хорош канал и какая аудитория…">' + _esc(_ss._desc || '') + '</textarea>' +
            '<span class="fmx-lbl fmx-mt2">Теги (через запятую)</span><input class="fmx-inp" id="fmx-tags" value="' + _esc(_ss._tags || '') + '" maxlength="60" placeholder="ниша, тема, аудитория">';
    }
    function bindText() {
        el('fmx-title').addEventListener('input', function () { _ss._title = this.value; renderHero(); });
        el('fmx-desc').addEventListener('input', function () { _ss._desc = this.value; renderHero(); });
        el('fmx-tags').addEventListener('input', function () { _ss._tags = this.value; renderHero(); });
    }

    function glassStyles(accent) { return glassKindStyles(_ss.glass, accent); }
    function glassKindStyles(g, accent) {
        if (g === 'frost') return { s: 'background:rgba(255,255,255,0.10);border:0.5px solid rgba(255,255,255,0.25);backdrop-filter:blur(10px);color:#fff;', p: 'background:linear-gradient(135deg,' + accent + 'e6,' + accent + '99);border:0.5px solid ' + accent + 'aa;backdrop-filter:blur(10px);color:#fff;' };
        if (g === 'tint') return { s: 'background:' + accent + '22;border:0.5px solid ' + accent + '55;backdrop-filter:blur(10px);color:' + accent + ';', p: 'background:linear-gradient(135deg,' + accent + ',' + accent + 'aa);border:0.5px solid ' + accent + ';backdrop-filter:blur(10px);color:#fff;' };
        if (g === 'dark') return { s: 'background:rgba(8,10,20,0.55);border:0.5px solid rgba(255,255,255,0.14);backdrop-filter:blur(10px);color:#e8e8ed;', p: 'background:linear-gradient(135deg,rgba(8,10,20,0.75),' + accent + '77);border:0.5px solid ' + accent + '66;backdrop-filter:blur(10px);color:#fff;' };
        return { s: '', p: 'background:' + accent + ';color:#fff;' };
    }
    var _crop = null;
    function pickMedia(target) {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = target === 'avatar' ? 'image/*' : 'image/*,video/mp4,video/quicktime';
        inp.addEventListener('change', function () {
            var fl = inp.files && inp.files[0]; if (!fl) return;
            // строгая проверка типа при ВЫБОРЕ: accept — лишь подсказка, через «все файлы» можно
            // подсунуть .conf/.bat/что угодно. Пускаем только настоящие фото и видео.
            var t = (fl.type || '').toLowerCase();
            var isImg = t.indexOf('image/') === 0;
            var isVid = t === 'video/mp4' || t === 'video/quicktime';
            if (target === 'avatar' && !isImg) { uiAlert('Для аватара подойдёт только фото или GIF.'); return; }
            if (!isImg && !isVid) { uiAlert('Можно загрузить только фото (JPG, PNG, WebP, GIF) или видео (MP4, MOV). Этот файл не подходит.'); return; }
            if (fl.size > MEDIA_MAX_BYTES) { uiAlert('Файл больше 64 МБ — сожми его или выбери другой.'); return; }
            var kind = isVid ? 'video' : (t === 'image/gif' ? 'gif' : 'img');
            var url = URL.createObjectURL(fl);
            if (kind === 'video') {
                var v = document.createElement('video');
                v.preload = 'metadata';
                v.onloadedmetadata = function () {
                    if (v.duration > 30.5) { uiAlert('Видео длиннее 30 секунд — сократи ролик до 30 сек.'); URL.revokeObjectURL(url); return; }
                    startCrop(target, url, kind, fl.name, 50, 50, 1, fl);
                };
                v.onerror = function () { uiAlert('Не удалось прочитать видео.'); URL.revokeObjectURL(url); };
                v.src = url;
            } else startCrop(target, url, kind, fl.name, 50, 50, 1, fl);
        });
        inp.click();
    }
    function editMedia(target) {
        var m = _ss._media && _ss._media[target];
        if (!m) { pickMedia(target); return; }
        var a = (_ss.att && typeof _ss.att[target] === 'object') ? _ss.att[target] : {};
        startCrop(target, m.url, m.kind, m.name, a.x != null ? a.x : 50, a.y != null ? a.y : 50, a.s || 1, m.file || null);
    }
    function delMedia(target) {
        if (_ss._media && _ss._media[target]) { try { URL.revokeObjectURL(_ss._media[target].url); } catch (e) {} delete _ss._media[target]; }
        _ss.att[target] = '';
        if (target === 'cover') _ss.covType = 'grad';
        paintCreate();
    }
    function startCrop(target, url, kind, name, x, y, s, file) {
        _crop = { target: target, url: url, kind: kind, name: name, x: x, y: y, s: s, drag: null, file: file || null };
        var box = el('fmx-cropBox');
        box.style.aspectRatio = target === 'avatar' ? '1 / 1' : (target === 'cardbg' ? '4 / 5' : '2 / 1');
        box.innerHTML = (kind === 'video' ? '<video src="' + url + '" autoplay muted loop playsinline></video>' : '<img src="' + url + '">') +
            (target === 'cover' ? '<div class="fmx-safeT"></div><div class="fmx-safeB"></div><div class="fmx-safeF"><span>Зона шапки — видна на 100%</span></div>' : '') +
            (target === 'cardbg' ? '<div class="fmx-safeT"></div><div class="fmx-safeB"></div><div class="fmx-safeF"><span>Зона оффера — видна на 100%</span></div>' : '') +
            (target === 'avatar' ? '<div class="fmx-safeR"></div>' : '');
        el('fmx-cropHint').textContent = target === 'avatar' ? 'Пунктирный контур — видимая зона аватара, углы срежутся скруглением.' : (target === 'cardbg' ? 'Пунктирная полоса — видимая часть тела оффера. Цифры затемняются подложкой автоматически.' : 'Пунктирная полоса — то, что видно в шапке оффера. Затемнённое сверху и снизу в шапку не попадает.');
        el('fmx-cropZoom').value = s;
        cropApply();
        showModal('fmx-cropBg');
    }
    function cropApply() {
        var box = el('fmx-cropBox'); if (!box || !_crop) return;
        var m = box.firstChild; if (!m) return;
        m.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:' + _crop.x + '% ' + _crop.y + '%;transform:scale(' + _crop.s + ');transform-origin:' + _crop.x + '% ' + _crop.y + '%;pointer-events:none;display:block;';
        if (_crop.target === 'cover' || _crop.target === 'cardbg') {
            var band = _crop.target === 'cover' ? 48.2 : 52, top = (100 - band) * (_crop.y / 100);
            var st = box.querySelector('.fmx-safeT'), sb = box.querySelector('.fmx-safeB'), sf = box.querySelector('.fmx-safeF');
            if (st) st.style.height = top + '%';
            if (sf) { sf.style.top = top + '%'; sf.style.height = band + '%'; }
            if (sb) { sb.style.top = (top + band) + '%'; sb.style.height = (100 - top - band) + '%'; }
        }
    }
    function finishCrop() {
        if (!_crop) return;
        if (!_ss._media) _ss._media = {};
        _ss._media[_crop.target] = { url: _crop.url, kind: _crop.kind, name: _crop.name, file: _crop.file || (_ss._media[_crop.target] ? _ss._media[_crop.target].file : null) };
        _ss.att[_crop.target] = { kind: _crop.kind, name: _crop.name, x: Math.round(_crop.x * 10) / 10, y: Math.round(_crop.y * 10) / 10, s: Math.round(_crop.s * 100) / 100 };
        if (_crop.target === 'cover') _ss.covType = _crop.kind === 'video' ? 'video' : (_crop.kind === 'gif' ? 'gif' : 'img');
        if (_crop.target === 'avatar') _ss.avatar = 'img';
        _crop = null;
        hideModal('fmx-cropBg');
        paintCreate();
    }
    function fontStyle(f) { var m = { normal: 'font-weight:600;', bold: 'font-weight:800;', wide: 'font-weight:700;letter-spacing:0.5px;', mono: 'font-family:monospace;font-weight:600;' }; return m[f] || m.normal; }
    function listingAvatar(l, accent) {
        var fx = l.effects_json || {}, at = l.emoji_attachments_json || {}, top = _isTop(l);
        var mv = fx.move || 'none', ov = fx.over || 'none', gl = fx.glow || 'none', orb = fx.orbit || 'none';
        var oc = fx.atomColor || accent;
        if (!top) {
            if (FX_VIP.glow.indexOf(gl) >= 0) gl = 'none';
            if (FX_VIP.orbit.indexOf(orb) >= 0) orb = 'none';
        }
        var halo = gl !== 'none' ? '<i class="fmx-avhalo fx-g-' + gl + '" style="--fxa:' + accent + ';"></i>' : '';
        var over = '<i class="fmx-avover fx-o-' + ov + '"></i>';
        var orbH = '';
        if (orb === 'comet') orbH = '<i class="fmx-avorb fx-orb-comet" style="--fxe:' + oc + ';"></i>';
        else if (orb === 'atom') orbH = '<i class="fmx-avorb fx-orb-atom" style="--fxe:' + oc + ';"></i><i class="fmx-avorb fx-orb-atom r2" style="--fxe:' + oc + ';"></i>';
        else if (orb === 'orbitals') orbH = '<i class="fmx-avorb fx-orb-o1" style="--fxe:' + oc + ';"></i><i class="fmx-avorb fx-orb-o2" style="--fxe:' + oc + ';"></i><i class="fmx-avorb fx-orb-o3" style="--fxe:' + oc + ';"></i>';
        else if (orb === 'sphere') orbH = '<i class="fmx-avorb fx-orb-sph" style="--fxe:' + oc + ';"><i class="sp1"></i><i class="sp2"></i><i class="sp3"></i></i>';
        var t = l.title || l.username || '?', core;
        if (l.avatar_url) core = '<div class="fmx-av fx-c-' + ov + '" style="background:' + accent + ';overflow:hidden;"><img src="' + mediaAbs(l.avatar_url) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' + (l.avatar_type === 'img' ? _posStyle(at.avatar) : 'object-position:center;') + '">' + over + '</div>';
        else if (l.avatar_type === 'emoji' && l.avatar_emoji) core = '<div class="fmx-av fx-c-' + ov + '" style="background:rgba(255,255,255,0.06);border-color:' + accent + ';">' + _esc(l.avatar_emoji) + over + '</div>';
        else core = '<div class="fmx-av fx-c-' + ov + '" style="background:' + accent + ';">' + _esc(t.charAt(0)) + over + '</div>';
        return '<div class="fmx-avw fx-m-' + mv + '">' + halo + core + orbH + '</div>';
    }
    function avatarInner(accent, goto) {
        var c = curChannel();
        var over = '<i class="fmx-avover fx-o-' + _ss.over + '"></i>';
        var core;
        var av = _ss._media && _ss._media.avatar, ap = (_ss.att && typeof _ss.att.avatar === 'object') ? _ss.att.avatar : null;
        if (_ss.avatar === 'img' && av && ap) core = '<div class="fmx-av fx-c-' + _ss.over + '" style="background:' + accent + ';overflow:hidden;"><img src="' + av.url + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:' + ap.x + '% ' + ap.y + '%;transform:scale(' + ap.s + ');transform-origin:' + ap.x + '% ' + ap.y + '%;">' + over + '</div>';
        else if (_ss.avatar === 'emoji') core = '<div class="fmx-av fx-c-' + _ss.over + '" style="background:rgba(255,255,255,0.06);border-color:' + accent + ';">' + _ss.avEmoji + over + '</div>';
        else if (c.avatar_url) core = '<div class="fmx-av fx-c-' + _ss.over + '" style="background:' + accent + ';overflow:hidden;"><img src="' + mediaAbs(c.avatar_url) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">' + over + '</div>';
        else core = '<div class="fmx-av fx-c-' + _ss.over + '" style="background:' + accent + ';">' + _esc((c.title || c.username || '?').charAt(0)) + over + '</div>';
        var halo = '<i class="fmx-avhalo fx-g-' + _ss.glow + '" style="--fxa:' + accent + ';"></i>';
        var orb = '', oc = _ss.atomColor;
        if (_ss.orbit === 'comet') orb = '<i class="fmx-avorb fx-orb-comet" style="--fxe:' + oc + ';"></i>';
        else if (_ss.orbit === 'atom') orb = '<i class="fmx-avorb fx-orb-atom" style="--fxe:' + oc + ';"></i><i class="fmx-avorb fx-orb-atom r2" style="--fxe:' + oc + ';"></i>';
        else if (_ss.orbit === 'orbitals') orb = '<i class="fmx-avorb fx-orb-o1" style="--fxe:' + oc + ';"></i><i class="fmx-avorb fx-orb-o2" style="--fxe:' + oc + ';"></i><i class="fmx-avorb fx-orb-o3" style="--fxe:' + oc + ';"></i>';
        else if (_ss.orbit === 'sphere') orb = '<i class="fmx-avorb fx-orb-sph" style="--fxe:' + oc + ';"><i class="sp1"></i><i class="sp2"></i><i class="sp3"></i></i>';
        return '<div class="fmx-avw fx-m-' + _ss.move + '"' + (goto ? ' data-goto="avatar" style="cursor:pointer;"' : '') + '>' + halo + core + orb + '</div>';
    }
    function heroCoverHtml(gradient) {
        var mc = _ss._media && _ss._media.cover, pc = (_ss.att && typeof _ss.att.cover === 'object') ? _ss.att.cover : null;
        if (_ss.covType !== 'grad' && mc && pc) {
            var st = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:' + pc.x + '% ' + pc.y + '%;transform:scale(' + pc.s + ');transform-origin:' + pc.x + '% ' + pc.y + '%;';
            return '<div class="fmx-cov-bg" style="overflow:hidden;background:#11141f;">' + (mc.kind === 'video' ? '<video src="' + mc.url + '" style="' + st + '" autoplay muted loop playsinline></video>' : '<img src="' + mc.url + '" style="' + st + '">') + '</div>';
        }
        return '<div class="fmx-cov-bg" style="background:' + gradient + ';"></div>';
    }
    /* ===================== стикеры: панель конструктора ===================== */
    var SEAM = 84;  // высота шапки карточки — стабильный якорь
    function stkSize(s, W) { return Math.max(32, Math.min(64 * (s.scale || 1), Math.min(220, W * 0.62))); }
    function stkPos(s, W) {
        var size = stkSize(s, W);
        var odx = _touchDev ? STK_PHONE_DX : 0, ody = _touchDev ? STK_PHONE_DY : 0;
        if ((s.mode || 'slot') === 'slot') return { size: size, left: W - size - 12 + odx, top: SEAM - size * 0.55 + ody };
        var cx = Math.max(10, Math.min((s.x != null ? s.x : 0.82) * W, W - 10));
        var cy = Math.max(10, SEAM + (s.dy != null ? s.dy : 0));
        return { size: size, left: cx - size / 2 + odx, top: cy - size / 2 + ody };
    }
    function stkMedia(s, animate) {
        if (s.kind === 'webm') return '<video src="' + _esc(mediaAbs(s.url)) + '" muted playsinline loop autoplay preload="auto"' + (animate ? '' : ' onloadeddata="this.pause()"') + ' style="width:100%;height:100%;object-fit:contain;pointer-events:none;"></video>';
        if (s.kind === 'tgs') return '<span class="fmx-stk-lot" data-tgs="' + _esc(s.url) + '" data-anim="' + (animate ? 1 : 0) + '"><i class="ti ti-sticker"></i></span>';
        return '<img src="' + _esc(mediaAbs(s.url)) + '" alt="" style="width:100%;height:100%;object-fit:contain;pointer-events:none;">';
    }
    function stkOverlay(s, W, animate, draggable) {
        if (!s || !s.url) return '';
        var p = stkPos(s, W);
        var dm = s.dmode || 'bg';
        var mcls = dm === 'top' ? ' m-top' : (dm === 'blend' ? ' m-blend' : '');
        var boxSt;
        if (draggable) {
            boxSt = 'left:' + p.left.toFixed(1) + 'px;top:' + p.top.toFixed(1) + 'px;width:' + p.size + 'px;height:' + p.size + 'px;transform:rotate(' + (s.rot || 0) + 'deg);';
        } else if ((s.mode || 'slot') === 'slot') {
            boxSt = 'right:' + (12 - (_touchDev ? STK_PHONE_DX : 0)) + 'px;top:' + p.top.toFixed(1) + 'px;width:' + p.size + 'px;height:' + p.size + 'px;transform:rotate(' + (s.rot || 0) + 'deg);';
        } else {
            /* пиксели 350-макета: сдвиг уже учтён в stkPos */
            boxSt = 'left:' + p.left.toFixed(1) + 'px;top:' + p.top.toFixed(1) + 'px;width:' + p.size + 'px;height:' + p.size + 'px;transform:rotate(' + (s.rot || 0) + 'deg);';
        }
        var core = '<div class="fmx-stk' + mcls + '" ' + (draggable ? 'id="fmx-stkPrev" ' : '') + 'style="' + boxSt + '">' + stkMedia(s, animate) + '</div>';
        if (!draggable || (s.mode || 'slot') !== 'free') return core;
        var selCls = (_ss && _ss.stickerSel !== false) ? ' sel' : '';
        var modeDots = '<div class="fmx-stkmodes">' + [['top', 'Поверх'], ['blend', 'Слияние'], ['bg', 'Задний фон']].map(function (m) {
            return '<button class="fmx-stkmd' + (dm === m[0] ? ' on' : '') + '" data-stkmd="' + m[0] + '" data-stkmdn="' + m[1] + '" title="' + m[1] + '"><i></i></button>';
        }).join('') + '</div>';
        return core + '<div class="fmx-stkGrab' + selCls + '" id="fmx-stkGrab" style="' + boxSt + '" title="Перемещение, размер, поворот"><i class="fmx-stkh rot" title="Крутить"></i><i class="fmx-stkh rsz" title="Размер"></i><i class="ti ti-x fmx-stkh del" title="Убрать с оффера"></i>' + modeDots + '</div>';
    }
    var _lotLibs = null;
    function _script(u) {
        return new Promise(function (res, rej) {
            var s = document.createElement('script');
            s.src = u; s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
    }
    function loadLottie() {
        if (_lotLibs) return _lotLibs;
        _lotLibs = Promise.all([
            (typeof pako !== 'undefined') ? Promise.resolve() : _script('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js'),
            (typeof lottie !== 'undefined') ? Promise.resolve() : _script('https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js')
        ]);
        return _lotLibs;
    }
    var _tgsData = {};  // url -> animationData
    var _touchDev = (function () { try { return matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window; } catch (e) { return false; } })();
    var STK_PHONE_DX = -0.5, STK_PHONE_DY = -2.5;  // калибровка публичного стикера на тач-устройствах: вправо/вниз, px 350-макета
    var _lotAnims = [];  // живые аниматоры: сироты уничтожаются при каждой гидрации
    function hydrateTgs(root) {
        _lotAnims = _lotAnims.filter(function (a) {
            if (a.el && a.el.isConnected) return true;
            try { a.anim.destroy(); } catch (e) {}
            return false;
        });
        var nodes = qsa(root || document, '.fmx-stk-lot[data-tgs]:not([data-done])');
        if (!nodes.length) return;
        loadLottie().then(function () {
            nodes.forEach(function (n) {
                if (n.getAttribute('data-done')) return;
                n.setAttribute('data-done', '1');
                var url = n.getAttribute('data-tgs'), anim = n.getAttribute('data-anim') === '1';
                var play = function (data) {
                    n.innerHTML = '';
                    try {
                        var a = lottie.loadAnimation({ container: n, renderer: 'svg', loop: true, autoplay: anim, animationData: data });
                        if (!anim) a.goToAndStop(0, true);
                        _lotAnims.push({ el: n, anim: a });
                    } catch (e) {}
                };
                if (_tgsData[url]) { play(_tgsData[url]); return; }
                fetch(mediaAbs(url)).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
                    var json = JSON.parse(pako.inflate(new Uint8Array(buf), { to: 'string' }));
                    _tgsData[url] = json; play(json);
                }).catch(function () { n.removeAttribute('data-done'); });
            });
        }).catch(function () {});
    }
    function loadPendingDeals() {
        var box = el('fmx-dealsPend'); if (!box) return;
        apiGet('/api/v1/marketplace/deals/pending').then(function (r) {
            if (!r || !r.ok || !r.deals || !r.deals.length) { box.innerHTML = ''; return; }
            box.innerHTML = '<div class="fmx-pend"><div class="fmx-pend-t"><i class="ti ti-heart-handshake" style="color:#f59e0b;"></i> Подтверждение сделок</div>' +
                r.deals.map(function (d) {
                    return '<div class="fmx-pend-r" data-did="' + d.deal_id + '"><span>' + (d.buyer_username ? '@' + _esc(d.buyer_username) : 'Рекламодатель') + ' · ' + _ago(d.created_at) + '</span>' +
                        '<span style="display:flex;gap:6px;"><button class="fmx-btn" data-dacc="' + d.deal_id + '" style="padding:6px 11px;color:#5DCAA5;border-color:rgba(93,202,165,0.35);"><i class="ti ti-check"></i>Да</button>' +
                        '<button class="fmx-btn" data-ddec="' + d.deal_id + '" style="padding:6px 11px;"><i class="ti ti-x"></i>Нет</button></span></div>';
                }).join('') +
                '<div style="font-size:10px;color:#565b73;margin-top:6px;">Подтверждай только реальные сделки: счётчик — твоя репутация.</div></div>';
            function respond(id, acc) {
                apiPost('/api/v1/marketplace/deals/' + id + '/respond', { accept: acc }).then(function (r2) {
                    if (r2 && r2.ok === false) { uiAlert(r2.error || 'Не удалось'); return; }
                    _haptic('success');
                    toast(acc ? 'Сделка подтверждена — счётчик вырос' : 'Отклонено');
                    var row = box.querySelector('[data-did="' + id + '"]'); if (row) row.remove();
                    if (acc) { _feed = null; _feedState = 'idle'; }
                    if (!box.querySelector('[data-did]')) box.innerHTML = '';
                }).catch(function () { uiAlert('Не удалось — попробуй ещё раз.'); });
            }
            qsa(box, '[data-dacc]').forEach(function (b) { b.addEventListener('click', function () { respond(+b.getAttribute('data-dacc'), true); }); });
            qsa(box, '[data-ddec]').forEach(function (b) { b.addEventListener('click', function () { respond(+b.getAttribute('data-ddec'), false); }); });
        }).catch(function () {});
    }
    function loadStickerPane() {
        var box = el('fmx-stkBody'); if (!box) return;
        if (_stickers) { renderStickerPane(); return; }
        apiGet('/api/v1/marketplace/stickers').then(function (r) {
            _stickers = (r && r.stickers) ? r.stickers : [];
            renderStickerPane();
        }).catch(function () { _stickers = []; renderStickerPane(); });
    }
    function renderStickerPane() {
        var box = el('fmx-stkBody'); if (!box) return;
        var s = _ss.sticker;
        var html = '';
        if (!_stickers.length) {
            html = '<div style="font-size:11.5px;color:#8990a8;line-height:1.6;">Коллекция пуста. Отправь боту в личных сообщениях любой стикер или премиум-эмодзи — он появится здесь.</div>' +
                '<button class="fmx-btn" id="fmx-stk-bot" style="margin-top:10px;"><i class="ti ti-brand-telegram"></i>Открыть бота</button>';
        } else {
            html = '<div class="fmx-stkgrid">' + _stickers.map(function (st) {
                var sel = s && s.sticker_id === st.id;
                return '<div class="fmx-stkcell' + (sel ? ' on' : '') + '" data-sid="' + st.id + '">' + stkMedia(st, true) +
                    (st.kind === 'tgs' ? '<span class="fmx-stk-anim">аним.</span>' : '') +
                    '<button class="fmx-stkdel" data-sdel="' + st.id + '" title="Удалить из коллекции">&times;</button></div>';
            }).join('') + '</div>' +
                '<div style="font-size:10px;color:#565b73;margin-top:8px;">Пополнение — отправкой стикера боту в личных сообщениях.' + _stickers.length + '/30.</div>';
            if (s) {
                var free = (s.mode || 'slot') === 'free';
                html += '<div class="fmx-fxw" style="margin-top:12px;">' +
                    '<button class="fmx-fx' + (!free ? ' on' : '') + '" data-smode="slot">В слоте</button>' +
                    '<button class="fmx-fx' + (free ? ' on' : '') + '" data-smode="free">Свободно</button>' +
                    '<button class="fmx-fx" data-sclear="1" style="margin-left:auto;color:#ef4444;">Убрать</button></div>';
                if (free) {
                    html += '<div style="font-size:10px;color:#565b73;margin-top:8px;line-height:1.6;"><i class="ti ti-hand-move"></i> Всё управление — на оффере-превью: касание стикера — рамка; верхняя точка — поворот, угол — размер, крестик — удалить, три точки под рамкой — режим (поверх · слияние · задний фон).</div>';
                }
                if (s.kind !== 'webp') html += '<div style="font-size:10px;color:#f59e0b;margin-top:8px;"><i class="ti ti-lock"></i> Анимация в публичной ленте — при продвижении. Без него покажем стоп-кадр.</div>';
            }
        }
        box.innerHTML = html;
        var bo = el('fmx-stk-bot'); if (bo) onTap(bo, function () { openTg('ForgeMetricsBot'); });
        qsa(box, '[data-sid]').forEach(function (cell) {
            onTap(cell, function (e) {
                if (e.target.getAttribute && e.target.getAttribute('data-sdel')) return;
                if (e.target.closest && e.target.closest('[data-sdel]')) return;
                var st = _stickers.filter(function (x) { return x.id === +cell.getAttribute('data-sid'); })[0];
                if (!st) return;
                var prev = _ss.sticker || { mode: 'slot', x: 0.82, anchor: 'seam', dy: 0, scale: 1, rot: 0, dmode: 'bg' };
                _ss.sticker = { sticker_id: st.id, url: st.url, kind: st.kind, mode: prev.mode, x: prev.x, anchor: 'seam', dy: prev.dy, scale: prev.scale, rot: prev.rot, dmode: prev.dmode || 'bg' };
                _ss.stickerSel = true; /* новый стикер сразу с рамкой — редактируй на карточке */
                _haptic('light'); renderStickerPane(); renderHero();
            });
        });
        qsa(box, '[data-sdel]').forEach(function (b) {
            onTap(b, function (e) {
                e.stopPropagation();
                var id = +b.getAttribute('data-sdel');
                uiConfirm('Удалить стикер из коллекции?', function () {
                    apiRequest('/api/v1/marketplace/stickers/' + id, { method: 'DELETE' }).then(function () {
                        _stickers = _stickers.filter(function (x) { return x.id !== id; });
                        if (_ss.sticker && _ss.sticker.sticker_id === id) { _ss.sticker = null; renderHero(); }
                        renderStickerPane();
                    }).catch(function () { uiAlert('Не удалось удалить — попробуй ещё раз.'); });
                });
            });
        });
        qsa(box, '[data-smode]').forEach(function (b) {
            onTap(b, function () {
                _ss.sticker.mode = b.getAttribute('data-smode');
                _haptic('light'); renderStickerPane(); renderHero();
            });
        });
        var cl = qsa(box, '[data-sclear]')[0];
        if (cl) onTap(cl, function () { _ss.sticker = null; _haptic('light'); renderStickerPane(); renderHero(); });
        var av = el('fmx-accv-sticker'); if (av) av.textContent = s ? ((s.mode || 'slot') === 'slot' ? 'В слоте' : 'Свободно') : 'Нет';
        hydrateTgs(box);
    }
    var STAR_SLOTS = { top: 8, cover: SEAM - 39, body: SEAM + 9 };
    function starTop(pos) { return STAR_SLOTS[pos] != null ? STAR_SLOTS[pos] : STAR_SLOTS.cover; }
    function bindStarDrag(cardEl) {
        var st = el('fmx-heroStar'); if (!st || !cardEl) return;
        function start(e) {
            e.preventDefault(); e.stopPropagation();
            var moved = false;
            var mm = function (ev) {
                var t = ev.touches ? ev.touches[0] : ev;
                var r = cardEl.getBoundingClientRect();
                var k = r.width ? r.width / 350 : 1;
                var y = Math.max(STAR_SLOTS.top, Math.min((t.clientY - r.top) / k - 15, STAR_SLOTS.body));
                st.style.top = y + 'px'; moved = true;
            };
            var up = function (ev) {
                document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', up);
                document.removeEventListener('touchmove', mm); document.removeEventListener('touchend', up);
                if (!moved) return;
                var top = parseFloat(st.style.top), best = 'cover', bd = 1e9;
                for (var k in STAR_SLOTS) { var d = Math.abs(top - STAR_SLOTS[k]); if (d < bd) { bd = d; best = k; } }
                _ss.starPos = best;
                st.style.top = starTop(best) + 'px';
                _haptic('light');
            };
            document.addEventListener('mousemove', mm); document.addEventListener('mouseup', up);
            document.addEventListener('touchmove', mm, { passive: false }); document.addEventListener('touchend', up);
        }
        st.addEventListener('mousedown', start);
        st.addEventListener('touchstart', start, { passive: false });
    }
    function bindBadgeDrag(cardEl) {
        var vip = !!_ss.glowCard || (function () { var b = listingForChannel(_ss.channelId); return b ? _isTop(b) : false; })();
        qsa(cardEl, '[data-bkey]').forEach(function (bd) {
            bd.style.cursor = vip ? 'grab' : 'pointer';
            function dims() { var r = cardEl.getBoundingClientRect(); return { rect: r, k: r.width ? r.width / 350 : 1 }; }
            function _zr(e, d) { var r = e.getBoundingClientRect(); return { x1: (r.left - d.rect.left) / d.k, y1: (r.top - d.rect.top) / d.k, x2: (r.right - d.rect.left) / d.k, y2: (r.bottom - d.rect.top) / d.k }; }
            function zones() {
                /* запрет: аватар, имя канала, @ссылка, и всё от метрик до низа; домой: классический ряд */
                var d = dims(), ban = [];
                ['.fmx-avw', '.fmx-nm', '.fmx-meta'].forEach(function (sel) {
                    var e = cardEl.querySelector(sel); if (e) ban.push(_zr(e, d));
                });
                var met = cardEl.querySelector('.fmx-met');
                if (met) { var mr = _zr(met, d); ban.push({ x1: 0, y1: mr.y1 - 5, x2: 350, y2: (cardEl.offsetHeight || 500) + 10 }); }
                var row = cardEl.querySelector('.fmx-cb .fmx-badges');
                var home;
                if (row) { home = _zr(row, d); home.y1 -= 4; home.y2 += 4; home.x1 = 8; home.x2 = 342; }
                else {
                    var crow = cardEl.querySelector('.fmx-crow');
                    var cy = crow ? _zr(crow, d).y2 + 2 : 150;
                    home = { x1: 8, y1: cy, x2: 342, y2: cy + 27 };
                }
                return { ban: ban, home: home };
            }
            var ghost = null, dragging = false, sx = 0, sy = 0, zs = null, homeEl = null;
            function begin(cx, cy) {
                dragging = true; bd.style.opacity = '0.25'; zs = zones();
                cardEl.insertAdjacentHTML('beforeend', '<div class="fmx-bslot" style="left:' + zs.home.x1 + 'px;top:' + zs.home.y1 + 'px;width:' + (zs.home.x2 - zs.home.x1) + 'px;height:' + (zs.home.y2 - zs.home.y1) + 'px;"><i>вернуть в ряд</i></div>');
                homeEl = cardEl.querySelector('.fmx-bslot');
                ghost = bd.cloneNode(true);
                ghost.style.cssText = 'position:absolute;z-index:99;pointer-events:none;margin:0;opacity:0.95;';
                cardEl.appendChild(ghost);
                follow(cx, cy);
            }
            function follow(cx, cy) {
                var d = dims();
                var lx = (cx - d.rect.left) / d.k, ly = (cy - d.rect.top) / d.k;
                var w = ghost.offsetWidth, h = ghost.offsetHeight;
                var x = Math.max(4, Math.min(lx - w / 2, 346 - w));
                var y = Math.max(4, Math.min(ly - h / 2, (cardEl.offsetHeight || 400) - h - 4));
                ghost.style.left = x + 'px'; ghost.style.top = y + 'px';
                var inHome = lx >= zs.home.x1 && lx <= zs.home.x2 && ly >= zs.home.y1 - 6 && ly <= zs.home.y2 + 6;
                var bad = !inHome && zs.ban.some(function (z) { return lx >= z.x1 - 4 && lx <= z.x2 + 4 && ly >= z.y1 - 4 && ly <= z.y2 + 4; });
                ghost.style.filter = bad ? 'grayscale(1) brightness(0.7)' : '';
                if (homeEl) homeEl.classList.toggle('hot', inHome);
                return { x: x, y: y, bad: bad, home: inHome };
            }
            function finish(cx, cy) {
                var p = follow(cx, cy);
                ghost.remove(); ghost = null;
                if (homeEl) { homeEl.remove(); homeEl = null; }
                bd.style.opacity = '';
                dragging = false;
                var key = bd.getAttribute('data-bkey');
                if (p.home) {
                    if (_ss.badgeFree) { delete _ss.badgeFree[key]; if (!Object.keys(_ss.badgeFree).length) _ss.badgeFree = null; }
                    _haptic('light'); renderHero(); return;
                }
                if (p.bad) { toast('Сюда нельзя: имя, аватар и низ оффера — запретная зона'); return; }
                if (!_ss.badgeFree) _ss.badgeFree = {};
                _ss.badgeFree[key] = { x: p.x, y: p.y };
                _haptic('light');
                renderHero();
            }
            function onDown(e) {
                var t = e.touches ? e.touches[0] : e;
                sx = t.clientX; sy = t.clientY; dragging = false;
                var mm = function (ev) {
                    var p = ev.touches ? ev.touches[0] : ev;
                    if (!vip) return;
                    if (!dragging && Math.abs(p.clientX - sx) + Math.abs(p.clientY - sy) > 7) begin(p.clientX, p.clientY);
                    if (dragging) { ev.preventDefault(); follow(p.clientX, p.clientY); }
                };
                var up = function (ev) {
                    document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', up);
                    document.removeEventListener('touchmove', mm); document.removeEventListener('touchend', up);
                    if (dragging) { var p = (ev.changedTouches && ev.changedTouches[0]) || ev; finish(p.clientX, p.clientY); }
                    else if (!vip) { toast('Свободное перемещение блоков — опция продвижения на 30 дней'); }
                };
                document.addEventListener('mousemove', mm); document.addEventListener('mouseup', up);
                document.addEventListener('touchmove', mm, { passive: false }); document.addEventListener('touchend', up);
            }
            bd.addEventListener('mousedown', onDown);
            bd.addEventListener('touchstart', onDown, { passive: true });
        });
    }
    function bindStickerDrag(cardEl) {
        var grab = el('fmx-stkGrab'), vis = el('fmx-stkPrev');
        if (!grab || !vis || !cardEl) return;
        function dims() { var r = cardEl.getBoundingClientRect(); var k = r.width ? r.width / 350 : 1; return { W: 350, H: Math.max(cardEl.offsetHeight || 0, SEAM + 40), rect: r, k: k }; }
        function applyBox() {
            var d = dims(), p = stkPos(_ss.sticker, d.W);
            [vis, grab].forEach(function (e) {
                e.style.left = p.left + 'px'; e.style.top = p.top + 'px';
                e.style.width = p.size + 'px'; e.style.height = p.size + 'px';
                e.style.transform = 'rotate(' + (_ss.sticker.rot || 0) + 'deg)';
            });
        }
        function setScale(want) { _ss.sticker.scale = Math.max(0.5, Math.min(3.4, want)); applyBox(); }
        function setRot(deg) {
            /* свободный поворот 0–360, нормализуем в -180..180 (как в макете постера) */
            var r = Math.round(deg) % 360;
            if (r > 180) r -= 360; if (r < -180) r += 360;
            _ss.sticker.rot = r; applyBox();
        }
        function center() { var d = dims(); return { cx: (_ss.sticker.x || 0.82) * d.W, cy: SEAM + (_ss.sticker.dy || 0) }; }
        function move(clientX, clientY) {
            var d = dims();
            var cx = Math.max(10, Math.min((clientX - d.rect.left) / d.k, d.W - 10));
            var cy = Math.max(10, Math.min((clientY - d.rect.top) / d.k, d.H - 10));
            _ss.sticker.x = cx / d.W; _ss.sticker.dy = Math.round(cy - SEAM); _ss.sticker.anchor = 'seam';
            applyBox();
        }
        function start(e) {
            if (e.target && e.target.classList && e.target.classList.contains('fmx-stkh')) return;
            e.preventDefault();
            if (e.touches && e.touches.length === 2) {
                var t0 = e.touches;
                var d0 = Math.hypot(t0[0].clientX - t0[1].clientX, t0[0].clientY - t0[1].clientY);
                var a0 = Math.atan2(t0[1].clientY - t0[0].clientY, t0[1].clientX - t0[0].clientX) * 180 / Math.PI;
                var s0 = _ss.sticker.scale || 1, r0 = _ss.sticker.rot || 0;
                if (d0 < 8) return;
                var pm = function (ev) {
                    if (ev.touches.length < 2) return;
                    ev.preventDefault();
                    var t = ev.touches;
                    var d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
                    var a = Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX) * 180 / Math.PI;
                    setScale(s0 * d / d0); setRot(r0 + (a - a0));
                };
                var pu = function () {
                    document.removeEventListener('touchmove', pm); document.removeEventListener('touchend', pu);
                    _haptic('light');
                };
                document.addEventListener('touchmove', pm, { passive: false });
                document.addEventListener('touchend', pu);
                return;
            }
            var t0p = e.touches ? e.touches[0] : e;
            var sx = t0p.clientX, sy = t0p.clientY, movedPx = false;
            var mm = function (ev) {
                var t = ev.touches ? ev.touches[0] : ev;
                if (!movedPx && Math.hypot(t.clientX - sx, t.clientY - sy) > 6) movedPx = true;
                if (movedPx) move(t.clientX, t.clientY);
            };
            var up = function () {
                document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', up);
                document.removeEventListener('touchmove', mm); document.removeEventListener('touchend', up);
                if (!movedPx) {
                    /* тап без перетаскивания = показать/спрятать рамку с ручками (как в макете постера) */
                    var selNow = _ss.stickerSel !== false;
                    _ss.stickerSel = !selNow;
                    grab.classList.toggle('sel', !selNow);
                }
                _haptic('light');
            };
            document.addEventListener('mousemove', mm); document.addEventListener('mouseup', up);
            document.addEventListener('touchmove', mm, { passive: false }); document.addEventListener('touchend', up);
        }
        function bindHandle(sel, onMove) {
            var h = grab.querySelector(sel); if (!h) return;
            function hs(e) {
                e.preventDefault(); e.stopPropagation();
                var mm = function (ev) {
                    var t = ev.touches ? ev.touches[0] : ev;
                    var d = dims(), c = center();
                    onMove((t.clientX - d.rect.left) / d.k - c.cx, (t.clientY - d.rect.top) / d.k - c.cy, d);
                };
                var mu = function () {
                    document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu);
                    document.removeEventListener('touchmove', mm); document.removeEventListener('touchend', mu);
                    _haptic('light');
                };
                document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
                document.addEventListener('touchmove', mm, { passive: false }); document.addEventListener('touchend', mu);
            }
            h.addEventListener('mousedown', hs);
            h.addEventListener('touchstart', hs, { passive: false });
        }
        bindHandle('.fmx-stkh.rsz', function (dx, dy, d) {
            var dist = Math.hypot(dx, dy);
            var base = 64 * 0.72;
            if (base > 4) setScale(dist / base);
        });
        bindHandle('.fmx-stkh.rot', function (dx, dy) {
            setRot(Math.atan2(dy, dx) * 180 / Math.PI + 90);
        });
        var del = grab.querySelector('.fmx-stkh.del');
        if (del) {
            var ds = function (e) {
                e.preventDefault(); e.stopPropagation();
                _ss.sticker = null; _haptic('light');
                renderStickerPane(); renderHero();
            };
            del.addEventListener('mousedown', ds);
            del.addEventListener('touchstart', ds, { passive: false });
        }
        /* три точки под рамкой — режим отображения, с всплывающей подписью (как в макете постера) */
        var _mlT = null;
        function showModeLabel(name) {
            var lbl = cardEl.querySelector('.fmx-stkModeLabel');
            if (!lbl) { cardEl.insertAdjacentHTML('beforeend', '<div class="fmx-stkModeLabel"></div>'); lbl = cardEl.querySelector('.fmx-stkModeLabel'); }
            lbl.textContent = name;
            lbl.classList.add('show');
            clearTimeout(_mlT);
            _mlT = setTimeout(function () { lbl.classList.remove('show'); }, 1200);
        }
        qsa(grab, '[data-stkmd]').forEach(function (b) {
            var hs = function (e) {
                e.preventDefault(); e.stopPropagation();
                var v = b.getAttribute('data-stkmd');
                _ss.sticker.dmode = v;
                qsa(grab, '.fmx-stkmd').forEach(function (x) { x.classList.toggle('on', x === b); });
                vis.className = 'fmx-stk' + (v === 'top' ? ' m-top' : (v === 'blend' ? ' m-blend' : ''));
                showModeLabel(b.getAttribute('data-stkmdn'));
                _haptic('light');
            };
            b.addEventListener('mousedown', hs);
            b.addEventListener('touchstart', hs, { passive: false });
        });
        grab.addEventListener('mousedown', start);
        grab.addEventListener('touchstart', start, { passive: false });
    }

    function _previewListing() {
        /* Синтез листинга из состояния конструктора: превью рендерится ТЕМ ЖЕ fullCard, что и биржа. */
        var c = curChannel() || {};
        var base = listingForChannel(_ss.channelId);
        var pl = {};
        if (base) for (var k in base) pl[k] = base[k];
        pl.username = c.username || pl.username || 'channel';
        pl.title = ((_ss._title != null ? _ss._title : (c.title || pl.title)) || 'Твой канал');
        if (c.subscribers != null) pl.subscribers = c.subscribers;
        if (c.avg_views != null) pl.avg_views = c.avg_views;
        if (c.er_percent != null) pl.er = c.er_percent;
        if (c.health_class) pl.health_class = c.health_class;
        if (c.niche) pl.niche = c.niche;
        if (c.audience) pl.audience = c.audience;
        pl.accent_color = _ss.color;
        pl._preview = true;
        pl.is_top = !!_ss.glowCard || (base ? _isTop(base) : false); pl.is_vip = false; pl.top_until = null; pl.boost_until = null;
        var act = (_sfmts || []).filter(function (x) { return x.on; });
        pl.formats = act.map(function (x) { return { format: x.k || x.format || '', label: x.n || x.label || x.k || '', price: x.p }; });
        var cm = _ss._media && _ss._media.cover;
        if (_ss.covType !== 'grad' && cm && cm.url) { pl.cover_type = cm.kind === 'video' ? 'video' : 'img'; pl.cover_url = cm.url; }
        else { pl.cover_type = 'grad'; pl.cover_url = null; }
        pl.cover_gradient = _ss.coverGrad || COVERS[_ss.cover];
        pl.avatar_type = _ss.avatar;
        var am = _ss._media && _ss._media.avatar;
        if (_ss.avatar === 'img' && am && am.url) pl.avatar_url = am.url;
        else if (_ss.avatar === 'tg') pl.avatar_url = c.avatar_url || null;
        else pl.avatar_url = null;
        pl.avatar_emoji = _ss.avEmoji;
        pl.effects_json = { move: _ss.move, over: _ss.over, glow: _ss.glow, orbit: _ss.orbit, atomColor: _ss.atomColor, glowCard: _ss.glowCard, glass: _ss.glass, starPos: _ss.starPos || 'cover', topTag: _ss.topTag || 'on', badgeFree: _ss.badgeFree || null };
        pl.emoji_attachments_json = _ss.att || {};
        pl.custom_text = _ss._desc || '';
        pl.slots_note = _ss._slots || '';
        pl.sticker_json = null;  /* стикер — редакторским слоем поверх */
        if (_ss.showDeals === false) pl.show_deals = false;
        return pl;
    }
    function renderHero() {
        var hero = el('fmx-hero'); if (!hero) return;
        var pl = _previewListing();
        hero.innerHTML = fullCard(pl);
        var card = hero.querySelector('.fmx-card'); if (!card) return;
        scaleCards(hero);
        /* --- редакторские слои поверх боевой карточки --- */
        if (_ss.sticker) {
            card.insertAdjacentHTML('beforeend', stkOverlay(_ss.sticker, 350, true, true));
            bindStickerDrag(card);
        }
        var st = card.querySelector('.fmx-star');
        if (st) {
            st.removeAttribute('data-bm');
            st.id = 'fmx-heroStar';
            st.title = 'Потяни вверх/вниз';
            bindStarDrag(card);
        }
        // .fmx-avw первым — тап по аватару ведёт в «Аватар», а не в «Текст» (он лежит внутри .fmx-crow).
        // бейджи убраны из зон: тап по ним открывал «Эффекты аватара» — нелогично и путало.
        [['.fmx-avw', 'avatar'], ['.fmx-cov', 'cover'], ['.fmx-crow', 'text'], ['.fmx-desc', 'text'], ['.fmx-met', 'price']].forEach(function (z) {
            qsa(card, z[0]).forEach(function (n) {
                n.style.cursor = 'pointer';
                n.addEventListener('click', function (e) {
                    if (e.target.closest && (e.target.closest('.fmx-stkGrab') || e.target.closest('.fmx-star'))) return;
                    e.stopPropagation(); _haptic('light'); openAcc(z[1], true);
                });
            });
        });
        qsa(card, '[data-act]').forEach(function (b) { b.removeAttribute('data-act'); });
        bindBadgeDrag(card);
        var hl = el('fmx-hlist');
        if (hl) {
            hl.innerHTML = '<div style="font-size:10px;font-weight:700;color:#565b73;letter-spacing:0.6px;margin:0 0 7px;">ВИД В СПИСКЕ</div>' + zw(listItem(pl));
            scaleCards(hl);
        }
        hydrateTgs(hero);
        renderMini(_ss.color, pl.title, _priceFrom(pl));
    }
    /* ===================== промо-постер: редактор = макет poster_mockup.html 1:1 ===================== */
    /* Открываем сам макет (byte-in-byte копия в poster_render.html) в полноэкранном iframe.
       Реальные данные и состояние — через слой-драйвер poster_glue.js; макет не трогаем. */
    var PS_GLUE_V = '20260710r';
    function _psInjectStyle() {
        if (el('fmx-ps-style')) return;
        var s = document.createElement('style'); s.id = 'fmx-ps-style';
        s.textContent = '.fmx-psFull{position:fixed;inset:0;z-index:100005;background:#05070e;display:flex;flex-direction:column;}' +
            '.fmx-psTop{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:0.5px solid rgba(255,255,255,0.08);flex-shrink:0;}' +
            '.fmx-psTop .t{font-size:15px;font-weight:800;color:#e8e8ed;display:flex;align-items:center;gap:7px;}' +
            '.fmx-psTop .t i{color:#5DCAA5;}' +
            '.fmx-psX{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.14);color:#c9cede;font-size:17px;cursor:pointer;flex-shrink:0;padding:0;line-height:1;}' +
            '.fmx-psX:active{background:rgba(255,255,255,0.14);}' +
            '.fmx-psScroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.28) transparent;scrollbar-gutter:stable;}' +
            '.fmx-psScroll::-webkit-scrollbar{width:9px;}' +
            '.fmx-psScroll::-webkit-scrollbar-track{background:transparent;}' +
            '.fmx-psScroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.28);border-radius:6px;border:2px solid transparent;background-clip:padding-box;}' +
            '.fmx-psScroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.42);background-clip:padding-box;}' +
            '.fmx-psBottom{padding:10px 14px calc(10px + env(safe-area-inset-bottom));border-top:0.5px solid rgba(255,255,255,0.08);flex-shrink:0;background:#05070e;}' +
            '#fmx-psFrame{border:0;display:block;background:#05070e;}' +
            '@keyframes fmxSpin{to{transform:rotate(360deg);}}' +
            /* модалка выбора формата отправки (живой постер) */
            '#fmx-fmtpick{position:fixed;inset:0;z-index:100020;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.55);}' +
            '.fmx-fmtcard{width:100%;max-width:440px;margin:0 8px calc(8px + env(safe-area-inset-bottom));background:#0d1120;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:14px;box-shadow:0 -12px 44px rgba(0,0,0,0.55);animation:fmxUp .2s ease-out;}' +
            '.fmx-fmttitle{font-size:15px;font-weight:700;color:#e8e8ed;text-align:center;padding:6px 0 12px;}' +
            '.fmx-fmtrow{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#141828;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:12px 14px;margin-bottom:8px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent;}' +
            '.fmx-fmtrow:active{background:#1a2030;}' +
            '.fmx-fmtrow .ic{width:38px;height:38px;flex-shrink:0;border-radius:11px;background:rgba(93,202,165,0.15);color:#5DCAA5;display:flex;align-items:center;justify-content:center;font-size:19px;}' +
            '.fmx-fmtrow .tx{display:flex;flex-direction:column;gap:2px;min-width:0;}' +
            '.fmx-fmtrow .tx b{font-size:13.5px;color:#e8e8ed;font-weight:600;}' +
            '.fmx-fmtrow .tx i{font-size:11.5px;color:#8990a8;font-style:normal;line-height:1.35;}' +
            '.fmx-fmtcancel{width:100%;background:transparent;border:0;color:#8990a8;font-size:13px;font-weight:600;padding:10px;cursor:pointer;font-family:inherit;margin-top:2px;-webkit-tap-highlight-color:transparent;}' +
            '.fmx-fmtpro{display:inline-block;margin-left:6px;font-size:9.5px;font-weight:800;letter-spacing:0.5px;color:#f5bf4f;background:rgba(245,191,79,0.16);border:1px solid rgba(245,191,79,0.4);border-radius:6px;padding:1px 5px;vertical-align:middle;}' +
            '.fmx-fmtrow.locked{opacity:0.6;}' +
            /* кружок прогресса генерации живого постера */
            '.fmx-ring{display:inline-block;width:20px;height:20px;vertical-align:middle;margin-right:8px;}' +
            '.fmx-ring svg{width:100%;height:100%;display:block;}' +
            '.fmx-ring .fg{transition:stroke-dashoffset .45s linear;}' +
            '@keyframes fmxUp{from{transform:translateY(24px);opacity:0;}to{transform:translateY(0);opacity:1;}}';
        document.head.appendChild(s);
    }
    /* модалка выбора формата: живой MP4 / статичный PNG. Показывается только когда есть что анимировать.
       MP4 — на тарифах PRO/PRO+ (liveOk); PNG доступен всем. */
    function _posterPickFormat(liveOk) {
        return new Promise(function (resolve) {
            var prev = el('fmx-fmtpick'); if (prev) prev.remove();
            var pro = liveOk ? '' : '<span class="fmx-fmtpro">PRO</span>';
            var lk = liveOk ? '' : ' locked';
            var m = document.createElement('div'); m.id = 'fmx-fmtpick';
            m.innerHTML = '<div class="fmx-fmtcard">' +
                '<div class="fmx-fmttitle">Как прислать постер?</div>' +
                '<button class="fmx-fmtrow' + lk + '" data-f="mp4"><span class="ic"><i class="ti ti-player-play"></i></span><span class="tx"><b>Живой постер (MP4)' + pro + '</b><i>Анимация играет прямо в чате · пришлю через минуту</i></span></button>' +
                '<button class="fmx-fmtrow" data-f="png"><span class="ic"><i class="ti ti-photo"></i></span><span class="tx"><b>Картинка (PNG)</b><i>Статичный постер · мгновенно · на всех тарифах</i></span></button>' +
                '<button class="fmx-fmtcancel" data-f="">Отмена</button></div>';
            document.body.appendChild(m);
            function done(f) { m.remove(); resolve(f || null); }
            m.addEventListener('click', function (e) {
                if (e.target === m) return done(null);
                var b = e.target.closest('[data-f]'); if (!b) return;
                var f = b.getAttribute('data-f');
                if (f === 'mp4' && !liveOk) {  // не премиум — подсказываем, модалку не закрываем
                    try { _haptic('warning'); } catch (e2) {}
                    toast('Живой постер (MP4) — на тарифах PRO и PRO+. Картинка (PNG) доступна всем');
                    return;
                }
                done(f);
            });
        });
    }
    function openPosterStudio() {
        var base = listingForChannel(_ss.channelId);
        if (!base || !base.id) { toast('Сначала сохрани оффер — постер строится по нему'); return; }
        var chan = channelById(_ss.channelId) || {};
        var realAvatar = chan.avatar_url || null;
        /* ниша — как на карточке Площадки: из листинга, иначе из канала */
        var realNiche = base.niche || chan.niche || '';
        var minPrice = base.min_price || (function () { var ps = (base.formats || []).map(function (f) { return f.price; }).filter(Boolean); return ps.length ? Math.min.apply(null, ps) : 0; })();
        var saved = base.poster_json || {};
        /* дефолт: при первом заходе показываем ВСЕ блоки — пользователь потом сам решит, что убрать */
        var defaultState = {
            bg: 'blur', niche: true, chart: true,
            metrics: { subs: true, reach: true, er: true, cpm: true, err: true, grow: true, freq: true, mv: true },
            price: { on: true, val: minPrice || 0 }, qr: 'both', hook: '',
            order: ['hook', 'chart', 'mgrid'], colors: { cells: {} }, stickers: []
        };
        var hasSaved = saved && Object.keys(saved).length > 0;
        var oldm = el('fmx-psBg'); if (oldm) { if (oldm.__fmxCleanup) oldm.__fmxCleanup(); oldm.remove(); }
        _psInjectStyle();
        var apiBase = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';
        var bg = document.createElement('div');
        bg.id = 'fmx-psBg'; bg.className = 'fmx-psFull';
        bg.innerHTML =
            '<div class="fmx-psTop"><div class="t"><i class="ti ti-photo-star"></i> Промо-постер</div>' +
            '<button class="fmx-psX" id="fmx-ps-x" aria-label="Закрыть"><i class="ti ti-x"></i></button></div>' +
            '<div class="fmx-psScroll"><div id="fmx-psLoad" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 0;color:#8990a8;"><i class="ti ti-loader-2" style="font-size:26px;animation:fmxSpin 0.9s linear infinite;"></i><div style="font-size:12px;margin-top:10px;">Открываю редактор…</div></div>' +
            '<div id="fmx-psWrap" style="width:100%;max-width:560px;margin:0 auto;overflow:hidden;">' +
            '<iframe id="fmx-psFrame" scrolling="no" src="poster_render.html?v=' + PS_GLUE_V + '" style="opacity:0;transition:opacity 0.25s;overflow:hidden;"></iframe></div></div>' +
            '<div class="fmx-psBottom"><button class="fmx-save" id="fmx-ps-send" style="margin:0;"><i class="ti ti-send"></i> Прислать постер в чат с ботом</button></div>';
        document.body.appendChild(bg);
        var frame = el('fmx-psFrame'), wrap = el('fmx-psWrap');
        var LW = 560, glueReady = false, chartDone = false, extra = {};

        function fitFrame() {
            try {
                var idoc = frame.contentDocument; if (!idoc || !idoc.body) return;
                var k = Math.min(1, (wrap.clientWidth || 360) / LW);
                // контролы панели — в нативном размере (компенсируем масштаб iframe) ДО замера высоты
                try { if (frame.contentWindow.__fmxPosterPanelScale) frame.contentWindow.__fmxPosterPanelScale(k); } catch (e) {}
                var lh = Math.max(idoc.body.scrollHeight, 700);
                frame.style.width = LW + 'px'; frame.style.height = lh + 'px';
                frame.style.transform = 'scale(' + k + ')'; frame.style.transformOrigin = 'top left';
                wrap.style.height = Math.round(lh * k) + 'px';
            } catch (e) {}
        }
        function posterData() {
            return {
                id: base.id, username: base.username, title: base.title, niche: realNiche || extra.niche || '',
                avatar_url: realAvatar, subscribers: base.subscribers, avg_views: base.avg_views,
                er: base.er, min_price: minPrice,
                grow: extra.grow, freq: extra.freq, mv: extra.mv, chart: extra.chart
            };
        }
        /* загрузчик своего фона постера на сервер — отдаём его в iframe, glue вызовет при выборе файла */
        function uploadPosterBg(file) {
            // проверяем размер СРАЗУ, до отправки: иначе большой файл уходит на сервер, соединение
            // рвётся на лимите и fetch падает невнятным «Failed to fetch». Так — мгновенно и понятно.
            if (file && file.size > MEDIA_MAX_BYTES) {
                return Promise.reject(new Error('Файл ' + Math.round(file.size / 1048576) + ' МБ — это больше 64 МБ'));
            }
            var fd = new FormData(); fd.append('file', file); fd.append('target', 'posterbg');
            var headers = {};
            try { if (typeof tg !== 'undefined' && tg && tg.initData) headers['X-Telegram-Init-Data'] = tg.initData; } catch (e) {}
            return fetch(apiBase + '/api/v1/marketplace/upload', { method: 'POST', headers: headers, body: fd })
                .then(function (r) { if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.detail || ('код ' + r.status)); }); return r.json(); });
        }
        var stickersDone = false, revealed = false;
        function reveal() {
            if (revealed) return; revealed = true;
            var ld = el('fmx-psLoad'); if (ld) ld.style.display = 'none';
            frame.style.opacity = '1';
        }
        function maybeInit() {
            if (!glueReady || !chartDone || !stickersDone) return;
            var win = frame.contentWindow;
            /* раздельные try: сбой одного шага (например, старого сохранённого состояния)
               не должен отменять остальные — иначе редактор остаётся без адаптива/переименования */
            try { win.__fmxPosterInit(posterData(), apiBase); } catch (e) {}
            try { win.__fmxPosterUploader = uploadPosterBg; } catch (e) {}
            try { win.__fmxPosterNotify = function (m) { toast(m, true); }; } catch (e) {}   // заметный тост из редактора
            /* есть сохранённое — восстанавливаем как было (вкл. стикеры); нет — показываем всё */
            try { if (win.__fmxPosterApply) win.__fmxPosterApply(hasSaved ? saved : defaultState); } catch (e) {}
            try { if (win.__fmxPosterEditorMode) win.__fmxPosterEditorMode({ stickers: _stickers || [], defaultState: defaultState }); } catch (e) {}
            fitFrame();
            requestAnimationFrame(function () { fitFrame(); reveal(); });
            setTimeout(fitFrame, 300); setTimeout(fitFrame, 900);
        }
        frame.addEventListener('load', function () {
            try {
                var idoc = frame.contentDocument;
                var g = idoc.createElement('script'); g.src = 'poster_glue.js?v=' + PS_GLUE_V;
                g.onload = function () { glueReady = true; maybeInit(); };
                g.onerror = function () { toast('Не удалось загрузить редактор постера'); };
                idoc.head.appendChild(g);
                // перерисовать при смене высоты панели (пользователь листает/меняет)
                idoc.addEventListener('click', function () { setTimeout(fitFrame, 60); });
            } catch (e) { toast('Редактор недоступен'); }
        });
        apiGet('/api/v1/marketplace/poster/chart?listing_id=' + base.id).then(function (r) {
            if (r && r.ok) extra = { chart: r.chart, grow: r.grow, freq: r.freq, mv: r.mv, niche: r.niche, live_ok: r.live_ok };
            chartDone = true; maybeInit();
        }).catch(function () { chartDone = true; maybeInit(); });
        // стикер-пак пользователя (до 30 из бота) — грузим для редактора
        if (_stickers) { stickersDone = true; }
        else apiGet('/api/v1/marketplace/stickers').then(function (r) { _stickers = (r && r.stickers) ? r.stickers : []; stickersDone = true; maybeInit(); }).catch(function () { _stickers = _stickers || []; stickersDone = true; maybeInit(); });

        function onResize() { fitFrame(); }
        window.addEventListener('resize', onResize);
        bg.__fmxCleanup = function () { window.removeEventListener('resize', onResize); clearInterval(bg.__fmxProgIv); clearTimeout(bg.__fmxProgPoll); clearTimeout(bg.__fmxProgTo); clearTimeout(bg.__fmxProgTo2); clearTimeout(bg.__fmxProgDone); clearTimeout(bg.__fmxSendCd); };
        function close() {
            var win = frame.contentWindow;
            /* мгновенно убираем визуально; DOM держим живым, пока не дождёмся загрузки своего фона */
            bg.style.pointerEvents = 'none'; bg.style.opacity = '0';
            var pend = null;
            try { pend = (win && win.__fmxPosterBgPending) ? win.__fmxPosterBgPending() : null; } catch (e) {}
            var done = false;
            function finish() {
                if (done) return; done = true;
                /* сохраняем состояние при закрытии — правки, позиции стикеров, свой фон и пан/зум запоминаются */
                try {
                    var state = (win && win.__fmxPosterState) ? win.__fmxPosterState() : null;
                    if (state) {
                        if (_myListings) for (var i = 0; i < _myListings.length; i++) if (_myListings[i].id === base.id) _myListings[i].poster_json = state;
                        apiPost('/api/v1/marketplace/poster', { listing_id: base.id, poster: state, save_only: true }).catch(function () {});
                    }
                } catch (e) {}
                if (bg.__fmxCleanup) bg.__fmxCleanup(); bg.remove();
            }
            if (pend && pend.then) { pend.then(finish, finish); setTimeout(finish, 15000); }
            else finish();
        }
        el('fmx-ps-x').addEventListener('click', close);
        var SEND_LABEL = '<i class="ti ti-send"></i> Прислать постер в чат с ботом';
        function sendBtn() { return el('fmx-ps-send'); }
        function restoreSend() { clearTimeout(bg.__fmxSendCd); var b = sendBtn(); if (b) { b.disabled = false; b.innerHTML = SEND_LABEL; } }
        /* сервер просит подождать — показываем обратный отсчёт прямо на кнопке,
           иначе нажатие выглядит как «ничего не произошло» */
        function waitSend(sec) {
            var b = sendBtn();
            if (!b) return;
            b.disabled = true;
            (function tick() {
                if (sec <= 0) { restoreSend(); return; }
                b.innerHTML = '<i class="ti ti-clock"></i> Можно через ' + sec + ' с';
                sec--;
                bg.__fmxSendCd = setTimeout(tick, 1000);
            })();
        }
        window.__fmxPosterJob = window.__fmxPosterJob || {};

        /* кружок прогресса генерации живого постера: плавная анимация по времени + опрос сервера «готово?».
           Переживает выход-заход в студию (job хранится в window.__fmxPosterJob[listingId]). */
        function _startPosterProgress(job, fmt) {
            var b = sendBtn(); if (!b || !job) return;
            var C = 97.4, pct = 0, done = false, t0 = Date.now();
            window.__fmxPosterJob[base.id] = job;
            b.disabled = true;
            b.innerHTML = '<span class="fmx-ring"><svg viewBox="0 0 36 36">' +
                '<circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(0,0,0,0.28)" stroke-width="4"></circle>' +
                '<circle class="fg" id="fmx-ring-fg" cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" transform="rotate(-90 18 18)"></circle>' +
                '</svg></span> Готовлю живой постер… <b id="fmx-pct">0%</b>';
            function setPct(p) {
                p = Math.max(pct, Math.min(100, p)); pct = p;
                var fg = el('fmx-ring-fg'); if (fg) fg.style.strokeDashoffset = (C * (1 - p / 100)).toFixed(1);
                var pc = el('fmx-pct'); if (pc) pc.textContent = Math.round(p) + '%';
            }
            function stop() { clearInterval(bg.__fmxProgIv); clearTimeout(bg.__fmxProgPoll); clearTimeout(bg.__fmxProgTo); clearTimeout(bg.__fmxProgTo2); clearTimeout(bg.__fmxProgDone); }
            setPct(2);
            clearInterval(bg.__fmxProgIv);
            // прогрев 2->10% за первые 10с (пока поднимается браузер), дальше ведёт РЕАЛЬНЫЙ прогресс с сервера
            bg.__fmxProgIv = setInterval(function () {
                if (done) return;
                var warm = 2 + Math.min(1, (Date.now() - t0) / 10000) * 8;
                if (warm > pct) setPct(warm);
            }, 700);
            function poll() {
                if (done) return;
                apiGet('/api/v1/marketplace/poster/status?job=' + job).then(function (r) {
                    if (done) return;
                    if (r && r.done) {
                        done = true; clearInterval(bg.__fmxProgIv); clearTimeout(bg.__fmxProgPoll); clearTimeout(bg.__fmxProgTo2);
                        setPct(100); _haptic('success');   // сначала кольцо дозаполняется до 100%
                        delete window.__fmxPosterJob[base.id];
                        var msg = r.sent ? '<i class="ti ti-circle-check"></i> Готово — постер в чате' : '<i class="ti ti-photo"></i> Прислал картинкой';
                        bg.__fmxProgDone = setTimeout(function () { var b2 = sendBtn(); if (b2) b2.innerHTML = msg; }, 650);
                        toast(r.sent ? 'Живой постер в чате с ботом, можно переслать' : 'Живой постер не удалось создать — отправлен изображением');
                        bg.__fmxProgTo = setTimeout(restoreSend, 5300);
                    } else {
                        if (r && r.pct) setPct(r.pct);   // РЕАЛЬНЫЙ прогресс: сервер шлёт «снято N из M кадров»
                        bg.__fmxProgPoll = setTimeout(poll, 1200);
                    }
                }).catch(function () { bg.__fmxProgPoll = setTimeout(poll, 3000); });
            }
            bg.__fmxProgPoll = setTimeout(poll, 1500);
            bg.__fmxProgTo2 = setTimeout(function () { if (!done) { done = true; stop(); delete window.__fmxPosterJob[base.id]; restoreSend(); } }, 240000);  // страховка
        }

        el('fmx-ps-send').addEventListener('click', function () {
            var btn = this, win = frame.contentWindow;
            function send(fmt) {
                var state = (win && win.__fmxPosterState) ? win.__fmxPosterState() : null;
                if (!state) { restoreSend(); toast('Редактор ещё загружается — секунду'); return; }
                var live = (fmt === 'mp4' || fmt === 'gif');
                btn.disabled = true;
                btn.innerHTML = live ? '<i class="ti ti-loader-2"></i> Отправляю…' : '<i class="ti ti-loader-2"></i> Рисую постер… ~10 сек';
                apiPost('/api/v1/marketplace/poster', { listing_id: base.id, poster: state, format: fmt || 'png' }).then(function (r) {
                    if (r && r.ok) {
                        _haptic('success');
                        if (r.queued && r.job) {
                            _startPosterProgress(r.job, fmt);   // показываем кружок прогресса
                        } else if (r.queued) {
                            btn.disabled = true; btn.innerHTML = '<i class="ti ti-clock"></i> Идёт обработка…';
                        } else {
                            toast('Постер в чате с ботом, можно переслать'); restoreSend();
                        }
                        if (_myListings) for (var i = 0; i < _myListings.length; i++) if (_myListings[i].id === base.id) _myListings[i].poster_json = r.poster || state;
                    } else {
                        var msg = (r && r.error) || 'Не удалось';
                        var wait = /через\s+(\d+)\s*с/.exec(msg);   // «Повтори через 12 с.»
                        if (wait) waitSend(parseInt(wait[1], 10)); else restoreSend();
                        toast(msg, true);
                    }
                }).catch(function () { restoreSend(); toast('Сервер не ответил', true); });
            }
            function proceed() {
                var state = (win && win.__fmxPosterState) ? win.__fmxPosterState() : null;
                if (!state) { restoreSend(); toast('Редактор ещё загружается — секунду'); return; }
                /* свой фон выбран, но на сервер не загрузился (обычно слишком большой): не отправляем
                   молча постер с дефолтным фоном — честно объясняем, почему в конструкторе он есть, а в постер не попал */
                var bgErr = null;
                try { bgErr = win.__fmxPosterBgError ? win.__fmxPosterBgError() : null; } catch (e) {}
                if (bgErr) {
                    restoreSend();
                    var big = /больше|\b413\b|превыш|64 МБ|fetch/i.test(bgErr);
                    toast(big ? 'Фон слишком большой: до 64 МБ. Для видео нужен короткий ролик — в постер идёт первый отрезок 20 сек' : ('Фон не загрузился: ' + bgErr), true);
                    return;
                }
                /* MP4/GIF предлагаем только когда есть что анимировать (видео-фон или анимо-стикер) */
                var hasMotion = !!(state.bg && typeof state.bg === 'object' && state.bg.kind === 'video')
                    || (state.stickers || []).some(function (s) { return s && (s.kind === 'tgs' || s.kind === 'webm'); });
                if (!hasMotion) { send('png'); return; }
                btn.disabled = true;  // пока открыта модалка — кнопка занята (без повторных открытий)
                _posterPickFormat(extra && extra.live_ok).then(function (fmt) { if (fmt) send(fmt); else restoreSend(); });
            }
            /* если свой фон ещё грузится — дождёмся, чтобы постер ушёл с картинкой, а не с blur */
            var pend = null;
            try { pend = (win && win.__fmxPosterBgPending) ? win.__fmxPosterBgPending() : null; } catch (e) {}
            if (pend && pend.then) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Загружаю фон…'; pend.then(proceed, proceed); }
            else proceed();
        });
        /* при заходе: если ролик ещё готовится — возобновляем кружок прогресса */
        if (window.__fmxPosterJob[base.id]) _startPosterProgress(window.__fmxPosterJob[base.id], null);
    }
    function uploadPending() {
        var chain = Promise.resolve();
        ['cover', 'avatar', 'cardbg'].forEach(function (t) {
            chain = chain.then(function () {
                var m = _ss._media && _ss._media[t];
                if (!m || !m.file) return;
                if (m.file.size > MEDIA_MAX_BYTES) {
                    throw new Error('Файл «' + t + '» ' + Math.round(m.file.size / 1048576) + ' МБ — больше 64 МБ. Выбери файл меньше');
                }
                var fd = new FormData();
                fd.append('file', m.file);
                fd.append('target', t);
                var base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';
                var headers = {};
                try { if (typeof tg !== 'undefined' && tg && tg.initData) headers['X-Telegram-Init-Data'] = tg.initData; } catch (e) {}
                return fetch(base + '/api/v1/marketplace/upload', { method: 'POST', headers: headers, body: fd })
                    .then(function (r) { if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.detail || ('код ' + r.status)); }); return r.json(); })
                    .then(function (j) {
                        if (!j || !j.url) throw new Error('сервер не вернул адрес файла');
                        if (typeof _ss.att[t] !== 'object' || !_ss.att[t]) _ss.att[t] = { x: 50, y: 50, s: 1 };
                        _ss.att[t].url = j.url;
                        _ss.att[t].kind = j.kind || m.kind;
                        delete m.file;
                    });
            });
        });
        return chain;
    }
    function saveStudio() {
        var btn = el('fmx-save'); btn.disabled = true;
        var hasFiles = ['cover', 'avatar', 'cardbg'].some(function (t) { return _ss._media && _ss._media[t] && _ss._media[t].file; });
        if (hasFiles) btn.innerHTML = '<i class="ti ti-loader-2"></i> Загружаю файлы…';
        uploadPending().then(function () { _saveListing(btn); }).catch(function (e) {
            _haptic('error'); btn.disabled = false;
            btn.innerHTML = '<i class="ti ti-rocket"></i> ' + (_ss.listingId ? 'Сохранить оффер' : 'Опубликовать на Площадке');
            uiAlert('Не удалось загрузить файл: ' + (e && e.message ? e.message : 'ошибка'));
        });
    }
    function _saveListing(btn) {
        var ti = el('fmx-title'), de = el('fmx-desc'), ta = el('fmx-tags'), sl = el('fmx-slots');
        var body = {
            formats: _sfmts.filter(function (f) { return f.on; }).map(function (f) { return { format: f.format, price: f.p, unit: 'RUB' }; }),
            slots_note: (sl ? sl.value : _ss._slots) || null,
            custom_text: (de ? de.value : _ss._desc) || null,
            accent_color: _ss.color,
            cover_type: _ss.covType,
            cover_gradient: _ss.covType === 'grad' ? (_ss.coverGrad || COVERS[_ss.cover]) : null,
            cover_url: (_ss.covType !== 'grad' && typeof _ss.att.cover === 'object' && _ss.att.cover && _ss.att.cover.url) ? _ss.att.cover.url : null,
            avatar_url: (_ss.avatar === 'img' && typeof _ss.att.avatar === 'object' && _ss.att.avatar && _ss.att.avatar.url) ? _ss.att.avatar.url : null,
            avatar_type: _ss.avatar,
            avatar_emoji: _ss.avatar === 'emoji' ? _ss.avEmoji : null,
            sticker_json: (function () { if (!_ss.sticker) return null; var hc = el('fmx-hero') && el('fmx-hero').querySelector('.fmx-card'); if (hc && hc.offsetHeight) _ss.sticker.h0 = hc.offsetHeight; return _ss.sticker; })(),
            show_deals: _ss.showDeals !== false,
            title_style: _ss.font,
            tags_json: ((ta ? ta.value : _ss._tags) || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
            effects_json: { move: _ss.move, over: _ss.over, glow: _ss.glow, orbit: _ss.orbit, atomColor: _ss.atomColor, glowCard: _ss.glowCard, glass: _ss.glass, starPos: _ss.starPos || 'cover', topTag: _ss.topTag || 'on', badgeFree: _ss.badgeFree || null, stickerRot: _ss.sticker ? (_ss.sticker.rot || 0) : null, stickerMode: _ss.sticker ? (_ss.sticker.dmode || 'bg') : null },
            emoji_attachments_json: _ss.att
        };
        var wasCreate = !_ss.listingId, p;
        if (_ss.listingId) p = apiPatch('/api/v1/marketplace/listings/' + _ss.listingId, body);
        else { if (!_ss.channelId) { btn.disabled = false; uiAlert('Сначала выбери канал.'); return; } body.channel_id = _ss.channelId; p = apiPost('/api/v1/marketplace/listings', body); }
        p.then(function (r) {
            if (r && r.ok === false) { _haptic('error'); btn.disabled = false; btn.innerHTML = '<i class="ti ti-rocket"></i> ' + (_ss.listingId ? 'Сохранить оффер' : 'Опубликовать на Площадке'); uiAlert('Не удалось сохранить: ' + (r.error || 'ошибка')); return; }
            _haptic('success');
            if (r && r.listing_id) { _ss.listingId = r.listing_id; if (wasCreate) { var ch = channelById(_ss.channelId); _myListings.push({ id: r.listing_id, username: ch ? ch.username : null, status: 'pending', status_human: 'На модерации' }); } }
            if (r && (r.resubmitted || r.needs_review)) {
                _ss._status = 'pending';
                var nm = r.needs_review;
                for (var ri = 0; ri < _myListings.length; ri++) if (_myListings[ri].id === _ss.listingId) {
                    _myListings[ri].status = 'pending';
                    _myListings[ri].status_human = nm ? 'На проверке' : 'На модерации';
                    _myListings[ri].moderation_status = nm ? 'needs_review' : 'pending';
                    if (!nm) _myListings[ri].reject_reason = null;
                }
            }
            btn.innerHTML = '<i class="ti ti-check"></i> Сохранено';
            toast(r && r.needs_review ? 'Оффер ушёл на ручную проверку — проверим и вернём' : (r && r.resubmitted ? 'Оффер отправлен на повторную проверку' : 'Оффер сохранён'));
            _feed = null; _feedState = 'idle';
            setTimeout(function () {
                // новая карточка: перерисовываем панель, чтобы сразу появились кнопки управления
                // (Промо-постер, Статистика, Заморозить, Удалить) — раньше они не показывались до перезахода
                if (wasCreate) { paintCreate(); }
                else { btn.innerHTML = '<i class="ti ti-rocket"></i> Сохранить оффер'; btn.disabled = false; }
            }, 1600);
        }).catch(function (e) { _haptic('error'); btn.disabled = false; uiAlert('Не удалось сохранить: ' + (e && e.message ? e.message : 'ошибка')); });
    }

    /* ===================== cards ===================== */
    function _bk(k, h) { return h.replace('<span', '<span data-bkey="' + k + '"'); }
    function badgeItems(l) {
        var items = [];
        items.push({ k: 'tl', h: _bk('tl', trafficLight(l)) });
        var dealN = l.deals_count || 0;
        if (l.show_deals !== false && dealN >= 1) items.push({ k: 'deal', h: _bk('deal', '<span class="fmx-bdg fmx-b-deal"><i class="ti ti-heart-handshake"></i>' + (l.rating_avg ? '★ ' + l.rating_avg + ' · ' : '') + dealN + ' ' + _plural(dealN, 'сделка', 'сделки', 'сделок') + '</span>') });
        if (_nicheMatch(l)) items.push({ k: 'match', h: _bk('match', '<span class="fmx-bdg fmx-b-match"><i class="ti ti-target-arrow"></i>В точку</span>') });
        if (l.badges && l.badges.length) {
            var m = { live: ['fmx-b-live', 'ti-plant-2', 'Живой'], safe: ['fmx-b-safe', 'ti-shield-check', 'Безопасный'], big: ['fmx-b-big', 'ti-crown', 'Крупный'] };
            l.badges.filter(function (b) { return b !== 'match'; }).forEach(function (b) {
                var x = m[b]; if (x) items.push({ k: b, h: _bk(b, '<span class="fmx-bdg ' + x[0] + '"><i class="ti ' + x[1] + '"></i>' + x[2] + '</span>') });
            });
        } else {
            // бейджи только по РЕАЛЬНЫМ данным: «Живой» — охват ≥10% подписчиков, «Крупный» — ≥100k.
            // «Безопасный» без критерия убран — это был фальшивый знак доверия (как галочка верификации).
            var rr = _reachRate(l);
            if (rr != null && rr >= 10) items.push({ k: 'live', h: _bk('live', '<span class="fmx-bdg fmx-b-live"><i class="ti ti-plant-2"></i>Живой</span>') });
            if (l.subscribers && l.subscribers >= 100000) items.push({ k: 'big', h: _bk('big', '<span class="fmx-bdg fmx-b-big"><i class="ti ti-crown"></i>Крупный</span>') });
        }
        return items;
    }
    function _freeStyleInject(h, pos) {
        /* инжект абсолютной позиции и тёмной подложки в корневой тег бейджа */
        h = h.replace('class="', 'class="fmx-bfree ');
        return h.replace('<span', '<span style="left:' + pos.x.toFixed(1) + 'px;top:' + pos.y.toFixed(1) + 'px;"');
    }
    function badges(l, part) {
        var items = badgeItems(l);
        if (part === 'deal') return items.filter(function (i) { return i.k === 'deal'; }).map(function (i) { return i.h; }).join('');
        if (part === 'status') return items.filter(function (i) { return i.k !== 'deal'; }).map(function (i) { return i.h; }).join('');
        return items.map(function (i) { return i.h; }).join('');
    }
    function fullCard(l) {
        var top = _isTop(l), accent = _accent(l), hc = _healthColor(l);
        var topTag = ((l.effects_json || {}).topTag) || 'on';
        var bItems = badgeItems(l);
        var freeMap = (top || l._preview) && (l.effects_json || {}).badgeFree || null;
        var flowArr = [], covBdg = '';
        bItems.forEach(function (it) {
            if (freeMap && freeMap[it.k]) covBdg += _freeStyleInject(it.h, freeMap[it.k]);
            else flowArr.push(it.h);
        });
        var bodyBdg = flowArr.length ? '<div class="fmx-badges">' + flowArr.join('') + '</div>' : '';
        var bodyBdg2 = '';
        var stk = l.sticker_json || l.sticker;
        /* угол и режим отображения также лежат в effects_json (stickerRot/stickerMode) — фолбэк для рендера */
        if (stk && l.effects_json) {
            if (stk.dmode == null && l.effects_json.stickerMode) stk.dmode = l.effects_json.stickerMode;
            if (stk.rot == null && l.effects_json.stickerRot != null) stk.rot = l.effects_json.stickerRot;
        }
        var stkHtml = (stk && stk.url) ? stkOverlay(stk, 350, top && stk.kind !== 'webp', false) : '';
        var star = _bookmarks[l.username] ? ' on' : '';
        var t = l.title || l.username || '?';
        var at = l.emoji_attachments_json || {};
        var cb = (top && at.cardbg && typeof at.cardbg === 'object' && at.cardbg.url && at.cardbg.kind === 'img') ? at.cardbg : null;
        var cbgHtml = cb ? '<div class="fmx-cbg"><img src="' + mediaAbs(cb.url) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' + _posStyle(cb) + '"><i class="fmx-cbg-s"></i></div>' : '';
        var fts = cb ? 'text-shadow:0 1px 3px rgba(0,0,0,0.65);' : '';
        var fmet = cb ? 'background:rgba(10,13,24,0.55);border-radius:10px;padding:9px 11px;border-top:none;margin-top:11px;' : '';
        var covHtml;
        if (l.cover_type && l.cover_type !== 'grad' && l.cover_url) {
            var cpc = (at.cover && typeof at.cover === 'object') ? at.cover : null;
            var cst = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' + _posStyle(cpc);
            var cu = mediaAbs(l.cover_url);
            covHtml = '<div class="fmx-cov-bg" style="overflow:hidden;background:#11141f;">' + (l.cover_type === 'video' ? '<video src="' + cu + '" style="' + cst + '" muted playsinline preload="metadata"></video>' : '<img src="' + cu + '" style="' + cst + '">') + '</div>';
        } else covHtml = '<div class="fmx-cov-bg" style="background:' + _coverBg(l) + ';"></div>';
        var avHtml = listingAvatar(l, accent);
        var gk = top ? ((l.effects_json || {}).glass || 'none') : 'none';
        if (FX_VIP.glass.indexOf(gk) < 0) gk = 'none';
        var gs = glassKindStyles(gk, accent);
        return '<div class="fmx-cwrap"><div class="fmx-card' + (top ? ' fmx-prem' : '') + '" data-u="' + _esc(l.username) + '">' + cbgHtml + stkHtml + covBdg +
            '<div class="fmx-cov">' + covHtml +
            '</div>' +
            (top ? (topTag === 'off' ? '' : '<span class="fmx-tag gold"' + (topTag === 'ghost' ? ' style="background:rgba(10,13,24,0.22);color:#f5d78a;border:0.5px solid rgba(245,191,79,0.4);"' : '') + '><i class="ti ti-rocket"></i> Топ месяца</span>') : '<span class="fmx-tag"><i class="ti ti-circle-check-filled"></i> на продаже</span>') +
            '<button class="fmx-star' + star + '" data-bm="' + _esc(l.username) + '" style="bottom:auto;top:' + starTop((l.effects_json || {}).starPos) + 'px;z-index:7;"><i class="ti ti-star"></i></button>' +
            '<div class="fmx-cb"><div class="fmx-crow">' + avHtml +
            '<div><div class="fmx-nm" style="' + fts + '">' + _esc(t) + '</div><div class="fmx-meta" style="' + fts + '">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div></div></div>' +
            (_audChip(l) ? '<div style="margin:9px 0 -1px;">' + _audChip(l) + '</div>' : '') +
            bodyBdg +
            (l.custom_text ? '<div class="fmx-desc" style="' + fts + '">' + _esc(l.custom_text) + '</div>' : '') +
            (l.formats && l.formats.length ? '<div class="fmx-fchips">' + l.formats.slice(0, 4).map(function (ff) { return '<span>' + _esc(ff.label || ff.format) + '</span>'; }).join('') + '</div>' : '') + bodyBdg2 +
            '<div class="fmx-met" style="' + fmet + '"><div><div class="l">Цена от</div><div class="v pr" style="color:' + accent + ';">' + _priceFrom(l) + '</div></div>' +
            '<div><div class="l"><i class="ti ti-eye"></i>Охват</div><div class="v" style="color:' + hc + ';">' + (l.avg_views ? '~' + _num(l.avg_views) : '—') + '</div></div>' +
            (l.er != null ? '<div><div class="l">ER</div><div class="v" style="color:' + hc + ';">' + Math.round(l.er) + '%</div></div>' : '') +
            (function () { var cpmX = _cpm(l); return cpmX != null ? '<div><div class="l">CPM</div><div class="v">' + _num(cpmX) + ' ₽</div></div>' : ''; })() +
            '</div>' +
            '<div class="fmx-acts"><button class="fmx-btn" style="' + gs.s + ';opacity:0.55;" data-act="analyze" data-u="' + _esc(l.username) + '" title="AI-разбор подключается"><i class="ti ti-report-analytics"></i>Разбор · скоро</button><button class="fmx-btn" style="' + gs.s + '" data-act="expand" data-u="' + _esc(l.username) + '" data-lid="' + (l.id || '') + '"><i class="ti ti-arrow-up-right"></i>Развернуть</button>' +
            '<button class="fmx-btn fmx-btn-p" style="' + gs.p + '" data-act="write" data-u="' + _esc(l.username) + '" data-lid="' + (l.id || '') + '"><i class="ti ti-brand-telegram"></i>Написать</button></div></div></div></div>';
    }
    function simpleCard(l) {
        var accent = _accent(l), hc = _healthColor(l), t = l.title || l.username || '?';
        return '<div class="fmx-scard" data-u="' + _esc(l.username) + '"><div class="fmx-srow"><div class="fmx-sav" style="background:' + accent + ';' + (l.avatar_url ? 'overflow:hidden;' : '') + '">' + (l.avatar_url ? '<img src="' + mediaAbs(l.avatar_url) + '" style="width:100%;height:100%;object-fit:cover;">' : _esc(t.charAt(0))) + '</div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-nm" style="padding-top:0;">' + _esc(t) + '</div><div class="fmx-meta">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div></div>' +
            '<button class="fmx-star" style="position:static;background:transparent;border:0.5px solid rgba(255,255,255,0.12);' + (_bookmarks[l.username] ? 'color:#f59e0b;' : '') + '" data-bm="' + _esc(l.username) + '"><i class="ti ti-star"></i></button></div>' +
            (_audChip(l) ? '<div style="margin:11px 0 -2px;">' + _audChip(l) + '</div>' : '') +
            '<div class="fmx-met" style="margin-top:11px;"><div><div class="l"><i class="ti ti-users"></i>Подписчики</div><div class="v">' + _num(l.subscribers) + '</div></div>' +
            '<div><div class="l"><i class="ti ti-eye"></i>Охват</div><div class="v" style="color:' + hc + ';">' + (l.avg_views ? '~' + _num(l.avg_views) : '—') + '</div></div>' +
            (l.er != null ? '<div><div class="l">ER</div><div class="v" style="color:' + hc + ';">' + Math.round(l.er) + '%</div></div>' : '') +
            (function () { var cpmX = _cpm(l); return cpmX != null ? '<div><div class="l">CPM</div><div class="v">' + _num(cpmX) + ' ₽</div></div>' : ''; })() +
            '</div>' +
            '<div class="fmx-acts"><button class="fmx-btn" data-act="write" data-u="' + _esc(l.username) + '" data-lid="' + (l.id || '') + '"><i class="ti ti-brand-telegram"></i>Написать</button></div></div>';
    }
    function listItem(l, fx, plain) {
        var hc = _healthColor(l), accent = _accent(l), t = l.title || l.username || '?', prem = !plain && _isTop(l);
        var bits = ['<b>' + _short(l.subscribers) + '</b> подп'];
        if (l.avg_views) bits.push('<b>~' + _short(l.avg_views) + '</b> охв');
        if (l.er != null) bits.push('ER <b>' + Math.round(l.er) + '%</b>');
        var cpm = _cpm(l); if (cpm != null) bits.push('CPM <b>' + _short(cpm) + '₽</b>');
        if (l.audience && _audText(l.audience)) bits.push('<span style="color:' + _audColor(l.audience) + ';font-weight:700;">' + _audText(l.audience) + '</span>');
        bits.push(trafficLight(l));
        return '<div class="fmx-li' + (prem ? ' prem' : '') + '" data-u="' + _esc(l.username) + '"' + (plain ? ' data-b="1"' : '') + '>' +
            '<div class="fmx-lrow">' +
            '<span class="fmx-lav-fx">' + (fx ? avatarInner(accent) : listingAvatar(l, accent)) + '</span>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-lname" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(t) + (_nicheMatch(l) ? ' <i class="ti ti-target-arrow" style="color:#818cf8;font-size:11px;"></i>' : '') + '</div>' +
            '<div class="fmx-lmet">' + bits.join('<s></s>') + '</div></div>' +
            '<div class="fmx-lright">' + (plain ? '' : '<span class="fmx-lprice">' + _priceFrom(l) + '</span>') + '</div>' +
            '<i class="ti ti-chevron-down fmx-lchev"></i></div>' +
            '<div class="fmx-lbox" style="display:none;"></div></div>';
    }
    function bindList(scope) {
        qsa(scope || el('fmx-main'), '.fmx-li').forEach(function (li) {
            var row = li.querySelector('.fmx-lrow'); if (!row) return;
            row.addEventListener('click', function () {
                var box = li.querySelector('.fmx-lbox');
                if (li.classList.contains('on')) { li.classList.remove('on'); box.style.display = 'none'; box.innerHTML = ''; return; }
                var l = findListing(li.getAttribute('data-u')); if (!l) return;
                _haptic('light');
                box.innerHTML = li.getAttribute('data-b') ? simpleCard(l) : fullCard(l);
                box.style.display = 'block'; li.classList.add('on'); bindCards(box);
            });
        });
    }

    function zw(html) { return '<div class="fmx-zw">' + html + '</div>'; }
    function scaleCards(scope) {
        qsa(scope || document, '.fmx-cwrap,.fmx-zw').forEach(function (w) {
            var card = w.firstElementChild; if (!card) return;
            var ww = w.clientWidth; if (!ww) return;
            var k = Math.min(1, ww / 350);
            card.style.transform = k < 0.9995 ? 'scale(' + k + ')' : '';
            var off = Math.max(0, (ww - 350 * k) / 2);
            card.style.marginLeft = off > 0.05 ? off.toFixed(2) + 'px' : '';
            w.style.height = Math.round(card.offsetHeight * k) + 'px';
        });
    }
    document.addEventListener('click', function (e) {
        var t = e.target; if (!t || !t.closest) return;
        var b = t.closest('[data-phide]');
        if (b) { _pulseHide = true; var d = b.closest('.fmx-pday'); if (d) d.remove(); return; }
        var del = t.closest('#fmx-bmBody [data-del]');
        if (del) {
            e.stopPropagation();
            if (!del.classList.contains('arm')) {
                del.classList.add('arm'); _haptic('light');
                setTimeout(function () { del.classList.remove('arm'); }, 2200);
                return;
            }
            toggleBm(del.getAttribute('data-del')); openBookmarks();
            return;
        }
        var row = t.closest('#fmx-bmBody .fmx-bmrow');
        if (row) {
            if (row.classList.contains('frz')) { _haptic('light'); toast('Оффер в заморозке — владелец приостановил продажу'); return; }
            _haptic('light');
            openBmView(row.getAttribute('data-open'));
            return;
        }
    });
    var _rsT = null;
    window.addEventListener('resize', function () {
        clearTimeout(_rsT);
        _rsT = setTimeout(function () { scaleCards(document); }, 120);
    });
    function bindCards(scope) {
        hydrateTgs(scope);
        scaleCards(scope);
        var host = scope || el('fmx-main');
        qsa(host, '[data-bm]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); toggleBm(b.getAttribute('data-bm')); }); });
        qsa(host, '[data-act="write"]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); trackListing(b.getAttribute('data-lid'), 'write'); openTg(b.getAttribute('data-u')); }); });
        qsa(host, '[data-act="expand"]').forEach(function (b) { b.addEventListener('click', function () { trackListing(b.getAttribute('data-lid'), 'expand'); openListing(b.getAttribute('data-u')); }); });
        qsa(host, '[data-act="analyze"]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); openAnalyze(b.getAttribute('data-u')); }); });
    }
    function bindView() { qsa(el('fmx-main'), '[data-view]').forEach(function (b) { b.addEventListener('click', function () { _view = b.getAttribute('data-view'); if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy(); }); }); var pb = el('fmx-promobtn'); if (pb) pb.addEventListener('click', openPromo); }
    function bindSort() {
        qsa(el('fmx-main'), '[data-sort]').forEach(function (b) {
            b.addEventListener('click', function () {
                var v = b.getAttribute('data-sort');
                if (v === 'niche') {
                    var arr = (_mainTab === 'catalog' ? _catalog : _feed) || [];
                    var seen = {}, niches = [];
                    arr.forEach(function (l) { var nn = l.niche && String(l.niche).trim(); if (nn && !seen[nn.toLowerCase()]) { seen[nn.toLowerCase()] = 1; niches.push(nn); } });
                    if (!niches.length) { toast('В ленте пока нет каналов с указанной нишей'); return; }
                    openNichePick(niches);
                    return;
                }
                _nicheSel = null;
                _sort = v;
                if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy();
            });
        });
    }

    function sortBarHtml() {
        return '<div class="fmx-sortbar">' +
            '<button class="fmx-seg' + (_sort === 'match' ? ' on' : '') + '" data-sort="match"><i class="ti ti-target-arrow"></i> Под мою нишу</button>' +
            '<button class="fmx-seg' + (_sort === 'all' ? ' on' : '') + '" data-sort="all"><i class="ti ti-layout-grid"></i> Все каналы</button>' +
            '<button class="fmx-seg' + (_sort === 'niche' ? ' on' : '') + '" data-sort="niche"><i class="ti ti-filter"></i> Выбрать нишу</button></div>';
    }
    function searchHtml(ph) { return '<div class="fmx-search"><i class="ti ti-search"></i><input placeholder="' + ph + '"></div>'; }
    function vtogHtml() {
        return '<div class="fmx-vtog"><button class="fmx-vt' + (_view === 'cards' ? ' on' : '') + '" data-view="cards"><i class="ti ti-layout-grid"></i></button>' +
            '<button class="fmx-vt' + (_view === 'list' ? ' on' : '') + '" data-view="list"><i class="ti ti-list"></i></button></div>';
    }
    function topRowHtml() {
        return '<div class="fmx-toprow"><button class="fmx-promo" id="fmx-promobtn"><i class="ti ti-rocket"></i> Продвинуть</button>' + vtogHtml() + '</div>';
    }
    function emptyHtml(icon, title, sub) { return '<div class="fmx-empty"><i class="ti ' + icon + '"></i><h3>' + _esc(title) + '</h3><p>' + _esc(sub) + '</p></div>'; }
    function loadHtml() { return '<div class="fmx-load"><i class="ti ti-loader-2"></i><div style="font-size:12px;margin-top:10px;">Загружаю…</div></div>'; }

    /* ===================== actions ===================== */
    function findListing(u) { var arr = (_feed || []).concat(_catalog || []); for (var i = 0; i < arr.length; i++) if (arr[i].username === u) return arr[i]; return _bmMap && _bmMap[u] ? _bmMap[u] : null; }
    /* статистика карточки владельцу: шлём разворот/клик «Написать». Свою карточку и дубли
       отсеивает бэкенд. Ошибку глотаем молча — это фоновая метрика, не мешает действию. */
    var _trackedWrite = {};
    function trackListing(lid, kind) {
        lid = parseInt(lid, 10); if (!lid) return;
        if (kind === 'write') { if (_trackedWrite[lid]) return; _trackedWrite[lid] = 1; }  // клик считаем раз за сессию
        try { apiPost('/api/v1/marketplace/listings/' + lid + '/track', { kind: kind }).catch(function () {}); } catch (e) {}
    }
    /* статистика карточки владельцу: развороты и клики «Написать» за 7 дней + мини-график по дням */
    function openListingStats(lid) {
        lid = parseInt(lid, 10); if (!lid) { toast('Сначала сохрани оффер'); return; }
        var old = el('fmx-statsBg'); if (old) old.remove();
        var bg = document.createElement('div'); bg.id = 'fmx-statsBg'; bg.className = 'fmx-cfm';
        bg.innerHTML = '<div class="fmx-cfm-box" style="max-width:440px;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;">' +
            '<div style="font-size:15px;font-weight:800;"><i class="ti ti-chart-bar" style="color:#5DCAA5;"></i> Статистика за 7 дней</div>' +
            '<button class="fmx-mclose" id="fmx-stx" style="position:static;"><i class="ti ti-x"></i></button></div>' +
            '<div id="fmx-statsBody"><div class="fmx-empty" style="padding:30px 0;"><i class="ti ti-loader-2" style="animation:fmxSpin 0.9s linear infinite;"></i></div></div></div>';
        document.body.appendChild(bg);
        el('fmx-stx').addEventListener('click', function () { bg.remove(); });
        bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
        apiGet('/api/v1/marketplace/my/' + lid + '/stats').then(function (r) {
            var body = el('fmx-statsBody'); if (!body) return;
            if (!r || !r.ok) { body.innerHTML = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Попробуй ещё раз позже.'); return; }
            var t = r.totals || { expands: 0, writes: 0, views: 0 };
            var maxW = Math.max(1, Math.max.apply(null, (r.series || []).map(function (d) { return Math.max(d.expands, d.writes); })));
            var WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            var _series = r.series || [];
            var bars = _series.map(function (d, i) {
                var he = Math.round(d.expands / maxW * 46), hw = Math.round(d.writes / maxW * 46);
                var dd = new Date(d.day + 'T00:00:00');
                var today = i === _series.length - 1;
                return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;">' +
                    '<div style="display:flex;align-items:flex-end;gap:2px;height:48px;">' +
                    '<div title="Развороты: ' + d.expands + '" style="width:7px;height:' + Math.max(2, he) + 'px;background:#5DCAA5;border-radius:2px;opacity:' + (d.expands ? 1 : 0.25) + ';"></div>' +
                    '<div title="Написать: ' + d.writes + '" style="width:7px;height:' + Math.max(2, hw) + 'px;background:#818cf8;border-radius:2px;opacity:' + (d.writes ? 1 : 0.25) + ';"></div></div>' +
                    '<div style="font-size:10px;font-weight:' + (today ? '700' : '400') + ';color:' + (today ? '#5DCAA5' : '#8990a8') + ';white-space:nowrap;">' + WD[dd.getDay()] + '</div></div>';
            }).join('');
            body.innerHTML =
                '<div style="display:flex;gap:10px;margin-bottom:16px;">' +
                '<div style="flex:1;background:rgba(93,202,165,0.1);border:1px solid rgba(93,202,165,0.25);border-radius:12px;padding:12px;text-align:center;">' +
                '<div style="font-size:26px;font-weight:800;color:#5DCAA5;">' + t.expands + '</div><div style="font-size:11px;color:#a9aec0;margin-top:2px;">Развернули оффер</div></div>' +
                '<div style="flex:1;background:rgba(129,140,248,0.1);border:1px solid rgba(129,140,248,0.25);border-radius:12px;padding:12px;text-align:center;">' +
                '<div style="font-size:26px;font-weight:800;color:#818cf8;">' + t.writes + '</div><div style="font-size:11px;color:#a9aec0;margin-top:2px;">Нажали «Написать»</div></div></div>' +
                '<div style="display:flex;align-items:flex-end;gap:3px;padding:6px 2px;">' + bars + '</div>' +
                '<div style="display:flex;gap:14px;justify-content:center;margin-top:10px;font-size:11px;color:#8990a8;">' +
                '<span><span style="display:inline-block;width:8px;height:8px;background:#5DCAA5;border-radius:2px;margin-right:4px;"></span>Развороты</span>' +
                '<span><span style="display:inline-block;width:8px;height:8px;background:#818cf8;border-radius:2px;margin-right:4px;"></span>Написать</span></div>' +
                (t.expands + t.writes === 0 ? '<div style="font-size:12px;color:#8990a8;text-align:center;margin-top:14px;">Пока данных нет. Как только оффер начнут смотреть на Площадке — здесь появятся цифры.</div>' : '');
        }).catch(function () { var b = el('fmx-statsBody'); if (b) b.innerHTML = emptyHtml('ti-cloud-off', 'Ошибка', 'Проверь связь.'); });
    }
    function openTg(u) { _haptic('light'); var url = 'https://t.me/' + u; try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) { window.open(url, '_blank'); } }
    function toggleBm(u) {
        if (!u) return; _haptic('light');
        var on;
        if (_bookmarks[u]) { on = false; delete _bookmarks[u]; apiDelete('/api/v1/marketplace/bookmarks/' + encodeURIComponent(u)).catch(function () {}); }
        else { on = true; _bookmarks[u] = true; apiPost('/api/v1/marketplace/bookmarks', { username: u, source: _mainTab === 'catalog' ? 'base' : 'market' }).catch(function () {}); }
        updateBmCount();
        /* точечно: звёзды обновляются на месте, раскрытые строки не сворачиваются */
        qsa(document, '.fmx-star[data-bm="' + u + '"]').forEach(function (s) { s.classList.toggle('on', on); });
    }

    /* ===================== modals ===================== */
    function buildModals() {
        var faq = document.createElement('div'); faq.className = 'fmx-mbg'; faq.id = 'fmx-faqBg';
        faq.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2><i class="ti ti-help-circle" style="color:#818cf8;"></i> Справка</h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-faqBody"></div></div>';
        document.body.appendChild(faq);
        faq.addEventListener('click', function (e) { if (e.target === faq) hideModal('fmx-faqBg'); });
        faq.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-faqBg'); });
        var bmv = document.createElement('div'); bmv.className = 'fmx-mbg'; bmv.id = 'fmx-bmvBg';
        bmv.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2><i class="ti ti-star" style="color:#f59e0b;"></i> <span id="fmx-bmvTitle"></span></h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-bmvBody"></div></div>';
        document.body.appendChild(bmv);
        bmv.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-bmvBg'); });

        var promo = document.createElement('div'); promo.className = 'fmx-mbg'; promo.id = 'fmx-promoBg';
        promo.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-rocket" style="color:#f5bf4f;"></i> Продвинуть оффер</h2><p>Поднимает оффер выше в умной сортировке — его видит больше рекламодателей. Топ смешанный: платные и обычные офферы чередуются.</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-promoBody"></div></div>';
        document.body.appendChild(promo);
        promo.addEventListener('click', function (e) { if (e.target === promo) hideModal('fmx-promoBg'); });
        promo.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-promoBg'); });

        var lst = document.createElement('div'); lst.className = 'fmx-mbg'; lst.id = 'fmx-listBg';
        lst.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2 id="fmx-listTitle" style="font-size:15px;"></h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-listBody"></div></div>';
        document.body.appendChild(lst);
        lst.addEventListener('click', function (e) { if (e.target === lst) hideModal('fmx-listBg'); });
        lst.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-listBg'); });

        var an = document.createElement('div'); an.className = 'fmx-mbg'; an.id = 'fmx-anBg';
        an.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-report-analytics" style="color:#818cf8;"></i> AI-разбор канала</h2><p id="fmx-anName"></p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody"><div class="fmx-note fmx-gr"><i class="ti ti-sparkles"></i> Нейросеть изучит канал целиком: реальный охват и его динамику, вовлечённость, признаки накрутки и качество аудитории — и честно скажет, стоит ли покупать здесь рекламу.</div><div class="fmx-empty" style="padding:24px 20px;"><i class="ti ti-hourglass-high"></i><h3>Скоро</h3><p>Глубокий разбор подключается. Пока смотри метрики в «Развернуть» и бейджи здоровья в оффере.</p></div></div></div>';
        document.body.appendChild(an);
        an.addEventListener('click', function (e) { if (e.target === an) hideModal('fmx-anBg'); });
        an.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-anBg'); });

        var rv = document.createElement('div'); rv.className = 'fmx-mbg'; rv.id = 'fmx-revBg';
        rv.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-star" style="color:#f59e0b;"></i> Отзыв о сделке</h2><p>Виден всем в развороте оффера</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-revBody"></div></div>';
        document.body.appendChild(rv);
        rv.addEventListener('click', function (e) { if (e.target === rv) hideModal('fmx-revBg'); });
        qsa(rv, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-revBg'); }); });

        var ns = document.createElement('div'); ns.className = 'fmx-mbg'; ns.id = 'fmx-nsBg';
        ns.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-bell" style="color:#f59e0b;"></i> Уведомления о заявках</h2><p>Пришлём в бота, когда рекламодатель ищет каналы твоей ниши</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-nsBody"></div></div>';
        document.body.appendChild(ns);
        ns.addEventListener('click', function (e) { if (e.target === ns) hideModal('fmx-nsBg'); });
        qsa(ns, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-nsBg'); }); });

        var rp = document.createElement('div'); rp.className = 'fmx-mbg'; rp.id = 'fmx-repBg';
        rp.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-flag" style="color:#ef4444;"></i> Пожаловаться</h2><p>Разберём вручную, автор жалобу не увидит</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-repBody"></div></div>';
        document.body.appendChild(rp);
        rp.addEventListener('click', function (e) { if (e.target === rp) hideModal('fmx-repBg'); });
        qsa(rp, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-repBg'); }); });

        var rq = document.createElement('div'); rq.className = 'fmx-mbg'; rq.id = 'fmx-reqBg';
        rq.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-speakerphone" style="color:#818cf8;"></i> Заявка на покупку рекламы</h2><p>Владельцы подходящих каналов напишут тебе сами</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-reqBody"></div></div>';
        document.body.appendChild(rq);
        rq.addEventListener('click', function (e) { if (e.target === rq) hideModal('fmx-reqBg'); });
        qsa(rq, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-reqBg'); }); });

        var cr = document.createElement('div'); cr.className = 'fmx-mbg'; cr.id = 'fmx-cropBg';
        cr.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-crop" style="color:#818cf8;"></i> Кадрирование</h2><p id="fmx-cropHint"></p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody"><div id="fmx-cropBox"></div><div class="fmx-zoomrow"><i class="ti ti-zoom-out" style="color:#8990a8;"></i><input type="range" id="fmx-cropZoom" min="1" max="3" step="0.01" value="1"><i class="ti ti-zoom-in" style="color:#8990a8;"></i></div><div class="fmx-acts" style="margin-top:14px;"><button class="fmx-btn" data-c>Отмена</button><button class="fmx-btn fmx-btn-p" id="fmx-cropOk" style="background:#5DCAA5;color:#04342c;"><i class="ti ti-check"></i>Готово</button></div></div></div>';
        document.body.appendChild(cr);
        cr.addEventListener('click', function (e) { if (e.target === cr) { _crop = null; hideModal('fmx-cropBg'); } });
        qsa(cr, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { _crop = null; hideModal('fmx-cropBg'); }); });
        cr.querySelector('#fmx-cropOk').addEventListener('click', finishCrop);
        cr.querySelector('#fmx-cropZoom').addEventListener('input', function () { if (_crop) { _crop.s = parseFloat(this.value) || 1; cropApply(); } });
        var cbx = cr.querySelector('#fmx-cropBox');
        cbx.addEventListener('pointerdown', function (e) { if (!_crop) return; e.preventDefault(); _crop.drag = { x: e.clientX, y: e.clientY, ox: _crop.x, oy: _crop.y, w: cbx.offsetWidth || 1, h: cbx.offsetHeight || 1 }; try { cbx.setPointerCapture(e.pointerId); } catch (err) {} });
        cbx.addEventListener('pointermove', function (e) { if (!_crop || !_crop.drag) return; var d = _crop.drag; _crop.x = Math.max(0, Math.min(100, d.ox - (e.clientX - d.x) / d.w * 100 / _crop.s)); _crop.y = Math.max(0, Math.min(100, d.oy - (e.clientY - d.y) / d.h * 100 / _crop.s)); cropApply(); });
        cbx.addEventListener('pointerup', function () { if (_crop) _crop.drag = null; });
        cbx.addEventListener('pointercancel', function () { if (_crop) _crop.drag = null; });

        var bm = document.createElement('div'); bm.className = 'fmx-mbg'; bm.id = 'fmx-bmBg';
        bm.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2><i class="ti ti-star" style="color:#f59e0b;"></i> Закладки</h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-bmBody"></div></div>';
        document.body.appendChild(bm);
        bm.addEventListener('click', function (e) { if (e.target === bm) hideModal('fmx-bmBg'); });
        bm.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-bmBg'); });
    }
    function showModal(id) { var m = el(id); if (m) { document.body.appendChild(m); m.classList.add('fmx-show'); } }
    function hideModal(id) { var m = el(id); if (m) m.classList.remove('fmx-show'); }

    /* подсказка пульсирует, пока человек не откроет её хотя бы раз (запоминаем навсегда) */
    function _pulseHint(id, key) {
        var b = el(id); if (!b) return;
        try { if (localStorage.getItem(key)) return; } catch (e) {}
        b.classList.add('fmx-pulse');
        b.addEventListener('click', function () {
            b.classList.remove('fmx-pulse');
            try { localStorage.setItem(key, '1'); } catch (e) {}
        });
    }

    /* Справка по значкам: каждый бейдж показан РОВНО как на карточке + профессиональное описание */
    function openBadgeGuide() {
        var old = el('fmx-bgdBg'); if (old) old.remove();
        var card = function (badge, title, desc) {
            return '<div class="fmx-bgd-card">' +
                '<div class="fmx-bgd-badge">' + badge + '</div>' +
                '<div class="fmx-bgd-txt"><div class="fmx-bgd-title">' + title + '</div>' +
                '<div class="fmx-bgd-desc">' + desc + '</div></div></div>';
        };
        var tlRow = function (state, name, hex, text) {
            return '<div class="fmx-tlrow"><div class="fmx-tlcell">' + trafficLight({ health_class: state }) + '</div>' +
                '<div class="fmx-tldesc"><b style="color:' + hex + ';">' + name + '</b> — ' + text + '</div></div>';
        };
        var healthCard = '<div class="fmx-bgd-card fmx-bgd-health">' +
            '<div class="fmx-bgd-title">Здоровье канала · светофор</div>' +
            '<div class="fmx-bgd-desc">Отношение среднего охвата поста к числу подписчиков — живая ли аудитория.</div>' +
            tlRow('green', 'Зелёный', '#5DCAA5', 'охват в норме (от 10% подписчиков), аудитория живая.') +
            tlRow('amber', 'Жёлтый', '#f59e0b', 'охват ниже ожидаемого (3–10%).') +
            tlRow('red', 'Красный', '#ef4444', 'низкий охват при больших цифрах: возможна накрутка подписчиков.') +
            '<div class="fmx-bgd-desc" style="margin-top:9px;">Жёлтый и красный — не приговор: открой «Развернуть» и проверь охват, ER и динамику вручную.</div>' +
            '</div>';
        var body =
            healthCard +
            card('<span class="fmx-bdg fmx-b-live"><i class="ti ti-plant-2"></i>Живой</span>', 'Живой',
                'Средний охват поста — не менее 10% от числа подписчиков. Аудитория активно читает канал: признак живой, невыгоревшей базы.') +
            card('<span class="fmx-bdg fmx-b-big"><i class="ti ti-crown"></i>Крупный</span>', 'Крупный',
                'В канале от 100 000 подписчиков. Большой охват за размещение — подходит для масштабных запусков и широких проливов.') +
            card('<span class="fmx-bdg fmx-b-match"><i class="ti ti-target-arrow"></i>В точку</span>', 'В точку',
                'Ниша канала совпадает с нишей твоего канала. Аудитории близки — реклама попадёт точнее, конверсия выше. Показывается только тебе, под твой канал.') +
            card('<span class="fmx-bdg fmx-b-deal"><i class="ti ti-heart-handshake"></i>★ 4.8 · 3 сделки</span>', 'Сделки и рейтинг',
                'Число подтверждённых сделок через Площадку и средний рейтинг от рекламодателей. Обе стороны подтверждают сделку вручную — цифры не накручиваются. Прямой показатель репутации канала.') +
            card('<span class="fmx-bdg fmx-b-live"><i class="ti ti-shield-check"></i>Безопасный</span>', 'Безопасный',
                'Канал прошёл модерацию Площадки — запрещённый контент и признаки мошенничества не выявлены. Отсутствие бейджа означает лишь, что проверка ещё не проводилась, и не свидетельствует о нарушениях.');
        var bg = document.createElement('div'); bg.className = 'fmx-mbg'; bg.id = 'fmx-bgdBg';
        bg.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2><i class="ti ti-rosette-discount-check" style="color:#818cf8;"></i> Что значат бейджи</h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div>' +
            '<div class="fmx-mbody"><div style="font-size:12px;color:#8990a8;margin-bottom:6px;">Бейджи в оффере помогают быстро оценить канал ещё до разворота.</div>' + body + '</div></div>';
        document.body.appendChild(bg);
        bg.addEventListener('click', function (e) { if (e.target === bg) hideModal('fmx-bgdBg'); });
        bg.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-bgdBg'); });
        showModal('fmx-bgdBg');
    }

    function openFaq() {
        var body;
        if (_faqTab === 'terms') body = TERMS.map(function (t) { return '<div class="fmx-term"><h4>' + _esc(t[0]) + '</h4><p>' + _esc(t[1]) + '</p></div>'; }).join('');
        else if (_faqTab === 'rules') body = '<div class="fmx-note" style="margin-bottom:6px;"><i class="ti ti-scale"></i> Единые правила Площадки. За контент отвечает разместивший; дополнительно действуют законы страны, на аудиторию которой направлена реклама.</div>' + RULES.map(function (t) { return '<div class="fmx-term"><h4>' + _esc(t[0]) + '</h4><p>' + _esc(t[1]) + '</p></div>'; }).join('');
        else body = TIPS.map(function (t) { return '<div class="fmx-tip"><i class="ti ti-circle-check"></i><span>' + _esc(t) + '</span></div>'; }).join('');
        el('fmx-faqBody').innerHTML = '<div class="fmx-ftabs"><button class="fmx-ft' + (_faqTab === 'rules' ? ' on' : '') + '" data-t="rules">Правила</button><button class="fmx-ft' + (_faqTab === 'terms' ? ' on' : '') + '" data-t="terms">Метрики</button><button class="fmx-ft' + (_faqTab === 'tips' ? ' on' : '') + '" data-t="tips">Советы</button></div>' + body;
        qsa(el('fmx-faqBody'), '[data-t]').forEach(function (b) { b.addEventListener('click', function () { _faqTab = b.getAttribute('data-t'); openFaq(); }); });
        showModal('fmx-faqBg');
    }
    function openPromo() {
        el('fmx-promoBody').innerHTML =
            '<div class="fmx-po"><div class="fmx-po-top"><div class="fmx-po-nm"><i class="ti ti-bolt" style="color:#818cf8;"></i> Поднятие 24 часа</div><div class="fmx-po-pr">490 ₽</div></div>' +
            '<div class="fmx-po-li"><i class="ti ti-arrow-up"></i> Поднимаем оффер выше в топе на сутки. Больше показов — больше откликов.</div>' +
            '<button class="fmx-po-buy" data-buy="24">Поднять на 24 часа</button></div>' +
            '<div class="fmx-po"><div class="fmx-po-top"><div class="fmx-po-nm"><i class="ti ti-bolt" style="color:#818cf8;"></i> Поднятие 48 часов</div><div class="fmx-po-pr">1 390 ₽</div></div>' +
            '<div class="fmx-po-li"><i class="ti ti-arrow-up"></i> Поднимаем оффер выше в топе на двое суток — дольше наверху, больше откликов.</div>' +
            '<button class="fmx-po-buy" data-buy="48">Поднять на 48 часов</button></div>' +
            '<div class="fmx-limit"><i class="ti ti-info-circle"></i> Поднятия на 24 и 48 часов вместе — не больше 3 раз за 30 дней.</div>' +
            '<div class="fmx-po gold"><div class="fmx-po-top"><div class="fmx-po-nm"><i class="ti ti-rocket" style="color:#f5bf4f;"></i> Продвижение 30 дней</div><div class="fmx-po-pr gold">29 990 ₽</div></div>' +
            '<div class="fmx-po-li gold"><i class="ti ti-arrow-up"></i> Приоритет в топе на месяц, максимум показов.</div>' +
            '<div class="fmx-po-li gold"><i class="ti ti-sparkles"></i> Эксклюзивное оформление: золотое свечение, премиум-фон, спецэффекты, стеклянные кнопки.</div>' +
            '<div class="fmx-po-li gold"><i class="ti ti-circle-check"></i> Не входит в лимит трёх поднятий.</div>' +
            '<button class="fmx-po-buy gold" data-buy="top">Оформить продвижение на 30 дней</button></div>';
        qsa(el('fmx-promoBody'), '[data-buy]').forEach(function (b) { b.addEventListener('click', function () { _haptic('light'); uiAlert('Оплата продвижения (' + b.getAttribute('data-buy') + ') — подключим биллинг.'); }); });
        showModal('fmx-promoBg');
    }
    function openAnalyze(u) {
        _haptic('light');
        var nm = el('fmx-anName'); if (nm) nm.textContent = '@' + u;
        showModal('fmx-anBg');
    }
    function openListing(u, known) {
        var l = known || findListing(u); if (!l) { openTg(u); return; }
        var accent = _isTop(l) ? '#f5bf4f' : _accent(l);
        var fmts = (l.formats && l.formats.length) ? '<div style="display:flex;flex-direction:column;gap:7px;margin-top:8px;">' + l.formats.map(function (f) { return '<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:9px 11px;background:rgba(255,255,255,0.03);border-radius:9px;"><span>' + _esc(f.label || f.format) + '</span><b>' + _num(f.price) + ' ₽</b></div>'; }).join('') + '</div>' : '';
        var mstr = [];
        if (_nicheMatch(l)) mstr.push('ниша совпадает с твоим каналом');
        if (l.er != null) mstr.push('ER ' + l.er + '%');
        var cpm = _cpm(l); if (cpm != null) mstr.push('CPM ' + cpm + '₽');
        var rr = _reachRate(l); if (rr != null) mstr.push('охват к подписчикам ' + rr + '%');
        el('fmx-listTitle').innerHTML = '<span style="display:flex;align-items:center;gap:7px;">' + _esc(l.title || u) + '</span>';
        el('fmx-listBody').innerHTML =
            '<div style="font-size:12px;color:#8990a8;margin-bottom:12px;">@' + _esc(u) + ' · ' + _num(l.subscribers) + ' подп.</div>' +
            '<div class="fmx-badges">' + badges(l) + '</div>' +
            (mstr.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">' + mstr.map(function (m) { return '<span style="font-size:11px;color:#a9aec0;background:rgba(255,255,255,0.04);padding:5px 10px;border-radius:8px;">' + _esc(m) + '</span>'; }).join('') + '</div>' : '') +
            (l.custom_text ? '<div style="font-size:13px;color:#cdd0de;line-height:1.55;margin:12px 0;">' + _esc(l.custom_text) + '</div>' : '') +
            (fmts ? '<div style="font-size:12px;font-weight:700;margin:14px 0 4px;">Форматы и цены</div>' + fmts : '') +
            (l.slots_note ? '<div style="font-size:11.5px;color:#5DCAA5;margin-top:11px;"><i class="ti ti-calendar-check"></i> ' + _esc(l.slots_note) + '</div>' : '') +
            '<div class="fmx-acts" style="margin-top:16px;"><button class="fmx-btn" id="fmx-lsBm" data-bm="' + _esc(u) + '"' + (_bookmarks[u] ? ' style="color:#f59e0b;border-color:rgba(245,158,11,0.4);"' : '') + '><i class="ti ti-star"></i>' + (_bookmarks[u] ? 'В закладках' : 'В закладки') + '</button>' +
            '<button class="fmx-btn fmx-btn-p" style="background:' + accent + ';color:#fff;" data-w="' + _esc(u) + '"><i class="ti ti-brand-telegram"></i>Написать</button></div>' +
            (l.id ? '<div id="fmx-lsRev"></div><div id="fmx-dealBox"></div><button class="fmx-btn" id="fmx-ls-rep" style="width:100%;margin-top:10px;color:#8990a8;"><i class="ti ti-flag"></i> Пожаловаться на оффер</button>' : '');
        el('fmx-listBody').querySelectorAll('[data-bm]').forEach(function (b) {
            b.addEventListener('click', function () {
                toggleBm(b.getAttribute('data-bm'));
                var on = !!_bookmarks[b.getAttribute('data-bm')];
                b.innerHTML = '<i class="ti ti-star"></i>' + (on ? 'В закладках' : 'В закладки');
                b.style.color = on ? '#f59e0b' : '';
                b.style.borderColor = on ? 'rgba(245,158,11,0.4)' : '';
                toast(on ? 'Добавлено в закладки' : 'Убрано из закладок');
            });
        });
        el('fmx-listBody').querySelectorAll('[data-w]').forEach(function (b) { b.addEventListener('click', function () { trackListing(l.id, 'write'); openTg(b.getAttribute('data-w')); }); });
        var _lsRep = el('fmx-ls-rep');
        if (_lsRep) _lsRep.addEventListener('click', function () { hideModal('fmx-listBg'); openComplaint({ listing_id: l.id }); });
        if (l.id) { renderDealBox(l); if (l.reviews_count) renderReviews(l); }
        hydrateTgs(el('fmx-listBody'));
        showModal('fmx-listBg');
    }
    var _bmMap = {};
    function openBmView(u) {
        var l = (_bmMap && _bmMap[u]) || findListing(u); if (!l) return;
        if (!el('fmx-bmvBg')) {
            var bmv = document.createElement('div'); bmv.className = 'fmx-mbg'; bmv.id = 'fmx-bmvBg';
            bmv.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2><i class="ti ti-star" style="color:#f59e0b;"></i> <span id="fmx-bmvTitle"></span></h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-bmvBody"></div></div>';
            document.body.appendChild(bmv);
            bmv.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-bmvBg'); });
        }
        var _bmv = el('fmx-bmvBg');
        document.body.appendChild(_bmv);   /* в конец стека — поверх списка закладок */
        _bmv.style.zIndex = '9300';
        el('fmx-bmvTitle').textContent = l.title || u;
        el('fmx-bmvBody').innerHTML = '<div style="max-width:372px;margin:0 auto;">' + zw(fullCard(l)) + '</div>';
        bindCards(el('fmx-bmvBody'));
        /* «Развернуть» открывает разворот в том же окне (модалкой), с готовым объектом карточки —
           не проваливается во внешний Telegram, даже если карточки нет в текущей ленте */
        qsa(el('fmx-bmvBody'), '[data-act="expand"]').forEach(function (b) {
            var nb = b.cloneNode(true); b.parentNode.replaceChild(nb, b);
            nb.addEventListener('click', function () { hideModal('fmx-bmvBg'); openListing(u, l); });
        });
        qsa(el('fmx-bmvBody'), '[data-act="analyze"]').forEach(function (b) {
            b.addEventListener('click', function () { hideModal('fmx-bmvBg'); });
        });
        showModal('fmx-bmvBg');
        /* карточку масштабируем ПОСЛЕ показа модалки: до этого clientWidth=0 и scaleCards
           отрабатывал вхолостую — карточка оставалась 350px и вылезала за край на узких экранах */
        requestAnimationFrame(function () { scaleCards(el('fmx-bmvBody')); });
    }
    function openBookmarks() {
        var box = el('fmx-bmBody');
        box.innerHTML = loadHtml();
        showModal('fmx-bmBg');
        apiGet('/api/v1/marketplace/bookmarks/cards').then(function (r) {
            var items = (r && r.items) || [];
            _bookmarks = {}; _bmMap = {};
            items.forEach(function (it) { _bookmarks[it.listing.username] = true; _bmMap[it.listing.username] = it.listing; });
            updateBmCount();
            if (!items.length) {
                box.innerHTML = '<div class="fmx-empty"><i class="ti ti-star"></i><h3>Пусто</h3><p>Отмечай ★ на офферах, чтобы сохранить канал.</p></div>';
                return;
            }
            box.innerHTML = items.map(function (it) {
                var l = it.listing, u = l.username;
                return '<div class="fmx-bmrow' + (it.frozen ? ' frz' : '') + '" data-open="' + _esc(u) + '" data-src="' + it.source + '" data-frz="' + (it.frozen ? 1 : 0) + '">' +
                    zw(listItem(l, false, it.source === 'base')) +
                    (it.frozen ? '<span class="fmx-frzTag"><i class="ti ti-snowflake"></i> Заморожена</span>' : '') +
                    '<button class="fmx-bmdel" data-del="' + _esc(u) + '" title="Удалить из закладок (два нажатия)"><i class="ti ti-trash"></i></button></div>';
            }).join('');
            scaleCards(box);
            hydrateTgs(box);
            /* клики закладок обслуживает постоянный делегат на document */
        }).catch(function () {
            box.innerHTML = '<div class="fmx-empty"><i class="ti ti-cloud-off"></i><h3>Не загрузилось</h3><p>Попробуй открыть закладки ещё раз.</p></div>';
        });
    }

    /* err=true — отказ: красная рамка и другой значок. Раньше любая ошибка показывалась
       с зелёной галочкой, будто всё удалось. */
    var _toastTo = null;
    function toast(msg, err) {
        var t = el('fmx-toastEl');
        if (!t) { t = document.createElement('div'); t.id = 'fmx-toastEl'; t.className = 'fmx-toast'; document.body.appendChild(t); }
        t.classList.toggle('err', !!err);
        t.innerHTML = '<i class="ti ' + (err ? 'ti-alert-circle' : 'ti-circle-check') + '"></i> ' + _esc(msg);
        t.classList.add('on');
        clearTimeout(_toastTo);   // подряд идущие тосты не гасят друг друга досрочно
        _toastTo = setTimeout(function () { t.classList.remove('on'); }, 2400);
    }

    var _open0 = open;
    window.__openMarketplace = function (cid) { loadNicheMap(); return _open0(cid); };
})();