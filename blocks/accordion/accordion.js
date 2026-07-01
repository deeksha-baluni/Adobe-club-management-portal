/**
 * Accordion block — FAQ with expand/collapse.
 *
 * da.live table shape:
 *   | Accordion |                  |
 *   | Question  | Answer paragraph |
 *   | Question  | Answer paragraph |
 *   | ...       | ...              |
 *
 * Each row = one FAQ item.
 * Col 1 = question text.
 * Col 2 = answer content (can contain paragraphs, links).
 */
export default function decorate(block) {
  const items = [...block.children].map((row) => {
    const [questionCell, answerCell] = [...row.children];

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
      while (answerCell.firstElementChild) {
        inner.append(answerCell.firstElementChild);
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
  });

  block.textContent = '';
  items.forEach((item) => block.append(item));
}
