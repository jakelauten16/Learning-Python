/* ---------------------------------------------------------------------------
   The Frosted Frog, everything you'll edit week to week lives in this file.

   SHOP_CONFIG  → business details, the weekly schedule, payment mode
   CATEGORIES   → the sections on the shop page and the home-page showcase
   PRODUCTS     → this week's menu
   --------------------------------------------------------------------------- */

const SHOP_CONFIG = {
  businessName: "The Frosted Frog",
  tagline: "Small-batch cakes, cookies & confections, baked at home for your table.",
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
      { day: 5, label: "Friday",   start: "15:00", end: "19:00" },
      { day: 6, label: "Saturday", start: "10:00", end: "19:00" },
    ],

    // Customers choose a time inside the window, in increments of this many
    // minutes. Set to 0 to let them take the whole window with no time choice.
    slotMinutes: 30,

    // Leave false. Set to true only while you're previewing the site, it
    // keeps ordering open on days it would normally be closed.
    previewAnyDay: false,
  },

  // Local delivery (set enabled:false to hide the option entirely).
  delivery: { enabled: true, fee: 12, radiusMiles: 15, minimum: 45 },

  taxRate: 0.07, // 0.07 = 7%. Set to 0 if you don't collect sales tax.

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
  paymentNote:
    "Nothing is charged on this site. Once your order is confirmed you'll get " +
    "a total and a payment request. Settle it any time before pickup day.",
};

/* The menu is laid out in this order, top to bottom. Move a block here and the
   section moves on the page. `id` is what a product's `group` points at. */
const CATEGORIES = [
  {
    id: "weekly",
    name: "This Week's Special Cookies",
    blurb: "A new batch every week. When they're gone, they're gone until they come round again.",
    image: "assets/img/cookies.svg",
    // Update this line each week, it shows at the top of the menu.
    note: "This week: brown butter pecan, and iced pumpkin spice.",
  },
  {
    id: "seasonal",
    name: "Seasonal",
    blurb: "What's good right now, and only right now.",
    image: "assets/img/seasonal.svg",
  },
  {
    id: "mainstays",
    name: "The Mainstays",
    blurb: "On the board every week: cakes, cupcakes, cookies, cake pops and bars.",
    image: "assets/img/cakes.svg",
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
   kind      the little label on the card ("Layer cake", "Cookies"…)
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
    featured: true,
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
    featured: true,
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
    image: "assets/img/cookies.svg",
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
        { name: 'Two tier, serves 30+', price: 85 },
      ]},
      { label: "Filling", choices: [
        { name: "Vanilla buttercream", price: 0 },
        { name: "Raspberry preserves", price: 6 },
        { name: "Salted caramel", price: 8 },
        { name: "Lemon curd", price: 8 },
      ]},
    ],
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
        { name: '8", serves 16-20', price: 25 },
      ]},
    ],
  },
  {
    id: "almond-champagne",
    name: "Almond & Champagne Cake",
    group: "mainstays",
    kind: "Layer cake",
    price: 68,
    unit: "6-inch, serves 8-10",
    desc: "Almond cake brushed with champagne syrup, mascarpone buttercream, sugared florals.",
    image: "assets/img/cakes.svg",
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
    featured: true,
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
    image: "assets/img/cupcakes.svg",
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
    image: "assets/img/cookies.svg",
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
        { name: "Custom, send me your theme", price: 20 },
      ]},
    ],
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
        { name: "Half and half", price: 0 },
      ]},
      { label: "Finish", choices: [
        { name: "Drizzle + sprinkles", price: 0 },
        { name: "Gold leaf accents", price: 10 },
      ]},
    ],
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
    featured: true,
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
    image: "assets/img/brownies.svg",
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
    featured: true,
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
    image: "assets/img/seasonal.svg",
  },
];

/* Replace these with real reviews before launch, or delete the block and the
   home page simply skips the section. */
const TESTIMONIALS = [
  { quote: "The cake was the prettiest thing at the party, and somehow it tasted even better than it looked.", name: "Marissa H.", context: "Birthday cake, June" },
  { quote: "Four dozen iced cookies for a baby shower. Every single one was perfect.", name: "Dana P.", context: "Baby shower, March" },
  { quote: "Easiest pre-order I have ever done, and the cake pops disappeared in ten minutes.", name: "Kelsey R.", context: "Office party, October" },
];

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
