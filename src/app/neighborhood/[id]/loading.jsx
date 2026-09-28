/**
 * FILE: loading.jsx  (src/app/neighborhood/[id]/loading.jsx)
 *
 * PURPOSE:
 * Skeleton loading state for neighborhood profile pages.
 * Next.js App Router automatically shows this while the page.js
 * async component is fetching data server-side.
 *
 * DESCRIPTION:
 * Mirrors the visual structure of the rendered page — sidebar, topic nav,
 * sticky context bar, hero card, section tiles — so layout is stable from
 * the first paint. No content shift when real data arrives.
 *
 * MOBILE FIX (2026-08-11):
 * This skeleton was desktop-only in practice — the 360px sidebar had no
 * `hidden md:flex` (real Sidebar.jsx hides it on mobile; this one didn't),
 * and the two CardSkeleton grids used an inline
 * `minmax(400px, 1fr)` grid-template that's wider than any phone screen.
 * Both force real horizontal overflow of the whole page during the (brief
 * but real) window this skeleton is on screen. Mobile Safari can respond
 * to that by zooming/scaling the viewport out to fit, and doesn't reliably
 * zoom back to 100% once the real (correctly-sized) page content swaps
 * in — which reads exactly like "the mobile site renders smaller than the
 * page width," even though the final DOM has no overflow of its own.
 * Fixed by hiding the sidebar skeleton below `md`, wrapping the topic-nav
 * skeleton row in `overflow-x-auto` (mirrors the real TopicNav's own
 * horizontally-scrolling mobile tab row instead of forcing full width),
 * matching `<main>`'s padding to the real PageLayout, and swapping the
 * fixed 400px-minimum grid columns for a responsive `grid-cols-1
 * sm:grid-cols-2` that never exceeds the viewport.
 *
 * NOTES:
 * - Pure presentational — no props, no data, no client hooks needed
 * - Bone (shimmer sweep, not Tailwind's flat animate-pulse) now lives in
 *   src/components/layout/Bone.jsx — shared with indicator/[key]/loading.jsx
 *   and about/loading.jsx (2026-09-02) instead of being redefined here.
 * - Heights and widths are approximate matches to the real layout
 */

import Bone from '@/components/layout/Bone';
import LoadingAnnouncer from '@/components/layout/LoadingAnnouncer';

function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <Bone className="h-4 w-3/4" />
          <Bone className="h-3 w-1/2" />
        </div>
        <Bone className="h-7 w-16 rounded-md shrink-0" />
      </div>
      {/* Chart area */}
      <Bone className="h-40 w-full rounded-lg" />
      <Bone className="h-3 w-32" />
    </div>
  );
}

function StatTileSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
      <Bone className="h-3 w-16" />
      <Bone className="h-7 w-24" />
      <Bone className="h-3 w-20" />
    </div>
  );
}

export default function NeighborhoodLoading() {
  return (
    <>
    {/* A11Y (2026-09-26): skeleton is visual-only (aria-hidden); the
        loading state is announced by LoadingAnnouncer instead. */}
    <LoadingAnnouncer kind="neighborhood" />
    <div aria-hidden="true" className="flex flex-col min-h-screen bg-[var(--background)]">

      {/* ── Header skeleton ────────────────────────────────────── */}
      <div className="bg-blue-700 px-4 sm:px-10 py-3 w-full flex items-center justify-between">
        <Bone className="h-5 w-32 sm:w-48 bg-blue-500" />
        <Bone className="h-7 w-28 sm:w-44 bg-blue-500 rounded-lg" />
      </div>

      <div className="flex flex-1">

        {/* ── Sidebar skeleton — hidden on mobile, matching Sidebar.jsx's
             own `hidden md:flex`. This aside is w-[360px] with shrink-0,
             so on mobile (no `hidden`) it used to reserve 360px of a
             ~390px-wide screen unconditionally — see MOBILE FIX note above. ── */}
        <aside className="hidden md:flex w-[360px] shrink-0 h-screen sticky top-0 border-r bg-white flex-col overflow-hidden">
          {/* Tab strip */}
          <div className="flex border-b border-gray-200">
            <div className="flex-1 py-2.5 px-4">
              <Bone className="h-3 w-20 mx-auto" />
            </div>
            <div className="flex-1 py-2.5 px-4">
              <Bone className="h-3 w-24 mx-auto" />
            </div>
          </div>
          {/* Search bar */}
          <div className="px-6 pt-4 pb-0">
            <Bone className="h-9 w-full rounded-lg" />
          </div>
          {/* Map placeholder */}
          <div className="w-full h-[300px] mt-2 bg-gray-100 skeleton-shimmer shrink-0" />
          {/* CD chip */}
          <div className="px-6 pt-3">
            <Bone className="h-8 w-full rounded-md" />
          </div>
          {/* Stat rows */}
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

          {/* Topic nav bar — overflow-x-auto instead of a bare flex row,
              same reasoning as the real TopicNav's horizontally-scrolling
              mobile tab row: 6 fixed-width bones don't fit a phone screen,
              and without a scroll container that forces page-level overflow. */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex gap-6 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Bone key={i} className="h-4 w-24 shrink-0" />
            ))}
          </div>

          {/* Sticky context bar */}
          <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-2 flex items-center gap-3">
            <Bone className="h-4 w-36" />
            <Bone className="h-3 w-1" />
            <Bone className="h-4 w-24" />
          </div>

          {/* Page body — px-4 md:px-8 max-w-5xl w-full mx-auto matches the
              real PageLayout's <main> exactly (see PageLayout.jsx) */}
          <main className="px-4 md:px-8 py-10 max-w-5xl w-full mx-auto flex flex-col gap-10">

            {/* Hero card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Bone className="h-6 w-48" />
                <Bone className="h-4 w-72" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2">
                {[1, 2, 3].map(i => <StatTileSkeleton key={i} />)}
              </div>
            </div>

            {/* Category section 1 */}
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-3">
                <Bone className="h-5 w-56" />
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-3/4" />
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
                      <Bone className="h-3 w-20" />
                      <Bone className="h-4 w-full" />
                      <Bone className="h-4 w-5/6" />
                    </div>
                  ))}
                </div>
              </div>
              {/* grid-cols-1 sm:grid-cols-2 instead of a fixed
                  minmax(400px, 1fr) — that guarantees a 400px-minimum
                  column regardless of viewport, which is wider than any
                  phone screen and forces real page-level horizontal
                  overflow. See the MOBILE FIX note at the top of this file. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </div>

            {/* Category section 2 */}
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-3">
                <Bone className="h-5 w-64" />
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-2/3" />
              </div>
              {/* grid-cols-1 sm:grid-cols-2 instead of a fixed
                  minmax(400px, 1fr) — that guarantees a 400px-minimum
                  column regardless of viewport, which is wider than any
                  phone screen and forces real page-level horizontal
                  overflow. See the MOBILE FIX note at the top of this file. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
    </>
  );
}
