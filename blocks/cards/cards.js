/**
 * Cards — unified dynamic + static card grid.
 * da.live: preset | featured-clubs  OR  mode | dynamic, kind | club, layout | showcase, …
 */
import { fetchAppData } from '../../scripts/lib/app-data.js';
import { readPageConfig, cfg } from '../../scripts/lib/block-config.js';
import {
  buildSectionHead,
  ensureSectionHeadBeforeCards,
  hasSiblingSectionHead,
  findPairedSectionHead,
} from '../../scripts/lib/section-head.js';
import { buildClubCard } from '../../scripts/lib/cards/club-card.js';
import { buildEventCard } from '../../scripts/lib/cards/event-card.js';
import { buildSkeletonCard } from '../../scripts/lib/cards/skeleton.js';
import { resolveCardItems, getQuizState, getJoinedClubIds } from '../../scripts/lib/cards/sources.js';
import { wireCardActions } from '../../scripts/lib/cards/wire-actions.js';
import { ensureHomeCardRuntime } from '../../scripts/lib/cards/home-runtime.js';
import { mountStepsGrid } from '../../scripts/lib/cards/static-step.js';
import { mountStoriesGrid } from '../../scripts/lib/cards/static-story.js';
import { initClubPage } from '../../scripts/club/club-page.js';
import { mountClubActivities } from '../../scripts/lib/cards/club-activities.js';
import { mountClubEvents } from '../../scripts/lib/cards/club-events.js';
import { mountClubRecaps, ensureRecapDeps } from '../../scripts/lib/cards/club-recaps.js';
import { mountClubTeam } from '../../scripts/lib/cards/club-team.js';
import { mountStaticCta, parseStaticCtaConfig, STATIC_CTA_DEFAULTS } from '../../scripts/lib/cta-banner.js';

export const PRESET_DEFAULTS = {
  'featured-clubs': {
    mode: 'dynamic', kind: 'club', layout: 'showcase', action: 'navigate', source: 'featured', limit: 3,
    eyebrow: 'Clubs', title: 'Featured clubs', 'link-text': 'Browse all clubs →', 'link-href': '/clubs',
    inlineHead: true,
  },
  'upcoming-events': {
    mode: 'dynamic', kind: 'event', layout: 'showcase', action: 'navigate', source: 'upcoming', limit: 3,
    eyebrow: "What's on", title: 'Upcoming events', 'link-text': 'See all events →', 'link-href': '/events',
    inlineHead: true,
  },
  'home-clubs': {
    mode: 'dynamic', kind: 'club', layout: 'poster', action: 'join', source: 'quiz', limit: 6,
    inlineHead: false,
  },
  'home-events': {
    mode: 'dynamic', kind: 'event', layout: 'poster', action: 'rsvp', source: 'upcoming', limit: 6,
    inlineHead: false,
  },
  'home-joined-clubs': {
    mode: 'dynamic', kind: 'club', layout: 'poster', action: 'join', source: 'joined', limit: 6,
    inlineHead: false,
  },
  steps: {
    mode: 'static',
    kind: 'step',
    layout: 'steps',
    inlineHead: false,
    eyebrow: 'Simple to start',
    title: 'How it works',
    'steps-eyebrow': 'Simple to start',
    'steps-title': 'How it works',
  },
  stories: {
    mode: 'static',
    kind: 'story',
    layout: 'stories',
    inlineHead: false,
    eyebrow: 'Member stories',
    title: 'Connections made at Adobe Clubs',
    'stories-eyebrow': 'Member stories',
    'stories-title': 'Connections made at Adobe Clubs',
  },
  'club-activities': {
    mode: 'club',
    title: 'What this club does',
    'section-activities': 'What this club does',
  },
  'club-events': {
    mode: 'club',
    title: 'Find your next {tag} event',
    'section-events': 'Find your next {tag} event',
    'detail-event-base': '/event',
    'events-empty': 'No upcoming events for this club yet.',
    'events-day-empty': 'No events available for this day.',
    'filter-all-dates': 'All dates',
    'filter-today': 'Today',
    'filter-tomorrow': 'Tomorrow',
    'filter-this-week': 'This week',
    'rsvp-label': 'RSVP',
    'rsvpd-label': "RSVP'd",
    'members-only-label': 'Members only',
  },
  'club-recaps': {
    mode: 'club',
    title: 'Highlights from recent sessions',
    'section-recaps': 'Highlights from recent sessions',
    'recap-cta': 'Post a recap',
  },
  'club-team': {
    mode: 'club',
    title: 'Meet the dedicated team',
    'section-team': 'Meet the dedicated team',
    'team-join-template': 'Join our community at {name}.',
  },
};

