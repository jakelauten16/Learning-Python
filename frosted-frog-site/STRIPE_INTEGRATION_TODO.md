# Stripe integration: what is done, what is left

This file is the single source of truth for finishing the Stripe setup.

The Checkout Session is created in one place:
[functions/api/checkout.js](functions/api/checkout.js). It is a Cloudflare
Pages Function, so it calls Stripe's REST API directly with `fetch` rather
than through an SDK. There is no Stripe SDK to install and no API version to
pick in the client: the version is pinned in
[functions/_lib/order.js](functions/_lib/order.js).

## Values to Replace

**Nothing here is a placeholder.** The parameters Checkout Studio leaves to
you already hold this bakery's real values, so there is nothing to swap out
before going live. They are listed so you can confirm them.

**Files containing these values:**
- [functions/api/checkout.js](functions/api/checkout.js)

| Field | Current value | Confirm that |
|-------|---------------|--------------|
| mode | `payment` | Correct. Every order is a one-time charge; nothing here recurs. |
| success_url | `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}` | Points at the real confirmation page and keeps the session template. `origin` comes from the `SITE_URL` variable, falling back to the domain the request arrived on. |
| cancel_url | `${origin}/order.html` | Returns people to the menu with their cart intact. |
| line_items | Built from `price_data`, priced from `PRODUCTS` in [assets/js/data.js](assets/js/data.js) | Deliberate. Prices are recalculated server-side for every order, so there are no Stripe Price IDs to maintain and no second price list to keep in step. |

## Configured Parameters

Set in Checkout Studio and already applied. Change them in Checkout Studio
rather than editing them here, or the two will drift apart.

**Files containing these parameters:**
- [functions/api/checkout.js](functions/api/checkout.js)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page |
| billing_address_collection | auto |
| phone_number_collection | enabled |
| automatic_tax | disabled |
| allow_promotion_codes | false |
| submit_type | pay |
| name_collection | individual and business, both enabled and optional |
| saved_payment_method_options | payment_method_save: enabled |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

`payment_method_collection` was left off on purpose: it applies to
subscriptions, and this shop takes one-time payments.

## Two judgement calls worth knowing about

**Parameters kept rather than removed.** The instructions said to drop
anything Checkout Studio does not configure. Four were kept, because removing
them would break the orders rather than tidy them:

| Parameter | Why it stays |
|-----------|--------------|
| `metadata` | The webhook builds your entire paid-order email from it: pickup day and time, the item list, the customer's name and phone, delivery address, notes and totals. Remove it and a paid order arrives as an amount with no idea what to bake. |
| `client_reference_id` | The order reference shown on the thank-you page and in your email, so a customer asking about "order 61b1f6d4" can be found. |
| `customer_email` | Prefills the email on Stripe's page and sends the card receipt to the right person. |
| `payment_intent_data.description` | What the charge is called in your Stripe dashboard. Without it, every payment reads the same. |

If you do want any of these gone, say so and they can be removed, but the
webhook needs rewriting at the same time.

**One parameter to watch on the first test.**
`saved_payment_method_options: { payment_method_save: "enabled" }` offers to
save a customer's card for next time. Stripe normally needs a Customer record
on the session for that. If your first test order comes back with an error
mentioning a customer, that is the cause, and the fix is to add
`customer_creation: "always"` to the same call. It could not be verified from
here without a live key.

## Setup

### Environment variables

Cloudflare dashboard, **Workers & Pages → your project → Settings → Variables
and Secrets → Add**, applied to **Production**:

| Name | Type | Value |
|------|------|-------|
| `STRIPE_SECRET_KEY` | Secret | A restricted key, `rk_test_...` while testing, `rk_live_...` when live |
| `STRIPE_WEBHOOK_SECRET` | Secret | `whsec_...`, from the webhook endpoint you create |
| `SITE_URL` | Plain text | Only once a custom domain is attached. The Worker otherwise uses the domain the request arrived on, which is correct on `workers.dev`. |
| `ORDER_ENDPOINT` | Plain text | Optional. Your Formspree URL, if you would rather not keep it in `data.js` |
| `TEST_CHECKOUT_TOKEN` | Secret | Temporary. A password you invent, which switches on the admin-only test checkout. Delete it to switch the test checkout off. |

