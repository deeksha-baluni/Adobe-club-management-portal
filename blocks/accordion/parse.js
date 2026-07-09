/**
 * Parse accordion block rows (FAQ Q&A table or faq-N-q/a config keys).
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

export function parseAccordionBlock(block) {
  const config = {};
  const faqRows = [];

  [...block.children].forEach((row) => {
    const cols = [...row.children];

    if (!isConfigRow(cols)) {
      if (cols.length >= 2) {
        faqRows.push({ questionCell: cols[0], answerCell: cols[1] });
      }
      return;
    }

    const key = toClassName(cols[0].textContent);
    config[key] = readCellValue(cols[1]);
  });

  const faqItems = [];
  for (let i = 1; i <= 20; i += 1) {
    const q = config[`faq-${i}-q`];
    const a = config[`faq-${i}-a`];
    if (q || a) faqItems.push({ question: q, answer: a });
  }

  const faq = (faqRows.length || faqItems.length || config['faq-title'] || config['faq-eyebrow']) ? {
    eyebrow: config['faq-eyebrow'] || 'Support',
    title: config['faq-title'] || 'Frequently asked questions',
    rows: faqRows,
    items: faqItems,
  } : null;

  return { faq };
}
