'use client';

/**
 * FILE: UnifiedSearch.jsx
 *
 * PURPOSE:
 * Single search input that combines neighborhood name filtering and
 * NYC address lookup (via Geoclient) into one dropdown.
 *
 * DISPLAY STATES (mirrors ComparisonNeighborhoodSelector):
 *   Populated — when a neighborhood is active (from the /neighborhood/[id]
 *   route) and the user isn't editing, collapses to a pill showing that
 *   neighborhood's name. Click the pill, or press "/", to reopen the search.
 *
 *   Editing — dropdown opens as soon as the control is focused/activated
 *   (not gated on typing). Empty query shows the full borough-grouped list
 *   to browse; typing narrows it. Address results append below once
 *   Geoclient responds. Both sections share a single flat keyboard index.
 *
 * KEYBOARD:
 *   /       — global shortcut (wired in Sidebar.jsx) — jump into edit mode
 *             and focus the input, even from the collapsed pill state
 *   ↓ / ↑   — move through results
 *   Enter   — select focused (or first) result
 *   Escape  — clear query; if already empty, collapse out of edit mode
 *
 * PROPS:
 *   neighborhoods  — array of { id, name, borough, geoId, cdNumber }
 *   onSelect       — optional ({ id, name, borough, cdNumber }) => void
 *                    If provided, called instead of router.push (use in modals).
 *                    If omitted, navigates directly.
 *   onHover        — optional (neighborhoodId | null) => void  (for map sync)
 */

import { useState, useRef, useEffect, useMemo, useCallback, useId } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useComparison } from '@/lib/context/ComparisonContext';
import { searchAddresses } from '@/lib/geoclient/geocode';
import { BOROUGH_ORDER } from '@/lib/utils/constants';
import { highlight } from '@/lib/utils/highlight';
import NeighborhoodGroups from '@/components/controls/NeighborhoodGroups';

const DEBOUNCE_MS        = 200; // reduced from 350ms for faster address feedback
const ADDRESS_MIN_LENGTH = 5;   // Geoclient needs enough context to identify a street

// ── Pill — shown when a neighborhood is active and the user isn't editing ─────
// Mirrors ComparisonNeighborhoodSelector's ComparisonPill, using the app's
// brand color (bg-brand-tint / text-brand) instead of the comparison rust
// palette. Keeps the "/" hint visible so the keyboard shortcut still reads
// as available even while collapsed.
//
// Pin icon + chevron added so this reads as a "current location, tap to
// change" control at a glance rather than just a colored label — matters
// most now that this pill is also mounted directly in PageLayout's mobile
// chrome (see PageLayout.jsx), not just inside the sidebar/bottom sheet
// where "Find neighborhood" text above it already supplied that context.
// Same pin path used by TopicNav's map icon / Sidebar's neighborhood tab,
// for visual consistency with the rest of the app's "change location" cues.
function SelectedNeighborhoodPill({ neighborhood, onEdit }) {
  return (
    <button
      onClick={onEdit}
      aria-label={`Viewing ${neighborhood.name}. Click to change neighborhood.`}
      aria-keyshortcuts="/"
      className="w-full flex items-center gap-2 bg-brand-tint border border-brand rounded-lg pl-3 pr-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <svg className="w-3.5 h-3.5 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      <span className="flex-1 text-sm font-medium text-brand truncate">
        {neighborhood.name}
      </span>
      <svg className="w-3.5 h-3.5 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
      <kbd className="hidden sm:inline text-xs text-gray-500 border border-gray-200 rounded px-1 py-0.5 font-mono leading-none pointer-events-none select-none">
        /
      </kbd>
    </button>
  );
}

