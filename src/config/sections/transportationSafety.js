/**
 * FILE: transportationSafety.js
 *
 * PURPOSE:
 * Section config for the Transportation Safety subcategory.
 * Rendered on the neighborhood profile page under Neighborhood.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/transportationSafety.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { TRANSPORTATION_SAFETY_ID } from '../registries/sectionIds';

export const transportationSafety = {
  id: TRANSPORTATION_SAFETY_ID,
  layout: 'cardRow',
  navTitle: 'Transportation Safety',
  children: [
    {
      id: 'transportation-safety-header',
      type: 'sectionHeader',
      props: {
        title: 'Transportation Safety',
      }
    },
    {
      id: 'transportation-safety-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Transportation Safety',
        charts: [
          asChartConfig(indicators.bicycleNetwork),
          asChartConfig(indicators.pedestrianInjuries),
          asChartConfig(indicators.publicTransitUse),
        ]
      }
    },
  ]
};
