/* =========================================================================
   Site chrome: age gate, header, mobile nav, scroll reveals, and the small
   figures that are read out of data.js so they are stated in exactly one place.
   ========================================================================= */
(function () {
  'use strict';

  var AF = window.AF;

  /* ---- age gate --------------------------------------------------------
     A spirits site has to ask. The answer is kept for the session only, so it
     is asked again tomorrow, and nothing behind it scrolls while it is up. */
  var gate = document.querySelector('[data-gate]');
  if (gate) {
    var KEY = 'af250.verified';
    var passed = false;
    try { passed = sessionStorage.getItem(KEY) === '1'; } catch (e) { passed = false; }

    if (passed) {
      gate.hidden = true;
    } else {
      document.body.setAttribute('data-gated', '1');
      var focusReturn = document.activeElement;
      var yes = gate.querySelector('[data-gate-yes]');
      if (yes) yes.focus();

      gate.addEventListener('click', function (ev) {
        var t = ev.target.closest('[data-gate-yes], [data-gate-no], [data-gate-back]');
        if (!t) return;
        if (t.hasAttribute('data-gate-yes')) {
          try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
          gate.hidden = true;
          document.body.removeAttribute('data-gated');
          if (focusReturn && focusReturn.focus) focusReturn.focus();
        } else if (t.hasAttribute('data-gate-no')) {
          gate.setAttribute('data-denied', '1');
          var back = gate.querySelector('[data-gate-back]');
          if (back) back.focus();
        } else {
          gate.removeAttribute('data-denied');
          if (yes) yes.focus();
        }
      });

      // Keep tab focus inside the gate while it is showing.
      gate.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Tab') return;
        var f = gate.querySelectorAll('button, [href]');
        var vis = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
        if (!vis.length) return;
        var first = vis[0], last = vis[vis.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      });
    }
  }

  /* ---- header ----------------------------------------------------------
     Light and transparent over the film, solid once past it. */
  var hdr = document.querySelector('[data-hdr]');
  if (hdr) {
    var overEl = document.querySelector('[data-hdr-over]');
    var lastY = window.scrollY;

    function syncHeader() {
      var y = window.scrollY;
      var overs = overEl ? y < overEl.offsetTop + overEl.offsetHeight - 90 : false;
      hdr.classList.toggle('hdr--over', overs);
      // Interior pages have no film behind the bar, so it is solid from the top.
      hdr.classList.toggle('hdr--solid', !overs && (y > 24 || !overEl));
      // Get out of the way scrolling down, come back scrolling up — but never
      // while the mobile menu is open.
      var open = nav && nav.getAttribute('data-open') === '1';
      hdr.classList.toggle('hdr--hidden', !open && y > lastY && y > 420);
      lastY = y;
    }

    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; syncHeader(); });
    }, { passive: true });
    syncHeader();
  }

  /* ---- mobile nav ------------------------------------------------------- */
  var nav = document.querySelector('[data-nav]');
  var toggle = document.querySelector('[data-nav-toggle]');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === '1';
      nav.setAttribute('data-open', open ? '0' : '1');
      toggle.setAttribute('aria-expanded', String(!open));
    });
    nav.addEventListener('click', function (ev) {
      if (ev.target.tagName !== 'A') return;
      nav.setAttribute('data-open', '0');
      toggle.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && nav.getAttribute('data-open') === '1') {
        nav.setAttribute('data-open', '0');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---- reveal on entry -------------------------------------------------- */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length) {
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

      Array.prototype.forEach.call(reveals, function (el, i) {
        // Stagger siblings so a row of cards arrives as a row, not all at once.
        var group = el.getAttribute('data-reveal');
        if (group === 'stagger') el.style.setProperty('--d', (i % 4) * 90 + 'ms');
        io.observe(el);
      });
    }
  }

  /* ---- figures from data.js --------------------------------------------- */
  if (AF) {
    var r = AF.release;
    var vals = {
      sets:      String(r.sets),
      claimed:   String(r.claimed),
      remaining: String(AF.remaining()),
      proof:     r.proof,
      abv:       r.abv,
      age:       r.age,
      volume:    r.volume,
      'box-price':    AF.money(AF.offer('box').price),
      'bottle-price': AF.money(AF.offer('bottle').price)
    };
    document.querySelectorAll('[data-val]').forEach(function (el) {
      var v = vals[el.getAttribute('data-val')];
      if (v != null) el.textContent = v;
    });

    // Every buy button points at the store named in data.js. The real URL is
    // in the markup too, so the links still work with scripting off; this just
    // keeps one place to change it.
    if (AF.store) {
      document.querySelectorAll('[data-store]').forEach(function (a) {
        a.href = AF.store;
      });
    }

    // The back-label specification, written out of data.js so the figures are
    // stated once and cannot drift between pages.
    var specEl = document.querySelector('[data-spec]');
    if (specEl) {
      specEl.innerHTML = AF.spec.map(function (row) {
        return '<div><dt>' + row[0] + '</dt><dd>' + row[1] + '</dd></div>';
      }).join('');
    }

    // The allocation bar on the reserve and box pages.
    document.querySelectorAll('[data-alloc-bar]').forEach(function (el) {
      el.style.width = Math.round((r.claimed / r.sets) * 100) + '%';
    });
  }

  /* ---- current year in the footer --------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
