/* ============================================================
   ZenTube — Options page logic
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const DEFAULTS = {
  enabled: true,
  focusMode: 'casual',
  hide: {
    home: false, related: false, comments: false, shorts: true,
    trending: false, endscreen: true, chat: false, notifications: false,
    searchSuggestions: false, viewCount: false, likeCount: false,
    subCount: false, thumbnails: false,
  },
  grayscale: false,
  disableAutoplay: true,
  autoPauseHidden: true,
  blockShortsUrl: true,
  showWidget: true,
  mindfulPause: { enabled: false, delay: 5 },
  timeLimit: { enabled: false, minutesPerDay: 60 },
  customHome: { enabled: false, quote: '' },
  whitelist: [],
  blacklist: [],
  whitelistMode: false,
  schedule: {
    enabled: false,
    rules: [],
  },
  pomodoro: {
    enabled: false,
    workMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    cyclesBeforeLong: 4,
  },
};

const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HIDE_OPTIONS = [
  { key: 'home', title: 'Home feed', sub: 'Empty the homepage of recommended videos.', icon: 'home' },
  { key: 'related', title: 'Sidebar recommendations', sub: 'The "up next" column while watching.', icon: 'list' },
  { key: 'comments', title: 'Comments', sub: 'The entire comments section.', icon: 'chat' },
  { key: 'shorts', title: 'Shorts shelves', sub: 'Hide Shorts everywhere they appear.', icon: 'zap' },
  { key: 'trending', title: 'Trending / Explore', sub: 'Remove from the sidebar.', icon: 'trending' },
  { key: 'endscreen', title: 'End-screen suggestions', sub: 'The video grid at the end of a video.', icon: 'tv' },
  { key: 'chat', title: 'Live chat', sub: 'The live chat panel.', icon: 'message' },
  { key: 'notifications', title: 'Notifications bell', sub: 'The bell in the top bar.', icon: 'bell' },
  { key: 'searchSuggestions', title: 'Search suggestions', sub: 'The dropdown when typing.', icon: 'search' },
  { key: 'viewCount', title: 'View count', sub: 'Hide all view counts.', icon: 'eye' },
  { key: 'likeCount', title: 'Like count', sub: 'Hide the like button number.', icon: 'thumbsup' },
  { key: 'subCount', title: 'Subscriber count', sub: 'Hide channel subscriber count.', icon: 'users' },
  { key: 'thumbnails', title: 'Thumbnails (titles only)', sub: 'Blur thumbnails — read titles only.', icon: 'image' },
];

const VISUAL_OPTIONS = [
  { key: 'grayscale', title: 'Grayscale mode', sub: 'Remove color — reduce visual stimulation.', icon: 'circle' },
];

const ICONS = {
  home: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
  list: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  chat: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  zap: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  trending: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  tv: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  message: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  thumbsup: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>',
  users: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  image: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  circle: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z"/></svg>',
};

let settings = null;

/* ----------------------------------------------------------
   Storage
   ---------------------------------------------------------- */
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      target[key] = source[key];
    }
  }
  return target;
}

async function loadSettings() {
  const data = await new Promise((res) => chrome.storage.sync.get(null, res));
  settings = deepMerge({ ...JSON.parse(JSON.stringify(DEFAULTS)) }, data || {});
  return settings;
}

async function saveSettings(patch) {
  await chrome.storage.sync.set(patch);
  toast('Saved');
}

async function getStats() {
  return new Promise((res) => chrome.runtime.sendMessage({ type: 'GET_STATS' }, res));
}

/* ----------------------------------------------------------
   Rendering
   ---------------------------------------------------------- */
