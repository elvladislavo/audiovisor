// BRIEF — "Ogród bez błędów" (a garden without bugs). A quiet morning. The elvladislavo character walks
// his garden path, scrupulously looking for small imperfections. Each one is caused by a little creature
// wearing a code-bug tag; he moves it gently, lets it go, and the imperfection mends itself. No action.
//
// POLISH TEXT (checked): Krzywy margines (crooked margin) · Literówka w kodzie (typo in the code) ·
//   Brakujący średnik (missing semicolon) · garden sign: Czysty kod (clean code) + elvladislavo.com
// STATIONS (τ = seconds)
//   0–3.3   he strolls up the path toward camera, butterflies, low sun
//   3.3–8.6 drooping tulip + beetle "Krzywy margines" → beetle onto his finger, flies off → stem straightens, bloom opens
//   8.6–14  holed rose leaf + ladybird "Literówka w kodzie" → onto his finger, released → the leaf heals
//   14–19.6 snail in a gap in the path "Brakujący średnik" → carried to the grass → the missing stone (with a ";") rises in
//   19.6–end calm crane up over the mended garden to the wooden sign: "Czysty kod" · elvladislavo.com
//
// Render: node .claude/skills/text-to-3d-motion/scripts/render.mjs motion/stickman-garden/scene.js --width 1080 --height 1920 --out garden.mp4
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease, key, range, wiggle } from '/lib/motion.js';
import { buildStickman } from '/assets/stickman.js';

const PI = Math.PI, lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const E = ease;
const T_END = 26.5;
export const meta = { duration: T_END, fps: 30, background: '#cfe3d4' };

/* ───────────── places ───────────── */
const STEM_BASE = [1.45, 0, 1.6], STEM_LEN = 0.62, DROOP = 0.85;
const LEAF = [-1.18, 1.05, 6.6];
const GAP = [0, 0.03, 10.8], SNAIL_DROP = [1.1, 0.03, 10.3];
const T_FIX_A = 6.9, T_FIX_B = 12.6, T_FIX_C = 18.1;

/* ───────────── his path ───────────── */
const HERO = {
  x: [[0, 0], [2.6, 0], [3.4, 0.08], [8.4, 0.08], [9.9, -0.45, E.inOutQuad], [13.6, -0.45], [15.2, 0, E.inOutQuad], [19.6, 0], [21.0, 0.2, E.inOutQuad]],
  z: [[0, -5.5], [3.4, 1.5, E.outQuad], [8.4, 1.5], [9.9, 6.5, E.inOutQuad], [13.6, 6.5], [15.2, 9.95, E.inOutQuad], [19.6, 9.95], [21.0, 11.2, E.inOutQuad]],
  yaw: [[0, 0], [3.4, 0], [3.75, PI / 2], [8.4, PI / 2], [8.7, -0.18], [9.9, -0.18], [10.2, -PI / 2], [13.6, -PI / 2], [13.9, 0.1], [15.2, 0], [16.6, 0], [17.0, 1.2], [17.9, 1.2], [18.3, 0], [21.0, 0], [21.8, PI]],
};
const walk = (t, f = 1.5) => { const p = t * 2 * PI * f, q = Math.sin(p);
  return { hipsY: 0.94 + 0.015 * Math.abs(Math.cos(p)), spine: [0.04, 0, 0], head: [0.05, 0.1 * Math.sin(t * 0.7), 0], hipL: [-0.42 * q, 0, 0.02], hipR: [0.42 * q, 0, -0.02],
    kneeL: [0.12 + 0.55 * Math.max(0, Math.sin(p - 1.2)), 0, 0], kneeR: [0.12 + 0.55 * Math.max(0, Math.sin(p + PI - 1.2)), 0, 0],
    shoulderL: [0.3 * q, 0, 0.12], shoulderR: [-0.3 * q, 0, -0.12], elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0] }; };
