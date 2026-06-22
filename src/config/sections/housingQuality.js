/**
 * FILE: housingQuality.js
 *
 * PURPOSE:
 * Section config for the Housing Quality subcategory.
 * Rendered on the neighborhood profile page under Neighborhood.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/housingQuality.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { HOUSING_QUALITY_ID } from '../registries/sectionIds';

export const housingQuality = {
  id: HOUSING_QUALITY_ID,
  layout: 'cardRow',
  navTitle: 'Housing Quality',
  children: [
    {
      id: 'housing-quality-header',
      type: 'sectionHeader',
      props: {
        title: 'Housing Quality',
      }
    },
    {
      id: 'housing-quality-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Housing Quality',
        charts: [
          asChartConfig(indicators.maintenanceProblems),
          asChartConfig(indicators.cockroaches),
          asChartConfig(indicators.airConditioning),
        ]
      }
    },
  ]
};
