/**
 * FILE: loading.jsx  (src/app/about/loading.jsx)
 *
 * PURPOSE:
 * Skeleton loading state for /about. Next.js App Router shows this while
 * the async AboutPage component (and the PageLayout it renders through)
 * resolves server-side.
 *
 * DESCRIPTION:
 * About renders through PageLayout — the same header/sidebar/topic-nav
 * shell as a neighborhood profile page (Sidebar and TopicNav don't depend
 * on `sections`, so they render their normal full UI here too) — so the
 * shell portion of this skeleton mirrors neighborhood/[id]/loading.jsx.
 * StickyContextBar is the one piece deliberately omitted: it returns null
 * on this page (About passes an empty `sections` config), so it never
 * renders here either. The main-content area is swapped for a shape
 * matching About's own two-column prose layout (page header + article body
 * + sticky keyboard-shortcuts aside) instead of the neighborhood hero/cards.
 *
 * Added 2026-09-02 — this route previously had no loading.jsx, so
 * navigating here showed a blank white flash while the page resolved.
 * Uses the shared Bone primitive (src/components/layout/Bone.jsx).
 *
 * NOTES:
 * - Pure presentational — no props, no data, no client hooks needed
 * - The header/sidebar/topic-nav skeleton markup is intentionally similar
 *   to neighborhood/[id]/loading.jsx's (same real components underneath);
 *   not extracted into a shared shell component yet to keep this change
 *   scoped and low-risk.
 */
import Bone from '@/components/layout/Bone';
import LoadingAnnouncer from '@/components/layout/LoadingAnnouncer';

export default function AboutLoading() {
  return (
    <>
    {/* A11Y (2026-09-26): skeleton is visual-only (aria-hidden); the
        loading state is announced by LoadingAnnouncer instead. */}
    <LoadingAnnouncer kind="about" />
    <div aria-hidden="true" className="flex flex-col min-h-screen bg-[var(--background)]">

      {/* ── Header skeleton ────────────────────────────────────── */}
      <div className="bg-blue-700 px-4 sm:px-10 py-3 w-full flex items-center justify-between">
        <Bone className="h-5 w-32 sm:w-48 bg-blue-500" />
        <Bone className="h-7 w-28 sm:w-44 bg-blue-500 rounded-lg" />
      </div>

      <div className="flex flex-1">

        {/* ── Sidebar skeleton — hidden on mobile, matches Sidebar.jsx's
             own `hidden md:flex` ── */}
        <aside className="hidden md:flex w-[360px] shrink-0 h-screen sticky top-0 border-r bg-white flex-col overflow-hidden">
          <div className="flex border-b border-gray-200">
            <div className="flex-1 py-2.5 px-4">
              <Bone className="h-3 w-20 mx-auto" />
            </div>
            <div className="flex-1 py-2.5 px-4">
              <Bone className="h-3 w-24 mx-auto" />
            </div>
          </div>
          <div className="px-6 pt-4 pb-0">
            <Bone className="h-9 w-full rounded-lg" />
          </div>
          <div className="w-full h-[300px] mt-2 bg-gray-100 skeleton-shimmer shrink-0" />
          <div className="px-6 pt-3">
            <Bone className="h-8 w-full rounded-md" />
          </div>
          <div className="px-6 pt-4 flex flex-col gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex justify-between items-center py-1">
                <Bone className="h-3 w-28" />
                <Bone className="h-4 w-12" />
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main content skeleton ──────────────────────────── */}
        <div className="flex-1 flex flex-col">

          {/* Topic nav bar */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex gap-6 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Bone key={i} className="h-4 w-24 shrink-0" />
            ))}
          </div>

          {/* Page body — mirrors About's own header + two-column prose body */}
          <main className="px-4 md:px-8 py-10 max-w-5xl w-full mx-auto flex flex-col gap-10">

            {/* Page header (dept label + title + intro) */}
            <div className="flex flex-col gap-3 pb-10 border-b border-gray-100">
              <Bone className="h-3 w-40" />
              <Bone className="h-8 w-2/3" />
              <Bone className="h-4 w-full max-w-xl" />
            </div>

            {/* Two-column body */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">

              {/* Left — prose sections */}
              <div className="min-w-0 flex flex-col gap-8">
                {[1, 2, 3].map(section => (
                  <div key={section} className="flex flex-col gap-3">
                    <Bone className="h-5 w-48" />
                    <Bone className="h-4 w-full" />
                    <Bone className="h-4 w-full" />
                    <Bone className="h-4 w-3/4" />
                  </div>
                ))}
              </div>

              {/* Right — keyboard-shortcuts aside */}
              <div className="hidden lg:block">
                <Bone className="h-64 w-full rounded-xl" />
              </div>

            </div>
          </main>
        </div>
      </div>
    </div>
    </>
  );
}
