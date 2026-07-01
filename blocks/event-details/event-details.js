/**
 * Event Details block — metadata definition list.
 */

import { initEventPage, buildDetailsListHtml } from '../event-shared/event-page.js';

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('event-details');

  const ctx = await initEventPage();
  if (ctx.error) return;

  const { event: ev, club } = ctx;

  block.innerHTML = `
    <div class="ev-card-part ev-card-part--mid">
      <div class="event-details-section">
        <h2 class="event-about-heading">Event details</h2>
        ${buildDetailsListHtml(ev, club)}
      </div>
    </div>`;
}
