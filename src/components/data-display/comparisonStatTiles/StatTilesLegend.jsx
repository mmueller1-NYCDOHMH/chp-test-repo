'use client';

/**
 * FILE: StatTilesLegend.jsx
 *
 * Shared legend that replaces the per-card "Low/High"/"Citywide" labels
 * below md. Rendered once above the whole tile row instead of 3x inside
 * each card. TO REVERT: delete this component and its usage in
 * ComparisonStatTilesClient.jsx. Part of the 2026-09-04 split of that file.
 */
import { SELECTED, CITYWIDE } from '@/lib/charts/chartColors';

export default function StatTilesLegend() {
  return (
    <div className="md:hidden flex items-center gap-3 text-[11px] text-gray-600 mb-1 flex-wrap" aria-hidden="true">
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
      <span className="text-gray-600">Low → high across all 59 districts</span>
    </div>
  );
}
