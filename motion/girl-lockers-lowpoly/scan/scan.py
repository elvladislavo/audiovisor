# scan.py — cut 64×64 texture crops from the standing photo (IMG_5399) and save the landmarks used by scene.js.
#   python3 -I scan.py <photo> <outdir>
import sys, json
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
CROPS = {  # [x0, y0, x1, y1] in the 1512×2016 photo
  'face': [680, 320, 900, 600], 'upper': [595, 590, 1110, 1000], 'lower': [595, 980, 1045, 1910],
  'mirror': [172, 428, 592, 835], 'sign': [288, 834, 512, 922], 'door3': [1205, 410, 1420, 1580],
  'door': [1220, 650, 1410, 1500], 'bench': [430, 1350, 640, 1420], 'bag': [15, 1420, 420, 1760], 'shoes': [405, 1770, 690, 2016],
  'tile': [1050, 1700, 1500, 2010], 'wall': [180, 950, 280, 1250],
}
for k, box in CROPS.items(): im.crop(tuple(box)).resize((64, 64), Image.LANCZOS).save(f'{out}/{k}.png')
LANDMARKS = {  # photo px, read off the standing photo; floor (boot soles) at y 1885, figure centre x 840, 1.70 m tall
  'floorPy': 1885, 'centerPx': 840, 'heightM': 1.70, 'topPy': 330,
  'headC': [785, 470], 'chinPy': 565, 'shoulderPy': 635, 'waistPy': 990, 'hipPy': 1100, 'kneePy': 1460, 'anklePy': 1830,
  'shoulderX': [725, 1000], 'legX': [760, 950],
}
json.dump(dict(crops=CROPS, landmarks=LANDMARKS), open(f'{out}/scan.json', 'w'), indent=1)
print('ok', len(CROPS), 'crops')
