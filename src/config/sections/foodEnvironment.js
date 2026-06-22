/**
 * FILE: foodEnvironment.js
 *
 * PURPOSE:
 * Section config for the Food Environment subcategory.
 * Rendered on the neighborhood profile page under Neighborhood.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/foodEnvironment.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { FOOD_ENVIRONMENT_ID } from '../registries/sectionIds';

export const foodEnvironment = {
  id: FOOD_ENVIRONMENT_ID,
  layout: 'cardRow',
  navTitle: 'Food Environment',
  children: [
    {
      id: 'food-environment-header',
      type: 'sectionHeader',
      props: {
        title: 'Food Environment',
      }
    },
    {
      id: 'food-environment-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Food Environment',
        charts: [
          asChartConfig(indicators.farmersMarkets),
          asChartConfig(indicators.sugaryDrinks),
          asChartConfig(indicators.fruitsVeggies),
        ]
      }
    },
  ]
};
