/**
 * FILE: not-found.jsx  (src/app/neighborhood/[id]/not-found.jsx)
 *
 * PURPOSE:
 * Friendly error page shown when a neighborhood ID doesn't match any
 * known community district — e.g. a mistyped or stale shared URL.
 *
 * DESCRIPTION:
 * Renders a standalone full-page layout (no sidebar, no topic nav) with
 * a clear explanation and a link back to the root so the user can search
 * for the right neighborhood via the intro modal.
 *
 * Next.js automatically renders this when notFound() is called in page.js.
 */

import Link from 'next/link';

export default function NeighborhoodNotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">

      {/* Slim header */}
      <div className="bg-blue-700 px-10 py-3">
        <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">
          Community Health Profiles
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-6">

          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
            </svg>
          </div>

          {/* Message */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Neighborhood not found
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              The URL you followed doesn't match any of NYC's 59 community
              districts. It may be a typo or a link that has changed.
            </p>
          </div>

          {/* Action */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            Browse all neighborhoods
          </Link>

          <p className="text-xs text-gray-500">
            Or use the neighborhood search in the sidebar to find a community district.
          </p>

        </div>
      </div>

    </div>
  );
}
