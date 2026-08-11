'use client';

/**
 * FILE: Footer.jsx
 *
 * PURPOSE:
 * Site-wide page footer — ported from the Respiratory Virus Data Pages (RVP)
 * footer so both NYC Health sites share the same structure and behavior.
 *
 * DESCRIPTION:
 * Three columns of NYC.gov utility links, plus an NYC Health logo, copyright
 * line, and a Privacy Policy / Terms of Use / Accessibility row. Hovering any
 * link shows a small cursor-following tooltip with the link's destination
 * host, same as RVP.
 *
 * EDITING COPY:
 * All links and the copyright string live in /content/site/footer.json — no
 * code changes needed. {year} in `copyright` is filled in at render time.
 *
 * EDITING COLORS:
 * Unlike RVP (which uses @nychealth/design-system's default dark-charcoal
 * --footer-bg), CHP overrides --footer-bg/--footer-text/--footer-link(-hover)/
 * --footer-border in globals.css to bookend the page with --color-brand —
 * the same blue PageHeader uses. Change those vars in globals.css to update
 * the footer color site-wide; nothing in this file is hardcoded.
 *
 * NOTES:
 * - Client component — cursor-following tooltip needs local state
 * - CHP has no global `a { text-decoration: none }` reset (RVP does), so
 *   this uses plain Tailwind `hover:` utilities instead of RVP's
 *   `!important`-laden custom CSS classes.
 * - Receives no props; self-contained
 */

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import footerContent from '../../../content/site/footer.json';

const { linkColumns, copyright, legalLinks, accessibilityLink } = footerContent;

const linkCls =
  'inline-block py-1 text-sm font-semibold text-footer-link no-underline transition-colors ' +
  'hover:text-footer-link-hover hover:underline decoration-2 underline-offset-4';

// inline-block + py-2: text stays text-xs, but the tap target grows to a
// more mobile-friendly height without changing the visual line height.
const legalLinkCls =
  'inline-block py-2 text-xs text-footer-link no-underline transition-colors ' +
  'hover:text-footer-link-hover hover:underline';

