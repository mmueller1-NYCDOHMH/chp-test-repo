/**
 * FILE: loading.jsx  (src/app/neighborhood/[id]/loading.jsx)
 *
 * PURPOSE:
 * Skeleton loading state for neighborhood profile pages.
 * Next.js App Router automatically shows this while the page.js
 * async component is fetching data server-side.
 *
 * DESCRIPTION:
 * Mirrors the page BODY only — hero card and section tiles — so layout is
 * stable while the new neighborhood's content loads.
 *
 * CONTENT-ONLY (2026-10-05):
 * This file renders INSIDE PageLayout's real <main> (the layout at
 * /app/neighborhood/layout.js stays mounted across neighborhood changes).
 * It used to draw a whole second page shell — header, sidebar, topic nav,
 * context bar and its own padded <main> — nested inside the real one, with
 * three-across grids of fixed-width bones. On a phone that nested shell was
 * wider than the screen (doubled side padding + ~420px of unshrinkable
 * tiles in a ~280px card), so every neighborhood change briefly gave the
 * page real horizontal overflow. Mobile browsers respond to that by
 * panning/zooming the viewport and don't reliably snap back when the real
 * content swaps in — the "page comes back off-center / cut off on the left
 * after changing neighborhoods" bug. Same failure class as the 2026-08-11
 * fix, which caught the sidebar and card grids but not the 3-up rows or
 * the nesting.
 *
 * Rules for editing this file:
 * - No shell chrome here (header / sidebar / nav / <main>) — PageLayout
 *   already provides the real ones.
 * - Every grid must collapse to one column below `sm`, and every grid/flex
 *   child that holds a fixed-width Bone needs `min-w-0` + `max-w-full` on
 *   the bone, so nothing can ever be wider than its container.
 *
 * NOTES:
 * - Pure presentational — no props, no data
 * - Bone lives in src/components/layout/Bone.jsx (shared with
 *   indicator/[key]/loading.jsx and about/loading.jsx).
 * - Heights and widths are approximate matches to the real layout
 */

import Bone from '@/components/layout/Bone';
import LoadingAnnouncer from '@/components/layout/LoadingAnnouncer';

function CardSkeleton() {
  return (
    <div className="min-w-0 bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <Bone className="h-4 w-3/4" />
          <Bone className="h-3 w-1/2" />
        </div>
        <Bone className="h-7 w-16 rounded-md shrink-0" />
      </div>
      {/* Chart area */}
      <Bone className="h-40 w-full rounded-lg" />
      <Bone className="h-3 w-32 max-w-full" />
    </div>
  );
}

function StatTileSkeleton() {
  return (
    <div className="min-w-0 bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
      <Bone className="h-3 w-16 max-w-full" />
      <Bone className="h-7 w-24 max-w-full" />
      <Bone className="h-3 w-20 max-w-full" />
    </div>
  );
}

export default function NeighborhoodLoading() {
  return (
    <>
      {/* A11Y (2026-09-26): skeleton is visual-only (aria-hidden); the
          loading state is announced by LoadingAnnouncer instead. */}
      <LoadingAnnouncer kind="neighborhood" />

      {/* overflow-hidden is a backstop: even if a future edit reintroduces
          something too wide, it gets clipped here instead of widening the
          page. */}
      <div aria-hidden="true" className="w-full min-w-0 overflow-hidden flex flex-col gap-10">

        {/* Hero card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Bone className="h-6 w-48 max-w-full" />
            <Bone className="h-4 w-72 max-w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {[1, 2, 3].map(i => <StatTileSkeleton key={i} />)}
          </div>
        </div>

        {/* Category section 1 */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 flex flex-col gap-3">
            <Bone className="h-5 w-56 max-w-full" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-3/4" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="min-w-0 bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
                  <Bone className="h-3 w-20 max-w-full" />
                  <Bone className="h-4 w-full" />
                  <Bone className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>

        {/* Category section 2 */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 flex flex-col gap-3">
            <Bone className="h-5 w-64 max-w-full" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-2/3" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>

      </div>
    </>
  );
}
