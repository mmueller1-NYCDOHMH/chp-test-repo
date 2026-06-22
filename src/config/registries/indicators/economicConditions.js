/**
 * FILE: indicators/economicConditions.js
 *
 * PURPOSE:
 * Indicator definitions for the Economic subcategory,
 * which lives under the Social & Economic Conditions nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/economicConditions.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { ECONOMIC_ID } from '../sectionIds';

export const economicIndicators = {

  poverty: {
    key:            'poverty',
    topic:          ECONOMIC_ID,
    title:          'Poverty',
    subtitle:       '% of residents below the federal poverty level',
    source:         'Source: American Community Survey 5-Year Estimates (2018–2022)',
    sourceUrl:      'https://www.census.gov/programs-surveys/acs',
    description:    'Poverty is measured as the share of residents with household income below the federal poverty level, which varies by household size and composition. Data are drawn from the ACS 5-year estimates, which pool five years of survey responses to produce reliable estimates for small geographies. Poverty is a key driver of health disparities — it shapes access to nutritious food, safe housing, health care, and education, all of which directly affect health outcomes.',
    timePeriod:     '2018–2022',
    label:          'Below Poverty Line',
    unit:           'of residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  unemployment: {
    key:            'unemployment',
    topic:          ECONOMIC_ID,
    title:          'Unemployment',
    subtitle:       'Percentage of the civilian labor force (ages 16+) who are unemployed',
    source:         'Source: American Community Survey 5-Year Estimates (2019–2023)',
    timePeriod:     '2019–2023',
    label:          'Unemployed',
    unit:           'of residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

};
