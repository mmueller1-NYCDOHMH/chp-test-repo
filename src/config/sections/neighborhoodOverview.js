/**
 * FILE: neighborhoodOverview.js
 *
 * PURPOSE:
 * Section config for the neighborhood overview hero (the per-CD
 * "at a Glance" panel).
 *
 * NOTES:
 * - statTiles and pyramidCharts are loaded automatically from
 *   /content/sections/neighborhood-overview.json by Block.jsx.
 * - To change which tiles appear or their order: edit that JSON file — no JS needed.
 * - To add a new tile: add the indicator key to the JSON and ensure
 *   /content/indicators/{key}.meta.json exists with the tile metadata.
 */

import { NEIGHBORHOOD_OVERVIEW_ID } from '../registries/sectionIds';

export const neighborhoodOverview = {
  id: NEIGHBORHOOD_OVERVIEW_ID,
  layout: 'stacked',
  children: [
    {
      id: 'neighborhood-overview-hero',
      type: 'neighborhoodOverviewHero',
      props: {
        // statTiles and pyramidCharts injected from
        // /content/sections/neighborhood-overview.json by Block.jsx
      }
    }
  ]
};
