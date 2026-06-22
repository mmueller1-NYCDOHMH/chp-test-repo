/**
 * FILE: indicators/healthCareAccess.js
 *
 * PURPOSE:
 * Indicator definitions for the Access subcategory,
 * under the Health Care nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/healthCareAccess.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { HEALTH_CARE_ACCESS_ID } from '../sectionIds';

export const healthCareAccessIndicators = {

  uninsured: {
    key:            'uninsured',
    topic:          HEALTH_CARE_ACCESS_ID,
    title:          'Without Health Insurance',
    subtitle:       '% of residents without health insurance coverage',
    source:         'Source: American Community Survey 5-Year Estimates',
    timePeriod:     'TBD',
    label:          'Uninsured',
    unit:           'of residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  unmetMedicalNeed: {
    key:            'unmet-medical-need',
    topic:          HEALTH_CARE_ACCESS_ID,
    title:          'Without Needed Medical Care',
    subtitle:       '% of adults who did not get medical care they needed in the past 12 months',
    source:         'Source: NYC Community Health Survey',
    timePeriod:     'TBD',
    label:          'Unmet Medical Need',
    unit:           'of adults',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

};
