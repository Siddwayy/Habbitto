import { initApp } from './app.js';

initApp().catch((err) => {
  console.error('App failed to init:', err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="max-width:360px; margin:2rem auto; padding:2rem; background:#1a1a22; border-radius:12px; color:#f0f0f4;">
        <h2 style="margin:0 0 1rem;">Something went wrong</h2>
        <p style="color:#f87171; margin:1rem 0;">${(err && err.message) || String(err)}</p>
        <p style="font-size:0.9rem; color:#8a8a9a;">Check the browser console (F12).</p>
      </div>
    `;
  }
});
