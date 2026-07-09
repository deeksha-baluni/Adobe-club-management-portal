/**
 * CTA Banner — sign-post (static) or join (club) call-to-action band.
 * da.live sign-post: cta-title | …, cta-primary-text | …, cta-primary-href | …
 * da.live join: preset | join
 */
import { readPageConfig } from '../../scripts/lib/block-config.js';
import {
  STATIC_CTA_DEFAULTS,
  JOIN_CTA_DEFAULTS,
  parseStaticCtaConfig,
  mountStaticCta,
  mountJoinCta,
  isJoinCtaMode,
} from '../../scripts/lib/cta-banner.js';

export default async function decorate(block) {
  const config = readPageConfig(block, { ...STATIC_CTA_DEFAULTS, ...JOIN_CTA_DEFAULTS });
  block.textContent = '';
  block.classList.add('cta-banner');

  if (isJoinCtaMode(config) || block.classList.contains('cta-banner--join')) {
    block.classList.add('cta-banner--join');
    await mountJoinCta(block, config);
    return;
  }

  block.classList.add('cta-banner--static');
  mountStaticCta(block, parseStaticCtaConfig(config));
}
