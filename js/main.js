/* ============================================================================
   Violet Lobo — site behaviour
   No dependencies. Everything degrades to a plain, readable page without it.
   ========================================================================= */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const calm = matchMedia('(prefers-reduced-motion: reduce)');

// tells the inline failsafe in <head> to stand down, and unlocks the controls
// that only make sense once this file is running
document.documentElement.dataset.booted = '1';
document.documentElement.classList.add('js-ready');


/* ── theme ──────────────────────────────────────────────────────────────── */

const root = document.documentElement;
const themeBtn = $('#theme-switch');

function paintTheme(mode) {
  root.dataset.theme = mode;
  const goingTo = mode === 'dark' ? 'light' : 'dark';
  themeBtn.setAttribute('aria-pressed', String(mode === 'dark'));
  themeBtn.setAttribute('aria-label', `Switch to ${goingTo} theme`);
}

themeBtn.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  paintTheme(next);
  try { localStorage.setItem('vl-theme', next); } catch { /* private mode */ }
});

paintTheme(root.dataset.theme || 'dark');


/* ── the works, read straight out of the markup ─────────────────────────── */

const figures = $$('.work');
const works = figures.map((fig, i) => ({
  i,
  fig,
  thumb: $('img', fig).currentSrc || $('img', fig).src,
  full: fig.dataset.full,
  w: +fig.dataset.fw,
  h: +fig.dataset.fh,
  title: fig.dataset.title,
  caption: fig.dataset.caption,
  swatch: fig.style.getPropertyValue('--swatch').trim(),
}));

$('#lb-total').textContent = works.length;


/* ── hero: paintings showing through the letterforms ────────────────────── */

/**
 * How well a swatch will read as paint inside a giant letterform.
 * Saturation carries the character; a little luminance keeps it off the
 * black background. Muddy greys and near-blacks score close to zero.
 */
function vividness(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1));
  return { score: sat * light ** 0.4, light };
}

function initHeroBleed() {
  const first = $('.hero__bleed');
  const aura = $('.hero__aura');
  if (!first) return;

  // muddy and near-black paintings would swallow the headline, so only the
  // most vivid pieces get a turn inside the letters
  const cast = works
    .map(w => ({ ...w, ...vividness(w.swatch || '#888888') }))
    .filter(w => w.light > 0.14 && w.score > 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (!cast.length) return;

  const layers = [first, first.cloneNode(true)];
  first.after(layers[1]);

  const FADE = 2400;   // must match the opacity transition in the stylesheet

  /**
   * Size the artwork so it covers the letterforms AND leaves room to pan.
   *
   * `background-size: cover` overflows on one axis only — and on a phone the
   * headline box and the paintings land at nearly the same proportion, so it
   * overflowed on neither and the drift had nowhere to go. Oversizing by a
   * fixed margin past cover guarantees travel in both directions at any size.
   */
  const PAN_ROOM = 1.35;

  function sizeLayer(layer, work) {
    if (!work) return;
    // measure a line, since that is the box each background now fills
    const line = layer.querySelector('.bleedline');
    const box = line?.getBoundingClientRect();
    if (!box?.width || !box?.height) return;
    const cover = Math.max(100, 100 * (work.w / work.h) / (box.width / box.height));
    layer.style.setProperty('--art-size', `${(cover * PAN_ROOM).toFixed(1)}%`);
  }

  // the headline box changes shape on rotate, so the sizing has to follow
  addEventListener('resize', () => layers.forEach(l => sizeLayer(l, l._work)));

  let n = 0;
  const step = () => {
    const w = cast[n % cast.length];
    const incoming = layers[n % 2];
    const outgoing = layers[(n + 1) % 2];

    // decode first so the painting is ready to show the instant it fades up
    const img = new Image();
    img.src = w.thumb;
    img.decode().catch(() => {}).then(() => {
      incoming.style.setProperty('--art', `url("${w.thumb}")`);
      incoming._work = w;
      sizeLayer(incoming, w);
      incoming.style.zIndex = '2';                 // paint on top of the outgoing
      outgoing.style.zIndex = '1';

      // restart the pan from the top for this painting
      incoming.classList.remove('is-on');
      void incoming.offsetWidth;                   // flush, so the class re-takes
      incoming.classList.add('is-on');

      aura?.style.setProperty('--aura', w.swatch);

      // hold the old one underneath until the new one is fully up, then let it
      // fade out beneath — the viewer only ever sees one dissolve
      setTimeout(() => outgoing.classList.remove('is-on'), FADE);
      n++;
    });
  };

  // The bleed sits in its final position from the start, while the real
  // headline is still wiping up into place, so hold it back until they line up.
  setTimeout(step, calm.matches ? 0 : 1200);

  // The crossfade is pure opacity and the pan is switched off in the stylesheet
  // under reduced motion, so it can keep going — just more slowly.
  setInterval(step, calm.matches ? 12000 : 8000);
}

initHeroBleed();
requestAnimationFrame(() => document.body.classList.add('is-ready'));


/* ── scroll: progress rail + auto-hiding top bar ────────────────────────── */

const rail = $('.scroll-rail__fill');
const topbar = $('#topbar');
let lastY = window.scrollY;
let ticking = false;

/* How far there is to scroll. Measured here rather than inside the scroll
   handler: scrollHeight is a layout-dependent read, and reading it on every
   frame — right after the handler has just changed a class — forces the
   browser to re-run layout sixty times a second while the finger is moving. */
let scrollMax = 0;
const measureScroll = () => {
  scrollMax = document.documentElement.scrollHeight - window.innerHeight;
};

/* only touch the DOM when a value has actually changed */
let wasStuck = null;
let wasHidden = null;

function onScroll() {
  const y = window.scrollY;

  rail.style.setProperty('--progress', scrollMax > 0 ? (y / scrollMax).toFixed(4) : 0);

  const stuck = y > 8;
  if (stuck !== wasStuck) topbar.classList.toggle('is-stuck', (wasStuck = stuck));

  const hidden = y > 320 && y > lastY && !lightbox.open;
  if (hidden !== wasHidden) topbar.classList.toggle('is-hidden', (wasHidden = hidden));

  lastY = y;
  ticking = false;
}

addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });


