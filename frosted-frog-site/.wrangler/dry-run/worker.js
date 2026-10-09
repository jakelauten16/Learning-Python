var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// assets/js/data.js
var require_data = __commonJS({
  "assets/js/data.js"(exports, module) {
    var SHOP_CONFIG3 = {
      businessName: "The Frosted Frog",
      tagline: "Small-batch cakes, cookies & confections, baked at home for your table.",
      email: "hello@thefrostedfrog.com",
      phone: "(555) 555-0142",
      instagram: "https://instagram.com/thefrostedfrog",
      facebook: "https://facebook.com/thefrostedfrog",
      pickupLocation: "Pickup in Sugar Hill. The exact address comes with your confirmation.",
      cottageNotice: "Made in a home kitchen that is not subject to state inspection. Products may contain, or have come in contact with, wheat, eggs, dairy, soy, peanuts and tree nuts.",
      /* THE WEEKLY RHYTHM --------------------------------------------------------
           Ordering is open Monday through Wednesday. Thursday is shopping day,
           Friday and Saturday are baking and pickup. Customers don't pick an
           arbitrary date, they choose one of that week's two pickup windows.
      
           Days are numbered 0 = Sunday through 6 = Saturday, and times are 24-hour.
        --------------------------------------------------------------------------- */
      schedule: {
        // Days the order form accepts orders, and the hours on those days.
        orderDays: [1, 2, 3],
        // Monday, Tuesday, Wednesday
        orderOpens: "00:00",
        orderCloses: "23:59",
        // The pickup windows for the week that's just been ordered.
        pickups: [
          { day: 5, label: "Friday", start: "15:00", end: "19:00" },
          { day: 6, label: "Saturday", start: "10:00", end: "19:00" }
        ],
        // Customers choose a time inside the window, in increments of this many
        // minutes. Set to 0 to let them take the whole window with no time choice.
        slotMinutes: 30,
        // Leave false. Set to true only while you're previewing the site, it
        // keeps ordering open on days it would normally be closed.
        previewAnyDay: false
      },
      // Local delivery (set enabled:false to hide the option entirely).
      delivery: { enabled: true, fee: 12, radiusMiles: 15, minimum: 45 },
      taxRate: 0.07,
      // 0.07 = 7%. Set to 0 if you don't collect sales tax.
      /* HOW ORDERS REACH YOU -----------------------------------------------------
           No card is taken on the site. An order is a request: it lands in your
           inbox, you confirm it, and you settle up at pickup or with a payment
           request you send yourself. That keeps the site a set of plain files with
           nothing to secure, nothing to renew, and no fees.
      
           orderEndpoint, paste your Formspree form URL here (free tier is fine):
             1. Sign up at formspree.io and create a form.
             2. Copy the endpoint it gives you, https://formspree.io/f/xxxxxxxx
             3. Paste it below, between the quotes.
           Leave it empty and the site falls back to opening the customer's own email
           app with the whole order filled in, addressed to you. That works, but it
           relies on them pressing send, Formspree is the better of the two.
        --------------------------------------------------------------------------- */
      orderEndpoint: "",
      /* PAYMENT MODE -------------------------------------------------------------
         "deposit" - the order is a request. It reaches you by Formspree or email,
                     you confirm it, and you take payment yourself.
         "stripe"  - the customer pays in full by card at checkout before the order
                     is placed. Needs the Cloudflare function in functions/api and
                     your Stripe keys set as environment variables. See README.
      --------------------------------------------------------------------------- */
      paymentMode: "deposit",
      // Where the browser asks the server to build a Stripe Checkout session.
      // Server-side code is the only thing that ever sees a price.
      checkoutEndpoint: "/api/checkout",
      // How people pay once you've confirmed. Shown at checkout and on the FAQ.
      paymentMethods: "Venmo, Cash App, or cash at pickup",
      paymentNote: "Nothing is charged on this site. Once your order is confirmed you'll get a total and a payment request. Settle it any time before pickup day."
    };
    var CATEGORIES = [
      {
        id: "weekly",
        name: "This Week's Special Cookies",
        blurb: "A new batch every week. When they're gone, they're gone until they come round again.",
        image: "assets/img/cookies.svg",
        // Update this line each week, it shows at the top of the menu.
        note: "This week: brown butter pecan, and iced pumpkin spice."
      },
      {
        id: "seasonal",
        name: "Seasonal",
        blurb: "What's good right now, and only right now.",
        image: "assets/img/seasonal.svg"
      },
      {
        id: "mainstays",
        name: "The Mainstays",
        blurb: "On the board every week: cakes, cupcakes, cookies, cake pops and bars.",
        image: "assets/img/cakes.svg"
      },
      {
        id: "requests",
        name: "Special Requests",
        blurb: "Anything that isn't on the board. Tell us what you're planning and we'll quote it.",
        image: "assets/img/custom-order.svg"
      }
    ];
    var PRODUCTS2 = [
      /* ---- This week's special cookies, the top of the menu ---------------- */
      {
        id: "weekly-brown-butter-pecan",
        name: "Brown Butter Pecan",
        group: "weekly",
        kind: "This week only",
        price: 26,
        unit: "per half dozen",
        min: 6,
        desc: "Brown butter dough, toasted pecans, a little flaked salt on top. On the board this week only.",
        image: "assets/img/cookies.svg",
        featured: true
      },
      {
        id: "weekly-iced-pumpkin-spice",
        name: "Iced Pumpkin Spice",
        group: "weekly",
        kind: "This week only",
        price: 26,
        unit: "per half dozen",
        min: 6,
        desc: "Soft pumpkin cookies under a thin brown-sugar icing. Autumn in a cookie tin.",
        image: "assets/img/cookies.svg",
        featured: true
      },
      {
        id: "weekly-bakers-dozen",
        name: "Baker's Choice Dozen",
        group: "weekly",
        kind: "This week only",
        price: 32,
        unit: "per dozen",
        min: 12,
        desc: "A dozen of whatever's best coming out of the oven this week: a little of each special.",
        image: "assets/img/cookies.svg"
      },
      {
        id: "vanilla-bean-layer",
        name: "Vanilla Bean Layer Cake",
        group: "mainstays",
        kind: "Layer cake",
        price: 55,
        unit: "6-inch, serves 8-10",
        desc: "Three layers of vanilla bean cake with silky Swiss meringue buttercream and a hand-piped finish.",
        image: "assets/img/cakes.svg",
        featured: true,
        options: [
          { label: "Size", choices: [
            { name: '6", serves 8-10', price: 0 },
            { name: '8", serves 16-20', price: 25 },
            { name: "Two tier, serves 30+", price: 85 }
          ] },
          { label: "Filling", choices: [
            { name: "Vanilla buttercream", price: 0 },
            { name: "Raspberry preserves", price: 6 },
            { name: "Salted caramel", price: 8 },
            { name: "Lemon curd", price: 8 }
          ] }
        ]
      },
      {
        id: "chocolate-celebration",
        name: "Chocolate Celebration Cake",
        group: "mainstays",
        kind: "Layer cake",
        price: 60,
        unit: "6-inch, serves 8-10",
        desc: "Deep dark chocolate cake, whipped chocolate ganache, and a gold-dusted crown of buttercream.",
        image: "assets/img/cakes.svg",
        featured: true,
        options: [
          { label: "Size", choices: [
            { name: '6", serves 8-10', price: 0 },
            { name: '8", serves 16-20', price: 25 }
          ] }
        ]
      },
      {
        id: "almond-champagne",
        name: "Almond & Champagne Cake",
        group: "mainstays",
        kind: "Layer cake",
        price: 68,
        unit: "6-inch, serves 8-10",
        desc: "Almond cake brushed with champagne syrup, mascarpone buttercream, sugared florals.",
        image: "assets/img/cakes.svg"
      },
      {
        id: "vanilla-cupcakes",
        name: "Classic Vanilla Cupcakes",
        group: "mainstays",
        kind: "Cupcakes",
        price: 30,
        unit: "per dozen",
        min: 6,
        desc: "Buttery vanilla cupcakes swirled high with vanilla bean buttercream and a gold sanding-sugar finish.",
        image: "assets/img/cupcakes.svg",
        featured: true
      },
      {
        id: "lemon-blueberry-cupcakes",
        name: "Lemon Blueberry Cupcakes",
        group: "mainstays",
        kind: "Cupcakes",
        price: 34,
        unit: "per dozen",
        min: 6,
        desc: "Lemon cake folded with blueberries, topped with lemon cream cheese frosting.",
        image: "assets/img/cupcakes.svg"
      },
      {
        id: "brown-butter-chocolate-chip",
        name: "Brown Butter Chocolate Chip",
        group: "mainstays",
        kind: "Cookies",
        price: 24,
        unit: "per dozen",
        min: 6,
        desc: "Thick, soft-centered and freckled with sea salt. The one everybody re-orders.",
        image: "assets/img/cookies.svg"
      },
      {
        id: "iced-sugar-cookies",
        name: "Iced Sugar Cookies",
        group: "mainstays",
        kind: "Cookies",
        price: 42,
        unit: "per dozen",
        min: 12,
        desc: "Hand-iced in your colors for showers, birthdays, holidays, or a monogram for the table.",
        image: "assets/img/cookies.svg",
        featured: true,
        options: [
          { label: "Design", choices: [
            { name: "One or two colors", price: 0 },
            { name: "Detailed, florals, lettering", price: 12 },
            { name: "Custom, send me your theme", price: 20 }
          ] }
        ]
      },
      {
        id: "classic-cake-pops",
        name: "Classic Cake Pops",
        group: "mainstays",
        kind: "Cake pops",
        price: 30,
        unit: "per dozen",
        min: 12,
        desc: "Vanilla or chocolate cake, dipped in candy coating with a drizzle and sprinkle of your choosing.",
        image: "assets/img/cakepops.svg",
        featured: true,
        options: [
          { label: "Flavor", choices: [
            { name: "Vanilla", price: 0 },
            { name: "Chocolate", price: 0 },
            { name: "Half and half", price: 0 }
          ] },
          { label: "Finish", choices: [
            { name: "Drizzle + sprinkles", price: 0 },
            { name: "Gold leaf accents", price: 10 }
          ] }
        ]
      },
      {
        id: "fudge-brownies",
        name: "Salted Fudge Brownies",
        group: "mainstays",
        kind: "Bars",
        price: 26,
        unit: "per dozen",
        min: 6,
        desc: "Dense, glossy-topped and finished with flaked sea salt. Cut thick.",
        image: "assets/img/brownies.svg",
        featured: true
      },
      {
        id: "blondies",
        name: "Brown Sugar Blondies",
        group: "mainstays",
        kind: "Bars",
        price: 24,
        unit: "per dozen",
        min: 6,
        desc: "Chewy brown sugar bars with white chocolate and toasted pecans.",
        image: "assets/img/brownies.svg"
      },
      {
        id: "dessert-box",
        name: "The Frosted Frog Dessert Box",
        group: "seasonal",
        kind: "Dessert box",
        price: 48,
        unit: "serves 6-8",
        desc: "A curated box of the week's best: cookies, brownie bites, cake pops and a little something extra.",
        image: "assets/img/seasonal.svg",
        featured: true
      },
      {
        id: "seasonal-pie-bars",
        name: "Seasonal Pie Bars",
        group: "seasonal",
        kind: "Bars",
        price: 28,
        unit: "per dozen",
        min: 6,
        desc: "Whatever's in season, in a shortbread crust. Ask what's on the board this month.",
        image: "assets/img/seasonal.svg"
      }
    ];
    var TESTIMONIALS = [
      { quote: "The cake was the prettiest thing at the party, and somehow it tasted even better than it looked.", name: "Marissa H.", context: "Birthday cake, June" },
      { quote: "Four dozen iced cookies for a baby shower. Every single one was perfect.", name: "Dana P.", context: "Baby shower, March" },
      { quote: "Easiest pre-order I have ever done, and the cake pops disappeared in ten minutes.", name: "Kelsey R.", context: "Office party, October" }
    ];
    var FAQS = [
      { q: "When can I order?", a: "The order form is open Monday through Wednesday each week. Thursday is shopping day, and everything is baked fresh Friday and Saturday for that week's pickups. If you land here on a Thursday or a weekend, the menu is still here to browse, ordering reopens Monday morning." },
      { q: "When do I pick up?", a: "Friday between 3:00 and 7:00 PM, or Saturday between 10:00 AM and 7:00 PM. You'll choose which one at checkout and lock in a time inside that window." },
      { q: "How do I pay?", a: SHOP_CONFIG3.paymentNote + " We take " + SHOP_CONFIG3.paymentMethods + "." },
      { q: "Where do I pick up?", a: SHOP_CONFIG3.pickupLocation + ". You'll get the address and your pickup time in your confirmation email." },
      { q: "Do you deliver?", a: SHOP_CONFIG3.delivery.enabled ? "Yes, local delivery within " + SHOP_CONFIG3.delivery.radiusMiles + " miles for a flat $" + SHOP_CONFIG3.delivery.fee + " on orders over $" + SHOP_CONFIG3.delivery.minimum + "." : "Pickup only for now." },
      { q: "Can you work around allergies?", a: "I can leave out nuts on most items, but everything is made in one home kitchen, so I can't promise an allergen-free product. " + SHOP_CONFIG3.cottageNotice },
      { q: "What about changes or cancellations?", a: "Changes are welcome until the order window closes Wednesday night. After that the shopping is done and the order is final." }
    ];
    if (typeof module !== "undefined" && module.exports) {
      module.exports = { SHOP_CONFIG: SHOP_CONFIG3, CATEGORIES, PRODUCTS: PRODUCTS2, TESTIMONIALS, FAQS };
    }
  }
});

