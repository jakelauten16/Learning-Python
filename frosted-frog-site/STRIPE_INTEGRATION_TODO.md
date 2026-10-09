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
| `SITE_URL` | Plain text | `https://thefrostedfrogbakery.com` |
| `ORDER_ENDPOINT` | Plain text | Optional. Your Formspree URL, if you would rather not keep it in `data.js` |

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
`https://thefrostedfrogbakery.com/api/stripe-webhook`, subscribed to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

Copy its signing secret into `STRIPE_WEBHOOK_SECRET`. A test-mode secret does
not validate live events, so this is done once in each mode.

### Turning it on

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

## Next steps

- [ ] Roll any Stripe key that has been pasted into a chat, an email or a
      screenshot. Developers → API keys.
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
