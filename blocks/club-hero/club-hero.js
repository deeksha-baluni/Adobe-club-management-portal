/**
 * Club Hero block
 */

import {
  esc,
  getAuth,
  loadClubScripts,
  resolveClubContext,
  wireClubJoinButton,
  bindClubJoinSync,
  getJoinLabel,
  getClubImageSrc,
  getClubHeroImageSrc,
  getSimilarClubs,
  slackLinkHtml,
} from '../club-shared/club-page.js';

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

function similarOverlay(allClubs, club) {
  const similar = getSimilarClubs(allClubs, club);
  if (!similar.length) return '';
  return `
    <div class="ch-similar">
      <p class="ch-similar-label">Similar clubs</p>
      ${similar.map((c) => `
        <a class="ch-similar-item" href="/club?id=${esc(c.id)}">
          <img src="${esc(getClubImageSrc(c))}" alt="" loading="lazy" width="28" height="28">
          <span>${esc(c.name)}</span>
        </a>`).join('')}
    </div>`;
}

function renderNotFound(block) {
  block.innerHTML = `
    <div class="ch-inner">
      <p class="ch-not-found">Club not found. <a href="/clubs">← Back to clubs</a></p>
    </div>`;
}

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('club-hero');
  await loadClubScripts();

  let ctx;
  try {
    ctx = await resolveClubContext();
  } catch (err) {
    console.error('[club-hero]', err);
    renderNotFound(block);
    return;
  }

  if (ctx.error) {
    renderNotFound(block);
    return;
  }

  const { club, allClubs } = ctx;
  const joinLabel = getJoinLabel(club);
  const isAdmin = joinLabel === 'Admin only';
  const joined = getAuth().isClubJoined(club.id);
  const headline = getHeroHeadline(club.id);
  const memberCount = window.AdobeClubsAuth?.getClubMemberCount?.(club.id, club.members) ?? club.members;
  const heroSrc = getClubHeroImageSrc(club);

  document.title = `${club.name} — Adobe Clubs`;

  block.innerHTML = `
    <div class="ch-inner">
      <a class="ch-back" href="/clubs">← All clubs</a>
      <div class="ch-grid">
        <div class="ch-copy">
          <div class="ch-eyebrow">
            <p class="ch-tag">${esc(club.tag)} · ${esc(club.name)}</p>
            ${memberCountHtml(memberCount)}
          </div>
          <h1 class="ch-title">${esc(headline.line1)}<br>${esc(headline.line2)}.</h1>
          <p class="ch-desc">${esc(club.desc)} Connect with colleagues, explore nearby events, and build your ${esc(club.tag.toLowerCase())} community — all in one place.</p>
          <div class="ch-actions">
            <button type="button" class="btn-primary ch-join-btn${joined ? ' is-joined' : ''}" data-club-join${isAdmin ? ' disabled' : ''}>${esc(joined ? 'Joined' : isAdmin ? 'Admin only' : 'Join')}</button>
            ${slackLinkHtml(club)}
          </div>
        </div>
        <div class="ch-photo">
          <img src="${esc(heroSrc)}" alt="${esc(club.name)}" loading="eager" decoding="async">
          ${similarOverlay(allClubs, club)}
        </div>
      </div>
    </div>`;

  bindClubJoinSync(club);
  wireClubJoinButton(block.querySelector('[data-club-join]'), club);
}
