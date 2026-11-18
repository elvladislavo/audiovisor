// BRIEF: The elvladislavo character rides a motorbike through the desert at sunset on flaming
// wheels with fire blasting from the exhausts. The front wheel hits a rock: he's thrown over the
// bars, tumbles through the air windmilling, and lands in the sand. The bike cartwheels, comes to
// rest and explodes; out of the fireball and smoke rises "elvladislavo.com".
//
// SHOT PLAN (s)  0.0–3.2 crane up from the snakeskin boots on the pegs → tie → face, bike moving
//                3.2–6.6 tracking shots, flame trails off both wheels, exhaust fire
//                6.6     front wheel hits a rock · 6.6–8.0 rider flies, bike cartwheels
//                8.0–9.3 he lands and rolls, bike settles and smokes · 9.3 BOOM
//                9.9–end title rises out of the fireball through the smoke, hold
// LOOK           toon character with ink outlines, warm sunset desert, additive fire + bloom
//
// Render: node .claude/skills/text-to-3d-motion/scripts/render.mjs motion/stickman-moto/scene.js --width 1080 --height 1920 --out moto.mp4
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease, range, wiggle } from '/lib/motion.js';
import { buildStickman } from '/assets/stickman.js';

const lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

/* ───────────── timing & motion ───────────── */
const V = 15, T_HIT = 6.6, Z_HIT = V * T_HIT, T_BOOM = 9.3, T_TITLE = T_BOOM + 0.6, T_END = T_BOOM + 6.4;
const WHEEL_R = 0.36, WHEEL_Z = 0.72;
export const meta = { duration: Math.round(T_END * 10) / 10, fps: 30, background: '#e9a46b' };

// Bike: rides straight, then a precomputed cartwheel (COM y, z, pitch, roll) after the hit.
const DT = 1 / 240;
const BIKE = (() => {
  const out = []; let y = 0.55, z = Z_HIT, vy = 5.2, vz = 9.5, p = 0, w = 7.5, t = T_HIT; const bounces = [];
  while (t < T_END + 0.1) {
    vy -= 9.81 * DT; y += vy * DT; z += vz * DT; p += w * DT;
    if (y < 0.42 && vy < 0) { if (Math.abs(vy) > 1.2) bounces.push([t, z]); vy = -vy * 0.42; vz *= 0.62; w *= 0.6; y = 0.42; }
    if (y <= 0.43 && Math.abs(vy) < 0.8) { vz *= 0.985; w *= 0.97; }
    out.push([y, z, p]); t += DT;
  }
  return { out, bounces };
})();
function bikeState(t) {
  if (t < T_HIT) return { y: 0.55 + 0.012 * Math.sin(t * 23), z: V * t, pitch: -0.015 * Math.sin(t * 3), roll: 0.03 * Math.sin(t * 1.3) };
  const i = Math.min(BIKE.out.length - 1, Math.floor((t - T_HIT) / DT)), [y, z, p] = BIKE.out[i];
  return { y, z, pitch: p, roll: lerp(0, 1.35, sm(T_HIT + 0.4, T_HIT + 1.8, t)) };
}
const BOOM = (() => { const s = bikeState(T_BOOM); return { x: 0, y: 0.6, z: s.z }; })();

// Rider: on the bike, then thrown (ballistic), lands, rolls to a stop on his back.
const R0 = { y: 0.55 + 0.98 - 0.55 + 0.05, z: Z_HIT - 0.22 };   // COM at the moment of the hit
const RV = { y: 6.2, z: 13.5 }, R_SPIN = 6.5;
const T_RLAND = T_HIT + (RV.y + Math.sqrt(RV.y * RV.y + 2 * 9.81 * (R0.y - 0.35))) / 9.81;
const Z_RLAND = R0.z + RV.z * (T_RLAND - T_HIT);
const P_RLAND = R_SPIN * (T_RLAND - T_HIT);
const P_REST = Math.ceil((P_RLAND + 1.2 + Math.PI / 2) / (2 * Math.PI)) * 2 * Math.PI - Math.PI / 2;
function rider(t) {
  if (t < T_HIT) { const b = bikeState(t); return { onBike: true, comY: b.y + 0.48, comZ: b.z - 0.22, pitch: 0 }; }
  if (t < T_RLAND) { const u = t - T_HIT; return { comY: R0.y + RV.y * u - 4.905 * u * u, comZ: R0.z + RV.z * u, pitch: R_SPIN * u }; }
  const u = t - T_RLAND, k = 1 - Math.exp(-3.2 * u);
  return { comY: lerp(0.35, 0.14, sm(0, 0.8, u)) + 0.25 * Math.abs(Math.sin(u * 8)) * Math.exp(-5 * u), comZ: Z_RLAND + 5.5 * k, pitch: lerp(P_RLAND, P_REST, k) };
}

