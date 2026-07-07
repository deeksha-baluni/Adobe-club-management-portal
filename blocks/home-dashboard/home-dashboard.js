/**
 * Home Dashboard — member home sections (recommended, calendar, events, clubs).
 * da.live: key | value config rows; records from data.json.
 */
import { loadCSS, loadScript } from '../../scripts/aem.js';
import { readPageConfig, cfg, fillTemplate } from '../club-shared/block-config.js';
import { getEventImageSrc } from '../club-shared/club-page.js';

export const HOME_DASHBOARD_DEFAULTS = {
  'clubs-data': '/data/data.json',
  'section-recommended-label': 'Recommended for you',
  'section-recommended-title': 'Recommended for you',
  'section-popular-title': 'Popular clubs',
  'section-recommended-link': 'Browse all clubs →',
  'section-recommended-href': '/clubs',
  'quiz-prompt-strong': 'Get picks made for you.',
  'quiz-prompt-text': "Tell us what you're into and we'll match clubs to your interests.",
  'quiz-cta-text': 'Take the 1-minute quiz',
  'rec-empty-text': 'We saved your interests. Browse clubs to find communities that fit you.',
  'rec-empty-cta': 'Browse clubs',
  'rec-empty-href': '/clubs',
  'section-calendar-label': 'Your calendar',
  'section-calendar-link': "View RSVP'd events →",
  'section-calendar-href': '/events?rsvp=mine',
  'cal-rsvps-title': "RSVP'd events",
  'cal-empty-text': "No RSVP'd events yet.",
  'cal-empty-link': 'Browse events →',
  'cal-empty-href': '/events',
  'cal-more-template': "{count} more RSVP'd event{plural} →",
  'section-events-title': 'Upcoming events',
  'section-events-link': 'See all events →',
  'section-events-href': '/events',
  'section-clubs-label': 'Your clubs',
  'section-clubs-title': 'Your clubs',
  'section-clubs-title-empty': 'Find your first club',
  'section-clubs-link': 'Find more →',
  'section-clubs-href': '/clubs',
  'clubs-empty-text': "Browse what's available and join one that fits you",
  'clubs-empty-cta': 'Explore clubs',
  'clubs-empty-href': '/clubs',
  'join-label': 'Join',
  'joined-label': 'Joined',
};

const CLUB_IMG = '/assets/images/clubs/';
const EVENT_IMG = '/assets/images/events/';
const EVENT_FALLBACK = `${EVENT_IMG}evt-hero1.avif`;
const MONTHS = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

let PAGE_CONFIG = { ...HOME_DASHBOARD_DEFAULTS };
let BASE_CLUBS = [];
let EVENTS = [];
let depsLoaded = false;

function codeBase() {
  return window.hlx?.codeBasePath || '';
}

function auth() {
  return window.AdobeClubsAuth || null;
}

