/* ==========================================================================
   Lucy Lou's Coffee — site content
   --------------------------------------------------------------------------
   This is the one file you edit week to week. Nothing else needs to change.

     STOPS   the route board on the home page + the stop picker on preorder
     MENU    every drink, grouped; the group with season:true renders first
     EVENTS  the events page and the home-page events strip

   Dates are ISO (YYYY-MM-DD) and times are 24-hour "HH:MM" in local time.
   Weekday names are computed at render time, so you never have to fix them.
   ========================================================================== */

/* -- Where the trailer is ------------------------------------------------- */

const STOPS = [
  {
    id: 'dyer-market',
    place: "Dyer Farmers Market",
    address: "Central Park Plaza, Dyer, IN",
    date: '2026-08-01',
    open: '08:00',
    close: '13:00',
    rig: 'trailer',
    note: "Full espresso bar. Preorders picked up at the side window."
  },
  {
    id: 'schererville-lot',
    place: "Sunday Pop-Up — Redar Park",
    address: "Schererville, IN",
    date: '2026-08-02',
    open: '09:00',
    close: '14:00',
    rig: 'trailer',
    note: "Cold brew + lotus only after 1pm."
  },
  {
    id: 'crown-point-square',
    place: "Courthouse Square",
    address: "Crown Point, IN",
    date: '2026-08-05',
    open: '07:30',
    close: '11:30',
    rig: 'cart',
    note: "Cart setup — smaller menu, faster line."
  },
  {
    id: 'st-john-fest',
    place: "St. John Summer Fest",
    address: "Heartland Park, St. John, IN",
    date: '2026-08-08',
    open: '10:00',
    close: '18:00',
    rig: 'trailer',
    note: "Long day. Preorder ahead — the line gets deep after noon."
  },
  {
    id: 'munster-market',
    place: "Munster Farmers Market",
    address: "Community Park, Munster, IN",
    date: '2026-08-09',
    open: '08:00',
    close: '13:00',
    rig: 'trailer',
    note: "Full espresso bar."
  }
];

/* -- The menu -------------------------------------------------------------
   Set season:true on exactly one group to pin it to the top of the menu and
   surface it on the home page. Set available:false to grey an item out.
   ------------------------------------------------------------------------ */

const MENU = [
  {
    id: 'seasonal',
    name: "Summer on the Trailer",
    season: true,
    window: "Pouring through Labor Day",
    note: "Four drinks we only make while the fruit is good.",
    items: [
      {
        id: 'honey-peach-tonic',
        name: "Honey Peach Espresso Tonic",
        desc: "Double shot over tonic, muddled peach, a spoon of local honey.",
        price: 6.75,
        temp: 'Iced'
      },
      {
        id: 'blackberry-lavender',
        name: "Blackberry Lavender Cold Brew",
        desc: "Our cold brew with blackberry, a whisper of lavender, vanilla cold foam.",
        price: 6.25,
        temp: 'Iced'
      },
      {
        id: 'coconut-horchata',
        name: "Toasted Coconut Horchata Latte",
        desc: "Cinnamon rice horchata, toasted coconut, espresso.",
        price: 6.5,
        temp: 'Hot or iced'
      },
      {
        id: 'watermelon-mint-lotus',
        name: "Watermelon Mint Lotus",
        desc: "Watermelon lotus, fresh mint, soda water, lime.",
        price: 6.5,
        temp: 'Iced'
      }
    ]
  },
  {
    id: 'espresso',
    name: "Espresso",
    note: "Pulled to order on the trailer's two-group machine.",
    items: [
      {
        id: 'pistachi-oat',
        name: "Pistachi-Oat Shaken Espresso",
        desc: "Iced espresso shaken with pistachio syrup, topped with creamy oat milk.",
        price: 6.5,
        temp: 'Iced'
      },
      { id: 'latte', name: "Latte", desc: "Espresso and steamed milk.", price: 5.5, temp: 'Hot or iced' },
      { id: 'breve', name: "Breve", desc: "Espresso with steamed half & half.", price: 6.0, temp: 'Hot or iced' },
      { id: 'americano', name: "Americano", desc: "Espresso and hot water.", price: 4.5, temp: 'Hot or iced' }
    ]
  },
  {
    id: 'coffee',
    name: "Coffee & Cold Brew",
    note: "Steeped 18 hours, never from concentrate.",
    items: [
      {
        id: 'vanilla-cloud',
        name: "Vanilla Cloud Cold Brew",
        desc: "Our classic cold brew topped with sweet vanilla cold foam.",
        price: 5.75,
        temp: 'Iced'
      },
      { id: 'classic-cold-brew', name: "Classic Cold Brew", desc: "Slow-steeped, smooth, no bitterness.", price: 4.75, temp: 'Iced' },
      { id: 'red-eye', name: "Red Eye", desc: "Drip coffee with a shot dropped in.", price: 5.0, temp: 'Hot or iced' },
      { id: 'hot-drip', name: "Hot Drip Coffee", desc: "A straightforward cup, brewed all day.", price: 3.25, temp: 'Hot' }
    ]
  },
  {
    id: 'lotus',
    name: "Lotus Energy",
    accent: 'lotus',
    note: "Plant-based energy. Build your own or take ours.",
    items: [
      {
        id: 'lucy-lou-lotus',
        name: "Lucy Lou Lotus",
        desc: "Layered blue raspberry lotus topped with orange juice. The one we're named for.",
        price: 6.0,
        temp: 'Iced'
      },
      {
        id: 'peaches-cream-lotus',
        name: "Peaches & Cream Lotus",
        desc: "Peach lotus topped with sweet vanilla cold foam.",
        price: 6.5,
        temp: 'Iced'
      },
      {
        id: 'custom-lotus',
        name: "Custom Lotus",
        desc: "Any flavor syrups you like, tossed with soda water.",
        price: 6.0,
        temp: 'Iced'
      }
    ]
  },
  {
    id: 'refreshers',
    name: "Refreshers",
    note: "Caffeine-free. Good for the kids in line behind you.",
    items: [
      { id: 'renew', name: "Renew", desc: "Strawberry and acai.", price: 5.5, temp: 'Iced' },
      { id: 'recharge', name: "Recharge", desc: "Dragon fruit and elderberry.", price: 5.5, temp: 'Iced' },
      { id: 'replenish', name: "Replenish", desc: "Watermelon, cucumber, and mint.", price: 5.5, temp: 'Iced' },
      { id: 'restore', name: "Restore", desc: "Kiwi, mint, and lemongrass.", price: 5.5, temp: 'Iced' },
      { id: 'revive', name: "Revive", desc: "Star fruit, passion fruit, and mango.", price: 5.5, temp: 'Iced' }
    ]
  },
  {
    id: 'tea',
    name: "Tea Lattes",
    note: "Whisked to order, sweetened the way you ask.",
    items: [
      { id: 'matcha', name: "Matcha", desc: "Ceremonial-grade matcha with your milk of choice.", price: 6.0, temp: 'Hot or iced' },
      { id: 'chai', name: "Chai", desc: "Spiced black tea concentrate and steamed milk.", price: 5.5, temp: 'Hot or iced' },
      { id: 'london-fog', name: "London Fog", desc: "Earl Grey, vanilla, steamed milk.", price: 5.5, temp: 'Hot or iced' },
      { id: 'butterfly-pea', name: "Butterfly Pea Flower", desc: "Caffeine-free, and it turns violet when the lemon hits.", price: 6.0, temp: 'Hot or iced' }
    ]
  }
];

