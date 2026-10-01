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
 * Both sides share the same scale so bars are directly comparable.
 * Value labels are rendered outside each bar for quick reading.
 *
 * PROPS:
 *   title             — chart heading (e.g. "Age Breakdown")
 *   neighborhoodLabel — short name shown in the legend (e.g. "Mott Haven")
 *   segments          — [{ key, label, neighborhoodValue, citywideValue,
 *                          neighborhoodDisplayValue, citywideDisplayValue }]
 *                       *Value fields are raw numbers, used only for bar-width
 *                       scaling (max/percent math below); null renders as "—".
 *                       *DisplayValue fields are the pre-formatted strings
 *                       shown as on-chart text, and take priority over
 *                       `${value}${valueSuffix}` when present — see NOTES.
 *   timePeriod        — data vintage string shown as a footnote
 *   valueSuffix       — appended to each value label (default '%' — age
 *                       and race/ethnicity distributions are percentages).
 *                       Pass '' or a different unit (e.g. ' per 100k') for
 *                       non-percentage distributions such as the cancer
 *                       ranking chart, which uses rate-per-100,000 values.
 *
 * NOTES:
 * - Server component — no "use client"
 * - Includes a hidden accessible table for screen readers
 * - Colors come from chartColors.js (SELECTED / COMPARISON / CITYWIDE) so
 *   this chart stays in sync with the ranked bar chart's palette.
 * - Text labels prefer *DisplayValue over `${*Value}${valueSuffix}`. Root
 *   cause this guards against: age-distribution/race-ethnicity segments
 *   carry Value as a 0-1 fraction (0.19), formatted upstream into
 *   DisplayValue ("19%") — segments here used to only carry the raw
 *   fraction, so with the default valueSuffix="%" the chart rendered
 *   "0.19%" instead of "19%". Other distributions (cancer/premature-mort
 *   rates) pass Value as the already-correct display number with
 *   valueSuffix="", so *DisplayValue and `${value}${suffix}` agree there —
 *   this fallback only bites when *DisplayValue is missing.
 */

import AnimatedBar from './AnimatedBar';
import CardReadMore from '@/components/charts/expandableChartCard/CardReadMore';
import DetailsButton from '@/components/charts/expandableChartCard/DetailsButton';
import ChartNoteButton from '@/components/charts/expandableChartCard/ChartNoteButton';
import { SELECTED, COMPARISON, CITYWIDE } from '@/lib/charts/chartColors';
import messages from '../../../content/site/messages.json';