There is no `.env` file and no publishable key. The site is static files, so
nothing is bundled and no variable is ever exposed to a browser. A publishable
key is not needed at all: Stripe's hosted page means the browser never talks
to Stripe directly.

Use a **restricted key** (`rk_`), not an account secret key. Create it at
Developers → API keys → Create restricted key, with only:

- **Checkout Sessions: Write**
- **Payment Intents: Read**

### Webhook

Developers → Webhooks → Add endpoint →
`https://super-dust-23bf.madison-lautenschlager.workers.dev/api/stripe-webhook`
(change this to your custom domain once one is attached), subscribed to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

Copy its signing secret into `STRIPE_WEBHOOK_SECRET`. A test-mode secret does
not validate live events, so this is done once in each mode.

### Deploying

This project is a **Cloudflare Worker with static assets**, not a Pages
project. The `*.workers.dev` address is how you can tell. That distinction
matters: the `functions/` folder convention is a Pages feature, and a Workers
deploy ignores it completely. Without the pieces below, `/api/checkout` would
return a 404 and the checkout button would fail with nothing in the logs.

Three files make it work:

| File | What it does |
|------|--------------|
| [src/worker.js](src/worker.js) | The router. Sends `/api/...` to the handlers in `functions/api/`, and everything else to the static files. One implementation, so Pages and Workers cannot drift apart. |
| [wrangler.jsonc](wrangler.jsonc) | Names the Worker `super-dust-23bf`, points at the assets, and sets `run_worker_first: ["/api/*"]` so a request to the checkout always reaches the Worker. |
| [.assetsignore](.assetsignore) | Keeps the server code, the tooling and these notes off the public site. |

The Worker name in `wrangler.jsonc` must match the Worker in your dashboard.
Cloudflare refuses the build if they differ.

#### Option A: deploy from GitHub, automatic on every push

Recommended. Once connected, every push rebuilds and redeploys with no
commands at all.

**1. Put the site in its own repository.** From the `frosted-frog-site` folder
on your computer:

```bash
git init -b main
git add -A
git commit -m "The Frosted Frog website"
```

