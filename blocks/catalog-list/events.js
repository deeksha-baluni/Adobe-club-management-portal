/**
 * Events List — search, filters, upcoming + past poster grids.
 * da.live: key | value config rows.
 */
import { loadCSS, loadScript } from '../../scripts/aem.js';
import { readPageConfig, cfg } from '../club-shared/block-config.js';
import {
  getEventImageSrc as resolveEventImageSrc,
  COMPRESSED_EVENTS_BASE,
  EVENT_STOCK_FALLBACK_POOL,
} from '../club-shared/event-images.js';

const DEFAULTS = {
  'events-data': '/data/data.json',
  'detail-base': '/event',
  'search-placeholder': 'Search events by title, club, location…',
  'filters-title': 'Filters',
  'clear-filters-text': 'Clear all',
  'upcoming-title': 'Upcoming events',
  'past-title': 'Past events',
  'empty-upcoming': 'No upcoming events match your filters.',
  'empty-past': 'No past events match your filters.',
  'loading-text': 'Loading events…',
  'error-text': 'Events unavailable right now.',
  'guest-eligible-hint': 'Open events only while signed out. Sign in to include your clubs.',
  'guest-rsvp-hint': 'Sign in to filter events you have RSVP’d to.',
  'members-only-badge': 'Members only',
  'past-badge': 'Past',
  'recap-soon': 'Recap coming soon',
  'read-recap': 'Read recap →',
  'seats-full-label': 'Seats full',
  'date-group-title': 'Date',
  'my-clubs-group-title': 'My clubs',
  'hosting-club-group-title': 'Hosting club',
  'format-group-title': 'Format',
  'eligibility-group-title': 'Eligibility',
  'rsvp-group-title': 'RSVP status',
};

const IMG_FALLBACK = `${COMPRESSED_EVENTS_BASE}evt-hero.avif`;

let PAGE_CONFIG = { ...DEFAULTS };

const MONTH_INDEX = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

let ALL_EVENTS = [];
let ALL_CLUBS = [];
let SEARCH_QUERY = '';
let depsLoaded = false;
let pageGrids = null;

const FILTER_STATE = {
  dateWhen: 'all',
  clubs: new Set(),
  types: new Set(),
  rsvp: 'all',
  eligible: 'all',
  myClubs: 'all',
};

function codeBase() {
  return window.hlx?.codeBasePath || '';
}

async function loadEventsDependencies() {
  if (depsLoaded) return;
  const base = codeBase();
  const scripts = [
    `${base}/scripts/club-meta.js`,
    `${base}/scripts/auth-guard.js`,
    `${base}/scripts/user-features.js`,
    `${base}/scripts/event-seats.js`,
    `${base}/scripts/join-modal.js`,
    `${base}/scripts/event-modal.js`,
    `${base}/scripts/event-admin.js`,
  ];
  const styles = [
    `${base}/styles/join-modal.css`,
    `${base}/styles/event-modal.css`,
    `${base}/styles/event-admin.css`,
  ];
  await Promise.all(styles.map((href) => loadCSS(href)));
  await scripts.reduce(async (chain, src) => {
    await chain;
    await loadScript(src);
  }, Promise.resolve());
  depsLoaded = true;
}

