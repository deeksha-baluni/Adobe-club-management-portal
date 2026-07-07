/**
 * Landing Hero — unified split hero for index, events, and clubs list pages.
 *
 * Table mode (index):
 *   | Landing Hero |              |
 *   | hero image   | content cell |
 *
 * Config mode (events / clubs):
 *   | preset       | events | clubs |
 *   | eyebrow      | ...    |
 *   | title        | ...    |
 *   | description  | ...    |
 *   | image        | upload or path |
 */
import { loadCSS, loadScript, toClassName } from '../../scripts/aem.js';
import { preloadLcpImage, publishedImageSrc } from '../club-shared/image-priority.js';
import { resolveCompressedStockUrl } from '../club-shared/event-images.js';
import { readPageConfig, cfg } from '../club-shared/block-config.js';

const CONFIG_KEYS = new Set([
  'preset', 'eyebrow', 'title', 'description', 'image', 'image-alt',
  'hero-alt', 'hero-fallback',
  'guest-banner-eyebrow', 'guest-banner-text',
  'guest-sign-in-text', 'guest-sign-in-href',
  'guest-create-text', 'guest-create-href',
  'member-banner-eyebrow', 'member-banner-text', 'member-cta-text',
]);

const PRESET_DEFAULTS = {
  index: {
    preset: 'index',
    'hero-alt': 'Adobe colleagues at a club event',
    'hero-fallback': '',
  },
  events: {
    preset: 'events',
    eyebrow: "What's on",
    title: 'Discover club events',
    description: 'Browse upcoming sessions across Adobe Clubs — RSVP in seconds, track what you attend, and revisit past event recaps.',
    image: resolveCompressedStockUrl('evt-hero3.avif'),
    'image-alt': 'Adobe colleagues at a club event',
    'guest-banner-eyebrow': 'Stay in the loop',
    'guest-banner-text': "You're browsing as a guest. Sign in to RSVP for events and track what you're attending.",
    'guest-sign-in-text': 'Sign in',
    'guest-sign-in-href': '/login',
    'guest-create-text': 'Create account',
    'guest-create-href': '/login#signup',
  },
  clubs: {
    preset: 'clubs',
    eyebrow: 'Adobe Clubs',
    title: 'Find your community',
    description: 'Browse every club at Adobe, discover events that match your interests, and join the communities that fit you.',
    image: resolveCompressedStockUrl('evt-hero1.avif'),
    'image-alt': 'Adobe colleagues at a club event',
    'guest-banner-eyebrow': 'Join the community',
    'guest-banner-text': "You're browsing as a guest. Sign in to join clubs and get personalised recommendations.",
    'guest-sign-in-text': 'Sign in',
    'guest-sign-in-href': '/login',
    'guest-create-text': 'Create account',
    'guest-create-href': '/login#signup',
    'member-banner-eyebrow': 'Start something new',
    'member-banner-text': "Don't see your community? Request a new club and we'll review it.",
    'member-cta-text': 'Create a club',
  },
};

let clubsDepsLoaded = false;

function codeBase() {
  return window.hlx?.codeBasePath || '';
}

function getAuth() {
  return window.AdobeClubsAuth || { isAuthenticated: () => false };
}

