const API_BASE_URL = 'https://wages-what-perl-row.trycloudflare.com';

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
        els.postLimitText.textContent = 'На сегодня все модели исчерпаны';
        els.postLimitBanner.classList.add('exhausted');
        els.postGenerateBtn.disabled = true;
        return;
    }

    let text = '';
    const used = limitState.used ?? 0;
    const limit = limitState.limit;
    const modelLabel = limitState.model_label || 'Модель';

    if (state_name === 'premium_exhausted_standard_active') {
        text = `Премиум на сегодня всё. Сейчас ${modelLabel}: ${used}`;
        if (limit) text += ` / ${limit}`;
        els.postLimitBanner.classList.add('warning');
    } else if (state_name === 'premium' || state_name === 'standard' || state_name === 'basic') {
        text = `${modelLabel}: ${used} / ${limit ?? '∞'}`;
        if (limit && limit - used <= 2) {
            els.postLimitBanner.classList.add('warning');
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
        els.postStyleInput.value = '';
        state.post.styleReferenceText = '';
        els.postStyleCounter.textContent = '0';
    } else {
        wrapper.style.display = 'flex';
        setTimeout(() => els.postStyleInput?.focus(), 100);
    }
}


function handleConnectChannelHint() {
    closeAllModals();
    handleAction('add_channel');
}


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
        els.postStyleClear.addEventListener('click', () => {
            els.postStyleInput.value = '';
            els.postStyleCounter.textContent = '0';
            state.post.styleReferenceText = '';
        });
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