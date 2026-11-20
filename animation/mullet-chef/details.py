"""Extra scenery, props and background life. Times are story-time (scaled later)."""
import math


def lerp(a, b, u): return a + (b - a) * max(0, min(1, u))
def smooth(u): u = max(0, min(1, u)); return u * u * (3 - 2 * u)


def make_cat(prefix, t0, t1, path, color="#141414", step=0.04):
    """A small walking cat (body, head, ears, eyes, tail, four legs) following path(t)."""
    parts = {  # id: (shape, local x, local y, z)
        "tail": (dict(type="line", points=[[0, 0], [-6, -7], [-7, -17]], stroke=color, stroke_width=3), -12, -10, 5.0),
        "legB1": (dict(type="rect", w=3, h=9, fill=color), -8, -4, 5.0), "legB2": (dict(type="rect", w=3, h=9, fill=color), 7, -4, 5.0),
        "body": (dict(type="ellipse", rx=13, ry=7, fill=color), 0, -10, 5.1),
        "legF1": (dict(type="rect", w=3, h=9, fill=color), -5, -4, 5.2), "legF2": (dict(type="rect", w=3, h=9, fill=color), 10, -4, 5.2),
        "head": (dict(type="circle", r=6, fill=color), 13, -16, 5.3),
        "ear1": (dict(type="polygon", points=[[-3, 0], [3, 0], [0, -6]], fill=color), 10, -21, 5.3),
        "ear2": (dict(type="polygon", points=[[-3, 0], [3, 0], [0, -6]], fill=color), 16, -21, 5.3),
        "eye": (dict(type="circle", r=1.3, fill="#c8f04a"), 16, -17, 5.4),
    }
    out = {k: dict(id=f"{prefix}_{k}", start=t0, end=t1, z=v[3], flat=True, keys=[], **v[0]) for k, v in parts.items()}
    n = int((t1 - t0) / step) + 1
    for i in range(n):
        t = t0 + i * step
        c = path(t); ph = t * 2 * math.pi * 2.6
        for k, (shape, lx, ly, z) in parts.items():
            key = dict(t=round(t, 4), x=c["x"] + lx * c["dir"] * c["s"], y=c["y"] + ly * c["s"],
                       scale=c["s"], opacity=c["op"], ease="linear")
            if k.startswith("leg"):
                sgn = 1 if k in ("legB1", "legF2") else -1
                key["rotation"] = 28 * sgn * math.sin(ph) * c["walk"] * c["dir"]
            if k == "tail":
                key["rotation"] = 12 * math.sin(t * 5) * c["dir"]; key["sx"] = c["dir"]
            if k == "body":
                key["y"] += -1.2 * abs(math.sin(ph)) * c["walk"]
            out[k]["keys"].append(key)
    return list(out.values())


