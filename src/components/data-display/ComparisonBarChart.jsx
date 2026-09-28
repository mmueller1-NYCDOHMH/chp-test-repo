/**
 * FILE: ComparisonBarChart.jsx
 *
 * PURPOSE:
 * Ranked horizontal bar chart comparing a neighborhood distribution to a
 * reference (citywide, or a chosen comparison neighborhood) across
 * categorical segments — e.g. "Top Causes of Premature Death". Per Morgan
 * (2026-09-16, mockup supplied): this is the sibling of
 * ComparisonPyramidChart.jsx for segment data that reads better as ranked
 * bars than a mirrored butterfly — same segments contract, same colors,
 * different layout, so the two can be swapped per-chart without touching
 * the data layer (distributionSegments.js / getPrematureMortCauseData.js).
 *
 * LAYOUT (per mockup, rev. 2026-09-16 — three follow-up fixes from Morgan):
 *   Category label (left, fixed width) — one bar per row, SELECTED-colored,
 *   growing left→right on a full-width light-gray track (BAR_DEFAULT),
 *   sorted descending by neighborhoodValue — classic progress-bar pattern:
 *   a pale background pill spans the full row width, the colored value bar
 *   sits on top of it starting at x=0.
 *
 *   A thin reference tick runs the FULL height of each row (through the
 *   stacked label above the track, not just across the bar itself — "add a
 *   vertical bar over the citywide number" per Morgan's feedback), marking
 *   the reference value's position. The reference number sits stacked above
 *   the tick; the reference series NAME is shown only once, above row 1, to
 *   avoid repeating it on every row (no separate legend row anymore — the
 *   name/number stack doubles as the legend, matching the mockup's inline
 *   row-1 labels).
 *
 *   The primary neighborhood's name is pinned at the row's x=0 origin
 *   (left edge of the track), shown once above row 1 — "move neighborhood
 *   name to essentially the x=0 point so there's less potential
 *   interference with the City's tick" — rather than a top legend row,
 *   since the bars themselves always start at x=0.
 *
 *   The value label sits INSIDE the bar (white) when the bar is wide enough
 *   to hold it legibly, otherwise just outside it (dark gray) — standard
 *   ranked-bar-chart convention, same idea buildBarChartSpec.js's CD bars
 *   use. Bar tips are fully rounded (pill-shaped, both ends) to match the
 *   pill-shaped background track — "round the tip of the bar more".
 *
 *   The reference tick renders AFTER the track/bar (with a higher z-index)
 *   so it stays visible in front of them along its whole length, including
 *   wherever a bar is wide enough to cross it. Each row's sibling elements
 *   (track/bar/tick/labels) carry explicit `key`s so React's reconciler has
 *   an unambiguous identity for each one across re-renders. NOTE: if you see
 *   a hydration-mismatch console warning here right after editing this file
 *   and reloading, it's very likely the Next.js/Turbopack dev server's SSR
 *   output catching up to a just-recompiled client bundle (a transient
 *   server/client version skew, not app state) — React recovers by using
 *   the client render, and a clean reload a moment later should be silent.
 *
 * REV. 2026-09-25 (Morgan's updated mockup): dot legend row above the
 *   chart replaces the inline row-1 name labels; category labels are
 *   right-aligned + bold and vertically centered on a thinner track; the
 *   reference number sits above its tick on EVERY row, with the tick
 *   running from just under the number to just past the bar; lighter
 *   track color so the purple bar reads as the figure.
 *
 * PROPS:
 *   segments     — [{ key, label, neighborhoodValue, citywideValue,
 *                    neighborhoodDisplayValue, citywideDisplayValue }]
 *                  same shape pairDistributionSegments() already produces;
 *                  "citywide*" fields hold the REFERENCE side's values
 *                  (citywide or a comparison CD — see rightLabel/comparisonMode)
 *   primaryLabel — selected neighborhood's display name
 *   rightLabel   — reference series label ('Citywide' or a comparison CD name)
 *   comparisonMode — true when the reference side is a comparison CD, not
 *                  citywide (swaps the tick/legend color to COMPARISON)
 *   showLegend   — render the dot legend row (default true)
 *   valueSuffix  — appended to value labels when no *DisplayValue is present
 *                  (default '' — premature-mortality rates aren't percentages)
 */

import AnimatedBar from './AnimatedBar';
import { SELECTED, CITYWIDE, COMPARISON } from '@/lib/charts/chartColors';
import messages from '../../../content/site/messages.json';

// Below this bar-width percentage the value label doesn't fit legibly
// inside the bar (white-on-color) — render it just outside instead.
const INSIDE_LABEL_MIN_PCT = 8;

const TRACK_H = 16;          // bar + background track height (px)
const TRACK_BG = '#E6E8F0';  // pale lavender-gray track, per mockup
const TICK_ABOVE = 7;        // how far the reference tick rises above the track
const TICK_BELOW = 3;        // …and extends below it
const NUMBER_GAP = 2;        // gap between tick top and the number above it
const LINE_H = 13;           // one 11px/leading-tight text line
const ROW_H = TRACK_H + TICK_ABOVE + NUMBER_GAP + LINE_H;

// Within this many percentage points of either row edge, the reference
// number anchors to that edge instead of centering on the tick, so it
// can't run off the track.
const REF_LABEL_EDGE_PCT = 6;

