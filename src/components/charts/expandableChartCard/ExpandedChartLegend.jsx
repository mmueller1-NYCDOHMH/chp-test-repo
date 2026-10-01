/**
 * FILE: ExpandedChartLegend.jsx
 *
 * Column of colored circles (Citywide / Borough / selected CD / comparison
 * neighborhood) rendered above the chart in ExpandedChartModal (part of
 * the 2026-09-04 split of ExpandableChartCard.jsx). Also reused by the
 * standalone indicator page's IndicatorComparisonChart.jsx (2026-09-09),
 * which needs different (non-modal) spacing — hence the optional
 * `className` override below, added the same day, default unchanged so
 * ExpandedChartModal's existing call site needs no update.
 */

import { buildLegendItems } from './chartCardUtils';

export default function ExpandedChartLegend({ indicatorData, geoId, comparisonNeighborhood, className = 'px-7 pb-3' }) {
  const items = buildLegendItems(indicatorData, geoId, comparisonNeighborhood);
  if (!items.length) return null;

  return (
    <div className={`flex flex-row flex-wrap items-center gap-x-5 gap-y-1.5 ${className}`}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 w-3 h-3 rounded-full"
            style={{ background: item.color }}
            aria-hidden="true"
          />
          {item.suppressed ? (
            /* Suppressed (2026-10-01) — same treatment as the card's legend
               above the chart: colored name + "(Suppressed)". */
            <span className="text-xs whitespace-nowrap">
              <span className="font-semibold" style={{ color: item.color }}>{item.label}</span>
              <span className="ml-1.5 font-semibold text-gray-900">(Suppressed)</span>
            </span>
          ) : (
            <span className="text-xs text-gray-700 whitespace-nowrap">
              {item.label}
              {item.value && (
                <span className="text-gray-600 ml-1">· {item.value}</span>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
