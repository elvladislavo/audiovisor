"""Second character: curly updo, sunglasses on head, brown suede halter mini dress,
big silver-buckle belt, pleated skirt, dark tights, gold bangles, grilled skewer.
Story times are in the 14 s story clock (scaled later by generate.py)."""
import math

S2, S3, DUR = 4.5, 9.0, 14.0
GROUND = {2: 318, 3: 318}
G = dict(skin="#efc3a4", skin_dk="#d9a888", hair="#2e1d14", suede="#6e5646", suede_dk="#54412f",
         suede_lt="#86705e", tights="#3d302a", shoe="#1f1713", silver="#dfe3e8", gold="#d4a63a",
         lips="#8a5058", smoky="#3a2f3a")

def lerp(a, b, u): return a + (b - a) * max(0, min(1, u))
def smooth(u): u = max(0, min(1, u)); return u * u * (3 - 2 * u)

def pose(t, rt):
    p = dict(x=-200, y=318, d=-1, walk=0, phase=0, armF=None, armB=None, vis=0, skewer=0,
             talk=0, bite=0, bob=0, scale=1.0)
    if S2 <= t < S3:  # shop: browsing the drinks fridge, then turns and waves at him
        lt = t - S2; p.update(vis=1, y=GROUND[2])
        if lt < 1.0:     # still a cat
            p.update(vis=0, x=120, d=1)
        elif lt < 1.3:   # pops out of the poof
            u = smooth((lt - 1.0) / 0.24)
            p.update(x=120, d=1, scale=0.25 + 0.75 * u + 0.08 * math.sin(u * math.pi), vis=min(1, u * 1.6),
                     armF=("ang", -60, -95), armB=("ang", 60, 95))
        elif lt < 2.3:  # reaches into the fridge, rummaging between the bottles
            p.update(x=120, d=-1, armF=("scr", 84 + 6 * math.sin(rt * 5), 212 + 5 * math.cos(rt * 4)),
                     armB=("ang", 6, -10))
        elif lt < 3.6:  # turns, waves (forearm swings from the elbow)
            p.update(x=120, d=1, armF=("ang", -138, -172 + 28 * math.sin(rt * 10)), armB=("ang", 6, -12),
                     talk=1 if lt < 3.0 else 0)
        else:           # relaxed: hand on hip, the other loose
            p.update(x=120, d=1, armB=("tgt", -18, -74), armF=("ang", -4, -20), bob=1.5 * math.sin(rt * 3))
    elif t >= S3:  # kitchen: comes in at the end, tastes
        lt = t - S3; p.update(y=GROUND[3], vis=1 if lt > 3.3 else 0, x=700)
        if 3.3 <= lt < 4.3:
            p.update(x=lerp(700, 545, (lt - 3.3)), walk=1, phase=rt * 2 * math.pi * 1.5, skewer=1)
        elif lt >= 4.3:
            p.update(x=545, skewer=1)
            if lt < 4.9:   # skewer up to the mouth, bite
                p.update(armF=("tgt", 22, -112), armB=("ang", 6, -10), bite=1 if lt > 4.55 else 0)
            else:          # chewing, "mmm" gesture with the free hand
                p.update(armF=("tgt", 20, -86), armB=("ang", -38 + 8 * math.sin(rt * 6), -120 + 10 * math.sin(rt * 6)),
                         talk=1 if lt < 5.6 else 0, bob=1.5 * math.sin(rt * 6))
    return p

import arms
BLEND = arms.ArmBlender(0.26)
UPPER, FORE = 27, 25
MOUTH = (2, -140)

