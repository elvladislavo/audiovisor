// highpoly-mc.js — the high-poly MC, built on the low-poly model (motion/mc-lowpoly/lowpoly-mc.js).
// Same proportions, same joint positions and the same API, so poses written for one play on the other:
//   const mc = buildHighPolyMC(); scene.add(mc.root); mc.setPose(pose); mc.talk(open); mc.triangles
// Each low-poly box becomes a smooth, bevelled, detailed part:
//   coat: rounded panels, extruded peak lapels, 2×2 horn buttons, flap + welt pockets, open skirt with vents
//   shirt V, collar points, extruded tie with a gold-lattice silk texture and a knot
//   head: rounded skull, nose, ears, brows; beard + moustache + curly mullet from hundreds of individual curls
//   slim oval shades: glossy extruded lenses, silver bridge and arms
//   hands with four fingers and a thumb; trousers with one white side stripe; red croc shoes with sole, laces, toe seam
// PBR materials (MeshStandard / MeshPhysical) with code-painted 512–1024 px maps and bump maps, smooth shading.
// Coordinates and joint conventions are identical to lowpoly-mc.js: feet at y = 0, facing +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; return t;
}
// camel wool: fine fibre noise over a 2/2 twill
const woolTex = () => canvasTex(512, (g, S) => {
  g.fillStyle = '#b09a7c'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i++) { const v = rnd(); g.fillStyle = v < 0.5 ? 'rgba(120,98,70,0.22)' : 'rgba(214,196,168,0.22)';
    const x = rnd() * S, y = rnd() * S; g.fillRect(x, y, 1 + rnd() * 3, 1); }
  g.strokeStyle = 'rgba(110,90,62,0.16)'; g.lineWidth = 2;
  for (let i = -S; i < S * 2; i += 7) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); }
}, 3);
const tieTex = () => canvasTex(256, (g, S) => {
  g.fillStyle = '#c3121d'; g.fillRect(0, 0, S, S);
  const d = S / 2; g.lineCap = 'round';
  for (let i = -2; i <= 4; i++) for (const dir of [1, -1]) {
    g.strokeStyle = '#1d2a55'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(i * d + 6, 0); g.lineTo(i * d + 6 + dir * S, S); g.stroke();
    g.strokeStyle = '#e2b54a'; g.lineWidth = 6; g.setLineDash([10, 5]); g.beginPath(); g.moveTo(i * d, 0); g.lineTo(i * d + dir * S, S); g.stroke(); g.setLineDash([]); }
}, 6);
const crocTex = () => canvasTex(1024, (g, S) => {
  g.fillStyle = '#3e0307'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 64) { let x = -rnd() * 60;
    while (x < S) { const w = 52 + rnd() * 60, gr = g.createLinearGradient(x, y, x + w * 0.6, y + 64);
      gr.addColorStop(0, '#f2545e'); gr.addColorStop(0.35, '#c4141f'); gr.addColorStop(1, '#7e0911');
      g.fillStyle = gr; g.beginPath(); g.roundRect(x + 4, y + 4, w - 8, 56, 14); g.fill(); x += w; } }
}, 2);
const greyBump = tex => tex;   // the colour maps double as bump maps (dark seams read as grooves)

