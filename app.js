const API_BASE_URL = 'https://api.62-60-235-228.sslip.io';

const tg = window.Telegram?.WebApp;

const state = {
    user: null,
    dashboard: null,
    initData: null,
    post: {
        topic: '',
        useProfanity: false,
        contextHistory: [],
        styleReferenceText: '',
        currentPostId: null,
        currentPostText: '',
        limits: null,
        suggestions: [],
        isGood: false,
        thinkingTimer: null,
        thinkingTextIndex: 0,
        pendingInstruction: null,
    },
};

const screens = {
    loading: document.getElementById('loading-screen'),
    error: document.getElementById('error-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    placeholder: document.getElementById('placeholder-screen'),
    cabinet: document.getElementById('cabinet-screen'),
    referral: document.getElementById('referral-screen'),
    tariffs: document.getElementById('tariffs-screen'),
    channels: document.getElementById('channels-screen'),
    postCreate: document.getElementById('post-create-screen'),
    postThinking: document.getElementById('post-thinking-screen'),
    postQuestion: document.getElementById('post-question-screen'),
    postResult: document.getElementById('post-result-screen'),
};

const els = {
    errorMessage: document.getElementById('error-message'),
    avatarLetter: document.getElementById('avatar-letter'),
    greetingName: document.getElementById('greeting-name'),
    channelInfo: document.getElementById('channel-info'),
    metricViews: document.getElementById('metric-views'),
    metricViewsTrend: document.getElementById('metric-views-trend'),
    metricSubs: document.getElementById('metric-subs'),
    metricSubsTrend: document.getElementById('metric-subs-trend'),
    actionsList: document.getElementById('actions-list'),
    menuBtn: document.getElementById('menu-btn'),
    menuDot: document.getElementById('menu-dot'),
    profileBtn: document.getElementById('profile-btn'),
    drawer: document.getElementById('drawer'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    drawerClose: document.getElementById('drawer-close'),
    placeholderBack: document.getElementById('placeholder-back'),
    placeholderTitle: document.getElementById('placeholder-title'),
    placeholderText: document.getElementById('placeholder-text'),
    placeholderIcon: document.getElementById('placeholder-icon'),

    channelsBack: document.getElementById('channels-back'),
    channelsLoading: document.getElementById('channels-loading'),
    channelsBody: document.getElementById('channels-body'),
    channelsStateEmpty: document.getElementById('channels-state-empty'),
    channelsStateList: document.getElementById('channels-state-list'),
    channelsCards: document.getElementById('channels-cards'),
    channelsBotName: document.getElementById('channels-bot-name'),
    channelsDemoInput: document.getElementById('channels-demo-input'),
    channelsDemoBtn: document.getElementById('channels-demo-btn'),
    channelsDemoError: document.getElementById('channels-demo-error'),
    channelsDemoResult: document.getElementById('channels-demo-result'),
    channelsAddMore: document.getElementById('channels-add-more'),

    postCreateBack: document.getElementById('post-create-back'),
    postTopicInput: document.getElementById('post-topic-input'),
    postTopicCounter: document.getElementById('post-topic-counter-value'),
    postProfanityToggle: document.getElementById('post-profanity-toggle'),
    postStyleHint: document.getElementById('post-style-hint'),
    postStyleHintTitle: document.getElementById('post-style-hint-title'),
    postStyleHintText: document.getElementById('post-style-hint-text'),
    postStyleLoadBtn: document.getElementById('post-style-load-btn'),
    postStyleConnectBtn: document.getElementById('post-style-connect-btn'),
    postStyleInputWrapper: document.getElementById('post-style-input-wrapper'),
    postStyleInput: document.getElementById('post-style-input'),
    postStyleCounter: document.getElementById('post-style-counter-value'),
    postStyleClear: document.getElementById('post-style-clear'),
    postStyleApply: document.getElementById('post-style-apply'),
    postLimitBanner: document.getElementById('post-limit-banner'),
    postLimitText: document.getElementById('post-limit-text'),
    postGenerateBtn: document.getElementById('post-generate-btn'),

    thinkingText: document.getElementById('thinking-text'),

    postQuestionBack: document.getElementById('post-question-back'),
    postStepBadge: document.getElementById('post-step-badge'),
    postQuestionText: document.getElementById('post-question-text'),
    postQuestionOptions: document.getElementById('post-question-options'),
    postQuestionCustomInput: document.getElementById('post-question-custom-input'),
    postQuestionCustomSubmit: document.getElementById('post-question-custom-submit'),

    postResultBack: document.getElementById('post-result-back'),
    postResultMenuBtn: document.getElementById('post-result-menu-btn'),
    postResultText: document.getElementById('post-result-text'),
    postResultModel: document.getElementById('post-result-model'),
    postResultSuggestions: document.getElementById('post-result-suggestions'),
    postResultSuggestionsList: document.getElementById('post-result-suggestions-list'),
    postResultCustomInput: document.getElementById('post-result-custom-input'),
    postResultCustomSubmit: document.getElementById('post-result-custom-submit'),
    postCopyBtn: document.getElementById('post-copy-btn'),
    postSendChannelBtn: document.getElementById('post-send-channel-btn'),
    postScheduleBtn: document.getElementById('post-schedule-btn'),
    postRegenerateBtn: document.getElementById('post-regenerate-btn'),
    postEmojiBtn: document.getElementById('post-emoji-btn'),

    modelPickerModal: document.getElementById('model-picker-modal'),
    modelPickPremium: document.getElementById('model-pick-premium'),
    modelPickStandard: document.getElementById('model-pick-standard'),
    modelPickPremiumMeta: document.getElementById('model-pick-premium-meta'),
    modelPickStandardMeta: document.getElementById('model-pick-standard-meta'),
    modelPickCancel: document.getElementById('model-pick-cancel'),

    lockedFeatureModal: document.getElementById('locked-feature-modal'),
    lockedFeatureTitle: document.getElementById('locked-feature-title'),
    lockedFeatureText: document.getElementById('locked-feature-text'),
    lockedFeatureAction: document.getElementById('locked-feature-action'),
    lockedFeatureCancel: document.getElementById('locked-feature-cancel'),

    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toast-icon'),
    toastText: document.getElementById('toast-text'),
};


function initTelegram() {
    if (!tg) {
        console.warn('Telegram WebApp SDK not available — running in browser?');
        return false;
    }

    tg.ready();
    tg.expand();
    if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes();

    if (tg.setHeaderColor) tg.setHeaderColor('#0a0d18');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#0a0d18');

    state.initData = tg.initData;

    if (!state.initData) {
        console.warn('No initData — open via Telegram');
        return false;
    }

    return true;
}


async function apiRequest(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (state.initData) {
        headers['X-Telegram-Init-Data'] = state.initData;
    }
    try { if (typeof getLang === 'function') headers['X-Lang'] = getLang(); } catch (e) {}

    const url = `${API_BASE_URL}${path}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            const apiErr = new Error(`API ${response.status}: ${errorText || response.statusText}`);
            apiErr.status = response.status;   
            throw apiErr;
        }

        const raw = await response.text();
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error('API request failed:', url, err);
        throw err;
    }
}


function showScreen(screenName) {
    Object.values(screens).forEach(s => {
        if (s) s.style.display = 'none';
    });
    if (screens[screenName]) {
        screens[screenName].style.display = '';
    }
}


function showError(message) {
    els.errorMessage.textContent = message;
    showScreen('error');
}


async function loadDashboard() {
    showScreen('loading');

    try {
        const data = await apiRequest('/api/v1/user/dashboard');
        state.dashboard = data;
        renderDashboard(data);
        showScreen('dashboard');
    } catch (err) {
        const message = err.message || '';

        if (message.includes('404') && message.includes('User not found')) {
            showStartBotScreen();
            return;
        }

        const detail = message || 'Не удалось подключиться к серверу';
        showError(detail);
    }
}


async function refreshDashboardSilent() {
    try {
        const data = await apiRequest('/api/v1/user/dashboard');
        state.dashboard = data;
        renderDashboard(data);
    } catch (e) {
    }
}


function showStartBotScreen() {
    els.errorMessage.innerHTML = `
        <div style="margin-bottom: 16px; line-height: 1.6;">
            Сначала запусти бота — он покажет возможности и активирует бесплатный Trial на 7 дней.
        </div>
    `;

    const errorScreen = document.getElementById('error-screen');
    const errorIcon = errorScreen.querySelector('.error-icon');
    const errorTitle = errorScreen.querySelector('.error-title');
    const errorBtn = errorScreen.querySelector('button');

    errorIcon.innerHTML = '<i class="ti ti-rocket"></i>';
    errorIcon.style.background = 'linear-gradient(135deg, var(--color-purple-bg), rgba(99, 102, 241, 0.05))';
    errorIcon.style.borderColor = 'var(--color-purple-border)';
    errorIcon.querySelector('i').style.color = 'var(--color-purple-400)';

    errorTitle.textContent = 'Сначала запусти бота';
    errorBtn.textContent = 'Открыть @ForgeMetricsBot';

    errorBtn.onclick = () => {
        if (tg?.openTelegramLink) {
            tg.openTelegramLink('https://t.me/ForgeMetricsBot');
        } else {
            window.open('https://t.me/ForgeMetricsBot', '_blank');
        }
    };

    showScreen('error');
}


function localizeStr(trimmed) {
    let tr = t(trimmed);
    if (tr && tr !== trimmed) return tr;
    if (typeof translateTemplate === 'function') {
        const tt = translateTemplate(trimmed);
        if (tt && tt !== trimmed) return tt;
    }
    if (typeof stripSepTranslate === 'function') {
        const ts = stripSepTranslate(trimmed);
        if (ts) return ts;
    }
    if (typeof segmentTranslate === 'function') {
        const sg = segmentTranslate(trimmed);
        if (sg) return sg;
    }
    return null;
}
const LOC_ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
function localizeAttrs(el) {
    if (!el || el.nodeType !== 1 || !el.getAttribute) return;
    for (let i = 0; i < LOC_ATTRS.length; i++) {
        const a = LOC_ATTRS[i];
        const v = el.getAttribute(a);
        if (!v) continue;
        const trimmed = v.trim();
        if (!trimmed) continue;
        const tr = localizeStr(trimmed);
        if (tr) el.setAttribute(a, v.replace(trimmed, tr));
    }
}
function localizeTextNode(n) {
    try {
        const raw = n.nodeValue;
        if (!raw) return;
        const trimmed = raw.trim();
        if (!trimmed) return;
        const tr = localizeStr(trimmed);
        if (tr) n.nodeValue = raw.replace(trimmed, tr);
    } catch (e) {}
}
function localizeTree(root) {
    if (!root || typeof getLang !== 'function' || getLang() === 'ru' || typeof t !== 'function') return;
    try {
        if (root.nodeType === 3) { localizeTextNode(root); return; }
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        let node;
        while ((node = walker.nextNode())) nodes.push(node);
        nodes.forEach(localizeTextNode);
        localizeAttrs(root);
        if (root.querySelectorAll) {
            const els = root.querySelectorAll('[title],[placeholder],[aria-label],[alt]');
            for (let i = 0; i < els.length; i++) localizeAttrs(els[i]);
        }
    } catch (e) {}
}

function initAutoLocalize() {
    if (typeof getLang !== 'function' || getLang() === 'ru') return;
    try {
        localizeTree(document.body);
        const obs = new MutationObserver((muts) => {
            muts.forEach((m) => {
                if (m.type === 'characterData') { localizeTextNode(m.target); return; }
                if (!m.addedNodes) return;
                m.addedNodes.forEach((n) => {
                    if (n.nodeType === 1) localizeTree(n);         
                    else if (n.nodeType === 3) localizeTextNode(n); 
                });
            });
        });
        obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
}

function renderDashboard(data) {
    const firstName = data.user?.first_name || '';
    const _hdrPhoto = tg?.initDataUnsafe?.user?.photo_url;
    if (_hdrPhoto && els.avatarLetter) {
        els.avatarLetter.innerHTML = `<img src="${escapeHtml(_hdrPhoto)}" alt="">`;
    } else if (els.avatarLetter) {
        els.avatarLetter.textContent = (firstName.charAt(0) || 'F').toUpperCase();
    }
    els.greetingName.textContent = firstName ? `Привет, ${firstName}` : 'Привет';

    renderChannelSelector(data);
    renderPulse(data.pulse);
    renderActions(data.actions || []);

    if (data.has_unread_menu) {
        els.menuDot.classList.add('active');
    } else {
        els.menuDot.classList.remove('active');
    }
    localizeTree(screens.dashboard);
}

function renderChannelSelector(data) {
    const host = document.getElementById('channel-selector');
    if (!host) return;
    const ch = data.channel;
    try { window.__fmActiveChannelId = ch ? ch.id : null; } catch (e) {}
    if (ch) {
        const title = ch.title || ch.username || 'Канал';
        const initial = escapeHtml((title || 'K').trim().charAt(0).toUpperCase() || 'K');
        const niche = (data.pulse && data.pulse.niche) ? data.pulse.niche : '';
        const multi = (data.total_channels || 1) > 1;
        const idn = `${ch.username ? '@' + escapeHtml(ch.username) : ''}${niche ? (ch.username ? ' · ' : '') + escapeHtml(niche) : ''}`;
        const sub = idn || (multi ? 'нажми, чтобы сменить канал' : 'нажми для управления');
        host.innerHTML = `<button class="pw-chansel" id="pw-chansel-btn"><div class="pw-chav" id="pw-chav-el">${initial}</div><div class="pw-chinfo"><div class="pw-chn"><span class="pw-chn-t">${escapeHtml(title)}</span><span class="pw-badge">активный</span></div><div class="pw-chnb">${sub}</div></div><div class="pw-chchev"><i class="ti ti-chevron-down"></i></div></button>`;
        const btn = document.getElementById('pw-chansel-btn');
        if (btn) btn.addEventListener('click', () => { hapticLight(); openActiveChannelSelector({ onChanged: async () => { await loadDashboard(); } }); });
        const avEl = document.getElementById('pw-chav-el');
        if (avEl && ch.id) loadBottomSheetAvatar(ch.id, avEl);
    } else {
        host.innerHTML = `<button class="pw-chansel" id="pw-chansel-btn"><div class="pw-chav"><i class="ti ti-plus"></i></div><div class="pw-chinfo"><div class="pw-chn">Подключить канал</div><div class="pw-chnb">Метрики, публикация и оффер на Площадке</div></div><div class="pw-chchev"><i class="ti ti-chevron-right"></i></div></button>`;
        const btn = document.getElementById('pw-chansel-btn');
        if (btn) btn.addEventListener('click', () => { hapticLight(); if (typeof openChannels === 'function') openChannels(); });
    }
}

function pwFmt(v, el) {
    const suf = el.dataset.suf || '', dec = +(el.dataset.dec || 0), sep = el.dataset.sep === '1', k = el.dataset.k === '1';
    if (k) return formatNumber(Math.round(v)).replace('.', ',') + suf;
    if (sep) return Math.round(v).toLocaleString('ru-RU') + suf;
    if (dec) return v.toFixed(dec) + suf;
    return String(Math.round(v)) + suf;
}
function pwCountUp(root) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (root || document).querySelectorAll('.pw-num[data-to]').forEach((el) => {
        const to = parseFloat(el.dataset.to) || 0;
        if (reduce) { el.textContent = pwFmt(to, el); return; }
        let t0 = null;
        function step(t) { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / 900); el.textContent = pwFmt(to * (1 - Math.pow(1 - p, 3)), el); if (p < 1) requestAnimationFrame(step); }
        requestAnimationFrame(step);
    });
}
function pwCell(label, val, opts) {
    opts = opts || {};
    if (val == null) return `<div class="pw-mcell"><div class="pw-ml">${escapeHtml(label)}</div><div class="pw-mv">—</div></div>`;
    const attrs = `data-to="${val}"${opts.sep ? ' data-sep="1"' : ''}${opts.k ? ' data-k="1"' : ''}${opts.suf ? ` data-suf="${opts.suf}"` : ''}${opts.dec ? ` data-dec="${opts.dec}"` : ''}`;
    const tr = opts.trend != null ? `<span class="${opts.trend >= 0 ? 'up' : 'dn'}">${opts.trend >= 0 ? '↗' : '↘'}${Math.abs(opts.trend)}%</span>` : '';
    return `<div class="pw-mcell"><div class="pw-ml">${escapeHtml(label)}</div><div class="pw-mv"><span class="pw-num" ${attrs}>0</span>${tr}</div></div>`;
}

var PW_CATALOG = [
    { id: 'subs', label: 'Подписчики', get: p => p.subscribers, o: { k: true } },
    { id: 'reach', label: 'Охват / пост', get: p => p.avg_views, o: { k: true } },
    { id: 'rr', label: 'Reach Rate', get: p => p.reach_rate, o: { suf: '%' } },
    { id: 'er', label: 'ER', get: p => p.engagement_percent, o: { suf: '%', dec: 1 } },
];
var PW_MAX = 4;
var PW_LS = 'fm_pulse_metrics_v1';

var PW_DORM_LS = 'fm_pulse_dormant_v1';
function pwDormantGet(chId) {
    if (chId == null) return null;
    try { return (JSON.parse(localStorage.getItem(PW_DORM_LS) || '{}'))[chId] || null; } catch (e) { return null; }
}
function pwDormantSet(chId, val) {
    if (chId == null) return;
    try {
        var m = JSON.parse(localStorage.getItem(PW_DORM_LS) || '{}');
        if (val) m[chId] = val; else delete m[chId];
        localStorage.setItem(PW_DORM_LS, JSON.stringify(m));
    } catch (e) {}
}

function pwSelectedIds(pulse) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(PW_LS) || 'null'); } catch (e) { }
    if (Array.isArray(saved) && saved.length) {
        var ok = saved.filter(id => PW_CATALOG.some(m => m.id === id));
        if (ok.length) return ok.slice(0, PW_MAX);
    }
    var order = ['subs', 'reach', 'rr', 'er'];
    var withData = order.filter(id => { var m = PW_CATALOG.find(x => x.id === id); return m && m.get(pulse) != null; });
    return (withData.length ? withData : ['subs']).slice(0, PW_MAX);
}

function pwPreview(v, o) {
    o = o || {};
    if (o.k) return formatNumber(Math.round(v)).replace('.', ',') + (o.suf || '');
    if (o.sep) return Math.round(v).toLocaleString('ru-RU') + (o.suf || '');
    if (o.dec) return v.toFixed(o.dec) + (o.suf || '');
    return String(Math.round(v)) + (o.suf || '');
}

function pwRenderMetrics(pulse) {
    var grid = document.getElementById('pw-mgrid');
    if (!grid) return;
    var ids = pwSelectedIds(pulse);
    grid.innerHTML = ids.map(id => { var m = PW_CATALOG.find(x => x.id === id); return m ? pwCell(m.label, m.get(pulse), m.o) : ''; }).join('');
    pwCountUp(grid);
    var gear = document.getElementById('pw-mgear');
    if (gear) gear.onclick = () => { hapticLight(); pwOpenPicker(pulse); };
}

function pwOpenPicker(pulse) {
    var sel = new Set(pwSelectedIds(pulse));
    var ov = document.createElement('div');
    ov.className = 'pw-sheet-ov';
    ov.innerHTML = '<div class="pw-sheet" role="dialog" aria-label="Показатели канала">'
        + '<div class="pw-sheet-grip"></div>'
        + '<div class="pw-sheet-h">Показатели канала</div>'
        + '<div class="pw-sheet-sub">Выбери до ' + PW_MAX + ' показателей для главной</div>'
        + '<div class="pw-sheet-list">'
        + PW_CATALOG.map(m => {
            var v = m.get(pulse), has = v != null, on = sel.has(m.id);
            return '<button class="pw-opt' + (on ? ' on' : '') + (has ? '' : ' nodata') + '" data-id="' + m.id + '" type="button">'
                + '<span class="pw-opt-tx"><span class="pw-opt-l">' + escapeHtml(m.label) + '</span>'
                + '<span class="pw-opt-v">' + (has ? pwPreview(v, m.o) : 'нет данных') + '</span></span>'
                + '<span class="pw-opt-ck"><i class="ti ti-check"></i></span></button>';
        }).join('')
        + '</div>'
        + '<button class="pw-sheet-done" id="pw-sheet-done" type="button">Готово</button>'
        + '</div>';
    document.body.appendChild(ov);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => ov.classList.add('show'));
    var close = () => {
        document.documentElement.classList.remove('cs-modal-open');
        document.body.classList.remove('cs-modal-open');
        ov.classList.remove('show');
        setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 220);
    };
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelectorAll('.pw-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            var id = btn.dataset.id;
            if (sel.has(id)) { sel.delete(id); btn.classList.remove('on'); }
            else {
                if (sel.size >= PW_MAX) { hapticLight(); btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 400); return; }
                sel.add(id); btn.classList.add('on');
            }
        });
    });
    var done = document.getElementById('pw-sheet-done');
    if (done) done.addEventListener('click', () => {
        var arr = PW_CATALOG.map(m => m.id).filter(id => sel.has(id));
        if (!arr.length) arr = ['subs'];
        try { localStorage.setItem(PW_LS, JSON.stringify(arr)); } catch (e) { }
        hapticLight();
        close();
        pwRenderMetrics(pulse);
    });
}

function pwHealthState(pulse) {
    const H = { green: { c: 'green', t: 'Живой канал', s: 'охват в норме' }, amber: { c: 'amber', t: 'Средний охват', s: 'ниже нормы' }, red: { c: 'red', t: 'Слабый охват', s: 'проверь канал' } };
    let h = H[pulse.health_class] || { c: 'grey', t: 'Метрики собираются', s: '' };
    if (pulse.rr_status === 'аномальный') h = { c: 'amber', t: 'Охват выше базы', s: 'репосты или накрутка — проверь' };
    return h;
}

function markPulseHealthy(pulse) {
    const badge = document.querySelector('.pw-health');
    if (!badge || !pulse) return;
    const h = pwHealthState(pulse);
    badge.className = 'pw-health ' + h.c;
    badge.innerHTML = '<span class="pw-dot"></span> ' + h.t + (h.s ? ' <span class="pw-hs">' + h.s + '</span>' : '');
    const lab = document.querySelector('.pw-hlab');
    if (lab) lab.textContent = 'Средний охват · 30 дней';
}

function renderPulse(pulse) {
    const host = document.getElementById('pulse-widget');
    if (!host) return;
    if (!pulse) { host.innerHTML = ''; return; }
    const h = pwHealthState(pulse);
    const heroNum = (pulse.avg_views != null)
        ? `<span class="v pw-num" data-to="${pulse.avg_views}" data-sep="1">0</span>`
        : '<span class="v">—</span>';
    host.innerHTML = `<div class="pw-pulse">
      <div class="pw-prow">
        <span class="pw-health ${h.c}"><span class="pw-dot"></span> ${h.t}${h.s ? ` <span class="pw-hs">${h.s}</span>` : ''}</span>
        <span class="pw-plink" id="pw-analyze">Разбор <i class="ti ti-chevron-right"></i></span>
      </div>
      <div class="pw-hlab">Средний охват · 30 дней</div>
      <div class="pw-hbig">${heroNum}<span class="tr" id="pw-trend"></span><span class="u">на пост</span></div>
      <div class="pw-chart" id="pw-chart"></div>
      <div class="pw-msec">
        <div class="pw-mhead"><span class="pw-mtitle">Показатели канала</span><button class="pw-mgear" id="pw-mgear" type="button" aria-label="Настроить показатели"><i class="ti ti-settings"></i></button></div>
        <div class="pw-mgrid" id="pw-mgrid"></div>
      </div>
      <div id="pw-aihook"></div>
    </div>`;
    pwCountUp(host);
    pwRenderMetrics(pulse);
    const an = document.getElementById('pw-analyze');
    if (an) an.addEventListener('click', () => { hapticLight(); if (typeof window.__openAudit === 'function') window.__openAudit(); else cabToast('Разбор канала — скоро'); });
    try {
        var _dch = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : null;
        var _dorm = pwDormantGet(_dch);
        if (_dorm) {
            markPulseStale(_dorm.d, _dorm.ld);
            var _lab2 = host.querySelector('.pw-hlab');
            if (_lab2) _lab2.textContent = 'Средний охват · последние посты';
        }
    } catch (e) {}
    loadReachSeries();
}

function renderPulseHook(trendPct) {
    const hook = document.getElementById('pw-aihook');
    if (!hook) return;
    if (trendPct == null || trendPct >= 0) { hook.innerHTML = ''; return; }
    const drop = Math.abs(trendPct);
    hook.innerHTML = `<div class="pw-aihook">`
        + `<span class="pw-aih-ic"><i class="ti ti-sparkles"></i></span>`
        + `<div class="pw-aih-tx">Охват просел на <b>${drop}%</b> — ИИ подготовит вовлекающие посты, чтобы вернуть его.</div>`
        + `<button class="pw-aih-go" type="button">Собрать <i class="ti ti-arrow-right"></i></button></div>`;
    const go = hook.querySelector('.pw-aih-go');
    if (go) go.addEventListener('click', () => { hapticLight(); handleAction('create_post'); });
}

async function loadReachSeries() {
    const host = document.getElementById('pw-chart');
    if (!host) return;
    try {
        const r = await apiRequest('/api/v1/user/reach-series');
        if (r && Array.isArray(r.series) && r.series.length >= 2 && r.series.every((v) => Number.isFinite(v))) {
            const endLabel = r.stale ? (r.last_date || '') : 'сегодня';
            _reachLast = { series: r.series, dates: r.dates || [], days: r.days || 30, endLabel: endLabel };
            drawReachChart(host, _reachLast.series, _reachLast.dates, _reachLast.days, _reachLast.endLabel);
            setTimeout(function () {
                var svg = host.querySelector('svg');
                if (svg && Math.abs(host.clientWidth - (+svg.getAttribute('width') || 0)) > 8) _reachRedraw();
            }, 300);
            const tr = document.getElementById('pw-trend');
            const chIdD = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : null;
            if (r.stale) {
                if (tr) { tr.textContent = ''; tr.className = 'tr'; }
                const lab = document.querySelector('.pw-hlab');
                if (lab) lab.textContent = 'Средний охват · последние посты';
                markPulseStale(r.stale_days, r.last_date);
                pwDormantSet(chIdD, { d: r.stale_days, ld: r.last_date });
            } else {
                pwDormantSet(chIdD, null);
                markPulseHealthy(state.dashboard && state.dashboard.pulse);
                if (tr && r.trend_pct != null) { const up = r.trend_pct >= 0; tr.textContent = (up ? '↗ +' : '↘ ') + Math.abs(r.trend_pct) + '%'; tr.className = 'tr' + (up ? '' : ' dn'); }
                renderPulseHook(r.trend_pct);
            }
        } else {
            host.innerHTML = '<div class="pw-empty">Динамика охвата накапливается — данные появятся позже</div>';
        }
    } catch (e) {
        host.innerHTML = '<div class="pw-empty">Не удалось загрузить динамику</div>';
    }
}

function markPulseStale(days, lastDate) {
    const badge = document.querySelector('.pw-health');
    if (!badge) return;
    const word = (days != null && days > 60) ? 'Неактивен' : 'Редкая активность';
    const sub = lastDate ? ('последний пост ' + lastDate) : ((days != null ? days : '') + ' дн без постов');
    badge.className = 'pw-health dormant';
    badge.innerHTML = '<span class="pw-moon"><i class="ti ti-moon"></i></span> ' + word + (sub ? ' <span class="pw-hs">' + sub + '</span>' : '');
}

var _reachLast = null, _reachRedrawT = null;
function _reachRedraw() {
    try {
        var host = document.getElementById('pw-chart');
        if (!host || !_reachLast || !host.clientWidth) return;
        drawReachChart(host, _reachLast.series, _reachLast.dates, _reachLast.days, _reachLast.endLabel);
    } catch (e) {}
}
function _reachRedrawSoon() { clearTimeout(_reachRedrawT); _reachRedrawT = setTimeout(_reachRedraw, 180); }
window.addEventListener('resize', _reachRedrawSoon);
try { if (tg && tg.onEvent) tg.onEvent('viewportChanged', _reachRedrawSoon); } catch (e) {}

function drawReachChart(host, DATA, dates, days, endLabel) {
    if (!Array.isArray(DATA) || DATA.length < 2) { host.innerHTML = ''; return; }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = Math.max(260, host.clientWidth || 320), Hh = 74, padT = 10, padB = 18, padL = 6, padR = 6;
    const min = Math.min.apply(null, DATA), max = Math.max.apply(null, DATA);
    const lo = min - (max - min) * 0.5, hi = max + (max - min) * 0.22, rng = (hi - lo) || 1, last = DATA.length - 1;
    const X = (i) => padL + i * (W - padL - padR) / last;
    const Y = (v) => padT + (1 - (v - lo) / rng) * (Hh - padT - padB);
    const pts = DATA.map((v, i) => [X(i), Y(v)]);
    function smooth(p) { if (p.length < 2) return ''; let d = 'M' + p[0][0].toFixed(1) + ',' + p[0][1].toFixed(1); for (let i = 0; i < p.length - 1; i++) { const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c; const c1x = b[0] + (c[0] - a[0]) / 6, c1y = b[1] + (c[1] - a[1]) / 6, c2x = c[0] - (e[0] - b[0]) / 6, c2y = c[1] - (e[1] - b[1]) / 6; d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + c[0].toFixed(1) + ',' + c[1].toFixed(1); } return d; }
    const line = smooth(pts), area = line + ' L' + X(last).toFixed(1) + ',' + (Hh - padB) + ' L' + X(0).toFixed(1) + ',' + (Hh - padB) + ' Z';
    const short = (v) => v >= 1000 ? ((Math.round(v / 100) / 10 + '').replace('.', ',') + 'К') : String(Math.round(v));
    const grids = [max, min];
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}">`;
    svg += '<defs><linearGradient id="pwag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(93,202,165,0.40)"/><stop offset="0.32" stop-color="rgba(93,202,165,0.17)"/><stop offset="0.68" stop-color="rgba(93,202,165,0.05)"/><stop offset="1" stop-color="rgba(93,202,165,0)"/></linearGradient>';
    svg += '<linearGradient id="pwlg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2fb389"/><stop offset="0.5" stop-color="#57e0ab"/><stop offset="1" stop-color="#8af0cb"/></linearGradient>';
    svg += '<filter id="pwglf" x="-20%" y="-60%" width="140%" height="240%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>';
    grids.forEach((v) => { const y = Y(v).toFixed(1); svg += `<line class="pw-gl" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/><text class="pw-gt" x="${W - padR}" y="${(Y(v) - 3).toFixed(1)}" text-anchor="end">${short(v)}</text>`; });
    svg += `<path class="pw-area" d="${area}" fill="url(#pwag)"/>`;
    svg += `<path d="${line}" fill="none" stroke="#5DCAA5" stroke-width="4" opacity="0.42" filter="url(#pwglf)"/>`;
    svg += `<path class="pw-cl" d="${line}" fill="none" stroke="url(#pwlg)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg += `<circle class="pw-eppulse" cx="${X(last).toFixed(1)}" cy="${Y(DATA[last]).toFixed(1)}" r="3.4" fill="none" stroke="#5DCAA5" stroke-width="1.6"/>`;
    svg += `<circle cx="${X(last).toFixed(1)}" cy="${Y(DATA[last]).toFixed(1)}" r="6" fill="rgba(93,202,165,0.22)"/>`;
    svg += `<circle class="pw-ep" cx="${X(last).toFixed(1)}" cy="${Y(DATA[last]).toFixed(1)}" r="3.4" fill="#eafff6" stroke="#5DCAA5" stroke-width="2"/>`;
    const lbl0 = (dates && dates[0]) ? dates[0] : (days + ' дн назад');
    svg += `<text class="pw-xt" x="${X(0)}" y="${Hh - 5}" text-anchor="start">${lbl0}</text>`;
    svg += `<text class="pw-xt" x="${X(last)}" y="${Hh - 5}" text-anchor="end">${endLabel || 'сегодня'}</text>`;
    svg += `<line class="pw-cx" x1="0" y1="${padT}" x2="0" y2="${Hh - padB}" style="opacity:0"/>`;
    svg += `<circle class="pw-cd" r="4.3" style="opacity:0"/></svg>`;
    host.innerHTML = svg + '<div class="pw-tip"></div>';

    const cl = host.querySelector('.pw-cl'), ar = host.querySelector('.pw-area');
    if (!reduce && cl.getTotalLength) { const L = cl.getTotalLength(); cl.style.strokeDasharray = L; cl.style.strokeDashoffset = L; cl.getBoundingClientRect(); cl.style.transition = 'stroke-dashoffset 1.25s cubic-bezier(.3,.7,.3,1)'; if (ar) { ar.style.opacity = 0; ar.style.transition = 'opacity .85s ease-out .3s'; } requestAnimationFrame(() => { cl.style.strokeDashoffset = 0; if (ar) ar.style.opacity = 1; }); }

    const tip = host.querySelector('.pw-tip'), cx = host.querySelector('.pw-cx'), cd = host.querySelector('.pw-cd'), ep = host.querySelector('.pw-ep');
    function at(clientX) {
        const r = host.getBoundingClientRect(); if (!r.width) return; const sx = (clientX - r.left) * (W / r.width);
        let i = Math.round((sx - padL) / ((W - padL - padR) / last)); i = Math.max(0, Math.min(last, i));
        const x = X(i), y = Y(DATA[i]); cx.setAttribute('x1', x); cx.setAttribute('x2', x); cx.style.opacity = 1;
        cd.setAttribute('cx', x); cd.setAttribute('cy', y); cd.style.opacity = 1; ep.style.opacity = 0;
        const dlab = (dates && dates[i]) ? dates[i] : ((last - i) + ' дн назад');
        tip.innerHTML = `<div class="d">${dlab}</div>${DATA[i].toLocaleString('ru-RU')} охват`;
        tip.style.opacity = 1;
        const pxX = x / W * r.width, pxY = y / Hh * r.height;
        const half = tip.offsetWidth / 2 + 4;
        tip.style.left = Math.max(half, Math.min(r.width - half, pxX)) + 'px';
        tip.style.top = pxY + 'px';
        tip.style.transform = 'translate(-50%,-128%)';   
    }
    function off() { cx.style.opacity = 0; cd.style.opacity = 0; ep.style.opacity = 1; tip.style.opacity = 0; }
    host.addEventListener('pointermove', (e) => at(e.clientX));
    host.addEventListener('pointerdown', (e) => at(e.clientX));
    host.addEventListener('pointerleave', off);
    host.addEventListener('pointerup', off);
    host.addEventListener('pointercancel', off);
}


function renderTrend(el, change, trend) {
    if (!change) {
        el.innerHTML = '';
        return;
    }
    const iconClass = trend === 'down' ? 'ti-trending-down' : 'ti-trending-up';
    el.innerHTML = `<i class="ti ${iconClass}"></i>${change}`;
    el.className = `metric-trend ${trend === 'down' ? 'down' : ''}`;
}


var STRATEGY_MAP_SVG = '<svg width="26" height="26" viewBox="0 0 44 44" fill="none">' +
    '<rect x="5" y="10" width="34" height="26" rx="6" stroke="#8b8ff8" stroke-width="2" fill="rgba(129,140,248,0.09)"/>' +
    '<path d="M16.5 10v26M27.5 10v26" stroke="rgba(139,143,248,0.3)" stroke-width="1.4"/>' +
    '<path d="M10.5 29.5c5.5-8 9.5 3.5 14.5-3.5 3-4.2 5.5-6 8.5-7.5" stroke="#8b5cf6" stroke-width="2.3" stroke-linecap="round" stroke-dasharray="0.6 4.6"/>' +
    '<circle cx="10.5" cy="29.5" r="2.7" fill="#8b8ff8"/><circle cx="10.5" cy="29.5" r="4.6" stroke="rgba(139,143,248,0.4)" stroke-width="1.2"/>' +
    '<path d="M34 8.5c2.5 0 4.5 1.9 4.5 4.3 0 3.2-4.5 7.4-4.5 7.4s-4.5-4.2-4.5-7.4c0-2.4 2-4.3 4.5-4.3z" fill="#5DCAA5"/>' +
    '<circle cx="34" cy="12.9" r="1.7" fill="#06231a"/></svg>';

function renderActions(actions) {
    els.actionsList.innerHTML = '';

    actions.forEach(action => {
        const card = document.createElement('button');
        card.className = 'action-card';
        card.dataset.action = action.id;

        const isStrategy = action.id === 'ai_strategy';
        const iconColor = (action.color && action.color !== 'primary') ? action.color : 'purple';
        const colorClass = isStrategy ? 'icon-strategy' : `icon-${iconColor}`;
        const subtitleClass = (!isStrategy && action.color === 'green') ? 'highlight' : '';
        const iconInner = isStrategy ? STRATEGY_MAP_SVG : `<i class="ti ti-${action.icon}"></i>`;

        card.innerHTML = `
            <div class="action-card-content">
                <div class="action-card-icon ${colorClass}">
                    ${iconInner}
                </div>
                <div class="action-card-text">
                    <div class="action-card-title">${escapeHtml(action.title)}</div>
                    <div class="action-card-subtitle ${subtitleClass}">${escapeHtml(action.subtitle)}</div>
                </div>
            </div>
            <i class="ti ti-arrow-right action-card-arrow"></i>
        `;

        card.addEventListener('click', () => handleAction(action.id));
        els.actionsList.appendChild(card);
    });
}




function formatNumber(num) {
    if (num === null || num === undefined) return '—';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'М';
    if (num >= 10_000) return Math.floor(num / 1000) + 'к';
    if (num >= 1_000) return (num / 1000).toFixed(1) + 'к';
    return String(num);
}


function fmAnyModalVisible() {
    var list = document.querySelectorAll('.pw-sheet-ov.show, .lang-ov.show, .bs-overlay.visible, .modal-overlay, .cs-modal-overlay, .drawer.active');
    for (var i = 0; i < list.length; i++) {
        try { if (getComputedStyle(list[i]).display !== 'none') return true; } catch (e) {}
    }
    return false;
}

function fmClearFreeze() {
    try {
        if (document.body.classList.contains('fmx-bgfreeze')
            && !document.querySelector('.fmx-mbg.fmx-show,.fmx-cfm.solid,.pw-sheet-ov.show,#fmx-listBg.fmx-show,.bs-overlay.visible,.fmx-psFull')) {
            document.body.classList.remove('fmx-bgfreeze', 'fmx-bgfull');
            document.documentElement.classList.remove('fmx-bgfreeze');
            fmClientLog('unstick: снята залипшая fmx-bgfreeze');
        }
    } catch (e) {}
}

function fmUnstick() {
    try {
        document.querySelectorAll('.pw-sheet-ov:not(.show), .lang-ov:not(.show), .bs-overlay:not(.visible), .bs-sheet:not(.visible)')
            .forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
        if (!fmAnyModalVisible()) {
            document.documentElement.classList.remove('cs-modal-open');
            document.body.classList.remove('cs-modal-open');
        }
        fmClearFreeze();
        ['#app', '#drawer-overlay', '#fmx-main'].forEach(function (s) {
            var n = document.querySelector(s);
            if (n && n.style.pointerEvents === 'none') n.style.pointerEvents = '';
        });
        if (document.body.style.pointerEvents === 'none') document.body.style.pointerEvents = '';
        if (document.documentElement.style.pointerEvents === 'none') document.documentElement.style.pointerEvents = '';
        fmProbeDrawer();
    } catch (e) {}
}

var _fmLogSent = 0;
function fmClientLog(msg) {
    try {
        if (_fmLogSent > 8) return;   
        _fmLogSent++;
        apiRequest('/api/v1/user/client-log', {
            method: 'POST',
            body: JSON.stringify({ events: [String(msg).slice(0, 280)] }),
            headers: { 'Content-Type': 'application/json' },
        }).catch(() => {});
    } catch (e) {}
}

var _fmTrackQ = [], _fmTrackT = null;
function fmTrack(e) {
    try {
        _fmTrackQ.push(String(e).slice(0, 48));
        if (_fmTrackQ.length > 20) _fmTrackQ = _fmTrackQ.slice(-20);
        clearTimeout(_fmTrackT);
        _fmTrackT = setTimeout(_fmFlushTrack, 4000);
    } catch (err) {}
}
function _fmFlushTrack() {
    if (!_fmTrackQ.length) return;
    var ev = _fmTrackQ.splice(0, 20);
    try {
        apiRequest('/api/v1/user/track', {
            method: 'POST',
            body: JSON.stringify({ events: ev }),
            headers: { 'Content-Type': 'application/json' },
        }).catch(function () {});
    } catch (err) {}
}
document.addEventListener('visibilitychange', function () { if (document.hidden) _fmFlushTrack(); });
window.__fmTrack = fmTrack;   

function _fmElDesc(el) {
    try { return (el.tagName || '?') + (el.id ? '#' + el.id : '') + ' cls=' + String(el.className || '').slice(0, 70); } catch (e) { return '?'; }
}

function fmProbeDrawer() {
    try {
        if (!els.drawer || !els.drawer.classList.contains('active')) return;
        var r = els.drawer.getBoundingClientRect();
        if (!r.width || !r.height) return;
        [0.2, 0.5, 0.85].forEach(function (fy) {
            var x = r.left + r.width / 2, y = r.top + r.height * fy;
            for (var n = 0; n < 4; n++) {   
                var hit = document.elementFromPoint(x, y);
                if (!hit || hit === els.drawer || els.drawer.contains(hit)) break;
                var tag = (hit.tagName || '').toUpperCase();
                if (tag === 'HTML' || tag === 'BODY' || hit.id === 'app' || hit.id === 'fmx-main' || hit.id === 'drawer-overlay') {
                    fmClientLog('drawer-under-freeze: ' + _fmElDesc(hit));
                    fmClearFreeze();   
                    break;
                }
                try { console.warn('[FM] слой поверх меню нейтрализован:', hit.tagName, hit.id || '', String(hit.className || '').slice(0, 80)); } catch (e) {}
                fmClientLog('drawer-blocker: ' + _fmElDesc(hit));
                hit.style.pointerEvents = 'none';
            }
        });
    } catch (e) {}
}

function openDrawer() {
    fmUnstick();   
    fillDrawerHeader();
    els.drawer.classList.add('active');
    els.drawerOverlay.classList.add('active');
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    setTimeout(fmProbeDrawer, 450);
    setTimeout(fmProbeDrawer, 1400);
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function fillDrawerHeader() {
    const u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
    const nameEl = document.getElementById('dp-name');
    const avEl = document.getElementById('dp-av');
    const chipEl = document.getElementById('dp-chip');
    if (nameEl) nameEl.textContent = u.first_name || 'Профиль';
    if (avEl) {
        const letter = (u.first_name || 'U').trim().charAt(0).toUpperCase() || 'U';
        avEl.innerHTML = u.photo_url ? `<img src="${escapeHtml(u.photo_url)}" alt="">` : letter;
    }
    const setChip = (tier, paid) => {
        if (!chipEl || !tier) return;
        chipEl.className = 'dp-chip' + (paid ? ' gold' : '');
        chipEl.innerHTML = (paid ? '<i class="ti ti-crown"></i> ' : '') + escapeHtml(tier);
    };
    const cu = cabinetData && cabinetData.user;
    if (cu && cu.tier_display) {
        setChip(cu.tier_display, cu.tier && cu.tier !== 'free' && cu.tier !== 'trial');
    } else {
        apiRequest('/api/v1/user/cabinet').then(d => {
            cabinetData = d;
            const x = d && d.user;
            setChip((x && x.tier_display) || 'Free', x && x.tier && x.tier !== 'free' && x.tier !== 'trial');
        }).catch(() => {});
    }
}


function closeDrawer() {
    els.drawer.classList.remove('active');
    els.drawerOverlay.classList.remove('active');
    if (!fmAnyModalVisible()) {
        document.documentElement.classList.remove('cs-modal-open');
        document.body.classList.remove('cs-modal-open');
    }
}


const PLACEHOLDER_CONFIG = {
    create_post: { title: 'Создание поста', text: 'AI напишет пост в стиле твоего канала. Эта функция уже в разработке — скоро запустим.', icon: 'sparkles' },
    rewrite_post: { title: 'Рерайт поста', text: 'Перепишем чужой пост в твоём стиле. Скоро будет готово.', icon: 'pencil' },
    content_plan: { title: 'Контент-план', text: 'AI составит план постов на неделю. Скоро запустим.', icon: 'calendar' },
    ai_audit: { title: 'ИИ-аудит канала', text: 'Полный разбор: что работает, что нет, план роста на 30 дней. Скоро запустим.', icon: 'target' },
    competitor_analysis: { title: 'Анализ конкурентов', text: 'Что у них набирает охват и почему. Функция готовится к запуску.', icon: 'search' },
    find_advertisers: { title: 'Поиск рекламодателей', text: 'Найдём тех, кто ищет размещение в твоей нише. Скоро запустим.', icon: 'coin' },
    post_price: { title: 'Цена поста', text: 'Калькулятор справедливой цены по реальным метрикам канала. Скоро готово.', icon: 'calculator' },
    negotiation_templates: { title: 'Шаблоны переговоров', text: '3 варианта ответа рекламодателю: деловой, дружелюбный, твёрдый. Скоро запустим.', icon: 'message-circle' },
    referral: { title: 'Друзья и промокод', text: 'Реферальная программа, твой промокод, бонусы. Скоро будет готово.', icon: 'heart-handshake' },
    profile: { title: 'Тариф и подписка', text: 'Твой текущий тариф, лимиты, история. Скоро запустим.', icon: 'user-circle' },
    voice_settings: { title: 'Голос канала', text: 'Настрой как AI пишет под твой стиль: загрузи 3-5 постов или опиши канал. Скоро готово.', icon: 'microphone' },
    add_channel: { title: 'Подключение канала', text: 'Подключи свой Telegram-канал чтобы я видел метрики и подстраивался под твой стиль. Скоро.', icon: 'plus' },
    invite_friend: { title: 'Друзья и промокод', text: 'Реферальная программа, твой промокод, бонусы. Скоро будет готово.', icon: 'heart-handshake' },
};


function handleAction(actionId) {
    closeDrawer();
    fmTrack('fn_' + actionId);   

    if (actionId === 'create_post') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        openPostCreate();
        return;
    }

    if (actionId === 'add_channel' || actionId === 'my_channels') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        openChannels();
        return;
    }

    if (actionId === 'ai_audit') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openAudit === 'function') {
            window.__openAudit();
        }
        return;
    }

    if (actionId === 'rewrite_post') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openRewrite === 'function') { window.__openRewrite(); }
        return;
    }

    if (actionId === 'ai_strategy') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openStrategy === 'function') {
            window.__openStrategy();
        }
        return;
    }

    if (actionId === 'competitor_analysis') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openCompetitors === 'function') {
            window.__openCompetitors();
        }
        return;
    }

    if (actionId === 'find_advertisers') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openAdExchange === 'function') {
            window.__openAdExchange();
        }
        return;
    }

    if (actionId === 'marketplace') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openMarketplace === 'function') {
            window.__openMarketplace();
        }
        return;
    }

    if (actionId === 'content_plan') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openContentPlan === 'function') {
            window.__openContentPlan();
        }
        return;
    }

    if (actionId === 'radar') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openRadar === 'function') { window.__openRadar(); }
        return;
    }

    if (actionId === 'settings') { openCabinet('settings'); return; }

    if (actionId === 'profile') { openCabinet(); return; }
    if (actionId === 'referral' || actionId === 'invite_friend') { openReferral(); return; }
    if (actionId === 'tariffs') { openTariffs(); return; }

    const config = PLACEHOLDER_CONFIG[actionId] || {
        title: 'Скоро будет готово',
        text: 'Эта функция в разработке.',
        icon: 'rocket',
    };

    els.placeholderTitle.textContent = config.title;
    els.placeholderText.textContent = config.text;
    els.placeholderIcon.innerHTML = `<i class="ti ti-${config.icon}"></i>`;

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    localizeTree(screens.placeholder);
    showScreen('placeholder');
}


let cabinetData = null;

function cabNum(n) { return Number(n || 0).toLocaleString('ru-RU'); }
function hapticLight() { if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); }
function hapticMed() { if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium'); }
function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); } catch (e) {}
    return new Promise((res) => {
        try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch (e) {}
        res();
    });
}
function cabToast(msg) {
    let t = document.getElementById('cab-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cab-toast'; t.className = 'cab-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.remove('show'), 2200);
}
function cabSafe(s, def) { return (typeof s === 'string' && /^[a-z0-9-]+$/.test(s)) ? s : def; }
function cabTile(color, icon, size) {
    return `<div class="cab-tile ${size ? size + ' ' : ''}cab-t-${cabSafe(color, 'pu')}"><i class="ti ti-${cabSafe(icon, 'circle')}"></i></div>`;
}
function plural3(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
}
function cabStatusHtml(sub) {
    sub = sub || {};
    if (sub.kind === 'trial') {
        const total = sub.total_days || 7;
        const left = sub.days_left != null ? sub.days_left : total;
        const pct = Math.max(5, Math.min(100, Math.round((sub.used_days || 0) / total * 100)));
        return `<div class="cab-status"><div class="cab-strow"><span class="cab-stlbl"><i class="ti ti-clock-hour-4" style="color:#fbbf24"></i> Пробный период</span><span class="cab-stval">осталось ${left} ${plural3(left, 'день', 'дня', 'дней')}</span></div><div class="cab-stbar"><div class="cab-stfill am" style="width:${pct}%"></div></div><div class="cab-stsub">Полный доступ к Pro-возможностям на время триала</div></div>`;
    }
    if (sub.kind === 'paid') {
        const tail = sub.days_left != null ? `осталось ${sub.days_left} ${plural3(sub.days_left, 'день', 'дня', 'дней')}` : (sub.ends_at ? 'до ' + escapeHtml(sub.ends_at) : 'активна');
        return `<div class="cab-status"><div class="cab-strow"><span class="cab-stlbl"><i class="ti ti-rosette-discount-check" style="color:#5DCAA5"></i> Подписка активна</span><span class="cab-stval">${tail}</span></div><div class="cab-stsub">Все возможности тарифа открыты</div></div>`;
    }
    return `<div class="cab-status"><div class="cab-strow"><span class="cab-stlbl"><i class="ti ti-sparkles" style="color:#818cf8"></i> Тариф Free</span><span class="cab-stval">базовые лимиты</span></div><div class="cab-stsub">Оформи Pro — больше постов в день, аудиты и приоритет на Площадке</div></div>`;
}

const CAB_BENEFITS = {
    pro: [
        'До 8 постов в день на премиум-модели + 100 на стандартной',
        'Оформление карточки, 10 каналов · 30 источников стиля',
        '6 аудитов, 2 анализа конкурентов и 5 подборов площадок в месяц',
    ],
    pro_plus: [
        'До 15 постов в день на премиум-модели + 100 на стандартной',
        'Живой MP4-постер, приоритетный рендер и стиль «Свечение»',
        '15 аудитов, 4 анализа конкурентов и 8 подборов площадок в месяц',
    ],
    agency: [
        'До 24 постов в день на премиум-модели, 25 каналов · 200 источников',
        'MP4-постер, приоритетный рендер, стили «Свечение» и «Стекло»',
        '20 аудитов, 5 анализов конкурентов и 10 подборов площадок в месяц',
    ],
    network: [
        'До 40 постов в день на премиум-модели, 50 каналов · 300 источников',
        'MP4-постер, стили и анимированные стикеры карточки',
        '30 аудитов, 10 анализов конкурентов и 20 подборов площадок в месяц',
    ],
};

async function openCabinet(scrollTo) {
    hapticLight();
    showScreen('cabinet');
    const body = document.getElementById('cabinet-body');
    if (body && !cabinetData) {
        body.innerHTML = '<div class="cab-card" style="text-align:center;color:var(--text-secondary);padding:44px 16px;">Загрузка…</div>';
    }
    try {
        const data = await apiRequest('/api/v1/user/cabinet');
        cabinetData = data;
        renderCabinet(data);
        if (scrollTo) {
            const sec = document.getElementById('cab-sec-' + scrollTo);
            if (sec) setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        }
    } catch (e) {
        if (body) body.innerHTML = '<div class="cab-card" style="text-align:center;color:var(--text-secondary);padding:44px 16px;">Не удалось загрузить кабинет.<br>Попробуй позже.</div>';
    }
}

function cabUsageRow(u) {
    const limit = u.limit, used = u.used;
    let vtext, fillCls, pct;
    if (limit >= 999999) { vtext = `<b>${cabNum(used)}</b> / ∞`; fillCls = 'gr'; pct = 8; }
    else if (limit <= 0) { vtext = 'недоступно на этом тарифе'; fillCls = 'pu'; pct = 0; }
    else {
        vtext = `<b>${cabNum(used)}</b> / ${cabNum(limit)}`;
        pct = Math.min(100, Math.round(used / limit * 100));
        fillCls = used >= limit ? 'full' : (pct >= 70 ? 'am' : 'gr');
    }
    return `<div class="cab-use">${cabTile(u.color, u.icon, 'md')}<div class="cab-ui"><div class="cab-utop"><span class="cab-unm">${escapeHtml(u.label)}</span><span class="cab-uv">${vtext}</span></div><div class="cab-bar"><div class="cab-fill ${fillCls}" style="width:${pct}%"></div></div></div></div>`;
}

const RF_LEVEL_NAMES = { starter: 'Starter', member: 'Starter', connector: 'Connector', influencer: 'Influencer', ambassador: 'Ambassador', founders_circle: 'Founders Circle' };
const RF_PERK_TEXT = {
    burst24_monthly: '+1 всплеск 24 ч/мес',
    promo_week_monthly: '+1 неделя промо/мес',
    fx_glow: 'стиль «Свечение»',
    extra_audit_1: '+1 аудит/мес',
    leaderboard: 'лидерборд',
    fx_glass: 'стеклянные кнопки',
    extra_audit_2: '+2 аудита/мес',
    promo_discount_10: '−10% на продвижение',
    founders_shelf: 'полка Founders',
    fx_all: 'все стили карточек',
    sub_discount_10: '−10% на подписку навсегда',
    promo_discount_20: '−20% на продвижение',
};

function cabRefLadder(r) {
    const curKey = (r.level === 'member' ? 'starter' : r.level) || 'starter';
    const ladder = (r.ladder && r.ladder.length) ? r.ladder : [];
    let ci = ladder.findIndex((x) => x.key === curKey);
    if (ci < 0) ci = 0;
    const firstN = r.reward_first_payments || 3;
    const rows = ladder.map((x, i) => {
        const st = i < ci ? 'done' : (i === ci ? 'cur' : 'fut');
        const here = i === ci ? '<span class="rf-here">ты здесь</span>' : '';
        const need = x.need > 0 ? `${cabNum(x.need)} ${plural3(x.need, 'оплативший', 'оплативших', 'оплативших')}` : 'старт';
        const perks = (x.perks || []).map((p) => RF_PERK_TEXT[p] || p).join(' · ');
        const seats = x.seats ? ` · ${cabNum(x.seats)} мест` : '';
        const rate = i === 0
            ? `${x.rate_pct}% от первых ${firstN} платежей — кредитами`
            : `${x.rate_pct}% от платежей`;
        const perkLine = `${rate}${perks ? ' · ' + perks : ''}`;
        return `<div class="rf-step ${st}"><span class="rf-rail"></span><span class="rf-node"></span><div class="rf-txt"><div class="nm">${escapeHtml(RF_LEVEL_NAMES[x.key] || x.key)} <span class="need">· ${escapeHtml(need)}${seats}</span></div><div class="perk">${escapeHtml(perkLine)}</div></div>${here}</div>`;
    }).join('');
    return `<div class="rf-ladder">${rows}</div>`;
}

function refCardHtml(r) {
    r = r || {};
    const rate = r.rate_pct || 20;
    const firstN = r.reward_first_payments || 3;
    const fDisc = r.friend_discount_pct || 15;
    const fDays = r.friend_trial_days || 10;
    const bDays = r.base_trial_days || 7;
    const link = escapeHtml((r.referral_link || '').replace(/^https?:\/\//, ''));
    const nextLine = r.next_level_display
        ? `до <b>${escapeHtml(r.next_level_display)}</b> · ещё <b>${cabNum(r.needed_for_next)}</b> оплативших`
        : 'высший уровень';
    return `<div class="rf">
  <div class="rf-card">
    <span class="rf-eyebrow">Приглашено по твоей ссылке</span>
    <div class="rf-stats">
      <div class="rf-stat"><div class="n">${cabNum(r.total_invited)}</div><div class="l">перешло</div></div>
      <div class="rf-divx"></div>
      <div class="rf-stat acc"><div class="n">${cabNum(r.paid_referrals)}</div><div class="l">оплатили</div></div>
      <div class="rf-divx"></div>
      <div class="rf-stat"><div class="n">${cabNum(r.pending_bonuses)}</div><div class="l">в ожидании</div></div>
    </div>
  </div>

  <div class="rf-card rf-value rf-glow">
    <div class="rf-body">
      <div class="rf-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
      <div>
        <div class="rf-rate"><b>${rate}%</b><span>от первых ${firstN} платежей каждого приглашённого — кредитами на баланс</span></div>
        <p>Другу −${fDisc}% на первый месяц и расширенный триал: ${fDays} дней вместо ${bDays}. Кредиты тратишь на свой тариф и на продвижение офферов в ленте.</p>
        <span class="rf-chip"><span class="dot"></span>Ранний партнёр · повышенная ставка · активируется с запуском оплаты</span>
      </div>
    </div>
    <div class="rf-bal">
      <span class="k">Баланс кредитов</span>
      <span class="v">${cabNum(r.credits_balance)}&nbsp;₽</span>
      <span class="e">на тариф и продвижение</span>
    </div>
  </div>

  <div class="rf-card">
    <div class="rf-lvltop">
      <div class="rf-lvlnow"><span class="rf-tierbig"></span><div><div class="nm">${escapeHtml(r.level_display || 'Starter')}</div><div class="sub">твой уровень</div></div></div>
      <div class="rf-lvlnext">${nextLine}</div>
    </div>
    <div class="rf-bar"><i style="width:${Math.max(4, Math.min(100, r.progress_pct || 0))}%"></i></div>
    ${cabRefLadder(r)}
  </div>

  <div class="rf-card rf-glow">
    <div class="rf-lbl" style="margin-top:0">Твоя ссылка</div>
    <div class="rf-field">
      <span class="link" id="cab-link">${link}</span>
      <button class="rf-fbtn" id="cab-linkcopy" aria-label="Копировать ссылку"><i class="ti ti-link"></i></button>
    </div>

    <button class="rf-cta" id="cab-share"><i class="ti ti-send"></i> Поделиться ссылкой</button>
    <button class="rf-cta ghost" id="cab-invite-copy"><i class="ti ti-copy"></i> Скопировать текст приглашения</button>
  </div>

  <div class="rf-how">
    <span class="rf-eyebrow">Как это работает</span>
    <div class="rf-hrow"><span class="rf-hnum">1</span><p>Делишься ссылкой с админами каналов.</p></div>
    <div class="rf-hrow"><span class="rf-hnum">2</span><p>Друг регистрируется по ней: −${fDisc}% на первый месяц и ${fDays} дней триала вместо ${bDays}.</p></div>
    <div class="rf-hrow"><span class="rf-hnum">3</span><p>С каждого из его первых ${firstN} платежей тебе идут кредиты — тем больше, чем выше уровень.</p></div>
  </div>

  <div class="rf-foot"><b>ForgeMetrics</b> · @ForgeMetricsBot</div>
</div>`;
}

function renderReferral(d) {
    const body = document.getElementById('referral-body');
    if (!body) return;
    const r = (d && d.referral) || {};
    body.innerHTML = refCardHtml(r);
    wireReferral(d || {});
    if (screens.referral) localizeTree(screens.referral);
}

async function openReferral() {
    hapticLight();
    showScreen('referral');
    const body = document.getElementById('referral-body');
    if (body && !cabinetData) body.innerHTML = '<div class="cab-card" style="text-align:center;color:var(--text-secondary);padding:44px 16px;">Загрузка…</div>';
    else if (body && cabinetData) renderReferral(cabinetData);
    try {
        const data = await apiRequest('/api/v1/user/cabinet');
        cabinetData = data;
        renderReferral(data);
        loadRefLeaderboard();
    } catch (e) {
        if (body && !cabinetData) body.innerHTML = '<div class="cab-card" style="text-align:center;color:var(--text-secondary);padding:44px 16px;">Не удалось загрузить.<br>Попробуй позже.</div>';
    }
}

async function loadRefLeaderboard() {
    try {
        const r = await apiRequest('/api/v1/referral/leaderboard');
        if (!r || !r.ok || !r.visible || !(r.items || []).length) return;
        const host = document.getElementById('referral-body');
        if (!host || host.querySelector('.rf-lb')) return;
        const rows = r.items.map((x, i) => `<div class="rf-hrow"><span class="rf-hnum">${i + 1}</span><p style="display:flex;justify-content:space-between;gap:10px;"><span>${escapeHtml(x.name)}</span><b>${cabNum(x.activated)}</b></p></div>`).join('');
        const me = r.me ? `<p class="rf-lbme">Твоя позиция: ${r.me}</p>` : '';
        const block = document.createElement('div');
        block.className = 'rf-how rf-lb';
        block.innerHTML = `<span class="rf-eyebrow">Лидерборд недели</span>${rows}${me}<p style="font-size:12px;color:var(--text-secondary);margin-top:8px;">Приз лучшему — ${escapeHtml(r.prize)}. Считаются приглашённые, активировавшие триал за 7 дней.</p>`;
        const foot = host.querySelector('.rf-foot');
        if (foot) foot.parentNode.insertBefore(block, foot); else host.appendChild(block);
        localizeTree(block);
    } catch (e) {  }
}

function renderCabinet(d) {
    const body = document.getElementById('cabinet-body');
    if (!body) return;
    const u = d.user || {};
    const photo = tg?.initDataUnsafe?.user?.photo_url;
    const initial = escapeHtml((u.first_name || 'U').trim().charAt(0).toUpperCase() || 'U');
    const isPaid = u.tier && u.tier !== 'free' && u.tier !== 'trial';

    const streakChip = '';   
    let html = `<div class="cab-card cab-hero"><div class="cab-hrow"><div class="cab-av">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : initial}</div><div class="cab-hi"><div class="cab-nm">${escapeHtml(u.first_name || 'Профиль')}</div><div class="cab-hsub"><i class="ti ti-calendar-event"></i> ${u.member_since ? 'в ForgeMetrics с ' + escapeHtml(u.member_since) : 'ForgeMetrics'}</div><span class="cab-chip${isPaid ? ' gold' : ''}"><i class="ti ti-crown"></i> Тариф ${escapeHtml(u.tier_display || 'Free')}${u.bonus_days ? ' · +' + cabNum(u.bonus_days) + ' дн.' : ''}</span>${streakChip}</div></div>${cabStatusHtml(d.subscription)}</div>`;

    if (d.upgrade) {
        const up = d.upgrade;
        const bens = (CAB_BENEFITS[up.target] || []).map((b) => `<div class="cab-ben"><i class="ti ti-check"></i> ${escapeHtml(b)}</div>`).join('');
        html += `<div class="cab-card"><div class="cab-plan-hd">${cabTile('pu', 'rocket')}<div class="txt"><div class="k">Текущий тариф</div><div class="v">${escapeHtml(u.tier_display)} · базовый доступ</div></div></div><div class="cab-bens">${bens}</div><button class="cab-cta" id="cab-upgrade"><i class="ti ti-rocket"></i> Оформить ${escapeHtml(up.target_display)} — ${cabNum(up.price)} ₽/мес</button><div class="cab-cta-note">Помесячная подписка · <b id="cab-compare">сравнить все тарифы →</b></div></div>`;
    } else {
        html += `<div class="cab-card"><div class="cab-plan-hd">${cabTile('am', 'crown')}<div class="txt"><div class="k">Текущий тариф</div><div class="v">${escapeHtml(u.tier_display)} · максимум</div></div></div><div class="cab-bens"><div class="cab-ben"><i class="ti ti-check"></i> У тебя высший тариф — все возможности открыты</div></div></div>`;
    }

    html += `<div class="cab-card" id="cab-sec-usage"><div class="cab-stt"><h3>${cabTile('am', 'bolt', 'sm')} Лимиты сегодня</h3><span class="cab-link">обновятся в 00:00</span></div>${(d.usage || []).map(cabUsageRow).join('')}</div>`;



    const notifOn = (function () { try { return localStorage.getItem('fm_notif') !== '0'; } catch (e) { return true; } })();
    html += `<div class="cab-card" id="cab-sec-settings"><div class="cab-stt"><h3>${cabTile('bl', 'settings', 'sm')} Настройки</h3></div><div class="cab-set" id="cab-notif"><div class="cab-tile md cab-t-am"><i class="ti ti-bell"></i></div><div class="cab-si"><div class="cab-snm">Уведомления</div><div class="cab-sd">Заявки в нише, отклики, статусы офферов</div></div><div class="cab-tog${notifOn ? ' on' : ''}" id="cab-notif-tog"></div></div><div class="cab-set" id="cab-theme"><div class="cab-tile md cab-t-pu"><i class="ti ti-palette"></i></div><div class="cab-si"><div class="cab-snm">Тема оформления</div><div class="cab-sd">Тёмная фирменная · выбор тем</div></div><span class="cab-soon">Скоро</span></div><div class="cab-set" id="cab-lang"><div class="cab-tile md cab-t-gr"><i class="ti ti-world"></i></div><div class="cab-si"><div class="cab-snm">${t('Язык интерфейса')}</div><div class="cab-sd">${window.I18N ? (getLang().toUpperCase() + ' <span class="cab-flag">' + ((I18N.flagSvg && I18N.flagSvg[getLang()]) || '') + '</span> ' + escapeHtml(I18N.names[getLang()])) : 'RU Русский'}</div></div><i class="ti ti-chevron-right cab-chev"></i></div><div class="cab-set" id="cab-about"><div class="cab-tile md cab-t-bl"><i class="ti ti-info-circle"></i></div><div class="cab-si"><div class="cab-snm">Помощь и о приложении</div><div class="cab-sd">Правила, метрики, поддержка</div></div><i class="ti ti-chevron-right cab-chev"></i></div></div>`;

    html += `<div class="cab-foot"><b>ForgeMetrics</b> · @ForgeMetricsBot</div>`;

    body.innerHTML = html;
    wireCabinet(d);
    localizeTree(screens.cabinet);
}

function wireCabinet(d) {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('cab-upgrade', () => {
        const up = d && d.upgrade;
        if (!up || !up.target) { openTariffs(); return; }
        hapticMed();
        openCheckout({
            name: up.target_display, price: up.price, sub: true, periodWord: 'Месяц', per: '/мес',
            icon: 'rocket', color: 'pu', rowLabel: `Тариф ${up.target_display}, месяц`,
            lock: () => apiRequest('/api/v1/user/book-tariff', { method: 'POST', body: JSON.stringify({ plan: up.target }) }).then((r) => r),
        });
    });
    on('cab-compare', () => { openTariffs(); });
    on('cab-about', () => { hapticLight(); if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/ForgeMetricsBot'); });
    on('cab-theme', () => cabToast('Темы оформления — скоро'));
    on('cab-lang', () => openLangPicker());
    on('cab-notif', () => {
        const tog = document.getElementById('cab-notif-tog');
        if (!tog) return;
        const now = tog.classList.toggle('on');
        try { localStorage.setItem('fm_notif', now ? '1' : '0'); } catch (e) {}
        cabToast(now ? 'Уведомления включены' : 'Уведомления выключены');
    });
}

function wireReferral(d) {
    d = d || {};
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('cab-copy', () => {
        const code = (d.referral && d.referral.promo_code) || '';
        const btn = document.getElementById('cab-copy');
        copyText(code).then(() => {
            if (btn) { btn.classList.add('ok'); btn.innerHTML = '<i class="ti ti-check"></i>'; setTimeout(() => { btn.classList.remove('ok'); btn.innerHTML = '<i class="ti ti-copy"></i>'; }, 1600); }
            cabToast('Промокод скопирован');
        });
    });
    on('cab-share', () => {
        hapticLight();
        const link = (d.referral && d.referral.referral_link) || '';
        const text = 'Присоединяйся к ForgeMetrics — ИИ-помощник и биржа рекламы для Telegram-каналов. По моей ссылке −15% на первый месяц:';
        const url = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text);
        if (tg?.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank');
    });
    on('cab-linkcopy', () => {
        const link = (d.referral && d.referral.referral_link) || '';
        const b = document.getElementById('cab-linkcopy');
        copyText(link).then(() => { if (b) { b.classList.add('ok'); b.innerHTML = '<i class="ti ti-check"></i>'; setTimeout(() => { b.classList.remove('ok'); b.innerHTML = '<i class="ti ti-link"></i>'; }, 1600); } cabToast('Ссылка скопирована'); });
    });
    on('cab-invite-copy', () => {
        hapticLight();
        const link = (d.referral && d.referral.referral_link) || '';
        const text = t('Присоединяйся к ForgeMetrics — ИИ-инструмент и биржа рекламы для админов Telegram-каналов. По моей ссылке −15% на первый месяц:') + '\n' + link;
        const b = document.getElementById('cab-invite-copy');
        copyText(text).then(() => { cabToast('Текст приглашения скопирован'); if (b) { b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 1400); } });
    });
    (function () {
        const curCode = (d.referral && d.referral.promo_code) || '';
        const inp = document.getElementById('cab-pinp');
        const setMsg = (txt, cls) => { const m = document.getElementById('cab-pmsg'); if (m) { m.textContent = txt; m.className = 'cab-pmsg' + (cls ? ' ' + cls : ''); } };
        const setSave = (ok) => { const b = document.getElementById('cab-psave'); if (b) b.disabled = !ok; };
        let chkT = null, chkLast = '';
        function check() {
            const el = document.getElementById('cab-pinp'); if (!el) return;
            const code = el.value.trim();
            if (!code) { setMsg(t('Промокод не может быть пустым'), ''); setSave(false); return; }
            if (code === curCode) { setMsg('Это твой текущий код', ''); setSave(false); return; }
            if (code.length < 4) { setMsg('Минимум 4 символа', 'bad'); setSave(false); return; }
            setMsg('Проверяю…', ''); setSave(false); chkLast = code;
            apiRequest('/api/v1/referral/promo/check', { method: 'POST', body: JSON.stringify({ code: code }), headers: { 'Content-Type': 'application/json' } })
                .then((res) => {
                    if (chkLast !== code) return;
                    if (res && res.available) { setMsg('✓ ' + t(res.message || 'Промокод свободен'), 'ok'); setSave(true); }
                    else { setMsg(t((res && res.message) || 'Недоступно'), 'bad'); setSave(false); }
                }).catch(() => { if (chkLast === code) { setMsg('Не удалось проверить', 'bad'); setSave(false); } });
        }
        on('cab-edit', () => {
            hapticLight();
            const dl = (d.referral && d.referral.promo_change_days_left) || 0;
            if (dl > 0) { cabToast('Сменить промокод можно через ' + dl + ' дн.'); return; }
            const view = document.getElementById('cab-promo-view'), ed = document.getElementById('cab-promo-edit'), el = document.getElementById('cab-pinp');
            if (!ed || !el) return;
            if (view) view.style.display = 'none';
            ed.classList.add('on'); el.value = curCode;
            try { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } catch (e) {}
            check();
        });
        on('cab-pcancel', () => {
            const view = document.getElementById('cab-promo-view'), ed = document.getElementById('cab-promo-edit');
            if (ed) ed.classList.remove('on'); if (view) view.style.display = '';
        });
        if (inp) inp.addEventListener('input', () => {
            const v = inp.value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
            if (v !== inp.value) inp.value = v;
            clearTimeout(chkT); chkT = setTimeout(check, 320);
        });
        on('cab-psave', () => {
            const el = document.getElementById('cab-pinp'), btn = document.getElementById('cab-psave'); if (!el || (btn && btn.disabled)) return;
            const code = el.value.trim(); if (!code) return;
            if (btn) btn.disabled = true; setMsg('Сохраняю…', '');
            apiRequest('/api/v1/referral/promo/change', { method: 'POST', body: JSON.stringify({ new_code: code }), headers: { 'Content-Type': 'application/json' } })
                .then((res) => {
                    if (res && res.success) {
                        hapticLight();
                        d.referral = d.referral || {};
                        d.referral.promo_code = res.promo_code;
                        d.referral.referral_link = 'https://t.me/ForgeMetricsBot?start=' + res.promo_code;
                        cabToast('Промокод изменён');
                        renderReferral(d);
                    } else {
                        setMsg(t((res && res.message) || 'Не удалось изменить'), 'bad'); setSave(false);
                    }
                }).catch(() => { setMsg('Не удалось изменить', 'bad'); setSave(false); });
        });
    })();
}


function closeLang(ov) { ov.classList.remove('show'); setTimeout(() => { if (ov && ov.parentNode) ov.remove(); }, 260); }
function openLangPicker() {
    hapticLight();
    if (!window.I18N) return;
    const cur = getLang();
    const rows = I18N.supported.map((l) => `<button class="lang-row${l === cur ? ' on' : ''}" data-l="${l}"><span class="lc">${l.toUpperCase()}</span><span class="fl">${(I18N.flagSvg && I18N.flagSvg[l]) || I18N.flags[l]}</span><span class="nm">${escapeHtml(I18N.names[l])}</span>${l === cur ? '<i class="ti ti-check ck"></i>' : ''}</button>`).join('');
    const old = document.getElementById('lang-ov'); if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'lang-ov';
    ov.className = 'lang-ov';
    ov.innerHTML = `<div class="lang-sheet"><div class="lang-h">${t('Язык интерфейса')}</div><div class="lang-list">${rows}</div></div>`;
    document.body.appendChild(ov);
    localizeTree(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    ov.addEventListener('click', (e) => { if (e.target === ov) closeLang(ov); });
    ov.querySelectorAll('[data-l]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const l = btn.getAttribute('data-l');
            if (window.setLang(l)) { hapticMed(); location.reload(); }
            else closeLang(ov);
        });
    });
}

let tariffsData = null;
let tfPeriod = 'month'; 
let tfReturn = 'dashboard'; 
const TP_COLOR = { light: 'bl', pro: 'pu', pro_plus: 'gd', agency: 'gr', network: 'pk' };

function tfIcon(key) { return key === 'light' ? 'package' : key === 'pro' ? 'rocket' : key === 'agency' ? 'briefcase' : key === 'network' ? 'affiliate' : 'crown'; }

async function openTariffs() {
    try {
        for (const [name, el] of Object.entries(screens)) {
            if (el && name !== 'tariffs' && el.style.display !== 'none') { tfReturn = name; break; }
        }
    } catch (e) { tfReturn = 'dashboard'; }
    hapticLight();
    fmTrack('tariffs');
    showScreen('tariffs');
    const body = document.getElementById('tariffs-body');
    if (body && !tariffsData) body.innerHTML = '<div class="tf-plan" style="text-align:center;color:var(--text-secondary);padding:42px 16px;">Загрузка…</div>';
    try {
        const data = await apiRequest('/api/v1/user/tariffs');
        tariffsData = data;
        renderTariffs(data);
    } catch (e) {
        if (body) body.innerHTML = '<div class="tf-plan" style="text-align:center;color:var(--text-secondary);padding:42px 16px;">Не удалось загрузить тарифы.</div>';
    }
}

function tfCurBanner(d) {
    if (d.current_tier === 'trial') {
        const n = d.trial_days_left;
        const dw = (n != null) ? `осталось ${n} ${plural3(n, 'день', 'дня', 'дней')}` : 'активен';
        return `<div class="tf-cur trial"><div class="ic"><i class="ti ti-rocket"></i></div><div class="t"><div class="n">Trial активен — премиум-генерация, аудит и биржа</div><div class="s">Пробный период · ${dw}. Закрепи тариф, чтобы сохранить премиум-модель, аудиты и каналы после триала.</div></div></div>`;
    }
    if (['light', 'pro', 'pro_plus', 'agency', 'network'].includes(d.current_tier)) return '';
    return `<div class="tf-cur free"><div class="ic"><i class="ti ti-sparkles"></i></div><div class="t"><div class="n">Сейчас у тебя Free</div><div class="s">3 поста в день, 1 канал. Выбери план для полного доступа.</div></div></div>`;
}

function tfCta(plan, d) {
    if (d.current_tier === plan.key) return '<button class="tf-cta cur" disabled><i class="ti ti-circle-check"></i> Твой тариф</button>';
    const cls = plan.popular ? 'prime' : (plan.tile === 'gold' ? 'gold' : 'ghost');
    const shine = plan.popular ? '<span class="shine"></span>' : '';
    const isYear = tfPeriod === 'year';
    const price = isYear ? plan.price_year : plan.price;
    return `<button class="tf-cta ${cls}" data-buy="${plan.key}">${shine}Оформить · ${cabNum(price)} ₽</button>`;
}

function tfPlanCard(plan, d) {
    const isYear = tfPeriod === 'year';
    const price = isYear ? plan.price_year : plan.price;
    const per = isYear ? '/год' : '/мес';
    const color = TP_COLOR[plan.key] || 'pu';
    const ribbon = plan.popular ? '<span class="tp-rib">★ Оптимальный</span>' : '';
    const feats = (plan.features || []).map((f) => `<div class="tp-feat"><i class="ti ti-check"></i> ${escapeHtml(f)}</div>`).join('');
    const lead = plan.lead ? `<div class="tp-lead">${escapeHtml(plan.lead)}</div>` : '';
    const save = isYear ? '<div class="tp-save">2 месяца в подарок</div>' : '';
    let cta;
    if (d.current_tier === plan.key) cta = '<div class="tp-cta cur"><i class="ti ti-circle-check"></i> Твой тариф</div>';
    else cta = `<button class="tp-cta" data-buy="${plan.key}">Оформить · ${cabNum(price)} ₽</button>`;
    const openCls = plan.popular ? ' open' : '';
    const popCls = plan.popular ? ' pop' : '';
    return `<div class="tp-card tp-${color}${popCls}${openCls}" data-plan="${escapeHtml(plan.key)}">
      <button class="tp-head" data-tphead="${escapeHtml(plan.key)}" aria-expanded="${plan.popular ? 'true' : 'false'}">
        <div class="tp-tile"><i class="ti ti-${tfIcon(plan.key)}"></i></div>
        <div class="tp-main">
          <div class="tp-r1"><span class="tp-name">${escapeHtml(plan.name)}</span>${ribbon}<span class="tp-price"><b>${cabNum(price)} ₽</b><span class="tp-per">${per}</span></span></div>
          <div class="tp-brief">${escapeHtml(plan.brief || '')}</div>
        </div>
        <i class="ti ti-chevron-down tp-chev"></i>
      </button>
      <div class="tp-body"><div class="tp-in">${lead}<div class="tp-feats">${feats}</div>${save}${cta}</div></div>
    </div>`;
}

const tfReduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function flipToggle(owner, toggle, open, fadeSel) {
    if (tfReduceMotion || typeof owner.animate !== 'function') { toggle(open); return; }
    const movers = [];
    let node = owner;
    while (node && node.parentElement && node.id !== 'tariffs-body') {
        let seen = false;
        Array.from(node.parentElement.children).forEach((el) => {
            if (el === node) { seen = true; return; }
            if (seen) movers.push(el);
        });
        node = node.parentElement;
        if (node && node.id === 'tariffs-body') break;
    }
    const run = () => {
        const tops = movers.map((el) => el.getBoundingClientRect().top);
        toggle(open);
        movers.forEach((el, i) => {
            const d = tops[i] - el.getBoundingClientRect().top;
            if (Math.abs(d) < 1) return;
            if (el._fa) el._fa.cancel();
            const a = el.animate(
                [{ transform: `translateY(${d}px)` }, { transform: 'none' }],
                { duration: 240, easing: 'cubic-bezier(.33,0,.2,1)' },
            );
            el._fa = a;
            const done = () => { if (el._fa === a) el._fa = null; };
            a.onfinish = done; a.oncancel = done;
        });
    };
    if (open) { run(); return; }
    const fade = fadeSel ? owner.querySelector(fadeSel) : null;
    if (!fade) { run(); return; }
    fade.style.transition = 'opacity .12s ease';
    fade.style.opacity = '0';
    setTimeout(() => { run(); fade.style.transition = ''; fade.style.opacity = ''; }, 120);
}

function tfAnimateCard(card, open) {
    flipToggle(card, (o) => card.classList.toggle('open', o), open, '.tp-in');
}

function tfErow(e) {
    const hasEx = !!e.explain;
    const chev = hasEx ? '<i class="ti ti-chevron-down tf-exchev"></i>' : '';
    const cta = e.key
        ? `<button class="tf-excta" data-buyx="${escapeHtml(e.key)}"><i class="ti ti-shopping-cart"></i> Купить — ${cabNum(e.price)} ₽</button>`
        : '';
    const ex = hasEx ? `<div class="tf-ex"><div class="tf-exin">${escapeHtml(e.explain)}${cta}</div></div>` : '';
    return `<div class="tf-erow${hasEx ? ' tap' : ''}"><div class="tf-erow-h"><span class="l">${escapeHtml(e.label)}</span><span class="p">${cabNum(e.price)} ₽</span>${chev}</div>${ex}</div>`;
}

function renderTariffs(d) {
    const body = document.getElementById('tariffs-body');
    if (!body) return;
    const disc = d.annual_discount_pct || 17;
    let html = tfCurBanner(d);
    html += `<div class="tf-billtog"><button class="tf-bt${tfPeriod === 'month' ? ' on' : ''}" data-per="month">Месяц</button><button class="tf-bt${tfPeriod === 'year' ? ' on' : ''}" data-per="year">Год <span class="sv">−${disc}%</span></button></div>`;
    html += '<div class="tf-sub">Выбери план и оформи подписку. После триала остаётся бесплатный Free.</div>';
    if ((d.bookings_count || 0) >= 25) html += `<div class="tf-sub" style="margin-top:-6px;"><i class="ti ti-users"></i> ${cabNum(d.bookings_count)} админов уже забронировали тарифы — цена брони фиксируется навсегда.</div>`;
    if (d.booked_plan && d.booked_price) html += `<div class="tf-sub" style="margin-top:-6px;color:#34d399;"><i class="ti ti-lock-check"></i> Твоя бронь: ${escapeHtml(TIER_NAMES[d.booked_plan] || d.booked_plan)} по ${cabNum(d.booked_price)} ₽/мес — цена зафиксирована.</div>`;
    html += (d.plans || []).map((p) => tfPlanCard(p, d)).join('');
    const extras = (d.extras || []).map((e) => tfErow(e)).join('');
    if (extras) html += `<div class="tf-extras"><div class="tf-eh"><span class="et"><i class="ti ti-plus"></i></span> Разовые пакеты (без подписки)</div>${extras}</div>`;
    const promos = (d.promotions || []).map((e) => tfErow(e)).join('');
    if (promos) html += `<div class="tf-extras"><div class="tf-eh"><span class="et"><i class="ti ti-speakerphone"></i></span> Продвижение в ленте рекламы</div>${promos}</div>`;
    body.innerHTML = html;
    localizeTree(screens.tariffs);
    body.querySelectorAll('[data-per]').forEach((btn) => btn.addEventListener('click', () => {
        const per = btn.getAttribute('data-per');
        if (per === tfPeriod) return;
        tfPeriod = per; hapticLight(); renderTariffs(d);
    }));
    body.querySelectorAll('[data-tphead]').forEach((h) => h.addEventListener('click', () => {
        const card = h.closest('.tp-card');
        if (!card) return;
        hapticLight();
        const open = !card.classList.contains('open');
        h.setAttribute('aria-expanded', open ? 'true' : 'false');
        tfAnimateCard(card, open);
    }));
    body.querySelectorAll('.tf-erow.tap .tf-erow-h').forEach((h) => h.addEventListener('click', () => {
        const row = h.closest('.tf-erow');
        if (!row) return;
        hapticLight();
        const open = !row.classList.contains('open');
        flipToggle(row, (o) => row.classList.toggle('open', o), open, '.tf-exin');
    }));
    body.querySelectorAll('[data-buyx]').forEach((btn) => btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        hapticMed();
        coBuyExtra(btn.getAttribute('data-buyx'));
    }));
    body.querySelectorAll('[data-buy]').forEach((btn) => {
        btn.addEventListener('click', () => { hapticMed(); coBuyPlan(btn.getAttribute('data-buy')); });
    });
}


let _coCtx = null;

function coPeriodWord() { return tfPeriod === 'year' ? 'Год' : 'Месяц'; }

function coBuyPlan(planKey) {
    const d = tariffsData;
    if (!d || !Array.isArray(d.plans)) return;
    const plan = d.plans.find((p) => p.key === planKey);
    if (!plan) return;
    const isYear = tfPeriod === 'year';
    const price = isYear ? plan.price_year : plan.price;
    const pw = coPeriodWord();
    openCheckout({
        name: plan.name, price, sub: true, periodWord: pw, per: isYear ? '/год' : '/мес',
        icon: tfIcon(plan.key), color: TP_COLOR[plan.key] || 'pu',
        rowLabel: `Тариф ${plan.name}, ${pw.toLowerCase()}`,
        lock: () => apiRequest('/api/v1/user/book-tariff', { method: 'POST', body: JSON.stringify({ plan: plan.key }) })
            .then((r) => { if (r && r.ok && tariffsData) { tariffsData.booked_plan = plan.key; renderTariffs(tariffsData); } return r; }),
    });
}

function coBuyExtra(key) {
    const d = tariffsData;
    if (!d) return;
    const e = [].concat(d.extras || [], d.promotions || []).find((x) => x.key === key);
    if (!e) return;
    openCheckout({ name: e.label, price: e.price, sub: false, icon: 'shopping-cart', color: 'pu', rowLabel: e.label });
}

function openCheckout(opts) {
    if (!opts || !opts.price) return;
    closeCheckout();
    const price = opts.price;
    const subline = opts.sub ? `Подписка · ${opts.periodWord || 'Месяц'}` : 'Разовый пакет';
    const perHtml = opts.per ? `<span>${opts.per}</span>` : '';
    const overlay = document.createElement('div');
    overlay.className = 'bs-overlay';
    const sheet = document.createElement('div');
    sheet.className = 'bs-sheet co-sheet';
    sheet.innerHTML = `
        <div class="bs-handle"></div>
        <div class="co-title">Оформление заказа</div>
        <div class="co-plan">
          <div class="co-tile co-t-${opts.color || 'pu'}"><i class="ti ti-${opts.icon || 'package'}"></i></div>
          <div class="co-plan-info">
            <div class="co-plan-name">${escapeHtml(opts.name)}</div>
            <div class="co-plan-sub">${subline}</div>
          </div>
          <div class="co-plan-price"><b>${cabNum(price)} ₽</b>${perHtml}</div>
        </div>
        <div class="co-rows">
          <div class="co-row"><span>${escapeHtml(opts.rowLabel || opts.name)}</span><span>${cabNum(price)} ₽</span></div>
          <div class="co-row co-total"><span>К оплате</span><span class="co-sum">${cabNum(price)} ₽</span></div>
        </div>
        <button class="co-pay" data-copay="1"><i class="ti ti-credit-card"></i> Оплатить ${cabNum(price)} ₽</button>
        <button class="co-close">Закрыть</button>
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => { overlay.classList.add('visible'); sheet.classList.add('visible'); });
    _coCtx = { overlay, sheet, opts };
    overlay.addEventListener('click', closeCheckout);
    sheet.querySelector('.co-close').addEventListener('click', closeCheckout);
    const payBtn = sheet.querySelector('[data-copay]');
    if (payBtn) payBtn.addEventListener('click', () => { hapticMed(); coPay(opts); });
}

