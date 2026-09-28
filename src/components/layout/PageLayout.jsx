/**
 * FILE: PageLayout.jsx
 *
 * PURPOSE:
 * Defines the global layout structure for all CHP pages.
 *
 * DESCRIPTION:
 * Provides:
 * - Sidebar (navigation + controls)
 * - Header (branding)
 * - Main content container
 *
 * RESPONSIBILITIES:
 * - Fetch global data (e.g. neighborhoods)
 * - Pass data to Sidebar
 * - Wrap page content
 *
 * NOTES:
 * - Shared across all routes
 * - Should remain layout-focused (no page-specific logic)
 */

import Sidebar from './Sidebar';
import PageHeader from './PageHeader';
import Footer from './Footer';
import TopicNav from './TopicNav';
import StickyContextBar from './StickyContextBar';
import StickyOffsetSync from './StickyOffsetSync';
import MobileCategoryPager from './MobileCategoryPager';
import FlyoutShell from '@/components/core/FlyoutShell';
import BackToTopButton, { BackToTopButtonMobile } from '@/components/controls/BackToTopButton';
import { ComparisonProvider } from '@/lib/context/ComparisonContext';
import { MobileCategoryProvider } from '@/lib/context/MobileCategoryContext';
import { getNeighborhoods } from '@/lib/data/getNeighborhoods';
import { getIndicatorSummaries } from '@/lib/data/getIndicatorSummaries';
import { loadOverviewHeroConfig } from '@/lib/data/loadSectionIndicators';

export default async function PageLayout({ config, children, pageLabel, pageNav }) {
  const neighborhoods = await getNeighborhoods();

  // At-a-glance keys come from the copy deck's "At a glance" rows.
  const heroConfig    = loadOverviewHeroConfig();
  const atAGlanceKeys = (heroConfig?.statTiles ?? []).map(t => t.indicatorKey);
  const indicatorSummaries = getIndicatorSummaries(atAGlanceKeys);

  return (
    <ComparisonProvider neighborhoods={neighborhoods}>
    <FlyoutShell>
      {/* id targeted by IntroModal's inert/aria-hidden effect — must wrap
          everything except the (portaled) modal so the background can be
          hidden from assistive tech while the modal is open. */}
      <div id="chp-app-shell" className="flex flex-col min-h-screen bg-[var(--background)]">

        {/* Header — full width, spans above sidebar and content */}
        <PageHeader neighborhoods={neighborhoods} />

        {/* NOTE: This used to also render a persistent full-width mobile
            UnifiedSearch pill here (a "surface the pill directly" fix from
            mobile-ux-review.md). Removed — it duplicated TopicNav's own
            neighborhood pill, which is sticky (always visible) and lives
            right below this point, so having a second non-sticky pill here
            just added a redundant full-width row above it that scrolled
            away immediately. See TopicNav.jsx MOBILE ENTRY-POINT BAR note. */}

        {/* Body row — sidebar + main content side by side */}
        <div className="flex flex-1">

          {/* Sidebar — only subcategory sections; category headers are visual-only */}
          <Sidebar
            sections={config.sections.filter(s => !s.category)}
            neighborhoods={neighborhoods}
            indicatorSummaries={indicatorSummaries}
            pageNav={pageNav}
          />

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* EXPERIMENTAL: mobile pseudo-page navigation. TopicNav's mobile
                tabs and the main content below share pagedCategoryId via this
                provider. Desktop behavior is untouched (isMobile gates it off).
                See MobileCategoryContext.jsx for what this is and how to revert. */}
            <MobileCategoryProvider>

              {/* Sticky topic nav — two-level hover dropdown with scroll-spy.
                  neighborhoods passed through so its mobile row can resolve
                  the current neighborhood's display name (see TopicNav.jsx
                  MOBILE ENTRY-POINT BAR note). */}
              <TopicNav neighborhoods={neighborhoods} />

              {/* Sticky context bar — breadcrumb + copy link + About/language/shortcuts.
                  Only renders on pages with sections, so it's the only place those
                  utility controls live now (see StickyContextBar's UTILITY CONTROLS NOTE). */}
              <StickyContextBar
                sections={config.sections.filter(s => !s.category)}
              />

              {/* A11Y: publishes the sticky bars' combined height as
                  --chp-sticky-offset for scroll-padding-top (globals.css). */}
              <StickyOffsetSync />

              {/* Page body */}
              <main
                id="main-content"
                tabIndex={-1} /* A11Y: lets the skip link / route-change focus land here (Safari) */
                className="px-4 md:px-8 py-10 max-w-5xl w-full mx-auto focus:outline-none"
                aria-label={pageLabel ?? 'Community Health Profile'}
              >
                <MobileCategoryPager>
                  {children}
                </MobileCategoryPager>
                <BackToTopButtonMobile />
              </main>

            </MobileCategoryProvider>

          </div>
        </div>

        {/* Footer — full width, below sidebar + content, above BackToTopButton */}
        <Footer />

        {/* Fixed-position, but kept inside #chp-app-shell (rather than as a
            sibling) so it's covered by the inert/aria-hidden toggle above. */}
        <BackToTopButton />
      </div>
    </FlyoutShell>
    </ComparisonProvider>
  );
}