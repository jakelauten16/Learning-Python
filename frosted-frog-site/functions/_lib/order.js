/* ---------------------------------------------------------------------------
   Order pricing and Stripe plumbing. Server side only.

   Everything in this file runs on Cloudflare's edge, never in the browser.
   The browser sends product ids and quantities. Prices come from the catalog
   that ships with the site, and nothing a customer sends can change them.

   Files under functions/ are not published as static assets, and names that
   start with an underscore are not routed, so this module is importable but
   never reachable over HTTP.
   --------------------------------------------------------------------------- */
import catalog from "../../assets/js/data.js";
import Schedule from "../../assets/js/schedule.js";

export const { SHOP_CONFIG, PRODUCTS } = catalog;
export { Schedule };

const MAX_LINES = 40;
const MAX_QTY = 500;

export function cents(dollars) {
  return Math.round(Number(dollars) * 100);
}

export function money(amount) {
  return "$" + Number(amount).toFixed(2);
}

/* A customer can pick options, but only the ones we published, and the price
   of each option comes from our list rather than from their request. */
function resolveOptions(product, chosen) {
  const picked = [];
  let extra = 0;

  /* A group this product does not have is refused rather than ignored.
     Floral cupcakes come by the dozen only, so a browser asking for a "Size"
     of half dozen was being quietly given a dozen: the customer would have
     expected six and paid for twelve, or the other way about, and nothing in
     the order would have recorded what they asked for. */
  const groups = product.options || [];
  for (const label of Object.keys(chosen && typeof chosen === "object" ? chosen : {})) {
    if (!groups.some((g) => g.label === label)) {
      return { error: `${product.name} has no ${label} to choose` };
    }
  }

  for (const group of groups) {
    const wanted = chosen && typeof chosen === "object" ? chosen[group.label] : undefined;
    const match = group.choices.find((c) => c.name === wanted);
    if (wanted !== undefined && !match) {
      return { error: `"${wanted}" is not an option for ${product.name}` };
    }
    const choice = match || group.choices[0];
    extra += choice.price || 0;
    picked.push(`${group.label}: ${choice.name}`);
  }
  return { picked, extra };
}

/* The whole trust boundary lives here. In goes a request body, out comes a
   priced order or a reason to refuse it. */
export function priceOrder(body, now = new Date()) {
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!items.length) return { error: "Your order is empty" };
  if (items.length > MAX_LINES) return { error: "That is more lines than we can take in one order" };

  if (!Schedule.isOrderingOpen(now, SHOP_CONFIG)) {
    return { error: "Ordering is closed. The order book opens again Monday.", status: 409 };
  }
  if (!body?.date || !body?.window) return { error: "Choose a pickup day and time" };
  if (!Schedule.isValidPickup(body.date, body.window, now, SHOP_CONFIG)) {
    return { error: "That is not one of this week's pickup times" };
  }

  const customer = body.customer || {};
  const name = String(customer.name || "").trim().slice(0, 120);
  const email = String(customer.email || "").trim().slice(0, 160);
  const phone = String(customer.phone || "").trim().slice(0, 40);
  if (!name) return { error: "We need a name for the order" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address does not look right" };
  if (!phone) return { error: "We need a phone number in case we have a question" };

  /* Say so rather than quietly turning a delivery into a pickup. Someone who
     asked to have it delivered should be told it is collection only, not
     find out when nothing arrives. */
  if (body.fulfillment === "delivery" && !SHOP_CONFIG.delivery.enabled) {
    return { error: "Everything is collected in person at one of the two pickup windows." };
  }
  const delivery = body.fulfillment === "delivery" && SHOP_CONFIG.delivery.enabled;
  const address = String(customer.address || "").trim().slice(0, 300);
  if (delivery && !address) return { error: "We need an address to deliver to" };

  const lines = [];
  let subtotal = 0;

  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item?.id);
    if (!product) return { error: "One of those items is no longer on the menu" };
    if (product.available === false) return { error: `${product.name} is sold out` };

    const asked = Number.parseInt(item.qty, 10);
    if (!Number.isFinite(asked) || asked < 1 || asked > MAX_QTY) {
      return { error: `Check the quantity on ${product.name}` };
    }
    const min = product.min || 1;
    if (asked < min) return { error: `${product.name} comes in batches of at least ${min}` };
    if (min > 1 && asked % min !== 0) return { error: `${product.name} is ordered in multiples of ${min}` };

    const options = resolveOptions(product, item.options);
    if (options.error) return { error: options.error };

    const unit = product.price + options.extra;
    subtotal += unit * asked;

    lines.push({
      id: product.id,
      name: product.name,
      description: [options.picked.join(" / "), String(item.note || "").trim().slice(0, 200)]
        .filter(Boolean).join(" / ").slice(0, 280) || undefined,
      unit,
      qty: asked,
      note: String(item.note || "").trim().slice(0, 200),
      options: options.picked,
    });
  }

  if (delivery && subtotal < SHOP_CONFIG.delivery.minimum) {
    return { error: `Delivery starts at ${money(SHOP_CONFIG.delivery.minimum)}` };
  }

  const deliveryFee = delivery ? SHOP_CONFIG.delivery.fee : 0;
  const tax = Math.round((subtotal + deliveryFee) * (SHOP_CONFIG.taxRate || 0) * 100) / 100;
  const total = subtotal + deliveryFee + tax;

  return {
    lines,
    totals: { subtotal, delivery: deliveryFee, tax, total },
    fulfillment: delivery ? "delivery" : "pickup",
    date: body.date,
    window: body.window,
    customer: {
      name, email, phone, address,
      occasion: String(customer.occasion || "").trim().slice(0, 120),
      notes: String(customer.notes || "").trim().slice(0, 400),
    },
  };
}

