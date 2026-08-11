/**
 * FILE: loadIndicatorData.js
 *
 * PURPOSE:
 * Shared server-side utility for reading a single indicator's JSON data file.
 *
 * DESCRIPTION:
 * Reads /data/indicators/{indicatorKey}.json and returns the parsed array.
 * Used by both IndicatorChartGrid (chart specs) and NeighborhoodOverviewHero
 * (stat tile values). Centralising the read avoids duplicated try/catch and
 * path construction in every consumer.
 *
 * RETURN SHAPE (each element):
 *   { GeoID, GeoType, Geography, Value, DisplayValue, TimePeriod }
 *
 * NOTES:
 * - SERVER-SIDE ONLY — uses Node fs.readFileSync
 * - Returns [] on error so callers can render gracefully without crashing
 */

import { readFileSync } from 'fs';
import path from 'path';

export function loadIndicatorData(indicatorKey) {
  try {
    const filePath = path.join(
      process.cwd(),
      'data',
      'indicators',
      `${indicatorKey}.json`
    );
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Data file not yet available — expected during development.
      // Suppressed in production to keep logs clean.
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[loadIndicatorData] No data file for "${indicatorKey}" — showing placeholder.`);
      }
    } else {
      // Unexpected error (e.g. malformed JSON) — always surface.
      console.error(`[loadIndicatorData] Failed to parse "${indicatorKey}":`, err.message);
    }
    return [];
  }
}
