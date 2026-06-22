/**
 * FILE: indicators/substanceUse.js
 *
 * PURPOSE:
 * Indicator definitions for the Substance Use subcategory,
 * under the Social & Economic Wellness nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/substanceUse.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { SUBSTANCE_USE_ID } from '../sectionIds';

export const substanceUseIndicators = {

  smoking: {
    key:            'smoking',
    topic:          SUBSTANCE_USE_ID,
    title:          'Smoking',
    subtitle:       '% of adults who currently smoke cigarettes',
    source:         'Source: NYC Community Health Survey',
    timePeriod:     'TBD',
    label:          'Current Smokers',
    unit:           'of adults',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  bingeDrinking: {
    key:            'binge-drinking',
    topic:          SUBSTANCE_USE_ID,
    title:          'Binge Drinking',
    subtitle:       '% of adults who report binge drinking in the past 30 days',
    source:         'Source: NYC Community Health Survey',
    timePeriod:     'TBD',
    label:          'Binge Drinking',
    unit:           'of adults',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

};
