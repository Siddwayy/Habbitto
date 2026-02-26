const DEFAULT_WORK_SECONDS = 25 * 60;
const DEFAULT_BREAK_SECONDS = 5 * 60;

let state = {
  mode: 'focus', // 'focus' | 'stopwatch'
  phase: 'idle', // 'idle' | 'work' | 'break' | 'stopwatch' | 'stopwatch-paused'
  remainingSeconds: 0,
  workDuration: DEFAULT_WORK_SECONDS,
  breakDuration: DEFAULT_BREAK_SECONDS,
  stopwatchSeconds: 0,
  habitId: null,
  intervalId: null,
};

const listeners = [];
let onWorkCompleteCallback = null;

export function onWorkComplete(fn) {
  onWorkCompleteCallback = fn;
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

function tick() {
  if (state.phase === 'stopwatch') {
    state.stopwatchSeconds += 1;
    notify();
    return;
  }
  if (state.remainingSeconds <= 0) {
    stopInterval();
    onPhaseEnd();
    return;
  }
  state.remainingSeconds -= 1;
  notify();
}

function stopInterval() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

function onPhaseEnd() {
  if (state.phase === 'work') {
    if (onWorkCompleteCallback && state.habitId) {
      const minutes = Math.floor(state.workDuration / 60);
      onWorkCompleteCallback(state.habitId, minutes);
    }
    state.phase = 'break';
    state.remainingSeconds = state.breakDuration;
    state.intervalId = setInterval(tick, 1000);
    notify();
    try {
      if (typeof window !== 'undefined' && window.Notification?.permission === 'granted') {
        new window.Notification('Focus session done', { body: 'Time for a short break.' });
      }
    } catch (_) {}
  } else if (state.phase === 'break') {
    state.phase = 'idle';
    state.remainingSeconds = 0;
    stopInterval();
    notify();
    try {
      if (typeof window !== 'undefined' && window.Notification?.permission === 'granted') {
        new window.Notification('Break over', { body: 'Ready for another focus session?' });
      }
    } catch (_) {}
  }
}

export function getTimerState() {
  return { ...state };
}

export function setDurations(workMinutes, breakMinutes) {
  state.workDuration = (workMinutes ?? 25) * 60;
  state.breakDuration = (breakMinutes ?? 5) * 60;
  notify();
}

export function setHabit(habitId) {
  state.habitId = habitId;
  notify();
}

export function setMode(mode) {
  if (state.phase !== 'idle' && state.phase !== 'stopwatch-paused') return;
  stopInterval();
  state.mode = mode;
  state.phase = 'idle';
  state.remainingSeconds = 0;
  state.stopwatchSeconds = 0;
  notify();
}

export function startWork(workSeconds = null) {
  stopInterval();
  state.phase = 'work';
  state.remainingSeconds = workSeconds ?? state.workDuration;
  state.intervalId = setInterval(tick, 1000);
  notify();
}

export function startBreak() {
  stopInterval();
  state.phase = 'break';
  state.remainingSeconds = state.breakDuration;
  state.intervalId = setInterval(tick, 1000);
  notify();
}

export function pause() {
  stopInterval();
  notify();
}

export function resume() {
  if (state.phase === 'stopwatch-paused') {
    state.phase = 'stopwatch';
    state.intervalId = setInterval(tick, 1000);
    notify();
    return;
  }
  if (state.phase !== 'work' && state.phase !== 'break') return;
  if (state.remainingSeconds <= 0) return;
  state.intervalId = setInterval(tick, 1000);
  notify();
}

export function reset() {
  stopInterval();
  state.phase = 'idle';
  state.remainingSeconds = 0;
  state.stopwatchSeconds = 0;
  notify();
}

export function startStopwatch() {
  stopInterval();
  state.phase = 'stopwatch';
  state.intervalId = setInterval(tick, 1000);
  notify();
}

export function pauseStopwatch() {
  if (state.phase !== 'stopwatch') return;
  stopInterval();
  state.phase = 'stopwatch-paused';
  notify();
}

export function subscribeTimer(fn) {
  listeners.push(fn);
  fn(state);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/** Minutes of work completed in the current session (before phase ended). */
export function getElapsedWorkMinutes() {
  if (state.phase === 'work') {
    const elapsed = state.workDuration - state.remainingSeconds;
    return Math.max(0, Math.round(elapsed / 60));
  }
  if (state.phase === 'stopwatch' || state.phase === 'stopwatch-paused') {
    return Math.round(state.stopwatchSeconds / 60);
  }
  return 0;
}

export function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
