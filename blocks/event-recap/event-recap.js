/**
 * Event Recap block — past event recap section (#recap).
 */

import { initEventPage, buildEventRecapSectionHtml } from '../event-shared/event-page.js';

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('event-recap');

  const ctx = await initEventPage();
  if (ctx.error) return;

  // Recap is rendered in event-details when that block is on the page.
  if (document.getElementById('recap')) return;

  const { event: ev, club } = ctx;
  const recapHtml = buildEventRecapSectionHtml(ev, club);
  if (!recapHtml) return;

  block.innerHTML = `
    <div class="ev-card-part ev-card-part--mid">
      ${recapHtml}
    </div>`;

  if (window.location.hash === '#recap') {
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
