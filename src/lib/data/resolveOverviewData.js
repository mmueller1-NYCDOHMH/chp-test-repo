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
 *   buildNotableFindings   — scans all directional indicators and returns the ones
 *                            with the largest divergence from citywide
 *
 * NOTES:
 * - SERVER-SIDE ONLY — delegates to loadIndicatorData which uses fs.readFileSync
 * - Depends on computeDelta from compareIndicator.js for delta calculations
 */

import { loadIndicatorData }               from '@/lib/data/loadIndicatorData';
import { indicators as allIndicators }     from '@/config/registries/indicatorRegistry';
import { computeDelta }                    from '@/lib/utils/compareIndicator';

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

  const delta = cfg.showDelta === false
    ? null
    : computeDelta(cdRow?.Value ?? null, nycRow?.Value ?? null, cfg);

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
 * looking up each segment key in the neighborhood and citywide Distribution arrays.
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

  const cdByKey  = Object.fromEntries((cdRow?.Distribution  ?? []).map(s => [s.key, s.value]));
  const nycByKey = Object.fromEntries((nycRow?.Distribution ?? []).map(s => [s.key, s.value]));

  const segments = cfg.segments.map(s => ({
    key:               s.key,
    label:             s.label,
    neighborhoodValue: cdByKey[s.key]  ?? null,
    citywideValue:     nycByKey[s.key] ?? null,
  }));

  return {
    indicatorKey: cfg.indicatorKey,
    title:        cfg.title,
    segments,
    timePeriod:   cdRow?.TimePeriod ?? nycRow?.TimePeriod ?? null,
  };
}

// ─── buildNotableFindings ─────────────────────────────────────────────────────

const MAX_FINDINGS = 4;

/**
 * Scans all registered indicators that have a data file and a meaningful
 * directionality (higherIsBetter !== null). Computes the delta vs citywide
 * for the given neighborhood, sorts by absolute magnitude descending, and
 * returns up to MAX_FINDINGS entries.
 *
 * @param {number} geoId — numeric GeoID of the selected neighborhood
 *
 * @returns {Array<{
 *   key:          string,
 *   label:        string,
 *   isBetter:     boolean,
 *   absDelta:     number,
 *   deltaText:    string,
 *   displayValue: string,
 * }>}
 */
export function buildNotableFindings(geoId) {
  const directional = Object.values(allIndicators).filter(
    ind => ind.higherIsBetter != null && ind.key
  );

  const results = [];

  for (const ind of directional) {
    let rows;
    try { rows = loadIndicatorData(ind.key); } catch { continue; }
    if (!rows || !rows.length) continue;

    const cdRow  = rows.find(r => r.GeoID === geoId);
    const nycRow = rows.find(r => r.GeoID === 0);
    if (!cdRow || !nycRow || cdRow.Value == null || nycRow.Value == null) continue;

    const delta    = cdRow.Value - nycRow.Value;
    const absDelta = Math.abs(delta);
    if (absDelta < 0.5) continue;

    const isBetter  = ind.higherIsBetter ? delta > 0 : delta < 0;
    const sign      = delta > 0 ? '+' : '−';
    const decimals  = ind.decimals ?? 0;
    const suffix    = ind.deltaSuffix ?? '';
    const deltaText = `${sign}${Math.abs(delta).toFixed(decimals)}${suffix}`;

    results.push({
      key:          ind.key,
      label:        ind.label ?? ind.title,
      isBetter,
      absDelta,
      deltaText,
      displayValue: cdRow.DisplayValue,
    });
  }

  results.sort((a, b) => b.absDelta - a.absDelta);
  return results.slice(0, MAX_FINDINGS);
}
