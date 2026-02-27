import { getTimeDisplayFormat, setTimeDisplayFormat } from './ui.js';

export function renderSettingsView(container, onClose, onSettingChange) {
  const format = getTimeDisplayFormat();
  container.innerHTML = `
    <div class="modal-backdrop settings-modal-backdrop"></div>
    <div class="modal-content settings-modal-content">
      <div class="settings-modal-header">
        <h2 class="modal-title">Settings</h2>
        <button type="button" class="btn btn-ghost btn-icon settings-close" aria-label="Close">×</button>
      </div>
      <div class="settings-body">
        <div class="settings-group">
          <label class="settings-label">Time spent display</label>
          <p class="settings-hint">Show total time per habit in hours or minutes</p>
          <div class="settings-format" role="group" aria-label="Time display">
            <button type="button" class="time-format-btn ${format === 'hours' ? 'active' : ''}" data-format="hours" title="Hours">Hours</button>
            <button type="button" class="time-format-btn ${format === 'minutes' ? 'active' : ''}" data-format="minutes" title="Minutes">Minutes</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('.settings-modal-backdrop').addEventListener('click', onClose);
  container.querySelector('.settings-close').addEventListener('click', onClose);

  container.querySelectorAll('.time-format-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.format;
      if (f === 'hours' || f === 'minutes') {
        setTimeDisplayFormat(f);
        container.querySelectorAll('.time-format-btn').forEach((b) => b.classList.toggle('active', b.dataset.format === f));
        if (onSettingChange) onSettingChange();
      }
    });
  });
}
