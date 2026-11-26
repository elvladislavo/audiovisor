// BRIEF — the "thinking kitten" photo as a short low-poly animation (same recipe as motion/mc-lowpoly):
//   < 300 triangles per kitten, flat shading · 64-px code-painted textures · 270×480 render, nearest upscale ·
//   PS1 vertex snapping + ordered dither.
// A grey tabby kitten sits on a white seamless backdrop, raises a paw to its chin and looks up; thought bubbles pop
// one by one; in the cloud a fluffy cream kitten with a pink bow appears, blinks and tilts her head; the tabby's ears
// perk, tail swishes, pixel hearts float up. No text (like the photo).
// BEATS (s)
//   0–1.1    tabby looks around, tail sway
//   1.1–1.7  paw to chin, head tips up toward the upper right
//   1.8/2.1  small and medium bubbles pop · 2.4–2.9 the cloud puffs in
//   2.9–3.4  dream kitten pops in with sparkles
//   3.4–6.2  she blinks, tilts her head (4.6), tabby blinks, ears perk (4.9), hearts from 5.0
//   6.2–8    hold: everything floats gently
// Render: render.mjs motion/kitten-dream-lowpoly/scene.js --width 270 --height 480 --out frames/
//   ffmpeg -framerate 30 -i frames/f%05d.png -vf scale=1080:1920:flags=neighbor -c:v libx264 -crf 14 -pix_fmt yuv420p kitten-dream-lowpoly-vertical.mp4
import { ease, range, wiggle } from '/lib/motion.js';
import { PSX, psx, tex64, px, speckle } from '/assets/lowpoly-mc.js';

const PI = Math.PI, E = ease, lerp = (a, b, k) => a + (b - a) * k;
export const meta = { duration: 8, fps: 30, background: '#f3f2ef' };

