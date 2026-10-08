'use client';

/**
 * FILE: ComparisonNeighborhoodSelector.jsx
 *
 * PURPOSE:
 * Sidebar control for selecting a second neighborhood to compare against.
 *
 * DESCRIPTION:
 * Two display states:
 *
 *   Empty — shows a compact search input. Typing filters the neighborhoods
 *   list (same borough-grouped logic as NeighborhoodSelector). The current
 *   primary neighborhood is excluded from results. Selecting a neighborhood
 *   writes it to ComparisonContext and switches to the Pill state.
 *
 *   Pill — shows the selected neighborhood name in a rust-colored chip
 *   (COMPARISON) with a clear button. Clicking the name or the chip itself
 *   reopens the search.
 *
 * KEYBOARD (search input):
 *   ↓ / ↑  — move through results
 *   Enter   — select focused (or first) result
 *   Escape  — clear query; if already empty, close and stay cleared
 *
 * PROPS:
 *   neighborhoods — full list of { id, name, borough, geoId } objects,
 *                   passed from Sidebar (already fetched by PageLayout)
 *
 * NOTES:
 * - Client component — uses useComparison() + useParams()
 * - The primary neighborhood (from URL params) is excluded from results
 * - Color: COMPARISON rust throughout (--color-comparison-* in globals.css)
 *   to match the comparison CD color used in charts and on the map
 * - ComparisonPill pops in on mount (scale 0.92→1) rather than just
 *   appearing — same easing curve as AnimatedBar.jsx, and the same
 *   RAF-then-flip-a-state idiom this file already uses for the dropdown's
 *   own entrance (see `dropVisible` below). Respects prefers-reduced-motion.
 */

import { useState, useRef, useEffect, useMemo, useCallback, useId } from 'react';
import { useParams } from 'next/navigation';
import { useComparison } from '@/lib/context/ComparisonContext';
import { BOROUGH_ORDER } from '@/lib/utils/constants';
import { byCdNumber, matchesNeighborhoodQuery } from '@/lib/utils/formatGeography';
import NeighborhoodGroups from '@/components/controls/NeighborhoodGroups';

