import {
  buildDetailsListHtml,
  buildRecapSectionHtml,
  scrollToRecapIfNeeded,
  esc,
} from '../event-page.js';
import { cfg } from '../../lib/block-config.js';

export function mountDetailsSection(block, ctx) {
  const { event: ev, club, pageConfig = {} } = ctx;
  const detailsTitle = cfg(pageConfig, 'section-details', 'Event details');
  const part = document.createElement('div');
  part.className = 'ev-card-part ev-card-part--mid';
  part.innerHTML = `
    <div class="event-details-section">
      <h2 class="event-about-heading">${esc(detailsTitle)}</h2>
      ${buildDetailsListHtml(ev, club)}
    </div>
    ${buildRecapSectionHtml(ev, club, pageConfig)}`;
  block.appendChild(part);
  scrollToRecapIfNeeded();
}
