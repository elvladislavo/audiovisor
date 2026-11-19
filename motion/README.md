# elvladislavo motion kit — handoff

Code-only 3D motion videos (three.js r0.170, rendered headless to MP4). No app, no UI.
Repo: `elvladislavo/audiovisor`, branch `claude/3d-model-animation-skills-xt88ov`.

## 1. Pipeline

| Piece | Path | What it does |
|---|---|---|
| Skill | `.claude/skills/text-to-3d-motion/SKILL.md` | Brief → shot plan → scene → stills → render → review |
| Renderer | `.claude/skills/text-to-3d-motion/scripts/render.mjs` (+ `harness.html`) | Headless Chromium (SwiftShader) → frame-exact PNG → ffmpeg H.264 |
| Motion helpers | `.claude/skills/text-to-3d-motion/lib/motion.js` | `ease`, `key`, `range`, `stagger`, `spring`, `wiggle`, `loop` |
| Agents | `.claude/agents/motion-designer.md`, `motion-critic.md` | Make / review videos |
| Character | `motion/stickman-moto/stickman.js` | **The MC model** (shared; other scenes symlink it) |
| Fonts | `motion/stickman-fight-30/ArchivoBlack.ttf` (tags, has Polish ąćęłńóśźż), `motion/stickman-moto/Fruktur.ttf` (gothic title) | |

Setup: `npm i three@0.170.0 playwright` and `ffmpeg` on PATH.

```bash
R=.claude/skills/text-to-3d-motion/scripts/render.mjs
node $R motion/<scene>/scene.js --still 5.0 --width 270 --height 480 --out still.png   # check frames first
node $R motion/<scene>/scene.js --width 1080 --height 1920 --out video.mp4             # final (vertical)
```
Full-HD vertical renders run at about 0.5–1 s per frame. Run them in the background.

### Scene contract
```js
import { ease, key, range, wiggle } from '/lib/motion.js';
import { buildStickman } from '/assets/stickman.js';         // /assets/ = the scene's own folder (symlink stickman.js + fonts there)
export const meta = { duration: 20, fps: 30, background: '#000' };
export async function setup({ THREE, renderer, scene, camera, width, height, asset }) {
  // build everything; fonts: new FontFace('Tag', `url(${asset('ArchivoBlack.ttf')})`)
  return { update(t) { /* everything is a pure function of t */ }, render() { /* optional composer */ } };
}
```
Rules:
- Scenes must be deterministic: no `Math.random`, no wall-clock time, no accumulating state. Use a seeded PRNG.
- `console.log('[scene] …')` lines print in the terminal.
- For slow motion, remap real time to scene time with a precomputed table (`tauAt(t)`). See the race, fight-30 and moto-v2 scenes.

## 2. The MC model — `buildStickman({ seed })`

A stylized toon stickman (MeshToonMaterial with a 3-step ramp, plus back-face ink outlines), based on the reference photo:
- **Head:** big round head with dot eyes, brows, nose, a small smile, and ears with an inner fold.
- **Hair:** curly auburn-brown, with solid base shells so no scalp shows. A tall top, bangs, side curls behind the ears, and a short mullet at the back.
- **Beard:** short auburn beard plus a two-row moustache, also on solid shells. The mouth stays clear.
- **Upper body:** black blazer worn open with lapels and front panels. Light-blue shirt with collar and cuffs. Red tie with a dark diamond pattern and light dots.
- **Lower body:** black belt with a silver buckle. Black trousers.
- **Stripes:** 3 white side stripes on both the sleeves and the trousers.
- **Shoes:** red snakeskin with square toes.

Coordinates: feet at y = 0, facing +z, height about 2.0 m with the hair. `body` pivots at the centre of mass (y = 1).

Returns `{ system, body, J, M, applyPose, shoe, ramp, outlineMat }`:
- `system`: root object. Set its position (feet) and yaw.
- `body`: rotate for flips and lying down. Lying on the back is `pitch = -π/2` with `system.y = -0.86`.
- `J`: joints `hips spine head shoulderL/R elbowL/R hipL/R kneeL/R`.
- Pose keys: `applyPose(KEYS, t)` with `KEYS = [[time, t => ({ joint: [x,y,z], hipsY })], …]`, blended with smoothstep.
- Joint conventions: hip x < 0 swings the leg forward; knee x > 0 bends it. Shoulder x < 0 raises the arm forward or up. Shoulder z > 0 (left) or z < 0 (right) moves the arm outward. Elbow x < 0 bends the forearm forward.
- Hand position: `J.elbowR.localToWorld(new Vector3(0, -0.3, 0))`.
- Two-bone IK (hands on handlebar grips or any world point): `reach()` / `reachTo()` in `motion/stickman-moto-v2/scene.js` and `motion/stickman-garden/scene.js`.
- Thugs: re-dress the same model by swapping materials. See `makeGoon` in `motion/stickman-fight-30/scene.js`.

Ready-made poses you can copy from the scenes: ride, launch, tuck, flip, fly (belly-down), windmill (GTA lag), splat, guard, jab, cross, hook, block, duck, sweep, uppercut, front kick, roundhouse, flying kick, grab, throw, wave, crouch, hands-on-hips, walk/run cycles.

## 3. House style

- **Vertical 1080×1920.** FOV 55 in portrait, 40 in landscape. Scenes adapt to the render size.
- **Opening:** a camera move onto the character. Either boots → face, or a drone swoop as in the race.
- **Text in Polish, always grammar-checked.** Tags are screen-sized sprites (`fitTag`) kept inside the frame and faded when their target is off-screen. They pop in, then turn grey and crossed out, or green with a ✓.
- **Readability:** every text needs about 1.2 s or more on screen, held by a static or slow camera. Check it with stills before the full render.
- **Ending:** `elvladislavo.com` in Fruktur, either as neon (pink glow) or white with a black outline. Sometimes with a black-and-white or grey grade.
- **Effects:** additive point-sprite fire and sparks, alpha smoke and dust, UnrealBloom at a high threshold (about 0.9+). Watch for overexposure.

## 4. Existing scenes (`motion/…`)

`stickman-wasted-v2` (parachute + GTA lag), `stickman-moto-v2` (desert bike, flip, sunglasses, explosion),
`stickman-fight-30` (6 web-bug thugs, trophy "TWOJA STRONA"), `stickman-race` ("Wyścig z czasem"),
`stickman-garden` ("Ogród bez błędów", calm). Older versions are in `stickman-wasted`, `stickman-moto` and `stickman-fight`. Each folder has its `scene.js` and the rendered `*-vertical.mp4`.

## 5. Prompt to start a new chat

> Repo elvladislavo/audiovisor, branch claude/3d-model-animation-skills-xt88ov. Read motion/README.md and
> .claude/skills/text-to-3d-motion/SKILL.md. Make a new vertical 1080×1920 video with the MC from
> motion/stickman-moto/stickman.js (symlink it plus the fonts into the new scene folder). Story: <…>. Polish on-screen
> text about web design, grammar-checked and held long enough to read; end on elvladislavo.com. Check stills, then render.
