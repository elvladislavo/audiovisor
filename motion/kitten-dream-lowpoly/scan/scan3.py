import sys, json, math
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGB')).astype(int); H, W, _ = a.shape
ink = (a.mean(2) < 90) & ((a.max(2) - a.min(2)) < 45)
yy, xx = np.mgrid[0:H, 0:W]
for bx, by, br in [(519.5, 684, 62), (435.5, 771, 44)]: ink &= ((xx - bx) ** 2 + (yy - by) ** 2) > br ** 2
cx, cy = 709, 360
outer, inner = [], []
for i in range(72):
    th = i / 72 * 2 * math.pi; dx, dy = math.cos(th), math.sin(th)
    runs, r, cur = [], 200.0, None; last_in = None
    while True:
        x, y = int(round(cx + dx * r)), int(round(cy + dy * r))
        if not (0 <= x < W and 0 <= y < H) or r > 400: break
        if ink[y, x]:
            if cur is None: cur = [r, r]
            else: cur[1] = r
        elif cur is not None: runs.append(cur); cur = None
        r += 0.5
    if cur is not None: runs.append(cur)
    edge = (cx + dx * r, cy + dy * r)
    if runs:
        ri, ro = runs[-1]
        outer.append([round(cx + dx * ro, 1), round(cy + dy * ro, 1)]); inner.append([round(cx + dx * ri, 1), round(cy + dy * ri, 1)])
    else:   # ray leaves the photo before the outline (cloud is cut by the right edge)
        outer.append([round(min(edge[0], W - 1), 1), round(edge[1], 1)]); inner.append([round(min(edge[0], W - 1) - 0.5, 1), round(edge[1], 1)])
json.dump(dict(center=[cx, cy], outer=outer, inner=inner, small=[435.5, 771, 36.5], mid=[519.5, 684, 54.5]), open(out, 'w'))
print(len(outer), 'points; sample', outer[:4], inner[:4])
