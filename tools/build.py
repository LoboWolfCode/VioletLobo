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
from datetime import date
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is missing. Install it with:  pip install pillow")

SITE = "https://violetlobo.com"          # no trailing slash; change here only
ARTIST = "Violet Lobo"
SOCIAL = [
    "https://www.instagram.com/violet._.lobo/",
    "https://www.linkedin.com/in/violet-lobo-7a345a336",
]

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "images"
OUT = IMAGES / "opt"
PAGE = ROOT / "index.html"

START = "<!-- gallery:start"
END = "<!-- gallery:end -->"
SEO_START = "<!-- seo:start"
SEO_END = "<!-- seo:end -->"

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

    # Google Images leans on alt text, and "All Eyes On Me" alone says nothing
    # to someone who cannot see it — or to a crawler
    alt = html.escape(f"{entry['title']} — artwork by {ARTIST}")

    return f'''        <figure class="work" style="--swatch: {dominant(im)}" data-index="{n - 1}"
                 data-full="images/opt/{stem}-full.webp" data-fw="{fw}" data-fh="{fh}"
                 data-title="{title}" data-caption="{caption}">
          <button class="work__hit" type="button" aria-label="Open &ldquo;{title}&rdquo; full size">
            <span class="work__frame">
              <img src="images/opt/{stem}-thumb.webp" width="{tw}" height="{th}" alt="{alt}"{eager} decoding="async"{priority}>
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


def structured_data(works):
    """schema.org description of who made this and what is on the page.

    Search engines use it to tell that the site is one artist's body of work
    rather than a shop or a blog, which is what earns the name a proper
    result rather than a bare blue link.
    """
    person_id = f"{SITE}/#violet"

    graph = [
        {
            "@type": "Person",
            "@id": person_id,
            "name": ARTIST,
            "url": f"{SITE}/",
            "jobTitle": ["Painter", "Animator", "Curator"],
            "description": f"{ARTIST} is a painter, animator and curator working in "
                           "acrylic, soft pastel, ink and digital.",
            "image": f"{SITE}/images/social-card.jpg",
            "sameAs": SOCIAL,
        },
        {
            "@type": "WebSite",
            "@id": f"{SITE}/#website",
            "url": f"{SITE}/",
            "name": ARTIST,
            "inLanguage": "en",
            "publisher": {"@id": person_id},
        },
        {
            "@type": "CollectionPage",
            "@id": f"{SITE}/#gallery",
            "url": f"{SITE}/",
            "name": "Selected Work",
            "isPartOf": {"@id": f"{SITE}/#website"},
            "about": {"@id": person_id},
            "hasPart": [
                {
                    "@type": "VisualArtwork",
                    "position": n,
                    "name": entry["title"],
                    "description": entry["caption"],
                    "creator": {"@id": person_id},
                    "image": f"{SITE}/images/opt/{Path(entry['image']).stem}-full.webp",
                    "thumbnailUrl": f"{SITE}/images/opt/{Path(entry['image']).stem}-thumb.webp",
                }
                for n, entry in enumerate(works, 1)
            ],
        },
    ]

    payload = json.dumps({"@context": "https://schema.org", "@graph": graph},
                         indent=2, ensure_ascii=False)
    indented = "\n".join("  " + line for line in payload.splitlines())
    return f'  <script type="application/ld+json">\n{indented}\n  </script>'


def sitemap(works):
    """A sitemap with image entries — the part that helps Google Images find art."""
    def esc(t):
        return html.escape(t, quote=False)

    images = "\n".join(
        f"""    <image:image>
      <image:loc>{SITE}/images/opt/{Path(e['image']).stem}-full.webp</image:loc>
      <image:title>{esc(e['title'])}</image:title>
      <image:caption>{esc(e['caption'])}</image:caption>
    </image:image>"""
        for e in works
    )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>{SITE}/</loc>
{images}
    <lastmod>{date.today().isoformat()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
"""


def replace_block(page, start, end, body, indent=""):
    """Swap everything between two marker comments, keeping the markers."""
    head, marker, rest = page.partition(start)
    if not marker:
        sys.exit(f"Could not find {start} in index.html.")
    marker_line, _, rest = rest.partition("\n")
    _, tail_marker, tail = rest.partition(indent + end)
    if not tail_marker:
        sys.exit(f"Could not find {end} in index.html.")
    return head + start + marker_line + "\n" + body + "\n" + indent + end + tail


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
    page = replace_block(page, START, END, "\n\n".join(figures), indent="        ")
    page = replace_block(page, SEO_START, SEO_END, structured_data(works), indent="  ")
    PAGE.write_text(page, encoding="utf-8", newline="\n")

    (ROOT / "sitemap.xml").write_text(sitemap(works), encoding="utf-8", newline="\n")

    print(f"\nWrote {len(works)} works into index.html, plus structured data.")
    print("Wrote sitemap.xml.")

    # keep the hard-coded count in the markup honest
    if f"<b>{len(works)}</b> works" not in page:
        print(f"NOTE: the hero still says something other than {len(works)} works — "
              f"update the .hero__count line in index.html.")


if __name__ == "__main__":
    main()
