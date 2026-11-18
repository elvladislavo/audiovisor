# Motion-design recipes (three.js scene snippets)

Each snippet goes inside `update(t)` unless marked `setup`. Helpers come from `/lib/motion.js`.

## Kinetic typography

```js
// setup: one mesh per letter, pivot at baseline centre (see examples/title-drop.js)
letters.forEach((m, i) => {
  const s = spring(t, 0.5 + i * 0.07, { stiffness: 160, damping: 12 });
  m.position.y = (s - 1) * 1.2;                 // rise from below
  m.rotation.x = (1 - s) * -1.5;                // tip up from flat
  m.material.opacity = stagger(t, i, { start: 0.5, gap: 0.07, dur: 0.3 });   // needs transparent: true
});
// exit: reverse with ease.inCubic over 0.4 s, staggered from the other end (i → n-1-i)
```
Variants: per-word stagger instead of per-letter, letters flying in on Z with `ease.outExpo`, and a line of type wiping in behind a moving mask plane (`clippingPlanes` plus `renderer.localClippingEnabled = true`).

## Logo / shape reveal

```js
// setup: SVGLoader → ExtrudeGeometry, or simple shapes. Centre the geometry.
logo.scale.setScalar(key(t, [[0.3, 0.001], [1.1, 1.08, ease.outCubic], [1.4, 1, ease.inOutQuad]]));
logo.rotation.y = key(t, [[0.3, -Math.PI * 0.75], [1.4, 0, ease.outExpo]]);
glint.position.x = key(t, [[1.5, -4], [2.3, 4, ease.inOutCubic]]);     // light sweep across the bevel
```
SVG: `const { paths } = await new SVGLoader().loadAsync(asset('logo.svg'))`, then `SVGLoader.createShapes(path)`, then `new ExtrudeGeometry(shapes, { depth: 20, bevelEnabled: true })`. Flip Y with `scale(1, -1, 1)` and fit it into a unit box.

## Product turntable / hero spin

```js
product.rotation.y = loop(t, meta.duration) * Math.PI * 2;        // seamless loop
camera.position.set(Math.sin(0.3) * 6, 1.6 + wiggle(t, 0.3) * 0.03, Math.cos(0.3) * 6);
camera.lookAt(0, 0.8, 0);
```
Use a seamless floor (a large plane with fog the same colour as the background), a contact shadow (`ShadowMaterial` with opacity 0.3), and a rim light to separate the silhouette from the background.

## Isometric explainer

```js
// setup: orthographic camera
const s = 6, cam = new THREE.OrthographicCamera(-s * aspect, s * aspect, s, -s, 0.1, 100);
cam.position.set(10, 10, 10); cam.lookAt(0, 0, 0);   // return { camera: cam, update }
// tiles pop up in a wave from the centre
tiles.forEach(m => { const d = m.userData.dist; m.scale.y = Math.max(0.001, spring(t, 0.2 + d * 0.06)); });
```
Flat `MeshToonMaterial` or `MeshLambertMaterial`, 3–4 colours, no fog.

## Particle burst / confetti

```js
// setup: seeded PRNG → per-particle velocity v, spin w, colour; one InstancedMesh
const g = -6;
for (let i = 0; i < N; i++) {
  const u = Math.max(0, t - T0);                       // time since burst
  p.set(v[i].x * u, v[i].y * u + 0.5 * g * u * u, v[i].z * u);
  q.setFromEuler(e.set(w[i].x * u, w[i].y * u, 0));
  m.compose(p, q, sc.setScalar(u > 0 ? 1 - range(t, T0 + 1.5, T0 + 2.2) : 0));
  inst.setMatrixAt(i, m);
}
inst.instanceMatrix.needsUpdate = true;
```
Seeded PRNG: `let s = 1; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;`

## Seamless loop

Every animated value must be periodic in `meta.duration`: use `loop(t, D)` and `Math.sin(2π·k·t/D)` with integer `k`. Check it by rendering `--still 0` and `--still <duration>` and comparing; they must be identical.

## Characters and models

- glTF character: load in `setup` with `GLTFLoader`, create `mixer = new THREE.AnimationMixer(gltf.scene)`, `mixer.clipAction(clip).play()`, then in `update(t)` call `mixer.setTime(t * clipSpeed)` (deterministic). For crossfades, set each action's `weight` from `range(t, …)` yourself.
- No model? Build a stylised figure from capsules and spheres on named joint groups and keyframe joint rotations with `key()`. See the `threejs-model-animation` skill for rigs, morph targets and skinned meshes.
- Primitive characters read best with a toon ramp: `MeshToonMaterial({ gradientMap })` with a 3-pixel `DataTexture` and `NearestFilter`.

## Camera moves cheat sheet

| Move | Code |
|---|---|
| Push-in | `z = key(t, [[0, 10], [D, 7, ease.inOutCubic]])` |
| Orbit | `a = key(t, [[0, -0.4], [D, 0.4, ease.inOutCubic]]); pos = (sin a·r, h, cos a·r)` |
| Crane up | `y = key(t, [[0, 0.5], [D, 4, ease.inOutCubic]])`, then look at the subject |
| Whip pan | `rotation.y` change of about 1 rad in 0.25 s with `ease.inOutExpo`, plus motion blur via multiple renders averaged (`render(t)` calls at t ± 1/120) |
| Rack focus | `BokehPass` from `three/addons/postprocessing/` with `focus` keyed over time (set it up in `setup`, return `render`) |

## Post-processing

```js
// setup
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.4, 0.85));
composer.addPass(new OutputPass());
return { update, render: () => composer.render() };
```
Bloom suits emissive accents and neon. Keep strength between 0.3 and 0.8.
