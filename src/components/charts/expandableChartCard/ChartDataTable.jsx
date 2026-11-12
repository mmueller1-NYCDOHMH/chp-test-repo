'use client';

/**
 * FILE: ChartDataTable.jsx
 *
 * PURPOSE:
 * Screen-reader data table for a standard ranked bar chart: every community
 * district, highest to lowest, plus Citywide (checklist #2's text alternative).
 * Visually hidden; read by screen readers only.
 *
 * WHERE IT RENDERS (2026-10-13, Morgan — "option 2"):
 * Only inside the Details flyout (IndicatorFlyoutContent) and the expanded
 * chart (ExpandedChartModal) — i.e. built when a reader opens one of those,
 * not on every card. Previously each of the ~45 cards on a profile page
 * carried its own 59-row table (~2,400 rows, ~167 KB of page markup) that
 * sighted users never see. The card itself keeps the one-sentence summary
 * (range + this neighborhood + comparison) and a hidden pointer telling
 * screen-reader users where the full table is. Details is offered on every
 * screen size (the expand button is desktop-only), so mobile screen-reader
 * users can always reach the table.
 *
 * sr-only sits on a wrapper div, not the <table> (Firefox draws a <caption>
 * outside the table box — QA row 160, see ComparisonBarChart).
 */

import { useMemo } from 'react';
import { buildChartTableRows } from '@/lib/charts/chartSummary';

export default function ChartDataTable({ title, data, geoId, compGeoId = null }) {
  const rows = useMemo(
    () => buildChartTableRows({ data, geoId, compGeoId }),
    [data, geoId, compGeoId],
  );
  if (!rows.length) return null;

  return (
    <div className="sr-only">
      {/* Keyed on content so Google Translate re-translates it when it changes (checklist #34). */}
      <table key={`${geoId}-${compGeoId}`}>
        <caption>{title}: value for every community district, highest to lowest</caption>
        <thead>
          <tr>
            <th scope="col">Community district</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key}>
              <th scope="row">{r.name}{r.note ? ` (${r.note})` : ''}</th>
              <td>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
