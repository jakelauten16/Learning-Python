/* ---------------------------------------------------------------------------
   The Frosted Frog, everything you'll edit week to week lives in this file.

   SHOP_CONFIG  → business details, the weekly schedule, payment mode
   CATEGORIES   → the sections on the shop page and the home-page showcase
   PRODUCTS     → this week's menu
   --------------------------------------------------------------------------- */

const SHOP_CONFIG = {
  businessName: "The Frosted Frog",
  tagline: "Small-batch cupcakes, baked at home for your table.",
  email: "hello@thefrostedfrog.com",
  phone: "(555) 555-0142",
  instagram: "https://instagram.com/thefrostedfrog",
  facebook: "https://facebook.com/thefrostedfrog",
  pickupLocation: "Pickup in Sugar Hill. The exact address comes with your confirmation.",
  cottageNotice:
    "Made in a home kitchen that is not subject to state inspection. Products may contain, or have come in contact with, wheat, eggs, dairy, soy, peanuts and tree nuts.",

  /* THE WEEKLY RHYTHM --------------------------------------------------------
     Ordering is open Monday through Wednesday. Thursday is shopping day,
     Friday and Saturday are baking and pickup. Customers don't pick an
     arbitrary date, they choose one of that week's two pickup windows.

     Days are numbered 0 = Sunday through 6 = Saturday, and times are 24-hour.
  --------------------------------------------------------------------------- */
  schedule: {
    // Days the order form accepts orders, and the hours on those days.
    orderDays: [1, 2, 3],          // Monday, Tuesday, Wednesday
    orderOpens: "00:00",
    orderCloses: "23:59",

    // The pickup windows for the week that's just been ordered.
    pickups: [
      { day: 5, label: "Friday",   start: "12:00", end: "19:00" },
      { day: 6, label: "Saturday", start: "08:00", end: "19:00" },
    ],

    // Customers choose a time inside the window, in increments of this many
    // minutes. Set to 0 to let them take the whole window with no time choice.
    slotMinutes: 30,

    // Leave false. Set to true only while you're previewing the site, it
    // keeps ordering open on days it would normally be closed, for everyone
    // who can find the site and not just for you.
    previewAnyDay: false,
  },

  /* Pickup only. Everything is collected at one of the two windows above.
     Setting enabled back to true would restore the delivery option, the fee
     line and the address field everywhere they appear; the fee and radius
     below are kept so that switch stays a one-word change. */
  delivery: { enabled: false, fee: 12, radiusMiles: 15, minimum: 45 },

  /* No sales tax is charged. Some items are exempt, so until the right rate
     per item is settled, everything is treated as exempt and the price on
     screen is exactly what the customer pays. 0.07 would be 7%. */
  taxRate: 0,

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
  orderEndpoint: "https://formspree.io/f/meaekzlq",

  /* PAYMENT MODE -------------------------------------------------------------
     "deposit" - the order is a request. It reaches you by Formspree or email,
                 you confirm it, and you take payment yourself.
     "stripe"  - the customer pays in full by card at checkout before the order
                 is placed. Needs the Cloudflare function in functions/api and
                 your Stripe keys set as environment variables. See README.
  --------------------------------------------------------------------------- */
  paymentMode: "stripe",

  // Where the browser asks the server to build a Stripe Checkout session.
  // Server-side code is the only thing that ever sees a price.
  checkoutEndpoint: "/api/checkout",

  // How people pay once you've confirmed. Shown at checkout and on the FAQ.
  paymentMethods: "Venmo, Cash App, or cash at pickup",
  paymentNote:
    "Nothing is charged on this site. Once your order is confirmed you'll get " +
    "a total and a payment request. Settle it any time before pickup day.",
};

/* The menu is laid out in this order, top to bottom. Move a block here and the
   section moves on the page. `id` is what a product's `group` points at. */
const CATEGORIES = [
  {
    id: "weekly",
    name: "Cupcake of the Week",
    blurb: "One flavour, on the board for this week only. When it's gone it's gone until it comes round again.",
    image: "assets/img/cupcakes.svg",
    // Update this line each week, it shows at the top of the menu.
    note: "This week: cookies and cream.",
  },
  {
    id: "seasonal",
    name: "Seasonal",
    blurb: "What's good right now, and only right now.",
    image: "assets/img/seasonal.svg",
  },
  {
    id: "standard",
    name: "Standard Cupcakes",
    blurb: "The everyday four, plus a variety pack when you can't choose. Every one baked to order.",
    image: "assets/img/cupcakes.svg",
  },
  {
    id: "floral",
    name: "Floral Cupcakes",
    blurb: "Piped buttercream flowers, in the colours you choose. Order them as a box, or arranged as a bouquet.",
    image: "assets/img/cupcakes.svg",
  },
  {
    id: "requests",
    name: "Special Requests",
    blurb: "Anything that isn't on the board. Tell us what you're planning and we'll quote it.",
    image: "assets/img/custom-order.svg",
  },
];

