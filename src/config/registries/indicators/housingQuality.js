/**
 * FILE: indicators/housingQuality.js
 *
 * PURPOSE:
 * Indicator definitions for the Housing Quality subcategory,
 * under the Neighborhood nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/housingQuality.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { HOUSING_QUALITY_ID } from '../sectionIds';

export const housingQualityIndicators = {

  maintenanceProblems: {
    key:            'maintenance-problems',
    topic:          HOUSING_QUALITY_ID,
    title:          'Homes with Any Maintenance Problems',
    subtitle:       '% of renter-occupied homes reporting one or more maintenance deficiencies',
    source:         'Source: NYC Housing and Vacancy Survey',
    timePeriod:     'TBD',
    label:          'Homes with Maintenance Problems',
    unit:           'of renter-occupied homes',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  cockroaches: {
    key:            'cockroaches',
    topic:          HOUSING_QUALITY_ID,
    title:          'Homes Reporting Cockroaches',
    subtitle:       '% of renter-occupied homes reporting cockroach presence',
    source:         'Source: NYC Housing and Vacancy Survey',
    timePeriod:     'TBD',
    label:          'Homes with Cockroaches',
    unit:           'of renter-occupied homes',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  airConditioning: {
    key:            'air-conditioning',
    topic:          HOUSING_QUALITY_ID,
    title:          'Homes with Air Conditioning',
    subtitle:       '% of homes with at least one working air conditioning unit',
    source:         'Source: NYC Housing and Vacancy Survey',
    timePeriod:     'TBD',
    label:          'Homes with AC',
    unit:           'of homes',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: true,
  },

};
