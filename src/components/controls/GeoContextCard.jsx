'use client';

/**
 * FILE: GeoContextCard.jsx
 *
 * PURPOSE:
 * Shows a compact summary of the currently-selected geography.
 *
 * DESCRIPTION:
 * Reads the active neighborhood ID from the URL (`useParams`), looks it up
 * in the `neighborhoods` prop, and renders: name, borough, and community
 * district number. Renders nothing if no neighborhood is selected.
 *
 * The borough and cdNumber are derived from the geoId encoding:
 *   geoId first digit → borough (1=Manhattan ... 5=Staten Island)
 *   geoId last two digits → CD number within the borough
 * This derivation happens in getNeighborhoods, so the card just reads props.
 *
 * PROPS:
 *   neighborhoods — full array from getNeighborhoods(), each entry:
 *                   { id, name, geoId, borough, cdNumber }
 *
 * NOTES:
 * - Client component — uses useParams()
 * - Returns null when no neighborhood is selected
 * - Population is not yet available at CD level; placeholder for future data
 */
import { useParams } from 'next/navigation';

export default function GeoContextCard({ neighborhoods = [] }) {
  const params  = useParams();
  const activeId = params?.id ? String(params.id) : null;

  if (!activeId) return null;

  const neighborhood = neighborhoods.find(n => String(n.id) === activeId);
  if (!neighborhood) return null;

  const { name, borough, cdNumber, geoId } = neighborhood;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-3 mb-4">

      {/* Neighborhood name */}
      <p className="text-sm font-semibold text-blue-900 leading-snug">
        {name}
      </p>

      {/* Borough + CD */}
      <p className="text-xs text-blue-600 mt-0.5">
        {borough} · CD {cdNumber}
      </p>

      {/* Divider */}
      <div className="border-t border-blue-100 my-2" />

      {/* GeoID — useful reference for data team / developers */}
      <p className="text-xs text-blue-400 font-mono">
        GeoID {geoId}
      </p>

    </div>
  );
}