/* ── scroll reveal ──────────────────────────────────────────────────────── */

const revealer = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const stagger = [...(el.parentElement?.children ?? [])].indexOf(el) % 4;
    el.style.setProperty('--d', `${stagger * 70}ms`);
    el.classList.add('is-in');
    obs.unobserve(el);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

const watchReveals = (scope = document) =>
  $$('.reveal:not(.is-in), .work:not(.is-in), .indexrow:not(.is-in)', scope)
    .forEach(el => revealer.observe(el));

watchReveals();


/* ── masonry ────────────────────────────────────────────────────────────── */

const gallery = $('#gallery');

/**
 * Give every figure a row span tall enough to hold it, so pieces of different
 * proportions nest together without leaving ragged gaps under the short ones.
 */
function layOutMasonry() {
  if (gallery.hidden) return;

  // a single column needs no spans at all — plain block flow reads better
  if (getComputedStyle(gallery).gridTemplateColumns.split(' ').length === 1) {
    gallery.classList.remove('is-masonry');
    figures.forEach(fig => { fig.style.gridRowEnd = ''; });
    return;
  }

  gallery.classList.add('is-masonry');

  // read the row height back off the grid: computed values are always px,
  // unlike the clamp() sitting in the custom property
  const unit = parseFloat(getComputedStyle(gallery).gridAutoRows) || 8;

  // The figures are `align-items: start`, so each one's height is its own
  // content height whatever row span it currently carries. That means we can
  // measure without wiping the spans first — wiping them collapsed the whole
  // gallery for an instant on every pass, and Chrome's scroll anchoring would
  // try to correct for it by yanking the page.
  const spans = figures.map(fig => Math.ceil(
    (fig.getBoundingClientRect().height
      + (parseFloat(getComputedStyle(fig).marginBlockEnd) || 0)) / unit));

  // write only where something actually changed, so an unchanged gallery
  // costs no style invalidation at all
  figures.forEach((fig, i) => {
    const span = `span ${spans[i]}`;
    if (fig.style.gridRowEnd !== span) fig.style.gridRowEnd = span;
  });
}

/* re-measure whenever anything that changes height settles */
const settle = () => { layOutMasonry(); measureScroll(); };

const relayout = (() => {
  let t;
  return () => { clearTimeout(t); t = setTimeout(settle, 60); };
})();

$$('img', gallery).forEach(img => {
  if (!img.complete) img.addEventListener('load', relayout, { once: true });
});
/* Phones fire `resize` every time the URL bar slides away, which is a height
   change only. Relaying out the gallery mid-scroll was throwing the scroll
   position to the top or bottom; width is all the masonry actually cares about. */
let lastWidth = window.innerWidth;
addEventListener('resize', () => {
  measureScroll();                       // the viewport changed height at least
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  relayout();
});

document.fonts?.ready.then(settle);
settle();


/* ── grid ⇄ index view ──────────────────────────────────────────────────── */

const indexList = $('#indexlist');
const peek = $('#indexpeek');
const peekImg = $('img', peek);

indexList.innerHTML = works.map(w => `
  <li class="indexrow">
    <button type="button" data-open="${w.i}" data-thumb="${w.thumb}">
      <span class="indexrow__num">${String(w.i + 1).padStart(2, '0')}</span>
      <span class="indexrow__title">${w.title}</span>
      <span class="indexrow__note">${w.caption}</span>
    </button>
  </li>`).join('');

