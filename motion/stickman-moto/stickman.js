// stickman.js — the elvladislavo character, built from primitives, toon-shaded with ink outlines.
// Reference: curly auburn-brown hair framing the face, short beard, black blazer worn open over a
// light-blue shirt, patterned red tie, black belt with a silver buckle, black trousers with three
// white side stripes, red snakeskin square-toe shoes.
//
//   const man = buildStickman({ seed: 7 });
//   scene.add(man.system);  man.applyPose(KEYS, t);  man.J.head …
// Coordinates: feet at y = 0 when standing, facing +z. man.body pivots at the centre of mass (y = 1).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const JOINTS = ['hips', 'spine', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];

const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const lerp = (a, b, k) => a + (b - a) * k;

function canvasTex(size, draw, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

// Red snakeskin: offset rows of rounded scales with dark seams and a highlight on each scale.
function snakeTexture() {
  return canvasTex(256, (g, S) => {
    g.fillStyle = '#5a050b'; g.fillRect(0, 0, S, S);
    const w = 32, h = 22;
    for (let row = -1; row < S / h + 1; row++) for (let col = -1; col < S / w + 1; col++) {
      const x = col * w + (row % 2 ? w / 2 : 0), y = row * h;
      const gr = g.createRadialGradient(x + w * 0.4, y + h * 0.35, 1, x + w / 2, y + h / 2, w * 0.6);
      gr.addColorStop(0, '#e4404a'); gr.addColorStop(0.55, '#b3141f'); gr.addColorStop(1, '#7c0912');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(x + w / 2, y + 1); g.quadraticCurveTo(x + w - 1, y + 2, x + w - 2, y + h / 2);
      g.quadraticCurveTo(x + w - 2, y + h - 1, x + w / 2, y + h - 1); g.quadraticCurveTo(x + 2, y + h - 1, x + 2, y + h / 2);
      g.quadraticCurveTo(x + 1, y + 2, x + w / 2, y + 1); g.fill();
    }
  }, 3);
}

// Patterned tie: red silk with a small dark diamond lattice and pale dots, like the reference.
function tieTexture() {
  return canvasTex(128, (g, S) => {
    g.fillStyle = '#c0141f'; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#6a0710'; g.lineWidth = 5;
    const n = 4, d = S / n;
    for (let i = -n; i <= 2 * n; i++) {
      g.beginPath(); g.moveTo(i * d, 0); g.lineTo(i * d + S, S); g.stroke();
      g.beginPath(); g.moveTo(i * d, 0); g.lineTo(i * d - S, S); g.stroke();
    }
    g.fillStyle = '#f2dcdc';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.beginPath(); g.arc(x * d + d / 2, y * d, 3.2, 0, 7); g.fill(); g.beginPath(); g.arc(x * d, y * d + d / 2, 3.2, 0, 7); g.fill(); }
  }, 1);
}

