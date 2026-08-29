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
| `founders.html` | Bruce Lautenschlager and Allen Hayne |
| `buy.html` | Both products, and the handoff to the store |

## How the scroll film works

The hero is **not a playing video**. It is 173 stills painted onto a `<canvas>`,
with the frame picked from how far down the track you have scrolled.

Scrubbing a real `<video>` by writing `currentTime` is jittery on most phones and
unreliable on iOS. Drawing decoded images is neither, and it means the whiskey
stops dead when the scroll does — which is the whole effect.

### The shot list

Scrolling walks one continuous move: **the two of them at the fire → the cork
coming out → in on the bottle → through the glass → the pour → the finished
set.** That move is cut in `tools/build-frames.py`, which names a source clip, a
time range, a sampling rate and a zoom/centre pair per shot, then crops and
rescales every frame to match. The camera move is therefore **baked into the
frames** — real footage re-framed, not a CSS transform over a still — so it
costs the page nothing and cannot drift out of sync with the scroll.

| Shot | Source | Sampled | Share of the scroll |
| --- | --- | --- | --- |
| The two of them, wide | `camp.mp4` 0.05–0.8s | 12fps | 0 – 5% |
| Moving in on his hands | `camp.mp4` 0.8–1.2s | 12fps | 5 – 8% |
| **The cork comes out** | `camp.mp4` 1.2–2.05s | **24fps** | 8 – 20% |
| He presents the bottle | `camp.mp4` 2.05–2.6s | 24fps | 20 – 27% |
| Push in, to the shoulder | `camp.mp4` 2.6–3.25s | 24fps | 27 – 36% |
| **Through the glass** | `camp.mp4` 3.25–3.44s | 24fps | 36 – 39% |
| **The pour begins** | `camp.mp4` 3.47–5.4s | 24fps | 39 – 66% |
| **The pour completes** | `pour.mp4` 6.1–7.4s | 24fps | 66 – 85% |
| The whiskey settles | `pour.mp4` 7.4–8.65s | 12fps | 85 – 94% |
| The finished set | `pour.mp4` 8.7–10.0s | 8fps | 94 – 100% |

Two rules govern that list, and both matter more than they look:

- **The sampling rate steps by at most one level between neighbours** — 12 → 12
  → 24 → … → 12 → 8. Scroll distance is spent per *frame*, so a shot sampled at
  8fps sitting next to one sampled at 24fps makes the action appear to drop to a
  third speed the moment you cross the boundary. Ramping the density instead of
  stepping it is most of what makes the whole thing read as one take.
- **Anything the eye is meant to follow runs at the source's full 24fps and is
  framed tight enough to see it.** The cork pull used to sit at 8fps inside the
  wide shot, which is exactly why it did not read as a cork coming out.

Two joins needed care:

- **The pour spans both clips.** `camp.mp4` burns in a caption from 5.55s, so
  the pour finishes on the original clip. Both cups are at the same level and
  framed the same way at the join, so it reads as one continuous pour.
- **Through the glass is a match cut, not a dissolve.** The push ends on the
  amber in the bottle's shoulder and goes soft; the close-up cuts in with the
  bottle still in frame, and the move comes back out of the same amber before
  pulling back to find the cup.

`assets/js/pour.js` reads the shot boundaries out of `frames/manifest.json`, so
the copy is pinned to the cut rather than to guessed numbers.

### Why it feels smooth

Four things, and all four are dealt with:

1. **The film follows the scrollbar, it does not track it.** A wheel notch moves
   the page in one jump. `pour.js` eases the drawn position toward the scroll
   position — 15% of the remaining distance per 60Hz frame — which turns that
   jump into a glide. The easing is scaled by elapsed time, so it closes the gap
   at the same wall-clock rate on a 120Hz display as on a 60Hz one, and a
   backgrounded tab handing back a gap of seconds cannot snap the whole film in
   one frame. The loop runs only while it still has ground to cover, so a page
   at rest costs nothing.
2. **Frames are blended, not snapped to.** 173 frames spread over thousands of
   pixels means landing on whole frames steps visibly. The canvas draws the
   frame you are between at partial alpha, dissolving one into the next. On real
   footage that already carries its own motion blur, that reads as movement.
3. **The first pass is dense enough to scrub against.** Until the whole sequence
   has arrived the canvas can only show what it holds, so a sparse first pass
   looks like a slideshow. It now loads every 4th frame first, over 8 sockets,
   and repaints when a sharper frame lands.
4. **The cut itself is denser and its density ramps.** 173 frames rather than
   144 is ~24px of scroll per frame instead of ~29, and no boundary changes the
   apparent speed by more than one step. See the shot list above.

