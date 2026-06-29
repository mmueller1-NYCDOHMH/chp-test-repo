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
import TopicNav from './TopicNav';
import StickyContextBar from './StickyContextBar';
import FlyoutShell from '@/components/core/FlyoutShell';
import BackToTopButton from '@/components/controls/BackToTopButton';
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
      <div className="flex flex-col min-h-screen bg-gray-50">

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
          <div className="flex-1 flex flex-col">

            {/* Sticky topic nav — two-level hover dropdown with scroll-spy */}
            <TopicNav />

            {/* Sticky context bar — neighborhood name + active section breadcrumb */}
            <StickyContextBar
              neighborhoods={neighborhoods}
              sections={config.sections.filter(s => !s.category)}
            />

            {/* Page body */}
            <main
              id="main-content"
              className="px-4 md:px-8 py-10 max-w-5xl w-full mx-auto"
              aria-label={pageLabel ?? 'Community Health Profile'}
            >
              {children}
            </main>

          </div>
        </div>
      </div>

      <BackToTopButton />
    </FlyoutShell>
    </ComparisonProvider>
  );
}