// ── Pill — shown when a comparison neighborhood is selected ───────────────────
function ComparisonPill({ neighborhood, onClear, onEdit }) {
  const [visible, setVisible] = useState(false);
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fresh mount every time a comparison is picked (this component only
  // renders while comparisonNeighborhood is set — see the main export's
  // early return below), so this fires exactly when the pill appears.
  useEffect(() => {
    if (reducedMotion) { setVisible(true); return; }
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  return (
    <div
      className="flex items-center gap-2 bg-comparison-tint border border-comparison-border rounded-lg px-3 py-2"
      style={{
        transform:  visible ? 'scale(1)' : 'scale(0.92)',
        opacity:    visible ? 1 : 0,
        transition: reducedMotion ? 'none' : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out',
      }}
    >
      <span
        className="w-2 h-2 rounded-full bg-comparison shrink-0"
        aria-hidden="true"
      />
      <button
        onClick={onEdit}
        className="flex-1 text-left text-sm font-medium text-comparison-text hover:text-comparison-hover truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-comparison rounded"
        aria-label={`Comparing to ${neighborhood.name}. Click to change.`}
      >
        {neighborhood.name}
      </button>
      <button
        onClick={onClear}
        aria-label={`Remove comparison with ${neighborhood.name}`}
        className="text-comparison-text hover:text-comparison-hover transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-comparison rounded"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ComparisonNeighborhoodSelector({ neighborhoods = [], inputId }) {
  const uid       = useId();
  const listboxId = `${uid}-listbox`;
  const optPrefix = `${uid}-opt`;

  const { comparisonNeighborhood, setComparisonNeighborhood } = useComparison();
  const params    = useParams();
  const primaryId = params?.id ? String(params.id) : null;

  const [isEditing,    setIsEditing]    = useState(false);
  const [query,        setQuery]        = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropVisible,  setDropVisible]  = useState(false);

  const inputRef     = useRef(null);
  const containerRef = useRef(null);
  const itemRefs     = useRef([]);

  // Filter + group — exclude the primary neighborhood
  const { grouped, flat } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const candidates = neighborhoods.filter(n => String(n.id) !== primaryId);

    const filtered = q
      ? candidates.filter(n => matchesNeighborhoodQuery(n, q))
      : candidates;

    const map = {};
    BOROUGH_ORDER.forEach(b => { map[b] = []; });
    filtered.forEach(n => {
      const key = map[n.borough] !== undefined ? n.borough : 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(n);
    });

    // Within each borough, order by community district number (not name)
    Object.values(map).forEach(ns => ns.sort(byCdNumber));

    const groups   = Object.entries(map).filter(([, ns]) => ns.length > 0);
    const flatList = groups.flatMap(([, ns]) => ns);
    return { grouped: groups, flat: flatList };
  }, [query, neighborhoods, primaryId]);

  const isOpen = isEditing;

  // Animate dropdown
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setDropVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setDropVisible(false);
    }
  }, [isOpen]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isEditing]);

  // Reset focus index when query changes
  useEffect(() => { setFocusedIndex(-1); }, [query]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Close on click outside
  useEffect(() => {
    if (!isEditing) return;
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsEditing(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isEditing]);

  const handleSelect = useCallback((neighborhood) => {
    setComparisonNeighborhood({ id: neighborhood.id, name: neighborhood.name, geoId: neighborhood.geoId });
    setIsEditing(false);
    setQuery('');
  }, [setComparisonNeighborhood]);

  const handleClear = useCallback(() => {
    setComparisonNeighborhood(null);
    setIsEditing(false);
    setQuery('');
  }, [setComparisonNeighborhood]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => (i <= 0 ? -1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = focusedIndex >= 0 ? flat[focusedIndex] : flat[0];
      if (target) handleSelect(target);
    } else if (e.key === 'Escape') {
      if (query) {
        setQuery('');
      } else {
        setIsEditing(false);
      }
    }
  }

  // ── Pill state ────────────────────────────────────────────────────────
  if (comparisonNeighborhood && !isEditing) {
    return (
      <ComparisonPill
        neighborhood={comparisonNeighborhood}
        onClear={handleClear}
        onEdit={() => { setIsEditing(true); setQuery(''); }}
      />
    );
  }

  // ── Search state ──────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">

      {/* Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-comparison-text pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsEditing(true); }}
          onFocus={() => setIsEditing(true)}
          onKeyDown={handleKeyDown}
          placeholder="Neighborhood name"
          /* A11Y (audit 2026-10-08, WCAG 3.3.2): with `inputId`, Sidebar's visible
             <label htmlFor> ("Compare to") names the field, so aria-label is
             dropped to keep the name matching the visible label (WCAG 2.5.3). */
          id={inputId}
          aria-label={inputId ? undefined : 'Search comparison neighborhoods'}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={focusedIndex >= 0 ? `${optPrefix}-${focusedIndex}` : undefined}
          role="combobox"
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white placeholder-gray-600 text-gray-800 focus:outline-none focus:ring-2 focus:ring-comparison focus:border-transparent"
        />
        {isEditing && query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            aria-label="Clear"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-comparison-text hover:text-comparison-hover"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* A11Y (2026-09-26, WCAG 3.3.1 / 4.1.3): polite live region for the
          results state — the visual "no matches" <li> inside the listbox
          was never announced. Always mounted so updates are picked up. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {!isOpen || !query.trim()
          ? ''
          : flat.length === 0
            ? `No neighborhood matches “${query.trim()}”. Try a borough or community district number.`
            : `${flat.length} neighborhood${flat.length === 1 ? '' : 's'} available. Use up and down arrows to choose.`}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Comparison neighborhoods"
          className="absolute z-[9999] w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-56 overflow-auto py-1"
          style={{
            opacity:    dropVisible ? 1 : 0,
            transform:  dropVisible ? 'translateY(0)' : 'translateY(-4px)',
            transition: 'opacity 150ms ease-out, transform 150ms ease-out',
          }}
        >
          {flat.length === 0 ? (
            // aria-hidden: announced via the live region below instead.
            <li role="presentation" aria-hidden="true" className="px-4 py-3 text-xs text-gray-600 text-center">
              {`No neighborhood matches “${query.trim()}”. Try a borough or community district number.`}
            </li>
          ) : (
            <NeighborhoodGroups
              grouped={grouped}
              query={query}
              focusedIndex={focusedIndex}
              itemRefs={itemRefs}
              onSelect={handleSelect}
              onSetFocused={setFocusedIndex}
              colorScheme="amber"
              size="xs"
              optionIdPrefix={optPrefix}
            />
          )}
        </ul>
      )}
    </div>
  );
}
