/**
 * Builds the stats row from a <ul> authored in da.live.
 * Each <li> must have a <strong> number followed by label text.
 * @param {HTMLUListElement} ul
 * @returns {HTMLElement}
 */
function buildStats(ul) {
  const row = document.createElement('div');
  row.className = 'landing-hero-stats';
  row.setAttribute('role', 'list');
  row.setAttribute('aria-label', 'Community at a glance');

  ul.querySelectorAll('li').forEach((li) => {
    const stat = document.createElement('div');
    stat.className = 'landing-hero-stat';
    stat.setAttribute('role', 'listitem');

    const strong = li.querySelector('strong');
    const num = document.createElement('strong');
    num.textContent = strong ? strong.textContent.trim() : '';

    const label = document.createElement('span');
    label.textContent = li.textContent.replace(num.textContent, '').trim();

    stat.append(num, label);
    row.append(stat);
  });

  return row;
}

/**
 * Landing Hero block — da.live → JS → CSS pipeline.
 *
 * da.live table shape:
 *   | Landing Hero |              |
 *   | hero image   | content cell |
 *
 * Content cell (top to bottom):
 *   - Plain paragraph           → eyebrow
 *   - Heading 1                 → title
 *   - Plain paragraph           → subtitle
 *   - **Bold link**             → primary button (decorated before decorate() runs)
 *   - _Italic link_             → secondary button
 *   - Bullet list (bold nums)   → stats row
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const [mediaCell, contentCell] = [...row.children];

  // ── Media (left on desktop) ──────────────────────────────────────────────
  const media = document.createElement('div');
  media.className = 'landing-hero-media';

  const heroPicture = mediaCell?.querySelector('picture');
  const heroImg = mediaCell?.querySelector('img');

  if (heroPicture) {
    media.append(heroPicture);
  } else if (heroImg) {
    media.append(heroImg);
  } else {
    // no image authored in da.live — use repo asset
    const img = document.createElement('img');
    img.src = '/assets/images/index/home-hero-img.webp';
    img.alt = 'Adobe colleagues at a club event';
    img.loading = 'eager';
    img.decoding = 'async';
    media.append(img);
  }

  // ── Content (right on desktop) ───────────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'landing-hero-content';

  if (contentCell) {
    let headingFound = false;
    let eyebrowDone = false;
    let subtitleDone = false;
    const pendingButtons = [];

    const flushButtons = (target) => {
      if (!pendingButtons.length) return;
      const actions = document.createElement('div');
      actions.className = 'landing-hero-actions';
      pendingButtons.forEach((b) => actions.append(b));
      target.append(actions);
      pendingButtons.length = 0;
    };

    [...contentCell.children].forEach((el) => {
      if (/^H[1-6]$/.test(el.tagName)) {
        headingFound = true;
        el.className = 'landing-hero-title';
        content.append(el);
      } else if (el.tagName === 'P' && !el.classList.length && !el.querySelector('a[href]')) {
        if (!headingFound && !eyebrowDone) {
          el.className = 'landing-hero-eyebrow';
          eyebrowDone = true;
        } else if (headingFound && !subtitleDone) {
          el.className = 'landing-hero-subtitle';
          subtitleDone = true;
        }
        content.append(el);
      } else if (el.classList.contains('button-wrapper')) {
        pendingButtons.push(el);
      } else if (el.tagName === 'UL') {
        flushButtons(content);
        content.append(buildStats(el));
      } else {
        content.append(el);
      }
    });

    flushButtons(content);
  }

  block.textContent = '';
  block.append(content, media);
}
