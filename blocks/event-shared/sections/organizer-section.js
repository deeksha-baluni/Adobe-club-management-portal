import { esc } from '../event-page.js';
import { getAuth } from '../../club-shared/club-page.js';

export function mountOrganizerSection(block, ctx) {
  const { event: ev, club } = ctx;
  const authed = getAuth().isAuthenticated();
  const clubName = club?.name || ev.club || 'Adobe Clubs';

  let body = '';
  if (!authed) {
    const loginUrl = getAuth().loginUrlWithNext?.() || '/login';
    body = `
      <section class="event-organizer-section" aria-label="Organiser contact">
        <h2 class="event-about-heading">Organiser &amp; contact</h2>
        <div class="event-organizer-locked">
          <p>Organiser contact details are only visible to signed-in Adobe Clubs members.</p>
          <a class="event-organizer-signin" href="${esc(loginUrl)}">Sign in to view contact details</a>
        </div>
      </section>`;
  } else {
    const slackLabel = club?.slackChannel ? esc(club.slackChannel) : '';
    const slackUrl = club?.slackUrl ? esc(club.slackUrl) : '';
    const rows = [
      `<div class="event-organizer-row">
        <span class="event-organizer-label">Hosting club</span>
        <span class="event-organizer-value">${esc(clubName)}</span>
      </div>`,
    ];
    if (slackLabel) {
      rows.push(`<div class="event-organizer-row">
        <span class="event-organizer-label">Slack channel</span>
        ${slackUrl
    ? `<a class="event-organizer-value event-organizer-link" href="${slackUrl}" target="_blank" rel="noopener">${slackLabel}</a>`
    : `<span class="event-organizer-value">${slackLabel}</span>`}
      </div>`);
    }
    rows.push(`<div class="event-organizer-row">
      <span class="event-organizer-label">Clubs admin</span>
      <a class="event-organizer-value event-organizer-link" href="mailto:clubs-admin@adobe.com?subject=${encodeURIComponent(`Question about: ${ev.title || 'an event'}`)}">clubs-admin@adobe.com</a>
    </div>`);
    body = `
      <section class="event-organizer-section" aria-label="Organiser contact">
        <h2 class="event-about-heading">Organiser &amp; contact</h2>
        <p class="event-organizer-intro">Questions about this event? Reach out to the organisers below — we're happy to help.</p>
        <div class="event-organizer-card">${rows.join('')}</div>
      </section>
      <hr class="event-page-divider" role="separator">`;
  }

  const part = document.createElement('div');
  part.className = 'ev-card-part ev-card-part--tail';
  part.innerHTML = body;
  block.appendChild(part);
}
