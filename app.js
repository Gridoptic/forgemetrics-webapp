const API_BASE_URL = 'https://api.fmtr.click';

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
        media: null,
        mediaBusy: '',
        placeInfo: null,
        placed: null,
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

const FORGE_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="9.4" stroke="currentColor" stroke-width="1.25" opacity="0.4"/>'
    + '<path d="M13.7 4.6 7.9 13.5h3.7l-1 5.9 5.7-8.6h-3.7l1.1-6.2z" fill="currentColor"/></svg>';

function forgeIco(size) {
    return `<span class="forge-ico" style="width:${size || 14}px;height:${size || 14}px;">${FORGE_SVG}</span>`;
}

function forgeAmount(n, size) {
    const val = Number(n || 0).toLocaleString('ru-RU').replace(/ /g, ' ');
    return `<span class="forge-price">${forgeIco(size)}${val}</span>`;
}

const ANALYZE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M4 4v14a2 2 0 0 0 2 2h14"/><path d="M8 16v-5"/><path d="M12.5 16V8"/><path d="M17 16v-3"/>'
    + '<path d="M14.6 4.6l1.9 1.9 3.3-3.3" stroke-width="2"/></svg>';

const FORGE_SHEET_ITEMS = [
    { key: 'generate', one: 'премиум-пост', few: 'премиум-поста', many: 'премиум-постов',
      short: 'Премиум-пост', icon: 'sparkles' },
    { key: 'generate_std', one: 'стандартный пост', few: 'стандартных поста', many: 'стандартных постов',
      short: 'Стандартный пост', icon: 'file-text' },
    { key: 'generate_proofs', one: 'пост с исследованиями', few: 'поста с исследованиями', many: 'постов с исследованиями',
      short: 'Пост с исследованиями', icon: 'file-search' },
    { key: 'rewrite', one: 'рерайт чужого поста', few: 'рерайта чужого поста', many: 'рерайтов чужого поста',
      short: 'Рерайт чужого поста', icon: 'pencil' },
    { key: 'voice', one: 'настройка стиля канала', few: 'настройки стиля канала', many: 'настроек стиля канала',
      short: 'Настройка стиля канала', icon: 'wand' },
    { key: 'adpick', one: 'подбор каналов для рекламы', few: 'подбора каналов для рекламы', many: 'подборов каналов для рекламы',
      short: 'Подбор каналов для рекламы', icon: 'target-arrow' },
    { key: 'channel_analyze', one: 'AI-разбор канала', few: 'AI-разбора канала', many: 'AI-разборов канала',
      short: 'AI-разбор канала', svg: ANALYZE_SVG },
    { key: 'audit', one: 'AI-аудит канала', few: 'AI-аудита канала', many: 'AI-аудитов канала',
      short: 'AI-аудит канала', icon: 'chart-dots' },
    { key: 'deep_audit', one: 'коммерческий аудит', few: 'коммерческих аудита', many: 'коммерческих аудитов',
      short: 'Коммерческий аудит', icon: 'briefcase' },
    { key: 'competitors', one: 'анализ конкурентов', few: 'анализа конкурентов', many: 'анализов конкурентов',
      short: 'Анализ конкурентов', icon: 'search' },
    { key: 'promo_burst24', one: 'всплеск продвижения на сутки', few: 'всплеска продвижения на сутки', many: 'всплесков продвижения на сутки',
      short: 'Всплеск продвижения 24 ч', icon: 'bolt' },
    { key: 'promo_week', one: 'неделя продвижения в ленте', few: 'недели продвижения в ленте', many: 'недель продвижения в ленте',
      short: 'Неделя продвижения в ленте', icon: 'speakerphone' },
    { key: 'promo_month', one: 'месяц продвижения в ленте', few: 'месяца продвижения в ленте', many: 'месяцев продвижения в ленте',
      short: 'Месяц продвижения в ленте', icon: 'rocket' },
    { key: 'ai_strategy', one: 'AI-стратегия канала', few: 'AI-стратегии канала', many: 'AI-стратегий канала',
      short: 'AI-стратегия канала', icon: 'compass' },
];

let _fsCtx = null;

function closeForgeSheet() {
    if (!_fsCtx) return;
    const { overlay, sheet } = _fsCtx;
    overlay.classList.remove('visible');
    sheet.classList.remove('visible');
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); if (sheet.parentNode) sheet.remove(); }, 260);
    _fsCtx = null;
}

function openForgeSheet() {
    const f = window.__fmForgeData;
    if (!f) return;
    closeForgeSheet();
    hapticLight();

    const balance = Number(f.balance || 0);
    const priceOf = (k) => {
        const row = (f.prices || []).find((x) => x.key === k);
        return row ? Number(row.price || 0) : 0;
    };

    const rows = FORGE_SHEET_ITEMS.map((it) => {
        const price = priceOf(it.key);
        if (!price) return '';
        const count = Math.floor(balance / price);
        const n10 = count % 10, n100 = count % 100;
        const word = (n10 === 1 && n100 !== 11) ? it.one
            : ((n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) ? it.few : it.many);
        const body = count > 0
            ? `<b>${cabNum(count)}</b><span class="fs-nm">${escapeHtml(word)}</span>`
            : `<span class="fs-nm">${escapeHtml(it.short)}</span>` +
              `<span class="fs-pr">${forgeAmount(price, 12)}</span>`;
        return `<div class="fs-row${count > 0 ? '' : ' off'}">` +
            `<span class="fs-ico">${it.svg || `<i class="ti ti-${it.icon}"></i>`}</span>${body}</div>`;
    }).join('');

    const baseRate = (f.packs && f.packs.length)
        ? f.packs[0].price_rub / f.packs[0].amount : 0;
    const packs = (f.packs || []).map((p) => {
        const disc = baseRate
            ? Math.round((1 - (p.price_rub / p.amount) / baseRate) * 100) : 0;
        return `<button class="fw-pack" data-fspack="${p.amount}">` +
            `<span class="fw-pack-a">${forgeAmount(p.amount, 15)}</span>` +
            `<span class="fw-pack-p">${cabNum(p.price_rub)} ₽</span>` +
            (disc > 0 ? `<span class="fw-pack-d">−${disc}%</span>` : '') + `</button>`;
    }).join('');

    const grant = Number(f.grant || 0);
    const sub = grant > 0 ? `Начисляем ${cabNum(grant)} бесплатно каждый месяц` : '';

    const overlay = document.createElement('div');
    overlay.className = 'bs-overlay';
    const sheet = document.createElement('div');
    sheet.className = 'bs-sheet fs-sheet';
    sheet.innerHTML = `<div class="bs-handle"></div>
        <div class="fs-head">
          <div class="fs-bal">${forgeAmount(balance, 26)}</div>
          ${sub ? `<div class="fs-sub">${sub}</div>` : ''}
        </div>
        <div class="fs-sec">${t('Хватит на')}</div>
        <div class="fs-rows">${rows}</div>
        ${packs ? `<div class="fs-sec">Пополнить</div><div class="fw-packs">${packs}</div>` : ''}
        <button class="fs-more" id="fs-more">${t('История операций и все цены')} <i class="ti ti-chevron-right"></i></button>`;

    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => { overlay.classList.add('visible'); sheet.classList.add('visible'); });
    overlay.addEventListener('click', closeForgeSheet);
    _fsCtx = { overlay, sheet };

    sheet.querySelectorAll('[data-fspack]').forEach((btn) => btn.addEventListener('click', () => {
        const amount = parseInt(btn.getAttribute('data-fspack'), 10);
        const pack = (f.packs || []).find((x) => x.amount === amount);
        if (!pack) return;
        hapticMed();
        closeForgeSheet();
        openCheckout({
            name: `${amount.toLocaleString('ru-RU')} Forge`,
            price: pack.price_rub, sub: false, icon: 'bolt', color: 'am',
            rowLabel: `Пополнение баланса · ${amount.toLocaleString('ru-RU')} Forge`,
            pay: { product_type: 'package', product_key: `forge_${amount}`, months: 1 },
        });
    }));
    const more = sheet.querySelector('#fs-more');
    if (more) more.addEventListener('click', () => { closeForgeSheet(); openTariffs(); });
    localizeTree(sheet);
}

let _hsCtx = null;

function closeHelpSheet() {
    if (!_hsCtx) return;
    const { overlay, sheet } = _hsCtx;
    overlay.classList.remove('visible');
    sheet.classList.remove('visible');
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); if (sheet.parentNode) sheet.remove(); }, 260);
    _hsCtx = null;
}

const SUPPORT_EMAIL = 'support@fmtr.click';

function openHelpSheet() {
    closeHelpSheet();
    hapticLight();
    const overlay = document.createElement('div');
    overlay.className = 'bs-overlay';
    const sheet = document.createElement('div');
    sheet.className = 'bs-sheet fs-sheet';
    sheet.innerHTML = `<div class="bs-handle"></div>
        <div class="hs-title">${t('Справка и поддержка')}</div>
        <div class="hs-links">
            <button class="hs-link" id="hs-terms"><i class="ti ti-book-2"></i><span>${t('Метрики и термины')}</span><i class="ti ti-chevron-right ch"></i></button>
            <button class="hs-link" id="hs-rules"><i class="ti ti-scale"></i><span>${t('Правила и советы')}</span><i class="ti ti-chevron-right ch"></i></button>
            <button class="hs-link" id="hs-badges"><i class="ti ti-rosette-discount-check"></i><span>${t('Бейджи и статусы')}</span><i class="ti ti-chevron-right ch"></i></button>
        </div>
        <div class="fs-sec">Forge</div>
        <div class="hs-note">${t('Forge — внутренняя валюта функций. Списывается при запуске операции; если операция не удалась — возвращается автоматически. Все цены — в кабинете, раздел «Сколько стоят действия».')}</div>
        <div class="fs-sec">${t('Поддержка')}</div>
        <div class="hs-note">${t('Вопросы, проблемы и предложения — на почту')} <a class="hs-mail" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></div>
        <div class="hs-foot"><b>ForgeMetrics</b> · @ForgeMetricsBot</div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => { overlay.classList.add('visible'); sheet.classList.add('visible'); });
    overlay.addEventListener('click', closeHelpSheet);
    _hsCtx = { overlay, sheet };
    const go = (id, fn, bgId) => {
        const b = sheet.querySelector('#' + id);
        if (b) b.addEventListener('click', () => {
            hapticLight();
            closeHelpSheet();
            fn();
            const bg = document.getElementById(bgId);
            if (!bg || typeof MutationObserver === 'undefined') return;
            const obs = new MutationObserver(() => {
                if (!bg.classList.contains('fmx-show')) { obs.disconnect(); openHelpSheet(); }
            });
            obs.observe(bg, { attributes: true, attributeFilter: ['class'] });
        });
    };
    go('hs-terms', () => { if (window.__fmxOpenFaq) window.__fmxOpenFaq('terms'); }, 'fmx-faqBg');
    go('hs-rules', () => { if (window.__fmxOpenFaq) window.__fmxOpenFaq('rules'); }, 'fmx-faqBg');
    go('hs-badges', () => { if (window.__fmxOpenBadges) window.__fmxOpenBadges(); }, 'fmx-bgdBg');
    localizeTree(sheet);
}

function setForgeBalance(n) {
    window.__fmForge = Number(n || 0);
    const val = document.getElementById('forge-chip-val');
    const ico = document.getElementById('forge-chip-ico');
    if (ico && !ico.innerHTML) ico.innerHTML = FORGE_SVG;
    if (val) val.textContent = window.__fmForge.toLocaleString('ru-RU').replace(/ /g, ' ');
}

const els = {
    errorMessage: document.getElementById('error-message'),
    avatarLetter: document.getElementById('avatar-letter'),
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
    postPlanBtn: document.getElementById('post-plan-btn'),
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
    const isForm = (typeof FormData !== 'undefined') && (options.body instanceof FormData);
    const headers = {
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
    };

    if (state.initData) {
        headers['X-Telegram-Init-Data'] = state.initData;
    }
    try { if (typeof getLang === 'function') headers['X-Lang'] = getLang(); } catch (e) {}
    try { if (localStorage.getItem('fm_lang')) headers['X-Lang-Manual'] = '1'; } catch (e) {}

    const url = `${API_BASE_URL}${path}`;

    const _ctrl = new AbortController();
    const _to = setTimeout(() => _ctrl.abort(), options.timeoutMs || 60000);
    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: _ctrl.signal,
        });

        if (response.status === 423) {
            try { fmShowFrozen(); } catch (e) {}
            const frozenErr = new Error('API 423: account_frozen');
            frozenErr.status = 423;
            throw frozenErr;
        }
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
    } finally {
        clearTimeout(_to);
    }
}


let _frozenShown = false;
function fmShowFrozen() {
    if (_frozenShown) return;
    _frozenShown = true;
    const d = document.createElement('div');
    d.id = 'fmFrozen';
    d.style.cssText = 'position:fixed;inset:0;z-index:99990;background:#0d1017;display:flex;align-items:center;justify-content:center;padding:24px;';
    d.innerHTML = '<div style="max-width:340px;text-align:center;">'
        + '<div style="font-size:34px;margin-bottom:14px;">🔒</div>'
        + '<div style="font-size:17px;font-weight:700;color:#e8eaf6;margin-bottom:10px;">' + t('Доступ приостановлен') + '</div>'
        + '<div style="font-size:13.5px;line-height:1.55;color:#8990a8;">' + t('По платежу зафиксирован возврат средств. Доступ к приложению приостановлен до завершения проверки.') + '</div>'
        + '<div style="font-size:13px;margin-top:14px;"><a href="mailto:support@fmtr.click" style="color:#7aa2ff;">support@fmtr.click</a></div>'
        + '</div>';
    document.body.appendChild(d);
}


function showScreen(screenName) {
    Object.values(screens).forEach(s => {
        if (s) s.style.display = 'none';
    });
    if (screens[screenName]) {
        screens[screenName].style.display = '';
    }
    if (screenName === 'dashboard') _reachRedrawSoon();
}


function TR(s) { return (typeof window.t === 'function') ? window.t(s) : s; }


function showError(message) {
    const stale = /API 401/.test(String(message)) && /init data/i.test(String(message));
    els.errorMessage.textContent = stale
        ? t('Данные входа Telegram устарели или не прошли проверку. Закрой мини-приложение и открой его заново из Telegram.')
        : message;
    const btn = els.error ? els.error.querySelector('button') : null;
    if (btn) {
        const canClose = stale && window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.close === 'function';
        btn.textContent = canClose ? t('Закрыть и открыть заново') : t('Попробовать снова');
        btn.onclick = canClose ? function () { try { window.Telegram.WebApp.close(); } catch (e) { location.reload(); } } : function () { location.reload(); };
    }
    showScreen('error');
}


async function loadDashboard() {
    showScreen('loading');

    try {
        const data = await apiRequest('/api/v1/user/dashboard');
        try {
            if (window.applyServerLang && window.applyServerLang(data.lang)) { location.reload(); return; }
        } catch (e) {}
        state.dashboard = data;
        _dashSig = JSON.stringify(data);
        renderDashboard(data);
        showScreen('dashboard');
        maybeShowTermsGate(data);
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
        const sig = JSON.stringify(data);
        if (sig !== _dashSig) {
            _dashSig = sig;
            const sy = window.scrollY;
            renderDashboard(data);
            window.scrollTo(0, sy);
        } else {
            loadReachSeries();
        }
        if (window.FMLive) window.FMLive.touch('dashboard');
    } catch (e) {
    }
}


window.FMLive = (function () {
    const regs = {};
    let lastUX = 0;
    ['pointerdown', 'wheel', 'touchmove', 'keydown', 'scroll'].forEach((ev) => {
        window.addEventListener(ev, () => { lastUX = Date.now(); }, { passive: true, capture: true });
    });
    function idleMs() { return Date.now() - lastUX; }
    function editing() {
        const a = document.activeElement;
        return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable));
    }
    function blocked() {
        return document.hidden || editing() || idleMs() < 5000 ||
            !!document.querySelector('.bs-sheet.visible, .bs-overlay.visible, .pw-sheet-ov.show, .lang-ov.show, .drawer.open, .drawer.visible');
    }
    function tick(force) {
        if (blocked()) return;
        const now = Date.now();
        Object.keys(regs).forEach((k) => {
            const r = regs[k];
            if (now - r.last < (force ? 15000 : r.every)) return;
            try { if (r.fn() === true) r.last = now; } catch (e) {}
        });
    }
    setInterval(() => tick(false), 30000);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) setTimeout(() => tick(true), 400);
    });
    return {
        register(name, every, fn) { regs[name] = { every, last: Date.now(), fn }; },
        touch(name) { if (regs[name]) regs[name].last = Date.now(); },
        idleMs: idleMs
    };
})();

function _dashVisible() {
    const s = screens.dashboard;
    return !!(s && s.style.display !== 'none' && s.offsetParent !== null);
}
window.FMLive.register('dashboard', 90000, function () {
    if (!_dashVisible()) return false;
    refreshDashboardSilent();
    return true;
});


function openModuleSafe(file, fnName, label) {
    // модуль мог не доехать до устройства (кэш Telegram, обрыв связи) — тогда кнопка
    // молчала без единого слова; догружаем на лету и говорим, если не вышло
    if (typeof window[fnName] === 'function') { window[fnName](); return; }
    const _t = (typeof t === 'function') ? t : (x) => x;
    showToast(_t('Загружаю модуль') + ': ' + _t(label), 'loader');
    const s = document.createElement('script');
    s.src = file + '?v=' + Date.now();
    s.onload = () => {
        if (typeof window[fnName] === 'function') window[fnName]();
        else showToast(_t('Модуль не запустился — закрой и открой приложение'), 'alert-triangle');
    };
    s.onerror = () => showToast(_t('Модуль не загрузился — проверь связь и открой заново'), 'alert-triangle');
    document.head.appendChild(s);
}

function showStartBotScreen() {
    els.errorMessage.innerHTML = `
        <div style="margin-bottom: 16px; line-height: 1.6;">
            ${t('Сначала запусти бота — он покажет возможности. За подключение живого канала начислится стартовый запас 300 Forge.')}
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
    setForgeBalance(data.forge_balance);
    if (data.forge) window.__fmForgeData = data.forge;

    try { window.__fmIsMod = !!data.is_moderator; window.__fmIsOwner = !!data.is_owner; } catch (e) {}

    renderChannelSelector(data);
    renderPulse(data.pulse);
    renderActions(data.actions || []);
    window._homeCfg = data.home_config || null;

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
    const csig = JSON.stringify([ch && ch.id, ch && ch.title, ch && ch.username, ch && ch.is_paused, ch && ch.has_avatar,
        data.pulse && data.pulse.niche, data.total_channels]);
    if (csig === _chselSig && host.firstChild) return;
    _chselSig = csig;
    if (ch) {
        const title = ch.title || ch.username || 'Канал';
        const initial = escapeHtml((title || 'K').trim().charAt(0).toUpperCase() || 'K');
        const niche = (data.pulse && data.pulse.niche) ? data.pulse.niche : '';
        const multi = (data.total_channels || 1) > 1;
        const idn = `${ch.username ? '@' + escapeHtml(ch.username) : ''}${niche ? (ch.username ? ' · ' : '') + escapeHtml(niche) : ''}`;
        const sub = idn || (multi ? 'нажми, чтобы сменить канал' : 'нажми для управления');
        const _tt = (typeof window.t === 'function') ? window.t : function (x) { return x; };
        const chBadge = ch.is_paused
            ? '<span class="pw-badge paused"><i class="ti ti-player-pause"></i>' + _tt('пауза') + '</span>'
            : '<span class="pw-badge">' + _tt('активный') + '</span>';
        host.innerHTML = `<button class="pw-chansel" id="pw-chansel-btn"><div class="pw-chav" id="pw-chav-el">${initial}</div><div class="pw-chinfo"><div class="pw-chn"><span class="pw-chn-t">${escapeHtml(title)}</span>${chBadge}</div><div class="pw-chnb">${sub}</div></div><div class="pw-chchev"><i class="ti ti-chevron-down"></i></div></button>`;
        const btn = document.getElementById('pw-chansel-btn');
        if (btn) btn.addEventListener('click', () => { hapticLight(); openActiveChannelSelector({ onChanged: async () => { await loadDashboard(); } }); });
        const avEl = document.getElementById('pw-chav-el');
        if (avEl && ch.id) loadBottomSheetAvatar(ch.id, avEl);
    } else {
        host.innerHTML = `<button class="pw-chansel" id="pw-chansel-btn"><div class="pw-chav"><i class="ti ti-plus"></i></div><div class="pw-chinfo"><div class="pw-chn">${t('Подключить канал')}</div><div class="pw-chnb">${t('Метрики, публикация и оффер на Площадке')}</div></div><div class="pw-chchev"><i class="ti ti-chevron-right"></i></div></button>`;
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
        const from = parseFloat(el.dataset.from) || 0;
        if (reduce || from === to) { el.textContent = pwFmt(to, el); return; }
        const dur = from ? 550 : 900;
        let t0 = null;
        function step(t) { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / dur); el.textContent = pwFmt(from + (to - from) * (1 - Math.pow(1 - p, 3)), el); if (p < 1) requestAnimationFrame(step); }
        requestAnimationFrame(step);
    });
}
var PW_CATALOG = [
    { id: 'subs', label: 'Подписчики', sub: '', get: p => p.subscribers, o: { sep: true } },
    { id: 'reach', label: 'Охват / пост', sub: 'за 30 дней', get: p => p.avg_views, o: { k: true } },
    { id: 'rr', label: 'ERR', sub: '', get: p => p.reach_rate, o: { suf: '%' } },
    { id: 'err24', label: 'ERR24', sub: 'за первые сутки', get: p => p.err24, o: { suf: '%', dec: 1 } },
    { id: 'er', label: 'ER', sub: 'реакции к охвату', get: p => p.engagement_percent, o: { suf: '%', dec: 1 } },
    { id: 'price', label: 'Цена поста', sub: '', get: p => p.price_low, o: {} },
    { id: 'cpm', label: 'CPM', sub: 'за 1000 просмотров', get: p => p.cpm, o: { sep: true, suf: ' ₽' } },
    { id: 'cpf', label: 'CPF', sub: 'при конверсии 0,3–1,5%', get: p => p.cpf_low, o: {} },
];
var PW_MAX = 8;

function pwRub(n) { return Math.round(n).toLocaleString('ru-RU'); }
function pwRangeTx(lo, hi) {
    if (lo == null) return null;
    return (hi != null && hi > lo) ? pwRub(lo) + '–' + pwRub(hi) + ' ₽' : pwRub(lo) + ' ₽';
}
var PW_LS = 'fm_pulse_metrics_v3';

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
    var order = ['subs', 'reach', 'rr', 'err24', 'er', 'price'];
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

var pwCpfHintOpen = false;
var pwPriceOpen = false;

var PW_FMT_META = {
    h1_24: ['1/24', '1 ч в топе · 24 ч в ленте'],
    h2_48: ['2/48', '2 ч в топе · 48 ч в ленте'],
    h3_72: ['3/72', '3 ч в топе · 72 ч в ленте'],
    d7: ['7 дней', '3 ч в топе · 7 дней в ленте'],
    perm: ['Без удаления', 'остаётся 30 дней или навсегда'],
    native: ['Нативный', 'автор пишет сам по ТЗ'],
    repost: ['Репост', 'пересылка вашего поста'],
    circle: ['Кружок', 'видеосообщение внутри поста'],
    stories: ['Сторис', 'формат сторис канала'],
};

function pwPricePanel(pulse) {
    var _tp = (typeof window.t === 'function') ? window.t : function (x) { return x; };
    var hasOwn = pulse.formats.some(f => f.price != null);
    var PW_PST = { market: [_tp('в рынке'), '#5DCAA5'], above: [_tp('выше рынка'), '#f5bf4f'],
                   below: [_tp('ниже рынка'), '#f5bf4f'], out: [_tp('вне рынка'), '#ef8080'] };
    var rows = pulse.formats.map(f => {
        var meta = PW_FMT_META[f.k];
        if (!meta) return '';
        var right;
        if (f.price != null) {
            var st = PW_PST[f.st];
            var tail = '';
            if (st) {
                var pctTx = (f.st === 'above' || f.st === 'below')
                    ? ' ' + (f.pct > 0 ? '+' : '−') + Math.abs(f.pct) + '%' : '';
                tail = ' · <i style="color:' + st[1] + ';">' + escapeHtml(st[0] + pctTx) + '</i>';
            }
            right = '<b>' + escapeHtml(pwRub(f.price) + ' ₽') + '</b><em>' +
                escapeHtml(_tp('оценка') + ' ' + pwRub(f.est) + ' ₽') + tail + '</em>';
        } else {
            right = '<b>' + escapeHtml('≈' + pwRub(f.est) + ' ₽') + '</b><em>' +
                escapeHtml(_tp('оценка')) + '</em>';
        }
        return '<div class="pw-fr"><span class="ft"><b>' + escapeHtml(_tp(meta[0])) + '</b>' +
            '<em>' + escapeHtml(_tp(meta[1])) + '</em></span>' +
            '<span class="fp">' + right + '</span></div>';
    }).join('');
    var foot = hasOwn
        ? _tp('Оценка — расчёт по замерам канала и рынку его ниши, обновляется сама. Твои цены — из оффера на Бирже, там же они меняются.')
        : _tp('Это расчётные ориентиры по рынку ниши. Назначить свои цены — создай оффер на Бирже.');
    return '<div class="pw-hintbox big' + (pwPriceOpen ? ' open' : '') + '" id="pw-price-box"><div class="in">' +
        rows + '<div class="pw-pfoot">' + escapeHtml(foot) + '</div></div></div>';
}

function pwRenderMetrics(pulse) {
    var grid = document.getElementById('pw-mgrid');
    if (!grid) return;
    var ids = pwSelectedIds(pulse);
    var _dch = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : null;
    var _dorm = pwDormantGet(_dch);
    var hideReach = _dorm && !(_dorm.d != null && _dorm.d <= 30);
    grid.innerHTML = ids.map(id => {
        var m = PW_CATALOG.find(x => x.id === id);
        if (!m) return '';
        var v = m.get(pulse);
        if (hideReach && (id === 'reach' || id === 'rr' || id === 'err24')) v = null;
        var vcls = '';
        var sub = m.sub ? `<span class="s">${escapeHtml(m.sub)}</span>` : '';
        if (id === 'subs' && pulse.subs_join_today != null) {
            sub = `<span class="s"><span class="up">+${pulse.subs_join_today}</span> · <span class="dn">−${pulse.subs_left_today || 0}</span> ${t('сегодня')}</span>`;
        }
        if (id === 'rr' && v != null) {
            var st = pulse.rr_status;
            if (st && st !== 'норма') {
                var warn = st === 'выше нормы';
                sub = `<span class="pw-rpill ${warn ? 'warn' : 'bad'}">${escapeHtml(st)}</span>`;
                vcls = warn ? ' warn' : ' bad';
            }
        }
        if (id === 'price' && v != null) {
            var _tp = (typeof window.t === 'function') ? window.t : function (x) { return x; };
            if (pulse.price_kind === 'estimate') {
                var pill = '';
                if (pulse.own_price) {
                    var PW_PST = { market: [_tp('в рынке'), ''], above: [_tp('выше рынка'), 'warn'],
                                   below: [_tp('ниже рынка'), 'warn'], out: [_tp('вне рынка'), 'bad'] };
                    var _ps = PW_PST[pulse.own_status];
                    if (_ps) {
                        var _pctTx = (pulse.own_status === 'above' || pulse.own_status === 'below')
                            ? ' ' + (pulse.own_pct > 0 ? '+' : '−') + Math.abs(pulse.own_pct) + '%' : '';
                        pill = `<span class="pw-rpill ${_ps[1] || 'ok'}">${escapeHtml(_ps[0] + _pctTx)}</span>`;
                    }
                    sub = pill + `<span class="s fx">1/24</span>`;
                } else {
                    sub = `<span class="pw-rpill mut">${escapeHtml(_tp('цена не задана'))}</span>`;
                }
            } else {
                sub = `<span class="s">${escapeHtml(_tp('твоя цена') + ' · 1/24')}</span>`;
            }
        }
        var o = m.o;
        var valTx;
        if (v == null) {
            valTx = '—';
        } else if (id === 'price') {
            valTx = escapeHtml(pulse.price_kind === 'owner'
                ? 'от ' + pwRub(pulse.price_low) + ' ₽'
                : (pwRangeTx(pulse.price_low, pulse.price_high) || '—'));
        } else if (id === 'cpf') {
            if (pulse.cpf_fact != null) {
                valTx = escapeHtml('≈' + pwRub(pulse.cpf_fact) + ' ₽');
                sub = '<span class="s" style="color:#5DCAA5;">' + t('по замерам сделок') + '</span>';
            } else if (pulse.cpf_low != null && pulse.cpf_high != null) {
                valTx = escapeHtml('≈' + pwRub(Math.sqrt(pulse.cpf_low * pulse.cpf_high)) + ' ₽');
                var _tpR = (typeof window.t === 'function') ? window.t : function (x) { return x; };
                sub = '<span class="s">' + escapeHtml(_tpR('разброс') + ' ' +
                    pwRub(pulse.cpf_low) + '–' + pwRub(pulse.cpf_high) + ' ₽') + '</span>';
            } else {
                valTx = '—';
            }
        } else {
            var _mp = _pwNumPrev[id + ':' + _dch];
            _pwNumPrev[id + ':' + _dch] = v;
            valTx = `<span class="pw-num" data-to="${v}"${_mp != null ? ` data-from="${_mp}"` : ''}${o.sep ? ' data-sep="1"' : ''}${o.k ? ' data-k="1"' : ''}${o.suf ? ` data-suf="${o.suf}"` : ''}${o.dec ? ` data-dec="${o.dec}"` : ''}>0</span>`;
        }
        var _pfm = (id === 'price' && pulse.price_kind === 'estimate' &&
                    pulse.formats && pulse.formats.length) ? pulse.formats : null;
        var nameTx = escapeHtml(m.label) +
            (id === 'cpf' ? ` <span id="pw-cpf-i" class="pw-hintq${pwCpfHintOpen ? ' on' : ''}">?</span>` : '') +
            (_pfm ? ` <i class="ti ti-chevron-down pw-pch${pwPriceOpen ? ' up' : ''}"></i>` : '');
        var rowTx = `<div class="pw-r${_pfm ? ' pw-tap' : ''}${id === 'cpf' ? ' pw-nline' : ''}"${_pfm ? ' id="pw-price-row"' : ''}><span class="n">${nameTx}</span><span class="rv">${sub}<span class="v${vcls}">${valTx}</span></span></div>`;
        if (_pfm) rowTx += pwPricePanel(pulse);
        if (id === 'cpf') {
            var _th = (typeof window.t === 'function') ? window.t : function (x) { return x; };
            rowTx += `<div class="pw-hintbox${pwCpfHintOpen ? ' open' : ''}" id="pw-cpf-hint"><div class="in">` +
                escapeHtml(_th('Точный CPF считается по замерам сделок: при размещении рекламы подключай ссылку отслеживания — подписки атрибутируются автоматически.')) +
                `</div></div>`;
        }
        return rowTx;
    }).join('');
    pwCountUp(grid);
    var cpfI = document.getElementById('pw-cpf-i');
    if (cpfI) cpfI.onclick = () => {
        hapticLight();
        pwCpfHintOpen = !pwCpfHintOpen;
        cpfI.classList.toggle('on', pwCpfHintOpen);
        var hb = document.getElementById('pw-cpf-hint');
        if (hb) hb.classList.toggle('open', pwCpfHintOpen);
    };
    var prow = document.getElementById('pw-price-row');
    if (prow) prow.onclick = () => {
        hapticLight();
        pwPriceOpen = !pwPriceOpen;
        var bx = document.getElementById('pw-price-box');
        if (bx) bx.classList.toggle('open', pwPriceOpen);
        var ch = prow.querySelector('.pw-pch');
        if (ch) ch.classList.toggle('up', pwPriceOpen);
    };
    var gear = document.getElementById('pw-mgear');
    if (gear) gear.onclick = (e) => { e.stopPropagation(); hapticLight(); pwOpenPicker(pulse); };
    pwRenderMini(pulse);
    pwApplyCollapse(false);
    var mh = document.getElementById('pw-mhead');
    if (mh) mh.onclick = (e) => {
        if (e.target.closest && e.target.closest('#pw-mgear')) return;
        hapticLight();
        var chId = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : 0;
        var key = 'fm_pw_mclps_' + chId;
        var clps = false;
        try { clps = localStorage.getItem(key) === '1'; } catch (er) {}
        try { localStorage.setItem(key, clps ? '0' : '1'); } catch (er) {}
        pwApplyCollapse(true);
    };
}

