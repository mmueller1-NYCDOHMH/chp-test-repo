/**
 * FILE: /app/neighborhood/[id]/layout.js
 *
 * PURPOSE:
 * Next.js layout for all /neighborhood/[id] routes.
 *
 * DESCRIPTION:
 * Wraps every neighborhood page in PageLayout. Because Next.js keeps layout.js
 * mounted across navigations within the same route segment, the sidebar, header,
 * and data fetching in PageLayout run once — not on every neighborhood selection.
 *
 * NOTES:
 * - pageLabel (neighborhood name on <main> aria-label) is not available here
 *   since layout.js doesn't receive per-page data. Known gap — tracked for
 *   Phase A when a client context or slot pattern can carry it down.
 */

import PageLayout from '@/components/layout/PageLayout';
import { pageRegistry } from '@/config/registries/pageRegistry';

export default async function NeighborhoodLayout({ children }) {
  const config = pageRegistry['neighborhood-profile'];

  return (
    <PageLayout config={config}>
      {children}
    </PageLayout>
  );
}
