import sys, json
import numpy as np
from PIL import Image, ImageDraw
src, outdir = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int); H, W, _ = a.shape
lum = a.mean(2); sat = a.max(2) - a.min(2)
# cream kitten inside the cloud: compare against the cloud's own background (sampled at the cloud corners)
bgc = np.median(a[90:130, 560:600].reshape(-1, 3), 0); print('cloud bg', bgc)
d = np.abs(a - bgc).sum(2)
reg = np.zeros((H, W), bool); reg[70:560, 560:960] = True
cream = reg & (d > 40) & (lum > 70)
ys, xs = np.nonzero(cream); cb = dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max())); print('cream bbox', cb)
print('cream rows', {int(y): int(cream[y].sum()) for y in range(cb['y0'], cb['y1'] + 1, 20)})
def avg(x0, y0, x1, y1): return '#%02x%02x%02x' % tuple(int(v) for v in np.median(a[y0:y1, x0:x1].reshape(-1, 3), 0))
pal = dict(tabbyFur=avg(150, 1150, 200, 1200), tabbyStripe=avg(195, 905, 230, 960), tabbyWhite=avg(290, 960, 330, 990), tabbyChest=avg(260, 1080, 330, 1150),
  tabbyNose=avg(328, 905, 345, 920), creamFur=avg(660, 300, 700, 360), creamWhite=avg(770, 330, 820, 400), creamEar=avg(640, 140, 670, 170),
  creamNose=avg(790, 225, 805, 240), bow=avg(828, 92, 880, 125), eye=avg(255, 875, 290, 895), bubbleBg=avg(560, 90, 600, 130))
print('palette', pal)
crops = dict(tabbyFace=(95, 755, 445, 1010), tabbyBody=(120, 990, 470, 1320), tabbyTail=(10, 1215, 135, 1295),
             creamFace=(615, 70, 950, 300), creamBody=(600, 290, 940, 530))
for k, (x0, y0, x1, y1) in crops.items():
    im.crop((x0, y0, x1, y1)).resize((64, 64), Image.LANCZOS).save(f'{outdir}/{k}.png')
ov = im.copy(); dr = ImageDraw.Draw(ov)
for k, (x0, y0, x1, y1) in crops.items(): dr.rectangle((x0, y0, x1, y1), outline=(255, 0, 255), width=4); dr.text((x0 + 6, y0 + 6), k, fill=(255, 0, 255))
ov.resize((W // 2, H // 2)).save(f'{outdir}/overlay.png')
json.dump(dict(cream=cb, palette=pal, crops=crops), open(f'{outdir}/scan2.json', 'w'), indent=1)
