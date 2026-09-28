/**
 * FILE: getNarrativeCopy.js
 *
 * Narrative copy for indicator cards / the indicator page, from the copy
 * deck (content/copy/measure-copy.csv → indicatorCopy.json via `npm run copy`).
 *
 * The narrative is the deck's Context sentence(s) followed by its Comparison
 * sentence, as one <TOKEN> template resolved per neighborhood by
 * resolveNarrative.js.
 *
 * 2026-09-26: replaces the old status-gated narrativeCopy.json. There is no
 * status column any more — every keyed row renders.
 *
 * 2026-09-28: the "design in progress" FLAG no longer holds a row back.
 * resolveNarrative() already returns null for any token it can't fill, so a
 * row whose copy fully resolves (e.g. Health insurance) now renders, and one
 * that doesn't (Avertable deaths, College degree) still falls back to the
 * plain subtitle. FLAG is left as an editorial note only.
 */

import { indicatorCopy } from '@/config/indicatorCopy';

/** Full copy-deck row for one key, or null. */
export function getNarrativeCopy(key) {
  if (!key) return null;
  return indicatorCopy[key] ?? null;
}

/**
 *  Context + Comparison as one template string, or null when the row
 * has no copy. Callers: `resolveNarrative(getReadyNarrativeTemplate(key)) ?? subtitle`.
 *
 * @param {string} key
 * @returns {string|null}
 */
export function getReadyNarrativeTemplate(key) {
  const entry = getNarrativeCopy(key);
  if (!entry) return null;
  const template = [entry.context, entry.comparison].filter(Boolean).join(' ').trim();
  return template || null;
}

/**
 * Context and Comparison as SEPARATE templates (2026-09-28) — the flyout
 * shows the context sentence above the map and the indicator-specific
 * comparison sentence (values styled as badges) below it.
 *
 * @param {string} key
 * @returns {{ context: string|null, comparison: string|null } | null}
 */
export function getReadyNarrativeTemplates(key) {
  const entry = getNarrativeCopy(key);
  if (!entry) return null;
  const context    = (entry.context ?? '').trim() || null;
  const comparison = (entry.comparison ?? '').trim() || null;
  return context || comparison ? { context, comparison } : null;
}
