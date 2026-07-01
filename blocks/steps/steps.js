/**
 * Steps block — "How it works" numbered grid.
 *
 * da.live table shape:
 *   | Steps |      |             |               |
 *   | ### Discover clubs   | ### Join & RSVP     |
 *   | body text            | body text            | ...
 *
 * One content row with N cells (one per step).
 * Each cell: H3 title + paragraph body.
 * JS adds the numbered circle automatically.
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const grid = document.createElement('div');
  grid.className = 'steps-grid';

  [...row.children].forEach((cell, index) => {
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

    grid.append(step);
  });

  block.textContent = '';
  block.append(grid);
}
