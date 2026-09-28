'use client';

/**
 * FILE: PrematureDeathChartsRow.jsx
 *
 * PURPOSE:
 * Client row for PrematureDeathOverviewSection (a server component): renders
 * the "Top causes of premature death" bar card and the cancer-types pyramid
 * card side by side under ONE "Compare to city" toggle — same pattern as the
 * At a Glance hero's pyramid pair (2026-09-28, per Morgan). Both cards
 * receive the toggle state as a controlled prop and hide their own switch.
 *
 * PROPS:
 *   causeCardProps — props for PrematureMortCauseCard (or null)
 *   pyramidCharts  — chart array for PyramidChartSection (may be empty)
 *   neighborhoodLabel, geoId
 */

import { useState } from 'react';
import { useComparison } from '@/lib/context/ComparisonContext';
import CompareToCityToggle from '@/components/data-display/CompareToCityToggle';
import PrematureMortCauseCard from '@/components/data-display/PrematureMortCauseCard';
import PyramidChartSection from '@/components/data-display/PyramidChartSection';

export default function PrematureDeathChartsRow({
  causeCardProps = null,
  pyramidCharts = [],
  neighborhoodLabel,
  geoId,
}) {
  const { comparisonNeighborhood } = useComparison();
  const [compareToCity, setCompareToCity] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Single shared toggle — only when a comparison CD is active */}
      {comparisonNeighborhood && (
        <CompareToCityToggle checked={compareToCity} onChange={setCompareToCity} />
      )}

      {/* Side by side at lg+, stacked below — see PyramidChartSection's grid
          comment for the lg-breakpoint reasoning. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {causeCardProps && (
          <PrematureMortCauseCard {...causeCardProps} compareToCity={compareToCity} />
        )}

        {pyramidCharts.length > 0 && (
          <PyramidChartSection
            charts={pyramidCharts}
            neighborhoodLabel={neighborhoodLabel}
            geoId={geoId}
            fillHeight
            withDetails
            compareToCity={compareToCity}
          />
        )}
      </div>
    </div>
  );
}
