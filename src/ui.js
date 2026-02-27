import { renderIcon } from './icons.js';
import {
  getHabitsList,
  getTimeSpentPerHabit,
  getDailyTotalsLast30Days,
  getHabitStreak,
  addHabit,
  updateHabit,
  deleteHabit,
  isCompletedToday,
  addFocusToCompletion,
  getPresetIcons,
} from './habits.js';
import {
  getTimerState,
  getElapsedWorkMinutes,
  startWork,
  startStopwatch,
  pause,
  pauseStopwatch,
  resume,
  reset,
  setDurations,
  setHabit,
  setMode,
  formatSeconds,
} from './timer.js';

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function habitIconHtml(iconName) {
  return renderIcon(iconName || 'book', 22);
}

function formatTimeSpent(minutes) {
  if (!minutes || minutes === 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatTimeSpentHours(minutes) {
  if (!minutes || minutes === 0) return '0h';
  const h = Math.round(minutes / 60);
  return `${h}h`;
}

function formatTimeSpentMinutes(minutes) {
  if (!minutes || minutes === 0) return '0m';
  return `${Math.round(minutes)}m`;
}

const TIME_DISPLAY_KEY = 'habbitto_time_display';

export function getTimeDisplayFormat() {
  try {
    const stored = localStorage.getItem(TIME_DISPLAY_KEY);
    return stored === 'minutes' ? 'minutes' : 'hours';
  } catch {
    return 'hours';
  }
}

export function setTimeDisplayFormat(format) {
  if (format !== 'hours' && format !== 'minutes') return;
  try {
    localStorage.setItem(TIME_DISPLAY_KEY, format);
  } catch (_) {}
}

function formatTimeSpentForHabit(minutes) {
  return getTimeDisplayFormat() === 'minutes'
    ? formatTimeSpentMinutes(minutes)
    : formatTimeSpentHours(minutes);
}

const LAST_DURATION_KEY = 'habbitto_last_duration';
const PRESET_MINUTES = [30, 45, 60, 75, 90];

function getLastUsedDuration() {
  try {
    const n = parseInt(localStorage.getItem(LAST_DURATION_KEY), 10);
    return n >= 1 && n <= 180 ? n : null;
  } catch {
    return null;
  }
}

function setLastUsedDuration(minutes) {
  try {
    localStorage.setItem(LAST_DURATION_KEY, String(minutes));
  } catch (_) {}
}

const DURATION_MESSAGES = {
  30: "Okay, I'm in for a quick session. Let's get warmed up!",
  45: "Let's go solid this time — not too long, not too short.",
  60: "A full hour! Time to focus and make it count.",
  75: "Pushing past the comfort zone — let's keep that momentum going.",
  90: "Looks like someone wants to lock in. Let's dial in and go all out!",
};

function getDurationMessage(workMinutes) {
  return DURATION_MESSAGES[workMinutes] || '';
}

function isPaused(state) {
  return state.phase === 'stopwatch-paused' || ((state.phase === 'work' || state.phase === 'break') && !state.intervalId && state.remainingSeconds > 0);
}

function showSaveBtn(state) {
  return state.phase === 'work' || ((state.phase === 'stopwatch' || state.phase === 'stopwatch-paused') && state.stopwatchSeconds > 0);
}

let timeSpentFilter = 'habits'; // 'habits' | 'daily'

const DEFAULT_TAB_TITLE = 'Habbitto';
const CIRCUMFERENCE = 2 * Math.PI * 54;

/** Lightweight update of timer display only – avoids full re-render flash. */
export function updateTimerDisplay(container) {
  const state = getTimerState();
  const habits = getHabitsList();
  if (typeof document !== 'undefined') {
    if (state.phase === 'work' || state.phase === 'break') {
      const m = Math.floor(state.remainingSeconds / 60);
      const s = state.remainingSeconds % 60;
      document.title = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} · ${DEFAULT_TAB_TITLE}`;
    } else if (state.phase === 'stopwatch' || state.phase === 'stopwatch-paused') {
      const total = state.stopwatchSeconds;
      const m = Math.floor(total / 60);
      const s = total % 60;
      document.title = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} · ${DEFAULT_TAB_TITLE}`;
    } else {
      document.title = DEFAULT_TAB_TITLE;
    }
  }
  const isStopwatch = state.mode === 'stopwatch';
  const isStopwatchRunning = state.phase === 'stopwatch' || state.phase === 'stopwatch-paused';
  const displaySeconds = isStopwatch
    ? (isStopwatchRunning ? state.stopwatchSeconds : 0)
    : (state.phase === 'idle' ? state.workDuration : state.remainingSeconds);
  const showProgress = state.phase === 'work' || state.phase === 'break' || isStopwatchRunning;
  let totalSeconds = 0, elapsedSeconds = 0;
  if (state.phase === 'work') {
    totalSeconds = state.workDuration;
    elapsedSeconds = state.workDuration - state.remainingSeconds;
  } else if (state.phase === 'break') {
    totalSeconds = state.breakDuration;
    elapsedSeconds = state.breakDuration - state.remainingSeconds;
  } else if (isStopwatchRunning) {
    totalSeconds = 60 * 60;
    elapsedSeconds = state.stopwatchSeconds % totalSeconds;
  }
  const progress = totalSeconds > 0 ? elapsedSeconds / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const displayEl = container.querySelector('#timer-display');
  if (displayEl) displayEl.textContent = formatSeconds(displaySeconds);
  const remainingLabel = container.querySelector('.timer-remaining-label');
  if (remainingLabel) remainingLabel.textContent = `${Math.floor(state.remainingSeconds / 60)}:${String(state.remainingSeconds % 60).padStart(2, '0')} left`;
  const elapsedLabel = container.querySelector('.timer-elapsed-label');
  if (elapsedLabel) elapsedLabel.textContent = `${Math.floor(elapsedSeconds / 60)}m elapsed`;
  const progressCircle = container.querySelector('.timer-ring-progress');
  if (progressCircle) progressCircle.setAttribute('stroke-dashoffset', showProgress ? strokeDashoffset : CIRCUMFERENCE);

  // Timer control buttons & phase label – update when work/break/stopwatch (avoids full re-render on pause/resume)
  if (state.phase === 'work' || state.phase === 'break' || state.phase === 'stopwatch' || state.phase === 'stopwatch-paused') {
    const pauseResumeBtn = container.querySelector('#timer-pause-resume');
    const saveBtn = container.querySelector('#timer-save');
    if (pauseResumeBtn) {
      pauseResumeBtn.textContent = isPaused(state) ? 'Resume' : 'Pause';
      pauseResumeBtn.className = `btn btn-timer ${isPaused(state) ? 'btn-timer-resume' : 'btn-timer-pause'}`;
    }
    if (saveBtn) saveBtn.hidden = !showSaveBtn(state);
    const phaseEl = container.querySelector('.timer-phase');
    if (phaseEl) {
      const label = isStopwatch
        ? (state.phase === 'stopwatch' ? 'Running' : 'Paused')
        : ((state.phase === 'work' || state.phase === 'break') && !state.intervalId ? 'Paused' : state.phase === 'work' ? 'Focus' : 'Break');
      phaseEl.textContent = label;
    }
  }

  // Idle-only updates – no full re-render
  if (state.phase === 'idle') {
    if (!isStopwatch) {
      const workMins = state.workDuration / 60;
      const presetBtns = container.querySelectorAll('.duration-preset-btn');
      presetBtns.forEach((btn) => {
        if (btn.dataset.custom) {
          btn.classList.toggle('selected', !PRESET_MINUTES.includes(workMins));
        } else {
          const m = parseInt(btn.dataset.minutes, 10);
          btn.classList.toggle('selected', workMins === m);
        }
      });
      const msgEl = container.querySelector('.timer-duration-message');
      const msg = getDurationMessage(workMins);
      if (msgEl) {
        if (msg) {
          msgEl.textContent = msg;
          msgEl.style.display = '';
        } else {
          msgEl.style.display = 'none';
        }
      }
    }
    // Habit picker & Start button – both focus and stopwatch
    const habitCards = container.querySelectorAll('.habit-pick-card:not(.habit-pick-cta)');
    habitCards.forEach((card) => {
      card.classList.toggle('selected', card.dataset.habitId === state.habitId);
    });
    const startBtn = container.querySelector('#timer-start');
    if (startBtn) {
      startBtn.disabled = !state.habitId || !habits.some((h) => h.id === state.habitId);
    }
  }
}

export function renderFocusView(container) {
  const habits = getHabitsList();
  const state = getTimerState();
  if (typeof document !== 'undefined') {
    if (state.phase === 'work' || state.phase === 'break') {
      const m = Math.floor(state.remainingSeconds / 60);
      const s = state.remainingSeconds % 60;
      document.title = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} · ${DEFAULT_TAB_TITLE}`;
    } else if (state.phase === 'stopwatch' || state.phase === 'stopwatch-paused') {
      const total = state.stopwatchSeconds;
      const m = Math.floor(total / 60);
      const s = total % 60;
      document.title = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} · ${DEFAULT_TAB_TITLE}`;
    } else {
      document.title = DEFAULT_TAB_TITLE;
    }
  }
  const timeSpent = getTimeSpentPerHabit();
  const isStopwatch = state.mode === 'stopwatch';
  const isStopwatchRunning = state.phase === 'stopwatch' || state.phase === 'stopwatch-paused';
  const displaySeconds = isStopwatch
    ? (isStopwatchRunning ? state.stopwatchSeconds : 0)
    : (state.phase === 'idle' ? state.workDuration : state.remainingSeconds);
  // Circular progress: elapsed and total (for focus: work/break; for stopwatch: 60-min cycle)
  const showProgress = state.phase === 'work' || state.phase === 'break' || isStopwatchRunning;
  let totalSeconds = 0;
  let elapsedSeconds = 0;
  if (state.phase === 'work') {
    totalSeconds = state.workDuration;
    elapsedSeconds = state.workDuration - state.remainingSeconds;
  } else if (state.phase === 'break') {
    totalSeconds = state.breakDuration;
    elapsedSeconds = state.breakDuration - state.remainingSeconds;
  } else if (isStopwatchRunning) {
    totalSeconds = 60 * 60; // 60 min full cycle
    elapsedSeconds = state.stopwatchSeconds % totalSeconds;
  }
  const progress = totalSeconds > 0 ? elapsedSeconds / totalSeconds : 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);
  const phaseLabel = isStopwatch
    ? (state.phase === 'stopwatch' ? 'Running' : state.phase === 'stopwatch-paused' ? 'Paused' : 'Ready')
    : (state.phase === 'work' || state.phase === 'break')
      ? ((state.phase === 'work' || state.phase === 'break') && !state.intervalId ? 'Paused' : state.phase === 'work' ? 'Focus' : 'Break')
      : 'Ready';
  const timerCardClass = state.phase !== 'idle' && state.phase !== 'stopwatch-paused' ? 'timer-card running' : 'timer-card';
  const habitsDone = habits.filter((h) => isCompletedToday(h.id)).length;
  const habitsTotal = habits.length;
  const habitsProgress = habitsTotal > 0 ? `${habitsDone} of ${habitsTotal} done` : '';

  container.innerHTML = `
    <section class="timer-section">
      <div class="time-spent-section" id="time-spent-section"></div>
      <div class="${timerCardClass}">
        <h2 class="timer-card-title">Focus Timer</h2>
        <p class="timer-card-subtitle">Stay Focused</p>
        <div class="timer-mode-selector" id="timer-mode-selector">
          <button type="button" class="mode-btn ${!isStopwatch ? 'active' : ''}" data-mode="focus">Focus timer</button>
          <button type="button" class="mode-btn ${isStopwatch ? 'active' : ''}" data-mode="stopwatch">Stopwatch</button>
        </div>
        <div class="timer-phase">${phaseLabel}</div>
        <div class="timer-ring-wrap">
          <svg class="timer-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle class="timer-ring-track" cx="60" cy="60" r="54" />
            <circle class="timer-ring-progress" cx="60" cy="60" r="54"
              stroke-dasharray="${circumference}" stroke-dashoffset="${showProgress ? strokeDashoffset : circumference}" />
          </svg>
          <div class="timer-display-inner">
            <span class="timer-display" id="timer-display">${formatSeconds(displaySeconds)}</span>
            ${showProgress && !isStopwatch ? `<span class="timer-remaining-label">${Math.floor(state.remainingSeconds / 60)}:${String(state.remainingSeconds % 60).padStart(2, '0')} left</span>` : ''}
            ${showProgress && isStopwatch ? `<span class="timer-elapsed-label">${Math.floor(elapsedSeconds / 60)}m elapsed</span>` : ''}
          </div>
        </div>
        ${!isStopwatch && state.phase === 'idle' ? (() => {
          const presetsHtml = PRESET_MINUTES.map((m) => `<button type="button" class="duration-preset-btn ${state.workDuration / 60 === m ? 'selected' : ''}" data-minutes="${m}">${m}</button>`).join('');
          const customBtn = `<button type="button" class="duration-preset-btn duration-preset-custom" data-custom="1">Custom</button>`;
          const msg = getDurationMessage(state.workDuration / 60);
          return `
        <div class="timer-duration-presets" id="timer-duration-presets">
          ${presetsHtml}${customBtn}
        </div>
        ${msg ? `<p class="timer-duration-message">${escapeHtml(msg)}</p>` : ''}
        `;
        })() : ''}
        <div class="timer-habit-area">
          <p class="timer-habit-label">Select habit</p>
          <div class="habit-picker" id="habit-picker"></div>
        </div>
        <div class="timer-controls">
          ${state.phase === 'idle' ? `<button type="button" class="btn btn-primary btn-timer" id="timer-start" ${!state.habitId || !habits.some(h => h.id === state.habitId) ? 'disabled' : ''}>Start</button>` : `
          <button type="button" class="btn btn-timer ${isPaused(state) ? 'btn-timer-resume' : 'btn-timer-pause'}" id="timer-pause-resume">${isPaused(state) ? 'Resume' : 'Pause'}</button>
          <button type="button" class="btn btn-ghost btn-timer" id="timer-reset">Reset</button>
          <button type="button" class="btn btn-primary btn-timer" id="timer-save" ${!showSaveBtn(state) ? 'hidden' : ''}>Save</button>
          `}
        </div>
      </div>
    </section>
    <footer class="main-footer">
      <span class="main-footer-title">Today's Habits</span>
      <span class="main-footer-progress">${escapeHtml(habitsProgress || 'Add habits below')}</span>
    </footer>
    <section class="collapsible habits-collapsible" id="habits-collapsible">
      <button type="button" class="collapsible-trigger" id="collapsible-trigger" aria-expanded="false">
        <span class="collapsible-title">Habits</span>
        <span class="collapsible-icon" aria-hidden="true">▼</span>
      </button>
      <div class="collapsible-content" id="collapsible-content">
        <div class="collapsible-inner">
          <h3 class="collapsible-heading">Your habits</h3>
          <ul class="habits-list" id="habits-list"></ul>
          <button type="button" class="btn btn-primary btn-add-custom" id="btn-add-custom">+ Add custom habit</button>
        </div>
      </div>
    </section>
    <div id="modal-custom-habit" class="modal" aria-hidden="true"></div>
  `;

  // Time spent section – tabs: Time spent (per habit) | Daily tracking (bar graph)
  const timeSpentSection = container.querySelector('#time-spent-section');
  const dailyTotals = getDailyTotalsLast30Days();
  timeSpentSection.innerHTML = `
    <div class="time-spent-header">
      <h2 class="time-spent-label">Time spent</h2>
      <div class="time-spent-tabs">
        <button type="button" class="time-spent-tab ${timeSpentFilter === 'habits' ? 'active' : ''}" data-filter="habits">Per habit</button>
        <button type="button" class="time-spent-tab ${timeSpentFilter === 'daily' ? 'active' : ''}" data-filter="daily">Daily tracking</button>
      </div>
    </div>
    <div class="time-spent-content" id="time-spent-content"></div>
  `;
  const contentEl = timeSpentSection.querySelector('#time-spent-content');
  const tabs = timeSpentSection.querySelectorAll('.time-spent-tab');

  function renderTimeSpentContent() {
    if (timeSpentFilter === 'habits') {
      if (habits.length === 0) {
        contentEl.innerHTML = '<p class="time-spent-empty">Add habits to track time spent.</p>';
        return;
      }
      const STREAK_SEGMENTS = 30;
      const RING_R = 28;
      const CIRCUMFERENCE = 2 * Math.PI * RING_R;
      const SEG_LEN = CIRCUMFERENCE / STREAK_SEGMENTS;
      const DASH = SEG_LEN * 0.72;
      const GAP = SEG_LEN * 0.28;
      const habitsSorted = [...habits].sort((a, b) => {
        const minsA = timeSpent[a.id] || 0;
        const minsB = timeSpent[b.id] || 0;
        return minsB - minsA; // descending: most to least
      });
      const cards = habitsSorted.map((h) => {
        const mins = timeSpent[h.id] || 0;
        const streakRaw = getHabitStreak(h.id);
        const streak = Math.min(streakRaw, STREAK_SEGMENTS);
        const dashOffset = CIRCUMFERENCE - streak * SEG_LEN;
        const streakLabel = streakRaw > 0 ? `<span class="time-spent-streak-edge" title="${streakRaw} day streak">${streakRaw}</span>` : '';
        return `
          <div class="time-spent-card" data-habit-id="${escapeHtml(h.id)}">
            <div class="time-spent-circle-wrap">
              <svg class="time-spent-streak-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle class="time-spent-ring-bg" cx="50" cy="50" r="${RING_R}" fill="none" stroke-width="6"
                  stroke-dasharray="${DASH} ${GAP}" />
                <circle class="time-spent-ring-fill" cx="50" cy="50" r="${RING_R}" fill="none" stroke-width="6"
                  stroke-dasharray="${DASH} ${GAP}" stroke-dashoffset="${dashOffset}" />
              </svg>
              <div class="time-spent-inner">
                <span class="time-spent-hours">${escapeHtml(formatTimeSpentForHabit(mins))}</span>
              </div>
              ${streakLabel}
            </div>
            <span class="time-spent-name">${escapeHtml(h.name)}</span>
          </div>
        `;
      }).join('');
      contentEl.innerHTML = `
        <div class="time-spent-circles-container">
          <div class="time-spent-grid-scroll">
            <div class="time-spent-grid">${cards}</div>
          </div>
        </div>
      `;
    } else {
      const barAreaHeight = 55;
      const maxHours = 6;
      const pixelsPerHour = barAreaHeight / maxHours;
      const years = [...new Set(dailyTotals.map((d) => new Date(d.date + 'T12:00:00').getFullYear()))];
      const yearLabel = years.length > 1 ? `${years[0]} – ${years[1]}` : String(years[0]);
      const parts = [];
      dailyTotals.forEach((d, i) => {
        const dt = new Date(d.date + 'T12:00:00');
        const prevMonth = i > 0 ? new Date(dailyTotals[i - 1].date + 'T12:00:00').getMonth() : -1;
        const isNewMonth = dt.getMonth() !== prevMonth;
        if (isNewMonth) {
          const monthName = dt.toLocaleDateString('en', { month: 'short' });
          parts.push(`<div class="daily-month-divider" title="${monthName}"><div class="daily-month-divider-inner"><span class="daily-month-label">${monthName}</span><span class="daily-month-line" aria-hidden="true"></span></div></div>`);
        }
        const hours = d.totalMinutes / 60;
        let barHeight = hours * pixelsPerHour;
        if (barHeight > barAreaHeight) barHeight = barAreaHeight;
        if (d.totalMinutes > 0 && barHeight < 4) barHeight = 4;
        const isZero = d.totalMinutes === 0;
        if (isZero) barHeight = 2;
        const fullLabel = dt.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
        const displayTime = getTimeDisplayFormat() === 'minutes'
          ? formatTimeSpentMinutes(d.totalMinutes)
          : formatTimeSpentHours(d.totalMinutes);
        parts.push(`<div class="daily-bar-wrap" title="${fullLabel}: ${displayTime}">
          <div class="daily-bar ${isZero ? 'daily-bar-zero' : ''}" style="height: ${barHeight}px"></div>
          <span class="daily-bar-label">${dt.getDate()}</span>
        </div>`);
      });
      contentEl.innerHTML = `
        <div class="daily-chart-box">
          <div class="daily-chart-header">
            <p class="daily-chart-year">${yearLabel}</p>
            <p class="daily-chart-title">Last 30 days</p>
          </div>
          <div class="daily-chart" id="daily-chart">${parts.join('')}</div>
        </div>
      `;
    }
  }

  renderTimeSpentContent();

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      timeSpentFilter = tab.dataset.filter;
      tabs.forEach((t) => t.classList.toggle('active', t.dataset.filter === timeSpentFilter));
      renderTimeSpentContent();
    });
  });

  // Habit picker (small square containers with icon)
  const habitPicker = container.querySelector('#habit-picker');
  habitPicker.innerHTML = '';
  if (habits.length === 0) {
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'habit-pick-card habit-pick-cta';
    cta.innerHTML = `<span class="habit-pick-cta-text">Create your first habit</span>`;
    cta.addEventListener('click', () => openCustomHabitModal(null));
    habitPicker.appendChild(cta);
  } else {
    habits.forEach((h) => {
      const streak = getHabitStreak(h.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `habit-pick-card ${state.habitId === h.id ? 'selected' : ''}`;
      card.dataset.habitId = h.id;
      card.innerHTML = `
        <span class="habit-pick-icon">${habitIconHtml(h.icon)}</span>
        <span class="habit-pick-name">${escapeHtml(h.name)}</span>
        ${streak > 0 ? `<span class="habit-pick-streak" title="Current streak">${streak} day${streak !== 1 ? 's' : ''}</span>` : ''}
      `;
      card.addEventListener('click', () => setHabit(h.id));
      habitPicker.appendChild(card);
    });
  }

  // Timer controls
  const startBtn = container.querySelector('#timer-start');
  const pauseResumeBtn = container.querySelector('#timer-pause-resume');
  const resetBtn = container.querySelector('#timer-reset');
  const saveBtn = container.querySelector('#timer-save');

  // Mode selector
  container.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // Duration preset buttons
  container.querySelectorAll('.duration-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.custom) {
        const raw = prompt('Focus duration (minutes, 1–180):', String(Math.floor(getTimerState().workDuration / 60)));
        if (raw == null) return;
        const mins = parseInt(raw, 10);
        if (Number.isNaN(mins) || mins < 1 || mins > 180) {
          alert('Please enter a number between 1 and 180.');
          return;
        }
        setDurations(mins, 5);
        setLastUsedDuration(mins);
      } else {
        const mins = parseInt(btn.dataset.minutes, 10);
        if (mins >= 1 && mins <= 180) {
          setDurations(mins, 5);
          setLastUsedDuration(mins);
        }
      }
    });
  });

  if (saveBtn) saveBtn.addEventListener('click', () => {
    if (!confirm('End and save this focus session? Your time will be added to the habit.')) return;
    const elapsed = getElapsedWorkMinutes();
    const habitId = getTimerState().habitId;
    if (habitId && elapsed > 0) addFocusToCompletion(habitId, elapsed);
    reset();
  });

  if (startBtn) startBtn.addEventListener('click', () => {
    const timerState = getTimerState();
    if (!timerState.habitId) return;
    if (timerState.mode === 'stopwatch') {
      startStopwatch();
      if (typeof window !== 'undefined' && window.Notification?.permission === 'default') {
        window.Notification.requestPermission();
      }
    } else {
      setLastUsedDuration(Math.floor(timerState.workDuration / 60));
      if (typeof window !== 'undefined' && window.Notification?.permission === 'default') {
        window.Notification.requestPermission();
      }
      startWork();
    }
  });
  if (pauseResumeBtn) pauseResumeBtn.addEventListener('click', () => {
    const s = getTimerState();
    if (isPaused(s)) {
      resume();
    } else {
      if (s.phase === 'stopwatch') pauseStopwatch();
      else pause();
    }
  });
  if (resetBtn) resetBtn.addEventListener('click', () => reset());

  // Collapsible
  const trigger = container.querySelector('#collapsible-trigger');
  const collapsible = container.querySelector('#habits-collapsible');

  trigger.addEventListener('click', () => {
    const expanded = collapsible.classList.toggle('expanded');
    trigger.setAttribute('aria-expanded', String(expanded));
  });

  const listEl = container.querySelector('#habits-list');

  if (habits.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'habits-empty';
    empty.innerHTML = '<p>No habits yet. Add a custom habit below.</p>';
    listEl.appendChild(empty);
  }

  habits.forEach((habit) => {
    const streak = getHabitStreak(habit.id);
    const li = document.createElement('li');
    li.className = 'habit-row';
    li.dataset.habitId = habit.id;
    li.innerHTML = `
      <span class="habit-icon">${habitIconHtml(habit.icon)}</span>
      <span class="habit-name">${escapeHtml(habit.name)}</span>
      ${streak > 0 ? `<span class="habit-row-streak" title="Current streak">${streak} day${streak !== 1 ? 's' : ''}</span>` : ''}
      <div class="habit-actions">
        <button type="button" class="btn btn-ghost btn-icon habit-edit" title="Edit">✎</button>
        <button type="button" class="btn btn-ghost btn-icon btn-danger habit-delete" title="Delete">🗑</button>
      </div>
    `;
    li.querySelector('.habit-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      openCustomHabitModal(habit);
    });
    li.querySelector('.habit-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${habit.name}"? This will remove the habit and its time data.`)) await deleteHabit(habit.id);
    });
    listEl.appendChild(li);
  });

  container.querySelector('#btn-add-custom').addEventListener('click', () => openCustomHabitModal(null));
  renderCustomHabitModal(container.querySelector('#modal-custom-habit'), null);
}

