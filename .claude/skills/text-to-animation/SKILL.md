---
name: text-to-animation
description: Turn a plain-text description into a 2D frame-by-frame animation (PNG frames, MP4, GIF, contact sheet, onion skins). Use when the user asks to animate something from text, make a short 2D cartoon/motion clip, a bouncing ball, logo sting, character gag, title animation, or a frame-by-frame sequence.
---

# Text → 2D frame-by-frame animation

Pipeline: **text prompt → storyboard → scene JSON → rendered frames → review → video**.

## 1. Storyboard (think like an animator)
Before writing JSON, write 3–8 beats: what happens, at what second, and why it reads.
Apply the principles that matter at this scale:
- **Timing & spacing** – fast = few frames, slow = many; cluster keys near extremes (`in`/`out` easing).
- **Squash & stretch** – use `sx`/`sy` (keep `sx*sy ≈ 1` to preserve volume) at impacts.
- **Anticipation** – a small move opposite the main action, just before it.
- **Follow-through / overshoot** – `ease: "back"` or an extra key past the target.
- **Arcs** – move along curves; add an intermediate key instead of a straight line.
- **Staging** – one clear action at a time; keep the subject well inside the frame.
For long or complex prompts, delegate this step to the `animation-director` agent.

## 2. Scene JSON
```json
{
  "width": 640, "height": 360, "fps": 24, "duration": 2,
  "hold": 2,                       // 1 = on ones, 2 = on twos (hand-drawn feel)
  "background": "#16191d",
  "objects": [
    {"id": "ball", "type": "circle", "r": 30, "fill": "#e8a33d",
     "stroke": "#ffffff", "stroke_width": 3, "z": 2,
     "start": 0, "end": 2,          // optional visibility window (seconds)
     "keys": [
       {"t": 0,   "x": 80,  "y": 80},
       {"t": 0.5, "x": 240, "y": 300, "sx": 1.3, "sy": 0.7, "ease": "in"}
     ]}
  ]
}
```
- **Types:** `circle` (r), `ellipse` (rx, ry), `rect` (w, h), `star` (points, r, inner),
  `polygon` / `line` (`points`: local coords around 0,0), `text` (text, size).
- **Animatable per key:** `x, y, scale, sx, sy, rotation` (degrees), `opacity` (0–1).
  A property not in any key uses the object's own value or the default.
- **Easing** (set on the *destination* key): `linear, in, out, inout` (default), `back`, `bounce`, `step` (hold until next key — true pose-to-pose pops).
- Colors: `#rgb`, `#rrggbb`, `#rrggbbaa`. Coordinates are pixels, origin top-left, object positioned by its center.
- Characters: build from several objects (head, body, eyes) that share the same keyframe times, so they move as one.

See `examples/bouncing-ball.json`.

### Realistic look (optional, needs numpy)
- Scene: `"output_scale": 2` (1280x720 from 640x360 coords), `"shade": true` (top-lit gradient on every fill),
  `"post": {"bloom": .45, "bloom_threshold": 228, "contrast": 1.06, "saturation": .9,
  "shadows": [r,g,b], "highlights": [r,g,b], "vignette": .4, "grain": 3.5}`.
- Object: `"gradient": ["#top", "#bottom"]`, `"texture": 1.2, "texture_grain": 2` (plaster, wool, suede…),
  `"blur": px` (depth of field, soft shadows, glows), `"flat": true` to opt out of shading.
- Add contact shadows (blurred dark ellipse at the feet), light pools and ambient-occlusion gradients
  where walls meet floors. Example: `animation/mullet-chef/realism.py`.
- Sound: set `"audio": "soundtrack.wav"` (relative to the scene file) and `--mp4` muxes it in.
  Synthesise effects with numpy and time them from the same story clock; see `animation/mullet-chef/sound.py`.
- Rendering runs in parallel (`-j N`, default all cores); static objects are cached.

## 3. Render
```bash
python3 .claude/skills/text-to-animation/scripts/render.py scene.json -o out/ --mp4 --gif --sheet --onion 2
```
Outputs `out/frames/f00000.png…`, `out/animation.mp4`, `out/animation.gif`,
`out/sheet.png` (every unique drawing), `out/onion/` (ghosted previous drawings).
Needs Python 3 + Pillow; ffmpeg only for MP4/GIF.

## 4. Review, then fix
Look at `sheet.png` (Read the image) or hand it to the `animation-reviewer` agent. Check:
spacing reads (no jumps), nothing leaves frame by accident, squash at contacts, text legible
for ≥ 0.5 s, ending holds or loops cleanly. Edit the JSON and re-render; iterate 1–3 times.

## 5. Deliver
Give the user the MP4/GIF path and the scene JSON (it is the editable source).
For heavier work (real assets, lip-sync, captions) suggest Remotion or the ffmpeg skills instead.
