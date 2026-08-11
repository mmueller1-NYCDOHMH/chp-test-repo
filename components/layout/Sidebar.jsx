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
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import UnifiedSearch from '@/components/controls/UnifiedSearch';
import MapHoverTooltip from '@/components/core/MapHoverTooltip';
import IndicatorSearch from '@/components/controls/IndicatorSearch';
import ShortcutsToast         from '@/components/layout/ShortcutsToast';
import ComparisonNeighborhoodSelector from '@/components/controls/ComparisonNeighborhoodSelector';
import { siteNav } from '@/config/nav/siteNav';

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

const VALID_TABS    = TABS.map(t => t.id);
const DEFAULT_TAB   = 'neighborhood';
const TAB_URL_PARAM = 'tab';

/**
 * Given a section ID dispatched by chp:section-activated, return the
 * top-level siteNav category label (e.g. "Health conditions").
 * Handles both subcategory IDs (e.g. "chronic-conditions") and category
 * anchor IDs (e.g. "cat-health-conditions" → strips prefix, matches by id).
 * Returns null if the id doesn't map to any known category.
 */
function resolveCategoryLabel(sectionId) {
  // Category-level click: id = 'cat-{categoryId}'
  if (sectionId.startsWith('cat-')) {
    const catId = sectionId.slice(4); // strip 'cat-'
    return siteNav.find(c => c.id === catId)?.label ?? null;
  }
  // Subcategory-level click: find which category owns this section id
  for (const cat of siteNav) {
    if (cat.subcategories.some(sub => sub.id === sectionId)) {
      return cat.label;
    }
  }
  return null;
}

const EXPLORER_KEY = 'chp_visited_cds';
const TROPHY_KEY   = 'chp_trophy_earned';

// ── Mobile sheet gesture tuning ───────────────────────────────────────────
const SHEET_OPEN_HEIGHT_RATIO = 0.85; // matches the previous fixed 85vh
const SAFE_AREA_GAP           = 60;   // px gap to preserve below the notch when expanded
const FAST_SWIPE_VELOCITY     = 0.5;  // px/ms — above this counts as a "quick" swipe
const TAP_MOVEMENT_THRESHOLD  = 8;    // px — below this, a touch counts as a tap

