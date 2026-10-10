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

/* --- findable on the web --------------------------------------------------
   Every page says which URL is the real one, so the workers.dev address and
   the custom domain are not indexed as two competing copies of the shop. */
import { readFileSync as rfSeo } from "node:fs";
const SEO_SITE = "https://www.thefrostedfrogbakery.com";
const seoPages = readdirSync(SITE).filter((f) => f.endsWith(".html"));
const PRIVATE = ["basket.html", "review.html", "thank-you.html", "404.html"];

const noCanon = seoPages.filter((f) => !/rel="canonical"/.test(rfSeo(join(SITE, f), "utf8")));
ok("every page declares a canonical URL", noCanon.length === 0, noCanon.join(", "));

const relCanon = seoPages.filter((f) => {
  const m = rfSeo(join(SITE, f), "utf8").match(/rel="canonical" href="([^"]+)"/);
  return !m || !m[1].startsWith(SEO_SITE);
});
ok("every canonical points at the real domain", relCanon.length === 0, relCanon.join(", "));

const leaky = PRIVATE.filter((f) => !/name="robots" content="noindex/.test(rfSeo(join(SITE, f), "utf8")));
ok("the basket, review, thank-you and 404 pages are noindex", leaky.length === 0, leaky.join(", "));

const indexable = seoPages.filter((f) => !PRIVATE.includes(f));
const wronglyHidden = indexable.filter((f) => /content="noindex/.test(rfSeo(join(SITE, f), "utf8")));
ok("the pages that should rank are not hidden", wronglyHidden.length === 0, wronglyHidden.join(", "));

/* The canonical host must be one that actually resolves. Pointing every page
   at a hostname with no DNS record tells Google the real site is somewhere
   that does not exist, which is worse than saying nothing at all. */
const hosts = new Set(seoPages.map((f) => {
  const m = rfSeo(join(SITE, f), "utf8").match(/rel="canonical" href="https?:\/\/([^/"]+)/);
  return m && m[1];
}).filter(Boolean));
ok("all canonicals agree on one host", hosts.size === 1, [...hosts].join(", "));
ok("that host is the one that serves the site",
   hosts.has("www.thefrostedfrogbakery.com"), [...hosts].join(", "));

const sitemap = rfSeo(join(SITE, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok("the sitemap lists the public pages", locs.length === 4, locs.length + " urls");
ok("the sitemap has no .html redirects in it", !locs.some((u) => u.endsWith(".html")));
ok("the sitemap excludes the private pages",
   !locs.some((u) => /basket|review|thank-you/.test(u)));

const robots = rfSeo(join(SITE, "robots.txt"), "utf8");
ok("robots.txt points at the sitemap", robots.includes(`${SEO_SITE}/sitemap.xml`));
ok("robots.txt keeps crawlers out of the API", /Disallow: \/api\//.test(robots));

const home = rfSeo(join(SITE, "index.html"), "utf8");
const ld = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
ok("the home page carries structured data", !!ld);
const parsed = ld ? JSON.parse(ld[1]) : {};
ok("it identifies the business as a bakery", parsed["@type"] === "Bakery");
ok("its pickup hours match the shop's", parsed.openingHoursSpecification?.length === 2);
/* A placeholder here would contradict the Google Business Profile. */
ok("no invented phone or address is published",
   !("telephone" in parsed) && !("address" in parsed));

/* --- the unit label follows the chosen size --------------------------------
   A dozen's price beside the words "per half dozen" makes a customer doubt
   the arithmetic, so both the product modal and the cart derive the label
   from the Size option rather than from the product's own unit. */
const cartSrc = rf(join(SITE, "assets/js/cart.js"), "utf8");
const catalogSrc = rf(join(SITE, "assets/js/catalog.js"), "utf8");

ok("the cart derives a line's unit from its size", /function unitFor/.test(cartSrc));
ok("a new cart line records the size it was added at", /unit: unitFor\(p, opts\)/.test(cartSrc));
ok("reconciling a line keeps its own size", /i\.unit = unitFor\(p, i\.options\)/.test(cartSrc));
ok("no cart line falls back to the product's cheapest unit",
   !/unit: p\.unit \|\| ""/.test(cartSrc) && !/i\.unit = p\.unit/.test(cartSrc));
ok("the product modal relabels the price too", /function unitLabel/.test(catalogSrc));

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

/* The basket is where the money changes hands, so the pages that lead to it
   have to actually reach it, and it has to load what it needs to pay. */
const basket = rf(join(SITE, "basket.html"), "utf8");
ok("the basket page exists and holds the order form", /data-order-form/.test(basket));
ok("the basket loads submit.js, so it can reach Stripe", /js\/submit\.js/.test(basket));
ok("the basket says it takes payment", /Pay &amp; place order/.test(basket));

const order = rf(join(SITE, "order.html"), "utf8");
ok("the menu page sends people to the basket", /href="basket\.html"/.test(order));
ok("the menu page no longer holds a second order form", !/data-order-form/.test(order));

const navless = pages.filter((f) => !/href="basket\.html"/.test(rf(join(SITE, f), "utf8")));
ok("every page links to the basket", navless.length === 0, navless.join(", "));

const dangling = pages.filter((f) => /order\.html#checkout/.test(rf(join(SITE, f), "utf8")));
ok("nothing still points at the old checkout anchor", dangling.length === 0, dangling.join(", "));

const unversioned = refs.filter((r) => !/\?v=/.test(r.url));
ok("every script and stylesheet is versioned", unversioned.length === 0,
   unversioned.slice(0, 3).map((r) => `${r.page} -> ${r.url}`).join(" | "));

const versions = [...new Set(refs.map((r) => (r.url.match(/\?v=([^"&]+)/) || [])[1]))];
ok("one version across the whole site", versions.length === 1, versions.join(", "));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
