/**
 * Resources List — search, filters, featured article, grouped grid, read modal.
 * da.live: key | value config rows; records from data.json + localStorage articles.
 */
import { loadScript } from '../../scripts/aem.js';
import { readPageConfig, cfg } from '../club-shared/block-config.js';

export const RESOURCES_LIST_DEFAULTS = {
  'clubs-data': '/data/data.json',
  'search-placeholder': 'Search articles…',
  'category-label': 'Category',
  'club-label': 'Club',
  'filter-all-categories': 'All',
  'filter-all-clubs': 'All clubs',
  'filter-organisation': 'Organisation',
  'loading-text': 'Loading resources…',
  'error-text': 'Resources unavailable right now.',
  'empty-text': 'No articles match your search.',
  'featured-badge': 'Featured',
  'featured-label': "Editor's pick",
  'featured-read': 'Read article',
  'card-read': 'Read →',
  'admin-add-btn': '+ Add Article',
  'admin-toast-created': 'Article created',
  'admin-toast-updated': 'Article updated',
  'admin-toast-error': 'Could not save article. Check required fields and try again.',
};

const ARTICLE_MIN_TITLE = 5;
const ARTICLE_MIN_EXCERPT = 20;
const ARTICLE_MIN_BODY = 120;

const IMG_BASES = {
  clubs: '/assets/images/clubs/',
  events: '/assets/images/events/',
  index: '/assets/images/index/',
};
const IMG_FALLBACK = '/assets/images/clubs/clubs-hero1.avif';
const ORGANISATION_ID = 'organisation';
const ORG_AUTHOR_PATTERN = /clubs admin|finance|people team|hr ·|internal comms|events team/i;
const IMAGE_TO_CLUB_ID = {
  'adobe-lens': 'adobe-lens',
  'dev-guild': 'dev-guild',
  sportzone: 'sportzone',
  'adobe-creatives': 'adobe-creatives',
  food: 'food-brew',
  readers: 'book-club',
  games: 'board-games',
  'green-adobe': 'green-adobe',
  volunteer: 'volunteering-club',
  wellbeing: 'mental-health',
};
const ARTICLE_IMAGE_OPTIONS = [
  { label: 'Photography & visual arts', value: 'clubs/adobe-lens.avif' },
  { label: 'Creative design & illustration', value: 'clubs/adobe-creatives.avif' },
  { label: 'Tech, coding & engineering', value: 'clubs/dev-guild.avif' },
  { label: 'Sports, fitness & recreation', value: 'clubs/sportzone.avif' },
  { label: 'Reading, books & knowledge', value: 'clubs/readers.avif' },
  { label: 'Games, strategy & fun', value: 'clubs/games.avif' },
  { label: 'Nature, green & eco efforts', value: 'clubs/green-adobe.avif' },
  { label: 'Community service & volunteering', value: 'clubs/volunteer.avif' },
  { label: 'Mental health & wellbeing', value: 'clubs/wellbeing.avif' },
  { label: 'Food culture & tasting', value: 'clubs/food.avif' },
  { label: 'Outdoor walk / street gathering', value: 'events/evt-hero1.avif' },
  { label: 'Team collaboration / brainstorm', value: 'events/evt-hero2.avif' },
  { label: 'Live showcase / audience moment', value: 'events/evt-hero3.avif' },
  { label: 'Workshop / whiteboard session', value: 'events/evt-hero7.avif' },
  { label: 'Group discussion / open circle', value: 'events/evt-hero8.avif' },
  { label: 'Club culture & community vibe', value: 'clubs/clubs-hero1.avif' },
  { label: 'High energy / crowd moment', value: 'clubs/clubs-hero3.avif' },
  { label: 'Team at work (group visual)', value: 'index/dev-grp.avif' },
  { label: 'Budget, planning & policy', value: 'index/finance.avif' },
];

let PAGE_CONFIG = { ...RESOURCES_LIST_DEFAULTS };
let ALL_ARTICLES = [];
let ALL_CLUBS = [];
let BASE_ARTICLES = [];
let SEARCH_QUERY = '';
let ACTIVE_CATS = new Set();
let ACTIVE_CLUBS = new Set();
let FILTER_UI = null;
let authLoaded = false;

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getAuth() {
  return window.AdobeClubsAuth || {
    isAuthenticated: () => false,
    isAdmin: () => false,
    isClubAdmin: () => false,
    isAnyAdmin: () => false,
    getManagedClubIds: () => [],
    canManageClub: () => false,
    mergePublishedArticles: (articles) => articles || [],
    getAllCustomArticles: () => [],
    addCustomArticle: () => false,
    savePublishedArticle: () => false,
    deletePublishedArticle: () => false,
    onPublishedContentChange: () => {},
  };
}

async function ensureAuth() {
  if (authLoaded || window.AdobeClubsAuth) {
    authLoaded = true;
    return;
  }
  await loadScript(`${window.hlx?.codeBasePath || ''}/scripts/auth-guard.js`);
  authLoaded = true;
}

function normalize(str) {
  return String(str || '').toLowerCase().trim();
}

