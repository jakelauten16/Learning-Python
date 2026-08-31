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

## How the hero works

It runs in **two phases**, and they use different machinery on purpose.

### Phase A — the camp, 0 to 6.47s

An ordinary muted `<video>` plays the lead-in: two soldiers at a fire with the
Continental Army's tents and campfires stretching along the river behind them,
and the bottle coming out. **Linear playback needs no seeking**, so it is
perfectly smooth and keeps the source's full quality. This is the part that
plays by itself when the page loads.

### Phase B — the pour, 6.47s to the end

At the handoff the video pauses and a `<canvas>` takes over, painting 85 stills
chosen by how far down the track you have scrolled. Scrubbing a `<video>` by
writing `currentTime` is jittery and unreliable — these clips carry only a
handful of keyframes across ten seconds, and the pour section contains none —
so the pour is stills instead.

**The join is a cut in the source itself.** At 6.47s the camera cuts to the tight
close-up with the stream already running, so pausing the video on that frame and
revealing a canvas showing the same frame is invisible.

### Why it looks sharper than it used to

Three things, in order of how much they mattered:

1. **Nothing is zoom-cropped.** The previous cut faked camera moves by cropping
   2–4× into a 1280px source and upscaling back out, which is what made it soft.
   This clip does its own cuts — wide, medium, close — so every frame ships at
   native framing.
2. **The grade is almost nothing.** `eq=contrast=1.04:saturation=1.03` and no
   vignette. The footage is already golden hour and firelight; the old heavy
   grade was fighting it. The synthetic embers and firelight glow are gone too —
   this clip has real fires in it.
3. **Higher webp quality** (88 at 1280px, up from 76). These are frames someone
   stares at while scrubbing, and compression mush reads as "blurry video".

### Scrolling is never blocked

Any scroll during the lead-in ends it early and dissolves into the pour. Trapping
someone on an autoplaying video is a worse sin than cutting a shot short. The
`data-phase` attribute distinguishes the two: `scrub` swaps instantly (the
pictures are identical), `scrub-cut` cross-fades over 280ms (they are not).

### When the video will not play

A watchdog hands over to the pour if the clock has not moved 1.8s after load.
Autoplay can be refused silently — iOS low power mode, data saver — and a
Chromium built without the proprietary H.264 decoder sits at `readyState 0`
forever without firing an error. Either way nobody is left on a frozen poster.

Two encodes ship for the same reason: **VP9 WebM first** (smaller, and covers
codec-less Chromium), **H.264 MP4 second** (Safari). Sources are attached by
`pour.js` rather than sitting in the markup, so a reduced-motion visitor never
fetches a film they will not watch.

### Frames still blend and the scroll still eases

Both from the previous build and both still load-bearing: the canvas draws the
frame you are *between* at partial alpha, and the drawn position eases toward
the scroll position (15% of the remaining distance per 60Hz frame, scaled by
elapsed time so 120Hz behaves the same).

### Loading

85 frames, nearest-the-start first, eight at a time. The lead-in buys several
seconds of cover, so by the time anyone reaches the pour the sequence is
normally complete. Two widths are built (1280px ≈ 2.7MB, 720px ≈ 1.0MB); the
page picks one at load and keeps it.

### When it doesn't run

- **`prefers-reduced-motion`** — the hero collapses to the poster with every
  fact shown at once, and **nothing is downloaded**: no frames, no video.
- **No JavaScript** — a `<noscript>` block does the same, and hides the age gate,
  which otherwise could never be dismissed.
- **Portrait phones** — the picture runs as a band across the top, feathered into
  the ground, with the copy below.

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

One source clip now, at `assets/media/camp.mp4` — the encampment film, which
carries the whole hero from the fire through to the finished pour. Replace it
and re-run:

```
pip install imageio-ffmpeg     # or just have ffmpeg on PATH
python3 tools/build-frames.py
```

That rewrites `hero-lead.mp4`, `hero-lead.webm`, `assets/media/frames/` (both
widths plus `manifest.json`), `poster.jpg` and `og.jpg`. Commit what it produces.

**The one number that matters is `HANDOFF`** at the top of the script: the second
at which the lead-in stops and the scroll takes over. It must land on the cut to
the pour, or the join will show. If you swap the film, find that cut first.
`LEAD_SHARE` in `pour.js` says how much of the cue timeline the lead-in owns
(0.40) — the `data-cue` values in `index.html` are on that same 0–1 scale.

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
