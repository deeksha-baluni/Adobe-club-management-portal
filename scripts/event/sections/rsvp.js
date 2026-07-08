import {
  esc,
  formatEventLongDate,
  getLocationLabel,
  getAccessLabel,
  refreshRegisterButton,
  ICON_CAL,
  ICON_PIN,
  ICON_GLOBE,
} from '../event-page.js';
import { cfg } from '../../lib/block-config.js';

export function mountRsvpSection(block, ctx) {
  const { event: ev, pageConfig = {} } = ctx;
  const railDateTime = formatEventLongDate(ev);
  const locationLabel = getLocationLabel(ev);
  const accessLabel = getAccessLabel(ev);
  const rsvpLabel = cfg(pageConfig, 'rsvp-label', 'RSVP');

  block.innerHTML = `
    <aside class="event-page-right-rail">
      <div class="event-rail-card">
        <div class="event-rail-register">
          <button type="button" id="registration_button" class="event-register-btn" aria-label="${esc(rsvpLabel)} for this event">
            ${esc(rsvpLabel)}
          </button>
        </div>
        <div class="event-rail-info">
          <div class="event-rail-row">
            <span class="event-rail-icon-wrap">${ICON_CAL}</span>
            <span class="event-rail-text">${esc(railDateTime)}</span>
          </div>
          <div class="event-rail-row">
            <span class="event-rail-icon-wrap">${ICON_PIN}</span>
            <span class="event-rail-text">${esc(locationLabel)}</span>
          </div>
          <div class="event-rail-row">
            <span class="event-rail-icon-wrap">${ICON_GLOBE}</span>
            <span class="event-rail-text">${esc(accessLabel)}</span>
          </div>
        </div>
      </div>
    </aside>`;

  const btn = block.querySelector('#registration_button');
  refreshRegisterButton(ev, btn);
}
