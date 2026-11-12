import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { cache } from 'react';

/**
 * FILE: segmentedFiles.js
 *
 * Reader for the data team's combined "Segments" files (Oct 2026 delivery).
 * Several indicator families now arrive as ONE file whose rows each carry a
 * list of segments, instead of one file per segment:
 *
 *   premature-mort.json         premature-mort-rate / -count and all
 *                               premature-mort-cause-{cause}-{count|rate}
 *   premature-mort-cancer.json  cancer-{type}-{count|rate}
 *   edu-achievement.json        edu-did-not-complete-hs,
 *                               edu-hsgrad-some-college,
 *                               edu-college-degree-and-higher
 *
 * Shape:
 *   { IndicatorKey, Label, Section, Subsection,
 *     Data: [{ GeoType, GeoID, Geography,
 *              Segments: [{ SegmentKey, Value, DisplayValue, ValueType,
 *                           LCLValue, UCLValue, NYCPValue, SegmentRank,
 *                           NYCComparison, ValueStatus }] }] }
 *
 * Each SegmentKey is the same name the old per-segment file had
 * (e.g. "premature-mort-cause-cancer-rate"), so the existing readers keep
 * asking for the same keys: when `{key}.json` doesn't exist, they call
 * readSegmentRows(dir, key) and get back ordinary flat indicator rows —
 *   { GeoType, GeoID, Geography, Value, DisplayValue, ValueType, LCLValue,
 *     UCLValue, NYCPValue, NYCComparison, ValueStatus, Rank }
 * (SegmentRank → Rank). No values are changed — only the nesting is undone.
 *
 * DISCOVERY is data-driven: every file in the folder whose Data rows carry a
 * Segments array is indexed, so a new combined file needs no code change.
 *
 * CACHING: the folder is scanned once per process in production (static
 * build). In development it's rescanned once per request (React cache) so
 * edited data files show up on refresh.
 */

function buildIndex(dataDir) {
  const index = new Map();
  let names;
  try {
    names = readdirSync(dataDir);
  } catch {
    return index;
  }

  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    let text;
    try {
      text = readFileSync(path.join(dataDir, name), 'utf-8');
    } catch {
      continue;
    }
    if (!text.includes('"Segments"')) continue; // cheap skip for flat files

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error(`[segmentedFiles] Failed to parse "${name}":`, err.message);
      continue;
    }

    const file = name.slice(0, -'.json'.length);
    for (const geo of Array.isArray(parsed?.Data) ? parsed.Data : []) {
      for (const seg of Array.isArray(geo?.Segments) ? geo.Segments : []) {
        if (!seg?.SegmentKey) continue;
        const { SegmentKey, SegmentRank, ...fields } = seg;
        if (!index.has(SegmentKey)) index.set(SegmentKey, { file, rows: [] });
        index.get(SegmentKey).rows.push({
          GeoType:   geo.GeoType,
          GeoID:     geo.GeoID,
          Geography: geo.Geography,
          ...fields,
          Rank:      SegmentRank ?? null,
        });
      }
    }
  }
  return index;
}

const prodIndexes = new Map();

const getIndex = cache(function getIndex(dataDir) {
  if (process.env.NODE_ENV !== 'production') return buildIndex(dataDir);
  if (!prodIndexes.has(dataDir)) prodIndexes.set(dataDir, buildIndex(dataDir));
  return prodIndexes.get(dataDir);
});

/**
 * Flat rows for one segment key, or null when no combined file in
 * `dataDir` carries it. Treat the returned array as read-only.
 *
 * @param {string} dataDir — absolute indicators folder
 * @param {string} segmentKey — e.g. 'premature-mort-rate', 'cancer-lung-rate'
 * @returns {Array<object>|null}
 */
export function readSegmentRows(dataDir, segmentKey) {
  return getIndex(dataDir).get(segmentKey)?.rows ?? null;
}
