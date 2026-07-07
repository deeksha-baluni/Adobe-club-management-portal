/**
 * Showcase Teaser — clubs preset (top 3 from data.json).
 */
import { fetchAppData, getAuth, redirectToLogin } from '../club-shared/fetch-app-data.js';
import { setMarketingImage } from '../club-shared/image-priority.js';
import { getClubImageSrc, CLUB_STOCK_FALLBACK_POOL } from '../club-shared/club-images.js';
import { buildSectionHead } from '../club-shared/marketing-head.js';
import { cfg } from '../club-shared/block-config.js';

export const CLUBS_DEFAULTS = {
  preset: 'clubs',
  eyebrow: 'Clubs',
  title: 'Featured clubs',
  'link-text': 'Browse all clubs →',
  'link-href': '/clubs',
};

function clubPageUrl(id) {
  return `/club?id=${encodeURIComponent(id)}`;
}

function buildClubCard(club) {
  const card = document.createElement('a');
  card.className = 'showcase-card showcase-card--club';
  card.href = clubPageUrl(club.id);
  card.setAttribute('aria-label', club.name);

  const thumb = document.createElement('div');
  thumb.className = 'showcase-card-thumb';

  if (club.image) {
    const img = document.createElement('img');
    img.alt = '';
    img.width = 400;
    img.height = 300;
    setMarketingImage(img, getClubImageSrc(club));
    img.onerror = () => {
      if (CLUB_STOCK_FALLBACK_POOL[0]) img.src = CLUB_STOCK_FALLBACK_POOL[0];
    };
    thumb.append(img);
  } else {
    thumb.style.background = club.iconBg || 'var(--color-surface)';
    const icon = document.createElement('span');
    icon.className = 'showcase-card-icon';
    icon.textContent = club.icon || '🏢';
    thumb.append(icon);
  }

  const body = document.createElement('div');
  body.className = 'showcase-card-body';

  const tag = document.createElement('p');
  tag.className = 'showcase-card-tag';
  tag.textContent = club.tag || '';

  const name = document.createElement('h3');
  name.className = 'showcase-card-title';
  name.textContent = club.name;

  const members = document.createElement('p');
  members.className = 'showcase-card-meta';
  members.textContent = `${club.members ?? 0} members`;

  const desc = document.createElement('p');
  desc.className = 'showcase-card-desc';
  desc.textContent = club.desc || '';

  const btnWrap = document.createElement('div');
  btnWrap.className = 'showcase-card-actions';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'showcase-card-btn';
  btn.textContent = 'Join';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!getAuth().isAuthenticated()) {
      redirectToLogin();
      return;
    }
    window.location.href = clubPageUrl(club.id);
  });
  btnWrap.append(btn);

  body.append(tag, name, members, desc, btnWrap);
  card.append(thumb, body);
  return card;
}

export default async function decorateClubs(block, config) {
  const eyebrow = cfg(config, 'eyebrow', CLUBS_DEFAULTS.eyebrow);
  const title = cfg(config, 'title', CLUBS_DEFAULTS.title);
  const linkText = cfg(config, 'link-text', CLUBS_DEFAULTS['link-text']);
  const linkHref = cfg(config, 'link-href', CLUBS_DEFAULTS['link-href']);

  block.textContent = '';
  block.classList.add('showcase-teaser', 'showcase-teaser--clubs');

  const head = buildSectionHead({
    eyebrow,
    title,
    linkText,
    linkHref,
    classPrefix: 'showcase',
  });

  const grid = document.createElement('div');
  grid.className = 'showcase-grid';

  block.append(head, grid);

  const data = await fetchAppData();
  if (!data?.clubs?.length) {
    const msg = document.createElement('p');
    msg.className = 'showcase-empty';
    msg.textContent = 'Clubs coming soon.';
    grid.append(msg);
    return;
  }

  [...data.clubs]
    .sort((a, b) => (b.members ?? 0) - (a.members ?? 0))
    .slice(0, 3)
    .forEach((club) => grid.append(buildClubCard(club)));
}
