// BRIEF — "Droga na szczyt" (the road to the top). Dawn above a sea of clouds. The elvladislavo character
// (with the photo costume from costume.js) CLIMBS a low-poly mountain hand over hand: four-limb IK on little
// pastel climbing holds, one vertical pitch between each pair of ledges. Every ledge is a design step with
// its own look and a tag that turns green when he steps onto it. One flashy, glittering ledge is a trap
// ("Efekty dla efektu"): it shakes, and as he grabs the rock it crumbles into the clouds. The last pitch ends
// with a mantle onto the summit; he plants a flag, the sun comes up, and he strikes the fists-out photo pose.
//
// POLISH TEXT (checked): Droga na szczyt · Szkic (sketch) · Siatka (grid) · Typografia · Kolory (colours) ·
//   Efekty dla efektu ✗ (effects for effect's sake) · Prostota ✓ (simplicity) · Testy ✓ (tests) ·
//   Krok po kroku na szczyt. (step by step to the top) · elvladislavo.com (neon, also on the flag)
// BEATS (computed from the stop table below; ≈ 45 s). Climbing rhythm per move: right hand, left hand, high-step
//   right foot, left foot, stand up on the legs; hips shift over the stepping foot, head follows the reaching hand.
//   Holds are knobs of the mountain stone (same palette, flat-shaded).
//   0–4.3   drone swoop down to him at the foot; he looks up
//   then    per ledge: step to the wall · climb 3 moves · step across onto the next ledge · tag ✓ · pose
//   trap    glitter ledge shakes; he grabs the wall, it crumbles away under him
//   summit  mantle over the top edge, plant the flag, sunrise, photo pose; caption + elvladislavo.com
// COLLISION CHECK: setup samples the whole timeline and logs (as [scene] lines) the smallest clearance of his
//   hands, feet, chest and head to the rock, and of every prop to the rock. Anything under the limit is listed.
//
// Render: node .claude/skills/text-to-3d-motion/scripts/render.mjs motion/stickman-summit/scene.js --width 1080 --height 1920 --out summit.mp4
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease, key, range, wiggle } from '/lib/motion.js';
import { buildStickman } from '/assets/stickman.js';
import { dressUp } from '/assets/costume.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const wrap = (prev, target) => { let d = target - prev; d = ((d + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return prev + d; };

/* ───────────── mountain + stops ───────────── */
const M_BOT = -3, M_TOP = 9.2, R_BOT = 5.6, R_TOP = 1.3;
const Rs = y => R_BOT - (R_BOT - R_TOP) * (y - M_BOT) / (M_TOP - M_BOT);       // nominal surface radius at height y
const SLAB = { w: 1.3, h: 0.25, d: 1.7 }, TOPY = SLAB.h / 2;
const ARC = 2.6;                                                                    // arc distance between ledge centres
const CYC = 0.68, RISE = 0.42, T_OUT = 0.42, T_IN = 0.5, T_MANTLE = 0.75, STAND = 1.4;
const STOP_DEF = [
  { y: 0.0, top: 'rock', pose: 'look' },
  { y: 1.1, top: 'sketch', pose: 'thumbs', name: 'Szkic' },
  { y: 2.2, top: 'grid', pose: 'hips', name: 'Siatka' },
  { y: 3.3, top: 'type', pose: 'point', name: 'Typografia' },
  { y: 4.3, top: 'color', pose: 'thumbs', name: 'Kolory' },
  { y: 5.3, top: 'fx', pose: 'wind', name: 'Efekty dla efektu', fake: true },
  { y: 6.25, top: 'simple', pose: 'hips', name: 'Prostota' },
  { y: 7.2, top: 'test', pose: 'thumbs', name: 'Testy' },
  { y: M_TOP, summit: true },
];
// angles (arc-spaced), timeline
const STOPS = []; {
  let a = -0.5, t = 4.3;
  STOP_DEF.forEach((d, k) => {
    const s = { ...d, k };
    if (k > 0) { const prev = STOPS[k - 1];
      a += ARC / (Rs(prev.y) + 0.75); s.a = d.summit ? a : a;
      prev.colA = prev.a + (a - prev.a) * 0.44;                                          // the climbing line, halfway between the ledges
      const f0 = prev.y + TOPY, f1 = d.summit ? M_TOP - 0.55 : d.y + TOPY;
      prev.N = Math.max(2, Math.ceil((f1 - f0) / RISE)); prev.f0 = f0; prev.f1 = f1;
      prev.cs = prev.leave + T_OUT; prev.ce = prev.cs + prev.N * CYC;
      s.land = prev.ce + (d.summit ? T_MANTLE : T_IN);
      s.leave = d.fake ? s.land + 1.25 : d.summit ? 1e9 : s.land + STAND;
    } else { s.a = a; s.land = -1; s.leave = t; }
    STOPS.push(s);
  });
}
const FAKE = STOPS.find(s => s.fake), SUM = STOPS[STOPS.length - 1];
const SHAKE = [FAKE.land + 0.45, FAKE.leave + 0.15], G_FALL = 7;
const fakeDrop = t => { const u = t - SHAKE[1]; return u > 0 ? 0.5 * G_FALL * u * u : 0; };
const T_FLAG = SUM.land + 0.85, T_SUN = SUM.land, T_END = SUM.land + 6.3;
export const meta = { duration: Math.round(T_END * 30) / 30, fps: 30, background: '#2b1f5c' };

