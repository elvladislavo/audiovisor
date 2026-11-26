// BRIEF — the tricycle-kitten clip (desert canyon, ramp jump, peace sign, tree) remade low-poly like the other cat pieces.
// 1. SCAN (scan/scan.py → tex/*.png): 64-px crops from key frames — the kitten's face (closed, 3.5 s; cheering, 8.0 s),
//    sandstone rock, the dirt track, tree bark and the blurred canyon; tabby / white fur painted from the clip's palette.
//    The creator's watermark and the Instagram outro are left out.
// 2. MODELS: kitten < 300 triangles (jittered icosahedra for fluff, box limbs, the face crops on the front of the head),
//    olive-green tricycle (cream rims, black tyres), rocks, ramp, tree trunk.
// 3. ANIMATE (13.6 s · 270×480, nearest upscale, vertex snapping, ordered dither):
//   0–4.5    rides down the rocky track toward us, pedalling over bumps
//   4.5–5.0  hits the rock ramp and launches
//   5.0–10.1 slow-motion flight, camera swings to the side; mouth opens (6.4), peace sign (7.6–9.4)
//   10.1     smacks into the tree trunk (squash, shake); the tricycle drops away
//   10.2–11.8 slides down the trunk · 11.8–12.3 flops onto its back · lies there, legs up · fade 12.9–13.6
import { ease, key, range, wiggle } from '/lib/motion.js';
import { PSX, psx, tex64, px, speckle } from '/assets/lowpoly-mc.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
export const meta = { duration: 13.6, fps: 30, background: '#e0bd92' };
const T_LAUNCH = 4.5, T_AIR = 5.0, T_HIT = 10.1, T_SLID = 11.8, T_FLOP = 12.3;
const TREE = { x: 0.05, z: 8.6, r: 0.35 };

