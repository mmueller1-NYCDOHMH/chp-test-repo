import 'server-only';

/**
 * FILE: getIndicatorMeta.js
 *
 * SERVER-SIDE ONLY — uses fs to read data/metadata/{key}-meta.json.
 *
 * Merges the three homes of indicator metadata (2026-09-26 — the combined
 * src/config/indicatorMeta.json is RETIRED and no longer read anywhere):
 *
 *   1. COPY — content/copy/indicatorCopy.json (built from the copy-deck CSV
 *      content/copy/measure-copy.csv by `npm run copy`), via
 *      @/config/indicatorCopy. The ONLY source for copy fields: title/label
 *      (Measure), context, comparison, type, of, detail, units,
 *      indicatorDetail, topic (section placement).
 *
 *   2. DATA FACTS — data/metadata/{key}-meta.json (data team export):
 *      source, timePeriod, methodsNote, denominatorSource, ageAdjustment,
 *      decimals, unit (raw, e.g. "%"). Title/Subtitle are used only for keys
 *      with no copy-deck row (e.g. cancer-rank-rate, premature-mort-cause-rate).
 *      The metadata's own type/of/detail/units columns are ignored — they
 *      duplicated the CSV (identical for every key as of 2026-09-27).
 *
 *   3. DISPLAY RULES — @/config/presets/indicatorDisplay.js:
 *      higherIsBetter, showDelta, dataSource, sourceUrl, kind, segments,
 *      dataMetaKey.
 *
 * DATA-PERSON WORKFLOW:
 *   Copy        → edit content/copy/measure-copy.csv, run `npm run copy`
 *   Data facts  → edit data/metadata/{key}-meta.json
 *   Display     → edit src/config/presets/indicatorDisplay.js
 *
 * RETURNED SHAPE: key, topic, title, label, subtitle, context, comparison,
 * copyFlag, source, sourceUrl, timePeriod, unit, unitOverride, type, of,
 * detail, units, indicatorDetail, deltaSuffix, decimals,
 * higherIsBetter, showDelta, methodsNote, denominatorSource, ageAdjustment,
 * kind, segments, dataSource.
 */

import fs   from 'fs';
import path from 'path';
import { cache } from 'react';

import { indicatorCopy, indicatorKeys } from '@/config/indicatorCopy';
import { indicatorDisplay } from '@/config/presets/indicatorDisplay';
import { normalizeDataMetaFields, formatSourceCitation } from './normalizeDataMeta';

const DATA_META_DIR = path.join(process.cwd(), 'data', 'metadata');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// Always "{key}-meta.json" — `npm run copy` warns when one is missing.
function readDataMeta(key) {
  return readJsonSafe(path.join(DATA_META_DIR, `${key}-meta.json`));
}

// Stat-tile sub-label ("of residents", "per 100,000", "people"), built from
// the copy deck's type/of/units columns.
function buildTileLabel({ type, of, units }) {
  if (type === 'Percent' && of) return `of ${of}`;
  return units || of || null;
}

// Plain-language fallback subtitle from the copy deck, used only when
// neither a resolved narrative nor a data-team Subtitle exists.
function buildCopySubtitle({ type, of, detail, units }) {
  if (!of) return null;
  const lead = type ? `${type} of ${of}` : of;
  return [lead, detail, units].filter(Boolean).join(' ');
}

/**
 * Wrapped in React cache() — the same key is resolved by several components
 * per render (card grid, hero, search, print), so each file is read once
 * per request.
 *
 * @param {string} key — indicator key (e.g. 'obesity', 'life-expectancy')
 * @returns {object|null} null when no source knows this key
 */
export const getIndicatorMeta = cache(function getIndicatorMeta(key) {
  if (!key) return null;

  const display  = indicatorDisplay[key] ?? {};
  const copy     = indicatorCopy[key] ?? null;
  const dataMeta = readDataMeta(display.dataMetaKey ?? key);

  if (!copy && !dataMeta) return null;

  const c    = copy ?? {};
  const norm = normalizeDataMetaFields(dataMeta) ?? {};
  // Segment files (age0to17, race-asian) describe one segment, not the whole
  // distribution — only borrow their citation fields, never their copy.
  const isBorrowed = Boolean(display.dataMetaKey);

  const type   = c.type   || null;
  const of     = c.of     || null;
  const detail = c.detail || null;
  const units  = c.units  || null;
  const title  = c.measure || (!isBorrowed && norm.title) || key;

  return {
    key,
    topic:             c.topic || null,
    title,
    label:             c.measure || (!isBorrowed && norm.label) || title,
    subtitle:          (!isBorrowed && norm.subtitle) || buildCopySubtitle({ type, of, detail, units }),
    context:           c.context || null,
    comparison:        c.comparison || null,
    copyFlag:          c.flag || null,
    source:            formatSourceCitation(norm.source, norm.timePeriod) ?? null,
    sourceName:        norm.source || null,
    sourceUrl:         display.sourceUrl ?? null,
    timePeriod:        norm.timePeriod || null,
    // Raw data-team unit ("%", "") — drives count-vs-rate chart logic in
    // IndicatorChartGrid.jsx's isCountDatatype(). Don't replace with copy.
    unit:              isBorrowed ? null : (norm.unit || null),
    // Editorial sub-label for At-a-Glance tiles / print rows (see
    // loadOverviewHeroConfig() in loadSectionIndicators.js, loadPrintManifest.js).
    unitOverride:      buildTileLabel({ type, of, units }),
    type,
    of,
    detail,
    units,
    indicatorDetail:   c.indicatorDetail || null,
    deltaSuffix:       norm.unit === '%' ? ' pts' : '',
    decimals:          dataMeta?.Decimals ?? 0,
    higherIsBetter:    display.higherIsBetter ?? null,
    showDelta:         display.showDelta ?? undefined,
    methodsNote:       norm.methodsNote || null,
    denominatorSource: norm.denominatorSource || null,
    ageAdjustment:     dataMeta?.AgeAdjustment ?? null,
    kind:              display.kind ?? undefined,
    segments:          display.segments ?? undefined,
    dataSource:        display.dataSource ?? null,
  };
});

/**
 * All indicator metadata keyed by indicator key — roster is every keyed row
 * in the copy deck.
 *
 * @returns {Record<string, object>}
 */
export const getAllIndicatorMeta = cache(function getAllIndicatorMeta() {
  return Object.fromEntries(
    indicatorKeys.flatMap(key => {
      const resolved = getIndicatorMeta(key);
      return resolved ? [[key, resolved]] : [];
    })
  );
});
