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
        'Ищу, что у них залетает...',
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
            .replace(/"/g, '&quot;');
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
        stopThinking();
        if (_screen) _screen.style.display = 'none';
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
                    '<div class="comp-intro-sub">AI найдёт каналы в твоей нише, проверит что они реальны, и покажет — что у них залетает, где они тебя обходят и как их обогнать.</div>' +
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

    function startFind() {
        showThinking(THINKING_SEARCH);
        apiPost('/api/v1/channels/' + _channelId + '/competitors/find-candidates')
            .then(function (res) {
                if (_closed) return;
                stopThinking();
                _candidates = (res && res.candidates) || [];
                _nicheSummary = (res && res.niche_summary) || '';
                if (res && res.max_selectable) _maxSelectable = res.max_selectable;
                renderSelect();
            })
            .catch(function (err) {
                if (_closed) return;
                handleFindError(err);
            });
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
                '<div class="comp-select-hint">Отмечай до <b>' + _maxSelectable + '</b> каналов. Все проверены — реально существуют.</div>' +
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

        requestAnimationFrame(function () { animateNicheMap(); });
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

    function renderNicheMap(report) {
        var map = _g(report, 'niche_map', []);
        if (!Array.isArray(map)) return '';
        var pts = [];
        for (var i = 0; i < map.length; i++) {
            var m = map[i];
            if (!m || typeof m !== 'object') continue;
            var reach = m.reach_percent;
            var ppw = m.posts_per_week;
            if (reach == null && ppw == null) continue;
            pts.push(m);
        }
        if (pts.length < 2) return '';

        var maxReach = 0, maxPpw = 0;
        for (var j = 0; j < pts.length; j++) {
            if (pts[j].reach_percent != null && pts[j].reach_percent > maxReach) maxReach = pts[j].reach_percent;
            if (pts[j].posts_per_week != null && pts[j].posts_per_week > maxPpw) maxPpw = pts[j].posts_per_week;
        }
        if (maxReach <= 0) maxReach = 1;
        if (maxPpw <= 0) maxPpw = 1;

        var W = 320, H = 172, padL = 34, padB = 26, padT = 14, padR = 16;
        var plotW = W - padL - padR, plotH = H - padT - padB;

        var dots = '';
        for (var k = 0; k < pts.length; k++) {
            var p = pts[k];
            var rx = padL + (Math.max(0, Math.min(1, (p.posts_per_week || 0) / maxPpw))) * plotW;
            var ry = padT + plotH - (Math.max(0, Math.min(1, (p.reach_percent || 0) / maxReach))) * plotH;
            var isYou = !!p.is_you;
            var label = isYou ? 'ТЫ' : ('@' + (p.username || ''));
            var dotColor = isYou ? '#818cf8' : (positionColor(p.position_label));
            var r = isYou ? 13 : 9;
            var cls = isYou ? 'comp-dot comp-dot-you' : 'comp-dot';
            dots += '<circle class="' + cls + '" cx="' + rx.toFixed(1) + '" cy="' + ry.toFixed(1) + '" r="' + r + '" ' +
                'fill="' + hexToRgba(dotColor, 0.28) + '" stroke="' + dotColor + '" stroke-width="' + (isYou ? 2.5 : 1.5) + '" ' +
                'style="opacity:0;' + (isYou ? 'filter:drop-shadow(0 0 7px ' + hexToRgba(dotColor, 0.6) + ');' : '') + '"></circle>';
            var labelY = ry - r - 5;
            dots += '<text class="comp-dot-lbl" x="' + rx.toFixed(1) + '" y="' + labelY.toFixed(1) + '" ' +
                'fill="' + (isYou ? '#AFA9EC' : '#9396ac') + '" font-size="' + (isYou ? 10 : 9) + '" ' +
                'font-weight="' + (isYou ? '600' : '400') + '" text-anchor="middle" style="opacity:0;">' + _esc(label) + '</text>';
        }

        return '' +
            '<div class="comp-block-label">Карта ниши · охват \u00d7 частота</div>' +
            '<div class="comp-map-wrap">' +
                '<div class="comp-map-axis-y">охват \u2192</div>' +
                '<div class="comp-map-axis-x">частота \u2192</div>' +
                '<svg class="comp-map-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +
                    '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + plotH) + '" stroke="rgba(255,255,255,0.08)" stroke-width="1"></line>' +
                    '<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (W - padR) + '" y2="' + (padT + plotH) + '" stroke="rgba(255,255,255,0.08)" stroke-width="1"></line>' +
                    dots +
                '</svg>' +
            '</div>';
    }

    function positionColor(label) {
        if (label === 'leader') return '#F0997B';
        if (label === 'challenger') return '#fbbf24';
        if (label === 'laggard') return '#6b7088';
        return '#9396ac';
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

    function animateNicheMap() {
        var dots = document.querySelectorAll('.comp-map-svg .comp-dot:not(.comp-dot-you)');
        var lbls = document.querySelectorAll('.comp-map-svg .comp-dot-lbl');
        for (var i = 0; i < dots.length; i++) {
            (function (d, idx) {
                setTimeout(function () { d.style.transition = 'opacity 0.5s ease'; d.style.opacity = '1'; }, idx * 140);
            })(dots[i], i);
        }
        for (var j = 0; j < lbls.length; j++) {
            (function (l, idx) {
                setTimeout(function () { l.style.transition = 'opacity 0.5s ease'; l.style.opacity = '1'; }, idx * 140 + 150);
            })(lbls[j], j);
        }
        var you = document.querySelector('.comp-map-svg .comp-dot-you');
        if (you) setTimeout(function () { you.style.transition = 'opacity 0.6s ease'; you.style.opacity = '1'; }, dots.length * 140 + 200);
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
                    '<span class="comp-h2h-them">' + _esc(title) + '</span>' +
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
            '<div class="comp-block-label">Что у них залетает</div>' +
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