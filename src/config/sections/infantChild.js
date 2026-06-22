/**
 * FILE: infantChild.js
 *
 * PURPOSE:
 * Section config for the Infant & Child indicator charts.
 * Rendered on the neighborhood profile page under Maternal & Child Health.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicatorRegistry.js
 * - flyoutKey must match a filename in /content/flyouts/ (no extension)
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { INFANT_CHILD_ID } from '../registries/sectionIds';

export const infantChild = {
  id: INFANT_CHILD_ID,
  layout: 'cardRow',
  navTitle: 'Infant & Child',
  children: [
    {
      id: 'infant-child-header',
      type: 'sectionHeader',
      props: {
        title: 'Infant & Child'
      }
    },
    {
      id: 'infant-child-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Infant & Child Health',
        charts: [
          asChartConfig(indicators.childAsthma),
        ]
      }
    },
  ]
};