function coPay(opts) {
    if (!_coCtx || !_coCtx.sheet) return;
    const sheet = _coCtx.sheet;
    const lockHtml = opts.lock
        ? `<button class="co-pay" data-colock="1"><i class="ti ti-lock-check"></i> Закрепить цену — ${cabNum(opts.price)} ₽</button>`
        : '';
    const extraLine = opts.lock
        ? ' Можешь закрепить текущую цену — уведомим, когда откроем оплату.'
        : ' Мы уведомим, когда оплата откроется.';
    sheet.innerHTML = `
        <div class="bs-handle"></div>
        <div class="co-pend">
          <div class="co-pend-ic"><i class="ti ti-clock-hour-4"></i></div>
          <div class="co-pend-t">Приём платежей подключается</div>
          <div class="co-pend-s">Оплата станет доступна в ближайшее время.${extraLine}</div>
          ${lockHtml}
          <button class="co-close">Закрыть</button>
        </div>
    `;
    sheet.querySelector('.co-close').addEventListener('click', closeCheckout);
    const lockBtn = sheet.querySelector('[data-colock]');
    if (lockBtn && opts.lock) lockBtn.addEventListener('click', async () => {
        hapticMed();
        lockBtn.disabled = true;
        try {
            const r = await opts.lock();
            if (r && r.ok) {
                closeCheckout();
                try {
                    if (r.booked && tariffsData) {
                        tariffsData.booked_plan = r.booked;
                        tariffsData.booked_price = r.booked_price;
                        if (screens.tariffs && screens.tariffs.style.display !== 'none') renderTariffs(tariffsData);
                    }
                } catch (e) {}
                cabToast('Цена закреплена — уведомим при запуске оплаты');
            }
            else { lockBtn.disabled = false; cabToast('Не удалось закрепить цену'); }
        } catch (e) { lockBtn.disabled = false; cabToast('Не удалось закрепить цену'); }
    });
}

