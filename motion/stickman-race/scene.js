// BRIEF — "Wyścig z czasem" (race against time): a night drag race. The elvladislavo character on his
// flaming motorbike lines up next to a smoking old car tagged "Strona z 2010". Lights go red, yellow,
// green; he launches in a slow-motion wheelie and his timer freezes at 0,8 s as he blasts under the
// finish arch ("META", banner "Szybkość to podstawa"). He drifts round to a stop and waves while the old
// car crawls on, its timer racing to 12 s before it stalls in a cloud of steam. The arch's neon
// "elvladislavo.com" flickers on.
//
// POLISH TEXT (checked): Strona z 2010 · 0,8 s / 12 s (decimal comma) · Start! · META · Szybkość to podstawa
// SHOT PLAN (scene time τ; slow motion during the run 4.15–5.2)
//   0–2.6 boots → face crane at the start line · 2.6–4.2 wide on the grid, tags + lights
//   4.2–5.0 slow-mo launch, tracking · 5.0–5.35 through the arch · 5.35–7.0 drift stop
//   7.0–8.2 he looks back and waves · 8.2–9.6 the old car's timer hits 12 s, stalls · 9.6– neon sign
//
// Render: node .claude/skills/text-to-3d-motion/scripts/render.mjs motion/stickman-race/scene.js --width 1080 --height 1920 --out race.mp4
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease, range, wiggle } from '/lib/motion.js';
import { buildStickman } from '/assets/stickman.js';

const PI = Math.PI, lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const E = ease;

/* ───────────── timing ───────────── */
const T_RED = 3.2, T_YEL = 3.7, T_GO = 4.2, RUN = 0.8, T_FIN = T_GO + RUN, FIN = 30;
const T_STALL = 9.0, T_SIGN = 9.8, T_END = 13.2;
const LANE_H = 1.3, LANE_C = -2.4;
const WHEEL_R = 0.36, WHEEL_Z = 0.72;
const rate = tau => 1 - 0.78 * sm(4.08, 4.22, tau) * (1 - sm(5.0, 5.25, tau));
const REMAP = (() => { const out = [0]; let tau = 0; const dt = 1 / 600; while (tau < T_END) { tau += rate(tau) * dt; out.push(tau); } return { out, dt }; })();
const tauAt = t => { const f = t / REMAP.dt, i = Math.min(REMAP.out.length - 2, Math.floor(f)); return lerp(REMAP.out[i], REMAP.out[i + 1], f - i); };
export const meta = { duration: Math.floor((REMAP.out.length - 1) * REMAP.dt * 10) / 10, fps: 30, background: '#05070d' };

// hero's bike: idle rev at the line → huge launch (z = ½·a·u², 30 m in 0.8 s) with a wheelie → drift-turn stop
const ACC = 2 * FIN / (RUN * RUN), V_FIN = ACC * RUN, STOP_D = 13, STOP_K = V_FIN / STOP_D;
function bikeState(t) {
  if (t < T_GO) return { x: LANE_H, y: 0.55 + (t > 2.8 ? 0.01 * Math.sin(t * 40) : 0), z: 0, pitch: t > 3.9 ? -0.02 : 0, roll: 0, yaw: 0 };
  if (t < T_FIN) { const u = t - T_GO; return { x: LANE_H, y: 0.55, z: 0.5 * ACC * u * u, pitch: -0.42 * sm(0, 0.12, u) * (1 - sm(0.55, 0.8, u)), roll: 0, yaw: 0 }; }
  const u = t - T_FIN, k = 1 - Math.exp(-STOP_K * u), turn = E.inOutCubic(range(u, 0.15, 1.3));
  return { x: LANE_H + 1.2 * turn, y: 0.55, z: FIN + STOP_D * k, pitch: 0, roll: 0.35 * Math.sin(PI * range(u, 0.15, 1.3)), yaw: -PI * 0.95 * turn };
}
// old car: sputters off the line and crawls, stalls at T_STALL
function carState(t) {
  const u = Math.max(0, t - T_GO), crawl = 10 * (1 - Math.exp(-0.32 * u)), stall = sm(T_STALL - 0.3, T_STALL, t);
  return { x: LANE_C, z: lerp(crawl, 10 * (1 - Math.exp(-0.32 * (T_STALL - T_GO))), stall) + 0.06 * Math.sin(t * 9) * (t > T_GO && t < T_STALL ? 1 : 0), bob: 0.02 * Math.sin(t * 23) };
}
const heroTimer = t => Math.max(0, Math.min(RUN, t - T_GO));
const carTimer = t => t < T_GO ? 0 : t < T_FIN ? t - T_GO : Math.min(12, RUN + (t - T_FIN) * (11.2 / (T_STALL - T_FIN)));
const fmt = v => (v >= 12 ? '12' : v.toFixed(1).replace('.', ',')) + ' s';

