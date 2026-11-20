#!/usr/bin/env python3
"""Generates scene.json: the mullet guy walks to the shop, buys ingredients, cooks.

A tiny rig: pose(t) returns the character's root position, facing and limb angles;
every body part is sampled once per frame into keyframes for render.py.
"""
import json, math, os

W, H, FPS = 640, 360, 12
DUR = 14.0
K = 30.0 / DUR  # stretch story to 30 s; walk/stir cycles stay real-time
S1, S2, S3 = 0.0, 4.5, 9.0          # scene starts: street, shop, kitchen
GROUND = {1: 312, 2: 318, 3: 318}

C = dict(skin="#e2b48f", hair="#4a2c1a", coat="#b9a68e", coat_dk="#8f7d67", shirt="#f2efe8",
         tie="#c0282d", pants="#15161a", stripe="#f2f2f2", shoe="#a3161c", shades="#101215",
         bag="#2346c8", night="#191c2a")

def lerp(a, b, u): return a + (b - a) * max(0, min(1, u))
def smooth(u): u = max(0, min(1, u)); return u * u * (3 - 2 * u)

# ---------------------------------------------------------------- character rig
def pose(t, rt):
    """root x, ground y, facing (+1 right), walk phase, arm overrides, visible bag, scale."""
    p = dict(x=0, y=0, d=1, walk=0.0, phase=0.0, armF=None, armB=None, scale=1.0, bob=0)
    if t < S2:  # street: walk left -> shop door, then step in (shrink a little into doorway)
        u = t / 3.6
        p.update(x=lerp(-40, 455, u), y=GROUND[1], walk=1 if u < 1 else 0, phase=rt * 2 * math.pi * 1.6)
        if u >= 1:
            k = smooth((t - 3.6) / 0.8)
            p.update(scale=1 - 0.15 * k, y=GROUND[1] - 18 * k)
    elif t < S3:  # shop
        lt = t - S2
        if lt < 1.4:     # walk to shelf
            p.update(x=lerp(40, 250, lt / 1.4), walk=1, phase=rt * 2 * math.pi * 1.6)
        elif lt < 3.0:   # grab three items (reach up and back down x3)
            p.update(x=250, armF=-150 + 40 * math.sin((lt - 1.4) / 1.6 * 3 * 2 * math.pi))
        elif lt < 3.9:   # walk to till
            p.update(x=lerp(250, 470, (lt - 3.0) / 0.9), walk=1, phase=rt * 2 * math.pi * 1.6)
        else:            # pay
            p.update(x=470, armF=-80 + 10 * math.sin(rt * 12))
        p["y"] = GROUND[2]
    else:          # kitchen
        lt = t - S3
        if lt < 0.9:
            p.update(x=lerp(-30, 240, lt / 0.9), walk=1, phase=rt * 2 * math.pi * 1.6)
        elif lt < 4.0:   # stir pan: front arm circles
            p.update(x=240, armF=-70 + 18 * math.sin(rt * 9), bob=2 * math.sin(rt * 9))
        else:            # proud pose: thumbs up
            p.update(x=240, armF=-160, armB=10)
        p["y"] = GROUND[3]
    return p

