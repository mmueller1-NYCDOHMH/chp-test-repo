import 'server-only';

/**
 * FILE: loadSectionIndicators.js
 *
 * SERVER-SIDE ONLY. Imported by Block.jsx and PageLayout.jsx (server components).
 *
 * PURPOSE:
 * Returns the ordered indicator cards for a section, plus the At-a-Glance
 * hero config, resolving each key's metadata via getIndicatorMeta().
 *
 * Placement + order come from the copy deck (content/copy/measure-copy.csv
 * → content/copy/indicatorCopy.json via `npm run copy`): a section's cards are
 * the keyed rows whose topic is that section id, in sheet order.
 *
 * WORKFLOW (adding an indicator to a section):
 *   1. Data team delivers data/indicators/{key}.json + data/metadata/{key}-meta.json
 *   2. Add a row to content/copy/measure-copy.csv with that Key, in the right
 *      Section/Subsection, at the position you want it to appear
 *   → No JSON or JS edits needed
 *
 * FALLBACK: loadSectionIndicators() returns null for a section id with no
 * rows in the copy deck, so Block.jsx falls back to the section config's
 * own charts prop.
 */

import { indicatorCopy } from '@/config/indicatorCopy';
import { getIndicatorMeta } from './getIndicatorMeta';

/** Keys placed in a section by the copy deck, in sheet order. */
function sectionKeys(sectionId) {
  return Object.values(indicatorCopy)
    .filter(row => row.topic === sectionId)
    .map(row => row.key);
}

/**
 * The ordered indicator cards for a section, from the copy deck.
 * Returns null if the deck places nothing there (Block.jsx then falls back
 * to the section config's own charts).
 *
 * @param {string} sectionId — matches the section ID constant (e.g. 'chronic-conditions')
 * @returns {Array|null}
 */
export function loadSectionIndicators(sectionId) {
  if (!sectionId) return null;

  const keys = sectionKeys(sectionId);
  if (!keys.length) return null; // not in the copy deck — fall back to config

  return keys
    .map(key => {
      const meta = getIndicatorMeta(key);
      if (!meta) {
        console.warn(`[loadSectionIndicators] No copy or metadata found for indicator key: "${key}" in section "${sectionId}"`);
        return null;
      }
      return {
        indicatorKey: meta.key,
        title:        meta.title,
        subtitle:     meta.subtitle   ?? null,
        source:       meta.source     ?? null,
        sourceUrl:    meta.sourceUrl  ?? null,
        // Passed through so IndicatorChartGrid can tell a raw count
        // indicator (blank unit) from a rate/percent/etc. one — see
        // isCountDatatype() there for how this is used.
        unit:         meta.unit       ?? '',
      };
    })
    .filter(Boolean);
}

/**
 * "Total population, Population by age: <Source> (<TimePeriod>). Born outside
 * the US: <Source> (<TimePeriod>)." — grouped by identical source + period,
 * built from the data team's metadata so it can't go stale.
 */
function buildSourceFootnote(metas) {
  const groups = new Map();
  for (const meta of metas) {
    if (!meta.sourceName) continue;
    const id = `${meta.sourceName}|${meta.timePeriod ?? ''}`;
    if (!groups.has(id)) groups.set(id, { source: meta.sourceName, period: meta.timePeriod, labels: [] });
    groups.get(id).labels.push(meta.label ?? meta.title);
  }
  const listJoin = (xs) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
  return [...groups.values()]
    .map(g => `${listJoin(g.labels)}: ${g.source.replace(/\.$/, '')}${g.period ? ` (${g.period})` : ''}.`)
    .join(' ');
}

/**
 * The At-a-Glance hero config (statTiles + pyramidCharts + sourceFootnote),
 * from the copy deck's "At a glance" rows, in sheet order. Returns null if
 * the deck has none. Each stat tile also carries title/subtitle/source/
 * sourceUrl/description for its expand modal (ComparisonStatTilesClient.jsx).
 *
 * @returns {{ statTiles: Array, pyramidCharts: Array, sourceFootnote: string } | null}
 */
export function loadOverviewHeroConfig() {
  const keys = sectionKeys('neighborhood-overview');
  if (!keys.length) return null;

  // "At a glance" rows in CSV order. Distribution indicators (kind set in
  // src/config/presets/indicatorDisplay.js) become pyramid charts; the rest
  // become stat tiles.
  const metas = keys.map(getIndicatorMeta).filter(Boolean);

  const statTiles = metas
    .filter(meta => meta.kind !== 'distribution')
    .map(meta => {
      return {
        indicatorKey:   meta.key,
        label:          meta.label          ?? meta.title,
        // Copy-deck sub-label ("of residents") over the data team's raw
        // `unit` ("%") — see `unitOverride` in getIndicatorMeta.js.
        unit:           meta.unitOverride    ?? meta.unit ?? null,
        deltaSuffix:    meta.deltaSuffix    ?? ' pts',
        decimals:       meta.decimals       ?? 0,
        higherIsBetter: meta.higherIsBetter ?? null,
        kind:           meta.kind           ?? undefined,
        segments:       meta.segments       ?? undefined,
        showDelta:      meta.showDelta      ?? undefined,
        // Carried through so the tile card's expand modal has real content
        // (title/subtitle/source/sourceUrl/description) — see
        // NeighborhoodOverviewHero.jsx and ComparisonStatTilesClient.jsx.
        title:          meta.title          ?? meta.label ?? null,
        subtitle:       meta.subtitle       ?? null,
        source:         meta.source         ?? null,
        sourceUrl:      meta.sourceUrl      ?? null,
        description:    meta.methodsNote    ?? null,
        // For the small-sample-size footnote on a flagged CD row (see
        // getFlaggedEstimateFootnote() in compareIndicator.js and
        // CONTENT-GUIDE.md section 11). dataSource is a display rule
        // (indicatorDisplay.js); isPercent is computed from the data team's
        // raw `unit` here — NOT `meta.unitOverride`/the `unit` field above,
        // which is editorial copy ("of residents"), not a raw "%" symbol.
        dataSource:     meta.dataSource      ?? null,
        isPercent:      meta.unit === '%',
      };
    })
    .filter(Boolean);

  const pyramidCharts = metas
    .filter(meta => meta.kind === 'distribution')
    .map(meta => {
      return {
        indicatorKey: meta.key,
        title:        meta.title,
        segments:     meta.segments ?? [],
      };
    })
    .filter(Boolean);

  return { statTiles, pyramidCharts, sourceFootnote: buildSourceFootnote(metas) };
}
