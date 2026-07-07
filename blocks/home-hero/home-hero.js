/**
 * Home Hero — welcome greeting for logged-in member home.
 * da.live: key | value config rows.
 */
import { readPageConfig, cfg, fillTemplate } from '../club-shared/block-config.js';

export const HOME_HERO_DEFAULTS = {
  'greeting-template': 'Welcome back, {name}',
  'greeting-fallback-name': 'there',
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function auth() {
  return window.AdobeClubsAuth || null;
}

function renderGreeting(config) {
  const user = auth()?.getCurrentUser?.();
  const name = user?.displayName || user?.username
    || cfg(config, 'greeting-fallback-name', HOME_HERO_DEFAULTS['greeting-fallback-name']);
  const template = cfg(config, 'greeting-template', HOME_HERO_DEFAULTS['greeting-template']);
  const greeting = document.getElementById('hm-greeting');
  if (greeting) greeting.textContent = fillTemplate(template, { name });
}

export default function decorate(block) {
  if (!auth()?.isAuthenticated?.()) return;
  if (auth()?.isAnyAdmin?.()) {
    block.innerHTML = '';
    block.closest('.section')?.style.setProperty('display', 'none');
    return;
  }

  const config = readPageConfig(block, HOME_HERO_DEFAULTS);
  window.__homePageConfig = { ...(window.__homePageConfig || {}), hero: config };

  block.innerHTML = '';
  block.classList.add('home-hero');

  const fallbackName = cfg(config, 'greeting-fallback-name', HOME_HERO_DEFAULTS['greeting-fallback-name']);
  const placeholder = esc(fillTemplate(
    cfg(config, 'greeting-template', HOME_HERO_DEFAULTS['greeting-template']),
    { name: fallbackName },
  ));

  block.innerHTML = `
    <div class="hm-header">
      <div class="hm-welcome-row">
        <h1 class="hm-title" id="hm-greeting">${placeholder}</h1>
      </div>
    </div>`;

  document.body.classList.add('user-home');
  renderGreeting(config);
}
