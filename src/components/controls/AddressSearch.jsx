'use client';

/**
 * FILE: AddressSearch.jsx
 *
 * PURPOSE:
 * Live address-to-neighborhood lookup via NYC Geoclient.
 * Renders a search input with a dropdown of matching addresses as the user types,
 * styled and behaving consistently with NeighborhoodSelector.
 *
 * VARIANTS:
 *   sidebar — used in Sidebar below NeighborhoodSelector; navigates on selection
 *   modal   — used in IntroModal address tab; calls onSelect, parent handles navigation
 *
 * PROPS:
 *   variant       — "sidebar" | "modal"
 *   neighborhoods — full neighborhoods array (to match geoId → neighborhood)
 *   onSelect      — ({ id, name, borough, cdNumber }) => void
 *   onHover       — (neighborhoodId | null) => void  (optional, for map sync in modal)
 *
 * KEYBOARD:
 *   ↓ / ↑   — move through results
 *   Enter    — select focused (or first) result
 *   Escape   — clear query
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchAddresses } from '@/lib/geoclient/geocode';
import { highlight } from '@/lib/utils/highlight';

const DEBOUNCE_MS = 350;

export default function AddressSearch({
  variant      = 'sidebar',
  neighborhoods = [],
  onSelect,
  onHover,
}) {
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);  // [{ label, neighborhood }]
  const [loading,      setLoading]      = useState(false);
  const [isOpen,       setIsOpen]       = useState(false);
  const [dropVisible,  setDropVisible]  = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const inputRef     = useRef(null);
  const containerRef = useRef(null);
  const itemRefs     = useRef([]);
  const debounceRef  = useRef(null);
  const router       = useRouter();

  // Animate dropdown in/out
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setDropVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setDropVisible(false);
    }
  }, [isOpen]);

  // Reset focused index when results change
  useEffect(() => { setFocusedIndex(-1); }, [results]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  // Debounced search
  const runSearch = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim() || q.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const hits = await searchAddresses(q, neighborhoods);
      setResults(hits);
      setLoading(false);
      setIsOpen(hits.length > 0);
    }, DEBOUNCE_MS);
  }, [neighborhoods]);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    runSearch(q);
    onHover?.(null);
  }

  function handleSelect(item) {
    setQuery(item.label);
    setResults([]);
    setIsOpen(false);
    onSelect?.(item.neighborhood);
    onHover?.(item.neighborhood.id);
    if (variant === 'sidebar') {
      router.push(`/neighborhood/${item.neighborhood.id}`);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => (i <= 0 ? -1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = focusedIndex >= 0 ? results[focusedIndex] : results[0];
      if (target) handleSelect(target);
    } else if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      setIsOpen(false);
      onHover?.(null);
    }
  }

  const isSidebar = variant === 'sidebar';

  return (
    <div ref={containerRef} className="relative">

      {/* Input */}
      <div className="relative">
        {/* Pin icon */}
        {loading ? (
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none animate-spin text-gray-400 ${isSidebar ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
            fill="none" viewBox="0 0 24 24" aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 ${isSidebar ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Enter an NYC address…"
          aria-label="Search by address"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          className={[
            'w-full bg-white focus:outline-none focus:ring-2 focus:border-transparent',
            isSidebar
              ? 'pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-blue-400'
              : 'pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:ring-blue-500',
          ].join(' ')}
        />

        {query && (
          <button
            onClick={() => {
              setQuery(''); setResults([]); setIsOpen(false); onHover?.(null);
              inputRef.current?.focus();
            }}
            aria-label="Clear address"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none"
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
          role="listbox"
          aria-label="Address results"
          className="absolute z-[9999] w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-56 overflow-auto py-1"
          style={{
            opacity:    dropVisible ? 1 : 0,
            transform:  dropVisible ? 'translateY(0)' : 'translateY(-4px)',
            transition: 'opacity 150ms ease-out, transform 150ms ease-out',
          }}
        >
          {results.map((item, i) => {
            const isFocused = i === focusedIndex;
            return (
              <li
                key={`${item.neighborhood.id}-${i}`}
                ref={el => { itemRefs.current[i] = el; }}
                role="option"
                aria-selected={isFocused}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => {
                  setFocusedIndex(i);
                  onHover?.(item.neighborhood.id);
                }}
                onMouseLeave={() => onHover?.(null)}
                className={[
                  'flex flex-col px-3 py-2 text-xs cursor-pointer transition-colors',
                  isFocused
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-800',
                ].join(' ')}
              >
                <span className="font-medium leading-snug">
                  {highlight(item.label, query)}
                </span>
                <span className={`leading-snug mt-0.5 ${isFocused ? 'text-blue-600' : 'text-gray-500'}`}>
                  {item.neighborhood.name} · CD {item.neighborhood.cdNumber}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
