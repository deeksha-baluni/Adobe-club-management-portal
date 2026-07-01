/**
 * Upcoming Events block — fetches /data/data.json, renders next 3 events.
 *
 * da.live table shape:
 *   | Upcoming Events |                   |
 *   | Upcoming events (H2) | See all events → (link) |
 */

const DATA_PATH = '/data/data.json';
const EVENT_IMG_PATH = '/assets/images/events/';
const EVENT_IMG_FALLBACK = `${EVENT_IMG_PATH}evt-hero1.avif`;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_MAP = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

async function fetchData() {
  try {
    const resp = await fetch(DATA_PATH);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

function parseDate(ev) {
  const m = MONTH_MAP[String(ev.month || '').toUpperCase()];
  const d = parseInt(ev.day, 10);
  if (m == null || Number.isNaN(d)) return null;
  return new Date(new Date().getFullYear(), m, d);
}

function isUpcoming(ev) {
  const dt = parseDate(ev);
  if (!dt) return true;
  const endOfDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59);
  return Date.now() <= endOfDay.getTime();
}

function buildEventCard(ev) {
  const card = document.createElement('div');
  card.className = 'upcoming-event-card';

  const thumb = document.createElement('div');
  thumb.className = 'upcoming-event-thumb';

  const img = document.createElement('img');
  img.src = `${EVENT_IMG_PATH}${ev.id}.avif`;
  img.alt = '';
  img.loading = 'lazy';
  img.onerror = () => { img.src = EVENT_IMG_FALLBACK; };
  thumb.append(img);

  const dt = parseDate(ev);
  if (dt) {
    const badge = document.createElement('div');
    badge.className = 'upcoming-event-date';

    const month = document.createElement('span');
    month.className = 'upcoming-event-month';
    month.textContent = MONTH_SHORT[dt.getMonth()];

    const day = document.createElement('span');
    day.className = 'upcoming-event-day';
    day.textContent = dt.getDate();

    badge.append(month, day);
    thumb.append(badge);
  }

  const body = document.createElement('div');
  body.className = 'upcoming-event-body';

  const club = document.createElement('p');
  club.className = 'upcoming-event-club';
  club.textContent = ev.club || '';

  const title = document.createElement('h3');
  title.className = 'upcoming-event-title';
  title.textContent = ev.title;

  const meta = document.createElement('p');
  meta.className = 'upcoming-event-meta';
  meta.textContent = [ev.type, ev.time].filter(Boolean).join(' · ');

  body.append(club, title, meta);

  const btnWrap = document.createElement('div');
  btnWrap.className = 'upcoming-event-btn';
  const btn = document.createElement('a');
  btn.href = `/events/${ev.id}`;
  btn.textContent = 'RSVP';
  btnWrap.append(btn);

  card.append(thumb, body, btnWrap);
  return card;
}

export default async function decorate(block) {
  const headingEl = block.querySelector('h2, h3');
  const linkEl = block.querySelector('a[href]');

  // ── Section head ──────────────────────────────────────────────────────────
  const head = document.createElement('div');
  head.className = 'upcoming-events-head';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'upcoming-events-eyebrow';
  eyebrow.textContent = "What's on";

  const heading = document.createElement('h2');
  heading.className = 'upcoming-events-heading';
  heading.textContent = headingEl?.textContent.trim() || 'Upcoming events';

  const seeAll = document.createElement('a');
  seeAll.className = 'upcoming-events-link';
  seeAll.href = linkEl?.href || '/events';
  seeAll.textContent = linkEl?.textContent.trim() || 'See all events →';

  head.append(eyebrow, heading, seeAll);

  // ── Grid ──────────────────────────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'upcoming-events-grid';

  block.textContent = '';
  block.append(head, grid);

  // ── Data ──────────────────────────────────────────────────────────────────
  const data = await fetchData();
  if (!data?.events?.length) {
    const msg = document.createElement('p');
    msg.className = 'upcoming-events-empty';
    msg.textContent = 'Events coming soon.';
    grid.append(msg);
    return;
  }

  data.events
    .filter(isUpcoming)
    .slice(0, 3)
    .forEach((ev) => grid.append(buildEventCard(ev)));
}
