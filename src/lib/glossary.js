/**
 * FILE: glossary.js
 *
 * PURPOSE:
 * Loads glossary terms and provides the parseGlossaryTerms utility.
 *
 * EDITING GLOSSARY TERMS:
 * Terms and definitions live in /content/glossary.json — edit that file
 * directly. No code changes needed to add, remove, or update a term.
 *
 * This file only contains the parsing logic that turns plain subtitle
 * strings into glossary-linked segments for GlossaryTerm.jsx.
 */

import glossaryData from '../../content/glossary.json';

// Strip the internal _note key; export only the term entries.
const { _note: _removed, ...glossaryTerms } = glossaryData;

// Re-export for any consumer that needs direct access to the raw terms object.
export const glossary = glossaryTerms;

/**
 * Parse a string and return an array of segments — alternating plain strings
 * and { term, definition } objects for matched glossary terms.
 * Case-insensitive match. Returns the original string as a single segment
 * if no terms are found.
 *
 * @param {string} text
 * @returns {Array<string | { term: string, definition: string }>}
 */
export function parseGlossaryTerms(text) {
  if (!text) return [text];

  // Sort by length descending so longer phrases match before shorter substrings
  const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);

  // Build one regex to find any term
  const pattern = new RegExp(
    `(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );

  const parts = text.split(pattern);

  return parts.map(part => {
    const lc    = part.toLowerCase();
    const entry = glossary[lc];
    if (entry) return { term: part, definition: entry.short };
    return part;
  }).filter(p => p !== '');
}