/* ───────────── poses ───────────── */
const P = {
  ride: t => {
    const b = 0.03 * Math.sin(t * 23);
    return { hipsY: 0.95, spine: [0.36 + b, 0, 0], head: [-0.42, 0.06 * Math.sin(t * 0.9), 0],
      hipL: [-1.26, 0, 0.26], hipR: [-1.26, 0, -0.26], kneeL: [1.62, 0, -0.12], kneeR: [1.62, 0, 0.12],
      shoulderL: [-1.36, 0, 0.3], shoulderR: [-1.36, 0, -0.3], elbowL: [-0.25, 0, 0], elbowR: [-0.25, 0, 0] };
  },
  launch: () => ({ spine: [-0.2, 0, 0], head: [0.3, 0, 0], shoulderL: [-2.6, 0, 0.5], shoulderR: [-2.6, 0, -0.5], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0], hipL: [-0.6, 0, 0.3], hipR: [-0.3, 0, -0.3], kneeL: [0.9, 0, 0], kneeR: [0.5, 0, 0] }),
  windmill: t => {
    const u = t - T_HIT, a = -10 * u, p = 11 * u;
    return { spine: [-0.1, 0, 0.1 * Math.sin(p)], head: [-0.2, 0.2 * Math.sin(u * 3), 0],
      shoulderL: [a - 1.0, 0, 0.5], shoulderR: [a - 1.0 + Math.PI, 0, -0.5], elbowL: [-0.4, 0, 0], elbowR: [-0.4, 0, 0],
      hipL: [-0.75 + 0.6 * Math.sin(p), 0, 0.15], hipR: [-0.75 + 0.6 * Math.sin(p + Math.PI), 0, -0.15],
      kneeL: [1.0 + 0.75 * Math.cos(p), 0, 0], kneeR: [1.0 + 0.75 * Math.cos(p + Math.PI), 0, 0] };
  },
  tumble: () => ({ spine: [0.5, 0, 0], head: [0.4, 0, 0], hipL: [-1.6, 0, 0.2], hipR: [-1.4, 0, -0.2], kneeL: [1.9, 0, 0], kneeR: [1.7, 0, 0], shoulderL: [-1.2, 0, 0.5], shoulderR: [-1.0, 0, -0.5], elbowL: [-1.3, 0, 0], elbowR: [-1.3, 0, 0] }),
  splat: () => ({ head: [0.35, 0.5, 0], spine: [0, 0, 0.1], shoulderL: [-0.3, 0, 1.25], shoulderR: [0.25, 0, -1.6], elbowL: [0, 0, 0.5], elbowR: [-0.6, 0, -0.2], hipL: [-0.15, 0, 0.4], hipR: [-0.55, 0, -0.25], kneeL: [0.25, 0, 0], kneeR: [0.9, 0, 0] }),
};
const KEYS = [
  [0, P.ride], [T_HIT, P.ride], [T_HIT + 0.15, P.launch], [T_HIT + 0.45, P.windmill], [T_RLAND - 0.05, P.windmill],
  [T_RLAND + 0.15, P.tumble], [T_RLAND + 0.6, P.tumble], [T_RLAND + 1.1, P.splat], [T_END + 1, P.splat],
];

