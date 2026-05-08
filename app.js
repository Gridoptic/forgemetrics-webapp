// ForgeMetrics Mini App

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0E1424');
  tg.setBackgroundColor('#0A0E1A');
}

const state = {
  user: null,
  tier: 'trial',
  trialDaysLeft: 7,
  currentType: 'news',
  generatedTypes: {},
  currentTopic: '',
  requestsToday: 0,
  requestsLimit: 15,
};

const typeNames = {
  news: '📰 Новость',
  opinion: '💭 Мнение',
  analysis: '🔍 Разбор',
  freethought: '✨ Мысль',
  fact: '💡 Факт',
  list: '📋 Список',
};

const typeDescriptions = {
  news: 'Реакция на актуальное событие',
  opinion: 'Личная позиция с аргументами',
  analysis: 'Глубокий разбор темы',
  freethought: 'Свободное размышление',
  fact: 'Полезный факт с контекстом',
  list: '3-5 структурированных пунктов',
};

// === SET INITIAL TYPE (before generation) ===
function setInitialType(el, type) {
  state.currentType = type;
  document.querySelectorAll('.type-pill[data-type$="-pre"]').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

// === TABS ===
function switchTab(tabName) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('pane-' + tabName).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

// === GENERATE POST (1 type at a time) ===
async function generatePost(forceType = null) {
  const topic = document.getElementById('topic-input')?.value.trim() || state.currentTopic;

  if (!topic) {
    showAlert('Опиши тему — даже одна строчка лучше чем пусто');
    return;
  }
  if (topic.length < 10) {
    showAlert('Тема слишком короткая. Опиши подробнее — чем больше деталей, тем точнее результат');
    return;
  }

  if (state.requestsToday >= state.requestsLimit) {
    showAlert(`Использовал все ${state.requestsLimit} запросов на сегодня. Лимит обновится в полночь.`);
    return;
  }

  state.currentTopic = topic;
  const typeToGenerate = forceType || state.currentType;

  const btn = document.getElementById('generate-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> <span>Генерирую...</span>';
  }

  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

  try {
    await new Promise(r => setTimeout(r, 1500));
    const text = mockGenerateOneType(topic, typeToGenerate);
    state.generatedTypes[typeToGenerate] = text;
    state.currentType = typeToGenerate;
    state.requestsToday++;

    showResults();
    updateRequestsCounter();

    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  } catch (error) {
    showAlert('Ошибка генерации: ' + error.message);
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>✨</span> <span>Создать пост</span>';
    }
  }
}

// === SWITCH POST TYPE (with confirmation if not generated yet) ===
async function switchPostType(type) {
  if (type === state.currentType) return;

  if (state.generatedTypes[type]) {
    state.currentType = type;
    renderActivePost();
    if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
    return;
  }

  const remaining = state.requestsLimit - state.requestsToday;
  if (remaining <= 0) {
    showAlert(`Использовал все запросы на сегодня. Лимит обновится в полночь.`);
    return;
  }

  const confirmed = await confirmDialog(
    `Сгенерировать тип "${typeNames[type]}"?`,
    `Это новый запрос. Останется ${remaining - 1} из ${state.requestsLimit} на сегодня.`
  );

  if (!confirmed) return;

  await generatePost(type);
}

function renderActivePost() {
  const textEl = document.getElementById('active-post-text');
  const nameEl = document.getElementById('active-type-name');
  if (!textEl || !nameEl) return;

  textEl.style.opacity = '0';
  textEl.style.transform = 'translateY(8px)';

  setTimeout(() => {
    textEl.textContent = state.generatedTypes[state.currentType] || 'Текст не найден';
    nameEl.textContent = typeNames[state.currentType];
    textEl.style.opacity = '1';
    textEl.style.transform = 'translateY(0)';
  }, 180);

  document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.type-pill').forEach(p => {
    if (p.dataset.type === state.currentType) p.classList.add('active');
    if (state.generatedTypes[p.dataset.type]) {
      p.classList.add('generated');
    }
  });
}