export default function Sidebar({ sections, neighborhoods, indicatorSummaries, pageNav }) {
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
  const [trophyEarned,    setTrophyEarned]    = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const achievementTimer = useRef(null);

  // Record each visited neighborhood and update count
  useEffect(() => {
    if (!activeId) return;
    try {
      const stored          = JSON.parse(localStorage.getItem(EXPLORER_KEY) || '[]');
      const set             = new Set(stored);
      const wasAlreadyFull  = set.size >= 59;
      set.add(activeId);
      localStorage.setItem(EXPLORER_KEY, JSON.stringify([...set]));
      setExploredCount(set.size);
      // First time all 59 are visited — earn the trophy permanently
      if (set.size >= 59 && !wasAlreadyFull) {
        localStorage.setItem(TROPHY_KEY, '1');
        setTrophyEarned(true);
      }
    } catch { /* localStorage unavailable */ }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise count + trophy from storage on mount.
  // Also backfills TROPHY_KEY for users who hit 59 before this code was added.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(EXPLORER_KEY) || '[]');
      setExploredCount(stored.length);
      if (stored.length >= 59 || localStorage.getItem(TROPHY_KEY) === '1') {
        if (stored.length >= 59) localStorage.setItem(TROPHY_KEY, '1');
        setTrophyEarned(true);
      }
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

  // Listen for the mobile map-pin tap in TopicNav → open the bottom sheet
  useEffect(() => {
    function onOpenMobileSheet() { openSheet(); }
    window.addEventListener('chp:open-mobile-sheet', onOpenMobileSheet);
    return () => window.removeEventListener('chp:open-mobile-sheet', onOpenMobileSheet);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const [activeTab, _setActiveTab]          = useState(DEFAULT_TAB);
  const [categoryFilter, setCategoryFilter] = useState(null);

  // Live ref mirror of activeTab — lets handleSectionActivated (registered
  // once, deps []) read the current tab without a stale closure, and without
  // resorting to the setState functional-updater form for side effects
  // (history.replaceState/setState calls inside a useState updater run
  // during React's render phase and trigger "Cannot update a component
  // while rendering a different component").
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // Global keyboard shortcuts (outside any text field):
  //   /  — jump to neighborhood search
  //   m  — open the intro / neighborhood picker modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;

      if (e.key === '/') {
        e.preventDefault();
        setActiveTab('neighborhood');
        // Wait one tick for the tab switch to re-render, then ask UnifiedSearch
        // to enter edit mode and focus itself — a plain querySelector can't
        // find the input when the control is currently collapsed to its
        // populated/pill state (no <input> in the DOM at that point).
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chp:focus-neighborhood-search'));
        }, 50);
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setActiveTab('search');
        setTimeout(() => {
          document.querySelector('input[aria-label="Search indicators"]')?.focus();
        }, 50);
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('chp:open-intro-modal'));
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate tab from URL on mount
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get(TAB_URL_PARAM);
    if (param && VALID_TABS.includes(param)) _setActiveTab(param);
  }, []);

  // Tab setter that also syncs the URL without navigation.
  // Clears the category filter when returning to the neighborhood tab —
  // the filter is set by TopicNav clicks and should reset on explicit tab change.
  const setActiveTab = useCallback((tab) => {
    _setActiveTab(tab);
    if (tab === DEFAULT_TAB) setCategoryFilter(null);
    const url = new URL(window.location.href);
    if (tab === DEFAULT_TAB) {
      url.searchParams.delete(TAB_URL_PARAM);
    } else {
      url.searchParams.set(TAB_URL_PARAM, tab);
    }
    history.replaceState(null, '', url.toString());
  }, []);

  // ── TopicNav → sidebar tab sync ──────────────────────────────────────────
  // chp:section-activated fires on every intentional TopicNav click (never
  // on scroll-spy). Two behaviours depending on what was clicked:
  //
  //   Top-level category (id = 'cat-{categoryId}')
  //     → Switch to "Find indicator" tab, pre-filtered to that category.
  //
  //   Subcategory (plain section id, e.g. 'chronic-conditions')
  //     → If currently on "Find indicator", return to "Neighborhood" so the
  //       map/context is visible alongside the content. No-op otherwise.
  //
  // Both branches use the functional-update form of _setActiveTab so they
  // always read the real current state — the [] effect avoids a stale closure.
  useEffect(() => {
    function handleSectionActivated(e) {
      const id = e.detail?.id ?? '';

      if (id.startsWith('cat-')) {
        // Top-level category click → open filtered indicator search
        const label = resolveCategoryLabel(id);
        if (!label) return;
        setCategoryFilter(label);
        _setActiveTab('search');
        const url = new URL(window.location.href);
        url.searchParams.set(TAB_URL_PARAM, 'search');
        history.replaceState(null, '', url.toString());
      } else if (activeTabRef.current === 'search') {
        // Subcategory click → revert to neighborhood if on search tab.
        // Read the live tab via ref (not a functional setState updater) so
        // the side effects below run as normal event-handler logic instead
        // of during React's render phase.
        setCategoryFilter(null);
        _setActiveTab(DEFAULT_TAB);
        const url = new URL(window.location.href);
        url.searchParams.delete(TAB_URL_PARAM);
        history.replaceState(null, '', url.toString());
      }
    }
    window.addEventListener('chp:section-activated', handleSectionActivated);
    return () => window.removeEventListener('chp:section-activated', handleSectionActivated);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mobile bottom sheet state ─────────────────────────────────────────────
  // isSheetOpen = user intent; isSheetMounted keeps DOM alive during exit anim.
  // sheetTop tracks the sheet's top edge in px from the viewport top — driving
  // both drag-follow and the snap/close/expand animations via a single value.
  const [isSheetOpen,    setIsSheetOpen]    = useState(false);
  const [isSheetMounted, setIsSheetMounted] = useState(false);
  const [sheetTop,       setSheetTop]       = useState(null);
  const [isDragging,     setIsDragging]     = useState(false);
  const [transitionMs,   setTransitionMs]   = useState(300);
  const [safeAreaTop,    setSafeAreaTop]    = useState(0);
  const safeAreaProbeRef     = useRef(null);
  const unmountTimerRef      = useRef(null);
  const hasPushedHistoryRef  = useRef(false);
  const isProgrammaticPopRef = useRef(false);
  const dragRef = useRef({
    startY: 0, startTop: 0, lastY: 0, lastTime: 0, velocity: 0, dragging: false, moved: false,
  });

  // Measure the safe-area inset (notch / status bar) once so the expanded
  // sheet position can respect SAFE_AREA_GAP below it.
  useEffect(() => {
    if (safeAreaProbeRef.current) {
      setSafeAreaTop(safeAreaProbeRef.current.getBoundingClientRect().height);
    }
  }, []);

  function getWindowHeight() { return typeof window !== 'undefined' ? window.innerHeight : 800; }
  function getOpenTop()      { return getWindowHeight() * (1 - SHEET_OPEN_HEIGHT_RATIO); }
  function getMinTop()       { return safeAreaTop + SAFE_AREA_GAP; }
  function getMaxTop()       { return getWindowHeight(); }
  function currentTop()      { return sheetTop != null ? sheetTop : getOpenTop(); }

  function openSheet() {
    setIsSheetOpen(true);
    setIsSheetMounted(true);
    if (!hasPushedHistoryRef.current) {
      window.history.pushState({ chpMobileSheet: true }, '');
      hasPushedHistoryRef.current = true;
    }
    clearTimeout(unmountTimerRef.current);
    setTransitionMs(300);
    requestAnimationFrame(() => setSheetTop(getOpenTop()));
  }

  // Animates the sheet down and off-screen, then unmounts it. Doesn't touch
  // browser history — used for real back-navigation, where the history entry
  // has already been consumed by the time this runs.
  function animateClose(fast) {
    setIsSheetOpen(false);
    setTransitionMs(fast ? 200 : 300);
    setSheetTop(getMaxTop());
    clearTimeout(unmountTimerRef.current);
    unmountTimerRef.current = setTimeout(() => setIsSheetMounted(false), (fast ? 200 : 300) + 20);
  }

  // User-initiated close (X button, backdrop tap, drag-to-close, tap-to-close).
  // Also unwinds the history entry pushed by openSheet, so the back button
  // doesn't need an extra press once the sheet is already closed.
  function closeSheet(opts) {
    const fast = !!(opts && opts.fast);
    animateClose(fast);
    if (hasPushedHistoryRef.current) {
      hasPushedHistoryRef.current = false;
      isProgrammaticPopRef.current = true;
      window.history.back();
    }
  }

  // Back button / native back-gesture closes the sheet instead of navigating
  // away, since openSheet() pushed a history entry to catch exactly this.
  useEffect(() => {
    function onPopState() {
      if (isProgrammaticPopRef.current) {
        isProgrammaticPopRef.current = false;
        return;
      }
      if (isSheetOpen) {
        hasPushedHistoryRef.current = false;
        animateClose(true);
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sheet on Escape
  useEffect(() => {
    if (!isSheetOpen) return;
    function onKey(e) { if (e.key === 'Escape') closeSheet(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag handle gesture handlers ──────────────────────────────────────────
  function handleHandlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startTop: currentTop(),
      lastY: e.clientY,
      lastTime: Date.now(),
      velocity: 0,
      dragging: true,
      moved: false,
    };
    setIsDragging(true);
    setTransitionMs(0); // follow the finger with no CSS lag
  }

  function handleHandlePointerMove(e) {
    const d = dragRef.current;
    if (!d.dragging) return;
    const deltaFromStart = e.clientY - d.startY;
    if (Math.abs(deltaFromStart) > TAP_MOVEMENT_THRESHOLD) d.moved = true;
    const now = Date.now();
    const dt  = now - d.lastTime;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt; // px/ms, positive = downward
    d.lastY = e.clientY;
    d.lastTime = now;
    const clamped = Math.min(getMaxTop(), Math.max(getMinTop(), d.startTop + deltaFromStart));
    setSheetTop(clamped);
  }

  function handleHandlePointerEnd(e) {
    const d = dragRef.current;
    if (!d.dragging) return;
    d.dragging = false;
    setIsDragging(false);

    if (!d.moved) {
      // A tap on the handle — dismiss.
      closeSheet({ fast: true });
      return;
    }

    const netDelta = e.clientY - d.startY; // + is net downward movement

    if (netDelta < 0) {
      // Net upward swipe — ease up to near-full-height, clearing the notch.
      setTransitionMs(300);
      setSheetTop(getMinTop());
      return;
    }

    if (d.velocity > FAST_SWIPE_VELOCITY) {
      // Fast downward swipe — dismiss quickly.
      closeSheet({ fast: true });
      return;
    }

    // Slow downward drag — leave the sheet exactly where the finger lifted.
    const releaseTop = Math.min(getMaxTop(), Math.max(getMinTop(), d.startTop + netDelta));
    if (releaseTop >= getMaxTop() - 1) {
      closeSheet({ fast: false });
    } else {
      setTransitionMs(0);
      setSheetTop(releaseTop);
    }
  }

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
              <svg className="w-3.5 h-3.5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.25 3v2.25H6.75A2.25 2.25 0 0 0 4.5 7.5v.75A4.5 4.5 0 0 0 8.534 12.6 6.01 6.01 0 0 0 11.25 14.9V18H9a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-2.25v-3.1a6.01 6.01 0 0 0 2.716-2.3A4.5 4.5 0 0 0 19.5 8.25V7.5a2.25 2.25 0 0 0-2.25-2.25H12.75V3h-1.5ZM6 7.5v.75a3 3 0 0 0 2.716 2.992A6.03 6.03 0 0 1 6 7.5Zm10.284 3.242A3 3 0 0 0 18 8.25V7.5a.75.75 0 0 0-.75-.75h-4.5a6.03 6.03 0 0 1-.716 3.992 3 3 0 0 0 4.25 0Z" />
              </svg>
              All 59 explored!
            </span>
            <span className="text-xs font-semibold text-amber-600 tabular-nums">59 / 59</span>
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
            {exploredCount} <span className="font-normal text-gray-500">/ 59</span>
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

        {renderTabs()}
        {renderFooter()}

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
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">
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
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">
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
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    On this page
                  </p>
                  {pageNav.map(({ href, label }) => (
                    <a
                      key={href}
                      href={href}
                      className="block text-sm text-gray-500 hover:text-blue-600 py-1.5 rounded transition-colors"
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
              role="tabpanel"
              id="sidebar-panel-search"
              aria-labelledby="sidebar-tab-search"
              className="flex flex-col flex-1 min-h-0"
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
                className="w-8 h-1 rounded-full bg-gray-300 touch-none cursor-grab"
              />
              <button
                onClick={() => closeSheet()}
                aria-label="Close panel"
                className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {renderTabs()}
            {renderFooter()}

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
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">
                      Find neighborhood
                    </p>
                    <UnifiedSearch neighborhoods={neighborhoods} />
                  </div>

                  {/* Compare to — mirrors the desktop aside's section above.
                      No map here (see file-level NOTES on why NeighborhoodMap
                      is excluded from the mobile sheet), so this text search
                      is the only way to pick a comparison neighborhood on
                      mobile — not just a secondary option like on desktop. */}
                  {neighborhood && (
                    <div className="px-6 pb-3 shrink-0">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">
                        Compare to
                      </p>
                      <ComparisonNeighborhoodSelector neighborhoods={neighborhoods} />
                    </div>
                  )}

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
                  <IndicatorSearch
                    onNavigate={() => { setActiveTab('neighborhood'); closeSheet(); }}
                    categoryFilter={categoryFilter}
                    onClearFilter={() => setCategoryFilter(null)}
                    activeNeighborhood={neighborhood ?? null}
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
