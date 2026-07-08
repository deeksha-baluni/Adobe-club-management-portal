/**
 * Event Hero — event detail page hero.
 * da.live: key | value config rows (no type field required).
 */
import {
  getEventPageContext,
  ensureEventScripts,
  wireShareButton,
  ICON_SHARE,
  bindEventPageListeners,
  getEventImageSrc,
  getClubImageSrc as getEventClubImageSrc,
  formatEventLongDate,
  isUpcoming,
  wireImageFallback,
  esc,
} from '../../scripts/event/event-page.js';
import { readPageConfig, cfg } from '../../scripts/lib/block-config.js';
import { resolveCompressedStockUrl } from '../../scripts/lib/event-images.js';
import { preloadHeroImage } from '../../scripts/club/club-page.js';

const EVENT_DEFAULTS = {
  'back-label': '← All events',
  'back-href': '/events',
  'share-label': 'Share',
  'status-upcoming': 'Upcoming',
  'status-past': 'Past',
  'not-found-title': 'Event not found',
  'not-found-text': 'This event may have been removed or the link is out of date.',
  'not-found-link': '← Back to events',
  'not-found-href': '/events',
};

function renderEventNotFound(block, config) {
  block.innerHTML = `
    <div class="event-page-error">
      <h1>${esc(cfg(config, 'not-found-title', EVENT_DEFAULTS['not-found-title']))}</h1>
      <p>${esc(cfg(config, 'not-found-text', EVENT_DEFAULTS['not-found-text']))}</p>
      <a class="event-page-error-link" href="${esc(cfg(config, 'not-found-href', EVENT_DEFAULTS['not-found-href']))}">${esc(cfg(config, 'not-found-link', EVENT_DEFAULTS['not-found-link']))}</a>
    </div>`;
  document.title = `${cfg(config, 'not-found-title', EVENT_DEFAULTS['not-found-title'])} — Adobe Clubs`;
}

export default async function decorate(block) {
  const config = { ...EVENT_DEFAULTS, ...readPageConfig(block, {}) };

  block.innerHTML = '';
  block.classList.add('event-hero');

  document.documentElement.classList.add('event-detail-route');
  document.body.classList.add('event-detail-page');
  document.querySelector('main')?.classList.add('event-detail-page');

  let ctx;
  try {
    ctx = await getEventPageContext();
  } catch (err) {
    console.error('[event-hero]', err);
    renderEventNotFound(block, config);
    return;
  }

  if (ctx.error) {
    renderEventNotFound(block, config);
    return;
  }

  const { event: ev, club } = ctx;
  const heroSrc = getEventImageSrc(ev);
  const clubSrc = getEventClubImageSrc(club);
  const upcoming = isUpcoming(ev);
  const statusLabel = upcoming
    ? cfg(config, 'status-upcoming', EVENT_DEFAULTS['status-upcoming'])
    : cfg(config, 'status-past', EVENT_DEFAULTS['status-past']);
  const statusClass = upcoming ? 'event-status-badge--upcoming' : 'event-status-badge--past';
  const dateLabel = formatEventLongDate(ev);
  const backHref = cfg(config, 'back-href', EVENT_DEFAULTS['back-href']);
  const shareLabel = cfg(config, 'share-label', EVENT_DEFAULTS['share-label']);

  preloadHeroImage(heroSrc);

  window.AdobeBreadcrumbs?.set([
    { label: 'Home', href: window.AdobeBreadcrumbs?.getHomeHref?.() || '/' },
    { label: 'Events', href: '/events' },
    { label: ev.title, current: true },
  ]);

  block.innerHTML = `
    <div class="ev-inner">
      <a class="ev-back" href="${esc(backHref)}">${esc(cfg(config, 'back-label', EVENT_DEFAULTS['back-label']))}</a>
      <div class="event-page-topbar">
        <span id="event_title_top" class="event-page-top-title">${esc(ev.title)}</span>
        <button type="button" class="event-share-btn" id="event-share-btn" aria-label="${esc(shareLabel)}">
          ${ICON_SHARE}
          <span>${esc(shareLabel)}</span>
        </button>
      </div>
      <div class="event-hero-stack">
        <div class="event-hero-img event-hero-img--primary" id="event-hero-primary"></div>
      </div>
      <div class="event-page-container">
        <div class="event-page-intro">
          <div class="event-club-thumb-wrap">
            <img class="event-club-thumb" src="" alt="" width="56" height="56" loading="lazy" decoding="async">
          </div>
          <div class="event-page-intro-text">
            <div class="event-status-row">
              <span class="event-date-label">${esc(dateLabel)}</span>
              <span class="event-status-badge ${statusClass}">${esc(statusLabel)}</span>
            </div>
            <h1 id="event_title" class="event-page-title">${esc(ev.title)}</h1>
            ${club ? `<p class="event-page-club">${esc(club.name)}</p>` : ''}
          </div>
        </div>
      </div>
      <div class="event-list-rail event-list-rail--placeholder" aria-hidden="true"></div>
    </div>`;

  const heroContainer = block.querySelector('#event-hero-primary');
  if (heroContainer) {
    const heroImg = document.createElement('img');
    heroImg.src = heroSrc;
    heroImg.alt = '';
    heroImg.width = 1000;
    heroImg.height = 429;
    heroImg.loading = 'eager';
    heroImg.decoding = 'async';
    if ('fetchPriority' in heroImg) heroImg.fetchPriority = 'high';
    heroContainer.append(heroImg);
  }

  const heroImg = block.querySelector('#event-hero-primary img');
  if (heroImg) {
    heroImg.addEventListener('error', () => {
      heroImg.src = resolveCompressedStockUrl('evt-hero.avif');
    }, { once: true });
  }

  const clubThumb = block.querySelector('.event-club-thumb');
  if (clubThumb) {
    const thumbSrc = clubSrc || heroSrc;
    if (thumbSrc) clubThumb.src = thumbSrc;
    wireImageFallback(clubThumb, club?.id || ev.id);
  }

  wireShareButton(ev);

  ensureEventScripts().then(() => {
    bindEventPageListeners(ev);
  }).catch((err) => {
    console.error('[event-hero] scripts', err);
  });

  document.dispatchEvent(new CustomEvent('event-hero-ready'));
}
