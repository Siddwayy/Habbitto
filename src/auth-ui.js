import { signIn, signUp } from './auth.js';

export function renderAuthView(container, onSuccess) {
  container.innerHTML = `
    <div class="auth-card">
      <h1 class="app-title">Habbitto</h1>
      <p class="app-subtitle">Focus & Habits</p>
      <p class="auth-tagline">One place for habits and focus.</p>
      <div class="auth-tabs">
        <button type="button" class="auth-tab active" data-tab="login">Log in</button>
        <button type="button" class="auth-tab" data-tab="signup">Sign up</button>
      </div>
      <form id="auth-form" class="auth-form">
        <label for="auth-email">Email</label>
        <input type="email" id="auth-email" required placeholder="you@example.com" />
        <label for="auth-password">Password</label>
        <input type="password" id="auth-password" required minlength="6" placeholder="••••••••" />
        <p id="auth-error" class="auth-error" style="display:none"></p>
        <div class="auth-form-actions">
          <button type="submit" class="btn btn-primary btn-block" id="auth-submit">Log in</button>
        </div>
      </form>
    </div>
  `;

  const form = container.querySelector('#auth-form');
  const emailInput = container.querySelector('#auth-email');
  const passwordInput = container.querySelector('#auth-password');
  const errorEl = container.querySelector('#auth-error');
  const submitBtn = container.querySelector('#auth-submit');
  const tabs = container.querySelectorAll('.auth-tab');

  let mode = 'login';

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === mode));
      submitBtn.textContent = mode === 'login' ? 'Log in' : 'Sign up';
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    submitBtn.disabled = true;
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        alert('Please check your email to confirm your account.');
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
