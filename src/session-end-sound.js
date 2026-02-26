/**
 * Plays a soft looping chime until stop() is called.
 * Uses Web Audio API so no external files are needed.
 */
let audioContext = null;
let gainNode = null;
let repeatTimeoutId = null;

export function play() {
  stop();
  if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctx();
    gainNode = audioContext.createGain();
    gainNode.gain.value = 0.2;
    gainNode.connect(audioContext.destination);

    const playTone = (frequency, startTime, duration) => {
      const osc = audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      osc.connect(gainNode);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const chime = () => {
      if (!audioContext) return;
      const t = audioContext.currentTime;
      playTone(523.25, t, 0.15);       // C5
      playTone(659.25, t + 0.2, 0.2); // E5
      playTone(783.99, t + 0.45, 0.25); // G5
    };

    chime();
    repeatTimeoutId = setInterval(chime, 2000);
  } catch (_) {}
}

export function stop() {
  if (repeatTimeoutId) {
    clearInterval(repeatTimeoutId);
    repeatTimeoutId = null;
  }
  if (audioContext) {
    try { audioContext.close(); } catch (_) {}
    audioContext = null;
  }
  gainNode = null;
}
