/* Site chrome: sticky header, mobile nav, scroll reveals, parallax, marquee. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Links built in JavaScript go through here so a demo build (all pages in
     one document, routed by hash) links to the right place. */
  window.pageHref = function (page, anchor) {
    var id = page.replace(".html", "");
    if (window.FROSTED_DEMO) return "#/" + id + (anchor ? ":" + anchor : "");
    return page + (anchor ? "#group-" + anchor : "");
  };

  /* The page follows the viewer's system setting until they say otherwise;
     the choice is remembered on their own device only. */
  (function () {
    var KEY = "frostedfrog.theme";
    var saved = null;
    try { saved = window.localStorage.getItem(KEY); } catch (e) { /* private mode */ }
    if (saved === "dark" || saved === "light") {
      document.documentElement.setAttribute("data-theme", saved);
    }

    window.toggleTheme = function () {
      var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var current = document.documentElement.getAttribute("data-theme") || (dark ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { window.localStorage.setItem(KEY, next); } catch (e) { /* private mode */ }
      var btn = document.querySelector(".theme-toggle");
      if (btn) {
        btn.textContent = next === "dark" ? "Light" : "Dark";
        btn.setAttribute("aria-label", "Switch to " + (next === "dark" ? "light" : "dark") + " mode");
      }
    };
  })();

  document.addEventListener("DOMContentLoaded", function () {
    /* --- fill anything tagged with a config key --- */
    Array.prototype.forEach.call(document.querySelectorAll("[data-config]"), function (el) {
      var path = el.getAttribute("data-config").split(".");
      var value = path.reduce(function (o, k) { return o && o[k]; }, SHOP_CONFIG);
      if (value === undefined || value === null) return;
      if (el.tagName === "A") {
        var href = el.getAttribute("href") || "";
        if (!href || href === "#") {
          el.href = /@/.test(value) ? "mailto:" + value
            : /^\+?[\d\s().-]+$/.test(value) ? "tel:" + String(value).replace(/[^\d+]/g, "")
            : value;
        }
        if (!el.textContent.trim()) el.textContent = value;
      } else {
        el.textContent = value;
      }
    });

    /* --- the weekly schedule, wherever it's referenced --- */
    if (window.Schedule) {
      Array.prototype.forEach.call(document.querySelectorAll("[data-schedule-summary]"), function (el) {
        el.textContent = Schedule.summary();
      });

      Array.prototype.forEach.call(document.querySelectorAll("[data-order-status]"), function (el) {
        var open = Schedule.isOrderingOpen();
        var paused = SHOP_CONFIG.schedule.ordersPaused;

        /* While the shop is paused there is no reopening date to give, and
           naming one we might miss is worse than saying soon. */
        if (paused) {
          el.className = "week__status";
          el.innerHTML =
            '<span class="dot" aria-hidden="true"></span>' +
            "<strong>Not taking orders yet</strong>" +
            "<span>" + (SHOP_CONFIG.schedule.pausedMessage || "") + "</span>";
          return;
        }

        var pickups = Schedule.pickupOptions();
        var when = open
          ? "Ordering closes " + Schedule.ordersClose().toLocaleDateString(undefined, { weekday: "long" }) + " night"
          : "Ordering reopens " + Schedule.ordersOpen().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
        el.className = "week__status" + (open ? " is-open" : "");
        el.innerHTML =
          '<span class="dot" aria-hidden="true"></span>' +
          "<strong>" + (open ? "Ordering is open" : "Ordering is closed") + "</strong>" +
          "<span>" + when + " · pickup " +
          pickups.map(function (p) { return p.label + " " + p.shortDate; }).join(" or ") + "</span>";
      });
    }

    var weekly = document.querySelector("[data-weekly-note]");
    if (weekly && typeof CATEGORIES !== "undefined") {
      var g = CATEGORIES.filter(function (c) { return c.note; })[0];
      if (g) weekly.textContent = g.note;
      else weekly.remove();
    }

    var toggleBtn = document.querySelector(".theme-toggle");
    if (toggleBtn) {
      var isDark = (document.documentElement.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
      toggleBtn.textContent = isDark ? "Light" : "Dark";
      toggleBtn.setAttribute("aria-label", "Switch to " + (isDark ? "light" : "dark") + " mode");
      toggleBtn.addEventListener("click", window.toggleTheme);
    }

    var year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    /* --- sticky header state, without a scroll listener ---
       An observer watches a one-pixel sentinel at the top of the page, so the
       browser does the work off the main thread. The reading-progress bar is
       driven by a CSS scroll timeline where the browser supports one. */
    var header = document.querySelector(".site-header");
    if (header && "IntersectionObserver" in window) {
      var sentinel = document.createElement("div");
      sentinel.setAttribute("aria-hidden", "true");
      sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none";
      document.body.prepend(sentinel);
      new IntersectionObserver(function (entries) {
        header.classList.toggle("is-stuck", !entries[0].isIntersecting);
      }, { threshold: 0 }).observe(sentinel);
    }

    if (!CSS.supports("animation-timeline: scroll()")) {
      var bar = document.querySelector(".progress");
      if (bar) bar.remove();
    }

    /* --- parallax, on the compositor's schedule --- */
    var parallax = document.querySelectorAll("[data-parallax]");
    if (parallax.length && !reduced && "IntersectionObserver" in window) {
      var ticking = false;
      var inView = [];
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var i = inView.indexOf(entry.target);
          if (entry.isIntersecting && i === -1) inView.push(entry.target);
          if (!entry.isIntersecting && i > -1) inView.splice(i, 1);
        });
        loop();
      }, { rootMargin: "20% 0px" });
      Array.prototype.forEach.call(parallax, function (el) { io2.observe(el); });

      function loop() {
        if (!inView.length || ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          inView.forEach(function (el) {
            var speed = parseFloat(el.getAttribute("data-parallax")) || 0.12;
            var rect = el.getBoundingClientRect();
            var offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -speed;
            el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
          });
          ticking = false;
          if (inView.length) loop();
        });
      }
    }

    /* --- mobile nav --- */
    var toggle = document.querySelector(".nav__toggle");
    var links = document.querySelector(".nav__links");
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    /* --- scroll reveal --- */
    var targets = document.querySelectorAll("[data-reveal]");
    if (reduced || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(targets, function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseInt(el.getAttribute("data-delay") || "0", 10);
          setTimeout(function () { el.classList.add("is-visible"); }, delay);
          io.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
      window.revealObserver = io;
    }

    /* --- marquee: duplicate the track so the loop is seamless --- */
    var track = document.querySelector(".marquee__track");
    if (track) track.innerHTML = track.innerHTML + track.innerHTML;
  });

  /* Watch for cards added after load (shop filters, featured grid). */
  window.observeReveals = function (root) {
    var io = window.revealObserver;
    var nodes = (root || document).querySelectorAll("[data-reveal]:not(.is-visible)");
    Array.prototype.forEach.call(nodes, function (el) {
      if (io) io.observe(el); else el.classList.add("is-visible");
    });
  };
})();