def add_details(objs, rect, circ, text, S1, S2, S3, DUR, GROUND):
    def o(**kw): objs.append(kw)

    # ================= street =================
    # bricks / plaster cracks on the wall
    for r in range(6):
        for c in range(9):
            if (r * 7 + c * 3) % 5 == 0:
                objs.append(rect(f"brick{r}_{c}", 30 + c * 72 + (r % 2) * 36, 155 + r * 26, 30, 10,
                                 "#665850", S1, S2, 1.2))
    # upper-floor apartment windows, some lit, one switches off
    for i, x in enumerate((60, 200, 340, 600)):
        lit = "#f3c66b" if i % 2 == 0 else "#2a3550"
        w = rect(f"upwin{i}", x, 112, 46, 36, lit, S1, S2, 0.8, stroke="#2a201b", stroke_width=4)
        if i == 2:
            w["fill"] = "#f3c66b"
            w["keys"] = [{"t": 0, "opacity": 1}, {"t": 2.5, "opacity": 1}, {"t": 2.55, "opacity": 0.15, "ease": "step"}]
        objs.append(w)
    objs.append(rect("roofline", 320, 88, 640, 8, "#3b322d", S1, S2, 0.9))
    # street lamp with flickering glow
    o(id="lampglow", type="circle", r=70, fill="#ffd27a33", x=600, y=150, start=S1, end=S2, z=1.5,
      keys=[{"t": i * 0.3, "opacity": 0.7 + 0.3 * ((i * 7) % 3 == 0)} for i in range(16)])
    objs += [rect("lamppost", 600, 240, 6, 180, "#2b2b2f", S1, S2, 3),
             rect("lamphead", 600, 148, 26, 12, "#2b2b2f", S1, S2, 3),
             circ("bulb", 600, 156, 6, "#ffe9a8", S1, S2, 3.1)]
    # pavement details: kerb, cracks, bin, cat
    objs += [rect("kerb", 320, 314, 640, 4, "#575350", S1, S2, 2.4),
             rect("crack1", 90, 340, 30, 2, "#252321", S1, S2, 2.5, rotation=10),
             rect("crack2", 380, 330, 22, 2, "#252321", S1, S2, 2.5, rotation=-15),
             rect("bin", 360, 292, 26, 36, "#2f4f3a", S1, S2, 3.5, stroke="#1d3326", stroke_width=2),
             rect("binlid", 360, 273, 30, 5, "#1d3326", S1, S2, 3.6),
             text("open", 455, 222, "OTWARTE", 9, "#2f7d4f", S1, S2, 4),
             circ("apple1", 522, 268, 6, "#d6332b", S1, S2, 3.5),
             circ("apple2", 536, 268, 6, "#e85d2a", S1, S2, 3.5),
             circ("apple3", 529, 258, 6, "#c9a24a", S1, S2, 3.5)]
    # the cat walks along the pavement and slips in through the shop door
    def street_cat(t):
        if t < 1.9: return dict(x=lerp(650, 470, t / 1.9), y=310, dir=-1, s=1, op=1, walk=1)
        u = (t - 1.9) / 0.45
        return dict(x=lerp(470, 456, u), y=lerp(310, 300, u), dir=-1, s=lerp(1, 0.7, u), op=1 - smooth(u), walk=1)
    objs.extend(make_cat("cat", S1, S1 + 2.4, street_cat))
    # falling leaves
    for i in range(5):
        x0, t0 = 80 + i * 130, 0.2 + i * 0.7
        o(id=f"leaf{i}", type="ellipse", rx=5, ry=2.5, fill=("#c26a2a", "#d9a03a")[i % 2], start=t0, end=S2, z=25,
          keys=[{"t": t0 + j * 0.3, "x": x0 + 18 * math.sin(j * 1.3) + j * 8, "y": 90 + j * 22,
                 "rotation": j * 50, "ease": "linear"} for j in range(11)])

    # ================= shop =================
    # the cat trots in... and turns into her (poof)
    def shop_cat(t):
        lt = t - S2
        if lt < 0.95: return dict(x=lerp(-20, 112, (lt - 0.3) / 0.65), y=316, dir=1, s=1, op=1 if lt > 0.3 else 0, walk=1)
        u = (lt - 0.95) / 0.15
        return dict(x=112, y=316, dir=1, s=lerp(1, 0.2, u), op=1 - u, walk=0)
    objs.extend(make_cat("scat", S2 + 0.3, S2 + 1.1, shop_cat))
    T = S2 + 0.98
    o(id="poof", type="circle", r=30, fill="#ffffffdd", x=118, y=270, start=T, end=T + 0.5, z=21, blur=3, flat=True,
      keys=[{"t": T, "scale": 0.2, "opacity": 1}, {"t": T + 0.15, "scale": 1.6, "opacity": 0.95, "ease": "out"},
            {"t": T + 0.5, "scale": 2.4, "opacity": 0, "ease": "out"}])
    for i in range(10):
        ang = i / 10 * 2 * math.pi
        o(id=f"magic{i}", type="star", points=4, r=7, inner=2, fill=("#ffd34d", "#ffffff", "#f7a8d8")[i % 3],
          start=T, end=T + 0.7, z=21.1, flat=True,
          keys=[{"t": T, "x": 118, "y": 260, "scale": 0.2, "rotation": 0},
                {"t": T + 0.5, "x": 118 + 60 * math.cos(ang), "y": 260 + 50 * math.sin(ang), "scale": 1.2, "rotation": 180, "ease": "out"},
                {"t": T + 0.7, "x": 118 + 66 * math.cos(ang), "y": 260 + 55 * math.sin(ang), "scale": 0, "opacity": 0}])
    for c in range(16):  # checkered floor
        objs.append(rect(f"tile{c}", 20 + c * 40, 340, 40, 40, ("#d9c49a", "#b8a27a")[c % 2], S2, S3, 1.1))
    # wall clock, poster, ceiling lamp
    objs += [circ("sclock", 600, 60, 20, "#ffffff", S2, S3, 1, stroke="#3a2c22", stroke_width=3),
             rect("poster", 420, 120, 90, 60, "#c0282d", S2, S3, 1),
             text("promo", 420, 112, "PROMOCJA", 13, "#ffffff", S2, S3, 1.1),
             text("promo2", 420, 132, "-30%", 16, "#ffe36b", S2, S3, 1.1),
             rect("cord", 255, 20, 2, 40, "#333", S2, S3, 1)]
    o(id="shade", type="polygon", points=[[-20, 10], [20, 10], [10, -8], [-10, -8]], fill="#2f7d4f",
      x=255, y=48, start=S2, end=S3, z=1.2,
      keys=[{"t": S2 + i * 0.15, "rotation": 4 * math.sin(i * 0.6), "ease": "linear"} for i in range(31)])
    o(id="lightcone", type="polygon", points=[[-20, 0], [20, 0], [90, 140], [-90, 140]], fill="#fff6c822",
      x=255, y=58, start=S2, end=S3, z=1.3)
    for j, (name, ang0) in enumerate((("hourhand", 60), ("minhand", 0))):
        o(id=f"s{name}", type="rect", w=2, h=14 - 4 * (j == 0), fill="#3a2c22", x=600, y=60, start=S2, end=S3, z=1.1,
          keys=[{"t": S2, "rotation": ang0}, {"t": S3, "rotation": ang0 + (40 if j == 0 else 360), "ease": "linear"}])
    # price tags under shelf items
    for i, (x, y) in enumerate(((200, 160), (240, 160), (290, 210), (225, 260), (300, 160), (190, 210))):
        objs.append(rect(f"tag{i}", x, y + 19, 16, 6, "#ffe36b", S2, S3, 2.1))
    # extra stock: bread, bananas, bottles; drinks fridge
    objs += [dict(id="bread", type="ellipse", rx=16, ry=8, fill="#c8893f", x=270, y=262, start=S2, end=S3, z=3),
             dict(id="banana", type="ellipse", rx=14, ry=4, fill="#f2d64b", x=315, y=264, rotation=-20,
                  start=S2, end=S3, z=3),
             rect("fridge", 80, 225, 90, 190, "#d7eef2", S2, S3, 1.5, stroke="#7a9aa0", stroke_width=4)]
    for r in range(3):
        for c in range(4):
            objs.append(rect(f"bottle{r}{c}", 54 + c * 17, 170 + r * 50, 9, 28,
                             ("#3f9b44", "#c0282d", "#2346c8", "#f2c94c")[(r + c) % 4], S2, S3, 1.6))
    # cashier behind till: blinks and waves when he pays
    cx = 590
    objs += [rect("cashbody", cx, 250, 34, 50, "#2f7d4f", S2, S3, 14),
             circ("cashhead", cx, 212, 13, "#c98f6a", S2, S3, 14.1),
             dict(id="cashhair", type="ellipse", rx=15, ry=7, fill="#d9a03a", x=cx, y=202, start=S2, end=S3, z=14.2)]
    for j, dx in enumerate((-5, 5)):
        o(id=f"casheye{j}", type="ellipse", rx=1.6, ry=2, fill="#111", x=cx - 4 + dx, y=212, start=S2, end=S3, z=14.3,
          keys=[{"t": S2 + 1.0, "sy": 1}, {"t": S2 + 1.05, "sy": 0.1}, {"t": S2 + 1.15, "sy": 1},
                {"t": S2 + 3.2, "sy": 1}, {"t": S2 + 3.25, "sy": 0.1}, {"t": S2 + 3.35, "sy": 1}])
    o(id="casharm", type="rect", w=8, h=28, fill="#2f7d4f", x=cx + 18, y=245, start=S2, end=S3, z=14,
      keys=[{"t": S2 + 3.9, "rotation": 0}] + [{"t": S2 + 4.0 + i * 0.12, "rotation": 160 + 25 * (-1) ** i}
                                               for i in range(4)] + [{"t": S2 + 4.5, "rotation": 0}])
    objs.append(text("thx", cx - 10, 175, "Dziękuję!", 14, "#2f7d4f", S2 + 4.0, S3 - 0.2, 30))
    # a shopping basket on the floor
    objs += [rect("basket", 380, 312, 40, 20, "#c0282d", S2, S3, 4, stroke="#7a1a1d", stroke_width=2),
             circ("basketitem", 372, 300, 6, "#f2d64b", S2, S3, 3.9)]

    # ================= kitchen =================
    for c in range(16):  # tile grid
        objs.append(rect(f"ktile{c}", 20 + c * 40, 200, 2, 80, "#d4e3e1", S3, DUR, 0.6))
    objs += [rect("ktline", 320, 180, 640, 2, "#d4e3e1", S3, DUR, 0.6),
             rect("kfloor2", 320, 325, 640, 6, "#6f5543", S3, DUR, 1.1)]
    # upper cabinets with knobs
    for i, x in enumerate((90, 190, 290)):
        objs += [rect(f"cab{i}", x, 75, 90, 80, "#e5d3b3", S3, DUR, 1, stroke="#b39c78", stroke_width=3),
                 circ(f"knob{i}", x + 32, 100, 3, "#6c5b45", S3, DUR, 1.1)]
    # fridge with magnets and a note
    objs += [rect("kfridge", 40, 240, 70, 180, "#f4f6f6", S3, DUR, 1.5, stroke="#aab4b6", stroke_width=3),
             rect("fhandle", 66, 220, 4, 40, "#aab4b6", S3, DUR, 1.6),
             rect("note", 30, 200, 26, 30, "#fff59d", S3, DUR, 1.6, rotation=-6),
             circ("mag1", 25, 186, 3, "#c0282d", S3, DUR, 1.7),
             circ("mag2", 46, 260, 4, "#2346c8", S3, DUR, 1.7)]
    # hanging utensils that sway
    for i, x in enumerate((420, 445, 470)):
        o(id=f"utensil{i}", type="rect", w=4, h=36, fill="#8a8f99", x=x, y=150, start=S3, end=DUR, z=1.4,
          keys=[{"t": S3 + j * 0.2, "rotation": 4 * math.sin(j * 0.6 + i), "ease": "linear"} for j in range(26)])
    objs.append(rect("rail", 445, 132, 80, 3, "#5d6168", S3, DUR, 1.5))
    # window plant + curtain, wall clock
    objs += [rect("pot", 490, 135, 18, 14, "#b0562f", S3, DUR, 1.6),
             dict(id="plant1", type="ellipse", rx=5, ry=11, fill="#3f9b44", x=485, y=120, rotation=-20, start=S3, end=DUR, z=1.6),
             dict(id="plant2", type="ellipse", rx=5, ry=11, fill="#2f7d3a", x=495, y=120, rotation=20, start=S3, end=DUR, z=1.6),
             rect("curtain", 580, 100, 18, 90, "#c0282d", S3, DUR, 1.7)]
    # cutting board with knife, salt & pepper, chopped bits
    objs += [rect("board", 480, 236, 70, 8, "#b5824a", S3, DUR, 2.8),
             rect("knife", 470, 230, 34, 4, "#c9d3da", S3, DUR, 2.9),
             rect("salt", 520, 222, 10, 24, "#ffffff", S3, DUR, 2.9, stroke="#aab4b6", stroke_width=1),
             rect("pepper", 534, 222, 10, 24, "#3a3a3a", S3, DUR, 2.9)]
    for i in range(4):
        objs.append(circ(f"chop{i}", 488 + i * 7, 230, 3, ("#d6332b", "#3f9b44")[i % 2], S3, S3 + 1.4, 2.95))
    # music notes: he hums while stirring
    for i in range(6):
        t0 = S3 + 1.2 + i * 0.45
        objs.append(text(f"note{i}", 0, 0, "♪" if i % 2 else "♫", 18, "#2f3c4a", t0, t0 + 1.2, 28,
                         keys=[{"t": t0, "x": 362, "y": 150, "opacity": 0},
                               {"t": t0 + 0.2, "x": 370 + 6 * (i % 3), "y": 135, "opacity": 1},
                               {"t": t0 + 1.2, "x": 385 + 14 * math.sin(i), "y": 85, "opacity": 0, "ease": "out"}]))
    # pan sizzle sparks
    for i in range(8):
        t0 = S3 + 1.1 + i * 0.35
        objs.append(circ(f"sizzle{i}", 0, 0, 2, "#ffb347", t0, t0 + 0.3, 4.5,
                         keys=[{"t": t0, "x": 300 + 12 * ((i % 3) - 1), "y": 222},
                               {"t": t0 + 0.3, "x": 300 + 30 * ((i % 3) - 1), "y": 198, "ease": "out", "opacity": 0}]))
    # ending: table candle, kitchen cat jumps on counter, heart above his head
    o(id="candleglow", type="circle", r=28, fill="#ffd27a44", x=610, y=205, start=S3 + 4.4, end=DUR, z=5,
      keys=[{"t": S3 + 4.4 + i * 0.12, "scale": 0.9 + 0.15 * (i % 2)} for i in range(5)])
    objs += [rect("candle", 610, 226, 8, 20, "#fff4dc", S3 + 4.4, DUR, 5.1),
             dict(id="flame2", type="ellipse", rx=3, ry=6, fill="#ffb347", x=610, y=211, start=S3 + 4.4, end=DUR, z=5.2)]
    o(id="heart", type="text", text="♥", size=30, fill="#e0303a", start=S3 + 4.6, end=DUR, z=31,
      keys=[{"t": S3 + 4.6, "x": 360, "y": 120, "scale": 0}, {"t": S3 + 4.9, "x": 360, "y": 105, "scale": 1.2, "ease": "back"},
            {"t": DUR, "x": 360, "y": 95, "scale": 1}])
