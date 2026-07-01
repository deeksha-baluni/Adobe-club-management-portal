/**
 * Shared utilities for club detail page blocks.
 */

let dataCache = null;
let dataPending = null;
let clubPageInit = null;
let clubCtxCache = null;

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getAuth() {
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
    mergePublishedEvents: null,
    getAllCustomEvents: null,
    getEventRecap: null,
    onPublishedContentChange: null,
  };
}

export function getClubIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  if (idParam) return idParam;
  const match = window.location.pathname.match(/\/clubs\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function getClubData() {
  if (dataCache) return dataCache;
  if (!dataPending) {
    const urls = ['/data/data.json', `${window.location.origin}/data/data.json`];
    dataPending = (async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) return res.json();
        } catch (_) { /* try next */ }
      }
      throw new Error('Could not load /data/data.json');
    })();
  }
  dataCache = await dataPending;
  return dataCache;
}

export function loadScript(src) {
  return new Promise((resolve) => {
    if ([...document.scripts].some((s) => s.src.includes(src))) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.append(script);
  });
}

export async function loadClubScripts() {
  await Promise.all([
    loadScript('/scripts/club-meta.js'),
    loadScript('/scripts/auth-guard.js'),
  ]);
}

function buildClubContext(data, clubId) {
  if (!clubId) return { error: 'missing-id' };
  const club = (data.clubs || []).find((c) => c.id === clubId);
  if (!club) return { error: 'not-found', clubId };
  const events = getAuth().mergePublishedEvents?.(data.events || [])
    || [...(getAuth().getAllCustomEvents?.() || []), ...(data.events || [])];
  return {
    club,
    clubId,
    data,
    events,
    gallery: data.gallery || [],
    allClubs: data.clubs || [],
  };
}

