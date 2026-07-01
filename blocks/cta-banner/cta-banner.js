/**
 * CTA Banner block — original club footer CTA section.
 */

import {
  esc,
  getAuth,
  loadClubScripts,
  resolveClubContext,
  getJoinLabel,
  wireClubJoinButton,
  bindClubJoinSync,
} from '../club-shared/club-page.js';

export default async function decorate(block) {
  block.innerHTML = '';
  await loadClubScripts();

  let ctx;
  try {
    ctx = await resolveClubContext();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[cta-banner]', err);
    return;
  }
  if (ctx.error) return;

  const { club } = ctx;
  const joined = getAuth().isClubJoined(club.id);
  const isAdminOfClub = getAuth().getAdminOf().includes(club.id);
  const joinLabel = getJoinLabel(club);

  block.innerHTML = `
    <div class="club-detail-page">
      <section class="club-block club-footer-block" id="club-join">
        <div class="club-footer-inner">
          <h2 class="club-footer-title">Start participating, meet new people, and join your first ${esc(club.tag.toLowerCase())} event today</h2>
          <div class="club-footer-perks">
            <span class="club-footer-perk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Nearby events</span>
            <span class="club-footer-perk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Easy to join</span>
            <span class="club-footer-perk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Real community</span>
            <span class="club-footer-perk"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> All skill levels</span>
          </div>
          <button type="button" class="club-footer-cta ${joined ? 'is-joined' : ''}" id="club-detail-join-footer"${isAdminOfClub ? ' disabled' : ''}>${esc(joinLabel)} →</button>
        </div>
      </section>
    </div>`;

  bindClubJoinSync(club);
  wireClubJoinButton(block.querySelector('#club-detail-join-footer'), club);
}
