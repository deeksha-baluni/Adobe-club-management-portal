import {
  esc,
  getAuth,
  redirectToLogin,
  getPastClubEvents,
  formatEventDate,
  canPostRecapForClub,
  isEventPast,
} from '../club-page.js';
import { cfg } from '../../lib/block-config.js';
import {
  buildRecapHtml,
  getRecapBody,
} from '../../lib/recap-html.js';

function getRecapForEvent(ev) {
  return window.AdobeUserFeatures?.getEventRecap?.(ev.id, ev)
    || getAuth().getEventRecap?.(ev.id, ev)
    || ev.recap
    || null;
}

function buildRecapModalHtml(recap, ev, club) {
  return buildRecapHtml(recap, ev, {
    clubName: club?.name || ev.club,
    dateLabel: formatEventDate(ev),
  });
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
  content.querySelector('.recap-detail-title')?.setAttribute('id', 'club-recap-modal-title');
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
  if (!getRecapBody(recap)) return '';
  return `
    <div class="club-recap-card-wrap">
      <button type="button" class="club-recap-card" data-recap-event="${esc(ev.id)}" aria-label="Read recap for ${esc(ev.title)}">
        ${buildRecapHtml(recap, ev, {
    card: true,
    showReadLink: true,
    dateLabel: formatEventDate(ev),
  })}
      </button>
    </div>`;
}

function renderEmpty(hidden) {
  return `
    <p class="club-recap-empty-state" id="club-recap-empty"${hidden ? ' hidden' : ''}>
      <img src="/assets/images/club_details/icons/forbidden.png" alt="" class="club-recap-empty-icon" width="56" height="56" decoding="async">
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
    <div class="club-recap-form-modal" id="club-recap-form-modal" aria-hidden="true">
      <div class="club-recap-form-card" role="dialog" aria-modal="true" aria-labelledby="club-recap-form-title">
        <div class="club-recap-form-head">
          <h3 id="club-recap-form-title">Post Event Recap</h3>
          <button type="button" class="club-recap-form-close" data-close-recap-form aria-label="Close">✕</button>
        </div>
        <form class="club-recap-form-fields" id="club-recap-form" novalidate>
          <p class="club-recap-form-msg" id="club-recap-msg" hidden role="alert"></p>
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
          <button type="submit" class="club-recap-form-submit" id="club-recap-submit" ${disabled}>Post recap</button>
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
  const grid = block.querySelector('#club-recap-grid');
  if (!grid) return;
  const cards = pastEvents.map((ev) => renderRecapCard(ev, club)).filter(Boolean).join('');
  const empty = grid.querySelector('.club-recap-empty-state');
  grid.querySelectorAll('.club-recap-card-wrap').forEach((n) => n.remove());
  if (cards) {
    empty?.insertAdjacentHTML('beforebegin', cards);
    if (empty) empty.hidden = true;
    grid.classList.remove('is-recap-empty');
  } else if (empty) {
    empty.hidden = false;
    grid.classList.add('is-recap-empty');
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
      msg.className = ok ? 'club-recap-form-msg club-recap-form-msg--ok' : 'club-recap-form-msg club-recap-form-msg--err';
    };
    if (!getAuth().isAuthenticated()) {
      redirectToLogin();
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
    const cta = block.querySelector('#club-recap-cta');
    if (cta) {
      const hasWork = getEventsNeedingRecap(pastEvents).length > 0;
      cta.disabled = !hasWork;
    }
    showMsg('Recap posted — thanks for sharing!', true);
    form.reset();
    window.setTimeout(closeForm, 1000);
  });
}

export function mountRecapsSection(block, ctx) {
  const { club, events, pageConfig = {} } = ctx;
  const pastEvents = getPastClubEvents(club, events);
  const hasAnyRecaps = hasRecaps(pastEvents);
  const showCta = canPostRecapForClub(club.id);
  const hasWork = getEventsNeedingRecap(pastEvents).length > 0;
  const canPost = showCta && pastEvents.length > 0 && hasWork;
  const title = cfg(pageConfig, 'section-recaps', 'Highlights from recent sessions');
  const recapCta = cfg(pageConfig, 'recap-cta', 'Post a recap');

  block.innerHTML = `
    <div class="club-section-inner" id="club-recaps">
      <h2 class="club-section-title">${esc(title)}</h2>
      <div class="club-recap-panel">
        <div class="club-recap-grid${hasAnyRecaps ? '' : ' is-recap-empty'}" id="club-recap-grid">
          ${pastEvents.map((ev) => renderRecapCard(ev, club)).filter(Boolean).join('')}
          ${renderEmpty(hasAnyRecaps)}
        </div>
        ${showCta ? `
          <div class="club-recap-foot">
            <button type="button" class="club-recap-cta${hasWork ? ' club-recap-cta--active' : ''}" id="club-recap-cta"${hasWork ? '' : ' disabled'}>${esc(recapCta)}</button>
          </div>` : ''}
      </div>
    </div>`;

  injectFormModal(club, pastEvents, canPost);
  wireReadCards(block, pastEvents, club);
  wireForm(block, club, pastEvents);
  block.querySelector('#club-recap-cta')?.addEventListener('click', () => {
    if (block.querySelector('#club-recap-cta')?.disabled) return;
    openForm();
  });
}

export function applyRecapsDeepLink(block) {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#club-recaps')) return;
  block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (hash === '#club-recaps-create') {
    openForm();
  }
}

export function scrollToRecapsSection(block) {
  applyRecapsDeepLink(block);
}
