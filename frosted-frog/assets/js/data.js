/* ---------------------------------------------------------------------------
   The Frosted Frog — everything you'll edit week to week lives in this file.

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
  pickupLocation: "Pickup in Sugar Hill — exact address sent with your confirmation",
  cottageNotice:
    "Made in a home kitchen that is not subject to state inspection. Products may contain, or have come in contact with, wheat, eggs, dairy, soy, peanuts and tree nuts.",

  /* THE WEEKLY RHYTHM --------------------------------------------------------
     Ordering is open Monday through Wednesday. Thursday is shopping day,
     Friday and Saturday are baking and pickup. Customers don't pick an
     arbitrary date — they choose one of that week's two pickup windows.

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

    // Leave false. Set to true only while you're previewing the site — it
    // keeps ordering open on days it would normally be closed.
    previewAnyDay: false,
  },

  // Local delivery (set enabled:false to hide the option entirely).
  delivery: { enabled: true, fee: 12, radiusMiles: 15, minimum: 45 },

  taxRate: 0.07, // 0.07 = 7%. Set to 0 if you don't collect sales tax.

  /* PAYMENT ------------------------------------------------------------------
     "stripe"   — checkout posts to /.netlify/functions/create-checkout-session
                  and the customer pays by card right then. Requires the
                  function in netlify/functions + your Stripe keys. See README.
     "deposit"  — order is submitted and you send a payment request after you
                  confirm. Nothing is charged on the site.
     Until your Stripe account is live, leave this on "deposit".
  --------------------------------------------------------------------------- */
  paymentMode: "deposit",
  checkoutEndpoint: "/.netlify/functions/create-checkout-session",
  // Where orders go when paymentMode is "deposit". A Formspree/Basin/Netlify
  // Forms endpoint, or leave "" to fall back to opening the customer's email.
  orderEndpoint: "",
};

const CATEGORIES = [
  { id: "cakes",     name: "Cakes",           blurb: "Layered, filled and finished by hand.",              image: "assets/img/cakes.svg" },
  { id: "cupcakes",  name: "Cupcakes",        blurb: "By the half dozen or the dozen.",                    image: "assets/img/cupcakes.svg" },
  { id: "cookies",   name: "Cookies",         blurb: "Soft-batch, iced sugar and everything between.",     image: "assets/img/cookies.svg" },
  { id: "cakepops",  name: "Cake Pops",       blurb: "Dipped, drizzled and dressed for the occasion.",     image: "assets/img/cakepops.svg" },
  { id: "brownies",  name: "Brownies & Bars", blurb: "Fudgy corners, every single one.",                   image: "assets/img/brownies.svg" },
  { id: "seasonal",  name: "Seasonal",        blurb: "What's good right now, and only right now.",         image: "assets/img/seasonal.svg" },
];