Create an empty repository at https://github.com/new, named
`frosted-frog-site`, private, with no README or .gitignore. Then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/frosted-frog-site.git
git push -u origin main
```

**2. Connect Cloudflare to it.**

1. Go to https://dash.cloudflare.com and open **Workers & Pages**.
2. Click the Worker named **super-dust-23bf**.
3. Open the **Settings** tab, then **Builds**.
4. Click **Connect**, pick **GitHub**, and authorise Cloudflare if it asks.
   You can grant access to just this one repository.
5. Choose the `frosted-frog-site` repository.
6. Fill in the build settings:
   - **Git branch**: `main`
   - **Build command**: leave empty. There is no build step.
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory**: leave empty, because the repository root is the site.
7. Save. The first build starts straight away, and every `git push` after that
   deploys by itself.

If you would rather not make a new repository, connect the one you already
have instead and set **Root directory** to `frosted-frog-site`, with the
branch set to whichever branch holds this work.

**3. Add the two secrets yourself.** Build settings and runtime secrets are
different things in Cloudflare, and Stripe keys belong in the runtime set:

1. **Workers & Pages → super-dust-23bf → Settings → Variables and Secrets**.
2. Click **Add**.
3. Type: **Secret**. Name: `STRIPE_SECRET_KEY`. Value: your restricted key
   from Stripe, starting `rk_test_` or `rk_live_`. Save.
4. **Add** again. Type: **Secret**. Name: `STRIPE_WEBHOOK_SECRET`. Value: the
   signing secret from your Stripe webhook, starting `whsec_`. Save.
5. Deploy once more after adding them, by pushing any commit. Secrets reach
   the Worker on its next deployment.

Do not put these under *Build variables and secrets*. Those exist only while
the build runs and are invisible to the running site.

#### Option B: one command from your laptop

If you would rather not involve GitHub.

**Install first:** [Node.js](https://nodejs.org) version 20 or newer. Nothing
else. The script fetches Wrangler on demand.

```bash
cd frosted-frog-site
sh tools/deploy.sh --check    # checks and tests everything, uploads nothing
sh tools/deploy.sh            # logs in, takes both secrets, deploys, verifies
```

The script prompts for each Stripe secret in turn through Wrangler's own
hidden input, so no value is shown on screen or kept in your shell history.
It finishes by calling `/api/health` on the live site.

The equivalent by hand:

```bash
npx wrangler login
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler deploy
```

#### When the first build does not run

Workers Builds starts on a **push**, not on connecting. If you connect the
repository after the last commit was already pushed, nothing happens and the
Worker keeps serving whatever was there before. Push any commit and the build
starts.

Three ways to tell what is going on, without guessing:

| What you see | What it means |
|---|---|
| **Settings → Builds** lists no repository | The connection did not save. Connect again from inside this Worker, not from the Workers & Pages list. |
| A repository is listed but there are no builds | Nothing has been pushed since connecting. Push a commit, or use **Retry** on the latest. |
| A build is listed and failed | Open it and read the last lines. A non-empty build command and a Worker name that does not match `wrangler.jsonc` are the two usual causes. |

Watch out for **Import a repository** on the Workers & Pages list: that flow
creates a *new* Worker named after the repository and leaves this one alone.
If the site appears at a different address than the one you expect, that is
why.

#### Checking it worked

```
https://super-dust-23bf.madison-lautenschlager.workers.dev/api/health
```

Open it in a browser. A healthy answer looks like:

```json
{"ok":true,"products":15,"paymentMode":"deposit","stripeKeySet":true,"webhookSecretSet":true,"orderEndpointSet":false}
```

Both `Set` fields read `true` once the secrets are in place. The endpoint
reveals no key material, so it is safe to open anywhere. A 404 instead of JSON
means the Worker did not deploy, which is exactly the failure a drag and drop
would have given you silently.

#### Working on it locally

Optional, and only if you want to see changes before pushing:

```bash
npx wrangler dev
```

`.wrangler` is listed in `.assetsignore` so the file watcher does not trigger
itself in a loop. Local runs have no Stripe keys unless you add a `.dev.vars`
file, which is already in `.gitignore` and must never be committed.

### Turning it on### Turning it on

Set `paymentMode: "stripe"` in [assets/js/data.js](assets/js/data.js), then
deploy. Leave it as `"deposit"` to go back to taking orders by email.

## New files in this integration

```
functions/
├── _lib/order.js              Prices an order from the catalog, Stripe plumbing
└── api/
    ├── checkout.js            Creates the Checkout Session
    ├── stripe-webhook.js      Verifies the signature, marks an order paid
    ├── session.js             Lets the thank-you page confirm a payment
    └── health.js              Deploy check, reveals no secrets
tools/
├── test-checkout.mjs          29 tests, Stripe stubbed, no keys needed
└── check-secrets.sh           Pre-commit hook refusing any committed key
```

## How it works

1. A customer builds an order on `/order.html` and confirms on `/review.html`.
2. The browser posts product ids and quantities to `/api/checkout`. **It never
   sends a price.**
3. The function looks every item up in the catalog, recomputes the subtotal,
   delivery fee and tax, and creates the Checkout Session from its own
   figures. A price in the request body is ignored.
4. The customer pays on Stripe's hosted page.
5. Stripe calls `/api/stripe-webhook`. The signature is verified, and only
   then is the order emailed to you, marked PAID. This, not the customer
   returning to the site, is what confirms an order: anyone can type the
   success URL.
6. `/thank-you.html` asks `/api/session` whether that session really paid
   before telling the customer it did.

## Testing

Run the checkout tests any time, no keys required:

```bash
node tools/test-checkout.mjs
```

For a test order on the deployed site, with test keys in place:

| Card | What it does |
|------|--------------|
| 4242 4242 4242 4242 | Succeeds |
| 4000 0025 0000 3155 | Asks for authentication first |
| 4000 0000 0000 9995 | Declined, insufficient funds |

Any future expiry date, any three-digit CVC, any postcode. Full list:
https://docs.stripe.com/testing

After a test order, check Developers → Webhooks → your endpoint. A `200` means
the order email went out. A `400` means the signing secret does not match. A
`500` means the email failed and Stripe will keep retrying.

## The temporary test checkout

A separate door for proving the payment wiring works on a day the order book
is shut. It changes nothing about ordering: `/api/checkout` still refuses any
order outside Monday to Wednesday, and the public site has no link to this.

**URL:** `https://super-dust-23bf.madison-lautenschlager.workers.dev/api/test-checkout`

