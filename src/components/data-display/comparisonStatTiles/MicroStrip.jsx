'use client';

/**
 * FILE: MicroStrip.jsx
 *
 * Per-tile micro distribution strip showing all 59 CDs, the selected CD,
 * and the citywide marker. Part of the 2026-09-04 split of
 * ComparisonStatTilesClient.jsx (was ComparisonStatTilesClient's inline
 * MicroStrip, TO REVERT: delete this component and its usage in
 * StatTileSingle.jsx).
 *
 * MOBILE COMPACTING (2026-08-11): renders two variants of the strip — the
 * original (unchanged) below `md`, and a shorter one below it. Below `md`,
 * "Low"/"High" and the word "Citywide" are dropped from every single card
 * (they were repeated verbatim 3x on a typical page) in favor of one shared
 * legend rendered once above the whole tile row — see StatTilesLegend and
 * its `md:hidden` usage in the main export. The citywide *value* is kept
 * per card (that number differs per indicator, unlike the label). Desktop
 * markup/pixels are untouched — this is pure CSS-driven duplication (same
 * pattern as TopicNav's separate mobile/desktop nav blocks), not a
 * breakpoint-detection rewrite, so there's no hydration flash risk.
 */
import { SELECTED, CITYWIDE, BAR_DEFAULT } from '@/lib/charts/chartColors';

export default function MicroStrip({ rows = [], geoId }) {
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
      <div className="md:hidden relative mt-auto pt-1 shrink-0 w-full" style={{ height: 34 }}>
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
      <div className="hidden md:block relative mt-auto pt-3 shrink-0 w-full" style={{ height: 66 }}>
        {/* Low / High range labels */}
        <div className="absolute inset-x-0 top-0 flex justify-between">
          <span className="text-xs font-medium text-gray-600 leading-none">Low</span>
          <span className="text-xs font-medium text-gray-600 leading-none">High</span>
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
                <span className="text-xs font-semibold leading-none" style={{ color: CITYWIDE }}>Citywide</span>
                <span className="text-[10px] leading-none mt-0.5" style={{ color: CITYWIDE }}>{citywide.DisplayValue ?? citywide.Value}</span>
              </span>
            </>
          );
        })()}
      </div>
    </>
  );
}
