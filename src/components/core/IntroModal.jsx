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
 * hoveredId state is lifted in useNeighborhoodFilter and passed to both the
 * list (for highlight styling) and ModalMap (for Leaflet layer style
 * updates). Hovering either side syncs the other. Arrow-key focus also
 * syncs hoveredId so the map highlights as you keyboard-navigate.
 *
 * PROPS:
 * - neighborhoods: Array<{ id, name, borough }> — passed from a server component
 *
 * NOTES:
 * - Client component (uses useState, useEffect, localStorage)
 * - ModalMap is dynamically imported (ssr:false) — same Leaflet constraint as
 *   NeighborhoodMap; Leaflet cannot be bundled for SSR
 * - Accent colors use the brand tokens (text-brand / bg-brand-tint /
 *   border-brand from globals.css), matching TopicNav, Sidebar, and
 *   UnifiedSearch — not Tailwind's default blue-*. Exceptions, both
 *   deliberate: (1) most focus-visible rings stay ring-blue-500, the same
 *   a11y convention used everywhere else; (2) the neighborhood search
 *   input's resting border is border-gray-200, matching UnifiedSearch's
 *   identical "Find neighborhood" input in the sidebar — but its FOCUS ring
 *   is ring-brand, not ring-blue-500, because this input autofocuses ~60ms
 *   after the modal opens (see useIntroModalLifecycle's focus effect).
 *   Since users see it focused far more often than resting, the focus color
 *   is what actually reads as "the search border" — it needed to be brand,
 *   even though that now differs from UnifiedSearch's blue-500 focus ring.
 * - As of 2026-09-04, the open/close lifecycle (localStorage, external open
 *   event, mount timing, focus trap, inert/aria-hidden) lives in
 *   ./introModal/useIntroModalLifecycle.js, the neighborhood search/filter
 *   state lives in ./introModal/useNeighborhoodFilter.js, and FeatureIcon
 *   lives in ./introModal/FeatureIcon.jsx — this file owns layout and the
 *   JSX tree.
 */
import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AddressSearch from '@/components/controls/AddressSearch';
import { highlight } from '@/lib/utils/highlight';
import FeatureIcon from './introModal/FeatureIcon';
import { useIntroModalLifecycle, STORAGE_KEY } from './introModal/useIntroModalLifecycle';
import { useNeighborhoodFilter } from './introModal/useNeighborhoodFilter';

// Dynamic import keeps Leaflet out of the SSR bundle
const ModalMap = dynamic(
  () => import('@/components/maps/ModalMap'),
  { ssr: false }
);

// UI copy — edit /content/site/introModal.json, no code changes needed
import modalCopy from '../../../content/site/introModal.json';
import { handleTablistKeyDown } from '@/lib/utils/tablistKeyDown';

export default function IntroModal({ neighborhoods = [] }) {
  const [searchTab, setSearchTab] = useState('neighborhood'); // 'neighborhood' | 'address'

  const router   = useRouter();
  const inputRef = useRef(null);

  const {
    isOpen,
    setIsOpen,
    isMounted,
    dialogVisible,
    visitedIds,
    dialogRef,
    dismiss,
  } = useIntroModalLifecycle({ inputRef });

  const handleSelect = useCallback((neighborhood) => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setIsOpen(false);
    router.push(`/neighborhood/${neighborhood.id}`);
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    query,
    setQuery,
    hoveredId,
    setHoveredId,
    focusedIndex,
    setFocusedIndex,
    itemRefs,
    listRef,
    grouped,
    flatFiltered,
    hasResults,
    filtered,
    handleInputKeyDown,
  } = useNeighborhoodFilter({ neighborhoods, visitedIds, onSelect: handleSelect, onDismiss: dismiss });

  if (!isMounted) return null;

  // Portaled to document.body so it sits outside #chp-app-shell — required
  // for the inert/aria-hidden effect in useIntroModalLifecycle to hide the
  // background without also hiding the modal itself (inert would otherwise
  // cascade to children).
  return createPortal(
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
        className="relative bg-white md:rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[96vh] flex flex-col overflow-hidden"
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
                     rounded-full text-gray-600 border border-transparent hover:text-brand hover:border-brand hover:bg-brand-tint
                     transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── Header (full-width) ──────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-4 md:px-8 md:pt-7 md:pb-5 border-b border-gray-100 shrink-0">
          <p className="text-base font-semibold text-brand mb-1.5">
            {modalCopy.deptLabel}
          </p>
          {/* h2, not h1 — the page underneath (PageHeader) owns the page's h1.
              This modal is a transient overlay, not a new document. */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
            {modalCopy.title}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">
            {modalCopy.subtitle}
          </p>

          {/* ── About blurb ───────────────────────────────────────────────── */}
          {modalCopy.footer.aboutBlurb && (
            <div className="mt-2.5 flex flex-col gap-1">
              <p className="text-sm text-gray-600 leading-snug">
                {modalCopy.footer.aboutBlurb}
              </p>
              <a
                href={modalCopy.footer.aboutHref}
                onClick={dismiss}
                className="text-sm font-medium text-brand hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded w-fit"
              >
                {modalCopy.footer.aboutLabel} →
              </a>
            </div>
          )}

          {/* ── Feature discovery chips ────────────────────────────────────── */}
          {/* Hidden on mobile — too much text for the smaller screen; kept on
              desktop (md+) where there's room and it supports feature discovery. */}
          {modalCopy.features?.length > 0 && (
            <div className="hidden md:flex md:flex-wrap gap-2 mt-3" aria-label="What you can do">
              {modalCopy.features.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5 select-none"
                >
                  <FeatureIcon id={feature.id} />
                  {feature.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Two-column body ──────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left panel: tab strip + search — full width on mobile */}
          <div className="w-full md:w-72 md:shrink-0 flex flex-col md:border-r border-gray-100 overflow-hidden">

            {/* Tab strip */}
            <div
              role="tablist"
              aria-label="Search method"
              className="flex border-b border-gray-100 shrink-0"
              // A11Y (2026-09-26): arrow keys / Home / End between tabs
              onKeyDown={(e) => handleTablistKeyDown(e, ['neighborhood', 'address'], searchTab, setSearchTab)}
            >
              {[
                { id: 'neighborhood', label: modalCopy.tabs.neighborhood },
                { id: 'address',      label: modalCopy.tabs.address },
              ].map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={searchTab === tab.id}
                  tabIndex={searchTab === tab.id ? 0 : -1}
                  onClick={() => setSearchTab(tab.id)}
                  className={[
                    'flex-1 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
                    searchTab === tab.id
                      ? 'border-b-2 border-brand text-brand bg-brand-tint'
                      : 'border-b-2 border-transparent text-gray-600 hover:text-brand hover:bg-brand-tint',
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none"
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
                      placeholder={modalCopy.search.placeholder}
                      aria-label={modalCopy.search.placeholder}
                      role="combobox"
                      aria-expanded={flatFiltered.length > 0}
                      aria-autocomplete="list"
                      aria-controls="intro-neighborhood-list"
                      aria-activedescendant={focusedIndex >= 0 ? `intro-result-${focusedIndex}` : undefined}
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    />
                    {query && (
                      <button
                        onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {visitedIds && (
                    <p className="text-sm text-brand bg-brand-tint border border-brand rounded-lg px-2.5 py-1.5 mt-2 text-center leading-snug">
                      Showing {filtered.length} unvisited neighborhoods
                    </p>
                  )}
                  {!visitedIds && flatFiltered.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      {modalCopy.search.keyboardHint}
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
                        // Mobile styling matches the Sidebar's "Find neighborhood"
                        // search (UnifiedSearch + NeighborhoodGroups, used in the
                        // mobile bottom sheet): plain header, flat
                        // blue-50/blue-700 highlight, no rounding. Desktop (md+)
                        // keeps this modal's own sticky header + brand-tint pill.
                        <div key={borough} className="md:mb-3">
                          <div className="text-sm md:text-base font-semibold text-gray-600 md:text-gray-600
                                          px-3 md:px-2 pt-2.5 md:pt-0 pb-1 md:mb-1 select-none md:sticky md:top-0 md:bg-white md:py-1">
                            {borough}
                          </div>
                          {nhoods.map(n => {
                            const idx       = globalIdx++;
                            const isFocused = idx === focusedIndex;
                            const isHovered = hoveredId === n.id;
                            return (
                              <li
                                key={n.id}
                                id={`intro-result-${idx}`}
                                ref={el => { itemRefs.current[idx] = el; }}
                                role="option"
                                aria-selected={isFocused}
                                onClick={() => handleSelect(n)}
                                onMouseEnter={() => { setHoveredId(n.id); setFocusedIndex(idx); }}
                                onMouseLeave={() => { setHoveredId(null); }}
                                className={[
                                  'w-full text-left text-sm px-3 py-1.5 transition-colors cursor-pointer rounded-none md:rounded-lg',
                                  isFocused || isHovered
                                    ? 'bg-blue-50 text-blue-700 md:bg-brand-tint md:text-brand'
                                    : 'text-gray-800 md:text-gray-700 hover:bg-gray-50 md:hover:text-gray-900',
                                ].join(' ')}
                              >
                                {highlight(n.name, query)}
                              </li>
                            );
                          })}
                        </div>
                      ));
                    })()
                  ) : (
                    <p className="text-sm text-gray-600 text-center py-6 px-4">
                      {modalCopy.search.noResults} &ldquo;{query}&rdquo;
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
                <p className="text-sm text-gray-600 mt-3 leading-snug">
                  {modalCopy.search.addressHint}
                </p>
              </div>
            )}

          </div>

          {/* Right panel: interactive map — hidden on mobile */}
          <div className="hidden md:flex flex-1 relative bg-gray-50">
            {/* Instruction hint */}
            <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm
                            text-sm text-gray-600 px-2.5 py-1.5 rounded-md shadow-sm
                            pointer-events-none select-none">
              {modalCopy.map.hint}
            </div>
            <ModalMap
              neighborhoods={neighborhoods}
              hoveredId={hoveredId}
              visitedIds={visitedIds}
              onSelect={handleSelect}
              onHover={setHoveredId}
            />
          </div>
        </div>

        {/* ── Footer (full-width) ──────────────────────────────────────────── */}
        {/* Hidden on mobile — on small screens this bar covered the primary
            action (searching/picking a neighborhood). DOHMH attribution is
            already visible in the header, and dismissing the modal already
            routes to a random neighborhood, so nothing is lost. Kept on
            desktop (md+) where it doesn't overlap anything. */}
        <div className="hidden md:flex px-8 py-3.5 border-t border-gray-100 shrink-0 items-center justify-between gap-4">
          <p className="text-sm text-gray-600 leading-snug">{modalCopy.footer.attribution}</p>
          <button
            onClick={() => {
              const pick = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
              if (pick) handleSelect(pick);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand border border-brand rounded-lg px-3 py-1.5 hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
              <circle cx="16" cy="8" r="1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="8" cy="16" r="1" fill="currentColor" stroke="none" />
              <circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" />
            </svg>
            {modalCopy.footer.randomButton}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