const P = {
  walk: t => walk(t),
  stand: t => ({ head: [0.12, 0.08 * Math.sin(t * 0.8), 0], shoulderL: [0, 0, 0.12], shoulderR: [0, 0, -0.12], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0] }),
  crouch: t => ({ hipsY: 0.52, spine: [0.45, 0, 0], head: [0.15 + 0.05 * Math.sin(t * 0.9), 0, 0], hipL: [-1.75, 0, 0.18], kneeL: [2.15, 0, 0], hipR: [-0.35, 0, -0.15], kneeR: [2.2, 0, 0],
    shoulderL: [-0.7, 0, 0.25], elbowL: [-1.2, 0, 0], shoulderR: [-0.6, 0, -0.2], elbowR: [-0.8, 0, 0] }),
  look: t => ({ head: [-0.1, 0, 0], spine: [-0.03, 0, 0], shoulderL: [-0.2, 0, 0.45], elbowL: [-2.2, 0, 0.5], shoulderR: [-0.2, 0, -0.45], elbowR: [-2.2, 0, -0.5],
    hipL: [0, 0, 0.1], hipR: [0, 0, -0.1] }),            // hands on hips, content
};
const KEYS = [[0, P.walk], [3.2, P.walk], [3.5, P.stand], [3.95, P.crouch], [8.0, P.crouch], [8.35, P.stand], [8.5, P.walk], [9.8, P.walk], [10.1, P.stand],
  [13.4, P.stand], [13.6, P.walk], [15.0, P.walk], [15.3, P.stand], [15.75, P.crouch], [18.4, P.crouch], [18.9, P.stand], [19.65, P.stand], [19.8, P.walk], [20.9, P.walk],
  [21.2, P.stand], [22.2, P.look], [T_END + 1, P.look]];

