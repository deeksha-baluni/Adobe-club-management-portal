/**
 * Showcase Teaser — events preset (next 3 upcoming from data.json).
 */
import { fetchAppData, getAuth, redirectToLogin } from '../club-shared/fetch-app-data.js';
import { setMarketingImage } from '../club-shared/image-priority.js';
import { getEventImageSrc, getIndexEventImageSrc } from '../club-shared/event-images.js';
import { buildSectionHead } from '../club-shared/marketing-head.js';
import { cfg } from '../club-shared/block-config.js';
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_MAP = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

export const EVENTS_DEFAULTS = {
  preset: 'events',
  eyebrow: "What's on",
  title: 'Upcoming events',
  'link-text': 'See all events →',
  'link-href': '/events',
};

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

function eventPageUrl(id) {
  return `/event?id=${encodeURIComponent(id)}`;
}

function buildSkeletonCard() {
  const card = document.createElement('div');
  card.className = 'showcase-card showcase-card--event showcase-card--skeleton';
  card.setAttribute('aria-hidden', 'true');
  card.innerHTML = `
    <div class="showcase-card-thumb showcase-skeleton-block"></div>
    <div class="showcase-card-body">
      <div class="showcase-skeleton-line showcase-skeleton-line--sm"></div>
      <div class="showcase-skeleton-line showcase-skeleton-line--md"></div>
      <div class="showcase-skeleton-line showcase-skeleton-line--xs"></div>
    </div>
    <div class="showcase-card-actions"><div class="showcase-skeleton-btn"></div></div>`;
  return card;
}

function buildEventCard(ev) {
  const card = document.createElement('div');
  card.className = 'showcase-card showcase-card--event';
  card.tabIndex = 0;
  card.setAttribute('role', 'link');
  card.setAttribute('aria-label', ev.title || 'View event');

  const navigate = () => {
    window.location.href = eventPageUrl(ev.id);
  };
  card.addEventListener('click', navigate);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate();
    }
  });

  const thumb = document.createElement('div');
  thumb.className = 'showcase-card-thumb';

  const img = document.createElement('img');
  img.alt = '';
  img.width = 400;
  img.height = 225;
  setMarketingImage(img, getIndexEventImageSrc(ev));
  img.onerror = () => { img.src = getEventImageSrc(ev); };
  thumb.append(img);

  const dt = parseDate(ev);
  if (dt) {
    const badge = document.createElement('div');
    badge.className = 'showcase-event-date';
    const month = document.createElement('span');
    month.className = 'showcase-event-month';
    month.textContent = MONTH_SHORT[dt.getMonth()];
    const day = document.createElement('span');
    day.className = 'showcase-event-day';
    day.textContent = dt.getDate();
    badge.append(month, day);
    thumb.append(badge);
  }

  const body = document.createElement('div');
  body.className = 'showcase-card-body';

  const club = document.createElement('p');
  club.className = 'showcase-card-tag';
  club.textContent = ev.club || '';

  const title = document.createElement('h3');
  title.className = 'showcase-card-title';
  title.textContent = ev.title;

  const meta = document.createElement('p');
  meta.className = 'showcase-card-meta';
  meta.textContent = [ev.type, ev.time].filter(Boolean).join(' · ');

  body.append(club, title, meta);

  const btnWrap = document.createElement('div');
  btnWrap.className = 'showcase-card-actions';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'showcase-card-btn';
  btn.textContent = 'RSVP';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!getAuth().isAuthenticated()) {
      redirectToLogin();
      return;
    }
    window.location.href = eventPageUrl(ev.id);
  });
  btnWrap.append(btn);

  card.append(thumb, body, btnWrap);
  return card;
}

export default async function decorateEvents(block, config) {
  const eyebrow = cfg(config, 'eyebrow', EVENTS_DEFAULTS.eyebrow);
  const title = cfg(config, 'title', EVENTS_DEFAULTS.title);
  const linkText = cfg(config, 'link-text', EVENTS_DEFAULTS['link-text']);
  const linkHref = cfg(config, 'link-href', EVENTS_DEFAULTS['link-href']);

  block.textContent = '';
  block.classList.add('showcase-teaser', 'showcase-teaser--events');

  const head = buildSectionHead({
    eyebrow,
    title,
    linkText,
    linkHref,
    classPrefix: 'showcase',
  });

  const grid = document.createElement('div');
  grid.className = 'showcase-grid';

  block.append(head, grid);

  for (let i = 0; i < 3; i += 1) {
    grid.append(buildSkeletonCard());
  }

  const data = await fetchAppData();
  grid.textContent = '';

  if (!data?.events?.length) {
    const msg = document.createElement('p');
    msg.className = 'showcase-empty';
    msg.textContent = 'Events coming soon.';
    grid.append(msg);
    return;
  }

  data.events
    .filter(isUpcoming)
    .slice(0, 3)
    .forEach((ev) => grid.append(buildEventCard(ev)));
}
