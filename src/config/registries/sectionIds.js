/**
 * FILE: sectionIds.js
 *
 * PURPOSE:
 * Single source of truth for all section ID strings.
 *
 * DESCRIPTION:
 * These constants are used in three places that must stay in sync:
 *   1. Section configs    — the `id` field that becomes the DOM anchor
 *   2. Indicator registry — the `topic` field that records which section
 *                           an indicator primarily belongs to
 *   3. siteNav.js         — subcategory `id` and `anchor` fields that
 *                           drive scroll-spy and dropdown navigation
 *
 * Defining them here as named constants means a section rename is a
 * single edit in one file, caught as a compile error everywhere else,
 * rather than a silent string-mismatch that breaks scroll-spy.
 *
 * RULES:
 * - No imports. This file has zero dependencies so it can be safely
 *   imported by anything without creating circular references.
 * - Uncommented constants = section file exists and is wired into the page.
 * - Commented-out constants = planned but not yet built. Uncomment when
 *   the section config file is created.
 * - The constant value must exactly match the `id` field in the
 *   corresponding section config.
 *
 * ADDING A NEW SECTION (5-step recipe):
 * 1. Uncomment (or add) its constant here
 * 2. Create /config/sections/{sectionName}.js
 * 3. Create /config/registries/indicators/{sectionName}.js
 * 4. Import + spread in indicatorRegistry.js
 * 5. Import + add to neighborhoodProfile.js; remove dummy:true in siteNav.js
 */


// ── Neighborhood Overview ────────────────────────────────────────────────────
export const NEIGHBORHOOD_OVERVIEW_ID = 'neighborhood-overview';


// ── Social & Economic Wellness ───────────────────────────────────────────────
export const COMMUNITY_SAFETY_ID   = 'community-safety';
export const ECONOMIC_ID           = 'economic-conditions';
export const AVERTABLE_DEATHS_ID   = 'avertable-deaths';
export const SUBSTANCE_USE_ID      = 'substance-use';
export const MENTAL_WELLNESS_ID    = 'mental-wellness';


// ── Neighborhood ──────────────────────────────────────────────────────────────
export const ENVIRONMENTAL_RISK_ID    = 'environmental-risk';
export const FOOD_ENVIRONMENT_ID      = 'food-environment';
export const HOUSING_QUALITY_ID       = 'housing-quality';
export const TRANSPORTATION_SAFETY_ID = 'transportation-safety';


// ── Health Care ───────────────────────────────────────────────────────────────
export const HEALTH_CARE_ACCESS_ID = 'health-care-access';
export const HEALTH_CARE_USE_ID    = 'health-care-use';
export const PREVENTION_ID         = 'prevention';


// ── Family Health ─────────────────────────────────────────────────────────────
export const MATERNAL_ID     = 'maternal';
export const INFANT_CHILD_ID = 'infant-child';


// ── Diseases & Outcomes ───────────────────────────────────────────────────────
export const CHRONIC_CONDITIONS_ID  = 'chronic-conditions';
export const INFECTIOUS_DISEASE_ID  = 'infectious-disease';
export const HEALTH_OUTCOMES_ID     = 'health-outcomes';
