(function () {
    'use strict';

    var _channels = null, _chId = null, _items = [], _right = null, _busy = false, _pollTimer = null;
    var _chPaused = false, _pausedNote = '', _openId = null;
    var _campaigns = [], _cands = [], _campId = null, _pendingItem = null, _campManual = null;
    var CLICK_BASE = 'https://fmtr.click';

    function _syncCamp() {
        if (_campId != null && !_campaigns.some(function (c) { return c.id === _campId; })) _campId = null;
    }

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} }
    function toast(m) { try { if (typeof showToast === 'function') return showToast(m); } catch (e) {} }
    function num(n) { try { return new Intl.NumberFormat('ru-RU').format(n); } catch (e) { return String(n); } }
    function rub(v) { return (v > 0 ? num(v) : '<1') + ' ₽'; }
    function plural3(n, one, few, many) {
        var a = n % 10, b = n % 100;
        if (a === 1 && b !== 11) return one;
        if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
        return many;
    }
    function mediaAbs(u) { if (!u) return u; if (/^(https?:|blob:|data:)/.test(u)) return u; var b = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : ''; return b + u; }
    function avInner(title, url) {
        return esc(String(title || '?').trim().charAt(0).toUpperCase() || '?') +
            (url ? '<img data-plav src="' + esc(mediaAbs(url)) + '" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;">' : '');
    }
    function bindAv(scope) {
        (scope || document).querySelectorAll('img[data-plav]').forEach(function (im) {
            im.addEventListener('error', function () { im.remove(); });
        });
    }
    function fmtDay(iso) {
        try { var d = new Date(iso); return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2); }
        catch (e) { return ''; }
    }

    function injectStyles() {
        if (document.getElementById('pl-style')) return;
        var s = document.createElement('style');
        s.id = 'pl-style';
        s.textContent = [
            '.pl-screen{position:fixed;inset:0;z-index:9200;display:none;flex-direction:column;background:#0a0d18;color:#e8e8ed;font-family:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;}',
            'html.pl-noscroll,body.pl-noscroll{overflow:hidden!important;}',
            '.pl-screen.on{display:flex;}',
            '.pl-head{display:flex;align-items:center;gap:10px;padding:14px 16px 8px;flex:0 0 auto;}',
            '.pl-back{width:38px;height:38px;border-radius:11px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#c9cede;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;}',
            '.pl-ht{font-size:16px;font-weight:800;}',
            '.pl-body{flex:1;overflow-y:auto;padding:4px 16px 90px;overscroll-behavior:contain;}',
            '.pl-how{background:linear-gradient(180deg,rgba(129,140,248,0.09),rgba(129,140,248,0.03));border:1px solid rgba(129,140,248,0.28);border-radius:13px;padding:11px 12px;margin-bottom:12px;}',
            '.pl-howt{font-size:12.5px;font-weight:750;display:flex;align-items:center;gap:8px;color:#c3c9f4;cursor:pointer;min-height:24px;}',
            '.pl-step{display:flex;gap:10px;margin-top:10px;align-items:flex-start;}',
            '.pl-step .n{width:24px;height:24px;flex:0 0 auto;border-radius:8px;background:rgba(129,140,248,0.15);border:1px solid rgba(129,140,248,0.4);color:#a5b0ff;font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center;}',
            '.pl-step b{font-size:12px;display:block;color:#e8e8ed;}',
            '.pl-step span{font-size:10.5px;color:#8990a8;line-height:1.45;display:block;margin-top:1px;}',
            '.pl-deal{background:#10131f;border:0.5px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 11px;margin-top:7px;display:flex;align-items:center;gap:9px;cursor:pointer;min-height:44px;}',
            '.pl-new{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:13px;border-radius:13px;border:0;background:linear-gradient(145deg,#818cf8,#6366f1);color:#0b0c16;font-size:13.5px;font-weight:700;font-family:inherit;cursor:pointer;margin-bottom:14px;}',
            '.pl-acc{background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;margin-bottom:9px;overflow:hidden;}',
            '.pl-acc.open{border-color:rgba(99,102,241,0.3);}',
            '.pl-acch{display:flex;align-items:center;gap:10px;padding:12px 13px;cursor:pointer;user-select:none;min-height:44px;box-sizing:border-box;}',
            '.pl-eava{position:relative;width:34px;height:34px;border-radius:10px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#aeb6cf;background:linear-gradient(140deg,#2a3350,#171d30);border:1px solid rgba(255,255,255,0.08);}',
            '.pl-eava i{position:absolute;right:-2px;bottom:-2px;width:9px;height:9px;border-radius:50%;border:2px solid #12151d;font-style:normal;}',
            '.pl-eava i.g{background:#5DCAA5;}',
            '.pl-eava i.p{background:#fbbf5f;}',
            '.pl-eava i.o{background:#565b73;}',
            '.pl-erow{display:flex;align-items:center;gap:6px;margin-top:5px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,#000 92%,transparent);mask-image:linear-gradient(90deg,#000 92%,transparent);}',
            '.pl-fun{display:inline-flex;flex:0 0 auto;border:1px solid rgba(255,255,255,0.10);border-radius:8px;overflow:hidden;background:rgba(255,255,255,0.02);}',
            '.pl-fseg{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3px 7px 2.5px;border-left:1px solid rgba(255,255,255,0.07);min-width:0;}',
            '.pl-fseg:first-child{border-left:none;}',
            '.pl-fseg b{font-size:10.5px;font-weight:800;line-height:1.15;white-space:nowrap;font-variant-numeric:tabular-nums;}',
            '.pl-fseg em{font-style:normal;font-size:6.5px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:#565b73;white-space:nowrap;margin-top:1px;}',
            '.pl-fseg.gg{background:rgba(93,202,165,0.07);}',
            '.pl-fseg.gg b{color:#5DCAA5;}',
            '.pl-fseg.gg em{color:rgba(93,202,165,0.65);}',
            '.pl-awin{display:block;margin-top:6px;}',
            '.pl-awin .tr{display:block;height:3px;border-radius:2px;background:rgba(255,255,255,0.07);overflow:hidden;}',
            '.pl-awin .tr i{display:block;height:100%;border-radius:2px;background:linear-gradient(90deg,rgba(129,140,248,0.8),rgba(93,202,165,0.8));}',
            '.pl-awin .tx{display:block;font-size:8.5px;color:#565b73;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-awin.done .tx{color:rgba(245,191,79,0.75);}',
            '.pl-ecpf u{display:block;text-decoration:none;font-size:9.5px;font-weight:700;color:#8990a8;margin-top:4px;line-height:1.1;font-variant-numeric:tabular-nums;}',
            '.pl-ecpf s{display:block;text-decoration:none;font-size:7px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#565b73;margin-top:1px;}',
            '.pl-ecpf{flex:0 0 auto;text-align:right;font-variant-numeric:tabular-nums;}',
            '.pl-ecpf b{display:block;font-size:13.5px;font-weight:800;line-height:1.1;}',
            '.pl-ecpf em{display:block;font-style:normal;font-size:8px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#565b73;margin-top:1px;}',
            '.pl-amid{flex:1;min-width:0;}',
            '.pl-anm{font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-dcol.tap{cursor:pointer;border-radius:6px;}',
            '.pl-dcol.tap:active{background:rgba(129,140,248,0.12);}',
            '.pl-jall{margin-top:10px;}',
            '.pl-jall u{text-decoration:none;color:#818cf8;font-weight:800;font-variant-numeric:tabular-nums;margin-left:4px;}',
            '.pl-jov{position:fixed;inset:0;z-index:9980;background:#0b0e14;opacity:0;pointer-events:none;transition:opacity .18s;display:flex;justify-content:center;}',
            '.pl-jov.on{opacity:1;pointer-events:auto;}',
            '.pl-jsh{width:100%;max-width:640px;height:100%;display:flex;flex-direction:column;padding:calc(10px + env(safe-area-inset-top)) 0 env(safe-area-inset-bottom);}',
            '.pl-jt{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:800;padding:4px 14px;flex-shrink:0;}',
            '.pl-jback{width:36px;height:36px;margin-left:-8px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;color:#c6cdde;cursor:pointer;}',
            '.pl-jback:active{background:rgba(255,255,255,0.07);}',
            '.pl-jc{font-size:10.5px;color:#8990a8;padding:5px 14px 0;flex-shrink:0;}',
            '.pl-jc b{color:#e8eaf1;} .pl-jc .d{color:#818cf8;} .pl-jc .g{color:#5DCAA5;} .pl-jc .r{color:#ef8080;}',
            '.pl-jreset{color:#818cf8;font-weight:700;cursor:pointer;}',
            '.pl-jchips{display:flex;gap:6px;padding:10px 14px 4px;flex-wrap:wrap;flex-shrink:0;}',
            '.pl-jchip{font-size:10.5px;font-weight:700;padding:6px 11px;border-radius:99px;cursor:pointer;color:#8990a8;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.1);}',
            '.pl-jchip.on{color:#818cf8;background:rgba(129,140,248,0.14);border-color:rgba(129,140,248,0.5);}',
            '.pl-jsrch{display:flex;align-items:center;gap:7px;margin:8px 14px 4px;padding:8px 12px;border-radius:11px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#565b73;flex-shrink:0;}',
            '.pl-jsrch input{flex:1;min-width:0;background:transparent;border:none;outline:none;color:#e8eaf1;font-family:inherit;font-size:11.5px;}',
            '.pl-jbody{flex:1;min-height:120px;overflow-y:auto;padding:2px 14px 12px;-webkit-overflow-scrolling:touch;}',
            '.pl-jmore{display:flex;align-items:center;justify-content:center;gap:6px;margin:8px 0 4px;padding:10px;border-radius:11px;font-size:11.5px;font-weight:700;color:#c6cdde;cursor:pointer;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.12);}',
            '.pl-jfoot{font-size:9.5px;color:#565b73;text-align:center;padding:6px 0 2px;}',
            '.pl-accc{color:#565b73;font-size:17px;transition:transform 240ms;flex-shrink:0;}',
            '.pl-acc.open .pl-accc{transform:rotate(180deg);}',
            '.pl-accb{max-height:0;overflow:hidden;transition:max-height 320ms ease;}',
            '.pl-acc.open .pl-accb{max-height:2600px;}',
            '.pl-acci{padding:2px 13px 15px;}',
            '.pl-tape{display:grid;grid-template-columns:repeat(4,1fr);background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;margin-bottom:12px;overflow:hidden;}',
            '.pl-tq{padding:9px 10px;border-right:0.5px solid rgba(255,255,255,0.05);min-width:0;}',
            '.pl-tq:last-child{border-right:0;}',
            '.pl-tq .k{font-size:8.5px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#565b73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-tq .v{font-size:14px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums;white-space:nowrap;}',
            '.pl-hero{display:flex;align-items:flex-end;gap:10px;margin-top:8px;}',
            '.pl-cpfbig{font-size:28px;font-weight:800;letter-spacing:-0.02em;line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap;}',
            '.pl-cpfcap{font-size:10px;color:#8990a8;margin-top:4px;}',
            '.pl-heror{margin-left:auto;text-align:right;min-width:0;}',
            '.pl-heror .v{font-size:17px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;}',
            '.pl-btrack{position:relative;height:7px;border-radius:4px;background:linear-gradient(90deg,rgba(93,202,165,0.55),rgba(245,158,11,0.5),rgba(239,68,68,0.5));margin-top:13px;}',
            '.pl-bmark{position:absolute;top:-3.5px;width:3px;height:14px;border-radius:2px;background:#fff;box-shadow:0 0 0 2.5px rgba(255,255,255,0.18);}',
            '.pl-blabs{display:flex;justify-content:space-between;gap:8px;font-size:9px;color:#565b73;margin-top:5px;}',
            '.pl-blabs span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-f4g{display:grid;gap:1px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.05);border-radius:12px;overflow:hidden;margin-top:13px;}',
            '.pl-f4g.n2{grid-template-columns:repeat(2,1fr);}',
            '.pl-f4g.n3{grid-template-columns:repeat(3,1fr);}',
            '.pl-f4g.n4{grid-template-columns:repeat(4,1fr);}',
            '@media(max-width:359px){.pl-f4g.n4{grid-template-columns:repeat(2,1fr);}.pl-f4g.n3{grid-template-columns:repeat(3,1fr);}}',
            '.pl-f4{background:#10141f;padding:9px 8px;min-width:0;}',
            '.pl-f4 .k{font-size:8.5px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#565b73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-f4 .v{font-size:13px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-f4 .c{font-size:8.5px;color:#565b73;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-mgrid{display:grid;gap:1px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.05);border-radius:11px;overflow:hidden;margin-top:8px;}',
            '.pl-mc{background:#10141f;padding:8px 9px;min-width:0;}',
            '.pl-mc .k{font-size:8px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#565b73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-mc .v{font-size:13px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap;}',
            '.pl-mc .c{font-size:8px;color:#565b73;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-ledger{margin-top:11px;}',
            '.pl-lrow{display:flex;align-items:baseline;gap:8px;padding:10px 0;font-size:11.5px;cursor:pointer;}',
            '.pl-lrow .k{color:#8990a8;flex:0 0 auto;}',
            '.pl-lrow .dots{flex:1;border-bottom:1px dotted rgba(255,255,255,0.14);transform:translateY(-3px);min-width:12px;}',
            '.pl-lrow .v{font-weight:700;flex:0 0 auto;font-variant-numeric:tabular-nums;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.pl-lrow .e{color:#818cf8;font-size:10px;font-weight:600;flex:0 0 auto;}',
            '.pl-lnk2{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 10px;margin-top:8px;}',
            '.pl-lnk2 code{flex:1;min-width:0;font-size:10.5px;font-family:ui-monospace,monospace;color:#a5b4fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-dacts{display:flex;gap:6px;margin-top:12px;}',
            '.pl-dbtn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:0.5px solid rgba(255,255,255,0.14);background:transparent;border-radius:10px;padding:9px 4px;font-size:10.5px;font-weight:650;color:#c9cede;font-family:inherit;cursor:pointer;min-height:40px;min-width:0;}',
            '.pl-dbtn i{font-size:14px;flex:0 0 auto;}',
            '.pl-dbtn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.pl-dbtn.quiet{color:#8990a8;}',
            '.pl-dbtn.iconb{flex:0 0 44px;color:#c98181;}',
            '.pl-pausebox{display:flex;gap:11px;align-items:flex-start;background:rgba(245,191,79,0.08);border:0.5px solid rgba(245,191,79,0.30);border-radius:14px;padding:13px 14px;margin:10px 0 14px;}',
            '.pl-pausebox i{font-size:18px;color:#fbbf5f;flex:0 0 auto;margin-top:1px;}',
            '.pl-pausebox b{display:block;font-size:13px;color:#fbbf5f;margin-bottom:3px;}',
            '.pl-pausebox span{font-size:11.5px;color:#8990a8;line-height:1.45;}',
            '.pl-glink{font-size:11px;color:#818cf8;font-weight:700;cursor:pointer;margin-bottom:10px;display:inline-block;padding:2px 0;}',
            '.pl-src{background:rgba(23,29,48,0.55);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,0.10);border-radius:18px;margin-bottom:10px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 10px 30px rgba(0,0,0,0.35);}',
            '.pl-srow{display:flex;align-items:center;gap:12px;padding:13px 14px;}',
            '.pl-sic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:inset 0 0 0 0.5px rgba(255,255,255,0.14);}',
            '.pl-sic svg{width:22px;height:22px;display:block;}',
            '.pl-sic.yt{background:linear-gradient(140deg,rgba(255,0,0,0.28),rgba(255,0,0,0.10));}',
            '.pl-sic.vk{background:linear-gradient(140deg,rgba(0,119,255,0.30),rgba(0,119,255,0.10));}',
            '.pl-sic.dz{background:linear-gradient(140deg,rgba(255,255,255,0.20),rgba(255,255,255,0.06));}',
            '.pl-sic.tt{background:linear-gradient(140deg,rgba(37,244,238,0.16),rgba(254,44,85,0.16));}',
            '.pl-sic.ig{background:linear-gradient(140deg,rgba(221,42,123,0.26),rgba(129,52,175,0.16));}',
            '.pl-snm{flex:1;min-width:0;}',
            '.pl-snm b{display:flex;align-items:center;gap:6px;font-size:14.5px;font-weight:700;min-width:0;}',
            '.pl-snm b u{text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-snm b i{color:#565b73;font-size:12px;flex:0 0 auto;}',
            '.pl-snm em{display:block;font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:0.05em;color:#8990a8;text-transform:uppercase;margin-top:1px;}',
            '.pl-schip{display:flex;align-items:center;gap:8px;margin:0 14px 4px;padding:7px 10px;border-radius:10px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);}',
            '.pl-schip s{text-decoration:none;color:#565b73;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;font-size:9.5px;flex:0 0 auto;}',
            '.pl-schip code{flex:1;min-width:0;font-family:ui-monospace,monospace;font-size:11.5px;color:#8990a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-schip b{color:#818cf8;font-weight:700;font-size:11px;flex:0 0 auto;cursor:pointer;}',
            '.pl-sq{width:26px;height:26px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;font-size:13px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;font-weight:700;cursor:pointer;}',
            '.pl-sq.on{color:#818cf8;border-color:rgba(129,140,248,0.6);}',
            '.pl-shint{border-top:1px solid rgba(255,255,255,0.07);background:rgba(129,140,248,0.06);padding:11px 14px;font-size:12.5px;line-height:1.55;color:#8990a8;}',
            '.pl-shint b{color:#e8e8ed;}',
            '.pl-tiles{display:flex;gap:8px;padding:0 14px 14px;}',
            '.pl-tile{flex:1;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.07);border-radius:12px;padding:9px 10px 8px;min-width:0;}',
            '.pl-tile b{display:block;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-tile b small{font-size:11px;font-weight:700;}',
            '.pl-tile span{display:block;font-size:10px;color:#8990a8;margin-top:1px;line-height:1.35;}',
            '.pl-tile.act{border-style:dashed;border-color:rgba(129,140,248,0.45);cursor:pointer;}',
            '.pl-tile.act b{color:#818cf8;font-size:12.5px;padding-top:3px;}',
            '.pl-tile b.g{color:#4ade80;}.pl-tile b.w{color:#fbbf24;}.pl-tile b.r{color:#f87171;}.pl-tile b.m{color:#8990a8;font-size:12.5px;padding-top:3px;}',
            '.pl-skind{display:inline-flex;align-items:center;gap:6px;margin:0 14px 8px;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;}',
            '.pl-skind i{font-size:12px;}',
            '.pl-skind.cl{background:rgba(74,222,128,0.12);color:#4ade80;border:0.5px solid rgba(74,222,128,0.28);}',
            '.pl-skind.op{background:rgba(240,163,94,0.10);color:#f0a35e;border:0.5px solid rgba(240,163,94,0.32);}',
            '.pl-skind.nm{background:rgba(141,147,168,0.10);color:#8990a8;border:0.5px solid rgba(141,147,168,0.25);}',
            '.pl-schip.fmtr{border-color:rgba(240,163,94,0.32);background:rgba(240,163,94,0.08);}',
            '.pl-mopt{border:1px solid rgba(255,255,255,0.10);border-radius:14px;padding:12px 13px;margin-bottom:9px;cursor:pointer;position:relative;}',
            '.pl-mopt b{display:block;font-size:13.5px;font-weight:700;margin-bottom:3px;padding-right:92px;}',
            '.pl-mopt p{margin:0 0 4px;display:flex;gap:7px;font-size:11.5px;line-height:1.5;color:#8990a8;}',
            '.pl-mopt p:last-child{margin:0;}',
            '.pl-mopt p i{font-style:normal;font-weight:800;flex:0 0 auto;width:10px;}',
            '.pl-mopt p.g i{color:#4ade80;}.pl-mopt p.r i{color:#f87171;}',
            '.pl-mtag{position:absolute;top:12px;right:13px;font-size:9px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;padding:2px 7px;border-radius:99px;}',
            '.pl-mtag.g{background:rgba(74,222,128,0.14);color:#4ade80;}.pl-mtag.o{background:rgba(240,163,94,0.10);color:#f0a35e;}',
            '.pl-sadd{display:flex;align-items:center;justify-content:center;gap:8px;border:1px dashed rgba(255,255,255,0.14);border-radius:14px;padding:11px;color:#8990a8;font-size:12.5px;font-weight:600;margin-bottom:10px;cursor:pointer;width:100%;background:transparent;}',
            '.pl-sbest{position:relative;overflow:visible;}',
            '.pl-sbest:before{content:\"\";position:absolute;inset:0;border-radius:18px;pointer-events:none;border:1px solid rgba(74,222,128,0.45);}',
            '.pl-sbestlab{position:absolute;top:-9px;left:14px;z-index:2;background:#0a0d18;padding:0 8px;font-size:10.5px;font-weight:800;color:#4ade80;letter-spacing:0.06em;line-height:1.4;}',
            '.pl-chips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;-webkit-overflow-scrolling:touch;}',
            '.pl-chip{flex:0 0 auto;font-size:11px;font-weight:700;padding:7px 13px;border-radius:99px;border:0.5px solid rgba(255,255,255,0.14);color:#8990a8;cursor:pointer;white-space:nowrap;min-height:30px;display:inline-flex;align-items:center;}',
            '.pl-chip.on{border-color:rgba(129,140,248,0.7);background:rgba(129,140,248,0.12);color:#c7cdfb;}',
            '.pl-chip.add{color:#818cf8;border-style:dashed;}',
            '.pl-cand{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.09);border-radius:12px;padding:10px 11px;margin-bottom:7px;}',
            '.pl-cand .nm{font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.pl-cand .mt{font-size:10px;color:#8990a8;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.pl-cand .bts{display:flex;gap:7px;margin-top:9px;}',
            '.pl-cand .go{flex:1;border:0;border-radius:10px;padding:9px 8px;font-size:11px;font-weight:700;background:rgba(129,140,248,0.16);color:#a5b0ff;font-family:inherit;cursor:pointer;min-height:36px;}',
            '.pl-cand .rm{flex:0 0 auto;border:0.5px solid rgba(255,255,255,0.14);background:transparent;border-radius:10px;padding:9px 12px;font-size:11px;font-weight:600;color:#8990a8;font-family:inherit;cursor:pointer;min-height:36px;}',
            '.pl-cb{width:18px;height:18px;border-radius:6px;border:1.5px solid rgba(255,255,255,0.25);flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:11px;color:#0b0c16;}',
            '.pl-cb.on{background:#818cf8;border-color:#818cf8;}',
            '.pl-fcap{font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#565b73;margin-bottom:6px;}',
            '.pl-minfo{font-size:10.5px;color:#8990a8;line-height:1.6;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);border-radius:9px;padding:9px 11px;margin-top:2px;}',
            '.pl-minfo b{color:#c9cede;font-weight:700;}',
            '.pl-minfo div{margin:3px 0;}',
            '.pl-copy{border:0;background:rgba(93,202,165,0.16);color:#5DCAA5;border-radius:8px;padding:7px 11px;font-size:10.5px;font-weight:700;font-family:inherit;cursor:pointer;flex:0 0 auto;min-height:32px;}',
            '.pl-revoke{border:0;background:transparent;color:#8990a8;font-size:10.5px;font-weight:600;font-family:inherit;cursor:pointer;padding:7px 4px;margin-top:4px;}',
            '.pl-actrow{display:flex;align-items:center;gap:16px;}',
            '.pl-revoke.danger{color:#c98181;}',
            '.pl-note{font-size:9.5px;color:#565b73;margin-top:7px;line-height:1.5;}',
            '.pl-perm{background:rgba(245,191,79,0.06);border:1px solid rgba(245,191,79,0.28);border-radius:14px;padding:13px;margin-bottom:12px;}',
            '.pl-perm .t{font-size:12.5px;font-weight:700;color:#f5bf4f;display:flex;gap:7px;align-items:center;margin-bottom:6px;}',
            '.pl-perm .d{font-size:11.5px;color:#a9aec0;line-height:1.55;}',
            '.pl-perm ol{margin:9px 0 0;padding:0 0 0 16px;font-size:11.5px;color:#c9cede;line-height:1.7;}',
            '.pl-ghost{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:12px;border-radius:12px;border:0.5px solid rgba(255,255,255,0.14);background:transparent;color:#c9cede;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer;margin-top:12px;}',
            '.pl-empty{text-align:center;padding:34px 16px;color:#8990a8;}',
            '.pl-empty i{font-size:26px;color:#565b73;}',
            '.pl-empty h3{font-size:14px;color:#c9cede;margin:9px 0 4px;}',
            '.pl-empty p{font-size:11.5px;margin:0;line-height:1.5;}',
            '.pl-cfbg{position:fixed;inset:0;z-index:9400;background:rgba(5,7,14,0.62);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity 160ms ease;}',
            '.pl-cfbg.on{opacity:1;pointer-events:auto;}',
            '.pl-cf{width:100%;max-width:320px;background:rgba(24,28,46,0.98);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:0.5px solid rgba(255,255,255,0.1);border-radius:18px;padding:18px 16px 14px;transform:scale(0.95);transition:transform 160ms ease;}',
            '.pl-cfbg.on .pl-cf{transform:scale(1);}',
            '.pl-cftxt{font-size:13px;line-height:1.55;color:#d9dce8;}',
            '.pl-cfrow{display:flex;gap:10px;margin-top:16px;}',
            '.pl-cfbtn{flex:1;border:0;border-radius:11px;padding:11px 8px;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer;min-height:40px;}',
            '.pl-cfbtn.cancel{background:rgba(255,255,255,0.07);color:#aeb6cf;}',
            '.pl-cfbtn.ok{background:rgba(129,140,248,0.18);color:#a5b0ff;}',
            '.pl-cfbtn.ok.danger{background:rgba(201,129,129,0.16);color:#e09a9a;}',
            '.pl-sheetbg{position:fixed;inset:0;z-index:9300;background:rgba(5,7,14,0.6);display:none;}',
            '.pl-sheetbg.on{display:block;}',
            '.pl-sheet{position:fixed;bottom:0;left:50%;transform:translate(-50%,105%);width:100%;max-width:520px;z-index:9310;background:rgba(20,24,40,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:22px 22px 0 0;border:0;border-top:1.5px solid rgba(255,255,255,0.38);box-shadow:0 -26px 64px rgba(0,0,0,0.75),0 1px 0 rgba(255,255,255,0.08) inset;padding:10px 16px 24px;transition:transform 240ms cubic-bezier(0.3,0.9,0.3,1);max-height:84dvh;overflow-y:auto;overscroll-behavior:contain;}',
            '.pl-sheet.on{transform:translate(-50%,0);}',
            '.pl-grip{width:38px;height:4px;border-radius:4px;background:rgba(255,255,255,0.18);margin:2px auto 12px;}',
            '.pl-flabel{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#565b73;margin:12px 0 6px;}',
            '.pl-inp{width:100%;box-sizing:border-box;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:11px;padding:11px 12px;font-size:13px;color:#e8e8ed;font-family:inherit;outline:none;}',
            '.pl-ltopt{border:0.5px solid rgba(255,255,255,0.12);border-radius:11px;padding:10px 12px;margin-top:8px;cursor:pointer;}',
            '.pl-ltopt b{display:block;font-size:12px;font-weight:700;color:#e8e8ed;}',
            '.pl-ltopt span{display:block;font-size:10.5px;color:#8990a8;line-height:1.45;margin-top:2px;}',
            '.pl-ltopt.sel{border-color:rgba(129,140,248,0.7);background:rgba(129,140,248,0.08);}',
            '.pl-fmtrow{display:flex;flex-wrap:wrap;gap:6px;}',
            '.pl-fmt{border:0.5px solid rgba(255,255,255,0.14);border-radius:99px;padding:6px 12px;font-size:11px;color:#a9aec0;cursor:pointer;}',
            '.pl-fmt.sel{border-color:rgba(129,140,248,0.7);color:#c7cdfb;background:rgba(129,140,248,0.12);}',
            '.pl-spin{width:26px;height:26px;border:3px solid rgba(255,255,255,0.1);border-top-color:#818cf8;border-radius:50%;margin:40px auto 12px;animation:plSpin 0.8s linear infinite;}',
            '@keyframes plSpin{to{transform:rotate(360deg);}}',
            '.pl-center{text-align:center;color:#8990a8;font-size:12px;}',
            '.pl-who{margin-top:8px;border-top:0.5px solid rgba(255,255,255,0.06);padding-top:4px;}',
            '.pl-whorow{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid rgba(255,255,255,0.05);cursor:pointer;min-height:40px;}',
            '.pl-whorow:last-child{border-bottom:0;}',
            '.pl-nolink-hd{margin-top:14px;padding-top:10px;border-top:0.5px solid rgba(255,255,255,0.08);font-size:13px;font-weight:600;color:rgba(255,255,255,0.75);}',
            '.pl-whoav{width:30px;height:30px;border-radius:9px;flex:0 0 auto;background:linear-gradient(140deg,#2a3350,#171d30);display:flex;align-items:center;justify-content:center;color:#aeb6cf;font-size:12px;font-weight:700;}',
            '.pl-whomid{flex:1;min-width:0;}',
            '.pl-whonm{font-size:12px;font-weight:600;color:#e8e8ed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.pl-whosub{font-size:9.5px;color:#565b73;}',
            '.pl-year{color:#2f6bff;font-weight:800;}',
            '.pl-prem{color:#5DCAA5;font-weight:800;}',
            '.pl-days{display:flex;gap:5px;align-items:flex-end;overflow-x:auto;padding:4px 0 2px;}',
            '.pl-dcol{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:22px;flex:0 0 auto;padding:3px 3px 2px;border:1px solid transparent;border-radius:6px;}',
            '.pl-dcol.sel{border-color:rgba(129,140,248,0.55);background:rgba(129,140,248,0.10);}',
            '.pl-jdyn{padding:2px 14px 0;flex-shrink:0;}',
            '.pl-dbar{width:12px;border-radius:3px;}',
            '.pl-dbar.j{background:#5DCAA5;}',
            '.pl-dbar.l{background:#ef4444;margin-top:1px;}',
            '.pl-dnum{font-size:8.5px;color:#8990a8;height:11px;font-variant-numeric:tabular-nums;}',
            '.pl-dnum.l2{color:#ef4444;}',
            '.pl-dday{font-size:8px;color:#565b73;margin-top:2px;white-space:nowrap;}',
            '.pl-whotag{font-size:8.5px;font-weight:700;padding:2px 7px;border-radius:99px;flex:0 0 auto;}',
            '.pl-whotag.left{background:rgba(239,68,68,0.13);color:#ef4444;}',
            '.pl-whotag.late{background:rgba(245,191,79,0.13);color:#f5bf4f;}',
            '.pl-whobtn{border:0;background:transparent;color:#818cf8;font-size:10.5px;font-weight:700;font-family:inherit;cursor:pointer;padding:8px 4px 2px;display:flex;align-items:flex-start;gap:5px;}',
            '.pl-qnote{font-size:9.5px;color:#8990a8;margin-top:5px;line-height:1.5;}',
            '.pl-qwarn{font-size:10px;color:#f5bf4f;background:rgba(245,191,79,0.08);border:0.5px solid rgba(245,191,79,0.25);border-radius:9px;padding:8px 10px;margin-top:7px;line-height:1.5;}'
        ].join('');
        document.head.appendChild(s);
    }

    function ensureScreen() {
        injectStyles();
        var host = document.getElementById('pl-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'pl-screen'; host.className = 'pl-screen';
            (document.getElementById('app') || document.body).appendChild(host);
        }
        host.classList.add('on');
        document.body.classList.add('pl-noscroll');
        document.documentElement.classList.add('pl-noscroll');
        startPoll();
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.onClick(close); tg.BackButton.show(); } } catch (e) {}
        return host;
    }

    function startPoll() {
        stopPoll();
        _pollTimer = setInterval(silentRefresh, 10000);
    }

    function stopPoll() {
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    }

    function silentRefresh() {
        var host = document.getElementById('pl-screen');
        if (!host || !host.classList.contains('on') || _chId == null || _busy) return;
        var sh = document.getElementById('pl-sheet');
        if (sh && sh.classList.contains('on')) return;
        apiRequest('/api/v1/placements/links?channel_id=' + _chId).then(function (r) {
            if (!r || !r.ok) return;
            var items = r.items || [];
            var sigNew = JSON.stringify([items, r.campaigns || [], r.candidates || [], r.right]);
            var sigOld = JSON.stringify([_items, _campaigns, _cands, _right]);
            if (sigNew === sigOld) return;
            _items = items; _right = r.right;
            _campaigns = r.campaigns || []; _cands = r.candidates || [];
            _syncCamp();
            var openIds = [];
            var boxes = document.querySelectorAll('#pl-screen .pl-who');
            for (var i = 0; i < boxes.length; i++) {
                if (boxes[i].style.display !== 'none') openIds.push(boxes[i].id.replace('pl-who-', ''));
            }
            var openPanels = [];
            var panels = document.querySelectorAll('#pl-screen [id^="pl-minfo-"]');
            for (var p = 0; p < panels.length; p++) {
                if (panels[p].style.display !== 'none') openPanels.push(panels[p].id);
            }
            var body = document.querySelector('#pl-screen .pl-body');
            var st = body ? body.scrollTop : 0;
            render();
            body = document.querySelector('#pl-screen .pl-body');
            if (body) body.scrollTop = st;
            openPanels.forEach(function (pid) {
                var elp = document.getElementById(pid);
                if (elp) elp.style.display = 'block';
            });
            openIds.forEach(function (id) { openWhoPanel(parseInt(id, 10)); });
        }).catch(function () {});
    }

    function close() {
        _cntPrev = {};
        var host = document.getElementById('pl-screen');
        if (host) host.classList.remove('on');
        document.body.classList.remove('pl-noscroll');
        document.documentElement.classList.remove('pl-noscroll');
        stopPoll();
        closeSheet();
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.hide(); } } catch (e) {}
    }

    function curChannel() {
        for (var i = 0; i < (_channels || []).length; i++) if (_channels[i].id === _chId) return _channels[i];
        return null;
    }

    function head() {
        var ch = curChannel();
        var h = '<div class="pl-head"><button class="pl-back" data-act="close"><i class="ti ti-arrow-left"></i></button>' +
            '<div class="pl-ht">' + esc(T('Отслеживание размещений')) + '</div></div>';
        if (ch) {
            var un = ch.username || ch.channel_username || '';
            var title = ch.title || ('@' + un);
            h += '<div style="padding:0 16px;">' +
                '<button class="pw-chansel" data-act="chpick" style="margin-bottom:8px;">' +
                '<div class="pw-chav" style="position:relative;overflow:hidden;">' + avInner(title, ch.avatar_url) + '</div>' +
                '<div class="pw-chinfo"><div class="pw-chn"><span class="pw-chn-t">' + esc(title) + '</span></div>' +
                '<div class="pw-chnb">' + (un ? '@' + esc(un) + ' · ' : '') + esc(T('нажми, чтобы сменить канал')) + '</div></div>' +
                '<div class="pw-chchev"><i class="ti ti-chevron-down"></i></div></button></div>';
        }
        return h;
    }

    function openChannelSheet() {
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg || !(_channels || []).length) return;
        sh.innerHTML = '<div class="pl-grip"></div>' +
            '<div class="pl-ht" style="font-size:15px;">' + esc(T('Канал для отслеживания')) + '</div>' +
            '<div style="margin-top:8px;">' + _channels.map(function (c) {
                var un = c.username || c.channel_username || '';
                var nm = c.title || ('@' + un);
                var paused = !!c.is_paused;
                return '<div class="pl-whorow" data-act="chpick-go" data-ch="' + c.id + '"' + (paused ? ' style="opacity:.62;"' : '') + '>' +
                    '<div class="pl-whoav" style="position:relative;overflow:hidden;">' + avInner(nm, c.avatar_url) + '</div>' +
                    '<div class="pl-whomid"><div class="pl-whonm">' + esc(nm) + '</div>' +
                    (paused
                        ? '<div class="pl-whosub" style="color:#fbbf5f;">' + esc(T('На паузе · новые ссылки недоступны')) + '</div>'
                        : (un ? '<div class="pl-whosub">@' + esc(un) + '</div>' : '')) + '</div>' +
                    (c.team_role ? '<span class="pl-whotag" style="background:rgba(90,176,230,0.14);color:#5ab0e6;">' + esc(T('Команда')) + '</span>' : '') +
                    (c.id === _chId ? '<span class="pl-whotag" style="background:rgba(93,202,165,0.14);color:#5DCAA5;">✓</span>' : '') + '</div>';
            }).join('') + '</div>';
        bindAv(sh);
        bg.classList.add('on');
        sh.classList.add('on');
    }

    function openImpSheet(id) {
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg) return;
        var l = null;
        _items.forEach(function (x) { if (x.id === id) l = x; });
        sh.innerHTML = '<div class="pl-grip"></div>' +
            '<div class="pl-ht" style="font-size:15px;">' + esc(T('Показы поста')) + '</div>' +
            '<div class="pl-flabel">' + esc(T('Сколько человек увидело рекламный пост — число просмотров у продавца')) + '</div>' +
            '<input class="pl-inp" id="pl-imp" type="number" inputmode="numeric" min="0" autocomplete="off" value="' + (l && l.impressions_manual ? l.impressions_manual : '') + '">' +
            '<div class="pl-note">' + esc(T('Оставь поле пустым, чтобы убрать значение.')) + '</div>' +
            '<button class="pl-new" style="margin:13px 0 0;" data-act="imp-save" data-id="' + id + '">' + esc(T('Сохранить')) + '</button>';
        bg.classList.add('on');
        sh.classList.add('on');
    }

    function openPriceSheet(id) {
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg) return;
        var l = null;
        _items.forEach(function (x) { if (x.id === id) l = x; });
        sh.innerHTML = '<div class="pl-grip"></div>' +
            '<div class="pl-ht" style="font-size:15px;">' + esc(T('Цена размещения')) + '</div>' +
            '<div class="pl-flabel">' + esc(T('Сколько заплатил за это размещение, ₽')) + '</div>' +
            '<input class="pl-inp" id="pl-price-edit" type="number" inputmode="numeric" min="0" autocomplete="off" value="' + (l && l.price_rub ? l.price_rub : '') + '">' +
            '<div class="pl-note">' + esc(T('Оставь поле пустым, чтобы убрать значение.')) + '</div>' +
            '<button class="pl-new" style="margin:13px 0 0;" data-act="price-save" data-id="' + id + '">' + esc(T('Сохранить')) + '</button>';
        bg.classList.add('on');
        sh.classList.add('on');
    }

    function openCampSheet(campId) {
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg) return;
        _campManual = null;
        var isNew = campId == null;
        sh.innerHTML = '<div class="pl-grip"></div>' +
            '<div class="pl-ht" style="font-size:15px;">' + esc(isNew ? T('Новая кампания') : T('Добавить каналы')) + '</div>' +
            (isNew
                ? '<div class="pl-flabel">' + esc(T('Название кампании')) + '</div>' +
                  '<input class="pl-inp" id="pl-camp-name" maxlength="80" autocomplete="off" value="' + esc(T('Закуп от') + ' ' + fmtDay(new Date().toISOString())) + '">'
                : '') +
            '<div class="pl-flabel">' + esc(T('Каналы из закладок')) + '</div>' +
            '<div id="pl-camp-bms"><div class="pl-center">' + esc(T('Загружаю...')) + '</div></div>' +
            '<div class="pl-flabel">' + esc(T('Или вставь ссылку на канал')) + '</div>' +
            '<input class="pl-inp" id="pl-camp-chan" maxlength="120" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://t.me/канал">' +
            '<div id="pl-camp-chinfo" style="display:none;font-size:10.5px;margin:8px 0 0;line-height:1.45;"></div>' +
            '<button class="pl-new" style="margin:13px 0 0;" data-act="camp-save" data-mode="' + (isNew ? 'new' : campId) + '">' + esc(isNew ? T('Создать кампанию') : T('Добавить')) + '</button>';
        bg.classList.add('on');
        sh.classList.add('on');
        apiRequest('/api/v1/marketplace/bookmarks/cards').then(function (r) {
            var box = document.getElementById('pl-camp-bms');
            if (!box) return;
            var items = (r && r.items) || [];
            var inCamp = {};
            if (!isNew) {
                _cands.forEach(function (c) { if (c.campaign_id === campId && c.username) inCamp[c.username.toLowerCase()] = 1; });
                _campaigns.forEach(function (c) {
                    if (c.id === campId && c.taken) c.taken.forEach(function (u2) { inCamp[String(u2).toLowerCase()] = 1; });
                });
            }
            if (!items.length) {
                box.innerHTML = '<div class="pl-note" style="margin-top:0;">' + esc(T('Закладок пока нет — отмечай ★ на офферах и в Радаре.')) + '</div>';
                return;
            }
            box.innerHTML = items.map(function (it) {
                var l = it.listing || {};
                var u = (l.username || '').toLowerCase();
                var taken = !!inCamp[u];
                var sub = taken ? T('уже в кампании')
                    : [u ? '@' + u : '', l.subscribers ? num(l.subscribers) : ''].filter(Boolean).join(' · ');
                return '<div class="pl-whorow" data-act="cb"' + (taken ? ' style="opacity:0.45;pointer-events:none;"' : '') + '>' +
                    '<span class="pl-cb" data-u="' + esc(l.username || '') + '" data-t="' + esc(l.title || '') + '" data-s="' + (l.subscribers || '') + '" data-lid="' + (l.id || '') + '"></span>' +
                    '<div class="pl-whoav" style="position:relative;overflow:hidden;">' + avInner(l.title || u, l.avatar_url) + '</div>' +
                    '<div class="pl-whomid"><div class="pl-whonm">' + esc(l.title || ('@' + u)) + '</div>' +
                    '<div class="pl-whosub">' + esc(sub) + '</div></div></div>';
            }).join('');
            bindAv(box);
        }).catch(function () {
            var box = document.getElementById('pl-camp-bms');
            if (box) box.innerHTML = '<div class="pl-center">' + esc(T('Не удалось. Повтори попытку.')) + '</div>';
        });
        var mi = document.getElementById('pl-camp-chan');
        if (mi) {
            var _mt = null;
            mi.addEventListener('input', function () {
                if (_mt) clearTimeout(_mt);
                _mt = setTimeout(function () {
                    var v = mi.value.trim();
                    var info = document.getElementById('pl-camp-chinfo');
                    _campManual = null;
                    if (!v || v.length < 4) { if (info) info.style.display = 'none'; return; }
                    apiRequest('/api/v1/placements/resolve-channel?u=' + encodeURIComponent(v)).then(function (r) {
                        if (!info || !r || document.getElementById('pl-camp-chan') !== mi) return;
                        if (mi.value.trim() !== v) return;
                        if (!r.username) { info.style.display = 'none'; return; }
                        _campManual = { username: r.username, title: r.title || null, subscribers: r.subscribers || null, listing_id: r.listing_id || null };
                        if (r.found) {
                            var bits = ['✓ ' + (r.title || '@' + r.username)];
                            if (r.subscribers) bits.push(num(r.subscribers) + ' ' + T('подписчиков'));
                            info.style.color = '#5DCAA5';
                            info.textContent = bits.join(' · ');
                        } else {
                            info.style.color = '#8990a8';
                            info.textContent = '@' + r.username;
                        }
                        info.style.display = 'block';
                    }).catch(function () {});
                }, 400);
            });
        }
    }

    function openToCampSheet(linkId) {
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg || !_campaigns.length) return;
        var cur = null;
        _items.forEach(function (x) { if (x.id === linkId) cur = x.campaign_id; });
        sh.innerHTML = '<div class="pl-grip"></div>' +
            '<div class="pl-ht" style="font-size:15px;">' + esc(T('В кампанию…')) + '</div>' +
            '<div style="margin-top:8px;">' +
            _campaigns.map(function (c) {
                return '<div class="pl-whorow" data-act="tocamp-pick" data-link="' + linkId + '" data-camp="' + c.id + '">' +
                    '<div class="pl-whoav"><i class="ti ti-folder"></i></div>' +
                    '<div class="pl-whomid"><div class="pl-whonm">' + esc(c.name) + '</div></div>' +
                    (cur === c.id ? '<span class="pl-whotag" style="background:rgba(93,202,165,0.14);color:#5DCAA5;">✓</span>' : '') + '</div>';
            }).join('') +
            (cur != null
                ? '<div class="pl-whorow" data-act="tocamp-pick" data-link="' + linkId + '" data-camp="">' +
                  '<div class="pl-whoav"><i class="ti ti-folder-off"></i></div>' +
                  '<div class="pl-whomid"><div class="pl-whonm">' + esc(T('Без кампании')) + '</div></div></div>'
                : '') + '</div>';
        bg.classList.add('on');
        sh.classList.add('on');
    }

    function doCampSave(mode) {
        if (_busy) return;
        var picks = [];
        var cbs = document.querySelectorAll('#pl-sheet .pl-cb.on');
        for (var i = 0; i < cbs.length; i++) {
            picks.push({
                username: cbs[i].getAttribute('data-u'),
                title: cbs[i].getAttribute('data-t') || null,
                subscribers: parseInt(cbs[i].getAttribute('data-s'), 10) || null,
                listing_id: parseInt(cbs[i].getAttribute('data-lid'), 10) || null
            });
        }
        if (_campManual && _campManual.username) picks.push(_campManual);
        if (mode === 'new') {
            var nmv = ((document.getElementById('pl-camp-name') || {}).value || '').trim();
            if (!nmv) { toast(T('Укажи название кампании')); return; }
            _busy = true;
            apiRequest('/api/v1/placements/campaigns', { method: 'POST', body: JSON.stringify({ channel_id: _chId, name: nmv, picks: picks }) })
                .then(function (r) {
                    _busy = false;
                    if (r && r.ok) { haptic('medium'); _campId = (r.campaign || {}).id || null; closeSheet(); load(); toast(T('Кампания создана')); }
                    else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                }).catch(function () { _busy = false; toast(T('Не удалось. Повтори попытку.')); });
        } else {
            if (!picks.length) { toast(T('Выбери каналы или вставь ссылку')); return; }
            _busy = true;
            apiRequest('/api/v1/placements/campaigns/' + mode + '/items', { method: 'POST', body: JSON.stringify({ picks: picks }) })
                .then(function (r) {
                    _busy = false;
                    if (r && r.ok) {
                        haptic('medium'); closeSheet(); load();
                        if (!r.added) toast(T('Эти каналы уже в кампании'));
                    }
                    else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                }).catch(function () { _busy = false; toast(T('Не удалось. Повтори попытку.')); });
        }
    }

    function permCard() {
        return '<div class="pl-perm"><div class="t"><i class="ti ti-alert-triangle"></i> ' + esc(T('Нужно право «Пригласительные ссылки»')) + '</div>' +
            '<div class="d">' + esc(T('Чтобы создавать ссылки, боту @ForgeMetricsBot не хватает одного права администратора. Это делается один раз:')) + '</div>' +
            '<ol><li>' + esc(T('Открой свой канал → Управление каналом')) + '</li>' +
            '<li>' + esc(T('Администраторы → @ForgeMetricsBot')) + '</li>' +
            '<li>' + esc(T('Включи «Пригласительные ссылки» и сохрани')) + '</li></ol>' +
            '<button class="pl-ghost" data-act="recheck"><i class="ti ti-refresh"></i> ' + esc(T('Проверить право')) + '</button></div>';
    }

    function candCard(c) {
        var meta = [];
        if (c.username) meta.push('@' + c.username);
        if (c.subscribers) meta.push(num(c.subscribers) + ' ' + T('подписчиков'));
        if (c.price) meta.push(num(c.price) + ' ₽');
        return '<div class="pl-cand"><div class="nm">' + esc(c.title || ('@' + (c.username || ''))) + '</div>' +
            '<div class="mt">' + esc(meta.join(' · ')) + '</div>' +
            '<div class="bts"><button class="go" data-act="cand-go" data-item="' + c.id + '" data-u="' + esc(c.username || '') + '">' + esc(T('Договорился — создать ссылку')) + '</button>' +
            '<button class="rm" data-act="cand-del" data-item="' + c.id + '">' + esc(T('Убрать')) + '</button></div></div>';
    }

    function effImp(l) {
        if (l.impressions != null) return l.impressions;
        if (l.views_scan != null) return l.views_scan;
        return l.impressions_est;
    }

    function impSrc(l) {
        if (l.impressions_manual != null) return 'manual';
        if (l.deal_id && l.impressions != null) return 'deal';
        if (l.views_scan != null) return 'scan';
        if (l.impressions_est != null) return 'est';
        return null;
    }

    var _cntPrev = {};
    function animateCounters() {
        if (Object.keys(_cntPrev).length > 600) _cntPrev = {};
        var els = document.querySelectorAll('#pl-screen [data-cnt]');
        for (var i = 0; i < els.length; i++) {
            (function (el) {
                var key = el.getAttribute('data-cnt');
                var v = parseInt(el.getAttribute('data-v'), 10);
                var prev = _cntPrev[key];
                _cntPrev[key] = v;
                if (prev == null || !isFinite(v) || prev === v) return;
                var pre = el.getAttribute('data-pre') || '';
                var start = null, from = prev, dur = 600;
                function stepFrame(ts) {
                    if (!document.body.contains(el)) return;
                    if (start == null) start = ts;
                    var p = Math.min(1, (ts - start) / dur);
                    el.textContent = pre + num(Math.round(from + (v - from) * p));
                    if (p < 1) requestAnimationFrame(stepFrame);
                }
                try { requestAnimationFrame(stepFrame); } catch (e) { el.textContent = pre + num(v); }
            })(els[i]);
        }
    }

    function cpfBand(l) {
        var joinedN = l.joined || 0;
        var badImp = l.impressions != null && l.clicks != null && l.impressions < l.clicks;
        var imp = effImp(l);
        if (l.cpf == null || !(imp > 0) || !joinedN || badImp) return null;
        var bandLo = l.cpm_lo || 300, bandHi = l.cpm_hi || 1500;
        var fk = { post: 1, pin: 1.5, story: 0.7, circle: 0.7, repost: 0.5, other: 1 }[l.placement_format] || 1;
        var lo = Math.max(1, Math.round(imp / 1000 * bandLo * fk / joinedN));
        var hi = Math.max(lo + 1, Math.round(imp / 1000 * bandHi * fk / joinedN));
        return { lo: lo, hi: hi, hasBand: !!(l.cpm_lo && l.cpm_hi) };
    }

    function cpfColor(l) {
        var b = cpfBand(l);
        if (!b || l.cpf == null) return '#e8e8ed';
        if (l.cpf <= (b.lo + b.hi) / 2) return '#5DCAA5';
        return l.cpf <= b.hi * 4 / 3 ? '#f5bf4f' : '#ef4444';
    }

    function attrWin(l) {
        if (!l.attribution_until) return '';
        var end = new Date(l.attribution_until);
        var now2 = new Date();
        if (isNaN(end.getTime())) return '';
        if (now2 >= end) {
            return '<div class="pl-awin done"><span class="tx">' +
                esc(T('окно атрибуции закрыто') + ' ' + fmtDay(l.attribution_until) + ' · ' + T('история сохранена')) +
                '</span></div>';
        }
        var start = l.created_at ? new Date(l.created_at) : null;
        var pct = 50;
        if (start && !isNaN(start.getTime()) && end > start) {
            pct = Math.max(3, Math.min(100, Math.round((now2 - start) / (end - start) * 100)));
        }
        var leftMs = end - now2;
        var leftTx;
        if (leftMs < 86400000) {
            leftTx = T('осталось меньше суток');
        } else {
            var dl = Math.ceil(leftMs / 86400000);
            leftTx = (dl === 1 ? T('остался') : T('осталось')) + ' ' + dl + ' ' + T(plural3(dl, 'день', 'дня', 'дней'));
        }
        return '<div class="pl-awin"><span class="tr"><i style="width:' + pct + '%;"></i></span>' +
            '<span class="tx">' + esc(T('окно атрибуции до') + ' ' + fmtDay(l.attribution_until) + ' · ' + leftTx) +
            '</span></div>';
    }

    function accCard(l) {
        var active = l.status === 'active';
        var open = _openId === l.id;
        var winClosed = !!(l.attribution_until && new Date(l.attribution_until) <= new Date());
        var dot = active ? ((_chPaused || winClosed) ? 'p' : 'g') : 'o';
        var _fmtMap = { post: 'пост', pin: 'закреп', story: 'сторис', circle: 'кружок', repost: 'репост', other: 'другое' };
        var joinedN = l.joined || 0;
        var impB = effImp(l);
        var numK = function (v) {
            return v >= 10000 ? String(Math.round(v / 100) / 10).replace('.', ',') + 'K' : num(v);
        };
        var fun = '<span class="pl-fun">' +
            '<span class="pl-fseg"><b>' + (impB ? numK(impB) + (l.views_scan == null ? '≈' : '') : '—') + '</b><em>' + esc(T('Показы')) + '</em></span>' +
            '<span class="pl-fseg"><b>' + (l.clicks != null ? numK(l.clicks) : '—') + '</b><em>' + esc(T('Клики')) + '</em></span>' +
            '<span class="pl-fseg gg"><b>+' + numK(joinedN) + '</b><em>' + esc(T('Подписки')) + '</em></span>' +
            '</span>';
        var letter = String(l.seller_username || l.name || '?').charAt(0).toUpperCase();
        var priceLn = l.price_rub
            ? '<u>' + num(l.price_rub) + ' ₽</u><s>' + esc(T('Цена')) + '</s>' : '';
        var right = l.cpf != null
            ? '<div class="pl-ecpf"><b style="color:' + (active ? cpfColor(l) : '#8990a8') + ';">' + rub(l.cpf) + '</b><em>CPF</em>' + priceLn + '</div>'
            : '<div class="pl-ecpf"><b style="color:' + (active ? '#5DCAA5' : '#8990a8') + ';">' + (joinedN ? '+' + num(joinedN) : '0') + '</b><em>' + esc(T('Подписки')) + '</em>' + priceLn + '</div>';
        return '<div class="pl-acc' + (open ? ' open' : '') + '" data-id="' + l.id + '">' +
            '<div class="pl-acch" data-act="exp" data-id="' + l.id + '">' +
            '<span class="pl-eava">' + esc(letter) + '<i class="' + dot + '"></i></span>' +
            '<div class="pl-amid"><div class="pl-anm">' + esc(l.name) + '</div>' +
            '<div class="pl-erow">' + fun + '</div>' + attrWin(l) + '</div>' +
            right +
            '<i class="ti ti-chevron-down pl-accc"></i></div>' +
            '<div class="pl-accb"' + (open ? ' style="max-height:none;"' : '') + '><div class="pl-acci">' + accBody(l) + '</div></div></div>';
    }

    function accBody(l) {
        var active = l.status === 'active';
        var joinedN = l.joined || 0, retN = l.retained_now || 0, leftN = Math.max(0, joinedN - retN);
        var badImp = l.impressions != null && l.clicks != null && l.impressions < l.clicks;
        var hasBandRaw = !!(l.cpm_lo && l.cpm_hi);
        var needPrice = !l.price_rub;
        var h = '';
        var heroCap = T('цена подписчика') + ' · CPF' + (l.cpf == null && needPrice ? ' · ' + T('нужна цена') : '');
        h += '<div class="pl-hero"><div><div class="pl-cpfbig" style="color:' + (l.cpf != null ? cpfColor(l) : '#565b73') + ';">' + (l.cpf != null ? rub(l.cpf) : '—') + '</div>' +
            '<div class="pl-cpfcap">' + esc(heroCap) + '</div></div>' +
            '<div class="pl-heror"><div class="pl-cpfcap">' + esc(T('Подписались')) + '</div>' +
            '<div class="v" style="color:#5DCAA5;" data-cnt="hjoin' + l.id + '" data-v="' + joinedN + '" data-pre="' + (joinedN ? '+' : '') + '">' + (joinedN ? '+' + num(joinedN) : '0') + '</div></div></div>';
        var band = cpfBand(l);
        if (band) {
            var pos = Math.max(0, Math.min(1, (l.cpf - band.lo) / (band.hi - band.lo)));
            h += '<div class="pl-btrack"><div class="pl-bmark" style="left:' + (3 + Math.round(pos * 94)) + '%;"></div></div>' +
                '<div class="pl-blabs"><span>' + num(band.lo) + ' ₽ · ' + esc(T('дешевле нормы')) + '</span>' +
                '<span>' + esc(T(band.hasBand ? 'вилка ниши' : 'рыночный ориентир')) + '</span>' +
                '<span>' + num(band.hi) + ' ₽ · ' + esc(T('дороже')) + '</span></div>';
        }
        var impEff = effImp(l);
        var src = impSrc(l);
        var impEst = src === 'est';
        var scanRipe = src !== 'scan' || !!(l.post_published_at && (Date.now() - new Date(l.post_published_at).getTime()) >= 86400000);
        var softEst = impEst || (src === 'scan' && !scanRipe);
        var tiles = [];
        tiles.push(impEff
            ? { k: T('Показы'), v: (impEst ? '≈' : '') + num(impEff),
                cnt: 'imp' + l.id, raw: impEff, pre: impEst ? '≈' : '',
                c: src === 'scan' ? T('автозамер') : (impEst ? T('оценка по каналу') : T('охват поста')) }
            : { k: T('Показы'), v: '—', dim: 1, c: T('указать') });
        if (l.clicks != null) {
            var ctr = (impEff >= 100 && !badImp && l.clicks && l.clicks <= impEff) ? 'CTR ' + (softEst ? '≈' : '') + (Math.round(l.clicks / impEff * 1000) / 10) + '%' : 'CTR —';
            tiles.push({ k: T('Клики'), v: num(l.clicks), c: ctr });
        } else {
            tiles.push({ k: T('Клики'), v: '—', dim: 1, c: T('прямая ссылка') });
        }
        var prevV = l.clicks != null ? l.clicks : (impEff || 0);
        var subJ = (prevV > 0 && joinedN <= prevV && !badImp) ? (Math.round(joinedN / prevV * 1000) / 10) + '%' : '';
        tiles.push({ k: T('Подписки'), v: (joinedN ? '+' + num(joinedN) : '0'),
                     cnt: 'join' + l.id, raw: joinedN, pre: joinedN ? '+' : '', c: subJ, g: 1 });
        var subR = (l.r7 && l.r7.of) ? 'R7 ' + Math.round((l.r7.kept || 0) / l.r7.of * 100) + '%' : 'R7 —';
        tiles.push({ k: T('Остались'), v: num(retN), c: subR });
        h += '<div class="pl-f4g n' + tiles.length + '">' + tiles.map(function (x) {
            return '<div class="pl-f4"><div class="k">' + esc(x.k) + '</div>' +
                '<div class="v" style="color:' + (x.dim ? '#565b73' : (x.g ? '#5DCAA5' : '#e8e8ed')) + ';"' +
                (x.cnt ? ' data-cnt="' + x.cnt + '" data-v="' + x.raw + '" data-pre="' + (x.pre || '') + '"' : '') + '>' + x.v + '</div>' +
                (x.c ? '<div class="c">' + esc(x.c) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
        var mets = [];
        var cpmWarn = '';
        if (impEff >= 100 && l.price_rub && !badImp) {
            var cpmV = Math.round(l.price_rub / impEff * 1000);
            var bandLo = l.cpm_lo || 300, bandHi = l.cpm_hi || 1500;
            var cpmMid = (bandLo + bandHi) / 2, cpmBad = bandHi * 4 / 3;
            var cpmCol = cpmV <= cpmMid ? '#5DCAA5' : (cpmV <= cpmBad ? '#f5bf4f' : '#ef4444');
            mets.push({ k: 'CPM', v: (softEst ? '≈' : '') + rub(cpmV), col: cpmCol });
            if (cpmV > cpmBad && !softEst) {
                cpmWarn = '<div class="pl-qwarn">' + esc(hasBandRaw
                    ? T('CPM этого размещения заметно выше рыночной вилки этой ниши — похоже на переплату.')
                    : T('CPM этого размещения сильно выше рыночного ориентира (обычно 300–1500 ₽ за 1000 показов) — похоже на переплату.')) + '</div>';
            }
        } else {
            mets.push({ k: 'CPM', v: '—', dim: 1,
                        c: (needPrice && !impEff) ? T('нужны цена и показы')
                            : (needPrice ? T('нужна цена')
                                : (!impEff ? T('нужны показы') : T('недостаточно данных'))) });
        }
        if (l.clicks && l.price_rub) mets.push({ k: 'CPC', v: rub(Math.round(l.price_rub / l.clicks)) });
        else mets.push({ k: 'CPC', v: '—', dim: 1,
                         c: l.clicks == null ? T('прямая ссылка') : (needPrice ? T('нужна цена') : '') });
        if (l.cpf_retained != null) mets.push({ k: T('Цена ост.'), v: rub(l.cpf_retained) });
        else mets.push({ k: T('Цена ост.'), v: '—', dim: 1, c: needPrice ? T('нужна цена') : '' });
        mets.push({ k: T('Отписки'), v: leftN ? '−' + num(leftN) : '0', col: leftN ? '#ef4444' : '#8990a8' });
        h += '<div class="pl-mgrid" style="grid-template-columns:repeat(' + mets.length + ',1fr);">' + mets.map(function (x) {
            return '<div class="pl-mc"><div class="k">' + esc(x.k) + '</div>' +
                '<div class="v" style="color:' + (x.dim ? '#565b73' : (x.col || '#e8e8ed')) + ';">' + x.v + '</div>' +
                (x.c ? '<div class="c">' + esc(x.c) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
        h += '<button class="pl-whobtn" data-act="metricinfo" data-id="' + l.id + '" style="color:#565b73;font-weight:600;"><i class="ti ti-info-circle"></i> ' + esc(T('Что значат эти метрики')) + '</button>' +
            '<div class="pl-minfo" id="pl-minfo-' + l.id + '" style="display:none;">' +
            '<div><b>CPM</b> — ' + esc(T('цена 1000 показов: цена ÷ показы × 1000. Дорого ли обошлась площадка.')) + '</div>' +
            '<div><b>CTR</b> — ' + esc(T('кликабельность: клики ÷ показы. Цепляет ли креатив.')) + '</div>' +
            '<div><b>CPC</b> — ' + esc(T('цена перехода: цена ÷ клики.')) + '</div>' +
            '<div><b>CPF</b> — ' + esc(T('цена подписчика: цена ÷ подписавшиеся.')) + '</div>' +
            '<div><b>' + esc(T('Цена оставшегося')) + '</b> — ' + esc(T('цена ÷ те, кто ещё в канале. Показывает, сколько трафика слилось.')) + '</div>' +
            '<div><b>' + esc(T('Удержание 7 дней')) + '</b> — ' + esc(T('сколько из вступивших остаются в канале через неделю.')) + '</div>' +
            '</div>';
        h += cpmWarn;
        if (badImp) {
            h += '<div class="pl-qwarn">' + esc(T('Показы меньше числа переходов — похоже на опечатку. Проверь значение в «Показы поста», CPM и CTR пока не считаются.')) + '</div>';
        }
        var impV = src === 'manual' ? num(l.impressions_manual)
            : (src === 'deal' ? num(l.impressions)
                : (src === 'scan' ? num(l.views_scan)
                    : (src === 'est' ? '≈' + num(l.impressions_est) : '—')));
        var impE = src === 'manual' ? T('вручную')
            : (src === 'deal' ? T('замер сделки')
                : (src === 'scan' ? T('автозамер')
                    : (src === 'est' ? T('уточнить') : T('указать'))));
        var ledger = '<div class="pl-ledger">' +
            '<div class="pl-lrow" data-act="price" data-id="' + l.id + '"><span class="k">' + esc(T('Цена размещения')) + '</span><span class="dots"></span>' +
            '<span class="v">' + (l.price_rub ? num(l.price_rub) + ' ₽' : '—') + '</span><span class="e">' + esc(l.price_rub ? T('изменить') : T('указать')) + '</span></div>' +
            '<div class="pl-lrow" data-act="imp" data-id="' + l.id + '"><span class="k">' + esc(T('Показы поста')) + '</span><span class="dots"></span>' +
            '<span class="v">' + impV + '</span><span class="e">' + esc(impE) + '</span></div>' +
            '<div class="pl-lrow" data-act="deal" data-id="' + l.id + '"><span class="k">' + esc(T('Сделка Площадки')) + '</span><span class="dots"></span>' +
            '<span class="v">' + (l.deal_id ? '№' + l.deal_id : '—') + '</span><span class="e">' + esc(l.deal_id ? T('изменить') : T('привязать')) + '</span></div>';
        if (_campaigns.length) {
            var _cname = null;
            _campaigns.forEach(function (c) { if (c.id === l.campaign_id) _cname = c.name; });
            ledger += '<div class="pl-lrow" data-act="tocamp" data-id="' + l.id + '"><span class="k">' + esc(T('Кампания')) + '</span><span class="dots"></span>' +
                '<span class="v">' + esc(_cname || '—') + '</span><span class="e">' + esc(T('изменить')) + '</span></div>';
        }
        if (l.scan_status) {
            var postV = l.scan_status === 'search' ? T('ищем пост')
                : (l.scan_status === 'not_found' ? T('не найден')
                    : (l.post_deleted_at ? T('удалён') : T('найден')));
            var postOpen = !!(l.post_url && !l.post_deleted_at);
            ledger += '<div class="pl-lrow"' + (postOpen ? ' data-act="openpost" data-url="' + esc(l.post_url) + '"' : '') + '>' +
                '<span class="k">' + esc(T('Рекламный пост')) + '</span><span class="dots"></span>' +
                '<span class="v">' + esc(postV) + '</span>' +
                (postOpen ? '<span class="e">' + esc(T('открыть')) + '</span>' : '') + '</div>';
        }
        ledger += '</div>';
        h += ledger;
        if (l.scan_status && l.post_deleted_at) {
            var aliveDel = (l.min_alive_hours === 0) ? T('без удаления') : T(String(l.min_alive_hours || 24) + ' ч');
            h += '<div class="pl-qwarn">' + esc(T('Пост удалён')) + ' ' + esc(fmtTime(l.post_deleted_at)) + ' · ' + esc(T('Срок в ленте')) + ': ' + esc(aliveDel) + ' — ' +
                esc(l.alive_verdict === 'violated' ? T('нарушено') : T('выполнено')) + '</div>';
        }
        if (active) {
            var postUrl = l.click_code ? (CLICK_BASE + '/r/' + l.click_code) : l.invite_link;
            h += '<div class="pl-lnk2"><code>' + esc(postUrl) + '</code>' +
                '<button class="pl-copy" data-act="copy" data-link="' + esc(postUrl) + '">' + esc(T('Скопировать')) + '</button></div>';
        }
        if (l.placement_format === 'story' || l.placement_format === 'circle' || l.placement_format === 'repost') {
            h += '<div class="pl-note">' + esc(T('Для этого формата часть вступлений приходит мимо ссылки — смотри «Пришли сами» в списке вступивших.')) + '</div>';
        }
        h += '<div class="pl-dacts">' +
            '<button class="pl-dbtn" data-act="who" data-id="' + l.id + '"><i class="ti ti-users"></i><span>' + esc(T('Кто вступил')) + '</span></button>' +
            (active
                ? '<button class="pl-dbtn quiet" data-act="revoke" data-id="' + l.id + '"><i class="ti ti-power"></i><span>' + esc(T('Отключить')) + '</span></button>' +
                  '<button class="pl-dbtn iconb" data-act="del" data-st="active" data-id="' + l.id + '" aria-label="' + esc(T('Удалить')) + '"><i class="ti ti-trash"></i></button>'
                : '<button class="pl-dbtn" data-act="enable" data-id="' + l.id + '"><i class="ti ti-power"></i><span>' + esc(T('Включить')) + '</span></button>' +
                  '<button class="pl-dbtn quiet" data-act="del" data-id="' + l.id + '"><i class="ti ti-trash"></i><span>' + esc(T('Удалить из списка')) + '</span></button>') +
            '</div>';
        var notes = '';
        if (l.scan_status && !l.post_deleted_at) {
            var aliveLbl = (l.min_alive_hours === 0) ? T('без удаления') : T(String(l.min_alive_hours || 24) + ' ч');
            if (l.alive_verdict === 'ok') {
                notes += '<div class="pl-note" style="color:#5DCAA5;">✓ ' + esc(T('Срок в ленте')) + ': ' + esc(aliveLbl) + ' — ' + esc(T('выполнено')) + '</div>';
            } else if (l.scan_status === 'track') {
                notes += '<div class="pl-note">' + esc(T('Срок в ленте')) + ': ' + esc(aliveLbl) + ' — ' + esc(T('проверяется')) + '</div>';
            }
        }
        if (l.views_scan_at) {
            notes += '<div class="pl-note">' + esc(T('обновлено')) + ' ' + esc(fmtTime(l.views_scan_at)) +
                (l.scan_next_at ? ' · ' + esc(T('следующий замер')) + ' ≈ ' + esc(fmtTime(l.scan_next_at)) : '') + '</div>';
        }
        if (active && l.attribution_until) notes += '<div class="pl-note">' + esc(T('вступления считаем до')) + ' ' + esc(fmtDay(l.attribution_until)) + '</div>';
        if (l.late_joined > 0) notes += '<div class="pl-note">+' + num(l.late_joined) + ' ' + esc(T('вступлений после окна атрибуции — учтены отдельно, в CPF не входят')) + '</div>';
        if (l.joined_approx > 0) notes += '<div class="pl-note">≈' + num(l.joined_approx) + ' ' + esc(T('засчитаны по времени — вступили в течение 15 минут после перехода по ссылке')) + '</div>';
        h += notes;
        h += '<div class="pl-who" id="pl-who-' + l.id + '" style="display:none;"></div>';
        return h;
    }

    function setAccOpen(card, open, anim) {
        var b = card.querySelector('.pl-accb');
        if (!b) return;
        if (open) {
            card.classList.add('open');
            if (!anim) { b.style.maxHeight = 'none'; return; }
            b.style.maxHeight = '';
            var onEnd = function (ev) {
                if (ev.target !== b) return;
                b.removeEventListener('transitionend', onEnd);
                if (card.classList.contains('open')) b.style.maxHeight = 'none';
            };
            b.addEventListener('transitionend', onEnd);
        } else {
            if (b.style.maxHeight === 'none') {
                b.style.maxHeight = b.scrollHeight + 'px';
                void b.offsetHeight;
            }
            b.style.maxHeight = '';
            card.classList.remove('open');
        }
    }

    function openAcc(id) {
        _openId = id;
        var cards = document.querySelectorAll('#pl-screen .pl-acc');
        for (var i = 0; i < cards.length; i++) {
            setAccOpen(cards[i], id != null && parseInt(cards[i].getAttribute('data-id'), 10) === id, true);
        }
        if (id != null) {
            openWhoPanel(id);
            var a = document.querySelector('#pl-screen .pl-acc[data-id="' + id + '"]');
            if (a && a.scrollIntoView) setTimeout(function () { a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
        }
    }

    var SRC_PLATS = {
        shorts: { n: 'YouTube Shorts', c: 'yt', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000"/><path d="M10 9l6 3-6 3z" fill="#fff"/></svg>' },
        vk: { n: 'VK Клипы', c: 'vk', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="6" fill="#0077FF"/><path d="M6.5 8h2.1c.2 2.4 1.1 4.3 2.4 4.9V8h2v3.1c1.2-.3 2.2-1.7 2.6-3.1h2c-.4 1.9-1.5 3.3-2.6 3.9 1.3.6 2.6 2 3 4.1h-2.2c-.4-1.6-1.5-2.9-2.8-3.2V16h-.3C9.5 16 6.8 12.7 6.5 8z" fill="#fff"/></svg>' },
        dzen: { n: 'Дзен', c: 'dz', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="M12 2c.2 5.5 4.3 9.6 9.8 9.8v.4c-5.5.2-9.6 4.3-9.8 9.8h-.4c-.2-5.5-4.3-9.6-9.8-9.8v-.4C7.3 11.6 11.4 7.5 11.6 2z" fill="#0a0d18"/></svg>' },
        tiktok: { n: 'TikTok', c: 'tt', svg: '<svg viewBox="0 0 24 24"><path d="M16 3c.4 2.3 1.9 3.8 4 4v3c-1.6 0-3-.5-4-1.3V15a5.5 5.5 0 1 1-5.5-5.5c.3 0 .7 0 1 .1v3.1a2.5 2.5 0 1 0 1.5 2.3V3z" fill="#25F4EE"/><path d="M17 4c.4 2.3 1.9 3.8 4 4v2c-1.6 0-3-.5-4-1.3z" fill="#FE2C55"/></svg>' },
        reels: { n: 'Instagram Reels', c: 'ig', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.4" fill="#E1306C"/></svg>' }
    };
    var _srcHint = {};

    function isChPrivate() {
        var c = curChannel();
        return !!(c && c.is_private);
    }

    function srcHintInner() {
        return '<b>' + esc(T('Расход на продвижение.')) + '</b> ' +
            esc(T('Укажи сумму, фактически оплаченную площадке за продвижение в этом источнике. Публикации без оплаты учитываются как органический трафик — значение 0. Цена подписчика рассчитывается как расход, делённый на число вступивших по ссылке источника.'));
    }

    function srcLink(x) {
        return x.click_code ? (CLICK_BASE + '/r/' + x.click_code) : (x.invite_link || '');
    }

    function srcCard(x, best) {
        var pl = SRC_PLATS[x.platform_key] || { n: x.platform_key, c: 'dz', svg: '' };
        var pub = !isChPrivate();
        var slink = srcLink(x);
        var cpf = null;
        if (x.price_rub && x.joined) cpf = Math.round(x.price_rub / x.joined);
        var priceTile;
        if (!x.joined) priceTile = '<b class="m">' + esc(T('нет данных')) + '</b>';
        else if (!x.price_rub) priceTile = '<b class="g">' + esc(T('органика')) + '</b>';
        else priceTile = '<b class="' + (cpf <= 80 ? 'g' : cpf <= 150 ? 'w' : 'r') + '">' + num(cpf) + ' \u20bd</b>';
        var spendTile = x.price_rub
            ? '<b>' + num(x.price_rub) + ' \u20bd</b><span>' + esc(T('изменить')) + '</span>'
            : '<b>+ ' + esc(T('расход')) + '</b><span>' + esc(T('не указан')) + '</span>';
        var kind;
        if (!pub) kind = '<span class="pl-skind cl"><i class="ti ti-lock"></i>' + esc(T('Закрытый канал · точный учёт')) + '</span>';
        else if (x.click_code) kind = '<span class="pl-skind op"><i class="ti ti-click"></i>' + esc(T('Публичный канал · замер по переходу')) + '</span>';
        else kind = '<span class="pl-skind nm"><i class="ti ti-unlink"></i>' + esc(T('Публичный канал · без замера')) + '</span>';
        var tile1;
        if (x.click_code) {
            tile1 = '<div class="pl-tile"><b>' + num(x.clicks || 0) +
                (x.clicks_7d ? ' <small style="color:#4ade80;">+' + num(x.clicks_7d) + '</small>' : '') +
                '</b><span>' + esc(T('перешло · за 7 дней')) + '</span></div>';
        } else {
            tile1 = '<div class="pl-tile"><b>' + num(x.joined || 0) +
                (x.joined_7d ? ' <small style="color:#4ade80;">+' + num(x.joined_7d) + '</small>' : '') +
                '</b><span>' + esc(T('вступило · за 7 дней')) + '</span></div>';
        }
        var h = '<div class="pl-src' + (best ? ' pl-sbest' : '') + '">' +
            (best ? '<span class="pl-sbestlab">' + esc(T('МИНИМАЛЬНАЯ ЦЕНА')) + '</span>' : '') +
            '<div class="pl-srow"><div class="pl-sic ' + pl.c + '">' + pl.svg + '</div>' +
            '<div class="pl-snm"><b data-act="src-rename" data-id="' + x.id + '" style="cursor:pointer;"><u>' + esc(x.name || pl.n) + '</u><i class="ti ti-pencil"></i></b>' +
            '<em>' + esc(pl.n) + '</em></div>' +
            '<span class="pl-sq' + (_srcHint[x.id] ? ' on' : '') + '" data-act="src-help" data-id="' + x.id + '">?</span>' +
            '<span class="pl-sq" data-act="src-del" data-id="' + x.id + '" style="color:#a86868;"><i class="ti ti-trash"></i></span></div>' +
            kind +
            '<div class="pl-schip' + (x.click_code ? ' fmtr' : '') + '"><s>' + esc(T('метка источника')) + '</s><code>' + esc(slink.replace('https://', '')) + '</code>' +
            '<b data-act="src-copy" data-link="' + esc(slink) + '">' + esc(T('копировать')) + '</b></div>' +
            '<div class="pl-tiles">' +
            tile1 +
            '<div class="pl-tile">' + priceTile + '<span>' + esc(T('цена подписчика')) + '</span></div>' +
            '<div class="pl-tile act" data-act="src-spend" data-id="' + x.id + '">' + spendTile + '</div>' +
            '</div>' +
            (_srcHint[x.id] ? '<div class="pl-shint">' + srcHintInner() + '</div>' : '') +
            '</div>';
        return h;
    }

    function srcBlock() {
        var srcs = _items.filter(function (x) { return x.platform_key && x.status === 'active'; });
        var guideOpen = false;
        try { guideOpen = localStorage.getItem('fm_pl_src_how') !== '0'; } catch (e) {}
        var h = '<div class="pl-fcap" style="margin:2px 0 6px;">' + esc(T('Источники подписчиков')) + '</div>';
        h += '<div class="pl-how"><div class="pl-howt" data-act="src-how"><i class="ti ti-help"></i> ' + esc(T('Как это работает')) +
            '<span id="pl-srchowarr" style="margin-left:auto;color:#565b73;font-size:11px;">' + (guideOpen ? '\u25b2' : '\u25bc') + '</span></div>' +
            '<div id="pl-srchowbody" style="display:' + (guideOpen ? 'block' : 'none') + ';padding:4px 2px 8px;font-size:12.5px;line-height:1.55;color:#8990a8;">' +
            '<b style="color:#e8e8ed;">' + esc(T('Как устроена ссылка.')) + '</b> ' + esc(T('Для каждого источника создаётся отдельная ссылка-метка. На закрытом канале это прямая пригласительная Telegram (t.me/+…), на публичном — ссылка со счётчиком переходов. Скопируй её из карточки источника и размести в описании ролика или профиля на площадке. Название источника меняется по значку карандаша — удобно, когда на одной площадке несколько аккаунтов.')) + '<br><br>' +
            '<b style="color:#e8e8ed;">' + esc(T('Как считается.')) + '</b> ' + esc(T('На закрытом канале подписчик привязывается к источнику при вступлении по пригласительной ссылке. На публичном канале фиксируется каждый переход по ссылке-метке, а вступления сразу после перехода относятся к этому источнику.')) + '</div></div>';
        if (srcs.length) {
            var scored = srcs.slice().sort(function (a, b) { return (b.joined || 0) - (a.joined || 0); });
            var bestId = null, bestCpf = null;
            srcs.forEach(function (x) {
                if (x.joined) {
                    var c = x.price_rub ? Math.round(x.price_rub / x.joined) : 0;
                    if (bestCpf == null || c < bestCpf) { bestCpf = c; bestId = x.id; }
                }
            });
            h += scored.map(function (x) { return srcCard(x, srcs.length > 1 && x.id === bestId); }).join('');
        }
        h += '<button class="pl-sadd" data-act="src-add"><i class="ti ti-plus"></i> ' + esc(T('Добавить источник: аккаунт или площадка')) + '</button>';
        return h;
    }

    function openSrcRenameSheet(id) {
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg) return;
        var l = null;
        _items.forEach(function (x) { if (x.id === id) l = x; });
        sh.innerHTML = '<div class="pl-grip"></div>' +
            '<div class="pl-ht" style="font-size:15px;">' + esc(T('Название источника')) + '</div>' +
            '<input class="pl-inp" id="pl-src-name" maxlength="80" autocomplete="off" value="' + esc((l && l.name) || '') + '">' +
            '<button class="pl-cta" data-act="src-rename-save" data-id="' + id + '">' + esc(T('Сохранить')) + '</button>';
        sh.classList.add('on'); bg.classList.add('on');
    }

    function srcCreate(spk, meas) {
        apiRequest('/api/v1/placements/sources',
                   { method: 'POST', body: JSON.stringify({ channel_id: _chId, platform_key: spk, measure: !!meas }) })
            .then(function (r) {
                if (r && r.ok) {
                    haptic('light'); closeSheet(); load();
                    var su = srcLink(r.item || {});
                    if (su) copyText(su, T('Источник создан, ссылка скопирована — размести её на площадке'));
                } else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
            }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
    }

    function openSrcMeasureSheet(key) {
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg) return;
        sh.innerHTML = '<div class="pl-grip"></div>' +
            '<div class="pl-ht" style="font-size:15px;">' + esc(T('Как замерять источник')) + '</div>' +
            '<div style="font-size:12.5px;color:#8990a8;margin:4px 0 10px;">' + esc(T('Канал публичный. Выбери, что важнее.')) + '</div>' +
            '<div class="pl-mopt" data-act="src-add-go" data-key="' + esc(key) + '" data-meas="1">' +
            '<span class="pl-mtag g">' + esc(T('точный замер')) + '</span>' +
            '<b>' + esc(T('Ссылка со счётчиком fmtr')) + '</b>' +
            '<p class="g"><i>+</i><span>' + esc(T('Единственный способ замера на публичном канале: каждый переход фиксируется, подписчики привязываются к источнику.')) + '</span></p>' +
            '<p class="g"><i>+</i><span>' + esc(T('Видно и переходы, и подписчиков — по ним считается цена подписчика с площадки.')) + '</span></p>' +
            '<p class="r"><i>\u2212</i><span>' + esc(T('Один промежуточный шаг в доли секунды: часть аудитории может отсеяться, конверсия перехода немного ниже, чем у прямой ссылки.')) + '</span></p></div>' +
            '<div class="pl-mopt" data-act="src-add-go" data-key="' + esc(key) + '" data-meas="0">' +
            '<span class="pl-mtag o">' + esc(T('без замера')) + '</span>' +
            '<b>' + esc(T('Прямая ссылка t.me')) + '</b>' +
            '<p class="g"><i>+</i><span>' + esc(T('Максимальная конверсия: человек попадает в Telegram сразу, без промежуточных шагов.')) + '</span></p>' +
            '<p class="r"><i>\u2212</i><span>' + esc(T('На публичном канале замер не работает: Telegram не сообщает, по какой ссылке человек вступил, — карточка источника останется без данных.')) + '</span></p></div>';
        sh.classList.add('on'); bg.classList.add('on');
    }

    function openSrcAddSheet() {
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg) return;
        var opts = Object.keys(SRC_PLATS).map(function (k) {
            return '<div class="pl-src" style="margin-bottom:8px;cursor:pointer;" data-act="src-add-pick" data-key="' + k + '">' +
                '<div class="pl-srow"><div class="pl-sic ' + SRC_PLATS[k].c + '">' + SRC_PLATS[k].svg + '</div>' +
                '<div class="pl-snm"><b><u>' + esc(SRC_PLATS[k].n) + '</u></b></div>' +
                '<i class="ti ti-chevron-right" style="color:#565b73;"></i></div></div>';
        }).join('');
        sh.innerHTML = '<div class="pl-grip"></div>' +
            '<div class="pl-ht" style="font-size:15px;">' + esc(T('Новый источник')) + '</div>' +
            '<div style="font-size:12.5px;color:#8990a8;margin:4px 0 10px;">' + esc(T('Выбери площадку — для неё будет создана отдельная ссылка. Название можно изменить после создания.')) + '</div>' + opts;
        sh.classList.add('on'); bg.classList.add('on');
    }

    function render() {
        var host = ensureScreen();
        var body;
        if (_right === false) {
            body = permCard();
        } else {
            var view = _campId == null ? _items.filter(function (x) { return !x.platform_key; }) : _items.filter(function (x) { return x.campaign_id === _campId; });
            var wRank = function (x) {
                if (x.status !== 'active') return 2;
                return (x.attribution_until && new Date(x.attribution_until) <= new Date()) ? 1 : 0;
            };
            view = view.slice().sort(function (a, b) { return wRank(a) - wRank(b); });
            var cands = _campId == null ? [] : _cands.filter(function (c) { return c.campaign_id === _campId; });
            body = '<div class="pl-chips"><span class="pl-chip' + (_campId == null ? ' on' : '') + '" data-act="chip" data-camp="">' + esc(T('Все')) + '</span>' +
                _campaigns.map(function (c) { return '<span class="pl-chip' + (_campId === c.id ? ' on' : '') + '" data-act="chip" data-camp="' + c.id + '">' + esc(c.name) + '</span>'; }).join('') +
                '<span class="pl-chip add" data-act="camp-new">+ ' + esc(T('Кампания')) + '</span></div>';
            var _howOpen = false;
            try { _howOpen = localStorage.getItem('fm_pl_how') === '1'; } catch (e) {}
            if (_campId == null) {
            body += srcBlock();
            body += '<div class="pl-fcap" style="margin:10px 0 6px;">' + esc(T('Размещения в Telegram')) + '</div>';
            body += '<div class="pl-how"><div class="pl-howt" data-act="how"><i class="ti ti-target"></i> ' + esc(T('Как отследить размещение')) + '<span id="pl-howarr" style="margin-left:auto;color:#565b73;font-size:11px;">' + (_howOpen ? '▲' : '▼') + '</span></div>' +
                '<div id="pl-howbody" style="display:' + (_howOpen ? 'block' : 'none') + ';">' +
                [[T('Купи размещение'), T('Найди канал на Площадке или договорись с админом напрямую.')],
                 [T('Создай ссылку здесь'), T('Она ведёт в твой канал и считает каждого, кто пришёл именно с этой рекламы.')],
                 [T('Отдай ссылку админу'), T('Он вставит её в рекламный пост вместо обычной t.me-ссылки.')],
                 [T('Смотри воронку'), T('Показы, клики, подписки, отписки и цена подписчика считаются сами.')]].map(function (st, i) {
                    return '<div class="pl-step"><span class="n">' + (i + 1) + '</span><div><b>' + esc(st[0]) + '</b><span>' + esc(st[1]) + '</span></div></div>';
                }).join('') + '</div></div>';
            body += _chPaused
                ? '<div class="pl-pausebox"><i class="ti ti-player-pause"></i><div><b>' + esc(T('Канал на паузе')) + '</b><span>' +
                  esc(_pausedNote || T('Новые ссылки недоступны. Уже созданные продолжают считать переходы.')) + '</span></div></div>'
                : '<button class="pl-new" data-act="new"><i class="ti ti-plus"></i> ' + esc(T('Новая ссылка под размещение')) + '</button>';
            }
            if (view.length >= 2) {
                var sumSpend = 0, sumJoin = 0, sumRet = 0, sumJoinPriced = 0;
                view.forEach(function (x) {
                    sumJoin += x.joined || 0;
                    sumRet += x.retained_now || 0;
                    if (x.price_rub) { sumSpend += x.price_rub; sumJoinPriced += x.joined || 0; }
                });
                var blended = (sumSpend > 0 && sumJoinPriced > 0) ? Math.round(sumSpend / sumJoinPriced) : null;
                body += '<div class="pl-fcap" style="margin:2px 0 6px;">' + esc(T(_campId == null ? 'Сводка по размещениям' : 'Сводка по кампании')) + '</div>' +
                    '<div class="pl-tape">' +
                    '<div class="pl-tq"><div class="k">' + esc(T('Расход')) + '</div><div class="v">' + (sumSpend ? num(sumSpend) + ' ₽' : '—') + '</div></div>' +
                    '<div class="pl-tq"><div class="k">' + esc(T('Подписались')) + '</div><div class="v" style="color:#5DCAA5;">' + (sumJoin ? '+' + num(sumJoin) : '0') + '</div></div>' +
                    '<div class="pl-tq"><div class="k">' + esc(T('Осталось')) + '</div><div class="v">' + num(sumRet) + '</div></div>' +
                    '<div class="pl-tq"><div class="k">' + esc(T('Средний CPF')) + '</div><div class="v">' + (blended != null ? rub(blended) : '—') + '</div></div></div>';
            }
            if (_campId != null) {
                if (cands.length) {
                    body += '<div class="pl-fcap" style="margin:8px 0 6px;">' + esc(T('Кандидаты')) + ' · ' + cands.length + '</div>' + cands.map(candCard).join('');
                }
                body += '<button class="pl-ghost" data-act="camp-add" style="margin-top:6px;"><i class="ti ti-plus"></i> ' + esc(T('Добавить канал')) + '</button>';
                var activeCnt = _items.filter(function (x) { return x.status === 'active'; }).length;
                if (activeCnt >= 15) body += '<div class="pl-note">' + esc(T('Активных ссылок')) + ': ' + activeCnt + ' ' + esc(T('из')) + ' 20</div>';
            }
            if (!view.length) {
                if (_campId == null) {
                    body += '<div class="pl-empty"><i class="ti ti-link"></i><h3>' + esc(T('Ссылок пока нет')) + '</h3>' +
                        '<p>' + esc(T('Создай ссылку под размещение и вставь её в рекламный пост вместо @имени канала — увидишь, сколько подписчиков принесла реклама.')) + '</p></div>';
                } else if (!cands.length) {
                    body += '<div class="pl-empty"><i class="ti ti-folder"></i><h3>' + esc(T('Кампания пока пуста')) + '</h3>' +
                        '<p>' + esc(T('Добавь каналы — из закладок или ссылкой на канал.')) + '</p></div>';
                }
            } else {
                body += '<div class="pl-fcap" style="margin:' + (_campId != null ? '12px' : '2px') + ' 0 6px;">' +
                    esc(_campId != null ? T('Ссылки кампании') : T('Размещения')) + ' · ' + view.length + '</div>';
                body += view.map(accCard).join('');
                body += '<div class="pl-note">' + esc(T('Счётчики обновляются сами каждые 10 секунд. «Осталось» — сколько вступивших сейчас в канале.')) + '</div>';
            }
            if (_campId != null) {
                body += '<div class="pl-actrow" style="margin-top:8px;"><button class="pl-revoke danger" data-act="camp-del">' + esc(T('Удалить кампанию')) + '</button></div>';
            }
        }
        host.innerHTML = head() + '<div class="pl-body">' + body + '</div>' +
            '<div class="pl-sheetbg" id="pl-sheetbg"></div>' +
            '<div class="pl-sheet" id="pl-sheet"></div>';
        bindAv(host);
        host.onclick = onClick;
        var bg = document.getElementById('pl-sheetbg');
        if (bg) bg.addEventListener('click', closeSheet);
        animateCounters();
        if (_openId != null) openWhoPanel(_openId);
    }

    function loading() {
        var host = ensureScreen();
        host.innerHTML = head() + '<div class="pl-body"><div class="pl-spin"></div><div class="pl-center">' + esc(T('Загружаю...')) + '</div></div>';
    }

    var _prefillChan = null;
    function load() {
        loading();
        apiRequest('/api/v1/placements/links?channel_id=' + _chId).then(function (r) {
            if (r && r.ok) {
                _items = r.items || []; _right = r.right;
                _campaigns = r.campaigns || []; _cands = r.candidates || [];
                _chPaused = !!r.channel_paused; _pausedNote = r.paused_note || '';
                _syncCamp();
            }
            else { _items = []; _right = null; _campaigns = []; _cands = []; _campId = null; _chPaused = false; _pausedNote = ''; if (r && r.message) toast(r.message); }
            render();
            if (_prefillChan && _right !== false) {
                var pu = _prefillChan;
                _prefillChan = null;
                openCreateSheet();
                var ci = document.getElementById('pl-chan');
                if (ci) {
                    ci.value = 't.me/' + pu;
                    try { ci.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
                }
            }
        }).catch(function () { _items = []; _right = null; _campaigns = []; _cands = []; _campId = null; render(); toast(T('Не загрузилось. Открой ещё раз.')); });
    }

    function closeSheet() {
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (sh) sh.classList.remove('on');
        if (bg) bg.classList.remove('on');
    }

    function openCreateSheet() {
        var ch = curChannel();
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg) return;
        sh.innerHTML = '<div class="pl-grip"></div>' +
            '<div class="pl-ht" style="font-size:15px;">' + esc(T('Новая ссылка под размещение')) + '</div>' +
            '<div id="pl-src-deals" style="display:none;"></div>' +
            '<div class="pl-flabel" id="pl-chan-label">' + esc(T('Канал, где размещаешься — вставь ссылку или @имя')) + '</div>' +
            '<input class="pl-inp" id="pl-chan" maxlength="120" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://t.me/канал" value="">' +
            '<div style="font-size:10px;color:#565b73;margin:6px 0 2px;line-height:1.4;">' +
            esc(T('Укажи @имя канала — показы рекламного поста замерятся автоматически.')) + '</div>' +
            '<div id="pl-chinfo" style="display:none;font-size:10.5px;margin:8px 0 4px;line-height:1.45;"></div>' +
            '<div class="pl-glink" id="pl-rename-lnk" data-act="rename-toggle" style="margin:2px 0 8px;">' + esc(T('Изменить название записи')) + '</div>' +
            '<div id="pl-name-wrap" style="display:none;">' +
            '<div class="pl-flabel">' + esc(T('Название записи')) + '</div>' +
            '<input class="pl-inp" id="pl-name" maxlength="80" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="' + esc(T('Реклама у @канал')) + '" value="" style="margin-bottom:8px;"></div>' +
            '<div class="pl-flabel">' + esc(T('Цена размещения, ₽ — для расчёта CPF')) + '</div>' +
            '<input class="pl-inp" id="pl-price" type="number" inputmode="numeric" min="0" autocomplete="off" placeholder="' + esc(T('не обязательно')) + '">' +
            '<div class="pl-flabel">' + esc(T('Тип ссылки')) + '</div>' +
            '<div class="pl-ltopt sel" data-act="ltype"><b>' + esc(T('Прямая ссылка Telegram')) + '</b>' +
            '<span>' + esc(T('Привычный t.me — считает подписавшихся и качество трафика.')) + '</span></div>' +
            '<div class="pl-ltopt" data-act="ltype" data-track="1"><b>' + esc(T('Ссылка с учётом переходов')) + '</b>' +
            '<span>' + esc(T('Считает ещё и клики: добавятся CTR и CPC — видно, где теряются люди между показом и подпиской.')) + '</span></div>' +
            '<div class="pl-flabel">' + esc(T('Формат размещения')) + '</div>' +
            '<div class="pl-fmtrow">' + [['post','пост'],['pin','закреп'],['story','сторис'],['circle','кружок'],['repost','репост'],['other','другое']].map(function (f, i) {
                return '<span class="pl-fmt' + (i === 0 ? ' sel' : '') + '" data-act="fmt" data-fmt="' + f[0] + '">' + esc(T(f[1])) + '</span>';
            }).join('') + '</div>' +
            '<div id="pl-fmt-hint" class="pl-note" style="display:none;margin-top:8px;"></div>' +
            '<div class="pl-flabel">' + esc(T('Срок в ленте')) + '</div>' +
            '<div class="pl-fmtrow">' + [['24', '24 ч'], ['48', '48 ч'], ['72', '72 ч'], ['0', 'без удаления']].map(function (a, i) {
                return '<span class="pl-fmt' + (i === 0 ? ' sel' : '') + '" data-act="alv" data-alv="' + a[0] + '">' + esc(T(a[1])) + '</span>';
            }).join('') + '</div>' +
            '<div class="pl-note">' + esc(T('Читатель нажимает по ссылке «Подать заявку» — бот одобряет её мгновенно, задержка меньше секунды. Окно атрибуции — 7 дней: вступления позже учитываются отдельно и в CPF не входят. Ссылку можно отозвать в любой момент.')) + '</div>' +
            '<button class="pl-new" style="margin:13px 0 0;" data-act="create">' + esc(T('Создать ссылку')) + '</button>';
        bg.classList.add('on');
        sh.classList.add('on');
        _resolvedDeal = null;
        _resolvedSeller = null;
        _pendingItem = null;
        var nmIn = document.getElementById('pl-name');
        if (nmIn) nmIn.addEventListener('input', function () { nmIn.removeAttribute('data-auto'); });
        var chIn = document.getElementById('pl-chan');
        if (chIn) {
            var _rt = null;
            chIn.addEventListener('input', function () {
                if (_rt) clearTimeout(_rt);
                _rt = setTimeout(function () {
                    var v = chIn.value.trim();
                    var info = document.getElementById('pl-chinfo');
                    _resolvedDeal = null;
                    _resolvedSeller = null;
                    if (!v || v.length < 4) { if (info) info.style.display = 'none'; return; }
                    apiRequest('/api/v1/placements/resolve-channel?u=' + encodeURIComponent(v)).then(function (r) {
                        if (!info || !r || document.getElementById('pl-chan') !== chIn) return;
                        if (chIn.value.trim() !== v) return;
                        if (!r.username) {
                            var m2 = v.match(/(?:t\.me\/|@)([A-Za-z0-9_]{4,32})/) || v.match(/^([A-Za-z0-9_]{4,32})$/);
                            if (m2) { info.style.display = 'none'; return; }
                            info.style.color = '#f5bf4f';
                            info.textContent = T('Канал не распознан — автозамер показов не включится. Вставь @имя или ссылку t.me, иначе показы придётся указывать вручную.');
                            info.style.display = 'block';
                            return;
                        }
                        _resolvedSeller = r.username;
                        var nameIn = document.getElementById('pl-name');
                        if (nameIn && (!nameIn.value.trim() || nameIn.getAttribute('data-auto'))) {
                            nameIn.value = T('Реклама у') + ' @' + r.username;
                            nameIn.setAttribute('data-auto', '1');
                        }
                        if (r.found) {
                            var bits = ['✓ ' + (r.title || '@' + r.username)];
                            if (r.subscribers) bits.push(num(r.subscribers) + ' ' + T('подписчиков'));
                            if (r.market) bits.push(T('есть на Площадке'));
                            if (r.deal_id) { _resolvedDeal = r.deal_id; bits.push(T('сделка привяжется автоматически')); }
                            bits.push(T('автозамер показов включится'));
                            info.style.color = '#5DCAA5';
                            info.textContent = bits.join(' · ');
                        } else {
                            info.style.color = '#8990a8';
                            info.textContent = T('Канала нет в нашем каталоге — учёт и автозамер показов всё равно будут работать.');
                        }
                        info.style.display = 'block';
                    }).catch(function () {});
                }, 400);
            });
            setTimeout(function () { try { chIn.focus(); } catch (e) {} }, 250);
        }
        apiRequest('/api/v1/placements/deals').then(function (r) {
            var box = document.getElementById('pl-src-deals');
            if (!box || !r || !r.items || !r.items.length) return;
            box.innerHTML = '<div class="pl-flabel" style="margin-top:12px;">' + esc(T('Твои сделки Площадки')) + '</div>' +
                r.items.map(function (d) {
                    var m = d.measured && (d.reach_24h || d.reach_48h)
                        ? ' · ~' + num(d.reach_24h || d.reach_48h) + ' ' + esc(T('показов'))
                        : ' · ' + esc(T('замер ожидается'));
                    return '<div class="pl-deal" data-act="from-deal" data-deal="' + d.deal_id + '">' +
                        '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(d.channel || ('@' + (d.username || ''))) + '</div>' +
                        '<div style="font-size:10px;color:#8990a8;">' + esc(T('сделка')) + ' №' + d.deal_id + m + '</div></div>' +
                        '<span style="color:#818cf8;flex:0 0 auto;">→</span></div>';
                }).join('');
            box.style.display = 'block';
            var lbl = document.getElementById('pl-chan-label');
            if (lbl) lbl.textContent = T('Или укажи канал сам — вставь ссылку или @имя');
        }).catch(function () {});
    }

    var _resolvedDeal = null, _resolvedSeller = null;
    function doCreate() {
        if (_busy) return;
        var name = (document.getElementById('pl-name') || {}).value || '';
        var price = (document.getElementById('pl-price') || {}).value || '';
        name = name.trim();
        var chv = ((document.getElementById('pl-chan') || {}).value || '').trim();
        var mch = chv.match(/(?:t\.me\/|@)([A-Za-z0-9_]{4,32})/) || chv.match(/^([A-Za-z0-9_]{4,32})$/);
        if (!name) {
            if (mch) name = T('Реклама у') + ' @' + mch[1];
            else { toast(T('Вставь ссылку на канал или укажи название')); return; }
        }
        var seller = _resolvedSeller || (mch ? mch[1] : null);
        var selOpt = document.querySelector('#pl-sheet .pl-ltopt.sel');
        var track = !!(selOpt && selOpt.getAttribute('data-track'));
        _busy = true;
        apiRequest('/api/v1/placements/links', {
            method: 'POST',
            body: JSON.stringify({ channel_id: _chId, name: name, price_rub: price ? parseInt(price, 10) : null, track_clicks: track, placement_format: (document.querySelector('#pl-sheet .pl-fmt.sel[data-fmt]') || { getAttribute: function () { return null; } }).getAttribute('data-fmt'), campaign_item_id: _pendingItem || null, seller_username: seller, min_alive_hours: (function () { var a = document.querySelector('#pl-sheet [data-act="alv"].sel'); return a ? parseInt(a.getAttribute('data-alv'), 10) : 24; })() })
        }).then(function (r) {
            _busy = false;
            if (r && r.ok) {
                haptic('medium');
                _pendingItem = null;
                closeSheet();
                if (_resolvedDeal && r.item && r.item.id) {
                    var _bd = _resolvedDeal;
                    _resolvedDeal = null;
                    apiRequest('/api/v1/placements/links/' + r.item.id + '/deal', {
                        method: 'POST', body: JSON.stringify({ deal_id: _bd })
                    }).then(load, load);
                } else {
                    load();
                }
                if (r.item) {
                    var cu = r.item.click_code ? (CLICK_BASE + '/r/' + r.item.click_code) : r.item.invite_link;
                    if (cu) copyText(cu, T('Ссылка создана и скопирована — вставь её в рекламный пост'));
                }
            } else if (r && r.error === 'no_right') {
                closeSheet(); _right = false; render();
            } else {
                toast((r && r.message) || T('Не удалось. Повтори попытку.'));
            }
        }).catch(function () { _busy = false; toast(T('Не удалось. Повтори попытку.')); });
    }

    function copyText(text, okMsg) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () { toast(okMsg || T('Скопировано')); });
                return;
            }
        } catch (e) {}
        try {
            var ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); ta.remove();
            toast(okMsg || T('Скопировано'));
        } catch (e) {}
    }

    function domConfirm(msg, okLabel, danger) {
        return new Promise(function (resolve) {
            var old = document.getElementById('pl-cfbg');
            if (old) old.remove();
            var bg = document.createElement('div');
            bg.className = 'pl-cfbg';
            bg.id = 'pl-cfbg';
            bg.innerHTML = '<div class="pl-cf"><div class="pl-cftxt"></div>' +
                '<div class="pl-cfrow"><button class="pl-cfbtn cancel"></button>' +
                '<button class="pl-cfbtn ok' + (danger ? ' danger' : '') + '"></button></div></div>';
            bg.querySelector('.pl-cftxt').textContent = msg;
            bg.querySelector('.cancel').textContent = T('Отмена');
            bg.querySelector('.ok').textContent = okLabel;
            var done = function (ok) {
                bg.classList.remove('on');
                setTimeout(function () { bg.remove(); }, 180);
                resolve(ok);
            };
            bg.addEventListener('click', function (e) { if (e.target === bg) done(false); });
            bg.querySelector('.cancel').addEventListener('click', function () { done(false); });
            bg.querySelector('.ok').addEventListener('click', function () { haptic('light'); done(true); });
            document.body.appendChild(bg);
            requestAnimationFrame(function () { bg.classList.add('on'); });
        });
    }

    function doRevoke(id) {
        var go = function () {
            apiRequest('/api/v1/placements/links/' + id + '/revoke', { method: 'POST', body: '{}' })
                .then(function (r) {
                    if (r && r.ok) { haptic('light'); toast(T('Ссылка отключена — новые вступления по ней невозможны')); load(); }
                    else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
        };
        domConfirm(T('Отключить ссылку? Она перестанет работать, статистика сохранится.'), T('Отключить ссылку'), false)
            .then(function (ok) { if (ok) go(); });
    }

    function doEnable(id) {
        haptic('medium');
        apiRequest('/api/v1/placements/links/' + id + '/enable', { method: 'POST', body: '{}' })
            .then(function (r) {
                if (r && r.ok) { haptic('light'); toast(T('Ссылка снова активна — прежний адрес работает')); load(); }
                else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
            }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
    }

    function onClick(e) {
        var b = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!b) return;
        var act = b.getAttribute('data-act');
        if (act === 'close') { close(); return; }
        if (act === 'new') { haptic('light'); openCreateSheet(); return; }
        if (act === 'chip') { haptic('light'); var cv = b.getAttribute('data-camp'); _campId = cv ? parseInt(cv, 10) : null; render(); return; }
        if (act === 'camp-new') { haptic('light'); openCampSheet(null); return; }
        if (act === 'camp-add') { haptic('light'); openCampSheet(_campId); return; }
        if (act === 'camp-save') { doCampSave(b.getAttribute('data-mode')); return; }
        if (act === 'camp-del') {
            var cdid = _campId;
            domConfirm(T('Кандидаты будут удалены. Ссылки и их статистика сохранятся в общем списке.'), T('Удалить кампанию'), true).then(function (ok) {
                if (!ok || cdid == null) return;
                apiRequest('/api/v1/placements/campaigns/' + cdid + '/delete', { method: 'POST', body: '{}' }).then(function (r) {
                    if (r && r.ok) { haptic('light'); _campId = null; load(); }
                    else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            });
            return;
        }
        if (act === 'cand-del') {
            var cndid = parseInt(b.getAttribute('data-item'), 10);
            domConfirm(T('Убрать канал из кампании?'), T('Убрать'), false).then(function (ok) {
                if (!ok) return;
                apiRequest('/api/v1/placements/campaign-items/' + cndid + '/delete', { method: 'POST', body: '{}' }).then(function (r) {
                    if (r && r.ok) { haptic('light'); load(); }
                    else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            });
            return;
        }
        if (act === 'cand-go') {
            haptic('light');
            var cgi = parseInt(b.getAttribute('data-item'), 10), cgu = b.getAttribute('data-u');
            openCreateSheet();
            _pendingItem = cgi;
            var cgin = document.getElementById('pl-chan');
            if (cgin && cgu) {
                cgin.value = 't.me/' + cgu;
                try { cgin.dispatchEvent(new Event('input', { bubbles: true })); } catch (e3) {}
            }
            return;
        }
        if (act === 'cb') {
            var cbe = b.querySelector('.pl-cb');
            if (cbe) { cbe.classList.toggle('on'); cbe.textContent = cbe.classList.contains('on') ? '✓' : ''; haptic('light'); }
            return;
        }
        if (act === 'tocamp') { haptic('light'); openToCampSheet(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'tocamp-pick') {
            var tlid = parseInt(b.getAttribute('data-link'), 10);
            var tcv = b.getAttribute('data-camp');
            apiRequest('/api/v1/placements/links/' + tlid + '/campaign', {
                method: 'POST', body: JSON.stringify({ campaign_id: tcv ? parseInt(tcv, 10) : null })
            }).then(function (r) {
                if (r && r.ok) { haptic('medium'); closeSheet(); load(); }
                else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
            }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            return;
        }
        if (act === 'how') {
            haptic('light');
            var hb = document.getElementById('pl-howbody'), ha = document.getElementById('pl-howarr');
            if (hb) {
                var open = hb.style.display !== 'none';
                hb.style.display = open ? 'none' : 'block';
                if (ha) ha.textContent = open ? '▼' : '▲';
                try { localStorage.setItem('fm_pl_how', open ? '0' : '1'); } catch (e) {}
            }
            return;
        }
        if (act === 'from-deal') {
            if (_busy) return;
            haptic('light');
            var fdid = parseInt(b.getAttribute('data-deal'), 10);
            _busy = true;
            apiRequest('/api/v1/placements/from-deal', {
                method: 'POST', body: JSON.stringify({ deal_id: fdid, channel_id: _chId, min_alive_hours: (function () { var a = document.querySelector('#pl-sheet [data-act="alv"].sel'); return a ? parseInt(a.getAttribute('data-alv'), 10) : 24; })() })
            }).then(function (r) {
                _busy = false;
                if (!r || r.ok === false) { toast((r && r.message) || T('Не удалось. Повтори попытку.')); return; }
                var it = r.item || {};
                var url = it.click_code ? (CLICK_BASE + '/r/' + it.click_code) : (it.invite_link || '');
                haptic('medium');
                closeSheet();
                load();
                if (url) copyText(url, T('Ссылка создана и скопирована — вставь её в рекламный пост'));
            }).catch(function () { _busy = false; toast(T('Не удалось. Повтори попытку.')); });
            return;
        }
        if (act === 'chpick') { haptic('light'); openChannelSheet(); return; }
        if (act === 'chpick-go') {
            var nch = parseInt(b.getAttribute('data-ch'), 10);
            closeSheet();
            if (nch && nch !== _chId) { _chId = nch; _campId = null; load(); }
            return;
        }
        if (act === 'imp') { haptic('light'); openImpSheet(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'imp-save') {
            var iid = parseInt(b.getAttribute('data-id'), 10);
            var iv = ((document.getElementById('pl-imp') || {}).value || '').trim();
            apiRequest('/api/v1/placements/links/' + iid + '/impressions', {
                method: 'POST', body: JSON.stringify({ impressions: iv ? parseInt(iv, 10) : null })
            }).then(function (r) {
                if (r && r.ok) {
                    haptic('medium'); closeSheet(); load();
                    var _lk = null; _items.forEach(function (x) { if (x.id === iid) _lk = x; });
                    toast((_lk && _lk.price_rub)
                        ? T('Показы сохранены — CPM и CTR посчитаны')
                        : T('Показы сохранены. Укажи цену размещения, чтобы увидеть CPM'));
                } else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
            }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            return;
        }
        if (act === 'src-how') {
            haptic('light');
            var sb = document.getElementById('pl-srchowbody'), sa = document.getElementById('pl-srchowarr');
            var vis = sb && sb.style.display !== 'none';
            if (sb) sb.style.display = vis ? 'none' : 'block';
            if (sa) sa.textContent = vis ? '\u25bc' : '\u25b2';
            try { localStorage.setItem('fm_pl_src_how', vis ? '0' : '1'); } catch (e2) {}
            return;
        }
        if (act === 'src-help') {
            haptic('light');
            var hid = parseInt(b.getAttribute('data-id'), 10);
            var hcard = b.closest ? b.closest('.pl-src') : null;
            if (!hcard) return;
            var hpanel = hcard.querySelector('.pl-shint');
            if (hpanel) {
                hpanel.remove();
                b.classList.remove('on');
                _srcHint[hid] = false;
            } else {
                var hd = document.createElement('div');
                hd.className = 'pl-shint';
                hd.innerHTML = srcHintInner();
                hcard.appendChild(hd);
                b.classList.add('on');
                _srcHint[hid] = true;
            }
            return;
        }
        if (act === 'src-copy') {
            haptic('light');
            copyText(b.getAttribute('data-link') || '', T('Ссылка скопирована — размести её в описании ролика или профиля'));
            return;
        }
        if (act === 'src-spend') { haptic('light'); openPriceSheet(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'src-rename') { haptic('light'); openSrcRenameSheet(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'src-rename-save') {
            var rnid = parseInt(b.getAttribute('data-id'), 10);
            var rnv = ((document.getElementById('pl-src-name') || {}).value || '').trim();
            if (!rnv) { toast(T('Укажи название источника.')); return; }
            apiRequest('/api/v1/placements/links/' + rnid + '/rename',
                       { method: 'POST', body: JSON.stringify({ name: rnv }) })
                .then(function (r) {
                    if (r && r.ok) { haptic('light'); closeSheet(); load(); }
                    else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            return;
        }
        if (act === 'src-del') {
            var sdid = parseInt(b.getAttribute('data-id'), 10);
            domConfirm(T('Ссылка источника будет отозвана в Telegram, статистика по нему удалена. Продолжить?'), T('Удалить источник'), true).then(function (ok) {
                if (!ok) return;
                apiRequest('/api/v1/placements/links/' + sdid + '/delete', { method: 'POST', body: '{}' })
                    .then(function (r) {
                        if (r && r.ok) { haptic('medium'); load(); }
                        else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                    }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            });
            return;
        }
        if (act === 'src-add') { haptic('light'); openSrcAddSheet(); return; }
        if (act === 'src-add-pick') {
            var spk = b.getAttribute('data-key');
            if (!isChPrivate()) { haptic('light'); openSrcMeasureSheet(spk); return; }
            srcCreate(spk, true);
            return;
        }
        if (act === 'src-add-go') {
            srcCreate(b.getAttribute('data-key'), b.getAttribute('data-meas') === '1');
            return;
        }
        if (act === 'price') { haptic('light'); openPriceSheet(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'price-save') {
            var pid = parseInt(b.getAttribute('data-id'), 10);
            var pv = ((document.getElementById('pl-price-edit') || {}).value || '').trim();
            apiRequest('/api/v1/placements/links/' + pid + '/price', {
                method: 'POST', body: JSON.stringify({ price_rub: pv ? parseInt(pv, 10) : null })
            }).then(function (r) {
                if (r && r.ok) { haptic('medium'); closeSheet(); load(); toast(T('Цена сохранена')); }
                else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
            }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            return;
        }
        if (act === 'alv') {
            var als = b.parentNode.querySelectorAll('.pl-fmt');
            for (var ai = 0; ai < als.length; ai++) als[ai].classList.remove('sel');
            b.classList.add('sel');
            haptic('light');
            return;
        }
        if (act === 'fmt') {
            var fms = b.parentNode.querySelectorAll('.pl-fmt');
            for (var fi = 0; fi < fms.length; fi++) fms[fi].classList.remove('sel');
            b.classList.add('sel');
            var fh = document.getElementById('pl-fmt-hint');
            if (fh) {
                var fmap = {
                    story: T('Попроси админа прикрепить эту ссылку к сторис — без неё переходы не считаются, а вступившие попадут в «Пришли сами».'),
                    circle: T('В кружок ссылку вшить нельзя. Договорись с админом: сразу под кружком он публикует в канале пост с этой ссылкой.'),
                    repost: T('Вшей эту ссылку в текст поста до пересылки — переходы по шапке репоста проходят мимо ссылки и попадают в «Пришли сами».')
                };
                var ft = fmap[b.getAttribute('data-fmt')];
                fh.textContent = ft || '';
                fh.style.display = ft ? 'block' : 'none';
            }
            haptic('light');
            return;
        }
        if (act === 'rename-toggle') {
            var nw = document.getElementById('pl-name-wrap');
            if (nw) nw.style.display = 'block';
            b.style.display = 'none';
            var ni = document.getElementById('pl-name');
            if (ni) { try { ni.focus(); } catch (e) {} }
            haptic('light');
            return;
        }
        if (act === 'ltype') {
            var opts = document.querySelectorAll('#pl-sheet .pl-ltopt');
            for (var oi = 0; oi < opts.length; oi++) opts[oi].classList.remove('sel');
            b.classList.add('sel');
            haptic('light');
            return;
        }
        if (act === 'create') { doCreate(); return; }
        if (act === 'copy') { copyText(b.getAttribute('data-link')); return; }
        if (act === 'revoke') { doRevoke(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'enable') { doEnable(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'recheck') { haptic('light'); load(); return; }
        if (act === 'metricinfo') {
            var mi = document.getElementById('pl-minfo-' + b.getAttribute('data-id'));
            if (mi) mi.style.display = mi.style.display === 'none' ? 'block' : 'none';
            haptic('light');
            return;
        }
        if (act === 'exp') {
            haptic('light');
            var eid = parseInt(b.getAttribute('data-id'), 10);
            openAcc(_openId === eid ? null : eid);
            return;
        }
        if (act === 'who') { haptic('light'); openJoinersSheet(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'jday') { openJoinersSheet(parseInt(b.getAttribute('data-id'), 10), b.getAttribute('data-day')); return; }
        if (act === 'deal') { openDealPick(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'deal-pick') {
            var lid = parseInt(b.getAttribute('data-link'), 10);
            var dv = b.getAttribute('data-deal');
            apiRequest('/api/v1/placements/links/' + lid + '/deal', {
                method: 'POST', body: JSON.stringify({ deal_id: dv ? parseInt(dv, 10) : null })
            }).then(function (r) {
                if (r && r.ok) { haptic('medium'); toast(dv ? T('Сделка привязана — показы появятся в воронке') : T('Сделка отвязана')); closeSheet(); }
                else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
            }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            return;
        }
        if (act === 'del') {
            var did = parseInt(b.getAttribute('data-id'), 10);
            var doDel = function () {
                apiRequest('/api/v1/placements/links/' + did + '/delete', { method: 'POST', body: '{}' })
                    .then(function (r) {
                        if (r && r.ok) { haptic('light'); toast(T('Запись удалена')); load(); }
                        else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                    }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            };
            var delMsg = b.getAttribute('data-st') === 'active'
                ? T('Ссылка перестанет работать, запись и её статистика будут удалены безвозвратно. Продолжить?')
                : T('Удалить запись вместе с её статистикой? Действие необратимо.');
            domConfirm(delMsg, T('Удалить'), true).then(function (ok) { if (ok) doDel(); });
            return;
        }
        if (act === 'openpost') {
            var pu2 = b.getAttribute('data-url');
            if (!pu2) return;
            try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) { tg.openTelegramLink(pu2); return; } } catch (e4) {}
            try { window.open(pu2, '_blank'); } catch (e5) {}
            return;
        }
        if (act === 'open-user') {
            var u = b.getAttribute('data-u');
            if (!u) return;
            try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) { tg.openTelegramLink('https://t.me/' + u); return; } } catch (e2) {}
            try { window.open('https://t.me/' + u, '_blank'); } catch (e3) {}
            return;
        }
    }

    function openDealPick(linkId) {
        haptic('light');
        var sh = document.getElementById('pl-sheet'), bg = document.getElementById('pl-sheetbg');
        if (!sh || !bg) return;
        sh.innerHTML = '<div class="pl-grip"></div><div class="pl-ht" style="font-size:15px;">' + esc(T('Связать со сделкой Площадки')) + '</div>' +
            '<div class="pl-note">' + esc(T('Выбери сделку, по которой вышел этот рекламный пост, — в воронке появятся его показы.')) + '</div>' +
            '<div id="pl-deals" style="margin-top:10px;"><div class="pl-center">' + esc(T('Загружаю...')) + '</div></div>';
        bg.classList.add('on'); sh.classList.add('on');
        apiRequest('/api/v1/placements/deals').then(function (r) {
            var box = document.getElementById('pl-deals');
            if (!box) return;
            var items = (r && r.items) || [];
            if (!items.length) {
                box.innerHTML = '<div class="pl-center" style="padding:8px 0;">' + esc(T('Подтверждённых покупок на Площадке пока нет')) + '</div>' +
                    '<div class="pl-note" style="margin-top:6px;">' + esc(T('Здесь появятся сделки, где ты покупатель: найди оффер на Площадке, отметь сделку в его развороте — после подтверждения владельцем она появится в этом списке.')) + '</div>';
                return;
            }
            box.innerHTML = items.map(function (d) {
                var m = d.measured && (d.reach_24h || d.reach_48h)
                    ? ' · ~' + num(d.reach_24h || d.reach_48h) + ' ' + esc(T('показов'))
                    : ' · ' + esc(T('замер ожидается'));
                return '<div class="pl-whorow" data-act="deal-pick" data-link="' + linkId + '" data-deal="' + d.deal_id + '">' +
                    '<div class="pl-whoav"><i class="ti ti-receipt"></i></div>' +
                    '<div class="pl-whomid"><div class="pl-whonm">' + esc(d.channel) + '</div>' +
                    '<div class="pl-whosub">' + esc(T('сделка')) + ' №' + d.deal_id + m + '</div></div></div>';
            }).join('') +
            '<div class="pl-whorow" data-act="deal-pick" data-link="' + linkId + '" data-deal="">' +
                '<div class="pl-whoav"><i class="ti ti-link-off"></i></div>' +
                '<div class="pl-whomid"><div class="pl-whonm">' + esc(T('Отвязать сделку')) + '</div></div></div>';
        }).catch(function () {
            var box = document.getElementById('pl-deals');
            if (box) box.innerHTML = '<div class="pl-center">' + esc(T('Не загрузилось. Открой ещё раз.')) + '</div>';
        });
    }

    function fmtTime(iso) {
        try { var d = new Date(iso); return fmtDay(iso) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
        catch (e) { return ''; }
    }

    function dayKey(iso) {
        try {
            var d = new Date(iso);
            return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        } catch (e) { return ''; }
    }

    function daysChart(daily, linkId, selDay) {
        if (!daily || !daily.length) return '';
        var mx = 1;
        daily.forEach(function (b) { if (b.j > mx) mx = b.j; if (b.l > mx) mx = b.l; });
        var cols = daily.slice(-31).map(function (b) {
            var jh = b.j ? Math.max(3, Math.round(b.j / mx * 30)) : 0;
            var lh = b.l ? Math.max(3, Math.round(b.l / mx * 30)) : 0;
            return '<div class="pl-dcol tap' + (selDay === b.d ? ' sel' : '') + '" data-act="jday" data-id="' + linkId + '" data-day="' + b.d + '">' +
                '<div class="pl-dnum">' + (b.j || '') + '</div>' +
                '<div class="pl-dbar j" style="height:' + jh + 'px;"></div>' +
                '<div class="pl-dbar l" style="height:' + lh + 'px;"></div>' +
                '<div class="pl-dnum l2">' + (b.l || '') + '</div>' +
                '<div class="pl-dday">' + b.d.slice(8, 10) + '.' + b.d.slice(5, 7) + '</div></div>';
        }).join('');
        return '<div class="pl-fcap" style="margin-top:10px;">' + esc(T('Динамика по дням') + ' · ' + T('нажми на день')) + '</div>' +
            '<div class="pl-days">' + cols + '</div>' +
            '<div class="pl-qnote"><span style="color:#5DCAA5;">▮</span> ' + esc(T('вступления')) + ' · <span style="color:#ef4444;">▮</span> ' + esc(T('отписки')) + '</div>';
    }

    function statsSummary(stats, total) {
        if (!total || !stats) return '';
        var s = '<div class="pl-qnote"><span class="pl-prem">Premium</span>: ' + (stats.premium || 0) + ' ' + esc(T('из')) + ' ' + total + ' · ' + Math.round((stats.premium || 0) / total * 100) + '%</div>';
        var lk = stats.langs || [];
        if (lk.length) s += '<div class="pl-qnote">' + esc(T('Языки:')) + ' ' + lk.map(function (p) { return esc(p[0]) + ' ×' + p[1]; }).join(' · ') + '</div>';
        var yk = stats.years || [];
        if (yk.length) s += '<div class="pl-qnote">' + esc(T('Годы аккаунтов:')) + ' ' + yk.map(function (p) { return '<span class="pl-year">≈' + esc(String(p[0])) + '</span> ×' + p[1]; }).join(' · ') + '</div>';
        return s;
    }

    function whoRow(u) {
        var nm = u.first_name || (u.username ? '@' + u.username : ('ID ' + u.user_id));
        var bits = [];
        if (u.username) bits.push(esc('@' + u.username));
        bits.push(esc(fmtTime(u.ts)));
        if (u.acc_year) bits.push('<span class="pl-year">≈' + esc(String(u.acc_year)) + '</span>');
        if (u.premium) bits.push('<span class="pl-prem">Premium</span>');
        var sub = bits.join(' · ');
        var tags = '';
        if (u.left) tags += '<span class="pl-whotag left">' + esc(T('вышел')) + '</span>';
        else if (u.approx) tags += '<span class="pl-whotag late">≈ ' + esc(T('по клику')) + '</span>';
        else if (u.late) tags += '<span class="pl-whotag late">' + esc(T('поздний')) + '</span>';
        var open = u.username ? ' data-act="open-user" data-u="' + esc(u.username) + '"' : '';
        return '<div class="pl-whorow"' + open + '>' +
            '<div class="pl-whoav">' + esc(String(nm).charAt(0).toUpperCase()) + '</div>' +
            '<div class="pl-whomid"><div class="pl-whonm">' + esc(nm) + '</div>' +
            '<div class="pl-whosub">' + sub + (u.username ? '' : ' · ' + esc(T('профиль без @имени'))) + '</div></div>' + tags + '</div>';
    }

    function openWhoPanel(id) {
        var box = document.getElementById('pl-who-' + id);
        if (!box) return;
        if (!box.innerHTML) box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Загружаю...')) + '</div>';
        box.style.display = 'block';
        apiRequest('/api/v1/placements/links/' + id + '/joiners').then(function (r) {
            if (!r || !r.ok) { box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc((r && r.message) || T('Не загрузилось. Открой ещё раз.')) + '</div>'; return; }
            var q = r.quality || {};
            var total = q.total || 0;
            var nolink = r.nolink_items || [];
            var nolinkHtml = '';
            if (nolink.length) {
                nolinkHtml = '<div class="pl-nolink-hd">' + esc(T('Пришли сами в эти дни')) + ' · ' + nolink.length + ' <span style="font-size:9.5px;font-weight:600;color:#565b73;">' + esc(T('без ссылки')) + '</span></div>' +
                    '<div class="pl-qnote">' + esc(T('Зашли через @имя канала, из поиска или по пересланному посту — Telegram не сообщает их источник. Могут быть и от рекламы, и органикой.')) + '</div>' +
                    nolink.slice(0, 20).map(whoRow).join('');
            }
            if (!total) {
                box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Пока никто не вступил по этой ссылке')) + '</div>' + nolinkHtml;
                return;
            }
            var head = '';
            var ch = q.churn || {};
            if ((q.left || 0) > 0) {
                head += '<div class="pl-qnote">' + esc(T('Отписки по времени жизни:')) + ' ' +
                    (ch.h1 ? '&lt;1 ч — ' + ch.h1 + ' · ' : '') + (ch.d1 ? '&lt;1 дн — ' + ch.d1 + ' · ' : '') +
                    (ch.d7 ? '&lt;7 дн — ' + ch.d7 + ' · ' : '') + (ch.later ? esc(T('позже')) + ' — ' + ch.later : '') + '</div>';
            }
            var flags = [];
            if (q.fresh_2024) flags.push(esc(T('свежие аккаунты (2024+)')) + ': ' + q.fresh_2024);
            if (q.digit_names) flags.push(esc(T('юзернеймы с цифрами')) + ': ' + q.digit_names);
            if (q.no_username) flags.push(esc(T('без @имени')) + ': ' + q.no_username);
            if (flags.length) head += '<div class="pl-qnote">' + flags.join(' · ') + '</div>';
            head += statsSummary(r.stats, total) + daysChart(r.daily, id);
            var susp = (q.fresh_2024 || 0) + (q.digit_names || 0);
            if (q.total >= 10 && susp / q.total > 0.5) {
                head += '<div class="pl-qwarn">' + esc(T('Больше половины вступивших похожи на созданные недавно или шаблонные аккаунты — есть признаки недобросовестного трафика. Сверь список вручную перед оплатой следующего размещения.')) + '</div>';
            }
            box.innerHTML = head + nolinkHtml;
        }).catch(function () { box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Не загрузилось. Открой ещё раз.')) + '</div>'; });
    }

    var _j = null;
    function openJoinersSheet(id, day) {
        _j = { id: id, day: day || '', flt: 'all', q: '', off: 0, total: 0, busy: false };
        var ov = document.getElementById('pl-jov');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'pl-jov';
            ov.className = 'pl-jov';
            document.body.appendChild(ov);
            ov.addEventListener('click', function (e) {
                if (e.target === ov) { closeJoinersSheet(); return; }
                var el = e.target.closest ? e.target.closest('[data-act]') : null;
                if (!el) return;
                var act = el.getAttribute('data-act');
                if (act === 'jclose') { closeJoinersSheet(); return; }
                if (act === 'jalltime') { haptic('light'); _j.day = ''; _j.flt = 'all'; _j.off = 0; loadJ(true); return; }
                if (act === 'jday') { haptic('light'); _j.day = el.getAttribute('data-day'); _j.flt = 'all'; _j.off = 0; loadJ(true); return; }
                if (act === 'jflt') { haptic('light'); _j.flt = el.getAttribute('data-v'); _j.off = 0; loadJ(true); return; }
                if (act === 'jmore') { _j.off += 50; loadJ(false); return; }
                if (act === 'open-user') {
                    var uu = el.getAttribute('data-u');
                    if (!uu) return;
                    try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) { tg.openTelegramLink('https://t.me/' + uu); return; } } catch (e2) {}
                    try { window.open('https://t.me/' + uu, '_blank'); } catch (e3) {}
                    return;
                }
            });
        }
        ov.innerHTML = '<div class="pl-jsh">' +
            '<div class="pl-jt"><i class="ti ti-arrow-left pl-jback" data-act="jclose"></i>' + esc(T('Вступившие по ссылке')) + '</div>' +
            '<div class="pl-jc" id="pl-jc"></div>' +
            '<div class="pl-jdyn" id="pl-jdyn"></div>' +
            '<div class="pl-jchips" id="pl-jchips"></div>' +
            '<div class="pl-jsrch"><i class="ti ti-search"></i><input id="pl-jq" maxlength="64" placeholder="' + esc(T('Поиск по имени или @юзернейму')) + '"></div>' +
            '<div class="pl-jbody" id="pl-jbody"></div></div>';
        var inp = document.getElementById('pl-jq');
        var _qt = null;
        inp.addEventListener('input', function () {
            if (_qt) clearTimeout(_qt);
            _qt = setTimeout(function () {
                var v = inp.value.trim();
                if (v === _j.q) return;
                _j.q = v; _j.off = 0; loadJ(true);
            }, 350);
        });
        ov.classList.add('on');
        haptic('light');
        loadJ(true);
    }

    function closeJoinersSheet() {
        var ov = document.getElementById('pl-jov');
        if (ov) ov.classList.remove('on');
    }

    function fmtDayShort(d) { return d ? d.slice(8, 10) + '.' + d.slice(5, 7) : ''; }

    function loadJ(reset) {
        if (!_j || _j.busy) return;
        _j.busy = true;
        var body = document.getElementById('pl-jbody');
        if (reset && body) body.innerHTML = '<div class="pl-center" style="padding:14px 0;">' + esc(T('Загружаю...')) + '</div>';
        var url = '/api/v1/placements/links/' + _j.id + '/joiners/list?filter=' + encodeURIComponent(_j.flt) +
            '&q=' + encodeURIComponent(_j.q) + '&day=' + encodeURIComponent(_j.day) + '&offset=' + _j.off;
        apiRequest(url).then(function (r) {
            _j.busy = false;
            if (!r || !r.ok) { if (body) body.innerHTML = '<div class="pl-center" style="padding:14px 0;">' + esc((r && r.message) || T('Не загрузилось. Открой ещё раз.')) + '</div>'; return; }
            _j.total = r.total || 0;
            var c = r.counts || {};
            var hc = document.getElementById('pl-jc');
            if (hc) {
                hc.innerHTML = _j.day
                    ? '<b class="d">' + esc(fmtDayShort(_j.day)) + '</b> · <span class="g">' + esc(T('вступили')) + ' ' + num(c.joined || 0) + '</span> · <span class="r">' + esc(T('вышли')) + ' ' + num(c.left || 0) + '</span>' +
                      ' · <span class="pl-jreset" data-act="jalltime">' + esc(T('за всё время')) + ' ✕</span>'
                    : esc(T('всего')) + ' <b>' + num(c.all || 0) + '</b> · <span class="g">' + esc(T('остались')) + ' ' + num(c.stayed || 0) + '</span> · <span class="r">' + esc(T('вышли')) + ' ' + num(c.left || 0) + '</span>';
            }
            var dyn = document.getElementById('pl-jdyn');
            if (dyn && reset) {
                dyn.innerHTML = (r.daily && r.daily.length)
                    ? daysChart(r.daily, _j.id, _j.day) : '';
            }
            var chips = _j.day
                ? [['all', T('Все'), c.all], ['joined', T('Вступили'), c.joined], ['left', T('Вышли'), c.left]]
                : [['all', T('Все'), c.all], ['stayed', T('Остались'), c.stayed], ['left', T('Вышли'), c.left], ['premium', 'Premium', c.premium]];
            var chEl = document.getElementById('pl-jchips');
            if (chEl) {
                chEl.innerHTML = chips.map(function (p) {
                    return '<span class="pl-jchip' + (_j.flt === p[0] ? ' on' : '') + '" data-act="jflt" data-v="' + p[0] + '">' +
                        esc(p[1]) + ' · ' + num(p[2] || 0) + '</span>';
                }).join('');
            }
            var rows = (r.items || []).map(whoRow).join('');
            var shown = _j.off + (r.items || []).length;
            var more = shown < _j.total
                ? '<div class="pl-jmore" data-act="jmore">' + esc(T('Показать ещё')) + ' ' + num(Math.min(50, _j.total - shown)) + ' ↓</div>'
                : '';
            var foot = _j.total
                ? '<div class="pl-jfoot">' + esc(T('Показано')) + ' ' + num(shown) + ' ' + esc(T('из')) + ' ' + num(_j.total) + '</div>'
                : '<div class="pl-center" style="padding:14px 0;">' + esc(T('Ничего не найдено')) + '</div>';
            if (!body) return;
            if (reset) body.innerHTML = rows + more + foot;
            else {
                var oldMore = body.querySelector('.pl-jmore');
                var oldFoot = body.querySelector('.pl-jfoot');
                if (oldMore) oldMore.remove();
                if (oldFoot) oldFoot.remove();
                body.insertAdjacentHTML('beforeend', rows + more + foot);
            }
        }).catch(function () {
            _j.busy = false;
            if (body) body.innerHTML = '<div class="pl-center" style="padding:14px 0;">' + esc(T('Не загрузилось. Открой ещё раз.')) + '</div>';
        });
    }

    window.__openPlacementsCreate = function (uname) {
        window.__openPlacements();
        _prefillChan = uname || null;
    };

    window.__openPlacements = function () {
        _prefillChan = null;
        loading();
        apiRequest('/api/v1/channels/active?team=links').then(function (d) {
            _channels = (d && d.channels) ? d.channels : [];
            if (d && d.active_channel_id) _chId = d.active_channel_id;
            if (_chId == null && _channels.length) _chId = _channels[0].id;
            if (_chId == null) {
                var host = ensureScreen();
                host.innerHTML = head() + '<div class="pl-body"><div class="pl-empty"><i class="ti ti-broadcast-off"></i>' +
                    '<h3>' + esc(T('Сначала подключи канал')) + '</h3>' +
                    '<p>' + esc(T('Отслеживание работает для каналов, где бот — администратор. Подключи канал на главном экране.')) + '</p></div></div>';
                host.onclick = onClick;
                return;
            }
            load();
        }).catch(function () { toast(T('Не загрузилось. Открой ещё раз.')); });
    };
})();
