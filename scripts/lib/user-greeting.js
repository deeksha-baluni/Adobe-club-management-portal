import { fillTemplate } from './block-config.js';

const FALLBACK_NAME = 'there';
const GREETING_SELECTOR = '#home-greeting, #hm-greeting, #adm-greeting, [data-user-greeting]';

function auth() {
  return window.AdobeClubsAuth || null;
}

function resolveName(fallback = FALLBACK_NAME) {
  const user = auth()?.getCurrentUser?.();
  return user?.displayName || user?.username || fallback;
}

function resolveTemplate(el) {
  const attr = el.dataset.greetingTemplate;
  if (attr) return attr;
  return el.textContent.trim();
}

/**
 * Fill `{name}` placeholders and mark headings ready for display.
 * @param {ParentNode} [root=document]
 */
export function applyUserGreeting(root = document) {
  if (!auth()?.isAuthenticated?.()) return;

  root.querySelectorAll(GREETING_SELECTOR).forEach((el) => {
    const fallback = el.dataset.greetingFallbackName || FALLBACK_NAME;
    const template = resolveTemplate(el);
    if (!template) return;
    if (!el.dataset.greetingTemplate) {
      el.dataset.greetingTemplate = template;
    }
    el.textContent = fillTemplate(template, { name: resolveName(fallback) });
    el.classList.add('greeting-ready');
  });
}

/**
 * Resolve greeting + load styles before first paint on /home.
 */
export async function hydrateHomeGreeting() {
  const { loadCSS } = await import('../aem.js');
  const base = window.hlx?.codeBasePath || '';
  applyUserGreeting();
  await loadCSS(`${base}/styles/home-greeting.css`);
}

export { GREETING_SELECTOR };
