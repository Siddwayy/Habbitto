import { getHabits, setHabits, getCompletions, setCompletions } from './storage.js';
import * as db from './storage-supabase.js';
import { addSession } from './sessions.js';

const PRESET_ICONS = [
  'book', 'dumbbell', 'heart', 'moon', 'droplet', 'graduation-cap',
  'sun', 'coffee', 'pen', 'music', 'leaf', 'zap',
];

export const PRESETS = [
  { name: 'Read', icon: 'book', defaultFocusMinutes: 25 },
  { name: 'Exercise', icon: 'dumbbell', defaultFocusMinutes: 30 },
  { name: 'Meditate', icon: 'heart', defaultFocusMinutes: 10 },
  { name: 'Sleep', icon: 'moon', defaultFocusMinutes: null },
  { name: 'Hydrate', icon: 'droplet', defaultFocusMinutes: null },
  { name: 'Learn', icon: 'graduation-cap', defaultFocusMinutes: 25 },
];

export function getPresetIcons() {
  return [...PRESET_ICONS];
}

let listeners = [];
let userId = null;
let habitsCache = [];
let completionsCache = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function setUserId(id) {
  userId = id;
  habitsCache = [];
  completionsCache = [];
}

export async function loadHabits() {
  if (userId) {
    try {
      const [habits, completions] = await Promise.all([
        db.fetchHabits(userId),
        db.fetchCompletions(userId),
      ]);
      habitsCache = habits;
      completionsCache = completions;
    } catch (err) {
      console.error('Failed to load habits:', err);
    }
  } else {
    habitsCache = getHabits();
    completionsCache = getCompletions();
  }
  notify();
}

export function getHabitsList() {
  return userId ? habitsCache : getHabits();
}

