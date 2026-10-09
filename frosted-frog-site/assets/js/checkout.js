/* Order page: review the cart, choose pickup or delivery, pick one of the
   week's two pickup windows, and send the order. Nothing is charged here ,
   the order goes to Formspree, or to the customer's own email app. */
(function () {
  "use strict";

  var currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
  function money(n) { return currency.format(Number(n)); }
  function $(sel) { return document.querySelector(sel); }

  /* Demo builds run every page in one document, so navigation is by hash. */
  var DEMO = !!window.FROSTED_DEMO;
  function go(page) {
    if (DEMO) {
      window.location.hash = "#/" + page.replace(".html", "");
      window.scrollTo(0, 0);
    } else {
      window.location.href = page;
    }
  }

  /* ---- Special requests -------------------------------------------------
     Same inbox as an order, different shape: there's no cart, just a
     description of what somebody is planning. ---------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    var quote = document.querySelector("[data-quote-form]");
    if (!quote) return;
    var status = document.querySelector("[data-quote-status]");

    quote.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = function (id) { return (document.getElementById(id).value || "").trim(); };
      var missing = ["q-name", "q-email", "q-details"].filter(function (id) { return !val(id); });
      missing.forEach(function (id) {
        var f = document.getElementById(id).closest(".field");
        if (f) f.classList.add("is-invalid");
      });
      if (missing.length) {
        Cart.toast("Name, email and a few details, please.");
        document.getElementById(missing[0]).focus();
        return;
      }

      var body = {
        _subject: "Custom request, " + val("q-name"),
        name: val("q-name"),
        email: val("q-email"),
        date_needed: val("q-date"),
        servings: val("q-guests"),
        details: val("q-details"),
      };
      var btn = quote.querySelector("button[type=submit]");
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending…";

      function sent() {
        quote.reset();
        btn.disabled = false;
        btn.textContent = label;
        if (status) {
          status.innerHTML = '<p class="note">Got it, we\'ll come back to you with a quote, usually within a day.</p>';
        }
      }

      function byEmail() {
        if (!window.FROSTED_DEMO) {
          window.location.href = "mailto:" + SHOP_CONFIG.email +
            "?subject=" + encodeURIComponent(body._subject) +
            "&body=" + encodeURIComponent(
              ["Name: " + body.name, "Email: " + body.email, "Date needed: " + body.date_needed,
               "Servings: " + body.servings, "", body.details].join("\n"));
        }
        sent();
      }

      if (SHOP_CONFIG.orderEndpoint) {
        fetch(SHOP_CONFIG.orderEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        }).then(function (r) {
          if (!r.ok) throw new Error("no");
          sent();
        }).catch(byEmail);
      } else {
        byEmail();
      }
    });

    quote.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f) f.classList.remove("is-invalid");
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    var form = $("[data-order-form]");
    if (!form) return;

    /* --- is the order window open? --- */
    var closedEl = $("[data-window-closed]");
    var open = Schedule.isOrderingOpen();
    if (closedEl) {
      closedEl.hidden = open;
      if (!open) {
        var opens = Schedule.ordersOpen();
        closedEl.innerHTML =
          '<div class="panel center">' +
            '<span class="eyebrow">Ordering is closed right now</span>' +
            "<h3>The order book opens " + opens.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + "</h3>" +
            "<p>Orders are taken Monday through Wednesday, and everything is baked fresh for that week's Friday and Saturday pickups. " +
            "Your cart is saved, come back Monday and it will still be here.</p>" +
            '<a class="btn btn--ghost" href="' + window.pageHref("order.html") + '">See this week\'s menu</a>' +
          "</div>";
      }
    }

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

    /* --- the week's two pickup windows --- */
    var dayRow = $("[data-pickup-days]");
    var options = Schedule.pickupOptions();
    var chosen = null;

    function renderDays() {
      if (!dayRow) return;
      dayRow.innerHTML = options.map(function (o, i) {
        return '<button type="button" class="choice" data-pick="' + i + '">' +
          "<strong>" + o.label + "</strong> " + o.shortDate + " · " + o.window + "</button>";
      }).join("");
    }

    function renderSlots() {
      if (!windowSel) return;
      if (!chosen) {
        windowSel.innerHTML = '<option value="">Choose a pickup day first</option>';
        windowSel.disabled = true;
        return;
      }
      windowSel.disabled = false;
      if (!chosen.slots.length) {
        windowSel.innerHTML = "<option>" + chosen.window + "</option>";
        return;
      }
      windowSel.innerHTML = '<option value="">Choose a time</option>' +
        chosen.slots.map(function (t) { return "<option>" + t + "</option>"; }).join("");
    }

    renderDays();
    renderSlots();

    if (dayRow) {
      dayRow.addEventListener("click", function (e) {
        var b = e.target.closest("[data-pick]");
        if (!b) return;
        Array.prototype.forEach.call(dayRow.children, function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        chosen = options[parseInt(b.getAttribute("data-pick"), 10)];
        if (dateSel) dateSel.value = chosen.date;
        var field = dayRow.closest(".field");
        if (field) field.classList.remove("is-invalid");
        renderSlots();
      });
    }

    /* --- order review --- */
    function renderLines() {
      var items = Cart.items();
      if (!items.length) {
        linesEl.innerHTML = '<div class="empty"><p class="script" style="font-size:2rem">Your order is empty</p>' +
          '<p>Add a few things and come back to check out.</p>' +
          '<a class="btn btn--ghost btn--sm" href="' + window.pageHref("order.html") + '">See this week\'s menu</a></div>';
        form.hidden = true;
        return;
      }
      form.hidden = !open;
      linesEl.innerHTML = items.map(function (i) {
        var opts = Object.keys(i.options || {}).map(function (k) { return i.options[k].name; }).join(" · ");
        return (
          '<div class="line">' +
            '<img src="' + i.image + '" alt="" width="64" height="64" loading="lazy">' +
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
        submitBtn.disabled = below || !open;
        submitBtn.textContent = !open
          ? "Ordering reopens Monday"
          : below
            ? "Delivery minimum is " + money(SHOP_CONFIG.delivery.minimum)
            : "Send my pre-order";
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
      if (!chosen) {
        var dayField = dayRow ? dayRow.closest(".field") : null;
        if (dayField) {
          dayField.classList.add("is-invalid");
          var e1 = dayField.querySelector(".error");
          if (e1) e1.textContent = "Pick Friday or Saturday.";
        }
        ok = false;
      }

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
        if (first) {
          first.scrollIntoView({ behavior: "smooth", block: "center" });
          /* The pickup-day field holds buttons rather than an input, and its
             date field is hidden, so look for anything actually focusable. */
          var control = first.querySelector("input:not([type=hidden]), select, textarea, button");
          if (control) control.focus({ preventScroll: true });
        }
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
        date: chosen ? chosen.date : "",
        day: chosen ? chosen.label : "",
        pretty: chosen ? chosen.pretty : "",
        window: windowSel ? windowSel.value : "",
        windowRange: chosen ? chosen.window : "",
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

      /* No card is taken here. The order is a request: it goes to Formspree
         when one is configured, otherwise to the customer's own email app. */
      if (SHOP_CONFIG.orderEndpoint) {
        fetch(SHOP_CONFIG.orderEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(formPayload(data)),
        })
          .then(function (r) {
            if (!r.ok) throw new Error("That didn't go through");
            finish(data);
          })
          .catch(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = original;
            if (statusEl) {
              statusEl.innerHTML = '<p class="note">Your order didn\'t send, the internet may have blinked. ' +
                'Try again, or <a href="#" data-mail-order>send it by email instead</a> and it will reach us just the same.</p>';
              var link = statusEl.querySelector("[data-mail-order]");
              if (link) {
                link.addEventListener("click", function (e) {
                  e.preventDefault();
                  mailFallback(data);
                  finish(data);
                });
              }
            }
          });
      } else {
        mailFallback(data);
        finish(data);
      }
    });

    /* Flat, readable fields, this is what lands in the inbox. */
    function formPayload(d) {
      return {
        _subject: "Pre-order, " + d.customer.name + ", " + (d.pretty || d.date),
        name: d.customer.name,
        email: d.customer.email,
        phone: d.customer.phone,
        pickup: (d.pretty || d.date) + " at " + d.window,
        fulfillment: d.fulfillment === "delivery" ? "Delivery to " + d.customer.address : "Pickup",
        occasion: d.customer.occasion,
        notes: d.customer.notes,
        total: money(d.totals.total),
        order: summaryText(d),
      };
    }

    function summaryText(d) {
      var lines = d.items.map(function (i) {
        return "- " + i.qty + " x " + i.name + (i.options.length ? " (" + i.options.join("; ") + ")" : "") +
          (i.note ? ", note: " + i.note : "") + ", " + money(i.qty * i.unitPrice);
      });
      return [
        "New pre-order request",
        "",
        "Name: " + d.customer.name,
        "Email: " + d.customer.email,
        "Phone: " + d.customer.phone,
        (d.fulfillment === "delivery" ? "Delivery" : "Pickup") + ": " +
          (d.pretty || d.date) + " at " + d.window + " (window " + d.windowRange + ")",
        d.fulfillment === "delivery" ? "Address: " + d.customer.address : "",
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
      if (DEMO) return; // a demo build doesn't open anybody's email
      var href = "mailto:" + SHOP_CONFIG.email +
        "?subject=" + encodeURIComponent("Pre-order request, " + d.customer.name) +
        "&body=" + encodeURIComponent(summaryText(d));
      window.location.href = href;
    }

    function finish(d) {
      sessionStorage.setItem("frostedfrog.lastOrder", JSON.stringify(d));
      Cart.clear();
      go("thank-you.html");
    }
  });
})();
