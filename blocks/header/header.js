import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { initBreadcrumbs } from '../../scripts/breadcrumbs.js';

const ADOBE_LOGO_PATH = '/assets/images/logo/Adobe-Logo-Transparent-PNG.png';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Normalizes a pathname for nav comparison.
 * @param {string} path
 * @returns {string}
 */
function normalizeNavPath(path) {
  const normalized = path.replace(/\/$/, '') || '/';
  return normalized === '/index' ? '/' : normalized;
}

/**
 * Detail routes that belong to a nav section (e.g. /club → /clubs).
 */
const NAV_DETAIL_SECTIONS = {
  '/club': '/clubs',
  '/event': '/events',
};

const HOME_PATHS = new Set(['/', '/home']);

/**
 * @param {string} path
 * @returns {boolean}
 */
function isHomePath(path) {
  return HOME_PATHS.has(normalizeNavPath(path));
}

/**
 * Returns whether a nav link href matches the current page.
 * @param {string} linkPath
 * @param {string} currentPath
 * @returns {boolean}
 */
function isNavLinkActive(linkPath, currentPath) {
  const link = normalizeNavPath(linkPath);
  const current = normalizeNavPath(currentPath);

  if (isHomePath(link) && isHomePath(current)) return true;

  const sectionForDetail = NAV_DETAIL_SECTIONS[current];
  if (sectionForDetail && link === sectionForDetail) return true;

  return current === link || current.startsWith(`${link}/`);
}

/**
 * Unwraps DA list markup (li > p > a) to li > a for nav links.
 * @param {Element} navSections
 */
function unwrapNavLinks(navSections) {
  if (!navSections) return;
  navSections.querySelectorAll('.default-content-wrapper > ul > li').forEach((li) => {
    const paragraph = li.querySelector(':scope > p');
    const link = paragraph?.querySelector('a[href]');
    if (
      paragraph
      && link
      && paragraph.children.length === 1
      && paragraph.textContent.trim() === link.textContent.trim()
    ) {
      li.replaceChildren(link);
    }
  });
}

/**
 * Marks the nav link that matches the current page.
 * @param {Element} nav
 */
function syncNavActiveState(nav) {
  const navSections = nav.querySelector('.nav-sections');
  if (!navSections) return;

  const currentPath = normalizeNavPath(window.location.pathname);

  navSections.querySelectorAll('a[href]').forEach((link) => {
    link.classList.remove('active');
    link.removeAttribute('aria-current');

    try {
      const linkPath = normalizeNavPath(new URL(link.href).pathname);
      if (isNavLinkActive(linkPath, currentPath)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    } catch {
      // ignore malformed hrefs
    }
  });
}

/**
 * Closes the mobile nav after a section link is clicked.
 * @param {Element} nav
 * @param {Element} navSections
 */
function bindNavLinkClose(nav, navSections) {
  if (!navSections) return;
  navSections.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', () => {
      if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
        // eslint-disable-next-line no-use-before-define
        toggleMenu(nav, navSections, false);
      }
    });
  });
}

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

function getNavOverlay() {
  return document.querySelector('.nav-overlay');
}

function setMobileNavOpen(open) {
  document.body.classList.toggle('nav-drawer-open', open);
  const overlay = getNavOverlay();
  if (overlay) overlay.hidden = !open;
}

function getLogoSrc() {
  const base = window.hlx?.codeBasePath || '';
  return `${base}${ADOBE_LOGO_PATH}`;
}

/**
 * Replaces authored "Adobe" text with the logo image + Clubs suffix.
 * @param {Element} nav
 */
function ensureNavBrand(nav) {
  const navBrand = nav.querySelector('.nav-brand');
  if (!navBrand) return;

  const logoSrc = getLogoSrc();
  let link = navBrand.querySelector('a[href]');
  if (!link) {
    link = document.createElement('a');
    link.href = '/';
    navBrand.append(link);
  }

  link.classList.add('nav-logo');
  if (!link.getAttribute('aria-label')) {
    link.setAttribute('aria-label', 'Adobe Clubs home');
  }

  const existingIcon = link.querySelector('.adobe-icon');
  if (existingIcon) {
    const img = existingIcon.querySelector('img');
    if (img && !img.src.includes('Adobe-Logo-Transparent-PNG')) {
      img.src = logoSrc;
      img.classList.add('adobe-logo-img');
    }
    return;
  }

  const rawText = navBrand.textContent.trim();
  const suffix = rawText.replace(/^Adobe\s*/i, '').trim() || 'Clubs';
  const preservedImg = navBrand.querySelector('img');

  link.textContent = '';
  const icon = document.createElement('div');
  icon.className = 'adobe-icon';
  icon.setAttribute('aria-hidden', 'true');

  const img = preservedImg || document.createElement('img');
  img.className = 'adobe-logo-img';
  img.src = logoSrc;
  img.alt = '';
  img.width = 240;
  img.height = 240;
  img.decoding = 'async';
  icon.append(img);

  const suffixEl = document.createElement('span');
  suffixEl.className = 'brand-suffix';
  suffixEl.textContent = suffix;

  link.append(icon, suffixEl);
  navBrand.textContent = '';
  navBrand.append(link);
}

function ensureBreadcrumbMount(headerBlock) {
  let crumb = headerBlock.querySelector('#page-breadcrumb');
  if (crumb) return crumb;

  crumb = document.createElement('nav');
  crumb.className = 'page-breadcrumb';
  crumb.id = 'page-breadcrumb';
  crumb.setAttribute('aria-label', 'Breadcrumb');
  crumb.hidden = true;
  headerBlock.append(crumb);
  return crumb;
}

function ensureMobileNavChrome(nav, navSections) {
  let overlay = getNavOverlay();
  if (!overlay) {
    overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = 'nav-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-label', 'Close navigation');
    overlay.addEventListener('click', () => {
      toggleMenu(nav, navSections, false);
    });
    document.body.appendChild(overlay);
  }

  if (navSections && !navSections.querySelector('.nav-drawer-close')) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'nav-drawer-close';
    closeBtn.setAttribute('aria-label', 'Close navigation');
    closeBtn.innerHTML = '<span aria-hidden="true">✕</span>';
    closeBtn.addEventListener('click', () => {
      toggleMenu(nav, navSections, false);
    });
    navSections.prepend(closeBtn);
  }

  return overlay;
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  const menuOpen = nav.getAttribute('aria-expanded') === 'true' && !isDesktop.matches;
  setMobileNavOpen(menuOpen);
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  if (button) {
    button.setAttribute('aria-label', menuOpen ? 'Close navigation' : 'Open navigation');
  }
  // enable nav dropdown keyboard accessibility
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', 0);
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) {
    const brandLink = navBrand.querySelector('.button');
    if (brandLink) {
      brandLink.className = '';
      brandLink.closest('.button-container')?.classList.remove('button-container');
    }
  }
  ensureNavBrand(nav);

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    unwrapNavLinks(navSections);
    syncNavActiveState(nav);
    bindNavLinkClose(nav, navSections);

    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  ensureMobileNavChrome(nav, navSections);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
  ensureBreadcrumbMount(block);
  initBreadcrumbs();
}
