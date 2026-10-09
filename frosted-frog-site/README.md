# The Frosted Frog — bakery website

Plain HTML, CSS and JavaScript. No build step, no framework, no server, no
dependencies. Upload this folder to Cloudflare Pages exactly as it is and the
site is live.

```
frosted-frog-site/
├── index.html          Home — hero, the week's rhythm, the four ways to order
├── order.html          This week's menu + special requests + cart + checkout
├── bakery.html         The baker's story, the ethos, how a week runs
├── faq.html            Questions, allergens, policies
├── thank-you.html      Confirmation, with a copy of the order
├── 404.html            Served automatically for any bad link
├── _headers            Security + caching headers (Cloudflare reads this)
├── _redirects          Clean URLs, and 301s from the old page names
├── site.webmanifest    Lets people add the site to a phone home screen
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── css/fonts.css   Self-hosted @font-face rules
│   ├── css/site.css    Everything else
│   ├── fonts/          4 woff2 files (124 KB total) + the font licence
│   ├── img/            Logo, mascot, icons, product illustrations
│   └── js/             data.js · schedule.js · cart.js · catalog.js ·
│                       checkout.js · site.js
└── tools/              Optional. Builds a single-file preview. Not part of
                        the site — delete it before uploading if you like.
```

Nothing is loaded from anyone else's server: no font CDN, no analytics, no
tracking, no payment scripts. That keeps the site fast, private, and immune to
a third party changing something under you.

## Putting it on Cloudflare

**The quick way — drag and drop**

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) → Workers &
   Pages → Create → Pages → Upload assets.
2. Drag the `frosted-frog-site` folder in. No build command, no framework
   preset — it's already a finished site.
3. It goes live at `something.pages.dev` in about a minute.
4. Custom domain → add `thefrostedfrog.com`, follow the DNS prompts.

To update the site later, drag the folder in again as a new deployment.

**The better way once you're settled — connect the repository**

Point Cloudflare Pages at this Git repository instead, with
`frosted-frog-site` as the root directory and the build command left empty.
Then every change that's pushed deploys itself.

HTTPS, the CDN, and DDoS protection come free and need no setup. `_headers`
already sets a content security policy, HSTS, and sensible caching, so the
fonts cache for a year while pages always revalidate.

## Everything you'll actually edit: `assets/js/data.js`

One file holds the whole shop. Open it in any text editor.

- **`SHOP_CONFIG`** — business name, email, phone, pickup location, the cottage
  food disclaimer, delivery fee and radius, sales tax rate, where orders go,
  and how people pay.
- **`SHOP_CONFIG.schedule`** — the weekly rhythm. Which days take orders
  (`orderDays`, 0 = Sunday), the pickup windows (`pickups`), and how finely
  people can pick a time inside a window (`slotMinutes`). Change a window here
  and the checkout, the home page and the FAQ all follow.
- **`CATEGORIES`** — the sections of the menu, **in the order they appear on
  the page**: this week's special cookies, seasonal, the mainstays, special
  requests. Move a block to move the section. The weekly block has a `note`
  line ("This week: brown butter pecan…") that shows at the top of the menu and
  on the home page — change it each week and that's your whole weekly update.
- **`PRODUCTS`** — every item: name, `group` (a CATEGORIES id), `kind` (the
  little label on the card), price, unit, minimum quantity, description, photo,
  and optional choices (size, filling, finish) that can add to the price.
  `featured: true` puts an item on the home page; `available: false` marks it
  sold out.
- **`TESTIMONIALS`** and **`FAQS`** — the review strip and the FAQ list.

### The weekly rhythm, as shipped

| | |
| --- | --- |
| **Monday – Wednesday** | The order book is open. |
| **Thursday** | Shopping day. Ordering is closed. |
| **Friday** | Baked and ready. Pickup 3:00 – 7:00 PM. |
| **Saturday** | Baked and ready. Pickup 10:00 AM – 7:00 PM. |

Customers never pick a date from a calendar — at checkout they choose one of
that week's two windows and a time inside it. Outside the order window the menu
stays browsable but the form closes itself and says when it reopens. Carts
survive, so a Thursday browser can come back Monday and check out.

### Adding a product

```js
{
  id: "lemon-bars",            // unique, no spaces
  name: "Lemon Bars",
  group: "seasonal",           // must match a CATEGORIES id
  kind: "Bars",                // the label on the card
  price: 28,
  unit: "per dozen",
  min: 6,                      // smallest quantity someone can order
  desc: "Shortbread crust, tart lemon curd, dusted with powdered sugar.",
  image: "assets/img/lemon-bars.jpg",
  featured: true,
}
```

### Adding your own photos

Drop the file in `assets/img/` and point the product's `image` at it. Photos
look best square-ish or 4:3 and around 1200px wide. The line drawings that ship
with the site are placeholders — swap them out as you photograph your work.

## How orders reach you

**No card is taken on the site.** An order is a request: it lands in your
inbox, you reply with the total, and you settle up by Venmo, Cash App or cash
at pickup. No payment processor, no fees, no PCI paperwork, nothing to renew —
and nothing on the site worth attacking.

The same inbox receives special requests from the bottom of the menu.

**Set up Formspree** (five minutes, free tier is plenty):

1. Sign up at [formspree.io](https://formspree.io) and create a form.
2. Copy the endpoint it gives you — `https://formspree.io/f/xxxxxxxx`.
3. Paste it into `orderEndpoint` in `assets/js/data.js`.
4. Place a test order. Formspree will email you to confirm the address once.

Leave `orderEndpoint` empty and the site falls back to opening the customer's
own email app with the entire order filled in, addressed to you. That works,
but it depends on them pressing send — Formspree is the better of the two.

Change what you accept by editing `paymentMethods` and `paymentNote` in
`data.js`; both appear at checkout and in the FAQ.

## Looking at it before you upload

Because of browser security rules, fonts and a couple of graphics don't load
when you open `index.html` straight off your desktop. Run a tiny local server
instead, from inside this folder:

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

Or build the single-file preview, which has everything baked in and opens with
a double-click anywhere — handy for showing someone on a phone:

```bash
node tools/build-preview.js
```

It writes `tools/frosted-frog-preview.html`, a complete copy of all five pages
in one file, with a bar at the bottom that lets you preview the site as any day
of the week and empty the cart. That bar exists only in the preview.

## Before this goes live

- [ ] Put your real email, phone and pickup location in `SHOP_CONFIG`.
- [ ] Confirm the cottage-food disclaimer matches your state's required wording.
- [ ] Set the sales tax rate, or `0` if you don't collect it.
- [ ] Set up Formspree and place a test order end to end.
- [ ] Confirm the order window and pickup times in `SHOP_CONFIG.schedule`.
- [ ] Swap the placeholder illustrations for photos of your own baking.
- [ ] Replace the sample reviews with real ones, or delete them.
- [ ] Update the domain in `robots.txt` and `sitemap.xml` once it's registered.
- [ ] Set `previewAnyDay` back to `false` if you ever switch it on.

## Later: the app

The manifest and icons are already here, so the site can be added to a phone
home screen as it stands. Adding a service worker would make it fully
installable and usable offline — no rewrite needed, because it's all static
files.

## Credits

Fonts are Cormorant Garamond, Jost and Parisienne, under the SIL Open Font
License (see `assets/fonts/OFL.txt`). The logo, mascot and product drawings
belong to The Frosted Frog.
