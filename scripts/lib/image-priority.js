/**
 * Image helpers — LCP preload, poster card sizing, avatar thumbs.
 */

export const POSTER_CLUB_SIZE = { width: 600, height: 400 };
export const POSTER_EVENT_SIZE = { width: 600, height: 338 };
export const AVATAR_THUMB_SIZE = 96;

const AVATAR_BASE = '/assets/images/avatar/';
const AVATAR_THUMB_BASE = '/assets/images/avatar/thumbs/';

export function isGuestIndexPath() {
  const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
  return path === '/' || path === '/index';
}

export function isHomePath() {
  const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
  return path === '/home';
}

export function preloadLcpImage(src, { media } = {}) {
  if (!src || document.querySelector(`link[data-lcp-preload="${src}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  if (media) link.media = media;
  if ('fetchPriority' in link) link.fetchPriority = 'high';
  link.dataset.lcpPreload = src;
  document.head.append(link);
}

/** Use the authored asset URL as published — no AEM width/format query params. */
export function publishedImageSrc(src) {
  if (!src) return '';
  try {
    const url = new URL(src, window.location.href);
    url.search = '';
    return url.href;
  } catch (err) {
    return String(src).split('?')[0];
  }
}

/** Nav / profile avatar — 96×96 thumb in avatar/thumbs/ (see tools/resize-home-assets.mjs). */
export function resolveAvatarThumbSrc(src) {
  const clean = publishedImageSrc(src);
  if (!clean) return '';
  if (!clean.includes(AVATAR_BASE)) return clean;
  const file = clean.split('/').pop() || '';
  if (!file) return clean;
  const base = file.replace(/\.(jpe?g|png|webp)$/i, '');
  return `${AVATAR_THUMB_BASE}${base}.webp`;
}

/**
 * Poster / showcase card image — explicit dimensions limit CLS; lazy below fold.
 * @param {HTMLImageElement} img
 * @param {string} src
 * @param {{ width?: number, height?: number, fallback?: string, fallbacks?: string[], eager?: boolean }} [opts]
 */
export function applyCardImage(img, src, {
  width,
  height,
  fallback = '',
  fallbacks = [],
  eager = false,
} = {}) {
  if (!img) return;
  img.alt = img.alt || '';
  img.decoding = 'async';
  img.loading = eager ? 'eager' : 'lazy';
  if (width) img.width = width;
  if (height) img.height = height;
  if (!eager && 'fetchPriority' in img) img.fetchPriority = 'low';

  const chain = [publishedImageSrc(src), ...fallbacks.map(publishedImageSrc).filter(Boolean)]
    .filter((url, i, arr) => url && arr.indexOf(url) === i);
  img.src = chain[0] || '';

  if (chain.length > 1) {
    let next = 1;
    img.addEventListener('error', () => {
      if (next >= chain.length) return;
      img.src = chain[next];
      next += 1;
    });
  } else if (fallback) {
    img.addEventListener('error', () => {
      if (img.dataset.fallbackApplied === '1') return;
      img.dataset.fallbackApplied = '1';
      img.src = publishedImageSrc(fallback);
    }, { once: true });
  }
}

/** Profile avatar — prefers full source (thumbs optional; see tools/resize-home-assets.mjs). */
export function applyAvatarImage(img, src) {
  if (!img) return;
  img.alt = img.alt || '';
  img.width = AVATAR_THUMB_SIZE;
  img.height = AVATAR_THUMB_SIZE;
  img.decoding = 'async';
  img.loading = 'lazy';
  const full = publishedImageSrc(src);
  const thumb = resolveAvatarThumbSrc(src);
  if (!full && !thumb) return;

  const chain = [full, thumb].filter((url, i, arr) => url && arr.indexOf(url) === i);
  img.src = chain[0] || '';

  if (chain.length > 1) {
    let next = 1;
    img.addEventListener('error', () => {
      if (next >= chain.length) {
        img.removeAttribute('src');
        img.classList.add('profile-avatar-img--missing');
        return;
      }
      img.src = chain[next];
      next += 1;
    });
  } else {
    img.addEventListener('error', () => {
      img.removeAttribute('src');
      img.classList.add('profile-avatar-img--missing');
    }, { once: true });
  }
}

/** Below-fold showcase card images (guest index). */
export function setMarketingImage(img, src) {
  img.decoding = 'async';
  img.loading = 'lazy';
  if (isGuestIndexPath() && 'fetchPriority' in img) img.fetchPriority = 'low';
  img.src = publishedImageSrc(src);
}
