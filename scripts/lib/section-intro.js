/**
 * Detect da.live eyebrow/title authored above a block in the same section.
 * @param {Element} block
 */
export function hasAuthoredSectionIntro(block) {
  const wrapper = block.parentElement;
  const intro = wrapper?.previousElementSibling;
  return Boolean(
    intro?.classList.contains('default-content-wrapper')
    && intro.querySelector('h2, h3'),
  );
}