function renderHideGrid() {
  const grid = $('#hide-grid');
  grid.innerHTML = '';
  HIDE_OPTIONS.forEach((opt) => {
    const row = document.createElement('div');
    row.className = 'grid-row';
    row.innerHTML = `
      <div class="grid-row-text">
        <div class="grid-row-title">${ICONS[opt.icon] || ''} ${opt.title}</div>
        <div class="grid-row-sub">${opt.sub}</div>
      </div>
      <label class="switch">
        <input type="checkbox" data-hide-key="${opt.key}" />
        <span class="slider"></span>
      </label>
    `;
    grid.appendChild(row);
  });

  const visGrid = $('#visual-grid');
  visGrid.innerHTML = '';
  VISUAL_OPTIONS.forEach((opt) => {
    const row = document.createElement('div');
    row.className = 'grid-row';
    row.innerHTML = `
      <div class="grid-row-text">
        <div class="grid-row-title">${ICONS[opt.icon] || ''} ${opt.title}</div>
        <div class="grid-row-sub">${opt.sub}</div>
      </div>
      <label class="switch">
        <input type="checkbox" data-visual-key="${opt.key}" />
        <span class="slider"></span>
      </label>
    `;
    visGrid.appendChild(row);
  });
}

function applySettingsToUI() {
  // Master
  $('#enabled-main').checked = !!settings.enabled;
  $('#enable-sub').textContent = settings.enabled ? 'Enabled' : 'Paused';

  // Mode cards
  $$('.mode-card').forEach((c) => {
    c.classList.toggle('active', c.dataset.mode === settings.focusMode);
  });

  // Hide toggles
  HIDE_OPTIONS.forEach((opt) => {
    const input = document.querySelector(`input[data-hide-key="${opt.key}"]`);
    if (input) input.checked = !!settings.hide[opt.key];
  });

  // Visual toggles
  $('input[data-visual-key="grayscale"]').checked = !!settings.grayscale;

  // Time tab
  $('#time-limit-enabled').checked = !!settings.timeLimit.enabled;
  $('#time-limit-range').value = settings.timeLimit.minutesPerDay;
  $('#time-limit-number').value = settings.timeLimit.minutesPerDay;
  $('#disable-autoplay').checked = !!settings.disableAutoplay;
  $('#auto-pause').checked = !!settings.autoPauseHidden;
  $('#block-shorts-url').checked = !!settings.blockShortsUrl;

  // Channels
  $('#whitelist-mode').checked = !!settings.whitelistMode;
  $('#whitelist').value = (settings.whitelist || []).join(', ');
  $('#blacklist').value = (settings.blacklist || []).join(', ');

  // Mindful
  $('#mindful-enabled').checked = !!settings.mindfulPause.enabled;
  $('#mindful-delay').value = settings.mindfulPause.delay;
  $('#mindful-delay-number').value = settings.mindfulPause.delay;
  $('#custom-home-enabled').checked = !!settings.customHome.enabled;
  $('#custom-home-quote').value = settings.customHome.quote || '';
  $('#show-widget').checked = settings.showWidget !== false;

  // Schedule
  $('#schedule-enabled').checked = !!settings.schedule.enabled;
  renderScheduleRules();

  // Pomodoro
  $('#pomodoro-enabled').checked = !!settings.pomodoro.enabled;
  $('#pomodoro-work').value = settings.pomodoro.workMin;
  $('#pomodoro-short').value = settings.pomodoro.shortBreakMin;
  $('#pomodoro-long').value = settings.pomodoro.longBreakMin;
  $('#pomodoro-cycles').value = settings.pomodoro.cyclesBeforeLong;
}

/* ----------------------------------------------------------
   Schedule rules rendering
   ---------------------------------------------------------- */
function renderScheduleRules() {
  const wrap = $('#schedule-rules');
  wrap.innerHTML = '';
  const rules = settings.schedule.rules || [];
  if (rules.length === 0) {
    wrap.innerHTML = `<div class="hint" style="text-align:center;padding:16px;">${msg('scheduleEmpty', 'No rules yet. Add one below.')}</div>`;
    return;
  }
  rules.forEach((rule, idx) => {
    const row = document.createElement('div');
    row.className = 'schedule-rule';
    const daysLabel = (rule.days || []).map((d) => DAY_NAMES_FULL[d]).join(' ');
    row.innerHTML = `
      <div>
        <div class="schedule-rule-name">${escapeHtml(rule.name || msg('untitledRule', 'Untitled'))}</div>
        <div class="schedule-rule-meta">${daysLabel} · ${rule.from} – ${rule.to}</div>
      </div>
      <button class="btn btn-icon" data-action="edit" data-idx="${idx}" title="Edit">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn btn-icon" data-action="delete" data-idx="${idx}" title="Delete">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    `;
    wrap.appendChild(row);
  });
}

