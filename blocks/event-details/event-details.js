/**
 * Event Details block — metadata definition list.
 */

import {
  initEventPage,
  buildDetailsListHtml,
  buildEventRecapSectionHtml,
} from '../event-shared/event-page.js';

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('event-details');

  const ctx = await initEventPage();
  if (ctx.error) return;

  const { event: ev, club } = ctx;

  const recapHtml = buildEventRecapSectionHtml(ev, club);

  block.innerHTML = `
    <div class="ev-card-part ev-card-part--mid">
      <div class="event-details-section">
        <h2 class="event-about-heading">Event details</h2>
        ${buildDetailsListHtml(ev, club)}
      </div>
      ${recapHtml}
    </div>`;

  if (recapHtml && window.location.hash === '#recap') {
    block.querySelector('#recap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
