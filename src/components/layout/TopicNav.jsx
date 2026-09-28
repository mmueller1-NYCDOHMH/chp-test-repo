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
 * history.replaceState. (Lives in ./topicNav/useScrollSpy.js.)
 *
 * MOBILE ENTRY-POINT BAR (mobile-ux-review.md spotlight fix):
 * The mobile row used to lead with a single icon-only "Map view" pin that
 * opened Sidebar's bottom sheet — visually near-identical to a second
 * icon-only pin in StickyContextBar that opened a completely different UI
 * (the full IntroModal map picker). Flagged as the single highest-severity
 * mobile finding across the UX review. Both icons are now replaced by one
 * labeled pill row: a "change neighborhood" pill showing the current
 * neighborhood's name, and a "Compare" pill (empty or active) — both open
 * the same bottom sheet, which already contains neighborhood search AND
 * the comparison selector. StickyContextBar's icon and mobile comparison
 * pill were removed as redundant (see StickyContextBar.jsx).
 *
 * PROPS:
 *   neighborhoods — array of { id, name, borough, geoId, cdNumber }, used
 *                   only to resolve the current neighborhood's display name
 *                   for the mobile pill (mirrors UnifiedSearch's lookup)
 *
 * NOTES:
 * - As of 2026-09-04, scroll-spy, the desktop dropdown, and mobile
 *   viewport/tab-scroll tracking live in dedicated hooks under
 *   ./topicNav/ — this file owns layout and the JSX tree.
 */
import { useEffect, useCallback } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { siteNav }           from '@/config/nav/siteNav';
import { scrollToSection as scrollUtil } from '@/lib/utils/scrollToSection';
import { DEFAULT_NEIGHBORHOOD_ID } from '@/lib/utils/constants';
import { TOPICNAV_SEPARATOR } from '@/lib/charts/chartColors';
import { useMobileCategory } from '@/lib/context/MobileCategoryContext';
import { useComparison } from '@/lib/context/ComparisonContext';
import { useScrollSpy } from './topicNav/useScrollSpy';
import { useDropdown } from './topicNav/useDropdown';
import { useMobileTabTracking } from './topicNav/useMobileTabTracking';

export default function TopicNav({ neighborhoods = [] }) {
  // EXPERIMENTAL (mobile pseudo-pages) — see MobileCategoryContext.jsx.
  // setPagedCategoryId is only used inside handleMobileTap below; on
  // desktop nothing reads pagedCategoryId so this has no effect.
  const { setPagedCategoryId } = useMobileCategory();

  // ── Mobile entry-point pills (neighborhood + compare) ────────────────────
  // Same lookup UnifiedSearch uses: match the [id] route param against the
  // neighborhoods list to get a display name for the "change neighborhood"
  // pill. Falls back to a generic label when no neighborhood is selected
  // (e.g. on /about) — the pill still opens the bottom sheet either way.
  const params            = useParams();
  const activeGeoId       = params?.id ? String(params.id) : null;
  const selectedNeighborhood = activeGeoId
    ? neighborhoods.find(n => String(n.id) === activeGeoId)
    : null;
  const { comparisonNeighborhood, setComparisonNeighborhood } = useComparison();

  const openMobileSheet = useCallback(() => {
    window.dispatchEvent(new CustomEvent('chp:open-mobile-sheet'));
  }, []);

  // ── Scroll-spy ────────────────────────────────────────────────────────────
  const { activeId, navigateToSection } = useScrollSpy();

  // A subcategory section intersecting the viewport maps back to its parent
  // category (normal scroll-spy case). Right after a category-label click,
  // though, activeId is briefly the category's OWN header id (`cat-${id}`,
  // set by scrollToSection below) since the click lands on the header
  // itself, before the user has scrolled into any subcategory section — so
  // that id needs to resolve back to its category too, or the tab it was
  // just clicked from goes unhighlighted until the user scrolls further.
  const activeCategoryId = siteNav.find(cat =>
    cat.subcategories.some(sub => sub.id === activeId) || activeId === `cat-${cat.id}`
  )?.id ?? null;

  // ── Mobile viewport + tab-scroll tracking ─────────────────────────────────
  const { isMobile, stuckSide, mobileTabRowRef, mobileCategoryBtnRefs } = useMobileTabTracking(activeCategoryId);

  // ── Desktop dropdown ──────────────────────────────────────────────────────
  const {
    openCategoryId,
    setOpenCategoryId,
    dropdownPos,
    focusedSubIdx,
    categoryBtnRefs,
    dropdownItemRefs,
    openCategory,
    handleMouseEnter,
    handleMouseLeave,
    keepOpen,
    handleCategoryKeyDown,
    handleDropdownKeyDown,
  } = useDropdown(isMobile);

  // Close the dropdown when switching into mobile view — mirrors the
  // original matchMedia 'change' handler's side effect. (openCategoryId
  // already starts null, so this is a no-op on first mount either way.)
  useEffect(() => {
    if (isMobile) setOpenCategoryId(null);
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  const pathname = usePathname();
  const router   = useRouter();
  const isNeighborhoodPage = pathname?.startsWith('/neighborhood/');

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
    scrollUtil(anchor, { focus: true }); // A11Y: move focus to the section heading
    const id = String(anchor).replace(/^#/, '');
    navigateToSection(id);
    setOpenCategoryId(null);
    // Notify SectionNav of the intended destination so it highlights
    // immediately without waiting for IntersectionObserver to settle.
    window.dispatchEvent(new CustomEvent('chp:section-activated', { detail: { id } }));
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <nav
        id="topic-nav"
        aria-label="Topic navigation"
        className="sticky top-0 z-40 w-full min-w-0 bg-white border-b border-gray-200 shadow-sm"
      >
        {/* ── Mobile: entry-point pills + horizontally scrolling topic tabs ───
             Two stacked rows. Row 1 replaces what used to be a single
             icon-only "Map view" pin (see MOBILE ENTRY-POINT BAR note above)
             with two labeled pills. Row 2 is the existing topic tab strip,
             unchanged apart from no longer sharing its row with the pin.
             Active tab state is driven by activeCategoryId (derived from
             scroll-spy's activeId), same source as desktop, so the
             highlighted tab tracks scroll position. The active tab is also
             auto-scrolled into view within this row as it changes — see
             useMobileTabTracking.                                        */}
        <div className="md:hidden flex flex-col min-w-0">

          {/* Row 1 — neighborhood + compare pills */}
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 min-w-0">
            {/* Neighborhood pill — always visible, self-labeled (no more
                bare icon). Opens Sidebar's mobile bottom sheet via a global
                event so this component doesn't need a direct reference to
                Sidebar's state. Sheet already contains neighborhood search
                AND the comparison selector. */}
            <button
              type="button"
              onClick={openMobileSheet}
              aria-label={
                selectedNeighborhood
                  ? `Viewing ${selectedNeighborhood.name}. Tap to change neighborhood.`
                  : 'Choose a neighborhood'
              }
              className="flex-1 min-w-0 flex items-center gap-1.5 bg-brand-tint border border-brand rounded-full pl-2.5 pr-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg className="w-3.5 h-3.5 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span className="flex-1 min-w-0 text-xs font-medium text-brand truncate">
                {selectedNeighborhood ? selectedNeighborhood.name : 'Choose a neighborhood'}
              </span>
              <svg className="w-3 h-3 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Compare pill — empty state invites starting a comparison;
                active state mirrors the amber treatment used everywhere else
                comparison shows up (insight text, distribution strip,
                choropleth). Both states open the same bottom sheet, which
                already renders ComparisonNeighborhoodSelector. The clear (×)
                button stops propagation so clearing doesn't also reopen the
                sheet. */}
            {comparisonNeighborhood ? (
              <span className="shrink-0 flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full pl-2 pr-1 py-1.5 max-w-[42%]">
                <button
                  type="button"
                  onClick={openMobileSheet}
                  aria-label={`Comparing to ${comparisonNeighborhood.name}. Tap to change.`}
                  className="flex items-center gap-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-medium text-amber-800 truncate">
                    {comparisonNeighborhood.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setComparisonNeighborhood(null); }}
                  aria-label={`Remove comparison with ${comparisonNeighborhood.name}`}
                  className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={openMobileSheet}
                aria-label="Compare with another neighborhood"
                className="shrink-0 flex items-center gap-1 bg-white border border-dashed border-gray-300 text-gray-600 rounded-full px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-xs font-medium">Compare</span>
              </button>
            )}
          </div>

          {/* Row 2 — topic tabs, single row, horizontal finger-scroll.
              `relative` matters here, not just visually: without a
              positioned ancestor between the buttons and the sticky <nav>,
              a button's offsetLeft/offsetParent resolves all the way up to
              <nav> (itself `sticky`, i.e. positioned) instead of this row —
              throwing off the stuck-side math below, which assumes
              offsetLeft is relative to the row's own scrollable content. */}
          <div className="flex items-center px-3 pb-2.5 min-w-0" aria-label="Health topics">
          <div
            ref={mobileTabRowRef}
            className="relative flex-1 min-w-0 flex gap-2 overflow-x-auto scrollbar-none overscroll-x-contain [-webkit-overflow-scrolling:touch] snap-x snap-mandatory"
          >
            {siteNav.map((category, index) => {
              const isActive  = activeCategoryId === category.id;
              const firstSub  = category.subcategories.find(s => !s.dummy);
              // Prefer the first real subcategory's anchor here (unlike the
              // desktop click handler below, which targets category.anchor
              // directly). category.anchor (e.g. "#cat-social") DOES have a
              // matching DOM id — buildCategorySection in
              // neighborhoodProfile.js renders it — but on mobile the actual
              // scroll destination for an on-page tap is decided by
              // MobileCategoryContext (always the category header, via
              // setPagedCategoryId below), not by this anchor value; this
              // one only matters for (a) the off-profile-page redirect a few
              // lines down and (b) gating the tap when nothing real exists
              // yet. Falls back to category.anchor only when every
              // subcategory is a `dummy` placeholder.
              const anchor    = firstSub?.anchor ?? category.anchor;

              function handleMobileTap() {
                if (!anchor) return;
                if (!isNeighborhoodPage) {
                  router.push(`/neighborhood/${DEFAULT_NEIGHBORHOOD_ID}${anchor}`);
                  return;
                }
                // EXPERIMENTAL (mobile pseudo-pages): switch which category's
                // sections are visible instead of scrolling to them within one
                // long page. MobileCategoryContext.jsx owns the resulting
                // scroll — it jumps to this category's header, not the very
                // top of the page. See that file for what this is and how to
                // revert (restore the scrollUtil(anchor) call this replaced).
                setPagedCategoryId(category.id);
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
                    // transform-gpu (+ backface-visibility) forces this sticky
                    // element onto its own GPU compositing layer. Without it,
                    // iOS Safari has a known bug where a `position: sticky`
                    // element inside a horizontally scrolling container,
                    // combined with a background-color transition, can paint
                    // with no background at all — the tab renders fully
                    // white — until something else forces a repaint. Chrome's
                    // device-emulation mode still runs desktop Chrome's
                    // engine underneath, so it never reproduces this; only
                    // real WebKit/Safari does, which matches "only on my
                    // phone, not the emulator." Explicit transition-property
                    // list (not transition-all) is part of the same fix —
                    // transitioning `position` itself was never intended.
                    'transform-gpu [-webkit-backface-visibility:hidden] [backface-visibility:hidden]',
                    'transition-[background-color,color,transform,padding,box-shadow,border-radius] duration-200 ease-out',
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
                    // No scale-[1.03] pop here (removed) — a transform on a
                    // child of this row's overflow-x-auto container is a
                    // known WebKit risk: Safari can miscalculate the row's
                    // scrollWidth to include the scaled-up visual bounds,
                    // adding phantom scrollable slack. Not worth it for a
                    // purely decorative pop, especially chasing a live
                    // report of the page panning horizontally on a real
                    // phone (not reproducible in desktop emulation).
                    isActive && stuckSide === 'left'
                      ? 'sticky left-0 right-0 z-10 px-2.5 bg-brand text-white rounded-l-none rounded-r-full'
                      : isActive && stuckSide === 'right'
                      ? 'sticky left-0 right-0 z-10 px-2.5 bg-brand text-white rounded-r-none rounded-l-full'
                      : isActive
                      ? 'sticky left-0 right-0 z-10 px-3.5 bg-brand text-white shadow-md shadow-brand/20 rounded-full'
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
        </div>

        {/* ── Desktop: horizontal scrolling nav ───────────────────────────── */}
        <ul
          className="hidden md:flex items-stretch px-4 overflow-x-auto scrollbar-none"
          aria-label="Health topics"
        >
          {siteNav.map((category, index) => {
            const isOpen   = openCategoryId === category.id;
            const isActive = activeCategoryId === category.id;
            // Clicking the category label scrolls to that category's OWN
            // header — e.g. "#cat-health-care", rendered by
            // buildCategorySection in neighborhoodProfile.js — i.e. the top
            // of the category, not its first subcategory's chart section.
            // Dropdown subcategory items (below) still scroll to their own
            // real section anchors.
            const clickAnchor = category.anchor;

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
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? `topic-dropdown-${category.id}` : undefined}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => { if (clickAnchor) scrollToSection(clickAnchor); }}
                  onKeyDown={e => handleCategoryKeyDown(e, category, categoryBtnRefs.current[index])}
                  className={[
                    'flex items-center px-3 py-2.5 text-sm font-medium whitespace-nowrap',
                    'transition-colors border-b-2 flex-1',
                    clickAnchor ? 'cursor-pointer' : 'cursor-default',
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

      {/* ── Dropdown — rendered as fixed so it escapes any overflow context ──
          A11Y (2026-09-28): disclosure-navigation pattern instead of an ARIA
          menu. It was <ul role="menu"> with <li> children and role="menuitem"
          buttons, which is invalid ARIA (axe: aria-required-children,
          aria-required-parent, listitem — all critical) and the wrong
          pattern for site navigation. Now: the category button toggles
          aria-expanded + aria-controls, and this is a plain list of buttons
          inside its own labelled <nav> (it's rendered outside the TopicNav
          <nav>, so without this it sat outside any landmark — axe region).
          Arrow-key handling from useDropdown still works as a convenience. */}
      {!isMobile && openCategory && (
        <nav
          aria-label={`${openCategory.label} sections`}
          id={`topic-dropdown-${openCategory.id}`}
          onMouseEnter={keepOpen}
          onMouseLeave={handleMouseLeave}
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
          className="fixed z-50 min-w-[200px] bg-white border border-gray-200 rounded-md shadow-lg"
        >
        <ul className="py-1.5">
          {openCategory.subcategories.map((sub, subIdx) => {
            const isSubActive = activeId === sub.id;

            return (
              <li key={sub.id}>
                <button
                  ref={el => { dropdownItemRefs.current[subIdx] = el; }}
                  disabled={sub.dummy}
                  onClick={() => { if (!sub.dummy) scrollToSection(sub.anchor); }}
                  onKeyDown={e => handleDropdownKeyDown(e, subIdx)}
                  aria-current={isSubActive ? 'location' : undefined}
                  className={[
                    'w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors',
                    isSubActive
                      ? 'bg-brand-tint text-brand font-medium'
                      : sub.dummy
                      ? 'text-gray-600 cursor-default'
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
        </nav>
      )}
    </>
  );
}
