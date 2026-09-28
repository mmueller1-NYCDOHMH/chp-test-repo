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
