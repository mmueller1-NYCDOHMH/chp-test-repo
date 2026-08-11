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
 *                       ↑ selected purple   ↑ comparison rust
 *                       (--color-selected,     (--color-comparison — the
 *                        #5646F5)               solid #C94D18, not the darker
 *                                                -text shade, which is tuned
 *                                                for contrast on the tint pill
 *                                                bg elsewhere, not white)
 *                       Both mirror the SELECTED/COMPARISON colors used for
 *                       these same two neighborhoods everywhere else (charts,
 *                       dots, map) — see chartColors.js.
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
        <span className="text-selected">{neighborhood}</span>
        {' and '}
        <span className="text-comparison">{comparisonNeighborhood.name}</span>
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