/* -- Drink options offered at preorder ------------------------------------ */

const SIZES = [
  { id: '12', label: "12 oz", delta: 0 },
  { id: '16', label: "16 oz", delta: 0.75 },
  { id: '20', label: "20 oz", delta: 1.5 }
];

const MILKS = ["Whole", "2%", "Oat", "Almond", "Half & half", "None"];

const EXTRAS = [
  { id: 'shot', label: "Extra espresso shot", delta: 1.25 },
  { id: 'foam', label: "Cold foam top", delta: 1.0 },
  { id: 'decaf', label: "Make it decaf", delta: 0 },
  { id: 'light-ice', label: "Light ice", delta: 0 }
];

/* -- Events ---------------------------------------------------------------
   type: 'public'  — anyone can show up
         'private' — booked, listed so people know the trailer is out
   ------------------------------------------------------------------------ */

const EVENTS = [
  {
    name: "St. John Summer Fest",
    date: '2026-08-08',
    start: '10:00',
    end: '18:00',
    venue: "Heartland Park",
    city: "St. John, IN",
    type: 'public',
    desc: "Three days of music and food trucks. We're parked by the main stage all Saturday."
  },
  {
    name: "Lake County Fair",
    date: '2026-08-15',
    start: '11:00',
    end: '21:00',
    venue: "Lake County Fairgrounds",
    city: "Crown Point, IN",
    type: 'public',
    desc: "Full trailer, extended hours, lotus flowing until close."
  },
  {
    name: "Harvest Market Kickoff",
    date: '2026-09-12',
    start: '08:00',
    end: '13:00',
    venue: "Central Park Plaza",
    city: "Dyer, IN",
    type: 'public',
    desc: "First market of the fall menu. Pumpkin goes back on the board."
  },
  {
    name: "The Blushing Bride Wedding Expo",
    date: '2026-10-04',
    start: '12:00',
    end: '15:00',
    venue: "Villa Cesare",
    city: "Dyer, IN",
    type: 'public',
    desc: "Come taste the wedding package and see the trailer set up the way it'd arrive at your venue."
  }
];

const PAST_EVENTS = [
  "The Blushing Bride Wedding Expo · Villa Cesare, Dyer",
  "Villa Cesare wedding receptions",
  "Corporate mornings across the Region",
  "Graduation parties · Lake & Porter County",
  "Church and school fundraisers",
  "Farmers markets · Dyer, Munster, Crown Point"
];

/* -- Booking packages ----------------------------------------------------- */

const PACKAGES = [
  {
    name: "Wedding",
    lead: "Ceremony through last dance.",
    points: [
      "Trailer arrives 90 minutes early and sets up out of your photos",
      "Two baristas, unlimited drinks for your guest count",
      "Custom signature drink named for the couple",
      "Chalkboard menu lettered with your names and date",
      "Hot cocoa and cider added free for October through March dates"
    ]
  },
  {
    name: "Corporate & office",
    lead: "A morning that people actually show up for.",
    points: [
      "Cart or trailer, whichever fits your lot or lobby",
      "Two-hour and four-hour blocks",
      "Company logo on the cups",
      "Flat per-head pricing, invoiced after the event",
      "Recurring monthly dates available"
    ]
  },
  {
    name: "Parties & fundraisers",
    lead: "Graduations, showers, church lots, school nights.",
    points: [
      "Two-hour minimum",
      "Full menu including refreshers and lotus for younger guests",
      "Fundraiser split available for schools and churches",
      "We bring our own power and water"
    ]
  }
];