function openCustomHabitModal(habit) {
  const modal = document.getElementById('modal-custom-habit');
  if (!modal) return;
  modal.dataset.editingId = habit?.id ?? '';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  renderCustomHabitModal(modal, habit);
  document.addEventListener('keydown', customHabitEscapeHandler);
}

function closeCustomHabitModal() {
  const modal = document.getElementById('modal-custom-habit');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', customHabitEscapeHandler);
}

function customHabitEscapeHandler(e) {
  if (e.code === 'Escape') {
    e.preventDefault();
    closeCustomHabitModal();
  }
}

function renderCustomHabitModal(container, habit) {
  if (!container) return;
  const isEdit = !!habit;
  const icons = getPresetIcons();
  const iconOptions = icons
    .map(
      (name) =>
        `<button type="button" class="icon-option ${habit?.icon === name ? 'selected' : ''}" data-icon="${escapeHtml(name)}">${habitIconHtml(name)}</button>`
    )
    .join('');
  container.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop"></div>
    <div class="modal-content">
      <h2 class="modal-title">${isEdit ? 'Edit habit' : 'Add custom habit'}</h2>
      <form id="form-custom-habit" class="modal-form">
        <label for="custom-habit-name">Name</label>
        <input type="text" id="custom-habit-name" value="${escapeHtml(habit?.name ?? '')}" placeholder="e.g. Journaling" required />
        <label>Icon</label>
        <div class="icon-picker" id="icon-picker">${iconOptions}</div>
        <label for="custom-habit-focus">Default focus (minutes, optional)</label>
        <input type="number" id="custom-habit-focus" min="0" step="1" placeholder="25" value="${habit?.defaultFocusMinutes ?? ''}" />
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Add habit'}</button>
        </div>
      </form>
    </div>
  `;

  const form = container.querySelector('#form-custom-habit');
  const nameInput = container.querySelector('#custom-habit-name');
  const iconPicker = container.querySelector('#icon-picker');
  let selectedIcon = habit?.icon ?? 'book';

  iconPicker.querySelectorAll('.icon-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      iconPicker.querySelectorAll('.icon-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIcon = btn.dataset.icon;
    });
  });

  container.querySelector('#modal-backdrop').addEventListener('click', closeCustomHabitModal);
  container.querySelector('#modal-cancel').addEventListener('click', closeCustomHabitModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim() || 'New habit';
    const defaultFocusMinutes = parseInt(container.querySelector('#custom-habit-focus').value, 10) || null;
    try {
      if (isEdit && habit) {
        await updateHabit(habit.id, { name, icon: selectedIcon, defaultFocusMinutes });
      } else {
        await addHabit({ name, icon: selectedIcon, defaultFocusMinutes });
      }
      closeCustomHabitModal();
    } catch (err) {
      console.error(err);
    }
  });
}
