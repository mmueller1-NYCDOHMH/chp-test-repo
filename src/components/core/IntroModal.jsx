'use client';

/**
 * FILE: IntroModal.jsx
 *
 * PURPOSE:
 * Displays a welcome modal on first visit to the site, orienting new users
 * and prompting them to select a starting neighborhood.
 *
 * DESCRIPTION:
 * Rendered client-side on the neighborhood page. Checks localStorage on
 * mount — if the user has never visited, the modal opens automatically so
 * first-time visitors can pick a neighborhood from a map/list rather than
 * the default redirect target. Once the user selects a neighborhood or
 * dismisses the modal, the preference is persisted to localStorage so the
 * modal never reappears.
 *
 * LAYOUT:
 * ┌──────────────────────────────────────────────────┐
 * │  Header (full width)                             │
 * ├──────────────────┬───────────────────────────────┤
 * │  Search + List   │  Interactive Leaflet Map       │
 * │  (scrollable)    │  (click or hover any district) │
 * ├──────────────────┴───────────────────────────────┤
 * │  Footer (full width)                             │
 * └──────────────────────────────────────────────────┘
 *
 * KEYBOARD NAVIGATION (search input):
 *   ↓ / ↑  — move through the filtered list (skips borough headers)
 *   Enter   — select the focused (or first) result
 *   Escape  — clear query if non-empty; dismiss modal if query is empty
 *
 * HOVER SYNC:
 * hoveredId state is lifted here and passed to both the list (for highlight
 * styling) and ModalMap (for Leaflet layer style updates). Hovering either
 * side syncs the other. Arrow-key focus also syncs hoveredId so the map
 * highlights as you keyboard-navigate.
 *
 * PROPS:
 * - neighborhoods: Array<{ id, name, borough }> — passed from a server component
 *
 * NOTES:
 * - Client component (uses useState, useEffect, localStorage)
 * - ModalMap is dynamically imported (ssr:false) — same Leaflet constraint as
 *   NeighborhoodMap; Leaflet cannot be bundled for SSR
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AddressSearch from '@/components/controls/AddressSearch';
import { BOROUGH_ORDER } from '@/lib/utils/constants';
import { highlight } from '@/lib/utils/highlight';

// Dynamic import keeps Leaflet out of the SSR bundle
const ModalMap = dynamic(
  () => import('@/components/maps/ModalMap'),
  { ssr: false }
);

const STORAGE_KEY = 'chp_intro_seen';

export default function IntroModal({ neighborhoods = [] }) {
  const [isOpen,        setIsOpen]        = useState(false);
  const [isMounted,     setIsMounted]     = useState(false); // trails isOpen by CLOSE_DURATION ms
  const [dialogVisible, setDialogVisible] = useState(false);
  const [query,         setQuery]         = useState('');
  const [hoveredId,     setHoveredId]     = useState(null);
  const [focusedIndex,  setFocusedIndex]  = useState(-1);
  const [searchTab,     setSearchTab]     = useState('neighborhood'); // 'neighborhood' | 'address'
  // visitedIds: Set of neighborhood ids — when set, list shows only unvisited ones
  const [visitedIds,    setVisitedIds]    = useState(null);

  // How long the CSS close transition runs (keep in sync with transition durations below)
  const CLOSE_DURATION = 250;

  const router    = useRouter();
  const inputRef  = useRef(null);
  const itemRefs  = useRef([]);
  const listRef   = useRef(null);
  const dialogRef = useRef(null);

  // Only open if the user hasn't visited before
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setIsOpen(true);
    } catch { /* localStorage may be unavailable; fail silently */ }
  }, []);

  // Listen for external open trigger. Payload may include visitedIds for the
  // explorer badge — when present, the list pre-filters to unvisited CDs only.
  useEffect(() => {
    function handleExternalOpen(e) {
      setIsOpen(true);
      if (e.detail?.visitedIds?.length) {
        setVisitedIds(new Set(e.detail.visitedIds));
      } else {
        setVisitedIds(null);
      }
    }
    window.addEventListener('chp:open-intro-modal', handleExternalOpen);
    return () => window.removeEventListener('chp:open-intro-modal', handleExternalOpen);
  }, []);

  // Mount immediately on open; unmount only after the close animation finishes.
  // dialogVisible drives the CSS transition — isMounted controls whether we render at all.
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const raf = requestAnimationFrame(() => setDialogVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setDialogVisible(false);
      const timer = setTimeout(() => setIsMounted(false), CLOSE_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setIsOpen(false);
    setVisitedIds(null);
  }, []);

  // Move focus to search input when the modal opens + focus trap
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => inputRef.current?.focus(), 60);

    function onKey(e) {
      if (e.key === 'Escape') { dismiss(); return; }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.disabled);
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(id); document.removeEventListener('keydown', onKey); };
  }, [isOpen, dismiss]);

  // Reset focused index when query changes
  useEffect(() => { setFocusedIndex(-1); }, [query]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  const handleSelect = useCallback((neighborhood) => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setIsOpen(false);
    router.push(`/neighborhood/${neighborhood.id}`);
  }, [router]);

  // ── Filter + group neighborhoods ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let base = query
      ? neighborhoods.filter(n =>
          n.name.toLowerCase().includes(query.toLowerCase()) ||
          n.borough.toLowerCase().includes(query.toLowerCase())
        )
      : neighborhoods;
    // When opened from the explorer badge, only show unvisited CDs
    if (visitedIds) base = base.filter(n => !visitedIds.has(n.id));
    return base;
  }, [query, neighborhoods, visitedIds]);

  const grouped = useMemo(() =>
    BOROUGH_ORDER.reduce((acc, borough) => {
      const matches = filtered.filter(n => n.borough === borough);
      if (matches.length > 0) acc[borough] = matches;
      return acc;
    }, {}),
  [filtered]);

  // Flat ordered list for index-based keyboard navigation
  const flatFiltered = useMemo(() =>
    Object.values(grouped).flat(),
  [grouped]);

  const hasResults = filtered.length > 0;

  // ── Input keyboard handler ────────────────────────────────────────────────
  function handleInputKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(focusedIndex + 1, flatFiltered.length - 1);
      setFocusedIndex(next);
      setHoveredId(flatFiltered[next]?.id ?? null);

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = focusedIndex <= 0 ? -1 : focusedIndex - 1;
      setFocusedIndex(prev);
      setHoveredId(prev >= 0 ? (flatFiltered[prev]?.id ?? null) : null);

    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = focusedIndex >= 0 ? flatFiltered[focusedIndex] : flatFiltered[0];
      if (target) handleSelect(target);

    } else if (e.key === 'Escape') {
      if (query) {
        setQuery('');
      } else {
        dismiss();
      }
    }
  }

  if (!isMounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Community Health Profiles"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: dialogVisible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        transition: 'background-color 250ms ease-out',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Modal card — wider to accommodate the map; full-screen on mobile */}
      <div
        ref={dialogRef}
        className="relative bg-white md:rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[85vh] flex flex-col overflow-hidden"
        style={{
          opacity:    dialogVisible ? 1 : 0,
          transform:  dialogVisible ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(8px)',
          transition: 'opacity 250ms ease-out, transform 250ms ease-out',
        }}
      >

        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="Close introduction"
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center
                     rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100
                     transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── Header (full-width) ──────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 md:px-8 md:pt-7 md:pb-5 border-b border-gray-100 shrink-0">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1.5">
            NYC Department of Health &amp; Mental Hygiene
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
            Community Health Profiles
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
            Explore health data for all 59 NYC Community Districts. Each profile shows
            indicators across chronic conditions, social and economic factors, and
            demographics; with comparisons to borough and citywide averages.
          </p>
        </div>

        {/* ── Two-column body ──────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left panel: tab strip + search — full width on mobile */}
          <div className="w-full md:w-72 md:shrink-0 flex flex-col md:border-r border-gray-100 overflow-hidden">

            {/* Tab strip */}
            <div role="tablist" aria-label="Search method" className="flex border-b border-gray-100 shrink-0">
              {[
                { id: 'neighborhood', label: 'By neighborhood' },
                { id: 'address',      label: 'By address' },
              ].map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={searchTab === tab.id}
                  onClick={() => setSearchTab(tab.id)}
                  className={[
                    'flex-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
                    searchTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50'
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── By neighborhood tab ─────────────────────────────────────── */}
            {searchTab === 'neighborhood' && (
              <>
                <div className="px-5 pt-5 pb-3 shrink-0">
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Search neighborhoods…"
                      aria-label="Search neighborhoods"
                      aria-controls="intro-neighborhood-list"
                      aria-activedescendant={focusedIndex >= 0 ? `intro-result-${focusedIndex}` : undefined}
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {query && (
                      <button
                        onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {visitedIds && (
                    <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 mt-2 text-center leading-snug">
                      Showing {filtered.length} unvisited neighborhoods
                    </p>
                  )}
                  {!visitedIds && flatFiltered.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      ↑↓ navigate · Enter select
                    </p>
                  )}
                </div>

                <div
                  id="intro-neighborhood-list"
                  ref={listRef}
                  role="listbox"
                  aria-label="Neighborhoods"
                  className="flex-1 overflow-y-auto px-3 pb-4"
                >
                  {hasResults ? (
                    (() => {
                      let globalIdx = 0;
                      return Object.entries(grouped).map(([borough, nhoods]) => (
                        <div key={borough} className="mb-3">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest
                                          mb-1 px-2 sticky top-0 bg-white py-1">
                            {borough}
                          </div>
                          {nhoods.map(n => {
                            const idx       = globalIdx++;
                            const isFocused = idx === focusedIndex;
                            const isHovered = hoveredId === n.id;
                            return (
                              <button
                                key={n.id}
                                id={`intro-result-${idx}`}
                                ref={el => { itemRefs.current[idx] = el; }}
                                role="option"
                                aria-selected={isFocused}
                                onClick={() => handleSelect(n)}
                                onMouseEnter={() => { setHoveredId(n.id); setFocusedIndex(idx); }}
                                onMouseLeave={() => { setHoveredId(null); }}
                                className={[
                                  'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors focus:outline-none',
                                  isFocused || isHovered
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                                ].join(' ')}
                              >
                                {highlight(n.name, query)}
                              </button>
                            );
                          })}
                        </div>
                      ));
                    })()
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-6 px-4">
                      No neighborhoods match &ldquo;{query}&rdquo;
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── By address tab ──────────────────────────────────────────── */}
            {searchTab === 'address' && (
              <div className="px-5 pt-5 pb-4">
                <AddressSearch
                  variant="modal"
                  neighborhoods={neighborhoods}
                  onSelect={handleSelect}
                  onHover={setHoveredId}
                />
                <p className="text-xs text-gray-400 mt-3 leading-snug">
                  Type at least 3 characters — results appear as you type.
                </p>
              </div>
            )}

          </div>

          {/* Right panel: interactive map — hidden on mobile */}
          <div className="hidden md:flex flex-1 relative bg-gray-50">
            {/* Instruction hint */}
            <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm
                            text-xs text-gray-500 px-2.5 py-1.5 rounded-md shadow-sm
                            pointer-events-none select-none">
              Click any community to explore
            </div>

            <ModalMap
              neighborhoods={neighborhoods}
              hoveredId={hoveredId}
              onSelect={handleSelect}
              onHover={setHoveredId}
            />
          </div>
        </div>

        {/* ── Footer (full-width) ──────────────────────────────────────────── */}
        <div className="px-8 py-3.5 border-t border-gray-100 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Data from the NYC Bureau of Epidemiological Services
          </p>
          <button
            onClick={() => {
              const pick = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
              if (pick) handleSelect(pick);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            Random neighborhood →
          </button>
        </div>

      </div>
    </div>
  );
}
