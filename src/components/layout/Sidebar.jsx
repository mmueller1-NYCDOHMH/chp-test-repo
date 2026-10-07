'use client';

/**
 * FILE: Sidebar.jsx
 *
 * PURPOSE:
 * Persistent sidebar for navigation and global controls.
 *
 * DESCRIPTION:
 * Contains two modes, toggled by a tab strip at the top:
 *
 * "Neighborhood" mode (default):
 *   1. Neighborhood selector — search + navigate to a community district
 *   2. Active geography context card — name, borough, CD number of selected CD
 *   3. Interactive map — Leaflet map of all 59 CDs with selected CD highlighted
 *   4. District snapshot — hover tooltip showing key indicator values
 *
 * "Find indicator" mode:
 *   - Live-filter search over all registered indicators
 *   - Results grouped by subcategory, clicking scrolls to that section
 *
 * MOBILE:
 * On small screens the desktop aside is hidden. The map-pin button in
 * TopicNav opens a bottom sheet (via the chp:open-mobile-sheet event)
 * containing search and tooltip (no Leaflet map —
 * Strict Mode double-invoke would crash a second NeighborhoodMap instance,
 * and map-based selection is available via the IntroModal).
 *
 * The mobile sheet's drag handle supports:
 *   - Slow downward drag  → sheet follows the finger and stays wherever it
 *                           was released.
 *   - Fast downward swipe → sheet flies down and disappears.
 *   - Tap                 → sheet disappears.
 *   - Upward drag/swipe   → sheet eases up to near-full height, stopping
 *                           SAFE_AREA_GAP below the device's safe area
 *                           (notch / status bar).
 *   - Back button / native back-gesture → sheet flies down quickly and
 *                           disappears (a history entry is pushed on open
 *                           so back-navigation closes the sheet instead of
 *                           leaving the page).
 *
 * NOTES:
 * - Client component (uses interactivity + routing)
 * - NeighborhoodMap is dynamic-imported (ssr:false) to avoid Leaflet SSR crash
 * - As of 2026-09-04, the explorer-badge gamification logic, the mobile
 *   bottom-sheet state/gestures, and the tab/URL/keyboard-shortcut logic
 *   live in dedicated hooks under ./sidebar/ — this file owns layout, the
 *   tab strip contents, and the JSX tree.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { setPendingNeighborhood } from '@/lib/utils/pendingNeighborhood';
import Link from 'next/link';
import UnifiedSearch from '@/components/controls/UnifiedSearch';
import MapHoverTooltip from '@/components/core/MapHoverTooltip';
import IndicatorSearch from '@/components/controls/IndicatorSearch';
import ShortcutsToast         from '@/components/layout/ShortcutsToast';
import ComparisonNeighborhoodSelector from '@/components/controls/ComparisonNeighborhoodSelector';
import { useExplorerBadge } from './sidebar/useExplorerBadge';
import { useMobileSheet } from './sidebar/useMobileSheet';
import { useSidebarTabs } from './sidebar/useSidebarTabs';
import { handleTablistKeyDown } from '@/lib/utils/tablistKeyDown';

const NeighborhoodMap = dynamic(
  () => import('@/components/maps/NeighborhoodMap'),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" />,
  }
);

const TABS = [
  {
    id: 'neighborhood',
    label: 'Neighborhood',
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Indicator',
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
];

export default function Sidebar({ sections, neighborhoods, indicatorSummaries, pageNav }) {
  const router = useRouter();

  const handleNeighborhoodSelect = useCallback((fid) => {
    setPendingNeighborhood(fid);
    router.push(`/neighborhood/${fid}`);
  }, [router]);

  const params       = useParams();
  const pathname     = usePathname();
  const activeId     = params?.id ? String(params.id) : null;
  const isAboutPage  = pathname === '/about';
  const neighborhood = activeId
    ? neighborhoods.find(n => String(n.id) === activeId)
    : null;

  // ── Neighborhood explorer badge ───────────────────────────────────────────
  const { exploredCount, trophyEarned, showAchievement, handleExplorerBadgeClick } = useExplorerBadge(activeId);

  // ── Tabs, URL sync, keyboard shortcuts, TopicNav sync ────────────────────
  const { activeTab, setActiveTab, categoryFilter, setCategoryFilter, panelRefs, focusPanelOnNextChange } = useSidebarTabs();

  // ── Mobile bottom sheet ───────────────────────────────────────────────────
  const {
    sheetRef,
    isSheetOpen,
    isSheetMounted,
    isDragging,
    transitionMs,
    currentTop,
    getOpenTop,
    getMaxTop,
    safeAreaProbeRef,
    closeSheet,
    handleHandlePointerDown,
    handleHandlePointerMove,
    handleHandlePointerEnd,
  } = useMobileSheet();

  // ── Mobile sheet: "what next?" prompt after picking a neighborhood ────────
  // (2026-10-07) The sheet stays open after a selection. Rather than guessing,
  // offer the choice: close and read the profile, or stay in the sheet for the
  // at-a-glance snapshot / indicator search. Keyed off the committed route id
  // (not the optimistic pending id) so "View profile" always closes onto the
  // page that has actually loaded.
  const [pickedId, setPickedId] = useState(null);
  const prevActiveIdRef   = useRef(activeId);
  const viewProfileBtnRef = useRef(null);
  const sheetSnapshotRef  = useRef(null);

  useEffect(() => {
    if (prevActiveIdRef.current === activeId) return;
    prevActiveIdRef.current = activeId;
    if (isSheetOpen && activeId) setPickedId(activeId);
  }, [activeId, isSheetOpen]);

  // Prompt never outlives the sheet.
  useEffect(() => {
    if (!isSheetOpen) setPickedId(null);
  }, [isSheetOpen]);

  // A11Y: move focus to the primary action when the prompt appears.
  useEffect(() => {
    if (pickedId) viewProfileBtnRef.current?.focus({ preventScroll: true });
  }, [pickedId]);

  const showPickedPrompt = !!pickedId && pickedId === activeId && !!neighborhood;

  // ── Shared tab strip JSX — rendered in both desktop and mobile sheet ───────
  // NOTE: This is a plain function (not a React component) so it shares
  // Sidebar's fiber. Avoids adding a new component layer that would cause
  // React Strict Mode to double-invoke NeighborhoodMap's Leaflet effects.
  function renderTabs(instance) {
    return (
      <div
        role="tablist"
        aria-label="Sidebar views"
        className="flex border-b border-gray-200 shrink-0"
        // A11Y (2026-09-26): arrow keys / Home / End between tabs (ARIA tabs
        // pattern). Focus stays on the tab — focusPanelOnNextChange is only
        // set for mouse/Enter clicks below.
        onKeyDown={(e) => handleTablistKeyDown(e, TABS.map(t => t.id), activeTab, setActiveTab)}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            aria-controls={`sidebar-panel-${tab.id}`}
            id={`sidebar-tab-${tab.id}`}
            onClick={() => {
              focusPanelOnNextChange.current = instance;
              setActiveTab(tab.id);
            }}
            className={[
              'flex-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 inline-flex items-center justify-center gap-1.5',
              activeTab === tab.id
                ? 'bg-brand-tint border-b-2 border-brand text-brand'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-b-2 border-transparent',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  // ── Explorer badge — shared ───────────────────────────────────────────────
  function renderExplorerBadge() {
    if (!exploredCount && !trophyEarned) return null;

    // ── Trophy state: all 59 visited ─────────────────────────────────────
    if (trophyEarned) {
      return (
        <button
          onClick={handleExplorerBadgeClick}
          aria-label="You've explored all 59 neighborhoods!"
          className="sticky bottom-0 z-10 w-full bg-white border-t border-gray-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
        >
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 group-hover:text-amber-800 transition-colors">
              {/* Trophy cup SVG */}
              <svg className="w-3.5 h-3.5 shrink-0 text-amber-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.25 3v2.25H6.75A2.25 2.25 0 0 0 4.5 7.5v.75A4.5 4.5 0 0 0 8.534 12.6 6.01 6.01 0 0 0 11.25 14.9V18H9a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-2.25v-3.1a6.01 6.01 0 0 0 2.716-2.3A4.5 4.5 0 0 0 19.5 8.25V7.5a2.25 2.25 0 0 0-2.25-2.25H12.75V3h-1.5ZM6 7.5v.75a3 3 0 0 0 2.716 2.992A6.03 6.03 0 0 1 6 7.5Zm10.284 3.242A3 3 0 0 0 18 8.25V7.5a.75.75 0 0 0-.75-.75h-4.5a6.03 6.03 0 0 1-.716 3.992 3 3 0 0 0 4.25 0Z" />
              </svg>
              All 59 explored!
            </span>
            <span className="text-xs font-semibold text-amber-700 tabular-nums">59 / 59</span>
          </div>
          {/* Full gold progress bar */}
          <div className="relative h-[4px] w-full bg-amber-100 mb-1">
            <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-amber-400 to-yellow-300" />
          </div>
        </button>
      );
    }

    // ── Normal in-progress state ──────────────────────────────────────────
    return (
      <button
        onClick={handleExplorerBadgeClick}
        aria-label={`Explored ${exploredCount} of 59 neighborhoods. Click to see unvisited.`}
        className="sticky bottom-0 z-10 w-full bg-white border-t border-gray-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="text-xs font-medium text-gray-600 group-hover:text-brand transition-colors">
            {showAchievement ? 'All of NYC explored' : 'Neighborhoods explored'}
          </span>
          <span className="text-xs font-semibold text-brand tabular-nums">
            {exploredCount} <span className="font-normal text-gray-600">/ 59</span>
          </span>
        </div>
        <div className="relative h-[4px] w-full bg-gray-100 mb-1">
          <div
            className="absolute left-0 top-0 h-full bg-brand transition-[width] duration-500 ease-out"
            style={{ width: `${(exploredCount / 59) * 100}%` }}
          />
        </div>
      </button>
    );
  }

  // ── Footer — shared ───────────────────────────────────────────────────────
  // About this tool and keyboard shortcuts now live in HeaderHelpMenu (the "?"
  // in the site header), so this footer only has a job on the /about page —
  // a way back to browsing. On every other page it renders nothing.
  function renderFooter() {
    if (!isAboutPage) return null;

    return (
      <div className="shrink-0 border-b border-gray-200 bg-gray-50 relative">
        <div className="px-5 py-2 flex items-center justify-between relative">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Browse neighborhoods
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Invisible probe used to measure the safe-area inset (notch) in px */}
      <div
        ref={safeAreaProbeRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 0,
          height: 'env(safe-area-inset-top, 0px)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Desktop aside (hidden on mobile) ─────────────────────────────── */}
      <aside className="hidden md:flex w-[360px] shrink-0 h-screen sticky top-0 border-r bg-white flex-col">
        {/*
          overflow-y-auto is intentionally on the inner panel div below, NOT here.
          Setting it on the aside forces overflow-x:auto too (CSS spec), which clips
          absolutely-positioned children like the keyboard shortcuts popover.
        */}

        {renderTabs('desktop')}
        {renderFooter()}

        {/* ── Scrollable panel area — overflow lives here, not on the aside ── */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">

          {/* ── Neighborhood mode ──────────────────────────────────────── */}
          {activeTab === 'neighborhood' && (
            <div
              ref={(el) => { panelRefs.current['desktop-neighborhood'] = el; }}
              role="tabpanel"
              id="sidebar-panel-neighborhood"
              aria-labelledby="sidebar-tab-neighborhood"
              tabIndex={-1}
              className="flex flex-col flex-1 min-h-0 focus:outline-none"
            >
              {/* Search — scrolls away as user scrolls down */}
              <div className="px-6 pt-4 pb-3 shrink-0">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Find neighborhood
                </p>
                <UnifiedSearch neighborhoods={neighborhoods} />
              </div>

              {/* Compare to — also rendered in the mobile bottom sheet below;
                  comparison is supported at every width now (StatTileSplit,
                  ComparisonPyramidChart, and StickyContextBar's mobile
                  "Comparing: X" pill all have working mobile layouts). */}
              {neighborhood && (
                <div className="px-6 pb-3 shrink-0">
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    Compare to
                  </p>
                  <ComparisonNeighborhoodSelector neighborhoods={neighborhoods} />
                </div>
              )}

              {/* Map — sticky within the scroll container so it stays visible
                  as the user scrolls through the info below it */}
              <div className="sticky top-0 z-10 w-full h-[300px] shrink-0 overflow-hidden bg-white">
                <NeighborhoodMap onSelect={handleNeighborhoodSelect} />
              </div>

              {/* Info — scrolls beneath the sticky map */}
              <div className="px-6 pt-3 pb-4">
                <MapHoverTooltip
                  indicatorSummaries={indicatorSummaries}
                  selectedNeighborhood={neighborhood
                    ? {
                        name:     neighborhood.name,
                        geoId:    neighborhood.geoId,
                        borough:  neighborhood.borough,
                        cdNumber: neighborhood.cdNumber,
                      }
                    : null
                  }
                />
              </div>

              <div className="border-t border-gray-100 mx-6" />

              {/* Page-level anchor nav — used on static pages like /about
                  in place of the section nav that appears on neighborhood profiles */}
              {pageNav?.length > 0 && (
                <nav aria-label="On this page" className="px-6 pt-4 pb-2">
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    On this page
                  </p>
                  {pageNav.map(({ href, label }) => (
                    <a
                      key={href}
                      href={href}
                      className="block text-sm text-gray-600 hover:text-blue-600 py-1.5 rounded transition-colors"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
              )}
            </div>
          )}

          {/* ── Find indicator mode ────────────────────────────────────── */}
          {activeTab === 'search' && (
            <div
              ref={(el) => { panelRefs.current['desktop-search'] = el; }}
              role="tabpanel"
              id="sidebar-panel-search"
              aria-labelledby="sidebar-tab-search"
              tabIndex={-1}
              className="flex flex-col flex-1 min-h-0 focus:outline-none"
            >
              <IndicatorSearch
                onNavigate={() => setActiveTab('neighborhood')}
                categoryFilter={categoryFilter}
                onClearFilter={() => setCategoryFilter(null)}
                activeNeighborhood={neighborhood ?? null}
              />
            </div>
          )}

        </div>{/* end scrollable panel area */}

        {/* ── Shortcuts toast — first-visit hint, absolute-positioned above the explorer badge ── */}
        <ShortcutsToast />

        {/* ── Neighborhoods explored — sticky at the bottom, always visible regardless of scroll ── */}
        {renderExplorerBadge()}
      </aside>

      {/* ── Mobile: bottom sheet ──────────────────────────────────────────── */}
      {/* Note: NeighborhoodMap is intentionally excluded here. A second Leaflet
          instance in a React Strict Mode double-invoke cycle causes an
          _initContainer crash. Map-based selection is available via IntroModal. */}
      {isSheetMounted && (
        <div className="md:hidden fixed inset-0 z-50">

          {/* Backdrop — opacity tracks how far open the sheet currently is */}
          <div
            className="absolute inset-0 bg-black"
            style={{
              opacity: 0.5 * Math.max(0, Math.min(
                1,
                1 - (currentTop() - getOpenTop()) / (getMaxTop() - getOpenTop())
              )),
              transition: isDragging ? 'none' : `opacity ${transitionMs}ms ease-out`,
            }}
            onClick={() => closeSheet()}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            ref={sheetRef} /* A11Y: focus trap + return (useMobileSheet) */
            role="dialog"
            aria-modal="true"
            aria-label="Neighborhood panel"
            className="absolute left-0 right-0 bg-white rounded-t-2xl flex flex-col overflow-hidden"
            style={{
              top: `${currentTop()}px`,
              height: `${Math.max(0, getMaxTop() - currentTop())}px`,
              transition: isDragging
                ? 'none'
                : `top ${transitionMs}ms ease-out, height ${transitionMs}ms ease-out`,
            }}
          >
            {/* Drag handle + close row */}
            <div className="shrink-0 flex items-center justify-center px-4 pt-3 pb-1 relative">
              <div
                onPointerDown={handleHandlePointerDown}
                onPointerMove={handleHandlePointerMove}
                onPointerUp={handleHandlePointerEnd}
                onPointerCancel={handleHandlePointerEnd}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    closeSheet({ fast: true });
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Drag to resize, tap to close"
                // A11Y (2026-09-28, WCAG 2.5.8 target size): the handle itself
                // was the 32×4px bar. Now a 48×24px hit area with the same
                // bar drawn inside it.
                className="w-12 h-6 flex items-center justify-center rounded-full touch-none cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span aria-hidden="true" className="block w-8 h-1 rounded-full bg-gray-300" />
              </div>
              <button
                data-sheet-autofocus /* A11Y: focus lands here when the sheet opens */
                onClick={() => closeSheet()}
                aria-label="Close panel"
                className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 border border-transparent hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {renderTabs('sheet')}
            {renderFooter()}

            {/* Scrollable content — no Leaflet map */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">

              {activeTab === 'neighborhood' && (
                <div
                  ref={(el) => { panelRefs.current['sheet-neighborhood'] = el; }}
                  role="tabpanel"
                  id="sidebar-panel-neighborhood"
                  aria-labelledby="sidebar-tab-neighborhood"
                  tabIndex={-1}
                  className="flex flex-col flex-1 min-h-0 focus:outline-none"
                >
                  <div className="px-6 pt-4 pb-3 shrink-0">
                    <p className="text-sm font-semibold text-gray-600 mb-2">
                      Find neighborhood
                    </p>
                    <UnifiedSearch neighborhoods={neighborhoods} />

                    {/* Post-selection choice — close the picker or keep it
                        open (see the pickedId note above). */}
                    {showPickedPrompt && (
                      <div
                        role="status"
                        className="mt-3 rounded-lg border border-brand bg-brand-tint p-3"
                      >
                        <p className="text-sm text-gray-900">
                          Now showing <span className="font-semibold">{neighborhood.name}</span>
                        </p>
                        <button
                          ref={viewProfileBtnRef}
                          type="button"
                          onClick={() => closeSheet()}
                          className="mt-2 w-full min-h-[44px] rounded-md bg-brand px-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                        >
                          Close and view profile
                        </button>
                        <p className="mt-3 text-xs text-gray-600">Or keep this open:</p>
                        <div className="mt-1.5 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPickedId(null);
                              requestAnimationFrame(() =>
                                sheetSnapshotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              );
                            }}
                            className="flex-1 min-h-[44px] rounded-md border border-gray-300 bg-white px-2 text-sm font-medium text-gray-800 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            At a glance
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPickedId(null);
                              focusPanelOnNextChange.current = 'sheet';
                              setActiveTab('search');
                            }}
                            className="flex-1 min-h-[44px] rounded-md border border-gray-300 bg-white px-2 text-sm font-medium text-gray-800 hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            Search by indicator
                          </button>
                        </div>
                      </div>
                    )}

                    {/* "Prefer a map? Browse all neighborhoods" link removed
                        (2026-10-07) — map-based neighborhood search isn't
                        offered on mobile, so the sheet shouldn't point to it. */}
                  </div>

                  {/* Compare to — mirrors the desktop aside's section above.
                      No map here (see file-level NOTES on why NeighborhoodMap
                      is excluded from the mobile sheet), so this text search
                      is the only way to pick a comparison neighborhood on
                      mobile — not just a secondary option like on desktop. */}
                  {neighborhood && (
                    <div className="px-6 pb-3 shrink-0">
                      <p className="text-sm font-semibold text-gray-600 mb-2">
                        Compare to
                      </p>
                      <ComparisonNeighborhoodSelector neighborhoods={neighborhoods} />
                    </div>
                  )}

                  <div ref={sheetSnapshotRef} className="px-6 pt-2 pb-4">
                    <MapHoverTooltip
                      indicatorSummaries={indicatorSummaries}
                      selectedNeighborhood={neighborhood
                        ? {
                            name:     neighborhood.name,
                            geoId:    neighborhood.geoId,
                            borough:  neighborhood.borough,
                            cdNumber: neighborhood.cdNumber,
                          }
                        : null
                      }
                    />
                  </div>
                </div>
              )}

              {activeTab === 'search' && (
                <div
                  ref={(el) => { panelRefs.current['sheet-search'] = el; }}
                  role="tabpanel"
                  id="sidebar-panel-search"
                  aria-labelledby="sidebar-tab-search"
                  tabIndex={-1}
                  className="flex flex-col flex-1 min-h-0 focus:outline-none"
                >
                  <IndicatorSearch
                    onNavigate={() => { setActiveTab('neighborhood'); closeSheet(); }}
                    categoryFilter={categoryFilter}
                    onClearFilter={() => setCategoryFilter(null)}
                    activeNeighborhood={neighborhood ?? null}
                    autoFocus={false}
                  />
                </div>
              )}

            </div>

            {/* Neighborhoods explored — sticky at the bottom, always visible regardless of scroll */}
            {renderExplorerBadge()}
          </div>
        </div>
      )}
    </>
  );
}
