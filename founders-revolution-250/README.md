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

### At rest — the camp loops

While the page sits at the top, a muted `<video>` **loops**: two soldiers at a
fire with the Continental Army's tents and campfires stretching along the river
behind them, and the bottle coming out. **Linear playback needs no seeking**, so
it is smooth and keeps the source's full quality.

The lead-in is cut to end **exactly on the edit at 6.47s** — the frame before the
camera cuts to the pour. That matters: a loop that ran even a few frames past it
would flash the payoff on every repeat, before anyone had scrolled for it.

### On scroll — the pour

The first scroll cuts to a `<canvas>` painting 85 stills chosen by how far down
the track you have scrolled. Scrubbing a `<video>` by writing `currentTime` is
jittery and unreliable — these clips carry only a handful of keyframes across
ten seconds, and the pour section contains none — so the pour is stills instead.

**Scroll back to the top and the loop resumes.** The phase is decided by scroll
position alone, never by the video clock: the film at rest is ambient, and
nothing about it should decide when the customer sees the whiskey. There is 8px
of travel before the cut commits and 2px before it returns, so a trackpad twitch
at the top cannot flicker between the two.

Because the film loops, **the copy cannot ride the video clock** — it would march
through its beats on every repeat. All the `data-cue` values are on a plain 0–1
scroll scale across the pour, and the opening beat is simply the one showing at
progress 0.

**To shorten the loop** — so it never shows the bottle reaching the cup, and
restarts on the source's own earlier edit instead — set `LEAD_END = 4.15` in
`tools/build-frames.py` and rebuild. `HANDOFF` stays at 6.47 either way.

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
- **Portrait phones** — see below.

### Portrait shows the whole frame, not a crop

Covering a phone with 16:9 footage means throwing away **half the width** — on
every common handset it worked out to almost exactly 50%. That is the half this
film lives in: the tents, the campfires, the army along the river. So on portrait
the band is **fitted to the full width and letterboxed** into the ground. It
costs height (about 26% of the screen instead of 52%) and keeps the picture.

The geometry is measured in `pour.js` and written out as `--band-top`,
`--band-h` and `--band-bottom` custom properties. The `<video>` at rest and the
`<canvas>` during the pour then read the same numbers, so both occupy exactly
the same rectangle and the cut between them does not jump. The copy sits
directly under the measured band edge rather than hanging off the bottom.

**A note for anyone editing these rules.** The portrait overrides are split
across two `@media (max-aspect-ratio: 10/13)` blocks in `site.css`, and that is
deliberate: the band rules sit after `.pour__video` / `.pour__poster` /
`.pour__shade`, and the copy rules sit after `.pour__copy`. They are the same
specificity as the rules they override, so **source order is what decides** —
put them earlier in the file and they silently do nothing.

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

### Founder portraits and partner logos

**Both are drop-in. There is no markup to edit for either.**

Every slot already holds an `<img>` at the expected path, sitting in the same
grid cell as a typographic stand-in — the founder's initials, or the partner's
name. When the file exists the artwork covers the stand-in and `site.js` hides
it; when the file is missing, `site.js` removes the broken `<img>` and the
stand-in shows through. No broken-image glyphs, and adding a photograph is
putting a file in a folder.

Paths and filenames are listed in `assets/img/founders/README.md` and
`assets/img/partners/README.md`.

One thing worth knowing for portraits: **supply the original rectangular
photograph, not a pre-cropped circle.** The frame is a circle and the image is
fitted with `object-fit: cover`, so the site does the cropping — handing it a
circle already cut out of a dark square gives you a circle inside a circle.

The partner box is a fixed 5:3 fitted with `object-fit: contain`, so a tall
crest and a wide wordmark both sit correctly inside it and **neither is ever
stretched** — which is what was going wrong on the old site. Drop files in at
whatever size they come in.

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

Note that Python's `http.server` does not answer HTTP Range requests, which
`<video>` needs — the looping camp film will not play under it. Everything else
does. `tools/` has a range-capable server if you need the film locally.

## Publishing it

Any static host works, since there is nothing to build. **See `DEPLOY.md`** —
it covers the one thing that is not obvious: `foundersrevolution250.com` is
already serving a different (Squarespace) site, so the domain is a decision
before it is an upload. It also lists what ships (6.7 MB) and what does not
(`camp.mp4`, `demo.html`), and the pre-launch checklist.

If the site is published on a host other than `foundersrevolution250.com`,
change `HOST` in `tools/build-sitemap.py` and run it — that keeps
`sitemap.xml`, `robots.txt` and the pages' canonical URLs pointing at one
place. `python3 tools/build-sitemap.py --check` names anything still stale.

## Buy buttons

Every buy button carries `data-store="box"` or `data-store="bottle"` and
deep-links to that product at Kentucky Bourbon Direct, so a customer lands on
the item rather than the shop's front door. The URLs live in `assets/js/data.js`
and in the markup, so the links work with scripting off; `site.js` re-applies
them from `data.js` at load so there is one place to change them. **If a
product handle changes at the store, the deep link 404s** — the two handles are
`american-founders-heritage-select-250-kit` and
`american-founders-heritage-select-250-bourbon-750ml`.

## Demoing it without a server

`demo.html` is the whole home page as **one self-contained file**: the frame
sequence, the lead-in film (both encodes), the poster, the section photographs
and the founder portraits are all inlined as data URIs,
and the nav walks the page instead of loading others. Open it by double-clicking
it, email it, put it on a USB stick, or drop it in a deck — it needs no server
and no network beyond Google Fonts. It is ~2.2MB, so give it a second on a slow
connection.

Artwork that has not been supplied yet — the partner logos — has its `<img>`
dropped at build time rather than shipped as a request that can only fail, so
the typographic stand-in shows and nothing 404s. Add the file and rebuild and it
appears.

Rebuild it after re-cutting the frames or adding artwork, or it will still show
the old one:

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