function uf() {
  return window.AdobeUserFeatures || null;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseEventDate(ev) {
  if (uf()?.parseEventDate) return uf().parseEventDate(ev);
  if (!ev?.month || !ev?.day) return null;
  const m = MONTHS[String(ev.month).toUpperCase()];
  const d = parseInt(ev.day, 10);
  if (m == null || Number.isNaN(d)) return null;
  return new Date(new Date().getFullYear(), m, d);
}

function isUpcoming(ev) {
  if (uf()?.isEventUpcoming) return uf().isEventUpcoming(ev);
  const dt = parseEventDate(ev);
  if (!dt) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return dt >= today;
}

function eventImage(ev) {
  return window.AdobeEventModal?.getEventImageSrc?.(ev)
    || getEventImageSrc(ev)
    || EVENT_FALLBACK;
}

function clubsForDisplay() {
  return auth()?.enrichClubs?.(BASE_CLUBS) || BASE_CLUBS;
}

function mergedEvents() {
  return auth()?.mergePublishedEvents?.(EVENTS) || EVENTS;
}

async function loadData() {
  if (window.__adobeClubsDataPrefetch) {
    const prefetched = await window.__adobeClubsDataPrefetch;
    if (prefetched) return prefetched;
  }
  const path = cfg(PAGE_CONFIG, 'clubs-data', HOME_DASHBOARD_DEFAULTS['clubs-data']);
  const res = await fetch(path);
  if (!res.ok) throw new Error('Could not load data.json');
  return res.json();
}

function formatClubMemberLabel(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return '';
  return `${n} member${n === 1 ? '' : 's'}`;
}

function clubJoinLabel(clubId) {
  return auth()?.isClubJoined?.(clubId)
    ? cfg(PAGE_CONFIG, 'joined-label', 'Joined')
    : cfg(PAGE_CONFIG, 'join-label', 'Join');
}

function clubCard(club) {
  const joined = auth()?.isClubJoined?.(club.id);
  const isAdminClub = auth()?.getAdminOf?.().includes(club.id);
  return `
    <div class="lp-club-card lp-club-card--action">
      <a class="lp-card-link" href="/club?id=${esc(club.id)}">
        <div class="lp-club-thumb">
          <img src="${CLUB_IMG}${esc(club.image || `${club.id}.avif`)}" alt="" loading="lazy" decoding="async" />
        </div>
        <div class="lp-club-body">
          <span class="lp-club-tag">${esc(club.tag)}</span>
          <span class="lp-club-name">${esc(club.name)}</span>
          ${formatClubMemberLabel(club.members) ? `<span class="lp-club-members">${esc(formatClubMemberLabel(club.members))}</span>` : ''}
          <span class="lp-club-desc">${esc(club.desc)}</span>
        </div>
      </a>
      <div class="lp-card-action">
        <button type="button" class="cb-poster-join${joined ? ' is-joined' : ''}" data-club-id="${esc(club.id)}" ${isAdminClub ? 'disabled' : ''}>${esc(clubJoinLabel(club.id))}</button>
      </div>
    </div>`;
}

function eventCard(ev) {
  const state = window.AdobeEventModal?.getActionState?.(ev) || { label: 'RSVP', joined: false, mode: 'rsvp' };
  const joined = auth()?.isEventRsvped?.(ev.id);
  const label = state.label || 'RSVP';
  return `
    <div class="lp-event-card lp-event-card--action">
      <a class="lp-card-link" href="/event?id=${esc(ev.id)}">
        <div class="lp-event-thumb">
          <img src="${esc(eventImage(ev))}" alt="" loading="lazy" decoding="async"
               onerror="this.onerror=null;this.src='${EVENT_FALLBACK}'" />
          <div class="lp-event-date"><span class="m">${esc(ev.month)}</span><span class="d">${esc(ev.day)}</span></div>
        </div>
        <div class="lp-event-body">
          <span class="lp-event-club">${esc(ev.club)}</span>
          <span class="lp-event-title">${esc(ev.title)}</span>
          <span class="lp-event-meta">${esc(ev.time)} · ${esc(ev.location)}</span>
        </div>
      </a>
      <div class="lp-card-action">
        <button type="button" class="ev-poster-rsvp cb-poster-join${joined ? ' is-joined' : ''}${state.mode === 'join-club' ? ' is-join-club' : ''}" data-event-id="${esc(ev.id)}">${esc(label)}</button>
      </div>
    </div>`;
}

function syncClubJoinButton(btn, clubId) {
  if (!btn || !clubId) return;
  const joined = auth()?.isClubJoined?.(clubId);
  btn.classList.toggle('is-joined', joined);
  btn.textContent = clubJoinLabel(clubId);
  btn.disabled = auth()?.getAdminOf?.().includes(clubId);
}

function wireClubJoinButtons(root) {
  (root || document).querySelectorAll('.cb-poster-join[data-club-id]').forEach((btn) => {
    if (btn.dataset.homeWired === '1') return;
    btn.dataset.homeWired = '1';
    const clubId = btn.getAttribute('data-club-id') || '';
    syncClubJoinButton(btn, clubId);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!clubId) return;
      const club = clubsForDisplay().find((c) => c.id === clubId);
      if (!club) return;
      if (auth()?.getAdminOf?.().includes(clubId)) return;
      const joined = window.AdobeJoinModal?.toggleClubJoinWithModal(club, { events: mergedEvents() })
        ?? auth()?.toggleClubJoin(clubId);
      if (joined === null) return;
      document.querySelectorAll(`.cb-poster-join[data-club-id="${CSS.escape(clubId)}"]`).forEach((el) => {
        syncClubJoinButton(el, clubId);
      });
      refreshMemberCountsOnCards();
    });
  });
}

