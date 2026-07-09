/**
 * Reusable CTA banner — sign-post (static links) and join (club) modes.
 */
import {
  esc,
  getAuth,
  getJoinLabel,
  initClubPage,
  wireClubJoinButton,
} from '../club/club-page.js';
import { cfg, fillTemplate } from './block-config.js';

export const STATIC_CTA_DEFAULTS = {
  'cta-title': 'Find your community at Adobe.',
  'cta-subtitle': 'Sign in with your Adobe account and join your first club today.',
  'cta-primary-text': 'Create your account',
  'cta-primary-href': '/login#signup',
  'cta-secondary-text': 'Sign in',
  'cta-secondary-href': '/login',
};

export const JOIN_CTA_DEFAULTS = {
  'cta-title-template': 'Start participating, meet new people, and join your first {tag} event today',
  'cta-perk-1': 'Nearby events',
  'cta-perk-2': 'Easy to join',
  'cta-perk-3': 'Real community',
  'cta-perk-4': 'All skill levels',
  'join-label': 'Join',
  'joined-label': 'Joined',
};

const PERK_ICONS = ['pin', 'bolt', 'people', 'target'];

const PERK_SVGS = {
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
};

/**
 * @param {Record<string, string>} config
 */
export function parseStaticCtaConfig(config = {}) {
  return {
    title: cfg(config, 'cta-title', STATIC_CTA_DEFAULTS['cta-title']),
    subtitle: cfg(config, 'cta-subtitle', STATIC_CTA_DEFAULTS['cta-subtitle']),
    primaryText: cfg(config, 'cta-primary-text', STATIC_CTA_DEFAULTS['cta-primary-text']),
    primaryHref: cfg(config, 'cta-primary-href', STATIC_CTA_DEFAULTS['cta-primary-href']),
    secondaryText: cfg(config, 'cta-secondary-text', STATIC_CTA_DEFAULTS['cta-secondary-text']),
    secondaryHref: cfg(config, 'cta-secondary-href', STATIC_CTA_DEFAULTS['cta-secondary-href']),
  };
}

function renderPerks(pageConfig) {
  return PERK_ICONS.map((icon, i) => {
    const label = cfg(pageConfig, `cta-perk-${i + 1}`, '');
    if (!label) return '';
    return `
    <span class="cta-banner-perk">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${PERK_SVGS[icon]}</svg>
      ${esc(label)}
    </span>`;
  }).filter(Boolean).join('');
}

/**
 * Sign-post CTA — title, subtitle, two link buttons.
 * @param {Element} parent
 * @param {{ title?: string, subtitle?: string, primaryText?: string, primaryHref?: string, secondaryText?: string, secondaryHref?: string }} data
 * @param {{ variant?: 'banner'|'embedded', id?: string }} [options]
 * @returns {HTMLElement}
 */
export function mountStaticCta(parent, data, options = {}) {
  const { variant = 'banner', id = '' } = options;
  const inner = document.createElement('div');
  inner.className = variant === 'embedded' ? 'cta-banner-inner cta-banner-inner--embedded' : 'cta-banner-inner';
  if (id) inner.id = id;

  const title = document.createElement('h2');
  title.className = 'cta-banner-title';
  title.textContent = data.title || STATIC_CTA_DEFAULTS['cta-title'];

  const subtitle = document.createElement('p');
  subtitle.className = 'cta-banner-subtitle';
  subtitle.textContent = data.subtitle || STATIC_CTA_DEFAULTS['cta-subtitle'];

  const actions = document.createElement('div');
  actions.className = 'cta-banner-actions';

  const primary = document.createElement('a');
  primary.href = data.primaryHref || STATIC_CTA_DEFAULTS['cta-primary-href'];
  primary.className = 'cta-banner-btn cta-banner-btn--primary';
  primary.textContent = data.primaryText || STATIC_CTA_DEFAULTS['cta-primary-text'];

  const secondary = document.createElement('a');
  secondary.href = data.secondaryHref || STATIC_CTA_DEFAULTS['cta-secondary-href'];
  secondary.className = 'cta-banner-btn cta-banner-btn--secondary';
  secondary.textContent = data.secondaryText || STATIC_CTA_DEFAULTS['cta-secondary-text'];

  actions.append(primary);
  if (data.secondaryText) {
    actions.append(secondary);
  }
  inner.append(title, subtitle, actions);
  parent.append(inner);
  return inner;
}

/**
 * Join CTA — dynamic club join button with perks.
 * @param {Element} parent
 * @param {Record<string, string>} [pageConfig]
 * @returns {Promise<HTMLElement|null>}
 */
export async function mountJoinCta(parent, pageConfig = {}) {
  let ctx;
  try {
    ctx = await initClubPage();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[cta-banner]', err);
    return null;
  }
  if (ctx.error) return null;

  const { club } = ctx;
  const config = { ...JOIN_CTA_DEFAULTS, ...pageConfig };
  const title = fillTemplate(
    cfg(config, 'cta-title-template', JOIN_CTA_DEFAULTS['cta-title-template']),
    { tag: (club.tag || '').toLowerCase() },
  );
  const joinLabel = getJoinLabel(club);
  const joined = getAuth().isClubJoined(club.id);
  const isAdmin = getAuth().getAdminOf().includes(club.id);
  const joinedLabel = cfg(config, 'joined-label', 'Joined');
  const joinText = cfg(config, 'join-label', 'Join');
  const label = joined ? joinedLabel : joinText;

  const inner = document.createElement('div');
  inner.className = 'cta-banner-inner';
  inner.id = 'club-join';
  inner.innerHTML = `
    <h2 class="cta-banner-title">${esc(title)}</h2>
    <div class="cta-banner-perks">${renderPerks(config)}</div>
    <button type="button" class="cta-banner-btn cta-banner-btn--primary${joined ? ' is-joined' : ''}" data-club-join data-join-suffix="→"${isAdmin ? ' disabled' : ''}>${esc(label)} →</button>`;

  parent.append(inner);
  wireClubJoinButton(inner.querySelector('[data-club-join]'), club);
  return inner;
}

/**
 * True when preset/mode indicates join mode (e.g. "join" or "join (club)").
 * @param {Record<string, string>} config
 */
export function isJoinCtaMode(config = {}) {
  const preset = String(cfg(config, 'preset', '') || cfg(config, 'mode', '')).toLowerCase();
  return preset.includes('join');
}
