/**
 * FILE: getIndicatorSummaries.js
 *
 * PURPOSE:
 * Builds a per-neighborhood lookup of indicator display values for use in
 * the map hover tooltip / sidebar stat panel.
 *
 * DESCRIPTION:
 * Iterates over registered indicators (optionally filtered to a specific set
 * of keys), reads each data file, and indexes the CD rows by GeoID. The result
 * is a plain object that can be passed as a prop from PageLayout (server) to
 * MapHoverTooltip (client) without any client-side fetching.
 *
 * PARAMS:
 * - keys (optional): string[] — if provided, only indicators whose key is in
 *   this array are included. Pass the at-a-glance indicator keys here so the
 *   sidebar panel shows only that subset.
 *
 * RETURN SHAPE:
 * {
 *   [geoId: number]: Array<{
 *     key:          string,  // indicator key (e.g. 'obesity')
 *     label:        string,  // short display label (e.g. 'Adult Obesity')
 *     displayValue: string,  // formatted value (e.g. '32%')
 *     timePeriod:   string,  // e.g. '2018–2022'
 *   }>
 * }
 *
 * NOTES:
 * - SERVER-SIDE ONLY — calls loadIndicatorData which uses fs.readFileSync
 * - Synchronous — safe to call in server components without await
 * - Only CD rows are indexed (GeoType === 'CD'); citywide/borough rows excluded
 */

import { indicatorMeta } from '@/config/indicatorMeta';
import { loadIndicatorData } from './loadIndicatorData';

export function getIndicatorSummaries(keys = null) {
  /** @type {Record<number, Array<{key: string, label: string, displayValue: string, timePeriod: string}>>} */
  const summaries = {};

  const indicatorList = keys
    ? Object.values(indicatorMeta).filter(ind => keys.includes(ind.key))
    : Object.values(indicatorMeta);

  for (const indicator of indicatorList) {
    const rows = loadIndicatorData(indicator.key);

    for (const row of rows) {
      // Only community district rows; skip citywide and borough aggregates
      if (row.GeoType !== 'CD') continue;

      const geoId = row.GeoID;
      if (!summaries[geoId]) summaries[geoId] = [];

      summaries[geoId].push({
        key:          indicator.key,
        label:        indicator.label,
        displayValue: row.DisplayValue,
        timePeriod:   row.TimePeriod,
      });
    }
  }

  return summaries;
}
