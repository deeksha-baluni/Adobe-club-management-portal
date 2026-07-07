import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  loadScript,
  buildBlock,
} from './aem.js';
import { preloadLcpImage, publishedImageSrc } from '../blocks/club-shared/image-priority.js';
import { resolveEventIdUrl } from '../blocks/club-shared/event-images.js';
import '../blocks/club-shared/club-images.js';
import '../blocks/club-shared/event-images.js';

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Published pages may still emit clubs-hero / events-hero until re-published in da.live.
 * Remap to landing-hero so one block implementation loads.
 * @param {Element} main
 */
function migrateLegacyHeroBlocks(main) {
  main.querySelectorAll('.clubs-hero, .events-hero').forEach((block) => {
    block.classList.remove('clubs-hero', 'events-hero');
    block.classList.add('landing-hero');
  });
}

/**
 * Published pages may still emit events-list / clubs-list until re-published in da.live.
 * @param {Element} main
 */
function migrateLegacyListBlocks(main) {
  main.querySelectorAll('.events-list, .clubs-list').forEach((block) => {
    const preset = block.classList.contains('clubs-list') ? 'clubs' : 'events';
    block.classList.remove('events-list', 'clubs-list');
    block.classList.add('catalog-list', `catalog-list--${preset}`);
  });
}

/**
 * Published pages may still emit featured-clubs / upcoming-events until re-published.
 * @param {Element} main
 */
function migrateLegacyShowcaseBlocks(main) {
  main.querySelectorAll('.featured-clubs').forEach((block) => {
    block.classList.remove('featured-clubs');
    block.classList.add('showcase-teaser', 'showcase-teaser--clubs');
  });
  main.querySelectorAll('.upcoming-events').forEach((block) => {
    block.classList.remove('upcoming-events');
    block.classList.add('showcase-teaser', 'showcase-teaser--events');
  });
}

/**
 * Legacy accordion block → index-close (FAQ only).
 * @param {Element} main
 */
function migrateLegacyCloseBlocks(main) {
  main.querySelectorAll('.accordion').forEach((block) => {
    block.classList.remove('accordion');
    block.classList.add('index-close');
  });
}

/**
 * Legacy steps / cards blocks → index-marketing (first class drives block loader).
 * @param {Element} main
 */
function migrateLegacyMarketingBlocks(main) {
  main.querySelectorAll('.steps').forEach((block) => {
    block.className = 'index-marketing index-marketing--steps-only';
  });
  main.querySelectorAll('.cards').forEach((block) => {
    block.className = 'index-marketing index-marketing--stories-only';
  });
}

/**
 * Read preset | value from raw da.live table rows (before block JS runs).
 * @param {Element} block
 * @returns {'clubs'|'events'|''}
 */
function readRawBlockPreset(block) {
  if (!block) return '';
  for (const row of block.children) {
    const cols = row.children;
    if (cols.length < 2) continue;
    const key = cols[0].textContent.trim().toLowerCase();
    if (key !== 'preset') continue;
    const val = cols[1].textContent.trim().toLowerCase();
    if (val.startsWith('event')) return 'events';
    if (val.startsWith('club')) return 'clubs';
  }
  return '';
}

function isEventsShowcaseBlock(block) {
  if (!block) return false;
  if (block.classList.contains('upcoming-events') || block.classList.contains('showcase-teaser--events')) {
    return true;
  }
  return readRawBlockPreset(block) === 'events';
}

/**
 * Tag showcase-teaser blocks with --clubs / --events before injection checks run.
 * @param {Element} main
 */
function tagShowcaseTeaserPresets(main) {
  main.querySelectorAll('.showcase-teaser').forEach((block) => {
    if (block.classList.contains('showcase-teaser--clubs')
      || block.classList.contains('showcase-teaser--events')) return;
    const preset = readRawBlockPreset(block);
    if (preset === 'clubs') block.classList.add('showcase-teaser--clubs');
    if (preset === 'events') block.classList.add('showcase-teaser--events');
  });

  const untagged = [...main.querySelectorAll('.showcase-teaser')].filter(
    (block) => !block.classList.contains('showcase-teaser--clubs')
      && !block.classList.contains('showcase-teaser--events'),
  );

  if (untagged.length >= 2) {
    untagged[0].classList.add('showcase-teaser--clubs');
    untagged[1].classList.add('showcase-teaser--events');
  } else if (untagged.length === 1) {
    const preset = readRawBlockPreset(untagged[0]);
    untagged[0].classList.add(preset === 'events' ? 'showcase-teaser--events' : 'showcase-teaser--clubs');
  }
}

