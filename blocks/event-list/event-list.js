/**
 * Event List block — consolidated event body (RSVP rail + about + details + organizer).
 *
 * da.live `/event` page:
 *   | Metadata   |
 *   | Event Hero |  (separate block)
 *   | Event List |  (empty)
 */

import { initEventPage } from '../event-shared/event-page.js';
import { mountRsvpSection } from '../event-shared/sections/rsvp-section.js';
import { mountAboutSection } from '../event-shared/sections/about-section.js';
import { mountDetailsSection } from '../event-shared/sections/details-section.js';
import { mountOrganizerSection } from '../event-shared/sections/organizer-section.js';

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('event-list');

  const ctx = await initEventPage();
  if (ctx.error) return;

  const rail = document.createElement('div');
  rail.className = 'event-list-rail';
  mountRsvpSection(rail, ctx);

  const body = document.createElement('div');
  body.className = 'event-list-body';
  mountAboutSection(body, ctx);
  mountDetailsSection(body, ctx);
  mountOrganizerSection(body, ctx);

  block.appendChild(rail);
  block.appendChild(body);
}