def parts(t, rt):
    """Return {part: props} in screen space for the character at time t."""
    p = pose(t, rt); d, s = p["d"], p["scale"]
    sw = math.sin(p["phase"]) * 28 * p["walk"]
    bob = abs(math.cos(p["phase"])) * -3 * p["walk"] + p["bob"]
    X, Y = p["x"], p["y"] + bob

    def at(lx, ly, **kw):  # local (feet origin, y up negative) -> screen
        return dict(x=X + lx * d * s, y=Y + ly * s, scale=s, **kw)

    def limb(px, py, length, ang):  # rect centre for a limb hanging from pivot, rotated by ang
        a = math.radians(ang)
        return px - math.sin(a) * length / 2 * d, py + math.cos(a) * length / 2

    out = {}
    hip = (0, -62)
    for name, ang in (("legB", -sw), ("legF", sw)):
        cx, cy = limb(hip[0], hip[1], 60, ang)
        out[name] = at(cx, cy, rotation=ang * d)
        fx, fy = limb(hip[0], hip[1], 120, ang)
        out[name + "_stripe"] = at(cx + 6 * d * math.cos(math.radians(ang)), cy, rotation=ang * d)
        out[name.replace("leg", "shoe")] = at(fx + 6, fy - 3)
    sh = (0, -128)
    armF = p["armF"] if p["armF"] is not None else -sw * 0.9
    armB = p["armB"] if p["armB"] is not None else sw * 0.9
    for name, ang in (("armB", armB), ("armF", armF)):
        cx, cy = limb(sh[0], sh[1], 54, ang)
        out[name] = at(cx, cy, rotation=ang * d)
        hx, hy = limb(sh[0], sh[1], 112, ang)
        out[name.replace("arm", "hand")] = at(hx, hy)
    out.update(
        coat=at(0, -84), lapel=at(0, -120), shirt=at(0, -121), tie=at(1, -110),
        neck=at(0, -136),
        hairBack=at(-2, -140), hairL=at(-15, -150), hairR=at(14, -150), hairTop=at(0, -166),
        hairCurl1=at(-12, -164), hairCurl2=at(12, -164),
        head=at(2, -150), shadeL=at(-5, -152), shadeR=at(9, -152), bridge=at(2, -153),
        stache=at(3, -142), beard=at(3, -137),
        bag=at(-22, -78, rotation=6 * math.sin(p["phase"]) * p["walk"]),
    )
    return out

RIG = [  # (id, shape dict, z)
    ("armB", dict(type="rect", w=15, h=54, fill=C["coat_dk"]), 10),
    ("handB", dict(type="circle", r=6, fill=C["skin"]), 10),
    ("bag", dict(type="rect", w=22, h=34, fill=C["bag"], stroke="#0f2a8a", stroke_width=2), 11),
    ("legB", dict(type="rect", w=15, h=60, fill=C["pants"]), 12),
    ("legB_stripe", dict(type="rect", w=2, h=58, fill=C["stripe"]), 12.1),
    ("shoeB", dict(type="ellipse", rx=12, ry=5, fill=C["shoe"]), 12.2),
    ("legF", dict(type="rect", w=15, h=60, fill=C["pants"]), 13),
    ("legF_stripe", dict(type="rect", w=2, h=58, fill=C["stripe"]), 13.1),
    ("shoeF", dict(type="ellipse", rx=12, ry=5, fill=C["shoe"]), 13.2),
    ("hairBack", dict(type="ellipse", rx=17, ry=24, fill=C["hair"]), 14),
    ("coat", dict(type="polygon", points=[[-20, -46], [20, -46], [27, 46], [-27, 46]],
                  fill=C["coat"], stroke=C["coat_dk"], stroke_width=2), 15),
    ("shirt", dict(type="polygon", points=[[-8, -8], [8, -8], [0, 16]], fill=C["shirt"]), 16),
    ("tie", dict(type="polygon", points=[[-3, -12], [3, -12], [5, 14], [0, 19], [-5, 14]], fill=C["tie"]), 17),
    ("lapel", dict(type="polygon", points=[[-12, -8], [-4, -8], [0, 18], [-14, 4]], fill=C["coat_dk"]), 16.5),
    ("neck", dict(type="rect", w=10, h=8, fill=C["skin"]), 15.5),
    ("head", dict(type="ellipse", rx=13, ry=16, fill=C["skin"]), 18),
    ("beard", dict(type="ellipse", rx=11, ry=7, fill="#6b4630"), 18.5),
    ("stache", dict(type="ellipse", rx=8, ry=3, fill="#5a3a26"), 18.6),
    ("hairL", dict(type="ellipse", rx=8, ry=17, fill=C["hair"]), 18.7),
    ("hairR", dict(type="ellipse", rx=7, ry=15, fill=C["hair"]), 18.7),
    ("hairTop", dict(type="ellipse", rx=17, ry=8, fill=C["hair"]), 18.8),
    ("hairCurl1", dict(type="circle", r=7, fill=C["hair"]), 18.9),
    ("hairCurl2", dict(type="circle", r=7, fill=C["hair"]), 18.9),
    ("shadeL", dict(type="ellipse", rx=6, ry=3.5, fill=C["shades"], stroke="#8a8f99", stroke_width=1), 19),
    ("shadeR", dict(type="ellipse", rx=6, ry=3.5, fill=C["shades"], stroke="#8a8f99", stroke_width=1), 19),
    ("bridge", dict(type="rect", w=4, h=1.5, fill="#8a8f99"), 19),
    ("armF", dict(type="rect", w=15, h=54, fill=C["coat"], stroke=C["coat_dk"], stroke_width=1), 20),
    ("handF", dict(type="circle", r=6, fill=C["skin"]), 20.5),
]

