/**
 * FILE: indicators/communitySafety.js
 *
 * PURPOSE:
 * Indicator definitions for the Community & Safety subcategory,
 * which lives under the Social & Economic Conditions nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/communitySafety.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { COMMUNITY_SAFETY_ID } from '../sectionIds';

export const communitySafetyIndicators = {

  incarcerations: {
    key:            'incarcerations',
    topic:          COMMUNITY_SAFETY_ID,
    title:          'Incarcerations',
    subtitle:       'Rate of residents admitted to local jails (not including prisons) per 100,000 adults ages 16 and older',
    source:         'Source: NYC Department of Correction (2023–2024)',
    sourceUrl:      'https://www.nyc.gov/site/doc/about/reports-and-statistics.page',
    description:    'This indicator measures the rate of jail admissions — residents sent to local NYC jails — and does not include state or federal prison sentences. The rate is calculated per 100,000 adults ages 16 and older using DOC admissions data and ACS population estimates. Incarceration is both a consequence and a driver of poor health: incarcerated individuals often have elevated rates of chronic illness, mental health conditions, and substance use disorders, and re-entry poses significant barriers to housing, employment, and care.',
    timePeriod:     '2023–2024',
    label:          'Jail Incarcerations',
    unit:           'per 100k adults',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

};
