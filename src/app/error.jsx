'use client';

/**
 * FILE: error.jsx  (src/app/error.jsx)
 *
 * PURPOSE:
 * Route-level error boundary. Catches anything that throws while rendering
 * a page (e.g. an unexpected data shape in a chart or flyout) and shows a
 * recoverable message inside the root layout, instead of Next's generic
 * "Application error" screen.
 *
 * Errors in the root layout itself are handled by global-error.jsx.
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Surface the real error for debugging; users only see the friendly copy.
    console.error('[CHP error boundary]', error);
  }, [error]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 min-h-[60vh] flex items-center justify-center px-6 py-16 focus:outline-none"
    >
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6" role="alert">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center" aria-hidden="true">
          <svg className="w-8 h-8 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94 1.82 18a1.875 1.875 0 0 0 1.61 2.81h17.14A1.875 1.875 0 0 0 22.18 18L13.66 3.94a1.875 1.875 0 0 0-3.32 0z" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            This page didn&rsquo;t load correctly. Try again, or go back to the
            neighborhood profiles. If the problem continues, please check back later.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2 px-3 py-2.5"
          >
            Browse neighborhoods
          </Link>
        </div>
      </div>
    </main>
  );
}
