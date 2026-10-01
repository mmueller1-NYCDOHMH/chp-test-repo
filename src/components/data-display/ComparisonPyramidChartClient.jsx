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
 *   valueSuffix       — forwarded to ComparisonPyramidChart (default '%')
 *
 * NOTES:
 * - Client component — uses useComparison context
 * - Toggle state is owned by the parent PyramidChartSection, not this component.
 */

import { useComparison }      from '@/lib/context/ComparisonContext';
import { useOptionalFlyout }  from '@/components/core/FlyoutShell';
import { useCardDetailsShortcut } from '@/components/charts/expandableChartCard/useCardDetailsShortcut';
import ComparisonPyramidChart from '@/components/data-display/ComparisonPyramidChart';
import { pairDistributionSegments } from '@/lib/utils/distributionSegments';
import { getChartNote } from '@/config/chartNotes';
import { getDistributionSuppressionNote } from '@/lib/utils/suppression';

const CITYWIDE_GEOID = 0;

// Row lookup (by two different GeoIDs out of one rawData array) is specific
// to this component; the actual key→value pairing is shared — see
// distributionSegments.js (also used by resolveOverviewData.js's
// buildPyramidChart() and PrematureDeathOverviewSection.jsx).
function buildComparisonSegments(rawData, compGeoId, primaryGeoId, segmentCfg) {
  const primaryRow = rawData.find(r => r.GeoID === primaryGeoId);
  const compRow    = rawData.find(r => r.GeoID === compGeoId);
  if (!primaryRow || !compRow) return null;

  return pairDistributionSegments(primaryRow, compRow, segmentCfg);
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
  valueSuffix = '%',
  fillHeight = false,
  anchorId,
  // Details flyout (2026-09-27) — opt-in, so the At a Glance hero's
  // pyramids are unchanged. Used by the cancer-types card.
  withDetails = false,
  indicatorKey,
  subtitle,
  narrative,
  description,
  source,
  sourceUrl,
}) {
  const { comparisonNeighborhood } = useComparison();
  const flyout = useOptionalFlyout();

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

  // Suppression note (2026-10-01) — any suppressed value among the segments +
  // geographies drawn → "?" dialog and Details flyout (pyramids have no
  // expanded view).
  const suppressionNote = getDistributionSuppressionNote(
    rawData,
    [geoId, showingCitywide ? CITYWIDE_GEOID : comparisonNeighborhood.geoId],
    segmentCfg?.map(s => s.key),
  );
  const notes = [getChartNote(indicatorKey), suppressionNote].filter(Boolean);

  const chartProps = {
    title,
    neighborhoodLabel,
    segments: activeSegments ?? [],
    timePeriod,
    rightLabel: activeRightLabel,
    comparisonMode: !showingCitywide,
    valueSuffix,
  };

  // Standard indicator flyout, no map (multi-type distribution — no single
  // value per CD). Shows this chart as currently toggled + methods text.
  const handleDetails = withDetails && flyout ? () => flyout.open({
    kind: 'indicator',
    indicatorKey,
    title,
    subtitle: narrative || subtitle,
    // 2026-09-30: flyout header shows both — subtitle line under the
    // title (metadataLine) and the narrative context sentence below it.
    metadataLine: subtitle,
    flyoutContext: narrative || null,
    source,
    sourceUrl,
    description,
    geoId,
    suppressionNote,
    chart: <ComparisonPyramidChart {...chartProps} bare />,
  }) : null;
  const shortcutProps = useCardDetailsShortcut(handleDetails);

  return (
    <ComparisonPyramidChart
      {...chartProps}
      fillHeight={fillHeight}
      anchorId={anchorId}
      onDetails={handleDetails}
      subtitle={subtitle}
      narrative={narrative}
      cardProps={handleDetails ? shortcutProps : {}}
      source={source}
      note={notes.length ? notes : null}
    />
  );
}