/* ───────────── poses ───────────── */
const P = {
  stand: t => ({ hipsY: 0.95 - 0.004 * Math.sin(t * 2.2), head: [0.02, 0, 0.03 * Math.sin(t * 0.9)], shoulderL: [0, 0, 0.1], shoulderR: [0, 0, -0.1], elbowL: [-0.18, 0, 0], elbowR: [-0.18, 0, 0], hipL: [0, 0, 0.04], hipR: [0, 0, -0.04] }),
  look: t => ({ head: [-0.5, 0, 0], spine: [-0.08, 0, 0], shoulderL: [-0.2, 0, 0.45], elbowL: [-2.2, 0, 0.5], shoulderR: [-0.2, 0, -0.45], elbowR: [-2.2, 0, -0.5], hipL: [0, 0, 0.1], hipR: [0, 0, -0.1] }),
  hips: t => ({ head: [0.02, 0, 0.05 * Math.sin(t * 1.3)], spine: [-0.03, 0, 0], shoulderL: [-0.2, 0, 0.45], elbowL: [-2.2, 0, 0.5], shoulderR: [-0.2, 0, -0.45], elbowR: [-2.2, 0, -0.5], hipL: [0, 0, 0.1], hipR: [0, 0, -0.1] }),
  thumbs: t => ({ head: [0.05, 0, -0.08], shoulderL: [0, 0, 0.1], elbowL: [-0.2, 0, 0], shoulderR: [-1.0 + 0.08 * Math.sin(t * 6), 0, -0.35], elbowR: [-1.75, 0, 0], hipL: [0, 0, 0.05], hipR: [0, 0, -0.05] }),
  point: t => ({ head: [-0.35, 0.3, 0], shoulderL: [-2.55, 0, 0.35], elbowL: [-0.1, 0, 0], shoulderR: [0, 0, -0.12], elbowR: [-0.2, 0, 0] }),
  wind: t => { const w = t * 15;
    return { hipsY: 0.9, head: [0.15, 0.2 * Math.sin(t * 9), 0], spine: [0.1 * Math.sin(t * 7), 0, 0.1 * Math.sin(t * 5)], shoulderL: [Math.sin(w) * 2.2 - 1.2, 0, 0.7], shoulderR: [Math.sin(w + PI) * 2.2 - 1.2, 0, -0.7],
      elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0], hipL: [-0.3, 0, 0.15], kneeL: [0.4, 0, 0], hipR: [-0.1, 0, -0.15], kneeR: [0.3, 0, 0] }; },
  climb: t => ({ hipsY: 0.95, spine: [0.12, 0, 0], head: [-0.4, 0, 0], shoulderL: [-2.2, 0, 0.3], elbowL: [-0.6, 0, 0], shoulderR: [-2.2, 0, -0.3], elbowR: [-0.6, 0, 0],
    hipL: [-0.6, 0, 0.08], kneeL: [1.0, 0, 0], hipR: [-0.6, 0, -0.08], kneeR: [1.0, 0, 0] }),
  raise: t => ({ head: [-0.2, 0, 0], spine: [-0.05, 0, 0], shoulderL: [-3.0, 0, 0.15], elbowL: [-0.2, 0, 0], shoulderR: [0, 0, -0.25], elbowR: [-0.3, 0, 0] }),
  plant: t => ({ hipsY: 0.88, spine: [0.15, 0, 0], head: [0.1, 0, 0], shoulderL: [-0.7, 0, 0.45], elbowL: [-0.3, 0, 0], shoulderR: [0, 0, -0.3], elbowR: [-0.3, 0, 0], hipR: [-0.3, 0, 0], kneeR: [0.4, 0, 0] }),
  flex: t => { const b = Math.max(0, Math.sin((t - SUM.land - 1.6) * 2 * PI)) * sm(SUM.land + 1.6, SUM.land + 1.9, t);    // the photo pose
    return { hipsY: 0.95 - 0.03 * b, spine: [-0.05, 0, 0], head: [-0.08, 0, 0.06 * Math.sin(t * 1.6)], shoulderL: [-0.25, 0, 0.78], elbowL: [-0.55, 0, 0], shoulderR: [-0.25, 0, -0.78], elbowR: [-0.55, 0, 0],
      hipL: [0, 0, 0.12], hipR: [0, 0, -0.12], kneeL: [0.06 * b, 0, 0], kneeR: [0.06 * b, 0, 0] }; },
};
const KEYS = [];
STOPS.forEach((s, k) => {
  if (k === 0) KEYS.push([0, P.stand], [1.4, P.stand], [1.9, P.look]);
  else if (s.summit) KEYS.push([s.land - 0.05, P.climb], [s.land + 0.25, P.stand], [s.land + 0.5, P.raise], [s.land + 0.75, P.raise], [s.land + 0.9, P.plant], [s.land + 1.25, P.plant], [s.land + 1.6, P.flex], [1e9, P.flex]);
  else if (s.fake) KEYS.push([s.land + 0.3, P.stand], [SHAKE[0], P.stand], [SHAKE[0] + 0.2, P.wind]);
  else KEYS.push([s.land + 0.3, P.stand], [s.land + 0.6, P[s.pose]]);
  if (!s.summit) KEYS.push([s.leave - 0.05, k === 0 ? P.look : P[s.pose]], [s.cs, P.climb], [s.ce, P.climb]);
});

