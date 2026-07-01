/**
 * Event Hero block — back link, topbar, hero image, intro card head.
 */

import {
  esc,
  initEventPage,
  renderNotFound,
  getEventImageSrc,
  getClubImageSrc,
  formatEventLongDate,
  isUpcoming,
  wireImageFallback,
  wireShareButton,
  ICON_SHARE,
  bindEventPageListeners,
} from '../event-shared/event-page.js';

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('event-hero');

  let ctx;
  try {
    ctx = await initEventPage();
  } catch (err) {
    console.error('[event-hero]', err);
    renderNotFound(block);
    return;
  }

  if (ctx.error) {
    renderNotFound(block);
    return;
  }

  const { event: ev, club } = ctx;
  const heroSrc = getEventImageSrc(ev);
  const clubSrc = getClubImageSrc(club);
  const upcoming = isUpcoming(ev);
  const statusLabel = upcoming ? 'Upcoming' : 'Past';
  const statusClass = upcoming ? 'event-status-badge--upcoming' : 'event-status-badge--past';
  const dateLabel = formatEventLongDate(ev);

  block.innerHTML = `
    <div class="ev-inner">
      <a class="ev-back" href="/events">← All events</a>
      <div class="event-page-topbar">
        <span id="event_title_top" class="event-page-top-title">${esc(ev.title)}</span>
        <button type="button" class="event-share-btn" id="event-share-btn" aria-label="Share event">
          ${ICON_SHARE}
          <span>Share</span>
        </button>
      </div>
      <div class="event-hero-stack">
        <div class="event-hero-img event-hero-img--primary" id="event-hero-primary" style="background-image:url('${esc(heroSrc)}')"></div>
      </div>
      <div class="event-page-container">
        <div class="event-page-intro">
          <div class="event-club-thumb-wrap">
            <img class="event-club-thumb" src="${esc(clubSrc || heroSrc)}" alt="" loading="lazy" decoding="async">
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
    </div>`;

  const heroEl = block.querySelector('#event-hero-primary');
  const img = new Image();
  img.onload = () => { if (heroEl) heroEl.style.backgroundImage = `url('${img.src}')`; };
  img.src = heroSrc;

  const clubThumb = block.querySelector('.event-club-thumb');
  if (clubThumb) wireImageFallback(clubThumb, club?.id || ev.id);

  wireShareButton(ev);
  bindEventPageListeners(ev);
}
