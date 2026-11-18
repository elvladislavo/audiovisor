// BRIEF: 30-second fight. The elvladislavo character takes on six thugs in a rainy neon alley; each
// thug is a web-design problem, named in Polish on a tag over his head. Every one he beats gets
// crossed out with a green tick. The boss, "Przestarzały design", guards a trophy; after the last
// fight he picks it up — "TWOJA STRONA" — raises it as the neon elvladislavo.com sign lights up,
// and walks out toward camera holding it high.
//
// LABELS (Polish, checked): Wolne ładowanie · Brak responsywności · Wyskakujące okienka · Błąd 404 ·
//                           Słabe SEO · Przestarzały design · trophy: TWOJA STRONA
// SHOT PLAN (scene time τ; two slow-motion moments stretch real time to 30 s)
//   0–3 boot-to-face crane, tie · 3–4.6 the gang appears, tags pop in
//   4.6–7.3  "Wolne ładowanie": slow punch, dodge, jab–jab–cross–hook, spins down
//   7.3–9.4  "Brak responsywności": parry, spinning leg sweep, falls like a plank
//   9.4–11.8 "Wyskakujące okienka": pops out from behind the dumpster, duck, uppercut (slow-mo)
//   11.8–15.6 "Błąd 404" + "Słabe SEO" together: duck the bat, front kick, spinning roundhouse, shoulder throw
//   15.6–20.8 boss "Przestarzały design": two blocked haymakers, counter, dodges the smash, flying kick (slow-mo), into the wall
//   20.8–24.8 tie, walks to the trophy, picks it up, raises it — neon sign lights
//   24.8–end walks out toward camera, trophy high
//
// Render: node .claude/skills/text-to-3d-motion/scripts/render.mjs motion/stickman-fight-30/scene.js --width 1080 --height 1920 --out fight30.mp4
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease, key, range, wiggle } from '/lib/motion.js';
import { buildStickman } from '/assets/stickman.js';

const PI = Math.PI, TAU2 = 2 * PI, lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const E = ease;

/* ───────────── time remap: slow motion on the uppercut and the boss kick; 30 s real ───────────── */
const REAL_END = 30;
const dip = (tau, a, b, depth) => depth * sm(a - 0.15, a, tau) * (1 - sm(b, b + 0.2, tau));
const rate = tau => 1 - Math.max(dip(tau, 10.78, 11.0, 0.55), dip(tau, 19.62, 19.95, 0.74));
const REMAP = (() => { const out = [0]; let tau = 0; const dt = 1 / 600; while (out.length * dt < REAL_END + 0.5) { tau += rate(tau) * dt; out.push(tau); } return { out, dt }; })();
const tauAt = t => { const f = t / REMAP.dt, i = Math.min(REMAP.out.length - 2, Math.floor(f)); return lerp(REMAP.out[i], REMAP.out[i + 1], f - i); };
const TAU_END = tauAt(REAL_END);
export const meta = { duration: REAL_END, fps: 30, background: '#07080d' };

/* ───────────── choreography (root tracks: x z y yaw pitch roll; y = -0.86·scale means lying) ───────────── */
const T_PICK = 23.55, T_HOLD = 23.8, T_SIGN = 24.25;
const TROPHY_POS = [-3.6, 0.9, -5.1];
const HERO = {
  x: [[0, 0], [21.85, 0], [23.25, -3.2, E.inOutQuad], [24.9, -3.2], [28.1, -0.6, E.linear]],
  z: [[0, 0], [5.9, 0], [6.05, 0.35], [6.3, 0.2], [6.9, 0], [17.05, 0], [17.25, 0.35, E.outCubic], [17.55, 0.35], [17.75, 0.7, E.outCubic],
    [18.5, 0.7], [18.8, 2.3, E.outQuad], [19.0, 2.3], [19.42, 1.0, E.inQuad], [19.95, -0.85, E.outCubic], [20.2, -1.15],
    [21.85, -1.15], [23.25, -4.35, E.inOutQuad], [24.9, -4.35], [28.1, 3.1, E.linear]],
  y: [[0, 0], [18.5, 0], [18.62, 0.3, E.outQuad], [18.8, 0, E.inQuad], [19.42, 0], [19.6, 0.82, E.outQuad], [19.9, 0.66], [20.2, 0, E.inQuad]],
  yaw: [[0, 0], [4.5, 0], [4.8, -PI / 2], [7.1, -PI / 2], [7.4, PI / 2], [8.2, PI / 2], [8.55, PI / 2 + TAU2, E.inOutCubic], [9.6, 2.5 * PI], [9.9, TAU2 + 1.03],
    [12.2, TAU2 + 1.03], [12.5, 3 * PI], [13.25, 3 * PI], [13.35, 3.5 * PI], [13.65, 3.5 * PI], [14.0, 2 * TAU2 + 2.03, E.inOutCubic], [14.55, 2 * TAU2 + 2.03],
    [14.72, 2 * TAU2 + 4.29], [15.4, 2 * TAU2 + 4.29], [15.9, 5 * PI], [21.85, 5 * PI], [22.05, 3 * TAU2 - 2.36], [23.25, 3 * TAU2 - 2.36], [23.5, 3 * TAU2 - 2.6],
    [24.7, 3 * TAU2 - 2.6], [25.1, 3 * TAU2 + 0.33], [28.1, 3 * TAU2 + 0.33], [28.5, 3 * TAU2]],
  pitch: [[0, 0]], roll: [[0, 0]],
};
const G1 = {   // Wolne ładowanie — sluggish
  x: [[0, -6.5], [3.0, -6.5], [4.0, -4.0, E.outCubic], [4.6, -4.0], [5.85, -1.05, E.linear], [6.85, -1.05], [7.3, -1.9, E.outCubic]],
  z: [[0, 1.0], [4.0, 0.6], [5.85, 0], [6.85, 0], [7.3, 0.4]],
  y: [[0, 0], [6.85, 0], [7.35, -0.86, E.inQuad]],
  yaw: [[0, PI / 2], [6.85, PI / 2], [7.3, PI / 2 + 1.5 * PI]], pitch: [[0, 0], [6.95, 0], [7.35, PI / 2]], roll: [[0, 0]],
};
const G2 = {   // Brak responsywności — rigid
  x: [[0, 6.5], [3.0, 6.5], [4.0, 4.2, E.outCubic], [7.0, 4.2], [7.95, 1.2, E.inOutQuad], [8.45, 1.2], [8.95, 1.6]],
  z: [[0, -1.0], [4.0, -0.8], [7.95, -0.25]],
  y: [[0, 0], [8.45, 0], [8.6, 0.3, E.outQuad], [8.95, -0.86, E.inQuad]],
  yaw: [[0, -PI / 2]], pitch: [[0, 0], [8.45, 0], [8.95, -PI / 2, E.inQuad]], roll: [[0, 0]],
};
const G3 = {   // Wyskakujące okienka — pops out from behind the dumpster
  x: [[0, 6.4], [9.5, 6.4], [10.2, 2.1, E.inOutQuad], [10.3, 2.1], [10.55, 0.85, E.inQuad], [10.85, 0.85], [11.6, 3.4, E.outCubic]],
  z: [[0, 1.9], [9.5, 1.9], [10.2, 1.2], [10.55, 0.5], [10.85, 0.5], [11.6, 2.2]],
  y: [[0, -0.35], [9.5, -0.35], [9.85, 1.6, E.outQuad], [10.2, 0, E.inQuad], [10.85, 0], [11.15, 2.1, E.outQuad], [11.6, -0.86, E.inQuad]],
  yaw: [[0, -1.86]], pitch: [[0, 0], [10.85, 0], [11.6, -(TAU2 + PI / 2), E.inOutQuad]], roll: [[0, 0]],
};
const G4 = {   // Błąd 404
  x: [[0, -6.5], [3.0, -6.5], [4.0, -4.6, E.outCubic], [11.8, -4.6], [12.8, -1.3, E.inOutQuad], [13.5, -1.3], [14.0, -2.8, E.outCubic], [14.2, -2.8], [14.72, -0.9, E.inOutQuad], [14.88, -0.9], [15.35, 1.55, E.inOutCubic]],
  z: [[0, -2.0], [4.0, -1.6], [12.8, -0.4], [14.0, -0.6], [14.72, -0.4], [15.35, 0.7]],
  y: [[0, 0], [14.88, 0], [15.1, 1.0, E.outQuad], [15.35, -0.86, E.inQuad]],
  yaw: [[0, PI / 2], [12.8, 1.3]], pitch: [[0, 0], [13.5, 0], [13.7, -0.35], [14.0, 0], [14.88, 0], [15.35, 1.5 * PI, E.inOutQuad]], roll: [[0, 0]],
};
const G5 = {   // Słabe SEO — the bat
  x: [[0, 6.5], [3.0, 6.5], [4.0, 4.6, E.outCubic], [11.8, 4.6], [12.8, 1.2, E.inOutQuad], [14.0, 1.2], [14.6, 5.0, E.outCubic]],
  z: [[0, -3.0], [4.0, -2.6], [12.8, -0.6], [14.0, -0.6], [14.6, -1.0]],
  y: [[0, 0], [14.0, 0], [14.25, 0.75, E.outQuad], [14.6, -0.86, E.inQuad]],
  yaw: [[0, -PI / 2], [12.8, -1.11], [14.0, -1.11], [14.6, -2.4]], pitch: [[0, 0], [14.0, 0], [14.6, -PI / 2]], roll: [[0, 0], [14.0, 0], [14.3, 0.5], [14.6, 0]],
};
const BOSS_S = 1.3;
const G6 = {   // Przestarzały design — the boss guarding the trophy
  x: [[0, 1.4], [15.6, 1.4], [17.0, 0, E.inOutQuad]],
  z: [[0, -4.4], [15.6, -4.4], [17.0, -1.6, E.inOutQuad], [18.1, -1.6], [18.25, -1.45], [19.8, -1.45], [20.3, -5.35, E.outCubic]],
  y: [[0, 0], [19.8, 0], [20.05, 0.8, E.outQuad], [20.3, 0.7], [20.45, 0.7], [20.75, 0, E.inQuad]],
  yaw: [[0, 0]], pitch: [[0, 0], [19.8, 0], [20.05, -0.8], [20.3, -0.5], [20.75, -0.28]], roll: [[0, 0]],
};

