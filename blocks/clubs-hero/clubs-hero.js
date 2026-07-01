/**
 * Clubs Hero block — split layout (text left, image right).
 *
 * da.live table shape (2 columns):
 *   | Clubs Hero |                                      |
 *   | (empty)    | H1: Find your community at Adobe.    |
 *   |            | P:  Browse communities across Adobe… |
 *
 * Left cell is empty — JS injects repo image on the right.
 * Content cell (right) is moved to the left side on render.
 */

const HERO_IMG_SRC = '/assets/images/events/evt-hero2.avif';

function getAuth() {
  return window.AdobeClubsAuth || { isAuthenticated: () => false };
}

function buildGuestBanner() {
  const banner = document.createElement('div');
  banner.className = 'clubs-hero-banner';
  banner.id = 'clubs-guest-banner';

  const msg = document.createElement('p');
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

  const eyebrow = document.createElement('p');
  eyebrow.className = 'clubs-hero-banner-eyebrow';
  eyebrow.textContent = 'Start something new';

  const msg = document.createElement('p');
  msg.className = 'clubs-hero-banner-msg';
  msg.innerHTML = "Don't see your community? <span>Request a new club</span> and we'll review it.";

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
  banner.append(eyebrow, msg, actions);
  return banner;
}

export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const [leftCell, rightCell] = [...row.children];
  // Convention mirrors landing-hero: da.live col 1 = empty, col 2 = text
  const contentCell = rightCell || leftCell;

  // ── Content (left on desktop) ─────────────────────────────────────────────
  const content = document.createElement('div');
  content.className = 'clubs-hero-content';

  if (contentCell) {
    while (contentCell.firstElementChild) content.append(contentCell.firstElementChild);
  }

  // Auth-aware banner below the text
  const loggedIn = getAuth().isAuthenticated();
  const guestBanner = buildGuestBanner();
  const memberBanner = buildMemberBanner();
  guestBanner.hidden = loggedIn;
  memberBanner.hidden = !loggedIn;
  content.append(guestBanner, memberBanner);

  // ── Media (right on desktop) ──────────────────────────────────────────────
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
