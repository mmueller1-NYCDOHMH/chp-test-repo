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
 * EDITING COPY:
 * The site name (H1) and all subtitle strings live in /content/site/header.json
 * — no code changes needed. The {year} and {age} placeholders in
 * dohAnniversary.subtitle are filled in at runtime by this component.
 *
 * EDITING BRAND COLOR:
 * The header background uses var(--color-brand) from globals.css.
 * Change --color-brand there to update the header color site-wide.
 *
 * LAYOUT:
 * Two stacked rows, separated by a thin hairline (blue-100/20) under row 1.
 * Row 1 is a slim utility strip: NYC Health logo far left, LanguageToggle
 * far right. Row 2 holds the site title (H1) at the left and the subtitle
 * pushed to the far right of the same row.
 *
 * UTILITY CONTROLS (About / language / shortcuts):
 * LanguageToggle lives here again, small and right-aligned on the logo row.
 * It was moved to StickyContextBar for a while so it would stay reachable
 * while scrolled, but that bar returns null on pages with no `sections`
 * (e.g. /about), which meant those pages had no language access at all.
 * PageHeader has no such guard — it renders on every route — so this is
 * the one placement that's guaranteed reachable everywhere.
 * "About this tool" and the "?" shortcuts button stay in StickyContextBar:
 * both are only meaningful in the context of browsing a profile page, so
 * scoping them there is fine.
 *
 * NOTES:
 * - Client component — date must be read at runtime, not render time
 * - Receives no props; self-contained
 */

import Image from 'next/image';
import LanguageToggle from './LanguageToggle';
import headerContent from '../../../content/site/header.json';

/**
 * Returns the day-of-month for the first Sunday of a given month/year.
 * Used to detect NYC Marathon day (first Sunday of November).
 */
function firstSundayOfMonth(year, month /* 0-indexed */) {
  const first = new Date(year, month, 1);
  return 1 + (7 - first.getDay()) % 7;
}

/**
 * Returns a special subtitle string for notable dates, or null for normal days.
 * Subtitle strings are loaded from /content/site/header.json.
 */
function getSpecialSubtitle(now = new Date()) {
  const month = now.getMonth() + 1; // 1-indexed
  const day   = now.getDate();
  const year  = now.getFullYear();
  const { specialDates } = headerContent;

  // ── World Health Day — April 7 ────────────────────────────────────────────
  const whd = specialDates.worldHealthDay;
  if (month === whd.month && day === whd.day) {
    return whd.subtitle;
  }

  // ── NYC Dept of Health founding — February 26, 1866 ──────────────────────
  // On this date the NY State Legislature enacted the Metropolitan Health Law,
  // establishing the Metropolitan Board of Health — the direct predecessor of
  // today's NYC Dept of Health & Mental Hygiene.
  const doh = specialDates.dohAnniversary;
  if (month === doh.month && day === doh.day) {
    const age = year - doh.foundingYear;
    return doh.subtitle
      .replace('{year}', doh.foundingYear)
      .replace('{age}',  age);
  }

  // ── NYC Marathon — first Sunday of November ───────────────────────────────
  // ~50,000 runners pass through neighborhoods across all five boroughs.
  const marathon    = specialDates.nycMarathon;
  const marathonDay = firstSundayOfMonth(year, marathon.month - 1);
  if (month === marathon.month && day === marathonDay) {
    return marathon.subtitle;
  }

  return null;
}

const DEFAULT_SUBTITLE = headerContent.defaultSubtitle;

export default function PageHeader() {
  const subtitle = getSpecialSubtitle() ?? DEFAULT_SUBTITLE;

  return (
    <header
      className="text-white px-4 sm:px-10 py-2.5 w-full"
      style={{ backgroundColor: 'var(--color-brand)' }}
    >
      {/* Row 1 — NYC Health logo far left, LanguageToggle far right. Kept
          slim (small pb, subtle hairline) so it reads as a lightweight
          utility strip rather than competing with the title row below. */}
      <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-blue-100/20">
        <Image
          src="https://www.nyc.gov/assets/doh/respiratory-illness-data/assets/NYC_Health_color_main.png"
          alt="NYC Health"
          width={217}
          height={100}
          className="opacity-90 h-7 sm:h-8 w-auto shrink-0"
          style={{ filter: 'brightness(0) invert(1)' }}
          priority
        />

        {/* Small, right-aligned — see UTILITY CONTROLS note above */}
        <LanguageToggle variant="onBrand" />
      </div>

      {/* Row 2 — site title + subtitle, below the logo. Title sits at the
          left, subtitle is pushed to the far right of the same row.
          flex-nowrap keeps them as side-by-side columns (subtitle never
          drops to its own row) while the subtitle's own text still wraps
          onto multiple lines if it's too long. */}
      <div className="pt-2 min-w-0 flex flex-nowrap items-baseline justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold leading-tight shrink-0">
          {headerContent.siteName}
        </h1>
        <p className="text-sm text-blue-100 max-w-xs sm:max-w-xl text-right hidden sm:block whitespace-pre-line">
          {subtitle}
        </p>
      </div>
    </header>
  );
}