/* ───────────── poses ───────────── */
const P = {
  ride: t => { const b = 0.02 * Math.sin(t * 23);
    return { hipsY: 0.95, spine: [0.42 + b, 0, 0], head: [-0.42, 0.06 * Math.sin(t * 0.9), 0], hipL: [-1.26, 0, 0.26], hipR: [-1.26, 0, -0.26], kneeL: [1.62, 0, -0.12], kneeR: [1.62, 0, 0.12],
      shoulderL: [-1.36, 0, 0.3], shoulderR: [-1.36, 0, -0.3], elbowL: [-0.25, 0, 0], elbowR: [-0.25, 0, 0] }; },
  tuck: () => ({ hipsY: 0.95, spine: [0.75, 0, 0], head: [-0.75, 0, 0], hipL: [-1.3, 0, 0.22], hipR: [-1.3, 0, -0.22], kneeL: [1.7, 0, -0.12], kneeR: [1.7, 0, 0.12] }),
  wave: t => ({ hipsY: 0.95, spine: [0.15, 0, 0], head: [-0.1, -0.15, 0.1], hipL: [-1.26, 0, 0.26], hipR: [-1.26, 0, -0.26], kneeL: [1.62, 0, -0.12], kneeR: [1.62, 0, 0.12],
    shoulderR: [0, 0, -2.5], elbowR: [0, 0, -0.55 + 0.8 * (0.5 + 0.5 * Math.sin(t * 9))] }),
};
const KEYS = [[0, P.ride], [T_GO - 0.05, P.ride], [T_GO + 0.1, P.tuck], [T_FIN + 0.3, P.tuck], [T_FIN + 0.9, P.ride], [7.25, P.ride], [7.45, P.wave], [8.4, P.wave], [8.7, P.ride], [T_END + 1, P.ride]];
const WAVE_ON = (t) => t > 7.3 && t < 8.6;