const CLUB_PRESET_KEYS = ['club-activities', 'club-events', 'club-recaps', 'club-team'];

const PRESET_ALIASES = {
  clubs: 'featured-clubs',
  club: 'featured-clubs',
  events: 'upcoming-events',
  upcoming: 'upcoming-events',
  event: 'upcoming-events',
};

function normalizePathname(path = '') {
  const raw = (path || '/').replace(/\.html$/, '') || '/';
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function resolvePresetAlias(preset) {
  const key = normalizePreset(preset);
  return PRESET_ALIASES[key] || key;
}

function normalizePreset(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, '-');
}

function normalizeKind(value = '') {
  const kind = String(value).trim().toLowerCase();
  if (kind === 'steps') return 'step';
  if (kind === 'stories') return 'story';
  return kind;
}

function hasStepConfigKeys(config = {}) {
  return Object.keys(config).some((key) => /^step-\d+-(title|body)$/.test(key));
}

function hasStoryConfigKeys(config = {}) {
  return Object.keys(config).some((key) => /^story-\d+-(image|title|body)$/.test(key));
}

/** Legacy index-marketing table with both steps + stories keys in one block. */
function isCombinedMarketingConfig(config, block) {
  const preset = normalizePreset(cfg(config, 'preset', ''));
  if (preset === 'steps' || preset === 'stories') return false;
  if (!hasStepConfigKeys(config) || !hasStoryConfigKeys(config)) return false;
  return block.classList.contains('index-marketing')
    || block.classList.contains('cards--combined-marketing')
    || (!preset && !cfg(config, 'kind', '') && !cfg(config, 'mode', ''));
}

function isClubCardsConfig(config, block, presetKey) {
  const preset = resolvePresetAlias(presetKey || cfg(config, 'preset', ''));
  if (CLUB_PRESET_KEYS.includes(preset)) return true;
  return CLUB_PRESET_KEYS.some((key) => block.classList.contains(`cards--${key}`));
}

function isStaticCardsConfig(config, block, presetKey) {
  const preset = normalizePreset(presetKey || cfg(config, 'preset', ''));
  if (preset === 'steps' || preset === 'stories') return true;
  if (cfg(config, 'mode', '') === 'static') return true;
  const kind = normalizeKind(cfg(config, 'kind', ''));
  if (kind === 'step' || kind === 'story') return true;
  const layout = normalizePreset(cfg(config, 'layout', ''));
  if (layout === 'steps' || layout === 'stories') return true;
  if (hasStepConfigKeys(config) || hasStoryConfigKeys(config)) return true;
  return block.classList.contains('cards--steps')
    || block.classList.contains('cards--stories')
    || block.classList.contains('cards--combined-marketing');
}

const EMPTY_COPY = {
  club: { featured: 'Clubs coming soon.', joined: "Browse what's available and join one that fits you" },
  event: { upcoming: 'Events coming soon.' },
};

function resolvePreset(config, block) {
  const explicit = resolvePresetAlias(cfg(config, 'preset', ''));
  if (explicit && PRESET_DEFAULTS[explicit]) return explicit;

  const kind = normalizeKind(cfg(config, 'kind', ''));
  const layout = normalizePreset(cfg(config, 'layout', ''));
  if (kind === 'story' || layout === 'stories') return 'stories';
  if (kind === 'step' || layout === 'steps') return 'steps';
  if (hasStoryConfigKeys(config)) return 'stories';
  if (hasStepConfigKeys(config)) return 'steps';

  if (block.classList.contains('cards--featured-clubs')) return 'featured-clubs';
  if (block.classList.contains('cards--upcoming-events')) return 'upcoming-events';
  if (block.classList.contains('cards--home-clubs')) return 'home-clubs';
  if (block.classList.contains('cards--home-events')) return 'home-events';
  if (block.classList.contains('cards--home-joined-clubs')) return 'home-joined-clubs';
  if (block.classList.contains('cards--steps')) return 'steps';
  if (block.classList.contains('cards--stories')) return 'stories';
  const clubPreset = CLUB_PRESET_KEYS.find((key) => block.classList.contains(`cards--${key}`));
  if (clubPreset) return clubPreset;
  if (block.classList.contains('showcase-teaser--clubs')) return 'featured-clubs';
  if (block.classList.contains('showcase-teaser--events')) return 'upcoming-events';
  return '';
}

