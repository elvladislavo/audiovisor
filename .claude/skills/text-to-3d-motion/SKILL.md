---
name: text-to-3d-motion
description: Turn a text brief into a rendered 3D animation or motion-design piece (MP4, GIF, PNG stills) by writing a three.js scene in code and rendering it frame-exact with no app or UI. Use when someone describes an animation, title sequence, logo reveal, product spin, kinetic typography, loop, explainer shot or any motion graphic in words and wants a video file, or wants to iterate on such a scene.
---

# Text → 3D motion (three.js, rendered to video)

The pipeline: **brief → shot plan → scene file → stills → full render → review**. Scenes are plain ES modules; `scripts/render.mjs` drives headless Chromium frame by frame and pipes to ffmpeg. No app, no UI, no real-time loop.

## 0. One-time setup in the working folder

```bash
npm i three@0.170.0 playwright     # chromium: npx playwright install chromium (skip if preinstalled)
ffmpeg -version                    # required
```

## 1. Write a shot plan from the brief (before code)

Put it as a comment at the top of the scene. Decide, in numbers:
- **Duration, fps, aspect**: default 6 s, 30 fps, 1920×1080. Use 1080×1920 for vertical social and 1080×1080 for square.
- **Beats**: what happens when, e.g. `0.2–1.6 drop · 1.4–3.2 type in · 3.2–6 hold`. Overlap beats by about 0.2 s so the motion carries through.
- **Hero and read**: the one thing the viewer must see. It should get the most screen space and contrast.
- **Camera**: one move per shot. Choose push-in, orbit, crane, track or locked.
- **Look**: background colour, key light colour and direction, and material types (matte, glossy, metal, toon).
- **End state**: a hold of at least 1 s on the final composition, or a seamless loop.

If the brief is vague, pick sensible defaults and say what you chose. Don't stop to ask unless the subject itself is unclear.

## 2. Scene file contract

```js
import { ease, key, range, spring, stagger, wiggle, loop } from '/lib/motion.js';
// addons: import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export const meta = { duration: 6, fps: 30, background: '#101418' };

export async function setup({ THREE, renderer, scene, camera, width, height, meta, asset }) {
  // build everything here (await font/model loads here, never in update)
  return {
    update(t) { /* set every animated property as a pure function of t (seconds) */ },
    // camera: otherCamera,     // optional: render through a different camera
    // render(t) { ... },       // optional: custom render (post-processing composer)
  };
}
```

Rules that make renders correct:
- **Everything is a function of `t`.** Never use `Date.now`, `Clock`, `requestAnimationFrame`, incremental `+=`, or `Math.random()` inside `update`. Random layouts get a seeded PRNG in `setup`. This keeps frames reproducible, so you can render any frame alone (`--still`) or any range.
- If you need physics or simulation, precompute it in `setup` into arrays and look values up by `t`.
- Assets that sit next to the scene file load from `asset('model.glb')`. three.js examples (fonts, models, HDRs) load from `/three/examples/...`, e.g. `/three/examples/fonts/helvetiker_bold.typeface.json`.
- The renderer is already set up with ACES tone mapping and PCF soft shadows. Set `castShadow` and `receiveShadow` yourself.
- For loading glTF characters and playing their clips, see `threejs-model-animation`. To drive a clip deterministically: `mixer.setTime(t)` in `update`.

## 3. Motion toolkit (`lib/motion.js`)

| Helper | Use |
|---|---|
| `range(t, a, b)` | 0→1 progress inside a beat |
| `ease.outCubic/outExpo/outBack/inOutCubic/outBounce/outElastic` | shape that progress |
| `key(t, [[0, 0], [0.8, 1, ease.outBack], [2, 1]])` | keyframes for numbers or arrays (position, colour) |
| `stagger(t, i, { start, gap, dur, e })` | per-item cascades (letters, tiles, particles) |
| `spring(t, t0, { stiffness, damping })` | natural overshoot-and-settle, from a closed-form formula |
| `wiggle(t, freq, seed)` | smooth noise for handheld camera and floating objects |
| `loop(t, period)` | 0→1 phase for seamless loops |