/* ───────────── scene ───────────── */
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const portrait = height > width;
  camera.fov = portrait ? 50 : 38; camera.near = 0.02; camera.far = 400; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.05;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* morning sky, low warm sun, soft haze */
  { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#8ec2e8'); gr.addColorStop(0.65, '#cfe6ef'); gr.addColorStop(1, '#fbe8c8'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; scene.background = tx; }
  scene.fog = new THREE.Fog(0xe8efe2, 25, 90);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6f8f5a, 1.4));
  const sun = new THREE.DirectionalLight(0xffe0b0, 2.3); sun.position.set(-10, 9, -6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  sun.target.position.set(0, 0, 5); scene.add(sun, sun.target);

  const man = buildStickman({ seed: 7 }); scene.add(man.system);
  const { J } = man, ramp = man.ramp, ink = man.outlineMat;
  const toon = (c, x = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, ...x });
  const inked = (geo, mat, p = [0, 0, 0], parent = scene, outline = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.castShadow = true; m.receiveShadow = true; parent.add(m); if (outline) m.add(new THREE.Mesh(geo, ink)); return m; };
  const ctex = (w, h, draw, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };

  /* lawn, stone path, hedges, tree, fence, flowerbeds */
  const grass = ctex(256, 256, (g, w, h) => { g.fillStyle = '#6fa64d'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() < 0.5 ? '#5f9741' : '#82b85c'; g.fillRect(rnd() * w, rnd() * h, 2, 4); } }, 26, 26);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshToonMaterial({ map: grass, gradientMap: ramp })); lawn.rotation.x = -PI / 2; lawn.position.z = 5; lawn.receiveShadow = true; scene.add(lawn);
  const stoneM = toon(0xc9c2b4);
  const stones = [];
  for (let k = 0; k < 26; k++) {
    const z = -6 + 0.8 * k; if (Math.abs(z - GAP[2]) < 0.05) continue;
    const s = inked(new RoundedBoxGeometry(0.85, 0.08, 0.66, 2, 0.05), stoneM, [(rnd() - 0.5) * 0.08, 0.02, z]); s.rotation.y = (rnd() - 0.5) * 0.12; stones.push(s);
  }
  // the missing stone, engraved with a semicolon, waiting below ground
  const semiTex = ctex(256, 200, (g, w, h) => { g.fillStyle = '#c9c2b4'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d766a'; g.font = '170px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(';', w / 2, h / 2 + 8); });
  const semi = inked(new RoundedBoxGeometry(0.85, 0.08, 0.66, 2, 0.05), [stoneM, stoneM, new THREE.MeshToonMaterial({ map: semiTex, gradientMap: ramp }), stoneM, stoneM, stoneM], [0, -0.2, GAP[2]]);
  const hedgeM = toon(0x3f7a3a);
  for (const sx of [-1, 1]) for (let z = -8; z < 16; z += 2.2) { const h = inked(new RoundedBoxGeometry(1.2, 1.1 + rnd() * 0.3, 2.3, 3, 0.3), hedgeM, [sx * 4.4, 0.6, z]); }
  { const trunk = inked(new THREE.CylinderGeometry(0.22, 0.32, 3.2, 10), toon(0x6b4a2f), [-2.8, 1.6, 12.5]);
    for (let i = 0; i < 9; i++) inked(new THREE.IcosahedronGeometry(1.0 + rnd() * 0.5, 1), toon(rnd() < 0.5 ? 0x4f8f45 : 0x5ea052), [-2.8 + (rnd() - 0.5) * 2.4, 3.6 + rnd() * 1.4, 12.5 + (rnd() - 0.5) * 2.4]); }
  const fenceM = toon(0xe9e2d2);
  for (let x = -6; x <= 6; x += 0.5) inked(new THREE.BoxGeometry(0.12, 1.1, 0.06), fenceM, [x, 0.55, 15.6]);
  inked(new THREE.BoxGeometry(12.4, 0.1, 0.05), fenceM, [0, 0.85, 15.55]); inked(new THREE.BoxGeometry(12.4, 0.1, 0.05), fenceM, [0, 0.35, 15.55]);
  // flower beds: tulips + daisies along the path (kept away from the stations)
  const petalCols = [0xf25f7a, 0xffc24d, 0xf7f2e8, 0xb36cf2, 0xff8a3d];
  const flower = (x, z, col, h = 0.5) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    inked(new THREE.CylinderGeometry(0.012, 0.016, h, 6), toon(0x4c8a3a), [0, h / 2, 0], g, false);
    const head = inked(new THREE.SphereGeometry(0.06, 10, 8), toon(col), [0, h + 0.03, 0], g); head.scale.set(1, 1.3, 1); return g; };
  for (let i = 0; i < 140; i++) {
    const side = rnd() < 0.5 ? -1 : 1, x = side * (1.0 + rnd() * 2.6), z = -7 + rnd() * 22;
    if (Math.hypot(x - STEM_BASE[0], z - STEM_BASE[2]) < 0.7 || Math.hypot(x - LEAF[0], z - LEAF[2]) < 1.0 || Math.hypot(x - SNAIL_DROP[0], z - SNAIL_DROP[2]) < 0.6) continue;
    flower(x, z, petalCols[Math.floor(rnd() * petalCols.length)], 0.32 + rnd() * 0.3);
  }

  /* station A: the drooping tulip */
  const tulip = new THREE.Group(); tulip.position.set(...STEM_BASE); scene.add(tulip);
  inked(new THREE.CylinderGeometry(0.014, 0.02, STEM_LEN, 8), toon(0x4c8a3a), [0, STEM_LEN / 2, 0], tulip, false);
  for (const sx of [1, -1]) { const l = inked(new THREE.SphereGeometry(0.1, 10, 8), toon(0x5a9a45), [sx * 0.05, 0.14, 0], tulip); l.scale.set(0.35, 1.3, 0.12); l.rotation.z = -sx * 0.4; }
  const bloom = new THREE.Group(); bloom.position.y = STEM_LEN; tulip.add(bloom);
  const petals = [];
  for (let i = 0; i < 6; i++) { const pv = new THREE.Group(); pv.rotation.y = i / 6 * PI * 2; bloom.add(pv);
    const p = inked(new THREE.SphereGeometry(0.07, 12, 10), toon(i % 2 ? 0xf25f7a : 0xf7768e), [0, 0.06, 0.03], pv); p.scale.set(0.6, 1.3, 0.3); petals.push(pv); }

  /* station B: rose bush with a holed leaf */
  { for (let i = 0; i < 10; i++) inked(new THREE.IcosahedronGeometry(0.32 + rnd() * 0.16, 1), toon(rnd() < 0.5 ? 0x3f7f3c : 0x4d8f45), [LEAF[0] - 0.55 + (rnd() - 0.5) * 0.8, 0.45 + rnd() * 0.8, LEAF[2] + (rnd() - 0.5) * 1.2]);
    for (let i = 0; i < 7; i++) inked(new THREE.IcosahedronGeometry(0.09, 1), toon(0xd8344a), [LEAF[0] - 0.4 + (rnd() - 0.5) * 0.7, 0.75 + rnd() * 0.65, LEAF[2] + (rnd() - 0.5) * 1.0]); }
  const leafTex = hole => ctex(256, 256, (g, w, h) => { g.fillStyle = '#5ea24a'; g.beginPath(); g.ellipse(128, 128, 120, 64, 0, 0, 7); g.fill();
    g.strokeStyle = '#3f7f32'; g.lineWidth = 6; g.beginPath(); g.moveTo(14, 128); g.lineTo(242, 128); g.stroke();
    for (let i = 1; i < 6; i++) { g.lineWidth = 3; g.beginPath(); g.moveTo(14 + i * 38, 128); g.lineTo(34 + i * 38, 88); g.moveTo(14 + i * 38, 128); g.lineTo(34 + i * 38, 168); g.stroke(); }
    if (hole) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(150, 104, 26, 20, 0.4, 0, 7); g.fill(); } });
  const leafGeo = new THREE.PlaneGeometry(0.42, 0.42);
  const leafHole = new THREE.Mesh(leafGeo, new THREE.MeshToonMaterial({ map: leafTex(true), gradientMap: ramp, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  const leafWhole = new THREE.Mesh(leafGeo, new THREE.MeshToonMaterial({ map: leafTex(false), gradientMap: ramp, transparent: true, side: THREE.DoubleSide, opacity: 0 }));
  for (const l of [leafHole, leafWhole]) { l.position.set(...LEAF); l.rotation.set(-0.5, PI / 2 - 0.3, 0); l.castShadow = true; scene.add(l); }
  leafWhole.position.x += 0.002;

  /* the creatures: beetle, ladybird (wings that open), snail */
  function bug(shellCol, spots) {
    const g = new THREE.Group(); scene.add(g);
    const body = inked(new THREE.SphereGeometry(0.03, 14, 10), toon(0x1a1a1c), [0, 0.012, 0], g); body.scale.set(0.8, 0.5, 1.15);
    const head = inked(new THREE.SphereGeometry(0.014, 10, 8), toon(0x1a1a1c), [0, 0.012, 0.032], g);
    const wings = [];
    for (const sx of [1, -1]) {
      const pv = new THREE.Group(); pv.position.set(sx * 0.002, 0.024, 0.012); g.add(pv);
      const shell = inked(new THREE.SphereGeometry(0.026, 12, 8, 0, PI, 0, PI / 2), toon(shellCol), [0, 0, -0.012], pv);
      shell.rotation.set(0, sx > 0 ? -PI / 2 : PI / 2, 0); shell.scale.set(1.15, 0.7, 0.75);
      if (spots) for (let i = 0; i < 2; i++) inked(new THREE.SphereGeometry(0.006, 8, 6), toon(0x111111), [sx * 0.012, 0.012, -0.004 - i * 0.016], pv, false);
      wings.push(pv);
    }
    for (const sx of [1, -1]) for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.03, 4), toon(0x111111)); l.position.set(sx * 0.024, 0.004, -0.012 + i * 0.014); l.rotation.z = sx * 1.2; g.add(l); }
    for (const sx of [1, -1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.03, 4), toon(0x111111)); a.position.set(sx * 0.008, 0.024, 0.05); a.rotation.set(0.9, 0, -sx * 0.4); g.add(a); }
    g.userData.wings = wings; g.scale.setScalar(1.6); return g;
  }
  const beetle = bug(0x2f8f5a, false), ladybird = bug(0xd8242e, true);
  const snail = new THREE.Group(); scene.add(snail);
  { const bodyM = toon(0xd9bc8c);
    const b = inked(new THREE.CapsuleGeometry(0.025, 0.09, 4, 10), bodyM, [0, 0.022, 0], snail); b.rotation.x = PI / 2;
    const shellTex = ctex(128, 128, (g) => { g.fillStyle = '#b8743a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#6e3f1a'; g.lineWidth = 7; g.beginPath(); for (let a = 0; a < 18; a += 0.1) { const r = 3 + a * 3.2; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.stroke(); });
    const shell = inked(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshToonMaterial({ map: shellTex, gradientMap: ramp }), [0, 0.06, -0.015], snail); shell.rotation.y = PI / 2;
    for (const sx of [1, -1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 5), bodyM); st.position.set(sx * 0.01, 0.045, 0.06); st.rotation.x = 0.5; snail.add(st);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), toon(0x1a1a1a)); eye.position.set(sx * 0.01, 0.064, 0.072); snail.add(eye); }
    snail.scale.setScalar(1.7); }

  /* butterflies */
  const butterflies = Array.from({ length: 7 }, (_, i) => {
    const g = new THREE.Group(); scene.add(g); const col = [0xffc24d, 0xffffff, 0x8fd0ff, 0xff9ac2][i % 4];
    const wings = [1, -1].map(sx => { const pv = new THREE.Group(); g.add(pv); const w = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), new THREE.MeshToonMaterial({ color: col, gradientMap: ramp, side: THREE.DoubleSide }));
      w.position.x = sx * 0.06; w.rotation.x = -PI / 2; pv.add(w); pv.userData.sx = sx; return pv; });
    return { g, wings, c: [(rnd() - 0.5) * 6, 0.8 + rnd() * 1.4, -4 + rnd() * 18], r: 0.6 + rnd() * 1.2, ph: rnd() * 6 };
  });

  /* tags: soft white "</> text", turning green with a tick when fixed */
  const tagFont = new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`), titleFont = new FontFace('Title', `url(${asset('Fruktur.ttf')})`);
  await Promise.all([tagFont.load(), titleFont.load()]); document.fonts.add(tagFont); document.fonts.add(titleFont);
  function tagTex(text, fixed) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 220; const g = c.getContext('2d');
    g.font = '80px Tag'; const fs = Math.min(80, 80 * 700 / g.measureText(text).width); g.font = `${fs}px Tag`;
    const tw = g.measureText(text).width, w = tw + 230, x0 = (1024 - w) / 2;
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.beginPath(); g.roundRect(x0 + 6, 32, w, 170, 85); g.fill();
    g.fillStyle = fixed ? '#22a35a' : '#fbfaf5'; g.beginPath(); g.roundRect(x0, 22, w, 170, 85); g.fill();
    const ix = x0 + 95, iy = 107, ic = fixed ? '#ffffff' : '#4b6a8a';
    if (fixed) { g.strokeStyle = ic; g.lineWidth = 15; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(ix - 28, iy + 2); g.lineTo(ix - 6, iy + 24); g.lineTo(ix + 30, iy - 20); g.stroke(); }
    else { g.fillStyle = ic; g.font = '70px Tag'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('</>', ix, iy + 4); }
    g.font = `${fs}px Tag`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = fixed ? '#ffffff' : '#2b3440'; g.fillText(text, x0 + 170, 112);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const mkSprite = tex => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, opacity: 0 })); s.renderOrder = 10; scene.add(s); return s; };
  const TAGS = [['Krzywy margines', 3.0, T_FIX_A, [3.3, 8.6]], ['Literówka w kodzie', 9.6, T_FIX_B, [8.6, 14]], ['Brakujący średnik', 14.6, T_FIX_C, [14, 19.6]]]
    .map(([text, show, fix, focus]) => ({ open: mkSprite(tagTex(text, false)), done: mkSprite(tagTex(text, true)), show, fix, focus }));
  const hTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (width / height);
  function fitTag(sprite, pos, frac) {
    const d = Math.max(0.3, pos.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3())));
    const w = frac * 2 * d * hTan; sprite.scale.set(w, w * 220 / 1024, 1);
    const v = pos.clone().project(camera), lim = Math.max(0, 1 - frac * 0.97 - 0.02), raw = v.x, front = v.z < 1;
    v.x = Math.max(-lim, Math.min(lim, v.x)); v.y = Math.min(0.86, Math.max(-0.86, v.y)); sprite.position.copy(v.unproject(camera));
    return (1 - sm(1.0, 1.3, Math.abs(raw))) * (front ? 1 : 0);
  }

  /* wooden garden sign by the gate */
  { const sg = new THREE.Group(); sg.position.set(1.7, 0, 14.6); sg.rotation.y = PI + 0.25; scene.add(sg);
    const wood = toon(0x8a5a33);
    for (const px of [-0.75, 0.75]) inked(new THREE.CylinderGeometry(0.05, 0.06, 1.7, 8), wood, [px, 0.85, -0.04], sg);
    const board = (txt, y, font, size, col) => { const tx = ctex(1024, 300, (g, w, h) => { g.fillStyle = '#e2bd86'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6b3f1d'; g.lineWidth = 22; g.strokeRect(11, 11, w - 22, h - 22);
        g.fillStyle = col; g.font = `${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; const f = Math.min(1, 900 / g.measureText(txt).width); g.font = `${size * f}px ${font}`; g.fillText(txt, w / 2, h / 2 + 6); });
      const woodS = toon(0x8a5a33); inked(new THREE.BoxGeometry(1.75, 0.5, 0.05), [woodS, woodS, woodS, woodS, new THREE.MeshToonMaterial({ map: tx, gradientMap: ramp }), woodS], [0, y, 0], sg); };
    board('Czysty kod', 1.42, 'Tag', 150, '#2b1606'); board('elvladislavo.com', 0.86, 'Title', 170, '#2b1606'); }

  /* post */
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.25, 0.5, 0.95));
  composer.addPass(new OutputPass());

  /* two-bone IK for the right arm toward any world point, blended with the pose */
  const L1 = 0.3, L2 = 0.3;
  function reachTo(side, sx, target, pole, w) {
    if (w <= 0.001) return;
    const sh = J['shoulder' + side], el = J['elbow' + side];
    const q0 = sh.quaternion.clone(), e0 = el.rotation.x;
    const tg = J.spine.worldToLocal(target.clone()), d = tg.sub(sh.position);
    const dist = Math.min(d.length(), (L1 + L2) * 0.999); d.normalize();
    const a = Math.acos(THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
    const n = new THREE.Vector3().crossVectors(d, pole).normalize(), perp = new THREE.Vector3().crossVectors(n, d).normalize();
    const u = d.clone().multiplyScalar(Math.cos(a)).addScaledVector(perp, Math.sin(a)).normalize();
    const X = n.clone(), Y = u.clone().negate(), Z = new THREE.Vector3().crossVectors(X, Y).normalize(); X.crossVectors(Y, Z).normalize();
    const qIK = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const f = d.clone().multiplyScalar(dist).addScaledVector(u, -L1).normalize();
    sh.quaternion.copy(q0).slerp(qIK, w); el.rotation.set(lerp(e0, Math.atan2(-f.dot(Z), -f.dot(Y)), w), 0, 0);
  }
  const hand = () => J.elbowR.localToWorld(V3(0, -0.3, 0.0));
  const headP = () => J.head.localToWorld(V3(0, 0.15, 0.0));
  const stemTip = droop => V3(STEM_BASE[0] - STEM_LEN * Math.sin(droop), STEM_LEN * Math.cos(droop), STEM_BASE[2]);
  const nearFace = () => J.head.localToWorld(V3(0.0, 0.05, 0.38));

  // arm plan: [from, to, target fn] — weight ramps in/out at the ends of each station
  const ARM = [
    [4.3, 7.3, t => t < 5.35 ? stemTip(DROOP).add(V3(0.02, 0.03, 0)) : t < 6.5 ? nearFace() : J.spine.localToWorld(V3(0.25, 1.05, 0.3))],
    [10.3, 13.1, t => t < 11.35 ? V3(...LEAF).add(V3(0.05, 0.02, 0)) : t < 12.3 ? nearFace() : J.spine.localToWorld(V3(0.2, 1.05, 0.3))],
    [15.85, 18.2, t => t < 16.45 ? V3(...GAP).add(V3(0, 0.07, 0)) : t < 17.35 ? J.spine.localToWorld(V3(0.0, 0.25, 0.42)) : V3(...SNAIL_DROP).add(V3(0, 0.07, 0))],
  ];
  const armState = t => { for (const [a, b, f] of ARM) if (t > a - 0.01 && t < b + 0.01) return { w: sm(a, a + 0.45, t) * (1 - sm(b - 0.45, b, t)), p: f(t) }; return { w: 0, p: null }; };

  /* camera shots */
  const heroCom = V3(0, 0, 0), handW = V3(0, 0, 0), headW = V3(0, 0, 0);
  const SHOTS = [
    [0, 3.4, t => ({ pos: V3(2.4, lerp(4.2, 1.7, E.inOutCubic(range(t, 0, 3.2))), lerp(9.5, 5.4, range(t, 0, 3.4))), look: heroCom.clone().add(V3(0, 0.35, 0)) })],
    [3.4, 8.6, t => { const k = sm(5.15, 5.6, t) * (1 - sm(6.55, 6.95, t)), m = sm(6.9, 7.3, t);
      const wide = { pos: V3(0.55, 1.2, 3.7), look: V3(0.85, 0.6, 1.6) }, macro = { pos: handW.clone().add(V3(0.32, 0.08, 0.42)), look: handW.clone() };
      const after = { pos: V3(1.0, 0.7, 2.75), look: V3(1.4, 0.55, 1.6) };
      return { pos: wide.pos.lerp(macro.pos, k).lerp(after.pos, m), look: wide.look.lerp(macro.look, k).lerp(after.look, m) }; }],
    [8.6, 14.0, t => { const k = sm(11.2, 11.6, t) * (1 - sm(12.25, 12.6, t)), m = sm(12.6, 12.95, t);
      const wide = { pos: V3(0.25, 1.55, 8.2), look: V3(-0.9, 1.0, 6.6) }, macro = { pos: handW.clone().add(V3(0.15, 0.1, 0.5)), look: handW.clone() };
      const after = { pos: V3(-0.55, 1.2, 7.35), look: V3(...LEAF) };
      return { pos: wide.pos.lerp(macro.pos, k).lerp(after.pos, m), look: wide.look.lerp(macro.look, k).lerp(after.look, m) }; }],
    [14.0, 19.7, t => { const k = sm(17.85, 18.2, t);
      const wide = { pos: V3(1.25, 1.05, 12.3), look: V3(0.35, 0.35, 10.6) }, stone = { pos: V3(0.55, 0.65, 11.85), look: V3(0.1, 0.05, 10.8) };
      return { pos: wide.pos.lerp(stone.pos, k), look: wide.look.lerp(stone.look, k) }; }],
    [19.7, T_END + 1, t => { const u = E.inOutCubic(range(t, 19.7, 25.5));
      return { pos: V3(lerp(1.4, 0.95, u), lerp(1.4, 1.75, u), lerp(7.6, 7.7, u)), look: V3(lerp(0.3, 0.72, u), lerp(1.0, 1.15, u), lerp(11.0, 13.6, u)) }; }],
  ];
  const BLEND = 0.3;

  return {
    update(t) {
      /* him */
      man.system.position.set(key(t, HERO.x), 0, key(t, HERO.z)); man.system.rotation.set(0, key(t, HERO.yaw), 0);
      man.applyPose(KEYS, t); man.system.updateMatrixWorld(true);
      const arm = armState(t);
      if (arm.p) { reachTo('R', -1, arm.p, V3(-1, -0.6, -0.4), arm.w); man.system.updateMatrixWorld(true); }
      heroCom.set(0, 1, 0).applyMatrix4(man.system.matrixWorld); handW.copy(hand()); headW.copy(headP());

      /* A: beetle on the bent tulip → onto his finger → flies off; tulip straightens and opens */
      const droop = DROOP * (1 - E.outBack(range(t, T_FIX_A, T_FIX_A + 0.9)));
      tulip.rotation.z = droop;
      const open = E.outCubic(range(t, T_FIX_A + 0.3, T_FIX_A + 1.3));
      petals.forEach(p => { p.children[0].rotation.x = lerp(0.12, 0.65, open); });
      flyBug(beetle, t, stemTip(DROOP).add(V3(0, 0.025, 0)), 5.05, 5.4, 6.75, [0.5, 1.1, 0.9]);
      /* B: ladybird on the holed leaf → finger → released; the leaf heals */
      flyBug(ladybird, t, V3(...LEAF).add(V3(0.04, 0.03, 0.02)), 11.05, 11.4, 12.45, [-0.6, 1.2, 0.7]);
      leafWhole.material.opacity = sm(T_FIX_B, T_FIX_B + 0.8, t);
      /* C: snail in the gap → carried to the grass → the semicolon stone rises in */
      if (t < 16.5) { snail.position.set(...GAP); snail.rotation.set(0, 0.4 * Math.sin(t * 0.3), 0); }
      else if (t < 17.75) { snail.position.copy(handW).add(V3(0, 0.035, 0)); snail.rotation.set(0, 1.2, 0); }
      else { const u = t - 17.75; snail.position.set(SNAIL_DROP[0] + 0.03 * u, SNAIL_DROP[1], SNAIL_DROP[2] + 0.02 * u); snail.rotation.set(0, 1.0, 0); }
      semi.position.y = lerp(-0.2, 0.02, E.outBack(range(t, T_FIX_C, T_FIX_C + 0.8)));

      /* butterflies drift and flap */
      butterflies.forEach(b => { const s = t * 0.35 + b.ph; b.g.position.set(b.c[0] + Math.sin(s * 1.3) * b.r, b.c[1] + 0.25 * Math.sin(s * 2.1), b.c[2] + Math.cos(s) * b.r);
        b.g.rotation.y = -s + PI / 2; b.wings.forEach(w => { w.rotation.z = w.userData.sx * (0.2 + 0.9 * Math.abs(Math.sin(t * 14 + b.ph))); }); });

      /* camera */
      let pos = null, look = null, wsum = 0;
      SHOTS.forEach(([a, b, f], i) => {
        if (t < a - BLEND || t > b + BLEND) return;
        const w = (i === 0 ? 1 : sm(a - BLEND, a + BLEND, t)) * (i === SHOTS.length - 1 ? 1 : 1 - sm(b - BLEND, b + BLEND, t)); if (w <= 0) return;
        const s = f(t); if (!pos) { pos = s.pos.multiplyScalar(w); look = s.look.multiplyScalar(w); } else { pos.addScaledVector(s.pos, w); look.addScaledVector(s.look, w); } wsum += w;
      });
      pos.multiplyScalar(1 / wsum); look.multiplyScalar(1 / wsum);
      pos.x += wiggle(t, 0.3, 3) * 0.015; pos.y += wiggle(t, 0.25, 5) * 0.012;
      camera.position.copy(pos); camera.lookAt(look); camera.updateMatrixWorld(true);

      /* tags */
      const anchors = [stemTip(droop).add(V3(0, 0.42, 0)), V3(...LEAF).add(V3(0, 0.45, 0)), V3(...GAP).add(V3(0, 0.5, 0))];
      TAGS.forEach((g, i) => {
        const focus = t >= g.focus[0] && t <= g.focus[1] ? 1 : 0, frac = focus ? 0.62 : 0.36;
        const inA = sm(g.show, g.show + 0.4, t), fx = sm(g.fix, g.fix + 0.25, t), pop = 1 + 0.18 * Math.exp(-6 * Math.max(0, t - g.fix)) * Math.sin(Math.max(0, t - g.fix) * 14) * (t > g.fix ? 1 : 0);
        const v1 = fitTag(g.open, anchors[i], frac), v2 = fitTag(g.done, anchors[i], frac * pop);
        const macroHide = 1 - (sm(5.15, 5.5, t) * (1 - sm(6.6, 6.9, t)) + sm(11.2, 11.5, t) * (1 - sm(12.3, 12.55, t)));   // keep the macro shots clean
        g.open.material.opacity = inA * (1 - fx) * v1 * macroHide; g.done.material.opacity = fx * v2 * macroHide * lerp(0.75, 1, focus);
      });
    },
    render() { composer.render(); },
  };

  // creature on its perch → walks onto his finger at tOn → rides there → flies away at tOff
  function flyBug(b, t, perch, tWalk, tOn, tOff, dir) {
    const wings = b.userData.wings;
    if (t < tWalk) { b.position.copy(perch); b.rotation.set(0, 0.6 * Math.sin(t * 0.8), 0); wings.forEach(w => (w.rotation.z = 0)); b.visible = true; return; }
    if (t < tOn) { b.position.copy(perch).lerp(handW.clone().add(V3(0, 0.02, 0)), sm(tWalk, tOn, t)); return; }
    if (t < tOff) { b.position.copy(handW).add(V3(0, 0.02, 0)); b.rotation.y = 0.3 * Math.sin(t * 2); wings.forEach(w => (w.rotation.z = 0)); return; }
    const u = t - tOff, start = (armState(tOff).p || handW).clone().add(V3(0, 0.02, 0));   // take-off point stays put as his hand moves on
    b.position.set(start.x + dir[0] * u + 0.15 * Math.sin(u * 5), start.y + dir[1] * u * (0.6 + 0.4 * u) + 0.08 * Math.sin(u * 7), start.z + dir[2] * u);
    b.rotation.set(-0.4, Math.atan2(dir[0], dir[2]), 0);
    wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.9 + 0.5 * Math.sin(t * 60))));
    b.visible = u < 3.5;
  }
}
