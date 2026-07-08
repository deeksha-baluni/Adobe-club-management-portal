import { buildAboutHtml, esc } from '../event-page.js';
import { cfg } from '../../lib/block-config.js';

export function mountAboutSection(block, ctx) {
  const { event: ev, club, pageConfig = {} } = ctx;
  const title = cfg(pageConfig, 'section-about', 'About this event');
  const part = document.createElement('div');
  part.className = 'ev-card-part ev-card-part--mid event-list-about';
  part.innerHTML = `
    <div class="event-about-section">
      <h2 class="event-about-heading">${esc(title)}</h2>
      <div class="event-about-body text">${buildAboutHtml(ev, club)}</div>
    </div>`;
  block.appendChild(part);
}
