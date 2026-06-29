/**
 * FILE: ComparisonPyramidChart.jsx
 *
 * PURPOSE:
 * Back-to-back horizontal bar chart comparing a neighborhood distribution
 * to the NYC citywide distribution across categorical segments.
 *
 * DESCRIPTION:
 * Renders a "population pyramid" layout where:
 *   - Neighborhood bars grow LEFT from center
 *   - Citywide bars grow RIGHT from center
 *   - Category labels sit in the center column
 *
 * Both sides share the same percentage scale so bars are directly comparable.
 * Value labels are rendered outside each bar for quick reading.
 *
 * PROPS:
 *   title             — chart heading (e.g. "Age Breakdown")
 *   neighborhoodLabel — short name shown in the legend (e.g. "Mott Haven")
 *   segments          — [{ key, label, neighborhoodValue, citywideValue }]
 *                       values are percentages (numbers); null renders as "—"
 *   timePeriod        — data vintage string shown as a footnote
 *
 * NOTES:
 * - Server component — no "use client"
 * - Includes a hidden accessible table for screen readers
 * - Color tokens / final palette belong to Phase A (design layer)
 */

import AnimatedBar from './AnimatedBar';

export default function ComparisonPyramidChart({
  title,
  neighborhoodLabel = 'Neighborhood',
  segments = [],
  timePeriod,
  rightLabel = 'Citywide',
  comparisonMode = false,
}) {
  const rightBarClass    = comparisonMode ? 'bg-amber-400'  : 'bg-slate-300';
  const rightLegendClass = comparisonMode ? 'bg-amber-400'  : 'bg-slate-300';

  if (!segments.length) {
    return (
      <div className="flex flex-col gap-3 min-w-0">
        {title && <div className="text-xs font-semibold text-gray-700 leading-snug">{title}</div>}
        <div className="flex items-center justify-center h-24 rounded-lg bg-gray-50 border border-dashed border-gray-200">
          <p className="text-xs text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  // Shared scale: the widest bar on either side fills 100% of its half
  const max = Math.max(
    ...segments.map(s => Math.max(s.neighborhoodValue ?? 0, s.citywideValue ?? 0)),
    1,
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-5 flex flex-col gap-3 min-w-0">

      {/* ── Title ────────────────────────────────────────────── */}
      <div className="text-xs font-semibold text-gray-700 leading-snug">{title}</div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="flex justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase leading-tight text-blue-700">
          {neighborhoodLabel}
        </span>
        <span className={`text-xs font-semibold tracking-wider uppercase leading-tight ${comparisonMode ? 'text-amber-700' : 'text-gray-600'}`}>
          {rightLabel}
        </span>
      </div>

      {/* ── Bars ─────────────────────────────────────────────── */}
      <div
        role="img"
        aria-label={`${title}: ${neighborhoodLabel} vs ${rightLabel}`}
        className="flex flex-col gap-2"
      >
        {segments.map((s, i) => {
          const nPct = ((s.neighborhoodValue ?? 0) / max) * 100;
          const cPct = ((s.citywideValue    ?? 0) / max) * 100;

          return (
            <div key={s.key} className="flex items-center gap-0" aria-hidden="true">

              {/* Left half — neighborhood, bar grows rightward toward center */}
              <div className="flex-1 flex items-center justify-end gap-1 pr-1">
                <span className="text-xs text-gray-600 tabular-nums shrink-0 w-7 sm:w-8 text-right">
                  {s.neighborhoodValue != null ? `${s.neighborhoodValue}%` : '—'}
                </span>
                {/* Bar track — fills from right edge toward center */}
                <div className="flex-1 flex justify-end h-4 sm:h-5">
                  <AnimatedBar
                    widthPct={nPct}
                    className="bg-blue-600 h-full rounded-l-sm"
                    title={`${neighborhoodLabel}: ${s.neighborhoodValue}%`}
                    delay={0}
                    origin="right center"
                  />
                </div>
              </div>

              {/* Center label — narrower on mobile to give bars more room */}
              <div className="shrink-0 w-20 sm:w-28 px-1 text-center text-xs text-gray-600 leading-tight">
                {s.label}
              </div>

              {/* Right half — citywide, bar grows leftward from center */}
              <div className="flex-1 flex items-center gap-1 pl-1">
                <div className="flex-1 h-4 sm:h-5">
                  <AnimatedBar
                    widthPct={cPct}
                    className={`${rightBarClass} h-full rounded-r-sm`}
                    title={`${rightLabel}: ${s.citywideValue}%`}
                    delay={0}
                    origin="left center"
                  />
                </div>
                <span className="text-xs text-gray-600 tabular-nums shrink-0 w-7 sm:w-8 text-right">
                  {s.citywideValue != null ? `${s.citywideValue}%` : '—'}
                </span>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Accessible table (screen readers) ───────────────── */}
      <table className="sr-only">
        <caption>{title} — {neighborhoodLabel} vs {rightLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">{neighborhoodLabel}</th>
            <th scope="col">{rightLabel}</th>
          </tr>
        </thead>
        <tbody>
          {segments.map(s => (
            <tr key={s.key}>
              <th scope="row">{s.label}</th>
              <td>{s.neighborhoodValue != null ? `${s.neighborhoodValue}%` : '—'}</td>
              <td>{s.citywideValue != null ? `${s.citywideValue}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Time period footnote ─────────────────────────────── */}
      {timePeriod && (
        <div className="text-xs text-gray-600 border-t border-gray-100 pt-2.5">{timePeriod}</div>
      )}

    </div>
  );
}
