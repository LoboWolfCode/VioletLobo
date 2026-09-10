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
tools/build.py    regenerates the gallery from works.json
images/           original artwork (never touched by the build)
images/opt/       generated WebP versions — do not edit by hand
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

## Things worth knowing

- **The hero letters** are filled with Violet's own paintings, crossfading. The
  script picks the most vivid pieces automatically, so dark or washed-out ones
  never make the name hard to read. Nothing to configure.
- **Light and dark themes** both ship. The site follows the visitor's system
  setting on first visit and remembers the toggle after that.
- **Everything degrades.** With JavaScript off you still get the full gallery,
  both themes, and every image — you just lose the lightbox and the masonry
  nesting.
- **Motion respects `prefers-reduced-motion`.** Animations stop for anyone who
  has asked their system to stop them.

## Left to do

- `art_12` and `art_13` are listed as *Untitled (Pastel)* and *Untitled
  (Roses)*. On the old site both were mislabelled as copies of *All Eyes On Me*.
  Real titles welcome.
- The About text is a placeholder in Violet's general direction. Replace it with
  something she'd actually say.
