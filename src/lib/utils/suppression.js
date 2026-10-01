/**
 * FILE: suppression.js
 *
 * Suppressed-value checks + notes (2026-09-30).
 *
 * The data files mark a suppressed value two ways, and spell ValueStatus
 * "supressed" (one p) — e.g. assault-hosp.json:
 *   { Value: null, DisplayValue: "suppressed", ValueStatus: "supressed" }
 * Both fields and both spellings are matched, case-insensitively.
 * TODO(data team): standardize ValueStatus to "suppressed" upstream; this
 * check keeps working either way.
 *
 * Also used by buildBarChartSpec.js (bar labels) and chartCardUtils.js
 * (expanded legend), so every chart agrees on what "suppressed" means.
 *
 * Distribution charts (2026-10-01) — Education split bars, the pyramids
 * (age, race/ethnicity, cancer types) and the premature-death causes bars —
 * read joined rows ({ GeoID, Distribution: [{ key, value, displayValue }] },
 * see joinDistributionFiles.js). getDistributionSuppressionNote() checks only
 * the geographies + segments actually drawn on the chart.
 *
 * NOT used by Avertable Deaths: its "suppressed" rows are baseline /
 * negative-value / not-calculated CDs, not privacy suppression (asked the
 * data team for a distinct status). AvertableDeathsChart.jsx skips these
 * notes and passes hideSuppressionNote to the flyout.
 *
 * Copy lives in content/site/chartNotes.json (general.suppressed).
 */

import { generalNotes } from '@/config/chartNotes';

const SUPPRESSED_RE = /^sup{1,2}ressed$/i;

const isSuppressedText = (v) => SUPPRESSED_RE.test(String(v ?? '').trim());

/**
 * True for an indicator row ({ DisplayValue, ValueStatus }) or a joined
 * distribution segment ({ displayValue, valueStatus }).
 */
export function isSuppressedRow(row) {
  if (!row) return false;
  return isSuppressedText(row.DisplayValue ?? row.displayValue)
      || isSuppressedText(row.ValueStatus ?? row.valueStatus);
}

export function hasSuppressedValues(rows) {
  return Array.isArray(rows) && rows.some(isSuppressedRow);
}

/** Full suppression note when any value in `rows` is suppressed, else null. */
export function getSuppressionNote(rows) {
  return hasSuppressedValues(rows) ? (generalNotes.suppressed ?? null) : null;
}

/**
 * Full suppression note when any segment shown on a distribution chart is
 * suppressed, else null.
 *   rows   — joined distribution rows (all geographies)
 *   geoIds — the geographies drawn on the chart (null/undefined ignored)
 *   keys   — segment keys drawn on the chart (omit = all segments)
 */
export function getDistributionSuppressionNote(rows, geoIds, keys = null) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const ids = new Set((geoIds ?? []).filter(id => id != null));
  const keySet = keys ? new Set(keys) : null;
  const hit = rows.some(r =>
    ids.has(r.GeoID) &&
    (r.Distribution ?? []).some(s => (!keySet || keySet.has(s.key)) && isSuppressedRow(s)),
  );
  return hit ? (generalNotes.suppressed ?? null) : null;
}
