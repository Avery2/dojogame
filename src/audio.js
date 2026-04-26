// Web Audio synthesized SFX from move.sound = { freq, dur, type }.
let ctx = null;
let muted = false;

function ensureCtx() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function playMoveSfx(sound) {
  if (muted || !sound) return;
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = sound.type || 'square';
  osc.frequency.value = sound.freq || 440;
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(c.destination);
  const now = c.currentTime;
  const dur = sound.dur || 0.1;
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export function playHit() {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  // Noise burst via short oscillator beat
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.value = 80;
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(c.destination);
  const now = c.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.start(now);
  osc.stop(now + 0.2);
}

export function playBlock() {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 1200;
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(c.destination);
  const now = c.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }
