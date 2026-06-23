/**
 * FILE: neighborhoodOverview.js
 *
 * PURPOSE:
 * Section config for the neighborhood overview hero (the per-CD
 * "at a Glance" panel).
 *
 * NOTES:
 * - statTiles drives the single-value stat tiles at the top of the profile.
 * - Each entry is wrapped via asStatTile(indicators.X) — see
 *   /config/registries/indicators/demographics.js for the underlying
 *   field definitions (labels, units, segments, etc.).
 * - The tile order here is the render order: Population → Born Outside U.S.
 *   → Limited English Proficiency.
 * - Age and race/ethnicity distributions are handled separately as
 *   ComparisonPyramidCharts below the stat tiles (defined in DEFAULT_PYRAMID_CHARTS
 *   inside NeighborhoodOverviewHero.jsx).
 */

import { indicators, asStatTile, asPyramidChart } from '../registries/indicatorRegistry';
import { NEIGHBORHOOD_OVERVIEW_ID } from '../registries/sectionIds';

export const neighborhoodOverview = {
  // neighborhoodOverviewHero reads /data/indicators/*.json and renders a
  // tile for each configured indicator. Single-value indicators get a
  // big-number tile with a delta vs NYC; distribution indicators get a
  // mini stacked bar with a per-segment legend.
  //
  // To swap which indicators appear: edit the `statTiles` array below.
  // To update data values: edit the indicator JSON files in /data/indicators/.
  id: NEIGHBORHOOD_OVERVIEW_ID,
  layout: 'stacked',
  navTitle: 'Overview',
  children: [
    {
      id: 'neighborhood-overview-hero',
      type: 'neighborhoodOverviewHero',
      props: {
        statTiles: [
          asStatTile(indicators.totalPopulation),
          asStatTile(indicators.bornOutsideUS),
          asStatTile(indicators.limitedEnglishProficiency),
        ],
        pyramidCharts: [
          asPyramidChart(indicators.ageDistribution),
          asPyramidChart(indicators.raceEthnicity),
        ],
      }
    }
  ]
};
