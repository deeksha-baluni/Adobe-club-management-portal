/**
 * join-modal.js — Post-join confirmation modal
 */
'use strict';

(function () {
  let modalStylesPromise = null;

  function loadModalStyles() {
    if (modalStylesPromise) return modalStylesPromise;
    const href = `${window.hlx?.codeBasePath || ''}/styles/join-modal.css`;
    const existing = document.querySelector('link[data-join-modal-css]');
    if (existing) {
      modalStylesPromise = Promise.resolve();
      return modalStylesPromise;
    }
    modalStylesPromise = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.joinModalCss = '1';
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.append(link);
    });
    return modalStylesPromise;
  }

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
      loginUrlWithNext: () => '/login',
      isClubJoined: () => false,
      toggleClubJoin: () => false,
      getAdminOf: () => [],
    };
  }

  function getMeta() {
    return window.AdobeClubMeta || {};
  }

  function eventMatchesClub(ev, club) {
    if (!ev || !club) return false;
    if (ev.clubId && ev.clubId === club.id) return true;
    const eventClub = String(ev.club || '').toLowerCase().trim();
    const name = String(club.name || '').toLowerCase();
    return eventClub === name
      || eventClub === `${name} club`
      || eventClub.includes(name)
      || name.includes(eventClub);
  }

  function getCadenceLabel(clubId) {
    const cadences = getMeta().activityCadence?.[clubId] || {};
    const values = Object.values(cadences);
    if (!values.length) return 'regularly throughout the year';

    const weekly = values.filter(c => c === 'weekly').length;
    const biweekly = values.filter(c => c === 'biweekly').length;
    const monthly = values.filter(c => c === 'monthly').length;

    if (weekly >= 2) return 'about 3–4 times per month';
    if (weekly >= 1 || biweekly >= 2) return 'about 2 times per month';
    if (biweekly >= 1 || monthly >= 2) return 'about 1–2 times per month';
    return 'about once per month';
  }

  function buildModalContext(club, allEvents) {
    const meta = getMeta();
    const slack = meta.slack?.[club.id] || {};
    const clubEvents = (allEvents || []).filter(ev => eventMatchesClub(ev, club));
    const membersOnlyCount = clubEvents.filter(ev => ev.membersOnly).length;

    const channel = slack.channel || `club-${club.id}`;
    return {
      slackUrl: slack.url || `https://adobe.enterprise.slack.com/archives/${channel}`,
      slackLabel: slack.label || `#${channel}`,
      cadence: getCadenceLabel(club.id),
      membersOnlyCount,
      eventCount: clubEvents.length,
    };
  }

  function buildPerks(club, context) {
    const perks = [
      `You can now RSVP to ${club.name} events and get in-app club alerts`,
    ];

    if (context.membersOnlyCount > 0) {
      perks.push(`Members get early access to ${context.membersOnlyCount} members-only session${context.membersOnlyCount > 1 ? 's' : ''}`);
    } else {
      perks.push('RSVP reminders land in your notifications the day before an event');
    }

    perks.push(`Connect with the ${club.name} community and keep up with what's coming next`);

    return perks.slice(0, 3);
  }

  function injectModalShell() {
    if (document.getElementById('join-modal-overlay')) return;

    const el = document.createElement('div');
    el.innerHTML = `
      <div class="join-modal-overlay" id="join-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="join-modal-title" hidden>
        <div class="join-modal-panel">
          <div id="join-modal-content"></div>
        </div>
      </div>
    `;
    document.body.appendChild(el.firstElementChild);

    document.getElementById('join-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'join-modal-overlay') closeModal();
    });
    document.addEventListener('keydown', (e) => {
      const overlay = document.getElementById('join-modal-overlay');
      if (e.key === 'Escape' && overlay && !overlay.hidden) closeModal();
    });
  }

  function closeModal() {
    const overlay = document.getElementById('join-modal-overlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.documentElement.classList.remove('join-modal-open');
    document.body.classList.remove('join-modal-open');
    document.body.style.overflow = '';
  }

  function showJoinConfirmationModal(club, context) {
    if (!club) return;
    injectModalShell();

    const overlay = document.getElementById('join-modal-overlay');
    const content = document.getElementById('join-modal-content');
    if (!overlay || !content) return;

    const perks = buildPerks(club, context);
    const eventsUrl = `/events?club=${encodeURIComponent(club.id)}`;

    const render = () => {
      content.innerHTML = `
      <div class="join-modal-success">
        <span class="join-modal-check" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <h2 id="join-modal-title" class="join-modal-title">You're in!</h2>
        <p class="join-modal-subtitle">Welcome to ${esc(club.name)}</p>
      </div>

      <div class="join-modal-section">
        <h3 class="join-modal-section-title">What you unlock</h3>
        <ul class="join-modal-perks">
          ${perks.map(perk => `<li>${esc(perk)}</li>`).join('')}
        </ul>
      </div>

      <div class="join-modal-section">
        <h3 class="join-modal-section-title">Join the conversation</h3>
        <p class="join-modal-copy">Adobe Clubs handles discovery and logistics — Slack is where day-to-day discussion happens.</p>
      </div>

      <div class="join-modal-secondary-actions">
        <a href="${esc(context.slackUrl)}" class="join-modal-secondary-btn" target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
          Open ${esc(context.slackLabel)}
        </a>
        <a href="${esc(eventsUrl)}" class="join-modal-secondary-btn">View upcoming events</a>
      </div>

      <div class="join-modal-actions">
        <button type="button" class="join-modal-primary" id="join-modal-done">Got it</button>
      </div>
    `;

      overlay.hidden = false;
      document.documentElement.classList.add('join-modal-open');
      document.body.classList.add('join-modal-open');
      document.body.style.overflow = 'hidden';
      document.getElementById('join-modal-done')?.addEventListener('click', closeModal);
      document.getElementById('join-modal-done')?.focus();
    };

    loadModalStyles().then(render);
  }

  function toggleClubJoinWithModal(club, options = {}) {
    if (!club?.id) return false;

    const auth = getAuth();
    if (!auth.isAuthenticated?.()) {
      window.location.href = auth.loginUrlWithNext?.() || '/login';
      return null;
    }
    if (auth.getAdminOf?.().includes(club.id)) {
      return auth.isClubJoined?.(club.id);
    }

    const wasJoined = auth.isClubJoined?.(club.id);
    const joined = auth.toggleClubJoin(club.id, { events: options.events || [] });

    if (joined && !wasJoined) {
      const context = buildModalContext(club, options.events || []);
      showJoinConfirmationModal(club, context);
    }

    return joined;
  }

  window.AdobeJoinModal = {
    showJoinConfirmationModal,
    toggleClubJoinWithModal,
    buildModalContext,
    close: closeModal,
  };
})();