// assets/js/schedule.js
var require_schedule = __commonJS({
  "assets/js/schedule.js"(exports, module) {
    (function(root2, factory) {
      var api = factory();
      if (typeof module === "object" && module.exports) module.exports = api;
      root2.Schedule = api;
    })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
      "use strict";
      var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      var MS_DAY = 864e5;
      function cfg(config) {
        return (config || (typeof SHOP_CONFIG !== "undefined" ? SHOP_CONFIG : root.SHOP_CONFIG)).schedule;
      }
      __name(cfg, "cfg");
      function minutes(hhmm) {
        var bits = String(hhmm).split(":");
        return parseInt(bits[0], 10) * 60 + parseInt(bits[1] || "0", 10);
      }
      __name(minutes, "minutes");
      function minutesInto(date) {
        return date.getHours() * 60 + date.getMinutes();
      }
      __name(minutesInto, "minutesInto");
      function pad(n) {
        return (n < 10 ? "0" : "") + n;
      }
      __name(pad, "pad");
      function iso(d) {
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      }
      __name(iso, "iso");
      function fromISO(str) {
        var p = String(str).split("-");
        return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
      }
      __name(fromISO, "fromISO");
      function startOfDay(d) {
        var c = new Date(d.getTime());
        c.setHours(0, 0, 0, 0);
        return c;
      }
      __name(startOfDay, "startOfDay");
      function addDays(d, n) {
        var c = new Date(d.getTime());
        c.setDate(c.getDate() + n);
        return c;
      }
      __name(addDays, "addDays");
      function time12(hhmm) {
        var m = minutes(hhmm);
        var h = Math.floor(m / 60);
        var suffix = h >= 12 ? "PM" : "AM";
        var hour = h % 12 === 0 ? 12 : h % 12;
        return hour + ":" + pad(m % 60) + " " + suffix;
      }
      __name(time12, "time12");
      function windowLabel(pickup) {
        return time12(pickup.start) + " to " + time12(pickup.end);
      }
      __name(windowLabel, "windowLabel");
      function isOrderingOpen(now, config) {
        var s = cfg(config);
        now = now || /* @__PURE__ */ new Date();
        if (s.previewAnyDay) return true;
        if (s.orderDays.indexOf(now.getDay()) === -1) return false;
        var m = minutesInto(now);
        return m >= minutes(s.orderOpens) && m <= minutes(s.orderCloses);
      }
      __name(isOrderingOpen, "isOrderingOpen");
      function windowMonday(now, config) {
        var s = cfg(config);
        var today = startOfDay(now || /* @__PURE__ */ new Date());
        var dow = today.getDay();
        var thisMonday = addDays(today, dow === 0 ? -6 : 1 - dow);
        if (s.orderDays.indexOf(dow) !== -1) return thisMonday;
        if (s.previewAnyDay) {
          var lastEnd = s.pickups.reduce(function(latest, p) {
            var d = pickupDate(thisMonday, p);
            d.setHours(Math.floor(minutes(p.end) / 60), minutes(p.end) % 60, 0, 0);
            return d > latest ? d : latest;
          }, /* @__PURE__ */ new Date(0));
          if (lastEnd > (now || /* @__PURE__ */ new Date())) return thisMonday;
        }
        return addDays(thisMonday, 7);
      }
      __name(windowMonday, "windowMonday");
      function pickupDate(monday, pickup) {
        return addDays(monday, (pickup.day + 6) % 7);
      }
      __name(pickupDate, "pickupDate");
      function slotsFor(pickup, config) {
        var s = cfg(config);
        if (!s.slotMinutes) return [];
        var out = [];
        for (var m = minutes(pickup.start); m + s.slotMinutes <= minutes(pickup.end); m += s.slotMinutes) {
          out.push(time12(pad(Math.floor(m / 60)) + ":" + pad(m % 60)));
        }
        return out;
      }
      __name(slotsFor, "slotsFor");
      function pickupOptions(now, config) {
        var s = cfg(config);
        var monday = windowMonday(now, config);
        return s.pickups.map(function(p) {
          var date = pickupDate(monday, p);
          return {
            day: p.day,
            label: p.label || DAY_NAMES[p.day],
            date: iso(date),
            pretty: date.toLocaleDateString(void 0, { weekday: "long", month: "long", day: "numeric" }),
            shortDate: date.toLocaleDateString(void 0, { month: "short", day: "numeric" }),
            start: p.start,
            end: p.end,
            window: windowLabel(p),
            slots: slotsFor(p, config)
          };
        });
      }
      __name(pickupOptions, "pickupOptions");
      function ordersClose(now, config) {
        var s = cfg(config);
        var today = startOfDay(now || /* @__PURE__ */ new Date());
        var lastDay = s.orderDays[s.orderDays.length - 1];
        var monday = windowMonday(now, config);
        var close = addDays(monday, (lastDay + 6) % 7);
        close.setHours(Math.floor(minutes(s.orderCloses) / 60), minutes(s.orderCloses) % 60, 0, 0);
        return close;
      }
      __name(ordersClose, "ordersClose");
      function ordersOpen(now, config) {
        var s = cfg(config);
        var monday = windowMonday(now, config);
        monday.setHours(Math.floor(minutes(s.orderOpens) / 60), minutes(s.orderOpens) % 60, 0, 0);
        return monday;
      }
      __name(ordersOpen, "ordersOpen");
      function isValidPickup(dateStr, timeStr, now, config) {
        var options = pickupOptions(now, config);
        var match = options.filter(function(o) {
          return o.date === dateStr;
        })[0];
        if (!match) return false;
        if (!match.slots.length) return true;
        return match.slots.indexOf(timeStr) !== -1;
      }
      __name(isValidPickup, "isValidPickup");
      function summary(config) {
        var s = cfg(config);
        var days = s.orderDays.map(function(d) {
          return DAY_NAMES[d];
        });
        return "Order " + days[0] + "-" + days[days.length - 1] + " \xB7 Pick up " + s.pickups.map(function(p) {
          return (p.label || DAY_NAMES[p.day]) + " " + windowLabel(p);
        }).join(" or ");
      }
      __name(summary, "summary");
      return {
        isOrderingOpen,
        pickupOptions,
        ordersClose,
        ordersOpen,
        isValidPickup,
        summary,
        windowLabel,
        time12,
        iso,
        fromISO,
        dayNames: DAY_NAMES
      };
    });
  }
});

