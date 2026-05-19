/* ============================================================
   ZenTube — Content Script
   Runs on every youtube.com page. Reads settings, toggles
   classes on <html>, redirects Shorts, injects custom home,
   shows mindful pause, tracks time.
   ============================================================ */

(() => {
  'use strict';

  const ROOT = document.documentElement;
  const DEFAULTS = {
    enabled: true,
    focusMode: 'casual', // 'off' | 'casual' | 'learning' | 'deep'
    hide: {
      home: false,
      related: false,
      comments: false,
      shorts: true,
      trending: false,
      endscreen: true,
      chat: false,
      notifications: false,
      searchSuggestions: false,
      viewCount: false,
      likeCount: false,
      subCount: false,
      thumbnails: false,
    },
    grayscale: false,
    disableAutoplay: true,
    autoPauseHidden: true,
    blockShortsUrl: true,
    mindfulPause: { enabled: false, delay: 5 },
    timeLimit: { enabled: false, minutesPerDay: 60 },
    customHome: { enabled: false, quote: '' },
    whitelist: [],
    blacklist: [],
    whitelistMode: false,
    showWidget: true,
  };

  const FOCUS_PRESETS = {
    off: {
      hide: { home: false, related: false, comments: false, shorts: false, trending: false, endscreen: false, chat: false, notifications: false, searchSuggestions: false, viewCount: false, likeCount: false, subCount: false, thumbnails: false },
      grayscale: false,
    },
    casual: {
      hide: { home: false, related: false, comments: false, shorts: true, trending: false, endscreen: true, chat: false, notifications: false, searchSuggestions: false, viewCount: false, likeCount: false, subCount: false, thumbnails: false },
      grayscale: false,
    },
    learning: {
      hide: { home: true, related: true, comments: false, shorts: true, trending: true, endscreen: true, chat: false, notifications: true, searchSuggestions: false, viewCount: true, likeCount: false, subCount: false, thumbnails: false },
      grayscale: false,
    },
    deep: {
      hide: { home: true, related: true, comments: true, shorts: true, trending: true, endscreen: true, chat: true, notifications: true, searchSuggestions: true, viewCount: true, likeCount: true, subCount: true, thumbnails: false },
      grayscale: true,
    },
  };

  const QUOTES = [
    "What you focus on grows.",
    "Be where your feet are.",
    "Watch with intention.",
    "Time is the one thing you can't get back.",
    "The quieter you become, the more you can hear.",
    "Do less, but better.",
    "Distraction is the enemy of depth.",
    "Your attention is your most valuable asset.",
    "The best time to plant a tree was 20 years ago. The next best is now.",
    "Almost everything will work again if you unplug it for a few minutes — including you.",
  ];

  let settings = { ...DEFAULTS };
  let widgetEl = null;
  let mindfulShown = false;
  let lastUrl = location.href;
  let activeTimerHandle = null;
  let lastActiveTime = Date.now();
  let limitOverlayShown = false;

  /* ----------------------------------------------------------
     Settings load + listen
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

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (data) => {
        settings = deepMerge({ ...DEFAULTS }, data || {});
        // Focus mode overrides individual hide toggles if not 'off' and not 'custom'
        if (settings.focusMode && FOCUS_PRESETS[settings.focusMode]) {
          const preset = FOCUS_PRESETS[settings.focusMode];
          settings.hide = { ...settings.hide, ...preset.hide };
          if (preset.grayscale !== undefined) settings.grayscale = preset.grayscale;
        }
        resolve(settings);
      });
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    loadSettings().then(applyAll);
  });

  /* ----------------------------------------------------------
     Apply CSS classes to <html>
     ---------------------------------------------------------- */
  function applyClasses() {
    if (!settings.enabled) {
      // Strip every zt- class
      [...ROOT.classList].forEach((c) => {
        if (c.startsWith('zt-')) ROOT.classList.remove(c);
      });
      return;
    }
    const map = {
      'zt-hide-home': settings.hide.home,
      'zt-hide-related': settings.hide.related,
      'zt-hide-comments': settings.hide.comments,
      'zt-hide-shorts': settings.hide.shorts,
      'zt-hide-trending': settings.hide.trending,
      'zt-hide-endscreen': settings.hide.endscreen,
      'zt-hide-chat': settings.hide.chat,
      'zt-hide-notifications': settings.hide.notifications,
      'zt-hide-search-suggestions': settings.hide.searchSuggestions,
      'zt-hide-view-count': settings.hide.viewCount,
      'zt-hide-like-count': settings.hide.likeCount,
      'zt-hide-sub-count': settings.hide.subCount,
      'zt-hide-thumbnails': settings.hide.thumbnails,
      'zt-grayscale': settings.grayscale,
      'zt-deep-focus': settings.focusMode === 'deep',
    };
    Object.entries(map).forEach(([cls, on]) => {
      ROOT.classList.toggle(cls, !!on);
    });
  }

  /* ----------------------------------------------------------
     Shorts handling — redirect /shorts/VIDEO_ID → /watch?v=VIDEO_ID
     ---------------------------------------------------------- */
  function maybeRedirectShorts() {
    if (!settings.enabled || !settings.blockShortsUrl) return;
    const m = location.pathname.match(/^\/shorts\/([^/?]+)/);
    if (m) {
      const id = m[1];
      location.replace(`https://www.youtube.com/watch?v=${id}`);
    }
  }

  /* ----------------------------------------------------------
     Disable autoplay
     ---------------------------------------------------------- */
  function disableAutoplay() {
    if (!settings.enabled || !settings.disableAutoplay) return;
    // Try to find the autoplay toggle and turn it off
    const toggle = document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"]');
    if (toggle) toggle.click();
  }

  /* ----------------------------------------------------------
     Auto-pause when tab is hidden
     ---------------------------------------------------------- */
  function setupAutoPause() {
    document.addEventListener('visibilitychange', () => {
      if (!settings.enabled || !settings.autoPauseHidden) return;
      const video = document.querySelector('video.html5-main-video');
      if (!video) return;
      if (document.hidden && !video.paused) {
        video.pause();
        video.dataset.zentubePaused = '1';
      } else if (!document.hidden && video.dataset.zentubePaused === '1') {
        delete video.dataset.zentubePaused;
      }
    });
  }

  /* ----------------------------------------------------------
     Channel whitelist/blacklist enforcement on watch pages
     ---------------------------------------------------------- */
  function enforceChannelRules() {
    if (!settings.enabled) return;
    if (!location.pathname.startsWith('/watch')) return;
    const handle =
      document.querySelector('ytd-video-owner-renderer #channel-name a')?.textContent?.trim() ||
      document.querySelector('ytd-channel-name a')?.textContent?.trim();
    if (!handle) return;

    const lower = handle.toLowerCase();
    const inBlacklist = settings.blacklist.some((c) => c.toLowerCase() === lower);
    const inWhitelist = settings.whitelist.some((c) => c.toLowerCase() === lower);

    let blocked = false;
    if (inBlacklist) blocked = true;
    if (settings.whitelistMode && settings.whitelist.length > 0 && !inWhitelist) blocked = true;

    if (blocked) showChannelBlockedOverlay(handle);
  }

  function showChannelBlockedOverlay(handle) {
    if (document.getElementById('zentube-limit-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'zentube-limit-overlay';
    overlay.innerHTML = `
      <div class="zt-limit-box">
        <h2>Channel blocked</h2>
        <p>You've set <strong>${escapeHtml(handle)}</strong> as off-limits. Take a breath — there's better use of this time.</p>
        <button id="zt-leave">Take me back</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const video = document.querySelector('video.html5-main-video');
    if (video) video.pause();
    document.getElementById('zt-leave').addEventListener('click', () => {
      history.length > 1 ? history.back() : (location.href = 'about:blank');
    });
  }

  /* ----------------------------------------------------------
     Mindful pause — first visit per session
     ---------------------------------------------------------- */
  function maybeShowMindfulPause() {
    if (!settings.enabled || !settings.mindfulPause.enabled || mindfulShown) return;
    // Only on first homepage / watch entry of session
    const sessionKey = 'zt_mindful_shown_session';
    if (sessionStorage.getItem(sessionKey)) {
      mindfulShown = true;
      return;
    }
    mindfulShown = true;
    sessionStorage.setItem(sessionKey, '1');
    showMindfulOverlay();
  }

  function showMindfulOverlay() {
    if (document.getElementById('zentube-mindful-overlay')) return;
    const delay = Math.max(1, settings.mindfulPause.delay || 5);
    const overlay = document.createElement('div');
    overlay.id = 'zentube-mindful-overlay';
    overlay.innerHTML = `
      <div class="zt-mindful-box">
        <svg class="zt-mindful-logo" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="zt-grad-mindful" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#6366F1"/>
              <stop offset="100%" stop-color="#14B8A6"/>
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="26" fill="none" stroke="url(#zt-grad-mindful)" stroke-width="4" stroke-linecap="round" stroke-dasharray="140 200" transform="rotate(-90 32 32)"/>
          <polygon points="26,22 26,42 44,32" fill="url(#zt-grad-mindful)"/>
        </svg>
        <h2>Take a breath</h2>
        <p>Why are you opening YouTube right now? Writing your intention helps you stay on track.</p>
        <input id="zt-intent" type="text" placeholder="I want to..." autocomplete="off"/>
        <div class="zt-mindful-actions">
          <button class="zt-btn-secondary" id="zt-close">Close YouTube</button>
          <button class="zt-btn-primary" id="zt-continue" disabled>Continue (${delay}s)</button>
        </div>
        <div class="zt-timer" id="zt-tip">Tip: typing your intent makes you 2× more likely to stop on time.</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const btn = document.getElementById('zt-continue');
    let remaining = delay;
    const tick = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(tick);
        btn.disabled = false;
        btn.textContent = 'Continue';
      } else {
        btn.textContent = `Continue (${remaining}s)`;
      }
    }, 1000);

    btn.addEventListener('click', () => {
      clearInterval(tick);
      overlay.remove();
      const intent = document.getElementById('zt-intent')?.value?.trim();
      if (intent) {
        chrome.runtime.sendMessage({ type: 'LOG_INTENT', intent });
      }
    });

    document.getElementById('zt-close').addEventListener('click', () => {
      clearInterval(tick);
      window.close();
      // Fallback if window.close() doesn't work (browser-managed tab)
      setTimeout(() => (location.href = 'about:blank'), 100);
    });
  }

  /* ----------------------------------------------------------
     Custom homepage replacement
     ---------------------------------------------------------- */
  function maybeReplaceHome() {
    if (!settings.enabled || !settings.customHome.enabled) return;
    const isHome = location.pathname === '/' || location.pathname === '';
    const existing = document.getElementById('zentube-home-replacement');
    if (!isHome) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;

    const greeting = greetingForTime();
    const quote =
      settings.customHome.quote?.trim() || QUOTES[Math.floor(Math.random() * QUOTES.length)];

    const box = document.createElement('div');
    box.id = 'zentube-home-replacement';
    box.innerHTML = `
      <div class="zt-home-box">
        <div class="zt-greeting">${greeting}</div>
        <div class="zt-time" id="zt-clock">${formatClock(new Date())}</div>
        <div class="zt-date">${formatDate(new Date())}</div>
        <div class="zt-quote">"${escapeHtml(quote)}"</div>
        <div class="zt-search-hint">
          <span>Search instead of scrolling</span>
          <kbd>/</kbd>
        </div>
      </div>
    `;
    document.body.appendChild(box);

    // Live clock
    const clockEl = box.querySelector('#zt-clock');
    setInterval(() => {
      if (!document.body.contains(box)) return;
      clockEl.textContent = formatClock(new Date());
    }, 1000);

    // Focus search on "/"
    const focusSearch = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        const input = document.querySelector('input#search');
        if (input) {
          box.remove();
          input.focus();
          document.removeEventListener('keydown', focusSearch);
        }
      }
    };
    document.addEventListener('keydown', focusSearch);
  }

  function greetingForTime() {
    const h = new Date().getHours();
    if (h < 5) return 'Late night';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function formatClock(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function formatDate(d) {
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  /* ----------------------------------------------------------
     Time tracking — ping background while video plays
     ---------------------------------------------------------- */
  function setupTimeTracking() {
    const tick = () => {
      if (!settings.enabled) return;
      if (document.hidden) return;
      const video = document.querySelector('video.html5-main-video');
      const isPlaying = video && !video.paused && !video.ended && video.readyState > 2;
      const isBrowsing = !location.pathname.startsWith('/watch') ? true : isPlaying;
      if (isBrowsing) {
        chrome.runtime.sendMessage({ type: 'TICK', seconds: 5 });
      }
    };
    activeTimerHandle = setInterval(tick, 5000);
  }

  /* ----------------------------------------------------------
     Time limit overlay — shown when background says limit hit
     ---------------------------------------------------------- */
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'LIMIT_HIT' && !limitOverlayShown) {
      showTimeLimitOverlay(msg.minutes);
    } else if (msg.type === 'STATS_UPDATED') {
      updateWidget(msg.stats);
    } else if (msg.type === 'SCHEDULE_BLOCKED') {
      showScheduleBlockedOverlay(msg.ruleName, msg.until);
    } else if (msg.type === 'POMODORO_UPDATE') {
      applyPomodoroState(msg.state);
    }
  });

  function showScheduleBlockedOverlay(ruleName, until) {
    if (document.getElementById('zentube-schedule-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'zentube-schedule-overlay';
    overlay.className = 'zt-overlay-schedule';
    overlay.innerHTML = `
      <div class="zt-limit-box">
        <h2>${i18n('scheduleBlockedTitle', 'YouTube is paused')}</h2>
        <p>${i18n('scheduleBlockedBody', 'Active rule')}: <strong>${escapeHtml(ruleName || 'Schedule')}</strong></p>
        <p>${i18n('scheduleBlockedUntil', 'Comes back at')} ${escapeHtml(until || '')}</p>
        <button id="zt-leave-schedule">${i18n('closeBtn', 'Close YouTube')}</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const video = document.querySelector('video.html5-main-video');
    if (video) video.pause();
    document.getElementById('zt-leave-schedule').addEventListener('click', () => {
      window.close();
      setTimeout(() => (location.href = 'about:blank'), 100);
    });
  }

  let pomodoroWidgetEl = null;
  let pomodoroBreakOverlay = null;
  let pomodoroTickHandle = null;

  function applyPomodoroState(state) {
    if (!state || !state.running) {
      if (pomodoroWidgetEl) { pomodoroWidgetEl.remove(); pomodoroWidgetEl = null; }
      if (pomodoroBreakOverlay) { pomodoroBreakOverlay.remove(); pomodoroBreakOverlay = null; }
      if (pomodoroTickHandle) { clearInterval(pomodoroTickHandle); pomodoroTickHandle = null; }
      return;
    }
    if (state.phase === 'work') {
      if (pomodoroBreakOverlay) { pomodoroBreakOverlay.remove(); pomodoroBreakOverlay = null; }
      ensurePomodoroWidget(state);
    } else {
      ensurePomodoroBreakOverlay(state);
      if (pomodoroWidgetEl) { pomodoroWidgetEl.remove(); pomodoroWidgetEl = null; }
      const video = document.querySelector('video.html5-main-video');
      if (video) video.pause();
    }
  }

  function ensurePomodoroWidget(state) {
    if (!pomodoroWidgetEl) {
      pomodoroWidgetEl = document.createElement('div');
      pomodoroWidgetEl.id = 'zentube-pomodoro-widget';
      document.body.appendChild(pomodoroWidgetEl);
    }
    const render = () => {
      const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      const total = state.workMin * 60;
      const remaining = Math.max(0, total - elapsed);
      const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
      const ss = String(remaining % 60).padStart(2, '0');
      pomodoroWidgetEl.innerHTML = `
        <div class="zt-pomo-pill">
          <span class="zt-pomo-dot"></span>
          <span class="zt-pomo-time">${mm}:${ss}</span>
          <span class="zt-pomo-label">${i18n('pomoFocus', 'Focus')}</span>
          <button class="zt-pomo-stop" title="${i18n('pomoStop', 'Stop')}">✕</button>
        </div>
      `;
      pomodoroWidgetEl.querySelector('.zt-pomo-stop').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'POMODORO_STOP' });
      });
    };
    render();
    if (pomodoroTickHandle) clearInterval(pomodoroTickHandle);
    pomodoroTickHandle = setInterval(render, 1000);
  }

  function ensurePomodoroBreakOverlay(state) {
    if (pomodoroBreakOverlay) return;
    pomodoroBreakOverlay = document.createElement('div');
    pomodoroBreakOverlay.id = 'zentube-pomodoro-break';
    document.body.appendChild(pomodoroBreakOverlay);
    const render = () => {
      const totalMin = state.phase === 'long_break' ? state.longBreakMin : state.shortBreakMin;
      const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      const total = totalMin * 60;
      const remaining = Math.max(0, total - elapsed);
      const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
      const ss = String(remaining % 60).padStart(2, '0');
      const title = state.phase === 'long_break'
        ? i18n('pomoLongBreak', 'Long break time')
        : i18n('pomoShortBreak', 'Break time');
      pomodoroBreakOverlay.innerHTML = `
        <div class="zt-pomo-break-box">
          <h2>${title}</h2>
          <div class="zt-pomo-break-time">${mm}:${ss}</div>
          <p>${i18n('pomoBreakBody', 'Step away from the screen. Stretch. Breathe. Get water.')}</p>
          <button class="zt-pomo-skip-stop">${i18n('pomoStopSession', 'Stop session')}</button>
        </div>
      `;
      pomodoroBreakOverlay.querySelector('.zt-pomo-skip-stop').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'POMODORO_STOP' });
      });
    };
    render();
    if (pomodoroTickHandle) clearInterval(pomodoroTickHandle);
    pomodoroTickHandle = setInterval(render, 1000);
  }

  function i18n(key, fallback) {
    try {
      const m = chrome.i18n.getMessage(key);
      return m || fallback || key;
    } catch {
      return fallback || key;
    }
  }

  function showTimeLimitOverlay(minutes) {
    limitOverlayShown = true;
    if (document.getElementById('zentube-limit-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'zentube-limit-overlay';
    overlay.innerHTML = `
      <div class="zt-limit-box">
        <h2>Time's up for today</h2>
        <p>You've hit your daily ${minutes}-minute limit. Tomorrow's a fresh start. Go do something else you'll be proud of.</p>
        <button id="zt-leave">Close YouTube</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const video = document.querySelector('video.html5-main-video');
    if (video) video.pause();
    document.getElementById('zt-leave').addEventListener('click', () => {
      window.close();
      setTimeout(() => (location.href = 'about:blank'), 100);
    });
  }

  /* ----------------------------------------------------------
     Floating widget — shows mode + time today
     ---------------------------------------------------------- */
  function ensureWidget() {
    if (!settings.enabled || !settings.showWidget) {
      if (widgetEl) widgetEl.remove();
      widgetEl = null;
      return;
    }
    if (widgetEl) return;
    widgetEl = document.createElement('div');
    widgetEl.id = 'zentube-widget';
    widgetEl.innerHTML = `
      <div class="zt-pill" title="Click to open ZenTube">
        <span class="zt-dot"></span>
        <span class="zt-label">ZenTube</span>
      </div>
    `;
    document.body.appendChild(widgetEl);
    requestAnimationFrame(() => widgetEl.classList.add('zt-visible'));
    widgetEl.querySelector('.zt-pill').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP_FALLBACK' });
    });
    refreshWidgetLabel();
  }

  function refreshWidgetLabel() {
    if (!widgetEl) return;
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (stats) => {
      if (!stats || !widgetEl) return;
      updateWidget(stats);
    });
  }

  function updateWidget(stats) {
    if (!widgetEl) return;
    const label = widgetEl.querySelector('.zt-label');
    const modeNames = { off: 'Off', casual: 'Casual', learning: 'Learning', deep: 'Deep' };
    const modeName = modeNames[settings.focusMode] || 'Casual';
    const min = Math.floor((stats.todaySeconds || 0) / 60);
    const limit = settings.timeLimit.enabled ? settings.timeLimit.minutesPerDay : null;
    if (limit) {
      label.textContent = `${modeName} · ${min}/${limit}m`;
      widgetEl.classList.remove('zt-warning', 'zt-blocked');
      if (min >= limit) widgetEl.classList.add('zt-blocked');
      else if (min >= limit * 0.8) widgetEl.classList.add('zt-warning');
    } else {
      label.textContent = `${modeName} · ${min}m today`;
    }
  }

  /* ----------------------------------------------------------
     SPA navigation — YouTube fires yt-navigate-finish
     ---------------------------------------------------------- */
  function onNavigate() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    maybeRedirectShorts();
    setTimeout(() => {
      maybeReplaceHome();
      enforceChannelRules();
      disableAutoplay();
    }, 400);
  }

  function setupNavListener() {
    window.addEventListener('yt-navigate-finish', onNavigate);
    // Backup: poll URL for older / changed YouTube events
    setInterval(onNavigate, 1500);
  }

  /* ----------------------------------------------------------
     Keyboard shortcut: Shift+Z toggles deep mode quickly
     ---------------------------------------------------------- */
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const next = settings.focusMode === 'deep' ? 'casual' : 'deep';
        chrome.storage.sync.set({ focusMode: next });
      }
    });
  }

  /* ----------------------------------------------------------
     Helpers
     ---------------------------------------------------------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));
  }

  function applyAll() {
    applyClasses();
    ensureWidget();
    maybeReplaceHome();
    maybeRedirectShorts();
  }

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */
  async function init() {
    await loadSettings();
    applyClasses();
    maybeRedirectShorts();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else {
      onReady();
    }
  }

  function onReady() {
    ensureWidget();
    maybeShowMindfulPause();
    maybeReplaceHome();
    enforceChannelRules();
    disableAutoplay();
    setupAutoPause();
    setupTimeTracking();
    setupNavListener();
    setupKeyboard();
    // Restore pomodoro state if running
    chrome.runtime.sendMessage({ type: 'GET_POMODORO' }, (state) => {
      if (state && state.running) applyPomodoroState(state);
    });
  }

  init();
})();
