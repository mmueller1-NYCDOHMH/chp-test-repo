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

    const nodes = container.querySelectorAll('[data-chp-category]');
    nodes.forEach((el) => {
      const cat = el.getAttribute('data-chp-category');
      const shouldShow = !isMobile || cat === 'always' || cat === pagedCategoryId;
      el.hidden = !shouldShow;
      if (shouldShow) {
        el.removeAttribute('aria-hidden');
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
    });
  }, [isMobile, pagedCategoryId, children]);

  return <div ref={containerRef}>{children}</div>;
}
