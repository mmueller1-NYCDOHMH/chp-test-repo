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

import { useRef, useState }   from 'react';
import { useComparison }      from '@/lib/context/ComparisonContext';
import CustomExpandedChartModal from '@/components/charts/expandableChartCard/CustomExpandedChartModal';
import EmbedModal from '@/components/charts/expandableChartCard/EmbedModal';
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
  // Expand modal (2026-10-14) — opt-in; At a Glance age + race/ethnicity cards.
  withExpand = false,
  indicatorKey,
  subtitle,
  narrative,
  description,
  source,
  sourceUrl,
}) {
  const { comparisonNeighborhood } = useComparison();
  const flyout = useOptionalFlyout();
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const expandBtnRef = useRef(null);
  const embedBtnRef = useRef(null);

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

  const sourceClean = source ? String(source).replace(/^source:\s*/i, '') : '';

  // Flat rows for the expand modal's CSV download (same shape as EducationSplitBarChart).
  const csvRows = withExpand
    ? (rawData ?? []).map(r => ({
        GeoID: r.GeoID,
        Geography: r.Geography,
        ...Object.fromEntries((segmentCfg ?? []).map(({ key, label }) => {
          const s = r.Distribution?.find(d => d.key === key);
          return [label, s?.displayValue ?? ''];
        })),
      }))
    : null;

  const hasData = (activeSegments ?? []).length > 0;

  return (
    <>
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
        onExpand={withExpand && hasData ? () => setExpandedOpen(true) : null}
        expandBtnRef={expandBtnRef}
      />

      {withExpand && (
        <CustomExpandedChartModal
          open={expandedOpen}
          indicatorKey={indicatorKey}
          title={title}
          subtitle={subtitle}
          sourceClean={sourceClean ? `${sourceClean}${timePeriod && !sourceClean.includes(timePeriod) ? ` (${timePeriod})` : ''}` : ''}
          onClose={() => setExpandedOpen(false)}
          restoreFocusRef={expandBtnRef}
          embedBtnRef={embedBtnRef}
          onOpenEmbed={() => setEmbedOpen(true)}
          csvRows={csvRows}
          suppressionNote={suppressionNote}
        >
          {/* timePeriod off here — the modal's source line already carries it */}
          <ComparisonPyramidChart {...chartProps} timePeriod={null} bare large />
        </CustomExpandedChartModal>
      )}

      {withExpand && (
        <EmbedModal
          open={embedOpen}
          indicatorKey={indicatorKey}
          title={title}
          onClose={() => setEmbedOpen(false)}
          restoreFocusRef={embedBtnRef}
        />
      )}
    </>
  );
}
