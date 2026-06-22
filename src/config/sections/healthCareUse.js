/**
 * FILE: healthCareUse.js
 *
 * PURPOSE:
 * Section config for the Use subcategory.
 * Rendered on the neighborhood profile page under Health Care.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/healthCareUse.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { HEALTH_CARE_USE_ID } from '../registries/sectionIds';

export const healthCareUse = {
  id: HEALTH_CARE_USE_ID,
  layout: 'cardRow',
  navTitle: 'Use',
  children: [
    {
      id: 'health-care-use-header',
      type: 'sectionHeader',
      props: {
        title: 'Use',
      }
    },
    {
      id: 'health-care-use-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Health Care Use',
        charts: [
          asChartConfig(indicators.avoidableHospitalizations),
          asChartConfig(indicators.fallRelatedHospitalizations),
          asChartConfig(indicators.psychiatricHospitalizations),
        ]
      }
    },
  ]
};
