/* ============================================================
   ZenTube — Popup logic
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const KOFI_URL = 'https://ko-fi.com/H6E01ZT8Z2';
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/jorgepassetti';

const HIDE_KEYS = ['home', 'related', 'comments', 'shorts', 'endscreen', 'viewCount'];

function i18n(key, fallback) {
  try {
    const m = chrome.i18n.getMessage(key);
    return m || fallback || key;
  } catch {
    return fallback || key;
  }
}

function applyI18nDom() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const m = chrome.i18n.getMessage(el.dataset.i18n);
    if (m) el.textContent = m;
  });
}

function modeDescriptions() {
  return {
    off: i18n('modeOffDesc', 'ZenTube is disabled. YouTube behaves normally.'),
    casual: i18n('modeCasualDesc', 'Hides Shorts and end-screen suggestions. Comments and home feed stay visible.'),
    learning: i18n('modeLearningDesc', 'Hides home feed, recommendations, Shorts, trending, and view counts. Comments stay.'),
    deep: i18n('modeDeepDesc', 'Hides everything except the current video. Grayscale on. Maximum focus.'),
  };
}

let settings = null;
let stats = null;

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (data) => resolve(data || {}));
  });
}

async function loadStats() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (s) => resolve(s || {}));
  });
}

async function save(patch) {
  await chrome.storage.sync.set(patch);
}

function applySettingsToUI() {
  // Master toggle
  const enabled = settings.enabled !== false;
  $('#enabled-toggle').checked = enabled;
  $('.container').classList.toggle('disabled', !enabled);
  $('#master-sub').textContent = enabled
    ? 'Active on YouTube'
    : 'Paused — YouTube is normal';

  // Focus mode segmented
  const mode = settings.focusMode || 'casual';
  $$('#focus-mode-group .seg').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  $('#mode-desc').textContent = modeDescriptions()[mode] || '';

  // Quick toggles — show preset state but allow override
  const presetHide = previewHide(mode);
  HIDE_KEYS.forEach((key) => {
    const row = document.querySelector(`.toggle-row[data-key="${key}"]`);
    if (!row) return;
    const input = row.querySelector('input[type="checkbox"]');
    const effective = settings.hide?.[key] ?? presetHide[key] ?? false;
    input.checked = !!effective;
    // Disable individual toggles when in a managed mode; allow only on casual/off
    const managed = mode === 'learning' || mode === 'deep';
    row.style.opacity = managed ? 0.55 : 1;
    row.style.pointerEvents = managed ? 'none' : 'auto';
  });

  // Grayscale
  const grayscaleRow = document.querySelector('.toggle-row[data-key="grayscale"]');
  if (grayscaleRow) {
    grayscaleRow.querySelector('input').checked = !!settings.grayscale;
  }
}

function previewHide(mode) {
  switch (mode) {
    case 'off':
      return {};
    case 'casual':
      return { shorts: true, endscreen: true };
    case 'learning':
      return { home: true, related: true, shorts: true, trending: true, endscreen: true, notifications: true, viewCount: true };
    case 'deep':
      return { home: true, related: true, comments: true, shorts: true, trending: true, endscreen: true, chat: true, notifications: true, searchSuggestions: true, viewCount: true, likeCount: true, subCount: true };
    default:
      return {};
  }
}

function applyStatsToUI() {
  if (!stats) return;
  const minutes = Math.floor((stats.todaySeconds || 0) / 60);
  $('#stat-today').textContent = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  $('#stat-streak').textContent = `${stats.streak || 0}🔥`;
  $('#stat-blocked').textContent = (stats.shortsRedirected || 0) + (stats.videosBlocked || 0);

  const limitEnabled = settings.timeLimit?.enabled;
  const limit = settings.timeLimit?.minutesPerDay || 60;
  if (limitEnabled) {
    $('#progress-wrap').hidden = false;
    const pct = Math.min(100, (minutes / limit) * 100);
    $('#progress-bar').style.width = `${pct}%`;
    $('#progress-label').textContent = `${minutes} / ${limit} minutes today`;
  } else {
    $('#progress-wrap').hidden = true;
  }
}

/* ----------------------------------------------------------
   Event wiring
   ---------------------------------------------------------- */
