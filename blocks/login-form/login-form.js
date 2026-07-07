/**
 * Login Form block — two-panel auth page (image slider left, sign-in/sign-up right).
 *
 * da.live: key | value config rows (see LOGIN_FORM_DEFAULTS).
 *   | Login Form |
 *   | tab-login  | Login |
 *
 * Requires /scripts/auth-guard.js loaded before this block.
 */
import { readPageConfig, cfg, fillTemplate } from '../club-shared/block-config.js';

export const LOGIN_FORM_DEFAULTS = {
  'slide-image-1': '/assets/images/login/adobeimg.webp, /assets/images/login/img1.avif',
  'slide-image-2': '/assets/images/login/adobeimg2.webp, /assets/images/login/img2.avif',
  'redirect-authed': '/home',
  'redirect-default': '/',
  'tab-login': 'Login',
  'tab-signup': 'Sign up',
  'heading-login': 'Login to Adobe Clubs',
  'heading-signup': 'Create your account',
  'subtitle-login': 'Welcome back. Sign in to continue.',
  'subtitle-signup': 'Join Adobe Clubs. Your data stays on this device.',
  'signin-identity-label': 'Username or Email',
  'signin-identity-placeholder': 'user or user@adobe.com',
  'signin-password-label': 'Password',
  'signin-password-placeholder': 'Enter your password',
  'signin-submit': 'Login',
  'signup-username-label': 'Username',
  'signup-username-placeholder': 'e.g. priya.sharma',
  'signup-email-label': 'Email',
  'signup-email-placeholder': 'firstname.lastname@adobe.com',
  'signup-password-label': 'Password',
  'signup-password-placeholder': 'At least 6 characters',
  'signup-submit': 'Create account',
  'signup-company': 'Adobe Inc.',
  'switch-to-signup-prefix': "Don't have an account?",
  'switch-to-signup-link': 'Sign up',
  'switch-to-login-prefix': 'Already have an account?',
  'switch-to-login-link': 'Log in',
  'error-auth-load': 'Auth module failed to load. Refresh the page.',
  'error-signin-identity-empty': 'Please enter username or email.',
  'error-signin-password-empty': 'Please enter your password.',
  'error-signin-invalid': 'Invalid username/email or password.',
  'error-signin-generic': 'Could not sign in.',
  'error-signup-username-empty': 'Choose a username.',
  'error-signup-email-empty': 'Enter your email.',
  'error-signup-password-short': 'Password must be at least 6 characters.',
  'error-signup-generic': 'Could not create account.',
  'success-signin-template': 'Welcome, {name}.',
  'success-signup': 'Account created. Welcome to Adobe Clubs!',
};

let PAGE_CONFIG = { ...LOGIN_FORM_DEFAULTS };

function getAuth() {
  return window.AdobeClubsAuth;
}

function parseImageCandidates(value, fallbacks = []) {
  if (!value) return [...fallbacks];
  const parts = String(value).split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [...fallbacks];
}

function getNextPath(config = PAGE_CONFIG) {
  return cfg(config, 'redirect-authed', LOGIN_FORM_DEFAULTS['redirect-authed']);
}

// ── Image slider helpers ──────────────────────────────────────────

function firstExistingImage(candidates) {
  return new Promise((resolve) => {
    const queue = [...candidates];
    function next() {
      if (!queue.length) { resolve(null); return; }
      const src = queue.shift();
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = next;
      img.src = src;
    }
    next();
  });
}

function buildVisualPanel(config) {
  const panel = document.createElement('div');
  panel.className = 'auth-visual-panel';

  const slider = document.createElement('div');
  slider.className = 'auth-slider';

  const slide1 = document.createElement('img');
  slide1.className = 'auth-slide is-active';
  slide1.id = 'auth-slide-1';
  slide1.alt = '';
  slide1.setAttribute('aria-hidden', 'true');

  const slide2 = document.createElement('img');
  slide2.className = 'auth-slide auth-slide--secondary';
  slide2.id = 'auth-slide-2';
  slide2.alt = '';
  slide2.setAttribute('aria-hidden', 'true');

  const overlay = document.createElement('div');
  overlay.className = 'auth-visual-overlay';

  const dotsRoot = document.createElement('div');
  dotsRoot.className = 'auth-slider-dots';
  dotsRoot.id = 'auth-slider-dots';
  dotsRoot.setAttribute('role', 'group');
  dotsRoot.setAttribute('aria-label', 'Slide controls');

  for (let i = 0; i < 2; i += 1) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'auth-dot';
    dot.dataset.slide = String(i);
    dot.setAttribute('aria-label', `Show image ${i + 1}`);
    dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
    dotsRoot.append(dot);
  }

  slider.append(slide1, slide2, overlay, dotsRoot);
  panel.append(slider);

  initSlider(panel, config);
  return panel;
}

