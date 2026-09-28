/**
 * FILE: distributionSegments.js
 *
 * PURPOSE:
 * Shared helpers for turning a "one row per geography, each carrying a
 * Distribution array" dataset into the { key, label, neighborhoodValue,
 * citywideValue } segment shape ComparisonPyramidChart/PyramidChartSection
 * expect. Three call sites — resolveOverviewData.js's buildPyramidChart()
 * (At a Glance hero), ComparisonPyramidChartClient.jsx's
 * buildComparisonSegments() (comparison-neighborhood toggle), and
 * PrematureDeathOverviewSection.jsx's buildDistributionSegments() (cancer
 * types / leading causes) — each independently reimplemented this same
 * "build a key→value map from Distribution, then map segment keys through
 * it" pairing logic (flagged in the 2026-09-02 sitewide audit). Each site
 * keeps its own, genuinely different way of finding its two rows (a
 * resolveIndicatorRows() lookup, a rawData.find() by two different GeoIDs,
 * a live top-N ranking) — only the pairing math below was actually
 * duplicated, so only that part moved here.
 */

/**
 * Builds a { [segmentKey]: value } lookup from a row's Distribution array.
 * Returns {} for a missing row or a row with no Distribution.
 *
 * @param {{Distribution?: Array<{key, value}>}|null|undefined} row
 * @returns {Record<string, *>}
 */
export function distributionValueMap(row) {
  return Object.fromEntries((row?.Distribution ?? []).map(s => [s.key, s.value]));
}

/**
 * Same shape as distributionValueMap, but for each segment's pre-formatted
 * displayValue instead of its raw value. Distribution entries carry both
 * (see joinDistributionFiles.js) — displayValue is what the source data
 * file's own DisplayValue already renders as (e.g. "19%" for a 0.19
 * fraction, "6" for a per-100k rate that isn't a fraction at all).
 * Segment "value" fields are only ever meaningful for bar-width scaling
 * within a chart, not as display text — the two families of distributions
 * pyramid charts render (percentage splits like age/race vs. raw rates
 * like cancer/premature-mortality cause) don't share a unit, so there's no
 * single numeric-value+suffix formatting rule that's correct for both.
 * displayValue sidesteps that: it's already correct per source row.
 *
 * @param {{Distribution?: Array<{key, displayValue}>}|null|undefined} row
 * @returns {Record<string, string|null>}
 */
export function distributionDisplayValueMap(row) {
  return Object.fromEntries((row?.Distribution ?? []).map(s => [s.key, s.displayValue ?? null]));
}

/**
 * Pairs a primary row's and a reference row's Distribution values for a
 * given list of segments, keeping each segment's key/label alongside both
 * the raw values (used for bar-width scaling) and pre-formatted display
 * values (used for the on-chart text — see distributionDisplayValueMap).
 *
 * @param {object|null} primaryRow — row carrying the neighborhood's Distribution
 * @param {object|null} referenceRow — row carrying the comparison (citywide or comparison-CD) Distribution
 * @param {Array<{key: string, label: string}>} segmentCfg
 * @returns {Array<{key, label, neighborhoodValue, citywideValue, neighborhoodDisplayValue, citywideDisplayValue}>}
 */
export function pairDistributionSegments(primaryRow, referenceRow, segmentCfg) {
  const primaryValues   = distributionValueMap(primaryRow);
  const referenceValues = distributionValueMap(referenceRow);
  const primaryDisplay   = distributionDisplayValueMap(primaryRow);
  const referenceDisplay = distributionDisplayValueMap(referenceRow);

  return segmentCfg.map(({ key, label }) => ({
    key,
    label,
    neighborhoodValue: primaryValues[key]   ?? null,
    citywideValue:     referenceValues[key] ?? null,
    neighborhoodDisplayValue: primaryDisplay[key]   ?? null,
    citywideDisplayValue:     referenceDisplay[key] ?? null,
  }));
}

/**
 * Builds a segmentCfg array ({key, label}) from a ranked list of segment
 * keys and a key→label lookup — used where the segment list is computed
 * live (top-N ranking) rather than coming from a static config.
 *
 * @param {string[]} keys
 * @param {Record<string,string>} labelMap
 * @returns {Array<{key: string, label: string}>}
 */
export function buildSegmentCfg(keys, labelMap) {
  return keys.map(key => ({ key, label: labelMap[key] ?? key }));
}
