// costume.js — extra costume details for the MC, taken from the outfit reference photo (IMG_1237).
// Applied on top of the shared model (stickman.js stays untouched for the other scenes):
//   • shirt: pale lavender-pink instead of light blue, wider white cuffs showing past the sleeves
//   • tie: red silk with a gold chain lattice and small navy crosses at each crossing
//   • blazer: left chest welt pocket, flap hip pockets, one front button per panel, 3 white cuff buttons
//   • belt: gold rectangular buckle with a prong, plus a keeper loop
//   • shoes: embossed red croc (rectangular scales), white contrast stitching round the welt,
//     laces across the instep and a toe-cap seam
//   const man = buildStickman({ seed: 7 }); dressUp(man);
import * as THREE from 'three';

function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
  return t;
}

// red silk, gold chain lattice (as on the photo), navy cross at every crossing
function tieTexture() {
  return canvasTex(256, 256, (g, S) => {
    g.fillStyle = '#c8141e'; g.fillRect(0, 0, S, S);
    const n = 2, d = S / n;
    g.lineCap = 'round';
    for (let i = -n; i <= 2 * n; i++) for (const dir of [1, -1]) {
      // chain: short gold links with tiny gaps, a thin navy thread alongside
      g.strokeStyle = '#1d2a55'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(i * d + 6, 0); g.lineTo(i * d + 6 + dir * S, S); g.stroke();
      g.strokeStyle = '#e2b54a'; g.lineWidth = 7; g.setLineDash([11, 5]);
      g.beginPath(); g.moveTo(i * d, 0); g.lineTo(i * d + dir * S, S); g.stroke(); g.setLineDash([]);
    }
    for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) for (const [cx, cy] of [[x * d, y * d], [x * d + d / 2, y * d + d / 2]]) {
      g.strokeStyle = '#1d2a55'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(cx - 13, cy - 13); g.lineTo(cx + 13, cy + 13); g.moveTo(cx + 13, cy - 13); g.lineTo(cx - 13, cy + 13); g.stroke();
      g.fillStyle = '#f3d88a'; g.beginPath(); g.arc(cx, cy, 3.5, 0, 7); g.fill();
    }
  }, 11, 11);
}

// embossed croc: rows of rounded rectangles of varying width, deep seams, glossy top-left highlight
function crocTexture() {
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return canvasTex(256, 256, (g, S) => {
    g.fillStyle = '#4a0409'; g.fillRect(0, 0, S, S);
    const rowH = 32;
    for (let y = 0; y < S; y += rowH) {
      let x = -rnd() * 30;
      while (x < S) {
        const w = 26 + rnd() * 30;
        const gr = g.createLinearGradient(x, y, x + w * 0.6, y + rowH);
        gr.addColorStop(0, '#f0525c'); gr.addColorStop(0.35, '#c4141f'); gr.addColorStop(1, '#850a13');
        g.fillStyle = gr; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, rowH - 4, 7); g.fill();
        x += w;
      }
    }
  }, 2, 2);
}

export function dressUp(man) {
  const { J, M, ramp, outlineMat } = man;
  const toon = (c, x = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, ...x });
  const add = (geo, mat, parent, p, { rot, outline = false } = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = true; parent.add(m);
    if (outline) m.add(new THREE.Mesh(geo, outlineMat)); return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  /* recolour + retexture */
  M.shirt.color.set(0xf3e6f1);                         // pale lavender-pink shirt
  M.tie.map = tieTexture(); M.tie.needsUpdate = true;
  M.tieKnot.color.set(0xb8121c);
  M.buckle.color.set(0xd8aa3e);                        // gold buckle
  M.shoe.map = crocTexture(); M.shoe.needsUpdate = true;
  const piping = toon(0x34323c), button = toon(0x0c0c0f), white = toon(0xf4f2ee), lace = toon(0x5a050b), gold = M.buckle;

  /* belt: buckle frame + prong, keeper loop */
  add(box(0.024, 0.016, 0.004), M.belt, J.hips, [0, 0.055, 0.0885]);                 // makes the buckle read as a frame
  add(box(0.004, 0.02, 0.004), gold, J.hips, [0.002, 0.055, 0.0905]);                // prong
  add(box(0.012, 0.04, 0.006), M.belt, J.hips, [-0.034, 0.055, 0.084]);              // keeper
  add(box(0.014, 0.026, 0.004), M.belt, J.hips, [0.032, 0.055, 0.083]);

  /* blazer: chest welt pocket on his left breast (+x), hip flap pockets + a button on each front panel */
  add(box(0.06, 0.012, 0.006), piping, J.spine, [0.083, 0.335, 0.066], { rot: [0, 0.5, -0.06] });
  add(box(0.056, 0.004, 0.004), button, J.spine, [0.083, 0.341, 0.068], { rot: [0, 0.5, -0.06] });
  const panels = J.hips.children.filter(o => o.isMesh && o.geometry.parameters?.width === 0.1 && o.geometry.parameters?.height === 0.24);
  for (const p of panels) {
    const sx = Math.sign(p.position.x);
    add(box(0.072, 0.024, 0.006), M.blazer, p, [sx * 0.004, -0.035, 0.016], { outline: true });   // flap
    add(box(0.07, 0.003, 0.003), piping, p, [sx * 0.004, -0.022, 0.0185]);
    add(new THREE.CylinderGeometry(0.0105, 0.0105, 0.006, 12), button, p, [-sx * 0.034, 0.085, 0.016], { rot: [Math.PI / 2, 0, 0] });
  }

  /* sleeves: wider white shirt cuff showing past the sleeve, 3 white buttons on the cuff */
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const el = J['elbow' + side];
    add(new THREE.CylinderGeometry(0.037, 0.035, 0.03, 14), white, el, [0, -0.252, 0], { outline: true });
    for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.0055, 8, 6), white, el, [sx * 0.022, -0.19 - i * 0.015, -0.026]);
  }

  /* shoes: white stitching round the welt (dashes), laces, toe-cap seam */
  const dash = box(0.012, 0.005, 0.005), dashZ = box(0.005, 0.005, 0.012);
  for (const side of ['L', 'R']) {
    const kn = J['knee' + side];
    for (let z = -0.075; z <= 0.18; z += 0.019) for (const x of [-0.051, 0.051]) add(dashZ, white, kn, [x, -0.456, z]);
    for (let x = -0.04; x <= 0.041; x += 0.02) add(dash, white, kn, [x, -0.456, 0.186]);
    for (let x = -0.03; x <= 0.031; x += 0.02) add(dash, white, kn, [x, -0.456, -0.086]);
    for (let i = 0; i < 3; i++) add(box(0.05, 0.007, 0.009), lace, kn, [0, -0.388 + i * 0.002, 0.07 - i * 0.03], { rot: [-0.25, 0, 0] });
    add(box(0.096, 0.004, 0.004), M.sole, kn, [0, -0.41, 0.112], { rot: [-0.6, 0, 0] });
  }
  return man;
}
