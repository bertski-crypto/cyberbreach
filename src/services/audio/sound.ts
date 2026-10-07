/**
 * Subtle WebAudio feedback — no assets, no autoplay.
 * Only plays in direct response to user actions; honors the sound toggle.
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, durMs: number, type: OscillatorType, gain = 0.04, when = 0): void {
  const ac = context();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ac.destination);
    const t = ac.currentTime + when;
    osc.start(t);
    osc.stop(t + durMs / 1000);
  } catch {
    /* audio unavailable — silent */
  }
}

export const sound = {
  alert() {
    beep(660, 120, "square", 0.03);
    beep(520, 140, "square", 0.03, 0.13);
  },
  success() {
    beep(520, 110, "sine", 0.05);
    beep(780, 140, "sine", 0.05, 0.11);
  },
  fail() {
    beep(220, 220, "sawtooth", 0.035);
  },
  click() {
    beep(440, 50, "sine", 0.02);
  },
  xp() {
    beep(660, 90, "sine", 0.04);
    beep(880, 110, "sine", 0.04, 0.09);
  },
  achievement() {
    beep(523, 110, "triangle", 0.05);
    beep(659, 110, "triangle", 0.05, 0.1);
    beep(784, 160, "triangle", 0.05, 0.2);
  },
  levelup() {
    beep(392, 120, "sawtooth", 0.025);
    beep(523, 120, "sawtooth", 0.025, 0.11);
    beep(659, 120, "sawtooth", 0.025, 0.22);
    beep(784, 220, "sawtooth", 0.03, 0.33);
  },
};
