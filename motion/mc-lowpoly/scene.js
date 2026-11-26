// BRIEF — 10 s low-poly explainer with the new PS1-style MC (lowpoly-mc.js), made to the six-step recipe:
//   low poly + flat shading · 64-px code-painted textures · 270×480 render, nearest-neighbour upscale ·
//   vertex snapping + ordered dither · slice it open and label one part · a new pose on every sentence.
// Backyard: grass, plank fence, two cone trees, pixel clouds. A chunky "website" block stands next to him;
// he karate-chops it in half, the halves swing open and the cross-section shows design / code / server,
// with one label: "szybki kod".
//
// POLISH TEXT (checked):
//   Dobra strona to nie tylko wygląd. (A good website isn't just looks.)
//   Zajrzyjmy do środka. (Let's look inside.)
//   W środku: szybki kod. (Inside: fast code.)   label: szybki kod
//   Zrobię taką dla Ciebie. (I'll make one like that for you.)
//   elvladislavo.com
// BEATS (s) — one sentence = one pose
//   0.0–2.2  push-in · S1 pointing at the block
//   2.2–4.2  S2 chop raised → 2.85 chop → block splits 2.9–3.5
//   4.2–6.6  S3 leaning in, index finger up; the label draws in at 4.4
//   6.6–8.3  S4 hand on heart, other palm open to camera
//   8.3–10   S5 hands on hips, little hop; elvladislavo.com
//
// Render (pixel-exact): render.mjs motion/mc-lowpoly/scene.js --width 270 --height 480 --out raw.mp4
//   then ffmpeg -i raw.mp4 -vf scale=1080:1920:flags=neighbor -c:v libx264 -crf 16 -pix_fmt yuv420p mc-lowpoly-vertical.mp4
import { ease, key, range, wiggle } from '/lib/motion.js';
import { buildLowPolyMC, PSX, psx, tex64, px, speckle } from '/assets/lowpoly-mc.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
const T_END = 10;
export const meta = { duration: T_END, fps: 30, background: '#8fb8ff' };

const SENT = [
  { t0: 0.25, t1: 2.2, text: 'Dobra strona to nie tylko wygląd.' },
  { t0: 2.2, t1: 4.2, text: 'Zajrzyjmy do środka.' },
  { t0: 4.2, t1: 6.6, text: 'W środku: szybki kod.' },
  { t0: 6.6, t1: 8.3, text: 'Zrobię taką dla Ciebie.' },
  { t0: 8.3, t1: 10.5, text: null },
];
const T_CHOP = 2.85, T_SPLIT = 2.92, T_LABEL = 4.45, T_URL = 8.4;

/* poses — one per sentence (P0 is the opening idle) */
const P = [
  { shoulderL: [0, 0, 0.12], shoulderR: [0, 0, -0.12], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0] },
  // S1: points at the block (on his right = screen left), other hand on hip
  { torso: [0, -0.25, 0], head: [0, -0.35, 0.05], shoulderR: [-1.35, 0.3, -0.55], elbowR: [-0.1, 0, 0], shoulderL: [0.15, 0, 0.55], elbowL: [-1.7, 0, 0],
    hipR: [0, 0, -0.08], hipL: [0, 0, 0.12] },
  // S2: karate chop raised high, weight back, wide stance
  { torso: [-0.05, -0.45, 0.05], head: [0.05, -0.5, 0], shoulderR: [-2.7, 0, -0.35], elbowR: [-0.6, 0, 0], shoulderL: [-0.9, 0, 0.6], elbowL: [-1.2, 0, 0],
    hipL: [0.1, 0, 0.28], hipR: [-0.1, 0, -0.28], kneeL: [0.25, 0, 0], kneeR: [0.25, 0, 0], drop: -0.06 },
  // S3: leaning toward the cut, index finger up like a teacher
  { torso: [0.18, -0.35, 0.08], head: [0.05, -0.3, 0.12], shoulderL: [-0.4, 0, 0.35], elbowL: [-1.9, 0, 0], shoulderR: [-0.9, 0.25, -0.45], elbowR: [-0.2, 0, 0],
    hipR: [-0.25, 0, -0.05], kneeR: [0.4, 0, 0], drop: -0.04 },
  // S4: hand on heart, other palm open toward the viewer
  { torso: [0, 0.1, 0], head: [-0.05, 0.12, -0.08], shoulderL: [-0.75, 0, -0.35], elbowL: [-1.95, 0, 0], shoulderR: [-1.05, 0, -0.75], elbowR: [-0.25, 0, 0],
    hipL: [0, 0, 0.08], hipR: [0.1, 0, -0.1], kneeR: [0.15, 0, 0] },
  // S5: hands on hips, chest out
  { torso: [-0.06, 0, 0], head: [-0.1, 0, 0.06], shoulderL: [0.25, 0, 0.75], elbowL: [-1.75, 0, 0], shoulderR: [0.25, 0, -0.75], elbowR: [-1.75, 0, 0],
    hipL: [0, 0, 0.14], hipR: [0, 0, -0.14] },
];
// chop strike (overrides S2 right arm briefly)
const CHOP = { torso: [0.25, -0.15, -0.05], head: [0.2, -0.4, 0], shoulderR: [-1.0, 0, -0.45], elbowR: [-0.15, 0, 0], shoulderL: [-0.4, 0, 0.7], elbowL: [-1.0, 0, 0],
  hipL: [0.1, 0, 0.28], hipR: [-0.1, 0, -0.28], kneeL: [0.35, 0, 0], kneeR: [0.35, 0, 0], drop: -0.1 };
