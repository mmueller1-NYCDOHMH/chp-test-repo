/**
 * FILE: indicators/infantChild.js
 *
 * PURPOSE:
 * Indicator definitions for the Infant & Child subcategory,
 * which lives under the Maternal & Child Health nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/infantChild.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { INFANT_CHILD_ID } from '../sectionIds';

export const infantChildIndicators = {

  childAsthma: {
    key:            'child-asthma',
    topic:          INFANT_CHILD_ID,
    title:          'Child Asthma Emergency Department Visits',
    subtitle:       'Rate per 10,000 children under 18',
    source:         'Source: NYC DOHMH Syndromic Surveillance (2018–2021)',
    timePeriod:     '2018–2021',
    label:          'Child Asthma ED Visits',
    unit:           'per 10k under 18',
    displaySuffix:  '',
    deltaSuffix:    '',
    decimals:       0,
    higherIsBetter: false,
  },

};
