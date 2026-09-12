# violetlobo.com

Portfolio site for Violet Lobo — painter, animator, curator.

Plain HTML, CSS and JavaScript. No build step to view it, no framework, no
dependencies at runtime. Open `index.html` and it works.

## Files

```
index.html        the whole site (hero, gallery, about, footer, lightbox)
dkm.html          old email easter egg — no longer linked from the site,
                  still reachable at /dkm.html if you want it back
works.json        titles and captions for every piece  ← edit this
css/style.css     all styling, dark and light themes
js/main.js        theme, hero effect, masonry, index view, lightbox
tools/build.py    regenerates the gallery, structured data and sitemap
robots.txt        tells crawlers everything is fair game
sitemap.xml       generated — lists the page and all 16 artworks
images/           original artwork (never touched by the build)
images/opt/       generated WebP versions — do not edit by hand
images/social-card.jpg   the link preview image (regenerate with tools/card.py)
fonts/WhyMin.ttf  Violet's handwriting, used for the signature
```

## Adding or changing artwork

1. Put the new image in `images/` (any size — it gets resized).
2. Add an entry to `works.json`, in the order you want it shown:

   ```json
   {
     "image": "art_17.jpg",
     "title": "Something New",
     "caption": "A line or two in your own voice."
   }
   ```

3. Run the build:

   ```
   pip install pillow      # once
   python tools/build.py
   ```

That resizes the image, picks the colour used for its hover glow, and rewrites
the gallery in `index.html`. Rerunning is cheap — images already converted are
reused.

**Captions live in `works.json`, not in `index.html`.** The build overwrites
everything between `<!-- gallery:start -->` and `<!-- gallery:end -->`, so edits
made directly to that block are lost on the next run.

If you change the number of pieces, update the `16 works` line in the hero too —
the build prints a reminder when it notices.

Contact address lives in the footer of `index.html` as a `mailto:` link.

## Being found

The site tells search engines who Violet is, not just what words are on the
page. `tools/build.py` writes a schema.org block into `index.html` describing
her as a Person (painter, animator, curator, with links to her Instagram and
LinkedIn) and every artwork as a `VisualArtwork` credited to her. It also
writes `sitemap.xml` with an image entry per piece, which is the part that gets
the paintings into Google Images.

**If the domain ever changes, edit `SITE` at the top of `tools/build.py` and
re-run it**, then update the handful of absolute URLs in the `<head>` of
`index.html` (canonical, `og:`, `twitter:`) and the `Sitemap:` line in
`robots.txt`.

Two things worth doing once, by hand:

1. Add the site to [Google Search Console](https://search.google.com/search-console)
   and submit `https://violetlobo.com/sitemap.xml`. Indexing is much faster than
   waiting to be crawled.
2. Put the violetlobo.com link in the Instagram and LinkedIn profiles. Those are
   already declared as `sameAs` in the structured data, and the link back is what
   makes search engines believe the connection.

Link previews (iMessage, Slack, Instagram DMs, LinkedIn) use
`images/social-card.jpg`. Regenerate it with `python tools/card.py` after
changing which painting it features.

## Things worth knowing

- **The hero letters** are filled with Violet's own paintings, crossfading. The
  script picks the most vivid pieces automatically, so dark or washed-out ones
  never make the name hard to read. Nothing to configure.
- **Light and dark themes** both ship. The site follows the visitor's system
  setting on first visit and remembers the toggle after that.
- **Everything degrades.** With JavaScript off you still get the full gallery,
  both themes, and every image — you just lose the lightbox and the masonry
  nesting.
- **Motion respects `prefers-reduced-motion`.** Movement stops — travel, drift,
  hover lifts, smooth scrolling — while plain fades stay, since opacity is not
  what causes trouble. Worth knowing: **iOS reports this preference when Low
  Power Mode is on**, not only when Reduce Motion is switched on. If the site
  looks unusually still on a phone, check the battery setting before assuming
  something broke.

## Left to do

- `art_12` and `art_13` are listed as *Untitled (Pastel)* and *Untitled
  (Roses)*. On the old site both were mislabelled as copies of *All Eyes On Me*.
  Real titles welcome.
- The About text is a placeholder in Violet's general direction. Replace it with
  something she'd actually say.