function closeCheckout() {
    if (!_coCtx) return;
    const { overlay, sheet } = _coCtx;
    overlay.classList.remove('visible');
    sheet.classList.remove('visible');
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); if (sheet.parentNode) sheet.remove(); }, 300);
    _coCtx = null;
}


function setupEventListeners() {
    els.menuBtn.addEventListener('click', openDrawer);
    const cabBack = document.getElementById('cabinet-back');
    if (cabBack) cabBack.addEventListener('click', () => { hapticLight(); showScreen('dashboard'); });
    const refBack = document.getElementById('referral-back');
    if (refBack) refBack.addEventListener('click', () => { hapticLight(); showScreen('dashboard'); });
    const cabSet = document.getElementById('cabinet-settings');
    if (cabSet) cabSet.addEventListener('click', () => { const s = document.getElementById('cab-sec-settings'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const tfBack = document.getElementById('tariffs-back');
    if (tfBack) tfBack.addEventListener('click', () => { hapticLight(); showScreen(tfReturn || 'dashboard'); });
    els.drawerClose.addEventListener('click', closeDrawer);
    els.drawerOverlay.addEventListener('click', closeDrawer);
    els.drawerOverlay.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('click', function (e) {
        try {
            if (!els.drawer || !els.drawer.classList.contains('active')) return;
            var r = els.drawer.getBoundingClientRect();
            var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            if (!inside) {
                if (e.target !== els.drawerOverlay) fmClientLog('drawer-emergency-close, клик съел: ' + _fmElDesc(e.target || {}));
                closeDrawer();
            }
        } catch (err) {}
    }, true);
    document.addEventListener('touchstart', function () {
        try { if (els.drawer && els.drawer.classList.contains('active')) fmProbeDrawer(); } catch (err) {}
    }, { capture: true, passive: true });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && els.drawer && els.drawer.classList.contains('active')) closeDrawer();
    });

    els.profileBtn.addEventListener('click', () => handleAction('profile'));

    els.placeholderBack.addEventListener('click', () => {
        showScreen('dashboard');
    });

    if (els.channelsBack) {
        els.channelsBack.addEventListener('click', () => {
            stopVoicePolling();
            showScreen('dashboard');
            refreshDashboardSilent();
        });
    }

    document.addEventListener('click', (e) => {
        const target = e.target.closest('.channels-bot-name');
        if (target) {
            copyBotNameToClipboard(target);
        }
    });

    if (els.channelsDemoBtn) {
        els.channelsDemoBtn.addEventListener('click', runDemoPreview);
    }

    if (els.channelsDemoInput) {
        els.channelsDemoInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                runDemoPreview();
            }
        });
    }

    if (els.channelsAddMore) {
        els.channelsAddMore.addEventListener('click', () => {
            const ins = document.getElementById('channels-instruction-list');
            if (ins) {
                const vis = ins.style.display !== 'none';
                ins.style.display = vis ? 'none' : '';
                if (!vis) ins.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    document.querySelectorAll('.drawer-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            if (action) handleAction(action);
        });
    });
    const stIc = document.getElementById('dp-strategy-ic');
    if (stIc && typeof STRATEGY_MAP_SVG !== 'undefined') stIc.innerHTML = STRATEGY_MAP_SVG;

    setupPostEventListeners();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (els.drawer.classList.contains('active')) closeDrawer();
            else if (els.modelPickerModal.style.display !== 'none') hideModelPicker();
            else if (els.lockedFeatureModal.style.display !== 'none') hideLockedFeatureModal();
        }
    });
}


