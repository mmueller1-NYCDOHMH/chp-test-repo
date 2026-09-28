'use client';

/**
 * FILE: StickyContextBar.jsx
 *
 * PURPOSE:
 * Compact sticky bar that persists below TopicNav as the user scrolls. Also
 * carries two utility controls — About this tool and keyboard shortcuts —
 * that stay reachable while scrolled instead of disappearing with the header.
 *
 * DESCRIPTION:
 *   Left  — on desktop (md+) only, a "browse map" icon (reopens the full
 *           neighborhood-picker map modal — see MAP ICON note below); the
 *           current subcategory breadcrumb (Category › Subcategory, updated
 *           by scroll-spy as sections enter the viewport); and a copy-link
 *           button.
 *   Right — About this tool (label shortens to "About" below the sm
 *           breakpoint, but stays visible at every width) and keyboard
 *           shortcuts.
 *
 * LANGUAGE SELECTOR MOVED OUT:
 * LanguageToggle used to render here too, but this bar returns null when
 * there are no `sections` (see bottom) — so it never rendered on /about or
 * any other static page. Language now lives in PageHeader instead, which has
 * no such guard and renders on every route. About/shortcuts stayed here
 * since both are only meaningful in the context of browsing a profile page.
 *
 * WHY NO NEIGHBORHOOD NAME:
 * This used to also show the neighborhood name + borough on the left,
 * revealed once the page header scrolled out of view. Dropped because that
 * same info is already visible elsewhere on the page (sidebar, page header
 * before scrolling) — showing it a third time cost width without adding
 * meaning.
 *
 * MAP ICON — DESKTOP ONLY NOW (mobile-ux-review.md spotlight):
 * This bar's icon-only "browse map" button (reopening IntroModal) used to
 * render at every width, sitting directly beneath TopicNav's own icon-only
 * "change neighborhood" button on mobile — same glyph, two different
 * destinations, flagged as the single highest-severity mobile finding in
 * mobile-ux-review.md ("Spotlight: neighborhood search discoverability").
 * TopicNav's mobile row now carries ONE labeled neighborhood pill plus a
 * labeled Compare pill (empty or active), both always visible via that
 * sticky nav — so a second, ambiguous icon here was redundant on mobile.
 * The button itself stays on desktop (md+): desktop's TopicNav has no such
 * pill, and this bar is desktop's own always-visible way back into the map
 * picker while scrolled, same as before. `hidden md:inline-flex` is what
 * gates it off on mobile — nothing else about the button changed.
 * On mobile, the map-based picker (IntroModal) is still reachable one tap
 * deeper, via a text link inside the bottom sheet (see Sidebar.jsx). The
 * mobile-only amber "Comparing: X" pill that used to live in this bar was
 * also removed, superseded by TopicNav's Compare pill.
 *
 * UTILITY CONTROLS NOTE:
 * This bar returns null when there are no sections (see bottom), so it does
 * not render on /about or other static pages — About/shortcuts are only
 * reachable here, on neighborhood profile pages, once this bar exists in the
 * DOM (it's always in the DOM on those pages, sticky-visible whether or not
 * you've scrolled). Language used to have the same gap; fixed by moving
 * LanguageToggle to PageHeader instead (see LANGUAGE SELECTOR MOVED OUT
 * above), which has no `sections` guard.
 *
 * TOP OFFSET:
 * The bar must stick immediately below the TopicNav. Because TopicNav text
 * can wrap (making it taller than the 56px default), the top offset is
 * measured via ResizeObserver on #topic-nav rather than hardcoded. Falls
 * back to 56px on the first render before measurement is available.
 *
 * SCROLL-SPY:
 * Mirrors TopicNav / SectionNav: IntersectionObserver with rootMargin
 * clipping the TopicNav height. Also listens for the `chp:section-activated`
 * custom event fired on programmatic scrolls from TopicNav clicks.
 *
 * PROPS:
 *   sections — flat array of non-category section configs
 *
 * NOTES:
 * - Client component — uses useEffect, useState, useRef
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteNav } from '@/config/nav/siteNav';
import KeyboardShortcutsButton from './KeyboardShortcutsButton';

// Matches the neighborhood id out of the current pathname (/neighborhood/{id}
// or /neighborhood/{id}/...) so the "Print this report" link below can point
// at /print/neighborhood/{id}. Added 2026-09-09 alongside the printable
// report (src/app/print/neighborhood/[id]/page.js).
//
// usePathname() rather than threading a neighborhoodId prop down from
// PageLayout: PageLayout.jsx doesn't currently receive the per-page route
// param at all (see its own layout.js's "known gap" note about pageLabel —
// same underlying gap, tracked for a future Phase A context/slot fix) — so
// reading it back out of the URL here is the smallest change that doesn't
// require threading a new prop through PageLayout -> StickyContextBar for a
// single link, or waiting on that larger refactor.
const NEIGHBORHOOD_ID_PATTERN = /^\/neighborhood\/([^/]+)/;

const FALLBACK_NAV_HEIGHT = 56;

/** Find the siteNav category and subcategory labels for a given section id */
function resolveBreadcrumb(sectionId) {
  for (const category of siteNav) {
    const sub = category.subcategories.find(s => s.id === sectionId);
    if (sub) return { catLabel: category.label, subLabel: sub.label };
  }
  return null;
}

