import { loadCSS, loadScript } from '../../aem.js';
import { fetchAppData } from '../app-data.js';
import { wireCardActions } from './wire-actions.js';

let runtimeReady = false;
let depsLoaded = false;

function codeBase() {
  return window.hlx?.codeBasePath || '';
}

async function loadPosterDependencies() {
  if (depsLoaded) return;
  const base = codeBase();
  const criticalScripts = [
    `${base}/scripts/club-meta.js`,
    `${base}/scripts/user-features.js`,
    `${base}/scripts/event-seats.js`,
    `${base}/scripts/event-modal.js`,
    `${base}/scripts/join-modal.js`,
  ];
  const deferredScripts = [
    `${base}/scripts/club-request-prompt.js`,
    `${base}/scripts/interest-quiz.js`,
  ];
  const styles = [
    `${base}/styles/home-member.css`,
    `${base}/styles/user-features.css`,
    `${base}/styles/join-modal.css`,
    `${base}/styles/event-modal.css`,
  ];
  await Promise.all([
    ...styles.map((href) => loadCSS(href)),
    ...criticalScripts.map((src) => loadScript(src)),
  ]);
  const loadDeferred = () => {
    deferredScripts.forEach((src) => {
      loadScript(src).catch(() => {});
    });
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadDeferred, { timeout: 2500 });
  } else {
    window.setTimeout(loadDeferred, 0);
  }
  depsLoaded = true;
}

function initEventModal(clubs, events) {
  window.AdobeEventSeats?.init?.(events);
  window.AdobeEventModal?.init?.({
    clubs,
    events,
    onStateChange(ev) {
      document.querySelectorAll(`.ev-poster-rsvp[data-event-id="${CSS.escape(ev.id)}"]`).forEach((el) => {
        window.AdobeEventModal?.applyActionState?.(el, ev);
      });
      window.dispatchEvent(new CustomEvent('adobe-rsvp-changed'));
    },
  });
}

/**
 * One-time runtime for poster cards on /home (modals, quiz, published data).
 */
export async function ensureHomeCardRuntime() {
  if (runtimeReady) return;
  try {
    const session = JSON.parse(localStorage.getItem('adobeClubsAuth') || 'null');
    if (
      session?.isAuthenticated
      && (session.role === 'admin' || session.role === 'clubAdmin')
    ) {
      return;
    }
  } catch {
    // continue
  }
  runtimeReady = true;
  document.body.classList.add('user-home');

  await loadPosterDependencies();

  const data = await fetchAppData();
  const clubs = data?.clubs || [];
  const events = data?.events || [];
  window.__adobeClubClubs = clubs;
  window.__adobeClubEvents = events;
  window.__adobeClubEventsForTiming = () => events;

  initEventModal(clubs, events);
  wireCardActions(document);

  window.AdobeClubsAuth?.onPublishedContentChange?.(async () => {
    try {
      const fresh = await fetchAppData();
      window.__adobeClubClubs = fresh?.clubs || [];
      window.__adobeClubEvents = fresh?.events || [];
      initEventModal(window.__adobeClubClubs, window.__adobeClubEvents);
      window.dispatchEvent(new CustomEvent('adobe-cards-data-changed'));
    } catch {
      /* ignore */
    }
  });

  if (!window.__homeCardsBound) {
    window.__homeCardsBound = true;
    window.addEventListener('adobe-interests-updated', () => {
      window.dispatchEvent(new CustomEvent('adobe-cards-data-changed'));
    });
    window.addEventListener('adobe-quiz-closed', () => {
      window.dispatchEvent(new CustomEvent('adobe-cards-data-changed'));
    });
    window.addEventListener('adobe-club-members-changed', () => {
      wireCardActions(document);
    });
    window.addEventListener('adobe-rsvp-changed', () => {
      document.querySelectorAll('.ev-poster-rsvp[data-event-id]').forEach((btn) => {
        const eventId = btn.getAttribute('data-event-id');
        const ev = events.find((e) => e.id === eventId);
        if (ev) window.AdobeEventModal?.applyActionState?.(btn, ev);
      });
    });
  }

  const showQuiz = () => window.AdobeInterestQuiz?.maybeShowFirstSignupPicker?.();
  if ('requestIdleCallback' in window) {
    requestIdleCallback(showQuiz, { timeout: 3000 });
  } else {
    window.setTimeout(showQuiz, 500);
  }
}