function renderEditScheduleRule(idx, rule) {
  const wrap = $('#schedule-rules');
  // Replace just the one row with an edit form
  const rows = wrap.querySelectorAll('.schedule-rule');
  const target = rows[idx];
  if (!target) return;
  target.classList.add('editing');
  target.innerHTML = `
    <div class="edit-form">
      <input type="text" id="edit-name-${idx}" placeholder="${msg('rulePlaceholderName', 'Rule name (e.g. Work hours)')}" value="${escapeHtml(rule.name || '')}" />
      <div class="edit-row">
        <span class="unit-left">${msg('days', 'Days')}</span>
        <div class="schedule-rule-days" id="edit-days-${idx}">
          ${DAY_NAMES_SHORT.map((d, i) => `<button type="button" class="day-chip ${rule.days?.includes(i) ? 'active' : ''}" data-day="${i}">${d}</button>`).join('')}
        </div>
      </div>
      <div class="edit-row">
        <span class="unit-left">${msg('from', 'From')}</span>
        <input type="time" id="edit-from-${idx}" value="${rule.from || '09:00'}" />
        <span class="unit-left">${msg('to', 'To')}</span>
        <input type="time" id="edit-to-${idx}" value="${rule.to || '17:00'}" />
      </div>
      <div class="edit-row" style="justify-content: flex-end;">
        <button class="btn-ghost" data-edit-action="cancel">${msg('cancel', 'Cancel')}</button>
        <button class="btn" data-edit-action="save">${msg('save', 'Save')}</button>
      </div>
    </div>
  `;
  // Day chip toggle
  target.querySelectorAll('.day-chip').forEach((chip) => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });
  target.querySelector('[data-edit-action="cancel"]').addEventListener('click', () => renderScheduleRules());
  target.querySelector('[data-edit-action="save"]').addEventListener('click', async () => {
    const name = target.querySelector(`#edit-name-${idx}`).value.trim() || msg('untitledRule', 'Untitled');
    const days = [...target.querySelectorAll('.day-chip.active')].map((c) => parseInt(c.dataset.day, 10));
    const from = target.querySelector(`#edit-from-${idx}`).value || '09:00';
    const to = target.querySelector(`#edit-to-${idx}`).value || '17:00';
    settings.schedule.rules[idx] = { id: rule.id || cryptoRandom(), name, days, from, to };
    await saveSettings({ schedule: settings.schedule });
    renderScheduleRules();
  });
}

function cryptoRandom() {
  return (crypto?.randomUUID ? crypto.randomUUID() : 'r' + Math.random().toString(36).slice(2));
}

async function renderStats() {
  const stats = await getStats();
  if (!stats) return;

  const todayMin = Math.floor((stats.todaySeconds || 0) / 60);
  $('#big-today').textContent = formatMinutes(todayMin);
  $('#today-min').textContent = todayMin;

  // Week sum
  const history = stats.history || {};
  const today = new Date();
  let weekSec = stats.todaySeconds || 0;
  for (let i = 1; i < 7; i++) {
    const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    weekSec += history[d] || 0;
  }
  $('#big-week').textContent = formatMinutes(Math.floor(weekSec / 60));

  $('#big-streak').textContent = stats.streak || 0;

  const totalHours = Math.floor((stats.totalSecondsAllTime || 0) / 3600);
  $('#big-total').textContent = `${totalHours}h`;

  // Chart — last 14 days
  const chart = $('#chart');
  chart.innerHTML = '';
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const sec = i === 0 ? (stats.todaySeconds || 0) : (history[key] || 0);
    days.push({ key, date: d, seconds: sec });
  }
  const maxSec = Math.max(...days.map((d) => d.seconds), 600);
  days.forEach((day) => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    const pct = (day.seconds / maxSec) * 100;
    const min = Math.floor(day.seconds / 60);
    const dayLabel = day.date.toLocaleDateString(undefined, { weekday: 'short' })[0];
    bar.innerHTML = `
      <div class="chart-bar-value">${min}m</div>
      <div class="chart-bar-fill" style="height:${Math.max(pct, day.seconds > 0 ? 4 : 0)}%"></div>
      <div class="chart-bar-label">${dayLabel}</div>
    `;
    chart.appendChild(bar);
  });

  // Intents
  const list = $('#intent-list');
  list.innerHTML = '';
  const intents = stats.intents || [];
  if (intents.length === 0) {
    list.innerHTML = '<li class="empty">No intentions logged yet. Enable mindful pause to start.</li>';
  } else {
    intents.slice(0, 10).forEach((i) => {
      const li = document.createElement('li');
      const when = new Date(i.at);
      li.innerHTML = `
        <div>${escapeHtml(i.text)}</div>
        <div class="intent-time">${when.toLocaleString()}</div>
      `;
      list.appendChild(li);
    });
  }
}

