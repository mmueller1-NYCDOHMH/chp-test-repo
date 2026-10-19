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
 * - size="compact" renders a smaller pill (currently unused; kept for tight
 *   spots like toolbars).
 */

import Link from 'next/link';
import { useLastNeighborhood } from '@/lib/utils/lastNeighborhood';

export default function BackToProfileLink({ className = '', id, size = 'default' }) {
  const compact = size === 'compact';
  const last  = useLastNeighborhood();
  const href  = last ? `/neighborhood/${last.id}` : '/';
  const label = last ? `Back to ${last.name}` : 'Choose a neighborhood';

  return (
    <Link
      id={id}
      href={href}
      /* Stylized pill (2026-10-09, per Morgan): brand-tint fill + brand text,
         arrow sits in its own white circle and nudges left on hover. */
      className={`group inline-flex items-center ${compact ? 'gap-1.5 pl-1 pr-3 py-1 text-xs' : 'gap-2 pl-1.5 pr-4 py-1.5 text-sm'} whitespace-nowrap rounded-full bg-brand-tint border border-brand/15 font-semibold text-brand hover:bg-brand hover:text-white hover:border-brand shadow-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${className}`}
    >
      <span
        className={`flex items-center justify-center ${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-white text-brand shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0`}
        aria-hidden="true"
      >
        <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </span>
      {label}
    </Link>
  );
}
