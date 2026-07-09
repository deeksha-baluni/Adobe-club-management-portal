/**
 * user-chrome.js — Shared logged-in nav tools + footer account links
 */
import { loadCSS, loadScript } from './aem.js';
import { applyAvatarImage } from './lib/image-priority.js';
import { renderProfilePanel } from './profile-panel.js';

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

function setAvatarEl(el, initials, src) {
  if (!el) return;
  if (src) {
    const img = document.createElement('img');
    img.className = 'profile-avatar-img';
    applyAvatarImage(img, src);
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
    navTools.appendChild(trigger);
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
    navTools.querySelector('#theme-toggle')?.remove();
    await ensureNotifications();
    ensureProfile(navTools);
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
