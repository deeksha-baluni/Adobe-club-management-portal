import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  loadScript,
  buildBlock,
} from './aem.js';
import { preloadLcpImage, publishedImageSrc } from './lib/image-priority.js';
import { resolveEventIdUrl } from './lib/event-images.js';
import './lib/club-images.js';
import './lib/event-images.js';

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  if (window.__adobeClubsFontsLoaded) return;
  window.__adobeClubsFontsLoaded = true;
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Published pages may still emit clubs-hero / events-hero / resources-hero until
 * re-published in da.live. Remap to landing-hero so one block implementation loads.
 * @param {Element} main
 */
function migrateLegacyHeroBlocks(main) {
  main.querySelectorAll('.clubs-hero, .events-hero, .resources-hero').forEach((block) => {
    block.classList.remove('clubs-hero', 'events-hero', 'resources-hero');
    block.classList.add('landing-hero');
  });
}

/**
 * Legacy page-hero / club-hero / event-hero → detail-hero until re-published in da.live.
 * @param {Element} main
 */
function migrateDetailHeroBlocks(main) {
  const path = normalizePath(window.location.pathname);
  main.querySelectorAll('.page-hero, .club-hero, .event-hero').forEach((block) => {
    const isEvent = path === '/event'
      || block.classList.contains('page-hero--event')
      || block.classList.contains('event-hero');
    block.classList.remove('page-hero', 'page-hero--club', 'page-hero--event', 'club-hero', 'event-hero');
    block.classList.add('detail-hero', isEvent ? 'detail-hero--event' : 'detail-hero--club');
  });
}

/**
 * Legacy home-hero block → default-content greeting until re-published in da.live.
 * @param {Element} main
 */
function migrateHomeHero(main) {
  main.querySelectorAll('.home-hero').forEach((block) => {
    const blockWrapper = block.parentElement;
    if (!blockWrapper) return;

    const heading = document.createElement('h1');
    heading.id = 'home-greeting';
    heading.className = 'hm-title';
    heading.dataset.userGreeting = 'true';
    heading.dataset.greetingTemplate = 'Welcome back, {name}';
    heading.textContent = 'Welcome back, {name}';

    const content = document.createElement('div');
    content.className = 'default-content-wrapper';
    content.append(heading);
    blockWrapper.replaceWith(content);
  });
}

/**
 * Tag da.live default-content greeting on /home when authors omit ids.
 * Handles `# Welcome back, {name}` in default content (p or h1).
 * @param {Element} main
 */