async function fetchData() {
  const path = cfg(PAGE_CONFIG, 'clubs-data', RESOURCES_LIST_DEFAULTS['clubs-data']);
  try {
    const resp = await fetch(path);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

function findClub(idOrName) {
  if (!idOrName || idOrName === ORGANISATION_ID) return null;
  const raw = String(idOrName).trim();
  const lower = raw.toLowerCase();
  return ALL_CLUBS.find((c) => (
    c.id === raw
    || c.id === lower
    || c.name.toLowerCase() === lower
    || lower.includes(c.name.toLowerCase())
    || lower.includes(c.id.replace(/-/g, ' '))
  )) || null;
}

function clubIdFromImage(article) {
  const blob = `${String(article.imagePath || '').toLowerCase()}/${String(article.image || '').toLowerCase()}`;
  return Object.entries(IMAGE_TO_CLUB_ID).find(([fragment]) => blob.includes(fragment))?.[1] || null;
}

function clubIdFromAuthor(author) {
  const text = String(author || '').toLowerCase();
  if (!text || ORG_AUTHOR_PATTERN.test(text)) return null;
  const club = ALL_CLUBS.find((c) => (
    text.includes(c.name.toLowerCase())
    || text.includes(c.id.replace(/-/g, ' '))
  ));
  return club?.id || null;
}

function resolveArticleClubId(article) {
  const stored = String(article.clubId || '').trim();
  if (stored && !['clubs', 'events', 'index'].includes(stored)) {
    if (stored === ORGANISATION_ID) return ORGANISATION_ID;
    const club = findClub(stored);
    if (club) return club.id;
  }
  return clubIdFromImage(article) || clubIdFromAuthor(article.author) || ORGANISATION_ID;
}

function enrichArticles(articles) {
  return (articles || []).map((art) => {
    const clubId = resolveArticleClubId(art);
    const club = findClub(clubId);
    return {
      ...art,
      clubId,
      clubName: art.clubName || (clubId === ORGANISATION_ID ? undefined : club?.name),
    };
  });
}

function loadArticles(baseArticles) {
  BASE_ARTICLES = baseArticles || [];
  ALL_ARTICLES = enrichArticles(getAuth().mergePublishedArticles?.(BASE_ARTICLES) || BASE_ARTICLES);
}

function getImageSrc(article) {
  if (article.imagePath) {
    const [base, ...rest] = article.imagePath.split('/');
    return `${IMG_BASES[base] || IMG_BASES.clubs}${rest.join('/')}`;
  }
  if (article.base && article.image) {
    return `${IMG_BASES[article.base] || IMG_BASES.clubs}${article.image}`;
  }
  return IMG_FALLBACK;
}

function getPublisher(article) {
  if (article.clubId === ORGANISATION_ID) return 'Org';
  return article.clubName || article.author || 'Adobe Clubs';
}

function hasArticleContent(art) {
  return String(art?.title || '').trim().length >= ARTICLE_MIN_TITLE
    && String(art?.excerpt || '').trim().length >= ARTICLE_MIN_EXCERPT
    && String(art?.body || '').trim().length >= ARTICLE_MIN_BODY;
}

function getArticleContentFieldError(art) {
  const titleLen = String(art?.title || '').trim().length;
  const excerptLen = String(art?.excerpt || '').trim().length;
  const bodyLen = String(art?.body || '').trim().length;
  if (titleLen < ARTICLE_MIN_TITLE) {
    return {
      name: 'title',
      message: `Title must be at least ${ARTICLE_MIN_TITLE} characters.`,
    };
  }
  if (excerptLen < ARTICLE_MIN_EXCERPT) {
    return {
      name: 'excerpt',
      message: `Excerpt must be at least ${ARTICLE_MIN_EXCERPT} characters.`,
    };
  }
  if (bodyLen < ARTICLE_MIN_BODY) {
    return {
      name: 'body',
      message: `Body must be at least ${ARTICLE_MIN_BODY} characters.`,
    };
  }
  return null;
}

function updateArticleFieldCounter(input, counter, min, max) {
  if (!input || !counter) return;
  const len = String(input.value || '').trim().length;
  counter.textContent = len < min ? `${len} / ${min} min` : `${len} / ${max}`;
  counter.classList.toggle('is-valid', len >= min);
  counter.classList.toggle('is-invalid', len > 0 && len < min);
}

function bindArticleFieldCounters(form) {
  if (!form || form.dataset.countersBound) return;
  form.dataset.countersBound = 'true';

  const fields = [
    { name: 'title', min: ARTICLE_MIN_TITLE, max: 120 },
    { name: 'excerpt', min: ARTICLE_MIN_EXCERPT, max: 240 },
    { name: 'body', min: ARTICLE_MIN_BODY, max: 2000 },
  ];

  fields.forEach(({ name, min, max }) => {
    const input = form.querySelector(`[name="${name}"]`);
    const counter = form.querySelector(`[data-char-count="${name}"]`);
    if (!input || !counter) return;

    const refresh = () => {
      updateArticleFieldCounter(input, counter, min, max);
      input.setCustomValidity('');
    };

    input.addEventListener('input', refresh);
    refresh();
  });
}

function refreshArticleFieldCounters(form) {
  if (!form) return;
  [
    { name: 'title', min: ARTICLE_MIN_TITLE, max: 120 },
    { name: 'excerpt', min: ARTICLE_MIN_EXCERPT, max: 240 },
    { name: 'body', min: ARTICLE_MIN_BODY, max: 2000 },
  ].forEach(({ name, min, max }) => {
    const input = form.querySelector(`[name="${name}"]`);
    const counter = form.querySelector(`[data-char-count="${name}"]`);
    updateArticleFieldCounter(input, counter, min, max);
    input?.setCustomValidity('');
  });
}

function isFeaturedArticle(art) {
  return Boolean(art?.featured && hasArticleContent(art));
}

function articleMatchesSearch(article, query) {
  if (!query) return true;
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const fields = [
    article.title, article.excerpt, article.body,
    article.category, article.author, article.readTime, getPublisher(article),
  ].map(normalize);
  return tokens.every((t) => fields.some((f) => f.includes(t)));
}

function getVisibleArticles() {
  return ALL_ARTICLES.filter(hasArticleContent).filter((art) => {
    if (ACTIVE_CATS.size && !ACTIVE_CATS.has(art.category)) return false;
    if (ACTIVE_CLUBS.size && !ACTIVE_CLUBS.has(art.clubId)) return false;
    if (SEARCH_QUERY && !articleMatchesSearch(art, SEARCH_QUERY)) return false;
    return true;
  });
}

function canManageArticle(art) {
  const auth = getAuth();
  if (auth.isAdmin?.()) return true;
  if (!auth.isClubAdmin?.()) return false;
  return Boolean(art?.clubId && auth.canManageClub?.(art.clubId));
}

function closeAllResourceCardMenus() {
  document.querySelectorAll('.rs-card-menu.is-open').forEach((menu) => {
    menu.classList.remove('is-open');
    menu.querySelector('.rs-card-menu-btn')?.setAttribute('aria-expanded', 'false');
  });
}

function bindResourceCardMenuDismiss() {
  if (window.__resourcesListCardMenuBound) return;
  window.__resourcesListCardMenuBound = true;
  document.addEventListener('click', closeAllResourceCardMenus);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllResourceCardMenus();
  });
}

