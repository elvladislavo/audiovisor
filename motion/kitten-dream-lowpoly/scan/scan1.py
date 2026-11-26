import sys, json
import numpy as np
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int); H, W, _ = a.shape
lum = a.mean(2); sat = a.max(2) - a.min(2)
# black outlines (bubbles/cloud)
ink = lum < 70
# components of ink via simple flood fill on downsampled grid
from collections import deque
def comps(mask, minpix=50):
    seen = np.zeros_like(mask, bool); res = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]: continue
        q = deque([(y0, x0)]); seen[y0, x0] = True; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True; q.append((yy, xx))
        if len(pts) >= minpix:
            p = np.array(pts); res.append(dict(n=len(pts), x0=int(p[:,1].min()), x1=int(p[:,1].max()), y0=int(p[:,0].min()), y1=int(p[:,0].max())))
    return res
# only thin ink lines (outlines): restrict to pixels with neutral colour and very dark
inkc = comps(ink & (sat < 40), 200)
print('ink components:', inkc)
# tabby: non-background in lower-left, below the small bubble
bg = (lum > 228) & (sat < 18)
tab = (~bg) & (np.arange(H)[:, None] > 760) & (np.arange(W)[None, :] < 560)
ys, xs = np.nonzero(tab); tb = dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()))
print('tabby bbox', tb)
rows = {int(y): int(tab[y].sum()) for y in range(tb['y0'], tb['y1'] + 1, 20)}
print('tabby width profile (y: px)', rows)
json.dump(dict(size=[W, H], ink=inkc, tabby=tb, tabbyRows=rows), open(out, 'w'))