function wireEventRsvpButtons(root) {
  (root || document).querySelectorAll('.ev-poster-rsvp[data-event-id]').forEach((btn) => {
    if (btn.dataset.homeWired === '1') return;
    btn.dataset.homeWired = '1';
    const eventId = btn.getAttribute('data-event-id') || '';
    const ev = mergedEvents().find((item) => item.id === eventId);
    if (ev && window.AdobeEventModal?.applyActionState) {
      window.AdobeEventModal.applyActionState(btn, ev);
    }
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!eventId || !ev) return;
      window.AdobeEventModal?.handleRsvpClick?.(ev, btn);
      document.querySelectorAll(`.ev-poster-rsvp[data-event-id="${CSS.escape(eventId)}"]`).forEach((el) => {
        window.AdobeEventModal?.applyActionState?.(el, ev);
      });
      renderCalendar();
    });
  });
}

function wireHomeCardActions(root) {
  wireClubJoinButtons(root);
  wireEventRsvpButtons(root);
}

function refreshMemberCountsOnCards() {
  const byId = new Map(clubsForDisplay().map((c) => [c.id, c.members]));
  document.querySelectorAll('.lp-club-members').forEach((el) => {
    const card = el.closest('.lp-club-card--action, .lp-club-card');
    const btn = card?.querySelector('[data-club-id]');
    const clubId = btn?.getAttribute('data-club-id');
    if (!clubId || !byId.has(clubId)) return;
    el.textContent = formatClubMemberLabel(byId.get(clubId));
  });
}

function initEventModal() {
  window.AdobeEventSeats?.init?.(mergedEvents());
  window.AdobeEventModal?.init?.({
    clubs: clubsForDisplay(),
    events: mergedEvents(),
    onStateChange(ev) {
      document.querySelectorAll(`.ev-poster-rsvp[data-event-id="${CSS.escape(ev.id)}"]`).forEach((el) => {
        window.AdobeEventModal?.applyActionState?.(el, ev);
      });
      renderCalendar();
    },
  });
}

