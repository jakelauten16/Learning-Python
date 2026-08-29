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
  var embers  = root.querySelector('.pour__embers');
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
  var BAND = 0.58;   // share of a portrait stage the picture band occupies
  var ctx = canvas.getContext('2d', { alpha: false });
  var cw = 0, ch = 0, drawn = '', portrait = false;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    cw = Math.round(r.width * dpr);
    ch = Math.round(r.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch;
      drawn = '';                       // the buffer was cleared; force a repaint
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

  function drawCover(img) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (portrait) {
      var sp = Math.max(cw / iw, (ch * BAND) / ih);
      var pw = iw * sp, ph = ih * sp;
      ctx.drawImage(img, (cw - pw) / 2, 0, pw, ph);
      // Feather the bottom edge into the ground so the band reads as light
      // falling off, not as a photograph stuck on a black rectangle.
      var g = ctx.createLinearGradient(0, ph * 0.62, 0, ph);
      g.addColorStop(0, 'rgba(16,14,12,0)');
      g.addColorStop(1, 'rgba(16,14,12,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, ph * 0.62, cw, ph * 0.38 + 1);
    } else {
      var sc = Math.max(cw / iw, ch / ih);
      var w = iw * sc, h = ih * sc;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }
  }

  // The sequence is 24fps of footage spread over thousands of pixels of scroll,
  // so landing on whole frames makes the pour step. Drawing the frame we are
  // between at partial alpha dissolves one into the next instead — which on
  // real footage, already carrying its own motion blur, reads as movement
  // rather than as two pictures.
  function paintAt(pos) {
    var i0 = Math.floor(pos);
    if (i0 < 0) i0 = 0; else if (i0 > count - 1) i0 = count - 1;
    var frac = pos - i0;
    var i1 = i0 + 1 > count - 1 ? count - 1 : i0 + 1;

    var a = nearest(i0);
    if (a < 0) return;
    var b = frac > 0.02 ? nearest(i1) : a;

    var key = a + ':' + b + ':' + (frac * 60 | 0);
    if (key === drawn) return;

    drawCover(frames[a]);
    if (b >= 0 && b !== a) {
      ctx.globalAlpha = frac;
      drawCover(frames[b]);
      ctx.globalAlpha = 1;
    }
    drawn = key;
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
      if (!drawn) paintAt(i);
      else tick();     // a sharper frame just landed; redraw where we are
      done();
    };
    img.onerror = function () { done(); };
    img.src = srcFor(i, width);
    frames[i] = img;                    // claim the slot so we don't queue twice
  }

  // Fetch `order` a few at a time. Saturating the connection with 140 requests
  // makes the first frames arrive later, not sooner.
  function queue(order, width, onFirstPass) {
    var next = 0, active = 0, LIMIT = 8, fired = false;
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

  /* --- the follow ---------------------------------------------------------
     The film follows the scrollbar, it does not track it. A wheel notch moves
     the page in one jump; easing toward that position turns the jump into a
     glide, which is most of the difference between the pour stuttering and the
     pour pouring. The loop runs only while it still has ground to cover, so a
     page at rest costs nothing. */
  var target = 0, shown = -1, running = false, lastT = 0;
  var EASE = 0.15;        // share of the remaining distance covered per 60Hz frame
  var SNAP = 0.00018;     // close enough to stop

  function loop(now) {
    target = progress();
    if (shown < 0) shown = target;               // first paint lands where we are
    if (!lastT) lastT = now - 16.7;

    // Frame-rate independent easing. A plain `shown += d * EASE` closes the gap
    // twice as fast on a 120Hz display as on a 60Hz one, so the same page feels
    // different on different machines. Scaling by elapsed time fixes the rate to
    // wall-clock instead. The clamp stops a backgrounded tab, which can hand
    // back a gap of seconds, from snapping the whole film in one frame.
    var dt = Math.min(now - lastT || 16.7, 50);
    lastT = now;
    var k = 1 - Math.pow(1 - EASE, dt / 16.667);

    var d = target - shown;
    var done = Math.abs(d) < SNAP;
    shown = done ? target : shown + d * k;

    applyCues(shown);
    if (conf) {
      var sh = conf.shots;
      // The rail fills as the cup does: from the first drop to the last.
      if (railEl) railEl.style.setProperty('--fill', smoothstep(sh.pour, sh.settle, shown));
      // Firelight and embers belong to the camp. Once the push has gone into
      // the bottle we are inside the glass, and they would make no sense.
      root.style.setProperty('--camp', String(1 - smoothstep(sh.through, sh.pour, shown)));
    }
    if (count) paintAt(shown * (count - 1));

    if (done) running = false;
    else requestAnimationFrame(loop);
  }

  function tick() { if (!running) { running = true; lastT = 0; requestAnimationFrame(loop); } }

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

      // Two passes. The first is every 4th frame, which is enough to scrub
      // against within a second or so; the rest fill in behind it, pour first,
      // because that is the part anyone actually watches. Until that second
      // pass lands the scrub can only show what has arrived, so it is the
      // difference between a smooth pour and a slideshow.
      var coarse = [], fine = [], i;
      for (i = 0; i < count; i++) (i % 4 === 0 || i === count - 1 ? coarse : fine).push(i);

      var mid = Math.round(((m.shots.pour + m.shots.settle) / 2) * count);
      fine.sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid); });

      queue(coarse, width, function () {
        root.setAttribute('data-ready', '1');
        tick();
        queue(fine, width);
      });

      startEmbers();
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

  /* --- embers ------------------------------------------------------------
     Warm flecks lifting off the fire. They run on their own rAF loop, on their
     own canvas, so the film underneath is repainted only when the scroll moves
     — and only while the hero is actually on screen. */
  function startEmbers() {
    if (!embers || !window.IntersectionObserver) return;
    var ec = embers.getContext('2d');
    var bits = [], live = false, raf = 0, ew = 0, eh = 0;

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = embers.getBoundingClientRect();
      ew = Math.round(r.width * dpr); eh = Math.round(r.height * dpr);
      if (embers.width !== ew || embers.height !== eh) { embers.width = ew; embers.height = eh; }
    }
    function seed(b, fresh) {
      b.x = Math.random() * ew;
      b.y = fresh ? eh + Math.random() * eh * 0.5 : Math.random() * eh;
      b.r = (0.6 + Math.random() * 1.9) * Math.min(window.devicePixelRatio || 1, 2);
      b.vy = -(0.15 + Math.random() * 0.5);
      b.drift = (Math.random() - 0.5) * 0.28;
      b.phase = Math.random() * Math.PI * 2;
      b.life = 0.35 + Math.random() * 0.65;
    }
    size();
    for (var i = 0; i < 46; i++) { bits.push({}); seed(bits[i], false); }

    function tick(t) {
      if (!live) return;
      ec.clearRect(0, 0, ew, eh);
      for (var i = 0; i < bits.length; i++) {
        var b = bits[i];
        b.y += b.vy;
        b.x += b.drift + Math.sin(t / 900 + b.phase) * 0.22;
        if (b.y < -8) seed(b, true);
        // brightest low down, guttering out as they rise
        var a = b.life * Math.max(0, Math.min(1, b.y / eh)) * (0.55 + 0.45 * Math.sin(t / 260 + b.phase));
        if (a <= 0) continue;
        ec.beginPath();
        ec.arc(b.x, b.y, b.r, 0, 6.2832);
        ec.fillStyle = 'rgba(255,' + (140 + ((b.r * 40) | 0)) + ',60,' + a.toFixed(3) + ')';
        ec.fill();
      }
      raf = requestAnimationFrame(tick);
    }

    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      if (vis === live) return;
      live = vis;
      if (live) { size(); raf = requestAnimationFrame(tick); }
      else { cancelAnimationFrame(raf); ec.clearRect(0, 0, ew, eh); }
    }, { threshold: 0 }).observe(root.querySelector('.pour__stage'));

    window.addEventListener('resize', size, { passive: true });
  }

  // Someone turning reduced motion on mid-visit gets the static hero too.
  var onPref = function () { if (reduce.matches) goStatic(); };
  if (reduce.addEventListener) reduce.addEventListener('change', onPref);
  else if (reduce.addListener) reduce.addListener(onPref);
})();
