/**
 * FILE: mentalWellness.js
 *
 * PURPOSE:
 * Section config for the Mental Wellness subcategory.
 * Rendered on the neighborhood profile page under Social & Economic Wellness.
 *
 * STATUS: Placeholder — indicators TBD. The section renders a coming-soon
 * text block only. Wire in charts once indicators are confirmed with BES.
 *
 * NOTES:
 * - Add charts by adding asChartConfig(indicators.xxx) entries to the charts
 *   array once indicator data files exist.
 * - All indicator metadata will live in /config/registries/indicators/mentalWellness.js
 */

import { MENTAL_WELLNESS_ID } from '../registries/sectionIds';

export const mentalWellness = {
  id: MENTAL_WELLNESS_ID,
  layout: 'cardRow',
  navTitle: 'Mental Wellness',
  children: [
    {
      id: 'mental-wellness-header',
      type: 'sectionHeader',
      props: {
        title: 'Mental Wellness',
      }
    },
    {
      id: 'mental-wellness-placeholder',
      type: 'text',
      props: {
        content: 'Indicators for this section are currently being finalized. Check back soon.',
      }
    },
  ]
};
