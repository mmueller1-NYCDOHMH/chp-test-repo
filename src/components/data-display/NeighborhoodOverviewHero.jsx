/**
 * FILE: NeighborhoodOverviewHero.jsx
 *
 * PURPOSE:
 * Neighborhood profile hero — surfaces five demographic Who-We-Are
 * indicators for the selected community district with comparison to NYC.
 *
 * DESCRIPTION:
 * Server component that renders:
 * 1. A neighborhood identity header (name only — borough subheader removed
 *    since it reads as confusing/incorrect once a user adds a comparison
 *    community district in a different borough)
 * 2. A row of three StatTiles: total population, nativity, language
 * 3. Two ComparisonPyramidCharts side by side: Age Breakdown and Race / Ethnicity,
 *    each showing Neighborhood vs. NYC Citywide bars back-to-back per category.
 *
 * All data is read at server-render time from /data/indicators/*.json.
 * Adding, removing, or reordering tiles/charts requires only a config change.
 *
 * STAT TILE CONFIG SHAPE (each item in the `statTiles` prop array):
 *   indicatorKey    — matches a file in /data/indicators/ (e.g. 'overall-pop')
 *   label           — tile heading
 *   unit            — sub-label shown below the value
 *   displaySuffix   — appended to DisplayValue
 *   deltaSuffix     — appended to the delta figure
 *   decimals        — decimal places for the delta value (default 0)
 *   higherIsBetter  — true / false / null
 *                     true  = higher is healthier (e.g. life expectancy)
 *                     false = lower is healthier (e.g. obesity)
 *                     null  = direction-less; delta renders in neutral styling
 *   showDelta       — explicit false to suppress the delta badge entirely
 *   title, subtitle, source, sourceUrl, description
 *                   — carried through to the tile so clicking it can open
 *                     a fuller-view modal with the same content the
 *                     indicator "Details" flyout shows elsewhere
 *   dataSource, isPercent
 *                   — carried through so a flagged CD row (small sample
 *                     size) can show the right caveat footnote — see
 *                     getFlaggedEstimateFootnote() in compareIndicator.js
 *
 * Each tile is clickable — see ComparisonStatTilesClient.jsx, which opens a
 * centered expand modal (StatTileDetailModal) on click/Enter/Space.
 *
 * PYRAMID CHART CONFIG SHAPE (each item in the `pyramidCharts` prop array):
 *   indicatorKey    — matches a file in /data/indicators/ with a Distribution array
 *   title           — chart heading
 *   segments        — [{ key, label }] — keys match Distribution entries in the data
 *
 * CONTEXT (injected by CHPBuilder):
 *   context.geoId        — numeric GeoID used to look up the neighborhood row
 *   context.neighborhood — human-readable name
 *   context.borough      — borough name
 *   context.cdNumber     — community district number within the borough
 *
 * NOTES:
 * - Server component — no "use client"
 * - Returns null if geoId is not set (no neighborhood selected)
 * - Gracefully renders "—" tiles when a data file is missing or the geoId
 *   has no matching row
 * - Data resolution lives in @/lib/data/resolveOverviewData
 * - Delta calculations live in @/lib/utils/compareIndicator
 */

import ComparisonStatTilesClient    from '@/components/data-display/ComparisonStatTilesClient';
import AtAGlanceTitle               from '@/components/data-display/AtAGlanceTitle';
import PyramidChartSection          from '@/components/data-display/PyramidChartSection';
import ComparisonPyramidChartClient from '@/components/data-display/ComparisonPyramidChartClient';
import { loadIndicatorData }        from '@/lib/data/loadIndicatorData';
import {
  resolveIndicatorRows,
  buildStatTile,
  buildPyramidChart,
} from '@/lib/data/resolveOverviewData';
import overviewSectionsCopy from '../../../content/site/overviewSections.json';

const { sourceFootnoteSuffix: HERO_FOOTNOTE_SUFFIX } = overviewSectionsCopy.neighborhoodOverviewHero;

