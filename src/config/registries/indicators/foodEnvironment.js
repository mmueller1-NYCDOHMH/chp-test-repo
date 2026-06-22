/**
 * FILE: indicators/foodEnvironment.js
 *
 * PURPOSE:
 * Indicator definitions for the Food Environment subcategory,
 * under the Neighborhood nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/foodEnvironment.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { FOOD_ENVIRONMENT_ID } from '../sectionIds';

export const foodEnvironmentIndicators = {

  farmersMarkets: {
    key:            'farmers-markets',
    topic:          FOOD_ENVIRONMENT_ID,
    title:          'Farmers Markets',
    subtitle:       'Number of farmers markets per square mile',
    source:         'Source: NYC Open Data / GreenMarket',
    timePeriod:     'TBD',
    label:          'Farmers Markets',
    unit:           'per square mile',
    displaySuffix:  '',
    deltaSuffix:    '',
    decimals:       1,
    higherIsBetter: true,
  },

  sugaryDrinks: {
    key:            'sugary-drinks',
    topic:          FOOD_ENVIRONMENT_ID,
    title:          'Sugary Drinks',
    subtitle:       '% of adults who drink one or more sugary beverages per day',
    source:         'Source: NYC Community Health Survey',
    timePeriod:     'TBD',
    label:          'Daily Sugary Drink Consumption',
    unit:           'of adults',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: false,
  },

  fruitsVeggies: {
    key:            'fruits-veggies',
    topic:          FOOD_ENVIRONMENT_ID,
    title:          '1+ Serving of Fruits or Vegetables',
    subtitle:       '% of adults who eat one or more servings of fruits or vegetables per day',
    source:         'Source: NYC Community Health Survey',
    timePeriod:     'TBD',
    label:          'Daily Fruit or Vegetable Consumption',
    unit:           'of adults',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: true,
  },

};
