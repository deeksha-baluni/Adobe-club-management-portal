/**
 * Dark CTA band for index-close.
 */
export function mountCtaSection(parent, data) {
  const section = document.createElement('section');
  section.className = 'index-close-section index-close-section--cta';
  section.setAttribute('aria-label', 'Get started');

  const inner = document.createElement('div');
  inner.className = 'index-close-cta-inner';

  const title = document.createElement('h2');
  title.className = 'index-close-cta-title';
  title.textContent = data.title;

  const subtitle = document.createElement('p');
  subtitle.className = 'index-close-cta-subtitle';
  subtitle.textContent = data.subtitle;

  const actions = document.createElement('div');
  actions.className = 'index-close-cta-actions';

  const primary = document.createElement('a');
  primary.href = data.primaryHref;
  primary.className = 'button primary index-close-cta-btn';
  primary.textContent = data.primaryText;

  const secondary = document.createElement('a');
  secondary.href = data.secondaryHref;
  secondary.className = 'button secondary index-close-cta-btn';
  secondary.textContent = data.secondaryText;

  actions.append(primary, secondary);
  inner.append(title, subtitle, actions);
  section.append(inner);
  parent.append(section);

  return section;
}