function normalizeGreetingText(text) {
  return String(text || '').replace(/^#\s*/, '').trim();
}

function prepareHomeGreeting(main) {
  if (normalizePath(window.location.pathname) !== '/home') return;

  const existing = main.querySelector('#home-greeting, #hm-greeting, #adm-greeting, [data-user-greeting]');
  if (existing) {
    if (!existing.dataset.greetingTemplate && /\{name\}/i.test(existing.textContent)) {
      existing.dataset.greetingTemplate = normalizeGreetingText(existing.textContent);
    }
    return;
  }

  const section = main.querySelector(':scope > .section:has(.default-content-wrapper)');
  if (!section) return;

  let heading = section.querySelector('h1');
  if (!heading) {
    const candidate = section.querySelector('.default-content-wrapper p, .default-content-wrapper h2, p');
    const text = candidate?.textContent || '';
    if (/\{name\}/i.test(text)) {
      heading = document.createElement('h1');
      heading.className = 'hm-title';
      heading.textContent = normalizeGreetingText(text);
      const wrapper = candidate.closest('.default-content-wrapper') || candidate.parentElement;
      if (wrapper) wrapper.replaceChildren(heading);
    }
  }

  if (!heading || !/\{name\}/i.test(heading.textContent)) return;

  const template = normalizeGreetingText(heading.textContent);
  heading.dataset.greetingTemplate = template;
  heading.id = 'home-greeting';
  heading.dataset.userGreeting = 'true';
  heading.textContent = template;
  if (!heading.classList.contains('hm-title')) heading.classList.add('hm-title');
}

/**
 * Published pages may still emit events-list / clubs-list until re-published in da.live.
 * @param {Element} main
 */
function migrateLegacyListBlocks(main) {
  main.querySelectorAll('.events-list, .clubs-list').forEach((block) => {
    const preset = block.classList.contains('clubs-list') ? 'clubs' : 'events';
    block.classList.remove('events-list', 'clubs-list');
    block.classList.add('catalog-list', `catalog-list--${preset}`);
  });
}

const CLUB_SECTION_PRESETS = ['club-activities', 'club-events', 'club-recaps', 'club-team'];

function isClubSectionPreset(value = '') {
  const val = String(value).trim().toLowerCase().replace(/\s+/g, '-');
  return CLUB_SECTION_PRESETS.some((preset) => val.startsWith(preset));
}

/**
 * True when a `.cards` block is the new dynamic card grid (not legacy story cards).
 * @param {Element} block
 */
function isDynamicCardsBlock(block) {
  if (CLUB_SECTION_PRESETS.some((preset) => block.classList.contains(`cards--${preset}`))) {
    return false;
  }
  for (const row of block.children) {
    const cols = row.children;
    if (cols.length < 2) continue;
    const key = cols[0].textContent.trim().toLowerCase();
    if (key === 'mode') {
      if (cols[1].textContent.trim().toLowerCase() === 'club') return false;
      return true;
    }
    if (['kind', 'layout', 'action', 'source', 'limit'].includes(key)) return true;
    if (/^step-\d+-(title|body)$/.test(key) || /^story-\d+-(image|title|body)$/.test(key)) return true;
    if (key === 'preset') {
      const val = cols[1].textContent.trim().toLowerCase().replace(/\s+/g, '-');
      if (isClubSectionPreset(val)) return false;
      if (val.startsWith('featured') || val.startsWith('upcoming') || val.startsWith('home')) return true;
      if (val === 'steps' || val === 'stories') return true;
    }
  }
  return block.classList.contains('cards--featured-clubs')
    || block.classList.contains('cards--upcoming-events')
    || block.classList.contains('cards--home-clubs')
    || block.classList.contains('cards--home-events')
    || block.classList.contains('cards--home-joined-clubs')
    || block.classList.contains('cards--steps')
    || block.classList.contains('cards--stories')
    || block.classList.contains('cards--combined-marketing')
    || block.classList.contains('index-marketing');
}

function migrateBlockToCards(block, preset) {
  block.className = `cards cards--${preset}`;
}

/**
 * Published pages may still emit featured-clubs / upcoming-events / showcase-teaser until re-published.
 * @param {Element} main
 */
function migrateLegacyShowcaseBlocks(main) {
  main.querySelectorAll('.featured-clubs').forEach((block) => {
    migrateBlockToCards(block, 'featured-clubs');
  });
  main.querySelectorAll('.upcoming-events').forEach((block) => {
    migrateBlockToCards(block, 'upcoming-events');
  });
  main.querySelectorAll('.showcase-teaser').forEach((block) => {
    const preset = block.classList.contains('showcase-teaser--events')
      || readRawBlockPreset(block) === 'events'
      ? 'upcoming-events'
      : 'featured-clubs';
    migrateBlockToCards(block, preset);
  });
}

/**
 * Legacy index-close → accordion; extract embedded CTA to cta-banner.
 * @param {Element} main
 */
function migrateLegacyAccordionBlocks(main) {
  main.querySelectorAll('.index-close').forEach((block) => {
    block.classList.remove('index-close');
    block.classList.add('accordion');
  });
}

function parseLegacyDarkSectionCta(section) {
  const title = section.querySelector('h2')?.textContent?.trim();
  const subtitle = section.querySelector('h2 + p')?.textContent?.trim()
    || section.querySelector('p:not(:has(a))')?.textContent?.trim();
  const links = [...section.querySelectorAll('a[href]')];
  if (!title && !links.length) return null;

  return {
    'cta-title': title || 'Find your community at Adobe.',
    'cta-subtitle': subtitle || 'Sign in with your Adobe account and join your first club today.',
    'cta-primary-text': links[0]?.textContent?.trim() || 'Create your account',
    'cta-primary-href': links[0]?.getAttribute('href') || '/login#signup',
    'cta-secondary-text': links[1]?.textContent?.trim() || 'Sign in',
    'cta-secondary-href': links[1]?.getAttribute('href') || '/login',
  };
}

function createCtaBannerSection(config = {}) {
  const section = document.createElement('div');
  section.classList.add('section', 'dark');
  section.dataset.sectionStatus = 'initialized';
  const wrapper = document.createElement('div');
  wrapper.append(createLegacyConfigBlock('cta-banner', config));
  section.append(wrapper);
  return section;
}

/** Pull legacy index-close CTA (config rows or following .section.dark) into cta-banner. */
function splitLegacyIndexCloseCta(main) {
  if (normalizePath(window.location.pathname) !== '/') return;
  if (main.querySelector('.cta-banner')) return;

  main.querySelectorAll('.accordion, .index-close').forEach((block) => {
    const config = readLegacyBlockConfig(block);
    const hasCtaConfig = Boolean(
      config['cta-title']
      || config['cta-primary-text']
      || config.section === 'cta',
    );

    const section = block.closest('.section');
    const next = section?.nextElementSibling;
    const darkCta = next?.classList.contains('dark') ? parseLegacyDarkSectionCta(next) : null;

    if (!hasCtaConfig && !darkCta) return;

    const ctaConfig = darkCta || {
      'cta-title': config['cta-title'] || 'Find your community at Adobe.',
      'cta-subtitle': config['cta-subtitle'] || 'Sign in with your Adobe account and join your first club today.',
      'cta-primary-text': config['cta-primary-text'] || 'Create your account',
      'cta-primary-href': config['cta-primary-href'] || '/login#signup',
      'cta-secondary-text': config['cta-secondary-text'] || 'Sign in',
      'cta-secondary-href': config['cta-secondary-href'] || '/login',
    };

    const ctaSection = createCtaBannerSection(ctaConfig);
    if (darkCta && next) {
      next.replaceWith(ctaSection);
    } else if (section) {
      section.after(ctaSection);
    }
  });
}

function marketingBlockHasStoryKeys(block) {
  for (const row of block.children) {
    const key = row.children[0]?.textContent?.trim().toLowerCase() || '';
    if (key.startsWith('story-') || key === 'stories-eyebrow' || key === 'stories-title') return true;
  }
  return false;
}

function marketingBlockHasStepKeys(block) {
  for (const row of block.children) {
    const key = row.children[0]?.textContent?.trim().toLowerCase() || '';
    if (/^step-\d+-(title|body)$/.test(key) || key === 'steps-eyebrow' || key === 'steps-title') {
      return true;
    }
  }
  return false;
}

/**
 * Legacy steps / story / index-marketing blocks → cards static presets.
 * @param {Element} main
 */
function migrateLegacyMarketingBlocks(main) {
  main.querySelectorAll('.steps, .index-marketing--steps-only').forEach((block) => {
    block.className = 'cards cards--steps';
  });
  main.querySelectorAll('.index-marketing--stories-only').forEach((block) => {
    block.className = 'cards cards--stories';
  });
  main.querySelectorAll('.index-marketing').forEach((block) => {
    if (block.classList.contains('cards')) return;
    const hasSteps = marketingBlockHasStepKeys(block);
    const hasStories = marketingBlockHasStoryKeys(block);
    if (hasSteps && hasStories) {
      block.className = 'cards cards--combined-marketing';
      return;
    }
    block.className = block.querySelector('picture, img')
      ? 'cards cards--stories'
      : 'cards cards--steps';
  });
  main.querySelectorAll('.cards').forEach((block) => {
    if (isDynamicCardsBlock(block)) return;
    if (block.classList.contains('cards--steps') || block.classList.contains('cards--stories')) return;
    block.className = block.querySelector('picture, img')
      ? 'cards cards--stories'
      : 'cards cards--steps';
  });
}

function readLegacyBlockConfig(block) {
  const config = {};
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cols = row.children;
    if (cols.length < 2) return;
    const key = cols[0].textContent.trim().toLowerCase();
    config[key] = cols[1].textContent.trim();
  });
  return config;
}

