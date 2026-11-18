// BRIEF: Fight scene with the elvladislavo character. Rainy neon alley at night. Three masked thugs
// close in; he blocks and counters a punch, ducks a bat and lands a spinning roundhouse, flattens
// the third with a slow-motion flying kick into the wall, then throws the first one (back for more)
// over his shoulder. He fixes his tie, and a neon "elvladislavo.com" sign flickers on above him.
//
// SHOT PLAN (scene time τ; real time is slower around the flying kick)
//   0.0–2.3 crane up from the snakeskin shoes, tie adjust · 2.0–3.0 thugs close in
//   3.0–4.4 A: block → right cross → A into the crates · 4.0–5.7 B: bat swing, duck, roundhouse
//   5.1–7.2 C charges · flying kick, slow motion · C into the wall · 7.2–8.9 A again: grab, shoulder throw
//   8.9–10.4 tie, hair flick · 10.4–end neon sign flickers on, camera rises to it, hold
//
// Render: node .claude/skills/text-to-3d-motion/scripts/render.mjs motion/stickman-fight/scene.js --width 1080 --height 1920 --out fight.mp4
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease, key, range, wiggle } from '/lib/motion.js';
import { buildStickman, JOINTS } from '/assets/stickman.js';

const PI = Math.PI, lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const E = ease;

/* ───────────── time remap: slow motion around the flying kick ───────────── */
const TAU_END = 14.6;
const rate = tau => 1 - 0.74 * sm(5.85, 6.05, tau) * (1 - sm(6.3, 6.55, tau));
const REMAP = (() => { const out = [0]; let tau = 0, dt = 1 / 600; while (tau < TAU_END + 0.5) { tau += rate(tau) * dt; out.push(tau); } return { out, dt }; })();
const tauAt = t => { const f = t / REMAP.dt, i = Math.min(REMAP.out.length - 2, Math.floor(f)); return lerp(REMAP.out[i], REMAP.out[i + 1], f - i); };
const REAL_END = REMAP.out.findIndex(v => v >= TAU_END) * REMAP.dt;
export const meta = { duration: Math.round(REAL_END * 10) / 10, fps: 30, background: '#07080d' };

/* ───────────── choreography ───────────── */
// root tracks: x, z (ground position), y (feet height; -0.86 = lying), yaw (0 faces +z), pitch, roll
const HERO = {
  x: [[0, 0]], z: [[0, 0], [5.85, 0], [6.3, -0.95, E.outCubic], [6.6, -1.0]],
  y: [[0, 0], [5.85, 0], [6.05, 0.78, E.outQuad], [6.3, 0.62], [6.6, 0, E.inQuad]],
  yaw: [[0, 0], [3.0, 0], [3.25, -PI / 2], [4.0, -PI / 2], [4.2, PI / 2], [4.66, PI / 2], [5.08, PI / 2 + 2 * PI, E.inOutCubic],
    [5.35, 5 * PI / 2], [5.6, 3 * PI], [7.45, 3 * PI], [7.75, 3.5 * PI], [9.0, 3.5 * PI], [9.4, 4 * PI]],
  pitch: [[0, 0]], roll: [[0, 0]],
};
const A = {        // left thug — punched into the crates, gets up, thrown
  x: [[0, -6.5], [2.0, -6.5], [3.0, -2.6, E.outCubic], [3.25, -2.6], [3.45, -1.1, E.inOutQuad], [3.78, -1.1], [4.3, -4.3, E.outCubic], [6.9, -4.3], [7.45, -4.2], [8.0, -0.85, E.inOutQuad], [8.15, -0.85], [8.62, 1.5, E.inOutCubic]],
  z: [[0, 0.6], [3.2, 0.4], [3.45, 0], [3.78, 0], [4.3, 0.4], [7.45, 0.4], [8.0, -1.0], [8.62, -1.0]],
  y: [[0, 0], [3.78, 0], [4.0, 0.45, E.outQuad], [4.3, -0.86, E.inQuad], [6.9, -0.86], [7.4, 0], [8.15, 0], [8.38, 1.05, E.outQuad], [8.62, -0.86, E.inQuad]],
  yaw: [[0, PI / 2]], roll: [[0, 0]],
  pitch: [[0, 0], [3.78, 0], [4.0, -0.7], [4.3, -PI / 2], [6.9, -PI / 2], [7.4, 0], [8.15, 0], [8.62, 1.5 * PI, E.inOutQuad]],
};
const B = {        // right thug with the bat — roundhoused into the bins
  x: [[0, 6.5], [2.0, 6.5], [3.0, 2.8, E.outCubic], [3.8, 2.8], [4.3, 1.25, E.inOutQuad], [5.0, 1.25], [5.6, 5.0, E.outCubic]],
  z: [[0, 0.3], [3.0, 0.2], [4.3, 0], [5.6, -0.4]],
  y: [[0, 0], [5.0, 0], [5.25, 0.75, E.outQuad], [5.6, -0.86, E.inQuad]],
  yaw: [[0, -PI / 2], [5.0, -PI / 2], [5.6, -PI / 2 - 1.3]], roll: [[0, 0], [5.0, 0], [5.3, 0.5], [5.6, 0]],
  pitch: [[0, 0], [5.0, 0], [5.6, -PI / 2]],
};
const C = {        // back thug — flying kick into the wall, slides down
  x: [[0, 0]], z: [[0, -6.5], [2.0, -6.5], [3.0, -3.4, E.outCubic], [5.1, -3.4], [5.95, -1.6, E.inOutQuad], [6.15, -1.6], [6.6, -5.72, E.outCubic]],
  y: [[0, 0], [6.15, 0], [6.35, 0.8, E.outQuad], [6.6, 0.6], [6.75, 0.6], [7.05, 0, E.inQuad]],
  yaw: [[0, 0]], roll: [[0, 0]],
  pitch: [[0, 0], [6.15, 0], [6.4, -0.9], [6.6, -0.5], [7.05, -0.28]],
};

