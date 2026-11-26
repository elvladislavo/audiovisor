// BRIEF — remake of IMG_3641.mov (7.3 s dance in a white-tiled room, phone on the floor) in the low-poly scan style,
// moved into the graffiti room from legia-scarf-lowpoly (its scanned wall / beam / tile crops, linked, not copied).
// 1. SCAN (scan/scan.py → tex/*.png): 64-px crops from key frames: face (5.75 s, mirrored where his hand covers it),
//    CYMRU shirt front (6.75 s) and back (1.5 s), curly hair from behind (1.5 s), tattooed forearm (5.75 s) + palette.
// 2. MODEL: < 300 triangles, boxes, flat shaded, same joint conventions as lowpoly-mc.js; crops on the box faces.
// 3. ANIMATE (beats matched to the clip, original audio laid back on):
//   0–1.25   right at the lens, flicks his hands, turns and walks away
//   1.25–2.2 back to camera, wide-stance shuffle
//   2.2–2.5  turns through profile to face the lens
//   2.5–3.4  knee up, jump with both arms up, a tissue flies into the air
//   3.4–4.5  lands, palms open, steps back, arms spread
//   4.6–6.0  walks to the lens with finger guns
//   6.0–7.3  points with both hands, then reaches into the lens, shirt filling the frame
// Render: render.mjs motion/cymru-dance-lowpoly/scene.js --width 270 --height 480 --out frames/  then nearest upscale + audio.
import { ease, key, range, wiggle } from '/lib/motion.js';
import { PSX, psx, tex64, px, speckle } from '/assets/lowpoly-mc.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
export const meta = { duration: 7.3, fps: 30, background: '#121112' };

