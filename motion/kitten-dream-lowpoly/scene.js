// BRIEF — the "thinking kitten" photo, scanned and rebuilt as a low-poly animation.
// 1. SCAN (scan/scan1-3.py → scan-data.js + five 64-px crops): outlines of the bubbles and the cloud traced from the
//    photo's black ink, kitten silhouettes and proportions, eye/nose/ear/paw/tail positions, fur palette,
//    and 64×64 texture crops of each kitten's face and body taken straight from the photo.
// 2. MODELS: every part sits at its measured photo position (1 photo px = 2/1010 world units, floor at the paws);
//    jittered low-poly shells (flat shaded) for fluff, < 300 triangles per kitten; the photo crops are projected
//    onto the parts from the front, so in the photo pose the model lines up with the picture.
// 3. ANIMATE (8 s, recipe: 270×480 render, nearest upscale, vertex snapping, ordered dither):
//   0–1.1    tabby looks around, paw down, tail sway
//   1.1–1.7  paw up to the chin, head up to the right → exactly the photo pose
//   1.8/2.1  small and medium bubbles pop (scanned circles) · 2.4–2.9 the scanned cloud puffs in
//   2.9–3.4  the cream kitten with the pink bow pops in with sparkles
//   3.4–6.2  she blinks and tilts her head (4.6); tabby blinks, ears perk (4.9), pixel hearts from 5.0
//   6.2–8    hold, gentle float
// Render: render.mjs motion/kitten-dream-lowpoly/scene.js --width 270 --height 480 --out frames/
//   ffmpeg -framerate 30 -i frames/f%05d.png -vf scale=1080:1920:flags=neighbor -c:v libx264 -crf 14 -pix_fmt yuv420p kitten-dream-lowpoly-vertical.mp4
import { ease, range, wiggle } from '/lib/motion.js';
import { PSX, psx } from '/assets/lowpoly-mc.js';
import { SCAN } from '/assets/scan-data.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
export const meta = { duration: 8, fps: 30, background: '#ffffff' };
const S = 2 / SCAN.photo[0];                                     // world units per photo pixel
const X = px => (px - SCAN.photo[0] / 2) * S, Y = py => (SCAN.floorPy - py) * S;

