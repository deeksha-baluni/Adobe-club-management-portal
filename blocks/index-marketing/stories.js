/**
 * Mount member stories section inside index-marketing.
 */
import { createOptimizedPicture } from '../../scripts/aem.js';
import { isGuestIndexPath } from '../club-shared/image-priority.js';
import { buildSectionHead } from '../club-shared/marketing-head.js';

const CARD_WIDTHS = [{ width: '750' }];

function optimizeStoryImage(wrap, src, alt = '') {
  wrap.className = 'story-card-image';
  if (!src) {
    wrap.classList.add('story-card-image--empty');
    return;
  }
  const picture = createOptimizedPicture(src, alt, false, CARD_WIDTHS);
  const img = picture.querySelector('img');
  if (img && isGuestIndexPath() && 'fetchPriority' in img) {
    img.fetchPriority = 'low';
  }
  wrap.append(picture);
}

function mountStoryFromRow(row) {
  const li = document.createElement('li');
  li.className = 'story-card';

  const imageWrap = document.createElement('div');
  const img = row.imageCell?.querySelector('picture img, img');
  optimizeStoryImage(imageWrap, img?.src, img?.alt || '');

  const body = document.createElement('div');
  body.className = 'story-card-body';

  const textCell = row.textCell;
  if (textCell) {
    const heading = textCell.querySelector('h1, h2, h3, h4, h5, h6');
    const strong = textCell.querySelector('strong');

    if (heading) {
      while (textCell.firstElementChild) {
        body.append(textCell.firstElementChild);
      }
    } else if (strong) {
      const h3 = document.createElement('h3');
      h3.textContent = strong.textContent.trim();
      body.append(h3);

      const remainder = textCell.cloneNode(true);
      remainder.querySelector('strong')?.remove();
      remainder.querySelector('br')?.remove();
      const copy = remainder.textContent.trim();
      if (copy) {
        const p = document.createElement('p');
        p.textContent = copy;
        body.append(p);
      }
    } else {
      while (textCell.firstElementChild) {
        body.append(textCell.firstElementChild);
      }
      if (!body.textContent.trim() && textCell.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = textCell.textContent.trim();
        body.append(p);
      }
    }
  }

  li.append(imageWrap, body);
  return li;
}

function mountStoryFromItem(item) {
  const li = document.createElement('li');
  li.className = 'story-card';

  const imageWrap = document.createElement('div');
  optimizeStoryImage(imageWrap, item.image, item.title || '');

  const body = document.createElement('div');
  body.className = 'story-card-body';

  if (item.title) {
    const h3 = document.createElement('h3');
    h3.textContent = item.title;
    body.append(h3);
  }
  if (item.body) {
    const p = document.createElement('p');
    p.textContent = item.body;
    body.append(p);
  }

  li.append(imageWrap, body);
  return li;
}

export function mountStoriesSection(parent, data, { standalone = false, skipHead = false } = {}) {
  const section = document.createElement('section');
  section.className = standalone ? 'index-marketing-stories' : 'index-marketing-section index-marketing-section--stories';
  section.setAttribute('aria-label', 'Member stories');

  if (!skipHead) {
    section.append(buildSectionHead({
      eyebrow: data.eyebrow,
      title: data.title,
      classPrefix: 'index-marketing',
    }));
  }

  const ul = document.createElement('ul');
  ul.className = 'stories-grid';

  if (data.rows?.length) {
    data.rows.forEach((row) => ul.append(mountStoryFromRow(row)));
  } else {
    data.items.forEach((item) => ul.append(mountStoryFromItem(item)));
  }

  section.append(ul);
  parent.append(section);
  return section;
}