// ─── Sub-components moved to ComparisonStatTilesClient.jsx ───────────────────
// StatTile is now rendered by the client component so it can read comparison
// context and show comparison CD values without making this server component
// a client component.

// ─── Main component ───────────────────────────────────────────────────────────

export default function NeighborhoodOverviewHero({
  statTiles     = [],
  pyramidCharts = [],
  sourceFootnote = '',
  context,
}) {
  const { geoId, neighborhood } = context ?? {};

  if (!geoId) return null;

  const resolvedTiles = statTiles.map((cfg) => {
    const { cdRow, nycRow } = resolveIndicatorRows(cfg.indicatorKey, geoId);
    const tile = buildStatTile(cfg, cdRow, nycRow);
    // Carry displaySuffix through so the client component can format comparison values identically.
    // Also carry title/subtitle/source/sourceUrl/description through so each tile can open its
    // expand modal with real content — see ComparisonStatTilesClient.jsx.
    return {
      ...tile,
      displaySuffix:  cfg.displaySuffix  ?? '',
      title:          cfg.title       ?? cfg.label,
      subtitle:       cfg.subtitle    ?? null,
      source:         cfg.source      ?? null,
      sourceUrl:      cfg.sourceUrl   ?? null,
      description:    cfg.description ?? null,
      dataSource:     cfg.dataSource  ?? null,
      isPercent:      cfg.isPercent   ?? false,
      // buildStatTile() (above) doesn't carry higherIsBetter through to its
      // returned tile object — it only uses cfg.higherIsBetter internally to
      // compute the delta pill's direction. The expand modal's insight badge
      // needs the flag itself (not just the delta), so it can tell "up" from
      // "good" — see getInsightBadgeClass() in ComparisonStatTilesClient.jsx.
      higherIsBetter: cfg.higherIsBetter ?? null,
    };
  });

  // Raw data per stat-tile indicator — passed to the client wrapper so it can
  // look up comparison CD values without an additional server round-trip.
  const rawDataByKey = Object.fromEntries(
    statTiles.map(cfg => [cfg.indicatorKey, loadIndicatorData(cfg.indicatorKey)])
  );

  const resolvedPyramids = pyramidCharts.map(cfg => ({
    ...buildPyramidChart(cfg, geoId),
    // Carry raw data + segment config so the client wrapper can resolve comparison segments
    rawData:    loadIndicatorData(cfg.indicatorKey),
    segmentCfg: cfg.segments,
  }));

  return (
    <div className="flex flex-col gap-6">

      {/* ── Identity header ─────────────────────────────────── */}
      <div>
        <AtAGlanceTitle neighborhood={neighborhood ?? 'Neighborhood'} />
      </div>

      {/* ── Stat tiles (population, nativity, language) ──────── */}
      {/* Client component — reads ComparisonContext to show comparison CD values */}
      <ComparisonStatTilesClient
        tiles={resolvedTiles}
        rawDataByKey={rawDataByKey}
        primaryLabel={neighborhood ?? 'Neighborhood'}
        geoId={geoId}
      />

      {/* ── Comparison pyramid charts (age + race/ethnicity) ─── */}
      <PyramidChartSection
        charts={resolvedPyramids}
        neighborhoodLabel={neighborhood ?? 'Neighborhood'}
        geoId={geoId}
      />

      {/* ── Source footnote ─────────────────────────────────── */}
      {/* Sources + years are built from each tile's data/metadata file
          (loadOverviewHeroConfig → buildSourceFootnote), so they update with
          the data. The closing sentence lives in
          /content/site/overviewSections.json (sourceFootnoteSuffix). */}
      <p className="text-xs text-gray-600 border-t border-gray-100 pt-4">
        {[sourceFootnote, HERO_FOOTNOTE_SUFFIX].filter(Boolean).join(' ')}
      </p>

    </div>
  );
}
