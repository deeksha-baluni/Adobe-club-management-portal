/**
 * Page breadcrumb trail — mounted below the main nav in the header.
 */

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizePath(path) {
  const normalized = (path || '/').replace(/\/$/, '') || '/';
  return normalized === '/index' ? '/' : normalized;
}

export function getHomeHref() {
  const navHome = document.querySelector('#nav a[href*="/home"], #nav-home');
  if (navHome?.href) {
    try {
      return normalizePath(new URL(navHome.href).pathname);
    } catch {
      /* fall through */
    }
  }
  try {
    const session = JSON.parse(localStorage.getItem('adobeClubsAuth') || 'null');
    return session?.isAuthenticated ? '/home' : '/';
  } catch {
    return '/';
  }
}

function homeCrumb() {
  return { label: 'Home', href: getHomeHref() };
}

function defaultTrail() {
  const path = normalizePath(window.location.pathname);

  if (path === '/' || path === '/login') return null;

  const home = homeCrumb();

  if (path === '/home') {
    return [{ ...home, current: true }];
  }

  if (path === '/clubs') {
    return [home, { label: 'Clubs', current: true }];
  }

  if (path === '/events') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('rsvp') === 'mine' || params.get('view') === 'rsvp') {
      return [home, { label: 'Events', href: '/events' }, { label: 'My RSVPs', current: true }];
    }
    return [home, { label: 'Events', current: true }];
  }

  if (path === '/resources') {
    return [home, { label: 'Resources', current: true }];
  }

  if (path === '/club') {
    return [home, { label: 'Clubs', href: '/clubs' }, { label: 'Club', current: true }];
  }

  if (path === '/event') {
    return [home, { label: 'Events', href: '/events' }, { label: 'Event', current: true }];
  }

  return [home, { label: 'Page', current: true }];
}

function ensureMount() {
  const headerBlock = document.querySelector('header .header');
  const main = document.querySelector('main');
  let nav = document.getElementById('page-breadcrumb');

  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'page-breadcrumb';
    nav.id = 'page-breadcrumb';
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.hidden = true;
    if (headerBlock) {
      headerBlock.append(nav);
    } else if (main) {
      main.insertBefore(nav, main.firstChild);
    }
  } else if (headerBlock && nav.parentElement !== headerBlock) {
    headerBlock.append(nav);
  }

  return nav;
}

export function render(items) {
  const nav = ensureMount();
  if (!nav) return;

  const visible = Boolean(items && items.length >= 2);
  document.body.classList.toggle('has-breadcrumbs', visible);

  if (!visible) {
    nav.hidden = true;
    nav.innerHTML = '';
    return;
  }

  nav.hidden = false;
  const parts = [];

  items.forEach((item, index) => {
    if (index > 0) {
      parts.push('<li class="page-breadcrumb-sep" aria-hidden="true">/</li>');
    }

    const isCurrent = Boolean(item.current) || index === items.length - 1;
    if (isCurrent) {
      parts.push(`<li class="page-breadcrumb-item"><span aria-current="page">${esc(item.label)}</span></li>`);
    } else {
      parts.push(`<li class="page-breadcrumb-item"><a href="${esc(item.href || '#')}">${esc(item.label)}</a></li>`);
    }
  });

  nav.innerHTML = `<ol class="page-breadcrumb-list">${parts.join('')}</ol>`;
}

export function initBreadcrumbs() {
  render(defaultTrail());
}

export function reset() {
  initBreadcrumbs();
}

if (typeof window !== 'undefined') {
  window.AdobeBreadcrumbs = {
    getHomeHref,
    render,
    set: render,
    reset,
    init: initBreadcrumbs,
  };
}
