/**
 * Accordion — FAQ expand/collapse block.
 * da.live: faq-eyebrow | Support, faq-title | …, faq-1-q | …, faq-1-a | …
 * Or two-column Q | A rows (non-config).
 */
import { parseAccordionBlock } from './parse.js';
import { mountFaqSection } from './faq.js';
import { hasAuthoredSectionIntro } from '../../scripts/lib/section-intro.js';

export default function decorate(block) {
  const parsed = parseAccordionBlock(block);

  block.textContent = '';
  block.classList.add('accordion');

  if (parsed.faq) {
    mountFaqSection(block, parsed.faq, {
      skipHead: hasAuthoredSectionIntro(block),
    });
  }
}
