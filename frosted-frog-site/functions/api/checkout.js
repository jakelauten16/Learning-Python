/* ---------------------------------------------------------------------------
   POST /api/checkout

   The browser sends what was chosen: product ids, quantities, options, the
   pickup slot and the customer's details. It does not send prices, and any
   price it did send would be ignored. This builds the Stripe Checkout session
   from the catalog's own numbers and hands back a URL to redirect to.
   --------------------------------------------------------------------------- */
import { priceOrder, cents, money, stripeFetch, json } from "../_lib/order.js";

const MAX_BODY_BYTES = 32 * 1024;

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Card payment is not switched on yet" }, 503);
  }

  /* Same-origin only. There is no reason for another site to call this. */
  const origin = env.SITE_URL || new URL(request.url).origin;
  const sender = request.headers.get("Origin");
  if (sender && sender !== origin && sender !== new URL(request.url).origin) {
    return json({ error: "Bad request" }, 403);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "That order is too large" }, 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const order = priceOrder(body);
  if (order.error) return json({ error: order.error }, order.status || 400);

  const reference = crypto.randomUUID().slice(0, 18);

  const line_items = order.lines.map((line) => ({
    quantity: line.qty,
    price_data: {
      currency: "usd",
      unit_amount: cents(line.unit),
      product_data: { name: line.name, description: line.description },
    },
  }));

  if (order.totals.delivery) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cents(order.totals.delivery),
        product_data: { name: "Local delivery" },
      },
    });
  }
  if (order.totals.tax) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cents(order.totals.tax),
        product_data: { name: "Sales tax" },
      },
    });
  }

  /* Metadata is capped at 500 characters per value, so the item list is
     trimmed here and the full order is rebuilt from the session on the way
     back out if it is ever needed. */
  const items = order.lines
    .map((l) => `${l.qty}x ${l.name}${l.options.length ? ` (${l.options.join("; ")})` : ""}`)
    .join(" | ")
    .slice(0, 480);

  /* Built once and attached in two places: to the session, which the webhook
     reads, and to the payment, which is what the dashboard shows. */
  const metadata = {
    reference,
    fulfillment: order.fulfillment,
    pickup_date: order.date,
    pickup_time: order.window,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    address: order.customer.address,
    occasion: order.customer.occasion,
    notes: order.customer.notes.slice(0, 480),
    items,
    subtotal: money(order.totals.subtotal),
    delivery: money(order.totals.delivery),
    tax: money(order.totals.tax),
    total: money(order.totals.total),
  };

  try {
    const session = await stripeFetch(env.STRIPE_SECRET_KEY, "checkout/sessions", {
      idempotencyKey: reference,
      params: {
        /* ---- Configured in Checkout Studio. Change them there, not here. ---- */
        ui_mode: "hosted_page",
        billing_address_collection: "auto",
        phone_number_collection: { enabled: true },
        automatic_tax: { enabled: false },
        allow_promotion_codes: false,
        submit_type: "pay",
        name_collection: {
          individual: { enabled: true, optional: true },
          business: { enabled: true, optional: true },
        },
        /* saved_payment_method_options is deliberately absent. Offering to
           save a card requires a Stripe Customer, and Stripe rejects the
           whole session without one. A bakery pre-order does not need
           stored cards, and not creating Customer records means one less
           pile of personal data to look after. */
        integration_identifier: "hosted_web_0001",
        origin_context: "web",

        /* ---- This bakery's own values ---- */
        mode: "payment",
        line_items,
        success_url: `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/order.html`,

        /* ---- Carried through to fulfilment. The webhook builds the paid
           order email out of this metadata, so none of it is decoration. ---- */
        customer_email: order.customer.email,
        client_reference_id: reference,
        /* The same details on the payment itself. Session metadata is what
           the webhook reads, but the Payments list in the dashboard shows
           the payment, not the session, so without this a baker looking up
           an order sees an amount and nothing about what to bake. */
        /* The description is what a customer sees on their card statement and
           on Stripe's receipt, so it carries the pickup rather than just a
           reference number that means nothing to them. */
        payment_intent_data: {
          description: `The Frosted Frog order ${reference} / pickup ${order.date} ${order.window}`,
          metadata,
        },
        metadata,
      },
    });

    return json({ url: session.url, reference });
  } catch (error) {
    /* Stripe's reason goes to the Worker log, not to the customer: it is
       written for a developer and can echo back the request. */
    console.error("checkout session failed", error.message);
    return json({ error: "We could not reach the payment page. Please try again." }, 502);
  }
}
