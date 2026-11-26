// BRIEF — the meowing ginger kitten (screen recording, 9.5 s) remade like kitten-dream-lowpoly: scan → models → animate.
// 1. SCAN (scan/scan.py → tex/*.png + scan-data.json): every frame of the clip at 30 fps is measured for how open the
//    mouth is (pink tongue / dark throat pixels below the nose); the most closed, a half-open and the widest-open frames
//    give three 64-px face crops; the closed frame also gives the hoodie (fleece, teddy-bear patch, drawstrings) and the
//    blanket behind.
// 2. MODELS: a jittered (fluffy) low-poly head, the fleece hood ring and the hoodie body, all placed at their spots in
//    the frame (frame width = 2 world units) with the crops projected from the front; < 300 triangles in total.
// 3. ANIMATE: the jaw follows the measured mouth curve frame by frame (face texture closed → half → wide), the head
//    tips up and stretches a touch on every meow, the body breathes, handheld drift + slow push-in; original audio.
import { ease, range, wiggle } from '/lib/motion.js';
import { PSX, psx, tex64, speckle } from '/assets/lowpoly-mc.js';

const PI = Math.PI, E = ease;
export const meta = { duration: 9.45, fps: 30, background: '#1a1416' };
const FW = 778, FH = 1408, S = 2 / FW, X = px => (px - FW / 2) * S, Y = py => (FH - py) * S;

export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  renderer.toneMapping = THREE.NoToneMapping;
  PSX.snap.value.set(width / 2, height / 2);
  camera.fov = 50; camera.near = 0.05; camera.far = 30; camera.updateProjectionMatrix();
  const tanV = Math.tan(THREE.MathUtils.degToRad(25)), DIST = 1 / (tanV * width / height), CY = Y(FH / 2);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const DATA = await (await fetch(asset('scan-data.json'))).json();

  const loader = new THREE.TextureLoader(), T = {};
  for (const k of ['faceClosed', 'faceHalf', 'faceWide', 'hoodie', 'blanket']) {
    const t = await loader.loadAsync(asset(`tex/${k}.png`)); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; T[k] = t; }
  const lam = t => psx(new THREE.MeshLambertMaterial({ map: t, flatShading: true }));

  scene.background = new THREE.Color(0x1a1416);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xeef3f8, 3.4));
  const key1 = new THREE.DirectionalLight(0xfff8f0, 1.2); key1.position.set(-1, 3, 4); scene.add(key1);

  // jittered icosahedron = faceted fluff
  let sd = 9; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const fluffy = (detail, amt) => { const g = new THREE.IcosahedronGeometry(1, detail), pa = g.attributes.position, mem = new Map();
    for (let i = 0; i < pa.count; i++) { const k = `${pa.getX(i).toFixed(3)},${pa.getY(i).toFixed(3)},${pa.getZ(i).toFixed(3)}`;
      if (!mem.has(k)) mem.set(k, 1 + (rnd() - 0.35) * amt); const f = mem.get(k); pa.setXYZ(i, pa.getX(i) * f, pa.getY(i) * f, pa.getZ(i) * f); }
    g.computeVertexNormals(); return g; };
  // front projection of a frame crop (pixels of the 778×1408 frame) onto a mesh, baked at rest
  const project = (m, crop) => { m.updateMatrixWorld(true); const [x0, y0, x1, y1] = DATA.crops[crop], g = m.geometry, pa = g.attributes.position, uv = new Float32Array(pa.count * 2), v = V3();
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); const px = v.x / S + FW / 2, py = FH - v.y / S;
      uv[i * 2] = Math.min(1, Math.max(0, (px - x0) / (x1 - x0))); uv[i * 2 + 1] = Math.min(1, Math.max(0, 1 - (py - y0) / (y1 - y0))); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return m; };

  /* blanket behind (top of the frame) */
  { const b = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), psx(new THREE.MeshBasicMaterial({ map: T.blanket }))); b.position.set(0, Y(65) + 0.05, -0.9); scene.add(b); }

  /* hoodie body with the teddy-bear patch and drawstrings (projected from the frame) */
  const body = new THREE.Mesh(fluffy(1, 0.08), lam(T.hoodie)); body.position.set(X(389), Y(1230), -0.35); body.scale.set(1.35, 0.75, 0.55); scene.add(body); project(body, 'hoodie');
  /* fleece hood ring around the face */
  const fleece = tex64(g => speckle(g, '#b8d1e8', ['#a9c3dc', '#c9def0', '#9bb6d0', '#d6e7f5'], 600));
  { const bg = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.3), lam(fleece)); bg.position.set(0, Y(800), -0.7); scene.add(bg); }   // fleece filling in behind
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.2, 4, 10, PI * 1.45), lam(fleece));
  hood.position.set(X(370), Y(520), -0.32); hood.rotation.z = -PI * 0.62; hood.scale.set(1.0, 1.12, 0.7); scene.add(hood);

  /* the head: big fluffy shell, face crop projected, three mouth states */
  const headJ = new THREE.Group(); headJ.position.set(X(370), Y(880), 0); scene.add(headJ);
  const head = new THREE.Mesh(fluffy(1, 0.12), null); head.scale.set(360 * S, 440 * S, 300 * S); head.rotation.z = -0.14;
  head.position.set(X(360) - headJ.position.x, Y(500) - headJ.position.y, 0); headJ.add(head); scene.updateMatrixWorld(true); project(head, 'face');
  const FACE = { closed: lam(T.faceClosed), half: lam(T.faceHalf), wide: lam(T.faceWide) }; head.material = FACE.closed;
  let tris = 0; for (const m of [body, hood, head]) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
  console.log(`[scene] meow kitten: ${tris} triangles`);

  /* post: 270×480 nearest target → quantise + Bayer dither */
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

  const mouthAt = t => { const f = t * DATA.fps, i = Math.min(DATA.mouth.length - 2, Math.max(0, Math.floor(f))), k = Math.min(1, Math.max(0, f - i));
    return DATA.mouth[i] * (1 - k) + DATA.mouth[i + 1] * k; };
  return {
    update(t) {
      const m = mouthAt(t);
      head.material = m < 0.28 ? FACE.closed : m < 0.66 ? FACE.half : FACE.wide;
      headJ.rotation.set(-0.12 * m + Math.sin(t * 1.7) * 0.02, Math.sin(t * 0.9) * 0.04, Math.sin(t * 1.2) * 0.03);
      headJ.scale.set(1 - 0.02 * m, 1 + 0.04 * m, 1);
      headJ.position.y = Y(880) + Math.sin(t * 2.3) * 0.008;
      body.scale.y = 0.75 * (1 + Math.sin(t * 2.3) * 0.012);
      const push = E.inOutCubic(range(t, 0, 9.45));
      camera.position.set(wiggle(t, 0.5, 1) * 0.025, CY + wiggle(t, 0.45, 2) * 0.02, DIST * (1 - 0.06 * push));
      camera.lookAt(wiggle(t, 0.3, 3) * 0.01, CY, 0); camera.updateMatrixWorld();
    },
    render() {
      renderer.setRenderTarget(rt); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    },
  };
}
