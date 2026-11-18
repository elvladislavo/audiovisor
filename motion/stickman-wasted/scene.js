// BRIEF: A stickman with a tall curly mullet and a short beard and moustache, in a black three-stripe tracksuit,
// white shirt and big red tie, jumps off a snowy mountain, does a front flip, flies belly-down
// for a moment, opens his parachute, then cuts away just above the ground and "lags" in mid-air
// windmilling his arms and pedalling his legs like a GTA San Andreas fall, before slamming into
// the snow. The picture drains to grey, the camera rises and slowly circles the body, and
// "elvladislavo.com" fades in, in white gothic letters with a black outline.
//
// SHOT PLAN (s)        0.0–1.0 summit, step to the edge, crouch · 1.0–2.3 front flip
//                      2.3–3.6 belly-down "flying" · 3.4–4.6 pull, canopy opens
//                      4.6–T_CUT glide · T_CUT cut away · hover/windmill ~2 s · drop · impact
//                      impact+0.3 → end: grey-out, rising orbit camera, red title, 1 s+ hold
// LOOK                 stylised toon shading with black outlines, pale winter sky, snow everywhere
//
// Render:  node .claude/skills/text-to-3d-motion/scripts/render.mjs motion/stickman-wasted/scene.js --out stickman-wasted.mp4
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ease, key, range, wiggle } from '/lib/motion.js';

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => ease.inOutCubic(range(x, a, b));
const sm = (a, b, x) => { const u = range(x, a, b); return u * u * (3 - 2 * u); };

/* ───────────── timing ───────────── */
const T_TAKE = 1.0, FLIP_END = 2.3, PULL = 3.4, DEP0 = 3.75, DEP1 = 4.6;
const CUT_ALT = 7.5;                 // altitude where he cuts away and "lags"
const HOVER = 2.0;                   // seconds stuck in the air
const G = 9.81, DT = 1 / 240;

/* ───────────── trajectory: integrate once, look up by t ───────────── */
function simulate(H, tCut) {
  const ys = [], zs = [];
  let t = T_TAKE, y = H, z = 2.2, vy = 4.2, vz = 6.0, impact = null;
  while (t < 60) {
    const hoverOn = t > tCut + 0.12 && t < tCut + HOVER;
    if (hoverOn) {                                  // the lag: velocity snaps to ~0, tiny drift
      vy = lerp(vy, 0, 0.25); vz = lerp(vz, 0.35, 0.05);
    } else if (t >= tCut + HOVER) {                  // drop like a stone
      vy -= G * DT; vz = lerp(vz, 0.6, 0.01);
    } else {
      const vt = lerp(30, 6.0, sm(DEP0, DEP1, t)), k = G / (vt * vt);
      vy += (-G - k * vy * Math.abs(vy)) * DT;
      const glide = t > DEP0 ? 4.5 : 6.0;
      vz += (glide - vz) * (t > DEP0 ? 1.5 : 0.25) * DT;
    }
    y += vy * DT; z += vz * DT; t += DT;
    ys.push(y); zs.push(z);
    if (y <= 0) { impact = t; break; }
  }
  return { ys, zs, impact, zImpact: z };
}
// choose the cut time so he cuts away at CUT_ALT, and the summit height so the glide lasts ~2 s
const H = 62;
const tCut = T_TAKE + simulate(H, 1e9).ys.findIndex(y => y < CUT_ALT) * DT;
const SIM = simulate(H, tCut);
const T_CUT = tCut, T_DROP = T_CUT + HOVER, T_IMPACT = SIM.impact;
const T_WASTED = T_IMPACT + 0.35, T_TITLE = T_IMPACT + 1.2, T_END = T_IMPACT + 6.2;
const Z_LAND = SIM.zImpact + 0.25;

export const meta = { duration: Math.ceil(T_END * 10) / 10, fps: 30, background: '#cfdeee' };

function feet(t, out) {
  if (t < T_TAKE) {
    const z = key(t, [[0, -1.2], [0.55, 1.6, ease.inOutQuad], [0.85, 2.0], [T_TAKE, 2.2]]);
    return out.set(0, H, z);
  }
  if (t >= T_IMPACT) {
    const u = t - T_IMPACT;
    const settle = sm(0, 0.3, u);                                  // body lies down: COM drops to ~0.12
    const bounce = 0.18 * Math.abs(Math.sin(u * 11)) * Math.exp(-7 * u);
    return out.set(0, lerp(0, -0.86, settle) + bounce, Z_LAND + 0.25 * (1 - Math.exp(-6 * u)));
  }
  const f = (t - T_TAKE) / DT, i = Math.min(Math.floor(f), SIM.ys.length - 2), a = f - i;
  return out.set(0, lerp(SIM.ys[i], SIM.ys[i + 1], a), lerp(SIM.zs[i], SIM.zs[i + 1], a));
}