function initSlider(panel, config) {
  const slide1 = panel.querySelector('#auth-slide-1');
  const slide2 = panel.querySelector('#auth-slide-2');
  const dots = panel.querySelectorAll('.auth-dot');
  let index = 0;
  let timer = null;

  function getLoaded() {
    return [slide1, slide2].filter((s) => s?.src && !s.src.endsWith(window.location.href));
  }

  function show(i) {
    const loaded = getLoaded();
    if (!loaded.length) return;
    index = ((i % loaded.length) + loaded.length) % loaded.length;
    [slide1, slide2].forEach((s) => {
      if (!s) return;
      const li = loaded.indexOf(s);
      s.classList.toggle('is-active', li === index);
    });
    dots.forEach((d, di) => {
      const visible = di < loaded.length;
      d.hidden = !visible;
      d.classList.toggle('is-active', di === index);
      d.setAttribute('aria-current', di === index ? 'true' : 'false');
    });
  }

  function start() {
    if (timer) clearInterval(timer);
    if (getLoaded().length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => show(index + 1), 3200);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => { show(Number(dot.dataset.slide)); start(); });
  });

  panel.addEventListener('mouseenter', stop);
  panel.addEventListener('mouseleave', start);

  const slide1Candidates = parseImageCandidates(cfg(config, 'slide-image-1'));
  const slide2Candidates = parseImageCandidates(cfg(config, 'slide-image-2'));

  Promise.all([
    firstExistingImage(slide1Candidates),
    firstExistingImage(slide2Candidates),
  ]).then(([src1, src2]) => {
    if (src1) {
      slide1.src = src1;
    } else {
      slide1.hidden = true;
    }
    if (src2) {
      slide2.src = src2;
      slide2.classList.add('auth-slide--secondary');
    } else {
      slide2.hidden = true;
      dots[1].hidden = true;
    }
    show(0);
    start();
  });
}

// ── Form helpers ──────────────────────────────────────────────────

function buildField({ id, label, type = 'text', placeholder, autocomplete, errorId, hasToggle }) {
  const field = document.createElement('div');
  field.className = 'auth-field';

  const lbl = document.createElement('label');
  lbl.className = 'auth-label';
  lbl.htmlFor = id;
  lbl.innerHTML = `${label} <span class="field-required" aria-hidden="true">*</span>`;

  const wrap = document.createElement('div');
  wrap.className = 'auth-input-wrap';

  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.name = id;
  input.className = `auth-input${hasToggle ? '' : ' auth-input--plain'}`;
  input.placeholder = placeholder || '';
  if (autocomplete) input.autocomplete = autocomplete;
  input.required = true;

  wrap.append(input);

  if (hasToggle) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'auth-toggle-pw';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('data-toggle-for', id);
    btn.innerHTML = '<svg class="auth-eye" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    btn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
    wrap.append(btn);
  }

  const error = document.createElement('p');
  error.className = 'auth-error';
  error.id = errorId;
  error.setAttribute('role', 'alert');
  error.hidden = true;

  field.append(lbl, wrap, error);
  return field;
}

function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);
  if (!input || !errorEl) return;
  if (message) {
    input.classList.add('is-invalid');
    errorEl.hidden = false;
    errorEl.textContent = message;
  } else {
    input.classList.remove('is-invalid');
    errorEl.hidden = true;
    errorEl.textContent = '';
  }
}

function buildSigninPanel(config) {
  const panel = document.createElement('div');
  panel.className = 'auth-panel';
  panel.id = 'signin-panel';

  const form = document.createElement('form');
  form.className = 'auth-form';
  form.id = 'signin-form';
  form.noValidate = true;

  form.append(
    buildField({
      id: 'signin-identity',
      label: cfg(config, 'signin-identity-label', LOGIN_FORM_DEFAULTS['signin-identity-label']),
      type: 'text',
      placeholder: cfg(config, 'signin-identity-placeholder', LOGIN_FORM_DEFAULTS['signin-identity-placeholder']),
      autocomplete: 'username',
      errorId: 'signin-identity-error',
    }),
    buildField({
      id: 'signin-password',
      label: cfg(config, 'signin-password-label', LOGIN_FORM_DEFAULTS['signin-password-label']),
      type: 'password',
      placeholder: cfg(config, 'signin-password-placeholder', LOGIN_FORM_DEFAULTS['signin-password-placeholder']),
      autocomplete: 'current-password',
      errorId: 'signin-password-error',
      hasToggle: true,
    }),
  );

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'auth-btn auth-btn--primary';
  btn.textContent = cfg(config, 'signin-submit', LOGIN_FORM_DEFAULTS['signin-submit']);

  form.append(btn);
  panel.append(form);
  return panel;
}

