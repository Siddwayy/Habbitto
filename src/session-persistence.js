/**
 * Persists focus/stopwatch progress so users don't lose it when they close the browser.
 * - Periodic save: every 5 minutes while timer is running
 * - Unload save: when user closes tab/browser, stores pending minutes in localStorage
 * - Recovery: on next load, applies any pending session
 */

const PENDING_SESSION_KEY = 'habbitto_pending_session';
const SAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let lastSavedMinutes = 0;
let saveIntervalId = null;
let unloadTeardown = null;

async function saveCheckpoint(getTimerState, getElapsedWorkMinutes, addFocusToCompletion) {
  const state = getTimerState();
  const isRunning = state.phase === 'work' || state.phase === 'stopwatch';
  if (!isRunning || !state.habitId) return;
  const elapsed = getElapsedWorkMinutes();
  const delta = elapsed - lastSavedMinutes;
  if (delta > 0) {
    try {
      await addFocusToCompletion(state.habitId, delta);
      lastSavedMinutes = elapsed;
    } catch (_) {}
  }
}

export function setupSessionPersistence(getTimerState, getElapsedWorkMinutes, addFocusToCompletion, getTodayKey, getUserId = () => null) {
  if (saveIntervalId) {
    clearInterval(saveIntervalId);
    saveIntervalId = null;
  }
  lastSavedMinutes = 0;

  if (unloadTeardown) {
    unloadTeardown();
    unloadTeardown = null;
  }

  const doSaveCheckpoint = () => saveCheckpoint(getTimerState, getElapsedWorkMinutes, addFocusToCompletion);

  const storePendingSession = () => {
    const state = getTimerState();
    const isRunning = state.phase === 'work' || state.phase === 'stopwatch';
    if (!isRunning || !state.habitId) return;
    const elapsed = getElapsedWorkMinutes();
    const delta = elapsed - lastSavedMinutes;
    if (delta > 0) {
      try {
        const date = getTodayKey();
        const userId = getUserId();
        localStorage.setItem(
          PENDING_SESSION_KEY,
          JSON.stringify({ habitId: state.habitId, date, focusMinutes: delta, userId: userId ?? 'local' })
        );
      } catch (_) {}
    }
  };

  const startPeriodicSave = () => {
    if (saveIntervalId) return;
    saveIntervalId = setInterval(doSaveCheckpoint, SAVE_INTERVAL_MS);
  };

  const stopPeriodicSave = () => {
    if (saveIntervalId) {
      clearInterval(saveIntervalId);
      saveIntervalId = null;
    }
    lastSavedMinutes = 0;
  };

  window.addEventListener('beforeunload', storePendingSession);
  window.addEventListener('pagehide', storePendingSession);
  unloadTeardown = () => {
    window.removeEventListener('beforeunload', storePendingSession);
    window.removeEventListener('pagehide', storePendingSession);
    unloadTeardown = null;
  };

  return {
    startPeriodicSave,
    stopPeriodicSave,
    getLastSavedMinutes: () => lastSavedMinutes,
    teardown: () => unloadTeardown?.(),
  };
}

export function getLastSavedMinutes() {
  return lastSavedMinutes;
}

export function stopAndResetPersistence() {
  if (saveIntervalId) {
    clearInterval(saveIntervalId);
    saveIntervalId = null;
  }
  lastSavedMinutes = 0;
}

export async function recoverPendingSession(addFocusToCompletion, getUserId = () => null) {
  try {
    const raw = localStorage.getItem(PENDING_SESSION_KEY);
    if (!raw) return;
    const { habitId, date, focusMinutes, userId: storedUserId } = JSON.parse(raw);
    if (!habitId || !date || !focusMinutes || focusMinutes <= 0) return;
    const currentUserId = getUserId();
    const current = (currentUserId ?? 'local');
    if (storedUserId != null) {
      const stored = storedUserId === 'local' ? 'local' : storedUserId;
      if (stored !== current) return;
    }
    localStorage.removeItem(PENDING_SESSION_KEY);
    await addFocusToCompletion(habitId, focusMinutes, date);
  } catch (_) {
    try {
      localStorage.removeItem(PENDING_SESSION_KEY);
    } catch (_) {}
  }
}
