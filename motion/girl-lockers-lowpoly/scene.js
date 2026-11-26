// BRIEF — locker-room photos (IMG_5405 sitting, IMG_5400 getting up, IMG_5399 standing) as a short low-poly animation,
// same method and look as kitten-dream-lowpoly: scan the photo → build the models → animate.
// 1. SCAN (scan/scan.py → tex/*.png + scan/scan.json): 64-px crops from the standing photo for her face, upper body and
//    lower body, and for the room (locker door, white wall, mirror with the vending machine, the instruction sign,
//    bench wood, black bag, sneakers, floor tiles); body landmarks read off the same photo (1.70 m, feet at y 1885 px).
// 2. MODELS: a < 300-triangle figure (boxes, 6-sided cylinders, icosahedron head + bun, flat shaded) whose rest pose is
//    the standing photo; the photo crops are projected onto it from the front. The room is boxes and planes with the crops.
// 3. ANIMATE (7 s · 270×480, nearest upscale, vertex snapping, ordered dither):
//   0–2.0    sitting hunched on the bench end, elbows on knees, hands clasped, head down (photo 1); one slow sigh
//   2.0–3.3  leans in and pushes up: knees bent, torso forward, arms hanging (photo 2)
//   3.3–4.3  straightens up, hands go into the pockets
//   4.2–5.0  head comes up and turns to the lens (photo 3) · 4.8–7 camera pushes in, she holds the look
import { ease, range, wiggle } from '/lib/motion.js';
import { PSX, psx } from '/assets/lowpoly-mc.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
export const meta = { duration: 7, fps: 30, background: '#ded5cd' };
// photo → world (standing photo, figure centre x 840 px, boot soles y 1885 px, 1.70 m from hair to soles)
const SPX = 1.70 / (1885 - 330), PX = x => (x - 840) * SPX, PY = y => (1885 - y) * SPX;
const CROPS = { face: [680, 320, 900, 600], upper: [595, 590, 1110, 1000], lower: [595, 980, 1045, 1910] };

const JN = ['hips', 'torso', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];
// rest (all zeros) = the standing photo, hands in pockets, looking at the lens
const SIT = { drop: 0.46 - 0.86, torso: [0.9, 0, 0], head: [0.55, 0, 0.05], hipL: [-1.5, 0, 0.06], hipR: [-1.5, 0, -0.06], kneeL: [1.52, 0, 0], kneeR: [1.5, 0, 0],
  shoulderL: [-1.35, 0, -0.22], shoulderR: [-1.35, 0, 0.22], elbowL: [-0.95, 0, 0], elbowR: [-0.95, 0, 0] };
const LEAN = { ...SIT, torso: [1.05, 0, 0], head: [0.5, 0, 0.05] };
const RISE = { drop: 0.7 - 0.86, torso: [0.6, 0, 0.04], head: [0.5, 0.1, 0], hipL: [-0.65, 0, 0.05], hipR: [-0.4, 0, -0.05], kneeL: [0.8, 0, 0], kneeR: [0.55, 0, 0],
  shoulderL: [-0.75, 0, 0.12], shoulderR: [-0.7, 0, -0.1], elbowL: [-0.35, 0, 0], elbowR: [-0.3, 0, 0] };
const UP = { drop: 0, torso: [0.12, 0, 0], head: [0.32, 0.08, 0], shoulderL: [-0.15, 0, 0.05], shoulderR: [-0.15, 0, -0.05], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0] };
const LOOK = { drop: 0, torso: [-0.02, 0, 0], head: [-0.04, 0.05, -0.07] };
const KEYS = [[0, SIT], [2.0, SIT], [2.4, LEAN], [3.15, RISE], [3.35, RISE], [4.1, UP], [4.95, LOOK], [99, LOOK]];
const mix = (A, B, k) => { const o = { drop: lerp(A.drop || 0, B.drop || 0, k) };
  for (const j of JN) { const a = A[j] || [0, 0, 0], b = B[j] || [0, 0, 0]; o[j] = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; } return o; };

