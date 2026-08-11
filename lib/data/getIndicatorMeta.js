import 'server-only';

/**
 * FILE: getIndicatorMeta.js
 *
 * SERVER-SIDE ONLY — uses fs to read from the filesystem at runtime.
 * For client-safe static indicator data, import from @/config/indicatorMeta.js
 * For client-safe search data, import from @/config/searchIndex.js
 *
 * PURPOSE:
 * Reads indicator metadata from /content/indicators/{key}.meta.json.
 *
 * This is the single source of truth for indicator display metadata
 * (title, subtitle, source, units, delta direction, etc.).
 *
 * DATA-PERSON WORKFLOW:
 *   To add a new indicator's metadata: create /content/indicators/{key}.meta.json
 *   To edit an existing indicator's metadata: edit that file directly
 *   No code changes needed in either case.
 *
 * FIELDS in each meta.json (all optional except key, title):
 *   key             — must match the data file name in /data/indicators/ (no extension)
 *   topic           — section ID this indicator belongs to (e.g. 'chronic-conditions')
 *   title           — full display title used in chart headers
 *   subtitle        — descriptor shown under the chart title (method, population, unit)
 *   source          — full source citation string
 *   sourceUrl       — optional link to source dataset
 *   timePeriod      — data collection period
 *   label           — short label for stat tiles
 *   unit            — sub-label shown under the value (e.g. 'of adults')
 *   displaySuffix   — appended to the displayed value (e.g. ' yrs')
 *   deltaSuffix     — appended to the citywide delta (e.g. ' pts')
 *   decimals        — decimal places for the delta value
 *   higherIsBetter  — true/false/null — controls delta badge direction
 *   showDelta       — false to suppress delta badge (e.g. raw counts)
 *   kind            — 'distribution' for segmented indicators
 *   segments        — array of { key, label } for distribution indicators
 */

import fs   from 'fs';
import path from 'path';

const META_DIR = path.join(process.cwd(), 'content', 'indicators');

/**
 * Load a single indicator's metadata by key.
 * Returns null if no meta.json exists for that key.
 *
 * @param {string} key — indicator key (e.g. 'obesity', 'life-expectancy')
 * @returns {object|null}
 */
export function getIndicatorMeta(key) {
  if (!key) return null;

  const filePath = path.join(META_DIR, `${key}.meta.json`);

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Load all indicator metadata from /content/indicators/*.meta.json.
 * Returns a flat object keyed by indicator key.
 * Used by searchIndex.js to build the search catalog.
 *
 * @returns {Record<string, object>}
 */
export function getAllIndicatorMeta() {
  try {
    const files = fs.readdirSync(META_DIR).filter(f => f.endsWith('.meta.json'));
    return Object.fromEntries(
      files.flatMap(f => {
        try {
          const meta = JSON.parse(fs.readFileSync(path.join(META_DIR, f), 'utf8'));
          return [[meta.key, meta]];
        } catch {
          console.warn(`[getAllIndicatorMeta] Malformed or unreadable: ${f}`);
          return [];
        }
      })
    );
  } catch {
    return {};
  }
}
