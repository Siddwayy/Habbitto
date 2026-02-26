import { renderFocusView } from './ui.js';
import { renderAuthView } from './auth-ui.js';
import { loadHabits, subscribeHabits, addFocusToCompletion, setUserId } from './habits.js';
import { subscribeTimer, onWorkComplete } from './timer.js';
import { getSession, onAuthStateChange, signOut } from './auth.js';
import { supabase } from './supabase.js';

export async function initApp() {
  const app = document.getElementById('app');
  if (!app) return;

  const showMain = async (session) => {
    app.innerHTML = `
      <header class="app-header">
        <h1 class="app-title">Habbitto</h1>
        <p class="app-subtitle">Focus</p>
        <button type="button" class="btn btn-ghost btn-logout" id="btn-logout">Log out</button>
      </header>
      <main class="focus-view" id="focus-view"></main>
    `;
    const main = app.querySelector('#focus-view');
    const logoutBtn = app.querySelector('#btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      await signOut();
      setUserId(null);
      showAuth();
    });
    setUserId(session?.user?.id ?? null);
    onWorkComplete(addFocusToCompletion);
    await loadHabits();
    subscribeHabits(() => renderFocusView(main));
    subscribeTimer(() => renderFocusView(main));
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
          <p style="color: var(--danger); margin: 1rem 0;">${err?.message || 'Failed to connect to Supabase'}</p>
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
        showAuth();
      }
    });
  } else {
    app.innerHTML = `
      <header class="app-header">
        <h1 class="app-title">Habbitto</h1>
        <p class="app-subtitle">Focus · using local storage (no account)</p>
      </header>
      <main class="focus-view" id="focus-view"></main>
    `;
    const main = app.querySelector('#focus-view');
    onWorkComplete(addFocusToCompletion);
    loadHabits();
    subscribeHabits(() => renderFocusView(main));
    subscribeTimer(() => renderFocusView(main));
    renderFocusView(main);
  }
}