function resetPostState() {
    state.post.topic = '';
    state.post.useProfanity = false;
    state.post.contextHistory = [];
    state.post.styleReferenceText = '';
    state.post.currentPostId = null;
    state.post.currentPostText = '';
    state.post.suggestions = [];
    state.post.isGood = false;
    state.post.pendingInstruction = null;
    state.post.length = 'auto';
    state.post.emoji = 'auto';
    state.post.styleUserChoice = null; 
    state.post.lastStyleApplied = false;

    if (els.postTopicInput) els.postTopicInput.value = '';
    if (els.postStyleInput) els.postStyleInput.value = '';
    if (els.postTopicCounter) els.postTopicCounter.textContent = '0';
    if (els.postStyleCounter) els.postStyleCounter.textContent = '0';
    setProfanity(false);
    setChipGroup('post-length-chips', 'auto');
    setChipGroup('post-emoji-chips', 'auto');
    hideTopicIdeas();
    if (els.postStyleInputWrapper) els.postStyleInputWrapper.style.display = 'none';
    if (els.postGenerateBtn) els.postGenerateBtn.disabled = true;
    if (els.postQuestionCustomInput) els.postQuestionCustomInput.value = '';
    if (els.postResultCustomInput) els.postResultCustomInput.value = '';
    if (els.postStyleApply) {
        els.postStyleApply.textContent = 'Применить';
        els.postStyleApply.classList.remove('applied');
    }
}


async function openPostCreate() {
    resetPostState();
    showScreen('postCreate');

    if (els.postLimitBanner) {
        els.postLimitBanner.classList.remove('exhausted', 'warning');
        els.postLimitBanner.innerHTML = '<i class="ti ti-bolt"></i><span>Загружаю лимиты...</span>';
    }

    state.post.useChannelStyle = true;
    state.post.activeChannel = null;

    renderPostChannelSelector(null);

    try {
        const [limits, activeData] = await Promise.all([
            apiRequest('/api/v1/post/limits'),
            apiRequest('/api/v1/channels/active').catch(() => null),
        ]);
        state.post.limits = limits;
        renderLimitBanner(limits);
        updateStyleHint(limits);
        setProfanity(!!limits.profanity_default);
        updateLengthAutoNote(limits.style_profile);

        if (activeData) {
            const activeCh = (activeData.channels || []).find(c => c.id === activeData.active_channel_id);
            state.post.activeChannel = activeCh || null;
            renderPostChannelSelector(activeCh);
        }
    } catch (err) {
        console.error('Failed to load limits/channel:', err);
        if (els.postLimitBanner) {
            els.postLimitBanner.innerHTML = '<i class="ti ti-bolt"></i><span>Не удалось загрузить лимиты</span>';
            els.postLimitBanner.classList.add('exhausted');
        }
    }
}


function updateLengthAutoNote(styleProfile) {
    const note = document.getElementById('post-length-note');
    if (!note) return;
    if (styleProfile && styleProfile.median_chars) {
        note.textContent = `Авто — как в канале (~${styleProfile.median_chars} знаков)`;
        note.style.display = state.post.length === 'auto' ? '' : 'none';
    } else {
        note.textContent = '';
        note.style.display = 'none';
    }
}


function setChipGroup(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.post-chip').forEach(ch => {
        ch.classList.toggle('on', ch.dataset.val === value);
    });
}


function setProfanity(on) {
    state.post.useProfanity = !!on;
    if (els.postProfanityToggle) {
        els.postProfanityToggle.classList.toggle('on', !!on);
        els.postProfanityToggle.dataset.active = String(!!on);
    }
}



function hideTopicIdeas() {
    const list = document.getElementById('post-ideas-list');
    if (list) { list.style.display = 'none'; list.innerHTML = ''; }
    const btn = document.getElementById('post-ideas-btn');
    if (btn) btn.classList.remove('loading');
}

async function loadTopicIdeas() {
    const btn = document.getElementById('post-ideas-btn');
    const list = document.getElementById('post-ideas-list');
    if (!btn || !list) return;
    if (btn.classList.contains('loading')) return;

    if (list.style.display !== 'none' && list.children.length > 0) {
        hideTopicIdeas();
        return;
    }

    btn.classList.add('loading');
    const iconEl = btn.querySelector('i');
    if (iconEl) iconEl.className = 'ti ti-loader-2 spin';
    try {
        const result = await apiRequest('/api/v1/post/ideas', {
            method: 'POST',
            body: JSON.stringify({}),
        });
        renderTopicIdeas(result.ideas || []);
    } catch (err) {
        console.warn('Ideas failed:', err);
        showToast('Не удалось получить идеи — попробуй ещё раз', 'alert-triangle');
    } finally {
        btn.classList.remove('loading');
        if (iconEl) iconEl.className = 'ti ti-bulb';
    }
}

function renderTopicIdeas(ideas) {
    const list = document.getElementById('post-ideas-list');
    if (!list) return;
    if (!ideas.length) {
        showToast('Не удалось получить идеи — попробуй ещё раз', 'alert-triangle');
        return;
    }
    list.innerHTML = '';
    ideas.forEach(idea => {
        const card = document.createElement('button');
        card.className = 'post-idea-card';
        card.innerHTML = `
            <span class="post-idea-title">${escapeHtml(idea.title || '')}</span>
            ${idea.hint ? `<span class="post-idea-hint">${escapeHtml(idea.hint)}</span>` : ''}
            <i class="ti ti-arrow-up-left post-idea-use"></i>
        `;
        card.addEventListener('click', () => {
            const topicText = idea.hint ? `${idea.title}. ${idea.hint}` : (idea.title || '');
            if (els.postTopicInput) {
                els.postTopicInput.value = topicText.slice(0, 500);
                els.postTopicInput.dispatchEvent(new Event('input'));
            }
            hideTopicIdeas();
            if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged?.();
        });
        list.appendChild(card);
    });
    list.style.display = '';
}