function getAuth() {
  return window.AdobeClubsAuth || {
    isAuthenticated: () => false,
    isEventRsvped: () => false,
    isClubJoined: () => false,
    toggleEventRsvp: () => false,
    isAnyAdmin: () => false,
    isAdmin: () => false,
    isClubAdmin: () => false,
    canManageClub: () => false,
    mergePublishedEvents: (events) => events || [],
    loginUrlWithNext: () => `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`)}`,
    redirectToLogin() {
      window.location.href = this.loginUrlWithNext();
    },
  };
}

function applyPublishedEvents(baseEvents) {
  ALL_EVENTS = getAuth().mergePublishedEvents?.(baseEvents || []) || (baseEvents || []);
  window.AdobeEventSeats?.init?.(ALL_EVENTS);
  window.AdobeEventModal?.setEvents?.(ALL_EVENTS);
  window.__adobeClubEventsForTiming = () => ALL_EVENTS;
  window.AdobeUserFeatures?.resetEventTimingSnapshot?.(ALL_EVENTS);
}

function canManageEvent(ev) {
  const auth = getAuth();
  if (auth.isAdmin?.()) return true;
  if (!auth.isClubAdmin?.()) return false;
  const club = getEventClub(ev);
  const clubId = club?.id || ev?.clubId;
  return Boolean(clubId && auth.canManageClub?.(clubId));
}

function eventDetailUrl(id, hash = '') {
  const base = cfg(PAGE_CONFIG, 'detail-base', DEFAULTS['detail-base']).replace(/\/$/, '');
  return `${base}?id=${encodeURIComponent(id)}${hash}`;
}

async function fetchData() {
  const path = cfg(PAGE_CONFIG, 'events-data', DEFAULTS['events-data']);
  try {
    const resp = await fetch(path);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

function normalize(str) {
  return String(str || '').toLowerCase().trim();
}

function parseEventDate(ev) {
  if (!ev?.month || !ev?.day || ev.day === '—') return null;
  const month = MONTH_INDEX[String(ev.month).toUpperCase()];
  const day = parseInt(ev.day, 10);
  if (month == null || Number.isNaN(day)) return null;
  return new Date(new Date().getFullYear(), month, day);
}

function isUpcoming(ev) {
  const uf = window.AdobeUserFeatures;
  if (uf?.isEventUpcoming) return uf.isEventUpcoming(ev);
  const dt = parseEventDate(ev);
  if (!dt) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(dt);
  eventDay.setHours(0, 0, 0, 0);
  return eventDay >= today;
}

function isPast(ev) {
  const uf = window.AdobeUserFeatures;
  if (uf?.isEventPast) return uf.isEventPast(ev);
  return !isUpcoming(ev);
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

function getEventClub(ev) {
  if (!ev) return null;
  if (ev.clubId) {
    const byId = ALL_CLUBS.find((c) => c.id === ev.clubId);
    if (byId) return byId;
  }
  const eventClub = normalize(ev.club);
  return ALL_CLUBS.find((c) => {
    const name = normalize(c.name);
    return eventClub === name
      || eventClub === `${name} club`
      || eventClub.includes(name)
      || name.includes(eventClub.split(' ')[0]);
  }) || null;
}

function isMembersOnlyEvent(ev) {
  return window.AdobeEventModal?.isMembersOnlyEvent?.(ev) || Boolean(ev?.membersOnly);
}

function isEventEligible(ev) {
  if (window.AdobeEventModal?.isEventEligible) {
    return window.AdobeEventModal.isEventEligible(ev);
  }
  const auth = getAuth();
  if (auth.isEventRsvped?.(ev?.id)) return true;
  if (isUpcoming(ev) && window.AdobeEventSeats?.isFull?.(ev)) return false;
  if (!auth.isAuthenticated?.()) return !isMembersOnlyEvent(ev);
  if (!isMembersOnlyEvent(ev)) return true;
  const club = getEventClub(ev);
  return club?.id ? auth.isClubJoined(club.id) : true;
}

function hasEventRecap(ev) {
  const recap = window.AdobeUserFeatures?.getEventRecap?.(ev.id, ev)
    || getAuth().getEventRecap?.(ev.id, ev)
    || ev.recap;
  if (!recap) return false;
  const summary = typeof recap === 'string' ? recap : (recap.summary || recap.body);
  return Boolean(summary);
}

function getEventImageSrc(ev) {
  if (window.AdobeEventModal?.getEventImageSrc) {
    return window.AdobeEventModal.getEventImageSrc(ev);
  }
  return resolveEventImageSrc(ev);
}

function getSearchTokens(query) {
  return normalize(query).split(/\s+/).filter(Boolean);
}

function eventMatchesSearch(ev, query) {
  if (!query) return true;
  const tokens = getSearchTokens(query);
  if (!tokens.length) return true;
  const fields = [ev.title, ev.club, ev.desc, ev.time, ev.location, ev.type, ev.month, ev.day]
    .map(normalize);
  return tokens.every((token) => fields.some((f) => f.includes(token)));
}

function getVisibleEvents(events) {
  return events.filter((ev) => {
    if (FILTER_STATE.myClubs === 'my-clubs') {
      const club = getEventClub(ev);
      if (!club?.id || !getAuth().isClubJoined(club.id)) return false;
    }

    const clubKey = normalize(ev.club);
    if (FILTER_STATE.clubs.size && !FILTER_STATE.clubs.has(clubKey)) return false;

    if (FILTER_STATE.dateWhen !== 'all' && getEventDateFilter(ev) !== FILTER_STATE.dateWhen) {
      return false;
    }

    if (FILTER_STATE.types.size) {
      const typeKey = normalize(ev.type);
      if (!FILTER_STATE.types.has(typeKey)) return false;
    }

    if (FILTER_STATE.rsvp === 'mine') {
      if (!getAuth().isAuthenticated() || !getAuth().isEventRsvped(ev.id)) return false;
    }

    if (FILTER_STATE.eligible === 'yes' && !isEventEligible(ev)) return false;

    if (SEARCH_QUERY && !eventMatchesSearch(ev, SEARCH_QUERY)) return false;

    return true;
  });
}

function getRsvpButtonState(ev) {
  if (window.AdobeEventModal?.getActionState) {
    return window.AdobeEventModal.getActionState(ev);
  }
  const auth = getAuth();
  if (auth.isEventRsvped?.(ev.id)) {
    return { mode: 'rsvp', label: "RSVP'd", joined: true };
  }
  if (window.AdobeEventSeats?.isFull?.(ev)) {
    return { mode: 'seats-full', label: 'Seats full', joined: false, disabled: true };
  }
  const club = getEventClub(ev);
  if (isMembersOnlyEvent(ev) && auth.isAuthenticated?.() && club?.id && !auth.isClubJoined(club.id)) {
    return { mode: 'join-club', label: 'Join club to RSVP', joined: false, club };
  }
  return { mode: 'rsvp', label: 'RSVP', joined: false };
}

function getSpotsLeft(ev) {
  if (window.AdobeEventSeats?.getSpotsLeft) {
    return window.AdobeEventSeats.getSpotsLeft(ev);
  }
  return ev.spotsLeft ?? null;
}

function handleRsvpClick(ev, btn) {
  if (!getAuth().isAuthenticated()) {
    const login = getAuth().loginUrlWithNext?.()
      || `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`)}`;
    window.location.href = login;
    return;
  }

  const wasRsvped = getAuth().isEventRsvped?.(ev.id);

  if (window.AdobeEventModal?.handleRsvpClick) {
    window.AdobeEventModal.handleRsvpClick(ev, btn);
  } else {
    const state = getRsvpButtonState(ev);
    if (state.mode === 'join-club' && state.club) {
      const joined = window.AdobeJoinModal?.toggleClubJoinWithModal?.(state.club, { events: ALL_EVENTS });
      if (joined && btn) {
        window.AdobeEventModal?.applyActionState?.(btn, ev);
      }
      return;
    }
    if (state.disabled || state.mode === 'seats-full') return;
    if (!wasRsvped && window.AdobeEventSeats?.isFull?.(ev)) return;
    const nowRsvped = getAuth().toggleEventRsvp?.(ev.id);
    if (nowRsvped === undefined) return;
    if (window.AdobeEventSeats) {
      if (nowRsvped && !wasRsvped) window.AdobeEventSeats.reserve(ev.id, ev);
      else if (!nowRsvped && wasRsvped) window.AdobeEventSeats.release(ev.id);
    }
    if (btn) {
      btn.classList.toggle('is-joined', nowRsvped);
      btn.textContent = nowRsvped ? "RSVP'd" : 'RSVP';
    }
  }

  if (btn) window.AdobeEventModal?.applyActionState?.(btn, ev);
  refreshPosterSpots(ev);

  if (FILTER_STATE.rsvp === 'mine' && wasRsvped && !getAuth().isEventRsvped?.(ev.id) && pageGrids) {
    const {
      upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider,
    } = pageGrids;
    renderGrids(upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider);
  }
}

