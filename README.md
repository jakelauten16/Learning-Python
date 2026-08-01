# Lucy Lou's Coffee — website

A rebuild of [lucylouscoffee.com](https://lucylouscoffee.com/) as a static site:
five pages, no build step, no framework, no server. Open `index.html` in a
browser and it works.

The site is organised around the one thing a trailer business actually is —
a route. Where the trailer is parked drives the home page, and it drives the
preorder flow too: you pick a stop before you can pick a drink.

## Pages

| File | What it does |
| --- | --- |
| `index.html` | Hero, live route board, seasonal drinks, the trailer, upcoming events |
| `menu.html` | Full menu with the seasonal group pinned to the top |
| `preorder.html` | Three-step preorder: stop → drinks → pickup time → ticket |
| `trailer.html` | Trailer vs. cart, specs, venue requirements, service area |
| `events.html` | Public calendar, booking packages, date request form |

## Editing the site

**Everything you'd change week to week lives in `assets/js/data.js`.** Nothing
else needs to be touched.

- `STOPS` — the route board and the preorder stop picker. Add a stop with its
  date, open/close times, and whether it's the trailer or the cart. Past stops
  drop off on their own; you don't have to delete them.
- `MENU` — every drink, grouped. The group with `season: true` is pinned to the
  top of the menu and feeds the seasonal section on the home page. Set
  `available: false` on an item to mark it off the board.
- `EVENTS` / `PAST_EVENTS` — the events page and the home-page strip.
- `PACKAGES` — the wedding / corporate / party booking cards.
- `SIZES`, `MILKS`, `EXTRAS` — the options offered when someone customises a drink.

Dates are `YYYY-MM-DD` and times are 24-hour `HH:MM`. Weekday names are worked
out at render time, so a typo in a day name isn't possible.

### Things worth confirming before this goes live

These were filled in to make the site complete and need a pass from someone who
knows the business:

- **Prices.** The current site doesn't publish most of them, so these are
  plausible placeholders. The three Lotus prices that *were* on the live site
  ($12 / $15 / $22) looked like unedited template defaults, so they weren't
  carried over.
- **Stops and events.** Written as realistic examples for Northwest Indiana.
  Replace with the real calendar.
- **Trailer specs, service area, packages, and the "since 2023" line.**
  Reasonable for a rig this size, but they're claims about your business.
- **Photos.** Only one real image was available from the current site
  (`assets/img/pour-iced-latte.jpg`). Photos of the trailer itself would carry
  the "this is a trailer business" point far better than any copy does.
- **Social links.** Instagram and TikTok point at the real handles; the
  Facebook link is a placeholder.
- **`hello@lucylouscoffee.com`** in `assets/js/booking.js` — set this to the
  real address.

## How ordering works right now

There is no payment processor and no server. A preorder is validated in the
browser, given an order code, and handed off as a pre-written text message to
(219) 743-7216. The customer pays at the window. For a trailer that's a
reasonable place to start — it works today, on a phone, with nothing to run.

The date request form on `events.html` works the same way, with an email
fallback.

### Wiring it to a real backend

Both flows funnel through one place each, so swapping in a service is a small
change:

- **Preorders** — `submitOrder()` in `assets/js/preorder.js`. The full order is
  already assembled as `order` (stop, lines, pickup details) and as plain text
  via `orderText()`. `POST` either one to your endpoint and keep the receipt
  screen as the confirmation.
- **Date requests** — the submit handler in `assets/js/booking.js`, where
  `enquiryText(values)` builds the payload. A hosted form service (Formspree,
  Netlify Forms) or a Square/Toast order API both drop in here.

If you take payment later, the receipt screen is where a checkout redirect goes.

## Running it locally

```
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static host works for deployment —
GitHub Pages, Netlify, Cloudflare Pages — since there's nothing to build.

## Design notes

- **Type.** Big Shoulders Display for headlines (a signage face drawn for
  Chicago wayfinding — the right voice an hour down the road from it), Figtree
  for body copy, DM Mono for times, prices, and stop codes. All three are
  self-hosted in `assets/fonts/`, so no request leaves for a third party and
  nothing breaks if Google Fonts is blocked. All are SIL Open Font License 1.1;
  the licences ship alongside them.
- **Colour.** Deep espresso-plum panels against blush paper, with three accents
  that each do exactly one job: raspberry for every action, peach for seasonal,
  lotus blue for the "open now" lamp and the Lotus menu.
- **The riveted rules** between sections are the seam of a trailer panel.
- **Accessibility.** Keyboard focus is visible throughout, forms name what went
  wrong and how to fix it, the order flow announces cart changes to screen
  readers, and `prefers-reduced-motion` turns off the lamp pulse and smooth
  scrolling.
