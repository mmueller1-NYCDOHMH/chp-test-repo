'use client';

/**
 * FILE: ComparisonStatTilesClient.jsx
 *
 * PURPOSE:
 * Client-side stat tile row for the neighborhood "At a Glance" section.
 * Reads ComparisonContext and, when a comparison CD is active, shows its
 * value alongside the primary CD value in each tile.
 *
 * PROPS:
 *   tiles          — Array of pre-resolved tile objects from buildStatTile:
 *                    { key, label, unit, displayValue, timePeriod, delta, displaySuffix }
 *   rawDataByKey   — Map of indicatorKey → full array of data rows (all CDs + Citywide)
 *   primaryLabel   — Display name of the primary neighborhood (e.g. "Mott Haven")
 *   geoId          — Numeric GeoID of the primary neighborhood
 *
 * COMPARISON DISPLAY:
 * Without comparison: single-column card with micro distribution strip.
 * With comparison: values side-by-side (blue | amber) with citywide ref below.
 *
 * TO REVERT card additions:
 *   Single-mode strip → delete the MicroStrip component and its usage block
 *   Comparison-mode citywide ref → delete the marked block in StatTileSplit
 */

import { useComparison } from '@/lib/context/ComparisonContext';
import AnimatedValue      from '@/components/data-display/AnimatedValue';
import { SELECTED, COMPARISON, CITYWIDE, BAR_DEFAULT } from '@/lib/charts/chartColors';

// Delta badge styles use CSS custom properties defined in globals.css.
// To change health-direction colors, update --color-health-* vars there.
const DELTA_STYLES = {
  better:  { color: 'var(--color-health-better)',  background: 'var(--color-health-better-bg)' },
  worse:   { color: 'var(--color-health-worse)',   background: 'var(--color-health-worse-bg)'  },
  neutral: { color: 'var(--color-health-neutral)', background: 'var(--color-health-neutral-bg)' },
};

// ─── TO REVERT: delete this component entirely ────────────────────────────────
function MicroStrip({ rows = [], geoId }) {
  const cdRows   = rows.filter(r => r.GeoType === 'CD' && r.Value != null);
  const citywide = rows.find(r => r.GeoID === 0);
  const selected = cdRows.find(r => r.GeoID === geoId);

  if (!cdRows.length || !selected) return null;

  const values = cdRows.map(r => r.Value);
  const min    = Math.min(...values);
  const max    = Math.max(...values);
  const range  = max - min || 1;
  const pct    = v => ((v - min) / range) * 100;

  return (
    <div className="relative mt-auto pt-3" style={{ height: 66 }}>
      {/* Low / High range labels */}
      <div className="absolute inset-x-0 top-0 flex justify-between">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide leading-none">Low</span>
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide leading-none">High</span>
      </div>

      {/* Track */}
      <div className="absolute inset-x-0 h-[2px] bg-gray-200 rounded" style={{ top: 20 }} />

      {/* All CD dots */}
      {cdRows.map(row => {
        const isSelected = row.GeoID === geoId;
        return (
          <div
            key={row.GeoID}
            aria-hidden="true"
            className="absolute rounded-full pointer-events-none"
            style={{
              left:       `${pct(row.Value)}%`,
              top:        20,
              width:      isSelected ? 10 : 5,
              height:     isSelected ? 10 : 5,
              background: isSelected ? SELECTED : BAR_DEFAULT,
              boxShadow:  isSelected ? `0 0 0 2px #fff, 0 0 0 3px ${SELECTED}` : 'none',
              transform:  'translate(-50%, -50%)',
              zIndex:     isSelected ? 3 : 1,
            }}
          />
        );
      })}

      {/* Citywide dashed line + label + value */}
      {citywide && (() => {
        // pct() is relative to the CD value range. For indicators like total
        // population the citywide figure (NYC ~8.3M) vastly exceeds any single
        // CD, so the raw percentage can be several thousand percent. Clamp to
        // [0, 100] so the marker always renders inside the strip.
        const rawPct     = pct(citywide.Value);
        const clampedPct = Math.max(0, Math.min(100, rawPct));

        // When the marker lands near an edge, anchor the label to that edge
        // instead of centering it — centering near the boundary would still
        // push half the label off-screen.
        const anchorRight = clampedPct >= 80;
        const anchorLeft  = clampedPct <= 20;
        const labelPos    = anchorRight
          ? { right: 0, alignItems: 'flex-end' }
          : anchorLeft
          ? { left: 0, alignItems: 'flex-start' }
          : { left: `${clampedPct}%`, transform: 'translateX(-50%)', alignItems: 'center' };

        return (
          <>
            <div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                left:       `${clampedPct}%`,
                top:        12,
                bottom:     26,
                width:      1,
                background: `repeating-linear-gradient(to bottom, ${CITYWIDE} 0 3px, transparent 3px 6px)`,
                zIndex:     2,
                transform:  'translateX(-50%)',
              }}
            />
            <span
              aria-hidden="true"
              className="absolute flex flex-col pointer-events-none"
              style={{
                ...labelPos,
                bottom:     0,
                zIndex:     4,
                whiteSpace: 'nowrap',
              }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide leading-none" style={{ color: CITYWIDE }}>Citywide</span>
              <span className="text-[10px] leading-none mt-0.5" style={{ color: CITYWIDE }}>{citywide.DisplayValue ?? citywide.Value}</span>
            </span>
          </>
        );
      })()}
    </div>
  );
}
// ─── END MicroStrip ───────────────────────────────────────────────────────────

