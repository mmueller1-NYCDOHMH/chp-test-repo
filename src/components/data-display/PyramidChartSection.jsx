'use client';

/**
 * FILE: PyramidChartSection.jsx
 *
 * PURPOSE:
 * Shared wrapper for a group of pyramid charts (e.g. the pair in the "At a
 * Glance" section, or a single chart like the cancer ranking section).
 * Owns the single "Compare to City" toggle so all charts respond to one
 * control.
 *
 * PROPS:
 *   charts            — Array of resolved chart objects:
 *                        { indicatorKey, title, segments, timePeriod, rawData,
 *                          segmentCfg, valueSuffix? }
 *                        valueSuffix defaults to '%' in ComparisonPyramidChart
 *                        when omitted — pass '' (or another unit) for
 *                        non-percentage distributions.
 *   neighborhoodLabel — Primary neighborhood name
 *   geoId             — GeoID of the primary neighborhood
 */

import { useState }                    from 'react';
import { useComparison }               from '@/lib/context/ComparisonContext';
import ComparisonPyramidChartClient    from '@/components/data-display/ComparisonPyramidChartClient';
import CompareToCityToggle             from '@/components/data-display/CompareToCityToggle';

// fillHeight: stretch to the grid row's height (used when sitting next to
// another card, e.g. PrematureDeathOverviewSection). Off by default so the
// At a Glance hero is unchanged.
// withDetails (2026-09-27): give each chart the standard card header + Details
// flyout. Off by default so the At a Glance hero is unchanged; on for the
// cancer-types card (PrematureDeathOverviewSection).
// compareToCity (2026-09-28): optional controlled value. When passed, this
// section hides its own switch and follows the parent's — used by
// PrematureDeathChartsRow so the cause card + cancer card share one toggle.
export default function PyramidChartSection({ charts = [], neighborhoodLabel, geoId, fillHeight = false, withDetails = false, compareToCity: controlledCompareToCity }) {
  const { comparisonNeighborhood } = useComparison();
  const [ownCompareToCity, setCompareToCity] = useState(false);
  const isControlled = typeof controlledCompareToCity === 'boolean';
  const compareToCity = isControlled ? controlledCompareToCity : ownCompareToCity;

  const hasComparison = !!comparisonNeighborhood;

  return (
    <div className={`flex flex-col gap-3 ${fillHeight ? 'h-full' : ''}`}>

      {/* Single toggle — only visible when a comparison neighborhood is active,
          and only when the parent isn't controlling it (a controlled parent
          renders its own shared toggle, e.g. PrematureDeathChartsRow). */}
      {hasComparison && !isControlled && (
        <CompareToCityToggle checked={compareToCity} onChange={setCompareToCity} />
      )}

      {/* Charts grid.
          2-up breakpoint is lg (1024px), not md (768px): the desktop
          Sidebar (a fixed 360px <aside>) also appears at md, so a tablet in
          the 768–1023px range — iPad portrait is 744–834px depending on
          model — only has ≈280–410px of content width. Split 2-up at that
          width, each chart's fixed-width label (w-28=112px) + value
          (w-8×2=64px) columns alone eat ~176px, leaving almost nothing for
          the bars themselves. Staying single-column (full width per chart)
          through that range, and only splitting once there's enough room
          (lg: ≈600px content ÷ 2 ≈ 300px/chart), fixes it. A single-chart
          `charts` array (e.g. the cancer ranking section) simply renders
          one column regardless, since grid-cols-2 with one item still
          lays out as one column. */}
      {/* 2026-09-27: a single chart now spans the full width of its container
          (grid-cols-2 with one item actually left it at half width). */}
      <div className={`grid grid-cols-1 ${charts.length > 1 ? 'lg:grid-cols-2' : ''} gap-4 ${fillHeight ? 'flex-1 items-stretch' : 'items-start'}`}>
        {charts.map(chart => (
          <ComparisonPyramidChartClient
            key={`${chart.indicatorKey}-${neighborhoodLabel}`}
            anchorId={chart.indicatorKey ? `indicator-${chart.indicatorKey}` : undefined}
            title={chart.title}
            neighborhoodLabel={neighborhoodLabel}
            segments={chart.segments}
            timePeriod={chart.timePeriod}
            rawData={chart.rawData}
            segmentCfg={chart.segmentCfg}
            geoId={geoId}
            compareToCity={compareToCity}
            valueSuffix={chart.valueSuffix}
            fillHeight={fillHeight}
            withDetails={withDetails}
            indicatorKey={chart.indicatorKey}
            subtitle={chart.subtitle}
            narrative={chart.narrative}
            description={chart.description}
            source={chart.source}
            sourceUrl={chart.sourceUrl}
          />
        ))}
      </div>

    </div>
  );
}
