'use client';

/**
 * FILE: DistributionStrip.jsx
 *
 * PURPOSE:
 * Compact dot-on-a-line distribution strip for the indicator flyout.
 * Shows where the selected neighborhood sits relative to all 59 CDs
 * and the citywide average, using actual values for positioning.
 * Hovering any dot shows a tooltip with that district's name and value.
 *
 * PROPS:
 *   indicatorData    — full indicator data array (CD rows + citywide row)
 *   geoId            — numeric GeoID of the selected neighborhood
 *   comparisonGeoId  — optional numeric GeoID of the comparison neighborhood;
 *                      renders an amber dot at that value's position
 *   mapHoveredGeoId  — optional GeoID currently hovered on the choropleth map;
 *                      highlights the matching dot when no dot is directly hovered
 *   onHoverGeoId     — (geoId: number|null) => void; fired on dot hover so the
 *                      choropleth map can highlight the corresponding CD
 *   referenceValue   — optional numeric value to mark with a neutral dashed
 *                      line (e.g. avertable-deaths' "0% = same as baseline
 *                      neighborhoods" — a fixed conceptual reference that
 *                      isn't the citywide row, so it needs its own marker).
 *                      Reuses this component's own min/max/pct scale, so it
 *                      always lines up with the dots — added 2026-09-16 for
 *                      AvertableDeathsChart.jsx, opt-in and additive; every
 *                      existing caller is unaffected when left unset.
 *   referenceCaption — optional caption rendered centered below the strip
 *                      when referenceValue is set (e.g. "0% = same as
 *                      baseline neighborhoods").
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SELECTED, COMPARISON, CITYWIDE, BAR_DEFAULT } from '@/lib/charts/chartColors';
import { useRovingDots } from './useRovingDots';

// How far (px) the tooltip bubble may overhang the strip's own left/right
// edge. A small bleed keeps the arrow inside the bubble's rounded corner when
// the hovered dot sits exactly at 0% / 100%; callers all pad the strip by at
// least this much, so it never reaches a clipping ancestor.
const TOOLTIP_EDGE_BLEED = 8;

const REFERENCE_LINE_COLOR = '#D1D5DB'; // gray-300 — neutral, distinct from the CITYWIDE blue tick

// Note: keyframes need a literal color (can't reference a CSS var scoped
// elsewhere reliably inside a <style> tag rendered per-instance), so SELECTED
// is interpolated directly from chartColors.js at module load.
const DOT_KEYFRAMES = `
  @keyframes chp-dot-in {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0); }
    70%  { transform: translate(-50%, -50%) scale(1.25); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes chp-dot-pulse {
    0%, 100% { box-shadow: 0 0 0 2px ${SELECTED}; }
    50%       { box-shadow: 0 0 0 6px color-mix(in srgb, ${SELECTED} 15%, transparent); }
  }
`;

export default function DistributionStrip({ indicatorData = [], geoId, comparisonGeoId = null, mapHoveredGeoId = null, onHoverGeoId, referenceValue = null, referenceCaption = null }) {
  const [hovered,  setHovered]  = useState(null);
  const [entered,  setEntered]  = useState(false);
  const hideTimer = useRef(null);
  const stripRef   = useRef(null); // positioning container for the tooltip
  const bubbleRef  = useRef(null); // tooltip bubble (measured for edge clamping)
  const [bubbleShift, setBubbleShift] = useState(0);

  // Trigger entrance on mount — rAF ensures first render has painted before transition starts
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleMouseEnter(row) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(row);
    onHoverGeoId?.(row.GeoID);
  }

  function handleMouseLeave() {
    hideTimer.current = setTimeout(() => {
      setHovered(null);
      onHoverGeoId?.(null);
    }, 120);
  }

  // Map hover takes effect only when the user isn't already hovering a dot directly
  const activeHoverId = hovered?.GeoID ?? mapHoveredGeoId;

  const { cdRows, citywide, selected, comparison, min, max, minRow, maxRow } = useMemo(() => {
    const cdRows    = indicatorData.filter(r => r.GeoType === 'CD' && r.Value != null);
    // r.Value != null guard added 2026-09-16: without it, an indicator whose
    // citywide row exists but carries Value: null (e.g. avertable-death,
    // where the metric isn't meaningful citywide) would still pass the
    // `citywide` truthiness check below, and `null` coerces to 0 in the pct()
    // arithmetic — drawing a citywide tick/label at a bogus position instead
    // of correctly omitting it, the way a missing citywide row already does.
    const citywide  = indicatorData.find(r => r.GeoID === 0 && r.Value != null);
    const selected  = cdRows.find(r => r.GeoID === geoId);
    const comparison = comparisonGeoId != null ? cdRows.find(r => r.GeoID === comparisonGeoId) ?? null : null;
    const values    = cdRows.map(r => r.Value);
    const min       = values.length ? Math.min(...values) : 0;
    const max       = values.length ? Math.max(...values) : 1;
    const minRow    = cdRows.find(r => r.Value === min);
    const maxRow    = cdRows.find(r => r.Value === max);
    return { cdRows, citywide, selected, comparison, min, max, minRow, maxRow };
  }, [indicatorData, geoId, comparisonGeoId]);

  // A11Y (2026-09-26): one Tab stop for the whole strip; arrow keys move
  // between dots in value order (see useRovingDots.js). Previously every
  // dot was tabIndex=0 — ~59 Tab stops per strip.
  const sortedRows = useMemo(() => [...cdRows].sort((a, b) => a.Value - b.Value), [cdRows]);
  const roving = useRovingDots(sortedRows, {
    initialGeoId: geoId,
    onEscape: () => { setHovered(null); onHoverGeoId?.(null); },
  });

  const range = max - min || 1;
  const pct = v => ((v - min) / range) * 100;

  // The row driving the tooltip — direct hover takes priority, then map hover
  const tooltipRow = hovered ?? (mapHoveredGeoId ? cdRows.find(r => r.GeoID === mapHoveredGeoId) ?? null : null);
  const tooltipPct = tooltipRow ? pct(tooltipRow.Value) : null;

  // Edge clamping (2026-10-05): the bubble is centered on its dot, then
  // nudged sideways by however much it would overhang the strip, so a long
  // neighborhood name on a dot near min/max is no longer cut off by the
  // modal/flyout's overflow clipping. The arrow stays on the dot. Measured
  // rather than estimated because bubble width depends on the name length
  // (the previous fixed clamp(40px, …) assumed an ~80px bubble).
  // useLayoutEffect so the shift is applied before the tooltip paints.
  useLayoutEffect(() => {
    const strip = stripRef.current, bubble = bubbleRef.current;
    if (tooltipPct == null || !strip || !bubble) return;
    const stripW = strip.offsetWidth;
    const half   = bubble.offsetWidth / 2;
    const x      = (tooltipPct / 100) * stripW;
    const lo     = half - TOOLTIP_EDGE_BLEED;
    const hi     = stripW - half + TOOLTIP_EDGE_BLEED;
    // lo > hi only if the bubble is wider than the strip — then just center it.
    const center = lo > hi ? stripW / 2 : Math.min(Math.max(x, lo), hi);
    setBubbleShift(center - x);
  }, [tooltipPct, tooltipRow?.GeoID]);

  if (!cdRows.length) return null;

  const selectedPct  = selected ? pct(selected.Value) : null;
  const citywidePct  = citywide ? pct(citywide.Value) : null;
  const referencePct = referenceValue != null ? pct(referenceValue) : null;

  // If the two static labels are within 12pp, drop the citywide one below
  const labelsClose =
    selectedPct != null &&
    citywidePct != null &&
    Math.abs(selectedPct - citywidePct) < 12;

  return (
    <div>
      <style>{DOT_KEYFRAMES}</style>
      <p className="text-xs font-semibold text-gray-700 tracking-wide mb-2">
        How this neighborhood compares
      </p>

      {/* Track + dots + tooltip — all in one relative container */}
      <div ref={stripRef} className="relative" style={{ paddingTop: 20 }}>

        {/* Hover tooltip — sits above the track, fades in */}
        <div
          id="distribution-tooltip"
          aria-hidden="true" /* dot aria-labels already carry name + value */
          role="tooltip"
          /* Zero-width anchor at the dot; children center on it (flex
             centering overflows equally both ways, unlike -translate-x-1/2
             on a shrink-to-fit box, which mis-centers near the right edge). */
          className="absolute bottom-full mb-1.5 w-0 flex flex-col items-center pointer-events-none z-20"
          style={{
            left:       tooltipPct != null ? `${tooltipPct}%` : '50%',
            opacity:    tooltipRow ? 1 : 0,
            transition: 'opacity 50ms ease-in',
          }}
        >
          {tooltipRow && (
            <>
              <div
                ref={bubbleRef}
                className="shrink-0 bg-gray-900 text-white rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg"
                style={{ transform: `translateX(${bubbleShift}px)` }}
              >
                <p className="text-xs font-semibold leading-tight">
                  {tooltipRow.Geography.replace(/\s*\(CD\d+\)/i, '').trim()}
                </p>
                {/* text-gray-300 instead of text-gray-500 — gray-500 on gray-900 fails WCAG AA (≈4:1) */}
                <p className="text-xs text-gray-300 leading-tight mt-0.5">
                  {tooltipRow.DisplayValue ?? tooltipRow.Value}
                </p>
              </div>
              {/* Arrow */}
              <div className="flex justify-center shrink-0">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
              </div>
            </>
          )}
        </div>

        {/* Strip track + dots — one keyboard group (see useRovingDots) */}
        <div className="relative h-5" {...roving.groupProps('How this neighborhood compares')}>
          {/* Track */}
          <div className="absolute inset-x-0 top-[9px] h-[2px] rounded bg-gray-100" />

          {/* All CD dots */}
          {cdRows.map((row, i) => {
            const isSelected = row.GeoID === geoId;
            const isComp     = comparison?.GeoID === row.GeoID;
            const isHovered  = activeHoverId === row.GeoID;
            const cleanName  = row.Geography.replace(/\s*\(CD\d+\)/i, '').trim();
            const displayVal = row.DisplayValue ?? row.Value;
            const tag        = isSelected ? ' (selected)' : isComp ? ' (comparison)' : '';

            // Entrance: dots animate in left-to-right with 4ms stagger.
            // Selected dot gets an additional box-shadow pulse after arriving.
            const entranceDelay  = i * 4;
            const pulseDelay     = entranceDelay + 220; // after entrance completes

            return (
              <div
                key={row.GeoID}
                role="img"
                aria-label={`${cleanName}${tag}: ${displayVal}. ${roving.rankOf(row)} of ${roving.total}`}
                {...roving.dotProps(row)}
                className="absolute top-1/2 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                /* outline, not ring: the selected dot's inline boxShadow
                   (and the pulse keyframes) would override a Tailwind ring,
                   leaving it with no visible focus indicator. */
                style={{
                  left:       `${pct(row.Value)}%`,
                  width:      isSelected || isComp ? 10 : 6,
                  height:     isSelected || isComp ? 10 : 6,
                  background: isSelected ? SELECTED : isComp ? COMPARISON : isHovered ? '#374151' : BAR_DEFAULT,
                  border:     isSelected || isComp ? '2px solid white' : 'none',
                  zIndex:     isHovered ? 5 : isSelected || isComp ? 3 : 1,
                  // Entrance animation; hover transform takes over once entered
                  ...(entered
                    ? {
                        transform:  `translate(-50%, -50%) scale(${isHovered && !isSelected ? (isComp ? 1.4 : 1.5) : 1})`,
                        transition: 'transform 120ms ease, background 120ms ease',
                        animation:  isSelected
                          ? `chp-dot-pulse 500ms ease-in-out ${pulseDelay}ms 2`
                          : 'none',
                        boxShadow:  isSelected ? `0 0 0 2px ${SELECTED}` : 'none',
                      }
                    : {
                        animation:  `chp-dot-in 200ms cubic-bezier(0.34,1.56,0.64,1) ${entranceDelay}ms both`,
                      }
                  ),
                }}
                onMouseEnter={() => handleMouseEnter(row)}
                onMouseLeave={handleMouseLeave}
                onFocus={() => { roving.setActiveId(row.GeoID); handleMouseEnter(row); }}
                onBlur={handleMouseLeave}
              />
            );
          })}

          {/* Comparison neighborhood dot — amber. (A11Y 2026-09-26: the
              separate overlay dot that used to be drawn here was folded into
              the main loop above, so the comparison CD is a single dot that is
              both keyboard-navigable and visibly focus-ringed.) */}

          {/* Neutral reference line (e.g. avertable-deaths' 0% baseline) —
              same dashed-tick treatment as the citywide tick below, but a
              neutral gray so it doesn't read as "citywide". Drawn first so
              the citywide tick (when both are present) stacks on top. */}
          {referencePct != null && (
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `${referencePct}%`,
                background: `repeating-linear-gradient(to bottom, ${REFERENCE_LINE_COLOR} 0 3px, transparent 3px 6px)`,
                zIndex: 2,
              }}
            />
          )}

          {/* Citywide dashed tick */}
          {citywidePct != null && (
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `${citywidePct}%`,
                background: `repeating-linear-gradient(to bottom, ${CITYWIDE} 0 3px, transparent 3px 6px)`,
                zIndex: 2,
              }}
            />
          )}
        </div>

        {/* Static labels below the track */}
        <div className="relative h-7 mt-0.5">
          {/* Min value — anchored at left edge */}
          {minRow && (
            <span className="absolute left-0 top-0 flex flex-col items-start leading-none">
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {minRow.DisplayValue ?? minRow.Value}
              </span>
              <span className="text-xs text-gray-600 whitespace-nowrap mt-0.5">min</span>
            </span>
          )}

          {/* Max value — anchored at right edge */}
          {maxRow && (
            <span className="absolute right-0 top-0 flex flex-col items-end leading-none">
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {maxRow.DisplayValue ?? maxRow.Value}
              </span>
              <span className="text-xs text-gray-600 whitespace-nowrap mt-0.5">max</span>
            </span>
          )}

          {/* Selected neighborhood value */}
          {selected && selectedPct != null && (
            <span
              className="absolute text-xs font-semibold whitespace-nowrap -translate-x-1/2 top-0"
              style={{ left: `${selectedPct}%`, color: SELECTED }}
            >
              {selected.DisplayValue ?? selected.Value}
            </span>
          )}

          {/* Citywide label — drops below row if too close to selected */}
          {citywide && citywidePct != null && (
            <span
              className="absolute text-xs whitespace-nowrap -translate-x-1/2"
              style={{
                left:  `${citywidePct}%`,
                top:   labelsClose ? 14 : 0,
                color: CITYWIDE,
              }}
            >
              Citywide {citywide.DisplayValue ?? citywide.Value}
            </span>
          )}
        </div>

        {referenceCaption && (
          <p className="mt-1 text-center text-[11px] text-gray-400">{referenceCaption}</p>
        )}
      </div>
    </div>
  );
}
