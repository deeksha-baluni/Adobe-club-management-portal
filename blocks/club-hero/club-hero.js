/**
 * Club Hero block — renders the hero section for a club detail page.
 *
 * da.live:
 *   | Club Hero |
 *   | (empty)   |
 *
 * URL: /club?id=adobe-lens
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
} from '../club-shared/club-page.js';

function getHeroHeadline(clubId) {
  const m = window.AdobeClubMeta?.heroHeadline?.[clubId];
  return m || { line1: 'Find your people', line2: 'Join your club' };
}

function getMemberCountHtml(count) {
  if (!count) return '';
  return `
    <span class="ch-members">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      ${esc(String(count))} members
    </span>`;
}

function getSlackHtml(club) {
  if (!club.slackUrl && !club.slackChannel) return '';
  const url = club.slackUrl || '#';
  const label = club.slackChannel || 'Join Slack';
  return `<a class="ch-btn ch-btn--outline" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function renderNotFound(block) {
  block.innerHTML = `
    <div class="ch-inner">
      <p class="ch-not-found">Club not found. <a href="/clubs">← Back to clubs</a></p>
    </div>`;
}

export default async function decorate(block) {
  block.innerHTML = '';
  await loadClubScripts();

  let ctx;
  try {
    ctx = await resolveClubContext();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[club-hero]', err);
    renderNotFound(block);
    return;
  }

  if (ctx.error === 'missing-id') {
    renderNotFound(block);
    return;
  }
  if (ctx.error === 'not-found') {
    renderNotFound(block);
    return;
  }

  const { club } = ctx;
  const joinLabel = getJoinLabel(club);
  const isAdmin = joinLabel === 'Admin only';
  const joined = getAuth().isClubJoined(club.id);
  const headline = getHeroHeadline(club.id);
  const memberCount = window.AdobeClubsAuth?.getClubMemberCount?.(club.id, club.members) ?? club.members;

  document.title = `${club.name} — Adobe Clubs`;

  block.innerHTML = `
    <div class="ch-inner">
      <a class="ch-back" href="/clubs">← All clubs</a>
      <div class="ch-grid">
        <div class="ch-copy">
          <div class="ch-eyebrow">
            <span class="ch-tag">${esc(club.tag)}</span>
            ${getMemberCountHtml(memberCount)}
          </div>
          <h1 class="ch-title">${esc(headline.line1)}<br>${esc(headline.line2)}.</h1>
          <p class="ch-desc">${esc(club.desc)} Connect with colleagues, explore nearby events, and build your ${esc(club.tag.toLowerCase())} community — all in one place.</p>
          <div class="ch-actions">
            <button type="button" class="ch-btn ch-btn--primary ch-join-btn${joined ? ' is-joined' : ''}" data-club-join${isAdmin ? ' disabled' : ''}>${esc(joinLabel === 'Joined' ? 'Joined ✓' : joinLabel === 'Admin only' ? 'Admin' : 'Join')}</button>
            ${getSlackHtml(club)}
          </div>
        </div>
        <div class="ch-photo">
          <img src="${esc(getClubImageSrc(club))}" alt="${esc(club.name)}" loading="eager" decoding="async">
        </div>
      </div>
    </div>`;

  bindClubJoinSync(club);
  wireClubJoinButton(block.querySelector('[data-club-join]'), club);
}
