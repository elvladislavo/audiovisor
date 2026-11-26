# scan.py — measure the scarf photo (IMG_0849) and cut 64-px texture crops for scene.js.
#   python3 -I scan.py <photo> <outdir>
import sys, json
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int); H, W, _ = a.shape
print('size', W, H)
# hair (blond) + skin mask in the head area → head box
r, g, b = a[..., 0], a[..., 1], a[..., 2]
warm = (r > 110) & (r > b + 25) & (g > b + 5)
reg = np.zeros((H, W), bool); reg[420:1060, 480:960] = True
m = reg & warm; ys, xs = np.nonzero(m)
rows = {y: np.nonzero(m[y])[0] for y in range(430, 1060, 30)}
print('head rows', {y: (int(v.min()), int(v.max())) for y, v in rows.items() if len(v) > 20})
print('head bbox', int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
# dark sweatshirt: per-row extent across the frame
dark = (a.mean(2) < 75) & (np.abs(r - g) < 18) & (np.arange(W)[None, :] > 120) & (np.arange(W)[None, :] < 1330)
for y in (1150, 1300, 1500, 1800, 2000):
    xx = np.nonzero(dark[y])[0]; print('shirt row', y, int(xx.min()), int(xx.max()))
def med(x0, y0, x1, y1): return '#%02x%02x%02x' % tuple(int(v) for v in np.median(a[y0:y1, x0:x1].reshape(-1, 3), 0))
print('palette', dict(skin=med(650, 820, 700, 860), hair=med(640, 560, 760, 600), shirt=med(600, 1500, 900, 1700), scarf=med(1250, 1600, 1300, 1650), wall=med(20, 1500, 80, 1700)))
CROPS = {'shirt': [330, 1040, 1180, 2016], 'face': [520, 480, 925, 1010], 'body': [60, 820, 1500, 2016], 'wallL': [0, 380, 560, 1000], 'wallR': [860, 430, 1500, 1000], 'ceiling': [0, 0, 1500, 400], 'tiles': [0, 1500, 140, 2016]}
for k, box in CROPS.items(): im.crop(tuple(box)).resize((64, 64), Image.LANCZOS).save(f'{out}/{k}.png')
json.dump(dict(size=[W, H], crops=CROPS), open(f'{out}/scan.json', 'w'), indent=1)
