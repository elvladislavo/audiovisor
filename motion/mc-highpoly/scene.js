// BRIEF — showcase of the new high-poly MC next to the low-poly model it was built from. Both stand on a turntable
// stage and hit the same poses together (the explainer's poses), then the camera pushes in on the high-poly one.
// POLISH TEXT (checked): Ten sam bohater, więcej detali. · "240 trójkątów" / "N trójkątów" (count from the model)
//   · elvladislavo.com
// BEATS (s)
//   0–0.8    camera settles; title pops in
//   0.6–5.6  same pose every ~1 s on both models, tags under each with the triangle count, slow orbit
//   5.4–7.4  push-in on the high-poly MC (face, shades, beard curls, tie, lapels); tags + title out
//   7.0–9    elvladislavo.com; hold
// Render: render.mjs motion/mc-highpoly/scene.js --width 1080 --height 1920 --out mc-highpoly-vertical.mp4
import { ease, key, range, wiggle } from '/lib/motion.js';
import { buildHighPolyMC } from '/assets/highpoly-mc.js';
import { buildLowPolyMC, PSX } from '/assets/lowpoly-mc.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
const T_END = 9;
export const meta = { duration: T_END, fps: 30, background: '#1a1822' };

// the explainer's poses (motion/mc-lowpoly/scene.js), one per beat
const POSES = [
  { shoulderL: [0, 0, 0.12], shoulderR: [0, 0, -0.12], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0] },
  { torso: [0, -0.25, 0], head: [0, -0.35, 0.05], shoulderR: [-1.35, 0.3, -0.55], elbowR: [-0.1, 0, 0], shoulderL: [0.15, 0, 0.55], elbowL: [-1.7, 0, 0], hipR: [0, 0, -0.08], hipL: [0, 0, 0.12] },
  { torso: [-0.05, -0.45, 0.05], head: [0.05, -0.5, 0], shoulderR: [-2.7, 0, -0.35], elbowR: [-0.6, 0, 0], shoulderL: [-0.9, 0, 0.6], elbowL: [-1.2, 0, 0],
    hipL: [0.1, 0, 0.28], hipR: [-0.1, 0, -0.28], kneeL: [0.25, 0, 0], kneeR: [0.25, 0, 0], drop: -0.06 },
  { torso: [0.18, -0.35, 0.08], head: [0.05, -0.3, 0.12], shoulderL: [-0.4, 0, 0.35], elbowL: [-1.9, 0, 0], shoulderR: [-0.9, 0.25, -0.45], elbowR: [-0.2, 0, 0], hipR: [-0.25, 0, -0.05], kneeR: [0.4, 0, 0], drop: -0.04 },
  { torso: [0, 0.1, 0], head: [-0.05, 0.12, -0.08], shoulderL: [-0.75, 0, -0.35], elbowL: [-1.95, 0, 0], shoulderR: [-1.05, 0, -0.75], elbowR: [-0.25, 0, 0], hipL: [0, 0, 0.08], hipR: [0.1, 0, -0.1], kneeR: [0.15, 0, 0] },
  { torso: [-0.06, 0, 0], head: [-0.1, 0, 0.06], shoulderL: [0.25, 0, 0.75], elbowL: [-1.75, 0, 0], shoulderR: [0.25, 0, -0.75], elbowR: [-1.75, 0, 0], hipL: [0, 0, 0.14], hipR: [0, 0, -0.14] },
];
const POSE_T = [0, 0.7, 1.65, 2.6, 3.55, 4.5];
const JN = ['hips', 'torso', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];
const mix = (A, B, k) => { const o = {}; for (const j of JN) { const a = A[j] || [0, 0, 0], b = B[j] || [0, 0, 0]; o[j] = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
  o.drop = lerp(A.drop || 0, B.drop || 0, k); return o; };
const plural = n => { const t = n % 100, u = n % 10; return (u >= 2 && u <= 4 && !(t >= 12 && t <= 14)) ? 'trójkąty' : 'trójkątów'; };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  const portrait = height > width;
  camera.fov = portrait ? 50 : 38; camera.near = 0.05; camera.far = 80; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 1.05;
  PSX.snap.value.set(1e6, 1e6);                 // no vertex snapping in this smooth render
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const tagFont = new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`), titleFont = new FontFace('Title', `url(${asset('Fruktur.ttf')})`);
  await Promise.all([tagFont.load(), titleFont.load()]); document.fonts.add(tagFont); document.fonts.add(titleFont);

  /* studio: dark violet gradient, glossy stage, warm key + cool rim + soft fill, reflections */
  { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#2c2640'); gr.addColorStop(0.6, '#1d1a28'); gr.addColorStop(1, '#121016'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.75, 0.12, 96), new THREE.MeshPhysicalMaterial({ color: 0x2a2535, roughness: 0.25, clearcoat: 0.6 }));
  stage.position.y = -0.06; stage.receiveShadow = true; scene.add(stage);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: 0xff5ca8, toneMapped: false })); ring.rotation.x = PI / 2; ring.position.y = 0.0; scene.add(ring);
  const key1 = new THREE.DirectionalLight(0xffe7cc, 2.0); key1.position.set(-2.5, 4.5, 4); key1.castShadow = true; key1.shadow.mapSize.set(2048, 2048);
  Object.assign(key1.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -1, near: 1, far: 15 }); key1.shadow.bias = -0.0004; key1.shadow.normalBias = 0.02; scene.add(key1);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 2.2); rim.position.set(2.5, 3, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xff8fc8, 1.2); rim2.position.set(-3, 2, -3); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(0xf0e8ff, 0x2a2232, 0.55));

  /* the two MCs */
  const lo = buildLowPolyMC(), hi = buildHighPolyMC();
  lo.root.position.set(-0.6, 0, 0); hi.root.position.set(0.6, 0, 0);
  scene.add(lo.root, hi.root);
  console.log(`[scene] low-poly ${lo.triangles} tris · high-poly ${hi.triangles} tris`);

  /* text */
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const sprite = (t, aspect) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 }));
    s.renderOrder = 10; s.userData.aspect = aspect; scene.add(s); return s; };
  const pill = (text, bg, fg) => tex(900, 200, (g, w, h) => { g.font = '96px Tag'; const fs = Math.min(96, 96 * 760 / g.measureText(text).width); g.font = `${fs}px Tag`;
    const tw = g.measureText(text).width + 110, x0 = (w - tw) / 2; g.fillStyle = bg; g.beginPath(); g.roundRect(x0, 20, tw, 160, 80); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 104); });
  const tagLo = sprite(pill(`${fmt(lo.triangles)} ${plural(lo.triangles)}`, '#ffffff', '#1d1a28'), 200 / 900);
  const tagHi = sprite(pill(`${fmt(hi.triangles)} ${plural(hi.triangles)}`, '#ff5ca8', '#ffffff'), 200 / 900);
  const title = sprite(tex(1400, 240, (g, w, h) => { const t = 'Ten sam bohater, więcej detali.'; g.font = '96px Tag'; const fs = Math.min(96, 96 * 1240 / g.measureText(t).width); g.font = `${fs}px Tag`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = fs * 0.2; g.strokeStyle = '#000'; g.strokeText(t, w / 2, h / 2); g.fillStyle = '#fff'; g.fillText(t, w / 2, h / 2); }), 240 / 1400);
  const url = sprite(tex(1400, 300, (g, w, h) => { g.font = '200px Title'; const fs = Math.min(200, 200 * 1260 / g.measureText('elvladislavo.com').width); g.font = `${fs}px Title`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.shadowColor = '#ff5ca8'; g.shadowBlur = 40; g.fillStyle = '#ffffff'; g.fillText('elvladislavo.com', w / 2, h / 2);
    g.shadowBlur = 0; g.fillText('elvladislavo.com', w / 2, h / 2); }), 300 / 1400);
  const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), hTan = vTan * width / height;
  const R = V3(), U = V3(), F = V3();
  const hud = (s, nx, ny, frac) => { camera.matrixWorld.extractBasis(R, U, F);
    s.position.copy(camera.position).addScaledVector(F, -1).addScaledVector(R, nx * hTan).addScaledVector(U, ny * vTan);
    const w = frac * 2 * hTan; s.scale.set(w, w * s.userData.aspect, 1); };
  const world = (s, p, w) => { s.position.copy(p); s.scale.set(w, w * s.userData.aspect, 1); };

  const look = V3();
  return {
    update(t) {
      /* poses: same on both, snappy overshoot into each */
      let i = 0; while (i < POSE_T.length - 1 && t >= POSE_T[i + 1]) i++;
      const k = Math.min(1.06, E.outBack(range(t, POSE_T[i], POSE_T[i] + 0.28)));
      const pose = mix(POSES[Math.max(0, i - 1)], POSES[i], i === 0 ? 1 : k);
      const br = Math.sin(t * 2.3) * 0.012; pose.torso[0] += br; pose.head[0] -= br * 0.6;
      lo.setPose(pose); hi.setPose(pose);
      const bob = i > 0 ? Math.max(0, Math.sin(range(t, POSE_T[i], POSE_T[i] + 0.28) * PI)) * 0.03 : 0;
      lo.root.position.y = hi.root.position.y = bob;
      const yaw = Math.sin(t * 0.7) * 0.25;
      lo.root.rotation.y = 0.15 + yaw; hi.root.rotation.y = -0.15 + yaw;
      const talking = t > 6.0 && t < 6.9 && Math.sin(t * 40) > -0.2;
      hi.talk(talking); lo.talk(false);

      /* camera: wide two-shot with a slow orbit, then push in on the high-poly head + chest */
      const orbit = -0.18 + t * 0.05, push = E.inOutCubic(range(t, 5.3, 7.3));
      const wide = V3(Math.sin(orbit) * 5.0, 1.55, Math.cos(orbit) * 5.0), close = V3(0.95, 1.62, 1.25);
      camera.position.copy(wide.lerp(close, push));
      camera.position.x += wiggle(t, 0.4, 1) * 0.015; camera.position.y += wiggle(t, 0.35, 2) * 0.012;
      look.set(lerp(0, 0.6, push), lerp(1.0, 1.52, push), 0); camera.lookAt(look); camera.updateMatrixWorld();

      /* text */
      const tagA = E.outBack(range(t, 0.6, 1.0)) * (1 - range(t, 5.2, 5.5));
      tagLo.material.opacity = tagHi.material.opacity = Math.min(1, range(t, 0.6, 0.75)) * (1 - range(t, 5.2, 5.5));
      world(tagLo, V3(-0.6, -0.02, 0.6), 0.95 * Math.max(0.01, tagA)); world(tagHi, V3(0.6, -0.02, 0.6), 1.05 * Math.max(0.01, tagA));
      title.material.opacity = range(t, 0.2, 0.45) * (1 - range(t, 5.2, 5.5)); hud(title, 0, 0.8, 0.94 * Math.max(0.01, E.outBack(range(t, 0.2, 0.6))));
      url.material.opacity = range(t, 7.1, 7.5); hud(url, 0, -0.78, 0.86);
    },
  };
}