function pwMSecCollapsed() {
    var chId = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : 0;
    try { return localStorage.getItem('fm_pw_mclps_' + chId) === '1'; } catch (e) { return false; }
}

function pwApplyCollapse(animate) {
    var wrap = document.getElementById('pw-mwrap');
    var mini = document.getElementById('pw-mmini');
    var chev = document.getElementById('pw-mchev');
    if (!wrap) return;
    var clps = pwMSecCollapsed();
    if (chev) chev.classList.toggle('up', !clps);
    if (mini) mini.hidden = !clps;
    if (!animate) {
        wrap.style.transition = 'none';
        wrap.style.maxHeight = clps ? '0px' : 'none';
        wrap.style.opacity = clps ? '0' : '1';
        requestAnimationFrame(() => { wrap.style.transition = ''; });
        return;
    }
    if (clps) {
        wrap.style.maxHeight = wrap.scrollHeight + 'px';
        wrap.getBoundingClientRect();
        wrap.style.maxHeight = '0px';
        wrap.style.opacity = '0';
    } else {
        wrap.style.maxHeight = wrap.scrollHeight + 'px';
        wrap.style.opacity = '1';
        setTimeout(() => { if (!pwMSecCollapsed()) wrap.style.maxHeight = 'none'; }, 320);
    }
}

function pwRenderMini(pulse) {
    var mini = document.getElementById('pw-mmini');
    if (!mini || !pulse) return;
    var _tm = (typeof window.t === 'function') ? window.t : (x) => x;
    var _mdch = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : null;
    var _mdorm = pwDormantGet(_mdch);
    var _mhide = _mdorm && !(_mdorm.d != null && _mdorm.d <= 30);
    var chips = [];
    if (!_mhide && pulse.reach_rate != null) {
        var rst = pulse.rr_status || '';
        var col = rst === 'норма' ? '#5DCAA5' : (rst === 'выше нормы' ? '#f5bf4f' : (rst ? '#ef8080' : '#e8eaf1'));
        chips.push('<span class="chip"><b class="num" style="color:' + col + ';">' + pulse.reach_rate + '%</b>' +
            '<span>ERR</span></span>');
    }
    if (pulse.cpm != null) {
        chips.push('<span class="chip"><b class="num">' + pwRub(pulse.cpm) + ' \u20bd</b><span>CPM</span></span>');
    }
    if (pulse.cpf_fact != null) {
        chips.push('<span class="chip"><b class="num">\u2248' + pwRub(pulse.cpf_fact) + ' \u20bd</b><span>CPF</span></span>');
    } else if (pulse.cpf_low != null && pulse.cpf_high != null) {
        chips.push('<span class="chip"><b class="num">\u2248' + pwRub(Math.sqrt(pulse.cpf_low * pulse.cpf_high)) + ' \u20bd</b><span>CPF</span></span>');
    }
    if (!chips.length && pulse.subscribers != null) {
        chips.push('<span class="chip"><b class="num">' + pulse.subscribers.toLocaleString('ru-RU') + '</b><span>' + escapeHtml(_tm('Подписчики')) + '</span></span>');
    }
    mini.innerHTML = chips.join('');
}

function pwOpenPicker(pulse) {
    var sel = new Set(pwSelectedIds(pulse));
    var ov = document.createElement('div');
    ov.className = 'pw-sheet-ov';
    ov.innerHTML = '<div class="pw-sheet" role="dialog" aria-label="Показатели канала">'
        + '<div class="pw-sheet-grip"></div>'
        + '<div class="pw-sheet-h">' + t('Показатели канала') + '</div>'
        + '<div class="pw-sheet-sub">' + t('Выбери до') + ' ' + PW_MAX + ' ' + t('показателей для главной') + '</div>'
        + '<div class="pw-sheet-list">'
        + PW_CATALOG.map(m => {
            var v = m.get(pulse), has = v != null, on = sel.has(m.id);
            var prev = '';
            if (has) {
                if (m.id === 'price') prev = pwRangeTx(pulse.price_low, pulse.price_high) || '';
                else if (m.id === 'cpf') prev = pwRangeTx(pulse.cpf_low, pulse.cpf_high) || '';
                else prev = pwPreview(v, m.o);
            }
            return '<button class="pw-opt' + (on ? ' on' : '') + (has ? '' : ' nodata') + '" data-id="' + m.id + '" type="button">'
                + '<span class="pw-opt-tx"><span class="pw-opt-l">' + escapeHtml(m.label) + '</span>'
                + '<span class="pw-opt-v">' + (has ? escapeHtml(prev) : 'нет данных') + '</span></span>'
                + '<span class="pw-opt-ck"><i class="ti ti-check"></i></span></button>';
        }).join('')
        + '</div>'
        + '<button class="pw-sheet-done" id="pw-sheet-done" type="button">' + t('Готово') + '</button>'
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
        pwRenderMetrics((state.dashboard && state.dashboard.pulse) || pulse);
    });
}

function pwHealthState(pulse) {
    const H = { green: { c: 'green', t: 'Живой канал', s: '' }, amber: { c: 'amber', t: 'Средний охват', s: '' }, red: { c: 'red', t: 'Слабый охват', s: 'проверь канал' } };
    let h = H[pulse.health_class] || { c: 'grey', t: 'Метрики собираются', s: '' };
    if (pulse.rr_status === 'аномальный') h = { c: 'amber', t: 'Охват выше базы', s: 'репосты или накрутка — проверь' };
    return h;
}

function pwNormDelta(pulse, cls) {
    if (cls === 'grey' || !pulse) return '';
    const lo = pulse.norm_lo, av = pulse.avg_views;
    if (!Number.isFinite(lo) || lo <= 0 || !Number.isFinite(av)) return '';
    let d = (av - lo) / lo * 100;
    if (pulse.rr_status === 'норма' && d < 0) d = 0;
    d = Math.max(-99, Math.min(999, d));
    const abs = Math.abs(d);
    const rounded = abs < 10 ? Math.round(abs * 10) / 10 : Math.round(abs);
    const sign = rounded === 0 ? '' : (d < 0 ? '\u2212' : '+');
    const tt = (typeof window.t === 'function') ? window.t('к норме') : 'к норме';
    return '<span class="pw-hdelta">' + sign + String(rounded).replace('.', ',') + '%<small>' + tt + '</small></span>';
}

function pwHealthHtml(pulse, h) {
    return '<span class="pw-hsq"></span><span class="pw-htx">' + h.t +
        (h.s ? ' <span class="pw-hs">· ' + h.s + '</span>' : '') + '</span>' +
        pwNormDelta(pulse, h.c);
}

function markPulseHealthy(pulse) {
    const badge = document.querySelector('.pw-health');
    if (!badge || !pulse) return;
    const h = pwHealthState(pulse);
    badge.className = 'pw-health ' + h.c;
    badge.innerHTML = pwHealthHtml(pulse, h);
    const lab = document.querySelector('.pw-hlab');
    if (lab) lab.textContent = 'Охват · 30 дней';
}

function renderPulse(pulse) {
    const host = document.getElementById('pulse-widget');
    if (!host) return;
    if (!pulse) { host.innerHTML = ''; _pwSig = null; return; }
    const chKey = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : 0;
    const psig = chKey + '|' + JSON.stringify(pulse);
    if (psig === _pwSig && host.querySelector('.pw-pulse')) { loadReachSeries(); return; }
    _pwSig = psig;
    _reachSigDom = null;
    const h = pwHealthState(pulse);
    const _hPrev = _pwNumPrev['hero:' + chKey];
    if (pulse.avg_views != null) _pwNumPrev['hero:' + chKey] = pulse.avg_views;
    const heroNum = (pulse.avg_views != null)
        ? `<span class="v pw-num" data-to="${pulse.avg_views}"${_hPrev != null ? ` data-from="${_hPrev}"` : ''} data-sep="1">0</span>`
        : '<span class="v">—</span>';
    host.innerHTML = `<div class="pw-pulse">
      <div class="pw-prow">
        <span class="pw-health ${h.c}">${pwHealthHtml(pulse, h)}</span>
        <span class="pw-plink" id="pw-analyze">${t('Разбор')} <i class="ti ti-chevron-right"></i></span>
      </div>
      <div class="pw-hlab">${t('Охват · 30 дней')}</div>
      <div class="pw-hbig pw-was">
        <span class="pw-wcell" id="pw-was-cell" hidden></span>
        <span class="pw-warr" id="pw-was-arr" hidden></span>
        <span class="pw-wcell now" id="pw-now-cell">${heroNum}<span class="pw-wl">${t('сейчас · на пост')}</span></span>
      </div>
      <div class="pw-chart" id="pw-chart"></div>
      <div class="pw-msec">
        <div class="pw-mhead" id="pw-mhead"><span class="pw-mtitle">${t('Показатели канала')}</span><button class="pw-mgear" id="pw-mgear" type="button" aria-label="Настроить показатели"><i class="ti ti-settings"></i></button><span class="pw-mchev" id="pw-mchev"><i class="ti ti-chevron-down"></i></span></div>
        <div class="pw-mmini" id="pw-mmini" hidden></div>
        <div class="pw-mwrap" id="pw-mwrap"><div class="pw-mrows" id="pw-mgrid"></div></div>
      </div>
      <div id="pw-aihook"></div>
    </div>`;
    pwCountUp(host);
    pwRenderMetrics(pulse);
    host.onclick = (e) => {
        const dd = e.target.closest ? e.target.closest('.pw-hdelta') : null;
        if (!dd) return;
        hapticLight();
        const pl = (state.dashboard && state.dashboard.pulse) || {};
        if (!pl.norm_lo || !pl.norm_hi) return;
        const _tt = (typeof window.t === 'function') ? window.t : (x) => x;
        showToast(_tt('Отклонение охвата от нижней планки нормы. Норма для канала этого размера') +
            ': ' + pl.norm_lo.toLocaleString('ru-RU') + '\u2013' + pl.norm_hi.toLocaleString('ru-RU') + ' ' + _tt('на пост'), 'info-circle');
    };
    const an = document.getElementById('pw-analyze');
    if (an) an.addEventListener('click', () => { hapticLight(); if (typeof window.__openAudit === 'function') window.__openAudit(); else cabToast('Разбор канала — скоро'); });
    try {
        var _dch = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : null;
        var _dorm = pwDormantGet(_dch);
        if (_dorm) {
            markPulseStale(_dorm.d, _dorm.ld);
            var _lab2 = host.querySelector('.pw-hlab');
            if (_lab2) _lab2.textContent = 'Охват · последние посты';
        }
    } catch (e) {}
    loadReachSeries();
}

function renderPulseHook(trendPct, planMeasured, planActive) {
    const hook = document.getElementById('pw-aihook');
    if (!hook) return;
    if (trendPct == null || trendPct >= 0 || planActive) { hook.innerHTML = ''; return; }
    const chId = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : 0;
    const calibrated = (planMeasured || 0) >= 3;
    const hideKey = 'fm_pulsehook_' + chId + '_' + (calibrated ? 'c' : 'd');
    try { if ((+localStorage.getItem(hideKey) || 0) > Date.now()) { hook.innerHTML = ''; return; } } catch (e) {}
    const drop = Math.abs(trendPct);
    const tx = calibrated
        ? `${t('Калибровка завершена: замеры недели собраны. Новая неделя соберётся с их учётом.')}`
        : `${t('Охват снизился на')} <b>${drop}%</b> ${t('за 30 дней. Собери неделю постов по замерам канала.')}`;
    hook.innerHTML = `<div class="pw-aihook">`
        + `<span class="pw-aih-ic"><i class="ti ti-calendar"></i></span>`
        + `<div class="pw-aih-tx">${tx}</div>`
        + `<div class="pw-aih-col">`
        + `<button class="pw-aih-x" type="button" aria-label="Скрыть"><i class="ti ti-x"></i></button>`
        + `<button class="pw-aih-go" type="button">${calibrated ? 'К сборке' : 'Собрать'} <i class="ti ti-arrow-right"></i></button>`
        + `</div></div>`;
    const go = hook.querySelector('.pw-aih-go');
    if (go) go.addEventListener('click', () => {
        hapticLight();
        try { localStorage.setItem(hideKey, String(Date.now() + 7 * 86400000)); } catch (e) {}
        hook.innerHTML = '';
        handleAction('content_plan');
    });
    const x = hook.querySelector('.pw-aih-x');
    if (x) x.addEventListener('click', () => {
        hapticLight();
        try { localStorage.setItem(hideKey, String(Date.now() + 7 * 86400000)); } catch (e) {}
        hook.innerHTML = '';
    });
}

function pwRenderMM(r) {
    const wasCell = document.getElementById('pw-was-cell');
    const arr = document.getElementById('pw-was-arr');
    const nowCell = document.getElementById('pw-now-cell');
    if (!wasCell || !arr || !nowCell) return;
    const _tm = (typeof window.t === 'function') ? window.t : (x) => x;
    const hasPrev = typeof r.mm_prev === 'number' && r.mm_prev > 0;
    const hasCur = typeof r.mm_cur === 'number';
    if (r.stale || (!hasPrev && !hasCur)) {
        wasCell.hidden = true; arr.hidden = true;
        var pu = state.dashboard && state.dashboard.pulse;
        if (pu && pu.avg_views != null) nowCell.innerHTML = '<span class="v num">' + pu.avg_views.toLocaleString('ru-RU') + '</span>' +
            '<span class="pw-wl">' + _tm('сейчас') + ' \u00b7 ' + _tm('на пост') + '</span>';
        return;
    }
    wasCell.hidden = false;
    arr.hidden = false;
    if (hasPrev) {
        wasCell.innerHTML = '<span class="pw-wn was num">' + r.mm_prev.toLocaleString('ru-RU') + '</span>' +
            '<span class="pw-wl num">' + (r.mm_prev_ym || '') + ' \u00b7 ' + _tm('медиана') + '</span>';
    } else {
        wasCell.innerHTML = '<span class="pw-wn none">' + _tm('нет замера') + '</span>' +
            '<span class="pw-wl num">' + (r.mm_prev_ym || '') + '</span>';
    }
    if (hasPrev && hasCur) {
        const pct = r.mm_pct || 0;
        const up = pct >= 0;
        arr.className = 'pw-warr' + (pct === 0 ? '' : (up ? ' up' : ' dn'));
        arr.innerHTML = '<i>\u2192</i><small class="num">' + (pct === 0 ? '0%' : (up ? '+' : '\u2212') + Math.abs(pct) + '%') + '</small>';
    } else if (!hasPrev) {
        arr.className = 'pw-warr na';
        arr.innerHTML = '<span class="dash"><span></span><span></span><span></span><i>\u203a</i></span><small>\u2014</small>';
    } else {
        arr.className = 'pw-warr';
        arr.innerHTML = '<i>\u2192</i><small class="num">0%</small>';
    }
    if (hasCur) {
        nowCell.innerHTML = '<span class="v num">' + r.mm_cur.toLocaleString('ru-RU') + '</span>' +
            '<span class="pw-wl num">' + (r.mm_cur_ym || '') + ' \u00b7 ' + _tm('на пост') + '</span>';
    } else {
        nowCell.innerHTML = '<span class="pw-wn none">' +
            _tm(r.mm_cur_fresh ? 'охват набирается' : 'пока нет постов') + '</span>' +
            '<span class="pw-wl num">' + (r.mm_cur_ym || '') + '</span>';
    }
}

function pwNoData(host, on) {
    const box = host && host.closest ? host.closest('.pw-pulse') : null;
    if (box) box.classList.toggle('pw-nodata', !!on);
}

async function loadReachSeries() {
    const host = document.getElementById('pw-chart');
    if (!host) return;
    const ep = ++_reachEpoch;
    /* без ряда прятать шапку графика: пустая область на пол-экрана бесполезна */
    try {
        const r = await apiRequest('/api/v1/user/reach-series');
        if (ep !== _reachEpoch) return;
        const chIdD = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : null;
        const rSig = chIdD + '|' + JSON.stringify(r);
        if (rSig === _reachSigDom) { _reachRedraw(); return; }
        _reachSigDom = rSig;
        if (r && Array.isArray(r.series) && r.series.length >= 2 && r.series.every((v) => Number.isFinite(v))) {
            const endLabel = r.stale ? (r.last_date || '') : 'сегодня';
            const anim = !_reachLast || _reachLast.chId !== chIdD;
            _reachLast = { chId: chIdD,
                           series: r.series, dates: r.dates || [], days: r.days || 30, endLabel: endLabel, muted: !!r.stale,
                           fresh: Array.isArray(r.fresh) ? r.fresh : [], freshDates: r.fresh_dates || [],
                           freshLeft: r.fresh_left_h || [],
                           normLo: r.norm_lo || null, normHi: r.norm_hi || null };
            pwNoData(host, false);
            drawReachChart(host, _reachLast.series, _reachLast.dates, _reachLast.days, _reachLast.endLabel, _reachLast.muted, _reachLast.fresh, _reachLast.freshDates, _reachLast.freshLeft, _reachLast.normLo, _reachLast.normHi, anim);
            setTimeout(_reachRedraw, 300);
            pwRenderMM(r);
            if (r.stale) {
                const lab = document.querySelector('.pw-hlab');
                if (lab) lab.textContent = 'Охват · последние посты';
                markPulseStale(r.stale_days, r.last_date);
                pwDormantSet(chIdD, { d: r.stale_days, ld: r.last_date });
                pwRenderMetrics((state.dashboard && state.dashboard.pulse) || {});
                renderPulseHook(null);
            } else {
                var wasDorm = !!pwDormantGet(chIdD);
                pwDormantSet(chIdD, null);
                markPulseHealthy(state.dashboard && state.dashboard.pulse);
                if (wasDorm) pwRenderMetrics((state.dashboard && state.dashboard.pulse) || {});
                renderPulseHook(r.trend_pct, r.plan_measured, !!r.plan_active);
            }
        } else {
            _reachLast = null;
            pwNoData(host, true);
            host.innerHTML = '<div class="pw-empty">' + t('Динамика охвата накапливается — данные появятся позже') + '</div>';
            pwRenderMM(r || {});
            renderPulseHook(null);
            if (r && r.stale === false) {
                pwDormantSet(chIdD, null);
                markPulseHealthy(state.dashboard && state.dashboard.pulse);
                pwRenderMetrics((state.dashboard && state.dashboard.pulse) || {});
            } else if (r && r.stale === true) {
                markPulseStale(r.stale_days, r.last_date);
                pwDormantSet(chIdD, { d: r.stale_days, ld: r.last_date });
                pwRenderMetrics((state.dashboard && state.dashboard.pulse) || {});
            }
        }
    } catch (e) {
        if (ep !== _reachEpoch) return;
        _reachLast = null;
        _reachSigDom = null;
        host.innerHTML = '<div class="pw-empty">' + t('Не удалось загрузить динамику') + '</div>';
        pwRenderMM({});
        renderPulseHook(null);
    }
}

function markPulseStale(days, lastDate) {
    const badge = document.querySelector('.pw-health');
    if (!badge) return;
    const word = (days != null && days > 60) ? 'Неактивен' : 'Редкая активность';
    const sub = lastDate ? ('последний пост ' + lastDate) : ((days != null ? days : '') + ' дн без постов');
    badge.className = 'pw-health dormant';
    badge.innerHTML = '<span class="pw-moon"><i class="ti ti-moon"></i></span><span class="pw-htx">' + word + (sub ? ' <span class="pw-hs">' + sub + '</span>' : '') + '</span>';
}

var _reachLast = null, _reachRedrawT = null, _reachEpoch = 0, _reachSigDom = null;
var _dashSig = null, _pwSig = null, _chselSig = null, _actSig = null, _pwNumPrev = {};
function _reachRedraw() {
    try {
        var host = document.getElementById('pw-chart');
        var curCh = (state.dashboard && state.dashboard.channel) ? state.dashboard.channel.id : null;
        if (!host || !_reachLast || _reachLast.chId !== curCh || !host.clientWidth) return;
        var svgEl = host.querySelector('svg');
        if (svgEl && Math.abs(host.clientWidth - (+svgEl.getAttribute('width') || 0)) <= 8) return;
        drawReachChart(host, _reachLast.series, _reachLast.dates, _reachLast.days, _reachLast.endLabel, _reachLast.muted, _reachLast.fresh, _reachLast.freshDates, _reachLast.freshLeft, _reachLast.normLo, _reachLast.normHi, false);
    } catch (e) {}
}
function _reachRedrawSoon() { clearTimeout(_reachRedrawT); _reachRedrawT = setTimeout(_reachRedraw, 180); }
window.addEventListener('resize', _reachRedrawSoon);
try { if (tg && tg.onEvent) tg.onEvent('viewportChanged', _reachRedrawSoon); } catch (e) {}