/* ── poses (shoulder x<0 raises forward; shoulder z>0 (L) / <0 (R) lifts out; elbow x<0 bends; hip x<0 leg forward; knee x>0 bends) ── */
const JN = ['hips', 'torso', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];
const P = {
  close: t => ({ torso: [0.28, 0, 0], head: [0.25, 0, 0], shoulderL: [-0.85, 0.3, 0.1], elbowL: [-1.5, 0, 0], shoulderR: [-0.75, -0.3, -0.1], elbowR: [-1.35 + 0.25 * Math.sin(t * 18), 0, 0] }),
  walkArms: t => ({ torso: [0.05, 0, 0], shoulderL: [0, 0, 0.15], shoulderR: [0, 0, -0.15], elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0] }),
  shuffle: t => { const s = Math.sin(t * 9);
    return { drop: -0.07, torso: [0.12, 0, 0.12 * s], head: [0.1, 0, -0.06 * s], shoulderL: [-0.2, 0, 0.55 + 0.1 * s], shoulderR: [-0.2, 0, -0.55 + 0.1 * s], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0],
      hipL: [0, 0, 0.32], hipR: [0, 0, -0.32], kneeL: [0.25 + 0.15 * Math.max(0, s), 0, 0], kneeR: [0.25 + 0.15 * Math.max(0, -s), 0, 0] }; },
  lunge: t => ({ drop: -0.1, torso: [0.25, 0, 0], shoulderL: [-0.6, 0, 0.4], shoulderR: [0.3, 0, -0.4], elbowL: [-0.6, 0, 0], elbowR: [-0.3, 0, 0], hipR: [-0.7, 0, 0], kneeR: [0.7, 0, 0], hipL: [0.35, 0, 0], kneeL: [0.25, 0, 0] }),
  kneeUp: t => ({ torso: [0.08, 0, -0.05], head: [0.05, 0, 0], shoulderL: [-0.4, 0, 1.1], shoulderR: [-0.4, 0, -1.1], elbowL: [-1.4, 0, 0], elbowR: [-1.4, 0, 0], hipL: [-1.55, 0, 0.1], kneeL: [1.8, 0, 0], kneeR: [0.12, 0, 0] }),
  armsUp: t => ({ torso: [-0.1, 0, 0], head: [-0.35, 0, 0], shoulderL: [-0.2, 0, 2.85], shoulderR: [-0.2, 0, -2.85], elbowL: [-0.25, 0, 0], elbowR: [-0.25, 0, 0], hipR: [-0.35, 0, 0], kneeR: [0.9, 0, 0], kneeL: [0.15, 0, 0] }),
  open: t => ({ torso: [-0.04, 0, 0], head: [-0.08, 0, 0], shoulderL: [-0.35, 0, 1.2], shoulderR: [-0.35, 0, -1.2], elbowL: [-0.55, 0, 0], elbowR: [-0.55, 0, 0], hipL: [0, 0, 0.08], hipR: [0, 0, -0.08] }),
  far: t => ({ torso: [0.02, 0, 0.03 * Math.sin(t * 3)], shoulderL: [-0.1, 0, 0.18], shoulderR: [-0.1, 0, -0.18], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0], hipL: [0, 0, 0.06], hipR: [0, 0, -0.06] }),
  spread: t => ({ torso: [0.05, 0, 0], shoulderL: [-0.2, 0, 0.9], shoulderR: [-0.2, 0, -0.9], elbowL: [-0.25, 0, 0], elbowR: [-0.25, 0, 0], hipL: [0, 0, 0.08], hipR: [0, 0, -0.08] }),
  gunA: t => ({ torso: [0.1, -0.2, 0], head: [0.05, -0.1, 0.05], shoulderR: [-1.45, 0, -0.15], elbowR: [-0.2, 0, 0], shoulderL: [-1.0, -0.5, 0.2], elbowL: [-1.7, 0, 0] }),
  gunB: t => ({ torso: [0.1, 0.2, 0], head: [0.05, 0.1, -0.05], shoulderL: [-1.45, 0, 0.15], elbowL: [-0.2, 0, 0], shoulderR: [-1.0, 0.5, -0.2], elbowR: [-1.7, 0, 0] }),
  pointBoth: t => ({ torso: [0.2, 0, 0], head: [0.05, 0, 0], shoulderL: [-1.25, 0, 0.12], shoulderR: [-1.3, 0, -0.12], elbowL: [-0.15, 0, 0], elbowR: [-0.15, 0, 0] }),
  reach: t => { const w = Math.sin(t * 7) * 0.12;
    return { drop: -0.05, torso: [0.5, 0, 0], head: [-0.25, 0, 0], shoulderL: [-1.25 + w, 0, 0.22], shoulderR: [-1.25 - w, 0, -0.22], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0], kneeL: [0.2, 0, 0], kneeR: [0.2, 0, 0], hipL: [-0.15, 0, 0.08], hipR: [-0.15, 0, -0.08] }; },
};
const KEYS = [[0, 'close'], [0.55, 'close'], [0.85, 'walkArms'], [1.2, 'walkArms'], [1.45, 'shuffle'], [2.05, 'shuffle'], [2.25, 'lunge'], [2.4, 'lunge'], [2.55, 'kneeUp'], [2.78, 'kneeUp'],
  [2.92, 'armsUp'], [3.22, 'armsUp'], [3.42, 'open'], [3.75, 'open'], [3.95, 'walkArms'], [4.3, 'walkArms'], [4.45, 'far'], [4.55, 'far'], [4.72, 'spread'], [4.85, 'spread'],
  [5.0, 'gunA'], [5.2, 'gunA'], [5.35, 'gunB'], [5.55, 'gunB'], [5.7, 'gunA'], [5.85, 'gunA'], [6.05, 'pointBoth'], [6.3, 'pointBoth'], [6.55, 'reach'], [9, 'reach']];
