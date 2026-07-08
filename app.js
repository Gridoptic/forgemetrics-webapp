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

    // Отключаем нативный вертикальный свайп Telegram (свайп-вниз-«свернуть»): на новых клиентах
    // он конкурирует со скроллом контента и «съедает» тапы после прокрутки — экран перестаёт
    // откликаться на 3–4 касания. Доступно с Bot API 7.7; на старых клиентах — тихий no-op.
    try { if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes(); } catch (e) {}

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

    const url = `${API_BASE_URL}${path}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API ${response.status}: ${errorText || response.statusText}`);
        }

        return await response.json();
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
        // Тихо: пользователь не на дашборде, не нужно показывать ошибку
    }
}


function showStartBotScreen() {
    els.errorMessage.innerHTML = `
        <div style="margin-bottom: 16px; line-height: 1.6;">
            Сначала запусти бота — там я расскажу что умею
            и активирую тебе бесплатный Trial на 7 дней.
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


function renderDashboard(data) {
    const firstName = data.user?.first_name || 'друг';
    els.avatarLetter.textContent = firstName.charAt(0).toUpperCase();
    els.greetingName.textContent = `Привет, ${firstName}`;

    const greetingMeta = document.getElementById('greeting-meta');

    if (data.channel) {
        const subs = data.channel.subscribers ? formatNumber(data.channel.subscribers) : '—';
        const title = data.channel.title || data.channel.username || 'Канал';
        const totalChannels = data.total_channels || 1;
        const switcherIcon = totalChannels > 1
            ? '<i class="ti ti-chevrons-up-down dashboard-channel-switcher-icon"></i>'
            : '';
        els.channelInfo.innerHTML = `${escapeHtml(title)} · ${subs} подписчиков ${switcherIcon}`;

        if (greetingMeta) {
            greetingMeta.classList.add('clickable');
            greetingMeta.onclick = () => {
                openActiveChannelSelector({
                    onChanged: async () => { await loadDashboard(); }
                });
            };
        }
    } else {
        els.channelInfo.textContent = 'Подключи канал чтобы видеть метрики';
        if (greetingMeta) {
            greetingMeta.classList.add('clickable');
            greetingMeta.onclick = () => {
                if (typeof openChannels === 'function') openChannels();
            };
        }
    }

    if (data.metrics && data.metrics.length >= 2) {
        const [views, subs] = data.metrics;
        els.metricViews.textContent = views.value;
        els.metricSubs.textContent = subs.value;

        renderTrend(els.metricViewsTrend, views.change, views.trend);
        renderTrend(els.metricSubsTrend, subs.change, subs.trend);
    }

    renderActions(data.actions || []);

    if (data.has_unread_menu) {
        els.menuDot.classList.add('active');
    } else {
        els.menuDot.classList.remove('active');
    }
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


function renderActions(actions) {
    els.actionsList.innerHTML = '';

    actions.forEach(action => {
        const card = document.createElement('button');
        card.className = `action-card ${action.primary ? 'primary' : ''}`;
        card.dataset.action = action.id;

        const colorClass = action.primary ? '' : `icon-${action.color}`;
        const subtitleClass = action.color === 'green' && !action.primary ? 'highlight' : '';

        card.innerHTML = `
            <div class="action-card-content">
                <div class="action-card-icon ${colorClass}">
                    <i class="ti ti-${action.icon}"></i>
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


function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}


function formatNumber(num) {
    if (num === null || num === undefined) return '—';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'М';
    if (num >= 10_000) return Math.floor(num / 1000) + 'к';
    if (num >= 1_000) return (num / 1000).toFixed(1) + 'к';
    return String(num);
}


function openDrawer() {
    els.drawer.classList.add('active');
    els.drawerOverlay.classList.add('active');
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}


function closeDrawer() {
    els.drawer.classList.remove('active');
    els.drawerOverlay.classList.remove('active');
}


const PLACEHOLDER_CONFIG = {
    create_post: { title: 'Создание поста', text: 'AI напишет пост в стиле твоего канала. Эта функция уже в разработке — скоро запустим.', icon: 'sparkles' },
    rewrite_post: { title: 'Рерайт поста', text: 'Перепишем чужой пост в твоём стиле. Скоро будет готово.', icon: 'pencil' },
    content_plan: { title: 'Контент-план', text: 'AI составит план постов на неделю. Скоро запустим.', icon: 'calendar' },
    channel_analytics: { title: 'Аналитика канала', text: 'Метрики, динамика, лучшие посты. Скоро будет готово.', icon: 'chart-line' },
    ai_audit: { title: 'AI-аудит канала', text: 'Полный разбор: что работает, что нет, план роста на 30 дней. Скоро запустим.', icon: 'target' },
    competitor_analysis: { title: 'Анализ конкурентов', text: 'Что у них залетает и почему. Скоро будет готово.', icon: 'search' },
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

    const config = PLACEHOLDER_CONFIG[actionId] || {
        title: 'Скоро будет готово',
        text: 'Эта функция в разработке.',
        icon: 'rocket',
    };

    els.placeholderTitle.textContent = config.title;
    els.placeholderText.textContent = config.text;
    els.placeholderIcon.innerHTML = `<i class="ti ti-${config.icon}"></i>`;

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    showScreen('placeholder');
}


