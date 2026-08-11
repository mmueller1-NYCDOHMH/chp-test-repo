'use client';

/**
 * FILE: MobileCategoryContext.jsx
 *
 * PURPOSE:
 * EXPERIMENTAL — mobile "pseudo-page" navigation.
 *
 * DESCRIPTION:
 * On mobile, instead of one continuous long scroll through every category,
 * only ONE category's sections are shown at a time — defaulting to the
 * first category (Social), which renders right under the "at a glance"
 * hero exactly like the original continuous-scroll page did, so on load
 * the user can just scroll down into it normally rather than hitting a
 * dead end. Tapping a *different* category tab in TopicNav, or the
 * "Continue to next category" button (ContinueToNextCategoryButton.jsx,
 * rendered at the end of each category by CHPBuilder.jsx), switches
 * pagedCategoryId — that's what triggers the swap/hide behavior.
 *
 * This provider owns the resulting scroll behavior in one place so both
 * triggers stay consistent: when pagedCategoryId actually CHANGES value,
 * it scrolls to that category's header (`#cat-${id}`, from
 * buildCategorySection in neighborhoodProfile.js) rather than all the way
 * to the top of the page. It deliberately does NOT scroll on load, on a
 * neighborhood-route change, or when a comparison neighborhood is toggled
 * — none of those change pagedCategoryId's value, only mount/remount or
 * unrelated state, so the page simply starts at the top like normal. It
 * relies on MobileCategoryPager having already un-hidden that category's
 * sections first — safe because effects fire child-before-parent, and
 * MobileCategoryPager is a descendant of this provider.
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
  // Defaults to the first category (Social), not null: on load, the "at a
  // glance" hero should NOT be a dead-end "page" of its own — Social's
  // sections render right underneath it (both have categoryId either
  // 'always' or the default's id, so MobileCategoryPager shows both), and
  // the user can just scroll down into it normally. Only switching to a
  // *different* category (tapping another tab, or the continue button)
  // should trigger the pseudo-page swap/hide behavior below.
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

  // Only scroll when pagedCategoryId itself actually CHANGES VALUE (a real
  // tab tap or continue-button click) — not merely when this effect
  // re-runs for some other reason. That distinction matters because
  // `isMobile` starts false and flips to true asynchronously shortly after
  // mount (matchMedia resolves in the effect above), and this effect also
  // depends on `isMobile` — so with a plain "skip only the very first run"
  // guard, that isMobile flip caused a SECOND run where hasMounted was
  // already true, and it would auto-scroll into the default category on
  // every load/neighborhood-change/comparison-toggle. Comparing against
  // the previous value (not just "have we run before") catches that case:
  // isMobile changing alone, with pagedCategoryId untouched, no longer
  // scrolls anything.
  const prevPagedCategoryIdRef = useRef(pagedCategoryId);
  useEffect(() => {
    const changed = prevPagedCategoryIdRef.current !== pagedCategoryId;
    prevPagedCategoryIdRef.current = pagedCategoryId;
    if (!changed) return;
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
