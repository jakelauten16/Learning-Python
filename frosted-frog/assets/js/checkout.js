/* Order page: review the cart, choose pickup or delivery, pick a date and
   window, then pay (Stripe) or submit the request (deposit mode). */
(function () {
  "use strict";

  function money(n) { return "$" + Number(n).toFixed(2); }
  function $(sel) { return document.querySelector(sel); }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function earliestDate() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + SHOP_CONFIG.leadTimeDays);
    return d;
  }

  function pickupDates() {
    var out = [];
    var d = earliestDate();
    var end = new Date(d);
    end.setDate(end.getDate() + SHOP_CONFIG.maxDaysOut);
    while (d <= end) {
      if (SHOP_CONFIG.pickupDays.indexOf(d.getDay()) !== -1) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  function prettyDate(d) {
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = $("[data-order-form]");
    if (!form) return;

    var linesEl = $("[data-order-lines]");
    var totalsEl = $("[data-order-totals]");
    var dateSel = $("#pickup-date");
    var windowSel = $("#pickup-window");
    var methodRow = $("[data-method]");
    var deliveryFields = $("[data-delivery-fields]");
    var submitBtn = $("[data-submit]");
    var statusEl = $("[data-status]");
    var method = "pickup";

    /* --- fulfillment options --- */
    if (methodRow) {
      var methods = ['<button type="button" class="choice is-active" data-set-method="pickup">Pickup</button>'];
      if (SHOP_CONFIG.delivery.enabled) {
        methods.push('<button type="button" class="choice" data-set-method="delivery">Local delivery &middot; ' +
          money(SHOP_CONFIG.delivery.fee) + "</button>");
      }
      methodRow.innerHTML = methods.join("");
      methodRow.addEventListener("click", function (e) {
        var b = e.target.closest("[data-set-method]");
        if (!b) return;
        Array.prototype.forEach.call(methodRow.children, function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        method = b.getAttribute("data-set-method");
        if (deliveryFields) deliveryFields.hidden = method !== "delivery";
        var addr = $("#address");
        if (addr) addr.required = method === "delivery";
        renderTotals();
      });
    }

    /* --- date + window --- */
    if (dateSel) {
      dateSel.innerHTML = '<option value="">Choose a date</option>' +
        pickupDates().map(function (d) {
          return '<option value="' + iso(d) + '">' + prettyDate(d) + "</option>";
        }).join("");
    }
    if (windowSel) {
      windowSel.innerHTML = '<option value="">Choose a time</option>' +
        SHOP_CONFIG.pickupWindows.map(function (w) { return "<option>" + w + "</option>"; }).join("");
    }

    /* --- order review --- */
    function renderLines() {
      var items = Cart.items();
      if (!items.length) {
        linesEl.innerHTML = '<div class="empty"><p class="script" style="font-size:2rem">Your order is empty</p>' +
          '<p>Add a few things and come back to check out.</p>' +
          '<a class="btn btn--ghost btn--sm" href="shop.html">Browse the bakery</a></div>';
        form.hidden = true;
        return;
      }
      form.hidden = false;
      linesEl.innerHTML = items.map(function (i) {
        var opts = Object.keys(i.options || {}).map(function (k) { return i.options[k].name; }).join(" · ");
        return (
          '<div class="line">' +
            '<img src="' + i.image + '" alt="" loading="lazy">' +
            "<div><h4>" + i.name + "</h4>" +
              (opts ? '<p class="line__opts">' + opts + "</p>" : "") +
              (i.note ? '<p class="line__opts"><em>&ldquo;' + i.note + "&rdquo;</em></p>" : "") +
              '<div class="qty">' +
                '<button type="button" data-qty-down="' + i.key + '" aria-label="Decrease quantity">&minus;</button>' +
                "<span>" + i.qty + "</span>" +
                '<button type="button" data-qty-up="' + i.key + '" aria-label="Increase quantity">+</button>' +
              "</div></div>" +
            '<div><div class="line__price">' + money(i.price * i.qty) + "</div>" +
            '<button type="button" class="line__remove" data-remove="' + i.key + '">Remove</button></div>' +
          "</div>"
        );
      }).join("");
    }

    function renderTotals() {
      var isDelivery = method === "delivery";
      var t = Cart.totals({ delivery: isDelivery });
      totalsEl.innerHTML =
        '<div class="totals">' +
          "<div><span>Subtotal</span><span>" + money(t.subtotal) + "</span></div>" +
          (isDelivery ? "<div><span>Delivery</span><span>" + money(t.delivery) + "</span></div>" : "") +
          (SHOP_CONFIG.taxRate ? "<div><span>Tax</span><span>" + money(t.tax) + "</span></div>" : "") +
          '<div class="total"><span>Total</span><span>' + money(t.total) + "</span></div>" +
        "</div>";

      var below = isDelivery && t.subtotal < SHOP_CONFIG.delivery.minimum;
      if (submitBtn) {
        submitBtn.disabled = below;
        submitBtn.textContent = below
          ? "Delivery minimum is " + money(SHOP_CONFIG.delivery.minimum)
          : SHOP_CONFIG.paymentMode === "stripe" ? "Pay & place pre-order" : "Place pre-order request";
      }
    }

    Cart.onChange(function () { renderLines(); renderTotals(); });
    renderLines();
    renderTotals();

    /* --- validation --- */
    function invalid(el, message) {
      var field = el.closest(".field");
      if (!field) return;
      field.classList.add("is-invalid");
      var err = field.querySelector(".error");
      if (err && message) err.textContent = message;
    }

    function clearInvalid() {
      Array.prototype.forEach.call(form.querySelectorAll(".field.is-invalid"), function (f) {
        f.classList.remove("is-invalid");
      });
    }

    function validate() {
      clearInvalid();
      var ok = true;
      Array.prototype.forEach.call(form.querySelectorAll("[required]"), function (el) {
        if (el.offsetParent === null && el.type !== "hidden") return; // hidden section
        if (!el.value.trim()) { invalid(el, "This one's required."); ok = false; }
      });
      var email = $("#email");
      if (email && email.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
        invalid(email, "Check the email address.");
        ok = false;
      }
      return ok;
    }

    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f) f.classList.remove("is-invalid");
    });

    /* --- submit --- */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!Cart.items().length) return;
      if (!validate()) {
        var first = form.querySelector(".field.is-invalid");
        if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      var data = {
        items: Cart.items().map(function (i) {
          return {
            id: i.id, name: i.name, qty: i.qty, unitPrice: i.price,
            options: Object.keys(i.options || {}).map(function (k) { return k + ": " + i.options[k].name; }),
            note: i.note || "",
          };
        }),
        fulfillment: method,
        date: dateSel ? dateSel.value : "",
        window: windowSel ? windowSel.value : "",
        customer: {
          name: $("#name").value.trim(),
          email: $("#email").value.trim(),
          phone: $("#phone").value.trim(),
          address: $("#address") ? $("#address").value.trim() : "",
          occasion: $("#occasion") ? $("#occasion").value.trim() : "",
          notes: $("#notes") ? $("#notes").value.trim() : "",
        },
        totals: Cart.totals({ delivery: method === "delivery" }),
      };

      submitBtn.disabled = true;
      var original = submitBtn.textContent;
      submitBtn.textContent = "One moment…";
      if (statusEl) statusEl.textContent = "";

      if (SHOP_CONFIG.paymentMode === "stripe") {
        fetch(SHOP_CONFIG.checkoutEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
          .then(function (res) {
            if (!res.ok || !res.body.url) throw new Error(res.body.error || "Checkout is unavailable.");
            sessionStorage.setItem("frostedfrog.pending", JSON.stringify(data));
            window.location.href = res.body.url;
          })
          .catch(function (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = original;
            if (statusEl) {
              statusEl.innerHTML = '<p class="note">We couldn\'t reach the payment page (' + err.message +
                '). Email your order to <a href="mailto:' + SHOP_CONFIG.email + '">' + SHOP_CONFIG.email +
                "</a> and we'll take it from there.</p>";
            }
          });
        return;
      }

      /* deposit mode — send the request, invoice afterwards */
      if (SHOP_CONFIG.orderEndpoint) {
        fetch(SHOP_CONFIG.orderEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        })
          .then(function (r) { if (!r.ok) throw new Error("Request failed"); return r; })
          .then(function () { finish(data); })
          .catch(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = original;
            mailFallback(data);
          });
      } else {
        mailFallback(data);
        finish(data);
      }
    });

    function summaryText(d) {
      var lines = d.items.map(function (i) {
        return "- " + i.qty + " x " + i.name + (i.options.length ? " (" + i.options.join("; ") + ")" : "") +
          (i.note ? " — note: " + i.note : "") + " — " + money(i.qty * i.unitPrice);
      });
      return [
        "New pre-order request",
        "",
        "Name: " + d.customer.name,
        "Email: " + d.customer.email,
        "Phone: " + d.customer.phone,
        d.fulfillment === "delivery" ? "Delivery to: " + d.customer.address : "Pickup",
        "Date: " + d.date + " — " + d.window,
        d.customer.occasion ? "Occasion: " + d.customer.occasion : "",
        "",
        "Order:",
      ].filter(Boolean).concat(lines, [
        "",
        "Subtotal: " + money(d.totals.subtotal),
        d.totals.delivery ? "Delivery: " + money(d.totals.delivery) : "",
        d.totals.tax ? "Tax: " + money(d.totals.tax) : "",
        "Total: " + money(d.totals.total),
        d.customer.notes ? "\nNotes: " + d.customer.notes : "",
      ].filter(Boolean)).join("\n");
    }

    function mailFallback(d) {
      var href = "mailto:" + SHOP_CONFIG.email +
        "?subject=" + encodeURIComponent("Pre-order request — " + d.customer.name) +
        "&body=" + encodeURIComponent(summaryText(d));
      window.location.href = href;
    }

    function finish(d) {
      sessionStorage.setItem("frostedfrog.lastOrder", JSON.stringify(d));
      Cart.clear();
      window.location.href = "thank-you.html";
    }
  });
})();
