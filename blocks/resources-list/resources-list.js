/**
 * Resources List block — search, category + club filter chips, grouped article grid.
 * Fetches /data/data.json. No content needed in da.live.
 *
 * da.live table shape:
 *   | Resources List |
 *   (empty — block name only)
 */

const DATA_PATH = '/data/data.json';
const IMG_BASES = {
  clubs: '/assets/images/clubs/',
  events: '/assets/images/events/',
  index: '/assets/images/index/',
};
const IMG_FALLBACK = '/assets/images/clubs/clubs-hero1.avif';

let ALL_ARTICLES = [];
let ALL_CLUBS = [];
let SEARCH_QUERY = '';
let ACTIVE_CATS = new Set();
let ACTIVE_CLUBS = new Set();

function normalize(str) {
  return String(str || '').toLowerCase().trim();
}

async function fetchData() {
  try {
    const resp = await fetch(DATA_PATH);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
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
  if (article.clubId === 'organisation') return 'Org';
  return article.clubName || article.author || 'Adobe Clubs';
}

function articleMatchesSearch(article, query) {
  if (!query) return true;
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const fields = [
    article.title, article.excerpt, article.body,
    article.category, article.author, article.readTime,
  ].map(normalize);
  return tokens.every((t) => fields.some((f) => f.includes(t)));
}

function getVisibleArticles(articles) {
  return articles.filter((art) => {
    if (ACTIVE_CATS.size && !ACTIVE_CATS.has(normalize(art.category))) return false;

    if (ACTIVE_CLUBS.size) {
      if (ACTIVE_CLUBS.has('organisation') && art.clubId === 'organisation') return true;
      const clubName = normalize(art.clubName || art.author || '');
      const clubId = normalize(art.clubId || '');
      if (![...ACTIVE_CLUBS].some((c) => clubId.includes(c) || clubName.includes(c))) return false;
    }

    if (SEARCH_QUERY && !articleMatchesSearch(art, SEARCH_QUERY)) return false;
    return true;
  });
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
  readLink.textContent = 'Read →';
  meta.append(dateMeta, readLink);

  body.append(publisher, title, excerpt, meta);
  card.append(visual, body);

  card.addEventListener('click', () => openModal(article));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(article); }
  });

  return card;
}

