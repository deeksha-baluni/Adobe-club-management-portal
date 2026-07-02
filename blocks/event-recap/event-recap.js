/**
 * Event Recap block — past event recap section (#recap).
 */

import {
  initEventPage,
  isPast,
  getEventRecap,
  hasEventRecap,
  buildRecapHtml,
  scrollToRecapIfNeeded,
} from '../event-shared/event-page.js';

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('event-recap');

  if (document.getElementById('recap')) return;

  const ctx = await initEventPage();
  if (ctx.error) return;

  const { event: ev, club } = ctx;
  if (!isPast(ev) || !hasEventRecap(ev)) return;

  const recap = getEventRecap(ev);

  block.innerHTML = `
    <div class="ev-card-part ev-card-part--mid">
      <section class="event-recap-section" id="recap" aria-label="Event recap">
        <h3 class="event-recap-heading">Event recap</h3>
        <div class="event-recap-body">
          ${buildRecapHtml(recap, ev, club)}
        </div>
      </section>
    </div>`;

  scrollToRecapIfNeeded();
}
