#!/usr/bin/env python3
"""
Rebuild the gallery from works.json.

  python tools/build.py

For every entry it makes two WebP derivatives (a grid thumbnail and a
lightbox-sized version), works out the artwork's dominant colour, and rewrites
the block between <!-- gallery:start --> and <!-- gallery:end --> in index.html.

To add a piece: drop the file in images/, add an entry to works.json, re-run.
Existing derivatives are reused unless the source file is newer, so re-running
is cheap.

Needs Pillow:  pip install pillow
"""

import html
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is missing. Install it with:  pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "images"
OUT = IMAGES / "opt"
PAGE = ROOT / "index.html"

START = "<!-- gallery:start"
END = "<!-- gallery:end -->"

# (suffix, longest edge in px, quality)
SIZES = (("thumb", 1000, 76), ("full", 2000, 82))


def dominant(im):
    """The most characterful colour in the image, as #rrggbb.

    Weighted toward saturated mid-tones rather than sheer frequency, so a
    painting that is mostly dark canvas still reports the colour it reads as.
    """
    small = im.resize((64, 64))
    quant = small.quantize(colors=8, method=Image.Quantize.FASTOCTREE)
    palette = quant.getpalette()

    best, best_score = (136, 136, 136), -1.0
    for count, index in quant.getcolors():
        r, g, b = palette[index * 3:index * 3 + 3]
        hi, lo = max(r, g, b) / 255, min(r, g, b) / 255
        light = (hi + lo) / 2
        sat = 0 if hi == lo else (hi - lo) / (1 - abs(2 * light - 1))
        score = (count / 4096) * (0.35 + sat) * (1 - abs(light - 0.5))
        if score > best_score:
            best, best_score = (r, g, b), score

    return "#%02x%02x%02x" % best


def derivatives(src):
    """Make (and cache) the WebP versions of one source image."""
    stem = src.stem
    im = None
    made = []

    for label, longest, quality in SIZES:
        dest = OUT / f"{stem}-{label}.webp"
        if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
            continue
        if im is None:
            im = Image.open(src).convert("RGB")
        scale = min(1.0, longest / max(im.size))
        size = (round(im.width * scale), round(im.height * scale))
        im.resize(size, Image.LANCZOS).save(dest, "WEBP", quality=quality, method=6)
        made.append(label)

    if im is None:
        im = Image.open(src).convert("RGB")
    return im, made


def figure(n, entry, im):
    stem = Path(entry["image"]).stem
    tw, th = Image.open(OUT / f"{stem}-thumb.webp").size
    fw, fh = Image.open(OUT / f"{stem}-full.webp").size

    title = html.escape(entry["title"])
    caption = html.escape(entry["caption"])

    # the first screenful should not wait on lazy loading
    eager = " loading=\"lazy\"" if n > 4 else ""
    priority = " fetchpriority=\"high\"" if n <= 2 else ""

    return f'''        <figure class="work" style="--swatch: {dominant(im)}" data-index="{n - 1}"
                 data-full="images/opt/{stem}-full.webp" data-fw="{fw}" data-fh="{fh}"
                 data-title="{title}" data-caption="{caption}">
          <button class="work__hit" type="button" aria-label="Open &ldquo;{title}&rdquo; full size">
            <span class="work__frame">
              <img src="images/opt/{stem}-thumb.webp" width="{tw}" height="{th}" alt="{title}"{eager} decoding="async"{priority}>
              <span class="work__zoom" aria-hidden="true">View</span>
            </span>
          </button>
          <figcaption class="work__cap">
            <span class="work__num">{n:02d}</span>
            <span class="work__meta">
              <span class="work__title">{title}</span>
              <span class="work__desc">{caption}</span>
            </span>
          </figcaption>
        </figure>'''


def main():
    works = json.loads((ROOT / "works.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)

    figures = []
    for n, entry in enumerate(works, 1):
        src = IMAGES / entry["image"]
        if not src.exists():
            sys.exit(f"works.json references {entry['image']}, which is not in images/")
        im, made = derivatives(src)
        figures.append(figure(n, entry, im))
        print(f"  {n:02d}  {entry['title']}" + (f"   (built {', '.join(made)})" if made else ""))

    page = PAGE.read_text(encoding="utf-8")
    head, _, rest = page.partition(START)
    _, _, tail = rest.partition("\n")
    body, _, tail = tail.partition("        " + END)
    if not tail:
        sys.exit("Could not find the gallery markers in index.html.")

    marker_line = START + rest.partition("\n")[0]
    page = (head + marker_line + "\n"
            + "\n\n".join(figures) + "\n"
            + "        " + END + tail)

    PAGE.write_text(page, encoding="utf-8", newline="\n")

    # keep the two hard-coded counts in the markup honest
    print(f"\nWrote {len(works)} works into index.html.")
    if f"<b>{len(works)}</b> works" not in page:
        print(f"NOTE: the hero still says something other than {len(works)} works — "
              f"update the .hero__count line in index.html.")


if __name__ == "__main__":
    main()