## 4. Motion design defaults (what makes it look designed)

- **Ease everything.** Use `outCubic`/`outExpo` for things entering, `inCubic` for things leaving, and `inOutCubic` for camera moves. Linear only for constant spin and conveyor motion.
- **Timing:** small UI-like moves take 0.3–0.5 s, hero moves 0.8–1.4 s, and camera moves span the whole shot. Stagger gaps of 0.05–0.12 s.
- **Overshoot sells weight.** Use `outBack` or `spring` for arrivals, squash and stretch on impacts (keep volume roughly constant: x·y·z ≈ 1), and anticipation before big moves (a 0.1–0.2 s dip the opposite way).
- **Overlap and follow-through.** Secondary parts should lag the primary by 0.05–0.15 s.
- **One focal point per beat.** Lead the eye with motion, contrast and light, not more objects.
- **Camera:** pick a slow push-in for drama, an orbit for products, or a locked camera for typography. Add a 0.02–0.05 unit `wiggle` to make it feel alive. A focal length around 35–50° FOV avoids distortion.
- **Light:** use a warm key light, a cool rim light from behind, and a low fill. Fog the same colour as the background hides the horizon. `RoomEnvironment` via PMREM gives instant reflections.
- **Palette:** a dark or neutral ground, one hero colour, and at most two accents.
- **Endings:** hold the final frame for at least 1 s. For loops, make `t = duration` identical to `t = 0` (use `loop()` and periodic functions).

More recipes in `references/recipes.md`: kinetic type, logo reveal, product turntable, isometric explainer, particle burst, seamless loop, character shots.

## 5. Render

Run from the folder that has `node_modules` (or the scene's folder):

```bash
R=.claude/skills/text-to-3d-motion/scripts/render.mjs
node $R scene.js --still 2.5 --width 960 --height 540          # one frame → scene@2.5s.png
node $R scene.js --out draft.mp4 --width 960 --height 540       # fast draft
node $R scene.js --out final.mp4                                # 1920×1080, CRF 18, H.264 yuv420p
node $R scene.js --out loop.gif --width 800 --height 800        # GIF (palette-optimised)
node $R scene.js --out frames/                                  # PNG sequence
node $R scene.js --out shot2.mp4 --from 2 --to 4                # a time range
```

Flags: `--fps`, `--duration` (override `meta`), `--crf` (lower means better quality; 18 is the default). Rendering uses SwiftShader (CPU WebGL), which is reliable headless. Expect about 5–10 fps at 960×540. Draft small, and render full size once.

## 6. Review loop (always do this)

1. Render **stills at each beat boundary** first and look at them: framing, readability, lighting, nothing clipped or intersecting.
2. Render a small draft MP4, then make a contact sheet and look at it:
   `ffmpeg -i draft.mp4 -vf "fps=2,scale=320:-1,tile=6x2" -frames:v 1 sheet.png`
3. Check timing against the shot plan, and that motion reads as eased, staggered and settled. Fix and re-render only the range that changed (`--from/--to`).
4. Render the final at full size. Report the output path, duration, resolution, and what each beat does.

Common failures: a black frame means the camera is inside geometry or `lookAt` is missing. Popping between frames means something used wall-clock time or `+=` in `update`. Text that is hard to read needs more contrast or size, or a hold of at least 0.6 s. Shadow acne needs `shadow.bias = -0.0005` and `normalBias = 0.02`.

## Files

- `scripts/render.mjs`, `scripts/harness.html`: the renderer.
- `lib/motion.js`: the easing, keyframe, stagger, spring and noise toolkit.
- `examples/title-drop.js`: a brief turned into a scene (bouncing spheres, then 3D type with a spring stagger, then a push-in).
- `references/recipes.md`: patterns for common motion-design briefs.