function appendAdminArticleMenu(visual, art) {
  if (!canManageArticle(art)) return;
  bindResourceCardMenuDismiss();

  const menu = document.createElement('div');
  menu.className = 'rs-card-menu';
  menu.dataset.adminActions = '';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'rs-card-menu-btn';
  toggle.setAttribute('aria-label', 'Article options');
  toggle.setAttribute('aria-haspopup', 'menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

  const panel = document.createElement('div');
  panel.className = 'rs-card-menu-panel';
  panel.setAttribute('role', 'menu');

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'rs-card-menu-item';
  editBtn.setAttribute('role', 'menuitem');
  editBtn.textContent = 'Edit article';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllResourceCardMenus();
    window.__resourcesAdmin?.openEdit?.(art.id);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'rs-card-menu-item rs-card-menu-item--danger';
  deleteBtn.setAttribute('role', 'menuitem');
  deleteBtn.textContent = 'Delete article';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllResourceCardMenus();
    window.__resourcesAdmin?.deleteArticle?.(art.id);
  });

  panel.append(editBtn, deleteBtn);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = menu.classList.contains('is-open');
    closeAllResourceCardMenus();
    if (!wasOpen) {
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });

  menu.addEventListener('click', (e) => e.stopPropagation());
  menu.append(toggle, panel);
  visual.append(menu);
}

function buildCard(article) {
  const card = document.createElement('article');
  card.className = 'rs-card';
  card.dataset.artId = article.id;
  card.tabIndex = 0;

  const visual = document.createElement('div');
  visual.className = 'rs-card-visual';
  const img = document.createElement('img');
  img.src = getImageSrc(article);
  img.alt = '';
  img.loading = 'lazy';
  img.onerror = () => { img.src = IMG_FALLBACK; };
  visual.append(img);
  appendAdminArticleMenu(visual, article);

  const body = document.createElement('div');
  body.className = 'rs-card-body';

  const publisher = document.createElement('span');
  publisher.className = 'rs-card-publisher';
  publisher.textContent = getPublisher(article);

  const title = document.createElement('h3');
  title.className = 'rs-card-title';
  title.textContent = article.title;

  const excerpt = document.createElement('p');
  excerpt.className = 'rs-card-excerpt';
  excerpt.textContent = article.excerpt;

  const meta = document.createElement('div');
  meta.className = 'rs-card-meta';
  const dateMeta = document.createElement('span');
  dateMeta.textContent = [article.date, article.readTime].filter(Boolean).join(' · ');
  const readLink = document.createElement('span');
  readLink.className = 'rs-card-read';
  readLink.textContent = cfg(PAGE_CONFIG, 'card-read', RESOURCES_LIST_DEFAULTS['card-read']);
  meta.append(dateMeta, readLink);

  body.append(publisher, title, excerpt, meta);

  card.append(visual, body);

  card.addEventListener('click', (e) => {
    if (e.target.closest('[data-admin-actions]')) return;
    openModal(article);
  });
  card.addEventListener('keydown', (e) => {
    if (e.target.closest('[data-admin-actions]')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(article); }
  });

  return card;
}

