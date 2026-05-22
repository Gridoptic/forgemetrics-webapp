const API_BASE_URL = 'https://presents-src-cards-crest.trycloudflare.com';

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

    if (data.channel) {
        const subs = data.channel.subscribers ? formatNumber(data.channel.subscribers) : '—';
        const title = data.channel.title || data.channel.username || 'Канал';
        els.channelInfo.textContent = `${title} · ${subs} подписчиков`;
    } else {
        els.channelInfo.textContent = 'Подключи канал чтобы видеть метрики';
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

    try {
        const limits = await apiRequest('/api/v1/post/limits');
        state.post.limits = limits;
        renderLimitBanner(limits);
        updateStyleHint(limits);
    } catch (err) {
        console.error('Failed to load limits:', err);
        if (els.postLimitText) els.postLimitText.textContent = 'Не удалось загрузить лимиты';
        if (els.postLimitBanner) els.postLimitBanner.classList.add('exhausted');
    }
}


function renderLimitBanner(limits) {
    if (!els.postLimitBanner || !els.postLimitText) return;

    els.postLimitBanner.classList.remove('exhausted', 'warning');
    const limitState = limits.limit_state || {};
    const state_name = limitState.state;

    if (state_name === 'exhausted') {
        els.postLimitText.textContent = 'Лимиты на сегодня закончились';
        els.postLimitBanner.classList.add('exhausted');
        els.postGenerateBtn.disabled = true;
        return;
    }

    let text = '';
    const used = limitState.used ?? 0;
    const limit = limitState.limit;
    const modelLabel = limitState.model_label || 'Базовая';
    const generationLabel = `${modelLabel} генерация`;
    const remaining = (limit != null) ? Math.max(0, limit - used) : null;

    if (state_name === 'premium_exhausted_standard_active') {
        const exhausted = limitState.exhausted_label || 'Премиум';
        if (remaining != null) {
            text = `${exhausted} закончился. ${generationLabel}: ${remaining} / ${limit}`;
        } else {
            text = `${exhausted} закончился. ${generationLabel} активна`;
        }
        els.postLimitBanner.classList.add('warning');
    } else if (state_name === 'premium' || state_name === 'standard' || state_name === 'basic') {
        if (remaining != null) {
            text = `${generationLabel}: ${remaining} / ${limit}`;
            if (remaining <= 2) {
                els.postLimitBanner.classList.add('warning');
            }
        } else {
            text = `${generationLabel}: без лимита`;
        }
    } else {
        text = 'Готов к работе';
    }

    els.postLimitText.textContent = text;

    if (els.postTopicInput && els.postTopicInput.value.trim().length > 0) {
        els.postGenerateBtn.disabled = false;
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

    renderConnectionLimitsBanner(data.connection_limits);
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


function renderConnectionLimitsBanner(limits) {
    let banner = document.getElementById('channels-conn-limits');

    if (!limits || limits.is_tester) {
        if (banner) banner.style.display = 'none';
        return;
    }

    const container = els.channelsStateList || document.getElementById('channels-state-list');
    if (!container) return;

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'channels-conn-limits';
        banner.className = 'channels-conn-limits';
        container.insertBefore(banner, container.firstChild);
    } else if (banner.parentNode !== container) {
        container.insertBefore(banner, container.firstChild);
    }

    const daysTxt = (limits.days_until_reset === null || limits.days_until_reset === undefined)
        ? ''
        : ` · обновится через ${limits.days_until_reset} дн`;

    banner.innerHTML = `
        <span class="channels-conn-limits-num">${limits.used} из ${limits.limit}</span>
        <span class="channels-conn-limits-txt">подключений в этом периоде${daysTxt}</span>
    `;
    banner.style.display = '';
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
    const title = escapeHtml(ch.title || 'Канал');

    const badge = connected
        ? `<div class="channel-card-badge connected"><i class="ti ti-circle-check"></i><span>Подключён</span></div>`
        : `<div class="channel-card-badge demo"><i class="ti ti-eye"></i><span>Только анализ</span></div>`;

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
        <div class="channel-card ${connected ? 'connected' : 'demo'}">
            <div class="channel-card-top">
                <div class="channel-card-avatar ${connected ? '' : 'demo'}" data-avatar-for="${ch.id}" ${ch.has_avatar ? `data-has-avatar="1"` : ''}>
                    <i class="ti ti-brand-telegram"></i>
                </div>
                <div class="channel-card-info">
                    <div class="channel-card-name">${title}</div>
                    ${badge}
                </div>
                <button class="channel-card-menu" onclick="window.__channelMenu&&window.__channelMenu(${ch.id}, '${title.replace(/'/g, "\\'")}')">
                    <i class="ti ti-dots-vertical"></i>
                </button>
            </div>
            <div class="channel-card-feats">${feats}</div>
        </div>
        ${cta}
    `;
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