function renderPostChannelSelector(channel) {
    let container = document.getElementById('post-channel-selector-wrap');
    const screen = document.getElementById('post-create-screen');
    if (!screen) return;
    const form = screen.querySelector('.post-form');
    if (!form) return;

    if (!container) {
        container = document.createElement('div');
        container.id = 'post-channel-selector-wrap';
        form.insertBefore(container, form.firstChild);
    }

    if (!channel) {
        container.innerHTML = `
            <div class="post-channel-selector empty">
                <div class="post-channel-selector-avatar"><i class="ti ti-plus"></i></div>
                <div class="post-channel-selector-info">
                    <div class="post-channel-selector-eyebrow">Канал не выбран</div>
                    <div class="post-channel-selector-title">Подключи канал</div>
                </div>
                <i class="ti ti-chevron-right post-channel-selector-chev"></i>
            </div>
        `;
        const el = container.querySelector('.post-channel-selector');
        if (el) el.onclick = () => { if (typeof openChannels === 'function') openChannels(); };
        renderStyleToggle(false, false);
        return;
    }

    const hasVoice = channel.voice_status === 'done' && !!channel.voice_preview;
    const isPrivate = channel.is_private;

    let avatarHtml;
    if (channel.has_avatar) {
        avatarHtml = `<div class="post-channel-selector-avatar" data-avatar-pcs="${channel.id}"><i class="ti ti-brand-telegram"></i></div>`;
    } else if (isPrivate) {
        avatarHtml = `<div class="post-channel-selector-avatar private"><i class="ti ti-lock"></i></div>`;
    } else {
        avatarHtml = `<div class="post-channel-selector-avatar">${escapeHtml(getInitials(channel.title || 'К'))}</div>`;
    }

    if (hasVoice) {
        container.innerHTML = `
            <div class="post-channel-selector has-style">
                ${avatarHtml}
                <div class="post-channel-selector-info">
                    <div class="post-channel-selector-eyebrow">Пишу в стиле</div>
                    <div class="post-channel-selector-title">${escapeHtml(channel.title || 'Канал')} <i class="ti ti-circle-check post-channel-selector-check"></i></div>
                </div>
                <i class="ti ti-chevrons-up-down post-channel-selector-chev"></i>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="post-channel-selector no-style">
                ${avatarHtml}
                <div class="post-channel-selector-info">
                    <div class="post-channel-selector-eyebrow">Активный канал</div>
                    <div class="post-channel-selector-title">${escapeHtml(channel.title || 'Канал')} <i class="ti ti-alert-triangle post-channel-selector-warn"></i></div>
                    <div class="post-channel-selector-hint">
                        Стиль не настроен — пишу нейтрально. <a href="#" data-pcs-upload="${channel.id}">Загрузить примеры →</a>
                    </div>
                </div>
                <i class="ti ti-chevrons-up-down post-channel-selector-chev"></i>
            </div>
        `;
    }

    const el = container.querySelector('.post-channel-selector');
    if (el) {
        el.onclick = (ev) => {
            if (ev.target.tagName === 'A' || ev.target.closest('[data-pcs-upload]')) return;
            openActiveChannelSelector({
                onChanged: async () => {
                    try {
                        const [limits, data] = await Promise.all([
                            apiRequest('/api/v1/post/limits'),
                            apiRequest('/api/v1/channels/active'),
                        ]);
                        state.post.limits = limits;
                        renderLimitBanner(limits);
                        updateStyleHint(limits);
                        setProfanity(!!limits.profanity_default);
                        updateLengthAutoNote(limits.style_profile);
                        const activeCh = (data.channels || []).find(c => c.id === data.active_channel_id);
                        state.post.activeChannel = activeCh || null;
                        renderPostChannelSelector(activeCh);
                    } catch (e) {}
                }
            });
        };
    }

    const uploadLink = container.querySelector('[data-pcs-upload]');
    if (uploadLink) {
        uploadLink.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const chId = uploadLink.getAttribute('data-pcs-upload');
            if (window.__openChannelSettings) window.__openChannelSettings(parseInt(chId, 10));
        });
    }

    if (channel.has_avatar) {
        const avatarNode = container.querySelector(`[data-avatar-pcs="${channel.id}"]`);
        if (avatarNode) loadBottomSheetAvatar(channel.id, avatarNode);
    }

    renderStyleToggle(hasVoice, hasVoice);
}


function renderStyleToggle(canEnable, defaultOn) {
    let toggle = document.getElementById('post-style-toggle-row');
    const container = document.getElementById('post-channel-selector-wrap');
    if (!container) return;

    if (!toggle) {
        toggle = document.createElement('div');
        toggle.id = 'post-style-toggle-row';
        container.insertAdjacentElement('afterend', toggle);
    }

    let enabled = false;
    if (canEnable) {
        enabled = (state.post.styleUserChoice === null || state.post.styleUserChoice === undefined)
            ? !!defaultOn
            : !!state.post.styleUserChoice;
        state.post.useChannelStyle = enabled;
    }

    toggle.innerHTML = `
        <div class="post-style-toggle ${canEnable ? '' : 'disabled'}">
            <i class="ti ti-wand post-style-toggle-icon"></i>
            <span class="post-style-toggle-label">Использовать стиль канала</span>
            <button class="cs-toggle-switch ${enabled ? 'on' : ''}" id="post-style-toggle-btn" ${canEnable ? '' : 'disabled'}>
                <span class="cs-toggle-knob"></span>
            </button>
        </div>
    `;

    const row = toggle.querySelector('.post-style-toggle');
    const btn = toggle.querySelector('#post-style-toggle-btn');
    if (row && btn && canEnable) {
        row.addEventListener('click', () => {
            const newVal = !btn.classList.contains('on');
            state.post.styleUserChoice = newVal;
            state.post.useChannelStyle = newVal;
            btn.classList.toggle('on', newVal);
            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('light');
        });
    }
}


function renderLimitBanner(limits) {
    if (!els.postLimitBanner) return;

    els.postLimitBanner.classList.remove('exhausted', 'warning');

    const bars = limits.bars || [];
    const limitState = limits.limit_state || {};

    if (bars.length === 0) {
        if (els.postLimitText) els.postLimitText.textContent = '';
        els.postLimitBanner.innerHTML = '';
        return;
    }

    const allExhausted = bars.every(b => b.limit !== null && b.used >= b.limit && !b.is_tester);
    if (allExhausted) {
        els.postLimitBanner.classList.add('exhausted');
        if (els.postGenerateBtn) els.postGenerateBtn.disabled = true;
    } else {
        if (els.postTopicInput && els.postTopicInput.value.trim().length > 0 && els.postGenerateBtn) {
            els.postGenerateBtn.disabled = false;
        }
    }

    els.postLimitBanner.innerHTML = bars.map(b => {
        const limit = b.limit;
        const used = b.used || 0;
        const safeLimit = (limit == null || limit === 0) ? 1 : limit;
        const remaining = (limit == null) ? null : Math.max(0, limit - used);
        const exhausted = (limit != null) && (used >= limit) && !b.is_tester;
        const percent = exhausted ? 0 : (limit == null ? 100 : Math.max(0, Math.min(100, Math.round((remaining / safeLimit) * 100))));

        const testerNote = b.is_tester ? '<span class="limit-row-tester">тестер · без лимита</span>' : '';
        const timerTxt = (exhausted && b.seconds_until_reset)
            ? `<span class="limit-row-timer">${formatRemainingTime(b.seconds_until_reset)}</span>`
            : '';

        const countTxt = (limit == null)
            ? `<span class="limit-row-count">${used}<span class="limit-row-count-total"></span></span>`
            : `<span class="limit-row-count">${remaining}<span class="limit-row-count-total"> / ${limit}</span></span>`;

        const rowClass = exhausted
            ? `limit-row limit-row-${b.color} limit-row-exhausted`
            : `limit-row limit-row-${b.color}`;
        const iconKey = (b.key === 'premium') ? 'diamond' : (b.key === 'standard' ? 'edit' : 'sparkles');

        return `
            <div class="${rowClass}">
                <div class="limit-row-head">
                    <span class="limit-row-icon"><i class="ti ti-${iconKey}"></i></span>
                    <span class="limit-row-label">${b.label}</span>
                    ${testerNote}
                    ${countTxt}
                </div>
                <div class="limit-row-bar"><div class="limit-row-bar-fill" style="width: ${percent}%"></div></div>
                ${timerTxt}
            </div>
        `;
    }).join('');
}


function updateStyleHint(limits) {
    if (!els.postStyleHint) return;

    const hasChannel = !!limits.has_channel;
    const hasVoice = !!limits.has_voice;

    if (hasChannel && hasVoice) {
        els.postStyleHint.style.display = 'none';
        return;
    }

    els.postStyleHint.style.display = 'flex';

    if (hasChannel && !hasVoice) {
        els.postStyleHintTitle.textContent = 'Стиль письма не настроен';
        els.postStyleHintText.textContent = 'Я буду писать нейтрально. Настрой стиль чтобы я писал именно как ты в канале';
        els.postStyleLoadBtn.querySelector('span').textContent = 'Настроить стиль';
        els.postStyleConnectBtn.style.display = 'none';
    } else {
        els.postStyleHintTitle.textContent = 'Я буду писать в нейтральном стиле';
        els.postStyleHintText.textContent = 'Загрузи пример — научусь писать как ты';
        els.postStyleLoadBtn.querySelector('span').textContent = 'Загрузить пример';
        els.postStyleConnectBtn.style.display = '';
    }
}


function toggleProfanity() {
    setProfanity(!state.post.useProfanity);
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged?.();
}


function toggleStyleInput() {
    const wrapper = els.postStyleInputWrapper;
    if (!wrapper) return;
    const isVisible = wrapper.style.display !== 'none';

    if (isVisible) {
        wrapper.style.display = 'none';
    } else {
        wrapper.style.display = 'flex';
        if (els.postStyleInput && state.post.styleReferenceText) {
            els.postStyleInput.value = state.post.styleReferenceText;
            if (els.postStyleCounter) {
                els.postStyleCounter.textContent = String(state.post.styleReferenceText.length);
            }
        }
        setTimeout(() => els.postStyleInput?.focus(), 100);
    }
}

function applyStyleInput() {
    if (!els.postStyleInput) return;
    const val = (els.postStyleInput.value || '').trim();
    state.post.styleReferenceText = val;

    if (els.postStyleApply) {
        const original = 'Применить';
        els.postStyleApply.textContent = val ? 'Сохранено ✓' : 'Пусто';
        els.postStyleApply.classList.toggle('applied', !!val);
        setTimeout(() => {
            if (els.postStyleApply) {
                els.postStyleApply.textContent = original;
                els.postStyleApply.classList.remove('applied');
            }
            if (els.postStyleInputWrapper) {
                els.postStyleInputWrapper.style.display = 'none';
            }
            updateStyleLoadBtnLabel();
        }, 700);
    }

    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');
}

function clearStyleInput() {
    if (els.postStyleInput) els.postStyleInput.value = '';
    if (els.postStyleCounter) els.postStyleCounter.textContent = '0';
    state.post.styleReferenceText = '';
    updateStyleLoadBtnLabel();
}

function updateStyleLoadBtnLabel() {
    if (!els.postStyleLoadBtn) return;
    const span = els.postStyleLoadBtn.querySelector('span');
    if (!span) return;
    if (state.post.styleReferenceText) {
        span.textContent = 'Пример загружен ✓';
    } else {
        const hasChannel = !!state.post.limits?.has_channel;
        const hasVoice = !!state.post.limits?.has_voice;
        span.textContent = (hasChannel && !hasVoice) ? 'Настроить стиль' : 'Загрузить пример';
    }
}


function handleConnectChannelHint() {
    closeAllModals();
    handleAction('add_channel');
}


function _trDialog(message) {
    try {
        if (typeof window.t === 'function') {
            const r = window.t(message);
            if (r && r !== message) return r;
        }
        if (typeof window.translateTemplate === 'function') {
            const r2 = window.translateTemplate(message);
            if (r2 && r2 !== message) return r2;
        }
    } catch (e) {}
    return message;
}

function confirmDialog(message, okText) {
    message = _trDialog(message);
    return new Promise((resolve) => {
        if (tg && typeof tg.showConfirm === 'function') {
            try {
                tg.showConfirm(message, (ok) => resolve(!!ok));
                return;
            } catch (e) {}
        }
        const result = window.confirm(message);
        resolve(!!result);
    });
}


function alertDialog(message) {
    message = _trDialog(message);
    return new Promise((resolve) => {
        if (tg && typeof tg.showAlert === 'function') {
            try {
                tg.showAlert(message, () => resolve());
                return;
            } catch (e) {}
        }
        window.alert(message);
        resolve();
    });
}


function copyBotNameToClipboard(el) {
    const text = (el.textContent || '').trim();
    if (!text) return;

    const finish = (ok) => {
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred?.(ok ? 'success' : 'error');
        }
        showCopyToast(ok ? 'Скопировано: ' + text : 'Не удалось скопировать');
        if (ok) {
            el.classList.add('channels-bot-name--copied');
            setTimeout(() => el.classList.remove('channels-bot-name--copied'), 600);
        }
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => finish(true))
            .catch(() => fallbackCopy(text, finish));
    } else {
        fallbackCopy(text, finish);
    }
}


function fallbackCopy(text, finish) {
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        finish(!!ok);
    } catch (e) {
        finish(false);
    }
}


let _copyToastTimer = null;
function showCopyToast(message) {
    let toast = document.getElementById('copy-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'copy-toast';
        toast.className = 'copy-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('copy-toast--visible');
    if (_copyToastTimer) clearTimeout(_copyToastTimer);
    _copyToastTimer = setTimeout(() => {
        toast.classList.remove('copy-toast--visible');
    }, 1600);
}


function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');   
}


function formatSubscribers(n) {
    if (n == null) return null;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return String(n);
}


async function openChannels() {
    showScreen('channels');

    if (els.channelsLoading) els.channelsLoading.style.display = '';
    if (els.channelsBody) els.channelsBody.style.display = 'none';
    if (els.channelsDemoResult) {
        els.channelsDemoResult.style.display = 'none';
        els.channelsDemoResult.innerHTML = '';
    }
    if (els.channelsDemoError) els.channelsDemoError.style.display = 'none';
    if (els.channelsDemoInput) els.channelsDemoInput.value = '';

    try {
        const data = await apiRequest('/api/v1/channels');
        state.channels = data;
        renderChannels(data);
    } catch (err) {
        renderChannels({ has_any: false, channels: [], bot_username: 'ForgeMetricsBot' });
    }
}


function renderChannels(data) {
    if (els.channelsLoading) els.channelsLoading.style.display = 'none';
    if (els.channelsBody) els.channelsBody.style.display = '';

    const botName = data.bot_username || 'ForgeMetricsBot';
    if (els.channelsBotName) els.channelsBotName.textContent = '@' + botName;
    const botNameList = document.getElementById('channels-bot-name-list');
    if (botNameList) botNameList.textContent = '@' + botName;

    const hasAny = data.has_any && data.channels && data.channels.length > 0;
    const deleted = data.deleted_channels || [];

    if (!hasAny) {
        if (els.channelsStateEmpty) els.channelsStateEmpty.style.display = '';
        if (els.channelsStateList) els.channelsStateList.style.display = 'none';
        renderDeletedChannels(deleted, true);
        startEmptyChannelsWatch();   
        return;
    }

    stopEmptyChannelsWatch();
    if (els.channelsStateEmpty) els.channelsStateEmpty.style.display = 'none';
    if (els.channelsStateList) els.channelsStateList.style.display = '';

    if (els.channelsCards) {
        els.channelsCards.innerHTML = data.channels
            .map(ch => renderChannelCard(ch))
            .join('');
    }

    renderConnectionLimitsBanner(data.connection_limits, data.voice_refresh_limits);
    renderAddMoreOrLimit(data);
    renderDeletedChannels(deleted, false);
    loadChannelAvatars();

    const hasCollecting = (data.channels || []).some(c => c.voice_status === 'collecting');
    if (hasCollecting) {
        startVoicePollingIfNeeded();
    } else {
        stopVoicePolling();
    }
}


function renderConnectionLimitsBanner(connLimits, voiceRefreshLimits) {
    let banner = document.getElementById('channels-limits-card');

    if (!connLimits) {
        if (banner) banner.style.display = 'none';
        return;
    }

    const container = els.channelsStateList || document.getElementById('channels-state-list');
    if (!container) return;

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'channels-limits-card';
        banner.className = 'channels-limits-card';
        container.insertBefore(banner, container.firstChild);
    } else if (banner.parentNode !== container) {
        container.insertBefore(banner, container.firstChild);
    }

    banner.innerHTML = `
        ${renderLimitRow({
            icon: 'plug-connected',
            label: 'Подключений в месяц',
            used: connLimits.used,
            limit: connLimits.limit,
            seconds_until_reset: connLimits.seconds_until_reset,
            color: 'purple',
            available: true,
            isTester: connLimits.is_tester,
        })}
        ${renderLimitRow({
            icon: 'refresh',
            label: 'Обновлений стиля',
            used: voiceRefreshLimits ? voiceRefreshLimits.used : 0,
            limit: voiceRefreshLimits ? voiceRefreshLimits.limit : 0,
            seconds_until_reset: voiceRefreshLimits ? voiceRefreshLimits.seconds_until_reset : null,
            color: 'green',
            available: voiceRefreshLimits ? voiceRefreshLimits.available_on_tier : false,
            isTester: voiceRefreshLimits ? voiceRefreshLimits.is_tester : false,
            lockedHint: 'Доступно на платных тарифах',
        })}
    `;
    banner.style.display = '';
}


function renderLimitRow({ icon, label, used, limit, seconds_until_reset, color, available, isTester, lockedHint }) {
    if (!available) {
        return `
            <div class="limit-row limit-row-locked">
                <div class="limit-row-head">
                    <span class="limit-row-icon"><i class="ti ti-lock"></i></span>
                    <span class="limit-row-label">${label}</span>
                    <span class="limit-row-hint">${lockedHint || ''}</span>
                </div>
            </div>
        `;
    }

    const safeLimit = Math.max(1, limit);
    const remaining = Math.max(0, limit - used);
    const exhausted = used >= limit && !isTester;
    const percent = exhausted ? 0 : Math.max(0, Math.min(100, Math.round((remaining / safeLimit) * 100)));

    const testerNote = isTester ? '<span class="limit-row-tester">тестер · без лимита</span>' : '';
    const timerTxt = (exhausted && seconds_until_reset)
        ? `<span class="limit-row-timer">${formatRemainingTime(seconds_until_reset)}</span>`
        : '';

    const rowClass = exhausted ? `limit-row limit-row-${color} limit-row-exhausted` : `limit-row limit-row-${color}`;

    return `
        <div class="${rowClass}">
            <div class="limit-row-head">
                <span class="limit-row-icon"><i class="ti ti-${icon}"></i></span>
                <span class="limit-row-label">${label}</span>
                ${testerNote}
                <span class="limit-row-count">${remaining}<span class="limit-row-count-total"> / ${limit}</span></span>
            </div>
            <div class="limit-row-bar"><div class="limit-row-bar-fill" style="width: ${percent}%"></div></div>
            ${timerTxt}
        </div>
    `;
}


function loadChannelAvatars() {
    const nodes = document.querySelectorAll('[data-avatar-for][data-has-avatar="1"]');
    for (const node of nodes) {
        const chId = node.getAttribute('data-avatar-for');
        if (!chId || node.dataset.avatarLoaded === '1' || node.dataset.avatarPending === '1') continue;
        _loadOneChannelAvatar(chId, 0);
    }
}

async function _loadOneChannelAvatar(chId, attempt) {
    const node = document.querySelector(`[data-avatar-for="${chId}"][data-has-avatar="1"]`);
    if (!node || node.dataset.avatarLoaded === '1') return;
    node.dataset.avatarPending = '1';
    try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/channels/${chId}/avatar`, {
            headers: { 'X-Telegram-Init-Data': state.initData || '' },
        });
        if (!resp.ok) throw new Error('avatar ' + resp.status);
        const blob = await resp.blob();
        const live = document.querySelector(`[data-avatar-for="${chId}"][data-has-avatar="1"]`) || node;
        _setBlobImg(live, blob, 'channel-avatar-img');
        live.dataset.avatarLoaded = '1';
        delete live.dataset.avatarPending;
    } catch (e) {
        delete node.dataset.avatarPending;
        if (attempt < 3) setTimeout(() => _loadOneChannelAvatar(chId, attempt + 1), 1500 * (attempt + 1));
    }
}


function formatCountdown(seconds) {
    if (seconds <= 0) return 'удаляется...';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d} дн ${h} ч`;
    if (h > 0) return `${h} ч ${m} мин`;
    return `${m} мин`;
}


function renderDeletedChannels(deleted, intoEmpty) {
    let box = document.getElementById('channels-deleted-box');

    if (!deleted || deleted.length === 0) {
        if (box) box.style.display = 'none';
        return;
    }

    const targetContainer = intoEmpty
        ? (els.channelsStateEmpty || document.getElementById('channels-state-empty'))
        : (els.channelsStateList || document.getElementById('channels-state-list'));

    if (!box) {
        box = document.createElement('div');
        box.id = 'channels-deleted-box';
        box.className = 'channels-deleted-box';
    }
    if (box.parentNode !== targetContainer && targetContainer) {
        targetContainer.appendChild(box);
    }

    const items = deleted.map(ch => {
        const title = escapeHtml(ch.title || 'Канал');
        const countdown = formatCountdown(ch.seconds_until_purge);
        return `
            <div class="channels-deleted-item">
                <div class="channels-deleted-info">
                    <div class="channels-deleted-name">${title}</div>
                    <div class="channels-deleted-timer">Будет стёрт из системы через ${countdown}</div>
                </div>
                <div class="channels-deleted-actions">
                    <button class="channels-deleted-restore" onclick="window.__restoreChannel&&window.__restoreChannel(${ch.id})">Вернуть</button>
                    <button class="channels-deleted-purge" onclick="window.__purgeChannel&&window.__purgeChannel(${ch.id}, '${title.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">Удалить полностью</button>
                </div>
            </div>
        `;
    }).join('');

    box.innerHTML = `
        <div class="channels-deleted-label">Недавно удалённые</div>
        <div class="channels-deleted-hint">Каналы хранятся 7 дней, потом стираются из системы. Слот тарифа уже свободен. Переподключить можно в любой момент, добавив бота админом — настройки соберутся заново.</div>
        ${items}
    `;
    box.style.display = '';
}


window.__channelMenu = async function (channelId, title) {
    const action = await showChannelMenuPopup(title);
    if (action === 'refresh_voice') {
        window.__refreshVoice(channelId, title);
    } else if (action === 'delete') {
        const confirmed = await confirmDialog(
            `Удалить канал «${title}»?\n\nКанал переедет в «Недавно удалённые», слот тарифа освободится. В течение 7 дней его можно вернуть.`
        );
        if (confirmed) {
            doSoftDeleteChannel(channelId);
        }
    }
};


function showChannelMenuPopup(title) {
    return new Promise((resolve) => {
        if (tg && typeof tg.showPopup === 'function') {
            try {
                tg.showPopup({
                    title: title,
                    message: 'Что сделать с каналом?',
                    buttons: [
                        { id: 'refresh_voice', type: 'default', text: 'Обновить стиль' },
                        { id: 'delete', type: 'destructive', text: 'Удалить' },
                        { id: 'cancel', type: 'cancel' },
                    ],
                }, (id) => resolve(id || 'cancel'));
                return;
            } catch (e) {}
        }
        const answer = window.prompt(
            `Канал «${title}»\n\nВведи:\n  1 — Обновить стиль\n  2 — Удалить`,
            ''
        );
        if (answer === '1') resolve('refresh_voice');
        else if (answer === '2') resolve('delete');
        else resolve('cancel');
    });
}


async function doSoftDeleteChannel(channelId) {
    try {
        await apiRequest(`/api/v1/channels/${channelId}`, { method: 'DELETE' });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');
        await openChannels();
        refreshDashboardSilent();
    } catch (e) {
        await alertDialog('Не удалось удалить канал. Попробуй ещё раз.');
    }
}


window.__restoreChannel = async function (channelId) {
    try {
        await apiRequest(`/api/v1/channels/${channelId}/restore`, { method: 'POST' });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');
        await openChannels();
        refreshDashboardSilent();
    } catch (e) {
        await alertDialog('Не удалось восстановить канал.');
    }
};


