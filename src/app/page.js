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
 *
 * LOOK (2026-10-27): the bare "Go to Community Health Profiles" link was
 * replaced with a branded interstitial — logo, title, indeterminate progress
 * bar. Pure HTML + CSS (classes .chp-forward* in ./home-forward.css), no JS, so it
 * paints instantly in the static file. The panel fades in after a short
 * delay so a fast forward never flashes it; the manual "Continue" link only
 * appears after ~2.5s, for the rare case the meta refresh doesn't fire.
 */

import { DEFAULT_NEIGHBORHOOD_ID } from '@/lib/utils/constants';
import HomeForward from './HomeForward';
import './home-forward.css';

const LOGO_SRC =
  'https://www.nyc.gov/assets/doh/respiratory-illness-data/assets/NYC_Health_color_main.png';

export default function HomePage() {
  const target = `/neighborhood/${DEFAULT_NEIGHBORHOOD_ID}`;
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${target}`} />
      <link rel="canonical" href={target} />
      <HomeForward target={target} />
      <main id="main-content" className="chp-forward">
        <div className="chp-forward__panel" role="status" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt="NYC Health"
            width={120}
            height={34}
            className="chp-forward__logo"
          />
          <h1 className="chp-forward__title">Community Health Profiles</h1>
          <p className="chp-forward__sub">Loading neighborhood data…</p>
          <div className="chp-forward__bar" aria-hidden="true">
            <span />
          </div>
          <a href={target} className="chp-forward__link">
            Continue to Community Health Profiles
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </main>
    </>
  );
}