export async function addHabit(habit) {
  if (userId) {
    try {
      const newHabit = await db.insertHabit(userId, {
        name: habit.name?.trim() || 'New habit',
        icon: habit.icon || 'book',
        defaultFocusMinutes: habit.defaultFocusMinutes ?? null,
      });
      habitsCache.push(newHabit);
      notify();
      return newHabit;
    } catch (err) {
      console.error('Failed to add habit:', err);
      throw err;
    }
  }
  const habits = getHabits();
  const id = crypto.randomUUID?.() ?? `h-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const newHabit = {
    id,
    name: habit.name?.trim() || 'New habit',
    icon: habit.icon || 'book',
    defaultFocusMinutes: habit.defaultFocusMinutes ?? null,
    createdAt: new Date().toISOString(),
  };
  habits.push(newHabit);
  setHabits(habits);
  notify();
  return newHabit;
}

export function addHabitFromPreset(preset) {
  return addHabit({
    name: preset.name,
    icon: preset.icon,
    defaultFocusMinutes: preset.defaultFocusMinutes ?? null,
  });
}

export async function updateHabit(id, updates) {
  if (userId) {
    try {
      const updated = await db.updateHabitDb(userId, id, updates);
      if (updated) {
        const i = habitsCache.findIndex((h) => h.id === id);
        if (i >= 0) habitsCache[i] = { ...habitsCache[i], ...updates };
        notify();
        return habitsCache[i];
      }
      return null;
    } catch (err) {
      console.error('Failed to update habit:', err);
      throw err;
    }
  }
  const habits = getHabits();
  const i = habits.findIndex((h) => h.id === id);
  if (i === -1) return null;
  habits[i] = { ...habits[i], ...updates };
  setHabits(habits);
  notify();
  return habits[i];
}

export async function deleteHabit(id) {
  if (userId) {
    try {
      await db.deleteHabitDb(userId, id);
      habitsCache = habitsCache.filter((h) => h.id !== id);
      completionsCache = completionsCache.filter((c) => c.habitId !== id);
      notify();
    } catch (err) {
      console.error('Failed to delete habit:', err);
      throw err;
    }
  } else {
    setHabits(getHabits().filter((h) => h.id !== id));
    setCompletions(getCompletions().filter((c) => c.habitId !== id));
    notify();
  }
}

/** Local date as YYYY-MM-DD (avoids UTC midnight timezone issues). */
export function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format a Date to YYYY-MM-DD in local time. */
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCompletionsList() {
  return userId ? completionsCache : getCompletions();
}

/** True if habit has saved focus time today (session-based, no manual mark). */
export function isCompletedToday(habitId) {
  const today = getTodayKey();
  const completions = getCompletionsList();
  return completions.some((c) => c.habitId === habitId && c.date === today && (c.focusMinutes || 0) > 0);
}

export async function toggleCompletionToday(habitId, focusMinutes = null) {
  const today = getTodayKey();
  if (userId) {
    try {
      const added = await db.toggleCompletionDb(userId, habitId, today, focusMinutes);
      completionsCache = await db.fetchCompletions(userId);
      notify();
      return;
    } catch (err) {
      console.error('Failed to toggle completion:', err);
      throw err;
    }
  }
  let completions = getCompletions();
  const idx = completions.findIndex((c) => c.habitId === habitId && c.date === today);
  if (idx >= 0) {
    completions = completions.filter((_, i) => i !== idx);
  } else {
    completions = [...completions, { habitId, date: today, focusMinutes: focusMinutes ?? undefined }];
  }
  setCompletions(completions);
  notify();
}

/**
 * Add focus minutes to habit and record the session.
 * @param {string} habitId
 * @param {number} focusMinutes - minutes to add to completions
 * @param {string|null} date - YYYY-MM-DD, defaults to today
 * @param {{ recordSession?: boolean, sessionMinutes?: number, sessionMode?: 'focus'|'stopwatch' }} options - recordSession: record session (default true). sessionMinutes: full session duration for recording.
 */
export async function addFocusToCompletion(habitId, focusMinutes, date = null, options = {}) {
  const { recordSession = true, sessionMinutes, sessionMode = 'focus' } = options;
  const minsForSession = sessionMinutes ?? focusMinutes;
  const today = date || getTodayKey();
  if (userId) {
    try {
      await db.upsertCompletion(userId, habitId, today, focusMinutes);
      completionsCache = await db.fetchCompletions(userId);
      if (recordSession) await addSession(habitId, today, minsForSession, { mode: sessionMode });
      notify();
      return;
    } catch (err) {
      console.error('Failed to add focus:', err);
      throw err;
    }
  }
  let completions = getCompletions();
  const existing = completions.find((c) => c.habitId === habitId && c.date === today);
  if (existing) {
    completions = completions.map((c) =>
      c.habitId === habitId && c.date === today
        ? { ...c, focusMinutes: (c.focusMinutes || 0) + focusMinutes }
        : c
    );
  } else {
    completions = [...completions, { habitId, date: today, focusMinutes }];
  }
  setCompletions(completions);
  if (recordSession) addSession(habitId, today, minsForSession, { mode: sessionMode });
  notify();
}

export function getTimeSpentPerHabit() {
  const completions = getCompletionsList();
  const totals = {};
  completions.forEach((c) => {
    const mins = c.focusMinutes || 0;
    if (mins > 0) totals[c.habitId] = (totals[c.habitId] || 0) + mins;
  });
  return totals;
}

/** Total focus minutes completed today (from saved sessions). */
export function getTodayFocusMinutes() {
  const today = getTodayKey();
  const completions = getCompletionsList();
  return completions
    .filter((c) => c.date === today)
    .reduce((sum, c) => sum + (c.focusMinutes || 0), 0);
}

/** Consecutive days (including today) the habit was completed with 30+ focus minutes. 0 if not completed today. */
export function getHabitStreak(habitId) {
  const completions = getCompletionsList();
  const today = getTodayKey();

  // Build set of dates that count – only days with 30+ focus minutes for this habit
  const dateSet = new Set(
    completions
      .filter((c) => c.habitId === habitId && (c.focusMinutes || 0) >= 30)
      .map((c) => c.date)
  );

  if (!dateSet.has(today)) return 0;
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (true) {
    const key = toDateKey(d);
    if (!dateSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Last 30 days with total focus minutes per day. Returns [{ date, totalMinutes }, ...] */
export function getDailyTotalsLast30Days() {
  const completions = getCompletionsList();
  const byDate = {};
  completions.forEach((c) => {
    const mins = c.focusMinutes || 0;
    if (mins > 0) byDate[c.date] = (byDate[c.date] || 0) + mins;
  });
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = toDateKey(d);
    result.push({ date, totalMinutes: byDate[date] || 0 });
  }
  return result;
}

export function subscribeHabits(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
