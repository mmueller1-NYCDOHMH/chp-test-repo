/**
 * FILE: indicators/healthOutcomes.js
 *
 * PURPOSE:
 * Indicator definitions for the Health Outcomes subcategory,
 * which lives under the Chronic Disease & Outcomes nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/healthOutcomes.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { HEALTH_OUTCOMES_ID } from '../sectionIds';

export const healthOutcomeIndicators = {

  lifeExpectancy: {
    key:            'life-expectancy',
    topic:          HEALTH_OUTCOMES_ID,
    title:          'Life Expectancy at Birth',
    subtitle:       'Years',
    source:         'Source: NYC DOHMH Vital Statistics (2017–2021)',
    sourceUrl:      'https://www.nyc.gov/site/doh/data/data-sets/vital-statistics-data.page',
    description:    'Life expectancy at birth is the average number of years a newborn is expected to live, given current age-specific mortality rates. It is calculated from death records using standard life table methodology and is not a projection or forecast. Figures represent a 5-year average to reduce year-to-year variability in small populations. Life expectancy varies substantially across community districts and is influenced by chronic disease burden, access to health care, socioeconomic conditions, environmental exposures, and violence.',
    timePeriod:     '2017–2021',
    label:          'Life Expectancy',
    unit:           'years at birth',
    displaySuffix:  ' yrs',
    deltaSuffix:    ' yrs',
    decimals:       1,
    higherIsBetter: true,
  },

};
