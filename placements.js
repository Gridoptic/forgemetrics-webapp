(function () {
    'use strict';

    var _channels = null, _chId = null, _items = [], _right = null, _busy = false, _pollTimer = null;
    var CLICK_BASE = 'https://fmtr.click';

    function T(s) { return (typeof window.t === 'function') ? window.t(s) : s; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} }
    function toast(m) { try { if (typeof showToast === 'function') return showToast(m); } catch (e) {} }
    function num(n) { try { return new Intl.NumberFormat('ru-RU').format(n); } catch (e) { return String(n); } }
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
            '.pl-new{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:13px;border-radius:13px;border:0;background:linear-gradient(145deg,#818cf8,#6366f1);color:#0b0c16;font-size:13.5px;font-weight:700;font-family:inherit;cursor:pointer;margin-bottom:14px;}',
            '.pl-card{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.09);border-radius:14px;padding:12px 13px;margin-bottom:9px;}',
            '.pl-r1{display:flex;align-items:center;gap:8px;}',
            '.pl-nm{font-size:13px;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.pl-tag{font-size:9.5px;font-weight:700;padding:3px 8px;border-radius:99px;white-space:nowrap;flex:0 0 auto;}',
            '.pl-tag.on{background:rgba(93,202,165,0.14);color:#5DCAA5;}',
            '.pl-tag.off{background:rgba(255,255,255,0.06);color:#8990a8;}',
            '.pl-meta{font-size:10.5px;color:#565b73;margin-top:2px;}',
            '.pl-guide{background:rgba(129,140,248,0.08);border:0.5px solid rgba(129,140,248,0.3);border-radius:13px;padding:11px 12px;margin-bottom:12px;}',
            '.pl-guide .gt{font-size:12px;font-weight:800;color:#a5b0ff;display:flex;justify-content:space-between;align-items:center;}',
            '.pl-guide .gh{font-size:10.5px;color:#565b73;font-weight:600;cursor:pointer;padding:4px 0 4px 12px;}',
            '.pl-gstep{display:flex;gap:9px;align-items:flex-start;margin-top:7px;}',
            '.pl-gstep b{display:inline-flex;width:18px;height:18px;border-radius:6px;background:rgba(129,140,248,0.25);color:#a5b0ff;font-size:10.5px;font-weight:800;align-items:center;justify-content:center;flex:0 0 auto;margin-top:1px;}',
            '.pl-gstep span{font-size:11.5px;color:#a9aec0;line-height:1.5;}',
            '.pl-glink{font-size:11px;color:#818cf8;font-weight:700;cursor:pointer;margin-bottom:10px;display:inline-block;padding:2px 0;}',
            '.pl-cmp{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.09);border-radius:11px;padding:9px 11px;margin-bottom:9px;font-size:10.5px;color:#a9aec0;line-height:1.55;}',
            '.pl-cmp b{color:#e8e8ed;}',
            '.pl-linkrow2{background:rgba(93,202,165,0.06);border:0.5px solid rgba(93,202,165,0.25);border-radius:10px;padding:8px 10px;margin-top:10px;}',
            '.pl-lcap{font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5DCAA5;opacity:0.85;margin-bottom:5px;}',
            '.pl-lval{display:flex;align-items:center;gap:8px;}',
            '.pl-lval code{font-size:11px;color:#5DCAA5;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,monospace;}',
            '.pl-fun{margin-top:11px;}',
            '.pl-fcap{font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#565b73;margin-bottom:6px;}',
            '.pl-frow2{display:flex;align-items:center;gap:8px;margin-top:5px;}',
            '.pl-flab{width:108px;flex:0 0 auto;font-size:10.5px;color:#a9aec0;}',
            '.pl-fbarw{flex:1;height:14px;border-radius:5px;background:rgba(255,255,255,0.04);overflow:hidden;}',
            '.pl-fbar{height:100%;border-radius:5px;background:linear-gradient(90deg,rgba(129,140,248,0.85),rgba(129,140,248,0.5));}',
            '.pl-fbar.g{background:linear-gradient(90deg,rgba(93,202,165,0.9),rgba(93,202,165,0.5));}',
            '.pl-fnum{width:56px;flex:0 0 auto;text-align:right;font-size:11.5px;font-weight:800;font-variant-numeric:tabular-nums;}',
            '.pl-fconv{margin:1px 0 0 116px;font-size:9px;color:#565b73;}',
            '.pl-fx{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;padding-top:9px;border-top:0.5px solid rgba(255,255,255,0.05);}',
            '.pl-fxi{flex:1;min-width:0;}',
            '@media (max-width:379px){.pl-fxi{flex:1 1 40%;}}',
            '.pl-fxk{font-size:8px;font-weight:700;color:#565b73;letter-spacing:0.05em;text-transform:uppercase;line-height:1.35;}',
            '.pl-fxv{font-size:13.5px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums;}',
            '.pl-fxv small{font-size:9px;color:#8990a8;font-weight:600;}',
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
            '.pl-sheet{position:fixed;bottom:0;left:50%;transform:translate(-50%,105%);width:100%;max-width:520px;z-index:9310;background:rgba(20,24,40,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:20px 20px 0 0;border:0.5px solid rgba(255,255,255,0.1);border-bottom:none;padding:10px 16px 24px;transition:transform 240ms cubic-bezier(0.3,0.9,0.3,1);max-height:84dvh;overflow-y:auto;overscroll-behavior:contain;}',
            '.pl-sheet.on{transform:translate(-50%,0);}',
            '.pl-grip{width:38px;height:4px;border-radius:4px;background:rgba(255,255,255,0.18);margin:2px auto 12px;}',
            '.pl-flabel{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#565b73;margin:12px 0 6px;}',
            '.pl-inp{width:100%;box-sizing:border-box;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:11px;padding:11px 12px;font-size:13px;color:#e8e8ed;font-family:inherit;outline:none;}',
            '.pl-ltopt{border:0.5px solid rgba(255,255,255,0.12);border-radius:11px;padding:10px 12px;margin-top:8px;cursor:pointer;}',
            '.pl-ltopt b{display:block;font-size:12px;font-weight:700;color:#e8e8ed;}',
            '.pl-ltopt span{display:block;font-size:10.5px;color:#8990a8;line-height:1.45;margin-top:2px;}',
            '.pl-ltopt.sel{border-color:rgba(129,140,248,0.7);background:rgba(129,140,248,0.08);}',
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
            '.pl-dcol{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:22px;flex:0 0 auto;}',
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
            if (JSON.stringify(items) === JSON.stringify(_items) && r.right === _right) return;
            _items = items; _right = r.right;
            var openIds = [];
            var boxes = document.querySelectorAll('#pl-screen .pl-who');
            for (var i = 0; i < boxes.length; i++) {
                if (boxes[i].style.display !== 'none') openIds.push(boxes[i].id.replace('pl-who-', ''));
            }
            var body = document.querySelector('#pl-screen .pl-body');
            var st = body ? body.scrollTop : 0;
            render();
            body = document.querySelector('#pl-screen .pl-body');
            if (body) body.scrollTop = st;
            openIds.forEach(function (id) { openWhoPanel(parseInt(id, 10)); });
        }).catch(function () {});
    }

    function close() {
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
            var initial = (String(title).trim().charAt(0) || 'K').toUpperCase();
            h += '<div style="padding:0 16px;">' +
                '<button class="pw-chansel" data-act="chpick" style="margin-bottom:8px;">' +
                '<div class="pw-chav">' + esc(initial) + '</div>' +
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
                return '<div class="pl-whorow" data-act="chpick-go" data-ch="' + c.id + '">' +
                    '<div class="pl-whoav">' + esc(String(nm).charAt(0).toUpperCase()) + '</div>' +
                    '<div class="pl-whomid"><div class="pl-whonm">' + esc(nm) + '</div>' +
                    (un ? '<div class="pl-whosub">@' + esc(un) + '</div>' : '') + '</div>' +
                    (c.id === _chId ? '<span class="pl-whotag late">✓</span>' : '') + '</div>';
            }).join('') + '</div>';
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
            '<input class="pl-inp" id="pl-imp" type="number" inputmode="numeric" min="0" value="' + (l && l.impressions_manual ? l.impressions_manual : '') + '">' +
            '<div class="pl-note">' + esc(T('Оставь поле пустым, чтобы убрать значение.')) + '</div>' +
            '<button class="pl-new" style="margin:13px 0 0;" data-act="imp-save" data-id="' + id + '">' + esc(T('Сохранить')) + '</button>';
        bg.classList.add('on');
        sh.classList.add('on');
    }

    function permCard() {
        return '<div class="pl-perm"><div class="t"><i class="ti ti-alert-triangle"></i> ' + esc(T('Нужно право «Пригласительные ссылки»')) + '</div>' +
            '<div class="d">' + esc(T('Чтобы создавать ссылки, боту @ForgeMetricsBot не хватает одного права администратора. Это делается один раз:')) + '</div>' +
            '<ol><li>' + esc(T('Открой свой канал → Управление каналом')) + '</li>' +
            '<li>' + esc(T('Администраторы → @ForgeMetricsBot')) + '</li>' +
            '<li>' + esc(T('Включи «Пригласительные ссылки» и сохрани')) + '</li></ol>' +
            '<button class="pl-ghost" data-act="recheck"><i class="ti ti-refresh"></i> ' + esc(T('Проверить право')) + '</button></div>';
    }

    function linkCard(l) {
        var active = l.status === 'active';
        var st = active
            ? '<span class="pl-tag on">' + esc(T('работает')) + '</span>'
            : '<span class="pl-tag off">' + esc(T('отключена')) + '</span>';
        var meta = [];
        if (l.created_at) meta.push(T('создана') + ' ' + fmtDay(l.created_at));
        if (l.price_rub) meta.push(T('размещение за') + ' ' + num(l.price_rub) + ' ₽');
        if (active && l.attribution_until) meta.push(T('вступления считаем до') + ' ' + fmtDay(l.attribution_until));
        var postUrl = l.click_code ? (CLICK_BASE + '/r/' + l.click_code) : l.invite_link;
        var rows = [];
        if (l.impressions) rows.push({ lab: T('Увидели пост'), v: l.impressions, cap: null });
        if (l.clicks != null) rows.push({ lab: T('Перешли по ссылке'), v: l.clicks, cap: rows.length ? T('от увидевших') : null });
        rows.push({ lab: T('Подписались'), v: l.joined || 0,
                    cap: rows.length ? (l.clicks != null ? T('от перешедших') : T('от увидевших')) : null });
        rows.push({ lab: T('Сейчас в канале'), v: l.retained_now || 0, g: true, cap: T('остаются') });
        var maxV = 0;
        rows.forEach(function (r) { if (r.v > maxV) maxV = r.v; });
        var fun = '<div class="pl-fun"><div class="pl-fcap">' + esc(T('Воронка размещения')) + '</div>';
        rows.forEach(function (r, i) {
            if (i > 0 && rows[i - 1].v > 0 && r.cap) {
                var pct = Math.round(r.v / rows[i - 1].v * 1000) / 10;
                if (pct <= 100) fun += '<div class="pl-fconv">↓ ' + pct + '% ' + esc(r.cap) + '</div>';
            }
            var w = maxV > 0 ? Math.max(3, Math.round(r.v / maxV * 100)) : 3;
            fun += '<div class="pl-frow2"><div class="pl-flab">' + esc(r.lab) + '</div>' +
                '<div class="pl-fbarw"><div class="pl-fbar' + (r.g ? ' g' : '') + '" style="width:' + w + '%;"></div></div>' +
                '<div class="pl-fnum">' + num(r.v) + '</div></div>';
        });
        var badImp = l.impressions != null && l.clicks != null && l.impressions < l.clicks;
        var fx = [];
        if (l.impressions && l.price_rub && !badImp) fx.push({ k: 'CPM · ' + T('цена 1000 показов'), v: num(Math.round(l.price_rub / l.impressions * 1000)) + ' ₽' });
        if (l.clicks && l.impressions && !badImp) fx.push({ k: 'CTR · ' + T('кликабельность'), v: (Math.round(l.clicks / l.impressions * 1000) / 10) + '%' });
        if (l.clicks && l.price_rub) fx.push({ k: 'CPC · ' + T('цена перехода'), v: num(Math.round(l.price_rub / l.clicks)) + ' ₽' });
        if (l.cpf != null) fx.push({ k: 'CPF · ' + T('цена подписчика'), v: num(l.cpf) + ' ₽' });
        if (l.cpf_retained != null) fx.push({ k: T('цена оставшегося'), v: num(l.cpf_retained) + ' ₽' });
        if (l.r7) fx.push({ k: T('Удержание 7 дней'), v: num(l.r7.kept) + ' <small>' + esc(T('из')) + ' ' + num(l.r7.of) + '</small>' });
        if (fx.length) {
            fun += '<div class="pl-fx">' + fx.map(function (x) {
                return '<div class="pl-fxi"><div class="pl-fxk">' + esc(x.k) + '</div><div class="pl-fxv">' + x.v + '</div></div>';
            }).join('') + '</div>';
        }
        fun += '</div>';

        var lateNote = (l.late_joined > 0)
            ? '<div class="pl-note">+' + num(l.late_joined) + ' ' + esc(T('вступлений после окна атрибуции — учтены отдельно, в CPF не входят')) + '</div>'
            : '';
        if (l.joined_approx > 0) {
            lateNote += '<div class="pl-note">≈' + num(l.joined_approx) + ' ' + esc(T('засчитаны по времени — вступили в течение 15 минут после перехода по ссылке')) + '</div>';
        }
        if (badImp) {
            lateNote += '<div class="pl-qwarn">' + esc(T('Показы меньше числа переходов — похоже на опечатку. Проверь значение в «Показы поста», CPM и CTR пока не считаются.')) + '</div>';
        }
        var dealLabel = l.deal_id
            ? T('Показы поста привязаны к сделке · изменить')
            : T('Показы поста — из сделки Площадки, если размещение куплено там');
        var impBtn = !l.deal_id
            ? '<button class="pl-whobtn" data-act="imp" data-id="' + l.id + '" style="color:#8990a8;text-align:left;"><i class="ti ti-eye"></i> ' +
              esc(l.impressions_manual
                  ? (T('Показы поста') + ': ' + num(l.impressions_manual) + ' · ' + T('изменить'))
                  : T('Указать показы поста — если купил не через Площадку')) + '</button>'
            : '';
        return '<div class="pl-card" data-id="' + l.id + '">' +
            '<div class="pl-r1"><div class="pl-nm">' + esc(l.name) + '</div>' + st + '</div>' +
            '<div class="pl-meta">' + esc(meta.join(' · ')) + '</div>' +
            (active
                ? '<div class="pl-linkrow2"><div class="pl-lcap">' + esc(T('Эта ссылка — в рекламный пост')) + '</div>' +
                  '<div class="pl-lval"><code>' + esc(postUrl) + '</code>' +
                  '<button class="pl-copy" data-act="copy" data-link="' + esc(postUrl) + '">' + esc(T('Скопировать')) + '</button></div></div>'
                : '') +
            fun + lateNote +
            '<button class="pl-whobtn" data-act="who" data-id="' + l.id + '"><i class="ti ti-users"></i> ' + esc(T('Кто вступил · качество трафика')) + '</button>' +
            '<button class="pl-whobtn" data-act="deal" data-id="' + l.id + '" style="color:#8990a8;text-align:left;"><i class="ti ti-link"></i> ' + esc(dealLabel) + '</button>' + impBtn +
            '<div class="pl-who" id="pl-who-' + l.id + '" style="display:none;"></div>' +
            (active
                ? '<div class="pl-actrow"><button class="pl-revoke" data-act="revoke" data-id="' + l.id + '">' + esc(T('Отключить ссылку')) + '</button>' +
                  '<button class="pl-revoke danger" data-act="del" data-st="active" data-id="' + l.id + '">' + esc(T('Удалить')) + '</button></div>'
                : '<button class="pl-revoke" data-act="del" data-id="' + l.id + '">' + esc(T('Удалить из списка')) + '</button>') +
            '</div>';
    }

    function render() {
        var host = ensureScreen();
        var body;
        if (_right === false) {
            body = permCard();
        } else {
            var guideHidden = false;
            try { guideHidden = localStorage.getItem('pl_guide_hidden') === '1'; } catch (e) {}
            body = guideHidden
                ? '<div class="pl-glink" data-act="guide-show">' + esc(T('Как это работает')) + ' ↓</div>'
                : '<div class="pl-guide"><div class="gt"><span>' + esc(T('Как это работает')) + '</span><span class="gh" data-act="guide-hide">' + esc(T('Скрыть')) + '</span></div>' +
                  '<div class="pl-gstep"><b>1</b><span>' + esc(T('Создай ссылку под конкретное размещение — у каждой рекламы своя ссылка')) + '</span></div>' +
                  '<div class="pl-gstep"><b>2</b><span>' + esc(T('Вставь её в рекламный пост вместо обычной ссылки на канал')) + '</span></div>' +
                  '<div class="pl-gstep"><b>3</b><span>' + esc(T('Смотри здесь, сколько людей пришло, сколько осталось и во сколько обошёлся подписчик')) + '</span></div></div>';
            body += '<button class="pl-new" data-act="new"><i class="ti ti-plus"></i> ' + esc(T('Новая ссылка под размещение')) + '</button>';
            var withCpf = _items.filter(function (x) { return x.cpf != null; });
            if (withCpf.length >= 2) {
                var best = withCpf[0], worst = withCpf[0];
                withCpf.forEach(function (x) { if (x.cpf < best.cpf) best = x; if (x.cpf > worst.cpf) worst = x; });
                if (best.id !== worst.id) {
                    body += '<div class="pl-cmp">🏆 ' + esc(T('Лучшая по CPF')) + ': <b>' + esc(best.name) + '</b> — ' + num(best.cpf) + ' ₽ · ' +
                        esc(T('худшая')) + ': <b>' + esc(worst.name) + '</b> — ' + num(worst.cpf) + ' ₽</div>';
                }
            }
            if (!_items.length) {
                body += '<div class="pl-empty"><i class="ti ti-link"></i><h3>' + esc(T('Ссылок пока нет')) + '</h3>' +
                    '<p>' + esc(T('Создай ссылку под размещение и вставь её в рекламный пост вместо @имени канала — увидишь, сколько подписчиков принесла реклама.')) + '</p></div>';
            } else {
                body += _items.map(linkCard).join('');
                body += '<div class="pl-note">' + esc(T('Счётчики обновляются сами каждые 10 секунд. «Осталось» — сколько вступивших сейчас в канале.')) + '</div>';
            }
        }
        host.innerHTML = head() + '<div class="pl-body">' + body + '</div>' +
            '<div class="pl-sheetbg" id="pl-sheetbg"></div>' +
            '<div class="pl-sheet" id="pl-sheet"></div>';
        host.onclick = onClick;
        var bg = document.getElementById('pl-sheetbg');
        if (bg) bg.addEventListener('click', closeSheet);
    }

    function loading() {
        var host = ensureScreen();
        host.innerHTML = head() + '<div class="pl-body"><div class="pl-spin"></div><div class="pl-center">' + esc(T('Загружаю...')) + '</div></div>';
    }

    function load() {
        loading();
        apiRequest('/api/v1/placements/links?channel_id=' + _chId).then(function (r) {
            if (r && r.ok) { _items = r.items || []; _right = r.right; }
            else { _items = []; _right = null; if (r && r.message) toast(r.message); }
            render();
        }).catch(function () { _items = []; _right = null; render(); toast(T('Не загрузилось. Открой ещё раз.')); });
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
            '<div class="pl-flabel">' + esc(T('Название — где размещаешься')) + '</div>' +
            '<input class="pl-inp" id="pl-name" maxlength="80" placeholder="' + esc(T('Реклама у @канал')) + '" value="">' +
            '<div class="pl-flabel">' + esc(T('Цена размещения, ₽ — для расчёта CPF')) + '</div>' +
            '<input class="pl-inp" id="pl-price" type="number" inputmode="numeric" min="0" placeholder="' + esc(T('не обязательно')) + '">' +
            '<div class="pl-flabel">' + esc(T('Тип ссылки')) + '</div>' +
            '<div class="pl-ltopt sel" data-act="ltype"><b>' + esc(T('Прямая ссылка Telegram')) + '</b>' +
            '<span>' + esc(T('Привычный t.me — считает подписавшихся и качество трафика.')) + '</span></div>' +
            '<div class="pl-ltopt" data-act="ltype" data-track="1"><b>' + esc(T('Ссылка с учётом переходов')) + '</b>' +
            '<span>' + esc(T('Считает ещё и клики: добавятся CTR и CPC — видно, где теряются люди между показом и подпиской.')) + '</span></div>' +
            '<div class="pl-note">' + esc(T('Читатель нажимает по ссылке «Подать заявку» — бот одобряет её мгновенно, задержка меньше секунды. Окно атрибуции — 7 дней: вступления позже учитываются отдельно и в CPF не входят. Ссылку можно отозвать в любой момент.')) + '</div>' +
            '<button class="pl-new" style="margin:13px 0 0;" data-act="create">' + esc(T('Создать ссылку')) + '</button>';
        bg.classList.add('on');
        sh.classList.add('on');
        var inp = document.getElementById('pl-name');
        if (inp) setTimeout(function () { try { inp.focus(); } catch (e) {} }, 250);
    }

    function doCreate() {
        if (_busy) return;
        var name = (document.getElementById('pl-name') || {}).value || '';
        var price = (document.getElementById('pl-price') || {}).value || '';
        name = name.trim();
        if (!name) { toast(T('Укажи название размещения')); return; }
        var selOpt = document.querySelector('#pl-sheet .pl-ltopt.sel');
        var track = !!(selOpt && selOpt.getAttribute('data-track'));
        _busy = true;
        apiRequest('/api/v1/placements/links', {
            method: 'POST',
            body: JSON.stringify({ channel_id: _chId, name: name, price_rub: price ? parseInt(price, 10) : null, track_clicks: track })
        }).then(function (r) {
            _busy = false;
            if (r && r.ok) {
                haptic('medium');
                closeSheet();
                load();
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

    function onClick(e) {
        var b = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!b) return;
        var act = b.getAttribute('data-act');
        if (act === 'close') { close(); return; }
        if (act === 'guide-hide') { try { localStorage.setItem('pl_guide_hidden', '1'); } catch (e2) {} render(); return; }
        if (act === 'guide-show') { try { localStorage.removeItem('pl_guide_hidden'); } catch (e2) {} render(); return; }
        if (act === 'new') { haptic('light'); openCreateSheet(); return; }
        if (act === 'chpick') { haptic('light'); openChannelSheet(); return; }
        if (act === 'chpick-go') {
            var nch = parseInt(b.getAttribute('data-ch'), 10);
            closeSheet();
            if (nch && nch !== _chId) { _chId = nch; load(); }
            return;
        }
        if (act === 'imp') { haptic('light'); openImpSheet(parseInt(b.getAttribute('data-id'), 10)); return; }
        if (act === 'imp-save') {
            var iid = parseInt(b.getAttribute('data-id'), 10);
            var iv = ((document.getElementById('pl-imp') || {}).value || '').trim();
            apiRequest('/api/v1/placements/links/' + iid + '/impressions', {
                method: 'POST', body: JSON.stringify({ impressions: iv ? parseInt(iv, 10) : null })
            }).then(function (r) {
                if (r && r.ok) { haptic('medium'); closeSheet(); load(); toast(T('Показы сохранены — CPM и CTR посчитаны')); }
                else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
            }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
            return;
        }
        if (act === 'csv') {
            var cid = parseInt(b.getAttribute('data-id'), 10);
            haptic('light');
            apiRequest('/api/v1/placements/links/' + cid + '/export', { method: 'POST', body: '{}' })
                .then(function (r) {
                    if (r && r.ok) toast(T('Файл отправлен ботом в личные сообщения'));
                    else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
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
        if (act === 'recheck') { haptic('light'); load(); return; }
        if (act === 'who') { toggleWho(parseInt(b.getAttribute('data-id'), 10)); return; }
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
                box.innerHTML = '<div class="pl-center" style="padding:8px 0;">' + esc(T('Подтверждённых покупок на Площадке пока нет')) + '</div>';
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

    function daysChart(items) {
        var buckets = {};
        items.forEach(function (u) {
            if (u.ts) {
                var d = u.ts.slice(0, 10);
                (buckets[d] = buckets[d] || { j: 0, l: 0 }).j++;
            }
            if (u.left_ts) {
                var d2 = u.left_ts.slice(0, 10);
                (buckets[d2] = buckets[d2] || { j: 0, l: 0 }).l++;
            }
        });
        var days = Object.keys(buckets).sort();
        if (!days.length) return '';
        var out = [];
        var cur = new Date(days[0] + 'T00:00:00Z');
        var end = new Date(days[days.length - 1] + 'T00:00:00Z');
        var guard = 0;
        while (cur <= end && guard < 31) {
            var key = cur.toISOString().slice(0, 10);
            out.push({ d: key, j: (buckets[key] || {}).j || 0, l: (buckets[key] || {}).l || 0 });
            cur.setUTCDate(cur.getUTCDate() + 1);
            guard++;
        }
        var mx = 1;
        out.forEach(function (b) { if (b.j > mx) mx = b.j; if (b.l > mx) mx = b.l; });
        var cols = out.map(function (b) {
            var jh = b.j ? Math.max(3, Math.round(b.j / mx * 30)) : 0;
            var lh = b.l ? Math.max(3, Math.round(b.l / mx * 30)) : 0;
            return '<div class="pl-dcol"><div class="pl-dnum">' + (b.j || '') + '</div>' +
                '<div class="pl-dbar j" style="height:' + jh + 'px;"></div>' +
                '<div class="pl-dbar l" style="height:' + lh + 'px;"></div>' +
                '<div class="pl-dnum l2">' + (b.l || '') + '</div>' +
                '<div class="pl-dday">' + b.d.slice(8, 10) + '.' + b.d.slice(5, 7) + '</div></div>';
        }).join('');
        return '<div class="pl-fcap" style="margin-top:10px;">' + esc(T('Динамика по дням')) + '</div>' +
            '<div class="pl-days">' + cols + '</div>' +
            '<div class="pl-qnote"><span style="color:#5DCAA5;">▮</span> ' + esc(T('вступления')) + ' · <span style="color:#ef4444;">▮</span> ' + esc(T('отписки')) + '</div>';
    }

    function statsSummary(items) {
        var total = items.length;
        if (!total) return '';
        var prem = 0, langs = {}, years = {};
        items.forEach(function (u) {
            if (u.premium) prem++;
            if (u.lang) langs[u.lang] = (langs[u.lang] || 0) + 1;
            if (u.acc_year) years[u.acc_year] = (years[u.acc_year] || 0) + 1;
        });
        var s = '<div class="pl-qnote"><span class="pl-prem">Premium</span>: ' + prem + ' ' + esc(T('из')) + ' ' + total + ' · ' + Math.round(prem / total * 100) + '%</div>';
        var lk = Object.keys(langs).sort(function (a, b) { return langs[b] - langs[a]; }).slice(0, 4);
        if (lk.length) s += '<div class="pl-qnote">' + esc(T('Языки:')) + ' ' + lk.map(function (k) { return esc(k) + ' ×' + langs[k]; }).join(' · ') + '</div>';
        var yk = Object.keys(years).sort();
        if (yk.length) s += '<div class="pl-qnote">' + esc(T('Годы аккаунтов:')) + ' ' + yk.map(function (k) { return '<span class="pl-year">≈' + esc(k) + '</span> ×' + years[k]; }).join(' · ') + '</div>';
        return s;
    }

    function toggleWho(id) {
        var box = document.getElementById('pl-who-' + id);
        if (!box) return;
        if (box.style.display !== 'none') { box.style.display = 'none'; return; }
        box.style.display = 'block';
        box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Загружаю...')) + '</div>';
        haptic('light');
        openWhoPanel(id);
    }

    function openWhoPanel(id) {
        var box = document.getElementById('pl-who-' + id);
        if (!box) return;
        box.style.display = 'block';
        apiRequest('/api/v1/placements/links/' + id + '/joiners').then(function (r) {
            if (!r || !r.ok) { box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc((r && r.message) || T('Не загрузилось. Открой ещё раз.')) + '</div>'; return; }
            var items = r.items || [];
            var nolink = r.nolink_items || [];
            if (!items.length && !nolink.length) { box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Пока никто не вступил по этой ссылке')) + '</div>'; return; }
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
            var nolinkHtml = '';
            if (nolink.length) {
                nolinkHtml = '<div class="pl-nolink-hd">' + esc(T('Пришли сами в эти дни')) + ' · ' + nolink.length + ' <span style="font-size:9.5px;font-weight:600;color:#565b73;">' + esc(T('без ссылки')) + '</span></div>' +
                    '<div class="pl-qnote">' + esc(T('Зашли через @имя канала, из поиска или по пересланному посту — Telegram не сообщает их источник. Могут быть и от рекламы, и органикой.')) + '</div>' +
                    nolink.map(whoRow).join('');
            }
            var csvBtn = '<button class="pl-whobtn" data-act="csv" data-id="' + id + '" style="color:#8990a8;"><i class="ti ti-download"></i> ' +
                esc(T('Выгрузить список — бот пришлёт CSV-файл')) + '</button>';
            if (!items.length) {
                box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Пока никто не вступил по этой ссылке')) + '</div>' + nolinkHtml + (nolink.length ? csvBtn : '');
                return;
            }
            var q = r.quality || {};
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
            head += statsSummary(items) + daysChart(items);
            var susp = (q.fresh_2024 || 0) + (q.digit_names || 0);
            if (q.total >= 10 && susp / q.total > 0.5) {
                head += '<div class="pl-qwarn">' + esc(T('Больше половины вступивших похожи на созданные недавно или шаблонные аккаунты — есть признаки недобросовестного трафика. Сверь список вручную перед оплатой следующего размещения.')) + '</div>';
            }
            box.innerHTML = head + items.map(whoRow).join('') + nolinkHtml + csvBtn;
        }).catch(function () { box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Не загрузилось. Открой ещё раз.')) + '</div>'; });
    }

    window.__openPlacements = function () {
        loading();
        apiRequest('/api/v1/channels/active').then(function (d) {
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