/* ───────────── scene ───────────── */
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const portrait = height > width;
  camera.fov = portrait ? 55 : 40; camera.far = 4000; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.0;

  // sunset sky
  {
    const c = document.createElement('canvas'); c.width = 4; c.height = 512;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#2c4f86'); gr.addColorStop(0.45, '#c7809a'); gr.addColorStop(0.75, '#f2a565'); gr.addColorStop(1, '#ffd29a');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; scene.background = tex;
  }
  scene.fog = new THREE.Fog(0xf0b07a, 90, 900);
  scene.add(new THREE.HemisphereLight(0xffd8b0, 0x8a5a3a, 1.2));
  const sun = new THREE.DirectionalLight(0xffc88a, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 200 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const SUN = new THREE.Vector3(-40, 30, 55).normalize();
  const fireLight = new THREE.PointLight(0xff7a2a, 0, 14, 1.6); scene.add(fireLight);
  const boomLight = new THREE.PointLight(0xffa040, 0, 80, 1.3); boomLight.position.set(BOOM.x, BOOM.y + 2, BOOM.z); scene.add(boomLight);

  // sand: rippled texture on the ground, dunes and mesas off the track
  {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'); g.fillStyle = '#d9a46c'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '120,70,30' : '255,230,190'},${0.06 + rnd() * 0.08})`; g.fillRect(rnd() * 512, rnd() * 512, 2 + rnd() * 3, 2 + rnd() * 3); }
    g.strokeStyle = 'rgba(140,80,35,.18)'; g.lineWidth = 3;
    for (let y = 0; y < 512; y += 22) { g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + 6 * Math.sin(x * 0.03 + y)); g.stroke(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(220, 220);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ map: tex }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  }
  const sandMat = new THREE.MeshLambertMaterial({ color: 0xd59a5f, flatShading: true });
  for (let i = 0; i < 40; i++) {                                    // dunes either side of the track
    const side = rnd() < 0.5 ? -1 : 1, r = 8 + rnd() * 22;
    const d = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), sandMat);
    d.scale.set(r * (1.5 + rnd()), r * 0.18, r); d.position.set(side * (16 + r + rnd() * 40), 0, -60 + rnd() * 320); d.receiveShadow = true; scene.add(d);
  }
  const mesaMat = new THREE.MeshLambertMaterial({ color: 0xb4583a, flatShading: true });
  for (let i = 0; i < 14; i++) {                                    // distant mesas / buttes
    const a = (rnd() - 0.5) * Math.PI * 1.6, d = 260 + rnd() * 450, h = 30 + rnd() * 90, r = 20 + rnd() * 60;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 9, 3), mesaMat);
    m.position.set(Math.sin(a) * d, h / 2, 120 + Math.cos(a) * d); scene.add(m);
  }
  // saguaro cacti and rocks along the track
  const cactusMat = new THREE.MeshToonMaterial({ color: 0x3f7a45 }), rockMat = new THREE.MeshLambertMaterial({ color: 0x8c5a3c, flatShading: true });
  const cactus = () => {
    const g = new THREE.Group(), h = 2.5 + rnd() * 2.5, tr = new THREE.CapsuleGeometry(0.22, h, 4, 10);
    const trunk = new THREE.Mesh(tr, cactusMat); trunk.position.y = h / 2 + 0.2; trunk.castShadow = true; g.add(trunk);
    for (const sx of [1, -1]) if (rnd() < 0.8) {
      const ay = h * (0.35 + rnd() * 0.3), al = 0.6 + rnd() * 0.9;
      const a1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 4, 8), cactusMat); a1.rotation.z = sx * Math.PI / 2; a1.position.set(sx * 0.4, ay, 0); g.add(a1);
      const a2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, al, 4, 8), cactusMat); a2.position.set(sx * 0.62, ay + al / 2, 0); a2.castShadow = true; g.add(a2);
    }
    return g;
  };
  for (let i = 0; i < 70; i++) {
    const side = rnd() < 0.5 ? -1 : 1, z = -30 + rnd() * 260, x = side * (4.5 + rnd() * 35);
    if ((Math.abs(z - BOOM.z) < 8 && Math.abs(x) < 9) || (x > 0 && x < 11 && z > Z_HIT - 12 && z < Z_HIT + 45)) continue;   // keep the crash cameras clear
    const c = cactus(); c.position.set(x, 0, z); c.rotation.y = rnd() * 6; scene.add(c);
  }
  for (let i = 0; i < 90; i++) {
    const side = rnd() < 0.5 ? -1 : 1, r = 0.2 + rnd() * 0.9, rx = side * (3 + rnd() * 30), rz = -30 + rnd() * 260;
    if (rx > 0 && rx < 11 && rz > Z_HIT - 12 && rz < Z_HIT + 45) continue;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
    m.position.set(rx, r * 0.4, rz); m.rotation.set(rnd() * 3, rnd() * 3, 0); m.castShadow = true; scene.add(m);
  }
  const hitRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), rockMat);
  hitRock.scale.set(1.3, 0.6, 1); hitRock.position.set(0, 0.2, Z_HIT + WHEEL_Z + 0.35); hitRock.castShadow = true; scene.add(hitRock);

  /* ── character ── */
  const man = buildStickman({ seed: 7 });
  scene.add(man.system);
  const { J } = man;
  const outlineMat = man.outlineMat, ramp = man.ramp;
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
  const bikeMat = (t, out) => { const s = bikeState(t); return out.compose(new THREE.Vector3(0, s.y, s.z), tmpQ.setFromEuler(tmpE.set(s.pitch, 0, s.roll)), one); };
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

  /* ── explosion debris, shockwave, title ── */
  const DEBRIS = Array.from({ length: 18 }, (_, i) => {
    const geo = i < 2 ? new THREE.TorusGeometry(WHEEL_R - 0.06, 0.07, 10, 24) : i < 5 ? new RoundedBoxGeometry(0.3, 0.18, 0.4, 2, 0.04) : new THREE.BoxGeometry(0.1 + rnd() * 0.25, 0.04 + rnd() * 0.1, 0.1 + rnd() * 0.3);
    const m = new THREE.Mesh(geo, i < 2 ? BM.tyre : i < 5 ? BM.red : rnd() < 0.5 ? BM.black : BM.chrome); m.castShadow = true; m.visible = false;
    m.add(new THREE.Mesh(geo, outlineMat)); scene.add(m);
    const a = rnd() * Math.PI * 2, up = 5 + rnd() * 9, out = 3 + rnd() * 7;
    return { m, v: [Math.cos(a) * out, up, Math.sin(a) * out], w: [rnd() * 12 - 6, rnd() * 12 - 6, rnd() * 12 - 6], r: 0.12 };
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(BOOM.x, 0.08, BOOM.z); scene.add(ring);
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: 0x24160e, transparent: true, opacity: 0, depthWrite: false }));
  scorch.rotation.x = -Math.PI / 2; scorch.position.set(BOOM.x, 0.03, BOOM.z); scene.add(scorch);

  const font = new FontFace('Title', `url(${asset('Fruktur.ttf')})`); await font.load(); document.fonts.add(font);
  const LINES_TXT = portrait ? ['elvladislavo', '.com'] : ['elvladislavo.com'];
  const LINE_H = 330, tc = document.createElement('canvas'); tc.width = 2048; tc.height = 160 + LINE_H * LINES_TXT.length;
  { const g = tc.getContext('2d'); g.font = '300px Title'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = Math.min(330 / 260, 1800 / Math.max(...LINES_TXT.map(l => g.measureText(l).width)));
    LINES_TXT.forEach((line, k) => {
      g.save(); g.translate(1024, 80 + LINE_H * (k + 0.5)); g.scale(fit, fit);
      g.shadowColor = '#ff6a10'; g.shadowBlur = 60; g.lineJoin = 'round'; g.lineWidth = 40; g.strokeStyle = '#060404'; g.strokeText(line, 0, 0);
      g.shadowBlur = 0; g.fillStyle = '#f6f1ea'; g.fillText(line, 0, 0); g.restore();
    }); }
  const titleTex = new THREE.CanvasTexture(tc); titleTex.colorSpace = THREE.SRGBColorSpace;
  const TITLE_W = portrait ? 6.4 : 9.5;
  const title = new THREE.Mesh(new THREE.PlaneGeometry(TITLE_W, TITLE_W * tc.height / 2048),
    new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0, color: 0xd8d8d8, fog: false }));
  title.renderOrder = 3; scene.add(title);

  /* ── post ── */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.45, 0.45, 0.97));
  composer.addPass(new OutputPass());

  /* ── camera: shot functions, crossfaded ── */
  const shoe = new THREE.Vector3(), headW = new THREE.Vector3(), com = new THREE.Vector3(), bikeC = new THREE.Vector3();
  const SHOTS = [
    [0, 3.2, t => {                      // crane up from the boots to the face
      const u = ease.inOutCubic(range(t, 0.15, 2.9));
      const look = shoe.clone().lerp(headW, u);
      return { pos: look.clone().add(new THREE.Vector3(lerp(1.05, 1.15, u), lerp(0.12, 0.15, u), lerp(-0.05, 0.95, u))), look };
    }],
    [3.2, 4.9, t => ({ pos: com.clone().add(new THREE.Vector3(2.4, -0.4 + 0.2 * range(t, 3.2, 4.9), 5.0)), look: com.clone().add(new THREE.Vector3(0, -0.1, 0)) })],
    [4.9, 6.45, t => { const a = lerp(1.35, 2.1, range(t, 4.9, 6.45));
      return { pos: com.clone().add(new THREE.Vector3(Math.sin(a) * 6, 0.9, Math.cos(a) * 6)), look: com.clone().add(new THREE.Vector3(0, -0.2, -0.8)) }; }],
    [6.45, 8.4, t => { const mid = com.clone().lerp(bikeC, 0.5); return { pos: new THREE.Vector3(6.2, 1.9, mid.z + 2.5), look: mid.add(new THREE.Vector3(0, 0.4, 0)) }; }],
    [8.4, T_BOOM + 0.2, t => ({ pos: new THREE.Vector3(4.5, 2.0, Z_RLAND + 9), look: bikeC.clone().lerp(com, 0.35).add(new THREE.Vector3(0, 0.5, 0)) })],
    [T_BOOM + 0.2, T_END + 1, t => { const u = ease.inOutCubic(range(t, T_BOOM, T_END));
      const b = new THREE.Vector3(BOOM.x, 0, BOOM.z);
      return { pos: b.clone().add(new THREE.Vector3(lerp(4.2, 2.6, u), lerp(2.2, 3.6, u), lerp(17, 13, u))), look: b.clone().add(new THREE.Vector3(0, lerp(1.8, 4.6, u), 0)) }; }],
  ];
  const BLEND = 0.35;

  return {
    update(t) {
      /* bike */
      const bs = bikeState(t);
      bike.position.set(0, bs.y, bs.z); bike.rotation.set(bs.pitch, 0, bs.roll);
      const exploded = t >= T_BOOM;
      bike.visible = !exploded;
      const roll = t < T_HIT ? (V * t) / WHEEL_R : (Z_HIT / WHEEL_R) + (t - T_HIT) * 30 * Math.exp(-(t - T_HIT) * 0.6);
      wheels.forEach(w => { w.spin.rotation.x = roll; });
      bike.updateMatrixWorld(true);

      /* rider */
      const r = rider(t);
      man.system.position.set(0, r.comY - 1, r.comZ);
      man.body.rotation.set(r.pitch, 0, t > T_HIT && t < T_RLAND ? 0.25 * Math.sin((t - T_HIT) * 5) : 0);
      man.applyPose(KEYS, t);
      man.system.updateMatrixWorld(true);
      com.set(0, 1, 0).applyMatrix4(man.system.matrixWorld);
      man.shoe('L', shoe); J.head.localToWorld(headW.set(0, 0.17, 0.05));
      bikeC.copy(bike.position);

      /* particles */
      FIRE.n = SMOKE.n = 0;
      const fireOn = (from, to) => ({ from, to });
      // flaming wheels: fire licking round both rims and streaming off behind
      [0, 1].forEach(which => stream(FIRE, t, { count: 240, life: 0.42, offset: which * 600, ...fireOn(-1, T_BOOM),
        spawn: (born, rr, out) => wheelRim(born, rr, out, which),
        vel: rr => [(rr[3] - 0.5) * 0.8, 1.2 + rr[4] * 1.6, -0.6 + (rr[3] - 0.5)],
        size: (k, rr) => (0.2 + 0.28 * rr[4]) * (0.6 + 0.9 * k) * (t > T_HIT ? 0.85 : 1),
        colour: k => fireColour(k), alpha: k => Math.pow(1 - k, 1.4) * 0.55 }));
      // exhaust fire
      [0, 1].forEach(e => stream(FIRE, t, { count: 140, life: 0.28, offset: 1300 + e * 300, ...fireOn(-1, T_HIT + 0.1),
        spawn: (born, rr, out) => { bikeMat(born, mtmp); return out.set(EXHAUST[e][0], EXHAUST[e][1] - 0.55, EXHAUST[e][2]).applyMatrix4(mtmp); },
        vel: rr => [(rr[1] - 0.5) * 1.2, 0.5 + rr[2] * 1.2, -3.5 - rr[3] * 3],
        size: (k, rr) => (0.26 + 0.26 * rr[4]) * (0.6 + 1.6 * k),
        colour: k => fireColour(k * 0.85, 1.5), alpha: k => Math.pow(1 - k, 1.1) * 0.85 }));
      // dust kicked up by the rear wheel
      stream(SMOKE, t, { count: 160, life: 1.1, offset: 2000, ...fireOn(-1, T_HIT),
        spawn: (born, rr, out) => out.set((rr[1] - 0.5) * 0.4, 0.15, V * born - WHEEL_Z),
        vel: rr => [(rr[2] - 0.5) * 2, 0.6 + rr[3], -1 - rr[4]],
        size: k => 0.5 + 1.6 * k, colour: () => [0.78, 0.6, 0.42], alpha: k => 0.35 * (1 - k) });
      // crashed bike: smoke and fire before it blows
      stream(SMOKE, t, { count: 140, life: 2.2, offset: 2200, from: T_HIT + 0.6, to: T_BOOM,
        spawn: (born, rr, out) => { const s = bikeState(born); return out.set((rr[1] - 0.5) * 0.4, s.y + 0.2, s.z + (rr[2] - 0.5) * 0.6); },
        vel: rr => [(rr[3] - 0.5) * 0.6, 1.4 + rr[4], 0.3],
        size: k => 0.4 + 2.0 * k, colour: k => [lerp(0.16, 0.32, k), lerp(0.14, 0.3, k), lerp(0.13, 0.28, k)], alpha: k => 0.6 * (1 - k) });
      // impact dust: bike bounces + rider landing
      const impacts = [...BIKE.bounces.map(([bt, bz]) => [bt, 0, bz]), [T_RLAND, 0, Z_RLAND]];
      impacts.forEach(([it, ix, iz], n) => {
        const u = t - it; if (u < 0 || u > 1.6) return;
        for (let i = 0; i < 40; i++) {
          const rr = R[3000 + n * 50 + i], a = rr[0] * Math.PI * 2, s = 1 + rr[1] * 3, k = u / 1.6;
          emit(SMOKE, ix + Math.cos(a) * s * (1 - Math.exp(-3 * u)) / 1.2, 0.15 + rr[2] * 0.9 * (1 - Math.exp(-2 * u)), iz + Math.sin(a) * s * (1 - Math.exp(-3 * u)) / 1.2,
            0.5 + 1.8 * k, 0.8, 0.62, 0.43, 0.55 * (1 - k));
        }
      });
      // the explosion: fireball (additive) + black smoke column
      const ub = t - T_BOOM;
      if (ub >= 0) {
        for (let i = 0; i < 380; i++) {
          const rr = R[4000 + i], born = rr[0] * 0.3, age = ub - born; if (age < 0) continue;
          const L = 0.9 + rr[1] * 1.4; if (age > L) continue;
          const k = age / L, th = rr[2] * Math.PI * 2, ph = Math.acos(1 - 2 * rr[3] * 0.9), sp = 5 + rr[4] * 11, d = sp / 3.2 * (1 - Math.exp(-3.2 * age));
          emit(FIRE, BOOM.x + Math.sin(ph) * Math.cos(th) * d, BOOM.y + Math.abs(Math.cos(ph)) * d * 0.9 + 1.6 * age * age, BOOM.z + Math.sin(ph) * Math.sin(th) * d,
            (0.9 + 1.6 * rr[1]) * (0.7 + 2.2 * k), ...fireColour(k, 1.0), Math.pow(1 - k, 1.1) * 0.55);
        }
        stream(SMOKE, t, { count: 900, life: 4.5, offset: 4800, from: T_BOOM + 0.05, to: T_END,
          spawn: (born, rr, out) => out.set(BOOM.x + (rr[1] - 0.5) * 2.2, BOOM.y + 0.4 + rr[2] * 1.2, BOOM.z + (rr[3] - 0.5) * 2.2),
          vel: (rr, born) => [(rr[4] - 0.5) * 1.6, (2.4 + rr[0] * 2.4) * (born - T_BOOM < 0.6 ? 1.8 : 1), (rr[2] - 0.5) * 1.6, -0.08],
          size: (k, rr) => (1.4 + rr[0]) * (0.8 + 3.4 * k),
          colour: (k, rr) => { const g = lerp(0.07, 0.3, k) + rr[1] * 0.05; return [g * 1.05, g, g * 0.95]; },
          alpha: k => 0.82 * Math.min(1, k * 6) * Math.pow(1 - k, 0.9) });
        // lingering flames on the wreck
        stream(FIRE, t, { count: 260, life: 0.7, offset: 5600, from: T_BOOM + 0.4, to: T_END,
          spawn: (born, rr, out) => out.set(BOOM.x + (rr[1] - 0.5) * 2.4, 0.1, BOOM.z + (rr[2] - 0.5) * 2.4),
          vel: rr => [(rr[3] - 0.5) * 0.4, 1.6 + rr[4] * 2, 0], size: (k, rr) => (0.4 + 0.5 * rr[0]) * (1 - 0.5 * k),
          colour: k => fireColour(0.15 + k * 0.85), alpha: k => (1 - k) * 0.5 });
      }
      for (const S of [FIRE, SMOKE]) {
        for (let i = S.n; i < S.N; i++) S.size.setX(i, 0);
        S.pos.needsUpdate = S.size.needsUpdate = S.col.needsUpdate = true;
      }

      /* lights, debris, shockwave */
      fireLight.position.set(0, 0.25, bs.z - WHEEL_Z); fireLight.intensity = t < T_BOOM ? 0.6 + 0.15 * Math.sin(t * 31) : 0;
      boomLight.intensity = ub < 0 ? 0 : 160 * Math.exp(-2.2 * ub) + 12 * (0.8 + 0.2 * Math.sin(t * 17));
      ring.material.opacity = ub < 0 ? 0 : 0.9 * (1 - sm(0, 0.7, ub)); ring.scale.setScalar(ub < 0 ? 0.01 : 0.5 + 18 * ease.outCubic(range(ub, 0, 0.8)));
      scorch.material.opacity = ub < 0 ? 0 : 0.75 * sm(0, 0.4, ub);
      DEBRIS.forEach(({ m, v, w, r: rad }) => {
        m.visible = ub >= 0; if (ub < 0) return;
        const yy = BOOM.y + v[1] * ub - 4.905 * ub * ub, landed = yy <= rad, tl = landed ? (v[1] + Math.sqrt(v[1] ** 2 + 2 * 9.81 * (BOOM.y - rad))) / 9.81 : ub;
        m.position.set(BOOM.x + v[0] * Math.min(ub, tl), Math.max(rad, yy), BOOM.z + v[2] * Math.min(ub, tl));
        m.rotation.set(w[0] * Math.min(ub, tl), w[1] * Math.min(ub, tl), w[2] * Math.min(ub, tl));
      });

      /* title rises out of the fireball through the smoke, always facing camera */
      const ut = range(t, T_TITLE, T_TITLE + 2.6), e = ease.outCubic(ut);
      title.material.opacity = sm(T_TITLE, T_TITLE + 1.0, t);
      title.scale.setScalar(Math.max(0.001, lerp(0.12, 1, e)));
      title.position.set(BOOM.x, lerp(1.4, portrait ? 5.0 : 4.4, e) + 0.08 * Math.sin(t * 1.6) * ut, BOOM.z + 1.5);

      /* sun & shadows follow the action */
      const focus = t < T_BOOM ? com : new THREE.Vector3(BOOM.x, 0, BOOM.z);
      sun.target.position.copy(focus); sun.position.copy(focus).addScaledVector(SUN, 90);

      /* camera */
      let pos = null, look = null;
      for (let i = 0; i < SHOTS.length; i++) {
        const [a, b, f] = SHOTS[i];
        if (t < a - BLEND || t > b + BLEND) continue;
        const s = f(t), w = i === 0 ? 1 - sm(b - BLEND, b + BLEND, t) : i === SHOTS.length - 1 ? sm(a - BLEND, a + BLEND, t) : sm(a - BLEND, a + BLEND, t) * (1 - sm(b - BLEND, b + BLEND, t));
        if (!pos) { pos = s.pos.multiplyScalar(w); look = s.look.multiplyScalar(w); pos.w = w; }
        else { pos.addScaledVector(s.pos, w); look.addScaledVector(s.look, w); pos.w += w; }
      }
      pos.multiplyScalar(1 / pos.w); look.multiplyScalar(1 / pos.w);
      const shake = ub < 0 ? 0 : 0.35 * Math.exp(-3 * ub);
      pos.x += wiggle(t, 9, 1) * shake + wiggle(t, 0.5, 4) * 0.03; pos.y += wiggle(t, 11, 2) * shake + wiggle(t, 0.4, 6) * 0.03;
      if (pos.y < 0.15) pos.y = 0.15;
      camera.position.copy(pos); camera.lookAt(look);
      title.quaternion.copy(camera.quaternion);
    },
    render() { composer.render(); },
  };
}
