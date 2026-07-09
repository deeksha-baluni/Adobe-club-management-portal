/**
 * FAQ accordion items.
 */
import { buildSectionHead } from '../../scripts/lib/section-head.js';

function mountFaqItem(questionCell, answerCell) {
  const item = document.createElement('div');
  item.className = 'accordion-item';

  const trigger = document.createElement('button');
  trigger.className = 'accordion-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-expanded', 'false');

  const questionText = document.createElement('span');
  questionText.className = 'accordion-question';
  questionText.textContent = questionCell?.textContent.trim() || '';

  const icon = document.createElement('span');
  icon.className = 'accordion-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '+';

  trigger.append(questionText, icon);

  const body = document.createElement('div');
  body.className = 'accordion-body';
  body.hidden = true;

  if (answerCell) {
    const inner = document.createElement('div');
    inner.className = 'accordion-body-inner';
    if (typeof answerCell === 'string') {
      const p = document.createElement('p');
      p.textContent = answerCell;
      inner.append(p);
    } else {
      while (answerCell.firstElementChild) {
        inner.append(answerCell.firstElementChild);
      }
      if (!inner.childElementCount && answerCell.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = answerCell.textContent.trim();
        inner.append(p);
      }
    }
    body.append(inner);
  }

  trigger.addEventListener('click', () => {
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!isExpanded));
    body.hidden = isExpanded;
    icon.textContent = isExpanded ? '+' : '−';
  });

  item.append(trigger, body);
  return item;
}

export function mountFaqSection(parent, data, { standalone = false, skipHead = false } = {}) {
  const section = document.createElement('section');
  section.className = standalone ? 'accordion-faq' : 'accordion-section accordion-section--faq';
  section.id = 'faq';
  section.setAttribute('aria-label', 'Frequently asked questions');

  if (!skipHead) {
    section.append(buildSectionHead({
      eyebrow: data.eyebrow,
      title: data.title,
      classPrefix: 'accordion',
    }));
  }

  const list = document.createElement('div');
  list.className = 'accordion-list';

  if (data.rows?.length) {
    data.rows.forEach(({ questionCell, answerCell }) => {
      list.append(mountFaqItem(questionCell, answerCell));
    });
  } else {
    data.items.forEach(({ question, answer }) => {
      list.append(mountFaqItem({ textContent: question }, answer));
    });
  }

  section.append(list);
  parent.append(section);
  return section;
}
