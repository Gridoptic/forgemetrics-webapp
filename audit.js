(function () {
    'use strict';

    var _channelId = null;
    var _entryMode = null;
    var _currentAuditId = null;
    var _pollTimer = null;
    var _pollAttempts = 0;
    var _thinkingTimer = null;
    var _thinkingIndex = 0;
    var _backHandlerBound = false;

    var THINKING_TEXTS = [
        'Собираю последние посты канала...',
        'Считаю охват и динамику...',
        'Смотрю что заходит, а что нет...',
        'Ищу главный инсайт...',
        'Считаю деньги и потенциал...',
        'Формулирую план роста...',
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
            .replace(/'/g, '&#39;');
    }

    function _g(obj, path, dflt) {
        try {
            var parts = path.split('.');
            var cur = obj;
            for (var i = 0; i < parts.length; i++) {
                if (cur == null) return dflt;
                cur = cur[parts[i]];
            }
            return (cur === null || cur === undefined) ? dflt : cur;
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
        if (n >= 10000) return Math.floor(n / 1000) + 'к';
        if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'к';
        return String(Math.round(n));
    }

    function _rub(n) {
        if (n == null || isNaN(n)) return null;
        try {
            return Number(n).toLocaleString('ru-RU') + ' ₽';
        } catch (e) {
            return Math.round(Number(n)) + ' ₽';
        }
    }

    function _zone(score) {
        if (score == null) {
            return { key: 'amber', color: '#f59e0b', light: '#fcd34d', label: 'Средняя зона' };
        }
        score = Number(score);
        if (isNaN(score)) {
            return { key: 'amber', color: '#f59e0b', light: '#fcd34d', label: 'Средняя зона' };
        }
        if (score >= 70) return { key: 'green', color: '#1D9E75', light: '#5DCAA5', label: 'Сильная зона' };
        if (score >= 45) return { key: 'amber', color: '#f59e0b', light: '#fcd34d', label: 'Средняя зона' };
        return { key: 'coral', color: '#D85A30', light: '#F0997B', label: 'Слабая зона' };
    }

    function _priorityBadge(priority) {
        var p = (priority || '').toLowerCase();
        if (p === 'critical') return '<span class="audit-pri audit-pri-critical">критично</span>';
        if (p === 'important') return '<span class="audit-pri audit-pri-important">важно</span>';
        if (p === 'minor') return '<span class="audit-pri audit-pri-minor">не срочно</span>';
        return '';
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

    function ensureScreen() {
        var host = document.getElementById('audit-screen');
        if (!host) {
            host = document.createElement('div');
            host.id = 'audit-screen';
            host.className = 'audit-screen';
            var root = document.getElementById('app') || document.body;
            root.appendChild(host);
        }
        host.style.display = 'flex';
        document.documentElement.classList.add('cs-modal-open');
        document.documentElement.classList.add('audit-open');
        document.body.classList.add('cs-modal-open');
        bindBackButton();
        return host;
    }

    function bindBackButton() {
        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(closeAudit);
                tg.BackButton.onClick(closeAudit);
                tg.BackButton.show();
                _backHandlerBound = true;
            }
        } catch (e) {}
    }

    function closeAudit() {
        stopPolling();
        stopThinking();
        document.documentElement.classList.remove('audit-open');
        var host = document.getElementById('audit-screen');
        if (host) host.style.display = 'none';

        var settingsOpen = false;
        var cs = document.getElementById('channel-settings-screen');
        if (cs && cs.style.display !== 'none' && cs.style.display !== '') settingsOpen = true;
        if (cs && getComputedStyle(cs).display !== 'none') settingsOpen = true;

        try {
            if (typeof tg !== 'undefined' && tg && tg.BackButton) {
                tg.BackButton.offClick(closeAudit);
                if (settingsOpen && typeof closeChannelSettings === 'function') {
                    tg.BackButton.onClick(closeChannelSettings);
                    tg.BackButton.show();
                } else {
                    tg.BackButton.hide();
                }
            }
        } catch (e) {}
        _backHandlerBound = false;

        if (!settingsOpen) {
            document.documentElement.classList.remove('cs-modal-open');
            document.body.classList.remove('cs-modal-open');
        }

        if (typeof refreshDashboardSilent === 'function') {
            try { refreshDashboardSilent(); } catch (e) {}
        }
    }

    function headerHtml(title) {
        var t = title || (_entryMode === 'deep' ? 'Коммерческий аудит' : 'AI-аудит канала');
        return '' +
            '<div class="audit-header">' +
                '<button class="audit-back" id="audit-back-btn"><i class="ti ti-arrow-left"></i></button>' +
                '<div class="audit-header-title">' + _esc(t) + '</div>' +
                '<div class="audit-header-spacer"></div>' +
            '</div>';
    }

    function attachBack(host) {
        var b = host.querySelector('#audit-back-btn');
        if (b) b.addEventListener('click', closeAudit);
    }

    function showLoading(text) {
        var host = ensureScreen();
        host.innerHTML = headerHtml() +
            '<div class="audit-center">' +
                '<div class="loading-spinner"></div>' +
                '<div class="audit-center-text">' + _esc(text || 'Загружаю...') + '</div>' +
            '</div>';
        attachBack(host);
    }

    function showThinking() {
        var host = ensureScreen();
        host.innerHTML = headerHtml() +
            '<div class="audit-center">' +
                '<div class="thinking-orb"><div class="thinking-orb-inner"></div><div class="thinking-orb-pulse"></div></div>' +
                '<div class="thinking-text" id="audit-thinking-text">' + _esc(THINKING_TEXTS[0]) + '</div>' +
                '<div class="audit-thinking-hint">Это занимает 20–40 секунд. Можно свернуть — аудит не прервётся.</div>' +
            '</div>';
        attachBack(host);
        startThinking();
    }

    function startThinking() {
        stopThinking();
        _thinkingIndex = 0;
        _thinkingTimer = setInterval(function () {
            _thinkingIndex = (_thinkingIndex + 1) % THINKING_TEXTS.length;
            var el = document.getElementById('audit-thinking-text');
            if (!el) return;
            el.style.opacity = '0';
            setTimeout(function () {
                var el2 = document.getElementById('audit-thinking-text');
                if (!el2) return;
                el2.textContent = THINKING_TEXTS[_thinkingIndex];
                el2.style.opacity = '1';
            }, 200);
        }, 2000);
    }

    function stopThinking() {
        if (_thinkingTimer) {
            clearInterval(_thinkingTimer);
            _thinkingTimer = null;
        }
    }

    function showFatalError(text, opts) {
        opts = opts || {};
        var host = ensureScreen();
        var actionBtn = '';
        if (opts.retry) {
            actionBtn = '<button class="audit-primary-btn" id="audit-error-retry"><i class="ti ti-refresh"></i><span>Попробовать снова</span></button>';
        }
        host.innerHTML = headerHtml() +
            '<div class="audit-center">' +
                '<div class="audit-error-icon"><i class="ti ' + _esc(opts.icon || 'ti-alert-triangle') + '"></i></div>' +
                '<div class="audit-error-text">' + _esc(text) + '</div>' +
                actionBtn +
            '</div>';
        attachBack(host);
        var r = host.querySelector('#audit-error-retry');
        if (r) r.addEventListener('click', function () { startAudit(); });
    }

    function limitBarHtml(limits) {
        if (!limits) return '';
        var isTester = !!limits.is_tester;
        var balance = Number(limits.balance || 0);
        var price = Number(limits.price || 0);
        var enough = isTester || balance >= price;
        var fa = (window.forgeAmount || function (n) { return String(n); });

        var right = '<span class="fw-inline-bal">' + fa(balance, 14) + '</span>';
        var note = enough
            ? '<div class="fwb-note">Запуск спишет ' + price + ' Forge</div>'
            : '<div class="fwb-note fwb-low">Не хватает Forge: нужно ' + price + ', на балансе ' + balance + '</div>';

        return '' +
            '<div class="limit-row limit-row-purple' + (enough ? '' : ' limit-row-exhausted') + '">' +
                '<div class="limit-row-head">' +
                    '<span class="limit-row-icon"><i class="ti ti-chart-dots"></i></span>' +
                    '<span class="limit-row-label">AI-аудит</span>' +
                    right +
                '</div>' + note +
            '</div>';
    }

    function canRun(limits) {
        if (!limits) return true;
        if (limits.is_tester) return true;
        if (typeof limits.can_run === 'boolean') return limits.can_run;
        return true;
    }

    function renderIntro(limits) {
        var host = ensureScreen();
        var runnable = canRun(limits);
        var fa = (window.forgeAmount || function (n) { return String(n); });
        var price = limits ? Number(limits.price || 0) : 0;

        var btnHtml;
        if (!runnable) {
            btnHtml = '<button class="audit-primary-btn" id="audit-intro-topup"><i class="ti ti-bolt"></i>' +
                '<span>Пополнить баланс</span></button>';
        } else {
            btnHtml = '<button class="audit-primary-btn" id="audit-intro-start"><i class="ti ti-sparkles"></i>' +
                '<span>Запустить аудит · ' + price + ' Forge</span></button>';
        }

        host.innerHTML = headerHtml() +
            '<div class="audit-body">' +
                '<div class="audit-intro-hero">' +
                    '<div class="audit-intro-icon"><i class="ti ti-chart-dots"></i></div>' +
                    '<div class="audit-intro-title">Полный разбор канала</div>' +
                    '<div class="audit-intro-sub">AI проанализирует последние посты, охваты и динамику — и выдаст честную оценку, главный инсайт, прогноз роста и план действий.</div>' +
                '</div>' +
                '<div class="audit-intro-feats">' +
                    introFeat('chart-arcs', 'Оценка и разбивка', 'Где сильно, где проседает') +
                    introFeat('bulb', 'Главный инсайт', 'То, что ты сам не видишь') +
                    introFeat('trending-up', 'Прогноз на 90 дней', 'Что будет, если менять и если нет') +
                    introFeat('coin', 'Деньги', 'Цена рекламы и потенциал') +
                    introFeat('list-check', 'План роста', 'Конкретные шаги с дедлайнами') +
                '</div>' +
                limitBarHtml(limits) +
                btnHtml +
                '<div class="audit-intro-foot">Анализ занимает 20–40 секунд</div>' +
            '</div>';
        attachBack(host);

        var s = host.querySelector('#audit-intro-start');
        if (s) s.addEventListener('click', function () { _haptic('medium'); startAudit(); });
        var pr = host.querySelector('#audit-intro-topup');
        if (pr) pr.addEventListener('click', function () {
            closeAudit();
            if (typeof openCabinet === 'function') openCabinet('forge');
            else if (typeof handleAction === 'function') handleAction('profile');
        });
    }

    function _caDiff(icon, cls, title, text) {
        return '<div class="ca-dr"><div class="ca-dico ' + cls + '"><i class="ti ti-' + icon + '"></i></div>' +
            '<div><b>' + _esc(title) + '</b><p>' + _esc(text) + '</p></div></div>';
    }

    function renderCommercialIntro(limits) {
        var host = ensureScreen();
        var canDeep = limits && (limits.can_run_deep || limits.is_tester);
        var priceDeep = limits ? Number(limits.price_deep || 0) : 0;
        var ctaHtml;
        if (canDeep) {
            ctaHtml = '<button class="audit-deep-btn" id="ca-start"><i class="ti ti-briefcase"></i>' +
                '<span>Запустить коммерческий аудит · ' + priceDeep + ' Forge' + '</span></button>';
        } else {
            ctaHtml = '<div class="ca-ctarow"><span class="l">Списывается с баланса · отчёт сохраняется</span><b>' + priceDeep + ' Forge</b></div>' +
                '<button class="audit-deep-btn" id="ca-buy"><i class="ti ti-bolt"></i><span>Пополнить баланс</span></button>';
        }
        host.innerHTML = headerHtml('Коммерческий аудит') +
            '<div class="audit-body">' +
                '<div class="ca-hero">' +
                    '<div class="ca-htop">' +
                        '<div class="ca-hico"><i class="ti ti-briefcase"></i></div>' +
                        '<div><div class="ca-hname">Сколько стоит твоя площадка</div>' +
                        '<div class="ca-hsub">Оценка канала как рекламной площадки — глазами рекламодателя</div></div>' +
                    '</div>' +
                    '<div class="ca-hprev">' +
                        '<div class="l"><span>Пример: охват поста</span><b>топ-18% ниши</b></div>' +
                        '<div class="ca-hbar"><i></i></div>' +
                        '<div class="cap">Так выглядит твоя позиция среди всех каналов ниши — эти цифры не видны ни в карточках Площадки, ни в обычном разборе</div>' +
                    '</div>' +
                '</div>' +
                '<div class="ca-secl">Чего нет больше нигде</div>' +
                '<div class="ca-diff">' +
                    _caDiff('chart-bar', 'g', 'Позиция канала на рынке ниши',
                        'Место по охвату, вовлечённости и цене среди всех каналов ниши — в формате «охват в топ-18%». Карточки Площадки показывают чужие метрики — здесь видно положение собственной площадки на их фоне.') +
                    _caDiff('wallet', 'a', 'Аудит прайса и упущенный доход',
                        'Рыночная вилка стоимости размещения под фактический охват, рекомендованная цена каждого формата и оценка недополученного дохода за месяц при текущем прайсе.') +
                    _caDiff('shield-check', 'v', 'Верификация качества трафика',
                        'Кривая набора просмотров с вердиктом о накрутке — объективный аргумент в переговорах, закрывающий главное возражение рекламодателя.') +
                '</div>' +
                '<div class="ca-inc">' +
                    '<div class="t">Также в отчёте</div>' +
                    '<div class="ca-chips">' +
                        '<span class="ca-chip"><i class="ti ti-users"></i> <span>Гео, пол и язык аудитории</span></span>' +
                        '<span class="ca-chip"><i class="ti ti-layout-grid"></i> <span>Форматы, которые работают</span></span>' +
                        '<span class="ca-chip"><i class="ti ti-clock"></i> <span>Пиковые часы охвата</span></span>' +
                        '<span class="ca-chip"><i class="ti ti-list-check"></i> <span>План продаж на 30 дней</span></span>' +
                    '</div>' +
                '</div>' +
                ctaHtml +
                '<div class="audit-intro-foot">Отчёт формируется за 20–40 секунд и сохраняется в истории разборов</div>' +
            '</div>';
        attachBack(host);

        var s = host.querySelector('#ca-start');
        if (s) s.addEventListener('click', function () { _haptic('medium'); startAudit(true); });
        var b = host.querySelector('#ca-buy');
        if (b) b.addEventListener('click', function () {
            _haptic('medium');
            closeAudit();
            if (typeof openCabinet === 'function') openCabinet('forge');
        });
    }

    function introFeat(icon, title, sub) {
        return '' +
            '<div class="audit-intro-feat">' +
                '<div class="audit-intro-feat-icon"><i class="ti ti-' + icon + '"></i></div>' +
                '<div class="audit-intro-feat-text">' +
                    '<div class="audit-intro-feat-title">' + _esc(title) + '</div>' +
                    '<div class="audit-intro-feat-sub">' + _esc(sub) + '</div>' +
                '</div>' +
            '</div>';
    }

    function startAudit(deep) {
        if (!_channelId) return;
        showThinking();
        apiRequest('/api/v1/channels/' + _channelId + '/audit/start' + (deep ? '?deep=1' : ''), { method: 'POST' })
            .then(function (res) {
                _currentAuditId = res && res.audit_id;
                if (!_currentAuditId) {
                    stopThinking();
                    showFatalError('Не удалось запустить аудит. Попробуй ещё раз.', { retry: true });
                    return;
                }
                startPolling(_currentAuditId);
            })
            .catch(function (err) {
                stopThinking();
                handleStartError(err);
            });
    }

    function detailFrom(message) {
        var m = message || '';
        var idx = m.indexOf(': ');
        if (idx !== -1) return m.slice(idx + 2).trim();
        return m;
    }

    function handleStartError(err) {
        var m = (err && err.message) || '';
        if (m.indexOf('409') !== -1) {
            startPollingExisting();
            return;
        }
        if (m.indexOf('429') !== -1) {
            showFatalError(detailFrom(m) || 'Не хватает Forge на запуск аудита.', { icon: 'ti-clock' });
            return;
        }
        if (m.indexOf('403') !== -1) {
            showFatalError(detailFrom(m) || 'Доступ к аудиту ограничен.', { icon: 'ti-lock' });
            return;
        }
        if (m.indexOf('400') !== -1) {
            showFatalError(detailFrom(m) || 'Этот канал нельзя проанализировать.', { icon: 'ti-alert-triangle' });
            return;
        }
        if (m.indexOf('401') !== -1) {
            showFatalError('Сессия истекла. Переоткрой приложение.', { icon: 'ti-alert-triangle' });
            return;
        }
        showFatalError('Что-то пошло не так. Попробуй ещё раз.', { retry: true });
    }

    function startPollingExisting() {
        showThinking();
        apiRequest('/api/v1/channels/' + _channelId + '/audit/latest')
            .then(function () {
                _pollAttempts = 0;
                pollByChannel();
            })
            .catch(function () {
                showFatalError('Аудит этого канала уже выполняется. Загляни чуть позже.', { icon: 'ti-clock' });
            });
    }

    function pollByChannel() {
        stopPolling();
        _pollAttempts = 0;
        _pollTimer = setInterval(function () {
            _pollAttempts++;
            if (_pollAttempts > 70) {
                stopPolling(); stopThinking();
                showFatalError('Аудит занимает дольше обычного. Открой его позже из меню.', { icon: 'ti-clock' });
                return;
            }
            apiRequest('/api/v1/channels/' + _channelId + '/audit/latest')
                .then(function (data) {
                    if (data && data.found && data.audit && data.audit.report) {
                        stopPolling(); stopThinking();
                        renderReport(data.audit);
                    }
                })
                .catch(function () {});
        }, 3500);
    }

    function startPolling(auditId) {
        stopPolling();
        _pollAttempts = 0;
        _pollTimer = setInterval(function () {
            _pollAttempts++;
            if (_pollAttempts > 70) {
                stopPolling(); stopThinking();
                showFatalError('Аудит занимает дольше обычного. Открой его позже из меню.', { icon: 'ti-clock' });
                return;
            }
            apiRequest('/api/v1/audits/' + auditId)
                .then(function (a) {
                    if (!a) return;
                    if (a.status === 'done') {
                        stopPolling(); stopThinking();
                        _haptic('success');
                        renderReport(a);
                    } else if (a.status === 'failed') {
                        stopPolling(); stopThinking();
                        _haptic('error');
                        showFatalError(
                            _hasText(a.error_message) ? a.error_message : 'Не удалось завершить аудит. Лимит возвращён — попробуй ещё раз.',
                            { retry: true }
                        );
                    }
                })
                .catch(function () {});
        }, 3500);
    }

    function stopPolling() {
        if (_pollTimer) {
            clearInterval(_pollTimer);
            _pollTimer = null;
        }
    }

    function renderReport(audit) {
        var host = ensureScreen();
        var r = (audit && audit.report) || {};
        if (r.deep) { renderDeepReport(audit, r); return; }
        var score = (audit && audit.score != null) ? audit.score : _g(r, 'score', null);
        var zone = _zone(score);

        var html = headerHtml() +
            '<div class="audit-body" id="audit-report-body">' +
                renderHero(r, score, zone) +
                renderKiller(r) +
                renderMetrics(r) +
                renderForecast(r) +
                renderPosts(r) +
                renderBestTime(r) +
                renderContentAnalysis(r) +
                renderSections(r) +
                renderDataQuality(r) +
                '<button class="audit-secondary-btn" id="audit-rerun-btn"><i class="ti ti-refresh"></i><span>Запустить новый аудит</span></button>' +
                '<div class="audit-rerun-note" id="audit-rerun-note"></div>' +
            '</div>';
        host.innerHTML = html;
        attachBack(host);

        var rerun = host.querySelector('#audit-rerun-btn');
        if (rerun) rerun.addEventListener('click', function () {
            _haptic('medium');
            confirmRerun();
        });

        attachAccordion(host);
        animateScore(score, zone, r);
        loadRerunNote();
    }

    function _daNum(n) {
        if (n == null) return '';
        try { return Number(n).toLocaleString('ru-RU'); } catch (e) { return String(n); }
    }

    function _daSection(icon, title, hint, inner) {
        return '<div class="audit-card da-card">' +
            '<div class="da-sechead"><span class="da-ic">' + icon + '</span><b>' + _esc(title) + '</b>' +
            (hint ? '<span class="da-hint">' + _esc(hint) + '</span>' : '') + '</div>' + inner + '</div>';
    }

    function _daPctRow(label, pct, accent) {
        if (pct == null) return '';
        var top = Math.max(1, 100 - pct);
        var col = accent ? 'linear-gradient(90deg,#2b8f6f,#5DCAA5)' : 'linear-gradient(90deg,#4649b8,#6366f1)';
        return '<div class="da-pctrow"><div class="da-pctlbl"><span>' + _esc(label) + '</span>' +
            '<span' + (accent ? ' style="color:#5DCAA5"' : '') + '>топ-' + top + '%</span></div>' +
            '<div class="da-bar"><i style="width:' + pct + '%;background:' + col + '"></i></div></div>';
    }

    function renderDeepHero(r, score) {
        var v = _g(r, 'verdict', {}) || {};
        var pctFill = (score != null) ? Math.max(0, Math.min(100, score)) : 0;
        var rows = '';
        var defs = [
            ['#5DCAA5', 'Сильное', v.strong],
            ['#ef4444', 'Слабое', v.weak],
            ['#f0b45a', 'Главное действие', v.action],
        ];
        defs.forEach(function (d) {
            if (!_hasText(d[2])) return;
            rows += '<div class="da-vrow"><span class="da-vdot" style="background:' + d[0] + '"></span>' +
                '<span><b>' + _esc(d[1]) + ':</b> ' + _esc(d[2]) + '</span></div>';
        });
        return '<div class="da-hero">' +
            '<span class="da-badge">◆ Коммерческий аудит</span>' +
            '<div class="da-herorow"><div class="da-herotxt">' +
            '<div class="da-heroname">Коммерческий разбор площадки</div>' +
            '<div class="da-herosub">позиция в нише · качество трафика · цены</div></div>' +
            (score != null
                ? '<div class="da-ring" style="background:conic-gradient(#f0b45a 0 ' + pctFill + '%,rgba(255,255,255,0.08) ' + pctFill + '% 100%)"><i>' + score + '</i></div>'
                : '') +
            '</div>' +
            (rows ? '<div class="da-vrd">' + rows + '</div>' : '') +
            '</div>';
    }

    function renderDeepPosition(r) {
        var d = (r.data || {});
        var pct = d.pct || {};
        var price = d.price || {};
        var inner = '';
        inner += _daPctRow('Охват поста', pct.reach, pct.reach != null && pct.reach >= 70);
        inner += _daPctRow('Вовлечённость (ER)', pct.er, pct.er != null && pct.er >= 70);
        inner += _daPctRow('Частота выхода постов', pct.freq, pct.freq != null && pct.freq >= 70);
        if (!inner) inner = '<div class="da-empty">Недостаточно данных ниши для сравнения</div>';
        if (price.lo && price.hi) {
            var lo = price.min || Math.round(price.lo * 0.7);
            var hi = price.max || Math.round(price.hi * 1.25);
            var span = Math.max(1, hi - lo);
            var youHtml = '';
            if (price.now) {
                var x = Math.max(2, Math.min(98, Math.round((price.now - lo) * 100 / span)));
                youHtml = '<span class="da-youl" style="left:' + x + '%">ты · ' + _daNum(price.now) + ' ₽</span>' +
                    '<span class="da-you" style="left:' + x + '%"></span>';
            }
            inner += '<div class="da-pricebox">' +
                '<div class="da-pt">Цена поста 1/24 против рыночной вилки ниши</div>' +
                '<div class="da-range">' + youHtml + '</div>' +
                '<div class="da-rangel"><span>' + _daNum(lo) + ' ₽</span>' +
                '<span>вилка ' + _daNum(price.lo) + '–' + _daNum(price.hi) + ' ₽</span>' +
                '<span>' + _daNum(hi) + '+</span></div>' +
                (_hasText(r.position_note) ? '<div class="da-note">' + _esc(r.position_note) + '</div>' : '') +
                '</div>';
        } else if (_hasText(r.position_note)) {
            inner += '<div class="da-note" style="margin-top:10px">' + _esc(r.position_note) + '</div>';
        }
        var pool = d.pool ? ((d.pool_wide ? 'вся база · ' : '') + d.pool + ' каналов') : '';
        return _daSection('▦', 'Позиция в нише', pool, inner);
    }

    function renderDeepTraffic(r) {
        var d = (r.data || {});
        var curve = (d.curve || {});
        var flag = curve.flag;
        var pts = curve.points || null;
        if (!flag && !pts && !_hasText(r.traffic_note)) return '';
        var pill;
        if (flag === 'clean' || (!flag && pts)) {
            pill = '<span class="da-pill da-pill-ok">● Трафик живой</span>';
        } else if (flag) {
            pill = '<span class="da-pill da-pill-warn">● Есть признаки накрутки</span>';
        } else {
            pill = '<span class="da-pill da-pill-mute">● Замеры кривой ещё копятся</span>';
        }
        var svg = '';
        if (pts && typeof pts === 'object') {
            var arr = [];
            Object.keys(pts).forEach(function (k) {
                var h = parseFloat(k);
                if (!isNaN(h) && typeof pts[k] === 'number') arr.push([h, pts[k]]);
            });
            arr.sort(function (a, b) { return a[0] - b[0]; });
            if (arr.length >= 3) {
                var maxH = arr[arr.length - 1][0];
                var line = arr.map(function (p) {
                    var x = Math.round(4 + (Math.sqrt(p[0]) / Math.sqrt(maxH)) * 112);
                    var y = Math.round(56 - (Math.min(100, p[1]) / 100) * 50);
                    return x + ',' + y;
                }).join(' ');
                svg = '<svg width="120" height="64" viewBox="0 0 120 64">' +
                    '<polyline points="4,56 ' + line + '" fill="none" stroke="#5DCAA5" stroke-width="2.5" stroke-linecap="round"/>' +
                    '<text x="2" y="63" fill="#565b73" font-size="7">старт</text>' +
                    '<text x="100" y="63" fill="#565b73" font-size="7">' + Math.round(maxH) + 'ч</text></svg>';
            }
        }
        var inner = '<div class="da-fraud">' + svg +
            '<div class="da-fraudtxt">' + pill +
            (_hasText(r.traffic_note) ? '<div class="da-note" style="margin-top:6px">' + _esc(r.traffic_note) + '</div>' : '') +
            '</div></div>';
        return _daSection('✓', 'Проверка трафика', 'кривая набора просмотров', inner);
    }

    function renderDeepAudience(r) {
        var d = (r.data || {});
        var a = d.audience || {};
        var tiles = '';
        if (a.geo) tiles += '<div class="da-demtile"><div class="v">' + _esc(String(a.geo).toUpperCase()) + '</div><div class="l">ОСНОВНОЕ ГЕО</div></div>';
        if (a.female_pct != null) {
            var male = 100 - a.female_pct;
            tiles += '<div class="da-demtile"><div class="v">' + (male >= 50 ? 'М ' + male : 'Ж ' + a.female_pct) + '%</div><div class="l">ПОЛ АУДИТОРИИ</div></div>';
        }
        if (a.lang) tiles += '<div class="da-demtile"><div class="v">' + _esc(String(a.lang).toUpperCase()) + '</div><div class="l">ЯЗЫК</div></div>';
        if (!tiles && !_hasText(r.audience_note)) return '';
        var inner = (tiles ? '<div class="da-demrow">' + tiles + '</div>' : '<div class="da-empty">Портрет аудитории ещё собирается</div>') +
            (_hasText(r.audience_note) ? '<div class="da-insight">' + _esc(r.audience_note) + '</div>' : '');
        return _daSection('◉', 'Аудитория', 'гео · пол · язык', inner);
    }

    function renderDeepContent(r) {
        var c = _g(r, 'content', {}) || {};
        var d = (r.data || {});
        var rows = '';
        (c.top || []).slice(0, 3).forEach(function (f) {
            rows += '<div class="da-fmt"><span class="da-tag da-tag-top">ТОП</span><span class="da-fmtl">' + _esc(f.label || '') + '</span>' +
                (_hasText(f.metric) ? '<span class="da-fmtm" style="color:#5DCAA5">' + _esc(f.metric) + '</span>' : '') + '</div>' +
                (_hasText(f.note) ? '<div class="da-fmtnote">' + _esc(f.note) + '</div>' : '');
        });
        (c.weak || []).slice(0, 2).forEach(function (f) {
            rows += '<div class="da-fmt"><span class="da-tag da-tag-weak">СЛАБО</span><span class="da-fmtl">' + _esc(f.label || '') + '</span>' +
                (_hasText(f.metric) ? '<span class="da-fmtm" style="color:#f87171">' + _esc(f.metric) + '</span>' : '') + '</div>' +
                (_hasText(f.note) ? '<div class="da-fmtnote">' + _esc(f.note) + '</div>' : '');
        });
        var hoursHtml = '';
        var hrs = d.hours || [];
        if (hrs.length) {
            var cells = '';
            hrs.forEach(function (b) {
                var op = Math.max(0.05, Math.min(0.85, (b.w || 0) * 0.85));
                cells += '<div class="da-h"><div class="da-hc" style="background:rgba(93,202,165,' + op.toFixed(2) + ')"></div>' + _esc(b.h) + '</div>';
            });
            hoursHtml = '<div class="da-hours">' + cells + '</div>' +
                '<div class="da-hourslbl">относительный охват по времени выхода (UTC)</div>' +
                (_hasText(c.hours_note) ? '<div class="da-note" style="margin-top:7px">' + _esc(c.hours_note) + '</div>' : '');
        } else if (_hasText(c.hours_note)) {
            hoursHtml = '<div class="da-note" style="margin-top:7px">' + _esc(c.hours_note) + '</div>';
        }
        if (!rows && !hoursHtml) return '';
        return _daSection('▤', 'Контент: что работает', 'по последним постам', rows + hoursHtml);
    }

    function renderDeepMonetize(r) {
        var m = _g(r, 'monetize', {}) || {};
        var rows = '';
        (m.formats || []).slice(0, 4).forEach(function (f) {
            rows += '<div class="da-mon"><span>' + _esc(f.label || '') + '</span><span class="da-monp">' +
                (f.price_now_rub ? '<s>' + _daNum(f.price_now_rub) + '</s> ' : '') +
                _daNum(f.price_reco_rub) + ' ₽</span></div>';
        });
        var fc = '';
        if (m.monthly_lo_rub && m.monthly_hi_rub) {
            fc = '<div class="da-fc"><div class="t">Потенциал дохода</div>' +
                '<div class="v">' + _daNum(m.monthly_lo_rub) + ' – ' + _daNum(m.monthly_hi_rub) + ' ₽/мес</div>' +
                ((_hasText(m.note) || _hasText(m.stage))
                    ? '<div class="s">' + _esc(m.note || '') + (_hasText(m.stage) ? ' Стадия: ' + _esc(m.stage) + '.' : '') + '</div>'
                    : '') + '</div>';
        } else if (_hasText(m.note)) {
            fc = '<div class="da-note" style="margin-top:9px">' + _esc(m.note) + '</div>';
        }
        if (!rows && !fc) return '';
        return _daSection('₽', 'Монетизация', 'честные цены форматов', rows + fc);
    }

    function renderDeepPlan(r) {
        var plan = _g(r, 'plan', []) || [];
        if (!plan.length) return '';
        var pmap = { critical: ['критично', 'da-pri-c'], important: ['важно', 'da-pri-i'], minor: ['не срочно', 'da-pri-m'] };
        var rows = '';
        plan.slice(0, 7).forEach(function (p, i) {
            var pri = pmap[p.pri] || null;
            rows += '<div class="da-plan"><span class="da-plann">' + (i + 1) + '</span><span>' + _esc(p.text || '') +
                (pri ? '<span class="da-pri ' + pri[1] + '">' + pri[0] + '</span>' : '') + '</span></div>';
        });
        return _daSection('➤', 'План на 30 дней', '', rows);
    }

    function renderDeepReport(audit, r) {
        var host = ensureScreen();
        var score = (audit && audit.score != null) ? audit.score : _g(r, 'score', null);
        var dq = _g(r, 'data_quality', {}) || {};
        var html = headerHtml('Коммерческий аудит') +
            '<div class="audit-body" id="audit-report-body">' +
                renderDeepHero(r, score) +
                renderDeepPosition(r) +
                renderDeepTraffic(r) +
                renderDeepAudience(r) +
                renderDeepContent(r) +
                renderDeepMonetize(r) +
                renderDeepPlan(r) +
                (_hasText(dq.confidence_note)
                    ? '<div class="da-foot">' + _esc(dq.confidence_note) + '</div>' : '') +
            '</div>';
        host.innerHTML = html;
        attachBack(host);
    }

    function confirmRerun() {
        var doRun = function () { startAudit(); };
        if (typeof confirmDialog === 'function') {
            confirmDialog('Запустить новый аудит канала? Это потратит 1 аудит из месячного лимита.')
                .then(function (ok) { if (ok) doRun(); });
        } else {
            doRun();
        }
    }

    function loadRerunNote() {
        apiRequest('/api/v1/audits/limits')
            .then(function (limits) {
                var note = document.getElementById('audit-rerun-note');
                if (!note || !limits) return;
                note.textContent = 'На балансе ' + Number(limits.balance || 0).toLocaleString('ru-RU')
                    + ' Forge · аудит стоит ' + Number(limits.price || 0);
            })
            .catch(function () {});
    }

    function renderHero(r, score, zone) {
        var verdict = _g(r, 'verdict', '');
        var bd = _g(r, 'score_breakdown', null);
        var scoreNum = (score == null || isNaN(Number(score))) ? '—' : Math.round(Number(score));

        var benchHtml = '';
        var reachVerdict = _g(r, 'metrics_snapshot.reach_verdict', null);
        if (reachVerdict) {
            var bm = { below_norm: 'Охват ниже нормы ниши', normal: 'Охват в норме ниши', strong: 'Охват сильнее ниши' };
            if (bm[reachVerdict]) {
                benchHtml = '<div class="audit-bench" id="audit-bench">' +
                    '<i class="ti ti-flame"></i><span>' + _esc(bm[reachVerdict]) + '</span></div>';
            }
        }

        var barsHtml = '';
        if (bd) {
            var defs = [
                { key: 'content', label: 'Контент', color: '#5DCAA5' },
                { key: 'reach', label: 'Охват', color: '#f59e0b' },
                { key: 'consistency', label: 'Регулярность', color: '#F0997B' },
                { key: 'monetization', label: 'Монетизация', color: '#818cf8' },
            ];
            var rows = '';
            for (var i = 0; i < defs.length; i++) {
                var v = bd[defs[i].key];
                if (v == null || isNaN(Number(v))) continue;
                v = Math.max(0, Math.min(100, Math.round(Number(v))));
                rows += '' +
                    '<div class="audit-bar-row">' +
                        '<span class="audit-bar-label">' + _esc(defs[i].label) + '</span>' +
                        '<div class="audit-bar-track"><div class="audit-bar-fill" data-w="' + v + '" style="width:0;background:' + defs[i].color + ';"></div></div>' +
                        '<span class="audit-bar-num">' + v + '</span>' +
                    '</div>';
            }
            if (rows) barsHtml = '<div class="audit-bars">' + rows + '</div>';
        }

        return '' +
            '<div class="audit-hero zone-' + zone.key + '">' +
                '<div class="audit-hero-glow" id="audit-hero-glow"></div>' +
                '<div class="audit-ring-wrap">' +
                    '<svg width="150" height="150" viewBox="0 0 150 150">' +
                        '<defs><linearGradient id="auditZoneGrad" x1="0" y1="0" x2="1" y2="1">' +
                            '<stop id="auditGradA" offset="0%"></stop>' +
                            '<stop id="auditGradB" offset="100%"></stop>' +
                        '</linearGradient></defs>' +
                        '<circle cx="75" cy="75" r="66" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" stroke-dasharray="1.5 6.4"></circle>' +
                        '<circle cx="75" cy="75" r="58" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"></circle>' +
                        '<circle id="audit-ring" cx="75" cy="75" r="58" fill="none" stroke="url(#auditZoneGrad)" stroke-width="10" stroke-linecap="round" stroke-dasharray="365" stroke-dashoffset="365" transform="rotate(-90 75 75)"></circle>' +
                    '</svg>' +
                    '<div class="audit-ring-center">' +
                        '<div class="audit-ring-num" id="audit-ring-num">0</div>' +
                        '<div class="audit-ring-cap">ИЗ 100</div>' +
                    '</div>' +
                '</div>' +
                '<div class="audit-verdict-wrap" id="audit-verdict">' +
                    '<div class="audit-zone-label">' + _esc(zone.label) + ' здоровья</div>' +
                    (_hasText(verdict) ? '<div class="audit-verdict">' + _esc(verdict) + '</div>' : '') +
                '</div>' +
                benchHtml +
            '</div>' +
            barsHtml;
    }

    function renderKiller(r) {
        var k = _g(r, 'killer_insight', '');
        if (!_hasText(k)) return '';
        return '' +
            '<div class="audit-killer">' +
                '<div class="audit-killer-lbl"><i class="ti ti-bulb"></i>Главный инсайт</div>' +
                '<div class="audit-killer-text">' + _esc(k) + '</div>' +
            '</div>';
    }

    function renderMetrics(r) {
        var m = _g(r, 'metrics_snapshot', null);
        if (!m) return '';
        var cells = [];

        if (m.subscribers != null) cells.push({ val: _num(m.subscribers), label: 'подписчиков' });
        if (m.reach_percent != null && !isNaN(Number(m.reach_percent))) {
            cells.push({ val: Number(m.reach_percent).toFixed(1).replace('.0', '') + '%', label: 'охват' });
        }
        if (m.posts_per_week != null && !isNaN(Number(m.posts_per_week))) {
            cells.push({ val: Number(m.posts_per_week).toFixed(1).replace('.0', ''), label: 'постов/нед' });
        }
        if (m.trend_percent != null && !isNaN(Number(m.trend_percent))) {
            var tp = Number(m.trend_percent);
            var dir = m.trend_direction;
            var cls = (dir === 'declining' || tp < 0) ? 'down' : ((dir === 'growing' || tp > 0) ? 'up' : '');
            var sign = tp > 0 ? '+' : '';
            cells.push({ val: sign + tp.toFixed(1).replace('.0', '') + '%', label: 'тренд', cls: cls });
        }

        if (cells.length === 0) return '';
        var cellsHtml = cells.map(function (c) {
            var valCls = c.cls === 'up' ? ' audit-metric-up' : (c.cls === 'down' ? ' audit-metric-down' : '');
            return '<div class="audit-metric"><div class="audit-metric-val' + valCls + '">' + _esc(c.val) + '</div>' +
                '<div class="audit-metric-label">' + _esc(c.label) + '</div></div>';
        }).join('');

        var bench = m.niche_benchmark;
        var benchHtml = _hasText(bench) ? '<div class="audit-metric-bench">' + _esc(bench) + '</div>' : '';
        return '<div class="audit-metrics">' + cellsHtml + '</div>' + benchHtml;
    }

    function renderForecast(r) {
        var f = _g(r, 'growth_forecast', null);
        if (!f) return '';
        var scenarios = Array.isArray(f.scenarios) ? f.scenarios : [];
        var headline = f.headline;
        var goal = f.goal_projection;

        var scenHtml = scenarios.map(function (s) {
            if (!s) return '';
            var isGrowth = s.type === 'growth';
            var cls = isGrowth ? 'audit-scen-grow' : 'audit-scen-stag';
            var icon = isGrowth ? 'ti-trending-up' : 'ti-trending-down';
            var title = _hasText(s.title) ? s.title : (isGrowth ? 'Если выполнить план' : 'Если ничего не менять');
            var confHtml = '';
            if (isGrowth && _hasText(s.confidence)) {
                var cmap = { high: 'высокая', medium: 'средняя', low: 'низкая' };
                confHtml = '<div class="audit-scen-conf">уверенность: ' + _esc(cmap[s.confidence] || s.confidence) + '</div>';
            }
            return '' +
                '<div class="audit-scen ' + cls + '">' +
                    '<div class="audit-scen-title"><i class="ti ' + icon + '"></i>' + _esc(title) + '</div>' +
                    (_hasText(s.projection) ? '<div class="audit-scen-proj">' + _esc(s.projection) + '</div>' : '') +
                    (_hasText(s.reasoning) ? '<div class="audit-scen-reason">' + _esc(s.reasoning) + '</div>' : '') +
                    confHtml +
                '</div>';
        }).join('');

        if (!_hasText(headline) && !scenHtml && !_hasText(goal)) return '';

        return '' +
            '<div class="audit-block-label">Прогноз на 90 дней</div>' +
            (_hasText(headline) ? '<div class="audit-forecast-headline">' + _esc(headline) + '</div>' : '') +
            scenHtml +
            (_hasText(goal) ? '<div class="audit-goal"><i class="ti ti-flag"></i>' + _esc(goal) + '</div>' : '');
    }

    function renderPosts(r) {
        var best = _g(r, 'best_post', null);
        var worst = _g(r, 'worst_post', null);
        var html = '';

        if (best && (_hasText(best.excerpt) || _hasText(best.why_it_worked))) {
            html += postCard('best', best, best.why_it_worked, 'Лучший пост');
        }
        if (worst && (_hasText(worst.excerpt) || _hasText(worst.why_it_failed))) {
            html += postCard('worst', worst, worst.why_it_failed, 'Худший пост');
        }
        if (!html) return '';
        return '<div class="audit-posts">' + html + '</div>';
    }

    function postCard(kind, p, why, label) {
        var meta = label;
        if (p.views != null && !isNaN(Number(p.views))) meta += ' · ' + _num(p.views) + ' просм.';
        if (_hasText(p.vs_median)) meta += ' · ' + _esc(p.vs_median);
        return '' +
            '<div class="audit-post audit-post-' + kind + '">' +
                '<div class="audit-post-head">' + meta + '</div>' +
                (_hasText(p.excerpt) ? '<div class="audit-post-excerpt">«' + _esc(p.excerpt) + '»</div>' : '') +
                (_hasText(why) ? '<div class="audit-post-why">' + _esc(why) + '</div>' : '') +
            '</div>';
    }

    function renderBestTime(r) {
        var bt = _g(r, 'best_time', null);
        if (!bt) return '';
        if (!_hasText(bt.finding) && !_hasText(bt.recommendation)) return '';
        return '' +
            '<div class="audit-card">' +
                '<div class="audit-card-title"><i class="ti ti-clock-hour-4"></i>Лучшее время постинга</div>' +
                (_hasText(bt.finding) ? '<div class="audit-card-text">' + _esc(bt.finding) + '</div>' : '') +
                (_hasText(bt.recommendation) ? '<div class="audit-card-accent">' + _esc(bt.recommendation) + '</div>' : '') +
            '</div>';
    }

    function renderContentAnalysis(r) {
        var ca = _g(r, 'content_analysis', null);
        if (!ca) return '';
        var works = Array.isArray(ca.what_works) ? ca.what_works : [];
        var flops = Array.isArray(ca.what_flops) ? ca.what_flops : [];

        var worksHtml = themeList(works, 'good');
        var flopsHtml = themeList(flops, 'bad');
        var hook = _hasText(ca.hook_insight) ? '<div class="audit-ca-insight"><i class="ti ti-quote"></i>' + _esc(ca.hook_insight) + '</div>' : '';
        var len = _hasText(ca.length_insight) ? '<div class="audit-ca-insight"><i class="ti ti-ruler-2"></i>' + _esc(ca.length_insight) + '</div>' : '';

        if (!worksHtml && !flopsHtml && !hook && !len) return '';

        return '' +
            '<div class="audit-card">' +
                '<div class="audit-card-title"><i class="ti ti-chart-dots"></i>Анализ контента</div>' +
                (worksHtml ? '<div class="audit-ca-sub audit-ca-sub-good">Заходит</div>' + worksHtml : '') +
                (flopsHtml ? '<div class="audit-ca-sub audit-ca-sub-bad">Проваливается</div>' + flopsHtml : '') +
                hook + len +
            '</div>';
    }

    function themeList(arr, kind) {
        var rows = arr.map(function (t) {
            if (!t) return '';
            if (!_hasText(t.theme) && !_hasText(t.note)) return '';
            var views = (t.avg_views != null && !isNaN(Number(t.avg_views))) ? ' · ' + _num(t.avg_views) + ' просм.' : '';
            var note = _hasText(t.note) ? '<span class="audit-theme-note">' + _esc(t.note) + '</span>' : '';
            return '<div class="audit-theme audit-theme-' + kind + '">' +
                '<span class="audit-theme-name">' + _esc(t.theme || '—') + views + '</span>' + note + '</div>';
        }).join('');
        return rows || '';
    }

    function renderSections(r) {
        var sections = _g(r, 'sections', null);
        if (!Array.isArray(sections) || sections.length === 0) return '';
        var iconMap = { strengths: 'ti-trophy', weaknesses: 'ti-alert-triangle', monetization: 'ti-coin', action_plan: 'ti-target' };
        var html = '';
        for (var i = 0; i < sections.length; i++) {
            var sec = sections[i];
            if (!sec) continue;
            var body = sectionBody(sec);
            if (!body) continue;
            var icon = iconMap[sec.id] || 'ti-circle';
            var open = (i === 0) ? ' open' : '';
            html += '' +
                '<div class="audit-acc' + open + '">' +
                    '<button class="audit-acc-head" type="button">' +
                        '<span class="audit-acc-icon"><i class="ti ' + icon + '"></i></span>' +
                        '<span class="audit-acc-title">' + _esc(sec.title || sectionFallbackTitle(sec.id)) + '</span>' +
                        '<i class="ti ti-chevron-down audit-acc-chev"></i>' +
                    '</button>' +
                    '<div class="audit-acc-body">' + body + '</div>' +
                '</div>';
        }
        if (!html) return '';
        return '<div class="audit-block-label">Разбор по направлениям</div>' + html;
    }

    function sectionFallbackTitle(id) {
        var m = { strengths: 'Сильные стороны', weaknesses: 'Что тормозит', monetization: 'Готовность к деньгам', action_plan: 'План действий' };
        return m[id] || 'Раздел';
    }

    function sectionBody(sec) {
        if (sec.id === 'monetization') return monetizationBody(sec);
        if (sec.id === 'action_plan') return actionPlanBody(sec);
        if (sec.id === 'weaknesses') return weaknessesBody(sec);
        return strengthsBody(sec);
    }

    function strengthsBody(sec) {
        var items = Array.isArray(sec.items) ? sec.items : [];
        var rows = items.map(function (it) {
            if (!it || !_hasText(it.text)) return '';
            return '<div class="audit-item">' +
                '<div class="audit-item-text">' + _esc(it.text) + '</div>' +
                (_hasText(it.evidence) ? '<div class="audit-item-ev">' + _esc(it.evidence) + '</div>' : '') +
                '</div>';
        }).join('');
        return rows || '';
    }

    function weaknessesBody(sec) {
        var items = Array.isArray(sec.items) ? sec.items : [];
        var rows = items.map(function (it) {
            if (!it || !_hasText(it.text)) return '';
            var money = _hasText(it.money_lost_rub) ? '<div class="audit-item-money"><i class="ti ti-cash-banknote"></i>' + _esc(it.money_lost_rub) + '</div>' : '';
            return '<div class="audit-item">' +
                '<div class="audit-item-head">' + _priorityBadge(it.priority) + '<span class="audit-item-text">' + _esc(it.text) + '</span></div>' +
                (_hasText(it.impact) ? '<div class="audit-item-ev">' + _esc(it.impact) + '</div>' : '') +
                money +
                '</div>';
        }).join('');
        return rows || '';
    }

    function monetizationBody(sec) {
        var readyMap = { ready: { t: 'Готов к рекламе', c: 'green' }, partial: { t: 'Частично готов', c: 'amber' }, not_ready: { t: 'Пока не готов', c: 'coral' } };
        var rd = readyMap[sec.ready];
        var readyHtml = rd ? '<div class="audit-money-ready audit-money-' + rd.c + '">' + _esc(rd.t) + '</div>' : '';
        var reason = _hasText(sec.reason) ? '<div class="audit-item-ev">' + _esc(sec.reason) + '</div>' : '';

        var priceMin = _g(sec, 'ad_price_range_rub.min', null);
        var priceMax = _g(sec, 'ad_price_range_rub.max', null);
        var potMin = _g(sec, 'monthly_potential_rub.min', null);
        var potMax = _g(sec, 'monthly_potential_rub.max', null);

        var priceHtml = '';
        if (priceMin != null || priceMax != null) {
            priceHtml = '<div class="audit-money-row"><span class="audit-money-k">Цена рекламы</span><span class="audit-money-v">' +
                rangeRub(priceMin, priceMax) + '</span></div>';
        }
        var potHtml = '';
        if (potMin != null || potMax != null) {
            potHtml = '<div class="audit-money-row"><span class="audit-money-k">Потенциал в месяц</span><span class="audit-money-v">' +
                rangeRub(potMin, potMax) + '</span></div>';
        }
        if (!readyHtml && !reason && !priceHtml && !potHtml) return '';
        return readyHtml + reason + priceHtml + potHtml;
    }

    function rangeRub(min, max) {
        var a = _rub(min);
        var b = _rub(max);
        if (a && b) {
            if (min === max) return _esc(a);
            return _esc((Number(min)).toLocaleString('ru-RU') + '–' + b);
        }
        return _esc(a || b || '—');
    }

    function actionPlanBody(sec) {
        var items = Array.isArray(sec.items) ? sec.items : [];
        var rows = items.map(function (it) {
            if (!it || !_hasText(it.step)) return '';
            var dd = (it.deadline_days != null && !isNaN(Number(it.deadline_days)))
                ? '<span class="audit-dd">' + Math.round(Number(it.deadline_days)) + ' дн.</span>' : '';
            return '<div class="audit-item audit-step">' +
                '<div class="audit-item-head">' + _priorityBadge(it.priority) + dd + '</div>' +
                '<div class="audit-item-text">' + _esc(it.step) + '</div>' +
                (_hasText(it.why) ? '<div class="audit-item-ev">' + _esc(it.why) + '</div>' : '') +
                (_hasText(it.expected_effect) ? '<div class="audit-item-effect"><i class="ti ti-arrow-up-right"></i>' + _esc(it.expected_effect) + '</div>' : '') +
                '</div>';
        }).join('');
        return rows || '';
    }

    function renderDataQuality(r) {
        var dq = _g(r, 'data_quality', null);
        if (!dq) return '';
        var parts = [];
        if (dq.posts_analyzed != null && !isNaN(Number(dq.posts_analyzed))) {
            parts.push('Проанализировано постов: ' + Math.round(Number(dq.posts_analyzed)));
        }
        if (_hasText(dq.confidence_note)) parts.push(dq.confidence_note);
        if (parts.length === 0) return '';
        return '<div class="audit-dq">' + _esc(parts.join(' · ')) + '</div>';
    }

    function attachAccordion(host) {
        var heads = host.querySelectorAll('.audit-acc-head');
        for (var i = 0; i < heads.length; i++) {
            heads[i].addEventListener('click', function () {
                var acc = this.parentNode;
                if (!acc) return;
                acc.classList.toggle('open');
                _haptic('light');
            });
        }
    }

    function animateScore(score, zone, r) {
        var gradA = document.getElementById('auditGradA');
        var gradB = document.getElementById('auditGradB');
        if (gradA) gradA.setAttribute('stop-color', zone.light);
        if (gradB) gradB.setAttribute('stop-color', zone.color);

        var ring = document.getElementById('audit-ring');
        if (ring) ring.style.filter = 'drop-shadow(0 0 6px ' + hexAlpha(zone.color, 0.5) + ')';

        var glow = document.getElementById('audit-hero-glow');
        if (glow) glow.style.background = 'radial-gradient(circle,' + hexAlpha(zone.color, 0.22) + ',transparent 68%)';

        var numEl = document.getElementById('audit-ring-num');
        if (numEl) numEl.style.color = zone.light;

        var sNum = (score == null || isNaN(Number(score))) ? null : Math.max(0, Math.min(100, Number(score)));
        var total = 365;

        setTimeout(function () {
            if (ring && sNum != null) ring.style.strokeDashoffset = String(total - (total * sNum / 100));
            if (numEl) {
                if (sNum == null) { numEl.textContent = '—'; }
                else { countUp(numEl, sNum, 1500); }
            }
            var bars = document.querySelectorAll('.audit-bar-fill');
            for (var i = 0; i < bars.length; i++) {
                (function (b, idx) {
                    setTimeout(function () { b.style.width = (b.getAttribute('data-w') || 0) + '%'; }, 700 + idx * 120);
                })(bars[i], i);
            }
        }, 220);

        setTimeout(function () {
            var v = document.getElementById('audit-verdict');
            if (v) { v.style.opacity = '1'; v.style.transform = 'translateY(0)'; }
        }, 950);
        setTimeout(function () {
            var b = document.getElementById('audit-bench');
            if (b) { b.style.opacity = '1'; b.style.transform = 'translateY(0)'; }
        }, 1400);
    }

    function countUp(el, to, dur) {
        var start = null;
        function step(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / dur, 1);
            var e = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(e * to);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function hexAlpha(hex, a) {
        var h = (hex || '').replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var r = parseInt(h.slice(0, 2), 16);
        var g = parseInt(h.slice(2, 4), 16);
        var b = parseInt(h.slice(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return 'rgba(245,158,11,' + a + ')';
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function resolveChannel() {
        return apiRequest('/api/v1/channels/active')
            .then(function (data) {
                if (!data || !data.channels || data.channels.length === 0) return null;
                var id = data.active_channel_id;
                if (id != null) {
                    var found = data.channels.filter(function (c) { return c.id === id; })[0];
                    if (found) return found.id;
                }
                return data.channels[0].id;
            });
    }

    window.__openAudit = function (channelId, mode) {
        _entryMode = mode || null;
        if (channelId != null) {
            _channelId = channelId;
            showLoading('Загружаю аудит...');
            loadEntry(_channelId, mode);
            return;
        }
        showLoading('Загружаю аудит...');
        resolveChannel()
            .then(function (id) {
                if (id == null) {
                    closeAudit();
                    if (typeof openChannels === 'function') openChannels();
                    else if (typeof alertDialog === 'function') alertDialog('Сначала подключи канал.');
                    return;
                }
                _channelId = id;
                loadEntry(id, mode);
            })
            .catch(function () {
                showFatalError('Не удалось определить канал. Попробуй из «Мои каналы».', { icon: 'ti-alert-triangle' });
            });
    };

    function loadEntry(channelId, mode) {
        var limitsP = apiRequest('/api/v1/audits/limits').catch(function () { return null; });
        var latestP = apiRequest('/api/v1/channels/' + channelId + '/audit/latest').catch(function () { return null; });
        Promise.all([limitsP, latestP]).then(function (res) {
            var limits = res[0];
            var latest = res[1];
            var hasReport = latest && latest.found && latest.audit && latest.audit.report;
            if (mode === 'deep') {
                if (hasReport && latest.audit.report.deep) renderReport(latest.audit);
                else renderCommercialIntro(limits);
                return;
            }
            if (hasReport) {
                renderReport(latest.audit);
            } else {
                renderIntro(limits);
            }
        });
    }

})();