function renderRecommended() {
  const root = document.getElementById('hm-recommended');
  const title = document.getElementById('hm-rec-title');
  if (!root) return;

  const clubs = clubsForDisplay();
  const features = uf();
  const completed = features?.hasCompletedQuiz?.();

  if (completed) {
    if (title) {
      title.textContent = cfg(PAGE_CONFIG, 'section-recommended-title', HOME_DASHBOARD_DEFAULTS['section-recommended-title']);
    }
    let recs = features.suggestClubs(clubs, 6) || [];
    if (!recs.length) {
      const weights = features.getInterestProfile?.()?.tagWeights || {};
      recs = features.rankClubsByTagWeights?.(clubs, weights, 6) || [];
    }
    if (!recs.length) {
      recs = [...clubs]
        .map((club) => ({ club, score: features.getClubCompatibility?.(club)?.score || 0 }))
        .sort((a, b) => b.score - a.score)
        .filter((entry) => entry.score > 0)
        .slice(0, 6)
        .map((entry) => entry.club);
    }
    const interests = features.getMatchedInterestTags?.() || [];
    const pills = interests.length
      ? `<div class="hm-interest-pills" aria-label="Your selected interests">${interests.map((label) => `<span class="hm-interest-pill">${esc(label)}</span>`).join('')}</div>`
      : '';
    const grid = recs.length
      ? `<div class="lp-clubs-grid">${recs.map(clubCard).join('')}</div>`
      : `<div class="hm-prompt"><p>${esc(cfg(PAGE_CONFIG, 'rec-empty-text', HOME_DASHBOARD_DEFAULTS['rec-empty-text']))}</p><a href="${esc(cfg(PAGE_CONFIG, 'rec-empty-href', '/clubs'))}" class="btn-primary btn-sm">${esc(cfg(PAGE_CONFIG, 'rec-empty-cta', 'Browse clubs'))}</a></div>`;
    root.innerHTML = `${pills}${grid}`;
    wireHomeCardActions(root);
    return;
  }

  if (title) {
    title.textContent = cfg(PAGE_CONFIG, 'section-popular-title', HOME_DASHBOARD_DEFAULTS['section-popular-title']);
  }
  const fallback = [...clubs]
    .sort((a, b) => (b.members || 0) - (a.members || 0))
    .slice(0, 6);
  const promptStrong = cfg(PAGE_CONFIG, 'quiz-prompt-strong', HOME_DASHBOARD_DEFAULTS['quiz-prompt-strong']);
  const promptText = cfg(PAGE_CONFIG, 'quiz-prompt-text', HOME_DASHBOARD_DEFAULTS['quiz-prompt-text']);
  const quizCta = cfg(PAGE_CONFIG, 'quiz-cta-text', HOME_DASHBOARD_DEFAULTS['quiz-cta-text']);
  root.innerHTML = `
    <div class="hm-prompt">
      <p><strong>${esc(promptStrong)}</strong> ${esc(promptText)}</p>
      <button type="button" class="btn-primary btn-sm" id="hm-take-quiz">${esc(quizCta)}</button>
    </div>
    <div class="lp-clubs-grid">${fallback.map(clubCard).join('')}</div>
  `;
  document.getElementById('hm-take-quiz')?.addEventListener('click', () => {
    window.AdobeInterestQuiz?.openInterestPicker?.();
  });
  wireHomeCardActions(root);
}

function renderCalendar() {
  const root = document.getElementById('hm-calendar');
  if (!root) return;
  const features = uf();
  if (!features?.buildMiniCalendarHtml) {
    root.innerHTML = '<div class="hm-cal-card hm-cal-card--loading" aria-busy="true"></div>';
    return;
  }
  const rsvpIds = auth()?.getRsvpedEvents?.() || [];
  const rsvped = mergedEvents()
    .filter((e) => rsvpIds.includes(e.id))
    .filter(isUpcoming);
  const days = features?.getRsvpCalendarDays?.(rsvped) || [];
  const cal = features?.buildMiniCalendarHtml?.(days, 'uf-cal') || '';
  const sortedRsvps = [...rsvped].sort((a, b) => {
    const da = parseEventDate(a);
    const db = parseEventDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });
  const visible = sortedRsvps.slice(0, 3);
  const extraCount = sortedRsvps.length - visible.length;
  const calHref = esc(cfg(PAGE_CONFIG, 'section-calendar-href', '/events?rsvp=mine'));
  const moreTemplate = cfg(PAGE_CONFIG, 'cal-more-template', HOME_DASHBOARD_DEFAULTS['cal-more-template']);

  const rsvpListHtml = visible.length
    ? `<ul class="hm-rsvp-list" role="list">${visible.map((ev) => `
        <li>
          <a class="hm-rsvp-item" href="/event?id=${esc(ev.id)}">
            <span class="hm-rsvp-date">${esc(ev.month)} ${esc(ev.day)}</span>
            <span class="hm-rsvp-title">${esc(ev.title)}</span>
            <span class="hm-rsvp-meta">${esc(ev.club)} · ${esc(ev.time)}</span>
          </a>
        </li>`).join('')}</ul>
        ${extraCount > 0 ? `<p class="hm-rsvp-more"><a href="${calHref}" class="hm-section-link">${esc(fillTemplate(moreTemplate, { count: extraCount, plural: extraCount === 1 ? '' : 's' }))}</a></p>` : ''}`
    : `<div class="hm-rsvp-empty">
        <p>${esc(cfg(PAGE_CONFIG, 'cal-empty-text', HOME_DASHBOARD_DEFAULTS['cal-empty-text']))}</p>
        <a href="${esc(cfg(PAGE_CONFIG, 'cal-empty-href', '/events'))}" class="btn-primary btn-sm">${esc(cfg(PAGE_CONFIG, 'cal-empty-link', HOME_DASHBOARD_DEFAULTS['cal-empty-link']))}</a>
      </div>`;

  root.innerHTML = `
    <div class="hm-cal-layout">
      <div class="hm-cal-card">${cal}</div>
      <aside class="hm-cal-rsvps" aria-label="Your RSVP'd events">
        <h3 class="hm-cal-rsvps-title">${esc(cfg(PAGE_CONFIG, 'cal-rsvps-title', HOME_DASHBOARD_DEFAULTS['cal-rsvps-title']))}</h3>
        ${rsvpListHtml}
      </aside>
    </div>
  `;
}

