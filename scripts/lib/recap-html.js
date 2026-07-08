/**
 * Shared recap HTML helpers (club + event pages).
 */

import { esc } from '../club/club-page.js';

export function getRecapBody(recap) {
  if (!recap) return '';
  if (typeof recap === 'string') return recap;
  return recap.summary || recap.body || '';
}

export function normalizeEventRecap(recap) {
  if (!recap) return { summary: '', highlights: [], attendance: '' };
  if (typeof recap === 'string') return { summary: recap, highlights: [], attendance: '' };
  const highlights = Array.isArray(recap.highlights) ? recap.highlights : [];
  const attendance = recap.attendance
    || (Number.isFinite(Number(recap.attendanceCount)) && Number(recap.attendanceCount) > 0
      ? `${recap.attendanceCount} members`
      : '');
  return {
    summary: recap.summary || recap.body || '',
    highlights,
    attendance,
  };
}

function resolveRecapOpts(ev, third) {
  if (!third) return { dateLabel: `${ev.month} ${ev.day}` };
  if (third.name || third.id) {
    return {
      clubName: third.name || ev.club,
      dateLabel: `${ev.month} ${ev.day}`,
    };
  }
  return {
    dateLabel: `${ev.month} ${ev.day}`,
    ...third,
  };
}

export function buildRecapHtml(recap, ev, third) {
  const uf = window.AdobeUserFeatures;
  const opts = resolveRecapOpts(ev, third);
  if (uf?.buildRecapHtml) {
    return uf.buildRecapHtml(recap, ev, opts);
  }

  const data = normalizeEventRecap(recap);
  if (!data.summary) return '';

  const {
    clubName = ev?.club || '',
    dateLabel = opts.dateLabel || '',
    compact = false,
    showReadLink = false,
    card = false,
  } = opts;

  if (card) {
    const summaryLimit = 100;
    const summaryText = data.summary.length > summaryLimit
      ? `${data.summary.slice(0, summaryLimit).trim()}…`
      : data.summary;
    return `
      <div class="recap-detail recap-detail--card">
        <p class="recap-detail-eyebrow">Event recap${dateLabel ? ` · ${esc(dateLabel)}` : ''}</p>
        <h2 class="recap-detail-title">${esc(ev?.title || 'Event recap')}</h2>
        <p class="recap-detail-summary">${esc(summaryText)}</p>
        <div class="recap-card-footer">
          ${data.attendance ? `<span class="recap-card-attendance">${esc(data.attendance)}</span>` : ''}
          ${showReadLink ? '<span class="recap-read-link">Read recap →</span>' : ''}
        </div>
      </div>`;
  }

  const summaryLimit = compact ? 220 : Infinity;
  const summaryText = data.summary.length > summaryLimit
    ? `${data.summary.slice(0, summaryLimit).trim()}…`
    : data.summary;
  const highlightItems = compact ? data.highlights.slice(0, 3) : data.highlights;
  const highlightsHtml = highlightItems.length
    ? `<ul class="recap-highlights">${highlightItems.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
    : '';
  const attendanceHtml = data.attendance
    ? `<div class="recap-stat"><span class="recap-stat-label">Attended</span><strong class="recap-stat-value">${esc(data.attendance)}</strong></div>`
    : '';

  return `
    <div class="recap-detail${compact ? ' recap-detail--compact' : ''}">
      <div class="recap-detail-head">
        <p class="recap-detail-eyebrow">Event recap${dateLabel ? ` · ${esc(dateLabel)}` : ''}</p>
        ${clubName ? `<span class="recap-detail-club">${esc(clubName)}</span>` : ''}
      </div>
      <h2 class="recap-detail-title">${esc(ev?.title || 'Event recap')}</h2>
      <section class="recap-detail-section">
        <h3>What happened</h3>
        <p class="recap-detail-summary">${esc(summaryText)}</p>
      </section>
      ${highlightItems.length ? `
        <section class="recap-detail-section">
          <h3>Highlights</h3>
          ${highlightsHtml}
        </section>` : ''}
      ${attendanceHtml ? `<div class="recap-detail-stats">${attendanceHtml}</div>` : ''}
      ${showReadLink ? '<span class="recap-read-link">Read recap →</span>' : ''}
    </div>`;
}