function drawReachChart(host, DATA, dates, days, endLabel, muted, FR, FRD, FRL, normLo, normHi, animate) {
    if (!Array.isArray(DATA) || DATA.length < 2) { host.innerHTML = ''; return; }
    FR = Array.isArray(FR) ? FR.filter(Number.isFinite) : [];
    FRD = Array.isArray(FRD) ? FRD : [];
    FRL = Array.isArray(FRL) ? FRL : [];
    const hasNorm = Number.isFinite(normLo) && Number.isFinite(normHi) && normHi > normLo;
    const PC = muted
        ? { area: 'rgba(107,112,136,0.08)', ln: '#6b7088', ep: '#e2e4ee', eps: '#8990a8' }
        : { area: 'rgba(93,202,165,0.10)', ln: '#5DCAA5', ep: '#eafff6', eps: '#5DCAA5' };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = Math.max(260, host.clientWidth || 320), Hh = 84, padT = 10, padB = 18, padL = 6, padR = 6;
    const ALL = DATA.concat(FR);
    const SCALED = hasNorm ? ALL.concat([normLo, normHi]) : ALL;
    const min = Math.min.apply(null, SCALED), max = Math.max.apply(null, SCALED);
    const spread = max - min;
    const lo = spread ? min - spread * 0.15 : min - Math.max(1, min * 0.15);
    const hi = spread ? max + spread * 0.12 : max + Math.max(1, max * 0.12);
    const rng = (hi - lo) || 1, last = DATA.length - 1;
    const lastIdx = last + FR.length;
    const X = (i) => padL + i * (W - padL - padR) / (lastIdx || 1);
    const Y = (v) => padT + (1 - (v - lo) / rng) * (Hh - padT - padB);
    const pts = DATA.map((v, i) => [X(i), Y(v)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const area = line + ' L' + X(last).toFixed(1) + ',' + (Hh - padB) + ' L' + X(0).toFixed(1) + ',' + (Hh - padB) + ' Z';
    const short = (v) => v >= 1000 ? ((Math.round(v / 100) / 10 + '').replace('.', ',') + 'К') : String(Math.round(v));
    const grids = (() => {
        const raw = (hi - lo) / 3;
        if (!(raw > 0)) return [max, min];
        const pow = Math.pow(10, Math.floor(Math.log10(raw)));
        let step = pow * 10;
        for (const m of [1, 2, 2.5, 5, 10]) { if (raw <= m * pow) { step = m * pow; break; } }
        const out = [];
        for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { const rv = Math.round(v); if (rv > 0 && out.indexOf(rv) < 0) out.push(rv); }
        return out.length ? out.slice(-3) : [Math.round(max)];
    })();
    let svg = `<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}">`;
    const normTop = hasNorm ? Y(normHi) : null, normBot = hasNorm ? Y(normLo) : null;
    const normLblY = hasNorm ? ((normBot - normTop >= 16) ? (normTop + normBot) / 2 + 3 : normTop - 4) : null;
    const gKeep = {};
    grids.forEach((v) => {
        const lb = short(v);
        const err = Math.abs(v - (v >= 1000 ? Math.round(v / 100) * 100 : v));
        if (!(lb in gKeep) || err < gKeep[lb].err) gKeep[lb] = { v: v, err: err };
    });
    const epY = Y(DATA[last]);
    grids.forEach((v) => {
        const yv = Y(v);
        const y = yv.toFixed(1);
        svg += `<line class="pw-gl" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
        const lb = short(v);
        if (gKeep[lb].v !== v) return;
        if (hasNorm && Math.abs((yv - 3) - normLblY) < 11) return;
        if (!FR.length && Math.abs(yv - epY) < 9) return;
        svg += `<text class="pw-gt" x="${W - padR}" y="${(yv - 3).toFixed(1)}" text-anchor="end">${lb}</text>`;
    });
    if (hasNorm) {
        const nc = muted ? 'rgba(141,147,168,' : 'rgba(93,202,165,';
        svg += `<rect x="${padL}" y="${normTop.toFixed(1)}" width="${W - padL - padR}" height="${Math.max(1, normBot - normTop).toFixed(1)}" fill="${nc}0.06)"/>`;
        svg += `<line x1="${padL}" y1="${normTop.toFixed(1)}" x2="${W - padR}" y2="${normTop.toFixed(1)}" stroke="${nc}0.35)" stroke-width="1" stroke-dasharray="4 4"/>`;
        svg += `<line x1="${padL}" y1="${normBot.toFixed(1)}" x2="${W - padR}" y2="${normBot.toFixed(1)}" stroke="${nc}0.35)" stroke-width="1" stroke-dasharray="4 4"/>`;
        const nl = (typeof window.t === 'function' ? window.t('норма') : 'норма').toUpperCase();
        svg += `<text x="${W - padR}" y="${normLblY.toFixed(1)}" text-anchor="end" style="font-size:8px;font-weight:700;letter-spacing:0.06em;fill:${nc}0.9)">${nl} ${short(normLo)}–${short(normHi)}</text>`;
    }
    svg += `<path class="pw-area" d="${area}" fill="${PC.area}"/>`;
    svg += `<path class="pw-cl" d="${line}" fill="none" stroke="${PC.ln}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (FR.length) {
        let fd = 'M' + X(last).toFixed(1) + ',' + Y(DATA[last]).toFixed(1);
        FR.forEach((v, j) => { fd += ' L' + X(last + 1 + j).toFixed(1) + ',' + Y(v).toFixed(1); });
        svg += `<path d="${fd}" fill="none" stroke="${PC.eps}" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round" opacity="0.5"/>`;
        FR.forEach((v, j) => {
            svg += `<circle cx="${X(last + 1 + j).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3" fill="none" stroke="${PC.eps}" stroke-width="1.8" opacity="0.75"/>`;
        });
    }
    svg += `<circle class="pw-ep" cx="${X(last).toFixed(1)}" cy="${Y(DATA[last]).toFixed(1)}" r="3.4" fill="${PC.ep}" stroke="${PC.eps}" stroke-width="2"/>`;
    const lbl0 = (dates && dates[0]) ? dates[0] : (days + ' дн назад');
    svg += `<text class="pw-xt" x="${X(0)}" y="${Hh - 5}" text-anchor="start">${lbl0}</text>`;
    svg += `<text class="pw-xt" x="${X(lastIdx)}" y="${Hh - 5}" text-anchor="end">${endLabel || 'сегодня'}</text>`;
    svg += `<line class="pw-cx" x1="0" y1="${padT}" x2="0" y2="${Hh - padB}" style="opacity:0"/>`;
    svg += `<circle class="pw-cd" r="4.3" style="opacity:0"/></svg>`;
    host.innerHTML = svg + '<div class="pw-tip"></div>';

    const cl = host.querySelector('.pw-cl'), ar = host.querySelector('.pw-area');
    if (!reduce && animate !== false && cl.getTotalLength) { const L = cl.getTotalLength(); cl.style.strokeDasharray = L; cl.style.strokeDashoffset = L; cl.getBoundingClientRect(); cl.style.transition = 'stroke-dashoffset 1.25s cubic-bezier(.3,.7,.3,1)'; if (ar) { ar.style.opacity = 0; ar.style.transition = 'opacity .85s ease-out .3s'; } requestAnimationFrame(() => { cl.style.strokeDashoffset = 0; if (ar) ar.style.opacity = 1; }); }

    const tip = host.querySelector('.pw-tip'), cx = host.querySelector('.pw-cx'), cd = host.querySelector('.pw-cd'), ep = host.querySelector('.pw-ep');
    function at(clientX) {
        const r = host.getBoundingClientRect(); if (!r.width) return; const sx = (clientX - r.left) * (W / r.width);
        let i = Math.round((sx - padL) / ((W - padL - padR) / (lastIdx || 1))); i = Math.max(0, Math.min(lastIdx, i));
        const isFresh = i > last;
        const val = isFresh ? FR[i - last - 1] : DATA[i];
        const x = X(i), y = Y(val); cx.setAttribute('x1', x); cx.setAttribute('x2', x); cx.style.opacity = 1;
        cd.setAttribute('cx', x); cd.setAttribute('cy', y); cd.style.opacity = 1; ep.style.opacity = 0;
        const dlab = isFresh
            ? (FRD[i - last - 1] || '')
            : ((dates && dates[i]) ? dates[i] : ((last - i) + ' дн назад'));
        let freshTx = '';
        if (isFresh) {
            const lh = FRL[i - last - 1];
            freshTx = ' · набирает' + (lh ? (lh >= 24 ? ', в линии через ' + Math.ceil(lh / 24) + ' дн' : ', в линии через ' + lh + ' ч') : '');
        }
        tip.innerHTML = `<div class="d">${dlab}</div>${val.toLocaleString('ru-RU')} охват${freshTx}`;
        tip.style.opacity = 1;
        const pxX = x / W * r.width, pxY = y / Hh * r.height;
        const half = tip.offsetWidth / 2 + 4;
        tip.style.left = Math.max(half, Math.min(r.width - half, pxX)) + 'px';
        tip.style.top = pxY + 'px';
        tip.style.transform = 'translate(-50%,-128%)';
    }
    function off() { cx.style.opacity = 0; cd.style.opacity = 0; ep.style.opacity = 1; tip.style.opacity = 0; }
    host.onpointermove = (e) => at(e.clientX);
    host.onpointerdown = (e) => at(e.clientX);
    host.onpointerleave = off;
    host.onpointerup = off;
    host.onpointercancel = off;
}




function renderActions(actions) {
    var _asig = JSON.stringify(actions || []);
    if (_asig === _actSig && els.actionsList.firstChild) return;
    _actSig = _asig;
    els.actionsList.innerHTML = '';

    actions.forEach(action => {
        const card = document.createElement('button');
        card.className = 'action-card';
        card.dataset.action = action.id;

        const iconColor = (action.color && action.color !== 'primary') ? action.color : 'purple';
        const colorClass = `icon-${iconColor}`;
        const subtitleClass = '';
        const iconInner = action.icon === 'forge-bolt'
            ? FORGE_SVG
            : `<i class="ti ti-${action.icon}"></i>`;

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

let _hcCtx = null;
let _hcDragMoved = false;

function closeHomeConfig() {
    if (!_hcCtx) return;
    const { overlay, sheet } = _hcCtx;
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
    overlay.classList.remove('visible');
    sheet.classList.remove('visible');
    setTimeout(() => { overlay.remove(); sheet.remove(); }, 260);
    _hcCtx = null;
}

function openHomeConfig() {
    hapticLight();
    const cfg = window._homeCfg;
    if (!cfg || !cfg.catalog || !cfg.catalog.length) return;
    closeHomeConfig();
    const enabled = (cfg.enabled || []).slice();
    const byId = {};
    cfg.catalog.forEach(c => { byId[c.id] = c; });
    const order = enabled.filter(id => byId[id])
        .concat(cfg.catalog.map(c => c.id).filter(id => enabled.indexOf(id) < 0));
    const overlay = document.createElement('div');
    overlay.className = 'bs-overlay';
    const sheet = document.createElement('div');
    sheet.className = 'bs-sheet hc-sheet';
    const rowsHtml = order.map(id => {
        const c = byId[id];
        const on = enabled.indexOf(id) >= 0;
        return `<div class="hc-row${on ? '' : ' off'}" data-id="${c.id}">
            <span class="hc-grip"><i class="ti ti-grip-vertical"></i></span>
            <span class="hc-ic icon-${c.color === 'primary' ? 'purple' : c.color}">${c.icon === 'forge-bolt' ? FORGE_SVG : `<i class="ti ti-${c.icon}"></i>`}</span>
            <span class="hc-t">${escapeHtml(c.title)}</span>
            <span class="hc-sw${on ? ' on' : ''}"></span>
        </div>`;
    }).join('');
    sheet.innerHTML = `
        <div class="bs-handle"></div>
        <div class="hc-title">${t('Главный экран')}</div>
        <div class="hc-hint">${t('Включай нужные функции и расставляй в своём порядке — перетаскивай за ручку.')}</div>
        <div class="hc-list" id="hc-list">${rowsHtml}</div>
        <button class="co-pay" id="hc-save"><i class="ti ti-check"></i> ${t('Сохранить')}</button>
        <button class="co-close" id="hc-reset">${t('Вернуть стандартный набор')}</button>
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => { overlay.classList.add('visible'); sheet.classList.add('visible'); });
    _hcCtx = { overlay, sheet };
    overlay.addEventListener('click', closeHomeConfig);
    const list = sheet.querySelector('#hc-list');
    list.addEventListener('click', (e) => {
        if (e.target.closest('.hc-grip') || _hcDragMoved) return;
        const row = e.target.closest('.hc-row');
        if (!row) return;
        hapticLight();
        row.classList.toggle('off');
        const sw = row.querySelector('.hc-sw');
        if (sw) sw.classList.toggle('on', !row.classList.contains('off'));
    });
    bindHcDrag(list);
    sheet.querySelector('#hc-save').addEventListener('click', () => { hcSave(false); });
    sheet.querySelector('#hc-reset').addEventListener('click', () => { hcSave(true); });
}

function bindHcDrag(list) {
    let drag = null;
    let pressTimer = null;
    let startX = 0, startY = 0;
    let pendingRow = null, pendingPt = null;

    function snapshot() {
        const m = new Map();
        list.querySelectorAll('.hc-row').forEach(r => m.set(r, r.getBoundingClientRect().top));
        return m;
    }
    function flip(prev) {
        list.querySelectorAll('.hc-row').forEach(r => {
            const was = prev.get(r);
            if (was == null) return;
            const dy = was - r.getBoundingClientRect().top;
            if (!dy) return;
            r.style.transition = 'none';
            r.style.transform = `translateY(${dy}px)`;
            requestAnimationFrame(() => {
                r.style.transition = 'transform 180ms ease';
                r.style.transform = '';
            });
        });
    }
    function activate(row, pt) {
        _hcDragMoved = true;
        const rect = row.getBoundingClientRect();
        const ghost = row.cloneNode(true);
        ghost.classList.add('hc-ghost');
        ghost.style.width = rect.width + 'px';
        ghost.style.left = rect.left + 'px';
        ghost.style.top = rect.top + 'px';
        document.body.appendChild(ghost);
        row.classList.add('hc-hole');
        drag = { row, ghost, dy: pt.clientY - rect.top };
        try { list.setPointerCapture(pt.pointerId); } catch (er) {}
        hapticLight();
    }
    list.addEventListener('pointerdown', (e) => {
        const row = e.target.closest('.hc-row');
        if (!row) return;
        startX = e.clientX; startY = e.clientY;
        _hcDragMoved = false;
        if (e.target.closest('.hc-grip')) {
            e.preventDefault();
            activate(row, e);
            return;
        }
        pendingRow = row;
        pendingPt = { clientY: e.clientY, pointerId: e.pointerId };
        pressTimer = setTimeout(() => {
            pressTimer = null;
            if (pendingRow) activate(pendingRow, pendingPt);
            pendingRow = null;
        }, 240);
    });
    list.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });
    list.addEventListener('pointermove', (e) => {
        if (!drag) {
            if (pressTimer && (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8)) {
                clearTimeout(pressTimer); pressTimer = null; pendingRow = null;
            }
            return;
        }
        e.preventDefault();
        drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
        const midY = e.clientY - drag.dy + drag.ghost.offsetHeight / 2;
        const others = Array.from(list.querySelectorAll('.hc-row:not(.hc-hole)'));
        const before = others.find(r => { const rr = r.getBoundingClientRect(); return midY < rr.top + rr.height / 2; });
        const needMove = before ? (before !== drag.row.nextElementSibling && before !== drag.row) : (list.lastElementChild !== drag.row);
        if (needMove) {
            const prev = snapshot();
            if (before) list.insertBefore(drag.row, before); else list.appendChild(drag.row);
            flip(prev);
        }
        const sheet = list.closest('.hc-sheet');
        if (sheet) {
            const sr = sheet.getBoundingClientRect();
            if (e.clientY < sr.top + 56) sheet.scrollTop -= 9;
            else if (e.clientY > sr.bottom - 56) sheet.scrollTop += 9;
        }
    });
    const end = () => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        pendingRow = null;
        if (!drag) { setTimeout(() => { _hcDragMoved = false; }, 0); return; }
        const d = drag; drag = null;
        const rect = d.row.getBoundingClientRect();
        d.ghost.style.transition = 'top 160ms ease, left 160ms ease, transform 160ms ease';
        d.ghost.style.top = rect.top + 'px';
        d.ghost.style.left = rect.left + 'px';
        d.ghost.style.transform = 'scale(1)';
        setTimeout(() => {
            try { d.ghost.remove(); } catch (er) {}
            d.row.classList.remove('hc-hole');
        }, 170);
        hapticLight();
        setTimeout(() => { _hcDragMoved = false; }, 0);
    };
    list.addEventListener('pointerup', end);
    list.addEventListener('pointercancel', end);
}

async function hcSave(reset) {
    if (!_hcCtx) return;
    const body = reset ? { reset: true } : {
        actions: Array.from(_hcCtx.sheet.querySelectorAll('.hc-row[data-id]:not(.off)')).map(r => r.dataset.id),
    };
    try {
        const r = await apiRequest('/api/v1/user/home-actions', { method: 'POST', body: JSON.stringify(body) });
        if (r && r.ok) {
            showToast(t('Сохранено'), 'check');
            closeHomeConfig();
            loadDashboard();
            return;
        }
    } catch (e) {}
    showToast(t('Не удалось сохранить. Повтори попытку'), 'alert-triangle');
}


let _tmCtx = null;
const TM_ROLES = {
    owner: { nm: 'Владелец', ic: 'crown', cls: 'tm-r-owner' },
    trustee: { nm: 'Доверенный', ic: 'key', cls: 'tm-r-trustee', d: 'Как Управляющий, плюс удаляет оффер и раздаёт роли админам. Не меняет владельца, себя и других доверенных.' },
    manager: { nm: 'Управляющий', ic: 'shield-check', cls: 'tm-r-manager', d: 'Редактирует, публикует, замораживает, ведёт календарь. Не удаляет оффер и не меняет команду.' },
    editor: { nm: 'Редактор', ic: 'pencil', cls: 'tm-r-editor', d: 'Меняет оформление, тексты и календарь. Не публикует, не замораживает, не удаляет.' },
    viewer: { nm: 'Наблюдатель', ic: 'eye', cls: 'tm-r-viewer', d: 'Видит оффер, метрики и сделки. Ничего не меняет.' },
    none: { nm: 'Нет доступа', ic: 'x', cls: 'tm-r-none', d: 'Полностью закрыть доступ к офферу этому админу.' },
};
const TM_ACTS = [
    { k: 'view', t: 'Метрики и статистика', ic: 'chart-bar', lock: 'base' },
    { k: 'edit', t: 'Редактировать оффер и календарь', ic: 'pencil' },
    { k: 'pub', t: 'Публиковать · замораживать', ic: 'rocket' },
    { k: 'links', t: 'Ссылки отслеживания и кампании', ic: 'link' },
    { k: 'content', t: 'Контент-план канала', ic: 'calendar' },
    { k: 'strategy', t: 'AI-стратегия канала', ic: 'target-arrow' },
    { k: 'del', t: 'Удалить оффер', ic: 'trash' },
    { k: 'team', t: 'Управлять командой', ic: 'users', lock: 'owner' },
];

function closeTeam() {
    if (!_tmCtx) return;
    const { overlay, sheet } = _tmCtx;
    overlay.classList.remove('visible'); sheet.classList.remove('visible');
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
    setTimeout(() => { overlay.remove(); sheet.remove(); }, 220);
    _tmCtx = null;
}

function _tmSheet(html) {
    closeTeam();
    const overlay = document.createElement('div');
    overlay.className = 'bs-overlay';
    const sheet = document.createElement('div');
    sheet.className = 'bs-sheet tm-sheet';
    sheet.innerHTML = `<div class="bs-handle"></div>` + html;
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => { overlay.classList.add('visible'); sheet.classList.add('visible'); });
    overlay.addEventListener('click', closeTeam);
    _tmCtx = { overlay, sheet };
    localizeTree(sheet);
    return sheet;
}

function _tmAbs(u) {
    return u && u.charAt(0) === '/' ? API_BASE_URL + u : u;
}

function _tmAv(av, name, cls) {
    const letter = escapeHtml((name || '?').trim().charAt(0).toUpperCase() || '?');
    const img = av ? `<img src="${escapeHtml(_tmAbs(av))}" alt="" onerror="this.remove()">` : '';
    return `<span class="tm-av${cls ? ' ' + cls : ''}">${letter}${img}</span>`;
}

let _tmMulti = false;
let _tmChsCache = null;
function _tmFill(html) {
    if (_tmCtx && _tmCtx.sheet && document.body.contains(_tmCtx.sheet)) {
        _tmCtx.sheet.innerHTML = `<div class="bs-handle"></div>` + html;
        localizeTree(_tmCtx.sheet);
        return _tmCtx.sheet;
    }
    return _tmSheet(html);
}
function _tmLoadingHtml() {
    return `<div class="tm-title"><span class="tm-tile"><i class="ti ti-users"></i></span>
        <div><h3>${t('Команда канала')}</h3><div class="tm-sub">${t('Роли и права админов на оффер')}</div></div></div>
        <div style="padding:36px 0 28px;text-align:center;color:#565b73;"><i class="ti ti-loader-2" style="font-size:22px;display:inline-block;animation:spin .9s linear infinite;"></i></div>`;
}
function _tmRenderList(chs) {
    const rows = chs.map(c => {
        const role = TM_ROLES[c.my_role] || TM_ROLES.viewer;
        return `<div class="tm-mem tm-pick" data-tmch="${c.id}">${_tmAv(c.avatar_url, c.title)}
            <div class="tm-col"><div class="tm-nm">${escapeHtml(c.title || '')}</div>
            <div class="tm-tg">@${escapeHtml(c.username || '')} · <i class="ti ti-users" style="font-size:10px;"></i> ${c.members}</div></div>
            <span class="tm-chip ${role.cls}"><i class="ti ti-${role.ic}"></i> ${role.nm}</span>
            <i class="ti ti-chevron-right tm-chev"></i></div>`;
    }).join('');
    const sheet = _tmFill(`<div class="tm-title"><span class="tm-tile"><i class="ti ti-users"></i></span>
        <div><h3>${t('Команда канала')}</h3><div class="tm-sub">${t('Роли и права — отдельно для каждого канала')}</div></div></div>
        <div class="tm-list">${rows}</div>`);
    sheet.querySelectorAll('[data-tmch]').forEach(el => {
        el.addEventListener('click', () => { hapticLight(); openTeamChannel(+el.dataset.tmch); });
    });
}
async function openTeam(fromBack) {
    hapticLight();
    if (fromBack && _tmChsCache && _tmChsCache.length > 1) { _tmRenderList(_tmChsCache); return; }
    _tmFill(_tmLoadingHtml());
    let r = null;
    try { r = await apiRequest('/api/v1/team/overview'); } catch (e) {}
    const chs = (r && r.channels) || [];
    if (!chs.length) { closeTeam(); cabToast('Сначала подключи канал — роли настраиваются для подключённых каналов'); return; }
    _tmChsCache = chs;
    _tmMulti = chs.length > 1;
    if (chs.length === 1) { openTeamChannel(chs[0].id); return; }
    _tmRenderList(chs);
}

async function openTeamChannel(chId) {
    _tmFill(_tmLoadingHtml());
    let d = null;
    try { d = await apiRequest('/api/v1/team/' + chId + '?sync=1'); } catch (e) {}
    if (!d || !d.ok) { closeTeam(); cabToast('Не удалось загрузить команду канала'); return; }
    if (d.my_role === 'owner' || d.my_role === 'trustee') _tmOwnerView(d); else _tmMemberView(d);
}

function _tmHead(d) {
    const c = d.channel;
    return `<div class="tm-title">${_tmMulti ? '<button class="tm-back" id="tm-back"><i class="ti ti-arrow-left"></i></button>' : ''}<span class="tm-tile"><i class="ti ti-users"></i></span>
        <div><h3>${t('Команда канала')}</h3><div class="tm-sub">${t('Кто и что может делать с оффером на Площадке')}</div></div></div>
        <div class="tm-hero">${_tmAv(c.avatar_url, c.title, 'tm-av-hero')}
        <div class="tm-col"><div class="tm-nm">${escapeHtml(c.title || '')}</div>
        <div class="tm-tg">@${escapeHtml(c.username || '')}</div>
        <div class="tm-hst${c.connected ? '' : ' warn'}"><span class="dot"></span> <span>${c.connected ? 'подключён · бот — администратор' : 'бот не администратор — список может быть неполным'}</span></div></div></div>`;
}

function _tmOwnerView(d) {
    const members = d.members || [];
    const memRows = members.map(m => {
        const role = TM_ROLES[m.role] || TM_ROLES.none;
        const tgLab = m.tg_status === 'creator' ? 'Создатель канала'
            : (m.tg_status === 'administrator' ? 'Администратор' : 'Владелец в приложении');
        if (m.is_owner) {
            const inApp = m.in_app === false ? ' · <span>' + t('ещё не заходил в приложение') + '</span>' : '';
            return `<div class="tm-mem">${_tmAv(m.avatar_url, m.name, 'tm-av-own tm-avr-owner')}
                <div class="tm-col"><div class="tm-nm">${escapeHtml(m.name || '')}</div>
                <div class="tm-tg"><i class="ti ti-brand-telegram"></i> <span>${tgLab}</span>${inApp}</div></div>
                <span class="tm-chip tm-r-owner"><i class="ti ti-crown"></i> ${t('Владелец')}</span></div>`;
        }
        return `<div class="tm-mem tm-pick" data-tmu="${m.user_id}">${_tmAv(m.avatar_url, m.name, 'tm-avr-' + (m.role || 'none'))}
            <div class="tm-col"><div class="tm-nm">${escapeHtml(m.name || '')}</div>
            <div class="tm-tg"><i class="ti ti-brand-telegram"></i> <span>${m.tg_status === 'creator' ? 'Создатель канала' : 'Администратор'}</span></div></div>
            <span class="tm-chip ${role.cls}" id="tm-role-${m.user_id}"><i class="ti ti-${role.ic}"></i> ${role.nm}</span>
            <i class="ti ti-chevron-down tm-chev"></i></div>
            <div class="tm-rolepick" id="tm-pick-${m.user_id}" style="display:none;"></div>`;
    }).join('');
    const sheet = _tmFill(`${_tmHead(d)}
        <div class="tm-info">
        <div class="row"><span class="ic"><i class="ti ti-shield-check"></i></span><p>${t('Список админов и права сверяются с Telegram автоматически: если человека сняли с администраторов канала — доступ в приложении пропадёт сам.')}</p></div>
        <div class="row"><span class="ic"><i class="ti ti-key"></i></span><p>${t('Каждый админ сразу — Управляющий. Удаление оффера и роли — только у создателя канала.')}</p></div></div>
        <div class="tm-sect"><span>${t('Участники')}</span><span class="num"> · ${members.length}</span></div>
        <div class="tm-list" id="tm-mems">${memRows}</div>
        <div class="tm-sect">${t('Что может каждая роль')}</div>
        <div class="tm-mtog" id="tm-mtog"><span class="ic"><i class="ti ti-adjustments-horizontal"></i></span>
            <div class="t"><b>${t('Настроить права вручную')}</b><span>${t('галочками по каждой роли · пресеты — быстрый старт')}</span></div>
            <span class="tm-sw${d.custom ? ' on' : ''}"></span></div>
        <div class="tm-matrix" id="tm-matrix"></div>
        <div class="tm-mhint" id="tm-mhint" style="display:none;">${t('Нажми на галочку, чтобы дать или снять право у роли. Замочки — фиксированные права владельца и доверенного.')}</div>
        <div class="tm-savebar" id="tm-save" style="display:none;">
            <button class="tm-btn" id="tm-reset">${t('Сбросить к пресетам')}</button>
            <button class="tm-btn tm-primary" id="tm-apply">${t('Сохранить права')}</button></div>
        <button class="tm-refresh" id="tm-refresh"><i class="ti ti-refresh"></i> ${t('Обновить из Telegram')}</button>`);

    const chId = d.channel.id;
    const isOwner = d.my_role === 'owner';
    const myId = tg?.initDataUnsafe?.user?.id;
    members.filter(m => !m.is_owner).forEach(m => {
        const row = sheet.querySelector(`[data-tmu="${m.user_id}"]`);
        if (!row) return;
        if (!isOwner && (m.role === 'trustee' || m.user_id === myId)) {
            const chev = row.querySelector('.tm-chev');
            if (chev) chev.remove();
            row.classList.remove('tm-pick');
            return;
        }
        row.addEventListener('click', () => _tmTogglePick(sheet, chId, m, isOwner));
    });

    let matrix = JSON.parse(JSON.stringify(d.matrix || {}));
    let editMode = false;
    const drawMatrix = () => {
        const cols = [['owner', 'Влад.'], ['trustee', 'Дов.'], ['manager', 'Упр.'], ['editor', 'Ред.'], ['viewer', 'Набл.']];
        const ownerP = { view: true, edit: true, pub: true, links: true, del: true, team: true, content: true, strategy: true };
        let h = '<div class="tm-mxhead"><div class="a">' + t('Действие') + '</div>' +
            cols.map(c => `<div class="tm-mxh h-${c[0]}"><span class="d"></span>${c[1]}</div>`).join('') + '</div>';
        TM_ACTS.forEach(a => {
            h += `<div class="tm-mxrow"><div class="tm-mxact"><span class="ic"><i class="ti ti-${a.ic}"></i></span><span>${a.t}</span></div>`;
            cols.forEach(c => {
                const role = c[0];
                const on = role === 'owner' ? ownerP[a.k] : !!(matrix[role] && matrix[role][a.k]);
                const locked = role === 'owner' || a.lock === 'base' || a.lock === 'owner';
                if (editMode) {
                    h += `<div class="tm-mxc"><span class="tm-cbx${on ? ' on' : ''}${locked ? ' lock' : ''}${locked && role === 'trustee' ? ' b' : ''}" data-r="${role}" data-a="${a.k}">${on ? '<i class="ti ti-check"></i>' : ''}</span></div>`;
                } else {
                    h += `<div class="tm-mxc ${on ? 'y-' + role : 'tm-no'}">${on ? '✓' : '—'}</div>`;
                }
            });
            h += '</div>';
        });
        const box = sheet.querySelector('#tm-matrix');
        box.innerHTML = h;
        if (editMode) {
            box.querySelectorAll('.tm-cbx:not(.lock)').forEach(cb => {
                cb.addEventListener('click', () => {
                    const role = cb.dataset.r, act = cb.dataset.a;
                    if (!matrix[role]) matrix[role] = {};
                    matrix[role][act] = !matrix[role][act];
                    hapticLight();
                    drawMatrix();
                });
            });
        }
    };
    drawMatrix();

    const mtog = sheet.querySelector('#tm-mtog');
    if (!isOwner) mtog.style.display = 'none';
    mtog.addEventListener('click', () => {
        if (!isOwner) return;
        editMode = !editMode;
        mtog.querySelector('.tm-sw').classList.toggle('on', editMode || d.custom);
        sheet.querySelector('#tm-mhint').style.display = editMode ? 'block' : 'none';
        sheet.querySelector('#tm-save').style.display = editMode ? 'flex' : 'none';
        drawMatrix();
    });
    sheet.querySelector('#tm-apply').addEventListener('click', async () => {
        const perms = {};
        ['trustee', 'manager', 'editor', 'viewer'].forEach(r => {
            perms[r] = { edit: !!(matrix[r] && matrix[r].edit), pub: !!(matrix[r] && matrix[r].pub), links: !!(matrix[r] && matrix[r].links), del: !!(matrix[r] && matrix[r].del) };
        });
        try {
            const rr = await apiRequest('/api/v1/team/' + chId + '/perms', { method: 'POST', body: JSON.stringify({ perms }) });
            if (rr && rr.ok) { showToast(t('Права сохранены'), 'check'); openTeamChannel(chId); return; }
        } catch (e) {}
        showToast(t('Не удалось сохранить права'), 'alert-triangle');
    });
    sheet.querySelector('#tm-reset').addEventListener('click', async () => {
        try {
            const rr = await apiRequest('/api/v1/team/' + chId + '/perms', { method: 'POST', body: JSON.stringify({ reset: true }) });
            if (rr && rr.ok) { showToast(t('Права сброшены к пресетам'), 'check'); openTeamChannel(chId); return; }
        } catch (e) {}
        showToast(t('Не удалось сбросить'), 'alert-triangle');
    });
    sheet.querySelector('#tm-refresh').addEventListener('click', () => { hapticLight(); openTeamChannel(chId); });
    const bk = sheet.querySelector('#tm-back');
    if (bk) bk.addEventListener('click', () => { hapticLight(); openTeam(true); });
    localizeTree(sheet);
}

function _tmTogglePick(sheet, chId, m, isOwner) {
    const box = sheet.querySelector('#tm-pick-' + m.user_id);
    if (!box) return;
    const open = box.style.display !== 'none';
    sheet.querySelectorAll('.tm-rolepick').forEach(b => { b.style.display = 'none'; });
    if (open) return;
    hapticLight();
    const opts = (isOwner ? ['trustee', 'manager', 'editor', 'viewer', 'none'] : ['manager', 'editor', 'viewer', 'none']).map(rk => {
        const r = TM_ROLES[rk];
        const sel = (m.role === rk) || (rk === 'none' && (!m.role || m.role === 'none'));
        return `<div class="tm-ropt${sel ? ' sel' : ''}" data-rset="${rk}">
            <span class="tm-rt ${r.cls}"><i class="ti ti-${r.ic}"></i></span>
            <div class="tm-rw"><div class="tm-rn">${r.nm}</div><div class="tm-rd">${r.d}</div></div>
            <span class="tm-rk"><i class="ti ti-check"></i></span></div>`;
    }).join('');
    box.innerHTML = `<div class="tm-rph"><span>${t('Роль на Площадке')}</span> · <b>${escapeHtml(m.name || '')}</b></div>` + opts;
    box.style.display = 'block';
    localizeTree(box);
    box.querySelectorAll('[data-rset]').forEach(o => {
        o.addEventListener('click', async () => {
            const role = o.dataset.rset;
            try {
                const rr = await apiRequest('/api/v1/team/' + chId + '/role', { method: 'POST', body: JSON.stringify({ user_id: m.user_id, role }) });
                if (rr && rr.ok) {
                    m.role = role;
                    const chip = sheet.querySelector('#tm-role-' + m.user_id);
                    const rd = TM_ROLES[role];
                    if (chip) { chip.className = 'tm-chip ' + rd.cls; chip.innerHTML = `<i class="ti ti-${rd.ic}"></i> ` + rd.nm; localizeTree(chip); }
                    const rowAv = sheet.querySelector(`[data-tmu="${m.user_id}"] .tm-av`);
                    if (rowAv) rowAv.className = 'tm-av tm-avr-' + role;
                    box.style.display = 'none';
                    hapticMed();
                    showToast(role === 'none' ? 'Доступ закрыт' : 'Роль назначена', 'check');
                    return;
                }
                showToast((rr && rr.error) || 'Не удалось назначить роль', 'alert-triangle');
            } catch (e) { showToast(t('Не удалось назначить роль'), 'alert-triangle'); }
        });
    });
}

function _tmMemberView(d) {
    const role = TM_ROLES[d.my_role] || TM_ROLES.viewer;
    const p = d.my_perms || {};
    const acts = [
        ['edit', 'pencil', 'Редактировать'],
        ['pub', 'rocket', 'Опубликовать · заморозить'],
        ['del', 'trash', 'Удалить оффер'],
        ['team', 'users', 'Команда'],
    ];
    const btns = acts.map(a => {
        const ok = !!p[a[0]];
        return `<div class="tm-abtn${ok ? ' ok' : ''}"><i class="ti ti-${a[1]}"></i> ${a[2]}${ok ? '' : ' <span class="tm-lk"><i class="ti ti-lock"></i></span>'}</div>`;
    }).join('');
    const sheet = _tmFill(`${_tmHead(d)}
        <div class="tm-sect">${t('Твой доступ к офферу')}</div>
        <div class="tm-mem tm-head"><span class="tm-rt ${role.cls} tm-rt-big"><i class="ti ti-${role.ic}"></i></span>
        <div class="tm-col"><div class="tm-nm">Ты — ${role.nm}</div><div class="tm-desc">${role.d || ''}</div></div></div>
        <div class="tm-denied"><div class="dh"><i class="ti ti-lock"></i> ${t('Часть действий закрыта')}</div>
        <p>${t('Операции с замком доступны только ролям выше. Доступ выдаёт владелец канала в разделе «Команда».')}</p></div>
        <div class="tm-sect">${t('Доступные действия')}</div>
        <div class="tm-actions">${btns}</div>
        <div class="tm-mhint" style="display:block;">${t('Оффер этого канала доступен в «Площадка → Мои офферы» с учётом твоей роли.')}</div>`);
    const bk = sheet.querySelector('#tm-back');
    if (bk) bk.addEventListener('click', () => { hapticLight(); openTeam(true); });
}


function apFmtWhen(iso) {
    const d = new Date(iso);
    const lang = (typeof getLang === 'function' ? getLang() : 'ru') || 'ru';
    const hm = d.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : lang, { hour: '2-digit', minute: '2-digit' });
    const dd = d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang, { day: 'numeric', month: 'short' });
    return `${dd}, ${hm}`;
}

function apConfirm(text, onYes) {
    const ov = document.createElement('div');
    ov.className = 'bs-overlay visible';
    ov.style.zIndex = '9000';
    const box = document.createElement('div');
    box.className = 'ap-confirm';
    box.innerHTML = `<div class="ap-cf-tx">${escapeHtml(text)}</div>
        <div class="ap-cf-row"><button class="ap-cf-btn" id="ap-cf-no">${t('Отмена')}</button>
        <button class="ap-cf-btn yes" id="ap-cf-yes">${t('Да, опубликовать')}</button></div>`;
    document.body.appendChild(ov);
    document.body.appendChild(box);
    const close = () => { ov.remove(); box.remove(); };
    ov.addEventListener('click', close);
    box.querySelector('#ap-cf-no').addEventListener('click', close);
    box.querySelector('#ap-cf-yes').addEventListener('click', () => { close(); onYes(); });
    localizeTree(box);
}

function apErr(e) {
    let m = (e && e.message) ? e.message : '';
    const j = m.indexOf('{');
    if (j >= 0) {
        try { m = (JSON.parse(m.slice(j)) || {}).detail || m; } catch (err) {}
    }
    showToast(m || TR('Не получилось — попробуй ещё раз'), 'alert-triangle');
}

function publishPostNow(ctx) {
    const pid = ctx && ctx.currentPostId;
    if (!pid) { showToast(TR('Сначала сгенерируй пост'), 'alert-triangle'); return; }
    hapticLight();
    const _pi = ctx.placeInfo;
    const _where = _pi && _pi.channel_username ? '@' + _pi.channel_username : (_pi && _pi.channel_title) || TR('канал');
    apConfirm(TR('Опубликовать пост в') + ' ' + _where + ' ' + TR('прямо сейчас?'), async () => {
        try {
            await apiRequest('/api/v1/post/schedule', {
                method: 'POST',
                body: JSON.stringify({ post_id: pid, mode: 'now' }),
            });
            showToast(TR('Пост уходит в канал — бот опубликует его в течение минуты'), 'check');
        } catch (e) { apErr(e); }
    });
}

let _apCtx = null;
function apClose() {
    if (_apCtx) { try { _apCtx.ov.remove(); _apCtx.sh.remove(); } catch (e) {} _apCtx = null; }
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
}

async function openQueueSheet(channelId) {
    hapticLight();
    apClose();
    const ov = document.createElement('div');
    ov.className = 'bs-overlay';
    const sh = document.createElement('div');
    sh.className = 'bs-sheet ap-sheet';
    sh.innerHTML = `<div class="bs-handle"></div>
        <div class="ap-title">${TR('Очередь публикаций')}</div>
        <div class="ap-sub">${TR('Контент-план и отдельные посты — одна очередь')}</div>
        <div id="ap-qbody" style="padding:26px 0;text-align:center;color:#565b73;"><i class="ti ti-loader-2" style="font-size:20px;display:inline-block;animation:spin .9s linear infinite;"></i></div>`;
    document.body.appendChild(ov);
    document.body.appendChild(sh);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => { ov.classList.add('visible'); sh.classList.add('visible'); });
    ov.addEventListener('click', apClose);
    _apCtx = { ov, sh };
    localizeTree(sh);

    const load = async () => {
        let d = null;
        try { d = await apiRequest(`/api/v1/post/queue?channel_id=${channelId}`); } catch (e) { }
        const body = sh.querySelector('#ap-qbody');
        if (!body) return;
        if (!d || !d.ok) {
            body.innerHTML = `<div style="padding:8px 0;color:#8990a8;font-size:12px;"><span>${TR('Не удалось загрузить очередь')}</span></div>`;
            localizeTree(body); return;
        }
        const row = (p) => {
            const src = p.from_plan ? '📋' : '✍️';
            const when = p.status === 'published' ? (p.published_at || p.scheduled_at) : p.scheduled_at;
            const st = p.status === 'queued' || p.status === 'publishing'
                ? `<span class="ap-st q"><span>${TR('в очереди')}</span></span>`
                : (p.status === 'published'
                    ? `<span class="ap-st ok"><span>${TR('опубликован')}</span></span>`
                    : `<span class="ap-st er"><span>${TR('ошибка')}</span></span>`);
            const acts = p.status === 'queued'
                ? `<button class="ap-qa" data-apmv="${p.id}" title="Перенести"><i class="ti ti-clock-edit"></i></button><button class="ap-qa" data-aprm="${p.id}" title="Убрать"><i class="ti ti-x"></i></button>`
                : (p.status === 'failed'
                    ? `<button class="ap-qa" data-aprt="${p.id}" title="Отправить сейчас"><i class="ti ti-refresh"></i></button>`
                    : (p.published_url ? `<button class="ap-qa" data-apurl="${escapeHtml(p.published_url)}" title="Открыть"><i class="ti ti-external-link"></i></button>` : ''));
            const err = p.status === 'failed' && p.last_error ? `<div class="ap-qerr">${escapeHtml(p.last_error)}</div>` : '';
            return `<div class="ap-qrow num"><div class="ap-qw">${when ? apFmtWhen(when) : '—'}</div>
                <div class="ap-qtx">${src} ${escapeHtml(p.preview || '')}</div>${st}${acts}</div>${err}`;
        };
        const up = (d.upcoming || []).map(row).join('');
        const hi = (d.history || []).map(row).join('');
        body.style.cssText = '';
        body.innerHTML =
            (d.paused ? `<div class="ap-qerr" style="margin-bottom:8px;"><span>${TR('Канал на паузе — очередь остановлена, посты не выходят')}</span></div>` : '') +
            `<div class="ap-qsec"><span>${TR('В очереди')}</span></div>` +
            (up || `<div class="ap-qempty"><span>${TR('Запланированных постов нет')}</span></div>`) +
            `<div class="ap-qsec"><span>${TR('История')}</span></div>` +
            (hi || `<div class="ap-qempty"><span>${TR('Публикаций ещё не было')}</span></div>`);
        localizeTree(body);
        body.querySelectorAll('[data-aprm]').forEach(b => b.addEventListener('click', async () => {
            hapticLight();
            try { await apiRequest('/api/v1/post/unschedule', { method: 'POST', body: JSON.stringify({ post_id: +b.dataset.aprm }) }); load(); }
            catch (e) { apErr(e); }
        }));
        body.querySelectorAll('[data-aprt]').forEach(b => b.addEventListener('click', async () => {
            hapticLight();
            try { await apiRequest('/api/v1/post/schedule', { method: 'POST', body: JSON.stringify({ post_id: +b.dataset.aprt, mode: 'now' }) }); load(); }
            catch (e) { apErr(e); }
        }));
        body.querySelectorAll('[data-apmv]').forEach(b => b.addEventListener('click', () => {
            openPlanSheet({ currentPostId: +b.dataset.apmv, placeInfo: null, placed: null, onPlaced: load });
        }));
        body.querySelectorAll('[data-apurl]').forEach(b => b.addEventListener('click', () => {
            const u = b.dataset.apurl;
            if (tg?.openTelegramLink) tg.openTelegramLink(u); else window.open(u, '_blank');
        }));
    };
    load();
}

function formatNumber(num) {
    if (num === null || num === undefined) return '—';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'М';
    if (num >= 10_000) return Math.floor(num / 1000) + 'к';
    if (num >= 1_000) return (num / 1000).toFixed(1) + 'к';
    return String(num);
}


var FM_FULLSCREENS = '#audit-screen, #channel-settings-screen, #strategy-screen, #content-plan-screen, #rewrite-screen';

function fmAnyModalVisible() {
    var list = document.querySelectorAll('.pw-sheet-ov.show, .lang-ov.show, .bs-overlay.visible, .modal-overlay, .cs-modal-overlay, .drawer.active, ' + FM_FULLSCREENS);
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

function fmModalOpen() {
    var sels = ['.pw-sheet-ov.show', '.lang-ov.show', '.bs-overlay.visible', '.modal-overlay', '.cs-modal-overlay', '.drawer.active', '.fmx-mbg.fmx-show', '.fmx-cfm.solid', '#fmx-listBg.fmx-show', '.fmx-psFull',
                '#audit-screen', '#channel-settings-screen', '#strategy-screen', '#content-plan-screen', '#rewrite-screen'];
    for (var s = 0; s < sels.length; s++) {
        var nodes = document.querySelectorAll(sels[s]);
        for (var i = 0; i < nodes.length; i++) {
            try {
                var cs = getComputedStyle(nodes[i]);
                if (cs.display !== 'none' && cs.visibility !== 'hidden' && nodes[i].getBoundingClientRect().width > 0) return true;
            } catch (e) { return true; }
        }
    }
    return false;
}

document.addEventListener('pointerdown', function () {
    try {
        var b = document.body;
        if ((b.classList.contains('fmx-bgfreeze') || b.classList.contains('cs-modal-open')) && !fmModalOpen()) {
            fmClientLog('watchdog: pointerdown снял cs-modal-open');
            b.classList.remove('fmx-bgfreeze', 'fmx-bgfull', 'cs-modal-open');
            document.documentElement.classList.remove('fmx-bgfreeze', 'cs-modal-open');
            ['#app', '#fmx-main', '#drawer-overlay'].forEach(function (sel) {
                var nn = document.querySelector(sel);
                if (nn && nn.style.pointerEvents === 'none') nn.style.pointerEvents = '';
            });
        }
    } catch (e) {}
}, true);

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
                fmClientLog('drawer-blocker: ' + _fmElDesc(hit));
                hit.style.pointerEvents = 'none';
            }
        });
    } catch (e) {}
}

function openDrawer() {
    fmUnstick();
    els.drawer.classList.add('active');
    els.drawerOverlay.classList.add('active');
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    setTimeout(fmProbeDrawer, 450);
    setTimeout(fmProbeDrawer, 1400);
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
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
    ai_audit: { title: 'AI-аудит канала', text: 'Полный разбор: что работает, что нет, план роста на 30 дней. Скоро запустим.', icon: 'target' },
    competitor_analysis: { title: 'Анализ конкурентов', text: 'Что у них набирает охват и почему. Функция готовится к запуску.', icon: 'search' },
    post_price: { title: 'Цена поста', text: 'Калькулятор справедливой цены по реальным метрикам канала. Скоро готово.', icon: 'calculator' },
    negotiation_templates: { title: 'Шаблоны переговоров', text: '3 варианта ответа рекламодателю: деловой, дружелюбный, твёрдый. Скоро запустим.', icon: 'message-circle' },
    profile: { title: 'Forge и покупки', text: 'Баланс Forge, пакеты пополнения, история. Скоро запустим.', icon: 'user-circle' },
    voice_settings: { title: 'Стиль канала', text: 'Настрой как AI пишет под твой стиль: загрузи 3-5 постов или опиши канал. Скоро готово.', icon: 'microphone' },
    add_channel: { title: 'Подключение канала', text: 'Подключи свой Telegram-канал чтобы я видел метрики и подстраивался под твой стиль. Скоро.', icon: 'plus' },
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

    if (actionId === 'commercial_audit') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openAudit === 'function') {
            window.__openAudit(null, 'deep');
        }
        return;
    }

    if (actionId === 'rewrite_post') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        openModuleSafe('rewrite.js', '__openRewrite', 'Рерайт');
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

    if (actionId === 'placements') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openPlacements === 'function') {
            window.__openPlacements();
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

    if (actionId === 'market_terminal') {
        if (typeof window.__openTerminal === 'function') { window.__openTerminal(); }
        return;
    }

    if (actionId === 'market_offers') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openMarket === 'function') { window.__openMarket(); }
        return;
    }

    if (actionId === 'radar') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openRadar === 'function') { window.__openRadar(); }
        return;
    }

    if (actionId === 'adpick') {
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        if (typeof window.__openAdPick === 'function') { window.__openAdPick(); }
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
async function openCabinet(scrollTo) {
    hapticLight();
    showScreen('cabinet');
    const body = document.getElementById('cabinet-body');
    if (body && !cabinetData) {
        body.innerHTML = '<div class="cab-card" style="text-align:center;color:var(--text-secondary);padding:44px 16px;">' + TR('Загрузка…') + '</div>';
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
        if (body) body.innerHTML = '<div class="cab-card" style="text-align:center;color:var(--text-secondary);padding:44px 16px;">' + TR('Не удалось загрузить кабинет.') + '<br>' + TR('Попробуй позже.') + '</div>';
    }
}

const RF_LEVEL_NAMES = { starter: 'Starter', member: 'Starter', connector: 'Connector', influencer: 'Influencer', ambassador: 'Ambassador', founders_circle: 'Founders Circle', stakeholder: 'Stakeholder', shareholder: 'Shareholder', majority_holder: 'Majority Holder' };
const RF_PERK_TEXT = {
    forge_200: 'ежемесячное начисление 200 Forge',
    forge_550: 'ежемесячное начисление 550 Forge',
    forge_900: 'ежемесячное начисление 900 Forge',
    forge_1300: 'ежемесячное начисление 1 300 Forge',
    forge_2000: 'ежемесячное начисление 2 000 Forge',
    forge_3000: 'ежемесячное начисление 3 000 Forge',
    forge_5000: 'ежемесячное начисление 5 000 Forge',
    anim_sticker: 'анимированные стикеры на оффере',
    fx_glow: 'оформление оффера «Свечение»',
    fx_glass: 'оформление «Стекло»',
};

function cabRefLadder(r) {
    const curKey = (r.level === 'member' ? 'starter' : r.level) || 'starter';
    const ladder = (r.ladder && r.ladder.length) ? r.ladder : [];
    let ci = ladder.findIndex((x) => x.key === curKey);
    if (ci < 0) ci = 0;
    const rows = ladder.map((x, i) => {
        const st = i < ci ? 'done' : (i === ci ? 'cur' : 'fut');
        const here = (i === ci && curKey === 'starter') ? '<span class="rf-here">' + TR('ты здесь') + '</span>' : '';
        const need = x.need > 0 ? `от ${cabNum(x.need)} ${plural3(x.need, 'оплатившего', 'оплативших', 'оплативших')}` : 'старт';
        const perks = (x.perks || []).map((p) => RF_PERK_TEXT[p] || p).join(' · ');
        return `<div class="rf-step ${st}"><span class="rf-rail"></span><span class="rf-node"></span><div class="rf-txt"><div class="nm" style="display:flex;align-items:center;gap:8px;"><span style="flex:1;min-width:0;">${escapeHtml(RF_LEVEL_NAMES[x.key] || x.key)} <span class="need">· ${escapeHtml(need)}</span>${here}</span><b style="flex:0 0 auto;min-width:42px;text-align:right;font-size:13px;color:#c7cdff;font-variant-numeric:tabular-nums;">${x.rate_pct}%</b></div>${perks ? `<div class="perk">${escapeHtml(perks)}</div>` : ''}</div></div>`;
    }).join('');
    return `<div class="rf-ladder">${rows}</div>`;
}

function refCardHtml(r) {
    r = r || {};
    const rate = r.rate_pct || 30;
    const fDisc = r.friend_discount_pct || 15;
    const fBonus = r.friend_welcome_bonus || 100;
    const link = escapeHtml((r.referral_link || '').replace(/^https?:\/\//, ''));
    const nextLine = r.next_level_display
        ? `${TR('до')} <b>${escapeHtml(r.next_level_display)}</b> ${TR('· ещё')} <b>${cabNum(r.needed_for_next)}</b> ${TR('оплативших')}`
        : 'высший уровень';
    return `<div class="rf">
  <div class="rf-card">
    <span class="rf-eyebrow">${TR('Приглашено по твоей ссылке')}</span>
    <div class="rf-stats">
      <div class="rf-stat"><div class="n">${cabNum(r.total_invited)}</div><div class="l">${TR('перешло')}</div></div>
      <div class="rf-divx"></div>
      <div class="rf-stat acc"><div class="n">${cabNum(r.paid_referrals)}</div><div class="l">${TR('оплатили')}</div></div>
      <div class="rf-divx"></div>
      <div class="rf-stat"><div class="n">${cabNum(r.forge_earned_total)}</div><div class="l">${TR('получено Forge')}</div></div>
    </div>
  </div>

  <div class="rf-card rf-value rf-glow">
    <div class="rf-body">
      <div class="rf-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
      <div>
        <div class="rf-rate"><b>${rate}%</b><span>${TR('с каждого пополнения приглашённого — в Forge, без ограничения срока и числа платежей')}</span></div>
        <div style="margin:9px 0 2px;border:0.5px solid rgba(255,255,255,0.09);border-radius:11px;overflow:hidden;font-size:11.5px;">
          <div style="display:flex;justify-content:space-between;padding:6px 11px;background:rgba(255,255,255,0.04);color:#8990a8;font-size:10px;"><span>${TR('Приглашённый пополнил')}</span><span>${TR('Твоё начисление')}</span></div>
          ${[300, 900, 2500, 6000].map((v) => `<div style="display:flex;justify-content:space-between;padding:6px 11px;border-top:0.5px solid rgba(255,255,255,0.05);"><span class="num" style="color:#a9aec0;">${cabNum(v)} Forge</span><b class="num" style="color:#5DCAA5;">+${cabNum(Math.round(v * rate / 100))} Forge</b></div>`).join('')}
        </div>
        <p style="margin-top:8px;">Начисление автоматически после оплаты. Приглашённый получает −${fDisc}% на первое пополнение и +${fBonus} Forge к стартовому запасу.</p>
      </div>
    </div>
    <div class="rf-bal">
      <span class="k">${TR('Баланс')}</span>
      <span class="v">${forgeAmount(r.forge_balance, 20)}</span>
      <span class="e">${TR('на генерацию, аудиты и анализ')}</span>
    </div>
  </div>

  <div class="rf-card">
    <div class="rf-lvltop">
      <div class="rf-lvlnow"><span class="rf-tierbig"></span><div><div class="nm">${escapeHtml(r.level_display || 'Starter')}</div><div class="sub">${TR('твой уровень')}</div></div></div>
      <div class="rf-lvlnext">${nextLine}</div>
    </div>
    ${cabRefLadder(r)}
  </div>

  <div class="rf-card rf-glow">
    <div class="rf-lbl" style="margin-top:0">${TR('Твоя ссылка')}</div>
    <div class="rf-field">
      <span class="link" id="cab-link">${link}</span>
      <button class="rf-fbtn" id="cab-linkcopy" aria-label="Копировать ссылку"><i class="ti ti-link"></i></button>
    </div>

    <button class="rf-cta" id="cab-share"><i class="ti ti-send"></i> ${TR('Поделиться ссылкой')}</button>
    <button class="rf-cta ghost" id="cab-invite-copy"><i class="ti ti-copy"></i> ${TR('Скопировать текст приглашения')}</button>
  </div>

  <div class="rf-how">
    <span class="rf-eyebrow">${TR('Как это работает')}</span>
    <div class="rf-hrow"><span class="rf-hnum">1</span><p>${TR('Передай ссылку админам каналов — лично или в своих постах.')}</p></div>
    <div class="rf-hrow"><span class="rf-hnum">2</span><p>Приглашённый регистрируется по ней и получает −${fDisc}% на первое пополнение Forge и +${fBonus} Forge к стартовому запасу.</p></div>
    <div class="rf-hrow"><span class="rf-hnum">3</span><p>${TR('С каждого его пополнения тебе начисляется процент в Forge. Ставка растёт с уровнем — от 30% до 50%.')}</p></div>
    <div class="rf-hrow"><span class="rf-hnum">4</span><p>${TR('Достигнутый уровень фиксируется навсегда — ставка не снижается.')}</p></div>
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
    if (body && !cabinetData) body.innerHTML = '<div class="cab-card" style="text-align:center;color:var(--text-secondary);padding:44px 16px;">' + TR('Загрузка…') + '</div>';
    else if (body && cabinetData) renderReferral(cabinetData);
    try {
        const data = await apiRequest('/api/v1/user/cabinet');
        cabinetData = data;
        renderReferral(data);
        loadRefLeaderboard();
    } catch (e) {
        if (body && !cabinetData) body.innerHTML = '<div class="cab-card" style="text-align:center;color:var(--text-secondary);padding:44px 16px;">' + TR('Не удалось загрузить.') + '<br>' + TR('Попробуй позже.') + '</div>';
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
        block.innerHTML = `<span class="rf-eyebrow">${TR('Лидерборд недели')}</span>${rows}${me}<p style="font-size:12px;color:var(--text-secondary);margin-top:8px;">${TR('Считаются приглашённые, подключившие живой канал за 7 дней.')}</p>`;
        const foot = host.querySelector('.rf-foot');
        if (foot) foot.parentNode.insertBefore(block, foot); else host.appendChild(block);
        localizeTree(block);
    } catch (e) {  }
}

const FORGE_OP_LABEL = {
    promo_burst24: 'Продвижение · всплеск 24 ч', promo_burst48: 'Продвижение · всплеск 48 ч',
    promo_week: 'Продвижение · неделя в ленте', promo_month: 'Продвижение · месяц в ленте',
    ai_strategy: 'AI-стратегия канала', strategy_renewal: 'Продление AI-стратегии',
    welcome: 'Стартовый запас',
    generate: 'Пост · премиум', generate_std: 'Пост · стандарт',
    modify: 'Правка · премиум', modify_std: 'Правка · стандарт',
    rewrite: 'Рерайт', rewrite_std: 'Рерайт · стандарт',
    voice: 'Настройка стиля', content_plan: 'Контент-план недели',
    content_plan_day: 'День контент-плана', adpick: 'Подбор каналов',
    audit: 'AI-аудит канала', deep_audit: 'Коммерческий аудит',
    competitors: 'Анализ конкурентов', intent: 'Анализ темы',
    suggest: 'Подсказки правок', ideas: 'Идеи постов', niche: 'Определение ниши',
};

const FORGE_KIND_LABEL = {
    tier: 'Начисление', topup: 'Пополнение баланса',
    welcome: 'Стартовый запас',
    referral: 'Партнёрское вознаграждение', referral_perk: 'Бонус уровня',
    free: 'Ежемесячное начисление', refund: 'Возврат', spend: 'Списание',
};

function forgeTxLabel(tx) {
    if (tx.amount > 0) return FORGE_KIND_LABEL[tx.kind] || 'Начисление';
    return FORGE_OP_LABEL[tx.operation] || FORGE_KIND_LABEL[tx.kind] || 'Списание';
}

function forgeTxDate(iso) {
    if (!iso) return '';
    const dt = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
    if (isNaN(dt)) return '';
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        + ' · ' + dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

const FW_PRICE_EXPLAIN = {
    generate: 'Готовый пост по заданию с учётом профиля стиля канала. Премиум-модель точнее держит тему, глубже прорабатывает аргументацию и требует меньше правок.',
    generate_std: 'Готовый пост по заданию стандартной моделью. Рабочий вариант для регулярного контента: анонсы, подборки, короткие форматы.',
    generate_proofs: 'Пост премиум-моделью плюс живой поиск первоисточников: система находит 1-3 исследования в авторитетных научных источниках, проверяет каждую ссылку и вставляет их в манере канала. Если подтверждённых работ не нашлось — разница в цене возвращается за вычетом сбора за поиск.',
    generate_std_proofs: 'Пост стандартной моделью с поиском первоисточников: 1-3 проверенные ссылки на исследования, оформленные в манере канала. Если подтверждённых работ не нашлось — разница в цене возвращается за вычетом сбора за поиск.',
    research_attach: 'Живой поиск первоисточников для уже написанного поста контент-плана: 1-3 проверенные ссылки вставляются в манере канала. Если подтверждённых работ не нашлось — возврат за вычетом сбора за поиск.',
    modify: 'Точечная доработка готового поста по инструкции: сменить тон, сократить, расширить, переписать фрагмент. Пост не пересобирается с нуля — правится только указанное.',
    rewrite: 'Переработка чужого поста в уникальный текст под стиль твоего канала: смысл и факты сохраняются, структура и формулировки — новые.',
    voice: 'Анализ опубликованных постов канала и настройка профиля стиля: тон, лексика, структура, оформление. Профиль применяется ко всем последующим генерациям.',
    channel_analyze: 'Оценка чужого канала перед покупкой рекламы: вердикт с баллом доверия, реальный охват против заявленного, портрет аудитории, красные флаги, справедливая цена размещения и прогноз отдачи. Готовая позиция для переговоров с продавцом.',
    adpick: 'Подбор площадок под закуп рекламы: сбор кандидатов с проверенными метриками — охват, вовлечённость, доля рекламы в ленте, динамика подписчиков — и ранжирование лучших с оценкой совпадения аудитории и обоснованием по цифрам.',
    audit: 'Полный аудит твоего канала: балл по контенту, охвату, регулярности и монетизации; разбор лучшего и худшего поста, работающие и проваливающиеся темы, лучшее время публикаций, слабые места с оценкой потерь, прогноз развития и пошаговый план с дедлайнами.',
    deep_audit: 'Коммерческий аудит канала как рекламной площадки: позиция среди каналов ниши, цена размещения против рыночной вилки, качество трафика с проверкой на накрутку, аудитория как аргумент в продаже, рекомендованные цены форматов и потенциал дохода в месяц.',
    competitors: 'Поиск и разбор каналов-конкурентов: карта ниши, сравнение с каждым по охвату, частоте и подписчикам, приёмы, которые приносят им результат, твои пробелы и план действий, чтобы их закрыть.',
    promo_burst24: 'Кратковременный подъём твоего оффера в платной полосе ленты Площадки на сутки. Открывает стиль «Свечение» на время продвижения. Покупается на оффере: Площадка → Мои офферы → «Продвинуть».',
    promo_burst48: 'Подъём оффера в платной полосе ленты на двое суток. Открывает стиль «Свечение» на время продвижения. Всплесков 24 и 48 ч вместе — не больше 3 в месяц.',
    promo_week: 'Присутствие оффера в платной полосе ленты 7 дней. Открывает «Свечение», «Стекло» и анимированные стикеры. Платные офферы занимают не более 20% ленты — органику не топит.',
    promo_month: 'Присутствие оффера в платной полосе 30 дней — выгоднее за день, чем недельное. Эксклюзив: золотое свечение и тег «Продвигается».',
    ai_strategy: 'Личный стратег: интервью, выбор ниши, контент-план с первыми 10 постами, гайды трафика и месяц ведения — еженедельные разборы и чат. Покупается на экране «AI-стратегия».',
    strategy_renewal: 'Ещё 30 дней ведения стратегии: еженедельные разборы плана с фактом, гайды шагов и чат со стратегом.',
};

function fwPriceRows(list) {
    return (list || []).filter(p => p.price > 0)
        .slice().sort((a, b) => a.price - b.price)
        .map(p => {
            const ex = FW_PRICE_EXPLAIN[p.key];
            return `<div class="fw-pitem">` +
                `<div class="fw-prow${ex ? ' tap' : ''}"><span>${escapeHtml(p.label)}</span>` +
                `<b>${forgeAmount(p.price, 13)}</b>` +
                (ex ? `<i class="ti ti-chevron-down fw-pchev"></i>` : '') + `</div>` +
                (ex ? `<div class="fw-pex" hidden>${escapeHtml(ex)}</div>` : '') +
                `</div>`;
        }).join('');
}

function bindFwPriceRows(boxId) {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.querySelectorAll('.fw-prow.tap').forEach((row) => row.addEventListener('click', () => {
        const ex = row.nextElementSibling;
        if (!ex || !ex.classList.contains('fw-pex')) return;
        hapticLight();
        ex.hidden = !ex.hidden;
        row.classList.toggle('open', !ex.hidden);
    }));
}

function renderCabinet(d) {
    const body = document.getElementById('cabinet-body');
    if (!body) return;
    const u = d.user || {};
    const photo = tg?.initDataUnsafe?.user?.photo_url;
    const initial = escapeHtml((u.first_name || 'U').trim().charAt(0).toUpperCase() || 'U');

    const _hstats = (u.channels_count != null) ? (function () {
        const chN = u.channels_count || 0, liN = u.listings_count || 0, dN = u.member_days || 0;
        const chPaused = u.channels_paused || 0;
        const chActive = (u.channels_active != null) ? u.channels_active : chN;
        const chLim = (u.channels_limit && u.channels_limit < 999999) ? u.channels_limit : null;
        const chMain = chPaused > 0 ? chActive : chN;
        const chOf = chLim ? ` <s><span>${TR('из')}</span> ${cabNum(chLim)}</s>` : '';
        const chLabel = chPaused > 0
            ? `${plural3(chMain, 'канал', 'канала', 'каналов')} · ${cabNum(chPaused)} на паузе`
            : plural3(chMain, 'канал', 'канала', 'каналов');
        return `<div class="cab-pstats num">` +
            `<div class="cab-ps"><div class="v">${cabNum(chMain)}${chOf}</div><div class="l">${chLabel}</div></div>` +
            `<div class="cab-ps"><div class="v">${cabNum(liN)}</div><div class="l">${plural3(liN, 'оффер', 'оффера', 'офферов')}</div></div>` +
            (dN ? `<div class="cab-ps"><div class="v">${cabNum(dN)}</div><div class="l">${plural3(dN, 'день с нами', 'дня с нами', 'дней с нами')}</div></div>` : '') +
            `</div>`;
    })() : '';
    const _fbal = Number(((d || {}).forge || {}).balance || 0);
    let html = `<div class="cab-card cab-hero"><div class="cab-hrow"><div class="cab-av">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : initial}</div><div class="cab-hi"><div class="cab-nm">${escapeHtml(u.first_name || 'Профиль')}</div><div class="cab-hsub"><i class="ti ti-calendar-event"></i> ${u.member_since ? 'в ForgeMetrics с ' + escapeHtml(u.member_since) : 'ForgeMetrics'}</div></div><button class="forge-chip" id="cab-tarpill" type="button" style="margin-left:auto;align-self:flex-start;"><span class="forge-chip-ico">${FORGE_SVG}</span><span class="forge-chip-val">${cabNum(_fbal)}</span></button></div>${_hstats}</div>`;


    const notifOn = (function () { try { return localStorage.getItem('fm_notif') !== '0'; } catch (e) { return true; } })();
    html += `<div class="cab-card" id="cab-sec-settings"><div class="cab-stt"><h3>${cabTile('bl', 'settings', 'sm')} Настройки</h3></div><div class="cab-set" id="cab-team"><div class="cab-tile md cab-t-gr"><i class="ti ti-users"></i></div><div class="cab-si"><div class="cab-snm">${TR('Команда канала')}</div><div class="cab-sd">${TR('Роли и права админов на оффер')}</div></div><i class="ti ti-chevron-right cab-chev"></i></div><div class="cab-set" id="cab-notif"><div class="cab-tile md cab-t-am"><i class="ti ti-bell"></i></div><div class="cab-si"><div class="cab-snm">${TR('Уведомления')}</div><div class="cab-sd">${TR('Заявки в нише, отклики, статусы офферов')}</div></div><div class="cab-tog${notifOn ? ' on' : ''}" id="cab-notif-tog"></div></div><div class="cab-set" id="cab-theme"><div class="cab-tile md cab-t-pu"><i class="ti ti-palette"></i></div><div class="cab-si"><div class="cab-snm">${TR('Тема оформления')}</div><div class="cab-sd">${TR('Тёмная фирменная · выбор тем')}</div></div><span class="cab-soon">${TR('Скоро')}</span></div><div class="cab-set" id="cab-lang"><div class="cab-tile md cab-t-gr"><i class="ti ti-world"></i></div><div class="cab-si"><div class="cab-snm">${TR('Язык интерфейса')}</div><div class="cab-sd">${window.I18N ? (getLang().toUpperCase() + ' <span class="cab-flag">' + ((I18N.flagSvg && I18N.flagSvg[getLang()]) || '') + '</span> ' + escapeHtml(I18N.names[getLang()])) : 'RU Русский'}</div></div><i class="ti ti-chevron-right cab-chev"></i></div><div class="cab-set" id="cab-about"><div class="cab-tile md cab-t-bl"><i class="ti ti-lifebuoy"></i></div><div class="cab-si"><div class="cab-snm">${TR('Справка и поддержка')}</div><div class="cab-sd">${TR('Метрики, Forge, связь с нами')}</div></div><i class="ti ti-chevron-right cab-chev"></i></div><div class="cab-set" id="cab-terms"><div class="cab-tile md cab-t-pu"><i class="ti ti-file-text"></i></div><div class="cab-si"><div class="cab-snm">${TR('Пользовательское соглашение')}</div><div class="cab-sd">${TR('Условия использования сервиса')}</div></div><i class="ti ti-chevron-right cab-chev"></i></div></div>`;

    html += `<div class="cab-foot"><b>ForgeMetrics</b> · @ForgeMetricsBot</div>`;
    html += `<div class="cab-foot" style="margin-top:2px;font-size:9.5px;opacity:0.7;"><span>${TR('На информационном ресурсе применяются рекомендательные технологии')}</span></div>`;

    body.innerHTML = html;
    wireCabinet(d);
    localizeTree(screens.cabinet);
}

const TERMS_VERSION = '2026-08-03';

function maybeShowTermsGate(data) {
    if (!data || data.terms_accepted === TERMS_VERSION) return;
    if (document.getElementById('fm-termsGate')) return;
    const bg = document.createElement('div');
    bg.id = 'fm-termsGate';
    bg.style.cssText = 'position:fixed;inset:0;z-index:100055;background:rgba(5,7,14,0.66);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;align-items:flex-end;justify-content:center;padding:0 12px;';
    bg.innerHTML = '<div style="background:#11141f;border:0;border-top:1.5px solid rgba(255,255,255,0.38);border-radius:22px 22px 0 0;box-shadow:0 -26px 64px rgba(0,0,0,0.75),0 1px 0 rgba(255,255,255,0.08) inset;max-width:430px;width:100%;padding:20px 18px calc(18px + env(safe-area-inset-bottom));">' +
        '<div style="width:44px;height:44px;border-radius:12px;margin:0 0 10px;display:flex;align-items:center;justify-content:center;background:rgba(129,140,248,0.14);border:1px solid rgba(129,140,248,0.3);color:#818cf8;font-size:22px;"><i class="ti ti-file-text"></i></div>' +
        '<div style="font-size:15px;font-weight:800;color:#e8e8ed;margin-bottom:5px;"><span>' + TR('Пользовательское соглашение') + '</span></div>' +
        '<div style="font-size:12.5px;line-height:1.5;color:#9aa0b8;margin-bottom:14px;"><span>' + TR('Перед началом работы подтвердите согласие с условиями использования сервиса.') + '</span></div>' +
        '<button id="fm-tgRead" style="display:block;width:100%;border:0.5px solid rgba(255,255,255,0.14);background:transparent;color:#c2c6d2;border-radius:11px;padding:11px;font-size:12.5px;font-weight:600;cursor:pointer;margin-bottom:11px;"><span>' + TR('Читать пользовательское соглашение') + '</span></button>' +
        '<div id="fm-tgChk" style="display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin-bottom:12px;">' +
        '<span id="fm-tgBox" style="flex:0 0 auto;width:20px;height:20px;border-radius:6px;border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;color:transparent;font-size:13px;margin-top:1px;transition:all 140ms;"><i class="ti ti-check"></i></span>' +
        '<span style="font-size:12px;line-height:1.45;color:#c2c6d2;"><span>' + TR('Я ознакомился с условиями и принимаю их') + '</span></span></div>' +
        '<button id="fm-tgOk" disabled style="display:block;width:100%;border:none;background:linear-gradient(145deg,#818cf8,#6366f1);color:#0b0c16;border-radius:11px;padding:12px;font-size:13px;font-weight:800;cursor:pointer;opacity:0.38;pointer-events:none;transition:opacity 160ms;"><span>' + TR('Принимаю условия') + '</span></button></div>';
    document.body.appendChild(bg);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    bg.addEventListener('touchmove', e => { if (!e.target.closest('#fm-termsBody')) e.preventDefault(); }, { passive: false });
    bg.addEventListener('wheel', e => { if (!e.target.closest('#fm-termsBody')) e.preventDefault(); }, { passive: false });
    const unlock = () => { document.body.style.overflow = ''; document.documentElement.style.overflow = ''; };
    document.getElementById('fm-tgRead').addEventListener('click', () => { hapticLight(); openUserTerms(); });
    let agreed = false;
    document.getElementById('fm-tgChk').addEventListener('click', () => {
        hapticLight();
        agreed = !agreed;
        const box = document.getElementById('fm-tgBox');
        box.style.background = agreed ? 'linear-gradient(145deg,#818cf8,#6366f1)' : 'transparent';
        box.style.borderColor = agreed ? 'transparent' : 'rgba(255,255,255,0.25)';
        box.style.color = agreed ? '#0b0c16' : 'transparent';
        const ok = document.getElementById('fm-tgOk');
        ok.disabled = !agreed;
        ok.style.opacity = agreed ? '1' : '0.38';
        ok.style.pointerEvents = agreed ? 'auto' : 'none';
    });
    document.getElementById('fm-tgOk').addEventListener('click', async () => {
        if (!agreed) return;
        hapticMed();
        try {
            await apiRequest('/api/v1/user/accept-terms', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION }) });
        } catch (e) {}
        unlock();
        bg.remove();
    });
}

function openUserTerms() {
    hapticLight();
    const old = document.getElementById('fm-termsBg'); if (old) old.remove();
    const prevBodyOv = document.body.style.overflow, prevDocOv = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const bg = document.createElement('div');
    bg.id = 'fm-termsBg';
    bg.style.cssText = 'position:fixed;inset:0;z-index:100060;background:rgba(5,7,14,0.62);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:16px;';
    bg.addEventListener('touchmove', e => { if (!e.target.closest('#fm-termsBody')) e.preventDefault(); }, { passive: false });
    bg.addEventListener('wheel', e => { if (!e.target.closest('#fm-termsBody')) e.preventDefault(); }, { passive: false });
    bg.innerHTML = '<div style="background:#11141f;border:0.5px solid rgba(255,255,255,0.1);border-radius:16px;max-width:640px;width:100%;max-height:86vh;display:flex;flex-direction:column;overflow:hidden;">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:0.5px solid rgba(255,255,255,0.08);font-weight:800;font-size:14.5px;color:#e8e8ed;"><i class="ti ti-file-text" style="color:#818cf8;font-size:17px;"></i><span>' + TR('Пользовательское соглашение') + '</span><span id="fm-termsX" style="margin-left:auto;cursor:pointer;color:#8990a8;padding:4px 6px;"><i class="ti ti-x"></i></span></div>' +
        '<div id="fm-termsBody" style="overflow-y:auto;padding:4px 16px 16px;font-size:12.5px;line-height:1.55;color:#c2c6d2;"><span>' + TR('Загружаю…') + '</span></div></div>';
    document.body.appendChild(bg);
    const closeTerms = () => {
        document.body.style.overflow = prevBodyOv;
        document.documentElement.style.overflow = prevDocOv;
        bg.remove();
    };
    bg.addEventListener('click', e => { if (e.target === bg) closeTerms(); });
    bg.querySelector('#fm-termsX').addEventListener('click', closeTerms);
    const paint = () => {
        const b = document.getElementById('fm-termsBody');
        if (b) b.innerHTML = '<style>#fm-termsBody h3{font-size:13px;color:#e8e8ed;margin:15px 0 4px;}#fm-termsBody p{margin:6px 0;}#fm-termsBody .tm-upd{color:#565b73;font-size:11px;margin-top:10px;}</style>' + window.__FM_TERMS_HTML;
    };
    if (window.__FM_TERMS_HTML) { paint(); return; }
    const s = document.createElement('script');
    s.src = 'terms.js?v=20260812a';
    s.onload = paint;
    s.onerror = () => { const b = document.getElementById('fm-termsBody'); if (b) b.innerHTML = '<span>' + TR('Не удалось загрузить документ. Проверь связь и повтори попытку.') + '</span>'; };
    document.head.appendChild(s);
}

function wireCabinet(d) {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('cab-tarpill', () => { hapticLight(); openTariffs(); });
    on('cab-team', () => { openTeam(); });
    on('cab-about', () => { openHelpSheet(); });
    on('cab-terms', openUserTerms);
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
    on('cab-share', () => {
        hapticLight();
        const link = (d.referral && d.referral.referral_link) || '';
        const text = TR('Если ведёшь Telegram-канал всерьёз — посмотри ForgeMetrics. Это стратег и редактор в одном:\n\n— посты и темы в манере именно твоего канала, неделя контента в пару кликов;\n— персональная стратегия: что менять, где расти, как вывести канал на доход;\n— перед закупкой рекламы — настоящий охват, признаки накрутки и AI-прогноз отдачи ещё до оплаты.\n\nСсылка активирует расширенный стартовый набор при первом запуске:');
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
        const text = TR('Если ведёшь Telegram-канал всерьёз — посмотри ForgeMetrics. Это стратег и редактор в одном:\n\n— посты и темы в манере именно твоего канала, неделя контента в пару кликов;\n— персональная стратегия: что менять, где расти, как вывести канал на доход;\n— перед закупкой рекламы — настоящий охват, признаки накрутки и AI-прогноз отдачи ещё до оплаты.\n\nСсылка активирует расширенный стартовый набор при первом запуске:') + '\n' + link;
        const b = document.getElementById('cab-invite-copy');
        copyText(text).then(() => { cabToast('Текст приглашения скопирован'); if (b) { b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 1400); } });
    });
}


function closeLang(ov) {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    ov.classList.remove('show');
    setTimeout(() => { if (ov && ov.parentNode) ov.remove(); }, 260);
}
function openLangPicker() {
    hapticLight();
    if (!window.I18N) return;
    const cur = getLang();
    const rows = I18N.supported.map((l) => `<button class="lang-row${l === cur ? ' on' : ''}" data-l="${l}"><span class="lc">${l.toUpperCase()}</span><span class="fl">${(I18N.flagSvg && I18N.flagSvg[l]) || I18N.flags[l]}</span><span class="nm">${escapeHtml(I18N.names[l])}</span>${l === cur ? '<i class="ti ti-check ck"></i>' : ''}</button>`).join('');
    const old = document.getElementById('lang-ov'); if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'lang-ov';
    ov.className = 'lang-ov';
    ov.innerHTML = `<div class="lang-sheet"><div class="lang-h">${TR('Язык интерфейса')}</div><div class="lang-list">${rows}</div></div>`;
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    ov.addEventListener('touchmove', (e) => { if (!e.target.closest('.lang-list')) e.preventDefault(); }, { passive: false });
    ov.addEventListener('wheel', (e) => { if (!e.target.closest('.lang-list')) e.preventDefault(); }, { passive: false });
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
let tfReturn = 'dashboard';

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
    if (body && !tariffsData) body.innerHTML = '<div class="tf-plan" style="text-align:center;color:var(--text-secondary);padding:42px 16px;">' + TR('Загрузка…') + '</div>';
    try {
        const data = await apiRequest('/api/v1/user/tariffs');
        tariffsData = data;
        renderTariffs(data);
    } catch (e) {
        if (!body) return;
        var _stale = /401/.test(String((e && e.message) || e));
        body.innerHTML = '<div class="tf-plan" style="text-align:center;color:var(--text-secondary);padding:42px 16px;">' +
            (_stale
                ? TR('Данные входа Telegram устарели. Закрой мини-приложение и открой его заново.') +
                  '<button class="fs-more" id="tf-reopen" style="margin-top:14px;">' +
                  TR('Закрыть и открыть заново') + '</button>'
                : TR('Не удалось загрузить витрину Forge.')) + '</div>';
        var _btn = document.getElementById('tf-reopen');
        if (_btn) _btn.onclick = function () {
            try { window.Telegram.WebApp.close(); } catch (e2) { location.reload(); }
        };
    }
}

function plural(n, one, few, many) {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
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

const TFC_MAIN = ['generate', 'generate_std', 'audit', 'adpick'];
// короткие подписи: полные названия из прайса рвутся на две строки и отрывают цену
const TFC_SHORT = {
    generate: 'Премиум-пост', generate_std: 'Стандартный пост',
    promo_burst24: 'Всплеск продвижения 24 ч', promo_burst48: 'Всплеск продвижения 48 ч',
    promo_week: 'Неделя продвижения', promo_month: 'Месяц продвижения',
    ai_strategy: 'AI-стратегия', strategy_renewal: 'Продление стратегии',
    generate_proofs: 'Пост с исследованиями', generate_std_proofs: 'Стандарт с исследованиями',
    research_attach: 'Исследования к посту',
    modify: 'Правка поста', rewrite: 'Рерайт поста',
    voice: 'Настройка стиля', adpick: 'Подбор каналов',
    channel_analyze: 'AI-разбор', audit: 'AI-аудит', deep_audit: 'Коммерческий аудит',
    competitors: 'Анализ конкурентов',
};
const TFC_MAX = { generate: 300, generate_std: 400, generate_proofs: 100,
    generate_std_proofs: 100, research_attach: 100, rewrite: 100, modify: 200, voice: 20,
    adpick: 45, channel_analyze: 45, audit: 30, deep_audit: 20, competitors: 20,
    promo_burst24: 30, promo_burst48: 30, promo_week: 20, promo_month: 12,
    ai_strategy: 3, strategy_renewal: 12 };
const TFC_PRESETS = [
    { t: 'Один канал', ic: 'user', color: 'bl',
      v: { generate: 20, generate_std: 10, modify: 15, voice: 1 } },
    { t: 'Продаю рекламу', ic: 'coin', color: 'pu',
      v: { generate: 40, generate_std: 20, modify: 20, voice: 1, audit: 1, adpick: 1 } },
    { t: 'Сетка', ic: 'sitemap', color: 'gr',
      v: { generate: 120, generate_std: 80, rewrite: 20, modify: 60, voice: 3,
        audit: 3, adpick: 4, competitors: 2 } },
];

let tfCalc = null;

function tfcOps(d) {
    return (d.forge_prices || []).filter((p) => TFC_MAX[p.key]);
}

function tfcTier(d) {
    const packs = d.forge_packs || [];
    const p = packs.find((x) => x.amount === tfCalc.pack) || packs[1] || packs[0] || null;
    return p ? { key: p.amount, name: cabNum(p.amount) + ' Forge', forge: p.amount } : null;
}

function tfcSpent(d) {
    return tfcOps(d).reduce((s, o) => s + (tfCalc.v[o.key] || 0) * o.price, 0);
}

function tfcLeft(d) {
    const t = tfcTier(d);
    return Math.max(0, (t ? t.forge : 0) - tfcSpent(d));
}

function tfcClamp(d) {
    // из намерения набираем столько, сколько влезает в пакет:
    // сначала дешёвые позиции, потом дорогие — так помещается больше задуманного
    const t = tfcTier(d);
    const budget = t ? t.forge : 0;
    const want = tfCalc.want || {};
    let free = budget;
    tfcOps(d).forEach((o) => { tfCalc.v[o.key] = 0; });
    [...tfcOps(d)].sort((a, b) => a.price - b.price).forEach((o) => {
        const wish = Math.max(0, want[o.key] || 0);
        const fit = Math.min(wish, Math.floor(free / o.price));
        tfCalc.v[o.key] = fit;
        free -= fit * o.price;
    });
}

function tfcHint(d, o) {
    const val = tfCalc.v[o.key] || 0;
    const add = Math.floor(tfcLeft(d) / o.price);
    if (add > 0) return 'можно добрать ещё ' + cabNum(add);
    if (val > 0) return 'предел запаса · освободи ' + cabNum(o.price - tfcLeft(d)) + ', чтобы добавить ещё';
    return 'нужно ещё ' + cabNum(o.price - tfcLeft(d)) + ' Forge, чтобы взять одну';
}

function tfcRow(d, o) {
    const val = tfCalc.v[o.key] || 0;
    const add = Math.floor(tfcLeft(d) / o.price);
    const cap = Math.min(TFC_MAX[o.key], val + add);
    const cls = add > 0 ? 'ok' : (val > 0 ? 'stop' : 'off');
    const pct = cap > 0 ? Math.round(val / cap * 100) : 0;
    return '<div class="tfc-op ' + cls + '" data-tfcrow="' + o.key + '" style="--p:' + pct + '%">'
        + '<div class="tfc-top"><span class="tfc-nm">'
        + escapeHtml(TFC_SHORT[o.key] || o.label)
        + ' <i>· ' + forgeAmount(o.price, 11) + TR('/шт') + '</i></span>'
        + '<span class="tfc-v' + (val ? '' : ' zero') + '">' + cabNum(val) + '</span></div>'
        + '<div class="tfc-ctl">'
        + '<button class="tfc-b" data-tfcop="' + o.key + '" data-d="-1"' + (val <= 0 ? ' disabled' : '') + '>−</button>'
        + '<input type="range" min="0" max="' + Math.max(cap, 1) + '" step="1"'
        + ' value="' + val + '" data-tfcsl="' + o.key + '">'
        + '<button class="tfc-b" data-tfcop="' + o.key + '" data-d="1"' + (add <= 0 ? ' disabled' : '') + '>+</button>'
        + '</div><div class="tfc-can">' + tfcHint(d, o) + '</div></div>';
}

function tfCalculatorHtml(d) {
    const ops = tfcOps(d);
    if (!ops.length) return '';
    if (!tfCalc) {
        const packs = d.forge_packs || [];
        const def = packs[1] || packs[0] || {};
        tfCalc = { pack: def.amount || 0, preset: 1, open: false,
                   shown: false, v: {}, want: { ...TFC_PRESETS[1].v } };
    }
    ops.forEach((o) => {
        if (tfCalc.want[o.key] == null) tfCalc.want[o.key] = 0;
        if (tfCalc.v[o.key] == null) tfCalc.v[o.key] = 0;
    });
    tfcClamp(d);

    const t = tfcTier(d);
    if (!t || !t.forge) return '';
    const rest = tfcLeft(d);
    const packsAll = d.forge_packs || [];
    const idx = packsAll.findIndex((p) => p.amount === t.key);
    const next = packsAll[idx + 1]
        ? { name: cabNum(packsAll[idx + 1].amount) + ' Forge', forge: packsAll[idx + 1].amount } : null;
    const main = ops.filter((o) => TFC_MAIN.includes(o.key));
    const more = ops.filter((o) => !TFC_MAIN.includes(o.key));

    const head = '<button class="tfc-head" id="tfc-toggle">'
        + '<span class="et">' + forgeIco(17) + '</span>'
        + '<span class="tfc-htxt"><b>' + TR('Калькулятор Forge') + '</b>'
        + '<i>' + TR('Посчитай, на что хватит пакета') + '</i></span>'
        + '<i class="ti ti-chevron-' + (tfCalc.shown ? 'up' : 'down') + ' tfc-chev"></i></button>';

    if (!tfCalc.shown) return '<div class="tf-extras tfc collapsed">' + head + '</div>';

    return '<div class="tf-extras tfc">'
        + head
        + '<div class="tfc-sub">' + TR('Ползунок остановится, когда Forge закончатся') + '</div>'
        + '<div class="tfc-presets">' + TFC_PRESETS.map((p, i) =>
            '<button class="tfc-chip tp-' + (p.color || 'pu')
            + (i === tfCalc.preset ? ' on' : '') + '" data-tfcpre="' + i + '">'
            + '<i class="ti ti-' + p.ic + '"></i>'
            + '<span>' + escapeHtml(p.t) + '</span></button>').join('') + '</div>'
        + '<div class="tfc-tiers">' + (d.forge_packs || []).map((p) =>
            '<button class="tfc-tier tp-am'
            + (p.amount === tfCalc.pack ? ' on' : '') + '" data-tfcpack="' + p.amount + '">'
            + '<i class="ti ti-bolt"></i>'
            + '<span>' + cabNum(p.amount) + '</span></button>').join('') + '</div>'
        + '<div class="tfc-budget' + (rest === 0 ? ' full' : '') + '">'
        + '<span class="tfc-bic"><i class="ti ti-circle-check"></i></span>'
        + '<span class="tfc-bt"><small>'
        + (rest === 0 ? 'Запас распределён полностью' : 'Осталось распределить') + '</small>'
        + '<b>' + forgeAmount(rest, 15) + '</b>'
        + '<i>' + TR('из пакета') + ' ' + escapeHtml(t.name)
        + (next && next.forge ? ' · следующий пакет даст ' + cabNum(next.forge) : '')
        + '</i></span></div>'
        + '<div id="tfc-rows">' + main.map((o) => tfcRow(d, o)).join('') + '</div>'
        + '<button class="tfc-more" id="tfc-more"><i class="ti ti-'
        + (tfCalc.open ? 'chevron-up' : 'adjustments-alt') + '"></i>'
        + (tfCalc.open ? 'Свернуть остальное'
            : 'Ещё ' + more.length + ' ' + plural(more.length, 'операция', 'операции', 'операций'))
        + '</button>'
        + '<div id="tfc-more-rows">' + (tfCalc.open ? more.map((o) => tfcRow(d, o)).join('') : '') + '</div>'
        + '</div>';
}

function tfcRefresh(d) {
    document.querySelectorAll('[data-tfcrow]').forEach((row) => {
        const o = tfcOps(d).find((x) => x.key === row.dataset.tfcrow);
        if (!o) return;
        const val = tfCalc.v[o.key] || 0;
        const add = Math.floor(tfcLeft(d) / o.price);
        const cap = Math.min(TFC_MAX[o.key], val + add);
        row.classList.toggle('ok', add > 0);
        row.classList.toggle('stop', add <= 0 && val > 0);
        row.classList.toggle('off', add <= 0 && val === 0);
        row.style.setProperty('--p', (cap > 0 ? Math.round(val / cap * 100) : 0) + '%');
        const v = row.querySelector('.tfc-v');
        if (v) { v.textContent = cabNum(val); v.classList.toggle('zero', val === 0); }
        const sl = row.querySelector('input[type=range]');
        if (sl) {
            const nm = Math.max(cap, 1);
            if (+sl.max !== nm) sl.max = nm;
            if (+sl.value !== val) sl.value = val;
        }
        const minus = row.querySelector('[data-d="-1"]');
        const plus = row.querySelector('[data-d="1"]');
        if (minus) minus.disabled = val <= 0;
        if (plus) plus.disabled = add <= 0;
        const can = row.querySelector('.tfc-can');
        if (can) can.textContent = tfcHint(d, o);
    });

    const box = document.querySelector('.tfc-budget');
    if (!box) return;
    const rest = tfcLeft(d);
    const t = tfcTier(d);
    const packsAll = d.forge_packs || [];
    const idx = packsAll.findIndex((p) => p.amount === t.key);
    const next = packsAll[idx + 1]
        ? { name: cabNum(packsAll[idx + 1].amount) + ' Forge', forge: packsAll[idx + 1].amount } : null;
    box.classList.toggle('full', rest === 0);
    // строго внутри текстовой части: тег i снаружи — это иконка галочки
    const sm = box.querySelector('.tfc-bt small');
    if (sm) sm.textContent = rest === 0 ? 'Запас распределён полностью' : 'Осталось распределить';
    const b = box.querySelector('.tfc-bt b');
    if (b) b.innerHTML = forgeAmount(rest, 15);
    const note = box.querySelector('.tfc-bt i');
    if (note) {
        note.textContent = 'из пакета ' + t.name
            + (next && next.forge ? ' · следующий пакет даст ' + cabNum(next.forge) : '');
    }
}


function wireTfCalc(d) {
    const host = document.getElementById('tariffs-body');
    if (!host || host.dataset.tfcWired === '1') return;
    host.dataset.tfcWired = '1';

    const clampOne = (o, want) => {
        const other = tfcSpent(d) - (tfCalc.v[o.key] || 0) * o.price;
        const room = Math.floor(((tfcTier(d) || { forge: 0 }).forge - other) / o.price);
        return Math.max(0, Math.min(want, Math.min(TFC_MAX[o.key], room)));
    };

    host.addEventListener('input', (e) => {
        const sl = e.target.closest('[data-tfcsl]');
        if (!sl) return;
        const o = tfcOps(d).find((x) => x.key === sl.dataset.tfcsl);
        if (!o) return;
        const val = clampOne(o, +sl.value);
        if (val !== +sl.value) sl.value = val;
        tfCalc.v[o.key] = val;
        tfCalc.want[o.key] = val;
        tfcRefresh(d);
    });

    host.addEventListener('click', (e) => {
        const op = e.target.closest('[data-tfcop]');
        if (op) {
            const o = tfcOps(d).find((x) => x.key === op.dataset.tfcop);
            if (!o) return;
            hapticLight();
            tfCalc.v[o.key] = clampOne(o, (tfCalc.v[o.key] || 0) + (+op.dataset.d));
            tfCalc.want[o.key] = tfCalc.v[o.key];
            tfcRefresh(d);
            return;
        }
        const pre = e.target.closest('[data-tfcpre]');
        if (pre) {
            hapticLight();
            tfCalc.preset = +pre.dataset.tfcpre;
            const base = tfcOps(d).reduce((a, o) => { a[o.key] = 0; return a; }, {});
            tfCalc.want = { ...base, ...TFC_PRESETS[tfCalc.preset].v };
            renderTariffs(d);
            return;
        }
        const pk = e.target.closest('[data-tfcpack]');
        if (pk) {
            hapticLight();
            tfCalc.pack = +pk.dataset.tfcpack;
            renderTariffs(d);
            return;
        }
        if (e.target.closest('#tfc-more')) {
            hapticLight();
            tfCalc.open = !tfCalc.open;
            renderTariffs(d);
            return;
        }
        if (e.target.closest('#tfc-toggle')) {
            hapticLight();
            tfCalc.shown = !tfCalc.shown;
            renderTariffs(d);
        }
    });
}

function renderTariffs(d) {
    const body = document.getElementById('tariffs-body');
    if (!body) return;
    const balH = Number(d.forge_balance || 0);
    const grantH = Number(d.forge_grant || 0);
    const lowH = grantH > 0 && balH < grantH * 0.15;
    let html = `<div class="cab-card" style="margin-bottom:10px;">` +
        `<div class="cab-stt"><h3><div class="cab-tile sm cab-t-am">${FORGE_SVG}</div> ${TR('Баланс Forge')}</h3></div>` +
        `<div class="fw-balrow${lowH ? ' low' : ''}">` +
            `<div class="fw-bal">${forgeAmount(balH, 22)}</div>` +
            (grantH > 0 ? `<div class="fw-sub">Начисляем ${cabNum(grantH)} бесплатно каждый месяц</div>` : '') +
        `</div></div>`;
    html += '<div class="tf-note"><b>' + TR('Без тарифов и подписок') + '</b> — <span>' + TR('Площадка, Радар, аналитика и до 100 каналов открыты всем. Forge тратится только на работу ИИ и продвижение; 30 Forge приходят бесплатно каждый месяц.') + '</span></div>';
    const packs = (d.forge_packs || []).map((p) =>
        `<button class="fw-pack" data-tfpack="${p.amount}">` +
        `<span class="fw-pack-a">${forgeAmount(p.amount, 15)}</span>` +
        `<span class="fw-pack-p">${cabNum(p.price)} ₽</span>` +
        (p.discount_pct > 0 ? `<span class="fw-pack-d">−${p.discount_pct}%</span>` : '') +
        `</button>`).join('');
    if (packs) {
        html += `<div class="tf-extras"><div class="tf-eh"><span class="et">${forgeIco(13)}</span> ${TR('Пополнить баланс Forge')}</div>` +
            `<div class="tf-sub" style="margin:-2px 0 10px;">${TR('Forge тратятся на генерацию, аудиты, подбор и анализ конкурентов')}</div>` +
            `<div class="fw-packs">${packs}</div>`;
        const prices = fwPriceRows(d.forge_prices);
        if (prices) html += `<div class="fw-sec fw-toggle" id="tf-prices-t">${TR('Сколько стоят действия')} <i class="ti ti-chevron-down"></i></div>` +
            `<div class="fw-prices" id="tf-prices" hidden>${prices}</div>`;
        const histRows = (d.forge_history || []).slice(0, 12).map(tx =>
            `<div class="fw-trow"><div class="fw-ti"><span>${escapeHtml(forgeTxLabel(tx))}</span>` +
            `<i>${escapeHtml(forgeTxDate(tx.created_at))}</i></div>` +
            `<b class="${tx.amount > 0 ? 'pos' : ''}">${tx.amount > 0 ? '+' : '−'}${cabNum(Math.abs(tx.amount))}</b></div>`).join('');
        if (histRows) html += `<div class="fw-sec fw-toggle" id="tf-hist-t">${TR('История операций')} <i class="ti ti-chevron-down"></i></div>` +
            `<div class="fw-hist" id="tf-hist" hidden>${histRows}</div>`;
        html += `</div>`;
    }
    html += tfCalculatorHtml(d);
    body.innerHTML = html;
    localizeTree(screens.tariffs);
    const tfPricesT = document.getElementById('tf-prices-t');
    if (tfPricesT) tfPricesT.addEventListener('click', () => {
        const box = document.getElementById('tf-prices');
        if (!box) return;
        hapticLight();
        box.hidden = !box.hidden;
        tfPricesT.classList.toggle('open', !box.hidden);
    });
    bindFwPriceRows('tf-prices');
    const tfHistT = document.getElementById('tf-hist-t');
    if (tfHistT) tfHistT.addEventListener('click', () => {
        const box = document.getElementById('tf-hist');
        if (!box) return;
        hapticLight();
        box.hidden = !box.hidden;
        tfHistT.classList.toggle('open', !box.hidden);
    });
    body.querySelectorAll('[data-tfpack]').forEach((btn) => btn.addEventListener('click', () => {
        const amount = parseInt(btn.getAttribute('data-tfpack'), 10);
        const pack = (d.forge_packs || []).find(p => p.amount === amount);
        if (!pack) return;
        hapticMed();
        openCheckout({
            name: `${amount.toLocaleString('ru-RU')} Forge`,
            price: pack.price, sub: false, icon: 'bolt', color: 'am',
            rowLabel: `Пополнение баланса · ${amount.toLocaleString('ru-RU')} Forge`,
            pay: { product_type: 'package', product_key: `forge_${amount}` },
        });
    }));
    wireTfCalc(d);
}


let _coCtx = null;

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
        <div class="co-title">${TR('Оформление заказа')}</div>
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
          <div class="co-row co-total"><span>${TR('К оплате')}</span><span class="co-sum">${cabNum(price)} ₽</span></div>
        </div>
        <div class="co-methods" style="display:flex;gap:8px;margin:10px 0 2px;">
          <button type="button" class="co-met" data-met="sbp" style="flex:1;min-height:42px;border-radius:11px;border:0.5px solid rgba(93,202,165,0.55);background:rgba(93,202,165,0.10);color:#e8eaf6;font-size:13px;font-weight:600;"><i class="ti ti-bolt"></i> ${TR('СБП')}</button>
          <button type="button" class="co-met" data-met="bank_card" style="flex:1;min-height:42px;border-radius:11px;border:0.5px solid rgba(255,255,255,0.14);background:transparent;color:#a9aec0;font-size:13px;font-weight:600;"><i class="ti ti-credit-card"></i> ${TR('Карта')}</button>
        </div>
        <button class="co-pay" data-copay="1"><i class="ti ti-credit-card"></i> Оплатить ${cabNum(price)} ₽</button>
        <button class="co-close">${TR('Закрыть')}</button>
    `;
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => { overlay.classList.add('visible'); sheet.classList.add('visible'); });
    _coCtx = { overlay, sheet, opts, method: 'sbp' };
    overlay.addEventListener('click', closeCheckout);
    sheet.querySelector('.co-close').addEventListener('click', closeCheckout);
    sheet.querySelectorAll('.co-met').forEach((mb) => mb.addEventListener('click', () => {
        if (!_coCtx || _coCtx.sheet !== sheet) return;
        hapticLight();
        _coCtx.method = mb.getAttribute('data-met');
        sheet.querySelectorAll('.co-met').forEach((b) => {
            const on = b === mb;
            b.style.border = on ? '0.5px solid rgba(93,202,165,0.55)' : '0.5px solid rgba(255,255,255,0.14)';
            b.style.background = on ? 'rgba(93,202,165,0.10)' : 'transparent';
            b.style.color = on ? '#e8eaf6' : '#a9aec0';
        });
    }));
    const payBtn = sheet.querySelector('[data-copay]');
    if (payBtn) payBtn.addEventListener('click', () => { hapticMed(); coPay(opts); });
}

function coPayPending(sheet, title, sub) {
    sheet.innerHTML = `
        <div class="bs-handle"></div>
        <div class="co-pend">
          <div class="co-pend-ic"><i class="ti ti-clock-hour-4"></i></div>
          <div class="co-pend-t">${escapeHtml(title)}</div>
          <div class="co-pend-s">${escapeHtml(sub)}</div>
          <button class="co-close">${TR('Закрыть')}</button>
        </div>
    `;
    sheet.querySelector('.co-close').addEventListener('click', closeCheckout);
}

function coPayDone(sheet, name) {
    sheet.innerHTML = `
        <div class="bs-handle"></div>
        <div class="co-pend">
          <div class="co-pend-ic ok"><i class="ti ti-circle-check"></i></div>
          <div class="co-pend-t">${TR('Оплачено')}</div>
          <div class="co-pend-s">${escapeHtml(name)} — доступ уже открыт.</div>
          <button class="co-close">${TR('Отлично')}</button>
        </div>
    `;
    sheet.querySelector('.co-close').addEventListener('click', () => {
        closeCheckout();
        loadDashboard();
        if (screens.tariffs && screens.tariffs.style.display !== 'none') { tariffsData = null; openTariffs(); }
    });
}

async function coWaitPayment(sheet, paymentId, name) {
    for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, i < 10 ? 2500 : 5000));
        if (!_coCtx || _coCtx.sheet !== sheet) return;
        let res = null;
        try {
            res = await apiRequest(`/api/v1/payment/check/${paymentId}`);
        } catch (e) { continue; }
        if (res && res.status === 'succeeded') {
            hapticMed();
            if (_coCtx) _coCtx.pendingId = null;
            coPayDone(sheet, name);
            return;
        }
        if (res && (res.status === 'canceled' || res.status === 'refunded')) {
            coPayPending(sheet, 'Платёж не прошёл', 'Оплата отменена. Кредиты, если списывались, вернулись на баланс.');
            return;
        }
    }
}

function coCancelPending(paymentId) {
    if (!paymentId) return Promise.resolve();
    return apiRequest(`/api/v1/payment/cancel/${paymentId}`, { method: 'POST' }).catch(() => {});
}


async function coPay(opts) {
    if (!_coCtx || !_coCtx.sheet) return;
    const sheet = _coCtx.sheet;

    if (opts.pay) {
        const btn = sheet.querySelector('[data-copay]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> ' + TR('Готовим оплату…'); }

        const payMethod = (_coCtx && _coCtx.method) || 'sbp';
        let res = null;
        try {
            res = await apiRequest('/api/v1/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...opts.pay, method: payMethod }),
            });
        } catch (e) { res = null; }
        if (res && res.ok === false && res.error === 'payment_create_failed') {
            try {
                res = await apiRequest('/api/v1/payment/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(opts.pay),
                });
            } catch (e) { res = null; }
        }
        if (!_coCtx || _coCtx.sheet !== sheet) return;
        if (res && res.ok && res.confirmation_url) {
            const paid = [];
            if (res.discount_rub) paid.push(`скидка −${cabNum(res.discount_rub)} ₽`);
            if (res.credits_used_rub) paid.push(`кредиты −${cabNum(res.credits_used_rub)} ₽`);
            const note = paid.length ? ` Учтено: ${paid.join(', ')}.` : '';
            coPayPending(sheet, 'Ожидаем оплату',
                `Открыли страницу оплаты на ${cabNum(res.amount_rub)} ₽.${note} Доступ откроется сразу после платежа.`);
            coWaitPayment(sheet, res.payment_id, opts.name);
            try {
                if (tg?.openLink) tg.openLink(res.confirmation_url); else window.open(res.confirmation_url, '_blank');
            } catch (e) { window.open(res.confirmation_url, '_blank'); }
            return;
        }
        const err = (res && res.error) || '';
        if (err === 'billing_not_ready') {
            coPayPending(sheet, 'Приём платежей подключается', 'Оплата станет доступна в ближайшее время.');
        } else {
            if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ti ti-credit-card"></i> Оплатить ${cabNum(opts.price)} ₽`; }
            cabToast(err === 'amount_too_small' ? 'Сумма слишком мала для оплаты' : 'Не удалось открыть оплату');
        }
        return;
    }

    sheet.innerHTML = `
        <div class="bs-handle"></div>
        <div class="co-pend">
          <div class="co-pend-ic"><i class="ti ti-clock-hour-4"></i></div>
          <div class="co-pend-t">${TR('Приём платежей подключается')}</div>
          <div class="co-pend-s">${TR('Оплата станет доступна в ближайшее время. Мы уведомим, когда оплата откроется.')}</div>
          <button class="co-close">${TR('Закрыть')}</button>
        </div>
    `;
    sheet.querySelector('.co-close').addEventListener('click', closeCheckout);
}

