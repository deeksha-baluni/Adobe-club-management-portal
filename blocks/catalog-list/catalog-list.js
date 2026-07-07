/**
 * Catalog List — unified browse block for /events and /clubs.
 * da.live: preset | events | clubs + key | value config rows.
 */
import { readPageConfig, cfg } from '../club-shared/block-config.js';

function normalizePath(path) {
  const raw = (path || '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  return raw === '/index' ? '/' : raw;
}

function resolvePreset(config) {
  const explicit = cfg(config, 'preset', '').toLowerCase();
  if (explicit === 'events' || explicit === 'clubs') return explicit;
  const path = normalizePath(window.location.pathname);
  if (path === '/clubs') return 'clubs';
  if (path === '/events') return 'events';
  return 'events';
}

export default async function decorate(block) {
  const preset = resolvePreset(readPageConfig(block, {}));
  block.classList.add('catalog-list', `catalog-list--${preset}`);

  if (preset === 'clubs') {
    const { default: decorateClubs } = await import('./clubs.js');
    await decorateClubs(block);
    return;
  }

  const { default: decorateEvents } = await import('./events.js');
  await decorateEvents(block);
}
