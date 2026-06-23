/**
 * FILE: indicatorRegistry.js
 *
 * PURPOSE:
 * Barrel file that assembles the full indicator registry from topic-scoped
 * files and exports the shared helper functions.
 *
 * DESCRIPTION:
 * Indicator definitions live in /config/registries/indicators/{topic}.js,
 * one file per subcategory section. This file merges them into the single
 * `indicators` object that section configs import.
 *
 * The file names here mirror the section config files and sectionIds constants:
 *   indicators/demographics.js            ↔  sections/neighborhoodOverview.js    ↔  NEIGHBORHOOD_OVERVIEW_ID
 *   indicators/communitySafety.js         ↔  sections/communitySafety.js         ↔  COMMUNITY_SAFETY_ID
 *   indicators/economicConditions.js      ↔  sections/economicConditions.js      ↔  ECONOMIC_ID
 *   indicators/avertableDeaths.js         ↔  sections/avertableDeaths.js         ↔  AVERTABLE_DEATHS_ID
 *   indicators/substanceUse.js            ↔  sections/substanceUse.js            ↔  SUBSTANCE_USE_ID
 *   indicators/mentalWellness.js          ↔  sections/mentalWellness.js          ↔  MENTAL_WELLNESS_ID
 *   indicators/environmentalRisk.js       ↔  sections/environmentalRisk.js       ↔  ENVIRONMENTAL_RISK_ID
 *   indicators/foodEnvironment.js         ↔  sections/foodEnvironment.js         ↔  FOOD_ENVIRONMENT_ID
 *   indicators/housingQuality.js          ↔  sections/housingQuality.js          ↔  HOUSING_QUALITY_ID
 *   indicators/transportationSafety.js    ↔  sections/transportationSafety.js    ↔  TRANSPORTATION_SAFETY_ID
 *   indicators/healthCareAccess.js        ↔  sections/healthCareAccess.js        ↔  HEALTH_CARE_ACCESS_ID
 *   indicators/healthCareUse.js           ↔  sections/healthCareUse.js           ↔  HEALTH_CARE_USE_ID
 *   indicators/prevention.js              ↔  sections/prevention.js              ↔  PREVENTION_ID
 *   indicators/maternal.js                ↔  sections/maternal.js                ↔  MATERNAL_ID
 *   indicators/infantChild.js             ↔  sections/infantChild.js             ↔  INFANT_CHILD_ID
 *   indicators/chronicConditions.js       ↔  sections/chronicConditions.js       ↔  CHRONIC_CONDITIONS_ID
 *   indicators/infectiousDisease.js       ↔  sections/infectiousDisease.js       ↔  INFECTIOUS_DISEASE_ID
 *   indicators/healthOutcomes.js          ↔  sections/healthOutcomes.js          ↔  HEALTH_OUTCOMES_ID
 *
 * ADDING A NEW SUBCATEGORY:
 * 1. Create /config/registries/indicators/{topicName}.js
 * 2. Import and spread it into `indicators` below (in page order)
 * 3. Add the section ID constant to sectionIds.js if it doesn't exist yet
 *
 * ADDING AN INDICATOR TO AN EXISTING TOPIC:
 * Edit the relevant /config/registries/indicators/{topicName}.js file.
 * No changes needed here.
 *
 * FIELDS (on each indicator entry):
 *   key             — matches the data file name in /data/indicators/ (no extension)
 *   topic           — section ID this indicator belongs to;
 *                     must match a constant in /config/registries/sectionIds.js
 *   title           — full display title used in chart headers
 *   subtitle        — descriptor shown under the chart title (method, population, unit)
 *   source          — full source citation string
 *   timePeriod      — data collection period shown in tooltips / notes
 *   label           — short label used in stat tiles and hero panels
 *   unit            — sub-label shown under the value in stat tiles (e.g. 'of adults')
 *   displaySuffix   — appended to the indicator's DisplayValue (e.g. ' yrs', '')
 *   deltaSuffix     — appended to the computed delta vs citywide (e.g. ' pts', ' yrs')
 *   decimals        — decimal places for the delta value
 *   higherIsBetter  — true = higher value is healthier (controls delta color direction)
 */

