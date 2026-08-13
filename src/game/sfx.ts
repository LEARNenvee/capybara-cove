/** Tiny square-wave blip engine — retro UI sounds, muted by default. */
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function blip(freq = 440, dur = 0.07, type: OscillatorType = "square", vol = 0.06) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

export const sfx = {
  talk: () => blip(520 + Math.random() * 90, 0.035, "square", 0.035),
  select: () => blip(660, 0.06),
  open: () => {
    blip(440, 0.06);
    setTimeout(() => blip(660, 0.08), 60);
  },
  close: () => {
    blip(500, 0.05);
    setTimeout(() => blip(330, 0.08), 50);
  },
  happy: () => {
    blip(587, 0.06);
    setTimeout(() => blip(784, 0.07), 70);
    setTimeout(() => blip(988, 0.1), 140);
  },
};
