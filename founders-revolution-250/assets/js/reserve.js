/* =========================================================================
   The reservation form.

   There is no payment processor and no server behind this. A reservation is
   validated in the browser, given a number, and handed off as a pre-written
   email. Nobody is charged until someone from the distillery replies to
   confirm the allocation and take payment — which is how allocated whiskey
   is actually sold, and which means this page works today on a static host.

   See README.md for where to POST instead.
   ========================================================================= */
(function () {
  'use strict';

  var form = document.querySelector('[data-reserve]');
  if (!form) return;

  var AF = window.AF;
  var receipt = document.querySelector('[data-receipt]');
  var TO = 'allocations@foundersrevolution250.com';

  /* ---- preselect the offer from ?offer=box|bottle ------------------------ */
  var wanted = new URLSearchParams(location.search).get('offer');
  if (wanted) {
    var pre = form.querySelector('input[name="offer"][value="' + wanted + '"]');
    if (pre) pre.checked = true;
  }

  /* ---- validation -------------------------------------------------------
     Each rule returns a message when the field is wrong, nothing when it is
     fine, so the error text lives next to the rule that produces it. */
  var RULES = {
    name: function (v) {
      if (!v.trim()) return 'Tell us who the set is for.';
      if (v.trim().length < 2) return 'That looks too short to be a name.';
    },
    email: function (v) {
      if (!v.trim()) return 'We need an address to confirm the allocation.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'That address is missing something.';
    },
    state: function (v) {
      if (!v) return 'Choose a state — we cannot ship to all of them.';
    },
    qty: function (v) {
      var n = Number(v);
      if (!n || n < 1) return 'At least one.';
      if (n > 2) return 'Two per household while the release is allocated.';
    }
  };

  function fieldOf(input) { return input.closest('.field'); }

  function checkOne(input) {
    var rule = RULES[input.name];
    if (!rule) return true;
    var msg = rule(input.value);
    var field = fieldOf(input);
    var err = field && field.querySelector('.field__err');
    if (msg) {
      if (field) field.setAttribute('data-invalid', '1');
      if (err) err.textContent = msg;
      input.setAttribute('aria-invalid', 'true');
      return false;
    }
    if (field) field.removeAttribute('data-invalid');
    input.removeAttribute('aria-invalid');
    return true;
  }

  // Only re-validate a field once it has already been marked wrong; nagging
  // while someone is still typing their address is unpleasant.
  form.addEventListener('input', function (ev) {
    var f = fieldOf(ev.target);
    if (f && f.getAttribute('data-invalid') === '1') checkOne(ev.target);
  });
  form.addEventListener('blur', function (ev) {
    if (RULES[ev.target.name]) checkOne(ev.target);
  }, true);

  /* ---- what was asked for ----------------------------------------------- */
  function collect() {
    var d = new FormData(form), o = {};
    d.forEach(function (v, k) { o[k] = typeof v === 'string' ? v.trim() : v; });
    return o;
  }

  function reference() {
    // AF-250-<4 chars>. Readable over the phone, unique enough to quote back.
    var s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    var rnd = window.crypto && window.crypto.getRandomValues
      ? window.crypto.getRandomValues(new Uint32Array(4))
      : [0, 0, 0, 0].map(function () { return Math.floor(Math.random() * 4294967296); });
    for (var i = 0; i < 4; i++) out += s[rnd[i] % s.length];
    return 'AF-250-' + out;
  }

  function summary(o, ref) {
    var offer = AF && AF.offer(o.offer);
    var lines = [
      'Reservation ' + ref,
      '',
      (offer ? offer.name : o.offer) + ' × ' + o.qty,
      offer ? 'Held at ' + AF.money(offer.price) + ' each' : '',
      '',
      o.name,
      o.email,
      o.phone ? o.phone : '',
      'Ships to: ' + o.state,
      o.notes ? '' : null,
      o.notes ? 'Notes: ' + o.notes : null
    ];
    return lines.filter(function (l) { return l !== null && l !== ''; }).join('\n');
  }

  /* ---- submit ------------------------------------------------------------ */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    var inputs = form.querySelectorAll('input[name], select[name], textarea[name]');
    var bad = null;
    Array.prototype.forEach.call(inputs, function (el) {
      if (!checkOne(el) && !bad) bad = el;
    });
    if (bad) { bad.focus(); return; }

    var o = collect();
    var ref = reference();
    var text = summary(o, ref);

    // Fill the receipt, then hand the same text to a mail client.
    if (receipt) {
      var set = function (sel, v) {
        var el = receipt.querySelector(sel);
        if (el) el.textContent = v;
      };
      var offer = AF && AF.offer(o.offer);
      set('[data-r-ref]', ref);
      set('[data-r-offer]', offer ? offer.name : o.offer);
      set('[data-r-qty]', o.qty);
      set('[data-r-total]', offer ? AF.money(offer.price * Number(o.qty)) : '—');
      set('[data-r-name]', o.name);
      set('[data-r-email]', o.email);
      set('[data-r-state]', o.state);

      var mail = receipt.querySelector('[data-r-mail]');
      if (mail) {
        mail.href = 'mailto:' + TO +
          '?subject=' + encodeURIComponent('Reservation ' + ref) +
          '&body=' + encodeURIComponent(text);
      }

      receipt.setAttribute('data-show', '1');
      form.hidden = true;
      receipt.setAttribute('tabindex', '-1');
      receipt.focus();
      receipt.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
})();
