/**
 * club.js — Individual club detail page (mockup-aligned layout)
 */

'use strict';

const IMAGE_BASES = {
  clubs: '/assets/images/clubs/',
  events: '/assets/images/events/',
  index: '/assets/images/index/',
};

const MONTH_INDEX = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

const AVATAR_IMAGES = [
  '/assets/images/avatar/9434619.jpg',
  '/assets/images/avatar/9439678.jpg',
  '/assets/images/avatar/9440461.jpg',
  '/assets/images/avatar/9441909.jpg',
  '/assets/images/avatar/9720029.jpg',
  '/assets/images/avatar/10491829.jpg',
  '/assets/images/avatar/10491830.jpg',
  '/assets/images/avatar/10491845.jpg',
  '/assets/images/avatar/11475206.jpg',
  '/assets/images/avatar/11475207.jpg',
  '/assets/images/avatar/11475209.jpg',
  '/assets/images/avatar/11475211.jpg',
  '/assets/images/avatar/11475215.jpg',
  '/assets/images/avatar/11475221.jpg',
  '/assets/images/avatar/11475227.jpg',
];

const ACTIVITY_ICON_SVGS = [
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="M6 8l6-3 6 3"/></svg>',
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
];

const TEAM_IMAGE_BASE = '/assets/images/club_details/team_images/';
const TEAM_IMAGE_FILES = [
  'emp2.avif',
  'emp3.avif',
  'emp4.avif',
  'emp5.avif',
  'emp6.avif',
  'emp7.avif',
  'emp8.avif',
  'premium_photo-1661297414288-8ed17eb1b3f1.avif',
];

const TEAM_FALLBACK_ROLES = ['Club lead', 'Co-lead', 'Events coordinator', 'Community mentor'];

const TEAM_MEMBER_NAMES = [
  'Alex Josh',
  'Jenny Wilson',
  'Marcus Reid',
  'Priya Sharma',
  'Rohan Kapoor',
  'Ananya R.',
  'Karthik M.',
  'Meera P.',
  'Vikram N.',
  'Sneha V.',
  'James T.',
  'Divya K.',
  'Arjun K.',
  'Neha R.',
];

function getClubImageSrc(club) {
  const file = club?.image || `${club?.id || 'clubs-hero1'}.avif`;
  return `${IMAGE_BASES.clubs}${file}`;
}

function getClubHeroImageSrc(club) {
  if (club?.heroImage) return club.heroImage;
  const illustration = window.AdobeClubMeta?.heroIllustrations?.[club?.id];
  if (illustration) return illustration;
  return getClubImageSrc(club);
}

function clubHasHeroIllustration(clubId) {
  return Boolean(
    window.AdobeClubMeta?.heroIllustrations?.[clubId]
  );
}

function getGalleryItemSrc(item) {
  const base = IMAGE_BASES[item?.base] || IMAGE_BASES.clubs;
  return `${base}${item.image}`;
}

function getEventImageSrc(ev) {
  if (ev?.imagePath) {
    const [baseKey, ...rest] = String(ev.imagePath).split('/');
    const file = rest.join('/');
    if (IMAGE_BASES[baseKey] && file) return `${IMAGE_BASES[baseKey]}${file}`;
  }
  if (ev?.id) return `${IMAGE_BASES.events}${ev.id}.avif`;
  return '';
}

function clubMatchesGalleryItem(club, item) {
  const galClub = (item?.club || '').toLowerCase();
  const name = (club?.name || '').toLowerCase();
  const idPhrase = (club?.id || '').replace(/-/g, ' ').toLowerCase();
  const keyword = name.split(' ')[0];
  return galClub.includes(keyword) ||
    name.includes(galClub.split(' ')[0]) ||
    galClub.includes(idPhrase) ||
    idPhrase.includes(galClub.split(' ')[0]);
}

function getClubGalleryItems(club, gallery) {
  return (gallery || []).filter(item => clubMatchesGalleryItem(club, item));
}

function getClubImagePool(club, gallery) {
  const pool = [getClubHeroImageSrc(club)];
  getClubGalleryItems(club, gallery).forEach(item => pool.push(getGalleryItemSrc(item)));
  return [...new Set(pool.filter(Boolean))];
}