function formatMinutes(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function msg(key, fallback) {
  try {
    const m = chrome.i18n.getMessage(key);
    return m || fallback || key;
  } catch {
    return fallback || key;
  }
}

function applyI18nDom() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const m = chrome.i18n.getMessage(key);
    if (m) el.textContent = m;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const m = chrome.i18n.getMessage(key);
    if (m) el.placeholder = m;
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    const m = chrome.i18n.getMessage(key);
    if (m) el.title = m;
  });
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => (t.hidden = true), 1400);
}

/* ----------------------------------------------------------
   Event wiring
   ---------------------------------------------------------- */
function wire() {
  // Tab nav
  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      $$('.nav-item').forEach((b) => b.classList.toggle('active', b === btn));
      $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
      if (tab === 'stats') renderStats();
    });
  });

  // Master toggle
  $('#enabled-main').addEventListener('change', async (e) => {
    settings.enabled = e.target.checked;
    $('#enable-sub').textContent = settings.enabled ? 'Enabled' : 'Paused';
    await saveSettings({ enabled: settings.enabled });
  });

  // Mode cards
  $$('.mode-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const mode = card.dataset.mode;
      settings.focusMode = mode;
      $$('.mode-card').forEach((c) => c.classList.toggle('active', c === card));
      await saveSettings({ focusMode: mode });
    });
  });

  // Hide toggles
  HIDE_OPTIONS.forEach((opt) => {
    const input = document.querySelector(`input[data-hide-key="${opt.key}"]`);
    if (!input) return;
    input.addEventListener('change', async () => {
      settings.hide[opt.key] = input.checked;
      await saveSettings({ hide: settings.hide });
    });
  });

  // Grayscale
  $('input[data-visual-key="grayscale"]').addEventListener('change', async (e) => {
    settings.grayscale = e.target.checked;
    await saveSettings({ grayscale: settings.grayscale });
  });

  // Time limit
  $('#time-limit-enabled').addEventListener('change', async (e) => {
    settings.timeLimit.enabled = e.target.checked;
    await saveSettings({ timeLimit: settings.timeLimit });
  });

  const bindRangeNumber = (rangeId, numId, onChange) => {
    const range = document.getElementById(rangeId);
    const num = document.getElementById(numId);
    range.addEventListener('input', () => {
      num.value = range.value;
      onChange(parseInt(range.value, 10));
    });
    num.addEventListener('input', () => {
      range.value = num.value;
      onChange(parseInt(num.value, 10));
    });
  };

  bindRangeNumber('time-limit-range', 'time-limit-number', async (v) => {
    settings.timeLimit.minutesPerDay = v;
    await saveSettings({ timeLimit: settings.timeLimit });
  });

  $('#disable-autoplay').addEventListener('change', async (e) => {
    settings.disableAutoplay = e.target.checked;
    await saveSettings({ disableAutoplay: settings.disableAutoplay });
  });

  $('#auto-pause').addEventListener('change', async (e) => {
    settings.autoPauseHidden = e.target.checked;
    await saveSettings({ autoPauseHidden: settings.autoPauseHidden });
  });

  $('#block-shorts-url').addEventListener('change', async (e) => {
    settings.blockShortsUrl = e.target.checked;
    await saveSettings({ blockShortsUrl: settings.blockShortsUrl });
  });

  // Channels
  $('#whitelist-mode').addEventListener('change', async (e) => {
    settings.whitelistMode = e.target.checked;
    await saveSettings({ whitelistMode: settings.whitelistMode });
  });

  $('#whitelist').addEventListener('change', async (e) => {
    settings.whitelist = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
    await saveSettings({ whitelist: settings.whitelist });
  });

  $('#blacklist').addEventListener('change', async (e) => {
    settings.blacklist = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
    await saveSettings({ blacklist: settings.blacklist });
  });

  // Mindful
  $('#mindful-enabled').addEventListener('change', async (e) => {
    settings.mindfulPause.enabled = e.target.checked;
    await saveSettings({ mindfulPause: settings.mindfulPause });
  });

  bindRangeNumber('mindful-delay', 'mindful-delay-number', async (v) => {
    settings.mindfulPause.delay = v;
    await saveSettings({ mindfulPause: settings.mindfulPause });
  });

  $('#custom-home-enabled').addEventListener('change', async (e) => {
    settings.customHome.enabled = e.target.checked;
    await saveSettings({ customHome: settings.customHome });
  });

  $('#custom-home-quote').addEventListener('change', async (e) => {
    settings.customHome.quote = e.target.value;
    await saveSettings({ customHome: settings.customHome });
  });

  $('#show-widget').addEventListener('change', async (e) => {
    settings.showWidget = e.target.checked;
    await saveSettings({ showWidget: settings.showWidget });
  });

  // Schedule
  $('#schedule-enabled').addEventListener('change', async (e) => {
    settings.schedule.enabled = e.target.checked;
    await saveSettings({ schedule: settings.schedule });
  });

  $('#add-schedule-rule').addEventListener('click', () => {
    const newRule = { id: cryptoRandom(), name: '', days: [1, 2, 3, 4, 5], from: '09:00', to: '13:00' };
    settings.schedule.rules.push(newRule);
    renderScheduleRules();
    renderEditScheduleRule(settings.schedule.rules.length - 1, newRule);
  });

  $('#schedule-rules').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    if (btn.dataset.action === 'edit') {
      renderEditScheduleRule(idx, settings.schedule.rules[idx]);
    } else if (btn.dataset.action === 'delete') {
      if (!confirm(msg('confirmDeleteRule', 'Delete this rule?'))) return;
      settings.schedule.rules.splice(idx, 1);
      await saveSettings({ schedule: settings.schedule });
      renderScheduleRules();
    }
  });

  // Pomodoro
  $('#pomodoro-enabled').addEventListener('change', async (e) => {
    settings.pomodoro.enabled = e.target.checked;
    await saveSettings({ pomodoro: settings.pomodoro });
  });

  ['work', 'short', 'long', 'cycles'].forEach((field) => {
    const map = { work: 'workMin', short: 'shortBreakMin', long: 'longBreakMin', cycles: 'cyclesBeforeLong' };
    $(`#pomodoro-${field}`).addEventListener('change', async (e) => {
      settings.pomodoro[map[field]] = parseInt(e.target.value, 10) || 1;
      await saveSettings({ pomodoro: settings.pomodoro });
    });
  });

  // Stats
  $('#reset-stats').addEventListener('click', async () => {
    if (!confirm('Reset all stats? This cannot be undone.')) return;
    await chrome.runtime.sendMessage({ type: 'RESET_STATS' });
    renderStats();
    toast('Stats reset');
  });

  // Export / import
  $('#export-settings').addEventListener('click', async () => {
    const data = await new Promise((res) => chrome.storage.sync.get(null, res));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zentube-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#import-settings').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await chrome.storage.sync.set(data);
      await loadSettings();
      applySettingsToUI();
      toast('Imported settings');
    } catch (err) {
      toast('Invalid file');
    }
  });
}

/* ----------------------------------------------------------
   Boot
   ---------------------------------------------------------- */
(async function init() {
  renderHideGrid();
  await loadSettings();
  applyI18nDom();
  applySettingsToUI();
  wire();
  renderStats();
})();
