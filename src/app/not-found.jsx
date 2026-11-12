/**
 * FILE: not-found.jsx  (src/app/not-found.jsx)
 *
 * PURPOSE:
 * Sitewide 404 page — shown for any URL that doesn't match a route
 * (typo'd paths, bad /indicator/[key] or /print/... URLs, old legacy-CHP
 * links). In a static export this file becomes the build's 404.html, so it
 * is what the production host serves for every unknown path.
 *
 * /neighborhood/[id] has its own, more specific not-found.jsx; this one
 * covers everything else. Visual pattern mirrors that file.
 */

import Link from 'next/link';

export const metadata = {
  title: 'Page not found · Community Health Profiles · NYC',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <div className="bg-blue-700 px-6 md:px-10 py-3">
        <Link href="/" className="text-base font-medium text-blue-100 hover:text-white">
          Community Health Profiles
        </Link>
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center px-6 py-16 focus:outline-none"
      >
        <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center" aria-hidden="true">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              We couldn&rsquo;t find the page you were looking for. The link may have
              a typo, or the page may have moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Browse neighborhoods
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2 px-3 py-2.5"
            >
              About this tool
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
