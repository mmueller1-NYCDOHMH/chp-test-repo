/**
 * FILE: communitySafety.js
 *
 * PURPOSE:
 * Section config for the Community & Safety subcategory.
 * Rendered on the neighborhood profile page under Social & Economic Conditions.
 *
 * NOTES:
 * - Add/remove charts by editing the `charts` array — use asChartConfig(indicators.xxx)
 * - All indicator metadata lives in /config/registries/indicators/communitySafety.js
 * - flyoutKey must match a filename in /content/flyouts/ (no extension)
 */

import { indicators, asChartConfig } from '../registries/indicatorRegistry';
import { COMMUNITY_SAFETY_ID } from '../registries/sectionIds';

export const communitySafety = {
  id: COMMUNITY_SAFETY_ID,
  layout: 'cardRow',
  navTitle: 'Community & Safety',
  children: [
    {
      id: 'community-safety-header',
      type: 'sectionHeader',
      props: {
        title: 'Community & Safety'
      }
    },
    {
      id: 'community-safety-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Community & Safety',
        charts: [
          asChartConfig(indicators.incarcerations),
        ]
      }
    },
  ]
};
