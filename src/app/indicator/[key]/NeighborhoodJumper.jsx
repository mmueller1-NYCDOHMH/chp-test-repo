'use client';

/**
 * FILE: NeighborhoodJumper.jsx
 *
 * PURPOSE:
 * Small control on the standalone indicator page (/indicator/[key]) letting
 * a reader switch which neighborhood the page is scoped to (the `?geo=`
 * query param), without leaving the page. A plain <select> rather than the
 * full UnifiedSearch/AddressSearch stack used in the sidebar — this page is
 * deliberately lightweight (see page.js file header), and a native select
 * is fully keyboard/screen-reader accessible with no extra wiring.
 *
 * Rendered side-by-side with IndicatorJumper.jsx inside page.js's "page
 * controls" toolbar (2026-09-09) — same label-over-select shape as that
 * component so the pair reads as one coherent control group, not two
 * differently-styled widgets bolted together.
 *
 * PROPS:
 *   neighborhoods  — full list of { id, name, borough } (already sorted
 *                     alphabetically by getNeighborhoods())
 *   indicatorKey   — current indicator key, used to build the destination URL
 *   currentGeoId   — the currently-selected neighborhood's `id` slug, or ''
 *                     when no neighborhood is selected (citywide view)
 */

import { useRouter } from 'next/navigation';

export default function NeighborhoodJumper({ neighborhoods = [], indicatorKey, currentGeoId = '' }) {
  const router = useRouter();

  function handleChange(e) {
    const id  = e.target.value;
    const url = id ? `/indicator/${indicatorKey}?geo=${id}` : `/indicator/${indicatorKey}`;
    router.push(url);
  }

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <label htmlFor="indicator-neighborhood-jumper" className="text-sm font-semibold text-gray-600">
        Neighborhood
      </label>
      <select
        id="indicator-neighborhood-jumper"
        value={currentGeoId}
        onChange={handleChange}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Citywide (no neighborhood selected)</option>
        {neighborhoods.map(n => (
          <option key={n.id} value={n.id}>{n.name} · {n.borough}</option>
        ))}
      </select>
    </div>
  );
}