/* ───────────── poses ───────────── */
const walkCycle = (t, f = 1.8, s = 0.5) => {
  const p = t * 2 * PI * f, q = Math.sin(p);
  return { hipsY: 0.94 + 0.02 * Math.abs(Math.cos(p)), hipL: [-s * q, 0, 0], hipR: [s * q, 0, 0], kneeL: [0.15 + 0.6 * Math.max(0, Math.sin(p - 1.2)), 0, 0], kneeR: [0.15 + 0.6 * Math.max(0, Math.sin(p + PI - 1.2)), 0, 0],
    shoulderL: [0.4 * q, 0, 0.12], shoulderR: [-0.4 * q, 0, -0.12], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0] };
};
const H = {
  stand: () => ({ shoulderL: [0, 0, 0.12], shoulderR: [0, 0, -0.12], elbowL: [-0.15, 0, 0], elbowR: [-0.15, 0, 0] }),
  tie: t => ({ head: [0.25, 0, 0.05 * Math.sin(t * 6)], shoulderL: [0, 0, 0.12], elbowL: [-0.15, 0, 0], shoulderR: [-1.05, 0, 0.42], elbowR: [-2.15, 0, 0], spine: [0.05, 0, 0] }),
  guard: t => { const b = 0.02 * Math.sin(t * 7);
    return { hipsY: 0.87 + b, spine: [0.15, -0.2, 0], head: [-0.15, 0.2, 0], hipL: [-0.4, 0, 0.18], hipR: [0.3, 0, -0.18], kneeL: [0.45, 0, 0], kneeR: [0.35, 0, 0],
      shoulderL: [-1.25, 0, 0.3], elbowL: [-1.95, 0, 0], shoulderR: [-0.85, 0, -0.25], elbowR: [-2.15, 0, 0] }; },
  block: () => ({ hipsY: 0.85, spine: [0.05, -0.2, 0], head: [-0.05, 0.2, 0], hipL: [-0.4, 0, 0.18], hipR: [0.35, 0, -0.18], kneeL: [0.5, 0, 0], kneeR: [0.4, 0, 0],
    shoulderL: [-2.0, 0, 0.35], elbowL: [-1.5, 0, 0], shoulderR: [-0.85, 0, -0.25], elbowR: [-2.15, 0, 0] }),
  punch: () => ({ hipsY: 0.84, spine: [0.22, 0.45, 0], head: [-0.2, -0.3, 0], hipL: [-0.5, 0, 0.18], hipR: [0.45, 0, -0.18], kneeL: [0.5, 0, 0], kneeR: [0.2, 0, 0],
    shoulderL: [-1.1, 0, 0.3], elbowL: [-2.0, 0, 0], shoulderR: [-1.62, 0, 0.1], elbowR: [-0.05, 0, 0] }),
  duck: () => ({ hipsY: 0.6, spine: [0.75, 0, 0], head: [-0.6, 0, 0], hipL: [-1.3, 0, 0.25], hipR: [-0.5, 0, -0.2], kneeL: [1.9, 0, 0], kneeR: [1.6, 0, 0],
    shoulderL: [-1.4, 0, 0.3], elbowL: [-1.9, 0, 0], shoulderR: [-1.2, 0, -0.3], elbowR: [-2.0, 0, 0] }),
  roundhouse: () => ({ hipsY: 0.9, spine: [-0.1, 0, 0.5], head: [0, 0, -0.4], hipL: [-0.1, 0, 0.05], kneeL: [0.3, 0, 0], hipR: [-0.3, 0, -1.55], kneeR: [0.15, 0, 0],
    shoulderL: [-0.3, 0, 1.1], elbowL: [-0.8, 0, 0], shoulderR: [-0.6, 0, -0.9], elbowR: [-1.2, 0, 0] }),
  jump: () => ({ hipsY: 0.68, spine: [0.5, 0, 0], head: [-0.45, 0, 0], hipL: [-1.1, 0, 0.1], hipR: [-1.0, 0, -0.1], kneeL: [1.7, 0, 0], kneeR: [1.6, 0, 0], shoulderL: [0.8, 0, 0.2], shoulderR: [0.8, 0, -0.2], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0] }),
  flyKick: () => ({ spine: [-0.3, 0, 0], head: [0.15, 0, 0], hipR: [-1.55, 0, -0.05], kneeR: [0.02, 0, 0], hipL: [-0.9, 0, 0.15], kneeL: [2.0, 0, 0],
    shoulderL: [0.7, 0, 0.6], elbowL: [-0.4, 0, 0], shoulderR: [0.9, 0, -0.5], elbowR: [-0.3, 0, 0] }),
  land: () => ({ hipsY: 0.62, spine: [0.55, 0, 0], head: [-0.5, 0, 0], hipL: [-1.3, 0, 0.3], hipR: [-0.2, 0, -0.35], kneeL: [1.9, 0, 0], kneeR: [1.4, 0, 0],
    shoulderL: [-0.4, 0, 0.9], elbowL: [-0.2, 0, 0], shoulderR: [-0.6, 0, -0.5], elbowR: [-0.9, 0, 0] }),
  grab: () => ({ hipsY: 0.86, spine: [0.3, 0, 0], head: [-0.25, 0, 0], hipL: [-0.5, 0, 0.2], hipR: [0.3, 0, -0.2], kneeL: [0.6, 0, 0], kneeR: [0.4, 0, 0],
    shoulderL: [-1.45, 0, 0.15], elbowL: [-0.5, 0, 0], shoulderR: [-1.45, 0, -0.15], elbowR: [-0.5, 0, 0] }),
  throw: () => ({ hipsY: 0.8, spine: [0.95, 0, 0], head: [-0.7, 0, 0], hipL: [-0.9, 0, 0.25], hipR: [-0.6, 0, -0.25], kneeL: [1.1, 0, 0], kneeR: [0.9, 0, 0],
    shoulderL: [-2.5, 0, 0.1], elbowL: [-0.4, 0, 0], shoulderR: [-2.5, 0, -0.1], elbowR: [-0.4, 0, 0] }),
  cool: t => ({ head: [-0.18, 0.28 + 0.05 * Math.sin(t * 1.5), -0.12], spine: [-0.05, 0, 0], hipL: [-0.1, 0, 0.12], hipR: [0.05, 0, -0.12],
    shoulderL: [0, 0, 0.14], elbowL: [-0.2, 0, 0], shoulderR: [-1.0, 0, 0.42], elbowR: [-2.2, 0, 0] }),
};
const G = {        // thug poses
  walk: t => ({ ...walkCycle(t, 1.6, 0.45), spine: [0.2, 0, 0], head: [-0.15, 0, 0] }),
  run: t => ({ ...walkCycle(t, 3.0, 0.9), spine: [0.4, 0, 0], head: [-0.35, 0, 0], shoulderL: [-0.8 * Math.sin(t * 6 * PI), 0, 0.2], shoulderR: [0.8 * Math.sin(t * 6 * PI) - 0.6, 0, -0.2], elbowL: [-1.5, 0, 0], elbowR: [-1.4, 0, 0] }),
  guard: t => ({ hipsY: 0.88 + 0.02 * Math.sin(t * 6), spine: [0.25, 0, 0], head: [-0.2, 0, 0], hipL: [-0.3, 0, 0.2], hipR: [0.25, 0, -0.2], kneeL: [0.4, 0, 0], kneeR: [0.4, 0, 0],
    shoulderL: [-1.1, 0, 0.4], elbowL: [-1.8, 0, 0], shoulderR: [-0.9, 0, -0.4], elbowR: [-1.9, 0, 0] }),
  punch: () => ({ hipsY: 0.86, spine: [0.3, 0.4, 0], head: [-0.25, -0.3, 0], hipL: [-0.5, 0, 0.2], hipR: [0.4, 0, -0.2], kneeL: [0.4, 0, 0], kneeR: [0.2, 0, 0],
    shoulderL: [-1.0, 0, 0.4], elbowL: [-1.9, 0, 0], shoulderR: [-1.55, 0, 0.1], elbowR: [-0.1, 0, 0] }),
  windup: () => ({ hipsY: 0.88, spine: [0.1, 0.9, 0], head: [-0.1, -0.8, 0], hipL: [-0.4, 0, 0.2], hipR: [0.3, 0, -0.2], kneeL: [0.4, 0, 0], kneeR: [0.3, 0, 0],
    shoulderL: [-1.0, 0, -0.6], elbowL: [-1.2, 0, 0], shoulderR: [-1.6, 0, -0.9], elbowR: [-1.3, 0, 0] }),
  swing: () => ({ hipsY: 0.86, spine: [0.2, -0.9, 0], head: [-0.1, 0.6, 0], hipL: [-0.4, 0, 0.2], hipR: [0.3, 0, -0.2], kneeL: [0.5, 0, 0], kneeR: [0.3, 0, 0],
    shoulderL: [-1.4, 0, 0.9], elbowL: [-0.4, 0, 0], shoulderR: [-1.5, 0, 0.6], elbowR: [-0.3, 0, 0] }),
  hit: () => ({ spine: [-0.55, 0, 0.1], head: [0.6, 0.3, 0], hipL: [-0.5, 0, 0.35], hipR: [0.2, 0, -0.3], kneeL: [0.6, 0, 0], kneeR: [0.4, 0, 0],
    shoulderL: [-2.3, 0, 0.8], elbowL: [-0.4, 0, 0], shoulderR: [-2.1, 0, -0.9], elbowR: [-0.6, 0, 0] }),
  fly: t => ({ spine: [-0.3, 0, 0.2 * Math.sin(t * 9)], head: [0.4, 0, 0], hipL: [-0.9 + 0.5 * Math.sin(t * 12), 0, 0.3], hipR: [-0.4 + 0.5 * Math.sin(t * 12 + 2), 0, -0.3], kneeL: [0.9, 0, 0], kneeR: [0.6, 0, 0],
    shoulderL: [-2.4 + Math.sin(t * 10), 0, 0.9], shoulderR: [-2.0 - Math.sin(t * 10), 0, -0.9], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0] }),
  down: () => ({ head: [0.3, 0.6, 0], spine: [0, 0, 0.1], shoulderL: [-0.2, 0, 1.3], shoulderR: [0.2, 0, -1.5], elbowL: [0, 0, 0.4], elbowR: [-0.5, 0, -0.2], hipL: [-0.15, 0, 0.35], hipR: [-0.5, 0, -0.25], kneeL: [0.25, 0, 0], kneeR: [0.9, 0, 0] }),
  sit: () => ({ hipsY: 0.2, head: [0.55, 0.4, 0.25], spine: [-0.15, 0, 0.15], hipL: [-1.45, 0, 0.3], hipR: [-1.3, 0, -0.35], kneeL: [0.4, 0, 0], kneeR: [0.9, 0, 0],
    shoulderL: [0.1, 0, 0.5], elbowL: [-0.3, 0, 0], shoulderR: [0.1, 0, -0.4], elbowR: [-0.2, 0, 0] }),
  getup: () => ({ hipsY: 0.55, spine: [0.8, 0, 0], head: [-0.5, 0, 0], hipL: [-1.4, 0, 0.2], hipR: [-0.6, 0, -0.2], kneeL: [1.9, 0, 0], kneeR: [1.4, 0, 0], shoulderL: [-0.7, 0, 0.3], shoulderR: [-0.9, 0, -0.3], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0] }),
};
const HERO_KEYS = [
  [0, H.stand], [0.6, H.stand], [0.95, H.tie], [1.75, H.tie], [2.15, H.stand], [2.65, H.guard], [3.32, H.guard], [3.42, H.block], [3.62, H.block], [3.7, H.punch], [3.88, H.punch],
  [4.08, H.guard], [4.26, H.guard], [4.34, H.duck], [4.58, H.duck], [4.72, H.roundhouse], [5.08, H.roundhouse], [5.3, H.guard], [5.72, H.guard], [5.85, H.jump],
  [6.02, H.flyKick], [6.38, H.flyKick], [6.62, H.land], [7.0, H.land], [7.32, H.guard], [7.95, H.guard], [8.06, H.grab], [8.2, H.grab], [8.45, H.throw], [8.72, H.throw],
  [9.15, H.stand], [9.45, H.stand], [9.7, H.tie], [10.3, H.tie], [10.65, H.cool], [TAU_END + 1, H.cool],
];
const A_KEYS = [[0, G.walk], [2.95, G.walk], [3.1, G.guard], [3.28, G.run], [3.44, G.punch], [3.72, G.punch], [3.82, G.hit], [4.15, G.hit], [4.4, G.down], [6.9, G.down],
  [7.2, G.getup], [7.4, G.guard], [7.5, G.run], [7.95, G.run], [8.12, G.hit], [8.42, G.fly], [8.6, G.down], [TAU_END + 1, G.down]];