// path on the floor (camera at z = 0.75 looking down the room) and facing (0 = toward the lens, π = back to it)
const PX_ = [[0, 0.15], [0.6, 0.32, E.inOutQuad], [1.25, 0.38], [2.0, 0.3], [2.4, 0.2], [3.5, 0.1], [4.3, 0.0], [4.75, 0.0], [6.0, 0.0], [6.5, 0.02], [7.3, 0.02]];
const PZ_ = [[0, 0.05], [0.6, -0.5, E.inQuad], [1.25, -2.0, E.outQuad], [2.0, -2.25], [2.4, -2.3], [3.5, -2.55], [4.3, -3.3, E.inOutQuad], [4.75, -3.3], [6.0, -0.9, E.inOutQuad], [6.5, -0.28, E.outQuad], [7.3, -0.22]];
const YAW = [[0, -0.45], [0.75, 1.9], [1.25, PI], [2.05, PI], [2.3, 1.6], [2.55, 0.05], [3.5, 0], [4.3, 0.15], [4.75, 0], [7.3, 0]];

export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  renderer.toneMapping = THREE.NoToneMapping;
  PSX.snap.value.set(width / 2, height / 2);
  camera.fov = 62; camera.near = 0.03; camera.far = 30; camera.updateProjectionMatrix();
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const loader = new THREE.TextureLoader(), T = {};
  for (const k of ['face', 'shirtFront', 'shirtBack', 'forearm', 'wallBlack', 'wallTiles', 'ceiling']) {
    const t = await loader.loadAsync(asset(`tex/${k}.png`)); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; T[k] = t; }
  const lam = (t, rep) => { if (rep) { t = t.clone(); t.repeat.set(...rep); t.needsUpdate = true; } return psx(new THREE.MeshLambertMaterial({ map: t, flatShading: true })); };
  const flat = c => psx(new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const box = (parent, w, h, d, p, mats, rot) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = true; parent.add(m); return m; };

  /* ── graffiti room (crops from the scarf photo) ── */
  scene.background = new THREE.Color(0x121112);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a807a, 2.6));
  const key1 = new THREE.DirectionalLight(0xffffff, 1.1); key1.position.set(1, 3, 3); key1.castShadow = true; key1.shadow.mapSize.set(512, 512);
  Object.assign(key1.shadow.camera, { left: -3, right: 3, top: 3, bottom: -5, near: 0.5, far: 12 }); key1.shadow.bias = -0.002; scene.add(key1);
  const wall = (tex, w, h, p, rot, rep) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), psx(new THREE.MeshBasicMaterial({ map: rep ? Object.assign(tex.clone(), { repeat: new THREE.Vector2(...rep), needsUpdate: true }) : tex })));
    m.position.set(...p); if (rot) m.rotation.set(...rot); scene.add(m); return m; };
  wall(T.wallBlack, 4.2, 2.8, [0, 1.4, -4.3], null, [3, 2]);                          // back: black wall with tags
  wall(T.wallTiles, 1.5, 1.6, [-0.9, 1.4, -4.28]);                                    // a block of white graffiti tiles on it
  wall(T.wallTiles, 5.2, 2.8, [-1.9, 1.4, -1.7], [0, PI / 2, 0], [4, 2]);            // left: white tiles, covered in tags
  wall(T.wallBlack, 5.2, 2.8, [1.9, 1.4, -1.7], [0, -PI / 2, 0], [4, 2]);            // right: black wall
  wall(T.ceiling, 4.2, 5.2, [0, 2.75, -1.7], [PI / 2, 0, 0], [2, 3]);                 // black ceiling with chalk tags
  const floorT = tex64(g => { speckle(g, '#7a7570', ['#6a6560', '#8a8580', '#5e5955'], 500); px(g, '#4e4a46', 0, 0, 64, 1); px(g, '#4e4a46', 0, 0, 1, 64); });
  { const f = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.4), lam(floorT, [8, 10])); f.rotation.x = -PI / 2; f.position.set(0, 0, -1.6); f.receiveShadow = true; scene.add(f); }

  /* ── him: < 300 triangles, scanned crops on the faces ── */
  const red = tex64(g => speckle(g, '#a83a3c', ['#953234', '#b84546', '#8a2c2e'], 300));
  const sleeve = tex64(g => { speckle(g, '#a83a3c', ['#953234', '#b84546'], 200, 0, 0, 64, 36); speckle(g, '#c99b84', ['#b88a73', '#d8ab94'], 160, 0, 36, 64, 28); px(g, '#7a2426', 0, 34, 64, 2); });
  const skin = tex64(g => speckle(g, '#c99b84', ['#b88a73', '#d8ab94'], 160));
  const jeans = tex64(g => speckle(g, '#1c1a1c', ['#262326', '#141214', '#2e2a2d'], 260));
  const shoe = tex64(g => { speckle(g, '#121112', ['#1c1a1c'], 80); px(g, '#2a2628', 0, 54, 64, 10); });
  const hairT = tex64(g => { px(g, '#3a2618', 0, 0, 64, 64); let s2 = 3; const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) { const x = Math.floor(rr() * 64), y = Math.floor(rr() * 64), c = rr() < 0.5 ? '#6e4a30' : '#553722'; px(g, c, x, y, 3, 1); px(g, c, x - 1, y + 1, 1, 2); px(g, c, x + 3, y + 1, 1, 2); px(g, c, x, y + 3, 3, 1); } });
  const M = { red: lam(red), front: lam(T.shirtFront), back: lam(T.shirtBack), face: lam(T.face), hair: lam(hairT), sleeve: lam(sleeve), fore: lam(T.forearm), skin: lam(skin), jeans: lam(jeans), shoe: lam(shoe) };
  const root = new THREE.Group(); scene.add(root);
  const J = {};
  const joint = (n, parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[n] = g; return g; };
  const hips = joint('hips', root, 0, 0.95, 0), torso = joint('torso', hips, 0, 0, 0);
  box(torso, 0.42, 0.62, 0.23, [0, 0.31, 0], [M.red, M.red, M.red, M.red, M.front, M.back]);                       // CYMRU tee
  box(hips, 0.4, 0.14, 0.22, [0, -0.02, 0], M.jeans);
  const head = joint('head', torso, 0, 0.62, 0);
  box(head, 0.09, 0.08, 0.09, [0, 0.02, 0], M.skin);                                                             // neck
  box(head, 0.24, 0.28, 0.25, [0, 0.19, 0.01], [M.hair, M.hair, M.hair, M.skin, M.face, M.hair]);
  box(head, 0.34, 0.12, 0.33, [0, 0.36, -0.02], M.hair);                                                         // big curly top
  box(head, 0.34, 0.34, 0.12, [0, 0.16, -0.15], M.hair);                                                         // mullet down the back
  box(head, 0.06, 0.24, 0.24, [0.16, 0.2, -0.03], M.hair); box(head, 0.06, 0.24, 0.24, [-0.16, 0.2, -0.03], M.hair);
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = joint('shoulder' + s, torso, sx * 0.27, 0.56, 0);
    box(sh, 0.12, 0.3, 0.12, [0, -0.13, 0], M.sleeve);
    const el = joint('elbow' + s, sh, 0, -0.28, 0);
    box(el, 0.095, 0.27, 0.1, [0, -0.13, 0], M.fore);
    box(el, 0.08, 0.11, 0.06, [0, -0.32, 0.01], M.skin);
    const hp = joint('hip' + s, hips, sx * 0.1, -0.05, 0);
    box(hp, 0.16, 0.45, 0.17, [0, -0.21, 0], M.jeans);
    const kn = joint('knee' + s, hp, 0, -0.42, 0);
    box(kn, 0.15, 0.4, 0.16, [0, -0.2, 0], M.jeans);
    box(kn, 0.12, 0.08, 0.27, [0, -0.44, 0.05], M.shoe);
  }
  let tris = 0; root.traverse(o => { if (o.isMesh) tris += o.geometry.index.count / 3; });
  console.log(`[scene] dancer ${tris} triangles`);
  // the tissue he throws up
  const tissue = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.004, 0.11), flat(0xf4f4f0)); scene.add(tissue);

  /* walk phase from path length (precomputed) */
  const dtw = 1 / 240, NW = Math.ceil(7.4 / dtw), acc = new Float32Array(NW + 1);
  for (let i = 1; i <= NW; i++) { const a = (i - 1) * dtw, b = i * dtw; acc[i] = acc[i - 1] + Math.hypot(key(b, PX_) - key(a, PX_), key(b, PZ_) - key(a, PZ_)); }
  const dist = t => acc[Math.min(NW, Math.max(0, Math.round(t / dtw)))];
  const speed = t => (dist(t + 0.05) - dist(t - 0.05)) / 0.1;

  /* ── post ── */
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

  const LOOK = [[0, [0.12, 1.2, 0.0]], [1.1, [0.2, 1.0, -2.2]], [4.6, [0.05, 1.05, -2.6]], [5.7, [0.03, 1.1, -1.6]], [6.6, [0.02, 1.5, -0.25]], [7.3, [0.02, 1.52, -0.2]]];
  const look = V3(), hand = V3();
  return {
    update(t) {
      /* pose: blend key poses, legs from the walk cycle while moving */
      let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
      const [t0, a] = KEYS[i], [t1, b] = KEYS[i + 1], k = E.inOutCubic(range(t, t0, t1)), A = P[a](t), B = P[b](t);
      const pose = { drop: lerp(A.drop || 0, B.drop || 0, k) };
      for (const j of JN) { const x = A[j] || [0, 0, 0], y = B[j] || [0, 0, 0]; pose[j] = [lerp(x[0], y[0], k), lerp(x[1], y[1], k), lerp(x[2], y[2], k)]; }
      const sp = speed(t), wk = Math.min(1, sp / 0.9), ph = dist(t) / 1.25 * 2 * PI, q = Math.sin(ph);
      const walk = { hipL: [-0.5 * q, 0, 0.03], hipR: [0.5 * q, 0, -0.03], kneeL: [0.1 + 0.7 * Math.max(0, Math.sin(ph - 1.2)), 0, 0], kneeR: [0.1 + 0.7 * Math.max(0, Math.sin(ph + PI - 1.2)), 0, 0] };
      for (const j of ['hipL', 'hipR', 'kneeL', 'kneeR']) pose[j] = pose[j].map((v, n) => lerp(v, walk[j][n], wk));
      for (const j of JN) J[j].rotation.set(...pose[j]);
      J.hips.position.y = 0.95 + pose.drop + wk * 0.015 * Math.abs(Math.cos(ph));
      const hop = Math.sin(range(t, 2.5, 2.72) * PI) * 0.06 + Math.sin(range(t, 2.85, 3.3) * PI) * 0.3;
      root.position.set(key(t, PX_), hop, key(t, PZ_)); root.rotation.y = key(t, YAW);

      /* tissue: in his hands, thrown up at 2.95, flutters down */
      J.elbowL.getWorldPosition(hand); hand.add(J.elbowR.getWorldPosition(V3())).multiplyScalar(0.5).add(V3(0, 0.1, 0.05));
      if (t < 2.95) { tissue.visible = t > 2.6; tissue.position.copy(hand); tissue.rotation.set(0, 0, 0); }
      else { tissue.visible = t < 4.9; const u = t - 2.95, x0 = key(2.95, PX_), z0 = key(2.95, PZ_);
        const y = u < 0.45 ? 2.05 + 3.2 * u - 3.5 * u * u : 2.78 - (u - 0.45) * 1.4;
        tissue.position.set(x0 + u * 0.12 + Math.sin(u * 6) * 0.08, Math.max(0.01, y), z0 + 0.1 * u); tissue.rotation.set(u * 5, u * 3, Math.sin(u * 7) * 0.8); }

      /* camera: phone low on the floor, follows him a little; shaky */
      const L = key(t, LOOK);
      camera.position.set(0.02 + wiggle(t, 1.2, 1) * 0.012, 0.32 + wiggle(t, 1.1, 2) * 0.01, 0.75);
      look.set(L[0] + wiggle(t, 0.8, 3) * 0.03, L[1], L[2]); camera.lookAt(look); camera.updateMatrixWorld();
    },
    render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
  };
}
