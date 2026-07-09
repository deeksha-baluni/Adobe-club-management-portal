import { getAuth, redirectToLogin } from '../app-data.js';
import { applyCardImage, POSTER_EVENT_SIZE, setMarketingImage } from '../image-priority.js';
import {
  getEventImageSrc,
  getIndexEventImageSrc,
  getPosterEventImageSrc,
  getPosterEventImageFallbacks,
  COMPRESSED_EVENTS_BASE,
} from '../event-images.js';
import { MONTH_SHORT, parseEventDate } from './event-dates.js';

const EVENT_FALLBACK = `${COMPRESSED_EVENTS_BASE}evt-hero.avif`;

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function eventPageUrl(id) {
  return `/event?id=${encodeURIComponent(id)}`;
}

/**
 * @param {object} ev
 * @param {{ layout?: 'showcase'|'poster', action?: 'navigate'|'rsvp' }} options
 */
export function buildEventCard(ev, { layout = 'showcase', action = 'navigate' } = {}) {
  if (layout === 'poster') {
    return buildPosterEventCard(ev, action);
  }
  return buildShowcaseEventCard(ev, action);
}

function buildShowcaseEventCard(ev, action) {
  const card = document.createElement('div');
  card.className = 'card card--event';
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
  thumb.className = 'card-thumb';

  const img = document.createElement('img');
  img.alt = '';
  img.width = 400;
  img.height = 225;
  setMarketingImage(img, getIndexEventImageSrc(ev));
  img.onerror = () => { img.src = getEventImageSrc(ev); };
  thumb.append(img);

  const dt = parseEventDate(ev);
  if (dt) {
    const badge = document.createElement('div');
    badge.className = 'card-event-date';
    const month = document.createElement('span');
    month.className = 'card-event-month';
    month.textContent = MONTH_SHORT[dt.getMonth()];
    const day = document.createElement('span');
    day.className = 'card-event-day';
    day.textContent = dt.getDate();
    badge.append(month, day);
    thumb.append(badge);
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  const club = document.createElement('p');
  club.className = 'card-tag';
  club.textContent = ev.club || '';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = ev.title;

  const meta = document.createElement('p');
  meta.className = 'card-meta';
  meta.textContent = [ev.type, ev.time].filter(Boolean).join(' · ');

  body.append(club, title, meta);

  const btnWrap = document.createElement('div');
  btnWrap.className = 'card-actions';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = action === 'rsvp' ? 'card-btn ev-poster-rsvp' : 'card-btn';
  if (action === 'rsvp') btn.dataset.eventId = ev.id;
  btn.textContent = 'RSVP';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (action === 'rsvp' && window.AdobeEventModal?.handleRsvpClick) {
      window.AdobeEventModal.handleRsvpClick(ev, btn);
      return;
    }
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

function buildPosterEventCard(ev) {
  const state = window.AdobeEventModal?.getActionState?.(ev) || { label: 'RSVP', joined: false, mode: 'rsvp' };
  const joined = getAuth().isEventRsvped?.(ev.id);
  const label = state.label || 'RSVP';
  const card = document.createElement('div');
  card.className = 'lp-event-card lp-event-card--action';

  const link = document.createElement('a');
  link.className = 'lp-card-link';
  link.href = eventPageUrl(ev.id);

  const thumb = document.createElement('div');
  thumb.className = 'lp-event-thumb';
  const img = document.createElement('img');
  const [, ...fallbacks] = getPosterEventImageFallbacks(ev);
  applyCardImage(img, getPosterEventImageSrc(ev), {
    width: POSTER_EVENT_SIZE.width,
    height: POSTER_EVENT_SIZE.height,
    fallbacks,
  });
  thumb.append(img);

  const date = document.createElement('div');
  date.className = 'lp-event-date';
  date.innerHTML = `<span class="m">${esc(ev.month)}</span><span class="d">${esc(ev.day)}</span>`;
  thumb.append(date);

  const body = document.createElement('div');
  body.className = 'lp-event-body';
  body.innerHTML = `
    <span class="lp-event-club">${esc(ev.club)}</span>
    <span class="lp-event-title">${esc(ev.title)}</span>
    <span class="lp-event-meta">${esc([ev.time, ev.location].filter(Boolean).join(' · '))}</span>`;

  link.append(thumb, body);

  const actionWrap = document.createElement('div');
  actionWrap.className = 'lp-card-action';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `ev-poster-rsvp cb-poster-join${joined ? ' is-joined' : ''}${state.mode === 'join-club' ? ' is-join-club' : ''}`;
  btn.dataset.eventId = ev.id;
  btn.textContent = label;
  actionWrap.append(btn);

  card.append(link, actionWrap);
  return card;
}

export { eventPageUrl };
