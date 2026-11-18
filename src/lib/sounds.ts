// Native Web Audio API Sound Effects Synthesizer for Chess
// Physical acoustic modeling: wood tap noise transients, body resonance, and master volume control.
// Clean, low-latency, zero external asset dependencies.

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(getVolume(), audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

let soundMuted = false;
try {
  soundMuted = localStorage.getItem("chess_muted") === "true";
} catch {
  /* ignore */
}

let soundVolume = 0.8;
try {
  const stored = localStorage.getItem("chess_volume");
  if (stored !== null) soundVolume = Math.max(0, Math.min(1, parseFloat(stored)));
} catch {
  /* ignore */
}

export function isMuted(): boolean {
  return soundMuted;
}

export function setMuted(muted: boolean): void {
  soundMuted = muted;
  try {
    localStorage.setItem("chess_muted", String(muted));
  } catch {
    /* ignore */
  }
}

export function getVolume(): number {
  return soundVolume;
}

export function setVolume(vol: number): void {
  soundVolume = Math.max(0, Math.min(1, vol));
  try {
    localStorage.setItem("chess_volume", String(soundVolume));
  } catch {
    /* ignore */
  }
  if (audioCtx && masterGain) {
    masterGain.gain.setValueAtTime(soundVolume, audioCtx.currentTime);
  }
}

/**
 * Creates an acoustic noise transient simulating the physical wood-on-wood click.
 */
function playWoodClick(ctx: AudioContext, targetGain: GainNode, now: number, intensity = 1.0) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.015); // 15ms burst
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // Decaying white noise
    const decay = Math.exp(-i / (ctx.sampleRate * 0.003));
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  // Bandpass filter to sculpt wooden pitch (800Hz - 1400Hz)
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(950, now);
  bandpass.Q.setValueAtTime(3.0, now);

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.35 * intensity, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

  noiseNode.connect(bandpass);
  bandpass.connect(clickGain);
  clickGain.connect(targetGain);

  noiseNode.start(now);
  noiseNode.stop(now + 0.02);
}

export function playMoveSound(): void {
  if (soundMuted || soundVolume === 0) return;
  const ctx = getContext();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;

    // 1. Initial acoustic wood click transient
    playWoodClick(ctx, masterGain, now, 1.0);

    // 2. Resonant wood piece body thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch {
    /* audio failure safe */
  }
}

export function playCaptureSound(): void {
  if (soundMuted || soundVolume === 0) return;
  const ctx = getContext();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;

    // 1. Sharper wood collision click
    playWoodClick(ctx, masterGain, now, 1.4);

    // 2. Deeper hollow board resonance
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(380, now);
    osc1.frequency.exponentialRampToValueAtTime(75, now + 0.09);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(180, now);
    osc2.frequency.exponentialRampToValueAtTime(50, now + 0.09);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.1);
    osc2.stop(now + 0.1);
  } catch {
    /* audio failure safe */
  }
}

export function playCheckSound(): void {
  if (soundMuted || soundVolume === 0) return;
  const ctx = getContext();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc2.frequency.setValueAtTime(880, now + 0.06); // A5

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc1.start(now);
    osc1.stop(now + 0.08);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.28);
  } catch {
    /* audio failure safe */
  }
}

export function playCastleSound(): void {
  if (soundMuted || soundVolume === 0) return;
  playMoveSound();
  setTimeout(() => {
    if (!soundMuted) playMoveSound();
  }, 95);
}

export function playClockTickSound(): void {
  if (soundMuted || soundVolume === 0) return;
  const ctx = getContext();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch {
    /* audio failure safe */
  }
}

export function playInviteSound(): void {
  if (soundMuted || soundVolume === 0) return;
  const ctx = getContext();
  if (!ctx || !masterGain) return;
  const mg = masterGain;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.3, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(mg);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.32);
    });
  } catch {
    /* audio failure safe */
  }
}

export function playGameEndSound(win: boolean | null): void {
  if (soundMuted || soundVolume === 0) return;
  const ctx = getContext();
  if (!ctx || !masterGain) return;
  const mg = masterGain;

  try {
    const now = ctx.currentTime;
    const freqs =
      win === true
        ? [523.25, 659.25, 783.99, 1046.5]
        : win === false
        ? [392.0, 349.23, 311.13, 261.63]
        : [440, 523.25, 659.25];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.4, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(mg);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.45);
    });
  } catch {
    /* audio failure safe */
  }
}
