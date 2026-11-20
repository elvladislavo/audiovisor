#!/usr/bin/env python3
"""Frame-by-frame 2D animation renderer.

Reads a scene JSON (see ../SKILL.md), draws every frame with Pillow,
and writes PNG frames plus an optional MP4 / GIF via ffmpeg.

Realism features (all optional, see SKILL.md): per-object gradients or automatic
top-lit shading, surface texture, blur (depth of field / soft shadows), output
upscaling, and a post pass with colour grading, bloom, vignette and film grain.

usage: render.py scene.json [-o out_dir] [--mp4] [--gif] [--onion N] [--sheet] [-j N]
"""
import argparse, json, math, os, shutil, subprocess, sys, zlib
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont, ImageFilter
try:
    import numpy as np
except ImportError:  # realism features need numpy; flat rendering does not
    np = None

SS = 2  # supersampling factor for smooth edges

EASE = {
    "linear": lambda t: t,
    "in": lambda t: t * t,
    "out": lambda t: 1 - (1 - t) ** 2,
    "inout": lambda t: 2 * t * t if t < .5 else 1 - (-2 * t + 2) ** 2 / 2,
    "back": lambda t: 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
    "step": lambda t: 0.0,
}

def _bounce(t):
    n, d = 7.5625, 2.75
    if t < 1 / d: return n * t * t
    if t < 2 / d: t -= 1.5 / d; return n * t * t + .75
    if t < 2.5 / d: t -= 2.25 / d; return n * t * t + .9375
    t -= 2.625 / d; return n * t * t + .984375
EASE["bounce"] = _bounce

DEFAULTS = {"x": 0, "y": 0, "scale": 1, "sx": 1, "sy": 1, "rotation": 0, "opacity": 1}

def hex_rgba(c, alpha=1.0):
    if c is None: return None
    c = c.lstrip("#")
    if len(c) == 3: c = "".join(ch * 2 for ch in c)
    r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    a = int(c[6:8], 16) / 255 if len(c) == 8 else 1.0
    return (r, g, b, int(255 * a * alpha))

def mix(c, target, k): return tuple(int(c[i] + (target[i] - c[i]) * k) for i in range(3)) + (c[3],)

def sample(obj, prop, t):
    """Interpolate one property at time t from the object's keyframes."""
    keys = obj.get("_k", {}).get(prop)
    if keys is None:
        keys = sorted((k for k in obj.get("keys", []) if prop in k), key=lambda k: k["t"])
        obj.setdefault("_k", {})[prop] = keys
    base = obj.get(prop, DEFAULTS.get(prop, 0))
    if not keys: return base
    if t <= keys[0]["t"]: return keys[0][prop]
    if t >= keys[-1]["t"]: return keys[-1][prop]
    lo, hi = 0, len(keys) - 1  # binary search: rigs can have hundreds of keys
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if keys[mid]["t"] <= t: lo = mid
        else: hi = mid
    a, b = keys[lo], keys[hi]
    span = b["t"] - a["t"] or 1e-9
    e = EASE[b.get("ease", "inout")]((t - a["t"]) / span)
    return a[prop] + (b[prop] - a[prop]) * e

def visible(obj, t):
    return obj.get("start", 0) <= t <= obj.get("end", 1e9)

def shape_points(obj):
    """Local-space outline for vector shapes (centered on 0,0)."""
    k = obj["type"]
    if k in ("circle", "ellipse"):
        rx = obj.get("rx", obj.get("r", 20)); ry = obj.get("ry", obj.get("r", 20))
        return [(rx * math.cos(i / 72 * 2 * math.pi), ry * math.sin(i / 72 * 2 * math.pi)) for i in range(72)]
    if k == "rect":
        w, h = obj.get("w", 40) / 2, obj.get("h", 40) / 2
        return [(-w, -h), (w, -h), (w, h), (-w, h)]
    if k == "star":
        n, ro = obj.get("points", 5), obj.get("r", 30); ri = obj.get("inner", ro * .45)
        return [((ro if i % 2 == 0 else ri) * math.cos(math.pi * i / n - math.pi / 2),
                 (ro if i % 2 == 0 else ri) * math.sin(math.pi * i / n - math.pi / 2)) for i in range(2 * n)]
    if k in ("polygon", "line"):
        return [tuple(p) for p in obj["points"]]
    raise ValueError(f"unknown type {k!r} on object {obj.get('id')}")

