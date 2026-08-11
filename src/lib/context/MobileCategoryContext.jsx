'use client';

/**
 * FILE: MobileCategoryContext.jsx
 *
 * PURPOSE:
 * EXPERIMENTAL — mobile "pseudo-page" navigation.
 *
 * DESCRIPTION:
 * On mobile, instead of one continuous long scroll through every category,
 * only the active category's sections are shown at a time. Tapping a
 * category tab in TopicNav, or the "Continue to next category" button
 * (ContinueToNextCategoryButton.jsx, rendered at the end of each category
 * by CHPBuilder.jsx), switches pagedCategoryId here.
 *
 * This provider owns the resulting scroll behavior in one place so both
 * triggers stay consistent: when pagedCategoryId changes, it scrolls to
 * that category's header (`#cat-${id}`, from buildCategorySection in
 * neighborhoodProfile.js) rather than all the way to the top of the page —
 * the "at a glance" hero above the first category stays out of the way.
 * It relies on MobileCategoryPager having already un-hidden that
 * category's sections first — safe because effects fire child-before-
 * parent, and MobileCategoryPager is a descendant of this provider.
 *
 * Desktop is untouched — `isMobile` gates all paging/scroll behavior off,
 * and MobileCategoryPager shows everything when `isMobile` is false.
 *
 * REVERT:
 * This file + MobileCategoryPager.jsx + ContinueToNextCategoryButton.jsx
 * are additive. To fully revert:
 * 1. Remove the <MobileCategoryProvider> wrap and <MobileCategoryPager>
 *    wrap in PageLayout.jsx (restore children rendered directly).
 * 2. Remove the setPagedCategoryId call in TopicNav.jsx's handleMobileTap
 *    (restore the original scrollUtil-only behavior).
 * 3. Remove the categoryId prop/data-chp-category attribute, and the
 *    ContinueToNextCategoryButton rendering, added in CHPBuilder.jsx.
 *    Remove the categoryId prop/attribute added in SectionWrapper.jsx.
 * 4. Delete this file, MobileCategoryPager.jsx, and
 *    ContinueToNextCategoryButton.jsx.
 * Or simply: git revert the commit(s) that introduced this feature.
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { siteNav } from '@/config/nav/siteNav';
import { scrollToSection } from '@/lib/utils/scrollToSection';

const MobileCategoryContext = createContext(null);

export function MobileCategoryProvider({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [pagedCategoryId, setPagedCategoryId] = useState(siteNav[0]?.id ?? null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    // Reading a media query's current value on mount — same pattern as
    // TopicNav.jsx's own isMobile check; there's no SSR value to read this
    // from otherwise.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Skip the scroll on first mount — the initial category is already the
  // one on screen (top of page), there's nothing to jump to yet.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) { hasMountedRef.current = true; return; }
    if (!isMobile || !pagedCategoryId) return;

    // One frame of headroom in case the un-hide + layout hasn't settled
    // yet in some browsers; MobileCategoryPager's own effect (which does
    // the un-hiding) already ran synchronously before this, so this is
    // just a safety margin, not a hard dependency.
    const raf = requestAnimationFrame(() => {
      scrollToSection(`#cat-${pagedCategoryId}`);
    });
    return () => cancelAnimationFrame(raf);
  }, [pagedCategoryId, isMobile]);

  return (
    <MobileCategoryContext.Provider value={{ isMobile, pagedCategoryId, setPagedCategoryId }}>
      {children}
    </MobileCategoryContext.Provider>
  );
}

// Defensive default so any consumer rendered outside the provider just
// behaves like the feature doesn't exist (isMobile: false → nothing hidden).
export function useMobileCategory() {
  const ctx = useContext(MobileCategoryContext);
  return ctx ?? { isMobile: false, pagedCategoryId: null, setPagedCategoryId: () => {} };
}
