/**
 * FILE: prevention.js
 *
 * PURPOSE:
 * Section config for the Prevention subcategory.
 * Rendered on the neighborhood profile page under Health Care.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/prevention.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { PREVENTION_ID } from '../registries/sectionIds';

export const prevention = {
  id: PREVENTION_ID,
  layout: 'cardRow',
  navTitle: 'Prevention',
  children: [
    {
      id: 'prevention-header',
      type: 'sectionHeader',
      props: {
        title: 'Prevention',
      }
    },
    {
      id: 'prevention-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Prevention',
        charts: [
          asChartConfig(indicators.fluVaccination),
          asChartConfig(indicators.hpvVaccination),
        ]
      }
    },
  ]
};
