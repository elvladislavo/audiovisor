---
name: r3f-model-animation
description: Animate 3D models in React with React Three Fiber (@react-three/fiber) and drei. Use when a React/Next.js project loads glTF/GLB models with useGLTF, plays clips with useAnimations, drives per-frame motion with useFrame, or generates typed model components with gltfjsx.
---

# React Three Fiber model animation

The three.js concepts (mixer, actions, crossfades, procedural bones) are in `threejs-model-animation`; this skill is the React-idiomatic version.

## Packages

```bash
npm i three @react-three/fiber @react-three/drei
npm i -D @types/three   # TypeScript
```
Match the major versions: `@react-three/fiber@8` ↔ React 18, `@react-three/fiber@9` ↔ React 19.

## Generate a component from the model

```bash
npx gltfjsx public/robot.glb --transform --types --shadows
```
`--transform` also optimizes (draco, resize, dedupe) and writes `robot-transformed.glb`. The generated component gives you named nodes/materials and is the cleanest starting point.

## Load and play

```tsx
import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';

export function Robot({ action = 'Idle', ...props }) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF('/robot.glb');
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const a = actions[action];
    a?.reset().fadeIn(0.3).play();
    return () => { a?.fadeOut(0.3); };   // cleanup fades the old one out → crossfade
  }, [action, actions]);

  return <group ref={group} {...props} dispose={null}><primitive object={scene} /></group>;
}
useGLTF.preload('/robot.glb');
```

- `useAnimations` creates the mixer and calls `mixer.update` for you — don't add your own.
- Changing the `action` prop triggers the effect; the cleanup's `fadeOut` + new `fadeIn` = crossfade.
- Wrap in `<Suspense fallback={...}>`; `useGLTF` suspends while loading.

## Multiple instances

`useGLTF` caches, so two `<Robot/>` share **one** scene object — the second steals it. Clone per instance:

```tsx
import { useMemo } from 'react';
import { useGraph } from '@react-three/fiber';
import { SkeletonUtils } from 'three-stdlib';

const { scene, animations } = useGLTF('/robot.glb');
const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
const { nodes } = useGraph(clone);   // named nodes of THIS instance
```

## Per-frame / procedural motion

```tsx
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';

useFrame((state, delta) => {
  const head = nodes.Head;
  head.rotation.y = MathUtils.damp(head.rotation.y, state.pointer.x * 0.6, 8, delta);
});
```

- Mutate refs in `useFrame`; **never** `setState` per frame (re-renders the tree 60×/s).
- `useFrame` callbacks run after drei's mixer update when registered later — to guarantee override order, pass a priority: `useFrame(cb, 1)` (note: any non-zero priority disables R3F's auto-render; render yourself with `state.gl.render(state.scene, state.camera)` in the highest one).
- Spring-y UI-driven transforms: `@react-spring/three` or `maath/easing` (`easing.damp3(ref.current.position, target, 0.25, delta)`).

## Other drei helpers worth knowing

- `<Center>`, `<Bounds fit>` — frame an arbitrary model.
- `<Environment preset="city" />` — PBR models look flat without an environment map.
- `<ContactShadows />` — cheap grounded shadow.
- `useCursor`, `<Html>` — interaction and labels anchored to bones.
- `<PerformanceMonitor>` + `<AdaptiveDpr>` — scale quality on slow devices.

## Gotchas

- Next.js: put the Canvas in a client component (`'use client'`), and load models from `/public`.
- `frameloop="demand"` stops the loop; animated models need the default `"always"` (or call `invalidate()` each frame).
- Disposal is automatic for JSX-declared objects; `<primitive object>` is **not** disposed by R3F — dispose manually if you swap models (see `threejs-model-animation` §8), or rely on `useGLTF.clear(url)`.
