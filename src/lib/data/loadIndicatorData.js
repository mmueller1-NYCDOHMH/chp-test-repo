/**
 * FILE: loadIndicatorData.js
 *
 * PURPOSE:
 * Shared server-side utility for reading a single indicator's JSON data file.
 *
 * DESCRIPTION:
 * Reads /data/indicators/{indicatorKey}.json (new-format, wrapped as
 * { Section, Subsection, IndicatorKey, Data: [...] }) and returns the
 * unwrapped Data array. Used by both IndicatorChartGrid (chart specs) and
 * NeighborhoodOverviewHero (stat tile values). Centralising the read avoids
 * duplicated try/catch and path construction in every consumer.
 *
 * SPECIAL CASE — 'age-distribution' / 'race-ethnicity': these two have no
 * single file of their own. The new export splits each into one file per
 * segment (age0to17.json...age65plus.json; race-asian.json...race-white.json)
 * instead of one file with an embedded Distribution array (the pre-promotion
 * old-format shape). Joined here via the same loadDistributionData() helper
 * the cancer/premature-mortality-cause readers use, so callers
 * (resolveOverviewData.js, NeighborhoodOverviewHero.jsx) keep working
 * unchanged — they still just call loadIndicatorData(key).
 *
 * RETURN SHAPE (each element):
 *   { GeoID, GeoType, Geography, Value, DisplayValue, TimePeriod }
 *   — or, for the two distribution keys above:
 *   { GeoID, GeoType, Geography, Distribution: [{ key, value, displayValue }] }
 *
 * NOTES:
 * - SERVER-SIDE ONLY — uses Node fs.readFileSync
 * - Returns [] on error so callers can render gracefully without crashing
 * - Wrapped in React cache(): the same key is read by several components per
 *   render (card, hero, map tooltip, print), so each file is parsed once per
 *   request. Callers must treat the returned array as read-only (every
 *   current caller filters/copies before sorting).
 */

import { readFileSync } from 'fs';
import path from 'path';
import { cache } from 'react';
import { loadDistributionData } from './joinDistributionFiles';

const DATA_DIR = path.join(process.cwd(), 'data', 'indicators');

// segment key -> data/indicators/ filename stem (no "-count"/"-rate"
// suffix for either family — see joinDistributionFiles.js).
const AGE_DISTRIBUTION_FILES = {
  under18:   'age0to17',
  age18to24: 'age18to24',
  age25to44: 'age25to44',
  age45to64: 'age45to64',
  age65plus: 'age65plus',
};

const RACE_ETHNICITY_FILES = {
  hispanic: 'race-latino',
  white:    'race-white',
  black:    'race-black',
  asian:    'race-asian',
  other:    'race-other',
};

// Education level (2026-09-29): the three attainment files together form one
// distribution (they sum to 100% per geography) for the Education split bar
// chart — see EducationLevelSection.jsx. Segment key = the indicator key, so
// copy (Measure) and metadata resolve per segment with no extra mapping.
const EDUCATION_LEVEL_FILES = {
  'edu-did-not-complete-hs':       'edu-did-not-complete-hs',
  'edu-hsgrad-some-college':       'edu-hsgrad-some-college',
  'edu-college-degree-and-higher': 'edu-college-degree-and-higher',
};

const DISTRIBUTION_FILE_MAPS = {
  'age-distribution': AGE_DISTRIBUTION_FILES,
  'race-ethnicity':   RACE_ETHNICITY_FILES,
  'education-level':  EDUCATION_LEVEL_FILES,
};

export const loadIndicatorData = cache(function loadIndicatorData(indicatorKey) {
  const fileMap = DISTRIBUTION_FILE_MAPS[indicatorKey];
  if (fileMap) {
    // No count/rate split for these two — falsy metric reads
    // `{fileStem}.json` with no suffix (see joinDistributionFiles.js).
    return loadDistributionData(DATA_DIR, fileMap, null, '[loadIndicatorData]');
  }

  try {
    const filePath = path.join(DATA_DIR, `${indicatorKey}.json`);
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
    return Array.isArray(parsed?.Data) ? parsed.Data : [];
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
});
