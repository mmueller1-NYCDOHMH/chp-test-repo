'use client';

/**
 * FILE: ComparisonPyramidChartClient.jsx
 *
 * PURPOSE:
 * Client wrapper around ComparisonPyramidChart. Resolves the comparison
 * neighborhood's distribution and passes the correct segments and labels
 * down based on the shared compareToCity toggle owned by PyramidChartSection.
 *
 * PROPS:
 *   title             — chart heading
 *   neighborhoodLabel — primary CD name (e.g. "Mott Haven")
 *   segments          — pre-resolved [{ key, label, neighborhoodValue, citywideValue }]
 *   timePeriod        — data vintage footnote
 *   rawData           — full array of rows for this indicator (all CDs + Citywide)
 *   segmentCfg        — [{ key, label }] — keys match Distribution entries in rawData
 *   geoId             — GeoID of the primary selected neighborhood
 *   compareToCity     — controlled by PyramidChartSection; when true, right side = NYC Citywide
 *
 * NOTES:
 * - Client component — uses useComparison context
 * - Toggle state is owned by the parent PyramidChartSection, not this component.
 */

import { useComparison }      from '@/lib/context/ComparisonContext';
import ComparisonPyramidChart from '@/components/data-display/ComparisonPyramidChart';

function buildComparisonSegments(rawData, compGeoId, primaryGeoId, segmentCfg) {
  const primaryRow = rawData.find(r => r.GeoID === primaryGeoId);
  const compRow    = rawData.find(r => r.GeoID === compGeoId);
  if (!primaryRow || !compRow) return null;

  const primaryByKey = Object.fromEntries(
    (primaryRow.Distribution ?? []).map(s => [s.key, s.value])
  );
  const compByKey = Object.fromEntries(
    (compRow.Distribution ?? []).map(s => [s.key, s.value])
  );

  return segmentCfg.map(s => ({
    key:               s.key,
    label:             s.label,
    neighborhoodValue: primaryByKey[s.key] ?? null,
    citywideValue:     compByKey[s.key]    ?? null,
  }));
}

export default function ComparisonPyramidChartClient({
  title,
  neighborhoodLabel,
  segments,
  timePeriod,
  rawData,
  segmentCfg,
  geoId,
  compareToCity = false,
}) {
  const { comparisonNeighborhood } = useComparison();

  const hasComparison = !!(
    comparisonNeighborhood &&
    rawData?.length &&
    segmentCfg?.length
  );

  const showingCitywide = !hasComparison || compareToCity;

  const comparisonSegments =
    hasComparison && !compareToCity
      ? buildComparisonSegments(rawData, comparisonNeighborhood.geoId, geoId, segmentCfg)
      : null;

  const activeSegments   = comparisonSegments ?? segments;
  const activeRightLabel = showingCitywide ? 'Citywide' : comparisonNeighborhood.name;

  return (
    <ComparisonPyramidChart
      title={title}
      neighborhoodLabel={neighborhoodLabel}
      segments={activeSegments ?? []}
      timePeriod={timePeriod}
      rightLabel={activeRightLabel}
      comparisonMode={!showingCitywide}
    />
  );
}
