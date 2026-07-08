/**
 * Admin Dashboard — club-admin control center on /home.
 * da.live: key | value config rows. Scoped to managed clubs; overall admin sees all.
 */
import { loadCSS, loadScript } from '../../scripts/aem.js';
import { readPageConfig, cfg, fillTemplate } from '../../scripts/lib/block-config.js';
import { getEventImageSrc } from '../../scripts/club/club-page.js';
import { getClubImageSrc } from '../../scripts/lib/club-images.js';

export const ADMIN_DASHBOARD_DEFAULTS = {
  'clubs-data': '/data/data.json',
  title: 'Dashboard',
  'greeting-template': 'Hello {name}, welcome back!',
  'meta-club-admin': 'Club admin · Managing {clubs} · {date}',
  'meta-overall-admin': 'Overall admin · Adobe Clubs control center · {date}',
  'action-add-event': '+ Add event',
  'action-add-resource': '+ Add resource',
  'action-view-clubs': 'View my clubs',
  'action-manage-clubs': 'Manage clubs',
  'panel-capacity': 'Event capacity',
  'panel-top-clubs': 'Top clubs',
  'panel-events': 'All events',
  'panel-events-link': 'View all events',
  'panel-action-items': 'Action items',
  'panel-upcoming': 'Upcoming event',
  'panel-calendar': 'Calendar',
  'panel-activity': 'Recent activity',
  'chip-upcoming': 'Upcoming',
  'chip-members': 'Members',
  'chip-attention': 'Needs attention',
  'chip-audit': 'Audit trail',
  'empty-action-items': 'All caught up — no action items right now.',
  'empty-events': 'No events scheduled.',
  'empty-clubs': 'No clubs yet.',
  'empty-upcoming': 'No upcoming events.',
  'empty-agenda': 'Nothing scheduled.',
  'empty-activity-club': 'No club-admin posts for your clubs yet.',
  'empty-activity-overall': 'No club-admin posts recorded yet.',
  'panel-club-proposals': 'Club proposals',
  'chip-review': 'Review & approve',
  'empty-club-proposals': 'No club proposals received yet.',
  'panel-activity-overall-title': 'Club admin activity',
  'stat-club-requests': 'Club requests',
  'stat-club-requests-clear': 'All clear',
  'stat-club-requests-pending-template': '{count} pending',
};

const ICONS = {
  clubs: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  members: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  events: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  rsvps: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  resources: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  recaps: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  requests: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
};

let PAGE_CONFIG = { ...ADMIN_DASHBOARD_DEFAULTS };
let DATA = null;
let depsLoaded = false;
let stylesLoaded = false;

async function loadAdminStyles() {
  if (stylesLoaded) return;
  const base = codeBase();
  await loadCSS(`${base}/blocks/admin-dashboard/admin-dashboard.css`);
  stylesLoaded = true;
}

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

function seats() {
  return window.AdobeEventSeats || null;
}

function isOverallAdmin() {
  return Boolean(auth()?.isAdmin?.());
}

function managedClubIds() {
  return auth()?.getManagedClubIds?.() || [];
}

function codeBase() {
  return window.hlx?.codeBasePath || '';
}

async function loadDependencies() {
  if (depsLoaded) return;
  const base = codeBase();
  await Promise.all([
    loadCSS(`${base}/styles/user-features.css`),
    loadScript(`${base}/scripts/user-features.js`),
    loadScript(`${base}/scripts/event-seats.js`),
    loadScript(`${base}/scripts/club-request-prompt.js`),
    loadScript(`${base}/scripts/notifications.js`),
  ]);
  depsLoaded = true;
}

async function loadData({ bustCache = false } = {}) {
  const path = cfg(PAGE_CONFIG, 'clubs-data', ADMIN_DASHBOARD_DEFAULTS['clubs-data']);
  if (!bustCache && window.__adobeClubsDataPrefetch) {
    try {
      const prefetched = await window.__adobeClubsDataPrefetch;
      if (prefetched) return prefetched;
    } catch {
      /* fetch fresh below */
    }
  }
  const url = bustCache
    ? `${path}${path.includes('?') ? '&' : '?'}t=${Date.now()}`
    : path;
  const res = await fetch(url, bustCache ? { cache: 'no-store' } : undefined);
  if (!res.ok) throw new Error('Could not load data.json');
  const data = await res.json();
  if (bustCache) {
    window.__adobeClubsDataPrefetch = Promise.resolve(data);
  }
  return data;
}

async function reloadDashboardData() {
  const data = await loadData({ bustCache: true });
  const mergedEvents = auth()?.mergePublishedEvents?.(data.events || []) || data.events || [];
  window.__adobeClubEventsForTiming = mergedEvents;
  uf()?.resetEventTimingSnapshot?.(mergedEvents);
  return data;
}

function parseDate(ev) {
  return uf()?.parseEventDate?.(ev) || null;
}

