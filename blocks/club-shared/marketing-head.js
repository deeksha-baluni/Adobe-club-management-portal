/**
 * Centered marketing section head — eyebrow, title, optional link.
 */
export function buildSectionHead({
  eyebrow = '',
  title = '',
  linkText = '',
  linkHref = '',
  classPrefix = 'marketing',
}) {
  const head = document.createElement('div');
  head.className = `${classPrefix}-head`;

  if (eyebrow) {
    const el = document.createElement('p');
    el.className = `${classPrefix}-eyebrow`;
    el.textContent = eyebrow;
    head.append(el);
  }

  if (title) {
    const el = document.createElement('h2');
    el.className = `${classPrefix}-heading`;
    el.textContent = title;
    head.append(el);
  }

  if (linkText) {
    const el = document.createElement('a');
    el.className = `${classPrefix}-link`;
    el.href = linkHref || '#';
    el.textContent = linkText;
    head.append(el);
  }

  return head;
}
