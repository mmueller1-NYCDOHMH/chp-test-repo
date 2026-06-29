/**
 * FILE: searchIndex.js
 *
 * Builds a flat, searchable list of all indicators from their meta.json files.
 * Safe for client and server bundles — uses static JSON imports, no fs.
 *
 * To add a new indicator to search:
 *   1. Create /content/indicators/{key}.meta.json
 *   2. Add one import line to /src/config/indicatorMeta.js
 *   → Appears in search automatically. No changes needed here.
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

import { indicatorMeta } from './indicatorMeta';
import { siteNav }       from './nav/siteNav';

// Build a flat lookup: sectionId → { categoryLabel, subcategoryLabel, anchor }
const sectionMap = {};
siteNav.forEach(category => {
  category.subcategories
    .filter(sub => !sub.dummy)
    .forEach(sub => {
      sectionMap[sub.id] = {
        categoryLabel:    category.label,
        subcategoryLabel: sub.label,
        anchor:           sub.anchor,
      };
    });
});

export const searchIndex = Object.values(indicatorMeta)
  .filter(ind => sectionMap[ind.topic])   // skip indicators not in a live section
  .map(ind => ({
    key:              ind.key,
    title:            ind.title,
    subtitle:         ind.subtitle ?? '',
    indicatorAnchor:  `#indicator-${ind.key}`,
    anchor:           sectionMap[ind.topic].anchor,
    categoryLabel:    sectionMap[ind.topic].categoryLabel,
    subcategoryLabel: sectionMap[ind.topic].subcategoryLabel,
  }));
