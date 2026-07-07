import { readBlockConfig } from '../../scripts/aem.js';

/**
 * Read da.live key | value rows and merge with defaults.
 * @param {Element} block
 * @param {Record<string, string>} defaults
 */
export function readPageConfig(block, defaults = {}) {
  return { ...defaults, ...readBlockConfig(block) };
}

/** Config value or fallback when empty. */
export function cfg(config, key, fallback = '') {
  const val = config?.[key];
  if (val == null) return fallback;
  const str = String(val).trim();
  return str || fallback;
}

/** Replace `{name}` placeholders in authored templates. */
export function fillTemplate(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? vars[key] : ''));
}
