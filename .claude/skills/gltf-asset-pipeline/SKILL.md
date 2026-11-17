---
name: gltf-asset-pipeline
description: Inspect, validate, fix and optimize animated glTF/GLB 3D models from the command line. Use when a model is too large, loads slowly, has wrong scale/orientation, is missing animations, needs compression (Draco, meshopt, KTX2, WebP), needs clips merged/renamed/resampled, or when converting FBX/OBJ to glTF for the web.
---

# glTF asset pipeline

Main tool: glTF-Transform CLI (`npx @gltf-transform/cli@4 <command>`). Work on copies; never overwrite the source asset.

## 1. Inspect first

```bash
npx @gltf-transform/cli@4 inspect model.glb      # meshes, materials, textures (sizes), animations, extensions
npx @gltf-transform/cli@4 validate model.glb     # Khronos validator: errors/warnings
```

Read the report for: total size, texture resolutions (anything > 2048 for web is suspicious), vertex counts, animation list (names, durations, channel counts), and required extensions (the loader must support them).

## 2. One-shot web optimization

```bash
npx @gltf-transform/cli@4 optimize in.glb out.glb \
  --compress meshopt \
  --texture-compress webp \
  --texture-size 2048
```

- `--compress meshopt` — best default for **animated** models (also compresses animation data). `draco` compresses geometry only and is slower to decode; choose it only if the target loader lacks meshopt.
- `--texture-compress ktx2` keeps textures compressed on the GPU (big VRAM win); needs `toktx` (KTX-Software) installed. `webp` is easier and shrinks download only.
- `optimize` already runs dedup, prune, weld, resample, etc. If it breaks something, run steps individually to bisect.

## 3. Individual steps

```bash
npx @gltf-transform/cli@4 resample in.glb out.glb     # drop redundant keyframes (lossless-ish, big win on baked mocap)
npx @gltf-transform/cli@4 prune in.glb out.glb        # remove unused nodes/materials/accessors
npx @gltf-transform/cli@4 dedup in.glb out.glb
npx @gltf-transform/cli@4 simplify in.glb out.glb --ratio 0.5 --error 0.001   # decimate; check skinning visually
npx @gltf-transform/cli@4 merge a.glb b.glb out.glb   # combine files (e.g. character + separate clip files)
npx @gltf-transform/cli@4 copy in.gltf out.glb        # .gltf+.bin+textures → single .glb
```

Run `--help` on any command before relying on a flag; flags change between major versions.

## 4. Scripted fixes (Node API)

For renaming clips, dropping clips, or anything the CLI doesn't do:

```js
// fix-clips.mjs — node fix-clips.mjs in.glb out.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [,, src, dst] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
for (const anim of doc.getRoot().listAnimations()) {
  const name = anim.getName();
  if (/^(Armature\|)?mixamo\.com$/i.test(name)) anim.dispose();          // junk clip
  else anim.setName(name.replace(/^Armature\|/, ''));                    // "Armature|Walk" → "Walk"
}
await io.write(dst, doc);
```
(`npm i @gltf-transform/core @gltf-transform/extensions` in a scratch dir.) Meshopt/Draco inputs also need their decoders registered — see glTF-Transform docs.

## 5. Converting other formats

- **FBX → glTF**: Blender headless import/export is the most reliable free route (see `blender-python-animation`), or `FBX2glTF` (Meta/Godot fork) binary.
- **OBJ**: has no animation; convert with Blender or `obj2gltf`.
- **Mixamo**: download each clip as FBX "without skin" plus one "with skin", import all into Blender, push each action to the NLA, export one GLB.

## 6. Export-side fixes (Blender glTF exporter)

| Problem | Fix at export |
|---|---|
| Model 100× too big/small | Apply scale (Ctrl-A → All Transforms) on armature + mesh before export; scene units = metres |
| Lying on its back | Keep exporter "+Y Up" on (default) |
| Only one clip exported | Push each action to NLA tracks / mark actions as assets; Animation mode "Actions" |
| Clip names `Armature|Walk` | Rename actions in Blender, or fix in post (§4) |
| Shape keys not animating | Enable Shape Keys + Shape Key Animations in the exporter |
| Huge file from mocap | Enable "Optimize Animation Size", or `resample` after |

## 7. Budgets for the web (rough)

- Hero character: ≤ 5 MB GLB, ≤ 50k triangles, ≤ 2k textures, ≤ 75 bones.
- Background/crowd: ≤ 1 MB, ≤ 10k triangles, 1k textures.
- Always report before/after size and `inspect` diff when you optimize something.

## 8. Verify after every transform

1. `validate` reports no new errors.
2. `inspect` still lists every animation with the same duration.
3. Load it in a viewer (three.js editor, `gltf-viewer.donmccurdy.com`, or the project's own scene) and play **each** clip — compression and simplify can break skinning silently.