// ─── Single-column tile (no comparison active) ────────────────────────────────

function StatTileSingle({ label, unit, displayValue, delta, rows, geoId }) {
  const deltaStyle = delta ? DELTA_STYLES[delta.direction] : '';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1.5 min-w-0">
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
      <MicroStrip rows={rows} geoId={geoId} />
      {/* ── END: micro distribution strip ── */}
    </div>
  );
}

// ─── Split-column tile (comparison active) ────────────────────────────────────

function StatTileSplit({ label, unit, displayValue, delta, compValue, nycValue }) {
  const deltaStyle = delta ? DELTA_STYLES[delta.direction] : '';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2 min-w-0">

      {/* Values row */}
      <div className="flex items-baseline">
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
          <span className="text-xs font-semibold tracking-wider uppercase text-gray-600 leading-none">Citywide</span>
          <span className="text-xs text-gray-500 leading-none">{nycValue}</span>
        </div>
      )}
      {/* ── END: citywide reference ── */}

    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ComparisonStatTilesClient({
  tiles = [],
  rawDataByKey = {},
  primaryLabel = 'Neighborhood',
  geoId,
}) {
  const { comparisonNeighborhood } = useComparison();

  const tilesWithComparison = tiles.map(tile => {
    const rows    = rawDataByKey[tile.key] ?? [];
    const suffix  = tile.displaySuffix ?? '';

    // Citywide reference value
    const nycRow  = rows.find(r => r.GeoID === 0);
    const nycValue = nycRow ? `${nycRow.DisplayValue}${suffix}` : null;

    if (!comparisonNeighborhood) {
      return { ...tile, compValue: null, compLabel: null, nycValue, rows };
    }

    const compRow = rows.find(r => r.GeoID === comparisonNeighborhood.geoId);
    return {
      ...tile,
      compValue: compRow ? `${compRow.DisplayValue}${suffix}` : null,
      compLabel: comparisonNeighborhood.name,
      nycValue,
      rows,
    };
  });

  const isComparing = !!comparisonNeighborhood;

  // 3-column breakpoint is lg (1024px), not sm (640px): the desktop
  // Sidebar (a fixed 360px <aside>) appears at md (768px), so a tablet in
  // the 768–1023px range — iPad portrait is 744–834px depending on model —
  // only has viewport-360-64(main padding) ≈ 280–410px of content width.
  // At sm:grid-cols-3 that's ~85–125px per tile, too narrow for the number
  // + label + delta pill + MicroStrip. Staying single-column full-width
  // through that range, and only going 3-up once there's genuinely enough
  // room (lg, 1024px: ≈600px content ÷ 3 ≈ 190px/tile), fixes it.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
      {tilesWithComparison.map((tile, i) => {
        const spanClass =
          tilesWithComparison.length % 2 !== 0 && i === tilesWithComparison.length - 1
            ? 'col-span-2 sm:col-span-1'
            : '';

        const { key: tileKey, ...tileProps } = tile;
        return isComparing && tile.compValue ? (
          <StatTileSplit
            key={tileKey}
            {...tileProps}
            className={spanClass}
          />
        ) : (
          <StatTileSingle
            key={tileKey}
            {...tileProps}
            rows={tile.rows}
            geoId={geoId}
            className={spanClass}
          />
        );
      })}
    </div>
  );
}