function wire() {
  // Master toggle
  $('#enabled-toggle').addEventListener('change', async (e) => {
    settings.enabled = e.target.checked;
    await save({ enabled: settings.enabled });
    applySettingsToUI();
  });

  // Focus mode segmented buttons
  $$('#focus-mode-group .seg').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode;
      settings.focusMode = mode;
      await save({ focusMode: mode });
      // Clear custom hide overrides so preset takes effect cleanly
      if (mode !== 'casual' && mode !== 'off') {
        settings.hide = {};
        await save({ hide: {} });
      }
      applySettingsToUI();
    });
  });

  // Individual quick toggles
  HIDE_KEYS.forEach((key) => {
    const row = document.querySelector(`.toggle-row[data-key="${key}"]`);
    if (!row) return;
    const input = row.querySelector('input[type="checkbox"]');
    input.addEventListener('change', async () => {
      settings.hide = settings.hide || {};
      settings.hide[key] = input.checked;
      await save({ hide: settings.hide });
    });
  });

  // Grayscale
  const grayscaleRow = document.querySelector('.toggle-row[data-key="grayscale"]');
  if (grayscaleRow) {
    grayscaleRow.querySelector('input').addEventListener('change', async (e) => {
      settings.grayscale = e.target.checked;
      await save({ grayscale: settings.grayscale });
    });
  }

  // Open options
  $('#open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('#open-options-bottom').addEventListener('click', () => chrome.runtime.openOptionsPage());

  // Pomodoro toggle
  $('#pomo-toggle').addEventListener('click', async () => {
    const state = await getPomodoroState();
    if (state.running) {
      await chrome.runtime.sendMessage({ type: 'POMODORO_STOP' });
    } else {
      await chrome.runtime.sendMessage({ type: 'POMODORO_START' });
    }
    setTimeout(refreshPomodoro, 100);
  });

  // Donations — open in new tab
  $('#donate-kofi').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: KOFI_URL });
  });
  $('#donate-github').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: GITHUB_SPONSORS_URL });
  });
}

/* ----------------------------------------------------------
   Pomodoro display
   ---------------------------------------------------------- */
async function getPomodoroState() {
  return new Promise((res) => chrome.runtime.sendMessage({ type: 'GET_POMODORO' }, res));
}

async function refreshPomodoro() {
  if (!settings.pomodoro?.enabled) {
    $('#pomo-section').hidden = true;
    return;
  }
  $('#pomo-section').hidden = false;
  const state = await getPomodoroState();
  if (!state || !state.running) {
    $('#pomo-phase').textContent = i18n('pomoIdle', 'Idle');
    $('#pomo-clock').textContent = `${String(settings.pomodoro.workMin).padStart(2, '0')}:00`;
    const btn = $('#pomo-toggle');
    btn.textContent = i18n('pomoStart', 'Start focus');
    btn.classList.remove('stop');
  } else {
    const phaseNames = {
      work: i18n('pomoPhaseWork', 'Focus'),
      short_break: i18n('pomoPhaseShort', 'Short break'),
      long_break: i18n('pomoPhaseLong', 'Long break'),
    };
    $('#pomo-phase').textContent = phaseNames[state.phase] || state.phase;
    const totalMin = state.phase === 'work'
      ? state.workMin
      : state.phase === 'long_break'
        ? state.longBreakMin
        : state.shortBreakMin;
    const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    const remaining = Math.max(0, totalMin * 60 - elapsed);
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    $('#pomo-clock').textContent = `${mm}:${ss}`;
    const btn = $('#pomo-toggle');
    btn.textContent = i18n('pomoStop', 'Stop');
    btn.classList.add('stop');
  }
}

/* ----------------------------------------------------------
   Boot
   ---------------------------------------------------------- */
(async function init() {
  settings = await loadSettings();
  stats = await loadStats();
  applyI18nDom();
  applySettingsToUI();
  applyStatsToUI();
  refreshPomodoro();
  wire();

  // Refresh stats + pomodoro live while popup is open
  setInterval(async () => {
    stats = await loadStats();
    applyStatsToUI();
    refreshPomodoro();
  }, 1000);
})();