// functions/_lib/order.js
var import_data = __toESM(require_data());
var import_schedule = __toESM(require_schedule());
var { SHOP_CONFIG: SHOP_CONFIG2, PRODUCTS } = import_data.default;
var MAX_LINES = 40;
var MAX_QTY = 500;
function cents(dollars) {
  return Math.round(Number(dollars) * 100);
}
__name(cents, "cents");
function money(amount) {
  return "$" + Number(amount).toFixed(2);
}
__name(money, "money");
function resolveOptions(product, chosen) {
  const picked = [];
  let extra = 0;
  for (const group of product.options || []) {
    const wanted = chosen && typeof chosen === "object" ? chosen[group.label] : void 0;
    const match = group.choices.find((c) => c.name === wanted);
    if (wanted !== void 0 && !match) {
      return { error: `"${wanted}" is not an option for ${product.name}` };
    }
    const choice = match || group.choices[0];
    extra += choice.price || 0;
    picked.push(`${group.label}: ${choice.name}`);
  }
  return { picked, extra };
}
__name(resolveOptions, "resolveOptions");
function priceOrder(body, now = /* @__PURE__ */ new Date()) {
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return { error: "Your order is empty" };
  if (items.length > MAX_LINES) return { error: "That is more lines than we can take in one order" };
  if (!import_schedule.default.isOrderingOpen(now, SHOP_CONFIG2)) {
    return { error: "Ordering is closed. The order book opens again Monday.", status: 409 };
  }
  if (!body?.date || !body?.window) return { error: "Choose a pickup day and time" };
  if (!import_schedule.default.isValidPickup(body.date, body.window, now, SHOP_CONFIG2)) {
    return { error: "That is not one of this week's pickup times" };
  }
  const customer = body.customer || {};
  const name = String(customer.name || "").trim().slice(0, 120);
  const email = String(customer.email || "").trim().slice(0, 160);
  const phone = String(customer.phone || "").trim().slice(0, 40);
  if (!name) return { error: "We need a name for the order" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address does not look right" };
  if (!phone) return { error: "We need a phone number in case we have a question" };
  const delivery = body.fulfillment === "delivery" && SHOP_CONFIG2.delivery.enabled;
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
      description: [options.picked.join(" / "), String(item.note || "").trim().slice(0, 200)].filter(Boolean).join(" / ").slice(0, 280) || void 0,
      unit,
      qty: asked,
      note: String(item.note || "").trim().slice(0, 200),
      options: options.picked
    });
  }
  if (delivery && subtotal < SHOP_CONFIG2.delivery.minimum) {
    return { error: `Delivery starts at ${money(SHOP_CONFIG2.delivery.minimum)}` };
  }
  const deliveryFee = delivery ? SHOP_CONFIG2.delivery.fee : 0;
  const tax = Math.round((subtotal + deliveryFee) * (SHOP_CONFIG2.taxRate || 0) * 100) / 100;
  const total = subtotal + deliveryFee + tax;
  return {
    lines,
    totals: { subtotal, delivery: deliveryFee, tax, total },
    fulfillment: delivery ? "delivery" : "pickup",
    date: body.date,
    window: body.window,
    customer: {
      name,
      email,
      phone,
      address,
      occasion: String(customer.occasion || "").trim().slice(0, 120),
      notes: String(customer.notes || "").trim().slice(0, 400)
    }
  };
}
__name(priceOrder, "priceOrder");
function formEncode(value, prefix = "", out = new URLSearchParams()) {
  if (value === void 0 || value === null) return out;
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
__name(formEncode, "formEncode");
async function stripeFetch(secret, path, { method = "POST", params, idempotencyKey } = {}) {
  const headers = {
    Authorization: `Bearer ${secret}`,
    "Stripe-Version": "2026-08-26.dahlia"
  };
  if (params) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers,
    body: params ? formEncode(params).toString() : void 0
  });
  const payload = await response.json();
  if (!response.ok) {
    const reason = payload?.error?.message || "Stripe refused the request";
    throw new Error(reason);
  }
  return payload;
}
__name(stripeFetch, "stripeFetch");
async function verifyStripeSignature(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  if (!signatureHeader || !secret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((pair) => pair.split("=").map((s) => s.trim()))
  );
  const timestamp = Number.parseInt(parts.t, 10);
  const sent = parts.v1;
  if (!Number.isFinite(timestamp) || !sent) return false;
  if (Math.abs(Math.floor(Date.now() / 1e3) - timestamp) > toleranceSeconds) return false;
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
__name(verifyStripeSignature, "verifyStripeSignature");
async function notifyBaker(endpoint, payload) {
  if (!endpoint) return { sent: false, reason: "no order endpoint configured" };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  return { sent: response.ok, status: response.status };
}
__name(notifyBaker, "notifyBaker");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(json, "json");

// functions/api/checkout.js
var MAX_BODY_BYTES = 32 * 1024;
async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Card payment is not switched on yet" }, 503);
  }
  const origin = env.SITE_URL || new URL(request.url).origin;
  const sender = request.headers.get("Origin");
  if (sender && sender !== origin && sender !== new URL(request.url).origin) {
    return json({ error: "Bad request" }, 403);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "That order is too large" }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const order = priceOrder(body);
  if (order.error) return json({ error: order.error }, order.status || 400);
  const reference = crypto.randomUUID().slice(0, 18);
  const line_items = order.lines.map((line) => ({
    quantity: line.qty,
    price_data: {
      currency: "usd",
      unit_amount: cents(line.unit),
      product_data: { name: line.name, description: line.description }
    }
  }));
  if (order.totals.delivery) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cents(order.totals.delivery),
        product_data: { name: "Local delivery" }
      }
    });
  }
  if (order.totals.tax) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cents(order.totals.tax),
        product_data: { name: "Sales tax" }
      }
    });
  }
  const items = order.lines.map((l) => `${l.qty}x ${l.name}${l.options.length ? ` (${l.options.join("; ")})` : ""}`).join(" | ").slice(0, 480);
  try {
    const session = await stripeFetch(env.STRIPE_SECRET_KEY, "checkout/sessions", {
      idempotencyKey: reference,
      params: {
        /* ---- Configured in Checkout Studio. Change them there, not here. ---- */
        ui_mode: "hosted_page",
        billing_address_collection: "auto",
        phone_number_collection: { enabled: true },
        automatic_tax: { enabled: false },
        allow_promotion_codes: false,
        submit_type: "pay",
        name_collection: {
          individual: { enabled: true, optional: true },
          business: { enabled: true, optional: true }
        },
        saved_payment_method_options: { payment_method_save: "enabled" },
        integration_identifier: "hosted_web_0001",
        origin_context: "web",
        /* ---- This bakery's own values ---- */
        mode: "payment",
        line_items,
        success_url: `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/order.html`,
        /* ---- Carried through to fulfilment. The webhook builds the paid
           order email out of this metadata, so none of it is decoration. ---- */
        customer_email: order.customer.email,
        client_reference_id: reference,
        payment_intent_data: {
          description: `The Frosted Frog order ${reference}`
        },
        metadata: {
          reference,
          fulfillment: order.fulfillment,
          pickup_date: order.date,
          pickup_time: order.window,
          customer_name: order.customer.name,
          customer_phone: order.customer.phone,
          address: order.customer.address,
          occasion: order.customer.occasion,
          notes: order.customer.notes.slice(0, 480),
          items,
          subtotal: money(order.totals.subtotal),
          delivery: money(order.totals.delivery),
          tax: money(order.totals.tax),
          total: money(order.totals.total)
        }
      }
    });
    return json({ url: session.url, reference });
  } catch (error) {
    console.error("checkout session failed", error.message);
    return json({ error: "We could not reach the payment page. Please try again." }, 502);
  }
}
__name(onRequestPost, "onRequestPost");