import { demographicIndicators }          from './indicators/demographics';
import { communitySafetyIndicators }      from './indicators/communitySafety';
import { economicIndicators }             from './indicators/economicConditions';
import { avertableDeathsIndicators }      from './indicators/avertableDeaths';
import { substanceUseIndicators }         from './indicators/substanceUse';
import { mentalWellnessIndicators }       from './indicators/mentalWellness';
import { environmentalRiskIndicators }    from './indicators/environmentalRisk';
import { foodEnvironmentIndicators }      from './indicators/foodEnvironment';
import { housingQualityIndicators }       from './indicators/housingQuality';
import { transportationSafetyIndicators } from './indicators/transportationSafety';
import { healthCareAccessIndicators }     from './indicators/healthCareAccess';
import { healthCareUseIndicators }        from './indicators/healthCareUse';
import { preventionIndicators }           from './indicators/prevention';
import { maternalIndicators }             from './indicators/maternal';
import { infantChildIndicators }          from './indicators/infantChild';
import { chronicConditionIndicators }     from './indicators/chronicConditions';
import { infectiousDiseaseIndicators }    from './indicators/infectiousDisease';
import { healthOutcomeIndicators }        from './indicators/healthOutcomes';

// ── Combined registry ─────────────────────────────────────────────────────
// Spread topic objects in page order (matches neighborhoodProfile.js sections array).
// Each topic file is independently maintainable as the indicator count grows.
export const indicators = {
  ...demographicIndicators,
  // Social & Economic Wellness
  ...communitySafetyIndicators,
  ...economicIndicators,
  ...avertableDeathsIndicators,
  ...substanceUseIndicators,
  ...mentalWellnessIndicators,
  // Neighborhood
  ...environmentalRiskIndicators,
  ...foodEnvironmentIndicators,
  ...housingQualityIndicators,
  ...transportationSafetyIndicators,
  // Health Care
  ...healthCareAccessIndicators,
  ...healthCareUseIndicators,
  ...preventionIndicators,
  // Family Health
  ...maternalIndicators,
  ...infantChildIndicators,
  // Diseases & Outcomes
  ...chronicConditionIndicators,
  ...infectiousDiseaseIndicators,
  ...healthOutcomeIndicators,
};

// ── Helper: asChartConfig ─────────────────────────────────────────────────
/**
 * Returns the shape expected by indicatorChartGrid blocks.
 * Use this in chart grid section configs.
 *
 * @param {object} indicator - An entry from the indicators registry
 * @returns {{ indicatorKey, title, subtitle, source }}
 */
export function asChartConfig(indicator) {
  return {
    indicatorKey: indicator.key,
    title:        indicator.title,
    subtitle:     indicator.subtitle,
    source:       indicator.source,
    // Optional — shown in the indicator flyout panel
    sourceUrl:    indicator.sourceUrl    ?? null,
    description:  indicator.description ?? null,
  };
}

// ── Helper: asStatTile ────────────────────────────────────────────────────
/**
 * Returns the shape expected by neighborhoodOverviewHero statTiles.
 * Use this in overview / hero section configs.
 *
 * @param {object} indicator - An entry from the indicators registry
 * @returns {{ indicatorKey, label, unit, displaySuffix, deltaSuffix, decimals, higherIsBetter }}
 */
export function asStatTile(indicator) {
  return {
    indicatorKey:   indicator.key,
    label:          indicator.label,
    unit:           indicator.unit,
    displaySuffix:  indicator.displaySuffix,
    deltaSuffix:    indicator.deltaSuffix,
    decimals:       indicator.decimals,
    higherIsBetter: indicator.higherIsBetter,
    // Distribution tiles (age, race/ethnicity) carry these extras;
    // single-value indicators leave them undefined.
    kind:           indicator.kind,
    segments:       indicator.segments,
    // Some indicators (e.g. raw population counts) suppress the delta badge.
    showDelta:      indicator.showDelta,
  };
}

// ── Helper: asPyramidChart ────────────────────────────────────────────────
/**
 * Returns the shape expected by neighborhoodOverviewHero pyramidCharts.
 *
 * @param {object} indicator - A distribution entry from the indicators registry
 * @returns {{ indicatorKey, title, segments }}
 */
export function asPyramidChart(indicator) {
  return {
    indicatorKey: indicator.key,
    title:        indicator.title,
    segments:     indicator.segments,
  };
}
