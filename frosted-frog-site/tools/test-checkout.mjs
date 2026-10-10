/* Exercises the server code with Stripe stubbed out. */
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const { priceOrder, verifyStripeSignature, SHOP_CONFIG, PRODUCTS, Schedule } =
  await import(SITE + "/functions/_lib/order.js");
const { onRequestPost: checkout } = await import(SITE + "/functions/api/checkout.js");
const { onRequestPost: webhook } = await import(SITE + "/functions/api/stripe-webhook.js");

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  (cond ? pass++ : fail++);
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
};

/* A Monday inside the order window, so the schedule check passes. */
const monday = new Date();
monday.setHours(12, 0, 0, 0);
monday.setDate(monday.getDate() + ((1 - monday.getDay() + 7) % 7 || 7));
const slot = Schedule.pickupOptions(monday, SHOP_CONFIG)[0];
const realNow = Date.now;
Date.now = () => monday.getTime();
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(monday); }
  static now() { return monday.getTime(); }
};

const baseOrder = (over = {}) => ({
  items: [{ id: "iced-sugar-cookies", qty: 12, options: { Design: "Detailed, florals, lettering" } }],
  fulfillment: "pickup",
  date: slot.date,
  window: slot.slots[0],
  customer: { name: "Jamie Tester", email: "jamie@example.com", phone: "555 0123" },
  ...over,
});

/* 1. Honest order prices from the catalog. */
const product = PRODUCTS.find((p) => p.id === "iced-sugar-cookies");
const design = product.options[0].choices.find((c) => c.name.startsWith("Detailed"));
const expected = (product.price + design.price) * 12;
const priced = priceOrder(baseOrder(), monday);
ok("prices from the catalog", priced.totals?.subtotal === expected,
   `subtotal ${priced.totals?.subtotal} expected ${expected}`);
ok("tax computed server side", Math.abs(priced.totals.tax - expected * SHOP_CONFIG.taxRate) < 0.01);

/* 2. Prices sent by the browser are ignored. */
const tampered = priceOrder(baseOrder({
  items: [{ id: "iced-sugar-cookies", qty: 12, price: 0.01, unitPrice: 0.01, options: { Design: "Detailed, florals, lettering" } }],
  totals: { subtotal: 0.01, total: 0.01 },
}), monday);
ok("browser-sent prices ignored", tampered.totals?.subtotal === expected,
   `got ${tampered.totals?.subtotal}`);

/* 3. Invented options rejected. */
const badOption = priceOrder(baseOrder({
  items: [{ id: "iced-sugar-cookies", qty: 12, options: { Design: "Free please" } }],
}), monday);
ok("unknown option refused", !!badOption.error, badOption.error || "");

/* 4. Unknown product refused. */
ok("unknown product refused", !!priceOrder(baseOrder({ items: [{ id: "free-cake", qty: 1 }] }), monday).error);

/* 5. Quantity games refused. */
ok("negative quantity refused", !!priceOrder(baseOrder({ items: [{ id: "iced-sugar-cookies", qty: -5 }] }), monday).error);
/* Everything on the menu is priced by the package now, so one is a valid
   order: one dozen, one half dozen, one cake. The minimum rule still exists
   for any product that sets one, and this follows the catalog rather than
   assuming a particular item does. */
ok("one of a package-priced item is accepted",
   !priceOrder(baseOrder({ items: [{ id: "iced-sugar-cookies", qty: 1 }] }), monday).error);

const withMin = PRODUCTS.find((p) => (p.min || 1) > 1);
if (withMin) {
  ok(`below minimum refused on ${withMin.id}`,
     !!priceOrder(baseOrder({ items: [{ id: withMin.id, qty: 1 }] }), monday).error);
} else {
  ok("nothing on the menu sets a minimum, so none can be undercut", true);
}

/* 6. Schedule still enforced on the server. */
ok("bogus pickup slot refused", !!priceOrder(baseOrder({ window: "2:00 AM" }), monday).error);
const thursday = new RealDate(monday); thursday.setDate(thursday.getDate() + 3);
/* previewAnyDay deliberately lifts the Monday-to-Wednesday rule while the
   site is being previewed or a live payment is being tested. The assertion
   follows the setting, so turning the preview off re-arms the guard without
   anyone having to remember this test exists. */
if (SHOP_CONFIG.schedule.previewAnyDay) {
  ok("PREVIEW MODE IS ON, closed days accept orders", !priceOrder(baseOrder(), thursday).error,
     "set schedule.previewAnyDay back to false when you are done");
} else {
  ok("closed window refused", priceOrder(baseOrder(), thursday).status === 409);
}

/* 7. Delivery, whichever way the switch is set. The shop is pickup only, so
   these follow SHOP_CONFIG rather than assuming: turning delivery back on
   re-arms the fee and address checks without anyone editing this file. */
