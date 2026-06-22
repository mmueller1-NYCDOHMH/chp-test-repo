/**
 * FILE: substanceUse.js
 *
 * PURPOSE:
 * Section config for the Substance Use subcategory.
 * Rendered on the neighborhood profile page under Social & Economic Wellness.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/substanceUse.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { SUBSTANCE_USE_ID } from '../registries/sectionIds';

export const substanceUse = {
  id: SUBSTANCE_USE_ID,
  layout: 'cardRow',
  navTitle: 'Substance Use',
  children: [
    {
      id: 'substance-use-header',
      type: 'sectionHeader',
      props: {
        title: 'Substance Use',
      }
    },
    {
      id: 'substance-use-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Substance Use',
        charts: [
          asChartConfig(indicators.smoking),
          asChartConfig(indicators.bingeDrinking),
        ]
      }
    },
  ]
};