// whole-body pitch about the centre of mass
function pitch(t) {
  if (t < T_TAKE) return 0;
  if (t < FLIP_END) return ease.inOutCubic(range(t, T_TAKE, FLIP_END)) * 2.5 * Math.PI;   // flip, end belly-down
  if (t < DEP0) return 2.5 * Math.PI + 0.06 * Math.sin(3 * t) * (1 - sm(PULL, DEP0, t));
  if (t < T_CUT) {
    const u = t - DEP0;
    return 2 * Math.PI + (Math.PI / 2) * Math.exp(-3.2 * u) * Math.cos(4.6 * u) + 0.06 * Math.sin(1.7 * u) * sm(5, 5.8, t);
  }
  if (t < T_IMPACT) {
    const lean = lerp(-0.3, -0.9, sm(T_DROP, T_IMPACT, t));        // leaning back, tipping as he drops
    return 2 * Math.PI + lerp(0, lean, sm(T_CUT, T_CUT + 0.35, t)) + 0.05 * Math.sin(t * 7);
  }
  const u = t - T_IMPACT;
  return 2 * Math.PI - 0.9 - (Math.PI / 2 - 0.9) * sm(0, 0.18, u) + 0.15 * Math.exp(-6 * u) * Math.sin(12 * u);
}
const roll = t => (t > T_CUT && t < T_IMPACT ? 0.12 * Math.sin(t * 4.3) : 0);
const yaw = t => (t > T_CUT + 0.2 && t < T_IMPACT ? 0.25 * Math.sin((t - T_CUT) * 1.4) : 0);

/* ───────────── poses ───────────── */
const JOINTS = ['hips', 'spine', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];
const P = {
  stand: () => ({ shoulderL: [0, 0, 0.14], shoulderR: [0, 0, -0.14], elbowL: [-0.15, 0, 0], elbowR: [-0.15, 0, 0], head: [0.05, 0, 0] }),
  walk: t => {
    const p = t * 2 * Math.PI * 1.6, s = Math.sin(p);
    return { hipsY: 0.94 + 0.02 * Math.abs(Math.cos(p)), spine: [0.08, 0, 0], hipL: [-0.45 * s, 0, 0], hipR: [0.45 * s, 0, 0],
      kneeL: [0.15 + 0.5 * Math.max(0, Math.sin(p - 1.2)), 0, 0], kneeR: [0.15 + 0.5 * Math.max(0, Math.sin(p + Math.PI - 1.2)), 0, 0],
      shoulderL: [0.4 * s, 0, 0.12], shoulderR: [-0.4 * s, 0, -0.12], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0] };
  },
  crouch: () => ({ hipsY: 0.72, spine: [0.5, 0, 0], head: [-0.35, 0, 0], hipL: [-0.95, 0, 0], hipR: [-0.95, 0, 0], kneeL: [1.6, 0, 0], kneeR: [1.6, 0, 0], shoulderL: [0.9, 0, 0.12], shoulderR: [0.9, 0, -0.12], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0] }),
  extend: () => ({ spine: [-0.15, 0, 0], head: [-0.1, 0, 0], hipL: [0.2, 0, 0], hipR: [0.2, 0, 0], kneeL: [0.05, 0, 0], kneeR: [0.05, 0, 0], shoulderL: [-2.9, 0, 0.15], shoulderR: [-2.9, 0, -0.15], elbowL: [-0.1, 0, 0], elbowR: [-0.1, 0, 0] }),
  tuck: () => ({ spine: [0.6, 0, 0], head: [0.35, 0, 0], hipL: [-2.2, 0, 0.1], hipR: [-2.2, 0, -0.1], kneeL: [2.3, 0, 0], kneeR: [2.3, 0, 0], shoulderL: [-1.0, 0, 0.2], shoulderR: [-1.0, 0, -0.2], elbowL: [-1.4, 0, 0], elbowR: [-1.4, 0, 0] }),
  fly: t => { const w = 0.06 * Math.sin(t * 6);   // belly-down, arms spread like wings
    return { spine: [-0.35, 0, 0], head: [-0.6, 0, 0], hipL: [0.2, 0, 0.18], hipR: [0.2, 0, -0.18], kneeL: [0.5 + w, 0, 0], kneeR: [0.5 - w, 0, 0], shoulderL: [-0.25, 0, 1.55 + w], shoulderR: [-0.25, 0, -1.55 + w], elbowL: [0, 0, 0.3], elbowR: [0, 0, -0.3] }; },
  pull: () => ({ spine: [-0.3, -0.15, 0], head: [-0.55, 0, 0], hipL: [0.2, 0, 0.18], hipR: [0.2, 0, -0.18], kneeL: [0.6, 0, 0], kneeR: [0.6, 0, 0], shoulderL: [-0.2, 0, 2.2], shoulderR: [0.9, 0, -0.5], elbowL: [0, 0, 0.5], elbowR: [-1.4, 0, 0] }),
  hang: t => { const k = 0.1 * Math.sin(t * 1.9);
    return { head: [0.15, 0.3 * Math.sin(t * 0.8), 0], hipL: [-0.2 + k, 0, 0.06], hipR: [-0.2 - k, 0, -0.06], kneeL: [0.35 + k, 0, 0], kneeR: [0.35 - k, 0, 0], shoulderL: [-0.15, 0, 2.75], shoulderR: [-0.15, 0, -2.75], elbowL: [0, 0, 0.45], elbowR: [0, 0, -0.45] }; },
  cut: () => ({ head: [0.4, 0, 0], spine: [0.15, 0, 0], shoulderL: [-1.0, 0, 0.3], shoulderR: [-1.0, 0, -0.3], elbowL: [-1.7, 0, 0], elbowR: [-1.7, 0, 0], hipL: [-0.3, 0, 0.05], hipR: [-0.3, 0, -0.05], kneeL: [0.4, 0, 0], kneeR: [0.4, 0, 0] }),
  // GTA-style mid-air lag: arms windmill in full circles, legs pedal a bicycle
  windmill: t => {
    const u = t - T_CUT, a = -9.5 * u, p = 11 * u;
    return {
      spine: [-0.15, 0, 0.08 * Math.sin(p)], head: [-0.25 + 0.1 * Math.sin(p * 0.5), 0.2 * Math.sin(u * 3), 0],
      shoulderL: [a - 1.0, 0, 0.45], shoulderR: [a - 1.0 + Math.PI, 0, -0.45],
      elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0],
      hipL: [-0.75 + 0.6 * Math.sin(p), 0, 0.12], hipR: [-0.75 + 0.6 * Math.sin(p + Math.PI), 0, -0.12],
      kneeL: [1.0 + 0.75 * Math.cos(p), 0, 0], kneeR: [1.0 + 0.75 * Math.cos(p + Math.PI), 0, 0],
    };
  },
  splat: () => ({ head: [0.35, 0.5, 0], spine: [0, 0, 0.1], shoulderL: [-0.3, 0, 1.25], shoulderR: [0.25, 0, -1.6], elbowL: [0, 0, 0.5], elbowR: [-0.6, 0, -0.2], hipL: [-0.15, 0, 0.4], hipR: [-0.55, 0, -0.25], kneeL: [0.25, 0, 0], kneeR: [0.9, 0, 0] }),
};
const KEYS = [
  [0, P.stand], [0.15, P.stand], [0.3, P.walk], [0.62, P.walk], [0.82, P.crouch], [T_TAKE, P.extend], [1.2, P.tuck], [1.85, P.tuck],
  [2.3, P.fly], [PULL - 0.1, P.fly], [PULL + 0.15, P.pull], [DEP0 + 0.1, P.pull], [DEP0 + 0.8, P.hang],
  [T_CUT - 0.05, P.hang], [T_CUT + 0.15, P.cut], [T_CUT + 0.3, P.cut], [T_CUT + 0.6, P.windmill], [T_IMPACT, P.windmill],
  [T_IMPACT + 0.2, P.splat], [T_END + 1, P.splat],
];
const ZERO = [0, 0, 0];

