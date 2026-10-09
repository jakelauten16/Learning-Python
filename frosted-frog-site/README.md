# The Frosted Frog, bakery website

Plain HTML, CSS and JavaScript. No build step, no framework, no server, no
dependencies. Upload this folder to Cloudflare Pages exactly as it is and the
site is live.

```
frosted-frog-site/
├── index.html          Home
├── order.html          This week's menu, special requests, cart, checkout
├── bakery.html         The baker's story and the ethos
├── faq.html            Questions, allergens, policies
├── review.html         The last look before an order is sent or paid for
├── thank-you.html      Confirmation, and the paid receipt after Stripe
├── 404.html
├── _headers            Security + caching headers (Cloudflare reads this)
├── _redirects          Clean URLs, and 301s from the old page names
├── site.webmanifest    Lets people add the site to a phone home screen
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── css/            fonts.css + site.css
│   ├── fonts/          4 woff2 files (124 KB) + the font licence
│   ├── img/            Logo, mascot, icons, product illustrations
│   └── js/             data.js · schedule.js · cart.js · catalog.js ·
│                       checkout.js · submit.js · review.js · site.js
├── functions/          Server side. Cloudflare runs these; they are never
│   ├── _lib/order.js   published as files and never reach the browser.
│   └── api/
│       ├── checkout.js       Prices the order, creates the Stripe session
│       ├── stripe-webhook.js Verifies Stripe's signature, marks it paid
│       ├── session.js        Tells the thank-you page if it really paid
│       └── health.js         Deploy check, no secrets
└── tools/              Optional. Preview builder and the checkout tests.
```

Nothing is loaded from anyone else's server: no font CDN, no analytics, no
tracking, no payment scripts. That keeps the site fast, private, and immune to
a third party changing something under you.

## Putting it on Cloudflare

**Once the functions exist, use Wrangler**

The `functions` folder has to be compiled, and drag and drop does not do that.
From this folder on your own computer:

```bash
sh tools/deploy.sh
```

It checks the folder, logs you in if needed, takes the two Stripe secrets
without showing them, deploys, and verifies the functions answer. See
[STRIPE_INTEGRATION_TODO.md](STRIPE_INTEGRATION_TODO.md) for the detail.

**Drag and drop, for a site with no functions**

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) → Workers &
   Pages → Create → Pages → Upload assets.
2. Drag the `frosted-frog-site` folder in. No build command, no framework
   preset, it's already a finished site.
3. It goes live at `something.pages.dev` in about a minute.
4. Custom domain → add `thefrostedfrogbakery.com`, follow the DNS prompts.

To update the site later, drag the folder in again as a new deployment.

**The better way once you're settled, connect the repository**

Point Cloudflare Pages at this Git repository instead, with
`frosted-frog-site` as the root directory and the build command left empty.
Then every change that's pushed deploys itself.

HTTPS, the CDN, and DDoS protection come free and need no setup. `_headers`
already sets a content security policy, HSTS, and sensible caching, so the
fonts cache for a year while pages always revalidate.

## Everything you'll actually edit: `assets/js/data.js`

One file holds the whole shop. Open it in any text editor.

- **`SHOP_CONFIG`**, business name, email, phone, pickup location, the cottage
  food disclaimer, delivery fee and radius, sales tax rate, where orders go,
  and how people pay.
- **`SHOP_CONFIG.schedule`**, the weekly rhythm. Which days take orders
  (`orderDays`, 0 = Sunday), the pickup windows (`pickups`), and how finely
  people can pick a time inside a window (`slotMinutes`). Change a window here
  and the checkout, the home page and the FAQ all follow.
- **`CATEGORIES`**, the sections of the menu, **in the order they appear on
  the page**: this week's special cookies, seasonal, the mainstays, special
  requests. Move a block to move the section. The weekly block has a `note`
  line ("This week: brown butter pecan…") that shows at the top of the menu and
  on the home page, change it each week and that's your whole weekly update.
- **`PRODUCTS`**, every item: name, `group` (a CATEGORIES id), `kind` (the
  little label on the card), price, unit, minimum quantity, description, photo,
  and optional choices (size, filling, finish) that can add to the price.
  `featured: true` puts an item on the home page; `available: false` marks it
  sold out.
- **`TESTIMONIALS`** and **`FAQS`**, the review strip and the FAQ list.

### The weekly rhythm, as shipped

| | |
| --- | --- |
| **Monday - Wednesday** | The order book is open. |
| **Thursday** | Shopping day. Ordering is closed. |
| **Friday** | Baked and ready. Pickup 3:00-7:00 PM. |
| **Saturday** | Baked and ready. Pickup 10:00 AM to 7:00 PM. |

Customers never pick a date from a calendar, at checkout they choose one of
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
with the site are placeholders, swap them out as you photograph your work.

## How orders reach you

Two modes, set by `paymentMode` in `assets/js/data.js`.

### `"deposit"` (what it ships as)

