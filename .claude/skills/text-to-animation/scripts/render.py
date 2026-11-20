#!/usr/bin/env python3
"""Frame-by-frame 2D animation renderer.

Reads a scene JSON (see ../SKILL.md), draws every frame with Pillow,
and writes PNG frames plus an optional MP4 / GIF via ffmpeg.

usage: render.py scene.json [-o out_dir] [--mp4] [--gif] [--onion N] [--sheet]
"""
import argparse, json, math, os, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

SS = 2  # supersampling factor for smooth edges

EASE = {
    "linear": lambda t: t,
    "in": lambda t: t * t,
    "out": lambda t: 1 - (1 - t) ** 2,
    "inout": lambda t: 2 * t * t if t < .5 else 1 - (-2 * t + 2) ** 2 / 2,
    "back": lambda t: 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
    "bounce": None,  # filled below
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

def sample(obj, prop, t):
    """Interpolate one property at time t from the object's keyframes."""
    keys = [k for k in obj.get("keys", []) if prop in k]
    base = obj.get(prop, DEFAULTS.get(prop, 0))
    if not keys: return base
    keys.sort(key=lambda k: k["t"])
    if t <= keys[0]["t"]: return keys[0][prop]
    if t >= keys[-1]["t"]: return keys[-1][prop]
    for a, b in zip(keys, keys[1:]):
        if a["t"] <= t <= b["t"]:
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

def transform(pts, x, y, s, sx, sy, rot):
    c, si = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    out = []
    for px, py in pts:
        px, py = px * s * sx, py * s * sy
        out.append(((x + px * c - py * si) * SS, (y + px * si + py * c) * SS))
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

def draw_object(canvas, obj, t):
    p = {k: sample(obj, k, t) for k in DEFAULTS}
    alpha = max(0.0, min(1.0, p["opacity"]))
    if alpha <= 0: return
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    fill = hex_rgba(obj.get("fill"), alpha)
    stroke = hex_rgba(obj.get("stroke"), alpha)
    sw = int(obj.get("stroke_width", 0 if obj["type"] != "line" else 4) * SS * p["scale"])
    if obj["type"] == "text":
        size = max(1, int(obj.get("size", 32) * p["scale"] * SS))
        tmp = Image.new("RGBA", (size * max(1, len(obj["text"])) + 20, size * 2), (0, 0, 0, 0))
        ImageDraw.Draw(tmp).text((10, size // 4), obj["text"], font=font(size), fill=fill or (255, 255, 255, int(255 * alpha)))
        tmp = tmp.crop(tmp.getbbox() or (0, 0, 1, 1)).rotate(-p["rotation"], expand=True, resample=Image.BICUBIC)
        layer.alpha_composite(tmp, (int(p["x"] * SS - tmp.width / 2), int(p["y"] * SS - tmp.height / 2)))
    else:
        pts = transform(shape_points(obj), p["x"], p["y"], p["scale"], p["sx"], p["sy"], p["rotation"])
        if obj["type"] == "line":
            d.line(pts, fill=stroke or fill, width=max(1, sw), joint="curve")
        else:
            d.polygon(pts, fill=fill)
            if stroke and sw: d.line(pts + [pts[0]], fill=stroke, width=sw, joint="curve")
    canvas.alpha_composite(layer)

def render_frame(scene, t):
    W, H = scene["width"], scene["height"]
    img = Image.new("RGBA", (W * SS, H * SS), hex_rgba(scene.get("background", "#ffffff")))
    for obj in sorted(scene["objects"], key=lambda o: o.get("z", 0)):
        if visible(obj, t): draw_object(img, obj, t)
    return img.resize((W, H), Image.LANCZOS)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scene"); ap.add_argument("-o", "--out", default=None)
    ap.add_argument("--mp4", action="store_true"); ap.add_argument("--gif", action="store_true")
    ap.add_argument("--onion", type=int, default=0, help="also write onion-skin preview frames using N previous drawings")
    ap.add_argument("--sheet", action="store_true", help="write a contact sheet of all drawings")
    a = ap.parse_args()

    scene = json.load(open(a.scene))
    fps, dur = scene.get("fps", 12), scene["duration"]
    hold = scene.get("hold", 1)  # 1 = on ones, 2 = on twos (classic hand-drawn feel)
    out = a.out or os.path.splitext(a.scene)[0] + "_render"
    frames_dir = os.path.join(out, "frames"); os.makedirs(frames_dir, exist_ok=True)
    for f in os.listdir(frames_dir): os.remove(os.path.join(frames_dir, f))

    n = max(1, round(fps * dur)); drawings = []; last = None
    for i in range(n):
        if i % hold == 0:  # new drawing; held frames reuse it
            last = render_frame(scene, (i / fps)).convert("RGB"); drawings.append(last)
        last.save(os.path.join(frames_dir, f"f{i:05d}.png"))
    print(f"{n} frames ({len(drawings)} unique drawings) -> {frames_dir}")

    if a.onion:
        od = os.path.join(out, "onion"); os.makedirs(od, exist_ok=True)
        for i, dr in enumerate(drawings):
            base = dr.copy()
            for k in range(1, a.onion + 1):
                if i - k >= 0: base = Image.blend(base, drawings[i - k], .25 / k)
            base.save(os.path.join(od, f"d{i:05d}.png"))
        print(f"onion skins -> {od}")
    if a.sheet:
        cols = min(8, len(drawings)); rows = math.ceil(len(drawings) / cols)
        tw, th = scene["width"] // 3, scene["height"] // 3
        sheet = Image.new("RGB", (cols * tw, rows * th), "white")
        for i, dr in enumerate(drawings): sheet.paste(dr.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
        sheet.save(os.path.join(out, "sheet.png")); print(f"contact sheet -> {out}/sheet.png")

    if (a.mp4 or a.gif) and not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found; PNG frames were written")
    pat = os.path.join(frames_dir, "f%05d.png")
    if a.mp4:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", pat,
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                        os.path.join(out, "animation.mp4")], check=True)
        print(f"-> {out}/animation.mp4")
    if a.gif:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", pat, "-vf",
                        "split[a][b];[a]palettegen[p];[b][p]paletteuse", "-loop", "0",
                        os.path.join(out, "animation.gif")], check=True)
        print(f"-> {out}/animation.gif")

if __name__ == "__main__":
    main()
