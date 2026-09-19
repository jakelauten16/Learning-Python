/* Renders product cards, category cards, the product detail modal, and the
   shop page's category filters. Used by index.html and shop.html. */
(function () {
  "use strict";

  function money(n) { return "$" + Number(n).toFixed(2); }

  function categoryName(id) {
    var c = CATEGORIES.filter(function (c) { return c.id === id; })[0];
    return c ? c.name : id;
  }

  function cardHTML(p, i) {
    var sold = p.available === false;
    return (
      '<article class="card" data-reveal="zoom" data-delay="' + ((i % 3) * 110) + '">' +
        '<div class="card__media">' +
          '<span class="card__tag">' + categoryName(p.category) + "</span>" +
          '<img src="' + p.image + '" alt="' + p.name + '" loading="lazy">' +
        "</div>" +
        '<div class="card__body">' +
          "<h3>" + p.name + "</h3>" +
          '<p class="card__desc">' + p.desc + "</p>" +
          '<div class="card__foot">' +
            '<div class="price">' + money(p.price) + "<small>" + (p.unit || "each") + "</small></div>" +
            (sold
              ? '<span class="soldout">Sold out</span>'
              : '<button class="btn btn--sm btn--ghost" data-product="' + p.id + '">Pre-order</button>') +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderGrid(el, list) {
    el.innerHTML = list.length
      ? list.map(cardHTML).join("")
      : '<p class="empty">Nothing in this section right now — check back soon.</p>';
    if (window.observeReveals) window.observeReveals(el);
  }

  /* --- product modal ----------------------------------------------------- */
  var modalHost;

  function ensureModal() {
    if (modalHost) return modalHost;
    modalHost = document.createElement("div");
    modalHost.className = "modal-backdrop";
    modalHost.innerHTML = '<div class="modal" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(modalHost);
    modalHost.addEventListener("click", function (e) {
      if (e.target === modalHost || e.target.closest(".modal__close")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
    return modalHost;
  }

  function closeModal() {
    if (!modalHost) return;
    modalHost.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function openModal(id) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var host = ensureModal();
    var min = p.min || 1;
    var step = min > 1 ? min : 1;

    var optionsHTML = (p.options || []).map(function (group, gi) {
      return (
        '<span class="legend">' + group.label + "</span>" +
        '<div class="choice-row" data-group="' + gi + '">' +
          group.choices.map(function (c, ci) {
            return '<button type="button" class="choice' + (ci === 0 ? " is-active" : "") +
              '" data-choice="' + ci + '">' + c.name +
              (c.price ? " <em style=\"font-style:normal;opacity:.7\">+" + money(c.price) + "</em>" : "") +
              "</button>";
          }).join("") +
        "</div>"
      );
    }).join("");

    host.querySelector(".modal").innerHTML =
      '<div class="modal__media"><img src="' + p.image + '" alt="' + p.name + '"></div>' +
      '<div class="modal__body">' +
        '<button class="modal__close" aria-label="Close">&times;</button>' +
        '<span class="eyebrow">' + categoryName(p.category) + "</span>" +
        "<h3>" + p.name + "</h3>" +
        "<p>" + p.desc + "</p>" +
        '<p class="price" data-modal-price>' + money(p.price) + "<small>" + (p.unit || "each") + "</small></p>" +
        optionsHTML +
        '<div class="field"><label for="m-qty">Quantity' + (min > 1 ? " (minimum " + min + ")" : "") + "</label>" +
          '<input id="m-qty" type="number" min="' + min + '" step="' + step + '" value="' + min + '"></div>' +
        '<div class="field"><label for="m-note">Notes for the baker <span style="text-transform:none;letter-spacing:0">(colors, message on the cake, allergies)</span></label>' +
          '<textarea id="m-note" placeholder="Sage and gold, please — &quot;Happy Birthday Ellie&quot; on top."></textarea></div>' +
        '<button class="btn btn--block" data-add="' + p.id + '">Add to order</button>' +
        '<p class="hint" style="margin-top:.8rem">Orders need ' + SHOP_CONFIG.leadTimeDays + " days' notice. You'll choose your pickup day at checkout.</p>" +
      "</div>";

    var selected = (p.options || []).map(function (g) { return g.choices[0]; });

    function refreshPrice() {
      var extra = selected.reduce(function (s, c) { return s + (c.price || 0); }, 0);
      host.querySelector("[data-modal-price]").innerHTML =
        money(p.price + extra) + "<small>" + (p.unit || "each") + "</small>";
    }

    host.querySelector(".modal").addEventListener("click", function (e) {
      var choice = e.target.closest(".choice");
      if (choice) {
        var row = choice.parentNode;
        var gi = parseInt(row.getAttribute("data-group"), 10);
        var ci = parseInt(choice.getAttribute("data-choice"), 10);
        Array.prototype.forEach.call(row.children, function (b) { b.classList.remove("is-active"); });
        choice.classList.add("is-active");
        selected[gi] = p.options[gi].choices[ci];
        refreshPrice();
      }
      var add = e.target.closest("[data-add]");
      if (add) {
        var qty = parseInt(host.querySelector("#m-qty").value, 10) || min;
        var note = host.querySelector("#m-note").value.trim();
        var opts = {};
        (p.options || []).forEach(function (g, gi2) { opts[g.label] = selected[gi2]; });
        window.Cart.add(p.id, qty, opts, note);
        closeModal();
        window.Cart.open();
      }
    });

    host.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-product]");
    if (trigger) {
      e.preventDefault();
      openModal(trigger.getAttribute("data-product"));
    }
  });

  /* --- page wiring ------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    var featured = document.querySelector("[data-featured]");
    if (featured) {
      renderGrid(featured, PRODUCTS.filter(function (p) { return p.featured; }));
    }

    var cats = document.querySelector("[data-categories]");
    if (cats) {
      cats.innerHTML = CATEGORIES.map(function (c, i) {
        return (
          '<a class="cat-card" href="shop.html#' + c.id + '" data-reveal data-delay="' + ((i % 3) * 110) + '">' +
            '<img src="' + c.image + '" alt="' + c.name + '" loading="lazy">' +
            '<div class="cat-card__cap"><h3>' + c.name + "</h3><p>" + c.blurb + "</p></div>" +
          "</a>"
        );
      }).join("");
      if (window.observeReveals) window.observeReveals(cats);
    }

    var shopGrid = document.querySelector("[data-shop-grid]");
    var filterBar = document.querySelector("[data-filters]");
    if (shopGrid) {
      var active = (location.hash || "").replace("#", "") || "all";
      if (active !== "all" && !CATEGORIES.some(function (c) { return c.id === active; })) active = "all";

      if (filterBar) {
        filterBar.innerHTML =
          '<button class="filter" data-filter="all">Everything</button>' +
          CATEGORIES.map(function (c) {
            return '<button class="filter" data-filter="' + c.id + '">' + c.name + "</button>";
          }).join("");
      }

      function apply(id) {
        active = id;
        renderGrid(shopGrid, id === "all" ? PRODUCTS : PRODUCTS.filter(function (p) { return p.category === id; }));
        if (filterBar) {
          Array.prototype.forEach.call(filterBar.children, function (b) {
            b.classList.toggle("is-active", b.getAttribute("data-filter") === id);
          });
        }
      }

      if (filterBar) {
        filterBar.addEventListener("click", function (e) {
          var b = e.target.closest("[data-filter]");
          if (!b) return;
          history.replaceState(null, "", b.getAttribute("data-filter") === "all" ? "#" : "#" + b.getAttribute("data-filter"));
          apply(b.getAttribute("data-filter"));
        });
      }
      apply(active);
    }

    var quotes = document.querySelector("[data-testimonials]");
    if (quotes) {
      quotes.innerHTML = TESTIMONIALS.map(function (t, i) {
        return '<figure class="quote" data-reveal data-delay="' + (i * 130) + '"><p>&ldquo;' + t.quote +
          '&rdquo;</p><cite>' + t.name + "</cite></figure>";
      }).join("");
      if (window.observeReveals) window.observeReveals(quotes);
    }

    var faqs = document.querySelector("[data-faqs]");
    if (faqs) {
      faqs.innerHTML = FAQS.map(function (f, i) {
        return '<details class="faq" data-reveal data-delay="' + (i * 70) + '"><summary>' + f.q +
          "</summary><p>" + f.a + "</p></details>";
      }).join("");
      if (window.observeReveals) window.observeReveals(faqs);
    }
  });
})();
