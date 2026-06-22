/**
 * FILE: searchIndex.js
 *
 * Builds a flat, searchable list of all indicators from the registry.
 * Each entry carries enough context for the search UI to display
 * a useful result and scroll to the right section on click.
 *
 * To add a new indicator to search: add it to its indicator registry file
 * and section config as normal — it will appear here automatically.
 *
 * Shape of each entry:
 *   key              — indicator data file key
 *   title            — full display title
 *   subtitle         — unit / method descriptor
 *   indicatorAnchor  — href anchor for the specific indicator card (e.g. '#indicator-incarcerations')
 *   anchor           — href anchor for the section (e.g. '#community-safety') — fallback
 *   categoryLabel    — top-level nav category (e.g. 'Social & Economic Conditions')
 *   subcategoryLabel — subcategory label (e.g. 'Community & Safety')
 */

import { indicators }  from './registries/indicatorRegistry';
import { siteNav }     from './nav/siteNav';

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

export const searchIndex = Object.values(indicators)
  .filter(ind => sectionMap[ind.topic])   // skip indicators in non-existent sections
  .map(ind => ({
    key:              ind.key,
    title:            ind.title,
    subtitle:         ind.subtitle ?? '',
    // indicatorAnchor targets the specific card; anchor is the section fallback
    indicatorAnchor:  `#indicator-${ind.key}`,
    anchor:           sectionMap[ind.topic].anchor,
    categoryLabel:    sectionMap[ind.topic].categoryLabel,
    subcategoryLabel: sectionMap[ind.topic].subcategoryLabel,
  }));
