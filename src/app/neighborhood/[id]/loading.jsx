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
 * NOTES:
 * - Pure presentational — no props, no data, no client hooks needed
 * - animate-pulse comes from Tailwind's built-in keyframe
 * - Heights and widths are approximate matches to the real layout
 */

function Bone({ className }) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className ?? ''}`} />
  );
}

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
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* ── Header skeleton ────────────────────────────────────── */}
      <div className="bg-blue-700 px-10 py-3 w-full flex items-center justify-between">
        <Bone className="h-5 w-48 bg-blue-500" />
        <Bone className="h-7 w-44 bg-blue-500 rounded-lg" />
      </div>

      <div className="flex flex-1">

        {/* ── Sidebar skeleton ───────────────────────────────── */}
        <aside className="w-[360px] shrink-0 h-screen sticky top-0 border-r bg-white flex flex-col overflow-hidden">
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
          <div className="w-full h-[300px] mt-2 bg-gray-100 animate-pulse shrink-0" />
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

          {/* Topic nav bar */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Bone key={i} className="h-4 w-24" />
            ))}
          </div>

          {/* Sticky context bar */}
          <div className="bg-white border-b border-gray-100 px-8 py-2 flex items-center gap-3">
            <Bone className="h-4 w-36" />
            <Bone className="h-3 w-1" />
            <Bone className="h-4 w-24" />
          </div>

          {/* Page body */}
          <main className="px-8 py-10 max-w-5xl flex flex-col gap-10">

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
              <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
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
              <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