function buildSignupPanel(config) {
  const panel = document.createElement('div');
  panel.className = 'auth-panel';
  panel.id = 'signup-panel';

  const form = document.createElement('form');
  form.className = 'auth-form';
  form.id = 'signup-form';
  form.noValidate = true;

  form.append(
    buildField({
      id: 'signup-username',
      label: cfg(config, 'signup-username-label', LOGIN_FORM_DEFAULTS['signup-username-label']),
      type: 'text',
      placeholder: cfg(config, 'signup-username-placeholder', LOGIN_FORM_DEFAULTS['signup-username-placeholder']),
      autocomplete: 'username',
      errorId: 'signup-username-error',
    }),
    buildField({
      id: 'signup-email',
      label: cfg(config, 'signup-email-label', LOGIN_FORM_DEFAULTS['signup-email-label']),
      type: 'email',
      placeholder: cfg(config, 'signup-email-placeholder', LOGIN_FORM_DEFAULTS['signup-email-placeholder']),
      autocomplete: 'email',
      errorId: 'signup-email-error',
    }),
    buildField({
      id: 'signup-password',
      label: cfg(config, 'signup-password-label', LOGIN_FORM_DEFAULTS['signup-password-label']),
      type: 'password',
      placeholder: cfg(config, 'signup-password-placeholder', LOGIN_FORM_DEFAULTS['signup-password-placeholder']),
      autocomplete: 'new-password',
      errorId: 'signup-password-error',
      hasToggle: true,
    }),
  );

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'auth-btn auth-btn--primary';
  btn.textContent = cfg(config, 'signup-submit', LOGIN_FORM_DEFAULTS['signup-submit']);

  form.append(btn);
  panel.append(form);
  return panel;
}

function buildFormPanel(config) {
  const panel = document.createElement('div');
  panel.className = 'auth-form-panel';

  const inner = document.createElement('div');
  inner.className = 'auth-form-inner';

  const tabs = document.createElement('div');
  tabs.className = 'auth-tabs';
  tabs.setAttribute('role', 'tablist');

  const tabLogin = document.createElement('button');
  tabLogin.type = 'button';
  tabLogin.className = 'auth-tab is-active';
  tabLogin.id = 'auth-tab-login';
  tabLogin.setAttribute('role', 'tab');
  tabLogin.setAttribute('aria-selected', 'true');
  tabLogin.textContent = cfg(config, 'tab-login', LOGIN_FORM_DEFAULTS['tab-login']);

  const tabSignup = document.createElement('button');
  tabSignup.type = 'button';
  tabSignup.className = 'auth-tab';
  tabSignup.id = 'auth-tab-signup';
  tabSignup.setAttribute('role', 'tab');
  tabSignup.setAttribute('aria-selected', 'false');
  tabSignup.textContent = cfg(config, 'tab-signup', LOGIN_FORM_DEFAULTS['tab-signup']);

  tabs.append(tabLogin, tabSignup);

  const heading = document.createElement('h1');
  heading.className = 'auth-heading';
  heading.id = 'auth-panel-title';
  heading.textContent = cfg(config, 'heading-login', LOGIN_FORM_DEFAULTS['heading-login']);

  const subtitle = document.createElement('p');
  subtitle.className = 'auth-subtitle';
  subtitle.id = 'auth-panel-subtitle';
  subtitle.textContent = cfg(config, 'subtitle-login', LOGIN_FORM_DEFAULTS['subtitle-login']);

  const panelsWrap = document.createElement('div');
  panelsWrap.className = 'auth-panels-wrapper';
  panelsWrap.append(buildSigninPanel(config), buildSignupPanel(config));

  const switchRow = document.createElement('p');
  switchRow.className = 'auth-signup-row';
  switchRow.id = 'auth-switch-row';

  inner.append(tabs, heading, subtitle, panelsWrap, switchRow);
  panel.append(inner);
  return panel;
}

function ensureAuthAlert() {
  let alert = document.getElementById('auth-alert');
  if (alert) return alert;

  alert = document.createElement('div');
  alert.className = 'auth-alert';
  alert.id = 'auth-alert';
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-live', 'polite');
  alert.hidden = true;
  document.body.append(alert);
  return alert;
}

// ── Mode switching ────────────────────────────────────────────────