function showResults() {
  const section = document.getElementById('results-section');
  if (!section) return;
  section.style.display = 'block';
  renderActivePost();
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// === MOCK: simulate AI for one type ===
function mockGenerateOneType(topic, type) {
  const t = topic.slice(0, 60);
  const samples = {
    news: `Сегодня случилось: ${t}\n\nНа первый взгляд — обычное событие. Но если присмотреться, последствия будут чувствоваться месяцами.\n\nГлавное: рынок отреагирует не сразу. Готовься заранее.`,
    opinion: `Считаю что ${t} — переоценено.\n\nПока все спорят о деталях, главное упускают. Реальная проблема не в том что обсуждают, а в том о чём молчат.\n\nДумай своей головой. Всегда.`,
    analysis: `Разбираем: ${t}\n\nПервое что заметно — все смотрят не туда. Внимание уходит на громкое, а суть в тихом.\n\nТри слоя:\n1. Поверхность — то что видят все\n2. Механика — как работает на самом деле\n3. Корень — откуда растут ноги\n\nИменно третий слой определит развитие в долгую.`,
    freethought: `Думаю про ${t}.\n\nИногда самые важные вещи — самые неочевидные. То что мы принимаем как данность, на самом деле очень странно.\n\nПопробуй взглянуть свежим взглядом. Может оказаться, что ответ был перед глазами.`,
    fact: `Малоизвестный факт про ${t}:\n\nТо что считают правилом — на самом деле исключение. А то что считают исключением — было нормой.\n\nЭто меняет подход к решениям. И не только в этой теме.`,
    list: `${t} — 5 пунктов:\n\n— Первое: то о чём редко думают\n— Второе: то что недооценивают\n— Третье: то что игнорируют\n— Четвёртое: то что считают неважным\n— Пятое: то что меняет всё`,
  };
  return samples[type] || samples.news;
}

// === ACTIONS ===
function approvePost() {
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showAlert(`Пост опубликован! Тип: ${typeNames[state.currentType]}`);
}

function schedulePost() {
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
  showAlert('Откроется выбор времени публикации (скоро)');
}

function regeneratePost() {
  state.generatedTypes[state.currentType] = null;
  generatePost(state.currentType);
}

// === FEATURE TOGGLE ===
function toggleFeat(featureEl) {
  featureEl.classList.toggle('expanded');
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

// === MODALS ===
function openModal(modalId) {
  document.getElementById(modalId)?.classList.add('open');
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('open');
}

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
});

// === PLANS ===
function upgradePlan(tier) {
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ action: 'upgrade', tier: tier }));
    tg.close();
  } else {
    showAlert(`Переход на тариф ${tier}`);
  }
}

// === ALERT ===
function showAlert(message) {
  if (tg?.showAlert) tg.showAlert(message);
  else alert(message);
}

// === COUNTER ===
function updateRequestsCounter() {
  const usedEl = document.getElementById('requests-used');
  const limitEl = document.getElementById('requests-limit');
  if (usedEl) usedEl.textContent = state.requestsToday;
  if (limitEl) limitEl.textContent = state.requestsLimit;
}

function updateUserUI() {
  const tierLine = document.getElementById('user-tier-line');
  const trialBanner = document.getElementById('trial-banner');
  const trialDays = document.getElementById('trial-days');

  if (state.tier === 'trial' && state.trialDaysLeft > 0) {
    tierLine.textContent = `Pro Trial · ${state.trialDaysLeft} дн осталось`;
    trialDays.textContent = `осталось ${state.trialDaysLeft} ${declension(state.trialDaysLeft, 'день', 'дня', 'дней')}`;
    if (trialBanner) trialBanner.style.display = 'flex';
  } else if (state.tier === 'free') {
    tierLine.textContent = 'Free тариф';
    if (trialBanner) trialBanner.style.display = 'none';
  } else if (state.tier === 'light') {
    tierLine.textContent = 'Light тариф';
    if (trialBanner) trialBanner.style.display = 'none';
  } else if (state.tier === 'pro') {
    tierLine.textContent = 'Pro тариф';
    if (trialBanner) trialBanner.style.display = 'none';
  }
  updateRequestsCounter();
}

