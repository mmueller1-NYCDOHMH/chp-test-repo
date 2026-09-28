/**
 * FILE: PrematureDeathOverviewSection.jsx
 *
 * PURPOSE:
 * "Premature Death Overview" panel for Health Outcomes — built on the same
 * visual pattern as the neighborhood profile's "At a Glance" hero
 * (NeighborhoodOverviewHero.jsx / the "Jackson Heights at a Glance"
 * screenshot Morgan referenced): a bold title, a stat-tile row with a
 * dynamic comparison-to-NYC delta badge, and a row of pyramid/butterfly
 * charts sharing one "Compare to city" toggle.
 *
 * HISTORY:
 * - 2026-09-01: built as two separate blocks — cancerRankingSection
 *   (leading cancer types among premature deaths) and
 *   prematureMortCauseSection (leading causes of premature death overall)
 *   — each its own borderless card wrapping a single-chart
 *   PyramidChartSection, each with its own "Compare to city" toggle.
 * - 2026-09-01, same day, restyled per Morgan ("do the premature mortality
 *   and top causes of cancer charts section in a similar way to
 *   [the At a Glance hero]... add some of the dynamic text and such in the
 *   section too"): merged into this one component, modeled directly on
 *   NeighborhoodOverviewHero.jsx:
 *     1. A bold section title (plain — not comparison-aware like
 *        AtAGlanceTitle's name-pairing, since this section isn't named
 *        after the neighborhood).
 *     2. ONE stat tile for the overall premature-mortality rate, built
 *        with the exact resolveOverviewData.buildStatTile /
 *        compareIndicator.computeDelta pipeline the At a Glance hero's
 *        population/nativity/language tiles use — this is the "dynamic
 *        text": a colored "+X compared to NYC" delta badge plus the
 *        low→high 59-CD distribution strip (ComparisonStatTilesClient),
 *        reused as-is rather than reinvented. Replaces the previous plain
 *        "Overall premature mortality rate: X vs. Y citywide" sentence.
 *     3. ONE <PyramidChartSection charts={[cancerChart, causeChart]} .../>
 *        call (previously two separate calls, one per superseded
 *        component) — this is what makes the two charts sit side by side
 *        sharing a single "Compare to city" toggle, exactly like Age
 *        Distribution / Race & Ethnicity do in the At a Glance hero.
 *     4. The cancer-type breakdown is kept, now a one-line caption under
 *        the chart row instead of a side panel next to one chart.
 *   Superseded: CancerRankingSection.jsx and PrematureMortCauseSection.jsx
 *   are no longer wired into any page (see healthOutcomes.js /
 *   blockRegistry.js) but left on disk rather than deleted — this file's
 *   chart-building logic was adapted from them, not written from scratch.
 *   Safe to delete once this combined version is confirmed working.
 * - 2026-09-01, same day, per Morgan ("remove the overall large card
 *   background"): dropped the outer bg-white/border/rounded-xl/shadow-sm/
 *   p-6 wrapper added in the previous restyle. Section now renders
 *   borderless again — like CancerRankingSection.jsx/
 *   PrematureMortCauseSection.jsx originally did — relying on the stat
 *   tile's own card border and each pyramid chart's own card border
 *   (ComparisonPyramidChart) for visual structure, consistent with this
 *   section's `cardRow` layout preset (healthOutcomes.js) where blocks
 *   carry their own card styling rather than sitting inside one shared
 *   section card.
 *
 * - 2026-09-16, per Morgan (mockup supplied — a ranked horizontal bar chart
 *   with a citywide reference tick, styled as its own full card): the
 *   "Leading Causes Of Premature Death" chart (causeChart below) moved OFF
 *   the shared `<PyramidChartSection charts={[cancerChart, causeChart]} />`
 *   row and onto its own card, PrematureMortCauseCard.jsx, which wraps the
 *   new ComparisonBarChartClient.jsx (sibling of ComparisonPyramidChartClient
 *   for the same segments data, different chart type). cancerChart (the
 *   cancer-TYPE breakdown) is untouched — still renders through
 *   PyramidChartSection as a single-chart pyramid/butterfly. The two charts
 *   now have INDEPENDENT "Compare to city" toggles (previously shared one
 *   toggle via PyramidChartSection) — see ComparisonBarChartClient.jsx's
 *   header for why, and flag to Morgan if one shared toggle is wanted back.
 *
 * - 2026-09-28, per Morgan: back to ONE shared "Compare to city" toggle for
 *   both cards (was independent since 9/16). The two cards now render via
 *   PrematureDeathChartsRow.jsx (client), which owns the toggle state and
 *   passes it to PrematureMortCauseCard + PyramidChartSection as a controlled
 *   `compareToCity` prop; both hide their own switch when controlled.
 *
 * - 2026-09-28, per Morgan: removed the cancer-type caption sentence and the
 *   source footnote under the cards (each card has its own source footer).
 *   Copy keys cancerCaptionPrefix / footnoteTemplate in overviewSections.json
 *   are now unused.
 *
 * DATA CAVEATS — unchanged from the two superseded files, read
 * getCancerRankingData.js and getPrematureMortCauseData.js before touching
 * this file:
 * - Both pyramid charts rank their top N live in JS from raw per-type/
 *   per-cause files (no pre-ranked file delivered yet) — a deliberate,
 *   narrowly-scoped exception, see [[feedback_data_transforms_upstream]].
 * - ⚠ UNRESOLVED (see project memory): premature-mort-cause-heart-disease-
 *   *.json and premature-mort-cause-drug-use-*.json may have their values
 *   swapped upstream. Verify with Dan before treating the "leading causes"
 *   chart as final.
 *
 * NOTES:
 * - Server component — no "use client" (ComparisonStatTilesClient and
 *   PyramidChartSection are themselves client components that read
 *   ComparisonContext)
 * - Returns null if geoId is not set or neither chart has ranked data for
 *   the selected geography
 */