// functions/api/stripe-webhook.js
async function onRequestPost2({ request, env }) {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("webhook called with no STRIPE_WEBHOOK_SECRET set");
    return json({ error: "Not configured" }, 503);
  }
  const raw = await request.text();
  const signature = request.headers.get("Stripe-Signature");
  if (!await verifyStripeSignature(raw, signature, secret)) {
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
    "checkout.session.async_payment_failed"
  ];
  if (!handled.includes(event.type)) {
    return json({ received: true, ignored: event.type });
  }
  const session = event.data?.object || {};
  if (event.type === "checkout.session.async_payment_failed") {
    const failedRef = session.metadata?.reference || session.client_reference_id || session.id;
    await notifyBaker(env.ORDER_ENDPOINT || SHOP_CONFIG2.orderEndpoint, {
      _subject: `Payment FAILED for order ${failedRef}`,
      status: "PAYMENT FAILED",
      reference: failedRef,
      order: `The payment for order ${failedRef} did not go through, so there is nothing to bake.
Name: ${session.metadata?.customer_name || ""}
Pickup was: ${session.metadata?.pickup_date || ""} at ${session.metadata?.pickup_time || ""}`
    });
    return json({ received: true, failed: failedRef });
  }
  if (session.payment_status === "unpaid") {
    return json({ received: true, pending: true });
  }
  const meta = session.metadata || {};
  const reference = meta.reference || session.client_reference_id || session.id;
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
    meta.notes ? `
Notes: ${meta.notes}` : ""
  ].filter(Boolean).join("\n");
  const result = await notifyBaker(env.ORDER_ENDPOINT || SHOP_CONFIG2.orderEndpoint, {
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
    order: body
  });
  if (!result.sent) {
    console.error("paid order email failed", reference, result);
    return json({ error: "Could not deliver the order email" }, 500);
  }
  if (env.ORDERS) {
    await env.ORDERS.put(`paid:${reference}`, (/* @__PURE__ */ new Date()).toISOString(), { expirationTtl: 60 * 60 * 24 * 90 });
  }
  console.log("paid order", reference, `$${paidAmount}`);
  return json({ received: true, reference });
}
__name(onRequestPost2, "onRequestPost");

