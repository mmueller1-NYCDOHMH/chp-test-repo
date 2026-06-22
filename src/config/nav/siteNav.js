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
  AVERTABLE_DEATHS_ID,
  SUBSTANCE_USE_ID,
  MENTAL_WELLNESS_ID,
  ENVIRONMENTAL_RISK_ID,
  FOOD_ENVIRONMENT_ID,
  HOUSING_QUALITY_ID,
  TRANSPORTATION_SAFETY_ID,
  HEALTH_CARE_ACCESS_ID,
  HEALTH_CARE_USE_ID,
  PREVENTION_ID,
  MATERNAL_ID,
  INFANT_CHILD_ID,
  CHRONIC_CONDITIONS_ID,
  INFECTIOUS_DISEASE_ID,
  HEALTH_OUTCOMES_ID,
} from '../registries/sectionIds';

export const siteNav = [

  // ── 1. Social & Economic Wellness ─────────────────────────────────────────
  {
    id: 'social-economic',
    label: 'Social & Economic Wellness',
    anchor: '#cat-social-economic',
    subcategories: [
      { id: COMMUNITY_SAFETY_ID,  label: 'Community Safety',  anchor: `#${COMMUNITY_SAFETY_ID}` },
      { id: ECONOMIC_ID,          label: 'Economic',          anchor: `#${ECONOMIC_ID}` },
      { id: AVERTABLE_DEATHS_ID,  label: 'Avertable Deaths',  anchor: `#${AVERTABLE_DEATHS_ID}` },
      { id: SUBSTANCE_USE_ID,     label: 'Substance Use',     anchor: `#${SUBSTANCE_USE_ID}` },
      { id: MENTAL_WELLNESS_ID,   label: 'Mental Wellness',   anchor: `#${MENTAL_WELLNESS_ID}` },
    ],
  },

  // ── 2. Neighborhood ────────────────────────────────────────────────────────
  {
    id: 'neighborhood',
    label: 'Neighborhood',
    anchor: '#cat-neighborhood',
    subcategories: [
      { id: ENVIRONMENTAL_RISK_ID,    label: 'Environmental Risk',    anchor: `#${ENVIRONMENTAL_RISK_ID}` },
      { id: FOOD_ENVIRONMENT_ID,      label: 'Food Environment',      anchor: `#${FOOD_ENVIRONMENT_ID}` },
      { id: HOUSING_QUALITY_ID,       label: 'Housing Quality',       anchor: `#${HOUSING_QUALITY_ID}` },
      { id: TRANSPORTATION_SAFETY_ID, label: 'Transportation Safety', anchor: `#${TRANSPORTATION_SAFETY_ID}` },
    ],
  },

  // ── 3. Health Care ─────────────────────────────────────────────────────────
  {
    id: 'health-care',
    label: 'Health Care',
    anchor: '#cat-health-care',
    subcategories: [
      { id: HEALTH_CARE_ACCESS_ID, label: 'Access',     anchor: `#${HEALTH_CARE_ACCESS_ID}` },
      { id: HEALTH_CARE_USE_ID,    label: 'Use',        anchor: `#${HEALTH_CARE_USE_ID}` },
      { id: PREVENTION_ID,         label: 'Prevention', anchor: `#${PREVENTION_ID}` },
    ],
  },

  // ── 4. Family Health ───────────────────────────────────────────────────────
  {
    id: 'family-health',
    label: 'Family Health',
    anchor: '#cat-family-health',
    subcategories: [
      { id: MATERNAL_ID,     label: 'Maternal',      anchor: `#${MATERNAL_ID}` },
      { id: INFANT_CHILD_ID, label: 'Infant & Child', anchor: `#${INFANT_CHILD_ID}` },
    ],
  },

  // ── 5. Diseases & Outcomes ─────────────────────────────────────────────────
  {
    id: 'diseases-outcomes',
    label: 'Diseases & Outcomes',
    anchor: '#cat-diseases-outcomes',
    subcategories: [
      { id: CHRONIC_CONDITIONS_ID, label: 'Chronic Conditions', anchor: `#${CHRONIC_CONDITIONS_ID}` },
      { id: INFECTIOUS_DISEASE_ID, label: 'Infectious Disease', anchor: `#${INFECTIOUS_DISEASE_ID}` },
      { id: HEALTH_OUTCOMES_ID,    label: 'Health Outcomes',    anchor: `#${HEALTH_OUTCOMES_ID}` },
    ],
  },

];
