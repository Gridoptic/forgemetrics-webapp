(function () {
    'use strict';

    var _channels = null, _chId = null, _items = [], _right = null, _busy = false;

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
            '.pl-screen.on{display:flex;}',
            '.pl-head{display:flex;align-items:center;gap:10px;padding:14px 16px 8px;flex:0 0 auto;}',
            '.pl-back{width:38px;height:38px;border-radius:11px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#c9cede;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;}',
            '.pl-ht{font-size:16px;font-weight:800;}',
            '.pl-hs{font-size:11px;color:#8990a8;padding:0 16px 10px;}',
            '.pl-body{flex:1;overflow-y:auto;padding:4px 16px 90px;}',
            '.pl-new{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:13px;border-radius:13px;border:0;background:linear-gradient(145deg,#818cf8,#6366f1);color:#0b0c16;font-size:13.5px;font-weight:700;font-family:inherit;cursor:pointer;margin-bottom:14px;}',
            '.pl-card{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.09);border-radius:14px;padding:12px 13px;margin-bottom:9px;}',
            '.pl-r1{display:flex;align-items:center;gap:8px;}',
            '.pl-nm{font-size:13px;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.pl-tag{font-size:9.5px;font-weight:700;padding:3px 8px;border-radius:99px;white-space:nowrap;flex:0 0 auto;}',
            '.pl-tag.on{background:rgba(93,202,165,0.14);color:#5DCAA5;}',
            '.pl-tag.off{background:rgba(255,255,255,0.06);color:#8990a8;}',
            '.pl-meta{font-size:10.5px;color:#565b73;margin-top:2px;}',
            '.pl-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.08);border-radius:11px;overflow:hidden;margin-top:10px;}',
            '.pl-st{background:#10141f;padding:8px 9px;min-width:0;}',
            '.pl-st .k{font-size:8.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#565b73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.pl-st .v{font-size:15px;font-weight:800;margin-top:2px;font-variant-numeric:tabular-nums;}',
            '.pl-linkrow{display:flex;align-items:center;gap:8px;background:rgba(93,202,165,0.06);border:0.5px solid rgba(93,202,165,0.25);border-radius:10px;padding:8px 10px;margin-top:10px;}',
            '.pl-linkrow code{font-size:11px;color:#5DCAA5;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,monospace;}',
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
            '.pl-sheetbg{position:fixed;inset:0;z-index:9300;background:rgba(5,7,14,0.6);display:none;}',
            '.pl-sheetbg.on{display:block;}',
            '.pl-sheet{position:fixed;bottom:0;left:50%;transform:translate(-50%,105%);width:100%;max-width:520px;z-index:9310;background:rgba(20,24,40,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:20px 20px 0 0;border:0.5px solid rgba(255,255,255,0.1);border-bottom:none;padding:10px 16px 24px;transition:transform 240ms cubic-bezier(0.3,0.9,0.3,1);max-height:84dvh;overflow-y:auto;}',
            '.pl-sheet.on{transform:translate(-50%,0);}',
            '.pl-grip{width:38px;height:4px;border-radius:4px;background:rgba(255,255,255,0.18);margin:2px auto 12px;}',
            '.pl-flabel{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#565b73;margin:12px 0 6px;}',
            '.pl-inp{width:100%;box-sizing:border-box;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:11px;padding:11px 12px;font-size:13px;color:#e8e8ed;font-family:inherit;outline:none;}',
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
            '.pl-whotag{font-size:8.5px;font-weight:700;padding:2px 7px;border-radius:99px;flex:0 0 auto;}',
            '.pl-whotag.left{background:rgba(239,68,68,0.13);color:#ef4444;}',
            '.pl-whotag.late{background:rgba(245,191,79,0.13);color:#f5bf4f;}',
            '.pl-whobtn{border:0;background:transparent;color:#818cf8;font-size:10.5px;font-weight:700;font-family:inherit;cursor:pointer;padding:8px 4px 2px;display:flex;align-items:center;gap:5px;}',
            '.pl-funnel{background:rgba(129,140,248,0.06);border:0.5px solid rgba(129,140,248,0.22);border-radius:10px;padding:9px 11px;margin:6px 0 4px;}',
            '.pl-fr{font-size:11.5px;color:#a9aec0;padding:2px 0;}',
            '.pl-fr b{color:#e8e8ed;font-variant-numeric:tabular-nums;}',
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
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.onClick(close); tg.BackButton.show(); } } catch (e) {}
        return host;
    }

    function close() {
        var host = document.getElementById('pl-screen');
        if (host) host.classList.remove('on');
        closeSheet();
        try { if (typeof tg !== 'undefined' && tg && tg.BackButton) { tg.BackButton.offClick(close); tg.BackButton.hide(); } } catch (e) {}
    }

    function curChannel() {
        for (var i = 0; i < (_channels || []).length; i++) if (_channels[i].id === _chId) return _channels[i];
        return null;
    }

    function head() {
        var ch = curChannel();
        return '<div class="pl-head"><button class="pl-back" data-act="close"><i class="ti ti-arrow-left"></i></button>' +
            '<div class="pl-ht">' + esc(T('Отслеживание размещений')) + '</div></div>' +
            '<div class="pl-hs">' + (ch ? esc(ch.title || ('@' + ch.username)) + (ch.username ? ' · @' + esc(ch.username) : '') : '') + '</div>';
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
        var st = l.status === 'active'
            ? '<span class="pl-tag on">' + esc(T('активна')) + '</span>'
            : '<span class="pl-tag off">' + esc(T('отозвана')) + '</span>';
        var meta = [];
        if (l.created_at) meta.push(T('создана') + ' ' + fmtDay(l.created_at));
        if (l.price_rub) meta.push(T('размещение за') + ' ' + num(l.price_rub) + ' ₽');
        if (l.status === 'active' && l.attribution_until) meta.push(T('окно атрибуции до') + ' ' + fmtDay(l.attribution_until));
        var cpf = (l.cpf != null) ? num(l.cpf) + ' ₽' : '—';
        var joined = (l.joined != null) ? num(l.joined) : '—';
        var ret = (l.retained_now != null && l.joined > 0)
            ? num(l.retained_now) + ' <small style="font-size:9px;color:#8990a8;">' + Math.round(l.retained_now / l.joined * 100) + '%</small>'
            : '—';
        var lateNote = (l.late_joined > 0)
            ? '<div class="pl-note">+' + num(l.late_joined) + ' ' + esc(T('вступлений после окна атрибуции — учтены отдельно, в CPF не входят')) + '</div>'
            : '';
        return '<div class="pl-card" data-id="' + l.id + '">' +
            '<div class="pl-r1"><div class="pl-nm">' + esc(l.name) + '</div>' + st + '</div>' +
            '<div class="pl-meta">' + esc(meta.join(' · ')) + '</div>' +
            '<div class="pl-stats">' +
            '<div class="pl-st"><div class="k">' + esc(T('Вступило')) + '</div><div class="v">' + joined + '</div></div>' +
            '<div class="pl-st"><div class="k">' + esc(T('Осталось')) + '</div><div class="v">' + ret + '</div></div>' +
            '<div class="pl-st"><div class="k">CPF</div><div class="v">' + cpf + '</div></div></div>' + lateNote +
            '<button class="pl-whobtn" data-act="who" data-id="' + l.id + '"><i class="ti ti-users"></i> ' + esc(T('Подробная статистика')) + '</button>' +
            '<button class="pl-whobtn" data-act="deal" data-id="' + l.id + '" style="color:#8990a8;"><i class="ti ti-link"></i> ' + esc(T('Связать со сделкой Площадки')) + '</button>' +
            '<div class="pl-who" id="pl-who-' + l.id + '" style="display:none;"></div>' +
            (l.status === 'active'
                ? '<div class="pl-linkrow"><code>' + esc(l.invite_link) + '</code>' +
                  '<button class="pl-copy" data-act="copy" data-link="' + esc(l.invite_link) + '">' + esc(T('Скопировать')) + '</button></div>' +
                  '<div class="pl-actrow"><button class="pl-revoke" data-act="revoke" data-id="' + l.id + '">' + esc(T('Отозвать ссылку')) + '</button>' +
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
            body = '<button class="pl-new" data-act="new"><i class="ti ti-plus"></i> ' + esc(T('Новая ссылка под размещение')) + '</button>';
            if (!_items.length) {
                body += '<div class="pl-empty"><i class="ti ti-link"></i><h3>' + esc(T('Ссылок пока нет')) + '</h3>' +
                    '<p>' + esc(T('Создай ссылку под размещение и вставь её в рекламный пост вместо @имени канала — увидишь, сколько подписчиков принесла реклама.')) + '</p></div>';
            } else {
                body += _items.map(linkCard).join('');
                body += '<div class="pl-note">' + esc(T('Счётчики обновляются при каждом открытии экрана. «Осталось» — сколько вступивших сейчас в канале.')) + '</div>';
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
        _busy = true;
        apiRequest('/api/v1/placements/links', {
            method: 'POST',
            body: JSON.stringify({ channel_id: _chId, name: name, price_rub: price ? parseInt(price, 10) : null })
        }).then(function (r) {
            _busy = false;
            if (r && r.ok) {
                haptic('medium');
                closeSheet();
                load();
                if (r.item && r.item.invite_link) copyText(r.item.invite_link, T('Ссылка создана и скопирована — вставь её в рекламный пост'));
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

    function doRevoke(id) {
        var go = function () {
            apiRequest('/api/v1/placements/links/' + id + '/revoke', { method: 'POST', body: '{}' })
                .then(function (r) {
                    if (r && r.ok) { haptic('light'); toast(T('Ссылка отозвана — новые вступления по ней невозможны')); load(); }
                    else toast((r && r.message) || T('Не удалось. Повтори попытку.'));
                }).catch(function () { toast(T('Не удалось. Повтори попытку.')); });
        };
        if (typeof confirmDialog === 'function') confirmDialog(T('Отозвать ссылку? Она перестанет работать, статистика сохранится.'), go);
        else go();
    }

    function onClick(e) {
        var b = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!b) return;
        var act = b.getAttribute('data-act');
        if (act === 'close') { close(); return; }
        if (act === 'new') { haptic('light'); openCreateSheet(); return; }
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
            if (typeof confirmDialog === 'function') confirmDialog(delMsg, doDel);
            else doDel();
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

    function toggleWho(id) {
        var box = document.getElementById('pl-who-' + id);
        if (!box) return;
        if (box.style.display !== 'none') { box.style.display = 'none'; return; }
        box.style.display = 'block';
        box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Загружаю...')) + '</div>';
        haptic('light');
        apiRequest('/api/v1/placements/links/' + id + '/joiners').then(function (r) {
            if (!r || !r.ok) { box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc((r && r.message) || T('Не загрузилось. Открой ещё раз.')) + '</div>'; return; }
            var items = r.items || [];
            var nolink = r.nolink_items || [];
            if (!items.length && !nolink.length) { box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Пока никто не вступил по этой ссылке')) + '</div>'; return; }
            function whoRow(u) {
                var nm = u.first_name || (u.username ? '@' + u.username : ('ID ' + u.user_id));
                var bits = [];
                if (u.username) bits.push('@' + u.username);
                bits.push(fmtTime(u.ts));
                if (u.acc_year) bits.push('≈' + u.acc_year);
                if (u.premium) bits.push('Premium');
                var sub = bits.join(' · ');
                var tags = '';
                if (u.left) tags += '<span class="pl-whotag left">' + esc(T('вышел')) + '</span>';
                else if (u.late) tags += '<span class="pl-whotag late">' + esc(T('поздний')) + '</span>';
                var open = u.username ? ' data-act="open-user" data-u="' + esc(u.username) + '"' : '';
                return '<div class="pl-whorow"' + open + '>' +
                    '<div class="pl-whoav">' + esc(String(nm).charAt(0).toUpperCase()) + '</div>' +
                    '<div class="pl-whomid"><div class="pl-whonm">' + esc(nm) + '</div>' +
                    '<div class="pl-whosub">' + esc(sub) + (u.username ? '' : ' · ' + T('профиль без @имени')) + '</div></div>' + tags + '</div>';
            }
            var nolinkHtml = '';
            if (nolink.length) {
                nolinkHtml = '<div class="pl-nolink-hd">' + esc(T('Без ссылки за период')) + ' · ' + nolink.length + '</div>' +
                    '<div class="pl-qnote">' + esc(T('Вступили за время атрибуции без метки ссылки: пришли через @имя канала, из поиска или по пересланному посту. Telegram не сообщает их источник.')) + '</div>' +
                    nolink.map(whoRow).join('');
            }
            if (!items.length) {
                box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Пока никто не вступил по этой ссылке')) + '</div>' + nolinkHtml;
                return;
            }
            var q = r.quality || {};
            var stayed = (q.total || 0) - (q.left || 0);
            var head = '<div class="pl-funnel">' +
                (r.impressions ? '<div class="pl-fr"><b>~' + num(r.impressions) + '</b> ' + esc(T('увидели рекламный пост')) + '</div>' : '') +
                '<div class="pl-fr"><b>' + num(q.total || 0) + '</b> ' + esc(T('подписались')) + '</div>' +
                '<div class="pl-fr"><b style="color:' + (stayed === q.total ? '#5DCAA5' : '#f5bf4f') + ';">' + num(stayed) + '</b> ' +
                    esc(T('остаются в канале')) + (q.total ? ' · ' + Math.round(stayed / q.total * 100) + '%' : '') + '</div>' +
                ((r.price_rub && stayed) ? '<div class="pl-fr">' + esc(T('цена оставшегося')) + ' <b>' + num(Math.round(r.price_rub / stayed)) + ' ₽</b></div>' : '') +
                '</div>';
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
            if (q.premium) flags.push('Premium: ' + q.premium);
            if (flags.length) head += '<div class="pl-qnote">' + flags.join(' · ') + '</div>';
            var susp = (q.fresh_2024 || 0) + (q.digit_names || 0);
            if (q.total >= 10 && susp / q.total > 0.5) {
                head += '<div class="pl-qwarn">' + esc(T('Больше половины вступивших похожи на созданные недавно или шаблонные аккаунты — есть признаки недобросовестного трафика. Сверь список вручную перед оплатой следующего размещения.')) + '</div>';
            }
            box.innerHTML = head + items.map(whoRow).join('') + nolinkHtml;
        }).catch(function () { box.innerHTML = '<div class="pl-center" style="padding:10px 0;">' + esc(T('Не загрузилось. Открой ещё раз.')) + '</div>'; });
    }

    window.__openPlacements = function () {
        loading();
        apiRequest('/api/v1/channels/active').then(function (d) {
            _channels = (d && d.channels) ? d.channels : [];
            if (_chId == null && d && d.active_channel_id) _chId = d.active_channel_id;
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
