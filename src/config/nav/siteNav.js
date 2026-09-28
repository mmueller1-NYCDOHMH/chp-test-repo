/**
 * FILE: siteNav.js
 *
 * PURPOSE:
 * The two-level navigation structure for CHP pages (categories →
 * subcategories), used by TopicNav, the sidebar, search and the page config.
 *
 * 2026-09-26: GENERATED FROM THE COPY DECK. Categories, sections, their
 * labels and their ORDER all come from content/copy/measure-copy.csv (via
 * content/copy/structure.json, written by `npm run copy`) — the Section
 * column is the category, the Subsection column is the section, and sheet
 * row order is nav order. Nothing to edit here to add, rename or reorder a
 * section: change the sheet.
 *
 * Bespoke sections that sit inside another section (e.g. Avertable Deaths
 * under Economic) are not nav entries, same as before.
 *
 * Shape: [{ id, label, anchor, contentSlug, intro, subcategories: [{ id, label, anchor }] }]
 *   intro = the category intro paragraph (the sheet's category intro row)
 */

import structure from '../../../content/copy/structure.json';

export const siteNav = structure.categories.map(cat => ({
  id:          cat.id,
  label:       cat.label,
  anchor:      `#cat-${cat.id}`,
  contentSlug: cat.id,
  intro:       cat.intro ?? '',
  subcategories: cat.sections.map(sec => ({
    id:     sec.id,
    label:  sec.label,
    anchor: `#${sec.id}`,
  })),
}));