function openModal(article) {
  const existing = document.getElementById('rs-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'rs-modal-overlay open';
  overlay.id = 'rs-modal';

  const glass = document.createElement('div');
  glass.className = 'rs-modal-glass';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'rs-modal-close';
  closeBtn.setAttribute('aria-label', 'Close article');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', handleEsc);

  const header = document.createElement('div');
  header.className = 'rs-modal-header';
  if (article.accent) header.style.borderLeftColor = article.accent;

  const cat = document.createElement('p');
  cat.className = 'rs-modal-cat';
  cat.textContent = article.category;

  const modalTitle = document.createElement('h2');
  modalTitle.className = 'rs-modal-title';
  modalTitle.textContent = article.title;

  const modalMeta = document.createElement('div');
  modalMeta.className = 'rs-modal-meta';
  modalMeta.innerHTML = `<span>${esc([article.author, article.date, article.readTime].filter(Boolean).join(' · '))}</span>`;

  header.append(cat, modalTitle, modalMeta);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'rs-modal-body';
  (article.body || '').split('\n\n').filter(Boolean).forEach((para) => {
    const p = document.createElement('p');
    p.textContent = para;
    bodyEl.append(p);
  });

  glass.append(closeBtn, header, bodyEl);
  overlay.append(glass);
  document.body.append(overlay);
  document.body.classList.add('rs-modal-open');
}

function handleEsc(e) {
  if (e.key === 'Escape') closeModal();
}

function closeModal() {
  const overlay = document.getElementById('rs-modal');
  if (!overlay) return;
  document.body.classList.remove('rs-modal-open');
  document.removeEventListener('keydown', handleEsc);
  overlay.remove();
}

function renderFeatured(featuredEl, article) {
  if (!featuredEl) return;
  if (!article) {
    featuredEl.hidden = true;
    featuredEl.innerHTML = '';
    return;
  }

  featuredEl.hidden = false;
  featuredEl.dataset.artId = article.id;
  featuredEl.innerHTML = `
    <div class="rs-featured-visual">
      <img src="${esc(getImageSrc(article))}" alt="" loading="lazy" />
      <span class="rs-featured-badge">${esc(cfg(PAGE_CONFIG, 'featured-badge', RESOURCES_LIST_DEFAULTS['featured-badge']))}</span>
      <span class="rs-card-publisher">${esc(getPublisher(article))}</span>
    </div>
    <div class="rs-featured-body">
      <span class="rs-featured-label">${esc(cfg(PAGE_CONFIG, 'featured-label', RESOURCES_LIST_DEFAULTS['featured-label']))}</span>
      <span class="rs-featured-cat">${esc(article.category)}</span>
      <h2 class="rs-featured-title">${esc(article.title)}</h2>
      <p class="rs-featured-excerpt">${esc(article.excerpt)}</p>
      <div class="rs-featured-meta">
        <span>${esc(article.author)}</span>
        <span>${esc(article.date)}</span>
        <span>${esc(article.readTime)}</span>
      </div>
      <span class="rs-featured-read">
        ${esc(cfg(PAGE_CONFIG, 'featured-read', RESOURCES_LIST_DEFAULTS['featured-read']))}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </span>
    </div>`;

  appendAdminArticleMenu(featuredEl.querySelector('.rs-featured-visual'), article);

  featuredEl.onclick = (e) => {
    if (e.target.closest('[data-admin-actions]')) return;
    openModal(article);
  };
  featuredEl.onkeydown = (e) => {
    if (e.target.closest('[data-admin-actions]')) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(article); }
  };
  featuredEl.tabIndex = 0;
  featuredEl.setAttribute('role', 'button');
}

function renderGrid(grid, noResults, featuredEl) {
  const filtered = getVisibleArticles();
  const featured = filtered.find(isFeaturedArticle) || null;
  renderFeatured(featuredEl, featured);

  const list = featured ? filtered.filter((a) => a.id !== featured.id) : filtered;
  grid.innerHTML = '';
  noResults.hidden = list.length > 0 || Boolean(featured);

  if (!list.length) return;

  const grouped = new Map();
  list.forEach((art) => {
    const cat = art.category || 'General';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push(art);
  });

  grouped.forEach((articles, category) => {
    const section = document.createElement('section');
    section.className = 'rs-club-section';

    const head = document.createElement('header');
    head.className = 'rs-club-head';
    const heading = document.createElement('h2');
    heading.className = 'rs-club-title';
    heading.textContent = category;
    head.append(heading);

    const row = document.createElement('div');
    row.className = 'rs-cards-row';
    row.setAttribute('role', 'list');
    articles.forEach((art) => row.append(buildCard(art)));

    section.append(head, row);
    grid.append(section);
  });
}

function buildChip(label, value, container, onToggle) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rs-filter-chip';
  btn.textContent = label;
  btn.dataset.value = value;
  btn.addEventListener('click', () => onToggle(value, btn));
  container.append(btn);
  return btn;
}

function toggleClubChip(value, btn, allChip, grid, noResults, featuredEl) {
  if (ACTIVE_CLUBS.has(value)) {
    ACTIVE_CLUBS.delete(value);
    btn.classList.remove('active');
  } else {
    ACTIVE_CLUBS.add(value);
    btn.classList.add('active');
    allChip.classList.remove('active');
  }
  if (ACTIVE_CLUBS.size === 0) allChip.classList.add('active');
  renderGrid(grid, noResults, featuredEl);
}