const B_KEYS = [[0, G.walk], [2.95, G.walk], [3.1, G.guard], [3.85, G.guard], [4.05, G.run], [4.22, G.windup], [4.36, G.windup], [4.52, G.swing], [4.8, G.guard], [4.98, G.guard],
  [5.04, G.hit], [5.22, G.fly], [5.55, G.fly], [5.7, G.down], [TAU_END + 1, G.down]];
const C_KEYS = [[0, G.walk], [2.95, G.walk], [3.1, G.guard], [5.05, G.guard], [5.2, G.run], [5.95, G.run], [6.18, G.hit], [6.35, G.fly], [6.6, G.hit], [7.05, G.sit], [TAU_END + 1, G.sit]];
const IMPACTS = [   // [τ, x, y, z, kind]  kind: 1 = spark hit, 2 = big hit, 3 = body slam (splash/dust)
  [3.78, -0.95, 1.72, 0.0, 1], [4.3, -4.6, 0.3, 0.4, 3], [5.0, 1.05, 1.6, 0.0, 1], [5.6, 5.2, 0.3, -0.4, 3],
  [6.15, 0, 1.5, -1.5, 2], [6.6, 0, 1.4, -6.05, 3], [8.62, 1.6, 0.25, -1.0, 2],
];

/* ───────────── scene ───────────── */
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 21; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const portrait = height > width;
  camera.fov = portrait ? 55 : 38; camera.far = 300; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.3;
  scene.fog = new THREE.Fog(0x07080d, 14, 40);

  /* lights: dim blue night, a warm street lamp, neon pink + cyan */
  scene.add(new THREE.HemisphereLight(0x5a6c9a, 0x16161e, 1.6));
  const lamp = new THREE.SpotLight(0xffd7a0, 55, 22, 0.8, 0.6, 1.4);
  lamp.position.set(-1.5, 6.5, 3.5); lamp.target.position.set(0, 0, -1.5); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0005;
  scene.add(lamp, lamp.target);
  const rim = new THREE.DirectionalLight(0x6fd8ff, 0.9); rim.position.set(4, 5, -6); scene.add(rim);
  const pinkL = new THREE.PointLight(0xff2fd0, 0, 14, 1.4); pinkL.position.set(0, 4.2, -5.6); scene.add(pinkL);
  const cyanL = new THREE.PointLight(0x2fd9ff, 5, 10, 1.6); cyanL.position.set(-6.2, 3.2, -2.5); scene.add(cyanL);
  const redL = new THREE.PointLight(0xff3a3a, 4, 9, 1.6); redL.position.set(6.4, 2.6, 1.5); scene.add(redL);

  /* alley: wet asphalt, brick walls, props */
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
    for (let y = 0; y < h; y += bh) for (let x = -bw; x < w; x += bw) {
      const v = 70 + rnd() * 40; g.fillStyle = `rgb(${v},${v * 0.48},${v * 0.42})`;
      g.fillRect(x + ((y / bh) % 2 ? bw / 2 : 0) + 2, y + 2, bw - 4, bh - 4);
    }
  }, 4, 3);
  const wallMat = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 });
  const wall = (w, h, p, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(...p); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); };
  wall(16, 12, [0, 6, -6.4], 0); wall(18, 12, [-7, 6, 1.5], PI / 2); wall(18, 12, [7, 6, 1.5], -PI / 2);
  const dark = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.6 });
  // crates (left, A lands by them), bins (right, B), pipes, fire escape, door
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.85 });
  [[-6.1, 0.45, 0.9, 0.9], [-6.2, 1.35, 1.0, 0.9], [-5.9, 0.4, 2.0, 0.8]].forEach(([x, y, z, s]) => { const m = new THREE.Mesh(new RoundedBoxGeometry(s, s, s, 2, 0.04), crateMat); m.position.set(x, y, z); m.rotation.y = rnd() * 0.5; m.castShadow = m.receiveShadow = true; scene.add(m); });
  const binMat = new THREE.MeshStandardMaterial({ color: 0x2d4a3a, roughness: 0.5, metalness: 0.4 });
  [[6.2, -0.9], [6.3, 0.2]].forEach(([x, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 1.0, 16), binMat); m.position.set(x, 0.5, z); m.castShadow = true; scene.add(m); });
  const dumpster = new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.3, 2.4, 2, 0.05), new THREE.MeshStandardMaterial({ color: 0x1f3d63, roughness: 0.5, metalness: 0.3 }));
  dumpster.position.set(6.2, 0.65, 3.6); dumpster.castShadow = true; scene.add(dumpster);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.4, metalness: 0.6 }));
  door.position.set(-3.2, 1.2, -6.38); scene.add(door);
  for (const [x, z] of [[-6.95, -3], [6.95, -4]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 12, 8), dark); p.position.set(x, 6, z); scene.add(p); }
  { // fire escape on the left wall
    const fe = new THREE.Group(); fe.position.set(-6.4, 3.4, -2.5); scene.add(fe);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 3.2), dark); fe.add(slab);
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), dark); b.position.set(0.58, 0.45, -1.5 + i * 0.37); fe.add(b); }
  }

  /* neon: the title sign over the back wall + an OPEN sign */
  const font = new FontFace('Title', `url(${asset('Fruktur.ttf')})`); await font.load(); document.fonts.add(font);
  function neonCanvas(lines, w, h, colour, glow, size, core = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.font = `${size}px Title`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = Math.min(1, (w * 0.9) / Math.max(...lines.map(l => g.measureText(l).width)));
    lines.forEach((line, k) => {
      g.save(); g.translate(w / 2, h * (k + 0.5) / lines.length); g.scale(fit, fit);
      for (const [blur, lw, col] of [[60, 18, glow], [30, 12, glow], [0, 7, colour]]) { g.shadowColor = glow; g.shadowBlur = blur; g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = col; g.strokeText(line, 0, 0); }
      if (core) { g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.strokeText(line, 0, 0); } g.restore();
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const signLines = portrait ? ['elvladislavo', '.com'] : ['elvladislavo.com'];
  const signW = portrait ? 5.6 : 7.5, signH = signW * (portrait ? 0.55 : 0.22);
  const signOff = new THREE.MeshBasicMaterial({ map: neonCanvas(signLines, 2048, Math.round(2048 * signH / signW), '#1c1218', 'rgba(0,0,0,0)', 300, false), transparent: true, depthWrite: false, opacity: 0.45 });
  const signOn = new THREE.MeshBasicMaterial({ map: neonCanvas(signLines, 2048, Math.round(2048 * signH / signW), '#ffd6f6', '#ff2fd0', 300), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  const signGeo = new THREE.PlaneGeometry(signW, signH);
  const signBase = new THREE.Mesh(signGeo, signOff), sign = new THREE.Mesh(signGeo, signOn);
  signBase.position.set(0, 4.3, -6.34); sign.position.set(0, 4.3, -6.33); scene.add(signBase, sign);
  const backing = new THREE.Mesh(new RoundedBoxGeometry(signW + 0.3, signH + 0.25, 0.08, 2, 0.04), new THREE.MeshStandardMaterial({ color: 0x101015, roughness: 0.4, metalness: 0.5 }));
  backing.position.set(0, 4.3, -6.38); scene.add(backing);
  const open = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshBasicMaterial({ map: neonCanvas(['OPEN'], 512, 200, '#d9fbff', '#2fd9ff', 150), transparent: true, depthWrite: false, toneMapped: false, color: 0xbbbbbb }));
  open.position.set(-6.9, 2.9, -0.2); open.rotation.y = PI / 2; scene.add(open);

  /* characters */
  const hero = buildStickman({ seed: 7 }); scene.add(hero.system);
  const goon = (seedN, hoodie, accent) => {
    const g = buildStickman({ seed: seedN });
    const M = g.M, toonMat = c => new THREE.MeshToonMaterial({ color: c, gradientMap: g.ramp });
    // re-dress: grey hoodie, black mask, dark cargo trousers, white trainers
    const hood = toonMat(hoodie), maskM = toonMat(0x111114), trou = toonMat(0x22242a), shoe = toonMat(0xe8e8e8), acc = toonMat(accent);
    g.system.traverse(o => {
      if (!o.isMesh || o.material === g.outlineMat) return;
      const m = o.material;
      if (m === M.blazer || m === M.shirt || m === M.belt || m === M.buckle) o.material = hood;
      else if (m === M.tie || m === M.tieKnot) o.visible = false;
      else if (m === M.trousers) o.material = trou;
      else if (m === M.stripe) o.material = acc;
      else if (m === M.shoe || m === M.sole) o.material = shoe;
      else if (m === M.hair || m === M.hairLight || m === M.beard) { o.visible = false; }
      else if ((m === M.skin || m === M.earIn) && o.parent === g.J.head) o.material = maskM;
    });
    // hood + glowing eye slits
    const hoodMesh = new THREE.Mesh(new THREE.SphereGeometry(0.175, 20, 14, 0, PI * 2, 0, PI * 0.62), hood); hoodMesh.position.set(0, 0.16, -0.02); hoodMesh.rotation.x = -0.35;
    hoodMesh.add(new THREE.Mesh(hoodMesh.geometry, g.outlineMat)); g.J.head.add(hoodMesh);
    for (const sx of [1, -1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(sx * 0.05, 0.18, 0.148); g.J.head.add(e); }
    return g;
  };
  const gA = goon(31, 0x4a4f5c, 0xff3a3a), gB = goon(47, 0x5b4a3c, 0xffc23d), gC = goon(59, 0x3c4a5b, 0x2fd9ff);
  [gA, gB, gC].forEach(g => scene.add(g.system));
  { // B's baseball bat in the right hand
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.018, 0.85, 12), new THREE.MeshToonMaterial({ color: 0x9a6a3c, gradientMap: gB.ramp }));
    bat.add(new THREE.Mesh(bat.geometry, gB.outlineMat));
    bat.position.set(0, -0.3, 0.38); bat.rotation.x = PI / 2 + 0.2; gB.J.elbowR.add(bat);
  }
  const place = (ch, tracks, keys, tau) => {
    ch.system.position.set(key(tau, tracks.x), key(tau, tracks.y), key(tau, tracks.z));
    ch.system.rotation.set(0, key(tau, tracks.yaw), 0);
    ch.body.rotation.set(key(tau, tracks.pitch), 0, key(tau, tracks.roll));
    ch.applyPose(keys, tau);
    ch.system.updateMatrixWorld(true);
  };

  /* particles: sparks (additive), dust/spray (alpha), rain (lines) */
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
  const SPARK = pointSystem(1400, THREE.AdditiveBlending), DUST = pointSystem(900, THREE.NormalBlending);
  const emit = (S, x, y, z, s, r, g, b, a) => { if (S.n >= S.N) return; const i = S.n++; S.pos.setXYZ(i, x, y, z); S.size.setX(i, s); S.col.setXYZW(i, r, g, b, a); };
  const RR = Array.from({ length: 3000 }, () => [rnd(), rnd(), rnd(), rnd(), rnd()]);
  // impact flash: an additive starburst sprite
  const burstTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,230,180,.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2, r = i % 2 ? 40 : 128; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const bursts = IMPACTS.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: burstTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, toneMapped: false })); scene.add(s); return s; });
  // rain
  const DROPS = 2200, rainBase = Array.from({ length: DROPS }, () => [rnd() * 18 - 9, rnd() * 10, rnd() * 18 - 9, 0.8 + rnd() * 0.4]);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DROPS * 6), 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9fb8e0, transparent: true, opacity: 0.38 })); rain.frustumCulled = false; scene.add(rain);

  /* post: bloom for neon + a grade pass (impact flash, vignette) */
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.45, 0.96));
  const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, flash: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float flash; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float vig = 1.0 - 0.9 * dot(d, d);
        gl_FragColor = vec4(mix(c.rgb * vig, vec3(1.0, 0.97, 0.92), flash), c.a); }` });
  composer.addPass(grade); composer.addPass(new OutputPass());

  /* camera shots (τ-driven) */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const shoe = new THREE.Vector3(), head = new THREE.Vector3(), aCom = new THREE.Vector3();
  const SHOTS = [
    [0, 2.3, tau => { const u = E.inOutCubic(range(tau, 0.1, 2.1)); const look = shoe.clone().lerp(head, u);
      return { pos: look.clone().add(V(lerp(0.55, 0.75, u), lerp(0.08, 0.05, u), lerp(0.75, 1.25, u))), look }; }],
    [2.3, 3.2, tau => ({ pos: V(2.2, 1.5, 7.2), look: V(0, 1.0, -0.8) })],
    [3.2, 4.4, tau => ({ pos: V(lerp(-0.8, -1.6, range(tau, 3.2, 4.4)), 1.25, 3.6), look: V(lerp(-1.0, -2.6, E.inOutCubic(range(tau, 3.7, 4.4))), 1.15, 0.1) })],
    [4.4, 5.7, tau => ({ pos: V(lerp(1.0, 2.0, range(tau, 4.4, 5.7)), 1.0, 3.6), look: V(lerp(0.8, 4.4, E.inOutCubic(range(tau, 4.95, 5.65))), lerp(1.0, 0.7, range(tau, 5.2, 5.7)), -0.2) })],
    [5.7, 7.2, tau => ({ pos: V(lerp(4.6, 5.0, range(tau, 5.7, 7.2)), 1.25, lerp(-1.0, -3.4, E.inOutCubic(range(tau, 6.0, 7.0)))), look: V(0, lerp(1.25, 0.9, range(tau, 6.5, 7.1)), lerp(-1.3, -4.7, E.inOutCubic(range(tau, 6.05, 6.8)))) })],
    [7.2, 8.95, tau => ({ pos: V(0.2, 1.3, 3.2), look: V(lerp(-1.2, 0.5, E.inOutCubic(range(tau, 7.4, 8.7))), 1.05, -1.0) })],
    [8.95, 10.4, tau => ({ pos: head.clone().add(V(0.25, -0.05, lerp(1.4, 1.1, range(tau, 8.95, 10.4)))), look: head.clone().add(V(0, -0.12, 0)) })],
    [10.4, TAU_END + 1, tau => { const u = E.inOutCubic(range(tau, 10.4, 12.6));
      return { pos: V(lerp(0.3, 0, u), lerp(1.4, 1.9, u), lerp(2.6, 6.6, u)), look: V(0, lerp(1.5, 3.4, u), lerp(-1, -5.5, u)) }; }],
  ];
  const BLEND = 0.12;

  return {
    update(t) {
      const tau = tauAt(t);
      place(hero, HERO, HERO_KEYS, tau); place(gA, A, A_KEYS, tau); place(gB, B, B_KEYS, tau); place(gC, C, C_KEYS, tau);
      hero.shoe('L', shoe); hero.J.head.localToWorld(head.set(0, 0.17, 0.05));

      /* neon sign: dark until 10.4, then a stuttering flicker into full glow */
      const on = tau < 10.4 ? 0 : tau > 11.15 ? 1 : [0, 1, 0, 0, 1, 1, 0, 1, 1, 0.4, 1, 1][Math.floor((tau - 10.4) / 0.0625)] ?? 1;
      signOn.opacity = on; pinkL.intensity = 9 * on;
      signOn.color.setScalar(1 + 0.05 * Math.sin(tau * 40) * on);

      /* rain (falls in scene time, so it hangs in the slow-mo) */
      const ra = rainGeo.attributes.position.array, focus = camera.position;
      for (let i = 0; i < DROPS; i++) {
        const [bx, by, bz, sp] = rainBase[i];
        const x = focus.x + ((bx - focus.x) % 18 + 27) % 18 - 9, z = focus.z - 4 + ((bz - focus.z + 4) % 18 + 27) % 18 - 9;
        const y = ((by - tau * 9 * sp) % 10 + 10) % 10;
        ra.set([x, y, z, x + 0.02, y + 0.32, z], i * 6);
      }
      rainGeo.attributes.position.needsUpdate = true;

      /* impacts: sparks, dust/spray, flash sprite, screen flash, shake */
      SPARK.n = DUST.n = 0; let shake = 0, flash = 0;
      IMPACTS.forEach(([it, ix, iy, iz, kind], n) => {
        const u = tau - it, b = bursts[n];
        b.material.opacity = u < 0 || u > 0.16 ? 0 : 1 - u / 0.16;
        b.position.set(ix, iy, iz); b.scale.setScalar((kind === 2 ? 1.5 : kind === 1 ? 0.85 : 0.6) * (0.5 + 3 * Math.max(0, u)));
        if (kind === 3) b.material.opacity *= 0.5;
        if (u >= 0 && u < 0.5) { shake = Math.max(shake, (kind === 2 ? 0.16 : 0.08) * Math.exp(-9 * u)); if (kind !== 3) flash = Math.max(flash, (kind === 2 ? 0.55 : 0.3) * Math.exp(-30 * u)); }
        if (u < 0 || u > 1.6) return;
        if (kind !== 3) for (let i = 0; i < 70; i++) {
          const r = RR[n * 140 + i], L = 0.25 + r[0] * 0.35; if (u > L) continue;
          const th = r[1] * PI * 2, ph = Math.acos(2 * r[2] - 1), s = 3 + r[3] * 6;
          emit(SPARK, ix + Math.sin(ph) * Math.cos(th) * s * u, iy + Math.cos(ph) * s * u - 4.9 * u * u, iz + Math.sin(ph) * Math.sin(th) * s * u, 0.05 + 0.05 * r[4], 1.6, 1.15, 0.6, 1 - u / L);
        }
        const nD = kind === 3 ? 80 : 26;
        for (let i = 0; i < nD; i++) {
          const r = RR[1500 + n * 100 + i], L = 0.8 + r[0] * 0.8; if (u > L) continue;
          const th = r[1] * PI * 2, s = kind === 3 ? 1.2 + r[2] * 2.2 : 0.6 + r[2], k = u / L, d = s * (1 - Math.exp(-4 * u)) / 2;
          emit(DUST, ix + Math.cos(th) * d, (kind === 3 ? 0.05 : iy - 0.2) + r[3] * 0.9 * (1 - Math.exp(-3 * u)), iz + Math.sin(th) * d, 0.25 + 0.9 * k, 0.55, 0.62, 0.75, 0.45 * (1 - k));
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
      camera.position.copy(pos); camera.lookAt(look);
    },
    render() { composer.render(); },
  };
}
