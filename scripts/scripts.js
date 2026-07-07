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
import { preloadLcpImage } from '../blocks/club-shared/image-priority.js';

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
 * Guest index is missing Featured Clubs in da.live — inject showcase-teaser (clubs)
 * before Upcoming Events when absent.
 * @param {Element} main
 */
function ensureGuestFeaturedClubs(main) {
  if (normalizePath(window.location.pathname) !== '/') return;
  if (main.querySelector('.showcase-teaser--clubs, .featured-clubs')) return;

  const anchor = main.querySelector('.showcase-teaser--events, .upcoming-events')?.closest('.section')
    || main.querySelector('.landing-hero')?.closest('.section');
  if (!anchor) return;

  const section = document.createElement('div');
  section.classList.add('section');
  section.dataset.sectionStatus = 'initialized';

  const wrapper = document.createElement('div');
  const block = document.createElement('div');
  block.className = 'showcase-teaser showcase-teaser--clubs';
  wrapper.append(block);
  section.append(wrapper);
  anchor.before(section);
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
  migrateLegacyCloseBlocks(main);
  migrateLegacyMarketingBlocks(main);
  ensureGuestFeaturedClubs(main);
  prepareGuestIndexHero(main);
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

  if (onGuestIndex && isSessionAuthenticated()) {
    window.location.replace('/home');
    return;
  }

  if (!onGuestIndex) {
    await loadScript(`${window.hlx?.codeBasePath || ''}/scripts/auth-guard.js`);
    if (handleAuthRouting(doc)) return;
  } else {
    loadScript(`${window.hlx?.codeBasePath || ''}/scripts/auth-guard.js`);
  }

  if (main) {
    decorateMain(main);

    const authPage = isAuthPage(doc);
    const guestIndex = isGuestIndexPage(main);

    if (!guestIndex) {
      prefetchRouteAssets(main);
    }

    if (!authPage && !guestIndex) {
      const header = doc.querySelector('header');
      if (header && !isHeaderReady(header)) {
        await loadHeader(header);
      }
    }

    if (guestIndex) {
      const header = doc.querySelector('header');
      if (!authPage && header && !isHeaderReady(header)) {
        await loadHeader(header);
      }
      prefetchRouteAssets(main);
      await loadGuestIndex(main);
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

/** Fast localStorage check — avoids loading auth-guard before guest index LCP. */
function isSessionAuthenticated() {
  try {
    const session = JSON.parse(localStorage.getItem('adobeClubsAuth') || 'null');
    return Boolean(session?.isAuthenticated);
  } catch {
    return false;
  }
}

function prefetchGuestHeroImage() {
  const base = window.hlx?.codeBasePath || '';
  const origin = window.location.origin;
  const path = `${origin}${base}/assets/images/index/home-hero-img.webp`;
  preloadLcpImage(`${path}?width=750&format=webply&optimize=medium`, { media: '(max-width: 899px)' });
  preloadLcpImage(`${path}?width=1200&format=webply&optimize=medium`, { media: '(min-width: 900px)' });
}

/** Promote authored hero img before block JS replaces the table (guest index LCP). */
function prepareGuestIndexHero(main) {
  if (normalizePath(window.location.pathname) !== '/') return;
  const hero = main.querySelector('.landing-hero');
  if (!hero) return;
  const mediaCell = hero.firstElementChild?.firstElementChild;
  const img = mediaCell?.querySelector('picture img, img');
  if (!img?.src) {
    prefetchGuestHeroImage();
    return;
  }
  img.loading = 'eager';
  img.decoding = 'async';
  if ('fetchPriority' in img) img.fetchPriority = 'high';
  preloadLcpImage(img.src);
}

if (normalizePath(window.location.pathname) === '/') {
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
    const base = window.hlx?.codeBasePath || '';
    const origin = window.location.origin;
    const heroPath = `${base}/assets/images/index/home-hero-img.webp`;
    preloadLcpImage(`${origin}${heroPath}?width=1200&format=webply&optimize=medium`);
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
  const sections = [...main.querySelectorAll(':scope > .section')];
  if (!sections.length) return;

  const belowFoldReady = sections.length > 1
    ? Promise.all(sections.slice(1).map((section) => loadSection(section)))
    : Promise.resolve();

  await Promise.all([
    loadSection(sections[0], waitForGuestHeroImage),
    belowFoldReady,
  ]);
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

  if (!authPage) {
    if (!guestIndex) {
      const header = doc.querySelector('header');
      const headerPromise = header && !isHeaderReady(header) ? loadHeader(header) : null;
      await Promise.all([
        headerPromise || Promise.resolve(),
        loadSections(main),
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
