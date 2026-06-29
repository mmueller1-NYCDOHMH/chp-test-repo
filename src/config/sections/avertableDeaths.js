/**
 * FILE: avertableDeaths.js
 *
 * PURPOSE:
 * Section config for the Avertable Deaths subcategory.
 * Rendered on the neighborhood profile page under Social & Economic Wellness.
 *
 * NOTES:
 * * - Add/remove/reorder charts: edit /content/sections/{sectionId}.json — no JS needed
 * - All indicator metadata lives in /config/registries/indicators/avertableDeaths.js
 */

import { AVERTABLE_DEATHS_ID } from '../registries/sectionIds';

export const avertableDeaths = {
  id: AVERTABLE_DEATHS_ID,
  layout: 'cardRow',
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
        // indicators loaded automatically from /content/sections/{sectionId}.json
      }
    },
  ]
};