import PrematureDeathChartsRow   from '@/components/data-display/PrematureDeathChartsRow';
import { getIndicatorMeta }      from '@/lib/data/getIndicatorMeta';
import {
  loadPrematureMortCauseData,
  getTopCauseKeys,
  CAUSE_LABELS,
} from '@/lib/data/getPrematureMortCauseData';
import {
  loadCancerDistributionData,
  getTopCancerTypeKeys,
  CANCER_TYPE_LABELS,
} from '@/lib/data/getCancerRankingData';
import { pairDistributionSegments, buildSegmentCfg } from '@/lib/utils/distributionSegments';
import overviewSectionsCopy from '../../../content/site/overviewSections.json';

const {
  heading:              SECTION_HEADING,
  causeChartTitle:      CAUSE_CHART_TITLE,
  cancerChartTitle:     CANCER_CHART_TITLE,
} = overviewSectionsCopy.prematureDeathOverview;

const OVERALL_RATE_KEY = 'premature-mort-rate'; // already-live indicator, no new data read
const CAUSE_METRIC      = 'rate'; // per 100,000 — population-size-independent, fair across CDs
const CANCER_METRIC     = 'rate';
const CAUSE_TOP_N       = 5;

// Shared by both pyramid charts: turns a joined { GeoID, Distribution }
// dataset + a ranked list of top keys into the { segmentCfg, segments }
// shape PyramidChartSection/ComparisonPyramidChart expects. The row lookup
// (by geoId / citywide GeoID 0) is specific to this component; the
// segmentCfg-building and key→value pairing are shared — see
// distributionSegments.js (also used by resolveOverviewData.js's
// buildPyramidChart() and ComparisonPyramidChartClient.jsx).
function buildDistributionSegments(distributionData, geoId, topKeys, labelMap) {
  const primaryRow = distributionData.find(r => r.GeoID === geoId);
  const cityRow    = distributionData.find(r => r.GeoID === 0);

  const segmentCfg = buildSegmentCfg(topKeys, labelMap);
  const segments = pairDistributionSegments(primaryRow, cityRow, segmentCfg);

  return { segmentCfg, segments };
}

