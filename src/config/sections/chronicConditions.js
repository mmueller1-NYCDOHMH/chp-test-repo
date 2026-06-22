/**
 * FILE: chronicConditions.js
 *
 * PURPOSE:
 * Section config for the Chronic Conditions indicator charts.
 * Rendered on the neighborhood profile page.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicatorRegistry.js
 * - flyoutKey must match a filename in /content/flyouts/ (no extension)
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { CHRONIC_CONDITIONS_ID } from '../registries/sectionIds';

export const chronicConditions = {
  id: CHRONIC_CONDITIONS_ID,
  layout: 'cardRow',
  navTitle: 'Chronic Conditions',
  children: [
    {
      id: 'chronic-header',
      type: 'sectionHeader',
      props: {
        title: 'Chronic Conditions'
      }
    },
    {
      // indicatorChartGrid renders each chart in its own expandable card,
      // arranged in a 2-column grid. The selected neighborhood's bar is
      // highlighted automatically via context.geoId.
      id: 'chronic-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Chronic Conditions',
        charts: [
          asChartConfig(indicators.obesity),
        ]
      }
    },
  ]
};
