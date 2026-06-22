/**
 * FILE: infectiousDisease.js
 *
 * PURPOSE:
 * Section config for the Infectious Disease subcategory.
 * Rendered on the neighborhood profile page under Diseases & Outcomes.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/infectiousDisease.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { INFECTIOUS_DISEASE_ID } from '../registries/sectionIds';

export const infectiousDisease = {
  id: INFECTIOUS_DISEASE_ID,
  layout: 'cardRow',
  navTitle: 'Infectious Disease',
  children: [
    {
      id: 'infectious-disease-header',
      type: 'sectionHeader',
      props: {
        title: 'Infectious Disease',
      }
    },
    {
      id: 'infectious-disease-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Infectious Disease',
        charts: [
          asChartConfig(indicators.newHivDiagnoses),
          asChartConfig(indicators.newHepCReports),
        ]
      }
    },
  ]
};
