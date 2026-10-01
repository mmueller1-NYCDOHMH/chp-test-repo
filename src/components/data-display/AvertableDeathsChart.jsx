'use client';

/**
 * FILE: AvertableDeathsChart.jsx
 *
 * PURPOSE:
 * Card for the Avertable Deaths indicator — a dot distribution chart instead
 * of the standard ranked bar chart every other indicator gets from
 * IndicatorChartGrid/buildBarChartSpec.
 *
 * 2026-09-25 restyle to Morgan's mockup:
 *   - Header: standard indicator-card title/subtitle (text-sm semibold, per Morgan 9/25), then a narrative paragraph clamped
 *     with an inline "read more" (paragraph built server-side in
 *     AvertableDeathsSection.jsx).
 *   - Legend: selected + comparison only (no "Other CDs" swatch). A
 *     comparison CD with no score shows "(Not calculated)" plus a short
 *     reason on the line beneath (getAvertableDeathsFallback shortMessage).
 *   - Chart: own dot strip (no longer DistributionStrip, which stays as-is
 *     for the flyout) — shaded plot area, all CDs on one row, full-height
 *     dashed line at 0% captioned "Compared to the 5 wealthiest
 *     neighborhoods", the selected CD as a larger purple dot with its value
 *     labeled above, and a 0/20/40/60% x-axis underneath.
 *   - Footer: source + "?" (shared NotesModal) + expand. Expanded view is
 *     CustomExpandedChartModal (2026-09-27) — same Copy/Download/Embed/Close
 *     header and sizing as the standard cards' ExpandedChartModal.
 *
 * 2026-09-27: header + narrative now use the standard card pieces
 * (DetailsButton, CardReadMore) and the card opens the standard indicator
 * Details flyout, with this card's legend + dot strip as the flyout chart.
 *
 * Suppression: a selected CD with no score (baseline / <0% / no value) gets
 * the legend "(Not calculated)" treatment + the fallback message in the
 * narrative. The white overlay over the chart was removed 2026-09-30 per
 * Morgan; the reference-line caption above the axis stays.
 *
 * PROPS:
 *   title, subtitle, source, sourceUrl, description — from getIndicatorMeta()
 *   narrative         — on-card paragraph (standard 2-line clamp + "See more" → flyout)
 *   rows              — full avertable-death.json Data array
 *   geoId             — selected neighborhood's numeric GeoID
 *   neighborhoodName  — selected neighborhood's display name
 *   selectedFallback  — getAvertableDeathsFallback() result for the selected row
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useComparison } from '@/lib/context/ComparisonContext';
import { getAvertableDeathsFallback } from '@/lib/data/getAvertableDeathsFallback';
import { SELECTED, COMPARISON } from '@/lib/charts/chartColors';
import { useRovingDots } from './useRovingDots';
import NotesModal from '@/components/charts/expandableChartCard/NotesModal';
import CustomExpandedChartModal from '@/components/charts/expandableChartCard/CustomExpandedChartModal';
import EmbedModal from '@/components/charts/expandableChartCard/EmbedModal';
import CardReadMore from '@/components/charts/expandableChartCard/CardReadMore';
import DetailsButton from '@/components/charts/expandableChartCard/DetailsButton';
import { useCardDetailsShortcut } from '@/components/charts/expandableChartCard/useCardDetailsShortcut';
import { useFlyout } from '@/components/core/FlyoutShell';

const DOT_OTHER = '#9CA3AF'; // gray-400 — mockup's mid-gray; BAR_DEFAULT is too faint on the shaded plot
const REFERENCE_LINE = '#9CA3AF';
const TICK_STEP = 0.2;
const REFERENCE_CAPTION = 'Compared to the 5 wealthiest neighborhoods';

const cleanName = (g = '') => g.replace(/\s*\(CD\d+\)/i, '').trim();
const fmtPct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;

export default function AvertableDeathsChart({
  title,
  subtitle,
  narrative,
  flyoutContext = null,    // Details flyout: context sentence (above the map)
  flyoutComparison = null, // Details flyout: comparison sentence as parts (below the map, badge-styled)
  source,
  sourceUrl,
  description,
  rows = [],
  geoId,
  neighborhoodName,
  selectedFallback,
  anchorId,   // card id, so indicator search can scroll to this chart
  indicatorKey = 'avertable-death',
}) {
  const { comparisonNeighborhood } = useComparison();
  const { open: openFlyout } = useFlyout();
  const [notesOpen, setNotesOpen] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const expandBtnRef = useRef(null);
  const embedBtnRef = useRef(null);

  const comparisonGeoId = comparisonNeighborhood?.geoId ?? null;
  const comparisonRow = comparisonGeoId != null ? rows.find((r) => r.GeoID === comparisonGeoId) : null;
  const comparisonFallback = comparisonRow
    ? getAvertableDeathsFallback(comparisonRow, comparisonNeighborhood.name)
    : null;

  const sourceClean = source ? source.replace(/^source:\s*/i, '') : '';
  // No privacy-suppression notes here (2026-09-30, per Morgan): this file's
  // "suppressed" rows are baseline / negative / not-calculated CDs, not
  // privacy suppression — the legend's "(Not calculated)" treatment
  // (getAvertableDeathsFallback) covers them. See lib/utils/suppression.js.
  const hasNotes = !!(description || sourceUrl);
  const legend = (
    <Legend
      neighborhoodName={neighborhoodName}
      selectedFallback={selectedFallback}
      comparisonName={comparisonRow ? comparisonNeighborhood.name : null}
      comparisonFallback={comparisonFallback}
    />
  );

  const chartProps = {
    rows,
    geoId: selectedFallback?.suppressed ? null : geoId,
    comparisonGeoId: comparisonFallback?.suppressed ? null : comparisonGeoId,
    groupLabel: title, // A11Y: names the dot strip's keyboard group
  };

  // Details flyout (2026-09-27) — the standard indicator flyout (map,
  // insight, source), with this card's own legend + dot strip in the slot
  // where standard cards show their mini bar. `subtitle` is the full
  // narrative so the text clamped on the card is readable in full there.
  function handleDetails() {
    openFlyout({
      kind: 'indicator',
      indicatorKey,
      title,
      subtitle: narrative || subtitle,
      // 2026-09-30: flyout header shows both — subtitle line under the
      // title (metadataLine) and the narrative context sentence below it.
      metadataLine: subtitle,
      flyoutContext: flyoutContext ?? narrative ?? null,
      flyoutComparison,
      source,
      sourceUrl,
      description,
      indicatorData: rows,
      hideSuppressionNote: true, // "suppressed" here ≠ privacy — see hasNotes note
      geoId,
      isPercent: true,
      higherIsBetter: false,
      chart: (
        <div className="flex flex-col gap-3">
          {legend}
          <div className="relative">
            <AvertableDotStrip {...chartProps} plotHeight={120} idSuffix="flyout" />
          </div>
        </div>
      ),
    });
  }
  const shortcutProps = useCardDetailsShortcut(handleDetails);

  return (
    <>
      <div
        id={anchorId}
        className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col min-w-0"
        {...shortcutProps}
      >
        {/* ── Header — same as the standard card: title + small descriptor
            line left, "Details →" right (2026-09-27). ──────────────────── */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">{title}</h4>
            {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
          </div>
          <DetailsButton title={title} onClick={handleDetails} />
        </div>

        {/* ── Narrative — standard card read-more design (2-line clamp,
            fade, "See more" → Details flyout). Replaces the inline
            "read more / show less" toggle (2026-09-27). ─────────────────── */}
        <CardReadMore text={narrative} onMore={handleDetails} />

        {/* ── Legend ─────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-5">{legend}</div>

        {/* ── Chart ──────────────────────────────────────────────────── */}
        <div className="relative px-4 sm:px-5 pt-4 pb-5 min-w-0">
          {rows.length === 0 ? (
            <div
              className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
              style={{ minHeight: '96px' }}
            >
              <p className="text-sm text-gray-600">No data available.</p>
            </div>
          ) : (
            <>
              <AvertableDotStrip {...chartProps} plotHeight={120} />
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 mx-4 sm:mx-5 py-4 flex items-start justify-between gap-3 mt-auto">
          {sourceClean ? (
            <p className="text-xs text-gray-600 leading-snug min-w-0">
              <span className="font-semibold text-gray-800">Source:</span> {sourceClean}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {hasNotes && (
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                aria-label={`Source notes for ${title}`} /* A11Y: names the indicator (was identical on every card) */
                className="flex w-9 h-9 items-center justify-center rounded-md border border-brand text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-xs font-semibold"
              >
                ?
              </button>
            )}
            {rows.length > 0 && (
              <button
                ref={expandBtnRef}
                type="button"
                onClick={() => setExpandedOpen(true)}
                aria-label={`Expand chart: ${title}`}
                aria-haspopup="dialog"
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-md border border-brand text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <NotesModal
        open={notesOpen}
        title={title}
        sourceClean={sourceClean}
        sourceUrl={sourceUrl}
        description={description}
        onClose={() => setNotesOpen(false)}
      />

      {/* Expanded view — same header buttons + sizing as the standard
          ExpandedChartModal (2026-09-27). */}
      <CustomExpandedChartModal
        open={expandedOpen}
        indicatorKey={indicatorKey}
        title={title}
        subtitle={subtitle}
        sourceClean={sourceClean}
        onClose={() => setExpandedOpen(false)}
        restoreFocusRef={expandBtnRef}
        embedBtnRef={embedBtnRef}
        onOpenEmbed={() => setEmbedOpen(true)}
        csvRows={rows}
      >
        <div className="mb-5">{legend}</div>
        <div className="relative">
          <AvertableDotStrip {...chartProps} plotHeight={280} idSuffix="expanded" />
        </div>
      </CustomExpandedChartModal>

      <EmbedModal
        open={embedOpen}
        indicatorKey={indicatorKey}
        title={title}
        onClose={() => setEmbedOpen(false)}
        restoreFocusRef={embedBtnRef}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Legend({ neighborhoodName, selectedFallback, comparisonName, comparisonFallback }) {
  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-2 text-xs">
      <LegendItem
        color={SELECTED}
        label={neighborhoodName}
        notCalculated={selectedFallback?.suppressed}
      />
      {comparisonName && (
        <LegendItem
          color={COMPARISON}
          label={comparisonName}
          notCalculated={comparisonFallback?.suppressed}
          note={comparisonFallback?.shortMessage}
        />
      )}
    </div>
  );
}

function LegendItem({ color, label, notCalculated = false, note }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="mt-[3px] h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
      <div className="min-w-0">
        <p className="leading-snug">
          <span className="font-semibold" style={{ color }}>{label}</span>
          {notCalculated && <span className="ml-1.5 font-semibold text-gray-900">(Not calculated)</span>}
        </p>
        {notCalculated && note && <p className="mt-0.5 text-[11px] text-gray-600 leading-snug">{note}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dot strip: shaded plot, one row of CD dots, dashed 0% reference line with
 * caption, x-axis below. Domain is [0, max CD value]; the axis ticks every
 * 20% up to the last whole step (0/20/40/60 with today's data). A small
 * horizontal inset keeps edge dots from being clipped by the plot border.
 */
function AvertableDotStrip({ rows, geoId, comparisonGeoId, plotHeight = 120, idSuffix = 'card', groupLabel = 'Community district values' }) {
  const [hovered, setHovered] = useState(null);
  const [entered, setEntered] = useState(false);
  const hideTimer = useRef(null);
  const tooltipId = `avertable-tooltip-${idSuffix}`;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const { cdRows, selected, comparison, domainMax, ticks } = useMemo(() => {
    const cdRows = rows.filter((r) => r.GeoType === 'CD' && typeof r.Value === 'number');
    const values = cdRows.map((r) => r.Value);
    const maxV = values.length ? Math.max(...values) : 0.6;
    const lastTick = Math.max(TICK_STEP, Math.floor(maxV / TICK_STEP + 1e-9) * TICK_STEP);
    const domainMax = Math.max(maxV, lastTick);
    const ticks = [];
    for (let t = 0; t <= lastTick + 1e-9; t += TICK_STEP) ticks.push(Math.round(t * 100) / 100);
    return {
      cdRows,
      selected: geoId != null ? cdRows.find((r) => r.GeoID === geoId) ?? null : null,
      comparison: comparisonGeoId != null ? cdRows.find((r) => r.GeoID === comparisonGeoId) ?? null : null,
      domainMax,
      ticks,
    };
  }, [rows, geoId, comparisonGeoId]);

  // A11Y (2026-09-26): one Tab stop for the whole strip, arrow keys move
  // between dots in value order (see useRovingDots.js). Previously every
  // dot was tabIndex=0 — ~59 Tab stops per strip, twice with the expanded view.
  const sortedRows = useMemo(() => [...cdRows].sort((a, b) => a.Value - b.Value), [cdRows]);
  const roving = useRovingDots(sortedRows, {
    initialGeoId: geoId,
    onEscape: () => setHovered(null),
  });

  if (!cdRows.length) return null;

  const x = (v) => `${(Math.max(0, v) / domainMax) * 100}%`;

  // Label collision handling for the selected + comparison value labels.
  const pctOf = (v) => (Math.max(0, v) / domainMax) * 100;
  const labelsClose =
    selected && comparison && Math.abs(pctOf(selected.Value) - pctOf(comparison.Value)) < 10;
  const labelShift = (row) => {
    if (!labelsClose) return 'translateX(-50%)';
    const other = row === selected ? comparison : selected;
    const isLower = row.Value < other.Value || (row.Value === other.Value && row === comparison);
    return isLower ? 'translateX(calc(-100% + 4px))' : 'translateX(-4px)';
  };

  const show = (row) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(row);
  };
  const hide = () => {
    hideTimer.current = setTimeout(() => setHovered(null), 120);
  };

  // Others first, then comparison, then selected — so highlighted dots sit on top.
  const others = cdRows.filter((r) => r !== selected && r !== comparison);

  const dot = (row, kind) => {
    const isHovered = hovered?.GeoID === row.GeoID;
    const size = kind === 'selected' ? 14 : kind === 'comparison' ? 12 : 7;
    const color = kind === 'selected' ? SELECTED : kind === 'comparison' ? COMPARISON : isHovered ? '#374151' : DOT_OTHER;
    const name = cleanName(row.Geography);
    return (
      <div
        key={`${kind}-${row.GeoID}`}
        role="img"
        aria-label={`${name}${kind === 'selected' ? ' (selected)' : kind === 'comparison' ? ' (comparison)' : ''}: ${row.DisplayValue ?? fmtPct(row.Value)}. ${roving.rankOf(row)} of ${roving.total}`}
        {...roving.dotProps(row)}
        /* outline, not ring: the inline boxShadow on selected/comparison
           dots would override a Tailwind ring (no visible focus). */
        className="absolute top-1/2 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        style={{
          left: x(row.Value),
          width: size,
          height: size,
          background: color,
          border: kind === 'other' ? 'none' : '2px solid white',
          boxShadow: kind === 'other' ? 'none' : `0 0 0 1px ${color}`,
          zIndex: kind === 'selected' ? 4 : kind === 'comparison' ? 3 : isHovered ? 5 : 1,
          opacity: entered ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${entered ? (isHovered && kind === 'other' ? 1.4 : 1) : 0.4})`,
          transition: 'opacity 250ms ease, transform 200ms ease, background 120ms ease',
        }}
        onMouseEnter={() => show(row)}
        onMouseLeave={hide}
        onFocus={() => { roving.setActiveId(row.GeoID); show(row); }}
        onBlur={hide}
      />
    );
  };

  return (
    <div>
      {/* Plot */}
      <div className="relative bg-gray-50 rounded-sm" style={{ height: plotHeight }}>
        {/* Inner inset so edge dots aren't clipped. Also the keyboard group
            for the dots (one Tab stop — see useRovingDots). */}
        <div className="absolute inset-y-0 left-2 right-3" {...roving.groupProps(groupLabel)}>
          {/* 0% reference line — full plot height */}
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: x(0),
              background: `repeating-linear-gradient(to bottom, ${REFERENCE_LINE} 0 4px, transparent 4px 8px)`,
            }}
          />
          <p
            className="absolute bottom-2 text-[11px] leading-tight text-gray-700 max-w-[150px] pointer-events-none"
            style={{ left: 'calc(0% + 6px)' }}
          >
            {REFERENCE_CAPTION}
          </p>

          {/* Dots */}
          {others.map((r) => dot(r, 'other'))}
          {comparison && dot(comparison, 'comparison')}
          {selected && dot(selected, 'selected')}

          {/* Value labels — selected (purple) and comparison (rust), both
              above their dots. When the two sit within ~10% of the axis,
              they split apart sideways (lower value's label to the left of
              its dot, higher value's to the right) instead of overlapping. */}
          {selected && (
            <span
              className="absolute text-sm font-bold whitespace-nowrap pointer-events-none"
              style={{ left: x(selected.Value), top: 'calc(50% - 32px)', color: SELECTED, transform: labelShift(selected) }}
            >
              {fmtPct(selected.Value, 1)}
            </span>
          )}
          {comparison && (
            <span
              className="absolute text-sm font-bold whitespace-nowrap pointer-events-none"
              style={{ left: x(comparison.Value), top: 'calc(50% - 32px)', color: COMPARISON, transform: labelShift(comparison) }}
            >
              {fmtPct(comparison.Value, 1)}
            </span>
          )}

          {/* Hover tooltip */}
          {hovered && (
            <div
              id={tooltipId}
              aria-hidden="true" /* dot aria-labels already carry name + value */
              role="tooltip"
              className="absolute -translate-x-1/2 pointer-events-none z-20"
              style={{
                left: `clamp(48px, ${x(hovered.Value)}, calc(100% - 48px))`,
                bottom: `calc(50% + 14px)`,
              }}
            >
              <div className="bg-gray-900 text-white rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                <p className="text-xs font-semibold leading-tight">{cleanName(hovered.Geography)}</p>
                <p className="text-xs text-gray-300 leading-tight mt-0.5">{hovered.DisplayValue ?? fmtPct(hovered.Value)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* X-axis */}
      <div className="relative border-t border-gray-300 h-6">
        <div className="absolute inset-y-0 left-2 right-3">
          {ticks.map((t) => (
            <div key={t} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: x(t) }}>
              <span className="block w-px h-1.5 bg-gray-300" aria-hidden="true" />
              <span className="text-xs text-gray-600 leading-none mt-1">{fmtPct(t)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