/* Each product:
   id        unique, lowercase, no spaces
   name      what the customer sees
   group     which menu section it sits in, a CATEGORIES id
   kind      the little label on the card ("Cupcakes", "Floral"…)
   price     base price in dollars
   unit      "each", "per dozen", etc., shown next to the price
   min       smallest quantity that can be ordered (default 1)
   desc      one or two sentences
   image     path to a photo (drop your own in assets/img and point here)
   options   optional list of choices; each choice can add to the price
   featured  true = shows on the home page showcase
   available false = shows as "sold out" and can't be added to the cart
*/
const PRODUCTS = [
  /* ---- Cupcake of the week, the top of the menu ------------------------ */
  {
    id: "cupcake-week-cookies-and-cream",
    name: "Cookies & Cream",
    group: "weekly",
    kind: "This week only",
    price: 5,
    unit: "per half dozen",
    desc: "Chocolate cookie crumb through the cake and the buttercream, with a cookie on top. This week only.",
    image: "assets/img/cupcakes.svg",
    featured: true,
    options: [
      { label: "Size", choices: [
        { name: "Half dozen", price: 0 },
        { name: "Dozen", price: 5 },
      ]},
    ],
  },

  /* ---- Seasonal -------------------------------------------------------- */
  {
    id: "cupcake-seasonal-pumpkin-spice",
    name: "Pumpkin Spice",
    group: "seasonal",
    kind: "Seasonal",
    price: 5,
    unit: "per half dozen",
    desc: "Pumpkin and warm spice, with a cream cheese buttercream. On the board while the season lasts.",
    image: "assets/img/seasonal.svg",
    featured: true,
    options: [
      { label: "Size", choices: [
        { name: "Half dozen", price: 0 },
        { name: "Dozen", price: 5 },
      ]},
    ],
  },

  /* ---- The standard four, plus a variety pack --------------------------- */
  {
    id: "cupcake-vanilla-vanilla",
    name: "Vanilla Cake, Vanilla Frosting",
    group: "standard",
    kind: "Cupcakes",
    price: 5,
    unit: "per half dozen",
    desc: "Vanilla bean cake under a silky vanilla buttercream. The one everybody reaches for.",
    image: "assets/img/cupcakes.svg",
    options: [
      { label: "Size", choices: [
        { name: "Half dozen", price: 0 },
        { name: "Dozen", price: 5 },
      ]},
    ],
  },
  {
    id: "cupcake-vanilla-chocolate",
    name: "Vanilla Cake, Chocolate Frosting",
    group: "standard",
    kind: "Cupcakes",
    price: 5,
    unit: "per half dozen",
    desc: "Vanilla bean cake with a deep chocolate buttercream.",
    image: "assets/img/cupcakes.svg",
    options: [
      { label: "Size", choices: [
        { name: "Half dozen", price: 0 },
        { name: "Dozen", price: 5 },
      ]},
    ],
  },
  {
    id: "cupcake-chocolate-chocolate",
    name: "Chocolate Cake, Chocolate Frosting",
    group: "standard",
    kind: "Cupcakes",
    price: 5,
    unit: "per half dozen",
    desc: "Dark chocolate cake with chocolate buttercream, for anyone who means it.",
    image: "assets/img/cupcakes.svg",
    options: [
      { label: "Size", choices: [
        { name: "Half dozen", price: 0 },
        { name: "Dozen", price: 5 },
      ]},
    ],
  },
  {
    id: "cupcake-chocolate-vanilla",
    name: "Chocolate Cake, Vanilla Frosting",
    group: "standard",
    kind: "Cupcakes",
    price: 5,
    unit: "per half dozen",
    desc: "Dark chocolate cake under vanilla buttercream.",
    image: "assets/img/cupcakes.svg",
    options: [
      { label: "Size", choices: [
        { name: "Half dozen", price: 0 },
        { name: "Dozen", price: 5 },
      ]},
    ],
  },
  {
    id: "cupcake-variety-pack",
    name: "Variety Pack",
    group: "standard",
    kind: "Cupcakes",
    price: 10,
    unit: "per half dozen",
    desc: "A mix of the standard four, so nobody has to choose. Tell us if you want a particular split.",
    image: "assets/img/cupcakes.svg",
    featured: true,
    options: [
      { label: "Size", choices: [
        { name: "Half dozen", price: 0 },
        { name: "Dozen", price: 10 },
      ]},
    ],
  },

  /* ---- Floral. The bouquet is its own item, not an add-on, so that a
     dozen comes to exactly double the half dozen. ---------------------- */
  {
    id: "cupcake-floral",
    name: "Floral Cupcakes",
    group: "floral",
    kind: "Floral",
    price: 10,
    unit: "per half dozen",
    desc: "Buttercream flowers piped by hand, in the colours you pick. Boxed ready to set out.",
    image: "assets/img/cupcakes.svg",
    featured: true,
    options: [
      { label: "Size", choices: [
        { name: "Half dozen", price: 0 },
        { name: "Dozen", price: 10 },
      ]},
      { label: "Icing colour", choices: [
        { name: "White", price: 0 },
        { name: "Red", price: 0 },
        { name: "Orange", price: 0 },
        { name: "Yellow", price: 0 },
        { name: "Green", price: 0 },
        { name: "Blue", price: 0 },
        { name: "Purple", price: 0 },
        { name: "Pink", price: 0 },
      ]},
    ],
  },
  {
    id: "cupcake-floral-bouquet",
    name: "Floral Cupcake Bouquet",
    group: "floral",
    kind: "Floral",
    price: 12,
    unit: "per half dozen",
    desc: "The same piped flowers, arranged together as a bouquet rather than boxed. A centrepiece you can eat.",
    image: "assets/img/cupcakes.svg",
    options: [
      { label: "Size", choices: [
        { name: "Half dozen", price: 0 },
        { name: "Dozen", price: 12 },
      ]},
      { label: "Icing colour", choices: [
        { name: "White", price: 0 },
        { name: "Red", price: 0 },
        { name: "Orange", price: 0 },
        { name: "Yellow", price: 0 },
        { name: "Green", price: 0 },
        { name: "Blue", price: 0 },
        { name: "Purple", price: 0 },
        { name: "Pink", price: 0 },
      ]},
    ],
  },
];

