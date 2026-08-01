/* ==========================================================================
   Lucy Lou's Coffee — shared behaviour
   Nav, the route board, the events list, and the small helpers both share.
   Everything degrades to readable markup if JS never runs.
   ========================================================================== */

/* ------------------------------------------------------------- helpers --- */

const money = (n) => '$' + n.toFixed(2);

/** '2026-08-01' + '08:00' -> a local Date. */
function at(dateISO, time) {
  return new Date(dateISO + 'T' + time);
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Sat 08.01' — short enough for the board, unambiguous at a glance. */
function boardDate(dateISO) {
  const d = at(dateISO, '12:00');
  return WEEKDAY[d.getDay()] + ' ' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
}

/** '8:00a' — compact clock format, no dead ':00'. */
function clock(time) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'p' : 'a';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}

const hours = (stop) => clock(stop.open) + '–' + clock(stop.close);

/**
 * Where a stop sits relative to now.
 *   open     the window is serving right now
 *   next     the soonest stop still to come
 *   later    further out
 *   past     done
 * `next` is assigned by the caller, since it depends on the whole list.
 */
function stopState(stop, now) {
  const start = at(stop.date, stop.open);
  const end = at(stop.date, stop.close);
  if (now >= start && now <= end) return 'open';
  if (now > end) return 'past';
  return 'later';
}

/** Upcoming + currently-open stops, soonest first. */
function liveStops(now = new Date()) {
  return STOPS
    .filter((s) => stopState(s, now) !== 'past')
    .sort((a, b) => at(a.date, a.open) - at(b.date, b.open));
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ------------------------------------------------------------------ nav --- */

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const list = document.getElementById('nav-list');
  if (toggle && list) {
    toggle.addEventListener('click', () => {
      const open = list.getAttribute('data-open') === 'true';
      list.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
    });
  }

  // Mark the current page in the nav from <body data-page="...">.
  const page = document.body.dataset.page;
  if (!page) return;
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
  });
}

/* ---------------------------------------------------- the route board ----- */

function renderBoard(root, limit) {
  const now = new Date();
  const stops = liveStops(now);
  const shown = limit ? stops.slice(0, limit) : stops;

  if (!shown.length) {
    root.innerHTML =
      '<p class="board-empty">No stops on the calendar right now. ' +
      '<a href="events.html">Book the trailer</a> and we\'ll add yours.</p>';
    return;
  }

  let nextAssigned = false;
  root.innerHTML = shown.map((stop) => {
    let state = stopState(stop, now);
    if (state === 'later' && !nextAssigned) {
      state = 'next';
      nextAssigned = true;
    }
    const label = state === 'open' ? 'Serving now' : state === 'next' ? 'Up next' : 'Scheduled';

    return `
      <li class="board-row" data-state="${state}">
        <span class="board-lamp" aria-hidden="true"></span>
        <span class="board-when">${boardDate(stop.date)}
          <span class="board-when-time">${hours(stop)}</span>
        </span>
        <span class="board-where">
          <span class="board-place">${escapeHTML(stop.place)}</span>
          <span class="board-city">${escapeHTML(stop.address)} · ${stop.rig === 'cart' ? 'Cart' : 'Trailer'}</span>
        </span>
        <span class="board-status">${label}</span>
      </li>`;
  }).join('');
}

function initBoard() {
  const root = document.getElementById('board-rows');
  if (!root) return;
  const limit = root.dataset.limit ? Number(root.dataset.limit) : 0;
  renderBoard(root, limit);

  const clockEl = document.getElementById('board-clock');
  if (clockEl) {
    const now = new Date();
    clockEl.textContent =
      WEEKDAY[now.getDay()] + ' ' + MONTH[now.getMonth()] + ' ' + now.getDate() + ' · Central';
  }
}

/* --------------------------------------------------------------- events --- */

function renderEvents(root, limit) {
  const now = new Date();
  const upcoming = EVENTS
    .filter((e) => at(e.date, e.end) >= now)
    .sort((a, b) => at(a.date, a.start) - at(b.date, b.start));
  const shown = limit ? upcoming.slice(0, limit) : upcoming;

  if (!shown.length) {
    root.innerHTML =
      '<li class="notice">Nothing on the public calendar this month — we\'re booked private. ' +
      '<a href="events.html#book">Ask about your date</a>.</li>';
    return;
  }

  root.innerHTML = shown.map((e) => {
    const d = at(e.date, '12:00');
    return `
      <li class="event">
        <span class="event-date">
          ${MONTH[d.getMonth()]}
          <span class="event-date-day">${d.getDate()}</span>
          ${WEEKDAY[d.getDay()]}
        </span>
        <span class="event-name">${escapeHTML(e.name)}</span>
        <span class="event-meta">
          ${escapeHTML(e.venue)}, ${escapeHTML(e.city)} · ${clock(e.start)}–${clock(e.end)}<br>
          ${escapeHTML(e.desc)}
        </span>
        <a class="event-action event-link" href="preorder.html">Preorder ahead</a>
      </li>`;
  }).join('');
}

function initEvents() {
  const root = document.getElementById('events-list');
  if (!root) return;
  renderEvents(root, root.dataset.limit ? Number(root.dataset.limit) : 0);
}

/* ------------------------------------------------------------- seasonal --- */

function initSeasonal() {
  const root = document.getElementById('seasonal-cards');
  if (!root) return;
  const group = MENU.find((g) => g.season === true);
  if (!group) {
    root.closest('.band').hidden = true;
    return;
  }

  const windowEl = document.getElementById('seasonal-window');
  if (windowEl && group.window) windowEl.textContent = group.window;

  root.innerHTML = group.items.map((item) => `
    <li class="card season-card">
      <span class="tag tag-seasonal">Seasonal</span>
      <h3 class="card-title">${escapeHTML(item.name)}</h3>
      <p class="card-body">${escapeHTML(item.desc)}</p>
      <p class="season-card-foot">
        <span class="menu-item-temp">${escapeHTML(item.temp)}</span>
        <span class="menu-item-price">${money(item.price)}</span>
      </p>
    </li>`).join('');
}

/* ------------------------------------------------------------ page boot --- */

function initYear() {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initBoard();
  initEvents();
  initSeasonal();
  initYear();
});
