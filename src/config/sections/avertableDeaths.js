/**
 * FILE: avertableDeaths.js
 *
 * PURPOSE:
 * Section config for the Avertable Deaths subcategory.
 * Rendered on the neighborhood profile page under Social & Economic Wellness.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/avertableDeaths.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { AVERTABLE_DEATHS_ID } from '../registries/sectionIds';

export const avertableDeaths = {
  id: AVERTABLE_DEATHS_ID,
  layout: 'cardRow',
  navTitle: 'Avertable Deaths',
  children: [
    {
      id: 'avertable-deaths-header',
      type: 'sectionHeader',
      props: {
        title: 'Avertable Deaths',
      }
    },
    {
      id: 'avertable-deaths-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Avertable Deaths',
        charts: [
          asChartConfig(indicators.educationLevel),
        ]
      }
    },
  ]
};
