import { formatMemberLabel } from './club-card.js';

function auth() {
  return window.AdobeClubsAuth || null;
}

function mergedEvents() {
  return window.__adobeClubEventsForTiming?.() || window.__adobeClubEvents || [];
}

function clubsForDisplay() {
  return window.__adobeClubClubs || [];
}

function clubJoinLabel(clubId, joinLabel = 'Join', joinedLabel = 'Joined') {
  return auth()?.isClubJoined?.(clubId) ? joinedLabel : joinLabel;
}

function syncClubJoinButton(btn, clubId, labels) {
  if (!btn || !clubId) return;
  const joined = auth()?.isClubJoined?.(clubId);
  btn.classList.toggle('is-joined', joined);
  btn.textContent = clubJoinLabel(clubId, labels?.join, labels?.joined);
  btn.disabled = auth()?.getAdminOf?.().includes(clubId);
}

export function wireClubJoinButtons(root, labels = {}) {
  (root || document).querySelectorAll('.cb-poster-join[data-club-id]').forEach((btn) => {
    if (btn.dataset.cardsWired === '1') return;
    btn.dataset.cardsWired = '1';
    const clubId = btn.getAttribute('data-club-id') || '';
    syncClubJoinButton(btn, clubId, labels);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!clubId) return;
      const club = clubsForDisplay().find((c) => c.id === clubId);
      if (!club) return;
      if (auth()?.getAdminOf?.().includes(clubId)) return;
      const joined = window.AdobeJoinModal?.toggleClubJoinWithModal(club, { events: mergedEvents() })
        ?? auth()?.toggleClubJoin(clubId, { events: mergedEvents() });
      if (joined === null) return;
      document.querySelectorAll(`.cb-poster-join[data-club-id="${CSS.escape(clubId)}"]`).forEach((el) => {
        syncClubJoinButton(el, clubId, labels);
      });
      refreshMemberCountsOnCards();
    });
  });
}

export function wireEventRsvpButtons(root) {
  (root || document).querySelectorAll('.ev-poster-rsvp[data-event-id]').forEach((btn) => {
    if (btn.dataset.cardsWired === '1') return;
    btn.dataset.cardsWired = '1';
    const eventId = btn.getAttribute('data-event-id') || '';
    const ev = mergedEvents().find((item) => item.id === eventId);
    if (ev && window.AdobeEventModal?.applyActionState) {
      window.AdobeEventModal.applyActionState(btn, ev);
    }
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!eventId || !ev) return;
      window.AdobeEventModal?.handleRsvpClick?.(ev, btn);
      document.querySelectorAll(`.ev-poster-rsvp[data-event-id="${CSS.escape(eventId)}"]`).forEach((el) => {
        window.AdobeEventModal?.applyActionState?.(el, ev);
      });
      window.dispatchEvent(new CustomEvent('adobe-rsvp-changed'));
    });
  });
}

export function wireCardActions(root, labels) {
  wireClubJoinButtons(root, labels);
  wireEventRsvpButtons(root);
}

export function refreshMemberCountsOnCards() {
  const byId = new Map(clubsForDisplay().map((c) => [c.id, c.members]));
  document.querySelectorAll('.lp-club-members').forEach((el) => {
    const card = el.closest('.lp-club-card--action, .lp-club-card');
    const btn = card?.querySelector('[data-club-id]');
    const clubId = btn?.getAttribute('data-club-id');
    if (!clubId || !byId.has(clubId)) return;
    el.textContent = formatMemberLabel(byId.get(clubId));
  });
}