function createLegacyConfigRow(key, value) {
  const row = document.createElement('div');
  const keyCell = document.createElement('div');
  keyCell.textContent = key;
  const valCell = document.createElement('div');
  valCell.textContent = value;
  row.append(keyCell, valCell);
  return row;
}

function createLegacyConfigBlock(className, entries) {
  const block = document.createElement('div');
  block.className = className;
  Object.entries(entries).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') {
      block.append(createLegacyConfigRow(key, value));
    }
  });
  return block;
}

function createMemberHomeSection(blocks) {
  const section = document.createElement('div');
  section.classList.add('section');
  section.dataset.sectionStatus = 'initialized';
  blocks.forEach((block) => {
    const wrapper = document.createElement('div');
    wrapper.append(block);
    section.append(wrapper);
  });
  return section;
}

function createClubPageSection(blocks, { dark = false } = {}) {
  const section = document.createElement('div');
  section.classList.add('section');
  if (dark) section.classList.add('dark');
  section.dataset.sectionStatus = 'initialized';
  blocks.forEach((block) => {
    const wrapper = document.createElement('div');
    wrapper.append(block);
    section.append(wrapper);
  });
  return section;
}

function pickLegacyConfig(config, keys) {
  const entries = {};
  keys.forEach((key) => {
    if (config[key]) entries[key] = config[key];
  });
  return entries;
}

/**
 * Split legacy club-list monolith into section-head + cards + cta-banner blocks.
 * @param {Element} main
 */
function splitLegacyClubList(main) {
  if (normalizePath(window.location.pathname) !== '/club') return;
  if (main.querySelector('.cards--club-activities')) return;

  const activityKeys = ['section-activities'];
  const eventKeys = [
    'section-events', 'detail-event-base', 'events-empty', 'events-day-empty',
    'filter-all-dates', 'filter-today', 'filter-tomorrow', 'filter-this-week',
    'rsvp-label', 'rsvpd-label', 'members-only-label',
  ];
  const recapKeys = ['section-recaps', 'recap-cta'];
  const teamKeys = ['section-team', 'team-join-template', 'join-label', 'joined-label'];
  const ctaKeys = [
    'cta-title-template', 'cta-perk-1', 'cta-perk-2', 'cta-perk-3', 'cta-perk-4',
    'join-label', 'joined-label',
  ];

  main.querySelectorAll('.club-list').forEach((block) => {
    const config = readLegacyBlockConfig(block);
    const section = block.closest('.section');
    if (!section) return;

    const pick = (key, fallback = '') => config[key] || fallback;

    const sections = [
      createClubPageSection([
        createLegacyConfigBlock('section-head', { title: pick('section-activities', 'What this club does') }),
        createLegacyConfigBlock('cards cards--club-activities', {
          preset: 'club-activities',
          ...pickLegacyConfig(config, activityKeys),
        }),
      ]),
      createClubPageSection([
        createLegacyConfigBlock('section-head', { title: pick('section-events', 'Find your next {tag} event') }),
        createLegacyConfigBlock('cards cards--club-events', {
          preset: 'club-events',
          ...pickLegacyConfig(config, eventKeys),
        }),
      ]),
      createClubPageSection([
        createLegacyConfigBlock('section-head', { title: pick('section-recaps', 'Highlights from recent sessions') }),
        createLegacyConfigBlock('cards cards--club-recaps', {
          preset: 'club-recaps',
          ...pickLegacyConfig(config, recapKeys),
        }),
      ]),
      createClubPageSection([
        createLegacyConfigBlock('section-head', { title: pick('section-team', 'Meet the dedicated team') }),
        createLegacyConfigBlock('cards cards--club-team', {
          preset: 'club-team',
          ...pickLegacyConfig(config, teamKeys),
        }),
      ]),
      createClubPageSection([
        createLegacyConfigBlock('cta-banner cta-banner--join', {
          preset: 'join',
          ...pickLegacyConfig(config, ctaKeys),
        }),
      ]),
    ];

    section.replaceWith(...sections);
  });
}

