(function () {
    'use strict';

    /* ===================== state ===================== */
    var _root = null, _opened = false;
    var _mainTab = 'market';
    var _subTab = 'buy';
    var _view = 'cards';
    var _sort = 'match';
    var _feed = null, _catalog = null, _feedState = 'idle', _catState = 'idle';
    var _channels = [], _myListings = [], _bookmarks = {};
    var _faqTab = 'terms';
    var _ss = null, _sfmts = null, _secCreate = 'cover';

    var COVERS = [
        'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#5DCAA5,#10b981)',
        'linear-gradient(135deg,#F0997B,#ec4899)', 'linear-gradient(135deg,#3b82f6,#06b6d4)',
        'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#8b5cf6,#ec4899)'
    ];
    var COVER_NAMES = ['Фиолет', 'Изумруд', 'Закат', 'Океан', 'Огонь', 'Магента'];
    var COLORS = ['#818cf8', '#5DCAA5', '#F0997B', '#ec4899', '#3b82f6', '#f59e0b', '#a78bfa', '#34d399'];
    var EMOJIS = ['🧬', '🔥', '💪', '🧠', '⚡', '🚀', '💎', '🎯', '📈', '🌿', '❤️', '✨', '🏆', '🎮', '📚', '🌟', '💰', '📊', '👑', '🌈'];
    var FONTS = [['normal', 'Обычный'], ['bold', 'Жирный'], ['wide', 'Широкий'], ['mono', 'Моно']];
    var FX_MOVE = [['none', 'Без'], ['levit', 'Левитация'], ['pscale', 'Пульс'], ['sway', '3D-наклон']];
    var FX_OVER = [['none', 'Без'], ['holo', 'Голограмма'], ['liquid', 'Жидкое золото'], ['rgb', 'RGB-сдвиг']];
    var FX_GLOW = [['none', 'Без'], ['neon', 'Неон'], ['prism', 'Призма'], ['breath', 'Дыхание']];
    var FX_ORBIT = [['none', 'Без'], ['comet', 'Комета'], ['atom', 'Атом']];
    var GR = '#5DCAA5';

    var TERMS = [
        ['Подписчики', 'Сколько людей в канале. Само по себе мало значит — подписчиков легко накрутить. Главное — охват.'],
        ['Охват', 'Сколько человек реально видят один пост. Главное число при оценке: рекламу видит охват, а не все подписчики.'],
        ['ER · вовлечённость', 'Насколько живая аудитория: реакции и комментарии к охвату. Низкий ER при больших цифрах — повод насторожиться.'],
        ['CPM · за 1000 показов', 'Сколько стоит донести рекламу до 1000 человек. Сравнивай каналы по CPM, а не по голой сумме.'],
        ['Охват к подписчикам', 'Какая доля подписчиков видит посты. У здорового канала — заметная доля. 100k подписчиков и 1k охват — тревожный знак.'],
        ['Накрутка', 'Искусственные подписчики или просмотры. Признаки: много подписчиков и крошечный охват, скачки просмотров, нет живых комментариев.'],
        ['Маркировка · erid', 'По закону РФ интернет-реклама маркируется и регистрируется в ОРД. На бирже это поле зашито в карточку.']
    ];
    var TIPS = [
        'Смотри на охват и ER, а не на число подписчиков.',
        'Сравнивай цену через CPM — дорогой канал может быть выгоднее дешёвого.',
        'Проверяй охват к подписчикам: большой канал с крошечным охватом — деньги на ветер.',
        'Начни с одного небольшого теста. Зашло — масштабируй, нет — потерял мало.',
        'Подбирай канал под свою нишу: релевантность важнее размера.'
    ];

    /* ===================== helpers ===================== */
    function _esc(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function _num(n) { if (n == null || isNaN(n)) return '—'; return Number(n).toLocaleString('ru-RU'); }
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
    function _coverBg(l) { if ((l.cover_type === 'img' || l.cover_type === 'gif') && l.cover_url) return "url('" + l.cover_url + "')"; if (l.cover_gradient) return l.cover_gradient; return COVERS[Math.abs(_hash(l.username || '')) % COVERS.length]; }
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
            '.fmx-head{display:flex;align-items:center;gap:11px;padding:14px 16px 12px;flex-shrink:0;}',
            '.fmx-hic{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;box-shadow:0 5px 16px rgba(99,102,241,0.5);flex-shrink:0;}',
            '.fmx-head h1{margin:0;font-size:16px;font-weight:700;}',
            '.fmx-head p{margin:1px 0 0;font-size:11px;color:#8990a8;}',
            '.fmx-ibtn{width:34px;height:34px;border-radius:9px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;}',
            '.fmx-ibtn.fmx-has{color:#f59e0b;border-color:rgba(245,158,11,0.3);}',
            '.fmx-bmc{position:absolute;top:-5px;right:-5px;background:#6366f1;color:#fff;font-size:9px;font-weight:700;min-width:15px;height:15px;border-radius:99px;display:flex;align-items:center;justify-content:center;padding:0 3px;}',
            '.fmx-pillbar{position:relative;display:flex;margin:0 16px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:4px;flex-shrink:0;}',
            '.fmx-pill{position:absolute;top:4px;left:4px;height:calc(100% - 8px);border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);transition:transform 380ms cubic-bezier(.2,.85,.25,1),width 380ms cubic-bezier(.2,.85,.25,1);box-shadow:0 4px 14px rgba(99,102,241,0.4);z-index:0;}',
            '.fmx-pb{flex:1;position:relative;z-index:1;border:none;background:transparent;color:#8990a8;padding:10px 6px;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:color 260ms;white-space:nowrap;}',
            '.fmx-pb.on{color:#fff;}',
            '.fmx-scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;}',
            '.fmx-pad{padding:14px 16px 28px;}',
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
            '.fmx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}',
            '.fmx-empty{text-align:center;padding:54px 20px;color:#8990a8;}',
            '.fmx-empty .ti{font-size:40px;opacity:0.3;}',
            '.fmx-empty h3{margin:14px 0 5px;font-size:15px;font-weight:700;color:#e8e8ed;}',
            '.fmx-empty p{margin:0;font-size:12.5px;line-height:1.5;max-width:300px;margin-left:auto;margin-right:auto;}',
            '.fmx-load{text-align:center;padding:54px;color:#8990a8;}',
            '.fmx-card{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;transition:border-color 200ms,transform 200ms;}',
            '.fmx-card:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px);}',
            '.fmx-card.fmx-prem{border:1px solid rgba(245,191,79,0.5);}',
            '.fmx-cov{height:84px;position:relative;overflow:hidden;}',
            '.fmx-cov-bg{position:absolute;inset:0;background-size:cover;background-position:center;}',
            '.fmx-cov-bg::before{content:"";position:absolute;inset:-20%;background:radial-gradient(120% 130% at 22% 8%,rgba(255,255,255,0.4),transparent 55%);animation:fmxBreathe 7s ease-in-out infinite;}',
            '@keyframes fmxBreathe{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(8%,6%) scale(1.12);}}',
            '.fmx-tag{position:absolute;top:9px;left:9px;font-size:9px;font-weight:700;padding:4px 8px;border-radius:6px;background:rgba(10,13,24,0.5);color:#5DCAA5;backdrop-filter:blur(5px);z-index:2;display:flex;align-items:center;gap:4px;}',
            '.fmx-tag.gold{background:linear-gradient(135deg,#fde68a,#f5bf4f);color:#2a1c00;}',
            '.fmx-star{position:absolute;bottom:9px;right:9px;width:30px;height:30px;border-radius:8px;background:rgba(10,13,24,0.45);border:none;color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);z-index:2;}',
            '.fmx-star.on{color:#f59e0b;}',
            '.fmx-cb{padding:13px;}',
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
            '.fmx-met{display:flex;align-items:flex-end;gap:16px;padding:11px 0;border-top:0.5px solid rgba(255,255,255,0.08);}',
            '.fmx-met .l{font-size:9px;color:#565b73;text-transform:uppercase;letter-spacing:0.3px;display:flex;align-items:center;gap:3px;margin-bottom:3px;}',
            '.fmx-met .v{font-size:14px;font-weight:700;}',
            '.fmx-met .pr{color:#5DCAA5;}',
            '.fmx-sp{margin-left:auto;}',
            '.fmx-acts{display:flex;gap:8px;margin-top:11px;}',
            '.fmx-btn{flex:1;border-radius:10px;padding:11px;font-size:12px;font-weight:600;cursor:pointer;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 150ms;}',
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
            '.fmx-hero{display:flex;align-items:flex-start;justify-content:center;padding:4px 0 18px;}',
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
            '.fmx-gd{width:52px;height:40px;border-radius:11px;cursor:pointer;position:relative;border:2px solid transparent;transition:transform 140ms;}',
            '.fmx-gd:hover{transform:scale(1.06);}',
            '.fmx-gd.on{border-color:#fff;box-shadow:0 0 0 2px #6366f1;}',
            '.fmx-gd.on::after{content:"\\2713";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;text-shadow:0 1px 3px rgba(0,0,0,0.5);}',
            '.fmx-dots{display:flex;gap:10px;flex-wrap:wrap;}',
            '.fmx-dot{width:34px;height:34px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform 140ms;}',
            '.fmx-dot:hover{transform:scale(1.1);}',
            '.fmx-dot.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,0.3);}',
            '.fmx-emg{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:6px;}',
            '.fmx-em{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(255,255,255,0.04);border:1px solid transparent;border-radius:9px;cursor:pointer;transition:all 140ms;}',
            '.fmx-em.on{border-color:#6366f1;background:rgba(99,102,241,0.15);}',
            '.fmx-inp{width:100%;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;font-size:13px;color:#e8e8ed;font-family:inherit;outline:none;transition:border-color 160ms;}',
            '.fmx-inp:focus{border-color:rgba(99,102,241,0.28);}',
            'textarea.fmx-inp{resize:none;min-height:74px;}',
            '.fmx-mt2{margin-top:14px;}',
            '.fmx-row2{display:flex;gap:8px;}.fmx-row2>*{flex:1;}',
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
            '.fmx-toast.on{opacity:1;transform:translateX(-50%) translateY(0);}'
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
            '<div class="fmx-head"><div class="fmx-hic"><i class="ti ti-building-store"></i></div>' +
            '<div style="flex:1;min-width:0;overflow:hidden;"><h1 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Найти рекламодателя</h1><p style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Каналы для рекламы и твоя биржа</p></div>' +
            '<button class="fmx-ibtn" id="fmx-faq"><i class="ti ti-help"></i></button>' +
            '<button class="fmx-ibtn" id="fmx-bm" style="margin-left:7px;"><i class="ti ti-star"></i><span class="fmx-bmc" id="fmx-bmc" style="display:none;">0</span></button>' +
            '<button class="fmx-ibtn" id="fmx-close" style="margin-left:7px;"><i class="ti ti-x"></i></button></div>' +
            '<div class="fmx-pillbar" id="fmx-maintabs"><span class="fmx-pill" id="fmx-mainpill"></span>' +
            '<button class="fmx-pb on" data-mt="market"><i class="ti ti-building-store"></i> Площадка</button>' +
            '<button class="fmx-pb" data-mt="catalog"><i class="ti ti-list-search"></i> Каталог каналов</button></div>' +
            '<div class="fmx-scroll"><div class="fmx-pad" id="fmx-main"></div></div>';
        document.body.appendChild(d);
        _root = d;
        el('fmx-close').addEventListener('click', close);
        el('fmx-faq').addEventListener('click', openFaq);
        el('fmx-bm').addEventListener('click', openBookmarks);
        qsa(d, '#fmx-maintabs .fmx-pb').forEach(function (b) { b.addEventListener('click', function () { setMainTab(b.getAttribute('data-mt')); }); });
        buildModals();
        window.addEventListener('resize', function () { movePill('fmx-maintabs', 'fmx-mainpill'); if (el('fmx-subtabs')) movePill('fmx-subtabs', 'fmx-subpill'); if (el('fmx-pult')) movePill('fmx-pult', 'fmx-pultpill'); if (el('fmx-panes')) sizePanes(); });
    }

    function open(channelId) {
        ensureRoot();
        _opened = true;
        _root.classList.add('fmx-show');
        loadBookmarks();
        setMainTab('market', true);
    }
    function close() { if (_root) _root.classList.remove('fmx-show'); _opened = false; }

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
        qsa(_root, '#fmx-maintabs .fmx-pb').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mt') === t); });
        movePill('fmx-maintabs', 'fmx-mainpill');
        var host = el('fmx-main');
        host.classList.remove('fmx-fade'); void host.offsetWidth; host.classList.add('fmx-fade');
        if (t === 'catalog') renderCatalog();
        else renderMarket();
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
    function loadChannels() { return apiGet('/api/v1/channels').then(function (r) { _channels = ((r && r.channels) ? r.channels : []).filter(function (c) { return c.username; }); return _channels; }).catch(function () { _channels = []; return []; }); }
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
        var bar = sortBarHtml() + searchHtml('Поиск канала по теме…');
        var body;
        if (_catState === 'loading') body = loadHtml();
        else if (_catState === 'error') body = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и попробуй ещё раз.');
        else if (!_catalog || !_catalog.length) body = emptyHtml('ti-list-search', 'Каталог скоро наполнится', 'Здесь будет общая база каналов со всего Telegram — ищи по нише и договаривайся с владельцами напрямую.');
        else body = '<div class="fmx-grid">' + _catalog.map(simpleCard).join('') + '</div>';
        host.innerHTML = '<div class="fmx-note fmx-gr"><i class="ti ti-world-search"></i> Каналы со всего Telegram. Находи площадки под свою нишу и договаривайся с владельцами напрямую — сделки проходят между вами.</div>' + bar + body;
        bindSort(); bindCards();
    }

    /* ===================== render: market ===================== */
    function renderMarket() {
        var host = el('fmx-main');
        host.innerHTML =
            '<div class="fmx-pillbar" id="fmx-subtabs" style="margin:0 0 16px;"><span class="fmx-pill" id="fmx-subpill"></span>' +
            '<button class="fmx-pb" data-st="buy"><i class="ti ti-shopping-bag"></i> Купить</button>' +
            '<button class="fmx-pb" data-st="sell"><i class="ti ti-speakerphone"></i> Продать</button>' +
            '<button class="fmx-pb" data-st="create"><i class="ti ti-sparkles"></i> Создать рекламу</button></div>' +
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
    }

    function renderBuy() {
        var sub = el('fmx-sub'); if (!sub) return;
        if (_feed == null && _feedState === 'idle') loadFeed();
        var bar = sortBarHtml() + topRowHtml();
        var body;
        if (_feedState === 'loading') body = loadHtml();
        else if (_feedState === 'error') body = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и попробуй ещё раз.');
        else if (!_feed || !_feed.length) body = emptyHtml('ti-building-store', 'Пока пусто', 'Здесь появятся оформленные карточки каналов от наших пользователей. Будь первым — оформи свой канал во вкладке «Создать рекламу».');
        else body = (_view === 'cards' ? '<div class="fmx-grid">' + _feed.map(fullCard).join('') + '</div>' : '<div style="display:flex;flex-direction:column;gap:8px;">' + _feed.map(listRow).join('') + '</div>');
        sub.innerHTML = '<div class="fmx-note fmx-gr"><i class="ti ti-building-store"></i> Оформленные карточки каналов нашей Площадки. Совпадение и справедливость цены — оценки бота.</div>' + bar + body;
        bindSort(); bindView(); bindCards();
    }

    function renderSell() {
        var sub = el('fmx-sub'); if (!sub) return;
        sub.innerHTML = '<div class="fmx-note"><i class="ti ti-speakerphone"></i> Заявки «куплю рекламу» от пользователей Площадки. Размести свою — и рекламодатели найдут тебя сами.</div>' +
            emptyHtml('ti-speakerphone', 'Заявок пока нет', 'Скоро здесь можно будет оставить заявку на покупку рекламы и листать чужие. Площадка растёт вместе с аудиторией.') +
            '<button class="fmx-save" style="margin-top:6px;opacity:0.7;cursor:default;"><i class="ti ti-plus"></i> Оставить заявку (скоро)</button>';
    }

    /* ===================== render: constructor ===================== */
    function renderCreate() {
        var sub = el('fmx-sub'); if (!sub) return;
        sub.innerHTML = '<div class="fmx-load"><i class="ti ti-loader-2"></i><div style="font-size:12px;margin-top:10px;">Загружаю конструктор…</div></div>';
        Promise.all([loadChannels(), loadMyListings()]).then(function () {
            if (!_channels.length) { sub.innerHTML = emptyHtml('ti-plus', 'Нет подходящих каналов', 'Чтобы выставить канал на Площадку, у него должен быть публичный @username. Добавь или настрой канал в приложении.'); return; }
            var def = null;
            for (var i = 0; i < _channels.length; i++) if (listingForChannel(_channels[i].id)) { def = _channels[i].id; break; }
            if (def == null) def = _channels[0].id;
            selectChannel(def);
        });
    }
    function channelById(id) { for (var i = 0; i < _channels.length; i++) if (_channels[i].id === id) return _channels[i]; return null; }
    function listingForChannel(id) { var ch = channelById(id); if (!ch || !ch.username) return null; for (var j = 0; j < _myListings.length; j++) { var u = _myListings[j].username; if (u && u.toLowerCase() === ch.username.toLowerCase()) return _myListings[j]; } return null; }

    function defaultState() {
        return { cover: 1, covType: 'grad', avatar: 'tg', avEmoji: '🧬', color: '#5DCAA5', font: 'bold',
            move: 'levit', over: 'none', glow: 'none', orbit: 'none', glowCard: false, glass: false,
            att: { avatar: '', cover: '', body: [], list: [] }, _desc: '', _tags: '', _slots: '', _title: null, listingId: null, channelId: null };
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
        if (l.accent_color) _ss.color = l.accent_color;
        if (l.cover_gradient) { var gi = COVERS.indexOf(l.cover_gradient); if (gi >= 0) _ss.cover = gi; }
        if (l.cover_type) _ss.covType = l.cover_type;
        var fx = l.effects_json || {};
        ['move', 'over', 'glow', 'orbit'].forEach(function (k) { if (fx[k]) _ss[k] = fx[k]; });
        _ss.glowCard = !!fx.glowCard; _ss.glass = !!fx.glass;
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
        _ss._tags = (l.tags_json || []).join(', ');
        _ss._slots = l.slots_note || '';
    }
    function selectChannel(id) {
        _ss = defaultState(); _sfmts = defaultFmts(); _ss.channelId = id;
        var l = listingForChannel(id); if (l) hydrate(l);
        _ss.channelId = id; _secCreate = 'cover';
        paintCreate();
    }
    function curChannel() { return channelById(_ss.channelId) || { title: 'Твой канал', username: 'your_channel', subscribers: null }; }

    function paintCreate() {
        var sub = el('fmx-sub'); if (!sub) return;
        var existing = listingForChannel(_ss.channelId);
        var opts = _channels.map(function (c) { return '<option value="' + c.id + '"' + (c.id === _ss.channelId ? ' selected' : '') + '>@' + _esc(c.username) + (c.title ? ' · ' + _esc(c.title) : '') + (listingForChannel(c.id) ? ' ✓' : '') + '</option>'; }).join('');
        sub.innerHTML =
            '<div class="fmx-hero" id="fmx-hero"></div>' +
            '<div class="fmx-chsel"><i class="ti ti-broadcast lead"></i><select id="fmx-ch">' + opts + '</select><i class="ti ti-chevron-down" style="color:#8990a8;margin-right:8px;"></i></div>' +
            '<div class="fmx-chnote">' + (existing ? 'Редактируешь карточку · статус: ' + _esc(existing.status_human || existing.status || '—') : 'Новое размещение для этого канала') + '</div>' +
            '<div class="fmx-pillbar" id="fmx-pult" style="margin:0 0 16px;"><span class="fmx-pill" id="fmx-pultpill"></span>' +
            '<button class="fmx-pb on" data-sc="cover"><i class="ti ti-photo"></i> Обложка</button>' +
            '<button class="fmx-pb" data-sc="style"><i class="ti ti-palette"></i> Стиль</button>' +
            '<button class="fmx-pb" data-sc="price"><i class="ti ti-cash"></i> Цена</button>' +
            '<button class="fmx-pb" data-sc="text"><i class="ti ti-text-caption"></i> Текст</button></div>' +
            '<div class="fmx-panes" id="fmx-panes">' +
            '<div class="fmx-pane on" id="fmx-p-cover" data-sc="cover">' + paneCover() + '</div>' +
            '<div class="fmx-pane" id="fmx-p-style" data-sc="style">' + paneStyle() + '</div>' +
            '<div class="fmx-pane" id="fmx-p-price" data-sc="price">' + panePrice() + '</div>' +
            '<div class="fmx-pane" id="fmx-p-text" data-sc="text">' + paneText() + '</div>' +
            '</div>' +
            '<button class="fmx-save" id="fmx-save"><i class="ti ti-rocket"></i> ' + (_ss.listingId ? 'Сохранить карточку' : 'Опубликовать на Площадке') + '</button>' +
            '<div class="fmx-savenote">После публикации карточка пройдёт проверку по смыслу. Премиум-эффекты применяются только при активном продвижении на 30 дней.</div>';
        el('fmx-ch').addEventListener('change', function () { selectChannel(+this.value); });
        qsa(sub, '#fmx-pult .fmx-pb').forEach(function (b) { b.addEventListener('click', function () { setCreateSec(b.getAttribute('data-sc')); }); });
        el('fmx-save').addEventListener('click', saveStudio);
        bindCover(); bindStyle(); bindPrice(); bindText();
        renderHero();
        setTimeout(function () { setCreateSec('cover', true); }, 50);
    }

    function setCreateSec(sc, force) {
        _secCreate = sc;
        qsa(el('fmx-pult'), '.fmx-pb').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-sc') === sc); });
        movePill('fmx-pult', 'fmx-pultpill');
        qsa(el('fmx-panes'), '.fmx-pane').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-sc') === sc); });
        sizePanes();
    }
    function sizePanes() { var p = el('fmx-panes'); if (!p) return; var a = p.querySelector('.fmx-pane.on'); if (a) p.style.height = a.offsetHeight + 'px'; }

    function paneCover() {
        var seg = '<div class="fmx-mtabs" id="fmx-covtype">' +
            '<button class="fmx-mt' + (_ss.covType === 'grad' ? ' on' : '') + '" data-ct="grad"><i class="ti ti-color-swatch"></i> Градиент</button>' +
            '<button class="fmx-mt' + (_ss.covType === 'img' ? ' on' : '') + '" data-ct="img"><i class="ti ti-photo"></i> Картинка</button>' +
            '<button class="fmx-mt' + (_ss.covType === 'gif' ? ' on' : '') + '" data-ct="gif"><i class="ti ti-gif"></i> GIF</button></div>';
        var grads = '<span class="fmx-lbl">Фон обложки</span><div class="fmx-grads" id="fmx-grads">' +
            COVERS.map(function (g, i) { return '<div class="fmx-gd' + (i === _ss.cover ? ' on' : '') + '" data-g="' + i + '" style="background:' + g + '" title="' + COVER_NAMES[i] + '"></div>'; }).join('') + '</div>';
        var upl = '<div class="fmx-note" id="fmx-uplnote" style="margin-top:14px;' + (_ss.covType === 'grad' ? 'display:none;' : '') + '"><i class="ti ti-cloud-upload"></i> Загрузка своей обложки (картинка/GIF/MP4) с проверкой подключается — скоро будет доступна. Пока выбери градиент.</div>';
        return seg + grads + upl;
    }
    function bindCover() {
        qsa(el('fmx-covtype'), 'button').forEach(function (b) { b.addEventListener('click', function () { _ss.covType = b.getAttribute('data-ct'); qsa(el('fmx-covtype'), 'button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); var n = el('fmx-uplnote'); if (n) n.style.display = _ss.covType === 'grad' ? 'none' : 'flex'; renderHero(); sizePanes(); }); });
        qsa(el('fmx-grads'), '.fmx-gd').forEach(function (g) { g.addEventListener('click', function () { _ss.cover = +g.getAttribute('data-g'); qsa(el('fmx-grads'), '.fmx-gd').forEach(function (x) { x.classList.remove('on'); }); g.classList.add('on'); renderHero(); }); });
    }

    function paneStyle() {
        var colors = '<span class="fmx-lbl">Акцент — цена и кнопка</span><div class="fmx-dots" id="fmx-colors">' +
            COLORS.map(function (c) { return '<div class="fmx-dot' + (c === _ss.color ? ' on' : '') + '" data-c="' + c + '" style="background:' + c + '"></div>'; }).join('') + '</div>';
        var av = '<span class="fmx-lbl fmx-mt2">Аватар</span><div class="fmx-mtabs" id="fmx-avtype">' +
            '<button class="fmx-mt' + (_ss.avatar === 'tg' ? ' on' : '') + '" data-av="tg"><i class="ti ti-brand-telegram"></i> Канал</button>' +
            '<button class="fmx-mt' + (_ss.avatar === 'emoji' ? ' on' : '') + '" data-av="emoji"><i class="ti ti-mood-smile"></i> Эмодзи</button>' +
            '<button class="fmx-mt' + (_ss.avatar === 'img' ? ' on' : '') + '" data-av="img"><i class="ti ti-photo"></i> Фото</button></div>' +
            '<div id="fmx-avemoji" style="' + (_ss.avatar === 'emoji' ? '' : 'display:none;') + '"><div class="fmx-emg">' + EMOJIS.map(function (e) { return '<div class="fmx-em' + (e === _ss.avEmoji ? ' on' : '') + '" data-e="' + e + '">' + e + '</div>'; }).join('') + '</div></div>' +
            '<div id="fmx-avnote" class="fmx-note" style="margin-top:10px;' + (_ss.avatar === 'tg' ? '' : 'display:none;') + '"><i class="ti ti-info-circle"></i> Используется реальный аватар канала из Telegram.</div>' +
            '<div id="fmx-avimg" class="fmx-note" style="margin-top:10px;' + (_ss.avatar === 'img' ? '' : 'display:none;') + '"><i class="ti ti-cloud-upload"></i> Загрузка своего фото с проверкой — скоро.</div>';
        var font = '<span class="fmx-lbl fmx-mt2">Шрифт заголовка</span><div class="fmx-mtabs" id="fmx-font">' +
            FONTS.map(function (f) { return '<button class="fmx-mt' + (f[0] === _ss.font ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>';
        var fx = '<span class="fmx-lbl fmx-mt2"><i class="ti ti-sparkles"></i> Эффекты</span>' +
            '<div class="fmx-row2"><div><div style="font-size:10px;color:#8990a8;margin-bottom:4px;">Движение</div>' + fxSel('move', FX_MOVE) + '</div>' +
            '<div><div style="font-size:10px;color:#8990a8;margin-bottom:4px;">Поверхность</div>' + fxSel('over', FX_OVER) + '</div></div>' +
            '<div class="fmx-row2" style="margin-top:8px;"><div><div style="font-size:10px;color:#f5bf4f;margin-bottom:4px;">Свечение</div>' + fxSel('glow', FX_GLOW) + '</div>' +
            '<div><div style="font-size:10px;color:#f5bf4f;margin-bottom:4px;">Орбита</div>' + fxSel('orbit', FX_ORBIT) + '</div></div>' +
            '<div class="fmx-tog' + (_ss.glowCard ? ' on' : '') + '" id="fmx-glowcard" style="margin-top:10px;"><div class="fmx-sw"><i></i></div><span style="font-size:12.5px;">Золотое свечение карточки</span></div>' +
            '<div class="fmx-tog' + (_ss.glass ? ' on' : '') + '" id="fmx-glass"><div class="fmx-sw"><i></i></div><span style="font-size:12.5px;">Стеклянные кнопки</span></div>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:6px;"><i class="ti ti-info-circle"></i> Движение и Поверхность — бесплатно. <span style="color:#f5bf4f;">Свечение, Орбита и оформление карточки можно посмотреть, но применятся только с продвижением 30 дней (29 990 ₽).</span></div>';
        return colors + av + font + fx;
    }
    function fxSel(key, arr) { return '<select class="fmx-sel" data-fx="' + key + '">' + arr.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === _ss[key] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
    function bindStyle() {
        qsa(el('fmx-colors'), '.fmx-dot').forEach(function (d) { d.addEventListener('click', function () { _ss.color = d.getAttribute('data-c'); qsa(el('fmx-colors'), '.fmx-dot').forEach(function (x) { x.classList.remove('on'); }); d.classList.add('on'); renderHero(); }); });
        qsa(el('fmx-avtype'), 'button').forEach(function (b) { b.addEventListener('click', function () { _ss.avatar = b.getAttribute('data-av'); qsa(el('fmx-avtype'), 'button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); el('fmx-avemoji').style.display = _ss.avatar === 'emoji' ? 'block' : 'none'; el('fmx-avnote').style.display = _ss.avatar === 'tg' ? 'flex' : 'none'; el('fmx-avimg').style.display = _ss.avatar === 'img' ? 'flex' : 'none'; renderHero(); sizePanes(); }); });
        qsa(el('fmx-avemoji'), '.fmx-em').forEach(function (e) { e.addEventListener('click', function () { _ss.avEmoji = e.getAttribute('data-e'); qsa(el('fmx-avemoji'), '.fmx-em').forEach(function (x) { x.classList.remove('on'); }); e.classList.add('on'); renderHero(); }); });
        qsa(el('fmx-font'), 'button').forEach(function (b) { b.addEventListener('click', function () { _ss.font = b.getAttribute('data-f'); qsa(el('fmx-font'), 'button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); renderHero(); }); });
        qsa(el('fmx-p-style'), '[data-fx]').forEach(function (s) { s.addEventListener('change', function () { _ss[s.getAttribute('data-fx')] = s.value; }); });
        el('fmx-glowcard').addEventListener('click', function () { _ss.glowCard = !_ss.glowCard; this.classList.toggle('on'); renderHero(); });
        el('fmx-glass').addEventListener('click', function () { _ss.glass = !_ss.glass; this.classList.toggle('on'); renderHero(); });
    }

    function panePrice() {
        var fl = '<div id="fmx-fmts">' + _sfmts.map(function (f, i) { return '<div class="fmx-chk' + (f.on ? ' on' : '') + '" data-fi="' + i + '"><div class="fmx-box"><i class="ti ti-check"></i></div><span style="font-size:12.5px;flex:1;">' + _esc(f.n) + '</span><input class="fmx-pinp" type="number" data-pi="' + i + '" value="' + f.p + '" step="100"><span style="font-size:11px;color:#8990a8;margin-left:5px;">₽</span></div>'; }).join('') + '</div>';
        var note = '<div class="fmx-note" style="margin-top:4px;"><i class="ti ti-bulb"></i> Бот оценит справедливую цену по метрикам канала. Свою цену ставишь любую.</div>';
        var slots = '<span class="fmx-lbl fmx-mt2"><i class="ti ti-calendar"></i> Свободные слоты</span><input class="fmx-inp" id="fmx-slots" value="' + _esc(_ss._slots || '') + '" placeholder="напр. 2 слота в неделю">';
        return '<span class="fmx-lbl">Что продаёшь и почём</span>' + fl + note + slots;
    }
    function bindPrice() {
        qsa(el('fmx-fmts'), '.fmx-chk').forEach(function (c) { c.addEventListener('click', function (ev) { if (ev.target && ev.target.classList && ev.target.classList.contains('fmx-pinp')) return; var i = +c.getAttribute('data-fi'); _sfmts[i].on = !_sfmts[i].on; c.classList.toggle('on'); renderHero(); }); });
        qsa(el('fmx-fmts'), '[data-pi]').forEach(function (inp) { inp.addEventListener('click', function (e) { e.stopPropagation(); }); inp.addEventListener('input', function () { _sfmts[+inp.getAttribute('data-pi')].p = +inp.value || 0; renderHero(); }); });
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

    function fontStyle(f) { var m = { normal: 'font-weight:600;', bold: 'font-weight:800;', wide: 'font-weight:700;letter-spacing:0.5px;', mono: 'font-family:monospace;font-weight:600;' }; return m[f] || m.normal; }
    function avatarInner(accent) {
        var c = curChannel();
        if (_ss.avatar === 'emoji') return '<div class="fmx-av" style="background:rgba(255,255,255,0.06);border-color:' + accent + ';">' + _ss.avEmoji + '</div>';
        return '<div class="fmx-av" style="background:' + accent + ';">' + _esc((c.title || c.username || '?').charAt(0)) + '</div>';
    }
    function renderHero() {
        var hero = el('fmx-hero'); if (!hero) return;
        var c = curChannel(), accent = _ss.glowCard ? '#f5bf4f' : _ss.color;
        var cover = COVERS[_ss.cover];
        var act = _sfmts.filter(function (f) { return f.on; });
        var minP = act.length ? Math.min.apply(null, act.map(function (f) { return f.p; })) : 0;
        var priceTxt = act.length ? _num(minP) + ' ₽' : '—';
        var title = (_ss._title != null ? _ss._title : (c.title || 'Твой канал')) || 'Твой канал';
        var subs = c.subscribers != null ? _num(c.subscribers) + ' подп.' : 'подписчики';
        var desc = _ss._desc || '';
        var tags = (_ss._tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
        var glass = _ss.glass;
        var writeStyle = glass ? 'background:linear-gradient(135deg,rgba(245,191,79,0.55),rgba(212,160,23,0.4));border:1px solid rgba(245,191,79,0.55);color:#231600;' : 'background:' + accent + ';color:#fff;';
        hero.innerHTML = '<div class="fmx-card' + (_ss.glowCard ? ' fmx-prem' : '') + '" style="max-width:350px;width:100%;">' +
            '<div class="fmx-cov"><div class="fmx-cov-bg" style="background:' + cover + ';"></div>' +
            (_ss.glowCard ? '<span class="fmx-tag gold"><i class="ti ti-rocket"></i> Топ месяца</span>' : '<span class="fmx-tag"><i class="ti ti-circle-check-filled"></i> на продаже</span>') +
            '<button class="fmx-star"><i class="ti ti-star"></i></button></div>' +
            '<div class="fmx-cb"><div class="fmx-crow">' + avatarInner(accent) +
            '<div><div class="fmx-nm" style="' + fontStyle(_ss.font) + '">' + _esc(title) + ' <i class="ti ti-rosette-discount-check-filled fmx-seal"></i></div><div class="fmx-meta">@' + _esc(c.username) + ' · ' + subs + '</div></div></div>' +
            '<div class="fmx-badges"><span class="fmx-bdg fmx-b-live"><i class="ti ti-plant-2"></i>Живой</span><span class="fmx-bdg fmx-b-safe"><i class="ti ti-shield-check"></i>Безопасный</span></div>' +
            (desc ? '<div class="fmx-desc">' + _esc(desc) + '</div>' : '') +
            (tags.length ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px;">' + tags.map(function (t) { return '<span style="font-size:10px;color:#8990a8;background:rgba(255,255,255,0.05);padding:3px 8px;border-radius:6px;">#' + _esc(t) + '</span>'; }).join('') + '</div>' : '') +
            '<div class="fmx-met"><div><div class="l">Цена от</div><div class="v pr" style="color:' + accent + ';">' + priceTxt + '</div></div>' +
            '<div><div class="l"><i class="ti ti-eye"></i>Охват</div><div class="v">' + (c.avg_views ? '~' + _num(c.avg_views) : '~~~') + '</div></div>' +
            '<div class="fmx-sp">' + spark(accent) + '</div></div>' +
            (_ss._slots ? '<div style="font-size:10.5px;color:#5DCAA5;margin-top:9px;"><i class="ti ti-calendar-check"></i> ' + _esc(_ss._slots) + '</div>' : '') +
            '<div class="fmx-acts"><button class="fmx-btn"><i class="ti ti-arrow-up-right"></i>Развернуть</button>' +
            '<button class="fmx-btn fmx-btn-p" style="' + writeStyle + '"><i class="ti ti-brand-telegram"></i>Написать</button></div></div></div>';
    }

    function saveStudio() {
        var btn = el('fmx-save'); btn.disabled = true;
        var ti = el('fmx-title'), de = el('fmx-desc'), ta = el('fmx-tags'), sl = el('fmx-slots');
        var body = {
            formats: _sfmts.filter(function (f) { return f.on; }).map(function (f) { return { format: f.format, price: f.p, unit: 'RUB' }; }),
            slots_note: (sl ? sl.value : _ss._slots) || null,
            custom_text: (de ? de.value : _ss._desc) || null,
            accent_color: _ss.color,
            cover_type: _ss.covType,
            cover_gradient: _ss.covType === 'grad' ? COVERS[_ss.cover] : null,
            avatar_type: _ss.avatar,
            avatar_emoji: _ss.avatar === 'emoji' ? _ss.avEmoji : null,
            title_style: _ss.font,
            tags_json: ((ta ? ta.value : _ss._tags) || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
            effects_json: { move: _ss.move, over: _ss.over, glow: _ss.glow, orbit: _ss.orbit, glowCard: _ss.glowCard, glass: _ss.glass },
            emoji_attachments_json: _ss.att
        };
        var wasCreate = !_ss.listingId, p;
        if (_ss.listingId) p = apiPatch('/api/v1/marketplace/listings/' + _ss.listingId, body);
        else { if (!_ss.channelId) { btn.disabled = false; alert('Сначала выбери канал.'); return; } body.channel_id = _ss.channelId; p = apiPost('/api/v1/marketplace/listings', body); }
        p.then(function (r) {
            _haptic('success');
            if (r && r.listing_id) { _ss.listingId = r.listing_id; if (wasCreate) { var ch = channelById(_ss.channelId); _myListings.push({ id: r.listing_id, username: ch ? ch.username : null, status: 'pending', status_human: 'На модерации' }); } }
            btn.innerHTML = '<i class="ti ti-check"></i> Сохранено';
            toast('Карточка сохранена');
            _feed = null; _feedState = 'idle';
            setTimeout(function () { btn.innerHTML = '<i class="ti ti-rocket"></i> Сохранить карточку'; btn.disabled = false; }, 1600);
        }).catch(function (e) { _haptic('error'); btn.disabled = false; alert('Не удалось сохранить: ' + (e && e.message ? e.message : 'ошибка')); });
    }

    /* ===================== cards ===================== */
    function spark(col) {
        var arr = [], i; for (i = 0; i < 8; i++) arr.push(0.7 + Math.sin(i * 1.1) * 0.15 + i * 0.02);
        var w = 56, h = 20, mx = Math.max.apply(null, arr), mn = Math.min.apply(null, arr);
        var pts = arr.map(function (v, i) { return (i / 7 * w).toFixed(1) + ',' + (h - ((v - mn) / ((mx - mn) || 1)) * (h - 3) - 1.5).toFixed(1); }).join(' ');
        return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    function badges(l) {
        if (l.badges && l.badges.length) {
            var m = { match: ['fmx-b-match', 'ti-target-arrow', 'В точку'], live: ['fmx-b-live', 'ti-plant-2', 'Живой'], safe: ['fmx-b-safe', 'ti-shield-check', 'Безопасный'], big: ['fmx-b-big', 'ti-crown', 'Крупный'] };
            return l.badges.map(function (b) { var x = m[b]; return x ? '<span class="fmx-bdg ' + x[0] + '"><i class="ti ' + x[1] + '"></i>' + x[2] + '</span>' : ''; }).join('');
        }
        var out = []; var rr = _reachRate(l);
        if (rr != null && rr >= 10) out.push('<span class="fmx-bdg fmx-b-live"><i class="ti ti-plant-2"></i>Живой</span>');
        out.push('<span class="fmx-bdg fmx-b-safe"><i class="ti ti-shield-check"></i>Безопасный</span>');
        if (l.subscribers && l.subscribers >= 100000) out.push('<span class="fmx-bdg fmx-b-big"><i class="ti ti-crown"></i>Крупный</span>');
        return out.join('');
    }
    function fullCard(l) {
        var top = _isTop(l), accent = top ? '#f5bf4f' : _accent(l);
        var star = _bookmarks[l.username] ? ' on' : '';
        var t = l.title || l.username || '?';
        return '<div class="fmx-card' + (top ? ' fmx-prem' : '') + '" data-u="' + _esc(l.username) + '">' +
            '<div class="fmx-cov"><div class="fmx-cov-bg" style="background:' + _coverBg(l) + ';"></div>' +
            (top ? '<span class="fmx-tag gold"><i class="ti ti-rocket"></i> Топ месяца</span>' : '<span class="fmx-tag"><i class="ti ti-circle-check-filled"></i> на продаже</span>') +
            '<button class="fmx-star' + star + '" data-bm="' + _esc(l.username) + '"><i class="ti ti-star"></i></button></div>' +
            '<div class="fmx-cb"><div class="fmx-crow"><div class="fmx-av" style="background:' + accent + ';">' + _esc(t.charAt(0)) + '</div>' +
            '<div><div class="fmx-nm">' + _esc(t) + ' <i class="ti ti-rosette-discount-check-filled fmx-seal"></i></div><div class="fmx-meta">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div></div></div>' +
            '<div class="fmx-badges">' + badges(l) + '</div>' +
            (l.custom_text ? '<div class="fmx-desc">' + _esc(l.custom_text) + '</div>' : '') +
            '<div class="fmx-met"><div><div class="l">Цена от</div><div class="v pr" style="color:' + accent + ';">' + _priceFrom(l) + '</div></div>' +
            '<div><div class="l"><i class="ti ti-eye"></i>Охват</div><div class="v">' + (l.avg_views ? '~' + _num(l.avg_views) : '~~~') + '</div></div>' +
            '<div class="fmx-sp">' + spark(accent) + '</div></div>' +
            '<div class="fmx-acts"><button class="fmx-btn" data-act="expand" data-u="' + _esc(l.username) + '"><i class="ti ti-arrow-up-right"></i>Развернуть</button>' +
            '<button class="fmx-btn fmx-btn-p" style="background:' + accent + ';color:#fff;" data-act="write" data-u="' + _esc(l.username) + '"><i class="ti ti-brand-telegram"></i>Написать</button></div></div></div>';
    }
    function simpleCard(l) {
        var accent = _accent(l), t = l.title || l.username || '?';
        return '<div class="fmx-scard" data-u="' + _esc(l.username) + '"><div class="fmx-srow"><div class="fmx-sav" style="background:' + accent + ';">' + _esc(t.charAt(0)) + '</div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-nm" style="padding-top:0;">' + _esc(t) + '</div><div class="fmx-meta">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div></div>' +
            '<button class="fmx-star" style="position:static;background:transparent;border:0.5px solid rgba(255,255,255,0.12);' + (_bookmarks[l.username] ? 'color:#f59e0b;' : '') + '" data-bm="' + _esc(l.username) + '"><i class="ti ti-star"></i></button></div>' +
            '<div class="fmx-met" style="margin-top:11px;"><div><div class="l">Цена от</div><div class="v pr">' + _priceFrom(l) + '</div></div>' +
            '<div><div class="l"><i class="ti ti-eye"></i>Охват</div><div class="v">' + (l.avg_views ? '~' + _num(l.avg_views) : '~~~') + '</div></div>' +
            '<div class="fmx-sp">' + spark(GR) + '</div></div>' +
            '<div class="fmx-acts"><button class="fmx-btn" data-act="write" data-u="' + _esc(l.username) + '"><i class="ti ti-brand-telegram"></i>Написать каналу</button></div></div>';
    }
    function listRow(l) {
        var accent = _isTop(l) ? '#f5bf4f' : _accent(l), t = l.title || l.username || '?';
        return '<div class="fmx-lrow" data-act="expand" data-u="' + _esc(l.username) + '"><span class="fmx-ldot" style="background:' + accent + ';"></span>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-lname">' + _esc(t) + '</div><div class="fmx-lsub">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + '</div></div>' +
            '<span class="fmx-lprice">' + _priceFrom(l) + '</span></div>';
    }

    function bindCards() {
        var host = el('fmx-main');
        qsa(host, '[data-bm]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); toggleBm(b.getAttribute('data-bm')); }); });
        qsa(host, '[data-act="write"]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); openTg(b.getAttribute('data-u')); }); });
        qsa(host, '[data-act="expand"]').forEach(function (b) { b.addEventListener('click', function () { openListing(b.getAttribute('data-u')); }); });
    }
    function bindView() { qsa(el('fmx-main'), '[data-view]').forEach(function (b) { b.addEventListener('click', function () { _view = b.getAttribute('data-view'); if (_subTab === 'buy') renderBuy(); }); }); var pb = el('fmx-promobtn'); if (pb) pb.addEventListener('click', openPromo); }
    function bindSort() { qsa(el('fmx-main'), '[data-sort]').forEach(function (b) { b.addEventListener('click', function () { _sort = b.getAttribute('data-sort'); if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy(); }); }); }

    function sortBarHtml() {
        return '<div class="fmx-sortbar">' +
            '<button class="fmx-seg' + (_sort === 'match' ? ' on' : '') + '" data-sort="match"><i class="ti ti-target-arrow"></i> Под мою нишу</button>' +
            '<button class="fmx-seg' + (_sort === 'all' ? ' on' : '') + '" data-sort="all"><i class="ti ti-layout-grid"></i> Все каналы</button>' +
            '<button class="fmx-seg' + (_sort === 'niche' ? ' on' : '') + '" data-sort="niche"><i class="ti ti-filter"></i> Выбрать нишу</button></div>';
    }
    function searchHtml(ph) { return '<div class="fmx-search"><i class="ti ti-search"></i><input placeholder="' + ph + '"></div>'; }
    function topRowHtml() {
        return '<div class="fmx-toprow"><button class="fmx-promo" id="fmx-promobtn"><i class="ti ti-rocket"></i> Продвинуть</button>' +
            '<div class="fmx-vtog"><button class="fmx-vt' + (_view === 'cards' ? ' on' : '') + '" data-view="cards"><i class="ti ti-layout-grid"></i></button>' +
            '<button class="fmx-vt' + (_view === 'list' ? ' on' : '') + '" data-view="list"><i class="ti ti-list"></i></button></div></div>';
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
        promo.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-rocket" style="color:#f5bf4f;"></i> Продвинуть карточку</h2><p>Поднимает карточку выше в умной сортировке. Выше — больше рекламодателей видят. Топ всегда смешанный, не «всё выкуплено».</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-promoBody"></div></div>';
        document.body.appendChild(promo);
        promo.addEventListener('click', function (e) { if (e.target === promo) hideModal('fmx-promoBg'); });
        promo.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-promoBg'); });

        var lst = document.createElement('div'); lst.className = 'fmx-mbg'; lst.id = 'fmx-listBg';
        lst.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2 id="fmx-listTitle" style="font-size:15px;"></h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-listBody"></div></div>';
        document.body.appendChild(lst);
        lst.addEventListener('click', function (e) { if (e.target === lst) hideModal('fmx-listBg'); });
        lst.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-listBg'); });

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
        else body = TIPS.map(function (t) { return '<div class="fmx-tip"><i class="ti ti-circle-check"></i><span>' + _esc(t) + '</span></div>'; }).join('');
        el('fmx-faqBody').innerHTML = '<div class="fmx-ftabs"><button class="fmx-ft' + (_faqTab === 'terms' ? ' on' : '') + '" data-t="terms">Что значат цифры</button><button class="fmx-ft' + (_faqTab === 'tips' ? ' on' : '') + '" data-t="tips">Как рекламироваться</button></div>' + body;
        qsa(el('fmx-faqBody'), '[data-t]').forEach(function (b) { b.addEventListener('click', function () { _faqTab = b.getAttribute('data-t'); openFaq(); }); });
        showModal('fmx-faqBg');
    }
    function openPromo() {
        el('fmx-promoBody').innerHTML =
            '<div class="fmx-po"><div class="fmx-po-top"><div class="fmx-po-nm"><i class="ti ti-bolt" style="color:#818cf8;"></i> Поднятие 24 часа</div><div class="fmx-po-pr">490 ₽</div></div>' +
            '<div class="fmx-po-li"><i class="ti ti-arrow-up"></i> Поднимаем карточку выше в топе на сутки. Больше показов — больше откликов.</div>' +
            '<button class="fmx-po-buy" data-buy="24">Поднять на 24 часа</button></div>' +
            '<div class="fmx-po"><div class="fmx-po-top"><div class="fmx-po-nm"><i class="ti ti-bolt" style="color:#818cf8;"></i> Поднятие 48 часов</div><div class="fmx-po-pr">1 390 ₽</div></div>' +
            '<div class="fmx-po-li"><i class="ti ti-arrow-up"></i> То же, но на двое суток.</div>' +
            '<button class="fmx-po-buy" data-buy="48">Поднять на 48 часов</button></div>' +
            '<div class="fmx-limit"><i class="ti ti-info-circle"></i> Поднятия на 24 и 48 часов вместе — не больше 3 раз за 30 дней.</div>' +
            '<div class="fmx-po gold"><div class="fmx-po-top"><div class="fmx-po-nm"><i class="ti ti-rocket" style="color:#f5bf4f;"></i> Продвижение 30 дней</div><div class="fmx-po-pr gold">29 990 ₽</div></div>' +
            '<div class="fmx-po-li gold"><i class="ti ti-arrow-up"></i> Приоритет в топе на месяц, максимум показов.</div>' +
            '<div class="fmx-po-li gold"><i class="ti ti-sparkles"></i> Эксклюзивное оформление: золотое свечение, премиум-фон, спецэффекты, стеклянные кнопки.</div>' +
            '<div class="fmx-po-li gold"><i class="ti ti-circle-check"></i> Не входит в лимит трёх поднятий.</div>' +
            '<button class="fmx-po-buy gold" data-buy="top">Оформить продвижение на 30 дней</button></div>';
        qsa(el('fmx-promoBody'), '[data-buy]').forEach(function (b) { b.addEventListener('click', function () { _haptic('light'); alert('Оплата продвижения (' + b.getAttribute('data-buy') + ') — подключим биллинг.'); }); });
        showModal('fmx-promoBg');
    }
    function openListing(u) {
        var l = findListing(u); if (!l) { openTg(u); return; }
        var accent = _isTop(l) ? '#f5bf4f' : _accent(l);
        var fmts = (l.formats && l.formats.length) ? '<div style="display:flex;flex-direction:column;gap:7px;margin-top:8px;">' + l.formats.map(function (f) { return '<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:9px 11px;background:rgba(255,255,255,0.03);border-radius:9px;"><span>' + _esc(f.label || f.format) + '</span><b>' + _num(f.price) + ' ₽</b></div>'; }).join('') + '</div>' : '';
        var mstr = [];
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
            '<button class="fmx-btn fmx-btn-p" style="background:' + accent + ';color:#fff;" data-w="' + _esc(u) + '"><i class="ti ti-brand-telegram"></i>Написать владельцу</button></div>';
        el('fmx-listBody').querySelectorAll('[data-bm]').forEach(function (b) { b.addEventListener('click', function () { toggleBm(b.getAttribute('data-bm')); }); });
        el('fmx-listBody').querySelectorAll('[data-w]').forEach(function (b) { b.addEventListener('click', function () { openTg(b.getAttribute('data-w')); }); });
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