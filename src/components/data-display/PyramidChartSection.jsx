'use client';

/**
 * FILE: PyramidChartSection.jsx
 *
 * PURPOSE:
 * Shared wrapper for the pair of pyramid charts in the "At a Glance" section.
 * Owns the single "Compare to City" toggle so both charts respond to one control.
 *
 * PROPS:
 *   charts            — Array of resolved chart objects:
 *                        { indicatorKey, title, segments, timePeriod, rawData, segmentCfg }
 *   neighborhoodLabel — Primary neighborhood name
 *   geoId             — GeoID of the primary neighborhood
 */

import { useState }                    from 'react';
import { useComparison }               from '@/lib/context/ComparisonContext';
import ComparisonPyramidChartClient    from '@/components/data-display/ComparisonPyramidChartClient';

export default function PyramidChartSection({ charts = [], neighborhoodLabel, geoId }) {
  const { comparisonNeighborhood } = useComparison();
  const [compareToCity, setCompareToCity] = useState(false);

  const hasComparison = !!comparisonNeighborhood;

  return (
    <div className="flex flex-col gap-3">

      {/* Single toggle — only visible when a comparison neighborhood is active */}
      {hasComparison && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-gray-500 select-none">
            Compare to city
          </span>
          <button
            role="switch"
            aria-checked={compareToCity}
            onClick={() => setCompareToCity(v => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
              compareToCity ? 'bg-gray-800' : 'bg-gray-200'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                compareToCity ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {charts.map(chart => (
          <ComparisonPyramidChartClient
            key={`${chart.indicatorKey}-${neighborhoodLabel}`}
            title={chart.title}
            neighborhoodLabel={neighborhoodLabel}
            segments={chart.segments}
            timePeriod={chart.timePeriod}
            rawData={chart.rawData}
            segmentCfg={chart.segmentCfg}
            geoId={geoId}
            compareToCity={compareToCity}
          />
        ))}
      </div>

    </div>
  );
}
