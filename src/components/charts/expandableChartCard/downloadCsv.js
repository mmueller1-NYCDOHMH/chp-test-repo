/**
 * FILE: downloadCsv.js
 *
 * "Download CSV" for the expanded chart modals (2026-09-28). Serializes the
 * indicator's data rows exactly as they arrive from the data layer — no
 * filtering, sorting, or recomputation (see feedback_data_transforms_upstream).
 * Every geography in the file is included (Citywide, Boroughs, all CDs),
 * not just what the chart highlights.
 *
 * Only presentation-level shaping happens here:
 *   - Columns = union of keys across rows, with the core identity/value
 *     columns first so the file reads sensibly in Excel.
 *   - Distribution-shaped rows ({ ..., Distribution: [{ key, value,
 *     displayValue }] } — premature-death causes, cancer types) are written
 *     long-format: one line per geography × segment.
 *   - Suppressed values stay as they are in the JSON: empty Value,
 *     DisplayValue "suppressed".
 *   - UTF-8 BOM so Excel opens accented neighborhood names correctly.
 */

const LEAD_COLUMNS = ['IndicatorKey', 'GeoType', 'GeoID', 'Geography', 'Segment', 'Value', 'DisplayValue'];

function flattenRows(rows, indicatorKey) {
  const out = [];
  for (const row of rows ?? []) {
    if (!row || typeof row !== 'object') continue;
    const { Distribution, ...rest } = row;
    const base = indicatorKey ? { IndicatorKey: indicatorKey, ...rest } : rest;
    if (Array.isArray(Distribution)) {
      for (const seg of Distribution) {
        out.push({ ...base, Segment: seg?.key, Value: seg?.value, DisplayValue: seg?.displayValue });
      }
    } else {
      out.push(base);
    }
  }
  return out;
}

function escapeCell(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(rows, indicatorKey) {
  const flat = flattenRows(rows, indicatorKey);
  if (!flat.length) return '';

  const seen = new Set();
  flat.forEach(r => Object.keys(r).forEach(k => seen.add(k)));
  const columns = [
    ...LEAD_COLUMNS.filter(c => seen.has(c)),
    ...[...seen].filter(c => !LEAD_COLUMNS.includes(c)),
  ];

  const lines = [columns.join(',')];
  for (const r of flat) lines.push(columns.map(c => escapeCell(r[c])).join(','));
  return lines.join('\r\n');
}

export function hasCsvData(rows) {
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Full rows for the CSV (2026-10-13). Rows on the page are trimmed to the
 * fields the UI reads (see PAGE_ROW_FIELDS in loadIndicatorData.js), so for a
 * standard indicator the download fetches the complete source file —
 * confidence intervals, p-values, ValueType and all — from the static copy
 * scripts/publish-data-downloads.js puts in public/data/indicators/.
 * Distribution-shaped rows (age, race, education, causes) are assembled from
 * several files at build time and have no single source file, so they're
 * exported as-is. Any fetch problem falls back to the on-page rows.
 */
async function fullRowsFor(rows, indicatorKey) {
  if (!indicatorKey || (rows ?? []).some(r => Array.isArray(r?.Distribution))) return rows;
  try {
    const res = await fetch(`/data/indicators/${encodeURIComponent(indicatorKey)}.json`);
    if (!res.ok) return rows;
    const parsed = await res.json();
    return Array.isArray(parsed?.Data) && parsed.Data.length ? parsed.Data : rows;
  } catch {
    return rows;
  }
}

export async function downloadCsv(rows, indicatorKey, fallbackName = 'chart-data') {
  const csv = rowsToCsv(await fullRowsFor(rows, indicatorKey), indicatorKey);
  if (!csv) return;
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${indicatorKey || fallbackName}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