export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 21; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  renderer.toneMapping = THREE.NoToneMapping;
  PSX.snap.value.set(width / 2, height / 2);
  camera.fov = 52; camera.near = 0.03; camera.far = 60; camera.updateProjectionMatrix();
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const loader = new THREE.TextureLoader(), T = {};
  for (const k of ['faceClosed', 'faceOpen', 'rock', 'dirt', 'bark', 'canyon']) {
    const t = await loader.loadAsync(asset(`tex/${k}.png`)); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; T[k] = t; }
  const rep = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
  const lam = t => psx(new THREE.MeshLambertMaterial({ map: t, flatShading: true }));
  const flat = c => psx(new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const fluffy = (detail, amt) => { const g = new THREE.IcosahedronGeometry(1, detail), pa = g.attributes.position, mem = new Map();
    for (let i = 0; i < pa.count; i++) { const k = `${pa.getX(i).toFixed(3)},${pa.getY(i).toFixed(3)},${pa.getZ(i).toFixed(3)}`;
      if (!mem.has(k)) mem.set(k, 1 + (rnd() - 0.35) * amt); const f = mem.get(k); pa.setXYZ(i, pa.getX(i) * f, pa.getY(i) * f, pa.getZ(i) * f); }
    g.computeVertexNormals(); return g; };
  const add = (geo, mat, p, parent = scene, rot, scl) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (rot) m.rotation.set(...rot); if (scl) m.scale.set(...scl);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  /* ── canyon ── */
  scene.background = new THREE.Color(0xe0bd92); scene.fog = new THREE.Fog(0xe0bd92, 9, 28);
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0xc89a72, 3.4));
  const sun = new THREE.DirectionalLight(0xffe0b0, 2.0); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 }); sun.shadow.bias = -0.002; scene.add(sun, sun.target);
  const rockM = lam(T.rock), dirtM = lam(rep(T.dirt, 8, 20)), barkM = lam(rep(T.bark, 1, 4)), canyonM = lam(rep(T.canyon, 3, 2));
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(30, 44), dirtM); g.rotation.x = -PI / 2; g.position.set(0, 0, -6); g.receiveShadow = true; scene.add(g); }
  // rock walls lining the track, big boulders further out, the far canyon face
  for (let i = 0; i < 70; i++) { const side = i % 2 ? 1 : -1, z = -20 + rnd() * 29, far = rnd() < 0.35;
    const x = side * (far ? 3.4 + rnd() * 3 : 1.3 + rnd() * 1.2), s = far ? 1.4 + rnd() * 2.2 : 0.35 + rnd() * 0.7;
    if (Math.abs(z - TREE.z) < 1.6 && side > 0 && !far) continue;
    add(fluffy(0, 0.4), rockM, [x, s * 0.35, z], scene, [rnd() * 3, rnd() * 3, rnd() * 3], [s, s * (0.6 + rnd() * 0.5), s]); }
  for (const side of [1, -1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), canyonM); w.position.set(side * 8, 4, -4); w.rotation.y = -side * PI / 2; scene.add(w); }
  // launch ramp: a sloped slab of rock
  { const r = add(new THREE.BoxGeometry(0.9, 0.12, 2.1), rockM, [0, 0.28, -1.0], scene, [-0.27, 0, 0]); add(fluffy(0, 0.3), rockM, [0, 0.12, -0.2], scene, null, [0.7, 0.45, 0.6]); }
  // the tree
  add(new THREE.CylinderGeometry(TREE.r * 0.9, TREE.r * 1.1, 7, 8), barkM, [TREE.x, 3.5, TREE.z]);
  add(new THREE.ConeGeometry(0.75, 0.6, 8), barkM, [TREE.x, 0.25, TREE.z]);

  /* ── tricycle (faces +z, origin on the ground under the seat) ── */
  const olive = flat(0x6c6a2c), tyre = flat(0x151413), rim = flat(0xd9cfa8), seatM = flat(0x2a2620);
  const trike = new THREE.Group(); scene.add(trike);
  const wheel = (r, w, p) => { const g = new THREE.Group(); g.position.set(...p); trike.add(g);
    add(new THREE.CylinderGeometry(r, r, w, 10), tyre, [0, 0, 0], g, [0, 0, PI / 2]);
    add(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.012, 8), rim, [0, 0, 0], g, [0, 0, PI / 2]);
    add(new THREE.BoxGeometry(w + 0.02, r * 1.1, 0.015), tyre, [0, 0, 0], g); return g; };
  const front = wheel(0.2, 0.07, [0, 0.2, 0.38]); const rearL = wheel(0.12, 0.05, [0.18, 0.12, -0.25]), rearR = wheel(0.12, 0.05, [-0.18, 0.12, -0.25]);
  const bar = (a, b, w = 0.035) => { const A = V3(...a), B = V3(...b), m = add(new THREE.BoxGeometry(w, A.distanceTo(B), w), olive, [0, 0, 0], trike);
    m.position.copy(A).lerp(B, 0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), B.clone().sub(A).normalize()); return m; };
  bar([0, 0.3, -0.12], [0, 0.42, 0.33]); bar([0, 0.2, 0.38], [0, 0.64, 0.3]); bar([-0.18, 0.12, -0.25], [0.18, 0.12, -0.25]); bar([0, 0.13, -0.25], [0, 0.32, -0.08]);
  add(new THREE.BoxGeometry(0.38, 0.03, 0.03), olive, [0, 0.64, 0.3], trike); add(new THREE.BoxGeometry(0.15, 0.04, 0.12), seatM, [0, 0.35, -0.08], trike);

  /* ── kitten (< 300 tris) ── */
  const tabbyT = tex64(g => { speckle(g, '#8c7d6d', ['#9d8e7e', '#776a5c', '#b0a392'], 260); for (let y = 2; y < 64; y += 8) for (let x = 0; x < 64; x++) px(g, '#3b322b', x, y + Math.round(Math.sin(x / 5 + y) * 1.5), 1, 3); });
  const whiteT = tex64(g => speckle(g, '#efe9e2', ['#e2dbd2', '#faf7f3', '#d4ccc2'], 220));
  const tabM = lam(tabbyT), whiteM = lam(whiteT), faceM = { closed: lam(T.faceClosed), open: lam(T.faceOpen) };
  const cat = new THREE.Group(); scene.add(cat);
  const J = {};
  const pivot = (n, parent, p) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); J[n] = g; return g; };
  const bodyJ = pivot('body', cat, [0, 0, 0]);
  add(fluffy(1, 0.18), tabM, [0, 0.2, -0.02], bodyJ, [-0.15, 0, 0], [0.15, 0.2, 0.15]);
  add(fluffy(0, 0.15), whiteM, [0, 0.22, 0.09], bodyJ, null, [0.11, 0.15, 0.06]);
  const headJ = pivot('head', bodyJ, [0, 0.4, 0.03]);
  { // head: fluffy shell, face crop on the front half (planar from the front), tabby fur on the back half
    const g = fluffy(1, 0.12), pa = g.attributes.position, uv = new Float32Array(pa.count * 2);
    for (let i = 0; i < pa.count; i++) { uv[i * 2] = (pa.getX(i) + 1) / 2; uv[i * 2 + 1] = (pa.getY(i) + 1) / 2; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.clearGroups();
    for (let i = 0; i < pa.count; i += 3) { const cz = (pa.getZ(i) + pa.getZ(i + 1) + pa.getZ(i + 2)) / 3; g.addGroup(i, 3, cz > -0.15 ? 0 : 1); }
    J.headMesh = add(g, [faceM.open, tabM], [0, 0.15, 0], headJ, null, [0.19, 0.175, 0.16]); }
  for (const sx of [1, -1]) add(new THREE.ConeGeometry(0.055, 0.1, 3), tabM, [sx * 0.11, 0.31, -0.01], headJ, [0, 0, -sx * 0.35]);
  for (const [n, sx] of [['armL', 1], ['armR', -1]]) { const a = pivot(n, bodyJ, [sx * 0.08, 0.34, 0.08]); add(new THREE.BoxGeometry(0.075, 0.19, 0.075), whiteM, [0, -0.095, 0], a); }
  for (const [n, sx] of [['legL', 1], ['legR', -1]]) { const l = pivot(n, bodyJ, [sx * 0.08, 0.06, 0.05]); add(new THREE.BoxGeometry(0.085, 0.26, 0.085), whiteM, [0, -0.13, 0], l); }
  const tail = pivot('tail', bodyJ, [0, 0.05, -0.13]); add(new THREE.CylinderGeometry(0.03, 0.045, 0.3, 4), tabM, [0, 0.15, 0], tail);
  const vee = new THREE.Group(); vee.position.set(0, -0.21, 0); J.armR.add(vee);              // peace sign: two raised toes
  for (const s of [1, -1]) add(new THREE.BoxGeometry(0.014, 0.06, 0.014), whiteM, [s * 0.012, -0.02, 0], vee, [0, 0, s * 0.3]);
  let tris = 0; cat.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  console.log(`[scene] kitten ${tris} triangles`);

  /* ── post ── */
  const rt = new THREE.WebGLRenderTarget(width, height, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, samples: 0 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, levels: { value: 9.0 }, fade: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float levels, fade; varying vec2 vUv;
      const float B[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb * (1.0 - fade); ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
        float d = (B[p.x + p.y * 4] + 0.5) / 16.0 - 0.5; c = floor(c * levels + 0.5 + d) / levels; gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
    depthTest: false, depthWrite: false })));
  const fadeU = postScene.children[0].material.uniforms.fade;

  /* ── motion ── */
  const RIDE_Z = [[0, -14], [T_LAUNCH, -2.0, E.linear]], seatOff = V3(0, 0.39, -0.07);
  function trikeState(t) {        // position + pitch of the tricycle
    if (t < T_LAUNCH) { const z = key(t, RIDE_Z); return { x: Math.sin(t * 1.3) * 0.12, y: Math.abs(Math.sin(t * 9)) * 0.025 + Math.max(0, Math.sin(t * 3.1)) * 0.02, z, pitch: Math.sin(t * 9) * 0.04, roll: Math.sin(t * 1.3) * 0.05 }; }
    if (t < T_AIR) { const k = range(t, T_LAUNCH, T_AIR); return { x: Math.sin(T_LAUNCH * 1.3) * 0.12 * (1 - k), y: 0.55 * k, z: lerp(-2.0, 0.1, k), pitch: -0.45 * E.outCubic(k), roll: 0 }; }
    if (t < T_HIT) { const k = range(t, T_AIR, T_HIT); return { x: 0, y: 0.55 + 1.9 * Math.sin(k * PI * 0.82) * (1 - 0.15 * k), z: lerp(0.1, TREE.z - TREE.r - 0.58, k), pitch: lerp(-0.45, 0.12, k), roll: Math.sin(k * 5) * 0.08 }; }
    const k = Math.pow(range(t, T_HIT, T_HIT + 0.8), 3), hitY = 0.55 + 1.9 * Math.sin(PI * 0.82) * 0.85;
    return { x: 0.25 * k, y: lerp(hitY, 0.2, k), z: lerp(TREE.z - TREE.r - 0.58, TREE.z - 1.1, k), pitch: lerp(0.12, 1.1, k), roll: lerp(0, 1.45, k) };
  }
  const tw = new THREE.Object3D(), seatW = V3(), K = V3();
  return {
    update(t) {
      /* tricycle */
      const s = trikeState(t);
      trike.position.set(s.x, s.y, s.z); trike.rotation.set(s.pitch, 0, s.roll); trike.updateMatrixWorld(true);
      const spin = t < T_HIT ? (t < T_AIR ? key(t, RIDE_Z) + 14 : 12 + (t - T_AIR) * 1.2) / 0.2 : 0;
      front.rotation.x = spin; rearL.rotation.x = rearR.rotation.x = spin * 1.6;

      /* kitten */
      const ped = t < T_LAUNCH ? spin * 0.9 : 0;
      const air = range(t, T_LAUNCH, T_AIR), open = t > 6.4 && t < T_HIT + 0.05;
      const peace = E.inOutCubic(range(t, 7.6, 7.9)) * (1 - E.inOutCubic(range(t, 9.3, 9.6)));
      J.headMesh.material[0] = open || t > T_FLOP ? faceM.open : faceM.closed;
      vee.visible = peace > 0.3;
      if (t < T_HIT) {
        seatW.copy(seatOff).applyMatrix4(trike.matrixWorld); cat.position.copy(seatW);
        cat.rotation.set(s.pitch * 0.25, -0.9 * air, s.roll); cat.scale.set(1, 1, 1);
        J.body.rotation.set(-0.25 * air + Math.sin(t * 9) * 0.02 * (1 - air), 0, 0);
        J.head.rotation.set(lerp(0.05, 0.12, air) + Math.sin(t * 2.3) * 0.04, Math.sin(t * 0.9) * 0.15 * (1 - air), 0);
        J.armL.rotation.set(lerp(-1.15, -1.35, air), 0, 0);
        J.armR.rotation.set(lerp(lerp(-1.15, -1.35, air), -0.4, peace), 0, -2.2 * peace);
        J.legL.rotation.set(lerp(-1.0 + 0.3 * Math.sin(ped), -1.45, air), 0, 0.05); J.legR.rotation.set(lerp(-1.0 - 0.3 * Math.sin(ped), -1.45, air), 0, -0.05);
        J.tail.rotation.set(-1.0 - 0.6 * air + Math.sin(t * 3) * 0.2, 0, Math.sin(t * 2) * 0.3);
      } else {
        // splat on the trunk, slide down, flop onto the back
        const slide = E.inQuad(range(t, T_HIT + 0.15, T_SLID)), flop = E.inOutCubic(range(t, T_SLID, T_FLOP));
        const hitY = trikeState(T_HIT - 1e-3).y + 0.39;
        cat.position.set(lerp(0.02, 0.15, flop), lerp(lerp(hitY, 0.32, slide), 0.12, flop), lerp(TREE.z - TREE.r - 0.17, TREE.z - 0.85, flop));
        const sq = Math.max(0, 1 - (t - T_HIT) / 0.35);
        cat.scale.set(1 + 0.25 * sq, 1 - 0.1 * sq, 1 - 0.35 * sq);
        cat.rotation.set(-PI / 2 * flop, 0, Math.sin(t * 6) * 0.05 * (1 - flop));
        J.body.rotation.set(0.1, 0, 0);
        J.head.rotation.set(lerp(-0.1, -0.35, flop), lerp(0, 0.7, flop), lerp(0, 0.2, flop));
        const twitch = t > T_FLOP ? Math.sin(t * 9) * 0.15 : 0;
        J.armL.rotation.set(lerp(-1.6, -2.4, flop) + twitch, 0, lerp(0.6, 0.3, flop)); J.armR.rotation.set(lerp(-1.6, -2.4, flop) - twitch, 0, lerp(-0.6, -0.3, flop));
        J.legL.rotation.set(lerp(0.3, -1.3, flop) - twitch, 0, 0.15); J.legR.rotation.set(lerp(0.3, -1.3, flop) + twitch, 0, -0.15);
        J.tail.rotation.set(lerp(-0.6, -1.4, flop), 0, Math.sin(t * 4) * 0.3);
      }

      /* camera */
      cat.getWorldPosition(K);
      const swing = E.inOutCubic(range(t, 4.3, 5.8)), close = E.inOutCubic(range(t, 7.2, 8.0)) * (1 - E.inOutCubic(range(t, 9.4, 10.0)));
      const ahead = V3(0.55, 0.7, Math.max(K.z + 2.2, -9)), side = V3(-2.6 + 0.8 * close, K.y + 0.15, K.z + 1.4 - 0.3 * close);
      let cp = ahead.clone().lerp(side, swing), look = K.clone().add(V3(0, 0.3, 0.1));
      if (t > T_HIT - 0.15) { const k = E.inOutCubic(range(t, T_HIT - 0.15, T_HIT + 0.3)), low = E.inOutCubic(range(t, T_SLID - 0.4, T_FLOP + 0.3));
        cp = cp.lerp(V3(-1.6, lerp(1.6, 0.5, low), TREE.z - 2.1), k); look = K.clone().add(V3(0, 0.25, 0)); }
      const shake = t > T_HIT ? Math.max(0, 1 - (t - T_HIT) / 0.5) : 0;
      camera.position.copy(cp).add(V3(wiggle(t, 0.7, 1) * 0.02 + Math.sin(t * 70) * 0.05 * shake, wiggle(t, 0.6, 2) * 0.02 + Math.cos(t * 63) * 0.04 * shake, 0));
      camera.lookAt(look); camera.updateMatrixWorld();
      sun.position.copy(K).add(V3(-3.5, 6, 3)); sun.target.position.copy(K);
      fadeU.value = range(t, 12.9, 13.6);
    },
    render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
  };
}
