import 'server-only';

/**
 * FILE: loadSectionIndicators.js
 *
 * SERVER-SIDE ONLY — uses fs. Imported by Block.jsx and PageLayout.jsx (both server components).
 *
 * PURPOSE:
 * Reads /content/sections/{sectionId}.json to get the ordered list of
 * indicator keys for that section, then resolves each key's display
 * metadata (title, subtitle, source) from the indicator registry.
 *
 * Returns the same shape as the charts prop expected by IndicatorChartGrid,
 * so Block.jsx can inject it automatically — no charts array needed in
 * section config files.
 *
 * DATA-PERSON WORKFLOW (adding an indicator to a section):
 *   1. Put the data file in /data/indicators/{key}.json
 *   2. Edit /content/indicators/{key}.meta.json with the indicator's metadata
 *   3. Add the key to /content/sections/{sectionId}.json
 *   → No JS changes needed anywhere
 *
 * FALLBACK: returns null when no content file exists for the section,
 * allowing Block.jsx to fall back to the charts prop in the section config.
 * This keeps any sections not yet migrated working normally.
 */

import fs   from 'fs';
import path from 'path';
import { getIndicatorMeta } from './getIndicatorMeta';

const SECTIONS_DIR = path.join(process.cwd(), 'content', 'sections');

/**
 * Load the ordered indicator list for a section from its content JSON file.
 * Returns null if no file exists (safe fallback to config-defined charts).
 *
 * @param {string} sectionId — matches the section ID constant (e.g. 'chronic-conditions')
 * @returns {Array|null}
 */
export function loadSectionIndicators(sectionId) {
  if (!sectionId) return null;

  const filePath = path.join(SECTIONS_DIR, `${sectionId}.json`);

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null; // file doesn't exist or is malformed — fall back to config
  }

  const keys = parsed.indicators ?? [];
  if (!Array.isArray(keys) || keys.length === 0) return [];

  return keys
    .map(key => {
      const meta = getIndicatorMeta(key);
      if (!meta) {
        console.warn(`[loadSectionIndicators] No meta.json found for indicator key: "${key}" in section "${sectionId}"`);
        return null;
      }
      return {
        indicatorKey: meta.key,
        title:        meta.title,
        subtitle:     meta.subtitle   ?? null,
        source:       meta.source     ?? null,
        sourceUrl:    meta.sourceUrl  ?? null,
      };
    })
    .filter(Boolean);
}

/**
 * Load the neighborhood overview hero config (statTiles + pyramidCharts)
 * from /content/sections/neighborhood-overview.json.
 * Returns null if no file exists.
 *
 * Resolves each key's full metadata from meta.json and shapes it to match
 * the props expected by NeighborhoodOverviewHero.
 *
 * @returns {{ statTiles: Array, pyramidCharts: Array } | null}
 */
export function loadOverviewHeroConfig() {
  const filePath = path.join(SECTIONS_DIR, 'neighborhood-overview.json');

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }

  const statTiles = (parsed.statTiles ?? [])
    .map(key => {
      const meta = getIndicatorMeta(key);
      if (!meta) return null;
      return {
        indicatorKey:   meta.key,
        label:          meta.label          ?? meta.title,
        unit:           meta.unit           ?? null,
        displaySuffix:  meta.displaySuffix  ?? '',
        deltaSuffix:    meta.deltaSuffix    ?? ' pts',
        decimals:       meta.decimals       ?? 0,
        higherIsBetter: meta.higherIsBetter ?? null,
        kind:           meta.kind           ?? undefined,
        segments:       meta.segments       ?? undefined,
        showDelta:      meta.showDelta      ?? undefined,
      };
    })
    .filter(Boolean);

  const pyramidCharts = (parsed.pyramidCharts ?? [])
    .map(key => {
      const meta = getIndicatorMeta(key);
      if (!meta) return null;
      return {
        indicatorKey: meta.key,
        title:        meta.title,
        segments:     meta.segments ?? [],
      };
    })
    .filter(Boolean);

  return { statTiles, pyramidCharts };
}