Until `TEST_CHECKOUT_TOKEN` is set, that URL is a plain 404. Nobody can tell
it exists.

### To use it

1. Make sure `STRIPE_SECRET_KEY` holds a **test** key (`rk_test_` or
   `sk_test_`). With a live key the endpoint refuses to run, so a real card
   cannot be charged through it.
2. Add `TEST_CHECKOUT_TOKEN` as a Secret in the dashboard, with a password you
   invent. Twenty or more random characters.
3. Open the URL, paste the token, and pay with `4242 4242 4242 4242`, any
   future expiry, any CVC.
4. Stripe charges **$1.00 in test mode**, which is not real money.

### What proves it worked

- **Stripe → Developers → Webhooks → your endpoint.** The delivery of
  `checkout.session.completed` shows `200`. That is the webhook receiving the
  event and verifying Stripe's signature.
- **Your order inbox.** An email subject reading
  `TEST, not an order: webhook received checkout.session.completed`, whose
  body says there is nothing to bake and names the event. That is the
  confirmation path running.
- **Stripe → Payments.** A $1.00 test payment with reference `TEST-...`.

If the delivery shows `400`, `STRIPE_WEBHOOK_SECRET` does not match the
endpoint's signing secret. `503` means it is not set at all.

### Why it cannot take real money or create a real order

| Guard | Effect |
|-------|--------|
| Test keys only | A `sk_live_`/`rk_live_` key makes the endpoint return 403 before Stripe is called |
| Off by default | No `TEST_CHECKOUT_TOKEN`, no endpoint: 404 |
| Token required | Compared in constant time; a wrong token is 401 |
| Expires 2026-10-23 | 410 after that date whether or not anyone remembers |
| Marked everywhere | `metadata.test_order`, a `TEST-` reference, a line item named "TEST ORDER, not a real purchase" |
| Webhook branches early | A flagged session never reaches the paid-order path, so it can never arrive as something to bake |

### To remove it

Delete `TEST_CHECKOUT_TOKEN` in the dashboard. That is enough. For a clean
removal, also delete `functions/api/test-checkout.js` and its two lines in
`src/worker.js`.

## Next steps

- [ ] Roll any Stripe key that has been pasted into a chat, an email or a
      screenshot. Developers → API keys.
- [ ] After the test payment goes through, delete `TEST_CHECKOUT_TOKEN` to
      switch the temporary test checkout back off.
- [ ] Install the commit hook once:
      `cp tools/check-secrets.sh ../.git/hooks/pre-commit && chmod +x ../.git/hooks/pre-commit`
- [ ] Confirm the sales tax rate in [assets/js/data.js](assets/js/data.js).
      It is set to 7% as a placeholder. Many states treat home-baked cottage
      goods differently from restaurant food, and charging the wrong rate is
      your liability.
- [ ] Place a test order end to end and confirm the paid email arrives.
- [ ] Switch to live keys, register the live webhook, and buy one small real
      item on your own card before announcing it. Refund it afterwards.
- [ ] Decide how you will handle refunds and cancellations, which become real
      work once money changes hands rather than a conversation.

Changing what you sell stays where it was: `PRODUCTS` in
[assets/js/data.js](assets/js/data.js). Because the server prices from that
same list, there is nothing to update in Stripe when a price changes.

## Resources

- https://docs.stripe.com
- https://support.stripe.com
- https://docs.stripe.com/mcp
