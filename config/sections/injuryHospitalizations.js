/**
 * FILE: injuryHospitalizations.js
 *
 * PURPOSE:
 * Section config for the Injury & hospitalizations subcategory.
 * Rendered on the neighborhood profile page under Health care.
 *
 * NOTES:
 * - Add/remove/reorder charts: edit /content/sections/injury-hospitalizations.json — no JS needed
 * - All indicator metadata lives in /content/indicators/{key}.meta.json
 */

import { INJURY_HOSPITALIZATIONS_ID } from '../registries/sectionIds';

export const injuryHospitalizations = {
  id: INJURY_HOSPITALIZATIONS_ID,
  layout: 'cardRow',
  children: [
    {
      id: 'injury-hospitalizations-header',
      type: 'sectionHeader',
      props: {
        title: 'Injury & hospitalizations',
      }
    },
    {
      id: 'injury-hospitalizations-charts',
      type: 'indicatorChartGrid',
      props: {
        sectionLabel: 'Injury & hospitalizations',
        // indicators loaded automatically from /content/sections/injury-hospitalizations.json
      }
    },
  ]
};
