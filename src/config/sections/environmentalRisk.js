/**
 * FILE: environmentalRisk.js
 *
 * PURPOSE:
 * Section config for the Environmental Risk subcategory.
 * Rendered on the neighborhood profile page under Neighborhood.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/environmentalRisk.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { ENVIRONMENTAL_RISK_ID } from '../registries/sectionIds';

export const environmentalRisk = {
  id: ENVIRONMENTAL_RISK_ID,
  layout: 'cardRow',
  navTitle: 'Environmental Risk',
  children: [
    {
      id: 'environmental-risk-header',
      type: 'sectionHeader',
      props: {
        title: 'Environmental Risk',
      }
    },
    {
      id: 'environmental-risk-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Environmental Risk',
        charts: [
          asChartConfig(indicators.airQuality),
          asChartConfig(indicators.heatVulnerabilityIndex),
        ]
      }
    },
  ]
};
