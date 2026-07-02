/**
 * Home Dashboard — logged-in member home (OG home.html).
 * da.live: | Home Dashboard | (empty row)
 */
import { loadCSS, loadScript } from '../../scripts/aem.js';

const DATA_PATH = '/data/data.json';
const CLUB_IMG = '/assets/images/clubs/';
const EVENT_IMG = '/assets/images/events/';
const EVENT_FALLBACK = `${EVENT_IMG}evt-hero1.avif`;
const MONTHS = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

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
  return ev?.id ? `${EVENT_IMG}${ev.id}.avif` : EVENT_FALLBACK;
}

function clubsForDisplay() {
  return auth()?.enrichClubs?.(BASE_CLUBS) || BASE_CLUBS;
}

function mergedEvents() {
  return auth()?.mergePublishedEvents?.(EVENTS) || EVENTS;
}

async function loadData() {
  const res = await fetch(DATA_PATH);
  if (!res.ok) throw new Error('Could not load data.json');
  return res.json();
}

function formatClubMemberLabel(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return '';
  return `${n} member${n === 1 ? '' : 's'}`;
}

function clubJoinLabel(clubId) {
  return auth()?.isClubJoined?.(clubId) ? 'Joined' : 'Join';
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

function renderGreeting() {
  const user = auth()?.getCurrentUser?.();
  const name = user?.displayName || user?.username || 'there';
  const greeting = document.getElementById('hm-greeting');
  if (greeting) greeting.textContent = `Welcome back, ${name}`;
}

function renderRecommended() {
  const root = document.getElementById('hm-recommended');
  const title = document.getElementById('hm-rec-title');
  if (!root) return;

  const clubs = clubsForDisplay();
  const features = uf();
  const completed = features?.hasCompletedQuiz?.();

  if (completed) {
    if (title) title.textContent = 'Recommended for you';
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
      : `<div class="hm-prompt"><p>We saved your interests. Browse clubs to find communities that fit you.</p><a href="/clubs" class="btn-primary btn-sm">Browse clubs</a></div>`;
    root.innerHTML = `${pills}${grid}`;
    wireHomeCardActions(root);
    return;
  }

  if (title) title.textContent = 'Popular clubs';
  const fallback = [...clubs]
    .sort((a, b) => (b.members || 0) - (a.members || 0))
    .slice(0, 6);
  root.innerHTML = `
    <div class="hm-prompt">
      <p><strong>Get picks made for you.</strong> Tell us what you're into and we'll match clubs to your interests.</p>
      <button type="button" class="btn-primary btn-sm" id="hm-take-quiz">Take the 1-minute quiz</button>
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
  const rsvpIds = auth()?.getRsvpedEvents?.() || [];
  const rsvped = mergedEvents().filter((e) => rsvpIds.includes(e.id));
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

  const rsvpListHtml = visible.length
    ? `<ul class="hm-rsvp-list" role="list">${visible.map((ev) => `
        <li>
          <a class="hm-rsvp-item" href="/event?id=${esc(ev.id)}">
            <span class="hm-rsvp-date">${esc(ev.month)} ${esc(ev.day)}</span>
            <span class="hm-rsvp-title">${esc(ev.title)}</span>
            <span class="hm-rsvp-meta">${esc(ev.club)} · ${esc(ev.time)}</span>
          </a>
        </li>`).join('')}</ul>
        ${extraCount > 0 ? `<p class="hm-rsvp-more"><a href="/events?rsvp=mine" class="hm-section-link">${extraCount} more RSVP'd event${extraCount === 1 ? '' : 's'} →</a></p>` : ''}`
    : `<div class="hm-rsvp-empty">
        <p>No RSVP'd events yet.</p>
        <a href="/events" class="hm-section-link">Browse events →</a>
      </div>`;

  root.innerHTML = `
    <div class="hm-cal-layout">
      <div class="hm-cal-card">${cal}</div>
      <aside class="hm-cal-rsvps" aria-label="Your RSVP'd events">
        <h3 class="hm-cal-rsvps-title">RSVP'd events</h3>
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
  if (title) title.textContent = isEmpty ? 'Find your first club' : 'Your clubs';
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
        <p>Browse what's available and join one that fits you</p>
        <div class="lp-cta-actions">
          <a href="/clubs" class="btn-primary">Explore clubs</a>
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

function buildDashboardShell(main) {
  main.innerHTML = `
    <div class="hm-dashboard" id="hm-dashboard">
      <div class="hm-header">
        <div class="hm-welcome-row">
          <h1 class="hm-title" id="hm-greeting">Welcome back</h1>
        </div>
      </div>
      <section class="hm-section" aria-label="Recommended for you">
        <div class="hm-section-head">
          <h2 id="hm-rec-title">Recommended for you</h2>
          <a href="/clubs" class="hm-section-link">Browse all clubs →</a>
        </div>
        <div id="hm-recommended"></div>
      </section>
      <section class="hm-section" aria-label="Your calendar">
        <div class="hm-section-head">
          <h2>Your calendar</h2>
          <a href="/events?rsvp=mine" class="hm-section-link">View RSVP'd events →</a>
        </div>
        <div id="hm-calendar"></div>
      </section>
      <section class="hm-section" aria-label="Upcoming events">
        <div class="hm-section-head">
          <h2>Upcoming events</h2>
          <a href="/events" class="hm-section-link">See all events →</a>
        </div>
        <div class="lp-events-grid" id="hm-events"></div>
      </section>
      <section class="hm-section" aria-label="Your clubs">
        <div class="hm-section-head">
          <h2 id="hm-clubs-title">Your clubs</h2>
          <a href="/clubs" class="hm-section-link" id="hm-clubs-link">Find more →</a>
        </div>
        <div id="hm-your-clubs"></div>
      </section>
    </div>
  `;
}

async function loadHomeDependencies() {
  if (depsLoaded) return;
  const base = codeBase();
  const scripts = [
    `${base}/scripts/club-meta.js`,
    `${base}/scripts/user-features.js`,
    `${base}/scripts/club-request-prompt.js`,
    `${base}/scripts/join-modal.js`,
    `${base}/scripts/interest-quiz.js`,
    `${base}/scripts/event-seats.js`,
    `${base}/scripts/event-modal.js`,
  ];
  const styles = [
    `${base}/styles/user-features.css`,
    `${base}/styles/join-modal.css`,
    `${base}/styles/event-modal.css`,
  ];
  await Promise.all(styles.map((href) => loadCSS(href)));
  // Load scripts sequentially so one failure does not block the dashboard shell.
  await scripts.reduce(async (chain, src) => {
    await chain;
    try {
      await loadScript(src);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`home-dashboard: failed to load ${src}`, err);
    }
  }, Promise.resolve());
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
  renderGreeting();
  await reloadPublishedHomeData();
  auth()?.onPublishedContentChange?.(reloadPublishedHomeData);
}

export default async function decorate(block) {
  if (!auth()?.isAuthenticated?.()) return;

  const main = block.closest('main');
  if (!main) return;

  const section = block.closest('.section');
  if (section) {
    section.style.display = null;
    section.dataset.sectionStatus = 'loaded';
  }

  document.body.classList.add('user-home');
  buildDashboardShell(main);

  try {
    await loadHomeDependencies();
    window.AdobeInterestQuiz?.maybeShowFirstSignupPicker?.();
    bindHomeEvents();
    await initDashboard();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('home-dashboard: init failed', err);
  }
}
