"""Realism pass: depth of field, surface textures, soft lighting, contact shadows and
ambient occlusion. Works on the finished object list (times already in real seconds)."""

# far background -> blurred (px at 640x360 scale)
BLUR = {
    "sky": 2, "moon": 2.5, "roofline": 1.2, "kmoon": 2, "window": 0.8,
    "lampglow": 10, "lightcone": 6, "candleglow": 8,
    "shopbg": 0.6, "kitbg": 0.6, "tiles": 0.5, 
}
BLUR_PREFIX = {"logo_": 0.4, "upwin": 1.2, "star": 0.8, "brick": 0.6, "steam": 3, "cab": 0.3, "bottle": 0.3}

# rough surfaces: plaster, asphalt, wool, suede, wood, tiles
TEXTURE = {
    "wall": (1.6, 3), "pavement": (1.4, 2), "shopfront": (1.2, 3), "shopbg": (0.7, 4), "shopfloor": (0.9, 2),
    "kitbg": (0.5, 5), "tiles": (0.6, 3), "kitfloor": (1.4, 2), "kfloor2": (1, 2), "counter": (0.9, 2),
    "shelf": (1.4, 1.5), "door": (0.6, 3), "till": (0.6, 2), "board": (1.2, 1),
    "coat": (1.3, 1), "armF": (1.1, 1), "armB": (1.1, 1), "legF": (0.6, 1), "legB": (0.6, 1),
    "g_bodice": (1.6, 1), "g_skirt": (1.6, 1), "g_belt": (1.2, 1), "g_strapL": (1, 1), "g_strapR": (1, 1),
    "hairBack": (1.4, 1), "hairL": (1.4, 1), "hairR": (1.4, 1), "hairTop": (1.4, 1), "g_hairback": (1.4, 1),
    "beard": (1.2, 1), "cashbody": (0.8, 1), "fridge": (0.3, 3), "kfridge": (0.3, 3),
}
TEXTURE_PREFIX = {"tile": (0.9, 2), "cab": (0.8, 2), "plank": (1.2, 1), "brick": (1.2, 1)}

# glows / lights / overlays must stay flat (no top-light gradient)
FLAT_PREFIX = ("lampglow", "lightcone", "candleglow", "headlight", "fade", "steam", "shadow", "g_shadow",
               "pool_", "ao_", "spill_", "glint", "say_", "ghrt", "heart", "note", "spark", "bulb", "flame")


def apply(objs, S1, S2, S3, END, K):
    for o in objs:
        oid = o.get("id", "")
        b = BLUR.get(oid) or next((v for p, v in BLUR_PREFIX.items() if oid.startswith(p)), 0)
        if b: o["blur"] = b
        tx = TEXTURE.get(oid) or next((v for p, v in TEXTURE_PREFIX.items() if oid.startswith(p)), None)
        if tx: o["texture"], o["texture_grain"] = tx
        if oid.startswith(FLAT_PREFIX) or o.get("type") == "text": o["flat"] = True

    s1, s2, s3 = S1 * K, S2 * K, S3 * K

    def add(**kw): kw.setdefault("flat", True); objs.append(kw)

    # ---- street: pools of light, door spill, wet-asphalt reflections, AO along wall base
    add(id="pool_lamp", type="ellipse", rx=110, ry=16, fill="#ffd9905a", x=600, y=330, start=s1, end=s2, z=2.45, blur=8)
    add(id="spill_door", type="polygon", points=[[-34, 0], [34, 0], [70, 40], [-70, 40]], fill="#f3d98c44",
        x=455, y=314, start=s1, end=s2, z=2.46, blur=6)
    add(id="pool_win", type="ellipse", rx=50, ry=8, fill="#f3d98c33", x=530, y=322, start=s1, end=s2, z=2.46, blur=6)
    add(id="refl_lamp", type="rect", w=10, h=30, fill="#ffe9a830", x=600, y=345, start=s1, end=s2, z=2.47, blur=4)
    add(id="ao_street", type="rect", w=640, h=16, gradient=["#00000000", "#00000066"], x=320, y=306,
        start=s1, end=s2, z=2.3, blur=2)
    add(id="ao_sky", type="rect", w=640, h=60, gradient=["#00000000", "#05081555"], x=320, y=30,
        start=s1, end=s2, z=0.7)
    # ---- shop: floor/wall junction shadow, light pool under the lamp, fridge glow
    add(id="ao_shop", type="rect", w=640, h=20, gradient=["#00000000", "#00000040"], x=320, y=312,
        start=s2, end=s3, z=1.05, blur=2)
    add(id="pool_shop", type="ellipse", rx=150, ry=18, fill="#fff2c440", x=255, y=328, start=s2, end=s3, z=1.2, blur=10)
    add(id="spill_fridge", type="rect", w=110, h=210, fill="#d7f4ff30", x=80, y=225, start=s2, end=s3, z=1.45, blur=10)
    add(id="ao_shelf", type="rect", w=200, h=10, gradient=["#00000000", "#00000055"], x=255, y=278,
        start=s2, end=s3, z=1.9, blur=2)
    # ---- kitchen: under-cabinet light, counter shadow, warm window glow
    add(id="ao_kitchen", type="rect", w=640, h=20, gradient=["#00000000", "#00000045"], x=320, y=312,
        start=s3, end=END, z=1.05, blur=2)
    add(id="spill_cab", type="rect", w=300, h=40, gradient=["#fff4d055", "#fff4d000"], x=190, y=135,
        start=s3, end=END, z=0.65, blur=4)
    add(id="ao_counter", type="rect", w=300, h=12, gradient=["#00000055", "#00000000"], x=380, y=327,
        start=s3, end=END, z=1.12, blur=3)
    add(id="pool_stove", type="ellipse", rx=50, ry=14, fill="#ff9a4a30", x=300, y=226,
        start=s3 + 0.9 * K, end=s3 + 4.1 * K, z=2.55, blur=8)