export default function StickyContextBar({ sections = [] }) {
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [topOffset, setTopOffset]             = useState(FALLBACK_NAV_HEIGHT);
  const [scrollProgress, setScrollProgress]   = useState(0);
  const [copied, setCopied]                   = useState(false);

  const pathname       = usePathname();
  const neighborhoodId = pathname?.match(NEIGHBORHOOD_ID_PATTERN)?.[1] ?? null;

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // Desktop-only — see MAP ICON note above. Reopens the full map picker.
  const handleOpenPicker = useCallback(() => {
    window.dispatchEvent(new CustomEvent('chp:open-intro-modal'));
  }, []);

  const intersectingRef                        = useRef(new Set());
  const manualScrollRef                        = useRef(false);
  const manualTimerRef                         = useRef(null);
  const sectionIds                             = sections.map(s => s.id);

  // ── Track scroll progress ────────────────────────────────────────────────
  // rAF-throttled: native 'scroll' events can fire far more than once per
  // frame during momentum/fling scrolling, especially on mobile. Calling
  // setState directly from the listener (the previous implementation) drove
  // a React re-render on every single event instead of once per paint,
  // which is a well-known source of scroll jank — this was very likely the
  // biggest contributor to the page feeling less smooth than it should,
  // since this bar (and its progress fill) is mounted on every neighborhood
  // profile page. Coalescing to one requestAnimationFrame per scroll burst
  // caps updates at the display's actual refresh rate.
  useEffect(() => {
    let rafId = null;
    function update() {
      rafId = null;
      const scrolled = window.scrollY;
      const total    = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? Math.min(scrolled / total, 1) : 0);
    }
    function onScroll() {
      if (rafId == null) rafId = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  // ── Measure TopicNav height so we stick immediately below it ────────────
  useEffect(() => {
    const nav = document.getElementById('topic-nav');
    if (!nav) return;

    // Set initial value before observer fires
    setTopOffset(nav.getBoundingClientRect().height);

    const ro = new ResizeObserver(([entry]) => {
      const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      setTopOffset(h);
    });
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // ── Listen for programmatic scroll activations (TopicNav clicks) ────────
  useEffect(() => {
    function handleActivation(e) {
      setActiveSectionId(e.detail.id);
      manualScrollRef.current = true;
      if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
      manualTimerRef.current = setTimeout(() => {
        manualScrollRef.current = false;
      }, 900);
    }
    window.addEventListener('chp:section-activated', handleActivation);
    return () => window.removeEventListener('chp:section-activated', handleActivation);
  }, []);

  // ── Scroll-spy ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            intersectingRef.current.add(entry.target.id);
          } else {
            intersectingRef.current.delete(entry.target.id);
          }
        });

        if (manualScrollRef.current) return;

        const active = sectionIds.find(id => intersectingRef.current.has(id));
        if (active) setActiveSectionId(active);
      },
      { rootMargin: `-${topOffset}px 0px 0px 0px`, threshold: 0 },
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections, topOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if there's nothing to navigate (e.g. a static page)
  if (!sections.length) return null;

  const breadcrumb = activeSectionId ? resolveBreadcrumb(activeSectionId) : null;

  // A11Y (2026-09-27): <nav> landmark (was a plain <div>) so the breadcrumb,
  // copy link, Print and About controls sit inside a named region — axe
  // "region" flagged them as content outside any landmark, and screen reader
  // users can now jump here with landmark navigation (NVDA D / VoiceOver rotor).
  return (
    <nav
      aria-label="Page tools"
      data-sticky-context-bar
      className="sticky z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 relative"
      style={{ top: topOffset }}
    >
      {/* Scroll progress bar — 2px strip at the very bottom of this sticky bar.
          Hidden on mobile: with the pseudo-page category tabs now the primary
          sense of "where am I", a page-scroll-percentage bar reading as a
          loading/buffering indicator at the top of the screen was more
          confusing than useful there. Unchanged on desktop (md+). */}
      <div
        aria-hidden="true"
        className="hidden md:block absolute bottom-0 left-0 h-[2px] bg-brand transition-[width] duration-75 ease-linear"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      <div className="max-w-5xl w-full mx-auto px-4 md:px-8 flex items-center justify-between h-9 gap-3">

        {/* Left — desktop-only map icon, active section breadcrumb, copy link.
            See the file-level MAP ICON note above for why the icon is
            hidden on mobile but kept here on desktop (md+).
            No overflow-hidden here: the breadcrumb text truncates on its
            own (min-w-0 + truncate on the spans below), and clipping the
            row was cutting off the right edge of the copy-link button —
            its p-1 -m-1 hit-target trick renders a few px past the flex
            layout's reserved space, which this container's overflow-hidden
            was slicing off. */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handleOpenPicker}
            aria-label="Browse map — change neighborhood"
            title="Change neighborhood"
            className="hidden md:inline-flex shrink-0 p-1 -m-1 text-gray-600 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </button>

          {/* A11Y (2026-09-27): no aria-live here any more. The breadcrumb
              changes continuously with scroll-spy, so as a live region it
              announced on every scroll — constant chatter for screen reader
              users (WCAG 4.1.3 says status messages shouldn't over-announce).
              Section changes the user actually requests are covered by
              scrollToSection moving focus to the section heading. */}
          <div className="min-w-0">
            {breadcrumb ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs text-gray-600 truncate">{breadcrumb.catLabel}</span>
                <span className="text-xs text-gray-600 shrink-0">›</span>
                <span className="text-xs text-brand font-medium truncate">{breadcrumb.subLabel}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-600 truncate">At a Glance</span>
            )}
          </div>

          {/* Copy link — icon-only crossfade (link → check) instead of a
              text swap. The text swap used to change the button's width
              (a short SVG vs. the word "Copied!"), which nudged the
              breadcrumb next to it. An sr-only status region keeps the
              same accessible announcement the visible text used to give. */}
          <button
            onClick={handleShare}
            aria-label="Copy link to this section"
            title="Copy link"
            className="shrink-0 relative w-3.5 h-3.5 p-1 -m-1 text-gray-600 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <svg
              aria-hidden="true"
              className={`absolute inset-0 w-3.5 h-3.5 transition-all duration-150 ease-out ${copied ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <svg
              aria-hidden="true"
              className={`absolute inset-0 w-3.5 h-3.5 text-brand transition-all duration-150 ease-out ${copied ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span role="status" aria-live="polite" className="sr-only">{copied ? 'Link copied to clipboard' : ''}</span>
          </button>
        </div>

        {/* Right — utility controls (About/shortcuts only — language lives in PageHeader).
            About this tool used to be "hidden sm:inline" — invisible below the
            640px breakpoint, i.e. on true mobile widths, despite this file's own
            header comment claiming it's reachable here on every screen size.
            Shortened label on mobile instead of hiding it outright, matching the
            same abbreviate-don't-hide pattern used elsewhere in this bar. */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {/* Print/download link — only renders once we can resolve a
              neighborhood id out of the URL (see NEIGHBORHOOD_ID_PATTERN
              above); opens in a new tab so the interactive profile stays
              where the user left it. */}
          {neighborhoodId && (
            <Link
              href={`/print/neighborhood/${neighborhoodId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline text-xs font-medium text-gray-600 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded whitespace-nowrap"
            >
              Print this report
              {/* A11Y (2026-09-26): warn before a new tab opens */}
              <span className="sr-only"> (opens in new tab)</span>
            </Link>
          )}
          <Link
            href="/about"
            className="text-xs font-medium text-gray-600 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded whitespace-nowrap"
          >
            <span className="sm:hidden">About</span>
            <span className="hidden sm:inline">About this tool</span>
          </Link>
          <KeyboardShortcutsButton />
        </div>

      </div>
    </nav>
  );
}
