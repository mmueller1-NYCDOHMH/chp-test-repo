/**
 * FILE: compareIndicator.js
 *
 * PURPOSE:
 * Utility functions for comparing a neighborhood indicator value
 * to a citywide baseline.
 *
 * DESCRIPTION:
 * Provides two levels of comparison:
 *
 *   computeDelta   — low-level arithmetic diff between two values.
 *                    Returns the delta text and a direction token
 *                    ('better' | 'worse' | 'neutral') based on the
 *                    indicator's higherIsBetter flag.
 *
 *   buildInsight   — higher-level function that accepts a full indicator
 *                    data array, finds the neighborhood and citywide rows,
 *                    and returns a structured object ready for display
 *                    (name, values, direction, label).
 *
 * NOTES:
 * - Pure functions — no side effects, no data fetching
 * - Safe to use in both server and client components
 * - Relies on formatGeography.displayName for prose-safe names
 */

import { displayName } from './formatGeography';

// ─── computeDelta ─────────────────────────────────────────────────────────────

/**
 * Computes the numeric delta between a neighborhood value and the citywide
 * baseline, and classifies the result as 'better', 'worse', or 'neutral'.
 *
 * @param {number|null} cdValue      — neighborhood value
 * @param {number|null} nycValue     — citywide baseline value
 * @param {object}      opts
 * @param {boolean|null} opts.higherIsBetter — true = higher is healthier,
 *                                             false = lower is healthier,
 *                                             null  = direction-less
 * @param {string}  [opts.deltaSuffix='']   — appended to the formatted delta text
 * @param {number}  [opts.decimals=1]       — decimal places for the delta value
 *
 * @returns {{ text: string, direction: 'better'|'worse'|'neutral' } | null}
 */
export function computeDelta(cdValue, nycValue, { higherIsBetter, deltaSuffix = '', decimals = 1 } = {}) {
  if (cdValue == null || nycValue == null) return null;

  const delta = cdValue - nycValue;
  if (Math.abs(delta) < 0.005) return { text: '≈ NYC avg', direction: 'neutral' };

  const sign         = delta > 0 ? '+' : '−';
  const absFormatted = Math.abs(delta).toFixed(decimals);
  const text         = `${sign}${absFormatted}${deltaSuffix} compared to NYC`;

  if (higherIsBetter == null) return { text, direction: 'neutral' };

  const isBetter = higherIsBetter ? delta > 0 : delta < 0;
  return { text, direction: isBetter ? 'better' : 'worse' };
}

// ─── buildInsight ─────────────────────────────────────────────────────────────

/**
 * Derives a human-readable comparison insight from a full indicator dataset.
 * Finds the neighborhood row (by geoId) and the citywide row (GeoID === 0),
 * then classifies the relationship as 'up', 'down', or 'neutral'.
 *
 * @param {Array}       indicatorData — raw rows from an indicator data file
 * @param {number}      geoId         — numeric GeoID of the selected neighborhood
 * @param {string}      title         — indicator name used in the insight prose
 *
 * @returns {{
 *   name:        string,
 *   cdDisplay:   string,
 *   cityDisplay: string,
 *   direction:   'up'|'down'|'neutral',
 *   label:       string,
 *   title:       string,
 * } | null}
 */
export function buildInsight(indicatorData, geoId, title) {
  if (!indicatorData?.length || !geoId) return null;

  const citywide = indicatorData.find(r => r.GeoID === 0);
  const selected = indicatorData.find(r => r.GeoID === geoId);

  if (!citywide || !selected) return null;

  const name        = displayName(selected.Geography);
  const cdVal       = selected.Value;
  const cityVal     = citywide.Value;
  const cdDisplay   = selected.DisplayValue ?? String(cdVal);
  const cityDisplay = citywide.DisplayValue ?? String(cityVal);

  const diff    = cdVal - cityVal;
  const relDiff = cityVal !== 0 ? Math.abs(diff / cityVal) : 0;

  let direction, label;
  if (relDiff < 0.05) {
    direction = 'neutral';
    label     = 'similar to';
  } else if (diff > 0) {
    direction = 'up';
    label     = relDiff > 0.25 ? 'much higher than' : 'higher than';
  } else {
    direction = 'down';
    label     = relDiff > 0.25 ? 'much lower than' : 'lower than';
  }

  return { name, cdDisplay, cityDisplay, direction, label, title };
}
