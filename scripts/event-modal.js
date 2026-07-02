/**
 * event-modal.js — Shared event detail modal (events page + club detail page)
 */
'use strict';

window.AdobeEventModal = (function () {
  let modalStylesPromise = null;

  function loadModalStyles() {
    if (modalStylesPromise) return modalStylesPromise;
    const href = `${window.hlx?.codeBasePath || ''}/styles/event-modal.css`;
    const existing = document.querySelector('link[data-ev-modal-css]');
    if (existing) {
      modalStylesPromise = Promise.resolve();
      return modalStylesPromise;
    }
    modalStylesPromise = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.evModalCss = '1';
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.append(link);
    });
    return modalStylesPromise;
  }

  const IMAGE_BASE = '/assets/images/events/';
  const IMAGE_BASES = {
    clubs: '/assets/images/clubs/',
    events: '/assets/images/events/',
    index: '/assets/images/index/',
  };
  const EVENT_IMAGE_OPTIONS = [
    { value: 'events/evt-hero1.avif' },
    { value: 'events/evt-hero2.avif' },
    { value: 'events/evt-hero3.avif' },
    { value: 'events/evt-hero4.avif' },
    { value: 'events/evt-hero5.avif' },
    { value: 'events/evt-hero6.avif' },
    { value: 'events/evt-hero7.avif' },
    { value: 'events/evt-hero8.avif' },
    { value: 'events/evt-hero9.avif' },
    { value: 'events/evt-hero11.avif' },
    { value: 'clubs/adobe-lens.avif' },
    { value: 'clubs/adobe-creatives.avif' },
    { value: 'clubs/dev-guild.avif' },
    { value: 'clubs/sportzone.avif' },
    { value: 'clubs/readers.avif' },
    { value: 'clubs/games.avif' },
    { value: 'clubs/green-adobe.avif' },
    { value: 'clubs/volunteer.avif' },
    { value: 'clubs/wellbeing.avif' },
    { value: 'clubs/food.avif' },
  ];
  const ASSET_FALLBACK_POOL = EVENT_IMAGE_OPTIONS.map(opt => {
    const [baseKey, ...rest] = opt.value.split('/');
    return `${IMAGE_BASES[baseKey] || IMAGE_BASE}${rest.join('/')}`;
  });
  const MONTH_INDEX = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

  let allClubs = [];
  let allEvents = [];
  let clubContext = null;
  let onStateChange = null;
  let activeOpenChange = null;
  let canPostRecapFn = null;
  let onRecapThisEventFn = null;

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
      loginUrlWithNext: () => `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`)}`,
      redirectToLogin() {
        window.location.href = this.loginUrlWithNext();
      },
      isEventRsvped: () => false,
      isClubJoined: () => false,
      toggleEventRsvp: () => false,
    };
  }

  function parseEventDate(ev) {
    if (!ev?.month || !ev?.day || ev.day === '—') return null;
    const month = MONTH_INDEX[String(ev.month).toUpperCase()];
    const day = parseInt(ev.day, 10);
    if (month == null || Number.isNaN(day)) return null;
    return new Date(new Date().getFullYear(), month, day);
  }

  function isUpcoming(ev) {
    if (window.AdobeUserFeatures?.isEventUpcoming) {
      return window.AdobeUserFeatures.isEventUpcoming(ev);
    }
    const dt = parseEventDate(ev);
    if (!dt) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(dt);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay >= today;
  }

  function isPast(ev) {
    if (window.AdobeUserFeatures?.isEventPast) {
      return window.AdobeUserFeatures.isEventPast(ev);
    }
    return !isUpcoming(ev);
  }

  function getEventClub(ev) {
    if (!ev) return null;
    if (ev.clubId) {
      const byId = allClubs.find(c => c.id === ev.clubId);
      if (byId) return byId;
    }
    const eventClub = String(ev.club || '').toLowerCase().trim();
    return allClubs.find(c => {
      const name = String(c.name || '').toLowerCase();
      return eventClub === name
        || eventClub === `${name} club`
        || eventClub.includes(name)
        || name.includes(eventClub.split(' ')[0]);
    }) || null;
  }

  function isMembersOnlyEvent(ev) {
    return Boolean(ev?.membersOnly);
  }

  function canRsvpToEvent(ev) {
    if (clubContext && !getAuth().isClubJoined(clubContext.id)) return false;
    if (!isMembersOnlyEvent(ev)) return true;
    const club = getEventClub(ev);
    if (!club?.id) return true;
    return getAuth().isClubJoined(club.id);
  }

  function isEventEligible(ev) {
    const auth = getAuth();
    if (auth.isEventRsvped?.(ev?.id)) return true;

    const upcoming = window.AdobeUserFeatures?.isEventUpcoming
      ? window.AdobeUserFeatures.isEventUpcoming(ev)
      : true;
    if (upcoming && window.AdobeEventSeats?.isFull?.(ev)) return false;

    if (!auth.isAuthenticated?.()) {
      return !isMembersOnlyEvent(ev);
    }
    return canRsvpToEvent(ev);
  }

  function getEventActionState(ev) {
    const rsvped = getAuth().isEventRsvped(ev.id);
    if (rsvped) {
      return { mode: 'rsvp', label: "RSVP'd", joined: true };
    }
    if (clubContext && !getAuth().isClubJoined(clubContext.id)) {
      return { mode: 'join-club', label: 'Join club', joined: false, club: clubContext };
    }
    if (isMembersOnlyEvent(ev) && !canRsvpToEvent(ev)) {
      return { mode: 'join-club', label: 'Join club', joined: false, club: getEventClub(ev) };
    }
    if (window.AdobeEventSeats?.isFull?.(ev)) {
      return { mode: 'seats-full', label: 'Seats full', joined: false, disabled: true };
    }
    return { mode: 'rsvp', label: 'RSVP', joined: false };
  }

  function getEventRecap(ev) {
    return window.AdobeUserFeatures?.getEventRecap?.(ev.id, ev) || null;
  }

  function hasEventRecap(ev) {
    const recap = getEventRecap(ev);
    if (!recap) return false;
    const uf = window.AdobeUserFeatures;
    const summary = uf?.normalizeEventRecap
      ? uf.normalizeEventRecap(recap).summary
      : (typeof recap === 'string' ? recap : (recap.summary || recap.body));
    return Boolean(summary);
  }

  function getEventOrganizerEmail(ev) {
    const club = getEventClub(ev);
    const clubId = ev.clubId || club?.id;
    const contacts = window.AdobeClubMeta?.organizerContact || {};
    return contacts[clubId] || contacts.default || '';
  }

  function assetHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function pickFallbackImage(seed = '') {
    if (!ASSET_FALLBACK_POOL.length) return `${IMAGE_BASE}evt-hero1.avif`;
    return ASSET_FALLBACK_POOL[assetHash(String(seed)) % ASSET_FALLBACK_POOL.length];
  }

  function getEventImageSrc(ev) {
    if (ev?.imagePath) {
      const [baseKey, ...rest] = String(ev.imagePath).split('/');
      const file = rest.join('/');
      if (IMAGE_BASES[baseKey] && file) return `${IMAGE_BASES[baseKey]}${file}`;
    }
    if (ev?.id) return `${IMAGE_BASE}${ev.id}.avif`;
    return pickFallbackImage(ev?.id || ev?.title || 'event');
  }

  function wireImageFallback(img, seed = '') {
    if (!img || img.dataset.fallbackWired) return;
    img.dataset.fallbackWired = '1';
    let attempts = 0;
    img.addEventListener('error', () => {
      attempts += 1;
      if (attempts > 6) {
        img.onerror = null;
        return;
      }
      img.src = pickFallbackImage(`${seed || img.dataset.evId || 'event'}-${attempts}`);
    });
  }

  function formatEventMonthDay(ev) {
    if (!ev?.month || !ev?.day) return '';
    const month = String(ev.month).slice(0, 1) + String(ev.month).slice(1).toLowerCase();
    return `${month} ${ev.day}`;
  }

  function buildEventMetaGrid(ev) {
    const accessLabel = isMembersOnlyEvent(ev) ? 'Members only' : 'Open to all';
    const spotsLabel = ev.spotsLeft == null
      ? ''
      : Number(ev.spotsLeft) > 0
        ? `${ev.spotsLeft} spot${Number(ev.spotsLeft) === 1 ? '' : 's'} left`
        : 'Fully booked';

    const iconCal = `<svg class="ev-modal-meta-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    const iconPin = `<svg class="ev-modal-meta-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
    const iconGroup = `<svg class="ev-modal-meta-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

    const dateTimeParts = [formatEventMonthDay(ev), ev.time].filter(Boolean);
    const locationParts = [ev.location, ev.type].filter(Boolean);

    const rows = [];

    if (dateTimeParts.length) {
      rows.push(`
        <div class="ev-modal-meta-row">
          <span class="ev-modal-meta-row-main">
            ${iconCal}
            <span>${esc(dateTimeParts.join(' · '))}</span>
          </span>
        </div>
      `);
    }

    if (locationParts.length) {
      rows.push(`
        <div class="ev-modal-meta-row">
          <span class="ev-modal-meta-row-main">
            ${iconPin}
            <span>${esc(locationParts.join(' · '))}</span>
          </span>
        </div>
      `);
    }

    rows.push(`
      <div class="ev-modal-meta-row ev-modal-meta-row--split">
        <span class="ev-modal-meta-row-main">
          ${iconGroup}
          <span>${esc(accessLabel)}</span>
        </span>
        ${spotsLabel ? `<span class="ev-modal-meta-row-aside">${esc(spotsLabel)}</span>` : ''}
      </div>
    `);

    return rows.join('');
  }

  function injectModal() {
    loadModalStyles();
    if (document.getElementById('ev-modal-overlay')) return;
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="ev-modal-overlay" id="ev-modal-overlay" role="dialog" aria-modal="true" aria-label="Event details" hidden>
        <div class="ev-modal-glass" id="ev-modal-glass" tabindex="-1">
          <button class="ev-modal-close" id="ev-modal-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div class="ev-modal-img-wrap" id="ev-modal-img-wrap">
            <img class="ev-modal-img" id="ev-modal-img" src="" alt="" />
            <div class="ev-modal-date-badge" id="ev-modal-date"></div>
          </div>
          <div class="ev-modal-body">
            <div class="ev-modal-club" id="ev-modal-club"></div>
            <h2 class="ev-modal-title" id="ev-modal-title"></h2>
            <p class="ev-modal-desc" id="ev-modal-desc"></p>
            <div class="ev-modal-meta-grid" id="ev-modal-meta"></div>
            <button class="ev-modal-rsvp" id="ev-modal-rsvp">RSVP for this event</button>
            <p class="ev-modal-rsvp-note" id="ev-modal-rsvp-note" hidden>An RSVP is required to attend — it reserves and verifies your spot for this event.</p>
            <button type="button" class="ev-modal-recap-admin" id="ev-modal-recap-admin" hidden>Recap this event</button>
            <div class="ev-modal-extras" id="ev-modal-extras"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el.firstElementChild);

    document.getElementById('ev-modal-close').addEventListener('click', close);
    document.getElementById('ev-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const overlay = document.getElementById('ev-modal-overlay');
      if (overlay && !overlay.hidden) close();
    });
  }

  function refreshModalRsvp(ev) {
    const modalRsvp = document.getElementById('ev-modal-rsvp');
    const rsvpNote = document.getElementById('ev-modal-rsvp-note');
    if (rsvpNote) rsvpNote.hidden = true;
    if (!modalRsvp || isPast(ev)) return;

    const state = getEventActionState(ev);
    modalRsvp.hidden = false;
    modalRsvp.disabled = false;
    if (rsvpNote) rsvpNote.hidden = false;
    modalRsvp.classList.remove('ev-modal-recap--muted', 'is-seats-full');
    modalRsvp.classList.toggle('is-joined', state.joined);
    modalRsvp.classList.toggle('is-join-club', state.mode === 'join-club');
    modalRsvp.dataset.action = state.mode;

    if (state.mode === 'seats-full') {
      modalRsvp.textContent = 'Seats full';
      modalRsvp.disabled = true;
      modalRsvp.classList.add('is-seats-full');
      modalRsvp.onclick = null;
      if (rsvpNote) rsvpNote.hidden = true;
      return;
    }

    if (state.mode === 'join-club') {
      modalRsvp.textContent = 'Join club to RSVP';
    } else {
      modalRsvp.textContent = state.joined ? "RSVP'd" : 'RSVP for this event';
    }

    modalRsvp.onclick = () => handleRsvpClick(ev, modalRsvp);
  }

  function renderEventModalExtras(ev, { recapOnly = false } = {}) {
    const container = document.getElementById('ev-modal-extras');
    const uf = window.AdobeUserFeatures;
    if (!container || !uf) return;

    const auth = getAuth();
    const loggedIn = auth.isAuthenticated();
    const recap = uf.getEventRecap(ev.id, ev);
    const club = getEventClub(ev);
    const organizerEmail = getEventOrganizerEmail(ev);

    const SLACK_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.04 15.17a1.85 1.85 0 1 1-1.85-1.85h1.85v1.85Zm.93 0a1.85 1.85 0 0 1 3.7 0v4.63a1.85 1.85 0 1 1-3.7 0v-4.63Zm1.85-7.43a1.85 1.85 0 1 1 1.85-1.85v1.85h-1.85Zm0 .93a1.85 1.85 0 0 1 0 3.7H7.19a1.85 1.85 0 1 1 0-3.7h4.63Zm7.42 1.85a1.85 1.85 0 1 1 1.85 1.85h-1.85V10.5Zm-.93 0a1.85 1.85 0 0 1-3.7 0V5.87a1.85 1.85 0 1 1 3.7 0v4.63Zm-1.85 7.42a1.85 1.85 0 1 1-1.85 1.85v-1.85h1.85Zm0-.92a1.85 1.85 0 0 1 0-3.7h4.63a1.85 1.85 0 1 1 0 3.7h-4.63Z"/></svg>';
    const slackBlock = club?.slackUrl ? `
      <div class="uf-ev-block uf-ev-slack">
        <a class="slack-link" href="${uf.esc(club.slackUrl)}" target="_blank" rel="noopener noreferrer">${SLACK_ICON}Discuss on Slack${club.slackChannel ? ` <span class="slack-channel">${uf.esc(club.slackChannel)}</span>` : ''}</a>
      </div>
    ` : '';

    if (recapOnly) {
      const recapBlock = recap && uf.buildRecapHtml ? `
        <div class="uf-ev-block uf-ev-recap-block">
          ${uf.buildRecapHtml(recap, ev, { clubName: club?.name || ev.club, dateLabel: `${ev.month} ${ev.day}` })}
        </div>
      ` : '';
      const html = `${recapBlock}${slackBlock}`.trim();
      container.innerHTML = html;
      container.hidden = !html;
      return;
    }

    let membersOnlyBlock = '';
    if (clubContext && !auth.isClubJoined(clubContext.id)) {
      membersOnlyBlock = `
        <div class="uf-ev-block uf-ev-members-only">
          <h4>Club members only</h4>
          <p>Join ${uf.esc(clubContext.name)} to RSVP for events from this club.</p>
        </div>
      `;
    } else if (isMembersOnlyEvent(ev) && !canRsvpToEvent(ev)) {
      membersOnlyBlock = `
        <div class="uf-ev-block uf-ev-members-only">
          <h4>Members-only event</h4>
          <p>This session is reserved for ${uf.esc(club?.name || ev.club)} members. Join the club to unlock RSVP.</p>
        </div>
      `;
    } else if (isMembersOnlyEvent(ev)) {
      membersOnlyBlock = `
        <div class="uf-ev-block uf-ev-members-only uf-ev-members-only--unlocked">
          <p class="uf-ev-note-hint">Members-only · You have access as a club member.</p>
        </div>
      `;
    }

    const recapBlock = recap && uf.buildRecapHtml ? `
      <div class="uf-ev-block uf-ev-recap-block">
        ${uf.buildRecapHtml(recap, ev, { clubName: club?.name || ev.club, dateLabel: `${ev.month} ${ev.day}` })}
      </div>
    ` : '';

    const contactBlock = loggedIn && organizerEmail ? `
      <div class="uf-ev-block uf-ev-contact">
        <h4>Organizer contact</h4>
        <p>Need to coordinate with the team about this event?</p>
        <a class="uf-ev-contact-link" href="mailto:${uf.esc(organizerEmail)}">${uf.esc(organizerEmail)}</a>
      </div>
    ` : '';

    const html = `${slackBlock}${membersOnlyBlock}${recapBlock}${contactBlock}`.trim();
    container.innerHTML = html;
    container.hidden = !html;
  }

  function notifyStateChange(ev) {
    activeOpenChange?.(ev);
    if (typeof onStateChange === 'function') onStateChange(ev);
  }

  function handleRsvpClick(ev, btn) {
    if (!getAuth().isAuthenticated()) {
      getAuth().redirectToLogin?.() || (window.location.href = getAuth().loginUrlWithNext());
      return false;
    }

    const state = getEventActionState(ev);
    if (state.mode === 'join-club') {
      const club = state.club || getEventClub(ev) || clubContext;
      if (!club) return false;
      const joinedClub = window.AdobeJoinModal?.toggleClubJoinWithModal(club, { events: allEvents });
      if (joinedClub === null) return false;
      if (joinedClub) {
        refreshModalRsvp(ev);
        renderEventModalExtras(ev);
        notifyStateChange(ev);
      }
      return joinedClub;
    }

    const wasRsvped = getAuth().isEventRsvped(ev.id);
    if (!wasRsvped && window.AdobeEventSeats?.isFull?.(ev)) {
      return false;
    }

    getAuth().toggleEventRsvp(ev.id);
    const nowRsvped = getAuth().isEventRsvped(ev.id);
    if (window.AdobeEventSeats) {
      if (nowRsvped && !wasRsvped) window.AdobeEventSeats.reserve(ev.id, ev);
      else if (!nowRsvped && wasRsvped) window.AdobeEventSeats.release(ev.id);
    }
    refreshModalRsvp(ev);
    notifyStateChange(ev);
    return nowRsvped;
  }

  function setRecapOnlyLayout(active) {
    const glass = document.getElementById('ev-modal-glass');
    glass?.classList.toggle('ev-modal-glass--recap-only', active);
    ['ev-modal-img-wrap', 'ev-modal-club', 'ev-modal-title', 'ev-modal-desc', 'ev-modal-meta'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = active;
    });
  }

  async function open(ev, { scrollToRecap = false, recapOnly = false, onStateChange: localChange } = {}) {
    if (!ev) return;
    await loadModalStyles();
    injectModal();

    activeOpenChange = typeof localChange === 'function' ? localChange : null;

    const overlay = document.getElementById('ev-modal-overlay');
    const glass = document.getElementById('ev-modal-glass');
    if (!overlay || !glass) return;

    const past = isPast(ev);
    const recapOnlyView = Boolean(recapOnly && past && hasEventRecap(ev));

    setRecapOnlyLayout(recapOnlyView);

    if (!recapOnlyView) {
      document.getElementById('ev-modal-img').src = getEventImageSrc(ev);
      document.getElementById('ev-modal-img').alt = ev.title;
      const modalImg = document.getElementById('ev-modal-img');
      if (modalImg) {
        modalImg.dataset.evId = ev.id;
        delete modalImg.dataset.fallbackWired;
        wireImageFallback(modalImg, ev.id);
      }
      document.getElementById('ev-modal-date').textContent = `${ev.day} ${ev.month}`;
      document.getElementById('ev-modal-club').textContent = ev.club;
      document.getElementById('ev-modal-title').textContent = ev.title;

      const descEl = document.getElementById('ev-modal-desc');
      if (descEl) descEl.textContent = ev.desc || '';

      document.getElementById('ev-modal-meta').innerHTML = buildEventMetaGrid(ev);
    }

    const modalRsvp = document.getElementById('ev-modal-rsvp');
    const adminRecapBtn = document.getElementById('ev-modal-recap-admin');
    if (adminRecapBtn) {
      adminRecapBtn.hidden = true;
      adminRecapBtn.onclick = null;
    }

    if (recapOnlyView) {
      if (modalRsvp) modalRsvp.hidden = true;
      renderEventModalExtras(ev, { recapOnly: true });
    } else {
      if (modalRsvp) {
        if (past) {
          modalRsvp.hidden = false;
          modalRsvp.classList.remove('is-joined', 'is-join-club');
          const recapReady = hasEventRecap(ev);
          const showAdminRecap = typeof canPostRecapFn === 'function' && canPostRecapFn(ev);

          if (recapReady) {
            modalRsvp.textContent = 'Read recap →';
            modalRsvp.classList.remove('ev-modal-recap--muted');
            modalRsvp.disabled = false;
            modalRsvp.onclick = () => {
              document.querySelector('#ev-modal-extras .uf-ev-recap-block, #ev-modal-extras .recap-detail')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
          } else {
            modalRsvp.textContent = 'Recap coming soon';
            modalRsvp.classList.add('ev-modal-recap--muted');
            modalRsvp.disabled = true;
            modalRsvp.onclick = null;

            if (showAdminRecap && adminRecapBtn) {
              adminRecapBtn.hidden = false;
              adminRecapBtn.onclick = () => {
                close();
                onRecapThisEventFn?.(ev);
              };
            }
          }
        } else {
          refreshModalRsvp(ev);
        }
      }
      renderEventModalExtras(ev);
    }

    glass.style.scrollBehavior = 'auto';
    glass.scrollTo(0, 0);
    document.documentElement.classList.add('ev-modal-open');
    document.body.classList.add('ev-modal-open');
    document.body.style.overflow = 'hidden';
    overlay.classList.toggle('ev-modal-overlay--recap', recapOnlyView);
    overlay.setAttribute('aria-label', recapOnlyView ? 'Event recap' : 'Event details');
    overlay.hidden = false;
    overlay.classList.remove('open');
    void overlay.offsetWidth;
    overlay.classList.add('open');
    requestAnimationFrame(() => {
      glass.scrollTo(0, 0);
      glass.style.scrollBehavior = 'smooth';
    });
    glass.focus();

    if (!recapOnlyView && scrollToRecap) {
      requestAnimationFrame(() => {
        document.querySelector('#ev-modal-extras .uf-ev-recap-block, #ev-modal-extras .recap-detail')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function close() {
    activeOpenChange = null;
    const overlay = document.getElementById('ev-modal-overlay');
    const glass = document.getElementById('ev-modal-glass');
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove('open', 'ev-modal-overlay--recap');
    window.setTimeout(() => {
      if (overlay && !overlay.classList.contains('open')) {
        overlay.hidden = true;
      }
    }, 300);
    if (glass) {
      glass.style.scrollBehavior = 'auto';
      glass.scrollTo(0, 0);
      glass.style.scrollBehavior = 'smooth';
    }
    document.documentElement.classList.remove('ev-modal-open');
    document.body.classList.remove('ev-modal-open');
    const recapFormOpen = document.getElementById('club-recap-form-modal')?.classList.contains('open');
    const recapReadOpen = document.documentElement.classList.contains('club-recap-modal-open');
    if (!recapFormOpen && !recapReadOpen) {
      document.body.style.overflow = '';
    }
    if ((window.location.pathname || '').split('/').pop() === 'events.html') {
      window.AdobeBreadcrumbs?.reset?.();
    }
  }

  function applyActionState(button, ev) {
    if (!button || !ev) return;
    const state = getEventActionState(ev);
    const isFull = state.mode === 'seats-full';
    button.classList.toggle('is-joined', state.joined);
    button.classList.toggle('is-join-club', state.mode === 'join-club');
    button.classList.toggle('is-seats-full', isFull);
    button.disabled = Boolean(state.disabled || isFull);
    button.dataset.action = state.mode;
    if (state.club?.id) button.dataset.clubId = state.club.id;
    else button.removeAttribute('data-club-id');
    const textEl = button.querySelector('.ev-poster-action-text');
    if (textEl) textEl.textContent = state.label;
    else button.textContent = state.label;
  }

  function init({
    clubs = [],
    events = [],
    clubContext: context = null,
    onStateChange: changeHandler = null,
    canPostRecap = null,
    onRecapThisEvent = null,
  } = {}) {
    allClubs = clubs;
    allEvents = events;
    clubContext = context;
    onStateChange = changeHandler;
    canPostRecapFn = typeof canPostRecap === 'function' ? canPostRecap : null;
    onRecapThisEventFn = typeof onRecapThisEvent === 'function' ? onRecapThisEvent : null;
    injectModal();
  }

  function setEvents(events) {
    allEvents = events || [];
  }

  function setClubContext(context) {
    clubContext = context || null;
  }

  return {
    init,
    open,
    close,
    handleRsvpClick,
    applyActionState,
    getActionState: getEventActionState,
    canRsvpToEvent,
    isEventEligible,
    isMembersOnlyEvent,
    isPast,
    isUpcoming,
    getEventImageSrc,
    setEvents,
    setClubContext,
  };
}());
