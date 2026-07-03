/**
 * Club List block — consolidated club body sections.
 *
 * da.live `/club` page:
 *   | Metadata   |
 *   | Club Hero  |  (separate block)
 *   | Club List  |  (empty — renders activities, events, recaps, team, CTA)
 */

import {
  initClubPage,
  bindClubJoinSync,
  loadScript,
} from '../club-shared/club-page.js';
import { mountActivitiesSection } from '../club-shared/sections/activities-section.js';
import { mountEventsSection } from '../club-shared/sections/events-section.js';
import { mountRecapsSection, scrollToRecapsSection } from '../club-shared/sections/recaps-section.js';
import { mountTeamSection } from '../club-shared/sections/team-section.js';
import { mountCtaSection } from '../club-shared/sections/cta-section.js';

async function ensureRecapDeps() {
  const base = window.hlx?.codeBasePath || '';
  await loadScript(`${base}/scripts/user-features.js`);
}

function createSection(className) {
  const el = document.createElement('div');
  el.className = `club-list-section ${className}`;
  return el;
}

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('club-list');

  let ctx;
  try {
    ctx = await initClubPage();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[club-list]', err);
    return;
  }
  if (ctx.error) return;

  const { club } = ctx;
  await ensureRecapDeps();

  const inner = document.createElement('div');
  inner.className = 'club-list-inner';
  block.appendChild(inner);

  const sections = [
    { className: 'club-list-section--activities', mount: mountActivitiesSection },
    { className: 'club-list-section--events', mount: mountEventsSection },
    { className: 'club-list-section--recaps', mount: mountRecapsSection },
    { className: 'club-list-section--team', mount: mountTeamSection },
    { className: 'club-list-section--cta', mount: mountCtaSection },
  ];

  sections.forEach(({ className, mount }) => {
    const section = createSection(className);
    inner.appendChild(section);
    mount(section, ctx);
  });

  bindClubJoinSync(club);

  window.addEventListener('adobe-club-join-changed', (e) => {
    if (e.detail?.clubId !== club.id) return;
    block.querySelectorAll('[data-club-join]').forEach((btn) => {
      btn.classList.toggle('is-joined', e.detail.joined);
      const suffix = btn.dataset.joinSuffix || '';
      btn.textContent = suffix
        ? `${e.detail.joined ? 'Joined' : 'Join'} ${suffix}`
        : (e.detail.joined ? 'Joined' : 'Join');
    });
  });

  window.AdobeBreadcrumbs?.set([
    { label: 'Home', href: window.AdobeBreadcrumbs?.getHomeHref?.() || '/' },
    { label: 'Clubs', href: '/clubs' },
    { label: club.name, current: true },
  ]);

  const recapsSection = inner.querySelector('.club-list-section--recaps');
  if (recapsSection) scrollToRecapsSection(recapsSection);
}