export default function ComparisonBarChart({
  segments = [],
  primaryLabel = 'Neighborhood',
  rightLabel = 'Citywide',
  comparisonMode = false,
  showLegend = true,
  valueSuffix = '',
  title = null, // optional — prefixes the sr-only table caption
  compact = false, // tighter row/legend spacing for the on-page card (keeps it near standard card height)
}) {
  const referenceColor = comparisonMode ? COMPARISON : CITYWIDE;

  if (!segments.length) {
    return (
      <div className="flex items-center justify-center h-24 rounded-lg bg-gray-50 border border-dashed border-gray-200">
        <p className="text-xs text-gray-600">{messages.chartNoData}</p>
      </div>
    );
  }

  // Defensive sort — getTopCauseKeys() already ranks by the primary CD's value.
  const sorted = [...segments].sort(
    (a, b) => (b.neighborhoodValue ?? -Infinity) - (a.neighborhoodValue ?? -Infinity)
  );

  // Shared scale: the widest bar OR tick fills ~94% of the track, leaving
  // room at the right end so the track reads as a track.
  const max = Math.max(
    ...sorted.map((s) => Math.max(s.neighborhoodValue ?? 0, s.citywideValue ?? 0)),
    1
  ) / 0.94;

  return (
    <div className={`flex flex-col ${compact ? 'gap-2.5' : 'gap-4'} min-w-0`}>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-medium">
          <LegendDot color={SELECTED} label={primaryLabel} />
          <LegendDot color={referenceColor} label={rightLabel} />
        </div>
      )}

      {/* Visual chart — aria-hidden; the sr-only <table> below is the
          screen-reader version (A11Y 2026-09-26). This used to be
          role="img" with only a label ("X vs Y by category"), which hid
          every category and value from assistive tech. */}
      <div aria-hidden="true" className={`flex flex-col ${compact ? 'gap-1' : 'gap-3'} min-w-0`}>
        {sorted.map((s) => {
          const nPct = ((s.neighborhoodValue ?? 0) / max) * 100;
          const refPct = ((s.citywideValue ?? 0) / max) * 100;
          const nLabel = s.neighborhoodDisplayValue ?? (s.neighborhoodValue != null ? `${s.neighborhoodValue}${valueSuffix}` : '—');
          const refLabel = s.citywideDisplayValue ?? (s.citywideValue != null ? `${s.citywideValue}${valueSuffix}` : '—');
          const labelInside = nPct >= INSIDE_LABEL_MIN_PCT;

          let refLabelStyle = { left: `${refPct}%`, transform: 'translateX(-50%)' };
          if (refPct >= 100 - REF_LABEL_EDGE_PCT) refLabelStyle = { right: `${100 - refPct}%` };
          else if (refPct <= REF_LABEL_EDGE_PCT) refLabelStyle = { left: `${refPct}%` };

          return (
            <div key={s.key} className="flex items-end gap-3 min-w-0">
              {/* Category label — right-aligned, centered on the track */}
              <div
                className="w-24 sm:w-28 shrink-0 flex items-center justify-end text-right text-xs font-semibold text-gray-900 leading-tight break-words"
                style={{ minHeight: TRACK_H }}
              >
                {s.label}
              </div>

              <div className="relative flex-1 min-w-0" style={{ height: ROW_H }}>
                <div
                  key="track"
                  className="absolute bottom-0 left-0 right-0 rounded-full"
                  style={{ height: TRACK_H, background: TRACK_BG, zIndex: 0 }}
                />

                <AnimatedBar
                  key="bar"
                  widthPct={nPct}
                  color={SELECTED}
                  className="absolute bottom-0 left-0 h-4 rounded-full"
                  title={`${primaryLabel}: ${nLabel}`}
                  delay={0}
                  origin="left center"
                />

                {/* Reference tick — in front of the bar */}
                {s.citywideValue != null && (
                  <div
                    key="tick"
                    className="absolute w-0.5 rounded-full"
                    style={{
                      left: `${refPct}%`,
                      bottom: -TICK_BELOW,
                      height: TRACK_H + TICK_ABOVE + TICK_BELOW,
                      background: referenceColor,
                      transform: 'translateX(-50%)',
                      zIndex: 2,
                    }}
                  />
                )}

                {/* Value label — inside the bar (white) or just outside (gray) */}
                <span
                  key="value-label"
                  className={`absolute bottom-0 flex items-center text-[11px] font-semibold tabular-nums whitespace-nowrap ${
                    labelInside ? 'text-white pr-2' : 'text-gray-700 pl-1.5'
                  }`}
                  style={{
                    height: TRACK_H,
                    zIndex: 3,
                    ...(labelInside ? { right: `${100 - nPct}%` } : { left: `${nPct}%` }),
                  }}
                >
                  {nLabel}
                </span>

                {/* Reference number — above its tick, every row */}
                {s.citywideValue != null && (
                  <span
                    key="ref-number"
                    className="absolute text-[11px] font-medium leading-tight tabular-nums whitespace-nowrap text-gray-700"
                    style={{ ...refLabelStyle, bottom: TRACK_H + TICK_ABOVE + NUMBER_GAP, zIndex: 3 }}
                    title={`${rightLabel}: ${refLabel}`}
                  >
                    {refLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Accessible table (screen readers) — same pattern as
          ComparisonPyramidChart.jsx. Rows in the same order as the bars. */}
      <table className="sr-only table-fixed">
        <caption>
          {title ? `${title}: ` : ''}{primaryLabel} compared with {rightLabel}, by category
        </caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">{primaryLabel}</th>
            <th scope="col">{rightLabel}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.key}>
              <th scope="row">{s.label}</th>
              <td>{s.neighborhoodDisplayValue ?? (s.neighborhoodValue != null ? `${s.neighborhoodValue}${valueSuffix}` : 'No data')}</td>
              <td>{s.citywideDisplayValue ?? (s.citywideValue != null ? `${s.citywideValue}${valueSuffix}` : 'No data')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
      <span style={{ color }}>{label}</span>
    </span>
  );
}