/** Published /home may still use one home-dashboard table with all member config keys. */
function isLegacyMemberHomeDashboard(block) {
  if (!block?.classList?.contains('home-dashboard')) return false;
  if (normalizePath(window.location.pathname) !== '/home') {
    for (const row of block.children) {
      const key = row.children[0]?.textContent?.trim().toLowerCase() || '';
      if (key.startsWith('section-recommended') || key === 'section-calendar-label') return true;
    }
    return false;
  }
  for (const row of block.children) {
    const key = row.children[0]?.textContent?.trim().toLowerCase() || '';
    if (!key) continue;
    if (key.startsWith('section-') || key.startsWith('quiz-') || key.startsWith('clubs-empty')
      || key.startsWith('cal-') || key === 'join-label' || key === 'joined-label') {
      return true;
    }
  }
  return false;
}

function removeEmptyHomeDashboardShell(main) {
  if (normalizePath(window.location.pathname) !== '/home') return;
  main.querySelectorAll('.home-dashboard').forEach((block) => {
    if (isLegacyMemberHomeDashboard(block)) return;
    const hasConfig = [...block.children].some((row) => {
      const cols = row.children;
      return cols.length >= 2 && cols[0].textContent?.trim() && cols[1].textContent?.trim();
    });
    if (!hasConfig) block.closest('.section')?.remove();
  });
}

/**
 * Split legacy member home-dashboard into section-head + cards + home-calendar blocks.
 * @param {Element} main
 */
function splitLegacyMemberHomeDashboard(main) {
  if (normalizePath(window.location.pathname) !== '/home') return;
  if (main.querySelector('.cards--home-clubs') && main.querySelector('.home-calendar')) return;

  main.querySelectorAll('.home-dashboard').forEach((block) => {
    if (!isLegacyMemberHomeDashboard(block)) return;

    const config = readLegacyBlockConfig(block);
    const section = block.closest('.section');
    if (!section) return;

    const pick = (...keys) => {
      for (const key of keys) {
        if (config[key]) return config[key];
      }
      return '';
    };

    const joinLabel = pick('join-label');
    const joinedLabel = pick('joined-label');
    const cardLabels = {};
    if (joinLabel) cardLabels['join-label'] = joinLabel;
    if (joinedLabel) cardLabels['joined-label'] = joinedLabel;

    const sections = [
      createMemberHomeSection([
        createLegacyConfigBlock('section-head', {
          eyebrow: pick('section-recommended-label'),
          title: pick('section-recommended-title', 'section-popular-title'),
          'link-text': pick('section-recommended-link'),
          'link-href': pick('section-recommended-href'),
        }),
        createLegacyConfigBlock('cards cards--home-clubs', {
          preset: 'home-clubs',
          'quiz-prompt-strong': pick('quiz-prompt-strong'),
          'quiz-prompt-text': pick('quiz-prompt-text'),
          'quiz-cta-text': pick('quiz-cta-text'),
          ...cardLabels,
        }),
      ]),
      createMemberHomeSection([
        createLegacyConfigBlock('home-calendar', {
          'section-calendar-label': pick('section-calendar-label'),
          'section-calendar-link': pick('section-calendar-link'),
          'section-calendar-href': pick('section-calendar-href'),
          'cal-rsvps-title': pick('cal-rsvps-title'),
          'cal-empty-text': pick('cal-empty-text'),
          'cal-empty-link': pick('cal-empty-link'),
          'cal-empty-href': pick('cal-empty-href'),
          'cal-more-template': pick('cal-more-template'),
        }),
      ]),
      createMemberHomeSection([
        createLegacyConfigBlock('section-head', {
          title: pick('section-events-title'),
          'link-text': pick('section-events-link'),
          'link-href': pick('section-events-href'),
        }),
        createLegacyConfigBlock('cards cards--home-events', {
          preset: 'home-events',
          ...cardLabels,
        }),
      ]),
      createMemberHomeSection([
        createLegacyConfigBlock('section-head', {
          eyebrow: pick('section-clubs-label'),
          title: pick('section-clubs-title'),
          'link-text': pick('section-clubs-link'),
          'link-href': pick('section-clubs-href'),
        }),
        createLegacyConfigBlock('cards cards--home-joined-clubs', {
          preset: 'home-joined-clubs',
          'empty-cta': pick('clubs-empty-cta'),
          'empty-href': pick('clubs-empty-href'),
          ...cardLabels,
        }),
      ]),
    ];

    section.replaceWith(...sections);
  });
}

