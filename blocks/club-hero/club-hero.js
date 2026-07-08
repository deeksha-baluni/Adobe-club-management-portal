/**
 * Club Hero — club detail page hero.
 * da.live: key | value config rows (no type field required).
 */
import {
  esc,
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
import { readPageConfig, cfg, fillTemplate } from '../../scripts/lib/block-config.js';

const CLUB_DEFAULTS = {
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

export default async function decorate(block) {
  const config = { ...CLUB_DEFAULTS, ...readPageConfig(block, {}) };

  block.innerHTML = '';
  block.classList.add('club-hero');

  let ctx;
  try {
    ctx = await initClubPage();
  } catch (err) {
    console.error('[club-hero]', err);
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
    <div class="ch-inner">
      <a class="ch-back" href="${esc(backHref)}">${esc(cfg(config, 'back-label', CLUB_DEFAULTS['back-label']))}</a>
      <div class="ch-grid">
        <div class="ch-copy">
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
        <div class="ch-photo">
          <img src="${esc(heroSrc)}" alt="${esc(club.name)}" width="640" height="480" loading="eager" fetchpriority="high" decoding="async">
          ${similarOverlay(allClubs, club, detailBase)}
        </div>
      </div>
    </div>`;

  bindClubJoinSync(club);
  wireClubJoinButton(block.querySelector('[data-club-join]'), club);
}
