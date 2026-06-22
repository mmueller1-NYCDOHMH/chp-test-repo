/**
 * FILE: glossary.js
 *
 * PURPOSE:
 * Plain-language definitions for health data terms used in chart subtitles,
 * indicator descriptions, and section headers.
 *
 * Used by GlossaryTerm.jsx to render inline tooltips. Each key is a term
 * exactly as it appears in the UI (case-insensitive match at render time).
 */

// All keys are lowercase — matching is case-insensitive via .toLowerCase() at parse time.
export const glossary = {
  'age-adjusted rate': {
    short: 'A rate adjusted to remove the effect of age differences between populations, so comparisons across neighborhoods are fair.',
  },
  'age-adjusted': {
    short: 'Adjusted to account for age differences between populations, allowing fair comparisons across neighborhoods.',
  },
  'per 100,000': {
    short: 'Expressed per 100,000 people — a standard way to compare rates across places with different population sizes.',
  },
  'per 1,000': {
    short: 'Expressed per 1,000 people — a standard way to compare rates across places with different population sizes.',
  },
  'bmi ≥ 30': {
    short: 'Body Mass Index of 30 or above — the clinical threshold used to classify obesity in adults.',
  },
  'community district': {
    short: 'One of NYC\'s 59 officially designated geographic planning units, each with its own Community Board.',
  },
  'community districts': {
    short: 'NYC\'s 59 officially designated geographic planning units, each with its own Community Board.',
  },
  'limited english proficiency': {
    short: 'People who reported speaking English less than "very well" on the American Community Survey.',
  },
  'premature death': {
    short: 'Death occurring before age 65 — used as a measure of preventable mortality.',
  },
  'low birthweight': {
    short: 'A birth weight below 5 lbs 8 oz (2,500 grams) — associated with health risks for infants.',
  },
  'preterm birth': {
    short: 'Birth occurring before 37 weeks of pregnancy.',
  },
};

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
    const lc = part.toLowerCase();
    const entry = glossary[lc];
    if (entry) return { term: part, definition: entry.short };
    return part;
  }).filter(p => p !== '');
}
