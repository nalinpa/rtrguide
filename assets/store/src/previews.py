"""Reviewer previews for one version: previews.py <versions_dir/V> <out_dir>
Writes downscaled views, the iPhone crop (central 65% of the 21:9 header),
~330px search thumbnails, and grayscale/blurred thumbnails."""
import sys, os
from PIL import Image, ImageFilter, ImageOps

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
def save(im, name, width):
    im = im.copy(); im.thumbnail((width, 10000), Image.LANCZOS)
    im.save(os.path.join(out, name), quality=88)
for f in sorted(os.listdir(src)):
    if not f.endswith(".png"): continue
    im = Image.open(os.path.join(src, f)).convert("RGB")
    base = f[:-4]
    save(im, base + "-1200.jpg", 1200)
    if base.startswith("header-21x9"):
        w, h = im.size; cw = int(w * 0.65); x0 = (w - cw) // 2
        save(im.crop((x0, 0, x0 + cw, h)), "header-iphone-crop-800.jpg", 800)
    if base.startswith("search"):
        t = im.copy(); t.thumbnail((330, 10000), Image.LANCZOS); t.save(os.path.join(out, base + "-330.png"))
        g = ImageOps.grayscale(t).filter(ImageFilter.GaussianBlur(2)); g.save(os.path.join(out, base + "-330-gray-blur.png"))
    if base.startswith("header"):
        g = im.copy(); g.thumbnail((400, 10000), Image.LANCZOS)
        ImageOps.grayscale(g).filter(ImageFilter.GaussianBlur(2)).save(os.path.join(out, base + "-400-gray-blur.png"))
