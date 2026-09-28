/**
 * FILE: pageRegistry.js
 *
 * PURPOSE:
 * Central registry for all page level configs used in the CHP system.
 *
 * DESCRIPTION:
 * Maps page identifiers to their corresponding config objects.
 * These configs define the structure, layout, and content of each page.
 *
 * EXAMPLE:
 * 'neighborhood-profile' → neighborhoodProfile config
 *
 * USAGE:
 * Imported by route-level files (e.g. /app/neighborhood/[id]/page.js)
 * to select which page configuration to render.
 *
 * DATA FLOW:
 * route → pageRegistry → config → CHPBuilder → UI
 *
 * RESPONSIBILITIES:
 * - Provide a single source of truth for available page types
 * - Decouple routing logic from page structure
 * - Enable scalable addition of new page types
 *
 * NOTES:
 * - Each entry must map to a valid config object
 * - Configs are consumed by CHPBuilder and should contain no logic
 * - The root route (/) redirects to a default neighborhood; there is no
 *   standalone landing page config.
 *
 * FUTURE CONSIDERATIONS:
 * - Dynamic config loading (e.g. CMS or API-driven)
 * - Route-based config selection (e.g. based on params or query)
 */

import { neighborhoodProfile } from '../pages/neighborhoodProfile';

export const pageRegistry = {
  'neighborhood-profile': neighborhoodProfile,
};