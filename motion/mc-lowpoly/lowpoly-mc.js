// lowpoly-mc.js — the MC as a PS1-style low-poly model, built to the "low poly explainer" recipe:
//   1. low poly: under 300 triangles, flat shading (boxes only, MeshLambert with flatShading)
//   2. every texture is 64 × 64 px, painted by code, sampled with NearestFilter (no smoothing)
//   3. meant to be rendered at 270 × 480 and upscaled with nearest-neighbour
//   4. vertices snap to a screen grid (psx() patches the vertex shader); the scene dithers the colours in a post pass
// Look (from the street photo): curly mullet, beard + moustache, slim black shades, long camel double-breasted coat,
// white shirt, red patterned tie, black trousers with one white side stripe, red croc shoes.
//
//   import { buildLowPolyMC, PSX, psx, tex64 } from '/assets/lowpoly-mc.js';
//   const mc = buildLowPolyMC(); scene.add(mc.root); mc.setPose(pose); mc.talk(open); mc.triangles  // ≤ 300
// Coordinates: feet at y = 0, facing +z, about 1.95 m tall with the hair.
// Joints: hips torso head shoulderL/R elbowL/R hipL/R kneeL/R (Groups). Same sign conventions as stickman.js:
//   hip x < 0 swings the leg forward, knee x > 0 bends it; shoulder x < 0 raises the arm forward,
//   shoulder z > 0 (L) / < 0 (R) lifts the arm out sideways; elbow x < 0 bends the forearm forward.
import * as THREE from 'three';

/* ── PS1 vertex snapping: shared uniform, grid in NDC cells (set it to half the render size) ── */
export const PSX = { snap: { value: new THREE.Vector2(135, 240) } };
export function psx(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uSnap = PSX.snap;
    sh.vertexShader = 'uniform vec2 uSnap;\n' + sh.vertexShader.replace('#include project_vertex',
      '#include project_vertex\n  { vec4 s = gl_Position; s.xy = floor(s.xy / s.w * uSnap + 0.5) / uSnap * s.w; gl_Position = s; }');
  };
  return mat;
}

