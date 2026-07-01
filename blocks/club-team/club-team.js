/**
 * Club Team block — original team section.
 */

import {
  esc,
  loadClubScripts,
  resolveClubContext,
  getJoinLabel,
  wireClubJoinButton,
  bindClubJoinSync,
  getAuth,
} from '../club-shared/club-page.js';

const TEAM_IMAGE_BASE = '/assets/images/club_details/team_images/';
const TEAM_IMAGE_FILES = [
  'emp2.avif', 'emp3.avif', 'emp4.avif', 'emp5.avif',
  'emp6.avif', 'emp7.avif', 'emp8.avif',
  'premium_photo-1661297414288-8ed17eb1b3f1.avif',
];
const TEAM_FALLBACK_ROLES = ['Club lead', 'Co-lead', 'Events coordinator', 'Community mentor'];
const TEAM_MEMBER_NAMES = [
  'Alex Josh', 'Jenny Wilson', 'Marcus Reid', 'Priya Sharma',
  'Rohan Kapoor', 'Ananya R.', 'Karthik M.', 'Meera P.',
  'Vikram N.', 'Sneha V.', 'James T.', 'Divya K.',
];

function teamHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickTeamImages(clubId, count = 4) {
  const third = 'emp4.avif';
  const pool = TEAM_IMAGE_FILES.filter((f) => f !== third);
  const sorted = [...pool].sort((a, b) => teamHash(`${clubId}-${a}`) - teamHash(`${clubId}-${b}`));
  const picked = sorted.slice(0, count).map((f) => `${TEAM_IMAGE_BASE}${f}`);
  if (count > 2) picked[2] = `${TEAM_IMAGE_BASE}${third}`;
  return picked;
}

function getTeamMembers(clubId) {
  const images = pickTeamImages(clubId, 4);
  const names = [...TEAM_MEMBER_NAMES]
    .sort((a, b) => teamHash(`${clubId}-name-${a}`) - teamHash(`${clubId}-name-${b}`))
    .slice(0, 4);
  return images.map((image, i) => ({
    image,
    name: names[i] || TEAM_MEMBER_NAMES[i % TEAM_MEMBER_NAMES.length],
    role: TEAM_FALLBACK_ROLES[i] || 'Club member',
  }));
}

function renderTeamCard(member) {
  return `
    <article class="club-team-card">
      <img src="${esc(member.image)}" alt="${esc(member.name)}" loading="lazy" decoding="async">
      <div class="club-team-card-overlay">
        <strong>${esc(member.name)}</strong>
        <span>${esc(member.role)}</span>
      </div>
    </article>`;
}

function renderTeamJoinCard(club, joined, joinLabel, isAdminOfClub) {
  return `
    <article class="club-team-card club-team-card--join">
      <p class="club-team-join-copy">Join our community at ${esc(club.name)}.</p>
      <button type="button" class="club-team-join-btn ${joined ? 'is-joined' : ''}" id="club-detail-join-team"${isAdminOfClub ? ' disabled' : ''}>${esc(joinLabel)} →</button>
    </article>`;
}

export default async function decorate(block) {
  block.innerHTML = '';
  await loadClubScripts();

  let ctx;
  try {
    ctx = await resolveClubContext();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[club-team]', err);
    return;
  }
  if (ctx.error) return;

  const { club } = ctx;
  const joined = getAuth().isClubJoined(club.id);
  const isAdminOfClub = getAuth().getAdminOf().includes(club.id);
  const joinLabel = getJoinLabel(club);
  const members = getTeamMembers(club.id);
  const cards = members.map(renderTeamCard);
  cards.splice(Math.min(2, cards.length), 0, renderTeamJoinCard(club, joined, joinLabel, isAdminOfClub));

  block.innerHTML = `
    <div class="club-detail-page">
      <section class="club-block club-team-block" id="club-team">
        <h2 class="club-section-title">Meet the dedicated team</h2>
        <div class="club-team-grid">${cards.join('')}</div>
      </section>
    </div>`;

  bindClubJoinSync(club);
  wireClubJoinButton(block.querySelector('#club-detail-join-team'), club);
}
