'use client';

/**
 * FILE: TopicNav.jsx
 *
 * PURPOSE:
 * Sticky two-level horizontal navigation bar for CHP pages.
 *
 * DESCRIPTION:
 * Renders a horizontal list of top-level topic categories. Hovering a
 * category reveals a dropdown of subcategories. Subcategories with real
 * section anchors scroll smoothly to that section. Subcategories marked
 * `dummy: true` appear as "coming soon" placeholders.
 *
 * DROPDOWN POSITIONING:
 * The dropdown is rendered as `position: fixed` (not absolute) so it
 * escapes any overflow context on ancestor elements. The button's
 * getBoundingClientRect() is measured on mouseEnter to position it.
 * This is the only reliable way to layer a dropdown over page content
 * when any ancestor has overflow set.
 *
 * SCROLL-SPY:
 * An IntersectionObserver watches all real (non-dummy) section elements.
 * The active category and subcategory highlight as sections scroll into
 * the top 25% of the viewport. The URL hash updates silently via
 * history.replaceState.
 *
 * PROPS: none — reads nav structure from /config/nav/siteNav.js
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { siteNav }           from '@/config/nav/siteNav';
import { scrollToSection as scrollUtil } from '@/lib/utils/scrollToSection';
import { DEFAULT_NEIGHBORHOOD_ID } from '@/lib/utils/constants';
import { TOPICNAV_SEPARATOR } from '@/lib/charts/chartColors';

// Fallback neighborhood when navigating to a section from a non-profile page.
// Matches the default redirect in /app/page.js.

const NAV_HEIGHT = 56;

export default function TopicNav() {
  const [openCategoryId, setOpenCategoryId]       = useState(null);
  const [dropdownPos, setDropdownPos]             = useState({ top: 0, left: 0 });
  const [activeId, setActiveId]                   = useState(null);
  const [focusedSubIdx, setFocusedSubIdx]         = useState(-1);
  const [isMobile, setIsMobile]                   = useState(false);
  // Which edge ('left' | 'right') the active mobile tab is currently pinned
  // to, or null while it's sitting normally in the row (not stuck to
  // either edge). Lets the pinned state use a lighter treatment than the
  // tab's normal in-place active look, and square off whichever side is
  // actually flush against the bar's edge.
  const [stuckSide, setStuckSide]                 = useState(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e) => { setIsMobile(e.matches); if (e.matches) setOpenCategoryId(null); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const intersectingRef                     = useRef(new Set());
  const closeTimerRef                       = useRef(null);
  const categoryBtnRefs                     = useRef([]);
  const mobileCategoryBtnRefs               = useRef([]);
  const mobileTabRowRef                     = useRef(null);
  const dropdownItemRefs                    = useRef([]);
  // Suppresses scroll-spy's setActiveId while a tap-triggered smooth scroll
  // is still animating. Without this, the IntersectionObserver keeps firing
  // for the sections still passing by mid-animation and stomps the tap's
  // intended target back to whatever was previously on screen — the
  // "bounces back to the previously active tab" bug.
  const suppressSpyRef                      = useRef(false);
  const spySettleTimerRef                   = useRef(null);

  const realSectionIds = siteNav
    .flatMap(cat => cat.subcategories)
    .filter(sub => !sub.dummy)
    .map(sub => sub.id);

  const allSubIds = siteNav.flatMap(cat => cat.subcategories).map(sub => sub.id);

  const activeCategoryId = siteNav.find(cat =>
    cat.subcategories.some(sub => sub.id === activeId)
  )?.id ?? null;

  // ── Close dropdown on scroll ─────────────────────────────────────────────
  useEffect(() => {
    function handleScroll() { setOpenCategoryId(null); }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Close dropdown on Escape (global) ────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && openCategoryId) {
        e.preventDefault();
        const idx = siteNav.findIndex(c => c.id === openCategoryId);
        setOpenCategoryId(null);
        setFocusedSubIdx(-1);
        categoryBtnRefs.current[idx]?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openCategoryId]);

  // ── Focus dropdown item when focusedSubIdx changes ────────────────────────
  useEffect(() => {
    if (focusedSubIdx >= 0) {
      dropdownItemRefs.current[focusedSubIdx]?.focus();
    }
  }, [focusedSubIdx]);


  // ── Dropdown handlers ────────────────────────────────────────────────────
  function openDropdown(categoryId, buttonEl) {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom, left: rect.left });
    }
    setOpenCategoryId(categoryId);
    setFocusedSubIdx(-1);
  }

  function handleMouseEnter(categoryId, buttonEl) {
    if (isMobile) return;
    openDropdown(categoryId, buttonEl);
  }

  function handleMouseLeave() {
    closeTimerRef.current = setTimeout(() => { setOpenCategoryId(null); setFocusedSubIdx(-1); }, 100);
  }

  function keepOpen() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }

  // ── Category button keyboard handler ─────────────────────────────────────
  function handleCategoryKeyDown(e, category, btnEl) {
    if (isMobile) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openDropdown(category.id, btnEl);
      // Focus first non-disabled item after render
      setTimeout(() => {
        const firstEnabled = (siteNav.find(c => c.id === category.id)?.subcategories ?? [])
          .findIndex(s => !s.dummy);
        setFocusedSubIdx(firstEnabled >= 0 ? firstEnabled : 0);
      }, 0);
    }
  }

  // ── Dropdown item keyboard handler ────────────────────────────────────────
  function handleDropdownKeyDown(e, subIdx) {
    const subs = openCategory?.subcategories ?? [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSubIdx(i => Math.min(i + 1, subs.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = subIdx - 1;
      if (prev < 0) {
        // Return focus to category button
        const idx = siteNav.findIndex(c => c.id === openCategoryId);
        setFocusedSubIdx(-1);
        setOpenCategoryId(null);
        categoryBtnRefs.current[idx]?.focus();
      } else {
        setFocusedSubIdx(prev);
      }
    } else if (e.key === 'Tab') {
      setOpenCategoryId(null);
      setFocusedSubIdx(-1);
    }
  }

  // ── Tap/programmatic navigation → activeId, with scroll-spy suppressed ───
  // Sets activeId immediately (so the tapped tab highlights right away) and
  // blocks the IntersectionObserver from overwriting it until the resulting
  // smooth-scroll has finished settling. The suppression window is extended
  // on every scroll event (see the effect below) so it covers scrolls of any
  // distance/duration, with a short fallback in case the tap didn't cause
  // any scrolling at all (target already in view).
  function navigateToSection(id) {
    suppressSpyRef.current = true;
    setActiveId(id);
    clearTimeout(spySettleTimerRef.current);
    spySettleTimerRef.current = setTimeout(() => { suppressSpyRef.current = false; }, 200);
  }

  // Re-arms the suppression window on each scroll tick while it's active,
  // so it lasts exactly as long as the animated scroll is still moving.
  useEffect(() => {
    function handleScrollSettle() {
      if (!suppressSpyRef.current) return;
      clearTimeout(spySettleTimerRef.current);
      spySettleTimerRef.current = setTimeout(() => { suppressSpyRef.current = false; }, 150);
    }
    window.addEventListener('scroll', handleScrollSettle, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollSettle);
  }, []);

  // ── Scroll-spy ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!realSectionIds.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            intersectingRef.current.add(entry.target.id);
          } else {
            intersectingRef.current.delete(entry.target.id);
          }
        });
        // Pick the topmost intersecting section in nav order.
        // Using realSectionIds (not allSubIds) since only real sections are observed.
        // rootMargin only clips the top (nav height) — no bottom clip — so a section
        // is "intersecting" any time any pixel of it is visible below the nav.
        // This makes the detection symmetric: works the same scrolling up or down.
        if (suppressSpyRef.current) return;
        const active = realSectionIds.find(id => intersectingRef.current.has(id));
        if (active) setActiveId(active);
      },
      { rootMargin: `-${NAV_HEIGHT}px 0px 0px 0px`, threshold: 0 }
    );

    realSectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hash sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeId) history.replaceState(null, '', `#${activeId}`);
  }, [activeId]);

  // ── Mobile: keep the active category tab in view as scroll-spy advances ──
  // The tab row scrolls horizontally, so as the user scrolls the page down
  // through categories, the highlighted tab can drift out of the visible
  // area. Scroll it back into view (centered) whenever the active category
  // changes — this only fires on actual category changes, not every scroll
  // tick, since activeCategoryId is derived from the (already-debounced-by-
  // section-boundary) scroll-spy id.
  useEffect(() => {
    if (!isMobile || !activeCategoryId) return;
    const idx = siteNav.findIndex(c => c.id === activeCategoryId);
    const btn = mobileCategoryBtnRefs.current[idx];
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [isMobile, activeCategoryId]);

  // ── Mobile: track whether the active tab is actually pinned ──────────────
  // btn.offsetLeft/offsetWidth reflect the tab's normal (un-stuck) box —
  // sticky positioning doesn't affect offset measurements, only paint
  // position — so comparing them against the row's current scroll window
  // tells us whether the tab would be off-screen without sticky (i.e. it's
  // actively pinned right now) vs. just sitting normally in view.
  useEffect(() => {
    if (!isMobile || !activeCategoryId) { setStuckSide(null); return; }
    const row = mobileTabRowRef.current;
    const idx = siteNav.findIndex(c => c.id === activeCategoryId);
    const btn = mobileCategoryBtnRefs.current[idx];
    if (!row || !btn) return;

    // The row scroll-snaps to each tab (snap-x/snap-start), so when the
    // active tab lands exactly at the leading edge after a swipe,
    // row.scrollLeft and btn.offsetLeft can land EXACTLY equal rather than
    // strictly past one another. A strict >/< missed that flush-exact case
    // (still touching the edge, should still square off) — use >=/<= with
    // a sub-pixel tolerance so it's treated as stuck.
    function checkStuck() {
      const EPSILON = 1; // px
      let side = null;
      if (row.scrollLeft >= btn.offsetLeft - EPSILON) side = 'left';
      else if (row.scrollLeft + row.clientWidth <= btn.offsetLeft + btn.offsetWidth + EPSILON) side = 'right';
      setStuckSide(prev => (prev === side ? prev : side));
    }
    checkStuck();
    row.addEventListener('scroll', checkStuck, { passive: true });
    return () => row.removeEventListener('scroll', checkStuck);
  }, [isMobile, activeCategoryId]);

  // ── Smart hash restore on page load ─────────────────────────────────────
  // Scrolls to the hash anchor when the neighbourhood page loads with one.
  // Fires for:
  //   1. External entries — direct URL, new tab, external link.
  //   2. Same-origin entries from non-neighbourhood pages — e.g. the user
  //      clicked an indicator while on /about, which called router.push with
  //      a hash. The hash is intentional and should be honoured.
  //
  // Does NOT fire when navigating from one neighbourhood page to another —
  // in that case the hash is leftover scroll-spy state, not an intentional
  // jump target.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const referrer            = document.referrer;
    const isExternal          = !referrer || !referrer.startsWith(window.location.origin);
    const isFromNeighbourhood = referrer.includes('/neighborhood/');

    // Only suppress when coming from another neighbourhood page
    if (!isExternal && isFromNeighbourhood) return;

    // Defer until after first paint so sections are in the DOM.
    const raf = requestAnimationFrame(() => {
      scrollUtil(hash);
      const id = hash.replace(/^#/, '');
      navigateToSection(id);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scroll or navigate to a section anchor ───────────────────────────────
  // On neighborhood pages: smooth-scroll in place (existing behaviour).
  // On other pages (e.g. /about): navigate to the default neighborhood at
  // that anchor so the TopicNav is always functional regardless of route.
  function scrollToSection(anchor) {
    if (!isNeighborhoodPage) {
      router.push(`/neighborhood/${DEFAULT_NEIGHBORHOOD_ID}${anchor}`);
      setOpenCategoryId(null);
      return;
    }
    scrollUtil(anchor);
    const id = String(anchor).replace(/^#/, '');
    navigateToSection(id);
    setOpenCategoryId(null);
    // Notify SectionNav of the intended destination so it highlights
    // immediately without waiting for IntersectionObserver to settle.
    window.dispatchEvent(new CustomEvent('chp:section-activated', { detail: { id } }));
  }

  const pathname = usePathname();
  const router   = useRouter();
  const isNeighborhoodPage = pathname?.startsWith('/neighborhood/');

  const openCategory = siteNav.find(c => c.id === openCategoryId) ?? null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <nav
        id="topic-nav"
        aria-label="Topic navigation"
        className="sticky top-0 z-40 w-full min-w-0 bg-white border-b border-gray-200 shadow-sm"
      >
        {/* ── Mobile: pinned map icon + horizontally scrolling topic tabs ─────
             Active state is driven by activeCategoryId (derived from
             scroll-spy's activeId), same source as desktop, so the
             highlighted tab tracks scroll position. The active tab is also
             auto-scrolled into view within this row as it changes — see
             the effect above.                                            */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2.5 min-w-0" aria-label="Health topics">
          {/* Map pin icon — left side, fixed (does not scroll with topics).
              Opens Sidebar's mobile bottom sheet via a global event so this
              component doesn't need a direct reference to Sidebar's state. */}
          <button
            type="button"
            aria-label="Map view"
            onClick={() => window.dispatchEvent(new CustomEvent('chp:open-mobile-sheet'))}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" fill="none" aria-hidden="true">
              <path d="M10.3346 1.72266C7.00175 1.72266 4.30615 4.41825 4.30615 7.75115C4.30615 12.2725 10.3346 18.9469 10.3346 18.9469C10.3346 18.9469 16.3631 12.2725 16.3631 7.75115C16.3631 4.41825 13.6675 1.72266 10.3346 1.72266Z" fill="white" />
              <path d="M10.3347 9.90372C11.5238 9.90372 12.4877 8.93978 12.4877 7.75069C12.4877 6.5616 11.5238 5.59766 10.3347 5.59766C9.14559 5.59766 8.18164 6.5616 8.18164 7.75069C8.18164 8.93978 9.14559 9.90372 10.3347 9.90372Z" fill="#2563eb" />
            </svg>
          </button>

          {/* Topic tabs — single row, horizontal finger-scroll.
              `relative` matters here, not just visually: without a
              positioned ancestor between the buttons and the sticky <nav>,
              a button's offsetLeft/offsetParent resolves all the way up to
              <nav> (itself `sticky`, i.e. positioned) instead of this row —
              throwing off the stuck-side math below, which assumes
              offsetLeft is relative to the row's own scrollable content. */}
          <div
            ref={mobileTabRowRef}
            className="relative flex-1 min-w-0 flex gap-2 overflow-x-auto scrollbar-none overscroll-x-contain [-webkit-overflow-scrolling:touch] snap-x snap-mandatory"
          >
            {siteNav.map((category, index) => {
              const isActive  = activeCategoryId === category.id;
              const anchor    = category.anchor
                ?? category.subcategories?.find(s => !s.dummy)?.anchor;
              const firstSub  = category.subcategories.find(s => !s.dummy);

              function handleMobileTap() {
                if (!anchor) return;
                if (!isNeighborhoodPage) {
                  router.push(`/neighborhood/${DEFAULT_NEIGHBORHOOD_ID}${anchor}`);
                  return;
                }
                scrollUtil(anchor);
                if (firstSub) {
                  navigateToSection(firstSub.id);
                  window.dispatchEvent(
                    new CustomEvent('chp:section-activated', { detail: { id: firstSub.id } })
                  );
                }
              }

              return (
                <button
                  key={category.id}
                  ref={el => { mobileCategoryBtnRefs.current[index] = el; }}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={handleMobileTap}
                  className={[
                    'shrink-0 whitespace-nowrap py-2 text-xs font-medium leading-snug min-h-[2.5rem] flex items-center gap-1.5 snap-start',
                    'transition-all duration-200 ease-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                    anchor ? 'cursor-pointer active:scale-95' : 'cursor-default',
                    // Sticky to BOTH edges of the scroll port (not just left)
                    // so it pins to whichever edge it's approaching — always
                    // visible regardless of scroll direction. While actually
                    // pinned (stuckSide set), it's a tighter treatment — no
                    // shadow/scale-pop, less padding — so it reads as a
                    // small "you are here" tag hugging the edge instead of a
                    // bold block sitting on top of the tabs sliding past
                    // underneath it. The side actually flush against the
                    // bar's edge loses its rounding (square corner against
                    // the border); the trailing side, where tabs slide past
                    // underneath it, stays rounded. Once it settles back
                    // into its normal spot in the row, it returns to the
                    // fuller active look.
                    isActive && stuckSide === 'left'
                      ? 'sticky left-0 right-0 z-10 px-2.5 bg-brand text-white rounded-l-none rounded-r-full'
                      : isActive && stuckSide === 'right'
                      ? 'sticky left-0 right-0 z-10 px-2.5 bg-brand text-white rounded-r-none rounded-l-full'
                      : isActive
                      ? 'sticky left-0 right-0 z-10 px-3.5 bg-brand text-white shadow-md shadow-brand/20 scale-[1.03] rounded-full'
                      : 'px-3.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full',
                  ].join(' ')}
                >
                  {category.label}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Desktop: horizontal scrolling nav ───────────────────────────── */}
        <ul
          className="hidden md:flex items-stretch px-4 overflow-x-auto scrollbar-none"
          aria-label="Health topics"
        >
          {siteNav.map((category, index) => {
            const isOpen   = openCategoryId === category.id;
            const isActive = activeCategoryId === category.id;

            return (
              <li
                key={category.id}
                className="shrink-0 flex items-stretch flex-1"
                onMouseEnter={e => {
                  const btn = e.currentTarget.querySelector('button');
                  handleMouseEnter(category.id, btn);
                }}
                onMouseLeave={handleMouseLeave}
              >
                {/* Separator chevrons */}
                {index > 0 && (
                  <span className="self-stretch flex items-center select-none px-0.5" aria-hidden="true">
                    <svg width="10" height="50" viewBox="0 0 10 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4 L8 25 L2 46" stroke={TOPICNAV_SEPARATOR} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
                <button
                  ref={el => { categoryBtnRefs.current[index] = el; }}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => { if (category.anchor) scrollToSection(category.anchor); }}
                  onKeyDown={e => handleCategoryKeyDown(e, category, categoryBtnRefs.current[index])}
                  className={[
                    'flex items-center px-3 py-2.5 text-sm font-medium whitespace-nowrap',
                    'transition-colors border-b-2 flex-1',
                    category.anchor ? 'cursor-pointer' : 'cursor-default',
                    isActive
                      ? 'border-brand text-brand font-semibold'
                      : isOpen
                      ? 'border-brand text-brand'
                      : 'border-transparent text-gray-600 hover:text-gray-900',
                  ].join(' ')}
                >
                  <span>{category.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Dropdown — rendered as fixed so it escapes any overflow context ── */}
      {!isMobile && openCategory && (
        <ul
          role="menu"
          aria-label={openCategory.label}
          onMouseEnter={keepOpen}
          onMouseLeave={handleMouseLeave}
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
          className="fixed z-50 min-w-[200px] py-1.5 bg-white border border-gray-200 rounded-md shadow-lg"
        >
          {openCategory.subcategories.map((sub, subIdx) => {
            const isSubActive = activeId === sub.id;

            return (
              <li key={sub.id}>
                <button
                  ref={el => { dropdownItemRefs.current[subIdx] = el; }}
                  role="menuitem"
                  disabled={sub.dummy}
                  onClick={() => { if (!sub.dummy) scrollToSection(sub.anchor); }}
                  onKeyDown={e => handleDropdownKeyDown(e, subIdx)}
                  aria-current={isSubActive ? 'location' : undefined}
                  className={[
                    'w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors',
                    isSubActive
                      ? 'bg-brand-tint text-brand font-medium'
                      : sub.dummy
                      ? 'text-gray-500 cursor-default'
                      : 'text-gray-700 hover:bg-brand-tint hover:text-brand cursor-pointer',
                  ].join(' ')}
                >
                  <span>{sub.label}</span>

                  {sub.dummy && (
                    <span className="text-xs text-gray-600 font-normal tracking-wide ml-3 shrink-0">
                      coming soon
                    </span>
                  )}

                  {isSubActive && !sub.dummy && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand ml-3 shrink-0" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
