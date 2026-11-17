---
name: threejs-model-animation
description: Load, play, blend and control animated 3D models (glTF/GLB) in plain three.js. Use when writing code that loads a rigged or animated model, plays or crossfades animation clips, builds a character animation state machine, drives bones or morph targets procedurally, or debugs a model that loads but doesn't animate, animates wrong, or leaks memory.
---

# three.js model animation

Plain three.js (no framework). For React Three Fiber see `r3f-model-animation`. For preparing/optimizing the file itself see `gltf-asset-pipeline`.

## 1. Setup (no bundler)

Pin an exact version and use an import map so addons resolve:

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
}}
</script>
<script type="module" src="main.js"></script>
```

With a bundler: `npm i three@0.170.0` and import the same paths.

## 2. Loading

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
const loader = new GLTFLoader()
  .setDRACOLoader(new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/'))
  .setKTX2Loader(new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/basis/').detectSupport(renderer))
  .setMeshoptDecoder(MeshoptDecoder);

const gltf = await loader.loadAsync('model.glb');
scene.add(gltf.scene);
console.table(gltf.animations.map(c => ({ name: c.name, duration: c.duration.toFixed(2), tracks: c.tracks.length })));
```

Only attach the decoders the asset needs, but attaching all three is harmless.

**Multiple instances of a skinned model:** `gltf.scene.clone()` breaks skinning (clones share one skeleton). Use:

```js
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const copy = SkeletonUtils.clone(gltf.scene); // each copy needs its own AnimationMixer
```

## 3. Playing clips

```js
const mixer = new THREE.AnimationMixer(gltf.scene);  // root = the object the track names resolve against
const clip  = THREE.AnimationClip.findByName(gltf.animations, 'Walk');
const walk  = mixer.clipAction(clip);
walk.play();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  mixer.update(clock.getDelta());   // seconds, NOT ms; call exactly once per frame per mixer
  renderer.render(scene, camera);
});
```

Rules that cause most bugs:
- `mixer.update(dt)` must receive **seconds**. Passing rAF timestamps (ms) makes animation run 1000× fast or freeze.
- Create the mixer on the **same root** whose descendants the tracks name. Track `"Hips.quaternion"` resolves by node name under that root.
- Don't call `getDelta()` twice per frame (second call returns ~0). Read it once, share it.
- Clamp huge deltas after tab switches: `const dt = Math.min(clock.getDelta(), 1/20);`

## 4. Transitions and blending

```js
function fadeTo(next, duration = 0.3) {
  if (next === current) return;
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
  current.crossFadeTo(next, duration, true);  // warp=true syncs timescales (walk→run)
  current = next;
}
```

- **One-shots** (jump, attack): `a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;` then listen for `mixer.addEventListener('finished', e => { if (e.action === a) fadeTo(idle); })`.
- **Locomotion blend** (idle/walk/run by speed): play all three, set weights each frame from speed, keep weights summing to 1, and sync phase with `setEffectiveTimeScale` so feet don't slide.
- **Additive layers** (breathing, aiming, head turn on top of locomotion):
  ```js
  THREE.AnimationUtils.makeClipAdditive(clip);           // mutates clip, reference = frame 0
  const layer = mixer.clipAction(clip);
  layer.blendMode = THREE.AdditiveAnimationBlending;     // set before play
  layer.setEffectiveWeight(0.5).play();
  ```
- **Cut a clip** from one long baked take: `THREE.AnimationUtils.subclip(clip, 'Jump', startFrame, endFrame, 30)`.
- **Scrub / timeline control**: `action.paused = true; action.time = t; mixer.update(0);`.

## 5. State machine pattern

Keep it data-driven; don't scatter `crossFadeTo` calls through input handlers.

```js
const states = {
  idle: { clip: 'Idle', loop: true,  next: s => s.speed > 0.1 ? 'walk' : null },
  walk: { clip: 'Walk', loop: true,  next: s => s.speed < 0.1 ? 'idle' : s.speed > 3 ? 'run' : null },
  run:  { clip: 'Run',  loop: true,  next: s => s.speed < 2.5 ? 'walk' : null },
  jump: { clip: 'Jump', loop: false, next: () => null /* exits on 'finished' */ },
};
```

