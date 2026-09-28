/**
 * FILE: PrintSubsectionTable.jsx
 *
 * PURPOSE:
 * One subsection's indicator table on the printable Community Health
 * Profile (e.g. "Economic" under the "Social" category) — a real <table>
 * with a visible <caption> styled as the gray subsection header bar and
 * <th scope="col"> column headers, so both the printed/PDF output and
 * screen readers get a correctly structured table, not a div-grid that
 * only looks like one.
 *
 * `break-inside: avoid` (via the `break-inside-avoid` class — see
 * src/app/print/print.css) keeps a subsection from splitting across a
 * printed page mid-table where avoidable; a very long subsection can still
 * break if it doesn't fit on one page at all.
 *
 * COLUMN ALIGNMENT (fixed 2026-09-09): each subsection is its own <table>,
 * and with the default auto layout every table sizes its own columns from
 * its own content — so the Neighborhood/Citywide/glyph columns landed at a
 * different x-position under every subsection instead of forming the
 * mockup's continuous ruled columns down the page. `table-fixed` + this
 * <colgroup> gives every subsection table the exact same four column
 * widths (as percentages, so they still adapt to the print column's actual
 * width), so the columns line up across the whole report regardless of how
 * long any one subsection's indicator labels are.
 *
 * COLUMN BANDING (added 2026-09-09): `bg-brand-tint` on the Neighborhood
 * header cell here + the matching `<td>` in PrintIndicatorRow.jsx forms one
 * continuous tinted band down the Neighborhood column, header through every
 * row — the mockup's focal-column treatment, distinct from row banding.
 *
 * HEADER OVERFLOW (fixed 2026-09-09, second pass): once table-fixed pinned
 * these columns to a fixed percentage of the print column's width (which is
 * roughly half a letter-size page, well under a full screen width),
 * "NEIGHBORHOOD" — a single 12-letter word, further widened by
 * tracking-wide letter-spacing — no longer fit the 19%-wide Neighborhood
 * column at 9px. Because it has no internal space to wrap at, the browser's
 * default `white-space: normal` couldn't help, and it rendered as one
 * unbreakable line that spilled straight into the Citywide header next to
 * it (visible in a real print/PDF as "NEIGHBORHOODCITYWIDE" glued
 * together). `break-words` (overflow-wrap: break-word) on both header
 * cells below gives the browser permission to break mid-word as a last
 * resort when a token doesn't fit — the same fix already used for
 * PrintIndicatorRow.jsx's topSegments cell — and the Neighborhood column
 * also got a couple points wider (19%→21%, taken from the indicator
 * column) since "NEIGHBORHOOD" is the longest single header word here.
 *
 * PROPS:
 *   subsection — { id, title, indicators: [...] } from loadPrintManifest()
 *   geoId      — numeric GeoID of the selected neighborhood
 *
 * NOTES:
 * - Server component, no client JS.
 */

import PrintIndicatorRow from './PrintIndicatorRow';

export default function PrintSubsectionTable({ subsection, geoId }) {
  return (
    <table className="break-inside-avoid w-full table-fixed border-collapse mb-3">
      {/* 2026-09-25 alignment pass: headers were wrapping mid-word
          ("NEIGHBORH/OOD", "CITYWID/E") because uppercase + wide tracking
          at 9px didn't fit the narrow value columns. Headers are now
          sentence case, no tracking, nowrap; value columns widened a bit
          (taken from the indicator column) so 7-digit citywide counts fit
          on one line too. */}
      <colgroup>
        <col className="w-[52%]" />
        <col className="w-[23%]" />
        <col className="w-[19%]" />
        <col className="w-[6%]" />
      </colgroup>
      <caption className="bg-gray-100 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-700 py-1 px-2 caption-top">
        {subsection.title}
      </caption>
      <thead>
        <tr className="border-b border-gray-300">
          <th scope="col" className="text-left whitespace-nowrap text-[9px] font-semibold text-gray-500 py-1 pr-3">
            Indicator
          </th>
          <th scope="col" className="bg-brand-tint text-right whitespace-nowrap text-[9px] font-semibold text-brand py-1 px-1.5">
            Neighborhood
          </th>
          <th scope="col" className="text-right whitespace-nowrap text-[9px] font-semibold text-gray-500 py-1 pl-1.5 pr-1">
            Citywide
          </th>
          <th scope="col" className="w-6"><span className="sr-only">Comparison to citywide</span></th>
        </tr>
      </thead>
      <tbody>
        {subsection.indicators.map(indicator => (
          <PrintIndicatorRow key={indicator.key ?? indicator.title} indicator={indicator} geoId={geoId} />
        ))}
      </tbody>
    </table>
  );
}