function closeCheckout() {
    if (!_coCtx) return;
    if (_coCtx.widget) { try { _coCtx.widget.destroy(); } catch (e) {} }
    if (_coCtx.pendingId) { coCancelPending(_coCtx.pendingId); _coCtx.pendingId = null; }
    const { overlay, sheet } = _coCtx;
    overlay.classList.remove('visible');
    sheet.classList.remove('visible');
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); if (sheet.parentNode) sheet.remove(); }, 300);
    _coCtx = null;
}


function setupEventListeners() {
    document.addEventListener('dragstart', function (e) { e.preventDefault(); }, { capture: true });
    document.addEventListener('drop', function (e) { e.preventDefault(); }, { capture: true });
    els.menuBtn.addEventListener('click', openDrawer);
    const hcBtn = document.getElementById('home-config-btn');
    if (hcBtn) hcBtn.addEventListener('click', openHomeConfig);
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

    const forgeChip = document.getElementById('forge-chip');
    if (forgeChip) forgeChip.addEventListener('click', openForgeSheet);

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
    state.post.emojiMode = 'auto';
    state.post.styleUserChoice = null;
    state.post.lastStyleApplied = false;

    if (els.postTopicInput) els.postTopicInput.value = '';
    if (els.postStyleInput) els.postStyleInput.value = '';
    if (els.postTopicCounter) els.postTopicCounter.textContent = '0';
    if (els.postStyleCounter) els.postStyleCounter.textContent = '0';
    setProfanity(false);
    setChipGroup('post-length-chips', 'auto');
    setChipGroup('post-emoji-chips', 'auto');
    setEmojiSwitch(true);
    const ctaHint = document.getElementById('post-cta-hint');
    if (ctaHint) ctaHint.classList.remove('hide');
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
        els.postLimitBanner.classList.add('plain');
        els.postLimitBanner.innerHTML = '<i class="ti ti-bolt"></i><span>' + TR('Загружаю баланс...') + '</span>';
    }

    state.post.useChannelStyle = true;
    state.post.activeChannel = null;

    renderPostChannelSelector(null);
    requestAnimationFrame(pgSegSyncAll);
    setTimeout(pgSegSyncAll, 350);

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
            els.postLimitBanner.innerHTML = '<i class="ti ti-bolt"></i><span>' + TR('Не удалось загрузить баланс') + '</span>';
            els.postLimitBanner.classList.add('exhausted', 'plain');
        }
    }
    updateCtaHint();
}


