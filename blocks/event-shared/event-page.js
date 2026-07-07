/**
 * Shared utilities for event detail page blocks.
 */

import { esc, getAuth, getClubData, loadScript, preloadHeroImage } from '../club-shared/club-page.js';
import { getClubImageSrc } from '../club-shared/club-images.js';
import {
  getEventImageSrc,
  EVENT_STOCK_FALLBACK_POOL,
} from '../club-shared/event-images.js';
import { cfg } from '../club-shared/block-config.js';
import {
  getRecapBody,
  normalizeEventRecap,
  buildRecapHtml,
} from '../club-shared/recap-html.js';

export { esc, getRecapBody, normalizeEventRecap, buildRecapHtml };

const MONTH_INDEX = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const IMAGE_BASES = {
  clubs: '/assets/images/clubs/compressed-clubs/',
  events: '/assets/images/events/compressed-events/',
  index: '/assets/images/index/',
};

let eventPageInit = null;
let eventScriptsInit = null;
let eventCtxCache = null;

export function getEventIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id') || params.get('event');
  if (idParam) return idParam;
  const match = window.location.pathname.match(/\/events\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function eventPageUrl(id) {
  return `/event?id=${encodeURIComponent(id)}`;
}

export async function loadEventScripts() {
  await Promise.all([
    loadScript('/scripts/user-features.js'),
    loadScript('/scripts/event-seats.js'),
    loadScript('/scripts/event-modal.js'),
  ]);
}

export function parseEventDate(ev) {
  if (!ev?.month || !ev?.day || ev.day === '—') return null;
  const month = MONTH_INDEX[String(ev.month).toUpperCase()];
  const day = parseInt(ev.day, 10);
  if (month == null || Number.isNaN(day)) return null;
  return new Date(new Date().getFullYear(), month, day);
}

export function formatEventLongDate(ev) {
  const dt = parseEventDate(ev);
  if (!dt) {
    return [ev.month, ev.day, ev.time].filter(Boolean).join(' ');
  }
  const datePart = `${WEEKDAYS[dt.getDay()]}, ${MONTHS_FULL[dt.getMonth()]} ${dt.getDate()}`;
  return ev.time ? `${datePart}, ${ev.time}` : datePart;
}

export function getEventClub(ev, allClubs) {
  if (!ev) return null;
  if (ev.clubId) {
    const byId = allClubs.find((c) => c.id === ev.clubId);
    if (byId) return byId;
  }
  const eventClub = String(ev.club || '').toLowerCase().trim();
  return allClubs.find((c) => {
    const name = String(c.name || '').toLowerCase();
    return eventClub === name
      || eventClub === `${name} club`
      || eventClub.includes(name)
      || name.includes(eventClub.split(' ')[0]);
  }) || null;
}

export { getClubImageSrc } from '../club-shared/club-images.js';
export { getEventImageSrc } from '../club-shared/event-images.js';

export function prefetchEventHeroImage(evOrId) {
  const ev = typeof evOrId === 'string' ? { id: evOrId } : evOrId;
  preloadHeroImage(getEventImageSrc(ev));
}

export function isMembersOnlyEvent(ev) {
  return Boolean(ev?.membersOnly);
}

export function wireImageFallback(img, seed = '') {
  if (!img || img.dataset.fallbackWired) return;
  img.dataset.fallbackWired = '1';
  let attempts = 0;
  img.addEventListener('error', () => {
    attempts += 1;
    if (attempts > 4) {
      img.onerror = null;
      return;
    }
    const pool = EVENT_STOCK_FALLBACK_POOL;
    if (!pool.length) return;
    img.src = pool[attempts % pool.length];
  });
}

export function isUpcoming(ev) {
  return window.AdobeEventModal?.isUpcoming?.(ev) ?? true;
}

export function isPast(ev) {
  if (window.AdobeEventModal?.isPast) return window.AdobeEventModal.isPast(ev);
  const dt = parseEventDate(ev);
  if (!dt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(dt);
  eventDay.setHours(0, 0, 0, 0);
  return eventDay < today;
}

export function isVirtualEvent(ev) {
  const t = String(ev.type || '').toLowerCase();
  return t === 'virtual' || t === 'online';
}

export function getFormatLabel(ev) {
  const t = String(ev.type || '').toLowerCase();
  if (t === 'virtual' || t === 'online') return 'Virtual (online)';
  if (t === 'hybrid') return 'Hybrid (in-person & online)';
  return ev.type || 'In-person';
}

export function getLocationLabel(ev) {
  if (ev.location) return ev.location;
  if (String(ev.type || '').toLowerCase() === 'virtual') return 'Online';
  return ev.type || 'Online';
}

export function getAccessLabel(ev) {
  return isMembersOnlyEvent(ev)
    ? 'Members only — join the hosting club to RSVP.'
    : 'Anyone can view and join.';
}

export function getEventTotalSpots(ev) {
  if (window.AdobeEventSeats?.getCapacity) {
    return window.AdobeEventSeats.getCapacity(ev);
  }
  const n = Number(ev?.capacity ?? ev?.spotsLeft);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function getEventRecap(ev) {
  return getAuth().getEventRecap?.(ev.id, ev) || ev.recap || null;
}

export function hasEventRecap(ev) {
  const recap = getEventRecap(ev);
  if (!recap) return false;
  const data = normalizeEventRecap(recap);
  return Boolean(data.summary?.trim()) || data.highlights.length > 0;
}

export function buildRecapSectionHtml(ev, club, pageConfig = {}) {
  if (!isPast(ev) || !hasEventRecap(ev)) return '';
  const recap = getEventRecap(ev);
  const recapTitle = pageConfig['section-recap'] || 'Event recap';
  return `
    <section class="event-recap-section" id="recap" aria-label="Event recap">
      <h3 class="event-recap-heading">${esc(recapTitle)}</h3>
      <div class="event-recap-body">
        ${buildRecapHtml(recap, ev, club)}
      </div>
    </section>`;
}

export function scrollToRecapIfNeeded() {
  if (window.location.hash !== '#recap') return;
  document.getElementById('recap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function buildAboutHtml(ev, club) {
  const desc = ev.desc || ev.description || '';
  const clubName = club?.name || ev.club || 'Adobe Clubs';
  const dateLabel = formatEventLongDate(ev);
  const locationLabel = getLocationLabel(ev);
  const virtual = isVirtualEvent(ev);
  const membersOnly = isMembersOnlyEvent(ev);
  const parts = [];

  if (desc) {
    String(desc).split(/\n\s*\n/).filter(Boolean).forEach((p) => {
      parts.push(`<p>${esc(p.trim())}</p>`);
    });
  } else {
    parts.push(`<p>Join us for <strong>${esc(ev.title)}</strong>, a get-together hosted by ${esc(clubName)} for the Adobe community.</p>`);
  }

  parts.push(`<p>This event is organised by <strong>${esc(clubName)}</strong> as part of its ongoing programme of meetups and activities at Adobe.${club?.desc ? ` ${esc(club.desc)}` : ''} Whether you're a long-time member or joining for the first time, you're warmly welcome.</p>`);

  if (virtual) {
    parts.push(`<p>We'll meet online on <strong>${esc(dateLabel)}</strong>. The session runs as a live ${esc((ev.type || 'virtual').toLowerCase())} gathering — once you RSVP, a joining link will be shared with you by email and will also appear on this page. We recommend joining a few minutes early to check your audio and video.</p>`);
  } else {
    parts.push(`<p>We'll be getting together in person on <strong>${esc(dateLabel)}</strong> at <strong>${esc(locationLabel)}</strong>. Please plan to arrive a few minutes early so we can start on time and you have a chance to settle in and say hello before things kick off.</p>`);
  }

  parts.push(`<p><strong>What to expect:</strong> expect a friendly, low-pressure atmosphere with plenty of room to participate at your own pace. There'll be time to connect with other members, take part in the main activity, and ask questions. No prior experience is assumed unless noted above — just bring your curiosity.</p>`);

  if (membersOnly) {
    parts.push(`<p><strong>Who can attend:</strong> this is a members-only session, so you'll need to join ${esc(clubName)} before you can RSVP. Joining is free and takes a moment — just hit “Join club to RSVP”. Once you're a member you'll also get updates about future sessions.</p>`);
  } else {
    parts.push(`<p><strong>Who can attend:</strong> this session is open to everyone at Adobe. You don't need to be a member of ${esc(clubName)} to take part — simply RSVP to reserve your spot. If you enjoy it, consider joining the club to stay in the loop on what's next.</p>`);
  }

  return parts.join('');
}

export function buildDetailsListHtml(ev, club) {
  const rows = [
    ['Date & time', formatEventLongDate(ev)],
    ['Format', getFormatLabel(ev)],
    ['Location', getLocationLabel(ev)],
    ['Hosted by', club?.name || ev.club || 'Adobe Clubs'],
    ['Access', getAccessLabel(ev)],
  ];
  const totalSpots = getEventTotalSpots(ev);
  if (totalSpots != null) rows.push(['Total spots', String(totalSpots)]);
  return `
    <dl class="event-detail-grid">
      ${rows.map(([k, v]) => `
        <div class="event-detail-grid-row">
          <dt>${esc(k)}</dt>
          <dd>${esc(v)}</dd>
        </div>`).join('')}
    </dl>`;
}

export const ICON_CAL = `<svg class="event-rail-icon" fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-.5 3a.5.5 0 0 0-.5.5v5.09a.5.5 0 0 0 .5.41h3.09a.5.5 0 0 0-.09-1H10V5.41A.5.5 0 0 0 9.5 5Z"/></svg>`;
export const ICON_PIN = `<svg class="event-rail-icon" fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M14.95 13.96a7 7 0 1 0-9.9 0l1.52 1.5 2.04 1.98.14.12a2 2 0 0 0 2.64-.12l2.43-2.37 1.13-1.12ZM10 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>`;
export const ICON_GLOBE = `<svg class="event-rail-icon" fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M7.99 4.18c-.28.66-.5 1.45-.67 2.32h5.36c-.17-.87-.4-1.66-.67-2.32-.3-.73-.65-1.3-1-1.66C10.64 2.15 10.3 2 10 2c-.3 0-.65.15-1 .52-.36.37-.71.93-1.01 1.66Zm-.1-1.9c-.31.43-.59.94-.83 1.52-.32.78-.58 1.7-.76 2.7H2.8c1-2.05 2.85-3.6 5.1-4.22Zm4.22 0c.31.43.59.94.83 1.52.32.78.58 1.7.76 2.7h3.5a8.02 8.02 0 0 0-5.09-4.22Zm5.5 5.22h-3.76a20.52 20.52 0 0 1 0 5h3.75a8 8 0 0 0 0-5Zm-.41 6h-3.5c-.18 1-.44 1.92-.76 2.7-.24.58-.52 1.1-.83 1.52a8.02 8.02 0 0 0 5.09-4.22ZM10 18c.3 0 .65-.15 1-.52.36-.37.71-.93 1.01-1.66.28-.66.5-1.45.67-2.32H7.32c.17.87.4 1.66.67 2.32.3.73.65 1.3 1 1.66.36.37.7.52 1.01.52Zm-2.1-.28a8.02 8.02 0 0 1-5.1-4.22h3.5c.18 1 .44 1.92.76 2.7.24.58.52 1.1.83 1.52ZM2.4 12.5h3.75a20.52 20.52 0 0 1 0-5H2.4a8 8 0 0 0 0 5ZM7 10c0-.87.06-1.71.16-2.5h5.68a19.44 19.44 0 0 1 0 5H7.16C7.06 11.71 7 10.87 7 10Z"/></svg>`;
export const ICON_SHARE = `<svg class="event-share-icon" fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M12.38 5.7V3.59c0-.48.53-.74.89-.47l.06.05 4.5 4.42c.2.2.23.54.05.77l-.05.07-4.5 4.42c-.34.33-.89.12-.95-.34v-2.18l-.26.03a9.25 9.25 0 0 0-5.19 2.5c-.39.35-.99.03-.93-.5.5-4.09 2.59-6.34 6.15-6.63l.23-.01ZM5.5 4A2.5 2.5 0 0 0 3 6.5v8A2.5 2.5 0 0 0 5.5 17h8a2.5 2.5 0 0 0 2.5-2.5v-1a.5.5 0 0 0-1 0v1c0 .83-.67 1.5-1.5 1.5h-8A1.5 1.5 0 0 1 4 14.5v-8C4 5.67 4.67 5 5.5 5h3a.5.5 0 0 0 0-1h-3Z"/></svg>`;

async function resolveEventContext() {
  const eventId = getEventIdFromUrl();
  if (!eventId) return { error: 'missing-id' };
  const data = await getClubData();
  const allClubs = data.clubs || [];
  const events = getAuth().mergePublishedEvents?.(data.events || [])
    || [...(getAuth().getAllCustomEvents?.() || []), ...(data.events || [])];
  const event = events.find((e) => e.id === eventId);
  if (!event) return { error: 'not-found', eventId };
  const club = getEventClub(event, allClubs);
  return { event, eventId, club, allClubs, events, data };
}

export async function getEventPageContext() {
  if (eventCtxCache) return eventCtxCache;
  if (!eventPageInit) {
    eventPageInit = resolveEventContext().then((ctx) => {
      eventCtxCache = ctx;
      if (!ctx.error) {
        document.title = `${ctx.event.title} — Adobe Clubs`;
      }
      return ctx;
    });
  }
  return eventPageInit;
}

export async function ensureEventScripts() {
  const ctx = await getEventPageContext();
  if (ctx.error) return ctx;
  if (!eventScriptsInit) {
    eventScriptsInit = (async () => {
      await loadEventScripts();
      window.AdobeEventSeats?.init?.(ctx.events);
      window.AdobeEventModal?.setEvents?.(ctx.events);
      window.AdobeEventModal?.init?.({
        clubs: ctx.allClubs,
        events: ctx.events,
        onStateChange(ev) {
          if (ev?.id === ctx.event?.id) {
            window.dispatchEvent(new CustomEvent('adobe-event-page-rsvp-changed', { detail: { eventId: ev.id } }));
          }
        },
      });
    })();
  }
  await eventScriptsInit;
  return ctx;
}

export async function initEventPage({ loadScripts = false } = {}) {
  const ctx = await getEventPageContext();
  if (!ctx.error && loadScripts) await ensureEventScripts();
  return ctx;
}

export function getEventContext() {
  return eventCtxCache;
}

export function renderNotFound(block) {
  block.innerHTML = `
    <div class="event-page-error">
      <h1>Event not found</h1>
      <p>This event may have been removed or the link is out of date.</p>
      <a class="event-page-error-link" href="/events">← Back to events</a>
    </div>`;
  document.title = 'Event not found — Adobe Clubs';
}

export function refreshRegisterButton(ev, button) {
  const btn = button || document.getElementById('registration_button');
  if (!btn || !ev) return;

  const pageConfig = window.__eventPageConfig || {};

  if (isPast(ev)) {
    btn.textContent = cfg(pageConfig, 'rsvp-ended-label', 'Event ended');
    btn.disabled = true;
    btn.classList.add('event-register-btn--muted');
    btn.onclick = null;
    return;
  }

  const state = window.AdobeEventModal?.getActionState?.(ev)
    || { mode: 'rsvp', label: 'RSVP', joined: false };

  btn.disabled = Boolean(state.disabled);
  btn.classList.remove('event-register-btn--muted', 'is-joined', 'is-join-club', 'is-seats-full');
  btn.classList.toggle('is-joined', state.joined);
  btn.classList.toggle('is-join-club', state.mode === 'join-club');
  btn.classList.toggle('is-seats-full', state.mode === 'seats-full');

  if (state.mode === 'seats-full') {
    btn.textContent = cfg(pageConfig, 'seats-full-label', 'Seats full');
    btn.disabled = true;
    btn.onclick = null;
    return;
  }

  if (state.mode === 'join-club') {
    btn.textContent = cfg(pageConfig, 'join-club-rsvp-label', 'Join club to RSVP');
  } else if (state.joined) {
    btn.textContent = "RSVP'd";
  } else {
    btn.textContent = cfg(pageConfig, 'rsvp-label', 'RSVP');
  }

  btn.onclick = () => {
    if (!getAuth().isAuthenticated()) {
      const login = getAuth().loginUrlWithNext?.()
        || `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`)}`;
      window.location.href = login;
      return;
    }
    window.AdobeEventModal?.handleRsvpClick?.(ev, btn);
    refreshRegisterButton(ev, btn);
  };
}

export function wireShareButton(ev) {
  const btn = document.getElementById('event-share-btn');
  if (!btn || !ev) return;
  btn.addEventListener('click', async () => {
    const url = new URL(eventPageUrl(ev.id), window.location.href).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: ev.title, text: ev.title, url });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      const label = btn.querySelector('span');
      if (label) {
        const prev = label.textContent;
        label.textContent = 'Link copied';
        window.setTimeout(() => { label.textContent = prev; }, 2000);
      }
    } catch {
      window.prompt('Copy this event link:', url);
    }
  });
}

export function bindEventPageListeners(ev) {
  if (!ev) return;
  const refresh = () => refreshRegisterButton(ev);
  window.addEventListener('adobe-rsvp-changed', refresh);
  window.addEventListener('adobe-club-members-changed', refresh);
  window.addEventListener('adobe-event-page-rsvp-changed', refresh);
  getAuth().onPublishedContentChange?.(() => {
    eventPageInit = null;
    eventScriptsInit = null;
    eventCtxCache = null;
    window.location.reload();
  });
}
