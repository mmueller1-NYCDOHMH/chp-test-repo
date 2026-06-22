/**
 * FILE: indicators/maternal.js
 *
 * PURPOSE:
 * Indicator definitions for the Maternal subcategory,
 * under the Family Health nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/maternal.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { MATERNAL_ID } from '../sectionIds';

export const maternalIndicators = {

  latePrenatalCare: {
    key:            'late-prenatal-care',
    topic:          MATERNAL_ID,
    title:          'Late or No Prenatal Care',
    subtitle:       '% of live births where prenatal care began in the third trimester or was absent',
    source:         'Source: NYC DOHMH Bureau of Vital Statistics',
    timePeriod:     'TBD',
    label:          'Late or No Prenatal Care',
    unit:           'of live births',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  pretermBirths: {
    key:            'preterm-births',
    topic:          MATERNAL_ID,
    title:          'Preterm Births',
    subtitle:       '% of live births delivered before 37 weeks of gestation',
    source:         'Source: NYC DOHMH Bureau of Vital Statistics',
    timePeriod:     'TBD',
    label:          'Preterm Births',
    unit:           'of live births',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  teenPregnancy: {
    key:            'teen-pregnancy',
    topic:          MATERNAL_ID,
    title:          'Teen Pregnancy',
    subtitle:       'Rate of pregnancies among females ages 15–19 per 1,000 females',
    source:         'Source: NYC DOHMH Bureau of Vital Statistics',
    timePeriod:     'TBD',
    label:          'Teen Pregnancy Rate',
    unit:           'per 1,000 females 15–19',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

};
