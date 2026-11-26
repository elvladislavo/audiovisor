# scan.py — measure the meowing kitten clip frame by frame and cut 64-px crops.
#   python3 -I scan.py <dir of 30-fps frames f0001.png…> <outdir>
# Mouth openness per frame = share of pink/red "open mouth" pixels in the mouth box; the scene drives the jaw from it.
import sys, os, json
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
files = sorted(f for f in os.listdir(src) if f.endswith('.png'))
MOUTH = (230, 610, 520, 900)        # x0, y0, x1, y1 in the 778×1408 frame (below the nose)
op = []
for f in files:
    a = np.asarray(Image.open(f'{src}/{f}').convert('RGB').crop(MOUTH)).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    inside = ((r > 150) & (r - g > 55) & (r - b > 25)) | ((r < 120) & (g < 80) & (b < 90))   # pink tongue/gums or dark throat
    op.append(float(inside.mean()))
op = np.array(op); lo, hi = np.percentile(op, 5), np.percentile(op, 97)
norm = np.clip((op - lo) / (hi - lo), 0, 1)
order = np.argsort(norm)
closed, wide = int(order[0]), int(order[-1]); half = int(order[np.searchsorted(norm[order], 0.5)])
print('frames', len(files), 'closed', closed, 'half', half, 'wide', wide)
CROPS = {'face': (0, 30, 778, 1010), 'hoodie': (0, 880, 778, 1408), 'blanket': (0, 0, 778, 130)}
for name, idx in [('Closed', closed), ('Half', half), ('Wide', wide)]:
    im = Image.open(f'{src}/{files[idx]}').convert('RGB')
    im.crop(CROPS['face']).resize((64, 64), Image.LANCZOS).save(f'{out}/face{name}.png')
    if name == 'Closed':
        for k in ('hoodie', 'blanket'): im.crop(CROPS[k]).resize((64, 64), Image.LANCZOS).save(f'{out}/{k}.png')
json.dump(dict(fps=30, mouth=[round(v, 3) for v in norm.tolist()], frames=dict(closed=closed, half=half, wide=wide), crops=CROPS), open(f'{out}/../scan-data.json', 'w'))
print('mouth curve (every 0.5 s):', [round(v, 2) for v in norm[::15]])
