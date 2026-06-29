'use client';

/**
 * FILE: StickyContextBar.jsx
 *
 * PURPOSE:
 * Compact sticky bar that persists below TopicNav as the user scrolls.
 *
 * DESCRIPTION:
 * Shows two pieces of persistent context:
 *   Left  — neighborhood name + borough (revealed only after the page header
 *            scrolls out of view, so it doesn't duplicate visible content)
 *   Right — current subcategory breadcrumb (Category › Subcategory),
 *            updated by scroll-spy as sections enter the viewport
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
 * HEADER VISIBILITY:
 * An IntersectionObserver watches the <header> element. The neighborhood name
 * and borough are hidden while the header is in view and revealed once it
 * scrolls off-screen, preventing duplicate context.
 *
 * PROPS:
 *   neighborhoods — array of neighborhood objects (from getNeighborhoods)
 *   sections      — flat array of non-category section configs
 *
 * NOTES:
 * - Client component — uses useParams, useEffect, useState, useRef
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { siteNav } from '@/config/nav/siteNav';
import { useComparison } from '@/lib/context/ComparisonContext';

const FALLBACK_NAV_HEIGHT = 56;

/** Find the siteNav category and subcategory labels for a given section id */
function resolveBreadcrumb(sectionId) {
  for (const category of siteNav) {
    const sub = category.subcategories.find(s => s.id === sectionId);
    if (sub) return { catLabel: category.label, subLabel: sub.label };
  }
  return null;
}

export default function StickyContextBar({ neighborhoods = [], sections = [] }) {
  const params       = useParams();
  const activeId     = params?.id ? String(params.id) : null;
  const neighborhood = activeId
    ? neighborhoods.find(n => String(n.id) === activeId)
    : null;

  const { comparisonNeighborhood, setComparisonNeighborhood } = useComparison();

  const [activeSectionId, setActiveSectionId] = useState(null);
  const [topOffset, setTopOffset]             = useState(FALLBACK_NAV_HEIGHT);
  const [scrollProgress, setScrollProgress]   = useState(0);
  const [headerVisible, setHeaderVisible]     = useState(true);
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

  // ── Watch page header visibility ────────────────────────────────────────
  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHeaderVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(header);
    return () => observer.disconnect();
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
        className="absolute bottom-0 left-0 h-[2px] bg-blue-500 transition-[width] duration-75 ease-linear"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      <div className="max-w-5xl w-full mx-auto px-4 md:px-8 flex items-center justify-between h-9">

        {/* Left — neighborhood name + borough, revealed once header scrolls away */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {neighborhood && !headerVisible ? (
            <div
              className="flex items-center gap-2 min-w-0 transition-all duration-200 ease-out"
              style={{
                opacity: headerVisible ? 0 : 1,
                transform: headerVisible ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              <button
                onClick={handleOpenPicker}
                aria-label={`${neighborhood.name} — click to switch neighborhood`}
                className="text-xs font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                {neighborhood.name}
              </button>
              <span className="text-xs text-gray-600 shrink-0">{neighborhood.borough}</span>

              {/* Share button */}
              <button
                onClick={handleShare}
                aria-label="Copy link to this neighborhood"
                title="Copy link"
                className="shrink-0 ml-1 p-1 -m-1 text-gray-400 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                {copied ? (
                  <span className="text-xs font-medium text-blue-600">Copied!</span>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
              </button>
            </div>
          ) : !neighborhood ? (
            <span className="text-xs text-gray-600">Community Health Profiles</span>
          ) : null}
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

        {/* Right — active section breadcrumb (only when in a siteNav section) */}
        {breadcrumb && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 shrink-0 ml-auto">
            <span className="hidden sm:inline">{breadcrumb.catLabel}</span>
            <span className="hidden sm:inline">›</span>
            <span className="text-blue-600 font-medium">{breadcrumb.subLabel}</span>
          </div>
        )}

      </div>
    </div>
  );
}
