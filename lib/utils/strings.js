/**
 * FILE: strings.js
 *
 * Shared string utility functions.
 */

/**
 * Converts a string to title case.
 * e.g. "MANHATTAN" → "Manhattan", "staten island" → "Staten Island"
 *
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
