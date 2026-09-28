'use client';

/**
 * FILE: RouteAnnouncer.jsx
 *
 * PURPOSE:
 * Announces client-side route changes to screen reader users. Next.js App
 * Router navigation swaps page content without a full document reload, so
 * assistive tech that relies on a fresh page read (header, nav, sidebar)
 * never gets notified a new page loaded — flagged as a known SPA
 * accessibility gap ("header/nav/sidebar being skipped on navigation").
 * This renders a visually-hidden aria-live region that announces the new
 * page's title whenever the route changes.
 *
 * NOTES:
 * - Client component (uses next/navigation hooks); rendered once from the
 *   root layout so it's present on every route.
 * - Skips the very first render (initial page load) — a screen reader
 *   already announces the document on first load, so only subsequent
 *   client-side navigations need an explicit announcement here.
 * - Reads document.title after a short delay so Next.js has time to apply
 *   the destination route's <title> (its `metadata` export) before we read
 *   it — reading it synchronously on pathname change can race the title
 *   update.
 * - Also moves focus to the new page's main heading (2026-09-26) — see
 *   the comment in the effect below.
 * - aria-live="polite" (was "assertive", 2026-09-26): role=status is
 *   implicitly polite, and the two conflicted; polite also avoids cutting
 *   off whatever the screen reader was saying when the route changed.
 */
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteAnnouncer() {
  const pathname = usePathname();
  const [message, setMessage] = useState('');
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setMessage(document.title ? `Navigated to ${document.title}` : 'Page changed');

      // A11Y (2026-09-26, WCAG 2.4.3): move focus to the new page's main
      // heading. Previously focus stayed on the search box / option that
      // triggered the navigation (or fell to <body> if that element
      // unmounted), so keyboard and screen reader users started from a
      // stale spot. Target: the first visible heading inside <main
      // id="main-content"> (on neighborhood pages that's "{Name} at a
      // Glance"; becomes the H1 once the heading-structure fix lands),
      // else <main> itself (tabIndex=-1 in PageLayout / indicator page).
      const main = document.getElementById('main-content');
      if (main) {
        const heading = Array.from(main.querySelectorAll('h1, h2, h3'))
          .find((el) => el.offsetParent !== null);
        const target = heading ?? main;
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
