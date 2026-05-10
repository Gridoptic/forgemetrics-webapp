const API_BASE_URL = 'https://url-shot-replacement-search.trycloudflare.com';

const tg = window.Telegram?.WebApp;

const state = {
    user: null,
    dashboard: null,
    initData: null,
};

const screens = {
    loading: document.getElementById('loading-screen'),
    error: document.getElementById('error-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    placeholder: document.getElementById('placeholder-screen'),
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
        const detail = err.message || 'Не удалось подключиться к серверу';
        showError(detail);
    }
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (els.drawer.classList.contains('active')) closeDrawer();
        }
    });
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
