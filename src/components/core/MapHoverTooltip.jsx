'use client';

/**
 * FILE: MapHoverTooltip.jsx
 *
 * PURPOSE:
 * Persistent sidebar panel showing indicator data for the selected neighborhood
 * at rest, and the hovered district when mousing over the map.
 *
 * DESCRIPTION:
 * Two layers:
 * - Base layer (normal flow, drives container height): selected neighborhood's
 *   data. Always visible when a neighborhood is chosen. Falls back to a
 *   placeholder prompt if no neighborhood is selected yet.
 * - Hover layer (absolute, fades in on top): data for the map-hovered district,
 *   labelled "Map Preview" to distinguish it from the selected CD.
 *   Only shown when hovering a *different* district than the one selected.
 *
 * This makes the panel always informative and turns it into a live comparison
 * tool on hover without any layout shift.
 *
 * PROPS:
 * - indicatorSummaries:   Record<number, Array<{key, label, displayValue, timePeriod}>>
 * - selectedNeighborhood: { name: string, geoId: number } | null
 *
 * NOTES:
 * - Client component — uses useState and addEventListener
 * - Base layer is always in normal flow so the container never clips or reflows
 */
import { useState, useEffect } from 'react';

function SnapshotRows({ rows }) {
  return (
    <>
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {rows.map((item) => (
          <div key={item.key} className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-gray-500 leading-snug flex-1">
              {item.label}
            </span>
            <span className="text-xs font-semibold text-gray-900 tabular-nums shrink-0">
              {item.displayValue}
            </span>
          </div>
        ))}
      </div>
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-500">{rows[0]?.timePeriod ?? ' '}</p>
      </div>
    </>
  );
}

export default function MapHoverTooltip({ indicatorSummaries = {}, selectedNeighborhood = null }) {
  const [hovered, setHovered] = useState(null);
  // hovered = { geoId: number, name: string } | null

  useEffect(() => {
    function onMapHover(e) {
      const { geoId, name } = e.detail;
      setHovered(geoId ? { geoId, name } : null);
    }
    window.addEventListener('chp:map-hover', onMapHover);
    return () => window.removeEventListener('chp:map-hover', onMapHover);
  }, []);

  const selectedRows = selectedNeighborhood
    ? (indicatorSummaries[selectedNeighborhood.geoId] ?? [])
    : [];

  const hoveredRows = hovered
    ? (indicatorSummaries[hovered.geoId] ?? [])
    : [];

  // Only show the hover layer when mousing over a different district
  const showHoverLayer = Boolean(
    hovered && (!selectedNeighborhood || hovered.geoId !== selectedNeighborhood.geoId)
  );

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="mt-3 rounded-lg border overflow-hidden relative transition-colors duration-200"
      style={{ borderColor: showHoverLayer ? '#bfdbfe' : '#f3f4f6' }}
    >

      {/* ── Hover layer — absolute overlay, fades in when mousing a different district */}
      <div
        className="absolute inset-0 flex flex-col bg-white transition-opacity duration-200 z-10"
        style={{
          opacity:       showHoverLayer ? 1 : 0,
          pointerEvents: showHoverLayer ? 'auto' : 'none',
        }}
        aria-hidden={!showHoverLayer}
      >
        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-0.5">
            Map Preview
          </p>
          <p className="text-sm font-semibold text-gray-900 leading-snug h-5">
            {hovered?.name ?? ''}
          </p>
        </div>
        {hoveredRows.length > 0
          ? <SnapshotRows rows={hoveredRows} />
          : <p className="text-xs text-gray-500 italic px-4 py-3">No data available</p>
        }
      </div>

      {/* ── Base layer — normal flow, always drives container height */}
      <div
        className="flex flex-col bg-white transition-opacity duration-200"
        style={{ opacity: showHoverLayer ? 0 : 1 }}
      >
        {selectedNeighborhood && selectedRows.length > 0 ? (
          <>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-0.5">
                At a Glance
              </p>
              <p className="text-sm font-semibold text-gray-900 leading-snug">
                {selectedNeighborhood.name}
              </p>
              {selectedNeighborhood.borough && selectedNeighborhood.cdNumber && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedNeighborhood.borough} · CD {selectedNeighborhood.cdNumber}
                </p>
              )}
            </div>
            <SnapshotRows rows={selectedRows} />
          </>
        ) : (
          /* No neighborhood selected — placeholder keeps the panel present */
          <div className="px-4 py-5 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              At a Glance
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Select a neighborhood to see key health indicators.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
