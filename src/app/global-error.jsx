'use client';

/**
 * FILE: global-error.jsx  (src/app/global-error.jsx)
 *
 * PURPOSE:
 * Last-resort error boundary for failures in the root layout itself.
 * It replaces the root layout when active, so it must render its own
 * <html>/<body> and import global styles directly. Kept deliberately
 * minimal — no shared components that could be the thing that broke.
 */

import { useEffect } from 'react';
import './globals.css';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[CHP global error boundary]', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something went wrong · Community Health Profiles · NYC</title>
      </head>
      <body className="min-h-screen flex flex-col bg-white antialiased">
        <div className="bg-blue-700 px-6 md:px-10 py-3">
          <p className="text-base font-medium text-blue-100">Community Health Profiles</p>
        </div>
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-6" role="alert">
            <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              The site didn&rsquo;t load correctly. Try again, or reload the page.
              If the problem continues, please check back later.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
              >
                Try again
              </button>
              {/* Plain <a> (full reload) on purpose — client routing may be what failed. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2 px-3 py-2.5"
              >
                Go to the home page
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
