#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   Builds the whole site into one self-contained HTML file for previewing.

     node demo/build.js

   Every page becomes a section of one document, links become #/routes, and
   the CSS, JavaScript and images are inlined — so the result works from a
   file, an email attachment, or a hosted preview link with nothing else
   alongside it. The real site in this folder is what ships; this is only a
   way to look at it.
   --------------------------------------------------------------------------- */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PAGES = [
  { id: "index", file: "index.html", label: "Home" },
  { id: "shop", file: "shop.html", label: "The Bakery" },
  { id: "order", file: "order.html", label: "Pre-Order" },
  { id: "about", file: "about.html", label: "About & FAQ" },
  { id: "thank-you", file: "thank-you.html", label: "Thank you" },
];
const SCRIPTS = ["data.js", "schedule.js", "cart.js", "site.js", "catalog.js", "checkout.js"];

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

function between(html, startRe, endRe) {
  const start = html.search(startRe);
  const end = html.search(endRe);
  if (start === -1 || end === -1) throw new Error("Couldn't find the page body");
  return html.slice(start, end);
}

/* assets/img/x.svg → a data: URI, so the file stands alone. */
function dataURI(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  const type = rel.endsWith(".svg") ? "image/svg+xml"
    : rel.endsWith(".webp") ? "image/webp"
    : rel.endsWith(".png") ? "image/png" : "image/jpeg";
  if (type === "image/svg+xml") {
    return "data:image/svg+xml," + encodeURIComponent(buf.toString("utf8")).replace(/'/g, "%27");
  }
  return `data:${type};base64,${buf.toString("base64")}`;
}

function inlineImages(text) {
  return text.replace(/assets\/img\/[A-Za-z0-9._-]+/g, (rel) => {
    try { return dataURI(rel); } catch (e) { return rel; }
  });
}

/* index.html → #/index, and shop.html#cookies → #/shop:cookies */
function rewriteLinks(text) {
  PAGES.forEach((p) => {
    text = text
      .replace(new RegExp(`href="${p.file}#([a-z-]+)"`, "g"), `href="#/${p.id}:$1"`)
      .replace(new RegExp(`href="${p.file}"`, "g"), `href="#/${p.id}"`);
  });
  return text;
}

const indexHTML = read("index.html");
const header = between(indexHTML, /<header class="site-header">/, /<main>/);
const footer = between(indexHTML, /<footer class="site-footer">/, /<script src=/).trim();

/* The thank-you page's inline script has to be re-runnable, because the
   router lands on it after checkout — so its IIFE becomes a named function
   the router calls. */
function makeRerunnable(body) {
  const open = body.lastIndexOf("<script>");
  const close = body.lastIndexOf("</script>");
  if (open === -1 || close === -1) return body;
  let inner = body.slice(open + "<script>".length, close).trim();
  inner = inner.replace(/^\(function \(\) \{/, "").replace(/\}\)\(\);$/, "").trim();
  return body.slice(0, open) +
    "<script>window.__demoReceipt = function () {\n" + inner + "\n};</script>" +
    body.slice(close + "</script>".length);
}

const sections = PAGES.map((p) => {
  const html = read(p.file);
  let body = between(html, /<main>/, /<footer class="site-footer">/);
  if (p.id === "thank-you") body = makeRerunnable(body);
  return `<div class="demo-page" id="page-${p.id}" data-page="${p.id}" hidden>\n${body}\n</div>`;
}).join("\n\n");

const css = read("assets/css/site.css");
const js = SCRIPTS.map((f) => `/* ---- ${f} ---- */\n${read("assets/js/" + f)}`).join("\n\n");

const demoCSS = `
/* ---- demo shell (not part of the real site) ---- */
.demo-bar {
  position: fixed; left: 50%; bottom: 1.1rem; transform: translateX(-50%); z-index: 300;
  display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; justify-content: center;
  background: rgba(27, 59, 44, .96); color: #FBF8F1; padding: .6rem .9rem;
  border-radius: 999px; box-shadow: 0 18px 44px rgba(27, 59, 44, .3);
  font-family: var(--font-body); font-size: .72rem; letter-spacing: .1em; text-transform: uppercase;
  max-width: 94vw;
}
.demo-bar b { font-weight: 400; color: #E8D9AE; letter-spacing: .24em; }
.demo-bar select {
  background: transparent; color: #FBF8F1; border: 1px solid rgba(232, 217, 174, .45);
  border-radius: 999px; padding: .35rem .7rem; font-family: inherit; font-size: .72rem;
}
.demo-bar select option { color: #23301F; }
.demo-bar button {
  background: transparent; border: 1px solid rgba(232, 217, 174, .45); color: #FBF8F1;
  border-radius: 999px; padding: .35rem .8rem; cursor: pointer; font-family: inherit;
  font-size: .72rem; letter-spacing: .1em; text-transform: uppercase;
}
.demo-bar button:hover { background: rgba(232, 217, 174, .2); }
.demo-page[hidden] { display: none; }
body { padding-bottom: 4.5rem; }
`;

const demoJS = `
/* ---- demo shell: hash routing + a day switcher (not part of the real site) ---- */
(function () {
  var PAGES = ${JSON.stringify(PAGES.map((p) => p.id))};

  function currentRoute() {
    var raw = (location.hash || "#/index").replace(/^#\\//, "");
    var bits = raw.split(":");
    var id = PAGES.indexOf(bits[0]) === -1 ? "index" : bits[0];
    return { id: id, extra: bits[1] || "" };
  }

  function show(route) {
    PAGES.forEach(function (id) {
      var el = document.getElementById("page-" + id);
      if (el) el.hidden = id !== route.id;
    });
    Array.prototype.forEach.call(document.querySelectorAll(".nav__links a"), function (a) {
      var target = (a.getAttribute("href") || "").replace("#/", "").split(":")[0];
      if (target === route.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    var links = document.querySelector(".nav__links");
    if (links) links.classList.remove("is-open");
    if (window.Cart) Cart.close();
    var modal = document.querySelector(".modal-backdrop.is-open");
    if (modal) modal.classList.remove("is-open");
    document.body.style.overflow = "";
    window.scrollTo(0, 0);
    if (window.observeReveals) window.observeReveals(document.getElementById("page-" + route.id));
    if (route.extra) {
      window.dispatchEvent(new CustomEvent("demo:filter", { detail: route.extra }));
    }
    if (route.id === "thank-you" && window.__demoReceipt) window.__demoReceipt();
  }

  window.addEventListener("hashchange", function () { show(currentRoute()); });
  document.addEventListener("DOMContentLoaded", function () { show(currentRoute()); });

  /* Pretend it's another day, so every state can be seen on any day. */
  var DAYS = [
    { v: "", label: "Real day" },
    { v: "1", label: "Monday — open" },
    { v: "3", label: "Wednesday — open" },
    { v: "4", label: "Thursday — closed" },
    { v: "6", label: "Saturday — closed" },
  ];

  var pick = sessionStorage.getItem("demoDay") || "";
  if (pick !== "") {
    var target = parseInt(pick, 10);
    var fake = new Date();
    fake.setHours(12, 0, 0, 0);
    fake.setDate(fake.getDate() + ((target - fake.getDay() + 7) % 7));
    ["isOrderingOpen", "pickupOptions", "ordersClose", "ordersOpen"].forEach(function (fn) {
      var original = Schedule[fn];
      Schedule[fn] = function (now, config) { return original(now || fake, config); };
    });
    var validate = Schedule.isValidPickup;
    Schedule.isValidPickup = function (d, t, now, config) { return validate(d, t, now || fake, config); };
  }

  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.createElement("div");
    bar.className = "demo-bar";
    bar.innerHTML = "<b>Demo</b>" +
      "<select aria-label='Preview a different day'>" +
        DAYS.map(function (d) {
          return "<option value='" + d.v + "'" + (d.v === pick ? " selected" : "") + ">" + d.label + "</option>";
        }).join("") +
      "</select>" +
      "<button type='button' data-demo-reset>Empty the cart</button>";
    document.body.appendChild(bar);

    bar.querySelector("select").addEventListener("change", function (e) {
      sessionStorage.setItem("demoDay", e.target.value);
      location.reload();
    });
    bar.querySelector("[data-demo-reset]").addEventListener("click", function () {
      Cart.clear();
      Cart.toast("Cart emptied");
    });
  });
})();
`;

/* No <html>/<head>/<body> wrapper: the file renders on its own from disk and
   can also be published to a preview host that supplies the skeleton. */
let out = `<meta charset="utf-8">
<title>The Frosted Frog Preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Jost:wght@300;400;500&family=Parisienne&display=swap" rel="stylesheet">
<style>
${css}
${demoCSS}
</style>
<div class="progress" aria-hidden="true"></div>
${header}
${sections}
${footer}
<script>window.FROSTED_DEMO = true;</script>
<script>
${js}
</script>
<script>
${demoJS}
</script>
`;

out = inlineImages(rewriteLinks(out));

const dest = path.join(__dirname, "frosted-frog-demo.html");
fs.writeFileSync(dest, out);
console.log("Built " + path.relative(ROOT, dest) + " — " + (out.length / 1024).toFixed(0) + " KB");