# ---------------------------------------------------------------- helpers
def rect(id, x, y, w, h, fill, s, e, z, **kw): return dict(id=id, type="rect", x=x, y=y, w=w, h=h, fill=fill, start=s, end=e, z=z, **kw)
def circ(id, x, y, r, fill, s, e, z, **kw): return dict(id=id, type="circle", x=x, y=y, r=r, fill=fill, start=s, end=e, z=z, **kw)
def text(id, x, y, t, size, fill, s, e, z, **kw): return dict(id=id, type="text", x=x, y=y, text=t, size=size, fill=fill, start=s, end=e, z=z, **kw)

objs = []

# ---- scene 1: night street
objs += [rect("sky", 320, 90, 640, 180, C["night"], S1, S2, 0),
         rect("wall", 320, 230, 640, 180, "#5b4d45", S1, S2, 1),
         rect("pavement", 320, 336, 640, 48, "#3a3836", S1, S2, 2),
         circ("moon", 70, 50, 18, "#f1e6c8", S1, S2, 0.5),
         rect("win1", 130, 210, 120, 90, "#283a52", S1, S2, 2, stroke="#2a201b", stroke_width=6),
         rect("shopfront", 470, 222, 190, 190, "#6e5f55", S1, S2, 2),
         rect("signboard", 470, 140, 170, 36, "#2f7d4f", S1, S2, 3),
         text("signtxt", 470, 141, "SKLEP", 24, "#f6f1dc", S1, S2, 4),
         rect("door", 455, 260, 64, 104, "#f3d98c", S1, S2, 3, stroke="#3a2c22", stroke_width=5),
         rect("shopwin", 530, 245, 44, 70, "#f3d98c", S1, S2, 3, stroke="#3a2c22", stroke_width=4),
         rect("pipe", 300, 230, 8, 180, "#7a3226", S1, S2, 2.5)]
for i, x in enumerate((50, 230, 600)):
    objs.append(circ(f"star{i}", x, 25 + 12 * i, 2, "#ffffff", S1, S2, 0.6,
                     keys=[{"t": S1 + 0.3 * i, "opacity": 0.2}, {"t": 2 + 0.3 * i, "opacity": 1}, {"t": 4, "opacity": 0.3}]))
objs.append(text("t1", 160, 300, "Hungry...", 20, "#f6f1dc", 0.6, 2.4, 30,
                 keys=[{"t": 0.6, "opacity": 0}, {"t": 0.9, "opacity": 1}, {"t": 2.1, "opacity": 1}, {"t": 2.4, "opacity": 0}]))

# ---- scene 2: shop interior
objs += [rect("shopbg", 320, 160, 640, 320, "#efe4c8", S2, S3, 0),
         rect("shopfloor", 320, 340, 640, 40, "#c9b48c", S2, S3, 1),
         rect("shelf", 255, 200, 200, 150, "#8a5a36", S2, S3, 1)]
for r, y in enumerate((150, 200, 250)):
    objs.append(rect(f"plank{r}", 255, y + 22, 190, 6, "#5c3b22", S2, S3, 2))
shelf_items = [("tomato", 200, 160, "circle", "#d6332b"), ("onion", 240, 160, "circle", "#c9a24a"),
               ("pasta", 290, 210, "rect", "#f2c94c"), ("basil", 225, 260, "circle", "#3f9b44"),
               ("cheese", 300, 160, "rect", "#f5dd7a"), ("can", 190, 210, "rect", "#b3443a")]
bought = {"tomato": 1.6, "pasta": 2.15, "basil": 2.7}
for name, x, y, kind, col in shelf_items:
    o = dict(id="shop_" + name, type=kind, fill=col, start=S2, end=S3, z=3,
             **({"r": 12} if kind == "circle" else {"w": 18, "h": 26}))
    if name in bought:  # flies from shelf into the blue bag (approx. bag position)
        tb = S2 + bought[name]
        bx, by = 250 - 22, GROUND[2] - 78
        o["keys"] = [{"t": S2, "x": x, "y": y}, {"t": tb, "x": x, "y": y},
                     {"t": tb + 0.12, "x": (x + bx) / 2, "y": y - 30, "ease": "out", "scale": 1.2},
                     {"t": tb + 0.35, "x": bx, "y": by, "ease": "in", "scale": 0.5, "opacity": 1},
                     {"t": tb + 0.45, "x": bx, "y": by, "opacity": 0}]
    else:
        o.update(x=x, y=y)
    objs.append(o)