export default function UnifiedSearch({ neighborhoods = [], onSelect, onHover }) {
  const uid          = useId();
  const listboxId    = `${uid}-listbox`;
  const optPrefix    = `${uid}-opt`;

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

  const router   = useRouter();
  const params   = useParams();
  const pathname = usePathname();
  const activeId = params?.id ? String(params.id) : null;

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
      ? neighborhoods.filter(n =>
          n.name.toLowerCase().includes(q) ||
          n.borough.toLowerCase().includes(q)
        )
      : neighborhoods;

    const map = {};
    BOROUGH_ORDER.forEach(b => { map[b] = []; });
    filtered.forEach(n => {
      const key = map[n.borough] !== undefined ? n.borough : 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(n);
    });

    const groups   = Object.entries(map).filter(([, ns]) => ns.length > 0);
    const flatList = groups.flatMap(([, ns]) => ns);
    return { grouped: groups, flatNeighborhoods: flatList };
  }, [query, neighborhoods]);

  // ── Address lookup (debounced) ────────────────────────────────────────────
  // NOTE: Geoclient /search is a geocoder, not an autocomplete API — it needs
  // a reasonably complete address to return results. For true keystroke-level
  // suggestions, swap searchAddresses() for a Places Autocomplete API.
  //
  // Borough context: when the user is already on a neighborhood page, appending
  // that borough to the query helps Geoclient resolve short/ambiguous inputs
  // like "125th st" → "125th st Manhattan". Only appended when the user hasn't
  // already typed the borough name.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < ADDRESS_MIN_LENGTH) {
      setAddressResults([]);
      setAddressLoading(false);
      return;
    }
    setAddressLoading(true);
    debounceRef.current = setTimeout(async () => {
      const activeNeighborhood = activeId
        ? neighborhoods.find(n => String(n.id) === activeId)
        : null;
      const borough = activeNeighborhood?.borough ?? '';
      const geocodeQuery =
        borough && !query.toLowerCase().includes(borough.toLowerCase())
          ? `${query.trim()} ${borough}`
          : query.trim();

      const hits = await searchAddresses(geocodeQuery, neighborhoods);
      setAddressResults(hits);
      setAddressLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, neighborhoods, activeId]);

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
      router.push(`/neighborhood/${neighborhood.id}`);
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

  // ── Populated state ───────────────────────────────────────────────────────
  // When a neighborhood is active (route param resolved) and the user isn't
  // actively editing, collapse to a pill showing that selection — matches
  // ComparisonNeighborhoodSelector. Click the pill (or press "/") to reopen
  // the search and change it.
  if (selectedNeighborhood && !isEditing) {
    return (
      <SelectedNeighborhoodPill
        neighborhood={selectedNeighborhood}
        onEdit={() => setIsEditing(true)}
      />
    );
  }

  const hasResults         = flatAll.length > 0;
  const showAddressSection = addressResults.length > 0;
  const isNYCEasterEgg     = query.trim().toLowerCase() === 'nyc';

  // Check trophy once per render (fast localStorage read, gated on easter egg being active)
  const trophyEarned = isNYCEasterEgg && (() => {
    try { return localStorage.getItem('chp_trophy_earned') === '1'; } catch { return false; }
  })();

  return (
    <div ref={containerRef} className="relative">

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400"
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
          onChange={e => { setQuery(e.target.value); setIsEditing(true); onHover?.(null); }}
          onFocus={() => setIsEditing(true)}
          onKeyDown={handleKeyDown}
          placeholder="Neighborhood or address"
          aria-label="Search neighborhoods or address"
          aria-keyshortcuts="/"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={focusedIndex >= 0 ? `${optPrefix}-${focusedIndex}` : undefined}
          role="combobox"
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {/* Right side: loading spinner, clear button, or / shortcut hint */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
          {addressLoading && query.length >= 3 ? (
            <svg className="animate-spin w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : query ? (
            <button
              onClick={() => { setQuery(''); setAddressResults([]); onHover?.(null); inputRef.current?.focus(); }}
              aria-label="Clear search"
              className="p-1.5 -m-1.5 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <kbd className="text-xs text-gray-500 border border-gray-200 rounded px-1 py-0.5 font-mono leading-none pointer-events-none select-none">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* ── Dropdown ───────────────────────────────────────────────────────── */}
      {isOpen && isNYCEasterEgg && (
        <div
          className={`absolute z-[9999] w-full bg-white mt-1.5 rounded-lg shadow-lg overflow-hidden border ${trophyEarned ? 'border-amber-300' : 'border-blue-200'}`}
          style={{
            opacity:    dropVisible ? 1 : 0,
            transform:  dropVisible ? 'translateY(0)' : 'translateY(-4px)',
            transition: 'opacity 150ms ease-out, transform 150ms ease-out',
          }}
        >
          <button
            onClick={() => {
              setQuery('');
              // If all 59 explored, fire the achievement event so the map animates
              if (trophyEarned) {
                window.dispatchEvent(new CustomEvent('chp:all-explored'));
              }
              window.dispatchEvent(new CustomEvent('chp:open-intro-modal'));
            }}
            className={`w-full text-left px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
              trophyEarned
                ? 'hover:bg-amber-50 focus-visible:ring-amber-500'
                : 'hover:bg-blue-50 focus-visible:ring-blue-500'
            }`}
          >
            {/* Mini NYC skyline — amber tint when trophy earned */}
            <svg width="100%" height="28" viewBox="0 0 280 28" aria-hidden="true" className={`mb-2 ${trophyEarned ? 'text-amber-300' : 'text-blue-300'}`}>
              <rect x="0"   y="20" width="14" height="8"  fill="currentColor" opacity="0.5"/>
              <rect x="16"  y="14" width="10" height="14" fill="currentColor" opacity="0.6"/>
              <rect x="28"  y="8"  width="6"  height="20" fill="currentColor" opacity="0.8"/>
              <rect x="36"  y="4"  width="4"  height="24" fill="currentColor"/>
              <rect x="38"  y="2"  width="2"  height="4"  fill="currentColor"/>
              <rect x="42"  y="10" width="12" height="18" fill="currentColor" opacity="0.7"/>
              <rect x="56"  y="16" width="10" height="12" fill="currentColor" opacity="0.5"/>
              <rect x="68"  y="6"  width="8"  height="22" fill="currentColor" opacity="0.9"/>
              <rect x="71"  y="3"  width="2"  height="5"  fill="currentColor"/>
              <rect x="78"  y="12" width="14" height="16" fill="currentColor" opacity="0.6"/>
              <rect x="94"  y="18" width="10" height="10" fill="currentColor" opacity="0.4"/>
              <rect x="106" y="10" width="12" height="18" fill="currentColor" opacity="0.7"/>
              <rect x="120" y="14" width="8"  height="14" fill="currentColor" opacity="0.5"/>
              <rect x="130" y="6"  width="10" height="22" fill="currentColor" opacity="0.8"/>
              <rect x="142" y="16" width="12" height="12" fill="currentColor" opacity="0.4"/>
              <rect x="156" y="10" width="8"  height="18" fill="currentColor" opacity="0.7"/>
              <rect x="166" y="4"  width="6"  height="24" fill="currentColor" opacity="0.9"/>
              <rect x="174" y="12" width="10" height="16" fill="currentColor" opacity="0.6"/>
              <rect x="186" y="18" width="14" height="10" fill="currentColor" opacity="0.4"/>
              <rect x="202" y="8"  width="8"  height="20" fill="currentColor" opacity="0.7"/>
              <rect x="212" y="14" width="10" height="14" fill="currentColor" opacity="0.5"/>
              <rect x="224" y="10" width="12" height="18" fill="currentColor" opacity="0.8"/>
              <rect x="238" y="16" width="8"  height="12" fill="currentColor" opacity="0.5"/>
              <rect x="248" y="6"  width="10" height="22" fill="currentColor" opacity="0.9"/>
              <rect x="260" y="12" width="8"  height="16" fill="currentColor" opacity="0.6"/>
              <rect x="270" y="20" width="10" height="8"  fill="currentColor" opacity="0.4"/>
            </svg>
            {trophyEarned ? (
              <>
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  <span>🏆</span> You&rsquo;ve explored all 59 neighborhoods!
                </p>
                <p className="text-xs text-amber-500 mt-0.5">Replay the borough wave →</p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-blue-700">All 59 community districts — you know your NYC</p>
                <p className="text-xs text-blue-400 mt-0.5">Browse all neighborhoods →</p>
              </>
            )}
          </button>
        </div>
      )}
      {isOpen && !isNYCEasterEgg && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute z-[9999] w-full bg-white border border-gray-200 mt-1.5 rounded-lg shadow-lg max-h-72 overflow-auto py-1"
          style={{
            opacity:    dropVisible ? 1 : 0,
            transform:  dropVisible ? 'translateY(0)' : 'translateY(-4px)',
            transition: 'opacity 150ms ease-out, transform 150ms ease-out',
          }}
        >
          {!hasResults && !addressLoading ? (
            <li className="px-4 py-3 text-sm text-gray-500 text-center">
              No results found
            </li>
          ) : (
            (() => {
              // Address results start their index after all neighborhood items
              const addrStart = flatNeighborhoods.length;
              return (
                <>
                  {/* ── Neighborhood section ──────────────────────────── */}
                  <NeighborhoodGroups
                    grouped={grouped}
                    query={query}
                    focusedIndex={focusedIndex}
                    itemRefs={itemRefs}
                    startIndex={0}
                    onSelect={handleSelect}
                    onSetFocused={setFocused}
                    onHover={onHover}
                    activeId={activeId}
                    optionIdPrefix={optPrefix}
                  />

                  {/* ── Address section ───────────────────────────────── */}
                  {/* Loading hint — shown while Geoclient is searching */}
                  {addressLoading && query.trim().length >= ADDRESS_MIN_LENGTH && (
                    <li role="none">
                      {flatNeighborhoods.length > 0 && (
                        <div className="border-t border-gray-100 mx-2 mt-1" />
                      )}
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest px-3 pt-2.5 pb-1 select-none">
                        Addresses
                      </p>
                      <p className="text-xs text-gray-600 px-3 pb-2">Searching…</p>
                    </li>
                  )}
                  {/* No-results hint — shown after search completes with no hits */}
                  {!addressLoading && !showAddressSection && query.trim().length >= ADDRESS_MIN_LENGTH && (
                    <li role="none">
                      {flatNeighborhoods.length > 0 && (
                        <div className="border-t border-gray-100 mx-2 mt-1" />
                      )}
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest px-3 pt-2.5 pb-1 select-none">
                        Addresses
                      </p>
                      <p className="text-xs text-gray-600 px-3 pb-2">Try a more complete address, e.g. 123 Main St Brooklyn</p>
                    </li>
                  )}
                  {showAddressSection && (
                    <li role="none">
                      {/* Divider + section label */}
                      {flatNeighborhoods.length > 0 && (
                        <div className="border-t border-gray-100 mx-2 mt-1" />
                      )}
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-3 pt-2.5 pb-1 select-none">
                        Addresses
                      </p>
                      <ul role="group" aria-label="Address results">
                        {addressResults.map((item, i) => {
                          const idx       = addrStart + i;
                          const isFocused = idx === focusedIndex;
                          return (
                            <li
                              key={`addr-${i}`}
                              id={`${optPrefix}-${idx}`}
                              ref={el => { itemRefs.current[idx] = el; }}
                              role="option"
                              aria-selected={isFocused}
                              onClick={() => handleSelect(item.neighborhood)}
                              onMouseEnter={() => { setFocused(idx); onHover?.(item.neighborhood.id); }}
                              onMouseLeave={() => onHover?.(null)}
                              className={[
                                'flex flex-col px-3 py-2 text-xs cursor-pointer transition-colors',
                                isFocused
                                  ? 'bg-blue-50 text-blue-800'
                                  : 'text-gray-700 hover:bg-gray-50',
                              ].join(' ')}
                            >
                              <span className="font-medium leading-snug">
                                {highlight(item.label, query.trim())}
                              </span>
                              <span className={`leading-snug mt-0.5 ${isFocused ? 'text-blue-600' : 'text-gray-500'}`}>
                                {item.neighborhood.name} · CD {item.neighborhood.cdNumber}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  )}
                </>
              );
            })()
          )}
        </ul>
      )}
    </div>
  );
}
