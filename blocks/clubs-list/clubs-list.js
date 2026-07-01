/**
 * Clubs List block — search bar, sidebar filters, card grid.
 * Fetches /data/data.json. No content needed in da.live.
 *
 * da.live table shape:
 *   | Clubs List |
 *   (empty — block name only)
 */

const DATA_PATH = '/data/data.json';
const IMG_BASE = '/assets/images/clubs/';

let ALL_CLUBS = [];
let ALL_EVENTS = [];
let SEARCH_QUERY = '';
let ACTIVE_TAGS = new Set();
const FILTER_STATE = { membership: 'all' };

const MONTH_INDEX = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

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
  };
}

function redirectToLogin() {
  const auth = getAuth();
  if (auth.redirectToLogin) auth.redirectToLogin();
  else window.location.href = auth.loginUrlWithNext();
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetchData() {
  try {
    const resp = await fetch(DATA_PATH);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

// ── Filtering ─────────────────────────────────────────────────────────────────

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
  return clubs.filter((club) => {
    if (ACTIVE_TAGS.size && !ACTIVE_TAGS.has(normalize(club.tag))) return false;
    if (FILTER_STATE.membership === 'my-clubs') {
      if (!getAuth().isAuthenticated() || !getAuth().isClubJoined(club.id)) return false;
    }
    if (SEARCH_QUERY && !clubMatchesSearch(club, SEARCH_QUERY)) return false;
    return true;
  });
}

// ── Card ──────────────────────────────────────────────────────────────────────

function buildClubCard(club) {
  const joined = getAuth().isClubJoined(club.id);
  const isAdmin = getAuth().getAdminOf().includes(club.id);

  const li = document.createElement('li');
  li.className = 'cl-card';
  li.dataset.clubId = club.id;

  const link = document.createElement('a');
  link.className = 'cl-card-link';
  link.href = `/club?id=${encodeURIComponent(club.id)}`;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'cl-card-img-wrap';
  const img = document.createElement('img');
  img.className = 'cl-card-img';
  img.src = `${IMG_BASE}${club.image || club.id + '.avif'}`;
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

  info.append(cat, name, desc);
  link.append(imgWrap, info);

  const actions = document.createElement('div');
  actions.className = 'cl-card-actions';

  const joinBtn = document.createElement('button');
  joinBtn.type = 'button';
  joinBtn.className = `cl-card-join${joined ? ' is-joined' : ''}`;
  joinBtn.dataset.clubId = club.id;
  joinBtn.disabled = isAdmin;
  joinBtn.textContent = joined ? 'Joined' : 'Join';
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
    joinBtn.textContent = nowJoined ? 'Joined' : 'Join';
  });

  actions.append(joinBtn);
  li.append(link, actions);
  return li;
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function renderGrid(grid, noResults) {
  const visible = getVisibleClubs(ALL_CLUBS);
  grid.innerHTML = '';
  noResults.hidden = visible.length > 0;
  grid.hidden = visible.length === 0;
  visible.forEach((club) => grid.append(buildClubCard(club)));
}

// ── Sidebar filters ───────────────────────────────────────────────────────────

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
  const sidebar = document.createElement('aside');
  sidebar.className = 'cl-sidebar';
  sidebar.id = 'clubs-sidebar';
  sidebar.setAttribute('aria-label', 'Filter clubs');

  const header = document.createElement('div');
  header.className = 'cl-sidebar-header';

  const title = document.createElement('h3');
  title.className = 'cl-sidebar-title';
  title.textContent = 'Filters';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'cl-sidebar-clear';
  clearBtn.textContent = 'Clear all';
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

  sidebar.append(buildFilterGroup('Membership', [
    { label: 'All clubs', value: 'all', checked: true },
    { label: 'My clubs', value: 'my-clubs', checked: false },
  ], 'membership'));

  const tagCounts = {};
  clubs.forEach((c) => {
    const key = normalize(c.tag);
    if (key) tagCounts[key] = (tagCounts[key] || 0) + 1;
  });
  const catItems = Object.entries(tagCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value]) => ({ label: value.charAt(0).toUpperCase() + value.slice(1), value, checked: false }));
  sidebar.append(buildFilterGroup('Categories', catItems, 'categories'));

  if (!getAuth().isAuthenticated()) {
    const hint = document.createElement('p');
    hint.className = 'cl-filter-hint';
    hint.textContent = 'Sign in to filter clubs you have joined.';
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

// ── Toolbar (search) ──────────────────────────────────────────────────────────

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

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'cl-search-input';
  searchInput.placeholder = 'Search by club name or tags (e.g. photography, design)…';
  searchInput.setAttribute('aria-label', 'Search clubs');
  searchInput.autocomplete = 'off';

  searchInput.addEventListener('input', () => {
    SEARCH_QUERY = searchInput.value;
    renderGrid(grid, noResults);
  });

  searchBox.append(searchIcon, searchInput);
  toolbar.append(searchBox);
  return toolbar;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default async function decorate(block) {
  block.textContent = '';

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
  noResults.textContent = 'No clubs match your filters.';
  noResults.hidden = true;

  // Loading state
  const loading = document.createElement('p');
  loading.className = 'cl-loading';
  loading.textContent = 'Loading clubs…';
  main.append(loading);

  block.append(section);
  section.append(layout);

  const data = await fetchData();
  loading.remove();

  if (!data?.clubs?.length) {
    const err = document.createElement('p');
    err.className = 'cl-no-results';
    err.textContent = 'Clubs unavailable right now.';
    main.append(err);
    layout.append(main);
    return;
  }

  ALL_CLUBS = data.clubs || [];
  ALL_EVENTS = data.events || [];

  const sidebar = buildSidebar(ALL_CLUBS, grid, noResults);
  const toolbar = buildToolbar(grid, noResults);

  main.append(toolbar, grid, noResults);
  layout.append(sidebar, main);
  renderGrid(grid, noResults);

  // Sticky sidebar
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
