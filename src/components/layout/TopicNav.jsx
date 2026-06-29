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
  // Tracks the last *tapped* category on mobile — updated only on tap, never by
  // scroll-spy. Separating this from activeId prevents continuous re-renders
  // during scroll that cause the nav grid to jitter.
  const [tappedCategoryId, setTappedCategoryId]   = useState(null);

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
  const dropdownItemRefs                    = useRef([]);

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
      setActiveId(id);
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
    setActiveId(id);
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
        className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm"
      >
        {/* ── Mobile: 2-column grid tabs ───────────────────────────────────
             Active state is driven by tappedCategoryId (set on tap only),
             NOT by scroll-spy activeId. Scroll-spy fires continuously and
             causes subpixel font-rendering jitter in the grid.             */}
        <div className="md:hidden grid grid-cols-2 gap-1.5 px-3 py-2.5" aria-label="Health topics">
          {siteNav.map((category, index) => {
            const isActive  = tappedCategoryId === category.id;
            const anchor    = category.anchor
              ?? category.subcategories?.find(s => !s.dummy)?.anchor;
            const firstSub  = category.subcategories.find(s => !s.dummy);
            const isLastOdd = index === siteNav.length - 1 && siteNav.length % 2 !== 0;

            function handleMobileTap() {
              if (!anchor) return;
              setTappedCategoryId(category.id);
              if (!isNeighborhoodPage) {
                router.push(`/neighborhood/${DEFAULT_NEIGHBORHOOD_ID}${anchor}`);
                return;
              }
              scrollUtil(anchor);
              if (firstSub) {
                setActiveId(firstSub.id);
                window.dispatchEvent(
                  new CustomEvent('chp:section-activated', { detail: { id: firstSub.id } })
                );
              }
            }

            return (
              <button
                key={category.id}
                ref={el => { categoryBtnRefs.current[index] = el; }}
                aria-current={isActive ? 'location' : undefined}
                onClick={handleMobileTap}
                className={[
                  'rounded-lg px-3 py-2 text-xs font-medium text-center leading-snug min-h-[2.5rem]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                  isLastOdd ? 'col-span-2' : '',
                  anchor ? 'cursor-pointer' : 'cursor-default',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600',
                ].join(' ')}
              >
                {category.label}
              </button>
            );
          })}
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
                      ? 'border-blue-600 text-blue-700'
                      : isOpen
                      ? 'border-gray-300 text-gray-900'
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
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : sub.dummy
                      ? 'text-gray-500 cursor-default'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer',
                  ].join(' ')}
                >
                  <span>{sub.label}</span>

                  {sub.dummy && (
                    <span className="text-xs text-gray-600 font-normal tracking-wide ml-3 shrink-0">
                      coming soon
                    </span>
                  )}

                  {isSubActive && !sub.dummy && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-3 shrink-0" aria-hidden="true" />
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