function normalizePath(path) {
  const raw = (path || '/').replace(/\.html$/, '') || '/';
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function isTableMode(block) {
  const row = block.firstElementChild;
  if (!row || row.children.length < 2) return false;
  const [left, right] = [...row.children];
  const leftKey = toClassName(left?.textContent?.trim() || '');
  if (CONFIG_KEYS.has(leftKey)) return false;
  return Boolean(
    left?.querySelector('picture, img')
    || right?.querySelector('h1, h2, h3, h4, h5, h6, .button-wrapper, ul')
  );
}

/** Optional key | value rows after the main hero row (index table mode). */
function readIndexExtras(block) {
  const config = {};
  [...block.children].slice(1).forEach((row) => {
    const cols = [...row.children];
    if (cols.length < 2) return;
    const key = toClassName(cols[0].textContent);
    if (!key) return;
    const valCell = cols[1];
    const img = valCell.querySelector('img');
    config[key] = img?.src ? img.src : valCell.textContent.trim();
  });
  return config;
}

function resolvePreset(config, tableMode) {
  const explicit = cfg(config, 'preset', '').toLowerCase();
  if (explicit === 'index' || explicit === 'events' || explicit === 'clubs') return explicit;
  if (tableMode) return 'index';
  const path = normalizePath(window.location.pathname);
  if (path === '/clubs') return 'clubs';
  if (path === '/events') return 'events';
  return 'events';
}

async function loadClubsDependencies() {
  if (clubsDepsLoaded) return;
  const base = codeBase();
  await Promise.all([
    loadCSS(`${base}/styles/user-features.css`),
    loadScript(`${base}/scripts/club-request-prompt.js`),
  ]);
  clubsDepsLoaded = true;
}

function prepareHeroImage(img, preset = 'index') {
  if (!img) return;
  img.loading = 'eager';
  img.decoding = 'async';
  if ('fetchPriority' in img) img.fetchPriority = 'high';
  if (!img.getAttribute('width')) {
    img.setAttribute('width', preset === 'index' ? '960' : '800');
  }
  if (!img.getAttribute('height')) {
    img.setAttribute('height', preset === 'index' ? '540' : '500');
  }
}

function mountHeroImage(src, alt, preset = 'index') {
  const img = document.createElement('img');
  img.src = publishedImageSrc(src);
  img.alt = alt;
  prepareHeroImage(img, preset);
  return img;
}

/** Reuse da.live picture/img when present — avoids re-fetch and layout swap on decorate. */
function adoptHeroMedia(mediaCell, src, alt, preset = 'index') {
  const media = document.createElement('div');
  media.className = 'landing-hero-media';
  const picture = mediaCell?.querySelector('picture');
  const authoredImg = mediaCell?.querySelector('picture img, img');
  const cleanSrc = publishedImageSrc(src || authoredImg?.src);

  if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      img.alt = alt || img.alt || '';
      if (cleanSrc) img.src = cleanSrc;
      prepareHeroImage(img, preset);
    }
    media.append(picture);
    return media;
  }

  if (authoredImg) {
    authoredImg.alt = alt || authoredImg.alt || '';
    if (cleanSrc) authoredImg.src = cleanSrc;
    prepareHeroImage(authoredImg, preset);
    media.append(authoredImg);
    return media;
  }

  if (cleanSrc) media.append(mountHeroImage(cleanSrc, alt, preset));
  return media;
}

function buildMedia(src, alt, preset = 'index') {
  const media = document.createElement('div');
  media.className = 'landing-hero-media';
  const cleanSrc = publishedImageSrc(src);
  if (cleanSrc) media.append(mountHeroImage(cleanSrc, alt, preset));
  return media;
}

function buildStats(ul) {
  const row = document.createElement('div');
  row.className = 'landing-hero-stats';
  row.setAttribute('role', 'list');
  row.setAttribute('aria-label', 'Community at a glance');

  ul.querySelectorAll('li').forEach((li) => {
    const stat = document.createElement('div');
    stat.className = 'landing-hero-stat';
    stat.setAttribute('role', 'listitem');

    const strong = li.querySelector('strong');
    const num = document.createElement('strong');
    num.textContent = strong ? strong.textContent.trim() : '';

    const label = document.createElement('span');
    label.textContent = li.textContent.replace(num.textContent, '').trim();

    stat.append(num, label);
    row.append(stat);
  });

  return row;
}

/** Pull a button row out of da.live cell wrappers (p or single-child div > p). */
function extractButtonWrapper(el) {
  if (!el) return null;
  if (el.classList.contains('button-wrapper')) return el;
  if (el.tagName === 'P' && el.querySelector('a[href]')) {
    el.classList.add('button-wrapper');
    return el;
  }
  if (el.tagName === 'DIV' && el.children.length === 1) {
    return extractButtonWrapper(el.firstElementChild);
  }
  return null;
}

/** Ensure all index CTAs sit in one horizontal .landing-hero-actions row. */
function consolidateIndexActions(content) {
  const stats = content.querySelector(':scope > .landing-hero-stats');
  let actions = content.querySelector(':scope > .landing-hero-actions');

  const orphans = [...content.children].filter((el) => {
    if (el === actions || el === stats) return false;
    if (el.classList.contains('landing-hero-eyebrow')) return false;
    if (el.classList.contains('landing-hero-title')) return false;
    if (el.classList.contains('landing-hero-subtitle')) return false;
    return Boolean(extractButtonWrapper(el));
  });

  if (!orphans.length && !actions) return;

  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'landing-hero-actions';
  }

  orphans.forEach((el) => {
    const btn = extractButtonWrapper(el);
    if (!btn) return;
    if (btn.parentElement !== content) el.remove();
    actions.append(btn);
  });

  if (stats) {
    content.insertBefore(actions, stats);
  } else if (!actions.parentElement) {
    content.append(actions);
  }

  normalizeIndexActionButtons(content);
}