function mergedConfig(config, presetKey) {
  const defaults = presetKey ? (PRESET_DEFAULTS[presetKey] || {}) : {};
  const kind = normalizeKind(cfg(config, 'kind', defaults.kind || 'club'));
  const layout = normalizePreset(cfg(config, 'layout', defaults.layout || 'showcase'));
  return {
    ...defaults,
    ...config,
    mode: cfg(config, 'mode', defaults.mode || 'dynamic'),
    kind,
    layout,
    action: cfg(config, 'action', defaults.action || 'navigate'),
    source: cfg(config, 'source', defaults.source || 'featured'),
    limit: parseInt(cfg(config, 'limit', String(defaults.limit || 6)), 10) || defaults.limit || 6,
    eyebrow: cfg(config, 'eyebrow', defaults.eyebrow || ''),
    title: cfg(config, 'title', defaults.title || ''),
    'link-text': cfg(config, 'link-text', defaults['link-text'] || ''),
    'link-href': cfg(config, 'link-href', defaults['link-href'] || '/'),
    inlineHead: defaults.inlineHead ?? false,
    'quiz-prompt-strong': cfg(config, 'quiz-prompt-strong', 'Get picks made for you.'),
    'quiz-prompt-text': cfg(config, 'quiz-prompt-text', "Tell us what you're into and we'll match clubs to your interests."),
    'quiz-cta-text': cfg(config, 'quiz-cta-text', 'Take the 1-minute quiz'),
    'recommended-title': cfg(config, 'recommended-title', 'Recommended for you'),
    'popular-title': cfg(config, 'popular-title', 'Popular clubs'),
    'empty-cta': cfg(config, 'empty-cta', 'Explore clubs'),
    'empty-href': cfg(config, 'empty-href', '/clubs'),
  };
}

function gridClassName(kind, layout) {
  if (layout === 'poster') {
    return kind === 'event' ? 'lp-events-grid cards-grid' : 'lp-clubs-grid cards-grid';
  }
  return 'cards-grid';
}

function buildCard(item, { kind, layout, action }) {
  if (kind === 'event') return buildEventCard(item, { layout, action });
  return buildClubCard(item, { layout, action });
}

function appendInlineHead(block, config, skipHead) {
  if (skipHead || !config.inlineHead) return;
  if (hasSiblingSectionHead(block)) return;
  const prefix = config.layout === 'showcase' ? 'showcase' : 'section-head';
  block.append(buildSectionHead({
    eyebrow: config.eyebrow,
    title: config.title,
    linkText: config['link-text'],
    linkHref: config['link-href'],
    classPrefix: prefix,
  }));
}

function staticHeadCopy(rawConfig, presetKey, defaults = {}) {
  const eyebrowKey = presetKey === 'stories' ? 'stories-eyebrow' : 'steps-eyebrow';
  const titleKey = presetKey === 'stories' ? 'stories-title' : 'steps-title';
  return {
    eyebrow: cfg(rawConfig, eyebrowKey, cfg(rawConfig, 'eyebrow', defaults.eyebrow || '')),
    title: cfg(rawConfig, titleKey, cfg(rawConfig, 'title', defaults.title || '')),
  };
}

function appendStaticSectionHead(block, rawConfig, presetKey) {
  if (hasSiblingSectionHead(block)) return;
  const defaults = PRESET_DEFAULTS[presetKey] || {};
  const { eyebrow, title } = staticHeadCopy(rawConfig, presetKey, defaults);
  if (!eyebrow && !title) return;
  block.prepend(buildSectionHead({ eyebrow, title, classPrefix: 'section-head' }));
}

function buildInterestPills(interests) {
  const pills = document.createElement('div');
  pills.className = 'cards-interest-pills';
  pills.setAttribute('aria-label', 'Your selected interests');
  interests.forEach((label) => {
    const pill = document.createElement('span');
    pill.className = 'cards-interest-pill';
    pill.textContent = label;
    pills.append(pill);
  });
  return pills;
}

function buildQuizPrompt(config) {
  const prompt = document.createElement('div');
  prompt.className = 'cards-prompt';
  prompt.innerHTML = `<p><strong>${config['quiz-prompt-strong']}</strong> ${config['quiz-prompt-text']}</p>`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-primary btn-sm';
  btn.textContent = config['quiz-cta-text'];
  btn.addEventListener('click', () => {
    window.AdobeInterestQuiz?.openInterestPicker?.();
  });
  prompt.append(btn);
  return prompt;
}

