/**
 * Static step cards from da.live table rows or step-N-title/body config keys.
 */
import { isConfigRow } from '../config-keys.js';

const FALLBACKS = [
  'Discover clubs',
  'Join & RSVP',
  'Attend events',
  'Connect on Slack',
];

function buildStep(item, index) {
  const step = document.createElement('div');
  step.className = 'step';

  const num = document.createElement('div');
  num.className = 'step-num';
  num.setAttribute('aria-hidden', 'true');
  num.textContent = index + 1;
  step.append(num);

  const heading = document.createElement('h3');
  heading.textContent = item.title || FALLBACKS[index] || `Step ${index + 1}`;
  step.append(heading);

  if (item.body) {
    const p = document.createElement('p');
    p.textContent = item.body;
    step.append(p);
  }

  return step;
}

function itemsFromConfig(config = {}) {
  const items = [];
  for (let i = 1; i <= 8; i += 1) {
    const title = String(config[`step-${i}-title`] || '').trim();
    const body = String(config[`step-${i}-body`] || '').trim();
    if (title || body) items.push({ title, body });
  }
  return items;
}

function itemsFromRows(rows = []) {
  const items = [];
  rows.forEach((row) => {
    const cols = [...row.children];
    if (cols.length < 2 || isConfigRow(cols)) return;

    const title = cols[0].querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim()
      || cols[0].textContent.trim();
    const body = cols[1].querySelector('p')?.textContent?.trim()
      || cols[1].textContent.trim();
    if (title || body) items.push({ title, body });
  });
  return items;
}

function itemsFromCells(rows = []) {
  const items = [];
  rows.forEach((row) => {
    const cols = [...row.children];
    if (cols.length !== 1 || isConfigRow(cols)) return;
    const cell = cols[0];
    const title = cell.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim() || '';
    const body = cell.querySelector('p')?.textContent?.trim() || cell.textContent.trim();
    if (title || body) items.push({ title, body });
  });
  return items;
}

export function mountStepsGrid(rows = [], config = {}) {
  const grid = document.createElement('div');
  grid.className = 'steps-grid';

  let items = itemsFromConfig(config);
  if (!items.length) items = itemsFromRows(rows);
  if (!items.length) items = itemsFromCells(rows);

  if (!items.length && rows.length === 1 && rows[0].children.length >= 4) {
    [...rows[0].children].forEach((cell, index) => {
      const title = cell.querySelector('h3, h4')?.textContent?.trim() || '';
      const body = cell.querySelector('p')?.textContent?.trim() || cell.textContent.trim();
      items.push({ title, body: body === title ? '' : body });
      if (!items[index]?.title && !items[index]?.body) {
        items[index] = { title: FALLBACKS[index] || `Step ${index + 1}`, body: '' };
      }
    });
  }

  items.forEach((item, index) => grid.append(buildStep(item, index)));

  return grid;
}
