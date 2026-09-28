'use client';

/**
 * FILE: RankDotStrip.jsx
 *
 * PURPOSE:
 * Compact dot-distribution rank marker — every community district plotted
 * as a small dot along the indicator's actual low-to-high value range, with
 * the selected CD's dot enlarged and colored. Sits inline next to the
 * "Ranked X of Y community districts by value" text on both the indicator
 * flyout (IndicatorFlyoutContent.jsx) and the standalone indicator page
 * (app/indicator/[key]/page.js) — shared here so the two surfaces never
 * show two different rank markers (2026-09-09).
 *
 * DESIGN HISTORY (this element, same day, per Morgan):
 *   1. a shrunk 59-bar mini chart          — rejected, read as a mini chart,
 *                                            not "a very small bar"
 *   2. a filled progress bar               — rejected, a fill implies "more
 *                                            filled = further along toward a
 *                                            goal," which isn't true of rank
 *   3. a static track + one small tick     — accepted, then later asked to
 *                                            be turned back into a dot plot
 *   4. THIS — a dot per CD, positioned by actual value (a true distribution,
 *      not just evenly-spaced rank order), matching the visual language of
 *      DistributionStrip.jsx's dots and the mini bar's per-CD marks.
 *
 * Deliberately lighter than DistributionStrip.jsx: no hover, tooltip, or
 * value labels, and no citywide tick — this is a small decorative companion
 * to text that already states the exact rank and value, not a standalone
 * chart in its own right. aria-hidden for that reason.
 *
 * PROPS:
 *   cdRows      — CD rows with a numeric Value (any sort order is fine —
 *                 position is computed from Value, not array order)
 *   selectedId  — GeoID of the community district to highlight
 */

import { SELECTED, BAR_DEFAULT } from '@/lib/charts/chartColors';

export default function RankDotStrip({ cdRows = [], selectedId }) {
  if (!cdRows.length) return null;

  const values = cdRows.map(r => Number(r.Value));
  const min    = Math.min(...values);
  const max    = Math.max(...values);
  const range  = max - min || 1;
  const pct    = v => ((Number(v) - min) / range) * 100;

  return (
    <div className="relative w-16 h-3.5 shrink-0" aria-hidden="true">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gray-200" />
      {cdRows.map(row => {
        const isSelected = row.GeoID === selectedId;
        return (
          <div
            key={row.GeoID}
            className="absolute top-1/2 rounded-full"
            style={{
              left:       `${pct(row.Value)}%`,
              width:      isSelected ? 7 : 4,
              height:     isSelected ? 7 : 4,
              background: isSelected ? SELECTED : BAR_DEFAULT,
              border:     isSelected ? '1.5px solid white' : 'none',
              transform:  'translate(-50%, -50%)',
              zIndex:     isSelected ? 2 : 1,
            }}
          />
        );
      })}
    </div>
  );
}
