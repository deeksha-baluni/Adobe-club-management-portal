/**
 * Compressed club images — serves assets from compressed-clubs/.
 */

import { resolveEventAssetUrl } from './event-images.js';

export const COMPRESSED_CLUBS_BASE = '/assets/images/clubs/compressed-clubs/';
export const CLUBS_BASE = '/assets/images/clubs/';

const DEFAULT_CLUB_FILE = 'adobe-lens.avif';

/** Legacy filenames that map to a file present in compressed-clubs/. */
const CLUB_FILE_ALIASES = {
  'clubs-hero1.avif': 'adobe-lens.avif',
  'clubs-hero3.avif': 'games.avif',
  'dev-grp.avif': 'dev-guild.avif',
};

export const CLUB_STOCK_FALLBACK_POOL = [
  'adobe-lens.avif',
  'adobe-creatives.avif',
  'sportzone.avif',
].map((file) => `${COMPRESSED_CLUBS_BASE}${file}`);

/** Club images offered alongside event heroes in admin pickers. */
export const CLUB_PICKER_OPTIONS = [
  { label: 'Photography & visual arts', value: 'clubs/adobe-lens.avif' },
  { label: 'Creative design & illustration', value: 'clubs/adobe-creatives.avif' },
  { label: 'Tech, coding & engineering', value: 'clubs/dev-guild.avif' },
  { label: 'Sports, fitness & recreation', value: 'clubs/sportzone.avif' },
  { label: 'Reading, books & knowledge', value: 'clubs/readers.avif' },
  { label: 'Games, strategy & fun', value: 'clubs/games.avif' },
  { label: 'Nature, green & eco efforts', value: 'clubs/green-adobe.avif' },
  { label: 'Community service & volunteering', value: 'clubs/volunteer.avif' },
  { label: 'Mental health & wellbeing', value: 'clubs/wellbeing.avif' },
  { label: 'Food culture & tasting', value: 'clubs/food.avif' },
];

export function resolveClubFilename(filename) {
  const bare = String(filename || '').replace(/^.*\//, '');
  if (!bare) return DEFAULT_CLUB_FILE;
  if (bare.startsWith('evt-hero')) return null;
  return CLUB_FILE_ALIASES[bare] || bare;
}

export function resolveClubAssetUrl(fileOrPath) {
  if (!fileOrPath) return `${COMPRESSED_CLUBS_BASE}${DEFAULT_CLUB_FILE}`;
  const str = String(fileOrPath).trim();
  if (str.startsWith('http://') || str.startsWith('https://')) return str;

  if (str.includes('/')) {
    const [baseKey, ...rest] = str.split('/');
    const file = rest.join('/');
    if (baseKey === 'clubs') {
      const resolved = resolveClubFilename(file);
      if (resolved === null) return resolveEventAssetUrl(`events/${file}`);
      return `${COMPRESSED_CLUBS_BASE}${resolved}`;
    }
    if (baseKey === 'events') return resolveEventAssetUrl(str);
    return `/assets/images/${baseKey}/${file}`;
  }

  const resolved = resolveClubFilename(str);
  if (resolved === null) return resolveEventAssetUrl(`events/${str}`);
  return `${COMPRESSED_CLUBS_BASE}${resolved}`;
}

export function getClubImageSrc(club) {
  if (!club) return `${COMPRESSED_CLUBS_BASE}${DEFAULT_CLUB_FILE}`;
  const file = club.image || `${club.id}.avif`;
  return resolveClubAssetUrl(file);
}

if (typeof window !== 'undefined') {
  window.AdobeClubImages = {
    COMPRESSED_CLUBS_BASE,
    CLUBS_BASE,
    CLUB_STOCK_FALLBACK_POOL,
    CLUB_PICKER_OPTIONS,
    resolveClubFilename,
    resolveClubAssetUrl,
    getClubImageSrc,
  };
}