/* ───────────── scene ───────────── */
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const portrait = height > width;
  camera.fov = portrait ? 55 : 40; camera.near = 0.05; camera.far = 400; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.0;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z), UP = V3(0, 1, 0);

  const tagFont = new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`), titleFont = new FontFace('Title', `url(${asset('Fruktur.ttf')})`);
  await Promise.all([tagFont.load(), titleFont.load()]); document.fonts.add(tagFont); document.fonts.add(titleFont);

  /* dawn sky, haze, lights */
  { const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#2b1f5c'); gr.addColorStop(0.38, '#7a4aa8'); gr.addColorStop(0.62, '#e2779e'); gr.addColorStop(0.8, '#ffa98a'); gr.addColorStop(1, '#ffd9a8');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; scene.background = tx; }
  scene.fog = new THREE.Fog(0xf0a5a8, 30, 140);
  const hemi = new THREE.HemisphereLight(0xffe2ef, 0x6a4c9c, 1.35); scene.add(hemi);
  const key1 = new THREE.DirectionalLight(0xffd6b0, 2.0); key1.castShadow = true; key1.shadow.mapSize.set(2048, 2048);
  Object.assign(key1.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 40 }); key1.shadow.bias = -0.0004; key1.shadow.normalBias = 0.02;
  scene.add(key1, key1.target);
  const rimL = new THREE.DirectionalLight(0xff9ad0, 0.9); scene.add(rimL, rimL.target);

  const man = dressUp(buildStickman({ seed: 7 })); scene.add(man.system);
  const { J } = man, ramp = man.ramp, ink = man.outlineMat;
  const toon = (c, x = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, ...x });
  const inked = (geo, mat, p = [0, 0, 0], parent = scene, outline = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.castShadow = true; m.receiveShadow = true; parent.add(m); if (outline) m.add(new THREE.Mesh(geo, ink)); return m; };
  const ctex = (w, h, draw, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };

  /* the mountain: low-poly, flat-shaded, snow on top */
  let mountain;
  { const geo = new THREE.CylinderGeometry(R_TOP, R_BOT, M_TOP - M_BOT, 16, 10, false).toNonIndexed();
    geo.translate(0, (M_TOP + M_BOT) / 2, 0);
    const pos = geo.attributes.position, col = [];
    const hash = (x, y, z) => { const h = Math.sin(Math.round(x * 100) * 12.9898 + Math.round(y * 100) * 78.233 + Math.round(z * 100) * 37.719) * 43758.5453; return h - Math.floor(h); };
    const rock = new THREE.Color('#8a6fb0'), rock2 = new THREE.Color('#6f5896'), snow = new THREE.Color('#fff4fa');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z);
      if (r > 0.01 && y < M_TOP - 0.01) { const k = 1 + (hash(x, y, z) - 0.5) * 0.1; pos.setXYZ(i, x * k, y + (hash(z, x, y) - 0.5) * 0.2, z * k); }
    }
    for (let i = 0; i < pos.count; i += 3) {
      const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, h = hash(pos.getX(i), y, pos.getZ(i));
      const c = y > 7.6 + h * 0.8 ? snow : (h < 0.5 ? rock : rock2); for (let j = 0; j < 3; j++) col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    mountain = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, flatShading: true })); mountain.receiveShadow = true; mountain.castShadow = true; scene.add(mountain);
    mountain.add(new THREE.Mesh(geo, ink)); mountain.updateMatrixWorld(true); }

  /* exact rock surface by raycast (so holds, ledges, props and his body sit on the real faceted rock) */
  const ray = new THREE.Raycaster();
  const surfR = (th, y) => {
    if (y >= M_TOP - 0.02) return R_TOP;
    ray.set(V3(Math.sin(th) * 30, y, Math.cos(th) * 30), V3(-Math.sin(th), 0, -Math.cos(th)));
    const hit = ray.intersectObject(mountain, false)[0]; return hit ? 30 - hit.distance : Rs(y);
  };
  // colour of the rock face at (angle, height) — read from the hit face's vertex colour
  const surfColor = (th, y) => { ray.set(V3(Math.sin(th) * 30, Math.min(y, M_TOP - 0.05), Math.cos(th) * 30), V3(-Math.sin(th), 0, -Math.cos(th)));
    const hit = ray.intersectObject(mountain, false)[0], c = mountain.geometry.attributes.color; return hit ? new THREE.Color(c.getX(hit.face.a), c.getY(hit.face.a), c.getZ(hit.face.a)) : new THREE.Color(0x8a6fb0); };
  const out = th => V3(Math.sin(th), 0, Math.cos(th)), tang = th => V3(Math.cos(th), 0, -Math.sin(th));
  const onRock = (th, y, off) => out(th).multiplyScalar(surfR(th, y) + off).setY(y);

  /* far ranges, sea of clouds, sun */
  for (let i = 0; i < 9; i++) { const a = i / 9 * 2 * PI + rnd() * 0.4, r = 55 + rnd() * 35, h = 10 + rnd() * 16;
    const m = new THREE.Mesh(new THREE.ConeGeometry(h * 0.8, h, 6), new THREE.MeshToonMaterial({ color: i % 2 ? 0x9a76c4 : 0xb487c9, gradientMap: ramp, flatShading: true }));
    m.position.set(Math.sin(a) * r, h / 2 - 4, Math.cos(a) * r); m.rotation.y = rnd() * 3; scene.add(m); }
  const clouds = [], cloudM = [toon(0xfff3f6), toon(0xffe0ea), toon(0xf6d8f0)];
  for (let i = 0; i < 90; i++) {
    const a = rnd() * 2 * PI, r = 7.5 + Math.pow(rnd(), 0.7) * 45, g = new THREE.Group(); scene.add(g);
    const n = 3 + Math.floor(rnd() * 3), s = 1.2 + rnd() * 2.2;
    for (let j = 0; j < n; j++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s * (0.6 + rnd() * 0.5), 1), cloudM[j % 3]); b.position.set((j - n / 2) * s * 0.8, rnd() * s * 0.3, (rnd() - 0.5) * s); b.scale.y = 0.6; g.add(b); }
    clouds.push({ g, a, r, y: -1.9 - rnd() * 1.2, sp: 0.004 + rnd() * 0.006 });
  }
  const sunTex = ctex(256, 256, (g, w) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.22, 'rgba(255,236,190,1)'); gr.addColorStop(0.3, 'rgba(255,190,150,0.55)'); gr.addColorStop(1, 'rgba(255,150,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, fog: false, toneMapped: false })); sun.scale.set(70, 70, 1); scene.add(sun);

  /* ledges: UI-card slabs with a design-step top + a prop, set into the real rock */
  const topTex = {
    rock: null,
    sketch: ctex(512, 512, (g, w, h) => { g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7d7890'; g.lineWidth = 7;
      [[40, 40, 432, 60], [40, 140, 200, 200], [270, 140, 202, 44], [270, 206, 202, 44], [270, 272, 140, 68], [40, 400, 432, 60]].forEach(r => g.strokeRect(...r));
      g.beginPath(); g.moveTo(40, 140); g.lineTo(240, 340); g.moveTo(240, 140); g.lineTo(40, 340); g.stroke(); }),
    grid: ctex(512, 512, (g, w, h) => { g.fillStyle = '#fff7fb'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,92,138,0.28)';
      for (let i = 0; i < 6; i++) g.fillRect(24 + i * 80, 0, 64, h); g.strokeStyle = '#ff5c8a'; g.lineWidth = 3; for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }),
    type: ctex(512, 512, (g, w, h) => { g.fillStyle = '#fff9ee'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8b9e6'; g.lineWidth = 3; for (let y = 80; y < h; y += 80) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
      g.fillStyle = '#3b2f5c'; g.font = '150px Tag'; g.fillText('Aa', 40, 230); g.font = '130px Title'; g.fillText('Aa', 270, 400); }),
    color: ctex(512, 512, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); ['#ff5c8a', '#3b2f5c', '#ffd05a', '#22a35a', '#5aa9ff', '#f3e6f1'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(110 + (i % 2) * 290, 100 + Math.floor(i / 2) * 160, 62, 0, 7); g.fill(); }); }),
    fx: ctex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); ['#ff4fd8', '#ffd84f', '#4fffb0', '#4fb8ff', '#b84fff', '#ff4f6a'].forEach((c, i) => gr.addColorStop(i / 5, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) { g.fillStyle = rnd() < 0.5 ? '#ffffff' : '#fff6a0'; const x = rnd() * w, y = rnd() * h, s = 2 + rnd() * 6; g.fillRect(x, y, s, s); } }),
    simple: ctex(512, 512, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff5c8a'; g.beginPath(); g.roundRect(176, 300, 160, 60, 30); g.fill(); }),
    test: ctex(512, 512, (g, w, h) => { g.fillStyle = '#f2fbf5'; g.fillRect(0, 0, w, h); g.strokeStyle = '#22a35a'; g.lineWidth = 34; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(150, 330); g.lineTo(225, 405); g.lineTo(365, 250); g.stroke(); }),
  };
  const sideCol = { rock: 0x7a62a0, sketch: 0xe9e3d6, grid: 0xffd3e1, type: 0xf3e7cc, color: 0xd8e9ff, fx: 0xff7ae0, simple: 0xffffff, test: 0xc9f0d6 };
  const ledges = [], fxChunks = [], SP = [], props = [];
  STOPS.forEach((s, k) => {
    if (s.summit) { SP[k] = V3(Math.sin(s.a) * 0.35, M_TOP, Math.cos(s.a) * 0.35); return; }
    const w = k === 0 ? 2.6 : SLAB.w, d = k === 0 ? 2.2 : SLAB.d;
    // set the slab so its inner edge sits 0.35 m inside the rock at the deepest of three samples across its width
    const inner = Math.max(...[-w / 2, 0, w / 2].map(x => surfR(s.a + x / Rs(s.y), s.y) - (x ? (Rs(s.y) - Math.sqrt(Rs(s.y) ** 2 - x * x)) : 0)));
    const rc = inner - 0.35 + d / 2;
    const g = new THREE.Group(); g.position.copy(out(s.a).multiplyScalar(rc)).setY(s.y); g.rotation.y = s.a; scene.add(g); g.userData.rc = rc;
    const side = toon(sideCol[s.top]), top = topTex[s.top] ? new THREE.MeshToonMaterial({ map: topTex[s.top], gradientMap: ramp }) : side;
    if (s.fake) {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const c = inked(new THREE.BoxGeometry(w / 3 - 0.02, SLAB.h, d / 2 - 0.02), [side, side, top, side, side, side], [(i - 1) * w / 3, 0, (j - 0.5) * d / 2], g);
        fxChunks.push({ m: c, base: c.position.clone(), ph: rnd() * 6, spin: V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(5), delay: rnd() * 0.25, dx: (rnd() - 0.5) * 0.8 });
      }
    } else inked(new RoundedBoxGeometry(w, SLAB.h, d, 2, 0.06), [side, side, top, side, side, side], [0, 0, 0], g);
    ledges[k] = g;
    SP[k] = g.localToWorld(V3(0, TOPY, d / 2 - 0.5));                    // where he stands: 0.5 m in from the outer edge
  });
  // props sit at the back of the slab (between him and the rock), centred, low and shallow
  const propZ = k => { const g = ledges[k]; return g.worldToLocal(onRock(STOPS[k].a, STOPS[k].y + 0.3, 0.32)).z; };
  const addProp = (k, obj, halfW, halfD) => { obj.userData.check = { k, halfW, halfD }; props.push(obj); return obj; };
  { const k = 1, g = ledges[k], z = propZ(k); const pen = inked(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 6), toon(0xffc94d), [0, TOPY + 0.05, z], g); pen.rotation.set(0, 0, PI / 2);
    const tip = inked(new THREE.ConeGeometry(0.045, 0.13, 6), toon(0xf1d0b2), [0, -0.415, 0], pen); tip.rotation.x = PI; addProp(k, pen, 0.45, 0.05); }
  { const k = 2, g = ledges[k], z = propZ(k), fr = new THREE.Group(); fr.position.set(0, TOPY, z); g.add(fr);
    for (let i = 0; i < 4; i++) inked(new THREE.BoxGeometry(0.035, 0.75, 0.035), toon(0xff5c8a), [-0.27 + i * 0.18, 0.375, 0], fr); inked(new THREE.BoxGeometry(0.6, 0.035, 0.035), toon(0xff5c8a), [0, 0.75, 0], fr); addProp(k, fr, 0.3, 0.03); }
  { const k = 3, g = ledges[k], z = propZ(k); const tx = ctex(256, 256, (c, w) => { c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(0, 0, w, w, 30); c.fill(); c.fillStyle = '#3b2f5c'; c.font = '150px Title'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Aa', 128, 136); });
    const wm = toon(0xffffff); addProp(k, inked(new THREE.BoxGeometry(0.6, 0.6, 0.05), [wm, wm, wm, wm, new THREE.MeshToonMaterial({ map: tx, gradientMap: ramp }), wm], [0, TOPY + 0.32, z], g), 0.3, 0.03); }
  { const k = 4, g = ledges[k], z = propZ(k), grp = new THREE.Group(); grp.position.set(0, TOPY, z); g.add(grp);
    [0xff5c8a, 0x3b2f5c, 0xffd05a, 0x22a35a].forEach((c, i) => inked(new RoundedBoxGeometry(0.2, 0.2, 0.2, 2, 0.04), toon(c), [-0.22 + i * 0.15 - (i > 1 ? 0.0 : 0), 0.1 + (i % 2) * 0.2, 0], grp)); addProp(k, grp, 0.35, 0.1); }
  { const k = 7, g = ledges[k], z = propZ(k), grp = new THREE.Group(); grp.position.set(0, TOPY, z); g.add(grp);
    inked(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), toon(0x3b2f5c), [0, 0.4, 0], grp);
    const tx = ctex(256, 256, (c, w) => { c.fillStyle = '#22a35a'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 30; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(70, 130); c.lineTo(110, 172); c.lineTo(190, 86); c.stroke(); });
    const sign = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), new THREE.MeshToonMaterial({ map: tx, gradientMap: ramp, transparent: true })); sign.position.set(0, 0.95, 0.04); grp.add(sign); addProp(k, grp, 0.26, 0.05); }

  /* glitter stars around the fake ledge */
  const starTex = ctex(64, 64, (g) => { g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 8 : 30, a = i / 8 * 2 * PI; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.fill(); });
  const stars = Array.from({ length: 18 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: [0xfff6a0, 0xff9ce8, 0xa0fff0][Math.floor(rnd() * 3)], transparent: true, depthWrite: false, toneMapped: false }));
    s.userData = { off: V3((rnd() - 0.5) * 1.6, 0.15 + rnd() * 1.4, 0.2 + rnd() * 0.7), ph: rnd() * 6 }; scene.add(s); return s; });

  /* climbing: per pitch, four limbs step hold to hold (RH, LF, LH, RF), the body rises in surges */
  // a human rhythm per move: reach right hand, reach left hand, high-step right foot, step left foot,
  // then stand up on the legs (most of the rise comes from the leg push, a little from the pull)
  const LIMBS = { RH: { lat: 1, up: 1.52, ph: 0.0, dur: 0.2, hand: true }, LH: { lat: -1, up: 1.52, ph: 0.22, dur: 0.2, hand: true },
    RF: { lat: 1, up: 0.03, ph: 0.46, dur: 0.17 }, LF: { lat: -1, up: 0.03, ph: 0.66, dur: 0.17 } };
  const cyc = (s, t) => { const u = Math.min(s.N, Math.max(0, (t - s.cs) / CYC)), c = Math.floor(Math.min(u, s.N - 1e-6)); return { c, f: u - c, u }; };
  const sBody = (s, t) => { const { c, f } = cyc(s, t); if (t >= s.ce) return 1;
    return Math.min(1, (c + 0.15 * sm(0.05, 0.42, f) + 0.85 * sm(0.58, 0.98, f)) / s.N); };
  const bmp = (a, b, x) => Math.sin(PI * Math.min(1, Math.max(0, (x - a) / (b - a))));
  // hips shift over the foot that is stepping up / pushing (his right = +tangent while he faces the rock)
  const sway = (s, t) => { if (t < s.cs || t > s.ce) return 0; const { f } = cyc(s, t); return 0.075 * bmp(0.42, 0.72, f) - 0.075 * bmp(0.62, 0.98, f); };
  const feetAt = (s, t) => lerp(s.f0, s.f1, sBody(s, t));
  // body on the wall: hips 0.27 m off the rock at chest height, leaning in to match the slope
  const LEAN = 0.16, WALL_OFF = 0.58;
  const bodyOnWall = (s, f, t = -1) => onRock(s.colA, f + 1.0, WALL_OFF).sub(V3(0, 1, 0)).addScaledVector(tang(s.colA), sway(s, t));
  const holdPoint = (s, limb, f) => {                                            // the hold itself, on the rock
    const L = LIMBS[limb], h = f + L.up, lat = L.lat * (L.hand ? 0.26 : 0.14);
    if (h > M_TOP - 0.05) { const th = s.colA + lat / R_TOP; return { p: out(th).multiplyScalar(R_TOP - 0.04).setY(M_TOP + 0.02), top: true }; }
    const th = s.colA + lat / Math.max(0.8, surfR(s.colA, h)); return { p: onRock(th, h, 0.0), th, top: false };
  };
  // holds: little knobs of the same stone as the mountain (same palette, flat-shaded, no ink line)
  const holdMeshes = [], holdMats = [0x8a6fb0, 0x7b62a2, 0x6f5896].map(c => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, flatShading: true })), holdGeo = new THREE.IcosahedronGeometry(1, 0);
  STOPS.forEach(s => {
    if (s.N == null) return;
    s.moves = {};
    for (const [name, L] of Object.entries(LIMBS)) {
      const list = [{ t0: -1, t1: s.cs - 0.01, ...holdPoint(s, name, s.f0 - (L.hand ? 0.15 : 0.0)) }];
      for (let c = 0; c < s.N; c++) { const t0 = s.cs + (c + L.ph) * CYC, t1 = t0 + L.dur * CYC; list.push({ t0, t1, ...holdPoint(s, name, lerp(s.f0, s.f1, (c + 1) / s.N)) }); }
      s.moves[name] = list;
      list.forEach((m, i) => { if (m.top) return; const fc = surfColor(m.th, m.p.y), hm = new THREE.Mesh(holdGeo, new THREE.MeshToonMaterial({ color: fc.clone().multiplyScalar(0.92 + rnd() * 0.12), gradientMap: ramp, flatShading: true })); hm.castShadow = hm.receiveShadow = true; scene.add(hm);
        hm.scale.set(0.075, 0.05, 0.065); hm.position.copy(m.p).addScaledVector(out(m.th), 0.015); hm.rotation.set(rnd() * 0.6, m.th + rnd() * 0.8, rnd() * 0.6); holdMeshes.push(hm); });
    }
  });
  const limbTarget = (s, name, t) => {
    const list = s.moves[name], L = LIMBS[name]; let i = 0; while (i < list.length - 1 && list[i + 1].t0 <= t) i++;
    const cur = list[i], nx = list[i + 1];
    const grip = m => m.p.clone().addScaledVector(m.top ? UP : out(m.th), m.top ? 0.05 : (L.hand ? 0.1 : 0.2)).add(V3(0, L.hand ? 0.0 : 0.06, 0));
    if (nx && t > nx.t0 && t < nx.t1) { const u = sm(nx.t0, nx.t1, t); return grip(cur).lerp(grip(nx), u).addScaledVector(out(s.colA), (L.hand ? 0.07 : 0.1) * Math.sin(PI * u)); }
    return grip(nx && t >= nx.t1 ? nx : cur);
  };

  /* yaw plan (unwrapped so he always turns the short way) */
  STOPS.forEach((s, k) => { const faceWanted = s.a - 0.5;
    s.face = k === 0 ? faceWanted : wrap(STOPS[k - 1].climbYaw, s.summit ? s.a - 0.1 : faceWanted);
    if (s.N != null) s.climbYaw = wrap(s.face, s.colA + PI); });

  /* his state at time t */
  const heroState = t => {
    for (let k = 0; k < STOPS.length; k++) {
      const s = STOPS[k], prev = STOPS[k - 1];
      if (k > 0 && t < s.land) {                                               // on the pitch below this stop
        const start = SP[k - 1].clone(); if (prev.fake) start.y -= 0;
        if (t < prev.cs) { const u = sm(prev.leave, prev.cs, t), to = bodyOnWall(prev, prev.f0);
          const from = SP[k - 1].clone(); if (prev.fake) from.y -= fakeDrop(prev.leave);
          return { pos: from.lerp(to, u).add(V3(0, 0.12 * Math.sin(PI * u), 0)).addScaledVector(out(prev.colA), 0.25 * Math.sin(PI * u)), yaw: lerp(prev.face, prev.climbYaw, u), lean: LEAN * u, ik: u, pitch: prev }; }
        if (t < prev.ce) return { pos: bodyOnWall(prev, feetAt(prev, t), t), yaw: prev.climbYaw, lean: LEAN, ik: 1, pitch: prev };
        const dur = s.land - prev.ce, u = sm(prev.ce, s.land, t), from = bodyOnWall(prev, prev.f1);
        return { pos: from.lerp(SP[k], u).add(V3(0, (s.summit ? 0.5 : 0.22) * Math.sin(PI * u), 0)).addScaledVector(out(prev.colA), (s.summit ? 0 : 0.25) * Math.sin(PI * u)), yaw: lerp(prev.climbYaw, s.face, sm(prev.ce + dur * 0.35, s.land + 0.25, t)), lean: LEAN * (1 - u), ik: 1 - sm(prev.ce, prev.ce + dur * 0.8, t), pitch: prev };
      }
      if (t < s.leave || s.summit) { const p = SP[k].clone(); let yaw = s.face;
        if (s.fake) { const sh = sm(SHAKE[0], SHAKE[0] + 0.1, t); p.x += 0.02 * Math.sin(t * 70) * sh; p.z += 0.02 * Math.cos(t * 63) * sh; }
        return { pos: p, yaw, lean: 0, ik: 0 }; }
    }
  };

  /* two-bone IK for any limb; the middle joint bends toward `pole` (world direction) */
  function reach(rootN, midN, parent, L1, L2, target, poleW, w) {
    if (w <= 0.001) return;
    const sh = J[rootN], el = J[midN];
    const q0 = sh.quaternion.clone(), e0 = el.rotation.x;
    const rootW = sh.getWorldPosition(V3(0, 0, 0));
    const pole = parent.worldToLocal(rootW.clone().add(poleW)).sub(sh.position).normalize();
    const d = parent.worldToLocal(target.clone()).sub(sh.position);
    const dist = Math.min(d.length(), (L1 + L2) * 0.999); d.normalize();
    const a = Math.acos(THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
    const n = new THREE.Vector3().crossVectors(d, pole).normalize(), perp = new THREE.Vector3().crossVectors(n, d).normalize();
    const u = d.clone().multiplyScalar(Math.cos(a)).addScaledVector(perp, Math.sin(a)).normalize();
    const X = n.clone(), Y = u.clone().negate(), Z = new THREE.Vector3().crossVectors(X, Y).normalize(); X.crossVectors(Y, Z).normalize();
    const qIK = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const f = d.clone().multiplyScalar(dist).addScaledVector(u, -L1).normalize();
    sh.quaternion.copy(q0).slerp(qIK, w); el.rotation.set(lerp(e0, Math.atan2(-f.dot(Z), -f.dot(Y)), w), 0, 0);
    parent.updateMatrixWorld(true);
  }

  /* summit flag */
  const flag = new THREE.Group(); scene.add(flag);
  inked(new THREE.CylinderGeometry(0.025, 0.03, 1.9, 8), toon(0xeeeeee), [0, 0.95, 0], flag);
  inked(new THREE.SphereGeometry(0.05, 10, 8), toon(0xffd05a), [0, 1.92, 0], flag);
  const clothTex = ctex(1024, 512, (g, w, h) => { g.fillStyle = '#ff5c8a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '150px Title'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const f = Math.min(1, 900 / g.measureText('elvladislavo.com').width); g.font = `${150 * f}px Title`; g.fillText('elvladislavo.com', w / 2, h / 2 + 8); });
  const clothGeo = new THREE.PlaneGeometry(1.1, 0.55, 24, 8); clothGeo.translate(0.55, 0, 0);
  const clothBase = clothGeo.attributes.position.array.slice();
  const cloth = new THREE.Mesh(clothGeo, new THREE.MeshToonMaterial({ map: clothTex, gradientMap: ramp, side: THREE.DoubleSide })); cloth.position.set(0.03, 1.58, 0); cloth.castShadow = true; flag.add(cloth);
  // flag stands on his left, a step back, and flies away from him (cloth points further left)
  const flagBase = (() => { const yaw = SUM.face, lft = V3(Math.cos(yaw), 0, -Math.sin(yaw)), fwd = V3(Math.sin(yaw), 0, Math.cos(yaw));
    return SP[SP.length - 1].clone().addScaledVector(lft, 0.78).addScaledVector(fwd, -0.3); })();

  /* tags + captions */
  const STY = {
    open: { bg: '#fbfaf5', fg: '#2b3440', ic: '#7a5cf0' }, right: { bg: '#22a35a', fg: '#ffffff', ic: '#ffffff' },
    wrong: { bg: '#cfccd6', fg: '#77737f', ic: '#77737f', strike: true }, shiny: { bg: '#ffe9fb', fg: '#7a1d6a', ic: '#ff4fd8' },
  };
  function tagTex(text, style, icon) {
    const S = STY[style], H = 200, g0 = document.createElement('canvas').getContext('2d');
    g0.font = '96px Tag'; const tw = g0.measureText(text).width, W = Math.ceil(tw + 210);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = 'rgba(30,10,60,0.25)'; g.beginPath(); g.roundRect(6, 16, W - 8, H - 20, (H - 20) / 2); g.fill();
    g.fillStyle = S.bg; g.beginPath(); g.roundRect(2, 6, W - 10, H - 22, (H - 22) / 2); g.fill();
    const ix = 82, iy = 95; g.strokeStyle = S.ic; g.fillStyle = S.ic; g.lineCap = 'round'; g.lineJoin = 'round';
    if (icon === 'check') { g.lineWidth = 16; g.beginPath(); g.moveTo(ix - 28, iy + 2); g.lineTo(ix - 6, iy + 24); g.lineTo(ix + 30, iy - 20); g.stroke(); }
    else if (icon === 'cross') { g.lineWidth = 15; g.beginPath(); g.moveTo(ix - 22, iy - 22); g.lineTo(ix + 22, iy + 22); g.moveTo(ix + 22, iy - 22); g.lineTo(ix - 22, iy + 22); g.stroke(); }
    else if (icon === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 15 : 38, a = i / 10 * 2 * PI - PI / 2; g.lineTo(ix + Math.cos(a) * r, iy + Math.sin(a) * r); } g.fill(); }
    else { g.lineWidth = 9; g.beginPath(); g.arc(ix, iy, 36, 0, 7); g.stroke(); g.font = '56px Tag'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, ix, iy + 4); }
    g.font = '96px Tag'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = S.fg; g.fillText(text, 150, iy + 4);
    if (S.strike) { g.strokeStyle = '#5d5966'; g.lineWidth = 10; g.beginPath(); g.moveTo(140, iy + 2); g.lineTo(160 + tw, iy - 2); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.aspect = H / W; return t;
  }
  function captionTex(text) {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 240; const g = c.getContext('2d');
    g.font = '96px Tag'; const fs = Math.min(96, 96 * 1180 / g.measureText(text).width); g.font = `${fs}px Tag`;
    const w = g.measureText(text).width + 120, x0 = (1400 - w) / 2;
    g.fillStyle = 'rgba(43,31,92,0.88)'; g.beginPath(); g.roundRect(x0, 30, w, 180, 90); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 700, 124);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.aspect = 240 / 1400; return t;
  }
  function neonTex() {
    const c = document.createElement('canvas'); c.width = 1400; c.height = 320; const g = c.getContext('2d'), txt = 'elvladislavo.com';
    g.font = '200px Title'; const fs = Math.min(200, 200 * 1220 / g.measureText(txt).width); g.font = `${fs}px Title`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [blur, col, lw] of [[60, '#ff2fa0', 14], [30, '#ff5cc0', 10], [12, '#ffb3e6', 6]]) { g.shadowColor = col; g.shadowBlur = blur; g.strokeStyle = col; g.lineWidth = lw; g.strokeText(txt, 700, 170); }
    g.shadowBlur = 16; g.shadowColor = '#ff5cc0'; g.fillStyle = '#fff4fb'; g.fillText(txt, 700, 170);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.aspect = 320 / 1400; return t;
  }
  const mkSprite = tex => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false, opacity: 0 }));
    s.renderOrder = 10; s.userData.aspect = tex.userData.aspect; scene.add(s); return s; };
  let step = 0;
  const tags = STOPS.map((s, k) => s.name ? {
    k, open: mkSprite(tagTex(s.name, s.fake ? 'shiny' : 'open', s.fake ? 'star' : String(++step))),
    res: mkSprite(tagTex(s.name, s.fake ? 'wrong' : 'right', s.fake ? 'cross' : 'check')),
    tOpen: STOPS[k - 1].cs + 0.3, tRes: s.fake ? SHAKE[0] + 0.1 : s.land + 0.25, tOut: s.leave + 0.5,
  } : null).filter(Boolean);
  const caps = { road: mkSprite(captionTex('Droga na szczyt')), steps: mkSprite(captionTex('Krok po kroku na szczyt.')), url: mkSprite(neonTex()) };
  const hTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (width / height), vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const camDir = new THREE.Vector3();
  function fitTag(sprite, pos, frac) {
    const d = Math.max(0.3, pos.clone().sub(camera.position).dot(camera.getWorldDirection(camDir)));
    const w = frac * 2 * d * hTan; sprite.scale.set(w, w * sprite.userData.aspect, 1);
    const v = pos.clone().project(camera), lim = Math.max(0, 1 - frac * 0.97 - 0.02), raw = v.x, front = v.z < 1;
    v.x = Math.max(-lim, Math.min(lim, v.x)); v.y = Math.min(0.7, Math.max(-0.86, v.y)); sprite.position.copy(v.unproject(camera));
    return (1 - sm(1.0, 1.3, Math.abs(raw))) * (front ? 1 : 0);
  }
  const hudR = new THREE.Vector3(), hudU = new THREE.Vector3(), hudF = new THREE.Vector3();
  function hud(sprite, nx, ny, frac) {
    camera.matrixWorld.extractBasis(hudR, hudU, hudF);
    sprite.position.copy(camera.position).addScaledVector(hudF, -1).addScaledVector(hudR, nx * hTan).addScaledVector(hudU, ny * vTan);
    const w = frac * 2 * hTan; sprite.scale.set(w, w * sprite.userData.aspect, 1);
  }

  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera)); composer.addPass(new OutputPass());

  /* camera: drone swoop → smoothed follow (outside the rock, trailing his climb) → summit orbit */
  const heroSmooth = t => { const acc = V3(0, 0, 0); let n = 0; for (let i = -3; i <= 3; i++) { acc.add(heroState(Math.max(0, t + i * 0.12)).pos); n++; } return acc.multiplyScalar(1 / n); };
  const followCam = t => { const p = heroSmooth(t), th = Math.atan2(p.x, p.z), r = Math.max(Rs(p.y) + 5.6, Math.hypot(p.x, p.z) + 4.6);
    return [th - 0.62, r, p.y + 1.75, p.x, p.y + 1.3, p.z]; };
  const camSummit = t => { const v = E.inOutQuad(range(t, SUM.land + 1.4, T_END));
    const f = flagBase.clone().multiplyScalar(0.45).add(SP[SP.length - 1].clone().multiplyScalar(0.55)).add(V3(Math.cos(SUM.face), 0, -Math.sin(SUM.face)).multiplyScalar(0.25 * sm(T_FLAG - 0.3, T_FLAG + 0.6, t)));
    return [lerp(SUM.a - 0.25, SUM.a + 0.4, v), lerp(4.8, 6.8, v), lerp(M_TOP + 1.3, M_TOP + 2.1, v), f.x, M_TOP + lerp(1.35, 1.7, v), f.z]; };
  const polar = c => ({ pos: V3(Math.sin(c[0]) * c[1], c[2], Math.cos(c[0]) * c[1]), look: V3(c[3], c[4], c[5]) });
  const lastPitch = STOPS[STOPS.length - 2];

  function update(t) {
    /* him */
    const st = heroState(t);
    man.system.position.copy(st.pos); man.system.rotation.set(0, st.yaw, 0);
    man.applyPose(KEYS, t); man.body.rotation.x = st.lean; man.system.updateMatrixWorld(true);
    if (st.pitch && st.ik > 0) {
      const s = st.pitch, inw = out(s.colA).negate(), lat = tang(s.colA);
      if (t > s.cs && t < s.ce) { const { f } = cyc(s, t); J.hips.rotation.z += st.ik * (0.06 * bmp(0.42, 0.72, f) - 0.06 * bmp(0.62, 0.98, f)); man.system.updateMatrixWorld(true); }                       // his right = +tangent while facing the rock
      reach('shoulderR', 'elbowR', J.spine, 0.3, 0.3, limbTarget(s, 'RH', t), out(s.colA).multiplyScalar(0.3).add(V3(0, -1, 0)).addScaledVector(lat, 0.3), st.ik);
      reach('shoulderL', 'elbowL', J.spine, 0.3, 0.3, limbTarget(s, 'LH', t), out(s.colA).multiplyScalar(0.3).add(V3(0, -1, 0)).addScaledVector(lat, -0.3), st.ik);
      reach('hipR', 'kneeR', J.hips, 0.44, 0.43, limbTarget(s, 'RF', t), inw.clone().add(V3(0, -0.25, 0)).addScaledVector(lat, 0.22), st.ik);
      reach('hipL', 'kneeL', J.hips, 0.44, 0.43, limbTarget(s, 'LF', t), inw.clone().add(V3(0, -0.25, 0)).addScaledVector(lat, -0.22), st.ik);
      // head follows the reaching hand, glances down at each step; hips tilt a little with the weight shift
      if (t > s.cs && t < s.ce) { const { f } = cyc(s, t);
        J.head.rotation.y += st.ik * (-0.35 * bmp(0.0, 0.24, f) + 0.35 * bmp(0.2, 0.46, f));
        J.head.rotation.x += st.ik * (0.55 * bmp(0.44, 0.86, f) - 0.15 * bmp(0.0, 0.44, f));
        J.head.updateMatrixWorld(true); }
    }

    /* fake ledge: shake, then crumble into the clouds */
    fxChunks.forEach(c => { const sh = sm(SHAKE[0], SHAKE[0] + 0.1, t), u = Math.max(0, t - SHAKE[1] - c.delay);
      c.m.position.copy(c.base).add(V3(0.015 * Math.sin(t * 70 + c.ph) * sh, -0.5 * G_FALL * u * u, c.dx * u));
      c.m.rotation.set(c.spin.x * u, c.spin.y * u, c.spin.z * u); c.m.visible = u < 2.5; });
    stars.forEach(s => { const L = ledges[FAKE.k], d = s.userData;
      s.position.copy(L.position).add(d.off.clone().applyAxisAngle(UP, FAKE.a)).add(V3(0, -fakeDrop(t), 0));
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + d.ph * 3); s.scale.setScalar(0.08 + 0.1 * tw); s.material.opacity = sm(FAKE.land - 1.4, FAKE.land - 0.8, t) * (1 - sm(SHAKE[1], SHAKE[1] + 0.6, t)) * (0.4 + 0.6 * tw); });

    clouds.forEach(c => { const a = c.a + c.sp * t; c.g.position.set(Math.sin(a) * c.r, c.y + 0.1 * Math.sin(t * 0.5 + c.a * 3), Math.cos(a) * c.r); });

    /* flag */
    flag.position.copy(flagBase).setY(M_TOP - 1.9 * (1 - E.outBack(range(t, T_FLAG, T_FLAG + 0.5)))); flag.rotation.y = SUM.face; flag.visible = t > T_FLAG - 0.05;
    { const pa = clothGeo.attributes.position; for (let i = 0; i < pa.count; i++) { const x = clothBase[i * 3], y = clothBase[i * 3 + 1];
        pa.setXYZ(i, x, y - 0.05 * x * x, 0.07 * x * Math.sin(x * 6 - t * 7) + 0.02 * Math.sin(y * 9 + t * 5)); } pa.needsUpdate = true; clothGeo.computeVertexNormals(); }

    /* camera */
    let c;
    if (t < 4.0) { const u = E.inOutCubic(range(t, 0, 4.0)), c0 = [-1.6, 30, 16, 0, 6, 0], c1 = followCam(4.0);
      c = c0.map((v, i) => lerp(v, c1[i], u)); c[2] += 3 * Math.sin(PI * u); }
    else c = followCam(t);
    if (t > lastPitch.ce - 0.6) { const w = E.inOutCubic(range(t, lastPitch.ce - 0.6, SUM.land + 1.4)), b = camSummit(t); b[0] = wrap(c[0], b[0]); c = c.map((v, i) => lerp(v, b[i], w)); }
    const cp = polar(c); cp.pos.x += wiggle(t, 0.3, 3) * 0.03; cp.pos.y += wiggle(t, 0.25, 5) * 0.025;
    camera.position.copy(cp.pos); camera.lookAt(cp.look); camera.updateMatrixWorld(true);

    /* light follows the action from the camera side */
    const hp = st.pos, ca = c[0];
    key1.position.set(hp.x + Math.sin(ca - 0.7) * 8, hp.y + 9, hp.z + Math.cos(ca - 0.7) * 8); key1.target.position.copy(hp);
    rimL.position.set(hp.x - Math.sin(ca) * 8, hp.y + 3, hp.z - Math.cos(ca) * 8); rimL.target.position.copy(hp);

    /* sunrise behind the summit, opposite the camera */
    { const sa = SUM.a + PI + 0.1, el = lerp(-0.12, 0.13, E.outCubic(range(t, T_SUN, T_END - 1)));
      sun.position.set(Math.sin(sa) * 150, M_TOP + 150 * Math.tan(el), Math.cos(sa) * 150); sun.material.opacity = sm(T_SUN - 1, T_SUN + 0.5, t);
      hemi.intensity = lerp(1.35, 1.6, sm(T_SUN, T_SUN + 3, t)); }

    /* tags */
    tags.forEach(g => { const s = STOPS[g.k], anchor = SP[g.k].clone().add(V3(0, 2.5, 0));
      const inA = sm(g.tOpen, g.tOpen + 0.3, t), fx = sm(g.tRes, g.tRes + 0.2, t), outA = 1 - sm(g.tOut - 0.3, g.tOut, t);
      const pop = t > g.tRes ? 1 + (s.fake ? -0.06 : 0.14) * Math.exp(-5 * (t - g.tRes)) * Math.cos((t - g.tRes) * 12) : 1;
      const popIn = 0.6 + 0.4 * E.outBack(range(t, g.tOpen, g.tOpen + 0.35)), frac = Math.min(0.82, 0.22 + 0.036 * s.name.length) * popIn;
      g.open.material.opacity = inA * (1 - fx) * outA * fitTag(g.open, anchor, frac);
      g.res.material.opacity = fx * outA * fitTag(g.res, anchor, frac * pop); });

    /* captions */
    hud(caps.road, 0, 0.78, 0.92 * (0.85 + 0.15 * E.outBack(range(t, 0.7, 1.1)))); caps.road.material.opacity = sm(0.7, 1.0, t) * (1 - sm(3.7, 4.0, t));
    const tc = SUM.land + 1.7;
    hud(caps.steps, 0, 0.8, 0.9 * (0.85 + 0.15 * E.outBack(range(t, tc, tc + 0.4)))); caps.steps.material.opacity = sm(tc, tc + 0.3, t);
    hud(caps.url, 0, 0.6, 0.95 * (0.8 + 0.2 * E.outBack(range(t, tc + 0.6, tc + 1.1)))); caps.url.material.opacity = sm(tc + 0.6, tc + 0.9, t) * (0.92 + 0.08 * Math.sin(t * 9) * Math.sin(t * 23));
  }

  /* ── collision check: sample the timeline, measure clearance to the rock and between tags ── */
  {
    const clear = p => p.y >= M_TOP - 0.02 ? 1 : Math.hypot(p.x, p.z) - surfR(Math.atan2(p.x, p.z), p.y);
    const parts = {
      handL: [J.elbowL, V3(0, -0.29, 0), 0.04], handR: [J.elbowR, V3(0, -0.29, 0), 0.04],
      shoeL: [J.kneeL, V3(0, -0.43, 0.15), 0.05], shoeR: [J.kneeR, V3(0, -0.43, 0.15), 0.05], heelL: [J.kneeL, V3(0, -0.45, -0.07), 0.05], heelR: [J.kneeR, V3(0, -0.45, -0.07), 0.05],
      kneeL: [J.kneeL, V3(0, 0, 0.0), 0.05], kneeR: [J.kneeR, V3(0, 0, 0.0), 0.05],
      chest: [J.spine, V3(0, 0.3, 0.08), 0.0], belly: [J.spine, V3(0, 0.05, 0.08), 0.0], head: [J.head, V3(0, 0.15, 0.15), 0.0], hair: [J.head, V3(0, 0.3, 0.05), 0.0],
    };
    const worst = {}; let bad = [];
    for (let t = 4.0; t < SUM.land + 0.3; t += 1 / 15) {
      update(t); const st = heroState(t);
      for (const [name, [j, off, rad]] of Object.entries(parts)) {
        const p = j.localToWorld(off.clone()), c = clear(p) - rad;
        // on a ledge the feet are allowed on the slab; only rock counts
        if (!worst[name] || c < worst[name].c) worst[name] = { c, t };
        if (c < -0.01) bad.push(`${name}@${t.toFixed(2)}:${c.toFixed(3)}`);
      }
      // inside any ledge slab (the solid ones; standing on top is fine)?
      for (const [name, [j, off]] of Object.entries(parts)) { const p = j.localToWorld(off.clone());
        ledges.forEach((g, k) => { if (!g || (STOPS[k].fake && t > SHAKE[1])) return; const w = k === 0 ? 2.6 : SLAB.w, d = k === 0 ? 2.2 : SLAB.d, q = g.worldToLocal(p.clone());
          if (Math.abs(q.x) < w / 2 && Math.abs(q.z) < d / 2 && q.y < TOPY - 0.03 && q.y > -TOPY - 0.05) bad.push(`${name}-in-ledge${k}@${t.toFixed(2)}`); }); }
      // two tags at once?
      const vis = tags.filter(g => g.open.material.opacity > 0.05 || g.res.material.opacity > 0.05);
      if (vis.length > 1) bad.push(`2tags@${t.toFixed(2)}`);
    }
    if (0) for (const tt of [28.5, 28.6, 28.7]) { update(tt); const st = heroState(tt), s = st.pitch; for (const [n, el] of [['LH', J.elbowL], ['RH', J.elbowR]]) { const tg = limbTarget(s, n, tt), hw = el.localToWorld(V3(0, -0.29, 0)), sw = J['shoulder' + n[0]].getWorldPosition(V3(0,0,0));
      console.log(`[scene] dbg ${tt} ${n} target clr ${clear(tg).toFixed(3)} hand clr ${clear(hw).toFixed(3)} reach ${sw.distanceTo(tg).toFixed(3)} miss ${hw.distanceTo(tg).toFixed(3)}`); } }
    console.log('[scene] min clearance to rock (m):', Object.entries(worst).map(([n, w]) => `${n} ${w.c.toFixed(3)}@${w.t.toFixed(1)}`).join(' · '));
    console.log('[scene] clipping frames:', bad.length ? bad.slice(0, 40).join(' ') + (bad.length > 40 ? ` … (+${bad.length - 40})` : '') : 'none');
    // props: their back face vs the rock, at both ends
    props.forEach(o => { const { k, halfW, halfD } = o.userData.check; o.updateMatrixWorld(true);
      const res = [-halfW, 0, halfW].map(x => { const p = o.parent.localToWorld(o.position.clone().add(V3(x, 0.05, -halfD))); return clear(p); });
      console.log(`[scene] prop on ledge ${k} (${STOPS[k].name}) rock clearance: ${res.map(v => v.toFixed(3)).join(' / ')}`); });
    // ledges: the slab's back edge must be inside the rock everywhere (no floating gap)
    ledges.forEach((g, k) => { if (!g) return; const w = k === 0 ? 2.6 : SLAB.w, d = k === 0 ? 2.2 : SLAB.d;
      const res = [-w / 2, 0, w / 2].map(x => clear(g.localToWorld(V3(x, 0, -d / 2))));
      console.log(`[scene] ledge ${k} back edge vs rock (negative = embedded): ${res.map(v => v.toFixed(2)).join(' / ')}`); });
    console.log('[scene] stops', STOPS.map(s => `${s.name || (s.summit ? 'summit' : 'start')} land ${s.land.toFixed(2)}`).join(' · '), '· end', T_END.toFixed(2));
  }

  return { update, render() { composer.render(); } };
}
