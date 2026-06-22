/**
 * FILE: indicators/healthCareUse.js
 *
 * PURPOSE:
 * Indicator definitions for the Use subcategory,
 * under the Health Care nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/healthCareUse.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { HEALTH_CARE_USE_ID } from '../sectionIds';

export const healthCareUseIndicators = {

  avoidableHospitalizations: {
    key:            'avoidable-hospitalizations',
    topic:          HEALTH_CARE_USE_ID,
    title:          'Avoidable Hospitalizations',
    subtitle:       'Rate of hospitalizations for conditions manageable with primary care, per 100,000 residents',
    source:         'Source: NYC SPARCS / DOHMH',
    timePeriod:     'TBD',
    label:          'Avoidable Hospitalizations',
    unit:           'per 100k residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  fallRelatedHospitalizations: {
    key:            'fall-related-hospitalizations',
    topic:          HEALTH_CARE_USE_ID,
    title:          'Fall-Related Hospitalizations',
    subtitle:       'Rate of hospitalizations due to falls per 100,000 adults ages 65+',
    source:         'Source: NYC SPARCS / DOHMH',
    timePeriod:     'TBD',
    label:          'Fall-Related Hospitalizations',
    unit:           'per 100k adults 65+',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  psychiatricHospitalizations: {
    key:            'psychiatric-hospitalizations',
    topic:          HEALTH_CARE_USE_ID,
    title:          'Psychiatric Hospitalizations',
    subtitle:       'Rate of psychiatric hospitalizations per 100,000 residents',
    source:         'Source: NYC SPARCS / DOHMH',
    timePeriod:     'TBD',
    label:          'Psychiatric Hospitalizations',
    unit:           'per 100k residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

};
