'use client';

/**
 * FILE: ComparisonBarChartClient.jsx
 *
 * PURPOSE:
 * Client wrapper around ComparisonBarChart — same job
 * ComparisonPyramidChartClient.jsx does for the butterfly chart: resolves
 * the comparison neighborhood's segments and decides which reference series
 * (citywide vs. comparison CD) is showing.
 *
 * "Compare to city" toggle: pass `compareToCity` (boolean) to control it
 * from a parent — the internal switch is then hidden. Since 2026-09-28 the
 * premature-death row (PrematureDeathChartsRow) does this so the cause card
 * and cancer card share ONE toggle, like the At a Glance pyramids. Without
 * the prop, this component falls back to its own internal switch.
 *
 * PROPS:
 *   primaryLabel — primary CD name (e.g. "Long Island City and Astoria")
 *   segments     — pre-resolved [{ key, label, neighborhoodValue, citywideValue, ... }]
 *   rawData      — full array of rows for this indicator family (all CDs + Citywide)
 *   segmentCfg   — [{ key, label }] — keys match Distribution entries in rawData
 *   geoId        — GeoID of the primary selected neighborhood
 *   valueSuffix  — forwarded to ComparisonBarChart (default '')
 */

import { useState } from 'react';
import { useComparison } from '@/lib/context/ComparisonContext';
import ComparisonBarChart from '@/components/data-display/ComparisonBarChart';
import CompareToCityToggle from '@/components/data-display/CompareToCityToggle';
import { pairDistributionSegments } from '@/lib/utils/distributionSegments';

// Same row-lookup helper ComparisonPyramidChartClient.jsx uses — the pairing
// math itself lives in distributionSegments.js; only finding the two rows
// out of one rawData array is specific to this call site.
function buildComparisonSegments(rawData, compGeoId, primaryGeoId, segmentCfg) {
  const primaryRow = rawData.find((r) => r.GeoID === primaryGeoId);
  const compRow = rawData.find((r) => r.GeoID === compGeoId);
  if (!primaryRow || !compRow) return null;
  return pairDistributionSegments(primaryRow, compRow, segmentCfg);
}

export default function ComparisonBarChartClient({
  primaryLabel,
  segments,
  rawData,
  segmentCfg,
  geoId,
  valueSuffix = '',
  title = null, // forwarded to ComparisonBarChart's sr-only table caption
  compact = false,
  compareToCity: controlledCompareToCity, // optional controlled value
}) {
  const { comparisonNeighborhood } = useComparison();
  const [ownCompareToCity, setCompareToCity] = useState(false);
  const isControlled = typeof controlledCompareToCity === 'boolean';
  const compareToCity = isControlled ? controlledCompareToCity : ownCompareToCity;

  const hasComparison = !!(comparisonNeighborhood && rawData?.length && segmentCfg?.length);
  const showingCitywide = !hasComparison || compareToCity;

  const comparisonSegments =
    hasComparison && !compareToCity
      ? buildComparisonSegments(rawData, comparisonNeighborhood.geoId, geoId, segmentCfg)
      : null;

  const activeSegments = comparisonSegments ?? segments;
  const activeRightLabel = showingCitywide ? 'Citywide' : comparisonNeighborhood.name;

  return (
    <div className="flex flex-col gap-3">
      {hasComparison && !isControlled && (
        <CompareToCityToggle checked={compareToCity} onChange={setCompareToCity} />
      )}

      <ComparisonBarChart
        segments={activeSegments ?? []}
        primaryLabel={primaryLabel}
        rightLabel={activeRightLabel}
        comparisonMode={!showingCitywide}
        valueSuffix={valueSuffix}
        title={title}
        compact={compact}
      />
    </div>
  );
}
