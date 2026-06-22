/**
 * FILE: PageHeader.jsx
 *
 * PURPOSE:
 * Site-wide page header that adapts its title to the current route.
 *
 * DESCRIPTION:
 * When no neighborhood is selected: renders "Community Health Profiles" +
 * generic subtitle.
 * On a neighborhood page: renders the neighborhood name as the primary
 * title with borough + CD as the subtitle, making it immediately clear
 * which geography the user is viewing.
 *
 * The `neighborhoods` prop (passed from PageLayout) is used to resolve the
 * active neighborhood name and borough from the URL param. This avoids an
 * additional data fetch here.
 *
 * NOTES:
 * - Client component — uses useParams() for the active route ID
 * - Receives `neighborhoods` as a prop from the server (PageLayout)
 *   to keep data fetching in one place
 */

import Image from 'next/image';
import Link  from 'next/link';

export default function PageHeader() {
  return (
    <header className="bg-blue-700 text-white px-4 sm:px-10 py-2.5 w-full flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-blue-100 mb-0.5 tracking-wide uppercase">
          New York City
        </p>
        <h1 className="text-xl sm:text-2xl font-bold leading-tight">
          Community Health Profiles
        </h1>
        <p className="mt-1 text-sm text-blue-100 max-w-xl hidden sm:block">
          50+ measures of neighborhood health across all 59 community districts. Because our health starts where we live, work, and play.
        </p>

        {/* About link — mobile only; on desktop it lives in the sidebar footer */}
        <Link
          href="/about"
          className="sm:hidden inline-flex items-center gap-1 mt-1 text-xs text-blue-200 hover:text-white transition-colors"
        >
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          About this tool
        </Link>
      </div>

      {/* NYC Health logo — white version via CSS filter */}
      <Image
        src="https://www.nyc.gov/assets/doh/respiratory-illness-data/assets/NYC_Health_color_main.png"
        alt="NYC Health"
        width={120}
        height={30}
        className="shrink-0 opacity-90 h-7 sm:h-9 w-auto"
        style={{ filter: 'brightness(0) invert(1)' }}
        priority
      />
    </header>
  );
}