Each frame: evaluate `states[cur].next(input)`, call `fadeTo` on change. Add hysteresis (2.5 vs 3) so it doesn't flicker at thresholds.

## 6. Procedural animation

Apply **after** `mixer.update()` so it overrides/adds to the clip pose for this frame:

```js
const head = model.getObjectByName('Head');        // check exact bone names in the console
mixer.update(dt);
head.rotation.y += THREE.MathUtils.clamp(lookYaw, -0.8, 0.8);
```

- Look-at on a bone: compute target in the bone's **parent** space (`parent.worldToLocal`), not world space.
- Smoothing: `x = THREE.MathUtils.damp(x, target, lambda, dt)` — frame-rate independent, unlike `lerp(x, t, 0.1)`.
- Quaternion smoothing: `bone.quaternion.slerp(targetQ, 1 - Math.exp(-lambda * dt))`.
- IK: `CCDIKSolver` from `three/addons/animation/CCDIKSolver.js` for limbs/tails.

**Morph targets / blend shapes** (facial, lip sync):
```js
const face = model.getObjectByName('Face');
const i = face.morphTargetDictionary['mouthOpen'];
face.morphTargetInfluences[i] = THREE.MathUtils.damp(face.morphTargetInfluences[i], target, 12, dt);
```

**Plain transform animation without a rig** — use your own math in the loop, or build a clip at runtime:
```js
const track = new THREE.VectorKeyframeTrack('.position', [0, 1, 2], [0,0,0, 0,2,0, 0,0,0]);
const bob = new THREE.AnimationClip('bob', 2, [track]);
new THREE.AnimationMixer(mesh).clipAction(bob).play();
```

## 7. Performance

- Many identical animated characters: share clips, one mixer per instance; for crowds (>100) consider baked vertex-animation textures or `InstancedMesh` with per-instance time.
- Skinned meshes are frustum-culled by their bind-pose bounds, so animated limbs can pop out of view. Fix with `mesh.frustumCulled = false` or recompute bounds (`mesh.computeBoundingSphere()` on SkinnedMesh in r15x+).
- Pause off-screen mixers; `renderer.setAnimationLoop(null)` when the tab/section is hidden.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.

## 8. Cleanup (SPAs, hot reload, swapping models)

```js
mixer.stopAllAction();
mixer.uncacheRoot(root);
root.traverse(o => {
  if (o.geometry) o.geometry.dispose();
  if (o.material) [].concat(o.material).forEach(m => {
    for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
    m.dispose();
  });
});
scene.remove(root);
```
Verify with `renderer.info.memory` (geometries/textures should drop back).

## 9. Debugging checklist

| Symptom | Likely cause |
|---|---|
| Model visible, no motion | `mixer.update` not called, dt in ms, or `action.play()` missing |
| Mesh explodes / stretched | Cloned with `.clone()` instead of `SkeletonUtils.clone`; or scale applied to armature but not mesh in DCC |
| Some bones don't move | Track names don't match node names (renamed after export); check `clip.tracks.map(t=>t.name)` vs `root.getObjectByName` |
| Pops at loop seam | First/last keys differ; fix in DCC or `LoopPingPong` |
| Feet slide | Timescale doesn't match root-motion speed; sync `setEffectiveTimeScale(speed / clipSpeed)` |
| Character drifts away | Root motion baked into hips; strip root position track or move the object by its delta |
| Tiny / huge / lying down | Unit or axis mismatch; fix at export (see `gltf-asset-pipeline`) |
| Washed-out colors | Texture colorSpace; base color maps need `SRGBColorSpace` (GLTFLoader does this) |

Helpers: `new THREE.SkeletonHelper(root)` to see bones; `new THREE.AxesHelper(1)` attached to a bone.
