/**
 * Detail Hero — unified club + event detail page hero.
 * da.live: preset | club | event  (+ preset-specific config rows)
 */
import {
  esc as escClub,
  getAuth,
  initClubPage,
  wireClubJoinButton,
  bindClubJoinSync,
  getJoinLabel,
  getClubImageSrc,
  getClubHeroImageSrc,
  getSimilarClubs,
  slackLinkHtml,
  preloadHeroImage,
} from '../../scripts/club/club-page.js';
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
} from '../../scripts/event/event-page.js';
import { readPageConfig, cfg, fillTemplate } from '../../scripts/lib/block-config.js';
import { resolveCompressedStockUrl } from '../../scripts/lib/event-images.js';

const esc = escClub;

const CLUB_DEFAULTS = {
  preset: 'club',
  'back-label': '← All clubs',
  'back-href': '/clubs',
  'detail-base': '/club',
  'desc-suffix': 'Connect with colleagues, explore nearby events, and build your {tag} community — all in one place.',
  'join-label': 'Join',
  'joined-label': 'Joined',
  'admin-only-label': 'Admin only',
  'not-found-text': 'Club not found.',
  'not-found-link': '← Back to clubs',
  'not-found-href': '/clubs',
};

const EVENT_DEFAULTS = {
  preset: 'event',
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

function normalizePath(path) {
  const raw = (path || '/').replace(/\.html$/, '') || '/';
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function resolvePreset(block, config) {
  const fromDataset = block.dataset.detailHeroPreset?.toLowerCase();
  if (fromDataset === 'club' || fromDataset === 'event') return fromDataset;

  const explicit = cfg(config, 'preset', '').toLowerCase();
  if (explicit === 'club' || explicit === 'event') return explicit;

  const path = normalizePath(window.location.pathname);
  if (path === '/event') return 'event';
  if (path === '/club') return 'club';

  if (block.classList.contains('detail-hero--event')) {
    return 'event';
  }
  return 'club';
}

function applyDetailHeroClasses(block, preset) {
  block.classList.add('detail-hero', `detail-hero--${preset}`);
}

function getHeroHeadline(clubId) {
  const m = window.AdobeClubMeta?.heroHeadline?.[clubId];
  return m || { line1: 'Find your people', line2: 'Join your club' };
}

function memberCountHtml(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return '';
  const label = `${n} member${n === 1 ? '' : 's'}`;
  return `<p class="ch-members"><span class="ch-members-dot" aria-hidden="true">·</span>
    <svg class="ch-members-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg><span>${esc(label)}</span></p>`;
}

function similarOverlay(allClubs, club, detailBase) {
  const similar = getSimilarClubs(allClubs, club);
  if (!similar.length) return '';
  const base = detailBase.replace(/\/$/, '');
  return `
    <div class="ch-similar">
      <p class="ch-similar-label">Similar clubs</p>
      ${similar.map((c) => `
        <a class="ch-similar-item" href="${base}?id=${esc(c.id)}">
          <img src="${esc(getClubImageSrc(c))}" alt="" loading="lazy" width="28" height="28">
          <span>${esc(c.name)}</span>
        </a>`).join('')}
    </div>`;
}

function joinButtonLabel(club, config) {
  const joinLabel = getJoinLabel(club);
  if (joinLabel === 'Admin only') return cfg(config, 'admin-only-label', CLUB_DEFAULTS['admin-only-label']);
  if (joinLabel === 'Joined') return cfg(config, 'joined-label', CLUB_DEFAULTS['joined-label']);
  return cfg(config, 'join-label', CLUB_DEFAULTS['join-label']);
}

function renderClubNotFound(block, config) {
  const text = cfg(config, 'not-found-text', CLUB_DEFAULTS['not-found-text']);
  const linkText = cfg(config, 'not-found-link', CLUB_DEFAULTS['not-found-link']);
  const href = cfg(config, 'not-found-href', CLUB_DEFAULTS['not-found-href']);
  block.innerHTML = `
    <div class="ch-inner">
      <p class="ch-not-found">${esc(text)} <a href="${esc(href)}">${esc(linkText)}</a></p>
    </div>`;
}

function renderEventNotFound(block, config) {
  block.innerHTML = `
    <div class="event-page-error">
      <h1>${esc(cfg(config, 'not-found-title', EVENT_DEFAULTS['not-found-title']))}</h1>
      <p>${esc(cfg(config, 'not-found-text', EVENT_DEFAULTS['not-found-text']))}</p>
      <a class="event-page-error-link" href="${esc(cfg(config, 'not-found-href', EVENT_DEFAULTS['not-found-href']))}">${esc(cfg(config, 'not-found-link', EVENT_DEFAULTS['not-found-link']))}</a>
    </div>`;
  document.title = `${cfg(config, 'not-found-title', EVENT_DEFAULTS['not-found-title'])} — Adobe Clubs`;
}

async function decorateClubHero(block, config) {
  let ctx;
  try {
    ctx = await initClubPage();
  } catch (err) {
    console.error('[detail-hero/club]', err);
    renderClubNotFound(block, config);
    return;
  }

  if (ctx.error) {
    renderClubNotFound(block, config);
    return;
  }

  const { club, allClubs } = ctx;
  const isAdmin = getAuth().getAdminOf().includes(club.id);
  const joined = getAuth().isClubJoined(club.id);
  const headline = getHeroHeadline(club.id);
  const memberCount = window.AdobeClubsAuth?.getClubMemberCount?.(club.id, club.members) ?? club.members;
  const heroSrc = getClubHeroImageSrc(club);
  preloadHeroImage(heroSrc);

  const backHref = cfg(config, 'back-href', CLUB_DEFAULTS['back-href']);
  const detailBase = cfg(config, 'detail-base', CLUB_DEFAULTS['detail-base']).replace(/\/$/, '');
  const descSuffix = fillTemplate(
    cfg(config, 'desc-suffix', CLUB_DEFAULTS['desc-suffix']),
    { tag: (club.tag || '').toLowerCase() },
  );
  const btnLabel = joinButtonLabel(club, config);

  document.title = `${club.name} — Adobe Clubs`;

  window.AdobeBreadcrumbs?.set([
    { label: 'Home', href: window.AdobeBreadcrumbs?.getHomeHref?.() || '/' },
    { label: 'Clubs', href: '/clubs' },
    { label: club.name, current: true },
  ]);

  block.innerHTML = `
    <div class="dh-inner ch-inner">
      <a class="dh-back ch-back" href="${esc(backHref)}">${esc(cfg(config, 'back-label', CLUB_DEFAULTS['back-label']))}</a>
      <div class="dh-grid dh-grid--club ch-grid">
        <div class="dh-main ch-copy">
          <div class="ch-eyebrow">
            <p class="ch-tag">${esc(club.tag)} · ${esc(club.name)}</p>
            ${memberCountHtml(memberCount)}
          </div>
          <h1 class="ch-title">${esc(headline.line1)}<br>${esc(headline.line2)}.</h1>
          <p class="ch-desc">${esc(club.desc)} ${esc(descSuffix)}</p>
          <div class="ch-actions">
            <button type="button" class="btn-primary ch-join-btn${joined ? ' is-joined' : ''}" data-club-join${isAdmin ? ' disabled' : ''}>${esc(btnLabel)}</button>
            ${slackLinkHtml(club)}
          </div>
        </div>
        <div class="dh-aside ch-photo">
          <img src="${esc(heroSrc)}" alt="${esc(club.name)}" width="640" height="480" loading="eager" fetchpriority="high" decoding="async">
          ${similarOverlay(allClubs, club, detailBase)}
        </div>
      </div>
    </div>`;

  bindClubJoinSync(club);
  wireClubJoinButton(block.querySelector('[data-club-join]'), club);
}

async function decorateEventHero(block, config) {
  document.documentElement.classList.add('event-detail-route');
  document.body.classList.add('event-detail-page');
  document.querySelector('main')?.classList.add('event-detail-page');

  let ctx;
  try {
    ctx = await getEventPageContext();
  } catch (err) {
    console.error('[detail-hero/event]', err);
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
    <div class="dh-inner ev-inner">
      <a class="dh-back ev-back" href="${esc(backHref)}">${esc(cfg(config, 'back-label', EVENT_DEFAULTS['back-label']))}</a>
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
    console.error('[detail-hero/event] scripts', err);
  });

  document.dispatchEvent(new CustomEvent('detail-hero-ready', { detail: { preset: 'event' } }));
}

export default async function decorate(block) {
  const rawConfig = readPageConfig(block, {});
  const preset = resolvePreset(block, rawConfig);
  const defaults = preset === 'event' ? EVENT_DEFAULTS : CLUB_DEFAULTS;
  const config = { ...defaults, ...rawConfig };

  block.innerHTML = '';
  applyDetailHeroClasses(block, preset);

  if (preset === 'event') {
    await decorateEventHero(block, config);
    return;
  }

  await decorateClubHero(block, config);
}
