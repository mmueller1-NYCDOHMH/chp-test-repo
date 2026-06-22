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
 * On small screens the desktop aside is hidden. A fixed FAB (bottom-right)
 * opens a bottom sheet containing search and tooltip (no Leaflet map —
 * Strict Mode double-invoke would crash a second NeighborhoodMap instance,
 * and map-based selection is available via the IntroModal).
 *
 * NOTES:
 * - Client component (uses interactivity + routing)
 * - NeighborhoodMap is dynamic-imported (ssr:false) to avoid Leaflet SSR crash
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import UnifiedSearch from '@/components/controls/UnifiedSearch';
import MapHoverTooltip from '@/components/core/MapHoverTooltip';
import IndicatorSearch from '@/components/controls/IndicatorSearch';
import KeyboardShortcutsButton from '@/components/layout/KeyboardShortcutsButton';
import ComparisonNeighborhoodSelector from '@/components/controls/ComparisonNeighborhoodSelector';

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
    label: 'Find indicator',
    icon: (
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
];

const VALID_TABS    = TABS.map(t => t.id);
const DEFAULT_TAB   = 'neighborhood';
const TAB_URL_PARAM = 'tab';

const EXPLORER_KEY = 'chp_visited_cds';

export default function Sidebar({ sections, neighborhoods, indicatorSummaries }) {
  const router = useRouter();

  const handleNeighborhoodSelect = useCallback((fid) => {
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
  const [exploredCount,   setExploredCount]   = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const achievementTimer = useRef(null);

  // Record each visited neighborhood and update count
  useEffect(() => {
    if (!activeId) return;
    try {
      const stored = JSON.parse(localStorage.getItem(EXPLORER_KEY) || '[]');
      const set    = new Set(stored);
      set.add(activeId);
      localStorage.setItem(EXPLORER_KEY, JSON.stringify([...set]));
      setExploredCount(set.size);
    } catch { /* localStorage unavailable */ }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise count from storage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(EXPLORER_KEY) || '[]');
      setExploredCount(stored.length);
    } catch { /* ignore */ }
  }, []);

  // Listen for the all-59 flash achievement from NeighborhoodMap
  useEffect(() => {
    function onAllExplored() {
      setShowAchievement(true);
      clearTimeout(achievementTimer.current);
      achievementTimer.current = setTimeout(() => setShowAchievement(false), 3000);
    }
    window.addEventListener('chp:all-explored', onAllExplored);
    return () => {
      window.removeEventListener('chp:all-explored', onAllExplored);
      clearTimeout(achievementTimer.current);
    };
  }, []);

  function handleExplorerBadgeClick() {
    try {
      const visited = JSON.parse(localStorage.getItem(EXPLORER_KEY) || '[]');
      window.dispatchEvent(new CustomEvent('chp:open-intro-modal', {
        detail: { visitedIds: visited },
      }));
    } catch {
      window.dispatchEvent(new CustomEvent('chp:open-intro-modal'));
    }
  }

  const [activeTab, _setActiveTab] = useState(DEFAULT_TAB);

  // Press `/` anywhere on the page (outside an input) to jump to neighborhood search
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key !== '/') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      setActiveTab('neighborhood');
      // Wait one tick for the tab switch to re-render before focusing the input
      setTimeout(() => {
        document.querySelector('input[aria-label="Search neighborhoods"]')?.focus();
      }, 50);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate tab from URL on mount
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get(TAB_URL_PARAM);
    if (param && VALID_TABS.includes(param)) _setActiveTab(param);
  }, []);

  // Tab setter that also syncs the URL without navigation
  const setActiveTab = useCallback((tab) => {
    _setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === DEFAULT_TAB) {
      url.searchParams.delete(TAB_URL_PARAM);
    } else {
      url.searchParams.set(TAB_URL_PARAM, tab);
    }
    history.replaceState(null, '', url.toString());
  }, []);

  // ── Mobile bottom sheet state ─────────────────────────────────────────────
  // isSheetOpen = user intent; isSheetMounted keeps DOM alive during exit anim.
  const SHEET_DURATION = 300; // ms — keep in sync with transition-duration below
  const [isSheetOpen,    setIsSheetOpen]    = useState(false);
  const [isSheetMounted, setIsSheetMounted] = useState(false);
  const [sheetVisible,   setSheetVisible]   = useState(false);

  function openSheet()  { setIsSheetOpen(true); }
  function closeSheet() { setIsSheetOpen(false); }

  useEffect(() => {
    if (isSheetOpen) {
      setIsSheetMounted(true);
      const raf = requestAnimationFrame(() => setSheetVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setSheetVisible(false);
      const timer = setTimeout(() => setIsSheetMounted(false), SHEET_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isSheetOpen]);

  // Close sheet on Escape
  useEffect(() => {
    if (!isSheetOpen) return;
    function onKey(e) { if (e.key === 'Escape') closeSheet(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSheetOpen]);

  // ── Shared tab strip JSX — rendered in both desktop and mobile sheet ───────
  // NOTE: This is a plain function (not a React component) so it shares
  // Sidebar's fiber. Avoids adding a new component layer that would cause
  // React Strict Mode to double-invoke NeighborhoodMap's Leaflet effects.
  function renderTabs() {
    return (
      <div role="tablist" aria-label="Sidebar views" className="flex border-b border-gray-200 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`sidebar-panel-${tab.id}`}
            id={`sidebar-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 inline-flex items-center justify-center gap-1.5',
              activeTab === tab.id
                ? 'bg-blue-50 border-b-2 border-blue-600 text-blue-700'
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
    if (!exploredCount) return null;
    return (
      <button
        onClick={handleExplorerBadgeClick}
        aria-label={`Explored ${exploredCount} of 59 neighborhoods. Click to see unvisited.`}
        className="shrink-0 w-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="text-xs font-medium text-gray-500 group-hover:text-blue-600 transition-colors">
            {showAchievement ? 'All of NYC explored' : 'Neighborhoods explored'}
          </span>
          <span className="text-xs font-semibold text-blue-600 tabular-nums">
            {exploredCount} <span className="font-normal text-gray-400">/ 59</span>
          </span>
        </div>
        <div className="relative h-[4px] w-full bg-gray-100 mb-1">
          <div
            className="absolute left-0 top-0 h-full bg-blue-500 transition-[width] duration-500 ease-out"
            style={{ width: `${(exploredCount / 59) * 100}%` }}
          />
        </div>
      </button>
    );
  }

  // ── Footer — shared ───────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <div className="shrink-0 border-t border-gray-200 bg-gray-50 relative">
        <div className="px-5 py-3 flex items-center justify-between relative">
          {isAboutPage ? (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Browse neighborhoods
            </Link>
          ) : (
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About this tool
            </Link>
          )}
          <KeyboardShortcutsButton />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop aside (hidden on mobile) ─────────────────────────────── */}
      <aside className="hidden md:flex w-[360px] shrink-0 h-screen sticky top-0 border-r bg-white flex-col">
        {/*
          overflow-y-auto is intentionally on the inner panel div below, NOT here.
          Setting it on the aside forces overflow-x:auto too (CSS spec), which clips
          absolutely-positioned children like the keyboard shortcuts popover.
        */}

        {renderTabs()}
        {renderExplorerBadge()}

        {/* ── Scrollable panel area — overflow lives here, not on the aside ── */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">

          {/* ── Neighborhood mode ──────────────────────────────────────── */}
          {activeTab === 'neighborhood' && (
            <div
              role="tabpanel"
              id="sidebar-panel-neighborhood"
              aria-labelledby="sidebar-tab-neighborhood"
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Search — scrolls away as user scrolls down */}
              <div className="px-6 pt-4 pb-3 shrink-0">
                <UnifiedSearch neighborhoods={neighborhoods} />
              </div>

              {/* Compare to — desktop only; comparison charts are unreadable at mobile widths */}
              {neighborhood && (
                <div className="hidden md:block px-6 pb-3 shrink-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
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
            </div>
          )}

          {/* ── Find indicator mode ────────────────────────────────────── */}
          {activeTab === 'search' && (
            <div
              role="tabpanel"
              id="sidebar-panel-search"
              aria-labelledby="sidebar-tab-search"
              className="flex flex-col flex-1 min-h-0"
            >
              <IndicatorSearch onNavigate={() => setActiveTab('neighborhood')} />
            </div>
          )}

        </div>{/* end scrollable panel area */}

        {/* ── Footer — outside overflow context so popover isn't clipped ── */}
        {renderFooter()}
      </aside>

      {/* ── Mobile: FAB trigger button ────────────────────────────────────── */}
      <button
        onClick={openSheet}
        aria-label="Open neighborhood panel"
        className="md:hidden fixed bottom-8 right-4 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
      </button>

      {/* ── Mobile: bottom sheet ──────────────────────────────────────────── */}
      {/* Note: NeighborhoodMap is intentionally excluded here. A second Leaflet
          instance in a React Strict Mode double-invoke cycle causes an
          _initContainer crash. Map-based selection is available via IntroModal. */}
      {isSheetMounted && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">

          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black transition-opacity duration-300"
            style={{ opacity: sheetVisible ? 0.5 : 0 }}
            onClick={closeSheet}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Neighborhood panel"
            className="relative bg-white rounded-t-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out"
            style={{
              maxHeight: '85vh',
              transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
            }}
          >
            {/* Drag handle + close row */}
            <div className="shrink-0 flex items-center justify-center px-4 pt-3 pb-1 relative">
              <div className="w-8 h-1 rounded-full bg-gray-300" aria-hidden="true" />
              <button
                onClick={closeSheet}
                aria-label="Close panel"
                className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {renderTabs()}
            {renderExplorerBadge()}

            {/* Scrollable content — no Leaflet map */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">

              {activeTab === 'neighborhood' && (
                <div
                  role="tabpanel"
                  id="sidebar-panel-neighborhood"
                  aria-labelledby="sidebar-tab-neighborhood"
                  className="flex flex-col flex-1 min-h-0"
                >
                  <div className="px-6 pt-4 pb-3 shrink-0">
                    <UnifiedSearch neighborhoods={neighborhoods} />
                  </div>

                  <div className="px-6 pt-2 pb-4">
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
                  role="tabpanel"
                  id="sidebar-panel-search"
                  aria-labelledby="sidebar-tab-search"
                  className="flex flex-col flex-1 min-h-0"
                >
                  <IndicatorSearch onNavigate={() => { setActiveTab('neighborhood'); closeSheet(); }} />
                </div>
              )}

            </div>

            {renderFooter()}
          </div>
        </div>
      )}
    </>
  );
}
