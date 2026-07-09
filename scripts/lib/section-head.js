/**
 * Centered section head — eyebrow, title, optional link.
 * Used by section-head block and cards when inlineHead is enabled.
 */
export function buildSectionHead({
  eyebrow = '',
  title = '',
  linkText = '',
  linkHref = '',
  classPrefix = 'section-head',
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

function sectionHeadWrapper(headBlock) {
  if (!headBlock) return null;
  const wrapper = headBlock.closest('.section-head-wrapper');
  return wrapper || headBlock.parentElement;
}

function cardsWrapper(block) {
  return block.closest('.cards-wrapper') || block.parentElement;
}

/**
 * Section-head block paired with this cards block (immediate preceding wrapper only).
 * Never grabs a head from another cards group in the same section.
 * @param {Element} block
 */
export function findPairedSectionHead(block) {
  if (!block?.classList?.contains('cards')) return null;

  const wrapper = cardsWrapper(block);
  if (!wrapper) return null;

  let sibling = wrapper.previousElementSibling;
  while (sibling) {
    if (sibling.classList?.contains('section-head-wrapper')) {
      return sibling.querySelector('.section-head.block');
    }
    if (sibling.classList?.contains('default-content-wrapper')) {
      sibling = sibling.previousElementSibling;
      continue;
    }
    break;
  }

  let prev = block.previousElementSibling;
  while (prev) {
    if (prev.classList?.contains('section-head') && prev.classList.contains('block')) {
      return prev;
    }
    prev = prev.previousElementSibling;
  }

  return null;
}

/**
 * True when a section-head block is paired above this cards block.
 * @param {Element} block
 */
export function hasSiblingSectionHead(block) {
  return Boolean(findPairedSectionHead(block));
}

/**
 * Move paired section-head before this cards block within the same section.
 * @param {Element} block cards block
 */
export function ensureSectionHeadBeforeCards(block) {
  const section = block.closest('.section');
  const headBlock = findPairedSectionHead(block);
  if (!headBlock || headBlock === block || !section) return;

  const cardsWrap = cardsWrapper(block);
  const headWrap = sectionHeadWrapper(headBlock);
  if (!cardsWrap || !headWrap) return;

  if (cardsWrap !== headWrap) {
    if (cardsWrap.compareDocumentPosition(headWrap) & Node.DOCUMENT_POSITION_FOLLOWING) {
      section.insertBefore(headWrap, cardsWrap);
    }
    return;
  }

  if (headBlock.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING) {
    cardsWrap.insertBefore(headBlock, block);
  }
}