/**
 * Reconcile the quiz section to the current quiz state: render either the
 * interest pills (completed) or the quiz prompt (not completed) above the grid,
 * and swap the paired section-head title (Popular clubs ↔ Recommended for you).
 * Safe to call repeatedly — always rebuilds from the live quiz state.
 */
function syncQuizSection(block, section, config) {
  const { completed, interests } = getQuizState();

  // Prompt / pills always sit above the grid, never after it.
  section.querySelector('.cards-prompt')?.remove();
  section.querySelector('.cards-interest-pills')?.remove();
  const grid = section.querySelector('.cards-grid');
  let extra = null;
  if (completed) {
    if (interests.length) extra = buildInterestPills(interests);
  } else {
    extra = buildQuizPrompt(config);
  }
  if (extra) {
    if (grid) section.insertBefore(extra, grid);
    else section.append(extra);
  }

  // Swap the heading to match quiz state.
  const heading = findPairedSectionHead(block)?.querySelector('.section-head-heading');
  if (heading) {
    heading.textContent = completed ? config['recommended-title'] : config['popular-title'];
  }
}

function appendEmptyState(container, config, message) {
  const empty = document.createElement('div');
  empty.className = 'cards-empty-state';
  if (config.source === 'joined') {
    mountStaticCta(empty, {
      ...parseStaticCtaConfig({ ...STATIC_CTA_DEFAULTS, ...config }),
      title: cfg(config, 'empty-title', "You haven't joined any clubs yet"),
      subtitle: message,
      primaryText: cfg(config, 'empty-cta', 'Explore clubs'),
      primaryHref: cfg(config, 'empty-href', '/clubs'),
      secondaryText: '',
    }, { variant: 'embedded' });
  } else {
    empty.innerHTML = `<p>${message}</p>`;
  }
  container.append(empty);
}

async function decorateCombinedMarketing(block, rawConfig) {
  ensureSectionHeadBeforeCards(block);

  const rows = [...block.children];
  block.textContent = '';
  block.classList.add(
    'cards',
    'cards--combined-marketing',
    'cards--step',
    'cards--steps',
    'cards--story',
    'cards--stories',
  );

  const stepsGroup = document.createElement('div');
  stepsGroup.className = 'cards-static-group cards-static-group--steps';
  if (!hasSiblingSectionHead(block)) {
    const { eyebrow, title } = staticHeadCopy(rawConfig, 'steps', PRESET_DEFAULTS.steps);
    stepsGroup.append(buildSectionHead({ eyebrow, title, classPrefix: 'section-head' }));
  }
  stepsGroup.append(mountStepsGrid(rows, rawConfig));
  block.append(stepsGroup);

  const storiesGroup = document.createElement('div');
  storiesGroup.className = 'cards-static-group cards-static-group--stories';
  const { eyebrow, title } = staticHeadCopy(rawConfig, 'stories', PRESET_DEFAULTS.stories);
  storiesGroup.append(buildSectionHead({ eyebrow, title, classPrefix: 'section-head' }));
  storiesGroup.append(mountStoriesGrid(rows, rawConfig));
  block.append(storiesGroup);
}

async function decorateStatic(block, rawConfig, presetKey) {
  const config = mergedConfig(rawConfig, presetKey);
  const presetClass = presetKey || (normalizeKind(config.kind) === 'story' ? 'stories' : 'steps');

  ensureSectionHeadBeforeCards(block);

  const rows = [...block.children];
  block.textContent = '';
  block.classList.add('cards', `cards--${config.kind}`, `cards--${config.layout}`, `cards--${presetClass}`);
  appendStaticSectionHead(block, rawConfig, presetClass);

  if (presetClass === 'stories' || normalizeKind(config.kind) === 'story') {
    block.append(mountStoriesGrid(rows, rawConfig));
    return;
  }

  block.append(mountStepsGrid(rows, rawConfig));
}

async function decorateClubCards(block, rawConfig, presetKey) {
  const config = mergedConfig(rawConfig, presetKey);
  ensureSectionHeadBeforeCards(block);

  block.textContent = '';
  block.classList.add('cards', `cards--${presetKey}`);

  let ctx;
  try {
    ctx = await initClubPage();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[cards]', err);
    return;
  }
  if (ctx.error) return;

  ctx.pageConfig = { ...PRESET_DEFAULTS[presetKey], ...rawConfig, ...config };

  const mounts = {
    'club-activities': mountClubActivities,
    'club-events': mountClubEvents,
    'club-recaps': async (el, context) => {
      await ensureRecapDeps();
      mountClubRecaps(el, context);
    },
    'club-team': mountClubTeam,
  };

  const mount = mounts[presetKey];
  if (!mount) {
    // eslint-disable-next-line no-console
    console.warn('[cards] unknown club preset', presetKey);
    return;
  }
  await mount(block, ctx);
}