export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  renderer.toneMapping = THREE.NoToneMapping;
  PSX.snap.value.set(width / 2, height / 2);
  // camera framed so the photo plane (z = 0) fills the frame width exactly
  camera.fov = 50; camera.near = 0.05; camera.far = 40; camera.updateProjectionMatrix();
  const tanV = Math.tan(THREE.MathUtils.degToRad(25)), DIST = 1 / (tanV * width / height), CY = Y(SCAN.photo[1] / 2);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  scene.background = new THREE.Color(0xffffff);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf2eee8, 2.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.25); sun.position.set(-1.0, 3.0, 5); sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
  Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1, near: 0.5, far: 12 }); sun.shadow.bias = -0.002; scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.12 })); floor.rotation.x = -PI / 2; floor.receiveShadow = true; scene.add(floor);

  /* ── scanned 64-px photo textures ── */
  const loader = new THREE.TextureLoader();
  const T = {};
  for (const k of ['tabbyFace', 'tabbyBody', 'tabbyTail', 'creamFace', 'creamBody']) {
    const t = await loader.loadAsync(asset(k + '.png')); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; T[k] = t; }
  const lam = t => psx(new THREE.MeshLambertMaterial({ map: t, flatShading: true }));
  const flat = c => psx(new THREE.MeshLambertMaterial({ color: c, flatShading: true }));

  // jittered icosahedron: faceted fluff (shared corners move together)
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const fluffy = (detail, amt) => { const g = new THREE.IcosahedronGeometry(1, detail), pa = g.attributes.position, mem = new Map();
    for (let i = 0; i < pa.count; i++) { const k = `${pa.getX(i).toFixed(3)},${pa.getY(i).toFixed(3)},${pa.getZ(i).toFixed(3)}`;
      if (!mem.has(k)) mem.set(k, 1 + (rnd() - 0.35) * amt); const f = mem.get(k); pa.setXYZ(i, pa.getX(i) * f, pa.getY(i) * f, pa.getZ(i) * f); }
    g.computeVertexNormals(); return g; };
  // front projection of a photo crop onto a mesh (in world space, at the photo pose)
  function project(mesh, crop) {
    mesh.updateMatrixWorld(true); const g = mesh.geometry, pa = g.attributes.position, uv = new Float32Array(pa.count * 2), v = V3();
    const [x0, y0, x1, y1] = SCAN.crops[crop];
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mesh.matrixWorld);
      const px = v.x / S + SCAN.photo[0] / 2, py = SCAN.floorPy - v.y / S;
      uv[i * 2] = Math.min(1, Math.max(0, (px - x0) / (x1 - x0))); uv[i * 2 + 1] = Math.min(1, Math.max(0, 1 - (py - y0) / (y1 - y0))); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return mesh;
  }
  const put = (geo, mat, p, rot, scl) => { const m = new THREE.Mesh(geo, mat); m.position.copy(p); if (rot) m.rotation.set(...rot); if (scl) m.scale.set(...scl);
    m.castShadow = true; scene.add(m); return m; };
  const pivotAt = p => { const g = new THREE.Group(); g.position.copy(p); scene.add(g); return g; };

  function buildKitten(K, face, body, tail, opts) {
    const z0 = 0;
    const [hx, hy, hw, hh] = K.head, [bx, by, bw, bh] = K.body;
    const headC = V3(X(hx), Y(hy), z0), rx = hw * S * 0.9, ry = hh * S, rz = rx * 0.85;
    const bodyC = V3(X(bx), Y(by), z0 - 0.04);
    const onHead = (px, py, lift = 0) => { const dx = X(px) - headC.x, dy = Y(py) - headC.y;
      return V3(X(px), Y(py), headC.z + rz * Math.sqrt(Math.max(0.05, 1 - (dx / rx) ** 2 - (dy / ry) ** 2)) + lift); };
    const mFace = lam(T[face]), mBody = lam(T[body]), mTail = lam(T[tail]);
    const H = {};
    H.body = project(put(fluffy(1, 0.2), mBody, bodyC, null, [bw * S, bh * S, bw * S * 0.8]), body);
    H.head = project(put(fluffy(1, 0.14), mFace, headC, null, [rx, ry, rz]), face);
    H.ears = [K.earL, K.earR].map(([ex, ey]) => { const tip = V3(X(ex), Y(ey), headC.z - 0.02), dir = tip.clone().sub(headC).normalize();
      const base = headC.clone().add(dir.clone().multiplyScalar(Math.min(rx, ry) * 0.85));
      const m = put(new THREE.ConeGeometry(0.075, tip.distanceTo(base) * 1.25, 4), mFace, base.clone().lerp(tip, 0.55), [0, PI / 4, -Math.atan2(dir.x, dir.y)], [1, 1, 0.6]);
      return project(m, face); });
    H.eyes = K.eyes.map(([ex, ey, er]) => put(new THREE.OctahedronGeometry(er * S * 1.05, 0), flat(0x18161c), onHead(ex, ey, -0.01), null, [1, 1.05, 0.45]));
    H.nose = put(new THREE.OctahedronGeometry(0.018, 0), flat(opts.nose), onHead(K.nose[0], K.nose[1], 0.012), null, [1.3, 0.8, 1]);
    H.muzzle = project(put(new THREE.OctahedronGeometry(0.075, 0), mFace, onHead(K.muzzle[0], K.muzzle[1], -0.035), [0, PI / 4, 0], [1.3, 0.75, 0.8]), face);
    const shine = new THREE.Points(new THREE.BufferGeometry().setFromPoints(H.eyes.map(e => e.position.clone().add(V3(0.012, 0.014, 0.02)))),
      new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false })); scene.add(shine); H.shine = shine;
    H.paws = K.paws.map(([px, py]) => project(put(new THREE.OctahedronGeometry(0.075, 0), mBody, V3(X(px), Y(py) + 0.05, z0 + 0.2), null, [1.15, 0.7, 1.2]), body));
    { const [[ax, ay], [bx2, by2]] = K.tail, a = V3(X(ax), Y(ay), z0 - 0.15), b = V3(X(bx2), Y(by2), z0 - 0.05), L = a.distanceTo(b);
      const m = put(new THREE.CylinderGeometry(0.028, 0.045, L, 3, 1), mTail, a.clone().lerp(b, 0.5), [0, 0, -Math.atan2(b.x - a.x, b.y - a.y)]); H.tail = project(m, tail); H.tailBase = a; }
    if (K.pawUp) { const [[sx, sy], [tx, ty]] = K.pawUp, a = V3(X(sx), Y(sy), z0 + 0.16), b = V3(X(tx), Y(ty), z0 + 0.2);
      const m = put(new THREE.BoxGeometry(0.15, a.distanceTo(b), 0.13), mBody, a.clone().lerp(b, 0.5), [0, 0, -Math.atan2(b.x - a.x, b.y - a.y)]); H.pawUp = project(m, body); H.shoulder = a; }
    if (K.legDown) { const [[sx, sy], [tx, ty]] = K.legDown, a = V3(X(sx), Y(sy), z0 + 0.14), b = V3(X(tx), Y(ty), z0 + 0.14);
      H.leg = project(put(new THREE.BoxGeometry(0.13, a.distanceTo(b), 0.12), mBody, a.clone().lerp(b, 0.5)), body); }
    if (opts.bow) { const bp = onHead(K.bow[0], K.bow[1], 0.04), pink = flat(0xf3c3cf); H.bow = [];
      for (const sx of [1, -1]) H.bow.push(put(new THREE.ConeGeometry(0.032, 0.05, 3), pink, bp.clone().add(V3(sx * 0.028, 0, 0)), [0, 0, sx * PI / 2]));
      H.bow.push(put(new THREE.OctahedronGeometry(0.014, 0), flat(0xe592aa), bp)); }
    // rig: re-parent the parts under pivots without moving them (UVs are already baked at the photo pose)
    const root = pivotAt(V3(bodyC.x, bodyC.y - bh * S, 0)), J = { root, baseY: bodyC.y - bh * S };
    const neck = V3(headC.x + (bodyC.x - headC.x) * 0.4, headC.y - ry * 0.9, z0);
    J.head = new THREE.Group(); J.head.position.copy(neck); root.attach(J.head);
    for (const m of [H.body, ...H.paws, H.leg].filter(Boolean)) root.attach(m);
    for (const m of [H.head, ...H.eyes, H.nose, H.muzzle, H.shine, ...(H.bow || [])]) J.head.attach(m);
    J.ears = H.ears.map(m => { const g = new THREE.Group(); g.position.copy(m.position); J.head.attach(g); g.attach(m); return g; });
    J.tail = new THREE.Group(); J.tail.position.copy(H.tailBase); root.attach(J.tail); J.tail.attach(H.tail);
    if (H.pawUp) { J.paw = new THREE.Group(); J.paw.position.copy(H.shoulder); root.attach(J.paw); J.paw.attach(H.pawUp); }
    let tris = 0; root.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    return { root, J, eyes: H.eyes, shine: H.shine, tris, furColor: opts.fur };
  }
  const tabby = buildKitten(SCAN.tabby, 'tabbyFace', 'tabbyBody', 'tabbyTail', { nose: 0xc9a39f, fur: 0x8a7c74 });
  const cream = buildKitten(SCAN.cream, 'creamFace', 'creamBody', 'creamBody', { nose: 0xc89a92, fur: 0xc8bbaf, bow: true });
  cream.root.traverse(o => { o.castShadow = false; });
  console.log(`[scene] scanned models: tabby ${tabby.tris} tris · cream ${cream.tris} tris`);

  /* ── scanned bubbles and cloud (black outline behind white fill) ── */
  const ink = psx(new THREE.MeshBasicMaterial({ color: 0x111111 })), paper = psx(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const ring = ([cx, cy, r], z) => { const g = new THREE.Group(); g.position.set(X(cx), Y(cy), z); scene.add(g);
    const o = new THREE.Mesh(new THREE.CircleGeometry(r * S, 14), ink); o.position.z = -0.003; g.add(o);
    g.add(new THREE.Mesh(new THREE.CircleGeometry((r - 7) * S, 14), paper)); return g; };
  const small = ring(SCAN.cloud.small, 0.05), mid = ring(SCAN.cloud.mid, 0.02);
  const CZ = -0.45, K = (DIST - CZ) / DIST;                    // the cloud sits behind the dream kitten: scale it up so it lines up with the photo
  const [ccx, ccy] = SCAN.cloud.center, cC = V3(X(ccx), Y(ccy), 0);
  const cloud = new THREE.Group(); cloud.position.set(cC.x * K, CY + (cC.y - CY) * K, CZ); scene.add(cloud);
  const shape = pts => { const s = new THREE.Shape(); pts.forEach(([px, py], i) => { const x = (X(px) - cC.x) * K, y = (Y(py) - cC.y) * K; i ? s.lineTo(x, y) : s.moveTo(x, y); }); s.closePath(); return new THREE.ShapeGeometry(s); };
  const cOut = new THREE.Mesh(shape(SCAN.cloud.outer), ink); cOut.position.z = -0.004; cloud.add(cOut);
  cloud.add(new THREE.Mesh(shape(SCAN.cloud.inner.map(([x, y]) => [x - (x - ccx) * 0.012, y - (y - ccy) * 0.012])), paper));
  const inside = new THREE.Mesh(new THREE.CircleGeometry(0.62 * K, 14), psx(new THREE.MeshBasicMaterial({ color: 0xf1efec })));
  inside.position.set((X(775) - cC.x) * K, (Y(330) - cC.y) * K, 0.002); inside.scale.set(1.05, 0.95, 1); inside.visible = false; cloud.add(inside);

  /* ── pixel hearts and sparkles ── */
  const pxSprite = (rows, col) => { const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length; const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') { g.fillStyle = col; g.fillRect(x, y, 1, 1); } else if (ch === 'o') { g.fillStyle = '#111'; g.fillRect(x, y, 1, 1); } }));
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 })); s.renderOrder = 5; scene.add(s); return s; };
  const HEART = ['.oo.oo.', 'o##o##o', 'o#####o', 'o#####o', '.o###o.', '..o#o..', '...o...'];
  const STAR = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'];
  const hearts = Array.from({ length: 6 }, (_, i) => ({ s: pxSprite(HEART, '#ff6f9a'), ph: i / 6, dx: (rnd() - 0.5) * 0.25 }));
  const stars = Array.from({ length: 6 }, (_, i) => ({ s: pxSprite(STAR, '#ffd84a'), a: i / 6 * PI * 2 + 0.4 }));

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

  const blinkAt = (t, list) => list.some(b => t > b && t < b + 0.13);
  const setBlink = (k, on) => { k.eyes.forEach(e => e.material.color.set(on ? k.furColor : 0x18161c)); k.shine.visible = !on; };
  const pop = (t, a, d = 0.35) => Math.max(0.001, E.outBack(range(t, a, a + d), 2.4));
  const cloudHome = cloud.position.clone();

  return {
    update(t) {
      camera.position.set(wiggle(t, 0.3, 1) * 0.008, CY + wiggle(t, 0.25, 2) * 0.006, DIST);
      camera.lookAt(0, CY, 0); camera.updateMatrixWorld();

      /* tabby: looking around with the paw down → paw to chin + head up = the photo pose (all rotations 0) */
      const J = tabby.J, think = E.inOutCubic(range(t, 1.1, 1.7)), off = 1 - think;
      const look = t < 1.1 ? Math.sin(t * 3.2) * 0.3 : 0;
      J.head.rotation.set(0.45 * off + Math.sin(t * 1.6) * 0.02, look * off, -0.3 * off + (t > 4.5 ? Math.sin(t * 2.2) * 0.04 : 0));
      J.paw.rotation.set(0, 0, 2.85 * off); J.paw.scale.set(1, 1 - 0.45 * off, 1);
      const perk = E.outBack(range(t, 4.9, 5.2));
      J.ears.forEach((e, i) => { e.scale.setScalar(1 + 0.15 * perk); e.rotation.z = (i ? 0.08 : -0.08) * perk; });
      J.tail.rotation.set(0, Math.sin(t * (t > 4.9 ? 7 : 2.2)) * (t > 4.9 ? 0.4 : 0.18), 0);
      J.root.position.y = J.baseY + Math.sin(t * 2.6) * 0.004;
      setBlink(tabby, blinkAt(t, [0.6, 3.6, 6.3]));

      /* bubbles + cloud */
      small.scale.setScalar(pop(t, 1.8)); mid.scale.setScalar(pop(t, 2.1));
      const cl = pop(t, 2.4, 0.5); cloud.scale.set(cl * (1 + Math.sin(t * 1.4) * 0.012), cl * (1 + Math.cos(t * 1.3) * 0.012), 1);
      cloud.position.y = cloudHome.y + Math.sin(t * 1.1) * 0.015;

      /* dream kitten */
      const C = cream.J, d = pop(t, 2.95, 0.45);
      C.root.scale.setScalar(d); C.root.visible = t > 2.9; C.root.position.y = C.baseY + Math.sin(t * 1.1) * 0.015;
      const tilt = E.inOutCubic(range(t, 4.6, 5.0)) * (1 - E.inOutCubic(range(t, 6.4, 6.9)));
      C.head.rotation.set(0, Math.sin(t * 0.8) * 0.06, -0.3 * tilt + Math.sin(t * 1.5) * 0.025);
      C.tail.rotation.set(0, Math.sin(t * 1.8) * 0.25, 0);
      setBlink(cream, blinkAt(t, [3.8, 5.6, 7.2]));

      stars.forEach(s => { const k = range(t, 2.95, 3.75), r = 0.3 + 0.4 * E.outCubic(k);
        s.s.position.set(X(780) + Math.cos(s.a) * r, Y(300) + Math.sin(s.a) * r * 0.9, 0.2); s.s.scale.setScalar(0.07 * (1 - k * 0.5)); s.s.material.opacity = k > 0 && k < 1 ? 1 : 0; });
      hearts.forEach((h, i) => { const p = ((t - 5.0) * 0.45 + h.ph) % 1, on = t > 5.0 + h.ph * 0.8;
        h.s.position.set(X(330) + h.dx + Math.sin(t * 3 + i) * 0.03, Y(760) + p * 0.55, 0.3); h.s.scale.setScalar(0.075 + 0.015 * Math.sin(t * 6 + i));
        h.s.material.opacity = on ? Math.min(1, Math.sin(p * PI) * 2) : 0; });
    },
    render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
  };
}
