/**
 * Events Hero block — split layout (text left, image right).
 *
 * da.live — either layout works:
 *   2-col: empty | H1 + P        OR        H1 + P | empty
 *   1-col: H1 + P only
 *
 * JS always renders: content left, repo image right.
 */

const HERO_IMG_SRC = '/assets/images/events/evt-hero3.avif';

function getAuth() {
  return window.AdobeClubsAuth || { isAuthenticated: () => false };
}

function findContentCell(row) {
  const cells = [...row.children];
  if (!cells.length) return null;
  return cells.find((c) => c.querySelector('h1, h2, h3, p')) || cells[0];
}

function buildGuestBanner() {
  const banner = document.createElement('div');
  banner.className = 'events-hero-banner events-hero-banner--guest';
  banner.id = 'events-guest-banner';

  const copy = document.createElement('div');
  copy.className = 'events-hero-banner-copy';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'events-hero-banner-eyebrow';
  eyebrow.textContent = 'Stay in the loop';

  const msg = document.createElement('p');
  msg.className = 'events-hero-banner-msg';
  msg.innerHTML = "You're browsing as a guest. <strong>Sign in</strong> to RSVP for events and track what you're attending.";

  copy.append(eyebrow, msg);

  const actions = document.createElement('div');
  actions.className = 'events-hero-banner-actions';

  const signIn = document.createElement('a');
  signIn.href = '/login';
  signIn.className = 'events-hero-banner-btn events-hero-banner-btn--primary';
  signIn.textContent = 'Sign in';

  const create = document.createElement('a');
  create.href = '/login#signup';
  create.className = 'events-hero-banner-btn events-hero-banner-btn--outline';
  create.textContent = 'Create account';

  actions.append(signIn, create);
  banner.append(copy, actions);
  return banner;
}

export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const contentCell = findContentCell(row);

  const content = document.createElement('div');
  content.className = 'events-hero-content';

  const text = document.createElement('div');
  text.className = 'events-hero-text';

  if (contentCell) {
    while (contentCell.firstElementChild) text.append(contentCell.firstElementChild);
  }

  const cta = document.createElement('div');
  cta.className = 'events-hero-cta';

  const guestBanner = buildGuestBanner();
  guestBanner.hidden = getAuth().isAuthenticated();
  cta.append(guestBanner);

  text.append(cta);
  content.append(text);

  const media = document.createElement('div');
  media.className = 'events-hero-media';

  const img = document.createElement('img');
  img.src = HERO_IMG_SRC;
  img.alt = '';
  img.loading = 'eager';
  img.decoding = 'async';
  media.append(img);

  block.textContent = '';
  block.append(content, media);
}
