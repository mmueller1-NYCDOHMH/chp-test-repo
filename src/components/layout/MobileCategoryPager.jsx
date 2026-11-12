'use client';

/**
 * FILE: MobileCategoryPager.jsx
 *
 * PURPOSE:
 * EXPERIMENTAL — mobile "pseudo-page" navigation (see MobileCategoryContext.jsx).
 *
 * DESCRIPTION:
 * All sections are still server-rendered into the DOM as before (so Block.jsx's
 * server-only content loading is untouched). This component just toggles
 * `hidden` on sections that don't belong to the active mobile category —
 * on desktop it's a no-op passthrough (everything stays visible).
 *
 * Sections are matched by the `data-chp-category` attribute set in
 * SectionWrapper.jsx (via CHPBuilder.jsx). A value of "always" (the
 * overview hero, anything not mapped to a siteNav category) is never hidden.
 *
 * REVERT: delete this file, remove its usage in PageLayout.jsx, and remove
 * the data-chp-category plumbing in CHPBuilder.jsx / SectionWrapper.jsx.
 */
import { useEffect, useRef } from 'react';
import { useMobileCategory } from '@/lib/context/MobileCategoryContext';

export default function MobileCategoryPager({ children }) {
  const { isMobile, pagedCategoryId } = useMobileCategory();
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function apply() {
      const nodes = container.querySelectorAll('[data-chp-category]');
      nodes.forEach((el) => {
        const cat = el.getAttribute('data-chp-category');
        const shouldShow = !isMobile || cat === 'always' || cat === pagedCategoryId;
        // `hidden` alone removes the element from the accessibility tree, so
        // aria-hidden is deliberately NOT touched here (2026-10-07). Toggling it
        // stripped the static aria-hidden="true" off CHPBuilder's category
        // spacers before React hydrated them, causing a hydration mismatch.
        if (el.hidden !== !shouldShow) el.hidden = !shouldShow;
      });
    }
    apply();

    // QA row 38 (2026-10-12): sections that arrive AFTER this effect runs
    // (streamed server content, a neighborhood change swapping the page)
    // were never hidden, so on a phone the page sometimes scrolled through
    // every category continuously — with a "Continue to…" button only at
    // the end of the paged one. Re-apply whenever sections are added.
    // (childList only: toggling `hidden` is an attribute change, so this
    // can't loop.)
    // rAF-coalesced: chart rendering inserts lots of nodes, and one pass per
    // frame is plenty.
    let raf = null;
    const mo = new MutationObserver(() => {
      if (raf == null) raf = requestAnimationFrame(() => { raf = null; apply(); });
    });
    mo.observe(container, { childList: true, subtree: true });
    return () => { mo.disconnect(); if (raf != null) cancelAnimationFrame(raf); };
  }, [isMobile, pagedCategoryId, children]);

  return <div ref={containerRef}>{children}</div>;
}
