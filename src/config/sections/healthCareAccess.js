/**
 * FILE: healthCareAccess.js
 *
 * PURPOSE:
 * Section config for the Access subcategory.
 * Rendered on the neighborhood profile page under Health Care.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/healthCareAccess.js
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { HEALTH_CARE_ACCESS_ID } from '../registries/sectionIds';

export const healthCareAccess = {
  id: HEALTH_CARE_ACCESS_ID,
  layout: 'cardRow',
  navTitle: 'Access',
  children: [
    {
      id: 'health-care-access-header',
      type: 'sectionHeader',
      props: {
        title: 'Access',
      }
    },
    {
      id: 'health-care-access-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Health Care Access',
        charts: [
          asChartConfig(indicators.uninsured),
          asChartConfig(indicators.unmetMedicalNeed),
        ]
      }
    },
  ]
};
