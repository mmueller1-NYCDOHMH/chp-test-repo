/**
 * FILE: maternal.js
 *
 * PURPOSE:
 * Section config for the Maternal subcategory.
 * Rendered on the neighborhood profile page under Family Health.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/maternal.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { MATERNAL_ID } from '../registries/sectionIds';

export const maternal = {
  id: MATERNAL_ID,
  layout: 'cardRow',
  navTitle: 'Maternal',
  children: [
    {
      id: 'maternal-header',
      type: 'sectionHeader',
      props: {
        title: 'Maternal',
      }
    },
    {
      id: 'maternal-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Maternal Health',
        charts: [
          asChartConfig(indicators.latePrenatalCare),
          asChartConfig(indicators.pretermBirths),
          asChartConfig(indicators.teenPregnancy),
        ]
      }
    },
  ]
};
