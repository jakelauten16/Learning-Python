/* ---------------------------------------------------------------------------
   The review page. The last look before anything is sent or charged.

   Nothing here is new information: it is the order as it stands, laid out so
   a mistake is obvious. The numbers shown are the browser's arithmetic; the
   amount actually charged is recomputed on the server from the catalog.
   --------------------------------------------------------------------------- */
(function () {
  "use strict";

  function $(sel) { return document.querySelector(sel); }
  var money = function (n) { return OrderSubmit.money(n); };

  document.addEventListener("DOMContentLoaded", function () {
    var root = $("[data-review]");
    if (!root) return;

    var empty = $("[data-review-empty]");
    var panel = $("[data-review-panel]");
    var confirmBtn = $("[data-confirm]");
    var statusEl = $("[data-review-status]");

    var order = null;
    try {
      order = JSON.parse(sessionStorage.getItem("frostedfrog.pendingOrder") || "null");
    } catch (e) { /* private mode */ }

    /* Someone can land here with a stale tab, an emptied cart, or on a day
       the order book has closed. All three mean: back to the menu. */
    var open = !window.Schedule || Schedule.isOrderingOpen();
    var stillInCart = window.Cart ? Cart.items().length : 0;

    if (!order || !order.items || !order.items.length || !stillInCart || !open) {
      if (empty) {
        empty.hidden = false;
        empty.querySelector("[data-reason]").textContent = !open
          ? "The order book has closed since you started. It opens again Monday, and your cart is saved."
          : !stillInCart
            ? "Your cart is empty now, so there is nothing to confirm."
            : "We could not find an order to review. Start from the menu and we will bring you back here.";
      }
      if (panel) panel.hidden = true;
      return;
    }

    /* The cart is the source of truth. If it changed in another tab after the
       form was filled in, the old summary would be a lie. */
    var cartTotal = Cart.totals({ delivery: order.fulfillment === "delivery" }).total;
    if (Math.abs(cartTotal - order.totals.total) > 0.005) {
      order.items = Cart.items().map(function (i) {
        return {
          id: i.id, name: i.name, image: i.image, qty: i.qty, unitPrice: i.price,
          options: Object.keys(i.options || {}).map(function (k) { return k + ": " + i.options[k].name; }),
          note: i.note || "",
        };
      });
      order.totals = Cart.totals({ delivery: order.fulfillment === "delivery" });
    }

    /* --- the order itself --- */
    $("[data-review-items]").innerHTML = order.items.map(function (i) {
      return (
        '<div class="review-line">' +
          '<img src="' + i.image + '" alt="" width="56" height="56" loading="lazy">' +
          "<div><h3>" + i.name + "</h3>" +
            (i.options.length ? '<p class="review-line__opts">' + i.options.join(" / ") + "</p>" : "") +
            (i.note ? '<p class="review-line__note">&ldquo;' + i.note + "&rdquo;</p>" : "") +
            '<p class="review-line__qty">' + i.qty + " &times; " + money(i.unitPrice) + "</p></div>" +
          '<div class="review-line__price">' + money(i.qty * i.unitPrice) + "</div>" +
        "</div>"
      );
    }).join("");

    var t = order.totals;
    $("[data-review-totals]").innerHTML =
      '<div class="totals">' +
        "<div><span>Subtotal</span><span>" + money(t.subtotal) + "</span></div>" +
        (t.delivery ? "<div><span>Delivery</span><span>" + money(t.delivery) + "</span></div>" : "") +
        (t.tax ? "<div><span>Tax</span><span>" + money(t.tax) + "</span></div>" : "") +
        '<div class="total"><span>Total</span><span>' + money(t.total) + "</span></div>" +
      "</div>";

    $("[data-review-pickup]").innerHTML =
      "<dt>" + (order.fulfillment === "delivery" ? "Delivery" : "Pickup") + "</dt>" +
      "<dd>" + (order.pretty || order.date) + "<br>" + order.window +
        '<span class="review-sub">within the ' + order.windowRange + " window</span></dd>" +
      (order.fulfillment === "delivery"
        ? "<dt>Address</dt><dd>" + order.customer.address + "</dd>"
        : "<dt>Where</dt><dd>" + SHOP_CONFIG.pickupLocation + "</dd>");

    $("[data-review-contact]").innerHTML =
      "<dt>Name</dt><dd>" + order.customer.name + "</dd>" +
      "<dt>Email</dt><dd>" + order.customer.email + "</dd>" +
      "<dt>Phone</dt><dd>" + order.customer.phone + "</dd>" +
      (order.customer.occasion ? "<dt>Occasion</dt><dd>" + order.customer.occasion + "</dd>" : "") +
      (order.customer.notes ? "<dt>Notes</dt><dd>" + order.customer.notes + "</dd>" : "");

    /* --- what the button does depends on how you take payment --- */
    var paying = SHOP_CONFIG.paymentMode === "stripe";
    confirmBtn.textContent = paying ? "Pay " + money(t.total) : "Send my pre-order";
    $("[data-review-payment]").textContent = paying
      ? "The next page is Stripe's secure checkout. Your card details go to Stripe, never to us."
      : SHOP_CONFIG.paymentNote + " We take " + SHOP_CONFIG.paymentMethods + ".";

    confirmBtn.addEventListener("click", function () {
      confirmBtn.disabled = true;
      var label = confirmBtn.textContent;
      confirmBtn.textContent = paying ? "Taking you to checkout…" : "Sending…";
      if (statusEl) statusEl.innerHTML = "";

      OrderSubmit.send(order, function (message, nothingCharged, retryByEmail) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = label;
        if (!statusEl) return;
        statusEl.innerHTML = '<p class="note">' + message +
          (nothingCharged ? " Nothing has been charged." : "") +
          (retryByEmail ? ' <a href="#" data-mail-order>Send it by email instead</a>.' : "") + "</p>";
        var link = statusEl.querySelector("[data-mail-order]");
        if (link && retryByEmail) {
          link.addEventListener("click", function (e) { e.preventDefault(); retryByEmail(); });
        }
      });
    });
  });
})();
