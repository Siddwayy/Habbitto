import { renderIcon } from './icons.js';
import {
  getHabitsList,
  getTimeSpentPerHabit,
  addHabit,
  updateHabit,
  deleteHabit,
  isCompletedToday,
  toggleCompletionToday,
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

export function renderFocusView(container) {
  const habits = getHabitsList();
  const state = getTimerState();
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
    : (state.phase === 'work' ? 'Focus' : state.phase === 'break' ? 'Break' : 'Ready');
  const timerCardClass = state.phase !== 'idle' && state.phase !== 'stopwatch-paused' ? 'timer-card running' : 'timer-card';
  container.innerHTML = `
    <section class="time-spent-section" id="time-spent-section"></section>
    <section class="timer-section">
      <div class="${timerCardClass}">
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
        ${!isStopwatch && state.phase === 'idle' ? `
        <div class="timer-duration-presets" id="timer-duration-presets">
          <button type="button" class="duration-preset-btn" data-minutes="30">30</button>
          <button type="button" class="duration-preset-btn" data-minutes="45">45</button>
          <button type="button" class="duration-preset-btn" data-minutes="60">60</button>
          <button type="button" class="duration-preset-btn" data-minutes="75">75</button>
          <button type="button" class="duration-preset-btn" data-minutes="90">90</button>
        </div>
        ` : ''}
        <div class="timer-controls">
          ${state.phase === 'idle' ? `<button type="button" class="btn btn-primary btn-timer" id="timer-start" ${!state.habitId || !habits.some(h => h.id === state.habitId) ? 'disabled' : ''}>Start</button>` : ''}
          ${(state.phase === 'stopwatch' || (state.phase === 'work' || state.phase === 'break') && state.intervalId) ? `<button type="button" class="btn btn-ghost btn-timer" id="timer-pause">Pause</button>` : ''}
          ${(state.phase === 'stopwatch-paused' || ((state.phase === 'work' || state.phase === 'break') && !state.intervalId && state.remainingSeconds > 0)) ? `<button type="button" class="btn btn-primary btn-timer" id="timer-resume">Resume</button>` : ''}
          ${state.phase !== 'idle' ? `<button type="button" class="btn btn-ghost btn-timer" id="timer-reset">Reset</button>` : ''}
          ${state.phase === 'work' || ((state.phase === 'stopwatch' || state.phase === 'stopwatch-paused') && state.stopwatchSeconds > 0) ? `<button type="button" class="btn btn-primary btn-timer" id="timer-save">Save</button>` : ''}
        </div>
      </div>
      <div class="timer-settings">
        <p class="timer-habit-label">Which habit?</p>
        <div class="habit-picker" id="habit-picker"></div>
        <p class="timer-hint">Enter time, select habit, then Start. Add habits below.</p>
      </div>
    </section>
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

  // Time spent section - show all habits with their total focus time
  const timeSpentSection = container.querySelector('#time-spent-section');
  if (habits.length > 0) {
    timeSpentSection.innerHTML = `
      <h2 class="time-spent-label">Time spent</h2>
      <div class="time-spent-grid" id="time-spent-grid"></div>
    `;
    const grid = timeSpentSection.querySelector('#time-spent-grid');
    habits.forEach((h) => {
      const mins = timeSpent[h.id] || 0;
      const el = document.createElement('div');
      el.className = 'time-spent-card';
      el.innerHTML = `
        <span class="time-spent-icon">${habitIconHtml(h.icon)}</span>
        <span class="time-spent-name">${escapeHtml(h.name)}</span>
        <span class="time-spent-value">${formatTimeSpent(mins)}</span>
        <button type="button" class="btn btn-ghost btn-icon time-spent-delete" title="Delete habit">${habitIconHtml('trash', 16)}</button>
      `;
      el.querySelector('.time-spent-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${h.name}"? This will remove the habit and its time data.`)) await deleteHabit(h.id);
      });
      grid.appendChild(el);
    });
  } else {
    timeSpentSection.innerHTML = '';
  }

  // Habit picker (small square containers with icon)
  const habitPicker = container.querySelector('#habit-picker');
  habits.forEach((h) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `habit-pick-card ${state.habitId === h.id ? 'selected' : ''}`;
    card.dataset.habitId = h.id;
    card.innerHTML = `
      <span class="habit-pick-icon">${habitIconHtml(h.icon)}</span>
      <span class="habit-pick-name">${escapeHtml(h.name)}</span>
    `;
    card.addEventListener('click', () => setHabit(h.id));
    habitPicker.appendChild(card);
  });

  // Timer controls
  const startBtn = container.querySelector('#timer-start');
  const pauseBtn = container.querySelector('#timer-pause');
  const resumeBtn = container.querySelector('#timer-resume');
  const resetBtn = container.querySelector('#timer-reset');
  const saveBtn = container.querySelector('#timer-save');

  // Mode selector
  container.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // Duration preset buttons
  container.querySelectorAll('.duration-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.dataset.minutes, 10);
      setDurations(mins, 5);
    });
  });

  if (saveBtn) saveBtn.addEventListener('click', () => {
    if (!confirm('Do you want to end and save the focus session?')) return;
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
      if (typeof window !== 'undefined' && window.Notification?.permission === 'default') {
        window.Notification.requestPermission();
      }
      startWork();
    }
  });
  if (pauseBtn) pauseBtn.addEventListener('click', () => {
    const s = getTimerState();
    if (s.phase === 'stopwatch') pauseStopwatch();
    else pause();
  });
  if (resumeBtn) resumeBtn.addEventListener('click', resume);
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
    const done = isCompletedToday(habit.id);
    const li = document.createElement('li');
    li.className = 'habit-row';
    li.dataset.habitId = habit.id;
    li.innerHTML = `
      <span class="habit-icon">${habitIconHtml(habit.icon)}</span>
      <span class="habit-name">${escapeHtml(habit.name)}</span>
      <div class="habit-actions">
        <button type="button" class="btn btn-ghost btn-icon habit-done ${done ? 'is-done' : ''}" title="Mark done today" aria-pressed="${done}">✓</button>
        <button type="button" class="btn btn-ghost btn-icon habit-edit" title="Edit">✎</button>
        <button type="button" class="btn btn-ghost btn-icon btn-danger habit-delete" title="Delete">🗑</button>
      </div>
    `;
    li.querySelector('.habit-done').addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleCompletionToday(habit.id);
    });
    li.querySelector('.habit-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      openCustomHabitModal(habit);
    });
    li.querySelector('.habit-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${habit.name}"?`)) await deleteHabit(habit.id);
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
}

function closeCustomHabitModal() {
  const modal = document.getElementById('modal-custom-habit');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
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
