"""Flatten a PNG to opaque RGB and assert its exact size: flatten.py <path> <w> <h>"""
import sys
from PIL import Image

path, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
im = Image.open(path)
if im.mode != "RGB":
    bg = Image.new("RGB", im.size, (251, 247, 241))
    bg.paste(im.convert("RGBA"), mask=im.convert("RGBA").split()[3])
    im = bg
assert im.size == (w, h), f"{path}: {im.size} != {(w, h)}"
im.save(path, optimize=True)
