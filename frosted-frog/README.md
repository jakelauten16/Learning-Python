# The Frosted Frog — bakery website

A boutique storefront for a cottage bakery, built around one weekly rhythm:

| | |
| --- | --- |
| **Monday – Wednesday** | The order book is open. Customers order from the week's menu. |
| **Thursday** | Shopping day. Ordering is closed. |
| **Friday** | Baked and ready. Pickup 3:00 – 7:00 PM. |
| **Saturday** | Baked and ready. Pickup 10:00 AM – 7:00 PM. |

Customers never pick a date out of a calendar — at checkout they choose one of
that week's two pickup windows and a time inside it. Outside the order window
the menu is still browsable, but the form closes itself and says when it
reopens. The cart survives, so a Thursday visitor can come back Monday and
check out.

Plain HTML, CSS and JavaScript — no build step and no framework. Open
`index.html` in a browser and it works.

## Pages

| File | What it does |
| --- | --- |
| `index.html` | Hero, animated marquee, category showcase, favorites, how pre-ordering works, reviews |
| `shop.html` | Every item, filterable by category, each one opening a detail window with sizes, fillings and notes |
| `order.html` | Cart review, pickup or delivery, date and time window, contact details, checkout |
| `thank-you.html` | Confirmation page with a copy of the order |
| `about.html` | Story, custom-order request form, FAQ, allergen and policy info |

The cart lives in the browser's local storage, so it survives a refresh, a
closed tab, or a customer who wanders off mid-order.

## Everything you'll actually edit: `assets/js/data.js`

Nothing else needs to be touched week to week.

- **`SHOP_CONFIG`** — business name, email, phone, pickup location, delivery
  fee and radius, sales tax rate, and the payment mode.
- **`SHOP_CONFIG.schedule`** — the weekly rhythm: which days take orders
  (`orderDays`, 0 = Sunday), the pickup windows (`pickups`), and how finely
  customers can choose a time inside a window (`slotMinutes` — 30 gives 3:00,
  3:30, 4:00 and so on; set it to 0 to offer the whole window instead).
  Changing a window here changes the checkout, the home page, the FAQ and the
  server-side check all at once.
- **`CATEGORIES`** — the sections on the shop page and the home-page showcase.
- **`PRODUCTS`** — every item: name, category, price, unit ("per dozen"),
  minimum quantity, description, photo, and optional choices (size, filling,
  finish) that can each add to the price. Set `featured: true` to put an item
  on the home page, `available: false` to mark it sold out.
- **`TESTIMONIALS`** and **`FAQS`** — the review strip and the FAQ list.

### Adding a product

```js
{
  id: "lemon-bars",            // unique, no spaces
  name: "Lemon Bars",
  category: "seasonal",        // must match a CATEGORIES id
  price: 28,
  unit: "per dozen",
  min: 6,                      // smallest quantity someone can order
  desc: "Shortbread crust, tart lemon curd, dusted with powdered sugar.",
  image: "assets/img/lemon-bars.jpg",
  featured: true,
}
```

### Adding your own photos

Drop the file into `assets/img/` and point the product's `image` at it. Photos
look best square-ish or 4:3 and about 1200px wide. The line drawings that ship
with the site are placeholders — swap them out as you photograph your work.

## Payments

`SHOP_CONFIG.paymentMode` decides what the checkout button does.

**`"deposit"` (what it's set to now)** — the order is submitted and you follow
up with an invoice. If `orderEndpoint` is empty, the site opens the customer's
email with the whole order filled in. Set `orderEndpoint` to a form service
(Formspree, Basin, Netlify Forms) to have orders land in your inbox instead.

**`"stripe"`** — the customer pays by card before the order is placed.

### Turning on card payments

1. Create a Stripe account and get your secret key (`sk_live_...`).
2. Deploy to Netlify (below) and add an environment variable
   `STRIPE_SECRET_KEY` under Site settings → Environment variables. Add
   `STRIPE_AUTOMATIC_TAX=true` if you've set up Stripe Tax.
3. Change `paymentMode` in `assets/js/data.js` to `"stripe"`.

The checkout function in `netlify/functions/create-checkout-session.js`
recalculates every price from `data.js` on the server and re-checks the lead
time and the delivery minimum, so nothing the customer edits in the browser can
change what they're charged.

## The demo build

`demo/build.js` folds every page into one self-contained HTML file — all the
CSS, JavaScript and images inlined, pages routed by `#/shop`, `#/order` and so
on — so the whole site can be previewed from a single link or file.

```bash
node demo/build.js        # writes demo/frosted-frog-demo.html
```

The demo adds a small bar at the bottom that the real site doesn't have:

- **A day switcher.** Preview the site as if it were Monday (ordering open),
  Thursday or Saturday (closed), without waiting for the day to come around.
- **Empty the cart**, to start a walkthrough over.

Rebuild it after any change and the preview link updates with it. The demo is
a view of the real files — there's no second copy of the site to keep in sync.

## Running it locally

Double-clicking `index.html` works for everything except the Stripe function.
For a closer-to-real setup:

```bash
npx serve .                 # static preview at http://localhost:3000
```

```bash
npm install                 # once, for the Stripe dependency
npx netlify dev             # static site + the checkout function
```

## Deploying

The site is static, so nearly any host works. Netlify is the simplest because
it also runs the checkout function:

1. Push this folder to GitHub.
2. In Netlify, "Add new site" → import the repo. Set the base directory to
   `frosted-frog` (if the repo holds other projects). No build command; publish
   directory `.`.
3. Add your Stripe key as an environment variable.
4. Point your domain at it under Domain settings.

`netlify.toml` already sets the publish directory, the functions directory and
some sensible security headers.

## Before this goes live

- [ ] Replace the placeholder email, phone and pickup location in `SHOP_CONFIG`.
- [ ] Confirm the cottage-food disclaimer matches your state's required wording.
- [ ] Set the sales tax rate, or set it to `0` if you don't collect it.
- [ ] Swap the placeholder illustrations for photos of your own baking.
- [ ] Replace the sample reviews with real ones (or delete them).
- [ ] Confirm the order window and pickup times in `SHOP_CONFIG.schedule`.
- [ ] Set `previewAnyDay` back to `false` if you ever switch it on.
- [ ] Turn on Stripe and place a test order end to end.

## Later: the app

Because everything is static files plus one checkout function, the same site
can be wrapped as an installable app (a PWA — add a manifest and a service
worker) without rewriting anything, or the catalog in `data.js` can feed a
native app later.