/* ───────────── poses ───────────── */
const walkCycle = (t, f = 1.8, s = 0.5) => { const p = t * TAU2 * f, q = Math.sin(p);
  return { hipsY: 0.94 + 0.02 * Math.abs(Math.cos(p)), hipL: [-s * q, 0, 0], hipR: [s * q, 0, 0], kneeL: [0.15 + 0.6 * Math.max(0, Math.sin(p - 1.2)), 0, 0], kneeR: [0.15 + 0.6 * Math.max(0, Math.sin(p + PI - 1.2)), 0, 0],
    shoulderL: [0.4 * q, 0, 0.12], shoulderR: [-0.4 * q, 0, -0.12], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0] }; };
const G_ARMS = { shoulderL: [-1.25, 0, 0.3], elbowL: [-1.95, 0, 0], shoulderR: [-0.85, 0, -0.25], elbowR: [-2.15, 0, 0] };
const STANCE = { hipsY: 0.87, spine: [0.15, -0.2, 0], head: [-0.15, 0.2, 0], hipL: [-0.4, 0, 0.18], hipR: [0.3, 0, -0.18], kneeL: [0.45, 0, 0], kneeR: [0.35, 0, 0] };
const H = {
  stand: () => ({ shoulderL: [0, 0, 0.12], shoulderR: [0, 0, -0.12], elbowL: [-0.15, 0, 0], elbowR: [-0.15, 0, 0] }),
  tie: t => ({ head: [0.25, 0, 0.05 * Math.sin(t * 6)], shoulderL: [0, 0, 0.12], elbowL: [-0.15, 0, 0], shoulderR: [-1.05, 0, 0.42], elbowR: [-2.15, 0, 0], spine: [0.05, 0, 0] }),
  guard: t => ({ ...STANCE, ...G_ARMS, hipsY: 0.87 + 0.02 * Math.sin(t * 7) }),
  dodge: () => ({ ...STANCE, ...G_ARMS, spine: [0.1, -0.2, -0.45], head: [-0.1, 0.2, 0.3], hipsY: 0.82 }),
  jab: () => ({ ...STANCE, spine: [0.18, -0.35, 0], head: [-0.15, 0.3, 0], shoulderL: [-1.62, 0, -0.05], elbowL: [-0.05, 0, 0], shoulderR: [-0.85, 0, -0.25], elbowR: [-2.15, 0, 0] }),
  cross: () => ({ ...STANCE, hipsY: 0.84, spine: [0.22, 0.45, 0], head: [-0.2, -0.3, 0], hipR: [0.45, 0, -0.18], kneeR: [0.2, 0, 0], shoulderL: [-1.1, 0, 0.3], elbowL: [-2.0, 0, 0], shoulderR: [-1.62, 0, 0.1], elbowR: [-0.05, 0, 0] }),
  hook: () => ({ ...STANCE, hipsY: 0.84, spine: [0.2, 0.75, 0], head: [-0.15, -0.5, 0], shoulderL: [-1.1, 0, 0.3], elbowL: [-2.0, 0, 0], shoulderR: [-1.45, 0, -1.0], elbowR: [-1.55, 0, 0] }),
  block: () => ({ ...STANCE, hipsY: 0.85, spine: [0.05, -0.2, 0], shoulderL: [-2.0, 0, 0.35], elbowL: [-1.5, 0, 0], shoulderR: [-1.9, 0, -0.35], elbowR: [-1.6, 0, 0] }),
  sweep: () => ({ hipsY: 0.42, spine: [0.65, 0, 0.2], head: [-0.5, 0, 0], hipL: [-1.9, 0, 0.3], kneeL: [2.3, 0, 0], hipR: [0.0, 0, -1.45], kneeR: [0.05, 0, 0],
    shoulderL: [-0.7, 0, 0.6], elbowL: [-0.1, 0, 0], shoulderR: [-1.0, 0, -0.7], elbowR: [-1.2, 0, 0] }),
  duck: () => ({ hipsY: 0.6, spine: [0.75, 0, 0], head: [-0.6, 0, 0], hipL: [-1.3, 0, 0.25], hipR: [-0.5, 0, -0.2], kneeL: [1.9, 0, 0], kneeR: [1.6, 0, 0], ...G_ARMS }),
  uppercut: () => ({ hipsY: 0.93, spine: [-0.2, 0.5, 0], head: [0.2, -0.3, 0], hipL: [-0.3, 0, 0.18], hipR: [0.4, 0, -0.18], kneeL: [0.2, 0, 0], kneeR: [0.1, 0, 0],
    shoulderL: [-1.1, 0, 0.3], elbowL: [-2.0, 0, 0], shoulderR: [-2.5, 0, 0.1], elbowR: [-1.5, 0, 0] }),
  frontKick: () => ({ hipsY: 0.9, spine: [-0.28, 0, 0], head: [0.1, 0, 0], hipR: [-1.5, 0, -0.05], kneeR: [0.08, 0, 0], hipL: [0.1, 0, 0.1], kneeL: [0.25, 0, 0], ...G_ARMS }),
  roundhouse: () => ({ hipsY: 0.9, spine: [-0.1, 0, 0.5], head: [0, 0, -0.4], hipL: [-0.1, 0, 0.05], kneeL: [0.3, 0, 0], hipR: [-0.3, 0, -1.55], kneeR: [0.15, 0, 0],
    shoulderL: [-0.3, 0, 1.1], elbowL: [-0.8, 0, 0], shoulderR: [-0.6, 0, -0.9], elbowR: [-1.2, 0, 0] }),
  grab: () => ({ hipsY: 0.86, spine: [0.3, 0, 0], head: [-0.25, 0, 0], hipL: [-0.5, 0, 0.2], hipR: [0.3, 0, -0.2], kneeL: [0.6, 0, 0], kneeR: [0.4, 0, 0], shoulderL: [-1.45, 0, 0.15], elbowL: [-0.5, 0, 0], shoulderR: [-1.45, 0, -0.15], elbowR: [-0.5, 0, 0] }),
  throw: () => ({ hipsY: 0.8, spine: [0.95, 0, 0], head: [-0.7, 0, 0], hipL: [-0.9, 0, 0.25], hipR: [-0.6, 0, -0.25], kneeL: [1.1, 0, 0], kneeR: [0.9, 0, 0], shoulderL: [-2.5, 0, 0.1], elbowL: [-0.4, 0, 0], shoulderR: [-2.5, 0, -0.1], elbowR: [-0.4, 0, 0] }),
  hop: () => ({ hipsY: 0.8, spine: [0.3, 0, 0], head: [-0.3, 0, 0], hipL: [-0.9, 0, 0.2], hipR: [-0.7, 0, -0.2], kneeL: [1.2, 0, 0], kneeR: [1.0, 0, 0], ...G_ARMS }),
  run: t => ({ ...walkCycle(t, 3.0, 0.95), spine: [0.42, 0, 0], head: [-0.4, 0, 0], shoulderL: [-0.9 * Math.sin(t * 6 * PI), 0, 0.2], shoulderR: [0.9 * Math.sin(t * 6 * PI) - 0.5, 0, -0.2], elbowL: [-1.5, 0, 0], elbowR: [-1.4, 0, 0] }),
  jump: () => ({ hipsY: 0.68, spine: [0.5, 0, 0], head: [-0.45, 0, 0], hipL: [-1.1, 0, 0.1], hipR: [-1.0, 0, -0.1], kneeL: [1.7, 0, 0], kneeR: [1.6, 0, 0], shoulderL: [0.8, 0, 0.2], shoulderR: [0.8, 0, -0.2], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0] }),
  flyKick: () => ({ spine: [-0.3, 0, 0], head: [0.15, 0, 0], hipR: [-1.55, 0, -0.05], kneeR: [0.02, 0, 0], hipL: [-0.9, 0, 0.15], kneeL: [2.0, 0, 0], shoulderL: [0.7, 0, 0.6], elbowL: [-0.4, 0, 0], shoulderR: [0.9, 0, -0.5], elbowR: [-0.3, 0, 0] }),
  land: () => ({ hipsY: 0.62, spine: [0.55, 0, 0], head: [-0.5, 0, 0], hipL: [-1.3, 0, 0.3], hipR: [-0.2, 0, -0.35], kneeL: [1.9, 0, 0], kneeR: [1.4, 0, 0], shoulderL: [-0.4, 0, 0.9], elbowL: [-0.2, 0, 0], shoulderR: [-0.6, 0, -0.5], elbowR: [-0.9, 0, 0] }),
  walk: t => ({ ...walkCycle(t, 1.7, 0.5), spine: [0.05, 0, 0], head: [-0.05, 0.1 * Math.sin(t * 1.7), 0] }),
  pickup: () => ({ hipsY: 0.66, spine: [0.85, 0, 0], head: [-0.55, 0, 0], hipL: [-1.2, 0, 0.2], hipR: [-0.7, 0, -0.2], kneeL: [1.6, 0, 0], kneeR: [1.1, 0, 0], shoulderL: [-0.3, 0, 0.3], elbowL: [-0.3, 0, 0], shoulderR: [-1.25, 0, -0.1], elbowR: [-0.15, 0, 0] }),
  raise: t => ({ head: [-0.35, 0, 0.05 * Math.sin(t * 2)], spine: [-0.08, 0, 0], shoulderR: [-2.95, 0, -0.12], elbowR: [-0.12, 0, 0], shoulderL: [-0.2, 0, 0.55], elbowL: [-0.5, 0, 0], hipL: [-0.05, 0, 0.12], hipR: [0.05, 0, -0.12] }),
  walkTrophy: t => ({ ...walkCycle(t, 1.6, 0.48), spine: [-0.05, 0, 0], head: [-0.12, 0.12 * Math.sin(t * 1.6), 0], shoulderR: [-2.9, 0, -0.15], elbowR: [-0.15, 0, 0],
    shoulderL: [0.35 * Math.sin(t * TAU2 * 1.6), 0, 0.15], elbowL: [-0.35, 0, 0] }),
};
const G = {
  walk: t => ({ ...walkCycle(t, 1.6, 0.45), spine: [0.2, 0, 0], head: [-0.15, 0, 0] }),
  slowWalk: t => ({ ...walkCycle(t, 0.7, 0.35), spine: [0.35, 0, 0], head: [-0.05, 0, 0.15 * Math.sin(t * 2)], shoulderL: [0.1, 0, 0.1], shoulderR: [0.1, 0, -0.1], elbowL: [-0.1, 0, 0], elbowR: [-0.1, 0, 0] }),
  stiffWalk: t => { const q = Math.sin(t * TAU2 * 1.4);
    return { hipL: [-0.3 * q, 0, 0], hipR: [0.3 * q, 0, 0], shoulderL: [0, 0, 0.35], shoulderR: [0, 0, -0.35], spine: [0, 0, 0.08 * q], head: [0, 0.2 * Math.sign(q), 0] }; },
  stiff: () => ({ shoulderL: [-1.57, 0, 0.0], shoulderR: [-1.57, 0, 0.0], elbowL: [0, 0, 0], elbowR: [0, 0, 0], head: [0, 0, 0] }),
  run: t => ({ ...walkCycle(t, 3.0, 0.9), spine: [0.4, 0, 0], head: [-0.35, 0, 0], shoulderL: [-0.8 * Math.sin(t * 6 * PI), 0, 0.2], shoulderR: [0.8 * Math.sin(t * 6 * PI) - 0.6, 0, -0.2], elbowL: [-1.5, 0, 0], elbowR: [-1.4, 0, 0] }),
  guard: t => ({ hipsY: 0.88 + 0.02 * Math.sin(t * 6), spine: [0.25, 0, 0], head: [-0.2, 0, 0], hipL: [-0.3, 0, 0.2], hipR: [0.25, 0, -0.2], kneeL: [0.4, 0, 0], kneeR: [0.4, 0, 0],
    shoulderL: [-1.1, 0, 0.4], elbowL: [-1.8, 0, 0], shoulderR: [-0.9, 0, -0.4], elbowR: [-1.9, 0, 0] }),
  crossed: t => ({ spine: [-0.05, 0, 0], head: [-0.1, 0.25 * Math.sin(t * 0.7), 0], hipL: [0, 0, 0.15], hipR: [0, 0, -0.15], shoulderL: [-1.25, 0, -0.55], elbowL: [-1.75, 0, 0], shoulderR: [-1.15, 0, 0.55], elbowR: [-1.85, 0, 0] }),
  hide: () => ({ hipsY: 0.55, spine: [0.7, 0, 0], head: [-0.4, 0, 0], hipL: [-1.5, 0, 0.2], hipR: [-1.4, 0, -0.2], kneeL: [2.1, 0, 0], kneeR: [2.0, 0, 0], shoulderL: [-0.5, 0, 0.3], shoulderR: [-0.5, 0, -0.3], elbowL: [-1.2, 0, 0], elbowR: [-1.2, 0, 0] }),
  leap: () => ({ spine: [0.2, 0, 0], head: [-0.2, 0, 0], hipL: [-1.2, 0, 0.2], hipR: [-0.4, 0, -0.2], kneeL: [1.6, 0, 0], kneeR: [0.6, 0, 0], shoulderL: [-2.6, 0, 0.5], shoulderR: [-2.6, 0, -0.5], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0] }),
  punch: () => ({ hipsY: 0.86, spine: [0.3, 0.4, 0], head: [-0.25, -0.3, 0], hipL: [-0.5, 0, 0.2], hipR: [0.4, 0, -0.2], kneeL: [0.4, 0, 0], kneeR: [0.2, 0, 0], shoulderL: [-1.0, 0, 0.4], elbowL: [-1.9, 0, 0], shoulderR: [-1.55, 0, 0.1], elbowR: [-0.1, 0, 0] }),
  punchL: () => ({ hipsY: 0.86, spine: [0.3, -0.4, 0], head: [-0.25, 0.3, 0], hipL: [-0.5, 0, 0.2], hipR: [0.4, 0, -0.2], kneeL: [0.4, 0, 0], kneeR: [0.2, 0, 0], shoulderR: [-1.0, 0, -0.4], elbowR: [-1.9, 0, 0], shoulderL: [-1.55, 0, -0.1], elbowL: [-0.1, 0, 0] }),
  windup: () => ({ hipsY: 0.88, spine: [0.1, 0.9, 0], head: [-0.1, -0.8, 0], hipL: [-0.4, 0, 0.2], hipR: [0.3, 0, -0.2], kneeL: [0.4, 0, 0], kneeR: [0.3, 0, 0], shoulderL: [-1.0, 0, -0.6], elbowL: [-1.2, 0, 0], shoulderR: [-1.6, 0, -0.9], elbowR: [-1.3, 0, 0] }),
  swing: () => ({ hipsY: 0.86, spine: [0.2, -0.9, 0], head: [-0.1, 0.6, 0], hipL: [-0.4, 0, 0.2], hipR: [0.3, 0, -0.2], kneeL: [0.5, 0, 0], kneeR: [0.3, 0, 0], shoulderL: [-1.4, 0, 0.9], elbowL: [-0.4, 0, 0], shoulderR: [-1.5, 0, 0.6], elbowR: [-0.3, 0, 0] }),
  smashUp: () => ({ hipsY: 0.92, spine: [-0.3, 0, 0], head: [0.2, 0, 0], shoulderL: [-3.0, 0, -0.2], elbowL: [-0.6, 0, 0], shoulderR: [-3.0, 0, 0.2], elbowR: [-0.6, 0, 0], hipL: [-0.2, 0, 0.2], hipR: [0.1, 0, -0.2] }),
  smashDown: () => ({ hipsY: 0.75, spine: [0.95, 0, 0], head: [-0.6, 0, 0], shoulderL: [-1.3, 0, 0.0], elbowL: [-0.3, 0, 0], shoulderR: [-1.3, 0, 0.0], elbowR: [-0.3, 0, 0], hipL: [-0.9, 0, 0.25], hipR: [-0.3, 0, -0.25], kneeL: [1.0, 0, 0], kneeR: [0.5, 0, 0] }),
  snap: () => ({ spine: [-0.25, 0, 0], head: [0.45, 0.2, 0], shoulderL: [-1.0, 0, 0.5], elbowL: [-1.4, 0, 0], shoulderR: [-0.8, 0, -0.5], elbowR: [-1.5, 0, 0], hipL: [-0.3, 0, 0.2], hipR: [0.2, 0, -0.2], kneeL: [0.3, 0, 0], kneeR: [0.3, 0, 0] }),
  hit: () => ({ spine: [-0.55, 0, 0.1], head: [0.6, 0.3, 0], hipL: [-0.5, 0, 0.35], hipR: [0.2, 0, -0.3], kneeL: [0.6, 0, 0], kneeR: [0.4, 0, 0], shoulderL: [-2.3, 0, 0.8], elbowL: [-0.4, 0, 0], shoulderR: [-2.1, 0, -0.9], elbowR: [-0.6, 0, 0] }),
  fly: t => ({ spine: [-0.3, 0, 0.2 * Math.sin(t * 9)], head: [0.4, 0, 0], hipL: [-0.9 + 0.5 * Math.sin(t * 12), 0, 0.3], hipR: [-0.4 + 0.5 * Math.sin(t * 12 + 2), 0, -0.3], kneeL: [0.9, 0, 0], kneeR: [0.6, 0, 0],
    shoulderL: [-2.4 + Math.sin(t * 10), 0, 0.9], shoulderR: [-2.0 - Math.sin(t * 10), 0, -0.9], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0] }),
  down: () => ({ head: [0.3, 0.6, 0], spine: [0, 0, 0.1], shoulderL: [-0.2, 0, 1.3], shoulderR: [0.2, 0, -1.5], elbowL: [0, 0, 0.4], elbowR: [-0.5, 0, -0.2], hipL: [-0.15, 0, 0.35], hipR: [-0.5, 0, -0.25], kneeL: [0.25, 0, 0], kneeR: [0.9, 0, 0] }),
  plank: () => ({ shoulderL: [0, 0, 0.1], shoulderR: [0, 0, -0.1], head: [0.1, 0, 0] }),
  sit: () => ({ hipsY: 0.2, head: [0.55, 0.4, 0.25], spine: [-0.15, 0, 0.15], hipL: [-1.45, 0, 0.3], hipR: [-1.3, 0, -0.35], kneeL: [0.4, 0, 0], kneeR: [0.9, 0, 0], shoulderL: [0.1, 0, 0.5], elbowL: [-0.3, 0, 0], shoulderR: [0.1, 0, -0.4], elbowR: [-0.2, 0, 0] }),
  getup: () => ({ hipsY: 0.55, spine: [0.8, 0, 0], head: [-0.5, 0, 0], hipL: [-1.4, 0, 0.2], hipR: [-0.6, 0, -0.2], kneeL: [1.9, 0, 0], kneeR: [1.4, 0, 0], shoulderL: [-0.7, 0, 0.3], shoulderR: [-0.9, 0, -0.3], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0] }),
};
const END = 40;
const HERO_KEYS = [
  [0, H.stand], [0.6, H.stand], [0.95, H.tie], [1.75, H.tie], [2.15, H.stand], [3.4, H.stand], [3.9, H.guard],
  [5.85, H.guard], [5.97, H.dodge], [6.15, H.dodge], [6.25, H.jab], [6.33, H.jab], [6.42, H.guard], [6.5, H.cross], [6.6, H.cross], [6.72, H.guard], [6.8, H.hook], [6.95, H.hook], [7.15, H.guard],
  [7.95, H.guard], [8.0, H.block], [8.12, H.block], [8.22, H.sweep], [8.55, H.sweep], [8.78, H.guard],
  [10.35, H.guard], [10.45, H.duck], [10.68, H.duck], [10.78, H.uppercut], [10.95, H.uppercut], [11.25, H.guard],
  [12.85, H.guard], [12.95, H.duck], [13.25, H.duck], [13.38, H.frontKick], [13.6, H.frontKick], [13.7, H.guard], [13.74, H.roundhouse], [14.05, H.roundhouse], [14.3, H.guard],
  [14.68, H.guard], [14.75, H.grab], [14.88, H.grab], [15.1, H.throw], [15.35, H.throw], [15.7, H.guard],
  [16.95, H.guard], [17.05, H.block], [17.3, H.block], [17.42, H.guard], [17.55, H.block], [17.8, H.block], [17.9, H.jab], [17.98, H.jab], [18.06, H.cross], [18.16, H.cross], [18.3, H.guard],
  [18.5, H.hop], [18.8, H.hop], [18.95, H.guard], [19.02, H.run], [19.38, H.run], [19.46, H.jump], [19.62, H.flyKick], [19.95, H.flyKick], [20.2, H.land], [20.55, H.land],
  [20.85, H.stand], [20.95, H.tie], [21.65, H.tie], [21.9, H.walk], [23.15, H.walk], [23.38, H.pickup], [23.7, H.pickup], [24.1, H.raise], [24.75, H.raise],
  [25.0, H.walkTrophy], [28.05, H.walkTrophy], [28.4, H.raise], [END, H.raise],
];
const G1_KEYS = [[0, G.slowWalk], [4.0, G.slowWalk], [4.4, G.guard], [4.65, G.slowWalk], [5.75, G.slowWalk], [6.15, G.punch], [6.28, G.punch], [6.33, G.snap], [6.5, G.snap], [6.58, G.snap], [6.85, G.hit], [7.05, G.fly], [7.35, G.down], [END, G.down]];
const G2_KEYS = [[0, G.stiffWalk], [3.95, G.stiffWalk], [4.1, G.stiff], [7.0, G.stiff], [7.1, G.run], [7.9, G.run], [8.0, G.punch], [8.15, G.punch], [8.4, G.plank], [END, G.plank]];
const G3_KEYS = [[0, G.hide], [9.5, G.hide], [9.62, G.leap], [10.1, G.leap], [10.22, G.guard], [10.32, G.run], [10.48, G.run], [10.58, G.punch], [10.8, G.punch], [10.88, G.hit], [11.1, G.fly], [11.5, G.fly], [11.65, G.down], [END, G.down]];
const G4_KEYS = [[0, G.walk], [3.95, G.walk], [4.1, G.guard], [11.8, G.guard], [11.95, G.run], [12.75, G.run], [12.85, G.guard], [13.45, G.guard], [13.52, G.hit], [13.95, G.hit], [14.1, G.guard], [14.2, G.run], [14.68, G.run], [14.82, G.hit], [15.1, G.fly], [15.4, G.down], [END, G.down]];
const G5_KEYS = [[0, G.walk], [3.95, G.walk], [4.1, G.guard], [11.8, G.guard], [11.95, G.run], [12.7, G.run], [12.82, G.windup], [12.98, G.windup], [13.15, G.swing], [13.5, G.guard], [13.95, G.guard], [14.03, G.hit], [14.2, G.fly], [14.55, G.fly], [14.7, G.down], [END, G.down]];
const G6_KEYS = [[0, G.crossed], [15.6, G.crossed], [15.8, G.walk], [16.9, G.walk], [17.02, G.punch], [17.25, G.punch], [17.4, G.guard], [17.52, G.punchL], [17.75, G.punchL], [17.9, G.guard],
  [17.97, G.snap], [18.08, G.guard], [18.15, G.snap], [18.3, G.guard], [18.45, G.smashUp], [18.62, G.smashUp], [18.8, G.smashDown], [19.2, G.smashDown], [19.5, G.guard], [19.78, G.guard],
  [19.85, G.hit], [20.1, G.fly], [20.4, G.hit], [20.75, G.sit], [END, G.sit]];

