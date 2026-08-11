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
 *   Left  — a "browse map" icon (reopens the full neighborhood-picker map
 *           modal — see WHY THE MAP ICON below), the current subcategory
 *           breadcrumb (Category › Subcategory, updated by scroll-spy as
 *           sections enter the viewport), and a copy-link button.
 *   Right — About this tool and keyboard shortcuts.
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
 * WHY THE MAP ICON:
 * Clicking the neighborhood name used to reopen the full map-based picker
 * (IntroModal) — the only way back to it once you'd scrolled past the header
 * on mobile, since the mobile FAB's bottom sheet is search-only (no Leaflet
 * map, to avoid a double-init crash — see Sidebar.jsx). Removing the name
 * would have silently removed that entry point, so its onClick moved to a
 * dedicated icon instead of disappearing.
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
import { siteNav } from '@/config/nav/siteNav';
import { useComparison } from '@/lib/context/ComparisonContext';
import KeyboardShortcutsButton from './KeyboardShortcutsButton';

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
  const { comparisonNeighborhood, setComparisonNeighborhood } = useComparison();

  const [activeSectionId, setActiveSectionId] = useState(null);
  const [topOffset, setTopOffset]             = useState(FALLBACK_NAV_HEIGHT);
  const [scrollProgress, setScrollProgress]   = useState(0);
  const [copied, setCopied]                   = useState(false);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleOpenPicker = useCallback(() => {
    window.dispatchEvent(new CustomEvent('chp:open-intro-modal'));
  }, []);
  const intersectingRef                        = useRef(new Set());
  const manualScrollRef                        = useRef(false);
  const manualTimerRef                         = useRef(null);
  const sectionIds                             = sections.map(s => s.id);

  // ── Track scroll progress ────────────────────────────────────────────────
  useEffect(() => {
    function update() {
      const scrolled = window.scrollY;
      const total    = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? Math.min(scrolled / total, 1) : 0);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
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

  return (
    <div
      data-sticky-context-bar
      className="sticky z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 relative"
      style={{ top: topOffset }}
    >
      {/* Scroll progress bar — 2px strip at the very bottom of this sticky bar */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] bg-brand transition-[width] duration-75 ease-linear"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      <div className="max-w-5xl w-full mx-auto px-4 md:px-8 flex items-center justify-between h-9 gap-3">

        {/* Left — browse-map icon, active section breadcrumb, copy link */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {/* Reopens the full map picker — see WHY THE MAP ICON above */}
          <button
            onClick={handleOpenPicker}
            aria-label="Browse map — change neighborhood"
            title="Change neighborhood"
            className="shrink-0 p-1 -m-1 text-gray-400 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </button>

          {breadcrumb ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-gray-600 truncate">{breadcrumb.catLabel}</span>
              <span className="text-xs text-gray-400 shrink-0">›</span>
              <span className="text-xs text-brand font-medium truncate">{breadcrumb.subLabel}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-600 truncate">Community Health Profiles</span>
          )}

          {/* Copy link */}
          <button
            onClick={handleShare}
            aria-label="Copy link to this section"
            title="Copy link"
            className="shrink-0 p-1 -m-1 text-gray-400 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            {copied ? (
              <span className="text-xs font-medium text-brand">Copied!</span>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
        </div>

        {/* Centre — comparison pill: only on mobile (md+ has sidebar which already shows it) */}
        {comparisonNeighborhood && (
          <div className="md:hidden flex items-center gap-1.5 shrink-0 mx-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full pl-2.5 pr-1 py-0.5">
              <span
                className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Comparing:</span>
              <span className="truncate max-w-[120px]">{comparisonNeighborhood.name}</span>
              <button
                onClick={() => setComparisonNeighborhood(null)}
                aria-label={`Remove comparison with ${comparisonNeighborhood.name}`}
                className="ml-0.5 shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
        )}

        {/* Right — utility controls (About/shortcuts only — language lives in PageHeader) */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <Link
            href="/about"
            className="hidden sm:inline text-xs font-medium text-gray-600 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            About this tool
          </Link>
          <KeyboardShortcutsButton />
        </div>

      </div>
    </div>
  );
}
