/**
 * Club List — consolidated club body sections.
 * da.live: key | value config rows; club data from JSON.
 */
import {
  initClubPage,
  bindClubJoinSync,
  loadScript,
} from '../../scripts/club/club-page.js';
import { readPageConfig } from '../../scripts/lib/block-config.js';
import { mountActivitiesSection } from '../../scripts/club/sections/activities.js';
import { mountEventsSection } from '../../scripts/club/sections/events.js';
import { mountRecapsSection, applyRecapsDeepLink } from '../../scripts/club/sections/recaps.js';
import { mountTeamSection } from '../../scripts/club/sections/team.js';
import { mountCtaSection } from '../../scripts/club/sections/cta.js';

export const CLUB_LIST_DEFAULTS = {
  'clubs-data': '/data/data.json',
  'detail-event-base': '/event',
  'section-activities': 'What this club does',
  'section-events': 'Find your next {tag} event',
  'section-recaps': 'Highlights from recent sessions',
  'section-team': 'Meet the dedicated team',
  'events-empty': 'No upcoming events for this club yet.',
  'events-day-empty': 'No events available for this day.',
  'filter-all-dates': 'All dates',
  'filter-today': 'Today',
  'filter-tomorrow': 'Tomorrow',
  'filter-this-week': 'This week',
  'rsvp-label': 'RSVP',
  'rsvpd-label': "RSVP'd",
  'members-only-label': 'Members only',
  'recap-cta': 'Post a recap',
  'team-join-template': 'Join our community at {name}.',
  'cta-title-template': 'Start participating, meet new people, and join your first {tag} event today',
  'cta-perk-1': 'Nearby events',
  'cta-perk-2': 'Easy to join',
  'cta-perk-3': 'Real community',
  'cta-perk-4': 'All skill levels',
  'join-label': 'Join',
  'joined-label': 'Joined',
};

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
  const pageConfig = readPageConfig(block, CLUB_LIST_DEFAULTS);

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

  ctx.pageConfig = pageConfig;
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
      const joinedLabel = pageConfig['joined-label'] || CLUB_LIST_DEFAULTS['joined-label'];
      const joinLabel = pageConfig['join-label'] || CLUB_LIST_DEFAULTS['join-label'];
      btn.textContent = suffix
        ? `${e.detail.joined ? joinedLabel : joinLabel} ${suffix}`
        : (e.detail.joined ? joinedLabel : joinLabel);
    });
  });

  window.AdobeBreadcrumbs?.set([
    { label: 'Home', href: window.AdobeBreadcrumbs?.getHomeHref?.() || '/' },
    { label: 'Clubs', href: '/clubs' },
    { label: club.name, current: true },
  ]);

  const recapsSection = inner.querySelector('.club-list-section--recaps');
  if (recapsSection) {
    applyRecapsDeepLink(recapsSection);
    window.addEventListener('hashchange', () => applyRecapsDeepLink(recapsSection));
  }
}
