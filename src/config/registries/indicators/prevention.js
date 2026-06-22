/**
 * FILE: indicators/prevention.js
 *
 * PURPOSE:
 * Indicator definitions for the Prevention subcategory,
 * under the Health Care nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/prevention.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { PREVENTION_ID } from '../sectionIds';

export const preventionIndicators = {

  fluVaccination: {
    key:            'flu-vaccination',
    topic:          PREVENTION_ID,
    title:          'Flu Vaccination',
    subtitle:       '% of adults who received a flu vaccine in the past 12 months',
    source:         'Source: NYC Community Health Survey',
    timePeriod:     'TBD',
    label:          'Flu Vaccination',
    unit:           'of adults',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: true,
  },

  hpvVaccination: {
    key:            'hpv-vaccination',
    topic:          PREVENTION_ID,
    title:          'HPV Vaccination',
    subtitle:       '% of adolescents ages 13–17 who have received the HPV vaccine series',
    source:         'Source: NYC DOHMH Immunization Registry',
    timePeriod:     'TBD',
    label:          'HPV Vaccination',
    unit:           'of adolescents 13–17',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: true,
  },

};
