/**
 * FILE: chartSummary.js
 *
 * Screen-reader text alternative for the standard 59-district bar charts
 * (ExpandableChartCard). Accessibility checklist #2 (WCAG 1.1.1 / 1.3.1),
 * 2026-10-13.
 *
 * - buildChartSummary(): one short findings sentence — range (lowest /
 *   highest district), citywide, selected neighborhood and, when one is
 *   active, the comparison neighborhood. Deliberately has NO title and NO
 *   subtitle/description: the card's own <h4> and visible text already say
 *   those, and repeating them is what made the description read 2–3 times.
 * - buildChartTableRows(): every community district (sorted high → low) plus
 *   the citywide row, for the card's hidden data table.
 *
 * Runs on the client so the comparison neighborhood can be included and
 * stays current when it changes.
 */
import { isSuppressedRow } from '@/lib/utils/suppression';

const cleanName = (g) => String(g ?? '').replace(/\s*\([A-Z]{2}\d+\)$/i, '').trim();
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);
const shown = (row) =>
  !row ? null : isSuppressedRow(row) ? 'suppressed' : (row.DisplayValue ?? (isNum(row.Value) ? String(row.Value) : null));

export function buildChartSummary({ data, geoId, compGeoId }) {
  const rows = data ?? [];
  if (!rows.length) return '';

  const cdRows = rows.filter(r => r.GeoType === 'CD');
  const nycRow = rows.find(r => r.GeoID === 0);
  const find   = (id) => (id == null ? null : cdRows.find(r => r.GeoID === id));
  const sel    = find(geoId);
  const comp   = compGeoId != null && compGeoId !== geoId ? find(compGeoId) : null;

  const parts = [`Bar chart of ${cdRows.length} NYC community districts.`];
  const valued = cdRows.filter(r => isNum(r.Value) && !isSuppressedRow(r));
  if (valued.length) {
    const lo = valued.reduce((a, b) => (b.Value < a.Value ? b : a));
    const hi = valued.reduce((a, b) => (b.Value > a.Value ? b : a));
    parts.push(`Values range from ${shown(lo)} (${cleanName(lo.Geography)}) to ${shown(hi)} (${cleanName(hi.Geography)}).`);
  }
  if (sel)    parts.push(`${cleanName(sel.Geography)}: ${shown(sel) ?? 'no data'}.`);
  if (comp)   parts.push(`Comparison, ${cleanName(comp.Geography)}: ${shown(comp) ?? 'no data'}.`);
  if (nycRow) parts.push(`Citywide: ${shown(nycRow) ?? 'no data'}.`);
  return parts.join(' ');
}

export function buildChartTableRows({ data, geoId, compGeoId }) {
  const rows = data ?? [];
  const cd = rows
    .filter(r => r.GeoType === 'CD')
    .slice()
    .sort((a, b) => (isNum(b.Value) ? b.Value : -Infinity) - (isNum(a.Value) ? a.Value : -Infinity));
  const nycRow = rows.find(r => r.GeoID === 0);
  const out = cd.map(r => ({
    key: r.GeoID,
    name: cleanName(r.Geography),
    value: shown(r) ?? 'no data',
    note: r.GeoID === geoId ? 'selected' : (compGeoId != null && r.GeoID === compGeoId ? 'comparison' : ''),
  }));
  if (nycRow) out.push({ key: 'nyc', name: 'Citywide', value: shown(nycRow) ?? 'no data', note: '' });
  return out;
}
