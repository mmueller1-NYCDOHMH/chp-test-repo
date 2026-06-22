/**
 * FILE: economicConditions.js
 *
 * PURPOSE:
 * Section config for the Economic subcategory.
 * Rendered on the neighborhood profile page under Social & Economic Conditions.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/economicConditions.js
 * - flyoutKey must match a filename in /content/flyouts/ (no extension)
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { ECONOMIC_ID } from '../registries/sectionIds';

export const economicConditions = {
  id: ECONOMIC_ID,
  layout: 'cardRow',
  navTitle: 'Economic',
  children: [
    {
      id: 'economic-header',
      type: 'sectionHeader',
      props: {
        title: 'Economic'
      }
    },
    {
      id: 'economic-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Economic Conditions',
        charts: [
          asChartConfig(indicators.unemployment),
          asChartConfig(indicators.poverty),
        ]
      }
    },
  ]
};
