import { getTimeDisplayFormat, setTimeDisplayFormat } from './ui.js';
import { renderIcon } from './icons.js';
import { getSession, updateUserProfile, updatePassword } from './auth.js';

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

const penIcon = () => renderIcon('pen', 16);

export function renderSettingsView(container, onClose, onSettingChange, session = null, onLogout = null) {
  const format = getTimeDisplayFormat();
  const user = session?.user;
  const email = user?.email ?? '—';
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const nickname = user?.user_metadata?.nickname || '';
  const showAccount = !!user;

  const accountHtml = showAccount ? `
    <section class="settings-section">
      <h3 class="settings-section-title">Account</h3>
      <div class="settings-account-grid">
        <div class="settings-account-row-edit">
          <span class="settings-field-label">Name</span>
          <div class="settings-field-value-wrap">
            <span class="settings-account-value" data-field="fullName">${escapeHtml(fullName || '—')}</span>
            <input type="text" class="settings-account-input" id="settings-full-name" placeholder="Your full name" value="${escapeHtml(fullName)}" style="display:none" />
          </div>
          <button type="button" class="settings-account-edit-icon" title="Edit name" aria-label="Edit name">${penIcon()}</button>
        </div>
        <div class="settings-account-row-edit">
          <span class="settings-field-label">Nickname</span>
          <div class="settings-field-value-wrap">
            <span class="settings-account-value" data-field="nickname">${escapeHtml(nickname || '—')}</span>
            <input type="text" class="settings-account-input" id="settings-nickname" placeholder="Nickname" value="${escapeHtml(nickname)}" style="display:none" />
          </div>
          <button type="button" class="settings-account-edit-icon" title="Edit nickname" aria-label="Edit nickname">${penIcon()}</button>
        </div>
        <div class="settings-account-row-readonly">
          <span class="settings-field-label">Email</span>
          <span class="settings-field-value">${escapeHtml(email)}</span>
        </div>
      </div>
      <p id="settings-profile-message" class="settings-message auth-error" style="display:none"></p>
      <button type="button" class="btn btn-primary btn-sm" id="settings-save-profile" style="display:none">Save profile</button>
    </section>
    <section class="settings-section">
      <h3 class="settings-section-title">Change password</h3>
      <input type="password" id="settings-new-password" minlength="6" placeholder="New password (min 6 chars)" autocomplete="new-password" class="settings-input" />
      <p id="settings-password-message" class="settings-message auth-error" style="display:none"></p>
      <button type="button" class="btn btn-primary btn-sm" id="settings-change-password">Change password</button>
    </section>
  ` : '';

  const logoutHtml = showAccount && onLogout ? `
    <section class="settings-section settings-section-logout">
      <button type="button" class="btn btn-ghost btn-logout" id="settings-logout">Log out</button>
    </section>
  ` : '';

  container.innerHTML = `
    <div class="modal-backdrop settings-modal-backdrop"></div>
    <div class="modal-content settings-modal-content">
      <div class="settings-modal-header">
        <h2 class="modal-title">Settings</h2>
        <button type="button" class="btn btn-ghost btn-icon settings-close" aria-label="Close">×</button>
      </div>
      <div class="settings-body">
        ${accountHtml}
        <section class="settings-section">
          <h3 class="settings-section-title">Time spent display</h3>
          <p class="settings-hint">Show total time per habit in hours or minutes</p>
          <div class="settings-format" role="group" aria-label="Time display">
            <button type="button" class="time-format-btn ${format === 'hours' ? 'active' : ''}" data-format="hours" title="Hours">Hours</button>
            <button type="button" class="time-format-btn ${format === 'minutes' ? 'active' : ''}" data-format="minutes" title="Minutes">Minutes</button>
          </div>
        </section>
        ${logoutHtml}
      </div>
    </div>
  `;

  container.querySelector('.settings-modal-backdrop').addEventListener('click', onClose);
  container.querySelector('.settings-close').addEventListener('click', onClose);

  const logoutBtn = container.querySelector('#settings-logout');
  if (logoutBtn && onLogout) logoutBtn.addEventListener('click', onLogout);

  // Edit name/nickname with pencil icon
  if (showAccount) {
    const fullNameInput = container.querySelector('#settings-full-name');
    const nicknameInput = container.querySelector('#settings-nickname');
    const fullNameValue = container.querySelector('[data-field="fullName"]');
    const nicknameValue = container.querySelector('[data-field="nickname"]');
    const saveBtn = container.querySelector('#settings-save-profile');
    const profileMsg = container.querySelector('#settings-profile-message');
    const editIconBtns = container.querySelectorAll('.settings-account-edit-icon');

    const showEditName = () => {
      fullNameValue.style.display = 'none';
      fullNameInput.style.display = 'block';
      fullNameInput.focus();
      saveBtn.style.display = 'block';
    };
    const showEditNickname = () => {
      nicknameValue.style.display = 'none';
      nicknameInput.style.display = 'block';
      nicknameInput.focus();
      saveBtn.style.display = 'block';
    };

    editIconBtns[0]?.addEventListener('click', showEditName);
    editIconBtns[1]?.addEventListener('click', showEditNickname);

    fullNameInput?.addEventListener('blur', () => {
      if (fullNameInput.value !== (user?.user_metadata?.full_name || user?.user_metadata?.name || '')) return;
      fullNameValue.textContent = fullNameInput.value || '—';
      fullNameValue.style.display = '';
      fullNameInput.style.display = 'none';
      if (!nicknameInput?.style.display || nicknameInput.style.display === 'none') saveBtn.style.display = 'none';
    });
    nicknameInput?.addEventListener('blur', () => {
      if (nicknameInput.value !== (user?.user_metadata?.nickname || '')) return;
      nicknameValue.textContent = nicknameInput.value || '—';
      nicknameValue.style.display = '';
      nicknameInput.style.display = 'none';
      if (!fullNameInput?.style.display || fullNameInput.style.display === 'none') saveBtn.style.display = 'none';
    });

    saveBtn?.addEventListener('click', async () => {
      profileMsg.style.display = 'none';
      const fullNameVal = (fullNameInput?.value ?? '').trim() || null;
      const nicknameVal = (nicknameInput?.value ?? '').trim() || null;
      try {
        const { user: updatedUser } = await updateUserProfile(fullNameVal, nicknameVal);
        const { data } = await getSession();
        renderSettingsView(container, onClose, onSettingChange, data?.session ?? { user: updatedUser }, onLogout);
      } catch (err) {
        profileMsg.textContent = err.message || 'Failed to save profile';
        profileMsg.style.display = 'block';
      }
    });

    // Change password
    const pwInput = container.querySelector('#settings-new-password');
    const pwMsg = container.querySelector('#settings-password-message');
    const changePwBtn = container.querySelector('#settings-change-password');
    changePwBtn?.addEventListener('click', async () => {
      const newPassword = pwInput?.value;
      if (!newPassword || newPassword.length < 6) {
        pwMsg.textContent = 'Password must be at least 6 characters';
        pwMsg.style.display = 'block';
        return;
      }
      pwMsg.style.display = 'none';
      try {
        await updatePassword(newPassword);
        pwMsg.textContent = 'Password updated.';
        pwMsg.style.color = 'var(--success)';
        pwMsg.style.display = 'block';
        if (pwInput) pwInput.value = '';
      } catch (err) {
        pwMsg.textContent = err.message || 'Failed to update password';
        pwMsg.style.color = '';
        pwMsg.style.display = 'block';
      }
    });
  }

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