window.__purgeChannel = async function (channelId, title) {
    const confirmed = await confirmDialog(
        `Удалить «${title}» из списка полностью?\n\nКанал и его настройки (стиль, метрики, аналитика) будут стёрты. Если снова добавишь бота админом в этот канал — он подключится заново, но настроится с нуля.`
    );
    if (confirmed) {
        doPurgeChannel(channelId);
    }
};


async function doPurgeChannel(channelId) {
    try {
        await apiRequest(`/api/v1/channels/${channelId}/purge`, { method: 'POST' });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('warning');
        await openChannels();
        refreshDashboardSilent();
    } catch (e) {
        await alertDialog('Не удалось удалить канал навсегда.');
    }
}


window.__refreshVoice = async function (channelId, title) {
    const confirmed = await confirmDialog(
        `Пересобрать стиль канала «${title}»?\n\nЭто потратит 1 премиум-вызов из дневного лимита.`
    );
    if (!confirmed) return;
    try {
        await apiRequest(`/api/v1/channels/${channelId}/voice/refresh`, { method: 'POST' });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');
        await openChannels();
        startVoicePollingIfNeeded();
    } catch (e) {
        const msg = (e?.message || '').includes('429')
            ? 'Дневной лимит постов исчерпан. Стиль можно будет обновить завтра.'
            : 'Не удалось обновить стиль. Попробуй позже.';
        await alertDialog(msg);
    }
};


const TIER_NAMES = {
    free: 'Free',
    trial: 'Trial',
    light: 'Light',
    pro: 'Pro',
    pro_plus: 'Pro+',
    agency: 'Agency',
    network: 'Network',
};


function renderAddMoreOrLimit(data) {
    const btn = els.channelsAddMore;
    if (!btn) return;

    const limit = data.channel_limit || 1;
    const used = data.channels_used != null ? data.channels_used : (data.channels || []).length;
    const canAdd = !!data.can_add_more;
    const tierName = TIER_NAMES[(data.tier || 'free')] || 'Free';

    let limitBox = document.getElementById('channels-limit-box');

    if (canAdd) {
        btn.style.display = '';
        if (limitBox) limitBox.style.display = 'none';
        return;
    }

    btn.style.display = 'none';

    if (!limitBox) {
        limitBox = document.createElement('div');
        limitBox.id = 'channels-limit-box';
        limitBox.className = 'channels-limit-box';
        btn.parentNode.insertBefore(limitBox, btn.nextSibling);
    }

    const nextTierHint = (data.tier === 'free' || data.tier === 'trial' || data.tier === 'light')
        ? 'Больше каналов — на тарифе Pro'
        : 'Это максимум для твоего тарифа';

    limitBox.innerHTML = `
        <div class="channels-limit-icon"><i class="ti ti-lock"></i></div>
        <div class="channels-limit-title">Лимит каналов: ${used} из ${limit}</div>
        <div class="channels-limit-sub">Тариф ${escapeHtml(tierName)}. ${nextTierHint}</div>
        <button class="channels-limit-btn" id="channels-limit-btn">Подробнее о Pro</button>
    `;
    limitBox.style.display = '';

    const lb = document.getElementById('channels-limit-btn');
    if (lb) {
        lb.addEventListener('click', () => {
            handleAction('profile');
        });
    }
}


function renderVoiceStatus(ch) {
    const status = ch.voice_status || 'idle';
    const quality = ch.voice_quality;
    const n = ch.voice_posts_analyzed || 0;

    if (status === 'collecting') {
        return `<span class="channel-card-feat-val voice-collecting"><span class="voice-pulse-dot"></span>Настраивается...</span>`;
    }

    if (status === 'done' && quality === 'full') {
        return `<span class="channel-card-feat-val ok"><i class="ti ti-check"></i> Настроен</span>`;
    }

    if (status === 'done' && quality === 'weak') {
        return `<span class="channel-card-feat-val warn">Слабый — мало материала</span>`;
    }

    if (status === 'failed' && quality === 'private') {
        return `<span class="channel-card-feat-val warn">Приватный — загрузи примеры</span>`;
    }

    if (status === 'failed' && quality === 'no_text') {
        return `<span class="channel-card-feat-val warn">Нет текста в постах</span>`;
    }

    if (status === 'failed' && quality === 'no_posts') {
        return `<span class="channel-card-feat-val warn">Постов пока нет</span>`;
    }

    if (status === 'pending') {
        return `<span class="channel-card-feat-val warn">Соберём при обновлении лимита</span>`;
    }

    if (ch.has_voice) {
        return `<span class="channel-card-feat-val ok"><i class="ti ti-check"></i> Настроен</span>`;
    }

    return `<span class="channel-card-feat-val warn">Не настроен</span>`;
}


let _voicePollTimer = null;

function startVoicePollingIfNeeded() {
    if (_voicePollTimer) return;
    _voicePollTimer = setInterval(async () => {
        // не дёргаем API и не пересобираем список, если экран каналов не активен или вкладка скрыта
        // (иначе лишняя нагрузка и перезагрузка всех аватарок каждые 5 сек в фоне)
        if (!_channelsScreenActive() || document.hidden) return;
        try {
            const data = await apiRequest('/api/v1/channels');
            const hasCollecting = (data.channels || []).some(c => c.voice_status === 'collecting');
            if (els.channelsCards) {
                els.channelsCards.innerHTML = (data.channels || []).map(renderChannelCard).join('');
                loadChannelAvatars();
            }
            if (!hasCollecting) {
                clearInterval(_voicePollTimer);
                _voicePollTimer = null;
            }
        } catch (e) {
            clearInterval(_voicePollTimer);
            _voicePollTimer = null;
        }
    }, 5000);
}


function stopVoicePolling() {
    if (_voicePollTimer) {
        clearInterval(_voicePollTimer);
        _voicePollTimer = null;
    }
}


/* Автоподхват нового канала без перезахода.
   Канал подключается ВНЕ приложения (бота добавляют админом в Telegram), поэтому
   после возврата в мини-апп и пока пользователь ждёт на пустом экране — сами
   перечитываем список: канал и его аватарка появляются моментально. */
// Ставит картинку из blob и ОСВОБОЖДАЕТ object URL после загрузки. Без revokeObjectURL каждый
// blob висит в памяти до закрытия приложения, а опрос голоса пересобирает список каждые 5 сек и
// перезагружает все аватарки — память росла линейно (утечка на телефоне).
function _setBlobImg(node, blob, cls) {
    if (!node || !blob) return;
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.alt = '';
    if (cls) img.className = cls;
    img.onload = img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    node.replaceChildren(img);
}

function _channelsScreenActive() {
    return !!(screens.channels && screens.channels.style.display !== 'none');
}

async function refreshChannelsOnReturn() {
    if (!_channelsScreenActive() || document.hidden) return;
    try {
        const data = await apiRequest('/api/v1/channels');
        state.channels = data;
        renderChannels(data);   // сам обрабатывает переход пусто→список и грузит аватарки
    } catch (e) {}
}

let _emptyChWatch = null;
let _emptyChWatchN = 0;

function startEmptyChannelsWatch() {
    if (_emptyChWatch) return;
    _emptyChWatchN = 0;
    _emptyChWatch = setInterval(async () => {
        if (!_channelsScreenActive()) { stopEmptyChannelsWatch(); return; }   // ушли с экрана — не крутим впустую
        if (document.hidden) return;
        if (++_emptyChWatchN > 40) { stopEmptyChannelsWatch(); return; }        // защитный потолок ~3.5 мин
        try {
            const data = await apiRequest('/api/v1/channels');
            if (data && data.has_any && data.channels && data.channels.length) {
                stopEmptyChannelsWatch();
                state.channels = data;
                renderChannels(data);   // покажет карточку канала + аватарку
            }
        } catch (e) {}
    }, 5000);
}

function stopEmptyChannelsWatch() {
    if (_emptyChWatch) { clearInterval(_emptyChWatch); _emptyChWatch = null; }
}

function initChannelsAutoRefresh() {
    // возврат приложения в фокус (например, после добавления бота в Telegram) — обновить список каналов
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshChannelsOnReturn(); });
    window.addEventListener('focus', refreshChannelsOnReturn);
    window.addEventListener('pageshow', refreshChannelsOnReturn);
}


function renderChannelCard(ch) {
    const connected = ch.bot_status === 'connected';
    const paused = !!ch.is_paused;
    const title = escapeHtml(ch.title || 'Канал');

    let badge;
    if (paused) {
        badge = `<div class="channel-card-badge paused"><i class="ti ti-player-pause"></i><span>На паузе</span></div>`;
    } else if (connected) {
        badge = `<div class="channel-card-badge connected"><i class="ti ti-circle-check"></i><span>Подключён</span></div>`;
    } else {
        badge = `<div class="channel-card-badge demo"><i class="ti ti-eye"></i><span>Только анализ</span></div>`;
    }

    const okIcon = `<i class="ti ti-check"></i> Доступно`;
    const lockTxt = `<i class="ti ti-lock"></i> Нужен бот-админ`;

    let feats = '';
    if (connected) {
        const pub = ch.bot_can_post
            ? `<span class="channel-card-feat-val ok">${okIcon}</span>`
            : `<span class="channel-card-feat-val warn">Нет прав на публикацию</span>`;
        const voice = renderVoiceStatus(ch);
        feats = `
            <div class="channel-card-feat"><span class="channel-card-feat-label">Публикация постов</span>${pub}</div>
            <div class="channel-card-feat"><span class="channel-card-feat-label">Автопостинг</span>${ch.bot_can_post ? `<span class="channel-card-feat-val ok">${okIcon}</span>` : `<span class="channel-card-feat-val locked">${lockTxt}</span>`}</div>
            <div class="channel-card-feat"><span class="channel-card-feat-label">Стиль письма</span>${voice}</div>
        `;
    } else {
        feats = `
            <div class="channel-card-feat"><span class="channel-card-feat-label">Анализ и стиль</span><span class="channel-card-feat-val ok">${okIcon}</span></div>
            <div class="channel-card-feat"><span class="channel-card-feat-label">Публикация постов</span><span class="channel-card-feat-val locked">${lockTxt}</span></div>
            <div class="channel-card-feat"><span class="channel-card-feat-label">Автопостинг</span><span class="channel-card-feat-val locked">${lockTxt}</span></div>
        `;
    }

    const warning = connected ? '' : `
        <div class="channels-demo-warning">
            <i class="ti ti-flask"></i>
            <div>
                <div class="channels-demo-warning-title">Демо-режим</div>
                <div class="channels-demo-warning-text">Анализ и стиль работают. Для публикации и автопостинга добавь бота админом.</div>
            </div>
        </div>`;

    const cta = connected ? '' : `
        <div class="channels-cta">
            <div class="channels-cta-text">Хочешь публиковать и автопостить?</div>
            <button class="channels-cta-btn" onclick="window.__toggleListInstruction&&window.__toggleListInstruction()">Как подключить полностью →</button>
        </div>`;

    return `
        ${warning}
        <div class="channel-card ${connected ? 'connected' : 'demo'}" onclick="window.__openChannelSettings&&window.__openChannelSettings(${ch.id})">
            <div class="channel-card-top">
                <div class="channel-card-avatar ${connected ? '' : 'demo'}" data-avatar-for="${ch.id}" ${ch.has_avatar ? `data-has-avatar="1"` : ''}>
                    <i class="ti ti-brand-telegram"></i>
                </div>
                <div class="channel-card-info">
                    <div class="channel-card-name">${title}</div>
                    ${badge}
                </div>
                <button class="channel-card-menu" onclick="event.stopPropagation();window.__channelMenu&&window.__channelMenu(${ch.id}, '${title.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">
                    <i class="ti ti-dots-vertical"></i>
                </button>
            </div>
            <div class="channel-card-feats">${feats}</div>
        </div>
        ${cta}
    `;
}


window.__openChannelSettings = async function (channelId) {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('light');
    await openChannelSettingsScreen(channelId);
};


let _settingsState = { channelId: null, data: null, eventsExpanded: false };


async function openChannelSettingsScreen(channelId) {
    _settingsState.channelId = channelId;
    _settingsState.data = null;
    _settingsState.eventsExpanded = false;

    let host = document.getElementById('channel-settings-screen');
    if (!host) {
        host = document.createElement('div');
        host.id = 'channel-settings-screen';
        host.className = 'screen channel-settings-screen';
        const appRoot = document.getElementById('app') || document.body;
        appRoot.appendChild(host);
    }

    host.innerHTML = `
        <div class="channel-settings-loading">
            <div class="spinner"></div>
            <div>Загружаю настройки канала...</div>
        </div>
    `;
    host.style.display = 'flex';
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');

    if (tg?.BackButton) {
        try {
            tg.BackButton.offClick(closeChannelSettings);
            tg.BackButton.show();
            tg.BackButton.onClick(closeChannelSettings);
        } catch (e) {}
    }

    try {
        const data = await apiRequest(`/api/v1/channels/${channelId}/details`);
        _settingsState.data = data;
        renderChannelSettingsScreen(data);
    } catch (e) {
        host.innerHTML = `
            <div class="channel-settings-loading">
                <i class="ti ti-alert-triangle" style="font-size: 28px; color: #F0997B;"></i>
                <div>Не удалось загрузить настройки</div>
                <button class="btn-secondary" onclick="closeChannelSettings()">Назад</button>
            </div>
        `;
    }
}


function closeChannelSettings() {
    const host = document.getElementById('channel-settings-screen');
    if (host) host.style.display = 'none';
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
    if (typeof stopSettingsVoicePolling === 'function') stopSettingsVoicePolling();
    if (tg?.BackButton) {
        try {
            tg.BackButton.offClick(closeChannelSettings);
            tg.BackButton.hide();
        } catch (e) {}
    }
    _settingsState.channelId = null;
    _settingsState.data = null;

    refreshChannelsListSilent();
}


async function refreshChannelsListSilent() {
    try {
        const data = await apiRequest('/api/v1/channels');
        if (els.channelsCards && data.channels) {
            els.channelsCards.innerHTML = data.channels.map(renderChannelCard).join('');
            loadChannelAvatars();
        }
        if (typeof renderConnectionLimitsBanner === 'function') {
            renderConnectionLimitsBanner(data.connection_limits, data.voice_refresh_limits);
        }
    } catch (e) {}
}


let _bsActiveContext = null;


function showBottomSheet({ title, subtitle, items, activeId, onSelect }) {
    closeBottomSheet();

    const overlay = document.createElement('div');
    overlay.className = 'bs-overlay';

    const sheet = document.createElement('div');
    sheet.className = 'bs-sheet';

    let itemsHtml = '';
    if (!items || items.length === 0) {
        itemsHtml = `
            <div class="bs-empty">
                <div class="bs-empty-icon"><i class="ti ti-broadcast-off"></i></div>
                <div>Нет каналов для выбора</div>
            </div>
        `;
    } else {
        itemsHtml = '<div class="bs-list">' + items.map(it => {
            const isActive = it.id === activeId;
            const avatarHtml = it.has_avatar
                ? `<div class="bs-item-avatar" data-avatar-bs="${it.id}"><i class="ti ti-brand-telegram"></i></div>`
                : (it.is_private
                    ? `<div class="bs-item-avatar private"><i class="ti ti-lock"></i></div>`
                    : `<div class="bs-item-avatar">${escapeHtml(getInitials(it.title || 'К'))}</div>`);

            const sub = it.subtitle_warn
                ? `<div class="bs-item-subtitle warn">${escapeHtml(it.subtitle || '')}</div>`
                : (it.subtitle ? `<div class="bs-item-subtitle">${escapeHtml(it.subtitle)}</div>` : '');

            const rightIcon = isActive
                ? `<i class="ti ti-circle-check bs-item-icon-right check"></i>`
                : `<i class="ti ti-chevron-right bs-item-icon-right"></i>`;

            return `
                <div class="bs-item ${isActive ? 'active' : ''}" data-bs-item-id="${it.id}">
                    ${avatarHtml}
                    <div class="bs-item-info">
                        <div class="bs-item-title">${escapeHtml(it.title || 'Канал')}</div>
                        ${sub}
                    </div>
                    ${rightIcon}
                </div>
            `;
        }).join('') + '</div>';
    }

    sheet.innerHTML = `
        <div class="bs-handle"></div>
        <div class="bs-title">${escapeHtml(title || 'Выбери канал')}</div>
        ${subtitle ? `<div class="bs-subtitle">${escapeHtml(subtitle)}</div>` : ''}
        ${itemsHtml}
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(sheet);

    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');

    requestAnimationFrame(() => {
        overlay.classList.add('visible');
        sheet.classList.add('visible');
    });

    _bsActiveContext = { overlay, sheet, onSelect };

    overlay.addEventListener('click', closeBottomSheet);

    sheet.querySelectorAll('[data-bs-item-id]').forEach(el => {
        el.addEventListener('click', () => {
            const id = parseInt(el.getAttribute('data-bs-item-id'), 10);
            const ctx = _bsActiveContext;
            closeBottomSheet();
            if (ctx && typeof ctx.onSelect === 'function') {
                ctx.onSelect(id);
            }
        });
    });

    sheet.querySelectorAll('[data-avatar-bs]').forEach(node => {
        const chId = node.getAttribute('data-avatar-bs');
        loadBottomSheetAvatar(chId, node);
    });

    setupBottomSheetSwipeToClose(sheet);
}


function closeBottomSheet() {
    if (!_bsActiveContext) return;
    const { overlay, sheet } = _bsActiveContext;

    overlay.classList.remove('visible');
    sheet.classList.remove('visible');

    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');

    setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
        if (sheet.parentNode) sheet.remove();
    }, 300);

    _bsActiveContext = null;
}


function setupBottomSheetSwipeToClose(sheet) {
    let startY = null;
    let currentY = null;
    let dragging = false;

    const onTouchStart = (e) => {
        if (sheet.scrollTop > 0) return;
        startY = e.touches[0].clientY;
        currentY = startY;
        dragging = true;
        sheet.style.transition = 'none';
    };

    const onTouchMove = (e) => {
        if (!dragging) return;
        currentY = e.touches[0].clientY;
        const delta = currentY - startY;
        if (delta > 0) {
            sheet.style.transform = `translateY(${delta}px)`;
        }
    };

    const onTouchEnd = () => {
        if (!dragging) return;
        dragging = false;
        sheet.style.transition = '';
        const delta = currentY - startY;
        if (delta > 80) {
            closeBottomSheet();
        } else {
            sheet.style.transform = '';
        }
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: true });
    sheet.addEventListener('touchend', onTouchEnd);
}


async function loadBottomSheetAvatar(channelId, node) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/channels/${channelId}/avatar`, {
            headers: { 'X-Telegram-Init-Data': state.initData || '' },
        });
        if (!resp.ok) return;
        const blob = await resp.blob();
        _setBlobImg(node, blob, '');
    } catch (e) {}
}


async function openActiveChannelSelector(opts) {
    opts = opts || {};
    try {
        const data = await apiRequest('/api/v1/channels/active');

        if (!data.channels || data.channels.length === 0) {
            if (typeof openChannels === 'function') openChannels();
            return;
        }

        const items = data.channels.map(ch => {
            let subtitle = '';
            let warn = false;
            if (ch.voice_status === 'done' && ch.voice_preview) {
                subtitle = ch.voice_preview;
            } else if (ch.voice_status === 'done') {
                subtitle = 'Стиль настроен';
            } else if (ch.voice_status === 'collecting') {
                subtitle = 'Стиль собирается...';
            } else if (ch.is_private) {
                subtitle = 'Приватный · стиль не настроен';
                warn = true;
            } else {
                subtitle = 'Стиль не настроен';
                warn = true;
            }

            return {
                id: ch.id,
                title: ch.title || (ch.username ? '@' + ch.username : 'Канал'),
                subtitle,
                subtitle_warn: warn,
                has_avatar: ch.has_avatar,
                is_private: ch.is_private,
            };
        });

        showBottomSheet({
            title: 'В каком канале работаешь?',
            subtitle: 'Метрики, стиль и аналитика — этого канала',
            items,
            activeId: data.active_channel_id,
            onSelect: async (channelId) => {
                try {
                    await apiRequest('/api/v1/channels/active', {
                        method: 'PATCH',
                        body: JSON.stringify({ channel_id: channelId }),
                        headers: { 'Content-Type': 'application/json' },
                    });
                    // Единая точка распространения смены активного канала: обновляем глобал СРАЗУ,
                    // независимо от того, с какого экрана открыт переключатель (главная или «Создать
                    // пост»). Иначе смена из поста не доходила до бара главной и фильтра «под мою
                    // нишу» на Радаре — они отставали на старый канал.
                    try { window.__fmActiveChannelId = channelId; } catch (e) {}
                    try { if (typeof window.__fmxActiveChannelChanged === 'function') window.__fmxActiveChannelChanged(); } catch (e) {}
                    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('light');
                    if (typeof opts.onChanged === 'function') {
                        opts.onChanged(channelId);
                    } else {
                        await loadDashboard();
                    }
                } catch (e) {
                    showToast('Не удалось переключить канал', 'alert-triangle');
                }
            },
        });
    } catch (e) {
        showToast('Не удалось загрузить каналы', 'alert-triangle');
    }
}


function renderChannelSettingsScreen(data) {
    const host = document.getElementById('channel-settings-screen');
    if (!host) return;

    const title = escapeHtml(data.title || 'Канал');
    const usernameLine = data.is_private
        ? 'приватный'
        : (data.username ? `@${escapeHtml(data.username)}` : '');
    const connectedDate = data.connected_at ? formatConnectedDate(data.connected_at) : '';
    const subline = [usernameLine, connectedDate].filter(Boolean).join(' · ');

    const avatarHtml = data.has_avatar
        ? `<div class="cs-avatar" data-avatar-for-cs="${data.id}"><i class="ti ti-brand-telegram"></i></div>`
        : (data.is_private
            ? `<div class="cs-avatar cs-avatar-private"><i class="ti ti-lock"></i></div>`
            : `<div class="cs-avatar cs-avatar-letters">${escapeHtml(getInitials(data.title || 'К'))}</div>`);

    host.innerHTML = `
        <div class="cs-header">
            <button class="cs-back" onclick="closeChannelSettings()"><i class="ti ti-arrow-left"></i></button>
            ${avatarHtml}
            <div class="cs-title-block">
                <div class="cs-title">${title}</div>
                ${subline ? `<div class="cs-subtitle">${subline}</div>` : ''}
            </div>
        </div>

        ${renderSettingsLimitsBar(data.voice_refresh_limits)}
        ${renderSettingsVoiceSection(data)}
        ${renderSettingsExamplesSection(data)}
        ${renderSettingsBehaviorSection(data)}
        ${renderSettingsHistorySection(data)}
        ${renderSettingsAuditSection(data)}
        ${renderSettingsDangerZone(data)}
    `;

    if (data.has_avatar) {
        loadChannelSettingsAvatar(data.id);
    }
    attachSettingsHandlers();
}


function renderSettingsLimitsBar(limits) {
    if (!limits) return '';
    const used = limits.used || 0;
    const limit = Math.max(1, limits.limit || 0);
    const remaining = Math.max(0, limits.limit - used);
    const exhausted = (limits.limit > 0) && (used >= limits.limit) && !limits.is_tester;
    const percent = exhausted ? 0 : Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));
    const testerNote = limits.is_tester ? '<span class="limit-row-tester">тестер · без лимита</span>' : '';
    const timerTxt = (exhausted && limits.seconds_until_reset)
        ? `<span class="limit-row-timer">${formatRemainingTime(limits.seconds_until_reset)}</span>`
        : '';

    return `
        <div class="cs-limits-bar limit-row limit-row-green ${exhausted ? 'limit-row-exhausted' : ''}">
            <div class="limit-row-head">
                <span class="limit-row-icon"><i class="ti ti-refresh"></i></span>
                <span class="limit-row-label">Обновлений стиля</span>
                ${testerNote}
                <span class="limit-row-count">${remaining}<span class="limit-row-count-total"> / ${limits.limit} в мес</span></span>
            </div>
            <div class="limit-row-bar"><div class="limit-row-bar-fill" style="width: ${percent}%"></div></div>
            ${timerTxt}
        </div>
    `;
}


