import { isGuestIndexPath, publishedImageSrc } from '../image-priority.js';
import { isConfigRow } from '../config-keys.js';

const STORY_FALLBACK_IMAGES = [
  '/assets/images/index/dev-grp.avif',
  '/assets/images/index/photographer-grp.avif',
  '/assets/images/index/music-grp.avif',
];

function storyImageSrc(value, index) {
  const raw = Array.isArray(value) ? value[0] : value;
  const clean = publishedImageSrc(String(raw || '').trim());
  if (clean) return clean;
  return STORY_FALLBACK_IMAGES[index] || '';
}
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

function buildStoryCard(item) {
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

function itemsFromConfig(config = {}) {
  const items = [];
  for (let i = 1; i <= 12; i += 1) {
    const image = storyImageSrc(config[`story-${i}-image`], i - 1);
    const title = String(config[`story-${i}-title`] || '').trim();
    const body = String(config[`story-${i}-body`] || '').trim();
    if (image || title || body) items.push({ image, title, body });
  }
  return items;
}
function mountStoryFromRow(row) {
  const cols = [...row.children];
  if (cols.length < 2) return null;

  const li = document.createElement('li');
  li.className = 'story-card';

  const imageWrap = document.createElement('div');
  const img = cols[0]?.querySelector('picture img, img');
  mountStoryImage(imageWrap, img?.src, img?.alt || '');

  const body = document.createElement('div');
  body.className = 'story-card-body';
  const textCell = cols[1];
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

/**
 * Static story cards from da.live image | text rows or story-N config keys.
 */
export function mountStoriesGrid(rows = [], config = {}) {
  const grid = document.createElement('ul');
  grid.className = 'stories-grid';

  const fromKeys = itemsFromConfig(config);
  if (fromKeys.length) {
    fromKeys.forEach((item) => grid.append(buildStoryCard(item)));
    return grid;
  }

  rows.forEach((row) => {
    const cols = [...row.children];
    if (cols.length < 2 || isConfigRow(cols)) return;
    const card = mountStoryFromRow(row);
    if (card) grid.append(card);
  });

  return grid;
}