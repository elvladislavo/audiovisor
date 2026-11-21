#!/usr/bin/env python3
"""Vertical (9:16) cut of the mullet chef animation.

Takes scene.json (the 16:9 stage), extends the scenery above and below the stage so a
tall frame has something to show, adds a virtual camera that follows the action, and
moves the on-screen titles into the frame. Writes scene_vertical.json.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
scene = json.load(open(os.path.join(HERE, "scene.json")))
objs = scene["objects"]
byid = {o["id"]: o for o in objs}
K = 30 / 14
C1, C2, END = 4.5 * K, 9.0 * K, scene["duration"]   # real-time cuts: street | shop | kitchen
OUT_W, OUT_H = 1080, 1920
GROUND = 318


def rect(id, x, y, w, h, fill, s, e, z, **kw):
    return dict(id=id, type="rect", x=x, y=y, w=w, h=h, fill=fill, start=s, end=e, z=z, **kw)


ext = []
# ---- street: night sky above, pavement and road below
ext += [rect("v_sky", 320, -170, 640, 340, "#191c2a", 0, C1, 0, gradient=["#090b14", "#191c2a"], flat=True),
        rect("v_pave", 320, 385, 640, 50, "#3a3836", 0, C1, 2, texture=1.4, texture_grain=2),
        rect("v_kerb", 320, 412, 640, 6, "#5c5853", 0, C1, 2.1),
        rect("v_road", 320, 540, 640, 250, "#232428", 0, C1, 2, texture=1.2, texture_grain=2),
        rect("v_road_glow", 600, 440, 160, 40, "#ffd9902a", 0, C1, 2.2, blur=12, flat=True)]
for i in range(7):
    ext.append(rect(f"v_lane{i}", 40 + i * 100, 480, 44, 4, "#b9b29c", 0, C1, 2.2))
for i, (x, y) in enumerate(((60, -160), (180, -60), (300, -200), (420, -110), (540, -180), (610, -40), (110, -240))):
    ext.append(dict(id=f"v_star{i}", type="circle", r=1.6, fill="#ffffff", x=x, y=y, start=0, end=C1, z=0.6, flat=True,
                    keys=[{"t": 0.4 * i, "opacity": 0.25}, {"t": 0.4 * i + 1.5, "opacity": 1}, {"t": C1, "opacity": 0.4}]))
# ---- shop: wall up to the ceiling, longer lamp cord, more floor tiles
ext += [rect("v_shopwall", 320, -150, 640, 300, "#efe4c8", C1, C2, 0, texture=0.7, texture_grain=4),
        rect("v_shopceil", 320, -265, 640, 70, "#d8ccb0", C1, C2, 0.2),
        rect("v_cornice", 320, -228, 640, 6, "#c4b48f", C1, C2, 0.3),
        rect("v_cord", 255, -110, 2, 230, "#333333", C1, C2, 1)]
for r in range(4):
    for c in range(17):
        ext.append(rect(f"v_tile{r}_{c}", c * 40 + (20 if r % 2 else 0), 380 + r * 40, 40, 40,
                        ("#d9c49a", "#b8a27a")[(c + r) % 2], C1, C2, 1.1, texture=0.9, texture_grain=2))
# ---- kitchen: wall and ceiling with a pendant lamp over the counter, wooden floor
ext += [rect("v_kitwall", 320, -150, 640, 300, "#cfe3e0", C2, END, 0, texture=0.5, texture_grain=5),
        rect("v_kitceil", 320, -265, 640, 70, "#e7efee", C2, END, 0.2),
        rect("v_kcord", 380, -170, 2, 120, "#4a4f55", C2, END, 1),
        dict(id="v_kshade", type="polygon", points=[[-22, 10], [22, 10], [12, -8], [-12, -8]], fill="#c0282d",
             x=380, y=-102, start=C2, end=END, z=1.2),
        dict(id="v_kglow", type="polygon", points=[[-22, 0], [22, 0], [110, 220], [-110, 220]], fill="#fff6c81e",
             x=380, y=-92, start=C2, end=END, z=1.3, blur=8, flat=True),
        rect("v_kfloor", 320, 470, 640, 260, "#8a6d55", C2, END, 1, texture=1.4, texture_grain=2)]
for i in range(8):
    ext.append(rect(f"v_plank{i}", 320, 372 + i * 30, 640, 2, "#6f5543", C2, END, 1.05))
objs += ext

# ---- titles into the frame
byid["fade"].update(w=4000, h=4000)


# ---- camera: (real time, centre x, visible width); centre y keeps the floor low in frame
def cam_key(t, x, w, ease="inout"):
    h = w * OUT_H / OUT_W
    x = min(max(x, w / 2), 640 - w / 2)          # never show past the stage edges
    return {"t": round(t, 3), "x": x, "y": GROUND - 0.28 * h, "w": w, "ease": ease}

keys = [cam_key(0, 190, 380), cam_key(3.2, 230, 380), cam_key(7.6, 440, 300), cam_key(9.4, 455, 250),
        # shop (cut)
        cam_key(C1, 150, 300, "step"), cam_key(11.7, 140, 280), cam_key(12.6, 185, 330), cam_key(16.9, 185, 330),
        cam_key(18.0, 500, 270), cam_key(C2 - 0.01, 505, 260),
        # kitchen (cut)
        cam_key(C2, 170, 340, "step"), cam_key(21.6, 335, 270), cam_key(26.0, 345, 280), cam_key(28.2, 452, 376),
        cam_key(END, 452, 376)]
scene["camera"] = {"keys": keys}
scene["output_size"] = [OUT_W, OUT_H]
scene["supersample"] = 1.5
scene["title"] += " (vertical)"
json.dump(scene, open(os.path.join(HERE, "scene_vertical.json"), "w"))
print("wrote scene_vertical.json", len(objs), "objects")
