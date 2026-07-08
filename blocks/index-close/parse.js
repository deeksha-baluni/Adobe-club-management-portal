/**
 * Parse index-close block rows (FAQ + CTA).
 */
import { toClassName } from '../../scripts/aem.js';
import { isConfigRow } from '../../scripts/lib/config-keys.js';

function readCellValue(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a[href]');
  if (link && cell.querySelectorAll('a').length === 1 && cell.textContent.trim() === link.textContent.trim()) {
    return link.href;
  }
  const img = cell.querySelector('img');
  if (img) return img.src;
  const p = cell.querySelector('p');
  if (p && cell.children.length === 1) return p.textContent.trim();
  return cell.textContent.trim();
}

const CTA_DEFAULTS = {
  title: 'Find your community at Adobe.',
  subtitle: 'Sign in with your Adobe account and join your first club today.',
  primaryText: 'Create your account',
  primaryHref: '/login#signup',
  secondaryText: 'Sign in',
  secondaryHref: '/login',
};

export function parseIndexCloseBlock(block) {
  const config = {};
  const faqRows = [];
  let hasConfigKeys = false;

  [...block.children].forEach((row) => {
    const cols = [...row.children];

    if (!isConfigRow(cols)) {
      if (cols.length >= 2) {
        faqRows.push({ questionCell: cols[0], answerCell: cols[1] });
      }
      return;
    }

    hasConfigKeys = true;
    const key = toClassName(cols[0].textContent);
    config[key] = readCellValue(cols[1]);
  });

  const faqItems = [];
  for (let i = 1; i <= 20; i += 1) {
    const q = config[`faq-${i}-q`];
    const a = config[`faq-${i}-a`];
    if (q || a) faqItems.push({ question: q, answer: a });
  }

  const legacyFaqOnly = !hasConfigKeys && faqRows.length > 0;

  const faq = (faqRows.length || faqItems.length || config['faq-title'] || config['faq-eyebrow']) ? {
    eyebrow: config['faq-eyebrow'] || 'Support',
    title: config['faq-title'] || 'Frequently asked questions',
    rows: faqRows,
    items: faqItems,
  } : null;

  const hasCta = Boolean(
    config['cta-title']
    || config['cta-primary-text']
    || config.section === 'cta',
  );

  const cta = (hasCta || (hasConfigKeys && !legacyFaqOnly)) ? {
    title: config['cta-title'] || CTA_DEFAULTS.title,
    subtitle: config['cta-subtitle'] || CTA_DEFAULTS.subtitle,
    primaryText: config['cta-primary-text'] || CTA_DEFAULTS.primaryText,
    primaryHref: config['cta-primary-href'] || CTA_DEFAULTS.primaryHref,
    secondaryText: config['cta-secondary-text'] || CTA_DEFAULTS.secondaryText,
    secondaryHref: config['cta-secondary-href'] || CTA_DEFAULTS.secondaryHref,
  } : null;

  return { faq, cta, legacyFaqOnly };
}