/** Start fetching club data as early as possible (call from loadEager on club pages). */
export function prefetchClubData() {
  if (!document.querySelector('link[data-club-data-preload]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = '/data/data.json';
    link.crossOrigin = 'anonymous';
    link.dataset.clubDataPreload = '1';
    document.head.append(link);
  }
  return getClubData();
}

/** Single shared init: fetch data in parallel with auth scripts. */
export async function initClubPage() {
  if (clubPageInit) return clubPageInit;
  clubPageInit = (async () => {
    const dataPromise = prefetchClubData();
    await loadClubScripts();
    const data = await dataPromise;
    const ctx = buildClubContext(data, getClubIdFromUrl());
    clubCtxCache = ctx;
    return ctx;
  })();
  return clubPageInit;
}

export function getClubContext() {
  return clubCtxCache;
}

export async function resolveClubContext() {
  return initClubPage();
}

export function preloadHeroImage(src) {
  if (!src || document.querySelector(`link[data-club-hero-preload="${src}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  link.dataset.clubHeroPreload = src;
  document.head.append(link);
}

export function getJoinLabel(club) {
  const auth = getAuth();
  const isAdmin = auth.getAdminOf().includes(club.id);
  const joined = auth.isClubJoined(club.id);
  if (isAdmin) return 'Admin only';
  return joined ? 'Joined' : 'Join';
}

export function wireClubJoinButton(btn, club) {
  if (!btn || getAuth().getAdminOf().includes(club.id)) return;
  btn.addEventListener('click', () => {
    const auth = getAuth();
    if (!auth.isAuthenticated()) {
      window.location.href = auth.loginUrlWithNext?.()
        || `/login?next=${encodeURIComponent(window.location.href)}`;
      return;
    }
    const joined = window.AdobeJoinModal?.toggleClubJoinWithModal?.(club, { events: window.__clubPageEvents })
      ?? auth.toggleClubJoin(club.id);
    syncClubJoinUI(club, joined);
  });
}

export function syncClubJoinUI(club, joined) {
  const label = joined ? 'Joined' : 'Join';
  const isAdmin = getAuth().getAdminOf().includes(club.id);
  document.querySelectorAll('[data-club-join]').forEach((el) => {
    el.classList.toggle('is-joined', joined);
    const suffix = el.dataset.joinSuffix || '';
    if (el.classList.contains('ch-join-btn')) {
      el.textContent = joined ? 'Joined' : (isAdmin ? 'Admin only' : 'Join');
    } else {
      el.textContent = suffix ? `${label} ${suffix}` : label;
    }
  });
  window.dispatchEvent(new CustomEvent('adobe-club-join-changed', {
    detail: { clubId: club.id, joined },
  }));
}

export function bindClubJoinSync(club) {
  if (window.__clubJoinSyncBound) return;
  window.__clubJoinSyncBound = true;
  window.addEventListener('adobe-club-join-changed', (e) => {
    if (e.detail?.clubId !== club.id) return;
    if (typeof window.__clubEventsRefresh === 'function') {
      window.__clubEventsRefresh();
    }
  });
}

export function getMeta(clubId) {
  const meta = window.AdobeClubMeta || {};
  return {
    activities: meta.activities?.[clubId] || [],
    headline: meta.heroHeadline?.[clubId] || { line1: 'Find your people', line2: 'Join your club' },
  };
}

export function getActivityDesc(clubId, name, club) {
  const details = window.AdobeClubMeta?.activityDetails?.[clubId];
  if (details?.[name]) return details[name];
  return `Casual sessions exploring ${name.toLowerCase()} with fellow ${club.name} members.`;
}

const MONTH_INDEX = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

export function clubMatchesEvent(club, ev) {
  if (ev.clubId && ev.clubId === club.id) return true;
  const evClub = String(ev.club || '').toLowerCase().trim();
  const clubName = String(club.name || '').toLowerCase().trim();
  const clubIdStr = String(club.id || '').replace(/-/g, ' ').toLowerCase();
  return evClub === clubName || evClub === clubIdStr || evClub === `${clubName} club`;
}

export function getAllClubEvents(club, allEvents) {
  return (allEvents || []).filter((ev) => clubMatchesEvent(club, ev));
}

export function parseEventDate(ev) {
  if (!ev?.month || !ev?.day || ev.day === '—') return null;
  const month = MONTH_INDEX[String(ev.month).toUpperCase()];
  const day = parseInt(ev.day, 10);
  if (month == null || Number.isNaN(day)) return null;
  return new Date(new Date().getFullYear(), month, day);
}

export function isEventPast(ev) {
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

export function getPastClubEvents(club, allEvents) {
  return getAllClubEvents(club, allEvents).filter(isEventPast);
}

export function getUpcomingClubEvents(club, allEvents) {
  return getAllClubEvents(club, allEvents).filter((ev) => !isEventPast(ev));
}

export function formatEventDate(ev) {
  if (!ev?.month || !ev?.day || ev.day === '—') return 'Date TBD';
  return `${ev.month} ${ev.day}`;
}

export function canPostRecapForClub(clubId) {
  const auth = getAuth();
  if (auth.isAdmin?.()) return true;
  return auth.getAdminOf?.().includes(clubId);
}

export const IMAGE_BASES = {
  clubs: '/assets/images/clubs/',
  events: '/assets/images/events/',
  index: '/assets/images/index/',
};

export function getClubImageSrc(club) {
  const file = club?.image || `${club?.id || 'clubs-hero1'}.avif`;
  return `${IMAGE_BASES.clubs}${file}`;
}

export function getEventImageSrc(ev) {
  if (ev?.imagePath) {
    const [baseKey, ...rest] = String(ev.imagePath).split('/');
    const file = rest.join('/');
    if (IMAGE_BASES[baseKey] && file) return `${IMAGE_BASES[baseKey]}${file}`;
  }
  if (ev?.id) return `${IMAGE_BASES.events}${ev.id}.avif`;
  return '';
}

export function getClubHeroImageSrc(club) {
  if (club?.heroImage) return club.heroImage;
  const illustration = window.AdobeClubMeta?.heroIllustrations?.[club?.id];
  if (illustration) return illustration;
  return getClubImageSrc(club);
}

function clubMatchesGalleryItem(club, item) {
  const galClub = (item?.club || '').toLowerCase();
  const name = (club?.name || '').toLowerCase();
  const idPhrase = (club?.id || '').replace(/-/g, ' ').toLowerCase();
  const keyword = name.split(' ')[0];
  return galClub.includes(keyword)
    || name.includes(galClub.split(' ')[0])
    || galClub.includes(idPhrase)
    || idPhrase.includes(galClub.split(' ')[0]);
}

export function getClubImagePool(club, gallery) {
  const pool = [getClubHeroImageSrc(club)];
  (gallery || []).filter((item) => clubMatchesGalleryItem(club, item)).forEach((item) => {
    const base = IMAGE_BASES[item?.base] || IMAGE_BASES.clubs;
    pool.push(`${base}${item.image}`);
  });
  return [...new Set(pool.filter(Boolean))];
}

export function pickClubImage(pool, index, club) {
  if (pool.length) return pool[index % pool.length];
  return getClubImageSrc(club);
}

export function getSimilarClubs(allClubs, club) {
  const myTag = String(club?.tag || '').toLowerCase();
  if (!myTag) return [];
  return (allClubs || [])
    .filter((c) => c.id !== club.id && String(c.tag || '').toLowerCase() === myTag)
    .slice(0, 3);
}

export const SLACK_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.04 15.17a1.85 1.85 0 1 1-1.85-1.85h1.85v1.85Zm.93 0a1.85 1.85 0 0 1 3.7 0v4.63a1.85 1.85 0 1 1-3.7 0v-4.63Zm1.85-7.43a1.85 1.85 0 1 1 1.85-1.85v1.85h-1.85Zm0 .93a1.85 1.85 0 0 1 0 3.7H7.19a1.85 1.85 0 1 1 0-3.7h4.63Zm7.42 1.85a1.85 1.85 0 1 1 1.85 1.85h-1.85V10.5Zm-.93 0a1.85 1.85 0 0 1-3.7 0V5.87a1.85 1.85 0 1 1 3.7 0v4.63Zm-1.85 7.42a1.85 1.85 0 1 1-1.85 1.85v-1.85h1.85Zm0-.92a1.85 1.85 0 0 1 0-3.7h4.63a1.85 1.85 0 1 1 0 3.7h-4.63Z"/></svg>';

export function slackLinkHtml(club) {
  if (!club?.slackUrl && !club?.slackChannel) return '';
  const url = club.slackUrl || '#';
  const channel = club.slackChannel || '';
  return `<a class="slack-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${SLACK_ICON_SVG}Discuss on Slack${channel ? ` <span class="slack-channel">${esc(channel)}</span>` : ''}</a>`;
}
