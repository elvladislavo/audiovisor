// BRIEF — the Legia scarf photo (IMG_0849) as a short low-poly animation, same method and look as the kitten and
// locker-room pieces, but with the body built straight from the photo's proportions.
// 1. SCAN (scan/scan.py → tex/*.png): 64-px crops of his face/hair, his body (sweatshirt, hands), and the graffiti
//    background (white tiles on the left, black wall on the right, the black beam overhead); landmarks below.
// 2. MODEL (≈ 240 triangles + a 96-triangle scarf ribbon): every part is sized and placed from the photo's pixels
//    (1 px = 0.52 mm, photo plane at z = 0): head 350 × 485 px, neck, 940-px-wide shoulders, shoulder and hand points.
//    The arms are two-bone IK chains; in the final pose they reproduce the photo, and the photo crops are projected onto
//    every part from the front at that pose. The scarf is painted by code (white knit, black "LEGIA WARSZAWA",
//    red–white–green bands, black fringe) because most of it is hidden behind him in the photo.
// 3. ANIMATE (6 s · 270×480, nearest upscale, vertex snapping, ordered dither):
//   0–1.2    scarf held low in front, he looks down at it
//   1.2–2.4  lifts it over his head, looking up
//   2.4–3.4  brings it down behind his neck, hands at the shoulders → the photo pose
//   3.4–6    holds it, stares into the lens; the scarf ends swing; slow push-in
import { ease, range, wiggle } from '/lib/motion.js';
import { PSX, psx } from '/assets/lowpoly-mc.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
export const meta = { duration: 6, fps: 30, background: '#1c1a1a' };
const S = 0.00052, PX = x => (x - 750) * S, PY = y => (2016 - y) * S + 1.0;
const CROPS = { face: [520, 480, 925, 1010], body: [60, 820, 1500, 2016], shirt: [330, 1040, 1180, 2016] };
// landmarks read off the photo (px)
const L = { head: [722, 742, 174, 243], neck: [722, 1035, 92], torsoTop: [760, 1090, 470], torsoBot: [770, 2300, 455],
  shoulderR: [370, 1190], shoulderL: [1150, 1170], handR: [195, 1010], handL: [1385, 905] };