function pickClubImage(pool, index, club) {
  if (pool.length) return pool[index % pool.length];
  return getClubImageSrc(club);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatClubMemberLabel(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return '';
  return `${n} member${n === 1 ? '' : 's'}`;
}

const CLUB_MEMBER_ICON = `<svg class="club-member-count-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

function clubMemberCountHtml(count) {
  const label = formatClubMemberLabel(count);
  if (!label) return '';
  return `<p class="club-member-count"><span class="club-member-count-dot" aria-hidden="true">·</span>${CLUB_MEMBER_ICON}<span class="club-member-count-text">${esc(label)}</span></p>`;
}

function getAuth() {
  return window.AdobeClubsAuth || {
    isAuthenticated: () => false,
    loginUrlWithNext: () => '/login',
    getCurrentUser: () => null,
    isClubJoined: () => false,
    toggleClubJoin: () => false,
    isEventRsvped: () => false,
    toggleEventRsvp: () => false,
    getAdminOf: () => [],
    isAdmin: () => false,
  };
}

function getClubIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  if (idParam) return idParam;
  const match = window.location.pathname.match(/\/clubs\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function loadData() {
  // Try root-relative path first, then relative to current path root
  const candidates = ['/data/data.json', `${window.location.origin}/data/data.json`];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch (_) { /* try next */ }
  }
  throw new Error('Could not load /data/data.json — check that the file is committed and deployed');
}

function clubMatchesEvent(club, ev) {
  if (ev.clubId && ev.clubId === club.id) return true;
  const evClub = String(ev.club || '').toLowerCase().trim();
  const clubName = String(club.name || '').toLowerCase().trim();
  const clubIdStr = String(club.id || '').replace(/-/g, ' ').toLowerCase();
  return evClub === clubName || evClub === clubIdStr || evClub === `${clubName} club`;
}

function getAllClubEvents(club, allEvents) {
  return (allEvents || []).filter(ev => clubMatchesEvent(club, ev));
}

function parseEventDate(ev) {
  if (!ev?.month || !ev?.day || ev.day === '—') return null;
  const month = MONTH_INDEX[String(ev.month).toUpperCase()];
  const day = parseInt(ev.day, 10);
  if (month == null || Number.isNaN(day)) return null;
  return new Date(new Date().getFullYear(), month, day);
}

function isEventPast(ev) {
  if (window.AdobeUserFeatures?.isEventPast) {
    return window.AdobeUserFeatures.isEventPast(ev);
  }
  const dt = parseEventDate(ev);
  if (!dt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(dt);
  eventDay.setHours(0, 0, 0, 0);
  return eventDay < today;
}

function getPastClubEvents(club, allEvents) {
  return getAllClubEvents(club, allEvents).filter(isEventPast);
}

function getUpcomingClubEvents(club, allEvents) {
  return getAllClubEvents(club, allEvents).filter(ev => !isEventPast(ev));
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
  if (d > today) return 'later';
  return 'all';
}

function formatEventDate(ev) {
  if (!ev?.month || !ev?.day || ev.day === '—') return 'Date TBD';
  return `${ev.month} ${ev.day}`;
}

function getMeta(clubId) {
  const meta = window.AdobeClubMeta || {};
  const headline = meta.heroHeadline?.[clubId] || { line1: 'Find your people', line2: 'Join your club' };
  return {
    founded: meta.founded?.[clubId] || '2021',
    mission: meta.mission?.[clubId] || '',
    vision: meta.vision?.[clubId] || '',
    activities: meta.activities?.[clubId] || [],
    headline,
  };
}

function getActivityDesc(clubId, name, club) {
  const details = window.AdobeClubMeta?.activityDetails?.[clubId];
  if (details?.[name]) return details[name];
  return `Casual sessions exploring ${name.toLowerCase()} with fellow ${club.name} members.`;
}

function getClubLeads(clubId) {
  const leads = window.AdobeClubMeta?.leads?.[clubId];
  if (leads?.length) return leads;
  return [{ name: 'Club lead', role: 'Contact via Slack', initials: 'CL' }];
}

function canPostRecapForClub(clubId) {
  const auth = getAuth();
  if (auth.isAdmin?.()) return true;
  return auth.getAdminOf?.().includes(clubId);
}

function getClubFeedItems(club, feed) {
  const name = club.name.toLowerCase();
  const keyword = club.name.split(' ')[0].toLowerCase();
  return (feed || [])
    .filter(item => {
      const hay = `${item.text || ''} ${item.meta || ''}`.toLowerCase();
      return hay.includes(name) || hay.includes(keyword);
    })
    .slice(0, 3);
}

function getRecapBody(recap) {
  if (!recap) return '';
  if (typeof recap === 'string') return recap;
  return recap.summary || recap.body || '';
}

function buildRecapCardHtml(ev, recap, club) {
  const uf = window.AdobeUserFeatures;
  if (!uf?.buildRecapHtml) {
    const body = getRecapBody(recap);
    return `<p>${esc(body)}</p><span class="club-recap-read">Read recap →</span>`;
  }
  return uf.buildRecapHtml(recap, ev, {
    dateLabel: formatEventDate(ev),
    card: true,
    showReadLink: true,
  });
}

function getRecapForEvent(ev) {
  return window.AdobeUserFeatures?.getEventRecap?.(ev.id, ev)
    || window.AdobeClubsAuth?.getEventRecap?.(ev.id, ev)
    || null;
}

function renderNotFound(root, reason = '') {
  root.innerHTML = `
    <div class="club-page club-not-found">
      <h1>Club not found</h1>
      <p>We couldn't find that club. It may have been renamed or removed.</p>
      ${reason ? `<p class="club-not-found-reason" style="font-size:.8rem;color:#999;margin-top:.5rem;">${reason}</p>` : ''}
      <a class="club-back" href="/clubs">← Back to all clubs</a>
    </div>
  `;
  document.title = 'Club not found — Adobe Clubs';
}


function canRsvpToClubEvent(ev, club) {
  return Boolean(club?.id && getAuth().isClubJoined(club.id));
}

function getClubEventActionState(ev, club) {
  if (!getAuth().isClubJoined(club.id)) {
    return { mode: 'members-only', label: 'Members only', joined: false };
  }
  const rsvped = getAuth().isEventRsvped?.(ev.id);
  if (rsvped) {
    return { mode: 'rsvp', label: "RSVP'd", joined: true };
  }
  return { mode: 'rsvp', label: 'RSVP', joined: false };
}

function getClubSlack(club) {
  if (club && (club.slackUrl || club.slackChannel)) {
    return { url: club.slackUrl || '#', channel: club.slackChannel || '' };
  }
  const id = typeof club === 'string' ? club : club?.id;
  return window.AdobeClubMeta?.slack?.[id] || null;
}

const SLACK_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.04 15.17a1.85 1.85 0 1 1-1.85-1.85h1.85v1.85Zm.93 0a1.85 1.85 0 0 1 3.7 0v4.63a1.85 1.85 0 1 1-3.7 0v-4.63Zm1.85-7.43a1.85 1.85 0 1 1 1.85-1.85v1.85h-1.85Zm0 .93a1.85 1.85 0 0 1 0 3.7H7.19a1.85 1.85 0 1 1 0-3.7h4.63Zm7.42 1.85a1.85 1.85 0 1 1 1.85 1.85h-1.85V10.5Zm-.93 0a1.85 1.85 0 0 1-3.7 0V5.87a1.85 1.85 0 1 1 3.7 0v4.63Zm-1.85 7.42a1.85 1.85 0 1 1-1.85 1.85v-1.85h1.85Zm0-.92a1.85 1.85 0 0 1 0-3.7h4.63a1.85 1.85 0 1 1 0 3.7h-4.63Z"/></svg>';

function slackLinkHtml(slack) {
  if (!slack) return '';
  return `<a class="slack-link" href="${esc(slack.url)}" target="_blank" rel="noopener noreferrer">${SLACK_ICON_SVG}Discuss on Slack${slack.channel ? ` <span class="slack-channel">${esc(slack.channel)}</span>` : ''}</a>`;
}

function renderClubEventAction(ev, club) {
  const state = getClubEventActionState(ev, club);
  if (state.mode === 'members-only') {
    return `<span class="club-event-rsvp club-event-rsvp--members-only" aria-label="Members only event">${esc(state.label)}</span>`;
  }
  return `<button type="button" class="club-event-rsvp${state.joined ? ' is-joined' : ''}" data-event-id="${esc(ev.id)}" aria-label="${esc(state.joined ? `RSVP'd: ${ev.title}` : `RSVP for ${ev.title}`)}">${esc(state.label)}</button>`;
}

function applyClubEventActionState(button, ev, club) {
  if (!button || !ev || !club) return;
  const state = getClubEventActionState(ev, club);
  button.classList.toggle('is-joined', state.joined);
  button.textContent = state.label;
}

function refreshClubEventActions(club, upcomingEvents) {
  const grid = document.getElementById('club-event-grid');
  if (!grid) return;

  grid.querySelectorAll('.club-event-card[data-event-id]').forEach(card => {
    const ev = upcomingEvents.find(item => item.id === card.dataset.eventId);
    if (!ev) return;
    const actionWrap = card.querySelector('.club-event-card-action');
    if (actionWrap) actionWrap.innerHTML = renderClubEventAction(ev, club);
  });

  wireClubEventRsvpButtons(club, upcomingEvents);
}

function wireClubEventRsvpButtons(club, upcomingEvents) {
  const grid = document.getElementById('club-event-grid');
  if (!grid) return;

  grid.querySelectorAll('.club-event-rsvp[data-event-id]').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });

  grid.querySelectorAll('.club-event-rsvp[data-event-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ev = upcomingEvents.find(item => item.id === btn.dataset.eventId);
      if (!ev || !canRsvpToClubEvent(ev, club)) return;

      if (!getAuth().isAuthenticated()) {
        window.location.href = getAuth().loginUrlWithNext();
        return;
      }

      if (window.AdobeEventModal?.handleRsvpClick?.(ev, btn) === false) return;
      getAuth().toggleEventRsvp?.(ev.id);
      refreshClubEventActions(club, upcomingEvents);
    });
  });
}

function openClubEventModal(ev, club, upcomingEvents) {
  window.AdobeEventModal?.open(ev, {
    onStateChange: () => {
      refreshClubEventActions(club, upcomingEvents);
      setClubJoinButtonLabels(getAuth().isClubJoined(club.id), club, upcomingEvents);
    },
  });
}

function wireClubEventCards(club, upcomingEvents) {
  wireClubEventRsvpButtons(club, upcomingEvents);

  const grid = document.getElementById('club-event-grid');
  if (!grid) return;

  grid.querySelectorAll('.club-event-card[data-event-id]').forEach(card => {
    const openCard = () => {
      const eventId = card.dataset.eventId;
      if (eventId) window.location.href = `/events?event=${encodeURIComponent(eventId)}`;
    };

    card.addEventListener('click', (e) => {
      if (e.target.closest('.club-event-rsvp[data-event-id]')) return;
      openCard();
    });
    card.addEventListener('keydown', (e) => {
      if (e.target.closest('.club-event-rsvp[data-event-id]')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCard();
      }
    });
  });
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
      </article>
    `;
  }).join('');
  const emptyMessage = events.length
    ? 'No events available for this day.'
    : 'No upcoming events for this club yet.';
  return `${cards}${renderEventsEmptyState(emptyMessage, !events.length)}`;
}

