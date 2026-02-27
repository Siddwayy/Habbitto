import { renderFocusView, updateTimerDisplay, setSaveClickHandler } from './ui.js';
import { renderAuthView } from './auth-ui.js';
import { renderGuideView } from './guide-ui.js';
import { renderLeaderboardView } from './leaderboard-ui.js';
import { renderSettingsView } from './settings-ui.js';
import { loadHabits, subscribeHabits, addFocusToCompletion, setUserId, getHabitsList, getTodayKey } from './habits.js';
import { setUserId as setSessionsUserId } from './sessions.js';
import {
  subscribeTimer,
  onWorkComplete,
  onSessionEndAlert,
  getTimerState,
  getElapsedWorkMinutes,
  getSessionHabitId,
  isTimerRunning,
  startWork,
  startStopwatch,
  pause,
  pauseStopwatch,
  resume,
  setDurations,
  reset,
  setDisplayState,
  setSyncDelegate,
} from './timer.js';
import { getSession, onAuthStateChange, signOut } from './auth.js';
import { supabase } from './supabase.js';
import * as sessionEndSound from './session-end-sound.js';
import { initTheme, toggleTheme, getTheme } from './theme.js';
import { setupSessionPersistence, recoverPendingSession } from './session-persistence.js';
import { renderIcon, renderLogo } from './icons.js';

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

let midnightRefreshTimeout = null;

function scheduleMidnightRefresh(main) {
  if (midnightRefreshTimeout) clearTimeout(midnightRefreshTimeout);
  if (!main?.isConnected) return;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const msUntilMidnight = tomorrow - now;
  midnightRefreshTimeout = setTimeout(() => {
    if (main?.isConnected) renderFocusView(main);
    if (main?.isConnected) scheduleMidnightRefresh(main);
  }, msUntilMidnight);
}

function setupDateChangeRefresh(main) {
  scheduleMidnightRefresh(main);
}

