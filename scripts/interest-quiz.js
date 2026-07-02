/**
 * interest-quiz.js — First-signup interest picker + club recommendations
 */
'use strict';

(function () {
  const IMAGE_BASE = '/assets/images/clubs/';

  function uf() {
    return window.AdobeUserFeatures;
  }

  function auth() {
    return window.AdobeClubsAuth;
  }

  function esc(s) {
    return uf()?.esc(s) ?? String(s ?? '');
  }

  function clearNewSignupFlag() {
    const session = auth()?.getSession?.();
    if (!session?.isNewSignup) return;
    const next = { ...session };
    delete next.isNewSignup;
    localStorage.setItem('adobeClubsAuth', JSON.stringify(next));
  }

  function injectQuizModal() {
    if (document.getElementById('uf-quiz-overlay')) return;
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="uf-quiz-overlay" id="uf-quiz-overlay" role="dialog" aria-modal="true" aria-labelledby="uf-quiz-title" hidden>
        <div class="uf-quiz-panel uf-quiz-panel--interests">
          <div class="uf-quiz-scroll">
            <div class="uf-quiz-picker" id="uf-quiz-picker">
              <div class="uf-quiz-head">
                <h2 id="uf-quiz-title" class="uf-quiz-title">Tell us about your interests</h2>
                <span class="uf-quiz-counter" id="uf-quiz-counter" aria-live="polite">0</span>
              </div>
              <p class="uf-quiz-lead">Select at least 5 interests</p>
              <div class="uf-quiz-chips" id="uf-quiz-chips" role="group" aria-label="Choose your interests"></div>
            </div>
            <div class="uf-quiz-results" id="uf-quiz-results" hidden></div>
          </div>
          <div class="uf-quiz-actions" id="uf-quiz-actions">
            <button type="button" class="uf-quiz-skip" id="uf-quiz-skip">Skip</button>
            <button type="button" class="uf-quiz-submit" id="uf-quiz-continue" disabled>Continue</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el.firstElementChild);
  }

  function renderInterestPicker() {
    const picker = document.getElementById('uf-quiz-picker');
    const results = document.getElementById('uf-quiz-results');
    const actions = document.getElementById('uf-quiz-actions');
    const chipsWrap = document.getElementById('uf-quiz-chips');
    const continueBtn = document.getElementById('uf-quiz-continue');
    if (!picker || !chipsWrap || !continueBtn) return;

    picker.hidden = false;
    if (results) results.hidden = true;
    if (actions) actions.hidden = false;

    const options = uf()?.INTEREST_OPTIONS || [];
    const selected = new Set();

    chipsWrap.innerHTML = options.map(opt => `
      <button type="button"
              class="uf-quiz-chip"
              data-interest-id="${esc(opt.id)}"
              aria-pressed="false">
        <span class="uf-quiz-chip-icon" aria-hidden="true">${opt.icon || '•'}</span>
        <span class="uf-quiz-chip-label">${esc(opt.label)}</span>
      </button>
    `).join('');

    const counter = document.getElementById('uf-quiz-counter');

    function syncUI() {
      const count = selected.size;
      if (counter) counter.textContent = String(count);
      continueBtn.disabled = count < (uf()?.MIN_INTERESTS || 5);
      chipsWrap.querySelectorAll('.uf-quiz-chip').forEach(btn => {
        const active = selected.has(btn.dataset.interestId || '');
        btn.classList.toggle('is-selected', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }

    chipsWrap.querySelectorAll('.uf-quiz-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.interestId || '';
        if (!id) return;
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        syncUI();
      });
    });

    continueBtn.onclick = async () => {
      if (selected.size < (uf()?.MIN_INTERESTS || 5)) return;
      uf()?.saveSelectedInterests?.([...selected]);
      await showQuizResults();
    };

    document.getElementById('uf-quiz-skip')?.addEventListener('click', () => {
      const overlay = document.getElementById('uf-quiz-overlay');
      if (overlay) overlay.hidden = true;
      document.body.classList.remove('uf-quiz-open');
      document.body.style.overflow = '';
      window.AdobeClubRequest?.openCreateClubPrompt?.({
        fromQuiz: true,
        onSkipAnyway: () => {
          uf()?.markInterestQuizSkipped?.();
          closeQuiz();
        },
      });
    });

    syncUI();
    resetQuizScroll();
  }

  async function showQuizResults() {
    const picker = document.getElementById('uf-quiz-picker');
    const results = document.getElementById('uf-quiz-results');
    const actions = document.getElementById('uf-quiz-actions');
    if (!results) return;

    let data;
    try {
      const res = await fetch('/data/data.json');
      data = await res.json();
    } catch (err) {
      data = { clubs: [] };
    }

    const clubs = uf()?.suggestClubs?.(data.clubs || [], 6) || [];
    const interests = uf()?.getSelectedInterests?.() || [];

    if (picker) picker.hidden = true;
    if (actions) actions.hidden = true;
    results.hidden = false;

    results.innerHTML = `
      <div class="uf-quiz-results-head">
        <h3 class="uf-quiz-results-title">Your clubs, curated for you</h3>
        <p class="uf-quiz-results-lead">Based on ${esc(interests.slice(0, 5).join(', '))}${interests.length > 5 ? '…' : ''}, we picked these Adobe Clubs for you.</p>
      </div>
      ${interests.length ? `
        <div class="uf-quiz-interest-pills" aria-label="Your selected interests">
          ${interests.map(label => `<span class="uf-quiz-interest-pill">${esc(label)}</span>`).join('')}
        </div>
      ` : ''}
      <ul class="uf-quiz-club-grid" role="list">
        ${clubs.length ? clubs.map(club => `
          <li class="uf-quiz-club-card" role="listitem">
            <a href="/club?id=${esc(club.id)}" class="uf-quiz-club-link">
              <div class="uf-quiz-club-img">
                <img src="${IMAGE_BASE}${esc(club.image || club.id + '.jpg')}" alt="" loading="lazy" decoding="async">
              </div>
              <div class="uf-quiz-club-body">
                <span class="uf-quiz-club-tag">${esc(club.tag)}</span>
                <span class="uf-quiz-club-name">${esc(club.name)}</span>
              </div>
            </a>
          </li>
        `).join('') : `
          <li class="uf-quiz-club-empty">Browse all clubs to find communities that fit you.</li>
        `}
      </ul>
      <button type="button" class="uf-quiz-submit uf-quiz-submit--wide" id="uf-quiz-done">Start exploring</button>
    `;

    document.getElementById('uf-quiz-done')?.addEventListener('click', closeQuiz);
    resetQuizScroll();
  }

  function resetQuizScroll() {
    const scroll = document.querySelector('.uf-quiz-scroll');
    if (!scroll) return;
    scroll.style.scrollBehavior = 'auto';
    scroll.scrollTop = 0;
    scroll.style.scrollBehavior = '';
  }

  function isHomePage() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    return path === '' || path === '/' || path === '/home';
  }

  function openInterestPicker({ pending = false } = {}) {
    injectQuizModal();
    const overlay = document.getElementById('uf-quiz-overlay');
    if (!overlay) return;
    if (pending) document.documentElement.classList.add('uf-quiz-pending');
    overlay.hidden = false;
    document.body.classList.add('uf-quiz-open');
    document.body.style.overflow = 'hidden';
    renderInterestPicker();
  }

  function closeQuiz() {
    const overlay = document.getElementById('uf-quiz-overlay');
    if (overlay) overlay.hidden = true;
    document.documentElement.classList.remove('uf-quiz-pending');
    document.body.classList.remove('uf-quiz-open');
    document.body.style.overflow = '';
    clearNewSignupFlag();
    window.dispatchEvent(new CustomEvent('adobe-quiz-closed'));
    if (!isHomePage()) {
      window.location.href = '/home';
    }
  }

  function maybeShowFirstSignupPicker() {
    if (!auth()?.isAuthenticated?.()) return;
    if (uf()?.hasDismissedInterestQuiz?.()) return;
    const session = auth()?.getSession?.();
    if (!session?.isNewSignup) return;
    openInterestPicker({ pending: true });
  }

  window.AdobeInterestQuiz = {
    openInterestPicker,
    closeQuiz,
    maybeShowFirstSignupPicker,
  };

  injectQuizModal();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeShowFirstSignupPicker);
  } else {
    maybeShowFirstSignupPicker();
  }
})();
