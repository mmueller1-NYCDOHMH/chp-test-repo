/**
 * FILE: /app/page.js
 *
 * PURPOSE:
 * Root route — forwards to a default neighborhood profile.
 *
 * DESCRIPTION:
 * The Community Health Profiles app is neighborhood-first; there is no
 * standalone landing page. Visiting `/` forwards to a sensible default
 * neighborhood so every entry point lands on a real profile.
 *
 * The IntroModal (shown to first-time users) lives on the neighborhood
 * page itself, so it still fires for new visitors regardless of which
 * entry point they used.
 *
 * ROUTING:
 * /  →  /neighborhood/woodside-and-sunnyside  (Queens CD2)
 *
 * HOW (PERF / STATIC HOSTING, 2026-10-13):
 * This used to call next/navigation's redirect(). In a pre-built (static)
 * page that redirect only fires after the browser downloads and runs the
 * app's JavaScript (~185 KB gzipped) — a blank page, then a jump. The
 * production CMS serves static files only, so there's no server to send a
 * real redirect either. Instead this page is a tiny static file whose
 * <meta http-equiv="refresh" content="0"> forwards as soon as the HTML is
 * parsed, before any JS runs; a plain link is the no-meta-refresh fallback.
 * - Netlify staging also does a true server-side redirect (netlify.toml),
 *   so on staging this page is never even served.
 * - If the prod host supports redirect rules, add "/ → /neighborhood/
 *   woodside-and-sunnyside" there too; this page stays as the fallback.
 * - HomeForward.jsx covers in-app <Link href="/"> navigations, where a
 *   meta refresh doesn't fire.
 * - React 19 hoists <meta>/<link> rendered here into <head>.
 */

import { DEFAULT_NEIGHBORHOOD_ID } from '@/lib/utils/constants';
import HomeForward from './HomeForward';

export default function HomePage() {
  const target = `/neighborhood/${DEFAULT_NEIGHBORHOOD_ID}`;
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${target}`} />
      <link rel="canonical" href={target} />
      <HomeForward target={target} />
      <main id="main-content" className="p-8 text-base text-gray-700">
        <a href={target} className="text-blue-700 underline">
          Go to Community Health Profiles
        </a>
      </main>
    </>
  );
}
