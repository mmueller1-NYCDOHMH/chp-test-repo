'use client';

/**
 * FILE: ScrollToTopOnMount.jsx
 *
 * PURPOSE:
 * Forces the window to the top when a page mounts. Used on /about
 * (2026-11-16, per Morgan): client-side navigation from a scrolled profile
 * page sometimes landed readers at the bottom of About, because Next's
 * App Router only scrolls when the new segment isn't already "in view"
 * (and the loading.jsx skeleton + html `scroll-behavior: smooth` made that
 * check unreliable).
 *
 * NOTES:
 * - Skips when the URL has a hash (e.g. /about#sources) so deep links to a
 *   section still land on that section.
 * - behavior 'instant' overrides the global smooth scroll in globals.css.
 * - Runs again one frame later in case the Suspense swap from loading.jsx
 *   shifts layout after the first pass.
 */

import { useLayoutEffect } from 'react';

export default function ScrollToTopOnMount() {
  useLayoutEffect(() => {
    if (window.location.hash) return;
    const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    toTop();
    const raf = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}