/** First index CTA = blue primary pill; rest = outline secondary. */
function normalizeIndexActionButtons(content) {
  const actions = content.querySelector(':scope > .landing-hero-actions');
  if (!actions) return;

  [...actions.querySelectorAll('a[href]')].forEach((link, index) => {
    link.classList.add('button');
    link.classList.remove('primary', 'secondary', 'accent');
    link.classList.add(index === 0 ? 'primary' : 'secondary');
  });
}

function buildGuestBanner(config, defaults, id) {
  const banner = document.createElement('div');
  banner.className = 'landing-hero-banner landing-hero-banner--guest';
  banner.id = id;

  const copy = document.createElement('div');
  copy.className = 'landing-hero-banner-copy';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'landing-hero-banner-eyebrow';
  eyebrow.textContent = cfg(config, 'guest-banner-eyebrow', defaults['guest-banner-eyebrow']);

  const msg = document.createElement('p');
  msg.className = 'landing-hero-banner-msg';
  msg.textContent = cfg(config, 'guest-banner-text', defaults['guest-banner-text']);

  copy.append(eyebrow, msg);

  const actions = document.createElement('div');
  actions.className = 'landing-hero-banner-actions';

  const signIn = document.createElement('a');
  signIn.href = cfg(config, 'guest-sign-in-href', defaults['guest-sign-in-href']);
  signIn.className = 'landing-hero-banner-btn landing-hero-banner-btn--primary';
  signIn.textContent = cfg(config, 'guest-sign-in-text', defaults['guest-sign-in-text']);

  const create = document.createElement('a');
  create.href = cfg(config, 'guest-create-href', defaults['guest-create-href']);
  create.className = 'landing-hero-banner-btn landing-hero-banner-btn--outline';
  create.textContent = cfg(config, 'guest-create-text', defaults['guest-create-text']);

  actions.append(signIn, create);
  banner.append(copy, actions);
  return banner;
}

function buildMemberBanner(config, defaults) {
  const banner = document.createElement('div');
  banner.className = 'landing-hero-banner landing-hero-banner--member';
  banner.id = 'clubs-member-cta';

  const copy = document.createElement('div');
  copy.className = 'landing-hero-banner-copy';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'landing-hero-banner-eyebrow';
  eyebrow.textContent = cfg(config, 'member-banner-eyebrow', defaults['member-banner-eyebrow']);

  const msg = document.createElement('p');
  msg.className = 'landing-hero-banner-msg';
  msg.textContent = cfg(config, 'member-banner-text', defaults['member-banner-text']);

  copy.append(eyebrow, msg);

  const actions = document.createElement('div');
  actions.className = 'landing-hero-banner-actions';

  const createBtn = document.createElement('button');
  createBtn.type = 'button';
  createBtn.className = 'landing-hero-banner-btn landing-hero-banner-btn--primary';
  createBtn.id = 'clubs-create-club';
  createBtn.textContent = cfg(config, 'member-cta-text', defaults['member-cta-text']);
  createBtn.addEventListener('click', () => {
    window.AdobeClubRequest?.openCreateClubForm?.();
  });

  actions.append(createBtn);
  banner.append(copy, actions);
  return banner;
}