function setAuthMode(mode, config = PAGE_CONFIG) {
  const isLogin = mode === 'login';
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const signinPanel = document.getElementById('signin-panel');
  const signupPanel = document.getElementById('signup-panel');
  const title = document.getElementById('auth-panel-title');
  const subtitle = document.getElementById('auth-panel-subtitle');
  const switchRow = document.getElementById('auth-switch-row');
  const alertEl = document.getElementById('auth-alert');

  tabLogin?.classList.toggle('is-active', isLogin);
  tabSignup?.classList.toggle('is-active', !isLogin);
  tabLogin?.setAttribute('aria-selected', String(isLogin));
  tabSignup?.setAttribute('aria-selected', String(!isLogin));
  signinPanel?.classList.toggle('is-active', isLogin);
  signupPanel?.classList.toggle('is-active', !isLogin);

  if (title) {
    title.textContent = isLogin
      ? cfg(config, 'heading-login', LOGIN_FORM_DEFAULTS['heading-login'])
      : cfg(config, 'heading-signup', LOGIN_FORM_DEFAULTS['heading-signup']);
  }

  if (subtitle) {
    subtitle.textContent = isLogin
      ? cfg(config, 'subtitle-login', LOGIN_FORM_DEFAULTS['subtitle-login'])
      : cfg(config, 'subtitle-signup', LOGIN_FORM_DEFAULTS['subtitle-signup']);
  }

  if (switchRow) {
    const signupPrefix = cfg(config, 'switch-to-signup-prefix', LOGIN_FORM_DEFAULTS['switch-to-signup-prefix']);
    const signupLink = cfg(config, 'switch-to-signup-link', LOGIN_FORM_DEFAULTS['switch-to-signup-link']);
    const loginPrefix = cfg(config, 'switch-to-login-prefix', LOGIN_FORM_DEFAULTS['switch-to-login-prefix']);
    const loginLink = cfg(config, 'switch-to-login-link', LOGIN_FORM_DEFAULTS['switch-to-login-link']);

    switchRow.innerHTML = isLogin
      ? `${signupPrefix} <button type="button" class="auth-signup-link" id="auth-switch-to-signup">${signupLink}</button>`
      : `${loginPrefix} <button type="button" class="auth-signup-link" id="auth-switch-to-login">${loginLink}</button>`;
    document.getElementById('auth-switch-to-signup')?.addEventListener('click', () => setAuthMode('signup', config));
    document.getElementById('auth-switch-to-login')?.addEventListener('click', () => setAuthMode('login', config));
  }

  if (alertEl) { alertEl.hidden = true; alertEl.textContent = ''; }
}

// ── Auth logic ────────────────────────────────────────────────────

function showAlert(message, type) {
  const el = document.getElementById('auth-alert');
  if (!el) return;
  el.hidden = false;
  el.textContent = message;
  el.dataset.type = type || 'error';
}

function redirectAfterAuth(message, config = PAGE_CONFIG) {
  showAlert(message, 'success');
  setTimeout(() => { window.location.href = getNextPath(config); }, 700);
}

function bindSignin(config = PAGE_CONFIG) {
  const form = document.getElementById('signin-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('auth-alert');
    if (alertEl) { alertEl.hidden = true; }

    const auth = getAuth();
    if (!auth) {
      showAlert(cfg(config, 'error-auth-load', LOGIN_FORM_DEFAULTS['error-auth-load']), 'error');
      return;
    }

    const identity = document.getElementById('signin-identity')?.value?.trim() || '';
    const password = document.getElementById('signin-password')?.value || '';

    if (!identity) {
      setFieldError('signin-identity', 'signin-identity-error', cfg(config, 'error-signin-identity-empty', LOGIN_FORM_DEFAULTS['error-signin-identity-empty']));
      return;
    }
    if (identity.includes('@') && !auth.isAdobeEmail(identity)) {
      setFieldError('signin-identity', 'signin-identity-error', auth.ADOBE_EMAIL_ERROR || 'Email must end with @adobe.com.');
      return;
    }
    setFieldError('signin-identity', 'signin-identity-error', '');

    if (!password) {
      setFieldError('signin-password', 'signin-password-error', cfg(config, 'error-signin-password-empty', LOGIN_FORM_DEFAULTS['error-signin-password-empty']));
      return;
    }
    setFieldError('signin-password', 'signin-password-error', '');

    try {
      await auth.loadAuthConfig();
      const account = await auth.authenticate(identity, password);
      if (!account) {
        showAlert(cfg(config, 'error-signin-invalid', LOGIN_FORM_DEFAULTS['error-signin-invalid']), 'error');
        return;
      }
      auth.createSession(account);
      try { sessionStorage.removeItem('theme'); localStorage.removeItem('theme'); } catch { /* */ }
      document.documentElement.setAttribute('data-theme', 'light');
      const welcome = fillTemplate(
        cfg(config, 'success-signin-template', LOGIN_FORM_DEFAULTS['success-signin-template']),
        { name: account.displayName || account.username },
      );
      redirectAfterAuth(welcome, config);
    } catch (err) {
      showAlert(err.message || cfg(config, 'error-signin-generic', LOGIN_FORM_DEFAULTS['error-signin-generic']), 'error');
    }
  });
}

