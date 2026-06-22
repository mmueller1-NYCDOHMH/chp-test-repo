/**
 * FILE: healthOutcomes.js
 *
 * PURPOSE:
 * Section config for the Health Outcomes indicator charts.
 * Rendered on the neighborhood profile page under Chronic Disease & Outcomes.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicatorRegistry.js
 * - flyoutKey must match a filename in /content/flyouts/ (no extension)
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { HEALTH_OUTCOMES_ID } from '../registries/sectionIds';

export const healthOutcomes = {
  id: HEALTH_OUTCOMES_ID,
  layout: 'cardRow',
  navTitle: 'Health Outcomes',
  children: [
    {
      id: 'health-outcomes-header',
      type: 'sectionHeader',
      props: {
        title: 'Health Outcomes'
      }
    },
    {
      id: 'health-outcomes-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Health Outcomes',
        charts: [
          asChartConfig(indicators.lifeExpectancy),
        ]
      }
    },
  ]
};
