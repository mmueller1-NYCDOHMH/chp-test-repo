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
 * ADDING A NEW SECTION (3-step recipe):
 * 1. Add (or uncomment) its constant here
 * 2. Add the constant to siteNav.js (with anchor) and remove dummy:true
 * 3. Add buildStandardSection(CONSTANT) in neighborhoodProfile.js at the right position
 *    — indicator list goes in /content/sections/{id}.json (no JS changes)
 *    — indicator metadata goes in /content/indicators/{key}.meta.json
 *    — indicator data goes in /data/indicators/{key}.json
 */


// ── Neighborhood Overview ────────────────────────────────────────────────────
export const NEIGHBORHOOD_OVERVIEW_ID = 'neighborhood-overview';


// ── Social ───────────────────────────────────────────────────────────────────
export const COMMUNITY_SAFETY_ID   = 'community-safety';
export const ECONOMIC_ID           = 'economic-conditions';
export const AVERTABLE_DEATHS_ID   = 'avertable-deaths'; // indicator under Economic; no standalone nav entry
export const EDUCATION_ID          = 'education';


// ── Neighborhood ──────────────────────────────────────────────────────────────
export const ENVIRONMENTAL_RISK_ID    = 'environmental-risk';
export const FOOD_ENVIRONMENT_ID      = 'food-environment';
export const HOUSING_QUALITY_ID       = 'housing-quality';
export const TRANSPORTATION_SAFETY_ID = 'transportation-safety';


// ── Health care ───────────────────────────────────────────────────────────────
export const HEALTH_CARE_ACCESS_ID       = 'health-care-access';
export const INJURY_HOSPITALIZATIONS_ID  = 'injury-hospitalizations';
export const PREVENTION_ID               = 'prevention';


// ── Maternal & child health ───────────────────────────────────────────────────
export const MATERNAL_ID     = 'maternal';
export const INFANT_CHILD_ID = 'infant-child';


// ── Mental health & substance use ─────────────────────────────────────────────
export const MENTAL_WELLNESS_ID     = 'mental-wellness';
export const SUBSTANCE_USE_ID       = 'substance-use';


// ── Health conditions ─────────────────────────────────────────────────────────
export const CHRONIC_CONDITIONS_ID  = 'chronic-conditions';
export const INFECTIOUS_DISEASE_ID  = 'infectious-disease';
export const HEALTH_OUTCOMES_ID     = 'health-outcomes';
