/**
 * CTA Banner block — dark join call-to-action.
 * Reusable on club detail (reads club from ?id=) or home (static fallback).
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
  getJoinLabel,
  wireClubJoinButton,
  bindClubJoinSync,
} from '../club-shared/club-page.js';

const DEFAULT_PERKS = [
  { icon: 'pin', label: 'Nearby events' },
  { icon: 'bolt', label: 'Easy to join' },
  { icon: 'people', label: 'Real community' },
  { icon: 'target', label: 'All skill levels' },
];

const PERK_SVGS = {
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
};

function renderPerks() {
  return DEFAULT_PERKS.map(({ icon, label }) => `
    <span class="cta-perk">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${PERK_SVGS[icon]}</svg>
      ${esc(label)}
    </span>`).join('');
}

export default async function decorate(block) {
  block.innerHTML = '';

  let title = 'Start participating, meet new people, and join your first club event today';
  let joinLabel = 'Join';
  let club = null;

  const clubId = new URLSearchParams(window.location.search).get('id')
    || window.location.pathname.match(/\/clubs\/([^/]+)/)?.[1];
  if (clubId) {
    try {
      const ctx = await initClubPage();
      if (!ctx.error && ctx.club) {
        club = ctx.club;
        title = `Start participating, meet new people, and join your first ${club.tag.toLowerCase()} event today`;
        joinLabel = getJoinLabel(club);
      }
    } catch (_) {
      /* static fallback */
    }
  }

  const joined = club ? getAuth().isClubJoined(club.id) : false;
  const isAdmin = club ? getAuth().getAdminOf().includes(club.id) : false;

  block.innerHTML = `
    <div class="cta-inner" id="club-join">
      <h2 class="cta-title">${esc(title)}</h2>
      <div class="cta-perks">${renderPerks()}</div>
      <button type="button" class="cta-btn btn-primary${joined ? ' is-joined' : ''}" data-club-join data-join-suffix="→"${isAdmin ? ' disabled' : ''}>${esc(joinLabel)} →</button>
    </div>`;

  if (club) {
    bindClubJoinSync(club);
    wireClubJoinButton(block.querySelector('[data-club-join]'), club);
    window.addEventListener('adobe-club-join-changed', (e) => {
      if (e.detail?.clubId !== club.id) return;
      const btn = block.querySelector('[data-club-join]');
      if (btn) {
        btn.classList.toggle('is-joined', e.detail.joined);
        btn.textContent = `${e.detail.joined ? 'Joined' : 'Join'} →`;
      }
    });
  } else {
    block.querySelector('[data-club-join]')?.addEventListener('click', () => {
      if (!getAuth().isAuthenticated()) {
        redirectToLogin();
        return;
      }
      window.location.href = '/clubs';
    });
  }
}