function hasRecapHighlights(pastEvents) {
  return (pastEvents || []).some(ev => getRecapBody(getRecapForEvent(ev)));
}

function renderRecapCards(pastEvents, club) {
  const items = pastEvents
    .map(ev => ({ ev, recap: getRecapForEvent(ev) }))
    .filter(x => getRecapBody(x.recap));

  if (!items.length) return '';

  return items.slice(0, 6).map(({ ev, recap }) => `
      <div class="club-recap-card-wrap">
        <button type="button" class="club-recap-card" data-recap-event="${esc(ev.id)}" aria-label="Read recap for ${esc(ev.title)}">
          ${buildRecapCardHtml(ev, recap, club)}
        </button>
        ${renderPubAdminRecapActions(ev)}
      </div>
    `).join('');
}

function renderPubAdminRecapActions(ev) {
  if (!currentClubForRecaps || !canPostRecapForClub(currentClubForRecaps.id)) return '';
  return `
    <div class="pub-admin-actions" data-admin-actions>
      <button type="button" class="pub-admin-btn" data-edit-recap="${esc(ev.id)}">Edit</button>
      <button type="button" class="pub-admin-btn pub-admin-btn--danger" data-delete-recap="${esc(ev.id)}">Delete</button>
    </div>
  `;
}

function renderRecapEmptyState(hidden = false) {
  return `
    <p class="club-recap-empty-state" id="club-recap-empty"${hidden ? ' hidden' : ''}>
      <img src="/assets/images/club_details/icons/forbidden.png" alt="" class="club-recap-empty-icon" width="56" height="56" decoding="async">
      <span>No recaps listed for past events.</span>
    </p>
  `;
}

function updateRecapGrid(pastEvents, club) {
  const grid = document.getElementById('club-recap-grid');
  if (!grid) return;

  const hasRecaps = hasRecapHighlights(pastEvents);
  const storedHeight = Number(grid.dataset.naturalHeight) || 0;

  grid.querySelectorAll('.club-recap-card').forEach(el => el.remove());
  grid.querySelectorAll('.club-recap-card-wrap').forEach(el => el.remove());

  let emptyMsg = document.getElementById('club-recap-empty');
  if (!emptyMsg) {
    grid.insertAdjacentHTML('beforeend', renderRecapEmptyState());
    emptyMsg = document.getElementById('club-recap-empty');
  }

  if (hasRecaps) {
    const temp = document.createElement('div');
    temp.innerHTML = renderRecapCards(pastEvents, club);
    while (temp.firstChild) {
      grid.insertBefore(temp.firstChild, emptyMsg);
    }
    emptyMsg.hidden = true;
    grid.classList.remove('is-recap-empty');
    grid.style.minHeight = '';
    grid.dataset.naturalHeight = String(grid.offsetHeight);
    wireRecapAdminActions(pastEvents, club);
    return;
  }

  emptyMsg.hidden = false;
  grid.classList.add('is-recap-empty');
  grid.style.minHeight = storedHeight ? `${storedHeight}px` : '';
}

function wireRecapGrid() {
  const grid = document.getElementById('club-recap-grid');
  const emptyMsg = document.getElementById('club-recap-empty');
  if (!grid) return;

  if (emptyMsg?.hidden === false) {
    grid.classList.add('is-recap-empty');
    const storedHeight = Number(grid.dataset.naturalHeight);
    if (storedHeight) grid.style.minHeight = `${storedHeight}px`;
    return;
  }

  if (grid.querySelector('.club-recap-card')) {
    grid.dataset.naturalHeight = String(grid.offsetHeight);
  }
}

function getEventsNeedingRecap(pastEvents) {
  return (pastEvents || []).filter(ev => !getRecapBody(getRecapForEvent(ev)));
}

function scrollToRecapForm(eventId) {
  openRecapFormModal(eventId);
}