export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  renderer.toneMapping = THREE.NoToneMapping;
  PSX.snap.value.set(width / 2, height / 2);
  camera.fov = 50; camera.near = 0.05; camera.far = 40; camera.updateProjectionMatrix();
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const font = new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`); await font.load(); document.fonts.add(font);

  /* scanned textures */
  const loader = new THREE.TextureLoader(), T = {};
  for (const k of ['face', 'upper', 'lower', 'mirror', 'sign', 'door', 'door3', 'bench', 'bag', 'shoes', 'tile', 'wall']) {
    const t = await loader.loadAsync(asset(`tex/${k}.png`)); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; T[k] = t; }
  const lam = (t, rep) => { if (rep) { t = t.clone(); t.repeat.set(...rep); t.needsUpdate = true; } return psx(new THREE.MeshLambertMaterial({ map: t, flatShading: true })); };
  const flat = c => psx(new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const add = (geo, mat, p, rot, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

  scene.background = new THREE.Color(0xded5cd);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 2.5));
  const sun = new THREE.DirectionalLight(0xfff6ea, 1.1); sun.position.set(1.5, 4, 3.5); sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
  Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -1, near: 0.5, far: 12 }); sun.shadow.bias = -0.002; scene.add(sun);

  /* ── the locker room (scanned crops on boxes and planes) ── */
  add(new THREE.PlaneGeometry(8, 8), lam(T.tile, [26, 26]), [0, 0, 1], [-PI / 2, 0, 0]);
  add(new THREE.PlaneGeometry(8, 4), lam(T.wall, [6, 3]), [0, 2, -1.0]);
  add(new THREE.PlaneGeometry(2.6, 4), lam(T.wall, [2, 3]), [-1.4, 2, -0.72]);                              // the white wall section with the mirror
  add(new THREE.BoxGeometry(2.1, 2.0, 0.3), flat(0x1b1b1d), [0.93, 1.0, -0.86]);                           // locker cabinet (black frames)
  const numTex = n => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#16161a'; g.font = '48px Tag'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 32, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  for (let i = 0; i < 4; i++) {
    const x = 0.12 + i * 0.5;
    add(new THREE.BoxGeometry(0.44, 1.8, 0.03), lam(i === 2 ? T.door3 : T.door), [x, 1.0, -0.7]);
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), psx(new THREE.MeshBasicMaterial({ map: numTex(i + 1), transparent: true }))); n.position.set(x, 1.72, -0.68); scene.add(n);
  }
  add(new THREE.PlaneGeometry(0.85, 0.7), psx(new THREE.MeshBasicMaterial({ map: T.mirror })), [-0.85, 1.55, -0.7]);
  add(new THREE.BoxGeometry(0.89, 0.74, 0.01), flat(0xc9c9cc), [-0.85, 1.55, -0.712]);
  add(new THREE.PlaneGeometry(0.42, 0.17), lam(T.sign), [-0.85, 1.07, -0.7]);
  add(new THREE.BoxGeometry(1.7, 0.06, 0.42), lam(T.bench, [2, 1]), [-1.0, 0.42, -0.42]);                   // bench top
  add(new THREE.BoxGeometry(1.66, 0.39, 0.34), flat(0x5e4038), [-1.0, 0.195, -0.44]);
  { const bag = add(new THREE.IcosahedronGeometry(1, 0), lam(T.bag), [-1.2, 0.58, -0.4]); bag.scale.set(0.24, 0.14, 0.17); bag.rotation.y = 0.3;
    add(new THREE.TorusGeometry(0.18, 0.01, 3, 10), flat(0x2a2a30), [-1.13, 0.6, -0.33], [1.2, 0.2, 0.3]); }
  for (const [x, z, r] of [[-0.55, 0.32, 0.4], [-0.42, 0.42, 0.1]]) add(new THREE.BoxGeometry(0.11, 0.09, 0.28), lam(T.shoes), [x, 0.045, z], [0, r, 0]);
  add(new THREE.BoxGeometry(0.06, 0.004, 0.1), flat(0xf4f4f2), [-0.4, 0.452, -0.3], [0, 0.4, 0]);           // receipts
  add(new THREE.BoxGeometry(0.06, 0.004, 0.1), flat(0xf4f4f2), [-0.85, 0.003, 0.15], [0, -0.3, 0]);

  /* ── her: < 300 triangles, rest pose = the standing photo, crops projected from the front ── */
  const root = new THREE.Group(); scene.add(root);
  const J = {};
  const joint = (name, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const hips = joint('hips', root, 0, 0.86, 0), torso = joint('torso', hips, 0, 0.12, 0), head = joint('head', torso, 0, 0.44, 0);
  const parts = [];
  const part = (geo, crop, p, parent, scl, rot) => { const m = add(geo, null, p, rot, parent); if (scl) m.scale.set(...scl); m.userData.crop = crop; parts.push(m); return m; };
  part(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 6), 'lower', [0, 0.07, 0], hips, [1, 1, 0.62]);
  part(new THREE.CylinderGeometry(0.17, 0.13, 0.42, 6), 'upper', [0, 0.21, 0], torso, [1, 1, 0.6]);
  part(new THREE.IcosahedronGeometry(0.1, 1), 'face', [PX(785) + 0.01, 0.1, 0.01], head, [1, 1.24, 1]);
  part(new THREE.CylinderGeometry(0.048, 0.055, 0.14, 4), 'face', [PX(785) + 0.015, -0.005, -0.005], head, null, [0, PI / 4, 0]);   // neck (the bun is in the hair texture)
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = joint('shoulder' + s, torso, sx * 0.15, 0.39, 0);
    part(new THREE.BoxGeometry(0.075, 0.28, 0.08), 'upper', [0, -0.14, 0], sh);
    const el = joint('elbow' + s, sh, 0, -0.28, 0);
    part(new THREE.BoxGeometry(0.065, 0.25, 0.07), 'upper', [0, -0.125, 0], el);
    part(new THREE.BoxGeometry(0.06, 0.09, 0.045), 'lower', [0, -0.29, 0.01], el);
    const hp = joint('hip' + s, hips, sx * 0.095, 0, 0);
    part(new THREE.BoxGeometry(0.13, 0.4, 0.15), 'lower', [0, -0.2, 0], hp);
    const kn = joint('knee' + s, hp, 0, -0.4, 0);
    part(new THREE.BoxGeometry(0.11, 0.38, 0.12), 'lower', [0, -0.19, 0], kn);
    part(new THREE.BoxGeometry(0.1, 0.08, 0.22), 'lower', [0, -0.42, 0.05], kn);                          // boot foot
  }
  // bake the front projection at the rest pose (root at the origin)
  root.updateMatrixWorld(true);
  const v = V3();
  let tris = 0;
  for (const m of parts) {
    const crop = CROPS[m.userData.crop], [x0, y0, x1, y1] = crop, g = m.geometry, pa = g.attributes.position, uv = new Float32Array(pa.count * 2);
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
      const px = v.x / SPX + 840, py = 1885 - v.y / SPX;
      uv[i * 2] = Math.min(1, Math.max(0, (px - x0) / (x1 - x0))); uv[i * 2 + 1] = Math.min(1, Math.max(0, 1 - (py - y0) / (y1 - y0))); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    m.material = lam(T[m.userData.crop]);
    tris += (g.index ? g.index.count : pa.count) / 3;
  }
  console.log(`[scene] her model: ${tris} triangles`);

  /* ── post: 270×480 nearest target → quantise + Bayer dither ── */
  const rt = new THREE.WebGLRenderTarget(width, height, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, samples: 0 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, levels: { value: 9.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float levels; varying vec2 vUv;
      const float B[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
        float d = (B[p.x + p.y * 4] + 0.5) / 16.0 - 0.5; c = floor(c * levels + 0.5 + d) / levels; gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
    depthTest: false, depthWrite: false })));

  const camPos = V3(), camLook = V3();
  return {
    update(t) {
      /* pose */
      let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
      const [t0, A] = KEYS[i], [t1, B] = KEYS[i + 1];
      const p = mix(A, B, E.inOutCubic(range(t, t0, t1)));
      const sigh = Math.sin(range(t, 0.9, 1.8) * PI) * (t < 2 ? 1 : 0);
      p.torso[0] -= 0.08 * sigh; p.head[0] -= 0.05 * sigh;
      const br = Math.sin(t * 2.2) * 0.012; p.torso[0] += br;
      const sway = t > 4.9 ? Math.sin((t - 4.9) * 1.3) * 0.02 : 0; p.torso[2] += sway; p.head[2] -= sway * 0.6;
      for (const j of JN) J[j].rotation.set(...p[j]);
      J.hips.position.y = 0.86 + p.drop;
      // root: on the bench end, then a small step forward as she rises
      const up = E.inOutCubic(range(t, 2.35, 3.6));
      root.position.set(lerp(-0.32, -0.12, up), 0, lerp(-0.4, 0.02, up));
      root.rotation.y = lerp(0.12, -0.12, up);

      /* camera: wide on the room, then a slow push-in to her face once she looks up */
      const push = E.inOutCubic(range(t, 4.6, 6.8));
      camPos.set(lerp(0.35, 0.08, push), lerp(1.2, 1.5, push), lerp(3.1, 1.55, push));
      camLook.set(lerp(-0.2, -0.13, push), lerp(0.85, 1.38, push), lerp(-0.3, 0, push));
      camera.position.copy(camPos); camera.position.x += wiggle(t, 0.3, 1) * 0.008; camera.position.y += wiggle(t, 0.25, 2) * 0.006;
      camera.lookAt(camLook); camera.updateMatrixWorld();
    },
    render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
  };
}
