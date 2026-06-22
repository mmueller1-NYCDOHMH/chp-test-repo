/**
 * FILE: indicators/chronicConditions.js
 *
 * PURPOSE:
 * Indicator definitions for the Chronic Conditions subcategory,
 * which lives under the Chronic Disease & Outcomes nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/chronicConditions.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { CHRONIC_CONDITIONS_ID } from '../sectionIds';

export const chronicConditionIndicators = {

  obesity: {
    key:            'obesity',
    topic:          CHRONIC_CONDITIONS_ID,
    title:          'Adult Obesity',
    subtitle:       '% of adults with BMI ≥ 30',
    source:         'Source: NYC Community Health Survey (2018–2022)',
    sourceUrl:      'https://www.nyc.gov/site/doh/data/data-sets/community-health-survey.page',
    description:    'Obesity is defined as a body mass index (BMI) of 30 or higher, calculated from self-reported height and weight. Because BMI is self-reported, prevalence may be underestimated. Rates are age-adjusted to the 2000 US standard population. Obesity is associated with increased risk of type 2 diabetes, hypertension, heart disease, and certain cancers. Significant variation across community districts reflects differences in food access, built environment, income, and other social determinants of health.',
    timePeriod:     '2018–2022',
    label:          'Adult Obesity',
    unit:           'of adults',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

};