const delivery = priceOrder(baseOrder({ fulfillment: "delivery", customer: { ...baseOrder().customer, address: "12 Willow Lane" } }), monday);
if (SHOP_CONFIG.delivery.enabled) {
  ok("delivery fee added once", delivery.totals?.delivery === SHOP_CONFIG.delivery.fee);
  ok("delivery needs an address", !!priceOrder(baseOrder({ fulfillment: "delivery" }), monday).error);
} else {
  ok("delivery is refused while the shop is pickup only", !!delivery.error, delivery.error);
  ok("no address is ever asked for", !/address/i.test(delivery.error || ""));
}

/* 8. The whole endpoint, with Stripe stubbed. */
let sentToStripe = null;
globalThis.fetch = async (url, init) => {
  sentToStripe = { url, body: new URLSearchParams(init.body), auth: init.headers.Authorization };
  return new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_123", id: "cs_test_123" }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
};
const req = (body) => new Request("https://thefrostedfrog.com/api/checkout", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
let res = await checkout({ request: req(baseOrder()), env: { STRIPE_SECRET_KEY: "sk_test_fake" } });
let json = await res.json();
ok("checkout returns a Stripe url", res.status === 200 && json.url.startsWith("https://checkout.stripe.com"));
ok("secret key never leaves the server", !JSON.stringify(json).includes("sk_test"));
const amount = Number(sentToStripe.body.get("line_items[0][price_data][unit_amount]"));
ok("unit amount sent in cents from the catalog", amount === Math.round((product.price + design.price) * 100), `got ${amount}`);
/* Tax is a separate line when a rate is set, and absent when it is not, so
   the customer is never charged a cent the page did not show them. */
const taxLine = [...sentToStripe.body.values()].includes("Sales tax");
ok(SHOP_CONFIG.taxRate ? "tax is its own line" : "no tax line when no tax is charged",
   taxLine === Boolean(SHOP_CONFIG.taxRate), `taxRate=${SHOP_CONFIG.taxRate}`);
ok("success url points at thank-you", sentToStripe.body.get("success_url").includes("/thank-you.html?session_id="));

/* A tampered request through the real endpoint still charges full price. */
sentToStripe = null;
await checkout({ request: req(baseOrder({ items: [{ id: "iced-sugar-cookies", qty: 12, unit_amount: 1, price: 0.01, options: { Design: "Detailed, florals, lettering" } }] })), env: { STRIPE_SECRET_KEY: "sk_test_fake" } });
ok("endpoint ignores a tampered price", Number(sentToStripe.body.get("line_items[0][price_data][unit_amount]")) === Math.round((product.price + design.price) * 100));

/* Stripe rejects the entire session if saved_payment_method_options is sent
   without a customer, so sending it would break every checkout. This caught
   nothing until a live payment was attempted; it will now. */
const sentKeys = [...sentToStripe.body.keys()];
const needsCustomer = sentKeys.filter((k) => k.startsWith("saved_payment_method_options"));
ok("no parameter is sent that would require a Stripe Customer",
   needsCustomer.length === 0, needsCustomer.join(", "));
ok("and no customer is being created, so that stays true",
   !sentKeys.includes("customer") && !sentKeys.includes("customer_creation"));

/* 9. Missing key fails closed. */
res = await checkout({ request: req(baseOrder()), env: {} });
ok("no key means no checkout", res.status === 503);

/* 10. Webhook signatures. */
const secret = "whsec_test_secret";
const payload = JSON.stringify({
  id: "evt_1", type: "checkout.session.completed",
  data: { object: { id: "cs_test_123", payment_status: "paid", amount_total: 69336, currency: "usd",
    customer_details: { email: "jamie@example.com", phone: "555 0123" },
    metadata: { reference: "abc123", customer_name: "Jamie Tester", pickup_date: slot.date, pickup_time: slot.slots[0], items: "12x Iced Sugar Cookies", total: "$693.36", fulfillment: "pickup" } } },
});
const ts = Math.floor(monday.getTime() / 1000);
const sign = (body, t = ts, key = secret) => `t=${t},v1=${createHmac("sha256", key).update(`${t}.${body}`).digest("hex")}`;

ok("valid signature accepted", await verifyStripeSignature(payload, sign(payload), secret));
ok("tampered body rejected", !(await verifyStripeSignature(payload.replace("69336", "1"), sign(payload), secret)));
ok("wrong secret rejected", !(await verifyStripeSignature(payload, sign(payload, ts, "whsec_other"), secret)));
ok("stale delivery rejected", !(await verifyStripeSignature(payload, sign(payload, ts - 3600), secret)));
ok("missing signature rejected", !(await verifyStripeSignature(payload, null, secret)));

/* 11. The webhook emails the order, and only when the signature is good. */
let emailed = null;
globalThis.fetch = async (url, init) => {
  emailed = { url, body: JSON.parse(init.body) };
  return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
};
const hook = (body, sig) => new Request("https://thefrostedfrog.com/api/stripe-webhook", {
  method: "POST", headers: { "Stripe-Signature": sig || "" }, body,
});
res = await webhook({ request: hook(payload, sign(payload)), env: { STRIPE_WEBHOOK_SECRET: secret, ORDER_ENDPOINT: "https://formspree.io/f/test" } });
ok("signed webhook accepted", res.status === 200);
ok("paid order emailed", emailed && emailed.body.status === "PAID" && emailed.body.order.includes("PAID ORDER"));
ok("email carries the pickup slot", emailed.body.pickup.includes(slot.date));

emailed = null;
res = await webhook({ request: hook(payload, sign(payload, ts, "whsec_wrong")), env: { STRIPE_WEBHOOK_SECRET: secret, ORDER_ENDPOINT: "https://formspree.io/f/test" } });
ok("forged webhook rejected", res.status === 400 && emailed === null);

/* 12. An unpaid session does not become an order. */
const unpaid = payload.replace('"payment_status":"paid"', '"payment_status":"unpaid"');
emailed = null;
res = await webhook({ request: hook(unpaid, sign(unpaid)), env: { STRIPE_WEBHOOK_SECRET: secret, ORDER_ENDPOINT: "https://formspree.io/f/test" } });
ok("unpaid session not emailed", res.status === 200 && emailed === null);

/* 13. A failed email asks Stripe to retry rather than swallowing the order. */
globalThis.fetch = async () => new Response("nope", { status: 500 });
res = await webhook({ request: hook(payload, sign(payload)), env: { STRIPE_WEBHOOK_SECRET: secret, ORDER_ENDPOINT: "https://formspree.io/f/test" } });
ok("email failure returns 500 so Stripe retries", res.status === 500);

/* 14. A test-checkout session proves the webhook ran without looking like an
   order to bake. */
const testPayload = JSON.stringify({
  id: "evt_test", type: "checkout.session.completed",
  data: { object: { id: "cs_test_999", payment_status: "paid", amount_total: 100, currency: "usd",
    metadata: { test_order: "true", reference: "TEST-abcd1234", customer_name: "Test order, no customer",
      items: "1x TEST ORDER, not a real purchase", total: "$1.00", pickup_date: "n/a", pickup_time: "n/a" } } },
});
emailed = null;
globalThis.fetch = async (url, init) => {
  emailed = { url, body: JSON.parse(init.body) };
  return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
};
res = await webhook({ request: hook(testPayload, sign(testPayload)), env: { STRIPE_WEBHOOK_SECRET: secret, ORDER_ENDPOINT: "https://formspree.io/f/test" } });
let testBody = await res.json();
ok("test session accepted and reported as a test", res.status === 200 && testBody.test === true);
ok("the test email is not a PAID order", emailed && emailed.body.status === "TEST" && !emailed.body.order.includes("PAID ORDER"));
ok("the test email says plainly there is nothing to bake", /nothing to bake/i.test(emailed.body.order));
ok("the test email names the event, which is the proof asked for", emailed.body.order.includes("checkout.session.completed"));

/* An unsigned test session is still refused: the flag is not a way in. */
emailed = null;
res = await webhook({ request: hook(testPayload, sign(testPayload, ts, "whsec_wrong")), env: { STRIPE_WEBHOOK_SECRET: secret, ORDER_ENDPOINT: "https://formspree.io/f/test" } });
ok("a forged test webhook is rejected too", res.status === 400 && emailed === null);

/* 15. An unknown session id reads as "no record", not as a breakage. */
const { onRequestGet: sessionLookup } = await import(SITE + "/functions/api/session.js");
const look = (id) => new Request(`https://thefrostedfrog.com/api/session?id=${id}`);

globalThis.fetch = async () => new Response(
  JSON.stringify({ error: { message: "No such checkout.session: cs_test_nope" } }),
  { status: 404, headers: { "Content-Type": "application/json" } });
res = await sessionLookup({ request: look("cs_test_nope"), env: { STRIPE_SECRET_KEY: "sk_test_fake" } });
ok("an unknown session is 404, not 502", res.status === 404);

globalThis.fetch = async () => new Response("{}", { status: 500, headers: { "Content-Type": "application/json" } });
res = await sessionLookup({ request: look("cs_test_broken"), env: { STRIPE_SECRET_KEY: "sk_test_fake" } });
ok("Stripe being unwell is still 502", res.status === 502);

res = await sessionLookup({ request: look("not-a-session-id"), env: { STRIPE_SECRET_KEY: "sk_test_fake" } });
ok("a malformed id never reaches Stripe", res.status === 400);

/* 16. The order actually has somewhere to go, and the browser is allowed to
   send it there. connect-src governs fetch(); without it the CSP falls back
   to default-src 'self' and every order dies in the browser. */
const headers = readFileSync(SITE + "/_headers", "utf8");
const csp = (headers.match(/Content-Security-Policy: (.+)/) || [])[1] || "";
const connectSrc = (csp.match(/connect-src ([^;]+)/) || [])[1] || "";

ok("an order endpoint is configured", /^https:\/\/formspree\.io\/f\/\w+$/.test(SHOP_CONFIG.orderEndpoint), SHOP_CONFIG.orderEndpoint);
ok("the CSP sets connect-src at all", connectSrc !== "");
ok("the browser may reach Formspree", connectSrc.includes("https://formspree.io"));
ok("the order endpoint's host is one the CSP allows",
   connectSrc.includes(new URL(SHOP_CONFIG.orderEndpoint).origin));
ok("the CSP still refuses everything else by default", /default-src 'self'/.test(csp));

/* The paid-order email replies to the customer, not to nobody. */
emailed = null;
globalThis.fetch = async (url, init) => {
  emailed = { url, body: JSON.parse(init.body) };
  return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
};
res = await webhook({ request: hook(payload, sign(payload)), env: { STRIPE_WEBHOOK_SECRET: secret, ORDER_ENDPOINT: "https://formspree.io/f/test" } });
ok("the paid email replies to the customer", emailed?.body._replyto === "jamie@example.com");

/* 16b. The order details reach the payment, not only the session. The
   dashboard's Payments list shows the payment, so metadata that lives only
   on the session is invisible to whoever is trying to work out what to bake. */
const sessionItems = sentToStripe.body.get("metadata[items]");
const paymentItems = sentToStripe.body.get("payment_intent_data[metadata][items]");
ok("the session carries the item list", !!sessionItems, sessionItems);
ok("the payment carries it too", paymentItems === sessionItems);
for (const key of ["reference", "pickup_date", "pickup_time", "customer_name", "total"]) {
  ok(`${key} reaches the payment record`,
     sentToStripe.body.get(`payment_intent_data[metadata][${key}]`) === sentToStripe.body.get(`metadata[${key}]`));
}

/* The customer never sees Stripe's own error text; it is written for a
   developer and can quote the request back. */
globalThis.fetch = async () => new Response(
  JSON.stringify({ error: { message: "some internal Stripe detail" } }),
  { status: 400, headers: { "Content-Type": "application/json" } });
const broke = await checkout({ request: req(baseOrder()), env: { STRIPE_SECRET_KEY: "sk_test_fake" } });
const brokeBody = await broke.json();
ok("a Stripe failure gives the customer a plain message",
   broke.status === 502 && !JSON.stringify(brokeBody).includes("some internal Stripe detail"));

/* 17. Pickup only, at the two advertised windows. */
ok("delivery is switched off", SHOP_CONFIG.delivery.enabled === false);

const fri = SHOP_CONFIG.schedule.pickups.find((p) => p.day === 5);
const sat = SHOP_CONFIG.schedule.pickups.find((p) => p.day === 6);
ok("Friday runs noon to 7", fri.start === "12:00" && fri.end === "19:00", `${fri.start}-${fri.end}`);
ok("Saturday runs 8 to 7", sat.start === "08:00" && sat.end === "19:00", `${sat.start}-${sat.end}`);
ok("there are only those two windows", SHOP_CONFIG.schedule.pickups.length === 2);

/* A delivery request is refused outright, not quietly made a pickup: someone
   expecting it brought to them should be told it is collection only. */
const asksDelivery = priceOrder(baseOrder({ fulfillment: "delivery", customer: { ...baseOrder().customer, address: "1 Any Street" } }), monday);
ok("a delivery request is refused", !!asksDelivery.error, asksDelivery.error);
ok("and no delivery fee can ever be charged",
   !priceOrder(baseOrder(), monday).error && priceOrder(baseOrder(), monday).totals.delivery === 0);

/* The earliest slot on each day has to be bookable, or the window is a lie. */
const slots = Schedule.pickupOptions(monday, SHOP_CONFIG);
const friSlots = slots.find((o) => o.label === "Friday");
const satSlots = slots.find((o) => o.label === "Saturday");
ok("Friday opens at noon", friSlots.slots[0] === "12:00 PM", friSlots.slots[0]);
ok("Saturday opens at 8", satSlots.slots[0] === "8:00 AM", satSlots.slots[0]);
ok("the earliest Friday slot is accepted",
   !priceOrder(baseOrder({ date: friSlots.date, window: friSlots.slots[0] }), monday).error);
ok("the earliest Saturday slot is accepted",
   !priceOrder(baseOrder({ date: satSlots.date, window: satSlots.slots[0] }), monday).error);

Date.now = realNow; globalThis.Date = RealDate;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
