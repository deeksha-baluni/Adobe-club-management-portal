import {
  esc,
  getAuth,
  redirectToLogin,
  getUpcomingClubEvents,
  getClubImagePool,
  getEventImageSrc,
  pickClubImage,
  formatEventDate,
  parseEventDate,
} from '../../club/club-page.js';
import { cfg, fillTemplate } from '../block-config.js';
import { hasSiblingSectionHead } from '../section-head.js';

function getLabels(pageConfig) {
  return {
    rsvp: cfg(pageConfig, 'rsvp-label', 'RSVP'),
    rsvpd: cfg(pageConfig, 'rsvpd-label', "RSVP'd"),
    membersOnly: cfg(pageConfig, 'members-only-label', 'Members only'),
    eventsEmpty: cfg(pageConfig, 'events-empty', 'No upcoming events for this club yet.'),
    eventsDayEmpty: cfg(pageConfig, 'events-day-empty', 'No events available for this day.'),
    filterAll: cfg(pageConfig, 'filter-all-dates', 'All dates'),
    filterToday: cfg(pageConfig, 'filter-today', 'Today'),
    filterTomorrow: cfg(pageConfig, 'filter-tomorrow', 'Tomorrow'),
    filterWeek: cfg(pageConfig, 'filter-this-week', 'This week'),
  };
}

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

function getClubEventActionState(ev, club, labels) {
  if (!getAuth().isAuthenticated()) {
    return { label: labels.rsvp, joined: false, membersOnly: false };
  }
  if (!getAuth().isClubJoined(club.id)) {
    return { label: labels.membersOnly, joined: false, membersOnly: true };
  }
  const rsvped = getAuth().isEventRsvped?.(ev.id);
  return { label: rsvped ? labels.rsvpd : labels.rsvp, joined: Boolean(rsvped), membersOnly: false };
}

function renderAction(ev, club, labels) {
  const state = getClubEventActionState(ev, club, labels);
  if (state.membersOnly) {
    return `<span class="ce-rsvp ce-rsvp--members-only" aria-label="Members only event">${esc(state.label)}</span>`;
  }
  return `<button type="button" class="ce-rsvp${state.joined ? ' is-joined' : ''}" data-event-id="${esc(ev.id)}">${esc(state.label)}</button>`;
}

function renderCardMeta(ev) {
  const title = ev.title || 'Club event';
  const venue = ev.location || '';
  const date = formatEventDate(ev);
  if (venue) {
    return `
    <div class="ce-card-copy">
      <p class="ce-card-title">${esc(title)}</p>
      <p class="ce-card-venue">${esc(venue)}</p>
      <p class="ce-card-date">${esc(date)}</p>
    </div>`;
  }
  return `
    <div class="ce-card-copy">
      <p class="ce-card-title">${esc(title)}</p>
      <p class="ce-card-date">${esc(date)}</p>
    </div>`;
}

function renderEmpty(message, visible) {
  return `<p class="ce-empty"${visible ? '' : ' hidden'}>
    <img src="/assets/images/club_details/icons/delete.png" alt="" width="56" height="56" decoding="async">
    <span>${esc(message)}</span>
  </p>`;
}

function renderCards(events, club, imagePool, labels) {
  const cards = events.map((ev, i) => {
    const imgSrc = getEventImageSrc(ev) || pickClubImage(imagePool, i + 1, club);
    return `
      <article class="ce-card" data-date-filter="${esc(getEventDateFilter(ev))}" data-event-id="${esc(ev.id)}" tabindex="0" role="button">
        <div class="ce-card-img">
          <img src="${esc(imgSrc)}" alt="" width="320" height="200" loading="lazy" decoding="async">
        </div>
        <div class="ce-card-foot">
          ${renderCardMeta(ev)}
          <div class="ce-card-action">${renderAction(ev, club, labels)}</div>
        </div>
      </article>`;
  }).join('');
  const emptyMsg = events.length ? labels.eventsDayEmpty : labels.eventsEmpty;
  return `${cards}${renderEmpty(emptyMsg, !events.length)}`;
}

function refreshActions(block, club, upcomingEvents, labels) {
  block.querySelectorAll('.ce-card[data-event-id]').forEach((card) => {
    const ev = upcomingEvents.find((item) => item.id === card.dataset.eventId);
    if (!ev) return;
    const actionWrap = card.querySelector('.ce-card-action');
    if (actionWrap) actionWrap.innerHTML = renderAction(ev, club, labels);
  });
  wireRsvp(block, club, upcomingEvents, labels);
}

function wireRsvp(block, club, upcomingEvents, labels) {
  block.querySelectorAll('.ce-rsvp[data-event-id]').forEach((btn) => {
    const clone = btn.cloneNode(true);
    btn.replaceWith(clone);
    clone.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!getAuth().isAuthenticated()) {
        redirectToLogin();
        return;
      }
      const ev = upcomingEvents.find((item) => item.id === clone.dataset.eventId);
      if (!ev || !getAuth().isClubJoined(club.id)) return;
      getAuth().toggleEventRsvp?.(ev.id);
      refreshActions(block, club, upcomingEvents, labels);
    });
  });
}

function wireCards(block, club, upcomingEvents, labels, eventBase) {
  wireRsvp(block, club, upcomingEvents, labels);
  block.querySelectorAll('.ce-card[data-event-id]').forEach((card) => {
    const open = () => {
      const id = card.dataset.eventId;
      if (id) window.location.href = `${eventBase}?id=${encodeURIComponent(id)}`;
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

function wireFilters(block, labels) {
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
      emptyMsg.querySelector('span').textContent = labels.eventsDayEmpty;
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

export function mountClubEvents(block, ctx) {
  const { club, events, gallery, pageConfig = {} } = ctx;
  const labels = getLabels(pageConfig);
  const eventBase = cfg(pageConfig, 'detail-event-base', '/event').replace(/\/$/, '');
  const sectionTitle = fillTemplate(
    cfg(pageConfig, 'section-events', cfg(pageConfig, 'title', 'Find your next {tag} event')),
    { tag: (club.tag || '').toLowerCase() },
  );
  const showTitle = !hasSiblingSectionHead(block);

  window.__clubPageEvents = events;
  const upcomingEvents = getUpcomingClubEvents(club, events);
  const imagePool = getClubImagePool(club, gallery);

  block.innerHTML = `
    <div class="club-cards-body club-cards-body--events" id="club-events">
      ${showTitle ? `<h2 class="club-section-title">${esc(sectionTitle)}</h2>` : ''}
      <div class="ce-filters" id="ce-filters">
        <button type="button" class="ce-chip is-active" data-date-filter="all">${esc(labels.filterAll)}</button>
        <button type="button" class="ce-chip" data-date-filter="today">${esc(labels.filterToday)}</button>
        <button type="button" class="ce-chip" data-date-filter="tomorrow">${esc(labels.filterTomorrow)}</button>
        <button type="button" class="ce-chip" data-date-filter="week">${esc(labels.filterWeek)}</button>
      </div>
      <div class="ce-grid${upcomingEvents.length ? '' : ' is-filter-empty'}" id="ce-grid">${renderCards(upcomingEvents, club, imagePool, labels)}</div>
    </div>`;

  wireFilters(block, labels);
  wireCards(block, club, upcomingEvents, labels, eventBase);
  window.__clubEventsRefresh = () => refreshActions(block, club, upcomingEvents, labels);
  window.addEventListener('adobe-club-join-changed', (e) => {
    if (e.detail?.clubId === club.id) refreshActions(block, club, upcomingEvents, labels);
  });
}
