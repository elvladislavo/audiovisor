# scan.py — 64-px crops from key frames of the tricycle-kitten clip (720×1280), avoiding the creator's watermark.
#   python3 -I scan.py <frames dir with f1.0.png f3.5.png f8.0.png f11.0.png> <outdir>
import sys, json
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
CROPS = {
  'faceClosed': ('3.5', [178, 282, 348, 440]), 'faceOpen': ('8.0', [28, 18, 222, 196]),
  'tabby': ('8.0', [32, 262, 160, 430]), 'white': ('8.0', [168, 206, 300, 318]),
  'rock': ('1.0', [380, 0, 700, 300]), 'dirt': ('1.0', [200, 830, 700, 1200]), 'bark': ('11.0', [430, 100, 700, 1100]), 'canyon': ('8.0', [500, 700, 720, 1100]),
}
for k, (f, box) in CROPS.items(): Image.open(f'{src}/f{f}.png').convert('RGB').crop(tuple(box)).resize((64, 64), Image.LANCZOS).save(f'{out}/{k}.png')
json.dump(CROPS, open(f'{out}/scan.json', 'w'), indent=1); print('ok')
# closed-mouth face: the 3.5 s crop is a three-quarter view, so close the mouth on the front-facing cheering crop instead
from PIL import ImageDraw
im = Image.open(f'{out}/faceOpen.png').convert('RGB'); d = ImageDraw.Draw(im)
muzzle = im.getpixel((32, 38))
d.ellipse((22, 40, 42, 56), fill=muzzle)
d.line((27, 46, 32, 49, 37, 46), fill=(120, 70, 70), width=1)
im.save(f'{out}/faceClosed.png')
