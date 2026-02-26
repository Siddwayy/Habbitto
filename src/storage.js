const KEYS = {
  HABITS: 'habbitto_habits',
  COMPLETIONS: 'habbitto_completions',
};

export function getItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getHabits() {
  return getItem(KEYS.HABITS, []);
}

export function setHabits(habits) {
  return setItem(KEYS.HABITS, habits);
}

export function getCompletions() {
  return getItem(KEYS.COMPLETIONS, []);
}

export function setCompletions(completions) {
  return setItem(KEYS.COMPLETIONS, completions);
}