function renderEvents() {
  const root = document.getElementById('hm-events');
  if (!root) return;
  const upcoming = mergedEvents()
    .filter(isUpcoming)
    .sort((a, b) => {
      const da = parseEventDate(a);
      const db = parseEventDate(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    })
    .slice(0, 6);
  root.innerHTML = upcoming.map(eventCard).join('');
  wireHomeCardActions(root);
}

function syncYourClubsHighlight() {
  const section = document.querySelector('.hm-section[aria-label="Your clubs"]');
  if (!section) return;
  const joinedIds = auth()?.getJoinedClubs?.() || [];
  const isEmpty = joinedIds.length === 0;
  section.classList.toggle('hm-section--dark', isEmpty);
  const title = document.getElementById('hm-clubs-title');
  const link = document.getElementById('hm-clubs-link');
  if (title) {
    title.textContent = isEmpty
      ? cfg(PAGE_CONFIG, 'section-clubs-title-empty', HOME_DASHBOARD_DEFAULTS['section-clubs-title-empty'])
      : cfg(PAGE_CONFIG, 'section-clubs-title', HOME_DASHBOARD_DEFAULTS['section-clubs-title']);
  }
  if (link) link.hidden = isEmpty;
}

function renderYourClubs() {
  const root = document.getElementById('hm-your-clubs');
  if (!root) return;
  const joinedIds = auth()?.getJoinedClubs?.() || [];
  const joined = clubsForDisplay().filter((c) => joinedIds.includes(c.id));
  if (!joined.length) {
    root.innerHTML = `
      <div class="hm-empty">
        <p>${esc(cfg(PAGE_CONFIG, 'clubs-empty-text', HOME_DASHBOARD_DEFAULTS['clubs-empty-text']))}</p>
        <div class="lp-cta-actions">
          <a href="${esc(cfg(PAGE_CONFIG, 'clubs-empty-href', '/clubs'))}" class="btn-primary">${esc(cfg(PAGE_CONFIG, 'clubs-empty-cta', HOME_DASHBOARD_DEFAULTS['clubs-empty-cta']))}</a>
        </div>
      </div>`;
    syncYourClubsHighlight();
    return;
  }
  root.innerHTML = `<div class="lp-clubs-grid">${joined.map(clubCard).join('')}</div>`;
  wireHomeCardActions(root);
  syncYourClubsHighlight();
}

function refreshHomeSections() {
  renderRecommended();
  renderCalendar();
  renderEvents();
  renderYourClubs();
}

async function reloadPublishedHomeData() {
  try {
    const data = await loadData();
    BASE_CLUBS = data.clubs || [];
    EVENTS = data.events || [];
    initEventModal();
    refreshHomeSections();
    window.__adobeClubEventsForTiming = () => mergedEvents();
    uf()?.resetEventTimingSnapshot?.(mergedEvents());
  } catch {
    /* ignore */
  }
}

function buildDashboardShell(block) {
  const recLabel = cfg(PAGE_CONFIG, 'section-recommended-label', HOME_DASHBOARD_DEFAULTS['section-recommended-label']);
  const recTitle = cfg(PAGE_CONFIG, 'section-recommended-title', HOME_DASHBOARD_DEFAULTS['section-recommended-title']);
  const recLink = cfg(PAGE_CONFIG, 'section-recommended-link', HOME_DASHBOARD_DEFAULTS['section-recommended-link']);
  const recHref = cfg(PAGE_CONFIG, 'section-recommended-href', '/clubs');
  const calLabel = cfg(PAGE_CONFIG, 'section-calendar-label', HOME_DASHBOARD_DEFAULTS['section-calendar-label']);
  const calLink = cfg(PAGE_CONFIG, 'section-calendar-link', HOME_DASHBOARD_DEFAULTS['section-calendar-link']);
  const calHref = cfg(PAGE_CONFIG, 'section-calendar-href', '/events?rsvp=mine');
  const evTitle = cfg(PAGE_CONFIG, 'section-events-title', HOME_DASHBOARD_DEFAULTS['section-events-title']);
  const evLink = cfg(PAGE_CONFIG, 'section-events-link', HOME_DASHBOARD_DEFAULTS['section-events-link']);
  const evHref = cfg(PAGE_CONFIG, 'section-events-href', '/events');
  const clubsLabel = cfg(PAGE_CONFIG, 'section-clubs-label', HOME_DASHBOARD_DEFAULTS['section-clubs-label']);
  const clubsTitle = cfg(PAGE_CONFIG, 'section-clubs-title', HOME_DASHBOARD_DEFAULTS['section-clubs-title']);
  const clubsLink = cfg(PAGE_CONFIG, 'section-clubs-link', HOME_DASHBOARD_DEFAULTS['section-clubs-link']);
  const clubsHref = cfg(PAGE_CONFIG, 'section-clubs-href', '/clubs');

  block.innerHTML = `
    <div class="hm-dashboard" id="hm-dashboard">
      <section class="hm-section" aria-label="${esc(recLabel)}">
        <div class="hm-section-head">
          <h2 id="hm-rec-title">${esc(recTitle)}</h2>
          <a href="${esc(recHref)}" class="hm-section-link">${esc(recLink)}</a>
        </div>
        <div id="hm-recommended"></div>
      </section>
      <section class="hm-section" aria-label="${esc(calLabel)}">
        <div class="hm-section-head">
          <h2>${esc(calLabel)}</h2>
          <a href="${esc(calHref)}" class="hm-section-link">${esc(calLink)}</a>
        </div>
        <div id="hm-calendar"></div>
      </section>
      <section class="hm-section" aria-label="${esc(evTitle)}">
        <div class="hm-section-head">
          <h2>${esc(evTitle)}</h2>
          <a href="${esc(evHref)}" class="hm-section-link">${esc(evLink)}</a>
        </div>
        <div class="lp-events-grid" id="hm-events"></div>
      </section>
      <section class="hm-section" aria-label="${esc(clubsLabel)}">
        <div class="hm-section-head">
          <h2 id="hm-clubs-title">${esc(clubsTitle)}</h2>
          <a href="${esc(clubsHref)}" class="hm-section-link" id="hm-clubs-link">${esc(clubsLink)}</a>
        </div>
        <div id="hm-your-clubs"></div>
      </section>
    </div>
  `;
}

async function loadHomeDependencies() {
  if (depsLoaded) return;
  const base = codeBase();
  const criticalScripts = [
    `${base}/scripts/club-meta.js`,
    `${base}/scripts/user-features.js`,
    `${base}/scripts/event-seats.js`,
    `${base}/scripts/event-modal.js`,
    `${base}/scripts/join-modal.js`,
  ];
  const deferredScripts = [
    `${base}/scripts/club-request-prompt.js`,
    `${base}/scripts/interest-quiz.js`,
  ];
  const styles = [
    `${base}/styles/user-features.css`,
    `${base}/styles/join-modal.css`,
    `${base}/styles/event-modal.css`,
  ];
  await Promise.all([
    ...styles.map((href) => loadCSS(href)),
    ...criticalScripts.map((src) => loadScript(src)),
  ]);
  const loadDeferred = () => {
    deferredScripts.forEach((src) => {
      loadScript(src).catch(() => {});
    });
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadDeferred, { timeout: 2500 });
  } else {
    window.setTimeout(loadDeferred, 0);
  }
  depsLoaded = true;
}