function renderSettingsVoiceSection(data) {
    const status = data.voice_status || 'idle';
    const quality = data.voice_quality;
    const hasVoice = !!data.voice_summary;
    const postsAnalyzed = data.voice_posts_analyzed || 0;

    let statusBadge = '';
    let bodyHtml = '';

    if (hasVoice && status === 'done') {
        const qualityLabel = quality === 'full'
            ? `${postsAnalyzed} постов · качественно`
            : `${postsAnalyzed} постов · слабый стиль`;
        statusBadge = `
            <div class="cs-status-line cs-status-ok">
                <i class="ti ti-circle-check"></i>
                <span>Стиль настроен</span>
                <span class="cs-status-meta">${qualityLabel}</span>
            </div>
        `;
        bodyHtml = `
            <div class="cs-voice-card">
                <div class="cs-voice-text" id="cs-voice-text">${escapeHtml(data.voice_summary)}</div>
                <div class="cs-voice-actions">
                    <button class="cs-btn-ghost" id="cs-voice-edit"><i class="ti ti-edit"></i> Изменить</button>
                    <button class="cs-btn-accent-ghost" id="cs-voice-refresh"><i class="ti ti-refresh"></i> Пересобрать</button>
                </div>
            </div>
        `;
    } else if (status === 'collecting') {
        statusBadge = `
            <div class="cs-status-line cs-status-collecting">
                <span class="voice-pulse-dot"></span>
                <span>Стиль собирается...</span>
            </div>
        `;
    } else if (status === 'failed' && quality === 'private') {
        statusBadge = `
            <div class="cs-status-line cs-status-warn">
                <i class="ti ti-alert-triangle"></i>
                <div>
                    <div class="cs-status-warn-title">Стиль не настроен</div>
                    <div class="cs-status-warn-text">Канал приватный — я не могу прочитать историю. Загрузи 3-5 примеров постов чтобы AI понял твой стиль.</div>
                </div>
            </div>
        `;
    } else if (status === 'failed' && quality === 'no_posts') {
        statusBadge = `
            <div class="cs-status-line cs-status-warn">
                <i class="ti ti-alert-triangle"></i>
                <div>
                    <div class="cs-status-warn-title">Постов пока нет</div>
                    <div class="cs-status-warn-text">В канале нет постов для анализа. Опубликуй несколько постов и нажми «Пересобрать», или загрузи примеры вручную.</div>
                </div>
            </div>
        `;
    } else if (status === 'failed') {
        statusBadge = `
            <div class="cs-status-line cs-status-warn">
                <i class="ti ti-alert-triangle"></i>
                <div>
                    <div class="cs-status-warn-title">Не удалось настроить стиль</div>
                    <div class="cs-status-warn-text">Попробуй загрузить примеры вручную.</div>
                </div>
            </div>
        `;
    } else {
        statusBadge = `
            <div class="cs-status-line cs-status-neutral">
                <i class="ti ti-clock"></i>
                <span>Стиль ещё не настроен</span>
            </div>
        `;
    }

    return `
        <div class="cs-section">
            <div class="cs-section-title">Стиль письма</div>
            ${statusBadge}
            ${bodyHtml}
        </div>
    `;
}


function renderSettingsExamplesSection(data) {
    const hasVoice = !!data.voice_summary && data.voice_status === 'done';
    const headerLabel = hasVoice ? 'Загрузить примеры вручную' : 'Настроить стиль';
    const accent = !hasVoice;
    const headerIcon = accent ? '<i class="ti ti-sparkles"></i> ' : '';

    return `
        <div class="cs-section">
            <div class="cs-section-title-row">
                <span class="cs-section-title ${accent ? 'cs-section-title-accent' : ''}">${headerIcon}${headerLabel}</span>
                <span class="cs-section-hint">— 1 обновление</span>
            </div>
            <div class="cs-examples-card ${accent ? 'cs-examples-card-accent' : ''}">
                <textarea
                    id="cs-examples-text"
                    class="cs-examples-textarea"
                    placeholder="Вставь сюда 3-5 своих постов как примеры стиля. Разделяй их пустой строкой или ---"
                    maxlength="5000"
                ></textarea>
                <div class="cs-examples-footer">
                    <span class="cs-examples-count" id="cs-examples-count">0 / 5000 символов</span>
                    <button class="cs-btn-primary" id="cs-examples-apply" disabled>Применить</button>
                </div>
            </div>
        </div>
    `;
}


function renderSettingsBehaviorSection(data) {
    const paused = !!data.is_paused;
    const profanity = !!data.use_profanity_default;

    return `
        <div class="cs-section">
            <div class="cs-section-title">Поведение</div>

            <div class="cs-toggle-row" data-toggle="paused">
                <div class="cs-toggle-icon-wrap">
                    <i class="ti ti-player-play" style="color: ${paused ? 'rgba(255,255,255,0.4)' : '#5DCAA5'};"></i>
                </div>
                <div class="cs-toggle-info">
                    <div class="cs-toggle-title-row">
                        <span class="cs-toggle-title">Канал ${paused ? 'на паузе' : 'активен'}</span>
                        <button class="cs-info-btn" data-info="paused" aria-label="Что это значит"><i class="ti ti-info-circle"></i></button>
                    </div>
                    <div class="cs-toggle-sub">${paused ? 'Генерация постов отключена' : 'Можно генерировать посты'}</div>
                    <div class="cs-info-popup" id="cs-info-paused" style="display:none;">
                        Когда канал на паузе, AI не генерирует для него новые посты. Бот остаётся подключённым, настройки и стиль сохраняются. Полезно если уезжаешь в отпуск или временно приостанавливаешь активность канала.
                    </div>
                </div>
                <button class="cs-toggle-switch ${!paused ? 'on' : ''}" data-toggle-target="paused">
                    <span class="cs-toggle-knob"></span>
                </button>
            </div>

            <div class="cs-toggle-row" data-toggle="profanity">
                <div class="cs-toggle-icon-wrap">
                    <i class="ti ti-flame" style="color: ${profanity ? '#F0997B' : 'rgba(255,255,255,0.4)'};"></i>
                </div>
                <div class="cs-toggle-info">
                    <div class="cs-toggle-title-row">
                        <span class="cs-toggle-title">Нецензурная лексика</span>
                        <button class="cs-info-btn" data-info="profanity" aria-label="Что это значит"><i class="ti ti-info-circle"></i></button>
                    </div>
                    <div class="cs-toggle-sub">${profanity ? 'Разрешена по умолчанию' : 'Запрещена по умолчанию'}</div>
                    <div class="cs-info-popup" id="cs-info-profanity" style="display:none;">
                        Если включено, AI будет использовать ненормативную лексику в постах по умолчанию. Можно отдельно переопределить для конкретного поста на экране генерации. Подходит для каналов с резким разговорным стилем.
                    </div>
                </div>
                <button class="cs-toggle-switch ${profanity ? 'on' : ''}" data-toggle-target="profanity">
                    <span class="cs-toggle-knob"></span>
                </button>
            </div>
        </div>
    `;
}


function renderSettingsHistorySection(data) {
    const events = data.events || [];
    if (events.length === 0) {
        return `
            <div class="cs-section">
                <div class="cs-history-empty">
                    <i class="ti ti-history"></i>
                    <span>История пуста</span>
                </div>
            </div>
        `;
    }

    const expanded = _settingsState.eventsExpanded;
    const itemsHtml = events.map(e => {
        const dt = e.created_at ? formatEventDate(e.created_at) : '';
        return `
            <div class="cs-history-item">
                <div class="cs-history-dot"></div>
                <div class="cs-history-text">
                    <div class="cs-history-label">${escapeHtml(e.event_label || e.event_type)}</div>
                    <div class="cs-history-date">${dt}</div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="cs-section">
            <div class="cs-history-toggle" id="cs-history-toggle">
                <div class="cs-history-toggle-left">
                    <i class="ti ti-history"></i>
                    <span class="cs-history-toggle-title">История действий</span>
                    <span class="cs-history-toggle-count">${events.length} ${pluralize(events.length, 'событие','события','событий')}</span>
                </div>
                <i class="ti ti-chevron-${expanded ? 'up' : 'down'}"></i>
            </div>
            <div class="cs-history-body" id="cs-history-body" style="${expanded ? '' : 'display:none;'}">
                ${itemsHtml}
            </div>
        </div>
    `;
}

function renderSettingsAuditSection(data) {
    return `
        <div class="cs-section">
            <button class="cs-btn-audit" data-audit-channel="${data.id}">
                <span class="cs-btn-audit-icon"><i class="ti ti-target"></i></span>
                <span class="cs-btn-audit-body">
                    <span class="cs-btn-audit-title">ИИ-аудит канала</span>
                    <span class="cs-btn-audit-sub">Разбор, прогноз и план роста</span>
                </span>
                <i class="ti ti-chevron-right cs-btn-audit-chev"></i>
            </button>
            <button class="cs-btn-audit cs-btn-competitors" data-competitors-channel="${data.id}">
                <span class="cs-btn-audit-icon"><i class="ti ti-binoculars"></i></span>
                <span class="cs-btn-audit-body">
                    <span class="cs-btn-audit-title">Анализ конкурентов</span>
                    <span class="cs-btn-audit-sub">Карта ниши, их приёмы, план обгона</span>
                </span>
                <i class="ti ti-chevron-right cs-btn-audit-chev"></i>
            </button>
        </div>
    `;
}

function renderSettingsDangerZone(data) {
    return `
        <div class="cs-section cs-danger-zone">
            <button class="cs-btn-danger" id="cs-delete-channel">
                <i class="ti ti-trash"></i> Удалить канал
            </button>
        </div>
    `;
}


function attachSettingsHandlers() {
    const auditBtn = document.querySelector('.cs-btn-audit[data-audit-channel]');
    if (auditBtn) {
        auditBtn.addEventListener('click', () => {
            const chId = parseInt(auditBtn.getAttribute('data-audit-channel'), 10);
            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('medium');
            // окно настроек — оверлей поверх всего: без закрытия аудит открывался ПОД ним
            closeChannelSettings();
            if (typeof window.__openAudit === 'function') window.__openAudit(chId);
        });
    }

    const competitorsBtn = document.querySelector('.cs-btn-competitors[data-competitors-channel]');
    if (competitorsBtn) {
        competitorsBtn.addEventListener('click', () => {
            const chId = parseInt(competitorsBtn.getAttribute('data-competitors-channel'), 10);
            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('medium');
            closeChannelSettings();
            if (typeof window.__openCompetitors === 'function') window.__openCompetitors(chId);
        });
    }

    const textarea = document.getElementById('cs-examples-text');
    const counter = document.getElementById('cs-examples-count');
    const applyBtn = document.getElementById('cs-examples-apply');

    if (textarea) {
        textarea.addEventListener('input', () => {
            const len = textarea.value.length;
            if (counter) counter.textContent = `${len} / 5000 символов`;
            if (applyBtn) applyBtn.disabled = (len < 30);
        });
    }

    if (applyBtn) applyBtn.addEventListener('click', handleApplyExamples);

    const editBtn = document.getElementById('cs-voice-edit');
    if (editBtn) editBtn.addEventListener('click', handleEditVoiceSummary);

    const refreshBtn = document.getElementById('cs-voice-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', handleRefreshVoiceFromSettings);

    document.querySelectorAll('.cs-toggle-switch').forEach(sw => {
        sw.addEventListener('click', async () => {
            const target = sw.getAttribute('data-toggle-target');
            const isOn = sw.classList.contains('on');
            await handleToggleSwitch(target, !isOn);
        });
    });

    document.querySelectorAll('.cs-info-btn').forEach(b => {
        b.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = b.getAttribute('data-info');
            const popup = document.getElementById(`cs-info-${key}`);
            if (popup) popup.style.display = popup.style.display === 'none' ? '' : 'none';
        });
    });

    const historyToggle = document.getElementById('cs-history-toggle');
    if (historyToggle) {
        historyToggle.addEventListener('click', () => {
            _settingsState.eventsExpanded = !_settingsState.eventsExpanded;
            renderChannelSettingsScreen(_settingsState.data);
        });
    }

    const delBtn = document.getElementById('cs-delete-channel');
    if (delBtn) delBtn.addEventListener('click', handleDeleteFromSettings);
}


async function handleApplyExamples() {
    const textarea = document.getElementById('cs-examples-text');
    const applyBtn = document.getElementById('cs-examples-apply');
    if (!textarea || !applyBtn) return;

    const text = textarea.value.trim();
    if (text.length < 30) {
        await alertDialog('Слишком короткий текст. Загрузи 3-5 постов от 30 символов каждый.');
        return;
    }

    const confirmed = await confirmDialog(
        `Применить примеры стиля?\n\nЭто заменит текущий стиль канала и потратит 1 обновление из месячного лимита.`
    );
    if (!confirmed) return;

    applyBtn.disabled = true;
    applyBtn.textContent = 'Применяю...';

    try {
        const result = await apiRequest(`/api/v1/channels/${_settingsState.channelId}/upload-examples`, {
            method: 'POST',
            body: JSON.stringify({ examples_text: text }),
            headers: { 'Content-Type': 'application/json' },
        });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');
        await alertDialog(`Стиль обновлён! Проанализировано ${result.examples_processed} ${pluralize(result.examples_processed, 'пример', 'примера', 'примеров')}.`);
        await openChannelSettingsScreen(_settingsState.channelId);
    } catch (e) {
        const msg = (e?.message || '').includes('429')
            ? 'Лимит обновлений стиля на месяц исчерпан.'
            : (e?.message || '').includes('403')
                ? 'Загрузка примеров недоступна на этом тарифе.'
                : (e?.message || '').includes('400')
                    ? 'Не нашёл осмысленных примеров. Каждый пример должен быть от 30 символов.'
                    : 'Не удалось применить примеры. Попробуй позже.';
        await alertDialog(msg);
        applyBtn.disabled = false;
        applyBtn.textContent = 'Применить';
    }
}


async function handleEditVoiceSummary() {
    const current = _settingsState.data?.voice_summary || '';
    const newText = await showVoiceEditorModal(current);
    if (newText === null) return;

    const trimmed = newText.trim();
    if (trimmed.length < 10) {
        await alertDialog('Текст должен быть от 10 символов.');
        return;
    }
    if (trimmed.length > 2000) {
        await alertDialog('Текст слишком длинный (макс 2000 символов).');
        return;
    }

    try {
        await apiRequest(`/api/v1/channels/${_settingsState.channelId}`, {
            method: 'PATCH',
            body: JSON.stringify({ voice_summary: trimmed }),
            headers: { 'Content-Type': 'application/json' },
        });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');

        if (_settingsState.data) {
            _settingsState.data.voice_summary = trimmed;
            const textEl = document.getElementById('cs-voice-text');
            if (textEl) textEl.textContent = trimmed;
        }
        refreshSettingsHistory();
    } catch (e) {
        await alertDialog('Не удалось сохранить изменения.');
    }
}


function showVoiceEditorModal(currentText) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'cs-modal-overlay';
        modal.innerHTML = `
            <div class="cs-modal">
                <div class="cs-modal-header">
                    <span class="cs-modal-title">Редактировать стиль</span>
                    <button class="cs-modal-close" data-action="close"><i class="ti ti-x"></i></button>
                </div>
                <div class="cs-modal-body">
                    <textarea class="cs-modal-textarea" id="cs-modal-voice-text" maxlength="2000" placeholder="Описание стиля письма канала...">${escapeHtml(currentText)}</textarea>
                    <div class="cs-modal-counter" id="cs-modal-counter">${currentText.length} / 2000</div>
                </div>
                <div class="cs-modal-actions">
                    <button class="cs-btn-ghost" data-action="cancel">Отмена</button>
                    <button class="cs-btn-primary" data-action="save">Сохранить</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const textarea = modal.querySelector('#cs-modal-voice-text');
        const counter = modal.querySelector('#cs-modal-counter');

        const cleanup = (result) => {
            modal.remove();
            resolve(result);
        };

        textarea.addEventListener('input', () => {
            counter.textContent = `${textarea.value.length} / 2000`;
        });

        modal.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const a = btn.getAttribute('data-action');
                if (a === 'save') cleanup(textarea.value);
                else cleanup(null);
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) cleanup(null);
        });

        setTimeout(() => textarea.focus(), 50);
    });
}


async function handleRefreshVoiceFromSettings() {
    const confirmed = await confirmDialog(
        `Пересобрать стиль из последних постов канала?\n\nЭто заменит текущий стиль и потратит 1 обновление из месячного лимита.`
    );
    if (!confirmed) return;

    try {
        await apiRequest(`/api/v1/channels/${_settingsState.channelId}/voice/refresh`, { method: 'POST' });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');

        const statusEl = document.querySelector('.cs-status-line');
        if (statusEl) {
            statusEl.className = 'cs-status-line cs-status-collecting';
            statusEl.innerHTML = '<span class="voice-pulse-dot"></span><span>Стиль собирается...</span>';
        }

        startSettingsVoicePolling();
    } catch (e) {
        const msg = (e?.message || '').includes('429')
            ? 'Лимит обновлений стиля на месяц исчерпан.'
            : (e?.message || '').includes('403')
                ? 'Обновление недоступно на этом тарифе.'
                : 'Не удалось запустить пересборку.';
        await alertDialog(msg);
    }
}


let _settingsVoicePollTimer = null;

function startSettingsVoicePolling() {
    if (_settingsVoicePollTimer) return;
    _settingsVoicePollTimer = setInterval(async () => {
        if (!_settingsState.channelId) {
            stopSettingsVoicePolling();
            return;
        }
        try {
            const data = await apiRequest(`/api/v1/channels/${_settingsState.channelId}/details`);
            _settingsState.data = data;
            if (data.voice_status !== 'collecting') {
                stopSettingsVoicePolling();
                renderChannelSettingsScreen(data);
            }
        } catch (e) {
            stopSettingsVoicePolling();
        }
    }, 4000);
}


function stopSettingsVoicePolling() {
    if (_settingsVoicePollTimer) {
        clearInterval(_settingsVoicePollTimer);
        _settingsVoicePollTimer = null;
    }
}


async function handleToggleSwitch(target, newValue) {
    const payload = {};
    if (target === 'paused') payload.is_paused = !newValue;
    if (target === 'profanity') payload.use_profanity_default = newValue;

    if (_settingsState.data) {
        if (target === 'paused') _settingsState.data.is_paused = !newValue;
        if (target === 'profanity') _settingsState.data.use_profanity_default = newValue;
        updateToggleVisual(target, newValue);
    }

    try {
        await apiRequest(`/api/v1/channels/${_settingsState.channelId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
        });
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('light');
        refreshSettingsHistory();
    } catch (e) {
        if (_settingsState.data) {
            if (target === 'paused') _settingsState.data.is_paused = newValue;
            if (target === 'profanity') _settingsState.data.use_profanity_default = !newValue;
            updateToggleVisual(target, !newValue);
        }
        await alertDialog('Не удалось сохранить изменение.');
    }
}


async function refreshSettingsHistory() {
    if (!_settingsState.channelId) return;
    try {
        const data = await apiRequest(`/api/v1/channels/${_settingsState.channelId}/details`);
        if (!_settingsState.data) return;
        _settingsState.data.events = data.events || [];

        const oldSection = document.querySelector('.cs-history-toggle')?.closest('.cs-section');
        if (!oldSection) return;

        const tmp = document.createElement('div');
        tmp.innerHTML = renderSettingsHistorySection(_settingsState.data);
        const newSection = tmp.firstElementChild;
        if (newSection) {
            oldSection.replaceWith(newSection);

            const toggle = document.getElementById('cs-history-toggle');
            if (toggle) {
                toggle.addEventListener('click', () => {
                    _settingsState.eventsExpanded = !_settingsState.eventsExpanded;
                    refreshSettingsHistory();
                });
            }
        }
    } catch (e) {}
}


function updateToggleVisual(target, isOn) {
    const sw = document.querySelector(`.cs-toggle-switch[data-toggle-target="${target}"]`);
    if (sw) {
        if (isOn) sw.classList.add('on');
        else sw.classList.remove('on');
    }

    if (target === 'paused') {
        const iconWrap = document.querySelector('[data-toggle="paused"] .cs-toggle-icon-wrap i');
        const titleEl = document.querySelector('[data-toggle="paused"] .cs-toggle-title');
        const subEl = document.querySelector('[data-toggle="paused"] .cs-toggle-sub');
        const paused = !isOn;
        if (iconWrap) iconWrap.style.color = paused ? 'rgba(255,255,255,0.4)' : '#5DCAA5';
        if (titleEl) titleEl.textContent = `Канал ${paused ? 'на паузе' : 'активен'}`;
        if (subEl) subEl.textContent = paused ? 'Генерация постов отключена' : 'Можно генерировать посты';
    }

    if (target === 'profanity') {
        const iconWrap = document.querySelector('[data-toggle="profanity"] .cs-toggle-icon-wrap i');
        const subEl = document.querySelector('[data-toggle="profanity"] .cs-toggle-sub');
        if (iconWrap) iconWrap.style.color = isOn ? '#F0997B' : 'rgba(255,255,255,0.4)';
        if (subEl) subEl.textContent = isOn ? 'Разрешена по умолчанию' : 'Запрещена по умолчанию';
    }
}


async function handleDeleteFromSettings() {
    const data = _settingsState.data;
    if (!data) return;
    const title = data.title || 'Канал';
    const confirmed = await confirmDialog(
        `Удалить канал «${title}»?\n\nКанал переедет в «Недавно удалённые», слот тарифа освободится. В течение 7 дней его можно вернуть.`
    );
    if (!confirmed) return;
    try {
        await apiRequest(`/api/v1/channels/${_settingsState.channelId}`, { method: 'DELETE' });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');
        closeChannelSettings();
        await openChannels();
        refreshDashboardSilent();
    } catch (e) {
        await alertDialog('Не удалось удалить канал.');
    }
}


