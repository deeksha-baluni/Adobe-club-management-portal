/**
 * club-request-prompt.js — Post-quiz club proposal prompt (UI only).
 * Full proposal flow is deferred; "Yes, propose a club" is shown but not operable yet.
 */
'use strict';

(function () {
  function auth() {
    return window.AdobeClubsAuth || null;
  }

  function uf() {
    return window.AdobeUserFeatures || null;
  }

  function ensureOverlay() {
    if (document.getElementById('cr-overlay')) return;
    const root = document.createElement('div');
    root.id = 'cr-overlay';
    root.className = 'cr-overlay';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = '<div class="cr-panel" id="cr-panel"></div>';
    document.body.appendChild(root);
    root.addEventListener('click', (e) => {
      if (e.target === root && root.dataset.dismissible === 'true') closeOverlay();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !root.hidden && root.dataset.dismissible === 'true') closeOverlay();
    });
  }

  function closeOverlay() {
    const overlay = document.getElementById('cr-overlay');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('cr-open');
    if (!document.body.classList.contains('uf-quiz-open')) {
      document.body.style.overflow = '';
    }
  }

  function openOverlay(html, { dismissible = true } = {}) {
    ensureOverlay();
    const overlay = document.getElementById('cr-overlay');
    const panel = document.getElementById('cr-panel');
    if (!overlay || !panel) return;
    panel.innerHTML = html;
    overlay.dataset.dismissible = String(dismissible);
    overlay.hidden = false;
    document.body.classList.add('cr-open');
    document.body.style.overflow = 'hidden';
    panel.querySelector('[autofocus]')?.focus();
  }

  function renderPrompt() {
    return `
      <div class="cr-prompt">
        <h2 class="cr-title" id="cr-title">Start something new?</h2>
        <p class="cr-lead">Would you like to propose a new club based on your interests?</p>
        <div class="cr-actions cr-actions--split">
          <button type="button" class="cr-btn cr-btn--ghost" id="cr-skip-anyway">Skip anyway</button>
          <button type="button" class="cr-btn cr-btn--primary" id="cr-prompt-yes" disabled aria-disabled="true" title="Club proposals coming soon">Yes, propose a club</button>
        </div>
      </div>`;
  }

  function finishQuizSkip() {
    uf()?.markInterestQuizSkipped?.();
    window.AdobeInterestQuiz?.closeQuiz?.();
  }

  function wirePrompt({ onSkipAnyway, fromQuiz = false } = {}) {
    document.getElementById('cr-skip-anyway')?.addEventListener('click', () => {
      closeOverlay();
      if (fromQuiz) {
        finishQuizSkip();
        return;
      }
      onSkipAnyway?.();
    });
  }

  function openCreateClubPrompt({ fromQuiz = false, onSkipAnyway } = {}) {
    if (!auth()?.isAuthenticated?.()) {
      window.location.href = auth()?.loginUrlWithNext?.() || '/login';
      return;
    }
    openOverlay(renderPrompt(), { dismissible: false });
    wirePrompt({
      fromQuiz,
      onSkipAnyway: onSkipAnyway || (fromQuiz ? finishQuizSkip : closeOverlay),
    });
  }

  function openCreateClubForm() {
    openCreateClubPrompt();
  }

  window.AdobeClubRequest = {
    openCreateClubPrompt,
    openCreateClubForm,
  };
})();
