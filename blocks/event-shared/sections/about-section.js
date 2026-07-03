import { buildAboutHtml } from '../event-page.js';

export function mountAboutSection(block, ctx) {
  const { event: ev, club } = ctx;
  const part = document.createElement('div');
  part.className = 'ev-card-part ev-card-part--mid event-list-about';
  part.innerHTML = `
    <div class="event-about-section">
      <h2 class="event-about-heading">About this event</h2>
      <div class="event-about-body text">${buildAboutHtml(ev, club)}</div>
    </div>`;
  block.appendChild(part);
}