The order is a request. It lands in your inbox, you reply with the total, and
you settle up by Venmo, Cash App or cash at pickup. No card is taken on the
site, so there is no processor, no fees and nothing to renew.

Set it up with Formspree, five minutes, free tier is plenty:

1. Sign up at [formspree.io](https://formspree.io) and create a form.
2. Copy the endpoint it gives you, `https://formspree.io/f/xxxxxxxx`.
3. Paste it into `orderEndpoint` in `assets/js/data.js`.
4. Place a test order. Formspree emails you once to confirm the address.

Leave `orderEndpoint` empty and the site opens the customer's own email with
the whole order filled in. That works, but it depends on them pressing send.

### The three steps a customer goes through

1. **order.html** picks the items, the pickup window and the contact details.
   The button there reads "Review your order" and sends nobody anywhere.
2. **review.html** shows the whole thing back: items with their options and
   notes, the pickup slot, the contact details, the totals and the cottage
   food notice, with a Change link beside each section. Nothing has been sent
   or charged at this point.
3. Confirming on that page either opens Stripe or sends the request, and
   **thank-you.html** closes the loop.

The review page refuses to show a stale order. If the cart emptied, or
changed in another tab, or the order window closed while the form was open,
it says so and sends people back to the menu rather than confirming something
that is no longer true.

### `"stripe"` (pay in full at checkout)

The customer pays by card before the order exists. Change `paymentMode` to
`"stripe"` in `assets/js/data.js` and set the environment variables below.

**How the money is protected.** The browser sends product ids, quantities and
the options chosen. It never sends a price, and if it did, the price would be
thrown away. `functions/api/checkout.js` looks every item up in the same
catalog the site is built from, recomputes the subtotal, the delivery fee and
the tax, and builds the Stripe session from those figures. Someone editing the
page in their browser can change what they see; they cannot change what they
are charged.

**What counts as paid.** Only the webhook. Landing back on the thank-you page
proves nothing, because anyone can type that address. Stripe signs every
webhook delivery, `functions/api/stripe-webhook.js` checks that signature
against your webhook secret, rejects anything stale or forged, and only then
emails you the paid order. The thank-you page asks the server to confirm the
payment before it says "paid" to the customer.

The paid email goes to the same place as deposit orders: your Formspree form,
or whatever you set `ORDER_ENDPOINT` to.

### Environment variables, and exactly where they go

In the Cloudflare dashboard: **Workers & Pages → your project → Settings →
Variables and Secrets → Add**. Add each one to **Production**, and to
**Preview** too if you want the preview deployments to work.

| Name | Type | Value | Needed |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | Secret | A **restricted key**, `rk_test_...` then `rk_live_...` | Yes, for card payment |
| `STRIPE_WEBHOOK_SECRET` | Secret | `whsec_...` from the webhook you create | Yes, for card payment |
| `ORDER_ENDPOINT` | Plain text | Your Formspree URL, if you would rather not keep it in `data.js` | Optional |
| `SITE_URL` | Plain text | `https://thefrostedfrogbakery.com`, so Stripe returns to your domain and not the `pages.dev` one | Recommended |

Choose **Secret** (not plain text) for both Stripe values. Cloudflare then
encrypts them and stops showing them back to you.

**Use a restricted key, not your account secret key.** Stripe calls these
restricted API keys and they start with `rk_` instead of `sk_`. A restricted
key only does the jobs you tick, so if it ever leaks it cannot drain the
account. Create one at **Developers → API keys → Create restricted key** and
give it exactly these permissions, everything else left as None:

| Permission | Level | Why this site needs it |
| --- | --- | --- |
| Checkout Sessions | Write | To create the payment page |
| Payment Intents | Read | So the thank-you page can confirm a payment |

The variable is still called `STRIPE_SECRET_KEY`; paste the `rk_` key into it.

There is no publishable key here on purpose. Stripe Checkout is a page on
Stripe's own domain, so the browser never talks to Stripe directly and never
needs a publishable key. If you have one, you do not need to do anything
with it.

### Wanting to try it before opening a Stripe account

Stripe's CLI can make a throwaway test environment with no sign-up:

```bash
npm install -g @stripe/cli
stripe sandbox create
```

That prints test keys you can paste into Cloudflare to try the whole flow.
Nothing in a sandbox touches real money.

### Keeping the keys out of the repository

`tools/check-secrets.sh` refuses any commit containing a Stripe key. Install
it once per clone, from the repository root:

```bash
cp frosted-frog-site/tools/check-secrets.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

A key that has been pasted into a chat, an email, a screenshot or a file
should be treated as public, whatever happened to it afterwards. Roll it at
**Developers → API keys**, which invalidates the old one on the spot.

**Never commit or upload:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, a
`.env` file, or a `.dev.vars` file. They belong only in the Cloudflare
dashboard. The repository's `.gitignore` already covers `.env` and
`.dev.vars`. If a secret key is ever pasted into a file, a screenshot or a
chat, roll it in the Stripe dashboard straight away: **Developers → API keys →
Roll key**.

### Testing with Stripe test mode first

1. Create a Stripe account. Leave the dashboard toggle on **Test mode**.
2. **Developers → API keys**, copy the **Secret key** (`sk_test_...`).
3. Put it in Cloudflare as `STRIPE_SECRET_KEY`, as above.
4. **Developers → Webhooks → Add endpoint.** URL:
   `https://your-site.pages.dev/api/stripe-webhook`. Subscribe to three
   events: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded` and
   `checkout.session.async_payment_failed`. Create it, then copy the
   **Signing secret** (`whsec_...`) into Cloudflare as
   `STRIPE_WEBHOOK_SECRET`.

   The last two matter because some payment methods settle hours later. Cards
   clear instantly; bank-style methods do not, and an order that is only
   pending must not be baked yet.
5. Set `paymentMode: "stripe"` in `assets/js/data.js` and redeploy.
6. Open `https://your-site.pages.dev/api/health`. It should report
   `stripeKeySet: true` and `webhookSecretSet: true`.
7. Place an order on the site during the Monday to Wednesday window, then
   confirm on the review page, where the button reads "Pay $X".
8. On Stripe's page use the test card **4242 4242 4242 4242**, any future
   expiry, any three-digit CVC, any ZIP. No money moves in test mode.
9. You should land back on the thank-you page and see **Paid**, with a
   reference.
10. Check your email: the paid order should arrive, marked PAID.
11. Check **Developers → Webhooks → your endpoint** in Stripe. The delivery
    should show a `200`. If it shows `400`, the signing secret does not match.
    If it shows `500`, the order email failed and Stripe will retry.

To test the price protection yourself: open the browser console on the order
page, change a price in `PRODUCTS`, and check out. Stripe will still charge the
real price, because the browser's copy is not consulted.

### Going live

1. Finish Stripe's account activation: business details, bank account.
2. Flip the dashboard out of Test mode.
3. **Developers → API keys**, copy the **live** secret key (`sk_live_...`) and
   replace `STRIPE_SECRET_KEY` in Cloudflare with it.
4. **Developers → Webhooks → Add endpoint** again, this time in live mode,
   pointing at `https://thefrostedfrogbakery.com/api/stripe-webhook`, with the
   same three events. Copy that new signing secret over
   `STRIPE_WEBHOOK_SECRET`. The test secret will not work for live events.
5. Set `SITE_URL` to your real domain so customers return to it after paying.
6. Redeploy, then check `/api/health` again.
7. Place one real order for something small, on your own card. Confirm the
   charge appears in Stripe, the paid email arrives, and the webhook shows a
   `200`.
8. Refund that order in Stripe so you are not paying fees on your own test.

Stripe's fee comes out of each payment. Check their current rate before you
set prices.

### Running the checkout tests

```bash
node tools/test-checkout.mjs
```

Stripe is stubbed, so this needs no keys and spends nothing. It checks that
prices come from the catalog, that a tampered price is ignored, that unknown
products and invented options are refused, that the pickup slot is enforced,
and that a forged or stale webhook signature is rejected.

## Looking at it before you upload

Because of browser security rules, fonts and a couple of graphics don't load
when you open `index.html` straight off your desktop. Run a tiny local server
instead, from inside this folder:

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

Or build the single-file preview, which has everything baked in and opens with
a double-click anywhere, handy for showing someone on a phone:

```bash
node tools/build-preview.js
```

It writes `tools/frosted-frog-preview.html`, a complete copy of all five pages
in one file, with a bar at the bottom that lets you preview the site as any day
of the week and empty the cart. That bar exists only in the preview.

## Before this goes live

- [ ] Put your real email, phone and pickup location in `SHOP_CONFIG`.
- [ ] Confirm the cottage-food disclaimer matches your state's required wording.
- [ ] Set the sales tax rate, or `0` if you don't collect it. The site charges
      a flat rate from `data.js`; many states treat home-baked goods
      differently from restaurant food, so confirm the rate with your state
      before taking a card. Stripe can calculate tax for you instead, but
      only once you hold an active tax registration in your state.
- [ ] Set up Formspree and place a test order end to end.
- [ ] If taking cards: Stripe keys in Cloudflare, webhook registered, test
      order placed with 4242 4242 4242 4242, paid email received.
- [ ] Confirm the order window and pickup times in `SHOP_CONFIG.schedule`.
- [ ] Swap the placeholder illustrations for photos of your own baking.
- [ ] Replace the sample reviews with real ones, or delete them.
- [ ] Update the domain in `robots.txt` and `sitemap.xml` once it's registered.
- [ ] Set `previewAnyDay` back to `false` if you ever switch it on.

## Later: the app

The manifest and icons are already here, so the site can be added to a phone
home screen as it stands. Adding a service worker would make it fully
installable and usable offline, no rewrite needed, because it's all static
files.

## Credits

Fonts are Cormorant Garamond, Jost and Parisienne, under the SIL Open Font
License (see `assets/fonts/OFL.txt`). The logo, mascot and product drawings
belong to The Frosted Frog.