function setupEventListeners() {
    els.menuBtn.addEventListener('click', openDrawer);
    els.drawerClose.addEventListener('click', closeDrawer);
    els.drawerOverlay.addEventListener('click', closeDrawer);

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

    if (els.postTopicInput) els.postTopicInput.value = '';
    if (els.postStyleInput) els.postStyleInput.value = '';
    if (els.postTopicCounter) els.postTopicCounter.textContent = '0';
    if (els.postStyleCounter) els.postStyleCounter.textContent = '0';
    if (els.postProfanityToggle) els.postProfanityToggle.dataset.active = 'false';
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

    if (els.postLimitText) els.postLimitText.textContent = 'Загружаю лимиты...';
    if (els.postLimitBanner) {
        els.postLimitBanner.classList.remove('exhausted', 'warning');
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

        if (activeData) {
            const activeCh = (activeData.channels || []).find(c => c.id === activeData.active_channel_id);
            state.post.activeChannel = activeCh || null;
            renderPostChannelSelector(activeCh);
        }
    } catch (err) {
        console.error('Failed to load limits/channel:', err);
        if (els.postLimitText) els.postLimitText.textContent = 'Не удалось загрузить лимиты';
        if (els.postLimitBanner) els.postLimitBanner.classList.add('exhausted');
    }
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
                        const data = await apiRequest('/api/v1/channels/active');
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

    const enabled = canEnable && (state.post.useChannelStyle !== false) && defaultOn;
    state.post.useChannelStyle = enabled;

    toggle.innerHTML = `
        <div class="post-style-toggle ${canEnable ? '' : 'disabled'}">
            <i class="ti ti-wand post-style-toggle-icon"></i>
            <span class="post-style-toggle-label">Использовать стиль канала</span>
            <button class="cs-toggle-switch ${enabled ? 'on' : ''}" id="post-style-toggle-btn" ${canEnable ? '' : 'disabled'}>
                <span class="cs-toggle-knob"></span>
            </button>
        </div>
    `;

    const btn = toggle.querySelector('#post-style-toggle-btn');
    if (btn && canEnable) {
        btn.addEventListener('click', () => {
            const isOn = btn.classList.contains('on');
            const newVal = !isOn;
            state.post.useChannelStyle = newVal;
            if (newVal) btn.classList.add('on'); else btn.classList.remove('on');
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
    const cur = els.postProfanityToggle.dataset.active === 'true';
    els.postProfanityToggle.dataset.active = String(!cur);
    state.post.useProfanity = !cur;
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


function confirmDialog(message, okText) {
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
        .replace(/"/g, '&quot;');
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
        return;
    }

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


async function loadChannelAvatars() {
    const nodes = document.querySelectorAll('[data-avatar-for][data-has-avatar="1"]');
    for (const node of nodes) {
        const chId = node.getAttribute('data-avatar-for');
        if (!chId || node.dataset.avatarLoaded === '1') continue;
        node.dataset.avatarLoaded = '1';
        try {
            const resp = await fetch(`${API_BASE_URL}/api/v1/channels/${chId}/avatar`, {
                headers: { 'X-Telegram-Init-Data': state.initData || '' },
            });
            if (!resp.ok) continue;
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            node.innerHTML = `<img src="${url}" alt="" class="channel-avatar-img">`;
        } catch (e) {
            // оставляем заглушку-иконку
        }
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
                    <button class="channels-deleted-purge" onclick="window.__purgeChannel&&window.__purgeChannel(${ch.id}, '${title.replace(/'/g, "\\'")}')">Удалить полностью</button>
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
                <button class="channel-card-menu" onclick="event.stopPropagation();window.__channelMenu&&window.__channelMenu(${ch.id}, '${title.replace(/'/g, "\\'")}')">
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
        const url = URL.createObjectURL(blob);
        if (node) node.innerHTML = `<img src="${url}" alt="">`;
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
                    <span class="cs-btn-audit-title">AI-аудит канала</span>
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
            if (typeof window.__openAudit === 'function') window.__openAudit(chId);
        });
    }

    const competitorsBtn = document.querySelector('.cs-btn-competitors[data-competitors-channel]');
    if (competitorsBtn) {
        competitorsBtn.addEventListener('click', () => {
            const chId = parseInt(competitorsBtn.getAttribute('data-competitors-channel'), 10);
            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred?.('medium');
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
        const url = URL.createObjectURL(blob);
        node.innerHTML = `<img src="${url}" alt="" class="channel-avatar-img">`;
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
        const txt = escapeHtml(p).slice(0, 220);
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
            }),
        });

        state.post.currentPostId = result.post_id;
        state.post.currentPostText = result.text;

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

    state.post.contextHistory = [];
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
    const msg = err?.message || '';

    if (msg.includes('404') && msg.includes('User not found')) {
        showStartBotScreen();
        return;
    }

    if (msg.includes('429')) {
        showToast('Не так быстро, подожди пару секунд', 'alert-triangle');
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

    if (els.postProfanityToggle) {
        els.postProfanityToggle.addEventListener('click', toggleProfanity);
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


async function main() {
    setupEventListeners();

    const tgReady = initTelegram();

    if (!tgReady) {
        showError('Открой Mini App через Telegram');
        return;
    }

    await loadDashboard();
}


document.addEventListener('DOMContentLoaded', main);