let recapFormCloseTimer = null;
let editingRecapEventId = null;
let currentClubForRecaps = null;

function resetRecapFormMode() {
  editingRecapEventId = null;
  const title = document.getElementById('club-recap-form-title');
  const submit = document.getElementById('club-recap-submit');
  const note = document.querySelector('.club-recap-form-note');
  const select = document.getElementById('club-recap-event');
  if (title) title.textContent = 'Post Event Recap';
  if (submit) submit.textContent = 'Post recap';
  if (note && note.dataset.defaultNote) note.textContent = note.dataset.defaultNote;
  if (select) select.disabled = false;
  document.getElementById('club-recap-form')?.reset();
}

function populateRecapFormForEdit(ev) {
  const recap = getRecapForEvent(ev);
  const data = window.AdobeUserFeatures?.normalizeEventRecap?.(recap) || recap || {};
  const select = document.getElementById('club-recap-event');
  if (select) {
    if (![...select.options].some(opt => opt.value === ev.id)) {
      select.insertAdjacentHTML('afterbegin', `<option value="${esc(ev.id)}">${esc(ev.title)} — ${esc(formatEventDate(ev))}</option>`);
    }
    select.value = ev.id;
    select.disabled = true;
  }
  const summaryEl = document.getElementById('club-recap-summary');
  const highlightsEl = document.getElementById('club-recap-highlights');
  const attendanceEl = document.getElementById('club-recap-attendance');
  if (summaryEl) summaryEl.value = data.summary || '';
  if (highlightsEl) highlightsEl.value = (data.highlights || []).join('\n');
  if (attendanceEl) {
    const attendanceMatch = String(data.attendance || '').match(/(\d+)/);
    attendanceEl.value = attendanceMatch ? attendanceMatch[1] : '';
  }
}

function openRecapFormModalForEdit(ev) {
  if (!ev || !currentClubForRecaps || !canPostRecapForClub(currentClubForRecaps.id)) return;
  editingRecapEventId = ev.id;
  const title = document.getElementById('club-recap-form-title');
  const submit = document.getElementById('club-recap-submit');
  const note = document.querySelector('.club-recap-form-note');
  if (title) title.textContent = 'Edit Event Recap';
  if (submit) submit.textContent = 'Save changes';
  if (note) {
    if (!note.dataset.defaultNote) note.dataset.defaultNote = note.textContent;
    note.textContent = `Update the recap for ${ev.title}.`;
  }
  populateRecapFormForEdit(ev);
  // Ensure all form inputs are enabled for editing (they may have been injected as disabled
  // when no new recaps were needed, but editing an existing recap always needs them enabled)
  const form = document.getElementById('club-recap-form');
  form?.querySelectorAll('input, textarea, button[type="submit"]').forEach(el => {
    el.removeAttribute('disabled');
  });
  setRecapFormOpen(true);
}

function deleteRecapForEvent(ev, club) {
  if (!ev || !club || !canPostRecapForClub(club.id)) return;
  if (!window.confirm(`Delete the recap for "${ev.title}"?`)) return;
  window.AdobeUserFeatures?.removeEventRecap?.(ev.id, {
    title: ev.title,
    clubId: club.id,
    clubName: club.name,
  });
  reloadClubPage();
}

function finishCloseRecapFormModal() {
  const modal = document.getElementById('club-recap-form-modal');
  const card = document.getElementById('club-recap-form-modal-card');
  if (!modal) return;
  modal.classList.remove('open', 'is-closing');
  card?.classList.remove('is-closing');
  modal.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('club-recap-form-open');
  document.body.classList.remove('club-recap-form-open');
  resetRecapFormMode();
  syncPageScrollLock();
}

function syncPageScrollLock() {
  const evModalOpen = document.getElementById('ev-modal-overlay')?.classList.contains('open');
  const recapFormOpen = document.getElementById('club-recap-form-modal')?.classList.contains('open');
  const recapReadOpen = document.documentElement.classList.contains('club-recap-modal-open');
  if (!evModalOpen && !recapFormOpen && !recapReadOpen) {
    document.documentElement.classList.remove('club-recap-modal-open', 'club-recap-form-open');
    document.body.classList.remove('club-recap-modal-open', 'club-recap-form-open');
    document.body.style.overflow = '';
  }
}

function setRecapFormOpen(open, { smooth = false } = {}) {
  const modal = document.getElementById('club-recap-form-modal');
  const card = document.getElementById('club-recap-form-modal-card');
  if (!modal) return;

  window.clearTimeout(recapFormCloseTimer);

  if (!open) {
    if (smooth) {
      modal.classList.add('is-closing');
      card?.classList.add('is-closing');
      recapFormCloseTimer = window.setTimeout(finishCloseRecapFormModal, 320);
      return;
    }
    finishCloseRecapFormModal();
    return;
  }

  const msg = document.getElementById('club-recap-msg');
  if (msg) msg.hidden = true;

  modal.classList.add('open');
  modal.classList.remove('is-closing');
  card?.classList.remove('is-closing');
  modal.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('club-recap-form-open');
  document.body.classList.add('club-recap-form-open');
  document.body.style.overflow = 'hidden';
}

function openRecapFormModal(eventId) {
  resetRecapFormMode();
  setRecapFormOpen(true);

  if (eventId) {
    const select = document.getElementById('club-recap-event');
    if (select && [...select.options].some(opt => opt.value === eventId)) {
      select.value = eventId;
    }
  }

  window.setTimeout(() => {
    document.getElementById('club-recap-event')?.focus();
  }, 150);
}

function closeRecapFormModal() {
  const modal = document.getElementById('club-recap-form-modal');
  if (!modal || !modal.classList.contains('open')) return;
  setRecapFormOpen(false, { smooth: true });
}

function updateRecapCtaState(pastEvents) {
  const cta = document.getElementById('club-recap-cta');
  if (!cta) return;
  const hasWork = getEventsNeedingRecap(pastEvents).length > 0;
  cta.disabled = !hasWork;
  cta.classList.toggle('club-recap-cta--active', hasWork);
  cta.setAttribute('aria-disabled', hasWork ? 'false' : 'true');
}

function wireRecapSectionCta(pastEvents) {
  const cta = document.getElementById('club-recap-cta');
  if (!cta) return;

  updateRecapCtaState(pastEvents);

  cta.addEventListener('click', () => {
    if (cta.disabled) return;
    openRecapFormModal();
  });
}

