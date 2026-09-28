/**
 * FILE: compareIndicator.js
 *
 * PURPOSE:
 * Utility functions for comparing a neighborhood indicator value
 * to a citywide baseline.
 *
 * DESCRIPTION:
 * Provides three levels of comparison:
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
 *   getFlaggedEstimateFootnote — returns the small-sample-size caveat text
 *                    for a CD row the data team flagged as statistically
 *                    unstable (ValueStatus: "flagged" in the indicator's
 *                    data file, which also carries a trailing "*" baked
 *                    into that row's DisplayValue, e.g. "95%*"). See
 *                    CONTENT-GUIDE.md section 11 ("Suppressed and
 *                    small-sample footnotes") for the wording rule this
 *                    implements — it was written but never wired up until
 *                    2026-09-03.
 *
 * NOTES:
 * - Pure functions — no side effects, no data fetching
 * - Safe to use in both server and client components
 * - Relies on formatGeography.displayName for prose-safe names
 */

import phrases from '../../../content/site/phrases.json';
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
    label     = phrases.comparison.similar;
  } else if (diff > 0) {
    direction = 'up';
    label     = phrases.comparison.higher;
  } else {
    direction = 'down';
    label     = phrases.comparison.lower;
  }

  return { name, cdDisplay, cityDisplay, direction, label, title };
}

// ─── getFlaggedEstimateFootnote ────────────────────────────────────────────────

/**
 * Returns the caveat footnote for a single CD row the data team flagged as
 * statistically unstable — per CONTENT-GUIDE.md section 11's wording rule:
 * which sentence to show depends on the indicator's data source (a survey
 * vs. an administrative/count-based system), and for administrative data,
 * whether the value is expressed as a rate or a percentage.
 *
 * Callers are responsible for checking that the specific row is actually
 * flagged (`row.ValueStatus === 'flagged'`) before rendering this — this
 * function only picks the wording, it doesn't decide whether to show one.
 *
 * @param {string|null|undefined} dataSource — 'survey' | 'administrative' |
 *   unset. Set in src/config/presets/indicatorDisplay.js, surfaced by
 *   getIndicatorMeta.js. Indicators that haven't been classified yet get no
 *   footnote at all, rather than a guessed one.
 * @param {boolean} [isPercent=false] — true when the indicator's raw unit
 *   is "%" (only consulted when dataSource is 'administrative' — picks
 *   "proportion" wording over "rate" wording).
 *
 * @returns {string|null} the footnote text (including its leading "*", to
 *   match the "*" already baked into the flagged row's DisplayValue), or
 *   null when dataSource is unset/unrecognized.
 */
export function getFlaggedEstimateFootnote(dataSource, isPercent = false) {
  if (dataSource === 'survey') {
    return phrases.flaggedFootnote.survey;
  }
  if (dataSource === 'administrative') {
    return isPercent
      ? phrases.flaggedFootnote.administrativePercent
      : phrases.flaggedFootnote.administrativeRate;
  }
  return null;
}

// ─── Insight badge / arrow helpers ──────────────────────────────────────────
// Shared by IndicatorFlyoutContent.jsx and the standalone indicator page
// (app/indicator/[key]/page.js) so both render the exact same up/down/neutral
// language for a CD-vs-citywide comparison. Extracted 2026-09-09 out of
// IndicatorFlyoutContent.jsx, which was the only place these lived — see that
// file's header for the original design rationale (arrow is purely numeric,
// badge color is a separate judgment call keyed off `higherIsBetter`).

/**
 * The arrow is purely numeric (↑ = CD value above citywide, ↓ = below,
 * regardless of what that means health-wise).
 */
export const DIRECTION_ARROWS = { up: '↑', down: '↓', neutral: '–' };

/**
 * Tailwind class string for the insight badge. The badge COLOR is a separate
 * judgment call from the arrow — red/green should track whether this CD is
 * doing better or worse than citywide, which depends on the indicator's
 * `higherIsBetter` flag, not the raw up/down direction.
 *
 * @param {'up'|'down'|'neutral'} direction
 * @param {boolean|null} higherIsBetter
 * @returns {string}
 */
export function getInsightBadgeClass(direction, higherIsBetter) {
  if (direction === 'neutral' || higherIsBetter == null) {
    return 'bg-gray-100 text-gray-600 border-gray-200';
  }
  const isGood = higherIsBetter ? direction === 'up' : direction === 'down';
  return isGood
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200';
}

