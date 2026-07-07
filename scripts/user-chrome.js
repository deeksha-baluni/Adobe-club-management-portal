/**
 * user-chrome.js — Shared logged-in nav tools + footer account links
 */
import { loadCSS, loadScript } from './aem.js';
import { renderProfilePanel } from './profile-panel.js';

const MOON_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const SUN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

const GUEST_ACCOUNT_LINKS = [
  { label: 'Sign in', href: '/login' },
  { label: 'Sign up', href: '/login#signup' },
];

let notificationsBootPromise = null;

function getAuth() {
  return window.AdobeClubsAuth || {
    isAuthenticated: () => false,
    getCurrentUser: () => null,
    getAvatar: () => '',
    clearSession: () => {},
    loginUrlWithNext: () => '/login',
  };
}

function waitForAuth(maxMs = 5000) {
  return new Promise((resolve) => {
    if (window.AdobeClubsAuth) {
      resolve();
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.AdobeClubsAuth || Date.now() - started >= maxMs) {
        clearInterval(timer);
        resolve();
      }
    }, 25);
  });
}

function codeBase() {
  return window.hlx?.codeBasePath || '';
}

function getNavTools() {
  return document.querySelector('#nav .nav-tools');
}

function getInitials(name) {
  return (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
}

async function ensureNotifications() {
  if (!getAuth().isAuthenticated?.()) return;
  if (!notificationsBootPromise) {
    notificationsBootPromise = (async () => {
      const base = codeBase();
      await Promise.all([
        loadScript(`${base}/scripts/user-features.js`),
        loadScript(`${base}/scripts/event-seats.js`),
        loadScript(`${base}/scripts/notifications.js`),
      ]);
    })();
  }
  await notificationsBootPromise;
  const init = () => {
    window.AdobeNotifications?.initNavBell?.();
    window.AdobeNotifications?.refreshNavUI?.();
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(init, { timeout: 2000 });
  } else {
    window.setTimeout(init, 0);
  }
}

function wireThemeToggle(btn) {
  if (!btn || btn.dataset.wired === 'true') return;
  btn.dataset.wired = 'true';
  const html = document.documentElement;
  const THEME_SESSION_KEY = 'theme';

  function getTheme() {
    return html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncToggleUi(theme) {
    const isDark = theme === 'dark';
    const wantIcon = isDark ? 'sun' : 'moon';
    if (btn.dataset.icon === wantIcon) return;
    btn.innerHTML = isDark ? SUN_ICON : MOON_ICON;
    btn.dataset.icon = wantIcon;
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function applyTheme(theme, { persist = true } = {}) {
    const next = theme === 'dark' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    html.style.colorScheme = next;
    html.style.backgroundColor = next === 'dark' ? '#000000' : '#f8f8f8';
    if (persist) {
      try {
        if (next === 'dark') sessionStorage.setItem(THEME_SESSION_KEY, 'dark');
        else sessionStorage.removeItem(THEME_SESSION_KEY);
        localStorage.removeItem(THEME_SESSION_KEY);
      } catch (err) { /* ignore */ }
    }
    syncToggleUi(next);
  }

  applyTheme(getTheme(), { persist: false });
  btn.addEventListener('click', () => {
    applyTheme(getTheme() === 'light' ? 'dark' : 'light');
  });
}

function ensureThemeToggle(navTools) {
  let btn = navTools.querySelector('#theme-toggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.id = 'theme-toggle';
    btn.innerHTML = MOON_ICON;
    btn.dataset.icon = 'moon';
    btn.setAttribute('aria-label', 'Switch to dark mode');
    navTools.appendChild(btn);
  }
  wireThemeToggle(btn);
  return btn;
}

function setAvatarEl(el, initials, src) {
  if (!el) return;
  if (src) {
    const img = document.createElement('img');
    img.className = 'profile-avatar-img';
    img.alt = '';
    img.src = src;
    img.addEventListener('error', () => { el.textContent = initials; }, { once: true });
    el.replaceChildren(img);
  } else {
    el.textContent = initials;
  }
}

function setProfileDrawerOpen(open) {
  document.body.classList.toggle('profile-drawer-open', open);
}

function ensureProfile(navTools) {
  let trigger = navTools.querySelector('.nav-profile-trigger');
  if (!trigger) {
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'avatar nav-profile-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Open profile panel');
    const theme = navTools.querySelector('#theme-toggle');
    if (theme) navTools.insertBefore(trigger, theme);
    else navTools.appendChild(trigger);
  }

  let overlay = document.getElementById('profile-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'profile-overlay';
    overlay.id = 'profile-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <aside class="profile-drawer" id="profile-drawer" role="dialog" aria-modal="true" aria-label="Profile">
        <button class="profile-close" type="button" aria-label="Close profile panel">✕</button>
        <div class="profile-content" id="profile-content"></div>
      </aside>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        setProfileDrawerOpen(false);
      }
    });
    overlay.querySelector('.profile-close')?.addEventListener('click', () => {
      overlay.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      setProfileDrawerOpen(false);
    });
  }

  function renderProfilePanelShell() {
    renderProfilePanel({ trigger });
  }

  if (trigger.dataset.bound !== 'true') {
    trigger.dataset.bound = 'true';
    trigger.addEventListener('click', () => {
      const overlayEl = document.getElementById('profile-overlay');
      if (!overlayEl) return;
      const open = overlayEl.hidden;
      if (!open) {
        overlayEl.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        setProfileDrawerOpen(false);
        return;
      }
      renderProfilePanelShell();
      overlayEl.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      setProfileDrawerOpen(true);
    });
  }

  renderProfilePanelShell();
  return trigger;
}

