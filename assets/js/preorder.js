/* ==========================================================================
   Preorder — pick a stop, build the order, say when you're coming.
   --------------------------------------------------------------------------
   The stop comes first on purpose. A trailer isn't a storefront: an order
   only means something once it's attached to a place and a window, so the
   UI won't let you build a cart in the abstract.

   There's no payment here by design — the order is held at the window and
   paid when you pick it up. Sending the order to the trailer is a text
   message, which works today with no server. See README for wiring this to
   a real backend or a POS.
   ========================================================================== */

const SHOP_PHONE = '+12197437216';
const STORAGE_KEY = 'lucylous.preorder.v1';

const order = {
  stopId: null,
  lines: [],           // { key, itemId, name, size, milk, extras[], qty, unit }
  pickup: { name: '', phone: '', slot: '', notes: '' }
};

/* ------------------------------------------------------------- plumbing --- */

const el = (id) => document.getElementById(id);
const allItems = () => MENU.flatMap((g) => g.items.map((i) => ({ ...i, group: g })));
const currentStop = () => STOPS.find((s) => s.id === order.stopId) || null;

function save() {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch (e) { /* private mode */ }
}

function restore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    // Drop a saved stop that has since passed, so nobody orders into the past.
    if (saved.stopId && liveStops().some((s) => s.id === saved.stopId)) order.stopId = saved.stopId;
    if (Array.isArray(saved.lines)) order.lines = saved.lines;
    if (saved.pickup) Object.assign(order.pickup, saved.pickup);
  } catch (e) { /* corrupt payload — start clean */ }
}

const lineTotal = (line) => line.unit * line.qty;
const orderTotal = () => order.lines.reduce((sum, l) => sum + lineTotal(l), 0);
const itemCount = () => order.lines.reduce((sum, l) => sum + l.qty, 0);

/* ------------------------------------------------------- step 1 · stops --- */

function renderStops() {
  const root = el('stop-pick');
  const stops = liveStops();

  if (!stops.length) {
    root.innerHTML =
      '<p class="notice">No stops are on the calendar yet. Check back Monday, or ' +
      '<a href="events.html#book">book the trailer</a> for your own date.</p>';
    return;
  }

  const now = new Date();
  root.innerHTML = stops.map((s) => {
    const open = stopState(s, now) === 'open';
    return `
      <label class="stop-option">
        <input type="radio" name="stop" value="${s.id}" ${order.stopId === s.id ? 'checked' : ''}>
        <span class="stop-option-name">${escapeHTML(s.place)}</span>
        <span class="stop-option-badge">${open ? 'Open now' : boardDate(s.date)}</span>
        <span class="stop-option-meta">${hours(s)} · ${escapeHTML(s.address)} · ${s.rig === 'cart' ? 'Cart' : 'Trailer'}</span>
      </label>`;
  }).join('');

  root.querySelectorAll('input[name="stop"]').forEach((input) => {
    input.addEventListener('change', () => {
      order.stopId = input.value;
      save();
      renderCart();
      el('to-drinks').disabled = false;
    });
  });

  el('to-drinks').disabled = !order.stopId;
}

/* ------------------------------------------------------ step 2 · drinks --- */

function sizeFor(id) { return SIZES.find((s) => s.id === id) || SIZES[0]; }
function extraFor(id) { return EXTRAS.find((e) => e.id === id); }

function unitPrice(item, sizeId, extraIds) {
  return item.price
    + sizeFor(sizeId).delta
    + extraIds.reduce((sum, id) => sum + (extraFor(id) ? extraFor(id).delta : 0), 0);
}

