import { getSessionsList } from './sessions.js';
import { getCompletionsAsSessions } from './habits.js';
import { computeStars, computeConstellationLines, computeStreak, getMilestone, computeConstellationProgress } from './galaxy.js';

/** Sessions for galaxy; falls back to completions when sessions are empty. */
function getSessionsForGalaxy() {
  const sessions = getSessionsList();
  if (sessions.length > 0) return sessions;
  return getCompletionsAsSessions();
}

/** Simplified constellation line art (viewBox 0 0 40 40). Stars use constellation-star class for glow. */
const CONSTELLATION_SVGS = {
  orion: `<g class="constellation-shape" filter="url(#constellation-star-glow)">
    <line class="constellation-line" x1="20" y1="5" x2="10" y2="12"/><line class="constellation-line" x1="20" y1="5" x2="30" y2="12"/>
    <line class="constellation-line" x1="10" y1="12" x2="30" y2="12"/>
    <line class="constellation-line" x1="10" y1="12" x2="14" y2="20"/><line class="constellation-line" x1="30" y1="12" x2="26" y2="20"/>
    <line class="constellation-line" x1="14" y1="20" x2="20" y2="20"/><line class="constellation-line" x1="20" y1="20" x2="26" y2="20"/>
    <line class="constellation-line" x1="14" y1="20" x2="14" y2="32"/><line class="constellation-line" x1="26" y1="20" x2="30" y2="32"/>
    <line class="constellation-line" x1="14" y1="32" x2="30" y2="32"/>
    <circle class="constellation-star" cx="20" cy="5" r="1.4"/><circle class="constellation-star" cx="10" cy="12" r="1.4"/><circle class="constellation-star" cx="30" cy="12" r="1.4"/>
    <circle class="constellation-star" cx="14" cy="20" r="1.4"/><circle class="constellation-star" cx="20" cy="20" r="1.4"/><circle class="constellation-star" cx="26" cy="20" r="1.4"/>
    <circle class="constellation-star" cx="14" cy="32" r="1.4"/><circle class="constellation-star" cx="30" cy="32" r="1.4"/>
  </g>`,
  'ursa-major': `<g class="constellation-shape" filter="url(#constellation-star-glow)">
    <line class="constellation-line" x1="8" y1="34" x2="10" y2="26"/><line class="constellation-line" x1="10" y1="26" x2="16" y2="18"/>
    <line class="constellation-line" x1="16" y1="18" x2="22" y2="12"/>
    <line class="constellation-line" x1="22" y1="12" x2="30" y2="8"/><line class="constellation-line" x1="30" y1="8" x2="28" y2="18"/>
    <line class="constellation-line" x1="28" y1="18" x2="20" y2="20"/><line class="constellation-line" x1="20" y1="20" x2="22" y2="12"/>
    <circle class="constellation-star" cx="8" cy="34" r="1.4"/><circle class="constellation-star" cx="10" cy="26" r="1.4"/><circle class="constellation-star" cx="16" cy="18" r="1.4"/>
    <circle class="constellation-star" cx="22" cy="12" r="1.4"/><circle class="constellation-star" cx="30" cy="8" r="1.4"/><circle class="constellation-star" cx="28" cy="18" r="1.4"/><circle class="constellation-star" cx="20" cy="20" r="1.4"/>
  </g>`,
  cassiopeia: `<g class="constellation-shape" filter="url(#constellation-star-glow)">
    <line class="constellation-line" x1="6" y1="10" x2="14" y2="28"/><line class="constellation-line" x1="14" y1="28" x2="20" y2="10"/>
    <line class="constellation-line" x1="20" y1="10" x2="26" y2="28"/><line class="constellation-line" x1="26" y1="28" x2="34" y2="10"/>
    <circle class="constellation-star" cx="6" cy="10" r="1.4"/><circle class="constellation-star" cx="14" cy="28" r="1.4"/><circle class="constellation-star" cx="20" cy="10" r="1.4"/>
    <circle class="constellation-star" cx="26" cy="28" r="1.4"/><circle class="constellation-star" cx="34" cy="10" r="1.4"/>
  </g>`,
};

function formatSessionDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function renderGalaxyView(container, onClose) {
  const sessions = getSessionsForGalaxy();
  const streak = computeStreak(sessions);
  const ms = getMilestone(sessions.length);
  const presets = computeConstellationProgress(sessions);
  let selectedPresetId = null;

  function updateCanvas(qualifyingSessions) {
    const stars = computeStars(qualifyingSessions);
    const lines = computeConstellationLines(stars);
    const svgStars = stars
      .map((s, i) => `<circle class="galaxy-star ${i === 0 ? 'home-star' : ''}" cx="${s.x}%" cy="${s.y}%" r="${1.5 * s.size}" data-index="${i}" />`)
      .join('');
    const svgLines = lines
      .map((l) => {
        const a = stars[l.from];
        const b = stars[l.to];
        return `<line class="galaxy-line" x1="${a.x}%" y1="${a.y}%" x2="${b.x}%" y2="${b.y}%" />`;
      })
      .join('');
    const linesEl = container.querySelector('.galaxy-lines');
    const starsEl = container.querySelector('.galaxy-stars');
    if (linesEl) linesEl.innerHTML = svgLines;
    if (starsEl) starsEl.innerHTML = svgStars;
  }

  const nebulaClass = ms.nebula ? `galaxy-nebula galaxy-nebula-${ms.nebula}` : '';

  container.innerHTML = `
    <div class="galaxy-overlay">
      <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true">
        <defs>
          <filter id="constellation-star-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="constellation-star-fill">
            <stop offset="0%" stop-color="#fff"/>
            <stop offset="50%" stop-color="rgba(212, 168, 83, 0.95)"/>
            <stop offset="100%" stop-color="rgba(212, 168, 83, 0.4)"/>
          </radialGradient>
          <linearGradient id="constellation-line-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(212, 168, 83, 0.5)"/>
            <stop offset="50%" stop-color="rgba(212, 168, 83, 0.9)"/>
            <stop offset="100%" stop-color="rgba(212, 168, 83, 0.5)"/>
          </linearGradient>
        </defs>
      </svg>
      <button type="button" class="galaxy-close" aria-label="Close">×</button>
      <div class="galaxy-header">
        <h2 class="galaxy-title">Your Galaxy</h2>
        <p class="galaxy-stats">${sessions.length} session${sessions.length !== 1 ? 's' : ''} · ${streak} day streak</p>
        ${ms.label ? `<p class="galaxy-milestone">${ms.label}</p>` : ''}
      </div>
      <div class="galaxy-canvas-wrap ${nebulaClass}">
        <svg class="galaxy-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="galaxy-glow">
              <stop offset="0%" stop-color="rgba(212, 168, 83, 0.15)" />
              <stop offset="100%" stop-color="transparent" />
            </radialGradient>
            <filter id="star-glow">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#galaxy-glow)" class="galaxy-center-glow" />
          <g class="galaxy-lines"></g>
          <g class="galaxy-stars"></g>
        </svg>
      </div>
      <div class="galaxy-presets">
        ${presets.map((p) => `
          <button type="button" class="galaxy-preset-card galaxy-preset-${p.id} ${p.completed ? 'completed' : ''} ${selectedPresetId === p.id ? 'selected' : ''}" data-preset-id="${p.id}" title="Click to view stars">
            <span class="galaxy-preset-visual">
              <svg class="galaxy-constellation-svg" viewBox="0 0 40 40" preserveAspectRatio="xMidYMid meet">${CONSTELLATION_SVGS[p.id] || ''}</svg>
            </span>
            <span class="galaxy-preset-label">${p.name}</span>
            <span class="galaxy-preset-difficulty difficulty-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
            <span class="galaxy-preset-progress">${p.current}/${p.total}</span>
          </button>
        `).join('')}
      </div>
      <div class="galaxy-detail-backdrop" id="galaxy-detail-backdrop" aria-hidden="true"></div>
      <div class="galaxy-detail-panel" id="galaxy-detail-panel" aria-hidden="true">
        <button type="button" class="galaxy-detail-close" aria-label="Close">×</button>
        <div class="galaxy-detail-content" id="galaxy-detail-content"></div>
      </div>
      ${sessions.length === 0 ? '<p class="galaxy-empty">Complete focus sessions to grow your galaxy. Each session adds a star.</p>' : ''}
    </div>
  `;

  container.querySelector('.galaxy-close').addEventListener('click', onClose);

  const backdrop = container.querySelector('#galaxy-detail-backdrop');
  const panel = container.querySelector('#galaxy-detail-panel');
  const detailContent = container.querySelector('#galaxy-detail-content');
  const openDetail = (preset) => {
    const q = (preset.qualifyingSessions || []).slice(0, preset.total);
    const sessionList = q.length > 0
      ? q.map((s) => `<li>${formatSessionDate(s.date)} — ${s.focusMinutes} min</li>`).join('')
      : '<li class="galaxy-detail-empty">No qualifying sessions yet</li>';
    detailContent.innerHTML = `
      <h3 class="galaxy-detail-title">${preset.name}</h3>
      <p class="galaxy-detail-subtitle">${preset.subtitle}</p>
      <span class="galaxy-detail-difficulty difficulty-${preset.difficulty.toLowerCase()}">${preset.difficulty}</span>
      <p class="galaxy-detail-requirement">${preset.description}</p>
      <p class="galaxy-detail-progress">${preset.current} / ${preset.total} completed</p>
      <div class="galaxy-detail-visual">
        <svg viewBox="0 0 40 40" preserveAspectRatio="xMidYMid meet">${CONSTELLATION_SVGS[preset.id] || ''}</svg>
      </div>
      <ul class="galaxy-detail-sessions">${sessionList}</ul>
    `;
    panel.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
  };
  const closeDetail = () => {
    panel.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
  };

  container.querySelectorAll('.galaxy-preset-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.presetId;
      const preset = presets.find((p) => p.id === id);
      if (!preset) return;
      selectedPresetId = id;
      btn.classList.add('selected');
      container.querySelectorAll('.galaxy-preset-card').forEach((b) => {
        if (b !== btn) b.classList.remove('selected');
      });
      updateCanvas(preset.qualifyingSessions || []);
      openDetail(preset);
    });
  });

  // Initial state: no stars until constellation is clicked
  updateCanvas([]);
  backdrop.addEventListener('click', closeDetail);
  panel.querySelector('.galaxy-detail-close')?.addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel?.getAttribute('aria-hidden') === 'false') closeDetail();
  });
}