function refreshFilterChips() {
  if (!FILTER_UI) return;
  const {
    catChips, clubChips, allCatChip, allClubChip, grid, noResults, featuredEl,
  } = FILTER_UI;

  const displayable = ALL_ARTICLES.filter(hasArticleContent);
  const categories = [...new Set(displayable.map((a) => a.category).filter(Boolean))].sort();
  const clubIds = new Set(displayable.map((a) => a.clubId).filter(Boolean));

  ACTIVE_CATS.forEach((cat) => {
    if (!categories.includes(cat)) ACTIVE_CATS.delete(cat);
  });
  ACTIVE_CLUBS.forEach((clubId) => {
    if (!clubIds.has(clubId)) ACTIVE_CLUBS.delete(clubId);
  });

  catChips.querySelectorAll('.rs-filter-chip:not([data-value="all"])').forEach((chip) => chip.remove());
  categories.forEach((cat) => {
    const chip = buildChip(cat, cat, catChips, (value, btn) => {
      if (ACTIVE_CATS.has(value)) {
        ACTIVE_CATS.delete(value);
        btn.classList.remove('active');
      } else {
        ACTIVE_CATS.add(value);
        btn.classList.add('active');
        allCatChip.classList.remove('active');
      }
      if (ACTIVE_CATS.size === 0) allCatChip.classList.add('active');
      renderGrid(grid, noResults, featuredEl);
    });
    if (ACTIVE_CATS.has(cat)) {
      chip.classList.add('active');
      allCatChip.classList.remove('active');
    }
  });
  if (ACTIVE_CATS.size === 0) allCatChip.classList.add('active');

  clubChips.querySelectorAll('.rs-filter-chip:not([data-value="all"])').forEach((chip) => chip.remove());
  if (clubIds.has(ORGANISATION_ID)) {
    const orgChip = buildChip(
      cfg(PAGE_CONFIG, 'filter-organisation', RESOURCES_LIST_DEFAULTS['filter-organisation']),
      ORGANISATION_ID,
      clubChips,
      (value, btn) => toggleClubChip(value, btn, allClubChip, grid, noResults, featuredEl),
    );
    if (ACTIVE_CLUBS.has(ORGANISATION_ID)) {
      orgChip.classList.add('active');
      allClubChip.classList.remove('active');
    }
  }
  ALL_CLUBS.forEach((club) => {
    if (!clubIds.has(club.id)) return;
    const chip = buildChip(club.name, club.id, clubChips, (value, btn) => {
      toggleClubChip(value, btn, allClubChip, grid, noResults, featuredEl);
    });
    if (ACTIVE_CLUBS.has(club.id)) {
      chip.classList.add('active');
      allClubChip.classList.remove('active');
    }
  });
  if (ACTIVE_CLUBS.size === 0) allClubChip.classList.add('active');
}

function buildToolbar(grid, noResults, featuredEl) {
  const toolbar = document.createElement('div');
  toolbar.className = 'rs-toolbar';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'rs-search-wrap';

  const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  searchIcon.setAttribute('class', 'rs-search-icon');
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
  searchInput.className = 'rs-search-input';
  searchInput.id = 'rs-search';
  searchInput.placeholder = cfg(PAGE_CONFIG, 'search-placeholder', RESOURCES_LIST_DEFAULTS['search-placeholder']);
  searchInput.setAttribute('aria-label', cfg(PAGE_CONFIG, 'search-placeholder', RESOURCES_LIST_DEFAULTS['search-placeholder']));
  searchInput.autocomplete = 'off';
  searchInput.addEventListener('input', () => {
    SEARCH_QUERY = searchInput.value;
    renderGrid(grid, noResults, featuredEl);
  });

  searchWrap.append(searchIcon, searchInput);

  const catRow = document.createElement('div');
  catRow.className = 'rs-filter-row';
  const catLabel = document.createElement('span');
  catLabel.className = 'rs-filter-row-label';
  catLabel.textContent = cfg(PAGE_CONFIG, 'category-label', RESOURCES_LIST_DEFAULTS['category-label']);
  const catChips = document.createElement('div');
  catChips.className = 'rs-filters';

  const allCatChip = buildChip(
    cfg(PAGE_CONFIG, 'filter-all-categories', RESOURCES_LIST_DEFAULTS['filter-all-categories']),
    'all',
    catChips,
    () => {
      ACTIVE_CATS.clear();
      catChips.querySelectorAll('.rs-filter-chip').forEach((c) => c.classList.remove('active'));
      allCatChip.classList.add('active');
      renderGrid(grid, noResults, featuredEl);
    },
  );
  allCatChip.classList.add('active');

  [...new Set(ALL_ARTICLES.filter(hasArticleContent).map((a) => a.category).filter(Boolean))].sort().forEach((cat) => {
    buildChip(cat, cat, catChips, (value, btn) => {
      if (ACTIVE_CATS.has(value)) {
        ACTIVE_CATS.delete(value);
        btn.classList.remove('active');
      } else {
        ACTIVE_CATS.add(value);
        btn.classList.add('active');
        allCatChip.classList.remove('active');
      }
      if (ACTIVE_CATS.size === 0) allCatChip.classList.add('active');
      renderGrid(grid, noResults, featuredEl);
    });
  });

  catRow.append(catLabel, catChips);

  const clubRow = document.createElement('div');
  clubRow.className = 'rs-filter-row';
  const clubLabel = document.createElement('span');
  clubLabel.className = 'rs-filter-row-label';
  clubLabel.textContent = cfg(PAGE_CONFIG, 'club-label', RESOURCES_LIST_DEFAULTS['club-label']);
  const clubChips = document.createElement('div');
  clubChips.className = 'rs-club-filters';

  const allClubChip = buildChip(
    cfg(PAGE_CONFIG, 'filter-all-clubs', RESOURCES_LIST_DEFAULTS['filter-all-clubs']),
    'all',
    clubChips,
    () => {
      ACTIVE_CLUBS.clear();
      clubChips.querySelectorAll('.rs-filter-chip').forEach((c) => c.classList.remove('active'));
      allClubChip.classList.add('active');
      renderGrid(grid, noResults, featuredEl);
    },
  );
  allClubChip.classList.add('active');

  if (ALL_ARTICLES.some((a) => hasArticleContent(a) && a.clubId === ORGANISATION_ID)) {
    buildChip(
      cfg(PAGE_CONFIG, 'filter-organisation', RESOURCES_LIST_DEFAULTS['filter-organisation']),
      ORGANISATION_ID,
      clubChips,
      (value, btn) => toggleClubChip(value, btn, allClubChip, grid, noResults, featuredEl),
    );
  }

  ALL_CLUBS.forEach((club) => {
    if (!ALL_ARTICLES.some((a) => hasArticleContent(a) && a.clubId === club.id)) return;
    buildChip(club.name, club.id, clubChips, (value, btn) => {
      toggleClubChip(value, btn, allClubChip, grid, noResults, featuredEl);
    });
  });

  clubRow.append(clubLabel, clubChips);
  toolbar.append(searchWrap, catRow, clubRow);
  FILTER_UI = {
    catChips, clubChips, allCatChip, allClubChip, grid, noResults, featuredEl,
  };
  return toolbar;
}

