(function () {
    'use strict';

    /* ===================== state ===================== */
    var _root = null, _opened = false;
    var _mainTab = 'market';
    var _subTab = 'buy';
    var _view = 'cards';
    var _sort = 'match';
    var _feed = null, _catalog = null, _feedState = 'idle', _catState = 'idle';
    var _reqs = null, _reqState = 'idle';
    var _channels = [], _myListings = [], _bookmarks = {};
    var _chLoaded = false, _chLoading = false, _nicheSel = null;
    var _faqTab = 'terms';
    var _ss = null, _sfmts = null, _secCreate = 'cover';
    var _stickers = null;  // коллекция стикеров юзера

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
        ['Подписчики', 'Сколько людей в канале. Само по себе мало значит — подписчиков легко накрутить. Главное — охват.'],
        ['Охват', 'Сколько человек реально видят один пост. Главное число при оценке: рекламу видит охват, а не все подписчики.'],
        ['ER · вовлечённость', 'Насколько живая аудитория: реакции и комментарии к охвату. Низкий ER при больших цифрах — повод насторожиться.'],
        ['CPM · за 1000 показов', 'Сколько стоит донести рекламу до 1000 человек. Сравнивай каналы по CPM, а не по голой сумме.'],
        ['Охват к подписчикам', 'Какая доля подписчиков видит посты. У здорового канала — заметная доля. 100k подписчиков и 1k охват — тревожный знак.'],
        ['Накрутка', 'Искусственные подписчики или просмотры. Признаки: много подписчиков и крошечный охват, скачки просмотров, нет живых комментариев.'],
        ['Маркировка · erid', 'В некоторых странах интернет-реклама подлежит маркировке (в России — токен erid). Поле erid в карточке опциональное — для сделок, где маркировка обязательна.']
    ];
    var RULES = [
        ['Запрещено полностью', 'Наркотики и их пропаганда; оружие и взрывчатка; порнография; терроризм, экстремизм и символика запрещённых организаций; призывы к суициду и селф-харму; шок-контент — кровь, увечья, жестокость к людям и животным; торговля людьми, документами и краденым.'],
        ['Финансы и «схемы»', 'Пирамиды, скам-проекты, «бинарные опционы» и обещания гарантированного дохода — блокировка. Азартные игры — только лицензированные операторы с предупреждением о рисках. Кредитные продукты — только с полными и честными условиями.'],
        ['Здоровье и «чудо-средства»', 'Обещания вылечить болезни, «минус 20 кг за неделю» и псевдомедицина запрещены. Медицина, лекарства и добавки — только с корректными оговорками и без гарантий результата.'],
        ['Алкоголь, табак, вейпы', 'Реклама алкоголя, табака, вейпов и жидкостей для них на Площадке не размещается — в любом виде, включая «обзоры» с промокодами.'],
        ['Картинки, GIF и видео', 'Без чужих брендов, логотипов и персонажей — это чужая интеллектуальная собственность. Без реальных людей без их согласия, включая дипфейки. Без строб-вспышек чаще 3 раз в секунду. Дети в рекламе — только когда это оправдано самим товаром.'],
        ['Эмодзи и стикеры', 'Стикер или эмодзи с запрещённой символикой, наркотиками или 18+ — то же нарушение, что и картинка. Комбинации эмодзи, маскирующие запрещённые товары, тоже считаются нарушением.'],
        ['18+ и серая зона', 'Эротика 18+ — только в отдельном разделе с подтверждением возраста. Лицензируемые ниши — азартные игры, финансы, крипта — проверяются строже и дольше.'],
        ['Маркировка рекламы', 'В некоторых странах интернет-реклама подлежит обязательной маркировке (например, в России — токен erid). Это ответственность сторон сделки. Поле erid в карточке — опциональное: заполняй, если работаешь с аудиторией, где маркировка обязательна.'],
        ['Ответственность', 'За контент карточки отвечает тот, кто её разместил — это фиксируется при публикации. Также запрещено всё, что запрещено законами страны, на аудиторию которой направлена реклама. Нарушение — снятие карточки, повторное или грубое — бан. Пожаловаться на любую карточку можно в один тап.']
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
    function _myNiches() {
        var s = {};
        (_channels || []).forEach(function (c) { if (c.niche) s[String(c.niche).toLowerCase().trim()] = 1; });
        return s;
    }
    function _nicheMatch(l) {
        if (!l || !l.niche) return false;
        return !!_myNiches()[String(l.niche).toLowerCase().trim()];
    }
    function _applySort(arr) {
        if (_sort === 'match') return arr.slice().sort(function (a, b) { return (_nicheMatch(b) ? 1 : 0) - (_nicheMatch(a) ? 1 : 0); });
        if (_sort === 'niche' && _nicheSel) return arr.filter(function (l) { return l.niche && String(l.niche).toLowerCase().trim() === _nicheSel; });
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
            '.fmx-ibtn.fmx-has{color:#f59e0b;border-color:rgba(245,158,11,0.3);}',
            '.fmx-bmc{position:absolute;top:-5px;right:-5px;background:#6366f1;color:#fff;font-size:9px;font-weight:700;min-width:15px;height:15px;border-radius:99px;display:flex;align-items:center;justify-content:center;padding:0 3px;}',
            '.fmx-pillbar{position:relative;display:flex;margin:0 16px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:4px;flex-shrink:0;}',
            '.fmx-pill{position:absolute;top:4px;left:4px;height:calc(100% - 8px);border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);transition:transform 380ms cubic-bezier(.2,.85,.25,1),width 380ms cubic-bezier(.2,.85,.25,1);box-shadow:0 4px 14px rgba(99,102,241,0.4);z-index:0;}',
            '.fmx-pb{flex:1;position:relative;z-index:1;border:none;background:transparent;color:#8990a8;padding:10px 3px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:color 260ms;white-space:nowrap;min-width:0;overflow:hidden;}',
            '.fmx-pb.on{color:#fff;}',
            '.fmx-scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;}',

            '.fmx-scroll::-webkit-scrollbar{display:none;}',
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
            '.fmx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,330px));gap:12px;justify-content:center;}',
            '.fmx-empty{text-align:center;padding:54px 20px;color:#8990a8;}',
            '.fmx-empty .ti{font-size:40px;opacity:0.3;}',
            '.fmx-empty h3{margin:14px 0 5px;font-size:15px;font-weight:700;color:#e8e8ed;}',
            '.fmx-empty p{margin:0;font-size:12.5px;line-height:1.5;max-width:300px;margin-left:auto;margin-right:auto;}',
            '.fmx-load{text-align:center;padding:54px;color:#8990a8;}',
            '.fmx-card{position:relative;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;transition:border-color 200ms,transform 200ms;}',
            '.fmx-card:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px);}',
            '.fmx-card.fmx-prem{border-color:transparent;box-shadow:0 0 0 1.5px rgba(245,191,79,0.65),0 0 24px rgba(245,191,79,0.35),0 0 60px rgba(245,191,79,0.15);}',
            '.fmx-cov{height:84px;position:relative;overflow:hidden;z-index:1;}',
            '.fmx-cov-bg{position:absolute;inset:0;background-size:cover;background-position:center;}',
            '.fmx-cov-bg::before{content:"";position:absolute;inset:-20%;background:radial-gradient(120% 130% at 22% 8%,rgba(255,255,255,0.4),transparent 55%);animation:fmxBreathe 7s ease-in-out infinite;}',
            '@keyframes fmxBreathe{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(8%,6%) scale(1.12);}}',
            '.fmx-tag{position:absolute;top:9px;left:9px;font-size:9px;font-weight:700;padding:4px 8px;border-radius:6px;background:rgba(10,13,24,0.5);color:#5DCAA5;backdrop-filter:blur(5px);z-index:2;display:flex;align-items:center;gap:4px;}',
            '.fmx-tag.gold{background:linear-gradient(135deg,#fde68a,#f5bf4f);color:#2a1c00;}',
            '.fmx-star{position:absolute;bottom:9px;right:9px;width:30px;height:30px;border-radius:8px;background:rgba(10,13,24,0.45);border:none;color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);z-index:2;}',
            '.fmx-star.on{color:#f59e0b;}',
            '.fmx-cb{padding:13px;position:relative;z-index:2;}',
            '.fmx-crow{display:flex;align-items:center;gap:10px;margin-top:-32px;margin-bottom:11px;position:relative;z-index:2;}',
            '.fmx-av{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;border:2.5px solid #0d1019;flex-shrink:0;}',
            '.fmx-nm{font-size:14px;font-weight:700;display:flex;align-items:center;gap:5px;padding-top:20px;}',
            '.fmx-seal{color:#818cf8;font-size:14px;}',
            '.fmx-meta{font-size:10.5px;color:#8990a8;margin-top:2px;}',
            '.fmx-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}',
            '.fmx-bdg{font-size:10px;font-weight:600;padding:4px 8px;border-radius:7px;display:inline-flex;align-items:center;gap:4px;}',
            '.fmx-bdg i{font-size:11px;}',
            '.fmx-b-live{background:rgba(93,202,165,0.13);color:#5DCAA5;}',
            '.fmx-b-safe{background:rgba(99,102,241,0.13);color:#818cf8;}',
            '.fmx-b-big{background:rgba(245,158,11,0.13);color:#f59e0b;}',
            '.fmx-b-match{background:rgba(139,92,246,0.16);color:#a78bfa;}',
            '.fmx-desc{font-size:12px;color:#b9bdcf;line-height:1.45;margin-bottom:11px;}',
            '.fmx-met{display:flex;align-items:flex-end;gap:0;padding:11px 0;border-top:0.5px solid rgba(255,255,255,0.08);flex-wrap:nowrap;min-width:0;}',
            '.fmx-met>div+div{border-left:1px solid rgba(255,255,255,0.08);padding-left:7px;margin-left:7px;}',
            '.fmx-met>.fmx-sp{margin-left:auto !important;border-left:none;padding-left:6px;}',
            '.fmx-met .l{font-size:8.5px;color:#565b73;text-transform:uppercase;letter-spacing:0.2px;display:flex;align-items:center;gap:3px;margin-bottom:3px;white-space:nowrap;}',
            '.fmx-met .v{font-size:13.5px;font-weight:700;white-space:nowrap;}',
            '.fmx-met .pr{color:#5DCAA5;}',
            '.fmx-sp{margin-left:auto;}',
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
            '.fmx-toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%) translateY(20px);background:rgba(20,24,40,0.96);border:0.5px solid rgba(93,202,165,0.3);color:#5DCAA5;padding:13px 20px;border-radius:12px;font-size:13px;font-weight:600;opacity:0;transition:all 300ms;backdrop-filter:blur(10px);z-index:9300;display:flex;align-items:center;gap:8px;pointer-events:none;}',
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
            '.fmx-lmet{font-size:10px;color:#8990a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;display:flex;align-items:center;gap:6px;}',
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
            '.fmx-toast.err{border-color:rgba(239,68,68,0.4);}',
            '.fmx-cfm{position:fixed;inset:0;z-index:100005;background:rgba(5,7,14,0.6);display:flex;align-items:center;justify-content:center;padding:24px;}',
            '.fmx-cfm-box{background:#141826;border:0.5px solid rgba(255,255,255,0.12);border-radius:16px;padding:18px;max-width:320px;width:100%;box-shadow:0 18px 50px rgba(0,0,0,0.5);}',
            '.fmx-cfm-t{font-size:13px;line-height:1.55;color:#e8e8ed;margin-bottom:14px;}',
            '.fmx-cfm-r{display:flex;gap:8px;}',
            '.fmx-tl{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.09);padding:4px 9px;border-radius:8px;vertical-align:middle;}',
            '.fmx-tl i{width:7px;height:7px;border-radius:50%;background:#262b40;flex-shrink:0;}',
            '.fmx-tl i.red.on{background:#ef4444;box-shadow:0 0 7px rgba(239,68,68,0.8);}',
            '.fmx-tl i.amber.on{background:#f59e0b;box-shadow:0 0 7px rgba(245,158,11,0.8);}',
            '.fmx-tl i.green.on{background:#5DCAA5;box-shadow:0 0 7px rgba(93,202,165,0.8);}',
            '.fmx-tl b{font-size:9.5px;font-weight:700;margin-left:2px;}',
            '.fmx-tlm{background:transparent;border:none;padding:0 2px 0 0;gap:3px;flex-shrink:0;}',
            '.fmx-stk{position:absolute;z-index:6;pointer-events:none;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.35));}',
            '.fmx-stk.drag{pointer-events:auto;cursor:grab;touch-action:none;}',
            '.fmx-stk.drag:active{cursor:grabbing;}',
            '.fmx-stk.sel{outline:1.5px dashed rgba(129,140,248,0.9);outline-offset:3px;}',
            '.fmx-stkh{position:absolute;width:15px;height:15px;border-radius:50%;background:#818cf8;border:2px solid #0b0e18;box-shadow:0 1px 4px rgba(0,0,0,0.5);pointer-events:auto;z-index:9;}',
            '.fmx-stkh.rot{top:-23px;left:50%;margin-left:-8px;cursor:grab;}',
            '.fmx-stkh.rsz{right:-9px;bottom:-9px;cursor:nwse-resize;border-radius:4px;}',
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
            '<div class="fmx-head"><button class="fmx-ibtn" id="fmx-back" style="display:none;margin-right:-2px;"><i class="ti ti-arrow-left"></i></button><div class="fmx-hic" id="fmx-hic"><i class="ti ti-building-store"></i></div>' +
            '<div style="flex:1;min-width:0;overflow:hidden;"><h1 id="fmx-htitle" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Биржа рекламы</h1><p id="fmx-hsub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">База каналов и своя Площадка</p></div>' +
            '<button class="fmx-ibtn" id="fmx-faq"><i class="ti ti-help"></i></button>' +
            '<button class="fmx-ibtn" id="fmx-bm" style="margin-left:7px;"><i class="ti ti-star"></i><span class="fmx-bmc" id="fmx-bmc" style="display:none;">0</span></button>' +
            '<button class="fmx-ibtn" id="fmx-close" style="margin-left:7px;"><i class="ti ti-x"></i></button></div>' +
            '<div id="fmx-mini"><div class="in" id="fmx-miniIn"></div></div>' +
            '<div class="fmx-scroll" id="fmx-scrollEl"><div class="fmx-pad" id="fmx-main"></div></div>';
        document.body.appendChild(d);
        _root = d;
        el('fmx-close').addEventListener('click', close);
        el('fmx-faq').addEventListener('click', openFaq);
        el('fmx-bm').addEventListener('click', openBookmarks);
        el('fmx-back').addEventListener('click', function () { _haptic('light'); setMainTab('enter'); });
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
        var back = el('fmx-back'); if (back) back.style.display = t === 'enter' ? 'none' : 'flex';
        var hic = el('fmx-hic'); if (hic) hic.style.display = t === 'enter' ? 'flex' : 'none';
        var ti = el('fmx-htitle'), su = el('fmx-hsub');
        if (ti && su) {
            if (t === 'catalog') { ti.textContent = 'База каналов'; su.textContent = 'Всё, что нашёл бот'; }
            else if (t === 'market') { ti.textContent = 'Площадка'; su.textContent = 'ForgeMetrics · живые заявки'; }
            else { ti.textContent = 'Биржа рекламы'; su.textContent = 'База каналов и своя Площадка'; }
        }
        var host = el('fmx-main');
        host.classList.remove('fmx-fade'); void host.offsetWidth; host.classList.add('fmx-fade');
        if (t === 'catalog') renderCatalog();
        else if (t === 'market') renderMarket();
        else renderEnter();
        checkMini();
    }

    /* ===================== render: enter ===================== */
    function renderEnter() {
        var host = el('fmx-main');
        host.innerHTML =
            '<div class="fmx-entq">Выбери, где искать:</div>' +
            '<div class="fmx-ent" data-go="catalog"><div class="fmx-entic" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);"><i class="ti ti-database"></i></div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-entn">База каналов <span class="fmx-enttag" style="background:rgba(99,102,241,0.18);color:#818cf8;">весь Telegram</span></div>' +
            '<div class="fmx-entd">Всё, что нашёл бот. Находишь подходящий канал — пишешь владельцу сам.</div></div>' +
            '<i class="ti ti-chevron-right" style="color:#565b73;font-size:20px;"></i></div>' +
            '<div class="fmx-ent" data-go="market"><div class="fmx-entic" style="background:linear-gradient(135deg,#5DCAA5,#10b981);"><i class="ti ti-building-store"></i></div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-entn">Площадка ForgeMetrics <span class="fmx-enttag" style="background:rgba(93,202,165,0.18);color:#5DCAA5;">живые заявки</span></div>' +
            '<div class="fmx-entd">Каналы выставили рекламу сами: цена названа, карточки оформлены. Или выстави свой канал.</div></div>' +
            '<i class="ti ti-chevron-right" style="color:#565b73;font-size:20px;"></i></div>' +
            '<div class="fmx-note" style="margin-top:6px;"><i class="ti ti-info-circle"></i> <span><b style="color:#e8e8ed;">База</b> — справочник всех каналов, пишешь им сам. <b style="color:#e8e8ed;">Площадка</b> — те, кто готов к сделке, и место оформить карточку своего канала.</span></div>';
        qsa(host, '.fmx-ent').forEach(function (c) { c.addEventListener('click', function () { _haptic('light'); setMainTab(c.getAttribute('data-go')); }); });
    }

    /* ===================== loaders ===================== */
    function loadFeed() {
        _feedState = 'loading';
        apiGet('/api/v1/marketplace/listings').then(function (r) {
            _feed = (r && r.listings) ? r.listings : []; _feedState = 'ready';
            if (_mainTab === 'market' && _subTab === 'buy') renderBuy();
        }).catch(function () { _feedState = 'error'; if (_mainTab === 'market' && _subTab === 'buy') renderBuy(); });
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
        else body = (_view === 'cards' ? '<div class="fmx-grid">' + _catalog.map(simpleCard).join('') + '</div>' : '<div style="display:flex;flex-direction:column;gap:8px;">' + _catalog.map(function (x) { return listItem(x, false, true); }).join('') + '</div>');
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

    function renderBuy() {
        var sub = el('fmx-sub'); if (!sub) return;
        if (_feed == null && _feedState === 'idle') loadFeed();
        if (!_chLoaded && !_chLoading) {
            _chLoading = true;
            loadChannels().then(function () { _chLoaded = true; _chLoading = false; if (_mainTab === 'market' && _subTab === 'buy') renderBuy(); }).catch(function () { _chLoading = false; _chLoaded = true; });
        }
        var bar = sortBarHtml() + topRowHtml();
        var body;
        if (_feedState === 'loading') body = loadHtml();
        else if (_feedState === 'error') body = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и попробуй ещё раз.');
        else if (!_feed || !_feed.length) body = emptyHtml('ti-building-store', 'Пока пусто', 'Здесь появятся оформленные карточки каналов от наших пользователей. Будь первым — оформи свой канал во вкладке «Создать».');
        else {
            var feed = _applySort(_feed);
            if (!feed.length) body = emptyHtml('ti-filter-off', 'По фильтру пусто', 'В выбранной нише пока нет карточек. Попробуй «Все каналы».');
            else body = (_view === 'cards' ? '<div class="fmx-grid">' + feed.map(fullCard).join('') + '</div>' : '<div style="display:flex;flex-direction:column;gap:8px;">' + feed.map(function (x) { return listItem(x); }).join('') + '</div>');
        }
        sub.innerHTML = '<div class="fmx-note fmx-gr"><i class="ti ti-building-store"></i> Здесь каналы продают рекламу. Смотри метрики, сравнивай цены и пиши владельцу — сделка напрямую, без комиссии.</div>' + bar + body;
        bindSort(); bindView(); bindCards(); if (_view === 'list') bindList(sub);
    }

    var REQ_FMT = { any: 'Любой формат', feed_native: 'В ленте', post_24h: 'На 24 часа', pinned: 'Закреп', stories: 'Сторис', circle: 'Кружок' };
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
        else if (!_reqs || !_reqs.length) body = emptyHtml('ti-speakerphone', 'Заявок пока нет', 'Будь первым: размести заявку — владельцы подходящих каналов напишут сами.');
        else body = '<div style="display:flex;flex-direction:column;gap:9px;">' + _reqs.map(reqCard).join('') + '</div>';
        sub.innerHTML = '<div class="fmx-note"><i class="ti ti-speakerphone"></i> Заявки рекламодателей: «ищу каналы под задачу, бюджет такой-то». Твой канал подходит — откликайся первым. Сам покупаешь рекламу — размести свою заявку.</div>' +
            '<button class="fmx-save" id="fmx-newreq" style="margin:0 0 14px;"><i class="ti ti-plus"></i> Разместить заявку</button>' + body;
        el('fmx-newreq').addEventListener('click', openReqForm);
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
            '<textarea class="fmx-inp" id="fmx-rep-c" rows="3" maxlength="300" placeholder="Что не так? Чем конкретнее — тем быстрее разберём."></textarea>' +
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
                toast(r && r.hidden ? 'Скрыто до проверки — спасибо' : 'Жалоба отправлена — проверим');
                if (r && r.hidden) {
                    if (target.listing_id) { _feed = null; _feedState = 'idle'; if (_subTab === 'buy') renderBuy(); }
                    else { _reqs = null; _reqState = 'idle'; if (_subTab === 'sell') renderSell(); }
                }
            }).catch(function () { btn.disabled = false; uiAlert('Не удалось отправить — попробуй ещё раз.'); });
        });
        showModal('fmx-repBg');
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
            { on: true, format: 'feed_native', n: 'Размещение в ленте', p: 5500 },
            { on: false, format: 'pinned', n: 'Закреплённое 24ч', p: 8000 },
            { on: false, format: 'stories', n: 'В сторис', p: 3000 },
            { on: false, format: 'circle', n: 'В кружке', p: 3000 }
        ];
    }
    function hydrate(l) {
        _ss.listingId = l.id;
        _ss._status = l.status || null;
        _ss.sticker = l.sticker_json || l.sticker || null;
        if (_ss.sticker) stkEnsureBox(_ss.sticker);
        if (l.accent_color) _ss.color = l.accent_color;
        if (l.cover_gradient) { var gi = COVERS.indexOf(l.cover_gradient); if (gi >= 0) { _ss.cover = gi; _ss.coverGrad = null; } else _ss.coverGrad = l.cover_gradient; }
        if (l.cover_type) _ss.covType = (l.cover_type === 'gif') ? 'img' : l.cover_type;
        var fx = l.effects_json || {};
        ['move', 'over', 'glow', 'orbit'].forEach(function (k) { if (fx[k]) _ss[k] = fx[k]; });
        _ss.glowCard = !!fx.glowCard;
        _ss.glass = (fx.glass === true) ? 'frost' : (typeof fx.glass === 'string' ? fx.glass : 'none');
        if (fx.atomColor) _ss.atomColor = fx.atomColor;
        _ss.starPos = fx.starPos || 'cover';
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
        _ss = defaultState(); _sfmts = defaultFmts(); _ss.sticker = null; _ss.channelId = id;
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
            return '<div class="fmx-chrow' + (c.id === _ss.channelId ? ' sel' : '') + (pub ? '' : ' dis') + '" data-cid="' + c.id + '" data-pub="' + (pub ? 1 : 0) + '"><div class="fmx-chav"' + (pub ? '' : ' style="background:rgba(255,255,255,0.08);color:#8990a8;"') + '>' + _esc((c.title || c.username || '?').charAt(0)) + '</div><div style="flex:1;min-width:0;"><div class="fmx-chtt">' + _esc(c.title || (pub ? '@' + c.username : 'Канал')) + '</div><div class="fmx-chuu">' + (pub ? '@' + _esc(c.username) : 'приватный — нужен публичный @username') + '</div></div>' + (pub ? (listingForChannel(c.id) ? '<i class="ti ti-circle-check-filled" style="color:#5DCAA5;flex-shrink:0;"></i>' : '') : '<i class="ti ti-lock" style="color:#565b73;flex-shrink:0;"></i>') + '</div>';
        }).join('');
        sub.innerHTML =
            '<div class="fmx-hero" id="fmx-hero"></div>' +
            '<div style="font-size:10px;color:#565b73;text-align:center;margin:-12px 0 12px;"><i class="ti ti-hand-click"></i> Тапни по части карточки, чтобы её изменить</div>' +
            '<div id="fmx-hlist" style="margin:-4px 0 16px;"></div>' +
            '<div class="fmx-chdd" id="fmx-chdd"><button class="fmx-chbtn" id="fmx-chbtn" type="button"><i class="ti ti-broadcast lead"></i><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(cur ? ('@' + cur.username + (cur.title ? ' · ' + cur.title : '')) : 'Выбери канал') + '</span><i class="ti ti-chevron-down chev"></i></button><div class="fmx-chlist">' + rows + '</div></div>' +
            '<div class="fmx-chnote">' + (existing ? 'Редактируешь карточку · статус: ' + _esc(existing.status_human || existing.status || '—') : 'Новое размещение для этого канала') + '</div>' +
            accSec('cover', 'ti-photo', 'Обложка', paneCover()) +
            accSec('avatar', 'ti-user-circle', 'Аватар', paneAvatar()) +
            accSec('fx', 'ti-sparkles', 'Эффекты аватара', paneFx()) +
            accSec('sticker', 'ti-sticker', 'Стикер', '<div id="fmx-stkBody">' + loadHtml() + '</div>') +
            accSec('style', 'ti-palette', 'Стиль', paneStyleMin()) +
            accSec('price', 'ti-cash', 'Форматы и цены', panePrice()) +
            accSec('text', 'ti-text-caption', 'Текст', paneText()) +
            '<button class="fmx-save" id="fmx-save" style="margin-top:18px;"><i class="ti ti-rocket"></i> ' + (_ss.listingId ? 'Сохранить карточку' : 'Опубликовать на Площадке') + '</button>' +
            (_ss.listingId ? '<div style="display:flex;gap:8px;margin-top:10px;">' +
                '<button class="fmx-btn" id="fmx-lpause">' + (_ss._status === 'paused' ? '<i class="ti ti-player-play"></i>Возобновить' : '<i class="ti ti-snowflake"></i>Заморозить') + '</button>' +
                '<button class="fmx-btn" id="fmx-ldel" style="color:#ef4444;border-color:rgba(239,68,68,0.3);"><i class="ti ti-trash"></i>Удалить</button></div>' : '') +
            '<div class="fmx-savenote">После публикации карточка пройдёт проверку по смыслу. Опции с замком применяются при активном продвижении на 30 дней.</div>';
        var dd = el('fmx-chdd');
        el('fmx-chbtn').addEventListener('click', function (e) { e.stopPropagation(); dd.classList.toggle('on'); });
        qsa(dd, '.fmx-chrow').forEach(function (r) { r.addEventListener('click', function () { if (r.getAttribute('data-pub') !== '1') { toast('Нужен публичный @username — включи его в настройках канала в Telegram'); return; } dd.classList.remove('on'); _haptic('light'); selectChannel(+r.getAttribute('data-cid')); }); });
        qsa(sub, '.fmx-acc .fmx-acch').forEach(function (h) { h.addEventListener('click', function () { var id = h.parentNode.getAttribute('data-ac'); openAcc(_secCreate === id ? null : id, false); }); });
        el('fmx-save').addEventListener('click', saveStudio);
        loadStickerPane();
        var lp = el('fmx-lpause');
        if (lp) lp.addEventListener('click', function () {
            var act = _ss._status === 'paused' ? 'resume' : 'pause';
            lp.disabled = true;
            apiPost('/api/v1/marketplace/listings/' + _ss.listingId + '/' + act, {}).then(function (r) {
                lp.disabled = false;
                if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не получилось'); return; }
                _haptic('success');
                _ss._status = act === 'pause' ? 'paused' : 'published';
                for (var i = 0; i < _myListings.length; i++) if (_myListings[i].id === _ss.listingId) { _myListings[i].status = _ss._status; _myListings[i].status_human = _ss._status === 'paused' ? 'На паузе' : 'Опубликовано'; }
                toast(act === 'pause' ? 'Карточка заморожена — с Площадки убрана, вернёшь в любой момент' : 'Карточка снова на Площадке');
                _feed = null; _feedState = 'idle';
                selectChannel(_ss.channelId);
            }).catch(function () { lp.disabled = false; uiAlert('Не получилось — попробуй ещё раз.'); });
        });
        var ld = el('fmx-ldel');
        if (ld) ld.addEventListener('click', function () {
            uiConfirm('Удалить карточку с Площадки навсегда? Оформление и продвижение не сохранятся.', function () {
                ld.disabled = true;
                apiRequest('/api/v1/marketplace/listings/' + _ss.listingId, { method: 'DELETE' }).then(function (r) {
                    ld.disabled = false;
                    if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не получилось удалить'); return; }
                    _haptic('success'); toast('Карточка удалена');
                    var delId = _ss.listingId;
                    _myListings = _myListings.filter(function (x) { return x.id !== delId; });
                    _ss.listingId = null; _ss._status = null;
                    _feed = null; _feedState = 'idle';
                    selectChannel(_ss.channelId);
                }).catch(function () { ld.disabled = false; uiAlert('Не получилось — попробуй ещё раз.'); });
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
            mediaBoxHtml('cover', 'Картинка, GIF или видео до 30 секунд, до 50 МБ. Лучше всего смотрится от 1600×800 — подгонишь кадрированием. Что нельзя использовать — в Справке, раздел «Правила».') + '</div>';
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
            '<div id="fmx-avbox" style="margin-top:10px;' + (_ss.avatar === 'img' ? '' : 'display:none;') + '">' + mediaBoxHtml('avatar', 'Фото или GIF, до 50 МБ. Лучше всего от 400×400 — подгонишь кадрированием. Правила — в Справке.') + '</div>';
    }
    function paneFx() {
        return fxChips('move', FX_MOVE, 'Движение') +
            fxChips('over', FX_OVER, 'Поверхность') +
            fxChips('glow', FX_GLOW, 'Свечение') +
            fxChips('orbit', FX_ORBIT, 'Орбита') +
            atomRow() +
            fxChips('glass', FX_GLASS, 'Стеклянные кнопки') +
            '<div class="fmx-tog' + (_ss.glowCard ? ' on' : '') + '" id="fmx-glowcard" style="margin-top:12px;"><div class="fmx-sw"><i></i></div><span style="font-size:12.5px;">Золотое свечение карточки <i class="ti ti-lock" style="font-size:10px;color:#f5bf4f;"></i></span></div>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:6px;"><i class="ti ti-info-circle"></i> Движение, Поверхность и Свечение — бесплатно. <span style="color:#f5bf4f;">Опции с замком можно примерить в предпросмотре — применятся с продвижением на 30 дней (29 990 ₽).</span></div>';
    }
    function paneStyleMin() {
        return '<span class="fmx-lbl">Акцент — цена и кнопка</span>' + colorPick('fmx-colors', _ss.color) +
            '<span class="fmx-lbl fmx-mt2">Шрифт заголовка</span><div class="fmx-mtabs" id="fmx-font">' +
            FONTS.map(function (f) { return '<button class="fmx-mt' + (f[0] === _ss.font ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
            '<span class="fmx-lbl fmx-mt2" style="color:#f5bf4f;">Фон карточки <i class="ti ti-lock" style="font-size:10px;"></i></span>' +
            '<div id="fmx-bodybox">' + mediaBoxHtml('cardbg', 'Картинка, GIF или видео внутри карточки, где цифры и кнопки — эксклюзив продвижения на 30 дней. Подложка под цифрами затемняется автоматически, читаемость не страдает.') + '</div>';
    }
    function hslHex(h) {
        var s = 0.85, l = 0.62, c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
        function q(v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }
        return '#' + q(r) + q(g) + q(b);
    }
    function hexHue(hex) {
        var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 200;
        var n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
        if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h = Math.round(h * 60); if (h < 0) h += 360; }
        return h;
    }
    function colorPick(idBase, cur, sz) {
        var st = sz ? 'width:' + sz + 'px;height:' + sz + 'px;' : '';
        var custom = COLORS.indexOf(cur) < 0;
        return '<div class="fmx-dots" id="' + idBase + '">' +
            COLORS.map(function (c) { return '<div class="fmx-dot' + (c === cur ? ' on' : '') + '" data-cv="' + c + '" style="background:' + c + ';' + st + '"></div>'; }).join('') +
            '<div class="fmx-dot fmx-dot-rb' + (custom ? ' on' : '') + '" data-rb="1" style="' + st + (custom ? 'box-shadow:0 0 0 2px ' + cur + ';' : '') + '" title="Свой цвет"></div></div>' +
            '<div class="fmx-huerow" id="' + idBase + '-hue" style="' + (custom ? '' : 'display:none;') + '"><input type="range" min="0" max="359" step="1" value="' + hexHue(cur) + '"><div class="fmx-hueprev" style="background:' + cur + ';"></div></div>';
    }
    function bindColorPick(idBase, set) {
        var box = el(idBase); if (!box) return;
        var hueRow = el(idBase + '-hue'), slider = hueRow ? hueRow.querySelector('input') : null, prev = hueRow ? hueRow.querySelector('.fmx-hueprev') : null, rb = box.querySelector('[data-rb]');
        function mark(v) {
            var preset = COLORS.indexOf(v) >= 0;
            qsa(box, '.fmx-dot').forEach(function (d) { d.classList.toggle('on', d.getAttribute('data-cv') === v || (d === rb && !preset)); });
            if (rb) rb.style.boxShadow = preset ? '' : '0 0 0 2px ' + v;
            if (prev) prev.style.background = v;
        }
        qsa(box, '[data-cv]').forEach(function (d) { d.addEventListener('click', function () { var v = d.getAttribute('data-cv'); if (hueRow) hueRow.style.display = 'none'; set(v); mark(v); renderHero(); }); });
        if (rb) rb.addEventListener('click', function () { if (!hueRow) return; var open = hueRow.style.display !== 'none'; hueRow.style.display = open ? 'none' : 'flex'; if (!open && slider) { var v = hslHex(+slider.value); set(v); mark(v); renderHero(); } });
        if (slider) slider.addEventListener('input', function () { var v = hslHex(+this.value); set(v); mark(v); renderHero(); });
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
        var note = '<div class="fmx-note" style="margin-top:4px;"><i class="ti ti-bulb"></i> Бот подскажет справедливую цену по метрикам канала — итоговую назначаешь сам. Включённые форматы видны рекламодателю прямо на карточке.</div>';
        var slots = '<span class="fmx-lbl fmx-mt2"><i class="ti ti-calendar"></i> Свободные слоты</span><input class="fmx-inp" id="fmx-slots" value="' + _esc(_ss._slots || '') + '" placeholder="напр. 2 слота в неделю">';
        return '<span class="fmx-lbl">Что продаёшь и почём</span><div id="fmx-fmts">' + fmtRows() + '</div>' + note + slots;
    }
    function bindFmtRows() {
        qsa(el('fmx-fmts'), '.fmx-chk').forEach(function (c) { c.addEventListener('click', function (ev) { if (ev.target && ev.target.classList && ev.target.classList.contains('fmx-pinp')) return; var i = +c.getAttribute('data-fi'); _sfmts[i].on = !_sfmts[i].on; _haptic('light'); el('fmx-fmts').innerHTML = fmtRows(); bindFmtRows(); renderHero(); }); });
        qsa(el('fmx-fmts'), '[data-pi]').forEach(function (inp) { inp.addEventListener('click', function (e) { e.stopPropagation(); }); inp.addEventListener('input', function () { _sfmts[+inp.getAttribute('data-pi')].p = +inp.value || 0; renderHero(); }); });
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
        inp.accept = target === 'avatar' ? 'image/*' : 'image/*,video/mp4';
        inp.addEventListener('change', function () {
            var fl = inp.files && inp.files[0]; if (!fl) return;
            if (fl.size > 50 * 1024 * 1024) { uiAlert('Файл больше 50 МБ — сожми его или выбери другой.'); return; }
            var kind = fl.type.indexOf('video') === 0 ? 'video' : (fl.type === 'image/gif' ? 'gif' : 'img');
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
            (target === 'cardbg' ? '<div class="fmx-safeT"></div><div class="fmx-safeB"></div><div class="fmx-safeF"><span>Зона карточки — видна на 100%</span></div>' : '') +
            (target === 'avatar' ? '<div class="fmx-safeR"></div>' : '');
        el('fmx-cropHint').textContent = target === 'avatar' ? 'Пунктирный контур — видимая зона аватара, углы срежутся скруглением.' : (target === 'cardbg' ? 'Пунктирная полоса — видимая часть тела карточки. Цифры затемняются подложкой автоматически.' : 'Пунктирная полоса — то, что видно в шапке карточки. Затемнённое сверху и снизу в шапку не попадает.');
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
        if (l.avatar_url) core = '<div class="fmx-av fx-c-' + ov + '" style="background:' + accent + ';overflow:hidden;"><img src="' + mediaAbs(l.avatar_url) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' + _posStyle(at.avatar) + '">' + over + '</div>';
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
    var STK_PAD = 3;    // невидимый бордер вокруг контента
    var STK_DEFBOX = { l: 0.12, t: 0.12, r: 0.88, b: 0.88 };
    var _stkBoxes = {};  // url -> прямоугольник видимых пикселей (доли)
    function _scanAlpha(source, url) {
        try {
            var cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
            var ctx = cv.getContext('2d');
            ctx.drawImage(source, 0, 0, 64, 64);
            var d = ctx.getImageData(0, 0, 64, 64).data;
            var minX = 64, minY = 64, maxX = -1, maxY = -1;
            for (var y = 0; y < 64; y++) for (var x = 0; x < 64; x++) {
                if (d[(y * 64 + x) * 4 + 3] > 20) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
            if (maxX < 0) return;
            _stkBoxes[url] = { l: minX / 64, t: minY / 64, r: (maxX + 1) / 64, b: (maxY + 1) / 64 };
        } catch (e) { /* canvas tainted и т.п. — остаёмся на запасном хитбоксе */ }
    }
    function stkEnsureBox(s) {
        if (!s || !s.url || _stkBoxes[s.url]) return;
        var abs = mediaAbs(s.url);
        try {
            if (s.kind === 'webm') {
                var v = document.createElement('video');
                v.crossOrigin = 'anonymous'; v.muted = true; v.preload = 'auto'; v.src = abs;
                v.addEventListener('loadeddata', function () { _scanAlpha(v, s.url); }, { once: true });
            } else if (s.kind === 'webp') {
                var im = new Image();
                im.crossOrigin = 'anonymous';
                im.onload = function () { _scanAlpha(im, s.url); };
                im.src = abs;
            }
        } catch (e) {}
    }
    function stkBox(s) { return (s && s.url && _stkBoxes[s.url]) || STK_DEFBOX; }
    function stkRects(card) {
        var base = card.getBoundingClientRect(), out = [];
        function push(r) {
            if (!r || (!r.width && !r.height)) return;
            out.push({ l: r.left - base.left - STK_PAD, t: r.top - base.top - STK_PAD, r: r.right - base.left + STK_PAD, b: r.bottom - base.top + STK_PAD });
        }
        function pushText(n) { /* обтягивающий прямоугольник текста, не блока */
            try { var rg = document.createRange(); rg.selectNodeContents(n); var r = rg.getBoundingClientRect(); if (r.width || r.height) { push(r); return; } } catch (e) {}
            push(n.getBoundingClientRect());
        }
        qsa(card, '.fmx-tag,.fmx-star').forEach(function (n) { push(n.getBoundingClientRect()); });
        var crow = card.querySelector('.fmx-crow');
        if (crow) {
            if (crow.firstElementChild) push(crow.firstElementChild.getBoundingClientRect()); /* аватар */
            qsa(crow, '.fmx-nm,.fmx-meta').forEach(pushText);
        }
        qsa(card, '.fmx-badges>*').forEach(function (n) { push(n.getBoundingClientRect()); });
        qsa(card, '.fmx-met>div').forEach(function (n) { push(n.getBoundingClientRect()); });
        var acts = card.querySelector('.fmx-acts'); if (acts) push(acts.getBoundingClientRect());
        qsa(card, '[data-nostk]').forEach(function (n) {
            if (n.children.length && n.getAttribute('data-nostk') !== 'text') qsa(n, ':scope>*').forEach(function (ch) { push(ch.getBoundingClientRect()); });
            else pushText(n);
        });
        return { rects: out, W: base.width, H: base.height };
    }
    function stkValid(cx, cy, size, geo, box) {
        var full = size / 2;
        if (cx - full < 2 || cy - full < 2 || cx + full > geo.W - 2 || cy + full > geo.H - 2) return false;
        box = box || STK_DEFBOX;
        var l = cx + size * (box.l - 0.5), r = cx + size * (box.r - 0.5);
        var t = cy + size * (box.t - 0.5), b = cy + size * (box.b - 0.5);
        for (var i = 0; i < geo.rects.length; i++) {
            var z = geo.rects[i];
            if (l < z.r && r > z.l && t < z.b && b > z.t) return false;
        }
        return true;
    }
    function stkFindSpot(size, geo) {
        var cands = [[0.84, 40], [0.5, 40], [0.16, 40], [0.84, SEAM + 4], [0.16, SEAM + 4], [0.5, SEAM - 6], [0.84, SEAM + 40], [0.16, SEAM + 40]];
        var bx = _ss && _ss.sticker ? stkBox(_ss.sticker) : null;
        for (var i = 0; i < cands.length; i++) {
            var cx = cands[i][0] * geo.W, cy = cands[i][1];
            if (stkValid(cx, cy, size, geo, bx)) return { cx: cx, cy: cy };
        }
        for (var y = 20; y < geo.H - 20; y += 12)
            for (var x = 24; x < geo.W - 24; x += 16)
                if (stkValid(x, y, size, geo, bx)) return { cx: x, cy: y };
        return null;
    }
    function stkSize(s, W) { return Math.max(40, Math.min(64 * (s.scale || 1), Math.min(96, W * 0.28))); }
    function stkPos(s, W) {
        var size = stkSize(s, W);
        if ((s.mode || 'slot') === 'slot') return { size: size, left: W - size - 12, top: SEAM - size * 0.55 };
        var cx = Math.max(size / 2 + 3, Math.min((s.x != null ? s.x : 0.82) * W, W - size / 2 - 3));
        var cy = Math.max(size / 2 + 3, SEAM + (s.dy != null ? s.dy : 0));
        return { size: size, left: cx - size / 2, top: cy - size / 2 };
    }
    function stkMedia(s, animate) {
        if (s.kind === 'webm') return '<video src="' + _esc(mediaAbs(s.url)) + '" muted playsinline loop preload="metadata"' + (animate ? ' autoplay' : '') + ' style="width:100%;height:100%;object-fit:contain;pointer-events:none;"></video>';
        if (s.kind === 'tgs') return '<span class="fmx-stk-lot" data-tgs="' + _esc(s.url) + '" data-anim="' + (animate ? 1 : 0) + '"><i class="ti ti-sticker"></i></span>';
        return '<img src="' + _esc(mediaAbs(s.url)) + '" alt="" style="width:100%;height:100%;object-fit:contain;pointer-events:none;">';
    }
    function stkOverlay(s, W, animate, draggable) {
        if (!s || !s.url) return '';
        var p = stkPos(s, W);
        var handles = (draggable && (s.mode || 'slot') === 'free') ? '<i class="fmx-stkh rot" title="Крутить"></i><i class="fmx-stkh rsz" title="Размер"></i>' : '';
        return '<div class="fmx-stk' + (draggable ? ' drag' : '') + ((draggable && (s.mode || 'slot') === 'free') ? ' sel' : '') + '" id="' + (draggable ? 'fmx-stkPrev' : '') + '" style="left:' + p.left.toFixed(1) + 'px;top:' + p.top.toFixed(1) + 'px;width:' + p.size + 'px;height:' + p.size + 'px;transform:rotate(' + (s.rot || 0) + 'deg);">' + stkMedia(s, animate) + handles + '</div>';
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
    function hydrateTgs(root) {
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
            html = '<div style="font-size:11.5px;color:#8990a8;line-height:1.6;">Коллекция пуста. Отправь боту в личку любой стикер или премиум-эмодзи — он появится здесь.</div>' +
                '<button class="fmx-btn" id="fmx-stk-bot" style="margin-top:10px;"><i class="ti ti-brand-telegram"></i>Открыть бота</button>';
        } else {
            html = '<div class="fmx-stkgrid">' + _stickers.map(function (st) {
                var sel = s && s.sticker_id === st.id;
                return '<div class="fmx-stkcell' + (sel ? ' on' : '') + '" data-sid="' + st.id + '">' + stkMedia(st, true) +
                    (st.kind === 'tgs' ? '<span class="fmx-stk-anim">аним.</span>' : '') +
                    '<button class="fmx-stkdel" data-sdel="' + st.id + '" title="Удалить из коллекции">&times;</button></div>';
            }).join('') + '</div>' +
                '<div style="font-size:10px;color:#565b73;margin-top:8px;">Пополнение — отправкой стикера боту в личку. ' + _stickers.length + '/30.</div>';
            if (s) {
                var free = (s.mode || 'slot') === 'free';
                html += '<div class="fmx-fxw" style="margin-top:12px;">' +
                    '<button class="fmx-fx' + (!free ? ' on' : '') + '" data-smode="slot">В кармашке</button>' +
                    '<button class="fmx-fx' + (free ? ' on' : '') + '" data-smode="free">Свободно</button>' +
                    '<button class="fmx-fx" data-sclear="1" style="margin-left:auto;color:#ef4444;">Убрать</button></div>';
                if (free) {
                    html += '<div class="fmx-stkrow"><span>Размер</span><input type="range" id="fmx-stk-sc" min="0.6" max="1.6" step="0.05" value="' + (s.scale || 1) + '"></div>' +
                        '<div class="fmx-stkrow"><span>Наклон</span><input type="range" id="fmx-stk-rot" min="-25" max="25" step="1" value="' + (s.rot || 0) + '"></div>' +
                        '<div style="font-size:10px;color:#565b73;margin-top:6px;"><i class="ti ti-hand-move"></i> Перетащи стикер прямо на карточке-превью. Зона — шапка и верх карточки.</div>';
                }
                if (s.kind !== 'webp') html += '<div style="font-size:10px;color:#f59e0b;margin-top:8px;"><i class="ti ti-lock"></i> Анимация в публичной ленте — при продвижении. Без него покажем стоп-кадр.</div>';
            }
        }
        box.innerHTML = html;
        var bo = el('fmx-stk-bot'); if (bo) bo.addEventListener('click', function () { openTg('ForgeMetricsBot'); });
        qsa(box, '[data-sid]').forEach(function (cell) {
            cell.addEventListener('click', function (e) {
                if (e.target.getAttribute && e.target.getAttribute('data-sdel')) return;
                var st = _stickers.filter(function (x) { return x.id === +cell.getAttribute('data-sid'); })[0];
                if (!st) return;
                var prev = _ss.sticker || { mode: 'slot', x: 0.82, anchor: 'seam', dy: 0, scale: 1, rot: 0 };
                _ss.sticker = { sticker_id: st.id, url: st.url, kind: st.kind, mode: prev.mode, x: prev.x, anchor: 'seam', dy: prev.dy, scale: prev.scale, rot: prev.rot };
                stkEnsureBox(_ss.sticker);
                _haptic('light'); renderStickerPane(); renderHero();
            });
        });
        qsa(box, '[data-sdel]').forEach(function (b) {
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = +b.getAttribute('data-sdel');
                uiConfirm('Удалить стикер из коллекции?', function () {
                    apiRequest('/api/v1/marketplace/stickers/' + id, { method: 'DELETE' }).then(function () {
                        _stickers = _stickers.filter(function (x) { return x.id !== id; });
                        if (_ss.sticker && _ss.sticker.sticker_id === id) { _ss.sticker = null; renderHero(); }
                        renderStickerPane();
                    }).catch(function () { uiAlert('Не получилось удалить — попробуй ещё раз.'); });
                });
            });
        });
        qsa(box, '[data-smode]').forEach(function (b) {
            b.addEventListener('click', function () {
                _ss.sticker.mode = b.getAttribute('data-smode');
                if (_ss.sticker.mode === 'free') stkEnsureSpot();
                _haptic('light'); renderStickerPane(); renderHero();
            });
        });
        var cl = qsa(box, '[data-sclear]')[0];
        if (cl) cl.addEventListener('click', function () { _ss.sticker = null; _haptic('light'); renderStickerPane(); renderHero(); });
        var sc = el('fmx-stk-sc'); if (sc) sc.addEventListener('input', function () {
            var want = +sc.value;
            var card = el('fmx-hero') && el('fmx-hero').querySelector('.fmx-card');
            if (card && (_ss.sticker.mode || 'slot') === 'free') {
                var geo = stkRects(card);
                var cx = (_ss.sticker.x || 0.82) * geo.W, cy = SEAM + (_ss.sticker.dy || 0);
                var size = stkSize({ scale: want }, geo.W);
                var bx = stkBox(_ss.sticker);
                while (size > 40 && !stkValid(cx, cy, size, geo, bx)) size -= 2;
                want = Math.min(want, size / 64);
                sc.value = want;
            }
            _ss.sticker.scale = want; renderHero();
        });
        var ro = el('fmx-stk-rot'); if (ro) ro.addEventListener('input', function () { _ss.sticker.rot = +ro.value; renderHero(); });
        var av = el('fmx-accv-sticker'); if (av) av.textContent = s ? ((s.mode || 'slot') === 'slot' ? 'В кармашке' : 'Свободно') : 'Нет';
        hydrateTgs(box);
    }
    function stkEnsureSpot() {
        var hero = el('fmx-hero'), card = hero && hero.querySelector('.fmx-card');
        if (!card || !_ss.sticker) return;
        var geo = stkRects(card);
        if (!geo.W) return;
        var size = stkSize(_ss.sticker, geo.W);
        var cx = (_ss.sticker.x || 0.82) * geo.W, cy = SEAM + (_ss.sticker.dy || 0);
        if (stkValid(cx, cy, size, geo, stkBox(_ss.sticker))) return;
        var spot = stkFindSpot(size, geo);
        if (!spot) { spot = stkFindSpot(40, geo); if (spot) _ss.sticker.scale = 40 / 64; }
        if (spot) { _ss.sticker.x = spot.cx / geo.W; _ss.sticker.dy = Math.round(spot.cy - SEAM); }
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
                var y = Math.max(STAR_SLOTS.top, Math.min(t.clientY - r.top - 15, STAR_SLOTS.body));
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
    function bindStickerDrag(cardEl) {
        var elS = el('fmx-stkPrev'); if (!elS || !cardEl) return;
        var geo = null, last = null;
        function move(clientX, clientY) {
            if (!geo) geo = stkRects(cardEl);
            var W = geo.W, size = stkSize(_ss.sticker, W);
            var r = cardEl.getBoundingClientRect();
            var cx = clientX - r.left, cy = clientY - r.top;
            if (!last) last = { cx: (_ss.sticker.x || 0.82) * W, cy: SEAM + (_ss.sticker.dy || 0) };
            var bx = stkBox(_ss.sticker);
            var nx = cx, ny = cy;
            if (!stkValid(nx, ny, size, geo, bx)) {
                if (stkValid(nx, last.cy, size, geo, bx)) ny = last.cy;
                else if (stkValid(last.cx, ny, size, geo, bx)) nx = last.cx;
                else { nx = last.cx; ny = last.cy; }
            }
            last = { cx: nx, cy: ny };
            _ss.sticker.x = nx / W; _ss.sticker.dy = Math.round(ny - SEAM); _ss.sticker.anchor = 'seam';
            var p = stkPos(_ss.sticker, W);
            elS.style.left = p.left + 'px'; elS.style.top = p.top + 'px';
        }
        function center() {
            if (!geo) geo = stkRects(cardEl);
            return { cx: (_ss.sticker.x || 0.82) * geo.W, cy: SEAM + (_ss.sticker.dy || 0) };
        }
        function applyBox() {
            if (!geo) geo = stkRects(cardEl);
            var p = stkPos(_ss.sticker, geo.W);
            elS.style.left = p.left + 'px'; elS.style.top = p.top + 'px';
            elS.style.width = p.size + 'px'; elS.style.height = p.size + 'px';
            elS.style.transform = 'rotate(' + (_ss.sticker.rot || 0) + 'deg)';
            var sc = el('fmx-stk-sc'); if (sc) sc.value = _ss.sticker.scale || 1;
            var ro = el('fmx-stk-rot'); if (ro) ro.value = _ss.sticker.rot || 0;
        }
        function setScaleClamped(want) {
            if (!geo) geo = stkRects(cardEl);
            want = Math.max(0.6, Math.min(1.6, want));
            var c = center(), bx = stkBox(_ss.sticker);
            var size = stkSize({ scale: want }, geo.W);
            while (size > 40 && !stkValid(c.cx, c.cy, size, geo, bx)) size -= 2;
            _ss.sticker.scale = Math.min(want, size / 64);
            applyBox();
        }
        function setRotClamped(deg) {
            _ss.sticker.rot = Math.max(-25, Math.min(25, Math.round(deg)));
            applyBox();
        }
        function start(e) {
            if ((_ss.sticker.mode || 'slot') !== 'free') return;
            if (e.target && e.target.classList && e.target.classList.contains('fmx-stkh')) return;
            e.preventDefault();
            /* щипок: масштаб + поворот двумя пальцами */
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
                    setScaleClamped(s0 * d / d0);
                    setRotClamped(r0 + (a - a0));
                };
                var pu = function () {
                    document.removeEventListener('touchmove', pm); document.removeEventListener('touchend', pu);
                    _haptic('light');
                };
                document.addEventListener('touchmove', pm, { passive: false });
                document.addEventListener('touchend', pu);
                return;
            }
            var mm = function (ev) { var t = ev.touches ? ev.touches[0] : ev; move(t.clientX, t.clientY); };
            var up = function () {
                document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', up);
                document.removeEventListener('touchmove', mm); document.removeEventListener('touchend', up);
                _haptic('light');
            };
            document.addEventListener('mousemove', mm); document.addEventListener('mouseup', up);
            document.addEventListener('touchmove', mm, { passive: false }); document.addEventListener('touchend', up);
        }
        function bindHandle(sel, onMove) {
            var h = elS.querySelector(sel); if (!h) return;
            function hs(e) {
                e.preventDefault(); e.stopPropagation();
                var mm = function (ev) {
                    var t = ev.touches ? ev.touches[0] : ev;
                    var r = cardEl.getBoundingClientRect(), c = center();
                    onMove(t.clientX - r.left - c.cx, t.clientY - r.top - c.cy);
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
        bindHandle('.fmx-stkh.rsz', function (dx, dy) {
            var d = Math.hypot(dx, dy);
            if (!geo) geo = stkRects(cardEl);
            var base = stkSize({ scale: 1 }, geo.W) * 0.72;  /* расстояние до угла при scale 1 */
            if (base > 4) setScaleClamped(d / base);
        });
        bindHandle('.fmx-stkh.rot', function (dx, dy) {
            setRotClamped(Math.atan2(dy, dx) * 180 / Math.PI + 90);
        });
        elS.addEventListener('mousedown', start);
        elS.addEventListener('touchstart', start, { passive: false });
    }

    function renderHero() {
        var hero = el('fmx-hero'); if (!hero) return;
        var c = curChannel(), accent = _ss.color, hcHero = _healthColor(c);
        var cover = _ss.coverGrad || COVERS[_ss.cover];
        var act = _sfmts.filter(function (f) { return f.on; });
        var minP = act.length ? Math.min.apply(null, act.map(function (f) { return f.p; })) : 0;
        var priceTxt = act.length ? _num(minP) + ' ₽' : '—';
        var title = (_ss._title != null ? _ss._title : (c.title || 'Твой канал')) || 'Твой канал';
        var subs = c.subscribers != null ? _num(c.subscribers) + ' подп.' : 'подписчики';
        var desc = _ss._desc || '';
        var tags = (_ss._tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
        var gs = glassStyles(accent);
        var bb = _ss._media && _ss._media.cardbg, bp = (_ss.att && typeof _ss.att.cardbg === 'object') ? _ss.att.cardbg : null, hasBg = !!(bb && bp);
        var cbg = '';
        if (hasBg) {
            var bst = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:' + bp.x + '% ' + bp.y + '%;transform:scale(' + bp.s + ');transform-origin:' + bp.x + '% ' + bp.y + '%;';
            cbg = '<div class="fmx-cbg">' + (bb.kind === 'video' ? '<video src="' + bb.url + '" style="' + bst + '" autoplay muted loop playsinline></video>' : '<img src="' + bb.url + '" style="' + bst + '">') + '<i class="fmx-cbg-s"></i></div>';
        }
        var ts = hasBg ? 'text-shadow:0 1px 3px rgba(0,0,0,0.65);' : '';
        var metSt = hasBg ? 'background:rgba(10,13,24,0.55);border-radius:10px;padding:9px 11px;border-top:none;margin-top:11px;' : '';
        hero.innerHTML = '<div class="fmx-card' + (_ss.glowCard ? ' fmx-prem' : '') + '" style="max-width:350px;width:100%;position:relative;">' + cbg +
            (_ss.sticker ? stkOverlay(_ss.sticker, Math.min(350, hero.clientWidth || 350), _ss.sticker.kind === 'webm', true) : '') +
            '<div class="fmx-cov" data-goto="cover" style="cursor:pointer;">' + heroCoverHtml(cover) +
            (_ss.glowCard ? '<span class="fmx-tag gold"><i class="ti ti-rocket"></i> Топ месяца</span>' : '<span class="fmx-tag"><i class="ti ti-circle-check-filled"></i> на продаже</span>') + '</div>' +
            '<button class="fmx-star" id="fmx-heroStar" style="bottom:auto;top:' + starTop(_ss.starPos) + 'px;z-index:7;" title="Потяни вверх/вниз"><i class="ti ti-star"></i></button>' +
            '<div class="fmx-cb"><div class="fmx-crow">' + avatarInner(accent, true) +
            '<div data-goto="text" style="cursor:pointer;"><div class="fmx-nm" style="' + fontStyle(_ss.font) + ts + '">' + _esc(title) + ' <i class="ti ti-rosette-discount-check-filled fmx-seal"></i></div><div class="fmx-meta" style="' + ts + '">@' + _esc(c.username) + ' · ' + subs + '</div></div></div>' +
            '<div class="fmx-badges">' + trafficLight({ health_class: null, subscribers: c.subscribers, avg_views: c.avg_views, er: (c.er != null ? c.er : c.er_percent) }) + '<span class="fmx-bdg fmx-b-live"><i class="ti ti-plant-2"></i>Живой</span><span class="fmx-bdg fmx-b-safe"><i class="ti ti-shield-check"></i>Безопасный</span></div>' +
            (desc ? '<div class="fmx-desc" data-nostk style="' + ts + '">' + _esc(desc) + '</div>' : '') +
            (tags.length ? '<div data-nostk style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px;">' + tags.map(function (t) { return '<span style="font-size:10px;color:#8990a8;background:rgba(255,255,255,0.05);padding:3px 8px;border-radius:6px;">#' + _esc(t) + '</span>'; }).join('') + '</div>' : '') +
            '<div class="fmx-met" style="' + metSt + '"><div data-goto="price" style="cursor:pointer;"><div class="l">Цена от</div><div class="v pr" style="color:' + accent + ';">' + priceTxt + '</div></div>' +
            '<div><div class="l"><i class="ti ti-eye"></i>Охват</div><div class="v" style="color:' + hcHero + ';">' + (c.avg_views ? '~' + _num(c.avg_views) : '~~~') + '</div></div>' +
            (function () { var erH = (c.er != null ? c.er : c.er_percent); return erH != null ? '<div><div class="l">ER</div><div class="v" style="color:' + hcHero + ';">' + Math.round(erH) + '%</div></div>' : ''; })() +
            (minP && c.avg_views ? '<div><div class="l">CPM</div><div class="v">' + _num(Math.round(minP / c.avg_views * 1000)) + ' ₽</div></div>' : '') +
            '<div class="fmx-sp"><div class="l"><i class="ti ti-chart-line"></i>Просмотры</div>' + spark(hcHero) + '</div></div>' +
            (_ss._slots ? '<div data-nostk="text" style="font-size:10.5px;color:#5DCAA5;margin-top:9px;"><i class="ti ti-calendar-check"></i> ' + _esc(_ss._slots) + '</div>' : '') +
            '<div class="fmx-acts"><button class="fmx-btn" style="' + gs.s + '"><i class="ti ti-report-analytics"></i>Разбор</button><button class="fmx-btn" style="' + gs.s + '"><i class="ti ti-arrow-up-right"></i>Развернуть</button>' +
            '<button class="fmx-btn fmx-btn-p" style="' + gs.p + '"><i class="ti ti-brand-telegram"></i>Написать</button></div></div></div>';
        bindStickerDrag(hero.querySelector('.fmx-card'));
        bindStarDrag(hero.querySelector('.fmx-card'));
        hydrateTgs(hero);
        qsa(hero, '[data-goto]').forEach(function (g) { g.addEventListener('click', function (e) { e.stopPropagation(); _haptic('light'); openAcc(g.getAttribute('data-goto'), true); }); });
        var hl = el('fmx-hlist');
        if (hl) {
            var fakeL = { username: c.username, title: title, subscribers: c.subscribers, avg_views: c.avg_views, er: (c.er != null ? c.er : c.er_percent), formats: act.length ? [{ price: minP }] : [], accent_color: _ss.color, is_top: _ss.glowCard };
            hl.innerHTML = '<span class="fmx-lbl" style="margin:0 0 7px;">Так выглядит в списке</span>' + listItem(fakeL, true);
        }
        updateAccSummaries();
        renderMini(accent, title, priceTxt);
    }

    function uploadPending() {
        var chain = Promise.resolve();
        ['cover', 'avatar', 'cardbg'].forEach(function (t) {
            chain = chain.then(function () {
                var m = _ss._media && _ss._media[t];
                if (!m || !m.file) return;
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
            btn.innerHTML = '<i class="ti ti-rocket"></i> ' + (_ss.listingId ? 'Сохранить карточку' : 'Опубликовать на Площадке');
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
            sticker_json: _ss.sticker || null,
            title_style: _ss.font,
            tags_json: ((ta ? ta.value : _ss._tags) || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
            effects_json: { move: _ss.move, over: _ss.over, glow: _ss.glow, orbit: _ss.orbit, atomColor: _ss.atomColor, glowCard: _ss.glowCard, glass: _ss.glass, starPos: _ss.starPos || 'cover' },
            emoji_attachments_json: _ss.att
        };
        var wasCreate = !_ss.listingId, p;
        if (_ss.listingId) p = apiPatch('/api/v1/marketplace/listings/' + _ss.listingId, body);
        else { if (!_ss.channelId) { btn.disabled = false; uiAlert('Сначала выбери канал.'); return; } body.channel_id = _ss.channelId; p = apiPost('/api/v1/marketplace/listings', body); }
        p.then(function (r) {
            if (r && r.ok === false) { _haptic('error'); btn.disabled = false; btn.innerHTML = '<i class="ti ti-rocket"></i> ' + (_ss.listingId ? 'Сохранить карточку' : 'Опубликовать на Площадке'); uiAlert('Не удалось сохранить: ' + (r.error || 'ошибка')); return; }
            _haptic('success');
            if (r && r.listing_id) { _ss.listingId = r.listing_id; if (wasCreate) { var ch = channelById(_ss.channelId); _myListings.push({ id: r.listing_id, username: ch ? ch.username : null, status: 'pending', status_human: 'На модерации' }); } }
            btn.innerHTML = '<i class="ti ti-check"></i> Сохранено';
            toast('Карточка сохранена');
            _feed = null; _feedState = 'idle';
            setTimeout(function () { btn.innerHTML = '<i class="ti ti-rocket"></i> Сохранить карточку'; btn.disabled = false; }, 1600);
        }).catch(function (e) { _haptic('error'); btn.disabled = false; uiAlert('Не удалось сохранить: ' + (e && e.message ? e.message : 'ошибка')); });
    }

    /* ===================== cards ===================== */
    function spark(col) {
        var arr = [], i; for (i = 0; i < 9; i++) arr.push(0.7 + Math.sin(i * 1.15) * 0.14 + i * 0.02);
        var w = 50, h = 22, mx = Math.max.apply(null, arr), mn = Math.min.apply(null, arr);
        var lx = 0, ly = 0;
        var pts = arr.map(function (v, i) { var x = i / 8 * (w - 5) + 2.5, y = h - ((v - mn) / ((mx - mn) || 1)) * (h - 8) - 4; lx = x; ly = y; return x.toFixed(1) + ',' + y.toFixed(1); }).join(' ');
        return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
            '<polygon points="2.5,' + (h - 1.5) + ' ' + pts + ' ' + lx.toFixed(1) + ',' + (h - 1.5) + '" fill="' + col + '" opacity="0.14"/>' +
            '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="2.2" fill="' + col + '"/></svg>';
    }
    function badges(l) {
        var mm = trafficLight(l) + (_nicheMatch(l) ? '<span class="fmx-bdg fmx-b-match"><i class="ti ti-target-arrow"></i>В точку</span>' : '');
        if (l.badges && l.badges.length) {
            var m = { match: ['fmx-b-match', 'ti-target-arrow', 'В точку'], live: ['fmx-b-live', 'ti-plant-2', 'Живой'], safe: ['fmx-b-safe', 'ti-shield-check', 'Безопасный'], big: ['fmx-b-big', 'ti-crown', 'Крупный'] };
            return mm + l.badges.filter(function (b) { return b !== 'match'; }).map(function (b) { var x = m[b]; return x ? '<span class="fmx-bdg ' + x[0] + '"><i class="ti ' + x[1] + '"></i>' + x[2] + '</span>' : ''; }).join('');
        }
        var out = []; out.push(mm);
        var rr = _reachRate(l);
        if (rr != null && rr >= 10) out.push('<span class="fmx-bdg fmx-b-live"><i class="ti ti-plant-2"></i>Живой</span>');
        out.push('<span class="fmx-bdg fmx-b-safe"><i class="ti ti-shield-check"></i>Безопасный</span>');
        if (l.subscribers && l.subscribers >= 100000) out.push('<span class="fmx-bdg fmx-b-big"><i class="ti ti-crown"></i>Крупный</span>');
        return out.join('');
    }
    function fullCard(l) {
        var top = _isTop(l), accent = _accent(l), hc = _healthColor(l);
        var stk = l.sticker_json || l.sticker;
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
        return '<div class="fmx-card' + (top ? ' fmx-prem' : '') + '" data-u="' + _esc(l.username) + '">' + cbgHtml + stkHtml +
            '<div class="fmx-cov">' + covHtml +
            (top ? '<span class="fmx-tag gold"><i class="ti ti-rocket"></i> Топ месяца</span>' : '<span class="fmx-tag"><i class="ti ti-circle-check-filled"></i> на продаже</span>') +
            '</div>' +
            '<button class="fmx-star' + star + '" data-bm="' + _esc(l.username) + '" style="bottom:auto;top:' + starTop((l.effects_json || {}).starPos) + 'px;z-index:7;"><i class="ti ti-star"></i></button>' +
            '<div class="fmx-cb"><div class="fmx-crow">' + avHtml +
            '<div><div class="fmx-nm" style="' + fts + '">' + _esc(t) + ' <i class="ti ti-rosette-discount-check-filled fmx-seal"></i></div><div class="fmx-meta" style="' + fts + '">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div></div></div>' +
            '<div class="fmx-badges">' + badges(l) + '</div>' +
            (l.custom_text ? '<div class="fmx-desc" style="' + fts + '">' + _esc(l.custom_text) + '</div>' : '') +
            (l.formats && l.formats.length ? '<div class="fmx-fchips">' + l.formats.slice(0, 4).map(function (ff) { return '<span>' + _esc(ff.label || ff.format) + '</span>'; }).join('') + '</div>' : '') +
            '<div class="fmx-met" style="' + fmet + '"><div><div class="l">Цена от</div><div class="v pr" style="color:' + accent + ';">' + _priceFrom(l) + '</div></div>' +
            '<div><div class="l"><i class="ti ti-eye"></i>Охват</div><div class="v" style="color:' + hc + ';">' + (l.avg_views ? '~' + _num(l.avg_views) : '~~~') + '</div></div>' +
            (l.er != null ? '<div><div class="l">ER</div><div class="v" style="color:' + hc + ';">' + Math.round(l.er) + '%</div></div>' : '') +
            (function () { var cpmX = _cpm(l); return cpmX != null ? '<div><div class="l">CPM</div><div class="v">' + _num(cpmX) + ' ₽</div></div>' : ''; })() +
            '<div class="fmx-sp"><div class="l"><i class="ti ti-chart-line"></i>Просмотры</div>' + spark(hc) + '</div></div>' +
            '<div class="fmx-acts"><button class="fmx-btn" style="' + gs.s + '" data-act="analyze" data-u="' + _esc(l.username) + '"><i class="ti ti-report-analytics"></i>Разбор</button><button class="fmx-btn" style="' + gs.s + '" data-act="expand" data-u="' + _esc(l.username) + '"><i class="ti ti-arrow-up-right"></i>Развернуть</button>' +
            '<button class="fmx-btn fmx-btn-p" style="' + gs.p + '" data-act="write" data-u="' + _esc(l.username) + '"><i class="ti ti-brand-telegram"></i>Написать</button></div></div></div>';
    }
    function simpleCard(l) {
        var accent = _accent(l), hc = _healthColor(l), t = l.title || l.username || '?';
        return '<div class="fmx-scard" data-u="' + _esc(l.username) + '"><div class="fmx-srow"><div class="fmx-sav" style="background:' + accent + ';">' + _esc(t.charAt(0)) + '</div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-nm" style="padding-top:0;">' + _esc(t) + '</div><div class="fmx-meta">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div></div>' +
            '<button class="fmx-star" style="position:static;background:transparent;border:0.5px solid rgba(255,255,255,0.12);' + (_bookmarks[l.username] ? 'color:#f59e0b;' : '') + '" data-bm="' + _esc(l.username) + '"><i class="ti ti-star"></i></button></div>' +
            '<div class="fmx-met" style="margin-top:11px;"><div><div class="l"><i class="ti ti-users"></i>Подписчики</div><div class="v">' + _num(l.subscribers) + '</div></div>' +
            '<div><div class="l"><i class="ti ti-eye"></i>Охват</div><div class="v" style="color:' + hc + ';">' + (l.avg_views ? '~' + _num(l.avg_views) : '~~~') + '</div></div>' +
            (l.er != null ? '<div><div class="l">ER</div><div class="v" style="color:' + hc + ';">' + Math.round(l.er) + '%</div></div>' : '') +
            (function () { var cpmX = _cpm(l); return cpmX != null ? '<div><div class="l">CPM</div><div class="v">' + _num(cpmX) + ' ₽</div></div>' : ''; })() +
            '<div class="fmx-sp"><div class="l"><i class="ti ti-chart-line"></i>Просмотры</div>' + spark(hc) + '</div></div>' +
            '<div class="fmx-acts"><button class="fmx-btn" data-act="write" data-u="' + _esc(l.username) + '"><i class="ti ti-brand-telegram"></i>Написать каналу</button></div></div>';
    }
    function listItem(l, fx, plain) {
        var hc = _healthColor(l), accent = _accent(l), t = l.title || l.username || '?', prem = !plain && _isTop(l);
        var bits = ['<b>' + _short(l.subscribers) + '</b> подп'];
        if (l.avg_views) bits.push('<b>~' + _short(l.avg_views) + '</b> охв');
        if (l.er != null) bits.push('ER <b>' + Math.round(l.er) + '%</b>');
        var cpm = _cpm(l); if (cpm != null) bits.push('CPM <b>' + _num(cpm) + '₽</b>');
        return '<div class="fmx-li' + (prem ? ' prem' : '') + '" data-u="' + _esc(l.username) + '"' + (plain ? ' data-b="1"' : '') + '>' +
            '<div class="fmx-lrow">' +
            '<span class="fmx-lav-fx">' + (fx ? avatarInner(accent) : listingAvatar(l, accent)) + '</span>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-lname" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(t) + (_nicheMatch(l) ? ' <i class="ti ti-target-arrow" style="color:#818cf8;font-size:11px;"></i>' : '') + '</div>' +
            '<div class="fmx-lmet">' + bits.join('<s></s>') + '</div></div>' +
            '<div class="fmx-lright">' + (plain ? '' : '<span class="fmx-lprice">' + _priceFrom(l) + '</span>') + '<span class="fmx-lsp">' + spark(hc) + '</span>' + trafficLight(l, true) + '</div>' +
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

    function bindCards(scope) {
        hydrateTgs(scope);
        var host = scope || el('fmx-main');
        qsa(host, '[data-bm]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); toggleBm(b.getAttribute('data-bm')); }); });
        qsa(host, '[data-act="write"]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); openTg(b.getAttribute('data-u')); }); });
        qsa(host, '[data-act="expand"]').forEach(function (b) { b.addEventListener('click', function () { openListing(b.getAttribute('data-u')); }); });
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
    function findListing(u) { var arr = (_feed || []).concat(_catalog || []); for (var i = 0; i < arr.length; i++) if (arr[i].username === u) return arr[i]; return null; }
    function openTg(u) { _haptic('light'); var url = 'https://t.me/' + u; try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) { window.open(url, '_blank'); } }
    function toggleBm(u) {
        if (!u) return; _haptic('light');
        if (_bookmarks[u]) { delete _bookmarks[u]; apiDelete('/api/v1/marketplace/bookmarks/' + encodeURIComponent(u)).catch(function () {}); }
        else { _bookmarks[u] = true; apiPost('/api/v1/marketplace/bookmarks', { username: u, source: _mainTab === 'catalog' ? 'base' : 'market' }).catch(function () {}); }
        updateBmCount();
        if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy();
    }

    /* ===================== modals ===================== */
    function buildModals() {
        var faq = document.createElement('div'); faq.className = 'fmx-mbg'; faq.id = 'fmx-faqBg';
        faq.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2><i class="ti ti-help-circle" style="color:#818cf8;"></i> Справка</h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-faqBody"></div></div>';
        document.body.appendChild(faq);
        faq.addEventListener('click', function (e) { if (e.target === faq) hideModal('fmx-faqBg'); });
        faq.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-faqBg'); });

        var promo = document.createElement('div'); promo.className = 'fmx-mbg'; promo.id = 'fmx-promoBg';
        promo.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-rocket" style="color:#f5bf4f;"></i> Продвинуть карточку</h2><p>Поднимает карточку выше в умной сортировке — её видит больше рекламодателей. Топ смешанный: платные и обычные карточки чередуются.</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-promoBody"></div></div>';
        document.body.appendChild(promo);
        promo.addEventListener('click', function (e) { if (e.target === promo) hideModal('fmx-promoBg'); });
        promo.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-promoBg'); });

        var lst = document.createElement('div'); lst.className = 'fmx-mbg'; lst.id = 'fmx-listBg';
        lst.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2 id="fmx-listTitle" style="font-size:15px;"></h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-listBody"></div></div>';
        document.body.appendChild(lst);
        lst.addEventListener('click', function (e) { if (e.target === lst) hideModal('fmx-listBg'); });
        lst.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-listBg'); });

        var an = document.createElement('div'); an.className = 'fmx-mbg'; an.id = 'fmx-anBg';
        an.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-report-analytics" style="color:#818cf8;"></i> AI-разбор канала</h2><p id="fmx-anName"></p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody"><div class="fmx-note fmx-gr"><i class="ti ti-sparkles"></i> Нейросеть изучит канал целиком: реальный охват и его динамику, вовлечённость, признаки накрутки и качество аудитории — и честно скажет, стоит ли покупать здесь рекламу.</div><div class="fmx-empty" style="padding:24px 20px;"><i class="ti ti-hourglass-high"></i><h3>Скоро</h3><p>Глубокий разбор подключается. Пока смотри метрики в «Развернуть» и бейджи здоровья на карточке.</p></div></div></div>';
        document.body.appendChild(an);
        an.addEventListener('click', function (e) { if (e.target === an) hideModal('fmx-anBg'); });
        an.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-anBg'); });

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
    function showModal(id) { var m = el(id); if (m) m.classList.add('fmx-show'); }
    function hideModal(id) { var m = el(id); if (m) m.classList.remove('fmx-show'); }

    function openFaq() {
        var body;
        if (_faqTab === 'terms') body = TERMS.map(function (t) { return '<div class="fmx-term"><h4>' + _esc(t[0]) + '</h4><p>' + _esc(t[1]) + '</p></div>'; }).join('');
        else if (_faqTab === 'rules') body = '<div class="fmx-note" style="margin-bottom:6px;"><i class="ti ti-scale"></i> Единые правила Площадки. За контент отвечает разместивший; дополнительно действуют законы страны, на аудиторию которой направлена реклама.</div>' + RULES.map(function (t) { return '<div class="fmx-term"><h4>' + _esc(t[0]) + '</h4><p>' + _esc(t[1]) + '</p></div>'; }).join('');
        else body = TIPS.map(function (t) { return '<div class="fmx-tip"><i class="ti ti-circle-check"></i><span>' + _esc(t) + '</span></div>'; }).join('');
        el('fmx-faqBody').innerHTML = '<div class="fmx-ftabs"><button class="fmx-ft' + (_faqTab === 'terms' ? ' on' : '') + '" data-t="terms">Цифры</button><button class="fmx-ft' + (_faqTab === 'tips' ? ' on' : '') + '" data-t="tips">Советы</button><button class="fmx-ft' + (_faqTab === 'rules' ? ' on' : '') + '" data-t="rules">Правила</button></div>' + body;
        qsa(el('fmx-faqBody'), '[data-t]').forEach(function (b) { b.addEventListener('click', function () { _faqTab = b.getAttribute('data-t'); openFaq(); }); });
        showModal('fmx-faqBg');
    }
    function openPromo() {
        el('fmx-promoBody').innerHTML =
            '<div class="fmx-po"><div class="fmx-po-top"><div class="fmx-po-nm"><i class="ti ti-bolt" style="color:#818cf8;"></i> Поднятие 24 часа</div><div class="fmx-po-pr">490 ₽</div></div>' +
            '<div class="fmx-po-li"><i class="ti ti-arrow-up"></i> Поднимаем карточку выше в топе на сутки. Больше показов — больше откликов.</div>' +
            '<button class="fmx-po-buy" data-buy="24">Поднять на 24 часа</button></div>' +
            '<div class="fmx-po"><div class="fmx-po-top"><div class="fmx-po-nm"><i class="ti ti-bolt" style="color:#818cf8;"></i> Поднятие 48 часов</div><div class="fmx-po-pr">1 390 ₽</div></div>' +
            '<div class="fmx-po-li"><i class="ti ti-arrow-up"></i> Поднимаем карточку выше в топе на двое суток — дольше наверху, больше откликов.</div>' +
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
    function openListing(u) {
        var l = findListing(u); if (!l) { openTg(u); return; }
        var accent = _isTop(l) ? '#f5bf4f' : _accent(l);
        var fmts = (l.formats && l.formats.length) ? '<div style="display:flex;flex-direction:column;gap:7px;margin-top:8px;">' + l.formats.map(function (f) { return '<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:9px 11px;background:rgba(255,255,255,0.03);border-radius:9px;"><span>' + _esc(f.label || f.format) + '</span><b>' + _num(f.price) + ' ₽</b></div>'; }).join('') + '</div>' : '';
        var mstr = [];
        if (_nicheMatch(l)) mstr.push('ниша совпадает с твоим каналом');
        if (l.er != null) mstr.push('ER ' + l.er + '%');
        var cpm = _cpm(l); if (cpm != null) mstr.push('CPM ' + cpm + '₽');
        var rr = _reachRate(l); if (rr != null) mstr.push('охват/подп ' + rr + '%');
        el('fmx-listTitle').innerHTML = '<span style="display:flex;align-items:center;gap:7px;">' + _esc(l.title || u) + ' <i class="ti ti-rosette-discount-check-filled" style="color:' + accent + ';font-size:15px;"></i></span>';
        el('fmx-listBody').innerHTML =
            '<div style="font-size:12px;color:#8990a8;margin-bottom:12px;">@' + _esc(u) + ' · ' + _num(l.subscribers) + ' подп.</div>' +
            '<div class="fmx-badges">' + badges(l) + '</div>' +
            (mstr.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">' + mstr.map(function (m) { return '<span style="font-size:11px;color:#a9aec0;background:rgba(255,255,255,0.04);padding:5px 10px;border-radius:8px;">' + _esc(m) + '</span>'; }).join('') + '</div>' : '') +
            (l.custom_text ? '<div style="font-size:13px;color:#cdd0de;line-height:1.55;margin:12px 0;">' + _esc(l.custom_text) + '</div>' : '') +
            (fmts ? '<div style="font-size:12px;font-weight:700;margin:14px 0 4px;">Форматы и цены</div>' + fmts : '') +
            (l.slots_note ? '<div style="font-size:11.5px;color:#5DCAA5;margin-top:11px;"><i class="ti ti-calendar-check"></i> ' + _esc(l.slots_note) + '</div>' : '') +
            '<div class="fmx-acts" style="margin-top:16px;"><button class="fmx-btn" data-bm="' + _esc(u) + '"><i class="ti ti-star"></i>В закладки</button>' +
            '<button class="fmx-btn fmx-btn-p" style="background:' + accent + ';color:#fff;" data-w="' + _esc(u) + '"><i class="ti ti-brand-telegram"></i>Написать владельцу</button></div>' +
            (l.id ? '<button class="fmx-btn" id="fmx-ls-rep" style="width:100%;margin-top:10px;color:#8990a8;"><i class="ti ti-flag"></i> Пожаловаться на карточку</button>' : '');
        el('fmx-listBody').querySelectorAll('[data-bm]').forEach(function (b) { b.addEventListener('click', function () { toggleBm(b.getAttribute('data-bm')); }); });
        el('fmx-listBody').querySelectorAll('[data-w]').forEach(function (b) { b.addEventListener('click', function () { openTg(b.getAttribute('data-w')); }); });
        var _lsRep = el('fmx-ls-rep');
        if (_lsRep) _lsRep.addEventListener('click', function () { hideModal('fmx-listBg'); openComplaint({ listing_id: l.id }); });
        showModal('fmx-listBg');
    }
    function openBookmarks() {
        var keys = Object.keys(_bookmarks);
        el('fmx-bmBody').innerHTML = keys.length ? keys.map(function (u) {
            var l = findListing(u) || { username: u, title: u };
            return '<div class="fmx-lrow" style="margin-bottom:8px;cursor:default;"><span class="fmx-ldot" style="background:#5DCAA5;"></span><div style="flex:1;"><div class="fmx-lname">' + _esc(l.title || u) + '</div><div class="fmx-lsub">@' + _esc(u) + '</div></div><button class="fmx-mclose" data-del="' + _esc(u) + '" style="border-color:rgba(239,68,68,0.25);color:#ef4444;"><i class="ti ti-trash"></i></button></div>';
        }).join('') : '<div class="fmx-empty"><i class="ti ti-star"></i><h3>Пусто</h3><p>Жми ★ на карточках, чтобы сохранить канал.</p></div>';
        el('fmx-bmBody').querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { toggleBm(b.getAttribute('data-del')); openBookmarks(); }); });
        showModal('fmx-bmBg');
    }

    function toast(msg) { var t = el('fmx-toastEl'); if (!t) { t = document.createElement('div'); t.id = 'fmx-toastEl'; t.className = 'fmx-toast'; document.body.appendChild(t); } t.innerHTML = '<i class="ti ti-circle-check"></i> ' + _esc(msg); t.classList.add('on'); setTimeout(function () { t.classList.remove('on'); }, 2400); }

    window.__openMarketplace = open;
})();