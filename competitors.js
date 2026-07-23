(function () {
    'use strict';

    var _channelId = null;
    var _screen = null;
    var _pollTimer = null;
    var _thinkingTimer = null;
    var _thinkingIndex = 0;
    var _limits = null;
    var _candidates = [];
    var _selected = {};
    var _maxSelectable = 5;
    var _nicheSummary = '';
    var _analysisId = null;
    var _closed = false;

    var POLL_INTERVAL_MS = 3500;
    var POLL_MAX_ATTEMPTS = 70;
    var _pollAttempts = 0;

    var THINKING_SEARCH = [
        'Изучаю твою нишу...',
        'Подбираю похожие каналы...',
        'Проверяю, какие из них реальны...',
        'Отсеиваю мёртвые и приватные...',
        'Почти готово...',
    ];

    var THINKING_ANALYZE = [
        'Собираю метрики конкурентов...',
        'Сравниваю охваты и частоту...',
        'Ищу, что у них набирает охват…',
        'Нахожу твои окна возможностей...',
        'Собираю план обгона...',
        'Почти готово...',
    ];

    function _esc(s) {
        if (s == null) return '';
        if (typeof escapeHtml === 'function') {
            try { return escapeHtml(String(s)); } catch (e) {}
        }
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');   // единый стандарт экранирования
    }

    function _g(obj, path, dflt) {
        try {
            var parts = path.split('.');
            var cur = obj;
            for (var i = 0; i < parts.length; i++) {
                if (cur == null) return dflt;
                cur = cur[parts[i]];
            }
            return cur == null ? dflt : cur;
        } catch (e) {
            return dflt;
        }
    }

    function _hasText(s) {
        return typeof s === 'string' && s.trim().length > 0;
    }

    function _num(n) {
        if (n == null || isNaN(n)) return '—';
        n = Number(n);
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'М';
        if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'к';
        return String(Math.round(n));
    }

    function _pct(n) {
        if (n == null || isNaN(n)) return '—';
        return Number(n).toFixed(1).replace('.0', '') + '%';
    }

    function _ppw(n) {
        if (n == null || isNaN(n)) return '—';
        return Number(n).toFixed(1).replace('.0', '') + '/нед';
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

    function _priorityBadge(priority) {
        var map = {
            critical: { cls: 'comp-pri-critical', txt: 'критично' },
            important: { cls: 'comp-pri-important', txt: 'важно' },
            minor: { cls: 'comp-pri-minor', txt: 'на потом' },
        };
        var p = map[priority];
        if (!p) return '';
        return '<span class="comp-pri ' + p.cls + '">' + p.txt + '</span>';
    }

    function ensureScreen() {
        if (_screen && document.body.contains(_screen)) return _screen;
        _screen = document.getElementById('competitors-screen');
        if (!_screen) {
            _screen = document.createElement('div');
            _screen.id = 'competitors-screen';
            _screen.className = 'comp-screen';
            var appRoot = document.getElementById('app') || document.body;
            appRoot.appendChild(_screen);
        }
        _screen.style.display = 'flex';
        bindBackButton();
        return _screen;
    }

    function bindBackButton() {
        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(closeCompetitors);
                tg.BackButton.onClick(closeCompetitors);
                tg.BackButton.show();
            }
        } catch (e) {}
    }

    function closeCompetitors() {
        _closed = true;
        stopPolling();
        stopSearchPolling();
        stopThinking();
        if (_screen && _screen.parentNode) {
            _screen.parentNode.removeChild(_screen);
        }
        _screen = null;
        document.documentElement.classList.remove('comp-modal-open');
        document.body.classList.remove('comp-modal-open');
        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(closeCompetitors);
                tg.BackButton.hide();
            }
        } catch (e) {}
        if (typeof refreshDashboardSilent === 'function') {
            try { refreshDashboardSilent(); } catch (e) {}
        }
    }

    function headerHtml(title) {
        return '' +
            '<div class="comp-header">' +
                '<button class="comp-back" id="comp-back-btn"><i class="ti ti-arrow-left"></i></button>' +
                '<div class="comp-header-title">' + _esc(title || 'Анализ конкурентов') + '</div>' +
                '<div class="comp-header-spacer"></div>' +
            '</div>';
    }

    function attachBack() {
        var b = document.getElementById('comp-back-btn');
        if (b) b.addEventListener('click', closeCompetitors);
    }

    function setBody(html) {
        var s = ensureScreen();
        s.innerHTML = html;
        attachBack();
    }

    function showCenter(inner) {
        setBody(
            headerHtml() +
            '<div class="comp-center">' + inner + '</div>'
        );
    }

    function showThinking(texts) {
        showCenter(
            '<div class="comp-spinner"></div>' +
            '<div class="comp-thinking-text" id="comp-thinking-text">' + _esc(texts[0]) + '</div>' +
            '<div class="comp-thinking-hint">Это может занять до минуты. Не закрывай экран.</div>'
        );
        startThinking(texts);
    }

    function startThinking(texts) {
        stopThinking();
        _thinkingIndex = 0;
        _thinkingTimer = setInterval(function () {
            _thinkingIndex = (_thinkingIndex + 1) % texts.length;
            var el = document.getElementById('comp-thinking-text');
            if (!el) return;
            el.style.opacity = '0';
            setTimeout(function () {
                var el2 = document.getElementById('comp-thinking-text');
                if (el2) {
                    el2.textContent = texts[_thinkingIndex];
                    el2.style.opacity = '1';
                }
            }, 200);
        }, 2200);
    }

    function stopThinking() {
        if (_thinkingTimer) {
            clearInterval(_thinkingTimer);
            _thinkingTimer = null;
        }
    }

    function stopPolling() {
        if (_pollTimer) {
            clearInterval(_pollTimer);
            _pollTimer = null;
        }
        _pollAttempts = 0;
    }

    function showFatalError(text, opts) {
        opts = opts || {};
        stopThinking();
        stopPolling();
        var retryBtn = opts.onRetry
            ? '<button class="comp-primary-btn" id="comp-retry-btn"><i class="ti ti-refresh"></i><span>Попробовать снова</span></button>'
            : '';
        var backBtn = '<button class="comp-secondary-btn" id="comp-error-back"><i class="ti ti-arrow-left"></i><span>Назад</span></button>';
        showCenter(
            '<div class="comp-error-icon"><i class="ti ' + _esc(opts.icon || 'ti-alert-triangle') + '"></i></div>' +
            '<div class="comp-error-text">' + _esc(text) + '</div>' +
            retryBtn + backBtn
        );
        var r = document.getElementById('comp-retry-btn');
        if (r && opts.onRetry) r.addEventListener('click', opts.onRetry);
        var eb = document.getElementById('comp-error-back');
        if (eb) eb.addEventListener('click', closeCompetitors);
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

    function apiGet(path) {
        return apiRequest(path);
    }

    function apiPost(path, body) {
        var opts = { method: 'POST' };
        if (body !== undefined) {
            opts.body = JSON.stringify(body);
            opts.headers = { 'Content-Type': 'application/json' };
        }
        return apiRequest(path, opts);
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
        var stale = document.getElementById('competitors-screen');
        if (stale && stale.parentNode) {
            stale.parentNode.removeChild(stale);
        }
        _screen = null;
        _closed = false;
        _candidates = [];
        _selected = {};
        _nicheSummary = '';
        _analysisId = null;
        ensureScreen();
        document.documentElement.classList.add('comp-modal-open');
        document.body.classList.add('comp-modal-open');
        showCenter('<div class="comp-spinner"></div><div class="comp-thinking-text">Загружаю...</div>');

        resolveChannelId(explicitChannelId).then(function (id) {
            if (_closed) return;
            if (id == null) {
                showFatalError('Сначала подключи канал, чтобы анализировать конкурентов.', { icon: 'ti-broadcast-off' });
                return;
            }
            _channelId = id;
            bootstrap();
        });
    }

    function bootstrap() {
        Promise.all([
            apiGet('/api/v1/competitors/limits').catch(function () { return null; }),
            apiGet('/api/v1/channels/' + _channelId + '/competitors/latest').catch(function () { return null; }),
        ]).then(function (res) {
            if (_closed) return;
            _limits = res[0];
            if (_limits && _limits.competitors_per_run) {
                _maxSelectable = _limits.competitors_per_run;
            }
            var latest = res[1];
            if (latest && latest.found && latest.analysis && latest.analysis.report) {
                renderReport(latest.analysis.report, latest.analysis);
            } else {
                renderIntro();
            }
        });
    }

    function limitBarHtml() {
        if (!_limits) return '';
        if (_limits.is_tester) {
            return '<div class="comp-limit-bar"><span class="comp-limit-tester">тестер · без лимита</span></div>';
        }
        var used = _limits.used || 0;
        var limit = _limits.limit || 0;
        if (limit <= 0) {
            return '' +
                '<div class="comp-limit-bar comp-limit-locked">' +
                    '<i class="ti ti-lock"></i>' +
                    '<span>На твоём тарифе анализ не входит. Можно купить разовый за ' + _num(_g(_limits, 'extra_price_rub', 490)) + ' \u20bd.</span>' +
                '</div>';
        }
        var remaining = Math.max(0, limit - used);
        var exhausted = used >= limit;
        var pct = exhausted ? 0 : Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));
        var timer = (exhausted && _limits.seconds_until_reset && typeof formatRemainingTime === 'function')
            ? '<span class="comp-limit-timer">' + _esc(formatRemainingTime(_limits.seconds_until_reset)) + '</span>'
            : '';
        return '' +
            '<div class="comp-limit-bar ' + (exhausted ? 'comp-limit-exhausted' : '') + '">' +
                '<div class="comp-limit-head">' +
                    '<span class="comp-limit-icon"><i class="ti ti-binoculars"></i></span>' +
                    '<span class="comp-limit-label">Анализов в этом периоде</span>' +
                    '<span class="comp-limit-count">' + remaining + '<span class="comp-limit-total"> / ' + limit + '</span></span>' +
                '</div>' +
                '<div class="comp-limit-track"><div class="comp-limit-fill" style="width: ' + pct + '%"></div></div>' +
                timer +
            '</div>';
    }

    function canRun() {
        if (!_limits) return true;
        if (_limits.is_tester) return true;
        return !!_limits.can_run;
    }

    function introFeat(icon, title, sub) {
        return '' +
            '<div class="comp-intro-feat">' +
                '<div class="comp-intro-feat-icon"><i class="ti ti-' + _esc(icon) + '"></i></div>' +
                '<div>' +
                    '<div class="comp-intro-feat-title">' + _esc(title) + '</div>' +
                    '<div class="comp-intro-feat-sub">' + _esc(sub) + '</div>' +
                '</div>' +
            '</div>';
    }

    function renderIntro() {
        stopThinking();
        var runnable = canRun();
        var btnHtml;
        if (runnable) {
            btnHtml = '<button class="comp-primary-btn" id="comp-find-btn"><i class="ti ti-search"></i><span>Найти конкурентов</span></button>';
        } else if (_limits && _limits.limit <= 0) {
            btnHtml = '<button class="comp-primary-btn" id="comp-buy-btn"><i class="ti ti-coin"></i><span>Купить разовый анализ</span></button>';
        } else {
            var t = (_limits && _limits.seconds_until_reset && typeof formatRemainingTime === 'function')
                ? formatRemainingTime(_limits.seconds_until_reset) : '';
            btnHtml = '<button class="comp-primary-btn" disabled><i class="ti ti-clock"></i><span>Лимит исчерпан' + (t ? ' \u00b7 ' + _esc(t) : '') + '</span></button>';
        }

        setBody(
            headerHtml() +
            '<div class="comp-body">' +
                '<div class="comp-intro-hero">' +
                    '<div class="comp-intro-icon"><i class="ti ti-binoculars"></i></div>' +
                    '<div class="comp-intro-title">Разведка конкурентов</div>' +
                    '<div class="comp-intro-sub">ИИ найдёт каналы в твоей нише, проверит, что они существуют, и покажет — что у них набирает охват, где они тебя обходят и как их обогнать.</div>' +
                '</div>' +
                '<div class="comp-intro-feats">' +
                    introFeat('map-pin', 'Карта ниши', 'Твоя позиция среди конкурентов') +
                    introFeat('swords', 'Лоб в лоб', 'Где обходят, где твой козырь') +
                    introFeat('bulb', 'Их приёмы', 'Что у них работает, а у тебя нет') +
                    introFeat('route', 'План обгона', 'Конкретные шаги отстройки') +
                '</div>' +
                limitBarHtml() +
                btnHtml +
                '<div class="comp-intro-foot">AI предлагает каналы, но каждый мы проверяем парсером — в списке только реальные живые.</div>' +
            '</div>'
        );

        var f = document.getElementById('comp-find-btn');
        if (f) f.addEventListener('click', function () { _haptic('medium'); startFind(); });
        var bb = document.getElementById('comp-buy-btn');
        if (bb) bb.addEventListener('click', function () {
            closeCompetitors();
            if (typeof handleAction === 'function') handleAction('profile');
        });
    }

    var _searchPollTimer = null;
    var _searchPollAttempts = 0;
    var SEARCH_POLL_MAX = 80;

    function stopSearchPolling() {
        if (_searchPollTimer) {
            clearInterval(_searchPollTimer);
            _searchPollTimer = null;
        }
        _searchPollAttempts = 0;
    }

    function startFind() {
        showThinking(THINKING_SEARCH);
        apiPost('/api/v1/channels/' + _channelId + '/competitors/find-candidates')
            .then(function (res) {
                if (_closed) return;
                var sid = res && res.search_id;
                if (sid == null) {
                    handleFindError(new Error('no search_id'));
                    return;
                }
                pollSearch(sid);
            })
            .catch(function (err) {
                if (_closed) return;
                handleFindError(err);
            });
    }

    function pollSearch(searchId) {
        stopSearchPolling();
        _searchPollAttempts = 0;
        _searchPollTimer = setInterval(function () {
            _searchPollAttempts++;
            if (_searchPollAttempts > SEARCH_POLL_MAX) {
                stopSearchPolling();
                showFatalError('Поиск занимает дольше обычного. Попробуй ещё раз.', { icon: 'ti-clock', onRetry: renderIntro });
                return;
            }
            apiGet('/api/v1/competitors/search/' + searchId)
                .then(function (data) {
                    if (_closed || !data) return;
                    if (data.status === 'done') {
                        stopSearchPolling();
                        stopThinking();
                        _candidates = data.candidates || [];
                        _nicheSummary = data.niche_summary || '';
                        if (data.max_selectable) _maxSelectable = data.max_selectable;
                        renderSelect();
                    } else if (data.status === 'failed') {
                        stopSearchPolling();
                        stopThinking();
                        showFatalError(
                            data.error || 'Не удалось подобрать конкурентов. Добавь канал вручную.',
                            { icon: 'ti-mood-empty', onRetry: renderIntro }
                        );
                    }
                })
                .catch(function (err) {
                    var msg = (err && err.message) || '';
                    if (msg.indexOf('404') !== -1) {
                        stopSearchPolling();
                        stopThinking();
                        showFatalError('Поиск не найден. Попробуй ещё раз.', { icon: 'ti-alert-triangle', onRetry: renderIntro });
                    }
                });
        }, POLL_INTERVAL_MS);
    }

    function handleFindError(err) {
        var msg = (err && err.message) || '';
        var detail = detailFrom(msg);
        if (msg.indexOf('403') !== -1) {
            renderIntro();
            return;
        }
        if (msg.indexOf('429') !== -1) {
            showFatalError(detail || 'Лимит анализов исчерпан.', { icon: 'ti-clock' });
            return;
        }
        if (msg.indexOf('400') !== -1) {
            showFatalError(detail || 'Канал недоступен для анализа.', { icon: 'ti-broadcast-off' });
            return;
        }
        showFatalError(
            'Не удалось подобрать конкурентов. Можно попробовать снова или добавить канал вручную.',
            { icon: 'ti-mood-empty', onRetry: function () { renderSelect(); } }
        );
    }

    function selectedCount() {
        var n = 0;
        for (var k in _selected) { if (_selected[k]) n++; }
        return n;
    }

    function renderSelect() {
        stopThinking();
        var cards = '';
        if (_candidates.length === 0) {
            cards = '<div class="comp-empty-note">AI не нашёл проверяемых каналов. Добавь конкурента вручную по @username ниже.</div>';
        } else {
            for (var i = 0; i < _candidates.length; i++) {
                cards += candidateCard(_candidates[i], i);
            }
        }

        setBody(
            headerHtml('Выбери конкурентов') +
            '<div class="comp-body">' +
                (_hasText(_nicheSummary)
                    ? '<div class="comp-niche-summary"><i class="ti ti-bulb"></i><span>' + _esc(_nicheSummary) + '</span></div>'
                    : '') +
                (_candidates.length > 0
                    ? '<div class="comp-select-hint">Отмечай до <b>' + _maxSelectable + '</b> каналов. Все проверены — подтверждённые каналы.</div>'
                    : '') +
                '<div class="comp-cand-list" id="comp-cand-list">' + cards + '</div>' +
                manualInputHtml() +
                '<div class="comp-select-footer">' +
                    '<button class="comp-primary-btn" id="comp-analyze-btn" disabled><i class="ti ti-binoculars"></i><span>Анализировать (0)</span></button>' +
                '</div>' +
            '</div>'
        );

        bindSelectHandlers();
        updateAnalyzeBtn();
    }

    function candidateCard(c, idx) {
        var key = (c.username || '').toLowerCase();
        var checked = !!_selected[key];
        var metrics = [];
        if (c.subscribers != null) metrics.push('<span class="comp-cand-metric"><i class="ti ti-users"></i>' + _num(c.subscribers) + '</span>');
        if (c.reach_percent != null) metrics.push('<span class="comp-cand-metric"><i class="ti ti-eye"></i>' + _pct(c.reach_percent) + '</span>');
        if (c.posts_per_week != null) metrics.push('<span class="comp-cand-metric"><i class="ti ti-calendar"></i>' + _ppw(c.posts_per_week) + '</span>');
        var conf = '';
        if (c.confidence === 'high') conf = '<span class="comp-cand-conf comp-conf-high">точно в нише</span>';
        else if (c.confidence === 'low') conf = '<span class="comp-cand-conf comp-conf-low">возможно</span>';
        else if (c.confidence === 'manual') conf = '<span class="comp-cand-conf comp-conf-manual">вручную</span>';

        return '' +
            '<button class="comp-cand-card ' + (checked ? 'selected' : '') + '" data-cand-key="' + _esc(key) + '" data-cand-idx="' + idx + '">' +
                '<div class="comp-cand-check"><i class="ti ti-check"></i></div>' +
                '<div class="comp-cand-main">' +
                    '<div class="comp-cand-title-row">' +
                        '<span class="comp-cand-title">' + _esc(c.title || ('@' + c.username)) + '</span>' +
                        conf +
                    '</div>' +
                    '<div class="comp-cand-username">@' + _esc(c.username) + '</div>' +
                    (metrics.length ? '<div class="comp-cand-metrics">' + metrics.join('') + '</div>' : '') +
                    (_hasText(c.why_relevant) ? '<div class="comp-cand-why">' + _esc(c.why_relevant) + '</div>' : '') +
                '</div>' +
            '</button>';
    }

    function manualInputHtml() {
        return '' +
            '<div class="comp-manual">' +
                '<div class="comp-manual-label">Добавить своего конкурента</div>' +
                '<div class="comp-manual-row">' +
                    '<input type="text" class="comp-manual-input" id="comp-manual-input" placeholder="@username канала" autocapitalize="off" autocorrect="off">' +
                    '<button class="comp-manual-add" id="comp-manual-add"><i class="ti ti-plus"></i></button>' +
                '</div>' +
                '<div class="comp-manual-err" id="comp-manual-err" style="display:none;"></div>' +
            '</div>';
    }

    function bindSelectHandlers() {
        var cards = document.querySelectorAll('.comp-cand-card');
        for (var i = 0; i < cards.length; i++) {
            cards[i].addEventListener('click', function () {
                var key = this.getAttribute('data-cand-key');
                toggleSelect(key, this);
            });
        }
        var addBtn = document.getElementById('comp-manual-add');
        if (addBtn) addBtn.addEventListener('click', addManual);
        var input = document.getElementById('comp-manual-input');
        if (input) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); addManual(); }
            });
        }
        var ab = document.getElementById('comp-analyze-btn');
        if (ab) ab.addEventListener('click', startAnalyze);
    }

    function toggleSelect(key, cardEl) {
        if (!key) return;
        if (_selected[key]) {
            delete _selected[key];
            if (cardEl) cardEl.classList.remove('selected');
        } else {
            if (selectedCount() >= _maxSelectable) {
                _haptic('warning');
                flashSelectHint();
                return;
            }
            _selected[key] = true;
            if (cardEl) cardEl.classList.add('selected');
        }
        _haptic('light');
        updateAnalyzeBtn();
    }

    function flashSelectHint() {
        var hint = document.querySelector('.comp-select-hint');
        if (!hint) return;
        hint.classList.add('comp-hint-flash');
        setTimeout(function () { hint.classList.remove('comp-hint-flash'); }, 600);
    }

    function _normUsername(raw) {
        if (!raw) return null;
        var r = String(raw).trim();
        r = r.replace(/^https?:\/\/t\.me\//i, '');
        r = r.replace(/^t\.me\//i, '');
        r = r.replace(/^@/, '');
        r = r.replace(/\/+$/, '');
        r = r.trim();
        if (!r) return null;
        if (!/^[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(r)) return null;
        return r;
    }

    function addManual() {
        var input = document.getElementById('comp-manual-input');
        var errEl = document.getElementById('comp-manual-err');
        if (!input) return;
        var clean = _normUsername(input.value);
        if (errEl) errEl.style.display = 'none';
        if (!clean) {
            if (errEl) {
                errEl.textContent = 'Не похоже на @username канала. Пример: @durov';
                errEl.style.display = '';
            }
            _haptic('error');
            return;
        }
        var key = clean.toLowerCase();
        var exists = false;
        for (var i = 0; i < _candidates.length; i++) {
            if ((_candidates[i].username || '').toLowerCase() === key) { exists = true; break; }
        }
        if (!exists) {
            _candidates.push({
                username: clean,
                title: '@' + clean,
                subscribers: null,
                reach_percent: null,
                posts_per_week: null,
                why_relevant: 'Добавлен вручную',
                confidence: 'manual',
            });
        }
        if (selectedCount() < _maxSelectable) {
            _selected[key] = true;
        }
        input.value = '';
        renderSelect();
    }

    function updateAnalyzeBtn() {
        var btn = document.getElementById('comp-analyze-btn');
        if (!btn) return;
        var n = selectedCount();
        var span = btn.querySelector('span');
        if (span) span.textContent = 'Анализировать (' + n + ')';
        btn.disabled = (n === 0);
    }

    function startAnalyze() {
        var usernames = [];
        for (var k in _selected) { if (_selected[k]) usernames.push(k); }
        if (usernames.length === 0) return;

        var real = [];
        for (var i = 0; i < _candidates.length; i++) {
            var u = _candidates[i].username;
            if (u && _selected[u.toLowerCase()]) real.push(u);
        }
        if (real.length === 0) real = usernames;

        _haptic('medium');
        showThinking(THINKING_ANALYZE);

        apiPost('/api/v1/channels/' + _channelId + '/competitors/analyze', { usernames: real })
            .then(function (res) {
                if (_closed) return;
                _analysisId = res && res.analysis_id;
                if (_analysisId == null) {
                    showFatalError('Не удалось запустить анализ. Попробуй ещё раз.', { icon: 'ti-alert-triangle', onRetry: renderSelect });
                    return;
                }
                startPolling(_analysisId);
            })
            .catch(function (err) {
                if (_closed) return;
                handleAnalyzeError(err);
            });
    }

    function handleAnalyzeError(err) {
        var msg = (err && err.message) || '';
        var detail = detailFrom(msg);
        if (msg.indexOf('409') !== -1) {
            pollLatest();
            return;
        }
        if (msg.indexOf('403') !== -1 || msg.indexOf('429') !== -1) {
            showFatalError(detail || 'Лимит анализов исчерпан.', { icon: 'ti-clock' });
            return;
        }
        if (msg.indexOf('400') !== -1) {
            showFatalError(detail || 'Не удалось распознать конкурентов.', { icon: 'ti-alert-triangle', onRetry: renderSelect });
            return;
        }
        showFatalError('Не удалось запустить анализ. Попробуй ещё раз.', { icon: 'ti-alert-triangle', onRetry: renderSelect });
    }

    function startPolling(analysisId) {
        stopPolling();
        _pollAttempts = 0;
        _pollTimer = setInterval(function () {
            _pollAttempts++;
            if (_pollAttempts > POLL_MAX_ATTEMPTS) {
                stopPolling();
                showFatalError('Анализ занимает дольше обычного. Загляни позже — он сохранится.', { icon: 'ti-clock' });
                return;
            }
            apiGet('/api/v1/competitors/' + analysisId)
                .then(function (data) {
                    if (_closed || !data) return;
                    if (data.status === 'done') {
                        stopPolling();
                        stopThinking();
                        renderReport(data.report, data);
                    } else if (data.status === 'failed') {
                        stopPolling();
                        stopThinking();
                        showAnalysisFailed(data.error_message);
                    }
                })
                .catch(function () {});
        }, POLL_INTERVAL_MS);
    }

    function pollLatest() {
        stopPolling();
        _pollAttempts = 0;
        showThinking(THINKING_ANALYZE);
        _pollTimer = setInterval(function () {
            _pollAttempts++;
            if (_pollAttempts > POLL_MAX_ATTEMPTS) {
                stopPolling();
                showFatalError('Анализ занимает дольше обычного. Загляни позже — он сохранится.', { icon: 'ti-clock' });
                return;
            }
            apiGet('/api/v1/channels/' + _channelId + '/competitors/latest')
                .then(function (data) {
                    if (_closed || !data) return;
                    if (data.found && data.analysis && data.analysis.report) {
                        stopPolling();
                        stopThinking();
                        renderReport(data.analysis.report, data.analysis);
                    }
                })
                .catch(function () {});
        }, POLL_INTERVAL_MS);
    }

    function showAnalysisFailed(errCode) {
        var human = 'Не удалось завершить анализ. Попробуй ещё раз.';
        var c = String(errCode || '');
        if (c.indexOf('all_competitors_unreachable') !== -1) {
            human = 'Выбранные каналы оказались недоступны для анализа. Выбери других.';
        } else if (c.indexOf('own_fetch') !== -1) {
            human = 'Не удалось прочитать твой канал. Убедись, что он публичный.';
        } else if (c.indexOf('claude_empty') !== -1 || c.indexOf('invalid_json') !== -1) {
            human = 'AI не справился с разбором. Попробуй ещё раз.';
        }
        showFatalError(human, { icon: 'ti-mood-empty', onRetry: renderSelect });
    }

    function renderReport(report, meta) {
        stopThinking();
        stopPolling();
        if (!report || typeof report !== 'object') {
            showFatalError('Отчёт пуст. Попробуй запустить анализ заново.', { icon: 'ti-mood-empty', onRetry: renderSelect });
            return;
        }

        var html = headerHtml('Конкуренты') +
            '<div class="comp-body comp-report" id="comp-report-body">' +
                renderPositioning(report) +
                renderNicheMap(report) +
                renderHeadToHead(report) +
                renderKillerMoves(report) +
                renderGaps(report) +
                renderActionPlan(report) +
                renderDataQuality(report, meta) +
                renderRerun() +
            '</div>';
        setBody(html);

        var rb = document.getElementById('comp-rerun-btn');
        if (rb) rb.addEventListener('click', function () {
            _haptic('medium');
            _candidates = [];
            _selected = {};
            renderIntro();
        });

        var reportBody = document.getElementById('comp-report-body');
        if (reportBody) {
            var h2hNames = reportBody.querySelectorAll('.comp-h2h-them[data-open-ch]');
            for (var hi = 0; hi < h2hNames.length; hi++) {
                (function (el) {
                    el.addEventListener('click', function () { _openChannel(el.getAttribute('data-open-ch')); });
                })(h2hNames[hi]);
            }
        }

        requestAnimationFrame(function () { initNicheVisuals(report); });
    }

    function renderPositioning(report) {
        var pos = _g(report, 'positioning', '');
        if (!_hasText(pos)) return '';
        return '' +
            '<div class="comp-position">' +
                '<div class="comp-position-lbl"><i class="ti ti-flag"></i>Твоя позиция</div>' +
                '<div class="comp-position-text">' + _esc(pos) + '</div>' +
            '</div>';
    }

    function _mapPoints(report) {
        var map = _g(report, 'niche_map', []);
        if (!Array.isArray(map)) return [];
        var pts = [];
        for (var i = 0; i < map.length; i++) {
            var m = map[i];
            if (!m || typeof m !== 'object') continue;
            var reach = m.reach_percent;
            var ppw = m.posts_per_week;
            var subs = m.subscribers;
            if (reach == null && ppw == null && subs == null) continue;
            pts.push({
                username: m.username || '',
                is_you: !!m.is_you,
                reach: (reach == null || isNaN(reach)) ? null : Number(reach),
                ppw: (ppw == null || isNaN(ppw)) ? null : Number(ppw),
                subs: (subs == null || isNaN(subs)) ? null : Number(subs),
                role: m.role || m.position_label || null,
            });
        }
        return pts;
    }

    function _roleColor(role, isYou) {
        if (isYou) return '#818cf8';
        if (role === 'flagship' || role === 'leader') return '#F0997B';
        if (role === 'rocket') return '#fbbf24';
        if (role === 'laggard') return '#6b7088';
        return '#5DCAA5';
    }

    function _roleTag(role, isYou) {
        if (isYou) return { txt: 'ТЫ', cls: 'comp-rt-you' };
        if (role === 'flagship' || role === 'leader') return { txt: 'ФЛАГМАН', cls: 'comp-rt-flag' };
        if (role === 'rocket') return { txt: 'РАКЕТА', cls: 'comp-rt-rocket' };
        return null;
    }

    function renderNicheMap(report) {
        var pts = _mapPoints(report);
        if (pts.length < 2) {
            return '' +
                '<div class="comp-block-label">Рейтинг ниши</div>' +
                '<div class="comp-rank" id="comp-rank-block">' +
                    '<div class="comp-rank-sort" id="comp-rank-sort">' +
                        '<button class="comp-srt comp-srt-on" data-sort="subs">Подписчики</button>' +
                        '<button class="comp-srt" data-sort="reach">Охват</button>' +
                        '<button class="comp-srt" data-sort="ppw">Частота</button>' +
                    '</div>' +
                    '<div class="comp-rank-rows" id="comp-rank-rows"></div>' +
                '</div>';
        }

        return '' +
            '<div class="comp-block-label">Карта ниши \u00b7 охват \u00d7 частота</div>' +
            '<div class="comp-map-card">' +
                '<div class="comp-map-legend">' +
                    '<span class="comp-lg"><span class="comp-lg-dot" style="background:#F0997B;"></span>флагман</span>' +
                    '<span class="comp-lg"><span class="comp-lg-dot comp-lg-you"></span>ты</span>' +
                    '<span class="comp-lg"><span class="comp-lg-dot" style="background:#5DCAA5;"></span>конкуренты</span>' +
                    '<span class="comp-lg"><span class="comp-lg-dot" style="background:#fbbf24;"></span>ракета</span>' +
                '</div>' +
                '<div class="comp-map-stage" id="comp-map-stage"></div>' +
                '<div class="comp-map-tip" id="comp-map-tip">Нажми на точку — открою канал. Скрывай каналы кнопками ниже.</div>' +
                '<div class="comp-map-chips" id="comp-map-chips"></div>' +
            '</div>' +
            '<div class="comp-block-label" style="margin-top:16px;">Рейтинг ниши</div>' +
            '<div class="comp-rank" id="comp-rank-block">' +
                '<div class="comp-rank-sort" id="comp-rank-sort">' +
                    '<button class="comp-srt comp-srt-on" data-sort="subs">Подписчики</button>' +
                    '<button class="comp-srt" data-sort="reach">Охват</button>' +
                    '<button class="comp-srt" data-sort="ppw">Частота</button>' +
                '</div>' +
                '<div class="comp-rank-rows" id="comp-rank-rows"></div>' +
            '</div>';
    }

    function _openChannel(username) {
        if (!username) return;
        var u = String(username).replace(/^@/, '');
        var url = 'https://t.me/' + u;
        try {
            if (typeof tg !== 'undefined' && tg && typeof tg.openTelegramLink === 'function') {
                tg.openTelegramLink(url);
                return;
            }
        } catch (e) {}
        try { window.open(url, '_blank'); } catch (e) {}
    }

    function initNicheVisuals(report) {
        var pts = _mapPoints(report);
        if (pts.length >= 2) {
            try { buildNicheMap(pts); } catch (e) {}
        }
        try { buildRankTable(pts); } catch (e) {}
    }

    var _mapHidden = {};

    function _relax(nodes, minGap) {
        for (var iter = 0; iter < 60; iter++) {
            var moved = false;
            for (var i = 0; i < nodes.length; i++) {
                for (var j = i + 1; j < nodes.length; j++) {
                    var a = nodes[i], b = nodes[j];
                    var dx = b.x - a.x, dy = b.y - a.y;
                    var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
                    var need = a.r + b.r + minGap;
                    if (dist < need) {
                        var push = (need - dist) / 2;
                        var ux = dx / dist, uy = dy / dist;
                        a.x -= ux * push; a.y -= uy * push;
                        b.x += ux * push; b.y += uy * push;
                        moved = true;
                    }
                }
            }
            if (!moved) break;
        }
    }

    function buildNicheMap(pts) {
        var stage = document.getElementById('comp-map-stage');
        if (!stage) return;

        var W = 340, H = 300;
        var padL = 30, padR = 18, padT = 24, padB = 26;
        var plotW = W - padL - padR, plotH = H - padT - padB;

        var maxReach = 1, maxPpw = 1, maxSubs = 1;
        for (var i = 0; i < pts.length; i++) {
            if (pts[i].reach != null && pts[i].reach > maxReach) maxReach = pts[i].reach;
            if (pts[i].ppw != null && pts[i].ppw > maxPpw) maxPpw = pts[i].ppw;
            if (pts[i].subs != null && pts[i].subs > maxSubs) maxSubs = pts[i].subs;
        }
        maxReach *= 1.12; maxPpw *= 1.12;

        function radiusFor(p) {
            if (p.subs == null) return 11;
            return Math.max(9, Math.min(26, 9 + Math.sqrt(p.subs / maxSubs) * 17));
        }

        var nodes = [];
        for (var k = 0; k < pts.length; k++) {
            var p = pts[k];
            var hidden = !!_mapHidden[(p.username || '').toLowerCase() + (p.is_you ? '_you' : '')];
            var nx = padL + (Math.max(0, Math.min(1, (p.ppw || 0) / maxPpw))) * plotW;
            var ny = padT + plotH - (Math.max(0, Math.min(1, (p.reach || 0) / maxReach))) * plotH;
            nodes.push({ p: p, x: nx, y: ny, ox: nx, oy: ny, r: radiusFor(p), hidden: hidden, idx: k });
        }

        var visible = nodes.filter(function (n) { return !n.hidden; });
        _relax(visible, 3);
        for (var v = 0; v < visible.length; v++) {
            visible[v].x = Math.max(padL + visible[v].r, Math.min(W - padR - visible[v].r, visible[v].x));
            visible[v].y = Math.max(padT + visible[v].r, Math.min(padT + plotH - visible[v].r, visible[v].y));
        }

        var midX = padL + plotW * 0.5;
        var midY = padT + plotH * 0.5;

        var svg = '<svg class="comp-map-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
        svg += '<defs>' +
            '<radialGradient id="compGlowYou" cx="50%" cy="50%" r="50%">' +
                '<stop offset="0%" stop-color="#818cf8" stop-opacity="0.55"/>' +
                '<stop offset="100%" stop-color="#818cf8" stop-opacity="0"/>' +
            '</radialGradient>' +
            '<filter id="compSoft" x="-50%" y="-50%" width="200%" height="200%">' +
                '<feGaussianBlur stdDeviation="2.2"/>' +
            '</filter>' +
            '</defs>';

        svg += '<rect x="' + padL + '" y="' + padT + '" width="' + (plotW * 0.5) + '" height="' + (plotH * 0.5) + '" fill="rgba(240,153,123,0.04)"/>';
        svg += '<rect x="' + midX + '" y="' + padT + '" width="' + (plotW * 0.5) + '" height="' + (plotH * 0.5) + '" fill="rgba(93,202,165,0.05)"/>';
        svg += '<rect x="' + midX + '" y="' + midY + '" width="' + (plotW * 0.5) + '" height="' + (plotH * 0.5) + '" fill="rgba(99,102,241,0.04)"/>';

        svg += '<line x1="' + midX + '" y1="' + padT + '" x2="' + midX + '" y2="' + (padT + plotH) + '" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="4 4"/>';
        svg += '<line x1="' + padL + '" y1="' + midY + '" x2="' + (W - padR) + '" y2="' + midY + '" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="4 4"/>';

        svg += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + plotH) + '" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>';
        svg += '<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (W - padR) + '" y2="' + (padT + plotH) + '" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>';

        svg += '<text x="' + (W - padR - 3) + '" y="' + (padT + 11) + '" fill="rgba(93,202,165,0.5)" font-size="8.5" text-anchor="end">лидеры</text>';
        svg += '<text x="' + (padL + 4) + '" y="' + (padT + 11) + '" fill="rgba(240,153,123,0.5)" font-size="8.5">нишевые звёзды</text>';
        svg += '<text x="' + (padL + 4) + '" y="' + (padT + plotH - 5) + '" fill="rgba(255,255,255,0.22)" font-size="8.5">тихони</text>';
        svg += '<text x="' + (W - padR - 3) + '" y="' + (padT + plotH - 5) + '" fill="rgba(129,140,248,0.5)" font-size="8.5" text-anchor="end">частят</text>';

        svg += '<text x="' + padL + '" y="' + (H - 7) + '" fill="#4a4d61" font-size="9">частота \u2192</text>';
        svg += '<text x="9" y="' + (padT + 4) + '" fill="#4a4d61" font-size="9" transform="rotate(-90 9 ' + (padT + 4) + ')" text-anchor="end">охват \u2192</text>';

        var delay = 0;
        for (var n = 0; n < nodes.length; n++) {
            var nd = nodes[n];
            if (nd.hidden) continue;
            var pp = nd.p;
            var color = _roleColor(pp.role, pp.is_you);
            var cx = nd.x.toFixed(1), cy = nd.y.toFixed(1), r = nd.r.toFixed(1);
            var dataAttr = ' data-mapidx="' + nd.idx + '"';

            svg += '<g class="comp-node" style="animation-delay:' + delay + 'ms;" data-node="1">';
            if (pp.is_you) {
                svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (nd.r + 9).toFixed(1) + '" fill="url(#compGlowYou)" class="comp-node-glow"/>';
                svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '" stroke="#AFA9EC" stroke-width="2"' + dataAttr + ' class="comp-node-hit"/>';
                svg += '<text x="' + cx + '" y="' + cy + '" dy="0.35em" fill="#fff" font-size="10" font-weight="700" text-anchor="middle" pointer-events="none">Я</text>';
            } else {
                svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + hexToRgba(color, 0.42) + '" stroke="' + color + '" stroke-width="1.5"' + dataAttr + ' class="comp-node-hit"/>';
                if (pp.role === 'flagship' || pp.role === 'leader') {
                    svg += '<text x="' + cx + '" y="' + (nd.y - nd.r - 3).toFixed(1) + '" fill="#F0997B" font-size="8.5" text-anchor="middle" pointer-events="none">флагман</text>';
                } else if (pp.role === 'rocket') {
                    svg += '<text x="' + cx + '" y="' + (nd.y - nd.r - 3).toFixed(1) + '" fill="#fbbf24" font-size="8.5" text-anchor="middle" pointer-events="none">ракета</text>';
                }
            }
            svg += '</g>';
            delay += 70;
        }
        svg += '</svg>';
        stage.innerHTML = svg;

        var hits = stage.querySelectorAll('.comp-node-hit');
        for (var h = 0; h < hits.length; h++) {
            (function (el) {
                el.addEventListener('click', function () {
                    var idx = parseInt(el.getAttribute('data-mapidx'), 10);
                    var node = nodes[idx];
                    if (!node) return;
                    _haptic('light');
                    _showMapTip(node.p);
                });
            })(hits[h]);
        }

        var chipsHost = document.getElementById('comp-map-chips');
        if (chipsHost) {
            chipsHost.innerHTML = '';
            for (var ci = 0; ci < nodes.length; ci++) {
                (function (nd2) {
                    var pp2 = nd2.p;
                    var color2 = _roleColor(pp2.role, pp2.is_you);
                    var key = (pp2.username || '').toLowerCase() + (pp2.is_you ? '_you' : '');
                    var b = document.createElement('button');
                    b.className = 'comp-chip' + (nd2.hidden ? ' comp-chip-off' : '');
                    b.innerHTML = '<span class="comp-chip-dot" style="background:' + color2 + ';"></span>' + _esc(pp2.is_you ? 'Ты' : ('@' + pp2.username));
                    b.addEventListener('click', function () {
                        _mapHidden[key] = !_mapHidden[key];
                        _haptic('light');
                        buildNicheMap(pts);
                    });
                    chipsHost.appendChild(b);
                })(nodes[ci]);
            }
        }
    }

    function _showMapTip(p) {
        var tip = document.getElementById('comp-map-tip');
        if (!tip) return;
        var nm = p.is_you ? 'Твой канал' : ('@' + p.username);
        var color = _roleColor(p.role, p.is_you);
        var role = (p.role === 'flagship' || p.role === 'leader') ? 'Лидер ниши'
            : (p.role === 'rocket') ? 'Аномальный рост'
            : (p.is_you) ? 'Ты здесь' : 'Конкурент';

        var metrics = '';
        if (p.subs != null) metrics += '<span class="comp-tipc-m"><i class="ti ti-users"></i>' + _num(p.subs) + '</span>';
        if (p.reach != null) metrics += '<span class="comp-tipc-m"><i class="ti ti-eye"></i>' + _pct(p.reach) + '</span>';
        if (p.ppw != null) metrics += '<span class="comp-tipc-m"><i class="ti ti-calendar"></i>' + _ppw(p.ppw) + '</span>';

        var btn = (!p.is_you && _hasText(p.username))
            ? '<button class="comp-tipc-btn" data-tip-open="' + _esc(p.username) + '"><i class="ti ti-brand-telegram"></i>Открыть канал</button>'
            : '';

        tip.classList.add('comp-map-tip-card');
        tip.innerHTML =
            '<div class="comp-tipc-head">' +
                '<span class="comp-tipc-dot" style="background:' + color + ';' + (p.is_you ? 'box-shadow:0 0 6px ' + color + ';' : '') + '"></span>' +
                '<span class="comp-tipc-name" style="color:' + color + ';">' + _esc(nm) + '</span>' +
                '<span class="comp-tipc-role">' + _esc(role) + '</span>' +
            '</div>' +
            (metrics ? '<div class="comp-tipc-metrics">' + metrics + '</div>' : '') +
            btn;

        var ob = tip.querySelector('[data-tip-open]');
        if (ob) {
            ob.addEventListener('click', function () {
                _haptic('medium');
                _openChannel(ob.getAttribute('data-tip-open'));
            });
        }
    }

    function buildRankTable(pts) {
        var host = document.getElementById('comp-rank-rows');
        if (!host) return;
        var sortKey = 'subs';

        var maxV = { subs: 1, reach: 1, ppw: 1 };
        pts.forEach(function (p) {
            if (p.subs != null && p.subs > maxV.subs) maxV.subs = p.subs;
            if (p.reach != null && p.reach > maxV.reach) maxV.reach = p.reach;
            if (p.ppw != null && p.ppw > maxV.ppw) maxV.ppw = p.ppw;
        });

        function valOf(p, k) { return p[k] == null ? -1 : p[k]; }
        function dispOf(p, k) {
            if (p[k] == null) return '—';
            if (k === 'subs') return _num(p.subs);
            if (k === 'reach') return _pct(p.reach);
            return _ppw(p.ppw);
        }
        function ini(p) {
            if (p.is_you) return 'Я';
            var u = (p.username || '?').replace('@', '');
            return u.slice(0, 2).toUpperCase();
        }

        function render() {
            var sorted = pts.slice().sort(function (a, b) { return valOf(b, sortKey) - valOf(a, sortKey); });
            host.innerHTML = '';
            sorted.forEach(function (p, idx) {
                var c = _roleColor(p.role, p.is_you);
                var tag = _roleTag(p.role, p.is_you);
                var pct = Math.max(4, Math.round((valOf(p, sortKey) <= 0 ? 0 : valOf(p, sortKey)) / maxV[sortKey] * 100));
                var row = document.createElement('div');
                row.className = 'comp-rank-row' + (p.is_you ? ' comp-rank-you' : '');
                row.innerHTML =
                    '<span class="comp-rank-num">' + (idx + 1) + '</span>' +
                    '<span class="comp-rank-ava" style="color:' + c + ';border-color:' + c + ';background:' + hexToRgba(c, 0.13) + ';">' + _esc(ini(p)) + '</span>' +
                    '<div class="comp-rank-main">' +
                        '<div class="comp-rank-name-row">' +
                            '<span class="comp-rank-name"' + (p.is_you ? '' : ' data-open-ch="' + _esc(p.username) + '"') + '>' + _esc(p.is_you ? 'Твой канал' : ('@' + p.username)) + '</span>' +
                            (tag ? '<span class="comp-rt ' + tag.cls + '">' + tag.txt + '</span>' : '') +
                        '</div>' +
                        '<div class="comp-rank-track"><div class="comp-rank-fill" style="width:0%;background:linear-gradient(90deg,' + hexToRgba(c, 0.5) + ',' + c + ');" data-w="' + pct + '"></div></div>' +
                    '</div>' +
                    '<span class="comp-rank-val" style="color:' + c + ';">' + _esc(dispOf(p, sortKey)) + '</span>';
                host.appendChild(row);
            });
            host.querySelectorAll('[data-open-ch]').forEach(function (el) {
                el.addEventListener('click', function () { _openChannel(el.getAttribute('data-open-ch')); });
            });
            requestAnimationFrame(function () {
                setTimeout(function () {
                    var fills = host.querySelectorAll('.comp-rank-fill');
                    for (var i = 0; i < fills.length; i++) fills[i].style.width = fills[i].getAttribute('data-w') + '%';
                }, 30);
            });
        }
        render();

        var sortBar = document.getElementById('comp-rank-sort');
        if (sortBar) {
            sortBar.querySelectorAll('.comp-srt').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    sortKey = btn.getAttribute('data-sort');
                    sortBar.querySelectorAll('.comp-srt').forEach(function (b) { b.classList.remove('comp-srt-on'); });
                    btn.classList.add('comp-srt-on');
                    render();
                });
            });
        }
    }

    function hexToRgba(hex, a) {
        var h = String(hex).replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var r = parseInt(h.slice(0, 2), 16);
        var g = parseInt(h.slice(2, 4), 16);
        var b = parseInt(h.slice(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return 'rgba(147,150,172,' + a + ')';
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function renderHeadToHead(report) {
        var h2h = _g(report, 'head_to_head', []);
        if (!Array.isArray(h2h) || h2h.length === 0) return '';
        var blocks = '';
        for (var i = 0; i < h2h.length; i++) {
            var h = h2h[i];
            if (!h || typeof h !== 'object') continue;
            blocks += headToHeadCard(h);
        }
        if (!blocks) return '';
        return '<div class="comp-block-label">Лоб в лоб</div>' + blocks;
    }

    function headToHeadCard(h) {
        var title = _hasText(h.title) ? h.title : ('@' + (h.username || ''));
        var bars = '';
        var m = h.metrics || {};
        bars += compareBar('Охват', m.your_reach, m.their_reach, _pct);
        bars += compareBar('Постов/нед', m.your_ppw, m.their_ppw, function (v) { return _ppw(v); });
        bars += compareBar('Подписчиков', m.your_subscribers, m.their_subscribers, _num);

        var wins = '';
        var theyWin = Array.isArray(h.they_win) ? h.they_win : [];
        var youWin = Array.isArray(h.you_win) ? h.you_win : [];
        if (theyWin.length) {
            wins += '<div class="comp-h2h-wins"><div class="comp-h2h-wins-lbl comp-wins-them">Обходят тебя</div>';
            for (var i = 0; i < theyWin.length; i++) {
                if (_hasText(theyWin[i])) wins += '<div class="comp-h2h-win-item"><i class="ti ti-arrow-up-right"></i>' + _esc(theyWin[i]) + '</div>';
            }
            wins += '</div>';
        }
        if (youWin.length) {
            wins += '<div class="comp-h2h-wins"><div class="comp-h2h-wins-lbl comp-wins-you">Ты впереди</div>';
            for (var j = 0; j < youWin.length; j++) {
                if (_hasText(youWin[j])) wins += '<div class="comp-h2h-win-item comp-win-you"><i class="ti ti-arrow-up-right"></i>' + _esc(youWin[j]) + '</div>';
            }
            wins += '</div>';
        }

        var verdict = _hasText(h.verdict) ? '<div class="comp-h2h-verdict">' + _esc(h.verdict) + '</div>' : '';
        var edge = _hasText(h.your_edge)
            ? '<div class="comp-h2h-edge"><span class="comp-h2h-edge-lbl">Твой козырь:</span> ' + _esc(h.your_edge) + '</div>'
            : '';

        return '' +
            '<div class="comp-h2h-card">' +
                '<div class="comp-h2h-head">' +
                    '<span class="comp-h2h-you">ТЫ</span>' +
                    '<span class="comp-h2h-vs">vs</span>' +
                    '<span class="comp-h2h-them"' + (_hasText(h.username) ? ' data-open-ch="' + _esc(h.username) + '"' : '') + '>' + _esc(title) + '</span>' +
                '</div>' +
                verdict +
                (bars ? '<div class="comp-h2h-bars">' + bars + '</div>' : '') +
                wins +
                edge +
            '</div>';
    }

    function compareBar(label, mine, theirs, fmt) {
        if (mine == null && theirs == null) return '';
        var a = (mine == null || isNaN(mine)) ? 0 : Number(mine);
        var b = (theirs == null || isNaN(theirs)) ? 0 : Number(theirs);
        var total = a + b;
        var aPct = total > 0 ? Math.round((a / total) * 100) : 50;
        var bPct = 100 - aPct;
        var youWins = a >= b;
        var valStr = (fmt ? fmt(mine) : _num(mine)) + ' \u00b7 ' + (fmt ? fmt(theirs) : _num(theirs));
        return '' +
            '<div class="comp-cmp">' +
                '<div class="comp-cmp-top"><span>' + _esc(label) + '</span><span>' + _esc(valStr) + '</span></div>' +
                '<div class="comp-cmp-track">' +
                    '<div class="comp-cmp-mine ' + (youWins ? 'comp-cmp-win' : '') + '" style="width:' + Math.max(2, aPct) + '%"></div>' +
                    '<div class="comp-cmp-gap"></div>' +
                    '<div class="comp-cmp-theirs ' + (!youWins ? 'comp-cmp-win-them' : '') + '" style="width:' + Math.max(2, bPct) + '%"></div>' +
                '</div>' +
            '</div>';
    }

    function renderKillerMoves(report) {
        var moves = _g(report, 'their_killer_moves', []);
        if (!Array.isArray(moves) || moves.length === 0) return '';
        var items = '';
        for (var i = 0; i < moves.length; i++) {
            var mv = moves[i];
            if (!mv || typeof mv !== 'object' || !_hasText(mv.move)) continue;
            var youDo = mv.you_do_this === true;
            var badge = youDo
                ? '<span class="comp-move-badge comp-move-have">у тебя есть</span>'
                : '<span class="comp-move-badge comp-move-gap">у тебя нет</span>';
            var who = _hasText(mv.who_uses_it) ? '<div class="comp-move-who"><i class="ti ti-user"></i>' + _esc(mv.who_uses_it) + '</div>' : '';
            var ev = _hasText(mv.evidence) ? '<div class="comp-move-ev">' + _esc(mv.evidence) + '</div>' : '';
            items += '' +
                '<div class="comp-move ' + (youDo ? '' : 'comp-move-opportunity') + '">' +
                    '<div class="comp-move-head"><span class="comp-move-title">' + _esc(mv.move) + '</span>' + badge + '</div>' +
                    who + ev +
                '</div>';
        }
        if (!items) return '';
        return '' +
            '<div class="comp-block-label">Что у них набирает охват</div>' +
            '<div class="comp-moves">' + items + '</div>';
    }

    function renderGaps(report) {
        var gaps = _g(report, 'your_gaps', []);
        if (!Array.isArray(gaps) || gaps.length === 0) return '';
        var items = '';
        for (var i = 0; i < gaps.length; i++) {
            var g = gaps[i];
            if (!g || typeof g !== 'object' || !_hasText(g.gap)) continue;
            var opp = _hasText(g.opportunity) ? '<div class="comp-gap-opp"><i class="ti ti-arrow-right"></i>' + _esc(g.opportunity) + '</div>' : '';
            items += '' +
                '<div class="comp-gap">' +
                    '<div class="comp-gap-head"><i class="ti ti-target-arrow"></i><span class="comp-gap-title">' + _esc(g.gap) + '</span>' + _priorityBadge(g.priority) + '</div>' +
                    opp +
                '</div>';
        }
        if (!items) return '';
        return '' +
            '<div class="comp-block-label">Твои окна возможностей</div>' +
            '<div class="comp-gaps">' + items + '</div>';
    }

    function renderActionPlan(report) {
        var plan = _g(report, 'action_plan', []);
        if (!Array.isArray(plan) || plan.length === 0) return '';
        var items = '';
        var num = 1;
        for (var i = 0; i < plan.length; i++) {
            var p = plan[i];
            if (!p || typeof p !== 'object' || !_hasText(p.step)) continue;
            var why = _hasText(p.why) ? '<div class="comp-step-why">' + _esc(p.why) + '</div>' : '';
            var effect = _hasText(p.expected_effect) ? '<div class="comp-step-effect"><i class="ti ti-trending-up"></i>' + _esc(p.expected_effect) + '</div>' : '';
            var dd = (p.deadline_days != null && !isNaN(p.deadline_days)) ? '<span class="comp-step-dd">' + Math.round(p.deadline_days) + ' дн</span>' : '';
            items += '' +
                '<div class="comp-step">' +
                    '<div class="comp-step-num">' + num + '</div>' +
                    '<div class="comp-step-main">' +
                        '<div class="comp-step-head"><span class="comp-step-title">' + _esc(p.step) + '</span>' + _priorityBadge(p.priority) + dd + '</div>' +
                        why + effect +
                    '</div>' +
                '</div>';
            num++;
        }
        if (!items) return '';
        return '' +
            '<div class="comp-block-label">План обгона</div>' +
            '<div class="comp-plan">' + items + '</div>';
    }

    function renderDataQuality(report, meta) {
        var dq = _g(report, 'data_quality', null);
        var analyzed = _g(dq || {}, 'competitors_analyzed', null);
        if (analyzed == null && meta) analyzed = meta.competitors_analyzed;
        var note = _g(dq || {}, 'confidence_note', '');
        var parts = [];
        if (analyzed != null) parts.push('проанализировано конкурентов: ' + analyzed);
        if (_hasText(note)) parts.push(note);
        if (parts.length === 0) return '';
        return '<div class="comp-dq">' + _esc(parts.join(' \u00b7 ')) + '</div>';
    }

    function renderRerun() {
        return '' +
            '<button class="comp-secondary-btn comp-rerun" id="comp-rerun-btn">' +
                '<i class="ti ti-refresh"></i><span>Новый анализ</span>' +
            '</button>';
    }

    window.__openCompetitors = open;

})();