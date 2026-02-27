/**
 * Galaxy / Constellation map logic.
 * Each session = one star. Longer sessions = brighter/larger stars.
 * Constellation lines connect nearby stars after 5-7 sessions.
 */

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

/** Deterministic random in [0, 1) from seed */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** Each session = 1 star, uniform size. */
function starScale() {
  return 1;
}

/** Compute star positions (deterministic from date + habitId) */
export function computeStars(sessions) {
  const centerX = 50;
  const centerY = 50;
  const spread = 35;
  return sessions.map((s, i) => {
    const mins = s.focusMinutes || 30;
    const seed = hash(`${s.date}-${s.habitId}-${i}`);
    const angle = seededRandom(seed) * Math.PI * 2;
    const r = 5 + seededRandom(seed + 1) * spread;
    return {
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
      size: starScale(),
      focusMinutes: mins,
      date: s.date,
      habitId: s.habitId,
      index: i,
    };
  });
}

/** Connect stars within distance; first star = home star */
export function computeConstellationLines(stars, maxDistance = 18, minStars = 5) {
  if (stars.length < minStars) return [];
  const lines = [];
  const added = new Set();
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i];
      const b = stars[j];
      const key = `${i}-${j}`;
      if (added.has(key)) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= maxDistance) {
        lines.push({ from: i, to: j, distance: d });
        added.add(key);
      }
    }
  }
  return lines;
}

/** Format Date to YYYY-MM-DD in local time. */
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Consecutive days with at least one session */
export function computeStreak(sessions) {
  if (sessions.length === 0) return 0;
  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  let streak = 0;
  const today = toDateKey(new Date());
  let check = today;
  for (const d of dates) {
    if (d !== check) break;
    streak++;
    const next = new Date(check + 'T12:00:00');
    next.setDate(next.getDate() - 1);
    check = toDateKey(next);
  }
  return streak;
}

/** Milestone tiers */
export function getMilestone(sessionCount) {
  if (sessionCount >= 31) return { tier: 4, nebula: 'golden', label: 'Full galaxy' };
  if (sessionCount >= 16) return { tier: 3, nebula: 'purple', label: 'Nebula tint' };
  if (sessionCount >= 6) return { tier: 2, nebula: null, label: 'First constellation' };
  return { tier: 1, nebula: null, label: 'Stars emerging' };
}

/** 25–44 = Orion, 45–74 = Ursa Major, 75+ = Cassiopeia. Focus-timer only. */
export const CONSTELLATION_PRESETS = [
  { id: 'orion', name: 'Orion', subtitle: 'The Hunter', difficulty: 'Easy', sessions: 8, minMinutes: 25, maxMinutes: 45, description: '8 sessions × 30 min (focus timer)' },
  { id: 'ursa-major', name: 'Ursa Major', subtitle: 'The Great Bear', difficulty: 'Medium', sessions: 7, minMinutes: 45, maxMinutes: 75, description: '7 sessions × 60 min (focus timer)' },
  { id: 'cassiopeia', name: 'Cassiopeia', subtitle: 'The Queen', difficulty: 'Hard', sessions: 8, minMinutes: 75, description: '8 sessions × 90 min (focus timer)' },
];

/** 30 min = Orion only (25-44), 60 min = Ursa Major only (45-74), 90 min = Cassiopeia only (75+). Focus-timer sessions only. */
function qualifiesForConstellation(session, minMinutes, maxMinutes) {
  const mins = session.focusMinutes || 0;
  if (mins < minMinutes) return false;
  if (maxMinutes != null && mins >= maxMinutes) return false;
  if (session.mode === 'stopwatch') return false;
  return true;
}

/** Compute progress for each constellation. Each session counts for exactly one tier. Focus-timer only. */
export function computeConstellationProgress(sessions) {
  return CONSTELLATION_PRESETS.map((preset) => {
    const minMinutes = preset.minMinutes;
    const maxMinutes = preset.maxMinutes;
    const qualifying = sessions.filter((s) => qualifiesForConstellation(s, minMinutes, maxMinutes));
    const count = qualifying.length;
    const completed = count >= preset.sessions;
    return {
      ...preset,
      current: Math.min(count, preset.sessions),
      total: preset.sessions,
      completed,
      qualifyingSessions: qualifying,
    };
  });
}