/* Stripe's API takes form encoding, including for nested values. */
export function formEncode(value, prefix = "", out = new URLSearchParams()) {
  if (value === undefined || value === null) return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => formEncode(v, `${prefix}[${i}]`, out));
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      formEncode(v, prefix ? `${prefix}[${k}]` : k, out);
    }
  } else {
    out.append(prefix, String(value));
  }
  return out;
}

export async function stripeFetch(secret, path, { method = "POST", params, idempotencyKey } = {}) {
  const headers = {
    Authorization: `Bearer ${secret}`,
    "Stripe-Version": "2026-08-26.dahlia",
  };
  if (params) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers,
    body: params ? formEncode(params).toString() : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    const reason = payload?.error?.message || "Stripe refused the request";
    const failure = new Error(reason);
    /* So a caller can tell "no such thing" apart from "Stripe is unwell". */
    failure.status = response.status;
    throw failure;
  }
  return payload;
}

/* Stripe signs every webhook. This checks that signature before we believe a
   word of the body. Timing-safe compare, and a five minute freshness window
   so an old delivery cannot be replayed. */
export async function verifyStripeSignature(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((pair) => pair.split("=").map((s) => s.trim()))
  );
  const timestamp = Number.parseInt(parts.t, 10);
  const sent = parts.v1;
  if (!Number.isFinite(timestamp) || !sent) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== sent.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sent.charCodeAt(i);
  return diff === 0;
}

export function orderSummaryText(order, extra = {}) {
  const lines = order.lines.map(
    (l) => `- ${l.qty} x ${l.name}${l.options.length ? ` (${l.options.join("; ")})` : ""}` +
      `${l.note ? ` / note: ${l.note}` : ""} / ${money(l.unit * l.qty)}`
  );
  return [
    extra.heading || "Order",
    "",
    `Name: ${order.customer.name}`,
    `Email: ${order.customer.email}`,
    `Phone: ${order.customer.phone}`,
    order.fulfillment === "delivery" ? `Delivery to: ${order.customer.address}` : "Pickup",
    `When: ${order.date} at ${order.window}`,
    order.customer.occasion ? `Occasion: ${order.customer.occasion}` : "",
    "",
    "Items:",
    ...lines,
    "",
    `Subtotal: ${money(order.totals.subtotal)}`,
    order.totals.delivery ? `Delivery: ${money(order.totals.delivery)}` : "",
    order.totals.tax ? `Tax: ${money(order.totals.tax)}` : "",
    `Total: ${money(order.totals.total)}`,
    order.customer.notes ? `\nNotes: ${order.customer.notes}` : "",
  ].filter(Boolean).join("\n");
}

/* The paid-order email reuses whatever inbox the site already uses. */
export async function notifyBaker(endpoint, payload) {
  if (!endpoint) return { sent: false, reason: "no order endpoint configured" };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  return { sent: response.ok, status: response.status };
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
