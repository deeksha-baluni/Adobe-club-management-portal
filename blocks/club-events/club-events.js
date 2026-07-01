/**
 * Club Events block — upcoming events with date filters and RSVP.
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

function getClubEventActionState(ev, club) {
  if (!getAuth().isClubJoined(club.id)) {
    return { label: 'Members only', joined: false, membersOnly: true };
  }
  const rsvped = getAuth().isEventRsvped?.(ev.id);
  return { label: rsvped ? "RSVP'd" : 'RSVP', joined: Boolean(rsvped), membersOnly: false };
}

function renderAction(ev, club) {
  const state = getClubEventActionState(ev, club);
  if (state.membersOnly) {
    return `<span class="ce-rsvp ce-rsvp--locked">${esc(state.label)}</span>`;
  }
  return `<button type="button" class="ce-rsvp${state.joined ? ' is-joined' : ''}" data-event-id="${esc(ev.id)}">${esc(state.label)}</button>`;
}

function renderEmpty(message, visible) {
  return `<p class="ce-empty"${visible ? '' : ' hidden'}>
    <img src="/assets/images/club_details/icons/delete.png" alt="" width="56" height="56" decoding="async">
    <span>${esc(message)}</span>
  </p>`;
}

function renderCards(events, club, imagePool) {
  const cards = events.map((ev, i) => {
    const imgSrc = getEventImageSrc(ev) || pickClubImage(imagePool, i + 1, club);
    return `
      <article class="ce-card" data-date-filter="${esc(getEventDateFilter(ev))}" data-event-id="${esc(ev.id)}" tabindex="0" role="button">
        <div class="ce-card-img">
          <img src="${esc(imgSrc)}" alt="" loading="lazy" decoding="async">
        </div>
        <div class="ce-card-foot">
          <p class="ce-card-label">${esc(ev.title || 'Club event')} · ${esc(formatEventDate(ev))}</p>
          <div class="ce-card-action">${renderAction(ev, club)}</div>
        </div>
      </article>`;
  }).join('');
  const emptyMsg = events.length ? 'No events available for this day.' : 'No upcoming events for this club yet.';
  return `${cards}${renderEmpty(emptyMsg, !events.length)}`;
}

function refreshActions(block, club, upcomingEvents) {
  block.querySelectorAll('.ce-card[data-event-id]').forEach((card) => {
    const ev = upcomingEvents.find((item) => item.id === card.dataset.eventId);
    if (!ev) return;
    const actionWrap = card.querySelector('.ce-card-action');
    if (actionWrap) actionWrap.innerHTML = renderAction(ev, club);
  });
  wireRsvp(block, club, upcomingEvents);
}

function wireRsvp(block, club, upcomingEvents) {
  block.querySelectorAll('.ce-rsvp[data-event-id]').forEach((btn) => {
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
  block.querySelectorAll('.ce-card[data-event-id]').forEach((card) => {
    const open = () => {
      const id = card.dataset.eventId;
      if (id) window.location.href = `/events?event=${encodeURIComponent(id)}`;
    };
    card.addEventListener('click', (e) => {
      if (e.target.closest('.ce-rsvp[data-event-id]')) return;
      open();
    });
    card.addEventListener('keydown', (e) => {
      if (e.target.closest('.ce-rsvp[data-event-id]')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

function wireFilters(block) {
  const filterBar = block.querySelector('#ce-filters');
  const grid = block.querySelector('#ce-grid');
  if (!filterBar || !grid) return;

  const applyFilter = (filter) => {
    const cards = grid.querySelectorAll('.ce-card');
    const emptyMsg = grid.querySelector('.ce-empty');
    if (!cards.length) {
      if (emptyMsg) emptyMsg.hidden = false;
      return;
    }
    if (filter === 'all') {
      cards.forEach((card) => { card.hidden = false; });
      if (emptyMsg) emptyMsg.hidden = true;
      grid.classList.remove('is-filter-empty');
      return;
    }
    let visible = 0;
    cards.forEach((card) => {
      const match = card.dataset.dateFilter === filter;
      card.hidden = !match;
      if (match) visible += 1;
    });
    if (emptyMsg) {
      emptyMsg.querySelector('span').textContent = 'No events available for this day.';
      emptyMsg.hidden = visible !== 0;
    }
    grid.classList.toggle('is-filter-empty', visible === 0);
  };

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-date-filter]');
    if (!btn) return;
    filterBar.querySelectorAll('.ce-chip').forEach((el) => el.classList.toggle('is-active', el === btn));
    applyFilter(btn.dataset.dateFilter);
  });
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
    <div class="club-section-inner" id="club-events">
      <h2 class="club-section-title">Find your next ${esc(club.tag.toLowerCase())} event</h2>
      <div class="ce-filters" id="ce-filters">
        <button type="button" class="ce-chip is-active" data-date-filter="all">All dates</button>
        <button type="button" class="ce-chip" data-date-filter="today">Today</button>
        <button type="button" class="ce-chip" data-date-filter="tomorrow">Tomorrow</button>
        <button type="button" class="ce-chip" data-date-filter="week">This week</button>
      </div>
      <div class="ce-grid${upcomingEvents.length ? '' : ' is-filter-empty'}" id="ce-grid">${renderCards(upcomingEvents, club, imagePool)}</div>
    </div>`;

  wireFilters(block);
  wireCards(block, club, upcomingEvents);
  window.__clubEventsRefresh = () => refreshActions(block, club, upcomingEvents);
  window.addEventListener('adobe-club-join-changed', (e) => {
    if (e.detail?.clubId === club.id) refreshActions(block, club, upcomingEvents);
  });
}
