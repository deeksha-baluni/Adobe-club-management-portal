import { getAuth, redirectToLogin } from '../app-data.js';
import { applyCardImage, POSTER_CLUB_SIZE, setMarketingImage } from '../image-priority.js';
import {
  getClubImageSrc,
  getIndexClubImageSrc,
  getPosterClubImageSrc,
  getPosterClubImageFallbacks,
  CLUB_STOCK_FALLBACK_POOL,
} from '../club-images.js';
function clubPageUrl(id) {
  return `/club?id=${encodeURIComponent(id)}`;
}

function formatMemberLabel(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return '';
  return `${n} member${n === 1 ? '' : 's'}`;
}

function joinLabel(clubId) {
  return getAuth().isClubJoined?.(clubId) ? 'Joined' : 'Join';
}

/**
 * @param {object} club
 * @param {{ layout?: 'showcase'|'poster', action?: 'navigate'|'join' }} options
 */
export function buildClubCard(club, { layout = 'showcase', action = 'navigate' } = {}) {
  if (layout === 'poster') {
    return buildPosterClubCard(club, action);
  }
  return buildShowcaseClubCard(club, action);
}

function buildShowcaseClubCard(club, action) {
  const card = document.createElement(action === 'join' ? 'div' : 'a');
  card.className = 'card card--club';
  if (action !== 'join') {
    card.href = clubPageUrl(club.id);
    card.setAttribute('aria-label', club.name);
  } else {
    card.classList.add('card--action');
  }

  const thumb = document.createElement('div');
  thumb.className = 'card-thumb';

  if (club.image) {
    const img = document.createElement('img');
    img.alt = '';
    img.width = 400;
    img.height = 267;
    setMarketingImage(img, getIndexClubImageSrc(club));
    img.onerror = () => {
      if (CLUB_STOCK_FALLBACK_POOL[0]) img.src = CLUB_STOCK_FALLBACK_POOL[0];
    };
    thumb.append(img);
  } else {
    thumb.style.background = club.iconBg || 'var(--color-surface)';
    const icon = document.createElement('span');
    icon.className = 'card-icon';
    icon.textContent = club.icon || '🏢';
    thumb.append(icon);
  }

  const body = document.createElement('div');
  body.className = 'card-body';

  const tag = document.createElement('p');
  tag.className = 'card-tag';
  tag.textContent = club.tag || '';

  const name = document.createElement('h3');
  name.className = 'card-title';
  name.textContent = club.name;

  const members = document.createElement('p');
  members.className = 'card-meta';
  members.textContent = formatMemberLabel(club.members ?? 0);

  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.textContent = club.desc || '';

  body.append(tag, name, members, desc);

  if (action === 'join') {
    const link = document.createElement('a');
    link.className = 'card-link';
    link.href = clubPageUrl(club.id);
    link.setAttribute('aria-label', club.name);
    link.append(thumb, body);
    card.append(link);
    const btnWrap = document.createElement('div');
    btnWrap.className = 'card-actions';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-btn cb-poster-join';
    btn.dataset.clubId = club.id;
    btn.textContent = joinLabel(club.id);
    btnWrap.append(btn);
    card.append(btnWrap);
    return card;
  }

  const btnWrap = document.createElement('div');
  btnWrap.className = 'card-actions';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card-btn';
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
  body.append(btnWrap);
  card.append(thumb, body);
  return card;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPosterClubCard(club, action) {
  const joined = getAuth().isClubJoined?.(club.id);
  const isAdminClub = getAuth().getAdminOf?.().includes(club.id);
  const card = document.createElement('div');
  card.className = 'lp-club-card lp-club-card--action';

  const link = document.createElement('a');
  link.className = 'lp-card-link';
  link.href = clubPageUrl(club.id);

  const thumb = document.createElement('div');
  thumb.className = 'lp-club-thumb';
  const img = document.createElement('img');
  const [, ...fallbacks] = getPosterClubImageFallbacks(club);
  applyCardImage(img, getPosterClubImageSrc(club), {
    width: POSTER_CLUB_SIZE.width,
    height: POSTER_CLUB_SIZE.height,
    fallbacks,
  });
  thumb.append(img);

  const body = document.createElement('div');
  body.className = 'lp-club-body';
  body.innerHTML = `
    <span class="lp-club-tag">${esc(club.tag)}</span>
    <span class="lp-club-name">${esc(club.name)}</span>
    ${formatMemberLabel(club.members) ? `<span class="lp-club-members">${esc(formatMemberLabel(club.members))}</span>` : ''}
    <span class="lp-club-desc">${esc(club.desc)}</span>`;

  link.append(thumb, body);

  const actionWrap = document.createElement('div');
  actionWrap.className = 'lp-card-action';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `cb-poster-join${joined ? ' is-joined' : ''}`;
  btn.dataset.clubId = club.id;
  if (isAdminClub) btn.disabled = true;
  btn.textContent = joinLabel(club.id);
  actionWrap.append(btn);

  card.append(link, actionWrap);
  return card;
}

export { formatMemberLabel, clubPageUrl };
