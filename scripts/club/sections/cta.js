import {
  esc,
  getAuth,
  getJoinLabel,
  wireClubJoinButton,
} from '../club-page.js';
import { cfg, fillTemplate } from '../../lib/block-config.js';

const PERK_ICONS = ['pin', 'bolt', 'people', 'target'];

const PERK_SVGS = {
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
};

function renderPerks(pageConfig) {
  return PERK_ICONS.map((icon, i) => {
    const label = cfg(pageConfig, `cta-perk-${i + 1}`, '');
    if (!label) return '';
    return `
    <span class="cta-perk">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${PERK_SVGS[icon]}</svg>
      ${esc(label)}
    </span>`;
  }).filter(Boolean).join('');
}

export function mountCtaSection(block, ctx) {
  const { club, pageConfig = {} } = ctx;
  const title = fillTemplate(
    cfg(pageConfig, 'cta-title-template', 'Start participating, meet new people, and join your first {tag} event today'),
    { tag: (club.tag || '').toLowerCase() },
  );
  const joinLabel = getJoinLabel(club);
  const joined = getAuth().isClubJoined(club.id);
  const isAdmin = getAuth().getAdminOf().includes(club.id);

  block.innerHTML = `
    <div class="cta-inner" id="club-join">
      <h2 class="cta-title">${esc(title)}</h2>
      <div class="cta-perks">${renderPerks(pageConfig)}</div>
      <button type="button" class="cta-btn btn-primary${joined ? ' is-joined' : ''}" data-club-join data-join-suffix="→"${isAdmin ? ' disabled' : ''}>${esc(joinLabel)} →</button>
    </div>`;

  wireClubJoinButton(block.querySelector('[data-club-join]'), club);
}