**What was tried and rejected:** motion interpolation (`ffmpeg minterpolate`,
`mi_mode=mci`) to synthesise in-between frames. It is clean on the cork, where
the motion is a hand and a bottle, but on the pour it smears the stream into a
soft column — the synthesised frames lose its shape, so the sequence alternates
crisp and blurry and reads as pulsing. Worse than the stepping it fixes. The
canvas cross-fade in (2) gets the same smoothing with none of the artefacts,
because it dissolves rather than inventing motion.

Scrubbing a `<video>` with `currentTime` was also tried and rejected: both
source clips carry only 2–3 keyframes across their whole ten seconds, and the
pour section contains none at all, so every seek inside it costs the browser a
decode from up to 3.5 seconds earlier. Re-encoding all-intra fixes the seeking
but costs 5.3MB for one clip — more than the 3.2MB frame sequence costs for
both.

### Loading

Frames load in two passes: every 4th frame first, which is enough to scrub
against within about a second, then the rest fill in behind it — pour first,
since that is the part anyone actually watches. Until a frame arrives the
canvas draws the nearest one it holds, so a half-loaded sequence still moves
instead of blinking. Six requests run at a time; saturating the connection with
173 makes the *first* frames arrive later, not sooner.

Two widths are built (1280px and 720px, ~3.2MB and ~1.6MB). The page picks one
from the viewport at load and keeps it — re-picking on resize would throw away
everything already decoded for no visible gain.

### Where the copy sits

**In a band along the bottom, never across the picture.** The film's subject —
two men at a table — lives in the middle of the frame, and copy laid over them
reads as a caption stuck on a photograph rather than as a scene you are looking
at. The scrim follows: there are no side curtains, only a gradient that stays
clear through the middle of the frame and reaches near-solid at the very bottom
so bold type lands on a clean ground.

The hero headline is set in **Libre Caslon Text at 700**, not the display cut.
Caslon Display is a hairline face — lovely at rest, thin over moving film. The
text cut is the same family with far more weight on the stem, and it holds at a
glance. Sizes are tuned to the band rather than inherited from the page scale,
since the bold cut sets much larger than the display one at the same value.

The spec ledger runs as a strip along the very bottom (three or two columns on a
phone) rather than a column up the right-hand side, so it never crosses the
picture either. Entries light left to right as the cup fills.

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
  fact shown at once, and **no frames are downloaded at all** (saves ~3.2MB).
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
  the footer of each page and on `buy.html`.
- **The compliance wording** in the footer, and the shipping notes on
  `buy.html`. The flat rates ($19.99 up to four bottles, $29.99 for five or six)
  are read off the store; the age and state rules are legal claims and should be
  checked against what the store actually enforces.
- **"American Founders Distilling Co."** in the footer copyright.
- **The 250th-anniversary and Jefferson-cup history** on `heritage.html` is
  broadly accurate but written as marketing, not as citation.
- **What each partner does.** The organisations on `partnerships.html` are the
  ones you listed, but the one-line description under each ("Barrel work for the
  Heritage Select release", "Raising money for first responders") is inferred
  from the name. Check every one.

### Founder portraits

Same arrangement as the partner logos, in `assets/img/founders/`. Each portrait
is a circle fitted with `object-fit: cover`, so a photograph crops to the circle
rather than squashing into it, whatever shape it arrives in. Until the files are
added, each shows the founder's initials. Swap the `<span>` for an `<img>` in
`founders.html` — the comment above each one shows the exact line.

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

## Buying

The bourbon is sold through **Kentucky Bourbon Direct**:

<https://foundersrevolution250.kybourbondirect.com/>

Nothing is transacted on this site. Every buy button is an external link to that
store, which handles payment, age verification and shipping. On the store the
two products are listed as:

| On this site | On the store | Price |
| --- | --- | --- |
| The 250 Collector's Set | American Founders Heritage Select 250 Special Bundle | $250 |
| The Bottle Alone | American Founders Heritage Select 250 Bourbon 750ml | $95 |

**The URL lives in one place** — `STORE` at the top of `assets/js/data.js`. It is
also written into each link's `href` so the buttons still work with scripting
off, and `site.js` overwrites every `[data-store]` link from `data.js` at load.
Change it in `data.js` and re-run `python3 tools/build-demo.py`; to change the
hard-coded fallbacks too, search the HTML for `kybourbondirect`.

Every external link opens in a new tab, carries `rel="noopener noreferrer"`, is
marked with a `↗`, and tells a screen reader where it is going.

There used to be a browser-side reservation form here (`reserve.html`), built
when there was no storefront. **It has been removed** — with a real store live,
a form that collects an order and emails it would have quietly competed with the
real checkout, and anyone who used it would never have received a bottle.

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