objs += [rect("till", 540, 290, 110, 60, "#4a5560", S2, S3, 15),
         rect("tilltop", 560, 245, 40, 30, "#2d343b", S2, S3, 15),
         text("price", 560, 245, "24 zł", 12, "#7cf08a", S2 + 3.9, S3, 16),
         text("ding", 540, 195, "*ding*", 18, "#c0282d", S2 + 4.1, S2 + 4.4, 30)]
objs.append(text("t2", 420, 60, "tomato · pasta · basil", 20, "#3a2c22", S2 + 0.2, S2 + 1.5, 30,
                 keys=[{"t": S2 + 0.2, "opacity": 0}, {"t": S2 + 0.5, "opacity": 1}, {"t": S2 + 1.5, "opacity": 0}]))

# ---- scene 3: kitchen
objs += [rect("kitbg", 320, 160, 640, 320, "#cfe3e0", S3, DUR, 0),
         rect("tiles", 320, 200, 640, 80, "#e9f2f0", S3, DUR, 0.5),
         rect("kitfloor", 320, 340, 640, 40, "#8a6d55", S3, DUR, 1),
         rect("counter", 380, 280, 300, 80, "#6c7a86", S3, DUR, 2),
         rect("stovetop", 380, 238, 300, 8, "#2b3137", S3, DUR, 2.5),
         rect("window", 520, 100, 110, 80, "#22324a", S3, DUR, 1, stroke="#ffffff", stroke_width=5),
         circ("kmoon", 545, 85, 12, "#f1e6c8", S3, DUR, 1.5)]
PAN_X, PAN_Y = 300, 228
shake = [{"t": S3 + 1.0 + i * 0.25, "x": PAN_X + (4 if i % 2 else -4), "y": PAN_Y} for i in range(12)]
objs += [dict(id="pan", type="ellipse", rx=42, ry=9, fill="#22252a", start=S3, end=DUR, z=3, x=PAN_X, y=PAN_Y,
              keys=[{"t": S3, "x": PAN_X, "y": PAN_Y}] + shake + [{"t": S3 + 4.1, "x": PAN_X, "y": PAN_Y}]),
         rect("handle", PAN_X + 60, PAN_Y, 40, 5, "#22252a", S3, DUR, 3),
         dict(id="flame", type="star", points=7, r=14, inner=7, fill="#ff8a2a", start=S3 + 0.9, end=S3 + 4.1, z=2.6,
              x=PAN_X, y=PAN_Y + 12, keys=[{"t": S3 + 0.9 + i * 0.16, "scale": 0.8 + 0.3 * (i % 2), "rotation": 15 * i}
                                           for i in range(20)])]
for i, (col, kind) in enumerate((("#d6332b", "circle"), ("#f2c94c", "rect"), ("#3f9b44", "circle"))):
    t0 = S3 + 1.0 + i * 0.35
    objs.append(dict(id=f"ingr{i}", type=kind, fill=col, start=t0, end=S3 + 4.1, z=3.5,
                     **({"r": 9} if kind == "circle" else {"w": 14, "h": 20}),
                     keys=[{"t": t0, "x": 220, "y": 230, "scale": 0.6},
                           {"t": t0 + 0.2, "x": 260, "y": 170, "ease": "out", "scale": 1, "rotation": 120},
                           {"t": t0 + 0.4, "x": PAN_X - 10 + 10 * i, "y": PAN_Y - 6, "ease": "in", "scale": 0.8, "rotation": 260},
                           {"t": S3 + 4.0, "x": PAN_X - 10 + 10 * i, "y": PAN_Y - 6, "rotation": 260 + 360 * 3}]))
for i in range(6):  # steam puffs
    t0 = S3 + 1.4 + i * 0.4
    objs.append(circ(f"steam{i}", 0, 0, 9, "#ffffffcc", t0, t0 + 1.4, 4,
                     keys=[{"t": t0, "x": PAN_X - 15 + 10 * (i % 3), "y": PAN_Y - 12, "scale": 0.4, "opacity": 0.9},
                           {"t": t0 + 1.4, "x": PAN_X - 25 + 22 * (i % 3), "y": PAN_Y - 90, "scale": 1.8, "opacity": 0, "ease": "out"}]))
