/**
 * Compressed event images — all stock assets live under compressed-events/.
 */

export const COMPRESSED_EVENTS_BASE = '/assets/images/events/compressed-events/';

const DEFAULT_EVENT_FILE = 'evt-hero.avif';

/** Curated stock heroes in compressed-events/ (no evt-hero2 asset). */
export const EVENT_HERO_FILES = [
  'evt-hero.avif',
  'evt-hero1.avif',
  'evt-hero3.avif',
  'evt-hero4.avif',
  'evt-hero5.avif',
  'evt-hero6.avif',
  'evt-hero7.avif',
  'evt-hero8.avif',
  'evt-hero9.avif',
  'evt-hero10.avif',
  'evt-hero11.avif',
  'evt-hero12.avif',
  'evt-hero13.avif',
  'evt-hero14.avif',
  'evt-hero15.avif',
];

/** Event IDs evt-1…evt-10 use evt-N.avif; evt-11/evt-12 use hero stock. */
const EVENT_ID_STOCK_MAP = {
  'evt-11': 'evt-hero11.avif',
  'evt-12': 'evt-hero12.avif',
};

/** Legacy filename → compressed file (evt-hero2 was never shipped). */
const LEGACY_HERO_ALIASES = {
  'evt-hero2.avif': 'evt-hero1.avif',
};

/** Image picker for event create/edit forms — descriptive labels, compressed-events paths. */
export const EVENT_HERO_IMAGE_OPTIONS = [
  { label: 'Photography & visual arts', value: 'events/evt-hero.avif', file: 'evt-hero.avif' },
  { label: 'Sports & active competition', value: 'events/evt-hero1.avif', file: 'evt-hero1.avif' },
  { label: 'Tennis & racquet sports', value: 'events/evt-hero3.avif', file: 'evt-hero3.avif' },
  { label: 'Cricket & field sports', value: 'events/evt-hero4.avif', file: 'evt-hero4.avif' },
  { label: 'Badminton & court games', value: 'events/evt-hero5.avif', file: 'evt-hero5.avif' },
  { label: 'Live showcase / audience moment', value: 'events/evt-hero6.avif', file: 'evt-hero6.avif' },
  { label: 'Guitar, music & live performance', value: 'events/evt-hero7.avif', file: 'evt-hero7.avif' },
  { label: 'Workshop / hands-on craft session', value: 'events/evt-hero8.avif', file: 'evt-hero8.avif' },
  { label: 'Adventure, racing & outdoor thrill', value: 'events/evt-hero9.avif', file: 'evt-hero9.avif' },
  { label: 'Trampoline & active recreation', value: 'events/evt-hero10.avif', file: 'evt-hero10.avif' },
  { label: 'Food, social & casual hangout', value: 'events/evt-hero11.avif', file: 'evt-hero11.avif' },
  { label: 'Gardening & campus green-up', value: 'events/evt-hero12.avif', file: 'evt-hero12.avif' },
  { label: 'Mountain trails / day out', value: 'events/evt-hero13.avif', file: 'evt-hero13.avif' },
  { label: 'Team collaboration / brainstorm', value: 'events/evt-hero14.avif', file: 'evt-hero14.avif' },
  { label: 'Evening celebration / networking', value: 'events/evt-hero15.avif', file: 'evt-hero15.avif' },
];

export const EVENT_STOCK_FALLBACK_POOL = [
  'evt-hero.avif',
  'evt-hero1.avif',
  'evt-hero3.avif',
].map((file) => `${COMPRESSED_EVENTS_BASE}${file}`);

function isStockHeroFile(bare) {
  return bare === 'evt-hero.avif' || /^evt-hero\d+\.avif$/i.test(bare);
}

function isStockEvtFile(bare) {
  return /^evt-(\d+)\.avif$/i.test(bare);
}

function compressedEventFile(filename) {
  const bare = String(filename || '').replace(/^.*\//, '');
  if (!bare) return DEFAULT_EVENT_FILE;
  if (LEGACY_HERO_ALIASES[bare]) return LEGACY_HERO_ALIASES[bare];
  if (isStockHeroFile(bare) || isStockEvtFile(bare)) return bare;
  return bare;
}

export function resolveStockEventFile(filename) {
  return compressedEventFile(filename);
}

export function resolveCompressedStockUrl(filename) {
  return `${COMPRESSED_EVENTS_BASE}${compressedEventFile(filename)}`;
}

/** Resolve imagePath, stock filename, or path segment to a compressed event URL. */
export function resolveEventAssetUrl(fileOrPath) {
  if (!fileOrPath) return `${COMPRESSED_EVENTS_BASE}${DEFAULT_EVENT_FILE}`;
  const str = String(fileOrPath).trim();
  if (str.startsWith('http://') || str.startsWith('https://')) return str;

  if (str.includes('/')) {
    const [baseKey, ...rest] = str.split('/');
    const file = rest.join('/');
    if (baseKey === 'events') {
      return `${COMPRESSED_EVENTS_BASE}${compressedEventFile(file)}`;
    }
    return `/assets/images/${baseKey}/${file}`;
  }

  return `${COMPRESSED_EVENTS_BASE}${compressedEventFile(str)}`;
}

export function resolveEventIdUrl(id) {
  if (!id) return `${COMPRESSED_EVENTS_BASE}${DEFAULT_EVENT_FILE}`;
  const idKey = String(id).toLowerCase();
  if (EVENT_ID_STOCK_MAP[idKey]) {
    return `${COMPRESSED_EVENTS_BASE}${EVENT_ID_STOCK_MAP[idKey]}`;
  }
  const match = idKey.match(/^evt-(\d+)$/);
  if (match) {
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 10) {
      return `${COMPRESSED_EVENTS_BASE}evt-${n}.avif`;
    }
  }
  return `${COMPRESSED_EVENTS_BASE}${compressedEventFile(`${idKey}.avif`)}`;
}

export function getEventImageSrc(ev) {
  if (!ev) return `${COMPRESSED_EVENTS_BASE}${DEFAULT_EVENT_FILE}`;
  if (ev.imagePath) return resolveEventAssetUrl(ev.imagePath);
  if (ev.image) return resolveEventAssetUrl(`events/${ev.image}`);
  if (ev.id) return resolveEventIdUrl(ev.id);
  return `${COMPRESSED_EVENTS_BASE}${DEFAULT_EVENT_FILE}`;
}

if (typeof window !== 'undefined') {
  window.AdobeEventImages = {
    COMPRESSED_EVENTS_BASE,
    EVENT_HERO_FILES,
    EVENT_HERO_IMAGE_OPTIONS,
    EVENT_STOCK_FALLBACK_POOL,
    resolveStockEventFile,
    resolveCompressedStockUrl,
    resolveEventAssetUrl,
    resolveEventIdUrl,
    getEventImageSrc,
  };
}
