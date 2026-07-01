/**
 * Shared data loader — cached so both club-hero and club-detail
 * blocks only fetch /data/data.json once per page load.
 */

let cache = null;
let pending = null;

export async function getClubData() {
  if (cache) return cache;
  if (!pending) {
    pending = fetch('/data/data.json').then((r) => {
      if (!r.ok) throw new Error(`data.json fetch failed: ${r.status}`);
      return r.json();
    });
  }
  cache = await pending;
  return cache;
}

export function getClubIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || '';
}