const IMPACTS = [  // [τ, x, y, z, kind]: 1 hit · 2 big hit · 3 body slam · 4 block (small)
  [6.3, -1.0, 1.72, 0.05, 1], [6.55, -1.0, 1.72, 0.0, 1], [6.86, -1.05, 1.72, 0.05, 2], [7.35, -1.9, 0.2, 0.4, 3],
  [8.12, 0.75, 1.5, -0.2, 4], [8.45, 1.0, 0.25, -0.2, 1], [8.95, 1.6, 0.2, -0.25, 3],
  [10.2, 2.1, 0.1, 1.2, 3], [10.86, 0.8, 1.6, 0.48, 2], [11.6, 3.4, 0.2, 2.2, 3],
  [13.5, -1.15, 1.15, -0.38, 1], [14.0, 1.1, 1.6, -0.55, 2], [14.6, 5.2, 0.3, -1.0, 3], [15.35, 1.6, 0.25, 0.7, 2],
  [17.25, 0, 1.6, -0.25, 4], [17.75, 0, 1.6, 0.1, 4], [17.98, 0, 2.15, -1.2, 1], [18.16, 0, 2.15, -1.2, 1], [18.8, 0, 0.1, -0.35, 3],
  [19.82, 0, 1.85, -1.2, 2], [20.3, 0, 1.8, -5.95, 3],
];
const T_CRACK = 20.3;

