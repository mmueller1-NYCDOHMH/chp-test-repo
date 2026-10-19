'use client';

/**
 * FILE: PrintReportLink.jsx
 *
 * PURPOSE:
 * "Print / save as PDF" link for the current neighborhood profile. Sits next
 * to the "{Neighborhood} at a Glance" heading in NeighborhoodOverviewHero.
 *
 * PLACEMENT (2026-10-09, "Option A"):
 * Moved out of StickyContextBar's right-hand utility group. Printing is an
 * action on *this neighborhood*, so it now sits with the neighborhood's title
 * instead of next to site-level help links. Revert copies of the old files
 * live in "Claude outputs/revert_utility_links_2026-10-09/".
 *
 * Reads the route id from the URL (same NEIGHBORHOOD_ID_PATTERN approach
 * StickyContextBar used) because the hero's context carries geoId, which is
 * not guaranteed to equal the route id the print page expects.
 *
 * Hidden below sm — print is a desktop/tablet action (matches previous
 * behavior in the sticky bar).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NEIGHBORHOOD_ID_PATTERN = /^\/neighborhood\/([^/]+)/;

export default function PrintReportLink() {
  const pathname       = usePathname();
  const neighborhoodId = pathname?.match(NEIGHBORHOOD_ID_PATTERN)?.[1] ?? null;
  if (!neighborhoodId) return null;

  return (
    <Link
      href={`/print/neighborhood/${neighborhoodId}`}
      // PERF (2026-10-13): don't pre-download the print page on every profile
      // view — it opens in a new tab anyway, so prefetching buys nothing.
      prefetch={false}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden sm:inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded whitespace-nowrap"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
      </svg>
      Print
      {/* A11Y (2026-09-26): warn before a new tab opens */}
      <span className="sr-only"> (opens in new tab)</span>
    </Link>
  );
}
