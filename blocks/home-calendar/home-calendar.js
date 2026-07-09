/**
 * Home Calendar — mini calendar + RSVP list for /home members.
 * da.live: section-calendar-label | Your calendar, link-text | …, link-href | …
 */
import { loadCSS } from '../../scripts/aem.js';
import { readPageConfig, cfg, fillTemplate } from '../../scripts/lib/block-config.js';
import { fetchAppData } from '../../scripts/lib/app-data.js';
import { ensureHomeCardRuntime } from '../../scripts/lib/cards/home-runtime.js';
import { parseEventDate, isUpcoming } from '../../scripts/lib/cards/event-dates.js';

export const HOME_CALENDAR_DEFAULTS = {
  'section-calendar-label': 'Your calendar',
  'section-calendar-link': "View RSVP'd events →",
  'section-calendar-href': '/events?rsvp=mine',
  'cal-rsvps-title': "RSVP'd events",
  'cal-empty-text': "No RSVP'd events yet.",
  'cal-empty-link': 'Browse events →',
  'cal-empty-href': '/events',
  'cal-more-template': "{count} more RSVP'd event{plural} →",
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function auth() {
  return window.AdobeClubsAuth || null;
}

function uf() {
  return window.AdobeUserFeatures || null;
}

function mergedEvents() {
  return window.__adobeClubEvents || [];
}

function renderCalendar(root, config) {
  if (!root) return;
  const features = uf();
  if (!features?.buildMiniCalendarHtml) {
    root.innerHTML = '<div class="hm-cal-card hm-cal-card--loading" aria-busy="true"></div>';
    return;
  }
  const rsvpIds = auth()?.getRsvpedEvents?.() || [];
  const rsvped = mergedEvents()
    .filter((e) => rsvpIds.includes(e.id))
    .filter(isUpcoming);
  const days = features?.getRsvpCalendarDays?.(rsvped) || [];
  const cal = features?.buildMiniCalendarHtml?.(days, 'uf-cal') || '';
  const sortedRsvps = [...rsvped].sort((a, b) => {
    const da = parseEventDate(a);
    const db = parseEventDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });
  const visible = sortedRsvps.slice(0, 3);
  const extraCount = sortedRsvps.length - visible.length;
  const calHref = esc(cfg(config, 'section-calendar-href', '/events?rsvp=mine'));
  const moreTemplate = cfg(config, 'cal-more-template', HOME_CALENDAR_DEFAULTS['cal-more-template']);

  const rsvpListHtml = visible.length
    ? `<ul class="hm-rsvp-list" role="list">${visible.map((ev) => `
        <li>
          <a class="hm-rsvp-item" href="/event?id=${esc(ev.id)}">
            <span class="hm-rsvp-date">${esc(ev.month)} ${esc(ev.day)}</span>
            <span class="hm-rsvp-title">${esc(ev.title)}</span>
            <span class="hm-rsvp-meta">${esc(ev.club)} · ${esc(ev.time)}</span>
          </a>
        </li>`).join('')}</ul>
        ${extraCount > 0 ? `<p class="hm-rsvp-more"><a href="${calHref}" class="hm-section-link">${esc(fillTemplate(moreTemplate, { count: extraCount, plural: extraCount === 1 ? '' : 's' }))}</a></p>` : ''}`
    : `<div class="hm-rsvp-empty">
        <p>${esc(cfg(config, 'cal-empty-text', HOME_CALENDAR_DEFAULTS['cal-empty-text']))}</p>
        <a href="${esc(cfg(config, 'cal-empty-href', '/events'))}" class="hm-section-link">${esc(cfg(config, 'cal-empty-link', HOME_CALENDAR_DEFAULTS['cal-empty-link']))}</a>
      </div>`;

  root.innerHTML = `
    <div class="hm-cal-layout">
      <div class="hm-cal-card">${cal}</div>
      <aside class="hm-cal-rsvps" aria-label="Your RSVP'd events">
        <h3 class="hm-cal-rsvps-title">${esc(cfg(config, 'cal-rsvps-title', HOME_CALENDAR_DEFAULTS['cal-rsvps-title']))}</h3>
        ${rsvpListHtml}
      </aside>
    </div>
  `;
}

export default async function decorate(block) {
  if (!auth()?.isAuthenticated?.()) return;

  const config = readPageConfig(block, HOME_CALENDAR_DEFAULTS);
  const label = cfg(config, 'section-calendar-label', HOME_CALENDAR_DEFAULTS['section-calendar-label']);
  const link = cfg(config, 'section-calendar-link', HOME_CALENDAR_DEFAULTS['section-calendar-link']);
  const href = cfg(config, 'section-calendar-href', HOME_CALENDAR_DEFAULTS['section-calendar-href']);

  block.textContent = '';
  block.classList.add('home-calendar');

  block.innerHTML = `
    <section class="hm-section" aria-label="${esc(label)}">
      <div class="hm-section-head">
        <h2>${esc(label)}</h2>
        <a href="${esc(href)}" class="hm-section-link">${esc(link)}</a>
      </div>
      <div id="hm-calendar"></div>
    </section>
  `;

  await ensureHomeCardRuntime();
  const data = await fetchAppData();
  window.__adobeClubEvents = data?.events || [];

  const root = block.querySelector('#hm-calendar');
  renderCalendar(root, config);

  const base = window.hlx?.codeBasePath || '';
  await loadCSS(`${base}/styles/user-features.css`);

  if (!window.__homeCalendarBound) {
    window.__homeCalendarBound = true;
    const refresh = () => renderCalendar(document.getElementById('hm-calendar'), config);
    window.addEventListener('adobe-rsvp-changed', refresh);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    });
    window.addEventListener('storage', (e) => {
      if (e.key?.includes('adobeClubsRsvpedEvents')) refresh();
    });
  }
}