def parts(t, rt):
    p = pose(t, rt); d, sc = p["d"], p["scale"]
    sw = math.sin(p["phase"]) * 24 * p["walk"]
    bob = abs(math.cos(p["phase"])) * -3 * p["walk"] + p["bob"]
    X, Y, op = p["x"], p["y"] + bob, p["vis"]

    def at(lx, ly, **kw): return dict(x=X + lx * d * sc, y=Y + ly * sc, opacity=op, scale=sc, **kw)
    def limb(px, py, length, ang):
        a = math.radians(ang); return px - math.sin(a) * length / 2 * d, py + math.cos(a) * length / 2

    out = {}
    hip = (0, -60)
    for n, ang in (("B", -sw), ("F", sw)):
        cx, cy = limb(hip[0], hip[1], 58, ang)
        out["g_leg" + n] = at(cx, cy, rotation=ang * d)
        fx, fy = limb(hip[0], hip[1], 116, ang)
        out["g_shoe" + n] = at(fx + 4, fy - 2)
    def to_local(sx_, sy_): return (sx_ - X) * d / sc, (sy_ - Y) / sc
    for side, sh_x, ph in (("F", 12, 1), ("B", -12, -1)):
        sh = (sh_x, -123)
        sw_a = -ph * sw * 0.55
        walk = (sw_a, sw_a - 16 - 5 * ph * math.sin(p["phase"]) * p["walk"])
        spec = arms.resolve(p["arm" + side], sh, UPPER, FORE, to_local)
        a1, a2 = BLEND("g" + side, walk, spec)
        out["g_sh" + side] = at(*sh)
        elbow, hand = arms.arm_parts(out, ("g_arm" + side, "g_elbow" + side, "g_fore" + side, "g_hand" + side),
                                     sh, a1, a2, UPPER, FORE, at, d)
        bx, by = arms.bone_end(elbow[0], elbow[1], a2, FORE * 0.78)
        out["g_bangle" + side] = at(bx, by, rotation=a2 * d)
        if side == "F":  # skewer: upright, or tilted into the mouth while biting
            if p["bite"]:  # skewer runs from the hand and ends at her lips
                direction = (MOUTH[0] - hand[0], MOUTH[1] - hand[1])
                L = max(12, min(34, math.hypot(*direction)))
                arms.held_stick(out, "g_skewer", "g_skewer_tip", hand, direction, L, at, d, tip_len=L)
                out["g_skewer"]["sy"] = L / 34
            else:
                arms.held_stick(out, "g_skewer", "g_skewer_tip", hand, (0.15, -1), 34, at, d, tip_len=36)
            out["g_skewer"]["opacity"] = out["g_skewer_tip"]["opacity"] = op * p["skewer"]
    blink = 0.15 if (rt % 2.7) < 0.12 else 1
    mouth = 1 + (1.6 * abs(math.sin(rt * 14)) if p["talk"] else 0) + (1.4 if p["bite"] else 0)
    out["g_shadow"] = dict(x=X, y=p["y"] + 2, opacity=op, scale=sc)
    out.update(
        g_skirt=at(0, -60), g_pleat1=at(-10, -58, rotation=-12 * d), g_pleat2=at(0, -57), g_pleat3=at(10, -58, rotation=12 * d),
        g_belt=at(0, -78), g_buckle=at(4, -78), g_grom1=at(-9, -79), g_grom2=at(-14, -79),
        g_chest=at(0, -114), g_shoulders=at(0, -120), g_bodice=at(0, -100), g_neck=at(0, -136),
        g_strapL=at(-6, -128, rotation=20 * d), g_strapR=at(6, -128, rotation=-20 * d),
        g_hairback=at(0, -150), g_head=at(1, -150),
        g_bun=at(-2, -170), g_curl1=at(-13, -158), g_curl2=at(13, -158), g_tend1=at(-13, -142), g_tend2=at(14, -141),
        g_curl3=at(-8, -166), g_curl4=at(8, -166),
        g_shadesL=at(-6, -164), g_shadesR=at(7, -164), g_shbridge=at(0, -165),
        g_eyeL=at(-4, -151, sy=blink), g_eyeR=at(7, -151, sy=blink),
        g_pupL=at(-3, -151, sy=blink), g_pupR=at(8, -151, sy=blink),
        g_browL=at(-4, -157), g_browR=at(7, -157),
        g_nose=at(2, -146), g_lips=at(2, -140, sy=mouth),
        g_earL=at(-12, -144), g_earR=at(13, -144),
    )
    return out

