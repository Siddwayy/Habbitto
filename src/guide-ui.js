import { renderIcon } from './icons.js';

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/**
 * Renders the app guide / instructions in the given container.
 * @param {HTMLElement} container - Modal or wrapper element
 * @param {() => void} onClose - Called when user closes the guide
 */
export function renderGuideView(container, onClose) {
  const steps = [
    {
      icon: 'book',
      title: 'What’s Habbitto?',
      text: 'Build habits by doing short focus sessions. Pick a habit, set a time, and go. Small steps every day add up.',
    },
    {
      icon: 'plus',
      title: 'Add your habits',
      text: 'Open the "Habits" section at the bottom. Add a custom habit or use presets like Read, Exercise, or Learn. Give each one an icon you like.',
    },
    {
      icon: 'zap',
      title: 'Pick habit & time',
      text: 'Under "Select habit" choose what you’re doing. Then pick a duration (30, 45, 60… or Custom). Hit Start when you’re ready.',
    },
    {
      icon: 'play',
      title: 'Focus timer or stopwatch',
      text: 'Focus timer runs for a set time then stops. Stopwatch runs until you pause—great for open-ended work. Both can log time to your habit.',
    },
    {
      icon: 'heart',
      title: 'Mark done & build streaks',
      text: 'Tick the ✓ on a habit to mark it done for the day. Keep going daily to build a streak—the app shows how many days in a row you’ve done it.',
    },
    {
      icon: 'sun',
      title: 'See your progress',
      text: 'Check "Time spent" to see how much you’ve focused per habit. ',
    },
    {
      icon: 'zap',
      title: 'Quick keys',
      text: 'Space = start, pause, or resume. Keys 1–5 = set duration to 30, 45, 60, 75, or 90 minutes when the timer is idle.',
    },
  ];

  container.innerHTML = `
    <div class="modal-backdrop guide-modal-backdrop"></div>
    <div class="modal-content guide-modal-content">
      <div class="guide-modal-header">
        <h2 class="guide-title">How it works</h2>
        <button type="button" class="btn btn-ghost btn-icon guide-close" aria-label="Close">×</button>
      </div>
      <p class="guide-intro">You’re in the right place. Here’s everything in a nutshell.</p>
      <div class="guide-steps">
        ${steps
          .map(
            (step, i) => `
          <div class="guide-step">
            <span class="guide-step-icon" aria-hidden="true">${renderIcon(step.icon, 28)}</span>
            <div class="guide-step-body">
              <h3 class="guide-step-title">${escapeHtml(step.title)}</h3>
              <p class="guide-step-text">${escapeHtml(step.text)}</p>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      <p class="guide-footer">You’ve got this. One session at a time.</p>
      <button type="button" class="btn btn-primary guide-done" id="guide-done">Got it</button>
    </div>
  `;

  container.querySelector('.guide-modal-backdrop').addEventListener('click', onClose);
  container.querySelector('.guide-close').addEventListener('click', onClose);
  container.querySelector('#guide-done').addEventListener('click', onClose);
}
