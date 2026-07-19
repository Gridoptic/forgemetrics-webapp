(function () {
    'use strict';

    var _screen = null;
    var _pollTimer = null;
    var _pollAttempts = 0;
    var _thinkingTimer = null;
    var _thinkingIdx = 0;
    var _closed = false;

    var _channelId = null;
    var _direction = 'sell';
    var _reqSeq = 0;   // токен актуальности: ответ устаревшего bootstrap игнорируется при быстром переключении вкладок
    var _segment = 'all';
    var _sort = 'match';
    var _report = null;
    var _limits = null;
    var _searchId = null;

    var MAX_POLL = 120;   // 120*3с=360с — покрывает максимум бэкенда, иначе фронт сдаётся, а поиск ещё идёт и тратит деньги

    var SEGMENT_NOTES = {
        all: 'Все найденные площадки по твоей нише. Полная картина рынка — отсортируй как удобно и ничего не упустишь.',
        match: 'Площадки, чья аудитория ближе всего к твоей. Чем выше совпадение, тем выше шанс, что реклама зайдёт их подписчикам, а не уйдёт в пустоту.',
        alive: 'Реклама в молодом живом канале дешевле, а отдача выше — аудитория активна и не выжжена рекламой. Поймать такой до того, как он подорожает — выгодно.',
        clean: 'Только площадки без признаков накрутки. Зелёный светофор — твои деньги не уйдут на ботов и мёртвую аудиторию.'
    };

    function _esc(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function _num(n) {
        if (n == null || isNaN(n)) return '—';
        return Number(n).toLocaleString('ru-RU');
    }

    function _haptic(kind) {
        try {
            if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) {
                if (kind === 'success' || kind === 'error' || kind === 'warning') {
                    tg.HapticFeedback.notificationOccurred(kind);
                } else {
                    tg.HapticFeedback.impactOccurred(kind || 'light');
                }
            }
        } catch (e) {}
    }

    function apiGet(path) { return apiRequest(path); }
    function apiPost(path, body) {
        var opts = { method: 'POST' };
        if (body !== undefined) {
            opts.body = JSON.stringify(body);
            opts.headers = { 'Content-Type': 'application/json' };
        }
        return apiRequest(path, opts);
    }

    function detailFrom(message) {
        if (!message) return '';
        var m = String(message);
        var idx = m.indexOf('{');
        if (idx !== -1) {
            try {
                var obj = JSON.parse(m.slice(idx));
                if (obj && obj.detail) return obj.detail;
            } catch (e) {}
        }
        return m;
    }

    function ensureScreen() {
        if (_screen && document.body.contains(_screen)) return _screen;
        _screen = document.getElementById('adx-screen');
        if (!_screen) {
            _screen = document.createElement('div');
            _screen.id = 'adx-screen';
            _screen.className = 'adx-screen';
            var appRoot = document.getElementById('app') || document.body;
            appRoot.appendChild(_screen);
        }
        _screen.style.display = 'flex';
        return _screen;
    }

    function bindBackButton() {
        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(closeAdx);
                tg.BackButton.onClick(closeAdx);
                tg.BackButton.show();
            }
        } catch (e) {}
    }

    function closeAdx() {
        stopPolling();
        stopThinking();
        _closed = true;
        if (_screen && _screen.parentNode) {
            _screen.parentNode.removeChild(_screen);
        }
        _screen = null;
        document.documentElement.classList.remove('adx-modal-open');
        document.body.classList.remove('adx-modal-open');
        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(closeAdx);
                tg.BackButton.hide();
            }
        } catch (e) {}
    }

    function headerHtml(title) {
        return '' +
            '<div class="adx-header">' +
                '<button class="adx-back" id="adx-back"><i class="ti ti-arrow-left"></i></button>' +
                '<div class="adx-header-title">' + _esc(title) + '</div>' +
                '<div class="adx-header-spacer"></div>' +
            '</div>';
    }

    function attachBack() {
        var b = document.getElementById('adx-back');
        if (b) b.addEventListener('click', closeAdx);
        bindBackButton();
    }

    function setBody(html) {
        ensureScreen();
        _screen.innerHTML = html;
        attachBack();
    }

    function showCenter(inner) {
        ensureScreen();
        _screen.innerHTML =
            headerHtml('Биржа рекламы') +
            '<div class="adx-center">' + inner + '</div>';
        attachBack();
    }

    var THINKING = [
        'Ищу площадки через веб-поиск…',
        'Проверяю каналы на реальность…',
        'Считаю охваты и здоровье…',
        'Оцениваю совпадение аудитории…',
        'Собираю отчёт…'
    ];

    function showThinking() {
        showCenter(
            '<div class="adx-spinner"></div>' +
            '<div class="adx-thinking-text" id="adx-thinking-text">' + _esc(THINKING[0]) + '</div>'
        );
    }

    function startThinking() {
        _thinkingIdx = 0;
        stopThinking();
        _thinkingTimer = setInterval(function () {
            _thinkingIdx = (_thinkingIdx + 1) % THINKING.length;
            var el = document.getElementById('adx-thinking-text');
            if (el) el.textContent = THINKING[_thinkingIdx];
        }, 2600);
    }

    function stopThinking() {
        if (_thinkingTimer) { clearInterval(_thinkingTimer); _thinkingTimer = null; }
    }

    function stopPolling() {
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
        _pollAttempts = 0;
    }

    function showFatalError(text, opts) {
        opts = opts || {};
        stopThinking();
        stopPolling();
        var retryBtn = opts.onRetry
            ? '<button class="adx-primary-btn" id="adx-retry"><i class="ti ti-refresh"></i><span>Попробовать снова</span></button>'
            : '';
        showCenter(
            '<div class="adx-error-icon"><i class="ti ' + _esc(opts.icon || 'ti-alert-triangle') + '"></i></div>' +
            '<div class="adx-error-text">' + _esc(text) + '</div>' +
            retryBtn +
            '<button class="adx-secondary-btn" id="adx-err-back"><i class="ti ti-arrow-left"></i><span>Назад</span></button>'
        );
        var r = document.getElementById('adx-retry');
        if (r && opts.onRetry) r.addEventListener('click', opts.onRetry);
        var eb = document.getElementById('adx-err-back');
        if (eb) eb.addEventListener('click', closeAdx);
    }

    function resolveChannelId(explicitId) {
        if (explicitId != null && !isNaN(explicitId)) {
            return Promise.resolve(parseInt(explicitId, 10));
        }
        return apiGet('/api/v1/channels/active')
            .then(function (data) {
                var id = data && data.active_channel_id;
                if (id == null) {
                    var chs = (data && data.channels) || [];
                    if (chs.length > 0) id = chs[0].id;
                }
                return id != null ? parseInt(id, 10) : null;
            })
            .catch(function () { return null; });
    }

    function open(explicitChannelId) {
        stopPolling();
        stopThinking();
        var stale = document.getElementById('adx-screen');
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
        _screen = null;
        _closed = false;
        _report = null;
        _limits = null;
        _searchId = null;
        _direction = 'sell';
        _segment = 'all';
        _sort = 'match';
        ensureScreen();
        document.documentElement.classList.add('adx-modal-open');
        document.body.classList.add('adx-modal-open');
        showCenter('<div class="adx-spinner"></div><div class="adx-thinking-text">Загружаю…</div>');

        resolveChannelId(explicitChannelId).then(function (id) {
            if (_closed) return;
            if (id == null) {
                showFatalError('Сначала подключи канал, чтобы искать рекламодателей.', { icon: 'ti-broadcast-off' });
                return;
            }
            _channelId = id;
            bootstrap();
        });
    }

    function bootstrap() {
        var seq = ++_reqSeq;
        Promise.all([
            apiGet('/api/v1/ad-exchange/limits').catch(function () { return null; }),
            apiGet('/api/v1/channels/' + _channelId + '/ad-exchange/latest?direction=' + _direction).catch(function () { return null; })
        ]).then(function (res) {
            if (_closed || seq !== _reqSeq) return;   // пришёл ответ на устаревший запрос (сменили вкладку) — игнор
            _limits = res[0];
            var latest = res[1];
            if (latest && latest.status === 'done' && latest.report) {
                _report = latest.report;
                renderReport();
            } else {
                renderIntro();
            }
        });
    }

    function limitText() {
        if (!_limits) return '';
        if (_limits.via_extra) return 'Доступ по разовой покупке';
        var used = _limits.used || 0;
        var limit = _limits.limit || 0;
        return 'Поисков в этом месяце: ' + used + ' / ' + limit;
    }

    function renderIntro() {
        stopThinking();
        stopPolling();
        var canRun = _limits && _limits.can_run;
        var price = (_limits && _limits.one_off_price_rub) || 490;
        var lockNote = canRun ? '' :
            '<div class="adx-lock-note"><i class="ti ti-lock"></i> Лимит исчерпан. Доступ к бирже можно оформить разово за ' + price + '₽ или повысить тариф.</div>';

        var body =
            headerHtml('Биржа рекламы') +
            '<div class="adx-body">' +
                '<div class="adx-intro">' +
                    '<div class="adx-intro-icon"><i class="ti ti-businessplan"></i></div>' +
                    '<div class="adx-intro-title">Найди рекламодателей и площадки</div>' +
                    '<div class="adx-intro-sub">Бот ищет реальные каналы по твоей нише, проверяет их на накрутки и оценивает, насколько их аудитория совпадает с твоей.</div>' +
                    directionTabs() +
                    '<div class="adx-dir-note" id="adx-dir-note">' + directionNote() + '</div>' +
                    '<div class="adx-limit-line">' + _esc(limitText()) + '</div>' +
                    lockNote +
                    '<button class="adx-primary-btn adx-start" id="adx-start"' + (canRun ? '' : ' disabled') + '>' +
                        '<i class="ti ti-search"></i><span>Найти площадки</span>' +
                    '</button>' +
                '</div>' +
            '</div>';
        setBody(body);
        bindDirectionTabs(function () {
            var note = document.getElementById('adx-dir-note');
            if (note) note.innerHTML = directionNote();
        });
        var start = document.getElementById('adx-start');
        if (start && canRun) start.addEventListener('click', function () { _haptic('medium'); startSearch(); });
    }

    function directionTabs() {
        return '' +
            '<div class="adx-tabs">' +
                '<button class="adx-tab' + (_direction === 'sell' ? ' on' : '') + '" data-dir="sell">' +
                    '<i class="ti ti-cash"></i> Купят у меня</button>' +
                '<button class="adx-tab' + (_direction === 'buy' ? ' on' : '') + '" data-dir="buy">' +
                    '<i class="ti ti-shopping-cart"></i> Куплю я</button>' +
            '</div>';
    }

    function directionNote() {
        if (_direction === 'sell') {
            return '<i class="ti ti-info-circle"></i> Рекламодатели, которым подойдёт <b>твоя</b> аудитория — они купят рекламу у тебя.';
        }
        return '<i class="ti ti-info-circle"></i> Площадки, где <b>ты</b> можешь купить рекламу для продвижения своего канала.';
    }

    function bindDirectionTabs(after) {
        var tabs = _screen.querySelectorAll('.adx-tab');
        Array.prototype.forEach.call(tabs, function (t) {
            t.addEventListener('click', function () {
                _direction = t.getAttribute('data-dir');
                _reqSeq++;   // инвалидируем летящие запросы предыдущего направления
                _haptic('light');
                Array.prototype.forEach.call(tabs, function (x) { x.classList.remove('on'); });
                t.classList.add('on');
                if (after) after();
            });
        });
    }

    function startSearch() {
        showThinking();
        startThinking();
        apiPost('/api/v1/channels/' + _channelId + '/ad-exchange/search?direction=' + _direction)
            .then(function (data) {
                if (_closed) return;
                _searchId = data && data.search_id;
                if (!_searchId) {
                    showFatalError('Не удалось запустить поиск. Попробуй ещё раз.', { onRetry: renderIntro });
                    return;
                }
                pollSearch();
            })
            .catch(function (err) {
                if (_closed) return;
                var msg = detailFrom(err && err.message);
                showFatalError(msg || 'Не удалось запустить поиск.', { onRetry: renderIntro, icon: 'ti-lock' });
            });
    }

    function pollSearch() {
        stopPolling();
        _pollAttempts = 0;
        _pollTimer = setInterval(function () {
            _pollAttempts++;
            if (_pollAttempts > MAX_POLL) {
                showFatalError('Поиск занял слишком много времени. Попробуй ещё раз.', { onRetry: renderIntro });
                return;
            }
            apiGet('/api/v1/ad-exchange/search/' + _searchId)
                .then(function (data) {
                    if (_closed || !data) return;
                    if (data.status === 'done') {
                        stopPolling();
                        stopThinking();
                        _report = data.report;
                        renderReport();   // отчёт уже на руках — рисуем сразу, не гоняем latest (мог отбросить по direction/lang)
                        apiGet('/api/v1/ad-exchange/limits').then(function (lm) { if (!_closed && lm) _limits = lm; }).catch(function () {});
                    } else if (data.status === 'failed') {
                        stopPolling();
                        stopThinking();
                        showFatalError(data.error || 'Поиск не удался. Попробуй ещё раз.', { onRetry: renderIntro });
                    } else if (data.status === 'empty') {
                        stopPolling();
                        stopThinking();
                        showFatalError(data.error || 'Подходящих площадок не нашлось. Поиск не списан.', { onRetry: renderIntro, icon: 'ti-mood-empty' });
                    } else if (data.status === 'service_unavailable') {
                        stopPolling();
                        stopThinking();
                        showFatalError(data.error || 'Сервис временно недоступен. Поиск не списан.', { onRetry: renderIntro, icon: 'ti-cloud-off' });
                    }
                })
                .catch(function () {});
        }, 3000);
    }

    function platformsNow() {
        var list = (_report && _report.platforms) || [];
        var d = list.slice();
        if (_segment === 'alive') d = d.filter(function (x) { return x.is_alive; });
        else if (_segment === 'clean') d = d.filter(function (x) { return x.health_class === 'green'; });

        if (_segment === 'match') d.sort(function (a, b) { return (b.match_percent || 0) - (a.match_percent || 0); });
        else {
            if (_sort === 'match') d.sort(function (a, b) { return (b.match_percent || 0) - (a.match_percent || 0); });
            else if (_sort === 'health') d.sort(function (a, b) { return (b.health_score || 0) - (a.health_score || 0); });
            else if (_sort === 'reach') d.sort(function (a, b) { return (b.forecast_reach || 0) - (a.forecast_reach || 0); });
        }
        return d;
    }

    function sparkSvg(arr, col) {
        if (!arr || arr.length < 2) return '';
        var w = 64, h = 18, n = arr.length;
        var max = Math.max.apply(null, arr), min = Math.min.apply(null, arr);
        var pts = arr.map(function (v, i) {
            var x = i / (n - 1) * w;
            var y = h - ((v - min) / ((max - min) || 1)) * (h - 3) - 1.5;
            return x.toFixed(1) + ',' + y.toFixed(1);
        }).join(' ');
        return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
            '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    function healthColor(cls) {
        if (cls === 'green') return '#10b981';
        if (cls === 'amber') return '#f59e0b';
        return '#ef4444';
    }

    function healthLabel(cls) {
        if (cls === 'green') return 'Чисто';
        if (cls === 'amber') return 'Вопросы';
        return 'Накрутка';
    }

    function verdictColor(label) {
        if (label === 'take') return '#10b981';
        if (label === 'skip') return '#ef4444';
        return '#f59e0b';
    }

    function verdictIcon(label) {
        if (label === 'take') return 'ti-circle-check';
        if (label === 'skip') return 'ti-alert-octagon';
        return 'ti-alert-triangle';
    }

    function badges(p) {
        var b = '';
        if (p.is_alive) b += '<span class="adx-badge adx-badge-alive"><i class="ti ti-plant-2"></i> Живой</span>';
        if ((p.match_percent || 0) >= 80) b += '<span class="adx-badge adx-badge-match"><i class="ti ti-target-arrow"></i> В точку</span>';
        return b;
    }

    function flagIcon(icon) {
        if (icon === 'ok') return 'ti-circle-check';
        if (icon === 'danger') return 'ti-alert-octagon';
        return 'ti-alert-triangle';
    }

    function flagColor(icon) {
        if (icon === 'ok') return '#10b981';
        if (icon === 'danger') return '#ef4444';
        return '#f59e0b';
    }

    function cardHtml(p, idx) {
        var col = healthColor(p.health_class);
        var sparkCol = col;
        var match = p.match_percent != null ? p.match_percent : 50;
        var dash = (match / 100 * 119).toFixed(0);
        var contactBtn = p.contact
            ? '<button class="adx-msg" data-u="' + _esc(p.contact) + '"><i class="ti ti-brand-telegram"></i> Написать</button>'
            : '<button class="adx-msg adx-msg-alt" data-u="' + _esc(p.username) + '"><i class="ti ti-external-link"></i> Канал</button>';

        var flagsHtml = (p.health_flags || []).map(function (f) {
            var fc = flagColor(f.icon);
            var w = f.weight != null ? f.weight : 50;
            return '<div class="adx-flag">' +
                '<i class="ti ' + flagIcon(f.icon) + '" style="color:' + fc + '"></i>' +
                '<div class="adx-flag-body">' +
                    '<div class="adx-flag-title">' + _esc(f.title) + '</div>' +
                    '<div class="adx-flag-explain">' + _esc(f.explain) + '</div>' +
                    '<div class="adx-bar"><div class="adx-bar-fill" style="width:' + w + '%;background:' + fc + '"></div></div>' +
                '</div>' +
            '</div>';
        }).join('');

        return '' +
        '<div class="adx-card">' +
            '<div class="adx-card-top">' +
                '<div class="adx-match-ring">' +
                    '<svg width="46" height="46" viewBox="0 0 46 46">' +
                        '<circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="4"/>' +
                        '<circle cx="23" cy="23" r="19" fill="none" stroke="#818cf8" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + dash + ' 119" transform="rotate(-90 23 23)"/>' +
                    '</svg>' +
                    '<div class="adx-match-num"><span>' + match + '</span><small>match</small></div>' +
                '</div>' +
                '<div class="adx-card-main">' +
                    '<div class="adx-card-title">' + _esc(p.title) + '</div>' +
                    '<div class="adx-card-uname">@' + _esc(p.username) + ' · ' + _num(p.subscribers) + ' подп.</div>' +
                    '<div class="adx-card-badges">' + badges(p) + '</div>' +
                '</div>' +
                '<span class="adx-health-tag" style="color:' + col + ';background:' + col + '22">' +
                    '<span class="adx-dot" style="background:' + col + '"></span> ' + healthLabel(p.health_class) +
                '</span>' +
            '</div>' +
            '<div class="adx-metrics">' +
                '<div class="adx-metric"><div class="adx-metric-lbl">Охват рекламы</div><div class="adx-metric-val adx-accent">~' + _num(p.forecast_reach) + '</div></div>' +
                '<div class="adx-metric"><div class="adx-metric-lbl">Цена поста</div><div class="adx-metric-val adx-price">' + _esc(p.price_estimate) + '</div></div>' +
                (p.engagement_percent != null ? '<div class="adx-metric"><div class="adx-metric-lbl">Вовлечённость</div><div class="adx-metric-val" style="color:#818cf8;">' + String(p.engagement_percent).replace('.', ',') + '%</div></div>' : '') +
                '<div class="adx-metric"><div class="adx-metric-lbl">Просмотры</div>' + (sparkSvg(p.views_spark, sparkCol) || '<div class="adx-metric-val">—</div>') + '</div>' +
            '</div>' +
            (p.verdict_text ?
                '<div class="adx-verdict" style="background:' + verdictColor(p.verdict_label) + '15;color:' + verdictColor(p.verdict_label) + '">' +
                    '<i class="ti ' + verdictIcon(p.verdict_label) + '"></i><span>' + _esc(p.verdict_text) + '</span>' +
                '</div>' : '') +
            '<div class="adx-card-actions">' +
                '<button class="adx-act adx-expand" data-i="' + idx + '"><i class="ti ti-stethoscope"></i> Разбор</button>' +
                contactBtn +
            '</div>' +
            '<div class="adx-detail" id="adx-det-' + idx + '">' +
                (flagsHtml || '<div class="adx-flag-explain">Недостаточно данных для подробного разбора.</div>') +
                (p.match_reason ? '<div class="adx-match-reason"><i class="ti ti-bulb"></i> ' + _esc(p.match_reason) + '</div>' : '') +
                '<div class="adx-aud-line">Аудитория: <b>' + _esc(p.audience_guess || 'Общая') + '</b> <span class="adx-aud-note">~по тематике</span></div>' +
            '</div>' +
        '</div>';
    }

    function renderReport() {
        stopThinking();
        stopPolling();
        if (!_report) { renderIntro(); return; }

        var list = platformsNow();
        var own = _report.own || {};
        var niche = _report.niche || '';

        var cardsHtml = list.length
            ? list.map(function (p, i) { return cardHtml(p, i); }).join('')
            : '<div class="adx-empty"><i class="ti ti-mood-empty"></i><div>В этом сегменте площадок нет. Смени фильтр или направление.</div></div>';

        var body =
            headerHtml('Биржа рекламы') +
            '<div class="adx-body">' +
                '<div class="adx-context">' +
                    '<div class="adx-ctx-channel">@' + _esc(own.username || '') + (niche ? ' · ниша «' + _esc(niche) + '»' : '') + '</div>' +
                '</div>' +
                directionTabs() +
                '<div class="adx-dir-note">' + directionNote() + '</div>' +
                segmentBar() +
                '<div class="adx-seg-note" id="adx-seg-note">' + _esc(SEGMENT_NOTES[_segment] || '') + '</div>' +
                (_segment === 'match' ? '' : sortBar()) +
                '<div class="adx-cards">' + cardsHtml + '</div>' +
                '<button class="adx-secondary-btn adx-rerun" id="adx-rerun"><i class="ti ti-refresh"></i><span>Новый поиск</span></button>' +
                '<div class="adx-disclaimer">Совпадение, охват и цена — честные оценки бота по публичным данным t.me и тематике. Не гарантия — уточняйте у площадки.</div>' +
            '</div>';
        setBody(body);
        bindReportControls();
    }

    function segmentBar() {
        var segs = [
            ['all', 'ti-layout-grid', 'Все'],
            ['match', 'ti-target-arrow', 'По нише'],
            ['alive', 'ti-plant-2', 'Живой контент'],
            ['clean', 'ti-shield-check', 'Чистые']
        ];
        return '<div class="adx-segments">' + segs.map(function (s) {
            return '<button class="adx-seg' + (_segment === s[0] ? ' on' : '') + '" data-seg="' + s[0] + '">' +
                '<i class="ti ' + s[1] + '"></i> ' + s[2] + '</button>';
        }).join('') + '</div>';
    }

    function sortBar() {
        var sorts = [['match', 'Совпадение'], ['health', 'Здоровье'], ['reach', 'Охват']];
        return '<div class="adx-sorts"><span class="adx-sort-lbl"><i class="ti ti-arrows-sort"></i></span>' +
            sorts.map(function (s) {
                return '<button class="adx-sort' + (_sort === s[0] ? ' on' : '') + '" data-sort="' + s[0] + '">' + s[1] + '</button>';
            }).join('') + '</div>';
    }

    function bindReportControls() {
        bindDirectionTabs(function () {
            showThinking();
            startThinking();
            bootstrap();
        });

        var segs = _screen.querySelectorAll('.adx-seg');
        Array.prototype.forEach.call(segs, function (s) {
            s.addEventListener('click', function () {
                _segment = s.getAttribute('data-seg');
                _haptic('light');
                renderReport();
            });
        });

        var sorts = _screen.querySelectorAll('.adx-sort');
        Array.prototype.forEach.call(sorts, function (s) {
            s.addEventListener('click', function () {
                _sort = s.getAttribute('data-sort');
                _haptic('light');
                renderReport();
            });
        });

        var exps = _screen.querySelectorAll('.adx-expand');
        Array.prototype.forEach.call(exps, function (b) {
            b.addEventListener('click', function () {
                var d = document.getElementById('adx-det-' + b.getAttribute('data-i'));
                if (!d) return;
                var open = d.classList.contains('open');
                if (open) {
                    d.classList.remove('open');
                    b.innerHTML = '<i class="ti ti-stethoscope"></i> Разбор';
                } else {
                    d.classList.add('open');
                    b.innerHTML = '<i class="ti ti-chevron-up"></i> Свернуть';
                }
                _haptic('light');
            });
        });

        var msgs = _screen.querySelectorAll('.adx-msg');
        Array.prototype.forEach.call(msgs, function (b) {
            b.addEventListener('click', function () {
                var u = b.getAttribute('data-u');
                _haptic('medium');
                openTelegramUser(u);
            });
        });

        var rerun = document.getElementById('adx-rerun');
        if (rerun) rerun.addEventListener('click', function () {
            _haptic('medium');
            apiGet('/api/v1/ad-exchange/limits').then(function (l) {
                _limits = l;
                renderIntro();
            }).catch(function () { renderIntro(); });
        });
    }

    function openTelegramUser(username) {
        if (!username) return;
        var clean = String(username).replace(/^@/, '');
        var url = 'https://t.me/' + clean;
        try {
            if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) {
                tg.openTelegramLink(url);
                return;
            }
        } catch (e) {}
        try { window.open(url, '_blank'); } catch (e) {}
    }

    window.__openAdExchange = open;
})();