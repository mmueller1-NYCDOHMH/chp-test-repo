'use client';

/**
 * FILE: AtAGlanceTitle.jsx
 *
 * PURPOSE:
 * Renders the "At a Glance" section heading, dynamically reflecting any
 * active comparison neighborhood.
 *
 * Without comparison:  "Woodside at a Glance"
 * With comparison:     "Woodside and Sunnyside at a Glance"
 *                       ↑ blue          ↑ amber
 *
 * PROPS:
 *   neighborhood — primary neighborhood name (e.g. "Woodside")
 */

import { useComparison } from '@/lib/context/ComparisonContext';

export default function AtAGlanceTitle({ neighborhood = 'Neighborhood' }) {
  const { comparisonNeighborhood } = useComparison();

  if (comparisonNeighborhood) {
    return (
      <h3 className="text-lg font-semibold text-gray-900 leading-snug">
        <span className="text-blue-700">{neighborhood}</span>
        {' and '}
        <span className="text-amber-600">{comparisonNeighborhood.name}</span>
        {' at a Glance'}
      </h3>
    );
  }

  return (
    <h3 className="text-lg font-semibold text-gray-900">
      {neighborhood} at a Glance
    </h3>
  );
}
