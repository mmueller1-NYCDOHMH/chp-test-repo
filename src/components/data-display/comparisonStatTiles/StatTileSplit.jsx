'use client';

/**
 * FILE: StatTileSplit.jsx
 *
 * Split-column stat tile (comparison neighborhood active) — primary value
 * in blue, comparison value in amber, citywide reference below. A real
 * <button> — clicking it opens StatTileDetailModal via the onOpen prop.
 * Part of the 2026-09-04 split of ComparisonStatTilesClient.jsx.
 */
import AnimatedValue from '@/components/data-display/AnimatedValue';
import { SELECTED, COMPARISON } from '@/lib/charts/chartColors';
import { DELTA_STYLES } from './insightHelpers';

export default function StatTileSplit({ label, unit, displayValue, delta, compValue, compLabel, nycValue, onOpen, neighborhoodLabel }) {
  const deltaStyle = delta ? DELTA_STYLES[delta.direction] : '';

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
      <div className="text-xs font-semibold text-gray-700 leading-snug">{label}</div>
      {unit && <div className="text-xs text-gray-600 leading-snug">{unit}</div>}

      {delta && (
        <span className="self-start text-xs font-medium px-1.5 py-0.5 rounded-full leading-snug"
          style={{ color: 'var(--color-primary, #1d4ed8)', background: '#eff6ff' }}>
          {delta.text}
        </span>
      )}

      {/* ── BEGIN: citywide reference — TO REVERT: delete this block ── */}
      {nycValue && (
        <div className="mt-auto pt-2 border-t border-gray-100 flex items-center gap-1">
          <span className="text-xs font-semibold text-gray-600 leading-none">Citywide</span>
          <span className="text-xs text-gray-600 leading-none">{nycValue}</span>
        </div>
      )}
      {/* ── END: citywide reference ── */}
      <span className="sr-only">. View details</span>

    </button>
  );
}
