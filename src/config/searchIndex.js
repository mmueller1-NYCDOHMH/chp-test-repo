/**
 * FILE: searchIndex.js
 *
 * Builds a flat, searchable list of all indicators from the copy deck
 * (content/copy/indicatorCopy.json, via indicatorCopy.js).
 * Safe for client and server bundles — uses static JSON imports, no fs.
 *
 * To add an indicator to search: give it a Key in content/copy/measure-copy.csv.
 * Nothing to change here.
 *
 * Shape of each entry:
 *   key              — indicator data file key
 *   title            — full display title
 *   subtitle         — unit / method descriptor
 *   indicatorAnchor  — href anchor for the specific indicator card
 *   anchor           — href anchor for the section (fallback)
 *   categoryLabel    — top-level nav category
 *   subcategoryLabel — subcategory label
 */

import { indicatorCopy, indicatorCopyUnmapped } from './indicatorCopy';
import { siteNav }       from './nav/siteNav';
import { NEIGHBORHOOD_OVERVIEW_ID } from './registries/sectionIds';

// Build a flat lookup: sectionId → { categoryLabel, subcategoryLabel, anchor }
// At a glance isn't a nav category, so it's added by hand (first, to match
// page order — search groups results in insertion order).
const sectionMap = {
  [NEIGHBORHOOD_OVERVIEW_ID]: {
    categoryLabel:    'At a glance',
    subcategoryLabel: 'At a glance',
    anchor:           `#${NEIGHBORHOOD_OVERVIEW_ID}`,
  },
};
siteNav.forEach(category => {
  category.subcategories.forEach(sub => {
    sectionMap[sub.id] = {
      categoryLabel:    category.label,
      subcategoryLabel: sub.label,
      anchor:           sub.anchor,
    };
  });
});

// A copy-deck row → search entry. navSection (from build-copy) is the sheet
// section; bespoke rows (e.g. avertable-death, topic 'avertable-deaths') are
// folded into that section on the page, so it's also the right anchor.
// Keys drawn inside another key's card (no card id of their own) → the card
// id to scroll to. Education levels share one split bar chart (2026-09-29).
const ANCHOR_ALIASES = {
  'edu-did-not-complete-hs': 'edu-college-degree-and-higher',
  'edu-hsgrad-some-college': 'edu-college-degree-and-higher',
};

function toEntry(row, key) {
  const sec = sectionMap[row.navSection ?? row.topic];
  if (!sec) return null;                  // not in a live section
  return {
    key,
    title:            row.measure,
    subtitle:         row.context ?? '',
    indicatorAnchor:  `#indicator-${ANCHOR_ALIASES[key] ?? key}`,
    anchor:           sec.anchor,
    categoryLabel:    sec.categoryLabel,
    subcategoryLabel: sec.subcategoryLabel,
  };
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Keyless rows that ARE on the page via a bespoke block (e.g. "Top causes of
// premature death" — FLAG "design in progress") are searchable too; rows the
// sheet flags NOT IN SITE are not.
// Their cards render with the data file's key as the card id (see
// PrematureDeathOverviewSection.jsx), so map the sheet's Measure to it here;
// an unmapped row still works, it just lands on its section.
const BESPOKE_CARD_KEYS = {
  'Top causes of premature death':               'premature-mort-cause-rate',
  'Top causes of cancer-related premature death': 'cancer-rank-rate',
};
const liveUnkeyed = (indicatorCopyUnmapped ?? [])
  .filter(row => row.measure && !/not in site/i.test(row.flag ?? ''))
  .map(row => toEntry(row, BESPOKE_CARD_KEYS[row.measure] ?? `planned-${slug(row.measure)}`));

export const searchIndex = [
  ...Object.values(indicatorCopy).map(ind => toEntry(ind, ind.key)),
  ...liveUnkeyed,
].filter(Boolean);
