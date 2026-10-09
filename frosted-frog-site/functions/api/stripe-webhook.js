/* ---------------------------------------------------------------------------
   POST /api/stripe-webhook

   This, and only this, is what marks an order paid. A customer landing back
   on the thank-you page proves nothing: they could type that URL. Stripe
   signs this request, we check the signature, and then we believe it.

   Point Stripe at https://your-domain/api/stripe-webhook and subscribe to
   checkout.session.completed, checkout.session.async_payment_succeeded and
   checkout.session.async_payment_failed.

   Why three: some payment methods settle hours or days later. For those, the
   completed event arrives while the session is still unpaid, so treating
   "completed" as "paid" would both confirm orders that later fail and never
   confirm the ones that succeed.
   --------------------------------------------------------------------------- */
import { SHOP_CONFIG, verifyStripeSignature, notifyBaker, json } from "../_lib/order.js";

export async function onRequestPost({ request, env }) {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("webhook called with no STRIPE_WEBHOOK_SECRET set");
    return json({ error: "Not configured" }, 503);
  }

  /* The raw body, byte for byte. Parsing first would break the signature. */
  const raw = await request.text();
  const signature = request.headers.get("Stripe-Signature");

  if (!(await verifyStripeSignature(raw, signature, secret))) {
    console.warn("rejected a webhook with a bad signature");
    return json({ error: "Invalid signature" }, 400);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Bad payload" }, 400);
  }

  const handled = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
  ];
  if (!handled.includes(event.type)) {
    return json({ received: true, ignored: event.type });
  }

  const session = event.data?.object || {};

  /* A payment that was pending and then failed. Worth knowing about, so it
     goes to the same inbox, clearly marked as nothing to bake. */
  if (event.type === "checkout.session.async_payment_failed") {
    const failedRef = session.metadata?.reference || session.client_reference_id || session.id;
    await notifyBaker(env.ORDER_ENDPOINT || SHOP_CONFIG.orderEndpoint, {
      _subject: `Payment FAILED for order ${failedRef}`,
      status: "PAYMENT FAILED",
      reference: failedRef,
      order: `The payment for order ${failedRef} did not go through, so there is nothing to bake.\n` +
        `Name: ${session.metadata?.customer_name || ""}\n` +
        `Pickup was: ${session.metadata?.pickup_date || ""} at ${session.metadata?.pickup_time || ""}`,
    });
    return json({ received: true, failed: failedRef });
  }

  /* Fulfil on anything that is not still unpaid. For a card that is "paid"
     straight away; for a slower method it is the async success event. */
  if (session.payment_status === "unpaid") {
    return json({ received: true, pending: true });
  }

  const meta = session.metadata || {};
  const reference = meta.reference || session.client_reference_id || session.id;

  /* Stripe retries until it gets a 2xx, so the same order can arrive twice.
     If a KV namespace called ORDERS is bound, it keeps the email to one. */
  if (env.ORDERS) {
    const seen = await env.ORDERS.get(`paid:${reference}`);
    if (seen) return json({ received: true, duplicate: true });
  }

  const paidAmount = ((session.amount_total || 0) / 100).toFixed(2);
  const customerEmail = session.customer_details?.email || meta.customer_email || "";
  const customerPhone = session.customer_details?.phone || meta.customer_phone || "";

  const body = [
    "PAID ORDER",
    "",
    `Reference: ${reference}`,
    `Paid: $${paidAmount} ${String(session.currency || "usd").toUpperCase()}`,
    `Stripe session: ${session.id}`,
    "",
    `Name: ${meta.customer_name || ""}`,
    `Email: ${customerEmail}`,
    `Phone: ${customerPhone}`,
    meta.fulfillment === "delivery" ? `Delivery to: ${meta.address || ""}` : "Pickup",
    `When: ${meta.pickup_date || ""} at ${meta.pickup_time || ""}`,
    meta.occasion ? `Occasion: ${meta.occasion}` : "",
    "",
    "Items:",
    meta.items || "(see Stripe dashboard)",
    "",
    `Subtotal: ${meta.subtotal || ""}`,
    meta.delivery && meta.delivery !== "$0.00" ? `Delivery: ${meta.delivery}` : "",
    meta.tax ? `Tax: ${meta.tax}` : "",
    `Total: ${meta.total || "$" + paidAmount}`,
    meta.notes ? `\nNotes: ${meta.notes}` : "",
  ].filter(Boolean).join("\n");

  const result = await notifyBaker(env.ORDER_ENDPOINT || SHOP_CONFIG.orderEndpoint, {
    _subject: `PAID order ${reference} / ${meta.pickup_date || ""} / ${meta.customer_name || ""}`,
    status: "PAID",
    reference,
    paid: `$${paidAmount}`,
    name: meta.customer_name || "",
    email: customerEmail,
    phone: customerPhone,
    pickup: `${meta.pickup_date || ""} at ${meta.pickup_time || ""}`,
    fulfillment: meta.fulfillment === "delivery" ? `Delivery to ${meta.address || ""}` : "Pickup",
    items: meta.items || "",
    notes: meta.notes || "",
    order: body,
  });

  if (!result.sent) {
    /* Returning an error asks Stripe to retry, which is what we want: the
       payment is real, so the email has to get through eventually. */
    console.error("paid order email failed", reference, result);
    return json({ error: "Could not deliver the order email" }, 500);
  }

  if (env.ORDERS) {
    await env.ORDERS.put(`paid:${reference}`, new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 90 });
  }

  console.log("paid order", reference, `$${paidAmount}`);
  return json({ received: true, reference });
}
