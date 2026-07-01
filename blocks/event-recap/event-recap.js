/**
 * Event Recap block — deprecated da.live placeholder.
 * Recap content is rendered inside the event-details block.
 */

export default async function decorate(block) {
  block.innerHTML = '';
  block.classList.add('event-recap');
  const section = block.closest('.section');
  if (section) section.style.display = 'none';
}