// Pulls a friendly hostname out of a link href, e.g. "https://www.nyc.gov/x" → "nyc.gov"
function getHost(href) {
  try {
    return new URL(href, 'https://nyc.gov').hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export default function Footer() {
  // Small text bubble that follows the cursor while hovering a footer link,
  // showing where the link actually goes.
  const [hoverTip, setHoverTip] = useState(null);

  // Touch devices don't have a cursor to follow, and the bug this avoids is
  // worse than just "no tooltip": mobile Safari fires a synthetic
  // mouseenter/mouseover on tap (to support hover-menu sites built for
  // desktop), but never fires mouseleave — there's no cursor to actually
  // leave the element — so a tapped footer link would show the tooltip and
  // then leave it stuck on screen with no way to dismiss it. `(hover: hover)
  // and (pointer: fine)` is the standard way to detect "this is a real
  // mouse," not just "this is a wide screen" (a touch-only tablet in
  // landscape would otherwise still get the same stuck-tooltip bug).
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setCanHover(mq.matches);
    const handler = (e) => setCanHover(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleEnter = useCallback((e, href, label) => {
    const host = getHost(href);
    setHoverTip({
      text: host ? `${label ? label + ' · ' : ''}${host} ↗` : label || 'Visit link',
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleMove = useCallback((e) => {
    setHoverTip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev));
  }, []);

  const handleLeave = useCallback(() => setHoverTip(null), []);

  // Returns no handlers at all on touch devices — not just a no-op — so
  // there's no chance of the stuck-tooltip bug regardless of how a given
  // browser's synthetic mouse events behave.
  const hoverHandlers = (href, label) =>
    canHover
      ? {
          onMouseEnter: (e) => handleEnter(e, href, label),
          onMouseMove: handleMove,
          onMouseLeave: handleLeave,
        }
      : {};

  return (
    <footer className="relative bg-footer-bg text-footer-text py-8 px-4 sm:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center items-start flex-wrap gap-8">

          {/* Left: three link columns — edit links in content/site/footer.json.
              max-lg: (not max-md:) below: the left block's max-w-[640px] +
              right block's max-w-[320px] + gap-8 need ≈992px of content
              width to sit side-by-side without wrapping — footer padding
              eats into that too (px-10 at sm+), so the real non-wrap point
              is past 1024px. Every tablet width (768–1024px, e.g. iPad
              portrait/landscape) falls short of that, so the flex row
              wraps (stacks) regardless of the md breakpoint. Cutting the
              mobile-friendly centered/stacked styles off at md left that
              whole wrapped tablet range stuck with the left-aligned,
              spread-out desktop styles despite already being stacked. lg
              keeps the wrap point and these styles roughly aligned, and
              matches the lg: treatment already applied to this block
              below. */}
          <div
            className={[
              'flex flex-1 justify-between gap-8 max-w-[640px] min-w-[320px]',
              'lg:flex-wrap lg:justify-start lg:gap-6 lg:max-w-full',
              'max-lg:flex-col max-lg:items-center max-lg:w-full max-lg:min-w-0',
            ].join(' ')}
          >
            {linkColumns.map((column, colIdx) => (
              <div
                key={colIdx}
                className="flex flex-col flex-1 min-w-[160px] gap-1 max-lg:w-full max-lg:max-w-[280px] max-lg:items-center"
              >
                {column.map(({ label, href }) => (
                  <a
                    key={href}
                    href={href}
                    title={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkCls}
                    {...hoverHandlers(href, label)}
                  >
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </div>

          {/* Right: logo + legal.
              max-lg: overrides mirror the left link-columns block above —
              without them this stayed left-aligned at min-w-[260px] while
              the link columns centered themselves, so the two halves looked
              mismatched once they stacked on mobile. */}
          <div className="flex flex-1 flex-col items-start min-w-[260px] max-w-[320px] lg:max-w-[280px] max-lg:items-center max-lg:w-full max-lg:min-w-0 max-lg:max-w-[280px]">
            <a
              href="https://www.nyc.gov/"
              title="NYC.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mb-2 transition-opacity hover:opacity-70"
              {...hoverHandlers('https://www.nyc.gov/', 'NYC.gov')}
            >
              <Image
                src="https://www.nyc.gov/assets/doh/respiratory-illness-data/assets/NYC_Health_color_main.png"
                alt="NYC Health Logo"
                width={86}
                height={22}
                className="w-[86px] h-auto"
                style={{ filter: 'var(--footer-logo-filter)' }}
              />
            </a>

            <p className="text-sm text-footer-text leading-relaxed text-left max-lg:text-center">
              {copyright.replace('{year}', new Date().getFullYear())}
            </p>

            <div className="flex items-center justify-between w-full mt-2 gap-4 max-lg:justify-center max-lg:flex-wrap">
              {legalLinks.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  title={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={legalLinkCls}
                  {...hoverHandlers(href, label)}
                >
                  {label}
                </a>
              ))}
              {/* p-3 -m-3: expands the tap target toward ~44px (WCAG/iOS HIG
                  target size) without growing the visible 20px icon. */}
              <a
                href={accessibilityLink.href}
                title={accessibilityLink.label}
                aria-label={accessibilityLink.label}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-3 -m-3 text-footer-link hover:text-footer-link-hover transition-colors"
                {...hoverHandlers(accessibilityLink.href, 'Accessibility')}
              >
                <svg
                  className="w-5 h-5 fill-current align-middle"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 448 512"
                  role="img"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="currentColor"
                    d="M423.9 255.8L411 413.1c-3.3 40.7-63.9 35.1-60.6-4.9l10-122.5-41.1 2.3c10.1 20.7 15.8 43.9 15.8 68.5 0 41.2-16.1 78.7-42.3 106.5l-39.3-39.3c57.9-63.7 13.1-167.2-74-167.2-25.9 0-49.5 9.9-67.2 26L73 243.2c22-20.7 50.1-35.1 81.4-40.2l75.3-85.7-42.6-24.8-51.6 46c-30 26.8-70.6-18.5-40.5-45.4l68-60.7c9.8-8.8 24.1-10.2 35.5-3.6 0 0 139.3 80.9 139.5 81.1 16.2 10.1 20.7 36 6.1 52.6L285.7 229l106.1-5.9c18.5-1.1 33.6 14.4 32.1 32.7zm-64.9-154c28.1 0 50.9-22.8 50.9-50.9C409.9 22.8 387.1 0 359 0c-28.1 0-50.9 22.8-50.9 50.9 0 28.1 22.8 50.9 50.9 50.9zM179.6 456.5c-80.6 0-127.4-90.6-82.7-156.1l-39.7-39.7C36.4 287 24 320.3 24 356.4c0 130.7 150.7 201.4 251.4 122.5l-39.7-39.7c-16 10.9-35.3 17.3-56.1 17.3z"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Cursor-following label showing where the hovered footer link goes */}
      {hoverTip && (
        <span
          className="fixed z-50 pointer-events-none select-none whitespace-nowrap rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow-md"
          style={{ left: hoverTip.x + 14, top: hoverTip.y + 14 }}
        >
          {hoverTip.text}
        </span>
      )}
    </footer>
  );
}
