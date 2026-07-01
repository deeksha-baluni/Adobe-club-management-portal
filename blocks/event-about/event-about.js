/**
 * Event About block — generated about copy.
 */

import { initEventPage, buildAboutHtml } from '../event-shared/event-page.js';

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('event-about');

  const ctx = await initEventPage();
  if (ctx.error) return;

  const { event: ev, club } = ctx;

  block.innerHTML = `
    <div class="ev-card-part ev-card-part--mid">
      <div class="event-about-section">
        <h2 class="event-about-heading">About this event</h2>
        <div class="event-about-body text">${buildAboutHtml(ev, club)}</div>
      </div>
    </div>`;
}
