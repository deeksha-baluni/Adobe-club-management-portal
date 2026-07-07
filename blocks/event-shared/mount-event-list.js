/**
 * Event List body mount — shared by event-list block and page-hero fallback.
 */
import {
  getEventPageContext,
  ensureEventScripts,
  refreshRegisterButton,
  bindEventPageListeners,
} from './event-page.js';
import { readPageConfig } from '../club-shared/block-config.js';
import { mountRsvpSection } from './sections/rsvp-section.js';
import { mountAboutSection } from './sections/about-section.js';
import { mountDetailsSection } from './sections/details-section.js';
import { mountOrganizerSection } from './sections/organizer-section.js';

function scheduleIdle(fn, timeout = 2000) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout });
  } else {
    window.setTimeout(fn, 1);
  }
}

/** Move RSVP rail into page-hero grid (hero + sticky rail share one row). */
function attachEventRailToHero(rail) {
  const attach = () => {
    const evInner = document.querySelector('.event-hero .ev-inner, .page-hero--event .ev-inner');
    if (!evInner) return false;
    evInner.querySelector('.event-list-rail--placeholder')?.remove();
    const existing = evInner.querySelector('.event-list-rail:not(.event-list-rail--placeholder)');
    if (existing && existing !== rail) existing.remove();
    evInner.appendChild(rail);
    return true;
  };

  if (attach()) return;
  document.addEventListener('event-hero-ready', () => { attach(); }, { once: true });
}

export const EVENT_LIST_DEFAULTS = {
  'events-data': '/data/data.json',
  'section-about': 'About this event',
  'section-details': 'Event details',
  'section-recap': 'Event recap',
  'section-organizer': 'Organiser & contact',
  'organizer-intro': "Questions about this event? Reach out to the organisers below — we're happy to help.",
  'organizer-guest-text': 'Organiser contact details are only visible to signed-in Adobe Clubs members.',
  'organizer-sign-in': 'Sign in to view contact details',
  'hosting-club-label': 'Hosting club',
  'slack-channel-label': 'Slack channel',
  'clubs-admin-label': 'Clubs admin',
  'rsvp-label': 'RSVP',
  'rsvp-ended-label': 'Event ended',
  'seats-full-label': 'Seats full',
  'join-club-rsvp-label': 'Join club to RSVP',
};

export default async function mountEventListBlock(block) {
  if (!block) return;
  if (block.dataset.eventListMounted === 'true' || block.querySelector('.event-list-body')) {
    block.dataset.eventListMounted = 'true';
    return;
  }
  if (block.dataset.eventListMounted === 'pending') return;

  block.dataset.eventListMounted = 'pending';

  const pageConfig = readPageConfig(block, EVENT_LIST_DEFAULTS);

  block.innerHTML = '';
  block.classList.add('event-list');

  let ctx;
  try {
    ctx = await getEventPageContext();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[event-list]', err);
    block.dataset.eventListMounted = '';
    return;
  }
  if (ctx.error) {
    block.dataset.eventListMounted = '';
    return;
  }

  ctx.pageConfig = pageConfig;
  window.__eventPageConfig = pageConfig;

  const rail = document.createElement('div');
  rail.className = 'event-list-rail';
  mountRsvpSection(rail, ctx);

  const body = document.createElement('div');
  body.className = 'event-list-body';
  mountAboutSection(body, ctx);
  mountDetailsSection(body, ctx);
  mountOrganizerSection(body, ctx);

  block.appendChild(body);
  attachEventRailToHero(rail);
  block.dataset.eventListMounted = 'true';

  scheduleIdle(() => {
    ensureEventScripts()
      .then(() => {
        refreshRegisterButton(ctx.event, rail.querySelector('#registration_button'));
        bindEventPageListeners(ctx.event);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[event-list] RSVP scripts', err);
      });
  }, 2500);
}
