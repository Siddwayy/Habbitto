import { signIn, signUp } from './auth.js';
import { renderLogo } from './icons.js';

function showAccountCreatedDialog(container, onContinue) {
  const wrap = document.createElement('div');
  wrap.className = 'modal auth-success-modal';
  wrap.setAttribute('aria-hidden', 'false');
  wrap.innerHTML = `
    <div class="modal-backdrop auth-success-backdrop"></div>
    <div class="modal-content auth-success-content">
      <h2 class="auth-success-title">Account created</h2>
      <p class="auth-success-text">You're all set. Welcome to Habbitto.</p>
      <button type="button" class="btn btn-primary auth-success-btn" id="auth-success-continue">Continue</button>
    </div>
  `;
  container.appendChild(wrap);
  wrap.classList.add('open');
  const close = () => {
    wrap.classList.remove('open');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.remove();
    onContinue?.();
  };
  wrap.querySelector('.auth-success-backdrop').addEventListener('click', close);
  wrap.querySelector('#auth-success-continue').addEventListener('click', close);
}

const SVG_MAIL = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
const SVG_LOCK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

export function renderAuthView(container, onSuccess) {
  let mode = 'login';

  function render() {
    const isLogin = mode === 'login';
    container.innerHTML = `
      <div class="auth-card">
        <div class="app-title-row app-title-row-auth">
          <span class="app-logo">${renderLogo(32)}</span>
          <h1 class="app-title">Habbitto</h1>
        </div>
        <p class="app-subtitle">Focus & Habits</p>
        <form id="auth-form" class="auth-form" autocomplete="on">
          <div class="auth-input-wrap">
            <span class="auth-input-icon">${SVG_MAIL}</span>
            <input type="email" id="auth-email" required placeholder="Email" autocomplete="email" />
          </div>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">${SVG_LOCK}</span>
            <input type="password" id="auth-password" required minlength="6" placeholder="Password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" />
          </div>
          <p id="auth-error" class="auth-error" style="display:none"></p>
          <button type="submit" class="btn auth-btn-submit" id="auth-submit">${isLogin ? 'Sign In' : 'Sign Up'} &rarr;</button>
        </form>
        <p class="auth-switch">
          ${isLogin
            ? `Don\u2019t have an account? <button type="button" class="auth-switch-link" id="auth-toggle">Sign Up</button>`
            : `Already have an account? <button type="button" class="auth-switch-link" id="auth-toggle">Sign In</button>`}
        </p>
      </div>
    `;

    const form = container.querySelector('#auth-form');
    const emailInput = container.querySelector('#auth-email');
    const passwordInput = container.querySelector('#auth-password');
    const errorEl = container.querySelector('#auth-error');
    const submitBtn = container.querySelector('#auth-submit');

    container.querySelector('#auth-toggle').addEventListener('click', () => {
      mode = isLogin ? 'signup' : 'login';
      render();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      errorEl.style.display = 'none';
      errorEl.textContent = '';
      submitBtn.disabled = true;
      try {
        if (isLogin) {
          await signIn(email, password);
        } else {
          await signUp(email, password);
          showAccountCreatedDialog(container, onSuccess);
          return;
        }
        onSuccess?.();
      } catch (err) {
        errorEl.textContent = err.message || 'Something went wrong';
        errorEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  render();
}
