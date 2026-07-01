/**
 * Featured Clubs block — fetches /data/data.json, renders top 3 clubs.
 *
 * da.live table shape:
 *   | Featured Clubs |                        |
 *   | Featured clubs (H2) | Browse all clubs → (link) |
 */

const DATA_PATH = '/data/data.json';
const CLUB_IMG_PATH = '/assets/images/clubs/';

async function fetchData() {
  try {
    const resp = await fetch(DATA_PATH);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

function buildClubCard(club) {
  const card = document.createElement('a');
  card.className = 'featured-club-card';
  card.href = `/clubs/${club.id}`;
  card.setAttribute('aria-label', club.name);

  const thumb = document.createElement('div');
  thumb.className = 'featured-club-thumb';

  if (club.image) {
    const img = document.createElement('img');
    img.src = `${CLUB_IMG_PATH}${club.image}`;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => { img.src = ''; thumb.style.background = club.iconBg || 'var(--color-surface)'; };
    thumb.append(img);
  } else {
    thumb.style.background = club.iconBg || 'var(--color-surface)';
    const icon = document.createElement('span');
    icon.className = 'featured-club-icon';
    icon.textContent = club.icon || '🏢';
    thumb.append(icon);
  }

  const body = document.createElement('div');
  body.className = 'featured-club-body';

  const tag = document.createElement('p');
  tag.className = 'featured-club-tag';
  tag.textContent = club.tag || '';

  const name = document.createElement('h3');
  name.className = 'featured-club-name';
  name.textContent = club.name;

  const members = document.createElement('p');
  members.className = 'featured-club-members';
  members.textContent = `${club.members ?? 0} members`;

  const desc = document.createElement('p');
  desc.className = 'featured-club-desc';
  desc.textContent = club.desc || '';

  const btnWrap = document.createElement('div');
  btnWrap.className = 'featured-club-btn';
  const btn = document.createElement('a');
  btn.href = `/clubs/${club.id}`;
  btn.textContent = 'Join';
  btnWrap.append(btn);

  body.append(tag, name, members, desc, btnWrap);
  card.append(thumb, body);
  return card;
}

export default async function decorate(block) {
  const headingEl = block.querySelector('h2, h3');
  const linkEl = block.querySelector('a[href]');

  // ── Section head ────────────────────────────────────────────────────────
  const head = document.createElement('div');
  head.className = 'featured-clubs-head';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'featured-clubs-eyebrow';
  eyebrow.textContent = 'Clubs';

  const heading = document.createElement('h2');
  heading.className = 'featured-clubs-heading';
  heading.textContent = headingEl?.textContent.trim() || 'Featured clubs';

  const seeAll = document.createElement('a');
  seeAll.className = 'featured-clubs-link';
  seeAll.href = linkEl?.href || '/clubs';
  seeAll.textContent = linkEl?.textContent.trim() || 'Browse all clubs →';

  head.append(eyebrow, heading, seeAll);

  // ── Grid ─────────────────────────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'featured-clubs-grid';

  block.textContent = '';
  block.append(head, grid);

  // ── Data ──────────────────────────────────────────────────────────────────
  const data = await fetchData();
  if (!data?.clubs?.length) {
    const msg = document.createElement('p');
    msg.className = 'featured-clubs-empty';
    msg.textContent = 'Clubs coming soon.';
    grid.append(msg);
    return;
  }

  [...data.clubs]
    .sort((a, b) => (b.members ?? 0) - (a.members ?? 0))
    .slice(0, 3)
    .forEach((club) => grid.append(buildClubCard(club)));
}
