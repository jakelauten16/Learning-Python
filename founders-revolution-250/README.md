# American Founders — Heritage Select 250

A static site for the Founders Revolution 250 bourbon release. Five pages, no
framework, no build step, no server. Open `index.html` in a browser and it works.

The whole site is built around one thing: **the pour**. The home page hero is
the product film, scrubbed by the scrollbar, with the product facts arriving
while the whiskey is still falling.

## Pages

| File | What it does |
| --- | --- |
| `index.html` | The scroll-driven pour, then the box, the whiskey, both ways to buy |
| `collectors-box.html` | The five pieces in the box, and the box itself |
| `bourbon.html` | Tasting notes, the full specification, how to drink it |
| `heritage.html` | The 250th — the eagle, the Jefferson cup, the typeface |
| `partnerships.html` | The makers, the SAR and DAR, and the Terre Haute organisations |
| `reserve.html` | Reservation request with a printed receipt |

## How the scroll film works

The hero is **not a playing video**. It is 144 stills painted onto a `<canvas>`,
with the frame picked from how far down the track you have scrolled.

Scrubbing a real `<video>` by writing `currentTime` is jittery on most phones and
unreliable on iOS. Drawing decoded images is neither, and it means the whiskey
stops dead when the scroll does — which is the whole effect.

### The shot list

Scrolling walks one continuous move: **the two men at the fire → in on the
bottle → through the glass → the pour → the finished set.** That move is cut in
`tools/build-frames.py`, which names a source clip, a time range, a sampling
rate and a zoom/centre pair per shot, then crops and rescales every frame to
match. The camera move is therefore **baked into the frames** — real footage
re-framed, not a CSS transform over a still — so it costs the page nothing and
cannot drift out of sync with the scroll.

| Shot | Source | Sampled | Share of the scroll |
| --- | --- | --- | --- |
| The two of them, wide | `camp.mp4` 0.3–1.9s | 8fps | 0 – 9% |
| Push in, on the bottle | `camp.mp4` 1.9–2.9s | 12fps | 9 – 17% |
| The bottle in his hand | `camp.mp4` 2.9–3.3s | 24fps | 17 – 24% |
| **Through the glass** | `camp.mp4` 3.3–3.4s | 24fps | 24 – 27% |
| **The pour begins** | `camp.mp4` 3.5–5.4s | 24fps | 27 – 60% |
| **The pour completes** | `pour.mp4` 6.1–7.4s | 24fps | 60 – 82% |
| The whiskey settles | `pour.mp4` 7.4–8.7s | 12fps | 82 – 92% |
| The finished set | `pour.mp4` 8.7–10.0s | 8fps | 92 – 100% |

Two details worth knowing:

- **The pour spans both clips.** `camp.mp4` burns in a caption from 5.55s, so
  the pour finishes on the original clip. Both cups are at the same level and
  framed the same way at the join, so it reads as one continuous pour.
- **Through the glass is a match cut, not a dissolve.** The push ends on the
  amber in the bottle's shoulder and goes soft; the close-up cuts in with the
  bottle still in frame, and the move comes back out of the same amber before
  pulling back to find the cup.

Sampling is deliberately uneven: the pour runs at the source's full 24fps while
the near-static wide shots are thinned out. Scroll distance is spent per *frame*
rather than per second, so that alone gives the pour 55% of the track at a
fraction of the bytes. `assets/js/pour.js` reads the shot boundaries out of
`frames/manifest.json`, so the copy is pinned to the cut rather than to guessed
numbers.

### Firelight

The clip was shot in a tavern, so the frames are graded towards firelight in the
build (warm lows, cool highlights, a closed-down vignette). Two things a grade
cannot do are added at runtime by `pour.js`: a glow that breathes, and embers
drifting up on their own canvas and their own rAF loop — so the film underneath
is repainted only when the scroll actually moves, and only while the hero is on
screen. Both belong to the camp, and fade out as the push enters the bottle.

**What is not there:** the encampment itself. See "The encampment shot" below.

### Why it feels smooth

Three things were making the scrub stutter, and all three are dealt with:

1. **The film follows the scrollbar, it does not track it.** A wheel notch moves
   the page in one jump. `pour.js` eases the drawn position toward the scroll
   position — 15% of the remaining distance per animation frame — which turns
   that jump into a glide. The loop runs only while it still has ground to
   cover, so a page at rest costs nothing.