function bindHomeEvents() {
  if (window.__homeDashboardBound) return;
  window.__homeDashboardBound = true;

  window.addEventListener('adobe-interests-updated', renderRecommended);
  window.addEventListener('adobe-quiz-closed', renderRecommended);
  window.addEventListener('adobe-club-members-changed', () => {
    refreshMemberCountsOnCards();
    renderRecommended();
    renderYourClubs();
    syncYourClubsHighlight();
  });
  window.addEventListener('adobe-rsvp-changed', () => {
    renderCalendar();
    document.querySelectorAll('.ev-poster-rsvp[data-event-id]').forEach((btn) => {
      const eventId = btn.getAttribute('data-event-id');
      const ev = mergedEvents().find((e) => e.id === eventId);
      if (ev) window.AdobeEventModal?.applyActionState?.(btn, ev);
    });
  });
  window.addEventListener('adobe-event-timing-changed', refreshHomeSections);
  window.addEventListener('pageshow', () => {
    renderCalendar();
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderCalendar();
  });
  window.addEventListener('storage', (e) => {
    if (e.key?.includes('adobeClubsRsvpedEvents')) renderCalendar();
  });
}

async function initDashboard() {
  syncYourClubsHighlight();
  await reloadPublishedHomeData();
  auth()?.onPublishedContentChange?.(reloadPublishedHomeData);
}

