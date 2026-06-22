/**
 * FILE: indicators/avertableDeaths.js
 *
 * PURPOSE:
 * Indicator definitions for the Avertable Deaths subcategory,
 * under the Social & Economic Wellness nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/avertableDeaths.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { AVERTABLE_DEATHS_ID } from '../sectionIds';

export const avertableDeathsIndicators = {

  educationLevel: {
    key:            'education-level',
    topic:          AVERTABLE_DEATHS_ID,
    title:          'Highest Level of Education Achieved',
    subtitle:       '% of adults ages 25+ with less than a high school diploma',
    source:         'Source: American Community Survey 5-Year Estimates',
    timePeriod:     'TBD',
    label:          'Less Than High School Diploma',
    unit:           'of adults 25+',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

};
