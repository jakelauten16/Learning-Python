/* ---------------------------------------------------------------------------
   The weekly rhythm.

   Ordering opens Monday and closes Wednesday night. Thursday is shopping day.
   Friday and Saturday are baking and pickup, in the windows set in data.js.

   Customers never pick a date out of a calendar — they pick one of that week's
   two windows, and a time inside it. The same file runs in the browser and in
   the checkout function, so the server checks the schedule too.
   --------------------------------------------------------------------------- */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.Schedule = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MS_DAY = 86400000;

  function cfg(config) {
    return (config || (typeof SHOP_CONFIG !== "undefined" ? SHOP_CONFIG : root.SHOP_CONFIG)).schedule;
  }

  function minutes(hhmm) {
    var bits = String(hhmm).split(":");
    return parseInt(bits[0], 10) * 60 + parseInt(bits[1] || "0", 10);
  }

  function minutesInto(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function iso(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function fromISO(str) {
    var p = String(str).split("-");
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  function startOfDay(d) {
    var c = new Date(d.getTime());
    c.setHours(0, 0, 0, 0);
    return c;
  }

  function addDays(d, n) {
    var c = new Date(d.getTime());
    c.setDate(c.getDate() + n);
    return c;
  }

  /* "15:30" → "3:30 PM" */
  function time12(hhmm) {
    var m = minutes(hhmm);
    var h = Math.floor(m / 60);
    var suffix = h >= 12 ? "PM" : "AM";
    var hour = h % 12 === 0 ? 12 : h % 12;
    return hour + ":" + pad(m % 60) + " " + suffix;
  }

  function windowLabel(pickup) {
    return time12(pickup.start) + " – " + time12(pickup.end);
  }

  /* Is the order form accepting orders right now? */
  function isOrderingOpen(now, config) {
    var s = cfg(config);
    now = now || new Date();
    if (s.previewAnyDay) return true;
    if (s.orderDays.indexOf(now.getDay()) === -1) return false;
    var m = minutesInto(now);
    return m >= minutes(s.orderOpens) && m <= minutes(s.orderCloses);
  }

  /* The Monday that starts the order window customers are ordering into. */
  function windowMonday(now, config) {
    var s = cfg(config);
    var today = startOfDay(now || new Date());
    var dow = today.getDay();
    var thisMonday = addDays(today, dow === 0 ? -6 : 1 - dow);

    if (s.orderDays.indexOf(dow) !== -1) return thisMonday;

    /* Outside the window: the next order window, unless we're previewing and
       this week's pickups haven't happened yet. */
    if (s.previewAnyDay) {
      var lastEnd = s.pickups.reduce(function (latest, p) {
        var d = pickupDate(thisMonday, p);
        d.setHours(Math.floor(minutes(p.end) / 60), minutes(p.end) % 60, 0, 0);
        return d > latest ? d : latest;
      }, new Date(0));
      if (lastEnd > (now || new Date())) return thisMonday;
    }
    return addDays(thisMonday, 7);
  }

  function pickupDate(monday, pickup) {
    return addDays(monday, (pickup.day + 6) % 7);
  }

  /* Every slot start inside a window: 3:00, 3:30, … up to one slot before close. */
  function slotsFor(pickup, config) {
    var s = cfg(config);
    if (!s.slotMinutes) return [];
    var out = [];
    for (var m = minutes(pickup.start); m + s.slotMinutes <= minutes(pickup.end); m += s.slotMinutes) {
      out.push(time12(pad(Math.floor(m / 60)) + ":" + pad(m % 60)));
    }
    return out;
  }

  /* The two pickup choices for the week being ordered. */
  function pickupOptions(now, config) {
    var s = cfg(config);
    var monday = windowMonday(now, config);
    return s.pickups.map(function (p) {
      var date = pickupDate(monday, p);
      return {
        day: p.day,
        label: p.label || DAY_NAMES[p.day],
        date: iso(date),
        pretty: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
        shortDate: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        start: p.start,
        end: p.end,
        window: windowLabel(p),
        slots: slotsFor(p, config),
      };
    });
  }

  /* When the current window closes / the next one opens — for the countdown. */
  function ordersClose(now, config) {
    var s = cfg(config);
    var today = startOfDay(now || new Date());
    var lastDay = s.orderDays[s.orderDays.length - 1];
    var monday = windowMonday(now, config);
    var close = addDays(monday, (lastDay + 6) % 7);
    close.setHours(Math.floor(minutes(s.orderCloses) / 60), minutes(s.orderCloses) % 60, 0, 0);
    return close;
  }

  function ordersOpen(now, config) {
    var s = cfg(config);
    var monday = windowMonday(now, config);
    monday.setHours(Math.floor(minutes(s.orderOpens) / 60), minutes(s.orderOpens) % 60, 0, 0);
    return monday;
  }

  /* Server-side check: is this date + time actually one of our slots? */
  function isValidPickup(dateStr, timeStr, now, config) {
    var options = pickupOptions(now, config);
    var match = options.filter(function (o) { return o.date === dateStr; })[0];
    if (!match) return false;
    if (!match.slots.length) return true;
    return match.slots.indexOf(timeStr) !== -1;
  }

  /* A one-line summary of the rhythm, for banners and the footer. */
  function summary(config) {
    var s = cfg(config);
    var days = s.orderDays.map(function (d) { return DAY_NAMES[d]; });
    return "Order " + days[0] + "–" + days[days.length - 1] + " · Pick up " +
      s.pickups.map(function (p) { return (p.label || DAY_NAMES[p.day]) + " " + windowLabel(p); }).join(" or ");
  }

  return {
    isOrderingOpen: isOrderingOpen,
    pickupOptions: pickupOptions,
    ordersClose: ordersClose,
    ordersOpen: ordersOpen,
    isValidPickup: isValidPickup,
    summary: summary,
    windowLabel: windowLabel,
    time12: time12,
    iso: iso,
    fromISO: fromISO,
    dayNames: DAY_NAMES,
  };
});