/* Replace these with real reviews before launch, or delete the block and the
   home page simply skips the section. */
/* Real customer words only. The three that used to sit here were written as
   placeholders while the site was a mockup, and one of them praised cake pops
   that are no longer on the menu. Invented reviews on a site that takes money
   are not a placeholder, they are a false claim, so the section hides itself
   while this is empty. Add entries as customers actually say things:
     { quote: "...", name: "First L.", context: "Birthday, March" },
*/
const TESTIMONIALS = [];

const FAQS = [
  { q: "When can I order?", a: "The order form is open Monday through Wednesday each week. Thursday is shopping day, and everything is baked fresh Friday and Saturday for that week's pickups. If you land here on a Thursday or a weekend, the menu is still here to browse, ordering reopens Monday morning." },
  { q: "When do I pick up?", a: "Friday between 3:00 and 7:00 PM, or Saturday between 10:00 AM and 7:00 PM. You'll choose which one at checkout and lock in a time inside that window." },
  { q: "How do I pay?", a: SHOP_CONFIG.paymentNote + " We take " + SHOP_CONFIG.paymentMethods + "." },
  { q: "Where do I pick up?", a: SHOP_CONFIG.pickupLocation + ". You'll get the address and your pickup time in your confirmation email." },
  { q: "Do you deliver?", a: SHOP_CONFIG.delivery.enabled ? "Yes, local delivery within " + SHOP_CONFIG.delivery.radiusMiles + " miles for a flat $" + SHOP_CONFIG.delivery.fee + " on orders over $" + SHOP_CONFIG.delivery.minimum + "." : "Pickup only for now." },
  { q: "Can you work around allergies?", a: "I can leave out nuts on most items, but everything is made in one home kitchen, so I can't promise an allergen-free product. " + SHOP_CONFIG.cottageNotice },
  { q: "What about changes or cancellations?", a: "Changes are welcome until the order window closes Wednesday night. After that the shopping is done and the order is final." },
];

/* ---------------------------------------------------------------------------
   One catalog, two readers.

   The browser loads this file as a plain script and picks up the constants
   above. The Cloudflare function imports this same file so it can price an
   order from the same numbers. That is deliberate: the prices the server
   charges and the prices the page shows can never drift apart, because there
   is only one list.
   --------------------------------------------------------------------------- */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SHOP_CONFIG: SHOP_CONFIG, CATEGORIES: CATEGORIES, PRODUCTS: PRODUCTS, TESTIMONIALS: TESTIMONIALS, FAQS: FAQS };
}
