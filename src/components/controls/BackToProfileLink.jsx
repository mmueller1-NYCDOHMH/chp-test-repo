'use client';

/**
 * FILE: BackToProfileLink.jsx
 *
 * PURPOSE:
 * "Back" link for pages outside the neighborhood profile (e.g. /about).
 * The label names the destination:
 *   - "Back to {neighborhood}"   when a profile was viewed this session
 *   - "Choose a neighborhood"    otherwise (links to `/`, which redirects to
 *                                the default profile; first-time visitors get
 *                                the IntroModal picker there)
 *
 * NOTES:
 * - Client component: the last-viewed neighborhood lives in sessionStorage
 *   (lib/utils/lastNeighborhood.js). Server HTML always renders the
 *   "Choose a neighborhood" fallback, so the link works without JS.
 * - Visible at every width. Pass layout classes (margins) via className.
 */

import Link from 'next/link';
import { useLastNeighborhood } from '@/lib/utils/lastNeighborhood';

export default function BackToProfileLink({ className = '' }) {
  const last  = useLastNeighborhood();
  const href  = last ? `/neighborhood/${last.id}` : '/';
  const label = last ? `Back to ${last.name}` : 'Choose a neighborhood';

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors ${className}`}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}
