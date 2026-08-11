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
// MOBILE COMPACTING (2026-08-11): renders two variants of the strip — the
// original (unchanged) below `md`, and a shorter one below it. Below `md`,
// "Low"/"High" and the word "Citywide" are dropped from every single card
// (they were repeated verbatim 3x on a typical page) in favor of one shared
// legend rendered once above the whole tile row — see StatTilesLegend below
// and its `md:hidden` usage in the main export. The citywide *value* is kept
// per card (that number differs per indicator, unlike the label). Desktop
// markup/pixels are untouched — this is pure CSS-driven duplication (same
// pattern as TopicNav's separate mobile/desktop nav blocks), not a
// breakpoint-detection rewrite, so there's no hydration flash risk.
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

  // Shared citywide marker math — same for both variants below.
  let clampedPct = null, anchorRight = false, anchorLeft = false;
  if (citywide) {
    // pct() is relative to the CD value range. For indicators like total
    // population the citywide figure (NYC ~8.3M) vastly exceeds any single
    // CD, so the raw percentage can be several thousand percent. Clamp to
    // [0, 100] so the marker always renders inside the strip.
    clampedPct  = Math.max(0, Math.min(100, pct(citywide.Value)));
    // When the marker lands near an edge, anchor the label to that edge
    // instead of centering it — centering near the boundary would still
    // push half the label off-screen.
    anchorRight = clampedPct >= 80;
    anchorLeft  = clampedPct <= 20;
  }

  return (
    <>
      {/* ── Compact variant — below md ──────────────────────────────────── */}
      <div className="md:hidden relative mt-auto pt-1" style={{ height: 34 }}>
        {/* Track */}
        <div className="absolute inset-x-0 h-[2px] bg-gray-200 rounded" style={{ top: 6 }} />

        {cdRows.map(row => {
          const isSelected = row.GeoID === geoId;
          return (
            <div
              key={row.GeoID}
              aria-hidden="true"
              className="absolute rounded-full pointer-events-none"
              style={{
                left:       `${pct(row.Value)}%`,
                top:        6,
                width:      isSelected ? 9 : 4,
                height:     isSelected ? 9 : 4,
                background: isSelected ? SELECTED : BAR_DEFAULT,
                boxShadow:  isSelected ? `0 0 0 2px #fff, 0 0 0 3px ${SELECTED}` : 'none',
                transform:  'translate(-50%, -50%)',
                zIndex:     isSelected ? 3 : 1,
              }}
            />
          );
        })}

        {citywide && (() => {
          const labelPos = anchorRight
            ? { right: 0 }
            : anchorLeft
            ? { left: 0 }
            : { left: `${clampedPct}%`, transform: 'translateX(-50%)' };
          return (
            <>
              <div
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  left:       `${clampedPct}%`,
                  top:        0,
                  bottom:     14,
                  width:      1,
                  background: `repeating-linear-gradient(to bottom, ${CITYWIDE} 0 3px, transparent 3px 6px)`,
                  zIndex:     2,
                  transform:  'translateX(-50%)',
                }}
              />
              {/* Value only — no "Citywide" word, that's covered once by
                  StatTilesLegend above the whole row now. */}
              <span
                aria-hidden="true"
                className="absolute text-[10px] leading-none pointer-events-none whitespace-nowrap"
                style={{ ...labelPos, bottom: 0, zIndex: 4, color: CITYWIDE }}
              >
                {citywide.DisplayValue ?? citywide.Value}
              </span>
            </>
          );
        })()}
      </div>

      {/* ── Original variant — md and up, pixel-identical to before ────── */}
      <div className="hidden md:block relative mt-auto pt-3" style={{ height: 66 }}>
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
          const labelPos = anchorRight
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
    </>
  );
}
// ─── END MicroStrip ───────────────────────────────────────────────────────────

// ─── Shared legend — replaces the per-card "Low/High"/"Citywide" labels ──────
// below md. Rendered once above the whole tile row instead of 3x inside each
// card. TO REVERT: delete this component and its usage in the main export.
function StatTilesLegend() {
  return (
    <div className="md:hidden flex items-center gap-3 text-[11px] text-gray-500 mb-1 flex-wrap" aria-hidden="true">
      <span className="inline-flex items-center gap-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SELECTED }} />
        This area
      </span>
      <span className="inline-flex items-center gap-1">
        {/* border-top:dashed doesn't have room to show more than one dash at
            this width — same repeating-linear-gradient technique as the
            actual citywide marker lines in MicroStrip (just horizontal here)
            gives a crisp, clearly-dashed swatch instead. */}
        <span
          className="inline-block w-3.5 h-[2px] shrink-0"
          style={{ background: `repeating-linear-gradient(to right, ${CITYWIDE} 0 3px, transparent 3px 6px)` }}
        />
        Citywide
      </span>
      <span className="text-gray-400">Low → high across all 59 districts</span>
    </div>
  );
}
// ─── END StatTilesLegend ──────────────────────────────────────────────────────

// ─── Single-column tile (no comparison active) ────────────────────────────────

function StatTileSingle({ label, unit, displayValue, delta, rows, geoId }) {
  const deltaStyle = delta ? DELTA_STYLES[delta.direction] : '';

  return (
    <div className="h-full md:h-auto bg-white border border-gray-200 rounded-xl p-3 md:p-4 flex flex-col gap-1.5 min-w-0">
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
          whatever height this card ends up at. h-full is mobile-only
          (md:h-auto reverts to natural/unchanged height at md+) — see the
          wrapper div note below for why a height is needed here at all. */}
      <MicroStrip rows={rows} geoId={geoId} />
      {/* ── END: micro distribution strip ── */}
    </div>
  );
}

// ─── Split-column tile (comparison active) ────────────────────────────────────

function StatTileSplit({ label, unit, displayValue, delta, compValue, nycValue }) {
  const deltaStyle = delta ? DELTA_STYLES[delta.direction] : '';

  return (
    <div className="h-full md:h-auto bg-white border border-gray-200 rounded-xl p-3 md:p-4 flex flex-col gap-2 min-w-0">

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
  //
  // MOBILE COMPACTING (2026-08-11): below md, this is a horizontally
  // scrollable, scroll-snapped row instead of 3 stacked full-width cards —
  // one card's height instead of three. Each tile is ~85% of the row width
  // so the next card peeks at the edge as a "there's more" affordance, same
  // idea as TopicNav's mobile tab row. At md and up this reverts to the
  // exact original grid (md:grid overrides the flex display, md:grid-cols-1
  // lg:grid-cols-3 restore the original column behavior) — nothing about
  // the md+ layout changed. TO REVERT: drop the flex/overflow/snap classes
  // and the wrapper div's shrink/width classes below, keeping only
  // "grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch".
  return (
    <div className="flex flex-col">
      <StatTilesLegend />
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1
                   md:grid md:grid-cols-1 lg:grid-cols-3 md:gap-4 md:overflow-visible md:snap-none md:pb-0
                   items-stretch"
      >
        {tilesWithComparison.map((tile, i) => {
          const spanClass =
            tilesWithComparison.length % 2 !== 0 && i === tilesWithComparison.length - 1
              ? 'col-span-2 sm:col-span-1'
              : '';

          const { key: tileKey, ...tileProps } = tile;
          return (
            <div key={tileKey} className="shrink-0 w-[85%] snap-start md:w-auto md:shrink">
              {isComparing && tile.compValue ? (
                <StatTileSplit
                  {...tileProps}
                  className={spanClass}
                />
              ) : (
                <StatTileSingle
                  {...tileProps}
                  rows={tile.rows}
                  geoId={geoId}
                  className={spanClass}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
