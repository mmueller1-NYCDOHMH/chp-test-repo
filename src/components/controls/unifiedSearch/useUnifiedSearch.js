import { useState, useRef, useEffect, useMemo, useCallback, useId } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useActiveNeighborhoodId } from '@/lib/utils/pendingNeighborhood';
import { pushNeighborhood } from '@/lib/utils/neighborhoodSwitch';
import { useComparison } from '@/lib/context/ComparisonContext';
import { searchAddresses } from '@/lib/geoclient/geocode';
import { BOROUGH_ORDER } from '@/lib/utils/constants';
import { byCdNumber, matchesNeighborhoodQuery } from '@/lib/utils/formatGeography';

/**
 * FILE: useUnifiedSearch.js
 *
 * All of UnifiedSearch's state: neighborhood-name filtering (instant),
 * debounced Geoclient address lookup, the combined flat keyboard-nav list,
 * dropdown open/animate state, route-change reset, the global "/" focus
 * shortcut, outside-click collapse, and selection/keyboard handlers. Part
 * of the 2026-09-04 split of UnifiedSearch.jsx.
 */

const DEBOUNCE_MS = 200; // reduced from 350ms for faster address feedback
// QA rows 10/26 (2026-10-12): was 5, so at 3–4 characters ("163") no lookup
// ran and the dropdown flashed the "No neighborhood or address matches" error
// mid-typing. 3 matches the intro modal's AddressSearch; GeoSearch
// autocomplete handles short input.
export const ADDRESS_MIN_LENGTH = 3;

export function useUnifiedSearch({ neighborhoods = [], onSelect, onHover }) {
  const uid       = useId();
  const listboxId = `${uid}-listbox`;
  const optPrefix = `${uid}-opt`;

  const [query,          setQuery]        = useState('');
  const [isEditing,      setIsEditing]    = useState(false);
  const [focusedIndex,   setFocused]      = useState(-1);
  const [dropVisible,    setDropVisible]  = useState(false);
  const [addressResults, setAddressResults] = useState([]); // [{ label, neighborhood }]
  const [addressLoading, setAddressLoading] = useState(false);

  const inputRef     = useRef(null);
  const itemRefs     = useRef([]);
  const containerRef = useRef(null);
  const debounceRef  = useRef(null);
  const requestSeq   = useRef(0); // drops out-of-order address responses

  const router   = useRouter();
  const pathname = usePathname();
  // Optimistic: the pill switches to the picked neighborhood right away
  // rather than after the route change commits (see pendingNeighborhood.js).
  const activeId = useActiveNeighborhoodId();

  const selectedNeighborhood = activeId
    ? neighborhoods.find(n => String(n.id) === activeId)
    : null;

  // Clear stale query whenever the route changes (e.g. map click navigated away
  // while a query was typed but not submitted), and collapse back to the
  // populated/pill state for the newly-active neighborhood.
  useEffect(() => {
    setQuery('');
    setAddressResults([]);
    setIsEditing(false);
  }, [pathname]);

  const { setComparisonNeighborhood } = useComparison();

  // Global "/" shortcut (wired in Sidebar.jsx) — jump into edit mode and
  // focus the input even when this is currently collapsed to a pill showing
  // the active neighborhood.
  useEffect(() => {
    function handleFocusRequest() {
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
    window.addEventListener('chp:focus-neighborhood-search', handleFocusRequest);
    return () => window.removeEventListener('chp:focus-neighborhood-search', handleFocusRequest);
  }, []);

  // Dropdown is open any time the control is in edit mode — matches
  // ComparisonNeighborhoodSelector, which opens on focus rather than
  // waiting for the first keystroke.
  const isOpen = isEditing;

  // ── Neighborhood filtering (instant) ──────────────────────────────────────
  // Empty query while editing shows the full borough-grouped list to browse,
  // same as ComparisonNeighborhoodSelector.
  const { grouped, flatNeighborhoods } = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = q
      ? neighborhoods.filter(n => matchesNeighborhoodQuery(n, q))
      : neighborhoods;

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
    return { grouped: groups, flatNeighborhoods: flatList };
  }, [query, neighborhoods]);

  // ── Address lookup (debounced) ────────────────────────────────────────────
  // searchAddresses() merges GeoSearch autocomplete + search (see geocode.js).
  // 2026-10-12: no longer appends the active neighborhood's borough to the
  // query — it biased results toward the borough you were viewing, so an
  // address in another borough could resolve to the wrong place. Showing
  // several results lets the user pick the borough instead.
  // requestSeq: only the latest request may write results, so a slow
  // response for "163 west 8" can't overwrite the one for "163 west 85".
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const seq = ++requestSeq.current;
    if (query.trim().length < ADDRESS_MIN_LENGTH) {
      setAddressResults([]);
      setAddressLoading(false);
      return;
    }
    setAddressLoading(true);
    debounceRef.current = setTimeout(async () => {
      const hits = await searchAddresses(query.trim(), neighborhoods);
      if (seq !== requestSeq.current) return; // superseded by newer typing
      setAddressResults(hits);
      setAddressLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, neighborhoods]);

  // Flat list combining neighborhoods + addresses for keyboard nav
  const flatAll = useMemo(() => [
    ...flatNeighborhoods.map(n => ({ type: 'neighborhood', neighborhood: n })),
    ...addressResults.map(a => ({ type: 'address', ...a })),
  ], [flatNeighborhoods, addressResults]);

  // ── Dropdown animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setDropVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setDropVisible(false);
    }
  }, [isOpen]);

  // Reset focus when results change
  useEffect(() => { setFocused(-1); }, [query]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Close on outside click — only relevant while editing
  useEffect(() => {
    if (!isEditing) return;
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsEditing(false);
        setQuery('');
        setAddressResults([]);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isEditing]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const handleSelect = useCallback((neighborhood) => {
    setQuery('');
    setAddressResults([]);
    setIsEditing(false);
    onHover?.(null);
    if (onSelect) {
      onSelect(neighborhood);
    } else {
      setComparisonNeighborhood(null);
      pushNeighborhood(router, neighborhood.id); // keeps the reader's place mid-page
    }
  }, [onSelect, onHover, router, setComparisonNeighborhood]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(i => Math.min(i + 1, flatAll.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(i => (i <= 0 ? -1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = focusedIndex >= 0 ? flatAll[focusedIndex] : flatAll[0];
      if (target) handleSelect(target.neighborhood);
    } else if (e.key === 'Escape') {
      if (query) {
        setQuery('');
        setAddressResults([]);
      } else {
        setIsEditing(false);
        inputRef.current?.blur();
      }
    }
  }

  return {
    listboxId,
    optPrefix,
    query,
    setQuery,
    isEditing,
    setIsEditing,
    focusedIndex,
    setFocused,
    dropVisible,
    addressResults,
    setAddressResults,
    addressLoading,
    inputRef,
    itemRefs,
    containerRef,
    activeId,
    selectedNeighborhood,
    isOpen,
    grouped,
    flatNeighborhoods,
    flatAll,
    handleSelect,
    handleKeyDown,
  };
}