2. **Frames are blended, not snapped to.** 144 frames spread over thousands of
   pixels means landing on whole frames steps visibly. The canvas draws the
   frame you are between at partial alpha, dissolving one into the next. On real
   footage that already carries its own motion blur, that reads as movement.
3. **The first pass is dense enough to scrub against.** Until the whole sequence
   has arrived the canvas can only show what it holds, so a sparse first pass
   looks like a slideshow. It now loads every 4th frame first, over 8 sockets,
   and repaints when a sharper frame lands.

### Loading

Frames load in two passes: every 4th frame first, which is enough to scrub
against within about a second, then the rest fill in behind it — pour first,
since that is the part anyone actually watches. Until a frame arrives the
canvas draws the nearest one it holds, so a half-loaded sequence still moves
instead of blinking. Six requests run at a time; saturating the connection with
144 makes the *first* frames arrive later, not sooner.

Two widths are built (1280px and 720px, ~2.8MB and ~1.3MB). The page picks one
from the viewport at load and keeps it — re-picking on resize would throw away
everything already decoded for no visible gain.

### Where the copy comes from

Every fact over the film is real text in the document, tagged with the scroll
window it owns:

```html
<div class="pour__beat" data-cue="0.300,0.440">   <!-- fades in, then out -->
<li data-cue="0.320">                              <!-- lights up and stays -->
```

`pour.js` writes a `--t` between 0 and 1 onto each one and CSS does the rest.
Invisible cues keep their place in the accessibility tree, so a screen reader
gets the product facts without scrubbing anything; the one cue holding a link
gets `inert` while hidden so nothing invisible keeps a tab stop.

### When it doesn't run

- **`prefers-reduced-motion`** — the hero collapses to the poster with every
  fact shown at once, and **no frames are downloaded at all** (saves ~2.8MB).
  The embers never start.
- **No JavaScript** — a `<noscript>` block does the same thing, and hides the
  age gate, which otherwise could never be dismissed.
- **Portrait phones** — a 16:9 frame covering a tall viewport shows about a
  quarter of its width, so the picture runs as a band across the top instead,
  feathered into the ground, with the copy below it.

## The encampment shot

The brief was for the two of them **sitting around a fire with the rest of the
Continental Army — thousands of soldiers, tents and fires behind them.** That
footage does not exist in either source clip, and generating it needs an
image/video model, which this build does not have. What is here instead is
everything that *can* be done to the footage that exists: the firelight grade,
the breathing glow, the drifting embers, and a vignette that takes the tavern
shelves down into the dark.

To drop the real thing in when you have it (Sora, Runway, Veo — a 10s plate of
the two of them at a fire with the camp behind):

1. Save it as `assets/media/camp.mp4`, replacing the current clip.
2. Open `tools/build-frames.py` and adjust the `SHOTS` rows that use `CAMP` —
   the time ranges, and the `cx/cy` centres the push aims at (they are
   fractions of the frame, and currently aimed at the bottle in his hand).
3. Re-run the script. It prints the new shot boundaries; move the `data-cue`
   values in `index.html` to match.

If the new plate is already firelit, drop the `FIRE` grade to `CLOSE` on those
rows so it is not graded twice.

## Rebuilding the frames

The two source clips live at `assets/media/camp.mp4` (the two men, and their
pour) and `assets/media/pour.mp4` (the original close-up, used for the pour's
back half and the clean tail). Replace either and re-run:

```
pip install imageio-ffmpeg     # or just have ffmpeg on PATH
python3 tools/build-frames.py
```

That rewrites `assets/media/frames/` (both widths plus `manifest.json`),
`poster.jpg`, and `og.jpg`. Commit what it produces. If your film has a
different shape, edit `SHOTS` at the top of the script — and move the
`data-cue` values in `index.html` to match the new boundaries it prints.

The section photographs in `assets/img/` are stills pulled from the same film
(see the `shot` calls in the git history, or just grab new ones with ffmpeg).

## Editing the release

**`assets/js/data.js` holds everything you'd change.** Prices, the allocation
counter, tasting notes and the specification table are read from it, so each
figure is stated once and cannot drift between pages. Anything in the markup
tagged `data-val="..."` is filled in from there at load.

To mark sets as sold, change `claimed`. The counter, the bar, and the
"N of 250 remain" lines all follow.