export function buildHighPolyMC() {
  const wool = woolTex(), croc = crocTex();
  const M = {
    coat: new THREE.MeshStandardMaterial({ map: wool, color: 0xd2c2a8, bumpMap: greyBump(wool), bumpScale: 1.2, roughness: 0.92 }),
    coatEdge: new THREE.MeshStandardMaterial({ map: wool, color: 0xb9a98e, bumpMap: wool, bumpScale: 1.2, roughness: 0.92, side: THREE.DoubleSide }),
    lining: new THREE.MeshStandardMaterial({ color: 0x6b5338, roughness: 0.8, side: THREE.DoubleSide }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.55, side: THREE.DoubleSide }),
    tie: new THREE.MeshStandardMaterial({ map: tieTex(), roughness: 0.42, metalness: 0.05 }),
    horn: new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.35 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xe2ad86, roughness: 0.62 }),
    lip: new THREE.MeshStandardMaterial({ color: 0x4a1a14, roughness: 0.5 }),
    teeth: new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.35 }),
    hair: [0x3e2210, 0x4b2a16, 0x5e3318, 0x7d4521].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78 })),
    beard: [0x48260f, 0x5a3018, 0x6e3c1e].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })),
    lens: new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.35, metalness: 0.0, envMapIntensity: 0.15 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xc9ccd4, roughness: 0.25, metalness: 1.0 }),
    trousers: new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: 0.68 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xecebe6, roughness: 0.6 }),
    shoe: new THREE.MeshPhysicalMaterial({ map: croc, bumpMap: croc, bumpScale: 3, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x2a0a0c, roughness: 0.6 }),
    lace: new THREE.MeshStandardMaterial({ color: 0x5a050b, roughness: 0.6 }),
  };

  const root = new THREE.Group(), J = {};
  const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const mesh = (geo, mat, parent, p = [0, 0, 0], rot, scale) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (rot) m.rotation.set(...rot); if (scale) m.scale.set(...scale);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const rb = (w, h, d, r, seg = 6) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  const extrude = (pts, depth, bevel = 0.003) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 16 }); };
  const curlGeo = new THREE.IcosahedronGeometry(1, 1);

  /* ── torso (pivot at the hips) ── */
  const hips = joint('hips', root, 0, 0.92, 0);
  const torso = joint('torso', hips, 0, 0, 0);
  mesh(rb(0.46, 0.62, 0.25, 0.075, 8), M.coat, torso, [0, 0.31, 0]);
  for (const sx of [1, -1]) mesh(new THREE.SphereGeometry(0.075, 32, 20), M.coat, torso, [sx * 0.2, 0.56, 0], null, [1, 0.75, 1.2]);   // padded shoulders
  // shirt V, collar points, tie
  mesh(extrude([[-0.085, 0.63], [0.085, 0.63], [0.0, 0.23]], 0.004, 0), M.shirt, torso, [0, 0, 0.124]);
  for (const sx of [1, -1]) mesh(extrude([[0, 0], [sx * 0.045, 0.0], [sx * 0.012, -0.055]], 0.004, 0.0015), M.shirt, torso, [sx * 0.012, 0.632, 0.13], [0, 0, 0]);
  mesh(rb(0.05, 0.044, 0.03, 0.012), M.tie, torso, [0, 0.598, 0.136]);
  mesh(extrude([[-0.02, 0], [0.02, 0], [0.034, -0.26], [0, -0.3], [-0.034, -0.26]], 0.008, 0.003), M.tie, torso, [0, 0.578, 0.131]);
  // peak lapels, collar, double-breasted buttons, pockets
  for (const sx of [1, -1]) {
    const lap = [[0.072, 0.635], [0.0, 0.25], [0.06, 0.25], [0.16, 0.47], [0.185, 0.545], [0.13, 0.515], [0.14, 0.635]].map(([x, y]) => [sx * x, y]);
    mesh(extrude(lap, 0.008, 0.004), M.coatEdge, torso, [0, 0, 0.126]);
    mesh(extrude([[0.075, 0.64], [0.14, 0.64], [0.16, 0.66], [0.09, 0.67]].map(([x, y]) => [sx * x, y]), 0.06, 0.004), M.coatEdge, torso, [0, 0, 0.06]);   // collar band rolling round the neck
    for (const y of [0.1, 0.19]) { const b = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 32), M.horn, torso, [sx * 0.05, y, 0.129], [Math.PI / 2, 0, 0]);
      for (const [dx, dy] of [[-0.004, -0.004], [0.004, -0.004], [-0.004, 0.004], [0.004, 0.004]]) mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.002, 8), M.lining, b, [dx, 0.004, dy]); }
    mesh(rb(0.13, 0.034, 0.016, 0.006), M.coat, torso, [sx * 0.145, 0.12, 0.128]);
  }
  mesh(rb(0.085, 0.014, 0.01, 0.004), M.coatEdge, torso, [0.135, 0.44, 0.127], [0, 0, -0.06]);          // chest welt pocket (his left)
  mesh(rb(0.46, 0.02, 0.24, 0.008), M.coat, torso, [0, 0.005, 0]);

  // long skirt: two front panels open over the trousers, sides, back with a vent
  for (const sx of [1, -1]) {
    mesh(rb(0.205, 0.47, 0.035, 0.014), M.coat, hips, [sx * 0.125, -0.215, 0.105], [-0.04, 0, sx * 0.05]);
    mesh(rb(0.005, 0.46, 0.03, 0.002), M.coatEdge, hips, [sx * 0.024, -0.215, 0.112], [-0.04, 0, sx * 0.05]);
    mesh(rb(0.04, 0.47, 0.22, 0.014), M.coat, hips, [sx * 0.222, -0.215, 0.0], [0, 0, sx * 0.04]);
    mesh(rb(0.22, 0.47, 0.04, 0.014), M.coat, hips, [sx * 0.118, -0.215, -0.11], [0.03, 0, sx * 0.03]);
  }

  /* ── head ── */
  const head = joint('head', torso, 0, 0.62, 0);
  mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.09, 32), M.skin, head, [0, 0.02, 0]);
  mesh(rb(0.25, 0.29, 0.26, 0.075, 10), M.skin, head, [0, 0.165, 0.005]);
  mesh(rb(0.044, 0.07, 0.05, 0.02, 6), M.skin, head, [0, 0.148, 0.142], [-0.12, 0, 0]);                  // nose
  mesh(new THREE.SphereGeometry(0.014, 16, 12), M.skin, head, [0, 0.118, 0.158]);                       // nose tip
  for (const sx of [1, -1]) {
    mesh(rb(0.028, 0.075, 0.05, 0.012, 4), M.skin, head, [sx * 0.128, 0.16, -0.005], [0, sx * 0.25, 0]);
    mesh(rb(0.072, 0.016, 0.02, 0.007), M.beard[0], head, [sx * 0.056, 0.243, 0.133], [0, 0, -sx * 0.1]);  // brows
  }
  // mouth: closed line / open with teeth
  const mouthShut = mesh(rb(0.05, 0.008, 0.012, 0.003), M.lip, head, [0, 0.085, 0.135]);
  const mouthOpen = new THREE.Group(); head.add(mouthOpen);
  mesh(rb(0.052, 0.036, 0.014, 0.012), M.lip, mouthOpen, [0, 0.078, 0.133]);
  mesh(rb(0.04, 0.009, 0.006, 0.003), M.teeth, mouthOpen, [0, 0.091, 0.139]);
  mouthOpen.visible = false;
  // slim oval shades
  const shades = new THREE.Group(); shades.position.set(0, 0.205, 0.143); head.add(shades);
  for (const sx of [1, -1]) {
    const s = new THREE.Shape(); s.absellipse(0, 0, 0.044, 0.02, 0, Math.PI * 2, false, 0);
    mesh(new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 4, curveSegments: 40 }), M.lens, shades, [sx * 0.05, 0, -0.004], [0, -sx * 0.16, 0]);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 48), M.metal); rim.scale.set(0.045, 0.021, 0.045); rim.position.set(sx * 0.05, 0, 0.002); rim.rotation.y = -sx * 0.16; shades.add(rim);
    mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.15, 10), M.metal, shades, [sx * 0.095, 0.004, -0.075], [Math.PI / 2, 0, 0]);
  }
  mesh(new THREE.TorusGeometry(0.012, 0.0025, 8, 20, Math.PI), M.metal, shades, [0, 0.004, 0.004]);

  // beard + moustache: individual curls over the lower face (mouth kept clear)
  const curl = (parent, mats, p, r) => mesh(curlGeo, mats[Math.floor(rnd() * mats.length)], parent, p, [rnd() * 3, rnd() * 3, 0], [r, r * (0.8 + rnd() * 0.3), r]);
  for (let i = 0; i < 520; i++) {
    const a = (rnd() - 0.5) * Math.PI * 1.12, y = 0.022 + rnd() * 0.1;
    if (Math.abs(a) < 0.3 && y > 0.066 && y < 0.1) continue;
    if (Math.abs(a) > 0.85 && y > 0.1) continue;
    const rx = 0.128, rz = 0.136, bulge = 0.012 + 0.012 * Math.max(0, 1 - Math.abs(y - 0.04) / 0.06);
    curl(head, M.beard, [Math.sin(a) * (rx + bulge), y + (Math.abs(a) > 0.9 ? 0.04 : 0), 0.005 + Math.cos(a) * (rz + bulge) - (Math.abs(a) > 0.9 ? 0.02 : 0)], 0.012 + rnd() * 0.008);
  }
  for (let i = 0; i < 46; i++) { const a = (rnd() - 0.5) * 1.15, y = 0.1 + rnd() * 0.018;
    curl(head, M.beard, [Math.sin(a) * 0.136, y - Math.abs(a) * 0.03, 0.005 + Math.cos(a) * 0.15], 0.01 + rnd() * 0.005); }
  // curly mullet: solid base volumes (the low-poly boxes) covered in curls
  const hairVols = [
    { c: [0, 0.33, -0.01], s: [0.31, 0.1, 0.31], n: 420 }, { c: [0, 0.12, -0.14], s: [0.31, 0.36, 0.1], n: 480 },
    { c: [0.15, 0.2, -0.03], s: [0.05, 0.2, 0.22], n: 140 }, { c: [-0.15, 0.2, -0.03], s: [0.05, 0.2, 0.22], n: 140 },
    { c: [0, 0.29, 0.11], s: [0.27, 0.05, 0.06], n: 110 },
  ];
  for (const v of hairVols) {
    mesh(rb(v.s[0] * 0.86, v.s[1] * 0.86, v.s[2] * 0.86, 0.02), M.hair[0], head, v.c);
    for (let i = 0; i < v.n; i++) {
      const p = [0, 1, 2].map(k => (rnd() - 0.5) * v.s[k]), ax = Math.floor(rnd() * 3), sg = rnd() < 0.5 ? -1 : 1;
      p[ax] = sg * v.s[ax] / 2 * (0.8 + rnd() * 0.25);                                                  // push towards the surface
      if (p[2] + v.c[2] > 0.1 && p[1] + v.c[1] < 0.28) p[2] -= 0.04;                                    // keep the face clear
      curl(head, M.hair, [v.c[0] + p[0], v.c[1] + p[1], v.c[2] + p[2]], 0.018 + rnd() * 0.012);
    }
  }

  /* ── arms, hands, legs, shoes ── */
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = joint('shoulder' + s, torso, sx * 0.29, 0.56, 0);
    mesh(new THREE.SphereGeometry(0.068, 28, 18), M.coat, sh, [0, -0.01, 0]);
    mesh(rb(0.12, 0.32, 0.13, 0.045, 6), M.coat, sh, [0, -0.15, 0]);
    const el = joint('elbow' + s, sh, 0, -0.3, 0);
    mesh(new THREE.SphereGeometry(0.058, 24, 16), M.coat, el, [0, 0, 0]);
    mesh(rb(0.11, 0.27, 0.12, 0.04, 6), M.coat, el, [0, -0.13, 0]);
    mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 28), M.shirt, el, [0, -0.272, 0]);              // shirt cuff
    for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 16), M.horn, el, [sx * 0.056, -0.2 - i * 0.017, -0.02], [0, 0, Math.PI / 2]);
    // hand: palm, four fingers, thumb (palm faces the body)
    mesh(rb(0.034, 0.08, 0.078, 0.014), M.skin, el, [0, -0.32, 0.004]);
    for (let f = 0; f < 4; f++) mesh(new THREE.CapsuleGeometry(0.0088, 0.045 - Math.abs(f - 1.5) * 0.006, 6, 12), M.skin, el, [0, -0.386 + Math.abs(f - 1.5) * 0.003, -0.026 + f * 0.0175]);
    mesh(new THREE.CapsuleGeometry(0.01, 0.04, 6, 12), M.skin, el, [-sx * 0.012, -0.31, 0.046], [0.7, 0, 0]);
    const hp = joint('hip' + s, hips, sx * 0.1, 0, 0);
    mesh(rb(0.15, 0.43, 0.16, 0.05, 6), M.trousers, hp, [0, -0.21, 0]);
    mesh(rb(0.006, 0.42, 0.014, 0.002), M.stripe, hp, [sx * 0.076, -0.21, 0]);
    const kn = joint('knee' + s, hp, 0, -0.42, 0);
    mesh(new THREE.SphereGeometry(0.07, 24, 16), M.trousers, kn, [0, 0, 0]);
    mesh(rb(0.13, 0.4, 0.14, 0.045, 6), M.trousers, kn, [0, -0.2, 0]);
    mesh(rb(0.006, 0.38, 0.014, 0.002), M.stripe, kn, [sx * 0.066, -0.19, 0]);
    mesh(rb(0.136, 0.075, 0.275, 0.03, 6), M.shoe, kn, [0, -0.447, 0.05]);
    mesh(rb(0.146, 0.022, 0.29, 0.008, 4), M.sole, kn, [0, -0.489, 0.05]);
    mesh(rb(0.13, 0.004, 0.006, 0.002), M.sole, kn, [0, -0.43, 0.135], [-0.5, 0, 0]);                 // toe-cap seam
    for (let i = 0; i < 3; i++) mesh(new THREE.CapsuleGeometry(0.004, 0.045, 4, 8), M.lace, kn, [0, -0.405 - i * 0.004, 0.06 - i * 0.026], [0, 0, Math.PI / 2]);
  }

  let triangles = 0;
  root.traverse(o => { if (o.isMesh) { const g = o.geometry; triangles += (g.index ? g.index.count : g.attributes.position.count) / 3; } });

  const ZERO = [0, 0, 0];
  function setPose(p) {
    for (const k of ['hips', 'torso', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR']) J[k].rotation.set(...(p[k] || ZERO));
    J.hips.position.y = 0.92 + (p.drop || 0);
  }
  const talk = open => { mouthOpen.visible = !!open; mouthShut.visible = !open; };
  return { root, J, M, setPose, talk, triangles: Math.round(triangles) };
}
