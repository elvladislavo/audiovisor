#!/usr/bin/env python3
"""
Фото-конвейер для сайта усадьбы.

Кладёте исходники (JPG / PNG / HEIC, прямо с камеры или телефона) в photos/originals/,
называете файл по категории:  torty-*, dekor-*, usadba-*, priroda-*, eda-*
и запускаете:

    python3 tools/optimize_photos.py

Что делает скрипт:
  * поворачивает фото по EXIF и удаляет EXIF (геометки, модель телефона);
  * переводит цвет в sRGB, чтобы фото с iPhone (Display P3) не тускнели в браузере;
  * режет на ширины 480 / 960 / 1600 / 2400 px — НИКОГДА не увеличивает;
  * сохраняет каждую ширину в AVIF (q≈62), WebP (q≈82) и JPEG (q≈84, progressive) —
    визуально без потерь, но в 5–15 раз легче исходника;
  * делает крошечное размытое превью (LQIP), которое видно, пока грузится фото;
  * пишет photos/manifest.js — список фото с размерами и категориями для галереи.

Повторный запуск пропускает уже обработанные файлы (флаг --force — пересобрать всё).
"""
import base64, io, json, sys
from pathlib import Path
from PIL import Image, ImageOps, ImageCms

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "photos" / "originals"
OUT = ROOT / "photos" / "web"
MANIFEST = ROOT / "photos" / "manifest.js"

WIDTHS = [480, 960, 1600, 2400]
QUALITY = {"avif": 62, "webp": 82, "jpg": 84}
CATEGORIES = {
    "torty": "Торты", "dekor": "Декор", "usadba": "Усадьба",
    "priroda": "Природа", "eda": "Еда",
}
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff"}

try:  # HEIC с iPhone — по желанию: pip install pillow-heif
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

SRGB = ImageCms.createProfile("sRGB")


def to_srgb(im: Image.Image) -> Image.Image:
    icc = im.info.get("icc_profile")
    if icc:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            im = ImageCms.profileToProfile(im, src, SRGB, outputMode="RGB")
        except Exception:
            pass
    return im.convert("RGB")


def save(im, path, fmt):
    if fmt == "avif":
        im.save(path, "AVIF", quality=QUALITY["avif"], speed=4)
    elif fmt == "webp":
        im.save(path, "WEBP", quality=QUALITY["webp"], method=6)
    else:
        im.save(path, "JPEG", quality=QUALITY["jpg"], progressive=True,
                optimize=True, subsampling="4:4:4" if im.width <= 960 else "4:2:0")


def process(src: Path, force: bool):
    stem = src.stem.lower().replace(" ", "-").replace("_", "-")
    cat = stem.split("-")[0]
    im = to_srgb(ImageOps.exif_transpose(Image.open(src)))
    w0, h0 = im.size
    widths = [w for w in WIDTHS if w < w0] + [min(w0, WIDTHS[-1])]
    for w in widths:
        h = round(h0 * w / w0)
        resized = None
        for fmt in ("avif", "webp", "jpg"):
            out = OUT / f"{stem}-{w}.{fmt}"
            if out.exists() and not force:
                continue
            if resized is None:
                resized = im if w == w0 else im.resize((w, h), Image.LANCZOS)
            save(resized, out, fmt)
    tiny = im.copy(); tiny.thumbnail((24, 24))
    buf = io.BytesIO(); tiny.save(buf, "WEBP", quality=40)
    return {
        "name": stem, "cat": cat if cat in CATEGORIES else "usadba",
        "w": min(w0, WIDTHS[-1]), "h": round(h0 * min(w0, WIDTHS[-1]) / w0),
        "widths": widths, "lqip": "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode(),
    }


def main():
    force = "--force" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in SRC.iterdir() if p.suffix.lower() in EXTS)
    photos = []
    for f in files:
        photos.append(process(f, force))
        print(f"✓ {f.name}")
    MANIFEST.write_text(
        "// Сгенерировано tools/optimize_photos.py — не редактировать руками\n"
        f"window.CATEGORIES = {json.dumps(CATEGORIES, ensure_ascii=False)};\n"
        f"window.PHOTOS = {json.dumps(photos, ensure_ascii=False, indent=1)};\n",
        encoding="utf-8")
    src_mb = sum(f.stat().st_size for f in files) / 1e6
    out_mb = sum(p.stat().st_size for p in OUT.iterdir()) / 1e6
    print(f"{len(photos)} фото · исходники {src_mb:.1f} МБ → все размеры и форматы {out_mb:.1f} МБ")


if __name__ == "__main__":
    main()