function itemBlock(item) {
  const uid = 'opt-' + item.id;
  return `
    <details class="order-item" data-item="${item.id}">
      <summary class="order-item-summary">
        <span class="order-item-name">${escapeHTML(item.name)}
          ${item.temp ? `<span class="menu-item-temp">${escapeHTML(item.temp)}</span>` : ''}
        </span>
        <span class="order-item-price">${money(item.price)}</span>
        <span class="order-item-cue" aria-hidden="true">Add</span>
      </summary>
      <div class="order-item-panel">
        <p class="order-item-desc">${escapeHTML(item.desc)}</p>

        <fieldset class="opt-set">
          <legend class="opt-legend">Size</legend>
          <div class="opt-choices">
            ${SIZES.map((s, i) => `
              <label class="opt-pill">
                <input type="radio" name="${uid}-size" value="${s.id}" ${i === 1 ? 'checked' : ''}>
                <span>${s.label}${s.delta ? ' +' + money(s.delta).slice(1) : ''}</span>
              </label>`).join('')}
          </div>
        </fieldset>

        <div class="opt-set">
          <label class="opt-legend" for="${uid}-milk">Milk</label>
          <select class="field-select" id="${uid}-milk">
            ${MILKS.map((m, i) => `<option ${i === 0 ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>

        <fieldset class="opt-set">
          <legend class="opt-legend">Extras</legend>
          <div class="opt-choices">
            ${EXTRAS.map((x) => `
              <label class="opt-pill">
                <input type="checkbox" name="${uid}-extra" value="${x.id}">
                <span>${x.label}${x.delta ? ' +' + money(x.delta).slice(1) : ''}</span>
              </label>`).join('')}
          </div>
        </fieldset>

        <div class="opt-foot">
          <div class="qty">
            <button class="qty-btn" type="button" data-step="-1" aria-label="One fewer ${escapeHTML(item.name)}">&minus;</button>
            <span class="qty-val" data-qty>1</span>
            <button class="qty-btn" type="button" data-step="1" aria-label="One more ${escapeHTML(item.name)}">+</button>
          </div>
          <button class="btn" type="button" data-add>Add to order</button>
        </div>
      </div>
    </details>`;
}

function renderDrinks() {
  const root = el('drink-list');
  const groups = [...MENU].sort((a, b) => (b.season === true) - (a.season === true));

  root.innerHTML = groups.map((g) => `
    <section class="menu-group">
      <div class="menu-group-head">
        <h3 class="menu-group-title">${escapeHTML(g.name)}</h3>
        ${g.season ? '<span class="tag tag-seasonal">Seasonal</span>' : ''}
      </div>
      <div>${g.items.map(itemBlock).join('')}</div>
    </section>`).join('');

  root.querySelectorAll('.order-item').forEach(wireItem);
}

function wireItem(block) {
  const itemId = block.dataset.item;
  const item = allItems().find((i) => i.id === itemId);
  const qtyEl = block.querySelector('[data-qty]');
  let qty = 1;

  block.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      qty = Math.min(20, Math.max(1, qty + Number(btn.dataset.step)));
      qtyEl.textContent = String(qty);
      block.querySelector('[data-step="-1"]').disabled = qty === 1;
    });
  });
  block.querySelector('[data-step="-1"]').disabled = true;

  block.querySelector('[data-add]').addEventListener('click', () => {
    const size = block.querySelector('input[type="radio"]:checked').value;
    const milk = block.querySelector('select').value;
    const extras = [...block.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value);
    const key = [itemId, size, milk, ...extras.slice().sort()].join('|');

    const existing = order.lines.find((l) => l.key === key);
    if (existing) {
      existing.qty = Math.min(20, existing.qty + qty);
    } else {
      order.lines.push({
        key, itemId, name: item.name, size, milk, extras, qty,
        unit: unitPrice(item, size, extras)
      });
    }

    save();
    renderCart();
    block.open = false;
    announce(`${qty} ${item.name} added to your order.`);
  });
}

/* ------------------------------------------------------------- the cart --- */

function lineLabel(line) {
  const bits = [sizeFor(line.size).label];
  if (line.milk && line.milk !== 'None') bits.push(line.milk);
  line.extras.forEach((id) => { const x = extraFor(id); if (x) bits.push(x.label.toLowerCase()); });
  return bits.join(' · ');
}

function renderCart() {
  const stop = currentStop();
  const body = el('cart-body');
  const count = el('cart-count');
  count.textContent = itemCount() === 1 ? '1 drink' : itemCount() + ' drinks';

  const stopBlock = stop ? `
    <div class="cart-stop">
      <span class="cart-stop-label">Picking up at</span>
      <strong>${escapeHTML(stop.place)}</strong><br>
      ${boardDate(stop.date)} · ${hours(stop)}
    </div>` : `
    <div class="cart-stop">
      <span class="cart-stop-label">Picking up at</span>
      Choose a stop to start your order.
    </div>`;

  const lines = order.lines.length ? `
    <ul class="cart-lines">
      ${order.lines.map((l, i) => `
        <li class="cart-line">
          <span>
            <span class="cart-line-qty">${l.qty}&times;</span> ${escapeHTML(l.name)}<br>
            <small class="cart-line-qty">${escapeHTML(lineLabel(l))}</small>
            <button class="cart-remove" type="button" data-remove="${i}">Remove</button>
          </span>
          <span class="cart-line-price">${money(lineTotal(l))}</span>
        </li>`).join('')}
    </ul>
    <div class="cart-total"><span>Total</span><span>${money(orderTotal())}</span></div>
    <p class="cart-fine">You pay at the window. Nothing is charged here.</p>`
    : '<p class="cart-empty">Nothing added yet. Pick your drinks and they\'ll land here.</p>';

  body.innerHTML = stopBlock + lines;

  body.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const removed = order.lines.splice(Number(btn.dataset.remove), 1)[0];
      save();
      renderCart();
      announce(`${removed.name} removed from your order.`);
    });
  });

  const next = el('to-pickup');
  if (next) next.disabled = order.lines.length === 0;
}

/* ------------------------------------------------------ step 3 · pickup --- */

/** 15-minute slots inside the stop's window, starting 10 minutes from now. */
function pickupSlots(stop) {
  const slots = [];
  const end = at(stop.date, stop.close);
  const earliest = new Date(Date.now() + 10 * 60 * 1000);
  let t = at(stop.date, stop.open);
  if (t < earliest) {
    t = new Date(earliest);
    t.setMinutes(Math.ceil(t.getMinutes() / 15) * 15, 0, 0);
  }
  while (t <= end) {
    slots.push(String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'));
    t = new Date(t.getTime() + 15 * 60 * 1000);
  }
  return slots;
}

function renderPickup() {
  const stop = currentStop();
  if (!stop) return;

  el('pickup-where').textContent = `${stop.place} — ${boardDate(stop.date)}, ${hours(stop)}`;

  const slots = pickupSlots(stop);
  const select = el('pickup-slot');
  select.innerHTML = slots.length
    ? '<option value="">Choose a time</option>' + slots.map((s) => `<option value="${s}">${clock(s)}</option>`).join('')
    : '<option value="">This stop has closed for today</option>';
  select.disabled = slots.length === 0;

  el('pickup-name').value = order.pickup.name;
  el('pickup-phone').value = order.pickup.phone;
  el('pickup-notes').value = order.pickup.notes;
}

/* ------------------------------------------------------------ send it ---- */

function orderCode(stop) {
  const d = at(stop.date, '12:00');
  const stamp = String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const chars = 'ACDEFHJKLMNPRTUVWXY34679';
  let tail = '';
  for (let i = 0; i < 3; i++) tail += chars[Math.floor(Math.random() * chars.length)];
  return `LL-${stamp}-${tail}`;
}

function orderText(code, stop) {
  const lines = order.lines
    .map((l) => `${l.qty}x ${l.name} (${lineLabel(l)})`)
    .join('\n');
  return [
    `Preorder ${code}`,
    `${order.pickup.name} · ${order.pickup.phone}`,
    `${stop.place}, ${boardDate(stop.date)} at ${clock(order.pickup.slot)}`,
    '',
    lines,
    '',
    `Total ${money(orderTotal())}`,
    order.pickup.notes ? `Notes: ${order.pickup.notes}` : ''
  ].filter(Boolean).join('\n');
}

function showError(id, message) {
  const field = el(id);
  const box = el(id + '-error');
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (box) box.textContent = message || '';
  return !message;
}

function submitOrder(event) {
  event.preventDefault();
  const stop = currentStop();
  if (!stop) return;

  order.pickup.name = el('pickup-name').value.trim();
  order.pickup.phone = el('pickup-phone').value.trim();
  order.pickup.slot = el('pickup-slot').value;
  order.pickup.notes = el('pickup-notes').value.trim();

  const digits = order.pickup.phone.replace(/\D/g, '');
  const ok = [
    showError('pickup-name', order.pickup.name ? '' : 'Add the name we should call out.'),
    showError('pickup-phone', digits.length >= 10 ? '' : 'Add a 10-digit phone number so we can text you.'),
    showError('pickup-slot', order.pickup.slot ? '' : 'Pick a time inside the stop\'s window.')
  ].every(Boolean);

  if (!ok) {
    el('order-form').querySelector('[aria-invalid="true"]').focus();
    return;
  }

  const code = orderCode(stop);
  const body = orderText(code, stop);

  el('receipt-code').textContent = code;
  el('receipt-where').textContent = `${stop.place} — ${stop.address}`;
  el('receipt-when').textContent = `${boardDate(stop.date)} at ${clock(order.pickup.slot)}`;
  el('receipt-who').textContent = `${order.pickup.name} · ${order.pickup.phone}`;
  el('receipt-lines').innerHTML = order.lines.map((l) => `
    <li class="cart-line">
      <span><span class="cart-line-qty">${l.qty}&times;</span> ${escapeHTML(l.name)}<br>
        <small class="cart-line-qty">${escapeHTML(lineLabel(l))}</small></span>
      <span class="cart-line-price">${money(lineTotal(l))}</span>
    </li>`).join('');
  el('receipt-total').textContent = money(orderTotal());
  el('receipt-send').href = `sms:${SHOP_PHONE}?&body=${encodeURIComponent(body)}`;
  lastOrderText = body;

  try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* nothing to clear */ }
  goto(4);
}

/* --------------------------------------------------------- step machine --- */

let step = 1;
let lastOrderText = '';

function goto(n) {
  step = n;
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = Number(panel.dataset.panel) !== n;
  });
  document.querySelectorAll('.step').forEach((s) => {
    const i = Number(s.dataset.step);
    s.dataset.active = String(i === n);
    s.dataset.done = String(i < n);
  });

  // Once the order is placed the running ticket is history, not a control.
  const placed = n === 4;
  el('cart').hidden = placed;
  document.querySelector('.steps').hidden = placed;

  if (n === 3) renderPickup();
  const heading = document.querySelector(`[data-panel="${n}"] h2`);
  if (heading) heading.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function announce(message) {
  el('order-live').textContent = message;
}

/* ------------------------------------------------------------------ boot -- */

document.addEventListener('DOMContentLoaded', () => {
  if (!el('stop-pick')) return;

  restore();
  renderStops();
  renderDrinks();
  renderCart();

  el('to-drinks').addEventListener('click', () => goto(2));
  el('to-pickup').addEventListener('click', () => goto(3));
  el('back-to-stops').addEventListener('click', () => goto(1));
  el('back-to-drinks').addEventListener('click', () => goto(2));
  el('order-form').addEventListener('submit', submitOrder);

  el('receipt-copy').addEventListener('click', async () => {
    const button = el('receipt-copy');
    try {
      await navigator.clipboard.writeText(lastOrderText);
      button.textContent = 'Copied';
    } catch (e) {
      button.textContent = 'Copying is blocked — screenshot the ticket instead';
    }
  });

  goto(order.lines.length ? 2 : 1);
});
