"""Extra scenery, props and background life. Times are story-time (scaled later)."""
import math


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
    # car passing far in background (headlights)
    car = [{"t": 0.5, "x": 720}, {"t": 3.0, "x": -120, "ease": "linear"}]
    o(id="carbody", type="rect", w=110, h=28, fill="#7a1f2b", y=300, x=720, start=S1, end=S2, z=2.2, keys=car)
    o(id="cartop", type="rect", w=60, h=20, fill="#7a1f2b", y=280, x=720, start=S1, end=S2, z=2.2,
      keys=[dict(k, x=k["x"] + 5) for k in car])
    for j, dx in enumerate((-35, 35)):
        o(id=f"wheel{j}", type="circle", r=9, fill="#111", y=314, x=720 + dx, start=S1, end=S2, z=2.3,
          keys=[dict(k, x=k["x"] + dx) for k in car])
    o(id="headlight", type="ellipse", rx=30, ry=6, fill="#fff3b055", y=302, x=660, start=S1, end=S2, z=2.25,
      keys=[dict(k, x=k["x"] - 70) for k in car])
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
    # a cat strolls past, stops, tail swish
    cat = [{"t": 0, "x": 650}, {"t": 2.2, "x": 300, "ease": "linear"}, {"t": 4.5, "x": 300}]
    o(id="catbody", type="ellipse", rx=13, ry=7, fill="#111", y=306, x=650, start=S1, end=S2, z=5, keys=cat)
    o(id="cathead", type="circle", r=6, fill="#111", y=299, x=640, start=S1, end=S2, z=5,
      keys=[dict(k, x=k["x"] - 13) for k in cat])
    for j, dx in enumerate((-16, -10)):
        o(id=f"catear{j}", type="polygon", points=[[-3, 0], [3, 0], [0, -6]], fill="#111", y=294, start=S1, end=S2,
          z=5, x=650 + dx, keys=[dict(k, x=k["x"] + dx) for k in cat])
    o(id="cattail", type="line", points=[[0, 0], [8, -6], [12, -16]], stroke="#111", stroke_width=3, y=304,
      start=S1, end=S2, z=5, x=663,
      keys=[dict(k, x=k["x"] + 13, rotation=15 * math.sin(i * 1.7)) for i, k in enumerate(
          [{"t": t * 0.25, "x": (650 - 155 * t * 0.25) if t * 0.25 < 2.2 else 300} for t in range(19)])])
    for j, dx in enumerate((-8, 8)):
        o(id=f"cateye{j}", type="circle", r=1.5, fill="#c8f04a", y=298, start=S1 + 2.2, end=S2, z=5.1,
          x=300 - 13 + dx / 3)
    # falling leaves
    for i in range(5):
        x0, t0 = 80 + i * 130, 0.2 + i * 0.7
        o(id=f"leaf{i}", type="ellipse", rx=5, ry=2.5, fill=("#c26a2a", "#d9a03a")[i % 2], start=t0, end=S2, z=25,
          keys=[{"t": t0 + j * 0.3, "x": x0 + 18 * math.sin(j * 1.3) + j * 8, "y": 90 + j * 22,
                 "rotation": j * 50, "ease": "inout"} for j in range(11)])

    # ================= shop =================
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
      keys=[{"t": S2 + i * 0.3, "rotation": 3 * math.sin(i)} for i in range(16)])
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
          keys=[{"t": S3 + j * 0.4, "rotation": 4 * math.sin(j + i)} for j in range(14)])
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
                         keys=[{"t": t0, "x": 228, "y": 150, "opacity": 0},
                               {"t": t0 + 0.2, "x": 220 - 6 * (i % 3), "y": 135, "opacity": 1},
                               {"t": t0 + 1.2, "x": 205 + 14 * math.sin(i), "y": 85, "opacity": 0, "ease": "out"}]))
    # pan sizzle sparks
    for i in range(8):
        t0 = S3 + 1.1 + i * 0.35
        objs.append(circ(f"sizzle{i}", 0, 0, 2, "#ffb347", t0, t0 + 0.3, 4.5,
                         keys=[{"t": t0, "x": 300 + 12 * ((i % 3) - 1), "y": 222},
                               {"t": t0 + 0.3, "x": 300 + 30 * ((i % 3) - 1), "y": 198, "ease": "out", "opacity": 0}]))
    # ending: table candle, kitchen cat jumps on counter, heart above his head
    o(id="candleglow", type="circle", r=28, fill="#ffd27a44", x=560, y=205, start=S3 + 4.4, end=DUR, z=5,
      keys=[{"t": S3 + 4.4 + i * 0.12, "scale": 0.9 + 0.15 * (i % 2)} for i in range(5)])
    objs += [rect("candle", 560, 226, 8, 20, "#fff4dc", S3 + 4.4, DUR, 5.1),
             dict(id="flame2", type="ellipse", rx=3, ry=6, fill="#ffb347", x=560, y=211, start=S3 + 4.4, end=DUR, z=5.2)]
    o(id="kcat", type="ellipse", rx=14, ry=8, fill="#e08a3a", start=S3 + 3.8, end=DUR, z=5.4,
      keys=[{"t": S3 + 3.8, "x": 660, "y": 300}, {"t": S3 + 4.3, "x": 600, "y": 300},
            {"t": S3 + 4.55, "x": 585, "y": 200, "ease": "out"}, {"t": S3 + 4.75, "x": 580, "y": 228, "ease": "in"}])
    o(id="kcathead", type="circle", r=7, fill="#e08a3a", start=S3 + 3.8, end=DUR, z=5.5,
      keys=[{"t": S3 + 3.8, "x": 647, "y": 293}, {"t": S3 + 4.3, "x": 587, "y": 293},
            {"t": S3 + 4.55, "x": 572, "y": 193, "ease": "out"}, {"t": S3 + 4.75, "x": 567, "y": 221, "ease": "in"}])
    o(id="heart", type="text", text="♥", size=30, fill="#e0303a", start=S3 + 4.6, end=DUR, z=31,
      keys=[{"t": S3 + 4.6, "x": 240, "y": 120, "scale": 0}, {"t": S3 + 4.9, "x": 240, "y": 105, "scale": 1.2, "ease": "back"},
            {"t": DUR, "x": 240, "y": 95, "scale": 1}])
