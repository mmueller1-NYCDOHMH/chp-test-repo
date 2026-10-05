'use client';

/**
 * FILE: StatTileSplit.jsx
 *
 * Split-column stat tile (comparison neighborhood active) — primary value
 * in blue, comparison value in amber, and the dot distribution strip below
 * (both neighborhoods marked, plus the citywide marker). A real
 * <button> — clicking it opens StatTileDetailModal via the onOpen prop.
 * Part of the 2026-09-04 split of ComparisonStatTilesClient.jsx.
 */
import AnimatedValue from '@/components/data-display/AnimatedValue';
import { SELECTED, COMPARISON } from '@/lib/charts/chartColors';
import MicroStrip from './MicroStrip';

export default function StatTileSplit({ label, unit, displayValue, delta, compValue, compLabel, nycValue, rows, geoId, compGeoId, onOpen, neighborhoodLabel }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="h-full w-full text-left bg-white border border-gray-200 rounded-xl p-3 md:p-4 flex flex-col gap-2 min-w-0 transition-colors hover:border-brand hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
    >

      {/* A11Y (2026-09-26): no aria-label on this button (it used to hide
          every value from screen readers). The visual values row is
          aria-hidden and replaced by this sr-only line, which also says
          which value is which — visually that's carried by color only. */}
      <span className="sr-only">
        {`${neighborhoodLabel ?? 'Selected neighborhood'} ${displayValue ?? 'no data'}, ${compLabel ?? 'comparison'} ${compValue ?? 'no data'}. `}
      </span>

      {/* Values row */}
      <div className="flex items-baseline" aria-hidden="true">
        <div className="text-2xl font-semibold leading-none" style={{ color: SELECTED }}>
          <AnimatedValue key={displayValue} value={displayValue ?? '—'} delay={0} />
        </div>
        <div className="ml-auto text-2xl font-semibold leading-none" style={{ color: COMPARISON }}>
          <AnimatedValue key={compValue} value={compValue ?? '—'} delay={0} />
        </div>
      </div>

      {/* Shared label + unit */}
      {/* 2026-09-29: unit above label; delta pill removed (per Morgan). */}
      {unit && <div className="text-xs text-gray-600 leading-snug">{unit}</div>}
      <div className="text-xs font-semibold text-gray-700 leading-snug">{label}</div>

      {/* ── Distribution strip (2026-10-05, per Morgan) ──────────────────
          Compare mode used to drop the dot strip entirely and show only a
          "Citywide {value}" line. It now shows the same strip as the single
          tile, with the comparison neighborhood as a second (amber) dot.
          The strip carries the citywide marker + value itself, so the text
          line is only a fallback for when the strip can't render (no CD
          rows, or the selected neighborhood has no value). */}
      {(() => {
        const canStrip = (rows ?? []).some(r => r.GeoType === 'CD' && r.Value != null && r.GeoID === geoId);
        if (canStrip) return <MicroStrip rows={rows} geoId={geoId} compGeoId={compGeoId} />;
        return nycValue ? (
          <div className="mt-auto pt-2 border-t border-gray-100 flex items-center gap-1">
            <span className="text-xs font-semibold text-gray-600 leading-none">Citywide</span>
            <span className="text-xs text-gray-600 leading-none">{nycValue}</span>
          </div>
        ) : null;
      })()}
      <span className="sr-only">. View details</span>

    </button>
  );
}
