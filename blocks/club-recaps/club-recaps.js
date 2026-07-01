/**
 * Club Recaps block — past session highlights + admin recap form.
 */

import {
  esc,
  getAuth,
  loadClubScripts,
  resolveClubContext,
  getPastClubEvents,
  formatEventDate,
  isEventPast,
  canPostRecapForClub,
} from '../club-shared/club-page.js';

function getRecapBody(recap) {
  if (!recap) return '';
  if (typeof recap === 'string') return recap;
  return recap.summary || recap.body || '';
}

function getRecapForEvent(ev) {
  return window.AdobeUserFeatures?.getEventRecap?.(ev.id, ev)
    || getAuth().getEventRecap?.(ev.id, ev)
    || ev.recap
    || null;
}

function getRecapAttendance(recap) {
  if (!recap || typeof recap !== 'object') return '';
  if (recap.attendance) return recap.attendance;
  const count = Number(recap.attendanceCount);
  if (Number.isFinite(count) && count > 0) {
    return `${count} member${count === 1 ? '' : 's'}`;
  }
  return '';
}

function normalizeEventRecap(recap) {
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

function buildRecapModalHtml(recap, ev, club) {
  const uf = window.AdobeUserFeatures;
  if (uf?.buildRecapHtml) {
    return uf.buildRecapHtml(recap, ev, {
      clubName: club?.name || ev.club,
      dateLabel: formatEventDate(ev),
    });
  }

  const data = normalizeEventRecap(recap);
  const highlightsHtml = data.highlights.length
    ? `<ul class="recap-highlights">${data.highlights.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
    : '';
  const attendanceHtml = data.attendance
    ? `<div class="recap-stat"><span class="recap-stat-label">Attended</span><strong class="recap-stat-value">${esc(data.attendance)}</strong></div>`
    : '';
  const dateLabel = formatEventDate(ev);
  const clubName = club?.name || ev.club || '';

  return `
    <div class="recap-detail">
      <div class="recap-detail-head">
        <p class="recap-detail-eyebrow">Event recap${dateLabel ? ` · ${esc(dateLabel)}` : ''}</p>
        ${clubName ? `<span class="recap-detail-club">${esc(clubName)}</span>` : ''}
      </div>
      <h2 class="recap-detail-title" id="club-recap-modal-title">${esc(ev?.title || 'Event recap')}</h2>
      <section class="recap-detail-section">
        <h3>What happened</h3>
        <p class="recap-detail-summary">${esc(data.summary)}</p>
      </section>
      ${data.highlights.length ? `
        <section class="recap-detail-section">
          <h3>Highlights</h3>
          ${highlightsHtml}
        </section>` : ''}
      ${attendanceHtml ? `<div class="recap-detail-stats">${attendanceHtml}</div>` : ''}
    </div>`;
}

function injectRecapReadModal() {
  if (document.getElementById('club-recap-modal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="club-recap-modal" id="club-recap-modal" role="dialog" aria-modal="true" aria-labelledby="club-recap-modal-title" hidden>
      <div class="club-recap-modal-backdrop" data-close-recap></div>
      <div class="club-recap-modal-panel club-recap-modal-panel--rich">
        <button type="button" class="club-recap-modal-close" data-close-recap aria-label="Close recap">✕</button>
        <div id="club-recap-modal-content"></div>
      </div>
    </div>`;
  document.body.appendChild(el.firstElementChild);

  const modal = document.getElementById('club-recap-modal');
  modal?.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-recap]')) closeRecapReadModal();
  });
  if (!window.__clubRecapModalEscWired) {
    window.__clubRecapModalEscWired = true;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeRecapReadModal();
    });
  }
}

function openRecapReadModal(ev, recap, club) {
  injectRecapReadModal();
  const modal = document.getElementById('club-recap-modal');
  const content = document.getElementById('club-recap-modal-content');
  if (!modal || !content) return;

  content.innerHTML = buildRecapModalHtml(recap, ev, club);
  modal.hidden = false;
  document.documentElement.classList.add('club-recap-modal-open');
  document.body.classList.add('club-recap-modal-open');
  modal.querySelector('.club-recap-modal-close')?.focus();
}

