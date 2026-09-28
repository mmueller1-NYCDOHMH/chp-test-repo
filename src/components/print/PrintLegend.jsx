/**
 * FILE: PrintLegend.jsx
 *
 * PURPOSE:
 * "How to read" callout at the top of the printable Community Health
 * Profile, explaining the ▲▼●— glyphs and the □ context-only marker.
 * Matches the mockup's top box. Purely numeric — deliberately says nothing
 * about "higher is better," since the glyphs here (unlike the on-screen
 * insight badges) don't carry that judgment. See compareIndicator.js's
 * buildPrintComparison() header comment for why.
 *
 * NOTES:
 * - Server component, static content, no props.
 */

export default function PrintLegend() {
  return (
    <div className="break-inside-avoid border border-gray-300 bg-gray-50 text-[9px] text-gray-700 px-2 py-1.5 mb-3 leading-snug">
      <p>
        <strong>How to read:</strong>{' '}Neighborhood = this district&rsquo;s value ·
        Citywide = NYC average · <span aria-hidden="true">▲</span> Higher ·{' '}
        <span aria-hidden="true">▼</span> Lower ·{' '}
        <span aria-hidden="true">●</span> Similar to citywide ·{' '}
        <span aria-hidden="true">□</span> Context only, no comparison ·{' '}
        <span aria-hidden="true">—</span> No data.
      </p>
      <p className="mt-0.5 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
        <strong className="font-bold text-[#1f4e99]">Bold blue</strong> = better than citywide ·{' '}
        <span className="text-[#b3470b]">Orange</span> = worse than citywide.{' '}
        <span className="italic">Depending on the measure, better may mean higher or lower.</span>
      </p>
    </div>
  );
}