function bindSignup(config = PAGE_CONFIG) {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('auth-alert');
    if (alertEl) { alertEl.hidden = true; }

    const auth = getAuth();
    if (!auth) {
      showAlert(cfg(config, 'error-auth-load', LOGIN_FORM_DEFAULTS['error-auth-load']), 'error');
      return;
    }

    const username = document.getElementById('signup-username')?.value?.trim() || '';
    const email = document.getElementById('signup-email')?.value?.trim() || '';
    const password = document.getElementById('signup-password')?.value || '';

    let valid = true;

    if (!username) {
      setFieldError('signup-username', 'signup-username-error', cfg(config, 'error-signup-username-empty', LOGIN_FORM_DEFAULTS['error-signup-username-empty']));
      valid = false;
    } else setFieldError('signup-username', 'signup-username-error', '');

    if (!email) {
      setFieldError('signup-email', 'signup-email-error', cfg(config, 'error-signup-email-empty', LOGIN_FORM_DEFAULTS['error-signup-email-empty']));
      valid = false;
    } else if (!auth.isAdobeEmail(email)) {
      setFieldError('signup-email', 'signup-email-error', auth.ADOBE_EMAIL_ERROR || 'Email must end with @adobe.com.');
      valid = false;
    } else setFieldError('signup-email', 'signup-email-error', '');

    if (password.length < 6) {
      setFieldError('signup-password', 'signup-password-error', cfg(config, 'error-signup-password-short', LOGIN_FORM_DEFAULTS['error-signup-password-short']));
      valid = false;
    } else setFieldError('signup-password', 'signup-password-error', '');

    if (!valid) return;

    try {
      const result = auth.registerUser({
        username,
        email,
        password,
        displayName: username,
        company: cfg(config, 'signup-company', LOGIN_FORM_DEFAULTS['signup-company']),
      });
      if (!result?.ok) {
        showAlert(result?.error || cfg(config, 'error-signup-generic', LOGIN_FORM_DEFAULTS['error-signup-generic']), 'error');
        return;
      }
      auth.createSession({
        role: 'user',
        username: result.account.username,
        email: result.account.email,
        displayName: result.account.displayName,
        company: result.account.company,
      }, { isNewSignup: true });
      try { sessionStorage.removeItem('theme'); localStorage.removeItem('theme'); } catch { /* */ }
      document.documentElement.setAttribute('data-theme', 'light');
      redirectAfterAuth(cfg(config, 'success-signup', LOGIN_FORM_DEFAULTS['success-signup']), config);
    } catch (err) {
      showAlert(err.message || cfg(config, 'error-signup-generic', LOGIN_FORM_DEFAULTS['error-signup-generic']), 'error');
    }
  });
}

// ── Entry point ───────────────────────────────────────────────────

async function loadAuthGuard() {
  if (window.AdobeClubsAuth) return;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = '/scripts/auth-guard.js';
    script.onload = resolve;
    script.onerror = resolve;
    document.head.append(script);
  });
}

export default async function decorate(block) {
  const config = readPageConfig(block, LOGIN_FORM_DEFAULTS);
  PAGE_CONFIG = config;

  await loadAuthGuard();

  const auth = getAuth();
  if (auth?.isAuthenticated()) {
    window.location.href = getNextPath(config);
    return;
  }

  block.innerHTML = '';
  block.classList.add('login-form');

  const shell = document.createElement('div');
  shell.className = 'auth-shell';
  shell.append(buildVisualPanel(config), buildFormPanel(config));

  block.append(shell);
  document.body.classList.add('auth-page');
  ensureAuthAlert();

  document.getElementById('auth-tab-login')?.addEventListener('click', () => setAuthMode('login', config));
  document.getElementById('auth-tab-signup')?.addEventListener('click', () => setAuthMode('signup', config));

  const initialMode = window.location.hash === '#signup' ? 'signup' : 'login';
  setAuthMode(initialMode, config);

  window.addEventListener('hashchange', () => {
    setAuthMode(window.location.hash === '#signup' ? 'signup' : 'login', config);
  });

  bindSignin(config);
  bindSignup(config);
}