const JN = ['hips', 'torso', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];
const mix = (A, B, k) => { const o = {}; for (const j of JN) { const a = A[j] || [0, 0, 0], b = B[j] || [0, 0, 0]; o[j] = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
  o.drop = lerp(A.drop || 0, B.drop || 0, k); return o; };

export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  let seed = 4; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  renderer.toneMapping = THREE.NoToneMapping;
  PSX.snap.value.set(width / 2, height / 2);
  camera.fov = 50; camera.near = 0.1; camera.far = 60; camera.updateProjectionMatrix();
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const tagFont = new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`), titleFont = new FontFace('Title', `url(${asset('Fruktur.ttf')})`);
  await Promise.all([tagFont.load(), titleFont.load()]); document.fonts.add(tagFont); document.fonts.add(titleFont);

  const lam = t => psx(new THREE.MeshLambertMaterial({ map: t, flatShading: true }));
  const add = (geo, mat, p, rot, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

  /* ── sky, light ── */
  scene.background = tex64(g => { for (let y = 0; y < 64; y++) { const k = y / 63; px(g, `rgb(${Math.round(lerp(104, 196, k))},${Math.round(lerp(150, 214, k))},${Math.round(lerp(240, 255, k))})`, 0, y, 64, 1); } });
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x6a8a4a, 1.4));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2); sun.position.set(3, 6, 5); sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -1, near: 1, far: 20 }); sun.shadow.bias = -0.002; scene.add(sun);

  /* ── backyard: grass, plank fence, cone trees, pixel clouds ── */
  const grassT = tex64(g => speckle(g, '#5fa33a', ['#4c8a2c', '#78bd48', '#3f7a25', '#8fcd55'], 700)); grassT.wrapS = grassT.wrapT = THREE.RepeatWrapping; grassT.repeat.set(8, 8);
  add(new THREE.PlaneGeometry(16, 16), lam(grassT), [0, 0, -2], [-PI / 2, 0, 0]).castShadow = false;
  const plankT = tex64(g => { speckle(g, '#9b6a3e', ['#87592f', '#ad7a4a'], 260); for (let x = 0; x < 64; x += 16) px(g, '#5c3a1c', x, 0, 2, 64); px(g, '#5c3a1c', 0, 10, 64, 2); px(g, '#5c3a1c', 0, 50, 64, 2); });
  plankT.wrapS = THREE.RepeatWrapping; plankT.repeat.set(4, 1);
  add(new THREE.BoxGeometry(10, 1.3, 0.08), lam(plankT), [0, 0.65, -2.4]);
  const leafT = tex64(g => speckle(g, '#2f7d3a', ['#246a2e', '#3f9447', '#1b5524'], 500)), barkT = tex64(g => speckle(g, '#6b4423', ['#563519', '#7d5530'], 200));
  for (const [x, z, s] of [[-1.9, -3.4, 1.15], [1.7, -3.9, 1.4], [3.2, -3.2, 0.9]]) {
    add(new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 0.6 * s, 5), lam(barkT), [x, 0.3 * s, z]);
    add(new THREE.ConeGeometry(0.55 * s, 1.3 * s, 6), lam(leafT), [x, 1.15 * s, z]);
    add(new THREE.ConeGeometry(0.42 * s, 1.0 * s, 6), lam(leafT), [x, 1.75 * s, z]);
  }
  const cloudT = tex64(g => speckle(g, '#ffffff', ['#e6eefc', '#f4f8ff'], 120)), clouds = [];
  for (const [x, y, z] of [[-1.6, 3.6, -6], [1.4, 4.2, -7], [3.4, 3.4, -6.5]]) {
    const c = new THREE.Group(); scene.add(c); c.position.set(x, y, z); clouds.push({ c, x });
    for (const [dx, dy, w] of [[0, 0, 1.1], [0.45, 0.2, 0.7], [-0.4, 0.12, 0.6]]) { const m = add(new THREE.BoxGeometry(w, 0.32, 0.3), lam(cloudT), [dx, dy, 0], null, c); m.castShadow = false; }
  }

  /* ── the "website" block, cut down the middle: front = a tiny web page, inner faces = cross-section ── */
  const BW = 0.8, BH = 1.0, BD = 0.42, BX = -0.52;
  const pageT = tex64(g => { px(g, '#ffffff', 0, 0, 64, 64); px(g, '#d9dde6', 0, 0, 64, 7);
    px(g, '#ff5f57', 3, 2, 3, 3); px(g, '#febc2e', 8, 2, 3, 3); px(g, '#28c840', 13, 2, 3, 3); px(g, '#ffffff', 20, 2, 40, 3);
    px(g, '#3b2f8c', 0, 7, 64, 8); px(g, '#ffffff', 4, 10, 18, 2); px(g, '#ffd84a', 50, 10, 10, 2);
    px(g, '#ff8a3d', 4, 19, 56, 18); px(g, '#ffd27a', 10, 26, 14, 8); px(g, '#2f6fe0', 34, 23, 20, 12);
    for (let i = 0; i < 4; i++) px(g, '#9aa1ad', 4, 41 + i * 4, 56 - (i % 2) * 14, 2);
    px(g, '#22a35a', 4, 56, 22, 5); px(g, '#ffffff', 8, 58, 14, 1); });
  const pageL = pageT.clone(); pageL.repeat.set(0.5, 1); pageL.needsUpdate = true;
  const pageR = pageT.clone(); pageR.repeat.set(0.5, 1); pageR.offset.set(0.5, 0); pageR.needsUpdate = true;
  const cutT = tex64(g => {
    speckle(g, '#ff8fb8', ['#ff6fa0', '#ffb0cc'], 80, 0, 0, 64, 16);                         // design layer
    for (let i = 0; i < 4; i++) px(g, ['#ff5c8a', '#ffd84a', '#2f6fe0', '#22a35a'][i], 6 + i * 14, 5, 8, 6);
    px(g, '#0f2a1a', 0, 16, 64, 30);                                                           // code layer
    for (let r = 0; r < 7; r++) { let x = 4 + (r % 3) * 4; while (x < 58) { const w = 3 + Math.floor(rnd() * 9);
      px(g, ['#62ff8e', '#ffd84a', '#7cc7ff', '#ff7ab8', '#e8f0ea'][Math.floor(rnd() * 5)], x, 19 + r * 4, Math.min(w, 60 - x), 2); x += w + 2; } }
    px(g, '#555c68', 0, 46, 64, 18);                                                           // server layer
    for (let r = 0; r < 3; r++) { px(g, '#3a3f49', 2, 48 + r * 5, 60, 4); px(g, '#62ff8e', 52, 49 + r * 5, 2, 2); px(g, '#ffd84a', 56, 49 + r * 5, 2, 2); }
    px(g, '#14141a', 0, 15, 64, 1); px(g, '#14141a', 0, 45, 64, 1); });
  const frameT = tex64(g => { speckle(g, '#3b2f5c', ['#2f2550', '#47396c'], 120); });
  const mf = lam(frameT), mc = lam(cutT);
  const block = new THREE.Group(); block.position.set(BX, 0, -0.1); scene.add(block);
  const halfL = new THREE.Group(), halfR = new THREE.Group(); block.add(halfL, halfR);
  add(new THREE.BoxGeometry(BW / 2, BH, BD), [mc, mf, mf, mf, lam(pageL), mf], [-BW / 4, BH / 2 + 0.06, 0], null, halfL);
  add(new THREE.BoxGeometry(BW / 2, BH, BD), [mf, mc, mf, mf, lam(pageR), mf], [BW / 4, BH / 2 + 0.06, 0], null, halfR);
  add(new THREE.BoxGeometry(BW + 0.1, 0.06, BD + 0.1), lam(frameT), [0, 0.03, 0], null, block);
  // chop flash: a few chunky pixel shards
  const shardM = new THREE.MeshBasicMaterial({ color: 0xffffff }), shards = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), shardM); scene.add(m); shards.push({ m, a: rnd() * PI * 2, v: 0.6 + rnd() * 0.6, y: 0.4 + rnd() * 0.6 }); }

  /* ── the MC ── */
  const mc0 = buildLowPolyMC(); scene.add(mc0.root);
  mc0.root.position.set(0.42, 0, 0.15); mc0.root.rotation.y = -0.32;
  console.log(`[scene] low-poly MC: ${mc0.triangles} triangles`);

  /* ── text at screen-pixel size (canvases sized to the 270×480 frame, nearest-filtered) ── */
  const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), hTan = vTan * width / height;
  const pxTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  const sprite = (tex, wpx, hpx, order = 10) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    s.renderOrder = order; s.userData = { wpx, hpx }; scene.add(s); return s; };
  const S = Math.max(1, Math.round(width / 270));            // text scale if rendered larger than 270 wide
  function caption(text) {
    const w = Math.round(width * 0.92), h = 30 * S;
    return sprite(pxTex(w, h, (g) => { let fs = 15 * S; g.font = `${fs}px Tag`; while (g.measureText(text).width > w - 18 * S) { fs--; g.font = `${fs}px Tag`; }
      const tw = g.measureText(text).width + 16 * S, x0 = Math.round((w - tw) / 2);
      g.fillStyle = '#14121c'; g.fillRect(x0, 2 * S, tw, h - 4 * S); g.fillStyle = '#14121c'; g.fillRect(x0 + 2 * S, 0, tw - 4 * S, h);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + S); }), w, h);
  }
  const caps = SENT.map(s => s.text && caption(s.text));
  const label = sprite(pxTex(84 * S, 22 * S, (g, w, h) => { g.fillStyle = '#14121c'; g.fillRect(0, 0, w, h); g.fillStyle = '#62ff8e'; g.fillRect(2 * S, 2 * S, w - 4 * S, h - 4 * S);
    g.fillStyle = '#0f2a1a'; g.font = `${12 * S}px Tag`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('szybki kod', w / 2, h / 2 + S); }), 84 * S, 22 * S, 12);
  const url = sprite(pxTex(Math.round(width * 0.9), 44 * S, (g, w, h) => { let fs = 34 * S; g.font = `${fs}px Title`; while (g.measureText('elvladislavo.com').width > w - 10 * S) { fs--; g.font = `${fs}px Title`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 5 * S; g.strokeStyle = '#000'; g.strokeText('elvladislavo.com', w / 2, h / 2);
    g.fillStyle = '#fff'; g.fillText('elvladislavo.com', w / 2, h / 2); }), Math.round(width * 0.9), 44 * S, 12);
  const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(), V3()]), new THREE.LineBasicMaterial({ color: 0x14121c, depthTest: false }));
  leader.renderOrder = 11; scene.add(leader);
  const dot = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.035), new THREE.MeshBasicMaterial({ color: 0x62ff8e, depthTest: false })); dot.renderOrder = 11; scene.add(dot);
  const hudR = V3(), hudU = V3(), hudF = V3();
  function hud(s, nx, ny) {                                   // place at an NDC position, sized 1 screen px = 1 texel
    camera.matrixWorld.extractBasis(hudR, hudU, hudF);
    s.position.copy(camera.position).addScaledVector(hudF, -1).addScaledVector(hudR, nx * hTan).addScaledVector(hudU, ny * vTan);
    s.scale.set(s.userData.wpx / width * 2 * hTan, s.userData.hpx / height * 2 * vTan, 1);
  }

  /* ── post: render at the target size into a nearest RT, then quantise + 4×4 Bayer dither ── */
  const rt = new THREE.WebGLRenderTarget(width, height, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, samples: 0 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, levels: { value: 7.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float levels; varying vec2 vUv;
      const float B[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0)); float d = (B[p.x + p.y * 4] + 0.5) / 16.0 - 0.5;
        c = floor(c * levels + 0.5 + d) / levels; gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
    depthTest: false, depthWrite: false })));

  const camLook = V3();
  return {
    update(t) {
      /* camera: quick push-in, then a slow drift; nudge on the chop */
      const k = E.outCubic(range(t, 0, 1.2));
      const shake = Math.max(0, 1 - (t - T_CHOP) / 0.35) * (t > T_CHOP ? 1 : 0);
      camera.position.set(lerp(-0.4, -0.08, k) + wiggle(t, 0.3, 1) * 0.02 + Math.sin(t * 60) * 0.03 * shake, lerp(1.6, 1.22, k), lerp(5.2, 3.95, k) - range(t, 1.2, T_END) * 0.25);
      camLook.set(-0.08, 0.95, 0); camera.lookAt(camLook); camera.updateMatrixWorld();
      clouds.forEach(({ c, x }, i) => c.position.x = x + t * 0.08 * (i % 2 ? 1 : 0.6));

      /* pose: snap to the sentence's pose (0.22 s, overshoot), chop inside sentence 2 */
      let i = 0; while (i < SENT.length - 1 && t >= SENT[i + 1].t0) i++;
      const cur = t < SENT[0].t0 ? 0 : i + 1, prev = cur === 0 ? 0 : cur - 1, sStart = cur === 0 ? 0 : SENT[cur - 1].t0;
      const kk = Math.min(1.08, E.outBack(range(t, sStart, sStart + 0.24)));
      let pose = mix(P[prev], P[cur], kk);
      if (cur === 2) pose = mix(pose, CHOP, E.outCubic(range(t, T_CHOP - 0.08, T_CHOP + 0.04)) * (1 - E.inOutCubic(range(t, 3.55, 3.95))));
      const breath = Math.sin(t * 2.4) * 0.012;
      pose.torso[0] += breath; pose.head[0] -= breath * 0.6;
      const hop = cur === 5 ? Math.max(0, Math.sin((t - 8.3) * PI * 2.2)) * 0.05 * (1 - range(t, 9.2, 9.6)) : 0;
      mc0.setPose(pose); mc0.root.position.y = hop + Math.max(0, Math.sin(range(t, sStart, sStart + 0.24) * PI)) * 0.03;
      // talking: mouth flaps while the sentence is being said
      const s = SENT[Math.min(i, SENT.length - 1)];
      mc0.talk(t > s.t0 + 0.05 && t < s.t0 + Math.min(1.5, (s.t1 - s.t0) * 0.75) && Math.sin(t * 42) > -0.2 && s.text);

      /* the cut: halves part and swing open like a book */
      const o = E.outBack(range(t, T_SPLIT, T_SPLIT + 0.6));
      halfL.position.x = -0.2 * o; halfR.position.x = 0.2 * o;
      halfL.rotation.y = -0.75 * o; halfR.rotation.y = 0.75 * o;
      halfL.position.z = halfR.position.z = 0.08 * o;
      shards.forEach((sd, j) => { const p = range(t, T_CHOP, T_CHOP + 0.5); sd.m.visible = p > 0 && p < 1;
        sd.m.position.set(BX + Math.cos(sd.a) * sd.v * p * 0.6, sd.y + Math.sin(sd.a) * sd.v * p * 0.5 - p * p * 0.3, 0.15); });

      /* label on the code layer of the left half's cut face */
      const tip = halfL.localToWorld(V3(0, 0.06 + BH * 0.52, 0)).add(V3(0, 0, 0));
      const la = range(t, T_LABEL, T_LABEL + 0.3) * (1 - range(t, 6.45, 6.6));
      const lpos = V3(BX - 0.15, 1.55, 0.35);
      leader.geometry.setFromPoints([tip, tip.clone().lerp(lpos, E.outCubic(range(t, T_LABEL, T_LABEL + 0.25)))]); leader.visible = la > 0;
      dot.position.copy(tip); dot.visible = la > 0;
      label.position.copy(lpos); label.material.opacity = range(t, T_LABEL + 0.15, T_LABEL + 0.3) * (1 - range(t, 6.45, 6.6));
      label.scale.set(label.userData.wpx / height * 2 * vTan * lpos.distanceTo(camera.position), label.userData.hpx / height * 2 * vTan * lpos.distanceTo(camera.position), 1);

      /* captions: one per sentence, top of frame; url at the end */
      caps.forEach((c, j) => { if (!c) return; const s2 = SENT[j];
        c.material.opacity = (t >= s2.t0 && t < s2.t1 - 0.05) ? 1 : 0; hud(c, 0, 0.8 - (t < s2.t0 + 0.12 ? 0.03 : 0)); });
      url.material.opacity = t > T_URL ? 1 : 0; hud(url, 0, -0.78 + (t < T_URL + 0.12 ? -0.03 : 0));
    },
    render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
  };
}