def shape(**kw): return kw
RIG = [
    ("g_shadow", shape(type="ellipse", rx=28, ry=5, fill="#00000070", blur=3, flat=True), 5.9),
    ("g_armB", shape(type="rect", w=8.5, h=27, fill=G["skin_dk"]), 6.0),
    ("g_shB", shape(type="circle", r=5, fill=G["skin_dk"]), 5.99),
    ("g_elbowB", shape(type="circle", r=4, fill=G["skin_dk"]), 6.01),
    ("g_foreB", shape(type="rect", w=7.5, h=25, fill=G["skin_dk"]), 6.02),
    ("g_bangleB", shape(type="rect", w=12, h=5, fill=G["gold"]), 6.05),
    ("g_handB", shape(type="circle", r=5, fill=G["skin_dk"]), 6.1),
    ("g_legB", shape(type="rect", w=11, h=58, fill=G["tights"]), 6.2),
    ("g_shoeB", shape(type="ellipse", rx=9, ry=4, fill=G["shoe"]), 6.3),
    ("g_legF", shape(type="rect", w=11, h=58, fill=G["tights"]), 6.4),
    ("g_shoeF", shape(type="ellipse", rx=9, ry=4, fill=G["shoe"]), 6.5),
    ("g_hairback", shape(type="ellipse", rx=16, ry=19, fill=G["hair"]), 6.6),
    ("g_neck", shape(type="rect", w=9, h=10, fill=G["skin"]), 6.7),
    ("g_shoulders", shape(type="ellipse", rx=16, ry=7, fill=G["skin"]), 6.75),
    ("g_chest", shape(type="ellipse", rx=15, ry=13, fill=G["skin"]), 6.8),
    ("g_bodice", shape(type="polygon", points=[[-14, 18], [14, 18], [15, -8], [7, -24], [0, -2], [-7, -24], [-15, -8]],
                       fill=G["suede"], stroke=G["suede_dk"], stroke_width=1), 6.9),
    ("g_strapL", shape(type="rect", w=3, h=14, fill=G["suede"]), 6.95),
    ("g_strapR", shape(type="rect", w=3, h=14, fill=G["suede"]), 6.95),
    ("g_skirt", shape(type="polygon", points=[[-16, -16], [16, -16], [30, 16], [-30, 16]],
                      fill=G["suede"], stroke=G["suede_dk"], stroke_width=1), 7.0),
    ("g_pleat1", shape(type="rect", w=1.5, h=28, fill=G["suede_dk"]), 7.05),
    ("g_pleat2", shape(type="rect", w=1.5, h=28, fill=G["suede_dk"]), 7.05),
    ("g_pleat3", shape(type="rect", w=1.5, h=28, fill=G["suede_dk"]), 7.05),
    ("g_belt", shape(type="rect", w=38, h=8, fill=G["suede_dk"]), 7.1),
    ("g_buckle", shape(type="rect", w=12, h=11, fill="#00000000", stroke=G["silver"], stroke_width=2), 7.15),
    ("g_grom1", shape(type="circle", r=1.3, fill=G["silver"]), 7.15),
    ("g_grom2", shape(type="circle", r=1.3, fill=G["silver"]), 7.15),
    ("g_head", shape(type="ellipse", rx=12, ry=15, fill=G["skin"]), 7.2),
    ("g_earL", shape(type="polygon", points=[[0, -3], [2.5, 1], [0, 6], [-2.5, 1]], fill=G["silver"]), 7.25),
    ("g_earR", shape(type="polygon", points=[[0, -3], [2.5, 1], [0, 6], [-2.5, 1]], fill=G["silver"]), 7.25),
    ("g_eyeL", shape(type="ellipse", rx=3.4, ry=2.2, fill="#f4f1ee", stroke=G["smoky"], stroke_width=2), 7.3),
    ("g_eyeR", shape(type="ellipse", rx=3.4, ry=2.2, fill="#f4f1ee", stroke=G["smoky"], stroke_width=2), 7.3),
    ("g_pupL", shape(type="circle", r=1.3, fill="#4f6a5a"), 7.35),
    ("g_pupR", shape(type="circle", r=1.3, fill="#4f6a5a"), 7.35),
    ("g_browL", shape(type="rect", w=7, h=1.5, fill=G["hair"]), 7.35),
    ("g_browR", shape(type="rect", w=7, h=1.5, fill=G["hair"]), 7.35),
    ("g_nose", shape(type="ellipse", rx=1.5, ry=3, fill=G["skin_dk"]), 7.35),
    ("g_lips", shape(type="ellipse", rx=4, ry=1.8, fill=G["lips"]), 7.35),
    ("g_tend1", shape(type="ellipse", rx=2.5, ry=9, fill=G["hair"]), 7.4),
    ("g_tend2", shape(type="ellipse", rx=2.5, ry=9, fill=G["hair"]), 7.4),
    ("g_curl1", shape(type="circle", r=6, fill=G["hair"]), 7.4),
    ("g_curl2", shape(type="circle", r=6, fill=G["hair"]), 7.4),
    ("g_curl3", shape(type="circle", r=7, fill=G["hair"]), 7.4),
    ("g_curl4", shape(type="circle", r=7, fill=G["hair"]), 7.4),
    ("g_bun", shape(type="circle", r=9, fill=G["hair"]), 7.45),
    ("g_shadesL", shape(type="ellipse", rx=6, ry=3.5, fill="#1a1612", stroke="#8a8f99", stroke_width=1), 7.5),
    ("g_shadesR", shape(type="ellipse", rx=6, ry=3.5, fill="#1a1612", stroke="#8a8f99", stroke_width=1), 7.5),
    ("g_shbridge", shape(type="rect", w=3, h=1.5, fill="#8a8f99"), 7.5),
    ("g_armF", shape(type="rect", w=8.5, h=27, fill=G["skin"]), 7.6),
    ("g_shF", shape(type="circle", r=5, fill=G["skin"]), 7.59),
    ("g_elbowF", shape(type="circle", r=4, fill=G["skin"]), 7.61),
    ("g_foreF", shape(type="rect", w=7.5, h=25, fill=G["skin"]), 7.62),
    ("g_bangleF", shape(type="rect", w=12, h=5, fill=G["gold"], stroke="#a87e22", stroke_width=1), 7.65),
    ("g_skewer", shape(type="rect", w=6, h=34, fill="#a8442a", stroke="#5a1f12", stroke_width=1), 7.68),
    ("g_skewer_tip", shape(type="rect", w=2, h=10, fill="#c8a06a"), 7.67),
    ("g_handF", shape(type="circle", r=5, fill=G["skin"]), 7.7),
]

