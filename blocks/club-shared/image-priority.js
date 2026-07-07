/**
 * LCP image preload helper (guest index).
 */

export function isGuestIndexPath() {
  const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
  return path === '/' || path === '/index';
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

/** Below-fold card images — lazy + low priority on guest index. */
export function setMarketingImage(img, src) {
  img.decoding = 'async';
  img.loading = 'lazy';
  if (isGuestIndexPath() && 'fetchPriority' in img) img.fetchPriority = 'low';
  img.src = src;
}