function renderRecapFormInner(club, pastEvents, canPostRecap) {
  const recapOptions = renderRecapFormOptions(pastEvents);
  const disabled = canPostRecap ? '' : 'disabled';
  return `
    <p class="ev-admin-form-error" id="club-recap-msg" hidden role="alert"></p>
    <p class="club-recap-form-note">Select a past ${esc(club.name)} event that still needs a recap. Events that already have one are not listed.</p>
    <div class="ev-admin-grid">
      <label>
        <span>Past event <span class="field-required" aria-hidden="true">*</span></span>
        <select id="club-recap-event" required ${disabled}>${recapOptions}</select>
      </label>
      <label>
        <span>Attendance <span class="field-required" aria-hidden="true">*</span></span>
        <input type="number" id="club-recap-attendance" required min="1" max="999" placeholder="12" ${disabled}>
      </label>
    </div>
    <label>
      <span>What happened <span class="field-required" aria-hidden="true">*</span></span>
      <textarea id="club-recap-summary" required minlength="20" maxlength="1200" rows="4" placeholder="Describe the session — what you did, who showed up, and the overall vibe." ${disabled}></textarea>
    </label>
    <label>
      <span>Highlights <span class="field-required" aria-hidden="true">*</span></span>
      <textarea id="club-recap-highlights" required minlength="10" maxlength="800" rows="3" placeholder="One highlight per line, e.g.&#10;Best candid shot near Trinity Circle&#10;Mini critique over chai" ${disabled}></textarea>
    </label>
    <button type="submit" class="ev-admin-submit" id="club-recap-submit" ${disabled}>Post recap</button>
  `;
}

function injectRecapFormModal(club, pastEvents, canPostRecap) {
  if (document.getElementById('club-recap-form-modal')) return;

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="ev-admin-modal" id="club-recap-form-modal" aria-hidden="true">
      <div class="ev-admin-modal-card" id="club-recap-form-modal-card" role="dialog" aria-modal="true" aria-labelledby="club-recap-form-title">
        <div class="ev-admin-head">
          <h3 class="ev-admin-title" id="club-recap-form-title">Post Event Recap</h3>
          <button type="button" class="ev-admin-close" data-close-recap-form aria-label="Close">✕</button>
        </div>
        <form class="ev-admin-form" id="club-recap-form" novalidate>
          ${renderRecapFormInner(club, pastEvents, canPostRecap)}
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(el.firstElementChild);

  const modal = document.getElementById('club-recap-form-modal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeRecapFormModal();
  });
  modal?.querySelector('[data-close-recap-form]')?.addEventListener('click', () => closeRecapFormModal());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeRecapFormModal();
  });
}

function renderRecapFormOptions(pastEvents) {
  const available = pastEvents.filter(ev => !getRecapBody(getRecapForEvent(ev)));
  if (!available.length) {
    return '<option value="">No past events available for a new recap</option>';
  }
  return available.map(ev => `
    <option value="${esc(ev.id)}">${esc(ev.title)} — ${esc(formatEventDate(ev))}</option>
  `).join('');
}

function renderCategoryGrid(activities, club) {
  const cats = (activities.length ? activities : [club.tag]).slice(0, 4);
  const items = cats.map((name, i) => `
    <article class="club-cat-item">
      <span class="club-cat-icon">${ACTIVITY_ICON_SVGS[i % ACTIVITY_ICON_SVGS.length]}</span>
      <div class="club-cat-text">
        <h4>${esc(name)}</h4>
        <p>${esc(getActivityDesc(club.id, name, club))}</p>
      </div>
    </article>
  `).join('');
  return `<div class="club-cat-grid reveal-stagger">${items}</div>`;
}

function teamHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickTeamImages(clubId, count = 4) {
  const thirdImageFile = 'emp4.avif';
  const pool = TEAM_IMAGE_FILES.filter(file => file !== thirdImageFile);
  const sorted = [...pool].sort((a, b) => teamHash(`${clubId}-${a}`) - teamHash(`${clubId}-${b}`));
  const picked = sorted.slice(0, count).map(file => `${TEAM_IMAGE_BASE}${file}`);
  if (count > 2) {
    picked[2] = `${TEAM_IMAGE_BASE}${thirdImageFile}`;
  }
  return picked;
}

function getTeamMembers(clubId, count = 4) {
  const leads = getClubLeads(clubId);
  const images = pickTeamImages(clubId, count);
  const names = [...TEAM_MEMBER_NAMES]
    .sort((a, b) => teamHash(`${clubId}-name-${a}`) - teamHash(`${clubId}-name-${b}`))
    .slice(0, count);
  return images.map((image, i) => ({
    image,
    name: names[i] || TEAM_MEMBER_NAMES[i % TEAM_MEMBER_NAMES.length],
    role: leads[i]?.role || TEAM_FALLBACK_ROLES[i] || 'Club member',
  }));
}

function renderTeamCard(member) {
  return `
    <article class="club-team-card">
      <img src="${esc(member.image)}" alt="${esc(member.name)}" loading="lazy" decoding="async">
      <div class="club-team-card-overlay">
        <strong>${esc(member.name)}</strong>
        <span>${esc(member.role)}</span>
      </div>
    </article>
  `;
}

function renderTeamJoinCard(club, joined, joinLabel, isAdminOfClub) {
  return `
    <article class="club-team-card club-team-card--join">
      <p class="club-team-join-copy">Join our community at ${esc(club.name)}.</p>
      <button type="button" class="club-team-join-btn ${joined ? 'is-joined' : ''}" id="club-detail-join-team" ${isAdminOfClub ? 'disabled' : ''}>${esc(joinLabel)} →</button>
    </article>
  `;
}

function getSimilarClubs(allClubs, club) {
  // Only show clubs that share the same tag (same community/category).
  const myTag = String(club?.tag || '').toLowerCase();
  if (!myTag) return [];
  return (allClubs || [])
    .filter(c => c.id !== club.id && String(c.tag || '').toLowerCase() === myTag)
    .slice(0, 3);
}

function renderTeamSection(club, joined, joinLabel, isAdminOfClub) {
  const members = getTeamMembers(club.id, 4);
  const cards = [...members.map(renderTeamCard)];
  const joinCard = renderTeamJoinCard(club, joined, joinLabel, isAdminOfClub);
  const insertAt = Math.min(2, cards.length);
  cards.splice(insertAt, 0, joinCard);

  return `
    <section class="club-block club-team-block reveal" id="club-team">
      <h2 class="club-section-title">Meet the dedicated team</h2>
      <div class="club-team-grid reveal-stagger">${cards.join('')}</div>
    </section>
  `;
}

