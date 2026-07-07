/**
 * Clubs List — search, filters, card grid.
 * da.live: key | value config rows (see block header comment).
 */
import { loadCSS, loadScript } from '../../scripts/aem.js';
import { readPageConfig, cfg } from '../club-shared/block-config.js';

const DEFAULTS = {
  'clubs-data': '/data/data.json',
  'detail-base': '/club',
  'search-placeholder': 'Search by club name or tags (e.g. photography, design)…',
  'filters-title': 'Filters',
  'clear-filters-text': 'Clear all',
  'membership-group-title': 'Membership',
  'membership-all-label': 'All clubs',
  'membership-my-label': 'My clubs',
  'categories-group-title': 'Categories',
  'guest-filter-hint': 'Sign in to filter clubs you have joined.',
  'empty-title': 'No clubs match your filters.',
  'empty-text': '',
  'loading-text': 'Loading clubs…',
  'error-text': 'Clubs unavailable right now.',
  'join-label': 'Join',
  'joined-label': 'Joined',
  'membership-managed-label': 'Clubs I manage',
  'admin-badge-label': 'Managing',
};

const IMG_BASE = '/assets/images/clubs/';

let PAGE_CONFIG = { ...DEFAULTS };
let ALL_CLUBS = [];
let ALL_EVENTS = [];
let SEARCH_QUERY = '';
let ACTIVE_TAGS = new Set();
const FILTER_STATE = { membership: 'all' };
let depsLoaded = false;

function codeBase() {
  return window.hlx?.codeBasePath || '';
}

async function loadClubsDependencies() {
  if (depsLoaded) return;
  const base = codeBase();
  await Promise.all([
    loadCSS(`${base}/styles/join-modal.css`),
    loadScript(`${base}/scripts/club-meta.js`),
    loadScript(`${base}/scripts/join-modal.js`),
  ]);
  depsLoaded = true;
}

