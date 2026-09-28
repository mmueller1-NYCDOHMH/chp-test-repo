/**
 * FILE: healthOutcomes.js
 *
 * PURPOSE:
 * Section config for Health Outcomes. Extends the standard
 * sectionHeader + indicatorChartGrid layout (life-expectancy,
 * premature-mort-count, premature-mort-rate — see
 * the copy deck (content/copy/measure-copy.csv)) with one extra block: a
 * "Premature Death Overview" panel styled like the neighborhood profile's
 * At a Glance hero — a stat tile with a dynamic NYC-comparison delta badge,
 * plus two pyramid/butterfly charts side by side (leading types of cancer
 * among premature deaths, and top causes of premature death overall)
 * sharing one "Compare to city" toggle.
 *
 * NOTES:
 * - Was previously buildStandardSection('health-outcomes') in
 *   neighborhoodProfile.js — promoted to its own file (2026-08-31) to add
 *   the cancer-ranking block, following the same pattern as
 *   avertableDeaths.js.
 * - The standard indicator list still loads automatically from
 *   the copy deck (content/copy/measure-copy.csv) — no change needed there to
 *   add/remove/reorder those three indicators.
 * - 2026-09-01: added a "Top Causes of Premature Death" chart alongside
 *   the cancer-ranking one (two separate blocks/cards at first — see git
 *   history), then same-day merged both into ONE
 *   prematureDeathOverviewSection block per Morgan, matching the At a
 *   Glance hero's look (title + stat tile with dynamic delta text + a
 *   shared-toggle pyramid-chart row) rather than two separate cards.
 *   See /src/components/data-display/PrematureDeathOverviewSection.jsx
 *   for the full history and the data-layer files it reads
 *   (getCancerRankingData.js, getPrematureMortCauseData.js).
 */

import { HEALTH_OUTCOMES_ID } from '../registries/sectionIds';
import sectionTitles from '../content/sectionTitles.json';

const title = sectionTitles[HEALTH_OUTCOMES_ID] ?? HEALTH_OUTCOMES_ID;

export const healthOutcomes = {
  id: HEALTH_OUTCOMES_ID,
  layout: 'cardRow',
  children: [
    {
      id:    `${HEALTH_OUTCOMES_ID}-header`,
      type:  'sectionHeader',
      props: { title },
    },
    {
      id:    `${HEALTH_OUTCOMES_ID}-charts`,
      type:  'indicatorChartGrid',
      props: {
        sectionLabel: title,
        // indicators injected by Block.jsx from the copy deck
      },
    },
    {
      id:    `${HEALTH_OUTCOMES_ID}-premature-death-overview`,
      type:  'prematureDeathOverviewSection',
      props: {},
    },
  ],
};
