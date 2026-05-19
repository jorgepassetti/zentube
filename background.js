/* ============================================================
   ZenTube — Background Service Worker
   Tracks time on YouTube, enforces daily limit, manages stats,
   handles keyboard commands.
   ============================================================ */

const DEFAULTS_SETTINGS = {
  enabled: true,
  focusMode: 'casual',
  timeLimit: { enabled: false, minutesPerDay: 60 },
};

const DEFAULTS_STATS = {
  date: todayKey(),
  todaySeconds: 0,
  videosBlocked: 0,
  shortsRedirected: 0,
  history: {},          // { '2026-05-17': secondsThatDay }
  streak: 0,
  bestStreak: 0,
  intents: [],
  totalSecondsAllTime: 0,
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function getStats() {
  const { stats } = await chrome.storage.local.get('stats');
  let s = { ...DEFAULTS_STATS, ...(stats || {}) };
  if (s.date !== todayKey()) {
    // Day rolled over — push yesterday into history
    if (s.date && s.todaySeconds > 0) {
      s.history = s.history || {};
      s.history[s.date] = s.todaySeconds;
      // Trim history to last 90 days
      const days = Object.keys(s.history).sort().slice(-90);
      const trimmed = {};
      days.forEach((d) => (trimmed[d] = s.history[d]));
      s.history = trimmed;
    }
    // Update streak: if yesterday was under limit
    const yesterdayKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const settings = await getSettings();
    const limit = settings.timeLimit.enabled ? settings.timeLimit.minutesPerDay * 60 : Infinity;
    const yesterdaySeconds = s.history[yesterdayKey] || 0;
    if (yesterdaySeconds > 0 && yesterdaySeconds <= limit) {
      s.streak = (s.streak || 0) + 1;
      s.bestStreak = Math.max(s.bestStreak || 0, s.streak);
    } else if (yesterdaySeconds > limit) {
      s.streak = 0;
    }
    s.date = todayKey();
    s.todaySeconds = 0;
    await chrome.storage.local.set({ stats: s });
  }
  return s;
}

async function setStats(s) {
  await chrome.storage.local.set({ stats: s });
}

async function getSettings() {
  const data = await chrome.storage.sync.get(null);
  return {
    ...DEFAULTS_SETTINGS,
    ...(data || {}),
    timeLimit: { ...DEFAULTS_SETTINGS.timeLimit, ...(data?.timeLimit || {}) },
    schedule: { enabled: false, rules: [], ...(data?.schedule || {}) },
    pomodoro: {
      enabled: false,
      workMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      cyclesBeforeLong: 4,
      ...(data?.pomodoro || {}),
    },
  };
}

/* ----------------------------------------------------------
   Schedule enforcement
   ---------------------------------------------------------- */
function isRuleActive(rule, now = new Date()) {
  if (!rule || !rule.days || rule.days.length === 0) return false;
  const today = now.getDay();
  if (!rule.days.includes(today)) return false;
  const [fromH, fromM] = (rule.from || '00:00').split(':').map(Number);
  const [toH, toM] = (rule.to || '23:59').split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const fromMin = fromH * 60 + fromM;
  const toMin = toH * 60 + toM;
  if (fromMin <= toMin) {
    return nowMin >= fromMin && nowMin < toMin;
  }
  // Overnight rule (from 22:00 to 06:00)
  return nowMin >= fromMin || nowMin < toMin;
}

async function checkSchedule() {
  const settings = await getSettings();
  if (!settings.schedule.enabled) return;
  const now = new Date();
  const activeRule = settings.schedule.rules.find((r) => isRuleActive(r, now));
  if (!activeRule) return;
  const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
  for (const tab of tabs) {
    try {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SCHEDULE_BLOCKED',
        ruleName: activeRule.name || 'Scheduled block',
        until: activeRule.to,
      });
    } catch {}
  }
}

/* ----------------------------------------------------------
   Pomodoro state machine
   ---------------------------------------------------------- */
async function getPomodoroState() {
  const { pomodoroState } = await chrome.storage.local.get('pomodoroState');
  return pomodoroState || { running: false, phase: 'idle', startedAt: null, cycleCount: 0 };
}

async function setPomodoroState(state) {
  await chrome.storage.local.set({ pomodoroState: state });
  // Broadcast to youtube tabs
  const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
  for (const tab of tabs) {
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'POMODORO_UPDATE', state });
    } catch {}
  }
}