export default async function decorate(block) {
  if (!auth()?.isAuthenticated?.()) return;

  if (auth()?.isAnyAdmin?.()) {
    const dedicatedAdminBlock = document.querySelector('main .admin-dashboard.block');
    if (dedicatedAdminBlock && dedicatedAdminBlock !== block) {
      block.innerHTML = '';
      block.closest('.section')?.style.setProperty('display', 'none');
      return;
    }
    const base = codeBase();
    await loadCSS(`${base}/blocks/admin-dashboard/admin-dashboard.css`);
    const { default: decorateAdmin } = await import('../admin-dashboard/admin-dashboard.js');
    await decorateAdmin(block);
    return;
  }

  PAGE_CONFIG = readPageConfig(block, HOME_DASHBOARD_DEFAULTS);
  window.__homePageConfig = { ...(window.__homePageConfig || {}), dashboard: PAGE_CONFIG };

  block.innerHTML = '';
  block.classList.add('home-dashboard');
  document.body.classList.add('user-home');

  buildDashboardShell(block);

  const section = block.closest('.section');
  if (section) {
    section.style.display = null;
    section.dataset.sectionStatus = 'loaded';
  }

  try {
    await loadHomeDependencies();
    await initDashboard();
    const showQuiz = () => window.AdobeInterestQuiz?.maybeShowFirstSignupPicker?.();
    if ('requestIdleCallback' in window) {
      requestIdleCallback(showQuiz, { timeout: 3000 });
    } else {
      window.setTimeout(showQuiz, 500);
    }
    bindHomeEvents();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('home-dashboard: init failed', err);
  }
}