const POST_LENGTH_NOTES = {
    short: '≈ 300 знаков',
    medium: '≈ 650 знаков',
    long: '≈ 1300 знаков',
};

function updateLengthAutoNote(styleProfile) {
    const note = document.getElementById('post-length-note');
    if (!note) return;
    const len = state.post.length || 'auto';
    if (len === 'auto') {
        if (styleProfile && styleProfile.median_chars) {
            note.textContent = `Авто — как в канале (~${styleProfile.median_chars} знаков)`;
            note.style.display = '';
        } else {
            note.textContent = '';
            note.style.display = 'none';
        }
    } else {
        note.textContent = POST_LENGTH_NOTES[len] || '';
        note.style.display = POST_LENGTH_NOTES[len] ? '' : 'none';
    }
}


function setChipGroup(groupId, value) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.post-chip').forEach(ch => {
        ch.classList.toggle('on', ch.dataset.val === value);
    });
    pgSegSync(groupId);
}


function pgSegSync(groupId) {
    const group = document.getElementById(groupId);
    if (!group || !group.classList.contains('pg-seg')) return;
    let thumb = group.querySelector('.pg-seg-thumb');
    if (!thumb) {
        thumb = document.createElement('span');
        thumb.className = 'pg-seg-thumb';
        group.appendChild(thumb);
    }
    const on = group.querySelector('.post-chip.on');
    if (!on || !group.offsetWidth) {
        thumb.style.width = '0px';
        thumb.style.height = '0px';
        return;
    }
    if (!group.classList.contains('pg-grid')) {
        const chips = group.querySelectorAll('.post-chip');
        for (const ch of chips) {
            if (ch.scrollWidth > ch.clientWidth + 1) {
                group.classList.add('pg-grid');
                break;
            }
        }
    }
    thumb.style.width = on.offsetWidth + 'px';
    thumb.style.height = on.offsetHeight + 'px';
    thumb.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
}


