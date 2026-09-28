/**
 * FILE: PrintIndicatorRow.jsx
 *
 * PURPOSE:
 * One row of the printable Community Health Profile's indicator tables —
 * indicator label (+ unit caption, + a small □ marker when the manifest
 * flags it contextOnly), neighborhood value, citywide value, comparison
 * glyph (▲▼●—).
 *
 * Server component, no client JS. Real <th scope="row"> for the label (see
 * PrintSubsectionTable.jsx for the surrounding <table>/<caption>/<thead>)
 * so the printed/PDF output keeps correct table semantics, not just visual
 * alignment.
 *
 * PROPS:
 *   indicator — one resolved entry from loadPrintManifest() (title, unit,
 *               contextOnly, noData, displayAs, data, segments, ...)
 *   geoId     — numeric GeoID of the selected neighborhood
 *
 * NOTES:
 * - Server-only (no 'use client'); imports are all pure/server-safe.
 * - The Neighborhood <td> carries `bg-brand-tint` to continue the column
 *   band started by the header cell in PrintSubsectionTable.jsx (added
 *   2026-09-09 to match the mockup's focal-column treatment).
 * - OVERFLOW FIX (2026-09-09, second pass): both value cells originally
 *   kept `whitespace-nowrap` for everything except topSegments rows, on
 *   the assumption a single number/percent never needs to wrap. That broke
 *   for wider values once table-fixed pinned these to a fixed, fairly
 *   narrow percentage width (see PrintSubsectionTable.jsx) — a citywide
 *   count like "8,478,072" or "76,971" has no space to wrap at and
 *   `nowrap` gives the browser no permission to break it at all, so it
 *   just overflowed past the column edge in the real printed/PDF output.
 *   Both cells now use `whitespace-normal break-words` unconditionally
 *   (same treatment topSegments already had): normal wrapping is preferred
 *   when there's room, and break-words only kicks in as a last resort to
 *   break an unbreakable token that still doesn't fit — so short values
 *   still render on one line, and nothing bleeds into the next column.
 */

import { buildPrintComparison, PRINT_COMPARISON_ARROWS } from '@/lib/utils/compareIndicator';
import { pairDistributionSegments } from '@/lib/utils/distributionSegments';