// functions/api/session.js
async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: "Bad request" }, 400);
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Card payment is not switched on" }, 503);
  try {
    const session = await stripeFetch(env.STRIPE_SECRET_KEY, `checkout/sessions/${id}`, { method: "GET" });
    const meta = session.metadata || {};
    return json({
      paid: session.payment_status === "paid",
      reference: meta.reference || session.client_reference_id || "",
      total: (session.amount_total || 0) / 100,
      currency: session.currency || "usd",
      email: session.customer_details?.email || "",
      pickup: { date: meta.pickup_date || "", time: meta.pickup_time || "" },
      fulfillment: meta.fulfillment || "pickup",
      items: meta.items || ""
    });
  } catch (error) {
    console.error("session lookup failed", error.message);
    return json({ error: "We could not look that order up" }, 502);
  }
}
__name(onRequestGet, "onRequestGet");

// functions/api/health.js
function onRequestGet2({ env }) {
  return json({
    ok: true,
    products: PRODUCTS.length,
    paymentMode: SHOP_CONFIG2.paymentMode,
    stripeKeySet: Boolean(env.STRIPE_SECRET_KEY),
    webhookSecretSet: Boolean(env.STRIPE_WEBHOOK_SECRET),
    orderEndpointSet: Boolean(env.ORDER_ENDPOINT || SHOP_CONFIG2.orderEndpoint)
  });
}
__name(onRequestGet2, "onRequestGet");

// src/worker.js
var ROUTES = {
  "/api/checkout": { POST: onRequestPost },
  "/api/stripe-webhook": { POST: onRequestPost2 },
  "/api/session": { GET: onRequestGet },
  "/api/health": { GET: onRequestGet2 }
};
function json2(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
__name(json2, "json");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const route = ROUTES[url.pathname];
    if (!route) {
      return env.ASSETS.fetch(request);
    }
    const handler = route[request.method];
    if (!handler) {
      return json2({ error: "Method not allowed" }, 405);
    }
    try {
      return await handler({ request, env, ctx, waitUntil: ctx.waitUntil.bind(ctx) });
    } catch (error) {
      console.error(url.pathname, error && error.message);
      return json2({ error: "Something went wrong at our end" }, 500);
    }
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