function closeRecapReadModal() {
  const modal = document.getElementById('club-recap-modal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.documentElement.classList.remove('club-recap-modal-open');
  document.body.classList.remove('club-recap-modal-open');
  if (!document.getElementById('club-recap-form-modal')?.classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

function hasRecaps(pastEvents) {
  return pastEvents.some((ev) => getRecapBody(getRecapForEvent(ev)));
}

function getEventsNeedingRecap(pastEvents) {
  return pastEvents.filter((ev) => !getRecapBody(getRecapForEvent(ev)));
}

function renderRecapCard(ev, club) {
  const recap = getRecapForEvent(ev);
  const body = getRecapBody(recap);
  if (!body) return '';
  const summaryLimit = 100;
  const summaryText = body.length > summaryLimit
    ? `${body.slice(0, summaryLimit).trim()}…`
    : body;
  const dateLabel = formatEventDate(ev);
  const attendance = getRecapAttendance(recap);
  return `
    <div class="cr-card-wrap">
      <button type="button" class="cr-card" data-recap-event="${esc(ev.id)}">
        <div class="cr-detail cr-detail--card">
          <p class="cr-eyebrow">Event recap${dateLabel ? ` · ${esc(dateLabel)}` : ''}</p>
          <h3 class="cr-title">${esc(ev.title)}</h3>
          <p class="cr-summary">${esc(summaryText)}</p>
          <div class="cr-footer">
            ${attendance ? `<span class="cr-attendance">${esc(attendance)}</span>` : '<span></span>'}
            <span class="cr-read-link">Read recap →</span>
          </div>
        </div>
      </button>
    </div>`;
}

function renderEmpty(hidden) {
  return `
    <p class="cr-empty"${hidden ? ' hidden' : ''}>
      <img src="/assets/images/club_details/icons/forbidden.png" alt="" class="cr-empty-icon" width="56" height="56" decoding="async">
      <span>No recaps listed for past events.</span>
    </p>`;
}

function renderOptions(pastEvents) {
  const available = getEventsNeedingRecap(pastEvents);
  if (!available.length) {
    return '<option value="">No past events available for a new recap</option>';
  }
  return available.map((ev) => `
    <option value="${esc(ev.id)}">${esc(ev.title)} — ${esc(formatEventDate(ev))}</option>
  `).join('');
}

function injectFormModal(club, pastEvents, canPost) {
  if (document.getElementById('club-recap-form-modal')) return;
  const disabled = canPost ? '' : 'disabled';
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="cr-modal" id="club-recap-form-modal" aria-hidden="true">
      <div class="cr-modal-card" role="dialog" aria-modal="true" aria-labelledby="club-recap-form-title">
        <div class="cr-modal-head">
          <h3 id="club-recap-form-title">Post Event Recap</h3>
          <button type="button" class="cr-modal-close" data-close-recap-form aria-label="Close">✕</button>
        </div>
        <form class="cr-form" id="club-recap-form" novalidate>
          <p class="cr-form-msg" id="club-recap-msg" hidden role="alert"></p>
          <label><span>Past event *</span>
            <select id="club-recap-event" required ${disabled}>${renderOptions(pastEvents)}</select>
          </label>
          <label><span>Attendance *</span>
            <input type="number" id="club-recap-attendance" required min="1" max="999" placeholder="12" ${disabled}>
          </label>
          <label><span>What happened *</span>
            <textarea id="club-recap-summary" required minlength="20" rows="4" placeholder="Describe the session." ${disabled}></textarea>
          </label>
          <label><span>Highlights *</span>
            <textarea id="club-recap-highlights" required minlength="10" rows="3" placeholder="One highlight per line" ${disabled}></textarea>
          </label>
          <button type="submit" class="cr-submit" id="club-recap-submit" ${disabled}>Post recap</button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(el.firstElementChild);
  const modal = document.getElementById('club-recap-form-modal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeForm();
  });
  modal?.querySelector('[data-close-recap-form]')?.addEventListener('click', closeForm);
}

function openForm() {
  const modal = document.getElementById('club-recap-form-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('club-recap-form-open');
  document.body.classList.add('club-recap-form-open');
  document.body.style.overflow = 'hidden';
}

function closeForm() {
  const modal = document.getElementById('club-recap-form-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('club-recap-form-open');
  document.body.classList.remove('club-recap-form-open');
  if (!document.getElementById('club-recap-modal') || document.getElementById('club-recap-modal').hidden) {
    document.body.style.overflow = '';
  }
  document.getElementById('club-recap-form')?.reset();
}

function refreshGrid(block, pastEvents, club) {
  const grid = block.querySelector('#cr-grid');
  if (!grid) return;
  const cards = pastEvents.map((ev) => renderRecapCard(ev, club)).filter(Boolean).join('');
  const empty = grid.querySelector('.cr-empty');
  grid.querySelectorAll('.cr-card-wrap').forEach((n) => n.remove());
  if (cards) {
    empty?.insertAdjacentHTML('beforebegin', cards);
    if (empty) empty.hidden = true;
  } else if (empty) {
    empty.hidden = false;
  }
  wireReadCards(block, pastEvents, club);
}

function wireReadCards(block, pastEvents, club) {
  injectRecapReadModal();
  block.querySelectorAll('[data-recap-event]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ev = pastEvents.find((item) => item.id === btn.dataset.recapEvent);
      if (!ev) return;
      const recap = getRecapForEvent(ev);
      if (!getRecapBody(recap)) return;
      openRecapReadModal(ev, recap, club);
    });
  });
}

function wireForm(block, club, pastEvents) {
  const form = document.getElementById('club-recap-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = document.getElementById('club-recap-msg');
    const showMsg = (text, ok) => {
      if (!msg) return;
      msg.hidden = !text;
      msg.textContent = text || '';
      msg.className = ok ? 'cr-form-msg cr-form-msg--ok' : 'cr-form-msg cr-form-msg--err';
    };
    if (!getAuth().isAuthenticated()) {
      window.location.href = getAuth().loginUrlWithNext?.() || '/login';
      return;
    }
    if (!canPostRecapForClub(club.id)) {
      showMsg('Only club admins can post recaps.', false);
      return;
    }
    const eventId = document.getElementById('club-recap-event')?.value;
    const summary = document.getElementById('club-recap-summary')?.value?.trim();
    const highlightsRaw = document.getElementById('club-recap-highlights')?.value?.trim();
    const attendanceCount = parseInt(document.getElementById('club-recap-attendance')?.value, 10);
    const ev = pastEvents.find((item) => item.id === eventId);
    if (!ev || !isEventPast(ev)) {
      showMsg('Please select a valid past event.', false);
      return;
    }
    const highlights = (highlightsRaw || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (!summary || summary.length < 20 || !highlights.length || !Number.isFinite(attendanceCount)) {
      showMsg('Fill in all required fields.', false);
      return;
    }
    window.AdobeUserFeatures?.setEventRecap?.(ev.id, {
      summary,
      highlights,
      attendanceCount,
      attendance: `${attendanceCount} members`,
    }, { title: ev.title, clubId: club.id, clubName: club.name });
    refreshGrid(block, pastEvents, club);
    const select = document.getElementById('club-recap-event');
    if (select) select.innerHTML = renderOptions(pastEvents);
    const cta = block.querySelector('#cr-cta');
    if (cta) {
      const hasWork = getEventsNeedingRecap(pastEvents).length > 0;
      cta.disabled = !hasWork;
    }
    showMsg('Recap posted — thanks for sharing!', true);
    form.reset();
    window.setTimeout(closeForm, 1000);
  });
}

export default async function decorate(block) {
  block.innerHTML = '';
  await loadClubScripts();

  let ctx;
  try {
    ctx = await resolveClubContext();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[club-recaps]', err);
    return;
  }
  if (ctx.error) return;

  const { club, events } = ctx;
  const pastEvents = getPastClubEvents(club, events);
  const hasAnyRecaps = hasRecaps(pastEvents);
  const showCta = canPostRecapForClub(club.id);
  const hasWork = getEventsNeedingRecap(pastEvents).length > 0;
  const canPost = showCta && pastEvents.length > 0 && hasWork;

  block.innerHTML = `
    <div class="club-section-inner" id="club-recaps">
      <h2 class="club-section-title">Highlights from recent sessions</h2>
      <div class="cr-panel">
        <div class="cr-grid${hasAnyRecaps ? '' : ' is-empty'}" id="cr-grid">
          ${pastEvents.map((ev) => renderRecapCard(ev, club)).filter(Boolean).join('')}
          ${renderEmpty(hasAnyRecaps)}
        </div>
        ${showCta ? `
          <div class="cr-foot">
            <button type="button" class="cr-cta${hasWork ? ' cr-cta--active' : ''}" id="cr-cta"${hasWork ? '' : ' disabled'}>Post a recap</button>
          </div>` : ''}
      </div>
    </div>`;

  injectFormModal(club, pastEvents, canPost);
  wireReadCards(block, pastEvents, club);
  wireForm(block, club, pastEvents);
  block.querySelector('#cr-cta')?.addEventListener('click', () => {
    if (block.querySelector('#cr-cta')?.disabled) return;
    openForm();
  });

  if (window.location.hash === '#club-recaps') {
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
