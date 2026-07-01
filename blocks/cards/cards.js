import { createOptimizedPicture } from '../../scripts/aem.js';

// Repo images used when da.live left cell is empty (member story cards)
const STORY_IMAGES = [
  '/assets/images/index/dev-grp.avif',
  '/assets/images/index/photographer-grp.avif',
  '/assets/images/index/music-grp.avif',
];

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row, idx) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div, colIdx) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-card-image';
      } else if (colIdx === 0 && div.children.length === 0) {
        // Empty left cell — inject repo image
        div.className = 'cards-card-image';
        const img = document.createElement('img');
        img.src = STORY_IMAGES[idx % STORY_IMAGES.length];
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        div.append(img);
      } else {
        div.className = 'cards-card-body';
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
}
