/**
 * Club Activities block — "What this club does" activity cards.
 *
 * da.live:
 *   | Club Activities |
 *   | (empty)         |
 */

import {
  esc,
  initClubPage,
  getMeta,
  getActivityDesc,
} from '../club-shared/club-page.js';

const ACTIVITY_ICON_SVGS = [
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="M6 8l6-3 6 3"/></svg>',
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
];

function renderGrid(activities, club) {
  const cats = (activities.length ? activities : [club.tag]).slice(0, 4);
  const items = cats.map((name, i) => `
    <article class="ca-item">
      <span class="ca-icon">${ACTIVITY_ICON_SVGS[i % ACTIVITY_ICON_SVGS.length]}</span>
      <div class="ca-text">
        <h4>${esc(name)}</h4>
        <p>${esc(getActivityDesc(club.id, name, club))}</p>
      </div>
    </article>
  `).join('');
  return `<div class="ca-grid">${items}</div>`;
}

export default async function decorate(block) {
  block.innerHTML = '';
  let ctx;
  try {
    ctx = await initClubPage();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[club-activities]', err);
    return;
  }
  if (ctx.error) return;

  const { club } = ctx;
  const meta = getMeta(club.id);

  block.innerHTML = `
    <div class="club-section-inner">
      <h2 class="club-section-title">What this club does</h2>
      ${renderGrid(meta.activities, club)}
    </div>`;
}
