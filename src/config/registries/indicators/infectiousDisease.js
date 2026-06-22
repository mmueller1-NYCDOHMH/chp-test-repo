/**
 * FILE: indicators/infectiousDisease.js
 *
 * PURPOSE:
 * Indicator definitions for the Infectious Disease subcategory,
 * under the Diseases & Outcomes nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/infectiousDisease.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { INFECTIOUS_DISEASE_ID } from '../sectionIds';

export const infectiousDiseaseIndicators = {

  newHivDiagnoses: {
    key:            'new-hiv-diagnoses',
    topic:          INFECTIOUS_DISEASE_ID,
    title:          'New HIV Diagnoses',
    subtitle:       'Rate of new HIV diagnoses per 100,000 residents',
    source:         'Source: NYC DOHMH HIV Epidemiology and Field Services Program',
    timePeriod:     'TBD',
    label:          'New HIV Diagnoses',
    unit:           'per 100k residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  newHepCReports: {
    key:            'new-hep-c-reports',
    topic:          INFECTIOUS_DISEASE_ID,
    title:          'New Hepatitis C Reports',
    subtitle:       'Rate of newly reported Hepatitis C cases per 100,000 residents',
    source:         'Source: NYC DOHMH Bureau of Communicable Disease',
    timePeriod:     'TBD',
    label:          'New Hep C Reports',
    unit:           'per 100k residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

};
