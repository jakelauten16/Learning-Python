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
| `reserve.html` | Reservation request with a printed receipt |

## How the pour works

The hero is **not a playing video**. It is 140 stills painted onto a `<canvas>`,
with the frame picked from how far down the track you have scrolled.

Scrubbing a real `<video>` by writing `currentTime` is jittery on most phones and
unreliable on iOS. Drawing decoded images is neither, and it means the whiskey
stops dead when the scroll does — which is the whole effect.

**The frames are sampled unevenly on purpose.** `tools/build-frames.py` keeps the
pour itself at the source's full 24fps and thins out the near-static bar shots at
either end. Because scroll distance is handed out per *frame* rather than per
second, that alone makes the pour occupy about 54% of the scroll while costing
far fewer bytes than sampling the whole clip densely:

| Section of the film | Sampled at | Share of the scroll |
| --- | --- | --- |
| Bar at rest (0.0–3.6s) | 8fps | 0 – 21% |
| Hand takes the bottle (3.6–4.3s) | 12fps | 21 – 27% |
| **The pour (4.3–7.4s)** | **24fps** | **27 – 81%** |
| Whiskey settles (7.4–8.7s) | 12fps | 81 – 92% |
| Pull back to the set (8.7–10.0s) | 8fps | 92 – 100% |

`assets/js/pour.js` reads those boundaries out of `frames/manifest.json`, so the
copy is pinned to the film rather than to guessed numbers.

### Loading

Frames load in two passes: every 6th frame first, which is enough to scrub
against within about a second, then the rest fill in behind it — pour first,
since that is the part anyone actually watches. Until a frame arrives the
canvas draws the nearest one it holds, so a half-loaded sequence still moves
instead of blinking. Six requests run at a time; saturating the connection with
140 makes the *first* frames arrive later, not sooner.

Two widths are built (1280px and 720px, ~3.5MB and ~1.7MB). The page picks one
from the viewport at load and keeps it — re-picking on resize would throw away
everything already decoded for no visible gain.

### Where the copy comes from

Every fact over the film is real text in the document, tagged with the scroll
window it owns:

```html
<div class="pour__beat" data-cue="0.335,0.505">   <!-- fades in, then out -->
<li data-cue="0.345">                              <!-- lights up and stays -->
```

`pour.js` writes a `--t` between 0 and 1 onto each one and CSS does the rest.
Invisible cues keep their place in the accessibility tree, so a screen reader
gets the product facts without scrubbing anything; the one cue holding a link
gets `inert` while hidden so nothing invisible keeps a tab stop.

### When it doesn't run

- **`prefers-reduced-motion`** — the hero collapses to the poster with every
  fact shown at once, and **no frames are downloaded at all** (saves ~3.5MB).
- **No JavaScript** — a `<noscript>` block does the same thing, and hides the
  age gate, which otherwise could never be dismissed.
- **Portrait phones** — a 16:9 frame covering a tall viewport shows about a
  quarter of its width, so the picture runs as a band across the top instead,
  feathered into the ground, with the copy below it.

## Rebuilding the frames

Replace `assets/media/pour.mp4` and re-run:

```
pip install imageio-ffmpeg     # or just have ffmpeg on PATH
python3 tools/build-frames.py assets/media/pour.mp4
```

That rewrites `assets/media/frames/` (both widths plus `manifest.json`),
`poster.jpg`, and `og.jpg`. Commit what it produces. If your film has a
different shape, edit `SEGMENTS` at the top of the script — and move the
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
250-set limit, and the six things in the box.

**Placeholder — check these:**

- **Prices.** `$1,250` for the box and `$279` for the bottle are invented.
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
