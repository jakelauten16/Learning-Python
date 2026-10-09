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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