export default function PrintIndicatorRow({ indicator, geoId }) {
  const { title, unit, contextOnly, noData, displayAs, data, segments, higherIsBetter } = indicator;

  let isSegments          = false;
  let neighborhoodDisplay = '—';
  let citywideDisplay     = '—';
  let comparison          = { glyph: PRINT_COMPARISON_ARROWS.noData, srLabel: 'No comparison available', direction: 'noData' };

  if (noData) {
    // Genuine content gap (no data/indicators/ file exists yet for this
    // key) — see reportManifest.json's `_note`. Values stay '—'; the
    // comparison stays the default noData state set above.
  } else if (displayAs === 'topSegments') {
    // 2026-09-25: rendered as real sub-rows (see below) — each of the
    // neighborhood's top-2 groups gets its own row with the neighborhood
    // AND citywide share in the proper columns, instead of a squeezed
    // "25–44: 32% · 45–64: 23%" string.
    isSegments = true;
  } else {
    const selectedRow = geoId != null ? data.find(r => r.GeoID === geoId) : null;
    const citywideRow = data.find(r => r.GeoID === 0);
    neighborhoodDisplay = selectedRow?.DisplayValue ?? '—';
    citywideDisplay     = citywideRow?.DisplayValue ?? '—';
    comparison           = buildPrintComparison(data, geoId, contextOnly, higherIsBetter);
  }

  // Better/worse vs citywide (2026-09-25). Blue/orange instead of green/red
  // (color-blind safe); bold = better so it still reads in B/W print, and
  // the ▲▼● glyph + sr-only label carry the rest.
  const assessment = comparison.assessment;
  const valueTone =
    assessment === 'better' ? 'font-bold text-[#1f4e99]' :
    assessment === 'worse'  ? 'font-normal text-[#b3470b]' :
                              'font-normal text-gray-900';
  const glyphTone =
    assessment === 'better' ? 'text-[#1f4e99]' :
    assessment === 'worse'  ? 'text-[#b3470b]' :
                              'text-gray-500';

  // Context-only rows show □ in the comparison column (2026-09-25) instead
  // of before the label — the old inline □ indented only some labels, so
  // indicator names didn't line up down the column.
  const glyph = contextOnly && !noData ? '□' : comparison.glyph;

  const valueCellBase = `bg-brand-tint text-right text-[11px] leading-snug tabular-nums align-top`;

  if (isSegments) {
    const selectedRow = geoId != null ? data.find(r => r.GeoID === geoId) : null;
    const citywideRow = data.find(r => r.GeoID === 0);
    const top = pairDistributionSegments(selectedRow, citywideRow, segments ?? [])
      .filter(seg => seg.neighborhoodValue != null)
      .sort((a, b) => b.neighborhoodValue - a.neighborhoodValue)
      .slice(0, 2);

    return (
      <>
        <tr>
          <th scope="rowgroup" className="text-left font-normal leading-snug pt-1.5 pb-0.5 pr-3 align-top">
            <span className="block text-[11px] leading-snug text-gray-900">{title}</span>
            <span className="block text-[9px] leading-snug text-gray-500">
              {unit ? `${unit} · ` : ''}largest groups
            </span>
          </th>
          <td className="bg-brand-tint" />
          <td />
          <td className="text-center text-[11px] leading-snug pt-1.5 align-top text-gray-500">
            <span aria-hidden="true">□</span>
            <span className="sr-only">{comparison.srLabel}</span>
          </td>
        </tr>
        {top.length ? top.map((seg, i) => (
          <tr key={seg.key} className={i === top.length - 1 ? 'border-b border-gray-100' : ''}>
            <th scope="row" className="text-left font-normal leading-snug py-0.5 pl-3 pr-3 align-top text-[10px] text-gray-700">
              {seg.label}
            </th>
            <td className={`${valueCellBase} font-normal text-gray-900 whitespace-nowrap py-0.5 px-1.5`}>
              {seg.neighborhoodDisplayValue ?? '—'}
            </td>
            <td className="text-right whitespace-nowrap text-[11px] leading-snug text-gray-600 py-0.5 pl-1.5 pr-1 tabular-nums align-top">
              {seg.citywideDisplayValue ?? '—'}
            </td>
            <td />
          </tr>
        )) : (
          <tr className="border-b border-gray-100">
            <td />
            <td className={`${valueCellBase} py-0.5 px-1.5`}>—</td>
            <td className="text-right text-[11px] text-gray-600 py-0.5 pl-1.5 pr-1">—</td>
            <td />
          </tr>
        )}
      </>
    );
  }

  const valueCell = `bg-brand-tint text-right ${valueTone} text-[11px] leading-snug py-1.5 px-1.5 tabular-nums align-top`;

  return (
    <tr className="border-b border-gray-100 last:border-0 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      <th scope="row" className="text-left font-normal leading-snug py-1.5 pr-3 align-top">
        <span className="block text-[11px] leading-snug text-gray-900">{title}</span>
        {unit ? <span className="block text-[9px] leading-snug text-gray-500">{unit}</span> : null}
      </th>
      <td className={`${valueCell} whitespace-nowrap`}>
        {neighborhoodDisplay}
      </td>
      <td className="text-right whitespace-nowrap text-[11px] leading-snug text-gray-600 py-1.5 pl-1.5 pr-1 tabular-nums align-top">
        {citywideDisplay}
      </td>
      <td className={`text-center text-[11px] leading-snug py-1.5 align-top ${glyphTone}`}>
        <span aria-hidden="true">{glyph}</span>
        <span className="sr-only">{comparison.srLabel}</span>
      </td>
    </tr>
  );
}
