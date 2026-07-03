/**
 * CTA Banner block — dark join call-to-action.
 * On club pages prefer club-list; this block remains for other pages.
 *
 * da.live:
 *   | CTA Banner |
 *   | (empty)    |
 */

import {
  esc,
  getAuth,
  initClubPage,
  redirectToLogin,
  wireClubJoinButton,
  bindClubJoinSync,
} from '../club-shared/club-page.js';
import { mountCtaSection } from '../club-shared/sections/cta-section.js';

const DEFAULT_TITLE = 'Start participating, meet new people, and join your first club event today';

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('cta-banner');

  const clubId = new URLSearchParams(window.location.search).get('id')
    || window.location.pathname.match(/\/clubs\/([^/]+)/)?.[1];

  if (clubId) {
    try {
      const ctx = await initClubPage();
      if (!ctx.error && ctx.club) {
        mountCtaSection(block, ctx);
        bindClubJoinSync(ctx.club);
        window.addEventListener('adobe-club-join-changed', (e) => {
          if (e.detail?.clubId !== ctx.club.id) return;
          const btn = block.querySelector('[data-club-join]');
          if (btn) {
            btn.classList.toggle('is-joined', e.detail.joined);
            btn.textContent = `${e.detail.joined ? 'Joined' : 'Join'} →`;
          }
        });
        return;
      }
    } catch (_) {
      /* fall through to static */
    }
  }

  block.innerHTML = `
    <div class="cta-inner" id="club-join">
      <h2 class="cta-title">${esc(DEFAULT_TITLE)}</h2>
      <div class="cta-perks">
        <span class="cta-perk">Nearby events</span>
        <span class="cta-perk">Easy to join</span>
        <span class="cta-perk">Real community</span>
        <span class="cta-perk">All skill levels</span>
      </div>
      <button type="button" class="cta-btn btn-primary" data-club-join data-join-suffix="→">Join →</button>
    </div>`;

  block.querySelector('[data-club-join]')?.addEventListener('click', () => {
    if (!getAuth().isAuthenticated()) {
      redirectToLogin();
      return;
    }
    window.location.href = '/clubs';
  });
}