function applyPosterActionState(btn, ev) {
  window.AdobeEventModal?.applyActionState?.(btn, ev);
  refreshPosterSpots(ev);
}

function refreshEventRsvpButtons(ev) {
  if (!ev?.id) return;
  document.querySelectorAll(`.ev-poster-rsvp[data-event-id="${CSS.escape(ev.id)}"]`).forEach((btn) => {
    applyPosterActionState(btn, ev);
  });
}

function refreshPosterSpots(ev) {
  if (!ev?.id) return;
  const card = document.querySelector(`.ev-poster-card[data-ev-id="${CSS.escape(ev.id)}"]`);
  if (!card) return;
  const spotsEl = card.querySelector('.ev-poster-spots');
  if (!spotsEl) return;
  const left = getSpotsLeft(ev);
  if (left === null) return;
  spotsEl.textContent = left <= 0
    ? cfg(PAGE_CONFIG, 'seats-full-label', DEFAULTS['seats-full-label'])
    : `${left} spot${left === 1 ? '' : 's'} left`;
  spotsEl.classList.toggle('ev-poster-spots--full', left <= 0);
}

function refreshAllRsvpButtons() {
  document.querySelectorAll('.ev-poster-rsvp[data-event-id]').forEach((btn) => {
    const ev = ALL_EVENTS.find((item) => item.id === btn.dataset.eventId);
    if (ev) applyPosterActionState(btn, ev);
  });
}

function bindRsvpSync() {
  if (window.__eventsListRsvpBound) return;
  window.__eventsListRsvpBound = true;
  ['adobe-rsvp-changed', 'adobe-seats-changed', 'adobe-club-members-changed'].forEach((evt) => {
    window.addEventListener(evt, refreshAllRsvpButtons);
  });
}

function wireImageFallback(img, ev) {
  let attempts = 0;
  img.addEventListener('error', () => {
    attempts += 1;
    if (attempts > 3) {
      img.onerror = null;
      return;
    }
    const pool = EVENT_STOCK_FALLBACK_POOL.length
      ? EVENT_STOCK_FALLBACK_POOL
      : [IMG_FALLBACK];
    img.src = pool[attempts % pool.length];
  });
}

