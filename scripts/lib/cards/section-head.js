/**
 * Section headings owned by the cards block.
 */
import { buildSectionHead } from '../section-head.js';
import { cfg, fillTemplate } from '../block-config.js';

function normalizeText(text = '') {
  return String(text).replace(/^#\s*/, '').trim();
}

/**
 * Plain heading in the same section (default-content-wrapper before cards).
 * @param {Element} block cards block
 */
export function detectPlainSectionHeading(block) {
  const section = block?.closest('.section');
  if (!section) return null;

  const wrapper = section.querySelector(':scope > .default-content-wrapper');
  if (!wrapper) return null;

  const heading = wrapper.querySelector('h1, h2, h3, h4');
  if (!heading) return null;

  const paragraphs = [...wrapper.querySelectorAll('p')].filter((p) => p.textContent.trim());
  const eyebrow = paragraphs.length === 1 && paragraphs[0] !== heading.closest('p')
    ? normalizeText(paragraphs[0].textContent)
    : '';
  const link = wrapper.querySelector('a[href]');

  return {
    eyebrow,
    title: normalizeText(heading.textContent),
    linkText: link?.textContent?.trim() || '',
    linkHref: link?.getAttribute('href') || '',
  };
}

/**
 * Hide absorbed default-content heading so it does not duplicate the cards head.
 * @param {Element} block
 */
export function hidePlainSectionHeading(block) {
  const section = block?.closest('.section');
  const wrapper = section?.querySelector(':scope > .default-content-wrapper');
  if (!wrapper?.querySelector('h1, h2, h3, h4')) return;
  wrapper.style.display = 'none';
  wrapper.setAttribute('aria-hidden', 'true');
}

/**
 * Resolve eyebrow / title / link from config, preset defaults, or plain section heading.
 */
export function resolveCardsHead(rawConfig, block, defaults = {}) {
  const plain = detectPlainSectionHeading(block);
  return {
    eyebrow: cfg(rawConfig, 'eyebrow', plain?.eyebrow || defaults.eyebrow || ''),
    title: cfg(rawConfig, 'title', plain?.title || defaults.title || ''),
    linkText: cfg(rawConfig, 'link-text', plain?.linkText || defaults['link-text'] || ''),
    linkHref: cfg(rawConfig, 'link-href', plain?.linkHref || defaults['link-href'] || '/'),
  };
}

function buildHomeSectionHead({ eyebrow, title, linkText, linkHref }) {
  const head = document.createElement('div');
  head.className = 'hm-section-head';

  if (eyebrow) {
    const el = document.createElement('p');
    el.className = 'section-head-eyebrow';
    el.textContent = eyebrow;
    head.append(el);
  }

  if (title) {
    const el = document.createElement('h2');
    el.textContent = title;
    head.append(el);
  }

  if (linkText) {
    const el = document.createElement('a');
    el.className = 'hm-section-link';
    el.href = linkHref || '#';
    el.textContent = linkText;
    head.append(el);
  }

  return head;
}

/**
 * Prepend a section head inside the cards block.
 * @param {Element} block
 * @param {{ eyebrow?: string, title?: string, linkText?: string, linkHref?: string }} head
 * @param {{ variant?: 'marketing'|'showcase'|'home'|'club', classPrefix?: string }} [options]
 */
export function appendCardsSectionHead(block, head, options = {}) {
  const { variant = 'marketing', classPrefix = 'section-head' } = options;
  if (!head?.eyebrow && !head?.title && !head?.linkText) return null;

  let el;
  if (variant === 'home') {
    el = buildHomeSectionHead(head);
  } else if (variant === 'club') {
    el = document.createElement('h2');
    el.className = 'club-section-title';
    el.textContent = head.title || '';
  } else {
    const prefix = variant === 'showcase' ? 'showcase' : classPrefix;
    el = buildSectionHead({
      eyebrow: head.eyebrow,
      title: head.title,
      linkText: head.linkText,
      linkHref: head.linkHref,
      classPrefix: prefix,
    });
  }

  block.prepend(el);
  if (detectPlainSectionHeading(block)) hidePlainSectionHeading(block);
  return el;
}

const CLUB_TITLE_KEYS = {
  'club-activities': 'section-activities',
  'club-events': 'section-events',
  'club-recaps': 'section-recaps',
  'club-team': 'section-team',
};

/**
 * Club detail presets — data-driven title with {tag} / {name} templates.
 */
export function appendClubCardsHead(block, presetKey, pageConfig, club) {
  const key = CLUB_TITLE_KEYS[presetKey] || 'title';
  const template = cfg(pageConfig, key, cfg(pageConfig, 'title', ''));
  if (!template) return null;
  const title = fillTemplate(template, {
    tag: (club?.tag || '').toLowerCase(),
    name: club?.name || '',
  });
  return appendCardsSectionHead(block, { title }, { variant: 'club' });
}