function pgSegSyncAll() {
    pgSegSync('post-length-chips');
    pgSegSync('post-emoji-chips');
}


function setEmojiSwitch(on) {
    const sw = document.getElementById('post-emoji-switch');
    const wrap = document.getElementById('post-emoji-wrap');
    if (sw) {
        sw.classList.toggle('on', !!on);
        sw.dataset.active = String(!!on);
    }
    if (wrap) wrap.classList.toggle('closed', !on);
    const row = document.getElementById('post-emoji-row');
    if (row) row.classList.toggle('on', !!on);
    state.post.emoji = on ? (state.post.emojiMode || 'auto') : 'none';
    if (on) setTimeout(() => pgSegSync('post-emoji-chips'), 280);
}


function updateCtaHint() {
    const hint = document.getElementById('post-cta-hint');
    if (!hint) return;
    const topicEmpty = !els.postTopicInput || els.postTopicInput.value.trim().length === 0;
    const exhausted = !!(els.postLimitBanner && els.postLimitBanner.classList.contains('exhausted'));
    hint.classList.toggle('hide', !topicEmpty || exhausted);
}


document.addEventListener('click', function (e) {
    const seg = e.target.closest('[data-pmodel]');
    if (seg) setPostModel(seg.dataset.pmodel);
});


function setProfanity(on) {
    state.post.useProfanity = !!on;
    if (els.postProfanityToggle) {
        els.postProfanityToggle.classList.toggle('on', !!on);
        els.postProfanityToggle.dataset.active = String(!!on);
    }
    const row = document.getElementById('post-profanity-row');
    if (row) row.classList.toggle('on', !!on);
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
        showToast(TR('Не удалось получить идеи — попробуй ещё раз'), 'alert-triangle');
    } finally {
        btn.classList.remove('loading');
        if (iconEl) iconEl.className = 'ti ti-bulb';
    }
}

function renderTopicIdeas(ideas) {
    const list = document.getElementById('post-ideas-list');
    if (!list) return;
    if (!ideas.length) {
        showToast(TR('Не удалось получить идеи — попробуй ещё раз'), 'alert-triangle');
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
                    <div class="post-channel-selector-eyebrow">${TR('Канал не выбран')}</div>
                    <div class="post-channel-selector-title">${TR('Подключи канал')}</div>
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
        avatarHtml = `<div class="post-channel-selector-avatar">${escapeHtml(String(channel.title || 'К').trim().charAt(0).toUpperCase())}</div>`;
    }

    if (hasVoice) {
        container.innerHTML = `
            <div class="post-channel-selector has-style">
                ${avatarHtml}
                <div class="post-channel-selector-info">
                    <div class="post-channel-selector-eyebrow">${TR('Пишу в стиле')}</div>
                    <div class="post-channel-selector-title">${escapeHtml(channel.title || 'Канал')} <i class="ti ti-circle-check post-channel-selector-check"></i></div>
                </div>
                <i class="ti ti-chevron-down post-channel-selector-chev"></i>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="post-channel-selector no-style">
                ${avatarHtml}
                <div class="post-channel-selector-info">
                    <div class="post-channel-selector-eyebrow">${TR('Активный канал')}</div>
                    <div class="post-channel-selector-title">${escapeHtml(channel.title || 'Канал')} <i class="ti ti-alert-triangle post-channel-selector-warn"></i></div>
                    <div class="post-channel-selector-hint">
                        ${TR('Стиль не настроен — пишу нейтрально.')} <a href="#" data-pcs-upload="${channel.id}">${TR('Загрузить примеры →')}</a>
                    </div>
                </div>
                <i class="ti ti-chevron-down post-channel-selector-chev"></i>
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

    const styleUsable = hasVoice && !(state.post.limits && state.post.limits.channel_paused);
    renderStyleToggle(styleUsable, styleUsable);
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

    const lim = (state.post && state.post.limits) || {};
    const pausedNote = (!canEnable && lim.channel_paused)
        ? '<span class="post-style-why">' + TR('канал на паузе — стиль недоступен') + '</span>' : '';

    toggle.innerHTML = `
        <div class="post-style-toggle ${canEnable ? '' : 'disabled'}">
            <i class="ti ti-wand post-style-toggle-icon"></i>
            <span class="post-style-toggle-label">Использовать стиль канала${pausedNote}</span>
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


function postModelPrice(limits, model) {
    const l = limits || (state.post && state.post.limits) || {};
    return Number((model === 'standard' ? l.price_standard : l.price_premium) || 0);
}

function postActiveModel(limits) {
    const l = limits || (state.post && state.post.limits) || {};
    if (!l.can_choose_model) return l.premium_active ? 'premium' : 'standard';
    return state.post.model === 'standard' ? 'standard' : 'premium';
}

function setPostModel(model) {
    const l = (state.post && state.post.limits) || {};
    if (!l.can_choose_model) return;
    const next = model === 'standard' ? 'standard' : 'premium';
    if (state.post.model === next) return;
    state.post.model = next;
    hapticLight();
    renderLimitBanner(l);
}

function renderLimitBanner(limits) {
    if (!els.postLimitBanner) return;

    els.postLimitBanner.classList.remove('exhausted', 'warning', 'plain');

    const balance = Number(limits.balance || 0);
    const isTester = !!limits.is_tester;
    const canChoose = !!limits.can_choose_model;
    if (state.post.model == null && limits.default_model) state.post.model = limits.default_model;
    const model = postActiveModel(limits);
    const premium = model === 'premium';
    const price = postModelPrice(limits, model);
    setForgeBalance(balance);

    const enough = isTester || balance >= price;
    if (!enough) {
        els.postLimitBanner.classList.add('exhausted');
        if (els.postGenerateBtn) els.postGenerateBtn.disabled = true;
    } else if (els.postTopicInput && els.postTopicInput.value.trim().length > 0 && els.postGenerateBtn) {
        els.postGenerateBtn.disabled = false;
    }

    const right = `<span class="fw-inline-bal">${forgeAmount(balance, 14)}</span>`;

    let head;
    if (canChoose) {
        const seg = (key, ico, label) => {
            const p = postModelPrice(limits, key);
            return `<button class="pm-seg${model === key ? ' on' : ''}" data-pmodel="${key}">`
                + `<i class="ti ti-${ico}"></i><span>${label}</span>`
                + `<em>${forgeAmount(p, 11)}</em></button>`;
        };
        head = `<div class="pm-segs">${seg('premium', 'diamond', 'Премиум')}`
            + `${seg('standard', 'edit', 'Стандарт')}</div>`;
    } else {
        head = `<div class="limit-row-head">`
            + `<span class="limit-row-icon"><i class="ti ti-${premium ? 'diamond' : 'edit'}"></i></span>`
            + `<span class="limit-row-label">${premium ? 'Премиум-модель' : 'Стандартная модель'}</span>`
            + `${right}</div>`;
    }

    let note;
    if (!enough) {
        note = `<div class="fwb-note fwb-low">Не хватает Forge: нужно ${price}, `
            + `на балансе ${balance}. Пополни в кабинете.</div>`;
    } else {
        const left = price > 0 ? Math.floor(balance / price) : 0;
        const word = premium
            ? plural3(left, 'премиум-пост', 'премиум-поста', 'премиум-постов')
            : plural3(left, 'стандартный пост', 'стандартных поста', 'стандартных постов');
        note = `<div class="fwb-note">Баланса хватит на ${left} ${word}</div>`;
    }

    els.postLimitBanner.innerHTML = `
        <div class="limit-row limit-row-${premium ? 'purple' : 'green'}${enough ? '' : ' limit-row-exhausted'}">
            ${head}
            <div class="pm-foot">${note}${canChoose ? right : ''}</div>
        </div>`;
    updateGenerateBtnPrice();
    updateCtaHint();
}

function updateGenerateBtnPrice() {
    if (!els.postGenerateBtn) return;
    const l = (state.post && state.post.limits) || {};
    const tag = els.postGenerateBtn.querySelector('.pm-btn-price');
    if (!l.price_premium) {
        if (tag) tag.remove();
        return;
    }
    const html = forgeAmount(postModelPrice(l, postActiveModel(l)), 14);
    if (tag) {
        tag.innerHTML = html;
    } else {
        const el = document.createElement('span');
        el.className = 'pm-btn-price';
        el.innerHTML = html;
        els.postGenerateBtn.appendChild(el);
    }
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

function _splitDialogText(message) {
    const parts = String(message || '').split('\n\n');
    return { title: (parts[0] || '').trim(), body: parts.slice(1).join('\n\n').trim() };
}


function confirmDialog(message, okText) {
    message = _trDialog(message);
    const t = _splitDialogText(message);
    const danger = /удал|снят|отмен|прекрат|отключ|очист/i.test(t.title);
    return actionSheet({
        title: t.title,
        message: t.body,
        actions: [
            { id: 'ok', text: _trDialog(okText || 'Подтвердить'), icon: danger ? 'trash' : 'check',
              style: danger ? 'danger' : 'default' },
            { id: 'cancel', text: _trDialog('Отмена'), style: 'cancel' },
        ],
    }).then((r) => r === 'ok');
}


function alertDialog(message) {
    message = _trDialog(message);
    const t = _splitDialogText(message);
    return actionSheet({
        title: t.title,
        message: t.body,
        actions: [{ id: 'ok', text: _trDialog('Понятно'), style: 'cancel' }],
    }).then(() => undefined);
}

function alertDialogHtml(title, bodyHtml) {
    return actionSheet({
        title: _trDialog(title), message: bodyHtml, html: true,
        actions: [{ id: 'ok', text: _trDialog('Понятно'), style: 'cancel' }],
    }).then(() => undefined);
}

function confirmDialogHtml(title, bodyHtml, okText) {
    return actionSheet({
        title: _trDialog(title), message: bodyHtml, html: true,
        actions: [
            { id: 'ok', text: _trDialog(okText || 'Подтвердить'), icon: 'check', style: 'default' },
            { id: 'cancel', text: _trDialog('Отмена'), style: 'cancel' },
        ],
    }).then((r) => r === 'ok');
}
window.alertDialogHtml = alertDialogHtml;
window.confirmDialogHtml = confirmDialogHtml;


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
                    <button class="channels-deleted-restore" onclick="window.__restoreChannel&&window.__restoreChannel(${ch.id})">${TR('Вернуть')}</button>
                    <button class="channels-deleted-purge" onclick="window.__purgeChannel&&window.__purgeChannel(${ch.id}, ${escapeHtml(JSON.stringify(ch.title || 'Канал'))})">${TR('Удалить полностью')}</button>
                </div>
            </div>
        `;
    }).join('');

    box.innerHTML = `
        <div class="channels-deleted-label">${TR('Недавно удалённые')}</div>
        <div class="channels-deleted-hint">${TR('Каналы хранятся 7 дней, потом стираются из системы. Переподключить можно в любой момент, добавив бота админом — настройки соберутся заново.')}</div>
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
            `Удалить канал «${title}»?\n\nКанал переедет в «Недавно удалённые», данные сохранятся 7 дней. Переподключить можно в любой момент.`
        );
        if (confirmed) {
            doSoftDeleteChannel(channelId);
        }
    }
};


function actionSheet(opts) {
    opts = opts || {};
    return new Promise((resolve) => {
        const prevOv = document.body.style.overflow;
        const overlay = document.createElement('div');
        overlay.className = 'bs-overlay';
        const sheet = document.createElement('div');
        sheet.className = 'bs-sheet as-sheet';
        const rows = (opts.actions || []).map((a) => {
            const cls = 'as-item' + (a.style === 'danger' ? ' danger' : '') + (a.style === 'cancel' ? ' cancel' : '');
            const ic = a.icon ? `<i class="ti ti-${a.icon}"></i>` : '';
            const sub = a.sub ? `<span class="as-sub">${escapeHtml(a.sub)}</span>` : '';
            return `<button class="${cls}" data-as="${a.id}">${ic}<span class="as-txt">${escapeHtml(a.text)}${sub}</span></button>`;
        }).join('');
        sheet.innerHTML = `
            <div class="bs-handle"></div>
            ${opts.title ? `<div class="as-title">${escapeHtml(opts.title)}</div>` : ''}
            ${opts.message ? `<div class="as-msg">${opts.html ? opts.message : escapeHtml(opts.message)}</div>` : ''}
            <div class="as-list">${rows}</div>
        `;
        document.body.appendChild(overlay);
        document.body.appendChild(sheet);
        document.documentElement.classList.add('cs-modal-open');
        document.body.classList.add('cs-modal-open');
        requestAnimationFrame(() => { overlay.classList.add('visible'); sheet.classList.add('visible'); });

        const close = (val) => {
            overlay.classList.remove('visible');
            sheet.classList.remove('visible');
            document.documentElement.classList.remove('cs-modal-open');
            document.body.classList.remove('cs-modal-open');
            document.body.style.overflow = prevOv;
            setTimeout(() => { if (overlay.parentNode) overlay.remove(); if (sheet.parentNode) sheet.remove(); }, 280);
            resolve(val);
        };
        overlay.addEventListener('click', () => close('cancel'));
        sheet.querySelectorAll('[data-as]').forEach((b) => {
            b.addEventListener('click', () => { hapticLight(); close(b.getAttribute('data-as')); });
        });
        sheet.querySelectorAll('[data-go]').forEach((a) => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const fn = a.getAttribute('data-go');
                hapticLight();
                close('go');
                setTimeout(() => { if (typeof window[fn] === 'function') window[fn](); }, 200);
            });
        });
    });
}

function showChannelMenuPopup(title) {
    return actionSheet({
        title: title,
        message: 'Что сделать с каналом?',
        actions: [
            { id: 'refresh_voice', text: 'Обновить стиль письма', icon: 'refresh',
              sub: 'Перечитать последние посты и обновить манеру' },
            { id: 'delete', text: 'Удалить канал', icon: 'trash', style: 'danger',
              sub: 'Переедет в «Недавно удалённые» на 7 дней' },
            { id: 'cancel', text: 'Отмена', style: 'cancel' },
        ],
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


function _voicePriceCoin() {
    const p = (_settingsState.data && _settingsState.data.voice_refresh_limits
               && _settingsState.data.voice_refresh_limits.price)
        || (state.channels && state.channels.voice_refresh_limits && state.channels.voice_refresh_limits.price)
        || 15;
    return (typeof window.forgeAmount === 'function') ? window.forgeAmount(p, 12) : String(p);
}

window.__refreshVoice = async function (channelId, title) {
    const confirmed = await confirmDialogHtml(
        'Пересобрать стиль',
        `Стиль канала «${escapeHtml(title || '')}» будет заменён свежим. Спишется ${_voicePriceCoin()}.`,
        'Списать и пересобрать'
    );
    if (!confirmed) return;
    try {
        await apiRequest(`/api/v1/channels/${channelId}/voice/refresh`, { method: 'POST' });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');
        await openChannels();
        startVoicePollingIfNeeded();
    } catch (e) {
        const msg = (e?.message || '').includes('429')
            ? 'Не хватает Forge на обновление стиля. Пополни баланс в кабинете.'
            : 'Не удалось обновить стиль. Попробуй позже.';
        await alertDialog(msg);
    }
};


function renderAddMoreOrLimit(data) {
    const btn = els.channelsAddMore;
    if (!btn) return;

    const limit = data.channel_limit || 100;
    const used = data.channels_used != null ? data.channels_used : (data.channels || []).length;
    const canAdd = data.can_add_more !== false;

    let limitBox = document.getElementById('channels-limit-box');
    if (!limitBox) {
        limitBox = document.createElement('div');
        limitBox.id = 'channels-limit-box';
        limitBox.className = 'channels-limit-box';
        btn.parentNode.insertBefore(limitBox, btn.nextSibling);
    }

    if (canAdd) {
        btn.style.display = '';
        limitBox.innerHTML = `<div class="channels-limit-sub" style="text-align:center;">Каналов подключено: ${used} из ${limit}</div>`;
        limitBox.style.display = '';
        return;
    }

    btn.style.display = 'none';
    limitBox.innerHTML = `
        <div class="channels-limit-icon"><i class="ti ti-lock"></i></div>
        <div class="channels-limit-title">Каналов подключено: ${used} из ${limit}</div>
        <div class="channels-limit-sub">${TR('Достигнут предел подключений. Отключи один из каналов, чтобы добавить новый.')}</div>
    `;
    limitBox.style.display = '';
}


function renderVoiceStatus(ch) {
    const status = ch.voice_status || 'idle';
    const quality = ch.voice_quality;
    const n = ch.voice_posts_analyzed || 0;

    if (status === 'collecting') {
        return `<span class="channel-card-feat-val voice-collecting"><span class="voice-pulse-dot"></span>${TR('Настраивается...')}</span>`;
    }

    if (status === 'done' && quality === 'full') {
        return `<span class="channel-card-feat-val ok"><i class="ti ti-check"></i> ${TR('Настроен')}</span>`;
    }

    if (status === 'done' && quality === 'weak') {
        return `<span class="channel-card-feat-val warn">${TR('Слабый — мало материала')}</span>`;
    }

    if (status === 'done' && quality === 'strategy') {
        return `<span class="channel-card-feat-val ok"><i class="ti ti-check"></i> ${TR('Задан стратегом')}</span>`;
    }

    if (status === 'failed' && quality === 'private') {
        return `<span class="channel-card-feat-val warn">${TR('Приватный — загрузи примеры')}</span>`;
    }

    if (status === 'failed' && quality === 'no_text') {
        return `<span class="channel-card-feat-val warn">${TR('Нет текста в постах')}</span>`;
    }

    if (status === 'failed' && quality === 'no_posts') {
        return `<span class="channel-card-feat-val warn">${TR('Постов пока нет')}</span>`;
    }

    if (status === 'pending') {
        return `<span class="channel-card-feat-val warn">${TR('Соберём при пополнении баланса')}</span>`;
    }

    if (ch.has_voice) {
        return `<span class="channel-card-feat-val ok"><i class="ti ti-check"></i> ${TR('Настроен')}</span>`;
    }

    return `<span class="channel-card-feat-val warn">${TR('Не настроен')}</span>`;
}


let _voicePollTimer = null;

function startVoicePollingIfNeeded() {
    if (_voicePollTimer) return;
    _voicePollTimer = setInterval(async () => {


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
        renderChannels(data);
    } catch (e) {}
}

let _emptyChWatch = null;
let _emptyChWatchN = 0;

function startEmptyChannelsWatch() {
    if (_emptyChWatch) return;
    _emptyChWatchN = 0;
    _emptyChWatch = setInterval(async () => {
        if (!_channelsScreenActive()) { stopEmptyChannelsWatch(); return; }
        if (document.hidden) return;
        if (++_emptyChWatchN > 40) { stopEmptyChannelsWatch(); return; }
        try {
            const data = await apiRequest('/api/v1/channels');
            if (data && data.has_any && data.channels && data.channels.length) {
                stopEmptyChannelsWatch();
                state.channels = data;
                renderChannels(data);
            }
        } catch (e) {}
    }, 5000);
}

function stopEmptyChannelsWatch() {
    if (_emptyChWatch) { clearInterval(_emptyChWatch); _emptyChWatch = null; }
}

function initChannelsAutoRefresh() {

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
        badge = `<div class="channel-card-badge paused"><i class="ti ti-player-pause"></i><span>${TR('На паузе')}</span></div>`;
    } else if (connected) {
        badge = `<div class="channel-card-badge connected"><i class="ti ti-circle-check"></i><span>${TR('Подключён')}</span></div>`;
    } else {
        badge = `<div class="channel-card-badge demo"><i class="ti ti-eye"></i><span>${TR('Только анализ')}</span></div>`;
    }

    const okIcon = `<i class="ti ti-check"></i> ${TR('Доступно')}`;
    const lockTxt = `<i class="ti ti-lock"></i> ${TR('Нужен бот-админ')}`;

    let feats = '';
    if (connected) {
        const pub = ch.bot_can_post
            ? `<span class="channel-card-feat-val ok">${okIcon}</span>`
            : `<span class="channel-card-feat-val warn">${TR('Нет прав на публикацию')}</span>`;
        const voice = renderVoiceStatus(ch);
        feats = `
            <div class="channel-card-feat"><span class="channel-card-feat-label">${TR('Публикация постов')}</span>${pub}</div>
            <div class="channel-card-feat"><span class="channel-card-feat-label">${TR('Автопостинг')}</span>${ch.bot_can_post ? `<span class="channel-card-feat-val ok ap-qlink" onclick="event.stopPropagation();window.__openQueue&&window.__openQueue(${ch.id})">Очередь публикаций <i class="ti ti-chevron-right"></i></span>` : `<span class="channel-card-feat-val locked">${lockTxt}</span>`}</div>
            <div class="channel-card-feat"><span class="channel-card-feat-label">${TR('Стиль письма')}</span>${voice}</div>
        `;
    } else {
        feats = `
            <div class="channel-card-feat"><span class="channel-card-feat-label">${TR('Анализ и стиль')}</span><span class="channel-card-feat-val ok">${okIcon}</span></div>
            <div class="channel-card-feat"><span class="channel-card-feat-label">${TR('Публикация постов')}</span><span class="channel-card-feat-val locked">${lockTxt}</span></div>
            <div class="channel-card-feat"><span class="channel-card-feat-label">${TR('Автопостинг')}</span><span class="channel-card-feat-val locked">${lockTxt}</span></div>
        `;
    }

    const warning = connected ? '' : `
        <div class="channels-demo-warning">
            <i class="ti ti-flask"></i>
            <div>
                <div class="channels-demo-warning-title">${TR('Демо-режим')}</div>
                <div class="channels-demo-warning-text">${TR('Анализ и стиль работают. Для публикации и автопостинга добавь бота админом.')}</div>
            </div>
        </div>`;

    const cta = connected ? '' : `
        <div class="channels-cta">
            <div class="channels-cta-text">${TR('Хочешь публиковать и автопостить?')}</div>
            <button class="channels-cta-btn" onclick="window.__toggleListInstruction&&window.__toggleListInstruction()">${TR('Как подключить полностью →')}</button>
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
                <button class="channel-card-menu" onclick="event.stopPropagation();window.__channelMenu&&window.__channelMenu(${ch.id}, ${escapeHtml(JSON.stringify(ch.title || 'Канал'))})">
                    <i class="ti ti-dots-vertical"></i>
                </button>
            </div>
            <div class="channel-card-feats">${feats}</div>
        </div>
        ${cta}
    `;
}


window.__openQueue = function (channelId) { openQueueSheet(channelId); };


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
            <div>${TR('Загружаю настройки канала...')}</div>
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
        if (window.__csFocusVoices) {
            window.__csFocusVoices = false;
            setTimeout(() => {
                const sv = document.getElementById('cs-voice-sec');
                if (sv) {
                    sv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    sv.classList.add('cs-vflash');
                    setTimeout(() => sv.classList.remove('cs-vflash'), 1900);
                }
            }, 350);
        }
    } catch (e) {
        host.innerHTML = `
            <div class="channel-settings-loading">
                <i class="ti ti-alert-triangle" style="font-size: 28px; color: #F0997B;"></i>
                <div>${TR('Не удалось загрузить настройки')}</div>
                <button class="cs-errback" onclick="closeChannelSettings()"><i class="ti ti-arrow-left"></i><span>${TR('Назад')}</span></button>
            </div>
        `;
    }
}


function closeChannelSettings() {
    stopVoiceSample();
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
    } catch (e) {}
}


