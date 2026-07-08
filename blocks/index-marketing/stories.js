/**
 * Mount member stories section inside index-marketing.
 */
import { isGuestIndexPath, publishedImageSrc } from '../../scripts/lib/image-priority.js';
import { buildSectionHead } from '../../scripts/lib/marketing-head.js';

function mountStoryImage(wrap, src, alt = '') {
  wrap.className = 'story-card-image';
  const cleanSrc = publishedImageSrc(src);
  if (!cleanSrc) {
    wrap.classList.add('story-card-image--empty');
    return;
  }
  const img = document.createElement('img');
  img.src = cleanSrc;
  img.alt = alt;
  img.width = 870;
  img.height = 544;
  img.loading = 'lazy';
  img.decoding = 'async';
  if (isGuestIndexPath() && 'fetchPriority' in img) {
    img.fetchPriority = 'low';
  }
  wrap.append(img);
}

function mountStoryFromRow(row) {
  const li = document.createElement('li');
  li.className = 'story-card';

  const imageWrap = document.createElement('div');
  const img = row.imageCell?.querySelector('picture img, img');
  mountStoryImage(imageWrap, img?.src, img?.alt || '');

  const body = document.createElement('div');
  body.className = 'story-card-body';

  const textCell = row.textCell;
  if (textCell) {
    while (textCell.firstElementChild) {
      body.append(textCell.firstElementChild);
    }
    if (!body.children.length && textCell.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = textCell.textContent.trim();
      body.append(p);
    }
  }

  li.append(imageWrap, body);
  return li;
}

function mountStoryFromItem(item) {
  const li = document.createElement('li');
  li.className = 'story-card';

  const imageWrap = document.createElement('div');
  mountStoryImage(imageWrap, item.image, item.title || '');

  const body = document.createElement('div');
  body.className = 'story-card-body';

  if (item.title) {
    const heading = document.createElement('h3');
    heading.textContent = item.title;
    body.append(heading);
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

  const grid = document.createElement('ul');
  grid.className = 'stories-grid';

  if (data.rows?.length) {
    data.rows.forEach((row) => grid.append(mountStoryFromRow(row)));
  } else {
    data.items.forEach((item) => grid.append(mountStoryFromItem(item)));
  }

  section.append(grid);
  parent.append(section);
  return section;
}
