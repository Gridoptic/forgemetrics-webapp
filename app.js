// ForgeMetrics Mini App — JavaScript

// Telegram WebApp API
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#1f2c38');
  tg.setBackgroundColor('#17212b');
}

const state = {
  user: null,
  tier: 'free',
  trialDaysLeft: 7,
  selectedPostType: 'news',
  variantsCount: 3,
  requestsToday: 0,
  requestsLimit: 100,
  currentTopic: '',
};

function switchTab(tabName) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('pane-' + tabName).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
  window.scrollTo(0, 0);

  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function pickType(el) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  state.selectedPostType = el.dataset.type;
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

async function generatePost() {
  const topic = document.getElementById('topic-input').value.trim();

  if (!topic) {
    showAlert('Напиши тему поста — даже одна строчка лучше чем пусто');
    return;
  }

  if (topic.length < 10) {
    showAlert('Тема слишком короткая. Опиши подробнее — чем больше деталей, тем лучше пост');
    return;
  }

  state.currentTopic = topic;

  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Генерирую...';

  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

  try {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const variants = generateMockVariants(topic, state.selectedPostType, state.variantsCount);
    showVariants(variants);

    state.requestsToday++;
    updateRequestsCounter();

    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

  } catch (error) {
    showAlert('Ошибка генерации: ' + error.message);
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>✨</span> <span>Сгенерировать (<span id="variants-count">${state.variantsCount}</span> вариантов)</span>`;
  }
}

function generateMockVariants(topic, type, count) {
  const samples = {
    news: [
      `Сегодня вышла важная новость о ${topic.slice(0, 40)}...\n\nНа первый взгляд это ничего не меняет. Но если присмотреться — последствия будут чувствоваться месяцами.\n\nГлавное: рынок отреагирует не сразу. Готовься заранее.`,
      `${topic.slice(0, 50)}\n\nЭто важно по трём причинам:\n— меняется баланс сил\n— открывается окно возможностей\n— старые правила перестают работать\n\nЧто делать тебе — зависит от позиции.`,
      `Реакция на новость про ${topic.slice(0, 40)}.\n\nНе паникуй. Не радуйся раньше времени. Просто посмотри на цифры.\n\nТри факта которые меняют всё. Подробнее — в комментариях.`,
    ],
    opinion: [
      `Считаю что ${topic.slice(0, 60)} — переоценено.\n\nПока все спорят о деталях, главное упускают. Реальная проблема не в том что обсуждают, а в том что молчат.\n\nДумай своей головой. Всегда.`,
      `Моё мнение по ${topic.slice(0, 50)}.\n\nЕсть популярная точка зрения и есть правда. Они не совпадают.\n\nЧто действительно работает — расскажу ниже.`,
    ],
    analysis: [
      `Разбираем: ${topic.slice(0, 60)}.\n\nПервое что заметно — все смотрят не туда. Внимание уходит на громкое, а суть в тихом.\n\nТри слоя проблемы:\n1. Поверхность — то что видят все\n2. Механика — как работает на самом деле\n3. Корень — откуда растут ноги`,
      `Анализирую ${topic.slice(0, 50)}.\n\nЦифры говорят одно, заголовки — другое. Кому верить?\n\nПо фактам: расклад не такой однозначный. Покажу почему.`,
    ],
    freethought: [
      `Думаю про ${topic.slice(0, 50)}.\n\nИногда самые важные вещи — самые неочевидные. То что мы принимаем как данность, на самом деле очень странно.\n\nПопробуй взглянуть свежим взглядом.`,
      `${topic.slice(0, 60)}.\n\nВот что меня в этом цепляет: чем больше думаешь — тем меньше понимаешь. И это нормально.\n\nНе все ответы должны быть готовы прямо сейчас.`,
    ],
    fact: [
      `Малоизвестный факт про ${topic.slice(0, 50)}:\n\nТо что считают правилом — на самом деле исключение. А то что считают исключением — было нормой.\n\nДетали удивят.`,
      `${topic.slice(0, 60)}.\n\nЕсть один нюанс который меняет всё представление. Но о нём почти никто не говорит.\n\nСейчас расскажу.`,
    ],
    list: [
      `${topic.slice(0, 60)} — 5 пунктов:\n\n— Первое: то о чём редко думают\n— Второе: то что недооценивают\n— Третье: то что игнорируют\n— Четвёртое: то что считают неважным\n— Пятое: то что меняет всё`,
      `5 вещей про ${topic.slice(0, 50)}:\n\n— Не делай очевидное — все так делают\n— Смотри куда не смотрят другие\n— Считай не средние, а крайние значения\n— Доверяй данным, не мнениям\n— Действуй когда страшно`,
    ],
  };

  const pool = samples[type] || samples.news;
  return pool.slice(0, count);
}

function showVariants(variants) {
  const section = document.getElementById('results-section');
  const list = document.getElementById('variants-list');

  list.innerHTML = variants.map((text, i) => `
    <div class="variant-card">
      <div class="variant-header">
        <span class="variant-num">Вариант ${i + 1}</span>
      </div>
      <div class="variant-text">${escapeHtml(text)}</div>
      <div class="variant-actions">
        <button class="variant-act primary" onclick="approvePost(${i})">✅ Опубликовать</button>
        <button class="variant-act" onclick="schedulePost(${i})">📅 Позже</button>
        <button class="variant-act" onclick="regeneratePost()">🔄 Заново</button>
      </div>
    </div>
  `).join('');

  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function approvePost(index) {
  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  showAlert('Пост опубликован! (заглушка — скоро подключим к боту)');
}

function schedulePost(index) {
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
  showAlert('Откроется выбор времени публикации (скоро)');
}

function regeneratePost() {
  generatePost();
}

function toggleFeat(featureEl) {
  featureEl.classList.toggle('expanded');
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

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

function upgradePlan(tier) {
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ action: 'upgrade', tier: tier }));
    tg.close();
  } else {
    showAlert(`Переход на тариф ${tier} — скоро подключим оплату через ЮKassa`);
  }
}

function showAlert(message) {
  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

function updateRequestsCounter() {
  document.getElementById('requests-used').textContent = state.requestsToday;
  document.getElementById('requests-limit').textContent = state.requestsLimit;
}

function updateUserUI() {
  const tierLine = document.getElementById('user-tier-line');
  const trialBanner = document.getElementById('trial-banner');
  const trialDays = document.getElementById('trial-days');
  const variantsCount = document.getElementById('variants-count');

  if (state.tier === 'free' && state.trialDaysLeft > 0) {
    tierLine.textContent = `Free · ${state.trialDaysLeft} дней Pro доступа`;
    trialDays.textContent = `осталось ${state.trialDaysLeft} ${declension(state.trialDaysLeft, 'день', 'дня', 'дней')}`;
    trialBanner.style.display = 'flex';
  } else if (state.tier === 'free') {
    tierLine.textContent = 'Free тариф';
    trialBanner.style.display = 'none';
  } else if (state.tier === 'light') {
    tierLine.textContent = 'Light тариф';
    trialBanner.style.display = 'none';
  } else if (state.tier === 'pro') {
    tierLine.textContent = 'Pro тариф';
    trialBanner.style.display = 'none';
  }

  variantsCount.textContent = state.variantsCount;
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
  if (initData?.user) {
    state.user = initData.user;
  }

  state.tier = 'free';
  state.trialDaysLeft = 7;
  state.variantsCount = 3;
  state.requestsLimit = 100;
  state.requestsToday = 0;

  updateUserUI();
}

window.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  console.log('ForgeMetrics Mini App ready');
});

function switchSubtab(name, el) {
  document.querySelectorAll('.subtab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sub-' + name).classList.add('active');
  el.classList.add('active');
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function openImproveModal() {
  openModal('improve-modal');
}

async function runImprove() {
  const original = document.getElementById('improve-input').value.trim();
  if (original.length < 30) {
    showAlert('Вставь хотя бы пару предложений из своего поста');
    return;
  }

  const resultBox = document.getElementById('improve-result');
  resultBox.style.display = 'block';
  resultBox.innerHTML = '<div style="text-align:center;padding:16px;color:#a0b8cc;">⏳ Анализирую и улучшаю...</div>';

  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

  await new Promise(r => setTimeout(r, 1500));

  const improved = mockImprove(original);

  resultBox.innerHTML = `
    <div style="margin-bottom:14px;">
      <div style="font-size:11px;color:#6b8fa8;text-transform:uppercase;margin-bottom:6px;">Твой пост</div>
      <div style="background:#1f2c38;border-radius:8px;padding:10px;font-size:12px;color:#a0b8cc;line-height:1.5;">${escapeHtml(original)}</div>
    </div>
    <div>
      <div style="font-size:11px;color:#4caf50;text-transform:uppercase;margin-bottom:6px;">✨ Улучшенная версия</div>
      <div style="background:#1f2c38;border:1px solid #4caf50;border-radius:8px;padding:10px;font-size:12px;color:#fff;line-height:1.6;">${escapeHtml(improved)}</div>
    </div>
    <button class="btn-primary" onclick="closeModal('improve-modal');switchTab('create')" style="margin-top:14px;">
      Создать ещё пост →
    </button>
  `;

  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function mockImprove(text) {
  return text + "\n\n[Улучшенная версия будет тут — это заглушка для UI-теста. На бэкенде будет реальный AI-улучшитель.]";
}

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
    showAlert('Иди в чат с ботом — отправь /reset_voice чтобы пересоздать голос канала');
  }
}

async function runAudit() {
  showAlert('Запуск AI-аудита канала. Результат придёт в чат.');
  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ action: 'run_audit' }));
    tg.close();
  }
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