## Things to confirm before this goes live

These were written to make the site complete. Some are from the product itself;
some are **placeholders that need a pass from someone who knows the business**.

**Real** — taken from the product and the existing site: the name, 7-year age
statement, single barrel, cask strength, 120 proof / 60% ALC/VOL, 750ml, the
250-set limit, the six things in the box, and the prices ($250 the set, $95 the
bottle).

**Placeholder — check these:**

- **The allocation counter.** `claimed: 184` is invented. It is a plain number
  in `data.js`, not a live feed — it will not update itself.
- **Mash bill, entry proof, "Kentucky", the rickhouse detail, and every tasting
  note.** All plausible, none verified. The mash bill in particular is a claim
  about your whiskey.
- **`allocations@foundersrevolution250.com`** — set this to a real address in
  the footer of each page and in `TO` at the top of `assets/js/reserve.js`.
- **The shipping states** in the reserve form, and the compliance wording in the
  footer. These are legal claims and need a real answer.
- **"American Founders Distilling Co."** in the footer copyright.
- **The 250th-anniversary and Jefferson-cup history** on `heritage.html` is
  broadly accurate but written as marketing, not as citation.
- **What each partner does.** The organisations on `partnerships.html` are the
  ones you listed, but the one-line description under each ("Barrel work for the
  Heritage Select release", "Raising money for first responders") is inferred
  from the name. Check every one.

### Partner logos

No logo artwork was supplied, so each card shows the partner's name set in type
inside the box the logo will occupy. To add the real files:

```html
<div class="partner__mark"><img src="assets/img/partners/sar.png" alt="Sons of the American Revolution"></div>
```

The box is a fixed 5:3 and the image is fitted with `object-fit: contain`, so a
tall crest and a wide wordmark both sit correctly inside it and **neither is
ever stretched** — which is what was going wrong on the old site. Drop the files
in `assets/img/partners/` at whatever size they come in; the box handles it.

## How reserving works right now

There is no payment processor and no server. A reservation is validated in the
browser, given a reference like `AF-250-QAFU`, shown as a receipt, and handed
off as a pre-written email. Nobody is charged until someone replies to confirm
the allocation — which is how allocated whiskey is actually sold, and which
means the page works today on any static host.

### Wiring it to a real backend

Everything funnels through the submit handler in `assets/js/reserve.js`. The
reservation is already assembled as an object (`collect()`) and as plain text
(`summary()`); `POST` either one to your endpoint and keep the receipt screen as
the confirmation. A hosted form service (Formspree, Netlify Forms) drops in at
the same point. If you take payment later, the receipt is where a checkout
redirect goes.

## Running it locally

```
python3 -m http.server 8000
```

Then open <http://localhost:8000/founders-revolution-250/>. Any static host
works — GitHub Pages, Netlify, Cloudflare Pages — since there is nothing to build.

## Demoing it without a server

`demo.html` is the whole home page as **one self-contained file**: the frame
sequence, the poster and the section photographs are all inlined as data URIs,
and the nav walks the page instead of loading others. Open it by double-clicking
it, email it, put it on a USB stick, or drop it in a deck — it needs no server
and no network beyond Google Fonts. It is ~2.2MB, so give it a second on a slow
connection.

Rebuild it after re-cutting the frames, or it will still show the old cut:

```
python3 tools/build-demo.py
```

## Design notes

- **Type.** Caslon, because the Declaration was set in it — Libre Caslon Display
  for headlines, Libre Caslon Text for body. Inter does the small mechanical
  work: labels, nav, figures, form fields. All three are self-hosted in
  `assets/fonts/` (~150KB, latin subsets), so no request leaves for a third
  party and nothing breaks if Google Fonts is blocked. All are SIL Open Font
  License 1.1; the licences ship alongside them.
- **Colour.** Two grounds only — "night", the bar the film was shot in, and
  "parchment", the paper the Declaration was printed on — with oxblood for
  weight and a whiskey amber sampled off the film itself for every accent.
- **The age gate** asks once per session, traps focus while it is up, and fails
  open when scripting is off.
- **Accessibility.** Keyboard focus is visible throughout, the form names what
  went wrong and how to fix it, the hero's copy stays in the accessibility tree
  whether or not it is visible on screen, and `prefers-reduced-motion` turns off
  the scrub, the grain, and the scroll cue.
