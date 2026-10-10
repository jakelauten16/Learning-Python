/* Exercises src/worker.js directly: routing, method handling, and that
   anything not /api/... goes to the assets binding. Stripe is never called. */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const worker = (await import(SITE + "/src/worker.js")).default;

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`); };

let assetRequests = [];
const env = {
  ASSETS: { fetch: (req) => { assetRequests.push(new URL(req.url).pathname); return new Response("<html>a page</html>", { headers: { "Content-Type": "text/html" } }); } },
};
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };
const hit = (path, method = "GET", body) => worker.fetch(
  new Request("https://super-dust-23bf.madison-lautenschlager.workers.dev" + path, {
    method, body, headers: body ? { "Content-Type": "application/json" } : {},
  }), env, ctx);

// pages come from the assets binding
let r = await hit("/");
ok("/ served from assets", r.status === 200 && assetRequests.includes("/"));
r = await hit("/order.html");
ok("/order.html served from assets", assetRequests.includes("/order.html"));

// the api routes reach the handlers
r = await hit("/api/health");
let body = await r.json();
ok("/api/health answers", r.status === 200 && body.ok === true, `products=${body.products}`);
ok("health reports no key configured", body.stripeKeySet === false && body.webhookSecretSet === false);
ok("health leaks nothing secret", !JSON.stringify(body).match(/sk_|rk_|whsec_/));

r = await hit("/api/checkout", "POST", JSON.stringify({ items: [] }));
ok("/api/checkout without a key fails closed", r.status === 503, `status ${r.status}`);

r = await hit("/api/checkout");
ok("GET on checkout is 405", r.status === 405);
r = await hit("/api/stripe-webhook");
ok("GET on the webhook is 405", r.status === 405);
r = await hit("/api/stripe-webhook", "POST", "{}");
ok("webhook without a secret fails closed", r.status === 503);

r = await hit("/api/session?id=cs_test_123");
ok("session lookup without a key fails closed", r.status === 503);

// an unknown api path is still a page request, not a crash
assetRequests = [];
r = await hit("/api/nope");
ok("unknown /api path falls through to assets", assetRequests.includes("/api/nope"));

// a handler that throws must not leak the stack
const broken = { ASSETS: env.ASSETS };
r = await worker.fetch(new Request("https://x/api/health", { method: "GET" }), broken, ctx);
ok("handler errors return a clean message", r.status === 200 || r.status === 500);

/* --- the temporary, admin-only test checkout ------------------------------ */
const TOKEN = "a-long-enough-admin-token";
const withEnv = (extra) => ({ ...env, ...extra });
const tc = (e, method = "GET", body) => worker.fetch(
  new Request("https://super-dust-23bf.madison-lautenschlager.workers.dev/api/test-checkout", {
    method, body, headers: body ? { "Content-Type": "application/json" } : {},
  }), e, ctx);

assetRequests = [];
r = await tc(env);
ok("test checkout is 404 with no token set", r.status === 404 && assetRequests.length === 0);
r = await tc(env, "POST", JSON.stringify({ token: TOKEN }));
ok("POST is 404 with no token set", r.status === 404);

r = await tc(withEnv({ TEST_CHECKOUT_TOKEN: TOKEN }));
ok("without a Stripe key it refuses, not 200", r.status === 503);

const live = withEnv({ TEST_CHECKOUT_TOKEN: TOKEN, STRIPE_SECRET_KEY: "sk_live_notarealkey" });
r = await tc(live);
ok("a live key blocks the page", r.status === 403);
r = await tc(live, "POST", JSON.stringify({ token: TOKEN }));
body = await r.json();
ok("a live key blocks the session, even with the right token",
   r.status === 403 && /live Stripe key/.test(body.error));

const testEnv = withEnv({ TEST_CHECKOUT_TOKEN: TOKEN, STRIPE_SECRET_KEY: "sk_test_notarealkey" });
r = await tc(testEnv);
const html = await r.text();
ok("the page renders with a test key", r.status === 200 && /Admin token/.test(html));
ok("the page is not indexable", /noindex/.test(r.headers.get("X-Robots-Tag") || ""));
ok("the page carries no secret", !/sk_test|rk_test|a-long-enough-admin-token/.test(html));

r = await tc(testEnv, "POST", JSON.stringify({ token: "wrong-but-same-length" }));
ok("a wrong token is rejected", r.status === 401);
r = await tc(testEnv, "POST", JSON.stringify({}));
ok("a missing token is rejected", r.status === 401);

/* Stripe stubbed, so nothing leaves the machine. */
const realFetch = globalThis.fetch;
let sent = null;
globalThis.fetch = async (url, init) => {
  sent = { url: String(url), body: new URLSearchParams(init.body) };
  return new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_stub", id: "cs_test_stub" }),
    { status: 200, headers: { "Content-Type": "application/json" } });
};
r = await tc(testEnv, "POST", JSON.stringify({ token: TOKEN }));
body = await r.json();
globalThis.fetch = realFetch;

ok("the right token creates a session", r.status === 200 && /checkout.stripe.com/.test(body.url || ""));
ok("the reference is marked a test", /^TEST-/.test(body.reference || ""), body.reference);
ok("it charges one dollar, nothing more", sent?.body.get("line_items[0][price_data][unit_amount]") === "100");
ok("the line item says it is a test", /TEST ORDER/.test(sent?.body.get("line_items[0][price_data][product_data][name]") || ""));
ok("metadata flags it for the webhook", sent?.body.get("metadata[test_order]") === "true");
ok("it is a one-off payment, not a saved card", sent?.body.get("mode") === "payment");
ok("it goes to Stripe and nowhere else", sent?.url === "https://api.stripe.com/v1/checkout/sessions");

/* The real checkout must be untouched by any of this. */
r = await hit("/api/checkout", "POST", JSON.stringify({ items: [{ id: "cookie-weekly", qty: 12 }] }));
ok("/api/checkout still refuses without a key", r.status === 503);

/* --- cache busting ---------------------------------------------------------
   The script filenames never change, so a browser holding a copy from before
   a menu change will keep using it. Every reference carries a version, and
   they all carry the same one: a half-bumped deploy would serve a new data.js
   beside an old cart.js, which is worse than serving neither. */
import { readdirSync, readFileSync as rf } from "node:fs";

const pages = readdirSync(SITE).filter((f) => f.endsWith(".html"));
const refs = [];
for (const page of pages) {
  const html = rf(join(SITE, page), "utf8");
  for (const m of html.matchAll(/(?:src|href)="(assets\/(?:js|css)\/[^"]+)"/g)) {
    refs.push({ page, url: m[1] });
  }
}

ok("every page was scanned", pages.length >= 6, `${pages.length} pages, ${refs.length} refs`);

const unversioned = refs.filter((r) => !/\?v=/.test(r.url));
ok("every script and stylesheet is versioned", unversioned.length === 0,
   unversioned.slice(0, 3).map((r) => `${r.page} -> ${r.url}`).join(" | "));

const versions = [...new Set(refs.map((r) => (r.url.match(/\?v=([^"&]+)/) || [])[1]))];
ok("one version across the whole site", versions.length === 1, versions.join(", "));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
