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
import { DELTA_STYLES } from './insightHelpers';

export default function StatTileSingle({ label, unit, displayValue, delta, rows, geoId, onOpen, neighborhoodLabel }) {
  // Always neutral gray — matches every other tile in this row (StatTileSplit,
  // the comparison-mode variant below, already ignores direction and always
  // renders a fixed color too). Was DELTA_STYLES[delta.direction] briefly
  // when self-rep-health (higherIsBetter: true) was added, which made its
  // pill the only colored one in the row — reverted per Morgan: don't
  // color-code delta pills green/red here, follow the other tiles' neutral
  // style. computeDelta() still computes a real direction under the hood
  // (used elsewhere — e.g. the AGG(NYC comparison)
  // narrative token) — this is a display-only choice for this component.
  const deltaStyle = delta ? DELTA_STYLES.neutral : '';

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
      <div className="text-2xl font-semibold text-gray-900 leading-none">
        <AnimatedValue key={displayValue} value={displayValue ?? '—'} delay={0} />
      </div>
      <div className="text-xs font-semibold text-gray-700 leading-snug">{label}</div>
      {unit && <div className="text-xs text-gray-600 leading-snug">{unit}</div>}
      {delta && (
        <span className="mt-1 self-start text-xs font-medium px-1.5 py-0.5 rounded-full leading-snug" style={deltaStyle ?? {}}>
          {delta.text}
        </span>
      )}

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