/**
 * Legacy home-dashboard → admin-dashboard only when not a member monolith.
 * Member monolith splits into cards + home-calendar (see splitLegacyMemberHomeDashboard).
 * @param {Element} main
 */
function migrateLegacyHomeDashboard(main) {
  splitLegacyMemberHomeDashboard(main);
  if (normalizePath(window.location.pathname) === '/home') return;
  main.querySelectorAll('.home-dashboard').forEach((block) => {
    if (isLegacyMemberHomeDashboard(block)) return;
    block.className = 'admin-dashboard';
  });
}

/**
 * Read preset | value from raw da.live table rows (before block JS runs).
 * @param {Element} block
 * @returns {'clubs'|'events'|''}
 */
function readRawBlockPreset(block) {
  if (!block) return '';
  for (const row of block.children) {
    const cols = row.children;
    if (cols.length < 2) continue;
    const key = cols[0].textContent.trim().toLowerCase();
    if (key !== 'preset') continue;
    const val = cols[1].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    if (isClubSectionPreset(val)) return '';
    if (val.startsWith('upcoming')) return 'events';
    if (val.startsWith('event')) return 'events';
    if (val === 'clubs' || val === 'club') return 'clubs';
    if (val.startsWith('club')) return 'clubs';
  }
  return '';
}

function isEventsCardsBlock(block) {
  if (!block) return false;
  if (block.classList.contains('upcoming-events')
    || block.classList.contains('cards--upcoming-events')
    || block.classList.contains('showcase-teaser--events')) {
    return true;
  }
  const preset = readRawBlockPreset(block);
  if (preset === 'events') return true;
  for (const row of block.children) {
    const cols = row.children;
    if (cols.length < 2) continue;
    if (cols[0].textContent.trim().toLowerCase() !== 'preset') continue;
    const val = cols[1].textContent.trim().toLowerCase();
    if (val.startsWith('upcoming') || val.startsWith('event')) return true;
  }
  return false;
}

/**
 * Tag cards blocks with preset modifiers before injection checks run.
 * @param {Element} main
 */
function tagCardsPresets(main) {
  main.querySelectorAll('.cards').forEach((block) => {
    if (block.classList.contains('cards--featured-clubs')
      || block.classList.contains('cards--upcoming-events')
      || CLUB_SECTION_PRESETS.some((preset) => block.classList.contains(`cards--${preset}`))) {
      return;
    }
    const preset = readRawBlockPreset(block);
    if (preset === 'clubs') block.classList.add('cards--featured-clubs');
    if (preset === 'events' || preset === 'upcoming') block.classList.add('cards--upcoming-events');
  });

  const untagged = [...main.querySelectorAll('.cards')].filter(
    (block) => isDynamicCardsBlock(block)
      && !block.classList.contains('cards--featured-clubs')
      && !block.classList.contains('cards--upcoming-events')
      && (readRawBlockPreset(block) === 'clubs' || readRawBlockPreset(block) === 'events'),
  );

  if (untagged.length >= 2) {
    untagged[0].classList.add('cards--featured-clubs');
    untagged[1].classList.add('cards--upcoming-events');
  } else if (untagged.length === 1) {
    const preset = readRawBlockPreset(untagged[0]);
    untagged[0].classList.add(preset === 'events' ? 'cards--upcoming-events' : 'cards--featured-clubs');
  }
}

function hasGuestFeaturedClubsSection(main) {
  if (main.querySelector('.featured-clubs, .cards--featured-clubs, .showcase-teaser--clubs')) return true;

  const showcases = [...main.querySelectorAll('.cards, .showcase-teaser, .featured-clubs')];
  if (showcases.some((block) => readRawBlockPreset(block) === 'clubs')) return true;
  if (showcases.filter((block) => isDynamicCardsBlock(block) || block.classList.contains('showcase-teaser')).length >= 2) {
    return true;
  }
  return false;
}

function findGuestEventsSection(main) {
  const tagged = main.querySelector('.upcoming-events, .cards--upcoming-events, .showcase-teaser--events');
  if (tagged) return tagged.closest('.section');

  for (const block of main.querySelectorAll('.cards, .showcase-teaser')) {
    if (isEventsCardsBlock(block)) return block.closest('.section');
  }

  return null;
}

/**
 * Guest index is missing Featured Clubs in da.live — inject cards (featured-clubs)
 * after the hero and before Upcoming Events when absent.
 * @param {Element} main
 */