export async function setup({ THREE, renderer, scene, camera, width, height }) {
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  renderer.toneMapping = THREE.NoToneMapping;
  PSX.snap.value.set(width / 2, height / 2);
  camera.fov = 50; camera.near = 0.05; camera.far = 30; camera.updateProjectionMatrix();
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const lam = t => psx(new THREE.MeshLambertMaterial({ map: t, flatShading: true }));
  const flat = c => psx(new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const basic = c => psx(new THREE.MeshBasicMaterial({ color: c }));
  const add = (geo, mat, parent, p = [0, 0, 0], rot, s) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); if (rot) m.rotation.set(...rot); if (s) m.scale.set(...s);
    m.castShadow = true; parent.add(m); return m; };

  /* ── white seamless studio ── */
  scene.background = new THREE.Color(0xf3f2ef);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e0d8, 2.7));
  const sun = new THREE.DirectionalLight(0xfffaf0, 1.3); sun.position.set(-1.5, 4, 4); sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
  Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 0.5, far: 10 }); sun.shadow.bias = -0.002; scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.18 })); floor.rotation.x = -PI / 2; floor.receiveShadow = true; scene.add(floor);

  /* ── kitten builder (one rig, two coats) — proportions from the photo: big round head, big eyes,
        small rounded ears, small fluffy body; fluff = jittered low-poly shells, flat shaded ── */
  const stripes = (g, col, step, vertical) => { for (let i = 1; i < 64; i += step) for (let j = 0; j < 64; j++) {
    const w = Math.round(Math.sin(j / 5 + i) * 1.5); vertical ? px(g, col, i + w, j, 2, 1) : px(g, col, j, i + w, 1, 2); } };
  const FUR = {
    tabbyHead: tex64(g => { speckle(g, '#a8a19a', ['#b9b3ad', '#918a83', '#c8c3bd'], 300);
      for (let x = 2; x < 64; x += 5) for (let y = 0; y < 24; y++) px(g, '#36312d', x + Math.round(Math.sin(y / 4 + x) * 1), y, 2, 1);   // stripes from the brow over the crown
      for (const y of [38, 43]) for (let x = 0; x < 64; x++) if (x % 16 > 10) px(g, '#36312d', x, y + (x % 3 === 0 ? 1 : 0), 1, 1); }),       // cheek lines
    tabbyBody: tex64(g => { speckle(g, '#a8a19a', ['#b9b3ad', '#918a83', '#c8c3bd'], 300); stripes(g, '#36312d', 6, false); }),
    tabbyLeg: tex64(g => { speckle(g, '#a8a19a', ['#b9b3ad', '#918a83'], 200); stripes(g, '#36312d', 7, false); speckle(g, '#f1eee9', ['#e2ddd6'], 40, 0, 0, 64, 14); }),
    white: tex64(g => speckle(g, '#f1eee9', ['#e2ddd6', '#fbf9f6', '#d4cec6'], 200)),
    cream: tex64(g => speckle(g, '#ddd3c6', ['#e9e2d8', '#cbbfb0', '#f3eee6', '#c0b2a1'], 480)),
    creamLeg: tex64(g => { speckle(g, '#ddd3c6', ['#e9e2d8', '#cbbfb0'], 300); speckle(g, '#efe9e1', ['#e2dbd1'], 60, 0, 0, 64, 14); }),
    creamEar: tex64(g => speckle(g, '#a8957f', ['#97836d', '#b9a892'], 200)),
    tabbyEar: tex64(g => speckle(g, '#5e5650', ['#4a433d', '#746b64'], 200)),
  };
  // jitter an icosahedron's vertices outward (same offset for shared corners) → faceted fluff
  const fluffy = (r, detail, amt, sd) => { const geo = new THREE.IcosahedronGeometry(r, detail), pa = geo.attributes.position, mem = new Map();
    let s2 = sd; const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < pa.count; i++) { const k = `${pa.getX(i).toFixed(4)},${pa.getY(i).toFixed(4)},${pa.getZ(i).toFixed(4)}`;
      if (!mem.has(k)) mem.set(k, 1 + (rr() - 0.3) * amt); const f = mem.get(k); pa.setXYZ(i, pa.getX(i) * f, pa.getY(i) * f, pa.getZ(i) * f); }
    geo.computeVertexNormals(); return geo; };
  function kitten({ head: headT, body: bodyT, leg: legT, ear: earT, belly: bellyT, bow, sd }) {
    const hM = lam(headT), fM = lam(bodyT), lM = lam(legT), eM = lam(earT), bM = lam(bellyT), root = new THREE.Group(), J = {};
    const pivot = (name, parent, p) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); J[name] = g; return g; };
    add(fluffy(0.17, 1, 0.22, sd), fM, root, [0, 0.17, -0.02], null, [0.9, 1.0, 0.92]);                         // fluffy body
    add(fluffy(0.11, 0, 0.18, sd + 1), bM, root, [0, 0.19, 0.08], null, [0.95, 1.15, 0.6]);                       // white chest
    for (const sx of [1, -1]) add(new THREE.OctahedronGeometry(0.1, 0), fM, root, [sx * 0.11, 0.08, -0.01], null, [0.75, 0.8, 1.2]);   // haunches
    for (const [n, sx] of [['legL', 1], ['legR', -1]]) { const l = pivot(n, root, [sx * 0.06, 0.22, 0.09]);
      add(new THREE.BoxGeometry(0.07, 0.22, 0.08), lM, l, [0, -0.105, 0]); }                                    // front legs, white paws at the bottom
    const head = pivot('head', root, [0, 0.33, 0.04]);
    add(fluffy(0.19, 1, 0.1, sd + 2), hM, head, [0, 0.14, 0], null, [1.12, 0.96, 0.95]);                       // big round fluffy head
    for (const [n, sx] of [['earL', 1], ['earR', -1]]) { const e = pivot(n, head, [sx * 0.125, 0.28, -0.01]);
      add(new THREE.ConeGeometry(0.068, 0.095, 4), eM, e, [0, 0.03, 0], [0, PI / 4, -sx * 0.55], [1, 1, 0.7]); }  // small, rounded, set wide
    add(new THREE.OctahedronGeometry(0.062, 0), bM, head, [0, 0.07, 0.165], [0, PI / 4, 0], [1.35, 0.85, 0.75]);                   // white muzzle + chin
    add(new THREE.OctahedronGeometry(0.016, 0), flat(0xe3a3a6), head, [0, 0.1, 0.21], null, [1.2, 0.8, 1]);       // pink nose
    const eyes = [];
    for (const sx of [1, -1]) eyes.push(add(new THREE.OctahedronGeometry(0.043, 0), flat(0x1b2333), head, [sx * 0.078, 0.15, 0.16], null, [1, 1.1, 0.5]));
    const shine = new THREE.Points(new THREE.BufferGeometry().setFromPoints([V3(0.09, 0.172, 0.185), V3(-0.066, 0.172, 0.185)]),
      new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false })); head.add(shine);
    const tail = pivot('tail', root, [0, 0.05, -0.16]);
    add(new THREE.CylinderGeometry(0.024, 0.036, 0.28, 3, 1), fM, tail, [0, 0.14, 0]);
    tail.rotation.set(-1.3, 0, 0.6);
    if (bow) { const b = pivot('bow', head, [0.1, 0.3, 0.06]); b.rotation.z = -0.4; const pink = flat(0xf6c4d2);
      for (const sx of [1, -1]) add(new THREE.ConeGeometry(0.028, 0.045, 3), pink, b, [sx * 0.025, 0, 0], [0, 0, sx * PI / 2]);
      add(new THREE.OctahedronGeometry(0.013, 0), flat(0xeb97b0), b); }
    let tris = 0; root.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    return { root, J, eyes, tris };
  }
  const tabby = kitten({ head: FUR.tabbyHead, body: FUR.tabbyBody, leg: FUR.tabbyLeg, ear: FUR.tabbyEar, belly: FUR.white, sd: 5 });
  tabby.root.position.set(-0.3, 0, 0.55); tabby.root.rotation.y = 0.35; tabby.root.scale.setScalar(1.25); scene.add(tabby.root);
  const dream = kitten({ head: FUR.cream, body: FUR.cream, leg: FUR.creamLeg, ear: FUR.creamEar, belly: FUR.white, bow: true, sd: 11 });
  scene.add(dream.root); dream.root.traverse(o => { o.castShadow = false; });
  console.log(`[scene] tabby ${tabby.tris} tris · dream kitten ${dream.tris} tris`);

  /* ── thought bubbles: low-segment discs, black outline behind white ── */
  const ink = basic(0x111111), paper = basic(0xffffff);
  const disc = (parent, x, y, r, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    const o = new THREE.Mesh(new THREE.CircleGeometry(r + 0.018, 12), ink); o.position.z = -0.004; g.add(o);
    g.add(new THREE.Mesh(new THREE.CircleGeometry(r, 12), paper)); return g; };
  const small = disc(scene, -0.12, 0.98, 0.055, 0.2), mid = disc(scene, 0.02, 1.17, 0.085, 0.1);
  const cloud = new THREE.Group(); cloud.position.set(0.34, 1.72, -0.45); scene.add(cloud);
  const PUFFS = [[0, 0, 0.42], [-0.36, 0.12, 0.28], [0.36, 0.14, 0.3], [-0.2, 0.38, 0.27], [0.18, 0.4, 0.3], [-0.34, -0.22, 0.26], [0.34, -0.2, 0.28], [0, -0.36, 0.3]];
  for (const [x, y, r] of PUFFS) { const o = new THREE.Mesh(new THREE.CircleGeometry(r + 0.022, 12), ink); o.position.set(x, y, -0.004); cloud.add(o); }
  for (const [x, y, r] of PUFFS) { const w = new THREE.Mesh(new THREE.CircleGeometry(r, 12), paper); w.position.set(x, y, 0); cloud.add(w); }
  const cloudShade = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), basic(0xf3f1ee)); cloudShade.position.set(0, -0.08, 0.002); cloudShade.scale.set(1.1, 0.95, 1); cloud.add(cloudShade);

  /* ── sprites: pixel hearts and sparkles ── */
  const pxSprite = (rows, col) => { const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length; const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') { g.fillStyle = col; g.fillRect(x, y, 1, 1); } else if (ch === 'o') { g.fillStyle = '#111'; g.fillRect(x, y, 1, 1); } }));
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 })); s.renderOrder = 5; scene.add(s); return s; };
  const HEART = ['.oo.oo.', 'o##o##o', 'o#####o', 'o#####o', '.o###o.', '..o#o..', '...o...'];
  const STAR = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'];
  const hearts = Array.from({ length: 6 }, (_, i) => ({ s: pxSprite(HEART, '#ff6f9a'), ph: i / 6, dx: (rnd() - 0.5) * 0.25 }));
  const stars = Array.from({ length: 6 }, (_, i) => ({ s: pxSprite(STAR, '#ffd84a'), a: i / 6 * PI * 2 + 0.4 }));

  /* ── post: 270×480 nearest render target → quantise + Bayer dither ── */
  const rt = new THREE.WebGLRenderTarget(width, height, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, samples: 0 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, levels: { value: 8.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float levels; varying vec2 vUv;
      const float B[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
        float d = (B[p.x + p.y * 4] + 0.5) / 16.0 - 0.5; c = floor(c * levels + 0.5 + d) / levels; gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
    depthTest: false, depthWrite: false })));

  const blink = (t, times) => times.some(b => t > b && t < b + 0.13) ? 0.12 : 1;
  const pop = (t, a, d = 0.35) => Math.max(0.001, E.outBack(range(t, a, a + d), 2.4));

  return {
    update(t) {
      /* camera: locked, tiny handheld drift */
      camera.position.set(0.05 + wiggle(t, 0.3, 1) * 0.01, 1.15 + wiggle(t, 0.25, 2) * 0.008, 3.25);
      camera.lookAt(0.05, 1.12, 0); camera.updateMatrixWorld();

      /* tabby: look around → paw to chin, head up to the cloud; ears perk, tail swish */
      const J = tabby.J, think = E.inOutCubic(range(t, 1.1, 1.7));
      const look = t < 1.1 ? Math.sin(t * 3.2) * 0.35 * (1 - range(t, 0.8, 1.1)) : 0;
      J.head.rotation.set(lerp(0.05, -0.55, think) + Math.sin(t * 1.6) * 0.03, lerp(look, -0.35, think), lerp(0, 0.18, think) + (t > 4.5 ? Math.sin(t * 2.2) * 0.06 : 0));
      J.legL.rotation.set(lerp(0, -2.1, think), lerp(0, -0.45, think), lerp(0, -0.4, think));       // its left paw up under the chin (screen right, as in the photo)
      J.legL.position.y = 0.22 + 0.03 * think;
      const perk = E.outBack(range(t, 4.9, 5.2));
      J.earL.rotation.set(-0.15 * perk, 0, -0.12 * perk); J.earR.rotation.set(-0.15 * perk, 0, 0.12 * perk);
      J.earL.scale.setScalar(1 + 0.12 * perk); J.earR.scale.setScalar(1 + 0.12 * perk);
      J.tail.rotation.set(-1.25, 0, 0.6 + Math.sin(t * (t > 4.9 ? 7 : 2.2)) * (t > 4.9 ? 0.35 : 0.15));
      tabby.root.position.y = Math.sin(t * 2.6) * 0.004;
      const tb = blink(t, [0.6, 3.6, 6.3]); tabby.eyes.forEach(e => e.scale.y = 1.15 * tb);

      /* bubbles */
      small.scale.setScalar(pop(t, 1.8)); mid.scale.setScalar(pop(t, 2.1));
      const cl = pop(t, 2.4, 0.5); cloud.scale.set(cl * (1 + Math.sin(t * 1.4) * 0.015), cl * (1 + Math.cos(t * 1.3) * 0.015), 1);
      cloud.position.y = 1.72 + Math.sin(t * 1.1) * 0.02;
      small.position.y = 0.98 + Math.sin(t * 1.7) * 0.012; mid.position.y = 1.17 + Math.sin(t * 1.5 + 1) * 0.015;

      /* dream kitten inside the cloud */
      const d = pop(t, 2.95, 0.45) * 0.9;
      dream.root.scale.setScalar(d); dream.root.visible = t > 2.9;
      dream.root.position.set(0.34, 1.3 + Math.sin(t * 1.1) * 0.02, -0.3); dream.root.rotation.y = -0.12 + Math.sin(t * 0.8) * 0.06;
      const tilt = E.inOutCubic(range(t, 4.6, 5.0)) * (1 - E.inOutCubic(range(t, 6.4, 6.9)));
      dream.J.head.rotation.set(0.05, 0.05, -0.32 * tilt + Math.sin(t * 1.5) * 0.03);
      dream.J.tail.rotation.set(-1.25, 0, -0.6 + Math.sin(t * 1.8) * 0.2);
      const db = blink(t, [3.8, 5.6, 7.2]); dream.eyes.forEach(e => e.scale.y = 1.15 * db);
      dream.J.bow.rotation.z = -0.35 + Math.sin(t * 3) * 0.06;

      /* sparkles when she appears, hearts from the tabby */
      stars.forEach((s, i) => { const k = range(t, 2.95, 3.75); const r = 0.25 + 0.35 * E.outCubic(k);
        s.s.position.set(0.34 + Math.cos(s.a) * r, 1.6 + Math.sin(s.a) * r * 0.9, -0.2); s.s.scale.setScalar(0.065 * (1 - k * 0.5));
        s.s.material.opacity = k > 0 && k < 1 ? 1 : 0; });
      hearts.forEach((h, i) => { const p = ((t - 5.0) * 0.45 + h.ph) % 1, on = t > 5.0 + h.ph * 0.8;
        h.s.position.set(-0.22 + h.dx + Math.sin(t * 3 + i) * 0.03, 0.95 + p * 0.55, 0.7); h.s.scale.setScalar(0.07 + 0.015 * Math.sin(t * 6 + i));
        h.s.material.opacity = on ? Math.min(1, Math.sin(p * PI) * 2) : 0; });
    },
    render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
  };
}
