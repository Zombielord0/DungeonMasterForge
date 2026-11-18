"""Makes a background picture for the app from a large source image:  python tools/make-backdrop.py <source> <out.webp> [width] [quality]

Resizes the source to the given width (default 2560, keeping its shape) and saves it as WebP (default quality 62),
small enough to download quickly but sharp on a laptop or TV. Put the result in src/backdrop/ as corridor-<name>.webp;
tools/build.mjs fingerprints it as /assets/backdrop-<name>.<fingerprint>.webp. Needs Pillow (pip install pillow).
After swapping a picture, measure where its torches are and update BACKDROPS in src/app/15-torch.js.
"""
import os
import sys

from PIL import Image


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src, out = sys.argv[1], sys.argv[2]
    width = int(sys.argv[3]) if len(sys.argv) > 3 else 2560
    quality = int(sys.argv[4]) if len(sys.argv) > 4 else 62
    im = Image.open(src).convert("RGB")
    height = round(im.size[1] * width / im.size[0])
    im.resize((width, height), Image.LANCZOS).save(out, "WEBP", quality=quality, method=6)
    print(f"{out}  {width} x {height}  {os.path.getsize(out) // 1024} KB")


if __name__ == "__main__":
    main()
