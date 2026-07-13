import { fetchLeaderboard } from './storage-supabase.js';

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatFocusTime(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Renders the leaderboard modal with ranked users and their focus time.
 * Only available when Supabase is configured and user is logged in.
 * @param {HTMLElement} container - Modal container
 * @param {() => void} onClose - Called when user closes the modal
 * @param {string} currentUserId - Current user's ID to highlight their row
 */
export async function renderLeaderboardView(container, onClose, currentUserId) {
  container.innerHTML = `
    <div class="modal-backdrop leaderboard-modal-backdrop"></div>
    <div class="modal-content leaderboard-modal-content">
      <div class="leaderboard-modal-header">
        <h2 class="modal-title">Leaderboard</h2>
        <button type="button" class="btn btn-ghost btn-icon leaderboard-close" aria-label="Close">×</button>
      </div>
      <p class="leaderboard-intro">Top focus time — all users ranked by total minutes.</p>
      <div class="leaderboard-loading" id="leaderboard-loading">Loading…</div>
      <div class="leaderboard-list" id="leaderboard-list" style="display:none"></div>
      <button type="button" class="btn btn-primary leaderboard-done" id="leaderboard-done">Done</button>
    </div>
  `;

  container.querySelector('.leaderboard-modal-backdrop').addEventListener('click', onClose);
  container.querySelector('.leaderboard-close').addEventListener('click', onClose);
  container.querySelector('#leaderboard-done').addEventListener('click', onClose);

  const loadingEl = container.querySelector('#leaderboard-loading');
  const listEl = container.querySelector('#leaderboard-list');

  try {
    const entries = await fetchLeaderboard(50);
    loadingEl.style.display = 'none';
    listEl.style.display = '';

    if (entries.length === 0) {
      listEl.innerHTML = '<p class="leaderboard-empty">No focus time recorded yet. Be the first to log some!</p>';
    } else {
      listEl.innerHTML = entries
        .map(
          (e) => {
            const isCurrentUser = currentUserId && e.userId === currentUserId;
            const rowClass = isCurrentUser ? 'leaderboard-row leaderboard-row-you' : 'leaderboard-row';
            const medal = e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : '';
            return `
            <div class="${rowClass}">
              <span class="leaderboard-rank">${medal || e.rank}</span>
              <span class="leaderboard-name">${escapeHtml(e.displayName)}${isCurrentUser ? ' <span class="leaderboard-you-badge">You</span>' : ''}</span>
              <span class="leaderboard-time">${formatFocusTime(e.totalMinutes)}</span>
            </div>
          `;
          }
        )
        .join('');
    }
  } catch (err) {
    loadingEl.textContent = 'Could not load leaderboard.';
    listEl.style.display = 'none';
  }
}