export function buildStickman({ seed = 7 } = {}) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;

  const ramp = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra });
  const outlineMat = new THREE.ShaderMaterial({
    uniforms: { w: { value: 0.011 } }, side: THREE.BackSide,
    vertexShader: 'uniform float w; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * w, 1.0); }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.03, 0.03, 0.04, 1.0); }',
  });
  const tieTex = tieTexture(); tieTex.repeat.set(22, 22);
  const M = {
    skin: toon(0xf1d0b2), blazer: toon(0x1b1a1f), trousers: toon(0x141418), stripe: toon(0xe4e4df),
    shirt: toon(0xdfe9f7), tie: toon(0xffffff, { map: tieTex }), tieKnot: toon(0xb0121c),
    hair: toon(0x4b2a16), hairLight: toon(0x7d4521), beard: toon(0x6a3a1e), earIn: toon(0xd9a687),
    dark: toon(0x0d0d10), belt: toon(0x111114), buckle: toon(0xc9ccd2), shoe: toon(0xffffff, { map: snakeTexture() }), sole: toon(0x2a0a0c),
  };

  const system = new THREE.Group(), body = new THREE.Group();
  body.position.y = 1.0; system.add(body);
  const rig = new THREE.Group(); rig.position.y = -1.0; body.add(rig);
  const J = {};
  const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const part = (geo, mat, parent, [x, y, z] = [0, 0, 0], outline = true, scale) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (scale) m.scale.set(...scale); m.castShadow = true; parent.add(m);
    if (outline) m.add(new THREE.Mesh(geo, outlineMat));
    return m;
  };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 5, 12);
  const ball = r => new THREE.SphereGeometry(r, 20, 14);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  /* ── hips, belt, jacket skirt ── */
  const hips = joint('hips', rig, 0, 0.95, 0);
  part(cap(0.085, 0.1), M.trousers, hips, [0, 0, 0], true, [1.45, 1, 0.9]).rotation.z = Math.PI / 2;
  part(box(0.24, 0.035, 0.16), M.belt, hips, [0, 0.055, 0], false);
  part(box(0.04, 0.03, 0.01), M.buckle, hips, [0, 0.055, 0.082], false);
  for (const sx of [1, -1]) {                                   // blazer front panels hanging open over the hips
    const p = part(box(0.1, 0.24, 0.025), M.blazer, hips, [sx * 0.075, -0.05, 0.075]); p.rotation.set(-0.08, 0, sx * 0.08);
  }
  part(box(0.24, 0.25, 0.025), M.blazer, hips, [0, -0.05, -0.07]).rotation.x = 0.1;   // back of the jacket

  /* ── torso: open blazer, shirt, collar, patterned tie ── */
  const spine = joint('spine', hips, 0, 0.05, 0);
  part(cap(0.12, 0.26), M.blazer, spine, [0, 0.24, 0], true, [1.18, 1, 0.64]);
  { const sh = new THREE.Shape();                                // shirt: a V from the collar down to the belt
    sh.moveTo(-0.055, 0.46); sh.lineTo(0.055, 0.46); sh.lineTo(0.02, 0.0); sh.lineTo(-0.02, 0.0); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false });
    part(g, M.shirt, spine, [0, 0, 0.068], false); }
  for (const sx of [1, -1]) {
    const lap = part(box(0.045, 0.2, 0.01), M.blazer, spine, [sx * 0.058, 0.36, 0.078]); lap.rotation.z = sx * 0.2;     // lapels
    const notch = part(box(0.03, 0.04, 0.01), M.blazer, spine, [sx * 0.075, 0.45, 0.079], false); notch.rotation.z = -sx * 0.6;
    const col = part(box(0.035, 0.05, 0.008), M.shirt, spine, [sx * 0.03, 0.485, 0.06], false); col.rotation.z = sx * 0.7;  // collar points
  }
  part(new THREE.CylinderGeometry(0.045, 0.048, 0.05, 14), M.shirt, spine, [0, 0.49, 0], false);    // collar band
  part(box(0.034, 0.03, 0.022), M.tieKnot, spine, [0, 0.465, 0.08], true);
  { const t = new THREE.Shape();
    t.moveTo(-0.02, 0); t.lineTo(0.02, 0); t.lineTo(0.052, -0.3); t.lineTo(0, -0.35); t.lineTo(-0.052, -0.3); t.closePath();
    const g = new THREE.ExtrudeGeometry(t, { depth: 0.01, bevelEnabled: false }); g.translate(0, 0, -0.005);
    part(g, M.tie, spine, [0, 0.452, 0.084], true); }
  part(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 10), M.skin, spine, [0, 0.52, 0], false);       // neck

  /* ── head: face, brows, nose, short auburn beard, curly hair ── */
  const head = joint('head', spine, 0, 0.53, 0);
  part(ball(0.15), M.skin, head, [0, 0.15, 0]);
  for (const sx of [1, -1]) {
    part(ball(0.014), M.dark, head, [sx * 0.05, 0.18, 0.137], false);
    const brow = part(box(0.045, 0.011, 0.01), M.hair, head, [sx * 0.05, 0.212, 0.135], false); brow.rotation.z = -sx * 0.12;
  }
  part(ball(0.02), M.skin, head, [0, 0.145, 0.15], true);                                                        // nose
  part(new THREE.TorusGeometry(0.024, 0.006, 6, 12, Math.PI), M.dark, head, [0, 0.092, 0.142], false).rotation.z = Math.PI;
  // solid base layers under the curls, so no scalp or chin shows through the gaps
  // (sphere param: x = -cos(phi)·sin(theta), y = cos(theta), z = sin(phi)·sin(theta); phi = π/2 faces front)
  const shell = (r, phi0, phiLen, th0, thLen, mat, y = 0.15) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20, phi0, phiLen, th0, thLen), mat);
    m.position.y = y; m.castShadow = true; head.add(m); return m;
  };
  shell(0.156, 0, Math.PI * 2, 0, 0.95, M.hair).rotation.x = -0.3;          // scalp cap, hairline lifted at the front
  shell(0.158, Math.PI, Math.PI, 0.5, 1.95, M.hair);                          // back half, down to the nape (behind the ears)
  shell(0.155, Math.PI * 0.62, Math.PI * 0.38, 0.55, 0.62, M.hair);           // temples above the ears
  shell(0.155, 0, Math.PI * 0.38, 0.55, 0.62, M.hair);
  shell(0.153, 0, Math.PI, 2.12, 0.72, M.beard);                              // chin + jaw, starting just under the mouth
  shell(0.153, 0.02, 0.95, 1.7, 0.5, M.beard);                                // cheeks / sideburns down from the ears
  shell(0.153, Math.PI - 0.97, 0.95, 1.7, 0.5, M.beard);

  const curls = [];
  const hairMat = () => (rnd() < 0.3 ? M.hairLight : M.hair);
  for (let i = 0; i < 110; i++) {                                                                               // crown, dense
    const a = rnd() * Math.PI * 2, el = 0.3 + rnd() * 1.25;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    if (dir.z > 0.55 && dir.y < 0.75) continue;
    if (Math.abs(dir.x) > 0.8 && dir.y < 0.45 && dir.z > -0.3) continue;                                       // keep the ears clear
    curls.push([dir.multiplyScalar(0.152 + 0.1 * Math.max(0, dir.y)).add(new THREE.Vector3(0, 0.16, 0)), 0.045 + rnd() * 0.025, hairMat()]);
  }
  for (let i = 0; i < 60; i++) {                                                                                // volume on top
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 0.15, x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.9 - 0.01;
    if (z > 0.1) continue;
    curls.push([new THREE.Vector3(x, 0.32 + 0.1 * (1 - rr / 0.15) + rnd() * 0.035, z), 0.046 + rnd() * 0.022, hairMat()]);
  }
  for (let i = 0; i < 32; i++) {                                                                                // bangs, 4 rows into the crown
    const x = -0.095 + (i % 8) * 0.027 + (rnd() - 0.5) * 0.01, row = Math.floor(i / 8);
    const y = [0.258, 0.284, 0.31, 0.336][row] - Math.abs(x) * 0.25 + rnd() * 0.008;
    curls.push([new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 0.0225 - x * x - (y - 0.15) ** 2)) + 0.012), 0.028 + rnd() * 0.01, hairMat()]);
  }
  for (let i = 0; i < 44; i++) {                                                                                // sides: behind the ears and down to the jaw
    const sx = i % 2 ? 1 : -1, y = 0.02 + rnd() * 0.24, zz = -0.13 + rnd() * 0.09;
    curls.push([new THREE.Vector3(sx * (0.135 + rnd() * 0.04), y, zz), 0.034 + rnd() * 0.02, hairMat()]);
  }
  for (let i = 0; i < 14; i++) {                                                                                // temples, in front of and above the ears
    const sx = i % 2 ? 1 : -1, y = 0.215 + rnd() * 0.06, zz = 0.0 + rnd() * 0.07;
    curls.push([new THREE.Vector3(sx * (0.135 + rnd() * 0.02), y, zz), 0.03 + rnd() * 0.012, hairMat()]);
  }
  for (let i = 0; i < 75; i++) {                                                                                // back, down to the collar
    const y = 0.18 - rnd() * 0.32, spread = 0.14 - Math.max(0, -y) * 0.15;
    curls.push([new THREE.Vector3((rnd() - 0.5) * 2 * spread, y, -0.11 - rnd() * 0.06 + Math.min(0, y) * 0.12), 0.036 + rnd() * 0.022, hairMat()]);
  }
  for (let i = 0; i < 150; i++) {                                                                               // short beard, dense
    const a = -Math.PI * 0.94 + rnd() * Math.PI * 0.88, h = 0.015 + rnd() * 0.095;
    const sr = Math.sqrt(Math.max(0, 0.0225 - (h - 0.15) ** 2)) + 0.006;
    if (Math.abs(Math.cos(a)) < 0.38 && h > 0.062) continue;                                                   // mouth stays clear
    if (Math.abs(Math.cos(a)) > 0.9 && h > 0.1) continue;                                                      // below the ears only
    curls.push([new THREE.Vector3(Math.cos(a) * sr, h, -Math.sin(a) * sr), 0.016 + rnd() * 0.007, M.beard]);
  }
  for (let i = 0; i < 13; i++) {                                                                                // moustache, two rows
    const x = -0.05 + (i % 7) * 0.0167, y = (i < 7 ? 0.111 : 0.12) - Math.abs(x) * 0.35;
    curls.push([new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 0.0225 - x * x - (y - 0.15) ** 2)) + 0.005), 0.015, M.beard]);
  }
  // ears: outer shell, inner fold, little lobe
  for (const sx of [1, -1]) {
    const ear = part(new THREE.SphereGeometry(1, 16, 12), M.skin, head, [sx * 0.15, 0.148, 0.005], true, [0.022, 0.042, 0.03]);
    ear.rotation.y = sx * 0.35;
    part(new THREE.SphereGeometry(1, 12, 10), M.earIn, head, [sx * 0.162, 0.15, 0.012], false, [0.008, 0.026, 0.017]).rotation.y = sx * 0.35;
  }
  const curlGeo = new THREE.IcosahedronGeometry(1, 1);
  for (const [p, r, mat] of curls) part(curlGeo, mat, head, [p.x, p.y, p.z], true, [r, r, r]);

  /* ── limbs ── */
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const sh = joint('shoulder' + side, spine, sx * 0.15, 0.43, 0);
    part(ball(0.05), M.blazer, sh, [0, 0, 0], false);                          // padded blazer shoulder
    part(cap(0.037, 0.24), M.blazer, sh, [0, -0.15, 0]);
    const el = joint('elbow' + side, sh, 0, -0.3, 0);
    part(cap(0.034, 0.2), M.blazer, el, [0, -0.12, 0]);
    part(new THREE.CylinderGeometry(0.033, 0.033, 0.035, 10), M.shirt, el, [0, -0.245, 0], false);   // shirt cuff
    part(ball(0.04), M.skin, el, [0, -0.29, 0]);
    const hp = joint('hip' + side, hips, sx * 0.075, -0.03, 0);
    part(cap(0.046, 0.36), M.trousers, hp, [0, -0.22, 0]);
    for (const dz of [-0.017, 0, 0.017]) part(box(0.006, 0.36, 0.009), M.stripe, hp, [sx * 0.047, -0.22, dz], false);
    const kn = joint('knee' + side, hp, 0, -0.44, 0);
    part(cap(0.043, 0.34), M.trousers, kn, [0, -0.2, 0]);
    for (const dz of [-0.017, 0, 0.017]) part(box(0.006, 0.34, 0.009), M.stripe, kn, [sx * 0.044, -0.2, dz], false);
    // square-toe snakeskin shoe: upper + flat square toe box + heel + sole
    part(new RoundedBoxGeometry(0.095, 0.07, 0.2, 2, 0.014), M.shoe, kn, [0, -0.425, 0.025]);
    part(new RoundedBoxGeometry(0.095, 0.05, 0.07, 2, 0.008), M.shoe, kn, [0, -0.435, 0.145]);
    part(box(0.1, 0.018, 0.27), M.sole, kn, [0, -0.466, 0.05], false);
    part(box(0.085, 0.03, 0.05), M.sole, kn, [0, -0.45, -0.06], false);
  }

  /* ── pose blending: KEYS = [[time, t => ({ joint: [x,y,z], hipsY })], …] ── */
  function applyPose(KEYS, t) {
    let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= t) i++;
    const [t0, pa] = KEYS[i], [t1, pb] = KEYS[i + 1], w = sm(t0, t1, t), A = pa(t), B = pb(t);
    for (const j of JOINTS) { const a = A[j] || [0, 0, 0], b = B[j] || [0, 0, 0]; J[j].rotation.set(lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)); }
    J.hips.position.y = lerp(A.hipsY ?? 0.95, B.hipsY ?? 0.95, w);
  }
  const shoe = (side, out) => J['knee' + side].localToWorld(out.set(0, -0.43, 0.06));
  return { system, body, J, M, applyPose, shoe, ramp, outlineMat };
}
