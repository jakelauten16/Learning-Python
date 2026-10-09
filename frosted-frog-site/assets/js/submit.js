/* ---------------------------------------------------------------------------
   Sending the order.

   Used by the review page, which is the only place an order is actually sent.
   Two routes out: a Stripe payment page, or your inbox when the shop is in
   deposit mode. Either way the browser sends ids and quantities; what an
   order costs is settled on the server.
   --------------------------------------------------------------------------- */
(function (window) {
  "use strict";

  var currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
  function money(n) { return currency.format(Number(n)); }

  /* Ids and quantities only. No prices leave the browser. */
  function serverPayload(d) {
    return {
      items: d.items.map(function (i) {
        var options = {};
        (i.options || []).forEach(function (pair) {
          var at = pair.indexOf(": ");
          if (at > 0) options[pair.slice(0, at)] = pair.slice(at + 2);
        });
        return { id: i.id, qty: i.qty, options: options, note: i.note || "" };
      }),
      fulfillment: d.fulfillment,
      date: d.date,
      window: d.window,
      customer: d.customer,
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

  function mailFallback(d) {
    if (window.FROSTED_DEMO) return;
    window.location.href = "mailto:" + SHOP_CONFIG.email +
      "?subject=" + encodeURIComponent("Pre-order request, " + d.customer.name) +
      "&body=" + encodeURIComponent(summaryText(d));
  }

  function go(page) {
    if (window.FROSTED_DEMO) {
      window.location.hash = "#/" + page.replace(".html", "");
      window.scrollTo(0, 0);
    } else {
      window.location.href = page;
    }
  }

  function finish(d) {
    try {
      sessionStorage.setItem("frostedfrog.lastOrder", JSON.stringify(d));
      sessionStorage.removeItem("frostedfrog.pendingOrder");
    } catch (e) { /* private mode */ }
    if (window.Cart) Cart.clear();
    go("thank-you.html");
  }

  window.OrderSubmit = {
    money: money,
    serverPayload: serverPayload,
    summaryText: summaryText,

    /* onError gets a message to show; the caller owns the button state. */
    send: function (d, onError) {
      if (SHOP_CONFIG.paymentMode === "stripe") {
        fetch(SHOP_CONFIG.checkoutEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(serverPayload(d)),
        })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
          .then(function (res) {
            if (!res.ok || !res.body.url) throw new Error(res.body.error || "Checkout is unavailable");
            try {
              sessionStorage.setItem("frostedfrog.lastOrder", JSON.stringify(d));
              sessionStorage.removeItem("frostedfrog.pendingOrder");
            } catch (e) { /* private mode */ }
            if (window.Cart) Cart.clear();
            window.location.href = res.body.url;
          })
          .catch(function (err) {
            onError(err.message || "Something went wrong", true);
          });
        return;
      }

      if (SHOP_CONFIG.orderEndpoint) {
        fetch(SHOP_CONFIG.orderEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(formPayload(d)),
        })
          .then(function (r) {
            if (!r.ok) throw new Error("That didn't go through");
            finish(d);
          })
          .catch(function () {
            onError("Your order didn't send. Try again, or send it by email instead.", false, function () {
              mailFallback(d);
              finish(d);
            });
          });
      } else {
        mailFallback(d);
        finish(d);
      }
    },
  };
})(window);
