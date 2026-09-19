/* Stripe Checkout for The Frosted Frog.
 *
 * Prices are recalculated here from assets/js/data.js — never from the
 * browser — so a customer can't edit what they owe on the way to checkout.
 *
 * Setup: see README.md → "Turning on card payments".
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/* Load the same catalog the site uses. */
function loadCatalog() {
  const dir = path.join(__dirname, "..", "..", "assets", "js");
  const sandbox = {};
  vm.createContext(sandbox);
  // data.js declares consts, which stay lexical — hand them over explicitly.
  vm.runInContext(
    fs.readFileSync(path.join(dir, "data.js"), "utf8") +
      "\n;this.__catalog = { PRODUCTS, SHOP_CONFIG };",
    sandbox
  );
  // The same schedule rules the browser uses, so the server can re-check them.
  vm.runInContext(fs.readFileSync(path.join(dir, "schedule.js"), "utf8"), sandbox);
  sandbox.__catalog.Schedule = sandbox.Schedule;
  return sandbox.__catalog;
}

const { PRODUCTS, SHOP_CONFIG, Schedule } = loadCatalog();

const cents = (dollars) => Math.round(Number(dollars) * 100);

function priceFor(product, optionLabels) {
  let price = product.price;
  const chosen = [];
  (product.options || []).forEach((group) => {
    const match = (optionLabels || []).find((l) => l.startsWith(group.label + ": "));
    if (!match) return;
    const name = match.slice(group.label.length + 2);
    const choice = group.choices.find((c) => c.name === name);
    if (choice) {
      price += choice.price || 0;
      chosen.push(group.label + ": " + choice.name);
    }
  });
  return { price, chosen };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Payments aren't configured yet" }) };
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad request" }) };
  }

  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "Your order is empty" }) };
  }
  if (!order.date || !order.window) {
    return { statusCode: 400, body: JSON.stringify({ error: "Choose a pickup day and time" }) };
  }

  /* The schedule is enforced here too, not just in the browser. */
  if (!Schedule.isOrderingOpen(new Date(), SHOP_CONFIG)) {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: "Ordering is closed — the order book opens again Monday" }),
    };
  }
  if (!Schedule.isValidPickup(order.date, order.window, new Date(), SHOP_CONFIG)) {
    return { statusCode: 400, body: JSON.stringify({ error: "That isn't one of this week's pickup times" }) };
  }

  const lineItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item.id);
    if (!product || product.available === false) {
      return { statusCode: 400, body: JSON.stringify({ error: `"${item.name || item.id}" isn't available` }) };
    }
    const qty = Math.max(parseInt(item.qty, 10) || 0, product.min || 1);
    const { price, chosen } = priceFor(product, item.options);
    subtotal += price * qty;

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "usd",
        unit_amount: cents(price),
        product_data: {
          name: product.name,
          description: [chosen.join(" · "), item.note ? "Note: " + item.note : ""]
            .filter(Boolean).join(" — ").slice(0, 300) || undefined,
        },
      },
    });
  }

  const delivery = order.fulfillment === "delivery" && SHOP_CONFIG.delivery.enabled;
  if (delivery) {
    if (subtotal < SHOP_CONFIG.delivery.minimum) {
      return { statusCode: 400, body: JSON.stringify({ error: "Delivery minimum is $" + SHOP_CONFIG.delivery.minimum }) };
    }
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cents(SHOP_CONFIG.delivery.fee),
        product_data: { name: "Local delivery" },
      },
    });
  }

  const origin = event.headers.origin || process.env.URL || "";
  const customer = order.customer || {};

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customer.email || undefined,
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      phone_number_collection: { enabled: true },
      success_url: origin + "/thank-you.html?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/order.html",
      metadata: {
        fulfillment: delivery ? "delivery" : "pickup",
        pickup_date: order.date,
        pickup_time: order.window,
        pickup_window: order.windowRange || "",
        customer_name: (customer.name || "").slice(0, 200),
        customer_phone: (customer.phone || "").slice(0, 50),
        address: (customer.address || "").slice(0, 400),
        occasion: (customer.occasion || "").slice(0, 200),
        notes: (customer.notes || "").slice(0, 450),
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, id: session.id }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return { statusCode: 502, body: JSON.stringify({ error: "Payment session could not be created" }) };
  }
};