export default function PrematureDeathOverviewSection({ context }) {
  const { geoId, neighborhood } = context ?? {};
  if (!geoId) return null;

  const neighborhoodLabel = neighborhood ?? 'Neighborhood';

  // Stat tile (overall premature-mortality rate) removed 2026-09-27 per
  // Morgan — the rate already has its own card in the indicator grid above.
  // rateMeta is still read for the footnote's source line.
  const rateMeta = getIndicatorMeta(OVERALL_RATE_KEY);

  // ── Pyramid chart 1: leading types of cancer among premature deaths ──
  const cancerMeta = getIndicatorMeta(`cancer-rank-${CANCER_METRIC}`);
  const cancerDistributionData = loadCancerDistributionData(CANCER_METRIC);
  const cancerTopKeys = cancerMeta ? getTopCancerTypeKeys(cancerDistributionData, geoId) : [];
  let cancerChart = null;
  if (cancerMeta && cancerTopKeys.length) {
    const { segmentCfg, segments } = buildDistributionSegments(
      cancerDistributionData, geoId, cancerTopKeys, CANCER_TYPE_LABELS
    );
    cancerChart = {
      indicatorKey: 'cancer-rank-rate',
      title:        CANCER_CHART_TITLE || cancerMeta.title || 'Top causes of cancer-related premature death',
      segments,
      timePeriod:   cancerMeta.timePeriod ?? null,
      rawData:      cancerDistributionData,
      segmentCfg,
      valueSuffix:  '', // rate per 100,000 — not a percentage
      // For the card header + Details flyout (2026-09-27)
      // Fallback descriptor matches the top-causes card's subtitle line so the
      // two headers sit level (2026-09-28).
      subtitle:     cancerMeta.subtitle ?? 'Death before the age of 65 by cancer type; rate per 100,000 people',
      description:  cancerMeta.methodsNote ?? null,
      source:       cancerMeta.source ?? rateMeta?.source ?? null,
      sourceUrl:    cancerMeta.sourceUrl ?? null,
    };
  }

  // ── Pyramid chart 2: top causes of premature death overall ───────────
  const causeMeta = getIndicatorMeta(`premature-mort-cause-${CAUSE_METRIC}`);
  const causeDistributionData = loadPrematureMortCauseData(CAUSE_METRIC);
  const causeTopKeys = causeMeta ? getTopCauseKeys(causeDistributionData, geoId, CAUSE_TOP_N) : [];
  let causeChart = null;
  if (causeMeta && causeTopKeys.length) {
    const { segmentCfg, segments } = buildDistributionSegments(
      causeDistributionData, geoId, causeTopKeys, CAUSE_LABELS
    );
    causeChart = {
      indicatorKey: 'premature-mort-cause-rate',
      title:        CAUSE_CHART_TITLE || causeMeta.title || 'Top causes of premature death',
      segments,
      timePeriod:   causeMeta.timePeriod ?? null,
      rawData:      causeDistributionData,
      segmentCfg,
      valueSuffix:  '', // rate per 100,000 — not a percentage
    };
  }

  // causeChart no longer joins the shared pyramid/butterfly row — it renders
  // through PrematureMortCauseCard below instead (2026-09-16, see file
  // header). pyramidCharts is just [cancerChart] now; PyramidChartSection
  // still works unchanged with a single-chart array (see its own header —
  // grid-cols-2 with one item already lays out as one column).
  const pyramidCharts = [cancerChart].filter(Boolean);
  if (!pyramidCharts.length && !causeChart) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Heading blank since 2026-09-27 — these charts now read as part of
          Health outcomes rather than a separate "Premature Death Overview"
          sub-panel. Set prematureDeathOverview.heading to bring it back. */}
      {SECTION_HEADING && (
        <h3 className="text-lg font-semibold text-gray-900">{SECTION_HEADING}</h3>
      )}

      {/* Top causes + cancer types side by side under ONE shared "Compare
          to city" toggle (2026-09-28, per Morgan — same pattern as the At a
          Glance pyramids). Toggle state lives in the client row. */}
      <PrematureDeathChartsRow
        causeCardProps={causeChart ? {
          title:        causeChart.title,
          insightText:  causeMeta?.methodsNote,
          source:       causeMeta?.source,
          segments:     causeChart.segments,
          primaryLabel: neighborhoodLabel,
          rawData:      causeChart.rawData,
          segmentCfg:   causeChart.segmentCfg,
          geoId,
          valueSuffix:  causeChart.valueSuffix,
          anchorId:     `indicator-${causeChart.indicatorKey}`,
          indicatorKey: causeChart.indicatorKey,
        } : null}
        pyramidCharts={pyramidCharts}
        neighborhoodLabel={neighborhoodLabel}
        geoId={geoId}
      />

    </div>
  );
}