const ICON_TIME = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const ICON_PIN = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

function appendMetaRow(meta, icon, text) {
  if (!text) return;
  const row = document.createElement('span');
  row.className = 'ev-poster-meta-row';
  row.innerHTML = `${icon}${text}`;
  meta.append(row);
}

function closeAllCardMenus() {
  document.querySelectorAll('.ev-poster-card-menu.is-open').forEach((menu) => {
    menu.classList.remove('is-open');
    menu.querySelector('.ev-poster-card-menu-btn')?.setAttribute('aria-expanded', 'false');
  });
}

function bindCardMenuDismiss() {
  if (window.__eventsListCardMenuBound) return;
  window.__eventsListCardMenuBound = true;
  document.addEventListener('click', closeAllCardMenus);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllCardMenus();
  });
}

function appendAdminEventMenu(imgWrap, ev, { past = false } = {}) {
  if (!canManageEvent(ev)) return;
  bindCardMenuDismiss();

  const menu = document.createElement('div');
  menu.className = 'ev-poster-card-menu';
  menu.dataset.adminActions = '';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ev-poster-card-menu-btn';
  toggle.setAttribute('aria-label', 'Event options');
  toggle.setAttribute('aria-haspopup', 'menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

  const panel = document.createElement('div');
  panel.className = 'ev-poster-card-menu-panel';
  panel.setAttribute('role', 'menu');

  if (!past) {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'ev-poster-card-menu-item';
    editBtn.setAttribute('role', 'menuitem');
    editBtn.textContent = 'Edit event';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllCardMenus();
      window.__adminEventActions?.openEdit?.(ev.id);
    });
    panel.append(editBtn);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'ev-poster-card-menu-item ev-poster-card-menu-item--danger';
  deleteBtn.setAttribute('role', 'menuitem');
  deleteBtn.textContent = 'Delete event';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllCardMenus();
    window.__adminEventActions?.deleteEvent?.(ev.id);
  });
  panel.append(deleteBtn);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = menu.classList.contains('is-open');
    closeAllCardMenus();
    if (!wasOpen) {
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });

  menu.addEventListener('click', (e) => e.stopPropagation());
  menu.append(toggle, panel);
  imgWrap.append(menu);
}