function hasGuestFeaturedClubsSection(main) {
  if (main.querySelector('.featured-clubs, .showcase-teaser--clubs')) return true;

  const showcases = [...main.querySelectorAll('.showcase-teaser, .featured-clubs')];
  if (showcases.some((block) => readRawBlockPreset(block) === 'clubs')) return true;
  // Index layout: first of two showcase blocks is featured clubs.
  if (showcases.length >= 2) return true;
  return false;
}

function findGuestEventsSection(main) {
  const tagged = main.querySelector('.upcoming-events, .showcase-teaser--events');
  if (tagged) return tagged.closest('.section');

  for (const block of main.querySelectorAll('.showcase-teaser')) {
    if (isEventsShowcaseBlock(block)) return block.closest('.section');
  }

  return null;
}

/**
 * Guest index is missing Featured Clubs in da.live — inject showcase-teaser (clubs)
 * after the hero and before Upcoming Events when absent.
 * @param {Element} main
 */
function ensureGuestFeaturedClubs(main) {
  if (normalizePath(window.location.pathname) !== '/') return;
  if (hasGuestFeaturedClubsSection(main)) return;

  const heroSection = main.querySelector('.landing-hero')?.closest('.section');
  const eventsSection = findGuestEventsSection(main);
  if (!heroSection && !eventsSection) return;

  const section = document.createElement('div');
  section.classList.add('section');
  section.dataset.sectionStatus = 'initialized';

  const wrapper = document.createElement('div');
  const block = document.createElement('div');
  block.className = 'showcase-teaser showcase-teaser--clubs';
  wrapper.append(block);
  section.append(wrapper);

  if (eventsSection) {
    eventsSection.before(section);
  } else {
    heroSection.after(section);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  migrateLegacyHeroBlocks(main);
  migrateLegacyListBlocks(main);
  migrateLegacyShowcaseBlocks(main);
  tagShowcaseTeaserPresets(main);
  migrateLegacyCloseBlocks(main);
  migrateLegacyMarketingBlocks(main);
  ensureGuestFeaturedClubs(main);
  prepareGuestIndexHero(main);
  prepareEventDetailEarly();
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  const main = doc.querySelector('main');
  const onGuestIndex = main
    && normalizePath(window.location.pathname) === '/'
    && main.querySelector('.landing-hero');
  const onEventDetail = normalizePath(window.location.pathname) === '/event';

  if (onGuestIndex && isSessionAuthenticated()) {
    window.location.replace('/home');
    return;
  }

  if (!onGuestIndex && !onEventDetail) {
    await loadScript(`${window.hlx?.codeBasePath || ''}/scripts/auth-guard.js`);
    if (handleAuthRouting(doc)) return;
  } else {
    loadScript(`${window.hlx?.codeBasePath || ''}/scripts/auth-guard.js`);
  }

  if (main) {
    decorateMain(main);

    const authPage = isAuthPage(doc);
    const guestIndex = isGuestIndexPage(main);
    const eventDetail = isEventDetailPage(main);

    if (!guestIndex && !eventDetail) {
      prefetchRouteAssets(main);
    }

    if (!authPage && !guestIndex && !eventDetail) {
      const header = doc.querySelector('header');
      if (header && !isHeaderReady(header)) {
        await loadHeader(header);
      }
    }

    if (guestIndex) {
      const header = doc.querySelector('header');
      const headerPromise = !authPage && header && !isHeaderReady(header)
        ? loadHeader(header)
        : Promise.resolve();
      prefetchRouteAssets(main);
      await Promise.all([
        headerPromise,
        loadGuestIndex(main),
      ]);
    } else if (eventDetail) {
      const header = doc.querySelector('header');
      const headerPromise = !authPage && header && !isHeaderReady(header)
        ? loadHeader(header)
        : Promise.resolve();
      prefetchRouteAssets(main);
      await Promise.all([
        headerPromise,
        loadEventDetailPage(main),
      ]);
    } else {
      await loadSection(main.querySelector('.section'), waitForFirstImage);
    }

    document.body.classList.add('appear');
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (!document.body.classList.contains('guest-index')
      && (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded'))) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

function isAuthPage(doc) {
  return Boolean(doc.querySelector('main .login-form'));
}

function normalizePath(path) {
  const normalized = (path || '/').replace(/\/$/, '') || '/';
  return normalized === '/index' ? '/' : normalized;
}

function getEventIdFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id') || params.get('event');
  if (idParam) return idParam;
  const match = window.location.pathname.match(/\/events\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function isEventDetailPage(main) {
  return normalizePath(window.location.pathname) === '/event'
    && Boolean(main?.querySelector('.page-hero, .event-hero, .event-list'));
}

function prepareEventDetailEarly() {
  if (normalizePath(window.location.pathname) !== '/event') return;
  document.documentElement.classList.add('event-detail-route');
  document.body?.classList.add('event-detail-page');
  document.querySelector('main')?.classList.add('event-detail-page');
}

function prefetchEventHeroEarly() {
  const eventId = getEventIdFromLocation();
  if (!eventId) return;
  const heroSrc = resolveEventIdUrl(eventId);
  preloadLcpImage(heroSrc);
  prefetchAppData()?.then((data) => {
    const ev = data?.events?.find((e) => e.id === eventId);
    if (ev?.imagePath) {
      import('../blocks/event-shared/event-page.js').then((mod) => {
        mod.prefetchEventHeroImage(ev);
      });
    }
  });
}

if (normalizePath(window.location.pathname) === '/event') {
  prepareEventDetailEarly();
  prefetchAppData();
  prefetchEventHeroEarly();
}

/** Fast localStorage check — avoids loading auth-guard before guest index LCP. */
function isSessionAuthenticated() {
  try {
    const session = JSON.parse(localStorage.getItem('adobeClubsAuth') || 'null');
    return Boolean(session?.isAuthenticated);
  } catch {
    return false;
  }
}

function preloadGuestIndexHeroSrc(src) {
  const clean = publishedImageSrc(src);
  if (!clean) return;
  preloadLcpImage(clean);
}

/** Promote authored hero img before block JS replaces the table (guest index LCP). */
function prepareGuestIndexEarly() {
  if (normalizePath(window.location.pathname) !== '/') return;
  document.documentElement.classList.add('guest-index-route');
}

function prepareGuestIndexHero(main) {
  prepareGuestIndexEarly();
  if (normalizePath(window.location.pathname) !== '/') return;
  const hero = main.querySelector('.landing-hero');
  if (!hero) return;
  const mediaCell = hero.firstElementChild?.firstElementChild;
  const img = mediaCell?.querySelector('picture img, img');
  if (!img?.src) return;
  img.loading = 'eager';
  img.decoding = 'async';
  if ('fetchPriority' in img) img.fetchPriority = 'high';
  preloadGuestIndexHeroSrc(img.src);
}

if (normalizePath(window.location.pathname) === '/') {
  prepareGuestIndexEarly();
  prefetchAppData();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      prepareGuestIndexHero(document.querySelector('main'));
    }, { once: true });
  } else {
    prepareGuestIndexHero(document.querySelector('main'));
  }
}

function prefetchAppData() {
  const base = window.hlx?.codeBasePath || '';
  if (window.__adobeClubsDataPrefetch) return window.__adobeClubsDataPrefetch;
  const url = `${base}/data/data.json`;
  if (!document.querySelector('link[data-app-data-preload]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = url;
    link.crossOrigin = 'anonymous';
    link.dataset.appDataPreload = '1';
    document.head.append(link);
  }
  window.__adobeClubsDataPrefetch = fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  return window.__adobeClubsDataPrefetch;
}

function prefetchRouteAssets(main, path) {
  const normalized = normalizePath(path || window.location.pathname);
  const needsData = normalized === '/'
    || normalized === '/home'
    || normalized === '/event'
    || normalized === '/events'
    || normalized === '/clubs'
    || normalized === '/resources'
    || normalized === '/club'
    || main?.querySelector('.event-hero, .page-hero--event, .event-list, .home-dashboard, .showcase-teaser, .landing-hero');
  if (needsData) prefetchAppData();

  if (main?.querySelector('.event-hero, .page-hero--event, .event-list') || normalized === '/event') {
    const codeBase = window.hlx?.codeBasePath || '';
    loadCSS(`${codeBase}/blocks/event-shared/event-section.css`);
  }

  if (main?.querySelector('.page-hero--club, .club-list, .club-hero') || normalized === '/club') {
    const codeBase = window.hlx?.codeBasePath || '';
    loadCSS(`${codeBase}/blocks/club-shared/club-section.css`);
    import('../blocks/club-shared/club-page.js').then((mod) => mod.prefetchClubData());
  }

  if (normalized === '/clubs' || normalized === '/events'
    || (normalized !== '/' && main?.querySelector('.landing-hero'))) {
    const heroImg = main?.querySelector('.landing-hero picture img, .landing-hero img');
    if (heroImg?.src) preloadGuestIndexHeroSrc(heroImg.src);
  }
}

function isGuestIndexPage(main) {
  return normalizePath(window.location.pathname) === '/'
    && Boolean(main?.querySelector('.landing-hero'));
}

function isHeaderReady(header) {
  return Boolean(header?.querySelector(':scope > .header.block'));
}

async function loadGuestIndex(main) {
  document.body.classList.add('guest-index');
  document.documentElement.classList.add('guest-index-route');
  const sections = [...main.querySelectorAll(':scope > .section')];
  if (!sections.length) return;
  await loadSection(sections[0], waitForGuestHeroImage);
}

async function loadEventDetailPage(main) {
  const sections = [...main.querySelectorAll(':scope > .section')];
  if (!sections.length) return;

  const heroSection = sections.find((s) => s.querySelector('.page-hero, .event-hero')) || sections[0];
  await loadSection(heroSection, waitForEventHeroImage);
}

/** Wait for event detail hero LCP image before painting below-fold sections. */
async function waitForEventHeroImage(section) {
  const img = section.querySelector(
    '#event-hero-primary img, .event-hero-img--primary img, .event-hero-img img',
  );
  await new Promise((resolve) => {
    if (img && !img.complete) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('decoding', 'async');
      if ('fetchPriority' in img) img.fetchPriority = 'high';
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

/** Wait for hero LCP image when index hero media is shown. */
async function waitForGuestHeroImage(section) {
  const img = section.querySelector('.landing-hero-media img, .landing-hero picture img');
  await new Promise((resolve) => {
    if (img && !img.complete) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('decoding', 'async');
      if ('fetchPriority' in img) img.fetchPriority = 'high';
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

function isHomePath() {
  return normalizePath(window.location.pathname) === '/home';
}

/**
 * Redirect guests/authed users between / and /home.
 * @returns {boolean} true if a redirect was triggered
 */
function handleAuthRouting(doc) {
  const authApi = window.AdobeClubsAuth;
  const path = normalizePath(window.location.pathname);
  const authed = authApi?.isAuthenticated?.();

  if (!authed) {
    if (path === '/home') {
      const next = encodeURIComponent('/home');
      window.location.replace(authApi?.loginUrlWithNext?.() || `/login?next=${next}`);
      return true;
    }
    return false;
  }

  if (path === '/' && !isAuthPage(doc)) {
    window.location.replace('/home');
    return true;
  }

  return false;
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const authPage = isAuthPage(doc);
  const main = doc.querySelector('main');
  const guestIndex = isGuestIndexPage(main);
  const eventDetail = isEventDetailPage(main);

  if (!authPage) {
    if (!guestIndex && !eventDetail) {
      const header = doc.querySelector('header');
      const headerPromise = header && !isHeaderReady(header) ? loadHeader(header) : null;
      await Promise.all([
        headerPromise || Promise.resolve(),
        loadSections(main),
      ]);
    } else if (guestIndex) {
      const header = doc.querySelector('header');
      const headerPromise = header && !isHeaderReady(header) ? loadHeader(header) : null;
      const pending = [...main.querySelectorAll(':scope > .section')].filter((section) => {
        const { sectionStatus: status } = section.dataset;
        return !status || status === 'initialized';
      });
      await Promise.all([
        headerPromise || Promise.resolve(),
        ...pending.map((section) => loadSection(section)),
      ]);
    } else if (eventDetail) {
      const header = doc.querySelector('header');
      const headerPromise = header && !isHeaderReady(header) ? loadHeader(header) : null;
      const pending = [...main.querySelectorAll(':scope > .section')].filter((section) => {
        const { sectionStatus: status } = section.dataset;
        return !status || status === 'initialized';
      });
      await Promise.all([
        headerPromise || Promise.resolve(),
        ...pending.map((section) => loadSection(section)),
      ]);
    }
  } else {
    doc.body.classList.add('auth-page');
    doc.querySelector('header')?.remove();
    doc.querySelector('footer')?.remove();
    await loadSections(main);
  }

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  if (!authPage) {
    await loadFooter(doc.querySelector('footer'));
    const { initUserChrome } = await import('./user-chrome.js');
    await initUserChrome();
  }

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
