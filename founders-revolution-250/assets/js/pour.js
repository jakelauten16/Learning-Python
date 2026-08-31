/* =========================================================================
   The hero, in two phases.

   PHASE A — the camp.  A muted <video> plays the lead-in: two men at a fire
   with the Continental encampment behind them, and the bottle coming out.
   Linear playback needs no seeking, so it is smooth and keeps the source's
   full quality.

   PHASE B — the pour.  At the handoff the video pauses and a <canvas> takes
   over, painting a frame sequence chosen by how far down the track you have
   scrolled. Scrubbing a <video> with currentTime is jittery and unreliable —
   these clips carry only a few keyframes across ten seconds — so the pour is
   stills instead.

   The join is a cut in the source itself: at the handoff the camera cuts to
   the tight close-up with the stream already running, so pausing on that frame
   and revealing a canvas showing the same frame is invisible.

   Scrolling during phase A is never blocked. It ends the lead-in early and
   dissolves into the pour, because trapping someone on an autoplaying video is
   a worse sin than cutting a shot short.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.querySelector('[data-pour]');
  if (!root) return;

  var canvas = root.querySelector('.pour__canvas');
  var video  = root.querySelector('.pour__video');
  var railEl = root.querySelector('.pour__rail');
  var loadEl = root.querySelector('.pour__loading');
  var cues   = Array.prototype.slice.call(root.querySelectorAll('[data-cue]'));

  // How much of the cue timeline the lead-in owns. The video drives 0 → this,
  // the scrollbar drives this → 1. It is a story proportion, not a time one:
  // the lead-in is most of the film's seconds but none of its scroll.
  var LEAD_SHARE = 0.40;
  var FADE = 0.032;

  cues.forEach(function (el) {
    var parts = el.getAttribute('data-cue').split(',');
    el._in  = parseFloat(parts[0]);
    el._out = parts.length > 1 ? parseFloat(parts[1]) : Infinity;
    el._focusable = !!el.querySelector('a, button, input, select, textarea');
    el._t = -1;
  });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function goStatic() {
    root.classList.add('pour--static');
    root.setAttribute('data-phase', 'static');
    if (video) { try { video.pause(); } catch (e) {} }
    cues.forEach(function (el) {
      el.style.setProperty('--t', 1);
      el.removeAttribute('data-hidden');
      el.removeAttribute('inert');
    });
  }
  if (reduce.matches) { goStatic(); return; }

  /* --- the lead-in ------------------------------------------------------
     Sources are attached here, not in the markup, so reduced-motion visitors
     never fetch a film they will not watch. Done before the manifest request
     so the video starts arriving immediately. */
  function attachLead() {
    if (!video) return false;
    var webm = video.getAttribute('data-src-webm');
    var mp4  = video.getAttribute('data-src-mp4');
    var add = function (src, type) {
      if (!src) return;
      var el = document.createElement('source');
      el.src = src; el.type = type;
      video.appendChild(el);
    };
    add(webm, 'video/webm');   // smaller, and covers Chromium builds without H.264
    add(mp4, 'video/mp4');
    video.load();
    return true;
  }

  /* --- frame store ------------------------------------------------------ */
  var frames = [], ready = [], count = 0, conf = null, loadedN = 0, width = 1280;

  function srcFor(i, w) {
    return 'assets/media/frames/' + w + '/f' + String(i + 1).padStart(3, '0') + '.webp';
  }
  function pickWidth(widths) {
    var need = Math.min(window.innerWidth, window.innerHeight * 1.9) *
               Math.min(window.devicePixelRatio || 1, 2);
    var sorted = widths.slice().sort(function (a, b) { return a - b; });
    for (var i = 0; i < sorted.length; i++) if (sorted[i] >= need) return sorted[i];
    return sorted[sorted.length - 1];
  }

  /* --- drawing ---------------------------------------------------------- */
  var BAND = 0.52;   // share of a portrait stage the picture band occupies
  var ctx = canvas.getContext('2d', { alpha: false });
  var cw = 0, ch = 0, drawn = '', portrait = false;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    cw = Math.round(r.width * dpr);
    ch = Math.round(r.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch;
      drawn = '';
    }
    // Covering a phone's width with a 16:9 still means cropping the sides, and
    // the taller the band the harder that crop bites. A band across the top
    // shows far more of the frame and leaves the copy room below.
    portrait = r.height > r.width * 1.3;
  }

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
      var g = ctx.createLinearGradient(0, ph * 0.62, 0, ph);
      g.addColorStop(0, 'rgba(16,14,12,0)');
      g.addColorStop(1, 'rgba(16,14,12,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, ph * 0.62, cw, ph * 0.38 + 1);
    } else {
      var sc = Math.max(cw / iw, ch / ih);
      ctx.drawImage(img, (cw - iw * sc) / 2, (ch - ih * sc) / 2, iw * sc, ih * sc);
    }
  }

  // 24fps of footage spread over thousands of pixels of scroll lands between
  // frames most of the time. Drawing the frame we are between at partial alpha
  // dissolves one into the next, which on real footage — already carrying its
  // own motion blur — reads as movement rather than as two pictures.
  function paintAt(pos) {
    var i0 = Math.floor(pos);
    if (i0 < 0) i0 = 0; else if (i0 > count - 1) i0 = count - 1;
    var frac = pos - i0;
    var i1 = i0 + 1 > count - 1 ? count - 1 : i0 + 1;

    var a = nearest(i0);
    if (a < 0) return false;
    var b = frac > 0.02 ? nearest(i1) : a;

    var key = a + ':' + b + ':' + (frac * 60 | 0) + ':' + cw + 'x' + ch;
    if (key === drawn) return true;

    ctx.fillStyle = '#100e0c';
    ctx.fillRect(0, 0, cw, ch);
    drawCover(frames[a]);
    if (b >= 0 && b !== a) {
      ctx.globalAlpha = frac;
      drawCover(frames[b]);
      ctx.globalAlpha = 1;
    }
    drawn = key;
    return true;
  }

  /* --- loading ---------------------------------------------------------- */
  function load(i, done) {
    if (frames[i]) { done(); return; }
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      frames[i] = img; ready[i] = true;
      loadedN++;
      if (loadEl) loadEl.style.setProperty('--loaded', loadedN / count);
      if (!drawn) paintAt(0); else tick();
      done();
    };
    img.onerror = done;
    img.src = srcFor(i, width);
    frames[i] = img;
  }

  function queue(order, onDone) {
    var next = 0, active = 0, LIMIT = 8, fired = false;
    function pump() {
      while (active < LIMIT && next < order.length) {
        active++;
        load(order[next++], function () {
          active--;
          if (!fired && next >= order.length && active === 0) { fired = true; onDone && onDone(); }
          pump();
        });
      }
      if (!fired && next >= order.length && active === 0) { fired = true; onDone && onDone(); }
    }
    pump();
  }

  /* --- progress --------------------------------------------------------- */
  function scrollFraction() {
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
      if (t < 0.01) {
        el.setAttribute('data-hidden', '');
        if (el._focusable) el.setAttribute('inert', '');
      } else {
        el.removeAttribute('data-hidden');
        if (el._focusable) el.removeAttribute('inert');
      }
    }
  }

  /* --- the two phases --------------------------------------------------- */
  var phase = 'lead';
  var target = 0, shown = -1, running = false, lastT = 0;
  var EASE = 0.15, SNAP = 0.00018;

  function paintChrome(p) {
    applyCues(p);
    if (railEl) railEl.style.setProperty('--fill', smoothstep(LEAD_SHARE, 0.94, p));
  }

  function toScrub(viaScroll) {
    if (phase === 'scrub') return;
    phase = 'scrub';
    if (video) { try { video.pause(); } catch (e) {} }
    // Paint the first pour frame before revealing the canvas, so the swap
    // lands on a picture rather than on an empty buffer.
    resize();
    paintAt(0);
    root.setAttribute('data-phase', viaScroll ? 'scrub-cut' : 'scrub');
    shown = -1;
    tick();
  }

  function loop(now) {
    if (phase === 'lead') {
      running = false;
      return;   // the lead-in drives itself from the video clock
    }
    target = LEAD_SHARE + (1 - LEAD_SHARE) * scrollFraction();
    if (shown < 0) shown = target;
    if (!lastT) lastT = now - 16.7;

    // Frame-rate independent easing: a plain lerp closes the gap twice as fast
    // on a 120Hz display as on a 60Hz one. The clamp stops a backgrounded tab,
    // which can hand back a gap of seconds, snapping the whole pour at once.
    var dt = Math.min(now - lastT || 16.7, 50);
    lastT = now;
    var k = 1 - Math.pow(1 - EASE, dt / 16.667);

    var d = target - shown;
    var done = Math.abs(d) < SNAP;
    shown = done ? target : shown + d * k;

    paintChrome(shown);
    if (count) {
      var within = (shown - LEAD_SHARE) / (1 - LEAD_SHARE);
      paintAt(Math.max(0, Math.min(1, within)) * (count - 1));
    }

    if (done) running = false;
    else requestAnimationFrame(loop);
  }
  function tick() {
    if (phase !== 'scrub') return;
    if (!running) { running = true; lastT = 0; requestAnimationFrame(loop); }
  }

  /* --- go --------------------------------------------------------------- */
  attachLead();

  fetch('assets/media/frames/manifest.json')
    .then(function (r) {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    })
    .then(function (m) {
      conf = m;
      count = m.count;
      width = pickWidth(m.widths);
      resize();

      // Every frame, nearest-the-start first. There are only 85 of them and the
      // lead-in buys several seconds of cover, so by the time anyone reaches the
      // pour the sequence is usually complete.
      var order = [];
      for (var i = 0; i < count; i++) order.push(i);
      queue(order, function () { root.setAttribute('data-ready', '1'); });

      /* phase A: let the video run, and watch its clock for the handoff */
      if (video) {
        var watch = function () {
          if (phase !== 'lead') return;
          if (video.currentTime >= m.handoff) { toScrub(false); return; }
          paintChrome((video.currentTime / m.leadEnd) * LEAD_SHARE);
          requestAnimationFrame(watch);
        };
        video.addEventListener('loadeddata', function () { requestAnimationFrame(watch); });
        video.addEventListener('ended', function () { toScrub(false); });
        video.addEventListener('error', function () { toScrub(false); });

        var play = video.play();
        if (play && play.catch) play.catch(function () { toScrub(false); });
        if (video.readyState >= 2) requestAnimationFrame(watch);

        // Watchdog. Autoplay can be refused silently (iOS low power mode, data
        // saver), and a Chromium built without the proprietary H.264 decoder
        // will sit at readyState 0 forever without ever firing an error. Either
        // way nobody should be left staring at a frozen poster: if the clock
        // has not moved shortly after load, hand over to the pour.
        setTimeout(function () {
          if (phase === 'lead' && video.currentTime < 0.05) toScrub(false);
        }, 1800);
      } else {
        toScrub(false);
      }

      /* any scroll ends the lead-in — never trap someone on a playing video */
      window.addEventListener('scroll', function () {
        if (phase === 'lead') {
          if (window.scrollY > 6) toScrub(true);
          return;
        }
        tick();
      }, { passive: true });

      window.addEventListener('resize', function () {
        resize(); shown = -1; drawn = ''; tick();
      }, { passive: true });
      if (window.ResizeObserver) {
        new ResizeObserver(function () { resize(); tick(); }).observe(canvas);
      }
      paintChrome(0);
    })
    .catch(function (err) {
      if (window.console) console.warn('[pour] falling back to static hero:', err.message);
      goStatic();
    });

  var onPref = function () { if (reduce.matches) goStatic(); };
  if (reduce.addEventListener) reduce.addEventListener('change', onPref);
  else if (reduce.addListener) reduce.addListener(onPref);
})();
