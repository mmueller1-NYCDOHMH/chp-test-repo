'use client';

/**
 * FILE: StatTileSingle.jsx
 *
 * Single-column stat tile (no comparison neighborhood active). A real
 * <button> — clicking it opens StatTileDetailModal via the onOpen prop.
 * Part of the 2026-09-04 split of ComparisonStatTilesClient.jsx.
 */
import AnimatedValue from '@/components/data-display/AnimatedValue';
import MicroStrip from './MicroStrip';

export default function StatTileSingle({ label, unit, displayValue, rows, geoId, onOpen, neighborhoodLabel }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="h-full w-full text-left bg-white border border-gray-200 rounded-xl p-3 md:p-4 flex flex-col gap-1.5 min-w-0 transition-colors hover:border-brand hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
    >
      {/* A11Y (2026-09-26): no aria-label on this button — the old one
          ("View details for {label}") replaced the whole button content, so
          screen readers never heard the value, unit or delta. The name is
          now the visible content itself (value, label, unit, delta), with
          the neighborhood name and "View details" added as sr-only text. */}
      {neighborhoodLabel && <span className="sr-only">{`${neighborhoodLabel}: `}</span>}
      {/* <span className="block"> rather than <div>: a <button> may only
          contain phrasing content, and this button's content IS its
          accessible name (see A11Y note above). */}
      <span className="block text-xs font-semibold text-gray-700 leading-snug">{label}</span>

      <span className="block text-2xl font-semibold text-gray-900 leading-none">
        <AnimatedValue key={displayValue} value={displayValue ?? '—'} delay={0} />
        {unit && <span className="block mt-1 text-xs text-gray-600 font-normal leading-snug">{unit}</span>}
      </span>

      {/* 2026-09-30 (per Morgan): "X pts compared to NYC" delta pill removed. */}

      {/* ── BEGIN: micro distribution strip — TO REVERT: delete this block ── */}
      {/* mt-auto (inside MicroStrip) pins the strip to the bottom of
          whatever height this card ends up at. h-full applies at every
          breakpoint (previously md:h-auto opted back out of it at desktop,
          which is why a tile with no delta badge — e.g. Overall Population —
          rendered shorter than its siblings even though the parent grid
          already stretches every tile in a row to match via items-stretch;
          the wrapper div below is what actually gives that row a height to
          stretch to). */}
      <MicroStrip rows={rows} geoId={geoId} />
      {/* ── END: micro distribution strip ── */}
      <span className="sr-only">. View details</span>
    </button>
  );
}
