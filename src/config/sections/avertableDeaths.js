/**
 * FILE: avertableDeaths.js
 *
 * PURPOSE:
 * Section config for the Avertable Deaths subcategory.
 * Rendered on the neighborhood profile page under Social & Economic Wellness.
 *
 * NOTES:
 * - Section heading text: /src/config/content/sectionTitles.json (key:
 *   AVERTABLE_DEATHS_ID) — was hardcoded here until 2026-09-02; now reads
 *   from the same file every other buildStandardSection()-style section
 *   uses (see healthOutcomes.js for the pattern this follows).
 * - 2026-09-16, per Morgan ("for avertable deaths we're going to be using
 *   a dot distribution chart"): swapped the standard indicatorChartGrid
 *   block (ranked bar chart, indicator list from
 *   the copy deck (content/copy/measure-copy.csv)) for a bespoke
 *   avertableDeathsSection block — same pattern as healthOutcomes.js
 *   swapping in prematureDeathOverviewSection for its one non-standard
 *   chart. See AvertableDeathsSection.jsx / AvertableDeathsChart.jsx /
 *   getAvertableDeathsFallback.js. the copy deck (content/copy/measure-copy.csv)
 *   is no longer read by this section (the new block hardcodes the single
 *   'avertable-death' indicator key) — left on disk in case of a revert.
 */

import { AVERTABLE_DEATHS_ID } from '../registries/sectionIds';
import sectionTitles from '../content/sectionTitles.json';

const title = sectionTitles[AVERTABLE_DEATHS_ID] ?? AVERTABLE_DEATHS_ID;

export const avertableDeaths = {
  id: AVERTABLE_DEATHS_ID,
  layout: 'cardRow',
  children: [
    {
      id: 'avertable-deaths-header',
      type: 'sectionHeader',
      props: {
        title,
      }
    },
    {
      id: 'avertable-deaths-charts',
      type: 'avertableDeathsSection',
      props: {}
    },
  ]
};
