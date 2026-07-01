/**
 * Clubs Hero block — split layout (text left, image right).
 *
 * da.live — either layout works:
 *   2-col: empty | H1 + P        OR        H1 + P | empty
 *   1-col: H1 + P only
 *
 * JS always renders: content left, repo image right.
 */

const HERO_IMG_SRC = '/assets/images/events/evt-hero2.avif';

function getAuth() {
  return window.AdobeClubsAuth || { isAuthenticated: () => false };
}

/** Pick whichever table cell actually holds the authored text. */
function findContentCell(row) {
  const cells = [...row.children];
  if (!cells.length) return null;
  return cells.find((c) => c.querySelector('h1, h2, h3, p')) || cells[0];
}

function buildGuestBanner() {
  const banner = document.createElement('div');
  banner.className = 'clubs-hero-banner';
  banner.id = 'clubs-guest-banner';

  const msg = document.createElement('span');
  msg.className = 'clubs-hero-banner-msg';
  msg.innerHTML = "You're browsing as a guest. <strong>Sign in</strong> to join clubs and get personalised recommendations.";

  const actions = document.createElement('div');
  actions.className = 'clubs-hero-banner-actions';

  const signIn = document.createElement('a');
  signIn.href = '/login';
  signIn.className = 'clubs-hero-banner-btn clubs-hero-banner-btn--primary';
  signIn.textContent = 'Sign in';

  const create = document.createElement('a');
  create.href = '/login#signup';
  create.className = 'clubs-hero-banner-btn';
  create.textContent = 'Create account';

  actions.append(signIn, create);
  banner.append(msg, actions);
  return banner;
}

function buildMemberBanner() {
  const banner = document.createElement('div');
  banner.className = 'clubs-hero-banner clubs-hero-banner--member';
  banner.id = 'clubs-member-cta';

  const copy = document.createElement('div');
  copy.className = 'clubs-hero-banner-copy';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'clubs-hero-banner-eyebrow';
  eyebrow.textContent = 'Start something new';

  const msg = document.createElement('p');
  msg.className = 'clubs-hero-banner-msg';
  msg.innerHTML = "Don't see your community? <span>Request a new club</span> and we'll review it.";

  copy.append(eyebrow, msg);

  const actions = document.createElement('div');
  actions.className = 'clubs-hero-banner-actions';

  const createBtn = document.createElement('button');
  createBtn.type = 'button';
  createBtn.className = 'clubs-hero-banner-btn clubs-hero-banner-btn--primary';
  createBtn.id = 'clubs-create-club';
  createBtn.textContent = 'Create a club';
  createBtn.addEventListener('click', () => {
    window.AdobeClubRequest?.openCreateClubForm?.();
  });

  actions.append(createBtn);
  banner.append(copy, actions);
  return banner;
}

export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const contentCell = findContentCell(row);

  // ── Content (left) ──────────────────────────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'clubs-hero-content';

  const text = document.createElement('div');
  text.className = 'clubs-hero-text';

  if (contentCell) {
    while (contentCell.firstElementChild) text.append(contentCell.firstElementChild);
  }

  const cta = document.createElement('div');
  cta.className = 'clubs-hero-cta';

  const loggedIn = getAuth().isAuthenticated();
  const guestBanner = buildGuestBanner();
  const memberBanner = buildMemberBanner();
  guestBanner.hidden = loggedIn;
  memberBanner.hidden = !loggedIn;
  cta.append(guestBanner, memberBanner);

  text.append(cta);
  content.append(text);

  // ── Media (right) ───────────────────────────────────────────────────────────
  const media = document.createElement('div');
  media.className = 'clubs-hero-media';

  const img = document.createElement('img');
  img.src = HERO_IMG_SRC;
  img.alt = '';
  img.loading = 'eager';
  img.decoding = 'async';
  media.append(img);

  block.textContent = '';
  block.append(content, media);
}
