/**
 * Club Events block — original events section with filters and RSVP.
 */

import {
  esc,
  getAuth,
  loadClubScripts,
  resolveClubContext,
  getUpcomingClubEvents,
  getClubImagePool,
  getEventImageSrc,
  pickClubImage,
  formatEventDate,
  parseEventDate,
} from '../club-shared/club-page.js';

function getEventDateFilter(ev) {
  const eventDate = parseEventDate(ev);
  if (!eventDate) return 'all';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  const dayOfWeek = weekEnd.getDay();
  weekEnd.setDate(weekEnd.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek));
  const d = new Date(eventDate);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'today';
  if (d.getTime() === tomorrow.getTime()) return 'tomorrow';
  if (d > today && d <= weekEnd) return 'week';
  return 'later';
}

function renderClubEventAction(ev, club) {
  if (!getAuth().isClubJoined(club.id)) {
    return `<span class="club-event-rsvp club-event-rsvp--members-only" aria-label="Members only event">Members only</span>`;
  }
  const rsvped = getAuth().isEventRsvped?.(ev.id);
  const joined = Boolean(rsvped);
  return `<button type="button" class="club-event-rsvp${joined ? ' is-joined' : ''}" data-event-id="${esc(ev.id)}" aria-label="${esc(joined ? `RSVP'd: ${ev.title}` : `RSVP for ${ev.title}`)}">${joined ? "RSVP'd" : 'RSVP'}</button>`;
}

function renderEventsEmptyState(message, visible = false) {
  return `<p class="club-events-empty club-events-filter-empty" id="club-events-filter-empty"${visible ? '' : ' hidden'}>
    <img src="/assets/images/club_details/icons/delete.png" alt="" class="club-events-empty-icon" width="56" height="56" decoding="async">
    <span>${esc(message)}</span>
  </p>`;
}

function renderEventCards(events, club, imagePool) {
  const cards = events.map((ev, i) => {
    const imgSrc = getEventImageSrc(ev) || pickClubImage(imagePool, i + 1, club);
    const dateFilter = getEventDateFilter(ev);
    return `
      <article class="club-event-card" data-date-filter="${esc(dateFilter)}" data-event-id="${esc(ev.id)}" tabindex="0" role="button" aria-label="View ${esc(ev.title)} details">
        <div class="club-event-card-link">
          <div class="club-event-card-img">
            <img src="${esc(imgSrc)}" alt="" loading="lazy" decoding="async">
          </div>
        </div>
        <div class="club-event-card-footer">
          <p class="club-event-card-label">${esc(ev.title || 'Club event')} · ${esc(formatEventDate(ev))}</p>
          <div class="club-event-card-action">${renderClubEventAction(ev, club)}</div>
        </div>
      </article>`;
  }).join('');
  const emptyMessage = events.length ? 'No events available for this day.' : 'No upcoming events for this club yet.';
  return `${cards}${renderEventsEmptyState(emptyMessage, !events.length)}`;
}

function refreshActions(block, club, upcomingEvents) {
  block.querySelectorAll('.club-event-card[data-event-id]').forEach((card) => {
    const ev = upcomingEvents.find((item) => item.id === card.dataset.eventId);
    if (!ev) return;
    const actionWrap = card.querySelector('.club-event-card-action');
    if (actionWrap) actionWrap.innerHTML = renderClubEventAction(ev, club);
  });
  wireRsvp(block, club, upcomingEvents);
}

function wireRsvp(block, club, upcomingEvents) {
  block.querySelectorAll('.club-event-rsvp[data-event-id]').forEach((btn) => {
    const clone = btn.cloneNode(true);
    btn.replaceWith(clone);
    clone.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ev = upcomingEvents.find((item) => item.id === clone.dataset.eventId);
      if (!ev || !getAuth().isClubJoined(club.id)) return;
      if (!getAuth().isAuthenticated()) {
        window.location.href = getAuth().loginUrlWithNext?.() || '/login';
        return;
      }
      getAuth().toggleEventRsvp?.(ev.id);
      refreshActions(block, club, upcomingEvents);
    });
  });
}

