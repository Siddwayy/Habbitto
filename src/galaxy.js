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

/** Star size/brightness: 30m = 1, 90m = 3 (supergiant) */
function starScale(focusMinutes) {
  const m = Math.min(90, Math.max(30, focusMinutes || 30));
  return 0.5 + (m / 60); // 30m -> 1, 60m -> 1.5, 90m -> 2
}

/** Compute star positions (deterministic from date + habitId) */
export function computeStars(sessions) {
  const centerX = 50;
  const centerY = 50;
  const spread = 35;
  return sessions.map((s, i) => {
    const seed = hash(`${s.date}-${s.habitId}-${i}`);
    const angle = seededRandom(seed) * Math.PI * 2;
    const r = 5 + seededRandom(seed + 1) * spread;
    return {
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
      size: starScale(s.focusMinutes),
      focusMinutes: s.focusMinutes || 30,
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

/** Consecutive days with at least one session */
export function computeStreak(sessions) {
  if (sessions.length === 0) return 0;
  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let check = today;
  for (const d of dates) {
    if (d !== check) break;
    streak++;
    const next = new Date(check);
    next.setDate(next.getDate() - 1);
    check = next.toISOString().slice(0, 10);
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

/** Real constellations: complete X sessions of Y mins each. Each session counts toward all constellations it qualifies for. */
export const CONSTELLATION_PRESETS = [
  { id: 'orion', name: 'Orion', subtitle: 'The Hunter', difficulty: 'Easy', sessions: 8, minMinutes: 30, description: '8 sessions × 30 min' },
  { id: 'ursa-major', name: 'Ursa Major', subtitle: 'The Great Bear', difficulty: 'Medium', sessions: 7, minMinutes: 60, description: '7 sessions × 60 min' },
  { id: 'cassiopeia', name: 'Cassiopeia', subtitle: 'The Queen', difficulty: 'Hard', sessions: 8, minMinutes: 90, description: '8 sessions × 90 min' },
];

/** Compute progress for each constellation. Sessions count toward constellations they meet (e.g. 90 min counts for all three). */
export function computeConstellationProgress(sessions) {
  return CONSTELLATION_PRESETS.map((preset) => {
    const qualifying = sessions.filter((s) => (s.focusMinutes || 0) >= preset.minMinutes);
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
