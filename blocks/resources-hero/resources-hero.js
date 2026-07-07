/**
 * Resources Hero — centered text hero for the Resource Hub.
 * da.live: key | value config rows.
 */
import { readPageConfig, cfg } from '../club-shared/block-config.js';

export const RESOURCES_HERO_DEFAULTS = {
  eyebrow: 'Resource Hub · Adobe Clubs',
  'title-line-1': 'Guides, articles',
  'title-accent': '& how-tos',
  description: 'Articles for club leads and members — policies, tips, and stories from across the community.',
  'description-emphasis': 'club leads and members',
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDescription(config) {
  const text = cfg(config, 'description', RESOURCES_HERO_DEFAULTS.description);
  const emphasis = cfg(config, 'description-emphasis', RESOURCES_HERO_DEFAULTS['description-emphasis']);
  if (!emphasis || !text.includes(emphasis)) {
    return esc(text);
  }
  const [before, after] = text.split(emphasis);
  return `${esc(before)}<strong>${esc(emphasis)}</strong>${esc(after)}`;
}

export default function decorate(block) {
  document.body.classList.add('resources-page');
  const config = readPageConfig(block, RESOURCES_HERO_DEFAULTS);

  block.innerHTML = '';
  block.classList.add('resources-hero');

  const hero = document.createElement('section');
  hero.className = 'rs-hero';
  hero.setAttribute('aria-label', 'Resources hero');

  const content = document.createElement('div');
  content.className = 'rs-hero-content';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'rs-hero-eyebrow';
  eyebrow.textContent = cfg(config, 'eyebrow', RESOURCES_HERO_DEFAULTS.eyebrow);

  const heading = document.createElement('h1');
  heading.className = 'rs-hero-title';
  heading.innerHTML = `${esc(cfg(config, 'title-line-1', RESOURCES_HERO_DEFAULTS['title-line-1']))}<br><span class="rs-hero-accent">${esc(cfg(config, 'title-accent', RESOURCES_HERO_DEFAULTS['title-accent']))}</span>`;

  const sub = document.createElement('p');
  sub.className = 'rs-hero-sub';
  sub.innerHTML = buildDescription(config);

  content.append(eyebrow, heading, sub);
  hero.append(content);
  block.append(hero);
}
