/**
 * Cross-tab live session sync.
 * - Owner tab: writes timer state to localStorage every second; processes commands from other tabs.
 * - Follower tab: reads state from localStorage, displays it; sends commands to owner for pause/resume/reset.
 * - Takeover: if owner tab closes, follower detects stale session and takes over as owner.
 */

const LIVE_SESSION_KEY = 'habbitto_live_session';
const LIVE_SESSION_CMD_KEY = 'habbitto_live_session_cmd';
const HEARTBEAT_MS = 1000;
const STALE_MS = 3500; // session is stale if no update for this long
const STALE_CHECK_MS = 2000; // how often to check for staleness
const CMD_POLL_MS = 500; // owner polls for commands

let ownerHeartbeatId = null;
let staleCheckId = null;
let cmdPollId = null;
let storageListener = null;
let ownerTabId = null;
let isOwner = false;
let userId = null;
let getTimerState = null;
let processCommand = null;

function generateTabId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function serializeState(state) {
  return {
    userId,
    ownerTabId,
    mode: state.mode,
    phase: state.phase,
    remainingSeconds: state.remainingSeconds,
    workDuration: state.workDuration,
    breakDuration: state.breakDuration,
    stopwatchSeconds: state.stopwatchSeconds,
    habitId: state.habitId,
    lastTickAt: Date.now(),
  };
}

function computeDisplayState(stored) {
  if (!stored) return null;
  const now = Date.now();
  const elapsed = (now - (stored.lastTickAt || now)) / 1000;
  const s = { ...stored };
  if (stored.phase === 'work' || stored.phase === 'break') {
    s.remainingSeconds = Math.max(0, (stored.remainingSeconds || 0) - elapsed);
  } else if (stored.phase === 'stopwatch') {
    s.stopwatchSeconds = (stored.stopwatchSeconds || 0) + elapsed;
  }
  return s;
}

export function readLiveSession() {
  try {
    const raw = localStorage.getItem(LIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLiveSession() {
  try {
    localStorage.removeItem(LIVE_SESSION_KEY);
    localStorage.removeItem(LIVE_SESSION_CMD_KEY);
  } catch (_) {}
}

export function isSessionActive(session) {
  if (!session?.phase) return false;
  return ['work', 'break', 'stopwatch', 'stopwatch-paused'].includes(session.phase);
}

export function isSessionStale(session) {
  if (!session?.lastTickAt) return true;
  return Date.now() - session.lastTickAt > STALE_MS;
}

export function isUserIdMatch(session, currentUserId) {
  const sid = session?.userId;
  const uid = currentUserId ?? 'local';
  return sid === uid || (sid == null && uid === 'local');
}

export function getComputedDisplayState(session) {
  return computeDisplayState(session);
}

/**
 * @param {() => object} getState - getTimerState
 * @param {string|null} currentUserId - current user id or 'local'
 * @param {{ onStorageUpdate: (displayState) => void, onTakeOver: () => void }} callbacks
 */
export function setupLiveSessionSync(getState, currentUserId, callbacks) {
  getTimerState = getState;
  userId = currentUserId ?? 'local';
  ownerTabId = generateTabId();

  const writeLiveSession = () => {
    const state = getTimerState();
    if (!isSessionActive({ phase: state.phase })) return;
    try {
      localStorage.setItem(LIVE_SESSION_KEY, JSON.stringify(serializeState(state)));
    } catch (_) {}
  };

  const startOwnerHeartbeat = () => {
    stopOwnerHeartbeat();
    isOwner = true;
    writeLiveSession();
    ownerHeartbeatId = setInterval(writeLiveSession, HEARTBEAT_MS);
  };

  const stopOwnerHeartbeat = () => {
    isOwner = false;
    if (ownerHeartbeatId) {
      clearInterval(ownerHeartbeatId);
      ownerHeartbeatId = null;
    }
    clearLiveSession();
  };

  const handleStorageEvent = (e) => {
    if (e.key !== LIVE_SESSION_KEY || e.storageArea !== localStorage) return;
    if (isOwner) return; // we're the owner, ignore our own updates
    const raw = e.newValue;
    if (!raw) {
      callbacks?.onStorageUpdate?.(null); // session cleared by owner (e.g. reset)
      return;
    }
    try {
      const session = JSON.parse(raw);
      if (!isUserIdMatch(session, currentUserId)) return;
      const display = computeDisplayState(session);
      if (display) callbacks?.onStorageUpdate?.(display);
    } catch (_) {}
  };

  const checkStaleAndTakeOver = () => {
    if (isOwner) return;
    const session = readLiveSession();
    if (!session || !isSessionActive(session) || !isUserIdMatch(session, currentUserId)) return;
    if (!isSessionStale(session)) return;
    stopStaleCheck();
    stopStorageListener();
    callbacks?.onTakeOver?.(session);
  };

  const startStorageListener = () => {
    stopStorageListener();
    storageListener = (e) => handleStorageEvent(e);
    window.addEventListener('storage', storageListener);
  };

  const stopStorageListener = () => {
    if (storageListener) {
      window.removeEventListener('storage', storageListener);
      storageListener = null;
    }
  };

  const startStaleCheck = () => {
    stopStaleCheck();
    staleCheckId = setInterval(checkStaleAndTakeOver, STALE_CHECK_MS);
  };

  const stopStaleCheck = () => {
    if (staleCheckId) {
      clearInterval(staleCheckId);
      staleCheckId = null;
    }
  };

  const sendCommand = (cmd) => {
    try {
      localStorage.setItem(LIVE_SESSION_CMD_KEY, JSON.stringify({ cmd, fromTab: ownerTabId, at: Date.now() }));
    } catch (_) {}
  };

  const pollForCommands = (handler) => {
    processCommand = handler;
    stopCommandPolling();
    cmdPollId = setInterval(() => {
      try {
        const raw = localStorage.getItem(LIVE_SESSION_CMD_KEY);
        if (!raw) return;
        localStorage.removeItem(LIVE_SESSION_CMD_KEY);
        const { cmd } = JSON.parse(raw);
        if (cmd && processCommand) processCommand(cmd);
      } catch (_) {}
    }, CMD_POLL_MS);
  };

  const stopCommandPolling = () => {
    if (cmdPollId) {
      clearInterval(cmdPollId);
      cmdPollId = null;
    }
  };

  return {
    startOwnerHeartbeat,
    stopOwnerHeartbeat,
    startStorageListener,
    stopStorageListener,
    startStaleCheck,
    stopStaleCheck,
    sendCommand,
    pollForCommands,
    stopCommandPolling,
    isOwner: () => isOwner,
    isFollower: () => !isOwner,
  };
}
