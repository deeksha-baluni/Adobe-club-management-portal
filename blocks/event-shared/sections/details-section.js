import {
  buildDetailsListHtml,
  buildRecapSectionHtml,
  scrollToRecapIfNeeded,
} from '../event-page.js';

export function mountDetailsSection(block, ctx) {
  const { event: ev, club } = ctx;
  const part = document.createElement('div');
  part.className = 'ev-card-part ev-card-part--mid';
  part.innerHTML = `
    <div class="event-details-section">
      <h2 class="event-about-heading">Event details</h2>
      ${buildDetailsListHtml(ev, club)}
    </div>
    ${buildRecapSectionHtml(ev, club)}`;
  block.appendChild(part);
  scrollToRecapIfNeeded();
}
