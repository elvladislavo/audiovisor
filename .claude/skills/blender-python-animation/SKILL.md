---
name: blender-python-animation
description: Create, edit, render and export 3D animation with Blender's Python API (bpy), headless from the command line. Use when generating keyframes or procedural motion in code, batch-converting FBX/OBJ to glTF, baking or retiming actions, rendering animation frames/video without the UI, or automating any Blender animation task.
---

# Blender Python animation (bpy)

Targets Blender 4.x. Check with `blender --version`; APIs below are stable from 3.6 on unless noted.

## Running headless

```bash
blender -b                      -P script.py -- --out out.glb   # empty scene
blender -b scene.blend          -P script.py -- --frames 1 120  # open a file first
blender -b --factory-startup    -P script.py                    # ignore user prefs/addons (reproducible)
```

Arguments after `--` are yours:
```python
import sys, argparse
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
args = argparse.ArgumentParser().parse_args(argv)  # define your flags first
```

Exit non-zero on failure so CI notices: wrap in `try/except` and `sys.exit(1)`.

## Keyframing

```python
import bpy, math
scene = bpy.context.scene
scene.render.fps = 30
scene.frame_start, scene.frame_end = 1, 120

bpy.ops.mesh.primitive_cube_add(size=1)
cube = bpy.context.active_object

for f, z in [(1, 0), (60, 2), (120, 0)]:
    cube.location.z = z
    cube.keyframe_insert(data_path="location", index=2, frame=f)

cube.rotation_euler.z = 0;              cube.keyframe_insert("rotation_euler", index=2, frame=1)
cube.rotation_euler.z = math.tau;       cube.keyframe_insert("rotation_euler", index=2, frame=120)
```

Faster than `keyframe_insert` for thousands of keys — write F-curves directly:

```python
action = bpy.data.actions.new("Bob")
cube.animation_data_create().action = action
fc = action.fcurves.new(data_path="location", index=2)
fc.keyframe_points.add(count=len(frames))
fc.keyframe_points.foreach_set("co", [v for f, z in zip(frames, zs) for v in (f, z)])
for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'   # or 'LINEAR', 'CONSTANT'
fc.update()
```

(Blender 4.4+ introduces slotted/layered actions; `action.fcurves` still works for legacy single-slot actions. If it errors, check `action.layers[0].strips[0].channelbag(slot).fcurves`.)

Loop a cycle: `fc.modifiers.new('CYCLES')`. Noise/wiggle: `fc.modifiers.new('NOISE')`.

## Armatures / bones

```python
arm = bpy.data.objects["Armature"]
pb = arm.pose.bones["Head"]
pb.rotation_mode = 'XYZ'                 # pose bones default to QUATERNION
pb.rotation_euler.y = 0.4
pb.keyframe_insert("rotation_euler", frame=10)
```
Data path for bone channels in an F-curve: `pose.bones["Head"].rotation_quaternion`.

Shape keys: `obj.data.shape_keys.key_blocks["Smile"].value = 1.0; ...keyframe_insert("value", frame=f)`.

## Multiple clips (actions) for glTF

Each glTF animation = one Blender action. To export several on one rig:

```python
arm.animation_data_create()
for act in [bpy.data.actions[n] for n in ("Idle", "Walk", "Run")]:
    track = arm.animation_data.nla_tracks.new(); track.name = act.name
    track.strips.new(act.name, int(act.frame_range[0]), act)
arm.animation_data.action = None
```

## Bake (constraints/IK/drivers → plain keys, needed before export)

```python
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.select_all(action='SELECT')
bpy.ops.nla.bake(frame_start=1, frame_end=120, only_selected=True,
                 visual_keying=True, clear_constraints=True, bake_types={'POSE'})
bpy.ops.object.mode_set(mode='OBJECT')
```

## Import / export

```python
bpy.ops.wm.read_factory_settings(use_empty=True)          # clean scene
bpy.ops.import_scene.fbx(filepath="in.fbx", automatic_bone_orientation=True)
# bpy.ops.wm.obj_import(filepath="in.obj")                 # 3.x+/4.x OBJ importer

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

bpy.ops.export_scene.gltf(
    filepath="out.glb", export_format='GLB',
    export_animations=True, export_animation_mode='ACTIONS',  # one glTF clip per action
    export_morph=True, export_morph_animation=True,
    export_yup=True, export_apply=True,
)
```
Then optimize with `gltf-asset-pipeline`.

Batch convert a folder: loop files, `read_factory_settings(use_empty=True)` between each to avoid leaking data.

## Rendering animation

```python
r = scene.render
r.engine = 'BLENDER_EEVEE_NEXT'          # 4.2+; 'BLENDER_EEVEE' before, 'CYCLES' for path tracing
r.resolution_x, r.resolution_y = 1920, 1080
r.image_settings.file_format = 'PNG'
r.filepath = "//frames/f_"               # // = relative to the .blend
bpy.ops.render.render(animation=True)
```
Encode frames to video with ffmpeg afterwards (`ffmpeg -framerate 30 -i frames/f_%04d.png -c:v libx264 -pix_fmt yuv420p out.mp4`) — more controllable than Blender's FFmpeg output. Cycles on a headless server: set `scene.cycles.device = 'CPU'` unless a GPU is configured.

## Gotchas

- `bpy.ops.*` depends on context (active object, mode, selected). Prefer `bpy.data` API where it exists; when you must use ops, set active/selection explicitly.
- Frame numbers are integers in `keyframe_insert` UI terms but accept floats for sub-frame keys.
- After changing keys, call `scene.frame_set(f)` to evaluate the pose at frame f (for sampling or checks).
- Units: glTF is metres, Y-up; Blender is metres, Z-up — the exporter converts if `export_yup=True`.
