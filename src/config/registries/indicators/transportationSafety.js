/**
 * FILE: indicators/transportationSafety.js
 *
 * PURPOSE:
 * Indicator definitions for the Transportation Safety subcategory,
 * under the Neighborhood nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/transportationSafety.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { TRANSPORTATION_SAFETY_ID } from '../sectionIds';

export const transportationSafetyIndicators = {

  bicycleNetwork: {
    key:            'bicycle-network',
    topic:          TRANSPORTATION_SAFETY_ID,
    title:          'Bicycle Network Coverage',
    subtitle:       'Miles of bike lanes per square mile of land area',
    source:         'Source: NYC Department of Transportation',
    timePeriod:     'TBD',
    label:          'Bike Lane Coverage',
    unit:           'miles per sq mi',
    displaySuffix:  '',
    deltaSuffix:    '',
    decimals:       1,
    higherIsBetter: true,
  },

  pedestrianInjuries: {
    key:            'pedestrian-injuries',
    topic:          TRANSPORTATION_SAFETY_ID,
    title:          'Pedestrian Injury Hospitalizations',
    subtitle:       'Rate of pedestrian injury hospitalizations per 100,000 residents',
    source:         'Source: NYC SPARCS / DOHMH',
    timePeriod:     'TBD',
    label:          'Pedestrian Injury Hospitalizations',
    unit:           'per 100k residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  publicTransitUse: {
    key:            'public-transit-use',
    topic:          TRANSPORTATION_SAFETY_ID,
    title:          'Public Transit Use',
    subtitle:       '% of workers who primarily commute by public transit',
    source:         'Source: American Community Survey 5-Year Estimates',
    timePeriod:     'TBD',
    label:          'Public Transit Commuters',
    unit:           'of workers',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: true,
  },

};