function getAuth() {
  return window.AdobeClubsAuth || {
    isAuthenticated: () => false,
    isClubJoined: () => false,
    toggleClubJoin: () => false,
    loginUrlWithNext: () => `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`)}`,
    redirectToLogin() {
      window.location.href = this.loginUrlWithNext();
    },
    getAdminOf: () => [],
    isAnyAdmin: () => false,
    getManagedClubIds: () => [],
    canManageClub: () => false,
  };
}

function redirectToLogin() {
  const auth = getAuth();
  if (auth.redirectToLogin) auth.redirectToLogin();
  else window.location.href = auth.loginUrlWithNext();
}

function clubDetailUrl(clubId) {
  const base = cfg(PAGE_CONFIG, 'detail-base', DEFAULTS['detail-base']).replace(/\/$/, '');
  return `${base}?id=${encodeURIComponent(clubId)}`;
}

async function fetchData() {
  const path = cfg(PAGE_CONFIG, 'clubs-data', DEFAULTS['clubs-data']);
  try {
    const resp = await fetch(path);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

function normalize(str) {
  return String(str || '').toLowerCase().trim();
}

function clubMatchesSearch(club, query) {
  if (!query) return true;
  const q = normalize(query);
  const fields = [club.name, club.tag, club.id, ...(club.tags || [])].map(normalize);
  return fields.some((f) => f.includes(q));
}

function getVisibleClubs(clubs) {
  const auth = getAuth();
  return clubs.filter((club) => {
    if (ACTIVE_TAGS.size && !ACTIVE_TAGS.has(normalize(club.tag))) return false;
    if (FILTER_STATE.membership === 'my-clubs') {
      if (!auth.isAuthenticated() || !auth.isClubJoined(club.id)) return false;
    }
    if (FILTER_STATE.membership === 'my-managed') {
      if (!auth.isAnyAdmin?.() || !auth.canManageClub?.(club.id)) return false;
    }
    if (SEARCH_QUERY && !clubMatchesSearch(club, SEARCH_QUERY)) return false;
    return true;
  });
}

function buildClubCard(club) {
  const auth = getAuth();
  const joined = auth.isClubJoined(club.id);
  const isAdmin = auth.getAdminOf().includes(club.id);
  const isManaging = auth.isClubAdmin?.() && auth.canManageClub?.(club.id);
  const joinLabel = cfg(PAGE_CONFIG, 'join-label', DEFAULTS['join-label']);
  const joinedLabel = cfg(PAGE_CONFIG, 'joined-label', DEFAULTS['joined-label']);
  const adminBadgeLabel = cfg(PAGE_CONFIG, 'admin-badge-label', DEFAULTS['admin-badge-label']);

  const li = document.createElement('li');
  li.className = 'cl-card';
  li.dataset.clubId = club.id;

  const link = document.createElement('a');
  link.className = 'cl-card-link';
  link.href = clubDetailUrl(club.id);

  const imgWrap = document.createElement('div');
  imgWrap.className = 'cl-card-img-wrap';
  const img = document.createElement('img');
  img.className = 'cl-card-img';
  img.src = `${IMG_BASE}${club.image || `${club.id}.avif`}`;
  img.alt = club.name;
  img.loading = 'lazy';
  img.onerror = () => { imgWrap.style.background = club.iconBg || 'var(--color-surface)'; img.remove(); };
  imgWrap.append(img);

  const info = document.createElement('div');
  info.className = 'cl-card-info';

  const cat = document.createElement('span');
  cat.className = 'cl-card-cat';
  cat.textContent = club.tag || '';

  const name = document.createElement('div');
  name.className = 'cl-card-name';
  name.textContent = club.name;

  const desc = document.createElement('p');
  desc.className = 'cl-card-desc';
  desc.textContent = club.desc || '';

  if (isManaging) {
    const badge = document.createElement('span');
    badge.className = 'cl-card-admin-badge';
    badge.textContent = adminBadgeLabel;
    info.append(cat, badge, name, desc);
  } else {
    info.append(cat, name, desc);
  }
  link.append(imgWrap, info);

  const actions = document.createElement('div');
  actions.className = 'cl-card-actions';

  const joinBtn = document.createElement('button');
  joinBtn.type = 'button';
  joinBtn.className = `cl-card-join${joined ? ' is-joined' : ''}`;
  joinBtn.dataset.clubId = club.id;
  joinBtn.disabled = isAdmin;
  joinBtn.textContent = joined ? joinedLabel : joinLabel;
  joinBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!getAuth().isAuthenticated()) {
      redirectToLogin();
      return;
    }
    if (isAdmin) return;
    const nowJoined = window.AdobeJoinModal?.toggleClubJoinWithModal(club, { events: ALL_EVENTS })
      ?? getAuth().toggleClubJoin(club.id);
    if (nowJoined === null) return;
    joinBtn.classList.toggle('is-joined', nowJoined);
    joinBtn.textContent = nowJoined ? joinedLabel : joinLabel;
  });

  actions.append(joinBtn);
  li.append(link, actions);
  return li;
}

function renderGrid(grid, noResults) {
  const visible = getVisibleClubs(ALL_CLUBS);
  grid.innerHTML = '';
  noResults.hidden = visible.length > 0;
  grid.hidden = visible.length === 0;
  visible.forEach((club) => grid.append(buildClubCard(club)));
}

function buildFilterGroup(title, items, type) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'cl-filter-group';

  const legend = document.createElement('legend');
  legend.className = 'cl-filter-group-title';
  legend.textContent = title;

  const list = document.createElement('ul');
  list.className = 'cl-filter-list';

  items.forEach(({ label, value, checked }) => {
    const li = document.createElement('li');
    const lbl = document.createElement('label');
    lbl.className = 'cl-filter-option';

    const input = document.createElement('input');
    input.type = type === 'categories' ? 'checkbox' : 'radio';
    input.name = `cl-filter-${type}`;
    input.value = value;
    input.dataset.filterType = type;
    if (checked) input.checked = true;

    lbl.append(input, document.createTextNode(` ${label}`));
    li.append(lbl);
    list.append(li);
  });

  fieldset.append(legend, list);
  return fieldset;
}

function buildSidebar(clubs, grid, noResults) {
  const auth = getAuth();
  const sidebar = document.createElement('aside');
  sidebar.className = 'cl-sidebar';
  sidebar.id = 'clubs-sidebar';
  sidebar.setAttribute('aria-label', cfg(PAGE_CONFIG, 'filters-title', DEFAULTS['filters-title']));

  const header = document.createElement('div');
  header.className = 'cl-sidebar-header';

  const title = document.createElement('h3');
  title.className = 'cl-sidebar-title';
  title.textContent = cfg(PAGE_CONFIG, 'filters-title', DEFAULTS['filters-title']);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'cl-sidebar-clear';
  clearBtn.textContent = cfg(PAGE_CONFIG, 'clear-filters-text', DEFAULTS['clear-filters-text']);
  clearBtn.addEventListener('click', () => {
    FILTER_STATE.membership = 'all';
    ACTIVE_TAGS.clear();
    SEARCH_QUERY = '';
    const searchInput = document.querySelector('.cl-search-input');
    if (searchInput) searchInput.value = '';
    sidebar.querySelectorAll('[data-filter-type]').forEach((inp) => {
      if (inp.type === 'radio') inp.checked = inp.value === 'all';
      if (inp.type === 'checkbox') inp.checked = false;
    });
    renderGrid(grid, noResults);
  });

  header.append(title, clearBtn);
  sidebar.append(header);

  sidebar.append(buildFilterGroup(
    cfg(PAGE_CONFIG, 'membership-group-title', DEFAULTS['membership-group-title']),
    [
      { label: cfg(PAGE_CONFIG, 'membership-all-label', DEFAULTS['membership-all-label']), value: 'all', checked: FILTER_STATE.membership === 'all' },
      { label: cfg(PAGE_CONFIG, 'membership-my-label', DEFAULTS['membership-my-label']), value: 'my-clubs', checked: FILTER_STATE.membership === 'my-clubs' },
      ...(auth.isClubAdmin?.() && !auth.isAdmin?.() ? [{
        label: cfg(PAGE_CONFIG, 'membership-managed-label', DEFAULTS['membership-managed-label']),
        value: 'my-managed',
        checked: FILTER_STATE.membership === 'my-managed',
      }] : []),
    ],
    'membership',
  ));

  const tagCounts = {};
  clubs.forEach((c) => {
    const key = normalize(c.tag);
    if (key) tagCounts[key] = (tagCounts[key] || 0) + 1;
  });
  const catItems = Object.entries(tagCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value]) => ({ label: value.charAt(0).toUpperCase() + value.slice(1), value, checked: false }));
  sidebar.append(buildFilterGroup(
    cfg(PAGE_CONFIG, 'categories-group-title', DEFAULTS['categories-group-title']),
    catItems,
    'categories',
  ));

  if (!getAuth().isAuthenticated()) {
    const hint = document.createElement('p');
    hint.className = 'cl-filter-hint';
    hint.textContent = cfg(PAGE_CONFIG, 'guest-filter-hint', DEFAULTS['guest-filter-hint']);
    sidebar.querySelector('.cl-filter-list')?.after(hint);
  }

  sidebar.querySelectorAll('[data-filter-type]').forEach((input) => {
    input.addEventListener('change', () => {
      const { filterType } = input.dataset;
      const { value } = input;
      if (filterType === 'membership') FILTER_STATE.membership = value;
      if (filterType === 'categories') {
        if (input.checked) ACTIVE_TAGS.add(value);
        else ACTIVE_TAGS.delete(value);
      }
      renderGrid(grid, noResults);
    });
  });

  return sidebar;
}

function buildToolbar(grid, noResults) {
  const toolbar = document.createElement('div');
  toolbar.className = 'cl-toolbar';

  const searchBox = document.createElement('div');
  searchBox.className = 'cl-search-box';

  const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  searchIcon.setAttribute('class', 'cl-search-icon');
  searchIcon.setAttribute('width', '16');
  searchIcon.setAttribute('height', '16');
  searchIcon.setAttribute('viewBox', '0 0 24 24');
  searchIcon.setAttribute('fill', 'none');
  searchIcon.setAttribute('stroke', 'currentColor');
  searchIcon.setAttribute('stroke-width', '2');
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.innerHTML = '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>';

  const placeholder = cfg(PAGE_CONFIG, 'search-placeholder', DEFAULTS['search-placeholder']);
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'cl-search-input';
  searchInput.placeholder = placeholder;
  searchInput.setAttribute('aria-label', placeholder);
  searchInput.autocomplete = 'off';

  searchInput.addEventListener('input', () => {
    SEARCH_QUERY = searchInput.value;
    renderGrid(grid, noResults);
  });

  searchBox.append(searchIcon, searchInput);
  toolbar.append(searchBox);
  return toolbar;
}

export default async function decorate(block) {
  PAGE_CONFIG = readPageConfig(block, DEFAULTS);

  block.textContent = '';
  await loadClubsDependencies();

  const section = document.createElement('div');
  section.className = 'cl-section-inner';

  const layout = document.createElement('div');
  layout.className = 'cl-layout';

  const main = document.createElement('div');
  main.className = 'cl-main';

  const grid = document.createElement('ul');
  grid.className = 'cl-grid';
  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-label', 'Clubs');

  const noResults = document.createElement('p');
  noResults.className = 'cl-no-results';
  const emptyTitle = cfg(PAGE_CONFIG, 'empty-title', DEFAULTS['empty-title']);
  const emptyText = cfg(PAGE_CONFIG, 'empty-text', DEFAULTS['empty-text']);
  noResults.textContent = emptyText ? `${emptyTitle} ${emptyText}`.trim() : emptyTitle;
  noResults.hidden = true;

  const loading = document.createElement('p');
  loading.className = 'cl-loading';
  loading.textContent = cfg(PAGE_CONFIG, 'loading-text', DEFAULTS['loading-text']);
  main.append(loading);

  block.append(section);
  section.append(layout);

  const data = await fetchData();
  loading.remove();

  if (!data?.clubs?.length) {
    const err = document.createElement('p');
    err.className = 'cl-no-results';
    err.textContent = cfg(PAGE_CONFIG, 'error-text', DEFAULTS['error-text']);
    main.append(err);
    layout.append(main);
    return;
  }

  ALL_CLUBS = data.clubs || [];
  ALL_EVENTS = data.events || [];

  const membershipParam = new URLSearchParams(window.location.search).get('membership');
  if (['all', 'my-clubs', 'my-managed'].includes(membershipParam)) {
    FILTER_STATE.membership = membershipParam;
  }

  const sidebar = buildSidebar(ALL_CLUBS, grid, noResults);
  const toolbar = buildToolbar(grid, noResults);

  main.append(toolbar, grid, noResults);
  layout.append(sidebar, main);
  renderGrid(grid, noResults);

  const sidebarEl = document.getElementById('clubs-sidebar');
  if (sidebarEl) {
    const NAV_OFFSET = 72;
    const sync = () => {
      if (window.innerWidth <= 900) {
        sidebarEl.style.removeProperty('top');
        return;
      }
      sidebarEl.style.top = `${NAV_OFFSET + 16}px`;
    };
    sync();
    window.addEventListener('resize', sync, { passive: true });
  }
}
