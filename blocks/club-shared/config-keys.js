import { toClassName } from '../../scripts/aem.js';

/** Known da.live config keys (not free-form question text). */
const CONFIG_KEY_RE = /^(preset|section|eyebrow|title|description|image|image-alt|hero-alt|hero-fallback|link-text|link-href|faq-eyebrow|faq-title|cta-title|cta-subtitle|cta-primary-text|cta-primary-href|cta-secondary-text|cta-secondary-href|steps-eyebrow|steps-title|stories-eyebrow|stories-title)$|^(faq-\d+-[qa]|step-\d+-(title|body)|story-\d+-(image|title|body))$/;

export function isAuthorConfigKey(key) {
  return CONFIG_KEY_RE.test(String(key || '').trim());
}

/**
 * True when a table row is key | value config (not FAQ Q&A or image | text content).
 * @param {Element[]} cols
 */
export function isConfigRow(cols) {
  if (!cols || cols.length !== 2) return false;
  if (cols[0].querySelector('img, picture')) return false;
  const key = toClassName(cols[0].textContent);
  return Boolean(key) && isAuthorConfigKey(key);
}

/**
 * Parse preset cell values like "clubs" or "clubs (on /clubs)".
 * @param {string} value
 * @returns {'clubs'|'events'|''}
 */
export function parseShowcasePreset(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (!raw) return '';
  if (raw.startsWith('event')) return 'events';
  if (raw.startsWith('club')) return 'clubs';
  return '';
}