function wireCards(block, club, upcomingEvents) {
  wireRsvp(block, club, upcomingEvents);
  block.querySelectorAll('.club-event-card[data-event-id]').forEach((card) => {
    const open = () => {
      const id = card.dataset.eventId;
      if (id) window.location.href = `/events?event=${encodeURIComponent(id)}`;
    };
    card.addEventListener('click', (e) => {
      if (e.target.closest('.club-event-rsvp[data-event-id]')) return;
      open();
    });
    card.addEventListener('keydown', (e) => {
      if (e.target.closest('.club-event-rsvp[data-event-id]')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

function wireFilters(block) {
  const filterBar = block.querySelector('#club-date-filters');
  const grid = block.querySelector('#club-event-grid');
  if (!filterBar || !grid) return;

  let gridNaturalHeight = 0;
  const measureGridHeight = () => {
    grid.style.minHeight = '';
    gridNaturalHeight = grid.offsetHeight;
  };

  const applyFilter = (filter) => {
    const cards = grid.querySelectorAll('.club-event-card');
    const emptyMsg = document.getElementById('club-events-filter-empty');
    if (!cards.length) {
      if (emptyMsg) {
        emptyMsg.querySelector('span').textContent = 'No upcoming events for this club yet.';
        emptyMsg.hidden = false;
      }
      grid.classList.add('is-filter-empty');
      return;
    }
    if (filter === 'all') {
      cards.forEach((card) => {
        card.classList.remove('is-filter-hidden');
        card.hidden = false;
      });
      if (emptyMsg) emptyMsg.hidden = true;
      grid.classList.remove('is-filter-empty');
      measureGridHeight();
      return;
    }
    let visible = 0;
    cards.forEach((card) => {
      const match = card.dataset.dateFilter === filter;
      card.classList.toggle('is-filter-hidden', !match);
      card.hidden = !match;
      if (match) visible += 1;
    });
    const showEmpty = visible === 0;
    if (emptyMsg) {
      emptyMsg.querySelector('span').textContent = 'No events available for this day.';
      emptyMsg.hidden = !showEmpty;
    }
    grid.classList.toggle('is-filter-empty', showEmpty);
    if (showEmpty && gridNaturalHeight) {
      grid.style.minHeight = `${gridNaturalHeight}px`;
    } else {
      grid.style.minHeight = '';
    }
  };

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-date-filter]');
    if (!btn) return;
    filterBar.querySelectorAll('.club-filter-chip').forEach((el) => el.classList.toggle('is-active', el === btn));
    applyFilter(btn.dataset.dateFilter);
  });
  applyFilter('all');
}

export default async function decorate(block) {
  block.innerHTML = '';
  await loadClubScripts();

  let ctx;
  try {
    ctx = await resolveClubContext();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[club-events]', err);
    return;
  }
  if (ctx.error) return;

  const { club, events, gallery } = ctx;
  window.__clubPageEvents = events;
  const upcomingEvents = getUpcomingClubEvents(club, events);
  const imagePool = getClubImagePool(club, gallery);

  block.innerHTML = `
    <div class="club-detail-page">
      <section class="club-block" id="club-events">
        <h2 class="club-section-title">Find your next ${esc(club.tag.toLowerCase())} event</h2>
        <div class="club-filters" id="club-date-filters">
          <button type="button" class="club-filter-chip is-active" data-date-filter="all">All dates</button>
          <button type="button" class="club-filter-chip" data-date-filter="today">Today</button>
          <button type="button" class="club-filter-chip" data-date-filter="tomorrow">Tomorrow</button>
          <button type="button" class="club-filter-chip" data-date-filter="week">This week</button>
        </div>
        <div class="club-event-grid" id="club-event-grid">${renderEventCards(upcomingEvents, club, imagePool)}</div>
      </section>
    </div>`;

  wireFilters(block);
  wireCards(block, club, upcomingEvents);
  window.__clubEventsRefresh = () => refreshActions(block, club, upcomingEvents);
  window.addEventListener('adobe-club-join-changed', (e) => {
    if (e.detail?.clubId === club.id) refreshActions(block, club, upcomingEvents);
  });
}
