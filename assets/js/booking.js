/* ==========================================================================
   Events page — packages, past bookings, and the date request form.
   The form has no server behind it: it validates, then hands the filled-in
   enquiry to the phone's messages app or an email draft. See README for
   swapping in a real form endpoint.
   ========================================================================== */

const BOOK_PHONE = '+12197437216';
const BOOK_EMAIL = 'hello@lucylouscoffee.com';

function renderPackages() {
  const root = document.getElementById('packages');
  if (!root) return;
  root.innerHTML = PACKAGES.map((p) => `
    <li class="card">
      <h3 class="card-title">${escapeHTML(p.name)}</h3>
      <p class="card-body">${escapeHTML(p.lead)}</p>
      <ul class="compare-list" style="margin-top:1rem">
        ${p.points.map((pt) => `<li style="color:var(--ink)">${escapeHTML(pt)}</li>`).join('')}
      </ul>
    </li>`).join('');
}

function renderPast() {
  const root = document.getElementById('past-list');
  if (!root) return;
  root.innerHTML = PAST_EVENTS.map((e) => `<li class="past-chip">${escapeHTML(e)}</li>`).join('');
}

/* ------------------------------------------------------------ the form --- */

function markField(id, message) {
  const field = document.getElementById(id);
  const box = document.getElementById(id + '-error');
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (box) box.textContent = message || '';
  return !message;
}

function enquiryText(values) {
  return [
    'Date request — Lucy Lou\'s',
    `${values.name} · ${values.phone}${values.email ? ' · ' + values.email : ''}`,
    `${values.kind} on ${values.date}`,
    `${values.venue || 'Venue TBD'} · about ${values.guests} guests`,
    values.setup ? `Prefers the ${values.setup}` : '',
    '',
    values.notes || ''
  ].filter(Boolean).join('\n');
}

function initBookingForm() {
  const form = document.getElementById('book-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const values = {
      name: document.getElementById('book-name').value.trim(),
      phone: document.getElementById('book-phone').value.trim(),
      email: document.getElementById('book-email').value.trim(),
      kind: document.getElementById('book-kind').value,
      date: document.getElementById('book-date').value,
      venue: document.getElementById('book-venue').value.trim(),
      guests: document.getElementById('book-guests').value.trim(),
      setup: document.getElementById('book-setup').value,
      notes: document.getElementById('book-notes').value.trim()
    };

    const digits = values.phone.replace(/\D/g, '');
    const ok = [
      markField('book-name', values.name ? '' : 'Tell us who to ask for.'),
      markField('book-phone', digits.length >= 10 ? '' : 'Add a 10-digit number so we can text you back.'),
      markField('book-date', values.date ? '' : 'Pick the date you have in mind.'),
      markField('book-guests', Number(values.guests) > 0 ? '' : 'A rough headcount is enough.')
    ].every(Boolean);

    if (!ok) {
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }

    const body = enquiryText(values);
    const result = document.getElementById('book-result');
    document.getElementById('book-summary').textContent = body;
    document.getElementById('book-text').href = `sms:${BOOK_PHONE}?&body=${encodeURIComponent(body)}`;
    document.getElementById('book-email-link').href =
      `mailto:${BOOK_EMAIL}?subject=${encodeURIComponent('Date request — ' + values.date)}&body=${encodeURIComponent(body)}`;

    result.hidden = false;
    form.hidden = true;
    result.querySelector('h3').focus();
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Don't let anyone request a date that has already gone by.
  const dateInput = document.getElementById('book-date');
  const today = new Date();
  dateInput.min = today.toISOString().slice(0, 10);
}

document.addEventListener('DOMContentLoaded', () => {
  renderPackages();
  renderPast();
  initBookingForm();
});