function declension(num, one, two, five) {
  let n = Math.abs(num) % 100;
  if (n >= 5 && n <= 20) return five;
  n = n % 10;
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return two;
  return five;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

async function loadUserData() {
  const initData = tg?.initDataUnsafe;
  if (initData?.user) state.user = initData.user;

  state.tier = 'trial';
  state.trialDaysLeft = 7;
  state.requestsLimit = 15;
  state.requestsToday = 0;

  updateUserUI();
}

// === SUBTABS ===
function switchSubtab(name, el) {
  document.querySelectorAll('.subtab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sub-' + name).classList.add('active');
  el.classList.add('active');
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

// === IMPROVE ===
function openImproveModal() {
  openModal('improve-modal');
}

async function runImprove() {
  const original = document.getElementById('improve-input').value.trim();
  if (original.length < 30) {
    showAlert('Вставь хотя бы пару предложений');
    return;
  }
  if (state.requestsToday >= state.requestsLimit) {
    showAlert(`Использовал все запросы на сегодня. Обновится в полночь.`);
    return;
  }

  const resultBox = document.getElementById('improve-result');
  resultBox.style.display = 'block';
  resultBox.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-tertiary);">⏳ Анализирую и улучшаю...</div>';

  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

  await new Promise(r => setTimeout(r, 1500));
  state.requestsToday++;
  updateRequestsCounter();

  resultBox.innerHTML = `
    <div style="margin-bottom:14px;">
      <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:8px;letter-spacing:0.06em;font-weight:700;">Оригинал</div>
      <div style="background:var(--bg-base);border-radius:10px;padding:12px;font-size:13px;color:var(--text-tertiary);line-height:1.55;">${escapeHtml(original)}</div>
    </div>
    <div>
      <div style="font-size:11px;background:var(--gradient-button);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-transform:uppercase;margin-bottom:8px;letter-spacing:0.06em;font-weight:700;">✨ В твоём стиле</div>
      <div style="background:var(--bg-card);border:1px solid var(--violet-1);border-radius:10px;padding:12px;font-size:13px;color:var(--text-primary);line-height:1.6;box-shadow:0 0 16px rgba(139,92,246,0.15);">${escapeHtml(original)}\n\n[Здесь будет переписанная версия от AI]</div>
    </div>
    <button class="btn-primary" onclick="closeModal('improve-modal');switchTab('create')" style="margin-top:14px;">
      Создать ещё пост →
    </button>
  `;

  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

// === RESET VOICE ===
async function resetVoice() {
  const confirmed = await confirmDialog(
    'Пересоздать голос канала?',
    'Текущие настройки голоса будут удалены. Тебе нужно будет снова дать боту 3-5 постов или новое описание.'
  );
  if (!confirmed) return;

  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ action: 'reset_voice' }));
    tg.close();
  } else {
    showAlert('Открой чат с ботом — отправь /reset_voice');
  }
}

// === MONEY ===
async function findAdvertisers() {
  showAlert('🎯 Ищу рекламодателей в твоей нише... Результат придёт в чат.');
  if (tg?.sendData) tg.sendData(JSON.stringify({ action: 'find_advertisers' }));
}

async function checkAdvertiser() {
  showAlert('🛡 Открой чат с ботом и пришли ссылку на канал — проверю.');
  if (tg?.sendData) tg.sendData(JSON.stringify({ action: 'check_advertiser' }));
}

async function runAudit() {
  showAlert('🎯 Запуск AI-аудита канала. Результат придёт в чат.');
  if (tg?.sendData) tg.sendData(JSON.stringify({ action: 'run_audit' }));
}

function addSource() {
  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ action: 'add_source' }));
    tg.close();
  } else {
    showAlert('Открой чат с ботом — там добавишь источник');
  }
}

function addCompetitor() {
  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ action: 'add_competitor' }));
    tg.close();
  } else {
    showAlert('Открой чат с ботом — там добавишь конкурента');
  }
}

function confirmDialog(title, text) {
  return new Promise((resolve) => {
    if (tg?.showConfirm) {
      tg.showConfirm(`${title}\n\n${text}`, (ok) => resolve(ok));
    } else {
      resolve(confirm(`${title}\n\n${text}`));
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  const textEl = document.getElementById('active-post-text');
  if (textEl) {
    textEl.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
  }
  console.log('ForgeMetrics ready');
});
