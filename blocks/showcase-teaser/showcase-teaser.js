/**
 * Showcase Teaser — featured clubs / upcoming events on index.
 * da.live: preset | clubs | events + key | value config rows.
 */
import { readPageConfig } from '../club-shared/block-config.js';
import { parseShowcasePreset } from '../club-shared/config-keys.js';

function normalizePath(path) {
  const raw = (path || '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  return raw === '/index' ? '/' : raw;
}

function resolvePreset(config, block) {
  const explicit = parseShowcasePreset(config.preset);
  if (explicit) return explicit;
  if (block.classList.contains('showcase-teaser--events')) return 'events';
  if (block.classList.contains('showcase-teaser--clubs')) return 'clubs';
  return 'clubs';
}

export default async function decorate(block) {
  const config = readPageConfig(block, {});
  const preset = resolvePreset(config, block);
  block.classList.add('showcase-teaser', `showcase-teaser--${preset}`);

  if (preset === 'events') {
    const { default: decorateEvents } = await import('./events.js');
    await decorateEvents(block, config);
    return;
  }

  const { default: decorateClubs } = await import('./clubs.js');
  await decorateClubs(block, config);
}
