/**
 * FILE: formatGeography.js
 *
 * PURPOSE:
 * String formatting utilities for geography names.
 *
 * RESPONSIBILITIES:
 * - Strip community district suffixes (e.g. "(BX9)") from geography strings
 * - Normalize punctuation for natural prose reading
 *
 * NOTES:
 * - Pure functions, no dependencies
 * - Safe to use in both server and client components
 */

/**
 * Converts a raw geography label like "Parkchester & Soundview (BX9)"
 * into a clean prose name: "Parkchester and Soundview".
 *
 * @param {string} geography — raw Geography field value from indicator data
 * @returns {string}
 */
export function displayName(geography) {
  return geography
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/&/g, 'and')
    .trim();
}

/**
 * Community district number within its borough (e.g. 5 for geoId 305).
 * Falls back to deriving it from geoId when cdNumber isn't on the object.
 *
 * @param {{ cdNumber?: number, geoId?: number }} n — neighborhood
 * @returns {number|null}
 */
export function cdNumberOf(n) {
  if (Number.isFinite(n?.cdNumber)) return n.cdNumber;
  if (Number.isFinite(n?.geoId))    return n.geoId % 100;
  return null;
}

/**
 * Sort comparator: ascending community district number, name as tiebreak.
 * Used inside each borough group of the neighborhood dropdowns.
 */
export function byCdNumber(a, b) {
  const ca = cdNumberOf(a) ?? Infinity;
  const cb = cdNumberOf(b) ?? Infinity;
  return ca - cb || a.name.localeCompare(b.name);
}

/**
 * Parenthetical district label shown after a neighborhood name in lists,
 * e.g. "(CD 5)". Empty string when the number is unknown.
 */
export function cdLabel(n) {
  const cd = cdNumberOf(n);
  return cd == null ? '' : `(CD ${cd})`;
}

// Words that describe a district number rather than name a place.
const CD_FILLER = new Set(['cd', 'community', 'district', 'board', 'cb', 'no', 'number']);

/**
 * Search predicate for the neighborhood dropdowns. Every word of the query
 * must match the neighborhood:
 *   - a number ("5", "cd5", "#5") must equal its community district number
 *   - any other word must appear in its name or borough
 * So "5", "CD 5", "(CD 5)", "community district 5" and "brooklyn 5" all work,
 * alongside plain name/borough searches.
 *
 * @param {{ name: string, borough: string, cdNumber?: number, geoId?: number }} n
 * @param {string} query — raw user input
 * @returns {boolean}
 */
export function matchesNeighborhoodQuery(n, query) {
  const q = String(query ?? '').toLowerCase().trim();
  if (!q) return true;

  // Fast path keeps the original behavior for name / borough substrings
  // (including names with punctuation, e.g. "st. george").
  const name    = n.name.toLowerCase();
  const borough = n.borough.toLowerCase();
  if (name.includes(q) || borough.includes(q)) return true;

  const tokens = q.replace(/[()#.,]/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  const cd = cdNumberOf(n);
  return tokens.every(tok => {
    const num = tok.match(/^(?:cd|cb)?0*(\d{1,2})$/);
    if (num) return cd === parseInt(num[1], 10);
    if (CD_FILLER.has(tok)) return true;
    // Partially typed filler ("commu", "distr") shouldn't blank the list
    if (tok.length >= 2 && [...CD_FILLER].some(w => w.startsWith(tok))) return true;
    return name.includes(tok) || borough.includes(tok);
  });
}
