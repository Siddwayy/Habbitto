import { getSessions, setSessions } from './storage.js';
import * as db from './storage-supabase.js';

let listeners = [];
let userId = null;
let sessionsCache = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function setUserId(id) {
  userId = id;
  sessionsCache = [];
}

export async function loadSessions() {
  if (userId) {
    try {
      sessionsCache = await db.fetchSessions(userId);
    } catch {
      sessionsCache = [];
    }
  } else {
    sessionsCache = getSessions();
  }
  notify();
}

export function getSessionsList() {
  return userId ? sessionsCache : getSessions();
}

/** @param {'focus'|'stopwatch'} mode - Only 'focus' counts for constellation progress. */
export async function addSession(habitId, date, focusMinutes, options = {}) {
  const mode = options.mode ?? 'focus';
  if (userId) {
    try {
      await db.insertSession(userId, habitId, date, focusMinutes, mode);
      sessionsCache = await db.fetchSessions(userId);
      notify();
      return;
    } catch (err) {
      console.warn('addSession failed:', err);
    }
  } else {
    const sessions = getSessions();
    const id = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessions.push({ id, habitId, date, focusMinutes, mode, createdAt: new Date().toISOString() });
    setSessions(sessions);
    sessionsCache = sessions;
    notify();
  }
}

export function subscribeSessions(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
