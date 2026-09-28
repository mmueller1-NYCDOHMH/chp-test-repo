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
 * status column any more — every keyed row renders, EXCEPT rows whose FLAG
 * says "design in progress" (their bespoke tokens aren't wired yet); those
 * fall back to the card's plain subtitle.
 */

import { indicatorCopy } from '@/config/indicatorCopy';

const HOLD_FLAGS = /design in progress/i;

/** Full copy-deck row for one key, or null. */
export function getNarrativeCopy(key) {
  if (!key) return null;
  return indicatorCopy[key] ?? null;
}

/**
 * Context + Comparison as one template string, or null when the row is held
 * or has no copy. Callers: `resolveNarrative(getReadyNarrativeTemplate(key)) ?? subtitle`.
 *
 * @param {string} key
 * @returns {string|null}
 */
export function getReadyNarrativeTemplate(key) {
  const entry = getNarrativeCopy(key);
  if (!entry || HOLD_FLAGS.test(entry.flag ?? '')) return null;
  const template = [entry.context, entry.comparison].filter(Boolean).join(' ').trim();
  return template || null;
}
