/**
 * club-request-prompt.js — Club creation request / proposal flow.
 *
 * The form IS the email. On submit the platform pre-composes a mailto: with
 * all form data already filled in; the user just hits Send in their mail
 * client. After the mail client opens we write the proposal to localStorage
 * and show a confirmation popup.
 */
'use strict';

(function () {
  const REQUESTS_KEY = 'adobeClubsClubRequests';
  const ADMIN_EMAIL = 'clubs-admin@adobe.com';

  const CATEGORIES = [
    'Photography', 'Engineering', 'Sports', 'Design', 'Food',
    'Reading', 'Games', 'Sustainability', 'Community', 'Wellbeing', 'Other',
  ];

  const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Ad-hoc'];

  function auth() { return window.AdobeClubsAuth || null; }
  function uf() { return window.AdobeUserFeatures || null; }

  function codeBase() {
    return window.hlx?.codeBasePath || '';
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function readRequests() {
    try {
      const v = JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  function writeRequests(list) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(list.slice(0, 100)));
  }

  function updateRequestStatus(id, status, extra = {}) {
    const list = readRequests();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], status, ...extra, updatedAt: Date.now() };
    writeRequests(list);
    window.dispatchEvent(new CustomEvent('adobe-club-requests-updated'));
    return list[idx];
  }

  async function getAdminEmail() {
    try {
      const res = await fetch(`${codeBase()}/data/data.json`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const admin = (data.auth?.admins || []).find((a) => (a.role || 'admin') === 'admin');
      return admin?.email || ADMIN_EMAIL;
    } catch {
      return ADMIN_EMAIL;
    }
  }

  function toSlug(name) {
    return String(name || '').toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '').trim()
      .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 30);
  }

  function buildProposalMailto(req, adminEmail) {
    const dashboardUrl = `${window.location.origin}/home#club-requests`;
    const subject = `Club Proposal: ${req.clubName}`;
    const body = [
      'Hi,',
      '',
      "I'd like to propose a new club on Adobe Clubs.",
      '',
      `Club name: ${req.clubName}`,
      `Category: ${req.category}`,
      `Description: ${req.description}`,
      `Purpose: ${req.purpose}`,
      `Expected members: ${req.expectedMembers}`,
      `Meeting frequency: ${req.meetingFrequency}`,
      `Proposed Slack channel: #${req.slackChannel}`,
      '',
      `\u2014 ${req.leadName}`,
      '',
      '---',
      'To act on this proposal, visit your dashboard:',
      dashboardUrl,
    ].join('\n');
    return `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function buildApprovalMailto(req) {
    const subject = `Re: Club Proposal: ${req.clubName} — Approved!`;
    const body = [
      `Hi ${req.leadName},`,
      '',
      `Great news! Your proposal for "${req.clubName}" has been approved.`,
      '',
      "Your club will be set up on Adobe Clubs shortly. Here's what happens next:",
      '  • Your club page will appear on the platform within 24 hours',
      "  • You'll be assigned as Club Admin",
      `  • Your Slack channel #${req.slackChannel} will be created`,
      '',
      'Welcome aboard as a club lead!',
      '',
      '\u2014 Adobe Clubs Admin',
    ].join('\n');
    return `mailto:${req.leadEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function currentUserLead() {
    const user = auth()?.getCurrentUser?.() || {};
    const session = auth()?.getSession?.() || {};
    return {
      leadName: user.displayName || session.displayName || session.username || '',
      leadEmail: user.email || session.email || '',
      leadUsername: user.username || session.username || '',
    };
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

  function closeOverlay() {
    const overlay = document.getElementById('cr-overlay');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('cr-open');
    if (!document.body.classList.contains('uf-quiz-open')) {
      document.body.style.overflow = '';
    }
  }

  function renderPrompt() {
    return `
      <div class="cr-prompt">
        <h2 class="cr-title" id="cr-title">Start something new?</h2>
        <p class="cr-lead">Would you like to propose a new club based on your interests?</p>
        <div class="cr-actions cr-actions--split">
          <button type="button" class="cr-btn cr-btn--ghost" id="cr-skip-anyway">Skip anyway</button>
          <button type="button" class="cr-btn cr-btn--primary" id="cr-prompt-yes" autofocus>Yes, propose a club</button>
        </div>
      </div>`;
  }

  function renderForm(prefill = {}) {
    const lead = { ...currentUserLead(), ...prefill };
    const catOpts = CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    const freqOpts = FREQUENCIES.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
    return `
      <div class="cr-form-wrap">
        <h2 class="cr-title">Propose a new club</h2>
        <p class="cr-lead">Fill in the details below. When you click <strong>Submit proposal</strong> your mail client will open with this proposal pre-composed — just hit Send.</p>
        <form class="cr-form" id="cr-form" novalidate>
          <div class="cr-field">
            <label class="cr-label" for="cr-name">Club name <span aria-hidden="true">*</span></label>
            <input class="cr-input" type="text" id="cr-name" name="clubName" required placeholder="e.g. Motion Graphics Club" autofocus />
          </div>
          <div class="cr-field">
            <label class="cr-label" for="cr-category">Category <span aria-hidden="true">*</span></label>
            <select class="cr-input cr-select" id="cr-category" name="category" required>
              <option value="" disabled selected>Select a category</option>
              ${catOpts}
            </select>
          </div>
          <div class="cr-field">
            <label class="cr-label" for="cr-desc">Description <span aria-hidden="true">*</span></label>
            <textarea class="cr-input cr-textarea" id="cr-desc" name="description" rows="3" required placeholder="What is this club about?"></textarea>
          </div>
          <div class="cr-field">
            <label class="cr-label" for="cr-purpose">Purpose <span aria-hidden="true">*</span></label>
            <textarea class="cr-input cr-textarea" id="cr-purpose" name="purpose" rows="2" required placeholder="Why should this club exist at Adobe?"></textarea>
          </div>
          <div class="cr-row-2">
            <div class="cr-field">
              <label class="cr-label" for="cr-members">Expected members <span aria-hidden="true">*</span></label>
              <input class="cr-input" type="number" id="cr-members" name="expectedMembers" min="1" max="9999" required placeholder="e.g. 25" />
            </div>
            <div class="cr-field">
              <label class="cr-label" for="cr-freq">Meeting frequency <span aria-hidden="true">*</span></label>
              <select class="cr-input cr-select" id="cr-freq" name="meetingFrequency" required>
                <option value="" disabled selected>Select</option>
                ${freqOpts}
              </select>
            </div>
          </div>
          <div class="cr-field">
            <label class="cr-label" for="cr-slack">Proposed Slack channel</label>
            <div class="cr-input-prefix-wrap">
              <span class="cr-input-prefix">#</span>
              <input class="cr-input cr-input--prefixed" type="text" id="cr-slack" name="slackChannel" placeholder="club-motion-graphics" />
            </div>
            <p class="cr-hint">Auto-suggested from club name — edit if needed</p>
          </div>
          <fieldset class="cr-fieldset">
            <legend class="cr-label">Your details (club lead)</legend>
            <div class="cr-row-2">
              <div class="cr-field">
                <label class="cr-label cr-label--sub" for="cr-lead-name">Name <span aria-hidden="true">*</span></label>
                <input class="cr-input" type="text" id="cr-lead-name" name="leadName" required value="${esc(lead.leadName)}" />
              </div>
              <div class="cr-field">
                <label class="cr-label cr-label--sub" for="cr-lead-email">Email <span aria-hidden="true">*</span></label>
                <input class="cr-input" type="email" id="cr-lead-email" name="leadEmail" required value="${esc(lead.leadEmail)}" />
              </div>
            </div>
          </fieldset>
          <p class="cr-error" id="cr-form-error" hidden></p>
          <div class="cr-actions">
            <button type="button" class="cr-btn cr-btn--ghost" id="cr-form-cancel">Cancel</button>
            <button type="submit" class="cr-btn cr-btn--primary">Submit proposal</button>
          </div>
        </form>
      </div>`;
  }

  function renderConfirm() {
    return `
      <div class="cr-confirm">
        <div class="cr-confirm-icon" aria-hidden="true">✓</div>
        <h2 class="cr-title">Your proposal is ready</h2>
        <p class="cr-lead">It's filled in and waiting in your mail app — click <strong>Send</strong> to submit it to the admin for review. Review usually takes 3–5 business days, and you'll get an email once it's been approved or declined.</p>
        <button type="button" class="cr-btn cr-btn--primary cr-btn--wide" id="cr-confirm-done">Got it</button>
      </div>`;
  }

  function wirePrompt({ onSkipAnyway, fromQuiz = false } = {}) {
    document.getElementById('cr-prompt-yes')?.addEventListener('click', () => {
      openCreateClubForm({ fromQuiz });
    });
    document.getElementById('cr-skip-anyway')?.addEventListener('click', () => {
      closeOverlay();
      onSkipAnyway?.();
    });
  }

  function wireForm({ onDone, fromQuiz = false } = {}) {
    const form = document.getElementById('cr-form');
    const errEl = document.getElementById('cr-form-error');

    const nameInput = document.getElementById('cr-name');
    const slackInput = document.getElementById('cr-slack');
    let slackEdited = false;
    nameInput?.addEventListener('input', () => {
      if (!slackEdited && slackInput) {
        slackInput.value = toSlug(nameInput.value);
      }
    });
    slackInput?.addEventListener('input', () => { slackEdited = true; });

    document.getElementById('cr-form-cancel')?.addEventListener('click', () => {
      closeOverlay();
      if (fromQuiz) {
        const quizOverlay = document.getElementById('uf-quiz-overlay');
        if (quizOverlay) {
          quizOverlay.hidden = false;
          document.body.classList.add('uf-quiz-open');
          document.body.style.overflow = 'hidden';
        }
        return;
      }
      onDone?.();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const fd = new FormData(form);
      const user = auth()?.getCurrentUser?.() || {};
      const session = auth()?.getSession?.() || {};

      const clubName = String(fd.get('clubName') || '').trim();
      const category = String(fd.get('category') || '').trim();
      const description = String(fd.get('description') || '').trim();
      const purpose = String(fd.get('purpose') || '').trim();
      const expectedMembers = String(fd.get('expectedMembers') || '').trim();
      const meetingFrequency = String(fd.get('meetingFrequency') || '').trim();
      const slackChannel = String(fd.get('slackChannel') || toSlug(clubName)).trim();
      const leadName = String(fd.get('leadName') || '').trim();
      const leadEmail = String(fd.get('leadEmail') || '').trim();

      if (!clubName || !category || !leadName || !leadEmail) {
        if (errEl) {
          errEl.textContent = 'Please fill in all required fields.';
          errEl.hidden = false;
        }
        return;
      }

      const request = {
        id: `req-${Date.now()}`,
        clubName,
        category,
        description,
        purpose,
        expectedMembers,
        meetingFrequency,
        slackChannel,
        leadName,
        leadEmail,
        leadUsername: user.username || session.username || '',
        submittedBy: user.displayName || session.displayName || session.username || 'Member',
        submittedEmail: user.email || session.email || '',
        submittedAt: Date.now(),
        status: 'pending',
      };

      const list = readRequests();
      list.unshift(request);
      writeRequests(list);

      const adminEmail = await getAdminEmail();
      const mailtoHref = buildProposalMailto(request, adminEmail);
      const link = document.createElement('a');
      link.href = mailtoHref;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.AdobeNotifications?.notifyClubRequest?.(request, '/#club-requests');
      window.AdobeNotifications?.logClubRequestActivity?.(request);

      openOverlay(renderConfirm(), { dismissible: false });
      document.getElementById('cr-confirm-done')?.addEventListener('click', () => {
        closeOverlay();
        onDone?.();
      });
    });
  }

  function finishQuizSkip() {
    uf()?.markInterestQuizSkipped?.();
    window.AdobeInterestQuiz?.closeQuiz?.();
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

  function openCreateClubForm({ fromQuiz = false, onDone } = {}) {
    if (!auth()?.isAuthenticated?.()) {
      window.location.href = auth()?.loginUrlWithNext?.() || '/login';
      return;
    }
    openOverlay(renderForm(), { dismissible: false });
    wireForm({
      fromQuiz,
      onDone: onDone || (fromQuiz ? finishQuizSkip : undefined),
    });
  }

  function openForAuthenticatedUser() {
    openCreateClubForm();
  }

  function approveRequest(id) {
    const req = updateRequestStatus(id, 'approved');
    if (!req) return;
    if (req.leadEmail) {
      const link = document.createElement('a');
      link.href = buildApprovalMailto(req);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    window.AdobeNotifications?.notifyClubApproved?.(req);
    window.dispatchEvent(new CustomEvent('adobe-activity-logged'));
  }

  function declineRequest(id) {
    const req = updateRequestStatus(id, 'declined');
    if (!req) return;
    window.AdobeNotifications?.notifyClubDeclined?.(req);
    window.dispatchEvent(new CustomEvent('adobe-activity-logged'));
  }

  window.AdobeClubRequest = {
    openCreateClubPrompt,
    openCreateClubForm,
    openForAuthenticatedUser,
    approveRequest,
    declineRequest,
    getRequests: readRequests,
    CATEGORIES,
  };
})();
