/**
 * Login Form block — two-panel auth page (image slider left, sign-in/sign-up right).
 *
 * da.live: empty block, all content is built by JS.
 *   | Login Form |
 *   | (empty)    |
 *
 * Requires /scripts/auth-guard.js loaded before this block.
 */

const SLIDE_1_CANDIDATES = [
  '/assets/images/login/adobeimg.webp',
  '/assets/images/login/img1.avif',
];
const SLIDE_2_CANDIDATES = [
  '/assets/images/login/adobeimg2.webp',
  '/assets/images/login/img2.avif',
];
const LOGO_FALLBACK = '/assets/images/logo/Adobe-Logo-Transparent-PNG.png';

function getAuth() {
  return window.AdobeClubsAuth;
}

function getNextPath() {
  try {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && !/^https?:\/\//i.test(next) && !next.startsWith('//') && !next.includes('login')) {
      return next;
    }
  } catch { /* ignore */ }
  return '/';
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

function buildVisualPanel() {
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

  for (let i = 0; i < 2; i++) {
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
  return panel;
}

function initSlider(panel) {
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

  // Load images
  Promise.all([
    firstExistingImage(SLIDE_1_CANDIDATES),
    firstExistingImage(SLIDE_2_CANDIDATES),
  ]).then(([src1, src2]) => {
    if (src1) {
      slide1.src = src1;
    } else {
      slide1.src = LOGO_FALLBACK;
      slide1.style.objectFit = 'contain';
      slide1.style.background = '#211d2f';
      slide1.style.padding = '42px';
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
  input.className = 'auth-input' + (hasToggle ? '' : ' auth-input--plain');
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
    btn.innerHTML = `<svg class="auth-eye" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
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

function buildSigninPanel() {
  const panel = document.createElement('div');
  panel.className = 'auth-panel';
  panel.id = 'signin-panel';

  const form = document.createElement('form');
  form.className = 'auth-form';
  form.id = 'signin-form';
  form.noValidate = true;

  form.append(
    buildField({ id: 'signin-identity', label: 'Username or Email', type: 'text', placeholder: 'user or user@adobe.com', autocomplete: 'username', errorId: 'signin-identity-error' }),
    buildField({ id: 'signin-password', label: 'Password', type: 'password', placeholder: 'Enter your password', autocomplete: 'current-password', errorId: 'signin-password-error', hasToggle: true }),
  );

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'auth-btn auth-btn--primary';
  btn.textContent = 'Login';

  form.append(btn);
  panel.append(form);
  return panel;
}

function buildSignupPanel() {
  const panel = document.createElement('div');
  panel.className = 'auth-panel';
  panel.id = 'signup-panel';

  const form = document.createElement('form');
  form.className = 'auth-form';
  form.id = 'signup-form';
  form.noValidate = true;

  form.append(
    buildField({ id: 'signup-username', label: 'Username', type: 'text', placeholder: 'e.g. priya.sharma', autocomplete: 'username', errorId: 'signup-username-error' }),
    buildField({ id: 'signup-email', label: 'Email', type: 'email', placeholder: 'firstname.lastname@adobe.com', autocomplete: 'email', errorId: 'signup-email-error' }),
    buildField({ id: 'signup-password', label: 'Password', type: 'password', placeholder: 'At least 6 characters', autocomplete: 'new-password', errorId: 'signup-password-error', hasToggle: true }),
  );

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'auth-btn auth-btn--primary';
  btn.textContent = 'Create account';

  form.append(btn);
  panel.append(form);
  return panel;
}

function buildFormPanel() {
  const panel = document.createElement('div');
  panel.className = 'auth-form-panel';

  const inner = document.createElement('div');
  inner.className = 'auth-form-inner';

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'auth-tabs';
  tabs.setAttribute('role', 'tablist');

  const tabLogin = document.createElement('button');
  tabLogin.type = 'button';
  tabLogin.className = 'auth-tab is-active';
  tabLogin.id = 'auth-tab-login';
  tabLogin.setAttribute('role', 'tab');
  tabLogin.setAttribute('aria-selected', 'true');
  tabLogin.textContent = 'Login';

  const tabSignup = document.createElement('button');
  tabSignup.type = 'button';
  tabSignup.className = 'auth-tab';
  tabSignup.id = 'auth-tab-signup';
  tabSignup.setAttribute('role', 'tab');
  tabSignup.setAttribute('aria-selected', 'false');
  tabSignup.textContent = 'Sign up';

  tabs.append(tabLogin, tabSignup);

  // Heading
  const heading = document.createElement('h1');
  heading.className = 'auth-heading';
  heading.id = 'auth-panel-title';
  heading.textContent = 'Login to Adobe Clubs';

  // Alert
  const alert = document.createElement('div');
  alert.className = 'auth-alert';
  alert.id = 'auth-alert';
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-live', 'polite');
  alert.hidden = true;

  // Panels wrapper
  const panelsWrap = document.createElement('div');
  panelsWrap.className = 'auth-panels-wrapper';
  const signinPanel = buildSigninPanel();
  const signupPanel = buildSignupPanel();
  panelsWrap.append(signinPanel, signupPanel);

  // Switch row
  const switchRow = document.createElement('p');
  switchRow.className = 'auth-signup-row';
  switchRow.id = 'auth-switch-row';

  inner.append(tabs, heading, alert, panelsWrap, switchRow);
  panel.append(inner);
  return panel;
}

// ── Mode switching ────────────────────────────────────────────────

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const signinPanel = document.getElementById('signin-panel');
  const signupPanel = document.getElementById('signup-panel');
  const title = document.getElementById('auth-panel-title');
  const switchRow = document.getElementById('auth-switch-row');
  const alertEl = document.getElementById('auth-alert');

  tabLogin?.classList.toggle('is-active', isLogin);
  tabSignup?.classList.toggle('is-active', !isLogin);
  tabLogin?.setAttribute('aria-selected', String(isLogin));
  tabSignup?.setAttribute('aria-selected', String(!isLogin));
  signinPanel?.classList.toggle('is-active', isLogin);
  signupPanel?.classList.toggle('is-active', !isLogin);

  if (title) title.textContent = isLogin ? 'Login to Adobe Clubs' : 'Create your account';

  if (switchRow) {
    switchRow.innerHTML = isLogin
      ? `Don&apos;t have an account? <button type="button" class="auth-signup-link" id="auth-switch-to-signup">Sign up</button>`
      : `Already have an account? <button type="button" class="auth-signup-link" id="auth-switch-to-login">Log in</button>`;
    document.getElementById('auth-switch-to-signup')?.addEventListener('click', () => setAuthMode('signup'));
    document.getElementById('auth-switch-to-login')?.addEventListener('click', () => setAuthMode('login'));
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

function redirectAfterAuth(message) {
  showAlert(message, 'success');
  setTimeout(() => { window.location.href = getNextPath(); }, 700);
}

function bindSignin() {
  const form = document.getElementById('signin-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('auth-alert');
    if (alertEl) { alertEl.hidden = true; }

    const auth = getAuth();
    if (!auth) { showAlert('Auth module failed to load. Refresh the page.', 'error'); return; }

    const identity = document.getElementById('signin-identity')?.value?.trim() || '';
    const password = document.getElementById('signin-password')?.value || '';

    if (!identity) { setFieldError('signin-identity', 'signin-identity-error', 'Please enter username or email.'); return; }
    if (identity.includes('@') && !auth.isAdobeEmail(identity)) { setFieldError('signin-identity', 'signin-identity-error', auth.ADOBE_EMAIL_ERROR || 'Email must end with @adobe.com.'); return; }
    setFieldError('signin-identity', 'signin-identity-error', '');

    if (!password) { setFieldError('signin-password', 'signin-password-error', 'Please enter your password.'); return; }
    setFieldError('signin-password', 'signin-password-error', '');

    try {
      await auth.loadAuthConfig();
      const account = await auth.authenticate(identity, password);
      if (!account) { showAlert('Invalid username/email or password.', 'error'); return; }
      auth.createSession(account);
      try { sessionStorage.removeItem('theme'); localStorage.removeItem('theme'); } catch { /* */ }
      document.documentElement.setAttribute('data-theme', 'light');
      redirectAfterAuth(`Welcome, ${account.displayName || account.username}.`);
    } catch (err) {
      showAlert(err.message || 'Could not sign in.', 'error');
    }
  });
}

function bindSignup() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('auth-alert');
    if (alertEl) { alertEl.hidden = true; }

    const auth = getAuth();
    if (!auth) { showAlert('Auth module failed to load. Refresh the page.', 'error'); return; }

    const username = document.getElementById('signup-username')?.value?.trim() || '';
    const email = document.getElementById('signup-email')?.value?.trim() || '';
    const password = document.getElementById('signup-password')?.value || '';

    let valid = true;

    if (!username) { setFieldError('signup-username', 'signup-username-error', 'Choose a username.'); valid = false; }
    else setFieldError('signup-username', 'signup-username-error', '');

    if (!email) { setFieldError('signup-email', 'signup-email-error', 'Enter your email.'); valid = false; }
    else if (!auth.isAdobeEmail(email)) { setFieldError('signup-email', 'signup-email-error', auth.ADOBE_EMAIL_ERROR || 'Email must end with @adobe.com.'); valid = false; }
    else setFieldError('signup-email', 'signup-email-error', '');

    if (password.length < 6) { setFieldError('signup-password', 'signup-password-error', 'Password must be at least 6 characters.'); valid = false; }
    else setFieldError('signup-password', 'signup-password-error', '');

    if (!valid) return;

    try {
      const account = await auth.registerUser({ username, email, password, displayName: username, company: 'Adobe Inc.' });
      auth.createSession(account, { isNewSignup: true });
      try { sessionStorage.removeItem('theme'); localStorage.removeItem('theme'); } catch { /* */ }
      document.documentElement.setAttribute('data-theme', 'light');
      redirectAfterAuth('Account created. Welcome to Adobe Clubs!');
    } catch (err) {
      showAlert(err.message || 'Could not create account.', 'error');
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
  await loadAuthGuard();

  const auth = getAuth();
  if (auth?.isAuthenticated()) {
    window.location.href = getNextPath();
    return;
  }

  // Full-viewport shell
  const shell = document.createElement('div');
  shell.className = 'auth-shell';

  const visual = buildVisualPanel();
  const formPanel = buildFormPanel();

  shell.append(visual, formPanel);
  block.textContent = '';
  block.append(shell);
  document.body.classList.add('auth-page');

  // Wire up mode tabs
  document.getElementById('auth-tab-login')?.addEventListener('click', () => setAuthMode('login'));
  document.getElementById('auth-tab-signup')?.addEventListener('click', () => setAuthMode('signup'));

  // Hash-based initial mode
  const initialMode = window.location.hash === '#signup' ? 'signup' : 'login';
  setAuthMode(initialMode);

  window.addEventListener('hashchange', () => {
    setAuthMode(window.location.hash === '#signup' ? 'signup' : 'login');
  });

  // Bind form submissions
  bindSignin();
  bindSignup();

  // Start image slider
  initSlider(visual);
}
