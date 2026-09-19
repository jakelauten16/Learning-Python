/* Cart — stored in localStorage so it survives a refresh, a closed tab, and a
   customer who wanders off mid-order. */
(function (window) {
  "use strict";

  var KEY = "frostedfrog.cart.v1";
  var listeners = [];

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    try { window.localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* private mode */ }
    listeners.forEach(function (fn) { fn(items); });
  }

  function money(n) {
    return "$" + Number(n).toFixed(2);
  }

  function lineKey(id, options) {
    return id + "|" + Object.keys(options || {}).sort().map(function (k) {
      return k + ":" + options[k].name;
    }).join(",");
  }

  function product(id) {
    return PRODUCTS.filter(function (p) { return p.id === id; })[0];
  }

  var Cart = {
    items: read,

    add: function (id, qty, options, note) {
      var p = product(id);
      if (!p || p.available === false) return;
      var opts = options || {};
      var extra = Object.keys(opts).reduce(function (sum, k) { return sum + (opts[k].price || 0); }, 0);
      var items = read();
      var key = lineKey(id, opts);
      var existing = items.filter(function (i) { return i.key === key; })[0];
      var amount = Math.max(qty || p.min || 1, p.min || 1);

      if (existing) {
        existing.qty += amount;
        if (note) existing.note = note;
      } else {
        items.push({
          key: key,
          id: id,
          name: p.name,
          image: p.image,
          unit: p.unit || "",
          price: p.price + extra,
          qty: amount,
          min: p.min || 1,
          options: opts,
          note: note || "",
        });
      }
      write(items);
      Cart.toast(p.name + " added to your order");
      return items;
    },

    setQty: function (key, qty) {
      var items = read();
      items.forEach(function (i) { if (i.key === key) i.qty = Math.max(qty, i.min || 1); });
      write(items);
    },

    remove: function (key) {
      write(read().filter(function (i) { return i.key !== key; }));
    },

    clear: function () { write([]); },

    count: function () {
      return read().reduce(function (n, i) { return n + i.qty; }, 0);
    },

    subtotal: function () {
      return read().reduce(function (n, i) { return n + i.price * i.qty; }, 0);
    },

    totals: function (opts) {
      opts = opts || {};
      var subtotal = Cart.subtotal();
      var delivery = opts.delivery ? SHOP_CONFIG.delivery.fee : 0;
      var tax = (subtotal + delivery) * (SHOP_CONFIG.taxRate || 0);
      return {
        subtotal: subtotal,
        delivery: delivery,
        tax: tax,
        total: subtotal + delivery + tax,
      };
    },

    onChange: function (fn) { listeners.push(fn); return fn; },

    money: money,

    toast: function (message) {
      var el = document.querySelector(".toast");
      if (!el) {
        el = document.createElement("div");
        el.className = "toast";
        el.setAttribute("role", "status");
        document.body.appendChild(el);
      }
      el.textContent = message;
      el.classList.add("is-open");
      clearTimeout(el._t);
      el._t = setTimeout(function () { el.classList.remove("is-open"); }, 2600);
    },
  };

  /* ---- drawer ---------------------------------------------------------- */
  function drawerMarkup() {
    return (
      '<div class="drawer-backdrop" data-cart-close></div>' +
      '<aside class="drawer" role="dialog" aria-modal="true" aria-label="Your order">' +
        '<div class="drawer__head">' +
          '<h3>Your Order</h3>' +
          '<button class="drawer__close" data-cart-close aria-label="Close order">&times;</button>' +
        '</div>' +
        '<div class="drawer__body" data-cart-lines></div>' +
        '<div class="drawer__foot" data-cart-foot></div>' +
      '</aside>'
    );
  }

  function renderDrawer() {
    var lines = document.querySelector("[data-cart-lines]");
    var foot = document.querySelector("[data-cart-foot]");
    if (!lines || !foot) return;
    var items = read();

    if (!items.length) {
      lines.innerHTML =
        '<div class="empty"><p class="script" style="font-size:2rem">Nothing here yet</p>' +
        '<p>Pick out something sweet and it will show up right here.</p>' +
        '<a class="btn btn--ghost btn--sm" href="shop.html">Browse the bakery</a></div>';
      foot.innerHTML = "";
      return;
    }

    lines.innerHTML = items.map(function (i) {
      var opts = Object.keys(i.options || {}).map(function (k) { return i.options[k].name; }).join(" · ");
      return (
        '<div class="line">' +
          '<img src="' + i.image + '" alt="" loading="lazy">' +
          '<div>' +
            '<h4>' + i.name + '</h4>' +
            (opts ? '<p class="line__opts">' + opts + "</p>" : "") +
            '<div class="qty">' +
              '<button type="button" data-qty-down="' + i.key + '" aria-label="Decrease quantity">&minus;</button>' +
              "<span>" + i.qty + "</span>" +
              '<button type="button" data-qty-up="' + i.key + '" aria-label="Increase quantity">+</button>' +
            "</div>" +
          "</div>" +
          '<div><div class="line__price">' + money(i.price * i.qty) + "</div>" +
          '<button type="button" class="line__remove" data-remove="' + i.key + '">Remove</button></div>' +
        "</div>"
      );
    }).join("");

    foot.innerHTML =
      '<div class="totals"><div><span>Subtotal</span><span>' + money(Cart.subtotal()) + "</span></div>" +
      '<div><span>Taxes &amp; pickup details</span><span>at checkout</span></div></div>' +
      '<a class="btn btn--block" href="order.html" style="margin-top:1rem">Review &amp; pre-order</a>';
  }

  function openDrawer() {
    document.querySelector(".drawer-backdrop").classList.add("is-open");
    document.querySelector(".drawer").classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    var b = document.querySelector(".drawer-backdrop");
    var d = document.querySelector(".drawer");
    if (b) b.classList.remove("is-open");
    if (d) d.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function syncBadge() {
    var n = Cart.count();
    Array.prototype.forEach.call(document.querySelectorAll("[data-cart-count]"), function (el) {
      el.textContent = n;
      var btn = el.closest(".cart-btn");
      if (btn) {
        btn.classList.remove("bump");
        void btn.offsetWidth;
        btn.classList.add("bump");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.querySelector(".drawer")) {
      var host = document.createElement("div");
      host.innerHTML = drawerMarkup();
      while (host.firstChild) document.body.appendChild(host.firstChild);
    }
    renderDrawer();
    syncBadge();

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("[data-cart-open]")) { e.preventDefault(); renderDrawer(); openDrawer(); }
      if (t.closest("[data-cart-close]")) { closeDrawer(); }
      var down = t.closest("[data-qty-down]");
      var up = t.closest("[data-qty-up]");
      var rm = t.closest("[data-remove]");
      if (down) {
        var k = down.getAttribute("data-qty-down");
        var it = read().filter(function (i) { return i.key === k; })[0];
        if (it) Cart.setQty(k, it.qty - (it.min > 1 ? it.min : 1));
      }
      if (up) {
        var k2 = up.getAttribute("data-qty-up");
        var it2 = read().filter(function (i) { return i.key === k2; })[0];
        if (it2) Cart.setQty(k2, it2.qty + (it2.min > 1 ? it2.min : 1));
      }
      if (rm) Cart.remove(rm.getAttribute("data-remove"));
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });

    Cart.onChange(function () { renderDrawer(); syncBadge(); });
  });

  Cart.open = openDrawer;
  Cart.close = closeDrawer;
  window.Cart = Cart;
})(window);
