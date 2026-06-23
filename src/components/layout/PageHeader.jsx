'use client';

/**
 * FILE: PageHeader.jsx
 *
 * PURPOSE:
 * Site-wide page header with a date-aware subtitle Easter egg.
 *
 * DESCRIPTION:
 * Renders the CHP brand header. The subtitle swaps on three specific dates:
 *   - April 7          → World Health Day
 *   - February 26      → NYC Dept of Health founding anniversary (1866)
 *   - First Sunday of November → NYC Marathon day
 * All other days show the default subtitle.
 *
 * Date detection runs on the client so the correct local date is used
 * regardless of CDN caching or server timezone.
 *
 * NOTES:
 * - Client component — date must be read at runtime, not render time
 * - Receives no props; self-contained
 */

import Image from 'next/image';
import Link  from 'next/link';

/**
 * Returns the day-of-month for the first Sunday of a given month/year.
 * Used to detect NYC Marathon day (first Sunday of November).
 */
function firstSundayOfMonth(year, month /* 0-indexed */) {
  const first = new Date(year, month, 1);
  // getDay() returns 0 for Sunday; shift so Sunday lands at offset 0
  return 1 + (7 - first.getDay()) % 7;
}

/**
 * Returns a special subtitle string for notable dates, or null for normal days.
 * Caller falls back to the default subtitle when this returns null.
 */
function getSpecialSubtitle(now = new Date()) {
  const month = now.getMonth() + 1; // 1-indexed
  const day   = now.getDate();
  const year  = now.getFullYear();

  // ── World Health Day — April 7 ────────────────────────────────────────────
  if (month === 4 && day === 7) {
    return 'Today is World Health Day. Health equity starts at the neighborhood level.';
  }

  // ── NYC Dept of Health founding — February 26, 1866 ──────────────────────
  // On this date the NY State Legislature enacted the Metropolitan Health Law,
  // establishing the Metropolitan Board of Health — the direct predecessor of
  // today's NYC Dept of Health & Mental Hygiene.
  if (month === 2 && day === 26) {
    const age = year - 1866;
    return `On this day in 1866, NYC established its Board of Health — one of the first public health agencies in the US. ${age} years of protecting the city.`;
  }

  // ── NYC Marathon — first Sunday of November ───────────────────────────────
  // ~50,000 runners pass through neighborhoods across all five boroughs.
  const marathonDay = firstSundayOfMonth(year, 10); // October index = 10 → November
  if (month === 11 && day === marathonDay) {
    return 'Marathon day. The race route passes through a dozen of these 59 community districts — each with its own health story.';
  }

  return null;
}

const DEFAULT_SUBTITLE =
  '50+ measures of neighborhood health across all 59 community districts. Because our health starts where we live, work, and play.';

export default function PageHeader() {
  const subtitle = getSpecialSubtitle() ?? DEFAULT_SUBTITLE;

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
          {subtitle}
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
