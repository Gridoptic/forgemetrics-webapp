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
            '.pl-center{text-align:center;color:#8990a8;font-size:12px;}'
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
        var ret = (l.retained_7d != null) ? num(l.retained_7d) : '—';
        var lateNote = (l.late_joined > 0)
            ? '<div class="pl-note">+' + num(l.late_joined) + ' ' + esc(T('вступлений после окна атрибуции — учтены отдельно, в CPF не входят')) + '</div>'
            : '';
        return '<div class="pl-card" data-id="' + l.id + '">' +
            '<div class="pl-r1"><div class="pl-nm">' + esc(l.name) + '</div>' + st + '</div>' +
            '<div class="pl-meta">' + esc(meta.join(' · ')) + '</div>' +
            '<div class="pl-stats">' +
            '<div class="pl-st"><div class="k">' + esc(T('Вступило')) + '</div><div class="v">' + joined + '</div></div>' +
            '<div class="pl-st"><div class="k">' + esc(T('Осталось · 7 дн')) + '</div><div class="v">' + ret + '</div></div>' +
            '<div class="pl-st"><div class="k">CPF</div><div class="v">' + cpf + '</div></div></div>' + lateNote +
            (l.status === 'active'
                ? '<div class="pl-linkrow"><code>' + esc(l.invite_link) + '</code>' +
                  '<button class="pl-copy" data-act="copy" data-link="' + esc(l.invite_link) + '">' + esc(T('Скопировать')) + '</button></div>' +
                  '<button class="pl-revoke" data-act="revoke" data-id="' + l.id + '">' + esc(T('Отозвать ссылку')) + '</button>'
                : '') +
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
                body += '<div class="pl-note">' + esc(T('Счётчики обновляются при каждом открытии экрана. «Осталось · 7 дн» появится, когда накопится неделя наблюдений.')) + '</div>';
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
            '<div class="pl-note">' + esc(T('Окно атрибуции — 7 дней: вступления позже учитываются отдельно и в CPF не входят. Ссылку можно отозвать в любой момент.')) + '</div>' +
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
