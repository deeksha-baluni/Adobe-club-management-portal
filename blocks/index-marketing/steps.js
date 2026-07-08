/**
 * Mount steps section inside index-marketing.
 */
import { buildSectionHead } from '../../scripts/lib/marketing-head.js';

function ensureStepHeading(step, title, index, fallbacks) {
  if (step.querySelector('h1, h2, h3, h4, h5, h6')) return;
  const heading = document.createElement('h3');
  heading.textContent = title || fallbacks[index] || `Step ${index + 1}`;
  step.querySelector('.step-num')?.insertAdjacentElement('afterend', heading);
}

function mountStepFromCell(cell, index, fallbacks) {
  const step = document.createElement('div');
  step.className = 'step';

  const num = document.createElement('div');
  num.className = 'step-num';
  num.setAttribute('aria-hidden', 'true');
  num.textContent = index + 1;
  step.append(num);

  while (cell.firstElementChild) {
    step.append(cell.firstElementChild);
  }

  if (!step.querySelector('p') && cell.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = cell.textContent.trim();
    step.append(p);
  }

  ensureStepHeading(step, '', index, fallbacks);
  return step;
}

function mountStepFromItem(item, index, fallbacks) {
  const step = document.createElement('div');
  step.className = 'step';

  const num = document.createElement('div');
  num.className = 'step-num';
  num.setAttribute('aria-hidden', 'true');
  num.textContent = index + 1;
  step.append(num);

  const heading = document.createElement('h3');
  heading.textContent = item.title || fallbacks[index] || `Step ${index + 1}`;
  step.append(heading);

  if (item.body) {
    const p = document.createElement('p');
    p.textContent = item.body;
    step.append(p);
  }

  return step;
}

export function mountStepsSection(parent, data, { standalone = false, skipHead = false } = {}) {
  const section = document.createElement('section');
  section.className = standalone ? 'index-marketing-steps' : 'index-marketing-section index-marketing-section--steps';
  section.setAttribute('aria-label', 'How it works');

  if (!skipHead) {
    section.append(buildSectionHead({
      eyebrow: data.eyebrow,
      title: data.title,
      classPrefix: 'index-marketing',
    }));
  }

  const grid = document.createElement('div');
  grid.className = 'steps-grid';

  if (data.cells?.length) {
    data.cells.forEach((cell, index) => grid.append(mountStepFromCell(cell, index, data.fallbacks)));
  } else {
    data.items.forEach((item, index) => grid.append(mountStepFromItem(item, index, data.fallbacks)));
  }

  section.append(grid);
  parent.append(section);
  return section;
}