function renderSimilarGrid(clubs, club) {
  const similar = getSimilarClubs(clubs, club);
  if (!similar.length) {
    return '<p class="club-similar-empty">No similar clubs yet.</p>';
  }
  return similar.map(c => `
      <a class="club-popular-card" href="/club?id=${esc(c.id)}">
        <img src="${esc(getClubImageSrc(c))}" alt="${esc(c.name)}" loading="lazy" decoding="async">
        <span>${esc(c.name)}</span>
      </a>
    `).join('');
}

function renderClubDetail(root, club, events, allClubs, gallery, feed) {
  currentClubForRecaps = club;
  const meta = getMeta(club.id);
  const imagePool = getClubImagePool(club, gallery);
  const upcomingEvents = getUpcomingClubEvents(club, events);
  const pastEvents = getPastClubEvents(club, events);
  const joined = getAuth().isClubJoined(club.id);
  const isAdminOfClub = getAuth().getAdminOf().includes(club.id);
  const joinLabel = isAdminOfClub ? 'Admin only' : (joined ? 'Joined' : 'Join');
  const totalMembers = allClubs.reduce((n, c) => n + (c.members || 0), 0);
  const eventsNeedingRecap = getEventsNeedingRecap(pastEvents);
  const canPostRecap = canPostRecapForClub(club.id) && pastEvents.length > 0 && eventsNeedingRecap.length > 0;
  const showRecapCta = canPostRecapForClub(club.id);
  const hasEventsToRecap = eventsNeedingRecap.length > 0;
  const hasRecaps = hasRecapHighlights(pastEvents);
  const slack = getClubSlack(club);
  const slackCta = slack
    ? slackLinkHtml(slack)
    : `<a class="btn-outline" href="#club-events">Browse events</a>`;
  const memberCount = window.AdobeClubsAuth?.getClubMemberCount?.(club.id, club.members) ?? club.members;

  root.innerHTML = `
    <article class="club-page club-detail-page">
      <div class="club-detail-inner">
        <header class="club-hero reveal">
          <a class="club-back" href="/clubs">← All clubs</a>
          <div class="club-hero-grid">
            <div class="club-hero-copy">
              <div class="club-hero-eyebrow">
                <p class="club-hero-tag">${esc(club.tag)} · ${esc(club.name)}</p>
                ${clubMemberCountHtml(memberCount)}
              </div>
              <h1 class="club-hero-title">${esc(meta.headline.line1)}<br>${esc(meta.headline.line2)}.</h1>
              <p class="club-hero-desc">${esc(club.desc)} Connect with colleagues, explore nearby events, and build your ${esc(club.tag.toLowerCase())} community — all in one place.</p>
              <div class="club-hero-actions">
                <button type="button" class="btn-primary ${joined ? 'is-joined' : ''}" id="club-detail-join" ${isAdminOfClub ? 'disabled' : ''}>${esc(joinLabel)}</button>
                ${slackCta}
              </div>
            </div>
            <div class="club-hero-photo${clubHasHeroIllustration(club.id) ? ' club-hero-photo--illustration' : ''}">
              <img id="club-hero-img" src="${esc(getClubHeroImageSrc(club))}" alt="${esc(club.name)}" loading="eager" decoding="async">
              ${getSimilarClubs(allClubs, club).length ? `
              <div class="club-hero-similar">
                <p class="club-hero-similar-label">Similar clubs</p>
                ${getSimilarClubs(allClubs, club).slice(0, 3).map(c => `
                  <a class="club-hero-similar-item" href="/club?id=${esc(c.id)}">
                    <img src="${esc(getClubImageSrc(c))}" alt="${esc(c.name)}" loading="lazy">
                    <span>${esc(c.name)}</span>
                  </a>`).join('')}
              </div>` : ''}
            </div>
          </div>
        </header>

        <section class="club-block club-does-block reveal">
          <h2 class="club-section-title">What this club does</h2>
          ${renderCategoryGrid(meta.activities, club)}
        </section>

        <section class="club-block reveal" id="club-events">
          <h2 class="club-section-title">Find your next ${esc(club.tag.toLowerCase())} event</h2>
          <div class="club-filters" id="club-date-filters">
            <button type="button" class="club-filter-chip is-active" data-date-filter="all">All dates</button>
            <button type="button" class="club-filter-chip" data-date-filter="today">Today</button>
            <button type="button" class="club-filter-chip" data-date-filter="tomorrow">Tomorrow</button>
            <button type="button" class="club-filter-chip" data-date-filter="week">This week</button>
          </div>
          <div class="club-event-grid reveal-stagger" id="club-event-grid">${renderEventCards(upcomingEvents, club, imagePool)}</div>
        </section>

        <section class="club-block reveal" id="club-recaps">
          <h2 class="club-section-title">Highlights from recent sessions</h2>
          <div class="club-recap-panel">
            <div class="club-recap-grid reveal-stagger${hasRecaps ? '' : ' is-recap-empty'}" id="club-recap-grid">
              ${renderRecapCards(pastEvents, club)}
              ${renderRecapEmptyState(hasRecaps)}
            </div>
            ${showRecapCta ? `
              <div class="club-recap-foot">
                <button type="button"
                  class="club-recap-cta${hasEventsToRecap ? ' club-recap-cta--active' : ''}"
                  id="club-recap-cta"
                  ${hasEventsToRecap ? '' : 'disabled'}
                  aria-disabled="${hasEventsToRecap ? 'false' : 'true'}">
                  Post a recap
                </button>
              </div>
            ` : ''}
          </div>
        </section>

        ${renderTeamSection(club, joined, joinLabel, isAdminOfClub)}


        <section class="club-block club-footer-block reveal" id="club-join">
          <div class="club-footer-inner">
            <h2 class="club-footer-title">Start participating, meet new people, and join your first ${esc(club.tag.toLowerCase())} event today</h2>
            <div class="club-footer-perks">
              <span class="club-footer-perk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Nearby events</span>
              <span class="club-footer-perk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Easy to join</span>
              <span class="club-footer-perk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Real community</span>
              <span class="club-footer-perk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> All skill levels</span>
            </div>
            <button type="button" class="club-footer-cta ${joined ? 'is-joined' : ''}" id="club-detail-join-footer" ${isAdminOfClub ? 'disabled' : ''}>${esc(joinLabel)} →</button>
          </div>
        </section>
      </div>
    </article>
  `;

  document.title = `${club.name} — Adobe Clubs`;

  window.AdobeEventModal?.init({
    clubs: allClubs,
    events,
    clubContext: club,
    onStateChange: () => {
      refreshClubEventActions(club, upcomingEvents);
      setClubJoinButtonLabels(getAuth().isClubJoined(club.id), club, upcomingEvents);
    },
  });

  injectRecapFormModal(club, pastEvents, canPostRecap);
  wireJoinButtons(club, isAdminOfClub, events, upcomingEvents);
  wireHeroImage(club);
  wireDateFilters();
  wireClubEventCards(club, upcomingEvents);
  wireRecapSectionCta(pastEvents);
  wireRecapGrid();
  wireRecapForm(root, club, pastEvents);
  wireRecapCards(root, pastEvents, club);
  wireReveals(root);

  if (window.location.hash === '#club-recaps') {
    requestAnimationFrame(() => {
      const section = document.getElementById('club-recaps');
      if (!section) return;
      if (window.AdobeClubsScroll?.scrollToElement) {
        window.AdobeClubsScroll.scrollToElement(section, 112);
      } else {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  window.AdobeBreadcrumbs?.set([
    { label: 'Home', href: window.AdobeBreadcrumbs?.getHomeHref?.() || '/' },
    { label: 'Clubs', href: '/clubs' },
    { label: club.name, current: true },
  ]);
}

function wireHeroImage(club) {
  if (club.heroImage || clubHasHeroIllustration(club.id)) return;
  const img = document.getElementById('club-hero-img');
  if (!img) return;
  img.addEventListener('error', () => {
    img.onerror = null;
    img.src = getClubImageSrc(club);
  }, { once: true });
}

function updateClubMemberCountDisplay(club) {
  const el = document.querySelector('.club-member-count-text');
  if (!el || !club) return;
  const count = window.AdobeClubsAuth?.getClubMemberCount?.(club.id, club.members) ?? club.members;
  el.textContent = formatClubMemberLabel(count) || '';
}

function setClubJoinButtonLabels(joined, club, upcomingEvents) {
  const label = joined ? 'Joined' : 'Join';
  const heroBtn = document.getElementById('club-detail-join');
  if (heroBtn) {
    heroBtn.classList.toggle('is-joined', joined);
    heroBtn.textContent = label;
  }
  document.querySelectorAll('#club-detail-join-footer, #club-detail-join-team').forEach(el => {
    el.classList.toggle('is-joined', joined);
    el.textContent = `${label} →`;
  });
  if (club && upcomingEvents) refreshClubEventActions(club, upcomingEvents);
}

function wireJoinButtons(club, isAdminOfClub, allEvents, upcomingEvents) {
  window.__clubDetailJoinCtx = { club, isAdminOfClub, allEvents, upcomingEvents };

  function wireJoin(btn) {
    if (!btn || isAdminOfClub) return;
    btn.addEventListener('click', () => {
      const ctx = window.__clubDetailJoinCtx;
      if (!getAuth().isAuthenticated()) {
        window.location.href = getAuth().loginUrlWithNext?.() || `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      const joined = window.AdobeJoinModal?.toggleClubJoinWithModal(ctx.club, { events: ctx.allEvents })
        ?? getAuth().toggleClubJoin(ctx.club.id);
      setClubJoinButtonLabels(joined, ctx.club, ctx.upcomingEvents);
      updateClubMemberCountDisplay(ctx.club);
    });
  }
  wireJoin(document.getElementById('club-detail-join'));
  wireJoin(document.getElementById('club-detail-join-footer'));
  wireJoin(document.getElementById('club-detail-join-team'));

  if (!window.__clubJoinMemberListenerBound) {
    window.__clubJoinMemberListenerBound = true;
    window.addEventListener('adobe-club-members-changed', (e) => {
      const ctx = window.__clubDetailJoinCtx;
      if (!ctx?.club || e.detail?.clubId !== ctx.club.id) return;
      updateClubMemberCountDisplay(ctx.club);
    });
  }
}

function wireDateFilters() {
  const filterBar = document.getElementById('club-date-filters');
  const eventGrid = document.getElementById('club-event-grid');
  if (!filterBar || !eventGrid) return;

  let gridNaturalHeight = 0;

  const measureGridHeight = () => {
    eventGrid.style.minHeight = '';
    gridNaturalHeight = eventGrid.offsetHeight;
  };

  const applyFilter = (filter) => {
    const cards = eventGrid.querySelectorAll('.club-event-card');
    const emptyMsg = document.getElementById('club-events-filter-empty');
    if (!cards.length) {
      if (emptyMsg) {
        emptyMsg.querySelector('span').textContent = 'No upcoming events for this club yet.';
        emptyMsg.hidden = false;
      }
      eventGrid.classList.add('is-filter-empty');
      return;
    }

    if (filter === 'all') {
      cards.forEach(card => {
        card.classList.remove('is-filter-hidden');
        card.hidden = false;
      });
      if (emptyMsg) emptyMsg.hidden = true;
      eventGrid.classList.remove('is-filter-empty');
      measureGridHeight();
      return;
    }

    let visible = 0;
    cards.forEach(card => {
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
    eventGrid.classList.toggle('is-filter-empty', showEmpty);

    if (showEmpty && gridNaturalHeight) {
      eventGrid.style.minHeight = `${gridNaturalHeight}px`;
    } else {
      eventGrid.style.minHeight = '';
    }
  };

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-date-filter]');
    if (!btn || !filterBar.contains(btn)) return;
    const filter = btn.dataset.dateFilter;
    filterBar.querySelectorAll('.club-filter-chip').forEach(el => el.classList.toggle('is-active', el === btn));
    applyFilter(filter);
  });

  applyFilter('all');
}

function wireRecapForm(root, club, pastEvents) {
  const form = document.getElementById('club-recap-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = document.getElementById('club-recap-msg');
    const showMsg = (text, type) => {
      if (!msg) return;
      msg.hidden = !text;
      msg.textContent = text || '';
      msg.className = type === 'success' ? 'ev-admin-form-success' : 'ev-admin-form-error';
    };

    if (!getAuth().isAuthenticated()) {
      window.location.href = getAuth().loginUrlWithNext();
      return;
    }

    if (!canPostRecapForClub(club.id)) {
      showMsg('Only club admins can post recaps.', 'error');
      return;
    }

    const eventId = editingRecapEventId || document.getElementById('club-recap-event')?.value;
    const summary = document.getElementById('club-recap-summary')?.value?.trim();
    const highlightsRaw = document.getElementById('club-recap-highlights')?.value?.trim();
    const attendanceCount = parseInt(document.getElementById('club-recap-attendance')?.value, 10);
    const ev = pastEvents.find(item => item.id === eventId);

    if (!ev || !isEventPast(ev)) {
      showMsg('Please select a valid past event.', 'error');
      return;
    }
    if (!editingRecapEventId && getRecapBody(getRecapForEvent(ev))) {
      showMsg('This event already has a recap.', 'error');
      return;
    }
    const highlights = (highlightsRaw || '')
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
    if (!summary || summary.length < 20) {
      showMsg('Write at least 20 characters for what happened.', 'error');
      return;
    }
    if (!highlights.length) {
      showMsg('Add at least one highlight (one per line).', 'error');
      return;
    }
    if (!Number.isFinite(attendanceCount) || attendanceCount < 1) {
      showMsg('Enter a valid attendance count.', 'error');
      return;
    }

    window.AdobeUserFeatures?.setEventRecap?.(ev.id, {
      summary,
      highlights,
      attendanceCount,
      attendance: `${attendanceCount} members`,
    }, {
      title: ev.title,
      clubId: club.id,
      clubName: club.name,
    }, { action: editingRecapEventId ? 'update' : 'create' });

    updateRecapGrid(pastEvents, club);
    updateRecapCtaState(pastEvents);

    const select = document.getElementById('club-recap-event');
    if (select) select.innerHTML = renderRecapFormOptions(pastEvents);

    showMsg(editingRecapEventId ? 'Recap updated.' : 'Recap posted — thanks for sharing!', 'success');
    form.reset();
    resetRecapFormMode();

    window.setTimeout(() => {
      closeRecapFormModal();
    }, 1200);
  });
}

function injectRecapModal() {
  if (document.getElementById('club-recap-modal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="club-recap-modal" id="club-recap-modal" role="dialog" aria-modal="true" aria-labelledby="club-recap-modal-title" hidden>
      <div class="club-recap-modal-backdrop" data-close-recap></div>
      <div class="club-recap-modal-panel club-recap-modal-panel--rich">
        <button type="button" class="club-recap-modal-close" data-close-recap aria-label="Close recap">✕</button>
        <div id="club-recap-modal-content"></div>
      </div>
    </div>
  `;
  document.body.appendChild(el.firstElementChild);

  document.getElementById('club-recap-modal')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-recap]')) closeRecapModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRecapModal();
  });
}

function openRecapModal(ev, recap, club) {
  injectRecapModal();
  const modal = document.getElementById('club-recap-modal');
  const content = document.getElementById('club-recap-modal-content');
  if (!modal || !content) return;

  const uf = window.AdobeUserFeatures;
  content.innerHTML = uf?.buildRecapHtml
    ? uf.buildRecapHtml(recap, ev, { clubName: club?.name || ev.club, dateLabel: formatEventDate(ev) })
    : `<p>${esc(getRecapBody(recap))}</p>`;

  modal.hidden = false;
  document.documentElement.classList.add('club-recap-modal-open');
  document.body.classList.add('club-recap-modal-open');
  modal.querySelector('.club-recap-modal-close')?.focus();
}

function closeRecapModal() {
  const modal = document.getElementById('club-recap-modal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.documentElement.classList.remove('club-recap-modal-open');
  document.body.classList.remove('club-recap-modal-open');
  syncPageScrollLock();
}

function wireRecapCards(root, pastEvents, club) {
  injectRecapModal();
  const grid = root.querySelector('#club-recap-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    if (e.target.closest('[data-admin-actions]')) return;
    const card = e.target.closest('[data-recap-event]');
    if (!card || !grid.contains(card)) return;
    const ev = pastEvents.find(item => item.id === card.dataset.recapEvent);
    if (!ev) return;
    const recap = getRecapForEvent(ev);
    if (!getRecapBody(recap)) return;
    openRecapModal(ev, recap, club);
  });

  wireRecapAdminActions(pastEvents, club);
}

function wireRecapAdminActions(pastEvents, club) {
  const grid = document.getElementById('club-recap-grid');
  if (!grid || !club || !canPostRecapForClub(club.id)) return;
  grid.querySelectorAll('[data-edit-recap]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ev = pastEvents.find(item => item.id === btn.getAttribute('data-edit-recap'));
      if (ev) openRecapFormModalForEdit(ev);
    });
  });
  grid.querySelectorAll('[data-delete-recap]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ev = pastEvents.find(item => item.id === btn.getAttribute('data-delete-recap'));
      if (ev) deleteRecapForEvent(ev, club);
    });
  });
}