def extra_objects():
    """Speech bubbles / reactions (story time)."""
    def bubble(id, x, y, txt, t0, t1, w):
        return [dict(id=id + "_b", type="ellipse", rx=w, ry=16, fill="#ffffff", stroke="#2b2b2f", stroke_width=2,
                     x=x, y=y, start=t0, end=t1, z=32,
                     keys=[{"t": t0, "scale": 0}, {"t": t0 + 0.2, "scale": 1, "ease": "back"}]),
                dict(id=id + "_tail", type="polygon", points=[[-5, 0], [5, 0], [-2, 12]], fill="#ffffff",
                     x=x - 10, y=y + 14, start=t0 + 0.1, end=t1, z=31.9),
                dict(id=id, type="text", text=txt, size=14, fill="#2b2b2f", x=x, y=y, start=t0 + 0.1, end=t1, z=33)]
    o = []
    o += bubble("say_hej", 150, 120, "hej!", S2 + 2.3, S2 + 3.3, 28)
    o += bubble("say_his", 268, 112, "hej!", S2 + 3.0, S2 + 3.5, 28)
    o += bubble("say_mmm", 556, 100, "Mmm! Pyszne!", S3 + 4.6, DUR, 56)
    for i in range(3):  # and from him, as he answers
        t0 = S2 + 3.05 + i * 0.12
        o.append(dict(id=f"hhrt{i}", type="text", text="♥", size=14, fill="#e0303a", start=t0, end=t0 + 1.1, z=30,
                      keys=[{"t": t0, "x": 240 - 8 * i, "y": 175, "opacity": 0},
                            {"t": t0 + 0.2, "x": 236 - 8 * i, "y": 160, "opacity": 1},
                            {"t": t0 + 1.1, "x": 228 - 10 * i, "y": 118, "opacity": 0}]))
    for i in range(3):  # little hearts float up from her in the shop
        t0 = S2 + 2.6 + i * 0.3
        o.append(dict(id=f"ghrt{i}", type="text", text="♥", size=14, fill="#e0303a", start=t0, end=t0 + 1.1, z=30,
                      keys=[{"t": t0, "x": 125 + 8 * i, "y": 165, "opacity": 0},
                            {"t": t0 + 0.2, "x": 128 + 8 * i, "y": 150, "opacity": 1},
                            {"t": t0 + 1.1, "x": 135 + 10 * i, "y": 110, "opacity": 0}]))
    return o
