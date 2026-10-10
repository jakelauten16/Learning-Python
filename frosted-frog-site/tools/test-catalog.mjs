/* The product modal, exercised through a minimal DOM.

   One modal node is reused for every product, so anything bound per open
   accumulates. That once left a stale listener behind on each open: a single
   click on "Add to order" then ran all of them, adding the item several times
   and adding whichever product an earlier listener had captured. It showed up
   as a wrong price in the basket, which is the worst place for it.

   These tests open the modal repeatedly and assert that one click is one add. */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = require(SITE + "/assets/js/data.js");

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
};

/* ---- the smallest DOM that catalog.js will run against ------------------- */
const SHARED = {};
const HOST = { node: null };

function el(tag) {
  const e = {
    tag, handlers: [], _html: "", className: "", style: {}, children: [],
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => "0",
    appendChild(c) { e.children.push(c); },
    addEventListener(t, fn) { e.handlers.push({ t, fn }); },
    removeEventListener() {}, remove() {}, focus() {},
    set innerHTML(v) { e._html = v; }, get innerHTML() { return e._html; },
    /* One registry, so a lookup from the host and from inside the modal find
       the same node, as they would in a real document. */
    querySelector: (sel) => SHARED[sel] || (SHARED[sel] = el("stub")),
    querySelectorAll: () => [],
    closest: () => null,
  };
  return e;
}

SHARED["#m-qty"] = Object.assign(el("input"), { value: "1" });
SHARED["#m-note"] = Object.assign(el("textarea"), { value: "" });
SHARED["[data-modal-price]"] = el("p");
SHARED[".modal"] = el("modal");

const docHandlers = [];
globalThis.document = {
  createElement: () => (HOST.node = el("host")),
  body: el("body"),
  addEventListener: (t, fn) => docHandlers.push({ t, fn }),
  querySelector: () => null,
  querySelectorAll: () => [],
};

const added = [];
globalThis.window = {
  Cart: { add: (...a) => added.push(a), open() {} },
  observeReveals: null,
  pageHref: (p) => p,
};
Object.assign(globalThis, catalog, { Cart: globalThis.window.Cart });

require(SITE + "/assets/js/catalog.js");

/* ---- helpers to drive it ------------------------------------------------- */
const openProduct = (id) => {
  const ev = {
    preventDefault() {},
    target: { closest: (s) => (s === "[data-product]" ? { getAttribute: () => id } : null) },
  };
  docHandlers.filter((h) => h.t === "click").forEach((h) => h.fn(ev));
};

const fire = (selector, attrs = {}) => {
  const ev = { target: { closest: (s) => (s === selector ? { getAttribute: (k) => attrs[k], parentNode: attrs.parentNode } : null) } };
  HOST.node.handlers.filter((h) => h.t === "click").forEach((h) => h.fn(ev));
};

const clickAdd = () => fire("[data-add]");
const priceText = () => SHARED["[data-modal-price]"].innerHTML;

const WEEKLY = "cupcake-week-cookies-and-cream";
const weekly = catalog.PRODUCTS.find((p) => p.id === WEEKLY);

/* ---- 1. one modal, one listener ----------------------------------------- */
openProduct(WEEKLY);
const afterFirst = HOST.node.handlers.length;
openProduct(WEEKLY);
openProduct(WEEKLY);
ok("opening the modal repeatedly binds no extra listeners",
   HOST.node.handlers.length === afterFirst, `${afterFirst} then ${HOST.node.handlers.length}`);

/* ---- 2. one click is one add -------------------------------------------- */
added.length = 0;
clickAdd();
ok("one click on Add to order adds the item once", added.length === 1, `${added.length} call(s)`);
ok("it adds the product that is on screen", added[0] && added[0][0] === WEEKLY);
ok("at the quantity in the box", added[0] && added[0][1] === 1);

/* ---- 3. the size that was never touched is the cheapest one ------------- */
const opts = added[0][2];
ok("an untouched Size defaults to the half dozen",
   opts.Size && opts.Size.name === "Half dozen", opts.Size && opts.Size.name);
ok("so it costs nothing extra", (opts.Size.price || 0) === 0);
ok("which is the catalog's half dozen price", weekly.price === 5, `$${weekly.price}`);

/* ---- 4. the price line names the size on open --------------------------- */
openProduct(WEEKLY);
ok("the modal opens showing the half dozen price", priceText().includes("$5.00"), priceText());
ok("and labels it per half dozen", /per half dozen/.test(priceText()));

/* ---- 5. a stale product cannot ride along ------------------------------- */
openProduct("cupcake-seasonal-pumpkin-spice");
openProduct(WEEKLY);
added.length = 0;
clickAdd();
ok("viewing another product first does not add it too", added.length === 1, `${added.length} call(s)`);
ok("only the product last opened is added", added[0][0] === WEEKLY, added[0][0]);

/* ---- 6. the renamed field and the dozen-only floral --------------------- */
openProduct(WEEKLY);
const modalHTML = SHARED[".modal"].innerHTML || HOST.node.innerHTML;
ok("the notes field is called Special messages", /Special messages/.test(modalHTML));
ok("it is no longer called notes for the baker", !/Notes for the baker/i.test(modalHTML));

openProduct("cupcake-floral");
const floralHTML = SHARED[".modal"].innerHTML || HOST.node.innerHTML;
ok("floral offers no size to choose", !/Half dozen/.test(floralHTML));
ok("floral still offers an icing colour", /Icing colour/.test(floralHTML));
ok("floral is priced by the dozen", /per dozen/.test(priceText()), priceText());
ok("floral is $10", priceText().includes("$10.00"), priceText());

openProduct("cupcake-vanilla");
const vanillaHTML = SHARED[".modal"].innerHTML || HOST.node.innerHTML;
ok("vanilla offers a frosting choice", /Frosting/.test(vanillaHTML));
ok("with both buttercreams", /Vanilla buttercream/.test(vanillaHTML) && /Chocolate buttercream/.test(vanillaHTML));
ok("and still offers both sizes", /Half dozen/.test(vanillaHTML) && /Dozen/.test(vanillaHTML));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