/* ───────────── scene ───────────── */
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const portrait = height > width;
  camera.fov = portrait ? 55 : 40; camera.far = 600; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.25;
  { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#03040a'); gr.addColorStop(0.7, '#0d1530'); gr.addColorStop(1, '#2a2340'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; scene.background = tx; }
  scene.fog = new THREE.Fog(0x0b0f1f, 40, 160);
  scene.add(new THREE.HemisphereLight(0x5a6c9a, 0x1a1a22, 1.3));
  const moon = new THREE.DirectionalLight(0x9fb4ff, 1.0); moon.position.set(-20, 40, -10); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 120 }); scene.add(moon, moon.target);

  /* street: asphalt, lane paint, start + finish checker lines */
  const ctex = (w, h, draw, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };
  const asphalt = ctex(512, 512, (g, w, h) => { g.fillStyle = '#1c1e25'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = 22 + rnd() * 30; g.fillStyle = `rgb(${v},${v},${v + 5})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, 30, 30);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.45, metalness: 0.1 }));
  ground.rotation.x = -PI / 2; ground.position.z = 40; ground.receiveShadow = true; scene.add(ground);
  const paint = new THREE.MeshBasicMaterial({ color: 0xd8d8d0 });
  for (let z = -20; z < 110; z += 4) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2), paint); d.rotation.x = -PI / 2; d.position.set(-0.55, 0.01, z); scene.add(d); }
  for (const x of [-4.6, 3.4]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 130), paint); l.rotation.x = -PI / 2; l.position.set(x, 0.01, 45); scene.add(l); }
  const checker = ctex(256, 64, (g, w, h) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#eee'; g.fillRect(x * 32, y * 32, 32, 32); } }, 4, 1);
  for (const z of [0.9, FIN]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.8), new THREE.MeshBasicMaterial({ map: checker })); m.rotation.x = -PI / 2; m.position.set(-0.6, 0.012, z); scene.add(m); }

  /* buildings with lit windows, street lamps */
  const facade = () => ctex(256, 512, (g, w, h) => { g.fillStyle = '#12141c'; g.fillRect(0, 0, w, h);
    for (let y = 12; y < h; y += 34) for (let x = 12; x < w; x += 30) { const on = rnd() < 0.35; g.fillStyle = on ? (rnd() < 0.5 ? '#ffd27a' : '#ffe9b0') : '#1d2230'; g.fillRect(x, y, 18, 22); } });
  const facades = [facade(), facade(), facade()];
  for (const side of [-1, 1]) for (let z = -30; z < 120; z += 13) {
    const h = 10 + rnd() * 22, w = 12;
    const m = new THREE.Mesh(new THREE.BoxGeometry(8, h, w), new THREE.MeshBasicMaterial({ map: facades[Math.floor(rnd() * 3)], color: 0x9a9a9a }));
    m.material.map = m.material.map.clone(); m.material.map.repeat.set(1, h / 14); m.material.map.needsUpdate = true;
    m.position.set(side * (15 + rnd() * 2), h / 2, z + rnd() * 2); scene.add(m);
  }
  const poleM = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: 0.5, metalness: 0.6 }), bulbM = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  for (const side of [-1, 1]) for (let z = -12; z < 80; z += 14) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 8), poleM); pole.position.set(side * 6.8, 3, z); pole.castShadow = true; scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), poleM); arm.position.set(side * 6.15, 5.95, z); scene.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), bulbM); bulb.position.set(side * 5.5, 5.85, z); scene.add(bulb);
    if (z % 28 === 2 || z === -12) { const pl = new THREE.PointLight(0xffd7a0, 26, 22, 1.5); pl.position.set(side * 5.5, 5.6, z); scene.add(pl); }
  }

  /* drag-race lights at the start */
  const tree = new THREE.Group(); tree.position.set(-0.55, 0, 2.2); scene.add(tree);
  { const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 8), poleM); tp.position.y = 1.3; tree.add(tp); }
  const lampHousing = new THREE.Mesh(new RoundedBoxGeometry(0.42, 1.2, 0.3, 2, 0.05), poleM); lampHousing.position.y = 2.9; tree.add(lampHousing);
  const LAMP = [[0xff2a2a, 3.3], [0xffc21a, 2.9], [0x2aff6a, 2.5]].map(([c, y]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10), new THREE.MeshBasicMaterial({ color: 0x222222, toneMapped: false })); m.position.set(0, y, 0.16); tree.add(m);
    return { m, on: new THREE.Color(c).multiplyScalar(2.2), off: new THREE.Color(0x1d1d22) }; });

  /* finish arch: META + banner, neon title above */
  const tagFont = new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`), titleFont = new FontFace('Title', `url(${asset('Fruktur.ttf')})`);
  await Promise.all([tagFont.load(), titleFont.load()]); document.fonts.add(tagFont); document.fonts.add(titleFont);
  const arch = new THREE.Group(); arch.position.set(-0.6, 0, FIN); scene.add(arch);
  const archM = new THREE.MeshStandardMaterial({ color: 0x24262e, roughness: 0.4, metalness: 0.6 });
  for (const x of [-4.6, 4.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), archM); p.position.set(x, 3, 0); p.castShadow = true; arch.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(9.7, 0.9, 0.6), archM); beam.position.y = 6.2; arch.add(beam);
  const metaTex = ctex(1024, 128, (g, w, h) => { for (let x = 0; x < 32; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#eee'; g.fillRect(x * 32, y * 32, 32, 32); }
    g.fillStyle = '#d0141e'; g.fillRect(360, 8, 304, 112); g.fillStyle = '#fff'; g.font = '92px Tag'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('META', 512, 68); });
  const metaPlane = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 0.86), new THREE.MeshBasicMaterial({ map: metaTex })); metaPlane.position.set(0, 6.2, -0.31); metaPlane.rotation.y = PI; arch.add(metaPlane);
  const banTex = ctex(2048, 360, (g, w, h) => { g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#d0141e'; g.fillRect(0, 0, w, 24); g.fillRect(0, h - 24, w, 24);
    g.fillStyle = '#121318'; g.font = '190px Tag'; g.textAlign = 'center'; g.textBaseline = 'middle'; const f = Math.min(1, 1900 / g.measureText('Szybkość to podstawa').width); g.font = `${190 * f}px Tag`; g.fillText('Szybkość to podstawa', w / 2, h / 2 + 6); });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.45), new THREE.MeshLambertMaterial({ map: banTex, side: THREE.DoubleSide })); banner.position.set(0, 4.95, -0.05); banner.rotation.y = PI; banner.material.side = THREE.FrontSide; arch.add(banner);
  { const b2 = new THREE.Mesh(banner.geometry, new THREE.MeshLambertMaterial({ map: banTex })); b2.position.set(0, 4.95, 0.05); arch.add(b2);
    const m2 = new THREE.Mesh(metaPlane.geometry, metaPlane.material); m2.position.set(0, 6.2, 0.31); arch.add(m2); }
  // neon title on top of the arch, facing the start (−z)
  function neonCanvas(lines, w, h, colour, glow, size, core = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.font = `${size}px Title`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = Math.min(1, (w * 0.9) / Math.max(...lines.map(l => g.measureText(l).width)));
    lines.forEach((line, k) => { g.save(); g.translate(w / 2, h * (k + 0.5) / lines.length); g.scale(fit, fit);
      for (const [blur, lw, col] of [[60, 18, glow], [30, 12, glow], [0, 7, colour]]) { g.shadowColor = glow; g.shadowBlur = blur; g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = col; g.strokeText(line, 0, 0); }
      if (core) { g.shadowBlur = 0; g.lineWidth = 3; g.strokeStyle = '#ffffff'; g.strokeText(line, 0, 0); } g.restore(); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const signLines = portrait ? ['elvladislavo', '.com'] : ['elvladislavo.com'], signW = portrait ? 6.4 : 8.6, signH = signW * (portrait ? 0.55 : 0.22);
  const signOn = new THREE.MeshBasicMaterial({ map: neonCanvas(signLines, 2048, Math.round(2048 * signH / signW), '#ffd6f6', '#ff2fd0', 300), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  const signOff = new THREE.MeshBasicMaterial({ map: neonCanvas(signLines, 2048, Math.round(2048 * signH / signW), '#2a1d26', 'rgba(0,0,0,0)', 300, false), transparent: true, depthWrite: false, opacity: 0.6 });
  for (const [mat, dz] of [[signOff, 0], [signOn, -0.01]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), mat); m.position.set(0, 6.65 + signH / 2, -0.25 + dz); m.rotation.y = PI; arch.add(m); }
  const pinkL = new THREE.PointLight(0xff2fd0, 0, 18, 1.4); pinkL.position.set(-0.6, 7.5, FIN - 1.5); scene.add(pinkL);

  /* hero + bike */
  const man = buildStickman({ seed: 7 }); scene.add(man.system);
  const { J } = man, outlineMat = man.outlineMat, ramp = man.ramp;
  const toon = (c, x = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, ...x });
  /* ── motorbike (black / red / chrome, toon + ink) ── */
  const bike = new THREE.Group(); scene.add(bike);
  const frame = new THREE.Group(); frame.position.y = -0.55; bike.add(frame);           // bike pivots at its COM
  const BM = { black: toon(0x151518), red: toon(0xc0141f), chrome: toon(0x9ea3ad), tyre: toon(0x111112), seat: toon(0x0c0c0e), glow: new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), hot: new THREE.MeshBasicMaterial({ color: 0xff7a1a }) };
  const bpart = (geo, mat, parent, p, rot, outline = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = true; parent.add(m);
    if (outline) m.add(new THREE.Mesh(geo, outlineMat)); return m;
  };
  const tube = (a, b, r, mat, parent = frame) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const m = bpart(new THREE.CylinderGeometry(r, r, len, 10), mat, parent, [0, 0, 0]);
    m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  };
  const wheels = [];
  for (const wz of [WHEEL_Z, -WHEEL_Z]) {
    const w = new THREE.Group(); w.position.set(0, WHEEL_R, wz); frame.add(w);
    const spin = new THREE.Group(); w.add(spin);
    bpart(new THREE.TorusGeometry(WHEEL_R - 0.06, 0.07, 12, 32), BM.tyre, spin, [0, 0, 0], [0, Math.PI / 2, 0]);
    bpart(new THREE.TorusGeometry(WHEEL_R - 0.12, 0.018, 6, 32), BM.hot, spin, [0, 0, 0], [0, Math.PI / 2, 0], false);   // glowing rim
    for (let k = 0; k < 6; k++) bpart(new THREE.BoxGeometry(0.02, (WHEEL_R - 0.12) * 2, 0.025), BM.chrome, spin, [0, 0, 0], [k * Math.PI / 6, 0, 0], false);
    bpart(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), BM.chrome, spin, [0, 0, 0], [0, 0, Math.PI / 2]);
    wheels.push({ group: w, spin, z: wz });
  }
  tube([0.07, WHEEL_R, WHEEL_Z], [0.07, 1.0, 0.5], 0.028, BM.chrome); tube([-0.07, WHEEL_R, WHEEL_Z], [-0.07, 1.0, 0.5], 0.028, BM.chrome);   // fork
  tube([0, 1.0, 0.5], [0, 0.62, -0.3], 0.04, BM.black); tube([0, 0.95, 0.48], [0, 0.42, 0.05], 0.04, BM.black);
  tube([0, 0.42, 0.05], [0, 0.42, -0.3], 0.04, BM.black); tube([0, 0.62, -0.3], [0, WHEEL_R, -WHEEL_Z], 0.035, BM.black); tube([0, 0.42, -0.3], [0, WHEEL_R, -WHEEL_Z], 0.035, BM.black);
  bpart(new RoundedBoxGeometry(0.3, 0.2, 0.32, 3, 0.05), BM.chrome, frame, [0, 0.5, -0.04]);                        // engine
  bpart(new THREE.CylinderGeometry(0.06, 0.07, 0.22, 10), BM.black, frame, [0.12, 0.66, 0.05], [0, 0, 0.5]);
  bpart(new THREE.CylinderGeometry(0.06, 0.07, 0.22, 10), BM.black, frame, [-0.12, 0.66, 0.05], [0, 0, -0.5]);
  const tank = bpart(new THREE.SphereGeometry(0.2, 20, 14), BM.red, frame, [0, 0.93, 0.22]); tank.scale.set(0.95, 0.62, 1.45);
  bpart(new THREE.BoxGeometry(0.06, 0.04, 0.4), BM.black, frame, [0, 1.03, 0.22]);                                   // tank stripe
  bpart(new RoundedBoxGeometry(0.26, 0.08, 0.5, 3, 0.03), BM.seat, frame, [0, 0.86, -0.27]);
  bpart(new THREE.TorusGeometry(WHEEL_R + 0.02, 0.03, 6, 20, Math.PI * 0.55), BM.red, frame, [0, WHEEL_R, -WHEEL_Z], [0, Math.PI / 2, 0.15]);   // rear fender
  bpart(new THREE.TorusGeometry(WHEEL_R + 0.02, 0.03, 6, 20, Math.PI * 0.5), BM.red, frame, [0, WHEEL_R, WHEEL_Z], [0, Math.PI / 2, Math.PI * 0.32]);
  tube([-0.36, 1.13, 0.43], [0.36, 1.13, 0.43], 0.02, BM.chrome);                                                  // handlebar
  for (const sx of [1, -1]) bpart(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), BM.black, frame, [sx * 0.33, 1.13, 0.43], [0, 0, Math.PI / 2]);
  tube([0, 1.0, 0.5], [0, 1.13, 0.43], 0.025, BM.chrome);
  bpart(new THREE.SphereGeometry(0.09, 14, 10), BM.glow, frame, [0, 1.0, 0.62]);                                    // headlight
  for (const sx of [1, -1]) {                                                                                       // twin exhausts + pegs
    tube([sx * 0.12, 0.42, 0.0], [sx * 0.17, 0.4, -0.45], 0.035, BM.chrome);
    bpart(new THREE.CylinderGeometry(0.055, 0.045, 0.45, 12), BM.chrome, frame, [sx * 0.17, 0.42, -0.65], [Math.PI / 2 - 0.08, 0, 0]);
    tube([sx * 0.1, 0.4, 0.06], [sx * 0.22, 0.4, 0.06], 0.015, BM.black);
  }
  const EXHAUST = [[0.17, 0.44, -0.9], [-0.17, 0.44, -0.9]];


  /* the old car: boxy beige saloon with round headlights, wheezing smoke */
  const car = new THREE.Group(); scene.add(car);
  const hood = new THREE.Group();
  { const beige = toon(0xc9b48a), dk = toon(0x2b2b30), glass = toon(0x3b5672), chrome = toon(0xb8bcc4), rust = toon(0x8a5a33);
    const cp = (geo, mat, p, parent = car, outline = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.castShadow = true; parent.add(m); if (outline) m.add(new THREE.Mesh(geo, outlineMat)); return m; };
    cp(new RoundedBoxGeometry(1.8, 0.62, 4.2, 3, 0.12), beige, [0, 0.72, 0]);
    cp(new RoundedBoxGeometry(1.62, 0.6, 2.1, 3, 0.12), beige, [0, 1.3, -0.35]);
    for (const [z, w] of [[0.62, 1.5], [-1.32, 1.5]]) cp(new THREE.BoxGeometry(w, 0.44, 0.04), glass, [0, 1.32, z], car, false).rotation.x = z > 0 ? -0.35 : 0.35;
    for (const sx of [1, -1]) cp(new THREE.BoxGeometry(0.04, 0.42, 1.7), glass, [sx * 0.82, 1.32, -0.35], car, false);
    for (const [x, z] of [[0.82, 1.3], [-0.82, 1.3], [0.82, -1.3], [-0.82, -1.3]]) cp(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18), dk, [x, 0.34, z]).rotation.z = PI / 2;
    for (const sx of [1, -1]) cp(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 14), new THREE.MeshBasicMaterial({ color: 0xfff1b8 }), [sx * 0.6, 0.8, 2.11]).rotation.x = PI / 2;
    cp(new THREE.BoxGeometry(1.86, 0.16, 0.14), chrome, [0, 0.45, 2.15]); cp(new THREE.BoxGeometry(1.86, 0.16, 0.14), chrome, [0, 0.45, -2.15]);
    cp(new THREE.CircleGeometry(0.22, 12), rust, [0.5, 0.75, 2.106], car, false);                                     // rust patch
    hood.position.set(0, 1.04, 1.05); car.add(hood); cp(new RoundedBoxGeometry(1.7, 0.06, 1.95, 2, 0.03), beige, [0, 0, 0.95], hood);
  }
  car.position.set(LANE_C, 0, 0);

  /* tags: car name + timer (2 lines), hero timer, START pop */
  function tagCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, t }; }
  const heroTag = tagCanvas(1024, 220), carTag = tagCanvas(1024, 420), startTag = tagCanvas(1024, 300);
  function stopwatch(g, x, y, r, col) { g.strokeStyle = col; g.lineWidth = 12; g.beginPath(); g.arc(x, y + 6, r, 0, 7); g.stroke(); g.fillStyle = col; g.fillRect(x - 10, y - r - 18, 20, 16); g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + r * 0.55, y - r * 0.35); g.stroke(); }
  function drawHero(v, done) {
    const g = heroTag.c.getContext('2d'); g.clearRect(0, 0, 1024, 220);
    g.fillStyle = done ? '#16a34a' : 'rgba(14,16,22,0.92)'; g.beginPath(); g.roundRect(222, 20, 580, 180, 34); g.fill();
    stopwatch(g, 310, 104, 46, '#ffffff');
    g.fillStyle = '#ffffff'; g.font = '104px Tag'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(fmt(v), 390, 116);
    if (done) { g.strokeStyle = '#ffffff'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(705, 112); g.lineTo(728, 138); g.lineTo(770, 86); g.stroke(); }
    heroTag.t.needsUpdate = true;
  }
  function drawCar(v, dead) {
    const g = carTag.c.getContext('2d'); g.clearRect(0, 0, 1024, 420);
    g.font = '84px Tag'; const tw = g.measureText('Strona z 2010').width, w = tw + 200, x0 = (1024 - w) / 2;
    g.fillStyle = dead ? '#3a3d44' : '#d4262c'; g.beginPath(); g.roundRect(x0, 20, w, 170, 30); g.fill();
    const ix = x0 + 88, iy = 105;
    if (!dead) { g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(ix, iy - 50); g.lineTo(ix + 50, iy + 40); g.lineTo(ix - 50, iy + 40); g.closePath(); g.fill(); g.fillStyle = '#1a1a1a'; g.fillRect(ix - 6, iy - 20, 12, 36); g.fillRect(ix - 6, iy + 22, 12, 11); }
    else { g.fillStyle = '#c0262c'; g.beginPath(); g.arc(ix, iy, 46, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 13; g.lineCap = 'round'; g.beginPath(); g.moveTo(ix - 18, iy - 18); g.lineTo(ix + 18, iy + 18); g.moveTo(ix + 18, iy - 18); g.lineTo(ix - 18, iy + 18); g.stroke(); }
    g.fillStyle = dead ? '#a0a6b0' : '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Strona z 2010', x0 + 160, 108);
    if (dead) { g.strokeStyle = '#e8e8e8'; g.lineWidth = 8; g.beginPath(); g.moveTo(x0 + 150, 110); g.lineTo(x0 + 170 + tw, 104); g.stroke(); }
    g.fillStyle = v >= 12 ? '#b91c1c' : 'rgba(14,16,22,0.92)'; g.beginPath(); g.roundRect(222, 220, 580, 180, 34); g.fill();
    stopwatch(g, 310, 304, 46, '#ffffff');
    g.fillStyle = '#ffffff'; g.font = '104px Tag'; g.fillText(fmt(v), 390, 316);
    carTag.t.needsUpdate = true;
  }
  { const g = startTag.c.getContext('2d'); g.font = '230px Tag'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 34; g.strokeStyle = '#06210f'; g.strokeText('Start!', 512, 160); g.fillStyle = '#2aff6a'; g.fillText('Start!', 512, 160); startTag.t.needsUpdate = true; }
  const mkSprite = (tex) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, opacity: 0 })); s.renderOrder = 10; scene.add(s); return s; };
  const heroSpr = mkSprite(heroTag.t), carSpr = mkSprite(carTag.t), startSpr = mkSprite(startTag.t);
  const hTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (width / height);
  function fitTag(sprite, pos, frac, aspect) {
    const d = Math.max(0.5, pos.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3())));
    const w = frac * 2 * d * hTan; sprite.scale.set(w, w * aspect, 1);
    const v = pos.clone().project(camera), lim = Math.max(0, 1 - frac * 0.97 - 0.02), raw = v.x, front = v.z < 1;
    v.x = Math.max(-lim, Math.min(lim, v.x)); v.y = Math.min(0.88, Math.max(-0.88, v.y)); sprite.position.copy(v.unproject(camera));
    return (1 - sm(1.0, 1.25, Math.abs(raw))) * (front ? 1 : 0);
  }

  /* ── particles: fire (additive) and smoke/dust (alpha) as sized points ── */
  const uScale = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  function pointSystem(N, blending) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute('color4', new THREE.BufferAttribute(new Float32Array(N * 4), 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: uScale } }, transparent: true, depthWrite: false, blending,
      vertexShader: `attribute float size; attribute vec4 color4; varying vec4 vC; uniform float uScale;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(size * uScale / max(-mv.z, 0.1), 900.0); gl_Position = projectionMatrix * mv; vC = color4; }`,
      fragmentShader: `varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
        float a = smoothstep(1.0, 0.0, r); a *= a; if (a < 0.003) discard; gl_FragColor = vec4(vC.rgb, vC.a * a); }`,
    });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
    return { pts, N, pos: g.attributes.position, size: g.attributes.size, col: g.attributes.color4, n: 0 };
  }
  const FIRE = pointSystem(4200, THREE.AdditiveBlending), SMOKE = pointSystem(1600, THREE.NormalBlending);
  SMOKE.pts.renderOrder = 1; FIRE.pts.renderOrder = 2;
  const emit = (S, x, y, z, size, r, g, b, a) => {
    if (S.n >= S.N) return; const i = S.n++;
    S.pos.setXYZ(i, x, y, z); S.size.setX(i, size); S.col.setXYZW(i, r, g, b, a);
  };
  const fireColour = (k, hot = 1) => { hot *= 0.42;           // white-yellow → orange → deep red
    if (k < 0.2) return [lerp(2.2, 1.9, k / 0.2) * hot, lerp(1.8, 1.0, k / 0.2) * hot, lerp(1.0, 0.3, k / 0.2) * hot];
    if (k < 0.6) { const u = (k - 0.2) / 0.4; return [lerp(1.9, 1.2, u) * hot, lerp(1.0, 0.35, u) * hot, lerp(0.3, 0.08, u) * hot]; }
    const u = (k - 0.6) / 0.4; return [lerp(1.2, 0.35, u) * hot, lerp(0.35, 0.06, u) * hot, 0.05 * hot];
  };
  // per-particle random tables (fixed, so every frame is reproducible)
  const R = Array.from({ length: 6000 }, () => [rnd(), rnd(), rnd(), rnd(), rnd()]);

  const bikeMatrix = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  const bikeMat = (t, out) => { const s = bikeState(t); return out.compose(new THREE.Vector3(s.x, s.y, s.z), tmpQ.setFromEuler(tmpE.set(s.pitch, s.yaw, s.roll, 'YXZ')), one); };
  const v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), mtmp = new THREE.Matrix4();

  // continuous emitter: count particles cycling with lifetime `life`; spawn(spawnT, rr, out) gives the birth point
  function stream(S, t, { count, life, from, to, offset = 0, spawn, vel, size, colour, alpha }) {
    for (let i = 0; i < count; i++) {
      const rr = R[(offset + i) % R.length], L = life * (0.7 + 0.6 * rr[0]);
      const phase = (i / count) * L, age = ((t - phase) % L + L) % L, born = t - age;
      if (born < from || born > to || age > L) continue;
      const k = age / L;
      spawn(born, rr, v3);
      const vv = vel(rr, born);
      v3.x += vv[0] * age; v3.y += vv[1] * age + (vv[3] || 0) * age * age; v3.z += vv[2] * age;
      const c = colour(k, rr);
      emit(S, v3.x, v3.y, v3.z, size(k, rr), c[0], c[1], c[2], alpha(k, rr));
    }
  }
  const wheelRim = (born, rr, out, which) => {
    bikeMat(born, mtmp);
    const th = rr[1] * Math.PI * 2, rad = WHEEL_R - 0.02;
    return out.set((rr[2] - 0.5) * 0.12, WHEEL_R + rad * Math.sin(th) - 0.55, wheels[which].z + rad * Math.cos(th)).applyMatrix4(mtmp);
  };


  /* post */
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.45, 0.9));
  composer.addPass(new OutputPass());

  /* camera shots (τ) */
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const shoe = V3(0, 0, 0), headW = V3(0, 0, 0), com = V3(0, 0, 0), carC = V3(0, 0, 0);
  const SHOTS = [
    [0, 2.6, t => { const u = E.inOutCubic(range(t, 0.15, 2.4)), look = shoe.clone().lerp(headW, u);
      return { pos: look.clone().add(V3(lerp(1.05, 1.15, u), lerp(0.12, 0.15, u), lerp(-0.05, 0.95, u))), look }; }],
    [2.6, 4.2, t => ({ pos: V3(lerp(4.6, 4.0, range(t, 2.6, 4.2)), 2.0, -6.2), look: V3(-0.6, 1.5, 3.5) })],
    [4.2, 5.0, t => ({ pos: com.clone().add(V3(2.8, 0.25, 3.4)), look: com.clone().add(V3(0, 0.25, 0.8)) })],
    [5.0, 5.4, t => ({ pos: V3(4.2, 1.1, FIN - 8.5), look: V3(0.2, 2.9, FIN) })],
    [5.4, 7.0, t => ({ pos: V3(lerp(5.5, 4.8, range(t, 5.4, 7)), 1.6, FIN + 22), look: com.clone().add(V3(0, -0.2, 0)) })],
    [7.0, 8.25, t => { const b = bikeState(t); return { pos: V3(b.x - 0.6, 1.55, b.z - 3.0), look: headW.clone().add(V3(0, -0.25, 0)) }; }],
    [8.25, 9.65, t => ({ pos: carC.clone().add(V3(2.5, 1.6, 5.2)), look: carC.clone().add(V3(0, 1.4, 0)) })],
    [9.65, T_END + 1, t => { const u = E.inOutCubic(range(t, 9.65, 11.8));
      return { pos: V3(lerp(0.4, -0.2, u), lerp(1.4, 2.2, u), lerp(FIN - 6, FIN - 13, u)), look: V3(-0.6, lerp(2.4, 6.9, u), FIN) }; }],
  ];
  const BLEND = 0.12;
  // two-bone IK: put each hand on its grip (shoulder → elbow 0.30, elbow → hand 0.29)
  const L1 = 0.3, L2 = 0.29, ik = { d: new THREE.Vector3(), u: new THREE.Vector3(), n: new THREE.Vector3(), f: new THREE.Vector3(),
    X: new THREE.Vector3(), Y: new THREE.Vector3(), Z: new THREE.Vector3(), m: new THREE.Matrix4(), tgt: new THREE.Vector3(), pole: new THREE.Vector3() };
  function reach(side, sx) {
    frame.localToWorld(ik.tgt.set(sx * 0.31, 1.15, 0.43));               // grip centre in world space
    J.spine.worldToLocal(ik.tgt);                                         // → spine space (the shoulder's parent)
    const sh = J['shoulder' + side], el = J['elbow' + side];
    ik.d.copy(ik.tgt).sub(sh.position);
    const dist = Math.min(ik.d.length(), (L1 + L2) * 0.999);
    ik.d.normalize();
    const a = Math.acos(THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
    ik.pole.set(sx, -0.4, -0.5);                                          // elbows out, a little down and back
    ik.n.crossVectors(ik.d, ik.pole).normalize();
    const perp = new THREE.Vector3().crossVectors(ik.n, ik.d).normalize();
    ik.u.copy(ik.d).multiplyScalar(Math.cos(a)).addScaledVector(perp, Math.sin(a)).normalize();    // upper-arm direction
    ik.X.copy(ik.n); ik.Y.copy(ik.u).negate(); ik.Z.crossVectors(ik.X, ik.Y).normalize(); ik.X.crossVectors(ik.Y, ik.Z).normalize();
    sh.quaternion.setFromRotationMatrix(ik.m.makeBasis(ik.X, ik.Y, ik.Z));
    ik.f.copy(ik.d).multiplyScalar(dist).addScaledVector(ik.u, -L1).normalize();                     // forearm direction
    el.rotation.set(Math.atan2(-ik.f.dot(ik.Z), -ik.f.dot(ik.Y)), 0, 0);
  }


  const bikeMatrix4 = new THREE.Matrix4();
  return {
    update(tReal) {
      const t = tauAt(tReal);
      /* bike */
      const bs = bikeState(t);
      bike.position.set(bs.x, bs.y, bs.z); bike.rotation.set(bs.pitch, bs.yaw, bs.roll, 'YXZ');
      const roll = bs.z / WHEEL_R + (t > 2.8 && t < T_GO ? (t - 2.8) * 18 : 0);
      wheels.forEach(w => { w.spin.rotation.x = roll; });
      bike.updateMatrixWorld(true);
      /* rider sits on the bike: same transform, seat offset */
      man.system.position.copy(bike.position).add(new THREE.Vector3(0, -0.52, -0.22).applyEuler(bike.rotation));
      man.system.rotation.copy(bike.rotation); man.body.rotation.set(0, 0, 0);
      man.applyPose(KEYS, t); man.system.updateMatrixWorld(true);
      reach('L', 1); if (!WAVE_ON(t)) reach('R', -1); man.system.updateMatrixWorld(true);
      com.set(0, 1, 0).applyMatrix4(man.system.matrixWorld);
      man.shoe('L', shoe); J.head.localToWorld(headW.set(0, 0.17, 0.05));

      /* car */
      const cs = carState(t);
      car.position.set(cs.x, cs.bob, cs.z); carC.copy(car.position);
      hood.rotation.x = -1.1 * E.outBack(range(t, T_STALL, T_STALL + 0.35));

      /* lights */
      LAMP[0].m.material.color.copy(t > T_RED && t < T_GO ? LAMP[0].on : LAMP[0].off);
      LAMP[1].m.material.color.copy(t > T_YEL && t < T_GO ? LAMP[1].on : LAMP[1].off);
      LAMP[2].m.material.color.copy(t > T_GO && t < T_GO + 2.5 ? LAMP[2].on : LAMP[2].off);
      const on = t < T_SIGN ? 0 : t > T_SIGN + 0.75 ? 1 : [0, 1, 0, 0, 1, 1, 0, 1, 1, 0.4, 1, 1][Math.floor((t - T_SIGN) / 0.0625)] ?? 1;
      signOn.opacity = on; pinkL.intensity = 30 * on;
      moon.target.position.copy(com); moon.position.copy(com).add(new THREE.Vector3(-20, 40, -10));

      /* particles */
      FIRE.n = SMOKE.n = 0;
      const racing = t > T_GO - 0.1 && t < T_FIN + 1.2, hot = t > 2.8;
      [0, 1].forEach(which => stream(FIRE, t, { count: 220, life: 0.32, offset: which * 600, from: T_GO - 0.1, to: T_FIN + 1.2,
        spawn: (born, rr, out) => wheelRim(born, rr, out, which), vel: rr => [(rr[3] - 0.5) * 0.8, 1.0 + rr[4] * 1.4, -0.6],
        size: (k, rr) => (0.18 + 0.24 * rr[4]) * (0.6 + 0.9 * k), colour: k => fireColour(k), alpha: k => Math.pow(1 - k, 1.4) * 0.6 }));
      [0, 1].forEach(e => stream(FIRE, t, { count: 140, life: 0.24, offset: 1300 + e * 300, from: 2.8, to: T_FIN + 0.6,
        spawn: (born, rr, out) => { bikeMat(born, mtmp); return out.set(EXHAUST[e][0], EXHAUST[e][1] - 0.55, EXHAUST[e][2]).applyMatrix4(mtmp); },
        vel: rr => [(rr[1] - 0.5) * 1.0, 0.4 + rr[2], -3 - rr[3] * 3], size: (k, rr) => (0.2 + 0.24 * rr[4]) * (0.6 + 1.5 * k) * (t < T_GO ? 0.7 : 1.2),
        colour: k => fireColour(k * 0.85, 1.4), alpha: k => Math.pow(1 - k, 1.1) * 0.75 }));
      // burnout smoke at the line, skid smoke on the drift
      stream(SMOKE, t, { count: 160, life: 1.4, offset: 2000, from: 3.0, to: T_GO + 0.3,
        spawn: (born, rr, out) => out.set(LANE_H + (rr[1] - 0.5) * 0.5, 0.15, -WHEEL_Z + (rr[2] - 0.5) * 0.4), vel: rr => [(rr[3] - 0.5) * 2.2, 0.5 + rr[4], -0.8 - rr[0]],
        size: k => 0.4 + 1.8 * k, colour: () => [0.75, 0.76, 0.8], alpha: k => 0.35 * (1 - k) });
      stream(SMOKE, t, { count: 200, life: 1.6, offset: 2300, from: T_FIN + 0.2, to: T_FIN + 1.6,
        spawn: (born, rr, out) => { bikeMat(born, mtmp); return out.set((rr[1] - 0.5) * 0.3, 0.15 - 0.55, -WHEEL_Z).applyMatrix4(mtmp); },
        vel: rr => [(rr[3] - 0.5) * 2.0, 0.6 + rr[4], (rr[0] - 0.5) * 2.0], size: k => 0.5 + 2.2 * k, colour: () => [0.78, 0.8, 0.84], alpha: k => 0.4 * (1 - k) });
      // the old car's wheezing exhaust, then a steam burst when it stalls
      stream(SMOKE, t, { count: 160, life: 2.2, offset: 2600, from: 0, to: T_STALL,
        spawn: (born, rr, out) => { const c = carState(born); return out.set(c.x + 0.55, 0.42, c.z - 2.2); }, vel: rr => [(rr[1] - 0.5) * 0.6, 0.5 + rr[2] * 0.6, -0.6 - rr[3] * 0.5],
        size: k => 0.35 + 1.9 * k, colour: k => [lerp(0.28, 0.5, k), lerp(0.28, 0.5, k), lerp(0.3, 0.52, k)], alpha: k => 0.55 * (1 - k) });
      stream(SMOKE, t, { count: 220, life: 2.6, offset: 2900, from: T_STALL, to: T_END,
        spawn: (born, rr, out) => out.set(cs.x + (rr[1] - 0.5) * 1.0, 1.2, cs.z + 1.2 + (rr[2] - 0.5) * 1.0), vel: (rr, born) => [(rr[3] - 0.5) * 0.8, (born - T_STALL < 0.4 ? 3.5 : 1.6) + rr[4], (rr[0] - 0.5) * 0.8],
        size: k => 0.4 + 2.6 * k, colour: () => [0.88, 0.9, 0.94], alpha: k => 0.55 * (1 - k) });
      for (const S of [FIRE, SMOKE]) { for (let i = S.n; i < S.N; i++) S.size.setX(i, 0); S.pos.needsUpdate = S.size.needsUpdate = S.col.needsUpdate = true; }

      /* camera */
      let pos = null, look = null, wsum = 0;
      SHOTS.forEach(([a, b, f], i) => {
        if (t < a - BLEND || t > b + BLEND) return;
        const w = (i === 0 ? 1 : sm(a - BLEND, a + BLEND, t)) * (i === SHOTS.length - 1 ? 1 : 1 - sm(b - BLEND, b + BLEND, t)); if (w <= 0) return;
        const s = f(t); if (!pos) { pos = s.pos.multiplyScalar(w); look = s.look.multiplyScalar(w); } else { pos.addScaledVector(s.pos, w); look.addScaledVector(s.look, w); } wsum += w;
      });
      pos.multiplyScalar(1 / wsum); look.multiplyScalar(1 / wsum);
      const shake = t > T_GO && t < T_FIN ? 0.03 : 0;
      pos.x += wiggle(t, 12, 1) * shake + wiggle(t, 0.5, 3) * 0.02; pos.y += wiggle(t, 14, 2) * shake + wiggle(t, 0.4, 5) * 0.02;
      camera.position.copy(pos); camera.lookAt(look); camera.updateMatrixWorld(true);

      /* tags (after the camera, so they're sized and kept in frame for this view) */
      drawHero(heroTimer(t), t >= T_FIN);
      const vH = fitTag(heroSpr, headW.clone().add(new THREE.Vector3(0, 0.75, 0)), 0.62, 220 / 1024);
      heroSpr.material.opacity = sm(T_RED - 0.1, T_RED + 0.15, t) * (1 - sm(9.5, 9.7, t)) * vH;
      drawCar(carTimer(t), t >= T_STALL);
      const vC = fitTag(carSpr, carC.clone().add(new THREE.Vector3(0, 2.6, 0)), 0.7, 420 / 1024);
      carSpr.material.opacity = sm(2.6, 2.85, t) * (1 - sm(11.2, 11.5, t)) * vC;
      const vS = fitTag(startSpr, new THREE.Vector3(-0.55, 4.2, 2.2), 0.5 * (1 + 0.25 * Math.exp(-6 * Math.max(0, t - T_GO))), 300 / 1024);
      startSpr.material.opacity = sm(T_GO, T_GO + 0.04, t) * (1 - sm(T_GO + 0.45, T_GO + 0.6, t)) * vS;
    },
    render() { composer.render(); },
  };
}
