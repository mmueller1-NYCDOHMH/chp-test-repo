import { siteNav } from '@/config/nav/siteNav';

/**
 * FILE: resolveCategoryLabel.js
 *
 * Given a section ID dispatched by chp:section-activated, return the
 * top-level siteNav category label (e.g. "Health conditions"). Handles
 * both subcategory IDs (e.g. "chronic-conditions") and category anchor IDs
 * (e.g. "cat-health-conditions" → strips prefix, matches by id). Returns
 * null if the id doesn't map to any known category. Part of the
 * 2026-09-04 split of Sidebar.jsx.
 */
export function resolveCategoryLabel(sectionId) {
  // Category-level click: id = 'cat-{categoryId}'
  if (sectionId.startsWith('cat-')) {
    const catId = sectionId.slice(4); // strip 'cat-'
    return siteNav.find(c => c.id === catId)?.label ?? null;
  }
  // Subcategory-level click: find which category owns this section id
  for (const cat of siteNav) {
    if (cat.subcategories.some(sub => sub.id === sectionId)) {
      return cat.label;
    }
  }
  return null;
}