let _bsActiveContext = null;


window.showBottomSheet = showBottomSheet;

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
                <div>${TR('Нет каналов для выбора')}</div>
            </div>
        `;
    } else {
        itemsHtml = '<div class="bs-list">' + items.map(it => {
            const isActive = it.id === activeId;
            const avatarHtml = it.has_avatar
                ? `<div class="bs-item-avatar" data-avatar-bs="${it.id}"><i class="ti ti-brand-telegram"></i></div>`
                : (it.is_private
                    ? `<div class="bs-item-avatar private"><i class="ti ti-lock"></i></div>`
                    : `<div class="bs-item-avatar">${escapeHtml(String(it.title || 'К').trim().charAt(0).toUpperCase())}</div>`);

            const sub = it.subtitle_warn
                ? `<div class="bs-item-subtitle warn">${escapeHtml(it.subtitle || '')}</div>`
                : (it.subtitle ? `<div class="bs-item-subtitle">${escapeHtml(it.subtitle)}</div>` : '');

            const rightIcon = isActive
                ? `<i class="ti ti-circle-check bs-item-icon-right check"></i>`
                : `<i class="ti ti-chevron-right bs-item-icon-right"></i>`;

            const pausedChip = it.paused
                ? `<span class="bs-item-chip"><i class="ti ti-player-pause"></i>${TR('Пауза')}</span>`
                : '';

            return `
                <div class="bs-item ${isActive ? 'active' : ''}${it.paused ? ' paused' : ''}" data-bs-item-id="${it.id}">
                    ${avatarHtml}
                    <div class="bs-item-info">
                        <div class="bs-item-title">${escapeHtml(it.title || 'Канал')}${pausedChip}</div>
                        ${sub}
                    </div>
                    ${rightIcon}
                </div>
            `;
        }).join('') + '</div>';
    }

    const needSearch = !!(items && items.length > 6);
    const searchHtml = needSearch
        ? `<div class="bs-search"><i class="ti ti-search"></i>
             <input type="text" id="bs-search-input" placeholder="${escapeHtml('Найти канал')}"
                    autocomplete="off" spellcheck="false">
             <span class="bs-search-count" id="bs-search-count">${items.length}</span></div>`
        : '';

    sheet.innerHTML = `
        <div class="bs-handle"></div>
        <div class="bs-title">${escapeHtml(title || 'Выбери канал')}</div>
        ${subtitle ? `<div class="bs-subtitle">${escapeHtml(subtitle)}</div>` : ''}
        ${searchHtml}
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

    if (needSearch) {
        const input = sheet.querySelector('#bs-search-input');
        const counter = sheet.querySelector('#bs-search-count');
        const rows = Array.from(sheet.querySelectorAll('.bs-item'));
        const titles = rows.map((r) => {
            const it = items.find((x) => String(x.id) === r.dataset.bsItemId) || {};
            return ((it.title || '') + ' ' + (it.subtitle || '')).toLowerCase();
        });
        if (input) {
            input.addEventListener('input', () => {
                const q = input.value.trim().toLowerCase();
                let shown = 0;
                rows.forEach((r, i) => {
                    const hit = !q || titles[i].indexOf(q) >= 0;
                    r.style.display = hit ? '' : 'none';
                    if (hit) shown++;
                });
                if (counter) counter.textContent = String(shown);
                const empty = sheet.querySelector('.bs-noresult');
                if (!shown && !empty) {
                    const d = document.createElement('div');
                    d.className = 'bs-noresult';
                    d.textContent = 'Ничего не нашлось';
                    sheet.querySelector('.bs-list').appendChild(d);
                } else if (shown && empty) {
                    empty.remove();
                }
            });
        }
    }

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


window.loadChannelAvatar = function (channelId, node) {
    return loadBottomSheetAvatar(channelId, node);
};

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


let _chSelectorBusy = false;

async function openActiveChannelSelector(opts) {
    opts = opts || {};
    if (_chSelectorBusy) return;
    _chSelectorBusy = true;
    const selector = document.querySelector('.post-channel-selector');
    if (selector) selector.classList.add('loading');
    try {
        const data = await apiRequest('/api/v1/channels/active');

        if (!data.channels || data.channels.length === 0) {
            if (typeof openChannels === 'function') openChannels();
            return;
        }

        const items = data.channels.map(ch => {
            let subtitle = '';
            let warn = false;
            if (ch.is_paused) {
                subtitle = 'На паузе';
                warn = true;
            } else if (ch.voice_status === 'done' && ch.voice_preview) {
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
                paused: !!ch.is_paused,
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




                    try { window.__fmActiveChannelId = channelId; } catch (e) {}
                    try { if (typeof window.__fmxActiveChannelChanged === 'function') window.__fmxActiveChannelChanged(); } catch (e) {}
                    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('light');
                    if (typeof opts.onChanged === 'function') {
                        opts.onChanged(channelId);
                    } else {
                        await loadDashboard();
                    }
                } catch (e) {
                    showToast(TR('Не удалось переключить канал'), 'alert-triangle');
                }
            },
        });
    } catch (e) {
        showToast(TR('Не удалось загрузить каналы'), 'alert-triangle');
    } finally {
        _chSelectorBusy = false;
        if (selector) selector.classList.remove('loading');
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
            : `<div class="cs-avatar cs-avatar-letters">${escapeHtml(String(data.title || 'К').trim().charAt(0).toUpperCase())}</div>`);

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
    const price = Number((limits && limits.price) || 0);
    if (!price) return '';
    const balance = Number(limits.balance || 0);
    const enough = balance >= price;
    const left = Math.floor(balance / price);
    const note = enough
        ? `Баланса хватит на ${left} ${plural3(left, 'обновление', 'обновления', 'обновлений')}`
        : `Не хватает Forge: нужно ${price}, на балансе ${balance}`;

    return `
        <div class="cs-limits-bar limit-row limit-row-green${enough ? '' : ' limit-row-exhausted'}">
            <div class="limit-row-head">
                <span class="limit-row-icon"><i class="ti ti-refresh"></i></span>
                <span class="limit-row-label">${TR('Обновление стиля')}<span class="cs-limit-price">${forgeAmount(price, 12)}</span></span>
                <span class="fw-inline-bal">${forgeAmount(balance, 14)}</span>
            </div>
            <div class="fwb-note${enough ? '' : ' fwb-low'}">${note}</div>
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
            : (quality === 'strategy'
                ? 'задан стратегом · пересоберётся по постам'
                : `${postsAnalyzed} постов · слабый стиль`);
        statusBadge = `
            <div class="cs-status-line cs-status-ok">
                <i class="ti ti-circle-check"></i>
                <span>${TR('Стиль настроен')}</span>
                <span class="cs-status-meta">${qualityLabel}</span>
            </div>
        `;
        bodyHtml = `
            <div class="cs-voice-card">
                <div class="cs-voice-text" id="cs-voice-text">${escapeHtml(data.voice_summary)}</div>
                <div class="cs-voice-actions">
                    <button class="cs-btn-ghost" id="cs-voice-edit"><i class="ti ti-edit"></i> ${TR('Изменить')}</button>
                    <button class="cs-btn-accent-ghost" id="cs-voice-refresh"><i class="ti ti-refresh"></i> ${TR('Пересобрать')}</button>
                </div>
            </div>
        `;
    } else if (status === 'collecting') {
        statusBadge = `
            <div class="cs-status-line cs-status-collecting">
                <span class="voice-pulse-dot"></span>
                <span>${TR('Стиль собирается...')}</span>
            </div>
        `;
    } else if (status === 'failed' && quality === 'private') {
        statusBadge = `
            <div class="cs-status-line cs-status-warn">
                <i class="ti ti-alert-triangle"></i>
                <div>
                    <div class="cs-status-warn-title">${TR('Стиль не настроен')}</div>
                    <div class="cs-status-warn-text">${TR('Канал приватный — я не могу прочитать историю. Загрузи 3-5 примеров постов чтобы AI понял твой стиль.')}</div>
                </div>
            </div>
        `;
    } else if (status === 'failed' && quality === 'no_posts') {
        statusBadge = `
            <div class="cs-status-line cs-status-warn">
                <i class="ti ti-alert-triangle"></i>
                <div>
                    <div class="cs-status-warn-title">${TR('Постов пока нет')}</div>
                    <div class="cs-status-warn-text">${TR('В канале нет постов для анализа. Опубликуй несколько постов и нажми «Пересобрать», или загрузи примеры вручную.')}</div>
                </div>
            </div>
        `;
    } else if (status === 'failed') {
        statusBadge = `
            <div class="cs-status-line cs-status-warn">
                <i class="ti ti-alert-triangle"></i>
                <div>
                    <div class="cs-status-warn-title">${TR('Не удалось настроить стиль')}</div>
                    <div class="cs-status-warn-text">${TR('Попробуй загрузить примеры вручную.')}</div>
                </div>
            </div>
        `;
    } else {
        statusBadge = `
            <div class="cs-status-line cs-status-neutral">
                <i class="ti ti-clock"></i>
                <span>${TR('Стиль ещё не настроен')}</span>
            </div>
        `;
    }

    return `
        <div class="cs-section">
            <div class="cs-section-title">${TR('Стиль письма')}</div>
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
    const price = Number((data.voice_refresh_limits || {}).price || 0);
    const priceHint = price ? `<span class="cs-section-hint">${forgeAmount(price, 12)}</span>` : '';

    return `
        <div class="cs-section">
            <div class="cs-section-title-row">
                <span class="cs-section-title ${accent ? 'cs-section-title-accent' : ''}">${headerIcon}${headerLabel}</span>
                ${priceHint}
            </div>
            <div class="cs-examples-card ${accent ? 'cs-examples-card-accent' : ''}">
                <textarea
                    id="cs-examples-text"
                    class="cs-examples-textarea"
                    placeholder="Вставь сюда 3-5 своих постов как примеры стиля. Разделяй их пустой строкой или ---"
                    maxlength="5000"
                ></textarea>
                <div class="cs-examples-footer">
                    <span class="cs-examples-count" id="cs-examples-count">${TR('0 / 5000 символов')}</span>
                    <button class="cs-btn-primary" id="cs-examples-apply" disabled>${TR('Применить')}</button>
                </div>
            </div>
        </div>
    `;
}


function renderSettingsBehaviorSection(data) {
    const paused = !!data.is_paused;
    const profanity = !!data.use_profanity_default;
    const openPolls = !!data.open_polls;
    const research = !!data.research_links;

    return `
        <div class="cs-section">
            <div class="cs-section-title">${TR('Поведение')}</div>

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
                        ${TR('Когда канал на паузе, контент-план ничего не публикует автоматически. Бот остаётся подключённым, настройки и стиль сохраняются.')}
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
                        <span class="cs-toggle-title">${TR('Нецензурная лексика')}</span>
                        <button class="cs-info-btn" data-info="profanity" aria-label="Что это значит"><i class="ti ti-info-circle"></i></button>
                    </div>
                    <div class="cs-toggle-sub">${profanity ? 'Разрешена по умолчанию' : 'Запрещена по умолчанию'}</div>
                    <div class="cs-info-popup" id="cs-info-profanity" style="display:none;">
                        ${TR('Если включено, AI будет использовать ненормативную лексику в постах по умолчанию. Можно отдельно переопределить для конкретного поста на экране генерации. Подходит для каналов с резким разговорным стилем.')}
                    </div>
                </div>
                <button class="cs-toggle-switch ${profanity ? 'on' : ''}" data-toggle-target="profanity">
                    <span class="cs-toggle-knob"></span>
                </button>
            </div>

            <div class="cs-toggle-row" data-toggle="polls">
                <div class="cs-toggle-icon-wrap">
                    <i class="ti ti-message-circle" style="color: ${openPolls ? '#818cf8' : 'rgba(255,255,255,0.4)'};"></i>
                </div>
                <div class="cs-toggle-info">
                    <div class="cs-toggle-title-row">
                        <span class="cs-toggle-title">${TR('Открытые опросы')}</span>
                        <button class="cs-info-btn" data-info="polls" aria-label="Что это значит"><i class="ti ti-info-circle"></i></button>
                    </div>
                    <div class="cs-toggle-sub">${openPolls ? 'Разрешены вопросы в комментарии' : 'Только анонимные опросы реакциями'}</div>
                    <div class="cs-info-popup" id="cs-info-polls" style="display:none;">
                        ${TR('Открытый опрос — вопрос с ответами в комментариях: он раскрывает анонимность и обычно собирает меньше откликов. По умолчанию AI завершает посты анонимными опросами через реакции. Включай, если аудитория канала активно пишет в комментариях.')}
                    </div>
                </div>
                <button class="cs-toggle-switch ${openPolls ? 'on' : ''}" data-toggle-target="polls">
                    <span class="cs-toggle-knob"></span>
                </button>
            </div>

            <div class="cs-toggle-row" data-toggle="research">
                <div class="cs-toggle-icon-wrap">
                    <i class="ti ti-microscope" style="color: ${research ? '#5DCAA5' : 'rgba(255,255,255,0.4)'};"></i>
                </div>
                <div class="cs-toggle-info">
                    <div class="cs-toggle-title-row">
                        <span class="cs-toggle-title">${TR('Ссылки на исследования')}</span>
                        <button class="cs-info-btn" data-info="research" aria-label="Что это значит"><i class="ti ti-info-circle"></i></button>
                    </div>
                    <div class="cs-toggle-sub">${research ? 'Включены — исследования добавляют 20 Forge к цене поста' : 'Выключены — обычная цена поста'}</div>
                    <div class="cs-info-popup" id="cs-info-research" style="display:none;">
                        ${TR('Подходит каналам, где посты опираются на проверяемые факты: наука и научпоп, медицина, биохакинг, психология, космос, биология и животные, IT, инженерия, авто (масла, топливо, узлы), строительство и материалы. Система живым поиском находит 1-3 первоисточника в авторитетных научных изданиях и базах, проверяет каждую ссылку и оформляет в манере канала; если подтверждённых работ не нашлось — разница возвращается за вычетом сбора за поиск. Юмору, влогам и анонсам не подойдёт: научных утверждений там нет.')}
                    </div>
                </div>
                <button class="cs-toggle-switch ${research ? 'on' : ''}" data-toggle-target="research">
                    <span class="cs-toggle-knob"></span>
                </button>
            </div>
        </div>
        ${renderVoicePickSection(data)}
        ${renderTzSection(data)}
    `;
}

function renderVoicePickSection(data) {
    const cat = data.voice_catalog || [];
    if (!cat.length) return '';
    const sel = new Set(data.creative_voices || []);
    const col = (g, label) => {
        const rows = cat.filter(v => v.gender === g).map(v => `
            <div class="cs-vrow ${sel.has(v.name) ? 'on' : ''}" data-vname="${v.name}">
                <button class="cs-vplay" data-vplay="1" data-src="${v.sample_url}" aria-label="Пример голоса"><i class="ti ti-player-play-filled"></i></button>
                <span class="cs-vnm"><b>${escapeHtml(v.label)}</b><span>${escapeHtml(v.note)}</span></span>
                <span class="cs-vchk"><i class="ti ti-check"></i></span>
            </div>`).join('');
        return `<div class="cs-vcol"><div class="cs-vcolh"><s>${label}</s><u data-vall="${g}">${TR('все')}</u></div>${rows}</div>`;
    };
    return `
        <div class="cs-section" id="cs-voice-sec">
            <div class="cs-section-title">${TR('Озвучка роликов')} <span class="cs-vsum" id="cs-vsum">${sel.size ? 'выбрано ' + sel.size : 'по рассказчику поста'}</span></div>
            <div class="cs-vcols">${col('male', 'Мужские')}${col('female', 'Женские')}</div>
            <div class="cs-vfoot">${TR('Отмеченные голоса читают ролики по очереди, без повтора подряд: «Другой вариант» всегда получает другой голос. Если не отмечено ничего — голос подбирается по рассказчику поста: мужской род — Антон, женский — Марина, без явного рода — Антон; варианты чередуют голоса того же пола.')}</div>
        </div>`;
}

let _voiceAudio = null, _voiceAudioBtn = null;

function stopVoiceSample() {
    if (_voiceAudio) { try { _voiceAudio.pause(); } catch (e) {} _voiceAudio = null; }
    if (_voiceAudioBtn) {
        _voiceAudioBtn.innerHTML = '<i class="ti ti-player-play-filled"></i>';
        _voiceAudioBtn.classList.remove('act');
        _voiceAudioBtn = null;
    }
}

function toggleVoiceSample(btn) {
    if (_voiceAudioBtn === btn) { stopVoiceSample(); return; }
    stopVoiceSample();
    const a = new Audio(btn.getAttribute('data-src'));
    _voiceAudio = a;
    _voiceAudioBtn = btn;
    btn.innerHTML = '<i class="ti ti-player-stop-filled"></i>';
    btn.classList.add('act');
    a.onended = stopVoiceSample;
    a.onerror = stopVoiceSample;
    a.play().catch(stopVoiceSample);
}

async function saveVoicePick(sec) {
    const names = [...sec.querySelectorAll('.cs-vrow.on')].map(r => r.getAttribute('data-vname'));
    const sum = document.getElementById('cs-vsum');
    if (sum) sum.textContent = names.length ? ('выбрано ' + names.length) : 'по рассказчику поста';
    if (_settingsState.data) _settingsState.data.creative_voices = names;
    try {
        await apiRequest(`/api/v1/channels/${_settingsState.channelId}`, {
            method: 'PATCH',
            body: JSON.stringify({ creative_voices: names }),
            headers: { 'Content-Type': 'application/json' },
        });
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('light');
    } catch (e) {
        showToast(TR('Не удалось сохранить голоса'), 'alert-triangle');
    }
}

function bindVoicePick() {
    const sec = document.getElementById('cs-voice-sec');
    if (!sec) return;
    sec.querySelectorAll('.cs-vrow').forEach(row => {
        row.addEventListener('click', async (e) => {
            if (e.target.closest('[data-vplay]')) return;
            row.classList.toggle('on');
            await saveVoicePick(sec);
        });
    });
    sec.querySelectorAll('[data-vall]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const g = btn.getAttribute('data-vall');
            const rows = [...sec.querySelectorAll('.cs-vcol')].filter(c => c.contains(btn))[0].querySelectorAll('.cs-vrow');
            const allOn = [...rows].every(r => r.classList.contains('on'));
            rows.forEach(r => r.classList.toggle('on', !allOn));
            await saveVoicePick(sec);
        });
    });
    sec.querySelectorAll('[data-vplay]').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); toggleVoiceSample(btn); });
    });
}

const TZ_ZONES = [
    [120, 'Калининград'], [180, 'Москва'], [180, 'Минск'], [180, 'Киев'], [180, 'Стамбул'],
    [240, 'Самара'], [240, 'Баку · Тбилиси · Ереван'], [240, 'Дубай'],
    [300, 'Екатеринбург'], [300, 'Ташкент · Алматы'], [330, 'Дели · Мумбаи'],
    [360, 'Омск · Бишкек'], [360, 'Дакка'], [420, 'Новосибирск · Красноярск'], [420, 'Бангкок · Джакарта · Ханой'],
    [480, 'Иркутск'], [480, 'Пекин · Сингапур · Куала-Лумпур'], [540, 'Якутск'], [540, 'Токио · Сеул'],
    [600, 'Владивосток'], [660, 'Магадан'], [720, 'Камчатка'],
];
const TZ_OTHER = [-720, -660, -600, -540, -480, -420, -360, -300, -240, -180, -120, -60, 0, 60, 120, 180, 240, 300, 330, 345, 360, 420, 480, 540, 570, 600, 630, 660, 720, 780, 840];
let _tzCtx = null;
let _tzTick = null;

window.FMPostTools = {
    coverRender: rsCoverRender, coverBind: rsBindCover, planSheet: openPlanSheet,
    loadPlaceInfo: loadPlaceInfo, publishNow: publishPostNow, dateLabel: rsDateLabel,
};