export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  renderer.toneMapping = THREE.NoToneMapping;
  PSX.snap.value.set(width / 2, height / 2);
  camera.fov = 50; camera.near = 0.02; camera.far = 30; camera.updateProjectionMatrix();
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const P = ([x, y], z = 0) => V3(PX(x), PY(y), z);
  const hTan = Math.tan(THREE.MathUtils.degToRad(25)) * width / height;

  const loader = new THREE.TextureLoader(), T = {};
  for (const k of ['face', 'body', 'shirt', 'wallL', 'wallR', 'ceiling', 'tiles']) {
    const t = await loader.loadAsync(asset(`tex/${k}.png`)); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; T[k] = t; }
  const lam = t => psx(new THREE.MeshLambertMaterial({ map: t, flatShading: true }));
  const flat = c => psx(new THREE.MeshLambertMaterial({ color: c, flatShading: true }));

  scene.background = new THREE.Color(0x1c1a1a);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9088, 3.1));
  const flash = new THREE.DirectionalLight(0xffffff, 1.5); flash.position.set(0.3, 1.8, 3); scene.add(flash);       // on-camera flash, like the photo

  /* ── graffiti room from the scanned background crops ── */
  const plane = (tex, w, h, p, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), psx(new THREE.MeshBasicMaterial({ map: tex }))); m.position.set(...p); if (rot) m.rotation.set(...rot); scene.add(m); return m; };
  plane(T.wallR, 1.3, 1.25, [0.5, 1.63, -0.45]);                                    // black wall with ROSE / SNUFF tags
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.05), psx(new THREE.MeshBasicMaterial({ color: 0x1b1918 }))); w.position.set(0.5, 0.5, -0.45); scene.add(w); }   // plain dark lower wall
  plane(T.wallR, 0.8, 2.4, [-1.0, 1.2, -0.75]);
  plane(T.wallL, 0.6, 0.75, [-0.42, 1.85, -0.25], [0, 0.7, 0]);                     // white graffiti tiles, the corner on the left
  plane(T.tiles, 0.6, 1.5, [-0.42, 0.73, -0.25], [0, 0.7, 0]);
  { const fl = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), flat(0x2a2725)); fl.rotation.x = -PI / 2; fl.position.set(0, 0, 0.5); scene.add(fl); }
  plane(T.ceiling, 1.4, 0.3, [0, 2.24, -0.3], [0.5, 0, 0]);                          // black beam overhead

  /* ── him ── */
  const parts = [];
  const add = (geo, crop, p, parent = scene) => { const m = new THREE.Mesh(geo, null); m.position.copy(p); m.userData.crop = crop; parent.add(m); parts.push(m); return m; };
  const body = new THREE.Group(); scene.add(body);
  const neckBase = P([722, 1080]);
  const headJ = new THREE.Group(); headJ.position.copy(neckBase); body.add(headJ);
  const [hx, hy, hw, hh] = L.head;
  const head = add(new THREE.IcosahedronGeometry(1, 1), 'face', P([hx, hy]).sub(neckBase), headJ); head.scale.set(hw * S, hh * S, hw * S * 0.95);
  const neck = add(new THREE.CylinderGeometry(L.neck[2] * S * 0.85, L.neck[2] * S * 0.95, 0.09, 5), 'face', P([722, 1030], -0.025).sub(neckBase), headJ);
  { const top = P(L.torsoTop.slice(0, 2)), bot = P(L.torsoBot.slice(0, 2)), h = top.y - bot.y;
    const t = add(new THREE.CylinderGeometry(L.torsoTop[2] * S, L.torsoBot[2] * S, h, 6), 'shirt', V3((top.x + bot.x) / 2, (top.y + bot.y) / 2, -0.03), body); t.scale.z = 0.5; }
  for (const k of ['shoulderR', 'shoulderL']) { const m = add(new THREE.IcosahedronGeometry(0.065, 0), 'shirt', P(L[k], -0.02), body); m.scale.set(1.1, 0.9, 1); }
  // legs: the photo stops at the waist, so plain dark trousers and black shoes down to the floor
  for (const sx of [1, -1]) { const jean = flat(0x1e1f24), shoe = flat(0x0e0e10);
    for (const [w, h, d, y, z, m] of [[0.16, 0.5, 0.17, 0.66, -0.03, jean], [0.135, 0.44, 0.14, 0.24, -0.03, jean], [0.12, 0.07, 0.28, 0.035, 0.03, shoe]]) {
      const g2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g2.position.set(sx * 0.11 + 0.01, y, z); scene.add(g2); } }
  // arms: upper arm, forearm, hand — placed every frame by two-bone IK
  const UA = 0.29, FA = 0.26;
  const arm = side => ({ side, upper: add(new THREE.BoxGeometry(0.1, UA, 0.1), 'sleeve', V3()), fore: add(new THREE.BoxGeometry(0.09, FA, 0.09), 'sleeve', V3()),
    hand: add(new THREE.BoxGeometry(0.075, 0.09, 0.045), 'skin', V3()), S0: P(L['shoulder' + side], -0.02) });
  const arms = { R: arm('R'), L: arm('L') };
  const up = V3(0, 1, 0), q = new THREE.Quaternion();
  const place = (m, a, b) => { m.position.copy(a).lerp(b, 0.5); q.setFromUnitVectors(up, b.clone().sub(a).normalize()); m.quaternion.copy(q); };
  function solve(A, H, pole) {           // two-bone IK, elbow pushed toward `pole`
    const S0 = A.S0.clone().applyMatrix4(body.matrixWorld), d = H.clone().sub(S0), len = Math.min(d.length(), UA + FA - 1e-3), dir = d.normalize();
    const cosA = (UA * UA + len * len - FA * FA) / (2 * UA * len), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const perp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const E0 = S0.clone().add(dir.clone().multiplyScalar(UA * cosA)).add(perp.multiplyScalar(UA * sinA)), Hc = S0.clone().add(dir.clone().multiplyScalar(len));
    place(A.upper, S0, E0); place(A.fore, E0, Hc); place(A.hand, Hc, Hc.clone().add(Hc.clone().sub(E0).normalize().multiplyScalar(0.1)));
    A.hand.position.copy(Hc).add(Hc.clone().sub(E0).normalize().multiplyScalar(0.03));
    return Hc;
  }
  const POLE = { R: V3(-0.6, -1, 0.5).normalize(), L: V3(0.6, -1, 0.5).normalize() };
  const HAND_FINAL = { R: P(L.handR, 0.0), L: P(L.handL, 0.0) };
  body.updateMatrixWorld(true);
  solve(arms.R, HAND_FINAL.R, POLE.R); solve(arms.L, HAND_FINAL.L, POLE.L);

  // bake the front projection at the photo pose
  scene.updateMatrixWorld(true);
  let tris = 0; const v = V3();
  const SOLID = { sleeve: flat(0x2c2d2a), skin: flat(0xeab9a2) };   // arms are hidden under the scarf in the photo: plain sweatshirt + skin
  for (const m of parts) { if (SOLID[m.userData.crop]) { m.material = SOLID[m.userData.crop]; tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; continue; }
    const [x0, y0, x1, y1] = CROPS[m.userData.crop], g = m.geometry, pa = g.attributes.position, uv = new Float32Array(pa.count * 2);
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
      const px = v.x / S + 750, py = 2016 - (v.y - 1.0) / S;
      uv[i * 2] = Math.min(1, Math.max(0, (px - x0) / (x1 - x0))); uv[i * 2 + 1] = Math.min(1, Math.max(0, 1 - (py - y0) / (y1 - y0))); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); m.material = lam(T[m.userData.crop === 'shirt' ? 'shirt' : m.userData.crop]); tris += (g.index ? g.index.count : pa.count) / 3; }

  /* ── the scarf: code-painted Legia knit on a ribbon that follows his hands ── */
  const scarfTex = (() => { let sd = 5; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const c = document.createElement('canvas'); c.width = 512; c.height = 48; const g = c.getContext('2d');
    g.fillStyle = '#d9d6d0'; g.fillRect(0, 0, 512, 48);
    for (let i = 0; i < 900; i++) { g.fillStyle = rr() < 0.5 ? '#c4c0b9' : '#ecebe7'; g.fillRect(Math.floor(rr() * 512), Math.floor(rr() * 48), 2, 1); }
    // ends: black fringe edge + red/white/green bands (no badge, no lettering)
    for (const x0 of [6, 482]) { const d = x0 < 100 ? 1 : -1; g.fillStyle = '#111'; g.fillRect(x0 - 6, 0, 6, 48);
      g.fillStyle = '#c8141e'; g.fillRect(x0 + (d > 0 ? 8 : -14), 0, 4, 48); g.fillStyle = '#ffffff'; g.fillRect(x0 + (d > 0 ? 12 : -18), 0, 3, 48);
      g.fillStyle = '#1f8a4c'; g.fillRect(x0 + (d > 0 ? 15 : -22), 0, 4, 48); }
    // gothic ornament band: fine border with a diamond chain, then fleur-de-lis, quatrefoils, crosses pattée and trefoil arches
    const INK = '#141414', KNIT = '#e6e3dd';
    g.fillStyle = INK; g.fillRect(34, 3, 444, 2); g.fillRect(34, 43, 444, 2);
    for (let x = 40; x < 474; x += 8) for (const y of [8, 40]) { g.beginPath(); g.moveTo(x, y - 2); g.lineTo(x + 2, y); g.lineTo(x, y + 2); g.lineTo(x - 2, y); g.closePath(); g.fill(); }
    const at = (x, y, rot, fn) => { g.save(); g.translate(x, y); g.rotate(rot); fn(); g.restore(); };
    const quatrefoil = r => { g.fillStyle = INK; for (const [dx, dy] of [[r * 0.5, 0], [-r * 0.5, 0], [0, r * 0.5], [0, -r * 0.5]]) { g.beginPath(); g.arc(dx, dy, r * 0.5 + 1.6, 0, 7); g.fill(); }
      g.fillStyle = KNIT; for (const [dx, dy] of [[r * 0.5, 0], [-r * 0.5, 0], [0, r * 0.5], [0, -r * 0.5]]) { g.beginPath(); g.arc(dx, dy, r * 0.5, 0, 7); g.fill(); }
      g.fillStyle = INK; g.beginPath(); g.moveTo(0, -r * 0.42); g.lineTo(r * 0.16, 0); g.lineTo(0, r * 0.42); g.lineTo(-r * 0.16, 0); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-r * 0.42, 0); g.lineTo(0, r * 0.16); g.lineTo(r * 0.42, 0); g.lineTo(0, -r * 0.16); g.closePath(); g.fill(); };
    const cross = s2 => { g.fillStyle = INK; for (let k = 0; k < 4; k++) { g.save(); g.rotate(k * PI / 2); g.beginPath(); g.moveTo(-s2 * 0.1, 0); g.lineTo(-s2 * 0.42, -s2);
      g.quadraticCurveTo(0, -s2 * 0.8, s2 * 0.42, -s2); g.lineTo(s2 * 0.1, 0); g.closePath(); g.fill(); g.restore(); }
      g.fillStyle = KNIT; g.beginPath(); g.arc(0, 0, s2 * 0.13, 0, 7); g.fill(); };
    const fleur = s2 => { g.fillStyle = INK; g.beginPath(); g.moveTo(0, -s2); g.bezierCurveTo(s2 * 0.34, -s2 * 0.6, s2 * 0.24, -s2 * 0.1, 0, s2 * 0.12); g.bezierCurveTo(-s2 * 0.24, -s2 * 0.1, -s2 * 0.34, -s2 * 0.6, 0, -s2); g.fill();
      for (const d of [1, -1]) { g.beginPath(); g.moveTo(d * s2 * 0.1, s2 * 0.02); g.bezierCurveTo(d * s2 * 0.5, -s2 * 0.75, d * s2 * 1.0, -s2 * 0.25, d * s2 * 0.62, s2 * 0.08);
        g.bezierCurveTo(d * s2 * 0.7, -s2 * 0.25, d * s2 * 0.45, -s2 * 0.35, d * s2 * 0.22, s2 * 0.1); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(d * s2 * 0.06, s2 * 0.3); g.quadraticCurveTo(d * s2 * 0.35, s2 * 0.45, d * s2 * 0.3, s2 * 0.78); g.lineTo(d * s2 * 0.12, s2 * 0.5); g.closePath(); g.fill(); }
      g.fillRect(-s2 * 0.42, s2 * 0.12, s2 * 0.84, s2 * 0.16); };
    const arch = s2 => { g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-s2 * 0.45, s2 * 0.9); g.lineTo(-s2 * 0.45, 0); g.quadraticCurveTo(-s2 * 0.45, -s2 * 0.75, 0, -s2);
      g.quadraticCurveTo(s2 * 0.45, -s2 * 0.75, s2 * 0.45, 0); g.lineTo(s2 * 0.45, s2 * 0.9); g.stroke();
      g.lineWidth = 1.6; for (const [dx, dy] of [[0, -s2 * 0.38], [-s2 * 0.17, -s2 * 0.08], [s2 * 0.17, -s2 * 0.08]]) { g.beginPath(); g.arc(dx, dy, s2 * 0.16, 0, 7); g.stroke(); }
      g.fillStyle = INK; g.fillRect(-s2 * 0.04, s2 * 0.15, s2 * 0.08, s2 * 0.7); };
    const ROW = [['fleur', -PI / 2], ['quat', 0], ['cross', 0], ['arch', 0], ['quat', 0], ['cross', PI / 4], ['quat', 0], ['arch', PI], ['cross', 0], ['quat', 0], ['fleur', PI / 2]];
    ROW.forEach(([kind, rot], i) => { const x = 58 + i * 39.6, y = 24;
      at(x, y, rot, () => ({ quat: () => quatrefoil(13), cross: () => cross(12), fleur: () => fleur(13), arch: () => arch(13) })[kind]());
      if (i < ROW.length - 1) { g.fillStyle = INK; g.beginPath(); g.moveTo(x + 19.8, 20); g.lineTo(x + 22.3, 24); g.lineTo(x + 19.8, 28); g.lineTo(x + 17.3, 24); g.closePath(); g.fill(); } });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();
  const N = 48, SW = 0.12;
  const sGeo = new THREE.BufferGeometry(), sPos = new Float32Array((N + 1) * 2 * 3), sUv = new Float32Array((N + 1) * 2 * 2), sIdx = [];
  for (let i = 0; i <= N; i++) { sUv[i * 4] = i / N; sUv[i * 4 + 1] = 1; sUv[i * 4 + 2] = i / N; sUv[i * 4 + 3] = 0;
    if (i < N) { const a = i * 2; sIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('uv', new THREE.BufferAttribute(sUv, 2)); sGeo.setIndex(sIdx);
  const scarf = new THREE.Mesh(sGeo, psx(new THREE.MeshLambertMaterial({ map: scarfTex, side: THREE.DoubleSide, flatShading: true }))); scene.add(scarf);
  const fringe = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(SW, 0.035), psx(new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide }))); scene.add(m); return m; });
  const camZ = V3(0, 0, 1), tmp = V3();
  function layScarf(pts) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), sp = curve.getSpacedPoints(N);
    for (let i = 0; i <= N; i++) { const tan = curve.getTangentAt(i / N), side = tmp.copy(tan).cross(camZ).normalize().multiplyScalar(SW / 2);
      sPos.set([sp[i].x - side.x, sp[i].y - side.y, sp[i].z - side.z], i * 6); sPos.set([sp[i].x + side.x, sp[i].y + side.y, sp[i].z + side.z], i * 6 + 3); }
    sGeo.attributes.position.needsUpdate = true; sGeo.computeVertexNormals();
    fringe[0].position.copy(sp[0]).add(V3(0, -0.015, 0)); fringe[1].position.copy(sp[N]).add(V3(0, -0.015, 0));
  }
  console.log(`[scene] his model: ${tris} triangles + scarf ${N * 2}`);

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

  // hand targets: low in front → over the head → the photo
  const LOW = { R: V3(-0.14, 1.12, 0.2), L: V3(0.14, 1.12, 0.2) }, HIGH = { R: V3(-0.27, 2.02, 0.06), L: V3(0.27, 2.02, 0.06) };
  const k3 = (t, a, b, c) => { const u = E.inOutCubic(range(t, 1.2, 2.4)), w = E.inOutCubic(range(t, 2.4, 3.4)); return a.clone().lerp(b, u).lerp(c, w); };
  return {
    update(t) {
      const lift = E.inOutCubic(range(t, 1.2, 2.4)), down = E.inOutCubic(range(t, 2.4, 3.4));
      // body + head
      body.rotation.x = -0.06 * lift * (1 - down) + Math.sin(t * 2.2) * 0.006; body.updateMatrixWorld(true);
      headJ.rotation.set(lerp(lerp(0.42, -0.32, lift), -0.03, down) + (t > 4.2 ? -0.04 * E.outBack(range(t, 4.2, 4.6)) : 0), 0, (t > 3.4 ? Math.sin((t - 3.4) * 1.1) * 0.025 : 0));
      // arms
      const sw = t > 3.4 ? Math.sin(t * 2.4) * 0.006 : 0;
      const hR = solve(arms.R, k3(t, LOW.R, HIGH.R, HAND_FINAL.R).add(V3(0, sw, 0)), POLE.R);
      const hL = solve(arms.L, k3(t, LOW.L, HIGH.L, HAND_FINAL.L).add(V3(0, -sw, 0)), POLE.L);
      // scarf: short end hangs from his right hand, long end from his left; the middle sags in front → spans over the head → lies behind the neck
      const sway = Math.sin(t * 2.6) * 0.03 * (t > 3.2 ? 1 : 0.4), sway2 = Math.sin(t * 2.1 + 1) * 0.04 * (t > 3.2 ? 1 : 0.4);
      const midLow = [V3(-0.07, 0.98, 0.26), V3(0, 0.95, 0.27), V3(0.07, 0.98, 0.26)];
      const midHigh = [V3(-0.12, 2.05, 0.04), V3(0, 2.06, 0.03), V3(0.12, 2.05, 0.04)];
      const midNeck = [P([420, 1060], -0.07), P([722, 1000], -0.12), P([1050, 960], -0.07)];
      const mid = midLow.map((p, i) => p.clone().lerp(midHigh[i], lift).lerp(midNeck[i], down));
      const pts = [hR.clone().add(V3(sway, -0.27, 0.02)), hR.clone().add(V3(sway * 0.4, -0.13, 0.03)), hR.clone().add(V3(0, 0, 0.02)), ...mid,
        hL.clone().add(V3(0, 0, 0.02)), hL.clone().add(V3(-0.03 + sway2 * 0.3, -0.25, 0.03)), hL.clone().add(V3(-0.04 + sway2, -0.6, 0.04))];
      layScarf(pts);
      // camera: frames the photo, slow push-in
      const push = E.inOutCubic(range(t, 3.2, 6));
      const half = lerp(0.66, 0.58, push), dist = half / hTan;
      camera.position.set(wiggle(t, 0.3, 1) * 0.006, lerp(1.13, 1.2, push), dist);
      camera.lookAt(0, camera.position.y - 0.02, 0); camera.updateMatrixWorld();
    },
    render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
  };
}