export async function initApp() {
  const app = document.getElementById('app');
  if (!app) return;

  initTheme();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const el = document.getElementById('focus-view');
      if (el) renderFocusView(el);
    }
  });

  document.addEventListener('keydown', (e) => {
    const focusView = document.getElementById('focus-view');
    if (!focusView || !document.body.contains(focusView)) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) return;
    if (document.querySelector('.modal.open')) return;
    const state = getTimerState();
    if (e.code === 'Space') {
      e.preventDefault();
      if (state.phase === 'idle' && state.habitId && getHabitsList().some((h) => h.id === state.habitId)) {
        if (state.mode === 'stopwatch') startStopwatch();
        else startWork();
      } else if ((state.phase === 'work' || state.phase === 'stopwatch') && state.intervalId) {
        if (state.phase === 'stopwatch') pauseStopwatch();
        else pause();
      } else if (state.phase === 'work' || state.phase === 'stopwatch-paused') {
        resume();
      }
    } else if (e.code >= 'Digit1' && e.code <= 'Digit5' && state.phase === 'idle' && !state.intervalId) {
      const presets = [30, 45, 60, 75, 90];
      const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
      if (presets[idx]) {
        e.preventDefault();
        setDurations(presets[idx], 5);
        renderFocusView(focusView);
      }
    }
  });

  let persistenceTeardown = null;

  const showMain = async (session) => {
    app.innerHTML = `
      <div class="app-header-wrap">
        <div class="app-title-row">
          <span class="app-logo">${renderLogo(36)}</span>
          <h1 class="app-title">Habbitto</h1>
        </div>
        <header class="app-header">
          <div class="header-buttons-left">
            <button type="button" class="btn btn-account" id="btn-account">Account</button>
          </div>
          <div class="header-buttons-right">
            <button type="button" class="btn btn-leaderboard" id="btn-leaderboard">Leaderboard</button>
            <button type="button" class="btn btn-guide" id="btn-guide">Guide</button>
            <button type="button" class="btn btn-icon btn-theme-toggle" id="btn-theme" aria-label="Toggle theme" title="Toggle theme">${renderIcon(getTheme() === 'light' ? 'moon' : 'sun')}</button>
          </div>
        </header>
      </div>
      <main class="focus-view" id="focus-view"></main>
      <div id="leaderboard-modal" class="modal leaderboard-modal" aria-hidden="true"></div>
      <div id="guide-modal" class="modal guide-modal" aria-hidden="true"></div>
      <div id="settings-modal" class="modal settings-modal" aria-hidden="true"></div>
      <div id="session-end-modal" class="modal session-end-modal" aria-hidden="true"></div>
    `;
    const main = app.querySelector('#focus-view');
    onSessionEndAlert(() => {
      const modal = document.getElementById('session-end-modal');
      if (!modal) return;
      sessionEndSound.play();
      modal.innerHTML = `
        <div class="modal-backdrop session-end-backdrop"></div>
        <div class="modal-content session-end-content">
          <h2 class="session-end-title">Congrats! Session ended.</h2>
          <p class="session-end-text">Your focus time has been saved. Take a breath—you did it.</p>
          <button type="button" class="btn btn-primary session-end-save" id="session-end-save">Done</button>
        </div>
      `;
      modal.querySelector('.session-end-backdrop').addEventListener('click', closeSessionEnd);
      modal.querySelector('#session-end-save').addEventListener('click', closeSessionEnd);
      function closeSessionEnd() {
        sessionEndSound.stop();
        reset();
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        const focusView = document.getElementById('focus-view');
        if (focusView) renderFocusView(focusView);
      }
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    });
    const leaderboardBtn = app.querySelector('#btn-leaderboard');
    if (leaderboardBtn) leaderboardBtn.addEventListener('click', async () => {
      const modal = document.getElementById('leaderboard-modal');
      if (modal) {
        await renderLeaderboardView(modal, () => {
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
        }, session?.user?.id);
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      }
    });
    const guideBtn = app.querySelector('#btn-guide');
    const accountBtn = app.querySelector('#btn-account');
    if (guideBtn) guideBtn.addEventListener('click', () => {
      const modal = document.getElementById('guide-modal');
      if (modal) {
        renderGuideView(modal, () => {
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
        });
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      }
    });
    const openSettings = async () => {
      const modal = document.getElementById('settings-modal');
      if (modal) {
        const { data } = await getSession();
        renderSettingsView(modal, () => {
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
        }, () => renderFocusView(main), data?.session ?? session, async () => {
          await signOut();
          setUserId(null);
          setSessionsUserId(null);
          showAuth();
        });
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      }
    };
    if (accountBtn) accountBtn.addEventListener('click', openSettings);
    const themeBtn = app.querySelector('#btn-theme');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      toggleTheme();
      themeBtn.innerHTML = renderIcon(getTheme() === 'light' ? 'moon' : 'sun');
    });
    setUserId(session?.user?.id ?? null);
    setSessionsUserId(session?.user?.id ?? null);

    const getUserId = () => session?.user?.id ?? 'local';
    const addFocusForCheckpoint = (habitId, minutes) => addFocusToCompletion(habitId, minutes, null, { recordSession: false });
    const persistence = setupSessionPersistence(getTimerState, getElapsedWorkMinutes, addFocusForCheckpoint, getTodayKey, getUserId, getSessionHabitId);
    persistenceTeardown = () => persistence.teardown?.();
    setSyncDelegate(null);

    setSaveClickHandler(async () => {
      const elapsed = getElapsedWorkMinutes();
      const habitId = getSessionHabitId();
      const delta = Math.max(0, elapsed - persistence.getLastSavedMinutes());
      const mode = getTimerState().mode ?? 'focus';
      persistence.stopPeriodicSave();
      if (habitId && elapsed > 0) {
        await addFocusToCompletion(habitId, delta, null, { recordSession: true, sessionMinutes: elapsed, sessionMode: mode });
      }
      reset();
    });

    onWorkComplete(async (habitId, totalMinutes) => {
      const delta = totalMinutes - persistence.getLastSavedMinutes();
      const mode = getTimerState().mode ?? 'focus';
      persistence.stopPeriodicSave();
      if (totalMinutes > 0) {
        await addFocusToCompletion(habitId, delta, null, { recordSession: true, sessionMinutes: totalMinutes, sessionMode: mode });
      }
    });

    await loadHabits();
    await recoverPendingSession(addFocusToCompletion, getUserId);

    subscribeHabits(() => renderFocusView(main));
    let lastPhase, lastMode;
    subscribeTimer((state) => {
      if (document.getElementById('modal-custom-habit')?.classList.contains('open')) return;
      const isTicking = state.phase === 'work' || state.phase === 'break' || state.phase === 'stopwatch';
      const weOwnTimer = isTimerRunning();
      if (isTicking && weOwnTimer) {
        persistence.startPeriodicSave();
        if (lastPhase === 'idle') {
          renderFocusView(main);
        } else {
          updateTimerDisplay(main);
        }
      } else if (!isTicking) {
        persistence.stopPeriodicSave();
        if (state.phase === 'idle') {
          if (lastPhase === 'idle' && lastMode === state.mode) {
            updateTimerDisplay(main);
          } else {
            renderFocusView(main);
          }
        } else {
          if (lastPhase === 'idle') renderFocusView(main);
          else updateTimerDisplay(main);
        }
      } else {
        updateTimerDisplay(main);
      }
      lastPhase = state.phase;
      lastMode = state.mode;
    });
    setupDateChangeRefresh(main);
    renderFocusView(main);
  };

  const showAuth = () => {
    setSaveClickHandler(null);
    setSyncDelegate(null);
    persistenceTeardown?.();
    app.innerHTML = `
      <main class="auth-view" id="auth-view"></main>
    `;
    const authContainer = app.querySelector('#auth-view');
    renderAuthView(authContainer, async () => {
      const { data: { session } } = await getSession();
      if (session) await showMain(session);
    });
  };

  if (supabase) {
    let session;
    try {
      const res = await getSession();
      session = res?.data?.session;
    } catch (err) {
      console.error('getSession failed:', err);
      app.innerHTML = `
        <div class="auth-card" style="margin-top: 2rem;">
          <h2>Connection error</h2>
          <p style="color: var(--danger); margin: 1rem 0;">${escapeHtml(err?.message || 'Failed to connect to Supabase')}</p>
          <p style="font-size: 0.9rem; color: var(--text-muted);">Check your .env (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY). Restart the dev server after changing .env.</p>
        </div>
      `;
      return;
    }
    if (session) {
      await showMain(session);
    } else {
      showAuth();
    }
    onAuthStateChange((session) => {
      if (!session) {
        setUserId(null);
        setSessionsUserId(null);
        showAuth();
      }
    });
  } else {
    app.innerHTML = `
      <div class="app-header-wrap">
        <div class="app-title-block">
          <div class="app-title-row">
            <span class="app-logo">${renderLogo(36)}</span>
            <h1 class="app-title">Habbitto</h1>
          </div>
          <p class="app-subtitle">using local storage (no account)</p>
        </div>
        <header class="app-header">
          <div class="header-buttons-left">
            <button type="button" class="btn btn-settings" id="btn-settings">Settings</button>
          </div>
          <div class="header-buttons-right">
            <button type="button" class="btn btn-guide" id="btn-guide">Guide</button>
            <button type="button" class="btn btn-icon btn-theme-toggle" id="btn-theme" aria-label="Toggle theme" title="Toggle theme">${renderIcon(getTheme() === 'light' ? 'moon' : 'sun')}</button>
          </div>
        </header>
      </div>
      <main class="focus-view" id="focus-view"></main>
      <div id="leaderboard-modal" class="modal leaderboard-modal" aria-hidden="true"></div>
      <div id="guide-modal" class="modal guide-modal" aria-hidden="true"></div>
      <div id="settings-modal" class="modal settings-modal" aria-hidden="true"></div>
      <div id="session-end-modal" class="modal session-end-modal" aria-hidden="true"></div>
    `;
    const main = app.querySelector('#focus-view');
    onSessionEndAlert(() => {
      const modal = document.getElementById('session-end-modal');
      if (!modal) return;
      sessionEndSound.play();
      modal.innerHTML = `
        <div class="modal-backdrop session-end-backdrop"></div>
        <div class="modal-content session-end-content">
          <h2 class="session-end-title">Congrats! Session ended.</h2>
          <p class="session-end-text">Your focus time has been saved. Take a breath—you did it.</p>
          <button type="button" class="btn btn-primary session-end-save" id="session-end-save">Done</button>
        </div>
      `;
      modal.querySelector('.session-end-backdrop').addEventListener('click', closeSessionEnd);
      modal.querySelector('#session-end-save').addEventListener('click', closeSessionEnd);
      function closeSessionEnd() {
        sessionEndSound.stop();
        reset();
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        const focusView = document.getElementById('focus-view');
        if (focusView) renderFocusView(focusView);
      }
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    });
    const guideBtn = app.querySelector('#btn-guide');
    const settingsBtn = app.querySelector('#btn-settings');
    if (guideBtn) guideBtn.addEventListener('click', () => {
      const modal = document.getElementById('guide-modal');
      if (modal) {
        renderGuideView(modal, () => {
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
        });
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      }
    });
    if (settingsBtn) settingsBtn.addEventListener('click', () => {
      const modal = document.getElementById('settings-modal');
      if (modal) {
        renderSettingsView(modal, () => {
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
        }, () => renderFocusView(main));
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      }
    });
    const themeBtn = app.querySelector('#btn-theme');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      toggleTheme();
      themeBtn.innerHTML = renderIcon(getTheme() === 'light' ? 'moon' : 'sun');
    });
    setUserId(null);
    setSessionsUserId(null);

    const getUserId = () => 'local';
    const addFocusForCheckpoint = (habitId, minutes) => addFocusToCompletion(habitId, minutes, null, { recordSession: false });
    const persistence = setupSessionPersistence(getTimerState, getElapsedWorkMinutes, addFocusForCheckpoint, getTodayKey, getUserId, getSessionHabitId);
    persistenceTeardown = () => persistence.teardown?.();
    setSyncDelegate(null);

    setSaveClickHandler(async () => {
      const elapsed = getElapsedWorkMinutes();
      const habitId = getSessionHabitId();
      const delta = Math.max(0, elapsed - persistence.getLastSavedMinutes());
      const mode = getTimerState().mode ?? 'focus';
      persistence.stopPeriodicSave();
      if (habitId && elapsed > 0) {
        await addFocusToCompletion(habitId, delta, null, { recordSession: true, sessionMinutes: elapsed, sessionMode: mode });
      }
      reset();
    });

    onWorkComplete(async (habitId, totalMinutes) => {
      const delta = totalMinutes - persistence.getLastSavedMinutes();
      const mode = getTimerState().mode ?? 'focus';
      persistence.stopPeriodicSave();
      if (totalMinutes > 0) {
        await addFocusToCompletion(habitId, delta, null, { recordSession: true, sessionMinutes: totalMinutes, sessionMode: mode });
      }
    });

    await loadHabits();
    await recoverPendingSession(addFocusToCompletion, getUserId);

    subscribeHabits(() => renderFocusView(main));
    let lastPhase, lastMode;
    subscribeTimer((state) => {
      if (document.getElementById('modal-custom-habit')?.classList.contains('open')) return;
      const isTicking = state.phase === 'work' || state.phase === 'break' || state.phase === 'stopwatch';
      const weOwnTimer = isTimerRunning();
      if (isTicking && weOwnTimer) {
        persistence.startPeriodicSave();
        if (lastPhase === 'idle') {
          renderFocusView(main);
        } else {
          updateTimerDisplay(main);
        }
      } else if (!isTicking) {
        persistence.stopPeriodicSave();
        if (state.phase === 'idle') {
          if (lastPhase === 'idle' && lastMode === state.mode) {
            updateTimerDisplay(main);
          } else {
            renderFocusView(main);
          }
        } else {
          if (lastPhase === 'idle') renderFocusView(main);
          else updateTimerDisplay(main);
        }
      } else {
        updateTimerDisplay(main);
      }
      lastPhase = state.phase;
      lastMode = state.mode;
    });
    setupDateChangeRefresh(main);
    renderFocusView(main);
  }
}
