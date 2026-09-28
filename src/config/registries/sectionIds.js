/**
 * FILE: sectionIds.js
 *
 * Code handles for the few sections that have their own layout file under
 * /config/sections/. Every other section id lives only in the copy deck's
 * Sections tab (content/copy/sections.csv).
 *
 * Each value here must match an Id in content/copy/sections.csv —
 * `npm run copy` fails if one doesn't.
 */

export const NEIGHBORHOOD_OVERVIEW_ID   = 'neighborhood-overview';
export const AVERTABLE_DEATHS_ID        = 'avertable-deaths';
export const HEALTH_OUTCOMES_ID         = 'health-outcomes';
