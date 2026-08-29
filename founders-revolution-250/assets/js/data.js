/* =========================================================================
   Everything about the release that anyone might need to change.

   Edit this file, not the markup. Prices, the allocation counter and the
   tasting notes are read from here by the pages that show them.
   NOTE: figures marked PLACEHOLDER in README.md are not confirmed.
   ========================================================================= */
window.AF = (function () {
  'use strict';

  var RELEASE = {
    name:     'Heritage Select 250',
    brand:    'American Founders',
    style:    'Kentucky Straight Bourbon Whiskey',
    age:      '7 Years',
    proof:    '120 Proof',
    abv:      '60% ALC/VOL',
    volume:   '750 ml',
    barrel:   'Single Barrel',
    strength: 'Cask Strength',
    sets:     250,          // how many collector's boxes exist, total
    claimed:  184,          // how many are spoken for — update as they sell
    year:     2026
  };

  // The two ways to buy, as shown on the home page and the reserve form.
  var OFFERS = [
    {
      id:    'box',
      name:  "The 250 Collector's Box",
      price: 250,
      blurb: 'The full presentation set, numbered and boxed.',
      includes: [
        'Single barrel, 7-year, cask strength bourbon — 750 ml',
        'Handcrafted engraved wooden presentation box',
        'Pewter eagle bottle stopper',
        'Two pewter Jefferson cups',
        'Numbered certificate of authenticity',
        'Limited edition release — only 250 produced'
      ]
    },
    {
      id:    'bottle',
      name:  'The Bottle Alone',
      price: 95,
      blurb: 'The same whiskey, without the box. For drinking, not shelving.',
      includes: [
        'Single barrel, 7-year, cask strength bourbon — 750 ml',
        'Numbered neck tag',
        'No presentation box, stopper, or cups'
      ]
    }
  ];

  var NOTES = [
    { k: 'Nose',   v: 'Baked apple and clove, then old leather and a rickhouse in August. Given a minute, dark honey.' },
    { k: 'Palate', v: 'Arrives hot and settles sweet — toasted pecan, brown butter, a seam of dry oak tannin holding it straight.' },
    { k: 'Finish', v: 'Long, warm, faintly peppery. Water opens the fruit; it does not need much.' }
  ];

  var SPEC = [
    ['Mash bill',   '74% corn · 18% rye · 8% malted barley'],
    ['Distilled',   'Kentucky'],
    ['Aged',        '7 years, new charred American oak'],
    ['Entry proof', '107'],
    ['Bottled',     'Cask strength, uncut, non-chill filtered'],
    ['Proof',       '120 · 60% ALC/VOL'],
    ['Volume',      '750 ml'],
    ['Barrel',      'Single barrel — no vatting, no batching']
  ];

  function money(n) {
    return '$' + n.toLocaleString('en-US');
  }

  return {
    release: RELEASE,
    offers:  OFFERS,
    notes:   NOTES,
    spec:    SPEC,
    money:   money,
    offer:   function (id) {
      for (var i = 0; i < OFFERS.length; i++) if (OFFERS[i].id === id) return OFFERS[i];
      return null;
    },
    remaining: function () { return Math.max(0, RELEASE.sets - RELEASE.claimed); }
  };
})();
