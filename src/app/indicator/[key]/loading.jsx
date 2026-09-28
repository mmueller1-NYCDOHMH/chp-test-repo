/**
 * FILE: loading.jsx  (src/app/indicator/[key]/loading.jsx)
 *
 * PURPOSE:
 * Skeleton loading state for the standalone indicator page. Next.js App
 * Router shows this automatically while the page.js async component
 * (data lookups + narrative resolution) is resolving server-side.
 *
 * DESCRIPTION:
 * Unlike neighborhood/[id] and /about, this route does NOT go through
 * PageLayout — page.js renders its own standalone <main> with a simple
 * breadcrumb bar over a max-w-3xl content column (see page.js). This
 * skeleton mirrors exactly that structure, not the full sidebar/nav shell,
 * so there's no header/sidebar swap-in flash once the real content arrives.
 *
 * Added 2026-09-02 — this route previously had no loading.jsx at all, so
 * navigating here showed a blank white flash while the server component
 * resolved. Uses the shared Bone primitive (src/components/layout/Bone.jsx),
 * same shimmer-sweep skeleton language as the other two routes' loading
 * states.
 *
 * NOTES:
 * - Pure presentational — no props, no data, no client hooks needed
 */
import Bone from '@/components/layout/Bone';
import LoadingAnnouncer from '@/components/layout/LoadingAnnouncer';

export default function IndicatorLoading() {
  return (
    <>
    {/* A11Y (2026-09-26): skeleton is visual-only (aria-hidden); the
        loading state is announced by LoadingAnnouncer instead. */}
    <LoadingAnnouncer kind="indicator" />
    <main aria-hidden="true" className="min-h-screen bg-white">

      {/* Top bar — breadcrumb */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Bone className="h-4 w-40" />
          <Bone className="h-4 w-3" />
          <Bone className="h-4 w-28" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-3">
          <Bone className="h-3 w-40" />
          <Bone className="h-8 w-3/4" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-2/3" />
        </div>

        {/* "Full page coming soon" notice-shaped block */}
        <Bone className="h-20 w-full rounded-xl" />

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Bone className="h-3 w-32" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-1/2" />
        </div>

        {/* Source */}
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-6">
          <Bone className="h-3 w-24" />
          <Bone className="h-4 w-2/3" />
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-6">
          <Bone className="h-3 w-32" />
          <Bone className="h-9 w-52 rounded-lg" />
        </div>

      </div>
    </main>
    </>
  );
}