/* ───────────── scene ───────────── */
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  renderer.toneMappingExposure = 1.05;
  camera.fov = 40; camera.far = 3000; camera.updateProjectionMatrix();

  // sky gradient + haze
  {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#6f9fd1'); gr.addColorStop(0.6, '#b6d0ea'); gr.addColorStop(1, '#e6eef6');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; scene.background = tex;
  }
  scene.fog = new THREE.Fog(0xdbe6f1, 120, 1100);
  scene.add(new THREE.HemisphereLight(0xe8f1ff, 0x9aa7b8, 1.3));
  const sun = new THREE.DirectionalLight(0xfff3e2, 2.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 160 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const SUN = new THREE.Vector3(-35, 70, 40).normalize();

  // snow ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1), new THREE.MeshLambertMaterial({ color: 0xf1f5fa }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // mountains: snow with rock bands, flat summit ledge
  function mountain(h, r, top, rockiness, s0) {
    const geo = new THREE.CylinderGeometry(top, r, h, 64, 40);
    const p = geo.attributes.position, col = [], v = new THREE.Vector3();
    const snow = new THREE.Color(0xf6f9fc), rock = new THREE.Color(0x5d6370), blue = new THREE.Color(0xc9d8ea);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const rr = Math.hypot(v.x, v.z), hh = v.y / h + 0.5;
      let n = 0, c = snow.clone();
      if (rr > 0.01) {
        const a = Math.atan2(v.z, v.x);
        n = Math.sin(a * 7 + hh * 13 + s0) * 0.5 + Math.sin(a * 17 - hh * 29 + s0 * 2) * 0.3 + Math.sin(a * 3 + hh * 5) * 0.4;
        const k = 1 + n * 0.09 * (1 - sm(0.93, 1, hh));
        v.x *= k; v.z *= k; p.setXYZ(i, v.x, v.y, v.z);
        if (n > 0.35 - rockiness && hh < 0.92 && hh > 0.05) c.lerp(rock, sm(0.35 - rockiness, 0.6 - rockiness, n));
        else c.lerp(blue, 0.25 * (1 - hh));
      }
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    m.castShadow = true;               // receiving shadows on huge flat facets only made blotches
    return m;
  }
  // main peak: steep enough that the whole jump clears the slope (checked below)
  const R_MAIN = 26;
  const peak = mountain(H, R_MAIN, 2.8, 0.1, 1.3);
  peak.position.set(0, H / 2, -0.4); scene.add(peak);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, d = 160 + rnd() * 520, h = 70 + rnd() * 190;
    const m = mountain(h, h * (0.7 + rnd() * 0.5), 1 + rnd() * 3, 0.2, rnd() * 9);
    const z = Math.sin(a) * d - (Math.sin(a) > 0 ? 0 : 0);
    m.position.set(Math.cos(a) * d, h / 2, z < 120 && z > -40 && Math.abs(Math.cos(a) * d) < 120 ? z - 220 : z);
    scene.add(m);
  }

  // snowy pines
  {
    const N = 260, trunk = new THREE.CylinderGeometry(0.18, 0.24, 1, 6), cone = new THREE.ConeGeometry(1.5, 4.2, 8), cap = new THREE.ConeGeometry(0.9, 1.8, 8);
    trunk.translate(0, 0.5, 0); cone.translate(0, 3.0, 0); cap.translate(0, 4.6, 0);
    const mk = (g, c) => { const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: c, flatShading: true }), N); im.castShadow = true; scene.add(im); return im; };
    const ims = [mk(trunk, 0x4a3628), mk(cone, 0x2c5a45), mk(cap, 0xf4f8fc)];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    let n = 0;
    while (n < N) {
      const a = rnd() * Math.PI * 2, r = 6 + rnd() * 160;
      pos.set(Math.cos(a) * r, 0, Z_LAND + Math.sin(a) * r);
      if (Math.hypot(pos.x, pos.z) < R_MAIN + 4 || Math.hypot(pos.x, pos.z - Z_LAND) < 7) continue;
      const k = 0.7 + rnd() * 0.9; s.set(k, k * (0.9 + rnd() * 0.5), k);
      m.compose(pos, q.setFromAxisAngle(Y, rnd() * 6), s);
      ims.forEach(im => im.setMatrixAt(n, m)); n++;
    }
  }

  /* ── the stickman ── */
  const ramp = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  const toon = c => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp });
  const outlineMat = new THREE.ShaderMaterial({
    uniforms: { w: { value: 0.012 } }, side: THREE.BackSide,
    vertexShader: 'uniform float w; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * w, 1.0); }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.03, 0.03, 0.04, 1.0); }',
  });
  const M = { skin: toon(0xf3d6bb), suit: toon(0x17181c), stripe: toon(0xf5f5f2), shirt: toon(0xf7f7f4), tie: toon(0xd0141e), hair: toon(0x4a2c17), dark: toon(0x0d0d10), pack: toon(0x1d1e24) };

  const system = new THREE.Group(), body = new THREE.Group();
  body.position.y = 1.0; system.add(body); scene.add(system);
  const rig = new THREE.Group(); rig.position.y = -1.0; body.add(rig);
  const J = {};
  const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const part = (geo, mat, parent, [x, y, z] = [0, 0, 0], outline = true, scale) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (scale) m.scale.set(...scale); m.castShadow = true; parent.add(m);
    if (outline) { const o = new THREE.Mesh(geo, outlineMat); m.add(o); }
    return m;
  };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 5, 12);
  const ball = r => new THREE.SphereGeometry(r, 20, 14);
  const stripes = (parent, len, y, sx, r) => {          // three white side stripes
    for (const dz of [-0.017, 0, 0.017]) part(new THREE.BoxGeometry(0.006, len, 0.009), M.stripe, parent, [sx * (r + 0.001), y, dz], false);
  };

  const hips = joint('hips', rig, 0, 0.95, 0);
  part(cap(0.085, 0.1), M.suit, hips, [0, 0, 0], true, [1.45, 1, 0.9]).rotation.z = Math.PI / 2;
  const spine = joint('spine', hips, 0, 0.05, 0);
  part(cap(0.12, 0.26), M.suit, spine, [0, 0.24, 0], true, [1.15, 1, 0.62]);                 // jacket
  part(new THREE.BoxGeometry(0.1, 0.27, 0.01), M.shirt, spine, [0, 0.33, 0.071], false);      // shirt front
  part(new THREE.BoxGeometry(0.035, 0.03, 0.022), M.tie, spine, [0, 0.45, 0.082], true);       // tie knot
  { const s = new THREE.Shape();                                                              // big red tie blade
    s.moveTo(-0.022, 0); s.lineTo(0.022, 0); s.lineTo(0.06, -0.27); s.lineTo(0, -0.33); s.lineTo(-0.06, -0.27); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }); g.translate(0, 0, -0.006);
    part(g, M.tie, spine, [0, 0.435, 0.086], true); }
  for (const sx of [1, -1]) {                                                                  // lapels
    const l = part(new THREE.BoxGeometry(0.04, 0.16, 0.008), M.suit, spine, [sx * 0.06, 0.4, 0.078], false); l.rotation.z = sx * 0.35;
  }
  part(new RoundedBoxGeometry(0.22, 0.26, 0.08, 3, 0.02), M.pack, spine, [0, 0.27, -0.1], true); // rig on his back
  part(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 10), M.skin, spine, [0, 0.5, 0], false);   // neck

  // head: classic big round stickman head + curly mullet + beard
  const head = joint('head', spine, 0, 0.52, 0);
  part(ball(0.15), M.skin, head, [0, 0.15, 0]);
  for (const sx of [1, -1]) part(ball(0.014), M.dark, head, [sx * 0.05, 0.18, 0.137], false);
  part(new THREE.TorusGeometry(0.025, 0.007, 6, 12, Math.PI), M.dark, head, [0, 0.092, 0.142], false).rotation.z = Math.PI; // smile
  const curls = [];
  // hair: curly crown
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, el = 0.35 + rnd() * 1.0;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    if (dir.z > 0.55 && dir.y < 0.75) continue;                      // keep the face clear
    const lift = 0.15 + 0.11 * Math.max(0, dir.y);                    // taller the higher it sits
    curls.push([dir.multiplyScalar(lift).add(new THREE.Vector3(0, 0.16, 0)), 0.045 + rnd() * 0.025, M.hair]);
  }
  // hair: a big curly top — a second, taller layer
  for (let i = 0; i < 34; i++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 0.14;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.9 - 0.01;
    if (z > 0.1) continue;
    curls.push([new THREE.Vector3(x, 0.35 + 0.1 * (1 - rr / 0.14) + rnd() * 0.035, z), 0.045 + rnd() * 0.025, M.hair]);
  }
  // hair: the mullet — long curly business at the back down past the shoulders
  for (let i = 0; i < 40; i++) {
    const y = 0.14 - rnd() * 0.36, spread = 0.12 - Math.max(0, -y) * 0.12;
    curls.push([new THREE.Vector3((rnd() - 0.5) * 2 * spread, y, -0.11 - rnd() * 0.06 + Math.min(0, y) * 0.15), 0.036 + rnd() * 0.022, M.hair]);
  }
  // short beard: small curls hugging the jaw and chin, plus a trim moustache
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI * 0.88 + rnd() * Math.PI * 0.76, h = 0.03 + rnd() * 0.06;
    const sr = Math.sqrt(Math.max(0, 0.15 * 0.15 - (h - 0.15) * (h - 0.15))) + 0.004;   // sit on the head surface
    if (Math.abs(Math.cos(a)) < 0.3 && h > 0.065) continue;                          // keep the mouth clear
    curls.push([new THREE.Vector3(Math.cos(a) * sr, h, -Math.sin(a) * sr), 0.014 + rnd() * 0.006, M.hair]);
  }
  for (let i = 0; i < 7; i++) {
    const x = -0.045 + i * 0.015, y = 0.112 - Math.abs(x) * 0.35;
    curls.push([new THREE.Vector3(x, y, Math.sqrt(0.15 * 0.15 - x * x - (y - 0.15) * (y - 0.15)) + 0.004), 0.014, M.hair]);
  }
  const curlGeo = new THREE.IcosahedronGeometry(1, 1);
  for (const [p, r, mat] of curls) part(curlGeo, mat, head, [p.x, p.y, p.z], true, [r, r, r]);

  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = joint('shoulder' + s, spine, sx * 0.15, 0.43, 0);
    part(ball(0.045), M.suit, sh, [0, 0, 0], false);
    part(cap(0.035, 0.24), M.suit, sh, [0, -0.15, 0]);
    stripes(sh, 0.26, -0.15, sx, 0.035);
    const el = joint('elbow' + s, sh, 0, -0.3, 0);
    part(cap(0.032, 0.2), M.suit, el, [0, -0.12, 0]);
    stripes(el, 0.2, -0.12, sx, 0.032);
    part(new THREE.CylinderGeometry(0.034, 0.034, 0.03, 10), M.shirt, el, [0, -0.245, 0], false);   // shirt cuff
    part(ball(0.04), M.skin, el, [0, -0.29, 0]);
    const hp = joint('hip' + s, hips, sx * 0.075, -0.03, 0);
    part(cap(0.045, 0.36), M.suit, hp, [0, -0.22, 0]);
    stripes(hp, 0.36, -0.22, sx, 0.045);
    const kn = joint('knee' + s, hp, 0, -0.44, 0);
    part(cap(0.042, 0.34), M.suit, kn, [0, -0.2, 0]);
    stripes(kn, 0.34, -0.2, sx, 0.042);
    part(new RoundedBoxGeometry(0.09, 0.06, 0.2, 3, 0.025), M.dark, kn, [0, -0.43, 0.04]);
  }
  for (const n of JOINTS) J[n].userData.rest = J[n].position.clone();

  /* ── parachute (red / white / black gores to match the suit) ── */
  const CR = 3.4, TH0 = 0.14, TH1 = 1.26, CSY = 0.62, GORES = 18;
  const canopy = new THREE.Group(); scene.add(canopy);
  const canopyMesh = (() => {
    const geo = new THREE.SphereGeometry(CR, 90, 14, 0, Math.PI * 2, TH0, TH1 - TH0);
    const p = geo.attributes.position, colors = [], v = new THREE.Vector3(), crumple = p.clone();
    const pal = [new THREE.Color(0xd0141e), new THREE.Color(0xf6f4ef), new THREE.Color(0x17181c)];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const phi = (Math.atan2(v.z, v.x) + Math.PI * 2) % (Math.PI * 2), c = pal[Math.floor(phi / (Math.PI * 2 / GORES)) % 3];
      colors.push(c.r, c.g, c.b);
      const th = Math.acos(THREE.MathUtils.clamp(v.y / CR, -1, 1)), n = Math.sin(phi * 9) * Math.cos(th * 11) + 0.5 * Math.sin(phi * 23 + th * 5);
      const k = 0.22 + 0.08 * n; crumple.setXYZ(i, v.x * k, v.y * 1.2 + 0.3 * n - th * 1.6, v.z * k);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const tmp = new THREE.BufferGeometry(); tmp.setIndex(geo.index); tmp.setAttribute('position', crumple); tmp.computeVertexNormals();
    geo.morphAttributes.position = [crumple]; geo.morphAttributes.normal = [tmp.attributes.normal];
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, side: THREE.DoubleSide }));
    m.updateMorphTargets(); m.castShadow = true; m.scale.y = CSY; canopy.add(m);
    return m;
  })();
  const LINES = 18;
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINES * 6), 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x2a2a30 }));
  lines.frustumCulled = false; scene.add(lines);
  const rim = [...Array(LINES)].map((_, i) => { const f = i / LINES * Math.PI * 2; return new THREE.Vector3(CR * Math.sin(TH1) * Math.cos(f), CR * Math.cos(TH1) * CSY, CR * Math.sin(TH1) * Math.sin(f)); });

  /* ── snowfall + impact puff ── */
  const FLAKES = 1400, flakeBase = new Float32Array(FLAKES * 3);
  for (let i = 0; i < FLAKES; i++) flakeBase.set([(rnd() - 0.5) * 50, (rnd() - 0.5) * 50, (rnd() - 0.5) * 50], i * 3);
  const flakeGeo = new THREE.BufferGeometry(); flakeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLAKES * 3), 3));
  const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
  flakes.frustumCulled = false; scene.add(flakes);

  const PUFF = 90, puff = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xf6f9fd }), PUFF);
  const puffV = [...Array(PUFF)].map(() => { const a = rnd() * Math.PI * 2, s = 1.5 + rnd() * 4; return [Math.cos(a) * s, 2 + rnd() * 5, Math.sin(a) * s, 0.06 + rnd() * 0.12]; });
  puff.frustumCulled = false; scene.add(puff);
  const dent = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshLambertMaterial({ color: 0xc3d1e2, transparent: true, opacity: 0 }));
  dent.rotation.x = -Math.PI / 2; dent.position.set(0, 0.02, Z_LAND + 0.1); dent.scale.set(0.8, 1.4, 1); scene.add(dent);

  /* ── wasted-style grade + title ── */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, sat: { value: 1 }, bright: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float sat; uniform float bright; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        vec2 d = vUv - 0.5; float vig = 1.0 - (1.0 - sat) * 0.55 * dot(d, d) * 2.0;
        gl_FragColor = vec4(mix(vec3(l), c.rgb, sat) * bright * vig, c.a); }`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  const font = new FontFace('Wasted', `url(${asset('PirataOne.ttf')})`);
  await font.load(); document.fonts.add(font);
  const tc = document.createElement('canvas'); tc.width = 2048; tc.height = 400;
  { const g = tc.getContext('2d');
    g.translate(1024, 205);
    g.font = '250px Wasted';                          // Pirata One: gothic but clean enough to read at a glance
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = Math.min(1, 1880 / g.measureText('elvladislavo.com').width); g.scale(fit, fit);
    g.lineJoin = 'round'; g.lineWidth = 34; g.strokeStyle = '#050505'; g.strokeText('elvladislavo.com', 0, 0);
    g.fillStyle = '#f4f4f2'; g.fillText('elvladislavo.com', 0, 0); }
  const titleTex = new THREE.CanvasTexture(tc); titleTex.colorSpace = THREE.SRGBColorSpace;
  const overlay = new THREE.Scene(), ortho = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -1, 1);
  const tw = width * 0.9, title = new THREE.Mesh(new THREE.PlaneGeometry(tw, tw * 400 / 2048), new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, toneMapped: false, opacity: 0 }));
  overlay.add(title);

  // check the jump clears the mountain slope
  {
    let minClear = Infinity; const v = new THREE.Vector3();
    for (let t = T_TAKE + 0.3; t < T_IMPACT; t += 0.05) {
      feet(t, v); const d = Math.hypot(v.x, v.z + 0.4);
      const surf = d < 2.8 ? H : H * (1 - (d - 2.8) / (R_MAIN - 2.8));
      if (surf > 0) minClear = Math.min(minClear, v.y - surf);
    }
    console.log(`[scene] summit ${H} m · cut at ${T_CUT.toFixed(2)} s · impact ${T_IMPACT.toFixed(2)} s at z=${Z_LAND.toFixed(1)} · min slope clearance ${minClear.toFixed(1)} m · duration ${meta.duration}`);
  }

  /* ── per-frame ── */
  const F = new THREE.Vector3(), com = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), packW = new THREE.Vector3();
  const shL = new THREE.Vector3(), shR = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
  const cutState = { pos: new THREE.Vector3(), rot: 0, done: false };
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();

  function applyPose(t) {
    let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= t) i++;
    const [t0, pa] = KEYS[i], [t1, pb] = KEYS[i + 1], w = sm(t0, t1, t), A = pa(t), B = pb(t);
    for (const j of JOINTS) { const a = A[j] || ZERO, b = B[j] || ZERO; J[j].rotation.set(lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w)); }
    J.hips.position.y = lerp(A.hipsY ?? 0.95, B.hipsY ?? 0.95, w);
  }

  function canopyAt(t, outPos) {          // where the open canopy sits for a given time (before the cut)
    const pt = pitch(t), inf = sm(DEP0 + 0.25, DEP1, t), swing = (pt - 2 * Math.PI) * inf;
    return { swing, inf, pos: outPos.set(0, 5.3, 0).applyAxisAngle(X, swing).add(com) };
  }

  // camera keys: [t, offset from COM, look offset]
  const CAM = [
    [0, [1.25, 0.55, 1.7], [0, 0.72, 0]], [0.75, [1.7, 0.45, 2.1], [0, 0.6, 0]],
    [1.4, [4.34, 0.28, 0.42], [0, 0, 0]], [2.2, [4.48, 0.14, 0.84], [0, 0, 0]],
    [2.9, [1.12, -0.84, 4.34], [0, 0, 0]], [3.5, [1.54, -0.56, 4.20], [0, 0.2, 0]],
    [4.3, [12.5, 1.6, 11.0], [0, 2.9, 0]], [T_CUT - 0.4, [11.0, 2.6, 12.5], [0, 2.7, 0]],
    [T_CUT + 0.6, [2.66, 0.42, 3.50], [0, 0.1, 0]], [T_DROP, [2.80, 0.14, 3.64], [0, 0, 0]],
    [T_IMPACT, [3.01, 0.98, 3.50], [0, 0, 0]],
  ];
  const off = new THREE.Vector3(), look = new THREE.Vector3();

  return {
    update(t) {
      feet(t, F);
      system.position.copy(F);
      body.rotation.set(pitch(t), yaw(t), roll(t));
      applyPose(t);
      system.updateMatrixWorld(true);
      com.set(0, 1, 0).applyMatrix4(system.matrixWorld);

      // canopy: out of the pack → inflated → cut away and tumbling off
      const out = t > DEP0 - 0.1;
      canopy.visible = out && t < T_CUT + 3.5;
          const u = range(t, DEP0 - 0.1, DEP1), ext = sm(0, 0.55, u), inf = sm(0.4, 1, u);
      let swing;
      if (t < T_CUT) {
        const c = canopyAt(t, tmp); swing = c.swing;
        canopy.position.copy(com).lerp(c.pos, ext);
        canopy.rotation.set(swing, 0, 0);
        const sxz = 0.1 + 0.9 * inf; canopy.scale.set(sxz, 0.25 + 0.75 * inf, sxz);
        canopyMesh.morphTargetInfluences[0] = 1 - inf;
      } else {
        const tc = Math.min(t, T_CUT); feet(T_CUT, tmp2); const comCut = tmp2.clone().add(new THREE.Vector3(0, 1, 0));
        const saved = com.clone(); com.copy(comCut); const c = canopyAt(T_CUT, tmp); com.copy(saved);
        const k = t - T_CUT;
        canopy.position.copy(c.pos).add(tmp2.set(-1.2 * k, 3.2 * k - 0.4 * k * k, -2.6 * k));
        canopy.rotation.set(c.swing - 0.9 * k, 0.5 * k, 0.7 * k);
        canopy.scale.set(1, 1, 1);
        canopyMesh.morphTargetInfluences[0] = sm(0, 1.6, k) * 0.75;
      }
      canopy.updateMatrixWorld(true);
      const arr = lineGeo.attributes.position.array;
      J.shoulderL.getWorldPosition(shL); J.shoulderR.getWorldPosition(shR);
      const freeEnd = tmp2.set(0, -5.0, 0).applyQuaternion(canopy.quaternion).add(canopy.position);
      for (let i = 0; i < LINES; i++) {
        tmp.copy(rim[i]); canopy.localToWorld(tmp);
        const s = t < T_CUT ? (rim[i].x >= 0 ? shL : shR) : freeEnd;
        arr.set([tmp.x, tmp.y, tmp.z, s.x, s.y + 0.06, s.z], i * 6);
      }
      lineGeo.attributes.position.needsUpdate = true;
      lines.visible = canopy.visible;

      // sun & shadows follow him
      sun.target.position.copy(com); sun.position.copy(com).addScaledVector(SUN, 70);

      // snow drifting around the camera's subject
      const fa = flakeGeo.attributes.position.array;
      for (let i = 0; i < FLAKES; i++) {
        const bx = flakeBase[i * 3], by = flakeBase[i * 3 + 1], bz = flakeBase[i * 3 + 2];
        const x = bx + 0.6 * Math.sin(t * 0.7 + i) + t * 0.8, y = by - t * 1.3, z = bz;
        fa[i * 3] = com.x + ((((x - com.x) % 50) + 75) % 50 - 25);
        fa[i * 3 + 1] = com.y + ((((y - com.y) % 50) + 75) % 50 - 25);
        fa[i * 3 + 2] = com.z + ((((z - com.z) % 50) + 75) % 50 - 25);
      }
      flakeGeo.attributes.position.needsUpdate = true;

      // impact puff
      const ui = t - T_IMPACT;
      for (let i = 0; i < PUFF; i++) {
        const [vx, vy, vz, r] = puffV[i];
        const k = Math.max(0, ui), alive = ui > 0 ? 1 - sm(0.9, 2.2, ui) : 0;
        tmp.set(vx * k * 0.8, Math.max(0, vy * k - 4.9 * k * k) + 0.05, Z_LAND + vz * k * 0.8);
        mtx.compose(tmp, q.identity(), sc.setScalar(r * alive + 1e-4)); puff.setMatrixAt(i, mtx);
      }
      puff.instanceMatrix.needsUpdate = true;
      dent.material.opacity = 0.5 * sm(T_IMPACT, T_IMPACT + 0.2, t);

      // camera
      let i = 0; while (i < CAM.length - 2 && CAM[i + 1][0] <= t) i++;
      const [t0, o0, l0] = CAM[i], [t1, o1, l1] = CAM[i + 1], w = sm(t0, t1, t);
      off.set(lerp(o0[0], o1[0], w), lerp(o0[1], o1[1], w), lerp(o0[2], o1[2], w));
      look.set(lerp(l0[0], l1[0], w), lerp(l0[1], l1[1], w), lerp(l0[2], l1[2], w));
      // wasted: rise and slowly circle above the body
      if (t > T_IMPACT) {
        const k = range(t, T_WASTED, T_END), e = ease.inOutQuad(k);
        const a0 = Math.atan2(3.01, 3.5), r0 = Math.hypot(3.01, 3.5);
        const a = a0 + (t > T_WASTED ? (t - T_WASTED) * 0.22 : 0);
        const r = lerp(r0, 3.2, e), h = lerp(0.98, 4.4, e);
        off.set(Math.sin(a) * r, h, Math.cos(a) * r);
      }
      camera.position.copy(com).add(off);
      camera.position.x += wiggle(t, 0.5, 3) * 0.05; camera.position.y += wiggle(t, 0.4, 5) * 0.04;
      if (camera.position.y < 0.5) camera.position.y = 0.5;
      camera.lookAt(look.add(com));

      // grade + title
      const g = sm(T_WASTED, T_WASTED + 1.1, t);
      grade.uniforms.sat.value = 1 - 0.92 * g;
      grade.uniforms.bright.value = 1 - 0.12 * g;
      title.material.opacity = sm(T_TITLE, T_TITLE + 0.7, t);
      title.position.y = -height * 0.02;
    },
    render() {
      composer.render();
      if (title.material.opacity > 0.001) {
        renderer.autoClear = false; renderer.clearDepth(); renderer.render(overlay, ortho); renderer.autoClear = true;
      }
    },
  };
}