function parseReadTimeMinutes(readTime) {
  const match = String(readTime || '').match(/(\d+)/);
  return match ? match[1] : '';
}

function publishedDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showAdminToast(message) {
  const toast = document.getElementById('rs-admin-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('open');
  window.setTimeout(() => toast.classList.remove('open'), 2200);
}

function injectAdminCreator() {
  const auth = getAuth();
  if (!auth.isAnyAdmin?.()) return;

  const isClubScoped = auth.isClubAdmin?.() && !auth.isAdmin?.();
  const managedIds = auth.getManagedClubIds?.() || [];
  const creatorClubs = isClubScoped
    ? ALL_CLUBS.filter((c) => managedIds.includes(c.id))
    : ALL_CLUBS;

  const categories = [...new Set(ALL_ARTICLES.map((a) => a.category).filter(Boolean))];
  const categoryOptions = categories.map((cat) => `<option value="${esc(cat)}">${esc(cat)}</option>`).join('');
  const clubOptions = [
    isClubScoped ? '' : `<option value="${ORGANISATION_ID}">${esc(cfg(PAGE_CONFIG, 'filter-organisation', RESOURCES_LIST_DEFAULTS['filter-organisation']))}</option>`,
    ...creatorClubs.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`),
  ].join('');

  if (!document.getElementById('rs-admin-open')) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'rs-admin-add-btn';
    addBtn.id = 'rs-admin-open';
    addBtn.textContent = cfg(PAGE_CONFIG, 'admin-add-btn', RESOURCES_LIST_DEFAULTS['admin-add-btn']);
    document.body.append(addBtn);

    const toast = document.createElement('div');
    toast.className = 'rs-admin-toast';
    toast.id = 'rs-admin-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }

  if (document.getElementById('rs-admin-modal')) return;

  const modal = document.createElement('div');
  modal.className = 'rs-admin-modal';
  modal.id = 'rs-admin-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="rs-admin-modal-card" role="dialog" aria-modal="true" aria-label="Create article">
      <div class="rs-admin-head">
        <h3 class="rs-admin-title">Create Article</h3>
        <button type="button" class="rs-admin-close" id="rs-admin-close" aria-label="Close">✕</button>
      </div>
      <form class="rs-admin-form" id="rs-admin-form" novalidate>
        <div class="rs-admin-grid">
          <label><span>Category <span class="field-required" aria-hidden="true">*</span></span>
            <select required name="category"><option value="" disabled selected>Select category</option>${categoryOptions}</select>
          </label>
          <label><span>Published under <span class="field-required" aria-hidden="true">*</span></span>
            <select required name="clubId"><option value="" disabled selected>Select club or organisation</option>${clubOptions}</select>
          </label>
          <label class="rs-admin-field-block"><span class="rs-admin-field-head"><span>Title <span class="field-required" aria-hidden="true">*</span></span><span class="rs-admin-char-count" data-char-count="title" aria-live="polite">0 / 5 min</span></span><input required name="title" minlength="5" maxlength="120" /></label>
          <label><span>Author <span class="field-required" aria-hidden="true">*</span></span><input required name="author" maxlength="80" /></label>
          <label><span>Read time (minutes) <span class="field-required" aria-hidden="true">*</span></span>
            <input required type="text" name="readTime" id="rs-admin-read-time" inputmode="numeric" pattern="[0-9]*" maxlength="3" placeholder="5" autocomplete="off" />
          </label>
        </div>
        <label class="rs-admin-field-block"><span class="rs-admin-field-head"><span>Excerpt <span class="field-required" aria-hidden="true">*</span></span><span class="rs-admin-char-count" data-char-count="excerpt" aria-live="polite">0 / 20 min</span></span><textarea required name="excerpt" minlength="20" rows="2" maxlength="240"></textarea></label>
        <label class="rs-admin-field-block"><span class="rs-admin-field-head"><span>Body <span class="field-required" aria-hidden="true">*</span></span><span class="rs-admin-char-count" data-char-count="body" aria-live="polite">0 / 120 min</span></span><textarea required name="body" minlength="120" rows="6" maxlength="2000"></textarea></label>
        <label><span>Image <span class="field-required" aria-hidden="true">*</span></span>
          <select name="imagePath" required>
            ${ARTICLE_IMAGE_OPTIONS.map((opt) => `<option value="${esc(opt.value)}">${esc(opt.label)}</option>`).join('')}
          </select>
        </label>
        <label class="rs-admin-inline"><input type="checkbox" name="featured" /> <span>Featured</span></label>
        <button type="submit" class="rs-admin-submit">Create Article</button>
      </form>
    </div>`;
  document.body.append(modal);

  const form = modal.querySelector('#rs-admin-form');
  const closeBtn = modal.querySelector('#rs-admin-close');
  const readTimeInput = modal.querySelector('#rs-admin-read-time');
  const modalTitle = modal.querySelector('.rs-admin-title');
  const submitBtn = form?.querySelector('.rs-admin-submit');
  const openBtn = document.getElementById('rs-admin-open');
  let editingArticleId = null;

  bindArticleFieldCounters(form);

  const setOpen = (open) => {
    modal.classList.toggle('open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('rs-admin-open', open);
  };

  const resetForm = () => {
    editingArticleId = null;
    if (modalTitle) modalTitle.textContent = 'Create Article';
    if (submitBtn) submitBtn.textContent = 'Create Article';
    form?.reset();
    refreshArticleFieldCounters(form);
  };

  openBtn?.addEventListener('click', () => {
    resetForm();
    setOpen(true);
  });
  closeBtn?.addEventListener('click', () => setOpen(false));
  modal.addEventListener('click', (e) => { if (e.target === modal) setOpen(false); });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const readMinutes = parseInt(String(fd.get('readTime') || ''), 10);
    if (!Number.isFinite(readMinutes) || readMinutes < 1) {
      readTimeInput?.setCustomValidity('Enter a number of minutes (at least 1).');
      readTimeInput?.reportValidity();
      return;
    }
    readTimeInput?.setCustomValidity('');

    const imagePath = String(fd.get('imagePath') || '').trim();
    const clubId = String(fd.get('clubId') || '').trim();
    const clubSelect = form.querySelector('[name="clubId"]');
    const clubName = clubId === ORGANISATION_ID
      ? undefined
      : (clubSelect?.selectedOptions?.[0]?.textContent || '').trim();

    const article = {
      id: editingArticleId || `art-custom-${Date.now()}`,
      category: String(fd.get('category') || '').trim(),
      title: String(fd.get('title') || '').trim(),
      excerpt: String(fd.get('excerpt') || '').trim(),
      body: String(fd.get('body') || '').trim(),
      author: String(fd.get('author') || '').trim(),
      date: editingArticleId
        ? (ALL_ARTICLES.find((item) => item.id === editingArticleId)?.date || publishedDate())
        : publishedDate(),
      readTime: `${readMinutes} min read`,
      featured: Boolean(fd.get('featured')),
      accent: '#eb1000',
      clubId,
      clubName: clubName || undefined,
      base: imagePath.split('/')[0] || 'clubs',
      imagePath,
    };

    const contentError = getArticleContentFieldError(article);
    if (contentError) {
      const invalidInput = form.querySelector(`[name="${contentError.name}"]`);
      invalidInput?.setCustomValidity(contentError.message);
      invalidInput?.reportValidity();
      return;
    }
    refreshArticleFieldCounters(form);

    let saved = false;
    if (editingArticleId) {
      saved = auth.savePublishedArticle?.(article, { title: article.title, clubId, clubName }) !== false;
      if (saved) {
        showAdminToast(cfg(PAGE_CONFIG, 'admin-toast-updated', RESOURCES_LIST_DEFAULTS['admin-toast-updated']));
      }
    } else {
      saved = auth.addCustomArticle?.(article) === true;
      if (saved) {
        showAdminToast(cfg(PAGE_CONFIG, 'admin-toast-created', RESOURCES_LIST_DEFAULTS['admin-toast-created']));
      }
    }

    if (!saved) {
      showAdminToast(cfg(PAGE_CONFIG, 'admin-toast-error', RESOURCES_LIST_DEFAULTS['admin-toast-error']));
      return;
    }

    const notifyClub = article.clubId === ORGANISATION_ID
      ? { id: ORGANISATION_ID, name: cfg(PAGE_CONFIG, 'filter-organisation', RESOURCES_LIST_DEFAULTS['filter-organisation']) }
      : (findClub(article.clubId) || { id: article.clubId, name: clubName || article.clubName });
    if (editingArticleId) {
      window.AdobeNotifications?.notifyArticleUpdated?.(article, notifyClub);
    } else {
      window.AdobeNotifications?.notifyArticleCreated?.(article, notifyClub);
    }

    reloadArticles();
    resetForm();
    setOpen(false);
  });

  window.__resourcesAdmin = {
    openCreate() {
      resetForm();
      setOpen(true);
    },
    openEdit(articleId) {
      const art = ALL_ARTICLES.find((item) => item.id === articleId);
      if (!art || !form) return;
      editingArticleId = articleId;
      if (modalTitle) modalTitle.textContent = 'Edit Article';
      if (submitBtn) submitBtn.textContent = 'Save changes';
      form.category.value = art.category || '';
      form.clubId.value = art.clubId || ORGANISATION_ID;
      form.title.value = art.title || '';
      form.author.value = art.author || '';
      if (readTimeInput) readTimeInput.value = parseReadTimeMinutes(art.readTime);
      form.excerpt.value = art.excerpt || '';
      form.body.value = art.body || '';
      if (form.imagePath) {
        form.imagePath.value = art.imagePath || `${art.base}/${art.image}`;
      }
      if (form.featured) form.featured.checked = Boolean(art.featured);
      refreshArticleFieldCounters(form);
      setOpen(true);
    },
    deleteArticle(articleId) {
      const art = ALL_ARTICLES.find((item) => item.id === articleId);
      if (!art || !window.confirm(`Delete "${art.title}"?`)) return;
      auth.deletePublishedArticle?.(articleId, { title: art.title, clubId: art.clubId, clubName: art.clubName });
      window.AdobeNotifications?.notifyArticleDeleted?.({
        articleId,
        title: art.title,
        clubId: art.clubId,
        clubName: art.clubName,
      });
      reloadArticles();
    },
  };
}

function reloadArticles() {
  loadArticles(BASE_ARTICLES);
  refreshFilterChips();
  const grid = document.getElementById('rs-grid');
  const noResults = document.getElementById('rs-no-results');
  const featuredEl = document.getElementById('rs-featured');
  if (grid && noResults && featuredEl) renderGrid(grid, noResults, featuredEl);
}

export default async function decorate(block) {
  document.body.classList.add('resources-page');
  PAGE_CONFIG = readPageConfig(block, RESOURCES_LIST_DEFAULTS);
  await ensureAuth();

  block.innerHTML = '';
  block.classList.add('resources-list');

  const rsSection = document.createElement('section');
  rsSection.className = 'rs-section';
  rsSection.id = 'rs-section';
  rsSection.setAttribute('aria-label', 'Articles');

  const inner = document.createElement('div');
  inner.className = 'rs-section-inner';

  const loading = document.createElement('p');
  loading.className = 'rs-loading';
  loading.textContent = cfg(PAGE_CONFIG, 'loading-text', RESOURCES_LIST_DEFAULTS['loading-text']);
  inner.append(loading);
  rsSection.append(inner);
  block.append(rsSection);

  const data = await fetchData();
  loading.remove();

  if (!data) {
    const err = document.createElement('p');
    err.className = 'rs-no-results';
    err.textContent = cfg(PAGE_CONFIG, 'error-text', RESOURCES_LIST_DEFAULTS['error-text']);
    inner.append(err);
    return;
  }

  ALL_CLUBS = data.clubs || [];
  loadArticles(data.articles || []);

  const featured = document.createElement('article');
  featured.className = 'rs-featured';
  featured.id = 'rs-featured';
  featured.setAttribute('aria-label', 'Featured article');
  featured.hidden = true;

  const grid = document.createElement('div');
  grid.className = 'rs-grid';
  grid.id = 'rs-grid';

  const noResults = document.createElement('p');
  noResults.className = 'rs-no-results';
  noResults.id = 'rs-no-results';
  noResults.textContent = cfg(PAGE_CONFIG, 'empty-text', RESOURCES_LIST_DEFAULTS['empty-text']);
  noResults.hidden = true;

  inner.append(buildToolbar(grid, noResults, featured), featured, grid, noResults);
  renderGrid(grid, noResults, featured);
  injectAdminCreator();

  getAuth().onPublishedContentChange?.(() => {
    loadArticles(BASE_ARTICLES);
    refreshFilterChips();
    renderGrid(grid, noResults, featured);
  });

  const articleId = new URLSearchParams(window.location.search).get('article');
  if (articleId) {
    const art = ALL_ARTICLES.find((item) => item.id === articleId);
    if (art) openModal(art);
  }

  function handleResourcesPageIntent() {
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (hash === 'create-article' || hash === 'add-article') {
      window.__resourcesAdmin?.openCreate?.();
    }
  }

  handleResourcesPageIntent();
  window.addEventListener('hashchange', handleResourcesPageIntent);
}