// ─── Print-report comparison glyph ──────────────────────────────────────────
// Added 2026-09-09 for the printable Community Health Profile
// (src/app/print/neighborhood/[id]/page.js). The print report's legend is
// directional — ▲ higher, ▼ lower, ● similar, □ "context only". As of
// 2026-09-25 it ALSO flags better/worse vs citywide (returned as
// `assessment`), rendered as bold blue (better) / orange (worse) rather
// than the on-screen red/green, so it survives color-blindness and B/W
// printing (bold carries "better" even without color). So this reuses buildInsight()'s up/down/neutral
// classification (same 5%-relative-difference "same as citywide" threshold
// already used everywhere else in the app) but maps it to different glyphs,
// and adds a 4th state buildInsight() has no concept of: "context only".
//
// IMPORTANT — "context only" here is NOT computed from higherIsBetter or any
// other existing field. It's an editorial classification (content/print/
// reportManifest.json's `contextOnly` flag per indicator) lifted directly
// from the mockup Morgan shared, because the mockup's own pattern doesn't
// reduce to a simple rule — e.g. Poverty is marked context-only despite
// having a clear "lower is better" direction and both values present, while
// Unemployment right below it is treated as directional. See
// printable-report-technical-spec.md's "comparisonType" section for the
// full reasoning. A caller who doesn't have that flag should treat the
// indicator as directional (buildInsight()'s normal up/down/neutral).
//
// GLYPH NOTE: in the mockup, "□" is a small checkbox-style icon rendered
// inline before a context-only indicator's LABEL (see PrintIndicatorRow.jsx)
// — it is not a distinct symbol in the comparison-arrow column itself. Both
// "context only" and "no data available" render the same "—" glyph in that
// column; `direction` still distinguishes them ('context' vs 'noData') so
// the two get different screen-reader text even though they look identical.

export const PRINT_COMPARISON_ARROWS = { up: '▲', down: '▼', neutral: '●', context: '—', noData: '—' };

/**
 * Builds the print report's { glyph, srLabel, direction } for one indicator
 * row, given the indicator's data rows and whether the manifest flags it as
 * context-only.
 *
 * @param {Array}   indicatorData — raw rows from loadIndicatorData(key), or [] for a noData row
 * @param {number}  geoId         — numeric GeoID of the selected neighborhood
 * @param {boolean} contextOnly   — from reportManifest.json's per-indicator `contextOnly` flag
 * @param {boolean|null} higherIsBetter — from indicator meta; drives better/worse (null → no judgment)
 *
 * @returns {{
 *   glyph:    string,          // one of ▲ ▼ ● □ —
 *   srLabel:  string,          // visually-hidden text equivalent for screen readers
 *   direction: 'up'|'down'|'neutral'|'context'|'noData',
 * }}
 */
export function buildPrintComparison(indicatorData, geoId, contextOnly, higherIsBetter = null) {
  if (contextOnly) {
    return { glyph: PRINT_COMPARISON_ARROWS.context, srLabel: 'Context only, no directional comparison', direction: 'context' };
  }

  const citywide = indicatorData?.find(r => r.GeoID === 0);
  const selected  = geoId != null ? indicatorData?.find(r => r.GeoID === geoId) : null;

  if (!citywide || !selected || citywide.Value == null || selected.Value == null) {
    return { glyph: PRINT_COMPARISON_ARROWS.noData, srLabel: 'No comparison available', direction: 'noData' };
  }

  const insight = buildInsight(indicatorData, geoId, '');
  const direction = insight?.direction ?? 'neutral';
  // 2026-09-25 (per Morgan): print now also flags better/worse vs citywide,
  // using the indicator's higherIsBetter so "better" can mean higher OR lower.
  // 'similar' within the same 5% threshold; null when direction is unknown.
  let assessment = null;
  if (direction === 'neutral') assessment = 'similar';
  else if (higherIsBetter != null) {
    assessment = (higherIsBetter ? direction === 'up' : direction === 'down') ? 'better' : 'worse';
  }

  const srBase = {
    up:      'Higher than citywide average',
    down:    'Lower than citywide average',
    neutral: 'Similar to citywide average',
  }[direction];
  const srLabel = assessment === 'better' ? `${srBase}, better than citywide`
                : assessment === 'worse'  ? `${srBase}, worse than citywide`
                : srBase;

  return { glyph: PRINT_COMPARISON_ARROWS[direction], srLabel, direction, assessment };
}
