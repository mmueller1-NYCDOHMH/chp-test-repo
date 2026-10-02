/**
 * FILE: /app/neighborhood/layout.js
 *
 * PURPOSE:
 * Next.js layout for all /neighborhood/[id] routes.
 *
 * DESCRIPTION:
 * Wraps every neighborhood page in PageLayout.
 *
 * WHY IT LIVES HERE AND NOT IN [id]/ (2026-10-02):
 * A layout placed INSIDE a dynamic segment is remounted every time that
 * segment's param changes. When this file was at [id]/layout.js, picking a
 * new neighborhood tore down and rebuilt the whole shell — sidebar, header,
 * and the Leaflet map — so the map flashed, reset to the citywide view, and
 * replayed its zoom-to-neighborhood animation. One level up, the layout stays
 * mounted across neighborhood changes and only the page content swaps; the
 * map just pans from the old district to the new one.
 *
 * NOTES:
 * - Anything that relied on the remount to reset per-neighborhood state must
 *   now reset on the id changing (see ComparisonContext.jsx).
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
