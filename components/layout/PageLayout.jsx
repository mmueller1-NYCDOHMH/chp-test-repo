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
import FlyoutShell from '@/components/core/FlyoutShell';
import BackToTopButton, { BackToTopButtonMobile } from '@/components/controls/BackToTopButton';
import { ComparisonProvider } from '@/lib/context/ComparisonContext';
import { getNeighborhoods } from '@/lib/data/getNeighborhoods';
import { getIndicatorSummaries } from '@/lib/data/getIndicatorSummaries';
import { loadOverviewHeroConfig } from '@/lib/data/loadSectionIndicators';

export default async function PageLayout({ config, children, pageLabel, pageNav }) {
  const neighborhoods = await getNeighborhoods();

  // At-a-glance keys come from the section JSON, not from the JS config.
  // loadOverviewHeroConfig reads /content/sections/neighborhood-overview.json.
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

            {/* Sticky topic nav — two-level hover dropdown with scroll-spy */}
            <TopicNav />

            {/* Sticky context bar — breadcrumb + copy link + About/language/shortcuts.
                Only renders on pages with sections, so it's the only place those
                utility controls live now (see StickyContextBar's UTILITY CONTROLS NOTE). */}
            <StickyContextBar
              sections={config.sections.filter(s => !s.category)}
            />

            {/* Page body */}
            <main
              id="main-content"
              className="px-4 md:px-8 py-10 max-w-5xl w-full mx-auto"
              aria-label={pageLabel ?? 'Community Health Profile'}
            >
              {children}
              <BackToTopButtonMobile />
            </main>

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