export default function ComparisonPyramidChart({
  title,
  neighborhoodLabel = 'Neighborhood',
  segments = [],
  timePeriod,
  rightLabel = 'Citywide',
  comparisonMode = false,
  valueSuffix = '%',
  fillHeight = false,
  anchorId,   // card id, so indicator search can scroll to this chart
  onDetails = null, // when set: standard card header (title + Details →) + read-more text
  subtitle = null,  // descriptor line under the title (standard-header mode only)
  narrative = null, // read-more text, standard clamp design (standard-header mode only)
  bare = false,     // chart only — no card chrome/title (used inside the Details flyout)
  cardProps = {},   // extra props for the card root (e.g. `i` shortcut handlers)
  source = null,    // shown in the footer beside the time period (fill mode)
  note = null,      // chart note (content/site/chartNotes.json) → "?" button in the footer (2026-09-30)
}) {
  const rightColor = comparisonMode ? COMPARISON : CITYWIDE;
  // "Fill" mode (2026-09-28): a card stretched to match a taller neighbor
  // (cancer-types card beside the top-causes card). Rows spread evenly down
  // the card and bars/labels step up a size, instead of bunching at the top
  // over empty space. At a Glance (no fillHeight) is unchanged.
  const fill = fillHeight && !bare;
  const barH      = fill ? 'h-6 sm:h-7' : 'h-4 sm:h-5';
  const valueText = fill ? 'text-sm font-medium text-gray-800' : 'text-xs text-gray-600';
  const labelText = fill ? 'text-sm text-gray-700' : 'text-xs text-gray-600';
  const sourceClean = source ? String(source).replace(/^source:\s*/i, '') : '';
  const showNote = !!note && !bare;

  if (!segments.length) {
    return (
      <div id={anchorId} className="flex flex-col gap-3 min-w-0">
        {title && <div className="text-xs font-semibold text-gray-700 leading-snug">{title}</div>}
        <div className="flex items-center justify-center h-24 rounded-lg bg-gray-50 border border-dashed border-gray-200">
          <p className="text-xs text-gray-600">{messages.chartNoData}</p>
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
    <div
      id={bare ? undefined : anchorId}
      className={bare
        ? 'flex flex-col gap-3 min-w-0'
        : `bg-white border border-gray-200 rounded-xl p-3 sm:p-5 flex flex-col gap-3 min-w-0 ${fillHeight ? 'h-full shadow-sm' : ''}`}
      {...(bare ? {} : cardProps)}
    >

      {/* ── Title ────────────────────────────────────────────── */}
      {/* With onDetails (custom indicator cards, 2026-09-27): the standard
          card header — title + descriptor left, Details → right — then the
          standard read-more block. Without it (At a Glance hero): the
          original small title, unchanged. */}
      {bare ? null : onDetails ? (
        <>
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-gray-900 leading-snug">{title}</h4>
              {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
            </div>
            <DetailsButton title={title} onClick={onDetails} />
          </div>
          <CardReadMore text={narrative} onMore={onDetails} padded={false} />
        </>
      ) : (
        <div className="text-xs font-semibold text-gray-700 leading-snug">{title}</div>
      )}

      {/* ── Legend ───────────────────────────────────────────── */}
      {/* min-w-0 + truncate on both sides: rightLabel used to only ever be
          "Citywide" or a short toggle state, but with neighborhood
          comparison now reachable on mobile, rightLabel can be any
          neighborhood name (some are long, e.g. hyphenated multi-area CD
          names) — truncate with ellipsis instead of wrapping/colliding with
          the other side at narrow widths. */}
      <div className="flex justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold leading-tight" style={{ color: SELECTED }}>
          {neighborhoodLabel}
        </span>
        <span className="min-w-0 truncate text-right text-xs font-semibold leading-tight" style={{ color: rightColor }}>
          {rightLabel}
        </span>
      </div>

      {/* ── Bars ─────────────────────────────────────────────── */}
      <div
        role="img"
        aria-label={`${title}: ${neighborhoodLabel} vs ${rightLabel}`}
        className={fill ? 'flex flex-col flex-1 justify-evenly gap-3 py-2' : 'flex flex-col gap-2'}
      >
        {segments.map((s, i) => {
          const nPct = ((s.neighborhoodValue ?? 0) / max) * 100;
          const cPct = ((s.citywideValue    ?? 0) / max) * 100;

          return (
            <div key={s.key} className="flex items-center gap-0 min-w-0" aria-hidden="true">
              {/* Left half — neighborhood, bar grows rightward toward center */}
              <div className="flex-1 min-w-0 flex items-center justify-end gap-1 pr-1">
                <span className={`${valueText} tabular-nums shrink-0 w-7 sm:w-8 text-right`}>
                  {s.neighborhoodDisplayValue ?? (s.neighborhoodValue != null ? `${s.neighborhoodValue}${valueSuffix}` : '—')}
                </span>
                {/* Bar track — fills from right edge toward center */}
                <div className={`flex-1 flex justify-end ${barH}`}>
                  <AnimatedBar
                    widthPct={nPct}
                    color={SELECTED}
                    className="h-full rounded-l-sm"
                    title={`${neighborhoodLabel}: ${s.neighborhoodDisplayValue ?? `${s.neighborhoodValue}${valueSuffix}`}`}
                    delay={0}
                    origin="right center"
                  />
                </div>
              </div>

              {/* Center label — narrower on mobile to give bars more room.
                  break-words: labels with no spaces to wrap on (e.g.
                  "Hispanic/Latino", the longest in the race/ethnicity set)
                  would otherwise overflow this fixed-width box horizontally
                  and visually collide with the bar tracks on either side —
                  break-words forces a mid-word break instead, wrapping to a
                  second line within the same column rather than bleeding
                  outward. */}
              <div className={`shrink-0 w-20 sm:w-28 px-1 text-center ${labelText} leading-tight break-words`}>
                {s.label}
              </div>

              {/* Right half — citywide, bar grows leftward from center */}
              <div className="flex-1 min-w-0 flex items-center gap-1 pl-1">
                <div className={`flex-1 ${barH}`}>
                  <AnimatedBar
                    widthPct={cPct}
                    color={rightColor}
                    className="h-full rounded-r-sm"
                    title={`${rightLabel}: ${s.citywideDisplayValue ?? `${s.citywideValue}${valueSuffix}`}`}
                    delay={0}
                    origin="left center"
                  />
                </div>
                <span className={`${valueText} tabular-nums shrink-0 w-7 sm:w-8 text-right`}>
                  {s.citywideDisplayValue ?? (s.citywideValue != null ? `${s.citywideValue}${valueSuffix}` : '—')}
                </span>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Accessible table (screen readers) ───────────────── */}
      <table className="sr-only table-fixed">
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
              <td>{s.neighborhoodDisplayValue ?? (s.neighborhoodValue != null ? `${s.neighborhoodValue}${valueSuffix}` : '—')}</td>
              <td>{s.citywideDisplayValue ?? (s.citywideValue != null ? `${s.citywideValue}${valueSuffix}` : '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Time period footnote ─────────────────────────────── */}
      {/* "?" chart note (2026-09-30) sits right of the footnote; not shown
          in the bare (flyout) variant. */}
      {fill && (sourceClean || timePeriod || showNote) ? (
        <div className="flex items-start justify-between gap-3 text-xs text-gray-600 leading-snug border-t border-gray-100 pt-3 mt-auto">
          <div className="min-w-0">
            {sourceClean ? (
              <><span className="font-semibold text-gray-800">Source:</span> {sourceClean}{timePeriod && !sourceClean.includes(timePeriod) ? ` (${timePeriod})` : ''}</>
            ) : timePeriod}
          </div>
          {showNote && <ChartNoteButton title={title} note={note} sourceClean={sourceClean} />}
        </div>
      ) : (timePeriod || showNote) && (
        <div className={`flex items-center justify-between gap-3 text-xs text-gray-600 border-t border-gray-100 pt-2.5 ${fillHeight && !bare ? 'mt-auto' : ''}`}>
          <span className="min-w-0">{timePeriod}</span>
          {showNote && <ChartNoteButton title={title} note={note} sourceClean={sourceClean} />}
        </div>
      )}

    </div>
  );
}