async function pomodoroStart() {
  const settings = await getSettings();
  const state = {
    running: true,
    phase: 'work',
    startedAt: Date.now(),
    cycleCount: 0,
    workMin: settings.pomodoro.workMin,
    shortBreakMin: settings.pomodoro.shortBreakMin,
    longBreakMin: settings.pomodoro.longBreakMin,
    cyclesBeforeLong: settings.pomodoro.cyclesBeforeLong,
  };
  await setPomodoroState(state);
  scheduleNextPomodoroAlarm(state);
}

async function pomodoroStop() {
  await setPomodoroState({ running: false, phase: 'idle', startedAt: null, cycleCount: 0 });
  chrome.alarms.clear('zentube-pomodoro');
}

async function pomodoroAdvance() {
  const state = await getPomodoroState();
  if (!state.running) return;
  let nextPhase = 'work';
  let cycleCount = state.cycleCount || 0;
  if (state.phase === 'work') {
    cycleCount++;
    nextPhase = cycleCount % state.cyclesBeforeLong === 0 ? 'long_break' : 'short_break';
  } else {
    nextPhase = 'work';
  }
  const newState = { ...state, phase: nextPhase, startedAt: Date.now(), cycleCount };
  await setPomodoroState(newState);
  scheduleNextPomodoroAlarm(newState);
}

function scheduleNextPomodoroAlarm(state) {
  const mins = state.phase === 'work'
    ? state.workMin
    : state.phase === 'long_break'
      ? state.longBreakMin
      : state.shortBreakMin;
  chrome.alarms.create('zentube-pomodoro', { when: Date.now() + mins * 60 * 1000 });
}

/* ----------------------------------------------------------
   Message handlers
   ---------------------------------------------------------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === 'TICK') {
      const stats = await getStats();
      stats.todaySeconds += msg.seconds || 5;
      stats.totalSecondsAllTime = (stats.totalSecondsAllTime || 0) + (msg.seconds || 5);
      await setStats(stats);

      const settings = await getSettings();
      if (settings.timeLimit.enabled) {
        const limitSec = settings.timeLimit.minutesPerDay * 60;
        if (stats.todaySeconds >= limitSec && sender.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'LIMIT_HIT',
            minutes: settings.timeLimit.minutesPerDay,
          });
        }
      }
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'GET_STATS') {
      const stats = await getStats();
      sendResponse({
        todaySeconds: stats.todaySeconds,
        videosBlocked: stats.videosBlocked,
        shortsRedirected: stats.shortsRedirected,
        streak: stats.streak,
        bestStreak: stats.bestStreak,
        history: stats.history || {},
        totalSecondsAllTime: stats.totalSecondsAllTime || 0,
      });
      return;
    }

    if (msg.type === 'LOG_INTENT') {
      const stats = await getStats();
      stats.intents = stats.intents || [];
      stats.intents.unshift({ text: msg.intent, at: Date.now() });
      stats.intents = stats.intents.slice(0, 20);
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'INCREMENT') {
      const stats = await getStats();
      stats[msg.key] = (stats[msg.key] || 0) + 1;
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'RESET_STATS') {
      await chrome.storage.local.set({
        stats: { ...DEFAULTS_STATS, date: todayKey() },
      });
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'OPEN_POPUP_FALLBACK') {
      // Service workers can't open the action popup directly. Open options instead.
      chrome.runtime.openOptionsPage();
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'POMODORO_START') {
      await pomodoroStart();
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'POMODORO_STOP') {
      await pomodoroStop();
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'GET_POMODORO') {
      const state = await getPomodoroState();
      sendResponse(state);
      return;
    }
  })();
  return true; // async
});

/* ----------------------------------------------------------
   Keyboard commands
   ---------------------------------------------------------- */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-focus-mode') {
    const settings = await getSettings();
    const next = settings.focusMode === 'deep' ? 'casual' : 'deep';
    await chrome.storage.sync.set({ focusMode: next });
  } else if (command === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
});

/* ----------------------------------------------------------
   Daily reset alarm
   ---------------------------------------------------------- */
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('zentube-daily-reset', { periodInMinutes: 60 });
  // First-run: open options to onboard
  chrome.runtime.openOptionsPage();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'zentube-daily-reset') {
    await getStats();
  } else if (alarm.name === 'zentube-schedule-check') {
    await checkSchedule();
  } else if (alarm.name === 'zentube-pomodoro') {
    await pomodoroAdvance();
  }
});

chrome.alarms.create('zentube-schedule-check', { periodInMinutes: 1 });
