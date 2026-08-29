/* =========================================================================
   The pour.

   The hero is not a playing video. It is 140 stills painted onto a <canvas>,
   with the frame chosen by how far down the track you have scrolled. Scrubbing
   a real <video> element by writing currentTime is jittery on most phones and
   flatly unreliable on iOS; drawing decoded images is neither, and it means the
   whiskey stops dead when the scroll does.

   The same 0..1 progress drives the copy: every [data-cue] gets a --t between 0
   and 1 for the window it owns, so the product facts arrive while the stream is
   still falling instead of on a timer that knows nothing about the film.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.querySelector('[data-pour]');
  if (!root) return;

  var canvas  = root.querySelector('.pour__canvas');
  var railEl  = root.querySelector('.pour__rail');
  var loadEl  = root.querySelector('.pour__loading');
  var cues    = Array.prototype.slice.call(root.querySelectorAll('[data-cue]'));

  // Parse each cue's scroll window once: "0.34" lights up and stays lit,
  // "0.34,0.51" also fades back out.
  cues.forEach(function (el) {
    var parts = el.getAttribute('data-cue').split(',');
    el._in  = parseFloat(parts[0]);
    el._out = parts.length > 1 ? parseFloat(parts[1]) : Infinity;
    // Only cues that can take focus need inerting while invisible; doing it to
    // all of them would hide the copy from screen readers, which is the whole
    // point of leaving it in the DOM.
    el._focusable = !!el.querySelector('a, button, input, select, textarea');
    el._t = -1;
  });

  var FADE = 0.032;              // scroll distance a cue takes to arrive
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --- static mode: no scrub, no downloads, everything on screen at once --- */
  function goStatic() {
    root.classList.add('pour--static');
    cues.forEach(function (el) {
      el.style.setProperty('--t', 1);
      el.removeAttribute('data-hidden');
      el.removeAttribute('inert');
    });
  }
  if (reduce.matches) { goStatic(); return; }

  /* --- frame store ------------------------------------------------------- */
  var frames = [];        // Image objects, sparse until loaded
  var ready  = [];        // ready[i] === true once frame i can be drawn
  var count  = 0;
  var conf   = null;
  var loadedN = 0;

  function srcFor(i, w) {
    // manifest indexes from 0; ffmpeg numbered the files from 1
    return 'assets/media/frames/' + w + '/f' + String(i + 1).padStart(3, '0') + '.webp';
  }

  // One width for the life of the page. Re-picking on resize would throw away
  // everything already decoded for no visible gain.
  function pickWidth(widths) {
    var need = Math.min(window.innerWidth, window.innerHeight * 1.9) *
               Math.min(window.devicePixelRatio || 1, 2);
    var sorted = widths.slice().sort(function (a, b) { return a - b; });
    for (var i = 0; i < sorted.length; i++) if (sorted[i] >= need) return sorted[i];
    return sorted[sorted.length - 1];
  }

  /* --- drawing ----------------------------------------------------------- */
  var ctx = canvas.getContext('2d', { alpha: false });
  var cw = 0, ch = 0, drawn = -1, portrait = false;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    cw = Math.round(r.width * dpr);
    ch = Math.round(r.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch;
      drawn = -1;                       // the buffer was cleared; force a repaint
    }
    // Covering a tall phone viewport with a 16:9 frame means showing about a
    // quarter of its width — the pour ends up cropped to a sliver of cup. On
    // portrait we run the picture as a band across the top instead, which shows
    // twice as much of the frame and leaves the lower half for the copy.
    portrait = r.height > r.width * 1.3;
  }

  // Nearest frame we actually hold, so a half-loaded sequence still moves
  // instead of blinking to black.
  function nearest(i) {
    if (ready[i]) return i;
    for (var d = 1; d < count; d++) {
      if (i - d >= 0 && ready[i - d]) return i - d;
      if (i + d < count && ready[i + d]) return i + d;
    }
    return -1;
  }

  var BAND = 0.58;   // share of a portrait stage the picture band occupies

  function paint(i) {
    var use = nearest(i);
    if (use < 0 || use === drawn) return;
    var img = frames[use];
    var iw = img.naturalWidth, ih = img.naturalHeight;

    if (portrait) {
      var sp = Math.max(cw / iw, (ch * BAND) / ih);
      var pw = iw * sp, ph = ih * sp;
      ctx.fillStyle = '#100e0c';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - pw) / 2, 0, pw, ph);
      // Feather the bottom edge into the ground so the band reads as light
      // falling off, not as a photograph stuck on a black rectangle.
      var g = ctx.createLinearGradient(0, ph * 0.62, 0, ph);
      g.addColorStop(0, 'rgba(16,14,12,0)');
      g.addColorStop(1, 'rgba(16,14,12,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, ph * 0.62, cw, ph * 0.38 + 1);
    } else {
      var s = Math.max(cw / iw, ch / ih);
      var w = iw * s, h = ih * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    drawn = use;
  }

  /* --- loading ----------------------------------------------------------- */
  function load(i, width, done) {
    if (frames[i]) { done(); return; }
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      frames[i] = img; ready[i] = true;
      loadedN++;
      if (loadEl) loadEl.style.setProperty('--loaded', loadedN / count);
      if (drawn < 0) paint(i);
      done();
    };
    img.onerror = function () { done(); };
    img.src = srcFor(i, width);
    frames[i] = img;                    // claim the slot so we don't queue twice
  }

  // Fetch `order` a few at a time. Saturating the connection with 140 requests
  // makes the first frames arrive later, not sooner.
  function queue(order, width, onFirstPass) {
    var next = 0, active = 0, LIMIT = 6, fired = false;
    function pump() {
      while (active < LIMIT && next < order.length) {
        active++;
        load(order[next++], width, function () {
          active--;
          if (!fired && next >= order.length && active === 0) { fired = true; onFirstPass && onFirstPass(); }
          pump();
        });
      }
      if (!fired && next >= order.length && active === 0) { fired = true; onFirstPass && onFirstPass(); }
    }
    pump();
  }

  /* --- progress ---------------------------------------------------------- */
  function progress() {
    var top = root.getBoundingClientRect().top;
    var span = root.offsetHeight - window.innerHeight;
    if (span <= 0) return 0;
    var p = -top / span;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  function smoothstep(a, b, x) {
    if (b <= a) return x >= b ? 1 : 0;
    var t = (x - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  }

  function applyCues(p) {
    for (var i = 0; i < cues.length; i++) {
      var el = cues[i];
      var t = smoothstep(el._in, el._in + FADE, p);
      if (el._out !== Infinity) t *= 1 - smoothstep(el._out, el._out + FADE, p);
      t = Math.round(t * 1000) / 1000;
      if (t === el._t) continue;
      el._t = t;
      el.style.setProperty('--t', t);
      // Invisible copy stays readable to assistive tech, but must not swallow
      // clicks — or hold a tab stop, if it has one.
      if (t < 0.01) {
        el.setAttribute('data-hidden', '');
        if (el._focusable) el.setAttribute('inert', '');
      } else {
        el.removeAttribute('data-hidden');
        if (el._focusable) el.removeAttribute('inert');
      }
    }
  }

  var pending = false, lastP = -1;
  function frame() {
    pending = false;
    var p = progress();
    if (p !== lastP) {
      lastP = p;
      applyCues(p);
      if (railEl && conf) {
        var fill = smoothstep(conf.pourStart, conf.pourEnd, p);
        railEl.style.setProperty('--fill', fill);
      }
    }
    if (count) paint(Math.min(count - 1, Math.round(p * (count - 1))));
  }
  function tick() { if (!pending) { pending = true; requestAnimationFrame(frame); } }

  /* --- go ---------------------------------------------------------------- */
  fetch('assets/media/frames/manifest.json')
    .then(function (r) {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    })
    .then(function (m) {
      conf = m;
      count = m.count;
      var width = pickWidth(m.widths);

      resize();

      // Two passes. The first is every 6th frame, which is enough to scrub
      // against within a second or so; the rest fill in behind it, pour first,
      // because that is the part anyone actually watches.
      var coarse = [], fine = [], i;
      for (i = 0; i < count; i++) (i % 6 === 0 || i === count - 1 ? coarse : fine).push(i);

      var mid = Math.round(((m.pourStart + m.pourEnd) / 2) * count);
      fine.sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid); });

      queue(coarse, width, function () {
        root.setAttribute('data-ready', '1');
        tick();
        queue(fine, width);
      });

      window.addEventListener('scroll', tick, { passive: true });
      window.addEventListener('resize', function () { resize(); lastP = -1; tick(); }, { passive: true });
      if (window.ResizeObserver) new ResizeObserver(function () { resize(); tick(); }).observe(canvas);
      tick();
    })
    .catch(function (err) {
      // No manifest, no network, blocked request: fall back to the poster and
      // show every fact at once rather than leaving a black hole on the page.
      if (window.console) console.warn('[pour] falling back to static hero:', err.message);
      goStatic();
    });

  // Someone turning reduced motion on mid-visit gets the static hero too.
  var onPref = function () { if (reduce.matches) goStatic(); };
  if (reduce.addEventListener) reduce.addEventListener('change', onPref);
  else if (reduce.addListener) reduce.addListener(onPref);
})();