/* ── 64-px textures painted by code ── */
let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export function tex64(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}
export const px = (g, col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
export const speckle = (g, base, spots, n, x0 = 0, y0 = 0, w = 64, h = 64) => {
  px(g, base, x0, y0, w, h);
  for (let i = 0; i < n; i++) px(g, spots[i % spots.length], x0 + Math.floor(rnd() * w), y0 + Math.floor(rnd() * h), 1 + (rnd() < 0.3 ? 1 : 0), 1);
};
const CAMEL = '#b09a7c', CAMEL_S = ['#9c8668', '#c4ae8e', '#8c7658'];

function paintFace(g, open) {
  speckle(g, '#f1c9a5', ['#e8bb95', '#f6d6b6'], 60);
  speckle(g, '#5a3018', ['#6e3c1e', '#48260f'], 90, 6, 36, 52, 28);           // beard, lower part of the face
  px(g, '#f1c9a5', 18, 36, 28, 4);                                            // cheeks above the beard line
  px(g, '#4a260f', 16, 38, 32, 4);                                            // moustache
  px(g, '#4a260f', 14, 40, 4, 4); px(g, '#4a260f', 46, 40, 4, 4);
  if (open) { px(g, '#5c0f14', 25, 44, 14, 8); px(g, '#f4f0ea', 27, 44, 10, 2); px(g, '#d0484c', 28, 50, 8, 2); }
  else px(g, '#2a120a', 25, 46, 14, 2);
  px(g, '#e2b28c', 29, 26, 6, 9); px(g, '#c99a76', 29, 33, 6, 2);           // nose
  px(g, '#4a260f', 10, 13, 16, 3); px(g, '#4a260f', 38, 13, 16, 3);         // brows (shades sit just below)
  speckle(g, '#4b2a16', ['#7d4521', '#3a1f0f'], 40, 0, 0, 64, 9);            // fringe curls along the top
  for (let x = 0; x < 64; x += 6) px(g, '#4b2a16', x, 9, 4, 2);
}

export function buildLowPolyMC() {
  const T = {
    faceShut: tex64(g => paintFace(g, false)), faceOpen: tex64(g => paintFace(g, true)),
    skin: tex64(g => { speckle(g, '#f1c9a5', ['#e8bb95', '#f6d6b6'], 70); speckle(g, '#5a3018', ['#6e3c1e'], 50, 0, 40, 64, 24); }),
    hair: tex64(g => { px(g, '#3e2210', 0, 0, 64, 64);
      for (let i = 0; i < 70; i++) { const x = Math.floor(rnd() * 64), y = Math.floor(rnd() * 64), c = rnd() < 0.5 ? '#7d4521' : '#5e3318';
        px(g, c, x, y, 3, 1); px(g, c, x - 1, y + 1, 1, 2); px(g, c, x + 3, y + 1, 1, 2); px(g, c, x, y + 3, 3, 1); } }),
    shades: tex64(g => { px(g, '#0b0b10', 0, 0, 64, 64); px(g, '#c9ccd4', 28, 0, 8, 64);
      px(g, '#3c4458', 6, 14, 10, 6); px(g, '#3c4458', 42, 14, 10, 6); px(g, '#8890a4', 8, 16, 4, 2); px(g, '#8890a4', 44, 16, 4, 2); }),
    coatFront: tex64(g => { speckle(g, CAMEL, CAMEL_S, 260);
      // open V: white shirt, red patterned tie, wide lapels
      for (let y = 0; y < 40; y++) { const half = Math.max(0, 15 - Math.floor(y * 0.38)); px(g, '#f4f1ea', 32 - half, y, half * 2, 1); }
      for (let y = 0; y < 40; y++) { const half = Math.max(0, 15 - Math.floor(y * 0.38)); px(g, '#7c6a50', 32 - half - 3, y, 3, 1); px(g, '#7c6a50', 32 + half, y, 3, 1); }
      px(g, '#b8141e', 29, 2, 6, 5); for (let y = 7; y < 38; y++) { const w = y < 32 ? 4 + Math.floor((y - 7) / 10) : 6 - (y - 32); px(g, '#c8141e', 32 - Math.ceil(w / 2), y, w, 1); }
      for (let y = 9; y < 36; y += 4) px(g, '#e2b54a', 31, y, 2, 1);
      px(g, '#f4f1ea', 26, 0, 4, 4); px(g, '#f4f1ea', 34, 0, 4, 4);                // collar points
      for (const [x, y] of [[23, 44], [39, 44], [23, 53], [39, 53]]) { px(g, '#2a2018', x, y, 3, 3); px(g, '#4a3a2a', x, y, 1, 1); }
      px(g, '#7c6a50', 8, 50, 12, 2); px(g, '#7c6a50', 44, 50, 12, 2);             // flap pockets
      px(g, '#7c6a50', 46, 22, 9, 1); }),
    coat: tex64(g => { speckle(g, CAMEL, CAMEL_S, 260); px(g, '#8c7658', 31, 0, 2, 64); }),
    skirt: tex64(g => { speckle(g, CAMEL, CAMEL_S, 260); px(g, '#141418', 28, 0, 8, 64); px(g, '#7c6a50', 26, 0, 2, 64); px(g, '#7c6a50', 36, 0, 2, 64); }),
    sleeve: tex64(g => { speckle(g, CAMEL, CAMEL_S, 240); px(g, '#8c7658', 0, 30, 64, 1); }),
    forearm: tex64(g => { speckle(g, CAMEL, CAMEL_S, 200); px(g, '#f4f1ea', 0, 54, 64, 10); px(g, '#7c6a50', 0, 52, 64, 2); }),
    trousers: tex64(g => { speckle(g, '#16161b', ['#22222a', '#0e0e12'], 120); }),
    trouserSide: tex64(g => { speckle(g, '#16161b', ['#22222a', '#0e0e12'], 120); px(g, '#ecebe6', 28, 0, 8, 64); }),
    shoe: tex64(g => { px(g, '#5a050b', 0, 0, 64, 64);
      for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 ? -4 : 0; x < 64; x += 10) { px(g, '#c4141f', x + 1, y + 1, 8, 6); px(g, '#f0525c', x + 1, y + 1, 3, 1); } }),
    sole: tex64(g => px(g, '#2a0a0c', 0, 0, 64, 64)),
  };
  const lam = t => psx(new THREE.MeshLambertMaterial({ map: t, flatShading: true }));
  const M = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, lam(v)]));

  const root = new THREE.Group(), J = {};
  const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  // box with per-face materials: [+x, -x, +y, -y, +z (front), -z (back)]
  const box = (parent, w, h, d, p, mats, rot) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Array.isArray(mats) ? mats : mats);
    m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };

  const hips = joint('hips', root, 0, 0.92, 0);
  const torso = joint('torso', hips, 0, 0, 0);
  box(torso, 0.46, 0.62, 0.25, [0, 0.31, 0], [M.coat, M.coat, M.coat, M.coat, M.coatFront, M.coat]);
  box(hips, 0.47, 0.44, 0.27, [0, -0.2, 0], [M.coat, M.coat, M.coat, M.coat, M.skirt, M.coat]);           // long coat, open below the buttons

  const head = joint('head', torso, 0, 0.62, 0);
  const face = box(head, 0.27, 0.3, 0.27, [0, 0.16, 0.01], [M.skin, M.skin, M.hair, M.skin, M.faceShut, M.hair]);
  box(head, 0.31, 0.1, 0.31, [0, 0.33, -0.01], M.hair);                                                // curly top
  box(head, 0.31, 0.36, 0.1, [0, 0.12, -0.14], M.hair);                                                // mullet down the back
  box(head, 0.05, 0.2, 0.22, [0.15, 0.2, -0.03], M.hair);                                              // side curls
  box(head, 0.05, 0.2, 0.22, [-0.15, 0.2, -0.03], M.hair);
  box(head, 0.29, 0.055, 0.03, [0, 0.215, 0.15], M.shades);                                            // slim black shades

  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = joint('shoulder' + s, torso, sx * 0.29, 0.56, 0);
    box(sh, 0.12, 0.32, 0.13, [0, -0.14, 0], M.sleeve);
    const el = joint('elbow' + s, sh, 0, -0.3, 0);
    box(el, 0.11, 0.27, 0.12, [0, -0.13, 0], M.forearm);
    box(el, 0.085, 0.1, 0.1, [0, -0.31, 0.01], M.skin);                                                 // hand
    const hp = joint('hip' + s, hips, sx * 0.1, 0, 0);
    box(hp, 0.15, 0.43, 0.16, [0, -0.21, 0], [M.trouserSide, M.trouserSide, M.trousers, M.trousers, M.trousers, M.trousers]);
    const kn = joint('knee' + s, hp, 0, -0.42, 0);
    box(kn, 0.13, 0.4, 0.14, [0, -0.2, 0], [M.trouserSide, M.trouserSide, M.trousers, M.trousers, M.trousers, M.trousers]);
    box(kn, 0.14, 0.09, 0.28, [0, -0.455, 0.05], [M.shoe, M.shoe, M.shoe, M.sole, M.shoe, M.shoe]);    // square-toe croc shoe
  }

  let triangles = 0;
  root.traverse(o => { if (o.isMesh) triangles += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; });

  const ZERO = [0, 0, 0];
  function setPose(p) {
    for (const k of ['hips', 'torso', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR']) J[k].rotation.set(...(p[k] || ZERO));
    J.hips.position.y = 0.92 + (p.drop || 0);
  }
  const talk = open => { const m = open ? M.faceOpen : M.faceShut; face.material[4] = m; };
  return { root, J, M, T, setPose, talk, triangles };
}
