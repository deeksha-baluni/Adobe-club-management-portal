/**
 * Resources Hero block — text-only centered hero (no image).
 *
 * da.live table shape:
 *   | Resources Hero |
 *   | H1 + paragraph in one cell |
 *
 * Outputs:
 *   <section class="rs-hero">
 *     <div class="rs-hero-content">…</div>
 *   </section>
 */

function findContentCell(row) {
  const cells = [...row.children];
  if (!cells.length) return null;
  return cells.find((c) => c.querySelector('h1, h2, h3, p')) || cells[0];
}

function buildHeading(h) {
  const heading = document.createElement('h1');
  heading.className = 'rs-hero-title';
  const defaultTitle = 'Guides, articles<br><span class="rs-hero-accent">&amp; how-tos</span>';

  if (!h) {
    heading.innerHTML = defaultTitle;
    return heading;
  }

  const text = h.textContent.trim();
  if (h.querySelector('br, .rs-hero-accent') || /how-?tos/i.test(text)) {
    heading.innerHTML = h.innerHTML;
  } else if (/^guides,\s*articles$/i.test(text)) {
    heading.innerHTML = defaultTitle;
  } else {
    heading.textContent = text;
  }

  return heading;
}

export default function decorate(block) {
  const row = block.firstElementChild;
  const contentEl = row ? findContentCell(row) : null;

  const hero = document.createElement('section');
  hero.className = 'rs-hero';
  hero.setAttribute('aria-label', 'Resources hero');

  const content = document.createElement('div');
  content.className = 'rs-hero-content';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'rs-hero-eyebrow';
  eyebrow.textContent = 'Resource Hub · Adobe Clubs';

  const sub = document.createElement('p');
  sub.className = 'rs-hero-sub';

  const h = contentEl?.querySelector('h1, h2');
  const firstP = contentEl?.querySelector('p');
  const heading = buildHeading(h);

  if (firstP) {
    sub.innerHTML = firstP.innerHTML;
  } else {
    sub.innerHTML = 'Articles for <strong>club leads and members</strong> — policies, tips, and stories from across the community.';
  }

  content.append(eyebrow, heading, sub);
  hero.append(content);

  block.textContent = '';
  block.append(hero);
}
