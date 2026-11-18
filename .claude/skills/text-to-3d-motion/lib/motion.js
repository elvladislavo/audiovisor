// motion.js — tiny, deterministic motion-design toolkit for scene files.
// Everything is a pure function of time t (seconds), so any frame renders identically.
//   import { ease, key, stagger, spring, wiggle, clamp01, range } from '/lib/motion.js';

export const clamp01 = x => Math.min(1, Math.max(0, x));
/** 0→1 progress of t inside [a, b] */
export const range = (t, a, b) => clamp01((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;

export const ease = {
  linear: x => x,
  inQuad: x => x * x,
  outQuad: x => 1 - (1 - x) * (1 - x),
  inOutQuad: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: x => 1 - Math.pow(1 - x, 4),
  outExpo: x => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: x => (x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  inBack: (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x,
  outElastic: x => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
  outBounce: x => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
};

/**
 * Keyframes: key(t, [[time, value, easeIntoThisKey?], ...])
 * value may be a number or an array of numbers. Holds first/last value outside the range.
 *   key(t, [[0, 0], [0.6, 1.2, ease.outBack], [2, 1]])
 */
export function key(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e = ease.inOutCubic] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const k = e(range(t, t0, t1));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}

/** Progress for item i of n, each lasting `dur`, starting `gap` apart from `start`. */
export const stagger = (t, i, { start = 0, gap = 0.08, dur = 0.6, e = ease.outCubic } = {}) =>
  e(range(t, start + i * gap, start + i * gap + dur));

/** Closed-form damped spring 0→1 started at t0 (overshoots, settles). */
export function spring(t, t0 = 0, { stiffness = 120, damping = 12 } = {}) {
  const x = t - t0; if (x <= 0) return 0;
  const w0 = Math.sqrt(stiffness), z = damping / (2 * w0);
  if (z >= 1) return 1 - Math.exp(-w0 * x) * (1 + w0 * x);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * x) * (Math.cos(wd * x) + (z * w0 / wd) * Math.sin(wd * x));
}

/** Smooth deterministic noise in [-1, 1] — for handheld camera, floating objects. */
export function wiggle(t, freq = 1, seed = 0) {
  const s = (x) => Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453 % 1;
  const x = t * freq, i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(s(i), s(i + 1), u);   // s() is already in (-1, 1)
}

/** Loop helper: phase 0→1 repeating every `period` seconds. */
export const loop = (t, period) => ((t % period) + period) % period / period;
