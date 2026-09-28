/**
 * FILE: neighborhoodOverview.js
 *
 * PURPOSE:
 * Section config for the neighborhood overview hero (the per-CD
 * "at a Glance" panel).
 *
 * NOTES:
 * - statTiles and pyramidCharts are loaded automatically from
 *   the copy deck (content/copy/measure-copy.csv) by Block.jsx.
 * - To change which tiles appear or their order: edit the "At a glance" rows
 *   in the CSV — no JS needed.
 * - To add a new tile: add a row with its Key (Section "At a glance"); the
 *   data team supplies data/indicators/{key}.json + data/metadata/{key}-meta.json.
 */

import { NEIGHBORHOOD_OVERVIEW_ID } from '../registries/sectionIds';

export const neighborhoodOverview = {
  id: NEIGHBORHOOD_OVERVIEW_ID,
  layout: 'stackedNoCard',
  children: [
    {
      id: 'neighborhood-overview-hero',
      type: 'neighborhoodOverviewHero',
      props: {
        // statTiles and pyramidCharts injected from
        // the copy deck (content/copy/measure-copy.csv) by Block.jsx
      }
    }
  ]
};
