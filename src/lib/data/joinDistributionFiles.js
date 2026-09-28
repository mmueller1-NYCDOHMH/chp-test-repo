import { cache } from 'react';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * FILE: joinDistributionFiles.js
 *
 * PURPOSE:
 * Shared read/join/rank logic for "several raw per-segment files, no
 * pre-ranked file yet" indicators — the pattern getCancerRankingData.js (5
 * cancer-type files) and getPrematureMortCauseData.js (11
 * premature-mortality-cause files) both use. Each of those files started as
 * an independent, near-identical copy of this same per-geography file-join
 * loop and top-N ranking function (flagged in the 2026-09-02 sitewide
 * audit) — consolidated here so a fix to the join logic, error handling,
 * or row shape only needs to be made once as more indicator families adopt
 * this same pattern during the Option A migration
 * (see [[feedback_data_transforms_upstream]]).
 *
 * Each per-segment file is expected to be shaped
 * { Section, Subsection, IndicatorKey, Data: [...] } (the new-format
 * wrapped shape), with Data rows carrying GeoType/GeoID/Geography/Value/
 * DisplayValue.
 *
 * Not every family splits by metric — age-distribution (age0to17.json,
 * age18to24.json, ...) and race-ethnicity (race-asian.json, ...) each ship
 * one file per segment with no "-count"/"-rate" suffix (see
 * loadIndicatorData.js). Passing a falsy `metric` reads `{fileStem}.json`
 * directly instead of `{fileStem}-{metric}.json`.
 */

/**
 * Reads one new-format value file and returns its unwrapped Data array, or
 * [] if the file is missing (expected during rollout — logged only in
 * development) or fails to parse (logged always).
 *
 * @param {string} dataDir — absolute directory the file lives in
 * @param {string} fileStem — filename without the `-{metric}.json` suffix
 * @param {'count'|'rate'|null|undefined} metric — falsy reads `{fileStem}.json` with no suffix
 * @param {string} loggerLabel — caller name for warn/error messages, e.g. '[getCancerRankingData]'
 * @returns {Array<object>}
 */
export function readDistributionSegmentFile(dataDir, fileStem, metric, loggerLabel) {
  const fileName = metric ? `${fileStem}-${metric}.json` : `${fileStem}.json`;
  const filePath = path.join(dataDir, fileName);
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
    return Array.isArray(parsed.Data) ? parsed.Data : [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`${loggerLabel} No file for "${fileName}" — skipping.`);
      }
    } else {
      console.error(`${loggerLabel} Failed to parse "${fileName}":`, err.message);
    }
    return [];
  }
}

function joinDistributionRows(dataDir, fileMap, metric, loggerLabel) {
  const rowsByGeo = {};

  for (const [key, fileStem] of Object.entries(fileMap)) {
    const rows = readDistributionSegmentFile(dataDir, fileStem, metric, loggerLabel);
    for (const row of rows) {
      const geoId = row.GeoID;
      if (!rowsByGeo[geoId]) {
        rowsByGeo[geoId] = {
          GeoType:      row.GeoType,
          GeoID:        geoId,
          Geography:    row.Geography,
          Distribution: [],
        };
      }
      rowsByGeo[geoId].Distribution.push({
        key,
        value:        row.Value ?? null,
        displayValue: row.DisplayValue ?? null,
      });
    }
  }

  return Object.values(rowsByGeo);
}

/**
 * Joins one file per tracked segment (cancer type, cause of death, etc.)
 * into one row per geography, each carrying a Distribution array keyed by
 * segment. Wrapped in React's cache() so repeated calls with the same
 * (dataDir, fileMap, metric, loggerLabel) within one request re-use the
 * same joined result — fileMap must be a stable module-level object (not
 * recreated per render/call) for the cache to key on it correctly, since
 * cache() dedupes object arguments by reference.
 *
 * @param {string} dataDir
 * @param {Record<string,string>} fileMap — segment key → filename stem
 * @param {'count'|'rate'} metric
 * @param {string} loggerLabel
 * @returns {Array<{GeoType, GeoID, Geography, Distribution: Array<{key, value, displayValue}>}>}
 */
export const loadDistributionData = cache(joinDistributionRows);

/**
 * Ranks one geography's segments by value (descending, nulls excluded) and
 * returns the top N keys — the dynamic, per-geography equivalent of a
 * static meta.json `segments` list.
 *
 * @param {Array<{GeoID, Distribution}>} distributionRows
 * @param {number} geoId
 * @param {number} topN
 * @returns {string[]}
 */
export function getTopDistributionKeys(distributionRows, geoId, topN) {
  const row = distributionRows.find(r => r.GeoID === geoId);
  if (!row) return [];

  return [...row.Distribution]
    .filter(s => s.value != null)
    .sort((a, b) => b.value - a.value)
    .slice(0, topN)
    .map(s => s.key);
}
