/**
 * Parse index-marketing block rows (config + content).
 */
import { toClassName } from '../../scripts/aem.js';
import { isConfigRow } from '../club-shared/config-keys.js';

const STEP_FALLBACKS = [
  'Discover clubs',
  'Join & RSVP',
  'Attend events',
  'Connect on Slack',
];

function readCellValue(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a[href]');
  if (link && cell.querySelectorAll('a').length === 1 && cell.textContent.trim() === link.textContent.trim()) {
    return link.href;
  }
  const img = cell.querySelector('img');
  if (img) return img.src;
  return cell.textContent.trim();
}

/**
 * @param {Element} block
 * @returns {{ steps: object|null, stories: object|null, legacyStepsOnly: boolean, legacyStoriesOnly: boolean }}
 */
export function parseIndexMarketingBlock(block) {
  const config = {};
  const stepCells = [];
  const storyRows = [];
  let section = null;
  let legacyStepsOnly = false;
  let legacyStoriesOnly = false;

  const rows = [...block.children];

  if (rows.length === 1 && rows[0].children.length >= 4) {
    legacyStepsOnly = true;
    [...rows[0].children].forEach((cell) => stepCells.push(cell));
  } else if (rows.length > 0 && rows.every((r) => r.children.length === 2 && r.children[0].querySelector('img, picture'))) {
    legacyStoriesOnly = true;
    rows.forEach((row) => storyRows.push({ imageCell: row.children[0], textCell: row.children[1] }));
  } else {
    rows.forEach((row) => {
      const cols = [...row.children];
      if (cols.length >= 4 && section === 'steps') {
        cols.forEach((cell) => stepCells.push(cell));
        return;
      }
      if (!isConfigRow(cols)) {
        if (section === 'stories' && cols.length >= 2 && cols[0].querySelector('img, picture')) {
          storyRows.push({ imageCell: cols[0], textCell: cols[1] });
        }
        return;
      }

      const key = toClassName(cols[0].textContent);
      const value = readCellValue(cols[1]);

      if (key === 'section') {
        section = value.toLowerCase();
        return;
      }

      config[key] = value;
    });
  }

  const stepsFromKeys = [];
  for (let i = 1; i <= 8; i += 1) {
    const title = config[`step-${i}-title`];
    const body = config[`step-${i}-body`];
    if (title || body) stepsFromKeys.push({ title, body });
  }

  const storiesFromKeys = [];
  for (let i = 1; i <= 12; i += 1) {
    const image = config[`story-${i}-image`];
    const title = config[`story-${i}-title`];
    const body = config[`story-${i}-body`];
    if (image || title || body) storiesFromKeys.push({ image, title, body });
  }

  const steps = (legacyStepsOnly || stepCells.length || stepsFromKeys.length
    || config['steps-eyebrow'] || config['steps-title']) ? {
    eyebrow: config['steps-eyebrow'] || config.eyebrow || 'Simple to start',
    title: config['steps-title'] || config.title || 'How it works',
    cells: stepCells,
    items: stepsFromKeys,
    fallbacks: STEP_FALLBACKS,
  } : null;

  const stories = (legacyStoriesOnly || storyRows.length || storiesFromKeys.length
    || config['stories-eyebrow'] || config['stories-title']) ? {
    eyebrow: config['stories-eyebrow'] || 'Member stories',
    title: config['stories-title'] || 'Connections made at Adobe Clubs',
    rows: storyRows,
    items: storiesFromKeys,
  } : null;

  return { steps, stories, legacyStepsOnly, legacyStoriesOnly };
}
