/* ---------------------------------------------------------------------------
   A temporary, admin-only test checkout.

   It exists to prove the Stripe wiring works on a day when the order book is
   shut. It does NOT touch the real ordering rules: /api/checkout still
   enforces the Monday to Wednesday window, and this endpoint is a separate
   door that the public cannot open.

   Four independent guards, each of which alone is enough to stop a real
   charge:

     1. Test keys only. If STRIPE_SECRET_KEY is a live key, this refuses to
        run at all. A real card can never be charged through here.
     2. Off unless switched on. Without TEST_CHECKOUT_TOKEN set in Cloudflare,
        the endpoint does not exist.
     3. The token must match, compared in constant time.
     4. It expires. After the date below it is gone whether anyone remembers
        to remove it or not.

   The order it creates is marked as a test everywhere it can be: a $1 line
   item that says so, a TEST- reference, and metadata the webhook reads so a
   test payment never lands in the inbox looking like something to bake.

   To remove it: delete TEST_CHECKOUT_TOKEN in Cloudflare, or delete this file.
   --------------------------------------------------------------------------- */
import { stripeFetch, json } from "../_lib/order.js";

/* Hard stop. Past this, the endpoint is gone regardless of configuration. */
const EXPIRES_AT = "2026-10-23T23:59:59Z";

const TEST_AMOUNT_CENTS = 100;

function constantTimeEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Returns a reason string when the endpoint must not run, otherwise null. */
function blocked(env) {
  if (Date.now() > Date.parse(EXPIRES_AT)) {
    return { status: 410, error: "The test checkout expired on " + EXPIRES_AT.slice(0, 10) + "." };
  }
  if (!env.TEST_CHECKOUT_TOKEN) {
    return { status: 404, error: "Not found" };
  }
  if (!env.STRIPE_SECRET_KEY) {
    return { status: 503, error: "No Stripe key is set on this Worker yet." };
  }
  if (!/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY)) {
    return {
      status: 403,
      error: "This Worker holds a live Stripe key. The test checkout only runs " +
        "with a test key, so that it can never charge a real card.",
    };
  }
  return null;
}

