import 'server-only';

/**
 * FILE: loadPrintManifest.js
 *
 * SERVER-SIDE ONLY. Builds the printable Community Health Profile's
 * category > subsection > indicator structure
 * (src/app/print/neighborhood/[id]/page.js) and resolves each row's
 * metadata (getIndicatorMeta) and data (loadIndicatorData).
 *
 * 2026-09-26: STRUCTURE COMES FROM THE COPY DECK, the same as the web page.
 * Categories, sections, titles and row order are read from
 * content/copy/structure.json (generated from content/copy/measure-copy.csv
 * by `npm run copy`). content/print/reportManifest.json is RETIRED.
 *
 * Print-only differences live in content/print/printSettings.json:
 *   - per-key contextOnly / displayAs / unit / At a Glance group
 *   - the At a Glance category title and its sub-groups
 *   - insertBefore: extra rows not in the sheet (premature-mort-count)
 *
 * Sheet rows with no Key (NOT IN SITE measures) print as placeholder rows
 * (noData: true, em dash), labeled with their Measure. When one gets a Key
 * and data, it resolves like every other indicator — nothing to change here.
 *
 * Output shape (unchanged): { categories: [{ id, title, subsections: [{ id, title, indicators: [...] }] }] }
 * Each row's full data array (all CDs + citywide) is attached; row
 * selection by geoId happens in PrintIndicatorRow.jsx.
 */

import structure from '../../../content/copy/structure.json';
import printSettings from '../../../content/print/printSettings.json';
import { getIndicatorMeta } from './getIndicatorMeta';
import { loadIndicatorData } from './loadIndicatorData';

const settingsFor = (key) => printSettings.indicators?.[key] ?? {};

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function resolvePlannedRow(row) {
  return {
    key:       `planned-${slug(row.measure)}`,
    contextOnly: true,
    displayAs: null,
    noData:    true,
    title:     row.measure,
    unit:      '',
    subtitle:  null,
    source:    null,
    sourceUrl: null,
    decimals:  0,
    higherIsBetter: null,
    segments:  undefined,
    data:      [],
  };
}

function resolveIndicatorEntry(key) {
  const { contextOnly = false, displayAs = null, unit } = settingsFor(key);

  const meta = getIndicatorMeta(key);
  if (!meta) {
    console.warn(`[loadPrintManifest] No copy or metadata found for indicator key: "${key}"`);
  }

  return {
    key,
    contextOnly,
    displayAs,
    noData: false,
    // Short display label — the report's indicator column is narrow.
    title:    meta?.label    ?? meta?.title ?? key,
    // printSettings `unit` is a print-only caption override; falls back to
    // the shared tile label so the on-screen site is unaffected.
    unit:     unit ?? meta?.unitOverride ?? meta?.unit ?? '',
    subtitle: meta?.subtitle ?? null,
    source:   meta?.source   ?? null,
    sourceUrl: meta?.sourceUrl ?? null,
    decimals: meta?.decimals ?? 0,
    higherIsBetter: meta?.higherIsBetter ?? null,
    segments: meta?.segments,
    data: loadIndicatorData(key),
  };
}

/** Sheet rows → print rows, with printSettings.insertBefore extras spliced in. */
function resolveRows(rows) {
  const before = printSettings.insertBefore ?? {};
  return rows.flatMap(row => {
    if (row.planned) return [resolvePlannedRow(row)];
    return [...(before[row.key] ?? []), row.key].map(resolveIndicatorEntry);
  });
}

function buildAtAGlance() {
  const { title = 'At a Glance', groups = [] } = printSettings.atAGlance ?? {};
  if (!structure.atAGlance?.length || !groups.length) return null;
  const firstGroup = groups[0].id;
  return {
    id: 'at-a-glance',
    title,
    subsections: groups
      .map(group => ({
        id:    group.id,
        title: group.title,
        indicators: resolveRows(
          structure.atAGlance.filter(row =>
            !row.planned && (settingsFor(row.key).group ?? firstGroup) === group.id
          )
        ),
      }))
      .filter(sub => sub.indicators.length),
  };
}

/**
 * Builds the full print report structure from the copy deck + printSettings.
 *
 * @returns {{ categories: Array<{ id, title, subsections: Array<{ id, title, indicators: Array }> }> }}
 */
export function loadPrintManifest() {
  const categories = [
    buildAtAGlance(),
    ...structure.categories.map(cat => ({
      id:    cat.id,
      title: cat.label,
      subsections: cat.sections.map(sec => ({
        id:    sec.id,
        title: sec.label,
        indicators: resolveRows(sec.rows),
      })),
    })),
  ].filter(Boolean);

  return { categories };
}
