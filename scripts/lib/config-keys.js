import { toClassName } from '../aem.js';

/** Known da.live config keys (not free-form question text). */
const CONFIG_KEY_RE = /^(preset|mode|kind|layout|action|source|limit|section|eyebrow|title|description|image|image-alt|hero-alt|hero-fallback|link-text|link-href|faq-eyebrow|faq-title|cta-title|cta-subtitle|cta-primary-text|cta-primary-href|cta-secondary-text|cta-secondary-href|cta-title-template|steps-eyebrow|steps-title|stories-eyebrow|stories-title|quiz-prompt-strong|quiz-prompt-text|quiz-cta-text|empty-cta|empty-href|empty-title|join-label|joined-label|section-calendar-label|section-calendar-link|section-calendar-href|cal-rsvps-title|cal-empty-text|cal-empty-link|cal-empty-href|cal-more-template|section-activities|section-events|section-recaps|section-team|detail-event-base|events-empty|events-day-empty|filter-all-dates|filter-today|filter-tomorrow|filter-this-week|rsvp-label|rsvpd-label|members-only-label|recap-cta|team-join-template)$|^(faq-\d+-[qa]|step-\d+-(title|body)|story-\d+-(image|title|body)|cta-perk-\d+)$/;

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
