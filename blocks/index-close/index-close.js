/**
 * Index Close — FAQ + dark CTA (index only).
 * da.live: section | faq | cta + key | value rows.
 */
import { parseIndexCloseBlock } from './parse.js';
import { mountFaqSection } from './faq.js';
import { mountCtaSection } from './cta.js';
import { hasAuthoredSectionIntro } from '../club-shared/section-intro.js';

function parseDarkSectionCta(section) {
  const title = section.querySelector('h2')?.textContent?.trim();
  const subtitle = section.querySelector('h2 + p')?.textContent?.trim()
    || section.querySelector('p:not(:has(a))')?.textContent?.trim();
  const links = [...section.querySelectorAll('a[href]')];
  if (!title && !links.length) return null;

  return {
    title: title || 'Find your community at Adobe.',
    subtitle: subtitle || 'Sign in with your Adobe account and join your first club today.',
    primaryText: links[0]?.textContent?.trim() || 'Create your account',
    primaryHref: links[0]?.href || '/login#signup',
    secondaryText: links[1]?.textContent?.trim() || 'Sign in',
    secondaryHref: links[1]?.href || '/login',
  };
}

/** Pull CTA from the legacy `.section.dark` block that followed Accordion in da.live. */
function absorbFollowingDarkCta(block) {
  const section = block.closest('.section');
  const next = section?.nextElementSibling;
  if (!next?.classList.contains('dark')) return null;

  const cta = parseDarkSectionCta(next);
  if (!cta) return null;
  next.remove();
  return cta;
}

export default function decorate(block) {
  const parsed = parseIndexCloseBlock(block);

  block.textContent = '';
  block.classList.add('index-close');

  if (parsed.faq) {
    mountFaqSection(block, parsed.faq, {
      skipHead: hasAuthoredSectionIntro(block),
    });
  }

  const cta = parsed.cta || absorbFollowingDarkCta(block);
  if (cta) {
    mountCtaSection(block, cta);
  }
}

/** Legacy steps/cards-era accordion shim (class migrated to index-close before load). */
export function decorateFaqOnly(block) {
  decorate(block);
}