$$('.viewtoggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    $$('.viewtoggle button').forEach(b =>
      b.setAttribute('aria-pressed', String(b === btn)));

    gallery.hidden = view !== 'grid';
    indexList.hidden = view !== 'index';
    peek.classList.remove('is-on');
    watchReveals(view === 'grid' ? gallery : indexList);
    if (view === 'grid') layOutMasonry();
  });
});

/* thumbnail that trails the cursor down the index */
let peekTo = { x: 0, y: 0 };
let peekAt = { x: 0, y: 0 };
let peekRaf = 0;

function glide() {
  peekAt.x += (peekTo.x - peekAt.x) * 0.14;
  peekAt.y += (peekTo.y - peekAt.y) * 0.14;
  peek.style.transform = `translate3d(${peekAt.x}px, ${peekAt.y}px, 0)`;
  peekRaf = peek.classList.contains('is-on') ? requestAnimationFrame(glide) : 0;
}

indexList.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || calm.matches) return;
  const btn = e.target.closest('button[data-thumb]');
  peekTo = { x: e.clientX, y: e.clientY };

  if (btn) {
    if (peekImg.src !== btn.dataset.thumb) peekImg.src = btn.dataset.thumb;
    if (!peek.classList.contains('is-on')) {
      peekAt = { ...peekTo };
      peek.classList.add('is-on');
      if (!peekRaf) peekRaf = requestAnimationFrame(glide);
    }
  } else {
    peek.classList.remove('is-on');
  }
});

indexList.addEventListener('pointerleave', () => peek.classList.remove('is-on'));


/* ── lightbox ───────────────────────────────────────────────────────────── */

const lightbox = {
  el: $('#lightbox'),
  img: $('#lb-img'),
  title: $('#lb-title'),
  text: $('#lb-text'),
  now: $('#lb-now'),
  open: false,
  at: 0,
  opener: null,
};

function lbShow(i) {
  const w = works[(i + works.length) % works.length];
  lightbox.at = w.i;

  lightbox.el.classList.add('is-swapping');

  const next = new Image();
  next.src = w.full;
  next.decode().catch(() => {}).then(() => {
    lightbox.img.src = w.full;
    lightbox.img.width = w.w;
    lightbox.img.height = w.h;
    lightbox.img.alt = w.title;
    lightbox.el.classList.remove('is-swapping');
  });

  lightbox.title.textContent = w.title;
  lightbox.text.textContent = w.caption;
  lightbox.now.textContent = w.i + 1;

  // quietly warm up the neighbours so arrow-keying feels instant
  [-1, 1].forEach(d => {
    const n = works[(w.i + d + works.length) % works.length];
    new Image().src = n.full;
  });
}

function lbOpen(i, opener) {
  if (lightbox.open) return lbShow(i);

  lightbox.opener = opener ?? null;
  lightbox.el.hidden = false;
  lbShow(i);

  // keep the page from jumping as the scrollbar disappears
  const bar = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = bar ? `${bar}px` : '';
  document.body.classList.add('is-locked');

  requestAnimationFrame(() => {
    lightbox.el.classList.add('is-open');
    lightbox.open = true;
    $('.lb__x', lightbox.el).focus({ preventScroll: true });
  });
}

function lbClose() {
  if (!lightbox.open) return;
  lightbox.open = false;
  lightbox.el.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  document.body.style.paddingRight = '';

  const done = () => {
    lightbox.el.hidden = true;
    lightbox.img.removeAttribute('src');
    lightbox.opener?.focus({ preventScroll: true });
  };
  calm.matches ? done() : setTimeout(done, 420);
}

document.addEventListener('click', e => {
  const hit = e.target.closest('.work__hit');
  if (hit) return lbOpen(+hit.closest('.work').dataset.index, hit);

  const row = e.target.closest('[data-open]');
  if (row) return lbOpen(+row.dataset.open, row);

  if (e.target.closest('[data-lb-close]')) return lbClose();
  if (e.target.closest('[data-lb-prev]'))  return lbShow(lightbox.at - 1);
  if (e.target.closest('[data-lb-next]'))  return lbShow(lightbox.at + 1);
});

document.addEventListener('keydown', e => {
  if (!lightbox.open) return;

  if (e.key === 'Escape')     { e.preventDefault(); return lbClose(); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); return lbShow(lightbox.at - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); return lbShow(lightbox.at + 1); }

  if (e.key === 'Tab') {                       // keep focus inside the dialog
    const focusable = $$('button, [href]', lightbox.el).filter(el => el.offsetParent);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* swipe between works on touch */
let swipeX = null;
lightbox.el.addEventListener('pointerdown', e => {
  swipeX = e.pointerType === 'touch' ? e.clientX : null;
});
lightbox.el.addEventListener('pointerup', e => {
  if (swipeX === null) return;
  const dx = e.clientX - swipeX;
  if (Math.abs(dx) > 45) lbShow(lightbox.at + (dx < 0 ? 1 : -1));
  swipeX = null;
});


/* ── odds and ends ──────────────────────────────────────────────────────── */

$('#year').textContent = new Date().getFullYear();
