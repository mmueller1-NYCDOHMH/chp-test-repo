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
 */

import { useState, useRef, useEffect, useMemo, useCallback, useId } from 'react';
import { useParams } from 'next/navigation';
import { useComparison } from '@/lib/context/ComparisonContext';
import { BOROUGH_ORDER } from '@/lib/utils/constants';
import NeighborhoodGroups from '@/components/controls/NeighborhoodGroups';

// ── Pill — shown when a comparison neighborhood is selected ───────────────────
function ComparisonPill({ neighborhood, onClear, onEdit }) {
  return (
    <div className="flex items-center gap-2 bg-comparison-tint border border-comparison-border rounded-lg px-3 py-2">
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
        className="text-comparison-border hover:text-comparison-hover transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-comparison rounded"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ComparisonNeighborhoodSelector({ neighborhoods = [] }) {
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
      ? candidates.filter(n =>
          n.name.toLowerCase().includes(q) ||
          n.borough.toLowerCase().includes(q)
        )
      : candidates;

    const map = {};
    BOROUGH_ORDER.forEach(b => { map[b] = []; });
    filtered.forEach(n => {
      const key = map[n.borough] !== undefined ? n.borough : 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(n);
    });

    const groups  = Object.entries(map).filter(([, ns]) => ns.length > 0);
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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-comparison-border pointer-events-none"
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
          aria-label="Search comparison neighborhoods"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={focusedIndex >= 0 ? `${optPrefix}-${focusedIndex}` : undefined}
          role="combobox"
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-comparison focus:border-transparent"
        />
        {isEditing && query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            aria-label="Clear"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-comparison-border hover:text-comparison-hover"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
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
            <li className="px-4 py-3 text-xs text-gray-500 text-center">
              No neighborhoods found
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