const PAGE = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Test checkout | The Frosted Frog</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #11211a; color: #efede2; padding: 1.5rem;
         font: 400 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
  main { width: min(32rem, 100%); background: #1a2f25; border: 1px solid #2c5240;
         border-radius: 6px; padding: 1.8rem; }
  h1 { font-size: 1.45rem; margin: 0 0 .3rem; }
  p { margin: 0 0 1rem; color: #afc2b2; font-size: .95rem; }
  ul { margin: 0 0 1.4rem; padding-left: 1.1rem; color: #afc2b2; font-size: .9rem; }
  label { display: block; font-size: .72rem; letter-spacing: .16em;
          text-transform: uppercase; color: #d8b65c; margin-bottom: .4rem; }
  input { width: 100%; box-sizing: border-box; padding: .7rem .8rem; font-size: 1rem;
          background: #11211a; color: #efede2; border: 1px solid #2c5240; border-radius: 4px; }
  input:focus-visible { outline: 2px solid #d8b65c; outline-offset: 2px; }
  button { width: 100%; margin-top: 1rem; padding: .85rem; font-size: .8rem;
           letter-spacing: .18em; text-transform: uppercase; cursor: pointer;
           background: #d8b65c; color: #11211a; border: 0; border-radius: 4px; }
  button[disabled] { opacity: .5; cursor: progress; }
  .flag { display: inline-block; background: #d8b65c; color: #11211a; font-size: .68rem;
          letter-spacing: .18em; text-transform: uppercase; padding: .25rem .6rem;
          border-radius: 999px; margin-bottom: .9rem; }
  .err { color: #ffb4a8; font-size: .9rem; margin-top: .9rem; }
  code { background: #11211a; padding: .1rem .35rem; border-radius: 3px; font-size: .85em; }
</style>
<main>
  <span class="flag">Test mode</span>
  <h1>Test checkout</h1>
  <p>Proves the Stripe wiring end to end on a day the order book is closed. It
     charges a test card $1.00 and never touches real money.</p>
  <ul>
    <li>Only runs with a Stripe <strong>test</strong> key</li>
    <li>Creates no real order</li>
    <li>Expires ${EXPIRES_AT.slice(0, 10)}</li>
  </ul>
  <form id="f">
    <label for="t">Admin token</label>
    <input id="t" type="password" autocomplete="off" spellcheck="false" required>
    <button type="submit">Start test checkout</button>
  </form>
  <p class="err" id="e" hidden></p>
  <p style="margin-top:1.2rem;font-size:.85rem">Pay with <code>4242 4242 4242 4242</code>,
     any future expiry, any CVC.</p>
</main>
<script>
document.getElementById("f").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const btn = ev.target.querySelector("button");
  const err = document.getElementById("e");
  btn.disabled = true; btn.textContent = "Creating session…"; err.hidden = true;
  try {
    const r = await fetch(location.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: document.getElementById("t").value }),
    });
    const body = await r.json();
    if (!r.ok || !body.url) throw new Error(body.error || "Could not start the test checkout");
    location.href = body.url;
  } catch (e) {
    err.textContent = e.message; err.hidden = false;
    btn.disabled = false; btn.textContent = "Start test checkout";
  }
});
</script>
`;

function page(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'none'",
    },
  });
}

export function onRequestGet({ env }) {
  const stop = blocked(env);
  if (stop) {
    /* A disabled endpoint looks like any other missing page. */
    if (stop.status === 404) return json({ error: "Not found" }, 404);
    return page(`<!doctype html><meta charset="utf-8"><title>Test checkout unavailable</title>
      <body style="font:16px/1.6 system-ui;padding:2rem;max-width:34rem">
      <h1 style="font-size:1.3rem">Test checkout unavailable</h1><p>${stop.error}</p>`, stop.status);
  }
  return page(PAGE);
}

export async function onRequestPost({ request, env }) {
  const stop = blocked(env);
  if (stop) return json({ error: stop.error }, stop.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  if (!constantTimeEquals(String(body?.token || ""), env.TEST_CHECKOUT_TOKEN)) {
    console.warn("test checkout: rejected a bad token");
    return json({ error: "That token is not right." }, 401);
  }

  const reference = "TEST-" + crypto.randomUUID().slice(0, 8);
  const origin = env.SITE_URL || new URL(request.url).origin;

  try {
    const session = await stripeFetch(env.STRIPE_SECRET_KEY, "checkout/sessions", {
      idempotencyKey: reference,
      params: {
        ui_mode: "hosted_page",
        mode: "payment",
        submit_type: "pay",
        billing_address_collection: "auto",
        phone_number_collection: { enabled: true },
        automatic_tax: { enabled: false },
        allow_promotion_codes: false,
        integration_identifier: "hosted_web_0001",
        origin_context: "web",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: TEST_AMOUNT_CENTS,
            product_data: {
              name: "TEST ORDER, not a real purchase",
              description: "A $1 test of the payment wiring. Nothing is baked and nothing is owed.",
            },
          },
        }],
        client_reference_id: reference,
        success_url: `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/api/test-checkout`,
        payment_intent_data: { description: `Frosted Frog TEST ${reference}` },
        metadata: {
          test_order: "true",
          reference,
          fulfillment: "pickup",
          customer_name: "Test order, no customer",
          items: "1x TEST ORDER, not a real purchase",
          total: "$1.00",
          pickup_date: "n/a",
          pickup_time: "n/a",
        },
      },
    });

    console.log("test checkout session created", reference);
    return json({ url: session.url, reference });
  } catch (error) {
    console.error("test checkout failed", error.message);
    return json({ error: "Stripe refused the test session: " + error.message }, 502);
  }
}