/* ───────────── scene ───────────── */
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 21; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const portrait = height > width;
  camera.fov = portrait ? 55 : 38; camera.far = 300; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.3;
  scene.fog = new THREE.Fog(0x07080d, 14, 40);

  /* lights */
  scene.add(new THREE.HemisphereLight(0x5a6c9a, 0x16161e, 1.6));
  const lamp = new THREE.SpotLight(0xffd7a0, 55, 22, 0.8, 0.6, 1.4);
  lamp.position.set(-1.5, 6.5, 3.5); lamp.target.position.set(0, 0, -1.5); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0005;
  scene.add(lamp, lamp.target);
  const rim = new THREE.DirectionalLight(0x6fd8ff, 0.9); rim.position.set(4, 5, -6); scene.add(rim);
  const pinkL = new THREE.PointLight(0xff2fd0, 0, 14, 1.4); pinkL.position.set(0, 4.2, -5.6); scene.add(pinkL);
  const cyanL = new THREE.PointLight(0x2fd9ff, 5, 10, 1.6); cyanL.position.set(-6.2, 3.2, -2.5); scene.add(cyanL);
  const redL = new THREE.PointLight(0xff3a3a, 4, 9, 1.6); redL.position.set(6.4, 2.6, 1.5); scene.add(redL);
  const trophySpot = new THREE.SpotLight(0xffe2a0, 30, 8, 0.32, 0.5, 1.2);
  trophySpot.position.set(TROPHY_POS[0] + 0.4, 4.2, TROPHY_POS[2] + 1.2); trophySpot.target.position.set(...TROPHY_POS); scene.add(trophySpot, trophySpot.target);

  /* alley */
  const tex = (w, h, draw, rx, ry) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };
  const asphalt = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#1b1d24'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { const v = 20 + rnd() * 30; g.fillStyle = `rgb(${v},${v},${v + 6})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(8,10,16,.55)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 30 + rnd() * 70, 14 + rnd() * 30, rnd() * 3, 0, 7); g.fill(); }
  }, 6, 6);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.32, metalness: 0.15 }));
  ground.rotation.x = -PI / 2; ground.receiveShadow = true; scene.add(ground);
  const brick = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#2a1d1c'; g.fillRect(0, 0, w, h);
    const bw = 64, bh = 26;
    for (let y = 0; y < h; y += bh) for (let x = -bw; x < w; x += bw) { const v = 70 + rnd() * 40; g.fillStyle = `rgb(${v},${v * 0.48},${v * 0.42})`; g.fillRect(x + ((y / bh) % 2 ? bw / 2 : 0) + 2, y + 2, bw - 4, bh - 4); }
  }, 4, 3);
  const wallMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 });
  const wall = (w, h, p, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(...p); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); };
  wall(16, 12, [0, 6, -6.4], 0); wall(18, 12, [-7, 6, 1.5], PI / 2); wall(18, 12, [7, 6, 1.5], -PI / 2);
  const dark = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.6 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.85 });
  [[-6.1, 0.45, 0.9, 0.9], [-6.2, 1.35, 1.0, 0.9], [-5.9, 0.4, 2.0, 0.8], [TROPHY_POS[0], 0.45, TROPHY_POS[2], 0.9]].forEach(([x, y, z, s]) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(s, s, s, 2, 0.04), crateMat); m.position.set(x, y, z); m.rotation.y = rnd() * 0.3; m.castShadow = m.receiveShadow = true; scene.add(m); });
  const binMat = new THREE.MeshStandardMaterial({ color: 0x2d4a3a, roughness: 0.5, metalness: 0.4 });
  [[6.2, -0.9], [6.3, 0.2]].forEach(([x, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.0, 16), binMat); m.position.set(x, 0.5, z); m.castShadow = true; scene.add(m); });
  const dumpster = new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.3, 2.4, 2, 0.05), new THREE.MeshStandardMaterial({ color: 0x1f3d63, roughness: 0.5, metalness: 0.3 }));
  dumpster.position.set(6.2, 0.65, 3.6); dumpster.castShadow = true; scene.add(dumpster);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.4, metalness: 0.6 }));
  door.position.set(3.2, 1.2, -6.38); scene.add(door);
  for (const [x, z] of [[-6.95, -3], [6.95, -4]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 12, 8), dark); p.position.set(x, 6, z); scene.add(p); }
  { const fe = new THREE.Group(); fe.position.set(-6.4, 3.4, -2.5); scene.add(fe);
    fe.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 3.2), dark));
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), dark); b.position.set(0.58, 0.45, -1.5 + i * 0.37); fe.add(b); } }
  // wall crack where the boss lands
  const crack = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.strokeStyle = 'rgba(10,6,6,0.95)'; g.lineCap = 'round';
    for (let k = 0; k < 11; k++) { let x = 256, y = 256, a = k / 11 * TAU2 + rnd() * 0.4; g.lineWidth = 9; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 9; s++) { a += (rnd() - 0.5) * 0.9; x += Math.cos(a) * 26; y += Math.sin(a) * 26; g.lineTo(x, y); g.lineWidth = Math.max(2, 9 - s); } g.stroke(); }
    g.fillStyle = 'rgba(10,6,6,0.85)'; g.beginPath(); g.arc(256, 256, 40, 0, 7); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const crackMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: crack, transparent: true, opacity: 0, depthWrite: false }));
  crackMesh.position.set(0, 1.9, -6.37); scene.add(crackMesh);

  /* fonts */
  const fTitle = new FontFace('Title', `url(${asset('Fruktur.ttf')})`), fTag = new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`);
  await Promise.all([fTitle.load(), fTag.load()]); document.fonts.add(fTitle); document.fonts.add(fTag);

  /* neon title sign */
  function neonCanvas(lines, w, h, colour, glow, size, core = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.font = `${size}px Title`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = Math.min(1, (w * 0.9) / Math.max(...lines.map(l => g.measureText(l).width)));
    lines.forEach((line, k) => { g.save(); g.translate(w / 2, h * (k + 0.5) / lines.length); g.scale(fit, fit);
      for (const [blur, lw, col] of [[60, 18, glow], [30, 12, glow], [0, 7, colour]]) { g.shadowColor = glow; g.shadowBlur = blur; g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = col; g.strokeText(line, 0, 0); }
      if (core) { g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.strokeText(line, 0, 0); } g.restore(); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const signLines = portrait ? ['elvladislavo', '.com'] : ['elvladislavo.com'];
  const signW = portrait ? 5.6 : 7.5, signH = signW * (portrait ? 0.55 : 0.22), cH = Math.round(2048 * signH / signW);
  const signOff = new THREE.MeshBasicMaterial({ map: neonCanvas(signLines, 2048, cH, '#1c1218', 'rgba(0,0,0,0)', 300, false), transparent: true, depthWrite: false, opacity: 0.45 });
  const signOn = new THREE.MeshBasicMaterial({ map: neonCanvas(signLines, 2048, cH, '#ffd6f6', '#ff2fd0', 300), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  const signGeo = new THREE.PlaneGeometry(signW, signH);
  const signBase = new THREE.Mesh(signGeo, signOff), sign = new THREE.Mesh(signGeo, signOn);
  signBase.position.set(0, 4.3, -6.34); sign.position.set(0, 4.3, -6.33); scene.add(signBase, sign);
  const backing = new THREE.Mesh(new RoundedBoxGeometry(signW + 0.3, signH + 0.25, 0.08, 2, 0.04), new THREE.MeshStandardMaterial({ color: 0x101015, roughness: 0.4, metalness: 0.5 }));
  backing.position.set(0, 4.3, -6.38); scene.add(backing);

  /* tags over heads: active (red, warning) / beaten (grey, struck through, green tick) / trophy (gold) */
  function tagTexture(text, style) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 220; const g = c.getContext('2d');
    g.font = '86px Tag'; const fs = Math.min(86, 86 * 760 / g.measureText(text).width); g.font = `${fs}px Tag`;
    const tw = g.measureText(text).width, w = Math.min(1000, tw + 210), x0 = (1024 - w) / 2;
    const body = { active: '#d4262c', beaten: '#3a3d44', gold: '#d9a521' }[style], edge = { active: '#7a0c10', beaten: '#1d1f24', gold: '#6b4a06' }[style];
    g.fillStyle = edge; g.beginPath(); g.roundRect(x0, 20, w, 180, 34); g.fill();
    g.fillStyle = body; g.beginPath(); g.roundRect(x0 + 8, 26, w - 16, 166, 28); g.fill();
    const ix = x0 + 90, iy = 110;
    if (style === 'active') {                     // warning triangle
      g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(ix, iy - 52); g.lineTo(ix + 52, iy + 42); g.lineTo(ix - 52, iy + 42); g.closePath(); g.fill();
      g.fillStyle = '#1a1a1a'; g.fillRect(ix - 6, iy - 22, 12, 38); g.fillRect(ix - 6, iy + 22, 12, 12);
    } else if (style === 'beaten') {              // green tick
      g.fillStyle = '#21b35a'; g.beginPath(); g.arc(ix, iy, 50, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 15; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(ix - 24, iy + 2); g.lineTo(ix - 6, iy + 22); g.lineTo(ix + 26, iy - 18); g.stroke();
    } else {                                      // little cup
      g.fillStyle = '#fff4c8'; g.beginPath(); g.moveTo(ix - 34, iy - 42); g.lineTo(ix + 34, iy - 42); g.quadraticCurveTo(ix + 30, iy + 6, ix, iy + 10); g.quadraticCurveTo(ix - 30, iy + 6, ix - 34, iy - 42); g.fill();
      g.fillRect(ix - 6, iy + 8, 12, 22); g.fillRect(ix - 24, iy + 30, 48, 12);
    }
    g.font = `${fs}px Tag`; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = style === 'beaten' ? '#9aa0aa' : style === 'gold' ? '#2a1a00' : '#ffffff';
    g.fillText(text, x0 + 160, 112);
    if (style === 'beaten') { g.strokeStyle = '#e8e8e8'; g.lineWidth = 9; g.beginPath(); g.moveTo(x0 + 150, 114); g.lineTo(x0 + 170 + tw, 108); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const mkSprite = (texture, w) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, opacity: 0 }));
    s.renderOrder = 10; s.userData.w = w; s.scale.set(w, w * 220 / 1024, 1); scene.add(s); return s; };

  /* characters */
  const hero = buildStickman({ seed: 7 }); scene.add(hero.system);
  const makeGoon = (seedN, hoodie, accent, scale = 1) => {
    const g = buildStickman({ seed: seedN }), M = g.M, toonMat = c => new THREE.MeshToonMaterial({ color: c, gradientMap: g.ramp });
    const hood = toonMat(hoodie), maskM = toonMat(0x111114), trou = toonMat(0x22242a), shoe = toonMat(0xe8e8e8), acc = toonMat(accent);
    g.system.traverse(o => {
      if (!o.isMesh || o.material === g.outlineMat) return;
      const m = o.material;
      if (m === M.blazer || m === M.shirt || m === M.belt || m === M.buckle) o.material = hood;
      else if (m === M.tie || m === M.tieKnot || m === M.hair || m === M.hairLight || m === M.beard) o.visible = false;
      else if (m === M.trousers) o.material = trou;
      else if (m === M.stripe) o.material = acc;
      else if (m === M.shoe || m === M.sole) o.material = shoe;
      else if (m === M.skin && o.parent === g.J.head) o.material = maskM;
    });
    const hoodMesh = new THREE.Mesh(new THREE.SphereGeometry(0.175, 20, 14, 0, PI * 2, 0, PI * 0.62), hood); hoodMesh.position.set(0, 0.16, -0.02); hoodMesh.rotation.x = -0.35;
    hoodMesh.add(new THREE.Mesh(hoodMesh.geometry, g.outlineMat)); g.J.head.add(hoodMesh);
    for (const sx of [1, -1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(sx * 0.05, 0.18, 0.148); g.J.head.add(e); }
    g.system.scale.setScalar(scale); g.scale = scale;
    scene.add(g.system); return g;
  };
  const goons = [
    { g: makeGoon(31, 0x4a4f5c, 0x8fd14f), T: G1, K: G1_KEYS, label: 'Wolne ładowanie', show: 2.95, beat: 7.0, fight: [4.6, 7.3] },
    { g: makeGoon(37, 0x3f4650, 0xffffff), T: G2, K: G2_KEYS, label: 'Brak responsywności', show: 3.95, beat: 8.6, fight: [7.3, 9.4] },
    { g: makeGoon(43, 0x5b3c4a, 0xff61d8), T: G3, K: G3_KEYS, label: 'Wyskakujące okienka', show: 9.62, beat: 11.0, fight: [9.4, 11.8] },
    { g: makeGoon(51, 0x3c4a5b, 0x2fd9ff), T: G4, K: G4_KEYS, label: 'Błąd 404', show: 3.15, beat: 15.35, fight: [11.8, 15.6] },
    { g: makeGoon(47, 0x5b4a3c, 0xffc23d), T: G5, K: G5_KEYS, label: 'Słabe SEO', show: 4.15, beat: 14.2, fight: [11.8, 15.6] },
    { g: makeGoon(59, 0x2b2b31, 0xff3a3a, BOSS_S), T: G6, K: G6_KEYS, label: 'Przestarzały design', show: 3.6, beat: 20.3, fight: [15.6, 20.8] },
  ];
  goons.forEach(o => { o.active = mkSprite(tagTexture(o.label, 'active'), 1.05); o.beaten = mkSprite(tagTexture(o.label, 'beaten'), 1.05); });
  { const gB = goons[4].g; // the bat
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.018, 0.85, 12), new THREE.MeshToonMaterial({ color: 0x9a6a3c, gradientMap: gB.ramp }));
    bat.add(new THREE.Mesh(bat.geometry, gB.outlineMat)); bat.position.set(0, -0.3, 0.38); bat.rotation.x = PI / 2 + 0.2; gB.J.elbowR.add(bat); }

  /* the trophy: gold cup with handles on a black base; engraved plate "TWOJA STRONA" */
  const trophy = new THREE.Group(); scene.add(trophy);
  {
    const gold = new THREE.MeshToonMaterial({ color: 0xf0bf3a, gradientMap: hero.ramp, emissive: 0x3a2400 });
    const black = new THREE.MeshToonMaterial({ color: 0x141416, gradientMap: hero.ramp });
    const ink = hero.outlineMat;
    const add = (geo, mat, p, r) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (r) m.rotation.set(...r); m.castShadow = true; m.add(new THREE.Mesh(geo, ink)); trophy.add(m); return m; };
    add(new RoundedBoxGeometry(0.24, 0.1, 0.18, 2, 0.015), black, [0, 0.05, 0]);
    add(new THREE.CylinderGeometry(0.035, 0.06, 0.1, 16), gold, [0, 0.15, 0]);
    add(new THREE.LatheGeometry([[0.0, 0], [0.05, 0.005], [0.03, 0.03], [0.08, 0.1], [0.12, 0.2], [0.13, 0.26], [0.125, 0.27]].map(([x, y]) => new THREE.Vector2(x, y)), 28), gold, [0, 0.2, 0]);
    for (const sx of [1, -1]) add(new THREE.TorusGeometry(0.06, 0.014, 8, 18, PI * 1.1), gold, [sx * 0.135, 0.36, 0], [0, 0, sx > 0 ? -PI * 0.55 : PI * 0.55 + PI * 0.1]);
    const pc = document.createElement('canvas'); pc.width = 512; pc.height = 128; const g = pc.getContext('2d');
    g.fillStyle = '#e6c25a'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#7a5410'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
    g.fillStyle = '#3a2400'; g.font = '62px Tag'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TWOJA STRONA', 256, 68);
    const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.052), new THREE.MeshBasicMaterial({ map: pt })); plate.position.set(0, 0.05, 0.0915); trophy.add(plate);
  }
  trophy.scale.setScalar(1.5);
  const trophyTag = mkSprite(tagTexture('TWOJA STRONA', 'gold'), 1.15);
  const gleam = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.translate(64, 64);
    g.fillStyle = '#fff'; for (const a of [0, PI / 2]) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 60, 5, 0, 0, 7); g.fill(); g.restore(); }
    const t = new THREE.CanvasTexture(c); return t; })(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  scene.add(gleam);

  // keep a tag the same size on screen (fraction of frame width) and nudge it inside the frame
  const hTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (width / height);
  function fitTag(sprite, pos, frac, aspect = 220 / 1024, popScale = 1) {
    const d = Math.max(0.5, pos.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3())));
    const w = frac * 2 * d * hTan * popScale;
    sprite.scale.set(Math.max(1e-3, w), Math.max(1e-3, w) * aspect, 1);
    const v = pos.clone().project(camera), lim = Math.max(0, 1 - frac * popScale * 0.97 - 0.02), raw = v.x;
    v.x = Math.max(-lim, Math.min(lim, v.x)); v.y = Math.min(0.93, v.y);
    sprite.position.copy(v.unproject(camera));
    return 1 - sm(1.0, 1.2, Math.abs(raw));            // fade out tags whose owner is out of shot
  }
  const place = (ch, T, keys, tau) => {
    ch.system.position.set(key(tau, T.x), key(tau, T.y) * (ch.scale || 1), key(tau, T.z));
    ch.system.rotation.set(0, key(tau, T.yaw), 0);
    ch.body.rotation.set(key(tau, T.pitch), 0, key(tau, T.roll));
    ch.applyPose(keys, tau); ch.system.updateMatrixWorld(true);
  };

  /* particles */
  const uScale = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  function pointSystem(N, blending) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute('color4', new THREE.BufferAttribute(new Float32Array(N * 4), 4));
    const mat = new THREE.ShaderMaterial({ uniforms: { uScale: { value: uScale } }, transparent: true, depthWrite: false, blending,
      vertexShader: `attribute float size; attribute vec4 color4; varying vec4 vC; uniform float uScale;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(size * uScale / max(-mv.z, 0.1), 700.0); gl_Position = projectionMatrix * mv; vC = color4; }`,
      fragmentShader: `varying vec4 vC; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, r); a *= a; if (a < 0.003) discard; gl_FragColor = vec4(vC.rgb, vC.a * a); }` });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
    return { N, n: 0, pos: g.attributes.position, size: g.attributes.size, col: g.attributes.color4 };
  }
  const SPARK = pointSystem(2400, THREE.AdditiveBlending), DUST = pointSystem(1800, THREE.NormalBlending);
  const emit = (S, x, y, z, s, r, g, b, a) => { if (S.n >= S.N) return; const i = S.n++; S.pos.setXYZ(i, x, y, z); S.size.setX(i, s); S.col.setXYZW(i, r, g, b, a); };
  const RR = Array.from({ length: 5000 }, () => [rnd(), rnd(), rnd(), rnd(), rnd()]);
  const burstTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,230,180,.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2, r = i % 2 ? 40 : 128; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const bursts = IMPACTS.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: burstTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, toneMapped: false })); scene.add(s); return s; });
  const DROPS = 2200, rainBase = Array.from({ length: DROPS }, () => [rnd() * 18 - 9, rnd() * 10, rnd() * 18 - 9, 0.8 + rnd() * 0.4]);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DROPS * 6), 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9fb8e0, transparent: true, opacity: 0.38 })); rain.frustumCulled = false; scene.add(rain);

  /* post */
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.45, 0.96));
  const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, flash: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float flash; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float vig = 1.0 - 0.9 * dot(d, d); gl_FragColor = vec4(mix(c.rgb * vig, vec3(1.0, 0.97, 0.92), flash), c.a); }` });
  composer.addPass(grade); composer.addPass(new OutputPass());

  /* camera */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const shoe = V(0, 0, 0), head = V(0, 0, 0), heroCom = V(0, 0, 0), g3c = V(0, 0, 0), trophyW = V(0, 0, 0);
  const SHOTS = [
    [0, 3.0, tau => { const u = E.inOutCubic(range(tau, 0.1, 2.1)); const look = shoe.clone().lerp(head, u);
      return { pos: look.clone().add(V(lerp(0.55, 0.75, u), lerp(0.08, 0.05, u), lerp(0.75, 1.25, u))), look }; }],
    [3.0, 4.6, tau => { const u = E.inOutCubic(range(tau, 2.9, 4.5));          // pan left → right across the gang
      return { pos: V(lerp(-0.8, 0.8, u), 1.9, 5.6), look: V(lerp(-4.4, 4.4, u), 1.15, lerp(0.2, -2.0, u)) }; }],
    [4.6, 7.3, tau => ({ pos: V(lerp(-0.4, -0.9, range(tau, 4.6, 7.3)), 1.3, 3.4), look: V(lerp(-0.9, -1.5, E.inOutCubic(range(tau, 6.7, 7.3))), 1.15, 0.1) })],
    [7.3, 9.4, tau => ({ pos: V(lerp(0.8, 1.3, range(tau, 7.3, 9.4)), 0.95, 3.4), look: V(lerp(0.7, 1.2, range(tau, 7.3, 9.4)), 0.85, -0.2) })],
    [9.4, 11.8, tau => { const k = E.inOutCubic(range(tau, 9.4, 10.3)); const l = V(lerp(4.6, 1.6, k), 1.2, lerp(2.4, 0.9, k)).lerp(g3c, 0.35);
      return { pos: V(lerp(2.6, 1.8, k), 1.35, lerp(6.2, 4.4, k)), look: l }; }],
    [11.8, 15.6, tau => ({ pos: V(lerp(0.0, 0.5, range(tau, 11.8, 15.6)), 1.75, 4.9), look: V(lerp(0, 0.4, E.inOutCubic(range(tau, 14.7, 15.4))), 1.0, -0.3) })],
    [15.6, 19.0, tau => ({ pos: V(lerp(2.6, 2.0, range(tau, 15.6, 19)), lerp(1.4, 1.25, range(tau, 15.6, 19)), lerp(3.4, 4.2, range(tau, 15.6, 19))), look: V(0, 1.4, lerp(-1.6, -0.6, range(tau, 15.6, 17))) })],
    [19.0, 20.9, tau => ({ pos: V(5.0, 1.35, lerp(0.6, -2.6, E.inOutCubic(range(tau, 19.3, 20.4)))), look: V(0, lerp(1.4, 1.1, range(tau, 20.2, 20.9)), lerp(0.8, -4.6, E.inOutCubic(range(tau, 19.35, 20.35)))) })],
    [20.9, 24.9, tau => { const u = E.inOutCubic(range(tau, 23.4, 24.6));
      return { pos: heroCom.clone().add(V(lerp(2.2, 0.8, u), lerp(0.4, -0.3, u), lerp(3.0, 2.6, u))), look: heroCom.clone().add(V(0, lerp(0.2, 1.4, u), 0)) }; }],
    [24.9, END, tau => { const u = E.inOutQuad(range(tau, 24.9, 28.2)), f = E.inOutCubic(range(tau, 27.2, 28.3));
      const follow = { pos: heroCom.clone().add(V(lerp(0.9, 0.3, u), 0.55, lerp(2.6, 3.2, u))), look: heroCom.clone().add(V(0, 0.95, 0)) };
      const fin = { pos: V(0.1, 1.55, 6.9), look: V(-0.3, 2.35, -1.5) };
      return { pos: follow.pos.lerp(fin.pos, f), look: follow.look.lerp(fin.look, f) }; }],
  ];
  const BLEND = 0.12;

  return {
    update(t) {
      const tau = tauAt(t);
      place(hero, HERO, HERO_KEYS, tau);
      goons.forEach(o => place(o.g, o.T, o.K, tau));
      hero.shoe('L', shoe); hero.J.head.localToWorld(head.set(0, 0.17, 0.05)); heroCom.set(0, 1, 0).applyMatrix4(hero.system.matrixWorld);
      goons[2].g.body.getWorldPosition(g3c);

      /* trophy: on its crate → into his right hand (lerped) → held high */
      const hold = sm(T_PICK, T_HOLD, tau);
      const handM = new THREE.Matrix4().compose(V(0, -0.36, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(PI, 0, 0)), V(1, 1, 1)).premultiply(hero.J.elbowR.matrixWorld);
      const hp = V(0, 0, 0), hq = new THREE.Quaternion(), hs = V(0, 0, 0); handM.decompose(hp, hq, hs);
      trophy.position.set(...TROPHY_POS).lerp(hp, hold);
      trophy.quaternion.identity().slerp(hq, hold);
      trophy.updateMatrixWorld(true); trophy.localToWorld(trophyW.set(0, 0.32, 0));
      trophyTag.material.opacity = sm(20.9, 21.4, tau);
      const pop = 1 + 0.25 * Math.exp(-6 * Math.max(0, tau - 20.9)) * Math.sin(Math.max(0, tau - 20.9) * 14);
      const trophyTagUpdate = () => fitTag(trophyTag, trophyW.clone().add(V(0, 0.55, 0)), 0.7, 220 / 1024, pop);
      gleam.position.copy(trophyW).add(V(0.12, 0.15, 0.1)); gleam.material.opacity = 0.9 * Math.max(0, Math.sin(tau * 2.2)) ** 8 * sm(20.9, 21.5, tau);
      gleam.scale.setScalar(0.35 + 0.15 * Math.sin(tau * 9));

      const tagUpdate = () => goons.forEach(o => {
        const hw = o.g.J.head.localToWorld(V(0, 0.17, 0)), up = 0.62 * (o.g.scale || 1);
        const lying = o.g.system.position.y < -0.4;
        const p = hw.add(V(0, lying ? 0.55 : up, 0));
        const inA = sm(o.show, o.show + 0.25, tau), out = sm(o.beat, o.beat + 0.12, tau);
        const popIn = 1 + 0.3 * Math.exp(-7 * Math.max(0, tau - o.show)) * Math.sin(Math.max(0, tau - o.show) * 16) * (tau > o.show ? 1 : 0);
        const popB = 1 + 0.35 * Math.exp(-7 * Math.max(0, tau - o.beat)) * Math.sin(Math.max(0, tau - o.beat) * 16) * (tau > o.beat ? 1 : 0);
        const focus = o.fight[0] - 0.3 <= tau && tau <= o.fight[1] ? 1 : 0, big = lerp(0.42, 0.66, focus);
        const vis = fitTag(o.active, p, big, 220 / 1024, inA * popIn), visB = fitTag(o.beaten, p, 0.4, 220 / 1024, popB * (0.6 + 0.4 * out));
        o.active.material.opacity = inA * (1 - out) * vis * lerp(0.8, 1, focus); o.beaten.material.opacity = out * visB * 0.9;
      });

      /* neon sign + wall crack */
      const on = tau < T_SIGN ? 0 : tau > T_SIGN + 0.75 ? 1 : [0, 1, 0, 0, 1, 1, 0, 1, 1, 0.4, 1, 1][Math.floor((tau - T_SIGN) / 0.0625)] ?? 1;
      signOn.opacity = on; pinkL.intensity = 9 * on; signOn.color.setScalar(1 + 0.05 * Math.sin(tau * 40) * on);
      crackMesh.material.opacity = sm(T_CRACK, T_CRACK + 0.05, tau);

      /* rain (scene time, so it hangs in the slow-mo) */
      const ra = rainGeo.attributes.position.array, focus = camera.position;
      for (let i = 0; i < DROPS; i++) {
        const [bx, by, bz, sp] = rainBase[i];
        const x = focus.x + ((bx - focus.x) % 18 + 27) % 18 - 9, z = focus.z - 4 + ((bz - focus.z + 4) % 18 + 27) % 18 - 9, y = ((by - tau * 9 * sp) % 10 + 10) % 10;
        ra.set([x, y, z, x + 0.02, y + 0.32, z], i * 6);
      }
      rainGeo.attributes.position.needsUpdate = true;

      /* impacts */
      SPARK.n = DUST.n = 0; let shake = 0, flash = 0;
      IMPACTS.forEach(([it, ix, iy, iz, kind], n) => {
        const u = tau - it, b = bursts[n];
        b.material.opacity = u < 0 || u > 0.16 ? 0 : (1 - u / 0.16) * (kind === 3 ? 0.4 : kind === 4 ? 0.6 : 1);
        b.position.set(ix, iy, iz); b.scale.setScalar((kind === 2 ? 1.5 : kind === 1 ? 0.85 : 0.55) * (0.5 + 3 * Math.max(0, u)));
        if (u >= 0 && u < 0.5) { shake = Math.max(shake, (kind === 2 ? 0.16 : kind === 3 ? 0.1 : 0.06) * Math.exp(-9 * u)); if (kind === 1 || kind === 2) flash = Math.max(flash, (kind === 2 ? 0.18 : 0.1) * Math.exp(-30 * u)); }
        if (u < 0 || u > 1.6) return;
        if (kind !== 3) for (let i = 0; i < (kind === 4 ? 25 : 60); i++) {
          const r = RR[(n * 140 + i) % 5000], L = 0.25 + r[0] * 0.35; if (u > L) continue;
          const th = r[1] * PI * 2, ph = Math.acos(2 * r[2] - 1), s = 3 + r[3] * 6;
          emit(SPARK, ix + Math.sin(ph) * Math.cos(th) * s * u, iy + Math.cos(ph) * s * u - 4.9 * u * u, iz + Math.sin(ph) * Math.sin(th) * s * u, 0.05 + 0.05 * r[4], 1.6, 1.15, 0.6, 1 - u / L);
        }
        const nD = kind === 3 ? 34 : 10;
        for (let i = 0; i < nD; i++) {
          const r = RR[(2500 + n * 100 + i) % 5000], L = 0.8 + r[0] * 0.8; if (u > L) continue;
          const th = r[1] * PI * 2, s = kind === 3 ? 1.2 + r[2] * 2.2 : 0.6 + r[2], k = u / L, d = s * (1 - Math.exp(-4 * u)) / 2;
          emit(DUST, ix + Math.cos(th) * d, (kind === 3 ? 0.05 : iy - 0.2) + r[3] * 0.9 * (1 - Math.exp(-3 * u)), iz + Math.sin(th) * d, 0.15 + 0.5 * k, 0.55, 0.62, 0.75, 0.28 * (1 - k));
        }
      });
      for (const S of [SPARK, DUST]) { for (let i = S.n; i < S.N; i++) S.size.setX(i, 0); S.pos.needsUpdate = S.size.needsUpdate = S.col.needsUpdate = true; }
      grade.uniforms.flash.value = flash;

      /* camera */
      let pos = null, look = null, wsum = 0;
      SHOTS.forEach(([a, b, f], i) => {
        if (tau < a - BLEND || tau > b + BLEND) return;
        const w = (i === 0 ? 1 : sm(a - BLEND, a + BLEND, tau)) * (i === SHOTS.length - 1 ? 1 : 1 - sm(b - BLEND, b + BLEND, tau));
        if (w <= 0) return; const s = f(tau);
        if (!pos) { pos = s.pos.multiplyScalar(w); look = s.look.multiplyScalar(w); } else { pos.addScaledVector(s.pos, w); look.addScaledVector(s.look, w); }
        wsum += w;
      });
      pos.multiplyScalar(1 / wsum); look.multiplyScalar(1 / wsum);
      pos.x += wiggle(t, 14, 1) * shake + wiggle(t, 0.45, 3) * 0.025; pos.y += wiggle(t, 17, 2) * shake + wiggle(t, 0.35, 5) * 0.02;
      camera.position.copy(pos); camera.lookAt(look); camera.updateMatrixWorld(true);
      tagUpdate(); trophyTagUpdate();
    },
    render() { composer.render(); },
  };
}
