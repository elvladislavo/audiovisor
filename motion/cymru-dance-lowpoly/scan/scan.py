# scan.py — cut 64-px texture crops of him from key frames of IMG_3641.mov and sample his palette.
#   python3 -I scan.py <frames dir with f1.5.png f4.0.png f5.75.png f6.75.png> <outdir>
import sys, json
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
CROPS = {  # frame, [x0, y0, x1, y1] in the 1080×1920 frame
  'face': ('5.75', [365, 315, 575, 630]), 'shirtFront': ('6.75', [430, 330, 930, 1260]), 'shirtBack': ('1.5', [120, 780, 540, 1200]),

  'forearm': ('5.75', [120, 760, 270, 1040]),
}
pal = {}
for k, (f, box) in CROPS.items():
    im = Image.open(f'{src}/f{f}.png').convert('RGB'); c = im.crop(tuple(box))
    if k == 'face':   # his hand covers the left of his face in this frame: mirror the clean right half over it
        w = c.width; right = c.crop((w // 2, 0, w, c.height)); c.paste(right.transpose(Image.FLIP_LEFT_RIGHT), (0, 0))
    c.resize((64, 64), Image.LANCZOS).save(f'{out}/{k}.png')
    pal[k] = '#%02x%02x%02x' % tuple(int(v) for v in np.median(np.asarray(c).reshape(-1, 3), 0))
json.dump(dict(crops=CROPS, palette=pal), open(f'{out}/scan.json', 'w'), indent=1)
print(pal)

# graffiti room: clean patches of the scarf photo (IMG_0849) without his hands, for the walls and ceiling
if len(sys.argv) > 3:
    g = Image.open(sys.argv[3]).convert('RGB')
    for k, box in {'wallBlack': [880, 440, 1280, 820], 'wallTiles': [0, 380, 520, 930], 'ceiling': [0, 0, 1500, 380]}.items():
        g.crop(tuple(box)).resize((64, 64), Image.LANCZOS).save(f'{out}/{k}.png')
