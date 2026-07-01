/**
 * Club Detail block — full club page rendered from data.json.
 *
 * da.live: empty block
 *   | Club Detail |
 *   | (empty)     |
 *
 * URL: /club?id=adobe-lens  or  /clubs/adobe-lens (with redirect)
 */

import { initClubDetailPage } from './club-detail-core.js';

function loadScript(src) {
  return new Promise((resolve) => {
    if ([...document.scripts].some((s) => s.src.includes(src))) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.append(script);
  });
}

export default async function decorate(block) {
  // Clear EDS-generated row/cell wrappers, replace with our root
  block.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'club-detail-root';
  root.id = 'club-detail-root';
  block.append(root);

  // Load scripts in parallel before rendering
  await Promise.all([
    loadScript('/scripts/club-meta.js'),
    loadScript('/scripts/auth-guard.js'),
  ]);

  await initClubDetailPage(root);
}