function isUpcoming(ev) {
  if (uf()?.isEventUpcoming) return uf().isEventUpcoming(ev);
  const dt = parseDate(ev);
  if (!dt) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return dt >= today;
}

function isPast(ev) {
  if (uf()?.isEventPast) return uf().isEventPast(ev);
  const dt = parseDate(ev);
  if (!dt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(23, 59, 59, 999);
  return dt < today;
}

function getRecap(ev) {
  return uf()?.getEventRecap?.(ev.id, ev) || auth()?.getEventRecap?.(ev.id, ev) || null;
}

function hasRecapContent(recap) {
  if (!recap) return false;
  if (typeof recap === 'string') return recap.trim().length > 0;
  return Boolean(
    String(recap.summary || recap.body || recap.text || '').trim()
    || (Array.isArray(recap.highlights) && recap.highlights.some(Boolean))
  );
}

function needsRecap(ev) {
  return isPast(ev) && !hasRecapContent(getRecap(ev));
}

function resolveClub(ev, clubs) {
  if (ev.clubId) {
    const byId = clubs.find((c) => c.id === ev.clubId);
    if (byId) return byId;
  }
  const name = String(ev.club || '').toLowerCase().trim();
  if (!name) return null;
  return clubs.find((c) => {
    const n = String(c.name || '').toLowerCase();
    return name === n || name === `${n} club` || name.includes(n) || (n && n.includes(name.split(' ')[0]));
  }) || null;
}

function eventInScope(ev, clubs, ids) {
  const club = resolveClub(ev, clubs);
  const clubId = club?.id || ev?.clubId;
  return Boolean(clubId && ids.includes(clubId));
}

function articleInScope(art, ids) {
  return Boolean(art?.clubId && ids.includes(art.clubId));
}

function eventHref(id) {
  return `/event?id=${encodeURIComponent(id)}`;
}

function clubImageSrc(club) {
  return club?.image ? getClubImageSrc(club) : null;
}

function eventCardImageSrc(ev, club) {
  return getEventImageSrc(ev) || clubImageSrc(club);
}

function formatDateShort(ev) {
  const m = String(ev.month || '').trim();
  const d = String(ev.day || '').trim();
  if (!m || !d) return '';
  return `${m.charAt(0).toUpperCase()}${m.slice(1).toLowerCase()} ${d}`;
}

function memberDeltaThisMonth(clubIds) {
  return auth()?.getMonthMemberNet?.(clubIds) ?? 0;
}

function reservedSeats(ev) {
  const s = seats();
  if (!s) return 0;
  const cap = Number(s.getCapacity?.(ev));
  const left = Number(s.getSpotsLeft?.(ev));
  if (!Number.isFinite(cap) || !Number.isFinite(left)) return 0;
  return Math.max(0, cap - left);
}

function capacityInfo(ev) {
  const s = seats();
  let cap = Number(s?.getCapacity?.(ev));
  let left = Number(s?.getSpotsLeft?.(ev));
  if (!Number.isFinite(left)) left = Number(ev.spotsLeft);
  if (!Number.isFinite(cap) || cap <= 0) cap = Number.isFinite(left) ? left : 0;
  if (!Number.isFinite(left)) left = cap;
  const reserved = Math.max(0, cap - left);
  return { cap, left, reserved, ratio: cap > 0 ? reserved / cap : 0 };
}

function timeAgo(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 60 * 1000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

function statCard({ label, value, sub, icon, variant, subDelta }) {
  const cls = variant ? ` adm-stat--${variant}` : '';
  const delta = Number(subDelta) > 0 ? Number(subDelta) : 0;
  const subCls = delta > 0 ? ' adm-stat-sub--up' : '';
  return `
    <div class="adm-stat${cls}">
      <span class="adm-stat-ic">${icon}</span>
      <div class="adm-stat-text">
        <span class="adm-stat-label">${esc(label)}</span>
        <span class="adm-stat-value">${esc(value)}</span>
        ${sub ? `<span class="adm-stat-sub${subCls}">${esc(sub)}</span>` : ''}
      </div>
    </div>`;
}

function renderCapacityDonut(upcoming) {
  let full = 0;
  let filling = 0;
  let open = 0;
  upcoming.forEach((ev) => {
    const { left, ratio } = capacityInfo(ev);
    if (left <= 0) full += 1;
    else if (ratio >= 0.5) filling += 1;
    else open += 1;
  });
  const total = upcoming.length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const a = total ? (full / total) * 100 : 0;
  const b = a + (total ? (filling / total) * 100 : 0);
  const ring = total
    ? `conic-gradient(var(--red) 0 ${a}%, #d4820a ${a}% ${b}%, var(--accent) ${b}% 100%)`
    : 'conic-gradient(var(--bg-subtle) 0 100%)';
  const legend = [
    { label: 'Full', n: full, c: 'var(--red)' },
    { label: 'Filling up', n: filling, c: '#d4820a' },
    { label: 'Open', n: open, c: 'var(--accent)' },
  ].map((r) => `
    <div class="adm-legend-row">
      <span class="adm-legend-dot" style="background:${r.c}"></span>
      <span class="adm-legend-label">${r.label}</span>
      <span class="adm-legend-val">${r.n}</span>
      <span class="adm-legend-pct">${pct(r.n)}%</span>
    </div>`).join('');
  return `
    <div class="adm-donut-wrap">
      <div class="adm-donut" style="background:${ring}">
        <div class="adm-donut-hole">
          <span class="adm-donut-num">${total}</span>
          <span class="adm-donut-cap">Events</span>
        </div>
      </div>
      <div class="adm-legend">${legend}</div>
    </div>`;
}

function renderClubBars(clubs) {
  const sorted = [...clubs].sort((a, b) => (Number(b.members) || 0) - (Number(a.members) || 0)).slice(0, 6);
  if (!sorted.length) {
    return `<p class="adm-empty">${esc(cfg(PAGE_CONFIG, 'empty-clubs', ADMIN_DASHBOARD_DEFAULTS['empty-clubs']))}</p>`;
  }
  const max = Math.max(1, ...sorted.map((c) => Number(c.members) || 0));
  return sorted.map((c) => {
    const n = Number(c.members) || 0;
    const width = Math.max(6, Math.round((n / max) * 100));
    return `
      <a class="adm-bar-row" href="/club?id=${encodeURIComponent(c.id)}">
        <span class="adm-bar-label">${esc(c.name)}</span>
        <span class="adm-bar-track"><span class="adm-bar-fill" style="width:${width}%"></span></span>
        <span class="adm-bar-val">${n.toLocaleString('en-US')}</span>
      </a>`;
  }).join('');
}

function renderEventCards(upcoming, clubs) {
  const list = upcoming.slice(0, 3);
  if (!list.length) {
    return `<p class="adm-empty">${esc(cfg(PAGE_CONFIG, 'empty-events', ADMIN_DASHBOARD_DEFAULTS['empty-events']))}</p>`;
  }
  return `<div class="adm-cards">${list.map((ev) => {
    const club = resolveClub(ev, clubs);
    const img = eventCardImageSrc(ev, club);
    const tag = club?.tag || ev.type || 'Event';
    const accent = club?.accent || 'var(--accent)';
    const dateStr = formatDateShort(ev);
    const timeStr = ev.time || '';
    let when = '';
    if (dateStr && timeStr) when = `<span class="adm-card-when"><span class="adm-card-date">${esc(dateStr)}</span><span class="adm-card-sep">·</span><span class="adm-card-time">${esc(timeStr)}</span></span>`;
    else if (dateStr) when = `<span class="adm-card-when"><span class="adm-card-date">${esc(dateStr)}</span></span>`;
    else if (timeStr) when = `<span class="adm-card-when"><span class="adm-card-time">${esc(timeStr)}</span></span>`;
    return `
      <a class="adm-card" href="${eventHref(ev.id)}">
        <div class="adm-card-media" style="--c:${esc(accent)}">
          <span class="adm-card-emoji">${esc(club?.icon || '📌')}</span>
          ${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
          <span class="adm-card-badge">${esc(tag)}</span>
        </div>
        <div class="adm-card-body">
          <h3 class="adm-card-title">${esc(ev.title)}</h3>
          <p class="adm-card-loc">${esc(ev.location || club?.name || '')}</p>
          <div class="adm-card-foot">${when}</div>
        </div>
      </a>`;
  }).join('')}</div>`;
}

function updateRow(u) {
  const cls = `adm-update adm-update--${esc(u.badgeType || 'update')}`;
  const inner = `
    <span class="adm-badge adm-badge--${u.badgeType}">${esc(u.badge)}</span>
    <div class="adm-update-body"><p class="adm-update-text">${u.text}</p></div>
    <span class="adm-update-time">${esc(timeAgo(u.createdAt))}</span>`;
  return u.href && u.href !== '#'
    ? `<a class="${cls}" href="${esc(u.href)}">${inner}</a>`
    : `<div class="${cls}">${inner}</div>`;
}

function pendingClubRequests() {
  try {
    const list = JSON.parse(localStorage.getItem('adobeClubsClubRequests') || '[]');
    return Array.isArray(list) ? list.filter((r) => r.status === 'pending') : [];
  } catch {
    return [];
  }
}

function pendingClubRequestCount() {
  return pendingClubRequests().length;
}

function renderLatestUpdates(events, clubs, ids, overall) {
  const recapRows = events.filter(needsRecap).map((ev) => {
    const club = resolveClub(ev, clubs);
    return {
      badgeType: 'action',
      badge: 'Action needed',
      text: `Post recap: <strong>${esc(ev.title)}</strong>${club ? ` · ${esc(club.name)}` : ''}`,
      createdAt: parseDate(ev)?.getTime() || 0,
      href: club ? `/club?id=${encodeURIComponent(club.id)}#club-recaps-create` : '/events#ev-grid-past',
    };
  });

  const seatRows = events.filter((ev) => {
    const s = seats();
    if (!s) return false;
    const left = Number(s.getSpotsLeft?.(ev));
    return Number.isFinite(left) && left <= 0;
  }).map((ev) => {
    const club = resolveClub(ev, clubs);
    return {
      badgeType: 'action',
      badge: 'Seats full',
      text: `<strong>${esc(ev.title)}</strong> is fully booked${club ? ` · ${esc(club.name)}` : ''}`,
      createdAt: parseDate(ev)?.getTime() || 0,
      href: eventHref(ev.id),
    };
  });

  const requestRows = overall
    ? pendingClubRequests().map((r) => ({
      badgeType: 'action',
      badge: 'Review needed',
      text: `Club proposal: <strong>${esc(r.clubName)}</strong> · ${esc(r.category)} · from ${esc(r.submittedBy || r.leadName || 'member')}`,
      createdAt: r.submittedAt || 0,
      href: '/#club-requests',
    }))
    : [];

  const rows = [...recapRows, ...requestRows, ...seatRows]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 8);

  if (!rows.length) {
    return `<p class="adm-empty">${esc(cfg(PAGE_CONFIG, 'empty-action-items', ADMIN_DASHBOARD_DEFAULTS['empty-action-items']))}</p>`;
  }
  return rows.map(updateRow).join('');
}

function renderFeaturedEvent(ev, clubs) {
  if (!ev) {
    return `<p class="adm-empty">${esc(cfg(PAGE_CONFIG, 'empty-upcoming', ADMIN_DASHBOARD_DEFAULTS['empty-upcoming']))}</p>`;
  }
  const club = resolveClub(ev, clubs);
  const img = eventCardImageSrc(ev, club);
  const tag = club?.tag || ev.type || 'Event';
  const accent = club?.accent || 'var(--accent)';
  const raw = String(ev.desc || '');
  const desc = raw.length > 130 ? `${raw.slice(0, 130)}…` : raw;
  return `
    <div class="adm-feat-media" style="--c:${esc(accent)}">
      <span class="adm-feat-emoji">${esc(club?.icon || '📌')}</span>
      ${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
      <span class="adm-card-badge">${esc(tag)}</span>
    </div>
    <div class="adm-feat-body">
      <h3 class="adm-feat-title">${esc(ev.title)}</h3>
      <p class="adm-feat-loc">${esc(ev.location || club?.name || '')}</p>
      ${desc ? `<p class="adm-feat-desc">${esc(desc)}</p>` : ''}
      <div class="adm-feat-foot">
        <span class="adm-feat-when">${esc(formatDateShort(ev))}${ev.time ? ` · ${esc(ev.time)}` : ''}</span>
        <a class="adm-feat-btn" href="${eventHref(ev.id)}">View details</a>
      </div>
    </div>`;
}

function renderCalendar(events) {
  const features = uf();
  if (!features?.buildMiniCalendarHtml) {
    return '<p class="adm-empty">Calendar unavailable.</p>';
  }
  const days = features.getRsvpCalendarDays?.(events) || [];
  return `<div class="adm-cal-wrap">${features.buildMiniCalendarHtml(days, 'uf-cal')}</div>`;
}

function renderAgenda(upcoming, clubs) {
  const list = upcoming.slice(0, 4);
  if (!list.length) {
    return `<p class="adm-empty">${esc(cfg(PAGE_CONFIG, 'empty-agenda', ADMIN_DASHBOARD_DEFAULTS['empty-agenda']))}</p>`;
  }
  return list.map((ev) => {
    const d = parseDate(ev);
    const day = d ? d.getDate() : (ev.day || '');
    const wd = d ? d.toLocaleDateString('en-US', { weekday: 'short' }) : '';
    const club = resolveClub(ev, clubs);
    const accent = club?.accent || 'var(--accent)';
    return `
      <a class="adm-agenda-row" href="${eventHref(ev.id)}">
        <span class="adm-agenda-date" style="--c:${esc(accent)}"><b>${esc(day)}</b><small>${esc(wd)}</small></span>
        <div class="adm-agenda-main">
          <span class="adm-agenda-title">${esc(ev.title)}</span>
          <span class="adm-agenda-meta">${esc(club?.name || ev.type || '')}${ev.time ? ` · ${esc(ev.time)}` : ''}</span>
        </div>
      </a>`;
  }).join('');
}

function notifBadge(type) {
  switch (type) {
    case 'recap_needed': return { badge: 'Recap needed', type: 'action' };
    case 'seats_full': return { badge: 'Seats full', type: 'action' };
    case 'new_event':
    case 'event_created':
    case 'admin_event_created': return { badge: 'Event created', type: 'update' };
    case 'admin_event_updated':
    case 'event_updated':
    case 'updated_event': return { badge: 'Event updated', type: 'update' };
    case 'admin_event_deleted':
    case 'event_deleted': return { badge: 'Event deleted', type: 'action' };
    case 'admin_resource_created':
    case 'resource_created': return { badge: 'Resource created', type: 'update' };
    case 'admin_resource_updated':
    case 'resource_updated': return { badge: 'Resource updated', type: 'update' };
    case 'admin_resource_deleted':
    case 'resource_deleted': return { badge: 'Resource deleted', type: 'action' };
    case 'admin_recap_created':
    case 'recap_created':
    case 'recap_posted': return { badge: 'Recap posted', type: 'update' };
    case 'admin_recap_updated':
    case 'recap_updated': return { badge: 'Recap updated', type: 'update' };
    case 'admin_recap_deleted':
    case 'recap_deleted': return { badge: 'Recap deleted', type: 'action' };
    case 'club_request': return { badge: 'Review needed', type: 'action' };
    default: return { badge: 'Update', type: 'update' };
  }
}

/* Club-admin posts only — events, resources, recaps (no RSVPs or member joins). */
const ADMIN_POSTED_ACTIVITY_TYPES = new Set([
  'event_created', 'event_updated', 'event_deleted',
  'resource_created', 'resource_updated', 'resource_deleted',
  'recap_created', 'recap_updated', 'recap_deleted',
  'admin_event_created', 'admin_event_updated', 'admin_event_deleted',
  'admin_resource_created', 'admin_resource_updated', 'admin_resource_deleted',
  'admin_recap_created', 'admin_recap_updated', 'admin_recap_deleted',
]);


function statusPill(status) {
  const map = {
    pending: { label: 'Pending review', cls: 'adm-req-pill--pending' },
    approved: { label: 'Approved', cls: 'adm-req-pill--approved' },
    declined: { label: 'Declined', cls: 'adm-req-pill--declined' },
  };
  const m = map[status] || { label: status, cls: '' };
  return `<span class="adm-req-pill ${m.cls}">${esc(m.label)}</span>`;
}

function renderClubRequests() {
  let list;
  try {
    const raw = JSON.parse(localStorage.getItem('adobeClubsClubRequests') || '[]');
    list = Array.isArray(raw) ? raw : [];
  } catch {
    list = [];
  }

  if (!list.length) {
    return `<p class="adm-empty">${esc(cfg(PAGE_CONFIG, 'empty-club-proposals', ADMIN_DASHBOARD_DEFAULTS['empty-club-proposals']))}</p>`;
  }

  return list.slice(0, 20).map((r) => {
    const isPending = r.status === 'pending';
    const dateStr = r.submittedAt ? timeAgo(r.submittedAt) : '';
    return `
      <div class="adm-req-row" data-req-id="${esc(r.id)}">
        <div class="adm-req-main">
          <div class="adm-req-head">
            <span class="adm-req-name">${esc(r.clubName)}</span>
            ${statusPill(r.status || 'pending')}
          </div>
          <p class="adm-req-meta">${esc(r.category)}${r.meetingFrequency ? ` · ${esc(r.meetingFrequency)}` : ''} · ${esc(r.expectedMembers || '?')} expected members${r.slackChannel ? ` · #${esc(r.slackChannel)}` : ''}</p>
          <p class="adm-req-desc">${esc((r.description || '').slice(0, 120))}${(r.description || '').length > 120 ? '…' : ''}</p>
          <p class="adm-req-from">Proposed by <strong>${esc(r.submittedBy || r.leadName || 'Member')}</strong>${r.leadEmail ? ` (${esc(r.leadEmail)})` : ''}${dateStr ? ` · ${dateStr}` : ''}</p>
        </div>
        ${isPending ? `
          <div class="adm-req-actions">
            <button type="button" class="adm-req-btn adm-req-btn--approve" data-req-approve="${esc(r.id)}">Approve</button>
            <button type="button" class="adm-req-btn adm-req-btn--decline" data-req-decline="${esc(r.id)}">Decline</button>
          </div>` : ''}
      </div>`;
  }).join('');
}

function wireClubRequests(container, block) {
  container.querySelectorAll('[data-req-approve]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.AdobeClubRequest?.approveRequest?.(btn.dataset.reqApprove);
      renderDashboard(block).catch(() => {});
    });
  });
  container.querySelectorAll('[data-req-decline]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.AdobeClubRequest?.declineRequest?.(btn.dataset.reqDecline);
      renderDashboard(block).catch(() => {});
    });
  });
}

function renderActivity(emptyMsg, { overall, managedIds }) {
  const log = (window.AdobeNotifications?.getActivityLog?.() || []).filter((entry) => {
    if (!ADMIN_POSTED_ACTIVITY_TYPES.has(entry.type)) return false;
    if (!entry.clubId) return overall;
    return overall || managedIds.includes(entry.clubId);
  });
  if (!log.length) {
    return `<p class="adm-empty">${esc(emptyMsg)}</p>`;
  }
  return log.slice(0, 8).map((entry) => {
    const badge = notifBadge(entry.type);
    const badgeType = badge.type || entry.badgeType || 'update';
    const inner = `
      <span class="adm-act-dot adm-act-dot--${badgeType}"></span>
      <div class="adm-act-body">
        <p class="adm-act-text">${esc(entry.title)}${entry.clubName ? ` · ${esc(entry.clubName)}` : ''}</p>
        <span class="adm-act-badge">${esc(badge.badge || entry.badge || 'Update')}</span>
      </div>`;
    return entry.href && entry.href !== '#'
      ? `<a class="adm-act-row" href="${esc(entry.href)}">${inner}</a>`
      : `<div class="adm-act-row">${inner}</div>`;
  }).join('');
}

function buildDashboardHtml(data) {
  const overall = isOverallAdmin();
  const ids = managedClubIds();
  const allClubs = auth()?.enrichClubs?.(data.clubs || []) || data.clubs || [];
  const clubs = overall ? allClubs : allClubs.filter((c) => ids.includes(c.id));
  const allEvents = auth()?.mergePublishedEvents?.(data.events || []) || data.events || [];
  seats()?.init?.(allEvents);
  window.__adobeClubEventsForTiming = allEvents;
  window.AdobeNotifications?.checkAdminRecapReminders?.(allEvents, allClubs);
  const events = overall ? allEvents : allEvents.filter((ev) => eventInScope(ev, allClubs, ids));
  const allArticles = auth()?.mergePublishedArticles?.(data.articles || []) || data.articles || [];
  const articles = overall ? allArticles : allArticles.filter((art) => articleInScope(art, ids));

  const user = auth()?.getCurrentUser?.();
  const name = user?.displayName || user?.username || 'Admin';
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const managedNames = clubs.map((c) => c.name).join(', ');
  const metaTemplate = overall
    ? cfg(PAGE_CONFIG, 'meta-overall-admin', ADMIN_DASHBOARD_DEFAULTS['meta-overall-admin'])
    : cfg(PAGE_CONFIG, 'meta-club-admin', ADMIN_DASHBOARD_DEFAULTS['meta-club-admin']);
  const metaLine = fillTemplate(metaTemplate, { clubs: managedNames || 'your clubs', date: dateLabel });

  const upcoming = events.filter(isUpcoming).sort((a, b) => (parseDate(a)?.getTime() || 0) - (parseDate(b)?.getTime() || 0));
  const nextEvent = upcoming[0];
  const monthDelta = memberDeltaThisMonth(overall ? null : ids);

  let rsvpTotal = 0;
  let rsvpEvents = 0;
  events.forEach((ev) => {
    const r = reservedSeats(ev);
    if (r > 0) { rsvpTotal += r; rsvpEvents += 1; }
  });

  const recapCount = events.filter(needsRecap).length;
  const clubCount = clubs.length;
  const totalMembers = clubs.reduce((sum, c) => sum + (Number(c.members) || 0), 0);
  const pendingCount = overall ? pendingClubRequestCount() : 0;
  const rsvpSub = rsvpEvents > 0
    ? `Across ${rsvpEvents} event${rsvpEvents === 1 ? '' : 's'}`
    : 'No RSVPs yet';

  const lastStat = overall
    ? statCard({
      label: cfg(PAGE_CONFIG, 'stat-club-requests', ADMIN_DASHBOARD_DEFAULTS['stat-club-requests']),
      value: pendingCount,
      sub: pendingCount > 0
        ? fillTemplate(cfg(PAGE_CONFIG, 'stat-club-requests-pending-template', ADMIN_DASHBOARD_DEFAULTS['stat-club-requests-pending-template']), { count: pendingCount })
        : cfg(PAGE_CONFIG, 'stat-club-requests-clear', ADMIN_DASHBOARD_DEFAULTS['stat-club-requests-clear']),
      icon: ICONS.requests,
      variant: pendingCount > 0 ? 'danger' : undefined,
    })
    : statCard({
      label: 'Resources',
      value: articles.length,
      sub: articles.length ? 'Published' : 'None yet',
      icon: ICONS.resources,
    });

  const stats = [
    statCard({
      label: overall ? 'Clubs' : 'My clubs',
      value: clubCount,
      sub: 'Active',
      icon: ICONS.clubs,
      variant: 'accent',
    }),
    statCard({
      label: overall ? 'Total members' : 'Members',
      value: totalMembers.toLocaleString('en-US'),
      sub: monthDelta > 0 ? `+${monthDelta} this month` : (overall ? 'Across all clubs' : 'Across your clubs'),
      icon: ICONS.members,
      variant: 'members',
      subDelta: monthDelta,
    }),
    statCard({
      label: 'Upcoming events',
      value: upcoming.length,
      sub: nextEvent ? `Next: ${formatDateShort(nextEvent)}` : 'None scheduled',
      icon: ICONS.events,
    }),
    statCard({
      label: overall ? 'RSVPs' : 'Registrations',
      value: rsvpTotal,
      sub: rsvpSub,
      icon: ICONS.rsvps,
    }),
    lastStat,
    statCard({
      label: 'Recaps to post',
      value: recapCount,
      sub: recapCount > 0 ? 'Action needed' : 'All caught up',
      icon: ICONS.recaps,
      variant: recapCount > 0 ? 'danger' : undefined,
    }),
  ].join('');

  const activityTitle = overall
    ? cfg(PAGE_CONFIG, 'panel-activity-overall-title', ADMIN_DASHBOARD_DEFAULTS['panel-activity-overall-title'])
    : cfg(PAGE_CONFIG, 'panel-activity', ADMIN_DASHBOARD_DEFAULTS['panel-activity']);
  const activityEmpty = overall
    ? cfg(PAGE_CONFIG, 'empty-activity-overall', ADMIN_DASHBOARD_DEFAULTS['empty-activity-overall'])
    : cfg(PAGE_CONFIG, 'empty-activity-club', ADMIN_DASHBOARD_DEFAULTS['empty-activity-club']);

  return `
    <div class="adm-wrap">
      <header class="adm-head">
        <div class="adm-head-text">
          <h1 class="adm-title">${esc(cfg(PAGE_CONFIG, 'title', ADMIN_DASHBOARD_DEFAULTS.title))}</h1>
          <p class="adm-subtitle">${esc(fillTemplate(cfg(PAGE_CONFIG, 'greeting-template', ADMIN_DASHBOARD_DEFAULTS['greeting-template']), { name }))}</p>
          <p class="adm-meta">${esc(metaLine)}</p>
        </div>
        <div class="adm-actions">
          <a class="adm-action-btn adm-action-btn--primary" href="/events#create-event">${esc(cfg(PAGE_CONFIG, 'action-add-event', ADMIN_DASHBOARD_DEFAULTS['action-add-event']))}</a>
          <a class="adm-action-btn" href="/resources#create-article">${esc(cfg(PAGE_CONFIG, 'action-add-resource', ADMIN_DASHBOARD_DEFAULTS['action-add-resource']))}</a>
          <a class="adm-action-btn" href="/clubs">${esc(overall ? cfg(PAGE_CONFIG, 'action-manage-clubs', ADMIN_DASHBOARD_DEFAULTS['action-manage-clubs']) : cfg(PAGE_CONFIG, 'action-view-clubs', ADMIN_DASHBOARD_DEFAULTS['action-view-clubs']))}</a>
        </div>
      </header>

      <section class="adm-stats" aria-label="Overview">${stats}</section>

      <div class="adm-layout">
        <div class="adm-col-main">
          <div class="adm-grid-2">
            <section class="adm-panel" aria-label="Event capacity">
              <div class="adm-panel-head">
                <h2 class="adm-panel-title">${esc(cfg(PAGE_CONFIG, 'panel-capacity', ADMIN_DASHBOARD_DEFAULTS['panel-capacity']))}</h2>
                <span class="adm-chip">${esc(cfg(PAGE_CONFIG, 'chip-upcoming', ADMIN_DASHBOARD_DEFAULTS['chip-upcoming']))}</span>
              </div>
              ${renderCapacityDonut(upcoming)}
            </section>
            <section class="adm-panel" aria-label="Top clubs">
              <div class="adm-panel-head">
                <h2 class="adm-panel-title">${esc(cfg(PAGE_CONFIG, 'panel-top-clubs', ADMIN_DASHBOARD_DEFAULTS['panel-top-clubs']))}</h2>
                <span class="adm-chip">${esc(cfg(PAGE_CONFIG, 'chip-members', ADMIN_DASHBOARD_DEFAULTS['chip-members']))}</span>
              </div>
              <div class="adm-bars">${renderClubBars(clubs)}</div>
            </section>
          </div>

          <section class="adm-panel" aria-label="All events">
            <div class="adm-panel-head">
              <h2 class="adm-panel-title">${esc(cfg(PAGE_CONFIG, 'panel-events', ADMIN_DASHBOARD_DEFAULTS['panel-events']))}</h2>
              <a class="adm-panel-link" href="/events">${esc(cfg(PAGE_CONFIG, 'panel-events-link', ADMIN_DASHBOARD_DEFAULTS['panel-events-link']))}</a>
            </div>
            ${renderEventCards(upcoming, clubs)}
          </section>

          <section class="adm-panel" aria-label="Action items">
            <div class="adm-panel-head">
              <h2 class="adm-panel-title">${esc(cfg(PAGE_CONFIG, 'panel-action-items', ADMIN_DASHBOARD_DEFAULTS['panel-action-items']))}</h2>
              <span class="adm-chip">${esc(cfg(PAGE_CONFIG, 'chip-attention', ADMIN_DASHBOARD_DEFAULTS['chip-attention']))}</span>
            </div>
            <div class="adm-updates">${renderLatestUpdates(events, clubs, ids, overall)}</div>
          </section>

          ${overall ? `
          <section class="adm-panel" id="club-requests" aria-label="Club proposals">
            <div class="adm-panel-head">
              <h2 class="adm-panel-title">${esc(cfg(PAGE_CONFIG, 'panel-club-proposals', ADMIN_DASHBOARD_DEFAULTS['panel-club-proposals']))}${pendingCount > 0 ? ` <span class="adm-req-count">${pendingCount}</span>` : ''}</h2>
              <span class="adm-chip">${esc(cfg(PAGE_CONFIG, 'chip-review', ADMIN_DASHBOARD_DEFAULTS['chip-review']))}</span>
            </div>
            <div class="adm-req-list" id="adm-req-list">${renderClubRequests()}</div>
          </section>` : ''}
        </div>

        <aside class="adm-col-side">
          <section class="adm-panel adm-feat" aria-label="Upcoming event">
            <div class="adm-panel-head">
              <h2 class="adm-panel-title">${esc(cfg(PAGE_CONFIG, 'panel-upcoming', ADMIN_DASHBOARD_DEFAULTS['panel-upcoming']))}</h2>
            </div>
            ${renderFeaturedEvent(nextEvent, clubs)}
          </section>

          <section class="adm-panel" aria-label="Calendar">
            <div class="adm-panel-head">
              <h2 class="adm-panel-title">${esc(cfg(PAGE_CONFIG, 'panel-calendar', ADMIN_DASHBOARD_DEFAULTS['panel-calendar']))}</h2>
            </div>
            ${renderCalendar(upcoming)}
            <div class="adm-agenda">${renderAgenda(upcoming, clubs)}</div>
          </section>

          ${overall ? `
          <section class="adm-panel" aria-label="${esc(activityTitle)}">
            <div class="adm-panel-head">
              <h2 class="adm-panel-title">${esc(activityTitle)}</h2>
              <span class="adm-chip">${esc(cfg(PAGE_CONFIG, 'chip-audit', ADMIN_DASHBOARD_DEFAULTS['chip-audit']))}</span>
            </div>
            <div class="adm-activity">${renderActivity(activityEmpty, { overall, managedIds: ids })}</div>
          </section>` : ''}
        </aside>
      </div>
    </div>`;
}

async function renderDashboard(block) {
  DATA = await reloadDashboardData();
  block.innerHTML = buildDashboardHtml(DATA);
  const reqList = block.querySelector('#adm-req-list');
  if (reqList) wireClubRequests(reqList, block);
  if (window.location.hash === '#club-requests') {
    block.querySelector('#club-requests')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function bindRefresh(block) {
  if (window.__adminDashboardBound) return;
  window.__adminDashboardBound = true;
  const refresh = () => {
    renderDashboard(block).catch(() => {});
  };
  [
    'adobe-rsvp-changed', 'adobe-seats-changed', 'adobe-club-members-changed',
    'adobe-event-timing-changed', 'adobe-notifications-updated', 'adobe-activity-logged',
    'adobe-club-requests-updated',
  ].forEach((evt) => window.addEventListener(evt, refresh));
  auth()?.onPublishedContentChange?.(refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
}

function hideMemberHomeSections(block) {
  document.querySelectorAll('.section:has(.home-hero)').forEach((section) => {
    section.style.display = 'none';
  });
  document.querySelectorAll('.section:has(.home-dashboard)').forEach((section) => {
    if (section.contains(block)) return;
    section.style.display = 'none';
  });
}

function showAdminSection(block) {
  const section = block.closest('.section');
  if (!section) return;
  section.style.display = '';
  section.dataset.sectionStatus = 'loaded';
}

export default async function decorate(block) {
  if (!auth()?.isAnyAdmin?.()) {
    block.innerHTML = '';
    block.closest('.section')?.style.setProperty('display', 'none');
    return;
  }

  PAGE_CONFIG = readPageConfig(block, ADMIN_DASHBOARD_DEFAULTS);
  block.innerHTML = '';
  block.classList.remove('home-dashboard');
  block.classList.add('admin-dashboard');
  document.body.classList.add('admin-home', 'adm-active');
  document.body.classList.remove('user-home');

  hideMemberHomeSections(block);
  showAdminSection(block);

  try {
    await loadAdminStyles();
    await loadDependencies();
    await renderDashboard(block);
    bindRefresh(block);
  } catch (err) {
    block.innerHTML = `<div class="adm-wrap"><p class="adm-empty">Could not load dashboard data.</p></div>`;
    // eslint-disable-next-line no-console
    console.error('admin-dashboard:', err);
  }
}