async function decorateDynamic(block, rawConfig, presetKey) {
  const config = mergedConfig(rawConfig, presetKey);
  block.textContent = '';
  block.classList.add('cards', `cards--${config.kind}`, `cards--${config.layout}`);
  if (presetKey) block.classList.add(`cards--${presetKey}`);

  appendInlineHead(block, config, hasSiblingSectionHead(block));

  const section = document.createElement('div');
  section.className = 'cards-section';
  block.append(section);

  const grid = document.createElement('div');
  grid.className = gridClassName(config.kind, config.layout);
  section.append(grid);

  const limit = config.limit;
  for (let i = 0; i < limit; i += 1) {
    grid.append(buildSkeletonCard(config.kind, config.layout));
  }

  const isPoster = config.layout === 'poster';
  const dataPromise = fetchAppData();
  const runtimePromise = isPoster ? ensureHomeCardRuntime() : Promise.resolve();
  let data = null;
  try {
    [data] = await Promise.all([dataPromise, runtimePromise]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[cards] dynamic decorate', err);
    data = await dataPromise.catch(() => null);
  }

  if (isPoster) {
    window.__adobeClubClubs = data?.clubs || [];
    window.__adobeClubEvents = data?.events || [];
  }

  grid.textContent = '';
  const items = resolveCardItems(data, config);
  const isQuizPoster = config.source === 'quiz' && config.layout === 'poster';

  if (config.source === 'joined' && !items.length) {
    appendEmptyState(section, config, EMPTY_COPY.club.joined);
    if (!getJoinedClubIds().length) {
      block.classList.add('cards--joined-empty');
    }
    return;
  }

  if (!items.length) {
    const msg = document.createElement('p');
    msg.className = 'cards-empty';
    msg.textContent = EMPTY_COPY[config.kind]?.[config.source] || 'Nothing to show yet.';
    grid.append(msg);
  } else {
    items.forEach((item) => grid.append(buildCard(item, config)));

    if (config.action === 'join' || config.action === 'rsvp') {
      wireCardActions(grid, {
        join: cfg(rawConfig, 'join-label', 'Join'),
        joined: cfg(rawConfig, 'joined-label', 'Joined'),
      });
    }
  }

  if (isQuizPoster) {
    // Render prompt/pills + heading from the real quiz state, now that
    // user-features has loaded (it is not available before the await above).
    syncQuizSection(block, section, config);

    if (!block.dataset.quizRefreshBound) {
      block.dataset.quizRefreshBound = '1';
      const refresh = () => {
        const fresh = resolveCardItems(
          { clubs: window.__adobeClubClubs, events: window.__adobeClubEvents },
          config,
        );
        grid.textContent = '';
        fresh.forEach((item) => grid.append(buildCard(item, config)));
        wireCardActions(grid);
        syncQuizSection(block, section, config);
      };
      window.addEventListener('adobe-cards-data-changed', refresh);
      window.addEventListener('adobe-interests-updated', refresh);
      window.addEventListener('adobe-quiz-closed', refresh);
    }
  }
}

export default async function decorate(block) {
  const rawConfig = readPageConfig(block, {});

  if (isCombinedMarketingConfig(rawConfig, block)) {
    await decorateCombinedMarketing(block, rawConfig);
    return;
  }

  const presetKey = resolvePreset(rawConfig, block);
  const config = mergedConfig(rawConfig, presetKey);

  if (isClubCardsConfig(config, block, presetKey)) {
    const clubPreset = CLUB_PRESET_KEYS.includes(presetKey)
      ? presetKey
      : CLUB_PRESET_KEYS.find((key) => block.classList.contains(`cards--${key}`));
    if (clubPreset && normalizePathname(window.location.pathname) === '/club') {
      await decorateClubCards(block, rawConfig, clubPreset);
      return;
    }
  }

  if (isStaticCardsConfig(config, block, presetKey)) {
    await decorateStatic(block, rawConfig, presetKey);
    return;
  }

  await decorateDynamic(block, rawConfig, presetKey);
}
