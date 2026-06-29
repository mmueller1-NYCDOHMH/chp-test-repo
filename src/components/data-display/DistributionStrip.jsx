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
 */

import { useEffect, useMemo, useRef, useState } from 'react';

const DOT_KEYFRAMES = `
  @keyframes chp-dot-in {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0); }
    70%  { transform: translate(-50%, -50%) scale(1.25); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes chp-dot-pulse {
    0%, 100% { box-shadow: 0 0 0 2px var(--color-brand); }
    50%       { box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-brand) 15%, transparent); }
  }
`;

export default function DistributionStrip({ indicatorData = [], geoId, comparisonGeoId = null, mapHoveredGeoId = null, onHoverGeoId }) {
  const [hovered,  setHovered]  = useState(null);
  const [entered,  setEntered]  = useState(false);
  const hideTimer = useRef(null);

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
    const citywide  = indicatorData.find(r => r.GeoID === 0);
    const selected  = cdRows.find(r => r.GeoID === geoId);
    const comparison = comparisonGeoId != null ? cdRows.find(r => r.GeoID === comparisonGeoId) ?? null : null;
    const values    = cdRows.map(r => r.Value);
    const min       = values.length ? Math.min(...values) : 0;
    const max       = values.length ? Math.max(...values) : 1;
    const minRow    = cdRows.find(r => r.Value === min);
    const maxRow    = cdRows.find(r => r.Value === max);
    return { cdRows, citywide, selected, comparison, min, max, minRow, maxRow };
  }, [indicatorData, geoId, comparisonGeoId]);

  if (!cdRows.length) return null;

  const range = max - min || 1;
  const pct = v => ((v - min) / range) * 100;

  const selectedPct = selected  ? pct(selected.Value)  : null;
  const citywidePct = citywide  ? pct(citywide.Value)  : null;

  // If the two static labels are within 12pp, drop the citywide one below
  const labelsClose =
    selectedPct != null &&
    citywidePct != null &&
    Math.abs(selectedPct - citywidePct) < 12;

  // The row driving the tooltip — direct hover takes priority, then map hover
  const tooltipRow  = hovered ?? (mapHoveredGeoId ? cdRows.find(r => r.GeoID === mapHoveredGeoId) : null);
  const tooltipLeft = tooltipRow
    ? `clamp(40px, ${pct(tooltipRow.Value)}%, calc(100% - 40px))`
    : '50%';

  return (
    <div>
      <style>{DOT_KEYFRAMES}</style>
      <p className="text-xs font-semibold text-gray-700 tracking-wide mb-2">
        How this neighborhood compares
      </p>

      {/* Track + dots + tooltip — all in one relative container */}
      <div className="relative" style={{ paddingTop: 20 }}>

        {/* Hover tooltip — sits above the track, fades in */}
        <div
          id="distribution-tooltip"
          role="tooltip"
          className="absolute bottom-full mb-1.5 -translate-x-1/2 pointer-events-none z-20"
          style={{
            left:       tooltipRow ? tooltipLeft : '50%',
            opacity:    tooltipRow ? 1 : 0,
            transition: 'opacity 50ms ease-in',
          }}
        >
          {tooltipRow && (
            <>
              <div className="bg-gray-900 text-white rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                <p className="text-xs font-semibold leading-tight">
                  {tooltipRow.Geography.replace(/\s*\(CD\d+\)/i, '').trim()}
                </p>
                {/* text-gray-300 instead of text-gray-500 — gray-500 on gray-900 fails WCAG AA (≈4:1) */}
                <p className="text-xs text-gray-300 leading-tight mt-0.5">
                  {tooltipRow.DisplayValue ?? tooltipRow.Value}
                </p>
              </div>
              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
              </div>
            </>
          )}
        </div>

        {/* Strip track + dots */}
        <div className="relative h-5">
          {/* Track */}
          <div className="absolute inset-x-0 top-[9px] h-[2px] rounded bg-gray-100" />

          {/* All CD dots */}
          {cdRows.map((row, i) => {
            const isSelected = row.GeoID === geoId;
            const isHovered  = activeHoverId === row.GeoID;
            const cleanName  = row.Geography.replace(/\s*\(CD\d+\)/i, '').trim();
            const displayVal = row.DisplayValue ?? row.Value;

            // Entrance: dots animate in left-to-right with 4ms stagger.
            // Selected dot gets an additional box-shadow pulse after arriving.
            const entranceDelay  = i * 4;
            const pulseDelay     = entranceDelay + 220; // after entrance completes

            return (
              <div
                key={row.GeoID}
                role="img"
                aria-label={`${cleanName}: ${displayVal}`}
                aria-describedby={isHovered ? 'distribution-tooltip' : undefined}
                tabIndex={0}
                className="absolute top-1/2 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                style={{
                  left:       `${pct(row.Value)}%`,
                  width:      isSelected ? 10 : 6,
                  height:     isSelected ? 10 : 6,
                  background: isSelected ? 'var(--color-brand)' : isHovered ? '#374151' : '#d1d5db',
                  border:     isSelected ? '2px solid white' : 'none',
                  zIndex:     isSelected ? 3 : isHovered ? 4 : 1,
                  // Entrance animation; hover transform takes over once entered
                  ...(entered
                    ? {
                        transform:  `translate(-50%, -50%) scale(${isHovered && !isSelected ? 1.5 : 1})`,
                        transition: 'transform 120ms ease, background 120ms ease',
                        animation:  isSelected
                          ? `chp-dot-pulse 500ms ease-in-out ${pulseDelay}ms 2`
                          : 'none',
                        boxShadow:  isSelected ? '0 0 0 2px var(--color-brand)' : 'none',
                      }
                    : {
                        animation:  `chp-dot-in 200ms cubic-bezier(0.34,1.56,0.64,1) ${entranceDelay}ms both`,
                      }
                  ),
                }}
                onMouseEnter={() => handleMouseEnter(row)}
                onMouseLeave={handleMouseLeave}
                onFocus={() => handleMouseEnter(row)}
                onBlur={handleMouseLeave}
              />
            );
          })}

          {/* Comparison neighborhood dot — amber */}
          {comparison && (() => {
            const isHovered    = activeHoverId === comparison.GeoID;
            const compPct      = pct(comparison.Value);
            const cleanName    = comparison.Geography.replace(/\s*\(CD\d+\)/i, '').trim();
            const displayVal   = comparison.DisplayValue ?? comparison.Value;
            return (
              <div
                key={`comp-${comparison.GeoID}`}
                role="img"
                aria-label={`${cleanName} (comparison): ${displayVal}`}
                aria-describedby={isHovered ? 'distribution-tooltip' : undefined}
                tabIndex={0}
                className="absolute top-1/2 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1"
                style={{
                  left:       `${compPct}%`,
                  width:      10,
                  height:     10,
                  background: '#fbbf24',
                  border:     '2px solid white',
                  zIndex:     isHovered ? 5 : 3,
                  transform:  `translate(-50%, -50%) scale(${isHovered ? 1.4 : 1})`,
                  transition: 'transform 120ms ease, background 120ms ease',
                }}
                onMouseEnter={() => handleMouseEnter(comparison)}
                onMouseLeave={handleMouseLeave}
                onFocus={() => handleMouseEnter(comparison)}
                onBlur={handleMouseLeave}
              />
            );
          })()}

          {/* Citywide dashed tick */}
          {citywidePct != null && (
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{
                left: `${citywidePct}%`,
                background: 'repeating-linear-gradient(to bottom, #9ca3af 0 3px, transparent 3px 6px)',
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
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {minRow.DisplayValue ?? minRow.Value}
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">min</span>
            </span>
          )}

          {/* Max value — anchored at right edge */}
          {maxRow && (
            <span className="absolute right-0 top-0 flex flex-col items-end leading-none">
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {maxRow.DisplayValue ?? maxRow.Value}
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">max</span>
            </span>
          )}

          {/* Selected neighborhood value */}
          {selected && selectedPct != null && (
            <span
              className="absolute text-xs font-semibold text-blue-700 whitespace-nowrap -translate-x-1/2 top-0"
              style={{ left: `${selectedPct}%` }}
            >
              {selected.DisplayValue ?? selected.Value}
            </span>
          )}

          {/* Citywide label — drops below row if too close to selected */}
          {citywide && citywidePct != null && (
            <span
              className="absolute text-xs text-gray-500 whitespace-nowrap -translate-x-1/2"
              style={{
                left: `${citywidePct}%`,
                top:  labelsClose ? 14 : 0,
              }}
            >
              Citywide {citywide.DisplayValue ?? citywide.Value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