/* Each product:
   id        unique, lowercase, no spaces
   name      what the customer sees
   category  must match a CATEGORIES id
   price     base price in dollars
   unit      "each", "per dozen", etc. — shown next to the price
   min       smallest quantity that can be ordered (default 1)
   desc      one or two sentences
   image     path to a photo (drop your own in assets/img and point here)
   options   optional list of choices; each choice can add to the price
   featured  true = shows on the home page showcase
   available false = shows as "sold out" and can't be added to the cart
*/
const PRODUCTS = [
  {
    id: "vanilla-bean-layer",
    name: "Vanilla Bean Layer Cake",
    category: "cakes",
    price: 55,
    unit: "6-inch, serves 8–10",
    desc: "Three layers of vanilla bean cake with silky Swiss meringue buttercream and a hand-piped finish.",
    image: "assets/img/cakes.svg",
    featured: true,
    options: [
      { label: "Size", choices: [
        { name: '6" — serves 8–10', price: 0 },
        { name: '8" — serves 16–20', price: 25 },
        { name: 'Two tier — serves 30+', price: 85 },
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
    category: "cakes",
    price: 60,
    unit: "6-inch, serves 8–10",
    desc: "Deep dark chocolate cake, whipped chocolate ganache, and a gold-dusted crown of buttercream.",
    image: "assets/img/cakes.svg",
    featured: true,
    options: [
      { label: "Size", choices: [
        { name: '6" — serves 8–10', price: 0 },
        { name: '8" — serves 16–20', price: 25 },
      ]},
    ],
  },
  {
    id: "almond-champagne",
    name: "Almond & Champagne Cake",
    category: "cakes",
    price: 68,
    unit: "6-inch, serves 8–10",
    desc: "Almond cake brushed with champagne syrup, mascarpone buttercream, sugared florals.",
    image: "assets/img/cakes.svg",
  },
  {
    id: "vanilla-cupcakes",
    name: "Classic Vanilla Cupcakes",
    category: "cupcakes",
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
    category: "cupcakes",
    price: 34,
    unit: "per dozen",
    min: 6,
    desc: "Lemon cake folded with blueberries, topped with lemon cream cheese frosting.",
    image: "assets/img/cupcakes.svg",
  },
  {
    id: "brown-butter-chocolate-chip",
    name: "Brown Butter Chocolate Chip",
    category: "cookies",
    price: 24,
    unit: "per dozen",
    min: 6,
    desc: "Thick, soft-centered and freckled with sea salt. The one everybody re-orders.",
    image: "assets/img/cookies.svg",
    featured: true,
  },
  {
    id: "iced-sugar-cookies",
    name: "Iced Sugar Cookies",
    category: "cookies",
    price: 42,
    unit: "per dozen",
    min: 12,
    desc: "Hand-iced in your colors — showers, birthdays, holidays, or a monogram for the table.",
    image: "assets/img/cookies.svg",
    featured: true,
    options: [
      { label: "Design", choices: [
        { name: "Simple — one or two colors", price: 0 },
        { name: "Detailed — florals, lettering", price: 12 },
        { name: "Custom — send me your theme", price: 20 },
      ]},
    ],
  },
  {
    id: "classic-cake-pops",
    name: "Classic Cake Pops",
    category: "cakepops",
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
    category: "brownies",
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
    category: "brownies",
    price: 24,
    unit: "per dozen",
    min: 6,
    desc: "Chewy brown sugar bars with white chocolate and toasted pecans.",
    image: "assets/img/brownies.svg",
  },
  {
    id: "dessert-box",
    name: "The Frosted Frog Dessert Box",
    category: "seasonal",
    price: 48,
    unit: "serves 6–8",
    desc: "A curated box of the week's best — cookies, brownie bites, cake pops and a little something extra.",
    image: "assets/img/seasonal.svg",
    featured: true,
  },
  {
    id: "seasonal-pie-bars",
    name: "Seasonal Pie Bars",
    category: "seasonal",
    price: 28,
    unit: "per dozen",
    min: 6,
    desc: "Whatever's in season, in a shortbread crust. Ask what's on the board this month.",
    image: "assets/img/seasonal.svg",
  },
];

const TESTIMONIALS = [
  { quote: "The cake was the prettiest thing at the party and somehow tasted even better than it looked.", name: "Marissa H." },
  { quote: "I ordered four dozen iced cookies for a baby shower and every single one was perfect.", name: "Dana P." },
  { quote: "Easiest pre-order I've ever done, and the cake pops disappeared in ten minutes.", name: "Kelsey R." },
];

const FAQS = [
  { q: "When can I order?", a: "The order form is open Monday through Wednesday each week. Thursday is shopping day, and everything is baked fresh Friday and Saturday for that week's pickups. If you land here on a Thursday or a weekend, the menu is still here to browse — ordering reopens Monday morning." },
  { q: "When do I pick up?", a: "Friday between 3:00 and 7:00 PM, or Saturday between 10:00 AM and 7:00 PM. You'll choose which one at checkout and lock in a time inside that window." },
  { q: "How do I pay?", a: "You'll pay securely at checkout when you place your pre-order. Custom quotes are invoiced separately once we've settled on the details." },
  { q: "Where do I pick up?", a: SHOP_CONFIG.pickupLocation + ". You'll get the address and your pickup time in your confirmation email." },
  { q: "Do you deliver?", a: SHOP_CONFIG.delivery.enabled ? "Yes — local delivery within " + SHOP_CONFIG.delivery.radiusMiles + " miles for a flat $" + SHOP_CONFIG.delivery.fee + " on orders over $" + SHOP_CONFIG.delivery.minimum + "." : "Pickup only for now." },
  { q: "Can you work around allergies?", a: "I can leave out nuts on most items, but everything is made in one home kitchen, so I can't promise an allergen-free product. " + SHOP_CONFIG.cottageNotice },
  { q: "What about changes or cancellations?", a: "Changes are welcome until the order window closes Wednesday night. After that the shopping is done and the order is final." },
];