function wireReveals(root) {
  root.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
    if (!window.IntersectionObserver) { el.classList.add('visible'); return; }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
  });
}

let clubPageCtx = null;

async function reloadClubPage() {
  if (!clubPageCtx?.root || !clubPageCtx?.clubId) return;
  try {
    const data = await loadData();
    const club = (data.clubs || []).find(c => c.id === clubPageCtx.clubId);
    if (!club) return;
    const customEvents = getAuth().mergePublishedEvents?.(data.events || [])
      || [...(getAuth().getAllCustomEvents?.() || []), ...(data.events || [])];
    window.AdobeEventSeats?.init?.(customEvents);
    renderClubDetail(
      clubPageCtx.root,
      club,
      customEvents,
      data.clubs || [],
      data.gallery || [],
      data.feed || []
    );
  } catch (err) {
    console.warn('Club page refresh failed:', err);
  }
}

export async function initClubDetailPage(root) {
  if (!root) return;

  const clubId = getClubIdFromUrl();
  if (!clubId) {
    renderNotFound(root, 'No club ID in URL. Use ?id=adobe-lens');
    return;
  }

  try {
    const data = await loadData();
    const club = (data.clubs || []).find(c => c.id === clubId);
    if (!club) {
      const ids = (data.clubs || []).map(c => c.id).join(', ');
      // eslint-disable-next-line no-console
      console.error(`[club-detail] No club with id="${clubId}". Available: ${ids}`);
      renderNotFound(root, `No club with id "${clubId}".`);
      return;
    }
    const customEvents = getAuth().mergePublishedEvents?.(data.events || [])
      || [...(getAuth().getAllCustomEvents?.() || []), ...(data.events || [])];
    window.AdobeEventSeats?.init?.(customEvents);
    clubPageCtx = { root, clubId };
    renderClubDetail(root, club, customEvents, data.clubs || [], data.gallery || [], data.feed || []);
    getAuth().onPublishedContentChange?.(reloadClubPage);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[club-detail] Failed to load:', err);
    renderNotFound(root, err.message);
  }
}