function findSignInControl(navTools) {
  return navTools?.querySelector('a.button, a.nav-signin, #nav-signin') || null;
}

async function syncNavTools() {
  const navTools = getNavTools();
  if (!navTools) return;

  navTools.classList.add('nav-right');
  const authed = getAuth().isAuthenticated?.();
  const signIn = findSignInControl(navTools);

  document.body.classList.toggle('is-authenticated', authed);
  document.body.classList.toggle('is-guest', !authed);

  if (authed) {
    if (signIn) signIn.hidden = true;
    await ensureNotifications();
    ensureProfile(navTools);
    ensureThemeToggle(navTools);
  } else if (signIn) {
    signIn.hidden = false;
    signIn.href = getAuth().loginUrlWithNext?.() || '/login';
    navTools.querySelector('#notif-wrap')?.remove();
  }
}

function isAccountColumn(heading) {
  const h = String(heading || '').toLowerCase().trim();
  return h === 'get started' || h === 'account';
}

function syncFooterAccount() {
  const authed = getAuth().isAuthenticated?.();
  document.querySelectorAll('.footer-col').forEach((col) => {
    const heading = col.querySelector('.footer-col-heading')?.textContent;
    if (!isAccountColumn(heading)) return;

    const list = col.querySelector('.footer-col-links');
    if (!list) return;

    if (authed) {
      list.innerHTML = '<li><a href="/?logout=1">Sign out</a></li>';
    } else {
      list.innerHTML = GUEST_ACCOUNT_LINKS.map(
        ({ label, href }) => `<li><a href="${href}">${label}</a></li>`,
      ).join('');
    }
  });
}

export async function initUserChrome() {
  await waitForAuth();
  const base = window.hlx?.codeBasePath || '';
  await Promise.all([
    loadCSS(`${base}/styles/user-chrome.css`),
    loadCSS(`${base}/styles/user-features.css`),
  ]);
  await syncNavTools();
  syncFooterAccount();
  window.addEventListener('adobe-notifications-updated', () => {
    window.AdobeNotifications?.refreshNavUI?.();
  });
}
