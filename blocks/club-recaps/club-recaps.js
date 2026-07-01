/**
 * Club Recaps block — original highlights section.
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
    || null;
}

function hasRecapHighlights(pastEvents) {
  return (pastEvents || []).some((ev) => getRecapBody(getRecapForEvent(ev)));
}

function getEventsNeedingRecap(pastEvents) {
  return (pastEvents || []).filter((ev) => !getRecapBody(getRecapForEvent(ev)));
}

function renderRecapCards(pastEvents) {
  const items = pastEvents
    .map((ev) => ({ ev, recap: getRecapForEvent(ev) }))
    .filter((x) => getRecapBody(x.recap));
  if (!items.length) return '';
  return items.slice(0, 6).map(({ ev, recap }) => {
    const body = getRecapBody(recap);
    return `
      <div class="club-recap-card-wrap">
        <button type="button" class="club-recap-card" data-recap-event="${esc(ev.id)}" aria-label="Read recap for ${esc(ev.title)}">
          <p class="club-recap-card-title">${esc(ev.title)}</p>
          <p>${esc(body)}</p>
          <span class="club-recap-read">Read recap →</span>
        </button>
      </div>`;
  }).join('');
}

function renderRecapEmptyState(hidden = false) {
  return `
    <p class="club-recap-empty-state" id="club-recap-empty"${hidden ? ' hidden' : ''}>
      <img src="/assets/images/club_details/icons/forbidden.png" alt="" class="club-recap-empty-icon" width="56" height="56" decoding="async">
      <span>No recaps listed for past events.</span>
    </p>`;
}

function renderRecapFormOptions(pastEvents) {
  const available = pastEvents.filter((ev) => !getRecapBody(getRecapForEvent(ev)));
  if (!available.length) {
    return '<option value="">No past events available for a new recap</option>';
  }
  return available.map((ev) => `
    <option value="${esc(ev.id)}">${esc(ev.title)} — ${esc(formatEventDate(ev))}</option>
  `).join('');
}

function injectRecapFormModal(club, pastEvents, canPostRecap) {
  if (document.getElementById('club-recap-form-modal')) return;
  const disabled = canPostRecap ? '' : 'disabled';
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="ev-admin-modal" id="club-recap-form-modal" aria-hidden="true">
      <div class="ev-admin-modal-card" id="club-recap-form-modal-card" role="dialog" aria-modal="true" aria-labelledby="club-recap-form-title">
        <div class="ev-admin-head">
          <h3 class="ev-admin-title" id="club-recap-form-title">Post Event Recap</h3>
          <button type="button" class="ev-admin-close" data-close-recap-form aria-label="Close">✕</button>
        </div>
        <form class="ev-admin-form" id="club-recap-form" novalidate>
          <p class="ev-admin-form-error" id="club-recap-msg" hidden role="alert"></p>
          <p class="club-recap-form-note">Select a past ${esc(club.name)} event that still needs a recap.</p>
          <div class="ev-admin-grid">
            <label><span>Past event *</span>
              <select id="club-recap-event" required ${disabled}>${renderRecapFormOptions(pastEvents)}</select>
            </label>
            <label><span>Attendance *</span>
              <input type="number" id="club-recap-attendance" required min="1" max="999" placeholder="12" ${disabled}>
            </label>
          </div>
          <label><span>What happened *</span>
            <textarea id="club-recap-summary" required minlength="20" rows="4" placeholder="Describe the session." ${disabled}></textarea>
          </label>
          <label><span>Highlights *</span>
            <textarea id="club-recap-highlights" required minlength="10" rows="3" placeholder="One highlight per line" ${disabled}></textarea>
          </label>
          <button type="submit" class="ev-admin-submit" id="club-recap-submit" ${disabled}>Post recap</button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(el.firstElementChild);
  document.getElementById('club-recap-form-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'club-recap-form-modal') closeForm();
  });
  document.querySelector('[data-close-recap-form]')?.addEventListener('click', closeForm);
}

function openForm() {
  const modal = document.getElementById('club-recap-form-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeForm() {
  const modal = document.getElementById('club-recap-form-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.getElementById('club-recap-form')?.reset();
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
      msg.className = ok ? 'ev-admin-form-success' : 'ev-admin-form-error';
    };
    if (!canPostRecapForClub(club.id)) {
      showMsg('Only club admins can post recaps.', false);
      return;
    }
    const eventId = document.getElementById('club-recap-event')?.value;
    const summary = document.getElementById('club-recap-summary')?.value?.trim();
    const highlightsRaw = document.getElementById('club-recap-highlights')?.value?.trim();
    const attendanceCount = parseInt(document.getElementById('club-recap-attendance')?.value, 10);
    const ev = pastEvents.find((item) => item.id === eventId);
    if (!ev || !isEventPast(ev) || !summary || summary.length < 20) {
      showMsg('Fill in all required fields.', false);
      return;
    }
    const highlights = (highlightsRaw || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (!highlights.length || !Number.isFinite(attendanceCount)) {
      showMsg('Fill in all required fields.', false);
      return;
    }
    window.AdobeUserFeatures?.setEventRecap?.(ev.id, {
      summary,
      highlights,
      attendanceCount,
      attendance: `${attendanceCount} members`,
    }, { title: ev.title, clubId: club.id, clubName: club.name });
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
  const hasRecaps = hasRecapHighlights(pastEvents);
  const showRecapCta = canPostRecapForClub(club.id);
  const hasEventsToRecap = getEventsNeedingRecap(pastEvents).length > 0;
  const canPostRecap = showRecapCta && pastEvents.length > 0 && hasEventsToRecap;

  block.innerHTML = `
    <div class="club-detail-page">
      <section class="club-block" id="club-recaps">
        <h2 class="club-section-title">Highlights from recent sessions</h2>
        <div class="club-recap-panel">
          <div class="club-recap-grid${hasRecaps ? '' : ' is-recap-empty'}" id="club-recap-grid">
            ${renderRecapCards(pastEvents)}
            ${renderRecapEmptyState(hasRecaps)}
          </div>
          ${showRecapCta ? `
            <div class="club-recap-foot">
              <button type="button" class="club-recap-cta${hasEventsToRecap ? ' club-recap-cta--active' : ''}" id="club-recap-cta"${hasEventsToRecap ? '' : ' disabled'} aria-disabled="${hasEventsToRecap ? 'false' : 'true'}">Post a recap</button>
            </div>` : ''}
        </div>
      </section>
    </div>`;

  injectRecapFormModal(club, pastEvents, canPostRecap);
  wireForm(block, club, pastEvents);
  block.querySelector('#club-recap-cta')?.addEventListener('click', () => {
    if (block.querySelector('#club-recap-cta')?.disabled) return;
    openForm();
  });

  block.querySelector('#club-recap-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-recap-event]');
    if (!card) return;
    const ev = pastEvents.find((item) => item.id === card.dataset.recapEvent);
    const recap = ev ? getRecapForEvent(ev) : null;
    const body = getRecapBody(recap);
    if (body) window.alert(`${ev.title}\n\n${body}`);
  });

  if (window.location.hash === '#club-recaps') {
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