function openModal(article) {
  const existing = document.getElementById('rs-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'rs-modal-overlay';
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
  const metaSpan = document.createElement('span');
  metaSpan.textContent = [article.author, article.date, article.readTime].filter(Boolean).join(' · ');
  modalMeta.append(metaSpan);

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

  requestAnimationFrame(() => overlay.classList.add('open'));
}

function handleEsc(e) {
  if (e.key === 'Escape') closeModal();
}

function closeModal() {
  const overlay = document.getElementById('rs-modal');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.classList.remove('rs-modal-open');
  document.removeEventListener('keydown', handleEsc);
  setTimeout(() => overlay.remove(), 250);
}

function groupByCategory(articles) {
  const map = new Map();
  articles.forEach((art) => {
    const cat = art.category || 'General';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(art);
  });
  return map;
}

function renderGrid(grid, noResults) {
  const visible = getVisibleArticles(ALL_ARTICLES);
  grid.innerHTML = '';
  noResults.hidden = visible.length > 0;

  if (visible.length === 0) return;

  const grouped = groupByCategory(visible);
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
  btn.addEventListener('click', () => {
    onToggle(value, btn);
  });
  container.append(btn);
  return btn;
}

function buildToolbar(grid, noResults) {
  const toolbar = document.createElement('div');
  toolbar.className = 'rs-toolbar';

  // Search
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
  searchInput.placeholder = 'Search articles…';
  searchInput.setAttribute('aria-label', 'Search articles');
  searchInput.autocomplete = 'off';
  searchInput.addEventListener('input', () => {
    SEARCH_QUERY = searchInput.value;
    renderGrid(grid, noResults);
  });

  searchWrap.append(searchIcon, searchInput);

  // Category chips
  const catRow = document.createElement('div');
  catRow.className = 'rs-filter-row';
  const catLabel = document.createElement('span');
  catLabel.className = 'rs-filter-row-label';
  catLabel.textContent = 'Category';
  const catChips = document.createElement('div');
  catChips.className = 'rs-filters';
  catChips.id = 'rs-filters';

  const cats = [...new Set(ALL_ARTICLES.map((a) => a.category).filter(Boolean))].sort();

  // "All" chip
  const allCatChip = buildChip('All', 'all', catChips, () => {
    ACTIVE_CATS.clear();
    catChips.querySelectorAll('.rs-filter-chip').forEach((c) => c.classList.remove('active'));
    allCatChip.classList.add('active');
    renderGrid(grid, noResults);
  });
  allCatChip.classList.add('active');

  cats.forEach((cat) => {
    buildChip(cat, normalize(cat), catChips, (value, btn) => {
      if (ACTIVE_CATS.has(value)) {
        ACTIVE_CATS.delete(value);
        btn.classList.remove('active');
      } else {
        ACTIVE_CATS.add(value);
        btn.classList.add('active');
        allCatChip.classList.remove('active');
      }
      if (ACTIVE_CATS.size === 0) allCatChip.classList.add('active');
      renderGrid(grid, noResults);
    });
  });

  catRow.append(catLabel, catChips);

  // Club chips
  const clubRow = document.createElement('div');
  clubRow.className = 'rs-filter-row';
  const clubLabel = document.createElement('span');
  clubLabel.className = 'rs-filter-row-label';
  clubLabel.textContent = 'Club';
  const clubChips = document.createElement('div');
  clubChips.className = 'rs-club-filters';
  clubChips.id = 'rs-club-filters';

  const allClubChip = buildChip('All clubs', 'all', clubChips, () => {
    ACTIVE_CLUBS.clear();
    clubChips.querySelectorAll('.rs-filter-chip').forEach((c) => c.classList.remove('active'));
    allClubChip.classList.add('active');
    renderGrid(grid, noResults);
  });
  allClubChip.classList.add('active');

  const hasOrg = ALL_ARTICLES.some((a) => a.clubId === 'organisation');
  if (hasOrg) {
    buildChip('Organisation', 'organisation', clubChips, (value, btn) => {
      toggleClubChip(value, btn, allClubChip, clubChips, grid, noResults);
    });
  }

  ALL_CLUBS.forEach((club) => {
    const hasArticles = ALL_ARTICLES.some((a) => a.clubId === club.id);
    if (!hasArticles) return;
    buildChip(club.name, normalize(club.name), clubChips, (value, btn) => {
      toggleClubChip(value, btn, allClubChip, clubChips, grid, noResults);
    });
  });

  clubRow.append(clubLabel, clubChips);
  toolbar.append(searchWrap, catRow, clubRow);
  return toolbar;
}

function toggleClubChip(value, btn, allChip, container, grid, noResults) {
  if (ACTIVE_CLUBS.has(value)) {
    ACTIVE_CLUBS.delete(value);
    btn.classList.remove('active');
  } else {
    ACTIVE_CLUBS.add(value);
    btn.classList.add('active');
    allChip.classList.remove('active');
  }
  if (ACTIVE_CLUBS.size === 0) allChip.classList.add('active');
  renderGrid(grid, noResults);
}

export default async function decorate(block) {
  block.textContent = '';

  const rsSection = document.createElement('section');
  rsSection.className = 'rs-section';
  rsSection.id = 'rs-section';
  rsSection.setAttribute('aria-label', 'Articles');

  const inner = document.createElement('div');
  inner.className = 'rs-section-inner';

  const loading = document.createElement('p');
  loading.className = 'rs-loading';
  loading.textContent = 'Loading resources…';
  inner.append(loading);
  rsSection.append(inner);
  block.append(rsSection);

  const data = await fetchData();
  loading.remove();

  if (!data?.articles?.length) {
    const err = document.createElement('p');
    err.className = 'rs-no-results';
    err.textContent = 'Resources unavailable right now.';
    inner.append(err);
    return;
  }

  ALL_ARTICLES = data.articles || [];
  ALL_CLUBS = data.clubs || [];

  const grid = document.createElement('div');
  grid.className = 'rs-grid';
  grid.id = 'rs-grid';

  const noResults = document.createElement('p');
  noResults.className = 'rs-no-results';
  noResults.id = 'rs-no-results';
  noResults.textContent = 'No articles match your search.';
  noResults.hidden = true;

  const toolbar = buildToolbar(grid, noResults);

  inner.append(toolbar, grid, noResults);
  renderGrid(grid, noResults);
}
