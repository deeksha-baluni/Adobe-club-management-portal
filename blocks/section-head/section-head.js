/**
 * Section Head — reusable eyebrow, title, optional link.
 * da.live: eyebrow | Clubs, title | Featured clubs, link-text | …, link-href | /clubs
 */
import { readPageConfig, cfg } from '../../scripts/lib/block-config.js';
import { buildSectionHead } from '../../scripts/lib/section-head.js';

export const SECTION_HEAD_DEFAULTS = {
  eyebrow: '',
  title: '',
  'link-text': '',
  'link-href': '',
};

export default function decorate(block) {
  const config = readPageConfig(block, SECTION_HEAD_DEFAULTS);
  const eyebrow = cfg(config, 'eyebrow', SECTION_HEAD_DEFAULTS.eyebrow);
  const title = cfg(config, 'title', SECTION_HEAD_DEFAULTS.title);
  const linkText = cfg(config, 'link-text', SECTION_HEAD_DEFAULTS['link-text']);
  const linkHref = cfg(config, 'link-href', SECTION_HEAD_DEFAULTS['link-href']);

  block.textContent = '';
  block.classList.add('section-head');

  block.append(buildSectionHead({
    eyebrow,
    title,
    linkText,
    linkHref,
    classPrefix: 'section-head',
  }));
}
