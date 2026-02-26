import { renderFocusView } from './ui.js';
import { renderAuthView } from './auth-ui.js';
import { renderGalaxyView } from './galaxy-ui.js';
import { renderGuideView } from './guide-ui.js';
import { loadHabits, subscribeHabits, addFocusToCompletion, setUserId, getHabitsList } from './habits.js';
import { loadSessions, setUserId as setSessionsUserId, subscribeSessions } from './sessions.js';
import { subscribeTimer, onWorkComplete, onSessionEndAlert, getTimerState, startWork, startStopwatch, pause, pauseStopwatch, resume, setDurations, reset } from './timer.js';
import { getSession, onAuthStateChange, signOut, updatePassword } from './auth.js';
import { supabase } from './supabase.js';
import * as sessionEndSound from './session-end-sound.js';

function renderAccountModal(container, session, onClose, onLogout) {
  const user = session?.user;
  const email = user?.email ?? '—';
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || email;
  const userId = user?.id ?? '—';
  container.innerHTML = `
    <div class="modal-backdrop account-modal-backdrop"></div>
    <div class="modal-content account-modal-content">
      <div class="account-modal-header">
        <h2 class="modal-title">Account</h2>
        <button type="button" class="btn btn-ghost btn-icon btn-close-account" aria-label="Close">×</button>
      </div>
      <div class="account-info">
        <div class="account-field">
          <span class="account-label">Name</span>
          <span class="account-value">${escapeHtml(name)}</span>
        </div>
        <div class="account-field">
          <span class="account-label">Email</span>
          <span class="account-value">${escapeHtml(email)}</span>
        </div>
        <div class="account-field">
          <span class="account-label">User ID</span>
          <span class="account-value account-value-id">${escapeHtml(userId)}</span>
        </div>
      </div>
      <form id="account-change-password" class="account-form">
        <label for="account-new-password">New password</label>
        <input type="password" id="account-new-password" minlength="6" placeholder="••••••••" autocomplete="new-password" />
        <p id="account-password-message" class="auth-error" style="display:none"></p>
        <button type="submit" class="btn btn-primary">Change password</button>
      </form>
      <div class="account-actions">
        <button type="button" class="btn btn-ghost btn-logout-inline" id="account-logout">Log out</button>
      </div>
    </div>
  `;
  container.querySelector('.account-modal-backdrop').addEventListener('click', onClose);
  container.querySelector('.btn-close-account').addEventListener('click', onClose);
  container.querySelector('#account-logout').addEventListener('click', onLogout);
  const form = container.querySelector('#account-change-password');
  const messageEl = container.querySelector('#account-password-message');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = form.querySelector('#account-new-password').value;
    if (!newPassword || newPassword.length < 6) {
      messageEl.textContent = 'Password must be at least 6 characters';
      messageEl.style.display = 'block';
      return;
    }
    messageEl.style.display = 'none';
    try {
      await updatePassword(newPassword);
      messageEl.textContent = 'Password updated.';
      messageEl.style.color = 'var(--success)';
      messageEl.style.display = 'block';
      form.querySelector('#account-new-password').value = '';
    } catch (err) {
      messageEl.textContent = err.message || 'Failed to update password';
      messageEl.style.color = '';
      messageEl.style.display = 'block';
    }
  });
}

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

  const showMain = async (session) => {
    app.innerHTML = `
      <header class="app-header">
        <div class="header-buttons-left">
          <button type="button" class="btn btn-guide" id="btn-guide">Guide</button>
          <button type="button" class="btn btn-account" id="btn-account">Account</button>
        </div>
        <div class="app-header-center">
          <h1 class="app-title">Habbitto</h1>
        </div>
        <div class="header-buttons-right">
          <button type="button" class="btn btn-galaxy" id="btn-galaxy">Galaxy</button>
          <button type="button" class="btn btn-logout" id="btn-logout">Log out</button>
        </div>
      </header>
      <main class="focus-view" id="focus-view"></main>
      <div id="guide-modal" class="modal guide-modal" aria-hidden="true"></div>
      <div id="account-modal" class="modal account-modal" aria-hidden="true"></div>
      <div id="session-end-modal" class="modal session-end-modal" aria-hidden="true"></div>
      <div id="galaxy-overlay" class="galaxy-overlay-wrap" aria-hidden="true"></div>
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
          <button type="button" class="btn btn-primary session-end-save" id="session-end-save">Save session</button>
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
    const accountBtn = app.querySelector('#btn-account');
    const logoutBtn = app.querySelector('#btn-logout');
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
    if (accountBtn) accountBtn.addEventListener('click', () => {
      const modal = document.getElementById('account-modal');
      if (modal) renderAccountModal(modal, session, () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }, async () => { await signOut(); setUserId(null); setSessionsUserId(null); showAuth(); });
      modal?.classList.add('open');
      modal?.setAttribute('aria-hidden', 'false');
    });
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      await signOut();
      setUserId(null);
      setSessionsUserId(null);
      showAuth();
    });
    const galaxyBtn = app.querySelector('#btn-galaxy');
    const openGalaxy = () => {
      const overlay = document.getElementById('galaxy-overlay');
      if (overlay) {
        renderGalaxyView(overlay, () => { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); });
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
      }
    };
    if (galaxyBtn) galaxyBtn.addEventListener('click', openGalaxy);
    subscribeSessions(() => {
      const overlay = document.getElementById('galaxy-overlay');
      if (overlay?.classList.contains('open')) openGalaxy();
    });
    setUserId(session?.user?.id ?? null);
    setSessionsUserId(session?.user?.id ?? null);
    onWorkComplete(addFocusToCompletion);
    await loadHabits();
    await loadSessions();
    subscribeHabits(() => renderFocusView(main));
    subscribeTimer(() => renderFocusView(main));
    setupDateChangeRefresh(main);
    renderFocusView(main);
  };

  const showAuth = () => {
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
      <header class="app-header">
        <div class="header-buttons-left">
          <button type="button" class="btn btn-guide" id="btn-guide">Guide</button>
        </div>
        <div class="app-header-center">
          <h1 class="app-title">Habbitto</h1>
          <p class="app-subtitle">using local storage (no account)</p>
        </div>
        <div class="header-buttons-right">
          <button type="button" class="btn btn-galaxy" id="btn-galaxy">Galaxy</button>
        </div>
      </header>
      <main class="focus-view" id="focus-view"></main>
      <div id="guide-modal" class="modal guide-modal" aria-hidden="true"></div>
      <div id="session-end-modal" class="modal session-end-modal" aria-hidden="true"></div>
      <div id="galaxy-overlay" class="galaxy-overlay-wrap" aria-hidden="true"></div>
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
          <button type="button" class="btn btn-primary session-end-save" id="session-end-save">Save session</button>
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
    const galaxyBtn = app.querySelector('#btn-galaxy');
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
    const openGalaxy = () => {
      const overlay = document.getElementById('galaxy-overlay');
      if (overlay) {
        renderGalaxyView(overlay, () => { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); });
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
      }
    };
    if (galaxyBtn) galaxyBtn.addEventListener('click', openGalaxy);
    subscribeSessions(() => {
      const overlay = document.getElementById('galaxy-overlay');
      if (overlay?.classList.contains('open')) openGalaxy();
    });
    setSessionsUserId(null);
    await loadSessions();
    onWorkComplete(addFocusToCompletion);
    await loadHabits();
    subscribeHabits(() => renderFocusView(main));
    subscribeTimer(() => renderFocusView(main));
    setupDateChangeRefresh(main);
    renderFocusView(main);
  }
}
