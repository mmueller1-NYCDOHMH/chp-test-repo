import { useState, useEffect, useMemo, useRef } from 'react';
import { BOROUGH_ORDER } from '@/lib/utils/constants';
import { byCdNumber, matchesNeighborhoodQuery } from '@/lib/utils/formatGeography';

/**
 * FILE: useNeighborhoodFilter.js
 *
 * IntroModal's "by neighborhood" search: query/hover/keyboard-focus state,
 * the filtered + borough-grouped + flattened result lists, and the search
 * input's arrow/Enter/Escape keyboard handler. Part of the 2026-09-04 split
 * of IntroModal.jsx.
 */
export function useNeighborhoodFilter({ neighborhoods, visitedIds, onSelect, onDismiss }) {
  const [query,        setQuery]        = useState('');
  const [hoveredId,    setHoveredId]    = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const itemRefs = useRef([]);
  const listRef  = useRef(null);

  // Reset focused index when query changes
  useEffect(() => { setFocusedIndex(-1); }, [query]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // ── Filter + group neighborhoods ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let base = query
      ? neighborhoods.filter(n => matchesNeighborhoodQuery(n, query))
      : neighborhoods;
    // When opened from the explorer badge, only show unvisited CDs
    if (visitedIds) base = base.filter(n => !visitedIds.has(n.id));
    return base;
  }, [query, neighborhoods, visitedIds]);

  const grouped = useMemo(() =>
    BOROUGH_ORDER.reduce((acc, borough) => {
      // Within each borough, order by community district number (not name)
      const matches = filtered.filter(n => n.borough === borough).sort(byCdNumber);
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
      if (target) onSelect(target);

    } else if (e.key === 'Escape') {
      if (query) {
        setQuery('');
      } else {
        onDismiss();
      }
    }
  }

  return {
    query,
    setQuery,
    hoveredId,
    setHoveredId,
    focusedIndex,
    setFocusedIndex,
    itemRefs,
    listRef,
    filtered,
    grouped,
    flatFiltered,
    hasResults,
    handleInputKeyDown,
  };
}
