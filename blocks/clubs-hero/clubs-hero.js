/**
 * Clubs Hero block — marquee banner with repo background image.
 *
 * da.live table shape (single row, single cell):
 *   | Clubs Hero                                |
 *   | H1: Find your community at Adobe.         |
 *   | P:  Browse communities across Adobe...    |
 *
 * JS adds the background image from the repo and the auth-aware CTA.
 */

const HERO_BG = '/assets/images/events/evt-hero2.avif';

function getAuth() {
  return window.AdobeClubsAuth || { isAuthenticated: () => false };
}

function buildGuestBanner() {
  const banner = document.createElement('div');
  banner.className = 'clubs-hero-banner clubs-hero-banner--guest';
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
  const cell = row.firstElementChild;

  // ── Background image ──────────────────────────────────────────────────────
  const bg = document.createElement('div');
  bg.className = 'clubs-hero-bg';
  const bgImg = document.createElement('img');
  bgImg.src = HERO_BG;
  bgImg.alt = '';
  bgImg.loading = 'eager';
  bgImg.decoding = 'async';
  bg.append(bgImg);

  // ── Foreground text ───────────────────────────────────────────────────────
  const fg = document.createElement('div');
  fg.className = 'clubs-hero-fg';

  const text = document.createElement('div');
  text.className = 'clubs-hero-text';

  if (cell) {
    while (cell.firstElementChild) text.append(cell.firstElementChild);
  }

  // ── Auth-aware CTA ────────────────────────────────────────────────────────
  const loggedIn = getAuth().isAuthenticated();
  const guestBanner = buildGuestBanner();
  const memberBanner = buildMemberBanner();
  guestBanner.hidden = loggedIn;
  memberBanner.hidden = !loggedIn;

  text.append(guestBanner, memberBanner);
  fg.append(text);

  block.textContent = '';
  block.append(bg, fg);
}