function tzFmt(min) {
    const m = Math.round(+min || 0);
    const a = Math.abs(m);
    const h = Math.floor(a / 60), r = a % 60;
    return 'UTC' + (m < 0 ? '−' : '+') + h + (r ? ':' + String(r).padStart(2, '0') : '');
}
function tzDevice() { return -new Date().getTimezoneOffset(); }
function tzCity(min) {
    const z = TZ_ZONES.find(z => z[0] === min);
    return z ? t(z[1]) : '';
}
function tzLabel(min) {
    const c = tzCity(min);
    return (c ? c + ' · ' : '') + tzFmt(min);
}
function tzClock(min) {
    const d = new Date(Date.now() + (min - tzDevice()) * 60000);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function tzNowLine(min) {
    const dev = tzDevice();
    let line = TR('Сейчас по каналу') + ' ' + tzClock(min);
    if (dev !== min) line += ' · ' + TR('на твоём устройстве') + ' ' + tzClock(dev) + ' (' + tzFmt(dev) + ')';
    return line;
}
function tzCurrent(data) {
    return (data && data.tz_offset_minutes != null) ? data.tz_offset_minutes : tzDevice();
}
function renderTzSection(data) {
    const cur = tzCurrent(data);
    return `
        <div class="cs-section">
            <div class="cs-section-title">${TR('Время')}</div>
            <button class="cs-toggle-row cs-tz-row" data-tz-open="1" type="button">
                <div class="cs-toggle-icon-wrap"><i class="ti ti-clock" style="color: #818cf8;"></i></div>
                <div class="cs-toggle-info">
                    <div class="cs-toggle-title-row"><span class="cs-toggle-title">${TR('Часовой пояс канала')}</span></div>
                    <div class="cs-toggle-sub">${TR('По нему выходят посты и считаются замеры. Общий для всех админов канала')}</div>
                    <div class="cs-tz-now" id="cs-tz-now">${escapeHtml(tzNowLine(cur))}</div>
                </div>
                <span class="cs-tz-val" id="cs-tz-val">${escapeHtml(tzLabel(cur))}</span>
                <i class="ti ti-chevron-right cs-tz-ch"></i>
            </button>
        </div>
    `;
}
function tzRefreshRow() {
    const data = _settingsState.data;
    if (!data) return;
    const cur = tzCurrent(data);
    const v = document.getElementById('cs-tz-val');
    if (v) v.textContent = tzLabel(cur);
    const n = document.getElementById('cs-tz-now');
    if (n) n.textContent = tzNowLine(cur);
    const sn = document.getElementById('tz-now');
    if (sn) sn.textContent = TR('сейчас по каналу') + ' ' + tzClock(cur);
}
function tzStartTick() {
    if (_tzTick) clearInterval(_tzTick);
    _tzTick = setInterval(() => {
        if (!document.getElementById('cs-tz-now')) { clearInterval(_tzTick); _tzTick = null; return; }
        tzRefreshRow();
    }, 30000);
}
function tzClose() {
    if (_tzCtx) { try { _tzCtx.ov.remove(); _tzCtx.sh.remove(); } catch (e) {} _tzCtx = null; }
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
}
function openTzSheet() {
    const data = _settingsState.data;
    if (!data) return;
    hapticLight();
    tzClose();
    const cur = (data.tz_offset_minutes != null) ? data.tz_offset_minutes : null;
    const dev = tzDevice();
    const ov = document.createElement('div');
    ov.className = 'bs-overlay';
    const sh = document.createElement('div');
    sh.className = 'bs-sheet ap-sheet tz-sheet';
    sh.innerHTML = '<div class="bs-handle"></div>' +
        '<div class="rs-h2"><b>' + TR('Часовой пояс канала') + '</b><span id="tz-now">' + TR('сейчас по каналу') + ' ' + tzClock(cur == null ? dev : cur) + '</span></div>' +
        '<div class="ap-sub">' + TR('Один пояс на канал для всей команды. Расписание постов и замеры считаются по нему; уже запланированные посты сохраняют своё локальное время.') + '</div>' +
        '<div class="tz-search"><i class="ti ti-search"></i><input id="tz-q" type="text" placeholder="' + TR('Город или UTC+…') + '" autocomplete="off"></div>' +
        '<div class="tz-list" id="tz-list"></div>';
    document.body.appendChild(ov);
    document.body.appendChild(sh);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => { ov.classList.add('visible'); sh.classList.add('visible'); });
    ov.addEventListener('click', tzClose);
    _tzCtx = { ov, sh };
    const items = [{ min: dev, label: TR('Твоё устройство'), sub: tzLabel(dev), dev: true }]
        .concat(TZ_ZONES.map(z => ({ min: z[0], label: t(z[1]), sub: tzFmt(z[0]) })))
        .concat(TZ_OTHER.filter(m => !TZ_ZONES.some(z => z[0] === m)).map(m => ({ min: m, label: tzFmt(m), sub: TR('другое смещение') })));
    const draw = (q) => {
        const qq = (q || '').trim().toLowerCase().replace('utc', '').replace(/\s+/g, '');
        const list = sh.querySelector('#tz-list');
        const onIdx = items.findIndex(it => !it.dev && it.min === cur);
        list.innerHTML = items.filter(it => !qq || (it.label + ' ' + it.sub).toLowerCase().replace(/\s+/g, '').indexOf(qq) >= 0)
            .map(it => { const on = items.indexOf(it) === onIdx; return '<button type="button" class="tz-it' + (on ? ' on' : '') + (it.dev ? ' dev' : '') + '" data-tzv="' + it.min + '">' +
                '<b>' + escapeHtml(it.label) + '</b><span>' + escapeHtml(it.sub) + '</span>' + (on ? '<i class="ti ti-check"></i>' : '') + '</button>'; }).join('') ||
            '<div class="ap-sub">' + TR('Ничего не найдено') + '</div>';
    };
    draw('');
    sh.querySelector('#tz-q').addEventListener('input', (e) => draw(e.target.value));
    sh.addEventListener('click', (e) => {
        const b = e.target.closest ? e.target.closest('[data-tzv]') : null;
        if (b) saveTz(+b.dataset.tzv);
    });
}
async function saveTz(min) {
    const id = _settingsState.channelId;
    if (!id || !_settingsState.data) return;
    try {
        await apiRequest(`/api/v1/channels/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ tz_offset_minutes: min }),
            headers: { 'Content-Type': 'application/json' },
        });
        _settingsState.data.tz_offset_minutes = min;
        tzClose();
        hapticMed();
        tzRefreshRow();
        showToast(TR('Пояс канала:') + ' ' + tzLabel(min), 'check');
        refreshSettingsHistory();
    } catch (e) { apErr(e); }
}


function renderSettingsHistorySection(data) {
    const events = data.events || [];
    if (events.length === 0) {
        return `
            <div class="cs-section">
                <div class="cs-history-empty">
                    <i class="ti ti-history"></i>
                    <span>${TR('История пуста')}</span>
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
                    <span class="cs-history-toggle-title">${TR('История действий')}</span>
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
                <span class="cs-btn-audit-icon"><i class="ti ti-chart-dots"></i></span>
                <span class="cs-btn-audit-body">
                    <span class="cs-btn-audit-title">${TR('AI-аудит канала')}</span>
                    <span class="cs-btn-audit-sub">${TR('Разбор, прогноз и план роста')}</span>
                </span>
                <i class="ti ti-chevron-right cs-btn-audit-chev"></i>
            </button>
            <button class="cs-btn-audit cs-btn-competitors" data-competitors-channel="${data.id}">
                <span class="cs-btn-audit-icon"><i class="ti ti-search"></i></span>
                <span class="cs-btn-audit-body">
                    <span class="cs-btn-audit-title">${TR('Анализ конкурентов')}</span>
                    <span class="cs-btn-audit-sub">${TR('Карта ниши, их приёмы, план обгона')}</span>
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
                <i class="ti ti-trash"></i> ${TR('Удалить канал')}
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
    bindVoicePick();
    const tzRow = document.querySelector('[data-tz-open]');
    if (tzRow) { tzRow.addEventListener('click', openTzSheet); tzStartTick(); }

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

    const confirmed = await confirmDialogHtml(
        'Применить примеры стиля',
        `Текущий стиль канала будет заменён стилем из примеров. Спишется ${_voicePriceCoin()}.`,
        'Списать и применить'
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
            ? 'Не хватает Forge на обновление стиля.'
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
                    <span class="cs-modal-title">${TR('Редактировать стиль')}</span>
                    <button class="cs-modal-close" data-action="close"><i class="ti ti-x"></i></button>
                </div>
                <div class="cs-modal-body">
                    <textarea class="cs-modal-textarea" id="cs-modal-voice-text" maxlength="2000" placeholder="Описание стиля письма канала...">${escapeHtml(currentText)}</textarea>
                    <div class="cs-modal-counter" id="cs-modal-counter">${currentText.length} / 2000</div>
                </div>
                <div class="cs-modal-actions">
                    <button class="cs-btn-ghost" data-action="cancel">${TR('Отмена')}</button>
                    <button class="cs-btn-primary" data-action="save">${TR('Сохранить')}</button>
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
    const confirmed = await confirmDialogHtml(
        'Пересобрать стиль',
        `Стиль будет собран заново из последних постов канала. Спишется ${_voicePriceCoin()}.`,
        'Списать и пересобрать'
    );
    if (!confirmed) return;

    try {
        await apiRequest(`/api/v1/channels/${_settingsState.channelId}/voice/refresh`, { method: 'POST' });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');

        const statusEl = document.querySelector('.cs-status-line');
        if (statusEl) {
            statusEl.className = 'cs-status-line cs-status-collecting';
            statusEl.innerHTML = '<span class="voice-pulse-dot"></span><span>' + TR('Стиль собирается...') + '</span>';
        }

        startSettingsVoicePolling();
    } catch (e) {
        const msg = (e?.message || '').includes('429')
            ? 'Не хватает Forge на обновление стиля.'
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
    if (target === 'polls') payload.open_polls = newValue;
    if (target === 'research') payload.research_links = newValue;

    if (_settingsState.data) {
        if (target === 'paused') _settingsState.data.is_paused = !newValue;
        if (target === 'profanity') _settingsState.data.use_profanity_default = newValue;
        if (target === 'polls') _settingsState.data.open_polls = newValue;
        if (target === 'research') _settingsState.data.research_links = newValue;
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
            if (target === 'polls') _settingsState.data.open_polls = !newValue;
            if (target === 'research') _settingsState.data.research_links = !newValue;
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
        `Удалить канал «${title}»?\n\nКанал переедет в «Недавно удалённые», данные сохранятся 7 дней. Переподключить можно в любой момент.`
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
        const txt = escapeHtml(p.slice(0, 220));
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
            ${posts || '<div class="channels-preview-sub">' + TR('Постов для превью не нашлось') + '</div>'}
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

    if (result.off_topic) {
        stopThinkingAnimation();
        showScreen('postCreate');
        showToast(TR('Это генератор постов, а не чат-ассистент. Опиши тему поста для канала'), 'info-circle');
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
            timeoutMs: 240000,
            body: JSON.stringify({
                topic: state.post.topic,
                use_profanity: state.post.useProfanity,
                use_channel_style: state.post.useChannelStyle !== false,
                context_history: state.post.contextHistory,
                style_reference_text: state.post.styleReferenceText || null,
                length: state.post.length || 'auto',
                emoji: state.post.emoji || 'auto',
                model: postActiveModel(),
            }),
        });

        state.post.currentPostId = result.post_id;
        state.post.currentPostText = result.text;
        state.post.lastStyleApplied = !!(result.style_applied ?? result.has_voice);

        stopThinkingAnimation();
        renderResult(result);

        apiRequest('/api/v1/post/limits').then((fresh) => {
            state.post.limits = fresh;
            renderLimitBanner(fresh);
        }).catch(() => {});

        loadSuggestions(result.post_id);
    } catch (err) {
        stopThinkingAnimation();
        handlePostApiError(err);
    }
}


function renderResult(result) {
    els.postResultText.textContent = result.text;
    els.postResultModel.textContent = result.model_used || 'Модель';


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
    if (els.postPlanBtn) {
        els.postPlanBtn.dataset.locked = String(!hasChannel);
        els.postPlanBtn.classList.remove('done');
    }
    state.post.media = null;
    state.post.mediaBusy = '';
    state.post.placeInfo = null;
    state.post.placed = null;
    state.post.onPlaced = renderResultHints;
    rsCoverRender(document.getElementById('post-cover-block'), state.post);
    renderResultHints();
    if (hasChannel && result.post_id) loadPlaceInfo(state.post);

    showScreen('postResult');
}

const RS_LIMITS = { 'image/jpeg': 8, 'image/png': 8, 'image/webp': 8, 'image/gif': 12, 'video/mp4': 40, 'video/quicktime': 40 };
const RS_REC_SRC = { peak: 'час пик аудитории канала', niche: 'лучшее время для ниши', auto: 'ближайшее свободное время' };
const RS_WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function rsErr(code) {
    const M = {
        past_time: 'Это время уже прошло — выбери позже.',
        day_full: 'В этом дне уже максимум постов',
        too_long: 'Длиннее 4096 знаков Telegram не примет — сократи.',
        no_bot_rights: 'Добавь @ForgeMetricsBot администратором канала с правом публикации — тогда посты смогут выходить сами.',
        paused: 'Канал на паузе — публикация не проходит.',
        plan_busy: 'Неделя сейчас собирается — подожди, пока сборка закончится.',
        already_out: 'Пост уже в очереди — сначала сними его с очереди',
        already_published: 'Пост уже опубликован — менять его поздно.',
        no_content_perm: 'Создатель канала не выдал тебе право менять контент-план',
        no_channel: 'Сначала подключи канал — публиковать некуда',
        no_text: 'Сначала нужен текст — фраза на обложку берётся из него',
        bad_type: 'Такой формат не подойдёт: нужна картинка, GIF или видео',
    };
    return t(M[code] || 'Не получилось — попробуй ещё раз');
}

function rsDateLabel(iso, withWeekday) {
    if (!iso) return '';
    try {
        const lang = (typeof getLang === 'function' ? getLang() : 'ru') || 'ru';
        return new Date(iso + 'T00:00:00').toLocaleDateString(lang, withWeekday
            ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long' });
    } catch (e) { return iso; }
}

function rsChanNow() {
    const pi = state.post.placeInfo;
    const shift = pi && pi.tz_min != null ? (pi.tz_min + new Date().getTimezoneOffset()) : 0;
    const d = new Date(Date.now() + shift * 60000);
    return [d.getHours(), d.getMinutes()];
}

function rsPast(dayIndex, hm) {
    const pi = state.post.placeInfo;
    if (!pi || pi.today_index !== dayIndex || !hm) return false;
    const now = rsChanNow();
    return (+hm.slice(0, 2)) * 60 + (+hm.slice(3)) <= now[0] * 60 + now[1] + 1;
}

function rsDefaultHm(dayIndex) {
    const pi = state.post.placeInfo;
    if (!pi || pi.today_index !== dayIndex) return '12:00';
    const now = rsChanNow();
    let mins = Math.ceil((now[0] * 60 + now[1] + 20) / 15) * 15;
    if (mins < 8 * 60) mins = 8 * 60;
    if (mins > 22 * 60 + 45) return '';
    const h = Math.floor(mins / 60), m = mins % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

async function loadPlaceInfo(ctx) {
    const postId = ctx.currentPostId;
    if (!postId) return;
    try {
        const r = await apiRequest('/api/v1/content-plan/place-info?post_id=' + postId);
        if (r && r.ok && ctx.currentPostId === postId) {
            ctx.placeInfo = r;
            if (r.placed) ctx.placed = r.placed;
            if (typeof ctx.onPlaced === 'function') ctx.onPlaced();
        }
    } catch (e) {}
}

function renderResultHints() {
    const pi = state.post.placeInfo;
    const where = pi && pi.channel_username ? '@' + pi.channel_username : (pi && pi.channel_title) || TR('подключённый канал');
    const sendHint = document.getElementById('post-send-hint');
    if (sendHint) sendHint.textContent = TR('Бот выложит в') + ' ' + where + ' ' + TR('в течение минуты. Перед отправкой спросит подтверждение');
    const planHint = document.getElementById('post-plan-hint');
    const placed = state.post.placed;
    if (planHint) {
        planHint.textContent = placed
            ? TR('В плане:') + ' ' + rsDateLabel(placed.date_iso, true) + ' ' + placed.hm + (placed.queued ? ' · ' + TR('выйдет сам') : ' · ' + TR('черновик'))
            : TR('Выбрать день и время — пост встанет в неделю и выйдет сам');
    }
    if (els.postPlanBtn) els.postPlanBtn.classList.toggle('done', !!placed);
}

function rsCoverRender(host, ctx) {
    if (!host || !ctx) return;
    const m = ctx.media;
    const busy = ctx.mediaBusy;
    const price = (typeof forgeAmount === 'function') ? forgeAmount(5, 12) : '5';
    if (busy) {
        host.innerHTML = '<div class="cp-own-row"><span class="cp-own-thumb"><div class="cp-spin sm"></div></span>' +
            '<span class="tx"><b>' + escapeHtml(busy) + '</b></span></div>';
        return;
    }
    if (m) {
        const isVid = m.kind === 'video';
        const thumb = isVid ? '<i class="ti ti-player-play"></i>' : '<img src="' + escapeHtml(m.url) + '" alt="">';
        const name = m.cover ? TR('Рисованная обложка') : (m.name || TR('Файл'));
        const kind = m.cover ? TR('фраза из текста, палитра канала')
            : (m.kind === 'animation' ? 'GIF' : (isVid ? TR('видео') : TR('фото')));
        host.innerHTML = '<div class="cp-own-row"><span class="cp-own-thumb">' + thumb + '</span>' +
            '<span class="tx"><b>' + escapeHtml(name) + '</b><em>' + escapeHtml(kind) + '</em></span>' +
            '<button class="act" data-rc="clear" type="button">' + TR('Убрать') + '</button></div>' +
            '<div class="cp-own-acts">' +
            '<button class="cp-mrepl" data-rc="file" type="button"><i class="ti ti-upload"></i>' + TR('Заменить файлом') + '</button>' +
            '<button class="cp-mrepl" data-rc="cover" type="button"><i class="ti ti-photo"></i>' +
            TR('Рисованная обложка') + ' ' + price + '</button>' +
            '<button class="cp-mrepl" data-rc="photo" type="button"><i class="ti ti-camera"></i>' +
            TR('Фото-обложка') + ' ' + price + '</button></div>';
        return;
    }
    const zero = (typeof forgeAmount === 'function') ? forgeAmount(0, 12) : '0';
    host.innerHTML = '<div class="cp-addcol" style="margin-top:0">' +
        '<button class="cp-add2" data-rc="file" type="button"><i class="ti ti-upload"></i><span class="tx"><b>' +
        TR('Файл с устройства') + '</b><em>' + TR('Фото до 8 МБ, GIF до 12 МБ, видео до 40 МБ') + '</em></span><span class="pr">' + zero + '</span></button>' +
        '<button class="cp-add2 own" data-rc="cover" type="button"><i class="ti ti-photo"></i><span class="tx"><b>' +
        TR('Рисованная обложка') + '</b><em>' + TR('Фраза из текста, палитра канала') + '</em></span><span class="pr">' + price + '</span></button>' +
        '<button class="cp-add2 own" data-rc="photo" type="button"><i class="ti ti-camera"></i><span class="tx"><b>' +
        TR('Фото-обложка') + '</b><em>' + TR('Эффектный кадр из фотобанка и заголовок') + '</em></span><span class="pr">' + price + '</span></button></div>';
}

function rsSetBusy(ctx, host, text) {
    ctx.mediaBusy = text || '';
    rsCoverRender(host, ctx);
}

function rsBindCover(host, ctx) {
    if (!host || host.dataset.rsBound) return;
    host.dataset.rsBound = '1';
    host.addEventListener('click', (e) => {
        const b = e.target.closest ? e.target.closest('[data-rc]') : null;
        if (!b || ctx.mediaBusy) return;
        const a = b.dataset.rc;
        if (a === 'file') { hapticLight(); rsPickFile(ctx, host); }
        else if (a === 'cover') rsMakeCover(ctx, host, 'draw');
        else if (a === 'photo') rsMakeCover(ctx, host, 'photo');
        else if (a === 'clear') { hapticLight(); rsClearCover(ctx, host); }
    });
}

function rsPickFile(ctx, host) {
    let inp = document.getElementById('post-cover-file');
    if (!inp) {
        inp = document.createElement('input');
        inp.type = 'file';
        inp.id = 'post-cover-file';
        inp.accept = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime';
        inp.style.display = 'none';
        document.body.appendChild(inp);
    }
    inp.onchange = async () => {
        const f = inp.files && inp.files[0];
        inp.value = '';
        const pid = ctx.currentPostId;
        if (!f || !pid) return;
        const lim = RS_LIMITS[f.type];
        if (!lim) { showToast(rsErr('bad_type'), 'alert-triangle'); return; }
        const mb = f.size / 1048576;
        if (mb > lim) { showToast(TR('Файл') + ' ' + mb.toFixed(1) + ' ' + TR('МБ — это больше предела в') + ' ' + lim + ' ' + TR('МБ'), 'alert-triangle'); return; }
        rsSetBusy(ctx, host, TR('Загружаю файл...'));
        try {
            const fd = new FormData();
            fd.append('post_id', pid);
            fd.append('file', f);
            const r = await apiRequest('/api/v1/content-plan/media', { method: 'POST', body: fd });
            if (r && r.ok) {
                ctx.media = { kind: r.kind, url: r.url, cover: false, name: f.name };
                hapticLight();
            } else showToast(rsErr(r && r.error), 'alert-triangle');
        } catch (e) { showToast(TR('Файл не загрузился'), 'alert-triangle'); }
        rsSetBusy(ctx, host, '');
    };
    inp.click();
}

async function rsMakeCover(ctx, host, kind) {
    const pid = ctx.currentPostId;
    if (!pid) return;
    hapticLight();
    rsSetBusy(ctx, host, t(kind === 'photo' ? 'Подбираю фото...' : 'Рисую обложку...'));
    try {
        const r = await apiRequest('/api/v1/content-plan/own-cover', { method: 'POST', body: JSON.stringify({ post_id: pid, kind: kind || null }) });
        if (r && r.ok) {
            ctx.media = { kind: 'photo', url: r.url, cover: true };
            showToast(TR('Обложка готова'), 'check');
            apiRequest('/api/v1/post/limits').then((fresh) => { state.post.limits = fresh; renderLimitBanner(fresh); }).catch(() => {});
        } else showToast(rsErr(r && r.error), 'alert-triangle');
    } catch (e) { apErr(e); }
    rsSetBusy(ctx, host, '');
}

async function rsClearCover(ctx, host) {
    const pid = ctx.currentPostId;
    ctx.media = null;
    rsCoverRender(host, ctx);
    if (pid) apiRequest('/api/v1/content-plan/media/clear', { method: 'POST', body: JSON.stringify({ post_id: pid }) }).catch(() => {});
}

let _rsCtx = null;
function rsClose() {
    if (_rsCtx) { try { _rsCtx.ov.remove(); _rsCtx.sh.remove(); } catch (e) {} _rsCtx = null; }
    document.documentElement.classList.remove('cs-modal-open');
    document.body.classList.remove('cs-modal-open');
}

async function openPlanSheet(ctx) {
    const pid = ctx && ctx.currentPostId;
    if (!pid) { showToast(TR('Сначала сгенерируй пост'), 'alert-triangle'); return; }
    hapticLight();
    apClose();
    rsClose();
    if (!ctx.placeInfo) {
        try {
            const r = await apiRequest('/api/v1/content-plan/place-info?post_id=' + pid);
            if (!r || !r.ok) { showToast(rsErr(r && r.error), 'alert-triangle'); return; }
            ctx.placeInfo = r;
        } catch (e) { apErr(e); return; }
    }
    const pi = ctx.placeInfo;
    if (pi.plan_busy) { showToast(rsErr('plan_busy'), 'alert-triangle'); return; }
    const rec = pi.recommended;
    const sel = { day: rec ? rec.day_index : pi.today_index, hm: '', busy: false };
    sel.hm = rec ? rec.hm : rsDefaultHm(sel.day);
    if (rsPast(sel.day, sel.hm)) sel.hm = rsDefaultHm(sel.day);
    const ov = document.createElement('div');
    ov.className = 'bs-overlay';
    const sh = document.createElement('div');
    sh.className = 'bs-sheet ap-sheet rs-sheet';
    const where = pi.channel_title || (pi.channel_username ? '@' + pi.channel_username : '');
    const tzLab = 'UTC' + (pi.tz_min >= 0 ? '+' : '−') + Math.abs(Math.round(pi.tz_min / 60));
    sh.innerHTML = '<div class="bs-handle"></div>' +
        '<div class="rs-h2"><b>' + TR('В контент-план') + '</b><span>' + escapeHtml(where) + ' · ' + TR('время канала') + ' (' + tzLab + ')</span></div>' +
        '<div class="ap-sub">' + TR('Выбери день недели — неделя скользящая, прошедших дней нет') + '</div>' +
        '<div class="rs-week" id="rs-week"></div>' +
        '<div id="rs-rec"></div>' +
        '<div id="rs-time"></div>' +
        '<button class="cp-go" id="rs-go" type="button"></button>' +
        '<div class="cp-own-note" id="rs-note"></div>';
    document.body.appendChild(ov);
    document.body.appendChild(sh);
    document.documentElement.classList.add('cs-modal-open');
    document.body.classList.add('cs-modal-open');
    requestAnimationFrame(() => { ov.classList.add('visible'); sh.classList.add('visible'); });
    ov.addEventListener('click', rsClose);
    _rsCtx = { ov, sh };
    const q = (id) => sh.querySelector('#' + id);
    const drawWeek = () => {
        q('rs-week').innerHTML = RS_WD.map((wd, i) => {
            const iso = (pi.week_dates || [])[i] || '';
            const full = (pi.counts && pi.counts[String(i)] || 0) >= (pi.max_per_day || 3);
            const d = iso ? new Date(iso + 'T00:00:00') : null;
            const lang = (typeof getLang === 'function' ? getLang() : 'ru') || 'ru';
            const sub = i === pi.today_index ? TR('сегодня') : (d ? d.toLocaleDateString(lang, { month: 'short' }).replace('.', '') : '');
            return '<button type="button" class="rs-wd' + (i === sel.day ? ' on' : '') + (i === pi.today_index ? ' today' : '') + (full ? ' off' : '') +
                '" data-rd="' + i + '"' + (full ? ' disabled' : '') + '><s>' + t(wd) + '</s><b>' + (d ? d.getDate() : '') + '</b><i>' + escapeHtml(sub) + '</i></button>';
        }).join('');
    };
    const drawRec = () => {
        const el = q('rs-rec');
        if (!rec) { el.innerHTML = ''; return; }
        const iso = (pi.week_dates || [])[rec.day_index] || '';
        el.innerHTML = '<button type="button" class="rs-rec" data-rrec="1"><span class="ic"><i class="ti ti-sparkles"></i></span>' +
            '<span class="tx"><b>' + TR('Рекомендуемое:') + ' ' + escapeHtml(rsDateLabel(iso, true)) + ', ' + rec.hm + '</b>' +
            '<em>' + t(RS_REC_SRC[rec.source] || RS_REC_SRC.auto) + ' · ' + TR('нажми, чтобы подставить') + '</em></span></button>';
    };
    const drawTime = () => {
        const now = pi.today_index === sel.day ? rsChanNow() : null;
        let hours = '';
        for (let h = 8; h <= 22; h++) {
            const hh = (h < 10 ? '0' : '') + h;
            const off = now && (h * 60 + 45 <= now[0] * 60 + now[1] + 1);
            hours += '<button type="button" class="cp-th' + ((sel.hm || '').slice(0, 2) === hh ? ' on' : '') + (off ? ' off' : '') + '" data-rh="' + hh + '">' + hh + '</button>';
        }
        const mins = ['00', '15', '30', '45'].map((m) => {
            const offm = now && sel.hm && ((+sel.hm.slice(0, 2)) * 60 + (+m) <= now[0] * 60 + now[1] + 1);
            return '<button type="button" class="cp-tm' + ((sel.hm || '').slice(3) === m ? ' on' : '') + (offm ? ' off' : '') + '" data-rm="' + m + '">:' + m + '</button>';
        }).join('');
        q('rs-time').innerHTML = '<div class="cp-tgrid">' + hours + '</div><div class="cp-trow">' + mins + '</div>' +
            (!sel.hm ? '<div class="cp-own-note">' + TR('На сегодня время вышло — выбери другой день.') + '</div>' : '');
    };
    const drawGo = () => {
        const go = q('rs-go');
        const iso = (pi.week_dates || [])[sel.day] || '';
        const ready = !!sel.hm && !rsPast(sel.day, sel.hm) && !sel.busy;
        go.className = 'cp-go' + (pi.can_post ? ' grn' : '');
        go.disabled = !ready;
        go.innerHTML = sel.busy ? '<div class="cp-spin sm"></div> ' + TR('Сохраняю...') :
            '<i class="ti ti-' + (pi.can_post ? 'calendar-up' : 'device-floppy') + '"></i> ' +
            (pi.can_post ? TR('Запланировать на') + ' ' + escapeHtml(rsDateLabel(iso, true)) + ' ' + (sel.hm || '') : TR('Сохранить в план'));
        q('rs-note').textContent = pi.can_post
            ? TR('Пост появится в неделе контент-плана и выйдет сам. До выхода его можно править или снять.') + (pi.has_plan ? '' : ' ' + TR('Недели ещё нет — она создастся.'))
            : TR('Бот не подключён к каналу с правом публикации — пост сохранится в план без автовыхода.');
    };
    const drawAll = () => { drawWeek(); drawRec(); drawTime(); drawGo(); };
    drawAll();
    localizeTree(sh);
    sh.addEventListener('click', async (e) => {
        const tg = e.target;
        const wd = tg.closest ? tg.closest('[data-rd]') : null;
        if (wd) {
            sel.day = +wd.dataset.rd;
            if (!sel.hm || rsPast(sel.day, sel.hm)) sel.hm = rsDefaultHm(sel.day);
            hapticLight(); drawAll(); return;
        }
        if (tg.closest && tg.closest('[data-rrec]')) {
            sel.day = rec.day_index; sel.hm = rec.hm;
            if (rsPast(sel.day, sel.hm)) sel.hm = rsDefaultHm(sel.day);
            hapticLight(); drawAll(); return;
        }
        const rh = tg.closest ? tg.closest('[data-rh]') : null;
        if (rh) {
            sel.hm = rh.dataset.rh + ':' + ((sel.hm || '12:00').slice(3) || '00');
            if (rsPast(sel.day, sel.hm)) {
                const pm = ['00', '15', '30', '45'].filter((m) => !rsPast(sel.day, sel.hm.slice(0, 2) + ':' + m))[0];
                if (pm) sel.hm = sel.hm.slice(0, 2) + ':' + pm;
            }
            hapticLight(); drawTime(); drawGo(); return;
        }
        const rm = tg.closest ? tg.closest('[data-rm]') : null;
        if (rm) {
            sel.hm = (sel.hm || '12:00').slice(0, 2) + ':' + rm.dataset.rm;
            hapticLight(); drawTime(); drawGo(); return;
        }
        if (tg.closest && tg.closest('#rs-go')) {
            if (sel.busy) return;
            sel.busy = true; drawGo();
            hapticMed();
            const lang = (typeof getLang === 'function' ? getLang() : 'ru') || 'ru';
            try {
                const r = await apiRequest('/api/v1/content-plan/place', { method: 'POST',
                    body: JSON.stringify({ post_id: pid, day_index: sel.day, hm: sel.hm, queue: !!pi.can_post, lang }) });
                if (r && r.ok) {
                    ctx.placed = { day_index: sel.day, hm: r.slot_hm, date_iso: r.date_iso, queued: !!r.queued };
                    pi.has_plan = true;
                    pi.counts[String(sel.day)] = (pi.counts[String(sel.day)] || 0) + 1;
                    rsClose();
                    if (typeof ctx.onPlaced === 'function') ctx.onPlaced();
                    showToast((r.queued ? TR('В контент-плане, выйдет сам:') : TR('Сохранён в план:')) + ' ' + rsDateLabel(r.date_iso, true) + ' ' + r.slot_hm, 'check');
                } else {
                    sel.busy = false; drawGo();
                    showToast(rsErr(r && r.error), 'alert-triangle');
                }
            } catch (err) { sel.busy = false; drawGo(); apErr(err); }
        }
    });
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

    if (els.modelPickPremiumMeta) {
        els.modelPickPremiumMeta.innerHTML =
            `Точнее, глубже · ${forgeAmount(limits.price_premium || 0, 12)}`;
    }
    if (els.modelPickStandardMeta) {
        els.modelPickStandardMeta.innerHTML =
            `Быстрее, легче · ${forgeAmount(limits.price_standard || 0, 12)}`;
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
        showToast(TR('Скопировано'), 'check');
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred?.('success');
    } else {
        showToast(TR('Не удалось скопировать'), 'alert-triangle');
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
    // длинную фразу нужно успеть прочитать: держим дольше, но не бесконечно
    const hold = Math.max(2400, Math.min(6500, 1300 + String(text || '').length * 55));
    state._toastTimer = setTimeout(() => {
        if (els.toast) els.toast.style.display = 'none';
    }, hold);
}


function handlePostApiError(err) {


    const msg = err?.message || '';

    if (err?.name === 'AbortError' || msg.toLowerCase().includes('abort')) {
        showToast((typeof t === 'function' ? TR('Генерация шла дольше обычного и связь оборвалась. Попробуй ещё раз') : 'Генерация шла дольше обычного и связь оборвалась. Попробуй ещё раз'), 'alert-triangle');
        showScreen('postCreate');
        return;
    }

    if (msg.includes('404') && msg.includes('User not found')) {
        showStartBotScreen();
        return;
    }

    if (msg.includes('429')) {
        showToast(TR('Слишком часто. Повторите через несколько секунд'), 'alert-triangle');
        showScreen('postCreate');
        return;
    }

    if (msg.includes('401')) {
        showToast(TR('Сессия истекла, переоткрой Mini App'), 'alert-triangle');
        return;
    }

    if (msg.includes('403')) {
        var _d = '';
        try { _d = (JSON.parse(msg.slice(msg.indexOf('{'))) || {}).detail || ''; } catch (e) { _d = ''; }
        showToast(_d || 'Недостаточно прав в команде канала', 'lock');
        showScreen('postCreate');
        return;
    }

    if (msg.includes('500')) {
        showToast(TR('Что-то пошло не так. Попробуй ещё раз'), 'alert-triangle');
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
            const lim = state.post.limits || {};
            const enough = lim.is_tester
                || Number(lim.balance || 0) >= postModelPrice(lim, postActiveModel(lim));
            const canSubmit = val.trim().length > 0 && enough;
            els.postGenerateBtn.disabled = !canSubmit;
            updateCtaHint();
        });
    }


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
            state.post.emojiMode = chip.dataset.val || 'auto';
            state.post.emoji = state.post.emojiMode;
            setChipGroup('post-emoji-chips', state.post.emojiMode);
            if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged?.();
        });
    }

    const emojiRow = document.getElementById('post-emoji-row');
    if (emojiRow) {
        emojiRow.addEventListener('click', (ev) => {
            if (ev.target.closest('#post-emoji-wrap')) return;
            const sw = document.getElementById('post-emoji-switch');
            const newVal = !(sw && sw.classList.contains('on'));
            setEmojiSwitch(newVal);
            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('light');
        });
    }

    window.addEventListener('resize', pgSegSyncAll);

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
            else publishPostNow(state.post);
        });
    }

    if (els.postPlanBtn) {
        els.postPlanBtn.addEventListener('click', () => {
            const locked = els.postPlanBtn.dataset.locked === 'true';
            if (locked) showLockedFeatureModal('schedule');
            else if (state.post.placed) showToast(TR('Пост уже в плане:') + ' ' + rsDateLabel(state.post.placed.date_iso, true) + ' ' + state.post.placed.hm, 'check');
            else openPlanSheet(state.post);
        });
    }
    rsBindCover(document.getElementById('post-cover-block'), state.post);

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









var _FM_ASSETS = ['app.js', 'styles.css', 'marketplace.js', 'i18n.js',
    'content_plan.js', 'content_plan.css', 'audit.js', 'audit.css',
    'strategy.js', 'strategy.css', 'rewrite.js', 'rewrite.css',
    'cover_core.js', 'placements.js', 'competitors.js', 'competitors.css', 'fonts.css'];
var _fmHasPack = false;
function _fmVerFromDom() {
    var sig = _FM_ASSETS.map(function (f) {
        var el = document.querySelector('script[src*="' + f + '?v="], link[href*="' + f + '?v="]');
        var u = el ? (el.getAttribute('src') || el.getAttribute('href') || '') : '';
        var m = u.match(/\?v=([0-9a-zA-Z.]+)/);
        return f + ':' + (m ? m[1] : '');
    }).join('|');
    var lp = document.querySelector('script[src*="i18n/"]');
    _fmHasPack = !!lp;
    if (lp) {
        var pm = (lp.getAttribute('src') || '').match(/\?v=([0-9a-zA-Z.]+)/);
        sig += '|i18n-pack:' + (pm ? pm[1] : '');
    }
    return sig;
}
function _fmVerFromHtml(html) {
    var sig = _FM_ASSETS.map(function (f) {
        var m = (html || '').match(new RegExp(f.replace(/\./g, '\\.') + '\\?v=([0-9a-zA-Z.]+)'));
        return f + ':' + (m ? m[1] : '');
    }).join('|');
    if (_fmHasPack) {
        var pm = (html || '').match(/i18n\/[^"]*\?v=([0-9a-zA-Z.]+)/);
        sig += '|i18n-pack:' + (pm ? pm[1] : '');
    }
    return sig;
}
var _fmBaseVer = null, _fmPending = false;
function _fmTyping() {
    var a = document.activeElement; if (!a) return false;
    var t = (a.tagName || '').toLowerCase();
    return t === 'input' || t === 'textarea' || a.isContentEditable === true;
}
function _fmApply() {
    if (_fmTyping()) { _fmPending = true; return; }
    try {
        var now = Date.now();
        var t0 = +sessionStorage.getItem('fm_upd_t') || 0;
        var n = (now - t0 > 120000) ? 1 : (+sessionStorage.getItem('fm_upd_n') || 0) + 1;


        if (n === 1) sessionStorage.setItem('fm_upd_t', now);
        sessionStorage.setItem('fm_upd_n', n);
        if (n > 3) return;
    } catch (e) {}
    try { showToast(TR('Обновляю до новой версии…'), 'refresh'); } catch (e) {}



    try { showScreen('loading'); } catch (e) {}
    setTimeout(function () { try { location.reload(); } catch (e) {} }, 700);
}
async function _fmCheck() {
    if (_fmPending) { if (!_fmTyping()) _fmApply(); return; }
    try {
        var r = await fetch('/index.html?fmv=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) return;
        var cur = _fmVerFromHtml(await r.text());
        if (!/:[0-9]/.test(cur)) return;
        if (_fmBaseVer && cur !== _fmBaseVer) _fmApply();
    } catch (e) {}
}
function startLiveUpdate() {
    _fmBaseVer = _fmVerFromDom();
    if (!/:[0-9]/.test(_fmBaseVer)) return;
    setInterval(_fmCheck, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) _fmCheck(); });
    window.addEventListener('focus', _fmCheck);
}

async function fmDeviceHash() {
    try {
        const c = document.createElement('canvas');
        c.width = 240; c.height = 60;
        const x = c.getContext('2d');
        x.textBaseline = 'top'; x.font = '14px Arial';
        x.fillStyle = '#f60'; x.fillRect(0, 0, 120, 30);
        x.fillStyle = '#069'; x.fillText('ForgeMetrics-fp', 2, 15);
        x.strokeStyle = 'rgba(120,60,200,0.6)'; x.beginPath(); x.arc(60, 30, 20, 0, Math.PI * 1.5); x.stroke();
        const cd = c.toDataURL();
        let gl = '';
        try {
            const g = document.createElement('canvas').getContext('webgl');
            if (g) {
                const di = g.getExtension('WEBGL_debug_renderer_info');
                gl = di ? (g.getParameter(di.UNMASKED_VENDOR_WEBGL) + '|' + g.getParameter(di.UNMASKED_RENDERER_WEBGL))
                    : (g.getParameter(g.VENDOR) + '|' + g.getParameter(g.RENDERER));
            }
        } catch (e) {}
        let salt = '';
        try {
            salt = localStorage.getItem('fm_dev_salt') || '';
            if (!salt) {
                salt = (crypto.randomUUID ? crypto.randomUUID()
                    : String(Math.random()).slice(2) + '-' + Date.now());
                localStorage.setItem('fm_dev_salt', salt);
            }
        } catch (e) {}
        const raw = [salt, navigator.userAgent || '', cd.length, cd.slice(-64), gl,
            screen.width + 'x' + screen.height + 'x' + (screen.colorDepth || ''),
            window.devicePixelRatio || '',
            (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
            (navigator.languages || []).join(','),
            navigator.platform || '', navigator.hardwareConcurrency || '',
            navigator.deviceMemory || ''].join('~');
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { return null; }
}

async function fmSendDevice() {
    try {
        const uid = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || '0';
        const key = 'fm_dev_sent_' + uid;
        const today = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(key) === today) return;
        const hash = await fmDeviceHash();
        if (!hash) return;
        await apiRequest('/api/v1/user/device', {
            method: 'POST',
            body: JSON.stringify({ hash }),
        });
        try { localStorage.setItem(key, today); } catch (e) {}
    } catch (e) {}
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
    fmTrack('app_open');
    setTimeout(fmSendDevice, 4000);


    document.addEventListener('visibilitychange', function () { if (!document.hidden) fmUnstick(); });
    window.addEventListener('focus', fmUnstick);
    await loadDashboard();
    try {
        let target = '';
        try { target = new URLSearchParams(location.search).get('screen') || ''; } catch (e) {}
        if (target === 'pricing' || (location.hash || '') === '#pricing') {
            openTariffs().then(() => { try { window.scrollTo(0, 0); } catch (e) {} });
        }
    } catch (e) {}
}


document.addEventListener('DOMContentLoaded', main);



document.addEventListener('DOMContentLoaded', function () {
    try {
        document.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach(function (el) {
            if (!el.hasAttribute('dir')) el.setAttribute('dir', 'auto');
        });
    } catch (e) {}
});