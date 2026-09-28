/**
 * FILE: resolveOverviewData.js
 *
 * PURPOSE:
 * Data resolution utilities for the neighborhood overview / "At a Glance" section.
 *
 * DESCRIPTION:
 * Encapsulates all data-loading and transformation work that feeds
 * NeighborhoodOverviewHero. Components import these functions and stay
 * free of data-fetching and calculation logic.
 *
 * Exports:
 *   resolveIndicatorRows   — finds the neighborhood and citywide rows for an indicator
 *   buildStatTile          — transforms row data + config into a render-ready tile object
 *   buildPyramidChart      — resolves pyramid chart config into render-ready segments
 *
 * NOTES:
 * - SERVER-SIDE ONLY — delegates to loadIndicatorData which uses fs.readFileSync
 * - Depends on computeDelta from compareIndicator.js for delta calculations
 */

import { loadIndicatorData }  from '@/lib/data/loadIndicatorData';
import { computeDelta }       from '@/lib/utils/compareIndicator';
import { pairDistributionSegments } from '@/lib/utils/distributionSegments';

// ─── resolveIndicatorRows ─────────────────────────────────────────────────────

/**
 * Loads an indicator file and returns the row matching the given geoId
 * and the citywide row (GeoID === 0).
 *
 * @param {string} indicatorKey — matches a file under /data/indicators/
 * @param {number} geoId        — numeric GeoID of the selected neighborhood
 *
 * @returns {{ cdRow: object|null, nycRow: object|null }}
 */
export function resolveIndicatorRows(indicatorKey, geoId) {
  const rows = loadIndicatorData(indicatorKey);
  if (!rows.length) return { cdRow: null, nycRow: null };

  const cdRow  = rows.find(r => r.GeoID === geoId) ?? null;
  const nycRow = rows.find(r => r.GeoID === 0)     ?? null;
  return { cdRow, nycRow };
}

// ─── buildStatTile ────────────────────────────────────────────────────────────

/**
 * Transforms a stat tile config + resolved data rows into a render-ready
 * tile object consumed by the StatTile sub-component.
 *
 * @param {object}      cfg    — stat tile config (indicatorKey, label, unit, etc.)
 * @param {object|null} cdRow  — neighborhood data row
 * @param {object|null} nycRow — citywide data row
 *
 * @returns {{
 *   key:          string,
 *   kind:         'value',
 *   label:        string,
 *   unit:         string,
 *   displayValue: string|null,
 *   timePeriod:   string|null,
 *   delta:        { text: string, direction: string }|null,
 * }}
 */
export function buildStatTile(cfg, cdRow, nycRow) {
  const displayValue = cdRow
    ? `${cdRow.DisplayValue}${cfg.displaySuffix ?? ''}`
    : null;

  // Percent-type indicators store Value as a 0-1 fraction (e.g. 0.21 for
  // "21%") — DisplayValue already carries the formatted percent string, but
  // computeDelta() diffs raw Value. Left unscaled, a real 15-point gap
  // (0.21 vs 0.36) becomes "−0 pts compared to NYC" once toFixed(0) rounds
  // 0.15 down to nothing. Scale both values back into percentage points
  // before diffing so the delta text lands in the same units as the
  // headline DisplayValue and cfg.deltaSuffix (" pts").
  //
  // Detected via DisplayValue's own "%" rather than indicator metadata —
  // same fallback isCountDatatype() in IndicatorChartGrid.jsx uses — because
  // some percent indicators (born-outside-us, ltd-eng-prof) have no
  // data/metadata file at all, and their copy-deck tile label (unitOverride)
  // is editorial copy ("of residents"), not a bare "%".
  const isPercent = [cdRow?.DisplayValue, nycRow?.DisplayValue].some(
    v => typeof v === 'string' && v.includes('%')
  );
  const scale    = isPercent ? 100 : 1;
  const cdValue  = cdRow?.Value  != null ? cdRow.Value  * scale : null;
  const nycValue = nycRow?.Value != null ? nycRow.Value * scale : null;

  const delta = cfg.showDelta === false
    ? null
    : computeDelta(cdValue, nycValue, cfg);

  return {
    key:         cfg.indicatorKey,
    kind:        'value',
    label:       cfg.label,
    unit:        cfg.unit,
    displayValue,
    timePeriod:  cdRow?.TimePeriod ?? nycRow?.TimePeriod ?? null,
    delta,
  };
}

// ─── buildPyramidChart ────────────────────────────────────────────────────────

/**
 * Resolves a pyramid chart config into render-ready segment data by
 * looking up each segment key in the neighborhood and citywide Distribution
 * arrays (via the shared pairDistributionSegments() — see
 * distributionSegments.js, also used by ComparisonPyramidChartClient.jsx
 * and PrematureDeathOverviewSection.jsx).
 *
 * @param {object} cfg   — pyramid chart config (indicatorKey, title, segments)
 * @param {number} geoId — numeric GeoID of the selected neighborhood
 *
 * @returns {{
 *   indicatorKey: string,
 *   title:        string,
 *   segments:     Array<{ key, label, neighborhoodValue, citywideValue }>,
 *   timePeriod:   string|null,
 * }}
 */
export function buildPyramidChart(cfg, geoId) {
  const { cdRow, nycRow } = resolveIndicatorRows(cfg.indicatorKey, geoId);

  const segments = pairDistributionSegments(cdRow, nycRow, cfg.segments);

  return {
    indicatorKey: cfg.indicatorKey,
    title:        cfg.title,
    segments,
    timePeriod:   cdRow?.TimePeriod ?? nycRow?.TimePeriod ?? null,
  };
}
