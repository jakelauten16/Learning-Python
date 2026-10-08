/* Site chrome: sticky header, mobile nav, scroll reveals, parallax, marquee. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Links built in JavaScript go through here so a demo build (all pages in
     one document, routed by hash) links to the right place. */
  window.pageHref = function (page, anchor) {
    var id = page.replace(".html", "");
    if (window.FROSTED_DEMO) return "#/" + id + (anchor ? ":" + anchor : "");
    return page + (anchor ? "#" + anchor : "");
  };

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

    var year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    /* --- sticky header shadow --- */
    var header = document.querySelector(".site-header");
    var progress = document.querySelector(".progress");

    function onScroll() {
      var y = window.scrollY;
      if (header) header.classList.toggle("is-stuck", y > 12);
      if (progress) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
      }
      if (!reduced) {
        Array.prototype.forEach.call(document.querySelectorAll("[data-parallax]"), function (el) {
          var speed = parseFloat(el.getAttribute("data-parallax")) || 0.12;
          var rect = el.getBoundingClientRect();
          var offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -speed;
          el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
        });
      }
    }

    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { onScroll(); ticking = false; });
    }, { passive: true });
    onScroll();

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