def transform(pts, x, y, s, sx, sy, rot, F):
    c, si = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    out = []
    for px, py in pts:
        px, py = px * s * sx, py * s * sy
        out.append(((x + px * c - py * si) * F, (y + px * si + py * c) * F))
    return out

_font_cache = {}
def font(size):
    if size not in _font_cache:
        for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                     "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                     "C:/Windows/Fonts/arialbd.ttf"):
            if os.path.exists(path):
                _font_cache[size] = ImageFont.truetype(path, size); break
        else:
            _font_cache[size] = ImageFont.load_default()
    return _font_cache[size]

_noise_cache, _static_cache = {}, {}

def noise(key, w, h, grain):
    k = (key, w, h)
    if k not in _noise_cache:
        rng = np.random.default_rng(zlib.crc32(key.encode()))
        n = rng.normal(0, 1, (h // grain + 2, w // grain + 2)).astype(np.float32)
        img = Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        _noise_cache[k] = (np.asarray(img, np.float32) - 128) / 40
    return _noise_cache[k]

def filled_layer(obj, scene, lp, w, h, fill, F):
    """Polygon fill with optional gradient (explicit or auto top-light shading) and texture."""
    grad = obj.get("gradient")
    shade = scene.get("shade") and not obj.get("flat") and np is not None
    if not grad and not shade and not obj.get("texture"):
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(layer).polygon(lp, fill=fill)
        return layer
    if grad: top, bot = hex_rgba(grad[0], fill[3] / 255), hex_rgba(grad[1], fill[3] / 255)
    elif shade:
        k = scene.get("shade_strength", 1.0)
        top, bot = mix(fill, (255, 248, 235), 0.16 * k), mix(fill, (10, 12, 22), 0.32 * k)
    else: top = bot = fill
    ys = [p[1] for p in lp]; y0, y1 = min(ys), max(ys)
    t = np.clip((np.arange(h, dtype=np.float32) - y0) / max(1.0, y1 - y0), 0, 1)[:, None, None]
    arr = np.array(top, np.float32) * (1 - t) + np.array(bot, np.float32) * t
    arr = np.broadcast_to(arr, (h, w, 4)).copy()
    if obj.get("texture"):
        g = obj.get("texture_grain", 1.5) * F
        fine = noise(obj.get("id", "x"), w, h, max(1, int(g)))           # weave / grit
        blotch = noise(obj.get("id", "x") + "~", w, h, max(2, int(g * 14)))  # soft mottling
        arr[..., :3] *= (1 + (fine * 0.025 + blotch * 0.05)[..., None] * obj["texture"])
    mask = Image.new("L", (w, h), 0); ImageDraw.Draw(mask).polygon(lp, fill=255)
    arr[..., 3] *= np.asarray(mask, np.float32) / 255
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")

def draw_object(canvas, obj, t, scene, F):
    static = not obj.get("keys")
    if static and obj["id"] in _static_cache:
        layer, pos = _static_cache[obj["id"]]
        if layer is not None: canvas.paste(layer, pos, layer)
        return
    p = {k: sample(obj, k, t) for k in DEFAULTS}
    alpha = max(0.0, min(1.0, p["opacity"]))
    if alpha <= 0: return
    fill = hex_rgba(obj.get("fill"), alpha)
    stroke = hex_rgba(obj.get("stroke"), alpha)
    sw = int(obj.get("stroke_width", 0 if obj["type"] != "line" else 4) * F * p["scale"])
    blur = obj.get("blur", 0) * F
    if obj["type"] == "text":
        size = max(1, int(obj.get("size", 32) * p["scale"] * F))
        tmp = Image.new("RGBA", (size * max(1, len(obj["text"])) + 20, size * 2), (0, 0, 0, 0))
        ImageDraw.Draw(tmp).text((10, size // 4), obj["text"], font=font(size), fill=fill or (255, 255, 255, int(255 * alpha)))
        layer = tmp.crop(tmp.getbbox() or (0, 0, 1, 1)).rotate(-p["rotation"], expand=True, resample=Image.BICUBIC)
        pos = (int(p["x"] * F - layer.width / 2), int(p["y"] * F - layer.height / 2))
    else:
        pts = transform(shape_points(obj), p["x"], p["y"], p["scale"], p["sx"], p["sy"], p["rotation"], F)
        pad = int(sw + blur * 3 + 2)
        xs, ys = [q[0] for q in pts], [q[1] for q in pts]
        x0, y0 = int(math.floor(min(xs))) - pad, int(math.floor(min(ys))) - pad
        w, h = int(math.ceil(max(xs))) + pad - x0, int(math.ceil(max(ys))) + pad - y0
        if x0 > canvas.width or y0 > canvas.height or x0 + w < 0 or y0 + h < 0 or w < 1 or h < 1:
            if static: _static_cache[obj["id"]] = (None, None)
            return
        lp = [(x - x0, y - y0) for x, y in pts]
        if obj["type"] == "line":
            layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            ImageDraw.Draw(layer).line(lp, fill=stroke or fill, width=max(1, sw), joint="curve")
        else:
            layer = filled_layer(obj, scene, lp, w, h, fill, F) if fill else Image.new("RGBA", (w, h), (0, 0, 0, 0))
            if stroke and sw: ImageDraw.Draw(layer).line(lp + [lp[0]], fill=stroke, width=sw, joint="curve")
        pos = (x0, y0)
    if blur: layer = layer.filter(ImageFilter.GaussianBlur(blur))
    if static: _static_cache[obj["id"]] = (layer, pos)
    canvas.paste(layer, pos, layer)

_vignette = {}
def post(img, scene, frame_no):
    cfg = scene.get("post")
    if not cfg or np is None: return img
    a = np.asarray(img, np.float32)
    h, w = a.shape[:2]
    if cfg.get("bloom"):  # bright areas bleed light
        b = np.clip(a - cfg.get("bloom_threshold", 200), 0, None) * 2.5
        bimg = Image.fromarray(b.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(w / 70))
        a = a + np.asarray(bimg, np.float32) * cfg["bloom"]
    if "contrast" in cfg: a = (a - 128) * cfg["contrast"] + 128
    if "saturation" in cfg:
        g = a.mean(axis=2, keepdims=True); a = g + (a - g) * cfg["saturation"]
    if "shadows" in cfg or "highlights" in cfg:  # split-tone: tint darks and lights separately
        lum = a.mean(axis=2, keepdims=True) / 255
        a = a + (1 - lum) * np.array(cfg.get("shadows", [0, 0, 0]), np.float32) + lum * np.array(cfg.get("highlights", [0, 0, 0]), np.float32)
    if cfg.get("vignette"):
        if (w, h) not in _vignette:
            yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
            r = ((xx / w - .5) ** 2 + (yy / h - .5) ** 2) * 2
            _vignette[(w, h)] = (1 - cfg["vignette"] * r ** 1.5)[..., None]
        a = a * _vignette[(w, h)]
    if cfg.get("grain"):
        rng = np.random.default_rng(frame_no)
        a = a + rng.normal(0, cfg["grain"], (h, w, 1)).astype(np.float32)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

def render_frame(scene, t, frame_no=0):
    W, H, OUT = scene["width"], scene["height"], scene.get("output_scale", 1)
    F = SS * OUT
    img = Image.new("RGBA", (W * F, H * F), hex_rgba(scene.get("background", "#ffffff")))
    for obj in scene["_sorted"]:
        if visible(obj, t): draw_object(img, obj, t, scene, F)
    return post(img.convert("RGB").resize((W * OUT, H * OUT), Image.LANCZOS), scene, frame_no)

_SCENE = None
def _init(scene): global _SCENE; _SCENE = scene
def _work(job):
    i, t, path = job
    render_frame(_SCENE, t, i).save(path)
    return i

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scene"); ap.add_argument("-o", "--out", default=None)
    ap.add_argument("--mp4", action="store_true"); ap.add_argument("--gif", action="store_true")
    ap.add_argument("--onion", type=int, default=0, help="also write onion-skin preview frames using N previous drawings")
    ap.add_argument("--sheet", action="store_true", help="write a contact sheet of all drawings")
    ap.add_argument("-j", "--jobs", type=int, default=os.cpu_count() or 1, help="parallel worker processes")
    a = ap.parse_args()

    scene = json.load(open(a.scene))
    scene["_sorted"] = sorted(scene["objects"], key=lambda o: o.get("z", 0))
    for i, o in enumerate(scene["objects"]): o.setdefault("id", f"obj{i}")
    fps, dur = scene.get("fps", 12), scene["duration"]
    hold = scene.get("hold", 1)  # 1 = on ones, 2 = on twos (classic hand-drawn feel)
    out = a.out or os.path.splitext(a.scene)[0] + "_render"
    frames_dir = os.path.join(out, "frames"); os.makedirs(frames_dir, exist_ok=True)
    for f in os.listdir(frames_dir): os.remove(os.path.join(frames_dir, f))

    n = max(1, round(fps * dur))
    jobs = [(i, i / fps, os.path.join(frames_dir, f"f{i:05d}.png")) for i in range(0, n, hold)]
    if a.jobs > 1:
        with Pool(a.jobs, initializer=_init, initargs=(scene,)) as pool:
            for k, _ in enumerate(pool.imap_unordered(_work, jobs, chunksize=4)):
                if k % 50 == 0: print(f"  {k}/{len(jobs)} drawings", flush=True)
    else:
        _init(scene)
        for j in jobs: _work(j)
    drawings = [j[2] for j in jobs]
    for i in range(n):  # held frames reuse the previous drawing
        if i % hold: shutil.copyfile(drawings[i // hold], os.path.join(frames_dir, f"f{i:05d}.png"))
    print(f"{n} frames ({len(drawings)} unique drawings) -> {frames_dir}")

    if a.onion:
        od = os.path.join(out, "onion"); os.makedirs(od, exist_ok=True)
        for i, path in enumerate(drawings):
            base = Image.open(path)
            for k in range(1, a.onion + 1):
                if i - k >= 0: base = Image.blend(base, Image.open(drawings[i - k]), .25 / k)
            base.save(os.path.join(od, f"d{i:05d}.png"))
        print(f"onion skins -> {od}")
    if a.sheet:
        step = max(1, len(drawings) // 48)
        picks = drawings[::step]
        cols = min(8, len(picks)); rows = math.ceil(len(picks) / cols)
        tw, th = 213, 120
        sheet = Image.new("RGB", (cols * tw, rows * th), "white")
        for i, path in enumerate(picks): sheet.paste(Image.open(path).resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
        sheet.save(os.path.join(out, "sheet.png")); print(f"contact sheet -> {out}/sheet.png")

    if (a.mp4 or a.gif) and not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found; PNG frames were written")
    pat = os.path.join(frames_dir, "f%05d.png")
    if a.mp4:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", pat,
                        "-c:v", "libx264", "-crf", "23", "-preset", "slow", "-pix_fmt", "yuv420p",
                        "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", os.path.join(out, "animation.mp4")], check=True)
        print(f"-> {out}/animation.mp4")
    if a.gif:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", pat, "-vf",
                        "fps=12,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse", "-loop", "0",
                        os.path.join(out, "animation.gif")], check=True)
        print(f"-> {out}/animation.gif")

if __name__ == "__main__":
    main()