function buildPosterCard(ev, { past = false } = {}) {
  const li = document.createElement('li');
  li.className = `ev-poster-card${past ? ' ev-poster-card--past' : ''}`;
  li.dataset.evId = ev.id;
  li.tabIndex = 0;
  li.setAttribute('role', 'listitem');

  const navigate = () => {
    window.location.href = eventDetailUrl(ev.id, past && hasEventRecap(ev) ? '#recap' : '');
  };
  li.addEventListener('click', (e) => {
    if (e.target.closest('[data-admin-actions]')) return;
    navigate();
  });
  li.addEventListener('keydown', (e) => {
    if (e.target.closest('[data-admin-actions]')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate();
    }
  });

  const imgWrap = document.createElement('div');
  imgWrap.className = 'ev-poster-img-wrap';

  const img = document.createElement('img');
  img.className = 'ev-poster-img';
  img.src = getEventImageSrc(ev);
  img.alt = ev.title || '';
  img.loading = 'lazy';
  img.dataset.evId = ev.id;
  wireImageFallback(img, ev);
  imgWrap.append(img);

  const dateBadge = document.createElement('div');
  dateBadge.className = `ev-poster-date${past ? ' ev-poster-date--muted' : ''}`;
  dateBadge.textContent = `${ev.day} ${ev.month}`;
  imgWrap.append(dateBadge);

  if (!past && isMembersOnlyEvent(ev)) {
    const exclusive = document.createElement('span');
    exclusive.className = 'ev-poster-exclusive-badge';
    exclusive.textContent = cfg(PAGE_CONFIG, 'members-only-badge', DEFAULTS['members-only-badge']);
    imgWrap.append(exclusive);
  }

  appendAdminEventMenu(imgWrap, ev, { past });

  const info = document.createElement('div');
  info.className = 'ev-poster-info';

  const club = document.createElement('div');
  club.className = `ev-poster-club${past ? ' ev-poster-club--muted' : ''}`;
  club.textContent = ev.club || '';

  const title = document.createElement('div');
  title.className = 'ev-poster-title';
  title.textContent = ev.title || '';

  const meta = document.createElement('div');
  meta.className = 'ev-poster-meta';

  appendMetaRow(meta, ICON_TIME, ev.time);
  appendMetaRow(meta, ICON_PIN, ev.location);

  info.append(club, title, meta);

  if (!past) {
    const spotsLeft = getSpotsLeft(ev);
    if (spotsLeft !== null) {
      const spots = document.createElement('p');
      spots.className = `ev-poster-spots${spotsLeft <= 0 ? ' ev-poster-spots--full' : ''}`;
      spots.textContent = spotsLeft <= 0
        ? cfg(PAGE_CONFIG, 'seats-full-label', DEFAULTS['seats-full-label'])
        : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`;
      info.append(spots);
    }

    const state = getRsvpButtonState(ev);
    const actions = document.createElement('div');
    actions.className = 'ev-poster-actions';

    const rsvpBtn = document.createElement('button');
    rsvpBtn.type = 'button';
    rsvpBtn.className = `ev-poster-rsvp${state.joined ? ' is-joined' : ''}${state.mode === 'join-club' ? ' is-join-club' : ''}${state.mode === 'seats-full' ? ' is-seats-full' : ''}`;
    rsvpBtn.dataset.eventId = ev.id;
    rsvpBtn.textContent = state.label;
    if (state.disabled || state.mode === 'seats-full') rsvpBtn.disabled = true;
    rsvpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRsvpClick(ev, rsvpBtn);
    });

    actions.append(rsvpBtn);
    info.append(actions);
  } else if (hasEventRecap(ev)) {
    const recapBtn = document.createElement('button');
    recapBtn.type = 'button';
    recapBtn.className = 'ev-poster-recap-btn';
    recapBtn.dataset.eventId = ev.id;
    recapBtn.textContent = cfg(PAGE_CONFIG, 'read-recap', DEFAULTS['read-recap']);
    recapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = eventDetailUrl(ev.id, '#recap');
    });
    info.append(recapBtn);
  } else {
    const recapMuted = document.createElement('span');
    recapMuted.className = 'ev-poster-recap ev-poster-recap--muted';
    recapMuted.textContent = cfg(PAGE_CONFIG, 'recap-soon', DEFAULTS['recap-soon']);
    info.append(recapMuted);
  }

  li.append(imgWrap, info);
  return li;
}

function renderGrids(upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider) {
  const upcoming = getVisibleEvents(ALL_EVENTS.filter(isUpcoming));
  const past = getVisibleEvents(ALL_EVENTS.filter(isPast));

  upcomingGrid.innerHTML = '';
  pastGrid.innerHTML = '';
  upcoming.forEach((ev) => upcomingGrid.append(buildPosterCard(ev)));
  past.forEach((ev) => pastGrid.append(buildPosterCard(ev, { past: true })));

  noUpcoming.hidden = upcoming.length > 0;
  upcomingGrid.hidden = upcoming.length === 0;
  noPast.hidden = past.length > 0;
  pastGrid.hidden = past.length === 0;
  if (pastHeader) pastHeader.hidden = past.length === 0;
  if (divider) divider.hidden = past.length === 0;
}

function buildFilterGroup(title, items, type, inputType = 'radio') {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'ev-filter-group';
  if (type === 'myclubs') fieldset.id = 'ev-filter-myclubs';
  if (type === 'rsvp') fieldset.id = 'ev-filter-rsvp';
  if (type === 'eligible') fieldset.id = 'ev-filter-eligible';
  if (type === 'date') fieldset.id = 'ev-filter-date';
  if (type === 'clubs') fieldset.id = 'ev-filter-clubs';
  if (type === 'format') fieldset.id = 'ev-filter-format';

  const legend = document.createElement('legend');
  legend.className = 'ev-filter-group-title';
  legend.textContent = title;

  const list = document.createElement('ul');
  list.className = 'ev-filter-list';

  items.forEach(({ label, value, checked, count }) => {
    const li = document.createElement('li');
    const lbl = document.createElement('label');
    lbl.className = 'ev-filter-option';

    const input = document.createElement('input');
    input.type = inputType;
    input.name = `ev-filter-${type}`;
    input.value = value;
    input.dataset.filterType = type;
    if (checked) input.checked = true;

    lbl.append(input, document.createTextNode(` ${label}`));
    if (count != null) {
      const countSpan = document.createElement('span');
      countSpan.className = 'ev-filter-count';
      countSpan.textContent = ` (${count})`;
      lbl.append(countSpan);
    }
    li.append(lbl);
    list.append(li);
  });

  fieldset.append(legend, list);
  return fieldset;
}

function syncFilterInputs(sidebar) {
  sidebar.querySelectorAll('[data-filter-type]').forEach((input) => {
    const { filterType } = input.dataset;
    const { value } = input;
    if (filterType === 'date') input.checked = FILTER_STATE.dateWhen === value;
    else if (filterType === 'rsvp') input.checked = FILTER_STATE.rsvp === value;
    else if (filterType === 'eligible') input.checked = FILTER_STATE.eligible === value;
    else if (filterType === 'myclubs') input.checked = FILTER_STATE.myClubs === value;
    else if (filterType === 'clubs') input.checked = FILTER_STATE.clubs.has(value);
    else if (filterType === 'format') input.checked = FILTER_STATE.types.has(value);
  });
}

function clearAllFilters(sidebar, upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider) {
  FILTER_STATE.dateWhen = 'all';
  FILTER_STATE.clubs.clear();
  FILTER_STATE.types.clear();
  FILTER_STATE.rsvp = 'all';
  FILTER_STATE.eligible = 'all';
  FILTER_STATE.myClubs = 'all';
  SEARCH_QUERY = '';
  const searchInput = document.querySelector('.ev-search-input');
  if (searchInput) searchInput.value = '';
  syncFilterInputs(sidebar);
  renderGrids(upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider);
}

function buildSidebar(events, grids) {
  const {
    upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider,
  } = grids;

  const sidebar = document.createElement('aside');
  sidebar.className = 'ev-sidebar';
  sidebar.id = 'events-sidebar';
  sidebar.setAttribute('aria-label', cfg(PAGE_CONFIG, 'filters-title', DEFAULTS['filters-title']));

  const header = document.createElement('div');
  header.className = 'ev-sidebar-header';

  const title = document.createElement('h3');
  title.className = 'ev-sidebar-title';
  title.textContent = cfg(PAGE_CONFIG, 'filters-title', DEFAULTS['filters-title']);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'ev-sidebar-clear';
  clearBtn.id = 'ev-clear-filters';
  clearBtn.textContent = cfg(PAGE_CONFIG, 'clear-filters-text', DEFAULTS['clear-filters-text']);
  clearBtn.addEventListener('click', () => {
    clearAllFilters(sidebar, upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider);
  });

  header.append(title, clearBtn);
  sidebar.append(header);

  sidebar.append(buildFilterGroup(cfg(PAGE_CONFIG, 'date-group-title', DEFAULTS['date-group-title']), [
    { label: 'All dates', value: 'all', checked: true },
    { label: 'Today', value: 'today', checked: false },
    { label: 'Tomorrow', value: 'tomorrow', checked: false },
    { label: 'This week', value: 'week', checked: false },
  ], 'date'));

  const myClubsGroup = buildFilterGroup(cfg(PAGE_CONFIG, 'my-clubs-group-title', DEFAULTS['my-clubs-group-title']), [
    { label: 'All clubs', value: 'all', checked: true },
    { label: 'My clubs only', value: 'my-clubs', checked: false },
  ], 'myclubs');
  myClubsGroup.hidden = !getAuth().isAuthenticated();
  sidebar.append(myClubsGroup);

  const clubCounts = {};
  events.forEach((ev) => {
    const key = normalize(ev.club);
    if (key) clubCounts[key] = (clubCounts[key] || 0) + 1;
  });
  const clubItems = Object.entries(clubCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value]) => ({
      label: events.find((ev) => normalize(ev.club) === value)?.club || value,
      value,
      checked: false,
    }));
  sidebar.append(buildFilterGroup(cfg(PAGE_CONFIG, 'hosting-club-group-title', DEFAULTS['hosting-club-group-title']), clubItems, 'clubs', 'checkbox'));

  const typeCounts = {};
  events.forEach((ev) => {
    const key = normalize(ev.type);
    if (key) typeCounts[key] = (typeCounts[key] || 0) + 1;
  });
  const formatItems = Object.entries(typeCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value, count]) => ({
      label: value.charAt(0).toUpperCase() + value.slice(1),
      value,
      count,
      checked: false,
    }));
  sidebar.append(buildFilterGroup(cfg(PAGE_CONFIG, 'format-group-title', DEFAULTS['format-group-title']), formatItems, 'format', 'checkbox'));

  const eligibleGroup = buildFilterGroup(cfg(PAGE_CONFIG, 'eligibility-group-title', DEFAULTS['eligibility-group-title']), [
    { label: 'All events', value: 'all', checked: true },
    { label: 'Eligible for me', value: 'yes', checked: false },
  ], 'eligible');
  if (!getAuth().isAuthenticated()) {
    const hint = document.createElement('p');
    hint.className = 'ev-filter-hint';
    hint.textContent = cfg(PAGE_CONFIG, 'guest-eligible-hint', DEFAULTS['guest-eligible-hint']);
    eligibleGroup.append(hint);
  }
  sidebar.append(eligibleGroup);

  const rsvpGroup = buildFilterGroup(cfg(PAGE_CONFIG, 'rsvp-group-title', DEFAULTS['rsvp-group-title']), [
    { label: 'All events', value: 'all', checked: true },
    { label: 'My RSVPs', value: 'mine', checked: false },
  ], 'rsvp');
  if (!getAuth().isAuthenticated()) {
    rsvpGroup.hidden = true;
    const hint = document.createElement('p');
    hint.className = 'ev-filter-hint';
    hint.textContent = cfg(PAGE_CONFIG, 'guest-rsvp-hint', DEFAULTS['guest-rsvp-hint']);
    rsvpGroup.append(hint);
  }
  sidebar.append(rsvpGroup);

  sidebar.querySelectorAll('[data-filter-type]').forEach((input) => {
    input.addEventListener('change', () => {
      const { filterType } = input.dataset;
      const { value } = input;
      if (filterType === 'date') FILTER_STATE.dateWhen = value;
      else if (filterType === 'rsvp') FILTER_STATE.rsvp = value;
      else if (filterType === 'eligible') FILTER_STATE.eligible = value;
      else if (filterType === 'myclubs') FILTER_STATE.myClubs = value;
      else if (filterType === 'clubs') {
        if (input.checked) FILTER_STATE.clubs.add(value);
        else FILTER_STATE.clubs.delete(value);
      } else if (filterType === 'format') {
        if (input.checked) FILTER_STATE.types.add(value);
        else FILTER_STATE.types.delete(value);
      }
      renderGrids(upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider);
    });
  });

  return sidebar;
}

function buildToolbar(grids) {
  const toolbar = document.createElement('div');
  toolbar.className = 'ev-toolbar';
  toolbar.id = 'ev-toolbar';

  const searchBox = document.createElement('div');
  searchBox.className = 'ev-search-box';

  const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  searchIcon.setAttribute('class', 'ev-search-icon');
  searchIcon.setAttribute('width', '16');
  searchIcon.setAttribute('height', '16');
  searchIcon.setAttribute('viewBox', '0 0 24 24');
  searchIcon.setAttribute('fill', 'none');
  searchIcon.setAttribute('stroke', 'currentColor');
  searchIcon.setAttribute('stroke-width', '2');
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.innerHTML = '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'ev-search-input';
  searchInput.id = 'ev-search';
  searchInput.placeholder = cfg(PAGE_CONFIG, 'search-placeholder', DEFAULTS['search-placeholder']);
  searchInput.setAttribute('aria-label', cfg(PAGE_CONFIG, 'search-placeholder', DEFAULTS['search-placeholder']));
  searchInput.autocomplete = 'off';

  searchInput.addEventListener('input', () => {
    SEARCH_QUERY = searchInput.value;
    const {
      upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider,
    } = grids;
    renderGrids(upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider);
  });

  searchBox.append(searchIcon, searchInput);
  toolbar.append(searchBox);
  return toolbar;
}

function applyClubFilterFromUrl() {
  const clubId = new URLSearchParams(window.location.search).get('club');
  if (!clubId) return;

  const club = ALL_CLUBS.find((c) => c.id === clubId);
  if (!club) return;

  const matchingEvent = ALL_EVENTS.find((ev) => ev.clubId === clubId
    || normalize(ev.club).includes(normalize(club.name)));
  const filterValue = normalize(matchingEvent?.club || club.name);
  FILTER_STATE.clubs.clear();
  FILTER_STATE.clubs.add(filterValue);
}

function applyRsvpFilterFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('rsvp') !== 'mine' && params.get('view') !== 'rsvp') return;

  if (!getAuth().isAuthenticated()) {
    window.location.href = getAuth().loginUrlWithNext?.() || '/login';
    return;
  }
  FILTER_STATE.rsvp = 'mine';
}

export default async function decorate(block) {
  PAGE_CONFIG = readPageConfig(block, DEFAULTS);
  await loadEventsDependencies();

  block.textContent = '';

  const section = document.createElement('div');
  section.className = 'ev-section-inner';
  section.id = 'ev-section';

  const layout = document.createElement('div');
  layout.className = 'ev-layout';

  const main = document.createElement('div');
  main.className = 'ev-main';

  const upcomingHeader = document.createElement('div');
  upcomingHeader.className = 'ev-section-header';
  const upcomingTitle = document.createElement('h2');
  upcomingTitle.className = 'ev-section-title';
  upcomingTitle.textContent = cfg(PAGE_CONFIG, 'upcoming-title', DEFAULTS['upcoming-title']);
  upcomingHeader.append(upcomingTitle);

  const upcomingGrid = document.createElement('ul');
  upcomingGrid.className = 'ev-grid';
  upcomingGrid.id = 'ev-grid-upcoming';
  upcomingGrid.setAttribute('role', 'list');
  upcomingGrid.setAttribute('aria-label', 'Upcoming events');

  const noUpcoming = document.createElement('p');
  noUpcoming.className = 'ev-no-results';
  noUpcoming.id = 'ev-no-results-upcoming';
  noUpcoming.textContent = cfg(PAGE_CONFIG, 'empty-upcoming', DEFAULTS['empty-upcoming']);
  noUpcoming.hidden = true;

  const divider = document.createElement('hr');
  divider.className = 'ev-section-divider';

  const pastHeader = document.createElement('div');
  pastHeader.className = 'ev-section-header ev-past-header';
  const pastTitle = document.createElement('h2');
  pastTitle.className = 'ev-section-title ev-section-title--muted';
  pastTitle.textContent = cfg(PAGE_CONFIG, 'past-title', DEFAULTS['past-title']);
  pastHeader.append(pastTitle);

  const pastGrid = document.createElement('ul');
  pastGrid.className = 'ev-grid ev-grid--past';
  pastGrid.id = 'ev-grid-past';
  pastGrid.setAttribute('role', 'list');
  pastGrid.setAttribute('aria-label', 'Past events');

  const noPast = document.createElement('p');
  noPast.className = 'ev-no-results ev-no-results--past';
  noPast.id = 'ev-no-results-past';
  noPast.textContent = cfg(PAGE_CONFIG, 'empty-past', DEFAULTS['empty-past']);
  noPast.hidden = true;

  const grids = {
    upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider,
  };

  const loading = document.createElement('p');
  loading.className = 'ev-loading';
  loading.textContent = cfg(PAGE_CONFIG, 'loading-text', DEFAULTS['loading-text']);
  main.append(loading);

  block.append(section);
  section.append(layout);

  const data = await fetchData();
  loading.remove();

  if (!data?.events?.length) {
    const err = document.createElement('p');
    err.className = 'ev-no-results';
    err.textContent = cfg(PAGE_CONFIG, 'error-text', DEFAULTS['error-text']);
    main.append(err);
    layout.append(main);
    return;
  }

  ALL_EVENTS = data.events || [];
  ALL_CLUBS = data.clubs || [];
  applyPublishedEvents(data.events || []);

  window.AdobeEventModal?.init?.({
    clubs: ALL_CLUBS,
    events: ALL_EVENTS,
    onStateChange: (ev) => refreshEventRsvpButtons(ev),
  });

  applyClubFilterFromUrl();
  applyRsvpFilterFromUrl();

  const sidebar = buildSidebar(ALL_EVENTS, grids);
  const toolbar = buildToolbar(grids);

  main.append(
    toolbar,
    upcomingHeader,
    upcomingGrid,
    noUpcoming,
    divider,
    pastHeader,
    pastGrid,
    noPast,
  );
  layout.append(sidebar, main);

  pageGrids = grids;

  const refreshGrids = () => {
    if (!pageGrids) return;
    const {
      upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider,
    } = pageGrids;
    renderGrids(upcomingGrid, pastGrid, noUpcoming, noPast, pastHeader, divider);
  };

  async function reloadEventsPage() {
    const fresh = await fetchData();
    if (!fresh?.events) return;
    ALL_CLUBS = fresh.clubs || ALL_CLUBS;
    applyPublishedEvents(fresh.events || []);
    window.AdobeEventModal?.init?.({
      clubs: ALL_CLUBS,
      events: ALL_EVENTS,
      onStateChange: (ev) => refreshEventRsvpButtons(ev),
    });
    refreshGrids();
    window.AdobeEventAdmin?.updateContext?.({ clubs: ALL_CLUBS });
  }

  syncFilterInputs(sidebar);
  refreshGrids();
  bindRsvpSync();

  if (getAuth().isAnyAdmin?.()) {
    window.AdobeEventAdmin?.mount?.({
      clubs: ALL_CLUBS,
      getEvents: () => ALL_EVENTS,
      setEvents: (events) => { ALL_EVENTS = events; },
      refreshGrids,
      reloadPage: reloadEventsPage,
      isPast,
      eventDetailUrl: (id) => eventDetailUrl(id),
    });
  }

  function handleEventsPageIntent() {
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (hash === 'create-event' || hash === 'add-event') {
      window.AdobeEventAdmin?.openCreate?.();
      return;
    }
    if (hash === 'ev-grid-past') {
      const target = document.getElementById('ev-grid-past')
        || document.querySelector('.ev-past-header');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  window.requestAnimationFrame(() => handleEventsPageIntent());
  window.addEventListener('hashchange', handleEventsPageIntent);

  getAuth().onPublishedContentChange?.(() => {
    reloadEventsPage();
  });

  const sidebarEl = document.getElementById('events-sidebar');
  if (sidebarEl) {
    const NAV_OFFSET = 72;
    const sync = () => {
      if (window.innerWidth <= 900) {
        sidebarEl.style.removeProperty('top');
        return;
      }
      sidebarEl.style.top = `${NAV_OFFSET + 16}px`;
    };
    sync();
    window.addEventListener('resize', sync, { passive: true });
  }

  if (FILTER_STATE.rsvp === 'mine') {
    window.requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }
}
