/**
 * FILE: siteNav.js
 *
 * PURPOSE:
 * Defines the two-level navigation structure for CHP pages.
 *
 * DESCRIPTION:
 * Each entry is a top-level category with a list of subcategories.
 * Subcategories with `anchor` values matching a real section id will
 * scroll to that section and participate in scroll-spy active state.
 * Subcategories marked `dummy: true` are prototype placeholders — they
 * appear in the nav but do not scroll anywhere and are styled as
 * "coming soon". Remove the `dummy` flag when the section is built.
 *
 * ADDING A SUBCATEGORY:
 * 1. Uncomment its constant in /config/registries/sectionIds.js
 * 2. Add an entry to the relevant category's `subcategories` array here
 * 3. Set `anchor` to `#${THE_CONSTANT}` and remove `dummy: true`
 *
 * ADDING A CATEGORY:
 * Add a new object to the top-level array. It will appear in the nav
 * in the order defined here.
 *
 * NOTES:
 * - Real (non-dummy) subcategory `id` and `anchor` values are derived from
 *   named constants in /config/registries/sectionIds.js. A rename is a
 *   single edit in sectionIds.js, caught as a compile error here and in the
 *   section file — not a silent scroll-spy breakage.
 * - Dummy subcategories (not yet implemented) use inline string literals.
 *   Replace them with constants once the section files exist.
 */

import {
  COMMUNITY_SAFETY_ID,
  ECONOMIC_ID,
  EDUCATION_ID,
  ENVIRONMENTAL_RISK_ID,
  FOOD_ENVIRONMENT_ID,
  HOUSING_QUALITY_ID,
  TRANSPORTATION_SAFETY_ID,
  HEALTH_CARE_ACCESS_ID,
  INJURY_HOSPITALIZATIONS_ID,
  PREVENTION_ID,
  MATERNAL_ID,
  INFANT_CHILD_ID,
  MENTAL_WELLNESS_ID,
  SUBSTANCE_USE_ID,
  CHRONIC_CONDITIONS_ID,
  INFECTIOUS_DISEASE_ID,
  HEALTH_OUTCOMES_ID,
} from '../registries/sectionIds';

export const siteNav = [

  // ── 1. Social ─────────────────────────────────────────────────────────────
  {
    id: 'social',
    label: 'Social',
    anchor: '#cat-social',
    contentSlug: 'social',     // matches /content/category-cards/{contentSlug}/
    subcategories: [
      { id: COMMUNITY_SAFETY_ID, label: 'Community & safety', anchor: `#${COMMUNITY_SAFETY_ID}` },
      { id: ECONOMIC_ID,         label: 'Economic',           anchor: `#${ECONOMIC_ID}` },
      { id: EDUCATION_ID,        label: 'Education',          anchor: `#${EDUCATION_ID}` },
    ],
  },

  // ── 2. Neighborhood ────────────────────────────────────────────────────────
  {
    id: 'neighborhood',
    label: 'Neighborhood',
    anchor: '#cat-neighborhood',
    contentSlug: 'neighborhood',
    subcategories: [
      { id: ENVIRONMENTAL_RISK_ID,    label: 'Environmental risk', anchor: `#${ENVIRONMENTAL_RISK_ID}` },
      { id: FOOD_ENVIRONMENT_ID,      label: 'Food',               anchor: `#${FOOD_ENVIRONMENT_ID}` },
      { id: HOUSING_QUALITY_ID,       label: 'Housing quality',    anchor: `#${HOUSING_QUALITY_ID}` },
      { id: TRANSPORTATION_SAFETY_ID, label: 'Transport & safety', anchor: `#${TRANSPORTATION_SAFETY_ID}` },
    ],
  },

  // ── 3. Health care ─────────────────────────────────────────────────────────
  {
    id: 'health-care',
    label: 'Health care',
    anchor: '#cat-health-care',
    contentSlug: 'health-care',
    subcategories: [
      { id: HEALTH_CARE_ACCESS_ID,      label: 'Access to care',            anchor: `#${HEALTH_CARE_ACCESS_ID}` },
      { id: INJURY_HOSPITALIZATIONS_ID, label: 'Injury & hospitalizations', anchor: `#${INJURY_HOSPITALIZATIONS_ID}` },
      { id: PREVENTION_ID,              label: 'Prevention',                anchor: `#${PREVENTION_ID}` },
    ],
  },

  // ── 4. Maternal & child health ─────────────────────────────────────────────
  {
    id: 'maternal-child-health',
    label: 'Maternal & child health',
    anchor: '#cat-maternal-child-health',
    contentSlug: 'maternal-child-health',
    subcategories: [
      { id: MATERNAL_ID,     label: 'Maternal',      anchor: `#${MATERNAL_ID}` },
      { id: INFANT_CHILD_ID, label: 'Infant & child', anchor: `#${INFANT_CHILD_ID}` },
    ],
  },

  // ── 5. Health conditions ───────────────────────────────────────────────────
  {
    id: 'health-conditions',
    label: 'Health conditions',
    anchor: '#cat-health-conditions',
    contentSlug: 'health-conditions',
    subcategories: [
      { id: MENTAL_WELLNESS_ID,    label: 'Mental health',      anchor: `#${MENTAL_WELLNESS_ID}` },
      { id: SUBSTANCE_USE_ID,      label: 'Substance use',      anchor: `#${SUBSTANCE_USE_ID}` },
      { id: CHRONIC_CONDITIONS_ID, label: 'Chronic conditions', anchor: `#${CHRONIC_CONDITIONS_ID}` },
      { id: INFECTIOUS_DISEASE_ID, label: 'Infectious disease', anchor: `#${INFECTIOUS_DISEASE_ID}` },
      { id: HEALTH_OUTCOMES_ID,    label: 'Health outcomes',    anchor: `#${HEALTH_OUTCOMES_ID}` },
    ],
  },

];
