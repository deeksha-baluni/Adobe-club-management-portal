/**
 * Club Hero block — original club.html hero layout.
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
  clubHasHeroIllustration,
  clubMemberCountHtml,
  getClubSlack,
  slackLinkHtml,
  getSimilarClubs,
  getMeta,
} from '../club-shared/club-page.js';

function renderNotFound(block) {
  block.innerHTML = `
    <div class="club-detail-page club-not-found">
      <h1>Club not found</h1>
      <p>We couldn't find that club. It may have been renamed or removed.</p>
      <a class="club-back" href="/clubs">← Back to all clubs</a>
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
  if (ctx.error) {
    renderNotFound(block);
    return;
  }

  const { club, allClubs } = ctx;
  const meta = getMeta(club.id);
  const joined = getAuth().isClubJoined(club.id);
  const isAdminOfClub = getAuth().getAdminOf().includes(club.id);
  const joinLabel = getJoinLabel(club);
  const memberCount = window.AdobeClubsAuth?.getClubMemberCount?.(club.id, club.members) ?? club.members;
  const slack = getClubSlack(club);
  const slackCta = slack
    ? slackLinkHtml(slack)
    : '<a class="btn-outline" href="#club-events">Browse events</a>';
  const similar = getSimilarClubs(allClubs, club);

  document.title = `${club.name} — Adobe Clubs`;

  block.innerHTML = `
    <div class="club-detail-page">
      <header class="club-hero">
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
              <button type="button" class="btn-primary ${joined ? 'is-joined' : ''}" id="club-detail-join"${isAdminOfClub ? ' disabled' : ''}>${esc(joinLabel)}</button>
              ${slackCta}
            </div>
          </div>
          <div class="club-hero-photo${clubHasHeroIllustration(club.id) ? ' club-hero-photo--illustration' : ''}">
            <img id="club-hero-img" src="${esc(getClubHeroImageSrc(club))}" alt="${esc(club.name)}" loading="eager" decoding="async">
            ${similar.length ? `
            <div class="club-hero-similar">
              <p class="club-hero-similar-label">Similar clubs</p>
              ${similar.map((c) => `
                <a class="club-hero-similar-item" href="/club?id=${esc(c.id)}">
                  <img src="${esc(getClubImageSrc(c))}" alt="${esc(c.name)}" loading="lazy">
                  <span>${esc(c.name)}</span>
                </a>`).join('')}
            </div>` : ''}
          </div>
        </div>
      </header>
    </div>`;

  const img = block.querySelector('#club-hero-img');
  if (img && !club.heroImage && !clubHasHeroIllustration(club.id)) {
    img.addEventListener('error', () => {
      img.onerror = null;
      img.src = getClubImageSrc(club);
    }, { once: true });
  }

  bindClubJoinSync(club);
  wireClubJoinButton(block.querySelector('#club-detail-join'), club);
}