# final plate pops in
PLATE = dict(x=430, y=232)
objs += [dict(id="plate", type="ellipse", rx=46, ry=11, fill="#ffffff", stroke="#c9d3da", stroke_width=2,
              start=S3 + 4.0, end=DUR, z=5,
              keys=[{"t": S3 + 4.0, **PLATE, "scale": 0}, {"t": S3 + 4.35, **PLATE, "scale": 1, "ease": "back"}]),
         dict(id="spaghetti", type="ellipse", rx=28, ry=10, fill="#f2c94c", start=S3 + 4.1, end=DUR, z=5.5,
              keys=[{"t": S3 + 4.1, "x": PLATE["x"], "y": 224, "scale": 0}, {"t": S3 + 4.45, "x": PLATE["x"], "y": 224, "scale": 1, "ease": "back"}]),
         dict(id="sauce", type="circle", r=9, fill="#c0282d", start=S3 + 4.2, end=DUR, z=6,
              keys=[{"t": S3 + 4.2, "x": PLATE["x"], "y": 219, "scale": 0}, {"t": S3 + 4.5, "x": PLATE["x"], "y": 219, "scale": 1, "ease": "back"}]),
         dict(id="leaf", type="ellipse", rx=5, ry=3, fill="#3f9b44", start=S3 + 4.3, end=DUR, z=6.5,
              keys=[{"t": S3 + 4.3, "x": PLATE["x"] + 4, "y": 214, "scale": 0}, {"t": S3 + 4.6, "x": PLATE["x"] + 4, "y": 214, "scale": 1, "ease": "back"}]),
         text("final", 320, 60, "SMACZNEGO!", 40, "#c0282d", S3 + 4.4, DUR, 30,
              keys=[{"t": S3 + 4.4, "x": 320, "y": 60, "scale": 0.3, "opacity": 0},
                    {"t": S3 + 4.8, "x": 320, "y": 60, "scale": 1.1, "opacity": 1, "ease": "back"},
                    {"t": DUR, "x": 320, "y": 60, "scale": 1, "rotation": -4}])]
for i in range(5):  # sparkles
    t0 = S3 + 4.6 + i * 0.15
    objs.append(dict(id=f"spark{i}", type="star", points=4, r=8, inner=2, fill="#ffd34d", start=t0, end=DUR, z=29,
                     keys=[{"t": t0, "x": 380 + 25 * i, "y": 200 - 18 * (i % 2), "scale": 0},
                           {"t": t0 + 0.3, "x": 380 + 25 * i, "y": 200 - 18 * (i % 2), "scale": 1, "ease": "back"},
                           {"t": DUR, "x": 380 + 25 * i, "y": 200 - 18 * (i % 2), "scale": 0.7, "rotation": 180}]))

# ---- character: sample rig once per frame
for o in objs:  # stretch scenery/prop timings
    for f in ("start", "end"):
        if f in o: o[f] = round(o[f] * K, 4)
    for k in o.get("keys", []): k["t"] = round(k["t"] * K, 4)
frames = [i / FPS for i in range(int(DUR * K * FPS) + 1)]
samples = [parts(t / K, t) for t in frames]
for pid, shape, z in RIG:
    o = dict(id=pid, z=z, **shape)
    o["keys"] = [dict(t=round(t, 4), ease="linear", **{k: round(v, 2) for k, v in s[pid].items()})
                 for t, s in zip(frames, samples)]
    objs.append(o)

# ---- black dip between scenes
fade = []
for c in (S2, S3):
    fade += [{"t": c - 0.35, "opacity": 0}, {"t": c, "opacity": 1, "ease": "in"}, {"t": c + 0.3, "opacity": 0, "ease": "out"}]
objs.append(rect("fade", 320, 180, 640, 360, "#000000", 0, DUR * K, 100, keys=[dict(k, t=k["t"] * K) for k in fade], opacity=0))

scene = dict(title="Mullet chef: shop run and dinner", width=W, height=H, fps=FPS, duration=DUR * K,
             hold=1, background="#000000", objects=objs)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scene.json")
json.dump(scene, open(out, "w"), indent=1)
print("wrote", out, len(objs), "objects")