async function loadChannelSettingsAvatar(channelId) {
    const node = document.querySelector(`[data-avatar-for-cs="${channelId}"]`);
    if (!node) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/api/v1/channels/${channelId}/avatar`, {
            headers: { 'X-Telegram-Init-Data': state.initData || '' },
        });
        if (!resp.ok) return;
        const blob = await resp.blob();
        _setBlobImg(node, blob, 'channel-avatar-img');
    } catch (e) {}
}


function getInitials(text) {
    if (!text) return 'К';
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}


function formatConnectedDate(iso) {
    try {
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) return 'подключён сегодня';
        const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'подключён вчера';
        const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
        return `подключён ${d.getDate()} ${months[d.getMonth()]}`;
    } catch (e) {
        return '';
    }
}


function formatEventDate(iso) {
    try {
        const d = new Date(iso);
        const now = new Date();
        const diffMin = Math.floor((now - d) / 60000);
        if (diffMin < 1) return 'только что';
        if (diffMin < 60) return `${diffMin} мин назад`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr} ч назад`;
        const diffDay = Math.floor(diffHr / 24);
        if (diffDay < 7) return `${diffDay} ${pluralize(diffDay, 'день','дня','дней')} назад`;
        const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
        return `${d.getDate()} ${months[d.getMonth()]} в ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    } catch (e) {
        return '';
    }
}


function pluralize(n, one, few, many) {
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
}


async function runDemoPreview() {
    if (!els.channelsDemoInput) return;
    const raw = (els.channelsDemoInput.value || '').trim();

    if (els.channelsDemoError) els.channelsDemoError.style.display = 'none';
    if (els.channelsDemoResult) {
        els.channelsDemoResult.style.display = 'none';
        els.channelsDemoResult.innerHTML = '';
    }

    if (!raw) {
        showDemoError('Введи @username канала');
        return;
    }

    if (els.channelsDemoBtn) {
        els.channelsDemoBtn.disabled = true;
        els.channelsDemoBtn.textContent = '...';
    }

    try {
        const data = await apiRequest('/api/v1/channels/demo-preview', {
            method: 'POST',
            body: JSON.stringify({ username: raw }),
        });

        if (!data.ok) {
            const map = {
                invalid_username: 'Не похоже на @username канала. Пример: @durov',
                not_found: 'Канал не найден или закрыт',
                private_or_empty: 'Это приватный канал или в нём нет постов. Демо работает только с публичными.',
                fetch_error: 'Не удалось получить канал. Попробуй позже.',
            };
            showDemoError(map[data.error] || 'Не удалось загрузить канал');
            return;
        }

        renderDemoPreview(data);
    } catch (err) {
        showDemoError('Ошибка соединения. Попробуй ещё раз.');
    } finally {
        if (els.channelsDemoBtn) {
            els.channelsDemoBtn.disabled = false;
            els.channelsDemoBtn.textContent = 'Анализ';
        }
    }
}


function showDemoError(msg) {
    if (!els.channelsDemoError) return;
    els.channelsDemoError.textContent = msg;
    els.channelsDemoError.style.display = '';
}


function renderDemoPreview(data) {
    if (!els.channelsDemoResult) return;

    const subs = formatSubscribers(data.subscribers);
    const subLine = subs ? `${subs} подписчиков` : 'Публичный канал';

    const posts = (data.posts || []).slice(0, 3).map(p => {
        const txt = escapeHtml(p.slice(0, 220));   // режем сырой текст, потом экранируем — иначе можно обрубить HTML-сущность посередине
        return `<div class="channels-preview-post">${txt}${p.length > 220 ? '…' : ''}</div>`;
    }).join('');

    els.channelsDemoResult.innerHTML = `
        <div class="channels-preview-card">
            <div class="channels-preview-head">
                <div class="channel-card-avatar demo"><i class="ti ti-brand-telegram"></i></div>
                <div>
                    <div class="channels-preview-name">${escapeHtml(data.title || data.username)}</div>
                    <div class="channels-preview-sub">@${escapeHtml(data.username)} · ${subLine}</div>
                </div>
            </div>
            ${posts || '<div class="channels-preview-sub">Постов для превью не нашлось</div>'}
        </div>
    `;
    els.channelsDemoResult.style.display = '';
}


window.__toggleListInstruction = function () {
    const ins = document.getElementById('channels-instruction-list');
    if (ins) {
        ins.style.display = '';
        ins.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};


const THINKING_TEXTS_ANALYZE = [
    'Анализирую тему...',
    'Понимаю что ты хочешь...',
    'Думаю...',
];

const THINKING_TEXTS_GENERATE = [
    'Пишу пост...',
    'Подбираю слова...',
    'Шлифую формулировки...',
    'Почти готово...',
];

const THINKING_TEXTS_SUGGEST = [
    'Перечитываю пост...',
    'Думаю что можно улучшить...',
];

const THINKING_TEXTS_MODIFY = [
    'Применяю правку...',
    'Переписываю...',
    'Шлифую...',
];


function startThinkingAnimation(textsArray) {
    stopThinkingAnimation();
    state.post.thinkingTextIndex = 0;
    if (els.thinkingText) {
        els.thinkingText.style.opacity = '1';
        els.thinkingText.textContent = textsArray[0];
    }

    state.post.thinkingTimer = setInterval(() => {
        state.post.thinkingTextIndex = (state.post.thinkingTextIndex + 1) % textsArray.length;
        if (!els.thinkingText) return;
        els.thinkingText.style.opacity = '0';
        setTimeout(() => {
            if (!els.thinkingText) return;
            els.thinkingText.textContent = textsArray[state.post.thinkingTextIndex];
            els.thinkingText.style.opacity = '1';
        }, 200);
    }, 1800);
}


function stopThinkingAnimation() {
    if (state.post.thinkingTimer) {
        clearInterval(state.post.thinkingTimer);
        state.post.thinkingTimer = null;
    }
}


async function submitTopicForAnalysis() {
    const topic = (els.postTopicInput?.value || '').trim();
    if (!topic) return;

    state.post.topic = topic;
    state.post.styleReferenceText = (els.postStyleInput?.value || '').trim();
    state.post.contextHistory = [];

    showScreen('postThinking');
    startThinkingAnimation(THINKING_TEXTS_ANALYZE);

    try {
        const result = await apiRequest('/api/v1/post/analyze', {
            method: 'POST',
            body: JSON.stringify({
                topic,
                use_profanity: state.post.useProfanity,
                use_channel_style: state.post.useChannelStyle !== false,
                context_history: [],
            }),
        });

        await handleAnalyzeResult(result);
    } catch (err) {
        stopThinkingAnimation();
        handlePostApiError(err);
    }
}


async function handleAnalyzeResult(result) {
    // защита от нецелевого использования: вопрос ассистенту вместо темы поста
    if (result.off_topic) {
        stopThinkingAnimation();
        showScreen('postCreate');
        showToast('Это генератор постов, а не чат-ассистент. Опиши тему поста для канала', 'info-circle');
        return;
    }

    if (result.ready_to_generate || !result.needs_question) {
        await runGenerate();
        return;
    }

    stopThinkingAnimation();
    renderQuestion(result);
}


function renderQuestion(result) {
    els.postQuestionText.textContent = result.question || 'Уточни мысль';
    els.postStepBadge.textContent = String(result.step || (state.post.contextHistory.length + 1));

    els.postQuestionOptions.innerHTML = '';
    const options = Array.isArray(result.options) ? result.options : [];

    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'question-option';
        btn.innerHTML = `
            <span class="question-option-text">${escapeHtml(option)}</span>
            <i class="ti ti-arrow-right"></i>
        `;
        btn.addEventListener('click', () => submitAnswer(result.question, option));
        els.postQuestionOptions.appendChild(btn);
    });

    els.postQuestionCustomInput.value = '';
    els.postQuestionCustomSubmit.disabled = true;

    showScreen('postQuestion');
}


async function submitAnswer(question, answer) {
    if (!answer || !answer.trim()) return;

    state.post.contextHistory.push({
        question: question || '',
        answer: answer.trim(),
    });

    showScreen('postThinking');
    startThinkingAnimation(THINKING_TEXTS_ANALYZE);

    try {
        const result = await apiRequest('/api/v1/post/analyze', {
            method: 'POST',
            body: JSON.stringify({
                topic: state.post.topic,
                use_profanity: state.post.useProfanity,
                use_channel_style: state.post.useChannelStyle !== false,
                context_history: state.post.contextHistory,
            }),
        });

        await handleAnalyzeResult(result);
    } catch (err) {
        stopThinkingAnimation();
        handlePostApiError(err);
    }
}


function handleQuestionCustomInput() {
    const value = (els.postQuestionCustomInput?.value || '').trim();
    els.postQuestionCustomSubmit.disabled = value.length === 0;
}


function submitQuestionCustom() {
    const answer = (els.postQuestionCustomInput?.value || '').trim();
    if (!answer) return;
    const question = els.postQuestionText.textContent;
    submitAnswer(question, answer);
}


async function runGenerate() {
    startThinkingAnimation(THINKING_TEXTS_GENERATE);

    try {
        const result = await apiRequest('/api/v1/post/generate', {
            method: 'POST',
            body: JSON.stringify({
                topic: state.post.topic,
                use_profanity: state.post.useProfanity,
                use_channel_style: state.post.useChannelStyle !== false,
                context_history: state.post.contextHistory,
                style_reference_text: state.post.styleReferenceText || null,
                length: state.post.length || 'auto',
                emoji: state.post.emoji || 'auto',
            }),
        });

        state.post.currentPostId = result.post_id;
        state.post.currentPostText = result.text;
        state.post.lastStyleApplied = !!(result.style_applied ?? result.has_voice);

        stopThinkingAnimation();
        renderResult(result);

        loadSuggestions(result.post_id);
    } catch (err) {
        stopThinkingAnimation();
        handlePostApiError(err);
    }
}


function renderResult(result) {
    els.postResultText.textContent = result.text;
    els.postResultModel.textContent = result.model_used || 'Модель';

    // честный индикатор: применялся ли стиль канала к этому тексту
    const styleBadge = document.getElementById('post-result-style');
    if (styleBadge) {
        const applied = (result.style_applied !== undefined)
            ? !!result.style_applied
            : !!state.post.lastStyleApplied;
        styleBadge.style.display = applied ? '' : 'none';
    }

    els.postResultSuggestions.style.display = 'none';
    els.postResultSuggestionsList.innerHTML = '';
    els.postResultCustomInput.value = '';
    els.postResultCustomSubmit.disabled = true;

    const hasChannel = !!state.post.limits?.has_channel;
    if (els.postSendChannelBtn) {
        els.postSendChannelBtn.dataset.locked = String(!hasChannel);
    }
    if (els.postScheduleBtn) {
        els.postScheduleBtn.dataset.locked = String(!hasChannel);
    }

    showScreen('postResult');
}


async function loadSuggestions(postId) {
    if (!postId) return;

    try {
        const result = await apiRequest('/api/v1/post/suggest-edits', {
            method: 'POST',
            body: JSON.stringify({ post_id: postId }),
        });

        state.post.suggestions = result.suggestions || [];
        state.post.isGood = !!result.is_good;
        renderSuggestions();
    } catch (err) {
        console.warn('Suggestions failed:', err);
    }
}


function renderSuggestions() {
    if (!els.postResultSuggestions || !els.postResultSuggestionsList) return;

    const suggestions = state.post.suggestions || [];
    if (suggestions.length === 0) {
        els.postResultSuggestions.style.display = 'none';
        return;
    }

    els.postResultSuggestionsList.innerHTML = '';
    suggestions.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'result-suggestion-btn';
        btn.innerHTML = `
            <div class="suggestion-icon">
                <i class="ti ti-wand"></i>
            </div>
            <span class="suggestion-text">${escapeHtml(s.label || 'Доработать')}</span>
            <i class="ti ti-chevron-right suggestion-chevron"></i>
        `;
        btn.addEventListener('click', () => requestEdit(s.instruction || s.label));
        els.postResultSuggestionsList.appendChild(btn);
    });

    els.postResultSuggestions.style.display = '';
}


function handleResultCustomInput() {
    const value = (els.postResultCustomInput?.value || '').trim();
    els.postResultCustomSubmit.disabled = value.length === 0;
}


function submitResultCustomEdit() {
    const instruction = (els.postResultCustomInput?.value || '').trim();
    if (!instruction) return;
    requestEdit(instruction);
}


function requestEdit(instruction) {
    if (!instruction || !state.post.currentPostId) return;

    state.post.pendingInstruction = instruction;

    const canChoose = !!state.post.limits?.can_choose_model;
    if (canChoose) {
        showModelPicker();
    } else {
        applyEdit(instruction, null);
    }
}


function addEmojiToPost() {
    if (!state.post.currentPostId) return;
    const instruction = 'Расставь по тексту уместные эмодзи так, как это делает живой человек в Telegram: не в каждое предложение, а точечно — для усиления эмоции или акцента. Не меняй сам текст, только добавь эмодзи. Не используй эмодзи-списки и не лепи их подряд.';
    requestEdit(instruction);
}


function showModelPicker() {
    if (!els.modelPickerModal) return;

    const limits = state.post.limits || {};
    const limitState = limits.limit_state || {};

    if (els.modelPickPremiumMeta) {
        if (limitState.state === 'premium' && limitState.limit != null) {
            const remaining = limitState.limit - (limitState.used ?? 0);
            els.modelPickPremiumMeta.textContent = `Точнее. Осталось ${remaining}`;
        } else {
            els.modelPickPremiumMeta.textContent = 'Точнее, глубже';
        }
    }
    if (els.modelPickStandardMeta) {
        els.modelPickStandardMeta.textContent = 'Быстрее, легче';
    }

    els.modelPickerModal.style.display = '';
}


function hideModelPicker() {
    if (els.modelPickerModal) els.modelPickerModal.style.display = 'none';
}


async function applyEdit(instruction, preferredModel) {
    hideModelPicker();
    if (!state.post.currentPostId || !instruction) return;

    showScreen('postThinking');
    startThinkingAnimation(THINKING_TEXTS_MODIFY);

    try {
        const result = await apiRequest('/api/v1/post/modify', {
            method: 'POST',
            body: JSON.stringify({
                post_id: state.post.currentPostId,
                custom_instruction: instruction,
                preferred_model: preferredModel,
            }),
        });

        state.post.currentPostId = result.post_id;
        state.post.currentPostText = result.text;
        state.post.pendingInstruction = null;

        try {
            const limits = await apiRequest('/api/v1/post/limits');
            state.post.limits = limits;
        } catch (_) {}

        stopThinkingAnimation();
        renderResult({
            text: result.text,
            model_used: result.model_used,
            post_id: result.post_id,
        });

        loadSuggestions(result.post_id);
    } catch (err) {
        stopThinkingAnimation();
        handlePostApiError(err);
    }
}


function regeneratePost() {
    if (!state.post.topic) {
        showScreen('postCreate');
        return;
    }

    // contextHistory сохраняем: ответы на уточняющие вопросы — часть задания,
    // перегенерация не должна их выбрасывать
    showScreen('postThinking');
    startThinkingAnimation(THINKING_TEXTS_GENERATE);
    runGenerate();
}


async function copyPostToClipboard() {
    const text = state.post.currentPostText || '';
    if (!text) return;

    let copied = false;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            copied = true;
        }
    } catch (_) {}

    if (!copied) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.top = '-1000px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copied = true;
        } catch (_) {}
    }

    if (copied) {
        showToast('Скопировано', 'check');
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');
    } else {
        showToast('Не удалось скопировать', 'alert-triangle');
    }
}


function showLockedFeatureModal(kind) {
    if (!els.lockedFeatureModal) return;

    if (kind === 'channel') {
        els.lockedFeatureTitle.textContent = 'Подключи канал';
        els.lockedFeatureText.textContent = 'Чтобы опубликовать пост в канал — сначала подключи свой Telegram-канал к боту';
    } else if (kind === 'schedule') {
        els.lockedFeatureTitle.textContent = 'Подключи канал';
        els.lockedFeatureText.textContent = 'Чтобы планировать посты — сначала подключи свой Telegram-канал к боту';
    } else {
        els.lockedFeatureTitle.textContent = 'Скоро';
        els.lockedFeatureText.textContent = 'Функция в разработке';
    }

    els.lockedFeatureModal.style.display = '';
}


function hideLockedFeatureModal() {
    if (els.lockedFeatureModal) els.lockedFeatureModal.style.display = 'none';
}


function closeAllModals() {
    hideModelPicker();
    hideLockedFeatureModal();
}


function formatRemainingTime(seconds) {
    if (seconds === null || seconds === undefined) return '';
    if (seconds <= 0) return 'сейчас';

    if (seconds >= 86400) {
        const days = Math.ceil(seconds / 86400);
        const word = days === 1 ? 'день' : (days >= 2 && days <= 4 ? 'дня' : 'дней');
        return `через ${days} ${word}`;
    }

    if (seconds >= 3600) {
        const hours = Math.ceil(seconds / 3600);
        const word = hours === 1 ? 'час' : (hours >= 2 && hours <= 4 ? 'часа' : 'часов');
        return `через ${hours} ${word}`;
    }

    if (seconds >= 60) {
        const minutes = Math.ceil(seconds / 60);
        const word = minutes === 1 ? 'минуту' : (minutes >= 2 && minutes <= 4 ? 'минуты' : 'минут');
        return `через ${minutes} ${word}`;
    }

    return 'через минуту';
}


function showToast(text, icon) {
    if (!els.toast) return;
    if (els.toastText) els.toastText.textContent = text;
    if (els.toastIcon) els.toastIcon.className = `ti ti-${icon || 'check'}`;

    els.toast.style.display = '';

    if (state._toastTimer) clearTimeout(state._toastTimer);
    state._toastTimer = setTimeout(() => {
        if (els.toast) els.toast.style.display = 'none';
    }, 2400);
}


function handlePostApiError(err) {
    // ОТКАЧЕНО по просьбе владельца 24.07 к доаудитной версии (классификация по подстроке
    // текста ошибки, а не по err.status). Это единственная правка сессии внутри «Создать пост».
    const msg = err?.message || '';

    if (msg.includes('404') && msg.includes('User not found')) {
        showStartBotScreen();
        return;
    }

    if (msg.includes('429')) {
        showToast('Слишком часто. Повторите через несколько секунд', 'alert-triangle');
        showScreen('postCreate');
        return;
    }

    if (msg.includes('401')) {
        showToast('Сессия истекла, переоткрой Mini App', 'alert-triangle');
        return;
    }

    if (msg.includes('500')) {
        showToast('Что-то пошло не так. Попробуй ещё раз', 'alert-triangle');
        showScreen('postCreate');
        return;
    }

    showToast(msg.slice(0, 80) || 'Ошибка', 'alert-triangle');
    showScreen('postCreate');
}


function setupPostEventListeners() {
    if (els.postCreateBack) {
        els.postCreateBack.addEventListener('click', () => {
            showScreen('dashboard');
        });
    }

    if (els.postTopicInput) {
        els.postTopicInput.addEventListener('input', () => {
            const val = els.postTopicInput.value;
            els.postTopicCounter.textContent = String(val.length);
            const canSubmit = val.trim().length > 0 && state.post.limits?.limit_state?.state !== 'exhausted';
            els.postGenerateBtn.disabled = !canSubmit;
        });
    }

    // тап-зона мата — вся строка настройки, не только переключатель
    const profanityRow = document.getElementById('post-profanity-row');
    if (profanityRow) {
        profanityRow.addEventListener('click', toggleProfanity);
    }

    const lengthChips = document.getElementById('post-length-chips');
    if (lengthChips) {
        lengthChips.addEventListener('click', (ev) => {
            const chip = ev.target.closest('.post-chip');
            if (!chip) return;
            state.post.length = chip.dataset.val || 'auto';
            setChipGroup('post-length-chips', state.post.length);
            updateLengthAutoNote(state.post.limits?.style_profile);
            if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged?.();
        });
    }

    const emojiChips = document.getElementById('post-emoji-chips');
    if (emojiChips) {
        emojiChips.addEventListener('click', (ev) => {
            const chip = ev.target.closest('.post-chip');
            if (!chip) return;
            state.post.emoji = chip.dataset.val || 'auto';
            setChipGroup('post-emoji-chips', state.post.emoji);
            if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged?.();
        });
    }

    const ideasBtn = document.getElementById('post-ideas-btn');
    if (ideasBtn) {
        ideasBtn.addEventListener('click', loadTopicIdeas);
    }

    if (els.postStyleLoadBtn) {
        els.postStyleLoadBtn.addEventListener('click', toggleStyleInput);
    }

    if (els.postStyleConnectBtn) {
        els.postStyleConnectBtn.addEventListener('click', handleConnectChannelHint);
    }

    if (els.postStyleInput) {
        els.postStyleInput.addEventListener('input', () => {
            const val = els.postStyleInput.value;
            els.postStyleCounter.textContent = String(val.length);
        });
    }

    if (els.postStyleClear) {
        els.postStyleClear.addEventListener('click', clearStyleInput);
    }

    if (els.postStyleApply) {
        els.postStyleApply.addEventListener('click', applyStyleInput);
    }

    if (els.postGenerateBtn) {
        els.postGenerateBtn.addEventListener('click', submitTopicForAnalysis);
    }

    if (els.postQuestionBack) {
        els.postQuestionBack.addEventListener('click', () => {
            stopThinkingAnimation();
            showScreen('postCreate');
        });
    }

    if (els.postQuestionCustomInput) {
        els.postQuestionCustomInput.addEventListener('input', handleQuestionCustomInput);
    }

    if (els.postQuestionCustomSubmit) {
        els.postQuestionCustomSubmit.addEventListener('click', submitQuestionCustom);
    }

    if (els.postResultBack) {
        els.postResultBack.addEventListener('click', () => {
            showScreen('postCreate');
        });
    }

    if (els.postResultCustomInput) {
        els.postResultCustomInput.addEventListener('input', handleResultCustomInput);
    }

    if (els.postResultCustomSubmit) {
        els.postResultCustomSubmit.addEventListener('click', submitResultCustomEdit);
    }

    if (els.postCopyBtn) {
        els.postCopyBtn.addEventListener('click', copyPostToClipboard);
    }

    if (els.postSendChannelBtn) {
        els.postSendChannelBtn.addEventListener('click', () => {
            const locked = els.postSendChannelBtn.dataset.locked === 'true';
            if (locked) showLockedFeatureModal('channel');
            else showToast('Скоро будет публикация в канал', 'check');
        });
    }

    if (els.postScheduleBtn) {
        els.postScheduleBtn.addEventListener('click', () => {
            const locked = els.postScheduleBtn.dataset.locked === 'true';
            if (locked) showLockedFeatureModal('schedule');
            else showToast('Скоро будет автопостинг', 'check');
        });
    }

    if (els.postRegenerateBtn) {
        els.postRegenerateBtn.addEventListener('click', regeneratePost);
    }

    if (els.postEmojiBtn) {
        els.postEmojiBtn.addEventListener('click', addEmojiToPost);
    }

    if (els.modelPickPremium) {
        els.modelPickPremium.addEventListener('click', () => {
            applyEdit(state.post.pendingInstruction, 'premium');
        });
    }

    if (els.modelPickStandard) {
        els.modelPickStandard.addEventListener('click', () => {
            applyEdit(state.post.pendingInstruction, 'standard');
        });
    }

    if (els.modelPickCancel) {
        els.modelPickCancel.addEventListener('click', () => {
            state.post.pendingInstruction = null;
            hideModelPicker();
        });
    }

    if (els.lockedFeatureAction) {
        els.lockedFeatureAction.addEventListener('click', () => {
            hideLockedFeatureModal();
            handleAction('add_channel');
        });
    }

    if (els.lockedFeatureCancel) {
        els.lockedFeatureCancel.addEventListener('click', hideLockedFeatureModal);
    }
}


/* ===================== live-обновление (без перезаходов) =====================
   Пока приложение открыто, периодически (и при возврате фокуса) сверяем версии
   ассетов из index.html на сервере с реально загруженными. Если вышла новая
   версия — мягко перезагружаемся, не прерывая набор текста. Работает вместе с
   no-store на index.html (vercel.json): перезагрузка получает свежую страницу. */
// i18n_dict.js больше не грузится (словари пофайловые, лениво); отслеживаем i18n.js —
// при обновлении переводов бампать ?v у i18n.js И у загрузчика словаря в index.html
var _FM_ASSETS = ['app.js', 'styles.css', 'marketplace.js', 'i18n.js'];
function _fmVerFromDom() {
    return _FM_ASSETS.map(function (f) {
        var el = document.querySelector('script[src*="' + f + '?v="], link[href*="' + f + '?v="]');
        var u = el ? (el.getAttribute('src') || el.getAttribute('href') || '') : '';
        var m = u.match(/\?v=([0-9a-zA-Z.]+)/);
        return f + ':' + (m ? m[1] : '');
    }).join('|');
}
function _fmVerFromHtml(html) {
    return _FM_ASSETS.map(function (f) {
        var m = (html || '').match(new RegExp(f.replace(/\./g, '\\.') + '\\?v=([0-9a-zA-Z.]+)'));
        return f + ':' + (m ? m[1] : '');
    }).join('|');
}
var _fmBaseVer = null, _fmPending = false;
function _fmTyping() {
    var a = document.activeElement; if (!a) return false;
    var t = (a.tagName || '').toLowerCase();
    return t === 'input' || t === 'textarea' || a.isContentEditable === true;
}
function _fmApply() {
    if (_fmTyping()) { _fmPending = true; return; }   // не прерываем набор — применим, когда освободится
    try {
        var now = Date.now();
        var t0 = +sessionStorage.getItem('fm_upd_t') || 0;
        var n = (now - t0 > 120000) ? 1 : (+sessionStorage.getItem('fm_upd_n') || 0) + 1;
        /* якорь окна — только на первой перезагрузке серии: иначе каждая подавленная
           попытка сдвигала окно вперёд и обновления отключались до конца сессии */
        if (n === 1) sessionStorage.setItem('fm_upd_t', now);
        sessionStorage.setItem('fm_upd_n', n);
        if (n > 3) return;   // защита от петли: не больше 3 перезагрузок за 2 минуты
    } catch (e) {}
    try { showToast('Обновляю до новой версии…', 'refresh'); } catch (e) {}
    // прячем устаревший вебвью (старый спарклайн/плашки статуса) за загрузчиком на время
    // перезагрузки: иначе при возврате в приложение ~0,7с мелькает прежний вид со старыми
    // данными (напр. жёлтая «Неактивен»), пока не подхватится новая версия
    try { showScreen('loading'); } catch (e) {}
    setTimeout(function () { try { location.reload(); } catch (e) {} }, 700);
}
async function _fmCheck() {
    if (_fmPending) { if (!_fmTyping()) _fmApply(); return; }
    try {
        var r = await fetch('/index.html?fmv=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) return;
        var cur = _fmVerFromHtml(await r.text());
        if (!/:[0-9]/.test(cur)) return;                 // на сервере версий не нашли — молчим
        if (_fmBaseVer && cur !== _fmBaseVer) _fmApply();
    } catch (e) {}
}
function startLiveUpdate() {
    _fmBaseVer = _fmVerFromDom();
    if (!/:[0-9]/.test(_fmBaseVer)) return;               // нет версий в теге — не включаем (без ложных перезагрузок)
    setInterval(_fmCheck, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) _fmCheck(); });
    window.addEventListener('focus', _fmCheck);
}

async function main() {
    setupEventListeners();
    initAutoLocalize();

    const tgReady = initTelegram();

    if (!tgReady) {
        showError('Открой Mini App через Telegram');
        return;
    }

    startLiveUpdate();
    initChannelsAutoRefresh();
    fmTrack('app_open');   // аналитика: вход в приложение
    // при возврате в приложение снимаем залипшие оверлеи/блокировку скролла — чтобы не нужен
    // был перезаход, если боковое меню/экран «застряли» после сворачивания
    document.addEventListener('visibilitychange', function () { if (!document.hidden) fmUnstick(); });
    window.addEventListener('focus', fmUnstick);
    await loadDashboard();
}


document.addEventListener('DOMContentLoaded', main);

// RTL-языки (арабский, персидский): направление текста в полях ввода — по содержимому,
// чтобы набор шёл справа налево; на вёрстку не влияет (dir=auto только для текста поля)
document.addEventListener('DOMContentLoaded', function () {
    try {
        document.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach(function (el) {
            if (!el.hasAttribute('dir')) el.setAttribute('dir', 'auto');
        });
    } catch (e) {}
});