function ensureGuestFeaturedClubs(main) {
  if (normalizePath(window.location.pathname) !== '/') return;
  if (hasGuestFeaturedClubsSection(main)) return;

  const heroSection = main.querySelector('.landing-hero')?.closest('.section');
  const eventsSection = findGuestEventsSection(main);
  if (!heroSection && !eventsSection) return;

  const section = document.createElement('div');
  section.classList.add('section');
  section.dataset.sectionStatus = 'initialized';

  const wrapper = document.createElement('div');
  const block = document.createElement('div');
  block.className = 'cards cards--featured-clubs';
  wrapper.append(block);
  section.append(wrapper);

  if (eventsSection) {
    eventsSection.before(section);
  } else {
    heroSection.after(section);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  migrateLegacyHeroBlocks(main);
  migrateDetailHeroBlocks(main);
  migrateHomeHero(main);
  prepareHomeGreeting(main);
  migrateLegacyListBlocks(main);
  migrateLegacyShowcaseBlocks(main);
  tagCardsPresets(main);
  migrateLegacyAccordionBlocks(main);
  splitLegacyIndexCloseCta(main);
  migrateLegacyMarketingBlocks(main);
  migrateLegacyHomeDashboard(main);
  splitLegacyClubList(main);
  removeEmptyHomeDashboardShell(main);
  ensureGuestFeaturedClubs(main);
  prepareGuestIndexHero(main);
  prepareEventDetailEarly();
  hideMemberHomeForAdmin(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();

  const main = doc.querySelector('main');
  const onGuestIndex = main
    && normalizePath(window.location.pathname) === '/'
    && main.querySelector('.landing-hero');
  const onEventDetail = normalizePath(window.location.pathname) === '/event';

  if (onGuestIndex && isSessionAuthenticated()) {
    window.location.replace('/home');
    return;
  }

  if (!onGuestIndex && !onEventDetail) {
    await loadScript(`${window.hlx?.codeBasePath || ''}/scripts/auth-guard.js`);
    if (handleAuthRouting(doc)) return;
  } else {
    loadScript(`${window.hlx?.codeBasePath || ''}/scripts/auth-guard.js`);
  }

  if (main) {
    decorateMain(main);

    if (isHomePath() && isSessionAuthenticated()) {
      if (isSessionAnyAdmin()) {
        applyAdminHomeBodyClass();
      } else {
        document.body.classList.add('user-home');
      }
    }

    const authPage = isAuthPage(doc);
    const guestIndex = isGuestIndexPage(main);
    const eventDetail = isEventDetailPage(main);
    const homeGreetingPromise = (isHomePath() && isSessionAuthenticated())
      ? import('./lib/user-greeting.js').then(({ hydrateHomeGreeting }) => hydrateHomeGreeting())
      : Promise.resolve();

    if (!guestIndex && !eventDetail) {
      prefetchRouteAssets(main);
    }

    if (!authPage && !guestIndex && !eventDetail) {
      const header = doc.querySelector('header');
      if (header && !isHeaderReady(header)) {
        await loadHeader(header);
      }
    }

    if (guestIndex) {
      loadFonts();
      const header = doc.querySelector('header');
      const headerPromise = !authPage && header && !isHeaderReady(header)
        ? loadHeader(header)
        : Promise.resolve();
      prefetchRouteAssets(main);
      await Promise.all([
        headerPromise,
        loadGuestIndex(main),
      ]);
    } else if (eventDetail) {
      const header = doc.querySelector('header');
      const headerPromise = !authPage && header && !isHeaderReady(header)
        ? loadHeader(header)
        : Promise.resolve();
      prefetchRouteAssets(main);
      await Promise.all([
        headerPromise,
        loadEventDetailPage(main),
      ]);
    } else {
      await Promise.all([
        homeGreetingPromise,
        loadSection(main.querySelector('.section'), waitForFirstImage),
      ]);
    }

    document.body.classList.add('appear');
  }

  try {
    /* Guest index: fonts load in loadEager to limit hero CLS. Others: desktop or repeat visit. */
    if (!onGuestIndex
      && (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded'))) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

function isAuthPage(doc) {
  return Boolean(doc.querySelector('main .login-form'));
}

function normalizePath(path) {
  const normalized = (path || '/').replace(/\/$/, '') || '/';
  return normalized === '/index' ? '/' : normalized;
}

function getEventIdFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id') || params.get('event');
  if (idParam) return idParam;
  const match = window.location.pathname.match(/\/events\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function isEventDetailPage(main) {
  return normalizePath(window.location.pathname) === '/event'
    && Boolean(main?.querySelector('.detail-hero, .event-list'));
}

function prepareEventDetailEarly() {
  if (normalizePath(window.location.pathname) !== '/event') return;
  document.documentElement.classList.add('event-detail-route');
  document.body?.classList.add('event-detail-page');
  document.querySelector('main')?.classList.add('event-detail-page');
}

function prefetchEventHeroEarly() {
  const eventId = getEventIdFromLocation();
  if (!eventId) return;
  const heroSrc = resolveEventIdUrl(eventId);
  preloadLcpImage(heroSrc);
  prefetchAppData()?.then((data) => {
    const ev = data?.events?.find((e) => e.id === eventId);
    if (ev?.imagePath) {
      import('./event/event-page.js').then((mod) => {
        mod.prefetchEventHeroImage(ev);
      });
    }
  });
}

if (normalizePath(window.location.pathname) === '/event') {
  prepareEventDetailEarly();
  prefetchAppData();
  prefetchEventHeroEarly();
}

/** Fast localStorage check — avoids loading auth-guard before guest index LCP. */
function isSessionAuthenticated() {
  try {
    const session = JSON.parse(localStorage.getItem('adobeClubsAuth') || 'null');
    return Boolean(session?.isAuthenticated);
  } catch {
    return false;
  }
}

/** Fast localStorage admin check — used before auth-guard on /home. */
function isSessionAnyAdmin() {
  try {
    const session = JSON.parse(localStorage.getItem('adobeClubsAuth') || 'null');
    return Boolean(
      session?.isAuthenticated
      && (session.role === 'admin' || session.role === 'clubAdmin'),
    );
  } catch {
    return false;
  }
}

const MEMBER_HOME_SECTION_SELECTOR = '.cards, .home-calendar, .section-head, .cta-banner';

function applyAdminHomeBodyClass() {
  document.body.classList.add('admin-home', 'adm-active');
  document.body.classList.remove('user-home');
  document.documentElement.classList.add('admin-home-route');
}

function hideMemberHomeForAdmin(main) {
  if (normalizePath(window.location.pathname) !== '/home') return;
  if (!isSessionAnyAdmin()) return;

  applyAdminHomeBodyClass();
  main.querySelectorAll('.section').forEach((section) => {
    if (section.querySelector('.admin-dashboard')) return;
    if (section.querySelector(MEMBER_HOME_SECTION_SELECTOR)) {
      section.style.display = 'none';
      section.dataset.adminHidden = 'true';
    }
  });
}

function preloadGuestIndexHeroSrc(src) {
  const clean = publishedImageSrc(src);
  if (!clean) return;
  preloadLcpImage(clean);
}

/** Promote authored hero img before block JS replaces the table (guest index LCP). */
function prepareGuestIndexEarly() {
  if (normalizePath(window.location.pathname) !== '/') return;
  document.documentElement.classList.add('guest-index-route');
}

function prepareHomeRouteEarly() {
  if (normalizePath(window.location.pathname) !== '/home') return;
  document.documentElement.classList.add('user-home-route');
  if (!isSessionAuthenticated()) return;
  if (isSessionAnyAdmin()) {
    applyAdminHomeBodyClass();
  } else {
    document.body?.classList.add('user-home');
  }
}

function prepareGuestIndexHero(main) {
  prepareGuestIndexEarly();
  if (normalizePath(window.location.pathname) !== '/') return;
  const hero = main.querySelector('.landing-hero');
  if (!hero) return;
  const mediaCell = hero.firstElementChild?.firstElementChild;
  const img = mediaCell?.querySelector('picture img, img');
  if (!img?.src) return;
  img.loading = 'eager';
  img.decoding = 'async';
  if ('fetchPriority' in img) img.fetchPriority = 'high';
  preloadGuestIndexHeroSrc(img.src);
}

if (normalizePath(window.location.pathname) === '/') {
  prepareGuestIndexEarly();
  prefetchAppData();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      prepareGuestIndexHero(document.querySelector('main'));
    }, { once: true });
  } else {
    prepareGuestIndexHero(document.querySelector('main'));
  }
}

if (normalizePath(window.location.pathname) === '/home') {
  prepareHomeRouteEarly();
  prefetchAppData();
}

function prefetchAppData() {
  const base = window.hlx?.codeBasePath || '';
  if (window.__adobeClubsDataPrefetch) return window.__adobeClubsDataPrefetch;
  const url = `${base}/data/data.json`;
  if (!document.querySelector('link[data-app-data-preload]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = url;
    link.crossOrigin = 'anonymous';
    link.dataset.appDataPreload = '1';
    document.head.append(link);
  }
  window.__adobeClubsDataPrefetch = fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  return window.__adobeClubsDataPrefetch;
}

function prefetchRouteAssets(main, path) {
  const normalized = normalizePath(path || window.location.pathname);
  const needsData = normalized === '/'
    || normalized === '/home'
    || normalized === '/event'
    || normalized === '/events'
    || normalized === '/clubs'
    || normalized === '/resources'
    || normalized === '/club'
    || main?.querySelector('.detail-hero, .event-list, .home-calendar, .cards, .landing-hero');
  if (needsData) prefetchAppData();

  if (main?.querySelector('.detail-hero--event, .event-list') || normalized === '/event') {
    const codeBase = window.hlx?.codeBasePath || '';
    loadCSS(`${codeBase}/styles/event/event-section.css`);
  }

  if (main?.querySelector('.detail-hero--club, .cards--club-activities, .cards--club-events, .cards--club-recaps, .cards--club-team, .cta-banner--join') || normalized === '/club') {
    const codeBase = window.hlx?.codeBasePath || '';
    loadCSS(`${codeBase}/styles/club/club-section.css`);
    import('./club/club-page.js').then((mod) => mod.prefetchClubData());
  }

  if (normalized === '/clubs' || normalized === '/events'
    || (normalized !== '/' && main?.querySelector('.landing-hero'))) {
    const heroImg = main?.querySelector('.landing-hero picture img, .landing-hero img');
    if (heroImg?.src) preloadGuestIndexHeroSrc(heroImg.src);
  }
}

function isGuestIndexPage(main) {
  return normalizePath(window.location.pathname) === '/'
    && Boolean(main?.querySelector('.landing-hero'));
}

function isHeaderReady(header) {
  return Boolean(header?.querySelector(':scope > .header.block'));
}

async function loadGuestIndex(main) {
  document.body.classList.add('guest-index');
  document.documentElement.classList.add('guest-index-route');
  const sections = [...main.querySelectorAll(':scope > .section')];
  if (!sections.length) return;
  const [heroSection, ...rest] = sections;
  await loadSection(heroSection, waitForGuestHeroImage);
  await Promise.all(rest.map((section) => loadSection(section)));
}

async function loadEventDetailPage(main) {
  const sections = [...main.querySelectorAll(':scope > .section')];
  if (!sections.length) return;

  const heroSection = sections.find((s) => s.querySelector('.detail-hero--event')) || sections[0];
  await loadSection(heroSection, waitForEventHeroImage);
}

/** Wait for event detail hero LCP image before painting below-fold sections. */
async function waitForEventHeroImage(section) {
  const img = section.querySelector(
    '#event-hero-primary img, .event-hero-img--primary img, .event-hero-img img',
  );
  await new Promise((resolve) => {
    if (img && !img.complete) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('decoding', 'async');
      if ('fetchPriority' in img) img.fetchPriority = 'high';
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

/** Wait for hero LCP image when index hero media is shown. */
async function waitForGuestHeroImage(section) {
  const img = section.querySelector('.landing-hero-media img, .landing-hero picture img');
  await new Promise((resolve) => {
    if (img && !img.complete) {
      img.setAttribute('loading', 'eager');
      img.setAttribute('decoding', 'async');
      if ('fetchPriority' in img) img.fetchPriority = 'high';
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

function isHomePath() {
  return normalizePath(window.location.pathname) === '/home';
}

/**
 * Redirect guests/authed users between / and /home.
 * @returns {boolean} true if a redirect was triggered
 */
function handleAuthRouting(doc) {
  const authApi = window.AdobeClubsAuth;
  const path = normalizePath(window.location.pathname);
  const authed = authApi?.isAuthenticated?.();

  if (!authed) {
    if (path === '/home') {
      const next = encodeURIComponent('/home');
      window.location.replace(authApi?.loginUrlWithNext?.() || `/login?next=${next}`);
      return true;
    }
    return false;
  }

  if (path === '/' && !isAuthPage(doc)) {
    window.location.replace('/home');
    return true;
  }

  return false;
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const authPage = isAuthPage(doc);
  const main = doc.querySelector('main');
  const guestIndex = isGuestIndexPage(main);
  const eventDetail = isEventDetailPage(main);

  if (!authPage) {
    if (!guestIndex && !eventDetail) {
      const header = doc.querySelector('header');
      const headerPromise = header && !isHeaderReady(header) ? loadHeader(header) : null;
      await Promise.all([
        headerPromise || Promise.resolve(),
        loadSections(main),
      ]);
    } else if (guestIndex) {
      const header = doc.querySelector('header');
      const headerPromise = header && !isHeaderReady(header) ? loadHeader(header) : null;
      const pending = [...main.querySelectorAll(':scope > .section')].filter((section) => {
        const { sectionStatus: status } = section.dataset;
        return !status || status === 'initialized';
      });
      await Promise.all([
        headerPromise || Promise.resolve(),
        ...pending.map((section) => loadSection(section)),
      ]);
    } else if (eventDetail) {
      const header = doc.querySelector('header');
      const headerPromise = header && !isHeaderReady(header) ? loadHeader(header) : null;
      const pending = [...main.querySelectorAll(':scope > .section')].filter((section) => {
        const { sectionStatus: status } = section.dataset;
        return !status || status === 'initialized';
      });
      await Promise.all([
        headerPromise || Promise.resolve(),
        ...pending.map((section) => loadSection(section)),
      ]);
    }
  } else {
    doc.body.classList.add('auth-page');
    doc.querySelector('header')?.remove();
    doc.querySelector('footer')?.remove();
    await loadSections(main);
  }

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  if (!authPage) {
    await loadFooter(doc.querySelector('footer'));
    const { initUserChrome } = await import('./user-chrome.js');
    await initUserChrome();
    const { initClubPageChrome } = await import('./club/club-page.js');
    await initClubPageChrome(doc);
    if (isHomePath() && window.AdobeClubsAuth?.isAuthenticated?.()) {
      const { applyUserGreeting } = await import('./lib/user-greeting.js');
      applyUserGreeting();
    }
  }

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