function buildIndexFromTable(block, config, defaults) {
  const row = block.firstElementChild;
  const [mediaCell, contentCell] = [...row.children];

  const authoredImg = mediaCell?.querySelector('picture img, img');
  const alt = authoredImg?.alt || cfg(config, 'hero-alt', defaults['hero-alt']);
  const src = publishedImageSrc(authoredImg?.src)
    || cfg(config, 'hero-fallback', defaults['hero-fallback']);
  const media = adoptHeroMedia(mediaCell, src, alt, 'index');

  const content = document.createElement('div');
  content.className = 'landing-hero-content';

  if (contentCell) {
    let headingFound = false;
    let eyebrowDone = false;
    let subtitleDone = false;
    const pendingButtons = [];

    const flushButtons = (target) => {
      if (!pendingButtons.length) return;
      const actions = document.createElement('div');
      actions.className = 'landing-hero-actions';
      pendingButtons.forEach((b) => actions.append(b));
      target.append(actions);
      pendingButtons.length = 0;
    };

    [...contentCell.children].forEach((el) => {
      if (/^H[1-6]$/.test(el.tagName)) {
        headingFound = true;
        el.className = 'landing-hero-title';
        content.append(el);
      } else if (el.tagName === 'P' && !el.classList.length && !el.querySelector('a[href]')) {
        if (!headingFound && !eyebrowDone) {
          el.className = 'landing-hero-eyebrow';
          eyebrowDone = true;
        } else if (headingFound && !subtitleDone) {
          el.className = 'landing-hero-subtitle';
          subtitleDone = true;
        }
        content.append(el);
      } else if (el.tagName === 'UL') {
        flushButtons(content);
        content.append(buildStats(el));
      } else {
        const btn = extractButtonWrapper(el);
        if (btn) {
          pendingButtons.push(btn);
        } else {
          content.append(el);
        }
      }
    });

    flushButtons(content);
    consolidateIndexActions(content);
  }

  return { content, media };
}

function buildFromConfig(config, defaults, preset) {
  const content = document.createElement('div');
  content.className = 'landing-hero-content';

  const text = document.createElement('div');
  text.className = 'landing-hero-text';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'landing-hero-eyebrow';
  eyebrow.textContent = cfg(config, 'eyebrow', defaults.eyebrow);

  const title = document.createElement('h1');
  title.className = 'landing-hero-title';
  title.textContent = cfg(config, 'title', defaults.title);

  const desc = document.createElement('p');
  desc.className = 'landing-hero-subtitle';
  desc.textContent = cfg(config, 'description', defaults.description);

  text.append(eyebrow, title, desc);

  if (preset === 'events' || preset === 'clubs') {
    const cta = document.createElement('div');
    cta.className = 'landing-hero-cta';
    const loggedIn = getAuth().isAuthenticated();

    const guestBanner = buildGuestBanner(
      config,
      defaults,
      preset === 'events' ? 'events-guest-banner' : 'clubs-guest-banner',
    );
    guestBanner.hidden = loggedIn;
    cta.append(guestBanner);

    if (preset === 'clubs') {
      const memberBanner = buildMemberBanner(config, defaults);
      memberBanner.hidden = !loggedIn;
      cta.append(memberBanner);
    }

    text.append(cta);
  }

  content.append(text);

  const alt = cfg(config, 'image-alt', defaults['image-alt'] || defaults['hero-alt']);
  const src = cfg(config, 'image', defaults.image || defaults['hero-fallback']);
  const media = buildMedia(src, alt, preset);

  return { content, media };
}

export default async function decorate(block) {
  const tableMode = isTableMode(block);
  const extras = tableMode ? readIndexExtras(block) : readPageConfig(block, {});
  const preset = resolvePreset(extras, tableMode);
  const defaults = PRESET_DEFAULTS[preset] || PRESET_DEFAULTS.index;

  if (preset === 'index') {
    const row = block.firstElementChild;
    const authored = row?.children[0]?.querySelector('picture img, img');
    const heroSrc = publishedImageSrc(authored?.src)
      || cfg({ ...defaults, ...extras }, 'hero-fallback', defaults['hero-fallback']);
    if (heroSrc) {
      try {
        preloadLcpImage(new URL(heroSrc, window.location.href).href);
      } catch {
        preloadLcpImage(heroSrc);
      }
    }
  }

  if (preset === 'clubs') await loadClubsDependencies();

  const config = tableMode
    ? { ...defaults, ...extras }
    : readPageConfig(block, defaults);

  const { content, media } = tableMode
    ? buildIndexFromTable(block, config, defaults)
    : buildFromConfig(config, defaults, preset);

  block.classList.add('landing-hero', `landing-hero--${preset}`);
  block.replaceChildren(content, media);

  if (preset === 'clubs' || preset === 'events') {
    window.AdobeBreadcrumbs?.set([
      { label: 'Home', href: window.AdobeBreadcrumbs?.getHomeHref?.() || '/' },
      { label: preset === 'clubs' ? 'Clubs' : 'Events', current: true },
    ]);
  }
}